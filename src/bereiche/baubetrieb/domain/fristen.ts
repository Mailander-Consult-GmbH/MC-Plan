/**
 * Fristenrechnung der Baubetriebsplanung: Fahrplanjahre, Fristen laut
 * Richtlinie, die Terminfrist einer Anmeldung in ihrem aktuellen Status,
 * Ampel und der Anmeldebedarf einer Projekthülle.
 */
import { addDays, diffDays, formatDate, parseISO, toISO, today } from '../../../shared/dates';
import {
  ARTEN_JE_PHASE,
  RIL_LABEL,
  type Anmeldung,
  type AnmeldungsArt,
  type BaubetriebDaten,
  type Einstellungen,
  type FristRegel,
  type ID,
  type ISODate,
  type Projekt,
  type RilBezug,
  type RilFrist,
  type RilSchluessel,
  type StatusDef,
} from './types';
import { statusDef } from './workflow';

/* ------------------------------------------------------------------ */
/* Fahrplanjahr                                                        */
/* ------------------------------------------------------------------ */

/**
 * Letzter Tag des Fahrplanjahres N: Fahrplanwechsel ist in der Nacht nach dem
 * zweiten Samstag im Dezember.
 */
export function fahrplanjahrEnde(n: number): ISODate {
  const erster = new Date(n, 11, 1);
  const bisSamstag = (6 - erster.getDay() + 7) % 7;
  return toISO(new Date(n, 11, 1 + bisSamstag + 7));
}

/** Erster Tag des Fahrplanjahres N – der Sonntag nach dem Fahrplanwechsel. */
export function fahrplanjahrBeginn(n: number): ISODate {
  return addDays(fahrplanjahrEnde(n - 1), 1);
}

/** Fahrplanjahr, in das ein Datum fällt. */
export function fahrplanjahrVon(datum: ISODate | null): number | null {
  const d = datum ? parseISO(datum) : null;
  if (!d || !datum) return null;
  const jahr = d.getFullYear();
  return datum > fahrplanjahrEnde(jahr) ? jahr + 1 : jahr;
}

/** Datum TT.MM.JJJJ; ein Tag jenseits des Monatsendes rückt auf den letzten Tag. */
function datumAus(jahr: number, monat: number, tag: number): ISODate {
  const letzter = new Date(jahr, monat, 0).getDate();
  return toISO(new Date(jahr, monat - 1, Math.min(Math.max(1, tag), letzter)));
}

/* ------------------------------------------------------------------ */
/* Richtlinienfristen                                                  */
/* ------------------------------------------------------------------ */

/** Welche Richtlinienfrist gilt – Ril_Nx und Ril_X hängen von der Anmeldungs-Art ab. */
export function rilSchluesselFuer(bezug: RilBezug, art: AnmeldungsArt): RilSchluessel {
  switch (bezug) {
    case 'skm':
      return 'skm';
    case 'pze':
      return 'pze';
    case 'N-2':
      return 'N-2';
    case 'Nx':
      return art === 'A_Vor_N-1' ? 'N-1' : 'N-2';
    case 'A':
      return 'A';
    case 'X':
      // Außerhalb der unterjährigen Arten gilt die Frist der Maßnahme A
      return art === 'A_unterjahr' || !ARTEN_JE_PHASE.Y.includes(art) ? 'A' : (art as RilSchluessel);
  }
}

/** Datum einer Richtlinienfrist für ein Fahrplanjahr bzw. einen Baubeginn. */
export function rilDatum(frist: RilFrist, fahrplanjahr: number | null, baubeginn: ISODate | null): ISODate | null {
  if (frist.bezug === 'stichtag') {
    return fahrplanjahr ? datumAus(fahrplanjahr - frist.jahreVorher, frist.monat, frist.tag) : null;
  }
  return baubeginn ? addDays(baubeginn, -7 * frist.wochenVorher) : null;
}

const zweistellig = (n: number) => String(n).padStart(2, '0');

/** „Stichtag 31.03. im Jahr N−4“ bzw. „12 Wochen vor Baubeginn“. */
export function rilFristText(frist: RilFrist): string {
  if (frist.bezug === 'stichtag') {
    const jahr = frist.jahreVorher === 0 ? 'N' : `N−${frist.jahreVorher}`;
    return `Stichtag ${zweistellig(frist.tag)}.${zweistellig(frist.monat)}. im Jahr ${jahr}`;
  }
  return `${frist.wochenVorher} ${frist.wochenVorher === 1 ? 'Woche' : 'Wochen'} vor Baubeginn`;
}

/** Kurzform der Fristregel eines Status, wie im Lastenheft geschrieben. */
export function fristRegelText(regel: FristRegel): string {
  switch (regel.typ) {
    case 'keine':
      return '.-.';
    case 'stichtag':
      return `Nächster ${regel.tag}.${regel.monat}.`;
    case 'nachhaken':
      return 'Nachhak-Termin';
    case 'ril': {
      const name = `Ril_${regel.bezug}`;
      if (!regel.versatzTage) return name;
      return `${name} ${regel.versatzTage < 0 ? '−' : '+'} ${Math.abs(regel.versatzTage)} Tage`;
    }
  }
}

/* ------------------------------------------------------------------ */
/* Terminfrist einer Anmeldung                                         */
/* ------------------------------------------------------------------ */

export interface Terminfrist {
  datum: ISODate | null;
  /** Regel in Kurzform, z. B. „Ril_X − 14 Tage“. */
  regel: string;
  /** Rechenweg in Worten. */
  erlaeuterung: string;
  manuell: boolean;
  nachhaken: boolean;
  /** Die zugrunde liegende Richtlinienfrist ist noch ein Platzhalter. */
  platzhalter: boolean;
}

/** Terminfrist der Anmeldung in ihrem aktuellen Status. */
export function terminfrist(a: Anmeldung, e: Einstellungen): Terminfrist {
  const def = statusDef(a.status);
  const regel = fristRegelText(def.frist);
  const basis = { regel, manuell: false, nachhaken: !!def.nachhaken, platzhalter: false };

  if (a.terminManuell) {
    return {
      ...basis,
      datum: a.terminManuell,
      manuell: true,
      nachhaken: true,
      erlaeuterung: 'Termin von Hand festgelegt',
    };
  }

  switch (def.frist.typ) {
    case 'keine':
      return { ...basis, datum: null, erlaeuterung: 'Keine Terminfrist in diesem Status' };
    case 'stichtag': {
      const { tag, monat } = def.frist;
      const jahr = parseISO(a.statusSeit)?.getFullYear() ?? new Date().getFullYear();
      let datum = datumAus(jahr, monat, tag);
      if (datum < a.statusSeit) datum = datumAus(jahr + 1, monat, tag);
      return { ...basis, datum, erlaeuterung: `Nächster ${tag}.${monat}. nach dem Statuswechsel am ${formatDate(a.statusSeit)}` };
    }
    case 'nachhaken': {
      const datum = addDays(a.statusSeit, e.nachhakTage);
      return {
        ...basis,
        datum,
        nachhaken: true,
        erlaeuterung: `${e.nachhakTage} Tage nach dem Statuswechsel am ${formatDate(a.statusSeit)}`,
      };
    }
    case 'ril': {
      const schluessel = rilSchluesselFuer(def.frist.bezug, a.art);
      const ril = e.rilFristen[schluessel];
      const grund = rilDatum(ril, a.fahrplanjahr, a.bauVon);
      const versatz = def.frist.versatzTage;
      const datum = grund ? addDays(grund, versatz) : null;
      const bezugText =
        ril.bezug === 'stichtag'
          ? a.fahrplanjahr
            ? `Fahrplanjahr ${a.fahrplanjahr}`
            : 'Fahrplanjahr fehlt'
          : a.bauVon
            ? `Baubeginn ${formatDate(a.bauVon)}`
            : 'Baubeginn fehlt';
      return {
        ...basis,
        datum,
        platzhalter: ril.platzhalter,
        erlaeuterung: `${RIL_LABEL[schluessel]}: ${rilFristText(ril)} (${bezugText})${
          grund ? ` = ${formatDate(grund)}` : ''
        }${versatz ? `, ${versatz < 0 ? 'abzüglich' : 'zuzüglich'} ${Math.abs(versatz)} Tage` : ''}`,
      };
    }
  }
}

/* ------------------------------------------------------------------ */
/* Ampel                                                               */
/* ------------------------------------------------------------------ */

export type Ampel = 'ueberfaellig' | 'faellig' | 'geplant' | 'ohne';

export const AMPEL_LABEL: Record<Ampel, string> = {
  ueberfaellig: 'Überfällig',
  faellig: 'Fällig',
  geplant: 'Im Plan',
  ohne: 'Ohne Frist',
};

export function ampelFuer(datum: ISODate | null, vorlaufTage: number, heute: ISODate = today()): Ampel {
  if (!datum) return 'ohne';
  const rest = diffDays(heute, datum);
  if (rest < 0) return 'ueberfaellig';
  if (rest <= vorlaufTage) return 'faellig';
  return 'geplant';
}

/* ------------------------------------------------------------------ */
/* Offene Termine über alle Projekthüllen                              */
/* ------------------------------------------------------------------ */

export interface TerminEintrag {
  anmeldung: Anmeldung;
  projekt: Projekt;
  status: StatusDef;
  frist: Terminfrist;
  ampel: Ampel;
}

const AMPEL_RANG: Record<Ampel, number> = { ueberfaellig: 0, faellig: 1, geplant: 2, ohne: 3 };

/** Alle Anmeldungen mit Terminfrist – Überfälliges zuerst, dann nach Datum. */
export function offeneTermine(d: BaubetriebDaten, projektIds?: ID[]): TerminEintrag[] {
  const eintraege: TerminEintrag[] = [];
  for (const anmeldung of d.anmeldungen) {
    if (projektIds && !projektIds.includes(anmeldung.projektId)) continue;
    const projekt = d.projekte.find((p) => p.id === anmeldung.projektId);
    if (!projekt) continue;
    const frist = terminfrist(anmeldung, d.einstellungen);
    if (!frist.datum) continue;
    eintraege.push({
      anmeldung,
      projekt,
      status: statusDef(anmeldung.status),
      frist,
      ampel: ampelFuer(frist.datum, d.einstellungen.vorlaufTage),
    });
  }
  return eintraege.sort(
    (a, b) => AMPEL_RANG[a.ampel] - AMPEL_RANG[b.ampel] || (a.frist.datum ?? '').localeCompare(b.frist.datum ?? ''),
  );
}

/* ------------------------------------------------------------------ */
/* Anmeldebedarf einer Projekthülle                                    */
/* ------------------------------------------------------------------ */

/** Prozessphasen mit festem Anmeldetermin je Fahrplanjahr. */
export type BedarfPhase = 'skm' | 'pze' | 'N-2' | 'N-1';

export const BEDARF_PHASEN: BedarfPhase[] = ['skm', 'pze', 'N-2', 'N-1'];

const BEDARF_RANG: Record<BedarfPhase, number> = { skm: 0, pze: 1, 'N-2': 2, 'N-1': 3 };

/** Wie weit eine Anmeldungs-Art im Ablauf steht – spätere Phasen decken frühere ab. */
function rangDerArt(art: AnmeldungsArt): number {
  switch (art) {
    case 'SKM':
      return 0;
    case 'PzE':
      return 1;
    case 'A_Vor_N-2':
      return 2;
    case 'A_Vor_N-1':
      return 3;
    default:
      return 4;
  }
}

export type BedarfZustand = 'abgedeckt' | 'faellig' | 'kuenftig' | 'verstrichen' | 'vorBeginn' | 'offen';

export interface BedarfZelle {
  phase: BedarfPhase;
  fahrplanjahr: number;
  frist: ISODate | null;
  zustand: BedarfZustand;
  /** Eintrag, der diese Phase für das Fahrplanjahr abdeckt. */
  durch?: Anmeldung;
}

export interface BedarfZeile {
  fahrplanjahr: number;
  zellen: BedarfZelle[];
}

/** Toleranz um den ersten Anmeldetermin, der nur ein ca.-Wert ist. */
const CA_TOLERANZ_TAGE = 31;

/**
 * Anmeldebedarf je Fahrplanjahr der Bauzeit: Für SKM, PzE, N-2 und N-1 die
 * Frist laut Richtlinie und ob die Projekthülle dafür schon einen Eintrag hat.
 * Fristen vor dem ersten Anmeldetermin liegen vor der Betreuung durch MIC.
 */
export function anmeldebedarf(
  p: Projekt,
  anmeldungen: Anmeldung[],
  e: Einstellungen,
  heute: ISODate = today(),
): BedarfZeile[] {
  const von = fahrplanjahrVon(p.bauzeitVon);
  if (!von) return [];
  const bis = Math.max(von, Math.min(fahrplanjahrVon(p.bauzeitBis) ?? von, von + 9));
  const eigene = anmeldungen.filter((a) => a.projektId === p.id);
  const beginnGrenze = p.ersterAnmeldetermin ? addDays(p.ersterAnmeldetermin, -CA_TOLERANZ_TAGE) : null;

  const zeilen: BedarfZeile[] = [];
  for (let n = von; n <= bis; n++) {
    const baubeginn = p.bauzeitVon && p.bauzeitVon > fahrplanjahrBeginn(n) ? p.bauzeitVon : fahrplanjahrBeginn(n);
    const zellen = BEDARF_PHASEN.map((phase): BedarfZelle => {
      const frist = rilDatum(e.rilFristen[phase], n, baubeginn);
      const durch = eigene
        .filter((a) => a.fahrplanjahr === n && rangDerArt(a.art) >= BEDARF_RANG[phase])
        .sort((a, b) => rangDerArt(a.art) - rangDerArt(b.art))[0];
      let zustand: BedarfZustand;
      if (durch) zustand = 'abgedeckt';
      else if (!frist) zustand = 'offen';
      else if (beginnGrenze && frist < beginnGrenze) zustand = 'vorBeginn';
      else if (frist < heute) zustand = 'verstrichen';
      else if (diffDays(heute, frist) <= e.bedarfVorschauTage) zustand = 'faellig';
      else zustand = 'kuenftig';
      return { phase, fahrplanjahr: n, frist, zustand, durch };
    });
    zeilen.push({ fahrplanjahr: n, zellen });
  }
  return zeilen;
}

/** Nächster offener Anmeldetermin der Projekthülle, sonst null. */
export function naechsterBedarf(zeilen: BedarfZeile[]): BedarfZelle | null {
  const offen = zeilen
    .flatMap((z) => z.zellen)
    .filter((z) => (z.zustand === 'faellig' || z.zustand === 'kuenftig') && z.frist)
    .sort((a, b) => a.frist!.localeCompare(b.frist!));
  return offen[0] ?? null;
}

export interface BedarfEintrag {
  projekt: Projekt;
  zelle: BedarfZelle;
}

/** Anmeldebedarf aller (bzw. der genannten) Projekthüllen, der in die Vorschau fällt. */
export function faelligerBedarf(d: BaubetriebDaten, projektIds?: ID[]): BedarfEintrag[] {
  return d.projekte
    .filter((p) => p.status !== 'abgeschlossen' && (!projektIds || projektIds.includes(p.id)))
    .flatMap((projekt) =>
      anmeldebedarf(projekt, d.anmeldungen, d.einstellungen)
        .flatMap((z) => z.zellen)
        .filter((zelle) => zelle.zustand === 'faellig')
        .map((zelle) => ({ projekt, zelle })),
    )
    .sort((a, b) => (a.zelle.frist ?? '').localeCompare(b.zelle.frist ?? ''));
}

/**
 * Vorschlag für den ersten Anmeldetermin einer Projekthülle: die Frist laut
 * Richtlinie für die gewählte Prozessphase und das Fahrplanjahr des Baubeginns.
 */
export function ersterTerminVorschlag(
  p: Pick<Projekt, 'erstePhase' | 'bauzeitVon'>,
  e: Einstellungen,
): ISODate | null {
  if (!p.bauzeitVon) return null;
  const schluessel: RilSchluessel = p.erstePhase === 'unterjahr' ? 'A' : p.erstePhase;
  return rilDatum(e.rilFristen[schluessel], fahrplanjahrVon(p.bauzeitVon), p.bauzeitVon);
}

/* ------------------------------------------------------------------ */
/* Darstellung                                                         */
/* ------------------------------------------------------------------ */

/** „FPJ 2029“ bzw. „03.03.2027 – 17.03.2027“. */
export function bauzeitraumText(a: Pick<Anmeldung, 'bauVon' | 'bauBis' | 'fahrplanjahr' | 'status'>): string {
  const phase = statusDef(a.status).phase;
  if ((phase === 'V' || phase === 'W') && a.fahrplanjahr) return `Fahrplanjahr ${a.fahrplanjahr}`;
  if (!a.bauVon && !a.bauBis) return '–';
  return `${formatDate(a.bauVon)} – ${formatDate(a.bauBis)}`;
}
