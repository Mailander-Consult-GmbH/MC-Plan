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
 * Ein Knopf in der Kopfzeile (`SeitenleisteKnopf`) bedient beides: schmal
 * öffnet er die Leiste, breit klappt er sie ein und aus.
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

/**
 * Knopf links in der Kopfzeile: öffnet in der schmalen Ansicht die Leiste
 * („Menü“) und klappt sie in der breiten ein bzw. aus.
 */
export function SeitenleisteKnopf({ leiste, offen }: { leiste: Seitenleiste; offen: boolean }) {
  const text = leiste.schmal ? 'Menü' : leiste.eingeklappt ? 'Seitenleiste ausklappen' : 'Seitenleiste einklappen';
  return (
    <button
      type="button"
      className="btn-icon menu-toggle"
      onClick={leiste.umschalten}
      aria-label={text}
      title={text}
      aria-expanded={leiste.schmal ? offen : !leiste.eingeklappt}
    >
      <Icon name={leiste.schmal ? 'menu' : leiste.eingeklappt ? 'leisteAuf' : 'leisteZu'} size={18} />
    </button>
  );
}
