/**
 * Projektregister – der einzige Datenbestand, den sich die Bereiche teilen.
 *
 * Jeder Bereich führt seine Projekte weiterhin im eigenen Bestand (eigener
 * localStorage-Schlüssel, eigenes Datenmodell). Das Register hält daneben fest,
 *
 *   * welche Projekte es gibt (Nummer, Bezeichnung, Beschreibung),
 *   * in welchen Bereichen ein Projekt geführt wird – mit seiner Kennung dort –
 *     und ob es dort archiviert ist,
 *   * die Projektbeteiligten mit Kontaktdaten und Funktionen, die sich die
 *     Bereiche eines Projekts teilen.
 *
 * Die Bereiche gleichen ihren Bestand mit dem Register ab (`abgleich.ts`,
 * `useRegisterAbgleich.ts`): Was jemand in einem Bereich ändert, geht ins
 * Register; was das Register Neues kennt, übernimmt der Bereich über sein
 * eigenes `mutate()`. Das Controlling arbeitet allein auf dem Register.
 *
 * Gespeichert wird unter einem eigenen Schlüssel – nur, wenn sich der
 * gespeicherte Stand lesen ließ (sonst bleibt er unberührt, und die Bereiche
 * gleichen nicht ab). Ob das letzte Speichern gelungen ist, meldet
 * `useRegisterSpeicherZustand`; das Controlling zeigt sonst einen dauerhaften
 * Hinweis (src/bereiche/controlling/App.tsx). Speichert ein anderes Fenster das
 * Register, lädt dieses Fenster den neuen Stand; Änderungen, die sich hier nicht
 * speichern ließen, trägt es darauf nach und speichert erneut
 * (`eigeneAenderungenNachziehen`).
 */
import { useSyncExternalStore } from 'react';
import { nachRaeumenSpeichern, speicherVoll } from '../shared/speicher';

export type ID = string;

/** Bereiche, in denen Projekte geführt werden. */
export type ProjektBereich = 'planlauf' | 'baubetrieb' | 'projektsteuerung' | 'leistungsnachweise';

export const PROJEKT_BEREICHE: { id: ProjektBereich; titel: string }[] = [
  { id: 'planlauf', titel: 'Planlaufmanagement' },
  { id: 'baubetrieb', titel: 'Baubetriebsplanung' },
  { id: 'projektsteuerung', titel: 'Projektsteuerung' },
  { id: 'leistungsnachweise', titel: 'Leistungsnachweise' },
];

export const BEREICH_TITEL: Record<ProjektBereich, string> = {
  planlauf: 'Planlaufmanagement',
  baubetrieb: 'Baubetriebsplanung',
  projektsteuerung: 'Projektsteuerung',
  leistungsnachweise: 'Leistungsnachweise',
};

/**
 * Bereich, in dem grundsätzlich jedes Projekt geführt wird – auf jedes Projekt
 * lassen sich Leistungen erfassen. Sein Abgleich nimmt Projekte, die er noch
 * nicht führt, von selbst auf (`abgleichen` in abgleich.ts); zurücknehmen
 * lässt sich das nicht. Die anderen Bereiche nennen ihn in ihren
 * Projektansichten nicht (`genannteBereiche`).
 */
export const JEDES_PROJEKT_IN: ProjektBereich = 'leistungsnachweise';

/**
 * Bereiche, die eine Projektansicht nennt: im Bereich `bereich` die anderen
 * Bereiche – ohne `JEDES_PROJEKT_IN`, außer dort selbst; im Controlling
 * (`null`) alle.
 */
export function genannteBereiche(bereich: ProjektBereich | null): ProjektBereich[] {
  return PROJEKT_BEREICHE.map((b) => b.id).filter(
    (b) => bereich === null || (b !== bereich && (b !== JEDES_PROJEKT_IN || bereich === JEDES_PROJEKT_IN)),
  );
}

/**
 * Projekte, die in einem anderen Bereich als `bereich` mit ★ markiert sind –
 * je Kennung im Bereich die Titel der Bereiche, die sie markiert haben. Die
 * Leistungsnachweise zeigen solche Projekte als markiert.
 */
export function markiertAnderswo(register: Register, bereich: ProjektBereich): Map<ID, string[]> {
  const ergebnis = new Map<ID, string[]>();
  for (const p of register.projekte) {
    const eigen = p.bereiche[bereich];
    if (!eigen) continue;
    const titel = PROJEKT_BEREICHE.filter((b) => b.id !== bereich && p.bereiche[b.id]?.markiert).map((b) => b.titel);
    if (titel.length > 0) ergebnis.set(eigen.id, titel);
  }
  return ergebnis;
}

/**
 * Fassung des gespeicherten Registers. Neue Felder in `aufbereiten()` nachtragen und die Zahl erhöhen.
 * Fassung 2: ★-Markierung je Bereich (`Mitgliedschaft.markiert`).
 */
export const REGISTER_VERSION = 2;

const KEY = 'kaplan-projektregister.v1';

/** Ein Projekt in einem Bereich. */
export interface Mitgliedschaft {
  /** Kennung des Projekts im Bestand des Bereichs. */
  id: ID;
  /** Im Bereich archiviert – in anderen Bereichen kann das Projekt aktiv bleiben. */
  archiviert: boolean;
  /**
   * Zur Übernahme vorgesehen (Controlling bzw. „Übernehmen in …“): Der Bereich
   * legt das Projekt beim nächsten Abgleich an; danach entfällt die Angabe.
   */
  offen: boolean;
  /**
   * Im Bereich mit ★ markiert – Spiegel der Markierung des Bereichs (sein
   * Abgleich trägt sie ein). In `JEDES_PROJEKT_IN` gilt ein Projekt als
   * markiert, wenn es ein anderer Bereich ist (`markiertAnderswo`).
   */
  markiert: boolean;
}

export interface RegisterProjekt {
  id: ID;
  nummer: string;
  name: string;
  beschreibung: string;
  /** Im Controlling archiviert – gilt in allen Bereichen. */
  archiviert: boolean;
  /** Wo das Projekt angelegt wurde. */
  herkunft: ProjektBereich | 'controlling';
  /** ISO-Zeitstempel. */
  angelegtAm: string;
  geaendertAm: string;
  bereiche: Partial<Record<ProjektBereich, Mitgliedschaft>>;
}

/** Funktion einer Person im Projekt, bereichsübergreifend über Bezeichnung und Gewerk erkannt. */
export interface FunktionsBezug {
  name: string;
  /** null = übergreifend. */
  gewerk: string | null;
  kuerzel: string;
}

/** Kontaktdaten, die sich die Bereiche teilen. */
export interface PersonFelder {
  anrede: string;
  vorname: string;
  nachname: string;
  firma: string;
  /** Persönliches Kürzel (Projektsteuerung). */
  kuerzel: string;
  email: string;
  telefon: string;
  mobil: string;
  /** Straße, PLZ und Ort – mehrzeilig. */
  anschrift: string;
  notiz: string;
}

export const PERSON_FELDER: (keyof PersonFelder)[] = [
  'anrede',
  'vorname',
  'nachname',
  'firma',
  'kuerzel',
  'email',
  'telefon',
  'mobil',
  'anschrift',
  'notiz',
];

/** Projektbeteiligte Person – geteilt von allen Bereichen, in denen das Projekt geführt wird. */
export interface RegisterPerson extends PersonFelder {
  id: ID;
  /** Kennung des Projekts im Register. */
  projektId: ID;
  funktionen: FunktionsBezug[];
  /** Kennung der Person im Bestand der Bereiche. */
  ids: Partial<Record<ProjektBereich, ID>>;
  geaendertAm: string;
}

/**
 * Vermerk über ein gelöschtes Projekt bzw. eine gelöschte Person: Die
 * genannten Bereiche löschen beim nächsten Abgleich ihre Kennung; ist keiner
 * mehr offen, entfällt der Vermerk.
 */
export interface Grabstein {
  art: 'projekt' | 'person';
  offen: Partial<Record<ProjektBereich, ID>>;
  bezeichnung: string;
  /** ISO-Zeitstempel. */
  am: string;
}

export interface Register {
  version: number;
  projekte: RegisterProjekt[];
  personen: RegisterPerson[];
  geloescht: Grabstein[];
}

/* ------------------------------------------------------------------ */
/* Hilfen                                                              */
/* ------------------------------------------------------------------ */

export function newId(prefix: string): ID {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export const leeresRegister = (): Register => ({ version: REGISTER_VERSION, projekte: [], personen: [], geloescht: [] });

/** Bereiche, in denen das Projekt geführt wird (ohne die erst zur Übernahme vorgesehenen). */
export function bereicheVon(p: RegisterProjekt): ProjektBereich[] {
  return PROJEKT_BEREICHE.map((b) => b.id).filter((b) => p.bereiche[b] && !p.bereiche[b]!.offen);
}

/** Registerprojekt zur Kennung eines Projekts im Bereich. */
export function projektImBereich(register: Register, bereich: ProjektBereich, lokaleId: ID): RegisterProjekt | undefined {
  return register.projekte.find((p) => p.bereiche[bereich]?.id === lokaleId);
}

/** Archiviert im Bereich – im Bereich selbst oder im Controlling für alle Bereiche. */
export function istArchiviert(p: RegisterProjekt, bereich: ProjektBereich): boolean {
  return p.archiviert || !!p.bereiche[bereich]?.archiviert;
}

/** Kennungen der im Bereich archivierten Projekte. */
export function archivierteIds(register: Register, bereich: ProjektBereich): Set<ID> {
  return new Set(
    register.projekte.filter((p) => p.bereiche[bereich] && istArchiviert(p, bereich)).map((p) => p.bereiche[bereich]!.id),
  );
}

/** „Vorname Nachname“, ersatzweise die Firma. */
export function personName(p: Pick<PersonFelder, 'vorname' | 'nachname' | 'firma'>): string {
  return `${p.vorname} ${p.nachname}`.trim() || p.firma.trim();
}

/** Bezeichnung einer Funktion samt Gewerk, etwa „Fachplaner LST“. */
export function funktionText(f: Pick<FunktionsBezug, 'name' | 'gewerk'>): string {
  return f.gewerk ? `${f.name} ${f.gewerk}` : f.name;
}

/** Schlüssel, unter dem eine Funktion in allen Bereichen als dieselbe gilt. */
export function funktionsSchluessel(f: Pick<FunktionsBezug, 'name' | 'gewerk'>): string {
  return `${f.name.trim().toLowerCase()}|${(f.gewerk ?? '').trim().toLowerCase()}`;
}

export function projektTitel(p: Pick<RegisterProjekt, 'nummer' | 'name'>): string {
  return [p.nummer, p.name].filter((x) => x.trim()).join(' ');
}

/* ------------------------------------------------------------------ */
/* Laden und Speichern                                                 */
/* ------------------------------------------------------------------ */

export type RegisterZustand = 'ok' | 'ladefehler' | 'neuere_fassung';

type Roh = Record<string, unknown>;
const liste = (w: unknown): Roh[] => (Array.isArray(w) ? w.filter((x): x is Roh => !!x && typeof x === 'object') : []);
const text = (w: unknown) => (typeof w === 'string' ? w : '');
const BEREICH_IDS: ProjektBereich[] = PROJEKT_BEREICHE.map((b) => b.id);

function idsAufbereiten(w: unknown): Partial<Record<ProjektBereich, ID>> {
  const roh = w && typeof w === 'object' ? (w as Roh) : {};
  const ids: Partial<Record<ProjektBereich, ID>> = {};
  for (const b of BEREICH_IDS) if (text(roh[b])) ids[b] = text(roh[b]);
  return ids;
}

/** Ergänzt fehlende Felder, damit auch ältere oder von Hand bearbeitete Stände laden. */
export function aufbereiten(roh: Roh): Register {
  const projekte = liste(roh.projekte)
    .filter((p) => text(p.id))
    .map((p): RegisterProjekt => {
      const b = p.bereiche && typeof p.bereiche === 'object' ? (p.bereiche as Roh) : {};
      const bereiche: RegisterProjekt['bereiche'] = {};
      for (const id of BEREICH_IDS) {
        const m = b[id] && typeof b[id] === 'object' ? (b[id] as Roh) : null;
        if (m && text(m.id)) {
          bereiche[id] = { id: text(m.id), archiviert: m.archiviert === true, offen: m.offen === true, markiert: m.markiert === true };
        }
      }
      const herkunft = text(p.herkunft);
      return {
        id: text(p.id),
        nummer: text(p.nummer),
        name: text(p.name),
        beschreibung: text(p.beschreibung),
        archiviert: p.archiviert === true,
        herkunft: herkunft === 'controlling' || (BEREICH_IDS as string[]).includes(herkunft) ? (herkunft as RegisterProjekt['herkunft']) : 'controlling',
        angelegtAm: text(p.angelegtAm),
        geaendertAm: text(p.geaendertAm),
        bereiche,
      };
    });
  const projektIds = new Set(projekte.map((p) => p.id));
  const personen = liste(roh.personen)
    .filter((p) => text(p.id) && projektIds.has(text(p.projektId)))
    .map((p): RegisterPerson => {
      const felder = Object.fromEntries(PERSON_FELDER.map((f) => [f, text(p[f])])) as unknown as PersonFelder;
      return {
        ...felder,
        id: text(p.id),
        projektId: text(p.projektId),
        funktionen: liste(p.funktionen)
          .filter((f) => text(f.name).trim())
          .map((f) => ({ name: text(f.name).trim(), gewerk: text(f.gewerk).trim() || null, kuerzel: text(f.kuerzel) })),
        ids: idsAufbereiten(p.ids),
        geaendertAm: text(p.geaendertAm),
      };
    });
  const geloescht = liste(roh.geloescht)
    .map((g): Grabstein => ({
      art: g.art === 'person' ? 'person' : 'projekt',
      offen: idsAufbereiten(g.offen),
      bezeichnung: text(g.bezeichnung),
      am: text(g.am),
    }))
    .filter((g) => Object.keys(g.offen).length > 0);
  return { version: REGISTER_VERSION, projekte, personen, geloescht };
}

function laden(): { register: Register; zustand: RegisterZustand } {
  let roh: string | null;
  try {
    roh = localStorage.getItem(KEY);
  } catch {
    return { register: leeresRegister(), zustand: 'ladefehler' };
  }
  if (!roh) return { register: leeresRegister(), zustand: 'ok' };
  try {
    const daten = JSON.parse(roh) as Roh | null;
    if (!daten || typeof daten !== 'object') return { register: leeresRegister(), zustand: 'ladefehler' };
    if (typeof daten.version === 'number' && daten.version > REGISTER_VERSION) {
      return { register: leeresRegister(), zustand: 'neuere_fassung' };
    }
    if ((daten.version ?? 0) !== REGISTER_VERSION) {
      // Rohkopie vor der Umstellung, wie in den Bereichen
      try {
        const schluessel = `${KEY}.vor-fassung-${String(daten.version ?? 0)}`;
        if (localStorage.getItem(schluessel) === null) localStorage.setItem(schluessel, roh);
      } catch {
        /* kein Platz für die Kopie */
      }
    }
    return { register: aufbereiten(daten), zustand: 'ok' };
  } catch {
    return { register: leeresRegister(), zustand: 'ladefehler' };
  }
}

/** Ergebnis des Speicherns: gespeichert, Speicher voll oder Speicher nicht nutzbar (gesperrt). */
export type RegisterSpeicherZustand = 'ok' | 'voll' | 'gesperrt';

/**
 * Schreibt das Register (`text` = sein JSON). Ist der Speicher voll, macht
 * `nachRaeumenSpeichern` (src/shared/speicher.ts) Platz, indem es Rohkopien
 * (`.vor-fassung-<n>`, `.vor-einspielen-…`) entfernt – das Register wiegt
 * schwerer als eine Kopie. Liefert, ob es gespeichert ist bzw. warum nicht;
 * ein Fehlschlag steht in der Konsole (`melden`, bei erneuten Versuchen nicht).
 */
function speichern(text: string, melden = true): RegisterSpeicherZustand {
  const warnen = (grund: unknown) => {
    if (melden) console.warn('Projektregister konnte nicht gespeichert werden:', grund);
  };
  try {
    localStorage.setItem(KEY, text);
    return 'ok';
  } catch (err) {
    if (!speicherVoll(err)) {
      warnen(err);
      return 'gesperrt';
    }
  }
  try {
    if (nachRaeumenSpeichern(KEY, text)) return 'ok';
    warnen('Speicher voll');
    return 'voll';
  } catch (err) {
    warnen(err);
    return speicherVoll(err) ? 'voll' : 'gesperrt';
  }
}

/* ------------------------------------------------------------------ */
/* Gemeinsamer Zustand mit Abonnement                                  */
/* ------------------------------------------------------------------ */

/**
 * Der Stand dieses Fensters: `text` ist das JSON von `register`, `gespeichert`
 * das Ergebnis des letzten Speicherns – nach dem Laden 'ok', denn der Stand
 * kommt ja aus dem Speicher. `basis` ist das Register, das zuletzt im Speicher
 * stand, soweit dieses Fenster es kennt (geladen oder selbst gespeichert):
 * Gegen sie ermittelt `eigeneAenderungenNachziehen` die Änderungen, die sich
 * hier nicht speichern ließen.
 */
interface Stand {
  register: Register;
  zustand: RegisterZustand;
  text: string;
  gespeichert: RegisterSpeicherZustand;
  basis: Register;
}

let stand: Stand | null = null;
const hoerer = new Set<() => void>();

function aktuell(): Stand {
  if (!stand) {
    const geladen = laden();
    stand = { ...geladen, text: JSON.stringify(geladen.register), gespeichert: 'ok', basis: geladen.register };
  }
  return stand;
}

function benachrichtigen() {
  hoerer.forEach((h) => h());
}

export function registerLesen(): Register {
  return aktuell().register;
}

export function registerZustand(): RegisterZustand {
  return aktuell().zustand;
}

export function registerSpeicherZustand(): RegisterSpeicherZustand {
  return aktuell().gespeichert;
}

/**
 * Schreibt einen nicht gespeicherten Stand erneut – etwa, wenn inzwischen
 * wieder Platz ist. Der Stand selbst bleibt derselbe; benachrichtigt wird nur,
 * wenn sich das Ergebnis ändert.
 */
export function registerErneutSpeichern(): RegisterSpeicherZustand {
  const s = aktuell();
  if (s.zustand !== 'ok' || s.gespeichert === 'ok') return s.gespeichert;
  const gespeichert = speichern(s.text, false);
  if (gespeichert !== s.gespeichert) {
    stand = { ...s, gespeichert, basis: gespeichert === 'ok' ? s.register : s.basis };
    benachrichtigen();
  }
  return gespeichert;
}

/**
 * Ändert das Register über eine Funktion (darf außerhalb von React-Updates
 * aufgerufen werden, läuft genau einmal). Ändert sich nichts, bleibt der
 * Stand unberührt und niemand wird benachrichtigt – nur ein noch nicht
 * gespeicherter Stand wird dann erneut geschrieben (`registerErneutSpeichern`).
 * Der neue Stand gilt auch, wenn er sich nicht speichern lässt (der
 * Speicherzustand sagt es); nach einem Ladefehler bleibt das Register
 * unverändert.
 */
export function registerAendern(fn: (r: Register) => Register): Register {
  const s = aktuell();
  if (s.zustand !== 'ok') return s.register;
  const neu = fn(s.register);
  const neuText = neu === s.register ? s.text : JSON.stringify(neu);
  if (neuText === s.text) {
    registerErneutSpeichern();
    return s.register;
  }
  const gespeichert = speichern(neuText);
  stand = { register: neu, zustand: s.zustand, text: neuText, gespeichert, basis: gespeichert === 'ok' ? neu : s.basis };
  benachrichtigen();
  return neu;
}

function abonnieren(h: () => void): () => void {
  hoerer.add(h);
  return () => hoerer.delete(h);
}

/* ------------------------------------------------------------------ */
/* Nicht gespeicherte Änderungen auf einen fremden Stand nachziehen    */
/* ------------------------------------------------------------------ */

const gleich = (a: unknown, b: unknown) => a === b || JSON.stringify(a) === JSON.stringify(b);
const istObjekt = (w: unknown): w is Record<string, unknown> => !!w && typeof w === 'object' && !Array.isArray(w);

/**
 * Dreiwege-Zusammenführung eines Werts: Hat dieses Fenster ihn geändert
 * (`eigen` ≠ `basis`), gilt seine Fassung, sonst die fremde. Objekte führt sie
 * Feld für Feld zusammen, wenn es sie in allen drei Ständen gibt – so bleibt
 * etwa die ★ eines anderen Bereichs erhalten, wenn hier eine Übernahme
 * vorgesehen wurde; hat das andere Fenster ein Objekt entfernt (etwa eine
 * Mitgliedschaft gelöst), bleibt es entfernt. Listen gelten als ein Wert.
 */
function wertZusammenfuehren(basis: unknown, eigen: unknown, fremd: unknown): unknown {
  if (gleich(eigen, basis)) return fremd;
  if (istObjekt(basis) && fremd === undefined) return undefined;
  if (!istObjekt(basis) || !istObjekt(eigen) || !istObjekt(fremd)) return eigen;
  const ergebnis: Record<string, unknown> = {};
  for (const k of new Set([...Object.keys(fremd), ...Object.keys(eigen), ...Object.keys(basis)])) {
    const w = wertZusammenfuehren(basis[k], eigen[k], fremd[k]);
    if (w !== undefined) ergebnis[k] = w;
  }
  return ergebnis;
}

/**
 * Projekte bzw. Personen über ihre Kennung zusammenführen: in der Reihenfolge
 * des fremden Stands, hier neu Hinzugekommenes am Ende. Was eine Seite gelöscht
 * hat, bleibt gelöscht – auch wenn die andere es geändert hat.
 */
function listeZusammenfuehren<T extends { id: ID }>(basis: T[], eigen: T[], fremd: T[]): T[] {
  const alt = new Map(basis.map((x) => [x.id, x]));
  const mein = new Map(eigen.map((x) => [x.id, x]));
  const fremdIds = new Set(fremd.map((x) => x.id));
  const ergebnis: T[] = [];
  for (const f of fremd) {
    const b = alt.get(f.id);
    const e = mein.get(f.id);
    if (!b) ergebnis.push(e ?? f);
    else if (e) ergebnis.push(wertZusammenfuehren(b, e, f) as T);
    // b ohne e: hier gelöscht
  }
  // Hier neu (im fremden Stand nicht vorhanden, in der Basis auch nicht); fehlt etwas
  // aus der Basis im fremden Stand, hat das andere Fenster es gelöscht.
  for (const e of eigen) if (!alt.has(e.id) && !fremdIds.has(e.id)) ergebnis.push(e);
  return ergebnis;
}

/**
 * Trägt die Änderungen dieses Fensters, die sich nicht speichern ließen
 * (`eigen` gegenüber `basis`, dem zuletzt bekannten gespeicherten Stand), auf
 * den Stand nach, den ein anderes Fenster gespeichert hat (`fremd`) – je Feld;
 * bei Widerspruch gilt die eigene Änderung, eine Löschung geht jeder Änderung
 * vor. Personen ohne Projekt entfallen. Löschvermerke: die fremden ohne die
 * hier erledigten, dazu die hier neuen. Reine Funktion.
 */
export function eigeneAenderungenNachziehen(basis: Register, eigen: Register, fremd: Register): Register {
  const projekte = listeZusammenfuehren(basis.projekte, eigen.projekte, fremd.projekte);
  const projektIds = new Set(projekte.map((p) => p.id));
  const personen = listeZusammenfuehren(basis.personen, eigen.personen, fremd.personen).filter((p) =>
    projektIds.has(p.projektId),
  );
  const schluessel = (g: Grabstein) => JSON.stringify(g);
  const alt = new Set(basis.geloescht.map(schluessel));
  const mein = new Set(eigen.geloescht.map(schluessel));
  const fremdeVermerke = new Set(fremd.geloescht.map(schluessel));
  const geloescht = [
    ...fremd.geloescht.filter((g) => !alt.has(schluessel(g)) || mein.has(schluessel(g))),
    ...eigen.geloescht.filter((g) => !alt.has(schluessel(g)) && !fremdeVermerke.has(schluessel(g))),
  ];
  return { version: REGISTER_VERSION, projekte, personen, geloescht };
}

// Ein anderes Fenster hat das Register gespeichert: neu laden. Hält dieses
// Fenster Änderungen, die sich nicht speichern ließen (`gespeichert` ≠ 'ok'),
// trägt es sie auf den neuen Stand nach und versucht erneut zu speichern – sonst
// gingen sie wortlos verloren, und der Hinweis im Controlling verschwände, als
// sei gespeichert. Gelingt das Speichern nicht, bleibt der Hinweis.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY || !stand) return;
    const vorher = stand;
    stand = null;
    if (vorher.zustand === 'ok' && vorher.gespeichert !== 'ok') {
      const neu = aktuell();
      if (neu.zustand === 'ok') {
        const register = eigeneAenderungenNachziehen(vorher.basis, vorher.register, neu.register);
        const text = JSON.stringify(register);
        if (text !== neu.text) {
          const gespeichert = speichern(text);
          stand = { register, zustand: 'ok', text, gespeichert, basis: gespeichert === 'ok' ? register : neu.register };
        }
      }
    }
    benachrichtigen();
  });
}

/** Das Register – rendert neu, sobald es sich ändert. */
export function useRegister(): Register {
  return useSyncExternalStore(abonnieren, registerLesen, registerLesen);
}

/** Ob sich das Register lesen ließ; sonst gleichen die Bereiche nicht ab. */
export function useRegisterZustand(): RegisterZustand {
  return useSyncExternalStore(abonnieren, registerZustand, registerZustand);
}

/** Ob sich der letzte Stand des Registers speichern ließ (Hinweis im Controlling). */
export function useRegisterSpeicherZustand(): RegisterSpeicherZustand {
  return useSyncExternalStore(abonnieren, registerSpeicherZustand, registerSpeicherZustand);
}
