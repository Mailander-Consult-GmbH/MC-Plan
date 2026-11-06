/**
 * Service Worker und Fassung der Anwendung.
 *
 * Der Service Worker wird nur im Produktionsbuild registriert und nur, wenn der
 * Browser ihn unterstützt. Die Anwendung funktioniert auch ohne ihn vollständig,
 * lediglich der Offline-Betrieb entfällt dann.
 *
 * Ein offenes Fenster (Browser-Tab oder installierte App) behält die Fassung,
 * mit der es geladen wurde, bis es neu geladen wird – auch wenn längst eine
 * neuere veröffentlicht ist. `useNeueFassung` vergleicht deshalb die eigene
 * Kennung (`__FASSUNG__`, vite.config.ts) mit der veröffentlichten
 * `fassung.json`: beim Start, sobald das Fenster wieder in den Vordergrund
 * kommt, und alle fünf Minuten.
 */
import { useEffect, useState } from 'react';

export interface Fassung {
  /** Eindeutig je Build: Commit und Bauzeit. */
  id: string;
  /** Kurzform des Commits – nur im Build des Workflows bekannt. */
  commit: string | null;
  /** Bauzeit (ISO). */
  zeit: string;
}

declare const __FASSUNG__: Fassung;

/** Fassung, die gerade läuft. */
export const FASSUNG: Fassung = __FASSUNG__;

/** Abstand der regelmäßigen Prüfung auf eine neuere Fassung. */
const PRUEFABSTAND = 5 * 60 * 1000;

/** „06.11.2026, 13:24 · 368aac7“ – Bauzeit und Commit einer Fassung. */
export function fassungText(f: Fassung): string {
  const zeit = new Date(f.zeit).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
  return f.commit ? `${zeit} · ${f.commit}` : zeit;
}

export function registriereServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    // Relativ zur aktuellen Seite, damit auch Unterverzeichnisse (z.B. GitHub Pages) funktionieren
    const url = new URL('sw.js', document.baseURI);
    void navigator.serviceWorker.register(url, { scope: './' }).catch((fehler) => {
      console.warn('Service Worker konnte nicht registriert werden:', fehler);
    });
  });
}

/** Liest die veröffentlichte Fassung – `null`, wenn sie nicht erreichbar ist (offline). */
async function veroeffentlichteFassung(): Promise<Fassung | null> {
  try {
    // Am Browser-Cache vorbei, sonst sieht die Prüfung bis zu zehn Minuten
    // lang die alte Datei (GitHub Pages: max-age=600).
    const antwort = await fetch(new URL('fassung.json', document.baseURI), { cache: 'no-store' });
    if (!antwort.ok) return null;
    const f = (await antwort.json()) as Partial<Fassung>;
    if (typeof f.id !== 'string' || typeof f.zeit !== 'string') return null;
    return { id: f.id, commit: typeof f.commit === 'string' ? f.commit : null, zeit: f.zeit };
  } catch {
    return null;
  }
}

/**
 * Ist eine andere Fassung veröffentlicht als die laufende, liefert der Hook
 * sie – sonst `null`. Nur im Produktionsbuild; im Entwicklungsbetrieb gibt es
 * keine `fassung.json`.
 */
export function useNeueFassung(): Fassung | null {
  const [neu, setNeu] = useState<Fassung | null>(null);

  useEffect(() => {
    if (!import.meta.env.PROD) return;
    let beendet = false;
    const pruefen = () => {
      if (document.visibilityState !== 'visible') return;
      void veroeffentlichteFassung().then((f) => {
        if (!beendet && f && f.id !== FASSUNG.id) setNeu((alt) => (alt?.id === f.id ? alt : f));
      });
    };
    pruefen();
    const zeitgeber = window.setInterval(pruefen, PRUEFABSTAND);
    document.addEventListener('visibilitychange', pruefen);
    window.addEventListener('focus', pruefen);
    return () => {
      beendet = true;
      window.clearInterval(zeitgeber);
      document.removeEventListener('visibilitychange', pruefen);
      window.removeEventListener('focus', pruefen);
    };
  }, []);

  return neu;
}
