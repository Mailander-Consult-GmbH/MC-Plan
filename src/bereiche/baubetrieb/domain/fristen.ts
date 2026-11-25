/**
 * Fristenrechnung der Baubetriebsplanung: Fahrplanjahre, Fristen laut
 * Richtlinie, die Terminfrist einer Anmeldung in ihrem aktuellen Status,
 * Ampel und der Anmeldebedarf eines Projekts.
 */
import { addDays, diffDays, formatDate, parseISO, toISO, today } from '../../../shared/dates';
import {
  MASSNAHMENARTEN,
  RIL_BEZUG_KUERZEL,
  RIL_LABEL,
  RIL_PHASE,
  type Anmeldung,
  type AnmeldungsArt,
  type BaubetriebDaten,
  type Einstellungen,
  type ErstePhase,
  type FristRegel,
  type ID,
  type ISODate,
  type Projekt,
  type RilBezug,
  type RilFrist,
  type RilSchluessel,
  type Workflow,
} from './types';
import { dientZumNachhaken, istLeiche, statusVon, type StatusInfo } from './workflow';

/** Was die Fristenrechnung aus dem Bestand braucht. */
export type FristKontext = Pick<BaubetriebDaten, 'einstellungen' | 'workflows' | 'projekte'>;

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

/** Fahrplanjahre eines Zeitraums – höchstens zehn, ohne Beginn keines. */
export function fahrplanjahreZwischen(von: ISODate | null, bis: ISODate | null): number[] {
  const erstes = fahrplanjahrVon(von);
  if (!erstes) return [];
  const letztes = Math.max(erstes, Math.min(fahrplanjahrVon(bis) ?? erstes, erstes + 9));
  return Array.from({ length: letztes - erstes + 1 }, (_, i) => erstes + i);
}

/** Datum TT.MM.JJJJ; ein Tag jenseits des Monatsendes rückt auf den letzten Tag. */
function datumAus(jahr: number, monat: number, tag: number): ISODate {
  const letzter = new Date(jahr, monat, 0).getDate();
  return toISO(new Date(jahr, monat - 1, Math.min(Math.max(1, tag), letzter)));
}

/* ------------------------------------------------------------------ */
/* Richtlinienfristen                                                  */
/* ------------------------------------------------------------------ */

/**
 * Warum Ril_KM die N-1-Frist nimmt – oder null, wenn die N-2-Frist gilt. Ist
 * die Runde aus der Prozessphase bekannt (BBPNeo, `kmRunde`), entscheidet sie.
 */
function kmGrundFuerN1(
  a: Pick<Anmeldung, 'statusSeit' | 'fahrplanjahr' | 'bauVon' | 'kmRunde'>,
  e: Pick<Einstellungen, 'rilFristen'>,
): string | null {
  if (a.kmRunde) return a.kmRunde === 'N-1' ? 'Prozessphase 3. KP' : null;
  const n2 = rilDatum(e.rilFristen['N-2'], a.fahrplanjahr, a.bauVon);
  if (!n2) return null;
  if (a.statusSeit > n2) return 'die N-2-Frist war beim Statuswechsel verstrichen';
  return null;
}

/**
 * Welche Richtlinienfrist gilt. Ril_KM nimmt die Frist der KM-Runde, wenn sie
 * bekannt ist (Prozessphase aus BBPNeo), sonst die N-2-Frist, solange sie am Tag
 * des Statuswechsels nicht verstrichen ist, und danach die N-1-Frist. Ril_KKM
 * richtet sich nach der Maßnahmenart; Einträge der Art SKM oder MKM rechnen
 * dabei wie A.
 */
export function rilSchluesselFuer(
  bezug: RilBezug,
  a: Pick<Anmeldung, 'art' | 'statusSeit' | 'fahrplanjahr' | 'bauVon' | 'kmRunde'>,
  e: Pick<Einstellungen, 'rilFristen'>,
): RilSchluessel {
  switch (bezug) {
    case 'skm':
    case 'mkm':
    case 'N-2':
    case 'A':
      return bezug;
    case 'Nx':
      return kmGrundFuerN1(a, e) ? 'N-1' : 'N-2';
    case 'X':
      return MASSNAHMENARTEN.includes(a.art) ? (a.art as RilSchluessel) : 'A';
  }
}

/** Wochentag Mittwoch (Date.getDay). */
const MITTWOCH = 3;

/** Der Mittwoch an oder vor dem Datum – Stichtag einer Anmeldung im KKM. */
function vorigerMittwoch(datum: ISODate): ISODate {
  const tag = parseISO(datum)?.getDay() ?? MITTWOCH;
  return addDays(datum, -((tag - MITTWOCH + 7) % 7));
}

/** Ob ein Stichtag mehrere Jahre umfasst (Fenster, z. B. SKM: N−9 bis N−5). */
export function hatFenster(frist: RilFrist): boolean {
  return frist.bezug === 'stichtag' && frist.jahreVorherAb > frist.jahreVorher;
}

/** Die Stichtage im Fenster für ein Fahrplanjahr, aufsteigend – ohne Fenster einer. */
export function stichtageImFenster(frist: RilFrist, fahrplanjahr: number): ISODate[] {
  const ab = Math.max(frist.jahreVorherAb, frist.jahreVorher);
  return Array.from({ length: ab - frist.jahreVorher + 1 }, (_, i) =>
    datumAus(fahrplanjahr - ab + i, frist.monat, frist.tag),
  );
}

/**
 * Datum einer Richtlinienfrist für ein Fahrplanjahr bzw. einen Sperrbeginn.
 * Im KKM ist der Stichtag der Anmeldung immer ein Mittwoch: Eine Frist in
 * Wochen vor Sperrbeginn fällt auf den Mittwoch an oder vor diesem Datum.
 * Hat der Stichtag ein Fenster, gilt der erste an oder nach dem Bezugstag
 * `ab`; sind alle verstrichen (oder fehlt `ab`), der letzte.
 */
export function rilDatum(
  frist: RilFrist,
  fahrplanjahr: number | null,
  baubeginn: ISODate | null,
  stichtagMittwoch = false,
  ab: ISODate | null = null,
): ISODate | null {
  if (frist.bezug === 'stichtag') {
    if (!fahrplanjahr) return null;
    const stichtage = stichtageImFenster(frist, fahrplanjahr);
    return (ab ? stichtage.find((t) => t >= ab) : undefined) ?? stichtage[stichtage.length - 1];
  }
  if (!baubeginn) return null;
  const datum = addDays(baubeginn, -7 * frist.wochenVorher);
  return stichtagMittwoch ? vorigerMittwoch(datum) : datum;
}

const zweistellig = (n: number) => String(n).padStart(2, '0');

/** „Stichtag 31.10. im Jahr N−2“, „Stichtag 22.07. in den Jahren N−9 bis N−5“ bzw. „12 Wochen vor Sperrbeginn“. */
export function rilFristText(frist: RilFrist): string {
  if (frist.bezug === 'stichtag') {
    const jahr = (k: number) => (k === 0 ? 'N' : `N−${k}`);
    const tag = `Stichtag ${zweistellig(frist.tag)}.${zweistellig(frist.monat)}.`;
    return hatFenster(frist)
      ? `${tag} in den Jahren ${jahr(frist.jahreVorherAb)} bis ${jahr(frist.jahreVorher)}`
      : `${tag} im Jahr ${jahr(frist.jahreVorher)}`;
  }
  return `${frist.wochenVorher} ${frist.wochenVorher === 1 ? 'Woche' : 'Wochen'} vor Sperrbeginn`;
}

/** Kurzform der Fristregel eines Status, wie im Lastenheft geschrieben. */
export function fristRegelText(regel: FristRegel): string {
  switch (regel.typ) {
    case 'keine':
      return '.-.';
    case 'stichtag':
      return `Nächster ${regel.tag}.${regel.monat}.`;
    case 'nachhaken':
      return `Nachhak-Termin (+${regel.tage} Tage)`;
    case 'ril': {
      const name = RIL_BEZUG_KUERZEL[regel.bezug];
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
  /** Regel in Kurzform, z. B. „Ril_KKM − 14 Tage“. */
  regel: string;
  /** Rechenweg in Worten. */
  erlaeuterung: string;
  manuell: boolean;
  nachhaken: boolean;
  /** Die zugrunde liegende Richtlinienfrist ist noch ein Platzhalter. */
  platzhalter: boolean;
}

/** Terminfrist der Anmeldung in ihrem aktuellen Status. */
export function terminfrist(a: Anmeldung, d: FristKontext): Terminfrist {
  const e = d.einstellungen;
  const { status } = statusVon(d.workflows, a.statusId);
  const regel = fristRegelText(status.frist);
  const basis = { regel, manuell: false, nachhaken: dientZumNachhaken(status), platzhalter: false };

  if (a.terminManuell) {
    return {
      ...basis,
      datum: a.terminManuell,
      manuell: true,
      nachhaken: true,
      erlaeuterung: 'Termin von Hand festgelegt',
    };
  }

  switch (status.frist.typ) {
    case 'keine':
      return { ...basis, datum: null, erlaeuterung: 'Keine Terminfrist in diesem Status' };
    case 'stichtag': {
      const { tag, monat } = status.frist;
      const jahr = parseISO(a.statusSeit)?.getFullYear() ?? new Date().getFullYear();
      let datum = datumAus(jahr, monat, tag);
      if (datum < a.statusSeit) datum = datumAus(jahr + 1, monat, tag);
      return { ...basis, datum, erlaeuterung: `Nächster ${tag}.${monat}. nach dem Statuswechsel am ${formatDate(a.statusSeit)}` };
    }
    case 'nachhaken': {
      const tage = status.frist.tage;
      return {
        ...basis,
        datum: addDays(a.statusSeit, tage),
        erlaeuterung: `${tage} Tage nach dem Statuswechsel am ${formatDate(a.statusSeit)}`,
      };
    }
    case 'ril': {
      const schluessel = rilSchluesselFuer(status.frist.bezug, a, e);
      // Ril_KM: Hinweis, warum die N-1-Frist gilt – bzw. dass die Prozessphase die N-2-Frist vorgibt
      const kmGrund =
        status.frist.bezug !== 'Nx' ? null : a.kmRunde === 'N-2' ? 'Prozessphase 2. KP' : kmGrundFuerN1(a, e);
      const n1 = kmGrund ? ` – ${kmGrund}` : '';
      const ril = e.rilFristen[schluessel];
      const mittwoch = RIL_PHASE[schluessel] === 'kkm' && ril.bezug === 'baubeginn';
      // Stichtag mit Fenster (SKM, MKM): der nächste ab dem Statuswechsel – wie Ril_KM die dann offene Frist nimmt
      const fenster = hatFenster(ril);
      const grund = rilDatum(ril, a.fahrplanjahr, a.bauVon, mittwoch, fenster ? a.statusSeit : null);
      const fensterText =
        !fenster || !grund
          ? ''
          : grund >= a.statusSeit
            ? ` – der nächste ab dem Statuswechsel am ${formatDate(a.statusSeit)}`
            : ` – der letzte, beim Statuswechsel am ${formatDate(a.statusSeit)} schon verstrichen`;
      const versatz = status.frist.versatzTage;
      const datum = grund ? addDays(grund, versatz) : null;
      const bezugText =
        ril.bezug === 'stichtag'
          ? a.fahrplanjahr
            ? `Fahrplanjahr ${a.fahrplanjahr}`
            : 'Fahrplanjahr fehlt'
          : a.bauVon
            ? `Sperrbeginn ${formatDate(a.bauVon)}`
            : 'Sperrbeginn fehlt';
      return {
        ...basis,
        datum,
        platzhalter: ril.platzhalter,
        erlaeuterung: `${RIL_LABEL[schluessel]}: ${rilFristText(ril)} (${bezugText})${
          grund ? ` = ${formatDate(grund)}${mittwoch ? ' (Stichtag Mittwoch)' : ''}${fensterText}` : ''
        }${versatz ? `, ${versatz < 0 ? 'abzüglich' : 'zuzüglich'} ${Math.abs(versatz)} Tage` : ''}${n1}`,
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
/* Offene Termine über alle Projekte                                   */
/* ------------------------------------------------------------------ */

export interface TerminEintrag {
  anmeldung: Anmeldung;
  projekt: Projekt;
  status: StatusInfo;
  frist: Terminfrist;
  ampel: Ampel;
}

/** Reihenfolge nach Dringlichkeit – Überfälliges zuerst. */
export const AMPEL_RANG: Record<Ampel, number> = { ueberfaellig: 0, faellig: 1, geplant: 2, ohne: 3 };

/** Alle Anmeldungen mit Terminfrist – Überfälliges zuerst, dann nach Datum. */
export function offeneTermine(d: BaubetriebDaten, projektIds?: ID[]): TerminEintrag[] {
  const eintraege: TerminEintrag[] = [];
  for (const anmeldung of d.anmeldungen) {
    if (projektIds && !projektIds.includes(anmeldung.projektId)) continue;
    const projekt = d.projekte.find((p) => p.id === anmeldung.projektId);
    if (!projekt) continue;
    const frist = terminfrist(anmeldung, d);
    if (!frist.datum) continue;
    eintraege.push({
      anmeldung,
      projekt,
      status: statusVon(d.workflows, anmeldung.statusId),
      frist,
      ampel: ampelFuer(frist.datum, d.einstellungen.vorlaufTage),
    });
  }
  return eintraege.sort(
    (a, b) => AMPEL_RANG[a.ampel] - AMPEL_RANG[b.ampel] || (a.frist.datum ?? '').localeCompare(b.frist.datum ?? ''),
  );
}

/* ------------------------------------------------------------------ */
/* Erstanmeldung                                                       */
/* ------------------------------------------------------------------ */

/** Woher die Frist der Erstanmeldung stammt – steht in den Listen unter dem Datum. */
export const ERSTANMELDUNG_GRUND = 'nächster offener Termin laut Richtlinie für das erste Fahrplanjahr';

/** Projekt ohne Anmeldung: Die Erstanmeldung steht aus. */
export interface ErstanmeldungEintrag {
  projekt: Projekt;
  /** Frist der Erstanmeldung laut Richtlinie – null, solange das Projekt keine Fahrplanjahre nennt. */
  frist: ISODate | null;
  /** Prozessphase, in die die Erstanmeldung fällt – abgeleitet aus dem ersten Fahrplanjahr (`ersteAnmeldung`). */
  phase: ErstePhase | null;
  ampel: Ampel;
}

/**
 * Ausstehende Erstanmeldung eines Projekts, solange es keine Anmeldung hat
 * (Anmeldeleichen zählen nicht) – sonst null.
 */
export function erstanmeldungAusstehend(p: Projekt, d: BaubetriebDaten): ErstanmeldungEintrag | null {
  if (d.anmeldungen.some((a) => a.projektId === p.id && !istLeiche(d.workflows, a.statusId))) return null;
  const erste = ersteAnmeldung(p, d.einstellungen);
  const frist = erste?.frist ?? null;
  return { projekt: p, frist, phase: erste?.phase ?? null, ampel: ampelFuer(frist, d.einstellungen.vorlaufTage) };
}

/** Alle (bzw. die genannten) Projekte mit ausstehender Erstanmeldung – Überfälliges zuerst. */
export function ausstehendeErstanmeldungen(d: BaubetriebDaten, projektIds?: ID[]): ErstanmeldungEintrag[] {
  return d.projekte
    .filter((p) => !projektIds || projektIds.includes(p.id))
    .map((p) => erstanmeldungAusstehend(p, d))
    .filter((e): e is ErstanmeldungEintrag => e !== null)
    .sort((a, b) => AMPEL_RANG[a.ampel] - AMPEL_RANG[b.ampel] || (a.frist ?? '').localeCompare(b.frist ?? ''));
}

/* ------------------------------------------------------------------ */
/* Anmeldebedarf eines Projekts                                        */
/* ------------------------------------------------------------------ */

/** Prozessphasen mit festem Anmeldetermin je Fahrplanjahr: SKM, MKM, KM N-2 und KM N-1. */
export type BedarfPhase = 'skm' | 'mkm' | 'N-2' | 'N-1';

export const BEDARF_PHASEN: BedarfPhase[] = ['skm', 'mkm', 'N-2', 'N-1'];

const BEDARF_RANG: Record<BedarfPhase, number> = { skm: 0, mkm: 1, 'N-2': 2, 'N-1': 3 };

/**
 * Wie weit eine Maßnahmenart im Ablauf steht – spätere Phasen decken frühere
 * ab. Einträge in KM und KKM (A, B, C …) decken beide KM-Fristen ab: Ob N-2
 * oder N-1 gilt, entscheidet der Zeitpunkt, nicht die Art.
 */
function rangDerArt(art: AnmeldungsArt): number {
  switch (art) {
    case 'SKM':
      return 0;
    case 'MKM':
      return 1;
    default:
      return 3;
  }
}

export type BedarfZustand = 'abgedeckt' | 'faellig' | 'kuenftig' | 'verstrichen' | 'offen';

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

/**
 * Anmeldebedarf je betroffenem Fahrplanjahr: Für SKM, MKM, KM N-2 und KM N-1
 * die Frist laut Richtlinie und ob das Projekt dafür schon einen Eintrag hat.
 * Anmeldeleichen zählen nicht mit.
 */
export function anmeldebedarf(
  p: Projekt,
  d: Pick<BaubetriebDaten, 'anmeldungen' | 'workflows' | 'einstellungen'>,
  heute: ISODate = today(),
): BedarfZeile[] {
  const e = d.einstellungen;
  const eigene = d.anmeldungen.filter((a) => a.projektId === p.id && !istLeiche(d.workflows, a.statusId));
  // Bei gleichem Rang zählt der frühere Workflow – ein KM-Eintrag vor einem KKM-Eintrag.
  const workflowRang = (a: Anmeldung) => {
    const i = d.workflows.findIndex((w) => w.status.some((s) => s.id === a.statusId));
    return i < 0 ? d.workflows.length : i;
  };

  const zeilen: BedarfZeile[] = [];
  for (const n of [...p.fahrplanjahre].sort((a, b) => a - b)) {
    const baubeginn = fahrplanjahrBeginn(n);
    const zellen = BEDARF_PHASEN.map((phase): BedarfZelle => {
      // Stichtag mit Fenster: der nächste ab heute, sind alle verstrichen, der letzte
      const frist = rilDatum(e.rilFristen[phase], n, baubeginn, false, heute);
      const durch = eigene
        .filter((a) => a.fahrplanjahr === n && rangDerArt(a.art) >= BEDARF_RANG[phase])
        .sort((a, b) => rangDerArt(a.art) - rangDerArt(b.art) || workflowRang(a) - workflowRang(b))[0];
      let zustand: BedarfZustand;
      if (durch) zustand = 'abgedeckt';
      else if (!frist) zustand = 'offen';
      else if (frist < heute) zustand = 'verstrichen';
      else if (diffDays(heute, frist) <= e.bedarfVorschauTage) zustand = 'faellig';
      else zustand = 'kuenftig';
      return { phase, fahrplanjahr: n, frist, zustand, durch };
    });
    zeilen.push({ fahrplanjahr: n, zellen });
  }
  return zeilen;
}

export interface BedarfEintrag {
  projekt: Projekt;
  zelle: BedarfZelle;
}

/** Anmeldebedarf aller (bzw. der genannten) Projekte, der in die Vorschau fällt. */
export function faelligerBedarf(d: BaubetriebDaten, projektIds?: ID[]): BedarfEintrag[] {
  return d.projekte
    .filter((p) => !projektIds || projektIds.includes(p.id))
    .flatMap((projekt) =>
      anmeldebedarf(projekt, d)
        .flatMap((z) => z.zellen)
        .filter((zelle) => zelle.zustand === 'faellig')
        .map((zelle) => ({ projekt, zelle })),
    )
    .sort((a, b) => (a.zelle.frist ?? '').localeCompare(b.zelle.frist ?? ''));
}

/** Prozessphasen einer ersten Anmeldung in ihrer zeitlichen Folge, je mit dem Schlüssel ihrer Richtlinienfrist. */
const ERSTE_PHASEN: { phase: ErstePhase; schluessel: RilSchluessel }[] = [
  { phase: 'skm', schluessel: 'skm' },
  { phase: 'mkm', schluessel: 'mkm' },
  { phase: 'N-2', schluessel: 'N-2' },
  { phase: 'N-1', schluessel: 'N-1' },
  { phase: 'kkm', schluessel: 'A' },
];

/** Wann und in welcher Prozessphase die erste Anmeldung eines Projekts fällig ist. */
export interface ErsteAnmeldung {
  phase: ErstePhase;
  frist: ISODate;
  /** Das erste betroffene Fahrplanjahr – nach ihm richtet sich die Frist. */
  fahrplanjahr: number;
}

/**
 * Erste Anmeldung eines Projekts – allein aus seinen Fahrplanjahren: für das
 * erste betroffene Fahrplanjahr der nächste noch offene Termin laut Richtlinie
 * ab `heute`, in der Folge SKM, MKM, KM N-2, KM N-1 und unterjährig
 * (Maßnahmenart A, Sperrpause ab Beginn des Fahrplanjahres). Stichtage mit
 * Fenster zählen mit ihrem nächsten offenen Stichtag; fällt das Fahrplanjahr
 * in SKM und MKM, gilt der frühere (wie `phaseNachFahrplanjahr`). Ist kein
 * Termin mehr offen, der unterjährige – dann überfällig. null ohne
 * Fahrplanjahre.
 */
export function ersteAnmeldung(
  p: Pick<Projekt, 'fahrplanjahre'>,
  e: Pick<Einstellungen, 'rilFristen'>,
  heute: ISODate = today(),
): ErsteAnmeldung | null {
  if (p.fahrplanjahre.length === 0) return null;
  const fahrplanjahr = Math.min(...p.fahrplanjahre);
  const beginn = fahrplanjahrBeginn(fahrplanjahr);
  const termine = ERSTE_PHASEN.flatMap(({ phase, schluessel }) => {
    const frist = rilDatum(e.rilFristen[schluessel], fahrplanjahr, beginn, RIL_PHASE[schluessel] === 'kkm', heute);
    return frist ? [{ phase, frist, fahrplanjahr }] : [];
  });
  // Bei gleichem Datum bleibt die Folge der Phasen (stabile Sortierung) – SKM vor MKM
  const offen = termine.filter((t) => t.frist >= heute).sort((a, b) => a.frist.localeCompare(b.frist));
  return offen[0] ?? termine[termine.length - 1] ?? null;
}

/**
 * In welche Phase ein Fahrplanjahr von `heute` aus gehört: SKM oder MKM – je
 * nach dem nächsten noch offenen Stichtag im Fenster; fällt das Fahrplanjahr in
 * beide, gilt der frühere (am selben Tag SKM). Ist für beide kein Stichtag mehr
 * offen, gehört es ins KM bzw. unterjährig – null. Liegt es hinter dem
 * SKM-Fenster, gilt der erste SKM-Stichtag im Fenster, also SKM.
 *
 * Beispiel (SKM 22.07. in N−9 bis N−5, MKM 17.02. in N−4 bis N−3): Am
 * 26.11.2026 kommt der 17.02.2027 vor dem 22.07.2027 – MKM sind 2030 und 2031,
 * SKM 2032 bis 2036 (und später). Am 25.05.2027 kommt der 22.07.2027 zuerst –
 * SKM 2032 bis 2036, MKM nur noch 2031 (2032 liegt schon im SKM).
 */
export function phaseNachFahrplanjahr(
  e: Pick<Einstellungen, 'rilFristen'>,
  fahrplanjahr: number,
  heute: ISODate,
): 'skm' | 'mkm' | null {
  const naechster = (frist: RilFrist) =>
    frist.bezug === 'stichtag'
      ? (stichtageImFenster(frist, fahrplanjahr).find((t) => t >= heute) ?? null)
      : (() => {
          const datum = rilDatum(frist, fahrplanjahr, fahrplanjahrBeginn(fahrplanjahr));
          return datum && datum >= heute ? datum : null;
        })();
  const skm = naechster(e.rilFristen.skm);
  const mkm = naechster(e.rilFristen.mkm);
  if (skm && (!mkm || skm <= mkm)) return 'skm';
  return mkm ? 'mkm' : null;
}

/* ------------------------------------------------------------------ */
/* Darstellung                                                         */
/* ------------------------------------------------------------------ */

/** Der Workflow führt den Sperrzeitraum als ganzes Fahrplanjahr. */
export function ganzesFahrplanjahr(workflow: Pick<Workflow, 'bauzeitraum'>): boolean {
  return workflow.bauzeitraum === 'fahrplanjahr';
}

/** „Fahrplanjahr 2029“ bzw. „03.03.2027 – 17.03.2027“. */
export function bauzeitraumText(
  a: Pick<Anmeldung, 'bauVon' | 'bauBis' | 'fahrplanjahr' | 'statusId'>,
  workflows: Workflow[],
): string {
  if (ganzesFahrplanjahr(statusVon(workflows, a.statusId).workflow) && a.fahrplanjahr) {
    return `Fahrplanjahr ${a.fahrplanjahr}`;
  }
  if (!a.bauVon && !a.bauBis) return '–';
  return `${formatDate(a.bauVon)} – ${formatDate(a.bauBis)}`;
}
