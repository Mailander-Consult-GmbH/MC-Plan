/**
 * Datenmodell des Bereichs „Leistungsnachweise“. Flache Listen, Verweise über
 * IDs – wie in den anderen Bereichen, aber vollständig davon getrennt.
 *
 * Ein Projekt sammelt die erfassten Leistungen seiner Mitarbeiter (je Tag,
 * Person und Tätigkeit eine `Leistung` mit Stunden). Ein Leistungsnachweis
 * ist ein Zeitraum eines Projekts – er läuft, bis das Controlling ihn
 * abschließt (`Zeitraumregel`), über einen oder mehrere Monate – und fasst
 * die Leistungen darin je Tag, Woche oder Monat zu Zeilen zusammen
 * (`Raster`). Mehrere Mitarbeiter schreiben so an einem gemeinsamen
 * Nachweis, ohne einander zu überschreiben: Jede Person bringt nur ihre
 * eigenen Leistungen ein, der Nachweis rechnet die Zeilen daraus.
 *
 * Wer angemeldet ist (`Einstellungen.mitarbeiterId`), erfasst nur eigene
 * Leistungen, schreibt mit den Kolleginnen und Kollegen derselben Zeiträume
 * am gemeinsamen Leistungstext (`Periodentext` – deren Stichpunkte und Stunden
 * sieht sie nicht) und bestätigt je Monat, dass Stunden und Texte vollständig
 * sind (`Bestaetigung`, domain/erfassung.ts). Fehlt der Mitarbeiter zum Namen
 * unter „Angemeldet als“, legt der Bereich ihn selbst an (domain/rechte.ts).
 * Das Controlling (der Controlling-Bereich von KaPlan nach der PIN) stellt die
 * Projekte ein, bearbeitet die Nachweise, schließt sie ab, schlägt Stunden je
 * Zeile auf (`Leistungsnachweis.aufschlaege`) und exportiert – die Rechte
 * stehen zentral in domain/rechte.ts.
 *
 * Projekte teilt der Bereich über das Projektregister (`src/gemeinsam/`) mit
 * den anderen Bereichen (domain/register.ts).
 */
export type ID = string;
/** Datum als JJJJ-MM-TT; leer = ohne Datum. */
export type ISODate = string;

/**
 * Fassung des gespeicherten Bestands. Neue Felder sind optional oder werden in
 * `migriere()` (store/storage.ts) nachgetragen – dann diese Zahl erhöhen.
 * Fassung 2: Rolle Controlling an Mitarbeitern, Aufschläge.
 * Fassung 3: ohne Rolle – das Controlling ist ein eigener Bereich mit PIN.
 * Fassung 4: Nachweise laufen bis zum Abschluss – alle Projekte erhalten die
 * Zeitraumregel „fortlaufend“.
 * Fassung 5: nachgereichte Leistungen am Nachweis (`nachgereicht`, leer).
 * Fassung 6: von Hand festgelegtes Ende am Nachweis (`bisFest`, false);
 * nachgereichte Zeilen im festgeschriebenen Stand (`NachweisZeile.nachgereicht`).
 * Fassung 7: gemeinsame Leistungstexte je Zeitraum (`periodentexte`) und
 * Monatsbestätigungen der Mitarbeiter (`bestaetigungen`), beide leer.
 */
export const DATEN_VERSION = 7;

/** Vorgabe für „Angemeldet als“. */
export const STANDARD_BEARBEITER = 'Mitarbeiter MIC';

export type Farbmodus = 'standard' | 'kontrast';

export interface Einstellungen {
  /**
   * Name unter „Angemeldet als“ – Spiegel der gemeinsamen Anmeldung aller
   * Bereiche (src/gemeinsam/benutzer.ts); der Store zieht ihn nach.
   */
  bearbeiter: string;
  /**
   * Angemeldete Person: der aktive Mitarbeiter, dessen Name dem unter
   * „Angemeldet als“ entspricht (`mitarbeiterZumNamen`, vom Store nachgezogen).
   * Fehlt er, legt der Store ihn im Bereich selbst an (`anmeldungAnwenden` in
   * domain/rechte.ts) – eine eigene Anmeldung gibt es nicht. Sie erfasst und
   * importiert nur eigene Leistungen (domain/rechte.ts). null = nicht
   * angemeldet (Name ohne Nachnamen, ausgeschiedener Mitarbeiter) – dann lässt
   * sich nichts erfassen. Solange die Daten nur im Browser liegen, ist die
   * Anmeldung eine Angabe ohne Kennwort.
   */
  mitarbeiterId: ID | null;
  farbmodus: Farbmodus;
}

/* ------------------------------------------------------------------ */
/* Mitarbeiter                                                         */
/* ------------------------------------------------------------------ */

/** Person, die Leistungen erbringt – projektübergreifend. */
export interface Mitarbeiter {
  id: ID;
  /** Kürzel, etwa „MM“ – so steht die Person auch im Import („MM: Mustermann, Max“). */
  kuerzel: string;
  vorname: string;
  nachname: string;
  /** Ausgeschiedene Personen bleiben mit ihren Leistungen erhalten, stehen aber nicht mehr zur Wahl. */
  aktiv: boolean;
}

/** „Vorname Nachname“ – so steht die Person im Leistungsnachweis. */
export function mitarbeiterName(m: { vorname: string; nachname: string }): string {
  return `${m.vorname} ${m.nachname}`.trim();
}

/* ------------------------------------------------------------------ */
/* Projekte                                                            */
/* ------------------------------------------------------------------ */

export type ProjektStatus = 'aktiv' | 'pausiert' | 'abgeschlossen';

export const PROJEKT_STATUS_LABEL: Record<ProjektStatus, string> = {
  aktiv: 'Aktiv',
  pausiert: 'Pausiert',
  abgeschlossen: 'Abgeschlossen',
};

/** Feinheit der Zeilen eines Leistungsnachweises. */
export type Raster = 'tag' | 'woche' | 'monat';

export const RASTER_LABEL: Record<Raster, string> = {
  tag: 'Tagesscharf',
  woche: 'Wochenscharf',
  monat: 'Monatsscharf',
};

/** Kurzform für Auswahlfelder und Tabellen. */
export const RASTER_KURZ: Record<Raster, string> = {
  tag: 'Tag',
  woche: 'Woche',
  monat: 'Monat',
};

/**
 * Wie neue Leistungen außerhalb der vorhandenen Nachweise einen Nachweis
 * erhalten. Vorgabe ist „fortlaufend“: Ein Leistungsnachweis ist nicht an
 * einen Monat gebunden – der offene Nachweis wächst mit, bis das Controlling
 * ihn abschließt; danach beginnt ein neuer. Wer es so will, stellt ein Projekt
 * auf „je Kalendermonat“ (ein eigener Nachweis je Monat).
 */
export type Zeitraumregel = 'fortlaufend' | 'monat';

/** In der Reihenfolge der Auswahl – die Vorgabe zuerst. */
export const ZEITRAUMREGEL_LABEL: Record<Zeitraumregel, string> = {
  fortlaufend: 'Fortlaufend bis zum Abschluss',
  monat: 'Je Kalendermonat',
};

/** Logo im Kopf des Leistungsnachweises. */
export interface Logo {
  id: ID;
  name: string;
  /** Bilddaten (data:…) oder ein Pfad unter `public/`, etwa `logos/Druck_Mailaender_Consult.png`. */
  src: string;
}

/**
 * Abschnitt eines Projekts, etwa ein Streckenabschnitt. Hat ein Projekt
 * Abschnitte, weist der Nachweis die Stunden je Abschnitt in eigenen Spalten
 * aus („Aufwand (Std)“ mit „Abschn.1“, „Abschn.2“ …).
 */
export interface Abschnitt {
  id: ID;
  /**
   * Kennung zum Zuordnen beim Import: die Nummer vor dem Doppelpunkt der
   * Spalte „Projektelement“, etwa „01“ für „01: Nordheim, Strecke 9401“.
   */
  kennung: string;
  /** Spaltenkopf im Nachweis, etwa „Abschn.1“. */
  kurz: string;
  /** Vollständige Bezeichnung, etwa „Nordheim, Strecke 9401“. */
  name: string;
}

export interface Projekt {
  id: ID;
  /** Projektnummer, etwa „K9101“ – daran erkennt der Import das Projekt. */
  nummer: string;
  name: string;
  /** Bezeichnung im Kopf des Nachweises, etwa „Hp Musterstadt“; leer = `name`. */
  kurzname: string;
  status: ProjektStatus;
  /** Markierte Projekte erscheinen in der Übersicht und in der Seitenleiste. */
  markiert: boolean;
  beschreibung: string;
  /** Leistungsbereich im Kopf des Nachweises, etwa „Projektsteuerung“. */
  leistungsbereich: string;
  /** Vorgabe für neue Nachweise. */
  raster: Raster;
  zeitraumregel: Zeitraumregel;
  abschnitte: Abschnitt[];
  /** Logos im Druckkopf; null = Standardlogos (`STANDARD_LOGOS`). */
  logos: Logo[] | null;
}

/** Bezeichnung des Projekts im Kopf des Nachweises. */
export function projektKurzname(p: { name: string; kurzname: string }): string {
  return p.kurzname.trim() || p.name;
}

/** „K9101 PS / PLM, Neubau Hp Musterstadt“ */
export function projektTitel(p: { nummer: string; name: string }): string {
  return [p.nummer, p.name].filter(Boolean).join(' ');
}

/** Vorschläge für den Leistungsbereich. */
export const LEISTUNGSBEREICH_VORSCHLAEGE = [
  'Projektsteuerung',
  'Projektmanagement',
  'Planlaufmanagement',
  'Baubetriebsplanung',
  'Bauüberwachung',
];

/* ------------------------------------------------------------------ */
/* Leistungen                                                          */
/* ------------------------------------------------------------------ */

export type Quelle = 'manuell' | 'import';

export const QUELLE_LABEL: Record<Quelle, string> = {
  manuell: 'Händisch',
  import: 'Import',
};

/**
 * Erfasste Leistung: an einem Tag, von einer Person, für ein Projekt. Sie
 * gehört keinem bestimmten Nachweis – welcher sie zeigt, ergibt sich aus
 * dessen Zeitraum, außer sie ist nachgereicht oder steht im festgeschriebenen
 * Stand eines abgeschlossenen Nachweises (`nachweisDerLeistung` in
 * domain/nachweis.ts).
 */
export interface Leistung {
  id: ID;
  projektId: ID;
  mitarbeiterId: ID;
  datum: ISODate;
  /** Leistungstext, etwa „Abstimmung PL“. */
  text: string;
  /** Stunden, auf die Viertelstunde genau oder feiner. */
  stunden: number;
  /** Abschnitt des Projekts; null = ohne Abschnitt. */
  abschnittId: ID | null;
  /** Spalte „Projektelement“ des Imports, unverändert; leer bei händischer Erfassung. */
  projektelement: string;
  quelle: Quelle;
  /** Zeitpunkt der Erfassung bzw. des Imports (ISO). */
  erfasst: string;
  /**
   * Zeitpunkt der letzten Änderung von Datum, Stunden, Text oder Abschnitt
   * durch die Person (ISO): `updateLeistung` im Store bzw. ein Neuimport, der
   * eine abgerechnete Leistung mit anderem Inhalt ersetzt (`importPlanen`);
   * fehlt, solange sie nicht geändert wurde. Daran und am festgeschriebenen
   * Stand (`NachweisStand.inhalte`, `abschnittIds`) erkennt die Seite „Leistungstexte“
   * abgerechnete Leistungen, die nach dem Abschluss geändert wurden
   * (`nachAbschlussGeaendert` in domain/nachweis.ts).
   */
  geaendert?: string;
}

/* ------------------------------------------------------------------ */
/* Leistungsnachweise                                                  */
/* ------------------------------------------------------------------ */

export type NachweisStatus = 'entwurf' | 'abgeschlossen';

export const NACHWEIS_STATUS_LABEL: Record<NachweisStatus, string> = {
  entwurf: 'In Bearbeitung',
  abgeschlossen: 'Abgeschlossen',
};

/**
 * Von Hand bearbeiteter Leistungstext einer Zeile. Die Kennungen der
 * Leistungen, die beim Bearbeiten in der Zeile standen, zeigen später, ob
 * seitdem Leistungen hinzugekommen sind – der Text wird dann nicht
 * überschrieben, sondern die neuen Leistungen werden zum Ergänzen angeboten.
 * Ebenso zeigt `ausgang`, ob sich der Text der Mitarbeiter seitdem geändert hat.
 */
export interface ZeilenText {
  text: string;
  leistungIds: ID[];
  /**
   * Text, den die Zeile ohne die Bearbeitung von Hand hatte (aus den
   * gemeinsamen Texten der Mitarbeiter bzw. automatisch), als das Controlling
   * sie zu bearbeiten begann bzw. zuletzt „Text so lassen“ wählte
   * (`zeilenTextOhneBearbeitung`). Weicht der heutige davon ab, nennt die Zeile
   * ihn. Fehlt in Einträgen, die vor Fassung 7 in der Entwicklung entstanden.
   */
  ausgang?: string;
}

/**
 * Zeile eines Nachweises: ein Tag, eine Woche oder ein Monat mit Leistungen.
 * `stunden` sind die erfassten Stunden, `abgerechnet` die nach dem Aufschlag
 * des Controllings (`abgerechnet = stunden + aufschlag`, nie unter 0) – so
 * stehen sie in Druck und Excel.
 */
export interface NachweisZeile {
  /**
   * Schlüssel des Zeitraums, etwa „T2026-10-30“, „W2026-44“ oder „M2026-10“ (`periodeVon`);
   * Zeilen aus nachgereichten Leistungen mit vorangestelltem „N“, etwa „NW2026-44“.
   */
  schluessel: string;
  von: ISODate;
  bis: ISODate;
  /** Spalte „Datum“, etwa „KW 44\n26.10.26 - 30.10.26“. */
  datumText: string;
  /** Namen der Mitarbeiter mit Leistungen in der Zeile. */
  bearbeiter: string[];
  text: string;
  /** Der Text wurde von Hand bearbeitet. */
  textBearbeitet: boolean;
  /**
   * Der Text stammt (ganz oder teilweise) aus den gemeinsamen Leistungstexten
   * der Mitarbeiter (`Periodentext`) – nur ohne Bearbeitung von Hand; fehlt sonst.
   */
  textGemeinsam?: boolean;
  stunden: number;
  /** Stunden je Abschnitt; Schlüssel ist die Abschnitts-ID, `OHNE_ABSCHNITT` für Leistungen ohne. */
  stundenJeAbschnitt: Record<string, number>;
  /** Stunden je Mitarbeiter-ID – zur Kontrolle, nicht im Druck. */
  stundenJeMitarbeiter: Record<ID, number>;
  leistungIds: ID[];
  /**
   * Zeile aus nachgereichten Leistungen (vor dem Zeitraum, `Leistungsnachweis.nachgereicht`) –
   * eigene Zeile, nie zusammen mit laufenden. Fehlt in Ständen vor Fassung 6.
   */
  nachgereicht?: boolean;
  /** Wirksamer Aufschlag der Zeile (± Stunden) = `abgerechnet - stunden`. */
  aufschlag: number;
  /** Wirksamer Aufschlag je Abschnitt (Schlüssel wie `stundenJeAbschnitt`); nur Einträge ≠ 0. */
  aufschlagJeAbschnitt: Record<string, number>;
  /** Abgerechnete Stunden der Zeile – erfasst plus Aufschlag, nie unter 0. */
  abgerechnet: number;
  /** Abgerechnete Stunden je Abschnitt (Schlüssel wie `stundenJeAbschnitt`, dazu Abschnitte, die nur ein Aufschlag füllt). */
  abgerechnetJeAbschnitt: Record<string, number>;
}

/** Schlüssel in `stundenJeAbschnitt` für Leistungen ohne Abschnitt. */
export const OHNE_ABSCHNITT = '-';

/**
 * Schlüssel eines Aufschlags in `Leistungsnachweis.aufschlaege`: Zeile und
 * Abschnitt, etwa „M2026-10|-“ (ohne Abschnitt) oder „W2026-44|ab-1“.
 */
export function aufschlagSchluessel(zeilenSchluessel: string, abschnittId: ID | null): string {
  return `${zeilenSchluessel}|${abschnittId ?? OHNE_ABSCHNITT}`;
}

/**
 * Festgeschriebener Stand eines abgeschlossenen Nachweises: so, wie er
 * abgegeben wurde. Spätere Änderungen an Leistungen, Abschnitten oder
 * Projekt ändern ihn nicht; erst „Wieder öffnen“ rechnet neu.
 */
export interface NachweisStand {
  zeilen: NachweisZeile[];
  /**
   * Raster des Projekts beim Abschluss – es gliedert die gemeinsamen
   * Leistungstexte der Zeilen (`nachweisZeilen`), auch wenn das Controlling das
   * Raster des Projekts später umstellt. Fehlt in Ständen vor Fassung 7.
   */
  erfassungsRaster?: Raster;
  /**
   * Inhalt jeder abgerechneten Leistung beim Abschluss (Kennung → Prüfsumme
   * aus Datum, Stunden und Text) – daran und an `abschnittIds` misst
   * `nachAbschlussGeaendert`, ob eine Leistung jetzt anders ist als
   * abgerechnet; wer auf den abgerechneten Wert zurückändert, hebt den Hinweis
   * wieder auf. Fehlt in Ständen, die früher abgeschlossen wurden (dort zählt
   * allein `Leistung.geaendert`).
   */
  inhalte?: Record<ID, string>;
  /**
   * Abschnitt jeder abgerechneten Leistung mit Abschnitt (Kennung → Abschnitt).
   * Ordnet das Controlling danach Abschnitte neu zu (Abschnitt entfernt,
   * „Abschnitte aus Projektelementen“), zieht er mit
   * (`standAbschnitteNachziehen` in domain/nachweis.ts) – so zählt nur, was die
   * Person geändert hat.
   */
  abschnittIds?: Record<ID, ID>;
  abschnitte: Abschnitt[];
  projekt: { nummer: string; name: string; kurzname: string; leistungsbereich: string };
  titel: string;
  /** Erfasste Stunden. */
  stunden: number;
  /** Abgerechnete Stunden (mit den Aufschlägen beim Abschluss). */
  abgerechnet: number;
}

export interface Leistungsnachweis {
  id: ID;
  projektId: ID;
  /** Überschrift im Druck; leer = „Leistungsnachweis“ mit dem Zeitraum (`nachweisTitel`). */
  titel: string;
  von: ISODate;
  bis: ISODate;
  /**
   * Das Ende hat das Controlling von Hand festgelegt („Zeitraum ändern“): Der
   * Nachweis läuft dann nicht bis zum Abschluss (`laeuftBisAbschluss`), wird
   * nicht verlängert (`nachweiseErgaenzen`) und beim Abschluss nicht gekürzt
   * (`abschlussZeitraum`). „Neuer Leistungsnachweis“ hebt es wieder auf.
   */
  bisFest: boolean;
  raster: Raster;
  status: NachweisStatus;
  /** Von Hand bearbeitete Leistungstexte je Zeilenschlüssel. */
  texte: Record<string, ZeilenText>;
  /**
   * Aufschläge des Controllings in ± Stunden je Zeile und Abschnitt
   * (`aufschlagSchluessel`), auf zwei Nachkommastellen gerundet; 0 steht nicht
   * darin. Wie bearbeitete Texte bleibt ein Aufschlag stehen, wenn es seine
   * Zeile gerade nicht gibt (etwa nach einem Rasterwechsel), und wirkt dann nicht.
   */
  aufschlaege: Record<string, number>;
  /** Hinweis unter der Tabelle (Freitext). */
  bemerkung: string;
  /**
   * Nachgereichte Leistungen: Kennungen von Leistungen aus früheren, schon
   * abgerechneten Zeiträumen, die in keinem abgerechneten Nachweis stehen und
   * die das Controlling nach Rückfrage hierher übernommen hat. Sie erscheinen
   * hier statt im Nachweis ihres Datums (`leistungenDesNachweises`).
   */
  nachgereicht: ID[];
  /** Zeitpunkte (ISO). */
  erstellt: string;
  geaendert: string;
  abgeschlossen: string | null;
  /** Festgeschriebener Stand, solange der Nachweis abgeschlossen ist. */
  stand: NachweisStand | null;
}

/* ------------------------------------------------------------------ */
/* Gemeinsame Leistungstexte und Monatsbestätigung                     */
/* ------------------------------------------------------------------ */

/**
 * Gemeinsamer Leistungstext eines Projekts für einen Zeitraum – alle mit
 * Leistungen darin sehen und bearbeiten ihn (domain/erfassung.ts). Der
 * Zeitraum ist eine Periode im Raster des Projekts (in einem abgeschlossenen
 * Nachweis im Raster seines Abschlusses), auf den Kalendermonat gekürzt und an
 * den Grenzen der Nachweise geteilt – an jedem Beginn und am Tag nach jedem
 * Ende (`erfassungsPeriode` in domain/zeitraum.ts, `erfassungsGliederung` in
 * domain/nachweis.ts): Eine Woche über ein Monatsende hat je Monat einen
 * eigenen Text, und jeder Text gehört zu höchstens einem Nachweis. Im
 * Leistungsnachweis setzt sich der Text einer Zeile daraus zusammen
 * (`nachweisZeilen`), solange das Controlling ihn nicht von Hand bearbeitet hat.
 */
export interface Periodentext {
  projektId: ID;
  /**
   * Monat und Periode im Raster des Projekts, etwa „2026-10|W2026-44“ (Wochen am Monatsende
   * geteilt); liegt eine Grenze eines Nachweises in der Periode (sein Beginn oder der Tag nach
   * seinem Ende, etwa nach einem Abschluss mitten darin), der Teil ab dann mit seinem Beginn,
   * etwa „2026-11|M2026-11|2026-11-06“ (`erfassungsPeriode`, `erfassungsGliederung`).
   */
  schluessel: string;
  text: string;
  /**
   * Leistungen, deren Stichpunkte beim Bearbeiten berücksichtigt waren (je Person die eigenen) –
   * die übrigen gelten für ihre Person als neue Stichpunkte (`periodentextAnwenden`).
   */
  leistungIds: ID[];
  /**
   * Dieselben Leistungen nach ihrem Inhalt (Person, Tag, Text – `stichpunktInhalt`): So gilt
   * auch eine unverändert neu importierte Leistung (neue Kennung) als berücksichtigt.
   * Fehlt in Einträgen, die vor Fassung 7 in der Entwicklung entstanden.
   */
  inhalte?: string[];
  /** Name unter „Angemeldet als“ beim letzten Bearbeiten. */
  bearbeiter: string;
  /** Zeitpunkt des letzten Bearbeitens (ISO). */
  geaendert: string;
}

/**
 * Bestätigung eines Mitarbeiters, dass seine Stunden und die Leistungstexte
 * eines Monats in einem Projekt vollständig erfasst sind. Sie gilt, solange
 * sich kein Zeitraum des Monats ändert, der noch nicht abgerechnet ist
 * (`perioden`, `bestaetigungGilt` in domain/erfassung.ts) – sonst ist sie
 * erloschen.
 */
export interface Bestaetigung {
  projektId: ID;
  mitarbeiterId: ID;
  /** JJJJ-MM */
  monat: string;
  /** Zeitpunkt (ISO). */
  am: string;
  /**
   * Kennungen der bestätigten Zeiträume (Schlüssel → `periodenKennung`), auch
   * der damals schon abgerechneten – verglichen werden nur die, die jetzt
   * nicht gesperrt sind. Gehen bestätigte Teile mit geänderten Grenzen der
   * Nachweise in einem Zeitraum auf, trägt `bestaetigungenNachziehen` ihn ein –
   * nur, wenn sein Text nichts enthält, was die Person nicht bestätigt hat.
   * Leer in Einträgen, die vor dieser Fassung in der Entwicklung entstanden
   * (sie gelten als geändert).
   */
  perioden: Record<string, string>;
}

/* ------------------------------------------------------------------ */
/* Gesamtbestand                                                       */
/* ------------------------------------------------------------------ */

export interface LeistungsnachweisDaten {
  version: number;
  einstellungen: Einstellungen;
  mitarbeiter: Mitarbeiter[];
  projekte: Projekt[];
  leistungen: Leistung[];
  nachweise: Leistungsnachweis[];
  /** Gemeinsame Leistungstexte je Projekt und Zeitraum (Fassung 7). */
  periodentexte: Periodentext[];
  /** Monatsbestätigungen der Mitarbeiter je Projekt (Fassung 7). */
  bestaetigungen: Bestaetigung[];
}

/* ------------------------------------------------------------------ */
/* Hilfen                                                              */
/* ------------------------------------------------------------------ */

export function newId(prefix = 'id'): ID {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Prüfsumme eines Texts: zweimal FNV-1a (32 Bit, verschiedene Startwerte),
 * 16 Hexadezimalziffern. Gleicher Text → gleiche Prüfsumme – für Kennungen,
 * die sich aus dem Inhalt ergeben (`periodenKennung`, `mitarbeiterKennung`).
 */
export function pruefsumme(text: string): string {
  const fnv = (start: number) => {
    let h = start >>> 0;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(16).padStart(8, '0');
  };
  return `${fnv(0x811c9dc5)}${fnv(0x2f4b6a1d)}`;
}

/**
 * Kürzel aus einem Namen: Anfangsbuchstaben von Vor- und Nachname, sonst die
 * ersten zwei Buchstaben – höchstens vier Zeichen.
 */
export function kuerzelAus(name: string): string {
  const woerter = name.trim().split(/[\s,-]+/).filter(Boolean);
  if (woerter.length === 0) return '';
  const roh = woerter.length > 1 ? woerter.map((w) => w[0]).join('') : woerter[0].slice(0, 2);
  return roh.slice(0, 4).toUpperCase();
}
