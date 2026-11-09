/**
 * Excel-Ausgaben des Bereichs – alle dem Controlling vorbehalten
 * (domain/rechte.ts, `darf(zugang, 'export')`):
 * * die Auswertung des Controllings (ein Blatt je Tabelle),
 * * Listen von Leistungen (eines Projekts bzw. aller Projekte im Zeitraum),
 * * eine Vorlage für den Import im Aufbau der Zeiterfassung.
 * Den Leistungsnachweis selbst gibt es nur als Druck/PDF (domain/druck.ts) –
 * eine Excel-Fassung gibt es nicht (mehr).
 *
 * Die Blätter entstehen rein (`auswertungBlaetter`, `leistungenBlatt`,
 * `importVorlageBlatt`); erst die Funktionen `…Exportieren`/`…Laden` laden die
 * Datei herunter.
 */
import { formatDate, today } from '../../../shared/dates';
import {
  dateiLaden,
  spalte,
  xlsxErzeugen,
  type Blatt,
  type Stil,
  type Zelle,
} from '../../../shared/xlsx';
import { auswertung, zeitraumBezeichnung, type AuswertungFilter, type MitarbeiterTabelle } from './auswertung';
import { dateiname } from './druck';
import { nachweisDerLeistung, nachweisTitel, stundenVon } from './nachweis';
import {
  QUELLE_LABEL,
  mitarbeiterName,
  projektKurzname,
  projektTitel,
  type ID,
  type Leistung,
  type LeistungsnachweisDaten,
  type Projekt,
} from './types';
import { monatText, monatsanfang, monatsende, stundenText } from './zeitraum';

/* ------------------------------------------------------------------ */
/* Listen von Leistungen                                               */
/* ------------------------------------------------------------------ */

const LISTE_KOPF_STIL: Stil = { fett: true, fuellung: 'E8EDF3', rahmen: true };
const LISTE_KOPF = ['Datum', 'Mitarbeiter', 'Kürzel', 'Leistungstext', 'Stunden', 'Abschnitt', 'Projektelement', 'Quelle'];

/** Name einer Person zur Anzeige; unbekannte „?“. */
function personVon(daten: Pick<LeistungsnachweisDaten, 'mitarbeiter'>, id: ID): { name: string; kuerzel: string } {
  const m = daten.mitarbeiter.find((x) => x.id === id);
  return m ? { name: mitarbeiterName(m) || m.kuerzel, kuerzel: m.kuerzel } : { name: '?', kuerzel: '' };
}

/**
 * Liste von Leistungen mit Summe. Mit `mitProjekt` stehen zusätzlich Projekt
 * und Leistungsnachweis darin (Leistungen mehrerer Projekte).
 */
function leistungsliste(
  daten: LeistungsnachweisDaten,
  leistungen: Leistung[],
  kopf: { blatt: string; titel: string; mitProjekt: boolean; filter?: string },
): Blatt {
  const projekte = new Map(daten.projekte.map((p) => [p.id, p]));
  const abschnittVon = (l: Leistung) => projekte.get(l.projektId)?.abschnitte.find((a) => a.id === l.abschnittId);
  const name = (l: Leistung) => personVon(daten, l.mitarbeiterId).name;
  const projektNummer = (l: Leistung) => projekte.get(l.projektId)?.nummer ?? '';
  const sortiert = [...leistungen].sort(
    (a, b) =>
      a.datum.localeCompare(b.datum) ||
      (kopf.mitProjekt ? projektNummer(a).localeCompare(projektNummer(b), 'de', { numeric: true }) : 0) ||
      name(a).localeCompare(name(b), 'de') ||
      a.erfasst.localeCompare(b.erfasst),
  );
  const summe = stundenVon(sortiert);
  const ersteZeile = 5;
  const spalten = kopf.mitProjekt
    ? ['Datum', 'Projekt', 'Projektname', ...LISTE_KOPF.slice(1), 'Leistungsnachweis']
    : LISTE_KOPF;
  const stundenSpalte = spalte(spalten.indexOf('Stunden'));
  // Alle Zellen oben ausgerichtet – der Leistungstext bricht um
  const oben = (wert: string): Zelle => ({ wert, stil: { oben: true } });
  const zeilen: Zelle[][] = sortiert.map((l) => {
    const a = abschnittVon(l);
    const p = projekte.get(l.projektId);
    const n = kopf.mitProjekt ? nachweisDerLeistung(daten, l) : undefined;
    return [
      { wert: l.datum, datum: true, stil: { oben: true } },
      ...(kopf.mitProjekt ? [oben(p?.nummer ?? ''), oben(p ? projektKurzname(p) : '?')] : []),
      oben(name(l)),
      oben(personVon(daten, l.mitarbeiterId).kuerzel),
      { wert: l.text, stil: { umbruch: true, oben: true } },
      { wert: l.stunden, stil: { zahlenformat: '0.00', oben: true } },
      oben(a ? [a.kurz, a.name].filter(Boolean).join(' – ') : ''),
      oben(l.projektelement),
      oben(QUELLE_LABEL[l.quelle]),
      ...(kopf.mitProjekt ? [oben(n ? nachweisTitel(n) : 'ohne Nachweis')] : []),
    ];
  });
  const summenZeile: Zelle[] = spalten.map((s, i): Zelle => {
    if (spalten[i + 1] === 'Stunden') return { wert: 'Summe', stil: { fett: true, rechts: true } };
    if (s !== 'Stunden') return null;
    return sortiert.length
      ? { wert: summe, formel: `SUM(${stundenSpalte}${ersteZeile}:${stundenSpalte}${ersteZeile + sortiert.length - 1})`, stil: { fett: true, zahlenformat: '0.00' } }
      : { wert: 0, stil: { fett: true, zahlenformat: '0.00' } };
  });
  while (summenZeile.length && summenZeile[summenZeile.length - 1] === null) summenZeile.pop();
  return {
    name: kopf.blatt,
    kopfzeileFett: false,
    zeilen: [
      [{ wert: kopf.titel, stil: { fett: true, groesse: 13 } }],
      [
        kopf.filter
          ? `${kopf.filter} · ${sortiert.length} ${sortiert.length === 1 ? 'Leistung' : 'Leistungen'} · ${stundenText(summe)} Stunden`
          : `Stand: ${formatDate(today())} · ${sortiert.length} ${sortiert.length === 1 ? 'Leistung' : 'Leistungen'} · ${stundenText(summe)} Stunden`,
      ],
      [],
      spalten.map((wert): Zelle => ({ wert, stil: LISTE_KOPF_STIL })),
      ...zeilen,
      summenZeile,
    ],
    fixierteZeilen: 4,
    querformat: true,
    spaltenbreiten: kopf.mitProjekt ? [12, 10, 26, 24, 8, 60, 10, 28, 34, 10, 30] : [12, 24, 8, 60, 10, 28, 34, 10],
  };
}

/** Liste der Leistungen eines Projekts: Datum, Mitarbeiter, Kürzel, Leistungstext, Stunden, Abschnitt, Projektelement, Quelle – mit Summe. */
export function leistungenBlatt(daten: LeistungsnachweisDaten, projekt: Projekt, leistungen: Leistung[]): Blatt {
  return leistungsliste(daten, leistungen, { blatt: 'Leistungen', titel: `Leistungen – ${projektTitel(projekt)}`, mitProjekt: false });
}

/* ------------------------------------------------------------------ */
/* Auswertung des Controllings                                         */
/* ------------------------------------------------------------------ */

const AUSWERTUNG_KOPF: Stil = { fett: true, fuellung: 'E8EDF3', rahmen: true, umbruch: true, oben: true };
const AUSWERTUNG_KOPF_ZAHL: Stil = { ...AUSWERTUNG_KOPF, rechts: true };
const ZAHL: Stil = { zahlenformat: '0.00' };
const ZAHL_FETT: Stil = { zahlenformat: '0.00', fett: true };
const FETT_RECHTS: Stil = { fett: true, rechts: true };

/** Zeile „Projekt: … · Mitarbeiter: … · Stand: …“ unter dem Titel eines Blatts der Auswertung. */
function filterText(daten: LeistungsnachweisDaten, filter: AuswertungFilter): string {
  const p = filter.projektId ? daten.projekte.find((x) => x.id === filter.projektId) : undefined;
  const m = filter.mitarbeiterId ? personVon(daten, filter.mitarbeiterId) : undefined;
  return [
    `Zeitraum: ${zeitraumBezeichnung(filter.von, filter.bis)} (${formatDate(filter.von)} – ${formatDate(filter.bis)})`,
    `Projekt: ${p ? projektTitel(p) : 'alle'}`,
    `Mitarbeiter: ${m ? m.name : 'alle'}`,
    `Stand: ${formatDate(today())}`,
  ].join(' · ');
}

/**
 * Tabelle Mitarbeiter × Spalten als Blatt: Kürzel, Mitarbeiter, je Spalte die
 * Stunden, Summe; darunter die Summen mit Formeln.
 */
function mitarbeiterBlatt(
  name: string,
  titel: string,
  unter: string,
  t: MitarbeiterTabelle,
  spaltenKopf: (schluessel: string) => string,
): Blatt {
  const ersteZeile = 5;
  const letzteZeile = ersteZeile + t.zeilen.length - 1;
  const summeSpalte = 2 + t.spalten.length;
  const summeFormel = (c: number) => `SUM(${spalte(c)}${ersteZeile}:${spalte(c)}${letzteZeile})`;
  const zeilen: Zelle[][] = t.zeilen.map((z, i) => {
    const r = ersteZeile + i;
    return [
      z.kuerzel,
      z.name,
      ...t.spalten.map((s): Zelle => ({ wert: z.werte[s] || null, stil: ZAHL })),
      t.spalten.length
        ? { wert: z.summe, formel: `SUM(${spalte(2)}${r}:${spalte(summeSpalte - 1)}${r})`, stil: ZAHL_FETT }
        : { wert: z.summe, stil: ZAHL_FETT },
    ];
  });
  const summen: Zelle[] = [
    null,
    { wert: 'Summe', stil: FETT_RECHTS },
    ...t.spalten.map((s, i): Zelle =>
      t.zeilen.length ? { wert: t.summen[s] ?? 0, formel: summeFormel(2 + i), stil: ZAHL_FETT } : { wert: 0, stil: ZAHL_FETT },
    ),
    t.zeilen.length ? { wert: t.summe, formel: summeFormel(summeSpalte), stil: ZAHL_FETT } : { wert: 0, stil: ZAHL_FETT },
  ];
  return {
    name,
    kopfzeileFett: false,
    zeilen: [
      [{ wert: titel, stil: { fett: true, groesse: 13 } }],
      [unter],
      [],
      [
        { wert: 'Kürzel', stil: AUSWERTUNG_KOPF },
        { wert: 'Mitarbeiter', stil: AUSWERTUNG_KOPF },
        ...t.spalten.map((s): Zelle => ({ wert: spaltenKopf(s), stil: AUSWERTUNG_KOPF_ZAHL })),
        { wert: 'Summe', stil: AUSWERTUNG_KOPF_ZAHL },
      ],
      ...zeilen,
      summen,
    ],
    fixierteZeilen: 4,
    querformat: true,
    spaltenbreiten: [9, 26, ...t.spalten.map(() => 15), 12],
  };
}

/**
 * Die Auswertung als Mappe – ein Blatt je Tabelle: „Stunden je Mitarbeiter“
 * (Spalten Projekte), „Mitarbeiter und Monat“ (bei mehr als einem Monat im
 * Zeitraum) und „Stunden je Projekt“ (erfasst, Aufschlag, abgerechnet, ohne
 * Nachweis). Erfasst sind die Stunden der Leistungen; Aufschläge zählen für
 * den Zeitraum, in dem ihre Zeile beginnt.
 */
export function auswertungBlaetter(daten: LeistungsnachweisDaten, filter: AuswertungFilter): Blatt[] {
  const a = auswertung(daten, filter);
  const unter = filterText(daten, filter);
  const zeitraum = zeitraumBezeichnung(filter.von, filter.bis);
  const projekte = new Map(daten.projekte.map((p) => [p.id, p]));
  const projektKopf = (id: string) => {
    const p = projekte.get(id);
    return p ? [p.nummer, projektKurzname(p)].filter(Boolean).join('\n') : '?';
  };
  const blaetter: Blatt[] = [
    mitarbeiterBlatt('Stunden je Mitarbeiter', `Stunden je Mitarbeiter – ${zeitraum}`, unter, a.jeMitarbeiter, projektKopf),
  ];
  if (a.monate.length > 1) {
    blaetter.push(
      mitarbeiterBlatt(
        'Mitarbeiter und Monat',
        `Stunden je Mitarbeiter und Monat – ${zeitraum}`,
        unter,
        a.jeMitarbeiterUndMonat,
        (monat) => monatText(`${monat}-01`),
      ),
    );
  }

  const ersteZeile = 5;
  const letzteZeile = ersteZeile + a.jeProjekt.length - 1;
  const summe = (c: number, wert: number): Zelle =>
    a.jeProjekt.length
      ? { wert, formel: `SUM(${spalte(c)}${ersteZeile}:${spalte(c)}${letzteZeile})`, stil: ZAHL_FETT }
      : { wert: 0, stil: ZAHL_FETT };
  const k = a.kennzahlen;
  blaetter.push({
    name: 'Stunden je Projekt',
    kopfzeileFett: false,
    zeilen: [
      [{ wert: `Stunden je Projekt – ${zeitraum}`, stil: { fett: true, groesse: 13 } }],
      [
        k.mitAufschlag
          ? unter
          : `${unter} · Aufschläge gehören zu Zeilen eines Nachweises und lassen sich keiner Person zurechnen – mit Mitarbeiterfilter ohne Aufschlag.`,
      ],
      [],
      [
        { wert: 'Projekt', stil: AUSWERTUNG_KOPF },
        { wert: 'Projektname', stil: AUSWERTUNG_KOPF },
        { wert: 'Erfasst', stil: AUSWERTUNG_KOPF_ZAHL },
        { wert: 'Aufschlag', stil: AUSWERTUNG_KOPF_ZAHL },
        { wert: 'Abgerechnet', stil: AUSWERTUNG_KOPF_ZAHL },
        { wert: 'Ohne Nachweis', stil: AUSWERTUNG_KOPF_ZAHL },
      ],
      ...a.jeProjekt.map((p): Zelle[] => [
        p.nummer,
        p.name,
        { wert: p.erfasst, stil: ZAHL },
        { wert: p.aufschlag || null, stil: ZAHL },
        { wert: p.abgerechnet, stil: ZAHL },
        { wert: p.ohneNachweis || null, stil: ZAHL },
      ]),
      [null, { wert: 'Summe', stil: FETT_RECHTS }, summe(2, k.erfasst), summe(3, k.aufschlag), summe(4, k.abgerechnet), summe(5, k.ohneNachweis)],
      [],
      [null, { wert: 'Mitarbeiter mit Stunden', stil: FETT_RECHTS }, { wert: k.mitarbeiter, stil: { fett: true } }],
    ],
    fixierteZeilen: 4,
    querformat: true,
    spaltenbreiten: [10, 46, 12, 12, 13, 14],
  });
  return blaetter;
}

/** Kurzform eines Zeitraums für Dateinamen: „2026-10“, „2026-Q4“, „2026“ oder „2026-10-05_bis_2026-11-15“. */
export function zeitraumDateiteil(von: string, bis: string): string {
  const voll = von === monatsanfang(von) && bis === monatsende(bis);
  if (voll && von.slice(0, 7) === bis.slice(0, 7)) return von.slice(0, 7);
  const bezeichnung = zeitraumBezeichnung(von, bis);
  if (/^\d{4}$/.test(bezeichnung)) return bezeichnung;
  const quartal = /^Q(\d) (\d{4})$/.exec(bezeichnung);
  if (quartal) return `${quartal[2]}-Q${quartal[1]}`;
  if (voll) return `${von.slice(0, 7)}_bis_${bis.slice(0, 7)}`;
  return von === bis ? von : `${von}_bis_${bis}`;
}

/** Teil des Dateinamens für die Filter: Projektnummer und Kürzel. */
function filterDateiteil(daten: LeistungsnachweisDaten, filter: AuswertungFilter): string {
  const p = filter.projektId ? daten.projekte.find((x) => x.id === filter.projektId) : undefined;
  const m = filter.mitarbeiterId ? personVon(daten, filter.mitarbeiterId) : undefined;
  return [p ? p.nummer || projektKurzname(p) : '', m ? m.kuerzel || m.name : ''].filter(Boolean).join('_');
}

/** Dateiname der Auswertung ohne Endung, etwa „Auswertung_2026-10“ oder „Auswertung_K9101_2026-Q4“. */
export function auswertungDateiname(daten: LeistungsnachweisDaten, filter: AuswertungFilter): string {
  return dateiname(['Auswertung', filterDateiteil(daten, filter), zeitraumDateiteil(filter.von, filter.bis)].filter(Boolean).join('_'));
}

/** Lädt die Auswertung als Excel-Mappe herunter. */
export function auswertungExportieren(daten: LeistungsnachweisDaten, filter: AuswertungFilter): void {
  dateiLaden(xlsxErzeugen(auswertungBlaetter(daten, filter)), `${auswertungDateiname(daten, filter)}.xlsx`);
}

/**
 * Alle Leistungen des Zeitraums (nach den Filtern der Auswertung) als Liste –
 * Spalten wie `leistungenBlatt`, dazu Projekt und Leistungsnachweis.
 */
export function auswertungLeistungenBlatt(daten: LeistungsnachweisDaten, filter: AuswertungFilter): Blatt {
  return leistungsliste(daten, auswertung(daten, filter).leistungen, {
    blatt: 'Leistungen',
    titel: `Leistungen – ${zeitraumBezeichnung(filter.von, filter.bis)}`,
    mitProjekt: true,
    filter: filterText(daten, filter),
  });
}

/** Lädt die Leistungen des Zeitraums als Excel-Liste herunter, etwa „Leistungen_2026-10.xlsx“. */
export function auswertungLeistungenExportieren(daten: LeistungsnachweisDaten, filter: AuswertungFilter): void {
  dateiLaden(
    xlsxErzeugen([auswertungLeistungenBlatt(daten, filter)]),
    `${dateiname(['Leistungen', filterDateiteil(daten, filter), zeitraumDateiteil(filter.von, filter.bis)].filter(Boolean).join('_'))}.xlsx`,
  );
}

/* ------------------------------------------------------------------ */
/* Vorlage für den Import                                              */
/* ------------------------------------------------------------------ */

/** Spalten A–P wie im Export der Zeiterfassung; der Import liest Buchungsdatum, Mitarbeiter, Buchungstext, Menge ext., Projekt und Projektelement. */
export const ZEITERFASSUNG_KOPF = [
  'Buchungsdatum',
  'Mitarbeiter',
  'Mitarbeitergruppe',
  'Buchungsschlüssel',
  'Buchungstext',
  'Menge ext.',
  'Menge int.',
  'Einheit',
  'Projekt',
  'Projektelement',
  'SK',
  'VK',
  'Struk. Pfad',
  'Man. Ändrg.',
  'Subunternehmer',
  'Aufgabe',
];

/** Vorlage im Aufbau der Zeiterfassung – mit einer Beispielzeile. */
export function importVorlageBlatt(): Blatt {
  const beispiel: Zelle[] = [
    { wert: today(), datum: true },
    'MM: Mustermann, Max',
    'PT: Projektingenieure/Techniker',
    'Zeit: Zeitleistungen',
    'Abstimmung PL (Beispielzeile – bitte ersetzen)',
    { wert: 2.5, stil: { zahlenformat: '0.00' } },
    { wert: 2.5, stil: { zahlenformat: '0.00' } },
    'h: Stunden',
    'K9101: EÜ Beispielbach – Ersatzneubau',
    '01: Beispielabschnitt',
  ];
  return {
    name: 'Sheet1',
    zeilen: [ZEITERFASSUNG_KOPF, beispiel],
    fixierteZeilen: 1,
    spaltenbreiten: [14, 24, 26, 20, 48, 11, 11, 12, 40, 30, 8, 8, 12, 12, 16, 12],
  };
}

/** Lädt die Vorlage für den Excel-Import herunter. */
export function importVorlageLaden(): void {
  dateiLaden(xlsxErzeugen([importVorlageBlatt()]), 'Vorlage_Leistungen_Import.xlsx');
}
