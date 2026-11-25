/**
 * Ablaufdiagramm eines Workflows für die Druckfassung – etwa für die Anlage
 * „Planläufe und Ablaufdiagramme“ des Pflichtenhefts. Reine Funktion ohne
 * Oberfläche: Sie liefert das Bild als SVG-Zeichenkette für ein HTML-Dokument,
 * das über `druckeHtml` (shared/print.ts) gedruckt wird.
 *
 * Aufbau nach dem Vorbild der Muster-Anlagen, von links nach rechts:
 *  - die Spalte „Frist“ mit der Frist je Zeile des Standardverlaufs (ein
 *    Schritt, zwei Schritte nebeneinander: Summe, paralleler Block: sein
 *    längster Zweig; 0 bleibt leer) – zusammen die Gesamtdauer,
 *  - die **Abweichungen** (Schritte, die nur über eine andere Antwort erreicht
 *    werden, etwa „Rückmeldung an Planer“) auf Höhe der Stelle, von der sie
 *    abzweigen,
 *  - in der Mitte die Schritte der Projektbeteiligten als Kasten
 *    „Funktion: Schritt“, rechts die Spalte „Planlaufmanagement“ mit den
 *    eigenen Schritten (Funktion Planlaufmanagement bzw. Kürzel PLM, zart
 *    blau, ohne Funktion davor). Jede Stelle des Standardverlaufs hat eine
 *    eigene Zeile, so bleibt die andere Spalte daneben frei für die seitlichen
 *    Wege. Nur wenn auf einen Schritt der Beteiligten einer des
 *    Planlaufmanagements folgt, stehen beide in einer Zeile (wie in den
 *    Muster-Anlagen, siehe `zeilen` unten),
 *  - parallele Blöcke über Mitte und rechter Spalte mit ihren Zweigen
 *    nebeneinander (Block- und Zweignamen, falls vorhanden); Abweichungen im
 *    Zweig stehen rechts neben dessen Standardweg, Übergänge aus dem Block
 *    hinaus als Hinweis im Kasten („Nein → Rückmeldung an Planer“),
 *  - Entscheidungen als Sechseck, die Antworten an den ausgehenden Pfeilen;
 *    der Standardverlauf ist durchgezogen, Abweichungen und Rücksprünge sind
 *    gestrichelt und laufen auf eigenen senkrechten Bahnen,
 *  - unten die Gesamtdauer im Standardverlauf und eine Legende.
 * Wo die Spalte „Frist“ den einzelnen Schritt nicht zeigt (Abweichungen,
 * Zweige, zwei Schritte in einer Zeile), steht seine Frist als Marke am
 * Kasten. Nicht erreichbare Schritte erscheinen nicht.
 *
 * Gliederung, Ziele und Kanten stammen allein aus workflowGraph.ts
 * (`gliedern`, `dauerImStandardverlauf`); hier wird nur angeordnet und
 * gezeichnet. Die Gestaltung ist die eines Druckdokuments (feste helle Farben,
 * Helvetica/Arial) und gehört nicht zum Koralle-Design der Oberfläche.
 *
 * **Größe:** Gerechnet wird in Einheiten (Schrift 10). `width`/`height` in mm
 * passen das Bild ganz in DIAGRAMM_BREITE_MM × DIAGRAMM_HOEHE_MM ein (A4 quer
 * abzüglich Rand und Überschrift), höchstens im Maßstab MASSSTAB_MAX – lange
 * Workflows werden also kleiner statt höher. Eine Seite ist bewusst die
 * Grenze: Chrome rückt ein zu hohes SVG beim Drucken als Ganzes auf die
 * nächste Seite und schneidet es dort ab. Wer es anders will, setzt Breite und
 * Höhe per CSS (`style="max-width:100%;height:auto"` steht schon am Element,
 * das Seitenverhältnis folgt der viewBox).
 */
import { html } from '../../../shared/print';
import { blockTitel } from './ablauf';
import { EIGENE_ROLLE, type ID, type ProcessTemplateStep } from './types';
import {
  dauerImStandardverlauf,
  gliedern,
  istBlockAnzeige,
  type Anzeige,
  type BlockGliederung,
  type Gliederung,
  type Kante,
} from './workflowGraph';

/** Platz für das Bild auf einer Seite A4 quer (druckbarer Bereich 273 × 182 mm, abzüglich Überschrift). */
export const DIAGRAMM_BREITE_MM = 273;
export const DIAGRAMM_HOEHE_MM = 165;
/** Größter Maßstab in mm je Einheit: Schrift 10 → 3 mm (gut 8 pt). */
const MASSSTAB_MAX = 0.3;

/* ------------------------------------------------------------------ */
/* Maße und Farben                                                     */
/* ------------------------------------------------------------------ */

/** Schriftgrößen und Zeilenhöhen in Einheiten. */
const S = { text: 10, zeile: 12.5, klein: 8, hinweis: 7.5, zeileKlein: 9.5, kopf: 9, marke: 7 };

const M = {
  rand: 14,
  fristB: 46,
  abwB: 190,
  mitteB: 230,
  plmB: 210,
  spaltenAbstand: 40,
  zweigB: 160,
  zweigAbstand: 16,
  padX: 8,
  padY: 6,
  minH: 26,
  /** Mindestabstand zweier Anschlüsse an einer Kastenseite. */
  portAbstand: 11,
  /** Senkrechter Abstand zweier Stellen des Standardverlaufs. */
  zeilenAbstand: 16,
  /** Senkrechter Abstand gestapelter Kästen (Abweichungen, Zweige). */
  stapelAbstand: 20,
  /** Ebenso in den Zweigen eines Blocks. */
  zweigStapel: 16,
  /** Abstand zweier senkrechter Bahnen. */
  spur: 9,
  /** Einzug der Spitzen einer Entscheidung (Sechseck). */
  raute: 9,
  blockPad: 8,
  spitze: 6,
};

const FARBE = {
  text: '#1d1d1f',
  grau: '#6e6e73',
  hell: '#8e8e93',
  linie: '#4a4a4f',
  abw: '#8e8e93',
  kastenRand: '#a1a1a6',
  plm: '#e8eef6',
  plmRand: '#24456e',
  band: '#f4f7fb',
  block: '#f8f8fa',
  blockRand: '#c7c7cc',
  balken: '#3a3a3c',
  kopfLinie: '#d1d1d6',
};

/* ------------------------------------------------------------------ */
/* Text: Breite schätzen, umbrechen, ausgeben                          */
/* ------------------------------------------------------------------ */

/** Zeichenbreiten von Helvetica/Arial in 1/1000 der Schriftgröße. */
const ZEICHEN: [string, number][] = [
  ["'", 191],
  ['ijl', 222],
  ['|', 260],
  [' !,./:;I[\\]ft·', 278],
  ['()-`r„“”‚‘’', 333],
  ['"', 355],
  ['*', 389],
  ['^', 469],
  ['Jcksvxyz', 500],
  ['0123456789abdeghnopqu#$_?Läöü–', 556],
  ['+<=>~', 584],
  ['FTZß', 611],
  ['ABEKPSVXYÄ', 667],
  ['CDHNRUwÜ', 722],
  ['GOQÖ', 778],
  ['Mm', 833],
  ['%', 889],
  ['W', 944],
  ['—…→', 1000],
  ['@', 1015],
];
const ZEICHEN_BREITE = new Map<string, number>(ZEICHEN.flatMap(([zeichen, b]) => [...zeichen].map((c): [string, number] => [c, b])));

/** Geschätzte Breite eines Textes in Einheiten. */
function textBreite(text: string, groesse: number, fett = false): number {
  let summe = 0;
  for (const c of text) summe += ZEICHEN_BREITE.get(c) ?? 556;
  return (summe / 1000) * groesse * (fett ? 1.08 : 1);
}

/** Ein Wort im Kasten; `anschluss` = ohne Leerzeichen davor (Teil nach einem Bindestrich). */
interface Wort {
  text: string;
  fett: boolean;
  anschluss: boolean;
}

/** Zerlegt einen Text in Wörter; nach einem Bindestrich darf umbrochen werden („BVB-|Freigabe“). */
function woerter(text: string, fett: boolean): Wort[] {
  const ergebnis: Wort[] = [];
  for (const teil of text.split(/\s+/).filter(Boolean)) {
    let start = 0;
    for (let i = 1; i < teil.length - 1; i++) {
      if (teil[i] === '-' && teil[i + 1] !== '-') {
        ergebnis.push({ text: teil.slice(start, i + 1), fett, anschluss: start > 0 });
        start = i + 1;
      }
    }
    ergebnis.push({ text: teil.slice(start), fett, anschluss: start > 0 });
  }
  return ergebnis;
}

/** Teilt ein Wort, das allein breiter ist als die Zeile, hart auf. */
function zuLangTeilen(w: Wort, breite: number, groesse: number): Wort[] {
  if (textBreite(w.text, groesse, w.fett) <= breite) return [w];
  const teile: Wort[] = [];
  let rest = w.text;
  while (rest) {
    let n = rest.length;
    while (n > 1 && textBreite(rest.slice(0, n), groesse, w.fett) > breite) n--;
    teile.push({ text: rest.slice(0, n), fett: w.fett, anschluss: teile.length > 0 || w.anschluss });
    rest = rest.slice(n);
  }
  return teile;
}

/** Bricht Wörter in Zeilen der angegebenen Breite um (mit etwas Reserve für die Schätzung). */
function umbrechen(liste: Wort[], breite: number, groesse: number): Wort[][] {
  const grenze = breite * 0.94;
  const leer = textBreite(' ', groesse);
  const zeilen: Wort[][] = [];
  let zeile: Wort[] = [];
  let belegt = 0;
  for (const w of liste.flatMap((w) => zuLangTeilen(w, grenze, groesse))) {
    const b = textBreite(w.text, groesse, w.fett);
    const zusatz = zeile.length > 0 && !w.anschluss ? leer : 0;
    if (zeile.length > 0 && belegt + zusatz + b > grenze) {
      zeilen.push(zeile);
      zeile = [{ ...w, anschluss: false }];
      belegt = b;
    } else {
      zeile.push(w);
      belegt += zusatz + b;
    }
  }
  if (zeile.length > 0) zeilen.push(zeile);
  return zeilen;
}

/** Eine Zeile als Inhalt eines `<text>`: fette Wörter als `<tspan>`, alles maskiert. */
function zeileSvg(zeile: Wort[]): string {
  return zeile
    .map((w, i) => (i > 0 && !w.anschluss ? ' ' : '') + (w.fett ? `<tspan font-weight="bold">${html(w.text)}</tspan>` : html(w.text)))
    .join('');
}

/** Zahl für SVG-Attribute (eine Nachkommastelle). */
const z = (n: number) => String(Math.round(n * 10) / 10);

interface TextArt {
  groesse?: number;
  farbe?: string;
  anker?: 'start' | 'middle' | 'end';
  fett?: boolean;
  kursiv?: boolean;
  /** Weißer Saum, damit die Schrift über Linien lesbar bleibt. */
  saum?: boolean;
}

/** `<text>` mit bereits maskiertem Inhalt. */
function textSvg(x: number, y: number, inhalt: string, art: TextArt = {}): string {
  const a = [
    `x="${z(x)}"`,
    `y="${z(y)}"`,
    `font-size="${art.groesse ?? S.text}"`,
    `fill="${art.farbe ?? FARBE.text}"`,
    art.anker && art.anker !== 'start' ? `text-anchor="${art.anker}"` : '',
    art.fett ? 'font-weight="bold"' : '',
    art.kursiv ? 'font-style="italic"' : '',
    art.saum ? 'stroke="#ffffff" stroke-width="3" stroke-linejoin="round" paint-order="stroke"' : '',
  ].filter(Boolean);
  return `<text ${a.join(' ')}>${inhalt}</text>`;
}

/* ------------------------------------------------------------------ */
/* Linien und Pfeile                                                   */
/* ------------------------------------------------------------------ */

type Punkt = [number, number];

function ohneDoppelte(punkte: Punkt[]): Punkt[] {
  return punkte.filter((p, i) => i === 0 || Math.hypot(p[0] - punkte[i - 1][0], p[1] - punkte[i - 1][1]) > 0.01);
}

/** Pfad durch die Punkte mit leicht gerundeten Ecken. */
function pfad(punkte: Punkt[], radius = 3.5): string {
  let d = `M ${z(punkte[0][0])} ${z(punkte[0][1])}`;
  for (let i = 1; i < punkte.length - 1; i++) {
    const [x0, y0] = punkte[i - 1];
    const [x1, y1] = punkte[i];
    const [x2, y2] = punkte[i + 1];
    const l1 = Math.hypot(x1 - x0, y1 - y0);
    const l2 = Math.hypot(x2 - x1, y2 - y1);
    const r = Math.min(radius, l1 / 2, l2 / 2);
    if (r < 0.5) {
      d += ` L ${z(x1)} ${z(y1)}`;
      continue;
    }
    const ax = x1 - ((x1 - x0) / l1) * r;
    const ay = y1 - ((y1 - y0) / l1) * r;
    const bx = x1 + ((x2 - x1) / l2) * r;
    const by = y1 + ((y2 - y1) / l2) * r;
    d += ` L ${z(ax)} ${z(ay)} Q ${z(x1)} ${z(y1)} ${z(bx)} ${z(by)}`;
  }
  const [xe, ye] = punkte[punkte.length - 1];
  return `${d} L ${z(xe)} ${z(ye)}`;
}

/** Linie durch die Punkte, am Ende mit Pfeilspitze; gestrichelt für Abweichungen und Rücksprünge. */
function pfeil(roh: Punkt[], gestrichelt: boolean, spitze = true): string {
  const p = ohneDoppelte(roh);
  if (p.length < 2) return '';
  const farbe = gestrichelt ? FARBE.abw : FARBE.linie;
  const strich = gestrichelt ? ' stroke-dasharray="4 2.5"' : '';
  if (!spitze) return `<path d="${pfad(p)}" fill="none" stroke="${farbe}" stroke-width="1"${strich}/>`;
  const [xe, ye] = p[p.length - 1];
  const [xv, yv] = p[p.length - 2];
  const l = Math.hypot(xe - xv, ye - yv);
  const ux = (xe - xv) / l;
  const uy = (ye - yv) / l;
  const kuerzung = Math.min(M.spitze - 1, l - 0.5);
  const linie: Punkt[] = [...p.slice(0, -1), [xe - ux * kuerzung, ye - uy * kuerzung]];
  const bx = xe - ux * M.spitze;
  const by = ye - uy * M.spitze;
  const nx = -uy * 3.2;
  const ny = ux * 3.2;
  return (
    `<path d="${pfad(linie)}" fill="none" stroke="${farbe}" stroke-width="1"${strich}/>` +
    `<path d="M ${z(xe)} ${z(ye)} L ${z(bx + nx)} ${z(by + ny)} L ${z(bx - nx)} ${z(by - ny)} Z" fill="${farbe}"/>`
  );
}

/* ------------------------------------------------------------------ */
/* Kästen, Anschlüsse und Bahnen                                       */
/* ------------------------------------------------------------------ */

type Seite = 'l' | 'r';

/** Rechteck im Bild: ein Schritt oder der Rahmen eines parallelen Blocks. */
interface Rahmen {
  x: number;
  y: number;
  b: number;
  h: number;
  /** Entscheidung: Sechseck, die Seiten laufen spitz zu. */
  raute: boolean;
}

interface Kasten extends Rahmen {
  plm: boolean;
  zeilen: Wort[][];
  hinweise: Wort[][];
  /** Eigene Frist als Marke am Kasten (Abweichungen, Zweige, Zeilen mit zwei Schritten). */
  frist: string | null;
}

/** Ein Ende einer seitlichen Verbindung an einer Kastenseite. */
interface Anschluss {
  rahmen: Rahmen;
  seite: Seite;
  /** Antwort am Ausgang; null = ohne Beschriftung bzw. Eingang. */
  text: string | null;
  /** Höhe der waagerechten Linie am Kasten. */
  y: number;
  /** Höhe des anderen Endes – bestimmt die Reihenfolge an der Kastenseite. */
  gegenY: number;
  /**
   * Anschluss am Kastenboden statt an der Seite (Kasten rechts in einer Zeile
   * mit zwei Schritten, dessen linke Seite der Pfeil von links belegt): x =
   * Kasten + `versatz`, die Linie läuft in der Lücke darunter auf Höhe `y`.
   */
  boden?: { versatz: number };
}

/**
 * Verbindungen zum selben Ziel teilen sich eine senkrechte Bahn und den
 * Eingang (wie im Workflow-Editor); gerade Verbindungen brauchen keine Bahn.
 */
interface Buendel {
  ziel: Anschluss;
  quellen: Anschluss[];
  spur: number;
  gerade: boolean;
}

/**
 * Senkrechter Streifen zwischen (oder neben) Kastenspalten, in dem die Bahnen
 * liegen. Bahn 0 liegt an der Grenze `nah`.
 */
interface Bereich {
  nah: Seite;
  /** Kästen auf beiden Seiten – gerade Verbindungen sind möglich. */
  gegenueber: boolean;
  buendel: Buendel[];
  x0: number;
  x1: number;
  /** Platz für die Antworten an der linken bzw. rechten Grenze vor den Bahnen (siehe `bereichsBreite`). */
  labelL: number;
  labelR: number;
}

function neuerBereich(nah: Seite, gegenueber: boolean): Bereich {
  return { nah, gegenueber, buendel: [], x0: 0, x1: 0, labelL: 0, labelR: 0 };
}

const mitteY = (r: Rahmen) => r.y + r.h / 2;
const mitteX = (r: Rahmen) => r.x + r.b / 2;

/** x der Kastenseite in der Höhe y (beim Sechseck auf der Schräge). */
function seitenX(r: Rahmen, seite: Seite, y: number): number {
  const einzug = r.raute ? M.raute * Math.min(1, Math.abs(y - mitteY(r)) / (r.h / 2)) : 0;
  return seite === 'l' ? r.x + einzug : r.x + r.b - einzug;
}

/** Punkte vom Kasten bis zur waagerechten Linie des Anschlusses (am Boden: erst senkrecht nach unten). */
function amKasten(a: Anschluss): Punkt[] {
  if (a.boden) {
    const x = a.rahmen.x + a.boden.versatz;
    return [
      [x, a.rahmen.y + a.rahmen.h],
      [x, a.y],
    ];
  }
  return [[seitenX(a.rahmen, a.seite, a.y), a.y]];
}

/** Bereich der Höhe, über den ein Anschluss verfügt. */
const anschlussSpanne = (a: Anschluss): Spanne => (a.boden ? [a.y, a.y] : [a.rahmen.y, a.rahmen.y + a.rahmen.h]);
const anschlussMitte = (a: Anschluss) => (a.boden ? a.y : mitteY(a.rahmen));

type Spanne = [number, number];

/** Verteilt Bündel auf Bahnen: jedes auf die erste, die in seiner Spanne frei ist. */
function faerben(liste: Buendel[], spanne: (b: Buendel) => Spanne): void {
  const belegt: Spanne[][] = [];
  for (const bu of liste) {
    const [von, bis] = spanne(bu);
    let n = 0;
    while (belegt[n]?.some(([a, b]) => !(bis < a - 4 || von > b + 4))) n++;
    (belegt[n] ??= []).push([von, bis]);
    bu.spur = n;
  }
}

/**
 * Legt die Anschlüsse an die Kastenseiten und die Bündel auf Bahnen – für
 * alle Bereiche einer Ebene gemeinsam (eine Kastenseite gehört genau einem
 * Bereich). Ablauf: Bahnen grob nach den Kastenhöhen, Anschlüsse so
 * sortieren, dass sich Linien an einer Seite nicht kreuzen, gerade
 * Verbindungen ausrichten, Bahnen nach den genauen Höhen neu vergeben.
 * Anschlüsse am Kastenboden haben ihre Höhe schon.
 */
function spurenLegen(bereiche: Bereich[]): void {
  const grob = (bu: Buendel): Spanne => {
    const s = [bu.ziel, ...bu.quellen].map(anschlussSpanne);
    return [Math.min(...s.map((x) => x[0])), Math.max(...s.map((x) => x[1]))];
  };
  const laenge = (s: Spanne) => s[1] - s[0];
  for (const ber of bereiche) faerben([...ber.buendel].sort((a, b) => laenge(grob(a)) - laenge(grob(b))), grob);

  interface Platz {
    a: Anschluss;
    /** Abstand der Bahn von der Kastenseite (größer = weiter weg). */
    weite: number;
  }
  const seiten = new Map<Rahmen, Record<Seite, Platz[]>>();
  for (const ber of bereiche) {
    for (const bu of ber.buendel) {
      bu.ziel.gegenY = bu.quellen.reduce((s, q) => s + anschlussMitte(q), 0) / bu.quellen.length;
      for (const q of bu.quellen) q.gegenY = anschlussMitte(bu.ziel);
      for (const a of [bu.ziel, ...bu.quellen]) {
        if (a.boden) continue;
        // Bahn 0 liegt an der Grenze `nah` – für Kästen an der anderen Grenze ist sie die fernste
        const nahAmKasten = (a.seite === 'l' && ber.nah === 'r') || (a.seite === 'r' && ber.nah === 'l');
        const s = seiten.get(a.rahmen) ?? { l: [], r: [] };
        s[a.seite].push({ a, weite: nahAmKasten ? bu.spur : -bu.spur });
        seiten.set(a.rahmen, s);
      }
    }
  }
  for (const [r, s] of seiten) {
    for (const liste of [s.l, s.r]) {
      const cy = mitteY(r);
      // Oben die Linien nach oben (nahe Bahn zuoberst), unten die nach unten (nahe Bahn zuunterst)
      const gruppe = (p: Platz) => (p.a.gegenY < cy - 1 ? 0 : p.a.gegenY > cy + 1 ? 2 : 1);
      liste.sort(
        (p, q) =>
          gruppe(p) - gruppe(q) ||
          (gruppe(p) === 0 ? p.weite - q.weite : gruppe(p) === 2 ? q.weite - p.weite : 0) ||
          p.a.gegenY - q.a.gegenY,
      );
      liste.forEach((p, i) => (p.a.y = r.y + (r.h * (i + 1)) / (liste.length + 1)));
    }
  }

  // Gerade Verbindungen zwischen gegenüberliegenden Kästen
  const allein = (a: Anschluss) => !a.boden && (seiten.get(a.rahmen)?.[a.seite].length ?? 0) === 1;
  const innerhalb = (y: number, r: Rahmen) => y >= r.y + 5 && y <= r.y + r.h - 5;
  for (const ber of bereiche) {
    for (const bu of ber.buendel) {
      bu.gerade = false;
      if (!ber.gegenueber || bu.quellen.length !== 1) continue;
      const q = bu.quellen[0];
      const ziel = bu.ziel;
      if (Math.abs(q.y - ziel.y) < 0.5) bu.gerade = true;
      else if (allein(ziel) && innerhalb(q.y, ziel.rahmen)) {
        ziel.y = q.y;
        bu.gerade = true;
      } else if (allein(q) && innerhalb(ziel.y, q.rahmen)) {
        q.y = ziel.y;
        bu.gerade = true;
      }
    }
  }

  // Bahnen nach den genauen Höhen, in der groben Reihenfolge
  const genau = (bu: Buendel): Spanne => {
    const y = [bu.ziel, ...bu.quellen].map((a) => a.y);
    return [Math.min(...y), Math.max(...y)];
  };
  for (const ber of bereiche) {
    const offen = ber.buendel.filter((b) => !b.gerade);
    faerben(
      offen.sort((a, b) => a.spur - b.spur || laenge(genau(a)) - laenge(genau(b))),
      genau,
    );
  }
}

/**
 * Breite eines Bereichs: die Bahnen und Platz für die Antworten an den
 * Ausgängen. Zwischen zwei Spalten stehen die Antworten vor den Bahnen; neben
 * einer Spalte (nur Rücksprünge) dürfen sie über den Bahnen stehen.
 */
function bereichsBreite(ber: Bereich): number {
  const spuren = Math.max(0, ...ber.buendel.filter((b) => !b.gerade).map((b) => b.spur + 1));
  const label = (seite: Seite) =>
    Math.max(
      0,
      ...ber.buendel
        .flatMap((b) => b.quellen)
        .filter((q) => q.seite === seite && q.text && !q.boden)
        .map((q) => textBreite(q.text!, S.klein) + (q.rahmen.raute ? 9 : 7)),
    );
  ber.labelL = label('r');
  ber.labelR = label('l');
  if (ber.buendel.length === 0) return 0;
  const bahnen = spuren > 0 ? 16 + (spuren - 1) * M.spur : 16;
  if (ber.gegenueber) return ber.labelL + ber.labelR + bahnen;
  // Einseitig (Rücksprünge neben einer Spalte): Die Antworten dürfen über den Bahnen stehen – sie haben einen weißen Saum
  const breite = Math.max(ber.labelL + ber.labelR + 4, bahnen);
  ber.labelL = 0;
  ber.labelR = 0;
  return breite;
}

function spurX(ber: Bereich, spur: number): number {
  return ber.nah === 'r' ? ber.x1 - ber.labelR - 8 - spur * M.spur : ber.x0 + ber.labelL + 8 + spur * M.spur;
}

const LABEL: TextArt = { groesse: S.klein, farbe: FARBE.grau, saum: true };

/** Antwort am Ausgang, über der Linie (am Boden: links neben dem senkrechten Stück). */
function ausgangsText(q: Anschluss): string {
  if (!q.text) return '';
  const punkte = amKasten(q);
  const [x, y] = punkte[punkte.length - 1];
  const abstand = q.rahmen.raute && !q.boden ? 5 : 3;
  return q.seite === 'l'
    ? textSvg(x - abstand, y - 2.5, html(q.text), { ...LABEL, anker: 'end' })
    : textSvg(x + abstand, y - 2.5, html(q.text), LABEL);
}

/** Zeichnet die Bündel eines Bereichs: Linien und – getrennt – die Antworten. */
function bereichSvg(ber: Bereich): { linien: string; texte: string } {
  let linien = '';
  let texte = '';
  for (const bu of ber.buendel) {
    const ziel = bu.ziel;
    const zumZiel = [...amKasten(ziel)].reverse();
    for (const q of bu.quellen) texte += ausgangsText(q);
    if (bu.gerade) {
      linien += pfeil([...amKasten(bu.quellen[0]), ...zumZiel], true);
      continue;
    }
    const lx = spurX(ber, bu.spur);
    // Je die fernste Quelle über und unter dem Ziel durchgehend, die übrigen als Stich zur Bahn
    const oben = bu.quellen.filter((q) => q.y < ziel.y).sort((a, b) => a.y - b.y);
    const unten = bu.quellen.filter((q) => q.y >= ziel.y).sort((a, b) => b.y - a.y);
    let mitSpitze = true;
    for (const gruppe of [oben, unten]) {
      gruppe.forEach((q, i) => {
        const start = amKasten(q);
        if (i > 0) {
          linien += pfeil([...start, [lx, q.y]], true, false);
          return;
        }
        // Die zweite durchgehende Linie endet an der Bahn – das letzte Stück zeichnet die erste
        linien += pfeil([...start, [lx, q.y], [lx, ziel.y], ...(mitSpitze ? zumZiel : [])], true, mitSpitze);
        mitSpitze = false;
      });
    }
  }
  return { linien, texte };
}

/* ------------------------------------------------------------------ */
/* Kästen zeichnen                                                     */
/* ------------------------------------------------------------------ */

function kastenSvg(k: Kasten): string {
  const fuellung = k.plm ? FARBE.plm : '#ffffff';
  const rand = k.plm ? FARBE.plmRand : FARBE.kastenRand;
  const cy = mitteY(k);
  const einzug = k.raute ? M.raute : 0;
  let svg = k.raute
    ? `<path d="M ${z(k.x)} ${z(cy)} L ${z(k.x + einzug)} ${z(k.y)} L ${z(k.x + k.b - einzug)} ${z(k.y)} L ${z(k.x + k.b)} ${z(cy)} L ${z(k.x + k.b - einzug)} ${z(k.y + k.h)} L ${z(k.x + einzug)} ${z(k.y + k.h)} Z" fill="${fuellung}" stroke="${rand}" stroke-width="1"/>`
    : `<rect x="${z(k.x)}" y="${z(k.y)}" width="${z(k.b)}" height="${z(k.h)}" rx="4" fill="${fuellung}" stroke="${rand}" stroke-width="1"/>`;
  const mx = mitteX(k);
  const hoehe = k.zeilen.length * S.zeile + (k.hinweise.length > 0 ? 3 + k.hinweise.length * S.zeileKlein : 0);
  let y = cy - hoehe / 2;
  for (const zeile of k.zeilen) {
    svg += textSvg(mx, y + S.zeile / 2 + S.text * 0.35, zeileSvg(zeile), { anker: 'middle' });
    y += S.zeile;
  }
  if (k.hinweise.length > 0) y += 3;
  for (const zeile of k.hinweise) {
    svg += textSvg(mx, y + S.zeileKlein / 2 + S.hinweis * 0.35, zeileSvg(zeile), {
      groesse: S.hinweis,
      farbe: FARBE.grau,
      anker: 'middle',
      kursiv: true,
    });
    y += S.zeileKlein;
  }
  if (k.frist) {
    // Marke auf der unteren Kante, rechts
    const b = textBreite(k.frist, S.marke) + 8;
    const x1 = k.x + k.b - einzug - 6;
    const yb = k.y + k.h;
    svg +=
      `<rect x="${z(x1 - b)}" y="${z(yb - 5.5)}" width="${z(b)}" height="11" rx="5.5" fill="#ffffff" stroke="${FARBE.blockRand}" stroke-width="0.8"/>` +
      textSvg(x1 - b / 2, yb + S.marke * 0.35, html(k.frist), { groesse: S.marke, farbe: FARBE.grau, anker: 'middle' });
  }
  return svg;
}

/* ------------------------------------------------------------------ */
/* Einordnung der Übergänge                                            */
/* ------------------------------------------------------------------ */

/** Wo ein Schritt bzw. Block im Bild steht. */
type Lage =
  | { art: 'haupt'; pos: number }
  | { art: 'abw'; nr: number }
  | { art: 'zweig'; block: ID; zweig: number; teil: 'std' | 'abw'; nr: number };

/** Seitliche Verbindung vor dem Anordnen: Ziel und Quellen als IDs. */
interface Vorlaeufig {
  ziel: ID;
  zielSeite: Seite;
  quellen: { id: ID; seite: Seite; text: string | null }[];
}

/** Die Funktion ist das Planlaufmanagement (Bezeichnung oder Kürzel PLM). */
function istPlm(roleName: string): boolean {
  const n = roleName.trim().toLowerCase();
  return n === EIGENE_ROLLE.toLowerCase() || n === 'plm';
}

/** Gezeichneter Block: Größe, Bild (ab 0/0, je nach Eingang) und die Lage seiner Balken. */
interface BlockBild {
  b: number;
  h: number;
  /** Bild des Blocks; die Überschrift weicht dem Pfeil aus, der bei `eingangX` auf den Gabelbalken trifft. */
  svg: (eingangX: number) => string;
  gabelY: number;
  vereinY: number;
  /** Waagerechter Bereich der Balken. */
  balken: Spanne;
  /** Dauer des Blocks: Summe der Fristen im längsten Zweig. */
  dauer: number;
}

/* ------------------------------------------------------------------ */
/* Das Diagramm                                                        */
/* ------------------------------------------------------------------ */

/**
 * Ablaufdiagramm der Schritte eines Workflows (oder Planlaufs) als SVG für die
 * Druckfassung. `einheit` ist die Einheit der Fristen (Arbeits- bzw.
 * Kalendertage), `funktionsName` die Bezeichnung einer Funktion im Kasten
 * (etwa ein Kürzel; ohne Angabe `roleName` selbst). `dauer` ist die Dauer im
 * Standardverlauf (`dauerImStandardverlauf`), wie sie unten im Bild steht.
 */
export function ablaufDiagrammSvg(
  steps: ProcessTemplateStep[],
  optionen: { einheit: 'AT' | 'KT'; funktionsName?: (roleName: string) => string },
): { svg: string; dauer: number } {
  const dauer = dauerImStandardverlauf(steps);
  const g = gliedern(steps);
  if (g.hauptAnzeige.length === 0) return { svg: leeresBild(), dauer };
  return { svg: diagramm(steps, g, dauer, optionen.einheit, optionen.funktionsName ?? ((r) => r)), dauer };
}

function leeresBild(): string {
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 40" width="90mm" height="12mm" font-family="Helvetica, Arial, sans-serif">' +
    textSvg(10, 24, 'Der Workflow hat keine Schritte.', { farbe: FARBE.grau }) +
    '</svg>'
  );
}

function diagramm(
  steps: ProcessTemplateStep[],
  g: Gliederung,
  dauer: number,
  einheit: 'AT' | 'KT',
  funktionsName: (roleName: string) => string,
): string {
  const schritt = new Map(steps.map((s) => [s.id, s]));
  const name = (id: ID) => schritt.get(id)?.name.trim() || 'ohne Bezeichnung';
  const fristText = (tage: number) => (tage > 0 ? `${tage} ${einheit}` : null);
  const schluessel = (e: Anzeige) => (istBlockAnzeige(e) ? e.block : e);
  const plmSchritt = (e: Anzeige) => !istBlockAnzeige(e) && istPlm(schritt.get(e)!.roleName);

  /* ------------------------- Lage im Bild ------------------------- */

  const lage = new Map<ID, Lage>();
  g.hauptAnzeige.forEach((e, pos) => lage.set(schluessel(e), { art: 'haupt', pos }));
  g.abweichungen.forEach((a, nr) => lage.set(a.id, { art: 'abw', nr }));
  const bloecke = [...g.hauptAnzeige.filter(istBlockAnzeige).map((e) => e.block), ...g.abweichungen.map((a) => a.id)].filter(
    (id) => g.bloecke[id],
  );
  for (const bid of bloecke) {
    for (const zw of g.bloecke[bid].zweige) {
      zw.standard.forEach((id, nr) => lage.set(id, { art: 'zweig', block: bid, zweig: zw.zweig, teil: 'std', nr }));
      zw.abweichungen.forEach((id, nr) => lage.set(id, { art: 'zweig', block: bid, zweig: zw.zweig, teil: 'abw', nr }));
    }
  }
  /** Ziel von außen: ein Schritt in einem Block steht für den ganzen Block. */
  const einheitVon = (id: ID): ID => {
    const l = lage.get(id);
    return l?.art === 'zweig' ? l.block : id;
  };

  /* --------------------- Übergänge einordnen ---------------------- */

  const hinweise = new Map<ID, string[]>();
  const hinweis = (id: ID, text: string) => hinweise.set(id, [...(hinweise.get(id) ?? []), text]);
  const mitAntwort = (k: Kante, ziel: string) => `${k.text ? `${k.text} → ` : '→ '}${ziel}`;
  /** Beschriftungen der Pfeile von Stelle zu Stelle (Standardverlauf, Stapel, Zweige); vorhanden = Pfeil wird gezeichnet. */
  const folge = new Map<string, string[]>();
  const folgeDazu = (schl: string, text: string | null) => {
    const liste = folge.get(schl) ?? [];
    if (text && !liste.includes(text)) liste.push(text);
    folge.set(schl, liste);
  };
  const vorlaeufig = new Map<string, Map<string, Vorlaeufig>>();
  const verbinden = (bereich: string, von: ID, vonSeite: Seite, nach: ID, nachSeite: Seite, text: string | null) => {
    const liste = vorlaeufig.get(bereich) ?? new Map<string, Vorlaeufig>();
    const schl = `${nach}|${nachSeite}`;
    const v = liste.get(schl) ?? { ziel: nach, zielSeite: nachSeite, quellen: [] };
    v.quellen.push({ id: von, seite: vonSeite, text });
    liste.set(schl, v);
    vorlaeufig.set(bereich, liste);
  };

  const erste = new Map<ID, Kante>();
  for (const k of g.kanten) if (!erste.has(k.von)) erste.set(k.von, k);

  /** Übergang aus der Spalte der Abweichungen (Schritt oder Block an Stelle `nr`). */
  const abweichungVerbinden = (von: ID, nr: number, t: ID, lt: Exclude<Lage, { art: 'zweig' }>, text: string | null) => {
    if (lt.art === 'haupt') verbinden('innen', von, 'r', t, 'l', text);
    // Zum Kasten direkt darunter: senkrecht (in einen Block hinein über seine Seite)
    else if (lt.nr === nr + 1 && !g.bloecke[t]) folgeDazu(`abw|${nr}`, text);
    else verbinden('aussen', von, 'l', t, 'l', text);
  };

  const zweigKante = (k: Kante, lv: Extract<Lage, { art: 'zweig' }>) => {
    const zw = g.bloecke[lv.block].zweige[lv.zweig];
    const basis = `${lv.block}|${lv.zweig}`;
    if (k.unzulaessig) return hinweis(k.von, mitAntwort(k, 'anderer Zweig (nicht zulässig)'));
    if (k.art === 'ausstieg') return hinweis(k.von, mitAntwort(k, k.nach === 'ende' ? 'Planlauf endet' : name(k.nach)));
    if (k.art === 'zweigende') {
      // Zum Zusammenführungsbalken: vom letzten Kasten einer Spalte senkrecht, sonst als Hinweis
      if (lv.teil === 'std' && lv.nr === zw.standard.length - 1) return folgeDazu(`${basis}|std|ende`, k.text);
      if (lv.teil === 'abw' && lv.nr === zw.abweichungen.length - 1) return folgeDazu(`${basis}|abw|ende`, k.text);
      return hinweis(k.von, mitAntwort(k, 'Zweig beendet'));
    }
    if (k.nach === 'ende') return hinweis(k.von, mitAntwort(k, 'Planlauf endet'));
    const lt = lage.get(k.nach);
    if (!lt || lt.art !== 'zweig' || lt.block !== lv.block || lt.zweig !== lv.zweig) return hinweis(k.von, mitAntwort(k, name(k.nach)));
    if (lv.teil === 'std' && lt.teil === 'std') {
      if (lt.nr === lv.nr + 1) return folgeDazu(`${basis}|std|${lv.nr}`, k.text);
      return verbinden(`${basis}|links`, k.von, 'l', k.nach, 'l', k.text);
    }
    if (lv.teil === 'std') return verbinden(`${basis}|mitte`, k.von, 'r', k.nach, 'l', k.text);
    if (lt.teil === 'std') return verbinden(`${basis}|mitte`, k.von, 'l', k.nach, 'r', k.text);
    if (lt.nr === lv.nr + 1) return folgeDazu(`${basis}|abw|${lv.nr}`, k.text);
    return verbinden(`${basis}|rechts`, k.von, 'r', k.nach, 'r', k.text);
  };

  for (const k of g.kanten) {
    const lv = lage.get(k.von);
    if (!lv) continue;
    if (lv.art === 'zweig') {
      zweigKante(k, lv);
      continue;
    }
    if (lv.art === 'haupt' && erste.get(k.von) === k && k.standard) {
      folgeDazu(`haupt|${lv.pos}`, k.text);
      continue;
    }
    if (k.nach === 'ende') {
      hinweis(k.von, mitAntwort(k, 'Planlauf endet'));
      continue;
    }
    const t = einheitVon(k.nach);
    const lt = lage.get(t);
    if (!lt || lt.art === 'zweig') {
      hinweis(k.von, mitAntwort(k, name(k.nach)));
      continue;
    }
    if (lv.art === 'haupt') {
      // Weitere Antwort zur nächsten Stelle: an den Pfeil des Standardverlaufs
      if (lt.art === 'haupt' && lt.pos === lv.pos + 1) folgeDazu(`haupt|${lv.pos}`, k.text);
      else if (lt.art === 'haupt') verbinden('rechts', k.von, 'r', t, 'r', k.text);
      else verbinden('innen', k.von, 'l', t, 'r', k.text);
    } else abweichungVerbinden(k.von, lv.nr, t, lt, k.text);
  }
  // Endet der Standardverlauf mit einer Schleife hinter einem Block, führt sie vom Block zurück
  const letzte = g.hauptAnzeige[g.hauptAnzeige.length - 1];
  if (g.rueckSprungZu && istBlockAnzeige(letzte)) verbinden('rechts', letzte.block, 'r', einheitVon(g.rueckSprungZu), 'r', null);
  // Ein Block unter den Abweichungen führt nach seinen Zweigen zum Schritt hinter ihm
  g.abweichungen.forEach((a, nr) => {
    const b = g.bloecke[a.id];
    if (!b || b.anschluss === 'ende' || !b.zweige.some((zw) => zw.schluss.art === 'zweigende')) return;
    const t = einheitVon(b.anschluss);
    const lt = lage.get(t);
    if (lt && lt.art !== 'zweig') abweichungVerbinden(a.id, nr, t, lt, null);
  });

  /** Zahl der Anschlüsse an einer Kastenseite. */
  const portZahl = (id: ID, seite: Seite, bereich?: string) => {
    let n = 0;
    for (const [b, liste] of vorlaeufig) {
      if (bereich && b !== bereich) continue;
      for (const v of liste.values()) {
        if (v.ziel === id && v.zielSeite === seite) n++;
        n += v.quellen.filter((q) => q.id === id && q.seite === seite).length;
      }
    }
    return n;
  };

  /* ------------------ Zeilen: zwei Schritte nebeneinander ------------------ */

  /**
   * Folgt im Standardverlauf auf einen Schritt der Projektbeteiligten ein
   * Schritt des Planlaufmanagements, stehen beide in einer Zeile (wie in den
   * Muster-Anlagen) – der Pfeil läuft waagerecht nach rechts. Die linke Seite
   * des rechten Kastens belegt dieser Pfeil; seine Verbindungen nach links
   * laufen deshalb über den Kastenboden (höchstens drei). Der linke Kasten
   * darf keine Verbindungen nach rechts haben, sie kreuzten den rechten.
   */
  const zeilen: number[][] = [];
  const neben = new Set<ID>();
  for (let i = 0; i < g.hauptAnzeige.length; i++) {
    const a = g.hauptAnzeige[i];
    const b = g.hauptAnzeige[i + 1];
    if (
      b !== undefined &&
      !istBlockAnzeige(a) &&
      !istBlockAnzeige(b) &&
      !plmSchritt(a) &&
      plmSchritt(b) &&
      portZahl(a, 'r') === 0 &&
      portZahl(b, 'l', 'innen') <= 3
    ) {
      zeilen.push([i, i + 1]);
      neben.add(b);
      i++;
    } else zeilen.push([i]);
  }
  const zeileVon = new Map<number, number[]>();
  for (const zl of zeilen) for (const i of zl) zeileVon.set(i, zl);
  const paar = (i: number) => (zeileVon.get(i)?.length ?? 1) > 1;

  /* --------------------------- Kästen ----------------------------- */

  const rahmen = new Map<ID, Rahmen>();

  const kastenBauen = (id: ID, breite: number, mitFrist: boolean): Kasten => {
    const s = schritt.get(id)!;
    const plm = istPlm(s.roleName);
    const raute = s.typ === 'entscheidung';
    const frist = mitFrist ? fristText(s.fristTage) : null;
    const innen = breite - 2 * M.padX - (raute ? 2 * M.raute : 0);
    const funktion = plm || !s.roleName.trim() ? '' : funktionsName(s.roleName).trim();
    const zeilenText = umbrechen([...(funktion ? woerter(`${funktion}:`, true) : []), ...woerter(name(id), false)], innen, S.text);
    const hin = (hinweise.get(id) ?? []).flatMap((h) => umbrechen(woerter(h, false), innen, S.hinweis));
    const textH = zeilenText.length * S.zeile + (hin.length > 0 ? 3 + hin.length * S.zeileKlein : 0);
    // Rechts in einer Zeile mit zwei Schritten: Verbindungen nach links über den Boden
    const ports = Math.max(neben.has(id) ? 1 : portZahl(id, 'l'), portZahl(id, 'r'));
    const h = Math.max(M.minH, textH + 2 * M.padY + (raute ? 4 : 0) + (frist ? 3 : 0), (ports + 1) * M.portAbstand);
    const k: Kasten = { x: 0, y: 0, b: breite, h, raute, plm, zeilen: zeilenText, hinweise: hin, frist };
    rahmen.set(id, k);
    return k;
  };

  /** Bündel eines Bereichs aus den vorläufigen Verbindungen (Kästen müssen gebaut sein). */
  const bereichFuellen = (ber: Bereich, schl: string): Bereich => {
    for (const v of vorlaeufig.get(schl)?.values() ?? []) {
      const ziel = rahmen.get(v.ziel);
      const quellen = v.quellen.filter((q) => rahmen.has(q.id));
      if (!ziel || quellen.length === 0) continue;
      ber.buendel.push({
        ziel: { rahmen: ziel, seite: v.zielSeite, text: null, y: 0, gegenY: 0 },
        quellen: quellen.map((q) => ({ rahmen: rahmen.get(q.id)!, seite: q.seite, text: q.text, y: 0, gegenY: 0 })),
        spur: 0,
        gerade: false,
      });
    }
    return ber;
  };

  /** Senkrechter Pfeil mit Beschriftung rechts daneben. */
  const senkrechterPfeil = (x: number, y0: number, y1: number, beschriftung: string[] | undefined, gestrichelt: boolean) => ({
    linie: pfeil(
      [
        [x, y0],
        [x, y1],
      ],
      gestrichelt,
    ),
    text: beschriftung && beschriftung.length > 0 ? textSvg(x + 4, y0 + 9, html(beschriftung.join(' / ')), LABEL) : '',
  });

  /* ----------------------- Parallele Blöcke ------------------------ */

  const blockBauen = (bid: ID): BlockBild => {
    const b: BlockGliederung = g.bloecke[bid];
    const pad = M.blockPad;
    let linien = '';
    let kaesten = '';
    let texte = '';

    // Zweige einzeln anordnen (ab 0/0), dann nebeneinander setzen
    const zweige = b.zweige.map((zw) => {
      const basis = `${bid}|${zw.zweig}`;
      const std = zw.standard.map((id) => kastenBauen(id, M.zweigB, true));
      const abw = zw.abweichungen.map((id) => kastenBauen(id, M.zweigB, true));
      for (const spalte of [std, abw]) {
        let y = 0;
        for (const k of spalte) {
          k.y = y;
          y += k.h + M.stapelAbstand;
        }
      }
      const links = bereichFuellen(neuerBereich('r', false), `${basis}|links`);
      const mitte = bereichFuellen(neuerBereich('l', true), `${basis}|mitte`);
      const rechts = bereichFuellen(neuerBereich('l', false), `${basis}|rechts`);
      spurenLegen([links, mitte, rechts]);
      const linksB = bereichsBreite(links);
      const mitteB = abw.length > 0 ? Math.max(bereichsBreite(mitte), 24) : 0;
      const rechtsB = bereichsBreite(rechts);
      links.x0 = 0;
      links.x1 = linksB;
      for (const k of std) k.x = linksB;
      mitte.x0 = linksB + M.zweigB;
      mitte.x1 = mitte.x0 + mitteB;
      for (const k of abw) k.x = mitte.x1;
      rechts.x0 = abw.length > 0 ? mitte.x1 + M.zweigB : mitte.x0;
      rechts.x1 = rechts.x0 + rechtsB;
      const hoehe = Math.max(0, ...[...std, ...abw].map((k) => k.y + k.h));
      return { zw, basis, std, abw, bereiche: [links, mitte, rechts], breite: rechts.x1, hoehe };
    });

    // Namen der Zweige rechts neben dem Pfeil vom Gabelbalken
    const namen = zweige.map((zg) =>
      zg.zw.name ? umbrechen(woerter(zg.zw.name, false), Math.max(40, zg.breite - (zg.std[0]?.x ?? 0) - M.zweigB / 2 - 6), S.klein) : [],
    );
    const titel = blockTitel(b.name, b.zweige.length);
    const titelB = textBreite(titel, S.klein, true);
    const gabelY = pad + 11;
    const namenH = Math.max(0, ...namen.map((n) => n.length)) * S.zeileKlein;
    const oben = gabelY + 3 + Math.max(14, namenH + 6);
    const inhaltB = zweige.reduce((s, zg) => s + zg.breite, 0) + (zweige.length - 1) * M.zweigAbstand;
    const breite = Math.max(inhaltB + 2 * pad, titelB + 2 * pad + 60);
    const vereinY = oben + Math.max(0, ...zweige.map((zg) => zg.hoehe)) + 12;
    const hoehe = vereinY + 1.5 + pad;

    let x = (breite - inhaltB) / 2;
    zweige.forEach((zg, i) => {
      // An die endgültige Stelle im Block
      for (const k of [...zg.std, ...zg.abw]) {
        k.x += x;
        k.y += oben;
      }
      for (const ber of zg.bereiche) {
        ber.x0 += x;
        ber.x1 += x;
        for (const bu of ber.buendel) for (const a of [bu.ziel, ...bu.quellen]) a.y += oben;
      }
      const cx = (zg.std[0]?.x ?? x) + M.zweigB / 2;
      if (zg.std.length > 0) {
        linien += pfeil(
          [
            [cx, gabelY + 1.5],
            [cx, zg.std[0].y],
          ],
          false,
        );
      }
      namen[i].forEach((zeile, j) => {
        texte += textSvg(cx + 5, gabelY + 11 + j * S.zeileKlein, zeileSvg(zeile), { groesse: S.klein, farbe: FARBE.grau, kursiv: true });
      });
      // Standardweg im Zweig, am Schluss zum Zusammenführungsbalken
      zg.std.forEach((k, j) => {
        const naechster = zg.std[j + 1];
        if (!naechster) return;
        const p = senkrechterPfeil(cx, k.y + k.h, naechster.y, folge.get(`${zg.basis}|std|${j}`), false);
        linien += p.linie;
        texte += p.text;
      });
      const letzterStd = zg.std[zg.std.length - 1];
      if (letzterStd && folge.has(`${zg.basis}|std|ende`)) {
        const p = senkrechterPfeil(cx, letzterStd.y + letzterStd.h, vereinY - 1.5, folge.get(`${zg.basis}|std|ende`), false);
        linien += p.linie;
        texte += p.text;
      }
      // Abweichungen im Zweig: gestapelt, die letzte ggf. zum Zusammenführungsbalken
      zg.abw.forEach((k, j) => {
        const naechster = zg.abw[j + 1];
        const schl = naechster ? `${zg.basis}|abw|${j}` : `${zg.basis}|abw|ende`;
        if (!folge.has(schl)) return;
        const p = senkrechterPfeil(mitteX(k), k.y + k.h, naechster ? naechster.y : vereinY - 1.5, folge.get(schl), true);
        linien += p.linie;
        texte += p.text;
      });
      for (const ber of zg.bereiche) {
        const t = bereichSvg(ber);
        linien += t.linien;
        texte += t.texte;
      }
      for (const k of [...zg.std, ...zg.abw]) kaesten += kastenSvg(k);
      x += zg.breite + M.zweigAbstand;
    });

    const dauerBlock = Math.max(0, ...b.zweige.map((zw) => zw.standard.reduce((s, id) => s + (schritt.get(id)?.fristTage ?? 0), 0)));
    const balken = (y: number) =>
      `<line x1="${z(pad)}" y1="${z(y)}" x2="${z(breite - pad)}" y2="${z(y)}" stroke="${FARBE.balken}" stroke-width="3" stroke-linecap="round"/>`;
    return {
      b: breite,
      h: hoehe,
      svg: (eingangX) => {
        // Überschrift links, sonst rechts neben dem ankommenden Pfeil
        const tx = pad + titelB + 8 <= eingangX || eingangX + 8 + titelB > breite - pad ? pad : eingangX + 8;
        return (
          `<rect x="0" y="0" width="${z(breite)}" height="${z(hoehe)}" rx="7" fill="${FARBE.block}" stroke="${FARBE.blockRand}" stroke-width="1"/>` +
          textSvg(tx, pad + 4, html(titel), { groesse: S.klein, farbe: FARBE.grau, fett: true }) +
          balken(gabelY) +
          balken(vereinY) +
          linien +
          kaesten +
          texte
        );
      },
      gabelY,
      vereinY,
      balken: [pad + 4, breite - pad - 4],
      dauer: dauerBlock,
    };
  };

  /* ------------------------ Senkrecht anordnen ------------------------ */

  const bilder = new Map<ID, BlockBild>();
  for (const bid of bloecke) bilder.set(bid, blockBauen(bid));
  const blockRahmen = (bid: ID): Rahmen => {
    const r: Rahmen = { x: 0, y: 0, b: bilder.get(bid)!.b, h: bilder.get(bid)!.h, raute: false };
    rahmen.set(bid, r);
    return r;
  };

  const haupt = g.hauptAnzeige.map((e, i) =>
    istBlockAnzeige(e)
      ? { e, r: blockRahmen(e.block), plm: false }
      : { e, r: kastenBauen(e, plmSchritt(e) ? M.plmB : M.mitteB, paar(i)), plm: plmSchritt(e) },
  );
  const abw = g.abweichungen.map((a) => ({ a, r: g.bloecke[a.id] ? blockRahmen(a.id) : kastenBauen(a.id, M.abwB, true) }));

  // Verbindungen nach links vom rechten Kasten einer Zeile mit zwei Schritten: Zahl der Rinnen darunter
  const rinnen = new Map<ID, number>();
  for (const id of neben) rinnen.set(id, portZahl(id, 'l', 'innen'));

  const kopfY = M.rand;
  const startY = kopfY + 23;
  let y = startY + 17;
  const zeilenY: { y: number; h: number }[] = [];
  /** Rinnen: erste Höhe unter der Zeile (unter Kästen und Fristmarken); Knick des Standardverlaufs erst darunter. */
  const rinnenY = new Map<ID, number>();
  const knickAb = new Map<ID, number>();
  for (const zl of zeilen) {
    const h = Math.max(...zl.map((i) => haupt[i].r.h));
    for (const i of zl) haupt[i].r.y = y + (h - haupt[i].r.h) / 2;
    zeilenY.push({ y, h });
    let abstand = M.zeilenAbstand;
    for (const i of zl) {
      const id = schluessel(haupt[i].e);
      const n = rinnen.get(id) ?? 0;
      if (n === 0) continue;
      rinnenY.set(id, y + h + 9);
      knickAb.set(id, y + h + 9 + (n - 1) * 5 + 6);
      abstand = Math.max(abstand, 9 + (n - 1) * 5 + 6 + 8);
    }
    y += h + abstand;
  }
  // Ohne Schleife am Schluss: Endpunkt unter der letzten Stelle
  const mitEnde = !g.rueckSprungZu;
  const endeY = y + 6;
  y = mitEnde ? endeY + 6 : y - M.zeilenAbstand;
  let abwY = kopfY + 22;
  for (const { a, r } of abw) {
    r.y = Math.max(haupt[a.anker]?.r.y ?? abwY, abwY);
    abwY = r.y + r.h + M.stapelAbstand;
  }
  const inhaltUnten = Math.max(y, abwY - M.stapelAbstand) + 10;

  /* ----------------------------- Bahnen ----------------------------- */

  const aussen = bereichFuellen(neuerBereich('r', false), 'aussen');
  const innen = bereichFuellen(neuerBereich('r', true), 'innen');
  const rechts = bereichFuellen(neuerBereich('l', false), 'rechts');
  // Rinnen unter dem rechten Kasten einer Zeile: weiter rechts = tiefer, nach oben Führendes zuerst
  for (const id of neben) {
    const r = rahmen.get(id)!;
    const gegenMitte = new Map<Anschluss, number>();
    for (const bu of innen.buendel) {
      for (const a of [bu.ziel, ...bu.quellen]) {
        if (a.rahmen !== r || a.seite !== 'l') continue;
        const andere = a === bu.ziel ? bu.quellen.map((q) => q.rahmen) : [bu.ziel.rahmen];
        gegenMitte.set(a, andere.reduce((s, o) => s + mitteY(o), 0) / andere.length);
      }
    }
    const am = [...gegenMitte.keys()].sort((p, q) => gegenMitte.get(p)! - gegenMitte.get(q)!);
    am.forEach((a, i) => {
      a.boden = { versatz: (r.raute ? M.raute : 0) + 12 + i * 9 };
      a.y = rinnenY.get(id)! + i * 5;
    });
  }
  spurenLegen([aussen, innen, rechts]);

  /* ------------------------- Waagerecht anordnen ------------------------- */

  const fristX1 = M.rand + M.fristB;
  let x = fristX1;
  const abwSpalteB = abw.length > 0 ? Math.max(M.abwB, ...abw.map(({ r }) => r.b)) : 0;
  let abwX = 0;
  if (abw.length > 0) {
    aussen.x0 = x;
    x += Math.max(bereichsBreite(aussen), 12);
    aussen.x1 = x;
    abwX = x;
    for (const { r } of abw) r.x = abwX + abwSpalteB - r.b;
    x += abwSpalteB;
    innen.x0 = x;
    x += Math.max(bereichsBreite(innen), 30);
    innen.x1 = x;
  } else x += 16;
  const mx = x;
  const px = mx + M.mitteB + M.spaltenAbstand;
  const bereichMitte = px + M.plmB - mx;
  let inhaltRechts = px + M.plmB;
  for (const h of haupt) {
    if (istBlockAnzeige(h.e)) {
      h.r.x = h.r.b <= bereichMitte ? mx + (bereichMitte - h.r.b) / 2 : mx;
      inhaltRechts = Math.max(inhaltRechts, h.r.x + h.r.b);
    } else h.r.x = h.plm ? px : mx;
  }
  rechts.x0 = inhaltRechts;
  rechts.x1 = inhaltRechts + bereichsBreite(rechts);
  const breite = rechts.x1 + M.rand;

  /* ------------------------------ Zeichnen ------------------------------ */

  let hintergrund = '';
  let linien = '';
  let vorne = '';
  let texte = '';

  // Spaltenköpfe und Band des Planlaufmanagements
  const kopf = (xx: number, text: string, anker: 'start' | 'middle' | 'end') =>
    textSvg(xx, kopfY + 9, html(text), { groesse: S.kopf, farbe: FARBE.grau, fett: true, anker });
  hintergrund += `<rect x="${z(px - 10)}" y="${z(kopfY - 4)}" width="${z(M.plmB + 20)}" height="${z(inhaltUnten - kopfY + 4)}" rx="6" fill="${FARBE.band}"/>`;
  hintergrund += kopf(fristX1 - 6, 'Frist', 'end');
  if (abw.length > 0) hintergrund += kopf(abwX + abwSpalteB / 2, 'Abweichungen', 'middle');
  hintergrund += kopf(mx + M.mitteB / 2, 'Projektbeteiligte', 'middle');
  hintergrund += kopf(px + M.plmB / 2, 'Planlaufmanagement', 'middle');
  hintergrund += `<line x1="${z(M.rand)}" y1="${z(kopfY + 15)}" x2="${z(breite - M.rand)}" y2="${z(kopfY + 15)}" stroke="${FARBE.kopfLinie}" stroke-width="0.8"/>`;

  // Fristen des Standardverlaufs je Zeile (zwei Schritte: Summe; Block: längster Zweig)
  zeilen.forEach((zl, n) => {
    const { y: zy, h: zh } = zeilenY[n];
    const erstes = haupt[zl[0]];
    const tage = istBlockAnzeige(erstes.e)
      ? bilder.get(erstes.e.block)!.dauer
      : zl.reduce((s, i) => s + (schritt.get(schluessel(haupt[i].e))?.fristTage ?? 0), 0);
    const t = fristText(tage);
    if (!t) return;
    if (istBlockAnzeige(erstes.e)) {
      const bx = fristX1 - 3;
      hintergrund += `<path d="M ${z(bx - 3)} ${z(zy + 4)} H ${z(bx)} V ${z(zy + zh - 4)} H ${z(bx - 3)}" fill="none" stroke="${FARBE.hell}" stroke-width="0.8"/>`;
      texte += textSvg(bx - 6, zy + zh / 2 + S.text * 0.35, html(t), { anker: 'end' });
    } else texte += textSvg(fristX1 - 6, zy + zh / 2 + S.text * 0.35, html(t), { anker: 'end' });
  });

  // Standardverlauf: Anfang, Pfeile von Stelle zu Stelle, Ende
  const klemmen = (wert: number, [lo, hi]: Spanne) => Math.min(hi, Math.max(lo, wert));
  const eingang = new Map<ID, number>();
  /** Ankunft oben: Kastenmitte bzw. auf dem Gabelbalken möglichst senkrecht unter dem Ausgang. */
  const zielPunkt = (i: number, vonX: number): Punkt => {
    const { e, r } = haupt[i];
    if (!istBlockAnzeige(e)) return [mitteX(r), r.y];
    const bild = bilder.get(e.block)!;
    const ex = r.x + klemmen(vonX - r.x, bild.balken);
    eingang.set(e.block, ex - r.x);
    return [ex, r.y + bild.gabelY - 1.5];
  };
  /** Ausgang unten: Kastenmitte bzw. auf dem Zusammenführungsbalken möglichst senkrecht über dem Ziel. */
  const quellPunkt = (i: number, nachX: number): Punkt => {
    const { e, r } = haupt[i];
    if (!istBlockAnzeige(e)) return [mitteX(r), r.y + r.h];
    const bild = bilder.get(e.block)!;
    return [r.x + klemmen(nachX - r.x, bild.balken), r.y + bild.vereinY + 1.5];
  };
  const unterkante = (i: number) => haupt[i].r.y + haupt[i].r.h;
  /** Pfeil des Standardverlaufs; der Knick liegt in der Lücke zwischen den Stellen, unter allen Rinnen. */
  const verbindung = (von: Punkt, vonUnten: number, nach: Punkt, nachOben: number, beschriftung: string[] | undefined, knick = 0) => {
    const m = Math.max((vonUnten + nachOben) / 2, knick);
    const punkte: Punkt[] =
      Math.abs(von[0] - nach[0]) < 0.5
        ? [von, nach]
        : [
            von,
            [von[0], m],
            [nach[0], m],
            nach,
          ];
    linien += pfeil(punkte, false);
    if (beschriftung && beschriftung.length > 0) {
      const t = html(beschriftung.join(' / '));
      texte +=
        nach[0] > von[0] + 0.5
          ? textSvg(von[0] - 4, vonUnten + 8.5, t, { ...LABEL, anker: 'end' })
          : textSvg(von[0] + 4, vonUnten + 8.5, t, LABEL);
    }
  };

  // Anfang
  {
    const erstes = haupt[0];
    const sx = mitteX(erstes.r);
    const ziel = zielPunkt(0, sx);
    vorne += `<circle cx="${z(ziel[0])}" cy="${z(startY)}" r="4.5" fill="${FARBE.balken}"/>`;
    texte += textSvg(ziel[0] + 9, startY + 3, 'Planlaufbeginn', { groesse: S.klein, farbe: FARBE.grau });
    verbindung([ziel[0], startY + 4.5], startY + 4.5, ziel, erstes.r.y, undefined);
  }
  for (let i = 0; i + 1 < haupt.length; i++) {
    const a = haupt[i];
    const b = haupt[i + 1];
    const beschriftung = folge.get(`haupt|${i}`);
    if (zeileVon.get(i) === zeileVon.get(i + 1)) {
      // Zwei Schritte in einer Zeile: waagerecht von links nach rechts
      const cy = mitteY(a.r);
      linien += pfeil(
        [
          [a.r.x + a.r.b, cy],
          [b.r.x, cy],
        ],
        false,
      );
      if (beschriftung && beschriftung.length > 0) texte += textSvg(a.r.x + a.r.b + 4, cy - 3, html(beschriftung.join(' / ')), LABEL);
      continue;
    }
    // Ausgang: Kastenmitte; ein Block richtet sich nach dem Ziel
    const vonX = istBlockAnzeige(a.e) ? quellPunkt(i, mitteX(b.r))[0] : mitteX(a.r);
    const nach = zielPunkt(i + 1, vonX);
    const von = quellPunkt(i, nach[0]);
    verbindung(von, unterkante(i), nach, b.r.y, beschriftung, knickAb.get(schluessel(a.e)));
  }
  if (mitEnde) {
    const i = haupt.length - 1;
    const l = haupt[i];
    const von = quellPunkt(i, mitteX(l.r));
    verbindung(von, unterkante(i), [von[0], endeY - 6], endeY - 6, folge.get(`haupt|${i}`), knickAb.get(schluessel(l.e)));
    vorne += `<circle cx="${z(von[0])}" cy="${z(endeY)}" r="6" fill="#ffffff" stroke="${FARBE.balken}" stroke-width="1.2"/><circle cx="${z(von[0])}" cy="${z(endeY)}" r="3.4" fill="${FARBE.balken}"/>`;
    texte += textSvg(von[0] + 10, endeY + 3, 'Planlauf abgeschlossen', { groesse: S.klein, farbe: FARBE.grau });
  }

  // Blöcke (die Überschrift weicht dem ankommenden Pfeil aus)
  for (const [bid, bild] of bilder) {
    const r = rahmen.get(bid)!;
    vorne += `<g transform="translate(${z(r.x)} ${z(r.y)})">${bild.svg(eingang.get(bid) ?? bild.b / 2)}</g>`;
  }

  // Abweichungen: gestapelte Pfeile
  abw.forEach(({ a, r }, nr) => {
    const naechster = abw[nr + 1];
    if (!naechster || !folge.has(`abw|${nr}`)) return;
    // Aus einem (breiteren) Block senkrecht über dem Kasten darunter
    const ax = g.bloecke[a.id] ? mitteX(naechster.r) : mitteX(r);
    const p = senkrechterPfeil(ax, r.y + r.h, naechster.r.y, folge.get(`abw|${nr}`), true);
    linien += p.linie;
    texte += p.text;
  });

  // Seitliche Verbindungen
  for (const ber of [aussen, innen, rechts]) {
    const t = bereichSvg(ber);
    linien += t.linien;
    texte += t.texte;
  }

  // Kästen
  for (const h of haupt) if (!istBlockAnzeige(h.e)) vorne += kastenSvg(h.r as Kasten);
  for (const { a, r } of abw) if (!g.bloecke[a.id]) vorne += kastenSvg(r as Kasten);

  // Fuß: Gesamtdauer und Legende
  const fussY = inhaltUnten + 14;
  const gesamt = `Gesamtdauer ${dauer} ${einheit}`;
  texte += textSvg(M.rand, fussY, html(gesamt), { groesse: S.text, fett: true });
  const zusatz = 'im Standardverlauf, je paralleler Block der längste Zweig';
  const zusatzX = M.rand + textBreite(gesamt, S.text, true) + 8;
  texte += textSvg(zusatzX, fussY, html(zusatz), { groesse: S.klein, farbe: FARBE.grau });
  const legende = legendeSvg(zusatzX + textBreite(zusatz, S.klein) + 30, fussY, breite - M.rand);
  const hoehe = legende.unten + M.rand - 4;

  const massstab = Math.min(DIAGRAMM_BREITE_MM / breite, DIAGRAMM_HOEHE_MM / hoehe, MASSSTAB_MAX);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${z(breite)} ${z(hoehe)}" width="${z(breite * massstab)}mm" height="${z(hoehe * massstab)}mm"` +
    ` style="max-width:100%;height:auto" font-family="Helvetica, Arial, sans-serif">` +
    hintergrund +
    linien +
    vorne +
    texte +
    legende.svg +
    '</svg>'
  );
}

/** Legende rechtsbündig in der Fußzeile; passt sie nicht hinter den Text, steht sie darunter. */
function legendeSvg(frueheste: number, y: number, rechts: number): { svg: string; unten: number } {
  const linie = (gestrichelt: boolean) => (x: number, yy: number) =>
    pfeil(
      [
        [x, yy - 3],
        [x + 22, yy - 3],
      ],
      gestrichelt,
    );
  const eintraege: { zeichen: (x: number, y: number) => string; b: number; text: string }[] = [
    { zeichen: linie(false), b: 22, text: 'Standardverlauf' },
    { zeichen: linie(true), b: 22, text: 'Abweichung, Rücksprung' },
    {
      zeichen: (x, yy) =>
        `<rect x="${z(x)}" y="${z(yy - 8)}" width="16" height="10" rx="2" fill="${FARBE.plm}" stroke="${FARBE.plmRand}" stroke-width="1"/>`,
      b: 16,
      text: 'Planlaufmanagement',
    },
    {
      zeichen: (x, yy) =>
        `<path d="M ${z(x)} ${z(yy - 3)} L ${z(x + 5)} ${z(yy - 8)} L ${z(x + 15)} ${z(yy - 8)} L ${z(x + 20)} ${z(yy - 3)} L ${z(x + 15)} ${z(yy + 2)} L ${z(x + 5)} ${z(yy + 2)} Z" fill="#ffffff" stroke="${FARBE.kastenRand}" stroke-width="1"/>`,
      b: 20,
      text: 'Entscheidung',
    },
  ];
  const gesamtB = eintraege.reduce((s, e) => s + e.b + 5 + textBreite(e.text, S.klein), 0) + (eintraege.length - 1) * 16;
  let x = rechts - gesamtB;
  let yy = y;
  if (x < frueheste) {
    yy = y + 16;
    x = Math.max(M.rand, rechts - gesamtB);
  }
  let svg = '';
  for (const e of eintraege) {
    svg += e.zeichen(x, yy);
    x += e.b + 5;
    svg += textSvg(x, yy, html(e.text), { groesse: S.klein, farbe: FARBE.grau });
    x += textBreite(e.text, S.klein) + 16;
  }
  return { svg, unten: yy + 4 };
}
