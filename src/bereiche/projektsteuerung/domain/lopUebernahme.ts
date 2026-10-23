/**
 * Aufgaben aus einem Protokoll in die LOP übernehmen. Jede Aufgabe wird ein
 * neuer LOP-Punkt im Thema, das wie ihr Tagesordnungspunkt heißt (sonst
 * entsteht es); die Aufgabe verweist danach auf den Punkt.
 *
 * Die LOP ist für den internen Gebrauch: Im Protokoll läuft die Aufgabe weiter
 * wie jede andere, Druck, Live-Druckansicht und Text zeigen den Verweis nicht.
 * „Erledigt“ wird zwischen Aufgabe und LOP-Punkt abgeglichen
 * (`lopStatusAbgleichen`).
 */
import { erledigen, punktAnfuegen, neuesThema } from './lop';
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
        ({ eintrag: e }) =>
          e.typ === 'A' && e.status !== 'erledigt' && !e.entfaellt && !e.uebernommenIn && !e.lopPunktId,
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

/**
 * Gleicht „erledigt“ zwischen einer in die LOP übernommenen Aufgabe und
 * ihrem LOP-Punkt ab: Was sich bei dieser Änderung auf einer Seite geändert
 * hat, übernimmt die andere. Abgeglichen wird nur das jüngste Vorkommen der
 * Aufgabe im jüngsten Protokoll ihrer Reihe – ältere Protokolle bleiben, wie
 * sie verteilt wurden. Läuft nach jeder Änderung im Store und vergleicht dazu
 * den alten mit dem neuen Bestand.
 */
export function lopStatusAbgleichen(alt: ProjektsteuerungDaten, neu: ProjektsteuerungDaten): ProjektsteuerungDaten {
  if (alt === neu) return neu;
  const altEintraege = new Map<ID, Eintrag>();
  for (const p of alt.protokolle) for (const t of p.tops) for (const e of t.eintraege) altEintraege.set(e.id, e);
  const altPunkte = new Map(alt.lops.flatMap((l) => l.punkte.map((p) => [p.id, p] as const)));
  const neuPunkte = new Map(neu.lops.flatMap((l) => l.punkte.map((p) => [p.id, p] as const)));

  const juengste = new Map<ID, number>();
  for (const p of neu.protokolle) juengste.set(p.reiheId, Math.max(juengste.get(p.reiheId) ?? 0, p.nr));

  // Aufgabe → LOP-Punkt bzw. LOP-Punkt → Aufgabe
  const anPunkt = new Map<ID, boolean>();
  const anEintrag = new Map<ID, boolean>();
  for (const p of neu.protokolle) {
    if (p.nr !== juengste.get(p.reiheId)) continue;
    for (const t of p.tops) {
      for (const e of t.eintraege) {
        if (e.typ !== 'A' || !e.lopPunktId || e.uebernommenIn || e.entfaellt) continue;
        const punkt = neuPunkte.get(e.lopPunktId);
        if (!punkt) continue;
        const erledigt = e.status === 'erledigt';
        if (erledigt === (punkt.status === 'erledigt')) continue;
        const vorher = altEintraege.get(e.id);
        const eintragGeaendert = !vorher || vorher.status !== e.status || vorher.lopPunktId !== e.lopPunktId;
        const punktGeaendert = altPunkte.get(punkt.id)?.status !== punkt.status;
        if (eintragGeaendert && !punktGeaendert) anPunkt.set(punkt.id, erledigt);
        else if (punktGeaendert) anEintrag.set(e.id, punkt.status === 'erledigt');
      }
    }
  }
  if (anPunkt.size === 0 && anEintrag.size === 0) return neu;
  return {
    ...neu,
    lops: anPunkt.size
      ? neu.lops.map((l) =>
          l.punkte.some((p) => anPunkt.has(p.id))
            ? { ...l, punkte: l.punkte.map((p) => (anPunkt.has(p.id) ? erledigen(p, anPunkt.get(p.id)!) : p)) }
            : l,
        )
      : neu.lops,
    protokolle: anEintrag.size
      ? neu.protokolle.map((p) =>
          p.tops.some((t) => t.eintraege.some((e) => anEintrag.has(e.id)))
            ? {
                ...p,
                tops: p.tops.map((t) => ({
                  ...t,
                  eintraege: t.eintraege.map((e) =>
                    anEintrag.has(e.id) ? { ...e, status: anEintrag.get(e.id) ? 'erledigt' : 'offen' } : e,
                  ),
                })),
              }
            : p,
        )
      : neu.protokolle,
  };
}
