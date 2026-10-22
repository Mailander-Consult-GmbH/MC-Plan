/**
 * Datenmodell des Bereichs „Baubetriebsplanung“: Projekthüllen und die
 * baubetrieblichen Anmeldungen für Sperrpausen, die einen festen
 * Status-Workflow durchlaufen (Grundlage: Lastenheft „Laufender Baubetrieb –
 * grober Monitor“ der Anwender).
 *
 * Flache Listen, Verweise über IDs – wie im Planlaufmanagement, aber
 * vollständig davon getrennt.
 */
import type { ISODate } from '../../../shared/dates';

export type { ISODate };
export type ID = string;

/**
 * Fassung des gespeicherten Bestands. Erhöhen, sobald `migriere()` in
 * `store/storage.ts` ältere Stände anheben muss.
 */
export const DATEN_VERSION = 2;

/** Name, solange niemand unter „Angemeldet als“ eingetragen ist. */
export const STANDARD_BEARBEITER = 'Bearbeitung MIC';

export type Farbmodus = 'standard' | 'kontrast';

/* ------------------------------------------------------------------ */
/* Phasen, Anmeldungs-Arten, AnnexVII                                  */
/* ------------------------------------------------------------------ */

/**
 * Prozessphasen – benannt nach dem Buchstaben der Statusnummer. Z steht für
 * die Anmeldeleiche, die gelöscht wird.
 */
export type PhaseId = 'V' | 'W' | 'X' | 'Y' | 'Z';

/** Phasen, in denen eine Anmeldung tatsächlich steht. */
export type ArbeitsPhase = Exclude<PhaseId, 'Z'>;

export interface Phase {
  id: ArbeitsPhase;
  name: string;
  kurz: string;
  beschreibung: string;
}

export const PHASEN: Phase[] = [
  {
    id: 'V',
    name: 'SKM',
    kurz: 'SKM',
    beschreibung: 'Noch keine Anmeldung – Sammeleintrag nach Begriffen/tVE-Nr, Bauzeitraum ganzes Fahrplanjahr.',
  },
  {
    id: 'W',
    name: 'PzE',
    kurz: 'PzE',
    beschreibung: 'Noch keine Anmeldung – Sammeleintrag nach Begriffen/tVE-Nr, Bauzeitraum ganzes Fahrplanjahr.',
  },
  {
    id: 'X',
    name: 'Vorprozess N-x',
    kurz: 'Vorprozess',
    beschreibung: 'Anmeldung im Vorprozess N-2 bzw. N-1, tagesscharf, mit Mitwirkung der BBK.',
  },
  {
    id: 'Y',
    name: 'Unterjährige Anmeldung',
    kurz: 'Unterjahr',
    beschreibung: 'Anmeldung je Maßnahme (A, B(0), B(S), B, C, Container), tagesscharf, mit Mitwirkung der BBK.',
  },
];

export const PHASE_NAME: Record<PhaseId, string> = {
  V: 'SKM',
  W: 'PzE',
  X: 'Vorprozess N-x',
  Y: 'Unterjährige Anmeldung',
  Z: 'Anmeldeleiche',
};

export type AnmeldungsArt =
  | 'SKM'
  | 'PzE'
  | 'A_Vor_N-2'
  | 'A_Vor_N-1'
  | 'A_unterjahr'
  | 'B(0)'
  | 'B(S)'
  | 'B'
  | 'C'
  | 'Container';

/** Zulässige Anmeldungs-Arten je Phase; die erste ist die Vorgabe. */
export const ARTEN_JE_PHASE: Record<ArbeitsPhase, AnmeldungsArt[]> = {
  V: ['SKM'],
  W: ['PzE'],
  X: ['A_Vor_N-2', 'A_Vor_N-1'],
  Y: ['A_unterjahr', 'B(0)', 'B(S)', 'B', 'C', 'Container'],
};

/** Phase, zu der eine Anmeldungs-Art gehört. */
export function phaseDerArt(art: AnmeldungsArt): ArbeitsPhase {
  return (Object.keys(ARTEN_JE_PHASE) as ArbeitsPhase[]).find((p) => ARTEN_JE_PHASE[p].includes(art)) ?? 'Y';
}

/**
 * In SKM und PzE gibt es noch keine Anmeldungen: Der Bauzeitraum umfasst das
 * ganze Fahrplanjahr, statt einer Anmelde-ID steht ein Begriff bzw. die tVE-Nr.
 */
export function phaseMitFahrplanjahr(phase: PhaseId): boolean {
  return phase === 'V' || phase === 'W';
}

export type AnnexVIIGrund =
  | 'ausserhalbKontrolle'
  | 'anlagemangel'
  | 'kosten'
  | 'schatten'
  | 'prozessphase'
  | 'zustimmung';

export const ANNEX_VII: { id: AnnexVIIGrund; label: string; selten?: boolean }[] = [
  { id: 'ausserhalbKontrolle', label: 'Außerhalb Kontrolle DB' },
  { id: 'anlagemangel', label: 'Anlagemangel / sicherer Betrieb' },
  { id: 'kosten', label: 'Wesentlich höhere Kosten' },
  { id: 'schatten', label: 'Vollständig im Schatten' },
  // Laut Lastenheft nur der Vollständigkeit halber – in der Praxis so gut wie nie
  { id: 'prozessphase', label: 'Entspricht Prozessphase', selten: true },
  { id: 'zustimmung', label: 'Zustimmung EVU/EIU', selten: true },
];

export const ANNEX_VII_LABEL = Object.fromEntries(ANNEX_VII.map((a) => [a.id, a.label])) as Record<
  AnnexVIIGrund,
  string
>;

/* ------------------------------------------------------------------ */
/* Status-Workflow                                                     */
/* ------------------------------------------------------------------ */

export type StatusCode =
  | 'V0' | 'V2' | 'V3' | 'V4'
  | 'W0' | 'W2' | 'W3' | 'W4'
  | 'X0' | 'X2' | 'X3' | 'X4' | 'X5' | 'X6' | 'X7' | 'X8'
  | 'Y0' | 'Y2' | 'Y3' | 'Y4' | 'Y5' | 'Y6' | 'Y7' | 'Y8' | 'Y9'
  | 'Z0';

/** Art eines Status – steuert Farbe und Bedeutung in der Oberfläche. */
export type StatusArt = 'entwurf' | 'abstimmung' | 'angemeldet' | 'genehmigt' | 'abgelehnt' | 'aenderung' | 'leiche';

/**
 * Bezug einer Terminfrist auf die Richtlinie, wie im Lastenheft benannt:
 * Ril_skm, Ril_pze, Ril_N-2, Ril_Nx (N-2 oder N-1 nach Anmeldungs-Art),
 * Ril_A und Ril_X (je nach Maßnahme).
 */
export type RilBezug = 'skm' | 'pze' | 'N-2' | 'Nx' | 'A' | 'X';

/** Terminfrist, die eine Anmeldung in einem Status einhalten soll. */
export type FristRegel =
  /** „.-.“ – keine Frist */
  | { typ: 'keine' }
  /** Frist laut Richtlinie, ggf. mit Versatz in Kalendertagen (−14 für „Ril_X – 14 Tage“) */
  | { typ: 'ril'; bezug: RilBezug; versatzTage: number }
  /** „Nächster 1.8.“ – der nächste Stichtag ab dem Statuswechsel */
  | { typ: 'stichtag'; tag: number; monat: number }
  /** „Nachhak-Termin!?“ – Statuswechsel plus Nachhakfrist aus den Einstellungen */
  | { typ: 'nachhaken' };

export interface StatusDef {
  code: StatusCode;
  /** Bezeichnung wie im Lastenheft. */
  name: string;
  phase: PhaseId;
  art: StatusArt;
  /** Mögliche Nachfolge-Status – nur diese stehen zur Auswahl. */
  nachfolger: StatusCode[];
  frist: FristRegel;
  /** Der Termin dient zum Nachhaken („Zum Nachhaken“). */
  nachhaken?: boolean;
  /** Bemerkung aus dem Lastenheft. */
  bemerkung?: string;
}

/* ------------------------------------------------------------------ */
/* Richtlinienfristen                                                  */
/* ------------------------------------------------------------------ */

/** Einzelne Fristen laut Richtlinie: je Prozessphase bzw. je Maßnahme. */
export type RilSchluessel = 'skm' | 'pze' | 'N-2' | 'N-1' | 'A' | 'B(0)' | 'B(S)' | 'B' | 'C' | 'Container';

export const RIL_SCHLUESSEL: RilSchluessel[] = ['skm', 'pze', 'N-2', 'N-1', 'A', 'B(0)', 'B(S)', 'B', 'C', 'Container'];

export const RIL_LABEL: Record<RilSchluessel, string> = {
  skm: 'SKM',
  pze: 'PzE',
  'N-2': 'Vorprozess N-2',
  'N-1': 'Vorprozess N-1',
  A: 'Maßnahme A',
  'B(0)': 'Maßnahme B(0)',
  'B(S)': 'Maßnahme B(S)',
  B: 'Maßnahme B',
  C: 'Maßnahme C',
  Container: 'Container',
};

/**
 * Berechnungsweise einer Richtlinienfrist: als Stichtag TT.MM. im Jahr
 * N − k (N = Fahrplanjahr der Anmeldung) oder als Wochen vor Baubeginn.
 */
export interface RilFrist {
  bezug: 'stichtag' | 'baubeginn';
  tag: number;
  monat: number;
  jahreVorher: number;
  wochenVorher: number;
  /** Vorbelegter Wert, der noch nicht mit der Richtlinie abgeglichen ist. */
  platzhalter: boolean;
}

/* ------------------------------------------------------------------ */
/* Bestand                                                             */
/* ------------------------------------------------------------------ */

export type ProjektStatus = 'aktiv' | 'pausiert' | 'abgeschlossen';

export const PROJEKT_STATUS_LABEL: Record<ProjektStatus, string> = {
  aktiv: 'Aktiv',
  pausiert: 'Betreuungspause',
  abgeschlossen: 'Abgeschlossen',
};

/** Prozessphase, auf die sich der erste Anmeldetermin bezieht. */
export type ErstePhase = 'skm' | 'pze' | 'N-2' | 'N-1' | 'unterjahr';

export const ERSTE_PHASE_LABEL: Record<ErstePhase, string> = {
  skm: 'SKM',
  pze: 'PzE',
  'N-2': 'Vorprozess N-2',
  'N-1': 'Vorprozess N-1',
  unterjahr: 'Unterjährig',
};

/** Projekthülle – wird bei der MIC-Beauftragung angelegt. */
export interface Projekt {
  id: ID;
  /** Kurzbezeichnung der Baumaßnahme für Listen und Seitenleiste. */
  name: string;
  projektleiter: string;
  dbGNummer: string;
  /** Erster Anmeldetermin (ca.-Wert, je nach Prozessphase laut Richtlinie). */
  ersterAnmeldetermin: ISODate | null;
  erstePhase: ErstePhase;
  bauzeitVon: ISODate | null;
  /** Ende der Bauzeit – in der Regel Inbetriebnahme + 4 Wochen. */
  bauzeitBis: ISODate | null;
  inbetriebnahme: ISODate | null;
  hauptbearbeiter: string;
  /** MIC-Projektnummer (wiko). */
  projektnummer: string;
  status: ProjektStatus;
  markiert: boolean;
  bemerkung: string;
}

/** Eintrag im Statusverlauf einer Anmeldung. */
export interface VerlaufEintrag {
  id: ID;
  typ: 'anlage' | 'wechsel' | 'notiz';
  /** Datum des Ereignisses (fachlich, frei wählbar). */
  datum: ISODate;
  /** Zeitpunkt der Erfassung. */
  erfasst: string;
  bearbeiter: string;
  von: StatusCode | null;
  nach: StatusCode | null;
  text: string;
  /** ÄAbst-Nr und AnnexVII einer abgeschlossenen Änderungsabstimmung. */
  aenderungsNr?: string;
  annexVII?: AnnexVIIGrund | null;
  /** Stand vor dem Wechsel – zum Zurücknehmen. */
  vorher?: AnmeldungStand;
}

/** Felder, die ein Statuswechsel ändern kann. */
export interface AnmeldungStand {
  status: StatusCode;
  statusSeit: ISODate;
  art: AnmeldungsArt;
  anmeldeId: string;
  bauVon: ISODate | null;
  bauBis: ISODate | null;
  fahrplanjahr: number | null;
  aenderungsNr: string;
  annexVII: AnnexVIIGrund | null;
  terminManuell: ISODate | null;
}

/** Baubetriebliche Anmeldung – eine „Zeile“ in der Projekthülle. */
export interface Anmeldung extends AnmeldungStand {
  id: ID;
  projektId: ID;
  /** Bf/Strecke in Stichworten. */
  bfStrecke: string;
  /** Gewerk/Tätigkeit in Stichworten. */
  gewerk: string;
  bemerkung: string;
  /** Eintrag, aus dessen Aufteilung diese Anmeldung bei der Übernahme entstand. */
  herkunftId: ID | null;
  verlauf: VerlaufEintrag[];
}

export interface Einstellungen {
  farbmodus: Farbmodus;
  bearbeiter: string;
  /** Ab so vielen Tagen vor der Terminfrist gilt eine Anmeldung als fällig. */
  vorlaufTage: number;
  /** Nachhak-Termin in Status ohne Richtlinienfrist: Tage nach dem Statuswechsel. */
  nachhakTage: number;
  /** Anmeldebedarf der Projekthüllen: so viele Tage im Voraus anzeigen. */
  bedarfVorschauTage: number;
  rilFristen: Record<RilSchluessel, RilFrist>;
}

export interface BaubetriebDaten {
  version: number;
  einstellungen: Einstellungen;
  projekte: Projekt[];
  anmeldungen: Anmeldung[];
}
