/**
 * Ein anderes Fenster (oder ein anderer Reiter) hat den Bestand eines Bereichs
 * gespeichert: Der Store soll ihn nachladen, statt mit seinem älteren Stand
 * weiterzuarbeiten – sonst überschreibt sein nächstes Speichern die Änderungen
 * des anderen Fensters, und sein Abgleich mit dem Projektregister rechnet mit
 * Projekten, die es nicht mehr bzw. noch nicht kennt.
 *
 * Verwendung im Store eines Bereichs, der `useRegisterAbgleich` nutzt:
 *
 *   useFremdeAenderung(SCHLUESSEL, ladeZustand === 'ok', () => {
 *     ersetzt();               // nachgeladener Stand ist keine eigene Änderung
 *     setData(ladeDaten()...); // bzw. den Text aus dem Ereignis lesen
 *   });
 *
 * `storage`-Ereignisse kommen nur aus anderen Fenstern desselben Ursprungs;
 * das eigene Speichern löst keines aus, ebenso wenig ein Speichern mit
 * unverändertem Text.
 */
import { useEffect, useRef } from 'react';

export function useFremdeAenderung(schluessel: string, aktiv: boolean, nachladen: (neuerText: string | null) => void): void {
  const aufruf = useRef(nachladen);
  aufruf.current = nachladen;

  useEffect(() => {
    if (!aktiv || typeof window === 'undefined') return;
    const hoeren = (e: StorageEvent) => {
      if (e.key !== schluessel || e.storageArea !== window.localStorage) return;
      aufruf.current(e.newValue);
    };
    window.addEventListener('storage', hoeren);
    return () => window.removeEventListener('storage', hoeren);
  }, [schluessel, aktiv]);
}
