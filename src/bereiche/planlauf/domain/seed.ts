/**
 * Stammdaten und Demodatenbestand.
 *
 * Funktionen, Gewerke und die drei Workflows (VVBau) entsprechen der
 * vorgegebenen Aufstellung. Die Fristen sind dort nicht hinterlegt und daher
 * als Erfahrungswerte vorbelegt – sie lassen sich je Kette und je Planlauf
 * anpassen.
 */
import { addDays, today } from '../../../shared/dates';
import { aktuellerSchritt, kontaktFuerRolleUndGewerk, recalcSollDaten, stepsAusTemplate } from './engine';
import { aenderungenAufLauf, braucheNachweis, schrittStatusSetzen } from './abschluss';
import { basisplanFestlegen } from './simulation';
import {
  DATEN_VERSION,
  EIGENE_ROLLE,
  STAMMDATEN_VERSION,
  STANDARD_BEARBEITER,
  type AppData,
  type Antwort,
  type EmailTemplate,
  type ID,
  type Nachweis,
  type PlanRun,
  type ProcessTemplate,
  type ProcessTemplateStep,
  GEWERKE,
  type Role,
  type Seite,
  type StandardRolle,
  type StepType,
} from './types';

const heute = today();

/* ------------------------------------------------------------------ */
/* Funktionen                                                      */
/* ------------------------------------------------------------------ */

/** Rolle „Planer“ in den Workflows – je Gewerk besetzt. */
export const ROLLE_PLANER = 'Fachplaner';
export const ROLLE_BVB = 'Bauvorlageberechtiger';
export const ROLLE_PL = 'Projektleitung';
export const ROLLE_PSV = 'Fachtechnischer Prüfer';
export const ROLLE_PRST = 'Prüfstatiker';

/**
 * Vorlage einer Funktion. `jeGewerk` bedeutet: die Funktion wird für jedes
 * Gewerk einzeln geführt und besetzt – „Fachplaner OLA“ ist damit eine andere
 * Funktion als „Fachplaner KIB“. Sonst gilt die Funktion übergreifend.
 * `seite` ordnet die Funktion im Terminnachweis einer Seite zu.
 */
interface RollenVorlage {
  id: string;
  name: string;
  kuerzel: string;
  farbe: string;
  beschreibung: string;
  jeGewerk: boolean;
  seite: Seite | null;
}

const ROLLEN_VORLAGEN: RollenVorlage[] = [
  { id: 'srol-plm', name: EIGENE_ROLLE, kuerzel: 'PLM', farbe: '#24456e', beschreibung: 'Eigene Bearbeitung', jeGewerk: false, seite: 'plm' },
  { id: 'srol-pl', name: ROLLE_PL, kuerzel: 'PL', farbe: '#5856d6', beschreibung: '', jeGewerk: false, seite: 'auftraggeber' },
  { id: 'srol-fp', name: ROLLE_PLANER, kuerzel: 'FP', farbe: '#ff9500', beschreibung: 'Fachplanung des Gewerks', jeGewerk: true, seite: 'planer' },
  { id: 'srol-fs', name: 'Fachspezialist', kuerzel: 'FS', farbe: '#c77700', beschreibung: '', jeGewerk: true, seite: 'planer' },
  { id: 'srol-bvb', name: ROLLE_BVB, kuerzel: 'BVB', farbe: '#ff3b30', beschreibung: 'Freigabeberechtigt', jeGewerk: true, seite: 'auftraggeber' },
  { id: 'srol-an', name: 'Bau AN', kuerzel: 'AN', farbe: '#af52de', beschreibung: '', jeGewerk: true, seite: null },
  { id: 'srol-buew', name: 'Bauüberwachung', kuerzel: 'BÜW', farbe: '#00a0a0', beschreibung: '', jeGewerk: true, seite: 'auftraggeber' },
  { id: 'srol-psv', name: ROLLE_PSV, kuerzel: 'PSV', farbe: '#34c759', beschreibung: 'Planprüfer des Gewerks', jeGewerk: true, seite: 'pruefer' },
  { id: 'srol-prst', name: ROLLE_PRST, kuerzel: 'PrSt', farbe: '#248a3d', beschreibung: '', jeGewerk: true, seite: 'pruefer' },
  { id: 'srol-vep', name: 'Vermessungsprüfer', kuerzel: 'VeP', farbe: '#2a9d8f', beschreibung: '', jeGewerk: true, seite: 'pruefer' },
  { id: 'srol-erp', name: 'Erdungsprüfer', kuerzel: 'ErP', farbe: '#457b9d', beschreibung: '', jeGewerk: true, seite: 'pruefer' },
  { id: 'srol-stp', name: 'Schweißtechnischer Prüfer', kuerzel: 'StP', farbe: '#6d597a', beschreibung: '', jeGewerk: true, seite: 'pruefer' },
  { id: 'srol-kop', name: 'Korrosionsschutzprüfer', kuerzel: 'KoP', farbe: '#b56576', beschreibung: '', jeGewerk: true, seite: 'pruefer' },
  { id: 'srol-ggp', name: 'Gleisgeometrie Prüfer', kuerzel: 'GgP', farbe: '#e07a5f', beschreibung: '', jeGewerk: true, seite: 'pruefer' },
  { id: 'srol-gtp', name: 'Geotechnischer Prüfer', kuerzel: 'GtP', farbe: '#8a5a44', beschreibung: '', jeGewerk: true, seite: 'pruefer' },
];

/** Funktionen je Gewerk: aus jeder Vorlage entsteht eine Funktion pro Gewerk. */
export const STANDARD_ROLLEN: StandardRolle[] = ROLLEN_VORLAGEN.flatMap((v) => {
  const { jeGewerk, id, ...rest } = v;
  return jeGewerk
    ? GEWERKE.map((g) => ({ ...rest, id: `${id}-${g.toLowerCase()}`, gewerk: g as string | null }))
    : [{ ...rest, id, gewerk: null }];
});

/* ------------------------------------------------------------------ */
/* Workflows (VVBau)                                               */
/* ------------------------------------------------------------------ */

/** Im Zweig eines Blocks: der Zweig ist beendet, weiter nach dem Block (gespeichert als `'ende'`). */
const ZWEIGENDE = 'zweigende';

interface RohSchritt {
  /** Code laut Aufstellung, dient als Sprungziel. */
  code: string;
  name: string;
  typ: StepType;
  rolle: string;
  frist: number;
  nachweis?: Nachweis;
  /**
   * Nachfolger bei Aufgaben; fehlt er, folgt der nächste Schritt der Liste
   * (im Zweig: des Zweigs). `'ende'` beendet den Planlauf, `ZWEIGENDE` den Zweig.
   */
  next?: string;
  /** Sprungziele der Antworten einer Entscheidung „Ja“, „Nein“ und – falls angegeben – „Nachreichung“. */
  ja?: string;
  nein?: string;
  nachreichung?: string;
  /** Paralleler Block (Kennung innerhalb des Workflows) und Zweig 0 … n−1. */
  block?: string;
  zweig?: number;
}

/** Baut aus der Aufstellung einen Workflow mit eindeutigen IDs. */
function kette(id: string, name: string, beschreibung: string, roh: RohSchritt[]): ProcessTemplate {
  const sid = (code: string | undefined): ID | 'ende' | null => {
    if (code === undefined) return null;
    if (code === 'ende' || code === ZWEIGENDE) return 'ende';
    return `${id}-${code}`;
  };

  const steps: ProcessTemplateStep[] = roh.map((r) => {
    const antworten: Antwort[] =
      r.typ === 'entscheidung'
        ? [
            { id: `${id}-${r.code}-ja`, text: 'Ja', ziel: sid(r.ja), nacharbeit: false },
            { id: `${id}-${r.code}-nein`, text: 'Nein', ziel: sid(r.nein), nacharbeit: true },
            ...(r.nachreichung !== undefined
              ? [{ id: `${id}-${r.code}-nachreichung`, text: 'Nachreichung', ziel: sid(r.nachreichung), nacharbeit: true }]
              : []),
          ]
        : [];
    return {
      id: `${id}-${r.code}`,
      name: r.name,
      typ: r.typ,
      roleName: r.rolle,
      fristTage: r.frist,
      beschreibung: '',
      antworten,
      naechster: r.typ === 'entscheidung' ? null : sid(r.next),
      nachweis: r.nachweis ?? 'keine',
      // Nachfrage nach einer E-Mail wird je Schritt im Workflow gesetzt
      mailFrage: false,
      mailVorlageId: null,
      parallel: r.block !== undefined ? { block: `${id}-blk-${r.block}`, zweig: r.zweig ?? 0 } : null,
    };
  });

  return { id, projectId: null, name, beschreibung, herkunft: 'standard', steps };
}

/** Fristen als Erfahrungswerte – in der Aufstellung nicht vorgegeben. */
const F = {
  planerstellung: 10,
  formalePruefung: 3,
  weiterleitung: 1,
  bvbFreigabe: 10,
  fachpruefung: 15,
  genehmigung: 5,
  versand: 1,
  plotEinreichen: 1,
  plotAbholen: 3,
  nachreichung: 5,
  nachpruefung: 5,
};

/**
 * Versand nach der Genehmigung (alle drei Workflows): digital an Bau AN, BVB
 * und BÜW sowie der Plotauftrag parallel, danach der Postversand an Bau AN und
 * BÜW parallel. `nr` ist der erste Code.
 */
function versand(nr: number): RohSchritt[] {
  const c = (k: number) => String(nr + k);
  return [
    { code: c(0), name: 'Digitaler Versand an Bau AN', typ: 'aufgabe', rolle: EIGENE_ROLLE, frist: F.versand, block: 'versand', zweig: 0 },
    { code: c(1), name: 'Digitaler Versand an BVB', typ: 'aufgabe', rolle: EIGENE_ROLLE, frist: F.versand, block: 'versand', zweig: 1 },
    { code: c(2), name: 'Digitaler Versand an BÜW', typ: 'aufgabe', rolle: EIGENE_ROLLE, frist: F.versand, block: 'versand', zweig: 2 },
    { code: c(3), name: 'Plotauftrag einreichen', typ: 'aufgabe', rolle: EIGENE_ROLLE, frist: F.plotEinreichen, block: 'versand', zweig: 3 },
    { code: c(4), name: 'Plotauftrag abholen', typ: 'aufgabe', rolle: EIGENE_ROLLE, frist: F.plotAbholen, block: 'versand', zweig: 3 },
    { code: c(5), name: 'Postversand an Bau AN', typ: 'aufgabe', rolle: EIGENE_ROLLE, frist: F.versand, block: 'post', zweig: 0 },
    { code: c(6), name: 'Postversand an BÜW', typ: 'aufgabe', rolle: EIGENE_ROLLE, frist: F.versand, block: 'post', zweig: 1 },
  ];
}

/**
 * Nachreichung zu einer Entscheidung: der Fachplaner reicht nach, dieselbe
 * Funktion prüft bzw. gibt die Nachreichung frei. „Ja“ führt wie das „Ja“ der
 * Ausgangsentscheidung weiter, „Nein“ zur Rückmeldung an den Planer,
 * „Nachreichung“ zurück zur Nachreichung. In einem Zweig bleiben beide
 * Schritte im Zweig.
 */
function nachreichung(
  code: string,
  an: string,
  pruefung: string,
  rolle: string,
  nachweis: Nachweis,
  ja: string,
  zweig?: { block: string; zweig: number },
): RohSchritt[] {
  const nachreichungCode = `${code}.n`;
  return [
    { code: nachreichungCode, name: `Nachreichung an ${an}`, typ: 'aufgabe', rolle: ROLLE_PLANER, frist: F.nachreichung, ...zweig },
    {
      code: `${code}.np`,
      name: pruefung,
      typ: 'entscheidung',
      rolle,
      frist: F.nachpruefung,
      nachweis,
      ja,
      nein: '3.2',
      nachreichung: nachreichungCode,
      ...zweig,
    },
  ];
}

export const STANDARD_TEMPLATES: ProcessTemplate[] = [
  kette('tpl-vvbau-ohne', 'VVBau ohne Prüfstatik', 'Regelablauf ohne fachtechnische Prüfung.', [
    { code: '1', name: 'Eingang PLM', typ: 'aufgabe', rolle: ROLLE_PLANER, frist: F.planerstellung },
    { code: '2', name: 'Formale Prüfung', typ: 'entscheidung', rolle: EIGENE_ROLLE, frist: F.formalePruefung, ja: '3.1', nein: '3.2' },
    { code: '3.1', name: 'PLM an BVB zur Freigabe', typ: 'aufgabe', rolle: EIGENE_ROLLE, frist: F.weiterleitung, next: '4.1' },
    { code: '3.2', name: 'Rückmeldung an Planer', typ: 'aufgabe', rolle: EIGENE_ROLLE, frist: F.weiterleitung, next: '4.2' },
    { code: '4.1', name: 'BVB-Freigabe', typ: 'entscheidung', rolle: ROLLE_BVB, frist: F.bvbFreigabe, nachweis: 'freigabe', ja: '5', nein: '3.2', nachreichung: '4.1.n' },
    { code: '4.2', name: 'Erneute Vorlage von Planer', typ: 'aufgabe', rolle: ROLLE_PLANER, frist: F.planerstellung, next: '2' },
    ...nachreichung('4.1', 'BVB', 'Freigabe der Nachreichung', ROLLE_BVB, 'freigabe', '5'),
    { code: '5', name: 'PLM an PL zur Genehmigung', typ: 'aufgabe', rolle: EIGENE_ROLLE, frist: F.weiterleitung },
    { code: '6', name: 'Genehmigung zur Bauausführung', typ: 'aufgabe', rolle: ROLLE_PL, frist: F.genehmigung },
    ...versand(7),
  ]),

  kette('tpl-vvbau-mit', 'VVBau mit Prüfstatik', 'Ablauf mit fachtechnischer Prüfung und Prüfstatik vor der Freigabe.', [
    { code: '1', name: 'Eingang PLM', typ: 'aufgabe', rolle: ROLLE_PLANER, frist: F.planerstellung },
    { code: '2', name: 'Formale Prüfung', typ: 'entscheidung', rolle: EIGENE_ROLLE, frist: F.formalePruefung, ja: '3.1', nein: '3.2' },
    { code: '3.1', name: 'PLM an BVB zur Freigabe zur fachtechnischen Prüfung', typ: 'aufgabe', rolle: EIGENE_ROLLE, frist: F.weiterleitung, next: '4.1' },
    { code: '3.2', name: 'Rückmeldung an Planer', typ: 'aufgabe', rolle: EIGENE_ROLLE, frist: F.weiterleitung, next: '4.2' },
    { code: '4.1', name: 'BVB-Freigabe zur fachtechnischen Prüfung', typ: 'entscheidung', rolle: ROLLE_BVB, frist: F.bvbFreigabe, ja: '5', nein: '3.2', nachreichung: '4.1.n' },
    { code: '4.2', name: 'Erneute Vorlage von Planer', typ: 'aufgabe', rolle: ROLLE_PLANER, frist: F.planerstellung, next: '2' },
    ...nachreichung('4.1', 'BVB zur fachtechnischen Prüfung', 'Freigabe der Nachreichung zur fachtechnischen Prüfung', ROLLE_BVB, 'keine', '5'),
    { code: '5', name: 'PLM an Fachprüfer und Prüfstatiker', typ: 'aufgabe', rolle: EIGENE_ROLLE, frist: F.weiterleitung },
    // Fachprüfung und Prüfstatik laufen parallel; „Nein“ verlässt den Block zur Rückmeldung an den Planer
    { code: '6', name: 'Fachprüfung', typ: 'entscheidung', rolle: ROLLE_PSV, frist: F.fachpruefung, nachweis: 'pruefbericht', ja: ZWEIGENDE, nein: '3.2', nachreichung: '6.n', block: 'pruefung', zweig: 0 },
    ...nachreichung('6', 'Fachprüfer', 'Prüfung der Nachreichung', ROLLE_PSV, 'pruefbericht', ZWEIGENDE, { block: 'pruefung', zweig: 0 }),
    { code: '6.s', name: 'Prüfstatik', typ: 'entscheidung', rolle: ROLLE_PRST, frist: F.fachpruefung, nachweis: 'pruefbericht', ja: ZWEIGENDE, nein: '3.2', nachreichung: '6.s.n', block: 'pruefung', zweig: 1 },
    ...nachreichung('6.s', 'Prüfstatiker', 'Prüfung der Nachreichung', ROLLE_PRST, 'pruefbericht', ZWEIGENDE, { block: 'pruefung', zweig: 1 }),
    { code: '7', name: 'PLM an BVB zur Freigabe', typ: 'aufgabe', rolle: EIGENE_ROLLE, frist: F.weiterleitung },
    { code: '8', name: 'BVB-Freigabe', typ: 'entscheidung', rolle: ROLLE_BVB, frist: F.bvbFreigabe, nachweis: 'freigabe', ja: '9', nein: '3.2', nachreichung: '8.n' },
    ...nachreichung('8', 'BVB', 'Freigabe der Nachreichung', ROLLE_BVB, 'freigabe', '9'),
    { code: '9', name: 'PLM an PL zur Genehmigung', typ: 'aufgabe', rolle: EIGENE_ROLLE, frist: F.weiterleitung },
    { code: '10', name: 'Genehmigung zur Bauausführung', typ: 'aufgabe', rolle: ROLLE_PL, frist: F.genehmigung },
    ...versand(11),
  ]),

  kette('tpl-vvbau-ste', 'VVBau STE', 'Ablauf mit Planprüfung durch den fachtechnischen Prüfer.', [
    { code: '1', name: 'Eingang PLM', typ: 'aufgabe', rolle: ROLLE_PLANER, frist: F.planerstellung },
    { code: '2', name: 'Formale Prüfung', typ: 'entscheidung', rolle: EIGENE_ROLLE, frist: F.formalePruefung, ja: '3.1', nein: '3.2' },
    { code: '3.1', name: 'PLM an Planprüfer', typ: 'aufgabe', rolle: EIGENE_ROLLE, frist: F.weiterleitung, next: '4.1' },
    { code: '3.2', name: 'Rückmeldung an Planer', typ: 'aufgabe', rolle: EIGENE_ROLLE, frist: F.weiterleitung, next: '4.2' },
    { code: '4.1', name: 'Fachprüfung', typ: 'entscheidung', rolle: ROLLE_PSV, frist: F.fachpruefung, nachweis: 'pruefbericht', ja: '5', nein: '3.2', nachreichung: '4.1.n' },
    { code: '4.2', name: 'Erneute Vorlage von Planer', typ: 'aufgabe', rolle: ROLLE_PLANER, frist: F.planerstellung, next: '2' },
    ...nachreichung('4.1', 'Fachprüfer', 'Prüfung der Nachreichung', ROLLE_PSV, 'pruefbericht', '5'),
    { code: '5', name: 'PLM an BVB zur Freigabe', typ: 'aufgabe', rolle: EIGENE_ROLLE, frist: F.weiterleitung },
    { code: '6', name: 'BVB-Freigabe', typ: 'entscheidung', rolle: ROLLE_BVB, frist: F.bvbFreigabe, nachweis: 'freigabe', ja: '7', nein: '3.2', nachreichung: '6.n' },
    ...nachreichung('6', 'BVB', 'Freigabe der Nachreichung', ROLLE_BVB, 'freigabe', '7'),
    { code: '7', name: 'PLM an PL zur Genehmigung', typ: 'aufgabe', rolle: EIGENE_ROLLE, frist: F.weiterleitung },
    { code: '8', name: 'Genehmigung zur Bauausführung', typ: 'aufgabe', rolle: ROLLE_PL, frist: F.genehmigung },
    ...versand(9),
  ]),
];

/* ------------------------------------------------------------------ */
/* Fingerabdruck der mitgelieferten Workflows                          */
/* ------------------------------------------------------------------ */

/** cyrb53 – kurzer, stabiler Streuwert eines Textes. */
function streuwert(text: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
}

/**
 * Fingerabdruck eines Workflows: Name, Beschreibung und je Schritt
 * Bezeichnung, Art, Funktion, Frist, Nachweis, E-Mail-Einstellungen,
 * Beschreibung und die Ziele (als Listenposition, „nächster Schritt“
 * aufgelöst; Antworten mit ihrem Text). IDs und spätere Felder (Blöcke,
 * Nacharbeit) zählen nicht – so lässt sich erkennen, ob ein gespeicherter
 * Standard-Workflow noch dem mitgelieferten Stand einer Fassung entspricht.
 * Gilt für Workflows ohne parallele Blöcke (bis Stammdaten-Fassung 4).
 */
export function workflowFingerabdruck(t: Pick<ProcessTemplate, 'name' | 'beschreibung' | 'steps'>): string {
  const steps = t.steps ?? [];
  const index = new Map(steps.map((s, i) => [s.id, i]));
  const ziel = (i: number, z: ID | 'ende' | null | undefined) => {
    if (z === 'ende') return 'E';
    if (z === null || z === undefined) return i + 1 < steps.length ? String(i + 1) : 'E';
    return index.has(z) ? String(index.get(z)) : 'E';
  };
  const zeilen = steps.map((s, i) =>
    [
      (s.name ?? '').trim(),
      s.typ,
      (s.roleName ?? '').trim(),
      s.fristTage,
      s.nachweis ?? 'keine',
      s.mailFrage ? 1 : 0,
      s.mailVorlageId ?? '',
      (s.beschreibung ?? '').trim(),
      s.typ === 'entscheidung' && (s.antworten ?? []).length > 0
        ? s.antworten.map((a) => `${(a.text ?? '').trim()}>${ziel(i, a.ziel)}`).join(',')
        : `>${ziel(i, s.naechster)}`,
    ].join('|'),
  );
  return streuwert([(t.name ?? '').trim(), (t.beschreibung ?? '').trim(), ...zeilen].join('\n'));
}

/**
 * Fingerabdrücke der mitgelieferten Standard-Workflows in Stammdaten-Fassung 4
 * (vor parallelen Blöcken und Nachreichung), berechnet mit
 * `workflowFingerabdruck` aus dem damaligen Stand. Weicht ein gespeicherter
 * Standard-Workflow davon ab, wurde er selbst angepasst und bleibt beim
 * Wechsel auf Fassung 5 als eigene Kopie erhalten.
 */
export const STANDARD_FASSUNG4_FINGERABDRUCK: Record<ID, string> = {
  'tpl-vvbau-ohne': '1f5fc6b675401c',
  'tpl-vvbau-mit': '1bd0b072bcd0ce',
  'tpl-vvbau-ste': '19027a5acc299c',
};

/* ------------------------------------------------------------------ */
/* E-Mail-Vorlagen                                                     */
/* ------------------------------------------------------------------ */

export function standardVorlagen(): EmailTemplate[] {
  return [
    {
      id: 'mail-erinnerung',
      name: 'Freundliche Erinnerung',
      anlass: 'erinnerung',
      betreff: '[{{projekt.nummer}}] Erinnerung: {{schritt}} – {{plan.nummer}} (fällig {{soll}})',
      text: `{{anrede}}

im Projekt „{{projekt}}“ ({{projekt.nummer}}) steht der Prozessschritt „{{schritt}}“ für den Planlauf „{{planlauf}}“ aus.

  Plan:        {{plan.nummer}} – {{plan}}
  Gewerk:      {{plan.gewerk}}
  Ihre Rolle:  {{rolle}}
  Soll-Termin: {{soll}} ({{frist}})

Bitte geben Sie uns bis zum genannten Termin eine kurze Rückmeldung, damit der weitere Planlauf eingehalten werden kann.

Vielen Dank und freundliche Grüße
{{absender}}`,
    },
    {
      id: 'mail-ueberfaellig',
      name: 'Mahnung bei Fristüberschreitung',
      anlass: 'ueberfaellig',
      betreff: '[{{projekt.nummer}}] Überfällig seit {{verzug}} Tagen: {{schritt}} – {{plan.nummer}}',
      text: `{{anrede}}

der Prozessschritt „{{schritt}}“ im Projekt „{{projekt}}“ ({{projekt.nummer}}) ist seit {{verzug}} Tagen überfällig.

  Plan:        {{plan.nummer}} – {{plan}}
  Gewerk:      {{plan.gewerk}}
  Ihre Rolle:  {{rolle}}
  Soll-Termin: {{soll}}

Da der weitere Planlauf hiervon abhängt, bitten wir um Erledigung bis spätestens Ende dieser Woche oder um eine kurze Information, bis wann mit der Rückmeldung zu rechnen ist.

Mit freundlichen Grüßen
{{absender}}`,
    },
    {
      id: 'mail-freigabe',
      name: 'Freigabe erteilt',
      anlass: 'freigabe',
      betreff: '[{{projekt.nummer}}] Freigabe: {{plan.nummer}} – {{plan}}',
      text: `{{anrede}}

der Plan {{plan.nummer}} – {{plan}} wurde am {{heute}} freigegeben und kann der Bauausführung zugrunde gelegt werden.

Mit freundlichen Grüßen
{{absender}}`,
    },
    {
      id: 'mail-uebergabe',
      name: 'Versand / Übergabe',
      anlass: 'uebergabe',
      betreff: '[{{projekt.nummer}}] Planversand: {{plan.nummer}} – {{plan}}',
      text: `{{anrede}}

anbei erhalten Sie den Plan {{plan.nummer}} – {{plan}} aus dem Planlauf „{{planlauf}}“ zur weiteren Bearbeitung.

Wir bitten um Rückmeldung bis zum {{soll}}.

Mit freundlichen Grüßen
{{absender}}`,
    },
  ];
}

/* ------------------------------------------------------------------ */
/* Demodaten                                                           */
/* ------------------------------------------------------------------ */

/** Legt die Funktionen als Projektfunktionen an. */
function projektRollen(projectId: string): Role[] {
  return STANDARD_ROLLEN.map((r) => ({
    id: `rol-${projectId}-${r.id.replace('srol-', '')}`,
    projectId,
    name: r.name,
    kuerzel: r.kuerzel,
    farbe: r.farbe,
    beschreibung: r.beschreibung,
    gewerk: r.gewerk,
    seite: r.seite,
  }));
}

export function seedData(): AppData {
  const rollen = projektRollen('prj-1');
  /** Funktion eines Gewerks (bzw. die übergreifende Funktion) im Projekt. */
  const rolle = (kuerzel: string, gewerk: string | null = null) =>
    rollen.find((r) => r.kuerzel === kuerzel && r.gewerk === gewerk)!.id;

  const data: AppData = {
    version: DATEN_VERSION,
    stammdatenVersion: STAMMDATEN_VERSION,
    bearbeiter: { name: STANDARD_BEARBEITER, mailNachfrage: true, farbmodus: 'standard' },
    gewerke: [...GEWERKE],
    standardRollen: STANDARD_ROLLEN.map((r) => ({ ...r })),
    emailVorlagen: standardVorlagen(),
    projects: [
      {
        id: 'prj-1',
        nummer: '2026-014',
        name: 'Ausbaustrecke Nordkreuz',
        status: 'aktiv',
        markiert: true,
        beschreibung: 'Streckenausbau mit Anpassung von Oberleitung, LST und Verkehrsanlagen.',
        settings: {
          erinnerungVorlaufTage: 5,
          fristenInArbeitstagen: true,
          feiertage: [],
          absenderName: 'Planlaufmanagement Nordkreuz',
          absenderEmail: 'planlauf@example.de',
        },
      },
    ],
    roles: rollen,
    contacts: [
      // Eigener Eintrag: die angemeldete Person führt das Planlaufmanagement
      { id: 'con-plm', projectId: 'prj-1', anrede: '', vorname: 'Max', nachname: 'Mustermann', firma: EIGENE_ROLLE, email: '', telefon: '', anschrift: '', zuordnungen: [{ roleId: rolle('PLM'), gewerk: null }], notiz: '', eigen: true },
      { id: 'con-pl', projectId: 'prj-1', anrede: 'Frau', vorname: 'Sabine', nachname: 'Ortmann', firma: 'Projektleitung', email: 's.ortmann@example.de', telefon: '+49 40 123456-01', anschrift: 'Hafenstraße 12\n20359 Hamburg', zuordnungen: [{ roleId: rolle('PL'), gewerk: null }], notiz: '' , eigen: false },
      { id: 'con-fp-kib', projectId: 'prj-1', anrede: 'Frau', vorname: 'Katrin', nachname: 'Berger', firma: 'Ingenieurbüro Berger', email: 'k.berger@example.de', telefon: '+49 40 998877-12', anschrift: 'Billstraße 88\n20539 Hamburg', zuordnungen: [{ roleId: rolle('FP', 'KIB'), gewerk: 'KIB' }], notiz: 'Fachplanung Ingenieurbau' , eigen: false },
      { id: 'con-fp-lst', projectId: 'prj-1', anrede: 'Herr', vorname: 'Ali', nachname: 'Sarikaya', firma: 'LST Nord Ingenieure', email: 'sarikaya@example.de', telefon: '+49 40 998877-30', anschrift: 'Billstraße 90\n20539 Hamburg', zuordnungen: [{ roleId: rolle('FP', 'LST'), gewerk: 'LST' }], notiz: 'Fachplanung Leit- und Sicherungstechnik' , eigen: false },
      { id: 'con-fp-ola', projectId: 'prj-1', anrede: 'Herr', vorname: 'Piet', nachname: 'Osterkamp', firma: 'Osterkamp Fahrleitungsbau', email: 'p.osterkamp@example.de', telefon: '+49 4101 7788-0', anschrift: 'Industriering 9\n25436 Tornesch', zuordnungen: [{ roleId: rolle('FP', 'OLA'), gewerk: 'OLA' }], notiz: 'Fachplanung Oberleitung' , eigen: false },
      { id: 'con-bvb-kib', projectId: 'prj-1', anrede: 'Herr', vorname: 'Robert', nachname: 'Lindqvist', firma: 'Bauvorlageberechtigung Nord', email: 'r.lindqvist@example.de', telefon: '+49 40 224466-0', anschrift: 'Nordpark 1\n22415 Hamburg', zuordnungen: [{ roleId: rolle('BVB', 'KIB'), gewerk: 'KIB' }], notiz: 'Freigaben nur donnerstags' , eigen: false },
      { id: 'con-bvb-lst', projectId: 'prj-1', anrede: 'Frau', vorname: 'Marlene', nachname: 'Hoffstedt', firma: 'Bauvorlageberechtigung Nord', email: 'm.hoffstedt@example.de', telefon: '+49 40 224466-4', anschrift: 'Nordpark 1\n22415 Hamburg', zuordnungen: [{ roleId: rolle('BVB', 'LST'), gewerk: 'LST' }, { roleId: rolle('BVB', 'OLA'), gewerk: 'OLA' }], notiz: '' , eigen: false },
      { id: 'con-psv-lst', projectId: 'prj-1', anrede: 'Herr', vorname: 'Dietmar', nachname: 'Krause', firma: 'Prüfstelle Krause', email: 'd.krause@example.de', telefon: '+49 4131 309-0', anschrift: 'Am Ochsenmarkt 1\n21335 Lüneburg', zuordnungen: [{ roleId: rolle('PSV', 'LST'), gewerk: 'LST' }], notiz: 'Fachtechnische Prüfung LST' , eigen: false },
      { id: 'con-psv-kib', projectId: 'prj-1', anrede: 'Frau', vorname: 'Yuki', nachname: 'Tanaka', firma: 'Prüfstelle Tanaka', email: 'y.tanaka@example.de', telefon: '+49 40 556677-1', anschrift: 'Alsterdorfer Damm 4\n22297 Hamburg', zuordnungen: [{ roleId: rolle('PSV', 'KIB'), gewerk: 'KIB' }, { roleId: rolle('PrSt', 'KIB'), gewerk: 'KIB' }], notiz: 'Fachtechnische Prüfung und Prüfstatik KIB' , eigen: false },
      { id: 'con-erp', projectId: 'prj-1', anrede: 'Herr', vorname: 'Tobias', nachname: 'Reinhold', firma: 'Prüfstelle Erdung', email: 't.reinhold@example.de', telefon: '+49 40 445566-8', anschrift: 'Wandsbeker Chaussee 3\n22089 Hamburg', zuordnungen: [{ roleId: rolle('ErP', 'OLA'), gewerk: 'OLA' }], notiz: 'Erdungsprüfung' , eigen: false },
      { id: 'con-an', projectId: 'prj-1', anrede: 'Herr', vorname: 'Sven', nachname: 'Dallmann', firma: 'Dallmann Bau GmbH', email: 's.dallmann@example.de', telefon: '+49 4101 5566-0', anschrift: 'Gewerbepark 4\n25469 Halstenbek', zuordnungen: ['KIB', 'LST', 'OLA', 'VA'].map((g) => ({ roleId: rolle('AN', g), gewerk: g })), notiz: '' , eigen: false },
      { id: 'con-buew', projectId: 'prj-1', anrede: 'Frau', vorname: 'Heike', nachname: 'Petersen', firma: 'Bauüberwachung Nord', email: 'h.petersen@example.de', telefon: '+49 40 334455-2', anschrift: 'Nordpark 1\n22415 Hamburg', zuordnungen: ['KIB', 'LST', 'OLA', 'VA'].map((g) => ({ roleId: rolle('BÜW', g), gewerk: g })), notiz: '' , eigen: false },
    ],
    documents: [
      // Planpaket – reines Ordnungsmerkmal, ohne eigenen Planlauf
      { id: 'doc-p1', projectId: 'prj-1', kind: 'paket', parentId: null, paketId: null, nummer: 'PP-Nordkanal', titel: 'Eisenbahnüberführung Nordkanal', index: '', gewerk: 'KIB', planungsphase: 'Ausführungsplanung', eingangSoll: null, datum: null, bemerkung: 'Bündelt die Unterlagen zum Bauwerk' },
      // Planverzeichnis mit eigenem Planlauf; die Pläne laufen darin mit
      { id: 'doc-1', projectId: 'prj-1', kind: 'verzeichnis', parentId: null, paketId: 'doc-p1', nummer: 'NK-KIB-PV-001', titel: 'Planverzeichnis Überbau', index: 'C', gewerk: 'KIB', planungsphase: 'Ausführungsplanung', eingangSoll: addDays(heute, -40), datum: addDays(heute, -45), bemerkung: '' },
      { id: 'doc-1a', projectId: 'prj-1', kind: 'plan', parentId: 'doc-1', paketId: 'doc-p1', nummer: 'NK-KIB-EÜ-001-GR', titel: 'Grundriss Überbau', index: 'C', gewerk: 'KIB', planungsphase: 'Ausführungsplanung', eingangSoll: addDays(heute, -40), datum: null, bemerkung: '' },
      { id: 'doc-1b', projectId: 'prj-1', kind: 'plan', parentId: 'doc-1', paketId: 'doc-p1', nummer: 'NK-KIB-EÜ-001-SC', titel: 'Längsschnitt', index: 'C', gewerk: 'KIB', planungsphase: 'Ausführungsplanung', eingangSoll: addDays(heute, -40), datum: null, bemerkung: '' },
      // Einzelpläne mit eigenem Planlauf
      { id: 'doc-2', projectId: 'prj-1', kind: 'plan', parentId: null, paketId: 'doc-p1', nummer: 'NK-LST-SP-102', titel: 'Signallageplan Bereich Nord', index: 'B', gewerk: 'LST', planungsphase: 'Ausführungsplanung', eingangSoll: addDays(heute, -12), datum: null, bemerkung: '' },
      { id: 'doc-3', projectId: 'prj-1', kind: 'plan', parentId: null, paketId: null, nummer: 'NK-OLA-FL-210', titel: 'Fahrleitungsplan km 12,4 – 13,8', index: '', gewerk: 'OLA', planungsphase: 'Ausführungsplanung', eingangSoll: addDays(heute, 14), datum: null, bemerkung: '' },
      { id: 'doc-4', projectId: 'prj-1', kind: 'verzeichnis', parentId: null, paketId: null, nummer: 'NK-VA-PV-001', titel: 'Planverzeichnis Verkehrsanlagen', index: '02', gewerk: 'VA', planungsphase: 'Entwurfsplanung', eingangSoll: addDays(heute, 30), datum: null, bemerkung: 'Eingang angekündigt' },
    ],
    templates: STANDARD_TEMPLATES,
    runs: [],
    geloescht: [],
  };

  /*
   * Planläufe aus den Workflows erzeugen – je Gewerk mit eigenen
   * Verantwortlichen. Der Stand entsteht über die Ablauflogik selbst: die
   * jeweils anstehenden Schritte werden nacheinander mit festen Ist-Daten
   * erledigt (alle zwei Tage einer, im Regelweg). So passen Status, Eingänge
   * und Soll-Termine immer zum Workflow.
   */
  const project = data.projects[0];
  const laufAus = (template: ProcessTemplate, runId: string, documentId: string, start: string, erledigt: number) => {
    const doc = data.documents.find((d) => d.id === documentId)!;
    const kontext = { rollen, kontakte: data.contacts, gewerk: doc.gewerk, bearbeiter: STANDARD_BEARBEITER };
    const rechnen = (r: PlanRun): PlanRun => ({
      ...r,
      steps: recalcSollDaten(
        r.steps,
        r.start,
        project.settings.fristenInArbeitstagen,
        project.settings.feiertage,
        doc.eingangSoll,
        heute,
      ),
    });
    // Feste Kennungen: Schritte „<Lauf>-s1“ …, Antworten „<Lauf>-a1“ …
    let n = 0;
    const kennung = () => {
      n += 1;
      return n <= template.steps.length ? `${runId}-s${n}` : `${runId}-a${n - template.steps.length}`;
    };
    let run: PlanRun = rechnen({
      id: runId,
      projectId: project.id,
      documentId,
      templateId: template.id,
      templateName: template.name,
      name: `Planlauf ${doc.nummer}`,
      index: doc.index,
      start,
      status: 'laufend',
      abbruchGrund: null,
      abbruchDatum: null,
      abbruchArt: null,
      abbruchNeuerIndex: null,
      steps: stepsAusTemplate(
        template,
        (roleName) => kontaktFuerRolleUndGewerk(data.contacts, rollen, roleName, doc.gewerk),
        kennung,
      ),
      bemerkung: '',
      protokoll: [],
      basis: null,
    });
    run = { ...run, basis: basisplanFestlegen(run, project, doc, 'beim Anlegen festgelegt', `${start}T08:00:00.000Z`) };

    for (let k = 0; k < erledigt; k++) {
      const step = aktuellerSchritt(run);
      if (!step) break;
      const ist = addDays(start, (k + 1) * 2);
      const nummer = braucheNachweis(step, 'erledigt')
        ? `${step.nachweis === 'freigabe' ? 'FG' : 'PB'}-2026-${String(k + 1).padStart(4, '0')}`
        : undefined;
      const ergebnis = schrittStatusSetzen(run, step, 'erledigt', nummer, {
        istDatum: ist,
        heute: ist,
        zeitpunkt: `${ist}T09:00:00.000Z`,
        kontext,
      });
      if (ergebnis.art !== 'aenderung') break;
      run = rechnen(aenderungenAufLauf(run, ergebnis.aenderungen));
    }
    return run;
  };

  data.runs = [
    // Im parallelen Prüfblock: Fachprüfung und Prüfstatik laufen (überfällig)
    laufAus(STANDARD_TEMPLATES[1], 'run-1', 'doc-1', addDays(heute, -45), 5),
    laufAus(STANDARD_TEMPLATES[2], 'run-2', 'doc-2', addDays(heute, -18), 3),
    laufAus(STANDARD_TEMPLATES[0], 'run-3', 'doc-3', addDays(heute, -4), 1),
    // Planläufe starten immer mit dem Eintrag – dieser wartet noch auf den Eingang
    laufAus(STANDARD_TEMPLATES[0], 'run-4', 'doc-4', heute, 0),
  ];

  return data;
}
