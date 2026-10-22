/**
 * Workflows der baubetrieblichen Anmeldungen. Mitgeliefert wird je Phase ein
 * Standard-Workflow nach der Tabelle „Ausprägung Merkmal Status Workflow“ des
 * Lastenhefts (SKM, PzE, Vorprozess N-x, unterjährige Anmeldung). Die
 * Workflows lassen sich unter „Workflows“ anpassen, duplizieren und ergänzen.
 *
 * Der Workflow bildet bewusst nicht den Genehmigungs- und Eskalationsprozess
 * 1:1 ab, und die einzelnen Schreibtische einer Änderungsabstimmung werden nicht
 * verfolgt. Neu angelegt wird immer im ersten Status eines Workflows.
 */
import {
  ANMELDELEICHE,
  UNTERJAEHRIGE_ARTEN,
  type AnmeldungsArt,
  type FristRegel,
  type ID,
  type RilBezug,
  type StatusArt,
  type StatusZiel,
  type Workflow,
  type WorkflowStatus,
} from './types';

/* ------------------------------------------------------------------ */
/* Mitgelieferte Workflows                                             */
/* ------------------------------------------------------------------ */

const ril = (bezug: RilBezug, versatzTage = 0): FristRegel => ({ typ: 'ril', bezug, versatzTage });
const keine: FristRegel = { typ: 'keine' };
const nachhakTermin = (tage: number): FristRegel => ({ typ: 'nachhaken', tage });

/** Nachhak-Termin der mitgelieferten Status („Nachhak-Termin!?“ im Lastenheft). */
const NACHHAK_TAGE = 21;

const status = (
  id: ID,
  name: string,
  art: StatusArt,
  frist: FristRegel,
  nachfolger: StatusZiel[],
  zusatz: Partial<Pick<WorkflowStatus, 'nachhaken' | 'bemerkung'>> = {},
): WorkflowStatus => ({
  id,
  name,
  art,
  frist,
  nachfolger,
  nachhaken: zusatz.nachhaken ?? frist.typ === 'nachhaken',
  bemerkung: zusatz.bemerkung ?? '',
});

/**
 * Die vier Standard-Workflows. Die Kennungen sind fest, damit ältere Stände
 * (Statusnummern V0 … Y9) zugeordnet werden können (`STATUS_AUS_NUMMER`).
 */
export function standardWorkflows(): Workflow[] {
  return [
    {
      id: 'wf-skm',
      name: 'SKM',
      kurz: 'SKM',
      beschreibung: 'Noch keine Anmeldung – Sammeleintrag nach Begriffen/tVE-Nr, Bauzeitraum ganzes Fahrplanjahr.',
      herkunft: 'standard',
      bauzeitraum: 'fahrplanjahr',
      arten: ['SKM'],
      status: [
        status('skm-entwurf', 'Entwurf', 'entwurf', ril('skm'), ['skm-angemeldet', ANMELDELEICHE]),
        status('skm-angemeldet', 'Angemeldet', 'angemeldet', { typ: 'stichtag', tag: 1, monat: 8 }, [
          'skm-genehmigt',
          'skm-abgelehnt',
        ], { nachhaken: true }),
        status('skm-genehmigt', 'Genehmigt', 'genehmigt', ril('pze'), ['pze-entwurf']),
        status('skm-abgelehnt', 'Abgelehnt', 'abgelehnt', keine, [ANMELDELEICHE, 'skm-entwurf', 'pze-entwurf']),
      ],
    },
    {
      id: 'wf-pze',
      name: 'PzE',
      kurz: 'PzE',
      beschreibung: 'Noch keine Anmeldung – Sammeleintrag nach Begriffen/tVE-Nr, Bauzeitraum ganzes Fahrplanjahr.',
      herkunft: 'standard',
      bauzeitraum: 'fahrplanjahr',
      arten: ['PzE'],
      status: [
        status('pze-entwurf', 'Entwurf', 'entwurf', ril('pze'), ['pze-angemeldet', ANMELDELEICHE]),
        status('pze-angemeldet', 'Angemeldet', 'angemeldet', { typ: 'stichtag', tag: 31, monat: 7 }, [
          'pze-genehmigt',
          'pze-abgelehnt',
        ], { nachhaken: true }),
        status('pze-genehmigt', 'Genehmigt', 'genehmigt', ril('N-2'), ['vp-entwurf']),
        status('pze-abgelehnt', 'Abgelehnt', 'abgelehnt', keine, [
          ANMELDELEICHE,
          'skm-entwurf',
          'pze-entwurf',
          'vp-entwurf',
        ]),
      ],
    },
    {
      id: 'wf-vorprozess',
      name: 'Vorprozess N-x',
      kurz: 'Vorprozess',
      beschreibung:
        'Anmeldung im Vorprozess N-2 bzw. N-1, tagesscharf, mit Mitwirkung der BBK. Annahme: Anmeldungen in den Vorprozessen erfolgen immer fristgerecht.',
      herkunft: 'standard',
      bauzeitraum: 'tagesscharf',
      arten: ['A_Vor_N-2', 'A_Vor_N-1'],
      status: [
        status('vp-entwurf', 'Entwurf', 'entwurf', ril('Nx', -14), ['vp-mitwirkung', ANMELDELEICHE]),
        status('vp-mitwirkung', 'Mitwirkung BBK', 'abstimmung', ril('Nx', -2), ['vp-zugestimmt', 'vp-abgelehnt'], {
          nachhaken: true,
        }),
        status('vp-zugestimmt', 'Zugestimmt', 'abstimmung', ril('Nx'), ['vp-angemeldet']),
        status('vp-angemeldet', 'Angemeldet (fristgerecht)', 'angemeldet', nachhakTermin(NACHHAK_TAGE), [
          'vp-genehmigt',
          'vp-abgelehnt',
        ]),
        status('vp-genehmigt', 'Genehmigt', 'genehmigt', ril('A'), ['vp-aenderung', 'vp-genehmigt', 'uj-angemeldet']),
        status('vp-aenderung', 'Änderung angemeldet', 'aenderung', nachhakTermin(NACHHAK_TAGE), [
          'vp-genehmigt',
          'vp-aenderung-abgelehnt',
        ]),
        status('vp-aenderung-abgelehnt', 'Änderung abgelehnt', 'abgelehnt', ril('A'), ['vp-abgelehnt', 'vp-genehmigt']),
        status('vp-abgelehnt', 'Abgelehnt', 'abgelehnt', keine, [
          ANMELDELEICHE,
          'vp-entwurf',
          'pze-entwurf',
          'uj-entwurf',
        ]),
      ],
    },
    {
      id: 'wf-unterjahr',
      name: 'Unterjährige Anmeldung',
      kurz: 'Unterjahr',
      beschreibung: 'Anmeldung je Maßnahme (A, B(0), B(S), B, C, Container), tagesscharf, mit Mitwirkung der BBK.',
      herkunft: 'standard',
      bauzeitraum: 'tagesscharf',
      arten: [...UNTERJAEHRIGE_ARTEN],
      status: [
        status('uj-entwurf', 'Entwurf', 'entwurf', ril('X', -14), ['uj-mitwirkung', ANMELDELEICHE]),
        status('uj-mitwirkung', 'Mitwirkung BBK', 'abstimmung', ril('X', -2), ['uj-zugestimmt', 'uj-abgelehnt'], {
          nachhaken: true,
        }),
        status('uj-zugestimmt', 'Zugestimmt', 'abstimmung', ril('X'), ['uj-angemeldet', 'uj-verspaetet']),
        status('uj-angemeldet', 'Angemeldet (fristgerecht)', 'angemeldet', nachhakTermin(NACHHAK_TAGE), [
          'uj-genehmigt',
          'uj-abgelehnt',
        ]),
        status('uj-verspaetet', 'Angemeldet (verspätet)', 'verspaetet', nachhakTermin(NACHHAK_TAGE), [
          'uj-genehmigt',
          'uj-abgelehnt',
        ]),
        status('uj-genehmigt', 'Genehmigt', 'genehmigt', keine, ['uj-abgelehnt', 'uj-aenderung']),
        status('uj-aenderung', 'Änderung angestoßen', 'aenderung', nachhakTermin(NACHHAK_TAGE), [
          'uj-genehmigt',
          'uj-aenderung-abgelehnt',
        ]),
        status('uj-aenderung-abgelehnt', 'Änderung abgelehnt', 'abgelehnt', keine, ['uj-genehmigt'], {
          bemerkung: 'Ggf. cfPeDi',
        }),
        status('uj-abgelehnt', 'Abgelehnt', 'abgelehnt', keine, ['uj-genehmigt', ANMELDELEICHE]),
      ],
    },
  ];
}

/**
 * Zuordnung der Statusnummern früherer Fassungen (V0 … Y9) zu den Status der
 * Standard-Workflows – für die Migration gespeicherter Stände.
 */
export const STATUS_AUS_NUMMER: Record<string, ID> = {
  V0: 'skm-entwurf',
  V2: 'skm-angemeldet',
  V3: 'skm-genehmigt',
  V4: 'skm-abgelehnt',
  W0: 'pze-entwurf',
  W2: 'pze-angemeldet',
  W3: 'pze-genehmigt',
  W4: 'pze-abgelehnt',
  X0: 'vp-entwurf',
  X2: 'vp-mitwirkung',
  X3: 'vp-zugestimmt',
  X4: 'vp-angemeldet',
  X5: 'vp-genehmigt',
  X6: 'vp-aenderung',
  X7: 'vp-aenderung-abgelehnt',
  X8: 'vp-abgelehnt',
  Y0: 'uj-entwurf',
  Y2: 'uj-mitwirkung',
  Y3: 'uj-zugestimmt',
  Y4: 'uj-angemeldet',
  Y5: 'uj-verspaetet',
  Y6: 'uj-genehmigt',
  Y7: 'uj-aenderung',
  Y8: 'uj-aenderung-abgelehnt',
  Y9: 'uj-abgelehnt',
};

/* ------------------------------------------------------------------ */
/* Nachschlagen                                                        */
/* ------------------------------------------------------------------ */

export interface StatusInfo {
  workflow: Workflow;
  status: WorkflowStatus;
  /** Position im Workflow (0 = Startstatus). */
  index: number;
}

export function statusInfo(workflows: Workflow[], statusId: ID | null): StatusInfo | null {
  if (!statusId) return null;
  for (const workflow of workflows) {
    const index = workflow.status.findIndex((s) => s.id === statusId);
    if (index >= 0) return { workflow, status: workflow.status[index], index };
  }
  return null;
}

/** Ersatz, falls ein Status fehlt (beschädigter Bestand): Status ohne Nachfolger und Frist. */
const UNBEKANNT_WORKFLOW: Workflow = {
  id: 'wf-unbekannt',
  name: 'Unbekannter Workflow',
  kurz: '?',
  beschreibung: '',
  herkunft: 'manuell',
  bauzeitraum: 'tagesscharf',
  arten: [],
  status: [],
};

/** Status einer Anmeldung; ein nicht (mehr) vorhandener Status erscheint als „unbekannt“. */
export function statusVon(workflows: Workflow[], statusId: ID): StatusInfo {
  return (
    statusInfo(workflows, statusId) ?? {
      workflow: UNBEKANNT_WORKFLOW,
      status: {
        id: statusId,
        name: 'Unbekannter Status',
        art: 'entwurf',
        frist: keine,
        nachhaken: false,
        bemerkung: '',
        nachfolger: [],
      },
      index: -1,
    }
  );
}

/** „PzE · Angemeldet“ */
export function statusText(info: Pick<StatusInfo, 'workflow' | 'status'>): string {
  return `${info.workflow.kurz || info.workflow.name} · ${info.status.name}`;
}

/** Text eines Wechselziels, z. B. für den Statusverlauf. */
export function zielText(workflows: Workflow[], ziel: StatusZiel): string {
  if (ziel === ANMELDELEICHE) return 'Anmeldeleiche';
  const info = statusInfo(workflows, ziel);
  return info ? statusText(info) : 'Unbekannter Status';
}

/** Nachfolger eines Status, soweit es sie (noch) gibt. */
export function nachfolgerVon(workflows: Workflow[], statusId: ID): StatusZiel[] {
  const info = statusInfo(workflows, statusId);
  if (!info) return [];
  return info.status.nachfolger.filter((z) => z === ANMELDELEICHE || statusInfo(workflows, z) !== null);
}

/** Der Wechsel führt in einen anderen Workflow – die Anmeldung wird in die neue Phase übernommen. */
export function istUebernahme(workflows: Workflow[], von: ID, nach: StatusZiel): boolean {
  if (nach === ANMELDELEICHE) return false;
  const ziel = statusInfo(workflows, nach);
  return !!ziel && ziel.workflow.id !== statusInfo(workflows, von)?.workflow.id;
}

/** Während einer Änderungsabstimmung sind ÄAbst-Nr und AnnexVII relevant. */
export function istAenderung(workflows: Workflow[], statusId: ID | null): boolean {
  return statusInfo(workflows, statusId)?.status.art === 'aenderung';
}

/** Workflow, dessen Anmeldungs-Arten die Art enthalten – etwa für die Neuanlage aus dem Anmeldebedarf. */
export function workflowFuerArt(workflows: Workflow[], art: AnmeldungsArt): Workflow | undefined {
  return workflows.find((w) => w.status.length > 0 && w.arten.includes(art));
}

/** Workflows, in denen neu angelegt werden kann – jeder mit mindestens einem Status. */
export function startbareWorkflows(workflows: Workflow[]): Workflow[] {
  return workflows.filter((w) => w.status.length > 0);
}
