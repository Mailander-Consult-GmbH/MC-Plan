/**
 * Gliederung eines Workflows für den grafischen Editor und die Vorschau in der
 * Workflow-Liste – aufgebaut wie im Planlaufmanagement, aber für Status mit
 * Nachfolgern. Ein Status kann eine Entscheidung sein: Dann trägt jeder
 * Nachfolger eine Antwort („Ja“, „Nein“), die an seinem Übergang steht und
 * bei allen Bearbeitungen mit ihm wandert. Reine Funktionen.
 *
 * Standardverlauf: vom Startstatus (dem ersten der Liste) über den jeweils
 * ersten Nachfolger (bei Entscheidungen die erste Antwort). Er endet
 * - mit einer Übernahme, wenn der erste Nachfolger in einem anderen Workflow liegt,
 * - mit „Eintrag löschen“,
 * - mit einer Schleife, wenn der erste Nachfolger schon im Standardverlauf steht,
 * - am Ziel, sobald ein Status der Art „Genehmigt“ erreicht ist (seine Nachfolger
 *   sind Abweichungen – etwa eine Änderungsabstimmung),
 * - offen, wenn ein Status keinen Nachfolger hat.
 * Abweichungen sind die übrigen Status, die über andere Nachfolger erreicht
 * werden – auch über Status, in die andere Workflows übernehmen (Einstiege).
 * Was nie erreicht wird, steht unter „Nicht erreichbar“.
 */
import { LOESCHEN, STANDARD_ANTWORTEN, type ID, type StatusZiel, type Workflow, type WorkflowStatus } from './types';
import { statusInfo, zielText } from './workflow';

/** Wie der Standardverlauf endet. */
export type VerlaufEnde =
  | { art: 'uebernahme'; ziel: ID }
  | { art: 'loeschen' }
  | { art: 'schleife'; nach: ID }
  | { art: 'ziel' }
  | { art: 'offen' };

/** Übergang von einem Status zu einem Nachfolger. */
export interface Kante {
  von: ID;
  nach: StatusZiel;
  /** Ziel im eigenen Workflow, in einem anderen (Übernahme), Löschen oder nicht (mehr) vorhanden. */
  art: 'intern' | 'uebernahme' | 'loeschen' | 'unbekannt';
  /** Teil des Standardverlaufs (auch der Übergang, mit dem er endet). */
  standard: boolean;
  /** Antwort einer Entscheidung, die zu diesem Nachfolger führt; null bei gewöhnlichen Status. */
  text: string | null;
}

export interface Gliederung {
  /** Status des Standardverlaufs in ihrer Folge. */
  haupt: ID[];
  ende: VerlaufEnde;
  /** Abweichungen mit der Stelle im Standardverlauf, neben der sie stehen. */
  abweichungen: { id: ID; anker: number }[];
  unerreichbar: ID[];
  kanten: Kante[];
  /** Status, in die andere Workflows übernehmen – mit den Texten der Herkunft. */
  einstiege: Map<ID, string[]>;
}

/** Art eines Nachfolgers aus Sicht des Workflows. */
export function kantenArt(status: WorkflowStatus[], alle: Workflow[], ziel: StatusZiel): Kante['art'] {
  if (ziel === LOESCHEN) return 'loeschen';
  if (status.some((s) => s.id === ziel)) return 'intern';
  return statusInfo(alle, ziel) ? 'uebernahme' : 'unbekannt';
}

/**
 * Gliedert die Status eines Workflows. `alle` sind alle Workflows des Bestands –
 * für Übernahmen und Einstiege; der bearbeitete Workflow (`workflowId`) zählt
 * dabei mit seinen aktuellen Status, nicht mit dem gespeicherten Stand.
 */
export function gliedern(status: WorkflowStatus[], workflowId: ID | null, alle: Workflow[]): Gliederung {
  const nachId = new Map(status.map((s) => [s.id, s]));
  const andere = alle.filter((w) => w.id !== workflowId);
  const art = (z: StatusZiel) => kantenArt(status, andere, z);

  // Standardverlauf
  const haupt: ID[] = [];
  let ende: VerlaufEnde = { art: 'offen' };
  let aktuell = status[0];
  while (aktuell) {
    haupt.push(aktuell.id);
    const erster = aktuell.nachfolger[0];
    if (erster === undefined) break;
    const a = art(erster);
    if (a === 'uebernahme') {
      ende = { art: 'uebernahme', ziel: erster };
      break;
    }
    if (a === 'loeschen') {
      ende = { art: 'loeschen' };
      break;
    }
    if (aktuell.art === 'genehmigt') {
      ende = { art: 'ziel' };
      break;
    }
    if (a !== 'intern') break;
    if (haupt.includes(erster)) {
      ende = { art: 'schleife', nach: erster };
      break;
    }
    aktuell = nachId.get(erster)!;
  }

  // Übergänge
  // Im Standardverlauf: die Übergänge zwischen seinen Status und der, mit dem er endet
  // (Übernahme, Löschen, Schleife) – nicht die Nachfolger eines genehmigten Status am Ziel
  const standardKante = new Set<string>();
  const mitEndkante = ende.art === 'uebernahme' || ende.art === 'loeschen' || ende.art === 'schleife';
  for (let k = 0; k < haupt.length; k++) {
    const s = nachId.get(haupt[k])!;
    if (s.nachfolger[0] !== undefined && (k < haupt.length - 1 || mitEndkante))
      standardKante.add(`${s.id}>${s.nachfolger[0]}`);
  }
  const kanten: Kante[] = status.flatMap((s) =>
    s.nachfolger.map((nach) => ({
      von: s.id,
      nach,
      art: art(nach),
      standard: standardKante.has(`${s.id}>${nach}`),
      text: s.entscheidung ? (s.entscheidung.antworten[nach] ?? '') : null,
    })),
  );

  // Einstiege aus anderen Workflows
  const einstiege = new Map<ID, string[]>();
  for (const w of andere) {
    for (const s of w.status) {
      for (const z of s.nachfolger) {
        if (!nachId.has(z)) continue;
        einstiege.set(z, [...(einstiege.get(z) ?? []), `${w.kurz || w.name} · ${s.name}`]);
      }
    }
  }

  // Abweichungen: Breitensuche ab dem Standardverlauf, dann ab den Einstiegen
  const rang = new Map<ID, number>(haupt.map((id, k) => [id, k]));
  const abweichungen: { id: ID; anker: number }[] = [];
  const warteschlange: ID[] = [...haupt];
  const erreicht = new Set<ID>(haupt);
  const besuchen = (von: ID) => {
    const s = nachId.get(von);
    if (!s) return;
    for (const z of s.nachfolger) {
      if (!nachId.has(z) || erreicht.has(z)) continue;
      erreicht.add(z);
      const anker = rang.get(von) ?? 0;
      rang.set(z, anker);
      abweichungen.push({ id: z, anker });
      warteschlange.push(z);
    }
  };
  while (warteschlange.length > 0) besuchen(warteschlange.shift()!);
  for (const id of einstiege.keys()) {
    if (erreicht.has(id)) continue;
    erreicht.add(id);
    const anker = Math.max(0, haupt.length - 1);
    rang.set(id, anker);
    abweichungen.push({ id, anker });
    warteschlange.push(id);
    while (warteschlange.length > 0) besuchen(warteschlange.shift()!);
  }
  const unerreichbar = status.filter((s) => !erreicht.has(s.id)).map((s) => s.id);

  return { haupt, ende, abweichungen, unerreichbar, kanten, einstiege };
}

/** Text eines Nachfolgers außerhalb des Workflows: „Übernahme: KKM · Entwurf“, „Eintrag löschen“. */
export function fremdZielText(alle: Workflow[], ziel: StatusZiel): string {
  if (ziel === LOESCHEN) return 'Eintrag löschen';
  return statusInfo(alle, ziel) ? `Übernahme: ${zielText(alle, ziel)}` : 'Unbekannter Status';
}

/* ------------------------------------------------------------------ */
/* Prüfung                                                             */
/* ------------------------------------------------------------------ */

export interface Hinweis {
  text: string;
  statusId?: ID;
  /** Verhindert das Speichern. */
  sperrt: boolean;
}

/**
 * Hinweise zum Workflow: fehlende Angaben sperren das Speichern; nicht
 * erreichbare Status und Anmeldeleichen ohne „Eintrag löschen“ sind nur Hinweise.
 */
export function pruefen(w: { name: string; arten: unknown[]; status: WorkflowStatus[] }, g: Gliederung): Hinweis[] {
  const hinweise: Hinweis[] = [];
  if (!w.name.trim()) hinweise.push({ text: 'Der Workflow braucht einen Namen.', sperrt: true });
  if (w.status.length === 0) hinweise.push({ text: 'Der Workflow braucht mindestens einen Status.', sperrt: true });
  if (w.arten.length === 0) hinweise.push({ text: 'Bitte mindestens eine Maßnahmenart wählen.', sperrt: true });
  w.status.forEach((s, i) => {
    const nr = String(i + 1).padStart(2, '0');
    if (!s.name.trim()) hinweise.push({ text: `Status ${nr} hat keine Bezeichnung.`, statusId: s.id, sperrt: true });
  });
  for (const k of g.kanten) {
    if (k.art !== 'unbekannt') continue;
    const s = w.status.find((x) => x.id === k.von);
    hinweise.push({
      text: `„${s?.name || 'Status'}“ hat einen Nachfolger, den es nicht mehr gibt – er entfällt beim Speichern.`,
      statusId: k.von,
      sperrt: false,
    });
  }
  for (const id of g.unerreichbar) {
    const s = w.status.find((x) => x.id === id);
    hinweise.push({
      text: `„${s?.name || 'Status'}“ wird nie erreicht – kein Nachfolger führt dorthin.`,
      statusId: id,
      sperrt: false,
    });
  }
  for (const s of w.status) {
    const name = s.name.trim() || 'ohne Bezeichnung';
    if (s.entscheidung) {
      if (s.nachfolger.some((z) => !s.entscheidung!.antworten[z]?.trim())) {
        hinweise.push({
          text: `Bei der Entscheidung „${name}“ fehlt der Text einer Antwort.`,
          statusId: s.id,
          sperrt: true,
        });
      }
      if (s.nachfolger.length < 2) {
        hinweise.push({
          text: `Die Entscheidung „${name}“ hat ${s.nachfolger.length === 0 ? 'keine Antwort' : 'nur eine Antwort'} – sie braucht mindestens zwei.`,
          statusId: s.id,
          sperrt: false,
        });
      }
    }
    if (s.art === 'leiche' && !s.nachfolger.includes(LOESCHEN)) {
      hinweise.push({
        text: `Aus der Anmeldeleiche „${s.name || 'ohne Bezeichnung'}“ führt kein „Eintrag löschen“.`,
        statusId: s.id,
        sperrt: false,
      });
    }
  }
  return hinweise;
}

/* ------------------------------------------------------------------ */
/* Bearbeitungen                                                       */
/* ------------------------------------------------------------------ */

/** Vorbelegter Text der n-ten Antwort: „Ja“, „Nein“, „Antwort 3“ … */
export const antwortVorgabe = (n: number) => STANDARD_ANTWORTEN[n] ?? `Antwort ${n + 1}`;

/** Status mit neuen Nachfolgern; bei einer Entscheidung wandern die Antworten mit (`umbenannt`: alter → neuer Schlüssel). */
function mitNachfolgern(
  s: WorkflowStatus,
  nachfolger: StatusZiel[],
  umbenannt: [StatusZiel, StatusZiel][] = [],
): WorkflowStatus {
  if (!s.entscheidung) return { ...s, nachfolger };
  const alt = { ...s.entscheidung.antworten };
  for (const [von, nach] of umbenannt) {
    if (alt[von] !== undefined && alt[nach] === undefined) alt[nach] = alt[von];
  }
  const antworten: Partial<Record<StatusZiel, string>> = {};
  nachfolger.forEach((z, n) => (antworten[z] = alt[z] ?? antwortVorgabe(n)));
  return { ...s, nachfolger, entscheidung: { ...s.entscheidung, antworten } };
}

/** Stelle zum Einfügen: am Anfang (neuer Startstatus) oder hinter einem Status. */
export type Einfuegestelle = { art: 'anfang' } | { art: 'nach'; vonId: ID };

/**
 * Fügt einen Status ein. Am Anfang wird er Startstatus und führt zum bisherigen;
 * hinter einem Status übernimmt er dessen ersten Nachfolger (den Weg im
 * Standardverlauf), und der Status führt stattdessen zu ihm – bei einer
 * Entscheidung mit derselben Antwort.
 */
export function einfuegen(status: WorkflowStatus[], stelle: Einfuegestelle, neu: WorkflowStatus): WorkflowStatus[] {
  if (stelle.art === 'anfang') return [mitNachfolgern(neu, status[0] ? [status[0].id] : []), ...status];
  const index = status.findIndex((s) => s.id === stelle.vonId);
  if (index < 0) return [...status, neu];
  const von = status[index];
  const erster = von.nachfolger[0];
  const eingefuegt = mitNachfolgern(neu, erster !== undefined ? [erster] : []);
  const ergebnis = status.map((s) =>
    s.id === von.id
      ? mitNachfolgern(
          s,
          [neu.id, ...s.nachfolger.slice(1).filter((z) => z !== neu.id)],
          erster !== undefined ? [[erster, neu.id]] : [],
        )
      : s,
  );
  ergebnis.splice(index + 1, 0, eingefuegt);
  return ergebnis;
}

/**
 * Entfernt einen Status. Wer zu ihm führte, führt nun zu seinem ersten
 * Nachfolger – so bleibt der Standardverlauf geschlossen –, sofern das kein
 * Rückverweis auf sich selbst und noch kein Nachfolger ist; die Antwort einer
 * Entscheidung bleibt dabei erhalten.
 */
export function entfernen(status: WorkflowStatus[], id: ID): WorkflowStatus[] {
  const weg = status.find((s) => s.id === id);
  if (!weg) return status;
  const ersatz = weg.nachfolger.find((z) => z !== id);
  return status
    .filter((s) => s.id !== id)
    .map((s) => {
      if (!s.nachfolger.includes(id)) return s;
      const nachfolger: StatusZiel[] = [];
      for (const z of s.nachfolger) {
        const neu = z === id ? ersatz : z;
        if (neu === undefined || neu === s.id || nachfolger.includes(neu)) continue;
        nachfolger.push(neu);
      }
      return mitNachfolgern(s, nachfolger, ersatz !== undefined ? [[id, ersatz]] : []);
    });
}

/** Macht einen Nachfolger (eine Antwort) zum ersten – er bildet dann den Standardverlauf. */
export function alsStandard(status: WorkflowStatus[], id: ID, ziel: StatusZiel): WorkflowStatus[] {
  return status.map((s) =>
    s.id === id && s.nachfolger.includes(ziel)
      ? mitNachfolgern(s, [ziel, ...s.nachfolger.filter((z) => z !== ziel)])
      : s,
  );
}

/** Ersetzt einen Nachfolger – die Antwort bleibt; ein schon vorhandenes Ziel steht nicht doppelt. */
export function nachfolgerErsetzen(
  status: WorkflowStatus[],
  id: ID,
  alt: StatusZiel,
  neu: StatusZiel,
): WorkflowStatus[] {
  return status.map((s) => {
    if (s.id !== id) return s;
    const nachfolger = s.nachfolger.map((z) => (z === alt ? neu : z));
    const ohneDoppel = nachfolger.filter((z, i) => nachfolger.indexOf(z) === i);
    if (!s.entscheidung) return { ...s, nachfolger: ohneDoppel };
    // Die Antwort zieht zum neuen Ziel um (auch wenn es schon eine eigene hatte)
    const antworten = { ...s.entscheidung.antworten, [neu]: s.entscheidung.antworten[alt] ?? '' };
    return mitNachfolgern({ ...s, entscheidung: { ...s.entscheidung, antworten } }, ohneDoppel);
  });
}

/** Hängt einen Nachfolger an – bei einer Entscheidung mit vorbelegter Antwort. */
export function nachfolgerHinzufuegen(status: WorkflowStatus[], id: ID, ziel: StatusZiel): WorkflowStatus[] {
  return status.map((s) =>
    s.id === id && !s.nachfolger.includes(ziel) ? mitNachfolgern(s, [...s.nachfolger, ziel]) : s,
  );
}

/** Entfernt einen Nachfolger samt seiner Antwort. */
export function nachfolgerEntfernen(status: WorkflowStatus[], id: ID, ziel: StatusZiel): WorkflowStatus[] {
  return status.map((s) =>
    s.id === id
      ? mitNachfolgern(
          s,
          s.nachfolger.filter((z) => z !== ziel),
        )
      : s,
  );
}

/** Ändert den Text einer Antwort. */
export function antwortSetzen(status: WorkflowStatus[], id: ID, ziel: StatusZiel, text: string): WorkflowStatus[] {
  return status.map((s) =>
    s.id === id && s.entscheidung
      ? { ...s, entscheidung: { ...s.entscheidung, antworten: { ...s.entscheidung.antworten, [ziel]: text } } }
      : s,
  );
}

/**
 * Macht einen Status zur Entscheidung (Antworten „Ja“, „Nein“, „Antwort 3“ …
 * je Nachfolger) bzw. wieder zum gewöhnlichen Status (Frage und Antworten entfallen).
 */
export function typSetzen(status: WorkflowStatus[], id: ID, entscheidung: boolean): WorkflowStatus[] {
  return status.map((s) => {
    if (s.id !== id || !!s.entscheidung === entscheidung) return s;
    if (!entscheidung) return { ...s, entscheidung: null };
    return mitNachfolgern({ ...s, entscheidung: { frage: '', antworten: {} } }, s.nachfolger);
  });
}

/** Verschiebt einen Status in der Reihenfolge; der erste ist der Startstatus. */
export function verschieben(status: WorkflowStatus[], id: ID, richtung: -1 | 1): WorkflowStatus[] {
  const i = status.findIndex((s) => s.id === id);
  const j = i + richtung;
  if (i < 0 || j < 0 || j >= status.length) return status;
  const neu = [...status];
  [neu[i], neu[j]] = [neu[j], neu[i]];
  return neu;
}

/** Kopie eines Status direkt dahinter – mit denselben Nachfolgern und Antworten; noch führt nichts zu ihr. */
export function duplizieren(status: WorkflowStatus[], id: ID, neueId: ID): WorkflowStatus[] {
  const i = status.findIndex((s) => s.id === id);
  if (i < 0) return status;
  const alt = status[i];
  const kopie = mitNachfolgern(
    {
      ...alt,
      id: neueId,
      name: alt.name.trim() ? `${alt.name.trim()} (Kopie)` : '',
      frist: { ...alt.frist },
      entscheidung: alt.entscheidung
        ? { frage: alt.entscheidung.frage, antworten: { ...alt.entscheidung.antworten } }
        : null,
    },
    alt.nachfolger.filter((z) => z !== alt.id),
  );
  const neu = [...status];
  neu.splice(i + 1, 0, kopie);
  return neu;
}
