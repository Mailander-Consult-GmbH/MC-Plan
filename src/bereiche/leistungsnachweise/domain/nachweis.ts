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
 * Nachweise eines Projekts überschneiden sich nie (`ueberschneidung`). Fehlt
 * für Leistungen ein Nachweis, legt `nachweiseErgaenzen` ihn nach der
 * Zeitraumregel (dem Abrechnungsrhythmus) des Projekts an oder verlängert den
 * offenen; stellt das Controlling den Rhythmus um, plant `regelAnwenden` die
 * offenen Nachweise neu. „Neuer
 * Leistungsnachweis“ im Controlling fragt keinen Zeitraum ab: Er umfasst alle
 * nicht abgerechneten Leistungen (`nichtAbgerechnet`,
 * `nachweisFuerNichtAbgerechnete`). Der Zeitraum steht erst beim Abschluss
 * fest – ein laufender Nachweis endet dann am letzten Tag mit Leistungen
 * (`abschlussZeitraum`, `nachweisAbschliessenAnwenden`); abgeschlossene
 * Nachweise wachsen nie.
 *
 * Aufschläge des Controllings (`aufschlaege`, ± Stunden je Zeile und
 * Abschnitt) ändern die erfassten Stunden nicht; jede Zeile weist erfasst,
 * Aufschlag und abgerechnet aus (`abrechnen`).
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
  type Zeitraumregel,
  rhythmusMonate,
} from './types';
import {
  datumText,
  erfassungsPeriode,
  erfassungsPeriodeAusSchluessel,
  imZeitraum,
  istDatum,
  istMonat,
  istWochenende,
  monatsanfang,
  monatsende,
  monatVersetzt,
  periodeKuerzen,
  periodeVon,
  runden,
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

/** Anzahl wirksamer Aufschläge (Einträge ≠ 0) eines Nachweises. */
export function anzahlAufschlaege(n: Pick<Leistungsnachweis, 'aufschlaege'>): number {
  return Object.values(n.aufschlaege).filter((v) => v !== 0).length;
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
 * Aufschlag und abgerechnete Stunden aus `aufschlaege` (`abrechnen`).
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
  return [...gruppen.entries()]
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
 * Zeilen. Die Ansicht „Leistungstexte“ nennt sie je Zeile, die Abrechnung
 * zählt sie (`ueberholtHinweis`, `ueberholtRueckfrage`). Leer bei
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

/** Satz in der Rückfrage „Leistungsnachweis abschließen?“ zu `ueberholteZeilen`; null ohne solche Zeilen. */
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

/** Ganze Monate vom Monat von `a` bis zum Monat von `b`, etwa 2026-10-… → 2027-02-…: 4. */
const monatsAbstand = (a: ISODate, b: ISODate): number =>
  (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12 + Number(b.slice(5, 7)) - Number(a.slice(5, 7));

/**
 * Block aus `monate` Monaten, in dem `tag` liegt – die Blöcke gezählt ab dem
 * Monat von `anker` (`rhythmusAnker`), auch rückwärts für Tage davor:
 * [erster Tag seines ersten Monats, letzter Tag seines letzten]. Mit einem
 * Monat ist das der Kalendermonat des Tages.
 */
export function rhythmusBlock(tag: ISODate, anker: ISODate, monate: number): { von: ISODate; bis: ISODate } {
  const schritte = Math.floor(monatsAbstand(anker, tag) / monate);
  const von = monatVersetzt(anker, schritte * monate);
  return { von, bis: monatsende(monatVersetzt(von, monate - 1)) };
}

/**
 * Erster Tag des Monats, ab dem die Blöcke des Abrechnungsrhythmus eines
 * Projekts zählen: `projekt.rhythmusAb`, sonst der Monat des frühesten
 * Nachweises des Projekts, sonst der von `ersatz` (etwa dem frühesten Tag, der
 * einen Nachweis braucht).
 */
export function rhythmusAnker(
  daten: Pick<LeistungsnachweisDaten, 'nachweise'>,
  projekt: Pick<Projekt, 'id' | 'rhythmusAb'>,
  ersatz: ISODate,
): ISODate {
  if (istMonat(projekt.rhythmusAb)) return `${projekt.rhythmusAb}-01`;
  const erster = daten.nachweise.reduce<ISODate | null>((m, n) => (n.projektId === projekt.id && (!m || n.von < m) ? n.von : m), null);
  return monatsanfang(erster ?? ersatz);
}

/**
 * Nachweise anlegen bzw. erweitern, damit die genannten Tage des Projekts in einem Nachweis liegen –
 * nach `projekt.zeitraumregel`; die Tage der Reihe nach, der früheste zuerst:
 * * „monat“, „zweiMonate“, „quartal“ (N = 1, 2 bzw. 3 Monate, `rhythmusMonate`): ein neuer Nachweis
 *   für den Block aus N Monaten, in dem der Tag liegt. Die Blöcke liegen fest ab Projektbeginn, nicht
 *   am Kalenderquartal: ab `projekt.rhythmusAb`, sonst ab dem Monat des frühesten Nachweises, sonst
 *   ab dem des frühesten Tages (`rhythmusAnker`, `rhythmusBlock`) – auch für Tage davor. Der
 *   Nachweis beginnt frühestens am Tag nach dem vorigen und endet vor dem nächsten, damit er sich
 *   nicht mit vorhandenen überschneidet: Nach einem vorzeitig abgeschlossenen Nachweis bildet der
 *   Rest seines Blocks einen eigenen. Mit N = 1 ist das je Kalendermonat ein Nachweis
 *   [Monatsanfang, Monatsende]. Ein offener Nachweis wird nicht verlängert.
 * * „fortlaufend“: Liegt vor dem Tag der zeitlich letzte Nachweis des Projekts und ist er in
 *   Bearbeitung (und liegt kein anderer dazwischen), wird sein `bis` bis zum Monatsende des Tages
 *   verlängert (gekürzt vor dem nächsten Nachweis); sonst neuer Nachweis ab Monatsanfang. Ein
 *   Nachweis mit von Hand festgelegtem Ende (`bisFest`) wird nicht verlängert.
 * Tage in abgeschlossenen Nachweisen sind bereits abgedeckt. Rein; `neueId` liefert IDs (vorab erzeugt
 * an der Oberfläche oder im Plan).
 */
export function nachweiseErgaenzen(
  daten: Pick<LeistungsnachweisDaten, 'nachweise'>,
  projekt: Projekt,
  tage: ISODate[],
  jetzt: string,
  neueId: () => ID,
): Ergaenzung {
  const monate = rhythmusMonate(projekt.zeitraumregel);
  // Arbeitsstand: die Nachweise des Projekts samt der in diesem Aufruf angelegten bzw. verlängerten
  const stand = daten.nachweise
    .filter((n) => n.projektId === projekt.id)
    .map((n) => ({ id: n.id, von: n.von, bis: n.bis, offen: n.status === 'entwurf' && !n.bisFest, neu: null as Leistungsnachweis | null }));
  const ausgangBis = new Map(stand.map((s) => [s.id, s.bis]));
  const sortiert = [...new Set(tage.filter(istDatum))].sort();
  const anker = monate === null || sortiert.length === 0 ? null : rhythmusAnker(daten, projekt, sortiert[0]);

  for (const tag of sortiert) {
    if (stand.some((s) => imZeitraum(tag, s.von, s.bis))) continue;
    // Nachbarn: der letzte Nachweis vor dem Tag und der erste danach
    let vorher: (typeof stand)[number] | undefined;
    let danach: (typeof stand)[number] | undefined;
    for (const s of stand) {
      if (s.bis < tag && (!vorher || s.bis > vorher.bis)) vorher = s;
      if (s.von > tag && (!danach || s.von < danach.von)) danach = s;
    }
    // Fortlaufend: der Monat des Tages; sonst sein Block im Rhythmus des Projekts
    const block =
      monate === null || anker === null ? { von: monatsanfang(tag), bis: monatsende(tag) } : rhythmusBlock(tag, anker, monate);
    const ende = danach && danach.von <= block.bis ? addDays(danach.von, -1) : block.bis;
    if (monate === null && vorher?.offen) {
      vorher.bis = ende;
      if (vorher.neu) vorher.neu = { ...vorher.neu, bis: ende };
      continue;
    }
    const anfang = vorher && vorher.bis >= block.von ? addDays(vorher.bis, 1) : block.von;
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
   * Zeitraum bis zum Abschluss: ab dem Tag nach dem letzten abgeschlossenen Nachweis (sonst ab der ersten Leistung);
   * bei einer Regel mit Monaten endet er mit einem Block des Rhythmus (`rhythmusBlock`).
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
 * Ende des laufenden Monats, mindestens bis zur letzten Leistung – bei einer
 * Regel mit Monaten bis zum Ende des Blocks im Rhythmus des Projekts, in dem
 * das liegt (`rhythmusBlock`, `rhythmusAnker`), damit es danach im Rhythmus
 * weitergeht; sein Ende legt erst der Abschluss fest (`abschlussZeitraum`). Offene Nachweise in
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
  const spaetestens =
    [monatsende(heute), von, ...leistungen.filter((l) => l.datum >= von).map((l) => l.datum), ...offene.map((n) => n.bis)]
      .sort()
      .at(-1) ?? von;
  // Nach dem letzten abgeschlossenen liegen nur die offenen, die darin aufgehen – das Blockende überschneidet nichts
  const projekt = daten.projekte.find((p) => p.id === projektId);
  const monate = projekt ? rhythmusMonate(projekt.zeitraumregel) : null;
  const bis = projekt && monate !== null ? rhythmusBlock(spaetestens, rhythmusAnker(daten, projekt, von), monate).bis : spaetestens;
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
 * Inhalte offener Nachweise, die in `basis` aufgehen (`weitere` in zeitlicher
 * Reihenfolge): bearbeitete Texte derselben Zeile verbunden (`texteVerbinden`),
 * Aufschläge summiert, Bemerkungen ohne doppelte, nachgereichte Leistungen
 * aller samt `dazu`.
 */
function offeneVereinen(
  basis: Leistungsnachweis,
  weitere: Leistungsnachweis[],
  dazu: ID[] = [],
): Pick<Leistungsnachweis, 'texte' | 'aufschlaege' | 'bemerkung' | 'nachgereicht'> {
  const texte = { ...basis.texte };
  const aufschlaege = { ...basis.aufschlaege };
  for (const w of weitere) {
    for (const [k, v] of Object.entries(w.texte)) texte[k] = texte[k] ? texteVerbinden(texte[k], v) : v;
    for (const [k, v] of Object.entries(w.aufschlaege)) aufschlaege[k] = runden((aufschlaege[k] ?? 0) + v);
  }
  const bemerkung = [...new Set([basis, ...weitere].map((n) => n.bemerkung.trim()).filter(Boolean))].join('\n');
  const nachgereicht = mitNachgereichten(basis, [...weitere.flatMap((w) => w.nachgereicht), ...dazu]);
  return { texte, aufschlaege, bemerkung, nachgereicht };
}

/**
 * Legt für alle nicht abgerechneten Leistungen des Projekts einen
 * Leistungsnachweis an (`nichtAbgerechnet`) – rein; so arbeitet
 * `nachweisFuerNichtAbgerechnete` im Store. Gibt es offene Nachweise, wird der
 * erste erweitert und nimmt Leistungstexte, Aufschläge (summiert),
 * Bemerkungen und nachgereichte Leistungen der übrigen auf, die entfallen –
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
    ...offeneVereinen(basis, weitere, vorgaben.nachreichen ? plan.nichtErfasst.map((l) => l.id) : []),
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
/* Abrechnungsrhythmus umstellen                                       */
/* ------------------------------------------------------------------ */

/**
 * Monat (JJJJ-MM), ab dem die Blöcke nach einem Wechsel auf eine Regel mit
 * Monaten zählen (`Projekt.rhythmusAb`): der des frühesten offenen Nachweises
 * ohne festgelegtes Ende, sonst der Monat nach dem Ende des letzten Nachweises,
 * sonst der der frühesten Leistung des Projekts, sonst der von `jetzt`.
 */
function rhythmusAbBeimUmstellen(daten: LeistungsnachweisDaten, projektId: ID, eigene: Leistungsnachweis[], jetzt: string): string {
  const offen = eigene.find((n) => n.status === 'entwurf' && !n.bisFest);
  if (offen) return offen.von.slice(0, 7);
  const letztesEnde = eigene.reduce<ISODate | null>((m, n) => (!m || n.bis > m ? n.bis : m), null);
  if (letztesEnde) return addDays(letztesEnde, 1).slice(0, 7);
  const ersteLeistung = daten.leistungen.reduce<ISODate | null>(
    (m, l) => (l.projektId === projektId && (!m || l.datum < m) ? l.datum : m),
    null,
  );
  return (ersteLeistung ?? tagVon(jetzt)).slice(0, 7);
}

/**
 * Stellt den Abrechnungsrhythmus des Projekts um (`zeitraumregel`) und plant
 * seine offenen Nachweise neu – rein; so arbeitet `updateProjekt` im Store,
 * und die Oberfläche rechnet damit die Folgen vorab (`grenzFolgen` in
 * domain/erfassung.ts, dort mit beliebiger `neueId`).
 * * Regel mit Monaten (`rhythmusMonate`, N = 1, 2, 3): Die Blöcke zählen neu
 *   ab `rhythmusAb` (`rhythmusAbBeimUmstellen` – in der Regel der Monat des
 *   frühesten offenen Nachweises). Jeder offene Nachweis, dessen Ende nicht
 *   von Hand festgelegt ist (`bisFest`), endet am Ende des Blocks, in dem sein
 *   Beginn liegt, gekürzt vor dem nächsten Nachweis; er kann dabei wachsen oder
 *   schrumpfen, sein Beginn bleibt. Beginnen im selben Block weitere solche
 *   offene Nachweise direkt danach (etwa drei Monatsnachweise beim Wechsel auf
 *   „quartal“), gehen sie im ersten auf – mit ihren bearbeiteten Texten,
 *   Aufschlägen, Bemerkungen und nachgereichten Leistungen wie bei „Neuer
 *   Leistungsnachweis“ (`offeneVereinen`). Leistungen, die dadurch aus jedem
 *   Nachweis fallen, erhalten nach der neuen Regel einen (`nachweiseSichern`,
 *   Kennungen über `neueId`); Leistungen, die schon vorher ohne Nachweis
 *   waren, bleiben es („Nachweise anlegen“ im Controlling).
 * * „fortlaufend“: Die Nachweise bleiben, wie sie sind – der letzte offene
 *   wächst ab dann mit neuen Leistungen mit; `rhythmusAb` entfällt.
 * Abgeschlossene Nachweise bleiben stets unverändert. Beispiele: offen
 * 01.10.–30.11. (fortlaufend) → „quartal“ → 01.10.–31.12.; offen
 * 01.10.–31.12. (quartal) → „monat“ → 01.10.–31.10., Leistungen im November
 * und Dezember erhalten je Monat einen neuen Nachweis. Unbekanntes Projekt
 * oder dieselbe Regel: derselbe Bestand.
 */
export function regelAnwenden(
  daten: LeistungsnachweisDaten,
  projektId: ID,
  regel: Zeitraumregel,
  jetzt: string,
  neueId: () => ID,
): LeistungsnachweisDaten {
  const projekt = daten.projekte.find((p) => p.id === projektId);
  if (!projekt || projekt.zeitraumregel === regel) return daten;
  const monate = rhythmusMonate(regel);
  const eigene = nachweiseVon(daten, projektId);
  const { rhythmusAb: _bisher, ...ohneAnker } = projekt;
  void _bisher;
  const rhythmusAb = monate === null ? null : rhythmusAbBeimUmstellen(daten, projektId, eigene, jetzt);
  const umgestellt: LeistungsnachweisDaten = {
    ...daten,
    projekte: daten.projekte.map((p) =>
      p.id === projektId ? { ...ohneAnker, zeitraumregel: regel, ...(rhythmusAb ? { rhythmusAb } : {}) } : p,
    ),
  };
  if (monate === null || rhythmusAb === null) return umgestellt;

  // Je offenem Nachweis das Ende seines Blocks; weitere offene direkt danach im selben Block gehen in ihm auf
  const anker = `${rhythmusAb}-01`;
  const planbar = (n: Leistungsnachweis) => n.status === 'entwurf' && !n.bisFest;
  const ersetzt = new Map<ID, Leistungsnachweis>();
  const aufgegangen = new Set<ID>();
  for (let i = 0; i < eigene.length; ) {
    const n = eigene[i];
    if (!planbar(n)) {
      i++;
      continue;
    }
    const block = rhythmusBlock(n.von, anker, monate);
    let j = i + 1;
    while (j < eigene.length && planbar(eigene[j]) && eigene[j].von <= block.bis) j++;
    const weitere = eigene.slice(i + 1, j);
    const naechster = eigene[j];
    const bis = naechster && naechster.von <= block.bis ? addDays(naechster.von, -1) : block.bis;
    if (weitere.length > 0 || bis !== n.bis) {
      ersetzt.set(n.id, { ...n, bis, ...(weitere.length > 0 ? offeneVereinen(n, weitere) : {}), geaendert: jetzt });
      for (const w of weitere) aufgegangen.add(w.id);
    }
    i = j;
  }
  if (ersetzt.size === 0) return umgestellt;
  const geplant: LeistungsnachweisDaten = {
    ...umgestellt,
    nachweise: daten.nachweise.filter((n) => !aufgegangen.has(n.id)).map((n) => ersetzt.get(n.id) ?? n),
  };
  // Leistungen, die aus ihrem Nachweis gefallen sind, erhalten einen nach der neuen Regel
  const schonOhne = new Set(leistungenOhneNachweis(daten, projektId).map((l) => l.id));
  const herausgefallen = leistungenOhneNachweis(geplant, projektId).filter((l) => !schonOhne.has(l.id));
  return nachweiseSichern(geplant, projektId, herausgefallen.map((l) => l.datum), jetzt, neueId).daten;
}

/**
 * Läuft der Nachweis bis zum Abschluss? Offen und nach der Regel „Bis zum
 * Abschluss“ (`fortlaufend`) oder – bei einer Regel mit Monaten („Monatlich“,
 * „Alle 2 Monate“, „Alle 3 Monate“) – mit einem Ende nach heute: Sein
 * Zeitraum steht dann erst beim Abschluss fest (`abschlussZeitraum`). Nicht,
 * wenn das Controlling das Ende von Hand festgelegt hat (`bisFest`).
 */
export function laeuftBisAbschluss(daten: Pick<LeistungsnachweisDaten, 'projekte'>, n: Leistungsnachweis, heute: ISODate): boolean {
  if (n.status !== 'entwurf' || n.bisFest) return false;
  return daten.projekte.find((p) => p.id === n.projektId)?.zeitraumregel === 'fortlaufend' || n.bis > heute;
}

/**
 * Bewirkt ein von Hand festgelegtes Ende (`bisFest`) etwas, wenn der Nachweis
 * am Tag `bis` endet? Nur wenn er ohne es bis zum Abschluss liefe
 * (`laeuftBisAbschluss`: offen und Regel „fortlaufend“ oder ein Ende nach
 * heute) – sonst endet er ohnehin an diesem Tag, wird nicht verlängert und
 * beim Abschluss nicht gekürzt. Danach richtet „Zeitraum ändern“, ob es
 * „Ende festlegen“ bzw. „Wieder bis zum Abschluss laufen lassen“ anbietet.
 */
export function endeFestlegenWirkt(
  daten: Pick<LeistungsnachweisDaten, 'projekte'>,
  n: Leistungsnachweis,
  bis: ISODate,
  heute: ISODate,
): boolean {
  return laeuftBisAbschluss(daten, { ...n, bisFest: false, bis }, heute);
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

/**
 * Ist der Nachweis fällig – offen und sein Zeitraum vorbei? Nicht, solange er
 * bis zum Abschluss läuft (`laeuftBisAbschluss`), und nur mit einem Ende vor
 * heute. Bei der Regel „Bis zum Abschluss“ (`fortlaufend`) wird ein Nachweis
 * also nie von selbst fällig – außer das Controlling hat sein Ende festgelegt
 * (`bisFest`).
 */
export function nachweisFaellig(daten: Pick<LeistungsnachweisDaten, 'projekte'>, n: Leistungsnachweis, heute: ISODate): boolean {
  return n.status === 'entwurf' && !laeuftBisAbschluss(daten, n, heute) && n.bis < heute;
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
 * Ende eines Nachweises beim Abschluss – erst hier steht sein Zeitraum fest:
 * Läuft er bis zum Abschluss (`laeuftBisAbschluss` – Regel „Bis zum
 * Abschluss“ oder ein Ende nach heute, aber kein von Hand festgelegtes), endet er am letzten Tag mit
 * Leistungen in ihm, spätestens heute (ohne Leistungen heute) – nie später als
 * bisher und nie vor seinem Beginn. Sonst bleibt `bis`. Dazu die Leistungen,
 * die danach liegen und deshalb in einen neuen Nachweis kommen.
 */
export function abschlussZeitraum(
  daten: LeistungsnachweisDaten,
  n: Leistungsnachweis,
  heute: ISODate,
): { bis: ISODate; gekuerzt: boolean; spaetere: Leistung[] } {
  if (!laeuftBisAbschluss(daten, n, heute)) return { bis: n.bis, gekuerzt: false, spaetere: [] };
  // Nachgereichte liegen vor dem Zeitraum und bestimmen das Ende nicht
  const leistungen = leistungenDesNachweises(daten, n).filter((l) => imZeitraum(l.datum, n.von, n.bis));
  const letzte = leistungen.length ? leistungen[leistungen.length - 1].datum : null;
  const ende = letzte && letzte < heute ? letzte : heute;
  if (ende < n.von || ende >= n.bis) return { bis: n.bis, gekuerzt: false, spaetere: [] };
  return { bis: ende, gekuerzt: true, spaetere: leistungen.filter((l) => l.datum > ende) };
}

/**
 * Schließt einen Nachweis ab – rein; so arbeitet `nachweisAbschliessen` im
 * Store: Zeitraum nach `abschlussZeitraum`, Stand festschreiben (mit
 * Aufschlägen), Status abgeschlossen. Leistungen nach einem gekürzten Ende
 * erhalten gleich einen neuen Nachweis (`nachweiseSichern`, Kennungen über
 * `neueId`). Ein abgeschlossener Nachweis bleibt unverändert.
 */
export function nachweisAbschliessenAnwenden(
  daten: LeistungsnachweisDaten,
  id: ID,
  jetzt: string,
  neueId: () => ID,
): LeistungsnachweisDaten {
  const n = daten.nachweise.find((x) => x.id === id);
  if (!n || n.status !== 'entwurf') return daten;
  const { bis, gekuerzt, spaetere } = abschlussZeitraum(daten, n, tagVon(jetzt));
  const gekuerzterNachweis: Leistungsnachweis = gekuerzt ? { ...n, bis } : n;
  const zwischen = gekuerzt ? { ...daten, nachweise: daten.nachweise.map((x) => (x.id === id ? gekuerzterNachweis : x)) } : daten;
  const zu: Leistungsnachweis = {
    ...gekuerzterNachweis,
    status: 'abgeschlossen',
    abgeschlossen: jetzt,
    geaendert: jetzt,
    stand: standErzeugen(zwischen, gekuerzterNachweis),
  };
  const ergebnis = { ...zwischen, nachweise: zwischen.nachweise.map((x) => (x.id === id ? zu : x)) };
  if (spaetere.length === 0) return ergebnis;
  return nachweiseSichern(ergebnis, n.projektId, spaetere.map((l) => l.datum), jetzt, neueId).daten;
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
