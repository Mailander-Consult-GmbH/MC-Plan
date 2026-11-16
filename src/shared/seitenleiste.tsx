/**
 * Die Seitenleiste der Bereiche – verwendet in den App.tsx aller Bereiche.
 *
 * Schmale Ansicht (bis 860 px, `.sidebar.open` in src/shared/global.css): Die
 * Leiste liegt über dem Inhalt und ist offen oder zu. Sie schließt bei jedem
 * Seitenwechsel – auch bei einem, der nicht aus der Seitenleiste kommt, etwa
 * „Zurück“ im Browser oder die Zurück-Geste der installierten App; sonst
 * bliebe sie offen und verdeckte die neue Seite.
 *
 * Breite Ansicht: Die Leiste lässt sich einklappen – dann bleibt eine schmale
 * Leiste nur mit den Symbolen (`.sidebar.eingeklappt`, `.app.leiste-zu`). Der
 * Zustand gehört zum Gerät und liegt unter einem eigenen Schlüssel im
 * Browser, nicht im Bestand eines Bereichs; er gilt in allen Bereichen.
 *
 * Bedient wird sie schmal über den Knopf „Menü“ in der Kopfzeile
 * (`SeitenleisteKnopf`), breit über den Griff am rechten Rand der Leiste auf
 * halber Höhe (`SeitenleisteGriff`).
 */
import { useCallback, useEffect, useState } from 'react';
import { Icon } from './icons';

const SCHLUESSEL = 'kaplan-seitenleiste.v1';
/** Bis zu dieser Breite liegt die Leiste über dem Inhalt (dieselbe Grenze wie in global.css). */
const SCHMAL = '(max-width: 860px)';

function gespeichert(): boolean {
  try {
    return localStorage.getItem(SCHLUESSEL) === 'eingeklappt';
  } catch {
    return false;
  }
}

const istSchmal = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(SCHMAL).matches;

export interface Seitenleiste {
  /** Breite Ansicht: nur die schmale Leiste mit Symbolen. In der schmalen Ansicht stets false. */
  eingeklappt: boolean;
  /** Schmale Ansicht – die Leiste liegt über dem Inhalt. */
  schmal: boolean;
  /** Schmal: Leiste öffnen bzw. schließen. Breit: ein- bzw. ausklappen. */
  umschalten: () => void;
}

export function useSeitenleiste() {
  const [offen, setOffen] = useState(false);
  const [eingeklappt, setEingeklappt] = useState(gespeichert);
  const [schmal, setSchmal] = useState(istSchmal);

  useEffect(() => {
    const schliessen = () => setOffen(false);
    window.addEventListener('hashchange', schliessen);
    return () => window.removeEventListener('hashchange', schliessen);
  }, []);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const abfrage = window.matchMedia(SCHMAL);
    const folgen = () => setSchmal(abfrage.matches);
    abfrage.addEventListener('change', folgen);
    return () => abfrage.removeEventListener('change', folgen);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(SCHLUESSEL, eingeklappt ? 'eingeklappt' : 'offen');
    } catch {
      /* kein Platz – die Wahl gilt dann nur bis zum Neuladen */
    }
  }, [eingeklappt]);

  const umschalten = useCallback(() => {
    if (istSchmal()) setOffen((o) => !o);
    else setEingeklappt((e) => !e);
  }, []);

  const leiste: Seitenleiste = { eingeklappt: eingeklappt && !schmal, schmal, umschalten };
  return [offen, setOffen, leiste] as const;
}

/** Knopf „Menü“ links in der Kopfzeile – nur in der schmalen Ansicht zu sehen (global.css): öffnet die Leiste. */
export function SeitenleisteKnopf({ leiste, offen }: { leiste: Seitenleiste; offen: boolean }) {
  return (
    <button
      type="button"
      className="btn-icon menu-toggle"
      onClick={leiste.umschalten}
      aria-label="Menü"
      aria-expanded={offen}
    >
      <Icon name="menu" size={18} />
    </button>
  );
}

/**
 * Griff am rechten Rand der Seitenleiste, auf halber Höhe – nur in der breiten
 * Ansicht zu sehen: klappt die Leiste ein bzw. aus. Er steht neben der Leiste
 * in `.app`, nicht in ihr: Die Leiste scrollt und schnitte ihn am Rand ab.
 */
export function SeitenleisteGriff({ leiste }: { leiste: Seitenleiste }) {
  const text = leiste.eingeklappt ? 'Seitenleiste ausklappen' : 'Seitenleiste einklappen';
  return (
    <button
      type="button"
      className="leiste-griff"
      onClick={leiste.umschalten}
      aria-label={text}
      title={text}
      aria-expanded={!leiste.eingeklappt}
    >
      <Icon name={leiste.eingeklappt ? 'chevron' : 'zurueck'} size={14} />
    </button>
  );
}
