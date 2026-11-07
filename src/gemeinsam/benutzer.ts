/**
 * Angemeldete Person – in allen Bereichen dieselbe („Angemeldet als“).
 *
 * Übergangslösung bis zur Anmeldung über SSO: Die Person gibt ihren Namen
 * ein, dazu den Farbmodus; ein Kennwort gibt es nicht. Beides liegt unter
 * einem eigenen Schlüssel im Browser und gilt für jeden Bereich. Die Bereiche
 * führen den Namen weiter in ihrem Bestand (etwa für Änderungsprotokolle oder
 * die eigene Funktion im Planlaufmanagement) – als Spiegel: Ihr Store zieht
 * ihn nach jeder Änderung hier nach, geändert wird er nur hier.
 *
 * Gibt es noch keinen gemeinsamen Stand, übernimmt `laden` einmalig den
 * ersten selbst eingetragenen Namen der Bereiche (Planlaufmanagement,
 * Projektsteuerung, Baubetriebsplanung, Leistungsnachweise) samt Farbmodus;
 * ihre Vorgabenamen und die Namen aus ihren Demodaten zählen nicht.
 */
import { useSyncExternalStore } from 'react';

export type Farbmodus = 'standard' | 'kontrast';

export interface Benutzer {
  /** Vor- und Nachname. */
  name: string;
  /** „kontrast“: Farben für eine Rot-Grün-Sehschwäche mit stärkeren Kontrasten. */
  farbmodus: Farbmodus;
}

/** Name, solange niemand einen eingetragen hat. */
export const STANDARD_NAME = 'Max Mustermann';

const KEY = 'kaplan-benutzer.v1';

type Roh = Record<string, unknown>;
const objekt = (w: unknown): Roh | null => (w && typeof w === 'object' ? (w as Roh) : null);
const text = (w: unknown) => (typeof w === 'string' ? w.trim() : '');
const farbmodusVon = (w: unknown): Farbmodus => (w === 'kontrast' ? 'kontrast' : 'standard');

/**
 * Frühere Angaben der Bereiche (je Bereich eigenes „Angemeldet als“) mit
 * ihren Vorgabenamen – nur für die einmalige Übernahme. Dazu zählen die
 * Namen, die die Demodaten der Projektsteuerung („Lena Roth“) und der
 * Leistungsnachweise („Anna Becker“) eintragen: Ein gespeicherter Demobestand
 * soll niemanden als Demoperson anmelden.
 */
const FRUEHER: { key: string; lesen: (d: Roh) => { name: unknown; farbmodus: unknown }; vorgaben: string[] }[] = [
  {
    key: 'planlauf-management.data.v1',
    lesen: (d) => ({ name: objekt(d.bearbeiter)?.name, farbmodus: objekt(d.bearbeiter)?.farbmodus }),
    vorgaben: ['Max Mustermann', 'PLM'],
  },
  {
    key: 'projektsteuerung.data.v1',
    lesen: (d) => ({ name: objekt(d.einstellungen)?.bearbeiter, farbmodus: objekt(d.einstellungen)?.farbmodus }),
    vorgaben: ['Projektsteuerung MIC', 'Lena Roth'],
  },
  {
    key: 'baubetrieb-planung.data.v1',
    lesen: (d) => ({ name: objekt(d.einstellungen)?.bearbeiter, farbmodus: objekt(d.einstellungen)?.farbmodus }),
    vorgaben: ['Bearbeitung MIC'],
  },
  {
    key: 'leistungsnachweise.data.v1',
    lesen: (d) => ({ name: objekt(d.einstellungen)?.bearbeiter, farbmodus: objekt(d.einstellungen)?.farbmodus }),
    vorgaben: ['Mitarbeiter MIC', 'Anna Becker'],
  },
];

/** Erster selbst eingetragener Name eines Bereichs samt Farbmodus, sonst die Vorgabe. */
function ausFrueherenAngaben(): Benutzer {
  for (const q of FRUEHER) {
    try {
      const roh = localStorage.getItem(q.key);
      const d = roh ? objekt(JSON.parse(roh)) : null;
      if (!d) continue;
      const { name, farbmodus } = q.lesen(d);
      const n = text(name);
      if (n && !q.vorgaben.includes(n)) return { name: n, farbmodus: farbmodusVon(farbmodus) };
    } catch {
      /* unlesbarer Bestand – nächster Bereich */
    }
  }
  return { name: STANDARD_NAME, farbmodus: 'standard' };
}

function speichern(b: Benutzer): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(b));
  } catch (err) {
    console.warn('„Angemeldet als“ konnte nicht gespeichert werden:', err);
  }
}

function laden(): Benutzer {
  try {
    const roh = localStorage.getItem(KEY);
    const d = roh ? objekt(JSON.parse(roh)) : null;
    if (d) return { name: text(d.name) || STANDARD_NAME, farbmodus: farbmodusVon(d.farbmodus) };
  } catch {
    /* unlesbar – wie ohne Stand */
  }
  const neu = ausFrueherenAngaben();
  speichern(neu);
  return neu;
}

/* ------------------------------------------------------------------ */
/* Gemeinsamer Zustand mit Abonnement                                  */
/* ------------------------------------------------------------------ */

let stand: Benutzer | null = null;
const hoerer = new Set<() => void>();

export function benutzerLesen(): Benutzer {
  if (!stand) stand = laden();
  return stand;
}

/** Ändert Name bzw. Farbmodus – für alle Bereiche. Ein leerer Name wird zur Vorgabe. */
export function benutzerAendern(patch: Partial<Benutzer>): void {
  const alt = benutzerLesen();
  const neu: Benutzer = {
    name: patch.name !== undefined ? patch.name.trim() || STANDARD_NAME : alt.name,
    farbmodus: patch.farbmodus ?? alt.farbmodus,
  };
  if (neu.name === alt.name && neu.farbmodus === alt.farbmodus) return;
  stand = neu;
  speichern(neu);
  hoerer.forEach((h) => h());
}

function abonnieren(h: () => void): () => void {
  hoerer.add(h);
  return () => hoerer.delete(h);
}

// Ein anderes Fenster hat die Anmeldung geändert: neu laden.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY || !stand) return;
    stand = null;
    hoerer.forEach((h) => h());
  });
}

/** Die angemeldete Person – rendert neu, sobald sie sich ändert. */
export function useBenutzer(): Benutzer {
  return useSyncExternalStore(abonnieren, benutzerLesen, benutzerLesen);
}

/** Kürzel für das Namensfeld: Anfangsbuchstaben von Vor- und Nachname. */
export function initialen(name: string): string {
  const teile = name.trim().split(/\s+/).filter(Boolean);
  if (teile.length === 0) return '?';
  if (teile.length === 1) return teile[0].slice(0, 2).toUpperCase();
  return (teile[0][0] + teile[teile.length - 1][0]).toUpperCase();
}

/** Vor- und Nachname aus dem Namen: das letzte Wort ist der Nachname. */
export function namensTeile(name: string): { vorname: string; nachname: string } {
  const teile = name.trim().split(/\s+/).filter(Boolean);
  if (teile.length < 2) return { vorname: '', nachname: teile[0] ?? '' };
  return { vorname: teile.slice(0, -1).join(' '), nachname: teile[teile.length - 1] };
}
