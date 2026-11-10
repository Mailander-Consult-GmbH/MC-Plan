/**
 * Bausteine in Text: Platzhalter der Form {{schluessel}} zerlegen und wieder
 * zusammensetzen. Reine Funktionen ohne fachlichen Bezug – der Baustein-Editor
 * (bausteinEditor.tsx) zeigt damit Platzhalter als nicht teilbare Bausteine,
 * gespeichert bleibt der Text mit {{schluessel}}.
 */

/** Ein Platzhalter im Text: {{schluessel}}, Leerraum innerhalb der Klammern erlaubt. */
export const BAUSTEIN_MUSTER = /\{\{\s*([\w.]+)\s*\}\}/g;

export type Teil = { art: 'text'; text: string } | { art: 'baustein'; schluessel: string };

/** Ein Baustein mit seiner Lage im Text (Anfang inklusive, Ende exklusive). */
export interface BausteinLage {
  schluessel: string;
  von: number;
  bis: number;
}

/** Schreibweise eines Bausteins im gespeicherten Text. */
export const bausteinText = (schluessel: string) => `{{${schluessel}}}`;

/**
 * Bringt Text in die gespeicherte Form: Zeilenenden als \n, geschützte
 * Leerzeichen als Leerzeichen, Platzhalter ohne Leerraum in den Klammern.
 */
export function textNormalisieren(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/ /g, ' ')
    .replace(/​/g, '')
    .replace(BAUSTEIN_MUSTER, (_, s: string) => bausteinText(s));
}

/** Zerlegt Text in Textstücke und Bausteine (leere Textstücke entfallen). */
export function zerlegen(text: string): Teil[] {
  const teile: Teil[] = [];
  let pos = 0;
  for (const m of text.matchAll(BAUSTEIN_MUSTER)) {
    const i = m.index ?? 0;
    if (i > pos) teile.push({ art: 'text', text: text.slice(pos, i) });
    teile.push({ art: 'baustein', schluessel: m[1] });
    pos = i + m[0].length;
  }
  if (pos < text.length) teile.push({ art: 'text', text: text.slice(pos) });
  return teile;
}

/** Setzt zerlegten Text wieder zusammen. */
export function zusammensetzen(teile: Teil[]): string {
  return teile.map((t) => (t.art === 'text' ? t.text : bausteinText(t.schluessel))).join('');
}

/** Lage aller Bausteine in (normalisiertem) Text. */
export function bausteinLagen(text: string): BausteinLage[] {
  return [...text.matchAll(BAUSTEIN_MUSTER)].map((m) => ({
    schluessel: m[1],
    von: m.index ?? 0,
    bis: (m.index ?? 0) + m[0].length,
  }));
}

/** Schiebt eine Stelle aus einem Baustein heraus an dessen nächstgelegenen Rand. */
export function stelleAusserhalb(text: string, stelle: number): number {
  for (const l of bausteinLagen(text)) {
    if (stelle > l.von && stelle < l.bis) return stelle - l.von <= l.bis - stelle ? l.von : l.bis;
  }
  return Math.max(0, Math.min(text.length, stelle));
}

/** Ergebnis einer Bearbeitung: neuer Text und Stelle der Schreibmarke. */
export interface Bearbeitung {
  text: string;
  stelle: number;
}

/**
 * Ersetzt den Bereich [von, bis) durch `einfuegen`. Bereichsgrenzen in einem
 * Baustein werden nach außen erweitert – ein Baustein wird nie zerteilt.
 * Eine Schreibmarke (von = bis) in einem Baustein rückt an den nächsten Rand.
 * Eingefügte {{…}} werden zu Bausteinen; `einzeilig` macht aus Zeilenumbrüchen Leerzeichen.
 */
export function ersetzen(text: string, von: number, bis: number, einfuegen: string, einzeilig = false): Bearbeitung {
  let a = Math.max(0, Math.min(von, bis, text.length));
  let b = Math.min(text.length, Math.max(von, bis));
  // Eine Schreibmarke im Baustein rückt an seinen Rand, eine Auswahl umfasst ihn ganz
  if (a === b) a = b = stelleAusserhalb(text, a);
  for (const l of bausteinLagen(text)) {
    if (a > l.von && a < l.bis) a = l.von;
    if (b > l.von && b < l.bis) b = l.bis;
  }
  let neu = textNormalisieren(einfuegen);
  if (einzeilig) neu = neu.replace(/\n+/g, ' ');
  return { text: text.slice(0, a) + neu + text.slice(b), stelle: a + neu.length };
}

/**
 * Rücktaste (`rueckwaerts`) bzw. Entf an der Stelle: Grenzt dort ein Baustein
 * an, entfällt er ganz. Sonst `null` – dann löscht der Browser selbst.
 */
export function bausteinLoeschen(text: string, stelle: number, rueckwaerts: boolean): Bearbeitung | null {
  const l = bausteinLagen(text).find((x) => (rueckwaerts ? x.bis === stelle : x.von === stelle));
  return l ? { text: text.slice(0, l.von) + text.slice(l.bis), stelle: l.von } : null;
}

/* ------------------------------------------------------------------ */
/* Ansicht → Text                                                      */
/* ------------------------------------------------------------------ */

/**
 * Das Nötigste eines DOM-Knotens, damit die Umwandlung ohne Browser prüfbar
 * bleibt. Bausteine tragen `data-baustein`, der Füller am Ende `data-fueller`.
 */
export interface KnotenArtig {
  nodeType: number;
  nodeName: string;
  nodeValue: string | null;
  childNodes: ArrayLike<KnotenArtig>;
  getAttribute?: (name: string) => string | null;
}

const BLOCK = new Set(['DIV', 'P', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'PRE', 'BLOCKQUOTE', 'TR']);

/**
 * Liest den Text aus der Ansicht: Textknoten wörtlich, Bausteine als
 * {{schluessel}}, <br> (außer als letztes Element) und Blöcke (<div>, <p> …, wie sie Browser beim
 * Bearbeiten einfügen) als Zeilenumbruch. Der Füller am Ende zählt nicht.
 */
export function ansichtZuText(wurzel: KnotenArtig): string {
  let aus = '';
  const lauf = (k: KnotenArtig) => {
    const kinder = Array.from(k.childNodes);
    kinder.forEach((kind) => {
      if (kind.nodeType === 3) {
        aus += kind.nodeValue ?? '';
        return;
      }
      if (kind.nodeType !== 1) return;
      const schluessel = kind.getAttribute?.('data-baustein');
      if (schluessel) {
        aus += bausteinText(schluessel);
        return;
      }
      if (kind.getAttribute?.('data-fueller') != null) return;
      if (kind.nodeName === 'BR') {
        // Ein <br> als letztes Element der Wurzel setzen Browser nur, damit eine leere Zeile sichtbar bleibt
        if (!(k === wurzel && kind === kinder[kinder.length - 1])) aus += '\n';
        return;
      }
      const block = BLOCK.has(kind.nodeName);
      // Ein Block beginnt in einer neuen Zeile – außer ganz am Anfang oder nach einem Umbruch
      if (block && aus.length > 0 && !aus.endsWith('\n')) aus += '\n';
      lauf(kind);
      // <div><br></div> ist eine leere Zeile: der <br> hat den Umbruch schon gebracht
      if (block && !aus.endsWith('\n') && kind !== kinder[kinder.length - 1]) aus += '\n';
    });
  };
  lauf(wurzel);
  return textNormalisieren(aus);
}
