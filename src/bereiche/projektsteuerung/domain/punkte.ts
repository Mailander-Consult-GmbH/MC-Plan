/**
 * Offene Punkte: die Aufgaben aus den Protokollen – Einträge vom Typ A und
 * Ergänzungen mit eigener Art „Aufgabe“ – mit Ampel nach Termin. Grundlage
 * der Übersicht und der Zähler in der Seitenleiste.
 *
 * Eigene To-Dos sind die Aufgaben der eigenen Funktion (`EIGENE_FUNKTION`):
 * „Verantwortlich“ nennt das Kürzel oder den Namen einer Person, die sie im
 * Projekt oder als Teilnehmende des Protokolls trägt, oder das Kürzel der
 * Funktion selbst.
 */
import { diffDays, today } from '../../../shared/dates';
import { bezeichnung, eintragText, protokollAufgaben, zuordnung } from './protokoll';
import {
  EIGENE_FUNKTION,
  VORLAUF_TAGE,
  kuerzelVon,
  personName,
  type Erledigung,
  type ID,
  type ISODate,
  type Projekt,
  type Protokoll,
  type ProjektsteuerungDaten,
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
  /** Aufgabe der eigenen Funktion – ein eigenes To-Do. */
  eigen: boolean;
}

const RANG: Record<Ampel, number> = { ueberfaellig: 0, faellig: 1, geplant: 2, ohneTermin: 3, erledigt: 4 };

/** Überfälliges zuerst, dann nach Termin; ohne Termin und Erledigtes am Ende. */
export function nachDringlichkeit(a: Punkt, b: Punkt): number {
  return RANG[a.ampel] - RANG[b.ampel] || (a.termin || '9999').localeCompare(b.termin || '9999');
}

/** Alle Punkte der angegebenen Projekte (ohne Angabe: aller Projekte). */
const norm = (s: string) => s.trim().toLowerCase();
const istEigeneFunktion = (bezeichnung: string) => {
  const b = norm(bezeichnung);
  const eigene = norm(EIGENE_FUNKTION);
  return b === eigene || b.startsWith(`${eigene} `);
};

/**
 * Werte von „Verantwortlich“, die die eigene Funktion meinen: im Projekt die
 * Kürzel und Namen der Personen mit dieser Funktion und das Kürzel der
 * Funktion; im Protokoll dazu die Teilnehmenden mit dieser Funktion.
 */
function eigeneZuordnungen(d: ProjektsteuerungDaten, projektId: ID): (p: Protokoll) => Set<string> {
  const funktionen = d.funktionen.filter((f) => istEigeneFunktion(f.name));
  const ids = new Set(funktionen.map((f) => f.id));
  const projektweit = [
    ...funktionen.map((f) => f.kuerzel),
    ...d.beteiligte
      .filter((b) => b.projektId === projektId && b.funktionId && ids.has(b.funktionId))
      .flatMap((b) => [kuerzelVon(b, d.funktionen), personName(b)]),
  ];
  return (p) =>
    new Set(
      [...projektweit, ...p.teilnehmer.filter((t) => istEigeneFunktion(t.funktion)).flatMap((t) => [zuordnung(t), t.name])]
        .map(norm)
        .filter(Boolean),
    );
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

/** Offene Aufgaben der eigenen Funktion (`EIGENE_FUNKTION`). */
export const eigeneTodos = (d: ProjektsteuerungDaten, projektIds?: ID[]): Punkt[] =>
  offenePunkte(d, projektIds).filter((p) => p.eigen);
