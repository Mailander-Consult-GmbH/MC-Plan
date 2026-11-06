/**
 * Zieht Name und Farbmodus der gemeinsamen Anmeldung (benutzer.ts) in den
 * Bestand eines Bereichs nach – nach jeder Änderung des Bestands und der
 * Anmeldung. `weicht` prüft, ob der Bestand abweicht; `anwenden` übernimmt die
 * Anmeldung über das `mutate()` des Bereichs (rein; ohne Abweichung liefert es
 * denselben Bestand zurück).
 */
import { useEffect, useRef } from 'react';
import { useBenutzer, type Benutzer } from './benutzer';

export function useBenutzerAbgleich<D>(
  daten: D,
  weicht: (d: D, b: Benutzer) => boolean,
  anwenden: (b: Benutzer) => void,
): Benutzer {
  const benutzer = useBenutzer();
  const aktuell = useRef({ weicht, anwenden });
  aktuell.current = { weicht, anwenden };

  useEffect(() => {
    if (aktuell.current.weicht(daten, benutzer)) aktuell.current.anwenden(benutzer);
  }, [daten, benutzer]);

  return benutzer;
}
