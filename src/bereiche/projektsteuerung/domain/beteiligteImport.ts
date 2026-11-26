/**
 * Projektbeteiligte aus einer Excel- oder CSV-Liste. Je Zeile eine Person mit
 * Funktion (und wahlweise Gewerk und Art der Funktion). Die Kopfzeile wird in
 * den ersten Zeilen gesucht – so lässt sich auch die Excel-Ausgabe der
 * Beteiligtenliste mit ihren Titelzeilen wieder einlesen.
 *
 * Funktionen werden über Bezeichnung und Gewerk, ersatzweise über die volle
 * Bezeichnung („Fachplaner LST“) oder ein eindeutiges Kürzel gefunden – auch
 * unter einer früheren Bezeichnung (`FUNKTIONS_UMBENENNUNGEN`: eine Liste aus
 * der Fassung vor dem Funktionskatalog nennt „Bauunternehmen“ oder
 * „Fachplanung | LST“ und trifft „Auftragnehmer“ bzw. „Fachplaner LST“).
 * Unbekannte werden beim Übernehmen angelegt – unter der heutigen Bezeichnung,
 * in der Art aus der Spalte „Art“ (Kurzzeichen oder Name), ohne Angabe in der
 * des Funktionskatalogs. An einer vorhandenen Funktion ändert die Spalte
 * nichts. Personen gleichen Namens im Projekt werden aktualisiert statt doppelt
 * angelegt.
 */
import { artAusText, artInfo, artVon, katalogEintrag, umbenannt } from '../../../gemeinsam/funktionskatalog';
import { spaltenZuordnen } from '../../../shared/xlsxLesen';
import {
  UEBERGREIFEND,
  funktionsName,
  kuerzelAus,
  personName,
  type Beteiligter,
  type Funktion,
  type ID,
  type ProjektsteuerungDaten,
} from './types';

/** Spalten der Vorlage und der Excel-Ausgabe – in dieser Reihenfolge. */
export const BETEILIGTE_KOPF = [
  'Art',
  'Funktion',
  'Gewerk',
  'Kürzel',
  'Anrede',
  'Vorname',
  'Nachname',
  'Firma / Büro',
  'E-Mail',
  'Telefon',
  'Mobil',
  'Anschrift',
  'Notiz',
];

/** Erkannte Schreibweisen der Spaltenüberschriften. */
const SPALTEN: Record<string, string[]> = {
  art: ['Art', 'Art der Funktion', 'Kategorie'],
  funktion: ['Funktion', 'Rolle', 'Aufgabe im Projekt'],
  gewerk: ['Gewerk', 'Fachbereich'],
  kuerzel: ['Kürzel', 'Kurzzeichen', 'Kurz'],
  anrede: ['Anrede'],
  vorname: ['Vorname'],
  nachname: ['Nachname', 'Familienname', 'Zuname'],
  name: ['Name', 'Person', 'Ansprechpartner'],
  firma: ['Firma / Büro', 'Firma', 'Büro', 'Unternehmen', 'Organisation'],
  email: ['E-Mail', 'Email', 'Mail', 'E-Mail-Adresse'],
  telefon: ['Telefon', 'Tel', 'Tel.', 'Telefonnummer', 'Festnetz'],
  mobil: ['Mobil', 'Mobiltelefon', 'Handy'],
  anschrift: ['Anschrift', 'Adresse'],
  notiz: ['Notiz', 'Bemerkung', 'Bemerkungen', 'Hinweis'],
};

type Personenangaben = Omit<Beteiligter, 'id' | 'projektId' | 'funktionId'>;

export interface ImportZeile {
  person: Personenangaben;
  /**
   * Gefundene Funktion; sonst Bezeichnung und Gewerk einer neu anzulegenden.
   * `art`: die Art der gefundenen Funktion bzw. die der neuen – aus der Spalte
   * „Art“, ohne gültige Angabe laut Funktionskatalog; null in einer Zeile ohne
   * Funktion.
   */
  funktion: { id: ID | null; name: string; gewerk: string | null; art: string | null };
  /** Person gleichen Namens im Projekt, die aktualisiert wird. */
  vorhandenId: ID | null;
  hinweise: string[];
}

const gleich = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();


/** „Berger, Anna“ oder „Dr. Anna Berger“ in Vor- und Nachname. */
function nameTeilen(name: string): { vorname: string; nachname: string } {
  const text = name.trim().replace(/\s+/g, ' ');
  if (text.includes(',')) {
    const [nach, ...vor] = text.split(',');
    return { vorname: vor.join(',').trim(), nachname: nach.trim() };
  }
  const teile = text.split(' ');
  return { vorname: teile.slice(0, -1).join(' '), nachname: teile[teile.length - 1] ?? '' };
}

/** Ergebnis der Suche nach der Funktion einer Zeile. */
interface FunktionsTreffer {
  funktion?: Funktion;
  /** Gefunden über eine frühere Bezeichnung – die Funktion heißt heute anders. */
  frueher: boolean;
  /** Der Text ist das Kürzel mehrerer Funktionen; keine davon wird geraten. */
  kuerzelMehrdeutig: boolean;
}

/**
 * Funktion zu Bezeichnung und Gewerk – in dieser Reihenfolge, jeweils erst
 * wörtlich, dann als frühere Bezeichnung (`umbenannt`: „Bauunternehmen“,
 * „Fachplanung LST“ meinen die Funktion, die heute anders heißt):
 *
 * 1. Mit Gewerk: Bezeichnung in genau diesem Gewerk. Die frühere Bezeichnung
 *    geht hier der vollen Bezeichnung vor – „Bauüberwachung | LST“ meint
 *    „Bauüberwacher LST“, nicht die übergreifende „Bauüberwachung“, die ein
 *    umgestellter Bestand weiter führt.
 * 2. Die volle Bezeichnung („Fachplaner LST“ oder eine übergreifende Funktion
 *    beim Namen).
 * 3. Ohne Gewerk: eine eindeutige Bezeichnung in irgendeinem Gewerk.
 * 4. Ohne Gewerk zuletzt das Kürzel: Tragen es mehrere Funktionen (der Katalog
 *    führt „AN“, „FP“ oder „PING“ je Gewerk), gilt die eine übergreifende
 *    darunter, sonst keine.
 */
function funktionSuchen(funktionen: Funktion[], name: string, gewerk: string | null): FunktionsTreffer {
  const text = name.trim();
  const keine: FunktionsTreffer = { frueher: false, kuerzelMehrdeutig: false };
  if (!text) return keine;
  /** Erst wörtlich, dann als frühere Bezeichnung. */
  const beides = (suche: (frueher: boolean) => Funktion | undefined): FunktionsTreffer | undefined => {
    for (const frueher of [false, true]) {
      const funktion = suche(frueher);
      if (funktion) return { funktion, frueher, kuerzelMehrdeutig: false };
    }
    return undefined;
  };
  const heisst = (f: Funktion, bezeichnung: string, g: string | null, frueher: boolean) =>
    gleich(f.name, frueher ? umbenannt(bezeichnung.trim(), g) : bezeichnung);
  /** Der Text ist die volle Bezeichnung dieser Funktion: „Fachplaner LST“ bzw. die übergreifende beim Namen. */
  const voll = (f: Funktion, frueher: boolean): boolean => {
    if (!frueher) return gleich(funktionsName(f), text);
    if (!f.gewerk) return heisst(f, text, null, true);
    const ende = ` ${f.gewerk}`.toLowerCase();
    return text.toLowerCase().endsWith(ende) && heisst(f, text.slice(0, -ende.length), f.gewerk, true);
  };

  const imGewerk = gewerk
    ? beides((frueher) => funktionen.find((f) => heisst(f, text, gewerk, frueher) && gleich(f.gewerk ?? '', gewerk)))
    : undefined;
  const treffer = imGewerk ?? beides((frueher) => funktionen.find((f) => voll(f, frueher)));
  if (treffer) return treffer;
  if (gewerk) return keine;

  const eindeutig = beides((frueher) => {
    const gleicheBezeichnung = funktionen.filter((f) => heisst(f, text, f.gewerk, frueher));
    return gleicheBezeichnung.length === 1 ? gleicheBezeichnung[0] : undefined;
  });
  if (eindeutig) return eindeutig;

  const mitKuerzel = funktionen.filter((f) => f.kuerzel && gleich(f.kuerzel, text));
  if (mitKuerzel.length <= 1) return { ...keine, funktion: mitKuerzel[0] };
  const uebergreifend = mitKuerzel.filter((f) => f.gewerk === null);
  return uebergreifend.length === 1 ? { ...keine, funktion: uebergreifend[0] } : { ...keine, kuerzelMehrdeutig: true };
}

/** Die Funktion zu Bezeichnung und Gewerk einer Zeile (siehe `funktionSuchen`). */
export function funktionFinden(funktionen: Funktion[], name: string, gewerk: string | null): Funktion | undefined {
  return funktionSuchen(funktionen, name, gewerk).funktion;
}

/**
 * Liest die Zeilen einer Tabelle. Wirft einen Fehler mit verständlicher
 * Meldung, wenn keine Kopfzeile mit Nach- oder Gesamtname zu finden ist.
 */
export function beteiligteLesen(zeilen: string[][], daten: ProjektsteuerungDaten, projektId: ID): ImportZeile[] {
  const kopfIndex = zeilen
    .slice(0, 15)
    .findIndex((z) => {
      const s = spaltenZuordnen(z, SPALTEN);
      return s.nachname !== undefined || s.name !== undefined;
    });
  if (kopfIndex < 0) {
    throw new Error('In der Datei fehlt eine Spalte „Nachname“ oder „Name“.');
  }
  const spalten = spaltenZuordnen(zeilen[kopfIndex], SPALTEN);
  const wert = (z: string[], feld: string) => (spalten[feld] !== undefined ? (z[spalten[feld]] ?? '').trim() : '');
  const imProjekt = daten.beteiligte.filter((b) => b.projektId === projektId);
  const gesehen = new Set<string>();
  // Gewerke, die im Laufe der Datei neu hinzukommen: klein geschrieben → erste Schreibweise
  const neueGewerke = new Map<string, string>();
  const ergebnis: ImportZeile[] = [];

  for (const z of zeilen.slice(kopfIndex + 1)) {
    if (z.every((f) => !f.trim())) continue;
    let vorname = wert(z, 'vorname');
    let nachname = wert(z, 'nachname');
    const gesamt = wert(z, 'name').replace(/\s+/g, ' ');
    if (!nachname && gesamt) {
      // Ohne Vornamen in der Zeile trägt „Name“ den ganzen Namen – auch in einer Liste mit Spalte
      // „Vorname“. Bliebe „Anna Meier“ dort als Nachname stehen, hieße eine vorhandene Anna Meier nach
      // der Übernahme „Anna Anna Meier“: Erkannt wird sie über den vollen Namen, übernommen werden nur
      // ausgefüllte Angaben, ihr Vorname bliebe also neben dem neuen Nachnamen stehen.
      // Führt das Projekt die Person unter diesem vollen Namen schon, behält sie ihre Aufteilung – das
      // Zerlegen schriebe sonst „von der Heide“ oder „DB InfraGO AG“ (nur Nachname) zu „von der | Heide“
      // bzw. „DB InfraGO | AG“ um. In einer Liste ohne Spalte „Vorname“ wird wie bisher stets zerlegt.
      const bekannt = spalten.vorname === undefined ? undefined : imProjekt.find((b) => gleich(personName(b), gesamt));
      if (!vorname && bekannt) ({ vorname, nachname } = bekannt);
      else if (!vorname) ({ vorname, nachname } = nameTeilen(gesamt));
      else if (gesamt.includes(',')) {
        const geteilt = nameTeilen(gesamt);
        nachname = geteilt.nachname;
        vorname = vorname || geteilt.vorname;
      } else {
        // Neben einem Vornamen ist „Name“ der Nachname: nicht zerlegen, sonst ginge der Vorname
        // verloren („Berger | Anna“) oder ein Namenszusatz wanderte in den Vornamen („von der Heide“).
        // Steht dort doch der volle Name, bleibt als Nachname, was auf den Vornamen folgt („Anna Berger |
        // Anna“ → Berger); was davor steht, gehört wie bei `nameTeilen` zum Vornamen („Dr. Eva Sommer |
        // Eva“ → „Dr. Eva“ | Sommer). Folgt nichts, bleibt „Name“ der Nachname („Ben Ali | Ali“ heißt Ali
        // Ben Ali) – außer das Projekt führt die Person schon mit dem Teil davor als Nachnamen und nicht
        // mit dem ganzen („Meier Anna | Anna“ neben einer vorhandenen Anna Meier).
        const woerter = gesamt.split(' ');
        const vor = vorname.split(/\s+/);
        const stelle = woerter.findIndex((_, i) => vor.every((w, k) => gleich(woerter[i + k] ?? '', w)));
        const danach = stelle < 0 ? [] : woerter.slice(stelle + vor.length);
        if (danach.length > 0) {
          vorname = [...woerter.slice(0, stelle), ...vor].join(' ');
          nachname = danach.join(' ');
        } else {
          const davor = stelle > 0 ? woerter.slice(0, stelle).join(' ') : '';
          const fuehrt = (n: string) => imProjekt.some((b) => gleich(b.vorname, vorname) && gleich(b.nachname, n));
          nachname = davor && fuehrt(davor) && !fuehrt(gesamt) ? davor : gesamt;
        }
      }
    }
    if (!nachname) continue;

    // Gewerk in der Schreibweise der Gewerkliste bzw. seiner ersten Nennung in der Datei – Gewerke gelten
    // ohne Groß-/Kleinschreibung als dieselben, „pt1“ legte sonst Funktionen neben denen in „PT1“ an.
    // Nennt die Spalte kein Gewerk der Liste, aber eine Art der Funktion (die Liste der Anwender führt im
    // Blatt der Bauüberwachung „BÜW“ als Gewerk), entsteht daraus kein Gewerk: Die Angabe zählt als Art.
    const gewerkText = wert(z, 'gewerk');
    let gewerk: string | null = null;
    let artStattGewerk: string | null = null;
    if (gewerkText && !gleich(gewerkText, UEBERGREIFEND)) {
      const bekannt = daten.gewerke.find((g) => gleich(g, gewerkText)) ?? neueGewerke.get(gewerkText.toLowerCase());
      if (bekannt) gewerk = bekannt;
      else if (artAusText(gewerkText)) artStattGewerk = artAusText(gewerkText);
      else gewerk = gewerkText;
    }
    // „Auftragnehmer Übergreifend“ – so schreibt die Liste der Anwender eine Funktion ohne Gewerk
    const funktionRoh = wert(z, 'funktion');
    const funktionText = gewerk === null ? funktionRoh.replace(/\s+übergreifend$/i, '') || funktionRoh : funktionRoh;
    const treffer = funktionSuchen(daten.funktionen, funktionText, gewerk);
    const gefunden = treffer.funktion;
    const kuerzel = wert(z, 'kuerzel');
    const person: Personenangaben = {
      anrede: wert(z, 'anrede'),
      vorname,
      nachname,
      firma: wert(z, 'firma'),
      // Gleicht das Kürzel dem der Funktion, gilt es ohnehin – es bleibt leer.
      kuerzel: gefunden && gleich(kuerzel, gefunden.kuerzel) ? '' : kuerzel,
      email: wert(z, 'email'),
      telefon: wert(z, 'telefon'),
      mobil: wert(z, 'mobil'),
      anschrift: wert(z, 'anschrift'),
      notiz: wert(z, 'notiz'),
    };
    const name = personName(person).toLowerCase();
    const vorhanden = imProjekt.find((b) => personName(b).toLowerCase() === name);
    const hinweise: string[] = [];
    if (gesehen.has(name)) hinweise.push('doppelt in der Liste');
    gesehen.add(name);
    if (vorhanden) hinweise.push('wird aktualisiert');
    // Art einer neuen Funktion: aus der Spalte „Art“ (ersatzweise einer Art in der Spalte „Gewerk“), sonst laut Katalog
    const artSpalte = wert(z, 'art');
    const artGenannt = artAusText(artSpalte) ?? artStattGewerk;
    // Eine neue Funktion entsteht unter der heutigen Bezeichnung, nicht unter einer früheren
    const neuerName = umbenannt(funktionText, gewerk);
    // Ein Kürzel, das mehrere Funktionen tragen, benennt keine: Die Person kommt ohne Funktion
    const ohneFunktion = !funktionText || treffer.kuerzelMehrdeutig;
    if (!funktionText) hinweise.push('ohne Funktion');
    else if (treffer.kuerzelMehrdeutig) hinweise.push(`Kürzel „${funktionText}“ tragen mehrere Funktionen – ohne Funktion`);
    else if (gefunden) {
      if (treffer.frueher) hinweise.push(`heißt jetzt „${funktionsName(gefunden)}“`);
    } else {
      const neuesGewerk = gewerk !== null && !daten.gewerke.some((g) => gleich(g, gewerk));
      if (neuesGewerk) neueGewerke.set(gewerk!.toLowerCase(), gewerk!);
      hinweise.push(neuesGewerk ? 'neue Funktion, neues Gewerk' : 'neue Funktion');
      if (neuerName !== funktionText) hinweise.push(`heißt jetzt „${neuerName}“`);
      if (artSpalte && !artAusText(artSpalte)) hinweise.push('Art unbekannt');
    }
    if (artStattGewerk && !ohneFunktion) {
      hinweise.push(`„${gewerkText}“ ist kein Gewerk, sondern die Art „${artInfo(artStattGewerk).name}“ – ohne Gewerk`);
    }
    ergebnis.push({
      person,
      funktion: gefunden
        ? { id: gefunden.id, name: gefunden.name, gewerk: gefunden.gewerk, art: gefunden.art }
        : ohneFunktion
          ? { id: null, name: '', gewerk: null, art: null }
          : { id: null, name: neuerName, gewerk, art: artGenannt ?? artVon(neuerName, gewerk) },
      vorhandenId: vorhanden?.id ?? null,
      hinweise,
    });
  }
  return ergebnis;
}

/**
 * Werte einer neu anzulegenden Funktion. Ohne `art` gilt die des
 * Funktionskatalogs (`artVon`; eine Bezeichnung, die er nicht kennt, ist
 * „Sonstige“). Steht die Funktion im Katalog, erhält sie dessen Kürzel, sonst
 * eines aus der Bezeichnung. Angelegt wird je Bezeichnung und Gewerk nur
 * einmal – der Schlüssel dafür ist `funktionsSchluessel` aus
 * `src/gemeinsam/register.ts`.
 */
export function neueFunktion(name: string, gewerk: string | null, farbe: string, art?: string | null): Omit<Funktion, 'id'> {
  const bezeichnung = name.trim();
  return {
    name: bezeichnung,
    gewerk,
    kuerzel: katalogEintrag(bezeichnung, gewerk)?.kuerzel ?? kuerzelAus(bezeichnung),
    farbe,
    beschreibung: '',
    art: art ?? artVon(bezeichnung, gewerk),
  };
}
