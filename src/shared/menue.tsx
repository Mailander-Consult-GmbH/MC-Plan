/**
 * Kleines Auswahlmenü an einem Knopf (z. B. der Haken „Status ändern“ bzw.
 * „Erledigt“ mit mehreren Möglichkeiten).
 *
 * Das Menü liegt per Portal direkt im `body` und ist fest positioniert – so
 * schneiden es weder Karten (`.card { overflow: clip }`) noch Tabellen-
 * Scrollbereiche ab, und es erbt keine Tabellenausrichtung. Es öffnet unter
 * dem Knopf, bei zu wenig Platz darüber, bleibt waagerecht im Fenster und
 * scrollt selbst, wenn es höher ist als der Platz. Es schließt bei einem Klick
 * oder Tippen daneben, mit Escape oder Tab, beim Scrollen und bei einer
 * Größenänderung des Fensters. Pfeiltasten wechseln zwischen den Einträgen.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, ReactNode, RefObject } from 'react';
import { createPortal } from 'react-dom';

export interface MenueEintrag {
  key: string;
  inhalt: ReactNode;
  onWaehle: () => void;
  /** Rot hervorgehoben, z. B. „Eintrag löschen“. */
  gefahr?: boolean;
  /** Hervorgehoben als die derzeit gewählte Möglichkeit, z. B. der Wert eines Spaltenfilters. */
  aktiv?: boolean;
}

/** Abstand zum Knopf und zum Fensterrand in Pixeln. */
const ABSTAND = 4;
const RAND = 8;

export function AufklappMenue({
  anker,
  titel,
  eintraege,
  onSchliessen,
}: {
  /** Der Knopf, an dem das Menü hängt; ein Klick darauf schließt es nicht (das übernimmt der Knopf selbst). */
  anker: RefObject<HTMLElement | null>;
  titel?: ReactNode;
  eintraege: MenueEintrag[];
  /** `fokusZurueck`: Der Fokus soll zum Knopf zurück (Escape). */
  onSchliessen: (fokusZurueck: boolean) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [lage, setLage] = useState<CSSProperties>({ top: 0, left: 0, visibility: 'hidden' });
  const schliessen = useRef(onSchliessen);
  schliessen.current = onSchliessen;

  // Lage aus dem Knopf und der gemessenen Menügröße bestimmen
  useLayoutEffect(() => {
    const knopf = anker.current;
    const menue = ref.current;
    if (!knopf || !menue) return;
    const r = knopf.getBoundingClientRect();
    const breite = menue.offsetWidth;
    const hoehe = menue.scrollHeight + 2;
    const fensterB = document.documentElement.clientWidth;
    const fensterH = window.innerHeight;
    const unten = fensterH - r.bottom - ABSTAND - RAND;
    const oben = r.top - ABSTAND - RAND;
    let top: number;
    let maxHeight: number | undefined;
    if (hoehe <= unten || unten >= oben) {
      top = r.bottom + ABSTAND;
      if (hoehe > unten) maxHeight = Math.max(unten, 80);
    } else {
      maxHeight = hoehe > oben ? oben : undefined;
      top = r.top - ABSTAND - Math.min(hoehe, oben);
    }
    // Rechtsbündig zum Knopf; ragte es links hinaus, linksbündig – in jedem Fall im Fenster
    let left = r.right - breite;
    if (left < RAND) left = r.left;
    left = Math.max(RAND, Math.min(left, fensterB - RAND - breite));
    setLage({ top, left, maxHeight });
  }, [anker, eintraege.length]);

  // Fokus auf den ersten Eintrag, damit Tastatur und Bildschirmleser im Menü landen –
  // erst, wenn die Lage gesetzt ist: Solange das Menü zum Messen `visibility: hidden`
  // trägt, nimmt es keinen Fokus an.
  const fokussiert = useRef(false);
  useEffect(() => {
    if (fokussiert.current || lage.visibility === 'hidden') return;
    fokussiert.current = true;
    ref.current?.querySelector<HTMLButtonElement>('button[role="menuitem"]')?.focus({ preventScroll: true });
  }, [lage]);

  useEffect(() => {
    const drin = (ziel: EventTarget | null) =>
      ziel instanceof Node && (ref.current?.contains(ziel) || anker.current?.contains(ziel));
    // pointerdown erfasst Maus, Stift und Finger gleichermaßen
    const daneben = (e: PointerEvent) => {
      if (!drin(e.target)) schliessen.current(false);
    };
    const taste = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        schliessen.current(true);
      }
    };
    // Scrollt die Seite, liefe das fest positionierte Menü dem Knopf davon
    const gescrollt = (e: Event) => {
      if (!(e.target instanceof Node && ref.current?.contains(e.target))) schliessen.current(false);
    };
    const groesse = () => schliessen.current(false);
    document.addEventListener('pointerdown', daneben, true);
    document.addEventListener('keydown', taste, true);
    window.addEventListener('scroll', gescrollt, true);
    window.addEventListener('resize', groesse);
    return () => {
      document.removeEventListener('pointerdown', daneben, true);
      document.removeEventListener('keydown', taste, true);
      window.removeEventListener('scroll', gescrollt, true);
      window.removeEventListener('resize', groesse);
    };
  }, [anker]);

  const pfeile = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const knoepfe = Array.from(ref.current?.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]') ?? []);
    if (knoepfe.length === 0) return;
    const jetzt = knoepfe.indexOf(document.activeElement as HTMLButtonElement);
    let ziel = -1;
    if (e.key === 'ArrowDown') ziel = (jetzt + 1) % knoepfe.length;
    else if (e.key === 'ArrowUp') ziel = (jetzt - 1 + knoepfe.length) % knoepfe.length;
    else if (e.key === 'Home') ziel = 0;
    else if (e.key === 'End') ziel = knoepfe.length - 1;
    else if (e.key === 'Tab') {
      // Tab verlässt das Menü wie ein Klick daneben
      e.preventDefault();
      schliessen.current(true);
      return;
    }
    if (ziel < 0) return;
    e.preventDefault();
    knoepfe[ziel].focus();
  };

  return createPortal(
    <div className="aufklapp-menue" role="menu" ref={ref} style={lage} onKeyDown={pfeile}>
      {titel ? <div className="aufklapp-menue-titel">{titel}</div> : null}
      {eintraege.map((e) => (
        <button
          key={e.key}
          type="button"
          role="menuitem"
          className={[e.gefahr ? 'gefahr' : '', e.aktiv ? 'aktiv' : ''].filter(Boolean).join(' ') || undefined}
          aria-current={e.aktiv ? 'true' : undefined}
          onClick={e.onWaehle}
        >
          {e.inhalt}
        </button>
      ))}
    </div>,
    document.body,
  );
}
