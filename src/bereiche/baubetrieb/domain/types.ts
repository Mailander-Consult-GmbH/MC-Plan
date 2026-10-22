/**
 * Datenmodell des Bereichs „Baubetriebsplanung“: Projekte (im Lastenheft
 * „Projekthülle“) und die baubetrieblichen Anmeldungen für Sperrpausen. Jede
 * Anmeldung steht in einem Status eines Workflows; die Workflows sind – wie im
 * Planlaufmanagement – bearbeitbar (Grundlage: Lastenheft „Laufender
 * Baubetrieb – grober Monitor“ der Anwender).
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
export const DATEN_VERSION = 4;

/** Name, solange niemand unter „Angemeldet als“ eingetragen ist. */
export const STANDARD_BEARBEITER = 'Bearbeitung MIC';

export type Farbmodus = 'standard' | 'kontrast';

/* ------------------------------------------------------------------ */
/* Maßnahmenarten, AnnexVII                                            */
/* ------------------------------------------------------------------ */

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

export const ALLE_ARTEN: AnmeldungsArt[] = [
  'SKM',
  'PzE',
  'A_Vor_N-2',
  'A_Vor_N-1',
  'A_unterjahr',
  'B(0)',
  'B(S)',
  'B',
  'C',
  'Container',
];

/** Arten der unterjährigen Anmeldung – für sie gilt Ril_X je nach Maßnahme. */
export const UNTERJAEHRIGE_ARTEN: AnmeldungsArt[] = ['A_unterjahr', 'B(0)', 'B(S)', 'B', 'C', 'Container'];

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
/* Workflows                                                           */
/* ------------------------------------------------------------------ */

/** Art eines Status – steuert Farbe und Bedeutung in der Oberfläche. */
export type StatusArt =
  | 'entwurf'
  | 'abstimmung'
  | 'angemeldet'
  | 'verspaetet'
  | 'genehmigt'
  | 'abgelehnt'
  | 'aenderung';

export const STATUS_ART_LABEL: Record<StatusArt, string> = {
  entwurf: 'Entwurf',
  abstimmung: 'In Abstimmung',
  angemeldet: 'Angemeldet',
  verspaetet: 'Angemeldet (verspätet)',
  genehmigt: 'Genehmigt',
  abgelehnt: 'Abgelehnt',
  aenderung: 'Änderungsabstimmung',
};

/**
 * Bezug einer Terminfrist auf die Richtlinie, wie im Lastenheft benannt:
 * Ril_skm, Ril_pze, Ril_N-2, Ril_Nx (N-2 oder N-1 nach Maßnahmenart),
 * Ril_A und Ril_X (je nach Maßnahme).
 */
export type RilBezug = 'skm' | 'pze' | 'N-2' | 'Nx' | 'A' | 'X';

export const RIL_BEZUG_LABEL: Record<RilBezug, string> = {
  skm: 'SKM (Ril_skm)',
  pze: 'PzE (Ril_pze)',
  'N-2': 'Vorprozess N-2 (Ril_N-2)',
  Nx: 'Vorprozess N-2/N-1 je nach Art (Ril_Nx)',
  A: 'Maßnahme A (Ril_A)',
  X: 'je nach Maßnahme (Ril_X)',
};

/** Terminfrist, die eine Anmeldung in einem Status einhalten soll. */
export type FristRegel =
  /** „.-.“ – keine Frist */
  | { typ: 'keine' }
  /** Frist laut Richtlinie, ggf. mit Versatz in Kalendertagen (−14 für „Ril_X – 14 Tage“) */
  | { typ: 'ril'; bezug: RilBezug; versatzTage: number }
  /** „Nächster 1.8.“ – der nächste Stichtag ab dem Statuswechsel */
  | { typ: 'stichtag'; tag: number; monat: number }
  /** Nachhak-Termin: so viele Tage nach dem Statuswechsel */
  | { typ: 'nachhaken'; tage: number };

export type FristTyp = FristRegel['typ'];

export const FRIST_TYP_LABEL: Record<FristTyp, string> = {
  keine: 'Keine Terminfrist',
  ril: 'Frist laut Richtlinie',
  stichtag: 'Nächster Stichtag (TT.MM.)',
  nachhaken: 'Nachhak-Termin nach Statuswechsel',
};

/** Ziel eines Statuswechsels, das den Eintrag als Anmeldeleiche löscht. */
export const ANMELDELEICHE = 'anmeldeleiche';

/**
 * Ziel eines Statuswechsels: die ID eines Status – auch eines Status in einem
 * anderen Workflow (Übernahme in eine neue Phase) – oder `ANMELDELEICHE`.
 */
export type StatusZiel = ID;

export interface WorkflowStatus {
  id: ID;
  name: string;
  art: StatusArt;
  frist: FristRegel;
  /** Der Termin dient zum Nachhaken („Zum Nachhaken“). */
  nachhaken: boolean;
  bemerkung: string;
  /** Mögliche Nachfolger – nur diese stehen beim Statuswechsel zur Wahl. */
  nachfolger: StatusZiel[];
}

/**
 * In SKM und PzE gibt es noch keine Anmeldungen: Der Sperrzeitraum umfasst das
 * ganze Fahrplanjahr, statt einer Anmelde-ID steht ein Begriff bzw. die tVE-Nr.
 */
export type BauzeitraumModus = 'fahrplanjahr' | 'tagesscharf';

export const BAUZEITRAUM_LABEL: Record<BauzeitraumModus, string> = {
  fahrplanjahr: 'Ganzes Fahrplanjahr',
  tagesscharf: 'Tagesscharf (von – bis)',
};

/**
 * Workflow einer Phase. Eine Anmeldung durchläuft die Status eines Workflows
 * und wird über einen Nachfolger in einem anderen Workflow in die nächste
 * Phase übernommen. Neu angelegt wird immer im ersten Status.
 */
export interface Workflow {
  id: ID;
  name: string;
  /** Kurzbezeichnung für Listen und Kennzeichen, z. B. „PzE“. */
  kurz: string;
  beschreibung: string;
  herkunft: 'standard' | 'manuell';
  bauzeitraum: BauzeitraumModus;
  /** Zulässige Maßnahmenarten; die erste ist die Vorgabe. */
  arten: AnmeldungsArt[];
  /** Status in ihrer Reihenfolge; der erste ist der Startstatus. */
  status: WorkflowStatus[];
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
 * N − k (N = Fahrplanjahr der Anmeldung) oder als Wochen vor Sperrbeginn.
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

/** Projekt (im Lastenheft „Projekthülle“) – wird bei der MIC-Beauftragung angelegt. */
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
  /** Ende der geplanten Sperrzeit – in der Regel Inbetriebnahme + 4 Wochen. */
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
  von: ID | null;
  nach: ID | null;
  /**
   * Workflow und Status zum Zeitpunkt des Eintrags, z. B. „PzE · Angemeldet“ –
   * bleibt lesbar, auch wenn der Workflow später geändert wird.
   */
  vonText: string;
  nachText: string;
  text: string;
  /** ÄAbst-Nr und AnnexVII einer abgeschlossenen Änderungsabstimmung. */
  aenderungsNr?: string;
  annexVII?: AnnexVIIGrund | null;
  /** Stand vor dem Wechsel – zum Zurücknehmen. */
  vorher?: AnmeldungStand;
}

/** Felder, die ein Statuswechsel ändern kann. */
export interface AnmeldungStand {
  statusId: ID;
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

/** Baubetriebliche Anmeldung – eine „Zeile“ im Projekt. */
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
  /** Vorgabe für Nachhak-Termine: neue Status im Editor und „Nachgehakt …“. */
  nachhakTage: number;
  /** Anmeldebedarf der Projekte: so viele Tage im Voraus anzeigen. */
  bedarfVorschauTage: number;
  rilFristen: Record<RilSchluessel, RilFrist>;
}

export interface BaubetriebDaten {
  version: number;
  einstellungen: Einstellungen;
  workflows: Workflow[];
  projekte: Projekt[];
  anmeldungen: Anmeldung[];
}
