/**
 * Liste offener Punkte (LOP): eine To-do-Liste je Projekt, die laufend
 * fortgeschrieben wird. Jede Fortschreibung schließt einen Stand ab – danach
 * erscheinen neue und geänderte Angaben im Druck blau, und Punkte, die im
 * abgeschlossenen Stand erledigt waren, wandern ins Archiv.
 */
import { today } from '../../../shared/dates';
import { newId, type ID, type ISODate, type Lop, type LopPunkt, type LopThema, type Vorstand } from './types';

/** Text und Ergänzung eines Punkts als ein Text. */
export function volltext(p: { text: string; zusatz: string }): string {
  return [p.text, p.zusatz]
    .map((x) => (x || '').trim())
    .filter(Boolean)
    .join('\n');
}

export function leereLop(projektId: ID): Lop {
  return {
    projektId,
    stand: 1,
    standDatum: today(),
    themen: [neuesThema('Allgemeines')],
    punkte: [],
    naechsteNr: 1,
    fortschreibungen: [],
  };
}

export function neuesThema(titel = ''): LopThema {
  return { id: newId('th'), titel, vorTitel: null };
}

/** Neuer Punkt am Ende eines Themas; er erhält die nächste freie Nummer. */
export function punktAnfuegen(lop: Lop, themaId: ID, werte: Partial<LopPunkt> = {}): { lop: Lop; punkt: LopPunkt } {
  const punkt: LopPunkt = {
    id: newId('lp'),
    nr: lop.naechsteNr,
    themaId,
    text: '',
    zusatz: '',
    wer: '',
    termin: '',
    status: 'offen',
    erledigtAm: '',
    bemerkung: '',
    herkunft: '',
    erfasst: today(),
    vor: null,
    archiviertAb: null,
    ...werte,
  };
  return { lop: { ...lop, punkte: [...lop.punkte, punkt], naechsteNr: lop.naechsteNr + 1 }, punkt };
}

/** Neu oder seit der letzten Fortschreibung geändert – im Druck blau. */
export function punktNeu(p: LopPunkt, ...felder: (keyof Vorstand)[]): boolean {
  if (!p.vor) return true;
  if (felder.length === 0) return false;
  return felder.some((k) => (p[k as keyof LopPunkt] ?? '') !== (p.vor![k] ?? ''));
}

export const themaNeu = (t: LopThema): boolean => t.vorTitel === null || t.titel !== t.vorTitel;

/** Status setzen; „erledigt“ hält das Datum fest. */
export function erledigen(p: LopPunkt, erledigt: boolean): LopPunkt {
  return erledigt
    ? { ...p, status: 'erledigt', erledigtAm: p.erledigtAm || today() }
    : { ...p, status: 'offen', erledigtAm: '' };
}

/** Punkte, die (noch) in der Liste stehen, in der Reihenfolge der Themen. */
export function aktivePunkte(lop: Lop): LopPunkt[] {
  const rang = new Map(lop.themen.map((t, i) => [t.id, i]));
  return lop.punkte
    .filter((p) => p.archiviertAb === null)
    .sort((a, b) => (rang.get(a.themaId) ?? 999) - (rang.get(b.themaId) ?? 999) || a.nr - b.nr);
}

export const archiviertePunkte = (lop: Lop): LopPunkt[] =>
  lop.punkte.filter((p) => p.archiviertAb !== null).sort((a, b) => b.nr - a.nr);

/** Zahl der Punkte, die bei der nächsten Fortschreibung ins Archiv gehen. */
export const insArchiv = (lop: Lop): number =>
  lop.punkte.filter((p) => p.archiviertAb === null && p.status === 'erledigt').length;

/**
 * Schließt den aktuellen Stand ab und beginnt den nächsten: Fortschreibungen gehen
 * in den Text über, jeder Punkt merkt sich seinen Stand als Vergleich für den
 * Druck, erledigte Punkte wandern ins Archiv.
 */
export function fortschreiben(lop: Lop, datum: ISODate): Lop {
  const neuerStand = lop.stand + 1;
  const punkte = lop.punkte.map((p): LopPunkt => {
    if (p.archiviertAb !== null) return p;
    const text = volltext(p);
    return {
      ...p,
      text,
      zusatz: '',
      vor: { text, wer: p.wer, termin: p.termin, status: p.status, bemerkung: p.bemerkung },
      archiviertAb: p.status === 'erledigt' ? neuerStand : null,
    };
  });
  return {
    ...lop,
    stand: neuerStand,
    standDatum: datum,
    themen: lop.themen.map((t) => ({ ...t, vorTitel: t.titel })),
    punkte,
    fortschreibungen: [...lop.fortschreibungen, { stand: lop.stand, datum: lop.standDatum }],
  };
}

/** Holt einen archivierten Punkt als offenen Punkt in die Liste zurück. */
export function wiederAufnehmen(lop: Lop, punktId: ID): Lop {
  const themen = lop.themen.length > 0 ? lop.themen : [neuesThema('Allgemeines')];
  return {
    ...lop,
    themen,
    punkte: lop.punkte.map((p) =>
      p.id === punktId
        ? {
            ...erledigen(p, false),
            archiviertAb: null,
            themaId: themen.some((t) => t.id === p.themaId) ? p.themaId : themen[0].id,
          }
        : p,
    ),
  };
}
