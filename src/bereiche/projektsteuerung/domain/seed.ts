/**
 * Mitgelieferte Stammdaten des Bereichs – Funktionen und Standardlogos – und
 * der Demodatenbestand. Alle Termine liegen relativ zum heutigen Tag.
 *
 * Die Funktionen und Gewerke kommen aus dem gemeinsamen Funktionskatalog
 * (`src/gemeinsam/funktionskatalog.ts`), gegliedert nach der Art der Funktion;
 * das Planlaufmanagement führt dieselben. Bestände vor Fassung 9 stellt
 * `ausFassung8` (store/storage.ts) darauf um.
 */
import { FUNKTIONS_KATALOG, KATALOG_GEWERKE, artInfo } from '../../../gemeinsam/funktionskatalog';
import { addDays, today } from '../../../shared/dates';
import { folgeprotokoll, neuerEintrag, neuerTop, neueReihe, neueZeile, teilnehmerAus, zuordnung } from './protokoll';
import { neuesTodo } from './todos';
import {
  DATEN_VERSION,
  newId,
  personName,
  type Beteiligter,
  type Eintrag,
  type EintragTyp,
  type Funktion,
  type ID,
  type Logo,
  type Projekt,
  type Protokoll,
  type ProjektsteuerungDaten,
  type Teilnahme,
  type Todo,
} from './types';

/** Gewerke eines neuen Bestands – die des Funktionskatalogs. */
export const STANDARD_GEWERKE: string[] = [...KATALOG_GEWERKE];

const UMLAUTE: Record<string, string> = { ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' };
const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[äöüß]/g, (z) => UMLAUTE[z])
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/**
 * Feste Kennung einer mitgelieferten Funktion aus Bezeichnung und Gewerk:
 * `fn-projektleitung`, `fn-fachplaner-lst`. Bezeichnung + Gewerk ist im Katalog
 * eindeutig, die Kennung damit auch.
 */
export function katalogKennung(f: { name: string; gewerk: string | null }): ID {
  return `fn-${slug(f.name)}${f.gewerk ? `-${slug(f.gewerk)}` : ''}`;
}

/**
 * Projektübergreifende Funktionen eines neuen Bestands: die des
 * Funktionskatalogs mit festen Kennungen, in der Vorgabefarbe ihrer Art.
 */
export const STANDARD_FUNKTIONEN: Funktion[] = FUNKTIONS_KATALOG.map((k) => ({
  id: katalogKennung(k),
  name: k.name,
  kuerzel: k.kuerzel,
  farbe: artInfo(k.art).farbe,
  beschreibung: '',
  gewerk: k.gewerk,
  art: k.art,
}));

/**
 * Logos im Kopf von Protokoll und Beteiligtenliste, solange ein Projekt keine
 * eigenen führt. Die Dateien liegen unter `public/logos/`.
 */
export const STANDARD_LOGOS: Logo[] = [
  { id: 'logo-db-infrago', name: 'DB InfraGO', src: 'logos/Druck_DB_InfraGO.png' },
  { id: 'logo-mailaender', name: 'Mailänder Consult', src: 'logos/Druck_Mailaender_Consult.png' },
];

export function logosVon(projekt: Projekt): Logo[] {
  return projekt.logos ?? STANDARD_LOGOS;
}

/** Logos einer Protokollreihe: eigene, sonst die des Projekts. */
export function logosFuer(projekt: Projekt, reiheId: ID, reihenLogos: Record<ID, Logo[]>): Logo[] {
  return reihenLogos[reiheId] ?? logosVon(projekt);
}

/* ------------------------------------------------------------------ */
/* Demodaten                                                           */
/* ------------------------------------------------------------------ */

const tag = (n: number) => addDays(today(), n);

/** Demoperson mit einer Funktion des Katalogs (Bezeichnung und Gewerk). */
function person(
  projektId: ID,
  funktion: [name: string, gewerk?: string],
  vorname: string,
  nachname: string,
  firma: string,
  anrede: 'Frau' | 'Herr',
): Beteiligter {
  const mail = `${vorname}.${nachname}`.toLowerCase().replace(/[^a-z.]/g, '');
  return {
    id: newId('bt'),
    projektId,
    funktionId: katalogKennung({ name: funktion[0], gewerk: funktion[1] ?? null }),
    anrede,
    vorname,
    nachname,
    firma,
    kuerzel: '',
    email: `${mail}@example.org`,
    telefon: '',
    mobil: '',
    anschrift: '',
    notiz: '',
  };
}

function eintrag(typ: EintragTyp, text: string, werte: Partial<Eintrag> = {}): Eintrag {
  return { ...neuerEintrag(typ), zeilen: [neueZeile(text)], ...werte };
}

function demoProtokolle(projektId: ID, b: Record<string, Beteiligter>): Protokoll[] {
  const status: [Beteiligter, Teilnahme][] = [
    [b.pl, 'anwesend'],
    [b.ping, 'entschuldigt'],
    [b.ap, 'anwesend'],
    [b.fp, 'anwesend'],
    [b.buew, 'anwesend'],
    [b.an, 'anwesend'],
    [b.psv, 'nur Verteiler'],
  ];
  const erstes = neueReihe(
    newId('pt'),
    projektId,
    { art: 'Baubesprechung', datum: tag(-14), beginn: '09:00', ort: 'Baucontainer Rheinstraße' },
    b.ps,
    STANDARD_FUNKTIONEN,
  );
  erstes.ende = '11:00';
  erstes.naechster = tag(0);
  erstes.teilnehmer.push(...status.map(([p, s]) => teilnehmerAus(p, STANDARD_FUNKTIONEN, s)));
  // „Verantwortlich“ ist nur Text und muss dem Wert gleichen, unter dem die Person im Protokoll geführt
  // wird (`zuordnung`) – der Startbestand läuft nicht durch `werMitziehen`. Heute sind das die Kürzel
  // ihrer Funktionen: PS, PING, AP KIB, FP, AN. Das Folgeprotokoll übernimmt die Teilnehmenden unverändert.
  const wer = (p: Beteiligter): string => {
    const t = erstes.teilnehmer.find((x) => x.beteiligterId === p.id);
    return t ? zuordnung(t, erstes.teilnehmer) : '';
  };
  erstes.tops = [
    {
      ...neuerTop('Allgemeines'),
      eintraege: [
        eintrag('I', 'Die Sperrpause für den Einhub des Überbaus ist bestätigt.'),
        eintrag('F', 'Baubesprechungen finden zweiwöchentlich dienstags um 9:00 Uhr im Baucontainer statt.'),
        // Aufgaben der Projektsteuerin Lena Roth – eigene To-Dos der Übersicht, wenn unter „Angemeldet als“ „Lena Roth“ steht
        eintrag('A', 'Terminplan mit den Sperrpausen fortschreiben und an den Auftraggeber übergeben.', {
          wer: wer(b.ps),
          termin: tag(-2),
        }),
      ],
    },
    {
      ...neuerTop('Planung'),
      eintraege: [
        eintrag('A', 'Ausführungsplanung Widerlager Achse 10 zur Prüfung an den PSV übergeben.', {
          wer: wer(b.ap),
          termin: tag(-3),
        }),
        eintrag('A', 'Kabeltrasse der LST im Bereich der Baugrube einmessen und übergeben.', {
          wer: wer(b.fp),
          termin: tag(-7),
          status: 'erledigt',
        }),
      ],
    },
    {
      ...neuerTop('Bauablauf'),
      eintraege: [
        eintrag('I', 'Die Baustelleneinrichtung ist abgeschlossen.'),
        eintrag('A', 'Bauzeitenplan mit den Sperrpausen aktualisieren und verteilen.', { wer: wer(b.an), termin: tag(5) }),
        eintrag('A', 'Mehrkostenanzeige des Auftragnehmers prüfen und Stellungnahme vorbereiten.', {
          wer: wer(b.ps),
          termin: tag(9),
        }),
      ],
    },
  ];

  const { neu: zweites, vorher } = folgeprotokoll(erstes, newId('pt'));
  zweites.beginn = '09:00';
  zweites.naechster = tag(14);
  zweites.tops = zweites.tops.map((top) => ({
    ...top,
    eintraege: top.eintraege.map((e) => {
      const text = e.zeilen[0]?.text ?? '';
      // Ergänzung als neue Zeile: im Druck blau, in Nr. 3 „aus Prot. 2“
      if (text.startsWith('Ausführungsplanung')) {
        return { ...e, zeilen: [...e.zeilen, neueZeile('Teil 1 übergeben, Teil 2 folgt.')], termin: tag(4) };
      }
      // Ergänzung mit eigener Art: eine Aufgabe unter der Information
      if (text.startsWith('Die Sperrpause')) {
        const betra = neueZeile('Betra für den Einhub des Überbaus beantragen.', newId('z'), 'A');
        return { ...e, zeilen: [...e.zeilen, { ...betra, wer: wer(b.ping), termin: tag(6) }] };
      }
      if (text.startsWith('Bauzeitenplan')) return { ...e, status: 'erledigt' as const };
      // Gestrichen: steht im Druck von Nr. 2 blau durchgestrichen und entfällt in Nr. 3
      if (text.startsWith('Die Baustelleneinrichtung')) return { ...e, entfaellt: true };
      return e;
    }),
  }));
  zweites.tops[2].eintraege.push(
    eintrag('A', 'Verkehrsrechtliche Anordnung für die Umleitung beantragen.', { wer: wer(b.an), termin: tag(10) }),
  );
  return [vorher, zweites];
}

export function seedDaten(): ProjektsteuerungDaten {
  const p1: Projekt = {
    id: newId('pr'),
    nummer: 'P-2026-031',
    name: 'EÜ Rheinstraße – Ersatzneubau',
    status: 'aktiv',
    markiert: true,
    beschreibung: 'Ersatzneubau einer Eisenbahnüberführung (Beispielprojekt)',
    logos: null,
  };
  const p2: Projekt = {
    id: newId('pr'),
    nummer: 'P-2025-118',
    name: 'Bf Waldstadt – Bahnsteigverlängerung',
    status: 'aktiv',
    markiert: true,
    beschreibung: 'Verlängerung des Außenbahnsteigs (Beispielprojekt)',
    logos: null,
  };
  // Jede Demoperson trägt eine Funktion des Katalogs; im ersten Projekt führt keine zweite dasselbe
  // Kürzel – sonst stünde in den Protokollen der Name statt des Kürzels (`zuordnung`).
  const b = {
    pl: person(p1.id, ['Projektleitung'], 'Anna', 'Berger', 'DB InfraGO AG', 'Frau'),
    ping: person(p1.id, ['Projektingenieur'], 'Markus', 'Weber', 'DB InfraGO AG', 'Herr'),
    ps: person(p1.id, ['Projektsteuerung'], 'Lena', 'Roth', 'Mailänder Consult GmbH', 'Frau'),
    ap: person(p1.id, ['Ausführungsplanung', 'KIB'], 'Thomas', 'Klein', 'Ingenieurbüro Klein & Partner', 'Herr'),
    fp: person(p1.id, ['Fachplaner', 'LST'], 'Sabine', 'Hoffmann', 'SignalPlan GmbH', 'Frau'),
    buew: person(p1.id, ['Leitende Bauüberwachung'], 'Jens', 'Fischer', 'Bauüberwachung Süd GmbH', 'Herr'),
    an: person(p1.id, ['Auftragnehmer'], 'Peter', 'Wagner', 'Muster Bau GmbH', 'Herr'),
    psv: person(p1.id, ['Planprüfer', 'KIB'], 'Karl', 'Schulz', 'Prüfbüro Schulz', 'Herr'),
  };
  const zweite = [
    person(p2.id, ['Projektleitung'], 'Julia', 'Neumann', 'DB InfraGO AG', 'Frau'),
    person(p2.id, ['Projektsteuerung'], 'Lena', 'Roth', 'Mailänder Consult GmbH', 'Frau'),
    person(p2.id, ['Ausführungsplanung', 'VA'], 'Stefan', 'Braun', 'Planungsgruppe Nord', 'Herr'),
  ];

  return {
    version: DATEN_VERSION,
    // Nur ein Spiegel der gemeinsamen Anmeldung: `useBenutzerAbgleich` ersetzt ihn sofort durch den Namen
    // unter „Angemeldet als“ (kaplan-benutzer.v1). Wer dort „Lena Roth“ einträgt, sieht die Aufgaben der
    // Projektsteuerung als eigene To-Dos; „Lena Roth“ zählt in benutzer.ts (`FRUEHER`) als Vorgabe.
    einstellungen: { bearbeiter: personName(b.ps) },
    gewerke: [...STANDARD_GEWERKE],
    funktionen: STANDARD_FUNKTIONEN.map((f) => ({ ...f })),
    projekte: [p1, p2],
    beteiligte: [...Object.values(b), ...zweite],
    protokolle: demoProtokolle(p1.id, b),
    reihenLogos: {},
    todos: demoTodos(p1.id, p2.id),
    todoKarten: { reihenfolge: [], ausgeblendet: [] },
  };
}

/** Eigene To-Do-Liste: mit und ohne Projekt, wichtig, überfällig, demnächst fällig, später, erledigt. */
function demoTodos(p1: ID, p2: ID): Todo[] {
  const todo = (text: string, projektId: ID | null, termin: string, werte: Partial<Todo> = {}): Todo => ({
    ...neuesTodo(newId('td'), { text, projektId, termin }, tag(-10)),
    ...werte,
  });
  return [
    todo('Rechnung des Ingenieurbüros prüfen und zur Zahlung freigeben.', p1, tag(-1), { wichtig: true }),
    todo('Monatsbericht für den Auftraggeber vorbereiten.', null, tag(3), {
      notiz: 'Kosten, Termine und Risiken je Projekt',
    }),
    todo('Auftaktbesprechung zur Bahnsteigverlängerung vorbereiten.', p2, tag(12)),
    todo('Urlaubsvertretung abstimmen.', null, ''),
    todo('Projekthandbuch aktualisieren.', p1, tag(-4), { status: 'erledigt', erledigtAm: tag(-3) }),
  ];
}
