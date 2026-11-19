/**
 * Rollen und Personenverzeichnis – für alle Bereiche.
 *
 * Drei Rollen bauen aufeinander auf:
 *
 *   Projektmitarbeiter  alle Funktionen in den Projekten, ohne die
 *                       projektübergreifenden Einstellungen
 *   Projektadmin        zusätzlich die projektübergreifenden Einstellungen
 *                       (Workflows, Funktionen, Vorlagen, Fristen)
 *   KaPlan-Admin        zusätzlich der Bereich „Admin“: Personen einladen,
 *                       Rollen zuweisen, Sicherung einspielen
 *
 * Wer welche Rolle hat, steht im Personenverzeichnis (Schlüssel
 * `kaplan-personen.v1`). Vorbereitung auf die Anmeldung über das
 * Microsoft-Konto: Dann sagt die Anmeldung, wer jemand ist, und das
 * Verzeichnis, was die Person darf. Solange KaPlan ohne Anmeldung und ohne
 * Server läuft, gilt die Rolle der Person, deren Name unter „Angemeldet als“
 * steht – das Verzeichnis liegt im Browser, **geschützt ist damit nichts**.
 *
 * Damit bis dahin niemand etwas verliert:
 *   * Ist das Verzeichnis leer, ist die Person am Gerät KaPlan-Admin.
 *   * Steht ihr Name nicht im Verzeichnis, ist sie Projektmitarbeiter.
 *   * Es bleibt stets mindestens ein KaPlan-Admin (`letzterAdmin`).
 *
 * „Ansicht als“ (`ansichtSetzen`) zeigt einem KaPlan-Admin die Oberfläche
 * einer anderen Rolle – nur für dieses Fenster, bis zum Neuladen.
 */
import { useSyncExternalStore } from 'react';
import { benutzerLesen, useBenutzer } from './benutzer';

export type Rolle = 'mitarbeiter' | 'projektadmin' | 'kaplanadmin';

export const ROLLEN: { id: Rolle; name: string; beschreibung: string }[] = [
  {
    id: 'mitarbeiter',
    name: 'Projektmitarbeiter',
    beschreibung: 'Alle Funktionen in den Projekten – ohne die projektübergreifenden Einstellungen.',
  },
  {
    id: 'projektadmin',
    name: 'Projektadmin',
    beschreibung: 'Zusätzlich die projektübergreifenden Einstellungen: Workflows, Funktionen, Vorlagen und Fristen.',
  },
  {
    id: 'kaplanadmin',
    name: 'KaPlan-Admin',
    beschreibung: 'Zusätzlich der Bereich „Admin“: Personen einladen, Rollen zuweisen und Sicherungen einspielen.',
  },
];

export const rollenName = (rolle: Rolle): string => ROLLEN.find((r) => r.id === rolle)?.name ?? rolle;

/** Was eine Rolle freischaltet. */
export type Recht =
  /** Projektübergreifende Einstellungen (Menügruppe „Einstellungen“ der Bereiche). */
  | 'einstellungen'
  /** Der Bereich „Admin“. */
  | 'admin';

export function darf(rolle: Rolle, recht: Recht): boolean {
  return recht === 'admin' ? rolle === 'kaplanadmin' : rolle !== 'mitarbeiter';
}

export interface Person {
  id: string;
  /** Vor- und Nachname – solange es keine Anmeldung gibt, das Merkmal, an dem die Person erkannt wird. */
  name: string;
  /** Für die Einladung und später für die Anmeldung über das Microsoft-Konto. */
  email: string;
  rolle: Rolle;
  /** Zeitpunkt des Eintrags (ISO). */
  eingeladenAm: string;
}

const KEY = 'kaplan-personen.v1';

type Roh = Record<string, unknown>;
const text = (w: unknown) => (typeof w === 'string' ? w.trim() : '');
const rolleVon = (w: unknown): Rolle => (w === 'projektadmin' || w === 'kaplanadmin' ? w : 'mitarbeiter');

/** Namen vergleichen: ohne Groß- und Kleinschreibung, mehrfache Leerzeichen zählen nicht. */
const schluessel = (name: string) => name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('de');

export const gleicherName = (a: string, b: string): boolean => schluessel(a) === schluessel(b);

function laden(): Person[] {
  try {
    const roh = localStorage.getItem(KEY);
    const d = roh ? (JSON.parse(roh) as Roh) : null;
    const liste = d && Array.isArray(d.personen) ? (d.personen as Roh[]) : [];
    return liste
      .filter((p) => p && typeof p === 'object' && text(p.id) && text(p.name))
      .map((p) => ({
        id: text(p.id),
        name: text(p.name),
        email: text(p.email),
        rolle: rolleVon(p.rolle),
        eingeladenAm: text(p.eingeladenAm),
      }));
  } catch {
    return [];
  }
}

let stand: Person[] | null = null;
let ansicht: Rolle | null = null;
const hoerer = new Set<() => void>();
const melden = () => hoerer.forEach((h) => h());

export function personenLesen(): Person[] {
  if (!stand) stand = laden();
  return stand;
}

function speichern(personen: Person[]): boolean {
  stand = personen;
  let gespeichert = true;
  try {
    localStorage.setItem(KEY, JSON.stringify({ version: 1, personen }));
  } catch (fehler) {
    console.warn('Das Personenverzeichnis konnte nicht gespeichert werden:', fehler);
    gespeichert = false;
  }
  melden();
  return gespeichert;
}

function abonnieren(h: () => void): () => void {
  hoerer.add(h);
  return () => hoerer.delete(h);
}

// Ein anderes Fenster hat das Verzeichnis geändert: neu laden.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY || !stand) return;
    stand = null;
    melden();
  });
}

/** Rolle einer Person nach ihrem Namen – siehe die Regeln im Kopf der Datei. */
export function rolleVonName(name: string, personen: Person[]): Rolle {
  if (personen.length === 0) return 'kaplanadmin';
  return personen.find((p) => schluessel(p.name) === schluessel(name))?.rolle ?? 'mitarbeiter';
}

/** Ob das Entfernen oder Herabstufen dieser Person den letzten KaPlan-Admin nähme. */
export function letzterAdmin(person: Person, personen: Person[]): boolean {
  return person.rolle === 'kaplanadmin' && personen.filter((p) => p.rolle === 'kaplanadmin').length === 1;
}

/** Ob der Name schon im Verzeichnis steht (bei `ausser` die Person selbst nicht mitgezählt). */
export function nameVergeben(name: string, personen: Person[], ausser?: string): boolean {
  return personen.some((p) => p.id !== ausser && schluessel(p.name) === schluessel(name));
}

const neueId = () => `person-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Trägt eine Person ein. Ist das Verzeichnis noch leer, kommt zuerst die
 * Person am Gerät als KaPlan-Admin hinein – sonst verlöre sie mit dem ersten
 * Eintrag ihre Rolle. Liefert, ob gespeichert werden konnte.
 */
export function personEintragen(neu: { name: string; email: string; rolle: Rolle }): boolean {
  const jetzt = new Date().toISOString();
  const bisher = personenLesen();
  const liste = [...bisher];
  const ich = benutzerLesen().name;
  if (bisher.length === 0 && schluessel(ich) !== schluessel(neu.name)) {
    liste.push({ id: neueId(), name: ich, email: '', rolle: 'kaplanadmin', eingeladenAm: jetzt });
  }
  liste.push({
    id: neueId(),
    name: neu.name.trim().replace(/\s+/g, ' '),
    email: neu.email.trim(),
    // Die erste Person im Verzeichnis ist immer KaPlan-Admin
    rolle: liste.length === 0 ? 'kaplanadmin' : neu.rolle,
    eingeladenAm: jetzt,
  });
  return speichern(liste);
}

/** Ändert Name, E-Mail oder Rolle – nie so, dass kein KaPlan-Admin bleibt. */
export function personAendern(id: string, patch: Partial<Pick<Person, 'name' | 'email' | 'rolle'>>): boolean {
  const bisher = personenLesen();
  const person = bisher.find((p) => p.id === id);
  if (!person) return false;
  if (patch.rolle && patch.rolle !== 'kaplanadmin' && letzterAdmin(person, bisher)) return false;
  return speichern(
    bisher.map((p) =>
      p.id === id
        ? {
            ...p,
            name: patch.name !== undefined ? patch.name.trim().replace(/\s+/g, ' ') || p.name : p.name,
            email: patch.email !== undefined ? patch.email.trim() : p.email,
            rolle: patch.rolle ?? p.rolle,
          }
        : p,
    ),
  );
}

/**
 * Ändert ein KaPlan-Admin seinen Namen unter „Angemeldet als“, zieht sein
 * Eintrag mit – sonst sperrte er sich mit dem neuen Namen selbst aus. Für die
 * übrigen Rollen zieht nichts mit: Ohne Anmeldung ließe sich sonst jeder
 * Eintrag umbenennen, indem man kurz dessen Namen einträgt. Steht der neue
 * Name schon im Verzeichnis, bleibt alles, wie es ist – dann ist die Person
 * am Gerät ab jetzt diese Person.
 */
export function eigenenNamenNachziehen(alt: string, neu: string): void {
  const bisher = personenLesen();
  if (gleicherName(alt, neu) || nameVergeben(neu, bisher)) return;
  const person = bisher.find((q) => gleicherName(q.name, alt));
  if (person?.rolle === 'kaplanadmin') personAendern(person.id, { name: neu });
}

/** Entfernt eine Person – nicht den letzten KaPlan-Admin. */
export function personEntfernen(id: string): boolean {
  const bisher = personenLesen();
  const person = bisher.find((p) => p.id === id);
  if (!person || letzterAdmin(person, bisher)) return false;
  return speichern(bisher.filter((p) => p.id !== id));
}

/** „Ansicht als“: die Oberfläche einer anderen Rolle zeigen; `null` beendet sie. */
export function ansichtSetzen(rolle: Rolle | null): void {
  if (ansicht === rolle) return;
  ansicht = rolle;
  melden();
}

export function usePersonen(): Person[] {
  return useSyncExternalStore(abonnieren, personenLesen, personenLesen);
}

export interface RollenStand {
  /** Die Rolle, nach der sich die Oberfläche richtet – bei „Ansicht als“ die gewählte. */
  rolle: Rolle;
  /** Die Rolle der Person am Gerät. */
  eigene: Rolle;
  /** Ob gerade „Ansicht als“ läuft. */
  ansicht: boolean;
}

/** Rolle der Person unter „Angemeldet als“ – rendert neu, sobald sie sich ändert. */
export function useRolle(): RollenStand {
  const { name } = useBenutzer();
  const personen = usePersonen();
  const gewaehlt = useSyncExternalStore(
    abonnieren,
    () => ansicht,
    () => ansicht,
  );
  const eigene = rolleVonName(name, personen);
  // „Ansicht als“ steht nur einem KaPlan-Admin zu und zeigt nie mehr, als er selbst darf
  const laeuft = gewaehlt !== null && eigene === 'kaplanadmin' && gewaehlt !== eigene;
  return { rolle: laeuft ? gewaehlt : eigene, eigene, ansicht: laeuft };
}
