/**
 * Protokolle eines Projekts: je Besprechungsreihe eine Karte mit ihren
 * Protokollen (öffnen, Folgeprotokoll, löschen), darunter die Aufgaben aus
 * allen Protokollen mit Filter und die Logos im Druckkopf. Dateien des
 * eigenständigen Protokoll-Tools lassen sich übernehmen.
 */
import { useRef, useState } from 'react';
import { formatDate, today } from '../../../../shared/dates';
import { Icon } from '../../../../shared/icons';
import { useToast } from '../../../../shared/toast';
import { Badge, Card, CardHeader, ConfirmDialog, EmptyState, Field, Modal, Segmented, TextInput } from '../../../../shared/ui';
import { AmpelBadge } from '../../components/common';
import { LogoVerwaltung } from '../../components/Logos';
import {
  ausProtokollTool,
  bezeichnung,
  herkunftText,
  mitgehendeEintraege,
  naechsteNr,
  neueReihe,
  protokollAufgaben,
  reihenVon,
  uebernommeneEintraege,
  volltext,
} from '../../domain/protokoll';
import { ampelFuer } from '../../domain/punkte';
import { BESPRECHUNG_VORSCHLAEGE, newId, personName, type Projekt, type Protokoll } from '../../domain/types';
import type { Route } from '../../lib/router';
import { useStore } from '../../store/store';

type StatusFilter = 'offen' | 'erledigt' | 'alle';

export function Protokolle({ projekt, navigate }: { projekt: Projekt; navigate: (r: Route) => void }) {
  const { data, deleteProtokoll, folgeprotokollAnlegen, protokolleUebernehmen, updateProtokoll } = useStore();
  const toast = useToast();
  const [neu, setNeu] = useState(false);
  const [loeschen, setLoeschen] = useState<Protokoll | null>(null);
  const [status, setStatus] = useState<StatusFilter>('offen');
  const [wer, setWer] = useState('');
  const [nurSpaet, setNurSpaet] = useState(false);
  const datei = useRef<HTMLInputElement>(null);

  const protokolle = data.protokolle.filter((p) => p.projektId === projekt.id);
  const reihen = reihenVon(protokolle);
  const oeffne = (p: Protokoll) => navigate({ view: 'protokoll', projektId: projekt.id, protokollId: p.id });

  const folge = (p: Protokoll) => {
    const nr = naechsteNr(protokolle, p.reiheId);
    const mit = mitgehendeEintraege(p);
    const id = folgeprotokollAnlegen(p.id);
    if (!id) return;
    toast(`Folgeprotokoll Nr. ${nr} angelegt${mit ? ` – ${mit} ${mit === 1 ? 'Eintrag' : 'Einträge'} übernommen` : ''}.`);
    navigate({ view: 'protokoll', projektId: projekt.id, protokollId: id });
  };

  const importieren = async (dateien: File[]) => {
    let anzahl = 0;
    for (const f of dateien) {
      try {
        const liste = ausProtokollTool(await f.text(), projekt.id, data);
        protokolleUebernehmen(liste);
        anzahl += liste.length;
      } catch (e) {
        toast(`${f.name} ${e instanceof Error ? e.message : 'konnte nicht gelesen werden'}.`);
      }
    }
    if (anzahl > 0) toast(anzahl === 1 ? '1 Protokoll übernommen.' : `${anzahl} Protokolle übernommen.`);
  };

  // Aufgaben aus den Protokollen dieses Projekts
  const aufgaben = protokollAufgaben(protokolle);
  const verantwortliche = [...new Set(aufgaben.map((a) => a.eintrag.wer).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'de'),
  );
  const gefiltert = aufgaben
    .filter((a) => status === 'alle' || (status === 'offen' ? a.eintrag.status !== 'erledigt' : a.eintrag.status === 'erledigt'))
    .filter((a) => !wer || a.eintrag.wer === wer)
    .filter((a) => !nurSpaet || ampelFuer(a.eintrag.termin, a.eintrag.status) === 'ueberfaellig')
    .sort((a, b) => (a.eintrag.termin || '9999').localeCompare(b.eintrag.termin || '9999'));

  const aufgabeSetzen = (p: Protokoll, eintragId: string, erledigt: boolean) => {
    updateProtokoll(p.id, (x) => ({
      ...x,
      tops: x.tops.map((t) => ({
        ...t,
        eintraege: t.eintraege.map((e) => (e.id === eintragId ? { ...e, status: erledigt ? 'erledigt' : 'offen' } : e)),
      })),
    }));
    toast(erledigt ? 'Als erledigt markiert.' : 'Wieder geöffnet.');
  };

  return (
    <div className="stack">
      <div className="row-between wrap">
        <p className="small muted" style={{ maxWidth: 620 }}>
          Ein Folgeprotokoll übernimmt Teilnehmende und Tagesordnung, alle Informationen und Festlegungen sowie die
          offenen Aufgaben. Neue und geänderte Einträge erscheinen im Druck blau.
        </p>
        <div className="row wrap">
          <button
            type="button"
            className="btn btn-outline"
            title="Dateien des Protokoll-Tools (.protokoll oder Sicherung .json) in dieses Projekt übernehmen"
            onClick={() => datei.current?.click()}
          >
            <Icon name="importieren" size={14} /> Aus Protokoll-Tool
          </button>
          <input
            ref={datei}
            type="file"
            accept=".protokoll,.json,application/json"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => {
              const dateien = [...(e.target.files ?? [])];
              e.target.value = '';
              void importieren(dateien);
            }}
          />
          <button type="button" className="btn btn-primary" onClick={() => setNeu(true)}>
            <Icon name="plus" size={14} /> Neue Protokollreihe
          </button>
        </div>
      </div>

      {reihen.length === 0 ? (
        <Card>
          <EmptyState
            icon="protokoll"
            titel="Noch keine Protokolle"
            text="Legen Sie eine Protokollreihe an – etwa für die Baubesprechung oder den Jour fixe. Folgeprotokolle entstehen daraus mit einem Klick."
            action={
              <button type="button" className="btn btn-primary" onClick={() => setNeu(true)}>
                <Icon name="plus" size={14} /> Neue Protokollreihe
              </button>
            }
          />
        </Card>
      ) : (
        reihen.map((r) => (
          <Card key={r.id}>
            <CardHeader
              titel={r.letztes.art || 'Besprechung'}
              sub={`${r.protokolle.length} ${r.protokolle.length === 1 ? 'Protokoll' : 'Protokolle'}${
                r.letztes.naechster ? ` · nächster Termin ${formatDate(r.letztes.naechster)}` : ''
              }`}
              actions={
                <button type="button" className="btn btn-sm btn-outline" onClick={() => folge(r.letztes)}>
                  <Icon name="plus" size={12} /> Folgeprotokoll
                </button>
              }
            />
            <div className="table-scroll">
              <table className="table table-stack">
                <thead>
                  <tr>
                    <th style={{ width: 120 }}>Datum</th>
                    <th>Protokoll</th>
                    <th>Offene Aufgaben</th>
                    <th className="actions" />
                  </tr>
                </thead>
                <tbody>
                  {[...r.protokolle].reverse().map((p) => {
                    const eigene = protokollAufgaben([p]).filter((a) => a.eintrag.status !== 'erledigt');
                    const spaet = eigene.filter((a) => ampelFuer(a.eintrag.termin, a.eintrag.status) === 'ueberfaellig');
                    const uebernommen = uebernommeneEintraege(p);
                    return (
                      <tr key={p.id} className="clickable" onClick={() => oeffne(p)}>
                        <td className="num">{formatDate(p.datum)}</td>
                        <td>
                          <strong>{bezeichnung(p)}</strong>
                          <div className="small tertiary">
                            {p.teilnehmer.filter((t) => t.status === 'anwesend').length} anwesend
                            {uebernommen ? ` · ${uebernommen} ${uebernommen === 1 ? 'Eintrag' : 'Einträge'} übernommen` : ''}
                          </div>
                        </td>
                        <td>
                          {eigene.length ? (
                            <Badge ton={spaet.length ? 'red' : 'orange'}>
                              {eigene.length} offen{spaet.length ? `, ${spaet.length} überfällig` : ''}
                            </Badge>
                          ) : (
                            <span className="small tertiary">keine</span>
                          )}
                        </td>
                        <td className="actions">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              oeffne(p);
                            }}
                          >
                            Öffnen
                          </button>{' '}
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            title="Folgeprotokoll aus diesem Protokoll anlegen"
                            onClick={(e) => {
                              e.stopPropagation();
                              folge(p);
                            }}
                          >
                            Folgeprotokoll
                          </button>{' '}
                          <button
                            type="button"
                            className="btn-icon"
                            title="Protokoll löschen"
                            aria-label="Protokoll löschen"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLoeschen(p);
                            }}
                          >
                            <Icon name="loeschen" size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        ))
      )}

      <Card>
        <CardHeader
          titel="Aufgaben aus den Protokollen"
          sub="Je Aufgabe ihr jüngstes Vorkommen – übernommene Aufgaben zählen im Folgeprotokoll"
        />
        <div className="card-pad ps-filter" style={{ borderBottom: '1px solid var(--separator)' }}>
          <Segmented<StatusFilter>
            value={status}
            onChange={setStatus}
            options={[
              { value: 'offen', label: 'Offen' },
              { value: 'erledigt', label: 'Erledigt' },
              { value: 'alle', label: 'Alle' },
            ]}
          />
          <select className="select ps-kompakt" value={wer} onChange={(e) => setWer(e.target.value)} aria-label="Verantwortlich">
            <option value="">Alle Verantwortlichen</option>
            {verantwortliche.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
          <label className="checkbox">
            <input type="checkbox" checked={nurSpaet} onChange={(e) => setNurSpaet(e.target.checked)} />
            nur überfällige
          </label>
        </div>
        {gefiltert.length === 0 ? (
          <EmptyState
            icon="check"
            titel="Keine Aufgaben für diese Auswahl"
            text="Aufgaben entstehen, wenn in einem Protokoll ein Eintrag vom Typ A angelegt wird."
          />
        ) : (
          <div className="table-scroll">
            <table className="table table-stack">
              <thead>
                <tr>
                  <th style={{ width: 70 }}>Erledigt</th>
                  <th style={{ width: 60 }}>Pkt.</th>
                  <th>Aufgabe</th>
                  <th>Verantw.</th>
                  <th>Termin</th>
                  <th className="actions">Protokoll</th>
                </tr>
              </thead>
              <tbody>
                {gefiltert.map((a) => {
                  const ampel = ampelFuer(a.eintrag.termin, a.eintrag.status);
                  return (
                    <tr key={a.eintrag.id}>
                      <td>
                        <label className="ps-haken" style={{ paddingTop: 0 }}>
                          <input
                            type="checkbox"
                            checked={a.eintrag.status === 'erledigt'}
                            onChange={(e) => aufgabeSetzen(a.protokoll, a.eintrag.id, e.target.checked)}
                            aria-label="Als erledigt markieren"
                          />
                        </label>
                      </td>
                      <td className="num">{a.nr}</td>
                      <td style={{ whiteSpace: 'pre-wrap' }}>
                        {volltext(a.eintrag) || <span className="tertiary">ohne Text</span>}
                        {a.eintrag.herkunft ? <div className="small tertiary">{herkunftText(a.eintrag)}</div> : null}
                      </td>
                      <td className="small">{a.eintrag.wer || <span className="tertiary">–</span>}</td>
                      <td className="small">
                        {ampel === 'ueberfaellig' || ampel === 'erledigt' ? (
                          <AmpelBadge ampel={ampel} />
                        ) : a.eintrag.termin ? (
                          formatDate(a.eintrag.termin)
                        ) : (
                          <span className="tertiary">ohne Termin</span>
                        )}
                        {ampel === 'ueberfaellig' ? <div className="tertiary small">{formatDate(a.eintrag.termin)}</div> : null}
                      </td>
                      <td className="actions">
                        <button type="button" className="btn btn-sm btn-ghost" onClick={() => oeffne(a.protokoll)}>
                          {bezeichnung(a.protokoll)} <Icon name="chevron" size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <LogoVerwaltung projekt={projekt} />

      {neu ? (
        <NeueReiheDialog
          projekt={projekt}
          onClose={() => setNeu(false)}
          onAngelegt={(id) => navigate({ view: 'protokoll', projektId: projekt.id, protokollId: id })}
        />
      ) : null}

      {loeschen ? (
        <ConfirmDialog
          titel="Protokoll löschen?"
          text={`${bezeichnung(loeschen)} vom ${formatDate(loeschen.datum)} wird endgültig gelöscht. Aufgaben, die es weitergeführt hat, gelten im Vorprotokoll wieder als offen.`}
          onConfirm={() => {
            deleteProtokoll(loeschen.id);
            toast('Protokoll gelöscht.');
          }}
          onClose={() => setLoeschen(null)}
        />
      ) : null}
    </div>
  );
}

function NeueReiheDialog({
  projekt,
  onClose,
  onAngelegt,
}: {
  projekt: Projekt;
  onClose: () => void;
  onAngelegt: (id: string) => void;
}) {
  const { data, addProtokoll } = useStore();
  const toast = useToast();
  const [form, setForm] = useState({ art: 'Baubesprechung', datum: today(), beginn: '', ort: '' });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  // Die Protokollführung übernimmt die angemeldete Person, sofern sie im Projekt geführt wird.
  const ich = data.einstellungen.bearbeiter.trim().toLowerCase();
  const fuehrung = data.beteiligte.find((b) => b.projektId === projekt.id && personName(b).toLowerCase() === ich);

  const anlegen = () => {
    if (!form.art.trim()) {
      toast('Bitte die Besprechung benennen.');
      return;
    }
    if (!form.datum) {
      toast('Bitte das Datum angeben.');
      return;
    }
    const id = newId('pt');
    addProtokoll(neueReihe(id, projekt.id, { ...form, art: form.art.trim() }, fuehrung, data.funktionen));
    toast(`${form.art.trim()} Nr. 1 angelegt.`);
    onClose();
    onAngelegt(id);
  };

  return (
    <Modal
      titel="Neue Protokollreihe"
      sub="Erstes Protokoll einer Besprechungsreihe – Teilnehmende folgen aus der Projektbeteiligtenliste"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Abbrechen
          </button>
          <button type="button" className="btn btn-primary" onClick={anlegen}>
            Anlegen
          </button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Besprechung" full>
          <TextInput value={form.art} onChange={(v) => set('art', v)} list="ps-besprechungen" autoFocus />
          <datalist id="ps-besprechungen">
            {BESPRECHUNG_VORSCHLAEGE.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        </Field>
        <Field label="Datum">
          <TextInput type="date" value={form.datum} onChange={(v) => set('datum', v)} />
        </Field>
        <Field label="Beginn">
          <TextInput type="time" value={form.beginn} onChange={(v) => set('beginn', v)} />
        </Field>
        <Field
          label="Ort"
          full
          hint={
            fuehrung
              ? `Protokollführung: ${personName(fuehrung)} (angemeldet)`
              : 'Die Protokollführung lässt sich im Protokoll aus den Teilnehmenden wählen.'
          }
        >
          <TextInput value={form.ort} onChange={(v) => set('ort', v)} />
        </Field>
      </div>
    </Modal>
  );
}
