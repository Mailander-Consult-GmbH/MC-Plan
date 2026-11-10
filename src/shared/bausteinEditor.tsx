/**
 * Baustein-Editor: ein Eingabefeld, das Platzhalter {{schluessel}} als
 * farbige, nicht teilbare Bausteine zeigt. Gespeichert (über `onChange`)
 * wird weiterhin der Text mit {{schluessel}}; Beschriftungen und Farben der
 * Bausteine kommen von außen. Fachfrei – die Umwandlung steht in bausteine.ts.
 *
 * Bearbeitet wird in einem contentEditable. Tippen übernimmt der Browser,
 * danach liest das Feld den Text zurück und zeichnet sich bei Abweichungen
 * (eingeschobene <div>/<br>, Formatierungen) sauber neu. Zeilenumbruch,
 * Einfügen aus der Zwischenablage (nur als reiner Text), Löschen eines
 * Bausteins per Rücktaste/Entf und Rückgängig/Wiederholen (eigener Verlauf)
 * erledigt das Feld selbst.
 */
import { useEffect, useImperativeHandle, useRef, type Ref } from 'react';
import {
  ansichtZuText,
  bausteinLoeschen,
  bausteinText,
  ersetzen,
  stelleAusserhalb,
  zerlegen,
  type Bearbeitung,
} from './bausteine';
import './bausteinEditor.css';

/** Farben der Bausteine (Klassen bst-ton-…); `unbekannt` für nicht hinterlegte Schlüssel. */
export type BausteinTon = 'blau' | 'gruen' | 'orange' | 'lila' | 'grau' | 'unbekannt';

export interface BausteinInfo {
  /** Beschriftung im Baustein, z.B. „Soll-Termin“. */
  label: string;
  ton: BausteinTon;
  /** Tooltip, z.B. Beschreibung und Beispielwert. */
  titel?: string;
}

export type BausteinVerzeichnis = Record<string, BausteinInfo>;

/** Bedienung von außen: Baustein an der (zuletzt gesetzten) Schreibmarke einfügen. */
export interface BausteinEditorGriff {
  einfuegen: (schluessel: string) => void;
  fokus: () => void;
}

/** Beschriftung und Farbe eines Schlüssels; Unbekanntes grau mit „unbekannt: …“. */
export function bausteinInfo(verzeichnis: BausteinVerzeichnis, schluessel: string): BausteinInfo {
  return verzeichnis[schluessel] ?? { label: `unbekannt: ${schluessel}`, ton: 'unbekannt', titel: bausteinText(schluessel) };
}

function bausteinElement(schluessel: string, verzeichnis: BausteinVerzeichnis): HTMLSpanElement {
  const info = bausteinInfo(verzeichnis, schluessel);
  const el = document.createElement('span');
  el.className = `bst-baustein bst-ton-${info.ton}`;
  el.contentEditable = 'false';
  el.setAttribute('data-baustein', schluessel);
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', `Baustein ${info.label}`);
  if (info.titel) el.title = info.titel;
  el.textContent = info.label;
  return el;
}

/** Zeichnet den Text als Textknoten und Bausteine. */
function zeichnen(wurzel: HTMLElement, text: string, verzeichnis: BausteinVerzeichnis) {
  const knoten: Node[] = zerlegen(text).map((t) =>
    t.art === 'text' ? document.createTextNode(t.text) : bausteinElement(t.schluessel, verzeichnis),
  );
  // Eine leere letzte Zeile zeigt der Browser nur mit einem <br> dahinter
  if (text.endsWith('\n')) {
    const br = document.createElement('br');
    br.setAttribute('data-fueller', '');
    knoten.push(br);
  }
  wurzel.replaceChildren(...knoten);
}

/** Stelle im Text zu einer Position im DOM: Länge des Textes davor. */
function stelleVon(wurzel: HTMLElement, node: Node, offset: number): number {
  const r = document.createRange();
  r.setStart(wurzel, 0);
  r.setEnd(node, offset);
  return ansichtZuText(r.cloneContents()).length;
}

/** Auswahl im Feld als Textstellen – `null`, wenn sie nicht im Feld liegt. */
function auswahlIn(wurzel: HTMLElement): { von: number; bis: number } | null {
  const sel = wurzel.ownerDocument.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const r = sel.getRangeAt(0);
  if (!wurzel.contains(r.startContainer) || !wurzel.contains(r.endContainer)) return null;
  return { von: stelleVon(wurzel, r.startContainer, r.startOffset), bis: stelleVon(wurzel, r.endContainer, r.endOffset) };
}

/** Setzt die Schreibmarke an eine Textstelle (nur in frisch gezeichneten Feldern). */
function schreibmarkeSetzen(wurzel: HTMLElement, stelle: number) {
  const r = document.createRange();
  let bisher = 0;
  let gesetzt = false;
  for (const kind of Array.from(wurzel.childNodes)) {
    if (kind.nodeType === Node.TEXT_NODE) {
      const laenge = kind.nodeValue?.length ?? 0;
      if (stelle <= bisher + laenge) {
        r.setStart(kind, stelle - bisher);
        gesetzt = true;
        break;
      }
      bisher += laenge;
      continue;
    }
    const el = kind as HTMLElement;
    if (el.hasAttribute('data-fueller') || stelle <= bisher) {
      r.setStartBefore(kind);
      gesetzt = true;
      break;
    }
    bisher += bausteinText(el.getAttribute('data-baustein') ?? '').length;
  }
  if (!gesetzt) r.setStart(wurzel, wurzel.childNodes.length);
  r.collapse(true);
  const sel = wurzel.ownerDocument.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(r);
}

type Art = 'tippen' | 'sonst';
const ZUSAMMENFASSEN_MS = 800;

export function BausteinEditor({
  wert,
  onChange,
  bausteine,
  einzeilig = false,
  label,
  leer,
  id,
  zeilen = 8,
  onFokus,
  griff,
}: {
  wert: string;
  onChange: (text: string) => void;
  bausteine: BausteinVerzeichnis;
  /** Ohne Zeilenumbrüche (etwa ein Betreff). */
  einzeilig?: boolean;
  /** Name des Felds für Bildschirmleser. */
  label: string;
  /** Hinweis im leeren Feld. */
  leer?: string;
  id?: string;
  /** Mindesthöhe in Zeilen (mehrzeilig). */
  zeilen?: number;
  onFokus?: () => void;
  griff?: Ref<BausteinEditorGriff>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const text = useRef(wert);
  const zuletzt = useRef<{ von: number; bis: number } | null>(null);
  const verlauf = useRef<{ stapel: Bearbeitung[]; index: number; art: Art; zeit: number }>({
    stapel: [{ text: wert, stelle: wert.length }],
    index: 0,
    art: 'sonst',
    zeit: 0,
  });
  const komponiert = useRef(false);
  const aktuell = useRef({ onChange, bausteine, einzeilig });
  aktuell.current = { onChange, bausteine, einzeilig };

  /** Neuer Stand: in den Verlauf (Tippen wird zusammengefasst) und nach außen melden. */
  const merken = (b: Bearbeitung, art: Art) => {
    const v = verlauf.current;
    const jetzt = Date.now();
    v.stapel = v.stapel.slice(0, v.index + 1);
    if (art === 'tippen' && v.art === 'tippen' && jetzt - v.zeit < ZUSAMMENFASSEN_MS && v.index > 0) v.stapel[v.index] = b;
    else v.stapel.push(b);
    if (v.stapel.length > 200) v.stapel.shift();
    v.index = v.stapel.length - 1;
    v.art = art;
    v.zeit = jetzt;
    if (b.text !== text.current) {
      text.current = b.text;
      aktuell.current.onChange(b.text);
    }
  };

  /** Eigene Bearbeitung: neu zeichnen, Schreibmarke setzen, merken. */
  const anwenden = (b: Bearbeitung, art: Art = 'sonst') => {
    const el = ref.current;
    if (!el) return;
    zeichnen(el, b.text, aktuell.current.bausteine);
    if (el.ownerDocument.activeElement === el) schreibmarkeSetzen(el, b.stelle);
    zuletzt.current = { von: b.stelle, bis: b.stelle };
    merken(b, art);
  };

  const ersetzeAuswahl = (einfuegen: string) => {
    const el = ref.current;
    if (!el) return;
    const sel = auswahlIn(el) ?? zuletzt.current ?? { von: text.current.length, bis: text.current.length };
    anwenden(ersetzen(text.current, sel.von, sel.bis, einfuegen, aktuell.current.einzeilig));
  };

  const springen = (schritt: -1 | 1) => {
    const v = verlauf.current;
    const ziel = v.index + schritt;
    if (ziel < 0 || ziel >= v.stapel.length) return;
    v.index = ziel;
    v.art = 'sonst';
    const b = v.stapel[ziel];
    const el = ref.current;
    if (!el) return;
    zeichnen(el, b.text, aktuell.current.bausteine);
    schreibmarkeSetzen(el, b.stelle);
    text.current = b.text;
    aktuell.current.onChange(b.text);
  };

  useImperativeHandle(griff, () => ({
    einfuegen: (schluessel: string) => {
      const el = ref.current;
      if (!el) return;
      const sel = auswahlIn(el) ?? zuletzt.current ?? { von: text.current.length, bis: text.current.length };
      el.focus({ preventScroll: true });
      anwenden(ersetzen(text.current, sel.von, sel.bis, bausteinText(schluessel), aktuell.current.einzeilig));
    },
    fokus: () => ref.current?.focus(),
  }));

  // Wert von außen (erstes Zeichnen, Wechsel der Vorlage) und geänderte Beschriftungen.
  // Eigene Eingaben kommen als derselbe Wert zurück und zeichnen nicht neu (Schreibmarke bleibt).
  const gezeichnet = useRef<BausteinVerzeichnis | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const extern = wert !== text.current;
    if (!extern && gezeichnet.current === bausteine) return;
    if (extern) {
      text.current = wert;
      verlauf.current = { stapel: [{ text: wert, stelle: wert.length }], index: 0, art: 'sonst', zeit: 0 };
      zuletzt.current = null;
    }
    const sel = el.ownerDocument.activeElement === el ? auswahlIn(el) : null;
    zeichnen(el, text.current, bausteine);
    if (sel) schreibmarkeSetzen(el, extern ? text.current.length : sel.bis);
    gezeichnet.current = bausteine;
  }, [wert, bausteine]);

  // Native Ereignisse: beforeinput (Zeilenumbruch, Löschen, Formatieren, Verlauf) und die Schreibmarke
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const vorEingabe = (e: InputEvent) => {
      const t = e.inputType;
      if (t === 'historyUndo' || t === 'historyRedo') {
        e.preventDefault();
        springen(t === 'historyUndo' ? -1 : 1);
      } else if (t.startsWith('format') || t === 'insertFromDrop' || t === 'deleteByDrag') {
        e.preventDefault();
      } else if (t === 'insertParagraph' || t === 'insertLineBreak') {
        e.preventDefault();
        if (!aktuell.current.einzeilig) ersetzeAuswahl('\n');
      } else if (t === 'insertFromPaste' || t === 'insertReplacementText') {
        // Einfügen läuft über das paste-Ereignis; was dennoch kommt, als reiner Text
        const rein = e.dataTransfer?.getData('text/plain') ?? e.data;
        if (rein != null) {
          e.preventDefault();
          ersetzeAuswahl(rein);
        }
      } else if (t === 'deleteContentBackward' || t === 'deleteContentForward') {
        const sel = auswahlIn(el);
        if (!sel || sel.von !== sel.bis) return;
        const b = bausteinLoeschen(text.current, sel.von, t === 'deleteContentBackward');
        if (b) {
          e.preventDefault();
          anwenden(b);
        }
      }
    };
    const auswahlGeaendert = () => {
      if (el.ownerDocument.activeElement !== el) return;
      const sel = auswahlIn(el);
      if (sel) zuletzt.current = sel;
    };
    el.addEventListener('beforeinput', vorEingabe);
    el.ownerDocument.addEventListener('selectionchange', auswahlGeaendert);
    return () => {
      el.removeEventListener('beforeinput', vorEingabe);
      el.ownerDocument.removeEventListener('selectionchange', auswahlGeaendert);
    };
    // springen/anwenden lesen nur Refs – die Handler bleiben gültig
  }, []);

  /** Nach einer Eingabe des Browsers: Text zurücklesen, Abweichungen sauber neu zeichnen. */
  const eingabe = () => {
    const el = ref.current;
    if (!el || komponiert.current) return;
    const neu = ansichtZuText(el);
    const sel = auswahlIn(el);
    const stelle = stelleAusserhalb(neu, sel ? sel.bis : neu.length);
    const sauber = document.createElement('div');
    zeichnen(sauber, neu, aktuell.current.bausteine);
    if (sauber.innerHTML !== el.innerHTML) {
      zeichnen(el, neu, aktuell.current.bausteine);
      schreibmarkeSetzen(el, stelle);
    }
    zuletzt.current = { von: stelle, bis: stelle };
    merken({ text: neu, stelle }, 'tippen');
  };

  /** Ausgewählter Teil als Text mit {{…}} – für Kopieren und Ausschneiden. */
  const auswahlText = () => {
    const sel = ref.current?.ownerDocument.getSelection();
    if (!sel || sel.rangeCount === 0) return '';
    return ansichtZuText(sel.getRangeAt(0).cloneContents());
  };

  return (
    <div
      ref={ref}
      id={id}
      className={`bst-feld${einzeilig ? ' bst-einzeilig' : ''}`}
      style={einzeilig ? undefined : { minHeight: `calc(${zeilen} * 1.55em + 20px)` }}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-multiline={!einzeilig}
      aria-label={label}
      data-leer={leer}
      spellCheck
      onFocus={onFokus}
      onInput={eingabe}
      onCompositionStart={() => (komponiert.current = true)}
      onCompositionEnd={() => {
        komponiert.current = false;
        eingabe();
      }}
      onKeyDown={(e) => {
        const mod = e.ctrlKey || e.metaKey;
        const taste = e.key.toLowerCase();
        if (mod && !e.altKey && (taste === 'z' || taste === 'y')) {
          e.preventDefault();
          springen(taste === 'y' || e.shiftKey ? 1 : -1);
        } else if (mod && (taste === 'b' || taste === 'i' || taste === 'u')) {
          e.preventDefault();
        } else if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
          e.preventDefault();
          if (!einzeilig) ersetzeAuswahl('\n');
        }
      }}
      onPaste={(e) => {
        e.preventDefault();
        ersetzeAuswahl(e.clipboardData.getData('text/plain'));
      }}
      onCopy={(e) => {
        e.preventDefault();
        e.clipboardData.setData('text/plain', auswahlText());
      }}
      onCut={(e) => {
        e.preventDefault();
        e.clipboardData.setData('text/plain', auswahlText());
        ersetzeAuswahl('');
      }}
      onDragStart={(e) => e.preventDefault()}
      onDrop={(e) => e.preventDefault()}
    />
  );
}

/** Nur lesend: Text mit Bausteinen, etwa als Anriss in einer Liste. */
export function BausteinText({ text, bausteine }: { text: string; bausteine: BausteinVerzeichnis }) {
  return (
    <>
      {zerlegen(text).map((t, i) => {
        if (t.art === 'text') return <span key={i}>{t.text}</span>;
        const info = bausteinInfo(bausteine, t.schluessel);
        return (
          <span key={i} className={`bst-baustein bst-ton-${info.ton}`} role="img" aria-label={`Baustein ${info.label}`} title={info.titel}>
            {info.label}
          </span>
        );
      })}
    </>
  );
}
