/**
 * Offene Punkte: die Aufgaben aus den Protokollen – Einträge vom Typ A und
 * Ergänzungen mit eigener Art „Aufgabe“ – mit Ampel nach Termin. Grundlage
 * der Übersicht und der Zähler in der Seitenleiste.
 *
 * Eigene To-Dos sind die Aufgaben der angemeldeten Person („Angemeldet als“):
 * „Verantwortlich“ nennt ihr Kürzel oder ihren Namen aus der
 * Projektbeteiligtenliste oder aus den Teilnehmenden des Protokolls.
 */
import { diffDays, today } from '../../../shared/dates';
import { bezeichnung, eintragText, protokollAufgaben } from './protokoll';
import {
  VORLAUF_TAGE,
  kuerzelVon,
  personName,
  type Erledigung,
  type ID,
  type ISODate,
  type Projekt,
  type Protokoll,
  type ProjektsteuerungDaten,
  type Teilnehmer,
} from './types';

export type Ampel = 'erledigt' | 'ueberfaellig' | 'faellig' | 'geplant' | 'ohneTermin';

export const AMPEL_LABEL: Record<Ampel, string> = {
  erledigt: 'Erledigt',
  ueberfaellig: 'Überfällig',
  faellig: 'Demnächst fällig',
  geplant: 'Im Plan',
  ohneTermin: 'Ohne Termin',
};

export function ampelFuer(termin: ISODate, status: Erledigung, heute: ISODate = today()): Ampel {
  if (status === 'erledigt') return 'erledigt';
  if (!termin) return 'ohneTermin';
  const tage = diffDays(heute, termin);
  if (tage < 0) return 'ueberfaellig';
  if (tage <= VORLAUF_TAGE) return 'faellig';
  return 'geplant';
}

/** Eine Aufgabe aus einem Protokoll. */
export interface Punkt {
  /** Eindeutig über alle Protokolle. */
  schluessel: string;
  projekt: Projekt;
  /** Kennung des Eintrags bzw. der Ergänzung mit eigener Art. */
  id: ID;
  /** Protokoll der Aufgabe. */
  protokollId: ID;
  /** „Baubesprechung Nr. 3, Pkt. 2.1“. */
  fundstelle: string;
  text: string;
  wer: string;
  termin: ISODate;
  status: Erledigung;
  ampel: Ampel;
  /** Aufgabe der angemeldeten Person – ein eigenes To-Do. */
  eigen: boolean;
}

const RANG: Record<Ampel, number> = { ueberfaellig: 0, faellig: 1, geplant: 2, ohneTermin: 3, erledigt: 4 };

/** Überfälliges zuerst, dann nach Termin; ohne Termin und Erledigtes am Ende. */
export function nachDringlichkeit(a: Punkt, b: Punkt): number {
  return RANG[a.ampel] - RANG[b.ampel] || (a.termin || '9999').localeCompare(b.termin || '9999');
}

/** Alle Punkte der angegebenen Projekte (ohne Angabe: aller Projekte). */
const norm = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();

/** Einträge der angemeldeten Person („Angemeldet als“) in der Projektbeteiligtenliste eines Projekts. */
function ichImProjekt(d: ProjektsteuerungDaten, projektId: ID) {
  const ich = norm(d.einstellungen.bearbeiter);
  return d.beteiligte.filter((b) => b.projektId === projektId && norm(personName(b)) === ich);
}

/** Steht die angemeldete Person in der Projektbeteiligtenliste eines der Projekte? */
export const angemeldetBeteiligt = (d: ProjektsteuerungDaten, projektIds: ID[]): boolean =>
  projektIds.some((id) => ichImProjekt(d, id).length > 0);

/**
 * Werte von „Verantwortlich“, die die angemeldete Person meinen: im Protokoll
 * Kürzel und Name der Teilnehmenden, die sie ist – verknüpft oder gleichen
 * Namens –, dazu Kürzel und Name ihres Eintrags in der
 * Projektbeteiligtenliste. Letztere gelten nur, wenn sie im Protokoll niemand
 * anderes führt: Was dort eine teilnehmende Person nennt, meint sie – sonst
 * sähe, wer dieselbe Funktion (und damit dasselbe Kürzel) hat, deren Aufgaben
 * als eigene To-Dos. Ein Kürzel, das im Protokoll mehrere führen (Bestände von
 * früher; neu Gewähltes nennt dann den Namen, `zuordnung`), zählt für alle,
 * die es führen – lieber bei zweien als bei niemandem.
 */
function eigeneZuordnungen(d: ProjektsteuerungDaten, projektId: ID): (p: Protokoll) => Set<string> {
  const ich = norm(d.einstellungen.bearbeiter);
  const personen = ichImProjekt(d, projektId);
  const ids = new Set(personen.map((b) => b.id));
  const projektweit = personen.flatMap((b) => [kuerzelVon(b, d.funktionen), personName(b)]).map(norm);
  const binIch = (t: Teilnehmer) => (!!t.beteiligterId && ids.has(t.beteiligterId)) || norm(t.name) === ich;
  return (p) => {
    const andere = new Set(p.teilnehmer.filter((t) => !binIch(t)).flatMap((t) => [t.kuerzel, t.name].map(norm)));
    return new Set(
      [
        ...projektweit.filter((w) => !andere.has(w)),
        ...p.teilnehmer.filter(binIch).flatMap((t) => [t.kuerzel, t.name].map(norm)),
      ].filter(Boolean),
    );
  };
}

export function allePunkte(d: ProjektsteuerungDaten, projektIds?: ID[]): Punkt[] {
  const heute = today();
  const projekte = d.projekte.filter((p) => !projektIds || projektIds.includes(p.id));
  const punkte: Punkt[] = [];
  for (const projekt of projekte) {
    const eigeneFuer = eigeneZuordnungen(d, projekt.id);
    const eigene = new Map<ID, Set<string>>();
    for (const a of protokollAufgaben(d.protokolle.filter((p) => p.projektId === projekt.id))) {
      const quelle = a.zeile ?? a.eintrag;
      if (!eigene.has(a.protokoll.id)) eigene.set(a.protokoll.id, eigeneFuer(a.protokoll));
      punkte.push({
        schluessel: `pt:${quelle.id}`,
        projekt,
        id: quelle.id,
        protokollId: a.protokoll.id,
        fundstelle: `${bezeichnung(a.protokoll)}, Pkt. ${a.nr}`,
        text: a.zeile ? a.zeile.text.trim() : eintragText(a.eintrag),
        wer: quelle.wer,
        termin: quelle.termin,
        status: quelle.status,
        ampel: ampelFuer(quelle.termin, quelle.status, heute),
        eigen: !!quelle.wer.trim() && eigene.get(a.protokoll.id)!.has(norm(quelle.wer)),
      });
    }
  }
  return punkte.sort(nachDringlichkeit);
}

export const offenePunkte = (d: ProjektsteuerungDaten, projektIds?: ID[]): Punkt[] =>
  allePunkte(d, projektIds).filter((p) => p.status !== 'erledigt');

/** Offene Aufgaben der angemeldeten Person („Angemeldet als“). */
export const eigeneTodos = (d: ProjektsteuerungDaten, projektIds?: ID[]): Punkt[] =>
  offenePunkte(d, projektIds).filter((p) => p.eigen);
