/**
 * Ein Workflow als Ablaufbild – Grundlage des grafischen Workflow-Editors.
 *
 * Die Schritte liegen als Liste vor; ein Übergang ohne Ziel (`null`) führt zum
 * nächsten Schritt der Liste. Daraus entsteht hier
 *  - der **Standardverlauf**: der Weg, den ein Planlauf nimmt, wenn jede
 *    Entscheidung mit ihrer ersten Antwort beantwortet wird (wie `pfad` in
 *    engine.ts),
 *  - die **Abweichungen**: Schritte, die nur über eine andere Antwort erreicht
 *    werden (z. B. „Rückmeldung an Planer“), je mit dem Schritt des
 *    Standardverlaufs, neben dem sie stehen,
 *  - die **Kanten**: jeder Übergang mit aufgelöstem Ziel.
 *
 * Dazu kommen die Bearbeitungen, die beim Einfügen und Entfernen den übrigen
 * Ablauf erhalten. Alles ist rein fachlich und ohne Oberfläche; neue IDs
 * werden von außen übergeben, damit die Funktionen auch im StrictMode
 * gefahrlos doppelt laufen können.
 */
import { verlaufDerKette } from './engine';
import { STANDARD_ANTWORTEN, istPrueferRolle, type Antwort, type ID, type ProcessTemplateStep, type StepType } from './types';

export type NeueId = (prefix: string) => string;

/** Ziel eines Übergangs nach dem Auflösen: ein Schritt oder das Ende des Planlaufs. */
export type Ziel = ID | 'ende';

/* ------------------------------------------------------------------ */
/* Neue Schritte                                                       */
/* ------------------------------------------------------------------ */

export function standardAntworten(neueId: NeueId): Antwort[] {
  return STANDARD_ANTWORTEN.map((text) => ({ id: neueId('ant'), text, ziel: null }));
}

/** Leerer Schritt – Entscheidungen mit den Antworten „Ja“ und „Nein“. */
export function neuerSchritt(typ: StepType, neueId: NeueId): ProcessTemplateStep {
  return {
    id: neueId('ts'),
    name: '',
    typ,
    roleName: '',
    fristTage: 5,
    beschreibung: '',
    antworten: typ === 'entscheidung' ? standardAntworten(neueId) : [],
    naechster: null,
    nachweis: 'keine',
    mailFrage: false,
    mailVorlageId: null,
  };
}

/* ------------------------------------------------------------------ */
/* Kanten                                                              */
/* ------------------------------------------------------------------ */

/** Ein Übergang von einem Schritt zum nächsten. */
export interface Kante {
  von: ID;
  nach: Ziel;
  /** Antwort einer Entscheidung; null bei „weiter mit“ einer Aufgabe. */
  antwortId: ID | null;
  /** Antworttext, sonst null. */
  text: string | null;
  /**
   * Teil des Standardverlaufs: der Übergang zwischen zwei aufeinander
   * folgenden Schritten des Standardverlaufs bzw. vom letzten zum Ende.
   */
  standard: boolean;
}

/**
 * Löst ein Ziel auf: `null` ist der nächste Schritt der Liste (am Listenende
 * das Ende), ein unbekanntes Ziel beendet den Ablauf wie in `verlaufDerKette`.
 */
export function zielAufloesen(steps: ProcessTemplateStep[], index: number, ziel: ID | 'ende' | null): Ziel {
  if (ziel === 'ende') return 'ende';
  if (ziel !== null) return steps.some((s) => s.id === ziel) ? ziel : 'ende';
  return steps[index + 1]?.id ?? 'ende';
}

/** Alle Übergänge eines Schritts – bei Entscheidungen einer je Antwort. */
export function kantenVon(steps: ProcessTemplateStep[], index: number): Omit<Kante, 'standard'>[] {
  const step = steps[index];
  if (step.typ === 'entscheidung' && step.antworten.length > 0) {
    return step.antworten.map((a) => ({
      von: step.id,
      nach: zielAufloesen(steps, index, a.ziel),
      antwortId: a.id,
      text: a.text,
    }));
  }
  return [{ von: step.id, nach: zielAufloesen(steps, index, step.naechster), antwortId: null, text: null }];
}

/** Der Übergang, dem der Standardverlauf folgt: die erste Antwort bzw. „weiter mit“. */
export function standardKante(steps: ProcessTemplateStep[], index: number): Omit<Kante, 'standard'> {
  return kantenVon(steps, index)[0];
}

/* ------------------------------------------------------------------ */
/* Gliederung für das Ablaufbild                                       */
/* ------------------------------------------------------------------ */

export interface Gliederung {
  /** Schritte des Standardverlaufs in ihrer Reihenfolge. */
  haupt: ID[];
  /** Der Standardverlauf endet mit einem Rücksprung zu diesem Schritt (Schleife). */
  rueckSprungZu: ID | null;
  /**
   * Schritte, die nur über andere Antworten erreicht werden; `anker` ist der
   * Index des Schritts im Standardverlauf, neben dem sie stehen.
   */
  abweichungen: { id: ID; anker: number }[];
  /** Schritte, zu denen kein Übergang führt. */
  unerreichbar: ID[];
  kanten: Kante[];
}

export function gliedern(steps: ProcessTemplateStep[]): Gliederung {
  if (steps.length === 0) return { haupt: [], rueckSprungZu: null, abweichungen: [], unerreichbar: [], kanten: [] };

  const verlauf = verlaufDerKette(steps);
  const haupt = verlauf.schritte.map((s) => s.id);
  const position = new Map(haupt.map((id, k) => [id, k]));
  const index = new Map(steps.map((s, i) => [s.id, i]));

  const kanten: Kante[] = steps.flatMap((_, i) =>
    kantenVon(steps, i).map((k, nr) => {
      const p = position.get(k.von);
      // Standard ist nur der maßgebliche Übergang zum unmittelbar folgenden Schritt des
      // Standardverlaufs – beim letzten Schritt der zum Ende (nicht ein Rücksprung)
      const standard =
        nr === 0 && p !== undefined && (p + 1 < haupt.length ? haupt[p + 1] === k.nach : k.nach === 'ende');
      return { ...k, standard };
    }),
  );

  // Erreichbarkeit und Anker: vom Standardverlauf aus in Breitensuche
  const anker = new Map<ID, number>();
  const reihenfolge: ID[] = [];
  const warteschlange: ID[] = [...haupt];
  const bekannt = new Set<ID>(haupt);
  while (warteschlange.length > 0) {
    const id = warteschlange.shift()!;
    const eigenerAnker = position.get(id) ?? anker.get(id) ?? 0;
    for (const k of kantenVon(steps, index.get(id)!)) {
      if (k.nach === 'ende' || bekannt.has(k.nach)) continue;
      bekannt.add(k.nach);
      anker.set(k.nach, eigenerAnker);
      reihenfolge.push(k.nach);
      warteschlange.push(k.nach);
    }
  }

  const abweichungen = reihenfolge
    .map((id, entdeckt) => ({ id, anker: anker.get(id)!, entdeckt }))
    .sort((a, b) => a.anker - b.anker || a.entdeckt - b.entdeckt)
    .map(({ id, anker: a }) => ({ id, anker: a }));

  return {
    haupt,
    rueckSprungZu: verlauf.rueckSprungZu?.id ?? null,
    abweichungen,
    unerreichbar: steps.filter((s) => !bekannt.has(s.id)).map((s) => s.id),
    kanten,
  };
}

/** Summe der Fristen im Standardverlauf. */
export function dauerImStandardverlauf(steps: ProcessTemplateStep[]): number {
  return verlaufDerKette(steps).schritte.reduce((summe, s) => summe + s.fristTage, 0);
}

/* ------------------------------------------------------------------ */
/* Bearbeiten                                                          */
/* ------------------------------------------------------------------ */

/** Setzt das Ziel eines Übergangs (Antwort oder „weiter mit“). */
export function zielSetzen(
  steps: ProcessTemplateStep[],
  vonId: ID,
  antwortId: ID | null,
  ziel: ID | 'ende' | null,
): ProcessTemplateStep[] {
  return steps.map((s) => {
    if (s.id !== vonId) return s;
    if (antwortId === null) return { ...s, naechster: ziel };
    return { ...s, antworten: s.antworten.map((a) => (a.id === antwortId ? { ...a, ziel } : a)) };
  });
}

/**
 * Fügt einen neuen Schritt in einen Übergang ein: vorher → neu → bisheriges
 * Ziel. Der neue Schritt steht in der Liste direkt hinter dem Ausgangsschritt;
 * alle übrigen Übergänge behalten ihr Ziel.
 */
export function einfuegen(
  steps: ProcessTemplateStep[],
  vonId: ID,
  antwortId: ID | null,
  neu: ProcessTemplateStep,
): ProcessTemplateStep[] {
  const i = steps.findIndex((s) => s.id === vonId);
  if (i < 0) return [...steps, neu];
  const von = steps[i];
  const alterNachfolger = steps[i + 1]?.id ?? null;
  const kante = kantenVon(steps, i).find((k) => k.antwortId === antwortId) ?? standardKante(steps, i);
  const bisher = kante.nach;

  // Der neue Schritt führt dorthin, wohin der Übergang bisher führte
  const weiter: ID | 'ende' | null = bisher === 'ende' ? 'ende' : bisher === alterNachfolger ? null : bisher;
  const eingefuegt: ProcessTemplateStep =
    neu.typ === 'entscheidung' && neu.antworten.length > 0
      ? { ...neu, naechster: null, antworten: neu.antworten.map((a, n) => (n === 0 ? { ...a, ziel: weiter } : a)) }
      : { ...neu, naechster: weiter };

  // „Nächster Schritt“ meint nach dem Einfügen den neuen Schritt. Übergänge,
  // die nicht eingefügt werden sollen, zeigen deshalb ausdrücklich auf den
  // bisherigen Nachfolger.
  const bisherigerNachfolger: ID | 'ende' = alterNachfolger ?? 'ende';
  const istDieseKante = (aId: ID | null) => aId === kante.antwortId;
  const angepasst: ProcessTemplateStep =
    von.typ === 'entscheidung' && von.antworten.length > 0
      ? {
          ...von,
          antworten: von.antworten.map((a) =>
            istDieseKante(a.id) ? { ...a, ziel: null } : a.ziel === null ? { ...a, ziel: bisherigerNachfolger } : a,
          ),
        }
      : { ...von, naechster: null };

  return [...steps.slice(0, i), angepasst, eingefuegt, ...steps.slice(i + 1)];
}

/** Fügt einen neuen ersten Schritt ein; er führt zum bisherigen ersten Schritt. */
export function einfuegenAmAnfang(steps: ProcessTemplateStep[], neu: ProcessTemplateStep): ProcessTemplateStep[] {
  const eingefuegt =
    neu.typ === 'entscheidung' && neu.antworten.length > 0
      ? { ...neu, naechster: null, antworten: neu.antworten.map((a) => ({ ...a, ziel: null })) }
      : { ...neu, naechster: null };
  return [eingefuegt, ...steps];
}

/**
 * Entfernt einen Schritt. Übergänge, die zu ihm führten, führen danach dorthin
 * weiter, wohin er im Standardverlauf geführt hat – der Ablauf reißt nicht ab.
 */
export function entfernen(steps: ProcessTemplateStep[], id: ID): ProcessTemplateStep[] {
  const i = steps.findIndex((s) => s.id === id);
  if (i < 0) return steps;
  const weiterZu = standardKante(steps, i).nach;
  // Ein Schritt, der auf sich selbst zeigt, hinterlässt das Ende
  const ersatz: ID | 'ende' = weiterZu === id ? 'ende' : weiterZu;
  // Der Listennachfolger des Vorgängers wird nach dem Entfernen dieser Schritt hier
  const nachfolgerDanach: ID | 'ende' = steps[i + 1]?.id ?? 'ende';

  const umbiegen = (ziel: ID | 'ende' | null, istVorgaenger: boolean): ID | 'ende' | null => {
    if (ziel === id) return ersatz;
    if (ziel === null && istVorgaenger && ersatz !== nachfolgerDanach) return ersatz;
    return ziel;
  };

  return steps
    .filter((s) => s.id !== id)
    .map((s) => {
      const vorgaenger = steps.indexOf(s) === i - 1;
      return {
        ...s,
        naechster: umbiegen(s.naechster, vorgaenger),
        antworten: s.antworten.map((a) => ({ ...a, ziel: umbiegen(a.ziel, vorgaenger) })),
      };
    });
}

/** Kopie eines Schritts, eingefügt direkt hinter ihm im Standardverlauf. */
export function duplizieren(steps: ProcessTemplateStep[], id: ID, neueId: NeueId): ProcessTemplateStep[] {
  const original = steps.find((s) => s.id === id);
  if (!original) return steps;
  const kopie: ProcessTemplateStep = {
    ...original,
    id: neueId('ts'),
    name: original.name ? `${original.name} (Kopie)` : '',
    antworten: original.antworten.map((a) => ({ ...a, id: neueId('ant') })),
  };
  return einfuegen(steps, id, standardKante(steps, steps.indexOf(original)).antwortId, kopie);
}

/**
 * Wechselt die Art eines Schritts. Der Standardverlauf bleibt dabei erhalten:
 * Aus „weiter mit“ wird das Ziel der ersten Antwort und umgekehrt.
 */
export function artSetzen(step: ProcessTemplateStep, typ: StepType, neueId: NeueId): ProcessTemplateStep {
  if (step.typ === typ) return step;
  if (typ === 'entscheidung') {
    const antworten = step.antworten.length > 0 ? step.antworten : standardAntworten(neueId);
    return {
      ...step,
      typ,
      naechster: null,
      antworten: antworten.map((a, n) => (n === 0 ? { ...a, ziel: step.naechster } : a)),
    };
  }
  return { ...step, typ, naechster: step.antworten[0]?.ziel ?? step.naechster, antworten: [] };
}

/** Prüfende Funktionen verlangen regelmäßig einen Prüfbericht. */
export function funktionSetzen(step: ProcessTemplateStep, roleName: string): ProcessTemplateStep {
  return {
    ...step,
    roleName,
    nachweis: step.nachweis === 'keine' && istPrueferRolle(roleName) ? 'pruefbericht' : step.nachweis,
  };
}

/** Verschiebt einen Schritt in der Liste um eine Stelle. */
export function verschieben(steps: ProcessTemplateStep[], id: ID, richtung: -1 | 1): ProcessTemplateStep[] {
  const i = steps.findIndex((s) => s.id === id);
  const ziel = i + richtung;
  if (i < 0 || ziel < 0 || ziel >= steps.length) return steps;
  const neu = [...steps];
  [neu[i], neu[ziel]] = [neu[ziel], neu[i]];
  return neu;
}

/** Macht eine Antwort zur ersten – ihr Weg wird damit zum Standardverlauf. */
export function alsStandard(steps: ProcessTemplateStep[], vonId: ID, antwortId: ID): ProcessTemplateStep[] {
  return steps.map((s) => {
    if (s.id !== vonId) return s;
    const a = s.antworten.find((x) => x.id === antwortId);
    if (!a) return s;
    return { ...s, antworten: [a, ...s.antworten.filter((x) => x.id !== antwortId)] };
  });
}

/* ------------------------------------------------------------------ */
/* Prüfung                                                             */
/* ------------------------------------------------------------------ */

export interface Hinweis {
  stepId: ID | null;
  text: string;
  /** Verhindert das Speichern. */
  sperrt: boolean;
}

export function pruefen(steps: ProcessTemplateStep[]): Hinweis[] {
  if (steps.length === 0) return [{ stepId: null, text: 'Der Workflow hat noch keinen Schritt.', sperrt: true }];
  const { unerreichbar } = gliedern(steps);
  const hinweise: Hinweis[] = [];
  steps.forEach((s, i) => {
    const nr = String(i + 1).padStart(2, '0');
    if (!s.name.trim()) hinweise.push({ stepId: s.id, text: `Schritt ${nr} hat keine Bezeichnung.`, sperrt: true });
    if (s.typ === 'entscheidung' && s.antworten.length === 0)
      hinweise.push({ stepId: s.id, text: `Entscheidung ${nr} hat keine Antwort.`, sperrt: true });
    if (!s.roleName.trim())
      hinweise.push({ stepId: s.id, text: `Schritt ${nr} hat keine verantwortliche Funktion.`, sperrt: false });
  });
  for (const id of unerreichbar) {
    const i = steps.findIndex((s) => s.id === id);
    hinweise.push({
      stepId: id,
      text: `Schritt ${String(i + 1).padStart(2, '0')} wird nie erreicht – kein Übergang führt zu ihm.`,
      sperrt: false,
    });
  }
  return hinweise;
}

/** Antworten ohne Text erhalten beim Speichern „Ja“, „Nein“ bzw. „Antwort n“. */
export function bereinigen(steps: ProcessTemplateStep[]): ProcessTemplateStep[] {
  return steps.map((s) => ({
    ...s,
    name: s.name.trim(),
    roleName: s.roleName.trim(),
    antworten:
      s.typ === 'entscheidung'
        ? s.antworten.map((a, i) => ({ ...a, text: a.text.trim() || STANDARD_ANTWORTEN[i] || `Antwort ${i + 1}` }))
        : [],
  }));
}
