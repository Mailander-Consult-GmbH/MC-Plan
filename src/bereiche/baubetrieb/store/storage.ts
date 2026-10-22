/**
 * Lokale Persistenz des Bereichs „Baubetriebsplanung“ unter einem eigenen
 * Schlüssel. Der Bestand des Planlaufmanagements wird dabei weder gelesen noch
 * geschrieben.
 */
import { seedDaten, standardEinstellungen, standardRilFristen } from '../domain/seed';
import { statusDef } from '../domain/workflow';
import {
  ANNEX_VII,
  ARTEN_JE_PHASE,
  DATEN_VERSION,
  RIL_SCHLUESSEL,
  STANDARD_BEARBEITER,
  type Anmeldung,
  type AnmeldungsArt,
  type BaubetriebDaten,
  type Einstellungen,
  type Projekt,
  type RilFrist,
} from '../domain/types';

export { DATEN_VERSION };

const KEY = 'baubetrieb-planung.data.v1';

/** Kennzeichen in Sicherungsdateien, damit sie dem richtigen Bereich zugeordnet werden. */
const SICHERUNG_BEREICH = 'baubetrieb';

const ALLE_ARTEN = Object.values(ARTEN_JE_PHASE).flat();
const ANNEX_IDS = ANNEX_VII.map((a) => a.id) as string[];

const zahl = (wert: unknown, vorgabe: number) =>
  typeof wert === 'number' && Number.isFinite(wert) ? wert : vorgabe;
const text = (wert: unknown) => (typeof wert === 'string' ? wert : '');
const datum = (wert: unknown) => (typeof wert === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(wert) ? wert : null);

function einstellungenAufbereiten(roh: Partial<Einstellungen> | undefined): Einstellungen {
  const vorgabe = standardEinstellungen();
  const ril = standardRilFristen();
  const gespeichert = (roh?.rilFristen ?? {}) as Partial<Record<string, Partial<RilFrist>>>;
  for (const s of RIL_SCHLUESSEL) {
    const g = gespeichert[s];
    if (!g) continue;
    ril[s] = {
      bezug: g.bezug === 'baubeginn' ? 'baubeginn' : 'stichtag',
      tag: zahl(g.tag, ril[s].tag),
      monat: zahl(g.monat, ril[s].monat),
      jahreVorher: zahl(g.jahreVorher, ril[s].jahreVorher),
      wochenVorher: zahl(g.wochenVorher, ril[s].wochenVorher),
      platzhalter: g.platzhalter !== false,
    };
  }
  return {
    farbmodus: roh?.farbmodus === 'kontrast' ? 'kontrast' : 'standard',
    bearbeiter: text(roh?.bearbeiter).trim() || STANDARD_BEARBEITER,
    vorlaufTage: zahl(roh?.vorlaufTage, vorgabe.vorlaufTage),
    nachhakTage: zahl(roh?.nachhakTage, vorgabe.nachhakTage),
    bedarfVorschauTage: zahl(roh?.bedarfVorschauTage, vorgabe.bedarfVorschauTage),
    rilFristen: ril,
  };
}

/** Ergänzt fehlende Felder, damit ältere oder von Hand bearbeitete Stände laden. */
function aufbereiten(roh: Partial<BaubetriebDaten>): BaubetriebDaten {
  const projekte = (Array.isArray(roh.projekte) ? roh.projekte : []).map(
    (p: Partial<Projekt>): Projekt => ({
      id: text(p.id) || `pr-${Math.random().toString(36).slice(2, 10)}`,
      name: text(p.name) || 'Ohne Bezeichnung',
      projektleiter: text(p.projektleiter),
      dbGNummer: text(p.dbGNummer),
      ersterAnmeldetermin: datum(p.ersterAnmeldetermin),
      erstePhase: p.erstePhase ?? 'skm',
      bauzeitVon: datum(p.bauzeitVon),
      bauzeitBis: datum(p.bauzeitBis),
      inbetriebnahme: datum(p.inbetriebnahme),
      hauptbearbeiter: text(p.hauptbearbeiter),
      projektnummer: text(p.projektnummer),
      status: p.status === 'pausiert' || p.status === 'abgeschlossen' ? p.status : 'aktiv',
      markiert: p.markiert !== false,
      bemerkung: text(p.bemerkung),
    }),
  );
  const projektIds = new Set(projekte.map((p) => p.id));
  const anmeldungen = (Array.isArray(roh.anmeldungen) ? roh.anmeldungen : [])
    .filter((a: Partial<Anmeldung>) => projektIds.has(text(a.projektId)))
    .map((a: Partial<Anmeldung>): Anmeldung => {
      const status = a.status && statusDef(a.status).code === a.status ? a.status : 'Y0';
      const phase = statusDef(status).phase;
      const arten = phase === 'Z' ? ALLE_ARTEN : ARTEN_JE_PHASE[phase];
      return {
        id: text(a.id) || `an-${Math.random().toString(36).slice(2, 10)}`,
        projektId: text(a.projektId),
        anmeldeId: text(a.anmeldeId),
        art: arten.includes(a.art as AnmeldungsArt) ? (a.art as AnmeldungsArt) : arten[0],
        status,
        statusSeit: datum(a.statusSeit) ?? new Date().toISOString().slice(0, 10),
        bauVon: datum(a.bauVon),
        bauBis: datum(a.bauBis),
        fahrplanjahr: typeof a.fahrplanjahr === 'number' ? a.fahrplanjahr : null,
        bfStrecke: text(a.bfStrecke),
        gewerk: text(a.gewerk),
        aenderungsNr: text(a.aenderungsNr),
        annexVII: a.annexVII && ANNEX_IDS.includes(a.annexVII) ? a.annexVII : null,
        terminManuell: datum(a.terminManuell),
        bemerkung: text(a.bemerkung),
        herkunftId: typeof a.herkunftId === 'string' ? a.herkunftId : null,
        verlauf: Array.isArray(a.verlauf) ? a.verlauf : [],
      };
    });
  return {
    version: DATEN_VERSION,
    einstellungen: einstellungenAufbereiten(roh.einstellungen),
    projekte,
    anmeldungen,
  };
}

/**
 * Hebt einen älteren Stand auf die aktuelle Fassung. Fassung 1 kannte nur
 * den Farbmodus – der Bereich hatte noch keinen Inhalt. Sie erhält deshalb
 * die Demodaten und behält ihre Einstellung.
 */
function migriere(roh: Partial<BaubetriebDaten>): BaubetriebDaten {
  if ((roh.version ?? 1) < 2 || !Array.isArray(roh.projekte)) {
    const neu = seedDaten();
    return { ...neu, einstellungen: { ...neu.einstellungen, farbmodus: roh.einstellungen?.farbmodus ?? 'standard' } };
  }
  return aufbereiten(roh);
}

export function ladeDaten(): BaubetriebDaten {
  try {
    const roh = localStorage.getItem(KEY);
    if (!roh) return seedDaten();
    const daten = JSON.parse(roh) as Partial<BaubetriebDaten>;
    if (!daten || typeof daten !== 'object') return seedDaten();
    return daten.version === DATEN_VERSION ? aufbereiten(daten) : migriere(daten);
  } catch {
    return seedDaten();
  }
}

export function speichereDaten(daten: BaubetriebDaten): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(daten));
  } catch (err) {
    console.warn('Daten konnten nicht lokal gespeichert werden:', err);
  }
}

/** Lädt den gesamten Bestand als JSON-Datei herunter. */
export function exportiereDaten(daten: BaubetriebDaten): void {
  const inhalt = { bereich: SICHERUNG_BEREICH, ...daten };
  const blob = new Blob([JSON.stringify(inhalt, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `baubetrieb-sicherung-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Liest eine Sicherung und hebt sie auf die aktuelle Fassung. Wirft einen
 * Fehler mit verständlicher Meldung, wenn die Datei nicht passt.
 */
export function sicherungLesen(inhalt: string): BaubetriebDaten {
  let roh: unknown;
  try {
    roh = JSON.parse(inhalt);
  } catch {
    throw new Error('Die Datei ist keine gültige JSON-Datei.');
  }
  if (!roh || typeof roh !== 'object') throw new Error('Die Datei enthält keine Sicherung.');
  const daten = roh as Partial<BaubetriebDaten> & { bereich?: string; projects?: unknown };
  if (Array.isArray(daten.projects)) {
    throw new Error('Die Datei ist eine Sicherung des Planlaufmanagements – bitte dort einspielen.');
  }
  if (daten.bereich !== SICHERUNG_BEREICH || !Array.isArray(daten.projekte) || !Array.isArray(daten.anmeldungen)) {
    throw new Error('Die Datei ist keine Sicherung der Baubetriebsplanung.');
  }
  if ((daten.version ?? 0) > DATEN_VERSION) {
    throw new Error(
      'Die Sicherung stammt aus einer neueren Fassung von KaPlan. Bitte die Seite neu laden (Strg+Umschalt+R) und erneut einspielen.',
    );
  }
  return migriere(daten);
}
