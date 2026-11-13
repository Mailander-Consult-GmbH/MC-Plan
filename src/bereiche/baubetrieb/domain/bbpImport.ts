/**
 * Import der Anmeldungen aus BBPNeo – nur KM und KKM. Gelesen wird ein
 * Excel-Export von BBPNeo (etwa „Export Anmeldung (OS)“); die Spalten erkennt
 * der Import an ihren Überschriften („Anmeldung::ID“ …), denn die Exporte von
 * BBPNeo ordnen sie unterschiedlich an.
 *
 * Eine Anmeldung steht im Export meist in mehreren Zeilen, die sich nur im
 * Bauzeitraum unterscheiden: Je Anmelde-ID entsteht eine Anmeldung in KaPlan
 * mit dem frühesten Beginn und dem spätesten Ende (die Uhrzeit fällt weg).
 * „Vorlage“ und andere Prozessphasen als „2. KP“ (KM N-2), „3. KP“ (KM N-1)
 * und „KKM“ werden übersprungen.
 *
 * Ablauf wie bei den übrigen Importen: `bbpLesen` (Datei → Anmeldungen je ID),
 * `bbpPlanen` (Vorschau gegen den Bestand: neu, aktualisiert, unverändert,
 * übersprungen; Projekte nach DB-G-Nummer) und `bbpImportAnwenden` (rein, im
 * `mutate()` des Stores, mit vorab vergebenen Kennungen). Vorhandene
 * Anmeldungen derselben Anmelde-ID übernehmen alle Angaben aus BBPNeo – leere
 * Angaben der Datei überschreiben nichts –, einen anderen Status als
 * Statuswechsel „Import BBPNeo“ im Verlauf, auch wenn er kein Nachfolger ist.
 */
import { datumLesen, spaltenZuordnen } from '../../../shared/xlsxLesen';
import { bauzeitraumAbgleichen, statusUebernehmen } from './ablauf';
import { fahrplanjahreZwischen } from './fristen';
import {
  ALLE_ARTEN,
  type Anmeldung,
  type AnmeldungsArt,
  type BaubetriebDaten,
  type BbpPhase,
  type BbpStatusZuordnung,
  type ErstePhase,
  type ID,
  type ISODate,
  type KmRunde,
  type Projekt,
} from './types';
import { statusInfo, zielText } from './workflow';

/* ------------------------------------------------------------------ */
/* Spalten                                                             */
/* ------------------------------------------------------------------ */

export type BbpFeld =
  | 'id'
  | 'anmelder'
  | 'status'
  | 'art'
  | 'von'
  | 'bis'
  | 'bbk'
  | 'projektnummer'
  | 'phase'
  | 'titel';

/**
 * Spalten des Exports: Bezeichnung in KaPlan, Lage im Export „Anmeldung (OS)“
 * und die Überschriften, an denen der Import sie erkennt.
 */
export const BBP_SPALTEN: Record<BbpFeld, { label: string; spalte: string; koepfe: string[] }> = {
  id: { label: 'Anmelde-ID', spalte: 'A', koepfe: ['Anmeldung::ID', 'Anmelde-ID'] },
  anmelder: { label: 'Anmelder', spalte: 'F', koepfe: ['Anmeldung::Anmelder', 'Anmelder'] },
  status: {
    label: 'Status im Workflow',
    spalte: 'G',
    koepfe: ['Anmeldung::Fachstatus-ID', 'Status im Workflow', 'Fachstatus-ID'],
  },
  art: {
    label: 'Maßnahmenart',
    spalte: 'L',
    koepfe: ['Anmeldung::Angemeldete Maßnahmenkategorie', 'Angemeldete Maßnahmenkategorie', 'Maßnahmenart'],
  },
  von: { label: 'Sperrzeitraum von', spalte: 'P', koepfe: ['Anmeldung::Bauzeitraum: Beginn', 'Sperrzeitraum von'] },
  bis: { label: 'Sperrzeitraum bis', spalte: 'Q', koepfe: ['Anmeldung::Bauzeitraum: Ende', 'Sperrzeitraum bis'] },
  bbk: {
    label: 'Mitwirkender BBK',
    spalte: 'AC',
    koepfe: ['Anmeldung::Mitwirkende BBK', 'Mitwirkende BBK', 'Mitwirkender BBK'],
  },
  projektnummer: {
    label: 'Projektnummer',
    spalte: 'AG',
    koepfe: ['Anmeldung::Projektnummern', 'Projektnummern', 'Projektnummer'],
  },
  phase: { label: 'Prozessphase', spalte: 'AH', koepfe: ['Anmeldung::Prozessphase', 'Prozessphase'] },
  titel: { label: 'Titel', spalte: 'AJ', koepfe: ['Anmeldung::Titel', 'Titel der Anmeldung'] },
};

export const BBP_FELDER = Object.keys(BBP_SPALTEN) as BbpFeld[];

/** Ohne diese Spalten ist ein Blatt kein Export der Anmeldungen. */
const PFLICHT: BbpFeld[] = ['id', 'status', 'phase'];

function spaltenVon(kopf: string[]): Partial<Record<BbpFeld, number>> {
  return spaltenZuordnen(kopf, Object.fromEntries(BBP_FELDER.map((f) => [f, BBP_SPALTEN[f].koepfe]))) as Partial<
    Record<BbpFeld, number>
  >;
}

/** Ob ein Blatt nach einem Export der Anmeldungen aus BBPNeo aussieht (Anmelde-ID, Status, Prozessphase). */
export function istBbpBlatt(kopf: string[]): boolean {
  const spalten = spaltenVon(kopf);
  return PFLICHT.every((f) => spalten[f] !== undefined);
}

/* ------------------------------------------------------------------ */
/* Werte                                                               */
/* ------------------------------------------------------------------ */

export const BBP_PHASE_LABEL: Record<BbpPhase, string> = { km: 'KM', kkm: 'KKM' };

/** Prozessphase aus BBPNeo: „2. KP“ – KM N-2, „3. KP“ – KM N-1, „KKM“ – KKM; andere – null. */
export function prozessphaseLesen(text: string): { phase: BbpPhase; kmRunde: KmRunde | null } | null {
  const t = text.trim();
  if (/^2\s*\.?\s*K(P|onstruktionsphase)\b/i.test(t)) return { phase: 'km', kmRunde: 'N-2' };
  if (/^3\s*\.?\s*K(P|onstruktionsphase)\b/i.test(t)) return { phase: 'km', kmRunde: 'N-1' };
  if (/^KKM$/i.test(t)) return { phase: 'kkm', kmRunde: null };
  return null;
}

/** Maßnahmenart aus BBPNeo („B (S)“, „b(o)“ …) – oder null, wenn KaPlan sie nicht kennt. */
export function massnahmenartLesen(text: string): AnmeldungsArt | null {
  const t = text.replace(/\s+/g, '').toUpperCase().replace('(O)', '(0)');
  return ALLE_ARTEN.find((a) => a.toUpperCase() === t) ?? null;
}

/** „Vorlage“ – noch nicht angemeldet; wird nie importiert. */
export function istVorlage(status: string): boolean {
  return status.trim().toLowerCase() === 'vorlage';
}

/** Vergleichsschlüssel einer Anmelde-ID: „Anmeldung-131437“ und „131437“ sind dieselbe. */
export function anmeldeIdSchluessel(id: string): string {
  return id
    .trim()
    .toLowerCase()
    .replace(/^anmeldung[\s:-]*/, '')
    .replace(/\s+/g, '');
}

/** Eine Projektnummer vergleichbar gemacht: ohne „G“, Punkte und Leerzeichen. */
const vergleichbar = (nummer: string): string =>
  nummer
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '')
    .replace(/^G/, '');

/** Projektnummern einer Zelle („G.016010101, G.016267085“), vergleichbar gemacht. */
function nummernVon(text: string): string[] {
  return text
    .split(/[,;\n]+/)
    .map(vergleichbar)
    .filter(Boolean);
}

/** Schlüssel einer Zelle „Projektnummern“: ihre vergleichbaren Nummern; leer – ohne Nummer. */
function gruppenSchluessel(text: string): string {
  return nummernVon(text).join(',');
}

/** Projektgruppe einer Zelle „Projektnummern“: Schlüssel, alle Nummern der Gruppe und der Treffer im Bestand. */
interface ProjektZuordnung {
  schluessel: string;
  projektnummer: string;
  treffer: Projekt | null;
}

/**
 * Ordnet die Zellen „Projektnummern“ ihren Projektgruppen zu. Anmeldungen
 * desselben Vorhabens tragen nicht immer dieselbe Liste – eine nennt
 * „G.016010101“, die andere „G.016010101, G.016267085“. Zusammen gehört, was
 * über eine gemeinsame Nummer verbunden ist; so findet auch der Treffer im
 * Bestand ein Projekt schon über eine gemeinsame Nummer. Ohne das entstünden
 * für ein Vorhaben mehrere neue Projekte, die sich in der Vorschau nicht
 * zusammenlegen lassen.
 *
 * Schlüssel der Gruppe ist der ihrer ersten Zelle, ihre Projektnummer nennt
 * alle Nummern. Verbindet eine Zelle zwei verschiedene Projekte des Bestands,
 * bleibt jede Zelle für sich – wohin die Anmeldungen gehören, entscheidet dann
 * die Auswahl in der Vorschau. Zellen ohne Nummer bilden eine eigene Gruppe.
 */
function projektGruppen(zellen: string[], projekte: Projekt[]): Map<string, ProjektZuordnung> {
  const einzeln = new Map<string, { text: string; nummern: string[]; treffer: Projekt | null }>();
  for (const text of zellen) {
    const schluessel = gruppenSchluessel(text);
    if (einzeln.has(schluessel)) continue;
    const nummern = nummernVon(text);
    const treffer =
      nummern.length > 0
        ? (projekte.find((p) => nummernVon(p.dbGNummer).some((n) => nummern.includes(n))) ?? null)
        : null;
    einzeln.set(schluessel, { text, nummern, treffer });
  }

  // Zellen über gemeinsame Nummern verbinden; die früheste Zelle steht für die Gruppe
  const reihenfolge = [...einzeln.keys()];
  const platz = new Map(reihenfolge.map((k, i) => [k, i]));
  const wurzel = new Map(reihenfolge.map((k) => [k, k]));
  const finde = (k: string): string => {
    let w = k;
    while (wurzel.get(w) !== w) w = wurzel.get(w)!;
    return w;
  };
  const ersteMit = new Map<string, string>();
  for (const k of reihenfolge) {
    for (const n of einzeln.get(k)!.nummern) {
      const andere = ersteMit.get(n);
      if (andere === undefined) {
        ersteMit.set(n, k);
        continue;
      }
      const a = finde(andere);
      const b = finde(k);
      if (a === b) continue;
      if (platz.get(a)! < platz.get(b)!) wurzel.set(b, a);
      else wurzel.set(a, b);
    }
  }
  const glieder = new Map<string, string[]>();
  for (const k of reihenfolge) glieder.set(finde(k), [...(glieder.get(finde(k)) ?? []), k]);

  const zuordnung = new Map<string, ProjektZuordnung>();
  for (const [erste, teile] of glieder) {
    const treffer = [...new Set(teile.map((k) => einzeln.get(k)!.treffer).filter((p): p is Projekt => p !== null))];
    if (teile.length === 1 || treffer.length > 1) {
      for (const k of teile) {
        const z = einzeln.get(k)!;
        zuordnung.set(k, { schluessel: k, projektnummer: z.text, treffer: z.treffer });
      }
      continue;
    }
    // alle Nummern der Gruppe in ihrer Schreibweise, jede einmal
    const gesehen = new Set<string>();
    const nummern: string[] = [];
    for (const k of teile) {
      for (const teil of einzeln.get(k)!.text.split(/[,;\n]+/)) {
        const n = vergleichbar(teil);
        if (!n || gesehen.has(n)) continue;
        gesehen.add(n);
        nummern.push(teil.trim());
      }
    }
    const gruppe = { schluessel: erste, projektnummer: nummern.join(', '), treffer: treffer[0] ?? null };
    for (const k of teile) zuordnung.set(k, gruppe);
  }
  return zuordnung;
}

/* ------------------------------------------------------------------ */
/* Lesen                                                               */
/* ------------------------------------------------------------------ */

/** Eine Anmeldung aus BBPNeo – aus allen Zeilen ihrer Anmelde-ID. */
export interface BbpAnmeldung {
  anmeldeId: string;
  /** Zeilen der Datei mit dieser Anmelde-ID. */
  zeilen: number;
  anmelder: string;
  /** Status in BBPNeo („Fachstatus“). */
  status: string;
  /** Maßnahmenart wie in der Datei. */
  art: string;
  /** Frühester Beginn und spätestes Ende aller Zeilen. */
  von: ISODate | null;
  bis: ISODate | null;
  bbk: string;
  projektnummer: string;
  /** Prozessphase wie in der Datei („2. KP“) und daraus Phase und KM-Runde. */
  prozessphase: string;
  phase: BbpPhase;
  kmRunde: KmRunde | null;
  titel: string;
}

export interface BbpUebersprungen {
  /** Leer bei Zeilen ohne Anmelde-ID. */
  anmeldeId: string;
  grund: string;
  zeilen: number;
}

export interface BbpGelesen {
  blatt: string;
  /** Zeilen der Datei ohne Kopf. */
  zeilen: number;
  anmeldungen: BbpAnmeldung[];
  uebersprungen: BbpUebersprungen[];
  /** Spalten, die das Blatt nicht enthält – ihre Angaben bleiben leer bzw. unverändert. */
  fehlend: BbpFeld[];
}

/**
 * Liest ein Blatt des Exports (erste Zeile: Überschriften) und fasst die Zeilen
 * je Anmelde-ID zusammen. Wirft, wenn Anmelde-ID, Status oder Prozessphase fehlen.
 */
export function bbpLesen(zeilen: string[][], blatt: string): BbpGelesen {
  const [kopf = [], ...daten] = zeilen;
  const spalten = spaltenVon(kopf);
  const fehlendPflicht = PFLICHT.filter((f) => spalten[f] === undefined);
  if (fehlendPflicht.length > 0) {
    throw new Error(
      `Das Blatt „${blatt}“ ist kein Export der Anmeldungen aus BBPNeo – es fehlen die Spalten ${fehlendPflicht
        .map((f) => `„${BBP_SPALTEN[f].koepfe[0]}“`)
        .join(', ')}.`,
    );
  }
  const wert = (z: string[], f: BbpFeld) => {
    const i = spalten[f];
    return i === undefined ? '' : (z[i] ?? '').trim();
  };

  // Zeilen je Anmelde-ID in der Reihenfolge der Datei
  const gruppen = new Map<string, string[][]>();
  let ohneId = 0;
  for (const z of daten) {
    const id = wert(z, 'id');
    if (!id) {
      if (z.some((w) => w.trim())) ohneId++;
      continue;
    }
    const schluessel = anmeldeIdSchluessel(id);
    gruppen.set(schluessel, [...(gruppen.get(schluessel) ?? []), z]);
  }

  const anmeldungen: BbpAnmeldung[] = [];
  const uebersprungen: BbpUebersprungen[] =
    ohneId > 0 ? [{ anmeldeId: '', grund: 'ohne Anmelde-ID', zeilen: ohneId }] : [];
  for (const reihe of gruppen.values()) {
    // Die Zeilen einer Anmeldung unterscheiden sich nur im Bauzeitraum – sonst gilt die erste Angabe
    const erste = (f: BbpFeld) => reihe.map((z) => wert(z, f)).find(Boolean) ?? '';
    const anmeldeId = wert(reihe[0], 'id');
    const status = erste('status');
    const prozessphase = erste('phase');
    if (istVorlage(status)) {
      uebersprungen.push({ anmeldeId, grund: 'Vorlage', zeilen: reihe.length });
      continue;
    }
    const phase = prozessphaseLesen(prozessphase);
    if (!phase) {
      uebersprungen.push({
        anmeldeId,
        grund: `Prozessphase ${prozessphase ? `„${prozessphase}“` : 'fehlt'} – übernommen werden nur KM und KKM`,
        zeilen: reihe.length,
      });
      continue;
    }
    if (!status) {
      uebersprungen.push({ anmeldeId, grund: 'ohne Status', zeilen: reihe.length });
      continue;
    }
    const beginne = reihe.map((z) => datumLesen(wert(z, 'von'))).filter((d): d is ISODate => !!d);
    const enden = reihe.map((z) => datumLesen(wert(z, 'bis'))).filter((d): d is ISODate => !!d);
    anmeldungen.push({
      anmeldeId,
      zeilen: reihe.length,
      anmelder: erste('anmelder'),
      status,
      art: erste('art'),
      von: beginne.length > 0 ? beginne.reduce((a, b) => (b < a ? b : a)) : null,
      bis: enden.length > 0 ? enden.reduce((a, b) => (b > a ? b : a)) : null,
      bbk: erste('bbk'),
      projektnummer: erste('projektnummer'),
      prozessphase,
      phase: phase.phase,
      kmRunde: phase.kmRunde,
      titel: erste('titel'),
    });
  }
  return {
    blatt,
    zeilen: daten.filter((z) => z.some((w) => w.trim())).length,
    anmeldungen,
    uebersprungen,
    fehlend: BBP_FELDER.filter((f) => spalten[f] === undefined),
  };
}

/* ------------------------------------------------------------------ */
/* Planen                                                              */
/* ------------------------------------------------------------------ */

/** Wahl einer Projektgruppe: ein Projekt anlegen … */
export const NEUES_PROJEKT = '+neu';
/** … bzw. ihre neuen Anmeldungen nicht importieren. */
export const KEIN_PROJEKT = '';

export interface BbpOptionen {
  /** Statuszuordnung – gespeichert in `Einstellungen.bbpStatus`, im Dialog änderbar. */
  zuordnung: BbpStatusZuordnung;
  /** Je Projektgruppe: Projekt-ID, `NEUES_PROJEKT` oder `KEIN_PROJEKT`; fehlt sie, gilt die Vorgabe. */
  projektWahl: Record<string, string>;
  /** Bezeichnung des neuen Projekts je Gruppe; fehlt sie, gilt der Vorschlag. */
  projektNamen: Record<string, string>;
}

/** Anmeldungen, die eine Projektnummer verbindet (`projektGruppen`) – sie kommen gemeinsam in ein Projekt. */
export interface BbpProjektGruppe {
  schluessel: string;
  /** Projektnummer wie in der Datei; leer – ohne Projektnummer. */
  projektnummer: string;
  /** Projekt, dessen DB-G-Nummer passt. */
  treffer: Projekt | null;
  /** Neue Anmeldungen, die ein Projekt brauchen. */
  neu: number;
  /** Anmeldungen, die es schon gibt – sie bleiben in ihrem Projekt. */
  vorhanden: number;
  /** Wahl (Projekt-ID, `NEUES_PROJEKT` oder `KEIN_PROJEKT`) samt Vorgabe. */
  wahl: string;
  /** Bezeichnung eines neuen Projekts samt Vorschlag. */
  name: string;
}

export type BbpErgebnis = 'neu' | 'aktualisiert' | 'unveraendert' | 'uebersprungen';

export interface BbpPosten {
  quelle: BbpAnmeldung;
  ergebnis: BbpErgebnis;
  /** Warum übersprungen. */
  grund: string;
  /** Status in KaPlan laut Zuordnung. */
  statusId: ID | null;
  /** Vorhandene Anmeldungen derselben Anmelde-ID. */
  bestehend: Anmeldung[];
  statusWechsel: boolean;
  /** Was sich an vorhandenen Anmeldungen ändert, z. B. „Status“, „Sperrzeitraum“. */
  aenderungen: string[];
  gruppe: string;
  hinweise: string[];
}

export interface BbpStatusZeile {
  phase: BbpPhase;
  status: string;
  anzahl: number;
  /** Status in KaPlan; null – nicht importieren. */
  ziel: ID | null;
}

export interface BbpPlan {
  posten: BbpPosten[];
  gruppen: BbpProjektGruppe[];
  /** Status der Datei je Phase – für die Zuordnung im Dialog. */
  statusListe: BbpStatusZeile[];
  summe: {
    neu: number;
    aktualisiert: number;
    statusWechsel: number;
    unveraendert: number;
    uebersprungen: number;
    neueProjekte: number;
  };
}

/** Status in KaPlan für einen Status aus BBPNeo – auch bei abweichender Schreibweise; null, wenn keiner (mehr) passt. */
export function statusZiel(
  d: BaubetriebDaten,
  zuordnung: BbpStatusZuordnung,
  phase: BbpPhase,
  status: string,
): ID | null {
  const je = zuordnung[phase] ?? {};
  const schluessel = Object.prototype.hasOwnProperty.call(je, status)
    ? status
    : Object.keys(je).find((k) => k.trim().toLowerCase() === status.trim().toLowerCase());
  const ziel = schluessel !== undefined ? je[schluessel] : null;
  return ziel && statusInfo(d.workflows, ziel) ? ziel : null;
}

/** Vorschlag für die Bezeichnung eines neuen Projekts: der Anfang des Titels („ESTW Schwetzingen“). */
function namensVorschlag(projektnummer: string, titel: string): string {
  const anfang = titel.split(/\s+[-–]\s*|\s*[-–]\s+/)[0]?.trim();
  if (anfang) return anfang;
  return projektnummer ? `Projekt ${projektnummer}` : 'Projekt ohne Projektnummer';
}

/** Merkmale aus BBPNeo – leere Angaben der Datei überschreiben nichts. */
function merkmaleUebernehmen(a: Anmeldung, q: BbpAnmeldung, d: BaubetriebDaten): Anmeldung {
  return bauzeitraumAbgleichen(
    {
      ...a,
      art: massnahmenartLesen(q.art) ?? a.art,
      bauVon: q.von ?? a.bauVon,
      bauBis: q.bis ?? a.bauBis,
      titel: q.titel || a.titel,
      bbk: q.bbk || a.bbk,
      anmelder: q.anmelder || a.anmelder,
      bbpProjektnummer: q.projektnummer || a.bbpProjektnummer,
      kmRunde: q.kmRunde,
    },
    d.workflows,
  );
}

const MERKMALE: [string, (a: Anmeldung) => unknown][] = [
  ['Maßnahmenart', (a) => a.art],
  ['Sperrzeitraum', (a) => `${a.bauVon}|${a.bauBis}`],
  ['Titel', (a) => a.titel],
  ['Mitwirkender BBK', (a) => a.bbk],
  ['Anmelder', (a) => a.anmelder],
  ['Projektnummer', (a) => a.bbpProjektnummer],
  ['KM-Runde', (a) => a.kmRunde],
];

function geaenderteMerkmale(alt: Anmeldung, neu: Anmeldung): string[] {
  return MERKMALE.filter(([, wert]) => wert(alt) !== wert(neu)).map(([name]) => name);
}

/**
 * Eine vorhandene Anmeldung nach BBPNeo: erst der Status (als Statuswechsel
 * „Import BBPNeo“, damit sich der Stand davor zurückholen lässt), dann die
 * Merkmale. `neu` ist null, wenn sich nichts ändert.
 */
function aktualisieren(
  alt: Anmeldung,
  q: BbpAnmeldung,
  statusId: ID,
  d: BaubetriebDaten,
  k: BbpKontext,
  verlaufId: ID,
): { neu: Anmeldung | null; statusWechsel: boolean; merkmale: string[] } {
  const statusWechsel = alt.statusId !== statusId;
  const mitStatus = statusWechsel
    ? statusUebernehmen(alt, statusId, k.heute, importText(q), verlaufId, k.bearbeiter, k.erfasst, d.workflows)
    : alt;
  const neu = merkmaleUebernehmen(mitStatus, q, d);
  const merkmale = geaenderteMerkmale(mitStatus, neu);
  if (!statusWechsel && merkmale.length === 0) return { neu: null, statusWechsel, merkmale };
  return { neu: merkmale.length > 0 ? { ...neu, geaendertAm: k.heute } : neu, statusWechsel, merkmale };
}

/** Kontext der Vorschau – Datum und Bearbeiter spielen für sie keine Rolle. */
const VORSCHAU: BbpKontext = { heute: '1970-01-01', erfasst: '', bearbeiter: '' };

/**
 * Vorschau des Imports gegen den Bestand: je Anmeldung aus BBPNeo, ob sie neu
 * angelegt wird, vorhandene Anmeldungen derselben ID aktualisiert oder
 * übersprungen wird, dazu die Projektgruppen und die Statuszuordnung.
 */
export function bbpPlanen(d: BaubetriebDaten, gelesen: BbpGelesen, optionen: BbpOptionen): BbpPlan {
  const vorhanden = new Map<string, Anmeldung[]>();
  for (const a of d.anmeldungen) {
    const k = anmeldeIdSchluessel(a.anmeldeId);
    if (k) vorhanden.set(k, [...(vorhanden.get(k) ?? []), a]);
  }

  // Projektgruppen nach Projektnummer, Treffer über die DB-G-Nummer
  const zuordnung = projektGruppen(
    gelesen.anmeldungen.map((q) => q.projektnummer),
    d.projekte,
  );
  const gruppen = new Map<string, BbpProjektGruppe>();
  const posten: BbpPosten[] = gelesen.anmeldungen.map((q) => {
    const bestehend = vorhanden.get(anmeldeIdSchluessel(q.anmeldeId)) ?? [];
    const { schluessel: gruppe, projektnummer, treffer } = zuordnung.get(gruppenSchluessel(q.projektnummer))!;
    if (!gruppen.has(gruppe)) {
      gruppen.set(gruppe, { schluessel: gruppe, projektnummer, treffer, neu: 0, vorhanden: 0, wahl: '', name: '' });
    }
    const g = gruppen.get(gruppe)!;
    const statusId = statusZiel(d, optionen.zuordnung, q.phase, q.status);
    const basis: BbpPosten = {
      quelle: q,
      ergebnis: 'uebersprungen',
      grund: '',
      statusId,
      bestehend,
      statusWechsel: false,
      aenderungen: [],
      gruppe,
      hinweise: [],
    };
    if (!statusId) {
      return {
        ...basis,
        grund: `Status „${q.status}“ (${BBP_PHASE_LABEL[q.phase]}) keinem Status in KaPlan zugeordnet`,
      };
    }
    if (q.art && !massnahmenartLesen(q.art)) basis.hinweise.push(`Maßnahmenart „${q.art}“ unbekannt`);
    if (bestehend.length > 0) {
      g.vorhanden++;
      const ergebnisse = bestehend.map((a) => aktualisieren(a, q, statusId, d, VORSCHAU, 'vorschau'));
      const statusWechsel = ergebnisse.some((e) => e.statusWechsel);
      const aenderungen = [...(statusWechsel ? ['Status'] : []), ...new Set(ergebnisse.flatMap((e) => e.merkmale))];
      return {
        ...basis,
        ergebnis: aenderungen.length > 0 ? 'aktualisiert' : 'unveraendert',
        statusWechsel,
        aenderungen,
      };
    }
    g.neu++;
    return { ...basis, ergebnis: 'neu' };
  });

  // Wahl je Gruppe: das passende Projekt, sonst mit Projektnummer ein neues, ohne Nummer keines
  for (const g of gruppen.values()) {
    const gewaehlt = optionen.projektWahl[g.schluessel];
    const gueltig =
      gewaehlt !== undefined &&
      (gewaehlt === NEUES_PROJEKT || gewaehlt === KEIN_PROJEKT || d.projekte.some((p) => p.id === gewaehlt));
    g.wahl = gueltig ? gewaehlt : g.treffer ? g.treffer.id : g.projektnummer ? NEUES_PROJEKT : KEIN_PROJEKT;
    const ersterTitel = posten.find((p) => p.gruppe === g.schluessel && p.ergebnis === 'neu')?.quelle.titel ?? '';
    g.name = optionen.projektNamen[g.schluessel]?.trim() || namensVorschlag(g.projektnummer, ersterTitel);
  }
  for (const p of posten) {
    if (p.ergebnis === 'neu' && gruppen.get(p.gruppe)!.wahl === KEIN_PROJEKT) {
      p.ergebnis = 'uebersprungen';
      p.grund = p.quelle.projektnummer
        ? `kein Projekt für ${p.quelle.projektnummer} gewählt`
        : 'ohne Projektnummer – kein Projekt gewählt';
    }
  }

  // Status der Datei je Phase
  const statusZeilen = new Map<string, BbpStatusZeile>();
  for (const q of gelesen.anmeldungen) {
    const k = `${q.phase}|${q.status.toLowerCase()}`;
    const zeile = statusZeilen.get(k);
    if (zeile) zeile.anzahl++;
    else
      statusZeilen.set(k, {
        phase: q.phase,
        status: q.status,
        anzahl: 1,
        ziel: statusZiel(d, optionen.zuordnung, q.phase, q.status),
      });
  }

  const zaehle = (e: BbpErgebnis) => posten.filter((p) => p.ergebnis === e).length;
  const gruppenListe = [...gruppen.values()];
  return {
    posten,
    gruppen: gruppenListe,
    statusListe: [...statusZeilen.values()].sort((a, b) =>
      a.phase === b.phase ? a.status.localeCompare(b.status, 'de') : a.phase === 'km' ? -1 : 1,
    ),
    summe: {
      neu: zaehle('neu'),
      aktualisiert: zaehle('aktualisiert'),
      statusWechsel: posten.filter((p) => p.statusWechsel).length,
      unveraendert: zaehle('unveraendert'),
      uebersprungen: zaehle('uebersprungen') + gelesen.uebersprungen.length,
      neueProjekte: gruppenListe.filter((g) => g.neu > 0 && g.wahl === NEUES_PROJEKT).length,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Anwenden                                                            */
/* ------------------------------------------------------------------ */

/** Vorab vergebene Kennungen – der Store erzeugt sie außerhalb von `mutate()` (StrictMode). */
export interface BbpIds {
  /** Je Anmeldung der Datei eine Kennung für eine neue Anmeldung. */
  anmeldung: ID[];
  /** Kennungen für Verlaufseinträge – je Anmeldung der Datei und je vorhandener Anmeldung eine. */
  verlauf: ID[];
  /** Je Projektgruppe eine Kennung für ein neues Projekt. */
  projekt: ID[];
}

/** Wie viele Kennungen `bbpImportAnwenden` höchstens braucht. */
export function bbpIdBedarf(
  d: BaubetriebDaten,
  gelesen: BbpGelesen,
): { anmeldung: number; verlauf: number; projekt: number } {
  return {
    anmeldung: gelesen.anmeldungen.length,
    verlauf: gelesen.anmeldungen.length + d.anmeldungen.length,
    projekt: new Set(gelesen.anmeldungen.map((q) => gruppenSchluessel(q.projektnummer))).size,
  };
}

export interface BbpKontext {
  heute: ISODate;
  /** Zeitpunkt der Erfassung für den Verlauf. */
  erfasst: string;
  bearbeiter: string;
}

/** Text im Verlauf: „Import BBPNeo (Status in BBPNeo: Anmeldung bearbeitet)“. */
export function importText(q: Pick<BbpAnmeldung, 'status'>): string {
  return `Import BBPNeo (Status in BBPNeo: ${q.status})`;
}

/**
 * Wendet den Import an – rein, für `mutate()`: plant gegen den übergebenen
 * Bestand, legt neue Projekte und Anmeldungen an, aktualisiert vorhandene und
 * merkt sich die Statuszuordnung der Datei in den Einstellungen.
 */
export function bbpImportAnwenden(
  d: BaubetriebDaten,
  gelesen: BbpGelesen,
  optionen: BbpOptionen,
  ids: BbpIds,
  k: BbpKontext,
): BaubetriebDaten {
  const plan = bbpPlanen(d, gelesen, optionen);
  let nAnmeldung = 0;
  let nVerlauf = 0;
  let nProjekt = 0;
  // Reicht der Vorrat nicht (Bestand inzwischen gewachsen), eindeutig je Import und Lauf
  const naechste = (liste: ID[], n: number, prefix: string) => liste[n] ?? `${prefix}-bbp-${k.erfasst}-${n}`;

  // Neue Projekte – nur für Gruppen mit neuen Anmeldungen
  const projektFuer = new Map<string, ID>();
  const neueProjekte: Projekt[] = [];
  for (const g of plan.gruppen) {
    if (g.wahl === KEIN_PROJEKT || g.neu === 0) continue;
    if (g.wahl !== NEUES_PROJEKT) {
      projektFuer.set(g.schluessel, g.wahl);
      continue;
    }
    const neue = plan.posten.filter((p) => p.gruppe === g.schluessel && p.ergebnis === 'neu').map((p) => p.quelle);
    const runden = new Set(neue.map((q) => (q.phase === 'kkm' ? 'kkm' : q.kmRunde)));
    const erstePhase: ErstePhase = runden.has('N-2') ? 'N-2' : runden.has('N-1') ? 'N-1' : 'kkm';
    const id = naechste(ids.projekt, nProjekt++, 'pr');
    projektFuer.set(g.schluessel, id);
    neueProjekte.push({
      id,
      name: g.name,
      projektleiter: '',
      dbGNummer: g.projektnummer,
      ersterAnmeldetermin: null,
      erstePhase,
      fahrplanjahre: [...new Set(neue.flatMap((q) => fahrplanjahreZwischen(q.von, q.bis ?? q.von)))].sort(
        (a, b) => a - b,
      ),
      inbetriebnahme: null,
      hauptbearbeiter: k.bearbeiter,
      projektnummer: '',
      status: 'aktiv',
      markiert: true,
      bemerkung: 'Beim Import aus BBPNeo angelegt.',
    });
  }

  // Vorhandene Anmeldungen aktualisieren
  const aktualisiert = new Map<ID, Anmeldung>();
  for (const p of plan.posten) {
    if (p.ergebnis !== 'aktualisiert' || !p.statusId) continue;
    for (const alt of p.bestehend) {
      const { neu } = aktualisieren(alt, p.quelle, p.statusId, d, k, naechste(ids.verlauf, nVerlauf++, 'vl'));
      if (neu) aktualisiert.set(alt.id, neu);
    }
  }

  // Neue Anmeldungen
  const neueAnmeldungen: Anmeldung[] = [];
  for (const p of plan.posten) {
    if (p.ergebnis !== 'neu' || !p.statusId) continue;
    const projektId = projektFuer.get(p.gruppe);
    if (!projektId) continue;
    const q = p.quelle;
    const info = statusInfo(d.workflows, p.statusId)!;
    neueAnmeldungen.push(
      bauzeitraumAbgleichen(
        {
          id: naechste(ids.anmeldung, nAnmeldung++, 'an'),
          projektId,
          anmeldeId: q.anmeldeId,
          vorhaben: '',
          titel: q.titel,
          bbk: q.bbk,
          anmelder: q.anmelder,
          bbpProjektnummer: q.projektnummer,
          kmRunde: q.kmRunde,
          art: massnahmenartLesen(q.art) ?? info.workflow.arten[0] ?? 'A',
          statusId: p.statusId,
          statusSeit: k.heute,
          bauVon: q.von,
          bauBis: q.bis ?? q.von,
          fahrplanjahr: null,
          aenderungsNr: '',
          annexVII: null,
          terminManuell: null,
          bemerkung: '',
          herkunftId: null,
          geaendertAm: null,
          verlauf: [
            {
              id: naechste(ids.verlauf, nVerlauf++, 'vl'),
              typ: 'anlage',
              datum: k.heute,
              erfasst: k.erfasst,
              bearbeiter: k.bearbeiter,
              von: null,
              nach: p.statusId,
              vonText: '',
              nachText: zielText(d.workflows, p.statusId),
              text: `Aus BBPNeo importiert (Status in BBPNeo: ${q.status})`,
            },
          ],
        },
        d.workflows,
      ),
    );
  }

  // Statuszuordnung der Datei merken
  const bbpStatus: BbpStatusZuordnung = {
    km: { ...d.einstellungen.bbpStatus.km },
    kkm: { ...d.einstellungen.bbpStatus.kkm },
  };
  let zuordnungGeaendert = false;
  for (const z of plan.statusListe) {
    if (bbpStatus[z.phase][z.status] !== z.ziel) {
      bbpStatus[z.phase][z.status] = z.ziel;
      zuordnungGeaendert = true;
    }
  }

  if (aktualisiert.size === 0 && neueAnmeldungen.length === 0 && neueProjekte.length === 0 && !zuordnungGeaendert)
    return d;
  return {
    ...d,
    einstellungen: zuordnungGeaendert ? { ...d.einstellungen, bbpStatus } : d.einstellungen,
    projekte: neueProjekte.length > 0 ? [...d.projekte, ...neueProjekte] : d.projekte,
    anmeldungen: [...d.anmeldungen.map((a) => aktualisiert.get(a.id) ?? a), ...neueAnmeldungen],
  };
}
