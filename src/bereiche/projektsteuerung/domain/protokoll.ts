/**
 * Fachlogik der Protokolle: Reihen und Folgeprotokolle, Kennzeichnung neuer
 * und geänderter Einträge, Aufgaben aus den Protokollen, Teilnehmende aus der
 * Projektbeteiligtenliste und die Übernahme von Dateien des Protokoll-Tools.
 * Alle Funktionen sind rein; geschrieben wird nur über den Store.
 */
import { today } from '../../../shared/dates';
import {
  STANDARD_HINWEIS,
  TEILNAHME,
  kuerzelVon,
  newId,
  personName,
  type Beteiligter,
  type Eintrag,
  type EintragTyp,
  type Funktion,
  type ID,
  type Protokoll,
  type ProjektsteuerungDaten,
  type Teilnahme,
  type Teilnehmer,
  type Top,
  type Vorstand,
} from './types';

/** Ursprungstext und Ergänzung als ein Text. */
export function volltext(e: { text: string; zusatz: string }): string {
  return [e.text, e.zusatz]
    .map((x) => (x || '').trim())
    .filter(Boolean)
    .join('\n');
}

/**
 * Neu oder gegenüber dem Vorprotokoll geändert – im Druck blau. Ohne Felder
 * fragt die Funktion, ob der ganze Eintrag neu ist.
 */
export function eintragNeu(e: Eintrag, ...felder: (keyof Vorstand)[]): boolean {
  if (!e.vor) return !e.herkunft;
  if (felder.length === 0) return false;
  return felder.some((k) => (e[k] ?? '') !== (e.vor![k] ?? ''));
}

export const topNeu = (top: Top): boolean => top.vorTitel === null || top.titel !== top.vorTitel;

/** „offen seit Prot. 2, Pkt. 1.3“ bzw. „aus Prot. 2, Pkt. 1.3“. */
export function herkunftText(e: Eintrag): string {
  return `${e.typ === 'A' && e.status !== 'erledigt' ? 'offen seit ' : 'aus '}${e.herkunft}`;
}

/** „Baubesprechung Nr. 3“. */
export function bezeichnung(p: Pick<Protokoll, 'art' | 'nr'>): string {
  return `${p.art || 'Protokoll'} Nr. ${p.nr}`;
}

/** „9:00–11:00 Uhr“. */
export function zeitText(p: Pick<Protokoll, 'beginn' | 'ende'>): string {
  return p.beginn ? `${p.beginn}${p.ende ? `–${p.ende}` : ''} Uhr` : '';
}

export function fuehrerVon(p: Protokoll): Teilnehmer | undefined {
  return p.fuehrerId ? p.teilnehmer.find((t) => t.id === p.fuehrerId) : undefined;
}

/* ------------------------------------------------------------------ */
/* Anlegen                                                             */
/* ------------------------------------------------------------------ */

export function neuerEintrag(typ: EintragTyp): Eintrag {
  return {
    id: newId('e'),
    typ,
    text: '',
    zusatz: '',
    wer: '',
    termin: '',
    status: 'offen',
    herkunft: '',
    uebernommenIn: null,
    vor: null,
  };
}

export function neuerTop(titel = ''): Top {
  return { id: newId('top'), titel, vorTitel: null, eintraege: [] };
}

/** Teilnehmende Person aus der Projektbeteiligtenliste. */
export function teilnehmerAus(b: Beteiligter, funktionen: Funktion[], status: Teilnahme = 'anwesend'): Teilnehmer {
  return {
    id: newId('tn'),
    beteiligterId: b.id,
    name: personName(b),
    funktion: funktionen.find((f) => f.id === b.funktionId)?.name ?? '',
    firma: b.firma,
    kuerzel: kuerzelVon(b, funktionen),
    status,
  };
}

/** Teilnehmende Person ohne Eintrag in der Projektbeteiligtenliste. */
export function freierTeilnehmer(): Teilnehmer {
  return { id: newId('tn'), beteiligterId: null, name: '', funktion: '', firma: '', kuerzel: '', status: 'anwesend' };
}

/**
 * Erstes Protokoll einer neuen Reihe. Die Protokollführung übernimmt die
 * angemeldete Person, sofern sie in der Projektbeteiligtenliste steht.
 */
export function neueReihe(
  id: ID,
  projektId: ID,
  werte: Pick<Protokoll, 'art' | 'datum' | 'beginn' | 'ort'>,
  fuehrung: Beteiligter | undefined,
  funktionen: Funktion[],
): Protokoll {
  const fuehrer = fuehrung ? teilnehmerAus(fuehrung, funktionen) : null;
  return {
    id,
    projektId,
    reiheId: newId('rh'),
    art: werte.art,
    nr: 1,
    datum: werte.datum,
    beginn: werte.beginn,
    ende: '',
    ort: werte.ort,
    fuehrerId: fuehrer?.id ?? null,
    naechster: '',
    verteiler: '',
    hinweis: STANDARD_HINWEIS,
    teilnehmer: fuehrer ? [fuehrer] : [],
    tops: [neuerTop('Allgemeines')],
    geaendert: new Date().toISOString(),
  };
}

/**
 * Folgeprotokoll: übernimmt Kopfdaten, Teilnehmende und Tagesordnung.
 * Informationen und Festlegungen gehen immer mit, Aufgaben nur, solange sie
 * offen und noch nicht weitergeführt sind; das Vorprotokoll vermerkt bei
 * ihnen, wohin sie übernommen wurden.
 */
export function folgeprotokoll(
  vorher: Protokoll,
  id: ID,
  nr = vorher.nr + 1,
): { neu: Protokoll; vorher: Protokoll } {
  const neueIds = new Map<ID, ID>();
  const teilnehmer = vorher.teilnehmer.map((t): Teilnehmer => {
    const neu = newId('tn');
    neueIds.set(t.id, neu);
    return { ...t, id: neu, status: t.status === 'nur Verteiler' ? t.status : 'anwesend' };
  });

  const tops = vorher.tops.map(
    (top, ti): Top => ({
      id: newId('top'),
      titel: top.titel,
      vorTitel: top.titel,
      eintraege: top.eintraege
        .map((e, ei) => ({ e, nr: `${ti + 1}.${ei + 1}` }))
        .filter(({ e }) => mitgehen(e))
        .map(({ e, nr }): Eintrag => {
          const text = volltext(e);
          return {
            ...e,
            id: newId('e'),
            text,
            zusatz: '',
            uebernommenIn: null,
            herkunft: e.herkunft || `Prot. ${vorher.nr}, Pkt. ${nr}`,
            vor: { typ: e.typ, text, wer: e.wer, termin: e.termin, status: e.status },
          };
        }),
    }),
  );

  const neu: Protokoll = {
    id,
    projektId: vorher.projektId,
    reiheId: vorher.reiheId,
    art: vorher.art,
    nr,
    datum: vorher.naechster || today(),
    beginn: '',
    ende: '',
    ort: vorher.ort,
    fuehrerId: vorher.fuehrerId ? (neueIds.get(vorher.fuehrerId) ?? null) : null,
    naechster: '',
    verteiler: vorher.verteiler,
    hinweis: vorher.hinweis,
    teilnehmer,
    tops: tops.length > 0 ? tops : [neuerTop('Allgemeines')],
    geaendert: new Date().toISOString(),
  };

  const vorherNeu: Protokoll = {
    ...vorher,
    tops: vorher.tops.map((top) => ({
      ...top,
      eintraege: top.eintraege.map((e) => (e.typ === 'A' && mitgehen(e) ? { ...e, uebernommenIn: id } : e)),
    })),
  };
  return { neu, vorher: vorherNeu };
}

/** Geht der Eintrag in ein Folgeprotokoll über? Aufgaben nur, solange sie offen und nicht weitergeführt sind. */
export const mitgehen = (e: Eintrag): boolean => e.typ !== 'A' || (e.status !== 'erledigt' && !e.uebernommenIn);

/** Zahl der Einträge, die ein Folgeprotokoll aus diesem Protokoll übernähme. */
export const mitgehendeEintraege = (p: Protokoll): number =>
  p.tops.reduce((n, t) => n + t.eintraege.filter(mitgehen).length, 0);

/** Nummer des nächsten Protokolls einer Reihe. */
export const naechsteNr = (protokolle: Protokoll[], reiheId: ID): number =>
  protokolle.filter((p) => p.reiheId === reiheId).reduce((m, p) => Math.max(m, p.nr), 0) + 1;

/** Zahl der Einträge, die ein Protokoll aus seinem Vorprotokoll übernommen hat. */
export const uebernommeneEintraege = (p: Protokoll): number =>
  p.tops.reduce((n, t) => n + t.eintraege.filter((e) => e.vor).length, 0);

/* ------------------------------------------------------------------ */
/* Reihen und Aufgaben                                                 */
/* ------------------------------------------------------------------ */

export interface Reihe {
  id: ID;
  /** Protokolle nach Nummer aufsteigend. */
  protokolle: Protokoll[];
  letztes: Protokoll;
}

/** Protokolle eines Projekts nach Reihen; die Reihe mit dem jüngsten Protokoll zuerst. */
export function reihenVon(protokolle: Protokoll[]): Reihe[] {
  const gruppen = new Map<ID, Protokoll[]>();
  for (const p of protokolle) gruppen.set(p.reiheId, [...(gruppen.get(p.reiheId) ?? []), p]);
  const reihen = [...gruppen.entries()].map(([id, liste]) => {
    const sortiert = [...liste].sort((a, b) => a.nr - b.nr);
    return { id, protokolle: sortiert, letztes: sortiert[sortiert.length - 1] };
  });
  const juengstes = (r: Reihe) => r.protokolle.reduce((m, p) => (p.datum > m ? p.datum : m), '');
  return reihen.sort((a, b) => juengstes(b).localeCompare(juengstes(a)));
}

export interface ProtokollAufgabe {
  protokoll: Protokoll;
  top: Top;
  eintrag: Eintrag;
  /** Punktnummer im Protokoll, z. B. „2.1“. */
  nr: string;
}

/**
 * Aufgaben aus Protokollen – je Aufgabe nur ihr jüngstes Vorkommen: Wurde sie
 * in ein Folgeprotokoll übernommen, zählt sie dort.
 */
export function protokollAufgaben(protokolle: Protokoll[]): ProtokollAufgabe[] {
  const aufgaben: ProtokollAufgabe[] = [];
  for (const protokoll of protokolle) {
    protokoll.tops.forEach((top, ti) =>
      top.eintraege.forEach((eintrag, ei) => {
        if (eintrag.typ === 'A' && !eintrag.uebernommenIn) {
          aufgaben.push({ protokoll, top, eintrag, nr: `${ti + 1}.${ei + 1}` });
        }
      }),
    );
  }
  return aufgaben;
}

/* ------------------------------------------------------------------ */
/* Teilnehmende nachziehen                                             */
/* ------------------------------------------------------------------ */

/**
 * Hält Teilnehmende auf dem Stand der Projektbeteiligtenliste: Name,
 * Funktion, Firma und Kürzel folgen der Person. Ist sie gelöscht, bleiben die
 * Angaben stehen und der Verweis entfällt. Läuft nach jeder Änderung im Store.
 */
export function teilnehmerNachziehen(d: ProjektsteuerungDaten): ProjektsteuerungDaten {
  const beteiligte = new Map(d.beteiligte.map((b) => [b.id, b]));
  let geaendert = false;
  const protokolle = d.protokolle.map((p) => {
    let anders = false;
    const teilnehmer = p.teilnehmer.map((t) => {
      if (!t.beteiligterId) return t;
      const b = beteiligte.get(t.beteiligterId);
      if (!b || b.projektId !== p.projektId) {
        anders = true;
        return { ...t, beteiligterId: null };
      }
      const soll = teilnehmerAus(b, d.funktionen);
      if (t.name === soll.name && t.funktion === soll.funktion && t.firma === soll.firma && t.kuerzel === soll.kuerzel) {
        return t;
      }
      anders = true;
      return { ...t, name: soll.name, funktion: soll.funktion, firma: soll.firma, kuerzel: soll.kuerzel };
    });
    if (!anders) return p;
    geaendert = true;
    return { ...p, teilnehmer };
  });
  // Die LOP verweist auf die Person, die sie aufstellt.
  const lops = d.lops.map((l) => {
    if (!l.aufgestelltVon || beteiligte.get(l.aufgestelltVon)?.projektId === l.projektId) return l;
    geaendert = true;
    return { ...l, aufgestelltVon: null };
  });
  return geaendert ? { ...d, protokolle, lops } : d;
}

/* ------------------------------------------------------------------ */
/* Als Text                                                            */
/* ------------------------------------------------------------------ */

const datumText = (iso: string) => (iso ? iso.split('-').reverse().join('.') : '');

/** Protokoll als schlichter Text, etwa für eine E-Mail. */
export function alsText(p: Protokoll, projektName: string): string {
  const z: string[] = [];
  z.push(`PROTOKOLL – ${bezeichnung(p)}`);
  if (projektName) z.push(`Projekt: ${projektName}`);
  z.push(`Datum: ${datumText(p.datum)}${zeitText(p) ? `, ${zeitText(p)}` : ''}`);
  if (p.ort) z.push(`Ort: ${p.ort}`);
  const fuehrer = fuehrerVon(p);
  if (fuehrer) z.push(`Protokollführung: ${fuehrer.name}`);
  const tn = p.teilnehmer.filter((t) => t.name);
  if (tn.length) {
    z.push('', 'Teilnehmende:');
    tn.forEach((t) =>
      z.push(
        `- ${t.name}${t.funktion || t.firma ? ` (${[t.funktion, t.firma].filter(Boolean).join(', ')})` : ''}${
          t.kuerzel ? ` [${t.kuerzel}]` : ''
        }${t.status !== 'anwesend' ? ` – ${t.status}` : ''}`,
      ),
    );
  }
  if (p.verteiler) z.push('', `Zusätzlicher Verteiler: ${p.verteiler}`);
  z.push('', 'I = Information, F = Festlegung, A = Aufgabe');
  p.tops.forEach((top, ti) => {
    z.push('', `TOP ${ti + 1}  ${top.titel || 'Ohne Titel'}`);
    top.eintraege.forEach((e, ei) => {
      z.push(`${ti + 1}.${ei + 1} [${e.typ}] ${volltext(e).replace(/\n/g, '\n      ')}`);
      if (e.typ === 'A') {
        z.push(
          `      Verantwortlich: ${e.wer || '–'} | Termin: ${datumText(e.termin) || '–'}${
            e.status === 'erledigt' ? ' | erledigt' : ''
          }`,
        );
      } else if (e.wer) z.push(`      Wer: ${e.wer}`);
      if (e.herkunft) z.push(`      ${herkunftText(e)}`);
    });
  });
  if (p.naechster) z.push('', `Nächster Termin: ${datumText(p.naechster)}`);
  if (p.hinweis) z.push('', p.hinweis);
  return z.join('\n');
}

/* ------------------------------------------------------------------ */
/* Übernahme aus dem Protokoll-Tool                                    */
/* ------------------------------------------------------------------ */

type Roh = Record<string, unknown>;
const text = (w: unknown) => (typeof w === 'string' ? w : typeof w === 'number' ? String(w) : '');
const datum = (w: unknown) => (typeof w === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(w) ? w : '');
const uhrzeit = (w: unknown) => (typeof w === 'string' && /^\d{1,2}:\d{2}$/.test(w) ? w : '');
const normName = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();

/**
 * Liest eine Datei des eigenständigen Protokoll-Tools (`.protokoll`, eine
 * Reihe; oder dessen Sicherung mit allen Reihen) und bildet sie auf
 * Protokolle des Projekts ab. Teilnehmende, deren Name in der
 * Projektbeteiligtenliste steht, werden mit ihr verknüpft. Protokolle, die es
 * im Projekt bereits gibt (gleiche Kennung), werden ersetzt; sonst entstehen
 * neue Kennungen, wenn die alte schon vergeben ist.
 */
export function ausProtokollTool(
  inhalt: string,
  projektId: ID,
  daten: ProjektsteuerungDaten,
): Protokoll[] {
  let d: Roh;
  try {
    d = JSON.parse(inhalt) as Roh;
  } catch {
    throw new Error('ist keine gültige JSON-Datei');
  }
  if (!d || typeof d !== 'object') throw new Error('enthält keine Protokolle');
  const liste: unknown = d.protocol
    ? [d.protocol]
    : Array.isArray(d.protocols)
      ? d.protocols
      : Array.isArray(d.tops)
        ? [d]
        : null;
  if (!Array.isArray(liste) || liste.length === 0) throw new Error('enthält keine Protokolle');
  const roh = liste as Roh[];
  if (!roh.every((x) => x && typeof x === 'object' && text(x.id) && Array.isArray(x.tops))) {
    throw new Error('ist keine gültige Protokolldatei');
  }

  const imProjekt = new Set(daten.protokolle.filter((p) => p.projektId === projektId).map((p) => p.id));
  const vergeben = new Set(daten.protokolle.map((p) => p.id));
  const kennung = new Map<string, ID>();
  for (const x of roh) {
    const alt = text(x.id);
    kennung.set(alt, imProjekt.has(alt) || !vergeben.has(alt) ? alt : newId('pt'));
  }
  const beteiligte = daten.beteiligte.filter((b) => b.projektId === projektId);

  return roh.map((x): Protokoll => {
    const serie = text(x.serie) || text(d.serie) || `pa:${text(x.projekt)}|${text(x.art)}`;
    const fuehrerName = text(x.fuehrer).trim();
    let fuehrerId: ID | null = null;
    const teilnehmer = (Array.isArray(x.teilnehmer) ? (x.teilnehmer as Roh[]) : [])
      .filter((t) => t && typeof t === 'object')
      .map((t): Teilnehmer => {
        const name = text(t.name).trim();
        const b = name ? beteiligte.find((p) => normName(personName(p)) === normName(name)) : undefined;
        const id = newId('tn');
        if (!fuehrerId && (t.auto === 'fuehrer' || (fuehrerName && name === fuehrerName))) fuehrerId = id;
        return {
          id,
          beteiligterId: b?.id ?? null,
          name,
          funktion: text(t.funktion),
          firma: text(t.firma),
          kuerzel: text(t.kuerzel),
          status: (TEILNAHME as readonly string[]).includes(text(t.status)) ? (text(t.status) as Teilnahme) : 'anwesend',
        };
      });
    if (!fuehrerId && fuehrerName) {
      const t = { ...freierTeilnehmer(), name: fuehrerName, funktion: 'Projektsteuerung' };
      teilnehmer.unshift(t);
      fuehrerId = t.id;
    }
    const typ = (w: unknown): EintragTyp => (w === 'F' || w === 'A' ? w : 'I');
    const vorstand = (v: unknown): Vorstand | null => {
      if (!v || typeof v !== 'object') return null;
      const r = v as Roh;
      return {
        typ: typ(r.typ),
        text: text(r.text),
        wer: text(r.wer),
        termin: datum(r.termin),
        status: r.status === 'erledigt' ? 'erledigt' : 'offen',
      };
    };
    const tops = (x.tops as Roh[])
      .filter((t) => t && typeof t === 'object')
      .map(
        (t): Top => ({
          id: newId('top'),
          titel: text(t.titel),
          vorTitel: typeof t.vorTitel === 'string' ? t.vorTitel : null,
          eintraege: (Array.isArray(t.eintraege) ? (t.eintraege as Roh[]) : [])
            .filter((e) => e && typeof e === 'object')
            .map(
              (e): Eintrag => ({
                id: newId('e'),
                typ: typ(e.typ),
                text: text(e.text),
                zusatz: text(e.zusatz),
                wer: text(e.wer),
                termin: datum(e.termin),
                status: e.status === 'erledigt' ? 'erledigt' : 'offen',
                herkunft: text(e.herkunft),
                uebernommenIn: e.carriedTo
                  ? (kennung.get(text(e.carriedTo)) ?? (imProjekt.has(text(e.carriedTo)) ? text(e.carriedTo) : null))
                  : null,
                vor: vorstand(e.vor),
              }),
            ),
        }),
      );
    const nr = Number.parseInt(text(x.nr), 10);
    return {
      id: kennung.get(text(x.id))!,
      projektId,
      reiheId: `${projektId}:${serie}`,
      art: text(x.art) || 'Besprechung',
      nr: Number.isFinite(nr) && nr > 0 ? nr : 1,
      datum: datum(x.datum) || today(),
      beginn: uhrzeit(x.beginn),
      ende: uhrzeit(x.ende),
      ort: text(x.ort),
      fuehrerId,
      naechster: datum(x.naechster),
      verteiler: text(x.verteiler),
      hinweis: typeof x.hinweis === 'string' ? x.hinweis : STANDARD_HINWEIS,
      teilnehmer,
      tops: tops.length > 0 ? tops : [neuerTop('Allgemeines')],
      geaendert: new Date().toISOString(),
    };
  });
}
