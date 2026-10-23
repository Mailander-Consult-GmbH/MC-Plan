/**
 * Lokale Persistenz des Bereichs „Projektsteuerung“ unter einem eigenen
 * Schlüssel. Die Bestände der anderen Bereiche werden weder gelesen noch
 * geschrieben.
 */
import { today } from '../../../shared/dates';
import { leereLop } from '../domain/lop';
import { STANDARD_GEWERKE, seedDaten } from '../domain/seed';
import {
  DATEN_VERSION,
  STANDARD_BEARBEITER,
  STANDARD_HINWEIS,
  TEILNAHME,
  type Beteiligter,
  type Eintrag,
  type Funktion,
  type Logo,
  type Lop,
  type LopPunkt,
  type LopThema,
  type Projekt,
  type ProjektsteuerungDaten,
  type Protokoll,
  type Teilnahme,
  type Teilnehmer,
  type Top,
  type Vorstand,
} from '../domain/types';

export { DATEN_VERSION };

const KEY = 'projektsteuerung.data.v1';

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

function vorstand(w: unknown): Vorstand | null {
  if (!w || typeof w !== 'object') return null;
  const v = w as Roh;
  return {
    ...(v.typ === 'I' || v.typ === 'F' || v.typ === 'A' ? { typ: v.typ } : {}),
    text: text(v.text),
    wer: text(v.wer),
    termin: datum(v.termin),
    status: erledigung(v.status),
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
  return {
    id: text(p.id) || zufallsId('pt'),
    projektId: text(p.projektId),
    reiheId: text(p.reiheId) || zufallsId('rh'),
    art: text(p.art),
    nr: Math.max(1, Math.round(zahl(p.nr, 1))),
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
        eintraege: liste(t.eintraege).map(
          (e): Eintrag => ({
            id: text(e.id) || zufallsId('e'),
            typ: e.typ === 'F' || e.typ === 'A' ? e.typ : 'I',
            text: text(e.text),
            zusatz: text(e.zusatz),
            wer: text(e.wer),
            termin: datum(e.termin),
            status: erledigung(e.status),
            herkunft: text(e.herkunft),
            uebernommenIn: idOderNull(e.uebernommenIn),
            lopPunktId: idOderNull(e.lopPunktId),
            vor: vorstand(e.vor),
          }),
        ),
      }),
    ),
    geaendert: text(p.geaendert) || new Date().toISOString(),
  };
}

function lopAufbereiten(l: Roh, projektId: string): Lop {
  const leer = leereLop(projektId);
  const themen = liste(l.themen).map(
    (t): LopThema => ({
      id: text(t.id) || zufallsId('th'),
      titel: text(t.titel),
      vorTitel: typeof t.vorTitel === 'string' ? t.vorTitel : null,
    }),
  );
  const punkte = liste(l.punkte).map(
    (p): LopPunkt => ({
      id: text(p.id) || zufallsId('lp'),
      nr: Math.max(1, Math.round(zahl(p.nr, 1))),
      themaId: text(p.themaId),
      text: text(p.text),
      zusatz: text(p.zusatz),
      wer: text(p.wer),
      termin: datum(p.termin),
      status: erledigung(p.status),
      erledigtAm: datum(p.erledigtAm),
      herkunft: text(p.herkunft),
      erfasst: datum(p.erfasst) || today(),
      vor: vorstand(p.vor),
      archiviertAb: typeof p.archiviertAb === 'number' ? p.archiviertAb : null,
    }),
  );
  const themenListe = themen.length > 0 ? themen : leer.themen;
  // Punkte ohne gültiges Thema landen im ersten Thema.
  const themaIds = new Set(themenListe.map((t) => t.id));
  const punkteListe = punkte.map((p) => (themaIds.has(p.themaId) ? p : { ...p, themaId: themenListe[0].id }));
  const hoechste = punkteListe.reduce((m, p) => Math.max(m, p.nr), 0);
  return {
    projektId,
    stand: Math.max(1, Math.round(zahl(l.stand, 1))),
    standDatum: datum(l.standDatum) || today(),
    aufgestelltVon: idOderNull(l.aufgestelltVon),
    hinweis: text(l.hinweis),
    themen: themenListe,
    punkte: punkteListe,
    naechsteNr: Math.max(hoechste + 1, Math.round(zahl(l.naechsteNr, 1))),
    fortschreibungen: liste(l.fortschreibungen).map((f) => ({
      stand: Math.round(zahl(f.stand, 1)),
      datum: datum(f.datum) || today(),
    })),
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
      logos: Array.isArray(p.logos)
        ? liste(p.logos)
            .filter((l) => text(l.src))
            .map((l): Logo => ({ id: text(l.id) || zufallsId('logo'), name: text(l.name), src: text(l.src) }))
        : null,
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
  // Je Projekt genau eine LOP
  const lopRoh = liste(roh.lops);
  const lops = projekte.map((p) => {
    const l = lopRoh.find((x) => text(x.projektId) === p.id);
    return l ? lopAufbereiten(l, p.id) : leereLop(p.id);
  });
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
    lops,
  };
}

/**
 * Hebt einen älteren Stand auf die aktuelle Fassung – in einem Aufruf, Schritt
 * für Schritt. Fassung 1 kannte weder Gewerke noch Verweise auf LOP-Punkte:
 * Sie erhält die mitgelieferten Gewerke; ihre Funktionen gelten als
 * übergreifend, ihre Aufgaben als nicht übernommen (beides ergänzt
 * `aufbereiten`).
 */
function migriere(roh: Partial<ProjektsteuerungDaten>): ProjektsteuerungDaten {
  let stand = roh;
  if ((roh.version ?? 1) < 2) stand = { ...stand, gewerke: [...STANDARD_GEWERKE] };
  return aufbereiten(stand);
}

export function ladeDaten(): ProjektsteuerungDaten {
  try {
    const roh = localStorage.getItem(KEY);
    if (!roh) return seedDaten();
    const daten = JSON.parse(roh) as Partial<ProjektsteuerungDaten>;
    if (!daten || typeof daten !== 'object') return seedDaten();
    return daten.version === DATEN_VERSION ? aufbereiten(daten) : migriere(daten);
  } catch {
    return seedDaten();
  }
}

export function speichereDaten(daten: ProjektsteuerungDaten): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(daten));
  } catch (err) {
    console.warn('Daten konnten nicht lokal gespeichert werden:', err);
  }
}

/** Lädt den gesamten Bestand des Bereichs als JSON-Datei herunter. */
export function exportiereDaten(daten: ProjektsteuerungDaten): void {
  const inhalt = { bereich: SICHERUNG_BEREICH, ...daten };
  const blob = new Blob([JSON.stringify(inhalt, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `projektsteuerung-sicherung-${today()}.json`;
  a.click();
  URL.revokeObjectURL(url);
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
