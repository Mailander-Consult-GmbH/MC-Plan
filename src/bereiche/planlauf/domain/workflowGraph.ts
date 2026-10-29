/**
 * Ein Workflow als Ablaufbild – Grundlage des grafischen Workflow-Editors.
 *
 * Die Schritte liegen als Liste vor; ein Übergang ohne Ziel (`null`) führt zum
 * nächsten Schritt der Liste (im Zweig eines parallelen Blocks: des Zweigs).
 * Aufgelöst werden Ziele ausschließlich über `nachfolger` in ablauf.ts.
 * Daraus entsteht hier
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
import {
  bloeckeOrdnen,
  nachfolger,
  strukturVon,
  zieleFestschreiben,
  zieleVereinfachen,
  type Struktur,
} from './ablauf';
import { verlaufDerKette } from './engine';
import { STANDARD_ANTWORTEN, istPrueferRolle, type Antwort, type ID, type ProcessTemplateStep, type StepType } from './types';

export type NeueId = (prefix: string) => string;

/** Ziel eines Übergangs nach dem Auflösen: ein Schritt oder das Ende des Planlaufs. */
export type Ziel = ID | 'ende';

/* ------------------------------------------------------------------ */
/* Neue Schritte                                                       */
/* ------------------------------------------------------------------ */

/** „Ja“ und „Nein“; jede Antwort außer der ersten führt in Nacharbeit. */
export function standardAntworten(neueId: NeueId): Antwort[] {
  return STANDARD_ANTWORTEN.map((text, i) => ({ id: neueId('ant'), text, ziel: null, nacharbeit: i > 0 }));
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
    parallel: null,
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
 * Löst ein Ziel über `nachfolger` (ablauf.ts) auf: `null` ist der nächste
 * Schritt der Liste bzw. des Zweigs, ein unbekanntes Ziel beendet den Ablauf
 * wie in `verlaufDerKette`. Das Ende eines Zweigs („Zweig beendet“) führt zum
 * Anschluss hinter dem Block, ein Ausstieg zu seinem Ziel.
 */
export function zielAufloesen(
  steps: ProcessTemplateStep[],
  index: number,
  ziel: ID | 'ende' | null,
  struktur: Struktur = strukturVon(steps),
): Ziel {
  const f = nachfolger(steps, index, ziel, struktur);
  if (f.art === 'schritt' || f.art === 'ausstieg') return steps[f.index].id;
  if (f.art === 'zweigende') {
    const lage = struktur.lage[index];
    return lage ? (steps[lage.block.ende]?.id ?? 'ende') : 'ende';
  }
  return 'ende';
}

/** Alle Übergänge eines Schritts – bei Entscheidungen einer je Antwort. */
export function kantenVon(
  steps: ProcessTemplateStep[],
  index: number,
  struktur: Struktur = strukturVon(steps),
): Omit<Kante, 'standard'>[] {
  const step = steps[index];
  if (step.typ === 'entscheidung' && step.antworten.length > 0) {
    return step.antworten.map((a) => ({
      von: step.id,
      nach: zielAufloesen(steps, index, a.ziel, struktur),
      antwortId: a.id,
      text: a.text,
    }));
  }
  return [{ von: step.id, nach: zielAufloesen(steps, index, step.naechster, struktur), antwortId: null, text: null }];
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
  const struktur = strukturVon(steps);
  const haupt = verlauf.schritte.map((s) => s.id);
  const position = new Map(haupt.map((id, k) => [id, k]));
  const index = new Map(steps.map((s, i) => [s.id, i]));

  const kanten: Kante[] = steps.flatMap((_, i) =>
    kantenVon(steps, i, struktur).map((k, nr) => {
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
    for (const k of kantenVon(steps, index.get(id)!, struktur)) {
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

/** Summe der Fristen im Standardverlauf; je paralleler Block zählt der längste Zweig. */
export function dauerImStandardverlauf(steps: ProcessTemplateStep[]): number {
  const frist = (liste: ProcessTemplateStep[]) => liste.reduce((summe, s) => summe + s.fristTage, 0);
  return verlaufDerKette(steps).abschnitte.reduce(
    (summe, a) =>
      summe + (a.art === 'schritt' ? a.step.fristTage : Math.max(0, ...a.zweige.map((z) => frist(z.schritte)))),
    0,
  );
}

/* ------------------------------------------------------------------ */
/* Bearbeiten                                                          */
/* ------------------------------------------------------------------ */

/**
 * Schreibt jedes „nächster Schritt“ (null) als feste ID bzw. Ende fest (im
 * Zweig: „Zweig beendet“ als `'ende'`). Danach darf die Liste umgestellt
 * werden, ohne dass sich der Ablauf ändert; `vereinfachen` macht daraus wieder
 * kurze Verweise. Beides über ablauf.ts.
 */
function festschreiben(steps: ProcessTemplateStep[]): ProcessTemplateStep[] {
  return zieleFestschreiben(steps);
}

/** Feste Verweise auf den nächsten Schritt der Liste bzw. des Zweigs werden wieder zu null. */
function vereinfachen(steps: ProcessTemplateStep[]): ProcessTemplateStep[] {
  return zieleVereinfachen(steps);
}

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
 * Ziel. Der neue Schritt steht in der Liste direkt hinter dem Ausgangsschritt
 * und gehört zu dessen Zweig; alle übrigen Übergänge behalten ihr Ziel.
 */
export function einfuegen(
  steps: ProcessTemplateStep[],
  vonId: ID,
  antwortId: ID | null,
  neu: ProcessTemplateStep,
  /** Neue Entscheidung: alle Antworten führen zunächst zum bisherigen Ziel. */
  alleAntworten = false,
): ProcessTemplateStep[] {
  const i = steps.findIndex((s) => s.id === vonId);
  if (i < 0) return [...steps, { ...neu, parallel: null }];
  // Feste Ziele: das Einfügen ändert sonst die Bedeutung von „nächster Schritt“
  const fest = festschreiben(steps);
  const von = fest[i];
  const antwort =
    von.typ === 'entscheidung' && von.antworten.length > 0
      ? (von.antworten.find((a) => a.id === antwortId) ?? von.antworten[0])
      : undefined;
  // Der neue Schritt führt dorthin, wohin der Übergang bisher führte
  const bisher: ID | 'ende' = (antwort ? antwort.ziel : von.naechster) ?? 'ende';
  const parallel = von.parallel ?? null;
  const eingefuegt: ProcessTemplateStep =
    neu.typ === 'entscheidung' && neu.antworten.length > 0
      ? {
          ...neu,
          parallel,
          naechster: null,
          antworten: neu.antworten.map((a, n) => (n === 0 || alleAntworten ? { ...a, ziel: bisher } : a)),
        }
      : { ...neu, parallel, naechster: bisher };
  const angepasst: ProcessTemplateStep = antwort
    ? { ...von, antworten: von.antworten.map((a) => (a.id === antwort.id ? { ...a, ziel: eingefuegt.id } : a)) }
    : { ...von, naechster: eingefuegt.id };

  return vereinfachen([...fest.slice(0, i), angepasst, eingefuegt, ...fest.slice(i + 1)]);
}

/** Fügt einen neuen ersten Schritt ein; er führt zum bisherigen ersten Schritt. */
export function einfuegenAmAnfang(steps: ProcessTemplateStep[], neu: ProcessTemplateStep): ProcessTemplateStep[] {
  const eingefuegt =
    neu.typ === 'entscheidung' && neu.antworten.length > 0
      ? { ...neu, parallel: null, naechster: null, antworten: neu.antworten.map((a) => ({ ...a, ziel: null })) }
      : { ...neu, parallel: null, naechster: null };
  return [eingefuegt, ...steps];
}

/**
 * Entfernt einen Schritt. Übergänge, die zu ihm führten, führen danach dorthin
 * weiter, wohin er im Standardverlauf geführt hat – der Ablauf reißt nicht ab.
 * War er der erste Schritt, beginnt der Ablauf bei seinem Ziel. Bei einem
 * Schritt eines Blocks gilt das innerhalb seines Zweigs; Verweise von außen
 * führen weiter in den Block. Zuletzt werden die Blockregeln wiederhergestellt
 * (ein Block mit nur noch einem Zweig wird aufgelöst).
 */
export function entfernen(steps: ProcessTemplateStep[], id: ID): ProcessTemplateStep[] {
  const i = steps.findIndex((s) => s.id === id);
  if (i < 0) return steps;
  const struktur = strukturVon(steps);
  const lage = struktur.lage[i];
  const fest = festschreiben(steps);
  const entfernt = fest[i];
  // Fest geschrieben: das Ziel des Standardübergangs (im Zweig: 'ende' = Zweig beendet)
  const weiterZu: ID | 'ende' =
    (entfernt.typ === 'entscheidung' && entfernt.antworten.length > 0 ? entfernt.antworten[0].ziel : entfernt.naechster) ??
    'ende';
  const ersatz: ID | 'ende' = weiterZu === id ? 'ende' : weiterZu;
  // Verweise von außerhalb des Blocks führen weiter in den Block
  const blockErsatz = lage
    ? (lage.block.zweige.flat().map((k) => steps[k].id).find((x) => x !== id) ?? ersatz)
    : ersatz;
  let rest = fest
    .map((s, k) => ({ s, k }))
    .filter(({ s }) => s.id !== id)
    .map(({ s, k }) => {
      const eigene = struktur.lage[k];
      const gleicherZweig = Boolean(lage && eigene && eigene.block === lage.block && eigene.zweig === lage.zweig);
      const andererZweig = Boolean(lage && eigene && eigene.block === lage.block && !gleicherZweig);
      const ziel = !lage || gleicherZweig ? ersatz : andererZweig ? 'ende' : blockErsatz;
      // Ein Verweis, der nun auf den Schritt selbst zeigte, führt zum nächsten der Liste
      const umbiegen = (z: ID | 'ende' | null) => (z === id ? (ziel === s.id ? null : ziel) : z);
      return { ...s, naechster: umbiegen(s.naechster), antworten: s.antworten.map((a) => ({ ...a, ziel: umbiegen(a.ziel) })) };
    });
  if (i === 0 && !lage && ersatz !== 'ende') {
    const start = rest.find((s) => s.id === ersatz);
    if (start) rest = [start, ...rest.filter((s) => s !== start)];
  }
  return bloeckeOrdnen(vereinfachen(rest));
}

/**
 * Verschiebt einen Schritt des Standardverlaufs um eine Stelle nach vorn bzw.
 * hinten – im Ablauf, nicht nur in der Liste. Abweichungen bleiben, wo sie sind.
 */
export function imVerlaufVerschieben(steps: ProcessTemplateStep[], id: ID, richtung: -1 | 1): ProcessTemplateStep[] {
  const { haupt } = gliedern(steps);
  const k = haupt.indexOf(id);
  if (k < 0 || (richtung === -1 && k === 0) || (richtung === 1 && k >= haupt.length - 1)) return steps;
  const schritt = festschreiben(steps).find((s) => s.id === id)!;
  const ohne = festschreiben(entfernen(steps, id));
  // Einfügen hinter dem Schritt, der danach unmittelbar davor stehen soll
  const vor = richtung === -1 ? (k >= 2 ? haupt[k - 2] : null) : haupt[k + 1];
  let ergebnis: ProcessTemplateStep[];
  if (vor === null) {
    const erster = ohne[0]?.id ?? 'ende';
    const neu =
      schritt.typ === 'entscheidung' && schritt.antworten.length > 0
        ? { ...schritt, antworten: schritt.antworten.map((a, n) => (n === 0 ? { ...a, ziel: erster } : a)) }
        : { ...schritt, naechster: erster };
    ergebnis = [neu, ...ohne];
  } else {
    const vi = ohne.findIndex((s) => s.id === vor);
    ergebnis = einfuegen(ohne, vor, standardKante(ohne, vi).antwortId, schritt);
  }
  return vereinfachen(festschreiben(ergebnis));
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
      // Bisher vorhandene Antworten behalten ihr Ziel, neue führen dorthin, wohin die Aufgabe führte
      antworten: step.antworten.length > 0 ? antworten : antworten.map((a) => ({ ...a, ziel: step.naechster })),
    };
  }
  return { ...step, typ, naechster: step.antworten.length > 0 ? step.antworten[0].ziel : step.naechster, antworten: [] };
}

/** Prüfende Funktionen verlangen regelmäßig einen Prüfbericht. */
export function funktionSetzen(step: ProcessTemplateStep, roleName: string): ProcessTemplateStep {
  return {
    ...step,
    roleName,
    nachweis: step.nachweis === 'keine' && istPrueferRolle(roleName) ? 'pruefbericht' : step.nachweis,
  };
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

/**
 * Antworten ohne Text erhalten beim Speichern „Ja“, „Nein“ bzw. „Antwort n“;
 * parallele Blöcke werden geordnet (siehe `bloeckeOrdnen` in ablauf.ts).
 */
export function bereinigen(steps: ProcessTemplateStep[]): ProcessTemplateStep[] {
  return bloeckeOrdnen(steps.map((s) => ({
    ...s,
    name: s.name.trim(),
    roleName: s.roleName.trim(),
    // Bei Entscheidungen bestimmen die Antworten den Verlauf
    naechster: s.typ === 'entscheidung' && s.antworten.length > 0 ? null : s.naechster,
    antworten:
      s.typ === 'entscheidung'
        ? s.antworten.map((a, i) => ({
            ...a,
            text: a.text.trim() || STANDARD_ANTWORTEN[i] || `Antwort ${i + 1}`,
            nacharbeit: a.nacharbeit ?? i > 0,
          }))
        : [],
    parallel: s.parallel ?? null,
  })));
}
