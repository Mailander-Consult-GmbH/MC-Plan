/**
 * Kleine Bausteine des Controllings: Stunden und Prozent mit Vorzeichen,
 * Lesen einer Zahleneingabe („1,5“, „-0,5“, „10 %“), das Eingabefeld für
 * Aufschläge und abgerechnete Stunden, das beim Verlassen bzw. mit Enter
 * speichert, die
 * Auswahl der Filter, solange die Seite offen ist, das Menü „Mehr“ (⋯) für
 * seltene Aktionen (`MehrMenue`, über `AufklappMenue`) und der Kopf eines
 * Schritts auf der Seite eines offenen Leistungsnachweises (`SchrittKopf`).
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from '../../../../shared/icons';
import { AufklappMenue } from '../../../../shared/menue';
import { useToast } from '../../../../shared/toast';
import { AUFSCHLAG_KEINE_ZAHL } from '../../domain/nachweis';
import { runden, stundenText } from '../../domain/zeitraum';
import './controlling.css';

/** Aufschlag mit Vorzeichen: „+1,50“, „-0,50“; 0 als „–“. */
export function aufschlagText(stunden: number): string {
  if (!stunden) return '–';
  return `${stunden > 0 ? '+' : ''}${stundenText(stunden)}`;
}

/** Aufschlag im Eingabefeld: „+1,50“, „-0,50“; 0 bleibt leer. */
export function aufschlagFeld(stunden: number): string {
  return stunden ? `${stunden > 0 ? '+' : ''}${stundenText(stunden)}` : '';
}

/** Prozent mit Vorzeichen: „+10 %“, „-2,5 %“; 0 bleibt leer. */
export function prozentFeld(prozent: number): string {
  return prozent ? `${prozent > 0 ? '+' : ''}${prozent.toLocaleString('de-DE', { maximumFractionDigits: 2 })} %` : '';
}

/**
 * Liest eine Stundenangabe: Komma oder Punkt, Vorzeichen erlaubt, „Std.“ bzw.
 * „h“ am Ende darf stehen – mit `prozent` stattdessen „%“. Leer → null;
 * keine Zahl → undefined.
 */
export function zahlLesen(text: string, prozent = false): number | null | undefined {
  const t = text
    .replace(/\s+/g, '')
    .replace(/[−–]/g, '-')
    .replace(prozent ? /%$/ : /(std\.?|h)$/i, '');
  if (!t) return null;
  if (!/^[+-]?(\d+([.,]\d*)?|[.,]\d+)$/.test(t)) return undefined;
  const wert = Number(t.replace(',', '.'));
  return Number.isFinite(wert) ? wert : undefined;
}

/**
 * Eingabefeld für Stunden, das beim Verlassen oder mit Enter speichert
 * (Escape verwirft). `onSetzen` erhält die Zahl (null = leer) und liefert die
 * Meldung des Stores oder null; eine Meldung erscheint am Feld und als
 * Hinweis, die Eingabe bleibt zum Verbessern stehen.
 */
export function StundenFeld({
  wert,
  anzeige,
  onSetzen,
  label,
  platzhalter,
  klasse = '',
  prozent = false,
}: {
  wert: number;
  /** Text des Felds zum Wert. */
  anzeige: (stunden: number) => string;
  onSetzen: (stunden: number | null) => string | null;
  /** Beschriftung für Bildschirmleser, etwa „Aufschlag KW 44“. */
  label: string;
  platzhalter?: string;
  klasse?: string;
  /** Eingabe in Prozent („10 %“) statt in Stunden. */
  prozent?: boolean;
}) {
  const toast = useToast();
  const [text, setText] = useState(() => anzeige(wert));
  const [fehler, setFehler] = useState<string | null>(null);
  const fokus = useRef(false);

  // Ändert sich der Wert von außen (Speichern, Zurücksetzen), folgt das Feld – nicht während der Eingabe
  useEffect(() => {
    if (fokus.current) return;
    setText(anzeige(wert));
    setFehler(null);
    // Nur am Wert: `anzeige` ist je Feld fest, und eine Meldung soll bis zur nächsten Eingabe stehen bleiben
  }, [wert]);

  const uebernehmen = () => {
    const zahl = zahlLesen(text, prozent);
    // Unverändert (auch „1,5“ statt „+1,50“, etwa nach Enter und Verlassen): nur die Schreibweise angleichen
    if (text.trim() === anzeige(wert).trim() || (typeof zahl === 'number' && runden(zahl) === runden(wert))) {
      setText(anzeige(wert));
      setFehler(null);
      return;
    }
    const meldung = zahl === undefined ? AUFSCHLAG_KEINE_ZAHL : onSetzen(zahl);
    setFehler(meldung);
    if (meldung) toast(meldung);
  };

  return (
    <span className={`ln-co-feld ${klasse}`}>
      <input
        className={`input ln-co-zahl ${fehler ? 'ln-co-fehlerhaft' : ''}`}
        inputMode="decimal"
        value={text}
        placeholder={platzhalter}
        aria-label={label}
        aria-invalid={fehler ? true : undefined}
        title={fehler ?? undefined}
        onFocus={() => {
          fokus.current = true;
        }}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          fokus.current = false;
          uebernehmen();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            uebernehmen();
          }
          if (e.key === 'Escape') {
            e.stopPropagation();
            setText(anzeige(wert));
            setFehler(null);
          }
        }}
      />
      {fehler ? (
        <span className="ln-co-fehler" role="alert">
          {fehler}
        </span>
      ) : null}
    </span>
  );
}

/** Gespeicherte Auswahl der Ansichten (Filter), solange die Seite offen ist – auch über Seitenwechsel. */
export function useAuswahl<T>(speicher: { wert: T }): [T, (neu: T) => void] {
  const [wert, setWert] = useState<T>(speicher.wert);
  return [
    wert,
    (neu: T) => {
      speicher.wert = neu;
      setWert(neu);
    },
  ];
}

/** Eintrag im Menü „Mehr“; ausgeblendete (`zeigen: false`) entfallen. */
export interface MehrEintrag {
  key: string;
  label: string;
  onWaehle: () => void;
  gefahr?: boolean;
  zeigen?: boolean;
}

/**
 * Knopf „⋯“ mit einem Menü seltener Aktionen (Zeitraum ändern, Löschen,
 * Projekt einstellen …) – so bleibt die Leiste darüber kurz. `label` nennt
 * den Knopf für Bildschirmleser und als Tooltip.
 */
export function MehrMenue({ label, eintraege }: { label: string; eintraege: MehrEintrag[] }) {
  const [offen, setOffen] = useState(false);
  const knopf = useRef<HTMLButtonElement>(null);
  const sichtbar = eintraege.filter((e) => e.zeigen !== false);
  if (sichtbar.length === 0) return null;
  return (
    <>
      <button
        ref={knopf}
        type="button"
        className="btn btn-outline ln-co-mehr"
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={offen}
        onClick={() => setOffen((o) => !o)}
      >
        <Icon name="mehr" size={18} strokeWidth={2.6} />
      </button>
      {offen ? (
        <AufklappMenue
          anker={knopf}
          eintraege={sichtbar.map((e) => ({
            key: e.key,
            inhalt: e.label,
            gefahr: e.gefahr,
            onWaehle: () => {
              setOffen(false);
              e.onWaehle();
            },
          }))}
          onSchliessen={(fokusZurueck) => {
            setOffen(false);
            if (fokusZurueck) knopf.current?.focus();
          }}
        />
      ) : null}
    </>
  );
}

/**
 * Kopf eines Schritts auf der Seite eines offenen Leistungsnachweises
 * (Abrechnung.tsx): Nummer – grün mit Haken, wenn erledigt –, Titel,
 * Untertitel und rechts Aktionen.
 */
export function SchrittKopf({
  nr,
  titel,
  sub,
  erledigt = false,
  actions,
}: {
  nr: number;
  titel: string;
  sub?: ReactNode;
  erledigt?: boolean;
  actions?: ReactNode;
}) {
  return (
    <div className="ln-co-schritt-kopf">
      <span className={`ln-co-schritt-nr ${erledigt ? 'ln-co-schritt-erledigt' : ''}`} aria-hidden="true">
        {erledigt ? <Icon name="check" size={14} strokeWidth={2.6} /> : nr}
      </span>
      <div className="ln-co-schritt-titel">
        <h3>
          <span className="ln-co-vorlesen">Schritt {nr}{erledigt ? ' (erledigt)' : ''}: </span>
          {titel}
        </h3>
        {sub ? <p className="small muted">{sub}</p> : null}
      </div>
      {actions ? <div className="ln-co-schritt-aktionen">{actions}</div> : null}
    </div>
  );
}
