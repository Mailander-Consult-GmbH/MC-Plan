/**
 * Hinweis „Neue Fassung von KaPlan verfügbar“ über allen Bereichen. Ein
 * Fenster, das vor einer Veröffentlichung geöffnet wurde, zeigt sonst bis zum
 * Neuladen den alten Stand – und kann gespeicherte Daten einer neueren Fassung
 * nicht lesen. Erkannt wird das über `useNeueFassung` (src/shared/pwa.ts).
 */
import { useState } from 'react';
import { FASSUNG, fassungText, useNeueFassung } from '../shared/pwa';

export function NeueFassungHinweis() {
  const neu = useNeueFassung();
  // „Später“ gilt nur für diese Fassung – erscheint eine weitere, meldet sie sich wieder
  const [spaeter, setSpaeter] = useState<string | null>(null);
  if (!neu || spaeter === neu.id) return null;

  return (
    <div className="neue-fassung" role="status">
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
