/**
 * Excel-Ausgaben des Bereichs: die Projektbeteiligtenliste (auch als leere
 * Vorlage für den Import) und die LOP (aktuelle Liste und Archiv).
 */
import { formatDate, today } from '../../../shared/dates';
import { dateiLaden, xlsxErzeugen, type Zelle } from '../../../shared/xlsx';
import { BETEILIGTE_KOPF } from './beteiligteImport';
import { aktivePunkte, archiviertePunkte, volltext } from './lop';
import { AMPEL_LABEL, ampelFuer } from './punkte';
import { kuerzelVon, type Beteiligter, type Funktion, type Lop, type LopPunkt, type Projekt } from './types';

const KOPF_STIL = { fett: true, fuellung: 'E8EDF3', rahmen: true };
/** Spaltenbreiten der Beteiligtenliste in der Reihenfolge von `BETEILIGTE_KOPF`. */
const SPALTENBREITEN = [24, 10, 9, 8, 14, 16, 28, 30, 18, 18, 30, 30];
const kopf = (spalten: string[]): Zelle[] => spalten.map((wert) => ({ wert, stil: KOPF_STIL }));
const datum = (wert: string): Zelle => ({ wert: wert || null, datum: true });
const titelZeile = (text: string): Zelle[] => [{ wert: text, stil: { fett: true, groesse: 13 } }];

const UMLAUTE: Record<string, string> = { ä: 'ae', ö: 'oe', ü: 'ue', Ä: 'Ae', Ö: 'Oe', Ü: 'Ue', ß: 'ss' };

/** Dateiname ohne Umlaute und Sonderzeichen – manche Browser verwerfen sonst den Namen. */
function dateiname(text: string): string {
  return text
    .replace(/[äöüÄÖÜß]/g, (z) => UMLAUTE[z])
    .replace(/[^A-Za-z0-9-]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const projektTitel = (p: Projekt) => [p.nummer, p.name].filter(Boolean).join(' ');

/**
 * Projektbeteiligtenliste als Excel-Datei. Die Spalten entsprechen der
 * Importvorlage (`BETEILIGTE_KOPF`) – die Datei lässt sich in ein anderes
 * Projekt wieder einlesen.
 */
export function beteiligteExportieren(projekt: Projekt, beteiligte: Beteiligter[], funktionen: Funktion[]): void {
  const zeilen: Zelle[][] = beteiligte.map((b) => [
    funktionen.find((f) => f.id === b.funktionId)?.name ?? '',
    funktionen.find((f) => f.id === b.funktionId)?.gewerk ?? '',
    kuerzelVon(b, funktionen),
    b.anrede,
    b.vorname,
    b.nachname,
    b.firma,
    b.email,
    b.telefon,
    b.mobil,
    b.anschrift,
    b.notiz,
  ]);
  const blob = xlsxErzeugen([
    {
      name: 'Projektbeteiligte',
      kopfzeileFett: false,
      zeilen: [
        titelZeile(`Projektbeteiligte – ${projektTitel(projekt)}`),
        [`Stand: ${formatDate(today())}`],
        [],
        kopf(BETEILIGTE_KOPF),
        ...zeilen,
      ],
      fixierteZeilen: 4,
      querformat: true,
      spaltenbreiten: SPALTENBREITEN,
    },
  ]);
  dateiLaden(blob, `Projektbeteiligte_${dateiname(projekt.name)}_${today()}.xlsx`);
}

/** Leere Vorlage für den Import der Projektbeteiligten – mit einer Beispielzeile. */
export function beteiligteVorlageLaden(): void {
  const beispiel = ['Fachplanung', 'LST', '', 'Frau', 'Erika', 'Beispiel', 'Planungsbüro Beispiel GmbH', 'erika.beispiel@example.org', '', '', '', 'Beispielzeile – bitte ersetzen'];
  const blob = xlsxErzeugen([
    {
      name: 'Projektbeteiligte',
      zeilen: [BETEILIGTE_KOPF, beispiel],
      fixierteZeilen: 1,
      querformat: true,
      spaltenbreiten: SPALTENBREITEN,
    },
  ]);
  dateiLaden(blob, 'Vorlage_Projektbeteiligte.xlsx');
}

export function lopExportieren(projekt: Projekt, lop: Lop): void {
  const thema = (p: LopPunkt) => lop.themen.find((t) => t.id === p.themaId)?.titel ?? '';
  const zeile = (p: LopPunkt): Zelle[] => {
    const ampel = ampelFuer(p.termin, p.status);
    const fuellung = ampel === 'ueberfaellig' ? 'F8D0CC' : ampel === 'faellig' ? 'FCE4C4' : undefined;
    return [
      p.nr,
      thema(p),
      volltext(p),
      p.wer,
      { wert: p.termin || null, datum: true, stil: fuellung ? { fuellung } : undefined },
      AMPEL_LABEL[ampel],
      datum(p.erledigtAm),
      p.bemerkung,
      p.herkunft,
      datum(p.erfasst),
    ];
  };
  const spalten = [
    'Nr.',
    'Thema',
    'Inhalt',
    'Verantwortlich',
    'Termin',
    'Status',
    'Erledigt am',
    'Bemerkung',
    'Herkunft',
    'Aufgenommen am',
  ];
  const breiten = [7, 22, 60, 16, 12, 16, 12, 36, 24, 14];
  const titel = `Liste offener Punkte – ${projektTitel(projekt)}`;
  const stand = `Stand Nr. ${lop.stand} vom ${formatDate(lop.standDatum)}`;
  const blob = xlsxErzeugen([
    {
      name: 'LOP',
      kopfzeileFett: false,
      zeilen: [titelZeile(titel), [stand], [], kopf(spalten), ...aktivePunkte(lop).map(zeile)],
      fixierteZeilen: 4,
      querformat: true,
      spaltenbreiten: breiten,
    },
    {
      name: 'Archiv',
      kopfzeileFett: false,
      zeilen: [titelZeile(`${titel} – Archiv`), [stand], [], kopf(spalten), ...archiviertePunkte(lop).map(zeile)],
      fixierteZeilen: 4,
      querformat: true,
      spaltenbreiten: breiten,
    },
  ]);
  dateiLaden(blob, `LOP_${dateiname(projekt.name)}_Stand${lop.stand}_${today()}.xlsx`);
}
