/**
 * Hinweis „Neue Fassung von KaPlan verfügbar“ über allen Bereichen. Ein
 * Fenster, das vor einer Veröffentlichung geöffnet wurde, zeigt sonst bis zum
 * Neuladen den alten Stand – und kann gespeicherte Daten einer neueren Fassung
 * nicht lesen. Erkannt wird das über `useNeueFassung` (src/shared/pwa.ts).
 *
 * Er liegt unter der aufgeklappten Seitenleiste und unter Dialogen (z-index in
 * global.css); Meldungen rücken über ihn – dafür meldet er seine Höhe als
 * `--neue-fassung-hoehe`.
 */
import { useLayoutEffect, useRef, useState } from 'react';
import { FASSUNG, fassungText, useNeueFassung } from '../shared/pwa';

export function NeueFassungHinweis() {
  const neu = useNeueFassung();
  // „Später“ gilt nur für diese Fassung – erscheint eine weitere, meldet sie sich wieder
  const [spaeter, setSpaeter] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const sichtbar = !!neu && spaeter !== neu.id;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!sichtbar || !el) return;
    const wurzel = document.documentElement.style;
    // Höhe samt Abstand zum unteren Rand (ohne die Einblend-Animation)
    const setzen = () => {
      const unten = parseFloat(getComputedStyle(el).bottom) || 0;
      wurzel.setProperty('--neue-fassung-hoehe', `${Math.ceil(el.offsetHeight + unten)}px`);
    };
    setzen();
    const beobachter = new ResizeObserver(setzen);
    beobachter.observe(el);
    window.addEventListener('resize', setzen);
    return () => {
      beobachter.disconnect();
      window.removeEventListener('resize', setzen);
      wurzel.removeProperty('--neue-fassung-hoehe');
    };
  }, [sichtbar]);

  if (!neu || !sichtbar) return null;

  return (
    <div className="neue-fassung" role="status" ref={ref}>
      <div className="neue-fassung-text">
        <strong>Neue Fassung von KaPlan verfügbar</strong>
        <span>
          Veröffentlicht {fassungText(neu)}. Dieses Fenster zeigt noch die Fassung vom {fassungText(FASSUNG)} – bitte
          neu laden. Gespeicherte Daten bleiben erhalten.
        </span>
      </div>
      <div className="neue-fassung-knoepfe">
        <button type="button" className="btn btn-sm btn-ghost" onClick={() => setSpaeter(neu.id)}>
          Später
        </button>
        <button type="button" className="btn btn-sm btn-primary" onClick={() => window.location.reload()}>
          Neu laden
        </button>
      </div>
    </div>
  );
}
