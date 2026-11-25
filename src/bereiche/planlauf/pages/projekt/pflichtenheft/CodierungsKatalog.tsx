/**
 * Katalog einer Kategorie der Plancodierung als Liste: je Zeile Code und
 * Bezeichnung in eigenen Feldern, Gruppenüberschriften als abgesetzte Zeilen.
 * Gespeichert bleibt der Katalog als Text (`CodierungsKategorie.eintraege`) –
 * die Liste liest ihn mit `eintraegeLesen` und schreibt ihn bei jeder Änderung
 * mit `eintraegeSchreiben` zurück (domain/plancodierung.ts).
 *
 * Die Zeilen hält die Liste selbst (mit eigenen Schlüsseln): Aus dem Text
 * gelesen wird nur, wenn er sich von außen ändert – sonst verlöre eine Eingabe
 * leere Zeilen und Leerzeichen am Ende, die `eintraegeSchreiben` abschneidet.
 * Zustand der Liste ist nur die Folge der Zeilen; ihren Inhalt führt jede
 * Zeile selbst (und die Liste in einer Referenz). So zeichnet ein Tastendruck
 * nur seine Zeile neu, nicht alle – lange Kataloge haben über hundert.
 *
 * Bedienung: Enter legt unter der Zeile einen Eintrag an, ↑/↓ wechseln die
 * Zeile, Rückschritt in einer leeren Zeile entfernt sie. Aus Excel kopierte
 * Zeilen (Code und Bezeichnung in zwei Spalten) fügt die Liste als Einträge
 * ein. Lange Kataloge lassen sich durchsuchen; was während einer Suche angelegt
 * oder geändert wird, bleibt sichtbar, bis sich der Suchtext ändert.
 */
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import type { ClipboardEvent, KeyboardEvent, ReactNode, RefObject } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { eintraegeLesen, eintraegeSchreiben, type CodierungsZeile } from '../../../domain/plancodierung';
import { Icon } from '../../../../../shared/icons';
import { listenEintrag } from '../../../../../shared/bewegung';
import { Search } from '../../../../../shared/ui';

/** Ab so vielen Einträgen erscheint die Suche. */
const SUCHE_AB = 15;

type ListenZeile = CodierungsZeile & { id: string };
type Spalte = 'code' | 'bezeichnung' | 'titel';

let zaehler = 0;
const zeilenId = () => `z${++zaehler}`;
const mitIds = (zeilen: CodierungsZeile[]): ListenZeile[] => zeilen.map((z) => ({ ...z, id: zeilenId() }));
const leererEintrag = (): ListenZeile => ({ art: 'eintrag', code: '', bezeichnung: '', id: zeilenId() });
const ohneIds = (zeilen: ListenZeile[]): CodierungsZeile[] =>
  zeilen.map((z) => (z.art === 'gruppe' ? { art: 'gruppe', titel: z.titel } : { art: 'eintrag', code: z.code, bezeichnung: z.bezeichnung }));
const istLeer = (z: ListenZeile) => (z.art === 'gruppe' ? !z.titel.trim() : !z.code.trim() && !z.bezeichnung.trim());

/** Zahl der verschiedenen Codes – wie `pruefRegelText` sie nennt. */
export function codeZahl(zeilen: readonly CodierungsZeile[]): number {
  return new Set(zeilen.flatMap((z) => (z.art === 'eintrag' && z.code.trim() ? [z.code.trim()] : []))).size;
}

/** Zeilen, die zur Suche passen – samt der Überschriften ihrer Gruppe; passt eine Überschrift, die ganze Gruppe. */
function treffer(zeilen: ListenZeile[], suche: string): Set<string> {
  const s = suche.trim().toLowerCase();
  const passt = (t: string) => t.toLowerCase().includes(s);
  const ids = new Set<string>();
  let gruppe: ListenZeile | null = null;
  let gruppePasst = false;
  for (const z of zeilen) {
    if (z.art === 'gruppe') {
      gruppe = z;
      gruppePasst = passt(z.titel);
      if (gruppePasst) ids.add(z.id);
      continue;
    }
    if (gruppePasst || passt(z.code) || passt(z.bezeichnung)) {
      ids.add(z.id);
      if (gruppe) ids.add(gruppe.id);
    }
  }
  return ids;
}

export function CodierungsKatalog({
  text,
  onText,
  titel,
  zusatz,
}: {
  /** Einträge der Kategorie als Text. */
  text: string;
  onText: (text: string) => void;
  /** Name der Kategorie – für die Beschriftungen. */
  titel: string;
  /** Steht rechts im Kopf des Katalogs (Umschalter Liste/Text). */
  zusatz?: ReactNode;
}) {
  /** Die Zeilen mit ihrem jüngsten Inhalt. */
  const zeilenRef = useRef<ListenZeile[] | null>(null);
  if (zeilenRef.current === null) zeilenRef.current = mitIds(eintraegeLesen(text));
  /** Zählt die Änderungen der Folge (Anlegen, Entfernen, Einfügen, Text von außen) – nur sie zeichnen alle Zeilen neu. */
  const [folge, setFolge] = useState(0);
  /** Der zuletzt von der Liste geschriebene Text – ein anderer kam von außen. */
  const geschrieben = useRef(text);
  const onTextRef = useRef(onText);
  onTextRef.current = onText;

  const [suche, setSuche] = useState('');
  const sucheRef = useRef(suche);
  sucheRef.current = suche;
  /** Sichtbare Zeilen während einer Suche; `null` = alle. */
  const [sichtbar, setSichtbar] = useState<Set<string> | null>(null);
  const sichtbarRef = useRef(sichtbar);
  sichtbarRef.current = sichtbar;
  const [fokus, setFokus] = useState<{ id: string; spalte: Spalte | 'weg' } | null>(null);
  const rumpfRef = useRef<HTMLDivElement>(null);
  const eintragKnopf = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (text === geschrieben.current) return;
    geschrieben.current = text;
    zeilenRef.current = mitIds(eintraegeLesen(text));
    setFolge((n) => n + 1);
    // Die Zeilen haben neue Schlüssel – eine laufende Suche gilt für sie neu.
    if (sucheRef.current.trim()) setSichtbar(treffer(zeilenRef.current, sucheRef.current));
  }, [text]);

  /** Neuer Inhalt: in die Referenz und als Text an die Kategorie. */
  const schreiben = useCallback((neu: ListenZeile[]) => {
    zeilenRef.current = neu;
    const t = eintraegeSchreiben(ohneIds(neu));
    if (t !== geschrieben.current) {
      geschrieben.current = t;
      onTextRef.current(t);
    }
  }, []);
  /** Neue Folge der Zeilen (Anlegen, Entfernen, Einfügen). */
  const setzen = useCallback(
    (neu: ListenZeile[], sichtbarDazu: string[] = []) => {
      schreiben(neu);
      setFolge((n) => n + 1);
      if (sichtbarDazu.length) setSichtbar((s) => (s ? new Set([...s, ...sichtbarDazu]) : s));
    },
    [schreiben],
  );

  const aendern = useCallback(
    (id: string, spalte: Spalte, wert: string) =>
      schreiben(zeilenRef.current!.map((z) => (z.id === id ? ({ ...z, [spalte]: wert } as ListenZeile) : z))),
    [schreiben],
  );

  /** Fügt Zeilen hinter `nachId` ein (ohne: am Ende); mit `ersetzen` an die Stelle dieser Zeile. */
  const einfuegen = useCallback(
    (neue: ListenZeile[], nachId: string | null, ersetzen = false) => {
      const alt = zeilenRef.current!;
      const i = nachId ? alt.findIndex((z) => z.id === nachId) : -1;
      const ab = i < 0 ? alt.length : i + 1;
      const vor = ersetzen && i >= 0 ? alt.slice(0, i) : alt.slice(0, ab);
      setzen([...vor, ...neue, ...alt.slice(ab)], neue.map((z) => z.id));
    },
    [setzen],
  );

  const entfernen = useCallback(
    (id: string) => {
      const alt = zeilenRef.current!;
      const i = alt.findIndex((z) => z.id === id);
      if (i < 0) return;
      // Der Fokus geht an die Zeile, die nachrückt, sonst an die davor, sonst an „Eintrag“.
      const s = sichtbarRef.current;
      const zeigt = (z: ListenZeile) => !s || s.has(z.id);
      const nach = alt.slice(i + 1).find(zeigt) ?? alt.slice(0, i).reverse().find(zeigt);
      setzen(alt.filter((z) => z.id !== id));
      if (nach) setFokus({ id: nach.id, spalte: 'weg' });
      else requestAnimationFrame(() => eintragKnopf.current?.focus());
    },
    [setzen],
  );

  useEffect(() => {
    if (!fokus || !rumpfRef.current) return;
    const zeile = rumpfRef.current.querySelector<HTMLElement>(`[data-pc-zeile="${fokus.id}"]`);
    (zeile?.querySelector<HTMLElement>(`[data-spalte="${fokus.spalte}"]`) ?? zeile?.querySelector<HTMLElement>('[data-spalte]'))?.focus();
    setFokus(null);
  }, [fokus]);

  const amEnde = (art: 'eintrag' | 'gruppe') => {
    // Anlegen beendet eine Suche – die neue Zeile steht am Ende des ganzen Katalogs.
    setSuche('');
    setSichtbar(null);
    const neu: ListenZeile = art === 'gruppe' ? { art: 'gruppe', titel: '', id: zeilenId() } : leererEintrag();
    setzen([...zeilenRef.current!, neu]);
    setFokus({ id: neu.id, spalte: art === 'gruppe' ? 'titel' : 'code' });
  };

  /** Tastatur in den Feldern (für alle Zeilen an einer Stelle). */
  const tasten = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      const feld = e.target as HTMLElement;
      const spalte = feld.dataset.spalte as Spalte | 'weg' | undefined;
      const zeileEl = feld.closest<HTMLElement>('[data-pc-zeile]');
      if (!spalte || spalte === 'weg' || !zeileEl || e.nativeEvent.isComposing) return;
      const id = zeileEl.dataset.pcZeile!;
      const zeilenEls = () => [...(rumpfRef.current?.querySelectorAll<HTMLElement>('[data-pc-zeile]') ?? [])];
      if (e.key === 'Enter' && !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const neu = leererEintrag();
        einfuegen([neu], id);
        setFokus({ id: neu.id, spalte: 'code' });
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const alle = zeilenEls();
        const ziel = alle[alle.indexOf(zeileEl) + (e.key === 'ArrowDown' ? 1 : -1)];
        if (!ziel) return;
        e.preventDefault();
        (ziel.querySelector<HTMLElement>(`[data-spalte="${spalte}"]`) ?? ziel.querySelector<HTMLElement>('[data-spalte]'))?.focus();
        return;
      }
      if (e.key === 'Backspace' && (spalte === 'code' || spalte === 'titel')) {
        const z = zeilenRef.current!.find((x) => x.id === id);
        const eingabe = feld as HTMLInputElement;
        if (!z || !istLeer(z) || eingabe.selectionStart !== 0 || eingabe.selectionEnd !== 0) return;
        e.preventDefault();
        const alle = zeilenEls();
        const davor = alle[alle.indexOf(zeileEl) - 1];
        setzen(zeilenRef.current!.filter((x) => x.id !== id));
        const ziel = davor?.querySelector<HTMLInputElement>('[data-spalte="bezeichnung"], [data-spalte="titel"]');
        if (ziel) {
          ziel.focus();
          ziel.setSelectionRange(ziel.value.length, ziel.value.length);
        } else {
          requestAnimationFrame(() => eintragKnopf.current?.focus());
        }
      }
    },
    [einfuegen, setzen],
  );

  /** Einfügen mehrerer Zeilen (aus Excel: Code und Bezeichnung durch Tabulator getrennt). */
  const einfuegenAusZwischenablage = useCallback(
    (e: ClipboardEvent<HTMLDivElement>) => {
      const zeileEl = (e.target as HTMLElement).closest<HTMLElement>('[data-pc-zeile]');
      const inhalt = e.clipboardData.getData('text/plain');
      if (!zeileEl || !/[\t\n]/.test(inhalt.replace(/\s+$/, ''))) return;
      const neue = mitIds(eintraegeLesen(inhalt));
      if (neue.length === 0) return;
      e.preventDefault();
      const id = zeileEl.dataset.pcZeile!;
      const z = zeilenRef.current!.find((x) => x.id === id);
      einfuegen(neue, id, !!z && istLeer(z));
      const letzte = neue[neue.length - 1];
      setFokus({ id: letzte.id, spalte: letzte.art === 'gruppe' ? 'titel' : 'bezeichnung' });
    },
    [einfuegen],
  );

  const sucheSetzen = (v: string) => {
    setSuche(v);
    setSichtbar(v.trim() ? treffer(zeilenRef.current!, v) : null);
  };

  // Gelesen bei jedem Zeichnen – die Liste zeichnet mit jeder gespeicherten Eingabe neu (neuer `text`).
  const zeilen = zeilenRef.current;
  const codes = codeZahl(zeilen);
  const gezeigteCodes = sichtbar ? codeZahl(zeilen.filter((z) => sichtbar.has(z.id))) : codes;
  const mitSuche = zeilen.filter((z) => z.art === 'eintrag').length >= SUCHE_AB || suche !== '';
  const name = titel.trim() ? `„${titel.trim()}“` : 'dieser Kategorie';

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h4 className="font-medium tracking-tight">Katalog</h4>
        <span className="text-[12.5px] tabular-nums text-gedaempft" aria-live="polite">
          {sichtbar ? `${gezeigteCodes} von ${codes}` : codes} {codes === 1 ? 'Code' : 'Codes'}
        </span>
        {mitSuche ? (
          <div className="order-last w-full min-w-0 @xl:order-none @xl:ml-auto @xl:w-60">
            <Search value={suche} onChange={sucheSetzen} placeholder="Code oder Bezeichnung suchen" />
          </div>
        ) : null}
        <div className={mitSuche ? 'ml-auto @xl:ml-0' : 'ml-auto'}>{zusatz}</div>
      </div>

      <div className="pc-katalog">
        <motion.div
          layoutScroll
          ref={rumpfRef}
          className="pc-katalog-rumpf"
          onKeyDown={tasten}
          onPaste={einfuegenAusZwischenablage}
          role="group"
          aria-label={`Katalog ${name}`}
        >
          <KatalogRumpf folge={folge} sichtbar={sichtbar} zeilenRef={zeilenRef} onAendern={aendern} onEntfernen={entfernen} />
        </motion.div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button ref={eintragKnopf} type="button" className="btn btn-outline btn-sm" onClick={() => amEnde('eintrag')}>
          <Icon name="plus" size={13} /> Eintrag
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => amEnde('gruppe')}>
          <Icon name="plus" size={13} /> Gruppe
        </button>
        <span className="text-[11.5px] text-gedaempft">Enter legt darunter einen Eintrag an · Zeilen aus Excel lassen sich einfügen</span>
      </div>
    </div>
  );
}

/**
 * Die Zeilen des Katalogs. Zeichnet nur neu, wenn sich die Folge oder die
 * Auswahl der Suche ändert – nicht bei jedem Tastendruck in einer Zeile.
 */
const KatalogRumpf = memo(function KatalogRumpf({
  sichtbar,
  zeilenRef,
  onAendern,
  onEntfernen,
}: {
  /** Nur als Anlass zum Neuzeichnen. */
  folge: number;
  sichtbar: Set<string> | null;
  zeilenRef: RefObject<ListenZeile[] | null>;
  onAendern: (id: string, spalte: Spalte, wert: string) => void;
  onEntfernen: (id: string) => void;
}) {
  const zeilen = zeilenRef.current ?? [];
  const gezeigt = sichtbar ? zeilen.filter((z) => sichtbar.has(z.id)) : zeilen;
  if (zeilen.length === 0) {
    return (
      <div className="pc-katalog-leer">
        <p className="font-medium">Noch kein Eintrag</p>
        <p className="mt-1 text-[12.5px] text-gedaempft">Einträge mit „Eintrag“ anlegen oder aus Excel einfügen – auch unter „Als Text“.</p>
      </div>
    );
  }
  if (gezeigt.length === 0) {
    return (
      <div className="pc-katalog-leer">
        <p className="font-medium">Kein Eintrag gefunden</p>
        <p className="mt-1 text-[12.5px] text-gedaempft">Für diese Suche gibt es keinen Treffer.</p>
      </div>
    );
  }
  return (
    <>
      <div className="pc-kzeile kopf" aria-hidden="true">
        <span>Code</span>
        <span>Bezeichnung</span>
      </div>
      {sichtbar ? (
        // Während einer Suche ohne Bewegung: Die Auswahl wechselt auf einen Schlag.
        gezeigt.map((z) => <KatalogZeile key={z.id} start={z} onAendern={onAendern} onEntfernen={onEntfernen} />)
      ) : (
        <AnimatePresence initial={false}>
          {gezeigt.map((z) => (
            <KatalogZeile key={z.id} start={z} onAendern={onAendern} onEntfernen={onEntfernen} bewegt />
          ))}
        </AnimatePresence>
      )}
    </>
  );
});

/** Eine Zeile: Eintrag (Code, Bezeichnung) oder Überschrift. Ihren Inhalt führt sie selbst, ab `start`. */
const KatalogZeile = memo(function KatalogZeile({
  start,
  onAendern,
  onEntfernen,
  bewegt = false,
}: {
  start: ListenZeile;
  onAendern: (id: string, spalte: Spalte, wert: string) => void;
  onEntfernen: (id: string) => void;
  bewegt?: boolean;
}) {
  const [z, setZ] = useState(start);
  const setze = (spalte: Spalte, wert: string) => {
    setZ((alt) => ({ ...alt, [spalte]: wert }) as ListenZeile);
    onAendern(z.id, spalte, wert);
  };
  const inhalt =
    z.art === 'gruppe' ? (
      <>
        <input
          className="pc-zelle"
          data-spalte="titel"
          value={z.titel}
          onChange={(e) => setze('titel', e.target.value)}
          placeholder="Überschrift der Gruppe"
          aria-label="Überschrift der Gruppe"
        />
        <button
          type="button"
          className="btn-icon pc-weg"
          data-spalte="weg"
          onClick={() => onEntfernen(z.id)}
          aria-label={`Gruppe ${z.titel.trim() ? `„${z.titel.trim()}“` : 'ohne Überschrift'} entfernen`}
          title="Überschrift entfernen – die Einträge bleiben"
        >
          <Icon name="schliessen" size={14} />
        </button>
      </>
    ) : (
      <>
        <input
          className="pc-zelle code"
          data-spalte="code"
          value={z.code}
          onChange={(e) => setze('code', e.target.value)}
          placeholder="Code"
          aria-label="Code"
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
        />
        <input
          className="pc-zelle"
          data-spalte="bezeichnung"
          value={z.bezeichnung}
          onChange={(e) => setze('bezeichnung', e.target.value)}
          placeholder={z.code.trim() ? 'Bezeichnung' : 'Bezeichnung oder Erläuterung ohne Code'}
          aria-label={z.code.trim() ? `Bezeichnung zu ${z.code.trim()}` : 'Bezeichnung'}
        />
        <button
          type="button"
          className="btn-icon pc-weg"
          data-spalte="weg"
          onClick={() => onEntfernen(z.id)}
          aria-label={`Eintrag ${z.code.trim() || z.bezeichnung.trim() ? `„${z.code.trim() || z.bezeichnung.trim()}“` : 'ohne Inhalt'} entfernen`}
          title="Eintrag entfernen"
        >
          <Icon name="schliessen" size={14} />
        </button>
      </>
    );
  const klasse = `pc-kzeile${z.art === 'gruppe' ? ' gruppe' : ''}`;
  return bewegt ? (
    <motion.div className={klasse} data-pc-zeile={z.id} {...listenEintrag}>
      {inhalt}
    </motion.div>
  ) : (
    <div className={klasse} data-pc-zeile={z.id}>
      {inhalt}
    </div>
  );
});
