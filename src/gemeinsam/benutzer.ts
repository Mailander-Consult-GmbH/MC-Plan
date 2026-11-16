/**
 * Angemeldete Person – in allen Bereichen dieselbe („Angemeldet als“).
 *
 * Übergangslösung bis zur Anmeldung über SSO: Die Person gibt ihren Namen
 * ein, dazu den Farbmodus und das Farbschema (hell, dunkel oder wie das
 * Gerät); ein Kennwort gibt es nicht. Alles liegt unter einem eigenen
 * Schlüssel im Browser und gilt für jeden Bereich. Die Bereiche führen Name
 * und Farbmodus weiter in ihrem Bestand (etwa für Änderungsprotokolle oder
 * die eigene Funktion im Planlaufmanagement) – als Spiegel: Ihr Store zieht
 * sie nach jeder Änderung hier nach, geändert werden sie nur hier. Das
 * Farbschema steht allein hier: Es gehört zum Gerät, nicht zum Bestand, und
 * kommt deshalb auch nicht mit einer Sicherung.
 *
 * Gibt es noch keinen gemeinsamen Stand, übernimmt `laden` einmalig den
 * ersten selbst eingetragenen Namen der Bereiche (Planlaufmanagement,
 * Projektsteuerung, Baubetriebsplanung) samt Farbmodus; ihre Vorgabenamen und
 * die Namen aus ihren Demodaten zählen nicht.
 */
import { useSyncExternalStore } from 'react';

export type Farbmodus = 'standard' | 'kontrast';

/** Hell oder dunkel: fest gewählt oder – die Vorgabe – wie das Gerät eingestellt ist. */
export type Farbschema = 'geraet' | 'hell' | 'dunkel';

export interface Benutzer {
  /** Vor- und Nachname. */
  name: string;
  /** „kontrast“: Farben für eine Rot-Grün-Sehschwäche mit stärkeren Kontrasten. */
  farbmodus: Farbmodus;
  /** Helle oder dunkle Darstellung; „geraet“ folgt der Einstellung des Betriebssystems. */
  farbschema: Farbschema;
}

/** Name, solange niemand einen eingetragen hat. */
export const STANDARD_NAME = 'Max Mustermann';

const KEY = 'kaplan-benutzer.v1';

type Roh = Record<string, unknown>;
const objekt = (w: unknown): Roh | null => (w && typeof w === 'object' ? (w as Roh) : null);
const text = (w: unknown) => (typeof w === 'string' ? w.trim() : '');
const farbmodusVon = (w: unknown): Farbmodus => (w === 'kontrast' ? 'kontrast' : 'standard');
const farbschemaVon = (w: unknown): Farbschema => (w === 'hell' || w === 'dunkel' ? w : 'geraet');

/**
 * Frühere Angaben der Bereiche (je Bereich eigenes „Angemeldet als“) mit
 * ihren Vorgabenamen – nur für die einmalige Übernahme. Dazu zählt der Name,
 * den die Demodaten der Projektsteuerung eintragen („Lena Roth“): Ein
 * gespeicherter Demobestand soll niemanden als Demoperson anmelden.
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
      if (n && !q.vorgaben.includes(n)) return { name: n, farbmodus: farbmodusVon(farbmodus), farbschema: 'geraet' };
    } catch {
      /* unlesbarer Bestand – nächster Bereich */
    }
  }
  return { name: STANDARD_NAME, farbmodus: 'standard', farbschema: 'geraet' };
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
    // Stände ohne Farbschema (vor dessen Einführung) folgen dem Gerät
    if (d) return { name: text(d.name) || STANDARD_NAME, farbmodus: farbmodusVon(d.farbmodus), farbschema: farbschemaVon(d.farbschema) };
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

/** Ändert Name, Farbmodus bzw. Farbschema – für alle Bereiche. Ein leerer Name wird zur Vorgabe. */
export function benutzerAendern(patch: Partial<Benutzer>): void {
  const alt = benutzerLesen();
  const neu: Benutzer = {
    name: patch.name !== undefined ? patch.name.trim() || STANDARD_NAME : alt.name,
    farbmodus: patch.farbmodus ?? alt.farbmodus,
    farbschema: patch.farbschema ?? alt.farbschema,
  };
  if (neu.name === alt.name && neu.farbmodus === alt.farbmodus && neu.farbschema === alt.farbschema) return;
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

/** Medienabfrage für die dunkle Einstellung des Geräts. */
export const GERAET_DUNKEL = '(prefers-color-scheme: dark)';

/** Seitengrund je Schema – für die Farbe der Fensterleiste (`theme-color`). */
export const SEITENGRUND = { hell: '#f2f2f4', dunkel: '#121316' } as const;

/**
 * Ob die Oberfläche dunkel erscheint: fest gewählt oder nach der Einstellung
 * des Geräts. Dieselbe Regel steht als kleines Skript im Kopf der
 * `index.html`, damit die Seite schon vor dem Start der Anwendung richtig
 * erscheint – beide Stellen gemeinsam ändern.
 */
export function istDunkel(farbschema: Farbschema): boolean {
  if (farbschema !== 'geraet') return farbschema === 'dunkel';
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(GERAET_DUNKEL).matches;
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
