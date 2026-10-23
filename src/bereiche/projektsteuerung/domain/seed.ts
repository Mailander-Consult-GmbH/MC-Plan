/**
 * Mitgelieferte Stammdaten des Bereichs – Funktionen und Standardlogos – und
 * der Demodatenbestand. Alle Termine liegen relativ zum heutigen Tag.
 */
import { addDays, today } from '../../../shared/dates';
import { erledigen, leereLop, neuesThema } from './lop';
import { folgeprotokoll, neuerEintrag, neuerTop, neueReihe, teilnehmerAus } from './protokoll';
import {
  DATEN_VERSION,
  STANDARD_BEARBEITER,
  newId,
  type Beteiligter,
  type Eintrag,
  type EintragTyp,
  type Funktion,
  type ID,
  type Logo,
  type Lop,
  type LopPunkt,
  type Projekt,
  type Protokoll,
  type ProjektsteuerungDaten,
  type Teilnahme,
} from './types';

const F = (id: ID, name: string, kuerzel: string, farbe: string, beschreibung = ''): Funktion => ({
  id,
  name,
  kuerzel,
  farbe,
  beschreibung,
});

/** Projektübergreifende Funktionen eines neuen Bestands. */
export const STANDARD_FUNKTIONEN: Funktion[] = [
  F('fn-ag', 'Auftraggeber', 'AG', '#24456e', 'Vorhabenträger bzw. Bauherr, etwa DB InfraGO AG'),
  F('fn-pl', 'Projektleitung', 'PL', '#24456e', 'Projektleitung des Auftraggebers'),
  F('fn-tpl', 'Teilprojektleitung', 'TPL', '#5856d6', 'Teilprojektleitung des Auftraggebers'),
  F('fn-pi', 'Projektingenieur', 'PI', '#5856d6', 'Projektingenieurin bzw. Projektingenieur des Auftraggebers'),
  F('fn-ps', 'Projektsteuerung', 'PS', '#00a0a0', 'Externe Projektsteuerung'),
  F('fn-plm', 'Planlaufmanagement', 'PLM', '#00a0a0', 'Steuerung der Planläufe'),
  F('fn-op', 'Objektplanung', 'OP', '#ff9500', 'Objektplanung Verkehrsanlagen bzw. Ingenieurbauwerke'),
  F('fn-lst', 'Fachplanung LST', 'LST', '#ff9500', 'Leit- und Sicherungstechnik'),
  F('fn-ola', 'Fachplanung OLA', 'OLA', '#ff9500', 'Oberleitungsanlagen'),
  F('fn-kib', 'Fachplanung KIB', 'KIB', '#ff9500', 'Konstruktiver Ingenieurbau'),
  F('fn-tk', 'Fachplanung TK', 'TK', '#ff9500', 'Telekommunikation'),
  F('fn-50hz', 'Fachplanung 50 Hz', '50HZ', '#ff9500', 'Elektrische Energieanlagen 50 Hz'),
  F('fn-bue', 'Bauüberwachung', 'BÜ', '#34c759', 'Bauüberwachung Bahn'),
  F('fn-an', 'Bauunternehmen', 'AN', '#c77700', 'Ausführendes Bauunternehmen (Auftragnehmer)'),
  F('fn-psv', 'Prüfsachverständiger', 'PSV', '#af52de', 'Prüfsachverständiger bzw. Prüfingenieur'),
  F('fn-vm', 'Vermessung', 'VM', '#8e8e93'),
  F('fn-sigeko', 'SiGeKo', 'SGK', '#ff3b30', 'Sicherheits- und Gesundheitsschutzkoordination'),
  F('fn-ubue', 'Umweltfachliche Bauüberwachung', 'UBÜ', '#34c759'),
  F('fn-bbp', 'Baubetriebsplanung', 'BBP', '#5856d6', 'Baubetriebliche Anmeldungen und Betra'),
  F('fn-eba', 'Eisenbahn-Bundesamt', 'EBA', '#8e8e93', 'Aufsichts- und Genehmigungsbehörde'),
];

/**
 * Logos im Kopf von Protokoll und LOP, solange ein Projekt keine eigenen
 * führt. Die Dateien liegen unter `public/logos/`.
 */
export const STANDARD_LOGOS: Logo[] = [
  { id: 'logo-db-infrago', name: 'DB InfraGO', src: 'logos/Druck_DB_InfraGO.png' },
  { id: 'logo-mailaender', name: 'Mailänder Consult', src: 'logos/Druck_Mailaender_Consult.png' },
];

export function logosVon(projekt: Projekt): Logo[] {
  return projekt.logos ?? STANDARD_LOGOS;
}

/* ------------------------------------------------------------------ */
/* Demodaten                                                           */
/* ------------------------------------------------------------------ */

const tag = (n: number) => addDays(today(), n);

function person(
  projektId: ID,
  funktionId: ID,
  vorname: string,
  nachname: string,
  firma: string,
  anrede: 'Frau' | 'Herr',
): Beteiligter {
  const mail = `${vorname}.${nachname}`.toLowerCase().replace(/[^a-z.]/g, '');
  return {
    id: newId('bt'),
    projektId,
    funktionId,
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
  return { ...neuerEintrag(typ), text, ...werte };
}

function demoProtokolle(projektId: ID, b: Record<string, Beteiligter>): Protokoll[] {
  const status: [Beteiligter, Teilnahme][] = [
    [b.pl, 'anwesend'],
    [b.tpl, 'entschuldigt'],
    [b.op, 'anwesend'],
    [b.lst, 'anwesend'],
    [b.bue, 'anwesend'],
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
  erstes.tops = [
    {
      ...neuerTop('Allgemeines'),
      eintraege: [
        eintrag('I', 'Die Sperrpause für den Einhub des Überbaus ist bestätigt.'),
        eintrag('F', 'Baubesprechungen finden zweiwöchentlich dienstags um 9:00 Uhr im Baucontainer statt.'),
      ],
    },
    {
      ...neuerTop('Planung'),
      eintraege: [
        eintrag('A', 'Ausführungsplanung Widerlager Achse 10 zur Prüfung an den PSV übergeben.', {
          wer: 'OP',
          termin: tag(-3),
        }),
        eintrag('A', 'Kabeltrasse der LST im Bereich der Baugrube einmessen und übergeben.', {
          wer: 'LST',
          termin: tag(-7),
          status: 'erledigt',
        }),
      ],
    },
    {
      ...neuerTop('Bauablauf'),
      eintraege: [
        eintrag('I', 'Die Baustelleneinrichtung ist abgeschlossen.'),
        eintrag('A', 'Bauzeitenplan mit den Sperrpausen aktualisieren und verteilen.', { wer: 'AN', termin: tag(5) }),
      ],
    },
  ];

  const { neu: zweites, vorher } = folgeprotokoll(erstes, newId('pt'));
  zweites.beginn = '09:00';
  zweites.naechster = tag(14);
  zweites.tops = zweites.tops.map((top) => ({
    ...top,
    eintraege: top.eintraege.map((e) => {
      if (e.text.startsWith('Ausführungsplanung')) {
        return { ...e, zusatz: 'Teil 1 übergeben, Teil 2 folgt.', termin: tag(4) };
      }
      if (e.text.startsWith('Bauzeitenplan')) return { ...e, status: 'erledigt' as const };
      return e;
    }),
  }));
  zweites.tops[2].eintraege.push(
    eintrag('A', 'Verkehrsrechtliche Anordnung für die Umleitung beantragen.', { wer: 'AN', termin: tag(10) }),
  );
  return [vorher, zweites];
}

function demoLop(projektId: ID, aufgestelltVon: ID): Lop {
  const planung = neuesThema('Planung');
  const genehmigung = neuesThema('Genehmigungen');
  const bau = neuesThema('Bauablauf');
  for (const t of [planung, genehmigung, bau]) t.vorTitel = t.titel;
  const punkt = (nr: number, themaId: ID, text: string, werte: Partial<LopPunkt>): LopPunkt => {
    const p: LopPunkt = {
      id: newId('lp'),
      nr,
      themaId,
      text,
      zusatz: '',
      wer: '',
      termin: '',
      status: 'offen',
      erledigtAm: '',
      herkunft: '',
      erfasst: tag(-28),
      vor: null,
      archiviertAb: null,
      ...werte,
    };
    return p.vor === null && werte.vor === undefined
      ? { ...p, vor: { text: p.text, wer: p.wer, termin: p.termin, status: p.status } }
      : p;
  };
  const punkte: LopPunkt[] = [
    punkt(1, planung.id, 'Ergänzendes Baugrundgutachten Achse 20 beauftragen.', {
      wer: 'PL',
      termin: tag(-35),
      status: 'erledigt',
      erledigtAm: tag(-30),
      erfasst: tag(-42),
      archiviertAb: 3,
    }),
    punkt(2, genehmigung.id, 'Planrechtliche Entscheidung beim Eisenbahn-Bundesamt einholen.', {
      wer: 'PL',
      termin: tag(21),
      herkunft: 'Baubesprechung Nr. 1',
      zusatz: `Unterlagen eingereicht am ${tag(-2).split('-').reverse().join('.')}.`,
    }),
    punkt(3, planung.id, 'Ausführungsplanung Leit- und Sicherungstechnik vorlegen.', {
      wer: 'LST',
      termin: tag(-2),
      vor: { text: 'Ausführungsplanung Leit- und Sicherungstechnik vorlegen.', wer: 'LST', termin: tag(-9), status: 'offen' },
    }),
    punkt(4, bau.id, 'Betra für den Einhub des Überbaus beantragen.', { wer: 'TPL', termin: tag(6) }),
    {
      ...erledigen(
        punkt(5, bau.id, 'Umleitung des Straßenverkehrs mit der Stadt abstimmen.', { wer: 'AN', termin: tag(-1) }),
        true,
      ),
      erledigtAm: tag(-1),
    },
    punkt(6, genehmigung.id, 'Wasserrechtliche Erlaubnis für die Bauwasserhaltung beantragen.', {
      wer: 'OP',
      termin: tag(30),
      erfasst: tag(-1),
      vor: null,
    }),
  ];
  return {
    ...leereLop(projektId),
    stand: 3,
    standDatum: tag(0),
    aufgestelltVon,
    themen: [planung, genehmigung, bau],
    punkte,
    naechsteNr: 7,
    fortschreibungen: [
      { stand: 1, datum: tag(-28) },
      { stand: 2, datum: tag(-14) },
    ],
  };
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
  const b = {
    pl: person(p1.id, 'fn-pl', 'Anna', 'Berger', 'DB InfraGO AG', 'Frau'),
    tpl: person(p1.id, 'fn-tpl', 'Markus', 'Weber', 'DB InfraGO AG', 'Herr'),
    ps: person(p1.id, 'fn-ps', 'Lena', 'Roth', 'Mailänder Consult GmbH', 'Frau'),
    op: person(p1.id, 'fn-op', 'Thomas', 'Klein', 'Ingenieurbüro Klein & Partner', 'Herr'),
    lst: person(p1.id, 'fn-lst', 'Sabine', 'Hoffmann', 'SignalPlan GmbH', 'Frau'),
    bue: person(p1.id, 'fn-bue', 'Jens', 'Fischer', 'Bauüberwachung Süd GmbH', 'Herr'),
    an: person(p1.id, 'fn-an', 'Peter', 'Wagner', 'Muster Bau GmbH', 'Herr'),
    psv: person(p1.id, 'fn-psv', 'Karl', 'Schulz', 'Prüfbüro Schulz', 'Herr'),
  };
  const zweite = [
    person(p2.id, 'fn-pl', 'Julia', 'Neumann', 'DB InfraGO AG', 'Frau'),
    person(p2.id, 'fn-ps', 'Lena', 'Roth', 'Mailänder Consult GmbH', 'Frau'),
    person(p2.id, 'fn-op', 'Stefan', 'Braun', 'Planungsgruppe Nord', 'Herr'),
  ];
  const lop2 = leereLop(p2.id);
  lop2.aufgestelltVon = zweite[1].id;
  lop2.punkte = [
    { text: 'Bestandsvermessung des Bahnsteigs beauftragen.', wer: 'PS', termin: tag(10) },
    { text: 'Leitungsbestand mit den Versorgern abstimmen.', wer: 'OP', termin: tag(-4) },
  ].map((w, i) => ({
    id: newId('lp'),
    nr: i + 1,
    themaId: lop2.themen[0].id,
    zusatz: '',
    status: 'offen' as const,
    erledigtAm: '',
    herkunft: '',
    erfasst: tag(-6),
    vor: null,
    archiviertAb: null,
    ...w,
  }));
  lop2.naechsteNr = 3;

  return {
    version: DATEN_VERSION,
    einstellungen: { bearbeiter: STANDARD_BEARBEITER, farbmodus: 'standard' },
    funktionen: STANDARD_FUNKTIONEN.map((f) => ({ ...f })),
    projekte: [p1, p2],
    beteiligte: [...Object.values(b), ...zweite],
    protokolle: demoProtokolle(p1.id, b),
    lops: [demoLop(p1.id, b.ps.id), lop2],
  };
}
