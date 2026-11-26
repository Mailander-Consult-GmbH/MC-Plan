/**
 * Funktionskatalog – die mitgelieferten Funktionen der Projektbeteiligten für
 * Planlaufmanagement und Projektsteuerung. Erste Ebene der Gliederung ist die
 * **Art der Funktion** (Auftraggeber, Prüfer, Auftragnehmer …), das Gewerk ist
 * ein Merkmal darunter. Beide Bereiche und das Projektregister lesen den
 * Katalog von hier – so führen sie dieselben Bezeichnungen.
 *
 * Quelle ist die Liste „Projektbeteiligte“ der Anwender (Excel, je Art ein
 * Blatt mit Funktion, Kürzel, Gewerk; Arbeitsstand vom 26.11.2026 – sie wird
 * noch ergänzt). Beim Einarbeiten gelten diese Regeln:
 *
 * * Die Liste führt das Gewerk meist im Namen („Planprüfer KIB“, „Auftragnehmer
 *   Übergreifend“). Hier steht die Bezeichnung **ohne** Gewerk und das Gewerk
 *   daneben – ein Workflow nennt nur die Bezeichnung, und das Gewerk des Plans
 *   wählt die Funktion (`rolleFuerSchritt` im Planlaufmanagement). Angezeigt
 *   wird Bezeichnung + Gewerk.
 * * „Übergreifend“ und eine leere Gewerk-Angabe sind `null` (einmal je Projekt).
 * * Blatt BÜW nennt als Gewerk durchgehend „BÜW“; das Gewerk kommt dort aus dem
 *   Namen („Bauüberwacher LST“, „… Oberbau“ = OB, „Bauüberwachung KIB“), der
 *   Rest ist übergreifend.
 * * „Fachspezialist ITK“ (Gewerk TK) ist der Fachspezialist des Gewerks TK,
 *   „… STE (OLA)“ die Funktion „… STE“ im Gewerk OLA, „Erdung (OLA)“ das Gewerk
 *   OLA. Den Abnahmeprüfern fehlt in der Liste das Kürzel – hier ergänzt.
 * * „Fachplaner“ steht nicht in der Liste, bleibt aber, bis die Workflows
 *   überarbeitet sind (sie nennen ihn) – je Gewerk, in der Art Ausführungsplanung.
 *
 * Bezeichnung + Gewerk ist über alle Arten eindeutig und bleibt der Schlüssel
 * einer Funktion (`funktionsSchluessel` in register.ts); die Art ist ein
 * Merkmal, kein Teil des Schlüssels. Jede Bezeichnung steht in genau einer Art.
 *
 * Ein neuer Stand der Liste: Einträge unten nachtragen (Regeln wie oben), bei
 * Umbenennungen `FUNKTIONS_UMBENENNUNGEN` ergänzen und die Fassungen erhöhen,
 * mit denen die Bestände umstellen – `STAMMDATEN_VERSION` und `DATEN_VERSION`
 * des Planlaufmanagements, `DATEN_VERSION` der Projektsteuerung,
 * `REGISTER_VERSION`. Alle drei Speicher müssen mit derselben Tabelle
 * umstellen, sonst holt das Register die alten Bezeichnungen zurück.
 */

/** Art einer Funktion – die erste Ebene der Gliederung. */
export interface FunktionsArt {
  id: string;
  /** Kurzzeichen, steht auf dem Reiter (in der Liste der Name des Blatts). */
  kuerzel: string;
  name: string;
  /** Vorgabefarbe der Funktionen dieser Art. */
  farbe: string;
}

/** Art der Funktionen, die in keiner Art des Katalogs stehen (selbst angelegte, ältere). */
export const ART_SONSTIGE = 'sonstige';

/** Die Arten in der Reihenfolge der Liste, zuletzt „Sonstige“. */
export const FUNKTIONS_ARTEN: FunktionsArt[] = [
  { id: 'ag', kuerzel: 'AG', name: 'Auftraggeber', farbe: '#5856d6' },
  { id: 'ps-plm', kuerzel: 'PS-PLM', name: 'Projektsteuerung und Planlaufmanagement', farbe: '#24456e' },
  { id: 'betrieb', kuerzel: 'Betrieb', name: 'Betrieb', farbe: '#0a84c8' },
  { id: 'alv', kuerzel: 'ALV', name: 'Anlagenverantwortliche', farbe: '#8a5a44' },
  { id: 'ibv', kuerzel: 'IBV', name: 'Inbetriebnahmeverantwortliche', farbe: '#b56576' },
  { id: 'ap', kuerzel: 'AP', name: 'Ausführungsplanung', farbe: '#ff9500' },
  { id: 'ep', kuerzel: 'EP', name: 'Entwurfsplanung', farbe: '#c77700' },
  { id: 'psv', kuerzel: 'PSV', name: 'Prüfer', farbe: '#34c759' },
  { id: 'bvb', kuerzel: 'BVB', name: 'Bauvorlageberechtigte', farbe: '#ff3b30' },
  { id: 'an', kuerzel: 'AN', name: 'Auftragnehmer', farbe: '#af52de' },
  { id: 'buew', kuerzel: 'BÜW', name: 'Bauüberwachung', farbe: '#00a0a0' },
  { id: 'abnahme', kuerzel: 'Abnahme', name: 'Abnahme', farbe: '#457b9d' },
  { id: ART_SONSTIGE, kuerzel: 'Sonstige', name: 'Sonstige', farbe: '#8e8e93' },
];

/** Gewerke der Liste, alphabetisch – so führen die Bereiche ihre Gewerklisten. */
export const KATALOG_GEWERKE = ['EEA', 'KIB', 'LST', 'OB', 'OLA', 'PT1', 'PT2', 'TK', 'VA'] as const;

/** Mitgelieferte Funktion: Bezeichnung ohne Gewerk, Gewerk (`null` = übergreifend), Kürzel, Art. */
export interface KatalogFunktion {
  art: string;
  name: string;
  gewerk: string | null;
  kuerzel: string;
}

/** Eine Bezeichnung in ihren Gewerken, je mit Kürzel. */
const je = (art: string, name: string, gewerke: [gewerk: string | null, kuerzel: string][]): KatalogFunktion[] =>
  gewerke.map(([gewerk, kuerzel]) => ({ art, name, gewerk, kuerzel }));

export const FUNKTIONS_KATALOG: KatalogFunktion[] = [
  // AG – Auftraggeber
  ...je('ag', 'Projektleitung', [[null, 'PL']]),
  ...je('ag', 'Kaufmännische Projektleitung', [[null, 'K-PL']]),
  ...je('ag', 'Bahnhofsmanagement', [['VA', 'BM']]),
  ...je('ag', 'Projektingenieur', [[null, 'PING'], ['KIB', 'PING'], ['OLA', 'PING'], ['LST', 'PING'], ['PT1', 'PING'], ['PT2', 'PING'], ['TK', 'PING'], ['VA', 'PING'], ['OB', 'PING']]),
  // PS-PLM – Projektsteuerung und Planlaufmanagement
  ...je('ps-plm', 'Planlaufmanagement', [[null, 'PLM']]),
  ...je('ps-plm', 'Projektsteuerung', [[null, 'PS']]),
  // Betrieb
  ...je('betrieb', 'Baubetriebsplanung', [[null, 'BBP']]),
  ...je('betrieb', 'Baubetriebskoordinator', [[null, 'BBK']]),
  ...je('betrieb', 'Betra-Sachbearbeiter', [[null, 'BSB']]),
  // ALV – Anlagenverantwortliche
  ...je('alv', 'Anlagenverantwortlicher', [['KIB', 'ALV KIB'], ['OLA', 'ALV OLA'], ['EEA', 'ALV EEA'], ['LST', 'ALV LST'], ['TK', 'ALV TK'], ['VA', 'ALV VA'], ['OB', 'ALV OB']]),
  // IBV – Inbetriebnahmeverantwortliche
  ...je('ibv', 'Inbetriebnahmeverantwortlicher IOH', [[null, 'IBV IOH']]),
  ...je('ibv', 'Inbetriebnahmeverantwortlicher STE', [[null, 'IBV STE'], ['OLA', 'IBV OLA'], ['EEA', 'IBV EEA']]),
  // AP – Ausführungsplanung
  ...je('ap', 'Ausführungsplanung', [['KIB', 'AP KIB'], ['OLA', 'AP OLA'], ['LST', 'AP LST'], ['PT1', 'AP PT1'], ['PT2', 'AP PT2'], ['TK', 'AP TK'], ['VA', 'AP VA'], ['OB', 'AP OB']]),
  ...je('ap', 'BIM Beratung', [[null, 'BIM']]),
  ...je('ap', 'BIM Koordinator', [[null, 'BIM']]),
  ...je('ap', 'BIM Manager', [[null, 'BIM']]),
  // nicht in der Liste: bleibt, bis die Workflows überarbeitet sind
  ...je('ap', 'Fachplaner', KATALOG_GEWERKE.map((g) => [g, 'FP'])),
  // EP – Entwurfsplanung
  ...je('ep', 'Entwurfsplanung', [['KIB', 'EP KIB'], ['OLA', 'EP OLA'], ['LST', 'EP LST'], ['PT1', 'EP PT1'], ['PT2', 'EP PT2'], ['TK', 'EP TK'], ['VA', 'EP VA'], ['OB', 'EP OB']]),
  // PSV – Prüfer
  ...je('psv', 'Planprüfer', [['KIB', 'PSV KIB'], ['OLA', 'PSV OLA'], ['LST', 'PSV LST'], ['PT1', 'PSV PT1'], ['PT2', 'PSV PT2'], ['TK', 'PSV TK'], ['VA', 'PSV VA'], ['OB', 'PSV OB']]),
  ...je('psv', 'Planprüfer Erdung', [['OLA', 'PSV OLA']]),
  ...je('psv', 'Prüfstatiker', [['KIB', 'PSt KIB'], ['OLA', 'PSt OLA']]),
  ...je('psv', 'Vermessungsprüfer', [[null, 'VeP']]),
  ...je('psv', 'Erdungsprüfer', [[null, 'ErP']]),
  ...je('psv', 'Schweißtechnischer Prüfer', [[null, 'StP']]),
  ...je('psv', 'Korrosionsschutzprüfer', [[null, 'KsP']]),
  ...je('psv', 'Gleisgeometrie Prüfer', [[null, 'GgP']]),
  ...je('psv', 'Geotechnischer Prüfer', [[null, 'GtP']]),
  ...je('psv', 'Fachspezialist', [['EEA', 'FS EEA'], ['TK', 'FS ITK']]),
  // BVB – Bauvorlageberechtigte
  ...je('bvb', 'Bauvorlageberechtigter', [['KIB', 'BVB KIB'], ['OLA', 'BVB OLA'], ['LST', 'BVB LST'], ['PT1', 'BVB PT1'], ['PT2', 'BVB PT2'], ['TK', 'BVB TK'], ['VA', 'BVB VA'], ['OB', 'BVB OB'], ['EEA', 'BVB EEA']]),
  // AN – Auftragnehmer
  ...je('an', 'Auftragnehmer', [[null, 'AN'], ['KIB', 'AN'], ['OLA', 'AN'], ['LST', 'AN'], ['PT1', 'AN'], ['PT2', 'AN'], ['TK', 'AN'], ['VA', 'AN'], ['OB', 'AN'], ['EEA', 'AN']]),
  ...je('an', 'Projektleiter', [[null, 'AN'], ['KIB', 'AN'], ['OLA', 'AN'], ['LST', 'AN'], ['PT1', 'AN'], ['PT2', 'AN'], ['TK', 'AN'], ['VA', 'AN'], ['OB', 'AN'], ['EEA', 'AN']]),
  ...je('an', 'Bauleiter', [[null, 'AN'], ['KIB', 'AN'], ['OLA', 'AN'], ['LST', 'AN'], ['PT1', 'AN'], ['PT2', 'AN'], ['TK', 'AN'], ['VA', 'AN'], ['OB', 'AN'], ['EEA', 'AN']]),
  ...je('an', 'Polier', [[null, 'AN'], ['KIB', 'AN'], ['OLA', 'AN'], ['LST', 'AN'], ['PT1', 'AN'], ['PT2', 'AN'], ['TK', 'AN'], ['VA', 'AN'], ['OB', 'AN'], ['EEA', 'AN']]),
  // BÜW – Bauüberwachung
  ...je('buew', 'Leitende Bauüberwachung', [[null, 'BÜW']]),
  ...je('buew', 'Bauüberwacher Bahn', [[null, 'BÜB']]),
  ...je('buew', 'Bauüberwacher', [['LST', 'BÜW-LST'], ['OLA', 'BÜW-OLA'], ['EEA', 'BÜW-EEA'], ['OB', 'BÜW-OB'], ['KIB', 'BÜW-KIB']]),
  ...je('buew', 'Bauüberwacher STE', [[null, 'BÜW-STE']]),
  ...je('buew', 'Umweltfachliche Bauüberwachung', [[null, 'UBÜW']]),
  ...je('buew', 'Umweltfachliche Bauüberwachung Naturschutz', [[null, 'UBÜW']]),
  ...je('buew', 'Umweltfachliche Bauüberwachung Abfall', [[null, 'UBÜW']]),
  ...je('buew', 'Umweltfachliche Bauüberwachung Bodenschutz', [[null, 'UBÜW']]),
  ...je('buew', 'Umweltfachliche Bauüberwachung Immissionsschutz', [[null, 'UBÜW']]),
  // Abnahme
  ...je('abnahme', 'Abnahmeprüfer', [['OLA', 'AbP OLA'], ['EEA', 'AbP EEA']]),
  ...je('abnahme', 'Abnahmeprüfer Erdung', [['OLA', 'AbP Erd']]),
];

const norm = (s: string | null | undefined) => (s ?? '').trim().toLowerCase();
const schluessel = (name: string, gewerk: string | null) => `${norm(name)}|${norm(gewerk)}`;

const NACH_SCHLUESSEL = new Map(FUNKTIONS_KATALOG.map((f) => [schluessel(f.name, f.gewerk), f]));
const ART_NACH_NAME = new Map(FUNKTIONS_KATALOG.map((f) => [norm(f.name), f.art]));
const ART_NACH_ID = new Map(FUNKTIONS_ARTEN.map((a) => [a.id, a]));

/**
 * Arten für Bezeichnungen, die der Katalog nicht führt, die es in älteren
 * Beständen aber gibt (früher mitgelieferte Funktionen der Projektsteuerung,
 * die übergreifende „Bauüberwachung“).
 */
const WEITERE_ARTEN: Record<string, string> = {
  bauüberwachung: 'buew',
  auftraggeber: 'ag',
  teilprojektleitung: 'ag',
  objektplanung: 'ap',
  fachplanung: 'ap',
  prüfsachverständiger: 'psv',
};

/** Der Katalogeintrag mit dieser Bezeichnung in diesem Gewerk. */
export function katalogEintrag(name: string, gewerk: string | null): KatalogFunktion | undefined {
  return NACH_SCHLUESSEL.get(schluessel(name, gewerk));
}

/** Ist das die Kennung einer Art? */
export function artGueltig(art: unknown): art is string {
  return typeof art === 'string' && ART_NACH_ID.has(art);
}

/**
 * Art einer Funktion laut Katalog: über Bezeichnung + Gewerk, sonst über die
 * Bezeichnung allein (dieselbe Funktion in einem Gewerk, das die Liste nicht
 * nennt), sonst „Sonstige“.
 */
export function artVon(name: string, gewerk: string | null): string {
  return katalogEintrag(name, gewerk)?.art ?? ART_NACH_NAME.get(norm(name)) ?? WEITERE_ARTEN[norm(name)] ?? ART_SONSTIGE;
}

/** Eine gültige gespeicherte Art bleibt, sonst gilt die des Katalogs – für das Aufbereiten der Bestände. */
export function artAus(wert: unknown, name: string, gewerk: string | null): string {
  return artGueltig(wert) ? wert : artVon(name, gewerk);
}

/** Die Art zur Kennung; eine unbekannte Kennung gilt als „Sonstige“. */
export function artInfo(art: string): FunktionsArt {
  return ART_NACH_ID.get(art) ?? ART_NACH_ID.get(ART_SONSTIGE)!;
}

/** Rang der Art in der Reihenfolge der Liste. */
export function artRang(art: string): number {
  return FUNKTIONS_ARTEN.indexOf(artInfo(art));
}

/** „AG – Auftraggeber“ bzw. nur der Name, wenn das Kurzzeichen dasselbe sagt. */
export function artText(art: string): string {
  const a = artInfo(art);
  return a.kuerzel === a.name ? a.name : `${a.kuerzel} – ${a.name}`;
}

/** Rang eines Gewerks: übergreifend zuerst, dann die Reihenfolge der Gewerkliste, Unbekanntes am Ende. */
export function gewerkRang(gewerk: string | null, gewerke: readonly string[]): number {
  if (gewerk === null) return -1;
  const i = gewerke.indexOf(gewerk);
  return i === -1 ? gewerke.length : i;
}

/** Vergleich für Funktionslisten: Art, Bezeichnung, Gewerk (übergreifend zuerst). */
export function funktionenVergleich(gewerke: readonly string[] = KATALOG_GEWERKE) {
  return (
    a: { art: string; name: string; gewerk: string | null },
    b: { art: string; name: string; gewerk: string | null },
  ): number =>
    artRang(a.art) - artRang(b.art) ||
    a.name.localeCompare(b.name, 'de') ||
    gewerkRang(a.gewerk, gewerke) - gewerkRang(b.gewerk, gewerke) ||
    (a.gewerk ?? '').localeCompare(b.gewerk ?? '', 'de');
}

/** Gliedert nach Art – nur Arten mit Einträgen, in der Reihenfolge der Liste; die Einträge behalten ihre Reihenfolge. */
export function nachArt<T extends { art: string }>(liste: readonly T[]): { art: FunktionsArt; eintraege: T[] }[] {
  return FUNKTIONS_ARTEN.map((art) => ({ art, eintraege: liste.filter((x) => artInfo(x.art) === art) })).filter(
    (g) => g.eintraege.length > 0,
  );
}

/** Funktionen des Katalogs, die es in `vorhanden` (Bezeichnung + Gewerk) noch nicht gibt. */
export function fehlendeKatalogFunktionen(
  vorhanden: readonly { name: string; gewerk: string | null }[],
): KatalogFunktion[] {
  const da = new Set(vorhanden.map((f) => schluessel(f.name, f.gewerk)));
  return FUNKTIONS_KATALOG.filter((f) => !da.has(schluessel(f.name, f.gewerk)));
}

/**
 * Kürzel ohne angehängtes Gewerk („PSV KIB“ → „PSV“, „BÜW-LST“ → „BÜW“) – für
 * Stellen, die eine Funktion nur bei ihrer Bezeichnung nennen.
 */
export function kuerzelOhneGewerk(kuerzel: string, gewerk: string | null): string {
  const k = kuerzel.trim();
  if (!gewerk) return k;
  for (const trenner of [' ', '-']) {
    const ende = `${trenner}${gewerk}`;
    if (k.length > ende.length && k.toLowerCase().endsWith(ende.toLowerCase())) return k.slice(0, -ende.length).trim();
  }
  return k;
}

/**
 * Kürzel einer Bezeichnung über alle Gewerke: das der übergreifenden Funktion,
 * sonst das kürzeste ohne Gewerkzusatz. Leer, wenn es die Bezeichnung nicht gibt.
 */
export function kuerzelDerBezeichnung(
  funktionen: readonly { name: string; gewerk: string | null; kuerzel: string }[],
  name: string,
): string {
  const gleiche = funktionen.filter((f) => norm(f.name) === norm(name));
  const uebergreifend = gleiche.find((f) => f.gewerk === null && f.kuerzel.trim());
  if (uebergreifend) return uebergreifend.kuerzel.trim();
  return gleiche
    .map((f) => kuerzelOhneGewerk(f.kuerzel, f.gewerk))
    .filter(Boolean)
    .sort((a, b) => a.length - b.length)[0] ?? '';
}

/* ------------------------------------------------------------------ */
/* Umbenennungen                                                       */
/* ------------------------------------------------------------------ */

/** Gewerk, wie es in einem Kürzel stehen kann: ohne Leerzeichen, groß („50 Hz“ → „50HZ“). */
const gewerkKurz = (gewerk: string) => gewerk.replace(/\s+/g, '').toUpperCase();

/**
 * Kürzel für die Übernahme einer Funktion in ein anderes Gewerk („Vorhandene
 * Funktion“ in den Funktionslisten beider Bereiche): Kennt der Katalog die
 * Funktion dort, gilt seines. Sonst wird das Gewerk im Kürzel getauscht
 * („PSV KIB“ wird „PSV LST“, „BÜW-LST“ wird „BÜW-OLA“, „BÜ-50HZ“ im Gewerk
 * „50 Hz“ wird „BÜ-LST“; ist das Kürzel das Gewerk selbst, das neue Gewerk).
 * Nennt das Kürzel kein Gewerk, bleibt es – wie im Katalog, der „AN“ oder
 * „PING“ in jedem Gewerk gleich führt. Leer, wenn die Funktion kein Kürzel hat.
 *
 * `gleichnamige`: dieselbe Bezeichnung in anderen Gewerken. Trägt das Kürzel
 * von `f` sein Gewerk nicht erkennbar (der Katalog führt etwa „FS ITK“ im
 * Gewerk TK neben „FS EEA“), gibt eine von ihnen die Form vor, deren Kürzel es
 * tut – sonst hieße der Fachspezialist in KIB „FS ITK“.
 */
export function kuerzelFuerGewerk(
  f: { name: string; gewerk: string | null; kuerzel: string },
  gewerk: string,
  gleichnamige: readonly { gewerk: string | null; kuerzel: string }[] = [],
): string {
  const katalog = katalogEintrag(f.name, gewerk);
  if (katalog) return katalog.kuerzel;
  for (const x of [f, ...gleichnamige]) {
    const kuerzel = x.kuerzel.trim();
    if (!kuerzel || !x.gewerk) continue;
    // Das Gewerk steht im Kürzel, wie es heißt, oder in seiner Kurzform – das neue folgt derselben Form
    const formen: [alt: string, neu: string][] = [
      [x.gewerk, gewerk],
      [gewerkKurz(x.gewerk), gewerkKurz(gewerk)],
    ];
    for (const [alt, neuesGewerk] of formen) {
      if (norm(kuerzel) === norm(alt)) return neuesGewerk;
      const ohne = kuerzelOhneGewerk(kuerzel, alt);
      if (ohne === kuerzel) continue;
      // Der Trenner des Originals bleibt: Leerzeichen oder Bindestrich
      const trenner = kuerzel.slice(ohne.length).trimStart().startsWith('-') ? '-' : ' ';
      return `${ohne}${trenner}${neuesGewerk}`;
    }
  }
  return f.kuerzel.trim();
}

/**
 * Art der Funktion aus dem Text einer Zelle (Spalte „Art“ der Excel-Importe):
 * ihr Kurzzeichen („PSV“), ihr Name („Prüfer“), beides, wie die Auswahl es
 * zeigt („PSV – Prüfer“), oder ihre Kennung – ohne Groß-/Kleinschreibung und
 * Leerzeichen. `null`, wenn der Text leer ist oder keine Art nennt.
 */
export function artAusText(wert: string): string | null {
  const ohneLeer = (s: string) => s.toLowerCase().replace(/\s+/g, '');
  const gesucht = ohneLeer(wert);
  if (!gesucht) return null;
  return FUNKTIONS_ARTEN.find((a) => [a.kuerzel, a.name, artText(a.id), a.id].some((x) => ohneLeer(x) === gesucht))?.id ?? null;
}

/**
 * Frühere Bezeichnung einer Funktion und ihre heutige. `nurMitGewerk`: gilt
 * nur für die Funktion in einem Gewerk – die übergreifende behält ihren Namen.
 */
export interface Umbenennung {
  alt: string;
  neu: string;
  nurMitGewerk?: boolean;
}

/**
 * Bezeichnungen, die mit der Liste vom 26.11.2026 andere Namen bekommen haben.
 * Planlaufmanagement, Projektsteuerung und Projektregister stellen ihre
 * Bestände damit um – einmalig, an ihre Fassung gebunden.
 */
export const FUNKTIONS_UMBENENNUNGEN: Umbenennung[] = [
  { alt: 'Fachtechnischer Prüfer', neu: 'Planprüfer' },
  { alt: 'Bauvorlageberechtiger', neu: 'Bauvorlageberechtigter' },
  { alt: 'Bau AN', neu: 'Auftragnehmer' },
  { alt: 'Bauunternehmen', neu: 'Auftragnehmer' },
  { alt: 'Bauüberwachung', neu: 'Bauüberwacher', nurMitGewerk: true },
  { alt: 'Fachplanung', neu: 'Fachplaner', nurMitGewerk: true },
];

/** Heutige Bezeichnung einer Funktion (Bezeichnung + Gewerk); unverändert, wenn sie nicht umbenannt wurde. */
export function umbenannt(name: string, gewerk: string | null): string {
  const u = FUNKTIONS_UMBENENNUNGEN.find((x) => norm(x.alt) === norm(name) && (!x.nurMitGewerk || gewerk !== null));
  return u ? u.neu : name;
}

/**
 * Heutige Bezeichnung für einen Verweis, der die Funktion nur beim Namen nennt
 * (Workflow-Schritt, E-Mail-Regel, Ansprechpartner im Pflichtenheft). Bei einer
 * Umbenennung `nurMitGewerk` sagt `gabEsMitGewerk`, ob es die frühere
 * Bezeichnung dort, wo der Verweis gilt, in einem Gewerk gab – nur dann folgt er.
 */
export function umbenannterVerweis(name: string, gabEsMitGewerk: (alt: string) => boolean): string {
  const u = FUNKTIONS_UMBENENNUNGEN.find((x) => norm(x.alt) === norm(name));
  if (!u) return name;
  return !u.nurMitGewerk || gabEsMitGewerk(u.alt) ? u.neu : name;
}
