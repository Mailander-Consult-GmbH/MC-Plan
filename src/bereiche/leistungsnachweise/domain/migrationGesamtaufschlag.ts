/**
 * Fassung 9 → 10 (`migriere` in store/storage.ts): Einen Aufschlag auf den
 * ganzen Nachweis (Gesamtaufschlag, ± Stunden oder ± Prozent) gibt es nicht
 * mehr – das Controlling schlägt je Zeile auf. Den Gesamtaufschlag eines
 * Stands der Fassung 9 rechnet `gesamtAufschlaegeUmrechnen` in Aufschläge je
 * Zeile um (`Leistungsnachweis.aufschlaege`), sodass jede Zeile – mit
 * Abschnittsspalten auch jede Spalte – genau die abgerechneten Stunden behält,
 * die sie mit ihm hatte. Den gespeicherten Stand liest store/storage.ts
 * (`AlterGesamtaufschlag`); hier wird nur gerechnet, rein.
 *
 * Die Verteilung der Fassung 9 (dort `gesamtAufschlagVerteilen` in
 * domain/nachweis.ts) lebt hier allein für diese Umstellung weiter
 * (`anteileVerteilen`).
 */
import { mitAbschnittsspalten, nachweisZeilen } from './nachweis';
import {
  OHNE_ABSCHNITT,
  aufschlagSchluessel,
  type Abschnitt,
  type ID,
  type Leistungsnachweis,
  type LeistungsnachweisDaten,
  type NachweisZeile,
} from './types';
import { runden } from './zeitraum';

/** Anteil einer Zeile am Gesamtaufschlag (± Stunden), wie ihn Fassung 9 verteilte. */
export interface ZeilenAnteil {
  /** Schlüssel der Zeile (`NachweisZeile.schluessel`). */
  schluessel: string;
  /** Anteil der ganzen Zeile. */
  anteil: number;
  /** Derselbe Anteil je Spalte (Schlüssel wie `abgerechnetJeAbschnitt`); nur Einträge ≠ 0. */
  jeAbschnitt: Record<string, number>;
}

/** Gesamtaufschlag eines Nachweises der Fassung 9 (`gesamtAufschlag`), wie store/storage.ts ihn liest. */
export interface AlterGesamtaufschlag {
  art: 'stunden' | 'prozent';
  /** Stunden bzw. Prozent, auf zwei Nachkommastellen, ≠ 0. */
  wert: number;
  /**
   * Abgeschlossener Nachweis mit festgeschriebenem Stand: die Anteile seiner
   * Zeilen daran (`anteilGesamt`, `anteilGesamtJeAbschnitt` der Fassung 9);
   * sonst null.
   */
  stand: ZeilenAnteil[] | null;
}

/** Stunden in Hundertstel als ganze Zahl – zum Verteilen ohne Rundungsfehler. */
const hundertstel = (stunden: number) => Math.round(runden(stunden) * 100);

/**
 * Verteilt `betrag` Hundertstel anteilig nach `basen` (Hundertstel, ≥ 0): je
 * Basis der abgerundete Anteil, die übrigen Hundertstel nach dem größten Rest
 * (bei gleichem Rest zuerst die größere Basis, dann die frühere) – die Summe
 * stimmt genau. Übersteigt der Betrag die Summe der Basen nicht, ist kein
 * Anteil dem Betrag nach größer als seine Basis. Ohne Basis (Summe 0) alles 0.
 */
function anteiligVerteilen(betrag: number, basen: number[]): number[] {
  const werte = basen.map((b) => (b > 0 ? b : 0));
  const summe = werte.reduce((s, b) => s + b, 0);
  if (summe <= 0 || betrag === 0) return werte.map(() => 0);
  const ziel = Math.abs(betrag);
  // Ganzzahlig: Produkt, Rest und Quotient sind exakt
  const teile = werte.map((b, i) => {
    const produkt = b * ziel;
    const rest = produkt % summe;
    return { i, b, anteil: (produkt - rest) / summe, rest };
  });
  let offen = ziel - teile.reduce((s, t) => s + t.anteil, 0);
  for (const t of [...teile].sort((x, y) => y.rest - x.rest || y.b - x.b || x.i - y.i)) {
    if (offen <= 0) break;
    t.anteil += 1;
    offen -= 1;
  }
  return teile.map((t) => (t.anteil === 0 ? 0 : betrag < 0 ? -t.anteil : t.anteil));
}

/**
 * Anteile der Zeilen am Gesamtaufschlag `ga` – gerechnet wie in Fassung 9:
 * Basis je Zeile sind ihre abgerechneten Stunden nach den Aufschlägen der
 * Zeilen (`nachweisZeilen`); der Betrag (± Stunden bzw. ± Prozent der Summe
 * der Basen, auf 0,01 Std.) geht im Verhältnis der Basen an die Zeilen, die
 * Reste nach dem größten Rest (`anteiligVerteilen`), innerhalb der Zeile ebenso
 * je Spalte im Verhältnis von `abgerechnetJeAbschnitt`. Ein Abzug wirkt
 * höchstens bis 0 Std.; ohne Basis wirkt er nicht. Nur Zeilen mit Anteil.
 */
function anteileVerteilen(zeilen: NachweisZeile[], ga: Pick<AlterGesamtaufschlag, 'art' | 'wert'>): ZeilenAnteil[] {
  const basen = zeilen.map((z) => hundertstel(z.abgerechnet));
  const summe = basen.reduce((s, b) => s + (b > 0 ? b : 0), 0);
  if (summe <= 0) return [];
  const soll = runden(ga.art === 'prozent' ? ((summe / 100) * ga.wert) / 100 : ga.wert);
  // Nie unter 0: höchstens die Summe der Basen abziehen
  const anteile = anteiligVerteilen(Math.max(hundertstel(soll), -summe), basen);
  return zeilen.flatMap((z, i): ZeilenAnteil[] => {
    if (anteile[i] === 0) return [];
    const spalten = Object.keys(z.abgerechnetJeAbschnitt);
    const jeSpalte = anteiligVerteilen(
      anteile[i],
      spalten.map((k) => hundertstel(z.abgerechnetJeAbschnitt[k])),
    );
    const jeAbschnitt: Record<string, number> = {};
    spalten.forEach((k, j) => {
      if (jeSpalte[j] !== 0) jeAbschnitt[k] = runden(jeSpalte[j] / 100);
    });
    return [{ schluessel: z.schluessel, anteil: runden(anteile[i] / 100), jeAbschnitt }];
  });
}

/**
 * Schlägt die Anteile auf die Aufschläge der Zeilen auf. Mit Abschnittsspalten
 * (`mitAbschnittsspalten`) je Spalte – auf den Abschnitt bzw. auf „ohne“
 * (`OHNE_ABSCHNITT`; ein Abschnitt, den es im Projekt nicht mehr gibt, zählt
 * wie „ohne“) –, sonst auf die ganze Zeile. Das ergibt dieselben abgerechneten
 * Stunden wie der Gesamtaufschlag (`abrechnen` in domain/nachweis.ts): Ein
 * Anteil trifft nur Spalten mit abgerechneten Stunden und mindert sie
 * höchstens auf 0, also wirkt er in seiner Spalte ganz und schiebt nichts in
 * andere; ein Abzug auf „ohne“ mindert zuerst „ohne“ – um nicht mehr, als dort
 * abgerechnet war. Ohne Abschnittsspalten stimmt die Zeile; in einem Projekt
 * mit einem Abschnitt kann sich darin die Aufteilung auf Abschnitt und „ohne“
 * verschieben – gezeigt wird sie ohne Abschnittsspalten nirgends.
 */
function anteileAufschlagen(
  aufschlaege: Record<string, number>,
  anteile: ZeilenAnteil[],
  abschnitte: Pick<Abschnitt, 'id'>[],
): Record<string, number> {
  const spalten = mitAbschnittsspalten(abschnitte);
  const abschnittIds = new Set(abschnitte.map((a) => a.id));
  const ergebnis = { ...aufschlaege };
  const dazu = (zeile: string, spalte: string, stunden: number) => {
    const k = aufschlagSchluessel(zeile, spalte === OHNE_ABSCHNITT || !abschnittIds.has(spalte) ? null : spalte);
    const wert = runden((ergebnis[k] ?? 0) + stunden);
    if (wert === 0) delete ergebnis[k];
    else ergebnis[k] = wert;
  };
  for (const a of anteile) {
    const jeSpalte = Object.entries(a.jeAbschnitt).filter(([, v]) => runden(v) !== 0);
    if (spalten && jeSpalte.length > 0) for (const [k, v] of jeSpalte) dazu(a.schluessel, k, v);
    else if (runden(a.anteil) !== 0) dazu(a.schluessel, OHNE_ABSCHNITT, a.anteil);
  }
  return ergebnis;
}

const gleicheEintraege = (a: Record<string, number>, b: Record<string, number>) => {
  const ka = Object.keys(a);
  return ka.length === Object.keys(b).length && ka.every((k) => k in b && a[k] === b[k]);
};

/**
 * Fassung 9 → 10: Gesamtaufschläge (`alt`, je Kennung des Nachweises) als
 * Aufschläge je Zeile. Offene Nachweise – und abgeschlossene ohne
 * festgeschriebenen Stand – verteilen ihn wie bisher über ihre heutigen Zeilen
 * (`anteileVerteilen`); abgeschlossene übernehmen die Anteile aus ihrem Stand
 * (`AlterGesamtaufschlag.stand`), damit „Wieder öffnen“ dieselben Stunden
 * ergibt wie der Stand. Der Stand selbst bleibt, wie er ist – seine Zeilen
 * enthalten den Anteil schon in `aufschlag` und `abgerechnet`. Die Anteile kommen
 * zu den vorhandenen Aufschlägen der Zeilen hinzu (`anteileAufschlagen`).
 * `geaendert` bleibt. Rein; ohne Änderung derselbe Bestand.
 */
export function gesamtAufschlaegeUmrechnen(
  daten: LeistungsnachweisDaten,
  alt: ReadonlyMap<ID, AlterGesamtaufschlag>,
): LeistungsnachweisDaten {
  if (alt.size === 0) return daten;
  let geaendert = false;
  const nachweise = daten.nachweise.map((n): Leistungsnachweis => {
    const ga = alt.get(n.id);
    if (!ga) return n;
    const projekt = daten.projekte.find((p) => p.id === n.projektId);
    const anteile = n.status === 'abgeschlossen' && n.stand && ga.stand ? ga.stand : anteileVerteilen(nachweisZeilen(daten, n), ga);
    const aufschlaege = anteileAufschlagen(n.aufschlaege, anteile, projekt?.abschnitte ?? []);
    if (gleicheEintraege(aufschlaege, n.aufschlaege)) return n;
    geaendert = true;
    return { ...n, aufschlaege };
  });
  return geaendert ? { ...daten, nachweise } : daten;
}
