/**
 * Lokale Persistenz des Bereichs „Leistungsnachweise“ unter einem eigenen
 * Schlüssel. Die Bestände der anderen Bereiche werden weder gelesen noch
 * geschrieben.
 *
 * Gibt es noch keinen Bestand, beginnt der Bereich mit Demodaten – aber nur,
 * solange das Projektregister leer ist. Führt es schon Projekte (andere
 * Bereiche sind in Gebrauch, etwa beim ersten Öffnen nach dem Wechsel auf
 * eine Fassung mit Leistungsnachweisen), beginnt der Bereich leer: Sonst
 * trüge sein Abgleich die Beispielprojekte ins Register und damit in alle
 * Bereiche. Die Projekte des Registers nimmt der Abgleich ohnehin auf.
 *
 * Wie im Planlaufmanagement wird nur gespeichert, wenn der Bestand
 * einwandfrei geladen wurde (`LadeZustand` 'ok'): Nach einem Ladefehler oder
 * bei einem Stand aus einer neueren Fassung zeigt der Bereich Demodaten und
 * lässt den gespeicherten Stand unberührt. Vor jeder Umstellung auf eine
 * neue Fassung legt `ladeDaten` eine Rohkopie `<Schlüssel>.vor-fassung-<n>` an.
 *
 * Fassungen: 1 – erster Stand; 2 – Rolle Controlling am Mitarbeiter,
 * Aufschläge je Nachweiszeile, abgerechnete Stunden im festgeschriebenen Stand
 * (`migriere`); 3 – ohne Rolle, das Controlling ist ein eigener Bereich mit
 * PIN (`aufbereiten` übernimmt die Rolle nicht); 4 – Zeitraumregel
 * „fortlaufend“; 5 – nachgereichte Leistungen; 6 – festgelegtes Ende
 * (`bisFest`) und gekennzeichnete nachgereichte Zeilen im Stand; 7 –
 * gemeinsame Leistungstexte je Zeitraum (`periodentexte`) und
 * Monatsbestätigungen (`bestaetigungen`); 8 – Zeitraumregeln „Alle 2 Monate“
 * und „Alle 3 Monate“ (`zweiMonate`, `quartal`) und der Monat, ab dem ihre
 * Blöcke zählen (`Projekt.rhythmusAb`, optional); 9 – ohne
 * Abrechnungsrhythmus (`zeitraumregel` und `rhythmusAb` entfallen, je Projekt
 * ein laufender Nachweis – `laufendeZusammenfuehren`) und mit Gesamtaufschlag
 * am Nachweis (`gesamtAufschlag`).
 *
 * Speichern meldet, ob es gelungen ist (`SpeicherZustand`) – ist der Speicher
 * des Browsers voll, zeigt der Bereich einen dauerhaften Hinweis
 * (components/SpeicherHinweis.tsx). Schreibt ein anderes Fenster denselben
 * Schlüssel, lädt der Store dessen Stand mit `ladeDaten` nach.
 */
import { today } from '../../../shared/dates';
import { nachRaeumenSpeichern, speicherVoll } from '../../../shared/speicher';
import { registerLesen } from '../../../gemeinsam/register';
import { bestaetigungenNachziehen, periodentexteNachziehen } from '../domain/erfassung';
import { seedDaten } from '../domain/seed';
import {
  DATEN_VERSION,
  OHNE_ABSCHNITT,
  STANDARD_BEARBEITER,
  type Abschnitt,
  type Bestaetigung,
  type GesamtAufschlag,
  type Leistung,
  type Leistungsnachweis,
  type LeistungsnachweisDaten,
  type Logo,
  type Mitarbeiter,
  type NachweisStand,
  type NachweisZeile,
  type Periodentext,
  type Projekt,
  type Raster,
  type ZeilenText,
} from '../domain/types';
import { gesamtAufschlagNormal, laufendeZusammenfuehren, nachgereichteZeilenUmstellen } from '../domain/nachweis';
import { erfassungsPeriodeAusSchluessel, istDatum, istMonat, runden } from '../domain/zeitraum';

export { DATEN_VERSION };

const KEY = 'leistungsnachweise.data.v1';

/** Präfix der Rohkopien vor einer Umstellung: `<KEY>.vor-fassung-<n>`. */
const VOR_FASSUNG = `${KEY}.vor-fassung-`;

/** Kennzeichen in Sicherungsdateien, damit sie dem richtigen Bereich zugeordnet werden. */
const SICHERUNG_BEREICH = 'leistungsnachweise';

/**
 * Zustand nach dem Laden: `ladefehler` – der gespeicherte Stand ließ sich nicht
 * lesen; `neuere_fassung` – er stammt aus einer neueren Fassung von KaPlan. In
 * beiden Fällen zeigt der Bereich Demodaten und speichert nicht, damit der
 * gespeicherte Stand erhalten bleibt.
 */
export type LadeZustand = 'ok' | 'ladefehler' | 'neuere_fassung';

/** Ergebnis von `ladeDaten`. */
export interface Geladen {
  daten: LeistungsnachweisDaten;
  zustand: LadeZustand;
}

type Roh = Record<string, unknown>;

const liste = (w: unknown): Roh[] => (Array.isArray(w) ? w.filter((x): x is Roh => !!x && typeof x === 'object') : []);
const objekt = (w: unknown): Roh | null => (w && typeof w === 'object' && !Array.isArray(w) ? (w as Roh) : null);
const text = (w: unknown) => (typeof w === 'string' ? w : '');
const datum = (w: unknown) => (istDatum(w) ? w : '');
const idOderNull = (w: unknown) => (typeof w === 'string' && w ? w : null);
const zufallsId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
const ids = (w: unknown): string[] => (Array.isArray(w) ? w.filter((x): x is string => typeof x === 'string' && !!x) : []);
const auswahl = <T extends string>(w: unknown, werte: readonly T[], vorgabe: T): T =>
  (werte as readonly unknown[]).includes(w) ? (w as T) : vorgabe;

/** Stunden als Zahl – auch aus Text („6,5“); sonst 0. */
function stunden(w: unknown): number {
  if (typeof w === 'number') return Number.isFinite(w) ? w : 0;
  if (typeof w === 'string') {
    const z = Number(w.trim().replace(',', '.'));
    return Number.isFinite(z) ? z : 0;
  }
  return 0;
}

/** Zahlen je Schlüssel (Stunden je Abschnitt bzw. Mitarbeiter). */
function zahlen(w: unknown): Record<string, number> {
  const o = objekt(w);
  if (!o) return {};
  return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, stunden(v)]));
}

/** Texte je Schlüssel – nur nicht leere (Kennungen der bestätigten Zeiträume, Inhalte und Abschnitte abgerechneter Leistungen). */
function texteJeSchluessel(w: unknown): Record<string, string> {
  const o = objekt(w);
  if (!o) return {};
  return Object.fromEntries(Object.entries(o).filter((e): e is [string, string] => !!e[0] && typeof e[1] === 'string' && !!e[1]));
}

/** Je Kennung nur der erste Eintrag – ein von Hand bearbeiteter Bestand kann Kennungen doppelt führen. */
function eindeutig<T extends { id: string }>(eintraege: T[]): T[] {
  const gesehen = new Set<string>();
  return eintraege.filter((e) => (gesehen.has(e.id) ? false : (gesehen.add(e.id), true)));
}

const RASTER = ['tag', 'woche', 'monat'] as const;

/** Gesamtaufschlag eines Nachweises: Art „stunden“ oder „prozent“ und eine Zahl (auch als Text) ≠ 0 – sonst null. */
function gesamtAufschlagAufbereiten(w: unknown): GesamtAufschlag | null {
  const g = objekt(w);
  if (!g || (g.art !== 'stunden' && g.art !== 'prozent')) return null;
  return gesamtAufschlagNormal({ art: g.art, wert: stunden(g.wert) });
}

function abschnittAufbereiten(a: Roh): Abschnitt {
  return { id: text(a.id) || zufallsId('ab'), kennung: text(a.kennung), kurz: text(a.kurz), name: text(a.name) };
}

function zeileAufbereiten(z: Roh): NachweisZeile {
  const von = datum(z.von);
  const erfasst = stunden(z.stunden);
  const jeAbschnitt = zahlen(z.stundenJeAbschnitt);
  return {
    schluessel: text(z.schluessel),
    von,
    bis: datum(z.bis) || von,
    datumText: text(z.datumText),
    bearbeiter: Array.isArray(z.bearbeiter) ? z.bearbeiter.map(text) : [],
    text: text(z.text),
    textBearbeitet: z.textBearbeitet === true,
    ...(z.textGemeinsam === true ? { textGemeinsam: true } : {}),
    stunden: erfasst,
    stundenJeAbschnitt: jeAbschnitt,
    stundenJeMitarbeiter: zahlen(z.stundenJeMitarbeiter),
    leistungIds: ids(z.leistungIds),
    ...(z.nachgereicht === true ? { nachgereicht: true } : {}),
    // Fehlen die Felder (Fassung 1), gilt: kein Aufschlag, abgerechnet = erfasst
    aufschlag: stunden(z.aufschlag),
    aufschlagJeAbschnitt: ohneNull(zahlen(z.aufschlagJeAbschnitt)),
    abgerechnet: typeof z.abgerechnet === 'number' || typeof z.abgerechnet === 'string' ? stunden(z.abgerechnet) : erfasst,
    abgerechnetJeAbschnitt: objekt(z.abgerechnetJeAbschnitt) ? zahlen(z.abgerechnetJeAbschnitt) : { ...jeAbschnitt },
    // Anteil am Gesamtaufschlag (Fassung 9) – nur ≠ 0
    ...(runden(stunden(z.anteilGesamt)) !== 0 ? { anteilGesamt: runden(stunden(z.anteilGesamt)) } : {}),
    ...(objekt(z.anteilGesamtJeAbschnitt) ? { anteilGesamtJeAbschnitt: ohneNull(zahlen(z.anteilGesamtJeAbschnitt)) } : {}),
  };
}

/** Nur Einträge ≠ 0, auf zwei Nachkommastellen. */
function ohneNull(werte: Record<string, number>): Record<string, number> {
  return Object.fromEntries(
    Object.entries(werte)
      .map(([k, v]): [string, number] => [k, runden(v)])
      .filter(([, v]) => v !== 0),
  );
}

function standAufbereiten(w: unknown): NachweisStand | null {
  const s = objekt(w);
  if (!s || !Array.isArray(s.zeilen)) return null;
  const p = objekt(s.projekt) ?? {};
  const erfasst = stunden(s.stunden);
  return {
    zeilen: liste(s.zeilen).map(zeileAufbereiten),
    ...((RASTER as readonly unknown[]).includes(s.erfassungsRaster) ? { erfassungsRaster: s.erfassungsRaster as Raster } : {}),
    // Inhalt und Abschnitt der abgerechneten Leistungen – fehlen in früher abgeschlossenen Ständen
    ...(objekt(s.inhalte) ? { inhalte: texteJeSchluessel(s.inhalte) } : {}),
    ...(objekt(s.abschnittIds) ? { abschnittIds: texteJeSchluessel(s.abschnittIds) } : {}),
    abschnitte: liste(s.abschnitte).map(abschnittAufbereiten),
    projekt: {
      nummer: text(p.nummer),
      name: text(p.name),
      kurzname: text(p.kurzname),
      leistungsbereich: text(p.leistungsbereich),
    },
    titel: text(s.titel),
    stunden: erfasst,
    abgerechnet: typeof s.abgerechnet === 'number' || typeof s.abgerechnet === 'string' ? stunden(s.abgerechnet) : erfasst,
  };
}

function texteAufbereiten(w: unknown): Record<string, ZeilenText> {
  const o = objekt(w);
  if (!o) return {};
  const ergebnis: Record<string, ZeilenText> = {};
  for (const [schluessel, wert] of Object.entries(o)) {
    const t = objekt(wert);
    if (t && typeof t.text === 'string') {
      ergebnis[schluessel] = { text: t.text, leistungIds: ids(t.leistungIds), ...(typeof t.ausgang === 'string' ? { ausgang: t.ausgang } : {}) };
    }
  }
  return ergebnis;
}

/**
 * Ergänzt fehlende Felder, damit ältere oder von Hand bearbeitete Stände
 * laden, und verwirft kaputte Verweise: Leistungen und Nachweise ohne
 * (bekanntes) Projekt oder ohne gültiges Datum fallen weg; ein unbekannter
 * Mitarbeiter bleibt als Verweis stehen (der Nachweis zeigt dann „?“), ein
 * unbekannter Abschnitt wird zu „ohne Abschnitt“. Gemeinsame Texte ohne
 * bekanntes Projekt, mit ungültigem Schlüssel oder leerem Text fallen weg,
 * ebenso Bestätigungen ohne bekanntes Projekt bzw. bekannten Mitarbeiter oder
 * ohne gültigen Monat; je Schlüssel bleibt der erste Eintrag. Ein
 * Gesamtaufschlag ohne gültige Art oder mit 0 entfällt (null); den
 * Abrechnungsrhythmus früherer Fassungen (`zeitraumregel`, `rhythmusAb`)
 * übernimmt es nicht. Für Prüfungen exportiert.
 */
export function aufbereiten(roh: Partial<LeistungsnachweisDaten>): LeistungsnachweisDaten {
  const e = objekt(roh.einstellungen) ?? {};
  const mitarbeiter = eindeutig(
    liste(roh.mitarbeiter).map(
      (m): Mitarbeiter => ({
        id: text(m.id) || zufallsId('ma'),
        kuerzel: text(m.kuerzel).trim(),
        vorname: text(m.vorname).trim(),
        nachname: text(m.nachname).trim(),
        aktiv: m.aktiv !== false,
      }),
    ),
  );
  const projekte = eindeutig(
    liste(roh.projekte).map(
      (p): Projekt => ({
        id: text(p.id) || zufallsId('pr'),
        nummer: text(p.nummer).trim(),
        name: text(p.name) || 'Ohne Bezeichnung',
        kurzname: text(p.kurzname),
        status: auswahl(p.status, ['aktiv', 'pausiert', 'abgeschlossen'] as const, 'aktiv'),
        markiert: p.markiert !== false,
        beschreibung: text(p.beschreibung),
        leistungsbereich: typeof p.leistungsbereich === 'string' ? p.leistungsbereich : 'Projektsteuerung',
        // Abrechnungsrhythmus (`zeitraumregel`, `rhythmusAb`) gibt es seit Fassung 9 nicht mehr – entfällt
        raster: auswahl(p.raster, RASTER, 'monat'),
        abschnitte: eindeutig(liste(p.abschnitte).map(abschnittAufbereiten)),
        logos: Array.isArray(p.logos)
          ? liste(p.logos)
              .filter((l) => text(l.src))
              .map((l): Logo => ({ id: text(l.id) || zufallsId('logo'), name: text(l.name), src: text(l.src) }))
          : null,
      }),
    ),
  );
  const projektVon = new Map(projekte.map((p) => [p.id, p]));

  const leistungen = eindeutig(
    liste(roh.leistungen)
      .filter((l) => projektVon.has(text(l.projektId)) && istDatum(l.datum))
      .map((l): Leistung => {
        const projekt = projektVon.get(text(l.projektId))!;
        const abschnittId = idOderNull(l.abschnittId);
        return {
          id: text(l.id) || zufallsId('le'),
          projektId: projekt.id,
          mitarbeiterId: text(l.mitarbeiterId),
          datum: l.datum as string,
          text: text(l.text),
          stunden: stunden(l.stunden),
          abschnittId:
            abschnittId && abschnittId !== OHNE_ABSCHNITT && projekt.abschnitte.some((a) => a.id === abschnittId)
              ? abschnittId
              : null,
          projektelement: text(l.projektelement),
          quelle: l.quelle === 'import' ? 'import' : 'manuell',
          erfasst: text(l.erfasst),
          ...(text(l.geaendert) ? { geaendert: text(l.geaendert) } : {}),
        };
      }),
  );

  const nachweise = eindeutig(
    liste(roh.nachweise)
      .filter((n) => projektVon.has(text(n.projektId)) && istDatum(n.von) && istDatum(n.bis))
      .map((n): Leistungsnachweis => {
        const projekt = projektVon.get(text(n.projektId))!;
        const [von, bis] = [n.von as string, n.bis as string].sort();
        const status = n.status === 'abgeschlossen' ? 'abgeschlossen' : 'entwurf';
        const geaendert = text(n.geaendert) || text(n.erstellt) || new Date().toISOString();
        return {
          id: text(n.id) || zufallsId('ln'),
          projektId: projekt.id,
          titel: text(n.titel),
          von,
          bis,
          bisFest: n.bisFest === true,
          raster: auswahl(n.raster, RASTER, projekt.raster),
          status,
          texte: texteAufbereiten(n.texte),
          aufschlaege: ohneNull(zahlen(n.aufschlaege)),
          gesamtAufschlag: gesamtAufschlagAufbereiten(n.gesamtAufschlag),
          bemerkung: text(n.bemerkung),
          nachgereicht: [...new Set(ids(n.nachgereicht))],
          erstellt: text(n.erstellt) || geaendert,
          geaendert,
          abgeschlossen: status === 'abgeschlossen' ? text(n.abgeschlossen) || null : null,
          stand: status === 'abgeschlossen' ? standAufbereiten(n.stand) : null,
        };
      }),
  );

  const mitarbeiterIds = new Set(mitarbeiter.map((m) => m.id));
  const textSchluessel = new Set<string>();
  const periodentexte = liste(roh.periodentexte)
    .filter((t) => projektVon.has(text(t.projektId)) && !!erfassungsPeriodeAusSchluessel(text(t.schluessel)) && text(t.text).trim())
    .map(
      (t): Periodentext => ({
        projektId: text(t.projektId),
        schluessel: text(t.schluessel),
        text: text(t.text).trim(),
        leistungIds: [...new Set(ids(t.leistungIds))],
        ...(Array.isArray(t.inhalte) ? { inhalte: [...new Set(t.inhalte.map(text).filter(Boolean))] } : {}),
        bearbeiter: text(t.bearbeiter),
        geaendert: text(t.geaendert),
      }),
    )
    .filter((t) => {
      const k = `${t.projektId}\u0000${t.schluessel}`;
      return textSchluessel.has(k) ? false : (textSchluessel.add(k), true);
    });
  const bestaetigungsSchluessel = new Set<string>();
  const bestaetigungen = liste(roh.bestaetigungen)
    .filter((b) => projektVon.has(text(b.projektId)) && mitarbeiterIds.has(text(b.mitarbeiterId)) && istMonat(b.monat))
    .map(
      (b): Bestaetigung => ({
        projektId: text(b.projektId),
        mitarbeiterId: text(b.mitarbeiterId),
        monat: text(b.monat),
        am: text(b.am),
        perioden: texteJeSchluessel(b.perioden),
      }),
    )
    .filter((b) => {
      const k = `${b.projektId}\u0000${b.mitarbeiterId}\u0000${b.monat}`;
      return bestaetigungsSchluessel.has(k) ? false : (bestaetigungsSchluessel.add(k), true);
    });

  const mitarbeiterId = idOderNull(e.mitarbeiterId);
  return {
    version: DATEN_VERSION,
    einstellungen: {
      bearbeiter: text(e.bearbeiter).trim() || STANDARD_BEARBEITER,
      mitarbeiterId: mitarbeiterId && mitarbeiter.some((m) => m.id === mitarbeiterId) ? mitarbeiterId : null,
      farbmodus: e.farbmodus === 'kontrast' ? 'kontrast' : 'standard',
    },
    mitarbeiter,
    projekte,
    leistungen,
    nachweise,
    periodentexte,
    bestaetigungen,
  };
}

/**
 * Fassung 1 → 2: Nachweise erhalten leere Aufschläge, festgeschriebene Stände
 * abgerechnet = erfasst. (Die Rolle Controlling der Fassung 2 entfällt mit
 * Fassung 3 – `aufbereiten` übernimmt sie nicht.)
 */
function vonFassung1(roh: Roh): Roh {
  const zeileV2 = (z: Roh): Roh => ({
    ...z,
    aufschlag: 0,
    aufschlagJeAbschnitt: {},
    abgerechnet: stunden(z.stunden),
    abgerechnetJeAbschnitt: { ...zahlen(z.stundenJeAbschnitt) },
  });
  return {
    ...roh,
    nachweise: liste(roh.nachweise).map((n) => {
      const stand = objekt(n.stand);
      return {
        ...n,
        aufschlaege: {},
        stand: stand
          ? { ...stand, zeilen: liste(stand.zeilen).map(zeileV2), abgerechnet: stunden(stand.stunden) }
          : n.stand,
      };
    }),
  };
}

/**
 * Fassung 6 → 7: gemeinsame Leistungstexte je Zeitraum und
 * Monatsbestätigungen – bisher gab es keine, beide Listen beginnen leer.
 */
function vonFassung6(roh: Roh): Roh {
  return { ...roh, periodentexte: [], bestaetigungen: [] };
}

/**
 * Fassung 8 → 9: Ohne Abrechnungsrhythmus läuft je Projekt ein Nachweis, bis
 * das Controlling ihn erstellt. Aufeinanderfolgende offene Nachweise ohne
 * festgelegtes Ende (etwa je Monat bzw. Block der Regeln „Monatlich“, „Alle 2
 * Monate“, „Alle 3 Monate“) gehen im ersten auf – mit Texten, Aufschlägen,
 * Bemerkungen und nachgereichten Leistungen (`laufendeZusammenfuehren`);
 * abgeschlossene Nachweise und solche mit festgelegtem Ende (`bisFest`)
 * bleiben. Fallen dabei Grenzen der Nachweise weg, ziehen die gemeinsamen
 * Texte und die Bestätigungen mit wie nach jeder Änderung im Store
 * (`periodentexteNachziehen`, `bestaetigungenNachziehen`). Läuft nach
 * `aufbereiten` – auf einem vollständigen Bestand (Projekte ohne
 * `zeitraumregel` und `rhythmusAb`, Nachweise mit `gesamtAufschlag` null).
 */
function vonFassung8(daten: LeistungsnachweisDaten): LeistungsnachweisDaten {
  const zusammen = laufendeZusammenfuehren(daten);
  if (zusammen === daten) return daten;
  return bestaetigungenNachziehen(daten, zusammen, periodentexteNachziehen(daten, zusammen));
}

/**
 * Hebt einen älteren Stand auf die aktuelle Fassung – in einem Aufruf, Schritt
 * für Schritt; Schritte auf dem rohen Stand kommen vor `aufbereiten`, solche,
 * die mit den Funktionen der Domäne rechnen, danach. Auch Sicherungen älterer
 * Fassungen laufen hierdurch. Fassung 3 → 4 (Zeitraumregel „fortlaufend“ für
 * alle Projekte) ist mit Fassung 9 entfallen – den Rhythmus gibt es nicht
 * mehr; 4 → 5: `nachgereicht` ergänzt `aufbereiten` leer; 5 → 6: `bisFest`
 * ergänzt `aufbereiten` mit false, Zeilen nachgereichter Leistungen erhalten
 * ihren eigenen Schlüssel – in Texten, Aufschlägen und im festgeschriebenen
 * Stand; Aufschläge einer Zeile mit laufenden und nachgereichten Leistungen
 * werden auf beide aufgeteilt, ohne die abgerechneten Stunden zu ändern – mit
 * Abschnittsspalten auch nicht die einer Spalte (`nachgereichteZeilenUmstellen`,
 * nach `aufbereiten`); 6 → 7: leere Listen `periodentexte` und
 * `bestaetigungen` (`vonFassung6`); 7 → 8: nichts umzurechnen; 8 → 9:
 * `zeitraumregel` und `rhythmusAb` übernimmt `aufbereiten` nicht mehr,
 * `gesamtAufschlag` ergänzt es mit null, laufende Nachweise führt
 * `vonFassung8` zusammen (nach `nachgereichteZeilenUmstellen`, das die
 * Zeilen der bisherigen Nachweise braucht).
 */
function migriere(roh: Partial<LeistungsnachweisDaten>): LeistungsnachweisDaten {
  let stand = roh as unknown as Roh;
  const fassung = typeof stand.version === 'number' ? stand.version : 0;
  if (fassung < 2) stand = vonFassung1(stand);
  if (fassung < 7) stand = vonFassung6(stand);
  let daten = aufbereiten(stand as Partial<LeistungsnachweisDaten>);
  if (fassung < 6) daten = nachgereichteZeilenUmstellen(daten);
  if (fassung < 9) daten = vonFassung8(daten);
  return daten;
}

/** Lädt den Bestand; ohne gespeicherten Stand die Demodaten. */
export function ladeDaten(): Geladen {
  const demo = (zustand: LadeZustand): Geladen => ({ daten: seedDaten(), zustand });
  let roh: string | null;
  try {
    roh = localStorage.getItem(KEY);
  } catch {
    return demo('ladefehler');
  }
  if (!roh) {
    // Andere Bereiche sind schon in Gebrauch: ohne Beispielprojekte beginnen
    if (registerLesen().projekte.length > 0) return { daten: aufbereiten({ projekte: [] }), zustand: 'ok' };
    return demo('ok');
  }
  let daten: Partial<LeistungsnachweisDaten>;
  try {
    daten = JSON.parse(roh) as Partial<LeistungsnachweisDaten>;
  } catch {
    return demo('ladefehler');
  }
  if (!daten || typeof daten !== 'object' || !Array.isArray(daten.projekte)) return demo('ladefehler');
  if (typeof daten.version === 'number' && daten.version > DATEN_VERSION) return demo('neuere_fassung');
  // Vor einer Umstellung den gespeicherten Text einmalig sichern – scheitert das, wird trotzdem umgestellt
  if ((daten.version ?? 0) < DATEN_VERSION) {
    try {
      const schluessel = `${VOR_FASSUNG}${daten.version ?? 0}`;
      if (localStorage.getItem(schluessel) === null) localStorage.setItem(schluessel, roh);
    } catch {
      /* kein Platz für die Kopie – der Stand lässt sich weiterhin herunterladen */
    }
  }
  try {
    return { daten: daten.version === DATEN_VERSION ? aufbereiten(daten) : migriere(daten), zustand: 'ok' };
  } catch {
    return demo('ladefehler');
  }
}

/** Schlüssel des Bestands – der Store hört auf `storage`-Ereignisse anderer Fenster dafür. */
export const SPEICHER_SCHLUESSEL = KEY;

/** Ergebnis des Speicherns: gespeichert, Speicher voll oder Speicher nicht nutzbar (gesperrt). */
export type SpeicherZustand = 'ok' | 'voll' | 'gesperrt';

/**
 * Speichert den Bestand; der Store ruft das nur bei `ladeZustand === 'ok'`
 * auf. Ist der Speicher voll, macht `nachRaeumenSpeichern`
 * (src/shared/speicher.ts) nach und nach Platz, indem es Rohkopien
 * (`<Schlüssel>.vor-fassung-<n>`, `.vor-einspielen-…` – auch anderer
 * Bereiche) entfernt, und stellt sie zurück, wenn es nicht reicht.
 * Liefert, ob der Bestand gespeichert ist bzw. warum nicht – dann zeigt der
 * Bereich einen dauerhaften Hinweis (components/SpeicherHinweis.tsx).
 */
export function speichereDaten(daten: LeistungsnachweisDaten): SpeicherZustand {
  const inhalt = JSON.stringify(daten);
  try {
    localStorage.setItem(KEY, inhalt);
    return 'ok';
  } catch (err) {
    if (!speicherVoll(err)) {
      console.warn('Daten konnten nicht lokal gespeichert werden:', err);
      return 'gesperrt';
    }
  }
  try {
    return nachRaeumenSpeichern(KEY, inhalt) ? 'ok' : 'voll';
  } catch (err) {
    console.warn('Daten konnten nicht lokal gespeichert werden:', err);
    return speicherVoll(err) ? 'voll' : 'gesperrt';
  }
}

function herunterladen(inhalt: string, dateiname: string): void {
  const blob = new Blob([inhalt], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = dateiname;
  a.click();
  URL.revokeObjectURL(url);
}

/** Lädt den gesamten Bestand des Bereichs als JSON-Datei herunter. */
export function exportiereDaten(daten: LeistungsnachweisDaten): void {
  herunterladen(JSON.stringify({ bereich: SICHERUNG_BEREICH, ...daten }, null, 2), `leistungsnachweise-sicherung-${today()}.json`);
}

/**
 * Lädt den gespeicherten Stand unverändert herunter – für den Hinweis nach
 * einem Ladefehler oder bei einer neueren Fassung, wenn der Bereich Demodaten
 * zeigt. false, wenn kein Stand gespeichert ist.
 */
export function rohdatenHerunterladen(): boolean {
  let roh: string | null = null;
  try {
    roh = localStorage.getItem(KEY);
  } catch {
    return false;
  }
  if (roh === null) return false;
  herunterladen(roh, `leistungsnachweise-gespeicherter-stand-${today()}.json`);
  return true;
}

/**
 * Liest eine Sicherung und hebt sie auf die aktuelle Fassung. Wirft einen
 * Fehler mit verständlicher Meldung, wenn die Datei nicht passt – auch bei
 * Sicherungen der anderen Bereiche.
 */
export function sicherungLesen(inhalt: string): LeistungsnachweisDaten {
  let roh: unknown;
  try {
    roh = JSON.parse(inhalt);
  } catch {
    throw new Error('Die Datei ist keine gültige JSON-Datei.');
  }
  if (!roh || typeof roh !== 'object') throw new Error('Die Datei enthält keine Sicherung.');
  const daten = roh as Partial<LeistungsnachweisDaten> & { bereich?: unknown; projects?: unknown };
  if (Array.isArray(daten.projects)) {
    throw new Error('Die Datei ist eine Sicherung des Planlaufmanagements – bitte dort einspielen.');
  }
  if (daten.bereich === 'baubetrieb') {
    throw new Error('Die Datei ist eine Sicherung der Baubetriebsplanung – bitte dort einspielen.');
  }
  if (daten.bereich === 'projektsteuerung') {
    throw new Error('Die Datei ist eine Sicherung der Projektsteuerung – bitte dort einspielen.');
  }
  if (daten.bereich !== SICHERUNG_BEREICH || !Array.isArray(daten.projekte) || !Array.isArray(daten.leistungen)) {
    throw new Error('Die Datei ist keine Sicherung der Leistungsnachweise.');
  }
  if (typeof daten.version === 'number' && daten.version > DATEN_VERSION) {
    throw new Error(
      'Die Sicherung stammt aus einer neueren Fassung von KaPlan. Bitte die Seite neu laden (Strg+Umschalt+R) und erneut einspielen.',
    );
  }
  return migriere(daten);
}
