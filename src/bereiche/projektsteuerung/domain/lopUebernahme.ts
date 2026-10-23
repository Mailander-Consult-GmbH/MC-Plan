/**
 * Aufgaben aus einem Protokoll in die LOP übernehmen. Jede Aufgabe wird ein
 * neuer LOP-Punkt im Thema, das wie ihr Tagesordnungspunkt heißt (sonst
 * entsteht es); die Aufgabe verweist danach auf den Punkt. Von da an verfolgt
 * die LOP sie weiter – sie geht nicht mehr in Folgeprotokolle über.
 */
import { punktAnfuegen, neuesThema } from './lop';
import { bezeichnung, volltext } from './protokoll';
import { type Eintrag, type ID, type ISODate, type Lop, type Protokoll, type ProjektsteuerungDaten, type Top } from './types';

export interface UebernehmbareAufgabe {
  top: Top;
  eintrag: Eintrag;
  /** Punktnummer im Protokoll, z. B. „2.1“. */
  nr: string;
}

/** Offene Aufgaben eines Protokolls, die (noch) nicht in der LOP stehen und nicht weitergeführt wurden. */
export function uebernehmbareAufgaben(p: Protokoll): UebernehmbareAufgabe[] {
  return p.tops.flatMap((top, ti) =>
    top.eintraege
      .map((eintrag, ei) => ({ top, eintrag, nr: `${ti + 1}.${ei + 1}` }))
      .filter(
        ({ eintrag: e }) => e.typ === 'A' && e.status !== 'erledigt' && !e.uebernommenIn && !e.lopPunktId,
      ),
  );
}

const themaTitel = (top: Top) => top.titel.trim() || 'Allgemeines';
const gleich = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Thema der LOP, in das eine Aufgabe dieses Tagesordnungspunkts käme; `null` = es entsteht neu. */
export function zielThema(lop: Lop | undefined, top: Top): string | null {
  return lop?.themen.find((t) => gleich(t.titel, themaTitel(top)))?.id ?? null;
}

/**
 * Übernimmt die genannten Aufgaben. `punktIds` ordnet jeder Aufgabe die
 * Kennung ihres neuen LOP-Punkts zu – sie entsteht vorab, damit die
 * Änderung rein bleibt.
 */
export function aufgabenInLop(
  d: ProjektsteuerungDaten,
  protokollId: ID,
  punktIds: Map<ID, ID>,
  heute: ISODate,
): ProjektsteuerungDaten {
  const protokoll = d.protokolle.find((p) => p.id === protokollId);
  if (!protokoll) return d;
  const lopAlt = d.lops.find((l) => l.projektId === protokoll.projektId);
  if (!lopAlt) return d;

  let lop = lopAlt;
  const verknuepft = new Map<ID, ID>();
  for (const { top, eintrag, nr } of uebernehmbareAufgaben(protokoll)) {
    const punktId = punktIds.get(eintrag.id);
    if (!punktId) continue;
    let themaId = zielThema(lop, top);
    if (!themaId) {
      const thema = neuesThema(themaTitel(top));
      lop = { ...lop, themen: [...lop.themen, thema] };
      themaId = thema.id;
    }
    lop = punktAnfuegen(lop, themaId, {
      id: punktId,
      text: volltext(eintrag),
      wer: eintrag.wer,
      termin: eintrag.termin,
      herkunft: `${bezeichnung(protokoll)}, Pkt. ${nr}`,
      erfasst: heute,
    }).lop;
    verknuepft.set(eintrag.id, punktId);
  }
  if (verknuepft.size === 0) return d;

  return {
    ...d,
    lops: d.lops.map((l) => (l === lopAlt ? lop : l)),
    protokolle: d.protokolle.map((p) =>
      p.id !== protokollId
        ? p
        : {
            ...p,
            tops: p.tops.map((t) => ({
              ...t,
              eintraege: t.eintraege.map((e) =>
                verknuepft.has(e.id) ? { ...e, lopPunktId: verknuepft.get(e.id)! } : e,
              ),
            })),
          },
    ),
  };
}
