/**
 * Ein Protokoll bearbeiten: Kopfdaten, Teilnehmende aus der
 * Projektbeteiligtenliste, Tagesordnung mit Einträgen vom Typ Information,
 * Festlegung und Aufgabe, Hinweis am Ende. Dazu Druckansicht, Live-
 * Druckansicht in einem eigenen Fenster und das Folgeprotokoll.
 *
 * Übernommene Einträge zeigen ihren Ursprungstext fest; Ergänzungen kommen in
 * ein eigenes Feld und erscheinen im Druck blau. Über ✎ lässt sich der
 * Ursprungstext dennoch korrigieren.
 */
import { useEffect, useState } from 'react';
import { formatDate, toISO, today } from '../../../../shared/dates';
import { Icon } from '../../../../shared/icons';
import { useToast } from '../../../../shared/toast';
import { Badge, Card, CardHeader, ConfirmDialog, EmptyState, Field, Modal, Segmented, TextInput } from '../../../../shared/ui';
import { BeteiligterDialog } from '../../components/BeteiligterDialog';
import { Blatt, KuerzelListe, Textfeld, kopieren, useLiveDruck } from '../../components/common';
import { blattDrucken, protokollHtml } from '../../domain/druck';
import {
  alsText,
  bezeichnung,
  freierTeilnehmer,
  herkunftText,
  mitgehendeEintraege,
  naechsteNr,
  neuerEintrag,
  neuerTop,
  teilnehmerAus,
} from '../../domain/protokoll';
import { ampelFuer } from '../../domain/punkte';
import { logosVon } from '../../domain/seed';
import {
  BESPRECHUNG_VORSCHLAEGE,
  EINTRAG_TYP_LABEL,
  TEILNAHME,
  personName,
  type Beteiligter,
  type Eintrag,
  type EintragTyp,
  type ID,
  type Projekt,
  type Protokoll,
  type Teilnahme,
  type Teilnehmer,
  type Top,
} from '../../domain/types';
import type { Route } from '../../lib/router';
import { useStore } from '../../store/store';
import { nachFunktion } from './Beteiligte';

type Ansicht = 'bearbeiten' | 'druck';
const TYPEN: EintragTyp[] = ['I', 'F', 'A'];

/** Erster Buchstabe groß – „Offen seit …“. */
const gross = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** „am 23.10.2026 um 14:05 Uhr“ in Ortszeit. */
function zeitpunkt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `am ${formatDate(toISO(d))} um ${d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`;
}

export function ProtokollEditor({
  projekt,
  protokoll: p,
  navigate,
}: {
  projekt: Projekt;
  protokoll: Protokoll;
  navigate: (r: Route) => void;
}) {
  const { data, updateProtokoll, folgeprotokollAnlegen } = useStore();
  const toast = useToast();
  const [ansicht, setAnsicht] = useState<Ansicht>('bearbeiten');
  const [korrektur, setKorrektur] = useState<Set<ID>>(new Set());
  const [auswahl, setAuswahl] = useState(false);
  const [person, setPerson] = useState<{ beteiligter?: Beteiligter; teilnehmer?: Teilnehmer } | null>(null);
  const [topLoeschen, setTopLoeschen] = useState<Top | null>(null);
  const [eintragLoeschen, setEintragLoeschen] = useState<{ top: Top; eintrag: Eintrag } | null>(null);
  const [fokus, setFokus] = useState<string | null>(null);

  useEffect(() => {
    if (!fokus) return;
    document.getElementById(fokus)?.focus();
    setFokus(null);
  }, [fokus]);

  const beteiligte = nachFunktion(
    data.beteiligte.filter((b) => b.projektId === projekt.id),
    data.funktionen,
  );
  const inhalt = protokollHtml(p, projekt, logosVon(projekt));
  const titel = `${bezeichnung(p)} – ${projekt.name}`;
  const liveOeffnen = useLiveDruck(titel, inhalt);
  const listeId = `ps-kuerzel-${p.id}`;

  /* Änderungen – alle über den Store */
  const aendern = (fn: (x: Protokoll) => Protokoll) => updateProtokoll(p.id, fn);
  const feld = <K extends keyof Protokoll>(k: K, v: Protokoll[K]) => aendern((x) => ({ ...x, [k]: v }));
  const topAendern = (topId: ID, fn: (t: Top) => Top) =>
    aendern((x) => ({ ...x, tops: x.tops.map((t) => (t.id === topId ? fn(t) : t)) }));
  const eintragAendern = (topId: ID, eintragId: ID, patch: Partial<Eintrag>) =>
    topAendern(topId, (t) => ({ ...t, eintraege: t.eintraege.map((e) => (e.id === eintragId ? { ...e, ...patch } : e)) }));
  const teilnehmerAendern = (id: ID, patch: Partial<Teilnehmer>) =>
    aendern((x) => ({ ...x, teilnehmer: x.teilnehmer.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
  const teilnehmerEntfernen = (id: ID) =>
    aendern((x) => ({
      ...x,
      teilnehmer: x.teilnehmer.filter((t) => t.id !== id),
      fuehrerId: x.fuehrerId === id ? null : x.fuehrerId,
    }));
  /** Nimmt Projektbeteiligte als Teilnehmende auf; liefert die Kennung der ersten neuen Zeile. */
  const beteiligteAufnehmen = (ids: ID[], alsFuehrung = false) => {
    const neu = ids
      .map((id) => beteiligte.find((b) => b.id === id))
      .filter((b): b is Beteiligter => !!b && !p.teilnehmer.some((t) => t.beteiligterId === b.id))
      .map((b) => teilnehmerAus(b, data.funktionen));
    const vorhanden = alsFuehrung ? p.teilnehmer.find((t) => t.beteiligterId === ids[0]) : undefined;
    aendern((x) => ({
      ...x,
      teilnehmer: [...x.teilnehmer, ...neu],
      fuehrerId: alsFuehrung ? (vorhanden?.id ?? neu[0]?.id ?? x.fuehrerId) : x.fuehrerId,
    }));
    return neu.length;
  };

  const folge = () => {
    const nr = naechsteNr(data.protokolle, p.reiheId);
    const mit = mitgehendeEintraege(p);
    const id = folgeprotokollAnlegen(p.id);
    if (!id) return;
    toast(`Folgeprotokoll Nr. ${nr} angelegt${mit ? ` – ${mit} ${mit === 1 ? 'Eintrag' : 'Einträge'} übernommen` : ''}.`);
    setAnsicht('bearbeiten');
    navigate({ view: 'protokoll', projektId: projekt.id, protokollId: id });
    window.scrollTo(0, 0);
  };

  const drucken = () => blattDrucken(titel, inhalt);

  const anwesend = p.teilnehmer.filter((t) => t.status === 'anwesend').length;
  const nichtTeilnehmend = beteiligte.filter((b) => !p.teilnehmer.some((t) => t.beteiligterId === b.id));

  return (
    <div className="stack">
      <div className="ps-leiste">
        <div className="row">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => navigate({ view: 'projekt', projektId: projekt.id, tab: 'protokolle' })}
          >
            <Icon name="zurueck" size={14} /> Protokolle
          </button>
          <Segmented<Ansicht>
            value={ansicht}
            onChange={setAnsicht}
            options={[
              { value: 'bearbeiten', label: 'Bearbeiten' },
              { value: 'druck', label: 'Druckansicht' },
            ]}
          />
        </div>
        <div className="row">
          <button
            type="button"
            className="btn btn-outline"
            onClick={liveOeffnen}
            title="Druckansicht in einem eigenen Fenster öffnen – etwa für den zweiten Bildschirm. Sie folgt jeder Eingabe."
          >
            Live-Druckansicht ↗
          </button>
          <button type="button" className="btn btn-outline" onClick={drucken}>
            <Icon name="plan" size={14} /> Drucken / PDF
          </button>
          <button type="button" className="btn btn-primary" onClick={folge}>
            <Icon name="plus" size={14} /> Folgeprotokoll anlegen
          </button>
        </div>
      </div>

      {ansicht === 'druck' ? (
        <>
          <div className="row wrap">
            <button type="button" className="btn btn-primary" onClick={drucken}>
              Drucken oder als PDF speichern
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={async () =>
                toast((await kopieren(alsText(p, [projekt.nummer, projekt.name].filter(Boolean).join(' '))))
                  ? 'Protokoll als Text kopiert.'
                  : 'Kopieren nicht möglich.')
              }
            >
              <Icon name="kopieren" size={14} /> Als Text kopieren
            </button>
            <span className="small tertiary">Für eine PDF-Datei im Druckdialog „Als PDF speichern“ wählen.</span>
          </div>
          <Blatt inhalt={inhalt} />
        </>
      ) : (
        <>
          {/* Kopfdaten */}
          <Card>
            <CardHeader titel="Kopfdaten" sub={`Zuletzt geändert ${zeitpunkt(p.geaendert)}`} />
            <div className="card-pad ps-raster">
              <div className="s6">
                <Field label="Besprechung">
                  <TextInput value={p.art} onChange={(v) => feld('art', v)} list="ps-besprechungen-editor" />
                </Field>
                <datalist id="ps-besprechungen-editor">
                  {BESPRECHUNG_VORSCHLAEGE.map((v) => (
                    <option key={v} value={v} />
                  ))}
                </datalist>
              </div>
              <div className="s2">
                <Field label="Nr.">
                  <TextInput
                    type="number"
                    min={1}
                    value={String(p.nr)}
                    onChange={(v) => feld('nr', Math.max(1, Number.parseInt(v, 10) || 1))}
                  />
                </Field>
              </div>
              <div className="s4">
                <Field label="Datum">
                  <TextInput type="date" value={p.datum} onChange={(v) => feld('datum', v || today())} />
                </Field>
              </div>
              <div className="s2">
                <Field label="Beginn">
                  <TextInput type="time" value={p.beginn} onChange={(v) => feld('beginn', v)} />
                </Field>
              </div>
              <div className="s2">
                <Field label="Ende">
                  <TextInput type="time" value={p.ende} onChange={(v) => feld('ende', v)} />
                </Field>
              </div>
              <div className="s4">
                <Field label="Ort">
                  <TextInput value={p.ort} onChange={(v) => feld('ort', v)} />
                </Field>
              </div>
              <div className="s4">
                <Field label="Nächster Termin">
                  <TextInput type="date" value={p.naechster} onChange={(v) => feld('naechster', v)} />
                </Field>
              </div>
              <div className="s4">
                <Field label="Protokollführung" hint="Aus den Teilnehmenden oder der Projektbeteiligtenliste">
                  <select
                    className="select"
                    value={p.fuehrerId ? `tn:${p.fuehrerId}` : ''}
                    onChange={(e) => {
                      const [art, id] = e.target.value.split(':');
                      if (art === 'bt') beteiligteAufnehmen([id], true);
                      else feld('fuehrerId', id || null);
                    }}
                  >
                    <option value="">– ohne –</option>
                    {p.teilnehmer.filter((t) => t.name).length > 0 ? (
                      <optgroup label="Teilnehmende">
                        {p.teilnehmer
                          .filter((t) => t.name)
                          .map((t) => (
                            <option key={t.id} value={`tn:${t.id}`}>
                              {t.name}
                              {t.funktion ? ` (${t.funktion})` : ''}
                            </option>
                          ))}
                      </optgroup>
                    ) : null}
                    {nichtTeilnehmend.length > 0 ? (
                      <optgroup label="Projektbeteiligte">
                        {nichtTeilnehmend.map((b) => (
                          <option key={b.id} value={`bt:${b.id}`}>
                            {personName(b)}
                            {b.firma ? ` (${b.firma})` : ''}
                          </option>
                        ))}
                      </optgroup>
                    ) : null}
                  </select>
                </Field>
              </div>
              <div className="s8">
                <Field label="Verteiler (zusätzlich)">
                  <TextInput value={p.verteiler} onChange={(v) => feld('verteiler', v)} placeholder="z. B. Projektakte" />
                </Field>
              </div>
            </div>
          </Card>

          {/* Teilnehmende */}
          <Card>
            <CardHeader
              titel="Teilnehmende"
              sub={`${p.teilnehmer.length} ${p.teilnehmer.length === 1 ? 'Person' : 'Personen'} · ${anwesend} anwesend · Angaben aus der Projektbeteiligtenliste werden dort gepflegt`}
              actions={
                <>
                  <button type="button" className="btn btn-sm btn-primary" onClick={() => setAuswahl(true)}>
                    <Icon name="person" size={12} /> Aus Beteiligtenliste …
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    title="Person, die nicht in der Projektbeteiligtenliste steht"
                    onClick={() => {
                      const t = freierTeilnehmer();
                      aendern((x) => ({ ...x, teilnehmer: [...x.teilnehmer, t] }));
                      setFokus(`ps-tn-${t.id}`);
                    }}
                  >
                    <Icon name="plus" size={12} /> Weitere Person
                  </button>
                </>
              }
            />
            {p.teilnehmer.length === 0 ? (
              <EmptyState
                icon="person"
                titel="Noch keine Teilnehmenden"
                text="Wählen Sie die Teilnehmenden aus der Projektbeteiligtenliste."
              />
            ) : (
              <div className="table-scroll">
                <table className="table table-stack ps-tn">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Funktion</th>
                      <th>Firma</th>
                      <th className="ps-tn-k">Kürzel</th>
                      <th className="ps-tn-s">Status</th>
                      <th className="actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {p.teilnehmer.map((t) => {
                      const b = t.beteiligterId ? beteiligte.find((x) => x.id === t.beteiligterId) : undefined;
                      const fuehrung = p.fuehrerId === t.id;
                      return (
                        <tr key={t.id}>
                          {b ? (
                            <>
                              <td>
                                <span className="ps-verknuepft">
                                  <strong>{t.name}</strong>
                                  {fuehrung ? <Badge ton="blue">Protokollführung</Badge> : null}
                                </span>
                              </td>
                              <td className="small muted">{t.funktion || '–'}</td>
                              <td className="small muted">{t.firma || '–'}</td>
                              <td className="num">{t.kuerzel || '–'}</td>
                            </>
                          ) : (
                            <>
                              <td>
                                <TextInput
                                  id={`ps-tn-${t.id}`}
                                  className="input ps-kompakt"
                                  value={t.name}
                                  onChange={(v) => teilnehmerAendern(t.id, { name: v })}
                                  placeholder="Name"
                                  aria-label="Name"
                                />
                                {fuehrung ? (
                                  <div style={{ marginTop: 4 }}>
                                    <Badge ton="blue">Protokollführung</Badge>
                                  </div>
                                ) : null}
                              </td>
                              <td>
                                <TextInput
                                  className="input ps-kompakt"
                                  value={t.funktion}
                                  onChange={(v) => teilnehmerAendern(t.id, { funktion: v })}
                                  placeholder="Funktion"
                                  aria-label="Funktion"
                                />
                              </td>
                              <td>
                                <TextInput
                                  className="input ps-kompakt"
                                  value={t.firma}
                                  onChange={(v) => teilnehmerAendern(t.id, { firma: v })}
                                  placeholder="Firma"
                                  aria-label="Firma"
                                />
                              </td>
                              <td className="ps-tn-k">
                                <TextInput
                                  className="input ps-kompakt"
                                  value={t.kuerzel}
                                  onChange={(v) => teilnehmerAendern(t.id, { kuerzel: v })}
                                  placeholder="Kürzel"
                                  aria-label="Kürzel"
                                />
                              </td>
                            </>
                          )}
                          <td className="ps-tn-s">
                            <select
                              className="select ps-kompakt"
                              value={t.status}
                              aria-label="Status"
                              onChange={(e) => teilnehmerAendern(t.id, { status: e.target.value as Teilnahme })}
                            >
                              {TEILNAHME.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="actions">
                            {b ? (
                              <button
                                type="button"
                                className="btn-icon"
                                title="Angaben in der Projektbeteiligtenliste bearbeiten"
                                aria-label="Angaben bearbeiten"
                                onClick={() => setPerson({ beteiligter: b })}
                              >
                                <Icon name="bearbeiten" size={15} />
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn-icon"
                                title="In die Projektbeteiligtenliste aufnehmen"
                                aria-label="In die Projektbeteiligtenliste aufnehmen"
                                onClick={() => setPerson({ teilnehmer: t })}
                              >
                                <Icon name="person" size={15} />
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn-icon"
                              title="Aus dem Protokoll entfernen"
                              aria-label="Teilnehmende Person entfernen"
                              onClick={() => teilnehmerEntfernen(t.id)}
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
            )}
          </Card>

          {/* Tagesordnung */}
          <div className="row-between wrap">
            <h2 style={{ fontSize: 17 }}>Tagesordnung</h2>
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={() => {
                const top = neuerTop();
                aendern((x) => ({ ...x, tops: [...x.tops, top] }));
                setFokus(`ps-top-${top.id}`);
              }}
            >
              <Icon name="plus" size={12} /> TOP hinzufügen
            </button>
          </div>

          <KuerzelListe id={listeId} beteiligte={beteiligte} funktionen={data.funktionen} />

          {p.tops.length === 0 ? (
            <Card>
              <EmptyState
                icon="protokoll"
                titel="Noch keine Tagesordnungspunkte"
                text="Legen Sie den ersten TOP an, um Einträge zu erfassen."
              />
            </Card>
          ) : (
            p.tops.map((top, ti) => (
              <div key={top.id} className="card ps-top">
                <div className="ps-top-kopf">
                  <span className="ps-top-nr">TOP {ti + 1}</span>
                  <input
                    id={`ps-top-${top.id}`}
                    className="input"
                    value={top.titel}
                    onChange={(e) => topAendern(top.id, (t) => ({ ...t, titel: e.target.value }))}
                    placeholder="Titel des Tagesordnungspunkts"
                    aria-label={`Titel TOP ${ti + 1}`}
                  />
                  <button
                    type="button"
                    className="btn-icon"
                    disabled={ti === 0}
                    title="Nach oben"
                    aria-label="TOP nach oben"
                    onClick={() =>
                      aendern((x) => {
                        const tops = [...x.tops];
                        [tops[ti - 1], tops[ti]] = [tops[ti], tops[ti - 1]];
                        return { ...x, tops };
                      })
                    }
                  >
                    <Icon name="hoch" size={14} />
                  </button>
                  <button
                    type="button"
                    className="btn-icon"
                    disabled={ti === p.tops.length - 1}
                    title="Nach unten"
                    aria-label="TOP nach unten"
                    onClick={() =>
                      aendern((x) => {
                        const tops = [...x.tops];
                        [tops[ti + 1], tops[ti]] = [tops[ti], tops[ti + 1]];
                        return { ...x, tops };
                      })
                    }
                  >
                    <Icon name="runter" size={14} />
                  </button>
                  <button
                    type="button"
                    className="btn-icon"
                    title="TOP löschen"
                    aria-label="TOP löschen"
                    onClick={() =>
                      top.eintraege.length > 0
                        ? setTopLoeschen(top)
                        : aendern((x) => ({ ...x, tops: x.tops.filter((t) => t.id !== top.id) }))
                    }
                  >
                    <Icon name="loeschen" size={14} />
                  </button>
                </div>

                {top.eintraege.length === 0 ? (
                  <div className="ps-top-leer">Noch keine Einträge zu diesem Punkt.</div>
                ) : (
                  top.eintraege.map((e, ei) => {
                    const nr = `${ti + 1}.${ei + 1}`;
                    const istA = e.typ === 'A';
                    const erledigt = istA && e.status === 'erledigt';
                    const spaet = istA && ampelFuer(e.termin, e.status) === 'ueberfaellig';
                    const patch = (werte: Partial<Eintrag>) => eintragAendern(top.id, e.id, werte);
                    const zusatz = (
                      <Textfeld
                        className="ps-zusatz"
                        value={e.zusatz}
                        onChange={(v) => patch({ zusatz: v })}
                        placeholder="Ergänzung eintragen (wird im Protokoll blau dargestellt)"
                        aria-label={`Ergänzung ${nr}`}
                      />
                    );
                    return (
                      <div key={e.id} className={`ps-eintrag ps-typ-${e.typ} ${erledigt ? 'ps-erledigt' : ''}`}>
                        <div className="ps-nr">{nr}</div>
                        <div className="ps-typwahl" role="group" aria-label="Typ">
                          {TYPEN.map((k) => (
                            <button
                              key={k}
                              type="button"
                              className={`ps-typ-${k} ${e.typ === k ? 'aktiv' : ''}`}
                              aria-pressed={e.typ === k}
                              title={EINTRAG_TYP_LABEL[k]}
                              onClick={() => patch({ typ: k })}
                            >
                              {k}
                            </button>
                          ))}
                        </div>
                        <div className="ps-text">
                          {e.vor && !korrektur.has(e.id) ? (
                            <>
                              <div className="ps-orig">
                                <div className="ps-orig-text">{e.text || <span className="tertiary">ohne Text</span>}</div>
                                <button
                                  type="button"
                                  className="btn-icon"
                                  title="Ursprungstext korrigieren"
                                  aria-label="Ursprungstext korrigieren"
                                  onClick={() => {
                                    setKorrektur((k) => new Set(k).add(e.id));
                                    setFokus(`ps-e-${e.id}`);
                                  }}
                                >
                                  <Icon name="bearbeiten" size={13} />
                                </button>
                              </div>
                              {zusatz}
                            </>
                          ) : (
                            <>
                              <Textfeld
                                id={`ps-e-${e.id}`}
                                value={e.text}
                                onChange={(v) => patch({ text: v })}
                                placeholder={`${EINTRAG_TYP_LABEL[e.typ]} eintragen`}
                                aria-label={`Inhalt ${nr}`}
                              />
                              {e.vor ? <div style={{ marginTop: 6 }}>{zusatz}</div> : null}
                            </>
                          )}
                          {e.herkunft ? (
                            <span className="ps-herkunft">{gross(herkunftText(e))}</span>
                          ) : (
                            <span className="ps-neu">Neu in diesem Protokoll</span>
                          )}
                        </div>
                        <div className="ps-wer">
                          <input
                            className="input ps-kompakt"
                            list={listeId}
                            value={e.wer}
                            onChange={(ev) => patch({ wer: ev.target.value })}
                            placeholder={istA ? 'Verantw.' : 'Wer'}
                            aria-label={istA ? 'Verantwortlich' : 'Beteiligt'}
                          />
                        </div>
                        {istA ? (
                          <>
                            <div className="ps-termin">
                              <input
                                type="date"
                                className={`input ps-kompakt ${spaet ? 'ps-spaet' : ''}`}
                                value={e.termin}
                                onChange={(ev) => patch({ termin: ev.target.value })}
                                aria-label="Termin"
                              />
                            </div>
                            <label className="ps-haken ps-st">
                              <input
                                type="checkbox"
                                checked={erledigt}
                                onChange={(ev) => patch({ status: ev.target.checked ? 'erledigt' : 'offen' })}
                              />
                              erledigt
                            </label>
                          </>
                        ) : (
                          <>
                            <div className="ps-termin" />
                            <div className="ps-st" />
                          </>
                        )}
                        <button
                          type="button"
                          className="btn-icon ps-weg"
                          title="Eintrag löschen"
                          aria-label={`Eintrag ${nr} löschen`}
                          onClick={() =>
                            e.text.trim() || e.zusatz.trim()
                              ? setEintragLoeschen({ top, eintrag: e })
                              : topAendern(top.id, (t) => ({ ...t, eintraege: t.eintraege.filter((x) => x.id !== e.id) }))
                          }
                        >
                          <Icon name="loeschen" size={14} />
                        </button>
                      </div>
                    );
                  })
                )}

                <div className="ps-top-fuss">
                  {TYPEN.map((k) => (
                    <button
                      key={k}
                      type="button"
                      className={`btn btn-sm btn-outline ps-typ-${k}`}
                      onClick={() => {
                        const e = neuerEintrag(k);
                        topAendern(top.id, (t) => ({ ...t, eintraege: [...t.eintraege, e] }));
                        setFokus(`ps-e-${e.id}`);
                      }}
                    >
                      <Icon name="plus" size={12} /> {EINTRAG_TYP_LABEL[k]}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}

          {/* Abschluss */}
          <Card>
            <CardHeader titel="Abschluss" />
            <div className="card-pad">
              <Field label="Hinweis am Protokollende">
                <Textfeld value={p.hinweis} onChange={(v) => feld('hinweis', v)} />
              </Field>
            </div>
          </Card>
        </>
      )}

      {auswahl ? (
        <TeilnehmerAuswahl
          beteiligte={beteiligte}
          funktionName={(b) => data.funktionen.find((f) => f.id === b.funktionId)?.name ?? ''}
          vorhanden={new Set(p.teilnehmer.map((t) => t.beteiligterId).filter((x): x is ID => !!x))}
          projektId={projekt.id}
          onClose={() => setAuswahl(false)}
          onUebernehmen={(ids) => {
            const n = beteiligteAufnehmen(ids);
            if (n > 0) toast(n === 1 ? '1 Person aufgenommen.' : `${n} Personen aufgenommen.`);
          }}
        />
      ) : null}

      {person?.beteiligter ? (
        <BeteiligterDialog projektId={projekt.id} beteiligter={person.beteiligter} onClose={() => setPerson(null)} />
      ) : null}

      {person?.teilnehmer ? (
        <BeteiligterDialog
          projektId={projekt.id}
          vorbelegung={(() => {
            const teile = person.teilnehmer.name.trim().split(/\s+/);
            const funktion = data.funktionen.find(
              (f) => f.name.toLowerCase() === person.teilnehmer!.funktion.trim().toLowerCase(),
            );
            return {
              vorname: teile.length > 1 ? teile.slice(0, -1).join(' ') : '',
              nachname: teile[teile.length - 1] ?? '',
              firma: person.teilnehmer.firma,
              kuerzel: person.teilnehmer.kuerzel,
              funktionId: funktion?.id ?? null,
            };
          })()}
          onClose={() => setPerson(null)}
          onGespeichert={(id) => teilnehmerAendern(person.teilnehmer!.id, { beteiligterId: id })}
        />
      ) : null}

      {topLoeschen ? (
        <ConfirmDialog
          titel="TOP löschen?"
          text={`„${topLoeschen.titel || 'Ohne Titel'}“ mit ${topLoeschen.eintraege.length} ${
            topLoeschen.eintraege.length === 1 ? 'Eintrag' : 'Einträgen'
          } wird aus diesem Protokoll entfernt.`}
          onConfirm={() => aendern((x) => ({ ...x, tops: x.tops.filter((t) => t.id !== topLoeschen.id) }))}
          onClose={() => setTopLoeschen(null)}
        />
      ) : null}

      {eintragLoeschen ? (
        <ConfirmDialog
          titel="Eintrag löschen?"
          text="Der Eintrag wird aus diesem Protokoll entfernt."
          onConfirm={() =>
            topAendern(eintragLoeschen.top.id, (t) => ({
              ...t,
              eintraege: t.eintraege.filter((x) => x.id !== eintragLoeschen.eintrag.id),
            }))
          }
          onClose={() => setEintragLoeschen(null)}
        />
      ) : null}
    </div>
  );
}

/** Mehrfachauswahl aus der Projektbeteiligtenliste; neue Personen lassen sich gleich erfassen. */
function TeilnehmerAuswahl({
  beteiligte,
  funktionName,
  vorhanden,
  projektId,
  onClose,
  onUebernehmen,
}: {
  beteiligte: Beteiligter[];
  funktionName: (b: Beteiligter) => string;
  vorhanden: Set<ID>;
  projektId: ID;
  onClose: () => void;
  onUebernehmen: (ids: ID[]) => void;
}) {
  const [gewaehlt, setGewaehlt] = useState<Set<ID>>(new Set());
  const [neuePerson, setNeuePerson] = useState(false);
  const waehlbar = beteiligte.filter((b) => !vorhanden.has(b.id));
  const umschalten = (id: ID) =>
    setGewaehlt((g) => {
      const neu = new Set(g);
      if (neu.has(id)) neu.delete(id);
      else neu.add(id);
      return neu;
    });

  return (
    <>
      <Modal
        titel="Teilnehmende aus der Projektbeteiligtenliste"
        sub="Gewählte Personen werden mit Funktion, Firma und Kürzel übernommen"
        onClose={onClose}
        footer={
          <>
            <button type="button" className="btn btn-outline" onClick={() => setNeuePerson(true)}>
              <Icon name="plus" size={14} /> Neue Person …
            </button>
            <span className="spacer" />
            <button type="button" className="btn" onClick={onClose}>
              Abbrechen
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={gewaehlt.size === 0}
              onClick={() => {
                onUebernehmen(beteiligte.filter((b) => gewaehlt.has(b.id)).map((b) => b.id));
                onClose();
              }}
            >
              Übernehmen{gewaehlt.size ? ` (${gewaehlt.size})` : ''}
            </button>
          </>
        }
      >
        {beteiligte.length === 0 ? (
          <p className="muted">
            Die Projektbeteiligtenliste ist noch leer. Erfassen Sie über „Neue Person …“ die erste Person – sie steht
            danach auch im Reiter „Projektbeteiligte“.
          </p>
        ) : (
          <div className="stack" style={{ gap: 10 }}>
            <div className="row-between">
              <span className="small tertiary">
                {waehlbar.length} von {beteiligte.length} noch nicht im Protokoll
              </span>
              {waehlbar.length > 0 ? (
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() =>
                    setGewaehlt(gewaehlt.size === waehlbar.length ? new Set() : new Set(waehlbar.map((b) => b.id)))
                  }
                >
                  {gewaehlt.size === waehlbar.length ? 'Keine' : 'Alle wählen'}
                </button>
              ) : null}
            </div>
            <div className="ps-auswahl">
              {beteiligte.map((b) => {
                const schon = vorhanden.has(b.id);
                return (
                  <label key={b.id} style={schon ? { opacity: 0.55, cursor: 'default' } : undefined}>
                    <input
                      type="checkbox"
                      checked={schon || gewaehlt.has(b.id)}
                      disabled={schon}
                      onChange={() => umschalten(b.id)}
                    />
                    <span className="ps-auswahl-text">
                      <strong>{personName(b)}</strong>
                      <span className="small muted">
                        {' '}
                        · {funktionName(b) || 'ohne Funktion'}
                        {b.firma ? ` · ${b.firma}` : ''}
                      </span>
                    </span>
                    {schon ? <span className="small tertiary">im Protokoll</span> : null}
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </Modal>

      {neuePerson ? (
        <BeteiligterDialog
          projektId={projektId}
          onClose={() => setNeuePerson(false)}
          onGespeichert={(id) => setGewaehlt((g) => new Set(g).add(id))}
        />
      ) : null}
    </>
  );
}
