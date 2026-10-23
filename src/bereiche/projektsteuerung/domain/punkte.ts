/**
 * Offene Punkte über alle Quellen: die Punkte der LOP und die Aufgaben aus
 * den Protokollen – mit Ampel nach Termin. Grundlage der Übersicht und der
 * Zähler in der Seitenleiste.
 */
import { diffDays, today } from '../../../shared/dates';
import { aktivePunkte, volltext } from './lop';
import { bezeichnung, eintragText, protokollAufgaben } from './protokoll';
import {
  VORLAUF_TAGE,
  type Erledigung,
  type ID,
  type ISODate,
  type Projekt,
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

/** Ein Punkt aus der LOP oder eine Aufgabe aus einem Protokoll. */
export interface Punkt {
  /** Eindeutig über beide Quellen. */
  schluessel: string;
  quelle: 'lop' | 'protokoll';
  projekt: Projekt;
  /** Kennung des LOP-Punkts bzw. des Protokolleintrags. */
  id: ID;
  /** Protokoll der Aufgabe. */
  protokollId?: ID;
  /** „LOP Nr. 12“ bzw. „Baubesprechung Nr. 3, Pkt. 2.1“. */
  fundstelle: string;
  text: string;
  wer: string;
  termin: ISODate;
  status: Erledigung;
  ampel: Ampel;
}

const RANG: Record<Ampel, number> = { ueberfaellig: 0, faellig: 1, geplant: 2, ohneTermin: 3, erledigt: 4 };

/** Überfälliges zuerst, dann nach Termin; ohne Termin und Erledigtes am Ende. */
export function nachDringlichkeit(a: Punkt, b: Punkt): number {
  return RANG[a.ampel] - RANG[b.ampel] || (a.termin || '9999').localeCompare(b.termin || '9999');
}

/** Alle Punkte der angegebenen Projekte (ohne Angabe: aller Projekte). */
export function allePunkte(d: ProjektsteuerungDaten, projektIds?: ID[]): Punkt[] {
  const heute = today();
  const projekte = d.projekte.filter((p) => !projektIds || projektIds.includes(p.id));
  const punkte: Punkt[] = [];
  for (const projekt of projekte) {
    const lop = d.lops.find((l) => l.projektId === projekt.id);
    for (const p of lop ? aktivePunkte(lop) : []) {
      punkte.push({
        schluessel: `lop:${p.id}`,
        quelle: 'lop',
        projekt,
        id: p.id,
        fundstelle: `LOP Nr. ${p.nr}`,
        text: volltext(p),
        wer: p.wer,
        termin: p.termin,
        status: p.status,
        ampel: ampelFuer(p.termin, p.status, heute),
      });
    }
    // Aufgaben, die in die LOP übernommen wurden, zählen dort – nicht doppelt.
    const aufgaben = protokollAufgaben(d.protokolle.filter((p) => p.projektId === projekt.id)).filter(
      (a) => !a.eintrag.lopPunktId,
    );
    for (const a of aufgaben) {
      punkte.push({
        schluessel: `pt:${a.eintrag.id}`,
        quelle: 'protokoll',
        projekt,
        id: a.eintrag.id,
        protokollId: a.protokoll.id,
        fundstelle: `${bezeichnung(a.protokoll)}, Pkt. ${a.nr}`,
        text: eintragText(a.eintrag),
        wer: a.eintrag.wer,
        termin: a.eintrag.termin,
        status: a.eintrag.status,
        ampel: ampelFuer(a.eintrag.termin, a.eintrag.status, heute),
      });
    }
  }
  return punkte.sort(nachDringlichkeit);
}

export const offenePunkte = (d: ProjektsteuerungDaten, projektIds?: ID[]): Punkt[] =>
  allePunkte(d, projektIds).filter((p) => p.status !== 'erledigt');
