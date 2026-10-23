/**
 * Excel-Ausgaben des Bereichs: die Projektbeteiligtenliste und die LOP
 * (aktuelle Liste und Archiv).
 */
import { formatDate, today } from '../../../shared/dates';
import { dateiLaden, xlsxErzeugen, type Zelle } from '../../../shared/xlsx';
import { aktivePunkte, archiviertePunkte } from './lop';
import { volltext } from './protokoll';
import { AMPEL_LABEL, ampelFuer } from './punkte';
import { kuerzelVon, type Beteiligter, type Funktion, type Lop, type LopPunkt, type Projekt } from './types';

const KOPF_STIL = { fett: true, fuellung: 'E8EDF3', rahmen: true };
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

export function beteiligteExportieren(projekt: Projekt, beteiligte: Beteiligter[], funktionen: Funktion[]): void {
  const zeilen: Zelle[][] = beteiligte.map((b) => [
    funktionen.find((f) => f.id === b.funktionId)?.name ?? '',
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
        kopf(['Funktion', 'Kürzel', 'Anrede', 'Vorname', 'Nachname', 'Firma / Büro', 'E-Mail', 'Telefon', 'Mobil', 'Anschrift', 'Notiz']),
        ...zeilen,
      ],
      fixierteZeilen: 4,
      querformat: true,
      spaltenbreiten: [26, 9, 8, 14, 16, 28, 30, 18, 18, 30, 30],
    },
  ]);
  dateiLaden(blob, `Projektbeteiligte_${dateiname(projekt.name)}_${today()}.xlsx`);
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
      p.herkunft,
      datum(p.erfasst),
    ];
  };
  const spalten = ['Nr.', 'Thema', 'Inhalt', 'Verantwortlich', 'Termin', 'Status', 'Erledigt am', 'Herkunft', 'Aufgenommen am'];
  const breiten = [7, 22, 60, 16, 12, 16, 12, 24, 14];
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
