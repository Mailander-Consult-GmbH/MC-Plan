/**
 * Ansicht „Leistungstexte“ der Abrechnung im Controlling (Abrechnung.tsx): je
 * Tag, Woche oder Monat mit Leistungen eine Zeile mit Datum, Bearbeitern,
 * Leistungstext und den erfassten Stunden (ab zwei Abschnitten je Abschnitt,
 * `mitAbschnittsspalten`). Je Zeile aufklappbar die Leistungen aller
 * Mitarbeiter – nur zum Lesen; ändern kann eine Leistung nur, wer sie im
 * Bereich erfasst hat (domain/rechte.ts). Darunter die Summe.
 *
 * Der Leistungstext entsteht automatisch aus den Texten der Leistungen. Wer
 * ihn bearbeitet, behält seinen Text: Kommen danach Leistungen hinzu, nennt
 * die Zeile sie und bietet „Ergänzen“ an – überschrieben wird nie still.
 * Bearbeiten darf nur das Controlling, solange der Nachweis offen ist;
 * abgeschlossene Nachweise zeigen den festgeschriebenen Stand, nur zum Lesen.
 * Die Bemerkung steht in der Abrechnung.
 */
import { useState } from 'react';
import { wochentag } from '../../../../shared/dates';
import { Icon } from '../../../../shared/icons';
import { useToast } from '../../../../shared/toast';
import { Callout, Card, EmptyState } from '../../../../shared/ui';
import { Textfeld } from '../../components/Textfeld';
import { QuelleBadge, anzahl } from '../../components/common';
import { mitAbschnittsspalten, neueLeistungenSeitText, summeStunden, textErgaenzen, zeilenFuerAnzeige } from '../../domain/nachweis';
import { darf, leistungenDerZeile } from '../../domain/rechte';
import {
  OHNE_ABSCHNITT,
  mitarbeiterName,
  type Abschnitt,
  type ID,
  type Leistung,
  type Leistungsnachweis,
  type NachweisZeile,
  type Projekt,
  type Raster,
} from '../../domain/types';
import { kurzDatum, runden, stundenText } from '../../domain/zeitraum';
import { useStore } from '../../store/store';
import '../../components/nachweis.css';

/** Bezeichnung der Zeilen je Raster. */
const ZEILEN_LABEL: Record<Raster, string> = {
  tag: 'Tag',
  woche: 'Woche',
  monat: 'Monat',
};

/** Eine Stundenspalte des Nachweises: ein Abschnitt oder „ohne“. */
interface Spalte {
  schluessel: string;
  kurz: string;
  name: string;
}

/**
 * Stundenspalten ab zwei Abschnitten (wie die Vorlage Woche.xlsx): je
 * Abschnitt eine, dazu „ohne“, wenn Leistungen ohne Abschnitt in den Zeilen
 * stehen. Mit einem oder keinem Abschnitt keine – dann zählt nur die Summe.
 * Gerechnet mit den erfassten Stunden (`stundenJeAbschnitt`).
 */
function stundenSpalten(abschnitte: Abschnitt[], zeilen: NachweisZeile[]): Spalte[] {
  if (!mitAbschnittsspalten(abschnitte)) return [];
  const spalten: Spalte[] = abschnitte.map((a) => ({ schluessel: a.id, kurz: a.kurz || a.kennung || a.name, name: a.name }));
  if (zeilen.some((z) => (z.stundenJeAbschnitt[OHNE_ABSCHNITT] ?? 0) !== 0)) {
    spalten.push({ schluessel: OHNE_ABSCHNITT, kurz: 'ohne', name: 'Leistungen ohne Abschnitt' });
  }
  return spalten;
}

export function Leistungstexte({ projekt, nachweis: n }: { projekt: Projekt; nachweis: Leistungsnachweis }) {
  const { data, zeilenTextSetzen, zugang } = useStore();
  const toast = useToast();
  const [offen, setOffen] = useState<Set<string>>(new Set());

  const abgeschlossen = n.status === 'abgeschlossen';
  const bearbeitbar = !abgeschlossen && darf(zugang, 'nachweisVerwalten');
  const zeilen = zeilenFuerAnzeige(data, n);
  const spalten = stundenSpalten(abgeschlossen && n.stand ? n.stand.abschnitte : projekt.abschnitte, zeilen);
  const summe = summeStunden(zeilen);
  const summen = Object.fromEntries(
    spalten.map((s) => [s.schluessel, runden(zeilen.reduce((t, z) => t + (z.stundenJeAbschnitt[s.schluessel] ?? 0), 0))]),
  );
  const mitarbeiterVon = new Map(data.mitarbeiter.map((m) => [m.id, m]));
  const abschnittVon = new Map(projekt.abschnitte.map((a) => [a.id, a]));
  const neueJeZeile = new Map(zeilen.map((z) => [z.schluessel, bearbeitbar ? neueLeistungenSeitText(data, n, z) : []]));

  const personName = (id: ID) => {
    const m = mitarbeiterVon.get(id);
    return m ? mitarbeiterName(m) || m.kuerzel : '?';
  };

  /* Leistungstexte – alle Änderungen über den Store */
  const textAendern = (z: NachweisZeile, text: string) => {
    // Beim Weiterschreiben bleiben die Leistungen der ersten Bearbeitung maßgeblich,
    // damit der Hinweis auf neue Leistungen nicht verschwindet.
    const bekannt = n.texte[z.schluessel];
    zeilenTextSetzen(n.id, bekannt ? { ...z, leistungIds: bekannt.leistungIds } : z, text);
  };
  const ergaenzen = (z: NachweisZeile, neue: Leistung[]) => zeilenTextSetzen(n.id, z, textErgaenzen(z.text, neue));
  const beibehalten = (z: NachweisZeile) => zeilenTextSetzen(n.id, z, z.text);
  const automatisch = (z: NachweisZeile) => {
    zeilenTextSetzen(n.id, z, null);
    toast('Automatischer Leistungstext wiederhergestellt.');
  };

  const umschalten = (schluessel: string) =>
    setOffen((alt) => {
      const neu = new Set(alt);
      if (neu.has(schluessel)) neu.delete(schluessel);
      else neu.add(schluessel);
      return neu;
    });

  if (zeilen.length === 0) {
    return (
      <Card>
        <EmptyState
          icon="stunden"
          titel="Noch keine Leistungen im Zeitraum"
          text={
            abgeschlossen
              ? 'Der Leistungsnachweis wurde ohne Leistungen abgeschlossen.'
              : `Sobald Mitarbeiter im Bereich Leistungsnachweise Leistungen im Zeitraum erfassen oder importieren, erscheinen sie hier je ${ZEILEN_LABEL[n.raster]}.`
          }
        />
      </Card>
    );
  }

  return (
    <div className="stack">
      {bearbeitbar ? (
        <p className="small tertiary ln-gemeinsam">
          Der Leistungstext je Zeile entsteht aus den Texten der Leistungen. Von Hand bearbeitete Texte bleiben stehen;
          kommen danach Leistungen hinzu, bietet die Zeile „Ergänzen“ an.
        </p>
      ) : null}

      <div className="stack ln-zeilen">
        {zeilen.map((z) => {
          const { eigene, andere } = leistungenDerZeile(data, z, zugang);
          return (
            <ZeileKarte
              key={z.schluessel}
              zeile={z}
              spalten={spalten}
              bearbeitbar={bearbeitbar}
              leistungen={[...eigene, ...andere].sort((a, b) => a.datum.localeCompare(b.datum))}
              neue={neueJeZeile.get(z.schluessel) ?? []}
              offen={offen.has(z.schluessel)}
              mitAbschnitt={projekt.abschnitte.length > 0}
              personName={personName}
              abschnittName={(id) => {
                const a = id ? abschnittVon.get(id) : undefined;
                return a ? a.kurz || a.name : '';
              }}
              onUmschalten={() => umschalten(z.schluessel)}
              onText={(text) => textAendern(z, text)}
              onErgaenzen={(neue) => ergaenzen(z, neue)}
              onBeibehalten={() => beibehalten(z)}
              onAutomatisch={() => automatisch(z)}
            />
          );
        })}

        {/* Summe der erfassten Stunden */}
        <div className="card ln-summe">
          <span className="ln-summe-label">Summe</span>
          {spalten.length ? (
            <span className="ln-summe-abschnitte">
              {spalten.map((s) => (
                <span key={s.schluessel} title={s.name}>
                  {s.kurz} <b>{stundenText(summen[s.schluessel] ?? 0)}</b>
                </span>
              ))}
            </span>
          ) : null}
          <strong className="ln-summe-wert">{stundenText(summe)} Std.</strong>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Eine Zeile des Nachweises                                           */
/* ------------------------------------------------------------------ */

function ZeileKarte({
  zeile: z,
  spalten,
  bearbeitbar,
  leistungen,
  neue,
  offen,
  mitAbschnitt,
  personName,
  abschnittName,
  onUmschalten,
  onText,
  onErgaenzen,
  onBeibehalten,
  onAutomatisch,
}: {
  zeile: NachweisZeile;
  spalten: Spalte[];
  /** Offen und im Controlling: der Text lässt sich bearbeiten. */
  bearbeitbar: boolean;
  /** Leistungen der Zeile – aller Mitarbeiter, nur lesen. */
  leistungen: Leistung[];
  /** Leistungen, die nach der Textbearbeitung hinzukamen. */
  neue: Leistung[];
  offen: boolean;
  mitAbschnitt: boolean;
  personName: (id: ID) => string;
  abschnittName: (id: ID | null) => string;
  onUmschalten: () => void;
  onText: (text: string) => void;
  onErgaenzen: (neue: Leistung[]) => void;
  onBeibehalten: () => void;
  onAutomatisch: () => void;
}) {
  const abschnitte = spalten.filter((s) => (z.stundenJeAbschnitt[s.schluessel] ?? 0) !== 0);
  const tabellenId = `ln-zeile-${z.schluessel}`;

  return (
    <div className={`card ln-zeile ${z.textBearbeitet ? 'ln-zeile-bearbeitet' : ''}`}>
      <div className="ln-zeile-raster">
        <div className="ln-zeile-datum">{z.datumText}</div>
        <div className="ln-zeile-bearbeiter">
          {z.bearbeiter.map((b) => (
            <span key={b}>{b}</span>
          ))}
        </div>
        <div className="ln-zeile-text">
          {bearbeitbar ? (
            <>
              <Textfeld value={z.text} onChange={onText} aria-label={`Leistungstext ${z.datumText.replace('\n', ' ')}`} />
              <div className="ln-zeile-hinweis">
                {z.textBearbeitet ? (
                  <>
                    Von Hand bearbeitet ·{' '}
                    <button type="button" className="ln-zeile-link" onClick={onAutomatisch}>
                      Automatischen Text wiederherstellen
                    </button>
                  </>
                ) : (
                  'Automatisch aus den Leistungstexten – Änderungen bleiben stehen'
                )}
              </div>
            </>
          ) : (
            <div className="ln-zeile-lesetext">{z.text || <span className="tertiary">ohne Leistungstext</span>}</div>
          )}
          {neue.length > 0 ? (
            <div className="ln-zeile-neu">
              <Callout ton="warn" icon="!">
                <div className="stack" style={{ gap: 6 }}>
                  <strong>{anzahl(neue.length, 'neue Leistung', 'neue Leistungen')} seit der Bearbeitung</strong>
                  <ul className="ln-zeile-neu-liste">
                    {neue.map((l) => (
                      <li key={l.id}>
                        {kurzDatum(l.datum)} · {personName(l.mitarbeiterId)}: {l.text}
                      </li>
                    ))}
                  </ul>
                  <div className="row wrap" style={{ gap: 6 }}>
                    <button type="button" className="btn btn-sm btn-primary" onClick={() => onErgaenzen(neue)}>
                      Ergänzen
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      title="Den Text unverändert lassen und den Hinweis ausblenden"
                      onClick={onBeibehalten}
                    >
                      Text so lassen
                    </button>
                  </div>
                </div>
              </Callout>
            </div>
          ) : null}
        </div>
        <div className="ln-zeile-stunden">
          <span className="ln-zeile-summe">{stundenText(z.stunden)}</span> <span className="small tertiary">Std.</span>
          {abschnitte.length > 0 ? (
            <div className="ln-zeile-abschnitte">
              {abschnitte.map((s) => (
                <span key={s.schluessel} title={s.name}>
                  <span>{s.kurz}</span>
                  <b>{stundenText(z.stundenJeAbschnitt[s.schluessel] ?? 0)}</b>
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {leistungen.length > 0 ? (
        <div className="ln-zeile-fuss">
          <button
            type="button"
            className="ln-zeile-aufklappen"
            aria-expanded={offen}
            aria-controls={offen ? tabellenId : undefined}
            onClick={onUmschalten}
          >
            <Icon name={offen ? 'runter' : 'chevron'} size={12} /> Leistungen ({leistungen.length})
          </button>
        </div>
      ) : null}

      {offen && leistungen.length > 0 ? (
        <div className="table-scroll ln-zeile-leistungen" id={tabellenId}>
          <table className="table table-stack">
            <thead>
              <tr>
                <th>Datum</th>
                <th>Mitarbeiter</th>
                <th>Leistungstext</th>
                {mitAbschnitt ? <th className="col-optional">Abschnitt</th> : null}
                <th className="ln-stunden">Stunden</th>
                <th className="col-optional">Quelle</th>
              </tr>
            </thead>
            <tbody>
              {leistungen.map((l) => (
                <tr key={l.id}>
                  <td className="num">
                    {wochentag(l.datum)} {kurzDatum(l.datum)}
                  </td>
                  <td className="small">{personName(l.mitarbeiterId)}</td>
                  <td className="ln-zeile-leistungstext">{l.text}</td>
                  {mitAbschnitt ? <td className="col-optional small muted">{abschnittName(l.abschnittId) || 'ohne'}</td> : null}
                  <td className="ln-stunden">{stundenText(l.stunden)}</td>
                  <td className="col-optional">
                    <QuelleBadge quelle={l.quelle} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
