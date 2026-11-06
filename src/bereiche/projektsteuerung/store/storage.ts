/**
 * Lokale Persistenz des Bereichs „Projektsteuerung“ unter einem eigenen
 * Schlüssel. Die Bestände der anderen Bereiche werden weder gelesen noch
 * geschrieben.
 *
 * Wie im Planlaufmanagement wird nur gespeichert, wenn der Bestand
 * einwandfrei geladen wurde (`LadeZustand` 'ok'): Nach einem Ladefehler oder
 * bei einem Stand aus einer neueren Fassung zeigt der Bereich Demodaten und
 * lässt den gespeicherten Stand unberührt. Vor jeder Umstellung auf eine neue
 * Fassung legt `ladeDaten` eine Rohkopie `<Schlüssel>.vor-fassung-<n>` an,
 * vor dem Einspielen über einen unlesbaren Stand `rohkopieVorEinspielen` eine
 * `<Schlüssel>.vor-einspielen-<Zeitpunkt>`.
 * Speichern meldet, ob es gelungen ist (`SpeicherZustand`); ist der Speicher
 * des Browsers voll, zeigt der Bereich einen dauerhaften Hinweis.
 */
import { today } from '../../../shared/dates';
import { nachRaeumenSpeichern, rohkopieVorEinspielen as rohkopieAnlegen, speicherVoll, type RohkopieErgebnis } from '../../../shared/speicher';
import { zeilenAusAltform } from '../domain/protokoll';
import { STANDARD_GEWERKE, seedDaten } from '../domain/seed';
import {
  DATEN_VERSION,
  STANDARD_BEARBEITER,
  STANDARD_HINWEIS,
  TEILNAHME,
  type Beteiligter,
  type Eintrag,
  type EintragTyp,
  type Funktion,
  type Logo,
  type Projekt,
  type ProjektsteuerungDaten,
  type Protokoll,
  type Teilnahme,
  type Teilnehmer,
  type Top,
  type Zeile,
} from '../domain/types';

export { DATEN_VERSION };

/** Schlüssel des Bestands im localStorage (auch für `storage`-Ereignisse anderer Fenster). */
export const SPEICHER_SCHLUESSEL = 'projektsteuerung.data.v1';
const KEY = SPEICHER_SCHLUESSEL;

/** Präfix der Rohkopien vor einer Umstellung: `<KEY>.vor-fassung-<n>`. */
const VOR_FASSUNG = `${KEY}.vor-fassung-`;

/** Kennzeichen in Sicherungsdateien, damit sie dem richtigen Bereich zugeordnet werden. */
const SICHERUNG_BEREICH = 'projektsteuerung';

type Roh = Record<string, unknown>;

const liste = (w: unknown): Roh[] => (Array.isArray(w) ? w.filter((x): x is Roh => !!x && typeof x === 'object') : []);
const text = (w: unknown) => (typeof w === 'string' ? w : '');
const datum = (w: unknown) => (typeof w === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(w) ? w : '');
const zahl = (w: unknown, vorgabe: number) => (typeof w === 'number' && Number.isFinite(w) ? w : vorgabe);
const idOderNull = (w: unknown) => (typeof w === 'string' && w ? w : null);
const zufallsId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
const erledigung = (w: unknown) => (w === 'erledigt' ? 'erledigt' : 'offen') as 'erledigt' | 'offen';

const typVon = (w: unknown): EintragTyp => (w === 'F' || w === 'A' ? w : 'I');
/** Eigene Art einer Zeile; fehlt sie (Fassung 4), läuft die Zeile unter dem Ursprung mit. */
const artVon = (w: unknown): EintragTyp | null => (w === 'I' || w === 'F' || w === 'A' ? w : null);
const objekt = (w: unknown): Roh | null => (w && typeof w === 'object' ? (w as Roh) : null);

function logosAufbereiten(w: unknown): Logo[] {
  return liste(w)
    .filter((l) => text(l.src))
    .map((l): Logo => ({ id: text(l.id) || zufallsId('logo'), name: text(l.name), src: text(l.src) }));
}

function zeileAufbereiten(z: Roh): Zeile {
  const vor = objekt(z.vor);
  const typ = artVon(z.typ);
  return {
    id: text(z.id) || zufallsId('z'),
    text: text(z.text),
    herkunft: typeof z.herkunft === 'number' && z.herkunft >= 1 ? Math.round(z.herkunft) : null,
    typ,
    wer: typ ? text(z.wer) : '',
    termin: typ === 'A' ? datum(z.termin) : '',
    status: typ === 'A' ? erledigung(z.status) : 'offen',
    entfaellt: z.entfaellt === true,
    vor: vor
      ? {
          text: text(vor.text),
          typ: artVon(vor.typ),
          wer: text(vor.wer),
          termin: datum(vor.termin),
          status: erledigung(vor.status),
          entfaellt: vor.entfaellt === true,
        }
      : null,
  };
}

/**
 * Eintrag eines Protokolls mit der Nummer `nr`. Einträge der Fassungen 1 bis
 * 3 kennen noch keine Zeilen: Ihr Text wird eine Zeile aus dem Protokoll der
 * Fundstelle, ihre Ergänzung eine neue Zeile (`zeilenAusAltform`).
 */
function eintragAufbereiten(e: Roh, nr: number): Eintrag {
  const typ = typVon(e.typ);
  const vor = objekt(e.vor);
  return {
    id: text(e.id) || zufallsId('e'),
    typ,
    zeilen: Array.isArray(e.zeilen)
      ? liste(e.zeilen).map(zeileAufbereiten)
      : zeilenAusAltform(
          { text: text(e.text), zusatz: text(e.zusatz), herkunft: text(e.herkunft), vorText: vor ? text(vor.text) : null },
          nr,
        ),
    wer: text(e.wer),
    termin: datum(e.termin),
    status: erledigung(e.status),
    uebernommenIn: idOderNull(e.uebernommenIn),
    entfaellt: e.entfaellt === true,
    vor: vor
      ? {
          typ: vor.typ === undefined ? typ : typVon(vor.typ),
          wer: text(vor.wer),
          termin: datum(vor.termin),
          status: erledigung(vor.status),
          entfaellt: vor.entfaellt === true,
        }
      : null,
  };
}

function protokollAufbereiten(p: Roh): Protokoll {
  const teilnehmer = liste(p.teilnehmer).map(
    (t): Teilnehmer => ({
      id: text(t.id) || zufallsId('tn'),
      beteiligterId: idOderNull(t.beteiligterId),
      name: text(t.name),
      funktion: text(t.funktion),
      firma: text(t.firma),
      kuerzel: text(t.kuerzel),
      status: (TEILNAHME as readonly string[]).includes(text(t.status)) ? (text(t.status) as Teilnahme) : 'anwesend',
    }),
  );
  const fuehrerId = idOderNull(p.fuehrerId);
  const nr = Math.max(1, Math.round(zahl(p.nr, 1)));
  return {
    id: text(p.id) || zufallsId('pt'),
    projektId: text(p.projektId),
    reiheId: text(p.reiheId) || zufallsId('rh'),
    art: text(p.art),
    nr,
    datum: datum(p.datum) || today(),
    beginn: text(p.beginn),
    ende: text(p.ende),
    ort: text(p.ort),
    fuehrerId: fuehrerId && teilnehmer.some((t) => t.id === fuehrerId) ? fuehrerId : null,
    naechster: datum(p.naechster),
    verteiler: text(p.verteiler),
    hinweis: typeof p.hinweis === 'string' ? p.hinweis : STANDARD_HINWEIS,
    teilnehmer,
    tops: liste(p.tops).map(
      (t): Top => ({
        id: text(t.id) || zufallsId('top'),
        titel: text(t.titel),
        vorTitel: typeof t.vorTitel === 'string' ? t.vorTitel : null,
        entfaellt: t.entfaellt === true,
        vorEntfaellt: t.vorEntfaellt === true,
        eintraege: liste(t.eintraege).map((e) => eintragAufbereiten(e, nr)),
      }),
    ),
    geaendert: text(p.geaendert) || new Date().toISOString(),
  };
}

/** Ergänzt fehlende Felder, damit ältere oder von Hand bearbeitete Stände laden. */
function aufbereiten(roh: Partial<ProjektsteuerungDaten>): ProjektsteuerungDaten {
  const e = (roh.einstellungen ?? {}) as Partial<ProjektsteuerungDaten['einstellungen']>;
  const funktionen = liste(roh.funktionen).map(
    (f): Funktion => ({
      id: text(f.id) || zufallsId('fn'),
      name: text(f.name) || 'Funktion',
      kuerzel: text(f.kuerzel),
      farbe: text(f.farbe) || '#24456e',
      beschreibung: text(f.beschreibung),
      gewerk: text(f.gewerk).trim() || null,
    }),
  );
  // Gewerke: gepflegte Liste, ergänzt um die der Funktionen
  const gewerke = [
    ...new Set([
      ...(Array.isArray(roh.gewerke) ? roh.gewerke.map(text).map((g) => g.trim()) : []),
      ...funktionen.map((f) => f.gewerk ?? ''),
    ]),
  ]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, 'de'));
  const funktionIds = new Set(funktionen.map((f) => f.id));
  const projekte = liste(roh.projekte).map(
    (p): Projekt => ({
      id: text(p.id) || zufallsId('pr'),
      nummer: text(p.nummer),
      name: text(p.name) || 'Ohne Bezeichnung',
      status: p.status === 'pausiert' || p.status === 'abgeschlossen' ? p.status : 'aktiv',
      markiert: p.markiert !== false,
      beschreibung: text(p.beschreibung),
      logos: Array.isArray(p.logos) ? logosAufbereiten(p.logos) : null,
    }),
  );
  const projektIds = new Set(projekte.map((p) => p.id));
  const beteiligte = liste(roh.beteiligte)
    .filter((b) => projektIds.has(text(b.projektId)))
    .map(
      (b): Beteiligter => ({
        id: text(b.id) || zufallsId('bt'),
        projektId: text(b.projektId),
        funktionId: funktionIds.has(text(b.funktionId)) ? text(b.funktionId) : null,
        anrede: text(b.anrede),
        vorname: text(b.vorname),
        nachname: text(b.nachname),
        firma: text(b.firma),
        kuerzel: text(b.kuerzel),
        email: text(b.email),
        telefon: text(b.telefon),
        mobil: text(b.mobil),
        anschrift: text(b.anschrift),
        notiz: text(b.notiz),
      }),
    );
  const protokolle = liste(roh.protokolle)
    .filter((p) => projektIds.has(text(p.projektId)))
    .map(protokollAufbereiten);
  // Logos je Protokollreihe – nur für Reihen, die es noch gibt
  const reihen = new Set(protokolle.map((p) => p.reiheId));
  const reihenRoh = roh.reihenLogos && typeof roh.reihenLogos === 'object' ? (roh.reihenLogos as Record<string, unknown>) : {};
  const reihenLogos = Object.fromEntries(
    Object.entries(reihenRoh)
      .filter(([id, w]) => reihen.has(id) && Array.isArray(w))
      .map(([id, w]) => [id, logosAufbereiten(w)]),
  );
  return {
    version: DATEN_VERSION,
    einstellungen: {
      bearbeiter: text(e.bearbeiter).trim() || STANDARD_BEARBEITER,
      farbmodus: e.farbmodus === 'kontrast' ? 'kontrast' : 'standard',
    },
    gewerke,
    funktionen,
    projekte,
    beteiligte,
    protokolle,
    reihenLogos,
  };
}

/**
 * Hebt einen älteren Stand auf die aktuelle Fassung – in einem Aufruf, Schritt
 * für Schritt. Fassung 1 kannte keine Gewerke: Sie erhält die mitgelieferten
 * Gewerke; ihre Funktionen gelten als übergreifend (ergänzt `aufbereiten`).
 * Fassung 2 kannte keine gestrichenen Einträge; `aufbereiten` setzt
 * `entfaellt` auf false. Bis Fassung 3 bestanden Einträge aus Text und
 * Ergänzung; `aufbereiten` bildet daraus Zeilen. Bis Fassung 4 führte jedes
 * Projekt eine Liste offener Punkte (LOP); `aufbereiten` lässt sie samt den
 * Verweisen der Aufgaben fallen, Zeilen ohne eigene Art laufen unter dem
 * Ursprung mit. Fassung 5 kannte keine Logos je Protokollreihe; `aufbereiten`
 * setzt `reihenLogos` leer – es gelten die Logos des Projekts.
 */
function migriere(roh: Partial<ProjektsteuerungDaten>): ProjektsteuerungDaten {
  let stand = roh;
  if ((roh.version ?? 1) < 2) stand = { ...stand, gewerke: [...STANDARD_GEWERKE] };
  return aufbereiten(stand);
}

/**
 * Zustand nach dem Laden: `ladefehler` – der gespeicherte Stand ließ sich nicht
 * lesen; `neuere_fassung` – er stammt aus einer neueren Fassung von KaPlan. In
 * beiden Fällen zeigt der Bereich Demodaten und speichert nicht, damit der
 * gespeicherte Stand erhalten bleibt (Hinweis: components/Hinweisleisten.tsx).
 */
export type LadeZustand = 'ok' | 'ladefehler' | 'neuere_fassung';

export interface Geladen {
  daten: ProjektsteuerungDaten;
  zustand: LadeZustand;
}

/**
 * Liest den gespeicherten Stand. Vor einer Umstellung auf die aktuelle Fassung
 * legt es den gespeicherten Text einmalig unter `<Schlüssel>.vor-fassung-<n>` ab.
 */
export function ladeDaten(): Geladen {
  const demo = (zustand: LadeZustand): Geladen => ({ daten: seedDaten(), zustand });
  let roh: string | null;
  try {
    roh = localStorage.getItem(KEY);
  } catch {
    return demo('ladefehler');
  }
  if (!roh) return demo('ok');
  let daten: Partial<ProjektsteuerungDaten>;
  try {
    daten = JSON.parse(roh) as Partial<ProjektsteuerungDaten>;
  } catch {
    return demo('ladefehler');
  }
  if (!daten || typeof daten !== 'object' || !Array.isArray(daten.projekte)) return demo('ladefehler');
  if (typeof daten.version === 'number' && daten.version > DATEN_VERSION) return demo('neuere_fassung');
  // Vor einer Umstellung den gespeicherten Text einmalig sichern – scheitert das, wird trotzdem umgestellt
  if ((daten.version ?? 1) < DATEN_VERSION) {
    try {
      const schluessel = `${VOR_FASSUNG}${daten.version ?? 1}`;
      if (localStorage.getItem(schluessel) === null) localStorage.setItem(schluessel, roh);
    } catch {
      /* kein Platz für die Kopie – der Stand lässt sich weiterhin herunterladen */
    }
  }
  try {
    return { daten: daten.version === DATEN_VERSION ? aufbereiten(daten) : migriere(daten), zustand: 'ok' };
  } catch {
    return demo('ladefehler');
  }
}

/** Ergebnis des Speicherns: gespeichert, Speicher voll oder Speicher nicht nutzbar (gesperrt). */
export type SpeicherZustand = 'ok' | 'voll' | 'gesperrt';

/**
 * Speichert den Bestand; der Store ruft das nur bei `ladeZustand === 'ok'`
 * auf. Ist der Speicher voll, werden Rohkopien (`<Schlüssel>.vor-fassung-<n>`,
 * `<Schlüssel>.vor-einspielen-…`) entfernt, bis er passt – die eigenen zuerst,
 * nötigenfalls auch die anderer Bereiche (`nachRaeumenSpeichern`).
 * Liefert, ob der Bestand gespeichert ist bzw. warum nicht – dann zeigt der
 * Bereich einen dauerhaften Hinweis (components/Hinweisleisten.tsx).
 */
export function speichereDaten(daten: ProjektsteuerungDaten): SpeicherZustand {
  const inhalt = JSON.stringify(daten);
  try {
    localStorage.setItem(KEY, inhalt);
    return 'ok';
  } catch (err) {
    if (!speicherVoll(err)) {
      console.warn('Daten konnten nicht lokal gespeichert werden:', err);
      return 'gesperrt';
    }
  }
  try {
    return nachRaeumenSpeichern(KEY, inhalt) ? 'ok' : 'voll';
  } catch (err) {
    console.warn('Daten konnten nicht lokal gespeichert werden:', err);
    return speicherVoll(err) ? 'voll' : 'gesperrt';
  }
}

/**
 * Legt den gespeicherten Text unverändert als
 * `<Schlüssel>.vor-einspielen-<Zeitpunkt>` ab – vor dem Einspielen einer
 * Sicherung, wenn er sich nicht laden ließ und sonst ohne Kopie überschrieben
 * würde. Wie die Rohkopien vor einer Umstellung räumt das Speichern sie, wenn
 * der Speicher voll ist (src/shared/speicher.ts). Liefert `gescheitert`, wenn
 * die Kopie nicht in den Speicher passt – dann fragt der Dialog nach.
 */
export function rohkopieVorEinspielen(): RohkopieErgebnis {
  return rohkopieAnlegen(KEY);
}

function herunterladen(inhalt: string, dateiname: string): void {
  const blob = new Blob([inhalt], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = dateiname;
  a.click();
  URL.revokeObjectURL(url);
}

/** Lädt den gesamten Bestand des Bereichs als JSON-Datei herunter. */
export function exportiereDaten(daten: ProjektsteuerungDaten): void {
  const inhalt = { bereich: SICHERUNG_BEREICH, ...daten };
  herunterladen(JSON.stringify(inhalt, null, 2), `projektsteuerung-sicherung-${today()}.json`);
}

/**
 * Lädt den gespeicherten Stand unverändert herunter – nach einem Ladefehler,
 * damit er nicht verloren geht. Liefert false, wenn keiner vorhanden ist.
 */
export function rohdatenHerunterladen(): boolean {
  let roh: string | null = null;
  try {
    roh = localStorage.getItem(KEY);
  } catch {
    return false;
  }
  if (roh === null) return false;
  herunterladen(roh, `projektsteuerung-gespeicherter-stand-${today()}.json`);
  return true;
}

/**
 * Liest eine Sicherung und hebt sie auf die aktuelle Fassung. Wirft einen
 * Fehler mit verständlicher Meldung, wenn die Datei nicht passt.
 */
export function sicherungLesen(inhalt: string): ProjektsteuerungDaten {
  let roh: unknown;
  try {
    roh = JSON.parse(inhalt);
  } catch {
    throw new Error('Die Datei ist keine gültige JSON-Datei.');
  }
  if (!roh || typeof roh !== 'object') throw new Error('Die Datei enthält keine Sicherung.');
  const daten = roh as Partial<ProjektsteuerungDaten> & { bereich?: string; projects?: unknown; protocols?: unknown };
  if (Array.isArray(daten.projects)) {
    throw new Error('Die Datei ist eine Sicherung des Planlaufmanagements – bitte dort einspielen.');
  }
  if (daten.bereich === 'baubetrieb') {
    throw new Error('Die Datei ist eine Sicherung der Baubetriebsplanung – bitte dort einspielen.');
  }
  if (Array.isArray(daten.protocols)) {
    throw new Error('Die Datei stammt aus dem Protokoll-Tool – bitte im Projekt unter „Protokolle“ importieren.');
  }
  if (daten.bereich !== SICHERUNG_BEREICH || !Array.isArray(daten.projekte) || !Array.isArray(daten.funktionen)) {
    throw new Error('Die Datei ist keine Sicherung der Projektsteuerung.');
  }
  if ((daten.version ?? 0) > DATEN_VERSION) {
    throw new Error(
      'Die Sicherung stammt aus einer neueren Fassung von KaPlan. Bitte die Seite neu laden (Strg+Umschalt+R) und erneut einspielen.',
    );
  }
  return migriere(daten);
}
