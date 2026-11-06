/**
 * Excel-Ausgabe des Monitors: ein Blatt mit den Anmeldungen samt Status und
 * Terminfrist, ein Blatt mit den Projekten.
 */
import { formatDate, today } from '../../../shared/dates';
import { dateiLaden, xlsxErzeugen, type Zelle } from '../../../shared/xlsx';
import { AMPEL_LABEL, ampelFuer, terminfrist } from './fristen';
import { ANNEX_VII_LABEL, ERSTE_PHASE_LABEL, PROJEKT_STATUS_LABEL, type BaubetriebDaten, type ID } from './types';
import { statusVon, zustaendigText } from './workflow';

const KOPF_STIL = { fett: true, fuellung: 'E8EDF3', rahmen: true };

// Kopf und Breite stehen je Spalte beisammen, damit eine neue Spalte die Breiten der
// folgenden nicht verschiebt.
/** Spalten des Blatts „Anmeldungen“ mit ihrer Breite (Zeichen). */
const ANMELDUNG_SPALTEN: [titel: string, breite: number][] = [
  ['Projekt', 28],
  ['DB-G-Nummer', 14],
  ['Vorhabenname', 26],
  ['Anmelde-ID / Begriff', 22],
  ['Maßnahmenart', 13],
  ['Workflow', 20],
  ['Status', 26],
  ['Status seit', 12],
  ['Zuständig', 22],
  ['Zuständiger BBK', 18],
  ['Anmelder', 22],
  ['Sperrzeit von', 12],
  ['Sperrzeit bis', 12],
  ['Fahrplanjahr', 11],
  ['Terminfrist', 12],
  ['Regel', 18],
  ['Ampel', 11],
  ['Bf/Strecke', 30],
  ['Gewerk/Tätigkeit', 30],
  ['ÄAbst-Nr', 12],
  ['AnnexVII', 26],
  ['Bemerkungen', 36],
];

/** Spalten des Blatts „Projekte“ mit ihrer Breite (Zeichen). */
const PROJEKT_SPALTEN: [titel: string, breite: number][] = [
  ['Projekt', 32],
  ['Projektleiter', 26],
  ['DB-G-Nummer', 14],
  ['Erster Anmeldetermin (ca.)', 14],
  ['Prozessphase', 16],
  ['Betroffene Fahrplanjahre', 22],
  ['Inbetriebnahme', 14],
  ['Hauptbearbeiter MIC', 20],
  ['MIC-Projektnummer (wiko)', 18],
  ['Status', 16],
  ['Anmeldungen', 12],
  ['Bemerkung', 36],
];

const datum = (wert: string | null): Zelle => ({ wert, datum: true });

const UMLAUTE: Record<string, string> = { ä: 'ae', ö: 'oe', ü: 'ue', Ä: 'Ae', Ö: 'Oe', Ü: 'Ue', ß: 'ss' };

/**
 * Dateiname ohne Umlaute und Sonderzeichen – manche Browser verwerfen sonst
 * den Namen und speichern als „download“.
 */
function dateiname(text: string): string {
  return text
    .replace(/[äöüÄÖÜß]/g, (z) => UMLAUTE[z])
    .replace(/[^A-Za-z0-9-]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/** Lädt den Monitor der genannten (bzw. aller) Projekte als Excel-Datei herunter. */
export function monitorExportieren(d: BaubetriebDaten, projektIds?: ID[]): void {
  const projekte = d.projekte.filter((p) => !projektIds || projektIds.includes(p.id));
  const stand = `Stand: ${formatDate(today())}`;

  const anmeldungZeilen: Zelle[][] = projekte.flatMap((p) =>
    d.anmeldungen
      .filter((a) => a.projektId === p.id)
      .map((a): Zelle[] => {
        const { workflow, status } = statusVon(d.workflows, a.statusId);
        const frist = terminfrist(a, d);
        const ampel = ampelFuer(frist.datum, d.einstellungen.vorlaufTage);
        const fuellung = ampel === 'ueberfaellig' ? 'F8D0CC' : ampel === 'faellig' ? 'FCE4C4' : undefined;
        return [
          p.name,
          p.dbGNummer,
          a.vorhaben,
          a.anmeldeId,
          a.art,
          workflow.name,
          status.name,
          datum(a.statusSeit),
          zustaendigText(status, a, p) ?? '',
          a.bbk,
          a.anmelder,
          datum(a.bauVon),
          datum(a.bauBis),
          a.fahrplanjahr,
          { wert: frist.datum, datum: true, stil: fuellung ? { fuellung } : undefined },
          frist.datum ? (frist.manuell ? 'von Hand' : frist.regel) : '',
          frist.datum ? AMPEL_LABEL[ampel] : '',
          a.bfStrecke,
          a.gewerk,
          a.aenderungsNr,
          a.annexVII ? ANNEX_VII_LABEL[a.annexVII] : '',
          a.bemerkung,
        ];
      }),
  );

  const projektZeilen: Zelle[][] = projekte.map((p) => [
    p.name,
    p.projektleiter,
    p.dbGNummer,
    datum(p.ersterAnmeldetermin),
    ERSTE_PHASE_LABEL[p.erstePhase],
    p.fahrplanjahre.join(', '),
    datum(p.inbetriebnahme),
    p.hauptbearbeiter,
    p.projektnummer,
    PROJEKT_STATUS_LABEL[p.status],
    d.anmeldungen.filter((a) => a.projektId === p.id).length,
    p.bemerkung,
  ]);

  const kopf = (spalten: [string, number][]): Zelle[] => spalten.map(([wert]) => ({ wert, stil: KOPF_STIL }));
  const titel = projekte.length === 1 ? `Projekt: ${projekte[0].name}` : 'Baubetriebsplanung – Monitor';

  const blob = xlsxErzeugen([
    {
      name: 'Anmeldungen',
      kopfzeileFett: false,
      zeilen: [[{ wert: titel, stil: { fett: true, groesse: 13 } }], [stand], [], kopf(ANMELDUNG_SPALTEN), ...anmeldungZeilen],
      fixierteZeilen: 4,
      querformat: true,
      spaltenbreiten: ANMELDUNG_SPALTEN.map(([, breite]) => breite),
    },
    {
      name: 'Projekte',
      kopfzeileFett: false,
      zeilen: [[{ wert: 'Projekte', stil: { fett: true, groesse: 13 } }], [stand], [], kopf(PROJEKT_SPALTEN), ...projektZeilen],
      fixierteZeilen: 4,
      querformat: true,
      spaltenbreiten: PROJEKT_SPALTEN.map(([, breite]) => breite),
    },
  ]);
  const name = projekte.length === 1 ? dateiname(projekte[0].name) : 'Monitor';
  dateiLaden(blob, `Baubetrieb_${name}_${today()}.xlsx`);
}
