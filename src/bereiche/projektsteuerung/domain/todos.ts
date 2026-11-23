/**
 * Eigene To-Do-Liste: Aufgaben, die man sich selbst notiert – unabhängig von
 * den Protokollen, auf Wunsch einem Projekt zugeordnet. Fällig und überfällig
 * gelten nach derselben Ampel wie bei den Aufgaben der Protokolle
 * (`ampelFuer`, `VORLAUF_TAGE`).
 */
import { ampelFuer, type Ampel } from './punkte';
import type { ID, ISODate, Projekt, Todo } from './types';

export function neuesTodo(id: ID, werte: Pick<Todo, 'text' | 'projektId' | 'termin'>, heute: ISODate): Todo {
  return {
    id,
    text: werte.text,
    notiz: '',
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

const RANG: Record<Ampel, number> = { ueberfaellig: 0, faellig: 1, geplant: 2, ohneTermin: 3, erledigt: 4 };

/**
 * Offene zuerst – Überfälliges vorn, dann nach Termin, ohne Termin zuletzt –,
 * danach das Erledigte, zuletzt Erledigtes zuerst.
 */
export function todosSortiert(todos: Todo[], heute?: ISODate): Todo[] {
  return [...todos].sort((a, b) => {
    const rang = RANG[todoAmpel(a, heute)] - RANG[todoAmpel(b, heute)];
    if (rang) return rang;
    if (a.status === 'erledigt') return b.erledigtAm.localeCompare(a.erledigtAm);
    return (a.termin || '9999').localeCompare(b.termin || '9999') || a.angelegt.localeCompare(b.angelegt);
  });
}

/** Projekt einer Aufgabe; fehlt es (gelöscht), gilt sie als ohne Projekt. */
export const projektDes = (t: Todo, projekte: Projekt[]): Projekt | undefined =>
  t.projektId ? projekte.find((p) => p.id === t.projektId) : undefined;
