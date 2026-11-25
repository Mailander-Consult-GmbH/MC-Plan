/**
 * Plancodierung des Pflichtenhefts (Anlage „Plancodierungsschema“): Kategorien
 * mit ihren Katalogen, die mitgelieferte Vorlage, die Prüfung einer
 * Plancodierung gegen das Schema und die Druckfassung. Reine Funktionen, ohne
 * React.
 *
 * Kataloge: Die Einträge einer Kategorie stehen als Zeilen
 * „Code<Tab>Bezeichnung“ – so kommen sie beim Einfügen aus Excel an –, ebenso
 * „Code – Bezeichnung“, „Code - Bezeichnung“ oder Code und Bezeichnung mit
 * mindestens zwei Leerzeichen dazwischen. „# Überschrift“ gliedert den
 * Katalog. Eine Zeile ohne Trennung ist ein Code ohne Bezeichnung, wenn sie nur
 * aus Zeichen eines Codes besteht, sonst eine Erläuterung ohne Code (etwa
 * „weitere Firmen nach Abstimmung mit PLM“); ebenso eine Zeile, die mit einem
 * Tabulator beginnt.
 *
 * Prüfung (`plancodePruefen`): Zulässig sind nur Buchstaben ohne Umlaute,
 * Ziffern, „-“ und „_“; die Endung „.pdf“ zählt nicht mit. „_“ trennt die
 * Kategorien – ihre Zahl muss stimmen; fehlt nur die letzte und ist sie der
 * Index, gilt der Code ebenfalls (die Planliste führt den Index in einem
 * eigenen Feld). Jede Stelle wird nach der Art ihrer Kategorie geprüft
 * (`kategorieArt`, erkannt am Namen): die laufende Nummer auf ihre Ziffern, der
 * Index auf „-“ bzw. Kleinbuchstaben und Ziffern, jede andere gegen ihren
 * Katalog – nur wenn er Codes enthält. Gliederung mit „-“: Steht der ganze Wert
 * nicht im Katalog, genügt der Teil vor dem ersten „-“ (etwa „BSTG-1“ für
 * Bahnsteig 1); was dahinter steht, ist frei. Ein Code mit „n“ als Platzhalter
 * („RHnn“ – „Rahmenblock Nr. nn“, an „Nr.“ in der Bezeichnung erkannt) gilt für
 * jede Ziffernfolge an dieser Stelle.
 */
import { html } from '../../../shared/print';
import type { CodierungsKategorie, Plancodierung } from './types';

/* ------------------------------------------------------------------ */
/* Kataloge lesen                                                      */
/* ------------------------------------------------------------------ */

/** Eine Zeile des Katalogs: Eintrag (Code leer = Erläuterung) oder Überschrift. */
export type CodierungsZeile =
  | { art: 'eintrag'; code: string; bezeichnung: string }
  | { art: 'gruppe'; titel: string };

/** Zeichen, aus denen ein Code bestehen darf. */
const CODE_ZEICHEN = /^[A-Za-z0-9_-]+$/;

/** Trennung von Code und Bezeichnung ohne Tabulator: „ – “, „ - “ oder zwei Leerzeichen. */
const TRENNUNG = /^(.*?)(?:\s+[–—-]\s+|\s{2,})(.*)$/;

/** Zerlegt die Einträge einer Kategorie in Codes und Überschriften. */
export function eintraegeLesen(text: string): CodierungsZeile[] {
  const zeilen: CodierungsZeile[] = [];
  for (const roh of text.split(/\r\n|\r|\n/)) {
    // Leere Zellen am Ende einer aus Excel eingefügten Zeile fallen weg.
    const zeile = roh.replace(/\s+$/, '');
    if (!zeile.trim()) continue;
    const ueberschrift = /^\s*#\s*(.*)$/.exec(zeile);
    if (ueberschrift) {
      const titel = ueberschrift[1].trim();
      if (titel) zeilen.push({ art: 'gruppe', titel });
      continue;
    }
    let code: string;
    let bezeichnung: string;
    const tab = zeile.indexOf('\t');
    if (tab >= 0) {
      code = zeile.slice(0, tab).trim();
      bezeichnung = zeile
        .slice(tab + 1)
        .split('\t')
        .map((s) => s.trim())
        .filter(Boolean)
        .join(' ');
    } else {
      const t = zeile.trim();
      const m = TRENNUNG.exec(t);
      if (m && m[1].trim()) {
        code = m[1].trim();
        bezeichnung = m[2].trim();
      } else if (CODE_ZEICHEN.test(t)) {
        code = t;
        bezeichnung = '';
      } else {
        code = '';
        bezeichnung = t;
      }
    }
    if (code || bezeichnung) zeilen.push({ art: 'eintrag', code, bezeichnung });
  }
  return zeilen;
}

/* ------------------------------------------------------------------ */
/* Art einer Kategorie                                                 */
/* ------------------------------------------------------------------ */

/**
 * Wie eine Stelle des Codes geprüft wird – erkannt am Namen der Kategorie:
 * „Index“ bzw. „Revision“ ist der Index, „Nummer“, „Nr.“ oder „lfd.“ (als
 * eigenes Wort, also nicht „Bahnhofsnummer“) die laufende Nummer, alles andere
 * ein Katalog.
 */
export type KategorieArt = 'katalog' | 'nummer' | 'index';

export function kategorieArt(k: CodierungsKategorie): KategorieArt {
  const name = k.name.trim().toLowerCase();
  if (/\bindex\b|\brevision\b/.test(name)) return 'index';
  if (/\bnummer\b|\bnr\b|\blfd\b/.test(name)) return 'nummer';
  return 'katalog';
}

/** Stellen der laufenden Nummer: aus dem Beispiel („0001“ → 4), sonst 4. */
function nummernStellen(k: CodierungsKategorie): number {
  const b = k.beispiel.trim();
  return /^\d+$/.test(b) ? b.length : 4;
}

/** Codes eines Katalogs, für die Prüfung aufbereitet. */
interface Katalog {
  codes: Set<string>;
  /** Kleingeschriebener Code → Schreibweise im Katalog (für den Hinweis). */
  klein: Map<string, string>;
  /** Codes mit Platzhalter für eine Nummer („RHnn“). */
  muster: RegExp[];
  gruppen: number;
}

/** Aufbereitete Kataloge je Kategorie – eine geänderte Kategorie ist ein neues Objekt (der Bestand wird nicht verändert, nur ersetzt). */
const katalogSpeicher = new WeakMap<CodierungsKategorie, Katalog>();

function katalogVon(k: CodierungsKategorie): Katalog {
  const vorhanden = katalogSpeicher.get(k);
  if (vorhanden) return vorhanden;
  const katalog: Katalog = { codes: new Set(), klein: new Map(), muster: [], gruppen: 0 };
  for (const z of eintraegeLesen(k.eintraege)) {
    if (z.art === 'gruppe') {
      katalog.gruppen++;
      continue;
    }
    if (!z.code) continue;
    katalog.codes.add(z.code);
    if (!katalog.klein.has(z.code.toLowerCase())) katalog.klein.set(z.code.toLowerCase(), z.code);
    // „RHnn – Rahmenblock Nr. nn“: Die „n“ am Ende stehen für eine Nummer.
    const platzhalter = /^([A-Za-z0-9_-]+?)n+$/.exec(z.code);
    if (platzhalter && /\bNr\.?\s*n+\b/i.test(z.bezeichnung)) {
      katalog.muster.push(new RegExp(`^${platzhalter[1]}\\d+$`));
    }
  }
  katalogSpeicher.set(k, katalog);
  return katalog;
}

/** Kurzbeschreibung des Katalogs und seiner Prüfung – für den Editor. */
export function pruefRegelText(k: CodierungsKategorie): string {
  const art = kategorieArt(k);
  if (art === 'nummer') return `Prüfung: ${nummernStellen(k)} Ziffern (laufende Nummer, Stellenzahl aus dem Beispiel)`;
  if (art === 'index') return 'Prüfung: „-“ oder Kleinbuchstaben und Ziffern (Index)';
  const { codes, gruppen } = katalogVon(k);
  if (codes.size === 0) return 'Ohne Codes – diese Stelle wird nicht geprüft';
  const umfang = `${codes.size} ${codes.size === 1 ? 'Code' : 'Codes'}${
    gruppen > 0 ? ` in ${gruppen} ${gruppen === 1 ? 'Gruppe' : 'Gruppen'}` : ''
  }`;
  return `${umfang} · Prüfung: Code aus der Liste, Gliederung mit „-“ dahinter zulässig`;
}

/* ------------------------------------------------------------------ */
/* Beispiel und Prüfung                                                */
/* ------------------------------------------------------------------ */

/** Beispielcode aus den Beispielen der Kategorien, etwa „THZ_AP_EuC_KIB_BD_BWP_0001_-.pdf“. */
export function beispielCode(pc: Plancodierung, mitEndung = true): string {
  const code = pc.kategorien.map((k) => k.beispiel.trim() || '…').join('_');
  return mitEndung && code ? `${code}.pdf` : code;
}

function zeichenName(z: string): string {
  if (z === ' ') return 'Leerzeichen';
  if (z === '\t') return 'Tabulator';
  return `„${z}“`;
}

function kategorieText(k: CodierungsKategorie, i: number): string {
  return `Kategorie ${i + 1}${k.name.trim() ? ` (${k.name.trim()})` : ''}`;
}

/** Prüft eine Stelle des Codes; liefert den Hinweis oder `null`. */
function stellePruefen(wert: string, k: CodierungsKategorie, i: number): string | null {
  const wo = kategorieText(k, i);
  if (!wert) return `${wo} ist leer.`;
  const art = kategorieArt(k);
  if (art === 'nummer') {
    const stellen = nummernStellen(k);
    return new RegExp(`^\\d{${stellen}}$`).test(wert)
      ? null
      : `${wo}: „${wert}“ – erwartet werden ${stellen} Ziffern, etwa „${'1'.padStart(stellen, '0')}“.`;
  }
  if (art === 'index') {
    return /^(-|[a-z0-9]+)$/.test(wert)
      ? null
      : `${wo}: „${wert}“ – erwartet wird „-“ oder Kleinbuchstaben und Ziffern (a, b, c …).`;
  }
  const katalog = katalogVon(k);
  if (katalog.codes.size === 0) return null;
  const bekannt = (c: string) => katalog.codes.has(c) || katalog.muster.some((m) => m.test(c));
  if (bekannt(wert)) return null;
  // Gliederung innerhalb der Kategorie: Es genügt der Code vor dem ersten „-“.
  const strich = wert.indexOf('-');
  const stamm = strich > 0 ? wert.slice(0, strich) : '';
  if (stamm && bekannt(stamm)) return null;
  const schreibweise = katalog.klein.get(wert.toLowerCase()) ?? (stamm ? katalog.klein.get(stamm.toLowerCase()) : undefined);
  if (schreibweise) return `${wo}: „${wert}“ – im Katalog „${schreibweise}“.`;
  return stamm
    ? `${wo}: „${wert}“ – weder „${wert}“ noch „${stamm}“ steht im Katalog.`
    : `${wo}: „${wert}“ steht nicht im Katalog.`;
}

/**
 * Prüft eine Plancodierung gegen das Schema; liefert die Hinweise, leer =
 * in Ordnung. Regeln siehe Kopf der Datei.
 */
export function plancodePruefen(nummer: string, pc: Plancodierung): string[] {
  const hinweise: string[] = [];
  const code = nummer.trim().replace(/\.pdf$/i, '');
  if (!code) return hinweise;

  const unzulaessig = [...new Set(code.replace(/[A-Za-z0-9_-]/g, ''))];
  if (unzulaessig.length > 0) {
    hinweise.push(
      `Unzulässige Zeichen: ${unzulaessig.map(zeichenName).join(', ')} – erlaubt sind Buchstaben ohne Umlaute, Ziffern, „-“ und „_“.`,
    );
  }

  const kategorien = pc.kategorien;
  if (kategorien.length === 0) return hinweise;
  const teile = code.split('_');
  const indexZuletzt = kategorien.length > 1 && kategorieArt(kategorien[kategorien.length - 1]) === 'index';
  const ohneIndex = indexZuletzt && teile.length === kategorien.length - 1;
  if (teile.length !== kategorien.length && !ohneIndex) {
    const zahl = indexZuletzt ? `${kategorien.length} (ohne Index ${kategorien.length - 1})` : `${kategorien.length}`;
    hinweise.push(`${teile.length} statt ${zahl} Kategorien – getrennt durch „_“, etwa „${beispielCode(pc, false)}“.`);
    return hinweise;
  }
  teile.forEach((teil, i) => {
    const hinweis = stellePruefen(teil, kategorien[i], i);
    if (hinweis) hinweise.push(hinweis);
  });
  return hinweise;
}

/* ------------------------------------------------------------------ */
/* Mitgelieferte Vorlage                                               */
/* ------------------------------------------------------------------ */

/** Katalog der Vorlage: Paare aus Code und Bezeichnung, Text allein = Überschrift. */
type Vorlage = readonly (readonly [string, string] | string)[];

function vorlageText(v: Vorlage): string {
  return v.map((z) => (typeof z === 'string' ? `# ${z}` : `${z[0]}\t${z[1]}`)).join('\n');
}

const PLANUNGSPHASE: Vorlage = [
  ['AP', 'Ausführungsplanung'],
  ['BP', 'Bestandspläne'],
];

const PLANERSTELLER: Vorlage = [
  ['BEn', 'Balance Engineering'],
  ['BBG', 'DB Bahnbau Gruppe'],
  ['BG', 'Bernard Gruppe'],
  ['EuC', 'DB Engineering & Consulting'],
  ['KLO', 'Klostermann'],
  ['STR', 'Strabag Rail'],
  ['', 'weitere Firmen nach Abstimmung mit PLM'],
];

const PLANUNGSFACHBEREICH: Vorlage = [
  ['BE', 'Baustelleneinrichtung'],
  ['EEA', 'Elektr. Energieanlagen 50 Hz'],
  ['GEK', 'Gesamterdungskonzept'],
  ['KIB', 'Konstruktiver Ingenieurbau'],
  ['KTB', 'Kabeltiefbau'],
  ['LBA', 'LST Bauzustände Alttechnik'],
  ['LAP', 'Landschafts-/Umweltplanung'],
  ['LS1', 'LST PT 1'],
  ['LS2', 'LST PT 2'],
  ['OB', 'Oberbau/Gleisbau'],
  ['OLA', 'Oberleitungsanlagen'],
  ['TB', 'Tiefbau'],
  ['TBS', 'Tiefbau mit Statik'],
  ['TK', 'Telekommunikationsanlagen'],
  ['VA', 'Verkehrsanlagen'],
];

/** Im Muster sind die Gruppen nur durch Leerzeilen getrennt; die Überschriften sind ergänzt. */
const PLANUNGSOBJEKT: Vorlage = [
  'Baubehelfe',
  ['AG', 'Arbeitsgerüst'],
  ['ASG', 'Arbeits- und Schutzgerüst'],
  ['BG', 'Baugrube'],
  ['BP', 'Bohrpfähle'],
  ['GT', 'Gurtung / Aussteifung'],
  ['RV', 'Rückverankerung'],
  ['SG', 'Schalgerüste'],
  ['SWG', 'Schwerlastgerüst / Verdeckelung'],
  ['TG', 'Traggerüste'],
  ['UF', 'Unterfangung'],
  ['USM', 'Unterschottermatte'],
  ['VS', 'Verschub / Verschubkonstruktion'],
  ['VSF', 'Verschubfundamente'],
  ['WH', 'Wasserhaltung'],
  'Ingenieurbauwerke',
  ['ABD', 'Abdichtung'],
  ['ETW', 'Entwässerung'],
  ['GEL', 'Geländer'],
  ['RH', 'Rahmenblock'],
  ['RHnn', 'Rahmenblock Nr. nn'],
  ['SBFT', 'Stahlbetonfertigteil'],
  ['TB', 'Torsionsbalken'],
  ['TR', 'Trogblock'],
  ['TRnn', 'Trogblock Nr. nn'],
  ['WDL', 'Widerlager'],
  'Bahnsteige und Ausstattung',
  ['AUST', 'Ausstattung allgemein'],
  ['BAA', 'Bahnsteigausstattung'],
  ['BSTG', 'Bahnsteig'],
  ['BD', 'Bahnsteigdach'],
  ['TRP', 'Treppe'],
  'Hilfsbrücken und Überbauten',
  ['BHB', 'Bahnsteighilfsbrücke'],
  ['BHBn', 'Bahnsteighilfsbrücke Nr. n'],
  ['GH', 'Gleishilfsbrücke'],
  ['GHnn', 'Gleishilfsbrücke Nr. nn'],
  ['UEB', 'Überbauten'],
  'Landschaft und Straße',
  ['LBP', 'Landschaftsplanung'],
  ['MB', 'Markierung / Beschilderung Straße'],
  ['PP', 'Parkplatz'],
  ['STR', 'Straße und Gehwege'],
  ['VES', 'Vogeleinflugschutz'],
  'Oberbau / Gleisbau',
  ['GL', 'Gleisbau'],
  ['PBnn', 'Prellbock Nr. nn'],
  ['TRS', 'Trassierung'],
  ['WEnn', 'Weiche Nr. nn'],
  'Kabeltiefbau',
  ['GQ', 'Gleisquerung'],
  ['KK', 'Kabelkanal'],
  ['KS', 'Kabelschacht'],
  'Elektrische Energieanlagen 50 Hz',
  ['BEL', 'Beleuchtung'],
  ['HV', 'Hauptverteilung'],
  ['KA', 'Kabelanlage'],
  ['UV', 'Unterverteilung'],
  ['ZAS', 'Zähleranschlusssäule'],
];

const PLANART: Vorlage = [
  'Allgemein',
  ['ABK', 'Abkürzungsverzeichnis'],
  ['Ber', 'Berechnung'],
  ['DB', 'Deckblatt'],
  ['EB', 'Erläuterungsbericht'],
  ['Li', 'Liste'],
  ['MO', 'Montageplan'],
  ['PV', 'Planverzeichnis'],
  ['SM', 'Schema'],
  ['TB', 'technischer Bericht'],
  ['TDB', 'Technisches Datenblatt'],
  ['UE', 'Übersichtsplan'],
  ['XX', 'sonstige Pläne'],
  'Bautechnik',
  ['AN', 'Ansicht'],
  ['AP', 'Aufstellplan'],
  ['ASP', 'Absteckplan'],
  ['BA', 'Bahnsteigausstattungsplan'],
  ['BBH', 'Baubehelfe'],
  ['BP', 'Bewehrungsplan'],
  ['BT', 'Bautechnik'],
  ['BWP', 'Bauwerksplan'],
  ['DBU', 'Deckenbuch'],
  ['DE', 'Detail'],
  ['DHP', 'Deckenhöhenplan'],
  ['EntB', 'Entwässerungsberechnung'],
  ['Entw', 'Entwässerung'],
  ['EP', 'Erdungsplan KIB oder Ausstattung'],
  ['FT', 'Fertigteil-Elementplan'],
  ['GR', 'Grundriss'],
  ['HP', 'Höhenplan/Längsschnitt'],
  ['KR', 'Kreuzungsplan'],
  ['LLP', 'Leitungslageplan'],
  ['LP', 'Lageplan / Draufsicht'],
  ['LRB', 'Leerrohrplan'],
  ['LS', 'Längsschnitt'],
  ['PB', 'Pfahlbewehrung'],
  ['PV', 'Planverzeichnis'],
  ['QP', 'Querprofil'],
  ['QS', 'Querschnitt'],
  ['RB', 'Rückbau'],
  ['RQ', 'Regelquerschnitt'],
  ['SB', 'Setzungsberechnung'],
  ['SBE', 'Schal- und Bewehrungsplan'],
  ['SBP', 'Stahlbauplan ohne Werkstattzeichnung'],
  ['SC', 'Schnitt'],
  ['SLK', 'Schleppkurvenplan'],
  ['SP', 'Schalplan'],
  ['STA', 'Stahlbau'],
  ['STB', 'Statische Berechnung'],
  ['UEB', 'Übersicht'],
  ['UP', 'Umfeldplan'],
  ['VBP', 'Verbauplan'],
  ['WSK', 'Weichenskizze'],
  ['WVP', 'Weichenverlegeplan'],
  ['WZ', 'Werkstattzeichnung'],
  'EEA 50Hz',
  ['PV', 'Planverzeichnis'],
  ['EeaE', 'Erdungsplan'],
  ['EeaH', 'Hauptverteilung Niederspannungsanlagen'],
  ['EeaI', 'Installationsplan'],
  ['EeaK', 'Kabellageplan'],
  ['EeaS', 'Stromlaufplan Niederspannungsanlagen'],
  ['EeaV', 'Verteilung allg. Niederspannungsanlagen'],
  ['EeaX', 'Sonderzeichnung'],
  ['EeaY', 'Übersichtsplan Niederspannungsanlagen'],
  ['EehE', 'Erdungsplan EWHA'],
  ['EehI', 'Installationsplan EWHA'],
  ['EehK', 'Kabellageplan EWHA'],
  ['EehS', 'Stromlaufplan EWHA'],
  ['EehV', 'Verteilung allg. EWHA'],
  ['EehX', 'Sonderzeichnung EWHA'],
  ['EehY', 'Übersichtsplan EWHA'],
  ['KS', 'Kurzschlussberechnung'],
  ['LB', 'Leistungsberechnung'],
  ['LTB', 'Lichttechnische Berechnung'],
  ['MLL', 'Mast- u. Leuchtenliste'],
  ['SPGF', 'Spannungsfallberechnung'],
  ['SVP', 'Stromversorgungsplan'],
  ['ULS', 'Berechnung Überlastschutz'],
  'LST',
  ['PV', 'Planverzeichnis'],
  ['BSB', 'Blockschaltbild'],
  ['DWT', 'Durchrutschwegtabelle'],
  ['ET', 'Erdungstabelle'],
  ['FST', 'Flankenschutztabelle'],
  ['GMT', 'Gleismagnettabelle'],
  ['GS', 'Grundstellung'],
  ['HUZT', 'Hilfsumfahrzugstraßentabelle'],
  ['HWS', 'Hebelwerkskizze'],
  ['HZST', 'Hilfszugstraßentabelle'],
  ['KL', 'Kabelliste'],
  ['KLM', 'Klemmplan'],
  ['KLP', 'Kabellageplan'],
  ['KUP', 'Kabelübersichtsplan'],
  ['RST', 'Rangierstraßentabelle'],
  ['SKP', 'Schematischer Kabelplan'],
  ['SLP', 'Signallageplan'],
  ['ST', 'Signaltabelle'],
  ['STKP', 'Schienenteilungs- u. Kabellageplan'],
  ['STP', 'Schienenteilungsplan'],
  ['SWS', 'Stellwerksskizze'],
  ['UZT', 'Umfahrzugstraßentabelle'],
  ['VT', 'Verschlusstafel'],
  ['WT', 'Weichentabelle'],
  ['WZT', 'Weichenzusatztabelle'],
  ['ZST', 'Zugfahrstraßentabelle'],
  'OLA',
  ['PV', 'Planverzeichnis'],
  ['EbsA', 'Absenkung'],
  ['EbsE', 'Bahnstromrückführung/Schutzerdung'],
  ['EbsH', 'Höhenplan'],
  ['EbsK', 'Kabellageplan'],
  ['EbsL', 'Lageplan'],
  ['EbsM', 'Masttafel'],
  ['EbsQ', 'Querprofil'],
  ['EbsT', 'Kettenwerkstabelle'],
  ['EbsU', 'Übersichtsplan mit Schaltanweisung'],
  ['EbsX', 'Sonderzeichnung'],
  'TK',
  ['PV', 'Planverzeichnis'],
  ['Tkag', 'Gestell-/Verteiler-/Schrankbelegungsplan Tk'],
  ['Tkap', 'Aufstellungsplan Tk'],
  ['Tkee', 'Erdungsplan Tk'],
  ['Tkes', 'Stromlaufplan Tk'],
  ['Tkkl', 'Kabellängenplan Tk'],
  ['Tkks', 'Kabelspleißplan Tk'],
  ['Tkkz', 'Kabelzubehörplan Tk'],
  ['TKlb', 'BÜ-Lageplan Tk'],
  ['Tklk', 'Lage-, Bahnsteiglageplan Tk'],
  ['Tkub', 'Systemblockdiagramm Tk'],
];

/** Erläuterung unter dem Schema, wie im Muster. */
export const PLANCODIERUNG_HINWEIS =
  'Die einzelnen Kategorien werden immer mit Unterstrichen getrennt. Für evtl. Gliederungen innerhalb der einzelnen Kategorien sind Bindestriche zu verwenden.';

/**
 * Mitgelieferte Plancodierung nach dem Muster eines Pflichtenhefts (Anlage
 * 11.2, Beispiel „THZ_AP_EuC_KIB_BD_BWP_0001_-.pdf“): acht Kategorien. Der
 * Katalog „Projekt“ ist projektbezogen und bleibt leer; sein Beispiel ist das
 * übergebene Kürzel der Betriebsstelle, sonst „THZ“ aus dem Muster.
 */
export function standardPlancodierung(neueId: (p: string) => string, projektKuerzel = ''): Plancodierung {
  const kategorie = (name: string, beispiel: string, eintraege: Vorlage): CodierungsKategorie => ({
    id: neueId('kat'),
    name,
    beispiel,
    eintraege: vorlageText(eintraege),
  });
  return {
    kategorien: [
      kategorie('Projekt', projektKuerzel.trim() || 'THZ', []),
      kategorie('Planungsphase', 'AP', PLANUNGSPHASE),
      kategorie('Planersteller', 'EuC', PLANERSTELLER),
      kategorie('Planungsfachbereich', 'KIB', PLANUNGSFACHBEREICH),
      kategorie('Planungsobjekt', 'BD', PLANUNGSOBJEKT),
      kategorie('Planart', 'BWP', PLANART),
      kategorie('laufende Nummer', '0001', [['0001 bis 9999', 'fortlaufende Nummerierung je Planart']]),
      kategorie('Index', '-', [
        ['-', 'zunächst'],
        ['a, b, c …', 'bei Änderungen'],
      ]),
    ],
    hinweis: PLANCODIERUNG_HINWEIS,
  };
}


/* ------------------------------------------------------------------ */
/* Druckfassung                                                        */
/* ------------------------------------------------------------------ */

/**
 * Gestaltung der Druckfassung – ein Dokument mit fester, heller Gestaltung,
 * nicht das Koralle-Design. Die Klassen tragen das Präfix `pc-` und setzen die
 * Grundregeln von `druckeHtml` (Versalien im Tabellenkopf, Zeilen ohne
 * Seitenumbruch) für sich außer Kraft. Die Anlage steht auf eigenen Seiten im
 * Querformat (`page: pc-quer`), auch in einem Dokument im Hochformat.
 */
const DRUCK_STIL = `
  @page pc-quer { size: A4 landscape; margin: 10mm 10mm 11mm; }
  .pc-blatt { page: pc-quer; font-size: 7pt; line-height: 1.28; color: #1d1d1f;
    -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .pc-blatt .pc-titel { font-size: 12pt; font-weight: 600; margin: 0 0 2.5mm; }
  .pc-blatt .pc-beispiel { font-size: 10.5pt; margin: 0 0 3mm; }
  .pc-blatt .pc-beispiel .pc-label { font-size: 8pt; color: #6e6e73; margin-right: 2mm; }
  .pc-blatt .pc-beispiel .pc-teil { font-weight: 700; }
  .pc-blatt .pc-beispiel .pc-sep { color: #8e8e93; padding: 0 0.4mm; }
  .pc-blatt table.pc-tabelle { width: 100%; table-layout: fixed; border-collapse: collapse; margin: 0; font-size: 7pt; }
  .pc-blatt .pc-tabelle > thead > tr > th {
    text-transform: none; letter-spacing: 0; text-align: left; vertical-align: top;
    font-size: 1em; font-weight: 400; color: #1d1d1f; background: #ececf0;
    padding: 1.4mm 1.1mm 1.6mm; border: 0.5pt solid #b8b8bf; }
  .pc-blatt .pc-tabelle .pc-nr { color: #6e6e73; }
  .pc-blatt .pc-tabelle .pc-name { font-size: 1.15em; font-weight: 700; margin: 0.4mm 0 1mm; overflow-wrap: break-word; }
  .pc-blatt .pc-tabelle .pc-bsp { display: inline-block; font-weight: 700; background: #ffffff;
    border: 0.5pt solid #b8b8bf; border-radius: 1mm; padding: 0.2mm 1.2mm; }
  .pc-blatt .pc-tabelle > tbody > tr { break-inside: auto; page-break-inside: auto; }
  .pc-blatt .pc-tabelle > tbody > tr > td {
    vertical-align: top; padding: 1.4mm 1.1mm; border: 0.5pt solid #b8b8bf; font-size: 1em; }
  .pc-blatt .pc-zweispaltig { column-count: 2; column-gap: 1.2em; }
  .pc-blatt .pc-e { display: flex; gap: 0.45em; padding: 0.2mm 0; break-inside: avoid; overflow-wrap: break-word; }
  .pc-blatt .pc-e > .pc-code { flex: none; width: var(--pc-code); font-weight: 600; white-space: nowrap; }
  .pc-blatt .pc-e > .pc-bez { flex: 1; min-width: 0; }
  .pc-blatt .pc-lang { padding: 0.2mm 0 0.6mm; break-inside: avoid; overflow-wrap: break-word; }
  .pc-blatt .pc-lang > .pc-code { font-weight: 600; }
  .pc-blatt .pc-frei { padding: 0.2mm 0; color: #6e6e73; font-style: italic; break-inside: avoid; }
  .pc-blatt .pc-gruppe { font-weight: 700; padding: 1.8mm 0 0.3mm; margin-bottom: 0.4mm;
    border-bottom: 0.4pt solid #d1d1d6; break-after: avoid; break-inside: avoid; }
  .pc-blatt .pc-gruppe:first-child { padding-top: 0; }
  .pc-blatt .pc-hinweis { margin: 3mm 0 0; font-size: 8pt; }
`;

/** Codes bis zu dieser Länge stehen in einer Spalte vor der Bezeichnung, längere darüber. */
const KURZER_CODE = 6;

/** Kataloge mit mehr Zeilen laufen in der Druckfassung in zwei Spalten – wenn der Platz reicht. */
const ZWEISPALTIG_AB = 90;

/*
 * Spaltenbreiten: Die Druckfassung wird als Text erzeugt, ohne Messung im
 * Browser. Geschätzt wird in Zeichen der Tabellenschrift (bei 7 pt gemessen
 * 1,15 bis 1,35 mm je Zeichen, je nach Schrift – gerechnet wird mit dem
 * Höchstwert); die Tabelle hat feste Breiten (`table-layout: fixed`) und
 * sprengt so nie die Seite.
 */
const SCHRIFT_PT = 7;
/** Kleinste Schrift, für die ein langer Katalog in zwei Spalten läuft. */
const SCHRIFT_ZWEISPALTIG_PT = 6.5;
/** Kleinste Schrift überhaupt – passt es auch so nicht, brechen lange Wörter um. */
const SCHRIFT_MINDEST_PT = 6;
const ZEICHEN_MM = 1.36;
/** Druckbreite auf A4 quer abzüglich der Ränder von `pc-quer`. */
const BREITE_MM = 277;
/** Innenabstand (2 × 1,1 mm) und Linien einer Zelle. */
const ZELLE_MM = 2.4;
/** Abstand der beiden Spalten eines langen Katalogs in Zeichen (`column-gap: 1.2em`). */
const SPALTENABSTAND = 2.2;

/**
 * Länge des längsten Worts (mit einem halben Zeichen Reserve) – umbrochen wird an
 * Leerzeichen, nach einem Bindestrich vor einem Buchstaben und nach „/“
 * (`textHtml` setzt dort ein `<wbr>`).
 */
function laengstesWort(text: string): number {
  return text.split(/\s+|(?<=\/)|(?<=-)(?=\p{L})/u).reduce((m, w) => Math.max(m, w.length + 0.5), 0);
}

/** Text für die Druckfassung: maskiert, mit Umbruchstelle nach „/“ („Bahnstromrückführung/Schutzerdung“). */
function textHtml(text: string): string {
  return html(text).replace(/\//g, '/<wbr>');
}

/**
 * Mindest- und Wunschbreite einer Spalte in Zeichen: Mindestens passen das
 * längste Wort (samt Code davor) und der Kopf hinein, gewünscht ist die
 * längste Zeile ohne Umbruch, höchstens 42 Zeichen. Kurze Kataloge (bis drei
 * Zeilen, etwa die laufende Nummer) brechen lieber um, als Platz zu nehmen.
 */
function spaltenMass(k: CodierungsKategorie, zeilen: CodierungsZeile[], code: number): { mindest: number; wunsch: number } {
  // Code-Spalte (`--pc-code`, 0,72 em je Zeichen und 0,2 em) und Abstand zur Bezeichnung (0,45 em)
  const codeSpalte = code * 1.32 + 1.2;
  const name = k.name.trim();
  // Name in 1,15 em fett, Beispiel fett im Kästchen
  let mindest = Math.max(9, laengstesWort(name) * 1.3, k.beispiel.trim().length * 1.15 + 2);
  let wunsch = Math.max(12, name.length * 1.3);
  for (const z of zeilen) {
    if (z.art === 'gruppe') {
      wunsch = Math.max(wunsch, z.titel.length * 1.05);
      mindest = Math.max(mindest, laengstesWort(z.titel) * 1.05);
    } else if (z.code && z.code.length <= KURZER_CODE) {
      wunsch = Math.max(wunsch, codeSpalte + z.bezeichnung.length);
      mindest = Math.max(mindest, codeSpalte + laengstesWort(z.bezeichnung));
    } else {
      wunsch = Math.max(wunsch, Math.min(Math.max(z.code.length * 1.1, z.bezeichnung.length), 24));
      mindest = Math.max(mindest, laengstesWort(z.code) * 1.1, laengstesWort(z.bezeichnung));
    }
  }
  wunsch = Math.max(mindest, Math.min(wunsch, 42));
  if (zeilen.length <= 3) wunsch = Math.max(mindest, Math.min(wunsch, 20));
  return { mindest, wunsch };
}

interface DruckSpalte {
  k: CodierungsKategorie;
  zeilen: CodierungsZeile[];
  /** Länge des längsten kurzen Codes. */
  code: number;
  zweispaltig: boolean;
  mindest: number;
  wunsch: number;
}

/**
 * Verteilt die Breite: Jede Spalte erhält ihre Mindestbreite, der Rest geht
 * nach dem, was ihr zur Wunschbreite fehlt. Ein Katalog über
 * `ZWEISPALTIG_AB` Zeilen läuft in zwei Spalten, wenn das mit höchstens
 * 0,7 pt kleinerer Schrift Platz hat – das spart Seiten. Die Schrift wird
 * nur so weit verkleinert, wie die Mindestbreiten es verlangen. Liefert die
 * Breiten in Prozent der Tabelle und die Schriftgröße in pt.
 */
function spaltenBreiten(spalten: DruckSpalte[]): { breiten: number[]; schrift: number } {
  const platzMm = BREITE_MM - spalten.length * ZELLE_MM;
  /** Verfügbare Breite in Zeichen der Schriftgröße `pt`. */
  const zeichenBei = (pt: number) => platzMm / ((ZEICHEN_MM * pt) / SCHRIFT_PT);
  let summeMindest = spalten.reduce((a, s) => a + s.mindest, 0);
  const lange = spalten.filter((s) => s.zeilen.length > ZWEISPALTIG_AB).sort((a, b) => b.zeilen.length - a.zeilen.length);
  for (const s of lange) {
    if (summeMindest + s.mindest + SPALTENABSTAND > zeichenBei(SCHRIFT_ZWEISPALTIG_PT)) continue;
    summeMindest += s.mindest + SPALTENABSTAND;
    s.zweispaltig = true;
    s.mindest = 2 * s.mindest + SPALTENABSTAND;
    s.wunsch = 2 * s.wunsch + SPALTENABSTAND;
  }
  const schrift = Math.max(
    SCHRIFT_MINDEST_PT,
    Math.min(SCHRIFT_PT, Math.floor(((SCHRIFT_PT * zeichenBei(SCHRIFT_PT)) / summeMindest) * 10) / 10),
  );
  const verfuegbar = zeichenBei(schrift);
  const summeWunsch = spalten.reduce((a, s) => a + s.wunsch, 0);
  let breiten: number[];
  if (summeWunsch <= verfuegbar) {
    breiten = spalten.map((s) => (s.wunsch * verfuegbar) / summeWunsch);
  } else if (summeMindest >= verfuegbar) {
    breiten = spalten.map((s) => (s.mindest * verfuegbar) / summeMindest);
  } else {
    const fehlt = summeWunsch - summeMindest;
    breiten = spalten.map((s) => s.mindest + ((verfuegbar - summeMindest) * (s.wunsch - s.mindest)) / fehlt);
  }
  const zeichenMm = (ZEICHEN_MM * schrift) / SCHRIFT_PT;
  return { breiten: breiten.map((b) => ((b * zeichenMm + ZELLE_MM) / BREITE_MM) * 100), schrift };
}

function katalogHtml(zeilen: CodierungsZeile[], code: number, zweispaltig: boolean): string {
  const inhalt = zeilen
    .map((z) => {
      if (z.art === 'gruppe') return `<div class="pc-gruppe">${textHtml(z.titel)}</div>`;
      if (!z.code) return `<div class="pc-frei">${textHtml(z.bezeichnung)}</div>`;
      if (z.code.length > KURZER_CODE) {
        return `<div class="pc-lang"><div class="pc-code">${html(z.code)}</div>${
          z.bezeichnung ? `<div>${textHtml(z.bezeichnung)}</div>` : ''
        }</div>`;
      }
      return `<div class="pc-e"><span class="pc-code">${html(z.code)}</span><span class="pc-bez">${textHtml(z.bezeichnung)}</span></div>`;
    })
    .join('');
  // Breite der Code-Spalte: etwa 0,72 em je Zeichen in halbfetter Schrift.
  return `<div class="${zweispaltig ? 'pc-zweispaltig' : ''}" style="--pc-code:${(code * 0.72 + 0.2).toFixed(2)}em">${inhalt}</div>`;
}

/**
 * HTML der Druckfassung (Fragment samt eigener Gestaltung): Titel `kopf`
 * (Text, wird maskiert), der Beispielcode, eine Tabelle mit je einer Spalte
 * je Kategorie – Kopf mit Nummer, Name und Beispiel, darunter der Katalog mit
 * fetten Überschriften – und der Hinweis. Passt in der Breite auf A4 quer
 * (Schrift 7 pt, wo nötig kleiner, siehe `spaltenBreiten`); lange Kataloge
 * laufen auf der nächsten Seite weiter, der Tabellenkopf wiederholt sich. Mit
 * der Vorlage aus dem Muster sind es zwei Seiten.
 */
export function plancodierungHtml(pc: Plancodierung, kopf: string): string {
  const titel = kopf.trim() ? `<h2 class="pc-titel">${html(kopf.trim())}</h2>` : '';
  const hinweis = pc.hinweis.trim()
    ? pc.hinweis
        .trim()
        .split(/\n{2,}/)
        .map((absatz) => `<p class="pc-hinweis">${html(absatz).replace(/\n/g, '<br>')}</p>`)
        .join('')
    : '';
  if (pc.kategorien.length === 0) {
    return `<style>${DRUCK_STIL}</style><section class="pc-blatt" lang="de">${titel}<p>Keine Kategorien festgelegt.</p>${hinweis}</section>`;
  }

  const spalten: DruckSpalte[] = pc.kategorien.map((k) => {
    const zeilen = eintraegeLesen(k.eintraege);
    const code = zeilen.reduce(
      (m, z) => (z.art === 'eintrag' && z.code.length <= KURZER_CODE ? Math.max(m, z.code.length) : m),
      1,
    );
    return { k, zeilen, code, zweispaltig: false, ...spaltenMass(k, zeilen, code) };
  });
  const { breiten, schrift } = spaltenBreiten(spalten);

  const beispiel = pc.kategorien
    .map((k) => `<span class="pc-teil">${html(k.beispiel.trim() || '…')}</span>`)
    .join('<span class="pc-sep">_</span>');

  const kopfzellen = spalten
    .map(
      ({ k }, i) =>
        `<th style="width:${breiten[i].toFixed(2)}%"><div class="pc-nr">${i + 1}. Kategorie</div>` +
        `<div class="pc-name">${textHtml(k.name.trim() || '–')}</div>` +
        `<span class="pc-bsp">${html(k.beispiel.trim() || '…')}</span></th>`,
    )
    .join('');

  const zellen = spalten
    .map(({ zeilen, code, zweispaltig }) => (zeilen.length === 0 ? '<td></td>' : `<td>${katalogHtml(zeilen, code, zweispaltig)}</td>`))
    .join('');

  return `<style>${DRUCK_STIL}</style>
<section class="pc-blatt" lang="de">
${titel}
<p class="pc-beispiel"><span class="pc-label">Beispiel</span>${beispiel}<span class="pc-endung">.pdf</span></p>
<table class="pc-tabelle" style="font-size:${schrift}pt"><thead><tr>${kopfzellen}</tr></thead><tbody><tr>${zellen}</tr></tbody></table>
${hinweis}
</section>`;
}
