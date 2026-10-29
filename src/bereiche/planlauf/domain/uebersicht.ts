/**
 * Gliederung und Zeilenwerte der Planlaufübersicht eines Projekts.
 *
 * Dieselben Regeln gelten für die Liste im Reiter „Planläufe“ und für den
 * Export (Kurz- und Langfassung): Planpakete sind reine Überschriften, ein
 * gebündelt laufendes Planverzeichnis ist ein Planlauf, dessen Pläne mitlaufen,
 * und ein Verzeichnis mit einzeln laufenden Plänen fasst diese nur zusammen.
 * Abgebrochene Läufe stehen gesammelt am Ende.
 */
import {
  AMPEL_LABEL,
  aktuellerSchritt,
  ampelFuerSchritt,
  eigenstaendigeLaeufe,
  fortschritt,
  laufUeberfuehrt,
  verlaufDerKette,
  type Ampel,
} from './engine';
import { istErledigt } from './ablauf';
import {
  RUN_STATUS_LABEL,
  hatEigenenPlanlauf,
  istEingangPLM,
  verzeichnisGebuendelt,
  type AppData,
  type ID,
  type PlanDocument,
  type PlanRun,
  type RunStatus,
  type RunStep,
} from './types';

/** Farbton einer Statusangabe – entspricht den Badges der Oberfläche. */
export type StatusTon = '' | 'green' | 'orange' | 'red' | 'blue' | 'gelb';

/** Eine Zeile der Übersicht: ein Planlauf mit seinem Eintrag. */
export interface UebersichtEintrag {
  run: PlanRun;
  doc: PlanDocument | undefined;
  /** Der offene Schritt im aktuellen Verlauf. */
  step: RunStep | undefined;
}

/**
 * Ein Eintrag der obersten Ebene einer Gruppe: ein Planlauf – oder ein
 * Planverzeichnis, dessen Pläne einzeln laufen und das sie nur zusammenfasst.
 */
export type Knoten =
  | { art: 'lauf'; eintrag: UebersichtEintrag }
  | { art: 'klammer'; verzeichnis: PlanDocument; kinder: UebersichtEintrag[] };

/** Zusammengefasster Stand eines Planpakets bzw. einer Verzeichnisklammer. */
export interface Stand {
  pct: number;
  status: RunStatus | null;
  ampel: Ampel | null;
}

/**
 * Die Planläufe, die die Übersicht eines Projekts zeigt: je Eintrag der
 * laufende, sonst der abgeschlossene Lauf. Abgebrochene Läufe kommen
 * vollständig dazu – auch der Vorgänger eines neuen Index bleibt so sichtbar.
 * Aufgeteilte bzw. wieder gebündelte Läufe sind kein Abbruch und entfallen.
 * Läufe von Plänen, die in einem Planverzeichnis mitlaufen, zählen nicht.
 */
export function massgeblicheLaeufe(data: Pick<AppData, 'documents' | 'runs'>, projectId: ID): PlanRun[] {
  const laeufe = eigenstaendigeLaeufe(data.documents, data.runs).filter((r) => r.projectId === projectId);
  const rang = (r: PlanRun) => (r.status === 'laufend' ? 0 : 1);
  const verworfen = laeufe.filter((r) => r.status === 'abgebrochen' && !laufUeberfuehrt(r));
  const aktuell = laeufe
    .filter((r) => r.status !== 'abgebrochen')
    .sort((a, b) => rang(a) - rang(b))
    .filter((r, i, alle) => alle.findIndex((x) => x.documentId === r.documentId) === i);
  return [...aktuell, ...verworfen];
}

/** Maßgebliches Planpaket – bei Plänen eines Verzeichnisses dessen Paket. */
export function paketVon(documents: PlanDocument[], doc: PlanDocument | undefined): ID | null {
  if (!doc) return null;
  if (doc.kind === 'plan' && doc.parentId) {
    const eltern = documents.find((d) => d.id === doc.parentId);
    if (eltern) return eltern.paketId;
  }
  return doc.paketId;
}

/**
 * Der „aktuelle Stand“ eines Laufs: der zuletzt erledigte Schritt vor dem
 * offenen. Übersprungene Schritte zählen nicht – es gilt der erledigte davor.
 * Ist ein früherer Schritt wieder geöffnet, zählen die erledigten Schritte
 * dahinter nicht – der Stand liegt nie hinter dem nächsten Schritt. In einem
 * parallelen Block zählt je Zweig, was vor seinem offenen Schritt erledigt ist;
 * von diesen Schritten aller Zweige gilt der mit dem spätesten Ist.
 */
export function letzterAbgeschlossenerSchritt(run: PlanRun | undefined): RunStep | undefined {
  if (!run) return undefined;
  const spaeter = (a: RunStep | undefined, b: RunStep) => (!a || (b.istDatum ?? '') >= (a.istDatum ?? '') ? b : a);
  let stand: RunStep | undefined;
  for (const a of verlaufDerKette(run.steps).abschnitte) {
    if (a.art === 'schritt') {
      if (!istErledigt(a.step)) return stand;
      if (a.step.status === 'erledigt') stand = a.step;
      continue;
    }
    let imBlock: RunStep | undefined;
    let offen = false;
    for (const z of a.zweige) {
      for (const s of z.schritte) {
        if (!istErledigt(s)) {
          offen = true;
          break;
        }
        if (s.status === 'erledigt') imBlock = spaeter(imBlock, s);
      }
      if (z.rueckSprungZu) offen = true;
    }
    if (imBlock) stand = imBlock;
    if (offen) return stand;
  }
  return stand;
}

/** Zeilen der Übersicht zu den gegebenen Läufen. */
export function eintraegeVon(documents: PlanDocument[], runs: PlanRun[]): UebersichtEintrag[] {
  return runs.map((run) => ({
    run,
    doc: documents.find((d) => d.id === run.documentId),
    step: aktuellerSchritt(run),
  }));
}

/** Gliederung der Übersicht: Planpakete als Überschriften, abgebrochene Läufe am Ende. */
export interface Gliederung {
  /** Planpakete mit mindestens einem Eintrag – in der Reihenfolge des Bestands. */
  pakete: { paket: PlanDocument; eintraege: UebersichtEintrag[] }[];
  /** Einträge ohne Planpaket. */
  ohnePaket: UebersichtEintrag[];
  /** Abgebrochene Läufe. */
  verworfene: UebersichtEintrag[];
}

export function gliederungBilden(documents: PlanDocument[], eintraege: UebersichtEintrag[]): Gliederung {
  const verworfene = eintraege.filter((e) => e.run.status === 'abgebrochen');
  const laufende = eintraege.filter((e) => e.run.status !== 'abgebrochen');
  const pakete = documents
    .filter((d) => d.kind === 'paket' && laufende.some((e) => paketVon(documents, e.doc) === d.id))
    .map((paket) => ({ paket, eintraege: laufende.filter((e) => paketVon(documents, e.doc) === paket.id) }));
  const ohnePaket = laufende.filter((e) => !pakete.some((p) => p.paket.id === paketVon(documents, e.doc)));
  return { pakete, ohnePaket, verworfene };
}

/**
 * Oberste Ebene einer Gruppe – unsortiert. Pläne mit eigenem Lauf stehen unter
 * ihrem Verzeichnis: unter dessen Zeile, wenn es gebündelt läuft, sonst unter
 * einer Klammer. Ist das Verzeichnis nicht in der Liste, steht der Plan für sich.
 */
export function knotenBilden(documents: PlanDocument[], liste: UebersichtEintrag[]): Knoten[] {
  const mitLauf = new Set(liste.filter((e) => e.doc?.kind === 'verzeichnis').map((e) => e.doc!.id));
  const klammern = new Map<string, UebersichtEintrag[]>();
  const knoten: Knoten[] = [];
  for (const e of liste) {
    const elternId = e.doc?.kind === 'plan' ? e.doc.parentId : null;
    if (elternId && mitLauf.has(elternId)) continue;
    const eltern = elternId ? documents.find((d) => d.id === elternId) : undefined;
    if (eltern && !verzeichnisGebuendelt(eltern)) {
      // Klammer an der Stelle ihres ersten Plans einreihen
      if (!klammern.has(eltern.id)) {
        klammern.set(eltern.id, []);
        knoten.push({ art: 'klammer', verzeichnis: eltern, kinder: klammern.get(eltern.id)! });
      }
      klammern.get(eltern.id)!.push(e);
      continue;
    }
    knoten.push({ art: 'lauf', eintrag: e });
  }
  return knoten;
}

/**
 * Pläne eines gebündelt laufenden Verzeichnisses, die in dessen Lauf
 * mitlaufen (also keinen eigenen Lauf haben).
 */
export function mitlaufendePlaene(documents: PlanDocument[], verzeichnisId: ID): PlanDocument[] {
  return documents.filter(
    (d) => d.kind === 'plan' && d.parentId === verzeichnisId && !hatEigenenPlanlauf(d, documents),
  );
}

/**
 * Stand einer Klammer – eines Planpakets oder eines Verzeichnisses mit einzeln
 * laufenden Plänen: Sie laufen selbst nicht; Fortschritt und Status ergeben
 * sich aus den enthaltenen Einträgen mit eigenem Lauf. Je Eintrag zählt der
 * laufende, sonst der abgeschlossene Lauf; abgebrochene bleiben außen vor.
 */
export function standVon(zugehoerig: PlanDocument[], basis: PlanRun[], vorlaufTage: number): Stand {
  const laufendZuerst = (r: PlanRun) => (r.status === 'laufend' ? 0 : 1);
  const laeufe = zugehoerig
    .map(
      (d) =>
        basis
          .filter((r) => r.documentId === d.id && r.status !== 'abgebrochen')
          .sort((a, b) => laufendZuerst(a) - laufendZuerst(b))[0],
    )
    .filter((r): r is PlanRun => Boolean(r));
  if (laeufe.length === 0) return { pct: 0, status: null, ampel: null };
  const pct = Math.round(laeufe.reduce((sum, r) => sum + fortschritt(r), 0) / laeufe.length);
  const status: RunStatus = laeufe.some((r) => r.status === 'laufend') ? 'laufend' : 'abgeschlossen';
  // Dringlichkeit: der kritischste Schritt der laufenden Einträge
  const rang: Ampel[] = ['ueberfaellig', 'faellig', 'geplant', 'neutral'];
  const ampeln = laeufe
    .filter((r) => r.status === 'laufend')
    .map((r) => {
      const step = aktuellerSchritt(r);
      return step ? ampelFuerSchritt(step, vorlaufTage, true) : 'neutral';
    });
  const ampel = rang.find((a) => ampeln.includes(a)) ?? null;
  return { pct, status, ampel };
}

/** Stand eines Planpakets aus seinen Einträgen mit eigenem Lauf. */
export function paketStand(documents: PlanDocument[], paketId: ID, basis: PlanRun[], vorlaufTage: number): Stand {
  return standVon(
    documents.filter(
      (d) => d.kind !== 'paket' && paketVon(documents, d) === paketId && hatEigenenPlanlauf(d, documents),
    ),
    basis,
    vorlaufTage,
  );
}

/** Stand eines Verzeichnisses mit einzeln laufenden Plänen. */
export function verzeichnisStand(
  documents: PlanDocument[],
  verzeichnisId: ID,
  basis: PlanRun[],
  vorlaufTage: number,
): Stand {
  return standVon(
    documents.filter(
      (d) => d.kind === 'plan' && d.parentId === verzeichnisId && hatEigenenPlanlauf(d, documents),
    ),
    basis,
    vorlaufTage,
  );
}

const AMPEL_TON: Record<Ampel, StatusTon> = {
  erledigt: 'green',
  ueberfaellig: 'red',
  faellig: 'orange',
  geplant: 'blue',
  neutral: '',
};

const RUN_STATUS_TON: Record<RunStatus, StatusTon> = {
  laufend: 'blue',
  abgeschlossen: 'green',
  abgebrochen: '',
};

/** Der Lauf wartet auf den Eingang beim Planlaufmanagement – er ist angekündigt. */
export function wartetAufEingang(run: PlanRun, step: RunStep | undefined): boolean {
  return run.status === 'laufend' && Boolean(step && istEingangPLM(step.name));
}

/**
 * Statusangabe einer Zeile, wie sie die Übersicht zeigt: abgeschlossen bzw.
 * abgebrochen, sonst „Angekündigt“ oder die Ampel des offenen Schritts. Ein
 * überfälliger Eingang zählt als überfällig.
 */
export function statusAnzeige(
  run: PlanRun,
  step: RunStep | undefined,
  vorlaufTage: number,
): { text: string; ton: StatusTon } {
  if (run.status !== 'laufend') return { text: RUN_STATUS_LABEL[run.status], ton: RUN_STATUS_TON[run.status] };
  const ampel = step ? ampelFuerSchritt(step, vorlaufTage, true) : 'erledigt';
  if (wartetAufEingang(run, step) && ampel !== 'ueberfaellig') return { text: 'Angekündigt', ton: 'gelb' };
  return { text: AMPEL_LABEL[ampel], ton: AMPEL_TON[ampel] };
}

/** Statusangabe eines Planpakets bzw. einer Verzeichnisklammer. */
export function standAnzeige(stand: Stand): { text: string; ton: StatusTon } | null {
  if (stand.status === 'laufend' && stand.ampel) return { text: AMPEL_LABEL[stand.ampel], ton: AMPEL_TON[stand.ampel] };
  if (stand.status) return { text: RUN_STATUS_LABEL[stand.status], ton: RUN_STATUS_TON[stand.status] };
  return null;
}
