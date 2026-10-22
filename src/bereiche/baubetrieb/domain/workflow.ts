/**
 * Status-Workflow der baubetrieblichen Anmeldungen – Tabelle „Ausprägung
 * Merkmal Status Workflow“ aus dem Lastenheft. Der Workflow bildet bewusst
 * nicht den Genehmigungs- und Eskalationsprozess 1:1 ab, und die einzelnen
 * Schreibtische einer Änderungsabstimmung werden nicht verfolgt.
 *
 * Die Nummer nennt Phase (Buchstabe) und Stand (Ziffer). Neu angelegt werden
 * kann nur in einem der vier Entwurfs-Status (START_STATUS).
 */
import type { PhaseId, StatusCode, StatusDef } from './types';

const ril = (bezug: Extract<StatusDef['frist'], { typ: 'ril' }>['bezug'], versatzTage = 0): StatusDef['frist'] => ({
  typ: 'ril',
  bezug,
  versatzTage,
});
const keine: StatusDef['frist'] = { typ: 'keine' };
const nachhaken: StatusDef['frist'] = { typ: 'nachhaken' };

export const STATUS_WORKFLOW: StatusDef[] = [
  // SKM
  { code: 'V0', name: 'Entwurf_SKM', phase: 'V', art: 'entwurf', nachfolger: ['V2', 'Z0'], frist: ril('skm') },
  {
    code: 'V2',
    name: 'Angemeldet_SKM',
    phase: 'V',
    art: 'angemeldet',
    nachfolger: ['V3', 'V4'],
    frist: { typ: 'stichtag', tag: 1, monat: 8 },
    nachhaken: true,
  },
  { code: 'V3', name: 'Genehmigt_SKM', phase: 'V', art: 'genehmigt', nachfolger: ['W0'], frist: ril('pze') },
  { code: 'V4', name: 'Abgelehnt_SKM', phase: 'V', art: 'abgelehnt', nachfolger: ['Z0', 'V0', 'W0'], frist: keine },

  // PzE
  { code: 'W0', name: 'Entwurf_PzE', phase: 'W', art: 'entwurf', nachfolger: ['W2', 'Z0'], frist: ril('pze') },
  {
    code: 'W2',
    name: 'Angemeldet_PzE',
    phase: 'W',
    art: 'angemeldet',
    nachfolger: ['W3', 'W4'],
    frist: { typ: 'stichtag', tag: 31, monat: 7 },
    nachhaken: true,
  },
  { code: 'W3', name: 'Genehmigt_PzE', phase: 'W', art: 'genehmigt', nachfolger: ['X0'], frist: ril('N-2') },
  {
    code: 'W4',
    name: 'Abgelehnt_PzE',
    phase: 'W',
    art: 'abgelehnt',
    nachfolger: ['Z0', 'V0', 'W0', 'X0'],
    frist: keine,
  },

  // Vorprozess N-x – Anmeldungen hier gelten als fristgerecht (Annahme des Lastenhefts)
  {
    code: 'X0',
    name: 'Entwurf_Vorprozess',
    phase: 'X',
    art: 'entwurf',
    nachfolger: ['X2', 'Z0'],
    frist: ril('Nx', -14),
  },
  {
    code: 'X2',
    name: 'MitwirkungBBK_Vorprozess',
    phase: 'X',
    art: 'abstimmung',
    nachfolger: ['X3', 'X8'],
    frist: ril('Nx', -2),
    nachhaken: true,
  },
  { code: 'X3', name: 'Zugestimmt_Vorprozess', phase: 'X', art: 'abstimmung', nachfolger: ['X4'], frist: ril('Nx') },
  {
    code: 'X4',
    name: 'Angemeldet_fristgerecht_Vorprozess',
    phase: 'X',
    art: 'angemeldet',
    nachfolger: ['X5', 'X8'],
    frist: nachhaken,
  },
  {
    code: 'X5',
    name: 'Genehmigt_Vorprozess',
    phase: 'X',
    art: 'genehmigt',
    nachfolger: ['X6', 'X5', 'Y4'],
    frist: ril('A'),
  },
  {
    code: 'X6',
    name: 'Änderung_angemeldet_Vorprozess',
    phase: 'X',
    art: 'aenderung',
    nachfolger: ['X5', 'X7'],
    frist: nachhaken,
  },
  {
    code: 'X7',
    name: 'Änderung_abgelehnt_Vorprozess',
    phase: 'X',
    art: 'abgelehnt',
    nachfolger: ['X8', 'X5'],
    frist: ril('A'),
  },
  {
    code: 'X8',
    name: 'Abgelehnt_Vorprozess',
    phase: 'X',
    art: 'abgelehnt',
    nachfolger: ['Z0', 'X0', 'W0', 'Y0'],
    frist: keine,
  },

  // Unterjährige Anmeldung
  { code: 'Y0', name: 'Entwurf', phase: 'Y', art: 'entwurf', nachfolger: ['Y2', 'Z0'], frist: ril('X', -14) },
  {
    code: 'Y2',
    name: 'MitwirkungBBK',
    phase: 'Y',
    art: 'abstimmung',
    nachfolger: ['Y3', 'Y9'],
    frist: ril('X', -2),
    nachhaken: true,
  },
  { code: 'Y3', name: 'Zugestimmt', phase: 'Y', art: 'abstimmung', nachfolger: ['Y4', 'Y5'], frist: ril('X') },
  { code: 'Y4', name: 'Angemeldet_fristgerecht', phase: 'Y', art: 'angemeldet', nachfolger: ['Y6', 'Y9'], frist: nachhaken },
  { code: 'Y5', name: 'Angemeldet_verspätet', phase: 'Y', art: 'angemeldet', nachfolger: ['Y6', 'Y9'], frist: nachhaken },
  { code: 'Y6', name: 'Genehmigt', phase: 'Y', art: 'genehmigt', nachfolger: ['Y9', 'Y7'], frist: keine },
  { code: 'Y7', name: 'Änderung_angestoßen', phase: 'Y', art: 'aenderung', nachfolger: ['Y6', 'Y8'], frist: nachhaken },
  {
    code: 'Y8',
    name: 'Änderung_abgelehnt',
    phase: 'Y',
    art: 'abgelehnt',
    nachfolger: ['Y6'],
    frist: keine,
    bemerkung: 'Ggf. cfPeDi',
  },
  { code: 'Y9', name: 'Abgelehnt', phase: 'Y', art: 'abgelehnt', nachfolger: ['Y6', 'Z0'], frist: keine },

  // Anmeldeleichen werden komplett gelöscht
  { code: 'Z0', name: 'Anmeldeleiche', phase: 'Z', art: 'leiche', nachfolger: [], frist: keine },
];

const NACH_CODE = new Map(STATUS_WORKFLOW.map((s) => [s.code, s]));

export function statusDef(code: StatusCode): StatusDef {
  return NACH_CODE.get(code) ?? STATUS_WORKFLOW[0];
}

/** Bei der Neuanlage eines Eintrags gibt es nur diese vier Status. */
export const START_STATUS: StatusCode[] = ['V0', 'W0', 'X0', 'Y0'];

/** Der Wechsel führt in eine andere Phase – die Anmeldung wird dorthin übernommen. */
export function istUebernahme(von: StatusCode, nach: StatusCode): boolean {
  const ziel = statusDef(nach);
  return ziel.phase !== 'Z' && ziel.phase !== statusDef(von).phase;
}

/** Während einer Änderungsabstimmung sind ÄAbst-Nr und AnnexVII relevant. */
export function istAenderung(code: StatusCode): boolean {
  return statusDef(code).art === 'aenderung';
}

export function statusLabel(code: StatusCode): string {
  return `${code} · ${statusDef(code).name}`;
}

/** Reihenfolge der Phasen auf dem Weg zur Sperrpause. */
export const PHASEN_FOLGE: PhaseId[] = ['V', 'W', 'X', 'Y'];
