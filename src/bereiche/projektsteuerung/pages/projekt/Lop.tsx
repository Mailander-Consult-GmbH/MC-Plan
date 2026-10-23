/**
 * Liste offener Punkte (LOP) eines Projekts – eine To-do-Liste, die laufend
 * fortgeschrieben wird. Aufgebaut wie ein Protokoll: Themenblöcke statt
 * Tagesordnungspunkten, je Punkt Verantwortlich, Termin, Erledigung und eine
 * Bemerkung. Jeder Punkt behält seine Nummer. „Fortschreiben“ schließt den
 * Stand ab; danach erscheinen neue und geänderte Angaben im Druck blau,
 * erledigte Punkte wandern ins Archiv.
 */
import { useEffect, useState } from 'react';
import { formatDate, today } from '../../../../shared/dates';
import { Icon } from '../../../../shared/icons';
import { useToast } from '../../../../shared/toast';
import {
  Callout,
  Card,
  CardHeader,
  ConfirmDialog,
  EmptyState,
  Field,
  Modal,
  Search,
  Segmented,
  TextInput,
} from '../../../../shared/ui';
import { Blatt, KuerzelListe, Textfeld, useLiveDruck } from '../../components/common';
import { blattDrucken, lopHtml } from '../../domain/druck';
import { lopExportieren } from '../../domain/export';
import {
  aktivePunkte,
  archiviertePunkte,
  erledigen,
  insArchiv,
  leereLop,
  neuesThema,
  punktAnfuegen,
  volltext,
  wiederAufnehmen,
} from '../../domain/lop';
import { ampelFuer } from '../../domain/punkte';
import { logosVon } from '../../domain/seed';
import { newId, type ID, type Lop, type LopPunkt, type LopThema, type Projekt } from '../../domain/types';
import { useStore } from '../../store/store';
import { nachFunktion } from './Beteiligte';

type Ansicht = 'bearbeiten' | 'druck';
type StatusFilter = 'alle' | 'offen' | 'erledigt';

export function LopSeite({ projekt }: { projekt: Projekt }) {
  const { data, updateLop, lopFortschreiben } = useStore();
  const toast = useToast();
  const lop = data.lops.find((l) => l.projektId === projekt.id) ?? leereLop(projekt.id);
  const [ansicht, setAnsicht] = useState<Ansicht>('bearbeiten');
  const [suche, setSuche] = useState('');
  const [status, setStatus] = useState<StatusFilter>('alle');
  const [wer, setWer] = useState('');
  const [nurSpaet, setNurSpaet] = useState(false);
  const [korrektur, setKorrektur] = useState<Set<ID>>(new Set());
  const [fortschreiben, setFortschreiben] = useState(false);
  const [archivOffen, setArchivOffen] = useState(false);
  const [themaLoeschen, setThemaLoeschen] = useState<LopThema | null>(null);
  const [punktLoeschen, setPunktLoeschen] = useState<LopPunkt | null>(null);
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
  const inhalt = lopHtml(lop, projekt, logosVon(projekt));
  const titel = `LOP Stand ${lop.stand} – ${projekt.name}`;
  const liveOeffnen = useLiveDruck(titel, inhalt);
  const listeId = `ps-kuerzel-lop-${projekt.id}`;

  const aendern = (fn: (l: Lop) => Lop) => updateLop(projekt.id, fn);
  const punktAendern = (id: ID, fn: (p: LopPunkt) => LopPunkt) =>
    aendern((l) => ({ ...l, punkte: l.punkte.map((p) => (p.id === id ? fn(p) : p)) }));
  const themaAendern = (id: ID, titel: string) =>
    aendern((l) => ({ ...l, themen: l.themen.map((t) => (t.id === id ? { ...t, titel } : t)) }));

  const aktiv = aktivePunkte(lop);
  const archiv = archiviertePunkte(lop);
  const verantwortliche = [...new Set(aktiv.map((p) => p.wer).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'de'));

  const filterAktiv = Boolean(suche.trim()) || status !== 'alle' || Boolean(wer) || nurSpaet;
  const passt = (p: LopPunkt) =>
    (status === 'alle' || (status === 'offen' ? p.status !== 'erledigt' : p.status === 'erledigt')) &&
    (!wer || p.wer === wer) &&
    (!nurSpaet || ampelFuer(p.termin, p.status) === 'ueberfaellig') &&
    (!suche.trim() ||
      [p.nr, volltext(p), p.wer, p.bemerkung, p.herkunft].join(' ').toLowerCase().includes(suche.trim().toLowerCase()));
  const treffer = aktiv.filter(passt).length;

  const punktNeu = (themaId: ID) => {
    // Kennung vorab, damit das neue Feld den Fokus erhalten kann.
    const id = newId('lp');
    aendern((l) => punktAnfuegen(l, themaId, { id }).lop);
    setFokus(`ps-p-${id}`);
  };

  const drucken = () => blattDrucken(titel, inhalt);

  return (
    <div className="stack">
      <div className="ps-leiste">
        <Segmented<Ansicht>
          value={ansicht}
          onChange={setAnsicht}
          options={[
            { value: 'bearbeiten', label: 'Bearbeiten' },
            { value: 'druck', label: 'Druckansicht' },
          ]}
        />
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
          <button type="button" className="btn btn-outline" onClick={() => lopExportieren(projekt, lop)}>
            <Icon name="export" size={14} /> Excel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setFortschreiben(true)}
            title="Stand abschließen und den nächsten beginnen"
          >
            <Icon name="kette" size={14} /> Fortschreiben …
          </button>
        </div>
      </div>

      {ansicht === 'druck' ? (
        <Blatt inhalt={inhalt} />
      ) : (
        <>
          <div className="ps-filter">
            <Search value={suche} onChange={setSuche} placeholder="Nr., Inhalt, Verantwortlich …" />
            <Segmented<StatusFilter>
              value={status}
              onChange={setStatus}
              options={[
                { value: 'alle', label: 'Alle' },
                { value: 'offen', label: 'Offen' },
                { value: 'erledigt', label: 'Erledigt' },
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
            {filterAktiv ? (
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => {
                  setSuche('');
                  setStatus('alle');
                  setWer('');
                  setNurSpaet(false);
                }}
              >
                Filter zurücksetzen ({treffer} Treffer)
              </button>
            ) : null}
          </div>

          <KuerzelListe id={listeId} beteiligte={beteiligte} funktionen={data.funktionen} />

          {filterAktiv && treffer === 0 ? (
            <Card>
              <EmptyState icon="check" titel="Keine Punkte für diese Auswahl" text="Filter anpassen oder zurücksetzen." />
            </Card>
          ) : null}

          {lop.themen.map((thema, ti) => {
            const punkte = aktiv.filter((p) => p.themaId === thema.id);
            const sichtbar = punkte.filter(passt);
            if (filterAktiv && sichtbar.length === 0) return null;
            return (
              <div key={thema.id} className="card ps-top">
                <div className="ps-top-kopf">
                  <span className="ps-top-nr">Thema {ti + 1}</span>
                  <input
                    id={`ps-th-${thema.id}`}
                    className="input"
                    value={thema.titel}
                    onChange={(e) => themaAendern(thema.id, e.target.value)}
                    placeholder="Thema, z. B. Planung oder Genehmigungen"
                    aria-label={`Titel Thema ${ti + 1}`}
                  />
                  <span className="small tertiary" style={{ whiteSpace: 'nowrap' }}>
                    {punkte.length} {punkte.length === 1 ? 'Punkt' : 'Punkte'}
                  </span>
                  <button
                    type="button"
                    className="btn-icon"
                    disabled={ti === 0}
                    title="Nach oben"
                    aria-label="Thema nach oben"
                    onClick={() =>
                      aendern((l) => {
                        const themen = [...l.themen];
                        [themen[ti - 1], themen[ti]] = [themen[ti], themen[ti - 1]];
                        return { ...l, themen };
                      })
                    }
                  >
                    <Icon name="hoch" size={14} />
                  </button>
                  <button
                    type="button"
                    className="btn-icon"
                    disabled={ti === lop.themen.length - 1}
                    title="Nach unten"
                    aria-label="Thema nach unten"
                    onClick={() =>
                      aendern((l) => {
                        const themen = [...l.themen];
                        [themen[ti + 1], themen[ti]] = [themen[ti], themen[ti + 1]];
                        return { ...l, themen };
                      })
                    }
                  >
                    <Icon name="runter" size={14} />
                  </button>
                  <button
                    type="button"
                    className="btn-icon"
                    title="Thema löschen"
                    aria-label="Thema löschen"
                    onClick={() =>
                      punkte.length > 0
                        ? setThemaLoeschen(thema)
                        : aendern((l) => ({ ...l, themen: l.themen.filter((t) => t.id !== thema.id) }))
                    }
                  >
                    <Icon name="loeschen" size={14} />
                  </button>
                </div>

                {sichtbar.length === 0 ? (
                  <div className="ps-top-leer">Noch keine Punkte zu diesem Thema.</div>
                ) : (
                  sichtbar.map((p) => (
                    <PunktZeile
                      key={p.id}
                      punkt={p}
                      listeId={listeId}
                      korrigieren={korrektur.has(p.id)}
                      onKorrigieren={() => {
                        setKorrektur((k) => new Set(k).add(p.id));
                        setFokus(`ps-p-${p.id}`);
                      }}
                      onAendern={(fn) => punktAendern(p.id, fn)}
                      onLoeschen={() =>
                        volltext(p)
                          ? setPunktLoeschen(p)
                          : aendern((l) => ({ ...l, punkte: l.punkte.filter((x) => x.id !== p.id) }))
                      }
                    />
                  ))
                )}

                <div className="ps-top-fuss">
                  <button type="button" className="btn btn-sm btn-outline" onClick={() => punktNeu(thema.id)}>
                    <Icon name="plus" size={12} /> Punkt
                  </button>
                </div>
              </div>
            );
          })}

          <div className="row">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                const thema = neuesThema();
                aendern((l) => ({ ...l, themen: [...l.themen, thema] }));
                setFokus(`ps-th-${thema.id}`);
              }}
            >
              <Icon name="plus" size={14} /> Thema hinzufügen
            </button>
          </div>

          <Card>
            <CardHeader
              titel="Archiv"
              sub={
                archiv.length
                  ? `${archiv.length} ${archiv.length === 1 ? 'erledigter Punkt' : 'erledigte Punkte'} aus früheren Ständen`
                  : 'Erledigte Punkte wandern beim Fortschreiben hierher'
              }
              actions={
                archiv.length ? (
                  <button type="button" className="btn btn-sm btn-ghost" onClick={() => setArchivOffen((o) => !o)}>
                    {archivOffen ? 'Ausblenden' : 'Anzeigen'}
                  </button>
                ) : undefined
              }
            />
            {archivOffen && archiv.length ? (
              <div className="table-scroll">
                <table className="table table-stack">
                  <thead>
                    <tr>
                      <th style={{ width: 60 }}>Nr.</th>
                      <th>Punkt</th>
                      <th>Verantw.</th>
                      <th>Erledigt am</th>
                      <th className="col-optional">Archiviert</th>
                      <th className="actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {archiv.map((p) => (
                      <tr key={p.id}>
                        <td className="num">{p.nr}</td>
                        <td style={{ maxWidth: 520 }}>
                          <div className="ps-zweizeilig">{volltext(p) || <span className="tertiary">ohne Text</span>}</div>
                          <div className="small tertiary">
                            {lop.themen.find((t) => t.id === p.themaId)?.titel ?? 'Thema entfernt'}
                          </div>
                        </td>
                        <td className="small">{p.wer || '–'}</td>
                        <td className="small">{p.erledigtAm ? formatDate(p.erledigtAm) : '–'}</td>
                        <td className="small muted col-optional">ab Stand Nr. {p.archiviertAb}</td>
                        <td className="actions">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            onClick={() => {
                              aendern((l) => wiederAufnehmen(l, p.id));
                              toast(`Punkt Nr. ${p.nr} wieder aufgenommen.`);
                            }}
                          >
                            Wieder aufnehmen
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </Card>
        </>
      )}

      {fortschreiben ? (
        <FortschreibenDialog
          lop={lop}
          onDrucken={drucken}
          onClose={() => setFortschreiben(false)}
          onFortschreiben={(datum) => {
            lopFortschreiben(projekt.id, datum);
            setKorrektur(new Set());
            toast(`Stand Nr. ${lop.stand + 1} begonnen.`);
          }}
        />
      ) : null}

      {themaLoeschen ? (
        <ConfirmDialog
          titel="Thema löschen?"
          text={`„${themaLoeschen.titel || 'Ohne Titel'}“ wird mit seinen Punkten aus der Liste gelöscht. Die Nummern der Punkte werden nicht neu vergeben.`}
          onConfirm={() =>
            aendern((l) => ({
              ...l,
              themen: l.themen.filter((t) => t.id !== themaLoeschen.id),
              punkte: l.punkte.filter((p) => p.themaId !== themaLoeschen.id || p.archiviertAb !== null),
            }))
          }
          onClose={() => setThemaLoeschen(null)}
        />
      ) : null}

      {punktLoeschen ? (
        <ConfirmDialog
          titel={`Punkt Nr. ${punktLoeschen.nr} löschen?`}
          text="Der Punkt wird endgültig gelöscht; seine Nummer wird nicht neu vergeben. Erledigte Punkte besser abhaken – sie wandern beim Fortschreiben ins Archiv."
          onConfirm={() => aendern((l) => ({ ...l, punkte: l.punkte.filter((x) => x.id !== punktLoeschen.id) }))}
          onClose={() => setPunktLoeschen(null)}
        />
      ) : null}
    </div>
  );
}

function PunktZeile({
  punkt: p,
  listeId,
  korrigieren,
  onKorrigieren,
  onAendern,
  onLoeschen,
}: {
  punkt: LopPunkt;
  listeId: string;
  korrigieren: boolean;
  onKorrigieren: () => void;
  onAendern: (fn: (p: LopPunkt) => LopPunkt) => void;
  onLoeschen: () => void;
}) {
  const patch = (werte: Partial<LopPunkt>) => onAendern((x) => ({ ...x, ...werte }));
  const erledigt = p.status === 'erledigt';
  const spaet = ampelFuer(p.termin, p.status) === 'ueberfaellig';
  const zusatz = (
    <Textfeld
      className="ps-zusatz"
      value={p.zusatz}
      onChange={(v) => patch({ zusatz: v })}
      placeholder="Fortschreibung eintragen"
      aria-label={`Fortschreibung Punkt ${p.nr}`}
    />
  );

  return (
    <div className={`ps-punkt ${erledigt ? 'ps-erledigt' : ''}`}>
      <div className="ps-nr">{p.nr}</div>
      <div className="ps-text">
        {p.vor && !korrigieren ? (
          <>
            <div className="ps-orig">
              <div className="ps-orig-text">{p.text || <span className="tertiary">ohne Text</span>}</div>
              <button
                type="button"
                className="btn-icon"
                title="Text korrigieren"
                aria-label="Text korrigieren"
                onClick={onKorrigieren}
              >
                <Icon name="bearbeiten" size={13} />
              </button>
            </div>
            {zusatz}
          </>
        ) : (
          <>
            <Textfeld
              id={`ps-p-${p.id}`}
              value={p.text}
              onChange={(v) => patch({ text: v })}
              placeholder="Offenen Punkt beschreiben"
              aria-label={`Inhalt Punkt ${p.nr}`}
            />
            {p.vor ? <div style={{ marginTop: 6 }}>{zusatz}</div> : null}
          </>
        )}
        <span className={p.vor ? 'ps-herkunft' : 'ps-neu'}>
          {p.vor ? '' : 'Neu seit der letzten Fortschreibung · '}aufgenommen am {formatDate(p.erfasst)}
        </span>
        <input
          className="ps-herkunft-eingabe"
          value={p.herkunft}
          onChange={(e) => patch({ herkunft: e.target.value })}
          placeholder="Herkunft ergänzen, z. B. Baubesprechung Nr. 3"
          aria-label={`Herkunft Punkt ${p.nr}`}
        />
      </div>
      <div className="ps-wer">
        <input
          className="input ps-kompakt"
          list={listeId}
          value={p.wer}
          onChange={(e) => patch({ wer: e.target.value })}
          placeholder="Verantw."
          aria-label="Verantwortlich"
        />
      </div>
      <div className="ps-termin">
        <input
          type="date"
          className={`input ps-kompakt ${spaet ? 'ps-spaet' : ''}`}
          value={p.termin}
          onChange={(e) => patch({ termin: e.target.value })}
          aria-label="Termin"
        />
      </div>
      <div className="ps-st">
        <label className="ps-haken">
          <input type="checkbox" checked={erledigt} onChange={(e) => onAendern((x) => erledigen(x, e.target.checked))} />
          erledigt
        </label>
        {erledigt && p.erledigtAm ? <span className="ps-erledigt-am">am {formatDate(p.erledigtAm)}</span> : null}
      </div>
      <div className="ps-bem">
        <Textfeld
          value={p.bemerkung}
          onChange={(v) => patch({ bemerkung: v })}
          placeholder="Bemerkung"
          aria-label={`Bemerkung Punkt ${p.nr}`}
        />
      </div>
      <button
        type="button"
        className="btn-icon ps-weg"
        title="Punkt löschen"
        aria-label={`Punkt ${p.nr} löschen`}
        onClick={onLoeschen}
      >
        <Icon name="loeschen" size={14} />
      </button>
    </div>
  );
}

function FortschreibenDialog({
  lop,
  onDrucken,
  onClose,
  onFortschreiben,
}: {
  lop: Lop;
  onDrucken: () => void;
  onClose: () => void;
  onFortschreiben: (datum: string) => void;
}) {
  const [datum, setDatum] = useState(today());
  const archiv = insArchiv(lop);

  return (
    <Modal
      titel="LOP fortschreiben"
      sub={`Stand Nr. ${lop.stand} abschließen und Stand Nr. ${lop.stand + 1} beginnen`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={onDrucken}>
            <Icon name="plan" size={14} /> Stand Nr. {lop.stand} drucken
          </button>
          <span className="spacer" />
          <button type="button" className="btn" onClick={onClose}>
            Abbrechen
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              onFortschreiben(datum || today());
              onClose();
            }}
          >
            Fortschreiben
          </button>
        </>
      }
    >
      <div className="stack" style={{ gap: 14 }}>
        <Field label="Datum des neuen Stands">
          <TextInput type="date" value={datum} onChange={setDatum} />
        </Field>
        <ul className="small muted" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>
          <li>
            {archiv === 0
              ? 'Kein Punkt ist erledigt – das Archiv bleibt unverändert.'
              : `${archiv} erledigte ${archiv === 1 ? 'Punkt wandert' : 'Punkte wandern'} ins Archiv.`}
          </li>
          <li>Fortschreibungen gehen in den Text der Punkte über.</li>
          <li>Was sich danach ändert oder neu hinzukommt, erscheint im Druck blau.</li>
        </ul>
        <Callout icon="ℹ︎">
          Ältere Stände werden nicht aufbewahrt. Wer den abgeschlossenen Stand behalten möchte, druckt ihn vorher oder
          speichert ihn als PDF.
        </Callout>
      </div>
    </Modal>
  );
}
