/**
 * Eigene To-Do-Liste: Aufgaben, die man sich selbst notiert oder aus einem
 * Protokoll übernimmt – auf Wunsch einem Projekt zugeordnet, als wichtig
 * markiert und in eigener Reihenfolge (die Reihenfolge in `todos`). Fällig und
 * überfällig gelten nach derselben Ampel wie bei den Aufgaben der Protokolle
 * (`ampelFuer`, `VORLAUF_TAGE`).
 */
import { ampelFuer, type Ampel, type Punkt } from './punkte';
import type { ID, ISODate, Projekt, Todo } from './types';

export function neuesTodo(
  id: ID,
  werte: Pick<Todo, 'text' | 'projektId' | 'termin'> & Partial<Pick<Todo, 'herkunft' | 'wichtig'>>,
  heute: ISODate,
): Todo {
  return {
    id,
    text: werte.text,
    notiz: '',
    wichtig: werte.wichtig ?? false,
    herkunft: werte.herkunft ?? null,
    projektId: werte.projektId,
    termin: werte.termin,
    status: 'offen',
    erledigtAm: '',
    angelegt: heute,
  };
}

/** Status setzen; „erledigt“ hält den Tag fest. */
export function todoErledigt(t: Todo, erledigt: boolean, heute: ISODate): Todo {
  return erledigt
    ? { ...t, status: 'erledigt', erledigtAm: t.erledigtAm || heute }
    : { ...t, status: 'offen', erledigtAm: '' };
}

export const todoAmpel = (t: Todo, heute?: ISODate): Ampel => ampelFuer(t.termin, t.status, heute);

/** Zeitkritisch: überfällig oder demnächst fällig. */
export const zeitkritisch = (t: Todo, heute?: ISODate): boolean => {
  const a = todoAmpel(t, heute);
  return a === 'ueberfaellig' || a === 'faellig';
};

/** Schlüssel der Karte „Ohne Projekt“ in `TodoKarten`. */
export const KARTE_OHNE = 'ohne';

/**
 * Reihenfolge aller Karten: zuerst die gespeicherte (soweit es die Karten
 * gibt), dann die übrigen in der Reihenfolge von `vorgabe`.
 */
export function kartenOrdnen(vorgabe: string[], reihenfolge: string[]): string[] {
  const da = new Set(vorgabe);
  const bekannt = [...new Set(reihenfolge)].filter((k) => da.has(k));
  const gesetzt = new Set(bekannt);
  return [...bekannt, ...vorgabe.filter((k) => !gesetzt.has(k))];
}

/**
 * Setzt die neue Reihenfolge der sichtbaren Karten in die aller Karten ein:
 * Sie nehmen nacheinander die Plätze ein, die sichtbare Karten bisher hatten –
 * ausgeblendete und gerade nicht gezeigte behalten ihre.
 */
export function kartenEinreihen(alle: string[], sichtbarNeu: string[]): string[] {
  const sichtbar = new Set(sichtbarNeu);
  let i = 0;
  return alle.map((k) => (sichtbar.has(k) ? sichtbarNeu[i++] : k));
}

/** Projekt einer Aufgabe; fehlt es (gelöscht), gilt sie als ohne Projekt. */
export const projektDes = (t: Todo, projekte: Projekt[]): Projekt | undefined =>
  t.projektId ? projekte.find((p) => p.id === t.projektId) : undefined;

/** Aufgabe der To-Do-Liste aus einer Aufgabe eines Protokolls – Text, Projekt und Termin, mit Fundstelle. */
export const todoAusAufgabe = (id: ID, a: Punkt, heute: ISODate): Todo =>
  neuesTodo(
    id,
    {
      text: a.text,
      projektId: a.projekt.id,
      termin: a.termin,
      herkunft: { protokollId: a.protokollId, quelleId: a.id, fundstelle: a.fundstelle },
    },
    heute,
  );

const norm = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();

/**
 * Steht die Aufgabe eines Protokolls schon in der To-Do-Liste? Ja, wenn sie
 * von genau dieser Stelle übernommen wurde – oder, weil ein Folgeprotokoll
 * neue Kennungen vergibt, wenn eine offene Aufgabe desselben Projekts
 * denselben Text trägt.
 */
export const inTodoListe = (todos: Todo[], a: Punkt): boolean =>
  todos.some(
    (t) =>
      t.herkunft?.quelleId === a.id ||
      (t.status !== 'erledigt' && t.projektId === a.projekt.id && norm(t.text) === norm(a.text)),
  );
