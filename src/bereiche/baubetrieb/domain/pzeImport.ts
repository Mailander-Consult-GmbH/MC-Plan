/**
 * Import der Vorhaben aus PzE – SKM und MKM. Gelesen wird der Excel-Export der
 * „Vorhaben Übersicht“ aus PzE; die Spalten erkennt der Import an ihren
 * Überschriften („Bezeichnung“, „Enthaltene Fahrplanjahre“ …).
 *
 * PzE kennt keinen Status: Der Import legt nur an – Anmeldungen und Projekte –
 * und ändert vorhandene Anmeldungen nicht.
 *
 * * Je Vorhaben und Fahrplanjahr entsteht eine Anmeldung („2031, 2032“ – zwei
 *   Anmeldungen gleicher Bezeichnung). Die Bezeichnung ist der Vorhabenname
 *   (`vorhaben`) – statt Anmelde-ID bzw. tVE-Nr; „Erstellt von“ wird Anmelder.
 * * Workflow: SKM, solange die SKM-Frist laut Richtlinie für das Fahrplanjahr
 *   noch nicht verstrichen ist, sonst MKM (`vorgabeWorkflow`) – je Anmeldung in
 *   der Vorschau änderbar; die Anmeldung beginnt im ersten Status.
 * * Vorhanden ist eine Anmeldung, wenn eine mit derselben Bezeichnung
 *   (Vorhaben, früher auch Begriff im Feld der Nummer) und demselben
 *   Fahrplanjahr besteht – sie bleibt unverändert.
 * * Nur Vorhaben relevanter Ersteller werden importiert; die Auswahl merkt sich
 *   KaPlan (`Einstellungen.pzeErsteller`), wer zum ersten Mal auftaucht, ist
 *   nicht relevant.
 * * Projekte nach „Enthaltene Projekte“ (die ganze Zelle – Projektnamen
 *   enthalten selbst Kommas): gemerkte Zuordnung (`Einstellungen.pzeProjekte`),
 *   sonst ein Projekt gleichen Namens, sonst ein neues. Die Fahrplanjahre der
 *   Vorhaben gehen ins Projekt.
 *
 * Ablauf wie beim Import aus BBPNeo: `pzeLesen` (Datei → Vorhaben),
 * `pzePlanen` (Vorschau gegen den Bestand) und `pzeImportAnwenden` (rein, im
 * `mutate()` des Stores, mit vorab vergebenen Kennungen).
 */
import { formatDate } from '../../../shared/dates';
import { datumLesen, spaltenZuordnen } from '../../../shared/xlsxLesen';
import { bauzeitraumAbgleichen } from './ablauf';
import { ganzesFahrplanjahr, rilDatum } from './fristen';
import type { Anmeldung, BaubetriebDaten, ErstePhase, ID, ISODate, Projekt, Workflow } from './types';
import { STANDARD_WORKFLOW_ID, startbareWorkflows, zielText } from './workflow';

/* ------------------------------------------------------------------ */
/* Spalten                                                             */
/* ------------------------------------------------------------------ */

export type PzeFeld = 'bezeichnung' | 'ersteller' | 'erstelltAm' | 'tven' | 'fahrplanjahre' | 'projekt' | 'strecken';

/** Spalten der „Vorhaben Übersicht“: Bezeichnung in KaPlan, Lage im Export und Überschriften. */
export const PZE_SPALTEN: Record<PzeFeld, { label: string; spalte: string; koepfe: string[] }> = {
  bezeichnung: { label: 'Bezeichnung', spalte: 'A', koepfe: ['Bezeichnung'] },
  ersteller: { label: 'Erstellt von', spalte: 'B', koepfe: ['Erstellt von'] },
  erstelltAm: { label: 'Erstellt am', spalte: 'C', koepfe: ['Erstellt am'] },
  tven: { label: 'Anzahl tVEn', spalte: 'D', koepfe: ['Anzahl enthaltene tVEn', 'Anzahl tVEn'] },
  fahrplanjahre: { label: 'Fahrplanjahre', spalte: 'E', koepfe: ['Enthaltene Fahrplanjahre', 'Fahrplanjahre'] },
  projekt: { label: 'Projekt', spalte: 'F', koepfe: ['Enthaltene Projekte', 'Projekte'] },
  strecken: { label: 'Streckennummern', spalte: 'G', koepfe: ['Enthaltene Streckennummern', 'Streckennummern'] },
};

const PZE_FELDER = Object.keys(PZE_SPALTEN) as PzeFeld[];

/** Ohne diese Spalten ist ein Blatt keine Vorhaben-Übersicht aus PzE. */
export const PZE_PFLICHT: PzeFeld[] = ['bezeichnung', 'fahrplanjahre', 'projekt'];

function spaltenVon(kopf: string[]): Partial<Record<PzeFeld, number>> {
  return spaltenZuordnen(kopf, Object.fromEntries(PZE_FELDER.map((f) => [f, PZE_SPALTEN[f].koepfe]))) as Partial<
    Record<PzeFeld, number>
  >;
}

/** Ob ein Blatt nach einer Vorhaben-Übersicht aus PzE aussieht (Bezeichnung, Fahrplanjahre, Projekte). */
export function istPzeBlatt(kopf: string[]): boolean {
  const spalten = spaltenVon(kopf);
  return PZE_PFLICHT.every((f) => spalten[f] !== undefined);
}

/** Vergleichbare Schreibweise: ohne Groß-/Kleinschreibung und doppelte Leerzeichen. */
const vergleichbar = (text: string) => text.trim().replace(/\s+/g, ' ').toLowerCase();

/** Fahrplanjahre einer Zelle: „2034, 2035“ → [2034, 2035]. */
export function fahrplanjahreLesen(text: string): number[] {
  const jahre = (text.match(/\b(?:19|20)\d{2}\b/g) ?? []).map(Number);
  return [...new Set(jahre)].sort((a, b) => a - b);
}

/* ------------------------------------------------------------------ */
/* Lesen                                                               */
/* ------------------------------------------------------------------ */

/** Ein Vorhaben aus PzE – eine Zeile der Datei. */
export interface PzeVorhaben {
  /** Zeile in der Datei (1 = Überschriften). */
  zeile: number;
  bezeichnung: string;
  ersteller: string;
  erstelltAm: ISODate | null;
  /** Anzahl enthaltener tVEn wie in der Datei. */
  tven: string;
  fahrplanjahre: number[];
  /** „Enthaltene Projekte“ – die ganze Zelle. */
  projekt: string;
  strecken: string;
}

export interface PzeUebersprungen {
  bezeichnung: string;
  grund: string;
}

export interface PzeGelesen {
  blatt: string;
  /** Zeilen der Datei ohne Kopf. */
  zeilen: number;
  vorhaben: PzeVorhaben[];
  uebersprungen: PzeUebersprungen[];
  /** Spalten, die das Blatt nicht enthält. */
  fehlend: PzeFeld[];
}

/**
 * Liest ein Blatt der Vorhaben-Übersicht (erste Zeile: Überschriften). Wirft,
 * wenn Bezeichnung, Fahrplanjahre oder Projekte fehlen. `zeilenNummern` sind
 * die Zeilennummern wie in Excel (`GeleseneTabelle`).
 */
export function pzeLesen(zeilen: string[][], blatt: string, zeilenNummern?: number[]): PzeGelesen {
  const [kopf = [], ...daten] = zeilen;
  const spalten = spaltenVon(kopf);
  const fehlendPflicht = PZE_PFLICHT.filter((f) => spalten[f] === undefined);
  if (fehlendPflicht.length > 0) {
    throw new Error(
      `Das Blatt „${blatt}“ ist keine Vorhaben-Übersicht aus PzE – es fehlen die Spalten ${fehlendPflicht
        .map((f) => `„${PZE_SPALTEN[f].koepfe[0]}“`)
        .join(', ')}.`,
    );
  }
  const wert = (z: string[], f: PzeFeld) => {
    const i = spalten[f];
    return i === undefined ? '' : (z[i] ?? '').trim();
  };

  const vorhaben: PzeVorhaben[] = [];
  const uebersprungen: PzeUebersprungen[] = [];
  daten.forEach((z, i) => {
    if (!z.some((w) => w.trim())) return;
    const bezeichnung = wert(z, 'bezeichnung').replace(/\s+/g, ' ');
    if (!bezeichnung) {
      uebersprungen.push({ bezeichnung: '', grund: 'ohne Bezeichnung' });
      return;
    }
    const fahrplanjahre = fahrplanjahreLesen(wert(z, 'fahrplanjahre'));
    if (fahrplanjahre.length === 0) {
      uebersprungen.push({ bezeichnung, grund: 'ohne Fahrplanjahr' });
      return;
    }
    vorhaben.push({
      zeile: zeilenNummern?.[i + 1] ?? i + 2,
      bezeichnung,
      ersteller: wert(z, 'ersteller').replace(/\s+/g, ' '),
      erstelltAm: datumLesen(wert(z, 'erstelltAm')),
      tven: wert(z, 'tven'),
      fahrplanjahre,
      projekt: wert(z, 'projekt').replace(/\s+/g, ' '),
      strecken: wert(z, 'strecken'),
    });
  });
  return {
    blatt,
    zeilen: daten.filter((z) => z.some((w) => w.trim())).length,
    vorhaben,
    uebersprungen,
    fehlend: PZE_FELDER.filter((f) => spalten[f] === undefined),
  };
}

/* ------------------------------------------------------------------ */
/* Planen                                                              */
/* ------------------------------------------------------------------ */

/** Wahl einer Projektgruppe: ein Projekt anlegen … */
export const NEUES_PROJEKT = '+neu';
/** … bzw. ihre neuen Anmeldungen nicht importieren. */
export const KEIN_PROJEKT = '';

export interface PzeOptionen {
  /** Ersteller → relevant; fehlt einer, gilt die gemerkte Wahl (`Einstellungen.pzeErsteller`), sonst nicht relevant. */
  ersteller: Record<string, boolean>;
  /** Je Projektgruppe: Projekt-ID, `NEUES_PROJEKT` oder `KEIN_PROJEKT`; fehlt sie, gilt die Vorgabe. */
  projektWahl: Record<string, string>;
  /** Bezeichnung des neuen Projekts je Gruppe; fehlt sie, gilt der Name aus PzE. */
  projektNamen: Record<string, string>;
  /** Workflow je Anmeldung (Schlüssel `PzePosten.schluessel`); fehlt er, gilt die Vorgabe nach Fahrplanjahr. */
  workflowWahl: Record<string, ID>;
}

export type PzeErgebnis = 'neu' | 'vorhanden' | 'uebersprungen';

/** Eine Anmeldung, die aus einem Vorhaben entsteht – je Fahrplanjahr eine. */
export interface PzePosten {
  /** Bezeichnung und Fahrplanjahr – eindeutig in der Datei. */
  schluessel: string;
  quelle: PzeVorhaben;
  fahrplanjahr: number;
  /** Ersteller ist relevant – sonst wird nicht importiert. */
  relevant: boolean;
  ergebnis: PzeErgebnis;
  /** Warum übersprungen. */
  grund: string;
  /** Gewählter Workflow und Vorgabe nach Fahrplanjahr. */
  workflowId: ID | null;
  vorgabe: ID | null;
  /** Erster Status des Workflows – darin beginnt die neue Anmeldung. */
  statusId: ID | null;
  /** Vorhandene Anmeldung mit derselben Bezeichnung und demselben Fahrplanjahr. */
  bestehend: Anmeldung | null;
  gruppe: string;
}

/** Ein Ersteller der Datei samt Wahl. */
export interface PzeErsteller {
  name: string;
  /** Vorhaben dieses Erstellers. */
  vorhaben: number;
  relevant: boolean;
  /** Noch nie gewählt – zum ersten Mal in einer Datei. */
  unbekannt: boolean;
}

/** Vorhaben relevanter Ersteller, die dasselbe „Enthaltene Projekte“ nennen. */
export interface PzeProjektGruppe {
  schluessel: string;
  /** „Enthaltene Projekte“ wie in der Datei; leer – ohne Angabe. */
  projekt: string;
  /** Projekt laut gemerkter Zuordnung bzw. gleichen Namens. */
  treffer: Projekt | null;
  /** Ob der Treffer aus der gemerkten Zuordnung stammt. */
  gemerkt: boolean;
  neu: number;
  vorhanden: number;
  /** Fahrplanjahre der Vorhaben der Gruppe (neu und vorhanden). */
  fahrplanjahre: number[];
  /** Fahrplanjahre, die dem gewählten vorhandenen Projekt noch fehlen. */
  ergaenzt: number[];
  wahl: string;
  name: string;
}

export interface PzePlan {
  posten: PzePosten[];
  gruppen: PzeProjektGruppe[];
  ersteller: PzeErsteller[];
  /** Workflows mit ganzem Fahrplanjahr – zur Wahl je Anmeldung. */
  workflows: Workflow[];
  summe: {
    neu: number;
    vorhanden: number;
    /** Übersprungen bei relevanten Erstellern und beim Lesen. */
    uebersprungen: number;
    /** Anmeldungen nicht relevanter Ersteller. */
    nichtRelevant: number;
    neueProjekte: number;
    /** Vorhandene Projekte, denen Fahrplanjahre hinzukommen. */
    projekteErgaenzt: number;
  };
}

/** Schlüssel einer Anmeldung aus PzE: Bezeichnung und Fahrplanjahr. */
const postenSchluessel = (bezeichnung: string, jahr: number) => `${vergleichbar(bezeichnung)}|${jahr}`;

/** Workflows, in denen PzE-Vorhaben angelegt werden können: startbar, ganzes Fahrplanjahr. */
export function pzeWorkflows(d: BaubetriebDaten): Workflow[] {
  return startbareWorkflows(d.workflows).filter((w) => ganzesFahrplanjahr(w));
}

/**
 * Vorgabe nach Fahrplanjahr: SKM, solange die SKM-Frist laut Richtlinie für
 * das Fahrplanjahr am Tag `heute` nicht verstrichen ist, sonst MKM – je der
 * Standard-Workflow; fehlt er, der erste Workflow mit ganzem Fahrplanjahr.
 */
export function vorgabeWorkflow(d: BaubetriebDaten, fahrplanjahr: number, heute: ISODate): ID | null {
  const moeglich = pzeWorkflows(d);
  const skmFrist = rilDatum(d.einstellungen.rilFristen.skm, fahrplanjahr, null);
  const wunsch = !skmFrist || skmFrist >= heute ? STANDARD_WORKFLOW_ID.skm : STANDARD_WORKFLOW_ID.mkm;
  return (moeglich.find((w) => w.id === wunsch) ?? moeglich[0])?.id ?? null;
}

/** Gemerkte Wahl eines Erstellers bzw. die im Dialog; unbekannt – nicht relevant. */
function relevantVon(d: BaubetriebDaten, optionen: PzeOptionen, name: string): boolean {
  if (Object.prototype.hasOwnProperty.call(optionen.ersteller, name)) return optionen.ersteller[name];
  return d.einstellungen.pzeErsteller[name] === true;
}

/** Projekt laut gemerkter Zuordnung, sonst eines gleichen Namens. */
function projektTreffer(d: BaubetriebDaten, projekt: string): { treffer: Projekt | null; gemerkt: boolean } {
  if (!projekt) return { treffer: null, gemerkt: false };
  const gemerkt = d.einstellungen.pzeProjekte[projekt];
  const ueberZuordnung = gemerkt ? d.projekte.find((p) => p.id === gemerkt) : undefined;
  if (ueberZuordnung) return { treffer: ueberZuordnung, gemerkt: true };
  const name = vergleichbar(projekt);
  return { treffer: d.projekte.find((p) => vergleichbar(p.name) === name) ?? null, gemerkt: false };
}

/**
 * Vorschau des Imports gegen den Bestand: je Vorhaben und Fahrplanjahr, ob eine
 * Anmeldung neu angelegt wird, schon besteht oder übersprungen wird, dazu die
 * Ersteller und die Projektgruppen.
 */
export function pzePlanen(d: BaubetriebDaten, gelesen: PzeGelesen, optionen: PzeOptionen, heute: ISODate): PzePlan {
  // Vorhandene Anmeldungen nach Bezeichnung (Vorhaben bzw. Begriff im Feld der Nummer) und Fahrplanjahr
  const vorhanden = new Map<string, Anmeldung>();
  for (const a of d.anmeldungen) {
    if (a.fahrplanjahr === null) continue;
    for (const name of [a.vorhaben, a.anmeldeId]) {
      const k = name.trim() ? postenSchluessel(name, a.fahrplanjahr) : '';
      if (k && !vorhanden.has(k)) vorhanden.set(k, a);
    }
  }
  const workflows = pzeWorkflows(d);

  // Ersteller in der Reihenfolge der Datei
  const ersteller = new Map<string, PzeErsteller>();
  for (const v of gelesen.vorhaben) {
    const e = ersteller.get(v.ersteller);
    if (e) e.vorhaben++;
    else
      ersteller.set(v.ersteller, {
        name: v.ersteller,
        vorhaben: 1,
        relevant: relevantVon(d, optionen, v.ersteller),
        unbekannt: !Object.prototype.hasOwnProperty.call(d.einstellungen.pzeErsteller, v.ersteller),
      });
  }

  const gruppen = new Map<string, PzeProjektGruppe>();
  const gesehen = new Set<string>();
  const posten: PzePosten[] = [];
  for (const q of gelesen.vorhaben) {
    const relevant = ersteller.get(q.ersteller)!.relevant;
    const gruppe = vergleichbar(q.projekt);
    for (const fahrplanjahr of q.fahrplanjahre) {
      const schluessel = postenSchluessel(q.bezeichnung, fahrplanjahr);
      const vorgabe = vorgabeWorkflow(d, fahrplanjahr, heute);
      const gewaehlt = optionen.workflowWahl[schluessel];
      const workflow = workflows.find((w) => w.id === gewaehlt) ?? workflows.find((w) => w.id === vorgabe) ?? null;
      const basis: PzePosten = {
        schluessel,
        quelle: q,
        fahrplanjahr,
        relevant,
        ergebnis: 'uebersprungen',
        grund: '',
        workflowId: workflow?.id ?? null,
        vorgabe,
        statusId: workflow?.status[0]?.id ?? null,
        bestehend: vorhanden.get(schluessel) ?? null,
        gruppe,
      };
      if (gesehen.has(schluessel)) {
        posten.push({ ...basis, grund: 'doppelt in der Datei' });
        continue;
      }
      gesehen.add(schluessel);
      if (!relevant) {
        posten.push({ ...basis, grund: `Ersteller ${q.ersteller ? `„${q.ersteller}“` : 'ohne Angabe'} nicht relevant` });
        continue;
      }
      if (!gruppen.has(gruppe)) {
        gruppen.set(gruppe, {
          schluessel: gruppe,
          projekt: q.projekt,
          ...projektTreffer(d, q.projekt),
          neu: 0,
          vorhanden: 0,
          fahrplanjahre: [],
          ergaenzt: [],
          wahl: '',
          name: '',
        });
      }
      const g = gruppen.get(gruppe)!;
      if (basis.bestehend) {
        g.vorhanden++;
        g.fahrplanjahre.push(fahrplanjahr);
        posten.push({ ...basis, ergebnis: 'vorhanden' });
        continue;
      }
      if (!basis.statusId) {
        posten.push({ ...basis, grund: 'kein Workflow mit ganzem Fahrplanjahr' });
        continue;
      }
      g.neu++;
      g.fahrplanjahre.push(fahrplanjahr);
      posten.push({ ...basis, ergebnis: 'neu' });
    }
  }

  // Wahl je Gruppe: gemerktes bzw. gleichnamiges Projekt, sonst ein neues; ohne Angabe keines
  for (const g of gruppen.values()) {
    const gewaehlt = optionen.projektWahl[g.schluessel];
    const gueltig =
      gewaehlt !== undefined &&
      (gewaehlt === NEUES_PROJEKT || gewaehlt === KEIN_PROJEKT || d.projekte.some((p) => p.id === gewaehlt));
    g.wahl = gueltig ? gewaehlt : g.treffer ? g.treffer.id : g.projekt ? NEUES_PROJEKT : KEIN_PROJEKT;
    g.name = optionen.projektNamen[g.schluessel]?.trim() || g.projekt || 'Projekt ohne Angabe aus PzE';
    g.fahrplanjahre = [...new Set(g.fahrplanjahre)].sort((a, b) => a - b);
    const projekt = d.projekte.find((p) => p.id === g.wahl);
    g.ergaenzt = projekt ? g.fahrplanjahre.filter((j) => !projekt.fahrplanjahre.includes(j)) : [];
  }
  for (const p of posten) {
    if (p.ergebnis === 'neu' && gruppen.get(p.gruppe)!.wahl === KEIN_PROJEKT) {
      p.ergebnis = 'uebersprungen';
      p.grund = p.quelle.projekt ? `kein Projekt für „${p.quelle.projekt}“ gewählt` : 'ohne Projekt – kein Projekt gewählt';
    }
  }

  const gruppenListe = [...gruppen.values()];
  const zaehle = (e: PzeErgebnis) => posten.filter((p) => p.relevant && p.ergebnis === e).length;
  return {
    posten,
    gruppen: gruppenListe,
    ersteller: [...ersteller.values()],
    workflows,
    summe: {
      neu: zaehle('neu'),
      vorhanden: zaehle('vorhanden'),
      uebersprungen: zaehle('uebersprungen') + gelesen.uebersprungen.length,
      nichtRelevant: posten.filter((p) => !p.relevant).length,
      neueProjekte: gruppenListe.filter((g) => g.neu > 0 && g.wahl === NEUES_PROJEKT).length,
      projekteErgaenzt: gruppenListe.filter((g) => g.ergaenzt.length > 0).length,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Anwenden                                                            */
/* ------------------------------------------------------------------ */

/** Vorab vergebene Kennungen – der Store erzeugt sie außerhalb von `mutate()` (StrictMode). */
export interface PzeIds {
  anmeldung: ID[];
  verlauf: ID[];
  projekt: ID[];
}

/** Wie viele Kennungen `pzeImportAnwenden` höchstens braucht. */
export function pzeIdBedarf(gelesen: PzeGelesen): { anmeldung: number; verlauf: number; projekt: number } {
  const anmeldungen = gelesen.vorhaben.reduce((n, v) => n + v.fahrplanjahre.length, 0);
  return {
    anmeldung: anmeldungen,
    verlauf: anmeldungen,
    projekt: new Set(gelesen.vorhaben.map((v) => vergleichbar(v.projekt))).size,
  };
}

export interface PzeKontext {
  heute: ISODate;
  /** Zeitpunkt der Erfassung für den Verlauf. */
  erfasst: string;
  bearbeiter: string;
}

/** Bemerkung einer neuen Anmeldung: „PzE: 14 tVEn (Fahrplanjahre 2031, 2032) · Strecken 3505, 3506“. */
export function pzeBemerkung(q: Pick<PzeVorhaben, 'tven' | 'fahrplanjahre' | 'strecken'>): string {
  const umfang = q.tven ? `${q.tven} tVEn (Fahrplanjahre ${q.fahrplanjahre.join(', ')})` : '';
  const teile = [umfang, q.strecken ? `Strecken ${q.strecken}` : ''].filter(Boolean);
  return teile.length > 0 ? `PzE: ${teile.join(' · ')}` : '';
}

/** Text im Verlauf: „Aus PzE importiert (erstellt am 18.06.2026 von Patrycja Meler)“. */
export function pzeVerlaufText(q: Pick<PzeVorhaben, 'ersteller' | 'erstelltAm'>): string {
  const teile = [q.erstelltAm ? `erstellt am ${formatDate(q.erstelltAm)}` : '', q.ersteller ? `von ${q.ersteller}` : '']
    .filter(Boolean)
    .join(' ');
  return teile ? `Aus PzE importiert (${teile})` : 'Aus PzE importiert';
}

/**
 * Wendet den Import an – rein, für `mutate()`: plant gegen den übergebenen
 * Bestand, legt neue Projekte und Anmeldungen an, ergänzt die Fahrplanjahre
 * vorhandener Projekte und merkt sich Ersteller und Projektzuordnung.
 */
export function pzeImportAnwenden(
  d: BaubetriebDaten,
  gelesen: PzeGelesen,
  optionen: PzeOptionen,
  ids: PzeIds,
  k: PzeKontext,
): BaubetriebDaten {
  const plan = pzePlanen(d, gelesen, optionen, k.heute);
  let nAnmeldung = 0;
  let nVerlauf = 0;
  let nProjekt = 0;
  // Reicht der Vorrat nicht, eindeutig je Import und Lauf
  const naechste = (liste: ID[], n: number, prefix: string) => liste[n] ?? `${prefix}-pze-${k.erfasst}-${n}`;
  const workflowVon = (id: ID | null) => plan.workflows.find((w) => w.id === id);

  // Projekte: neue anlegen, vorhandenen fehlende Fahrplanjahre ergänzen, Zuordnung merken
  const projektFuer = new Map<string, ID>();
  const neueProjekte: Projekt[] = [];
  const ergaenzt = new Map<ID, number[]>();
  const pzeProjekte = { ...d.einstellungen.pzeProjekte };
  for (const g of plan.gruppen) {
    if (g.wahl === KEIN_PROJEKT || g.neu + g.vorhanden === 0) continue;
    if (g.wahl !== NEUES_PROJEKT) {
      projektFuer.set(g.schluessel, g.wahl);
      if (g.ergaenzt.length > 0) ergaenzt.set(g.wahl, [...(ergaenzt.get(g.wahl) ?? []), ...g.ergaenzt]);
      if (g.projekt) pzeProjekte[g.projekt] = g.wahl;
      continue;
    }
    if (g.neu === 0) continue;
    const neue = plan.posten.filter((p) => p.gruppe === g.schluessel && p.relevant && p.ergebnis === 'neu');
    const frueheste = neue.reduce((a, b) => (b.fahrplanjahr < a.fahrplanjahr ? b : a));
    const erstePhase: ErstePhase = workflowVon(frueheste.workflowId)?.arten.includes('MKM') ? 'mkm' : 'skm';
    const id = naechste(ids.projekt, nProjekt++, 'pr');
    projektFuer.set(g.schluessel, id);
    if (g.projekt) pzeProjekte[g.projekt] = id;
    neueProjekte.push({
      id,
      name: g.name,
      dbGNummer: '',
      erstePhase,
      fahrplanjahre: g.fahrplanjahre,
      inbetriebnahme: null,
      projektnummer: '',
      markiert: true,
      bemerkung: 'Beim Import aus PzE angelegt.',
    });
  }

  // Neue Anmeldungen
  const neueAnmeldungen: Anmeldung[] = [];
  for (const p of plan.posten) {
    if (!p.relevant || p.ergebnis !== 'neu' || !p.statusId) continue;
    const projektId = projektFuer.get(p.gruppe);
    const workflow = workflowVon(p.workflowId);
    if (!projektId || !workflow) continue;
    const q = p.quelle;
    neueAnmeldungen.push(
      bauzeitraumAbgleichen(
        {
          id: naechste(ids.anmeldung, nAnmeldung++, 'an'),
          projektId,
          anmeldeId: '',
          vorhaben: q.bezeichnung,
          titel: '',
          bbk: '',
          anmelder: q.ersteller,
          bbpProjektnummer: '',
          kmRunde: null,
          art: workflow.arten[0] ?? 'SKM',
          statusId: p.statusId,
          statusSeit: k.heute,
          bauVon: null,
          bauBis: null,
          fahrplanjahr: p.fahrplanjahr,
          aenderungsNr: '',
          annexVII: null,
          terminManuell: null,
          bemerkung: pzeBemerkung(q),
          herkunftId: null,
          geaendertAm: null,
          verlauf: [
            {
              id: naechste(ids.verlauf, nVerlauf++, 'vl'),
              typ: 'anlage',
              datum: k.heute,
              erfasst: k.erfasst,
              bearbeiter: k.bearbeiter,
              von: null,
              nach: p.statusId,
              vonText: '',
              nachText: zielText(d.workflows, p.statusId),
              text: pzeVerlaufText(q),
            },
          ],
        },
        d.workflows,
      ),
    );
  }

  // Wahl der Ersteller merken
  const pzeErsteller = { ...d.einstellungen.pzeErsteller };
  for (const e of plan.ersteller) pzeErsteller[e.name] = e.relevant;

  const projekte = d.projekte.map((p) => {
    const jahre = ergaenzt.get(p.id);
    return jahre ? { ...p, fahrplanjahre: [...new Set([...p.fahrplanjahre, ...jahre])].sort((a, b) => a - b) } : p;
  });
  const gleich = (a: Record<string, unknown>, b: Record<string, unknown>) => JSON.stringify(a) === JSON.stringify(b);
  const einstellungenGleich =
    gleich(pzeErsteller, d.einstellungen.pzeErsteller) && gleich(pzeProjekte, d.einstellungen.pzeProjekte);
  if (neueAnmeldungen.length === 0 && neueProjekte.length === 0 && ergaenzt.size === 0 && einstellungenGleich) return d;
  return {
    ...d,
    einstellungen: einstellungenGleich ? d.einstellungen : { ...d.einstellungen, pzeErsteller, pzeProjekte },
    projekte: ergaenzt.size > 0 || neueProjekte.length > 0 ? [...projekte, ...neueProjekte] : d.projekte,
    anmeldungen: neueAnmeldungen.length > 0 ? [...d.anmeldungen, ...neueAnmeldungen] : d.anmeldungen,
  };
}
