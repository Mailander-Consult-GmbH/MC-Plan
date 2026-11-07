/**
 * Ansicht „Leistungstexte“ der Abrechnung im Controlling (Abrechnung.tsx): je
 * Tag, Woche oder Monat mit Leistungen eine Zeile mit Datum, Bearbeitern,
 * Leistungstext und den erfassten Stunden (ab zwei Abschnitten je Abschnitt,
 * `mitAbschnittsspalten`). Je Zeile aufklappbar die Leistungen aller
 * Mitarbeiter – nur zum Lesen; ändern kann eine Leistung nur, wer sie im
 * Bereich erfasst hat (domain/rechte.ts). Darunter die Summe.
 *
 * Der Leistungstext entsteht aus den gemeinsamen Leistungstexten, die die
 * Mitarbeiter je Zeitraum im Bereich verfassen (`Periodentext`,
 * `nachweisZeilen`; die Zeile ist dann als „Text der Mitarbeiter“
 * gekennzeichnet, `textGemeinsam`), wo keiner steht bzw. keiner gilt (etwa in
 * Zeilen, die feiner gegliedert sind als das Projekt – ein Hinweis nennt das)
 * automatisch aus den Texten der Leistungen. Wer ihn hier bearbeitet, behält seinen Text: Kommen danach
 * Leistungen hinzu, nennt die Zeile sie und bietet „Ergänzen“ an; ändert sich
 * danach der Text der Mitarbeiter (die Zeile merkt sich, von welchem die
 * Bearbeitung ausging, `ZeilenText.ausgang`), nennt sie den neuen
 * (`ueberholteZeilen` – dieselben zählt die Warnung der Abrechnung) und bietet
 * „Text der Mitarbeiter übernehmen“ an – überschrieben wird nie still, „Text
 * so lassen“ blendet den Hinweis aus. „Text der Mitarbeiter wiederherstellen“
 * bzw. „Automatischen Text wiederherstellen“ verwirft die Bearbeitung.
 * Bearbeiten darf nur das Controlling, solange der Nachweis offen ist;
 * abgeschlossene Nachweise zeigen den festgeschriebenen Stand, nur zum Lesen.
 * Die Bemerkung steht in der Abrechnung.
 */
import { useState } from 'react';
import { wochentag } from '../../../../shared/dates';
import { Icon } from '../../../../shared/icons';
import { useToast } from '../../../../shared/toast';
import { Badge, Callout, Card, EmptyState } from '../../../../shared/ui';
import { Textfeld } from '../../components/Textfeld';
import { QuelleBadge, anzahl } from '../../components/common';
import {
  mitAbschnittsspalten,
  nachweisZeilen,
  periodentexteVon,
  summeStunden,
  textErgaenzen,
  ueberholteZeilen,
  zeilenFuerAnzeige,
  type UeberholteZeile,
} from '../../domain/nachweis';
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

/** Feinheit der Raster – feiner gegliederte Zeilen übernehmen keine gemeinsamen Texte (`nachweisZeilen`). */
const FEINHEIT: Record<Raster, number> = { tag: 0, woche: 1, monat: 2 };

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
  // Von Hand bearbeitete Zeilen mit neuen Leistungen bzw. geändertem Text der Mitarbeiter – wie die Abrechnung sie zählt
  const ueberholt = bearbeitbar ? ueberholteZeilen(data, n) : new Map<string, UeberholteZeile>();
  // Zeilen ohne die Bearbeitung von Hand – ob es dort einen Text der Mitarbeiter gäbe (`textGemeinsam`)
  const ohneBearbeitung =
    bearbeitbar && zeilen.some((z) => z.textBearbeitet)
      ? new Map(nachweisZeilen(data, { ...n, texte: {} }).map((z) => [z.schluessel, z]))
      : null;

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
  // „Ergänzen“ und „Text so lassen“: Die Zeile ist gesehen – neue Leistungen und Text der Mitarbeiter gelten als bekannt
  const ergaenzen = (z: NachweisZeile, neue: Leistung[]) => zeilenTextSetzen(n.id, z, textErgaenzen(z.text, neue), { gesehen: true });
  const beibehalten = (z: NachweisZeile) => zeilenTextSetzen(n.id, z, z.text, { gesehen: true });
  const automatisch = (z: NachweisZeile, gemeinsam: boolean) => {
    zeilenTextSetzen(n.id, z, null);
    toast(gemeinsam ? 'Leistungstext der Mitarbeiter wiederhergestellt.' : 'Automatischer Leistungstext wiederhergestellt.');
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
          Der Leistungstext je Zeile entsteht aus den Leistungstexten, die die Mitarbeiter je Zeitraum gemeinsam
          verfassen – wo keiner steht, aus den Texten der Leistungen. Von Hand bearbeitete Texte bleiben stehen; kommen
          danach Leistungen hinzu, bietet die Zeile „Ergänzen“ an.
        </p>
      ) : null}
      {bearbeitbar && FEINHEIT[n.raster] < FEINHEIT[projekt.raster] && periodentexteVon(data, projekt.id).size > 0 ? (
        <Callout icon="i">
          Die Zeilen sind feiner gegliedert ({ZEILEN_LABEL[n.raster]}) als die gemeinsamen Leistungstexte der Mitarbeiter
          (Raster des Projekts: {ZEILEN_LABEL[projekt.raster]}). Ein Text, der nur zum Teil in einer Zeile liegt, gilt dort
          nicht – solche Zeilen zeigen die Texte ihrer Leistungen.
        </Callout>
      ) : null}

      <div className="stack ln-zeilen">
        {zeilen.map((z) => {
          const { eigene, andere } = leistungenDerZeile(data, z, zugang);
          const leistungen = [...eigene, ...andere].sort((a, b) => a.datum.localeCompare(b.datum));
          // Gäbe es ohne die Bearbeitung von Hand einen Text der Mitarbeiter? (Nur für die Beschriftung von „wiederherstellen“)
          const ohne = z.textBearbeitet ? ohneBearbeitung?.get(z.schluessel) : undefined;
          const gemeinsamMoeglich = !!ohne?.textGemeinsam;
          // Hat sich der Text der Mitarbeiter seit der Bearbeitung geändert?
          const mitarbeiterTextNeu = ueberholt.get(z.schluessel)?.textNeu ?? null;
          return (
            <ZeileKarte
              key={z.schluessel}
              zeile={z}
              nachgereicht={!!z.nachgereicht || z.bis < n.von}
              spalten={spalten}
              bearbeitbar={bearbeitbar}
              leistungen={leistungen}
              gemeinsamMoeglich={gemeinsamMoeglich}
              mitarbeiterTextNeu={mitarbeiterTextNeu}
              neue={ueberholt.get(z.schluessel)?.neue ?? []}
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
              onAutomatisch={() => automatisch(z, gemeinsamMoeglich)}
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
  nachgereicht,
  spalten,
  bearbeitbar,
  leistungen,
  gemeinsamMoeglich,
  mitarbeiterTextNeu,
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
  /** Zeile aus nachgereichten Leistungen (`NachweisZeile.nachgereicht`; in älteren Ständen: vor dem Zeitraum). */
  nachgereicht: boolean;
  spalten: Spalte[];
  /** Offen und im Controlling: der Text lässt sich bearbeiten. */
  bearbeitbar: boolean;
  /** Leistungen der Zeile – aller Mitarbeiter, nur lesen. */
  leistungen: Leistung[];
  /** Von Hand bearbeitet, und ohne die Bearbeitung käme der Text aus den gemeinsamen Texten der Mitarbeiter. */
  gemeinsamMoeglich: boolean;
  /** Von Hand bearbeitet, und der Text der Mitarbeiter hat sich seitdem geändert: der heutige – sonst null. */
  mitarbeiterTextNeu: string | null;
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
        <div className="ln-zeile-datum">
          {z.datumText}
          {nachgereicht ? <div className="small tertiary">nachgereicht</div> : null}
        </div>
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
                      {gemeinsamMoeglich ? 'Text der Mitarbeiter wiederherstellen' : 'Automatischen Text wiederherstellen'}
                    </button>
                  </>
                ) : z.textGemeinsam ? (
                  <>
                    <Badge ton="blue">Text der Mitarbeiter</Badge> aus ihren gemeinsamen Leistungstexten – Änderungen hier
                    bleiben stehen
                  </>
                ) : (
                  'Automatisch aus den Leistungstexten – Änderungen bleiben stehen'
                )}
              </div>
            </>
          ) : (
            <>
              <div className="ln-zeile-lesetext">{z.text || <span className="tertiary">ohne Leistungstext</span>}</div>
              {z.textGemeinsam ? (
                <div className="ln-zeile-hinweis">
                  <Badge ton="blue">Text der Mitarbeiter</Badge> aus ihren gemeinsamen Leistungstexten
                </div>
              ) : z.textBearbeitet ? (
                <div className="ln-zeile-hinweis">Von Hand bearbeitet</div>
              ) : null}
            </>
          )}
          {bearbeitbar && (neue.length > 0 || mitarbeiterTextNeu !== null) ? (
            <div className="ln-zeile-neu">
              <Callout ton="warn" icon="!">
                <div className="stack" style={{ gap: 6 }}>
                  {neue.length > 0 ? (
                    <>
                      <strong>{anzahl(neue.length, 'neue Leistung', 'neue Leistungen')} seit der Bearbeitung</strong>
                      <ul className="ln-zeile-neu-liste">
                        {neue.map((l) => (
                          <li key={l.id}>
                            {kurzDatum(l.datum)} · {personName(l.mitarbeiterId)}: {l.text}
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                  {mitarbeiterTextNeu !== null ? (
                    <>
                      <strong>
                        {gemeinsamMoeglich
                          ? 'Der Text der Mitarbeiter hat sich seit der Bearbeitung geändert:'
                          : 'Der automatische Text hat sich seit der Bearbeitung geändert:'}
                      </strong>
                      <span className="ln-zeile-neu-liste">„{mitarbeiterTextNeu}“</span>
                    </>
                  ) : null}
                  <div className="row wrap" style={{ gap: 6 }}>
                    {neue.length > 0 ? (
                      <button type="button" className="btn btn-sm btn-primary" onClick={() => onErgaenzen(neue)}>
                        Ergänzen
                      </button>
                    ) : null}
                    {mitarbeiterTextNeu !== null ? (
                      <button type="button" className={`btn btn-sm ${neue.length > 0 ? 'btn-outline' : 'btn-primary'}`} onClick={onAutomatisch}>
                        {gemeinsamMoeglich ? 'Text der Mitarbeiter übernehmen' : 'Automatischen Text übernehmen'}
                      </button>
                    ) : null}
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
