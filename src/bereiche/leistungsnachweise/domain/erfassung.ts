/**
 * Erfassung der Mitarbeiter je Monat: gemeinsame Leistungstexte je Zeitraum
 * und die Monatsbestätigung.
 *
 * Jede Person erfasst bzw. importiert ihre Stunden mit ihren Stichpunkten
 * (`Leistung.text`). Daraus schreiben alle, die in einem Zeitraum eines
 * Projekts Leistungen haben, einen gemeinsamen Fließtext (`Periodentext`).
 * Der Zeitraum ist eine **Erfassungsperiode**: die Periode im Raster des
 * Projekts (`Projekt.raster` – Tag, Woche oder Monat, eingestellt vom
 * Controlling), auf den Kalendermonat gekürzt (`erfassungsPeriode` in
 * domain/zeitraum.ts). Eine Woche über ein Monatsende hat deshalb je Monat
 * einen eigenen Text; im Leistungsnachweis über beide Monate bleibt sie eine
 * Zeile, deren Text sich aus beiden zusammensetzt (`gemeinsamerZeilentext` in
 * domain/nachweis.ts).
 *
 * Eingabe und Bestätigung gelten je Monat: Wer alle Zeiträume eines Monats
 * mit eigenen Leistungen mit Text versehen hat, bestätigt, dass Stunden und
 * Texte vollständig sind (`Bestaetigung`). Die Bestätigung merkt sich eine
 * Kennung des bestätigten Stands (`bestaetigungsKennung`) – ändern sich danach
 * die eigenen Leistungen oder die gemeinsamen Texte, ist sie erloschen
 * (`monatsStatus` 'geaendert').
 *
 * **Gesperrt** ist eine Erfassungsperiode, sobald eine ihrer Leistungen (gleich
 * von wem) im Stand eines abgeschlossenen Nachweises abgerechnet ist
 * (`abgerechneteLeistungen`): Ihr Text lässt sich nur noch lesen, und ihre
 * Leistungen zählen nicht mehr zur Bestätigung. Nicht abgerechnete Leistungen
 * darin (nach dem Abschluss erfasst bzw. geändert) nennt ein Hinweis
 * (`nachAbschlussHinweis`).
 *
 * Wer was sehen und ändern darf, steht in domain/rechte.ts
 * (`darfPeriodentextLesen`, `darfPeriodentextBearbeiten`,
 * `stichpunkteDerPeriode`, `darfBestaetigen`); hier wird nur gerechnet.
 * Alles rein; die Änderungen wendet der Store mit `periodentextAnwenden`,
 * `bestaetigenAnwenden` und `bestaetigungZuruecknehmenAnwenden` an.
 */
import {
  abgerechnetIn,
  abgerechneteLeistungen,
  leistungenDesNachweises,
  nachweisDerLeistung,
  nachweisTitel,
  stundenVon,
  tagVon,
  textErgaenzen,
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
  erfassungsPeriode,
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
  monat: string;
  leistungen: Leistung[];
}

interface ProjektVerzeichnis {
  raster: Raster;
  /** Gruppen je Monat (JJJJ-MM), nach Beginn sortiert; Leistungen darin nach Datum. */
  monate: Map<string, Gruppe[]>;
  gruppen: Map<string, Gruppe>;
  abgerechnet: Set<ID>;
  texte: Map<string, Periodentext>;
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

  const raster = daten.projekte.find((p) => p.id === projektId)?.raster ?? 'monat';
  const gruppen = new Map<string, Gruppe>();
  for (const l of daten.leistungen) {
    if (l.projektId !== projektId) continue;
    const p = erfassungsPeriode(l.datum, raster);
    const g = gruppen.get(p.schluessel);
    if (g) g.leistungen.push(l);
    else gruppen.set(p.schluessel, { periode: p, monat: l.datum.slice(0, 7), leistungen: [l] });
  }
  const monate = new Map<string, Gruppe[]>();
  for (const g of gruppen.values()) {
    g.leistungen.sort(nachDatum);
    const liste = monate.get(g.monat);
    if (liste) liste.push(g);
    else monate.set(g.monat, [g]);
  }
  for (const liste of monate.values()) liste.sort((a, b) => (a.periode.von < b.periode.von ? -1 : a.periode.von > b.periode.von ? 1 : 0));
  const texte = new Map<string, Periodentext>();
  for (const t of daten.periodentexte ?? []) {
    if (t.projektId === projektId && t.text.trim() && !texte.has(t.schluessel)) texte.set(t.schluessel, t);
  }
  const v: ProjektVerzeichnis = { raster, monate, gruppen, abgerechnet: abgerechneteLeistungen(daten, projektId), texte };
  jeProjekt.set(projektId, v);
  return v;
}

/* ------------------------------------------------------------------ */
/* Erfassungsperioden                                                  */
/* ------------------------------------------------------------------ */

/** Eine Erfassungsperiode eines Projekts aus Sicht einer Person (`erfassungsPerioden`). */
export interface ErfassungsPeriode {
  /** Monat und Periode, etwa „2026-10|W2026-44“ – Schlüssel des gemeinsamen Texts. */
  schluessel: string;
  projektId: ID;
  /** JJJJ-MM */
  monat: string;
  /** Auf den Monat gekürzt. */
  von: ISODate;
  bis: ISODate;
  raster: Raster;
  /** Wie die Spalte „Datum“ im Nachweis, etwa „KW 44\n26.10.26 - 30.10.26“ (`datumText`). */
  datumText: string;
  /** Alle Leistungen der Periode (aller Personen), nach Datum. */
  leistungen: Leistung[];
  /** Die der Person (`mitarbeiterId` des Aufrufs). */
  eigene: Leistung[];
  /**
   * Die der anderen – für Zahlen. Einzeln anzeigen nur, was `stichpunkteDerPeriode`
   * (domain/rechte.ts) freigibt.
   */
  andere: Leistung[];
  stundenEigene: number;
  stundenAlle: number;
  /** Gemeinsamer Text oder null (keiner bzw. leer). */
  text: Periodentext | null;
  /**
   * Leistungen, die nach dem letzten Bearbeiten des Texts hinzukamen
   * (nicht in `text.leistungIds`) und deren Stichpunkte noch nicht im Text
   * vorkommen – für „Neue Stichpunkte ergänzen“ (`textErgaenzen`). Leer ohne Text.
   */
  neueStichpunkte: Leistung[];
  /** Eine Leistung der Periode ist in einem abgeschlossenen Nachweis abgerechnet – der Text ist nur zu lesen. */
  gesperrt: boolean;
  /** Der abgeschlossene Nachweis, der die Periode sperrt (soweit bekannt). */
  gesperrtIn: Leistungsnachweis | null;
  /** Eigene Leistungen einer gesperrten Periode, die nicht abgerechnet sind (nach dem Abschluss erfasst bzw. geändert). */
  nachAbschluss: Leistung[];
}

function periodeAus(daten: LeistungsnachweisDaten, projektId: ID, v: ProjektVerzeichnis, g: Gruppe, mitarbeiterId: ID | null): ErfassungsPeriode {
  const eigene = g.leistungen.filter((l) => l.mitarbeiterId === mitarbeiterId);
  const andere = g.leistungen.filter((l) => l.mitarbeiterId !== mitarbeiterId);
  const text = v.texte.get(g.periode.schluessel) ?? null;
  const abgerechnet = g.leistungen.filter((l) => v.abgerechnet.has(l.id));
  const gesperrt = abgerechnet.length > 0;
  let gesperrtIn: Leistungsnachweis | null = null;
  for (const l of abgerechnet) {
    const n = abgerechnetIn(daten, l) ?? nachweisDerLeistung(daten, l);
    if (n && n.status === 'abgeschlossen') {
      gesperrtIn = n;
      break;
    }
  }
  const bekannt = new Set(text?.leistungIds ?? []);
  const neueStichpunkte = text
    ? g.leistungen.filter((l) => !bekannt.has(l.id) && textErgaenzen(text.text, [l]) !== text.text)
    : [];
  return {
    schluessel: g.periode.schluessel,
    projektId,
    monat: g.monat,
    von: g.periode.von,
    bis: g.periode.bis,
    raster: v.raster,
    datumText: datumText(g.periode, v.raster, g.leistungen.some((l) => istWochenende(l.datum))),
    leistungen: g.leistungen,
    eigene,
    andere,
    stundenEigene: stundenVon(eigene),
    stundenAlle: stundenVon(g.leistungen),
    text,
    neueStichpunkte,
    gesperrt,
    gesperrtIn,
    nachAbschluss: gesperrt ? eigene.filter((l) => !v.abgerechnet.has(l.id)) : [],
  };
}

/**
 * Erfassungsperioden eines Monats für ein Projekt und eine Person – nur die mit
 * eigenen Leistungen der Person, nach Beginn sortiert.
 */
export function erfassungsPerioden(daten: LeistungsnachweisDaten, projektId: ID, mitarbeiterId: ID, monat: string): ErfassungsPeriode[] {
  const v = verzeichnis(daten, projektId);
  return (v.monate.get(monat) ?? [])
    .filter((g) => g.leistungen.some((l) => l.mitarbeiterId === mitarbeiterId))
    .map((g) => periodeAus(daten, projektId, v, g, mitarbeiterId));
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
  return g ? periodeAus(daten, projektId, v, g, mitarbeiterId) : null;
}

/** Alle Erfassungsperioden eines Monats eines Projekts (aller Personen), nach Beginn – etwa für das Controlling. */
export function alleErfassungsPerioden(daten: LeistungsnachweisDaten, projektId: ID, monat: string): ErfassungsPeriode[] {
  const v = verzeichnis(daten, projektId);
  return (v.monate.get(monat) ?? []).map((g) => periodeAus(daten, projektId, v, g, null));
}

/* ------------------------------------------------------------------ */
/* Bestätigung                                                         */
/* ------------------------------------------------------------------ */

/**
 * Kennung des Stands, den eine Person für einen Monat bestätigt: über ihre
 * Leistungen des Monats außerhalb gesperrter Perioden – inhaltlich, ohne
 * Kennungen (Datum, Stunden, Abschnitt, Text; sortiert), damit ein
 * unveränderter Neuimport sie nicht ändert – und über die gemeinsamen Texte
 * der nicht gesperrten Perioden mit ihren Leistungen (Schlüssel und Text).
 */
export function bestaetigungsKennung(daten: LeistungsnachweisDaten, projektId: ID, mitarbeiterId: ID, monat: string): string {
  return kennungAus(erfassungsPerioden(daten, projektId, mitarbeiterId, monat));
}

const T1 = '\u0001';

function kennungAus(perioden: ErfassungsPeriode[]): string {
  const teile: string[] = [];
  for (const p of perioden) {
    if (p.gesperrt) continue;
    for (const l of p.eigene) {
      teile.push(['L', l.datum, runden(l.stunden).toFixed(2), l.abschnittId ?? '', l.text.trim()].join(T1));
    }
    const text = p.text?.text.trim();
    if (text) teile.push(['T', p.schluessel, text].join(T1));
  }
  return pruefsumme(teile.sort().join('\u0002'));
}

/**
 * Stand eines Monats für eine Person:
 * * 'keine' – keine eigenen Leistungen im Monat;
 * * 'abgerechnet' – alle eigenen Leistungen liegen in gesperrten Perioden;
 * * 'offen' – keine Bestätigung;
 * * 'bestaetigt' – bestätigt, und der Stand ist unverändert (Kennung stimmt);
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
  /** Kennung des aktuellen Stands (`bestaetigungsKennung`). */
  kennung: string;
  /** Eigene, nicht abgerechnete Leistungen in gesperrten Perioden (`nachAbschlussHinweis`). */
  nachAbschluss: Leistung[];
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
  const kennung = kennungAus(perioden);
  const bestaetigung = bestaetigungVon(daten, projektId, mitarbeiterId, monat);
  const status: MonatsStatusArt =
    eigene.length === 0
      ? 'keine'
      : offenePerioden.length === 0
        ? 'abgerechnet'
        : !bestaetigung
          ? 'offen'
          : bestaetigung.kennung === kennung
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
    kennung,
    nachAbschluss: perioden.flatMap((p) => p.nachAbschluss),
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
  const v = verzeichnis(daten, projektId);
  const mitarbeiter = new Map(daten.mitarbeiter.map((m) => [m.id, m]));
  const auswahl = monate ? new Set(monate) : null;
  return [...v.monate.entries()]
    .filter(([monat]) => !auswahl || auswahl.has(monat))
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([monat, gruppen]) => {
      const personen = [...new Set(gruppen.flatMap((g) => g.leistungen.map((l) => l.mitarbeiterId)))]
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

/** Bestätigungen der Monate eines Nachweises (`monateDesNachweises`) – neueste zuerst, wie `bestaetigungsUebersicht`. */
export function bestaetigungenDesNachweises(daten: LeistungsnachweisDaten, n: Leistungsnachweis): BestaetigungsMonat[] {
  return bestaetigungsUebersicht(daten, n.projektId, monateDesNachweises(daten, n));
}

/**
 * Wer für welchen Monat eines Nachweises noch nicht (Status 'offen') bzw.
 * nach einer Änderung nicht erneut ('geaendert') bestätigt hat – für den
 * Hinweis beim Abschließen; aufsteigend nach Monat, dann nach Namen.
 */
export function fehlendeBestaetigungen(daten: LeistungsnachweisDaten, n: Leistungsnachweis): MonatsStatus[] {
  return bestaetigungenDesNachweises(daten, n)
    .reverse()
    .flatMap((m) => m.personen.filter((p) => p.status === 'offen' || p.status === 'geaendert'));
}

/**
 * Gemeinsame Texte eines Projekts, die nach einem Wechsel auf `raster` nicht
 * mehr gelten: die des bisherigen Rasters (Texte älterer Raster gelten schon
 * jetzt nicht). Sie bleiben gespeichert und gelten wieder, wenn das Raster
 * zurückgestellt wird. 0, wenn sich das Raster nicht ändert.
 */
export function periodentexteNachRasterwechsel(daten: LeistungsnachweisDaten, projektId: ID, raster: Raster): number {
  const bisher = daten.projekte.find((p) => p.id === projektId)?.raster;
  if (!bisher || bisher === raster) return 0;
  const praefix = { tag: 'T', woche: 'W', monat: 'M' }[bisher];
  return (daten.periodentexte ?? []).filter(
    (t) => t.projektId === projektId && t.text.trim() && t.schluessel.split(ERFASSUNG_TRENNER)[1]?.startsWith(praefix),
  ).length;
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

/**
 * Hinweis auf eigene Leistungen in abgerechneten Zeiträumen, die nach dem
 * Abschluss erfasst bzw. geändert wurden; null ohne solche.
 */
export function nachAbschlussHinweis(leistungen: Pick<Leistung, 'datum'>[]): string | null {
  if (leistungen.length === 0) return null;
  const tage = [...new Set(leistungen.map((l) => langDatum(l.datum)))].join(', ');
  return leistungen.length === 1
    ? `Ihre Leistung vom ${tage} liegt in einem bereits abgerechneten Zeitraum und wurde nach dem Abschluss erfasst bzw. geändert – sie geht nicht in den abgeschlossenen Leistungsnachweis ein; über ein Nachreichen entscheidet das Controlling.`
    : `${leistungen.length} Ihrer Leistungen (${tage}) liegen in bereits abgerechneten Zeiträumen und wurden nach dem Abschluss erfasst bzw. geändert – sie gehen nicht in den abgeschlossenen Leistungsnachweis ein; über ein Nachreichen entscheidet das Controlling.`;
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
 * die Leistungen der Periode (`leistungIds`, alle Personen), der Name unter
 * „Angemeldet als“ und der Zeitpunkt. Mit `neueStichpunkteOffenLassen` bleiben
 * die bisher gemerkten Leistungen – so verschwindet der Hinweis auf neue
 * Stichpunkte beim bloßen Weiterschreiben nicht. Ändert sich nichts
 * (gleicher Text, gleiche Leistungen), bleibt der Bestand derselbe.
 */
export function periodentextAnwenden(
  daten: LeistungsnachweisDaten,
  projektId: ID,
  schluessel: string,
  text: string,
  bearbeiter: string,
  jetzt: string,
  optionen: { neueStichpunkteOffenLassen?: boolean } = {},
): LeistungsnachweisDaten {
  const liste = daten.periodentexte ?? [];
  const alt = liste.find((t) => t.projektId === projektId && t.schluessel === schluessel);
  const sauber = text.trim();
  if (!sauber) return alt ? { ...daten, periodentexte: liste.filter((t) => t !== alt) } : daten;
  const periode = verzeichnis(daten, projektId).gruppen.get(schluessel);
  const aktuell = (periode?.leistungen ?? []).map((l) => l.id);
  const leistungIds = alt && optionen.neueStichpunkteOffenLassen ? alt.leistungIds : aktuell;
  if (alt && alt.text === sauber && gleicheMenge(alt.leistungIds, leistungIds)) return daten;
  const neu: Periodentext = { projektId, schluessel, text: sauber, leistungIds: [...leistungIds], bearbeiter, geaendert: jetzt };
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
  const neu: Bestaetigung = { projektId, mitarbeiterId, monat, am: jetzt, kennung: s.kennung };
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

/** Erfassungsperiode eines Datums im Raster des Projekts (`erfassungsPeriode`) – etwa für den Kalender. */
export function erfassungsPeriodeVon(daten: Pick<LeistungsnachweisDaten, 'projekte'>, projektId: ID, datum: ISODate): Periode {
  return erfassungsPeriode(datum, daten.projekte.find((p) => p.id === projektId)?.raster ?? 'monat');
}
