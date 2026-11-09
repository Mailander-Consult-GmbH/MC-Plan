/**
 * Ein Leistungsnachweis im Controlling – der Arbeitsbereich auf der Seite
 * eines Projekts (Projekt.tsx). Aufgabe des Controllings: prüfen, ob alle
 * eingetragen und bestätigt haben, den Leistungsnachweis prüfen, wo nötig mit
 * Aufschlag, und ihn abschließen – wie bisher die Excel je Projekt, die am
 * Monatsende abgeschickt oder offen gelassen wird. Einen Rhythmus oder eine
 * Entscheidung „weiterlaufen lassen“ gibt es nicht: Ohne Abschluss läuft der
 * offene Nachweis einfach weiter.
 *
 * Oben der Kopf: „Offener Leistungsnachweis“ bzw. die Überschrift des
 * abgeschlossenen, sein Zeitraum (`nachweisZeitraumText`) und Raster,
 * abgeschlossen „Abgeschlossen am …“ mit dem Link „Wieder öffnen …“. Die
 * Knöpfe „Vorschau“ (`NachweisVorschau`: Druckblatt mit „Drucken / PDF“) und
 * „Nachweis löschen“ (`NachweisLoeschenDialog`) stehen in der Reihe des
 * Projekts (Projekt.tsx). Eine Excel-Fassung, „Zeitraum ändern“ und
 * „Aufschläge zurücksetzen“ gibt es nicht (mehr) – Aufschläge leert man je
 * Zeile.
 *
 * Ein offener Nachweis steht in drei Schritten (`SchrittKopf`):
 * 1. „Haben alle eingetragen und bestätigt?“ – `MitarbeiterBestaetigungen`
 *    (BestaetigungsStand.tsx), gezählt bis zum in Schritt 3 gewählten Ende.
 * 2. „Prüfen – so geht der Leistungsnachweis raus“ – die Tabelle: je Zeile
 *    (Tag, Woche oder Monat) Datum, Bearbeiter, der Leistungstext
 *    (Leistungstexte.tsx, `ZeilenText`: zunächst zum Lesen, „✎ Korrigieren“
 *    macht ihn bearbeitbar; aus den gemeinsamen Texten der Mitarbeiter, Badge
 *    „Text der Mitarbeiter“; von Hand bearbeitet bleibt er stehen, neue
 *    Leistungen bzw. ein geänderter Text der Mitarbeiter werden zum Ergänzen
 *    angeboten) –, die erfassten Stunden, der Aufschlag in ± Stunden je Zeile
 *    und die abgerechneten Stunden; ab zwei Abschnitten je Abschnitt
 *    (`mitAbschnittsspalten`). Wer „Abgerechnet“ eingibt, setzt den Aufschlag
 *    als Differenz (`aufschlagFuerAbgerechnet`). Einen Aufschlag auf den
 *    ganzen Nachweis gibt es nicht (mehr, Fassung 10) – aufgeschlagen wird je
 *    Zeile. Unter der Tabelle die Bemerkung.
 * 3. „Abschließen und PDF“ (`AbschliessenSchritt`): bis wann – jedes
 *    Monatsende oder bis heute –, was abgerechnet wird, was im nächsten
 *    weiterläuft, wer nicht bestätigt hat (dann nur mit „Trotzdem
 *    abschließen“); danach öffnet sich der Druckdialog, und die Seite zeigt
 *    den abgeschlossenen Nachweis.
 *
 * Gibt es nicht erfasste Leistungen aus schon abgerechneten Zeiträumen und
 * ist dies der laufende Nachweis, teilt ein Hinweis das mit; übernommen
 * werden sie erst nach Bestätigung (`leistungenNachreichen`). Abgeschlossene
 * Nachweise zeigen ihren Stand ohne Schritte und lassen sich nur lesen. Alle
 * Änderungen laufen über den Store, der den Controlling-Zugang prüft.
 */
import { useState, type ReactNode } from 'react';
import { addDays, today, wochentag } from '../../../../shared/dates';
import { Icon } from '../../../../shared/icons';
import { useToast } from '../../../../shared/toast';
import { Badge, Callout, Card, CardHeader, ConfirmDialog, EmptyState, Modal } from '../../../../shared/ui';
import { Druckblatt } from '../../components/Druckblatt';
import { NichtErfasstHinweis } from '../../components/NachweisDialog';
import { Textfeld } from '../../components/Textfeld';
import { anzahl, nachweisZeitraumText, zeitpunkt } from '../../components/common';
import { nachweisDrucken, nachweisFassung, nachweisHtml } from '../../domain/druck';
import {
  erfassungsPeriodeVon,
  fehlendeBestaetigungen,
  grenzFolgen,
  grenzFolgenHinweis,
  periodentexteNachOeffnen,
} from '../../domain/erfassung';
import {
  abschlussEnden,
  abschlussVorschlag,
  abschlussZeitraum,
  aufschlagEingabe,
  aufschlagFuerAbgerechnet,
  leistungenDesNachweises,
  mitAbschnittsspalten,
  nachweisAbschliessenAnwenden,
  nachweisSummen,
  nachweisTitel,
  nachweisZeilen,
  nichtAbgerechnet,
  periodentexteVon,
  standVeraltet,
  standVergleich,
  stundenVon,
  textErgaenzen,
  ueberholtHinweis,
  ueberholtRueckfrage,
  ueberholteZeilen,
  type AbschlussEnde,
  type UeberholteZeile,
} from '../../domain/nachweis';
import { darf, eigeneLeistungen, leistungenDerZeile } from '../../domain/rechte';
import {
  OHNE_ABSCHNITT,
  RASTER_KURZ,
  RASTER_LABEL,
  mitarbeiterName,
  type Abschnitt,
  type ID,
  type Leistung,
  type Leistungsnachweis,
  type NachweisZeile,
  type Projekt,
  type Raster,
} from '../../domain/types';
import { kurzDatum, langDatum, monatText, runden, stundenText, zeitraumText } from '../../domain/zeitraum';
import type { Route } from '../../lib/router';
import { useStore } from '../../store/store';
import { FehlendeBestaetigungen, MitarbeiterBestaetigungen } from './BestaetigungsStand';
import { SchrittKopf, StundenFeld, aufschlagFeld, aufschlagText } from './hilfen';
import { ZeilenText } from './Leistungstexte';
import './controlling.css';

/** Feinheit der Raster – feiner gegliederte Zeilen übernehmen keine gemeinsamen Texte (`nachweisZeilen`). */
const FEINHEIT: Record<Raster, number> = { tag: 0, woche: 1, monat: 2 };

/** Bezeichnung der Zeilen je Raster. */
const ZEILEN_LABEL: Record<Raster, string> = { tag: 'Tag', woche: 'Woche', monat: 'Monat' };

/** Eine Abrechnungsposition einer Zeile: ein Abschnitt, „ohne“ bzw. die ganze Zeile. */
interface Position {
  /** Abschnitts-ID; null = „ohne“ bzw. ganze Zeile. */
  abschnittId: ID | null;
  kurz: string;
  name: string;
  erfasst: number;
  /** Eingegebener Aufschlag (offen) bzw. wirksamer (abgeschlossen). */
  eingabe: number;
  wirksam: number;
  abgerechnet: number;
}

/**
 * Positionen einer Zeile: ohne Abschnittsspalten eine, sonst je Abschnitt und
 * „ohne“ – davon nur die mit Stunden oder Aufschlag, mit `alle` jede.
 */
function positionenVon(
  z: NachweisZeile,
  n: Leistungsnachweis,
  abschnitte: Abschnitt[],
  spalten: boolean,
  lesen: boolean,
  alle: boolean,
): Position[] {
  if (!spalten) {
    return [
      {
        abschnittId: null,
        kurz: '',
        name: '',
        erfasst: z.stunden,
        eingabe: lesen ? z.aufschlag : aufschlagEingabe(n, z.schluessel, null),
        wirksam: z.aufschlag,
        abgerechnet: z.abgerechnet,
      },
    ];
  }
  const liste = [
    ...abschnitte.map((a) => ({ abschnittId: a.id as ID | null, kurz: a.kurz || a.kennung || a.name, name: a.name })),
    { abschnittId: null, kurz: 'ohne', name: 'Ohne Abschnitt – ein Aufschlag hier gilt der ganzen Zeile' },
  ];
  const alleZeilen = liste
    .map((p): Position => {
      const k = p.abschnittId ?? OHNE_ABSCHNITT;
      const wirksam = z.aufschlagJeAbschnitt?.[k] ?? 0;
      return {
        ...p,
        erfasst: z.stundenJeAbschnitt[k] ?? 0,
        eingabe: lesen ? wirksam : aufschlagEingabe(n, z.schluessel, p.abschnittId),
        wirksam,
        abgerechnet: (z.abgerechnetJeAbschnitt ?? z.stundenJeAbschnitt)[k] ?? 0,
      };
    });
  const gezeigt = alleZeilen.filter((p) => alle || p.erfasst !== 0 || p.eingabe !== 0 || p.wirksam !== 0 || p.abgerechnet !== 0);
  // Mindestens eine Position – sonst fehlten der Zeile Datum, Bearbeiter und Text
  return gezeigt.length ? gezeigt : alleZeilen.slice(-1);
}

export function NachweisBearbeitung({ projekt, nachweis: n, navigate }: { projekt: Projekt; nachweis: Leistungsnachweis; navigate: (r: Route) => void }) {
  const {
    data,
    zugang,
    updateNachweis,
    nachweisOeffnen,
    aufschlagSetzen,
    leistungenNachreichen,
    zeilenTextSetzen,
  } = useStore();
  const toast = useToast();
  const [offeneTexte, setOffeneTexte] = useState<Set<string>>(new Set());
  const [offeneLeistungen, setOffeneLeistungen] = useState<Set<string>>(new Set());
  const [alleAbschnitte, setAlleAbschnitte] = useState(false);
  const [nachreichen, setNachreichen] = useState(false);
  const [oeffnen, setOeffnen] = useState(false);
  // Ende des Abschlusses (Schritt 3) – auch Schritt 1 zählt die Bestätigungen bis dahin
  const [endeWahl, setEndeWahl] = useState<string | null>(() => abschlussVorschlag(n, today()));

  const heute = today();
  const abgeschlossen = n.status === 'abgeschlossen';
  // Die Wahl bleibt nur, solange sie wählbar ist (etwa nach neuen Leistungen)
  const ende = abgeschlossen
    ? null
    : abschlussEnden(n, heute).some((e) => e.bis === endeWahl)
      ? endeWahl
      : abschlussVorschlag(n, heute);
  const bearbeitbar = !abgeschlossen && darf(zugang, 'nachweisVerwalten');
  const fassung = nachweisFassung(data, n, projekt, 'abgerechnet');
  const { zeilen } = fassung;
  const abschnitte = abgeschlossen && n.stand ? n.stand.abschnitte : projekt.abschnitte;
  const spalten = mitAbschnittsspalten(abschnitte);
  const summen = nachweisSummen(zeilen);
  const veraltet = standVeraltet(data, n);
  // Nicht erfasste Leistungen – nur am laufenden Nachweis (nach dem letzten abgeschlossenen)
  const plan = abgeschlossen ? null : nichtAbgerechnet(data, projekt.id, heute);
  const nichtErfasst = plan && plan.offene.some((o) => o.id === n.id) ? plan.nichtErfasst : [];
  const mitarbeiterVon = new Map(data.mitarbeiter.map((m) => [m.id, m]));
  const abschnittVon = new Map(projekt.abschnitte.map((a) => [a.id, a]));
  const personName = (id: ID) => {
    const m = mitarbeiterVon.get(id);
    return m ? mitarbeiterName(m) || m.kuerzel : '?';
  };

  // Aufschläge, die gerade nicht wirken: ihre Zeile fehlt (etwa nach einem Rasterwechsel) oder ihr Abschnitt
  const zeilenSchluessel = new Set(zeilen.map((z) => z.schluessel));
  const unwirksam = abgeschlossen
    ? 0
    : Object.entries(n.aufschlaege).filter(([k, v]) => {
        if (!v) return false;
        const trenner = k.lastIndexOf('|');
        const zeile = k.slice(0, trenner);
        const abschnitt = k.slice(trenner + 1);
        return !zeilenSchluessel.has(zeile) || (abschnitt !== OHNE_ABSCHNITT && (!spalten || !abschnittVon.has(abschnitt)));
      }).length;
  // Von Hand bearbeitete Zeilen mit neuen Leistungen bzw. geändertem Text der Mitarbeiter (`ueberholteZeilen`) – die
  // Zeilen nennen es selbst, darüber steht die Zahl
  const ueberholtJe = bearbeitbar ? ueberholteZeilen(data, n) : new Map<string, UeberholteZeile>();
  const ueberholt = [...ueberholtJe.values()];
  const ueberholtText = ueberholtHinweis(ueberholt);
  // Zeilen ohne die Bearbeitung von Hand – ob es dort einen Text der Mitarbeiter gäbe (`textGemeinsam`)
  const ohneBearbeitung =
    bearbeitbar && zeilen.some((z) => z.textBearbeitet)
      ? new Map(nachweisZeilen(data, { ...n, texte: {} }).map((z) => [z.schluessel, z]))
      : null;
  const feiner = bearbeitbar && FEINHEIT[n.raster] < FEINHEIT[projekt.raster] && periodentexteVon(data, projekt.id).size > 0;

  const umschalten = (setze: typeof setOffeneTexte, schluessel: string) =>
    setze((alt) => {
      const neu = new Set(alt);
      if (neu.has(schluessel)) neu.delete(schluessel);
      else neu.add(schluessel);
      return neu;
    });

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

  /* Wieder öffnen (nur abgeschlossene, als Link im Kopf) */
  const vergleich = standVergleich(data, n);
  const oeffnenText = vergleich.veraltet
    ? `Seit dem Abschluss haben sich Leistungen geändert: festgeschrieben sind ${stundenText(vergleich.stand.erfasst)} Std. erfasst und ${stundenText(
        vergleich.stand.abgerechnet,
      )} Std. abgerechnet, aktuell sind es ${stundenText(vergleich.aktuell.erfasst)} bzw. ${stundenText(
        vergleich.aktuell.abgerechnet,
      )} Std. „Wieder öffnen“ verwirft den festgeschriebenen Stand und zeigt die aktuellen Leistungen; die Aufschläge bleiben.`
    : `Der festgeschriebene Stand (${stundenText(vergleich.stand.abgerechnet)} Std. abgerechnet) wird verworfen; der Leistungsnachweis zeigt wieder die aktuellen Leistungen, die Aufschläge bleiben. Er stimmt derzeit mit dem Stand überein.`;
  // Im Raster eines früheren Abschlusses: Nach „Wieder öffnen“ gliedert das Raster des Projekts seine Tage
  const texteNachOeffnen = oeffnen ? periodentexteNachOeffnen(data, n) : 0;
  const oeffnenRasterText =
    texteNachOeffnen && n.stand?.erfassungsRaster
      ? ` Die Mitarbeiter haben ihre Leistungstexte hier im Raster „${RASTER_KURZ[n.stand.erfassungsRaster]}“ verfasst, das Projekt gliedert sie inzwischen im Raster „${RASTER_KURZ[projekt.raster]}“: ${
          texteNachOeffnen === 1
            ? '1 gemeinsamer Text gilt danach nicht mehr, die Mitarbeiter verfassen ihn neu. Er bleibt gespeichert und gilt wieder'
            : `${texteNachOeffnen} gemeinsame Texte gelten danach nicht mehr, die Mitarbeiter verfassen sie neu. Sie bleiben gespeichert und gelten wieder`
        }, wenn das Raster zurückgestellt wird.`
      : '';
  // Erlöschende Bestätigungen nach „Wieder öffnen“: Zählt ein Zeitraum wieder, gilt sie nur, wie er bestätigt war
  const oeffnenBestaetigungen = oeffnen
    ? erloschenHinweis(
        grenzFolgen(data, {
          ...data,
          nachweise: data.nachweise.map((x) => (x.id === n.id ? { ...x, status: 'entwurf', abgeschlossen: null, stand: null } : x)),
        }),
        data.mitarbeiter,
      )
    : null;

  const kopfSub = `${nachweisZeitraumText(n)} · ${RASTER_LABEL[n.raster]}`;
  const spaltenzahl = spalten ? 7 : 6;
  const wahlId = `ln-co-nachweiswahl-${projekt.id}`;

  return (
    <div className="stack">
      {/* Kopf des Nachweises – die Knöpfe (Vorschau, Nachweis löschen) stehen oben in der Reihe des Projekts */}
      <div className="ln-co-nachweiskopf">
        <h3 className="ln-co-nachweistitel">{abgeschlossen ? fassung.titel : 'Offener Leistungsnachweis'}</h3>
        <span className="small muted">{kopfSub}</span>
        {abgeschlossen ? (
          <span className="ln-co-erstellt">
            <Icon name="check" size={14} /> Abgeschlossen {zeitpunkt(n.abgeschlossen)}
          </span>
        ) : null}
        {abgeschlossen && darf(zugang, 'nachweisVerwalten') ? (
          <button type="button" className="ln-co-link" onClick={() => setOeffnen(true)}>
            Wieder öffnen …
          </button>
        ) : null}
        {veraltet ? <Badge ton="orange">geändert</Badge> : null}
      </div>

      {veraltet ? (
        <Callout ton="warn" icon="!">
          Seit dem Abschluss haben sich Leistungen im Zeitraum geändert – „Wieder öffnen“ (oben neben „Abgeschlossen“) übernimmt sie.
        </Callout>
      ) : null}
      {nichtErfasst.length > 0 ? (
        <NichtErfasstHinweis daten={data} leistungen={nichtErfasst}>
          <div>
            <button type="button" className="btn btn-sm btn-outline" onClick={() => setNachreichen(true)}>
              In diesen Leistungsnachweis übernehmen …
            </button>
          </div>
        </NichtErfasstHinweis>
      ) : null}
      {ueberholtText ? (
        <Callout ton="warn" icon="!">
          {ueberholtText} Die Zeilen sind in der Tabelle markiert.
        </Callout>
      ) : null}
      {feiner ? (
        <Callout icon="i">
          Die Zeilen sind feiner gegliedert ({ZEILEN_LABEL[n.raster]}) als die gemeinsamen Leistungstexte der Mitarbeiter
          (Raster des Projekts: {ZEILEN_LABEL[projekt.raster]}). Ein Text, der nur zum Teil in einer Zeile liegt, gilt dort
          nicht – solche Zeilen zeigen die Texte ihrer Leistungen.
        </Callout>
      ) : null}
      {unwirksam > 0 ? (
        <Callout icon="i">
          {unwirksam === 1
            ? '1 Aufschlag gehört zu einer Zeile, die es im aktuellen Raster nicht gibt, und wirkt deshalb nicht – er kehrt zurück, wenn die Zeile wieder entsteht.'
            : `${unwirksam} Aufschläge gehören zu Zeilen, die es im aktuellen Raster nicht gibt, und wirken deshalb nicht – sie kehren zurück, wenn die Zeilen wieder entstehen.`}
        </Callout>
      ) : null}

      <MitarbeiterBestaetigungen nachweis={n} mitarbeiter={fassung.mitarbeiter} schritt={abgeschlossen ? undefined : 1} bis={ende} />

      <Card>
        {abgeschlossen ? (
          <CardHeader titel={fassung.titel} sub={kopfSub} />
        ) : (
          <SchrittKopf
            nr={2}
            titel="Prüfen – so geht der Leistungsnachweis raus"
            sub="Texte bei Bedarf korrigieren (✎), Aufschlag je Zeile."
            actions={
              spalten ? (
                <label className="checkbox small" title="Je Zeile auch Abschnitte ohne Stunden und „ohne Abschnitt“ zeigen – für Aufschläge dort">
                  <input type="checkbox" checked={alleAbschnitte} onChange={(e) => setAlleAbschnitte(e.target.checked)} />
                  Alle Abschnitte
                </label>
              ) : undefined
            }
          />
        )}
        {zeilen.length === 0 ? (
          <EmptyState
            icon="stunden"
            titel="Keine Leistungen im Zeitraum"
            text={
              abgeschlossen
                ? 'Der Leistungsnachweis wurde ohne Leistungen abgeschlossen.'
                : 'Sobald Mitarbeiter Leistungen im Zeitraum erfassen oder importieren, erscheinen sie hier je Zeile.'
            }
          />
        ) : (
          <div className="table-scroll ln-co-abrechnung-huelle">
            <table className={`table ln-co-abrechnung ${spalten ? 'ln-co-mit-abschnitten' : ''} ${abgeschlossen ? '' : 'ln-co-eingaben'}`}>
              <thead>
                <tr>
                  <th className="ln-co-spalte-datum">Datum</th>
                  <th className="ln-co-spalte-bearbeiter">Bearbeiter</th>
                  <th>Leistungstext</th>
                  {spalten ? <th className="ln-co-spalte-abschnitt">Abschnitt</th> : null}
                  <th className="ln-stunden ln-co-spalte-zahl">Erfasst</th>
                  <th className="ln-stunden ln-co-spalte-eingabe">Aufschlag</th>
                  <th className="ln-stunden ln-co-spalte-eingabe">Abgerechnet</th>
                </tr>
              </thead>
              {zeilen.map((z) => {
                const { eigene, andere } = leistungenDerZeile(data, z, zugang);
                // Gäbe es ohne die Bearbeitung von Hand einen Text der Mitarbeiter? (Nur für die Beschriftung von „wiederherstellen“)
                const gemeinsamMoeglich = !!(z.textBearbeitet && ohneBearbeitung?.get(z.schluessel)?.textGemeinsam);
                const u = ueberholtJe.get(z.schluessel);
                return (
                  <ZeileAbrechnung
                    key={z.schluessel}
                    zeile={z}
                    nachgereicht={!!z.nachgereicht || z.bis < n.von}
                    positionen={positionenVon(z, n, abschnitte, spalten, abgeschlossen, alleAbschnitte)}
                    spalten={spalten}
                    lesen={abgeschlossen}
                    leistungen={[...eigene, ...andere].sort((a, b) => a.datum.localeCompare(b.datum))}
                    leistungenOffen={offeneLeistungen.has(z.schluessel)}
                    personName={personName}
                    abschnittKurz={(id) => {
                      const a = id ? abschnittVon.get(id) : undefined;
                      return a ? a.kurz || a.kennung || a.name : '';
                    }}
                    text={
                      <ZeilenText
                        zeile={z}
                        bearbeitbar={bearbeitbar}
                        gemeinsamMoeglich={gemeinsamMoeglich}
                        mitarbeiterTextNeu={u?.textNeu ?? null}
                        neue={u?.neue ?? []}
                        textOffen={offeneTexte.has(z.schluessel)}
                        personName={personName}
                        onText={(text) => textAendern(z, text)}
                        onErgaenzen={(neue) => ergaenzen(z, neue)}
                        onBeibehalten={() => beibehalten(z)}
                        onAutomatisch={() => automatisch(z, gemeinsamMoeglich)}
                        onMehr={() => umschalten(setOffeneTexte, z.schluessel)}
                      />
                    }
                    onLeistungen={() => umschalten(setOffeneLeistungen, z.schluessel)}
                    onAufschlag={(abschnittId, stunden) => aufschlagSetzen(n.id, z.schluessel, abschnittId, stunden)}
                    onAbgerechnet={(abschnittId, stunden) =>
                      aufschlagSetzen(n.id, z.schluessel, abschnittId, stunden === null ? null : aufschlagFuerAbgerechnet(z, abschnittId, stunden, spalten))
                    }
                  />
                );
              })}
              <tbody className="ln-co-summenblock">
                <tr className="ln-co-summe">
                  <td colSpan={spaltenzahl - 3}>Summe</td>
                  <td className="ln-stunden" data-label="Erfasst">
                    {stundenText(summen.erfasst)}
                  </td>
                  <td className="ln-stunden" data-label="Aufschlag">
                    {aufschlagText(summen.aufschlag)}
                  </td>
                  <td className="ln-stunden ln-co-abgerechnet" data-label="Abgerechnet">
                    {stundenText(summen.abgerechnet)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
        {!abgeschlossen ? (
          <p className="small tertiary ln-co-tabellenhinweis">
            Aufschlag in ± Std. je Zeile{spalten ? ' und Abschnitt' : ''}, z. B. 1,5 oder -0,5 – gespeichert beim Verlassen
            des Felds oder mit Enter; „Abgerechnet“ setzt den Aufschlag als Differenz.
          </p>
        ) : null}
        <div className="ln-co-bemerkung">
          <label className="ln-co-wahl-label" htmlFor={`${wahlId}-bemerkung`}>
            Bemerkung <span className="tertiary">(steht im Druck unter der Tabelle)</span>
          </label>
          <Textfeld
            id={`${wahlId}-bemerkung`}
            value={n.bemerkung}
            onChange={(v) => updateNachweis(n.id, { bemerkung: v })}
            readOnly={abgeschlossen}
            placeholder={abgeschlossen ? 'Keine Bemerkung' : 'z. B. Abrechnung nach Aufwand gemäß Vertrag'}
          />
        </div>
      </Card>

      {bearbeitbar ? (
        <AbschliessenSchritt projekt={projekt} nachweis={n} bis={ende} onBis={setEndeWahl} ueberholt={ueberholt} navigate={navigate} />
      ) : null}

      {oeffnen ? (
        <ConfirmDialog
          titel="Leistungsnachweis wieder öffnen?"
          text={[oeffnenText + oeffnenRasterText, oeffnenBestaetigungen].filter(Boolean).join(' ')}
          bestaetigenLabel="Wieder öffnen"
          ton="blau"
          onConfirm={() => {
            nachweisOeffnen(n.id);
            toast('Leistungsnachweis wieder geöffnet – er zeigt die aktuellen Leistungen.');
          }}
          onClose={() => setOeffnen(false)}
        />
      ) : null}


      {nachreichen && nichtErfasst.length > 0 ? (
        <ConfirmDialog
          titel="Nicht erfasste Leistungen übernehmen?"
          text={`${anzahl(nichtErfasst.length, 'Leistung', 'Leistungen')} mit ${stundenText(stundenVon(nichtErfasst))} Std. aus bereits abgerechneten Zeiträumen ${
            nichtErfasst.length === 1 ? 'kommt' : 'kommen'
          } als nachgereicht in diesen Leistungsnachweis – mit ${nichtErfasst.length === 1 ? 'ihrem' : 'ihrem jeweiligen'} Datum als eigene Zeile. Die abgeschlossenen Leistungsnachweise bleiben unverändert.`}
          bestaetigenLabel="Übernehmen"
          ton="blau"
          onConfirm={() => {
            leistungenNachreichen(n.id);
            toast(`${anzahl(nichtErfasst.length, 'Leistung', 'Leistungen')} nachgereicht übernommen.`);
          }}
          onClose={() => setNachreichen(false)}
        />
      ) : null}

    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Schritt 3: Abschließen                                              */
/* ------------------------------------------------------------------ */

/** Beschriftung eines wählbaren Endes (`abschlussEnden`). */
function endeText(e: AbschlussEnde): string {
  if (e.art === 'monatsende') return `bis Ende ${monatText(e.bis)}`;
  if (e.art === 'heute') return `bis heute, ${langDatum(e.bis)}`;
  return `bis ${langDatum(e.bis)} (Ende des Leistungsnachweises)`;
}

/**
 * Schritt 3 auf der Seite eines offenen Leistungsnachweises: bis wann er
 * reicht – jedes Monatsende oder bis heute (`abschlussEnden`, vorgeschlagen
 * das letzte Monatsende, `abschlussVorschlag`), je mit Zeitraum, Leistungen
 * und Stunden –, was abgerechnet wird (gerechnet wie im Store,
 * `nachweisAbschliessenAnwenden`), dass spätere Leistungen im nächsten
 * Nachweis weiterlaufen, und wer noch nicht bestätigt hat
 * (`fehlendeBestaetigungen`) – dann nur mit „Trotzdem abschließen“.
 * „Abschließen und PDF“ schließt ab, öffnet den Druckdialog („Als PDF
 * sichern“) und zeigt den abgeschlossenen Nachweis. Ohne Entscheidung läuft
 * der Nachweis einfach weiter.
 */
function AbschliessenSchritt({
  projekt,
  nachweis: n,
  bis,
  onBis,
  ueberholt,
  navigate,
}: {
  projekt: Projekt;
  nachweis: Leistungsnachweis;
  /** Gewähltes Ende (`abschlussEnden`); null, wenn keines wählbar ist. */
  bis: string | null;
  onBis: (bis: string) => void;
  /** Von Hand bearbeitete Zeilen mit Neuem (`ueberholteZeilen`) – die Rückfrage nennt sie. */
  ueberholt: UeberholteZeile[];
  navigate: (r: Route) => void;
}) {
  const { data, nachweisAbschliessen } = useStore();
  const toast = useToast();
  const heute = today();
  const enden = abschlussEnden(n, heute);
  const [trotzdem, setTrotzdem] = useState(false);
  const leistungen = leistungenDesNachweises(data, n);

  if (!bis) {
    return (
      <Card>
        <SchrittKopf nr={3} titel="Abschließen" sub={`Der Leistungsnachweis beginnt am ${langDatum(n.von)} – abschließen lässt er sich ab dann.`} />
      </Card>
    );
  }

  const abschluss = abschlussZeitraum(data, n, heute, bis);
  const nachher = erstellenVorschau(data, n.id, bis);
  const zu = nachher.nachweise.find((x) => x.id === n.id);
  const summen = zu ? nachweisSummen(nachweisZeilen(nachher, zu)) : null;
  const darin = leistungen.filter((l) => l.datum <= abschluss.bis);
  const fehlend = fehlendeBestaetigungen(data, { ...n, bis: abschluss.bis });
  const gesperrt = darin.length === 0 || (fehlend.length > 0 && !trotzdem);
  // Endet der Nachweis mitten in einem Zeitraum der gemeinsamen Leistungstexte, bildet der Rest einen eigenen
  const restAb = erfassungsPeriodeVon(data, n.projektId, abschluss.bis).bis > abschluss.bis ? addDays(abschluss.bis, 1) : null;
  const hinweise = [
    restAb
      ? `Er endet mitten in einem Zeitraum der gemeinsamen Leistungstexte – für die Tage ab ${langDatum(restAb)} verfassen die Mitarbeiter einen eigenen Text.`
      : '',
    ueberholtRueckfrage(ueberholt) ?? '',
    erloschenHinweis(grenzFolgen(data, nachher), data.mitarbeiter) ?? '',
  ].filter(Boolean);

  const abschliessen = () => {
    // Das PDF zeigt den Stand, den der Store gleich festschreibt
    const fertig = nachher.nachweise.find((x) => x.id === n.id);
    nachweisAbschliessen(n.id, bis);
    if (fertig?.status === 'abgeschlossen') nachweisDrucken(nachher, fertig, projekt);
    toast(
      `Leistungsnachweis abgeschlossen – Leistungen bis ${langDatum(abschluss.bis)}${
        abschluss.spaetere.length
          ? `; ${anzahl(abschluss.spaetere.length, 'spätere Leistung läuft', 'spätere Leistungen laufen')} im nächsten weiter`
          : ''
      }. Im Druckdialog „Als PDF sichern“ wählen.`,
    );
    navigate({ view: 'abrechnung', projektId: n.projektId, nachweisId: n.id });
  };

  return (
    <Card>
      <SchrittKopf
        nr={3}
        titel="Abschließen und PDF"
        sub="Bis wann reicht der Leistungsnachweis? Was danach kommt, läuft im nächsten weiter – ohne Abschluss läuft dieser einfach weiter."
      />
      <div className="ln-co-abschluss">
        <fieldset className="ln-co-enden">
          <legend className="ln-co-wahl-label">Leistungen</legend>
          {enden.map((e) => {
            const bisDahin = leistungen.filter((l) => l.datum <= e.bis);
            return (
              <label key={e.bis} className="ln-co-ende">
                <input type="radio" name={`ln-co-ende-${n.id}`} checked={bis === e.bis} onChange={() => onBis(e.bis)} />
                <span className="ln-co-ende-text">
                  <strong>{endeText(e)}</strong>
                  <span className="small muted">
                    {zeitraumText(n.von, e.bis)} · {anzahl(bisDahin.length, 'Leistung', 'Leistungen')} · {stundenText(stundenVon(bisDahin))} Std.
                  </span>
                </span>
              </label>
            );
          })}
        </fieldset>
        <p className="muted" style={{ margin: 0 }}>
          {darin.length === 0
            ? 'Bis dahin gibt es keine Leistungen – es gibt nichts abzuschließen.'
            : `Abgerechnet werden ${stundenText(summen?.abgerechnet ?? 0)} Std.${
                summen?.aufschlag ? ` – erfasst ${stundenText(summen.erfasst)}, Aufschlag ${aufschlagText(summen.aufschlag)}.` : ''
              }${
                abschluss.spaetere.length
                  ? ` ${anzahl(abschluss.spaetere.length, 'spätere Leistung', 'spätere Leistungen')} (${stundenText(stundenVon(abschluss.spaetere))} Std.) ${
                      abschluss.spaetere.length === 1 ? 'läuft' : 'laufen'
                    } im nächsten Leistungsnachweis weiter.`
                  : ''
              }`}
        </p>
        {darin.length > 0 ? <FehlendeBestaetigungen fehlende={fehlend} /> : null}
        {darin.length > 0 && fehlend.length > 0 ? (
          <label className="checkbox">
            <input type="checkbox" checked={trotzdem} onChange={(e) => setTrotzdem(e.target.checked)} />
            Trotzdem abschließen – auch ohne alle Bestätigungen
          </label>
        ) : null}
        {hinweise.length ? <p className="small tertiary" style={{ margin: 0 }}>{hinweise.join(' ')}</p> : null}
        <div className="ln-co-abschluss-knopf">
          <button type="button" className="btn btn-primary" disabled={gesperrt} onClick={abschliessen}>
            <Icon name="check" size={14} /> Abschließen und PDF
          </button>
          <span className="small tertiary">
            Danach ist der Stand festgeschrieben, die gemeinsamen Leistungstexte der Zeiträume lassen sich nicht mehr ändern;
            „Wieder öffnen“ (im Kopf des abgeschlossenen) hebt den Abschluss auf.
          </span>
        </div>
      </div>
    </Card>
  );
}

/**
 * Stand nach dem Erstellen bis `bis` – wie der Store rechnet
 * (`nachweisAbschliessenAnwenden`), mit eigenen Kennungen für die Vorschau.
 */
function erstellenVorschau(daten: Parameters<typeof nachweisAbschliessenAnwenden>[0], id: ID, bis: string) {
  let nr = 0;
  return nachweisAbschliessenAnwenden(daten, id, new Date().toISOString(), () => `vorschau-${nr++}`, bis);
}

/** Nur der Satz zu erlöschenden Bestätigungen aus `grenzFolgenHinweis` – die Texte nennen die Rückfragen selbst. */
const erloschenHinweis = (f: ReturnType<typeof grenzFolgen>, mitarbeiter: Parameters<typeof grenzFolgenHinweis>[1]) =>
  grenzFolgenHinweis({ ...f, texte: 0, neueTeile: [] }, mitarbeiter);

/* ------------------------------------------------------------------ */
/* Eine Zeile der Abrechnung                                           */
/* ------------------------------------------------------------------ */

function ZeileAbrechnung({
  zeile: z,
  nachgereicht,
  positionen,
  spalten,
  lesen,
  leistungen,
  leistungenOffen,
  personName,
  abschnittKurz,
  text,
  onLeistungen,
  onAufschlag,
  onAbgerechnet,
}: {
  zeile: NachweisZeile;
  /** Zeile aus nachgereichten Leistungen (`NachweisZeile.nachgereicht`; in älteren Ständen: vor dem Zeitraum). */
  nachgereicht: boolean;
  positionen: Position[];
  spalten: boolean;
  /** Abgeschlossen: nur lesen. */
  lesen: boolean;
  leistungen: Leistung[];
  leistungenOffen: boolean;
  personName: (id: ID) => string;
  abschnittKurz: (id: ID | null) => string;
  /** Der Leistungstext der Zeile – bearbeitbar bzw. zum Lesen (Leistungstexte.tsx, `ZeilenText`). */
  text: ReactNode;
  onLeistungen: () => void;
  onAufschlag: (abschnittId: ID | null, stunden: number | null) => string | null;
  onAbgerechnet: (abschnittId: ID | null, stunden: number | null) => string | null;
}) {
  const datum = z.datumText.replace('\n', ' ');
  const zeilen = positionen.length + (spalten ? 1 : 0);
  const listeId = `ln-co-leistungen-${z.schluessel}`;

  const zellen = (p: Position) => {
    const ort = spalten ? `${datum}, ${p.kurz}` : datum;
    return (
      <>
        {spalten ? (
          <td className="ln-co-abschnitt" title={p.name}>
            {p.kurz}
          </td>
        ) : null}
        <td className="ln-stunden ln-co-erfasst" data-label="Erfasst">
          {stundenText(p.erfasst)}
        </td>
        <td className="ln-stunden ln-co-eingabe" data-label="Aufschlag">
          {lesen ? (
            <span className={p.wirksam ? 'ln-co-aufschlag' : 'tertiary'}>{aufschlagText(p.wirksam)}</span>
          ) : (
            <>
              <StundenFeld
                wert={p.eingabe}
                anzeige={aufschlagFeld}
                platzhalter="±0"
                label={`Aufschlag ${ort}`}
                onSetzen={(stunden) => onAufschlag(p.abschnittId, stunden)}
              />
              {runden(p.eingabe) !== runden(p.wirksam) ? (
                <span className="ln-co-wirkt" title="Der Aufschlag wirkt nur, soweit Stunden da sind – abgerechnet wird nie weniger als 0.">
                  wirkt {aufschlagText(p.wirksam)}
                </span>
              ) : null}
            </>
          )}
        </td>
        <td className="ln-stunden ln-co-eingabe" data-label="Abgerechnet">
          {lesen ? (
            <strong>{stundenText(p.abgerechnet)}</strong>
          ) : (
            <StundenFeld
              wert={p.abgerechnet}
              anzeige={stundenText}
              label={`Abgerechnet ${ort}`}
              klasse="ln-co-feld-abgerechnet"
              onSetzen={(stunden) => onAbgerechnet(p.abschnittId, stunden)}
            />
          )}
        </td>
      </>
    );
  };

  return (
    <tbody className={`ln-co-zeile ${z.aufschlag ? 'ln-co-zeile-aufschlag' : ''}`}>
      {positionen.map((p, i) => (
        <tr key={p.abschnittId ?? OHNE_ABSCHNITT} className={i === 0 ? 'ln-co-erste' : 'ln-co-weitere'}>
          {i === 0 ? (
            <>
              <td className="ln-co-datum" rowSpan={zeilen}>
                {z.datumText}
                {nachgereicht ? <div className="small tertiary">nachgereicht</div> : null}
              </td>
              <td className="ln-co-bearbeiter" rowSpan={zeilen}>
                {z.bearbeiter.map((b) => (
                  <span key={b}>{b}</span>
                ))}
              </td>
              <td className="ln-co-text" rowSpan={zeilen}>
                {text}
                <div className="ln-co-text-knoepfe">
                  <button
                    type="button"
                    className="ln-co-link"
                    aria-expanded={leistungenOffen}
                    aria-controls={leistungenOffen ? listeId : undefined}
                    onClick={onLeistungen}
                  >
                    <Icon name={leistungenOffen ? 'runter' : 'chevron'} size={11} /> Leistungen ({z.leistungIds.length})
                  </button>
                  {/* Beim Lesen (abgeschlossen): woher der Text stammt – beim Bearbeiten nennt es `ZeilenText` */}
                  {lesen && z.textBearbeitet ? (
                    <span className="small tertiary">Text von Hand bearbeitet</span>
                  ) : lesen && z.textGemeinsam ? (
                    <span title="Aus den Leistungstexten, die die Mitarbeiter je Zeitraum gemeinsam verfassen">
                      <Badge ton="blue">Text der Mitarbeiter</Badge>
                    </span>
                  ) : null}
                </div>
                {leistungenOffen ? (
                  <ul className="ln-co-leistungen" id={listeId}>
                    {leistungen.map((l) => (
                      <li key={l.id}>
                        <span className="ln-co-leistung-kopf">
                          {wochentag(l.datum)} {kurzDatum(l.datum)} · {personName(l.mitarbeiterId)} · {stundenText(l.stunden)} Std.
                          {spalten ? ` · ${abschnittKurz(l.abschnittId) || 'ohne'}` : ''}
                        </span>
                        <span className="ln-co-leistung-text">{l.text}</span>
                      </li>
                    ))}
                    {leistungen.length < z.leistungIds.length ? (
                      <li className="tertiary">
                        {anzahl(z.leistungIds.length - leistungen.length, 'Leistung wurde', 'Leistungen wurden')} seit dem Abschluss gelöscht.
                      </li>
                    ) : null}
                    <li className="small tertiary">Nur lesen – Leistungen ändert, wer sie erfasst hat.</li>
                  </ul>
                ) : null}
              </td>
            </>
          ) : null}
          {zellen(p)}
        </tr>
      ))}
      {spalten ? (
        <tr className="ln-co-zeilensumme">
          <td className="ln-co-abschnitt">Zeile</td>
          <td className="ln-stunden" data-label="Erfasst">
            {stundenText(z.stunden)}
          </td>
          <td className="ln-stunden" data-label="Aufschlag">
            <span className={z.aufschlag ? 'ln-co-aufschlag' : 'tertiary'}>{aufschlagText(z.aufschlag)}</span>
          </td>
          <td className="ln-stunden ln-co-abgerechnet" data-label="Abgerechnet">
            {stundenText(z.abgerechnet)}
          </td>
        </tr>
      ) : null}
    </tbody>
  );
}

/* ------------------------------------------------------------------ */
/* Löschen                                                             */
/* ------------------------------------------------------------------ */

/**
 * Vorschau eines Leistungsnachweises im `Modal` – das Druckblatt
 * (`nachweisHtml`) mit „Drucken / PDF“ (`nachweisDrucken`, Druckdialog des
 * Browsers, „Als PDF sichern“). Geöffnet über „Vorschau“ oben auf der Seite
 * eines Projekts (Projekt.tsx).
 */
export function NachweisVorschau({ projekt, nachweis: n, onClose }: { projekt: Projekt; nachweis: Leistungsnachweis; onClose: () => void }) {
  const { data } = useStore();
  return (
    <Modal
      titel="Vorschau"
      sub={nachweisFassung(data, n, projekt, 'abgerechnet').titel}
      wide
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Schließen
          </button>
          <button type="button" className="btn btn-primary" onClick={() => nachweisDrucken(data, n, projekt)}>
            <Icon name="plan" size={14} /> Drucken / PDF
          </button>
        </>
      }
    >
      <Druckblatt inhalt={nachweisHtml(data, n, projekt)} />
    </Modal>
  );
}

/**
 * „Nachweis löschen“ oben auf der Seite eines Projekts (Projekt.tsx): die
 * Rückfrage `NachweisLoeschen` mit den eigenen Leistungen des Nachweises (nur
 * sie lassen sich mitlöschen, domain/rechte.ts – dieselben, die
 * `deleteNachweis` löscht) und den Folgen für die gemeinsamen Texte und
 * Bestätigungen (`grenzFolgen`); danach zeigt die Seite den offenen Nachweis.
 */
export function NachweisLoeschenDialog({
  nachweis: n,
  navigate,
  onClose,
}: {
  nachweis: Leistungsnachweis;
  navigate: (r: Route) => void;
  onClose: () => void;
}) {
  const { data, deleteNachweis } = useStore();
  const toast = useToast();
  const imZeitraum = leistungenDesNachweises(data, n);
  const eigene = eigeneLeistungen(data, imZeitraum).length;
  // Fallen mit dem Nachweis Grenzen der Zeiträume weg, gehen Texte von Teilen im Text des ganzen Zeitraums auf;
  // dazu, wessen Bestätigungen erlöschen (`grenzFolgen`)
  const texteHinweis = grenzFolgenHinweis(
    grenzFolgen(data, { ...data, nachweise: data.nachweise.filter((x) => x.id !== n.id) }),
    data.mitarbeiter,
  );
  return (
    <NachweisLoeschen
      titel={nachweisTitel(n)}
      eigene={eigene}
      andere={imZeitraum.length - eigene}
      texteHinweis={texteHinweis}
      onClose={onClose}
      onLoeschen={(mitLeistungen) => {
        deleteNachweis(n.id, mitLeistungen);
        toast(
          mitLeistungen && eigene
            ? `Leistungsnachweis und ${anzahl(eigene, 'eigene Leistung', 'eigene Leistungen')} gelöscht.`
            : 'Leistungsnachweis gelöscht.',
        );
        navigate({ view: 'controllingProjekt', projektId: n.projektId });
      }}
    />
  );
}

function NachweisLoeschen({
  titel,
  eigene,
  andere,
  texteHinweis,
  onClose,
  onLoeschen,
}: {
  titel: string;
  /** Folgen für die gemeinsamen Texte und Bestätigungen (`grenzFolgenHinweis`). */
  texteHinweis: string | null;
  /** Zahl der eigenen Leistungen des Nachweises (`leistungenDesNachweises`, samt nachgereichten) – nur sie lassen sich mitlöschen. */
  eigene: number;
  /** Zahl der Leistungen anderer im Nachweis – sie bleiben immer erhalten. */
  andere: number;
  onClose: () => void;
  onLoeschen: (mitLeistungen: boolean) => void;
}) {
  const [mit, setMit] = useState(false);
  const bleiben = (mit ? 0 : eigene) + andere;
  return (
    <Modal
      titel="Leistungsnachweis löschen?"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Abbrechen
          </button>
          <button
            type="button"
            className="btn btn-primary"
            style={{ background: 'var(--red)' }}
            onClick={() => {
              onLoeschen(mit && eigene > 0);
              onClose();
            }}
          >
            Löschen
          </button>
        </>
      }
    >
      <div className="stack" style={{ gap: 12 }}>
        <p className="muted">„{titel}“ wird gelöscht.</p>
        {eigene > 0 ? (
          <label className="checkbox">
            <input type="checkbox" checked={mit} onChange={(e) => setMit(e.target.checked)} />
            Auch meine {anzahl(eigene, 'Leistung', 'Leistungen')} in diesem Leistungsnachweis endgültig löschen
          </label>
        ) : null}
        {bleiben > 0 ? (
          <p className="small tertiary">
            {andere > 0
              ? `${anzahl(andere, 'Leistung', 'Leistungen')} anderer Mitarbeiter ${andere === 1 ? 'bleibt' : 'bleiben'} erhalten – sie löscht auch das Controlling nicht. `
              : ''}
            {`${bleiben === 1 ? 'Die verbleibende Leistung liegt' : 'Die verbleibenden Leistungen liegen'} danach in keinem Leistungsnachweis.`}
          </p>
        ) : null}
        {texteHinweis ? <p className="small tertiary">{texteHinweis}</p> : null}
      </div>
    </Modal>
  );
}
