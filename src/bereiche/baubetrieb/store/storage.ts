/**
 * Lokale Persistenz des Bereichs „Baubetriebsplanung“ unter einem eigenen
 * Schlüssel. Der Bestand des Planlaufmanagements wird dabei weder gelesen noch
 * geschrieben.
 */
import { seedDaten, standardEinstellungen, standardRilFristen } from '../domain/seed';
import {
  NACHHAK_TAGE,
  STATUS_AUS_NUMMER,
  standardWorkflows,
  statusInfo,
  workflowFuerArt,
  zielText,
} from '../domain/workflow';
import {
  ALLE_ARTEN,
  ANNEX_VII,
  DATEN_VERSION,
  LOESCHEN,
  RIL_BEZUG_LABEL,
  RIL_SCHLUESSEL,
  STANDARD_BEARBEITER,
  STATUS_ART_LABEL,
  type Anmeldung,
  type AnmeldungStand,
  type AnmeldungsArt,
  type BaubetriebDaten,
  type Einstellungen,
  type FristRegel,
  type Projekt,
  type RilBezug,
  type RilFrist,
  type StatusArt,
  type VerlaufEintrag,
  type Workflow,
  type WorkflowStatus,
} from '../domain/types';

export { DATEN_VERSION };

const KEY = 'baubetrieb-planung.data.v1';

/** Kennzeichen in Sicherungsdateien, damit sie dem richtigen Bereich zugeordnet werden. */
const SICHERUNG_BEREICH = 'baubetrieb';

const ANNEX_IDS = ANNEX_VII.map((a) => a.id) as string[];

const zahl = (wert: unknown, vorgabe: number) =>
  typeof wert === 'number' && Number.isFinite(wert) ? wert : vorgabe;
const text = (wert: unknown) => (typeof wert === 'string' ? wert : '');
const datum = (wert: unknown) => (typeof wert === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(wert) ? wert : null);
const zufallsId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

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

function fristAufbereiten(roh: Partial<FristRegel> & Record<string, unknown>, nachhakTage: number): FristRegel {
  switch (roh?.typ) {
    case 'ril':
      return {
        typ: 'ril',
        bezug: (roh.bezug as string) in RIL_BEZUG_LABEL ? (roh.bezug as RilBezug) : 'X',
        versatzTage: zahl(roh.versatzTage, 0),
      };
    case 'stichtag':
      return { typ: 'stichtag', tag: zahl(roh.tag, 1), monat: zahl(roh.monat, 1) };
    case 'nachhaken':
      return { typ: 'nachhaken', tage: zahl(roh.tage, nachhakTage) };
    default:
      return { typ: 'keine' };
  }
}

function workflowsAufbereiten(roh: unknown, nachhakTage: number): Workflow[] {
  if (!Array.isArray(roh) || roh.length === 0) return standardWorkflows();
  return roh.map((w: Partial<Workflow>): Workflow => {
    const arten = (Array.isArray(w.arten) ? w.arten : []).filter((a) => ALLE_ARTEN.includes(a));
    return {
      id: text(w.id) || zufallsId('wf'),
      name: text(w.name) || 'Workflow',
      kurz: text(w.kurz),
      beschreibung: text(w.beschreibung),
      herkunft: w.herkunft === 'standard' ? 'standard' : 'manuell',
      bauzeitraum: w.bauzeitraum === 'fahrplanjahr' ? 'fahrplanjahr' : 'tagesscharf',
      arten: arten.length > 0 ? arten : [...ALLE_ARTEN],
      status: (Array.isArray(w.status) ? w.status : []).map(
        (s: Partial<WorkflowStatus>): WorkflowStatus => ({
          id: text(s.id) || zufallsId('st'),
          name: text(s.name) || 'Status',
          art: (s.art as string) in STATUS_ART_LABEL ? (s.art as StatusArt) : 'entwurf',
          frist: fristAufbereiten((s.frist ?? {}) as never, nachhakTage),
          nachhaken: s.nachhaken === true,
          bemerkung: text(s.bemerkung),
          nachfolger: (Array.isArray(s.nachfolger) ? s.nachfolger : []).filter((z) => typeof z === 'string'),
        }),
      ),
    };
  });
}

/** Status, auf den eine Anmeldung ohne gültigen Status gesetzt wird: Start des passenden Workflows. */
function ersatzStatus(workflows: Workflow[], art: AnmeldungsArt): string {
  const workflow = workflowFuerArt(workflows, art) ?? workflows.find((w) => w.status.length > 0);
  return workflow?.status[0]?.id ?? '';
}

/** Ergänzt fehlende Felder, damit ältere oder von Hand bearbeitete Stände laden. */
function aufbereiten(roh: Partial<BaubetriebDaten>): BaubetriebDaten {
  const einstellungen = einstellungenAufbereiten(roh.einstellungen);
  const workflows = workflowsAufbereiten(roh.workflows, einstellungen.nachhakTage);
  const projekte = (Array.isArray(roh.projekte) ? roh.projekte : []).map(
    (p: Partial<Projekt>): Projekt => ({
      id: text(p.id) || zufallsId('pr'),
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
      const art = ALLE_ARTEN.includes(a.art as AnmeldungsArt) ? (a.art as AnmeldungsArt) : 'A_unterjahr';
      const statusId = statusInfo(workflows, text(a.statusId)) ? text(a.statusId) : ersatzStatus(workflows, art);
      return {
        id: text(a.id) || zufallsId('an'),
        projektId: text(a.projektId),
        anmeldeId: text(a.anmeldeId),
        art,
        statusId,
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
        verlauf: (Array.isArray(a.verlauf) ? a.verlauf : []).map((v) => ({
          ...v,
          vonText: text(v.vonText),
          nachText: text(v.nachText),
        })),
      };
    });
  return { version: DATEN_VERSION, einstellungen, workflows, projekte, anmeldungen };
}

/* ------------------------------------------------------------------ */
/* Migration                                                           */
/* ------------------------------------------------------------------ */

/** Fassung 2 führte statt einer Status-ID die Statusnummer des Lastenhefts (V0 … Y9, Z0). */
type Fassung2Anmeldung = Omit<Anmeldung, 'statusId' | 'verlauf'> & {
  status?: string;
  verlauf?: (Omit<VerlaufEintrag, 'vorher' | 'vonText' | 'nachText'> & {
    vorher?: Omit<AnmeldungStand, 'statusId'> & { status?: string };
  })[];
};

/** Statusnummer → Status-ID der Standard-Workflows; „Z0“ war die Anmeldeleiche, die sofort löschte. */
const ausNummer = (nummer: string | null | undefined): string | null =>
  !nummer ? null : nummer === 'Z0' ? LOESCHEN : (STATUS_AUS_NUMMER[nummer] ?? null);

/**
 * Hebt Fassung 2 auf Fassung 3: Die Standard-Workflows kommen hinzu, und die
 * Statusnummern in Anmeldungen und Verlauf werden den Status der
 * Standard-Workflows zugeordnet.
 */
function ausFassung2(roh: Partial<BaubetriebDaten> & { anmeldungen?: unknown }): Partial<BaubetriebDaten> {
  // Bisher galt ein Nachhak-Abstand für alle Status – er geht in die Standard-Workflows über.
  const workflows = standardWorkflows(zahl(roh.einstellungen?.nachhakTage, NACHHAK_TAGE));
  const anmeldungen = (Array.isArray(roh.anmeldungen) ? (roh.anmeldungen as Fassung2Anmeldung[]) : []).map(
    ({ status, verlauf, ...rest }): Anmeldung => ({
      ...rest,
      statusId: ausNummer(status) ?? '',
      verlauf: (verlauf ?? []).map(({ vorher, ...v }) => {
        const von = ausNummer(v.von);
        const nach = ausNummer(v.nach);
        const eintrag: VerlaufEintrag = {
          ...v,
          von,
          nach,
          vonText: von ? zielText(workflows, von) : '',
          nachText: nach ? zielText(workflows, nach) : '',
        };
        if (vorher) {
          const { status: vorherStatus, ...stand } = vorher;
          eintrag.vorher = { ...stand, statusId: ausNummer(vorherStatus) ?? '' };
        }
        return eintrag;
      }),
    }),
  );
  return { ...roh, workflows, anmeldungen };
}

/** Kurzbezeichnung der unterjährigen Anmeldung bis Fassung 3. */
const ALTE_KURZ_UNTERJAEHRIG = 'Unterjahr';

/**
 * Hebt Fassung 3 auf Fassung 4: Die unterjährige Anmeldung heißt kurz
 * „Unterjährig“ (nur, wenn die mitgelieferte Kurzbezeichnung nicht geändert
 * wurde), die Texte im Statusverlauf folgen, und die Beschreibungen der
 * Standard-Workflows sprechen vom Sperrzeitraum.
 */
function ausFassung3(roh: Partial<BaubetriebDaten>): Partial<BaubetriebDaten> {
  const neu = standardWorkflows();
  const neueKurz = neu.find((w) => w.id === 'wf-unterjahr')?.kurz ?? ALTE_KURZ_UNTERJAEHRIG;
  const alterPraefix = `${ALTE_KURZ_UNTERJAEHRIG} · `;
  const umbenennen = (t: unknown) =>
    typeof t === 'string' && t.startsWith(alterPraefix) ? `${neueKurz} · ${t.slice(alterPraefix.length)}` : t;
  const workflows = (Array.isArray(roh.workflows) ? roh.workflows : []).map((w: Partial<Workflow>) => ({
    ...w,
    kurz: w.id === 'wf-unterjahr' && w.kurz === ALTE_KURZ_UNTERJAEHRIG ? neueKurz : w.kurz,
    beschreibung:
      w.herkunft === 'standard' && typeof w.beschreibung === 'string'
        ? w.beschreibung.replace('Bauzeitraum ganzes Fahrplanjahr', 'Sperrzeitraum ganzes Fahrplanjahr')
        : w.beschreibung,
  }));
  const anmeldungen = (Array.isArray(roh.anmeldungen) ? roh.anmeldungen : []).map((a: Partial<Anmeldung>) => ({
    ...a,
    verlauf: Array.isArray(a.verlauf)
      ? a.verlauf.map((v) => ({ ...v, vonText: umbenennen(v.vonText), nachText: umbenennen(v.nachText) }))
      : a.verlauf,
  }));
  return { ...roh, workflows: workflows as Workflow[], anmeldungen: anmeldungen as Anmeldung[] };
}

/** Nachfolger bis Fassung 4, der den Eintrag sofort als Anmeldeleiche löschte. */
const ALTES_ZIEL_ANMELDELEICHE = 'anmeldeleiche';

/**
 * Hebt Fassung 4 auf Fassung 5: Die Anmeldeleiche ist ein eigener Status,
 * gelöscht wird erst im nächsten Schritt. Jeder Workflow, der auf die
 * Anmeldeleiche verwies, erhält am Ende den Status „Anmeldeleiche“ – in den
 * Standard-Workflows mit deren fester Kennung. Die bisherigen Verweise zeigen
 * auf ihn, und sein einziger Nachfolger ist „Eintrag löschen“.
 */
function ausFassung4(roh: Partial<BaubetriebDaten>): Partial<BaubetriebDaten> {
  const standard = standardWorkflows();
  const alle = Array.isArray(roh.workflows) ? roh.workflows : [];
  const vergeben = new Set(alle.flatMap((w) => (Array.isArray(w.status) ? w.status.map((s) => s.id) : [])));
  const workflows = alle.map((w: Partial<Workflow>) => {
    const vorlage = standard.find((x) => x.id === w.id)?.status.find((s) => s.art === 'leiche');
    // Speichert eine ältere Fassung (etwa aus dem Zwischenspeicher) einen Bestand der Fassung 5,
    // wird aus der ihr unbekannten Art „Anmeldeleiche“ ein „Entwurf“ – die feste Kennung verrät ihn.
    const status = (Array.isArray(w.status) ? w.status : []).map((s) =>
      vorlage && s.id === vorlage.id ? { ...s, art: 'leiche' as const } : s,
    );
    const verweist = (s: Partial<WorkflowStatus>) =>
      Array.isArray(s.nachfolger) && s.nachfolger.includes(ALTES_ZIEL_ANMELDELEICHE);
    if (!status.some(verweist)) return { ...w, status };
    const id = vorlage && !vergeben.has(vorlage.id) ? vorlage.id : zufallsId('st');
    vergeben.add(id);
    const leiche: WorkflowStatus = {
      id,
      name: 'Anmeldeleiche',
      art: 'leiche',
      frist: { typ: 'keine' },
      nachhaken: false,
      bemerkung: '',
      nachfolger: [LOESCHEN],
    };
    return {
      ...w,
      status: [
        ...status.map((s) =>
          verweist(s) ? { ...s, nachfolger: s.nachfolger!.map((z) => (z === ALTES_ZIEL_ANMELDELEICHE ? id : z)) } : s,
        ),
        leiche,
      ],
    };
  });
  return { ...roh, workflows: workflows as Workflow[] };
}

/**
 * Hebt einen älteren Stand auf die aktuelle Fassung – in einem Aufruf, Schritt
 * für Schritt. Fassung 1 kannte nur den Farbmodus; der Bereich hatte noch
 * keinen Inhalt. Sie erhält deshalb die Demodaten und behält ihre Einstellung.
 */
function migriere(roh: Partial<BaubetriebDaten>): BaubetriebDaten {
  const version = roh.version ?? 1;
  if (version < 2 || !Array.isArray(roh.projekte)) {
    const neu = seedDaten();
    return { ...neu, einstellungen: { ...neu.einstellungen, farbmodus: roh.einstellungen?.farbmodus ?? 'standard' } };
  }
  // Fassung 2 erhält die Standard-Workflows bereits in der aktuellen Form; die
  // folgenden Schritte finden darin nichts mehr zu ändern.
  let stand = roh;
  if (version <= 2) stand = ausFassung2(stand);
  if (version <= 3) stand = ausFassung3(stand);
  if (version <= 4) stand = ausFassung4(stand);
  return aufbereiten(stand);
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
