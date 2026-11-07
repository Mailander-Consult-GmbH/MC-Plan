/**
 * Zeiträume der Leistungsnachweise: Tage, ISO-Kalenderwochen und Monate als
 * Perioden, ihre Texte in der Spalte „Datum“ und in Überschriften sowie das
 * Stundenformat. Dazu die Erfassungsperioden der gemeinsamen Leistungstexte
 * (`erfassungsPeriode`): die Periode im Raster, auf den Kalendermonat gekürzt
 * und an Schnitten – den Grenzen der Nachweise – geteilt, und ihr Schlüssel
 * (`erfassungsPeriodeAusSchluessel`). Alles rein und ohne Zeitzonenbezug –
 * gerechnet wird auf ISO-Daten (JJJJ-MM-TT) mit den Datumshilfen aus
 * `src/shared/dates.ts`.
 */
import { addDays, diffDays, parseISO, wochentag } from '../../../shared/dates';
import type { ISODate, Raster } from './types';

/** Ein Tag, eine Woche oder ein Monat – mit Schlüssel wie „T2026-10-30“, „W2026-44“ oder „M2026-10“. */
export interface Periode {
  schluessel: string;
  von: ISODate;
  bis: ISODate;
}

/** Monatsnamen, Januar zuerst. */
export const MONATSNAMEN = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
] as const;

const zwei = (n: number) => String(n).padStart(2, '0');

/** Ist der Text ein gültiges ISO-Datum (JJJJ-MM-TT)? */
export function istDatum(w: unknown): w is ISODate {
  if (typeof w !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(w)) return false;
  const d = parseISO(w);
  return !!d && d.getMonth() + 1 === Number(w.slice(5, 7)) && d.getDate() === Number(w.slice(8, 10));
}

/** Wochentag 0 = Montag … 6 = Sonntag. */
function wochentagIndex(datum: ISODate): number {
  const d = parseISO(datum);
  return d ? (d.getDay() + 6) % 7 : 0;
}

/** Fällt das Datum auf Samstag oder Sonntag? */
export function istWochenende(datum: ISODate): boolean {
  return wochentagIndex(datum) >= 5;
}

/** Montag der Woche, in der das Datum liegt. */
export function wochenanfang(datum: ISODate): ISODate {
  return addDays(datum, -wochentagIndex(datum));
}

/** Erster Tag des Monats. */
export function monatsanfang(datum: ISODate): ISODate {
  return `${datum.slice(0, 7)}-01`;
}

/** Letzter Tag des Monats. */
export function monatsende(datum: ISODate): ISODate {
  const jahr = Number(datum.slice(0, 4));
  const monat = Number(datum.slice(5, 7));
  // Tag 0 des Folgemonats ist der letzte Tag dieses Monats
  const tage = new Date(jahr, monat, 0).getDate();
  return `${datum.slice(0, 7)}-${zwei(tage)}`;
}

/** Erster Tag des Monats, der `anzahl` Monate nach (negativ: vor) dem Monat des Datums liegt. */
export function monatVersetzt(datum: ISODate, anzahl: number): ISODate {
  const index = Number(datum.slice(0, 4)) * 12 + Number(datum.slice(5, 7)) - 1 + anzahl;
  return `${Math.floor(index / 12)}-${zwei((index % 12) + 1)}-01`;
}

/**
 * ISO-Kalenderwoche: Wochen beginnen am Montag, Woche 1 enthält den ersten
 * Donnerstag des Jahres. Das Jahr ist das der Woche (ISO-Jahr) – so liegt der
 * 28.12.2026 bis 03.01.2027 in KW 53/2026 und der 29.12.2025 in KW 1/2026.
 */
export function kalenderwoche(datum: ISODate): { jahr: number; woche: number } {
  const donnerstag = addDays(datum, 3 - wochentagIndex(datum));
  const jahr = Number(donnerstag.slice(0, 4));
  const tagImJahr = diffDays(`${jahr}-01-01`, donnerstag);
  return { jahr, woche: Math.floor(tagImJahr / 7) + 1 };
}

/** Periode, in der ein Datum liegt (ungekürzt): T2026-10-30 | W2026-44 (ISO-Woche, Mo–So, ISO-Jahr) | M2026-10 */
export function periodeVon(datum: ISODate, raster: Raster): Periode {
  if (raster === 'tag') return { schluessel: `T${datum}`, von: datum, bis: datum };
  if (raster === 'woche') {
    const { jahr, woche } = kalenderwoche(datum);
    const von = wochenanfang(datum);
    return { schluessel: `W${jahr}-${zwei(woche)}`, von, bis: addDays(von, 6) };
  }
  return { schluessel: `M${datum.slice(0, 7)}`, von: monatsanfang(datum), bis: monatsende(datum) };
}

/** Periode auf [von, bis] gekürzt. */
export function periodeKuerzen(p: Periode, von: ISODate, bis: ISODate): Periode {
  return { schluessel: p.schluessel, von: p.von < von ? von : p.von, bis: p.bis > bis ? bis : p.bis };
}

/** Alle Perioden, die [von, bis] berühren – auf [von, bis] gekürzt, aufsteigend. */
export function perioden(von: ISODate, bis: ISODate, raster: Raster): Periode[] {
  if (!istDatum(von) || !istDatum(bis) || von > bis) return [];
  const liste: Periode[] = [];
  let p = periodeVon(von, raster);
  while (p.von <= bis) {
    liste.push(periodeKuerzen(p, von, bis));
    p = periodeVon(addDays(p.bis, 1), raster);
  }
  return liste;
}

/* ------------------------------------------------------------------ */
/* Erfassungsperioden (gemeinsame Leistungstexte)                      */
/* ------------------------------------------------------------------ */

/** Trenner zwischen Monat und Periode im Schlüssel einer Erfassungsperiode („2026-10|W2026-44“). */
export const ERFASSUNG_TRENNER = '|';

/** Ist der Text ein Monat JJJJ-MM? */
export function istMonat(w: unknown): w is string {
  return typeof w === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(w);
}

/**
 * Erfassungsperiode eines Datums: die Periode im Raster des Projekts
 * (`periodeVon`), auf den Kalendermonat gekürzt – eine Woche über ein
 * Monatsende zählt so in jedem Monat für sich (26.–31.10. im Oktober, 1.11.
 * im November). Schlüssel „<JJJJ-MM>|<Periode>“, etwa „2026-10|W2026-44“;
 * so stehen die gemeinsamen Leistungstexte (`Periodentext`) im Bestand.
 *
 * `schnitte` sind Tage, an denen zusätzlich ein neuer Teil beginnt – Beginn
 * und Tag nach dem Ende jedes Nachweises (`erfassungsGliederung` in
 * domain/nachweis.ts): Liegt eine Grenze eines Nachweises in der Periode –
 * etwa nach einem Abschluss oder einem festgelegten Ende mitten darin, auch
 * wenn danach (noch) kein Nachweis beginnt –, bekommt jeder Teil einen eigenen
 * Text, statt den schon abgerechneten zu erben; so liegt jeder Teil in
 * höchstens einem Nachweis. Der erste Teil behält den Schlüssel, jeder
 * weitere hängt seinen Beginn an („2026-11|M2026-11|2026-11-06“).
 */
export function erfassungsPeriode(datum: ISODate, raster: Raster, schnitte: readonly ISODate[] = []): Periode {
  const p = periodeKuerzen(periodeVon(datum, raster), monatsanfang(datum), monatsende(datum));
  const basis = `${datum.slice(0, 7)}${ERFASSUNG_TRENNER}${p.schluessel}`;
  let von = p.von;
  let bis = p.bis;
  for (const s of schnitte) {
    if (s <= p.von || s > p.bis) continue;
    if (s <= datum) {
      if (s > von) von = s;
    } else {
      const vorher = addDays(s, -1);
      if (vorher < bis) bis = vorher;
    }
  }
  return { schluessel: von === p.von ? basis : `${basis}${ERFASSUNG_TRENNER}${von}`, von, bis };
}

/** Montag der ISO-Kalenderwoche `woche` des ISO-Jahres `jahr` (der 4. Januar liegt stets in KW 1). */
function wocheBeginn(jahr: number, woche: number): ISODate {
  return addDays(wochenanfang(`${jahr}-01-04`), (woche - 1) * 7);
}

/**
 * Erfassungsperiode zu einem Schlüssel („2026-10|W2026-44“) samt Monat und
 * Raster – null, wenn der Schlüssel keiner ist. Ein Teil nach einem Schnitt
 * („2026-11|M2026-11|2026-11-06“, `erfassungsPeriode`) beginnt an seinem Tag;
 * sein Ende hängt von späteren Schnitten ab, die der Schlüssel nicht kennt –
 * geliefert wird das Ende der Periode (ein Zeitraum, der den Teil sicher umfasst).
 */
export function erfassungsPeriodeAusSchluessel(schluessel: string): (Periode & { monat: string; raster: Raster }) | null {
  const [monat, roh, ab, ...rest] = schluessel.split(ERFASSUNG_TRENNER);
  if (!istMonat(monat) || !roh || rest.length > 0) return null;
  const anfang = `${monat}-01`;
  const ende = monatsende(anfang);
  let p: Periode | null = null;
  let raster: Raster;
  if (roh[0] === 'T' && istDatum(roh.slice(1))) {
    raster = 'tag';
    p = periodeVon(roh.slice(1), 'tag');
  } else if (/^W\d{4}-\d{2}$/.test(roh)) {
    raster = 'woche';
    const von = wocheBeginn(Number(roh.slice(1, 5)), Number(roh.slice(6, 8)));
    p = periodeVon(von, 'woche');
    if (p.schluessel !== roh) return null;
  } else if (/^M\d{4}-\d{2}$/.test(roh) && istMonat(roh.slice(1))) {
    raster = 'monat';
    p = periodeVon(`${roh.slice(1)}-01`, 'monat');
  } else return null;
  if (p.bis < anfang || p.von > ende) return null;
  const gekuerzt = periodeKuerzen(p, anfang, ende);
  if (ab === undefined) return { ...gekuerzt, schluessel, monat, raster };
  // Teil nach einem Schnitt: beginnt nach dem Anfang der Periode und in ihr
  if (!istDatum(ab) || ab <= gekuerzt.von || ab > gekuerzt.bis) return null;
  return { schluessel, von: ab, bis: gekuerzt.bis, monat, raster };
}

/** Liegt das Datum in [von, bis]? */
export function imZeitraum(datum: ISODate, von: ISODate, bis: ISODate): boolean {
  return datum >= von && datum <= bis;
}

/** „30.10.26“ – Datum mit zweistelligem Jahr, wie in der Spalte „Datum“. */
export function kurzDatum(datum: ISODate): string {
  return `${datum.slice(8, 10)}.${datum.slice(5, 7)}.${datum.slice(2, 4)}`;
}

/** „30.10.2026“ */
export function langDatum(datum: ISODate): string {
  return `${datum.slice(8, 10)}.${datum.slice(5, 7)}.${datum.slice(0, 4)}`;
}

const spanne = (von: ISODate, bis: ISODate) => (von === bis ? kurzDatum(von) : `${kurzDatum(von)} - ${kurzDatum(bis)}`);

/**
 * Text der Spalte „Datum“: Tag „Fr 30.10.26“, Woche „KW 44\n26.10.26 - 30.10.26“
 * (Mo–Fr der Woche, gekürzt auf die Periode; fällt eine Leistung aufs
 * Wochenende – `mitWochenende` –, bis Sonntag), Monat „01.10.26 - 31.10.26“.
 * Umfasst die Periode nur einen Tag, steht dieser allein.
 */
export function datumText(p: Periode, raster: Raster, mitWochenende = false): string {
  if (raster === 'tag') return `${wochentag(p.von)} ${kurzDatum(p.von)}`;
  if (raster === 'woche') {
    const freitag = addDays(wochenanfang(p.von), 4);
    let bis = mitWochenende || p.bis < freitag ? p.bis : freitag;
    // Eine Periode nur aus Samstag und Sonntag zeigt diese beiden Tage
    if (bis < p.von) bis = p.bis;
    return `KW ${kalenderwoche(p.von).woche}\n${spanne(p.von, bis)}`;
  }
  return spanne(p.von, p.bis);
}

/** Monatsname „Oktober 2026“. */
export function monatText(datum: ISODate): string {
  const monat = Number(datum.slice(5, 7));
  return `${MONATSNAMEN[monat - 1] ?? ''} ${datum.slice(0, 4)}`.trim();
}

/**
 * Zeitraum in Überschriften: „Oktober 2026“ (voller Monat), „Juni – Oktober 2026“
 * (volle Monate eines Jahres), „Dezember 2025 – Februar 2026“, sonst
 * „15.06.2026 – 31.10.2026“ (ein einzelner Tag: „15.06.2026“).
 */
export function zeitraumText(von: ISODate, bis: ISODate): string {
  if (!istDatum(von) || !istDatum(bis)) return [von, bis].filter(istDatum).map(langDatum).join(' – ');
  const volleMonate = von === monatsanfang(von) && bis === monatsende(bis) && von <= bis;
  if (volleMonate) {
    if (von.slice(0, 7) === bis.slice(0, 7)) return monatText(von);
    if (von.slice(0, 4) === bis.slice(0, 4)) return `${MONATSNAMEN[Number(von.slice(5, 7)) - 1]} – ${monatText(bis)}`;
    return `${monatText(von)} – ${monatText(bis)}`;
  }
  return von === bis ? langDatum(von) : `${langDatum(von)} – ${langDatum(bis)}`;
}

/** Rundet auf zwei Nachkommastellen (Gleitkommafehler beim Summieren vermeiden). */
export function runden(stunden: number): number {
  if (!Number.isFinite(stunden)) return 0;
  const r = Math.round((stunden + (stunden >= 0 ? Number.EPSILON : -Number.EPSILON)) * 100) / 100;
  return r === 0 ? 0 : r;
}

/** 57,5 → „57,50“ (de-DE, zwei Nachkommastellen, Tausender mit Punkt: „1.234,50“). */
export function stundenText(stunden: number): string {
  const r = runden(stunden);
  const [ganz, nachkomma] = Math.abs(r).toFixed(2).split('.');
  const gruppiert = ganz.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${r < 0 ? '-' : ''}${gruppiert},${nachkomma}`;
}
