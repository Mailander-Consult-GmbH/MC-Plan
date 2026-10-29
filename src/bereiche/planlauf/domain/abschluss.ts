/**
 * Statuswechsel eines Prozessschritts – unabhängig von der Oberfläche.
 *
 * Die Funktionen beschreiben nur, was geschehen soll (die Änderungen am Lauf
 * und die Rückmeldung an die Bearbeiterin); geschrieben wird über den Store.
 * So verhalten sich der Planlauf, die Übersichtslisten – Fristen, Dashboard,
 * Pläne – und die Simulation (domain/simulation.ts) identisch.
 */
import { today } from '../../../shared/dates';
import {
  aktuelleSchritte,
  anstehendeSchritte,
  folgeImVerlauf,
  istErledigt,
  massgeblicheAntwort,
  ortImVerlauf,
  statusAbgleichen,
  verfolgen,
} from './ablauf';
import { kontaktName, rueckSprungAnwenden, seiteFuerSchritt, type AbschlussKontext } from './engine';
import {
  STEP_STATUS_LABEL,
  seiteAusFunktion,
  type AbschlussInfo,
  type ID,
  type ISODate,
  type PlanRun,
  type RunStep,
  type StepStatus,
} from './types';

/** Eine auszuführende Änderung am Lauf bzw. an einem Schritt. */
export type Aenderung =
  | { art: 'run'; patch: Partial<PlanRun> }
  | { art: 'step'; stepId: string; patch: Partial<RunStep> };

/** Ein ausgeführter Rücksprung bzw. eine erneute Bearbeitung. */
export interface Ruecksprung {
  /** `zweig`: innerhalb eines parallelen Zweigs; `oben`: im Hauptablauf; `wieder_geoeffnet`: erneute Bearbeitung. */
  art: 'zweig' | 'oben' | 'wieder_geoeffnet';
  zielId: ID;
  /** Schritt, der zurückführte (null beim Wieder öffnen). */
  ausloeserId: ID | null;
  /** Schritte, mit denen der neue Durchlauf beginnt. */
  eintritte: ID[];
}

export type Abschluss =
  /** Vor dem Erledigen muss erst die Freigabe- bzw. Prüfbericht-Nr. erfasst werden. */
  | { art: 'nachweis'; step: RunStep }
  | {
      art: 'aenderung';
      aenderungen: Aenderung[];
      meldung: string;
      /**
       * Alle Schritte, die nach dieser Änderung neu anstehen – Grundlage für
       * eine E-Mail. Termine erst nach dem Neuberechnen im Store aktuell; die
       * Oberfläche liest die Schritte daher über ihre IDs frisch aus dem Bestand.
       */
      naechste: RunStep[];
      ruecksprung: Ruecksprung | null;
      /** Der Lauf ist damit abgeschlossen. */
      abgeschlossen: boolean;
    };

export interface StatusOptionen {
  /** Ist-Datum des Abschlusses; ohne Angabe ein schon erfasstes Ist bzw. heute. */
  istDatum?: ISODate;
  /** Funktionen, Kontakte, Gewerk und Bearbeiter für die Momentaufnahme (abschlussInfo). */
  kontext?: AbschlussKontext;
  /** ISO-Zeitstempel des Vorgangs (Vorgabe: jetzt). */
  zeitpunkt?: string;
  /** Heutiges Datum (Vorgabe: today()). */
  heute?: ISODate;
  /** Wieder öffnen mit erneuter Bearbeitung: Eingang des neuen Durchlaufs (Vorgabe: heute). */
  eingang?: ISODate;
}

/**
 * Ein Nachweis wird verlangt, wenn der Schritt erfolgreich abgeschlossen
 * wird: bei Entscheidungen nur bei der ersten (zustimmenden) Antwort.
 */
export function braucheNachweis(step: RunStep, status: StepStatus): boolean {
  if (status !== 'erledigt' || step.nachweis === 'keine' || step.nachweisNummer) return false;
  if (step.typ !== 'entscheidung') return true;
  return massgeblicheAntwort(step)?.id === step.antworten[0]?.id;
}

/** Wendet Änderungen auf einen Lauf an (ohne Neuberechnung der Termine). */
export function aenderungenAufLauf(run: PlanRun, aenderungen: Aenderung[]): PlanRun {
  return aenderungen.reduce<PlanRun>(
    (lauf, a) =>
      a.art === 'run'
        ? { ...lauf, ...a.patch }
        : { ...lauf, steps: lauf.steps.map((s) => (s.id === a.stepId ? { ...s, ...a.patch } : s)) },
    run,
  );
}

/** Momentaufnahme beim Erledigen bzw. Überspringen. */
function abschlussInfoVon(step: RunStep, kontext: AbschlussKontext | undefined, zeitpunkt: string): AbschlussInfo {
  return {
    roleName: step.roleName,
    seite: kontext ? seiteFuerSchritt(step.roleName, kontext.rollen, kontext.gewerk) : seiteAusFunktion(step.roleName),
    kontaktName: kontext ? kontaktName(kontext.kontakte.find((c) => c.id === step.contactId)) : '',
    bearbeiter: kontext?.bearbeiter ?? '',
    zeitpunkt,
  };
}

/** Ergebnis einer Änderung der Schrittliste: neu anstehende Schritte und ggf. Abschluss des Laufs. */
function ergebnis(
  run: PlanRun,
  vorher: Set<ID>,
  steps: RunStep[],
  meldung: string,
  ruecksprung: Ruecksprung | null,
  extra: Partial<PlanRun> = {},
): Abschluss {
  const verlauf = verfolgen(steps);
  const anstehend = anstehendeSchritte(verlauf);
  const abgeschlossen =
    run.status === 'laufend' && anstehend.length === 0 && !verlauf.rueckSprungZu && verlauf.schritte.every(istErledigt);
  return {
    art: 'aenderung',
    aenderungen: [{ art: 'run', patch: { ...extra, steps, ...(abgeschlossen ? { status: 'abgeschlossen' as const } : {}) } }],
    meldung: abgeschlossen ? 'Alle Schritte erledigt – Planlauf abgeschlossen.' : meldung,
    naechste: anstehend.filter((s) => !vorher.has(s.id)),
    ruecksprung,
    abgeschlossen,
  };
}

/**
 * Setzt den Status eines Schritts und rückt den Lauf weiter.
 *
 * Beim Erledigen bzw. Überspringen: Ist = `optionen.istDatum`, sonst ein schon
 * erfasstes Ist, sonst heute; dazu die Momentaufnahme (Funktion, Seite, Person,
 * Bearbeiter, Zeitpunkt). Eine Entscheidung mit Nacharbeit-Antwort erhält die
 * Ursache „Planer“ als Vorbelegung. Danach wird – nur für den Zweig bzw. den
 * Verlauf des abgeschlossenen Schritts – geprüft:
 * * Zweig-Rücksprung, wenn der Zweig zurückführt und alle seine Schritte erledigt sind;
 * * Rücksprung im Hauptablauf, wenn er zurückführt und kein Verlaufsschritt mehr offen ist;
 * * sonst: nichts mehr offen → Lauf abgeschlossen; andernfalls werden alle jetzt
 *   anstehenden Schritte „laufend“.
 * „Offen“ bzw. „laufend“ an einem erledigten Schritt heißt Wieder öffnen.
 */
export function schrittStatusSetzen(
  run: PlanRun,
  step: RunStep,
  status: StepStatus,
  nachweisNummer?: string,
  optionen: StatusOptionen = {},
): Abschluss {
  const aktuell = run.steps.find((s) => s.id === step.id) ?? step;
  if (braucheNachweis(aktuell, status) && nachweisNummer === undefined) {
    return { art: 'nachweis', step: aktuell };
  }
  const heute = optionen.heute ?? today();
  const zeitpunkt = optionen.zeitpunkt ?? new Date().toISOString();
  const vorher = new Set(aktuelleSchritte(run).map((s) => s.id));

  if (status === 'offen' || status === 'laufend') {
    if (istErledigt(aktuell)) return wiederOeffnen(run, aktuell, undefined, optionen);
    const steps = run.steps.map((s) => (s.id === aktuell.id ? { ...s, status } : s));
    return ergebnis(run, vorher, steps, `„${aktuell.name}“: ${STEP_STATUS_LABEL[status]}`, null);
  }

  const antwort = aktuell.typ === 'entscheidung' ? massgeblicheAntwort(aktuell) : undefined;
  const abgeschlossenerSchritt: RunStep = {
    ...aktuell,
    status,
    istDatum: optionen.istDatum ?? aktuell.istDatum ?? heute,
    nachweisNummer: nachweisNummer !== undefined ? nachweisNummer : aktuell.nachweisNummer,
    gewaehlteAntwortId: antwort ? antwort.id : aktuell.gewaehlteAntwortId,
    abschlussInfo: abschlussInfoVon(aktuell, optionen.kontext, zeitpunkt),
    nacharbeitSeite: antwort?.nacharbeit ? (aktuell.nacharbeitSeite ?? 'planer') : null,
  };
  let steps = run.steps.map((s) => (s.id === aktuell.id ? abgeschlossenerSchritt : s));
  const verlauf = verfolgen(steps);
  const ort = ortImVerlauf(verlauf, aktuell.id);
  const optRueck = { heute, kontext: optionen.kontext };

  // Zweig-Rücksprung: der Zweig des Schritts führt zurück und ist durchlaufen
  if (ort?.art === 'zweig' && ort.zweig.rueckSprungZu && ort.zweig.schritte.every(istErledigt)) {
    const ziel = ort.zweig.rueckSprungZu;
    const ausloeser = ort.zweig.schritte[ort.zweig.schritte.length - 1];
    steps = rueckSprungAnwenden(steps, ziel.id, ausloeser, 'ruecksprung', zeitpunkt, optRueck);
    return ergebnis(run, vorher, steps, `Rücksprung zu „${ziel.name}“ – weiterer Durchlauf gestartet.`, {
      art: 'zweig',
      zielId: ziel.id,
      ausloeserId: ausloeser.id,
      eintritte: eintritteVon(steps, run.steps),
    });
  }

  // Rücksprung im Hauptablauf: der Verlauf führt zurück und nichts ist mehr offen
  if (ort && verlauf.rueckSprungZu && verlauf.schritte.every(istErledigt)) {
    const ziel = verlauf.rueckSprungZu;
    steps = rueckSprungAnwenden(steps, ziel.id, abgeschlossenerSchritt, 'ruecksprung', zeitpunkt, optRueck);
    return ergebnis(run, vorher, steps, `Rücksprung zu „${ziel.name}“ – weiterer Durchlauf gestartet.`, {
      art: 'oben',
      zielId: ziel.id,
      ausloeserId: abgeschlossenerSchritt.id,
      eintritte: eintritteVon(steps, run.steps),
    });
  }

  return ergebnis(run, vorher, statusAbgleichen(steps), `„${aktuell.name}“: ${STEP_STATUS_LABEL[status]}`, null);
}

/**
 * Die Schritte, mit denen nach einem Rücksprung der neue Durchlauf beginnt:
 * anstehend und entweder zurückgesetzt (anderer Durchlauf) oder bisher ohne Eingang.
 */
function eintritteVon(steps: RunStep[], alt: RunStep[]): ID[] {
  const vorher = new Map(alt.map((s) => [s.id, s]));
  return aktuelleSchritte({ steps })
    .filter((s) => {
      const a = vorher.get(s.id);
      return !a || a.durchlauf !== s.durchlauf || !a.eingangIst;
    })
    .map((s) => s.id);
}

/** Wie ein erledigter Schritt wieder geöffnet wird. */
export type WiederOeffnenArt = 'korrektur' | 'erneut';

/**
 * Korrektur (Fehlbedienung) ist möglich, solange kein Nachfolger im Verlauf
 * bzw. Zweig ein Ist hat; sonst nur erneute Bearbeitung.
 */
export function wiederOeffnenArt(run: Pick<PlanRun, 'steps'>, step: Pick<RunStep, 'id'>): WiederOeffnenArt {
  const folge = folgeImVerlauf(verfolgen(run.steps), step.id) ?? [];
  return folge.some((s) => s.id !== step.id && s.istDatum) ? 'erneut' : 'korrektur';
}

/**
 * Öffnet einen erledigten bzw. übersprungenen Schritt wieder.
 *
 * * **Korrektur**: Ist leeren, Schritt „laufend“; Nachfolger, die dadurch nicht
 *   mehr anstehen, warten wieder (ihr fester Eingang entfällt beim Neuberechnen).
 *   Nur zulässig, solange kein Nachfolger ein Ist hat – sonst wird erneut bearbeitet.
 * * **Erneute Bearbeitung**: ab diesem Schritt beginnt ein weiterer Durchlauf
 *   (wie ein Rücksprung mit Grund „wieder geöffnet“), Eingang = heute bzw.
 *   `optionen.eingang`; der bisherige Durchlauf bleibt in der Historie.
 *
 * Ein abgeschlossener Lauf läuft danach wieder.
 */
export function wiederOeffnen(
  run: PlanRun,
  step: RunStep,
  modus?: WiederOeffnenArt,
  optionen: StatusOptionen = {},
): Abschluss {
  const aktuell = run.steps.find((s) => s.id === step.id) ?? step;
  const vorher = new Set(aktuelleSchritte(run).map((s) => s.id));
  const wieder: Partial<PlanRun> = run.status === 'abgeschlossen' ? { status: 'laufend' } : {};
  const laufend = { ...run, status: 'laufend' as const };
  if (!istErledigt(aktuell)) return ergebnis(laufend, vorher, run.steps, `„${aktuell.name}“ ist nicht abgeschlossen.`, null, wieder);

  const art: WiederOeffnenArt = modus === 'erneut' ? 'erneut' : wiederOeffnenArt(run, aktuell);
  if (art === 'korrektur') {
    const steps = statusAbgleichen(
      run.steps.map((s) =>
        s.id === aktuell.id ? { ...s, status: 'laufend' as const, istDatum: null, abschlussInfo: null, nacharbeitSeite: null } : s,
      ),
    );
    return ergebnis(laufend, vorher, steps, `„${aktuell.name}“ wieder geöffnet.`, null, wieder);
  }

  const heute = optionen.heute ?? today();
  const zeitpunkt = optionen.zeitpunkt ?? new Date().toISOString();
  const steps = rueckSprungAnwenden(run.steps, aktuell.id, null, 'wieder_geoeffnet', zeitpunkt, {
    eingang: optionen.eingang ?? heute,
    heute,
    kontext: optionen.kontext,
  });
  return ergebnis(
    laufend,
    vorher,
    steps,
    `„${aktuell.name}“ wieder geöffnet – neuer Durchlauf begonnen.`,
    { art: 'wieder_geoeffnet', zielId: aktuell.id, ausloeserId: null, eintritte: eintritteVon(steps, run.steps) },
    wieder,
  );
}
