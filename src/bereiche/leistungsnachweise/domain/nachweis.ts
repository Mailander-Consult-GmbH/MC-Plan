/**
 * Leistungsnachweise aus den Leistungen eines Projekts. Ein Nachweis ist nur
 * ein Zeitraum; welche Leistungen er zeigt, ergibt sich aus deren Datum – nur
 * nachgereichte Leistungen (`nachgereicht`, aus früheren, schon abgerechneten
 * Zeiträumen) stehen ausdrücklich in einem späteren Nachweis, und eine
 * Leistung im festgeschriebenen Stand eines abgeschlossenen Nachweises bleibt
 * dort abgerechnet, auch wenn sich ihr Datum später ändert – kein anderer
 * Nachweis rechnet sie noch einmal ab (`leistungenDesNachweises`,
 * `nachweisDerLeistung`). Seine Zeilen – je Tag, Woche oder Monat mit Leistungen – werden
 * jedes Mal neu gerechnet (`nachweisZeilen`); nur von Hand bearbeitete Texte
 * (`texte`) und beim Abschluss der festgeschriebene Stand (`stand`) werden
 * gespeichert. Den Text einer Zeile ohne Bearbeitung von Hand liefern die
 * gemeinsamen Leistungstexte der Mitarbeiter (`Periodentext`,
 * `gemeinsamerZeilentext`), wo es keine gibt die Texte der Leistungen
 * (`automatikText`).
 *
 * Nachweise eines Projekts überschneiden sich nie (`ueberschneidung`). Einen
 * Abrechnungsrhythmus gibt es nicht (mehr, Fassung 9): Fehlt für Leistungen
 * ein Nachweis, verlängert `nachweiseErgaenzen` den laufenden (offenen) bis
 * zum Monatsende oder legt einen neuen an – der offene Nachweis wächst mit,
 * bis das Controlling ihn abschließt. Den Umfang gibt erst das Abschließen
 * vor: bis zu dem Ende, das das Controlling wählt – ein Monatsende oder heute
 * (`abschlussEnden`, Vorschlag `abschlussVorschlag`) –, sonst bis zum letzten
 * Tag mit Leistungen (`abschlussZeitraum`, `nachweisAbschliessenAnwenden`);
 * spätere Leistungen kommen in einen neuen offenen Nachweis. Wird am
 * Monatsende keiner abgeschlossen, läuft der offene einfach weiter.
 * „Neuer Leistungsnachweis“ im Controlling fragt keinen
 * Zeitraum ab: Er umfasst alle nicht abgerechneten Leistungen
 * (`nichtAbgerechnet`, `nachweisFuerNichtAbgerechnete`). Abgeschlossene
 * Nachweise wachsen nie.
 *
 * Aufschläge des Controllings ändern die erfassten Stunden nicht: je Zeile
 * und Abschnitt (`aufschlaege`, ± Stunden, `abrechnen`) und auf den ganzen
 * Nachweis (`gesamtAufschlag`, ± Stunden oder ± Prozent), den
 * `gesamtAufschlagVerteilen` anteilig auf die Zeilen verteilt. Jede Zeile
 * weist erfasst, Aufschlag und abgerechnet aus.
 *
 * Alle Funktionen sind rein; Kennungen liefert der Aufrufer.
 */
import { addDays, toISO } from '../../../shared/dates';
import {
  OHNE_ABSCHNITT,
  aufschlagSchluessel,
  mitarbeiterName,
  pruefsumme,
  type Abschnitt,
  type GesamtAufschlag,
  type ID,
  type ISODate,
  type Leistung,
  type Leistungsnachweis,
  type LeistungsnachweisDaten,
  type NachweisStand,
  type NachweisZeile,
  type Projekt,
  type Raster,
  type ZeilenText,
} from './types';
import {
  datumText,
  erfassungsPeriode,
  erfassungsPeriodeAusSchluessel,
  imZeitraum,
  istDatum,
  istWochenende,
  monatsanfang,
  monatsende,
  periodeKuerzen,
  periodeVon,
  runden,
  stundenText,
  zeitraumText,
  type Periode,
} from './zeitraum';

const nachDatum = (a: { datum: ISODate }, b: { datum: ISODate }) => (a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : 0);

/** Leistungen des Projekts im Zeitraum [von, bis], nach Datum sortiert. */
export function leistungenIm(daten: LeistungsnachweisDaten, projektId: ID, von: ISODate, bis: ISODate): Leistung[] {
  return daten.leistungen.filter((l) => l.projektId === projektId && imZeitraum(l.datum, von, bis)).sort(nachDatum);
}

/** Nachweis des Projekts, dessen Zeitraum das Datum enthält. */
export function nachweisFuer(daten: LeistungsnachweisDaten, projektId: ID, datum: ISODate): Leistungsnachweis | undefined {
  return daten.nachweise.find((n) => n.projektId === projektId && imZeitraum(datum, n.von, n.bis));
}

/** Kennungen im festgeschriebenen Stand eines abgeschlossenen Nachweises (ohne Stand bzw. ältere Stände ohne Kennungen: leer). */
const standKennungen = (n: Leistungsnachweis): ID[] =>
  n.status === 'abgeschlossen' && n.stand ? n.stand.zeilen.flatMap((z) => z.leistungIds) : [];

/** Verzeichnis je Projekt und Leistung: abgerechnet in (Stand) bzw. nachgereicht in – jeweils der erste Nachweis der Liste. */
interface Verzeichnis {
  abgerechnet: Map<string, Leistungsnachweis>;
  nachgereicht: Map<string, Leistungsnachweis>;
}

const verzeichnisSchluessel = (projektId: ID, leistungId: ID) => `${projektId}\u0000${leistungId}`;

/*
 * Je Liste der Nachweise einmal aufgebaut: Der Bestand wird nie an Ort und
 * Stelle geändert (jede Änderung liefert eine neue Liste), so bleibt das
 * Verzeichnis gültig, solange es die Liste gibt. Ohne es würde jede Abfrage
 * alle Stände durchsuchen – in Schleifen über alle Leistungen quadratisch.
 */
const verzeichnisse = new WeakMap<Leistungsnachweis[], Verzeichnis>();

function verzeichnis(nachweise: Leistungsnachweis[]): Verzeichnis {
  const vorhanden = verzeichnisse.get(nachweise);
  if (vorhanden) return vorhanden;
  const v: Verzeichnis = { abgerechnet: new Map(), nachgereicht: new Map() };
  for (const n of nachweise) {
    for (const id of standKennungen(n)) {
      const k = verzeichnisSchluessel(n.projektId, id);
      if (!v.abgerechnet.has(k)) v.abgerechnet.set(k, n);
    }
    for (const id of n.nachgereicht) {
      const k = verzeichnisSchluessel(n.projektId, id);
      if (!v.nachgereicht.has(k)) v.nachgereicht.set(k, n);
    }
  }
  verzeichnisse.set(nachweise, v);
  return v;
}

/** Abgeschlossener Nachweis, in dessen festgeschriebenem Stand die Leistung abgerechnet ist. */
export function abgerechnetIn(
  daten: Pick<LeistungsnachweisDaten, 'nachweise'>,
  l: Pick<Leistung, 'id' | 'projektId'>,
): Leistungsnachweis | undefined {
  return verzeichnis(daten.nachweise).abgerechnet.get(verzeichnisSchluessel(l.projektId, l.id));
}

/** Nachweis, in den die Leistung nachgereicht wurde. */
export function nachgereichtIn(
  daten: Pick<LeistungsnachweisDaten, 'nachweise'>,
  l: Pick<Leistung, 'id' | 'projektId'>,
): Leistungsnachweis | undefined {
  return verzeichnis(daten.nachweise).nachgereicht.get(verzeichnisSchluessel(l.projektId, l.id));
}

/**
 * Nachweis, in den die Leistung nachgereicht wurde, sonst der, in dessen
 * festgeschriebenem Stand sie abgerechnet ist (auch nach einer
 * Datumsänderung), sonst der ihres Datums – wie `leistungenDesNachweises`.
 */
export function nachweisDerLeistung(
  daten: LeistungsnachweisDaten,
  l: Pick<Leistung, 'id' | 'projektId' | 'datum'>,
): Leistungsnachweis | undefined {
  return (
    nachgereichtIn(daten, l) ??
    abgerechnetIn(daten, l) ??
    nachweisFuer(daten, l.projektId, l.datum)
  );
}

/**
 * Leistungen eines Nachweises, nach Datum: die seines Zeitraums – ohne die in
 * einen anderen Nachweis nachgereichten und ohne die im festgeschriebenen
 * Stand eines anderen, abgeschlossenen Nachweises (sie sind dort abgerechnet,
 * etwa nach einer späteren Datumsänderung oder einem Import, der sie ersetzt
 * hat; erst „Wieder öffnen“ dort gibt sie frei) – und seine nachgereichten.
 * Der eigene Stand zählt nicht: So zeigt ein abgeschlossener Nachweis live,
 * was „Wieder öffnen“ ergäbe (`standVeraltet`).
 */
export function leistungenDesNachweises(daten: LeistungsnachweisDaten, n: Leistungsnachweis): Leistung[] {
  const eigene = new Set(n.nachgereicht);
  const andere = daten.nachweise.filter((x) => x.projektId === n.projektId && x.id !== n.id);
  const anderswo = new Set([...andere.flatMap((x) => x.nachgereicht), ...andere.flatMap(standKennungen)]);
  return daten.leistungen
    .filter(
      (l) =>
        l.projektId === n.projektId &&
        (eigene.has(l.id) || (imZeitraum(l.datum, n.von, n.bis) && !anderswo.has(l.id))),
    )
    .sort(nachDatum);
}

/** Leistungen des Projekts (ohne `projektId`: aller Projekte), die in keinem Nachweis liegen. */
export function leistungenOhneNachweis(daten: LeistungsnachweisDaten, projektId?: ID): Leistung[] {
  return daten.leistungen.filter(
    (l) => (projektId === undefined || l.projektId === projektId) && !nachweisDerLeistung(daten, l),
  );
}

/** Nachweise des Projekts nach `von` sortiert. */
export function nachweiseVon(daten: LeistungsnachweisDaten, projektId: ID): Leistungsnachweis[] {
  return daten.nachweise
    .filter((n) => n.projektId === projektId)
    .sort((a, b) => (a.von < b.von ? -1 : a.von > b.von ? 1 : 0));
}

/** Anderer Nachweis desselben Projekts, mit dem sich [von, bis] überschneidet (ohne `ohneId`). */
export function ueberschneidung(
  daten: Pick<LeistungsnachweisDaten, 'nachweise'>,
  projektId: ID,
  von: ISODate,
  bis: ISODate,
  ohneId?: ID,
): Leistungsnachweis | undefined {
  return daten.nachweise.find((n) => n.projektId === projektId && n.id !== ohneId && n.von <= bis && von <= n.bis);
}

/* ------------------------------------------------------------------ */
/* Leistungstexte                                                      */
/* ------------------------------------------------------------------ */

/** Vergleichsform eines Textteils: ohne Rücksicht auf Groß-/Kleinschreibung und Leerraum. */
export function textSchluessel(text: string): string {
  return text.toLowerCase().replace(/\s+/g, '');
}

/** Platzhalter für ein Dezimalkomma beim Zerlegen. */
const DEZIMALKOMMA = '\u0000';

/**
 * Teile eines Leistungstexts: an „,“ und „;“ zerlegt, ohne leere Teile;
 * Zeilenumbrüche bleiben. Ein Komma zwischen zwei Ziffern trennt nicht – es
 * ist ein Dezimalkomma („km 12,5“, „45,300 bis 45,800“).
 */
export function textTeile(text: string): string[] {
  // Dezimalkommas vorübergehend verdecken (ohne Lookbehind, damit auch ältere Browser den Code laden)
  return text
    .replace(/(\d),(?=\d)/g, `$1${DEZIMALKOMMA}`)
    .split(/[,;]/)
    .map((t) => t.split(DEZIMALKOMMA).join(',').trim())
    .filter(Boolean);
}

/** Teile der Leistungen in zeitlicher Reihenfolge, Dubletten entfernt. */
function teileVon(leistungen: Leistung[]): string[] {
  const gesehen = new Set<string>();
  const teile: string[] = [];
  for (const l of [...leistungen].sort(nachDatum)) {
    for (const teil of textTeile(l.text)) {
      const k = textSchluessel(teil);
      if (gesehen.has(k)) continue;
      gesehen.add(k);
      teile.push(teil);
    }
  }
  return teile;
}

/**
 * Automatischer Leistungstext einer Zeile: die Texte der Leistungen in zeitlicher Reihenfolge,
 * an „,“ und „;“ in Teile zerlegt (nicht an Dezimalkommas, `textTeile`), Dubletten (ohne
 * Rücksicht auf Groß-/Kleinschreibung und Leerraum) entfernt, mit „, “ verbunden.
 * Zeilenumbrüche im Text bleiben erhalten.
 */
export function automatikText(leistungen: Leistung[]): string {
  return teileVon(leistungen).join(', ');
}

/** Kommt der Teil im Text vor – als ganze Wörter, ohne Rücksicht auf Groß-/Kleinschreibung und Leerraum? */
function kommtVor(text: string, teil: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
  const t = norm(teil);
  if (!t) return true;
  const muster = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^\\p{L}\\p{N}])${muster}($|[^\\p{L}\\p{N}])`, 'u').test(norm(text));
}

/** Text um die automatischen Teile neuer Leistungen ergänzen, die noch nicht im Text vorkommen. */
export function textErgaenzen(text: string, neue: Leistung[]): string {
  const fehlend = teileVon(neue).filter((teil) => !kommtVor(text, teil));
  if (fehlend.length === 0) return text;
  const basis = text.replace(/\s+$/, '');
  return basis ? `${basis}, ${fehlend.join(', ')}` : fehlend.join(', ');
}

/**
 * Sätze eines Texts: getrennt nach „.“, „!“ bzw. „?“ mit folgendem Leerraum
 * und an Zeilenumbrüchen; das Satzzeichen bleibt am Satz. Punkte in Zahlen
 * („26.10.“, „1.5“) trennen nicht, Abkürzungen („z. B.“) schon – mit einem
 * Leerzeichen verbunden ergeben die Stücke wieder den Text.
 */
function saetze(text: string): string[] {
  const liste: string[] = [];
  const ende = /[.!?]+(?=\s|$)|\n/g;
  let start = 0;
  for (let m = ende.exec(text); m; m = ende.exec(text)) {
    const satz = text.slice(start, m.index + m[0].length).trim();
    if (satz) liste.push(satz);
    start = m.index + m[0].length;
  }
  const rest = text.slice(start).trim();
  if (rest) liste.push(rest);
  return liste;
}

/** Ohne Satzzeichen am Ende – zum Vergleich mit `kommtVor`. */
const ohneSchlusszeichen = (t: string) => t.replace(/[\s.!?:;,]+$/, '');

/**
 * Texte mehrerer Zeiträume zu einem verbinden – in der angegebenen Folge, ohne
 * Wiederholungen: Der erste steht unverändert vorn. Kommt von einem weiteren
 * nichts schon vor, wird er unverändert angehängt (ein Fließtext behält so
 * seine Zeichensetzung); sonst Satz für Satz (`saetze`) nur, was noch fehlt –
 * ein Satz, der schon vorkommt, gar nicht, von einem Satz, der teilweise
 * vorkommt, nur die fehlenden Teile (an „,“ und „;“ zerlegt, `textTeile`, wie
 * `textErgaenzen`). Angehängt wird mit „, “, nach einem Satzzeichen am Ende
 * mit einem Leerzeichen. Leere Texte zählen nicht.
 */
export function texteZusammenfuehren(texte: string[]): string {
  let ergebnis = '';
  const anhaengen = (stueck: string) => {
    ergebnis = `${ergebnis}${/[.!?;:]$/.test(ergebnis) ? ' ' : ', '}${stueck}`;
  };
  const vorhanden = (teil: string) => kommtVor(ergebnis, ohneSchlusszeichen(teil));
  for (const roh of texte) {
    const text = roh.trim();
    if (!text) continue;
    if (!ergebnis) {
      ergebnis = text;
      continue;
    }
    const liste = saetze(text);
    if (!liste.some((satz) => vorhanden(satz) || textTeile(satz).some(vorhanden))) {
      anhaengen(text);
      continue;
    }
    for (const satz of liste) {
      if (vorhanden(satz)) continue;
      const teile = textTeile(satz);
      const fehlend = teile.filter((teil) => !vorhanden(teil));
      if (fehlend.length > 0) anhaengen(fehlend.length === teile.length ? satz : fehlend.join(', '));
    }
  }
  return ergebnis;
}

/**
 * Teile eines Texts in der Vergleichsform: Satz für Satz (`saetze`) an „,“
 * und „;“ zerlegt (`textTeile`), ohne Satzzeichen am Ende, ohne Rücksicht auf
 * Groß-/Kleinschreibung und Leerraum (`textSchluessel`).
 */
const vergleichsTeile = (text: string): string[] =>
  saetze(text)
    .flatMap(textTeile)
    .map((teil) => textSchluessel(ohneSchlusszeichen(teil)))
    .filter(Boolean);

/**
 * Bringt `text` dem Inhalt nach nichts mit, was nicht schon in einem der
 * Texte `bekannt` steht? Verglichen werden Sätze bzw. ihre Teile
 * (`vergleichsTeile`) – die Reihenfolge zählt nicht, ein Satz, der nur in
 * einem längeren vorkommt, aber als neuer Teil.
 */
export function nurBekannteTeile(text: string, bekannt: string[]): boolean {
  const teile = new Set(bekannt.flatMap(vergleichsTeile));
  return vergleichsTeile(text).every((teil) => teile.has(teil));
}

/**
 * Ein Text in Stücken je Satz (wie `saetze`), jedes samt dem Leerraum davor –
 * aneinandergehängt ergeben sie wieder den Text. `schluessel` ist die
 * Vergleichsform des Satzes (ohne Satzzeichen am Ende, `textSchluessel`); null
 * bei einem Stück nur aus Leerraum (etwa einer Leerzeile).
 */
function satzStuecke(text: string): { roh: string; schluessel: string | null }[] {
  const stuecke: string[] = [];
  const ende = /[.!?]+(?=\s|$)|\n/g;
  let start = 0;
  for (let m = ende.exec(text); m; m = ende.exec(text)) {
    stuecke.push(text.slice(start, m.index + m[0].length));
    start = m.index + m[0].length;
  }
  if (start < text.length) stuecke.push(text.slice(start));
  return stuecke.map((roh) => {
    const satz = textSchluessel(ohneSchlusszeichen(roh.trim()));
    return { roh, schluessel: satz || null };
  });
}

/**
 * Dreiseitiges Zusammenführen eines Entwurfs, wenn jemand anderes den Text
 * inzwischen gespeichert hat: `basis` ist der gespeicherte Text, von dem der
 * Entwurf ausging, `gespeichert` der heutige. Ist der Entwurf (bis auf
 * Leerraum am Rand) die Basis, bleibt der gespeicherte Text; hat niemand
 * anderes geändert, gilt der Entwurf. Sonst wird Satz für Satz
 * (`satzStuecke`) zusammengeführt: Sätze der Basis, die der Entwurf gestrichen
 * hat, fallen auch aus dem gespeicherten Text, und von den Sätzen des
 * Entwurfs kommen nur die eigenen Ergänzungen (nicht in der Basis) hinzu – an
 * den gespeicherten Text angehängt, ohne Wiederholungen
 * (`texteZusammenfuehren`). So kehrt nichts zurück, was der andere gelöscht
 * hat, und von beiden geänderte Sätze bleiben in beiden Fassungen stehen.
 */
export function texteDreiseitig(basis: string, gespeichert: string, entwurf: string): string {
  if (entwurf.trim() === basis.trim()) return gespeichert.trim();
  if (gespeichert.trim() === basis.trim()) return entwurf.trim();
  const ausBasis = new Set(satzStuecke(basis).flatMap((s) => (s.schluessel ? [s.schluessel] : [])));
  const entwurfStuecke = satzStuecke(entwurf);
  const imEntwurf = new Set(entwurfStuecke.flatMap((s) => (s.schluessel ? [s.schluessel] : [])));
  // Selbst gestrichen: in der Basis, nicht mehr im Entwurf
  const gestrichen = (s: { schluessel: string | null }) => !!s.schluessel && ausBasis.has(s.schluessel) && !imEntwurf.has(s.schluessel);
  const bleibt = satzStuecke(gespeichert)
    .filter((s) => !gestrichen(s))
    .map((s) => s.roh)
    .join('')
    .trim();
  const ergaenzt = entwurfStuecke
    .filter((s) => !!s.schluessel && !ausBasis.has(s.schluessel))
    .map((s) => s.roh)
    .join('')
    .trim();
  return texteZusammenfuehren([bleibt, ergaenzt]);
}

/**
 * Gemeinsame Leistungstexte eines Projekts (`Periodentext`) je Schlüssel der
 * Erfassungsperiode – nur nicht leere.
 */
export function periodentexteVon(daten: Pick<LeistungsnachweisDaten, 'periodentexte'>, projektId: ID): Map<string, string> {
  const texte = new Map<string, string>();
  for (const t of daten.periodentexte ?? []) {
    if (t.projektId === projektId && t.text.trim() && !texte.has(t.schluessel)) texte.set(t.schluessel, t.text);
  }
  return texte;
}

/**
 * Wie die gemeinsamen Leistungstexte eines Projekts gegliedert sind
 * (`erfassungsGliederung`, `erfassungsPeriodeIn`): Erfassungsperioden im
 * Raster des Projekts, je Monat, an den Grenzen der Nachweise geteilt – und in
 * abgeschlossenen Nachweisen im Raster ihres Abschlusses.
 */
export interface ErfassungsGliederung {
  /** Raster des Projekts (`Projekt.raster`). */
  raster: Raster;
  /**
   * Tage, an denen eine Erfassungsperiode zusätzlich neu beginnt
   * (`erfassungsPeriode`): Beginn und Tag nach dem Ende jedes Nachweises des
   * Projekts, aufsteigend.
   */
  schnitte: ISODate[];
  /**
   * Abgeschlossene Nachweise mit dem Raster des Projekts bei ihrem Abschluss
   * (`NachweisStand.erfassungsRaster`) – an ihren Tagen gilt dieses Raster.
   */
  abgeschlossen: { von: ISODate; bis: ISODate; raster: Raster }[];
}

/*
 * Gliederung je Liste der Nachweise und Projekt – wie das Verzeichnis oben
 * einmal je Liste aufgebaut (neu, wenn sich das Raster des Projekts ändert).
 */
const gliederungen = new WeakMap<Leistungsnachweis[], Map<ID, ErfassungsGliederung>>();

/**
 * Gliederung der gemeinsamen Leistungstexte eines Projekts. Geteilt wird an
 * den Grenzen **aller** Nachweise (Beginn und Tag nach dem Ende), so liegt
 * jede Erfassungsperiode in höchstens einem Nachweis: Ihr Text gehört genau
 * einer Zeile, kein anderer Nachweis übernimmt ihn. Endet ein Nachweis mitten
 * in einem Zeitraum (etwa beim Abschluss oder nach „Zeitraum ändern“), bekommt
 * der Rest einen eigenen Text; abgeschlossen ist so nur der abgerechnete Teil
 * gesperrt. „Wieder öffnen“ ändert die Grenzen nicht – die Texte bleiben bei
 * ihren Teilen. Fallen Grenzen weg oder kommen hinzu, ziehen
 * `periodentexteNachziehen` (domain/erfassung.ts) die Texte nach. Abgeschlossene
 * Nachweise gliedern ihre Tage im Raster ihres Abschlusses – ein späterer
 * Rasterwechsel des Projekts ändert weder ihren Stand noch, wie ihre Zeiträume
 * im Bereich erscheinen.
 */
export function erfassungsGliederung(daten: Pick<LeistungsnachweisDaten, 'nachweise' | 'projekte'>, projektId: ID): ErfassungsGliederung {
  const raster = daten.projekte.find((p) => p.id === projektId)?.raster ?? 'monat';
  let jeProjekt = gliederungen.get(daten.nachweise);
  if (!jeProjekt) {
    jeProjekt = new Map();
    gliederungen.set(daten.nachweise, jeProjekt);
  }
  const vorhanden = jeProjekt.get(projektId);
  if (vorhanden && vorhanden.raster === raster) return vorhanden;
  const schnitte = new Set<ISODate>();
  const abgeschlossen: ErfassungsGliederung['abgeschlossen'] = [];
  for (const n of daten.nachweise) {
    if (n.projektId !== projektId) continue;
    schnitte.add(n.von);
    schnitte.add(addDays(n.bis, 1));
    const r = n.status === 'abgeschlossen' ? n.stand?.erfassungsRaster : undefined;
    if (r) abgeschlossen.push({ von: n.von, bis: n.bis, raster: r });
  }
  abgeschlossen.sort((a, b) => (a.von < b.von ? -1 : a.von > b.von ? 1 : 0));
  const g: ErfassungsGliederung = { raster, schnitte: [...schnitte].filter(istDatum).sort(), abgeschlossen };
  jeProjekt.set(projektId, g);
  return g;
}

/** Raster, in dem die gemeinsamen Texte am Tag gegliedert sind: das eines abgeschlossenen Nachweises, der ihn umfasst, sonst das des Projekts. */
export function erfassungsRasterAm(g: ErfassungsGliederung, datum: ISODate): Raster {
  return g.abgeschlossen.find((b) => imZeitraum(datum, b.von, b.bis))?.raster ?? g.raster;
}

/** Erfassungsperiode eines Tags in der Gliederung des Projekts (`erfassungsPeriode`) – mit ihrem Raster. */
export function erfassungsPeriodeIn(g: ErfassungsGliederung, datum: ISODate): Periode & { raster: Raster } {
  const raster = erfassungsRasterAm(g, datum);
  return { ...erfassungsPeriode(datum, raster, g.schnitte), raster };
}

/** Gliedern zwei Gliederungen gleich? (gleiches Raster, gleiche Schnitte, gleiche abgeschlossene Raster) */
export function gleicheGliederung(a: ErfassungsGliederung, b: ErfassungsGliederung): boolean {
  return (
    a === b ||
    (a.raster === b.raster &&
      a.schnitte.length === b.schnitte.length &&
      a.schnitte.every((s, i) => s === b.schnitte[i]) &&
      a.abgeschlossen.length === b.abgeschlossen.length &&
      a.abgeschlossen.every((x, i) => x.von === b.abgeschlossen[i].von && x.bis === b.abgeschlossen[i].bis && x.raster === b.abgeschlossen[i].raster))
  );
}

/**
 * Abgeschlossener Nachweis des Projekts, dessen Zeitraum [von, bis] berührt
 * (ohne `ohneId`) – er sperrt eine Erfassungsperiode in diesem Zeitraum: Ihr
 * gemeinsamer Text ist abgerechnet.
 */
export function abgeschlossenIm(
  daten: Pick<LeistungsnachweisDaten, 'nachweise'>,
  projektId: ID,
  von: ISODate,
  bis: ISODate,
  ohneId?: ID,
): Leistungsnachweis | undefined {
  return daten.nachweise.find(
    (n) => n.projektId === projektId && n.status === 'abgeschlossen' && n.id !== ohneId && n.von <= bis && von <= n.bis,
  );
}

/**
 * Leistungstext einer Zeile aus den gemeinsamen Texten der Mitarbeiter: Die
 * Leistungen der Zeile werden nach ihrer Erfassungsperiode gruppiert
 * (`erfassungsPeriodeIn` – im Raster des Projekts bzw. eines abgeschlossenen
 * Nachweises das seines Abschlusses, je Monat, an den Grenzen der Nachweise
 * geteilt); je Periode in zeitlicher Folge zählt der gemeinsame Text, wo
 * keiner steht bzw. keiner gelten kann `automatikText` ihrer Leistungen –
 * verbunden mit `texteZusammenfuehren`. Ein gemeinsamer Text gilt nicht
 * * für nachgereichte Zeilen (ihre Leistungen liegen in schon abgerechneten
 *   Zeiträumen; der Text dort beschreibt die abgerechneten Leistungen),
 * * für eine Periode, die ein anderer abgeschlossener Nachweis sperrt
 *   (`abgeschlossenIm`) – sein Text ist dort abgerechnet,
 * * wenn die Zeile nur einen Teil der Periode abdeckt (Nachweis feiner
 *   gegliedert als das Projekt, etwa Wochenzeilen bei Monatstexten) – sonst
 *   stünde der ganze Text in jeder Zeile.
 * null, wenn kein gemeinsamer Text gilt (dann `automatikText` der Zeile).
 */
function gemeinsamerZeilentext(
  daten: LeistungsnachweisDaten,
  n: Leistungsnachweis,
  zeile: { von: ISODate; bis: ISODate; nachgereicht: boolean; leistungen: Leistung[] },
  texte: Map<string, string>,
  gliederung: ErfassungsGliederung,
): string | null {
  if (texte.size === 0 || zeile.leistungen.length === 0 || zeile.nachgereicht) return null;
  const gruppen = new Map<string, { von: ISODate; bis: ISODate; leistungen: Leistung[] }>();
  for (const l of zeile.leistungen) {
    const p = erfassungsPeriodeIn(gliederung, l.datum);
    const g = gruppen.get(p.schluessel);
    if (g) g.leistungen.push(l);
    else gruppen.set(p.schluessel, { von: p.von, bis: p.bis, leistungen: [l] });
  }
  let gemeinsam = false;
  const folge = [...gruppen.entries()]
    .sort(([, a], [, b]) => (a.von < b.von ? -1 : a.von > b.von ? 1 : 0))
    .map(([k, g]) => {
      const text = texte.get(k);
      // Teil der Periode im Zeitraum des Nachweises – er muss ganz in der Zeile liegen
      const von = g.von > n.von ? g.von : n.von;
      const bis = g.bis < n.bis ? g.bis : n.bis;
      const gilt =
        text !== undefined && von >= zeile.von && bis <= zeile.bis && !abgeschlossenIm(daten, n.projektId, g.von, g.bis, n.id);
      if (!gilt) return automatikText(g.leistungen);
      gemeinsam = true;
      return text;
    });
  return gemeinsam ? texteZusammenfuehren(folge) : null;
}

/* ------------------------------------------------------------------ */
/* Zeilen                                                              */
/* ------------------------------------------------------------------ */

const addieren = (ziel: Record<string, number>, schluessel: string, stunden: number) => {
  ziel[schluessel] = (ziel[schluessel] ?? 0) + stunden;
};

const gerundet = (werte: Record<string, number>) =>
  Object.fromEntries(Object.entries(werte).map(([k, v]) => [k, runden(v)]));

/** Spalte einer Leistung in `stundenJeAbschnitt`: ihr Abschnitt, wenn es ihn im Projekt gibt, sonst „ohne“. */
const spalteDerLeistung = (l: Pick<Leistung, 'abschnittId'>, abschnittIds: Set<ID>): string =>
  l.abschnittId && abschnittIds.has(l.abschnittId) ? l.abschnittId : OHNE_ABSCHNITT;

/** Summen je Schlüssel über Zeilen (etwa `stundenJeAbschnitt`). */
const summeJe = (werte: Record<string, number>[]): Record<string, number> => {
  const summe: Record<string, number> = {};
  for (const w of werte) for (const [k, v] of Object.entries(w)) addieren(summe, k, v);
  return gerundet(summe);
};

/* ------------------------------------------------------------------ */
/* Aufschläge                                                          */
/* ------------------------------------------------------------------ */

/** Ab so vielen Abschnitten weist ein Nachweis die Stunden je Abschnitt in eigenen Spalten aus (wie die Vorlage Woche.xlsx). */
export const ABSCHNITTSSPALTEN_AB = 2;

/**
 * Zeigt ein Nachweis die Stunden je Abschnitt in eigenen Spalten? Erst ab zwei
 * Abschnitten; mit einem oder keinem steht nur eine Stundenspalte da (wie die
 * Vorlage Monat.xlsx). Danach richten sich auch die Aufschläge: mit Spalten je
 * Abschnitt (und „ohne“), sonst einer je Zeile (`abschnittId` null).
 */
export function mitAbschnittsspalten(abschnitte: Pick<Abschnitt, 'id'>[]): boolean {
  return abschnitte.length >= ABSCHNITTSSPALTEN_AB;
}

/** Meldung bei einer Aufschlags-Eingabe, die keine Zahl ist (wörtlich). */
export const AUFSCHLAG_KEINE_ZAHL = 'Bitte eine Zahl angeben, z. B. 1,5 oder -0,5.';
/** Meldung, wenn ein Aufschlag die abgerechneten Stunden unter 0 drückte (wörtlich). */
export const AUFSCHLAG_UNTER_NULL = 'Abgerechnet kann nicht unter 0 Std. liegen.';

/**
 * Aufschläge einer Zeile, die wirken: Schlüssel ist der Abschnitt
 * (`OHNE_ABSCHNITT` für „ohne“ bzw. die ganze Zeile). Mit Abschnittsspalten
 * zählen die Abschnitte des Projekts und „ohne“, sonst nur „ohne“; alle
 * anderen bleiben stehen, wirken aber nicht.
 */
function aufschlaegeDerZeile(
  aufschlaege: Record<string, number>,
  zeilenSchluessel: string,
  abschnittIds: Set<ID>,
  spalten: boolean,
): Record<string, number> {
  const praefix = `${zeilenSchluessel}|`;
  const ergebnis: Record<string, number> = {};
  for (const [k, wert] of Object.entries(aufschlaege)) {
    if (!k.startsWith(praefix) || !Number.isFinite(wert) || wert === 0) continue;
    const abschnitt = k.slice(praefix.length);
    if (abschnitt === OHNE_ABSCHNITT || (spalten && abschnittIds.has(abschnitt))) ergebnis[abschnitt] = wert;
  }
  return ergebnis;
}

/** Ergebnis von `abrechnen`. */
interface Abrechnung {
  aufschlag: number;
  aufschlagJeAbschnitt: Record<string, number>;
  abgerechnet: number;
  abgerechnetJeAbschnitt: Record<string, number>;
  /** Summe nach den Aufschlägen der Abschnitte, vor dem der ganzen Zeile („ohne“). */
  vorZeile: number;
}

/**
 * Abgerechnete Stunden einer Zeile aus den erfassten je Abschnitt und den
 * Aufschlägen: Ein Aufschlag auf einen Abschnitt wirkt in dessen Spalte (nie
 * unter 0). Der Aufschlag „ohne“ gilt der ganzen Zeile: Mehr Stunden kommen
 * in die Spalte „ohne“, weniger mindern zuerst „ohne“, dann die übrigen
 * Abschnitte der Reihe nach – so ist `abgerechnet` stets die Summe der
 * Spalten und nie unter 0.
 */
function abrechnen(stundenJeAbschnitt: Record<string, number>, eingaben: Record<string, number>): Abrechnung {
  const werte: Record<string, number> = { ...stundenJeAbschnitt };
  for (const [k, v] of Object.entries(eingaben)) {
    if (k === OHNE_ABSCHNITT) continue;
    werte[k] = Math.max(0, runden((werte[k] ?? 0) + v));
  }
  const vorZeile = runden(Object.values(werte).reduce((s, v) => s + v, 0));
  const zeile = eingaben[OHNE_ABSCHNITT] ?? 0;
  if (zeile > 0) werte[OHNE_ABSCHNITT] = runden((werte[OHNE_ABSCHNITT] ?? 0) + zeile);
  else if (zeile < 0) {
    let rest = -zeile;
    const reihenfolge = [OHNE_ABSCHNITT, ...Object.keys(werte).filter((k) => k !== OHNE_ABSCHNITT)];
    for (const k of reihenfolge) {
      if (rest <= 0) break;
      const vorhanden = werte[k] ?? 0;
      if (vorhanden <= 0) continue;
      const weg = Math.min(vorhanden, rest);
      werte[k] = runden(vorhanden - weg);
      rest = runden(rest - weg);
    }
  }
  const abgerechnetJeAbschnitt: Record<string, number> = {};
  const aufschlagJeAbschnitt: Record<string, number> = {};
  for (const [k, v] of Object.entries(werte)) {
    const erfasst = stundenJeAbschnitt[k];
    if (erfasst !== undefined || v !== 0) abgerechnetJeAbschnitt[k] = runden(v);
    const differenz = runden(v - (erfasst ?? 0));
    if (differenz !== 0) aufschlagJeAbschnitt[k] = differenz;
  }
  const abgerechnet = runden(Object.values(abgerechnetJeAbschnitt).reduce((s, v) => s + v, 0));
  const erfasst = runden(Object.values(stundenJeAbschnitt).reduce((s, v) => s + v, 0));
  return { aufschlag: runden(abgerechnet - erfasst), aufschlagJeAbschnitt, abgerechnet, abgerechnetJeAbschnitt, vorZeile };
}

/** Eingegebener Aufschlag einer Zeile und eines Abschnitts (null = ganze Zeile bzw. „ohne“) – für das Eingabefeld. */
export function aufschlagEingabe(n: Pick<Leistungsnachweis, 'aufschlaege'>, zeilenSchluessel: string, abschnittId: ID | null): number {
  return n.aufschlaege[aufschlagSchluessel(zeilenSchluessel, abschnittId)] ?? 0;
}

/**
 * Aufschlag, der zu einer Eingabe „abgerechnet“ führt: mit Abschnittsspalten
 * die Differenz zu den erfassten Stunden der Spalte (Abschnitt bzw. „ohne“ für
 * null), sonst zu denen der ganzen Zeile. `spalten` = `mitAbschnittsspalten`.
 * Stimmt nur ohne Gesamtaufschlag – mit ihm hinge der Anteil der Zeile wieder
 * vom Aufschlag ab; dann lässt sich „abgerechnet“ nicht eingeben
 * (`abgerechnetEingebbar`).
 */
export function aufschlagFuerAbgerechnet(
  zeile: Pick<NachweisZeile, 'stunden' | 'stundenJeAbschnitt'>,
  abschnittId: ID | null,
  abgerechnet: number,
  spalten: boolean,
): number {
  const erfasst = spalten ? (zeile.stundenJeAbschnitt[abschnittId ?? OHNE_ABSCHNITT] ?? 0) : zeile.stunden;
  return runden(abgerechnet - erfasst);
}

/**
 * Aufschläge eines Nachweises mit einem geänderten Wert – rein; so arbeitet
 * `aufschlagSetzen` im Store. Gerundet auf zwei Nachkommastellen; null oder 0
 * entfernt den Aufschlag. Ohne Abschnittsspalten gilt jeder Aufschlag der
 * ganzen Zeile (`abschnittId` wird zu null).
 */
export function mitAufschlag(
  n: Leistungsnachweis,
  projekt: Pick<Projekt, 'abschnitte'> | undefined,
  zeilenSchluessel: string,
  abschnittId: ID | null,
  stunden: number | null,
): Leistungsnachweis {
  const spalten = mitAbschnittsspalten(projekt?.abschnitte ?? []);
  const schluessel = aufschlagSchluessel(zeilenSchluessel, spalten ? abschnittId : null);
  const wert = stunden === null || !Number.isFinite(stunden) ? 0 : runden(stunden);
  const aufschlaege = { ...n.aufschlaege };
  if (wert === 0) delete aufschlaege[schluessel];
  else aufschlaege[schluessel] = wert;
  return { ...n, aufschlaege };
}

/**
 * Prüft einen Aufschlag vor dem Setzen: eine Zahl, die Zeile hat Leistungen,
 * der Abschnitt gehört zum Projekt und die abgerechneten Stunden fielen nicht
 * unter 0 (je Abschnitt bzw. für die ganze Zeile). Entfernen (null/0) geht
 * immer. Liefert die Meldung oder null.
 */
export function aufschlagPruefen(
  daten: LeistungsnachweisDaten,
  n: Leistungsnachweis,
  zeilenSchluessel: string,
  abschnittId: ID | null,
  stunden: number | null,
): string | null {
  if (stunden !== null && !Number.isFinite(stunden)) return AUFSCHLAG_KEINE_ZAHL;
  const wert = stunden === null ? 0 : runden(stunden);
  if (wert === 0) return null;
  const projekt = daten.projekte.find((p) => p.id === n.projektId);
  const zeile = nachweisZeilen(daten, n).find((z) => z.schluessel === zeilenSchluessel);
  if (!zeile) return 'Diese Zeile hat keine Leistungen.';
  const abschnitte = projekt?.abschnitte ?? [];
  const spalten = mitAbschnittsspalten(abschnitte);
  if (spalten && abschnittId !== null && !abschnitte.some((a) => a.id === abschnittId)) return 'Diesen Abschnitt gibt es nicht (mehr).';
  const neu = mitAufschlag(n, projekt, zeilenSchluessel, abschnittId, stunden);
  const eingaben = aufschlaegeDerZeile(neu.aufschlaege, zeilenSchluessel, new Set(abschnitte.map((a) => a.id)), spalten);
  const r = abrechnen(zeile.stundenJeAbschnitt, eingaben);
  if (spalten && abschnittId !== null) {
    if (runden((zeile.stundenJeAbschnitt[abschnittId] ?? 0) + wert) < 0) return AUFSCHLAG_UNTER_NULL;
  } else if (runden(r.vorZeile + wert) < 0) return AUFSCHLAG_UNTER_NULL;
  return null;
}

/** Anzahl der Aufschläge eines Nachweises: die der Zeilen (Einträge ≠ 0) und der Gesamtaufschlag. */
export function anzahlAufschlaege(n: Pick<Leistungsnachweis, 'aufschlaege' | 'gesamtAufschlag'>): number {
  return Object.values(n.aufschlaege).filter((v) => v !== 0).length + (n.gesamtAufschlag ? 1 : 0);
}

/* ------------------------------------------------------------------ */
/* Gesamtaufschlag                                                     */
/* ------------------------------------------------------------------ */

/** Meldung, wenn sich ein Gesamtaufschlag auf keine abgerechneten Stunden verteilen ließe (wörtlich). */
export const GESAMTAUFSCHLAG_OHNE_STUNDEN = 'Ohne abgerechnete Stunden lässt sich kein Gesamtaufschlag verteilen.';

/** Stunden in Hundertstel als ganze Zahl – zum Verteilen ohne Rundungsfehler. */
const hundertstel = (stunden: number) => Math.round(runden(stunden) * 100);

/**
 * Verteilt `betrag` Hundertstel anteilig nach `basen` (Hundertstel, ≥ 0): je
 * Basis der abgerundete Anteil, die übrigen Hundertstel nach dem größten Rest
 * (bei gleichem Rest zuerst die größere Basis, dann die frühere) – die Summe
 * stimmt genau. Übersteigt der Betrag die Summe der Basen nicht, ist kein
 * Anteil dem Betrag nach größer als seine Basis. Ohne Basis (Summe 0) alles 0.
 */
function anteiligVerteilen(betrag: number, basen: number[]): number[] {
  const werte = basen.map((b) => (b > 0 ? b : 0));
  const summe = werte.reduce((s, b) => s + b, 0);
  if (summe <= 0 || betrag === 0) return werte.map(() => 0);
  const ziel = Math.abs(betrag);
  // Ganzzahlig: Produkt, Rest und Quotient sind exakt
  const teile = werte.map((b, i) => {
    const produkt = b * ziel;
    const rest = produkt % summe;
    return { i, b, anteil: (produkt - rest) / summe, rest };
  });
  let offen = ziel - teile.reduce((s, t) => s + t.anteil, 0);
  for (const t of [...teile].sort((x, y) => y.rest - x.rest || y.b - x.b || x.i - y.i)) {
    if (offen <= 0) break;
    t.anteil += 1;
    offen -= 1;
  }
  return teile.map((t) => (t.anteil === 0 ? 0 : betrag < 0 ? -t.anteil : t.anteil));
}

/** Gültiger Gesamtaufschlag: Art „stunden“ oder „prozent“, Wert auf zwei Nachkommastellen; 0 bzw. ungültig → null. */
export function gesamtAufschlagNormal(ga: GesamtAufschlag | null | undefined): GesamtAufschlag | null {
  if (!ga || (ga.art !== 'stunden' && ga.art !== 'prozent') || typeof ga.wert !== 'number' || !Number.isFinite(ga.wert)) return null;
  const wert = runden(ga.wert);
  return wert === 0 ? null : { art: ga.art, wert };
}

/**
 * Stunden, die ein Gesamtaufschlag ausmachen soll: bei Prozent der Anteil an
 * `basis` – den abgerechneten Stunden vor ihm (nach den Aufschlägen der
 * Zeilen) –, sonst sein Wert; auf zwei Nachkommastellen.
 */
export function gesamtAufschlagSoll(basis: number, ga: GesamtAufschlag): number {
  return runden(ga.art === 'prozent' ? (basis * ga.wert) / 100 : ga.wert);
}

/**
 * Verteilt den Gesamtaufschlag `ga` auf Zeilen, deren Aufschläge schon
 * gerechnet sind (`abrechnen`) – so arbeitet `nachweisZeilen`. Basis je Zeile
 * sind ihre abgerechneten Stunden vor dem Gesamtaufschlag; der Betrag
 * (`gesamtAufschlagSoll`: ± Stunden bzw. ± Prozent der Summe der Basen) geht
 * im Verhältnis der Basen an die Zeilen, auf 0,01 Std. gerundet, die Reste
 * nach dem größten Rest – die Summe stimmt genau (`anteiligVerteilen`).
 * Innerhalb der Zeile ebenso je Abschnitt im Verhältnis von
 * `abgerechnetJeAbschnitt`. Abgerechnet wird nie weniger als 0: Ein Abzug
 * über die Summe der Basen hinaus wirkt nur bis dahin
 * (`gesamtAufschlagUebersicht` nennt, wie viel wirkt); ohne Basis wirkt er
 * nicht. Die Zeile trägt ihren Anteil in `anteilGesamt` bzw.
 * `anteilGesamtJeAbschnitt` und schon in `aufschlag`, `aufschlagJeAbschnitt`,
 * `abgerechnet` und `abgerechnetJeAbschnitt` – so zeigen Druck, Excel,
 * Auswertung und `nachweisSummen` ihn ohne Weiteres. Ohne Gesamtaufschlag
 * dieselben Zeilen.
 */
export function gesamtAufschlagVerteilen(zeilen: NachweisZeile[], ga: GesamtAufschlag | null): NachweisZeile[] {
  const g = gesamtAufschlagNormal(ga);
  if (!g || zeilen.length === 0) return zeilen;
  const basen = zeilen.map((z) => hundertstel(z.abgerechnet));
  const summe = basen.reduce((s, b) => s + (b > 0 ? b : 0), 0);
  if (summe <= 0) return zeilen;
  // Nie unter 0: höchstens die Summe der Basen abziehen
  const betrag = Math.max(hundertstel(gesamtAufschlagSoll(summe / 100, g)), -summe);
  const anteile = anteiligVerteilen(betrag, basen);
  return zeilen.map((z, i) => {
    const anteil = anteile[i];
    if (anteil === 0) return z;
    const spalten = Object.keys(z.abgerechnetJeAbschnitt);
    const jeSpalte = anteiligVerteilen(
      anteil,
      spalten.map((k) => hundertstel(z.abgerechnetJeAbschnitt[k])),
    );
    const anteilGesamtJeAbschnitt: Record<string, number> = {};
    const abgerechnetJeAbschnitt = { ...z.abgerechnetJeAbschnitt };
    const aufschlagJeAbschnitt = { ...z.aufschlagJeAbschnitt };
    spalten.forEach((k, j) => {
      if (jeSpalte[j] === 0) return;
      const a = jeSpalte[j] / 100;
      anteilGesamtJeAbschnitt[k] = runden(a);
      abgerechnetJeAbschnitt[k] = runden(abgerechnetJeAbschnitt[k] + a);
      const auf = runden((aufschlagJeAbschnitt[k] ?? 0) + a);
      if (auf === 0) delete aufschlagJeAbschnitt[k];
      else aufschlagJeAbschnitt[k] = auf;
    });
    const stunden = anteil / 100;
    return {
      ...z,
      aufschlag: runden(z.aufschlag + stunden),
      aufschlagJeAbschnitt,
      abgerechnet: runden(z.abgerechnet + stunden),
      abgerechnetJeAbschnitt,
      anteilGesamt: runden(stunden),
      anteilGesamtJeAbschnitt,
    };
  });
}

/** Wirksame Stunden des Gesamtaufschlags über Zeilen (`nachweisZeilen`): Summe ihrer Anteile (`anteilGesamt`). */
export function gesamtAufschlagWirkung(zeilen: Pick<NachweisZeile, 'anteilGesamt'>[]): number {
  return runden(zeilen.reduce((s, z) => s + (z.anteilGesamt ?? 0), 0));
}

/** Was ein Gesamtaufschlag bewirkt (`gesamtAufschlagUebersicht`). */
export interface GesamtAufschlagUebersicht {
  /** Abgerechnete Stunden vor dem Gesamtaufschlag (nach den Aufschlägen der Zeilen). */
  basis: number;
  /** Stunden laut Eingabe (`gesamtAufschlagSoll`). */
  soll: number;
  /** Stunden, die wirken – auf die Zeilen verteilt (`gesamtAufschlagWirkung`). */
  wirksam: number;
  /** Er wirkt nicht ganz: ein Abzug über die Basis hinaus bzw. keine Basis. */
  gekappt: boolean;
}

/**
 * Basis, Soll und Wirkung des Gesamtaufschlags `ga` über die Zeilen eines
 * Nachweises (`nachweisZeilen` bzw. der festgeschriebene Stand); null ohne
 * Gesamtaufschlag.
 */
export function gesamtAufschlagUebersicht(
  zeilen: Pick<NachweisZeile, 'abgerechnet' | 'anteilGesamt'>[],
  ga: GesamtAufschlag | null,
): GesamtAufschlagUebersicht | null {
  const g = gesamtAufschlagNormal(ga);
  if (!g) return null;
  const wirksam = gesamtAufschlagWirkung(zeilen);
  const basis = runden(zeilen.reduce((s, z) => s + z.abgerechnet, 0) - wirksam);
  const soll = gesamtAufschlagSoll(basis, g);
  return { basis, soll, wirksam, gekappt: wirksam !== soll };
}

/** ± mit Vorzeichen (−, wie `stundenText`, als „-“). */
const mitVorzeichen = (wert: number, text: string) => `${wert > 0 ? '+' : ''}${text}`;

/** Gesamtaufschlag als Text, etwa „+10 %“, „-2,5 %“ oder „+2,50 Std.“. */
export function gesamtAufschlagText(ga: GesamtAufschlag): string {
  const wert = runden(ga.wert);
  return ga.art === 'prozent'
    ? `${mitVorzeichen(wert, String(wert).replace('.', ','))} %`
    : `${mitVorzeichen(wert, stundenText(wert))} Std.`;
}

/**
 * Hinweis, wenn der Gesamtaufschlag nicht ganz wirkt (`gesamtAufschlagUebersicht`), etwa „Der
 * Gesamtaufschlag wirkt nur mit -12,00 Std. – abgerechnet wird nie weniger als 0 Std.“; null, wenn er
 * ganz wirkt.
 */
export function gesamtAufschlagHinweis(u: GesamtAufschlagUebersicht | null): string | null {
  if (!u || !u.gekappt) return null;
  if (u.basis <= 0) return 'Ohne abgerechnete Stunden wirkt der Gesamtaufschlag nicht.';
  return `Der Gesamtaufschlag wirkt nur mit ${mitVorzeichen(u.wirksam, stundenText(u.wirksam))} Std. – abgerechnet wird nie weniger als 0 Std.`;
}

/**
 * Liest die Eingabe eines Gesamtaufschlags: eine Zahl mit Komma oder Punkt,
 * Vorzeichen erlaubt, dahinter wahlweise „%“ (Prozent) bzw. „Std.“ oder „h“
 * (Stunden) – sonst gilt `art`. Leer oder 0 → null (kein Gesamtaufschlag);
 * keine Zahl → undefined.
 */
export function gesamtAufschlagLesen(text: string, art: GesamtAufschlag['art']): GesamtAufschlag | null | undefined {
  let t = text.replace(/\s+/g, '').replace(/[−–]/g, '-');
  if (!t) return null;
  let gewaehlt = art;
  const einheit = /(%|std\.?|h)$/i.exec(t);
  if (einheit) {
    gewaehlt = einheit[0] === '%' ? 'prozent' : 'stunden';
    t = t.slice(0, -einheit[0].length);
  }
  if (!/^[+-]?(\d+([.,]\d*)?|[.,]\d+)$/.test(t)) return undefined;
  const wert = runden(Number(t.replace(',', '.')));
  return wert === 0 ? null : { art: gewaehlt, wert };
}

/**
 * Prüft einen Gesamtaufschlag vor dem Setzen (`gesamtAufschlagSetzen` im
 * Store): Art und Zahl gültig, der Nachweis hat abgerechnete Stunden, auf die
 * er sich verteilen lässt, und abgerechnet fiele nicht unter 0. Entfernen
 * (null/0) geht immer. Liefert die Meldung (`AUFSCHLAG_KEINE_ZAHL`,
 * `GESAMTAUFSCHLAG_OHNE_STUNDEN`, `AUFSCHLAG_UNTER_NULL`) oder null.
 */
export function gesamtAufschlagPruefen(daten: LeistungsnachweisDaten, n: Leistungsnachweis, ga: GesamtAufschlag | null): string | null {
  if (ga === null) return null;
  if ((ga.art !== 'stunden' && ga.art !== 'prozent') || typeof ga.wert !== 'number' || !Number.isFinite(ga.wert)) return AUFSCHLAG_KEINE_ZAHL;
  const g = gesamtAufschlagNormal(ga);
  if (!g) return null;
  const basis = summeAbgerechnet(nachweisZeilen(daten, { ...n, gesamtAufschlag: null }));
  if (basis <= 0) return GESAMTAUFSCHLAG_OHNE_STUNDEN;
  return runden(basis + gesamtAufschlagSoll(basis, g)) < 0 ? AUFSCHLAG_UNTER_NULL : null;
}

/** Nachweis mit dem Gesamtaufschlag `ga` (`gesamtAufschlagNormal`; null/0 entfernt ihn) – rein; so arbeitet `gesamtAufschlagSetzen` im Store. */
export function mitGesamtAufschlag(n: Leistungsnachweis, ga: GesamtAufschlag | null): Leistungsnachweis {
  return { ...n, gesamtAufschlag: gesamtAufschlagNormal(ga) };
}

/**
 * Lässt sich „abgerechnet“ je Zeile eingeben (`aufschlagFuerAbgerechnet`)? Nur
 * ohne Gesamtaufschlag: Mit ihm hängt der Anteil der Zeile vom Aufschlag der
 * Zeile ab, die Eingabe ergäbe nicht genau den eingegebenen Wert – dann bleibt
 * der Aufschlag der Zeile einzugeben.
 */
export function abgerechnetEingebbar(n: Pick<Leistungsnachweis, 'gesamtAufschlag'>): boolean {
  return !n.gesamtAufschlag;
}

/** Präfix des Schlüssels einer Zeile aus nachgereichten Leistungen („NW2026-44“). */
export const NACHGEREICHT_PRAEFIX = 'N';

/**
 * Zeilen des Nachweises aus den Leistungen (live – auch bei abgeschlossenen; für die Anzeige
 * abgeschlossener Nachweise `zeilenFuerAnzeige` verwenden). Nur Perioden mit Leistungen.
 * Nachgereichte Leistungen außerhalb des Zeitraums bilden eigene Zeilen
 * (`NACHGEREICHT_PRAEFIX` vor dem Periodenschlüssel, `nachgereicht`) – nie zusammen mit
 * laufenden derselben Woche bzw. desselben Monats –, auf die Tage vor dem Zeitraum gekürzt.
 * Bearbeiter: Namen in der Reihenfolge der ersten Leistung, unbekannte Mitarbeiter als „?“.
 * Text: der vom Controlling bearbeitete (`texte[schluessel].text`); sonst aus den gemeinsamen
 * Leistungstexten der Mitarbeiter (`gemeinsamerZeilentext` – je Erfassungsperiode im Raster
 * des Projekts der gemeinsame Text bzw. `automatikText`, ohne Wiederholungen; `textGemeinsam`),
 * ohne solche `automatikText`. Ein abgeschlossener Nachweis gliedert die gemeinsamen Texte im
 * Raster des Projekts bei seinem Abschluss (`NachweisStand.erfassungsRaster`,
 * `erfassungsGliederung`) – ein späterer Rasterwechsel des Projekts ändert ihn nicht. Dazu
 * Aufschlag und abgerechnete Stunden aus `aufschlaege` (`abrechnen`) und danach der anteilig
 * verteilte Gesamtaufschlag (`gesamtAufschlag`, `gesamtAufschlagVerteilen`).
 */
export function nachweisZeilen(daten: LeistungsnachweisDaten, n: Leistungsnachweis): NachweisZeile[] {
  const projekt = daten.projekte.find((p) => p.id === n.projektId);
  // Gemeinsame Texte gliedert das Raster des Projekts (bzw. des Abschlusses) – nicht das des Nachweises
  const gemeinsameTexte = periodentexteVon(daten, n.projektId);
  const gliederung = erfassungsGliederung(daten, n.projektId);
  const abschnittIds = new Set((projekt?.abschnitte ?? []).map((a) => a.id));
  const spalten = mitAbschnittsspalten(projekt?.abschnitte ?? []);
  const mitarbeiter = new Map(daten.mitarbeiter.map((m) => [m.id, m]));
  const gruppen = new Map<string, { von: ISODate; bis: ISODate; nachgereicht: boolean; leistungen: Leistung[] }>();
  for (const l of leistungenDesNachweises(daten, n)) {
    const roh = periodeVon(l.datum, n.raster);
    // Nachgereichte Leistungen liegen vor dem Zeitraum: eigene Zeile, gekürzt auf die Tage davor
    const nachgereicht = !imZeitraum(l.datum, n.von, n.bis);
    const p = nachgereicht
      ? { ...periodeKuerzen(roh, roh.von, l.datum < n.von ? addDays(n.von, -1) : roh.bis), schluessel: `${NACHGEREICHT_PRAEFIX}${roh.schluessel}` }
      : periodeKuerzen(roh, n.von, n.bis);
    const gruppe = gruppen.get(p.schluessel);
    if (gruppe) {
      gruppe.leistungen.push(l);
      if (p.von < gruppe.von) gruppe.von = p.von;
      if (p.bis > gruppe.bis) gruppe.bis = p.bis;
    } else gruppen.set(p.schluessel, { von: p.von, bis: p.bis, nachgereicht, leistungen: [l] });
  }
  const zeilen = [...gruppen.entries()]
    .sort(([, a], [, b]) => (a.von < b.von ? -1 : a.von > b.von ? 1 : 0))
    .map(([schluessel, { von, bis, nachgereicht, leistungen }]): NachweisZeile => {
      const bearbeiter: string[] = [];
      const stundenJeAbschnitt: Record<string, number> = {};
      const stundenJeMitarbeiter: Record<ID, number> = {};
      let stunden = 0;
      for (const l of leistungen) {
        const m = mitarbeiter.get(l.mitarbeiterId);
        const name = m ? mitarbeiterName(m) || m.kuerzel || '?' : '?';
        if (!bearbeiter.includes(name)) bearbeiter.push(name);
        stunden += l.stunden;
        addieren(stundenJeAbschnitt, spalteDerLeistung(l, abschnittIds), l.stunden);
        addieren(stundenJeMitarbeiter, l.mitarbeiterId, l.stunden);
      }
      const bearbeitet = n.texte[schluessel];
      const gemeinsam = bearbeitet
        ? null
        : gemeinsamerZeilentext(daten, n, { von, bis, nachgereicht, leistungen }, gemeinsameTexte, gliederung);
      const jeAbschnitt = gerundet(stundenJeAbschnitt);
      const abrechnung = abrechnen(jeAbschnitt, aufschlaegeDerZeile(n.aufschlaege ?? {}, schluessel, abschnittIds, spalten));
      return {
        schluessel,
        von,
        bis,
        datumText: datumText({ schluessel, von, bis }, n.raster, leistungen.some((l) => istWochenende(l.datum))),
        bearbeiter,
        text: bearbeitet ? bearbeitet.text : (gemeinsam ?? automatikText(leistungen)),
        textBearbeitet: !!bearbeitet,
        ...(gemeinsam !== null ? { textGemeinsam: true } : {}),
        stunden: runden(stunden),
        stundenJeAbschnitt: jeAbschnitt,
        stundenJeMitarbeiter: gerundet(stundenJeMitarbeiter),
        leistungIds: leistungen.map((l) => l.id),
        ...(nachgereicht ? { nachgereicht: true } : {}),
        aufschlag: abrechnung.aufschlag,
        aufschlagJeAbschnitt: abrechnung.aufschlagJeAbschnitt,
        abgerechnet: abrechnung.abgerechnet,
        abgerechnetJeAbschnitt: abrechnung.abgerechnetJeAbschnitt,
      };
    });
  // Der Gesamtaufschlag kommt nach den Aufschlägen der Zeilen – anteilig nach deren abgerechneten Stunden
  return gesamtAufschlagVerteilen(zeilen, n.gesamtAufschlag ?? null);
}

/** Abgeschlossen mit Stand → `stand.zeilen`, sonst `nachweisZeilen`. */
export function zeilenFuerAnzeige(daten: LeistungsnachweisDaten, n: Leistungsnachweis): NachweisZeile[] {
  return n.status === 'abgeschlossen' && n.stand ? n.stand.zeilen : nachweisZeilen(daten, n);
}

/** Leistungen einer Zeile, die nach der Textbearbeitung hinzukamen (leer ohne Bearbeitung). */
export function neueLeistungenSeitText(
  daten: Pick<LeistungsnachweisDaten, 'leistungen'>,
  n: Leistungsnachweis,
  zeile: NachweisZeile,
): Leistung[] {
  const bearbeitet = n.texte[zeile.schluessel];
  if (!bearbeitet) return [];
  const bekannt = new Set(bearbeitet.leistungIds);
  const neu = new Set(zeile.leistungIds.filter((id) => !bekannt.has(id)));
  return daten.leistungen.filter((l) => neu.has(l.id)).sort(nachDatum);
}

/**
 * Text einer Zeile setzen – mit den Leistungs-IDs der Zeile, damit später
 * hinzukommende Leistungen erkannt werden, und dem Text der Mitarbeiter, an dem
 * sich die Bearbeitung ausrichtet (`ausgang`, `ZeilenText.ausgang`); null =
 * wieder automatisch. Rein; so arbeitet `zeilenTextSetzen` im Store.
 */
export function mitZeilenText(n: Leistungsnachweis, zeile: NachweisZeile, text: string | null, ausgang?: string): Leistungsnachweis {
  const texte = { ...n.texte };
  if (text === null) delete texte[zeile.schluessel];
  else texte[zeile.schluessel] = { text, leistungIds: [...zeile.leistungIds], ...(ausgang !== undefined ? { ausgang } : {}) };
  return { ...n, texte };
}

/**
 * Text, den die Zeile ohne ihre Bearbeitung von Hand hätte – aus den
 * gemeinsamen Texten der Mitarbeiter bzw. automatisch (`nachweisZeilen`);
 * undefined, wenn es die Zeile nicht gibt.
 */
export function zeilenTextOhneBearbeitung(daten: LeistungsnachweisDaten, n: Leistungsnachweis, schluessel: string): string | undefined {
  const texte = { ...n.texte };
  delete texte[schluessel];
  return nachweisZeilen(daten, { ...n, texte }).find((z) => z.schluessel === schluessel)?.text;
}

/**
 * Eine von Hand bearbeitete Zeile eines offenen Nachweises, deren Text
 * überholt sein kann (`ueberholteZeilen`).
 */
export interface UeberholteZeile {
  schluessel: string;
  /** Leistungen, die nach der Bearbeitung hinzukamen (`neueLeistungenSeitText`). */
  neue: Leistung[];
  /**
   * Der Text, den die Zeile ohne die Bearbeitung jetzt hätte, wenn er sich
   * seitdem geändert hat (`ZeilenText.ausgang`, `zeilenTextOhneBearbeitung`); sonst null.
   */
  textNeu: string | null;
  /** Käme dieser Text aus den gemeinsamen Texten der Mitarbeiter (`textGemeinsam`) – sonst automatisch? */
  gemeinsam: boolean;
}

/**
 * Von Hand bearbeitete Zeilen eines offenen Nachweises, in denen seit der
 * Bearbeitung Leistungen hinzukamen oder sich der Text der Mitarbeiter bzw.
 * der automatische Text geändert hat – je Zeilenschlüssel, in der Folge der
 * Zeilen. Die Tabelle des Leistungsnachweises im Controlling nennt sie je
 * Zeile und zählt sie darüber (`ueberholtHinweis`, `ueberholtRueckfrage`). Leer bei
 * abgeschlossenen Nachweisen.
 */
export function ueberholteZeilen(daten: LeistungsnachweisDaten, n: Leistungsnachweis): Map<string, UeberholteZeile> {
  const ergebnis = new Map<string, UeberholteZeile>();
  if (n.status === 'abgeschlossen' || Object.keys(n.texte).length === 0) return ergebnis;
  const zeilen = nachweisZeilen(daten, n).filter((z) => z.textBearbeitet);
  if (zeilen.length === 0) return ergebnis;
  // Ohne die Bearbeitungen von Hand – jede Zeile wie mit `zeilenTextOhneBearbeitung`
  const ohne = new Map(nachweisZeilen(daten, { ...n, texte: {} }).map((z) => [z.schluessel, z]));
  for (const z of zeilen) {
    const neue = neueLeistungenSeitText(daten, n, z);
    const ausgang = n.texte[z.schluessel]?.ausgang;
    const heute = ohne.get(z.schluessel);
    const textNeu = heute && ausgang !== undefined && heute.text !== ausgang ? heute.text : null;
    if (neue.length > 0 || textNeu !== null) ergebnis.set(z.schluessel, { schluessel: z.schluessel, neue, textNeu, gemeinsam: !!heute?.textGemeinsam });
  }
  return ergebnis;
}

/** „1 Zeile“, „2 Zeilen“. */
const zeilenAnzahl = (anzahl: number) => (anzahl === 1 ? '1 Zeile' : `${anzahl} Zeilen`);

/**
 * Zahlen zu `ueberholteZeilen`: Zeilen mit neuen Leistungen, mit geändertem
 * Text der Mitarbeiter und – ohne neue Leistungen, die ihn schon erklären –
 * mit geändertem automatischem Text.
 */
function ueberholtZahlen(liste: UeberholteZeile[]): { neue: number; mitarbeiter: number; automatisch: number } {
  return {
    neue: liste.filter((u) => u.neue.length > 0).length,
    mitarbeiter: liste.filter((u) => u.textNeu !== null && u.gemeinsam).length,
    automatisch: liste.filter((u) => u.textNeu !== null && !u.gemeinsam && u.neue.length === 0).length,
  };
}

/**
 * Warnung über der Abrechnung zu `ueberholteZeilen`, etwa „In 2 Zeilen kamen
 * nach der Bearbeitung des Leistungstexts Leistungen hinzu. In 1 Zeile hat
 * sich der Text der Mitarbeiter seit der Bearbeitung des Leistungstexts
 * geändert.“; null ohne solche Zeilen.
 */
export function ueberholtHinweis(liste: UeberholteZeile[]): string | null {
  const z = ueberholtZahlen(liste);
  const saetze: string[] = [];
  if (z.neue) saetze.push(`In ${zeilenAnzahl(z.neue)} kamen nach der Bearbeitung des Leistungstexts Leistungen hinzu.`);
  if (z.mitarbeiter) saetze.push(`In ${zeilenAnzahl(z.mitarbeiter)} hat sich der Text der Mitarbeiter seit der Bearbeitung des Leistungstexts geändert.`);
  if (z.automatisch) saetze.push(`In ${zeilenAnzahl(z.automatisch)} hat sich der automatische Text seit der Bearbeitung des Leistungstexts geändert.`);
  return saetze.length ? saetze.join(' ') : null;
}

/** Satz im Schritt „Abschließen und PDF“ zu `ueberholteZeilen`; null ohne solche Zeilen. */
export function ueberholtRueckfrage(liste: UeberholteZeile[]): string | null {
  const z = ueberholtZahlen(liste);
  const saetze: string[] = [];
  if (z.neue) saetze.push(`Achtung: In ${zeilenAnzahl(z.neue)} fehlen neue Leistungen noch im bearbeiteten Text.`);
  if (z.mitarbeiter && z.automatisch) {
    saetze.push(
      `Achtung: In ${zeilenAnzahl(z.mitarbeiter)} hat sich der Text der Mitarbeiter, in ${zeilenAnzahl(z.automatisch)} der automatische Text seit der Bearbeitung geändert – abgeschlossen wird der von Hand bearbeitete Text.`,
    );
  } else if (z.mitarbeiter) {
    saetze.push(
      `Achtung: In ${zeilenAnzahl(z.mitarbeiter)} hat sich der Text der Mitarbeiter seit der Bearbeitung geändert – abgeschlossen wird der von Hand bearbeitete Text.`,
    );
  } else if (z.automatisch) {
    saetze.push(
      `Achtung: In ${zeilenAnzahl(z.automatisch)} hat sich der automatische Text seit der Bearbeitung geändert – abgeschlossen wird der von Hand bearbeitete Text.`,
    );
  }
  return saetze.length ? saetze.join(' ') : null;
}

/** Summe der Stunden. */
export function summeStunden(zeilen: NachweisZeile[]): number {
  return runden(zeilen.reduce((s, z) => s + z.stunden, 0));
}

/** Summe der abgerechneten Stunden. */
export function summeAbgerechnet(zeilen: Pick<NachweisZeile, 'abgerechnet'>[]): number {
  return runden(zeilen.reduce((s, z) => s + z.abgerechnet, 0));
}

/** Erfasst, Aufschlag und abgerechnet über Zeilen (abgerechnet = erfasst + Aufschlag). */
export function nachweisSummen(zeilen: Pick<NachweisZeile, 'stunden' | 'aufschlag' | 'abgerechnet'>[]): {
  erfasst: number;
  aufschlag: number;
  abgerechnet: number;
} {
  const erfasst = runden(zeilen.reduce((s, z) => s + z.stunden, 0));
  const abgerechnet = runden(zeilen.reduce((s, z) => s + z.abgerechnet, 0));
  return { erfasst, aufschlag: runden(abgerechnet - erfasst), abgerechnet };
}

/** Summe der Stunden einer Auswahl von Leistungen. */
export function stundenVon(leistungen: Pick<Leistung, 'stunden'>[]): number {
  return runden(leistungen.reduce((s, l) => s + l.stunden, 0));
}

/** Überschrift: `titel` oder „Leistungsnachweis <zeitraumText>“. */
export function nachweisTitel(n: Pick<Leistungsnachweis, 'titel' | 'von' | 'bis'>): string {
  return n.titel.trim() || `Leistungsnachweis ${zeitraumText(n.von, n.bis)}`;
}

/** Namen aller Bearbeiter des Nachweises – in der Reihenfolge ihres ersten Auftretens. */
export function bearbeiterVon(zeilen: NachweisZeile[]): string[] {
  return [...new Set(zeilen.flatMap((z) => z.bearbeiter))];
}

/**
 * Inhalt einer Leistung zum Vergleich: Datum, Stunden, Abschnitt und Text –
 * ohne Kennung, Quelle und Projektelement, damit ein unveränderter Neuimport
 * gleich bleibt (`importPlanen`). Eine Prüfsumme (`pruefsumme`).
 */
export function leistungsInhalt(l: Pick<Leistung, 'datum' | 'stunden' | 'abschnittId' | 'text'>): string {
  return pruefsumme([l.datum, runden(l.stunden).toFixed(2), l.abschnittId ?? '', l.text.trim()].join('\u0001'));
}

/**
 * Inhalt einer abgerechneten Leistung im festgeschriebenen Stand
 * (`NachweisStand.inhalte`): Datum, Stunden und Text als Prüfsumme – den
 * Abschnitt hält der Stand getrennt fest (`NachweisStand.abschnittIds`).
 */
const standInhalt = (l: Pick<Leistung, 'datum' | 'stunden' | 'text'>): string =>
  pruefsumme([l.datum, runden(l.stunden).toFixed(2), l.text.trim()].join('\u0001'));

/**
 * Wurde die abgerechnete Leistung nach dem Abschluss des Nachweises `n` (in
 * dessen Stand sie steht) geändert? Ja, wenn die Person sie danach geändert hat
 * (`Leistung.geaendert` nach `abgeschlossen` – `updateLeistung` bzw. ein
 * Neuimport mit anderem Inhalt) und sie vom festgeschriebenen Stand abweicht
 * (`NachweisStand.inhalte` und `abschnittIds`): Wer auf den abgerechneten Wert
 * zurückändert, hebt es wieder auf. Den Abschnitt, den das Controlling danach
 * neu zugeordnet hat, führt der Stand mit (`standAbschnitteNachziehen`).
 * Ältere Stände ohne `inhalte` zählen allein den Zeitpunkt.
 */
export function nachAbschlussGeaendert(l: Leistung, n: Pick<Leistungsnachweis, 'abgeschlossen' | 'stand'>): boolean {
  if (!l.geaendert || !n.abgeschlossen || l.geaendert <= n.abgeschlossen) return false;
  const abgerechnet = n.stand?.inhalte?.[l.id];
  if (abgerechnet === undefined || abgerechnet !== standInhalt(l)) return true;
  return (n.stand?.abschnittIds?.[l.id] ?? null) !== (l.abschnittId ?? null);
}

/**
 * Stand zum Festschreiben beim Abschließen – mit den Aufschlägen und
 * abgerechneten Stunden und dem Inhalt jeder abgerechneten Leistung
 * (`inhalte`, `abschnittIds`).
 */
export function standErzeugen(daten: LeistungsnachweisDaten, n: Leistungsnachweis): NachweisStand {
  const projekt = daten.projekte.find((p) => p.id === n.projektId);
  const zeilen = nachweisZeilen(daten, n);
  const leistungen = leistungenDesNachweises(daten, n);
  return {
    zeilen,
    ...(projekt ? { erfassungsRaster: projekt.raster } : {}),
    inhalte: Object.fromEntries(leistungen.map((l) => [l.id, standInhalt(l)])),
    abschnittIds: Object.fromEntries(leistungen.flatMap((l) => (l.abschnittId ? [[l.id, l.abschnittId]] : []))),
    abschnitte: (projekt?.abschnitte ?? []).map((a) => ({ ...a })),
    projekt: {
      nummer: projekt?.nummer ?? '',
      name: projekt?.name ?? '',
      kurzname: projekt?.kurzname ?? '',
      leistungsbereich: projekt?.leistungsbereich ?? '',
    },
    titel: nachweisTitel(n),
    stunden: summeStunden(zeilen),
    abgerechnet: summeAbgerechnet(zeilen),
  };
}

/**
 * Ändert das Controlling die Abschnitte des Projekts `projektId` (einen
 * Abschnitt entfernt – seine Leistungen sind dann ohne Abschnitt –, bzw.
 * „Abschnitte aus Projektelementen“), ordnet es auch abgerechnete Leistungen
 * neu zu, ohne dass die Person etwas geändert hat. Damit
 * `nachAbschlussGeaendert` nur zählt, was die Person geändert hat, zieht der
 * festgeschriebene Abschnitt (`NachweisStand.abschnittIds`) mit: Hatte die
 * Leistung vor der Änderung (`alt`) noch ihren abgerechneten Abschnitt, gilt
 * ihr neuer; ein Abschnitt, den es im Projekt nicht mehr gibt, entfällt. Die
 * Abrechnung des Stands (Zeilen, `abschnitte`) bleibt, wie sie ist. Rein; ohne
 * Änderung derselbe Bestand.
 */
export function standAbschnitteNachziehen(
  alt: LeistungsnachweisDaten,
  neu: LeistungsnachweisDaten,
  projektId: ID,
): LeistungsnachweisDaten {
  const gueltig = new Set((neu.projekte.find((p) => p.id === projektId)?.abschnitte ?? []).map((a) => a.id));
  const vorher = new Map(alt.leistungen.filter((l) => l.projektId === projektId).map((l) => [l.id, l.abschnittId ?? null]));
  const nachher = new Map(neu.leistungen.filter((l) => l.projektId === projektId).map((l) => [l.id, l.abschnittId ?? null]));
  let geaendert = false;
  const nachweise = neu.nachweise.map((n) => {
    if (n.projektId !== projektId || n.status !== 'abgeschlossen' || !n.stand?.inhalte) return n;
    const bisher = n.stand.abschnittIds ?? {};
    const abschnittIds: Record<ID, ID> = {};
    let anders = false;
    for (const id of Object.keys(n.stand.inhalte)) {
      const war: ID | null = bisher[id] ?? null;
      let abschnitt: ID | null = war;
      const a = vorher.get(id);
      const b = nachher.get(id);
      if (a !== undefined && b !== undefined && a !== b && a === war) abschnitt = b;
      if (abschnitt && !gueltig.has(abschnitt)) abschnitt = null;
      if (abschnitt) abschnittIds[id] = abschnitt;
      if (abschnitt !== war) anders = true;
    }
    if (!anders) return n;
    geaendert = true;
    return { ...n, stand: { ...n.stand, abschnittIds } };
  });
  return geaendert ? { ...neu, nachweise } : neu;
}

const gleicheWerte = (a: Record<string, number>, b: Record<string, number>) => {
  const ka = Object.keys(a).filter((k) => a[k] !== 0);
  const kb = Object.keys(b).filter((k) => b[k] !== 0);
  return ka.length === kb.length && ka.every((k) => runden(a[k]) === runden(b[k] ?? 0));
};

const gleicheIds = (a: ID[], b: ID[]) => {
  if (a.length !== b.length) return false;
  const menge = new Set(a);
  return b.every((id) => menge.has(id));
};

/** Weicht der Live-Stand eines abgeschlossenen Nachweises vom festgeschriebenen ab? (Stunden, Leistungen, Texte oder abgerechnete Stunden) */
export function standVeraltet(daten: LeistungsnachweisDaten, n: Leistungsnachweis): boolean {
  if (n.status !== 'abgeschlossen' || !n.stand) return false;
  const alt = n.stand.zeilen;
  const live = nachweisZeilen(daten, n);
  if (alt.length !== live.length) return true;
  return live.some((z, i) => {
    const a = alt[i];
    return (
      a.schluessel !== z.schluessel ||
      a.text !== z.text ||
      runden(a.stunden) !== z.stunden ||
      runden(a.abgerechnet) !== z.abgerechnet ||
      !gleicheIds(a.leistungIds, z.leistungIds) ||
      !gleicheWerte(a.stundenJeAbschnitt, z.stundenJeAbschnitt) ||
      !gleicheWerte(a.stundenJeMitarbeiter, z.stundenJeMitarbeiter)
    );
  });
}

/**
 * Für die Rückfrage vor „Wieder öffnen“: Zahlen des festgeschriebenen Stands
 * und der aktuellen Leistungen, und ob sie voneinander abweichen.
 */
export function standVergleich(
  daten: LeistungsnachweisDaten,
  n: Leistungsnachweis,
): { veraltet: boolean; stand: { erfasst: number; abgerechnet: number }; aktuell: { erfasst: number; abgerechnet: number } } {
  const live = nachweisSummen(nachweisZeilen(daten, n));
  const stand = n.stand ? { erfasst: n.stand.stunden, abgerechnet: n.stand.abgerechnet } : { erfasst: live.erfasst, abgerechnet: live.abgerechnet };
  return { veraltet: standVeraltet(daten, n), stand, aktuell: { erfasst: live.erfasst, abgerechnet: live.abgerechnet } };
}

/* ------------------------------------------------------------------ */
/* Rasterwechsel                                                       */
/* ------------------------------------------------------------------ */

const RASTER_PRAEFIX: Record<Raster, string> = { tag: 'T', woche: 'W', monat: 'M' };

/**
 * Was ein Wechsel des Rasters verdeckt: von Hand bearbeitete Texte und
 * Aufschläge, die zu Zeilen des bisherigen Rasters gehören (auch zu Zeilen
 * nachgereichter Leistungen, `NACHGEREICHT_PRAEFIX`). Sie bleiben
 * gespeichert und kehren zurück, wenn das Raster wieder umgestellt wird.
 */
export function rasterwechselVerdeckt(n: Pick<Leistungsnachweis, 'raster' | 'texte' | 'aufschlaege'>, raster: Raster): { texte: number; aufschlaege: number } {
  if (raster === n.raster) return { texte: 0, aufschlaege: 0 };
  const bisher = RASTER_PRAEFIX[n.raster];
  const imRaster = (k: string) => k.startsWith(bisher) || k.startsWith(`${NACHGEREICHT_PRAEFIX}${bisher}`);
  return {
    texte: Object.keys(n.texte).filter(imRaster).length,
    aufschlaege: Object.entries(n.aufschlaege).filter(([k, v]) => imRaster(k) && v !== 0).length,
  };
}

/** Summe von `rasterwechselVerdeckt` über mehrere Nachweise (etwa die offenen, die in einem neuen aufgehen). */
export function rasterwechselVerdecktAlle(
  nachweise: Pick<Leistungsnachweis, 'raster' | 'texte' | 'aufschlaege'>[],
  raster: Raster,
): { texte: number; aufschlaege: number } {
  return nachweise.reduce(
    (s, n) => {
      const v = rasterwechselVerdeckt(n, raster);
      return { texte: s.texte + v.texte, aufschlaege: s.aufschlaege + v.aufschlaege };
    },
    { texte: 0, aufschlaege: 0 },
  );
}

/**
 * Warnung in den Dialogen „Zeitraum ändern“ und „Neuer Leistungsnachweis“ bei einem Rasterwechsel, etwa
 * „2 bearbeitete Texte und 1 Aufschlag gehören zu einem anderen Raster und
 * werden nicht mehr angezeigt – sie kehren zurück, wenn das Raster wieder
 * umgestellt wird.“; null, wenn nichts verdeckt wird.
 */
export function rasterwechselHinweis(verdeckt: { texte: number; aufschlaege: number }): string | null {
  const teile: string[] = [];
  if (verdeckt.texte > 0) teile.push(verdeckt.texte === 1 ? '1 bearbeiteter Text' : `${verdeckt.texte} bearbeitete Texte`);
  if (verdeckt.aufschlaege > 0) teile.push(verdeckt.aufschlaege === 1 ? '1 Aufschlag' : `${verdeckt.aufschlaege} Aufschläge`);
  if (teile.length === 0) return null;
  const einer = verdeckt.texte + verdeckt.aufschlaege === 1;
  return einer
    ? `${teile[0]} gehört zu einem anderen Raster und wird nicht mehr angezeigt – er kehrt zurück, wenn das Raster wieder umgestellt wird.`
    : `${teile.join(' und ')} gehören zu einem anderen Raster und werden nicht mehr angezeigt – sie kehren zurück, wenn das Raster wieder umgestellt wird.`;
}

/* ------------------------------------------------------------------ */
/* Anlegen und Ergänzen                                                */
/* ------------------------------------------------------------------ */

/** Leerer Nachweis mit Vorgaben des Projekts. */
export function neuerNachweis(id: ID, projekt: Projekt, von: ISODate, bis: ISODate, jetzt: string): Leistungsnachweis {
  return {
    id,
    projektId: projekt.id,
    titel: '',
    von,
    bis,
    bisFest: false,
    raster: projekt.raster,
    status: 'entwurf',
    texte: {},
    aufschlaege: {},
    gesamtAufschlag: null,
    bemerkung: '',
    nachgereicht: [],
    erstellt: jetzt,
    geaendert: jetzt,
    abgeschlossen: null,
    stand: null,
  };
}

/** Ergebnis von `nachweiseErgaenzen`. */
export interface Ergaenzung {
  neu: Leistungsnachweis[];
  erweitert: { id: ID; von: ISODate; bis: ISODate }[];
}

/**
 * Nachweise anlegen bzw. erweitern, damit die genannten Tage des Projekts in einem Nachweis liegen –
 * die Tage der Reihe nach, der früheste zuerst. Einen Abrechnungsrhythmus gibt es nicht (mehr,
 * Fassung 9): Liegt vor dem Tag der zeitlich letzte Nachweis des Projekts und läuft er noch
 * (offen ohne festgelegtes Ende, `laeuftBisAbschluss`; kein anderer dazwischen), wird sein `bis`
 * bis zum Monatsende des Tages verlängert (gekürzt vor dem nächsten Nachweis) – der offene
 * Nachweis wächst so mit, bis das Controlling ihn erstellt. Sonst entsteht ein neuer ab dem
 * Monatsanfang (frühestens am Tag nach dem vorigen) bis zum Monatsende (vor dem nächsten). Tage in
 * abgeschlossenen Nachweisen sind bereits abgedeckt. Rein; `neueId` liefert IDs (vorab erzeugt an
 * der Oberfläche oder im Plan).
 */
export function nachweiseErgaenzen(
  daten: Pick<LeistungsnachweisDaten, 'nachweise'>,
  projekt: Projekt,
  tage: ISODate[],
  jetzt: string,
  neueId: () => ID,
): Ergaenzung {
  // Arbeitsstand: die Nachweise des Projekts samt der in diesem Aufruf angelegten bzw. verlängerten
  const stand = daten.nachweise
    .filter((n) => n.projektId === projekt.id)
    .map((n) => ({ id: n.id, von: n.von, bis: n.bis, offen: laeuftBisAbschluss(n), neu: null as Leistungsnachweis | null }));
  const ausgangBis = new Map(stand.map((s) => [s.id, s.bis]));
  const sortiert = [...new Set(tage.filter(istDatum))].sort();

  for (const tag of sortiert) {
    if (stand.some((s) => imZeitraum(tag, s.von, s.bis))) continue;
    // Nachbarn: der letzte Nachweis vor dem Tag und der erste danach
    let vorher: (typeof stand)[number] | undefined;
    let danach: (typeof stand)[number] | undefined;
    for (const s of stand) {
      if (s.bis < tag && (!vorher || s.bis > vorher.bis)) vorher = s;
      if (s.von > tag && (!danach || s.von < danach.von)) danach = s;
    }
    const monatsEnde = monatsende(tag);
    const ende = danach && danach.von <= monatsEnde ? addDays(danach.von, -1) : monatsEnde;
    if (vorher?.offen) {
      vorher.bis = ende;
      if (vorher.neu) vorher.neu = { ...vorher.neu, bis: ende };
      continue;
    }
    const monatsAnfang = monatsanfang(tag);
    const anfang = vorher && vorher.bis >= monatsAnfang ? addDays(vorher.bis, 1) : monatsAnfang;
    const n = neuerNachweis(neueId(), projekt, anfang, ende, jetzt);
    stand.push({ id: n.id, von: n.von, bis: n.bis, offen: true, neu: n });
  }

  return {
    neu: stand.flatMap((s) => (s.neu ? [s.neu] : [])),
    erweitert: stand
      .filter((s) => !s.neu && ausgangBis.get(s.id) !== s.bis)
      .map((s) => ({ id: s.id, von: s.von, bis: s.bis })),
  };
}

/** Wendet das Ergebnis von `nachweiseErgaenzen` an: neue Nachweise anfügen, erweiterte verlängern. */
export function ergaenzungAnwenden<T extends Pick<LeistungsnachweisDaten, 'nachweise'>>(
  daten: T,
  ergaenzung: Ergaenzung,
  jetzt: string,
): T {
  if (ergaenzung.neu.length === 0 && ergaenzung.erweitert.length === 0) return daten;
  const erweitert = new Map(ergaenzung.erweitert.map((e) => [e.id, e]));
  const vorhanden = new Set(daten.nachweise.map((n) => n.id));
  return {
    ...daten,
    nachweise: [
      ...daten.nachweise.map((n) => {
        const e = erweitert.get(n.id);
        return e ? { ...n, von: e.von, bis: e.bis, geaendert: jetzt } : n;
      }),
      ...ergaenzung.neu.filter((n) => !vorhanden.has(n.id)),
    ],
  };
}

/**
 * Sorgt dafür, dass die Tage des Projekts in einem Nachweis liegen: rechnet
 * `nachweiseErgaenzen` und wendet das Ergebnis an. Liefert den neuen Bestand
 * und die Ergänzung (etwa für eine Meldung „… angelegt“).
 */
export function nachweiseSichern(
  daten: LeistungsnachweisDaten,
  projektId: ID,
  tage: ISODate[],
  jetzt: string,
  neueId: () => ID,
): { daten: LeistungsnachweisDaten; ergaenzung: Ergaenzung } {
  const projekt = daten.projekte.find((p) => p.id === projektId);
  if (!projekt || tage.length === 0) return { daten, ergaenzung: { neu: [], erweitert: [] } };
  const ergaenzung = nachweiseErgaenzen(daten, projekt, tage, jetzt, neueId);
  return { daten: ergaenzungAnwenden(daten, ergaenzung, jetzt), ergaenzung };
}

/* ------------------------------------------------------------------ */
/* Neuer Leistungsnachweis für alle nicht abgerechneten Leistungen     */
/* ------------------------------------------------------------------ */

/** Was „Neuer Leistungsnachweis“ (Controlling) für ein Projekt umfasst – `nichtAbgerechnet`. */
export interface NichtAbgerechnet {
  /**
   * Nicht abgerechnete Leistungen nach dem letzten abgeschlossenen Nachweis und
   * die in dessen offenen Nachfolgern – sie kommen hinein.
   */
  leistungen: Leistung[];
  /** Offene Nachweise nach dem letzten abgeschlossenen – sie gehen im neuen auf. */
  offene: Leistungsnachweis[];
  /**
   * Nicht erfasst: Leistungen vor dem letzten abgeschlossenen Nachweis, die in
   * keinem abgerechneten Stand stehen und in keinem offenen Nachweis liegen –
   * etwa nach dem Abschluss nachgetragen. Sie kommen nur nach Rückfrage hinein
   * (als nachgereichte, `nachreichen`).
   */
  nichtErfasst: Leistung[];
  /**
   * Zeitraum bis zum Abschluss: ab dem Tag nach dem letzten abgeschlossenen Nachweis (sonst ab der ersten Leistung)
   * bis zum Ende des laufenden Monats, mindestens bis zur letzten Leistung bzw. zum Ende der offenen Nachweise.
   */
  von: ISODate;
  bis: ISODate;
  /** Liegen schon alle in genau einem offenen Nachweis, gibt es nichts anzulegen – das ist er. */
  vorhanden: Leistungsnachweis | null;
}

/**
 * Kennungen der abgerechneten Leistungen eines Projekts: die im
 * festgeschriebenen Stand der abgeschlossenen Nachweise. Fehlen dort die
 * Kennungen (ältere Stände), gelten die Leistungen des Nachweises.
 */
export function abgerechneteLeistungen(daten: LeistungsnachweisDaten, projektId: ID): Set<ID> {
  const ids = new Set<ID>();
  for (const n of daten.nachweise) {
    if (n.projektId !== projektId || n.status !== 'abgeschlossen') continue;
    const ausStand = n.stand ? n.stand.zeilen.flatMap((z) => z.leistungIds) : [];
    const ohneKennungen = !n.stand || (ausStand.length === 0 && n.stand.zeilen.some((z) => z.stunden !== 0));
    for (const id of ohneKennungen ? leistungenDesNachweises(daten, n).map((l) => l.id) : ausStand) ids.add(id);
  }
  return ids;
}

/**
 * Alle nicht abgerechneten Leistungen eines Projekts für einen neuen
 * Leistungsnachweis – ohne Zeitraum aus der Oberfläche: Er beginnt am Tag nach
 * dem letzten abgeschlossenen Nachweis (ohne einen mit der ersten Leistung bzw.
 * dem ersten offenen Nachweis, spätestens am Monatsanfang) und reicht bis zum
 * Ende des laufenden Monats, mindestens bis zur letzten Leistung; sein Ende
 * legt erst das Erstellen fest (`abschlussZeitraum`). Offene Nachweise in
 * diesem Bereich gehen darin auf. Was davor liegt und nirgends erfasst ist,
 * nennt `nichtErfasst`. Rein.
 */
export function nichtAbgerechnet(daten: LeistungsnachweisDaten, projektId: ID, heute: ISODate): NichtAbgerechnet {
  const alle = nachweiseVon(daten, projektId);
  const abgeschlossen = alle.filter((n) => n.status === 'abgeschlossen');
  const letztesEnde = abgeschlossen.reduce<ISODate | null>((m, n) => (!m || n.bis > m ? n.bis : m), null);
  const grenze = letztesEnde ? addDays(letztesEnde, 1) : null;
  const offene = alle.filter((n) => n.status === 'entwurf' && (!grenze || n.von >= grenze));
  const inOffenen = new Set(offene.flatMap((n) => leistungenDesNachweises(daten, n).map((l) => l.id)));
  const abgerechnet = abgerechneteLeistungen(daten, projektId);
  const offen = daten.leistungen.filter((l) => l.projektId === projektId && !abgerechnet.has(l.id)).sort(nachDatum);
  const leistungen = offen.filter((l) => !grenze || l.datum >= grenze || inOffenen.has(l.id));
  const nichtErfasst = grenze
    ? offen.filter((l) => {
        if (l.datum >= grenze || inOffenen.has(l.id)) return false;
        const n = nachweisDerLeistung(daten, l);
        return !n || n.status === 'abgeschlossen';
      })
    : [];
  const von = grenze ?? [...leistungen.map((l) => l.datum), ...offene.map((n) => n.von), monatsanfang(heute)].sort()[0];
  // Nach dem letzten abgeschlossenen liegen nur die offenen, die darin aufgehen – das Ende überschneidet nichts
  const bis =
    [monatsende(heute), von, ...leistungen.filter((l) => l.datum >= von).map((l) => l.datum), ...offene.map((n) => n.bis)]
      .sort()
      .at(-1) ?? von;
  const einziger = offene.length === 1 ? offene[0] : null;
  const darin = einziger ? new Set(leistungenDesNachweises(daten, einziger).map((l) => l.id)) : null;
  const vorhanden = einziger && darin && leistungen.every((l) => darin.has(l.id)) ? einziger : null;
  return { leistungen, offene, nichtErfasst, von, bis, vorhanden };
}

/**
 * Zwei bearbeitete Texte derselben Zeile verbinden (beim Zusammenfassen offener
 * Nachweise): der frühere vorn, der spätere mit „, “ dahinter – ohne Teile, die
 * schon im früheren vorkommen; die Kennungen beider zählen als bekannt
 * (`neueLeistungenSeitText`).
 */
export function texteVerbinden(frueher: ZeilenText, spaeter: ZeilenText): ZeilenText {
  const fehlend = textTeile(spaeter.text).filter((teil) => !kommtVor(frueher.text, teil));
  const basis = frueher.text.replace(/\s+$/, '');
  return {
    text: fehlend.length === 0 ? frueher.text : basis ? `${basis}, ${fehlend.join(', ')}` : fehlend.join(', '),
    leistungIds: [...new Set([...frueher.leistungIds, ...spaeter.leistungIds])],
  };
}

/** Nimmt Kennungen in `nachgereicht` auf – ohne doppelte. */
const mitNachgereichten = (n: Leistungsnachweis, ids: ID[]): ID[] => [...new Set([...n.nachgereicht, ...ids])];

/**
 * Gesamtaufschläge offener Nachweise, die in einem aufgehen: keiner bzw. nur
 * einer – der; alle mit denselben Prozent – diese; alle in Stunden – die
 * Summe; sonst (verschiedene Prozent bzw. gemischt) die Stunden, die sie
 * bisher wirkten (`gesamtAufschlagWirkung`), als Stunden zusammen.
 */
function gesamtAufschlaegeVereinen(daten: LeistungsnachweisDaten, nachweise: Leistungsnachweis[]): GesamtAufschlag | null {
  const mit = nachweise.flatMap((n) => {
    const g = gesamtAufschlagNormal(n.gesamtAufschlag);
    return g ? [{ n, g }] : [];
  });
  if (mit.length <= 1) return mit[0]?.g ?? null;
  const erster = mit[0].g;
  if (mit.every(({ g }) => g.art === 'prozent' && g.wert === erster.wert && erster.art === 'prozent')) return erster;
  const stunden = mit.every(({ g }) => g.art === 'stunden')
    ? mit.reduce((s, { g }) => s + g.wert, 0)
    : mit.reduce((s, { n }) => s + gesamtAufschlagWirkung(nachweisZeilen(daten, n)), 0);
  return gesamtAufschlagNormal({ art: 'stunden', wert: stunden });
}

/**
 * Inhalte offener Nachweise, die in `basis` aufgehen (`weitere` in zeitlicher
 * Reihenfolge): bearbeitete Texte derselben Zeile verbunden (`texteVerbinden`),
 * Aufschläge summiert, Gesamtaufschläge vereint (`gesamtAufschlaegeVereinen`),
 * Bemerkungen ohne doppelte, nachgereichte Leistungen aller samt `dazu`.
 */
function offeneVereinen(
  daten: LeistungsnachweisDaten,
  basis: Leistungsnachweis,
  weitere: Leistungsnachweis[],
  dazu: ID[] = [],
): Pick<Leistungsnachweis, 'texte' | 'aufschlaege' | 'gesamtAufschlag' | 'bemerkung' | 'nachgereicht'> {
  const texte = { ...basis.texte };
  const aufschlaege = { ...basis.aufschlaege };
  for (const w of weitere) {
    for (const [k, v] of Object.entries(w.texte)) texte[k] = texte[k] ? texteVerbinden(texte[k], v) : v;
    for (const [k, v] of Object.entries(w.aufschlaege)) {
      const summe = runden((aufschlaege[k] ?? 0) + v);
      if (summe === 0) delete aufschlaege[k];
      else aufschlaege[k] = summe;
    }
  }
  const gesamtAufschlag = gesamtAufschlaegeVereinen(daten, [basis, ...weitere]);
  const bemerkung = [...new Set([basis, ...weitere].map((n) => n.bemerkung.trim()).filter(Boolean))].join('\n');
  const nachgereicht = mitNachgereichten(basis, [...weitere.flatMap((w) => w.nachgereicht), ...dazu]);
  return { texte, aufschlaege, gesamtAufschlag, bemerkung, nachgereicht };
}

/**
 * Legt für alle nicht abgerechneten Leistungen des Projekts einen
 * Leistungsnachweis an (`nichtAbgerechnet`) – rein; so arbeitet
 * `nachweisFuerNichtAbgerechnete` im Store. Gibt es offene Nachweise, wird der
 * erste erweitert und nimmt Leistungstexte, Aufschläge (summiert),
 * Gesamtaufschläge (`gesamtAufschlaegeVereinen`), Bemerkungen und
 * nachgereichte Leistungen der übrigen auf, die entfallen –
 * bearbeitete Texte derselben Zeile werden in zeitlicher Reihenfolge verbunden
 * (`texteVerbinden`); sonst entsteht ein neuer mit der Kennung `id`. Er läuft
 * bis zum Abschluss (ein festgelegtes Ende, `bisFest`, entfällt). Raster und – wenn angegeben –
 * Überschrift kommen aus dem Dialog. Mit `nachreichen` (nach der Rückfrage)
 * kommen die nicht erfassten Leistungen als nachgereichte hinzu. Liegt schon
 * alles in genau einem offenen Nachweis, ändert sich nur das (`nachreichenAnwenden`).
 */
export function nachweisFuerNichtAbgerechneteAnwenden(
  daten: LeistungsnachweisDaten,
  projektId: ID,
  vorgaben: { raster: Raster; titel: string; nachreichen?: boolean },
  id: ID,
  jetzt: string,
): LeistungsnachweisDaten {
  const projekt = daten.projekte.find((p) => p.id === projektId);
  if (!projekt) return daten;
  const plan = nichtAbgerechnet(daten, projektId, tagVon(jetzt));
  if (plan.vorhanden) return vorgaben.nachreichen ? nachreichenAnwenden(daten, plan.vorhanden.id, jetzt) : daten;
  const [erster, ...weitere] = plan.offene;
  const basis = erster ?? neuerNachweis(id, projekt, plan.von, plan.bis, jetzt);
  const neu: Leistungsnachweis = {
    ...basis,
    von: plan.von,
    bis: plan.bis,
    bisFest: false,
    raster: vorgaben.raster,
    titel: vorgaben.titel.trim() || basis.titel,
    ...offeneVereinen(daten, basis, weitere, vorgaben.nachreichen ? plan.nichtErfasst.map((l) => l.id) : []),
    geaendert: jetzt,
  };
  const weg = new Set(weitere.map((w) => w.id));
  const nachweise = daten.nachweise.filter((n) => !weg.has(n.id)).map((n) => (n.id === neu.id ? neu : n));
  return { ...daten, nachweise: erster ? nachweise : [...nachweise, neu] };
}

/**
 * Übernimmt die nicht erfassten Leistungen des Projekts (`nichtAbgerechnet`)
 * als nachgereichte in den offenen Nachweis – nur in einen offenen nach dem
 * letzten abgeschlossenen. Rein; so arbeitet `leistungenNachreichen` im Store.
 */
export function nachreichenAnwenden(daten: LeistungsnachweisDaten, nachweisId: ID, jetzt: string): LeistungsnachweisDaten {
  const n = daten.nachweise.find((x) => x.id === nachweisId);
  if (!n || n.status !== 'entwurf') return daten;
  const plan = nichtAbgerechnet(daten, n.projektId, tagVon(jetzt));
  if (!plan.offene.some((o) => o.id === n.id) || plan.nichtErfasst.length === 0) return daten;
  const neu = { ...n, nachgereicht: mitNachgereichten(n, plan.nichtErfasst.map((l) => l.id)), geaendert: jetzt };
  return { ...daten, nachweise: daten.nachweise.map((x) => (x.id === n.id ? neu : x)) };
}

/* ------------------------------------------------------------------ */
/* Laufende Nachweise                                                  */
/* ------------------------------------------------------------------ */

/**
 * Läuft der Nachweis bis zum Abschluss? Offen und ohne von Hand festgelegtes
 * Ende (`bisFest`) – dann wächst er mit neuen Leistungen mit
 * (`nachweiseErgaenzen`), und sein Zeitraum steht erst beim Erstellen fest
 * (`abschlussZeitraum`). Seit Fassung 9 gilt das in jedem Projekt – einen
 * Abrechnungsrhythmus gibt es nicht mehr. Ein festgelegtes Ende bewirkt also
 * bei jedem offenen Nachweis etwas.
 */
export function laeuftBisAbschluss(n: Pick<Leistungsnachweis, 'status' | 'bisFest'>): boolean {
  return n.status === 'entwurf' && !n.bisFest;
}

/**
 * Fassung 8 → 9 (`migriere` in store/storage.ts): Ohne Abrechnungsrhythmus
 * läuft je Projekt ein offener Nachweis, bis das Controlling ihn erstellt.
 * Folgen offene Nachweise ohne festgelegtes Ende (`laeuftBisAbschluss`)
 * unmittelbar aufeinander – kein anderer Nachweis dazwischen, etwa nach dem
 * Rhythmus „Monatlich“ einer je Monat –, gehen sie im ersten auf: Er reicht
 * bis zum Ende des letzten und nimmt Leistungstexte, Aufschläge,
 * Gesamtaufschläge, Bemerkungen und nachgereichte Leistungen der übrigen auf
 * (`offeneVereinen`, wie „Neuer Leistungsnachweis“); Raster und Überschrift
 * bleiben die des ersten, `geaendert` wird der jüngste der beteiligten.
 * Abgeschlossene Nachweise und solche mit festgelegtem Ende (`bisFest`)
 * bleiben, wie sie sind, und trennen. Die gemeinsamen Texte und Bestätigungen
 * zieht der Aufrufer nach (`periodentexteNachziehen`,
 * `bestaetigungenNachziehen` in domain/erfassung.ts). Rein; ohne Änderung
 * derselbe Bestand.
 */
export function laufendeZusammenfuehren(daten: LeistungsnachweisDaten): LeistungsnachweisDaten {
  const ersetzt = new Map<ID, Leistungsnachweis>();
  const weg = new Set<ID>();
  for (const projektId of new Set(daten.nachweise.map((n) => n.projektId))) {
    const eigene = nachweiseVon(daten, projektId);
    for (let i = 0; i < eigene.length; ) {
      if (!laeuftBisAbschluss(eigene[i])) {
        i++;
        continue;
      }
      let j = i + 1;
      while (j < eigene.length && laeuftBisAbschluss(eigene[j])) j++;
      if (j - i > 1) {
        const [basis, ...weitere] = eigene.slice(i, j);
        const bis = weitere.reduce((m, w) => (w.bis > m ? w.bis : m), basis.bis);
        const geaendert = weitere.reduce((m, w) => (w.geaendert > m ? w.geaendert : m), basis.geaendert);
        ersetzt.set(basis.id, { ...basis, bis, ...offeneVereinen(daten, basis, weitere), geaendert });
        for (const w of weitere) weg.add(w.id);
      }
      i = j;
    }
  }
  if (ersetzt.size === 0) return daten;
  return { ...daten, nachweise: daten.nachweise.filter((n) => !weg.has(n.id)).map((n) => ersetzt.get(n.id) ?? n) };
}

/* ------------------------------------------------------------------ */
/* Übersicht des Controllings                                          */
/* ------------------------------------------------------------------ */

/** Offene Nachweise des Projekts (in Bearbeitung), nach `von` aufsteigend. */
export function offeneNachweise(daten: LeistungsnachweisDaten, projektId: ID): Leistungsnachweis[] {
  return nachweiseVon(daten, projektId).filter((n) => n.status === 'entwurf');
}

/**
 * Nachweis, der für das Projekt gerade ansteht: der früheste offene, sonst der
 * jüngste abgeschlossene (mit dem spätesten Zeitraum), sonst null.
 */
export function aktuellerNachweis(daten: LeistungsnachweisDaten, projektId: ID): Leistungsnachweis | null {
  const alle = nachweiseVon(daten, projektId);
  return alle.find((n) => n.status === 'entwurf') ?? alle.filter((n) => n.status === 'abgeschlossen').at(-1) ?? null;
}

/* ------------------------------------------------------------------ */
/* Abschließen                                                         */
/* ------------------------------------------------------------------ */

/** Lokales Datum (JJJJ-MM-TT) eines Zeitpunkts (ISO). */
export function tagVon(zeitpunkt: string): ISODate {
  const d = new Date(zeitpunkt);
  return Number.isNaN(d.getTime()) ? zeitpunkt.slice(0, 10) : toISO(d);
}

/**
 * Bereich, in dem das Enddatum beim Erstellen liegen darf („Leistungen bis
 * einschließlich …“): ab dem Beginn des Nachweises bis heute, höchstens bis
 * zu seinem bisherigen Ende – so wächst er nie und überschneidet keinen
 * anderen. null, wenn der Bereich leer ist (der Nachweis beginnt nach heute).
 */
export function abschlussEndeBereich(n: Pick<Leistungsnachweis, 'von' | 'bis'>, heute: ISODate): { von: ISODate; bis: ISODate } | null {
  const bis = n.bis < heute ? n.bis : heute;
  return n.von <= bis ? { von: n.von, bis } : null;
}

/** Liegt `bis` im erlaubten Bereich des Enddatums (`abschlussEndeBereich`)? */
export function abschlussEndeGueltig(n: Pick<Leistungsnachweis, 'von' | 'bis'>, heute: ISODate, bis: ISODate): boolean {
  const bereich = abschlussEndeBereich(n, heute);
  return !!bereich && istDatum(bis) && bis >= bereich.von && bis <= bereich.bis;
}

/** Ein wählbares Ende beim Abschließen (`abschlussEnden`). */
export interface AbschlussEnde {
  bis: ISODate;
  /** `monatsende` – Ende eines Kalendermonats; `heute`; `nachweisende` – das bisherige Ende des Nachweises vor heute (etwa von Hand festgelegt, `bisFest`). */
  art: 'monatsende' | 'heute' | 'nachweisende';
}

/**
 * Was beim Abschließen als Ende zur Wahl steht – statt eines freien Datums:
 * jedes Monatsende im erlaubten Bereich (`abschlussEndeBereich`: ab dem
 * Beginn bis heute, höchstens bis zum bisherigen Ende), dazu dessen letzter
 * Tag, wenn er kein Monatsende ist – heute bzw. das bisherige Ende des
 * Nachweises. Aufsteigend; leer, wenn der Bereich leer ist. So schließt das
 * Controlling „bis Ende Oktober“ ab, und der Rest läuft im nächsten
 * Nachweis weiter.
 */
export function abschlussEnden(n: Pick<Leistungsnachweis, 'von' | 'bis' | 'bisFest'>, heute: ISODate): AbschlussEnde[] {
  const bereich = abschlussEndeBereich(n, heute);
  if (!bereich) return [];
  const enden: AbschlussEnde[] = [];
  for (let monat = monatsanfang(bereich.von); monatsende(monat) <= bereich.bis; monat = addDays(monatsende(monat), 1)) {
    enden.push({ bis: monatsende(monat), art: 'monatsende' });
  }
  if (enden.at(-1)?.bis !== bereich.bis) enden.push({ bis: bereich.bis, art: bereich.bis === heute ? 'heute' : 'nachweisende' });
  return enden;
}

/**
 * Vorgeschlagenes Ende beim Abschließen (`abschlussEnden`): das letzte
 * Monatsende – meist das Ende des Vormonats –, sonst das einzige wählbare
 * Ende; null, wenn keines wählbar ist.
 */
export function abschlussVorschlag(n: Pick<Leistungsnachweis, 'von' | 'bis' | 'bisFest'>, heute: ISODate): ISODate | null {
  const enden = abschlussEnden(n, heute);
  return [...enden].reverse().find((e) => e.art === 'monatsende')?.bis ?? enden.at(-1)?.bis ?? null;
}

/** Leistungen im Zeitraum des Nachweises, nach Datum – ohne nachgereichte (sie liegen davor). */
const laufendeLeistungen = (daten: LeistungsnachweisDaten, n: Leistungsnachweis): Leistung[] =>
  leistungenDesNachweises(daten, n).filter((l) => imZeitraum(l.datum, n.von, n.bis));

/**
 * Ende eines Nachweises beim Abschließen – erst hier steht sein Zeitraum
 * fest:
 * * Mit `bis` (ein Monatsende oder heute, `abschlussEnden`) im erlaubten Bereich
 *   (`abschlussEndeGueltig`: ab dem Beginn bis heute, höchstens bis zum
 *   bisherigen Ende) endet er dort – auch mit von Hand festgelegtem Ende.
 * * Ohne `bis` (oder mit einem ungültigen): Läuft er bis zum Abschluss
 *   (`laeuftBisAbschluss` – offen, kein von Hand festgelegtes Ende), endet er
 *   am letzten Tag mit Leistungen in ihm, spätestens heute (ohne Leistungen
 *   heute) – nie später als bisher und nie vor seinem Beginn. Sonst bleibt
 *   `bis`.
 * Dazu die Leistungen, die danach liegen (`spaetere`) und deshalb in einen
 * neuen offenen Nachweis kommen; nachgereichte liegen davor und bleiben.
 */
export function abschlussZeitraum(
  daten: LeistungsnachweisDaten,
  n: Leistungsnachweis,
  heute: ISODate,
  bis?: ISODate,
): { bis: ISODate; gekuerzt: boolean; spaetere: Leistung[] } {
  const leistungen = laufendeLeistungen(daten, n);
  if (bis !== undefined && abschlussEndeGueltig(n, heute, bis)) {
    if (bis === n.bis) return { bis: n.bis, gekuerzt: false, spaetere: [] };
    return { bis, gekuerzt: true, spaetere: leistungen.filter((l) => l.datum > bis) };
  }
  if (!laeuftBisAbschluss(n)) return { bis: n.bis, gekuerzt: false, spaetere: [] };
  const letzte = leistungen.length ? leistungen[leistungen.length - 1].datum : null;
  const ende = letzte && letzte < heute ? letzte : heute;
  if (ende < n.von || ende >= n.bis) return { bis: n.bis, gekuerzt: false, spaetere: [] };
  return { bis: ende, gekuerzt: true, spaetere: leistungen.filter((l) => l.datum > ende) };
}

/**
 * Erstellt (schließt) einen Nachweis ab – rein; so arbeitet
 * `nachweisAbschliessen` im Store: Zeitraum nach `abschlussZeitraum` (mit dem
 * gewählten Ende `bis`, sonst bis zum letzten Tag mit Leistungen), Stand
 * festschreiben (mit Aufschlägen und Gesamtaufschlag), Status abgeschlossen.
 * Leistungen nach einem gekürzten Ende erhalten gleich einen neuen offenen
 * Nachweis (`nachweiseSichern`, Kennungen über `neueId`) – dort landen auch
 * später erfasste Leistungen dieser Tage. Ein abgeschlossener Nachweis bleibt
 * unverändert.
 */
export function nachweisAbschliessenAnwenden(
  daten: LeistungsnachweisDaten,
  id: ID,
  jetzt: string,
  neueId: () => ID,
  bis?: ISODate,
): LeistungsnachweisDaten {
  const n = daten.nachweise.find((x) => x.id === id);
  if (!n || n.status !== 'entwurf') return daten;
  const zeitraum = abschlussZeitraum(daten, n, tagVon(jetzt), bis);
  const gekuerzterNachweis: Leistungsnachweis = zeitraum.gekuerzt ? { ...n, bis: zeitraum.bis } : n;
  const zwischen = zeitraum.gekuerzt ? { ...daten, nachweise: daten.nachweise.map((x) => (x.id === id ? gekuerzterNachweis : x)) } : daten;
  const zu: Leistungsnachweis = {
    ...gekuerzterNachweis,
    status: 'abgeschlossen',
    abgeschlossen: jetzt,
    geaendert: jetzt,
    stand: standErzeugen(zwischen, gekuerzterNachweis),
  };
  const ergebnis = { ...zwischen, nachweise: zwischen.nachweise.map((x) => (x.id === id ? zu : x)) };
  if (zeitraum.spaetere.length === 0) return ergebnis;
  return nachweiseSichern(ergebnis, n.projektId, zeitraum.spaetere.map((l) => l.datum), jetzt, neueId).daten;
}

/* ------------------------------------------------------------------ */
/* Nach jeder Änderung                                                 */
/* ------------------------------------------------------------------ */

/**
 * Läuft nach jeder Änderung (`mutate` im Store): entfernt Nachweise ohne
 * Projekt und setzt `geaendert` an geänderten Nachweisen – auch an solchen in
 * Bearbeitung, in deren Zeitraum sich Leistungen oder gemeinsame
 * Leistungstexte (`periodentexte`) geändert haben. Bearbeitete
 * Texte bleiben stehen, auch wenn ihre Zeile gerade keine Leistungen hat oder
 * außerhalb des Zeitraums liegt: Kehrt sie zurück, erscheint der Text wieder.
 * Ohne `zeitstempel` (Einspielen, Zurücksetzen) bleiben die Zeitpunkte unberührt.
 */
export function nachweiseBereinigen(
  alt: LeistungsnachweisDaten,
  neu: LeistungsnachweisDaten,
  jetzt: string,
  zeitstempel = true,
): LeistungsnachweisDaten {
  const projektIds = new Set(neu.projekte.map((p) => p.id));
  const ohneProjekt = neu.nachweise.some((n) => !projektIds.has(n.projektId));
  if (!zeitstempel) return ohneProjekt ? { ...neu, nachweise: neu.nachweise.filter((n) => projektIds.has(n.projektId)) } : neu;

  // Tage mit geänderten, neuen oder entfernten Leistungen
  const betroffen: { projektId: ID; von: ISODate; bis: ISODate }[] = [];
  const tag = (l: Pick<Leistung, 'projektId' | 'datum'>) => ({ projektId: l.projektId, von: l.datum, bis: l.datum });
  if (alt.leistungen !== neu.leistungen) {
    const alteLeistungen = new Map(alt.leistungen.map((l) => [l.id, l]));
    const bleiben = new Set<ID>();
    for (const l of neu.leistungen) {
      const a = alteLeistungen.get(l.id);
      bleiben.add(l.id);
      if (a === l) continue;
      betroffen.push(tag(l));
      if (a) betroffen.push(tag(a));
    }
    for (const a of alt.leistungen) if (!bleiben.has(a.id)) betroffen.push(tag(a));
  }
  // Geänderte gemeinsame Leistungstexte ändern die Zeilentexte der Nachweise ihres Zeitraums
  if (alt.periodentexte !== neu.periodentexte) {
    const schluessel = (t: { projektId: ID; schluessel: string }) => `${t.projektId}\u0000${t.schluessel}`;
    const vorher = new Map((alt.periodentexte ?? []).map((t) => [schluessel(t), t]));
    const nachher = new Map((neu.periodentexte ?? []).map((t) => [schluessel(t), t]));
    for (const k of new Set([...vorher.keys(), ...nachher.keys()])) {
      const a = vorher.get(k);
      const b = nachher.get(k);
      if (a && b && a.text === b.text) continue;
      const t = (b ?? a)!;
      const p = erfassungsPeriodeAusSchluessel(t.schluessel);
      if (p) betroffen.push({ projektId: t.projektId, von: p.von, bis: p.bis });
    }
  }

  const vorher = new Map(alt.nachweise.map((n) => [n.id, n]));
  let geaendert = ohneProjekt;
  const nachweise = neu.nachweise
    .filter((n) => projektIds.has(n.projektId))
    .map((n) => {
      const a = vorher.get(n.id);
      if (!a || n.geaendert === jetzt) return n;
      // Selbst geändert, ohne dass die Aktion den Zeitpunkt gesetzt hat
      const selbst = a !== n && a.geaendert === n.geaendert;
      const inhalt =
        n.status === 'entwurf' && betroffen.some((b) => b.projektId === n.projektId && b.von <= n.bis && n.von <= b.bis);
      if (!selbst && !inhalt) return n;
      geaendert = true;
      return { ...n, geaendert: jetzt };
    });
  return geaendert ? { ...neu, nachweise } : neu;
}

/* ------------------------------------------------------------------ */
/* Umstellung älterer Bestände                                         */
/* ------------------------------------------------------------------ */

/**
 * Aufschläge einer bis Fassung 5 gemischten Zeile (laufende und nachgereichte
 * Leistungen derselben Woche bzw. desselben Monats unter einem Schlüssel) auf
 * die heutige laufende und die nachgereichte Zeile aufteilen – so, dass beide
 * zusammen abgerechnet ergeben, was die alte Zeile ergab. `vorher` sind die
 * erfassten Stunden je Abschnitt der alten Zeile in deren Reihenfolge (nach
 * ihr mindert `abrechnen` einen Abzug auf die ganze Zeile).
 *
 * * Mit Abschnittsspalten bleibt jede Spalte, wie sie war: Ihre Abweichung in
 *   der alten Zeile (abgerechnet − erfasst) wird zum Aufschlag auf den
 *   Abschnitt bzw. auf „ohne“ (`OHNE_ABSCHNITT`, mindert dann nur „ohne“). Ein
 *   Zuschlag geht an die laufende Zeile – an die nachgereichte, wenn nur sie
 *   Stunden in der Spalte hat –, ein Abzug mindert zuerst die laufende bis 0,
 *   den Rest die nachgereichte. Ein Abzug auf die ganze Zeile wird so zu
 *   Abzügen auf die Spalten, die er traf.
 * * Ohne Abschnittsspalten wirkt nur der Aufschlag auf die ganze Zeile: bei
 *   der laufenden; ein Abzug mindert sie höchstens bis 0, den Rest die
 *   nachgereichte. (Spalten zeigt ein solcher Nachweis nicht.)
 *
 * Aufschläge, die nicht wirken (`aufschlaegeDerZeile`), bleiben, wo sie sind.
 * Hat die nachgereichte Zeile schon Aufschläge, ist die Zeile bereits
 * aufgeteilt und bleibt unverändert. Liefert alle Aufschläge des Nachweises.
 */
function aufschlaegeAufteilen(
  aufschlaege: Record<string, number>,
  laufend: Pick<NachweisZeile, 'schluessel' | 'stundenJeAbschnitt'>,
  nachgereicht: Pick<NachweisZeile, 'schluessel' | 'stundenJeAbschnitt'>,
  vorher: Record<string, number>,
  abschnittIds: Set<ID>,
  spalten: boolean,
): Record<string, number> {
  const L = laufend.schluessel;
  const N = nachgereicht.schluessel;
  const wirkend = aufschlaegeDerZeile(aufschlaege, L, abschnittIds, spalten);
  if (Object.keys(wirkend).length === 0 || Object.keys(aufschlaege).some((k) => k.startsWith(`${N}|`))) return aufschlaege;
  const ergebnis = { ...aufschlaege };
  for (const a of Object.keys(wirkend)) delete ergebnis[`${L}|${a}`];
  const setzen = (zeile: string, a: string, wert: number) => {
    const w = runden(wert);
    if (w !== 0) ergebnis[`${zeile}|${a}`] = w;
  };
  const hL = laufend.stundenJeAbschnitt;
  const hN = nachgereicht.stundenJeAbschnitt;

  if (spalten) {
    const alt = abrechnen(vorher, wirkend).abgerechnetJeAbschnitt;
    for (const a of new Set([...Object.keys(alt), ...Object.keys(hL), ...Object.keys(hN)])) {
      const l = Math.max(0, hL[a] ?? 0);
      const m = Math.max(0, hN[a] ?? 0);
      const abweichung = runden((alt[a] ?? 0) - l - m);
      if (abweichung > 0) setzen(l <= 0 && m > 0 ? N : L, a, abweichung);
      else if (abweichung < 0) {
        const vonL = Math.min(l, -abweichung);
        setzen(L, a, -vonL);
        setzen(N, a, abweichung + vonL);
      }
    }
    return ergebnis;
  }

  const zeile = wirkend[OHNE_ABSCHNITT] ?? 0;
  const erfasstL = runden(Object.values(hL).reduce((s, v) => s + v, 0));
  const hier = zeile > 0 ? zeile : Math.max(zeile, -erfasstL);
  setzen(L, OHNE_ABSCHNITT, hier);
  setzen(N, OHNE_ABSCHNITT, zeile - hier);
  return ergebnis;
}

const gleicheEintraege = <T>(a: Record<string, T>, b: Record<string, T>) => {
  const ka = Object.keys(a);
  return ka.length === Object.keys(b).length && ka.every((k) => k in b && a[k] === b[k]);
};

/**
 * Fassung 5 → 6 (`migriere` in store/storage.ts): Bis Fassung 5 liefen
 * nachgereichte Leistungen unter dem Schlüssel ihrer Periode („W2026-38“) –
 * zusammen mit laufenden derselben Woche bzw. desselben Monats und ohne
 * Kennzeichen. Seitdem bilden sie eigene Zeilen (`NACHGEREICHT_PRAEFIX`,
 * `nachweisZeilen`). Damit bearbeitete Texte und Aufschläge weiter greifen
 * und abgeschlossene Nachweise nicht grundlos als geändert gelten (`standVeraltet`):
 *
 * * Texte und Aufschläge einer Zeile, die heute nur noch als nachgereichte
 *   besteht, ziehen auf deren Schlüssel um.
 * * Gehörte eine Zeile laufenden und nachgereichten Leistungen zugleich
 *   (gemischte Zeile), zieht ein Text auf die nachgereichte um, wenn er nur
 *   nachgereichte Leistungen kennt (`leistungIds`), sonst bleibt er bei der
 *   laufenden. Aufschläge teilt `aufschlaegeAufteilen` auf beide Zeilen auf,
 *   ohne die abgerechneten Stunden zu ändern – mit Abschnittsspalten auch
 *   nicht die einer Spalte.
 * * Im festgeschriebenen Stand wird eine Zeile mit nachgereichten Leistungen
 *   (sie beginnt vor dem Zeitraum) durch die heutigen Zeilen ersetzt, wenn
 *   diese dieselben Leistungen mit denselben erfassten Stunden (auch je
 *   Abschnitt und Mitarbeiter) und denselben abgerechneten enthalten – zeigt
 *   der Stand Abschnittsspalten, auch je Spalte; abgerechnet bleibt, was
 *   abgerechnet war. Sonst wird
 *   eine Zeile nur aus nachgereichten Leistungen bloß gekennzeichnet; eine
 *   gemischte bleibt, wie sie ist (der Nachweis gilt dann zu Recht als geändert).
 */
export function nachgereichteZeilenUmstellen(daten: LeistungsnachweisDaten): LeistungsnachweisDaten {
  let geaendert = false;
  const nachweise = daten.nachweise.map((n) => {
    if (n.nachgereicht.length === 0) return n;
    const projekt = daten.projekte.find((p) => p.id === n.projektId);
    const abschnittIds = new Set((projekt?.abschnitte ?? []).map((a) => a.id));
    const spalten = mitAbschnittsspalten(projekt?.abschnitte ?? []);
    const nachgereichtIds = new Set(n.nachgereicht);
    const heute = new Map(nachweisZeilen(daten, n).map((z) => [z.schluessel, z]));
    const nk = (k: string) => `${NACHGEREICHT_PRAEFIX}${k}`;
    const nurNachgereicht = (k: string) => !k.startsWith(NACHGEREICHT_PRAEFIX) && !heute.has(k) && heute.has(nk(k));
    const gemischt = (k: string) => !k.startsWith(NACHGEREICHT_PRAEFIX) && heute.has(k) && heute.has(nk(k));

    const texte: Record<string, ZeilenText> = {};
    for (const [k, t] of Object.entries(n.texte)) {
      // Ein Text der gemischten Zeile, der nur nachgereichte Leistungen kennt, gehört zu deren Zeile
      const nurZuNachgereichten = t.leistungIds.length > 0 && t.leistungIds.every((id) => nachgereichtIds.has(id));
      const umziehen = (nurNachgereicht(k) || (gemischt(k) && nurZuNachgereichten)) && !(nk(k) in n.texte);
      texte[umziehen ? nk(k) : k] = t;
    }
    let aufschlaege: Record<string, number> = {};
    for (const [k, wert] of Object.entries(n.aufschlaege)) {
      const trenner = k.indexOf('|');
      const zeile = trenner < 0 ? k : k.slice(0, trenner);
      const ziel = trenner >= 0 && nurNachgereicht(zeile) ? `${nk(zeile)}${k.slice(trenner)}` : k;
      aufschlaege[ziel] = ziel in aufschlaege ? runden(aufschlaege[ziel] + wert) : wert;
    }
    const gemischteZeilen = new Set(
      Object.keys(n.aufschlaege)
        .map((k) => k.slice(0, Math.max(0, k.indexOf('|'))))
        .filter((k) => k && gemischt(k)),
    );
    // Erfasste Stunden je Abschnitt der alten gemischten Zeile – in deren Reihenfolge (die der Leistungen)
    const leistungen = gemischteZeilen.size > 0 ? leistungenDesNachweises(daten, n) : [];
    const vorher = (k: string) => {
      const ids = new Set([...heute.get(k)!.leistungIds, ...heute.get(nk(k))!.leistungIds]);
      const je: Record<string, number> = {};
      for (const l of leistungen) if (ids.has(l.id)) addieren(je, spalteDerLeistung(l, abschnittIds), l.stunden);
      return gerundet(je);
    };
    for (const k of gemischteZeilen) {
      aufschlaege = aufschlaegeAufteilen(aufschlaege, heute.get(k)!, heute.get(nk(k))!, vorher(k), abschnittIds, spalten);
    }
    let neu: Leistungsnachweis = { ...n, texte, aufschlaege };

    if (n.status === 'abgeschlossen' && n.stand) {
      const live = nachweisZeilen({ ...daten, nachweise: daten.nachweise.map((x) => (x.id === n.id ? neu : x)) }, neu);
      const standSpalten = mitAbschnittsspalten(n.stand.abschnitte);
      const zeilen = n.stand.zeilen.flatMap((z): NachweisZeile[] => {
        if (z.nachgereicht || z.von >= n.von || !z.leistungIds.some((id) => nachgereichtIds.has(id))) return [z];
        const schluesselN = nk(z.schluessel);
        const gruppe = live.filter((x) => x.schluessel === z.schluessel || x.schluessel === schluesselN);
        // Gleich: dieselben Leistungen mit denselben Stunden je Abschnitt und Mitarbeiter und denselben
        // abgerechneten Stunden – mit Abschnittsspalten (wie der Stand sie zeigt) auch je Spalte
        const gleich =
          gruppe.some((x) => x.schluessel === schluesselN) &&
          gleicheIds(z.leistungIds, gruppe.flatMap((x) => x.leistungIds)) &&
          runden(z.stunden) === summeStunden(gruppe) &&
          runden(z.abgerechnet) === summeAbgerechnet(gruppe) &&
          gleicheWerte(z.stundenJeAbschnitt, summeJe(gruppe.map((x) => x.stundenJeAbschnitt))) &&
          gleicheWerte(z.stundenJeMitarbeiter, summeJe(gruppe.map((x) => x.stundenJeMitarbeiter))) &&
          (!standSpalten || gleicheWerte(z.abgerechnetJeAbschnitt, summeJe(gruppe.map((x) => x.abgerechnetJeAbschnitt))));
        if (gleich) return gruppe;
        return z.leistungIds.every((id) => nachgereichtIds.has(id)) ? [{ ...z, schluessel: schluesselN, nachgereicht: true }] : [z];
      });
      const alt = n.stand.zeilen;
      if (zeilen.length !== alt.length || zeilen.some((z, i) => z !== alt[i])) neu = { ...neu, stand: { ...n.stand, zeilen } };
    }
    const anders = !gleicheEintraege(texte, n.texte) || !gleicheEintraege(aufschlaege, n.aufschlaege) || neu.stand !== n.stand;
    if (!anders) return n;
    geaendert = true;
    return neu;
  });
  return geaendert ? { ...daten, nachweise } : daten;
}
