/**
 * Erfassung der Mitarbeiter je Monat: gemeinsame Leistungstexte je Zeitraum
 * und die Monatsbestätigung.
 *
 * Jede Person erfasst bzw. importiert ihre Stunden mit ihren Stichpunkten
 * (`Leistung.text`). Daraus schreiben alle, die in einem Zeitraum eines
 * Projekts Leistungen haben, einen gemeinsamen Fließtext (`Periodentext`).
 * Gemeinsam ist dabei allein dieser Text: Stichpunkte, Stunden und Leistungen
 * der anderen sieht im Bereich niemand (`stichpunkteDerPeriode` in
 * domain/rechte.ts) – „Stichpunkte übernehmen“ bzw. „Neue Stichpunkte
 * ergänzen“ bringen nur die eigenen ein (`neueStichpunkte`).
 * Der Zeitraum ist eine **Erfassungsperiode**: die Periode im Raster des
 * Projekts (`Projekt.raster` – Tag, Woche oder Monat, eingestellt vom
 * Controlling), auf den Kalendermonat gekürzt (`erfassungsPeriode` in
 * domain/zeitraum.ts). Eine Woche über ein Monatsende hat deshalb je Monat
 * einen eigenen Text; im Leistungsnachweis über beide Monate bleibt sie eine
 * Zeile, deren Text sich aus beiden zusammensetzt (`gemeinsamerZeilentext` in
 * domain/nachweis.ts). Geteilt wird zudem an den Grenzen der Nachweise
 * (`erfassungsGliederung`): Jeder Zeitraum liegt in höchstens einem Nachweis,
 * sein Text gehört genau einer Zeile. Abgeschlossene Nachweise gliedern ihre
 * Tage im Raster ihres Abschlusses. Ändern sich die Grenzen, ziehen die Texte
 * mit (`periodentexteNachziehen`).
 *
 * Eingabe und Bestätigung gelten je Monat: Wer alle Zeiträume eines Monats
 * mit eigenen Leistungen mit Text versehen hat, bestätigt, dass Stunden und
 * Texte vollständig sind (`Bestaetigung`). Die Bestätigung merkt sich je
 * Zeitraum eine Kennung des bestätigten Stands (`periodenKennung`) – ändern
 * sich danach die eigenen Leistungen oder der gemeinsame Text eines
 * Zeitraums, der nicht abgerechnet ist, ist sie erloschen (`monatsStatus`
 * 'geaendert', `bestaetigungGilt`). Ändern sich nur die Grenzen der Nachweise,
 * gilt: Gehen bestätigte Teile in einem Zeitraum auf, zieht die Bestätigung
 * mit (`bestaetigungenNachziehen`) – außer der zusammengeführte Text enthält
 * Text, den die Person nicht bestätigt hat (aus einem Teil ohne eigene
 * Leistungen): Dann hat sich der Text für sie geändert; teilt eine neue Grenze einen Zeitraum,
 * braucht der neue Teil einen eigenen Text, und die Bestätigung erlischt –
 * die Rückfragen im Controlling nennen das (`grenzFolgen`).
 *
 * **Gesperrt** ist eine Erfassungsperiode, sobald ein abgeschlossener Nachweis
 * sie umfasst (`abgeschlossenIm` in domain/nachweis.ts): Ihr Text ist dort
 * abgerechnet und lässt sich nur noch lesen, und sie zählt nicht mehr zur
 * Bestätigung – auch spätere Änderungen darin lassen sie nicht erlöschen.
 * Weil an den Grenzen der Nachweise geteilt wird, trifft das nur den
 * abgerechneten Teil: Endet ein Nachweis mitten in einem Zeitraum (etwa beim
 * Abschluss), bekommt der Rest einen eigenen Text, und dessen Leistungen
 * bleiben zu beschreiben und zu bestätigen. Eigene Leistungen in einem
 * gesperrten Zeitraum, die nach dem Abschluss erfasst (nicht abgerechnet) bzw.
 * als abgerechnete geändert wurden – auch durch einen Neuimport – und jetzt
 * anders sind als im festgeschriebenen Stand (`nachAbschlussGeaendert` in
 * domain/nachweis.ts), nennt ein Hinweis (`nachAbschlussHinweis`); wer auf den
 * abgerechneten Wert zurückändert, hebt ihn auf. Abschnitte, die das Controlling
 * danach neu zuordnet, zählen dabei nicht (`standAbschnitteNachziehen`). Eine abgerechnete Leistung, deren Datum nach dem
 * Abschluss aus ihrem Nachweis herausgelegt wurde, bleibt dort abgerechnet und
 * gehört zu keinem Zeitraum – sie zählt weder zu Stunden noch zur Bestätigung,
 * nur ein Hinweis nennt sie (`AnderswoAbgerechnet`).
 *
 * Wer was sehen und ändern darf, steht in domain/rechte.ts
 * (`darfPeriodentextLesen`, `darfPeriodentextBearbeiten`,
 * `stichpunkteDerPeriode`, `darfBestaetigen`); hier wird nur gerechnet.
 * Alles rein; die Änderungen wendet der Store mit `periodentextAnwenden`,
 * `bestaetigenAnwenden` und `bestaetigungZuruecknehmenAnwenden` an.
 */
import {
  abgeschlossenIm,
  abgerechnetIn,
  abgerechneteLeistungen,
  erfassungsGliederung,
  erfassungsPeriodeIn,
  gleicheGliederung,
  leistungenDesNachweises,
  nachAbschlussGeaendert,
  nachweisTitel,
  nurBekannteTeile,
  stundenVon,
  tagVon,
  textErgaenzen,
  textSchluessel,
  texteZusammenfuehren,
  type ErfassungsGliederung,
} from './nachweis';
import {
  mitarbeiterName,
  pruefsumme,
  type Bestaetigung,
  type ID,
  type ISODate,
  type Leistung,
  type Leistungsnachweis,
  type LeistungsnachweisDaten,
  type Mitarbeiter,
  type Periodentext,
  type Raster,
} from './types';
import {
  ERFASSUNG_TRENNER,
  datumText,
  erfassungsPeriodeAusSchluessel,
  imZeitraum,
  istMonat,
  istWochenende,
  langDatum,
  monatText,
  monatVersetzt,
  runden,
  type Periode,
} from './zeitraum';

/* ------------------------------------------------------------------ */
/* Verzeichnis je Projekt                                              */
/* ------------------------------------------------------------------ */

const nachDatum = (a: { datum: ISODate }, b: { datum: ISODate }) => (a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : 0);

/** Leistungen eines Projekts in einer Erfassungsperiode. */
interface Gruppe {
  periode: Periode;
  /** Raster der Periode – das des Projekts, in einem abgeschlossenen Nachweis das seines Abschlusses. */
  raster: Raster;
  monat: string;
  leistungen: Leistung[];
  /** Abgeschlossener Nachweis, der die Periode umfasst (`abgeschlossenIm`) – sie ist gesperrt. */
  gesperrtIn: Leistungsnachweis | null;
}

interface ProjektVerzeichnis {
  /** Gruppen je Monat (JJJJ-MM), nach Beginn sortiert; Leistungen darin nach Datum. */
  monate: Map<string, Gruppe[]>;
  gruppen: Map<string, Gruppe>;
  abgerechnet: Set<ID>;
  /** In einen Nachweis nachgereichte Leistungen – über sie hat das Controlling schon entschieden. */
  nachgereicht: Set<ID>;
  texte: Map<string, Periodentext>;
  /**
   * Je Monat (JJJJ-MM) die Leistungen, die im Stand eines abgeschlossenen
   * Nachweises abgerechnet sind, der ihr Datum nicht umfasst (`AnderswoAbgerechnet`)
   * – sie stehen in keiner Gruppe.
   */
  anderswo: Map<string, AnderswoAbgerechnet[]>;
}

/**
 * Eine Leistung, die im festgeschriebenen Stand eines abgeschlossenen
 * Nachweises abgerechnet ist, dessen Zeitraum ihr Datum nicht (mehr) umfasst –
 * etwa nach einer Datumsänderung nach dem Abschluss (`abgerechnetIn`). Sie
 * bleibt dort abgerechnet (`leistungenDesNachweises`) und gehört deshalb zu
 * keinem Zeitraum der gemeinsamen Texte: Sie zählt weder zu den eigenen
 * Stunden noch zur Bestätigung, verlangt keinen Text und nennt nur einen
 * Hinweis (`anderswoAbgerechnetHinweis`).
 */
export interface AnderswoAbgerechnet {
  leistung: Leistung;
  nachweis: Leistungsnachweis;
}

/*
 * Je Bestand und Projekt einmal aufgebaut: Der Bestand wird nie an Ort und
 * Stelle geändert (jede Änderung liefert ein neues Objekt), so bleibt das
 * Verzeichnis gültig, solange es den Bestand gibt.
 */
const verzeichnisse = new WeakMap<LeistungsnachweisDaten, Map<ID, ProjektVerzeichnis>>();

function verzeichnis(daten: LeistungsnachweisDaten, projektId: ID): ProjektVerzeichnis {
  let jeProjekt = verzeichnisse.get(daten);
  if (!jeProjekt) {
    jeProjekt = new Map();
    verzeichnisse.set(daten, jeProjekt);
  }
  const vorhanden = jeProjekt.get(projektId);
  if (vorhanden) return vorhanden;

  // Raster des Projekts, an den Grenzen der Nachweise geteilt; abgeschlossene im Raster ihres Abschlusses
  const gliederung = erfassungsGliederung(daten, projektId);
  const gruppen = new Map<string, Gruppe>();
  const anderswo = new Map<string, AnderswoAbgerechnet[]>();
  for (const l of daten.leistungen) {
    if (l.projektId !== projektId) continue;
    // Abgerechnet in einem abgeschlossenen Nachweis, der ihr Datum nicht umfasst: Sie zählt dort, nicht hier
    const abgerechnet = abgerechnetIn(daten, l);
    if (abgerechnet && !imZeitraum(l.datum, abgerechnet.von, abgerechnet.bis)) {
      const monat = l.datum.slice(0, 7);
      anderswo.set(monat, [...(anderswo.get(monat) ?? []), { leistung: l, nachweis: abgerechnet }]);
      continue;
    }
    const { raster, ...p } = erfassungsPeriodeIn(gliederung, l.datum);
    const g = gruppen.get(p.schluessel);
    if (g) g.leistungen.push(l);
    else gruppen.set(p.schluessel, { periode: p, raster, monat: l.datum.slice(0, 7), leistungen: [l], gesperrtIn: null });
  }
  const monate = new Map<string, Gruppe[]>();
  for (const g of gruppen.values()) {
    g.leistungen.sort(nachDatum);
    g.gesperrtIn = abgeschlossenIm(daten, projektId, g.periode.von, g.periode.bis) ?? null;
    const liste = monate.get(g.monat);
    if (liste) liste.push(g);
    else monate.set(g.monat, [g]);
  }
  for (const liste of monate.values()) liste.sort((a, b) => (a.periode.von < b.periode.von ? -1 : a.periode.von > b.periode.von ? 1 : 0));
  const texte = new Map<string, Periodentext>();
  for (const t of daten.periodentexte ?? []) {
    if (t.projektId === projektId && t.text.trim() && !texte.has(t.schluessel)) texte.set(t.schluessel, t);
  }
  const nachgereicht = new Set(daten.nachweise.filter((n) => n.projektId === projektId).flatMap((n) => n.nachgereicht));
  for (const liste of anderswo.values()) liste.sort((a, b) => nachDatum(a.leistung, b.leistung));
  const v: ProjektVerzeichnis = { monate, gruppen, abgerechnet: abgerechneteLeistungen(daten, projektId), nachgereicht, texte, anderswo };
  jeProjekt.set(projektId, v);
  return v;
}

/* ------------------------------------------------------------------ */
/* Erfassungsperioden                                                  */
/* ------------------------------------------------------------------ */

/** Eine Erfassungsperiode eines Projekts aus Sicht einer Person (`erfassungsPerioden`). */
export interface ErfassungsPeriode {
  /**
   * Monat und Periode, etwa „2026-10|W2026-44“ – Schlüssel des gemeinsamen
   * Texts; liegt eine Grenze eines Nachweises in der Periode (sein Beginn oder
   * der Tag nach seinem Ende, etwa nach einem Abschluss mitten darin), trägt
   * der Teil ab dann seinen Beginn („2026-11|M2026-11|2026-11-06“,
   * `erfassungsPeriodeIn`).
   */
  schluessel: string;
  projektId: ID;
  /** JJJJ-MM */
  monat: string;
  /** Auf den Monat gekürzt (und an den Grenzen der Nachweise geteilt). */
  von: ISODate;
  bis: ISODate;
  /** Raster des Projekts – in einem abgeschlossenen Nachweis das bei seinem Abschluss. */
  raster: Raster;
  /**
   * Wie die Spalte „Datum“ im Nachweis, etwa „KW 44\n26.10.26 - 30.10.26“
   * (`datumText`). Bis Sonntag reicht er aus Sicht einer Person nur bei eigenen
   * Leistungen am Wochenende – die der anderen verrät er nicht.
   */
  datumText: string;
  /**
   * Alle Leistungen der Periode (aller Personen), nach Datum – ohne die in
   * einem anderen abgeschlossenen Nachweis abgerechneten (`AnderswoAbgerechnet`).
   */
  leistungen: Leistung[];
  /** Die der Person (`mitarbeiterId` des Aufrufs). */
  eigene: Leistung[];
  /**
   * Die der anderen – nur zum Rechnen und fürs Controlling. Im Bereich nicht
   * anzeigen, auch nicht als Zahl; was zu sehen ist, sagt `stichpunkteDerPeriode`
   * (domain/rechte.ts).
   */
  andere: Leistung[];
  stundenEigene: number;
  /** Stunden aller – nur fürs Controlling; im Bereich nicht anzeigen. */
  stundenAlle: number;
  /** Gemeinsamer Text oder null (keiner bzw. leer). */
  text: Periodentext | null;
  /**
   * Leistungen, deren Stichpunkte beim Bearbeiten des Texts noch nicht
   * berücksichtigt waren (weder ihre Kennung in `text.leistungIds` noch ihr
   * Inhalt in `text.inhalte` – so bleibt ein unveränderter Neuimport mit neuen
   * Kennungen berücksichtigt) und noch nicht im Text vorkommen – für „Neue
   * Stichpunkte ergänzen“ (`textErgaenzen`). Aus Sicht einer Person nur ihre
   * eigenen (die Stichpunkte der anderen sieht sie nicht); ohne Person
   * (`mitarbeiterId` null, etwa im Controlling) die aller. Leer ohne Text.
   */
  neueStichpunkte: Leistung[];
  /** Ein abgeschlossener Nachweis umfasst die Periode – ihr Text ist abgerechnet und nur zu lesen. */
  gesperrt: boolean;
  /** Der abgeschlossene Nachweis, der die Periode sperrt. */
  gesperrtIn: Leistungsnachweis | null;
  /**
   * Eigene Leistungen einer gesperrten Periode, die nicht abgerechnet sind
   * (nach dem Abschluss erfasst, etwa neu oder mit einem neuen Datum hierher
   * gelegt) und auch nicht nachgereicht.
   */
  nachAbschluss: Leistung[];
  /**
   * Eigene, abgerechnete Leistungen einer gesperrten Periode, die nach dem
   * Abschluss geändert wurden und jetzt anders sind als im festgeschriebenen
   * Stand (`nachAbschlussGeaendert` in domain/nachweis.ts) – abgerechnet bleibt
   * der Stand des Abschlusses.
   */
  nachAbschlussGeaendert: Leistung[];
}

function periodeAus(projektId: ID, v: ProjektVerzeichnis, g: Gruppe, mitarbeiterId: ID | null): ErfassungsPeriode {
  const eigene = g.leistungen.filter((l) => l.mitarbeiterId === mitarbeiterId);
  const andere = g.leistungen.filter((l) => l.mitarbeiterId !== mitarbeiterId);
  const text = v.texte.get(g.periode.schluessel) ?? null;
  const { gesperrtIn } = g;
  const gesperrt = gesperrtIn !== null;
  const bekannt = new Set(text?.leistungIds ?? []);
  const bekannteInhalte = new Set(text?.inhalte ?? []);
  // Aus Sicht einer Person nur ihre eigenen – fremde Stichpunkte gelangen nie in ihren Vorschlag
  const kandidaten = mitarbeiterId === null ? g.leistungen : eigene;
  const neueStichpunkte = text
    ? kandidaten.filter(
        (l) => !bekannt.has(l.id) && !bekannteInhalte.has(stichpunktInhalt(l)) && textErgaenzen(text.text, [l]) !== text.text,
      )
    : [];
  // Bis Sonntag nur bei eigenen Leistungen am Wochenende – die der anderen bleiben verborgen
  const sichtbar = mitarbeiterId === null ? g.leistungen : eigene;
  return {
    schluessel: g.periode.schluessel,
    projektId,
    monat: g.monat,
    von: g.periode.von,
    bis: g.periode.bis,
    raster: g.raster,
    datumText: datumText(g.periode, g.raster, sichtbar.some((l) => istWochenende(l.datum))),
    leistungen: g.leistungen,
    eigene,
    andere,
    stundenEigene: stundenVon(eigene),
    stundenAlle: stundenVon(g.leistungen),
    text,
    neueStichpunkte,
    gesperrt,
    gesperrtIn,
    // Die Periode liegt ganz im sperrenden Nachweis (`erfassungsGliederung`) – jede eigene Leistung darin gehört dazu
    nachAbschluss: gesperrtIn ? eigene.filter((l) => !v.abgerechnet.has(l.id) && !v.nachgereicht.has(l.id)) : [],
    nachAbschlussGeaendert: gesperrtIn
      ? eigene.filter((l) => v.abgerechnet.has(l.id) && nachAbschlussGeaendert(l, gesperrtIn))
      : [],
  };
}

/**
 * Inhalt eines Stichpunkts zum Wiedererkennen (`Periodentext.inhalte`): Person,
 * Tag und Text – ohne Kennung, damit ein unveränderter Neuimport (neue
 * Kennungen) als schon berücksichtigt gilt, und ohne Stunden.
 */
export function stichpunktInhalt(l: Pick<Leistung, 'mitarbeiterId' | 'datum' | 'text'>): string {
  return pruefsumme([l.mitarbeiterId, l.datum, textSchluessel(l.text)].join('\u0001'));
}

/**
 * Erfassungsperioden eines Monats für ein Projekt und eine Person – nur die mit
 * eigenen Leistungen der Person, nach Beginn sortiert.
 */
export function erfassungsPerioden(daten: LeistungsnachweisDaten, projektId: ID, mitarbeiterId: ID, monat: string): ErfassungsPeriode[] {
  const v = verzeichnis(daten, projektId);
  return (v.monate.get(monat) ?? [])
    .filter((g) => g.leistungen.some((l) => l.mitarbeiterId === mitarbeiterId))
    .map((g) => periodeAus(projektId, v, g, mitarbeiterId));
}

/**
 * Eine Erfassungsperiode nach ihrem Schlüssel (aus Sicht der Person
 * `mitarbeiterId`; null = niemand ist „eigen“) – null, wenn sie keine
 * Leistungen hat.
 */
export function erfassungsPeriodeZu(
  daten: LeistungsnachweisDaten,
  projektId: ID,
  schluessel: string,
  mitarbeiterId: ID | null,
): ErfassungsPeriode | null {
  const v = verzeichnis(daten, projektId);
  const g = v.gruppen.get(schluessel);
  return g ? periodeAus(projektId, v, g, mitarbeiterId) : null;
}

/** Alle Erfassungsperioden eines Monats eines Projekts (aller Personen), nach Beginn – etwa für das Controlling. */
export function alleErfassungsPerioden(daten: LeistungsnachweisDaten, projektId: ID, monat: string): ErfassungsPeriode[] {
  const v = verzeichnis(daten, projektId);
  return (v.monate.get(monat) ?? []).map((g) => periodeAus(projektId, v, g, null));
}

/* ------------------------------------------------------------------ */
/* Bestätigung                                                         */
/* ------------------------------------------------------------------ */

const T1 = '\u0001';
const T2 = '\u0002';

/**
 * Kennung eines Zeitraums für die Bestätigung (`Bestaetigung.perioden`): über
 * die eigenen Leistungen darin – inhaltlich, ohne Kennungen (Datum, Stunden,
 * Abschnitt, Text; sortiert), damit ein unveränderter Neuimport sie nicht
 * ändert – und über den gemeinsamen Text. Ohne den Schlüssel: Zieht ein Text
 * nur um (`periodentexteNachziehen`), bleibt sie gleich; zwei Zeiträume
 * unterscheiden sich stets in den Tagen ihrer Leistungen. Gehen Teile in einem
 * Zeitraum auf, ändert sie sich mit dem zusammengeführten Text – dann trägt
 * `bestaetigungenNachziehen` die Bestätigung um, wenn die Person allen Text
 * darin bestätigt hat.
 */
export function periodenKennung(p: Pick<ErfassungsPeriode, 'eigene' | 'text'>): string {
  const teile = p.eigene.map((l) => ['L', l.datum, runden(l.stunden).toFixed(2), l.abschnittId ?? '', l.text.trim()].join(T1)).sort();
  const text = p.text?.text.trim();
  if (text) teile.push(['T', text].join(T1));
  return pruefsumme(teile.join(T2));
}

/** Ist der Zeitraum mit diesem Schlüssel jetzt gesperrt? Auch, wenn darin keine Leistungen mehr liegen. */
function zeitraumGesperrt(daten: LeistungsnachweisDaten, projektId: ID, schluessel: string): boolean {
  const g = verzeichnis(daten, projektId).gruppen.get(schluessel);
  if (g) return g.gesperrtIn !== null;
  const p = erfassungsPeriodeAusSchluessel(schluessel);
  return !!p && !!abgeschlossenIm(daten, projektId, p.von, p.von);
}

/**
 * Gilt die Bestätigung noch? Verglichen wird je Zeitraum (`periodenKennung`),
 * und nur, was nicht abgerechnet ist: Jeder nicht gesperrte Zeitraum mit
 * eigenen Leistungen muss so bestätigt sein, wie er jetzt ist, und kein
 * bestätigter Zeitraum darf seitdem weggefallen oder anders sein – außer er
 * ist inzwischen gesperrt. Ein gesperrter Zeitraum gilt als unverändert: Ist
 * er abgerechnet, bleibt es beim Hinweis ohne Überarbeitung
 * (`nachAbschlussHinweis`) – weder der Abschluss noch spätere Änderungen darin
 * lassen die Bestätigung erlöschen. Hebt „Wieder öffnen“ die Sperre auf, zählt
 * er wieder – unverändert mit der Kennung vom Bestätigen.
 */
function bestaetigungGilt(
  daten: LeistungsnachweisDaten,
  projektId: ID,
  b: Bestaetigung,
  perioden: ErfassungsPeriode[],
  kennungen: Record<string, string>,
): boolean {
  const bestaetigt = new Set(Object.values(b.perioden));
  const aktuell = new Set(Object.values(kennungen));
  return (
    perioden.every((p) => p.gesperrt || bestaetigt.has(kennungen[p.schluessel])) &&
    Object.entries(b.perioden).every(([k, kennung]) => aktuell.has(kennung) || zeitraumGesperrt(daten, projektId, k))
  );
}

/**
 * Stand eines Monats für eine Person:
 * * 'keine' – keine eigenen Leistungen im Monat;
 * * 'abgerechnet' – alle eigenen Leistungen liegen in gesperrten Perioden;
 * * 'offen' – keine Bestätigung;
 * * 'bestaetigt' – bestätigt, und kein nicht abgerechneter Zeitraum hat sich
 *   seitdem geändert (`bestaetigungGilt`);
 * * 'geaendert' – bestätigt, aber seitdem geändert: Die Bestätigung ist erloschen.
 */
export type MonatsStatusArt = 'keine' | 'abgerechnet' | 'offen' | 'bestaetigt' | 'geaendert';

export interface MonatsStatus {
  projektId: ID;
  mitarbeiterId: ID;
  /** JJJJ-MM */
  monat: string;
  status: MonatsStatusArt;
  /** Erfassungsperioden mit eigenen Leistungen (`erfassungsPerioden`). */
  perioden: ErfassungsPeriode[];
  /** Nicht gesperrte Perioden ohne gemeinsamen Text – solange es sie gibt, lässt sich nicht bestätigen. */
  ohneText: ErfassungsPeriode[];
  /** Eigene Stunden im Monat (alle, auch abgerechnete). */
  stunden: number;
  /** Zahl der eigenen Leistungen im Monat. */
  anzahl: number;
  /** Die gespeicherte Bestätigung – auch eine erloschene. */
  bestaetigung: Bestaetigung | null;
  /** Kennungen der Zeiträume mit eigenen Leistungen (Schlüssel → `periodenKennung`) – so merkt sie sich die Bestätigung. */
  periodenKennungen: Record<string, string>;
  /** Eigene, nicht abgerechnete Leistungen in gesperrten Perioden (`nachAbschlussHinweis`). */
  nachAbschluss: Leistung[];
  /** Eigene, abgerechnete Leistungen in gesperrten Perioden, nach dem Abschluss geändert (`nachAbschlussHinweis`). */
  nachAbschlussGeaendert: Leistung[];
  /**
   * Eigene Leistungen mit einem Datum im Monat, die ein abgeschlossener
   * Nachweis abrechnet, der dieses Datum nicht umfasst – sie zählen nicht zum
   * Monat (`AnderswoAbgerechnet`, `anderswoAbgerechnetHinweis`).
   */
  anderswoAbgerechnet: AnderswoAbgerechnet[];
  /** Lässt sich jetzt bestätigen? Status 'offen' oder 'geaendert' und kein Zeitraum ohne Text. */
  bestaetigbar: boolean;
}

/** Bestätigung der Person für Projekt und Monat (die erste, falls ein Bestand mehrere führt). */
export function bestaetigungVon(
  daten: Pick<LeistungsnachweisDaten, 'bestaetigungen'>,
  projektId: ID,
  mitarbeiterId: ID,
  monat: string,
): Bestaetigung | null {
  return (
    (daten.bestaetigungen ?? []).find((b) => b.projektId === projektId && b.mitarbeiterId === mitarbeiterId && b.monat === monat) ?? null
  );
}

/** Stand eines Monats für Projekt und Person (siehe `MonatsStatusArt`). */
export function monatsStatus(daten: LeistungsnachweisDaten, projektId: ID, mitarbeiterId: ID, monat: string): MonatsStatus {
  const perioden = erfassungsPerioden(daten, projektId, mitarbeiterId, monat);
  const eigene = perioden.flatMap((p) => p.eigene);
  const offenePerioden = perioden.filter((p) => !p.gesperrt);
  const ohneText = offenePerioden.filter((p) => !p.text);
  const periodenKennungen = Object.fromEntries(perioden.map((p) => [p.schluessel, periodenKennung(p)]));
  const bestaetigung = bestaetigungVon(daten, projektId, mitarbeiterId, monat);
  const status: MonatsStatusArt =
    eigene.length === 0
      ? 'keine'
      : offenePerioden.length === 0
        ? 'abgerechnet'
        : !bestaetigung
          ? 'offen'
          : bestaetigungGilt(daten, projektId, bestaetigung, perioden, periodenKennungen)
            ? 'bestaetigt'
            : 'geaendert';
  return {
    projektId,
    mitarbeiterId,
    monat,
    status,
    perioden,
    ohneText,
    stunden: stundenVon(eigene),
    anzahl: eigene.length,
    bestaetigung,
    periodenKennungen,
    nachAbschluss: perioden.flatMap((p) => p.nachAbschluss),
    nachAbschlussGeaendert: perioden.flatMap((p) => p.nachAbschlussGeaendert),
    anderswoAbgerechnet: (verzeichnis(daten, projektId).anderswo.get(monat) ?? []).filter((a) => a.leistung.mitarbeiterId === mitarbeiterId),
    bestaetigbar: (status === 'offen' || status === 'geaendert') && ohneText.length === 0,
  };
}

/** Monate (JJJJ-MM) mit Leistungen im Projekt – mit `mitarbeiterId` nur mit eigenen; neueste zuerst. */
export function monateMitLeistungen(daten: LeistungsnachweisDaten, projektId: ID, mitarbeiterId?: ID): string[] {
  const v = verzeichnis(daten, projektId);
  return [...v.monate.entries()]
    .filter(([, gruppen]) => mitarbeiterId === undefined || gruppen.some((g) => g.leistungen.some((l) => l.mitarbeiterId === mitarbeiterId)))
    .map(([monat]) => monat)
    .sort()
    .reverse();
}

/**
 * Monat, den die Seite „Leistungstexte“ eines Projekts zuerst zeigt: der
 * jüngste mit eigenen Leistungen im Status 'offen' oder 'geaendert', sonst
 * der jüngste mit eigenen Leistungen, sonst der laufende (von `heute`).
 */
export function vorgabeMonat(daten: LeistungsnachweisDaten, projektId: ID, mitarbeiterId: ID | null, heute: ISODate): string {
  if (!mitarbeiterId) return heute.slice(0, 7);
  const monate = monateMitLeistungen(daten, projektId, mitarbeiterId);
  const offen = monate.find((m) => {
    const s = monatsStatus(daten, projektId, mitarbeiterId, m).status;
    return s === 'offen' || s === 'geaendert';
  });
  return offen ?? monate[0] ?? heute.slice(0, 7);
}

/** Der Monat `anzahl` Monate nach (negativ: vor) `monat` – für ‹ ›. */
export function monatVerschieben(monat: string, anzahl: number): string {
  return monatVersetzt(`${monat}-01`, anzahl).slice(0, 7);
}

/**
 * Offene Bestätigungen einer Person über alle Projekte: je Projekt und Monat
 * mit eigenen Leistungen im Status 'offen' oder 'geaendert' – neueste Monate
 * zuerst, dann nach Projektnummer. Auch der laufende Monat steht darin.
 */
export function offeneBestaetigungen(daten: LeistungsnachweisDaten, mitarbeiterId: ID): MonatsStatus[] {
  const projekte = new Set(daten.leistungen.filter((l) => l.mitarbeiterId === mitarbeiterId).map((l) => l.projektId));
  const nummer = new Map(daten.projekte.map((p) => [p.id, p.nummer || p.name]));
  const liste: MonatsStatus[] = [];
  for (const projektId of projekte) {
    if (!nummer.has(projektId)) continue;
    for (const monat of monateMitLeistungen(daten, projektId, mitarbeiterId)) {
      const s = monatsStatus(daten, projektId, mitarbeiterId, monat);
      if (s.status === 'offen' || s.status === 'geaendert') liste.push(s);
    }
  }
  return liste.sort(
    (a, b) =>
      b.monat.localeCompare(a.monat) ||
      (nummer.get(a.projektId) ?? '').localeCompare(nummer.get(b.projektId) ?? '', 'de', { numeric: true }),
  );
}

/** Stand der Bestätigungen eines Monats im Controlling (`bestaetigungsUebersicht`). */
export interface BestaetigungsMonat {
  /** JJJJ-MM */
  monat: string;
  /** Je Person mit Leistungen im Monat (nach Namen) ihr Stand. */
  personen: MonatsStatus[];
  /** Personen im Status 'bestaetigt'. */
  bestaetigt: number;
  /** Personen, die zu bestätigen haben bzw. hatten: Status 'offen', 'geaendert' oder 'bestaetigt' („x von y bestätigt“). */
  zuBestaetigen: number;
  /** Personen, deren Leistungen alle abgerechnet sind. */
  abgerechnet: number;
}

const nachName = (mitarbeiter: Map<ID, Mitarbeiter>) => (a: ID, b: ID) => {
  const ma = mitarbeiter.get(a);
  const mb = mitarbeiter.get(b);
  return (ma ? mitarbeiterName(ma) : '?').localeCompare(mb ? mitarbeiterName(mb) : '?', 'de');
};

/**
 * Bestätigungen eines Projekts für das Controlling: je Monat mit Leistungen
 * (neueste zuerst; mit `monate` nur diese) die Personen mit Leistungen und ihr
 * Stand, dazu die Zahlen für „x von y bestätigt“.
 */
export function bestaetigungsUebersicht(daten: LeistungsnachweisDaten, projektId: ID, monate?: string[]): BestaetigungsMonat[] {
  return uebersichtFuer(daten, projektId, monate ? new Map(monate.map((m) => [m, null])) : null);
}

/**
 * Wie `bestaetigungsUebersicht`; `auswahl` nennt die Monate und je Monat die
 * Personen (null: alle mit Leistungen im Monat).
 */
function uebersichtFuer(
  daten: LeistungsnachweisDaten,
  projektId: ID,
  auswahl: Map<string, Set<ID> | null> | null,
): BestaetigungsMonat[] {
  const v = verzeichnis(daten, projektId);
  const mitarbeiter = new Map(daten.mitarbeiter.map((m) => [m.id, m]));
  return [...v.monate.entries()]
    .filter(([monat]) => !auswahl || auswahl.has(monat))
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([monat, gruppen]) => {
      const nur = auswahl?.get(monat) ?? null;
      const personen = [...new Set(gruppen.flatMap((g) => g.leistungen.map((l) => l.mitarbeiterId)))]
        .filter((id) => !nur || nur.has(id))
        .sort(nachName(mitarbeiter))
        .map((id) => monatsStatus(daten, projektId, id, monat));
      return {
        monat,
        personen,
        bestaetigt: personen.filter((p) => p.status === 'bestaetigt').length,
        zuBestaetigen: personen.filter((p) => p.status === 'offen' || p.status === 'geaendert' || p.status === 'bestaetigt').length,
        abgerechnet: personen.filter((p) => p.status === 'abgerechnet').length,
      };
    });
}

/** Monate (JJJJ-MM) der Leistungen eines Nachweises – samt nachgereichten –, aufsteigend. */
export function monateDesNachweises(daten: LeistungsnachweisDaten, n: Leistungsnachweis): string[] {
  return [...new Set(leistungenDesNachweises(daten, n).map((l) => l.datum.slice(0, 7)))].sort();
}

/**
 * Bestätigungen der Monate eines Nachweises (`monateDesNachweises`) – neueste
 * zuerst, wie `bestaetigungsUebersicht`, aber je Monat nur die Personen mit
 * Leistungen in diesem Nachweis (`leistungenDesNachweises`): Wer im Monat nur
 * danach Leistungen hat, betrifft der Nachweis nicht.
 */
export function bestaetigungenDesNachweises(daten: LeistungsnachweisDaten, n: Leistungsnachweis): BestaetigungsMonat[] {
  const jeMonat = new Map<string, Set<ID> | null>();
  for (const l of leistungenDesNachweises(daten, n)) {
    const monat = l.datum.slice(0, 7);
    const personen = jeMonat.get(monat) ?? new Set<ID>();
    personen.add(l.mitarbeiterId);
    jeMonat.set(monat, personen);
  }
  return uebersichtFuer(daten, n.projektId, jeMonat);
}

/**
 * Wer mit Leistungen im Nachweis für welchen seiner Monate noch nicht (Status
 * 'offen') bzw. nach einer Änderung nicht erneut ('geaendert') bestätigt hat
 * – für den Hinweis beim Abschließen; aufsteigend nach Monat, dann nach Namen.
 */
export function fehlendeBestaetigungen(daten: LeistungsnachweisDaten, n: Leistungsnachweis): MonatsStatus[] {
  return bestaetigungenDesNachweises(daten, n)
    .reverse()
    .flatMap((m) => m.personen.filter((p) => p.status === 'offen' || p.status === 'geaendert'));
}

/**
 * Gemeinsame Texte eines Projekts, die nach einem Wechsel auf `raster` nicht
 * mehr gelten: die der Zeiträume mit Leistungen im bisherigen Raster, die
 * noch kein abgeschlossener Nachweis sperrt. Texte gesperrter Zeiträume
 * zählen nicht – abgeschlossene Nachweise gliedern sie weiter im Raster ihres
 * Abschlusses (`NachweisStand.erfassungsRaster`). Die Texte bleiben
 * gespeichert und gelten wieder, wenn das Raster zurückgestellt wird. 0, wenn
 * sich das Raster nicht ändert.
 */
export function periodentexteNachRasterwechsel(daten: LeistungsnachweisDaten, projektId: ID, raster: Raster): number {
  const bisher = daten.projekte.find((p) => p.id === projektId)?.raster;
  if (!bisher || bisher === raster) return 0;
  const v = verzeichnis(daten, projektId);
  return [...v.gruppen.values()].filter((g) => !g.gesperrtIn && v.texte.has(g.periode.schluessel)).length;
}

/* ------------------------------------------------------------------ */
/* Texte (wörtlich)                                                    */
/* ------------------------------------------------------------------ */

/** „03.11.2026“ – Tag eines Zeitpunkts. */
const amTag = (zeitpunkt: string) => langDatum(tagVon(zeitpunkt));

/** Monat als Text: „Oktober 2026“. */
export function monatName(monat: string): string {
  return istMonat(monat) ? monatText(`${monat}-01`) : monat;
}

/** Bezeichnungen der Stände im Controlling (Badge) ohne Datum. */
export const MONATS_STATUS_LABEL: Record<MonatsStatusArt, string> = {
  keine: 'Keine Leistungen',
  abgerechnet: 'Abgerechnet',
  offen: 'Offen',
  bestaetigt: 'Bestätigt',
  geaendert: 'Geändert seit Bestätigung',
};

/**
 * Statuszeile des Monats im Bereich: „Noch nicht bestätigt“, „Bestätigt am
 * 03.11.2026“, „Seit der Bestätigung am 03.11.2026 geändert – bitte erneut
 * bestätigen.“, „Abgerechnet“ bzw. „Keine eigenen Leistungen in diesem Monat“.
 */
export function monatsStatusText(s: Pick<MonatsStatus, 'status' | 'bestaetigung'>): string {
  switch (s.status) {
    case 'keine':
      return 'Keine eigenen Leistungen in diesem Monat';
    case 'abgerechnet':
      return 'Abgerechnet';
    case 'offen':
      return 'Noch nicht bestätigt';
    case 'bestaetigt':
      return `Bestätigt am ${s.bestaetigung ? amTag(s.bestaetigung.am) : '–'}`;
    case 'geaendert':
      return `Seit der Bestätigung am ${s.bestaetigung ? amTag(s.bestaetigung.am) : '–'} geändert – bitte erneut bestätigen.`;
  }
}

/** Badge im Controlling: „Bestätigt am …“ (grün), „Offen“ (orange), „Geändert seit Bestätigung“ (rot), „Abgerechnet“ (blau). */
export function monatsStatusBadge(s: Pick<MonatsStatus, 'status' | 'bestaetigung'>): { text: string; ton: '' | 'green' | 'orange' | 'red' | 'blue' } {
  switch (s.status) {
    case 'bestaetigt':
      return { text: `Bestätigt am ${s.bestaetigung ? amTag(s.bestaetigung.am) : '–'}`, ton: 'green' };
    case 'offen':
      return { text: MONATS_STATUS_LABEL.offen, ton: 'orange' };
    case 'geaendert':
      return { text: MONATS_STATUS_LABEL.geaendert, ton: 'red' };
    case 'abgerechnet':
      return { text: MONATS_STATUS_LABEL.abgerechnet, ton: 'blue' };
    case 'keine':
      return { text: MONATS_STATUS_LABEL.keine, ton: '' };
  }
}

/** Satz am Knopf „Monat bestätigen“. */
export function bestaetigungsSatz(monat: string): string {
  return `Ich bestätige, dass meine Stunden und die Leistungstexte für ${monatName(monat)} vollständig erfasst sind.`;
}

/** Zeitraum einer Periode in einer Zeile: „KW 44 · 26.10.26 - 30.10.26“. */
export function periodeKurztext(p: Pick<ErfassungsPeriode, 'datumText'>): string {
  return p.datumText.replace(/\n/g, ' · ');
}

/** Hinweis an einer gesperrten Periode. */
export function gesperrtHinweis(p: Pick<ErfassungsPeriode, 'gesperrtIn'>): string {
  return p.gesperrtIn
    ? `Abgerechnet in „${nachweisTitel(p.gesperrtIn)}“ – der Leistungstext lässt sich nicht mehr ändern.`
    : 'Abgerechnet – der Leistungstext lässt sich nicht mehr ändern.';
}

const tageVon = (leistungen: Pick<Leistung, 'datum'>[]) => [...new Set(leistungen.map((l) => langDatum(l.datum)))].join(', ');

/**
 * Hinweis auf eigene Leistungen in abgerechneten Zeiträumen, die nach dem
 * Abschluss erfasst (`erfasst`, nicht abgerechnet – über ein Nachreichen
 * entscheidet das Controlling) bzw. geändert wurden (`geaendert`, abgerechnet
 * bleibt der Stand des Abschlusses); null ohne solche.
 */
export function nachAbschlussHinweis(erfasst: Pick<Leistung, 'datum'>[], geaendert: Pick<Leistung, 'datum'>[] = []): string | null {
  const saetze: string[] = [];
  if (erfasst.length === 1) {
    saetze.push(
      `Ihre Leistung vom ${tageVon(erfasst)} liegt in einem bereits abgerechneten Zeitraum und wurde nach dem Abschluss erfasst – sie geht nicht in den abgeschlossenen Leistungsnachweis ein; über ein Nachreichen entscheidet das Controlling.`,
    );
  } else if (erfasst.length > 1) {
    saetze.push(
      `${erfasst.length} Ihrer Leistungen (${tageVon(erfasst)}) liegen in bereits abgerechneten Zeiträumen und wurden nach dem Abschluss erfasst – sie gehen nicht in den abgeschlossenen Leistungsnachweis ein; über ein Nachreichen entscheidet das Controlling.`,
    );
  }
  if (geaendert.length === 1) {
    saetze.push(
      `Ihre Leistung vom ${tageVon(geaendert)} ist bereits abgerechnet und wurde nach dem Abschluss geändert – abgerechnet bleibt der Stand des Abschlusses; die Änderung geht erst ein, wenn das Controlling den Leistungsnachweis wieder öffnet.`,
    );
  } else if (geaendert.length > 1) {
    saetze.push(
      `${geaendert.length} Ihrer Leistungen (${tageVon(geaendert)}) sind bereits abgerechnet und wurden nach dem Abschluss geändert – abgerechnet bleibt der Stand des Abschlusses; die Änderungen gehen erst ein, wenn das Controlling den Leistungsnachweis wieder öffnet.`,
    );
  }
  return saetze.length ? saetze.join(' ') : null;
}

/**
 * Hinweis auf eigene Leistungen des Monats, die ein abgeschlossener Nachweis
 * abrechnet, der ihr Datum nicht umfasst (`AnderswoAbgerechnet`, etwa nach
 * einer Datumsänderung nach dem Abschluss); null ohne solche.
 */
export function anderswoAbgerechnetHinweis(eintraege: AnderswoAbgerechnet[]): string | null {
  if (eintraege.length === 0) return null;
  const leistungen = eintraege.map((e) => e.leistung);
  const nachweise = [...new Map(eintraege.map((e) => [e.nachweis.id, e.nachweis])).values()];
  const titel = nachweise.map((n) => `„${nachweisTitel(n)}“`).join(', ');
  const den = nachweise.length === 1 ? 'den Leistungsnachweis' : 'die Leistungsnachweise';
  return eintraege.length === 1
    ? `Ihre Leistung vom ${tageVon(leistungen)} ist bereits in ${titel} abgerechnet – sie zählt dort und nicht in den Zeiträumen dieses Monats. Änderungen an ihr gehen erst ein, wenn das Controlling ${den} wieder öffnet.`
    : `${eintraege.length} Ihrer Leistungen (${tageVon(leistungen)}) sind bereits in ${titel} abgerechnet – sie zählen dort und nicht in den Zeiträumen dieses Monats. Änderungen an ihnen gehen erst ein, wenn das Controlling ${den} wieder öffnet.`;
}

/** Meldung, solange Zeiträume ohne gemeinsamen Text den Monat nicht bestätigen lassen; null ohne solche. */
export function ohneTextMeldung(ohneText: Pick<ErfassungsPeriode, 'datumText'>[]): string | null {
  if (ohneText.length === 0) return null;
  return `Bitte zuerst für jeden Zeitraum mit eigenen Leistungen einen Leistungstext verfassen – es fehlt noch: ${ohneText
    .map(periodeKurztext)
    .join('; ')}.`;
}

/** Meldung von `monatBestaetigen`, wenn sich der Monat nicht bestätigen lässt; null, wenn doch (oder er schon bestätigt ist). */
export function bestaetigenMeldung(s: MonatsStatus): string | null {
  if (s.status === 'keine') return 'In diesem Monat haben Sie keine eigenen Leistungen in diesem Projekt.';
  if (s.status === 'abgerechnet') return 'Der Monat ist bereits abgerechnet – eine Bestätigung ist nicht mehr nötig.';
  if (s.status === 'bestaetigt') return null;
  return ohneTextMeldung(s.ohneText);
}

/* ------------------------------------------------------------------ */
/* Änderungen (rein; der Store wendet sie in `mutate` an)              */
/* ------------------------------------------------------------------ */

/**
 * Setzt den gemeinsamen Text einer Periode – ohne Prüfung der Rechte (die
 * macht der Store, `darfPeriodentextBearbeiten`). Der Text wird am Anfang und
 * Ende von Leerraum befreit; ein leerer entfernt den Eintrag. Gemerkt werden
 * die Leistungen, deren Stichpunkte beim Bearbeiten zu sehen waren – mit
 * Kennung (`leistungIds`) und Inhalt (`inhalte`, `stichpunktInhalt`) –, der
 * Name unter „Angemeldet als“ und der Zeitpunkt: mit `mitarbeiterId` (der
 * Store, im Bereich) die eigenen Leistungen der Person zusätzlich zu den schon
 * gemerkten – die Stichpunkte der anderen sieht sie nicht, für sie bleiben
 * deren Leistungen „neu“ (`neueStichpunkte`); ohne alle Leistungen der
 * Periode. Mit `neueStichpunkteOffenLassen` bleiben die bisher gemerkten
 * Leistungen – so verschwindet der Hinweis auf neue Stichpunkte beim bloßen
 * Weiterschreiben nicht. Bleibt der Text gleich und ändern sich nur die
 * gemerkten Leistungen („Als berücksichtigt markieren“), bleiben Bearbeiter
 * und Zeitpunkt. Ändert sich nichts, bleibt der Bestand derselbe.
 */
export function periodentextAnwenden(
  daten: LeistungsnachweisDaten,
  projektId: ID,
  schluessel: string,
  text: string,
  bearbeiter: string,
  jetzt: string,
  optionen: { neueStichpunkteOffenLassen?: boolean; mitarbeiterId?: ID } = {},
): LeistungsnachweisDaten {
  const liste = daten.periodentexte ?? [];
  const alt = liste.find((t) => t.projektId === projektId && t.schluessel === schluessel);
  const sauber = text.trim();
  if (!sauber) return alt ? { ...daten, periodentexte: liste.filter((t) => t !== alt) } : daten;
  const inPeriode = verzeichnis(daten, projektId).gruppen.get(schluessel)?.leistungen ?? [];
  const { mitarbeiterId } = optionen;
  const sichtbar = mitarbeiterId === undefined ? inPeriode : inPeriode.filter((l) => l.mitarbeiterId === mitarbeiterId);
  const bisher = mitarbeiterId === undefined ? null : alt;
  const behalten = alt && optionen.neueStichpunkteOffenLassen;
  const leistungIds = behalten ? alt.leistungIds : [...new Set([...(bisher?.leistungIds ?? []), ...sichtbar.map((l) => l.id)])];
  const inhalte = behalten
    ? (alt.inhalte ?? [])
    : [...new Set([...(bisher?.inhalte ?? []), ...sichtbar.map(stichpunktInhalt)])];
  if (alt && alt.text === sauber && gleicheMenge(alt.leistungIds, leistungIds) && gleicheMenge(alt.inhalte ?? [], inhalte)) return daten;
  // Nur die gemerkten Leistungen ändern sich: kein Bearbeiten des Texts
  const nurGemerkt = !!alt && alt.text === sauber;
  const neu: Periodentext = {
    projektId,
    schluessel,
    text: sauber,
    leistungIds,
    inhalte,
    bearbeiter: nurGemerkt ? alt.bearbeiter : bearbeiter,
    geaendert: nurGemerkt ? alt.geaendert : jetzt,
  };
  return { ...daten, periodentexte: alt ? liste.map((t) => (t === alt ? neu : t)) : [...liste, neu] };
}

const gleicheMenge = (a: ID[], b: ID[]) => {
  if (a.length !== b.length) return false;
  const menge = new Set(a);
  return b.every((id) => menge.has(id));
};

/**
 * Bestätigt den Monat für die Person – nur, wenn er sich bestätigen lässt
 * (`MonatsStatus.bestaetigbar`); eine frühere (erloschene) Bestätigung wird
 * ersetzt. Ohne Rechteprüfung (Store: `darfBestaetigen`).
 */
export function bestaetigenAnwenden(
  daten: LeistungsnachweisDaten,
  projektId: ID,
  mitarbeiterId: ID,
  monat: string,
  jetzt: string,
): LeistungsnachweisDaten {
  const s = monatsStatus(daten, projektId, mitarbeiterId, monat);
  if (!s.bestaetigbar) return daten;
  // Je Zeitraum, auch die gesperrten: Hebt „Wieder öffnen“ eine Sperre auf, zählt der Zeitraum wieder, wie er bestätigt war
  const neu: Bestaetigung = { projektId, mitarbeiterId, monat, am: jetzt, perioden: s.periodenKennungen };
  const andere = (daten.bestaetigungen ?? []).filter(
    (b) => !(b.projektId === projektId && b.mitarbeiterId === mitarbeiterId && b.monat === monat),
  );
  return { ...daten, bestaetigungen: [...andere, neu] };
}

/** Nimmt die Bestätigung der Person für Projekt und Monat zurück (ohne Rechteprüfung). */
export function bestaetigungZuruecknehmenAnwenden(
  daten: LeistungsnachweisDaten,
  projektId: ID,
  mitarbeiterId: ID,
  monat: string,
): LeistungsnachweisDaten {
  const liste = daten.bestaetigungen ?? [];
  const rest = liste.filter((b) => !(b.projektId === projektId && b.mitarbeiterId === mitarbeiterId && b.monat === monat));
  return rest.length === liste.length ? daten : { ...daten, bestaetigungen: rest };
}

/**
 * Läuft nach jeder Änderung (`aenderungAnwenden` im Store): entfernt gemeinsame
 * Texte ohne Projekt und Bestätigungen ohne Projekt bzw. Mitarbeiter – so
 * räumen „Projekt löschen“ (auch über das Projektregister) und „Mitarbeiter
 * löschen“ sie mit ab. Ohne Änderung derselbe Bestand.
 */
export function erfassungBereinigen(daten: LeistungsnachweisDaten): LeistungsnachweisDaten {
  const projekte = new Set(daten.projekte.map((p) => p.id));
  const mitarbeiter = new Set(daten.mitarbeiter.map((m) => m.id));
  const texte = daten.periodentexte ?? [];
  const bestaetigungen = daten.bestaetigungen ?? [];
  const texteNeu = texte.filter((t) => projekte.has(t.projektId));
  const bestaetigungenNeu = bestaetigungen.filter((b) => projekte.has(b.projektId) && mitarbeiter.has(b.mitarbeiterId));
  if (texteNeu.length === texte.length && bestaetigungenNeu.length === bestaetigungen.length && daten.periodentexte && daten.bestaetigungen) {
    return daten;
  }
  return {
    ...daten,
    periodentexte: texteNeu.length === texte.length && daten.periodentexte ? daten.periodentexte : texteNeu,
    bestaetigungen: bestaetigungenNeu.length === bestaetigungen.length && daten.bestaetigungen ? daten.bestaetigungen : bestaetigungenNeu,
  };
}

/**
 * Erfassungsperiode eines Datums in der Gliederung des Projekts
 * (`erfassungsPeriodeIn` – im Raster des Projekts bzw. eines abgeschlossenen
 * Nachweises, an den Grenzen der Nachweise geteilt).
 */
export function erfassungsPeriodeVon(daten: Pick<LeistungsnachweisDaten, 'projekte' | 'nachweise'>, projektId: ID, datum: ISODate): Periode {
  const { raster: _raster, ...p } = erfassungsPeriodeIn(erfassungsGliederung(daten, projektId), datum);
  void _raster;
  return p;
}

/* ------------------------------------------------------------------ */
/* Texte nachziehen, wenn sich die Grenzen der Nachweise ändern        */
/* ------------------------------------------------------------------ */

/** Monat und Periode eines Schlüssels – ohne den Beginn eines Teils („2026-11|M2026-11“). */
const grundSchluessel = (schluessel: string) => schluessel.split(ERFASSUNG_TRENNER).slice(0, 2).join(ERFASSUNG_TRENNER);

/** Beginn des Zeitraums eines Schlüssels – zum Ordnen beim Zusammenführen. */
const beginnVon = (schluessel: string) => erfassungsPeriodeAusSchluessel(schluessel)?.von ?? '';

/**
 * Wohin die gemeinsamen Texte eines Projekts ziehen, wenn sich die Gliederung
 * von `vorher` nach `nachher` ändert: je bisherigem Zeitraum mit Leistungen
 * (Leistungen von `leistungen`, dem neuen Stand) der neue Zeitraum seiner
 * frühesten Leistung – null bei einem anderen Raster (der Text bleibt, wo er
 * ist). Texte ohne Eintrag (Zeiträume ohne Leistungen) bleiben ebenfalls.
 */
function textZiele(
  vorher: ErfassungsGliederung,
  nachher: ErfassungsGliederung,
  leistungen: Leistung[],
  projektId: ID,
): Map<string, string | null> {
  const ziel = new Map<string, string | null>();
  for (const l of leistungen.filter((x) => x.projektId === projektId).sort(nachDatum)) {
    const bisher = erfassungsPeriodeIn(vorher, l.datum).schluessel;
    if (ziel.has(bisher)) continue;
    const jetzt = erfassungsPeriodeIn(nachher, l.datum).schluessel;
    ziel.set(bisher, grundSchluessel(bisher) === grundSchluessel(jetzt) ? jetzt : null);
  }
  return ziel;
}

/** Ziel eines Texts nach `textZiele` – ohne Eintrag bzw. bei anderem Raster sein bisheriger Zeitraum. */
const textZiel = (ziele: Map<string, string | null>, t: Pick<Periodentext, 'schluessel'>) => ziele.get(t.schluessel) ?? t.schluessel;

/**
 * Läuft nach jeder Änderung (`aenderungAnwenden` im Store, nicht beim
 * Einspielen): Ändern sich die Grenzen der Nachweise eines Projekts
 * (`erfassungsGliederung` – etwa „Zeitraum ändern“, Löschen, Zusammenfassen
 * offener Nachweise, ein Abschluss, der das Ende vorzieht), ziehen die
 * gemeinsamen Texte mit ihren Leistungen um, statt zu verwaisen:
 * * Fällt eine Grenze weg, geht der Text eines Teils im Text des ganzen
 *   Zeitraums auf – in zeitlicher Folge, ohne Wiederholungen
 *   (`texteZusammenfuehren`); bearbeitet zuletzt hat ihn, wer einen der Teile
 *   zuletzt bearbeitet hat.
 * * Teilt eine neue Grenze einen Zeitraum, behält der erste Teil mit
 *   Leistungen den Text; die übrigen bekommen einen eigenen.
 * Maßgeblich sind die Leistungen des neuen Stands – je Tag in bisheriger und
 * neuer Gliederung. Texte ohne Leistungen bleiben, wo sie sind, ebenso Texte
 * eines anderen Rasters (Rasterwechsel des Projekts bzw. „Wieder öffnen“ eines
 * im früheren Raster abgeschlossenen Nachweises: Sie gelten wieder, wenn das
 * Raster zurückgestellt wird). Bestätigungen zieht danach
 * `bestaetigungenNachziehen` mit. Rein; ohne Änderung derselbe Bestand.
 */
export function periodentexteNachziehen(alt: LeistungsnachweisDaten, neu: LeistungsnachweisDaten): LeistungsnachweisDaten {
  const texte = neu.periodentexte ?? [];
  if (texte.length === 0 || (alt.nachweise === neu.nachweise && alt.projekte === neu.projekte)) return neu;
  let liste = texte;
  for (const projektId of new Set(texte.map((t) => t.projektId))) {
    const vorher = erfassungsGliederung(alt, projektId);
    const nachher = erfassungsGliederung(neu, projektId);
    if (gleicheGliederung(vorher, nachher)) continue;
    // Je bisherigem Zeitraum: der neue Zeitraum seiner frühesten Leistung (null: anderes Raster – bleibt)
    const ziele = textZiele(vorher, nachher, neu.leistungen, projektId);
    const eigene = liste.filter((t) => t.projektId === projektId);
    const wohin = (t: Periodentext) => textZiel(ziele, t);
    if (eigene.every((t) => wohin(t) === t.schluessel)) continue;
    const jeZiel = new Map<string, Periodentext[]>();
    for (const t of eigene) jeZiel.set(wohin(t), [...(jeZiel.get(wohin(t)) ?? []), t]);
    const ersetzt = new Map<Periodentext, Periodentext | null>();
    for (const [schluessel, gruppe] of jeZiel) {
      if (gruppe.length === 1 && gruppe[0].schluessel === schluessel) continue;
      const folge = [...gruppe].sort((a, b) => beginnVon(a.schluessel).localeCompare(beginnVon(b.schluessel)));
      const zuletzt = gruppe.reduce((a, b) => (b.geaendert > a.geaendert ? b : a));
      const inhalte = gruppe.some((t) => t.inhalte) ? [...new Set(gruppe.flatMap((t) => t.inhalte ?? []))] : undefined;
      const zusammen: Periodentext = {
        projektId,
        schluessel,
        text: texteZusammenfuehren(folge.map((t) => t.text)),
        leistungIds: [...new Set(gruppe.flatMap((t) => t.leistungIds))],
        ...(inhalte ? { inhalte } : {}),
        bearbeiter: zuletzt.bearbeiter,
        geaendert: zuletzt.geaendert,
      };
      // Der erste der Gruppe nimmt den Platz ein, die übrigen entfallen
      gruppe.forEach((t, i) => ersetzt.set(t, i === 0 ? zusammen : null));
    }
    liste = liste.flatMap((t) => {
      if (!ersetzt.has(t)) return [t];
      const statt = ersetzt.get(t);
      return statt ? [statt] : [];
    });
  }
  return liste === texte ? neu : { ...neu, periodentexte: liste };
}

/**
 * Wie viele gemeinsame Texte eine Änderung in einen anderen Zeitraum
 * verschiebt bzw. mit einem anderen zusammenführt (`periodentexteNachziehen`)
 * – für Rückfragen wie „Löschen“ im Controlling.
 */
export function nachgezogenePeriodentexte(alt: LeistungsnachweisDaten, neu: LeistungsnachweisDaten): number {
  const danach = periodentexteNachziehen(alt, neu).periodentexte ?? [];
  const bleibt = new Set(danach.map((t) => `${t.projektId}\u0000${t.schluessel}`));
  return (neu.periodentexte ?? []).filter((t) => !bleibt.has(`${t.projektId}\u0000${t.schluessel}`)).length;
}

/** Hinweis zu `nachgezogenePeriodentexte` in Rückfragen; null ohne solche Texte. */
export function nachziehenHinweis(anzahl: number): string | null {
  if (anzahl <= 0) return null;
  return anzahl === 1
    ? '1 gemeinsamer Leistungstext der Mitarbeiter gehört zu einem Teil eines Zeitraums, dessen Grenze sich damit ändert – er geht im Text des neuen Zeitraums auf.'
    : `${anzahl} gemeinsame Leistungstexte der Mitarbeiter gehören zu Teilen von Zeiträumen, deren Grenzen sich damit ändern – sie gehen im Text der neuen Zeiträume auf.`;
}

/** Gemeinsame Texte eines Projekts in ihrer Reihenfolge im Bestand. */
const texteDesProjekts = (d: LeistungsnachweisDaten, projektId: ID) => (d.periodentexte ?? []).filter((t) => t.projektId === projektId);

/**
 * Läuft nach `periodentexteNachziehen` (`aenderungAnwenden` im Store, nicht
 * beim Einspielen): Gehen mit geänderten Grenzen der Nachweise Teile eines
 * Zeitraums in einem Zeitraum auf, ändert sich dessen Kennung
 * (`periodenKennung`) durch den zusammengeführten Text, obwohl niemand Stunden
 * oder Texte geändert hat. Dann trägt die Bestätigung einer Person den neuen
 * Zeitraum ein – je Zeitraum ohne Sperre und mit Text, wenn
 * * alle Teile, aus denen ihre eigenen Leistungen darin stammen, nicht
 *   gesperrt und so bestätigt waren, wie sie vor der Änderung waren (ein
 *   gesperrter Teil brauchte keinen Text – fällt die Sperre mit dem Löschen
 *   eines abgeschlossenen Nachweises weg, wird neu bestätigt),
 * * ihre eigenen Leistungen darin genau die dieser Teile sind und
 *   unverändert (gleiche Kennung mit dem neuen Text),
 * * der zusammengeführte Text nichts enthält, was sie nicht bestätigt hat: Er
 *   darf nur aus Sätzen bzw. Teilen bestehen, die in den Texten ihrer
 *   bestätigten Teile stehen – in welcher Reihenfolge, zählt nicht
 *   (`nurBekannteTeile` in domain/nachweis.ts). Bringt ein Teil ohne eigene
 *   Leistungen neuen Text mit, hat sich der Text für sie geändert – die
 *   Bestätigung erlischt; steht sein Text schon in ihrem, nicht (auch wenn
 *   seine Sätze dadurch nach vorn rücken),
 * * alle Teile zur selben Periode im selben Raster gehören (kein Rasterwechsel) und
 * * die Änderung selbst keinen gemeinsamen Text des Projekts gesetzt hat
 *   (`roh` ist der Stand vor dem Nachziehen der Texte).
 * Die Kennungen der aufgegangenen Teile entfallen aus `perioden`. Eine Teilung
 * (neue Grenze mitten in einem Zeitraum) zieht keine Bestätigung mit: Der
 * neue Teil braucht einen eigenen Text. `grenzFolgen` rechnet ebenso – die
 * Rückfragen nennen jede Bestätigung, die erlischt. Rein; ohne Änderung derselbe Bestand.
 */
export function bestaetigungenNachziehen(
  alt: LeistungsnachweisDaten,
  roh: LeistungsnachweisDaten,
  neu: LeistungsnachweisDaten,
): LeistungsnachweisDaten {
  const liste = neu.bestaetigungen ?? [];
  if (liste.length === 0 || (alt.nachweise === neu.nachweise && alt.projekte === neu.projekte)) return neu;
  const vorherige = new Set(alt.bestaetigungen ?? []);
  const gleichGegliedert = new Map<ID, boolean>();
  const texteUnberuehrt = new Map<ID, boolean>();
  // Je Projekt und neuem Zeitraum die bisherigen Texte, die in seinem aufgehen (`periodentexteNachziehen`)
  const quelltexte = new Map<ID, Map<string, Periodentext[]>>();
  const quelltexteVon = (projektId: ID, schluessel: string): Periodentext[] => {
    let jeZiel = quelltexte.get(projektId);
    if (!jeZiel) {
      const ziele = textZiele(erfassungsGliederung(alt, projektId), erfassungsGliederung(neu, projektId), neu.leistungen, projektId);
      jeZiel = new Map();
      for (const t of texteDesProjekts(alt, projektId)) {
        if (!t.text.trim()) continue;
        const ziel = textZiel(ziele, t);
        jeZiel.set(ziel, [...(jeZiel.get(ziel) ?? []), t]);
      }
      quelltexte.set(projektId, jeZiel);
    }
    return jeZiel.get(schluessel) ?? [];
  };
  let geaendert = false;
  const ergebnis = liste.map((b) => {
    // Nur Bestätigungen, die die Änderung selbst nicht gesetzt hat, in Projekten mit neuen Grenzen
    if (!vorherige.has(b)) return b;
    if (!gleichGegliedert.has(b.projektId)) {
      gleichGegliedert.set(b.projektId, gleicheGliederung(erfassungsGliederung(alt, b.projektId), erfassungsGliederung(neu, b.projektId)));
    }
    if (gleichGegliedert.get(b.projektId)) return b;
    if (!texteUnberuehrt.has(b.projektId)) {
      const vorher = texteDesProjekts(alt, b.projektId);
      const danach = texteDesProjekts(roh, b.projektId);
      texteUnberuehrt.set(b.projektId, vorher.length === danach.length && vorher.every((t, i) => t === danach[i]));
    }
    if (!texteUnberuehrt.get(b.projektId)) return b;

    const vorher = erfassungsPerioden(alt, b.projektId, b.mitarbeiterId, b.monat);
    const kennungVorher = new Map(vorher.map((p) => [p.schluessel, periodenKennung(p)]));
    const teilDerLeistung = new Map<ID, ErfassungsPeriode>();
    for (const p of vorher) for (const l of p.eigene) teilDerLeistung.set(l.id, p);
    let perioden = b.perioden;
    for (const q of erfassungsPerioden(neu, b.projektId, b.mitarbeiterId, b.monat)) {
      if (q.gesperrt || !q.text) continue;
      const kennung = periodenKennung(q);
      const bestaetigt = new Set(Object.values(perioden));
      if (bestaetigt.has(kennung)) continue;
      const teile = [...new Set(q.eigene.map((l) => teilDerLeistung.get(l.id)))];
      if (teile.length === 0 || teile.some((t) => !t)) continue;
      const quellen = teile as ErfassungsPeriode[];
      // Gesperrte Teile brauchten beim Bestätigen keinen Text – fällt ihre Sperre weg, wird neu bestätigt
      if (quellen.some((t) => t.gesperrt || grundSchluessel(t.schluessel) !== grundSchluessel(q.schluessel))) continue;
      if (quellen.some((t) => !bestaetigt.has(kennungVorher.get(t.schluessel) ?? ''))) continue;
      // Eigene Leistungen genau die der Teile und unverändert
      if (periodenKennung({ eigene: quellen.flatMap((t) => t.eigene), text: q.text }) !== kennung) continue;
      // Kein Text, den sie nicht bestätigt hat: nur Sätze bzw. Teile aus den Texten ihrer Teile, gleich in welcher Folge
      const eigeneTeile = new Set(quellen.map((t) => t.schluessel));
      const bestaetigteTexte = quelltexteVon(b.projektId, q.schluessel)
        .filter((t) => eigeneTeile.has(t.schluessel))
        .map((t) => t.text);
      if (!nurBekannteTeile(q.text.text, bestaetigteTexte)) continue;
      const aufgegangen = new Set(quellen.map((t) => kennungVorher.get(t.schluessel)));
      perioden = { ...Object.fromEntries(Object.entries(perioden).filter(([, k]) => !aufgegangen.has(k))), [q.schluessel]: kennung };
    }
    if (perioden === b.perioden) return b;
    geaendert = true;
    return { ...b, perioden };
  });
  return geaendert ? { ...neu, bestaetigungen: ergebnis } : neu;
}

/** Was eine Änderung der Grenzen der Nachweise für die gemeinsamen Texte und Bestätigungen bedeutet (`grenzFolgen`). */
export interface GrenzFolgen {
  /** Texte von Teilen, die umziehen bzw. im Text eines ganzen Zeitraums aufgehen (`nachgezogenePeriodentexte`). */
  texte: number;
  /**
   * Neue Teile: Zeiträume mit Leistungen, nicht gesperrt und ohne Text, deren
   * Leistungen bisher in einem Zeitraum mit Text lagen – dort verfassen die
   * Mitarbeiter einen eigenen Text (nach Beginn sortiert).
   */
  neueTeile: Periode[];
  /**
   * Bestätigungen, die jetzt gelten (Status 'bestaetigt' – bzw. 'abgerechnet',
   * wenn ein Zeitraum wieder zählt) und danach erloschen sind (Status
   * 'geaendert'), nach Monat.
   */
  erloschen: { mitarbeiterId: ID; monat: string; projektId: ID }[];
}

/**
 * Folgen einer Änderung von `alt` nach `neu` (etwa „Zeitraum ändern“,
 * „Neuer Leistungsnachweis“, Löschen, „Wieder öffnen“) – gerechnet wie
 * `aenderungAnwenden` im Store: mit `periodentexteNachziehen` und
 * `bestaetigungenNachziehen`. Für die Rückfragen im Controlling
 * (`grenzFolgenHinweis`).
 */
export function grenzFolgen(alt: LeistungsnachweisDaten, neu: LeistungsnachweisDaten): GrenzFolgen {
  const danach = bestaetigungenNachziehen(alt, neu, periodentexteNachziehen(alt, neu));
  const neueTeile: Periode[] = [];
  const projekte = new Set([...alt.projekte, ...danach.projekte].map((p) => p.id));
  for (const projektId of projekte) {
    if (gleicheGliederung(erfassungsGliederung(alt, projektId), erfassungsGliederung(danach, projektId))) continue;
    const vorher = verzeichnis(alt, projektId);
    const nachher = verzeichnis(danach, projektId);
    const gruppeVorher = new Map<ID, Gruppe>();
    for (const g of vorher.gruppen.values()) for (const l of g.leistungen) gruppeVorher.set(l.id, g);
    for (const g of nachher.gruppen.values()) {
      if (g.gesperrtIn || nachher.texte.has(g.periode.schluessel)) continue;
      const bisherMitText = g.leistungen.some((l) => {
        const v = gruppeVorher.get(l.id);
        return !!v && v.periode.schluessel !== g.periode.schluessel && vorher.texte.has(v.periode.schluessel);
      });
      if (bisherMitText) neueTeile.push(g.periode);
    }
  }
  neueTeile.sort((a, b) => (a.von < b.von ? -1 : a.von > b.von ? 1 : 0));
  const erloschen = (alt.bestaetigungen ?? [])
    .filter(
      (b) =>
        ['bestaetigt', 'abgerechnet'].includes(monatsStatus(alt, b.projektId, b.mitarbeiterId, b.monat).status) &&
        danach.projekte.some((p) => p.id === b.projektId) &&
        monatsStatus(danach, b.projektId, b.mitarbeiterId, b.monat).status === 'geaendert',
    )
    .map((b) => ({ mitarbeiterId: b.mitarbeiterId, monat: b.monat, projektId: b.projektId }))
    .sort((a, b) => a.monat.localeCompare(b.monat));
  return { texte: nachgezogenePeriodentexte(alt, neu), neueTeile, erloschen };
}

/**
 * Hinweis zu `grenzFolgen` in Rückfragen, etwa „Damit beginnt am 26.11.2026
 * ein neuer Zeitraum der gemeinsamen Leistungstexte – für die Tage ab dann
 * verfassen die Mitarbeiter einen eigenen Text. 2 Bestätigungen erlöschen:
 * Anna Becker (November 2026), Bernd Kurz (November 2026) – diese Monate sind
 * im Bereich erneut zu bestätigen.“; null ohne Folgen.
 */
export function grenzFolgenHinweis(f: GrenzFolgen, mitarbeiter: Mitarbeiter[]): string | null {
  const saetze: string[] = [];
  const texte = nachziehenHinweis(f.texte);
  if (texte) saetze.push(texte);
  if (f.neueTeile.length > 0) {
    const tage = [...new Set(f.neueTeile.map((p) => langDatum(p.von)))];
    saetze.push(
      tage.length === 1
        ? `Damit beginnt am ${tage[0]} ein neuer Zeitraum der gemeinsamen Leistungstexte – für die Tage ab dann verfassen die Mitarbeiter einen eigenen Text.`
        : `Damit beginnen neue Zeiträume der gemeinsamen Leistungstexte (am ${tage.join(', ')}) – für diese Tage verfassen die Mitarbeiter eigene Texte.`,
    );
  }
  if (f.erloschen.length > 0) {
    const namen = new Map(mitarbeiter.map((m) => [m.id, mitarbeiterName(m) || m.kuerzel]));
    const wer = f.erloschen.map((e) => `${namen.get(e.mitarbeiterId) || '?'} (${monatName(e.monat)})`).join(', ');
    saetze.push(
      f.erloschen.length === 1
        ? `Die Bestätigung von ${wer} erlischt – der Monat ist im Bereich erneut zu bestätigen.`
        : `${f.erloschen.length} Bestätigungen erlöschen: ${wer} – diese Monate sind im Bereich erneut zu bestätigen.`,
    );
  }
  return saetze.length ? saetze.join(' ') : null;
}

/**
 * Gemeinsame Texte, die nach „Wieder öffnen“ eines abgeschlossenen
 * Nachweises nicht mehr gelten: Er wurde in einem anderen Raster
 * abgeschlossen, als das Projekt heute hat (`NachweisStand.erfassungsRaster`)
 * – danach gliedert das Projekt seine Tage im eigenen Raster. Gezählt werden
 * die Texte im Raster des Abschlusses, deren Zeitraum in seinem liegt; 0, wenn
 * das Raster gleich ist.
 */
export function periodentexteNachOeffnen(daten: LeistungsnachweisDaten, n: Leistungsnachweis): number {
  const projekt = daten.projekte.find((p) => p.id === n.projektId);
  const raster = n.status === 'abgeschlossen' ? n.stand?.erfassungsRaster : undefined;
  if (!projekt || !raster || raster === projekt.raster) return 0;
  return (daten.periodentexte ?? []).filter((t) => {
    if (t.projektId !== n.projektId || !t.text.trim()) return false;
    const p = erfassungsPeriodeAusSchluessel(t.schluessel);
    return !!p && p.raster === raster && p.von >= n.von && p.von <= n.bis;
  }).length;
}
