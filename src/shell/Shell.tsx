/**
 * Hülle der Anwendung: zeigt entweder die Bereichsauswahl oder einen Bereich.
 * Die Bereiche werden erst beim Betreten eingehängt – ihr Datenbestand wird
 * also nicht geladen, solange man sie nicht geöffnet hat. Darüber liegt in
 * allen Bereichen der Hinweis auf eine neuere Fassung (NeueFassung.tsx).
 */
import { useEffect } from 'react';
import { BereichBaubetrieb } from '../bereiche/baubetrieb';
import { BereichControlling } from '../bereiche/controlling';
import { BereichLeistungsnachweise } from '../bereiche/leistungsnachweise';
import { BereichPlanlauf } from '../bereiche/planlauf';
import { BereichProjektsteuerung } from '../bereiche/projektsteuerung';
import { NeueFassungHinweis } from './NeueFassung';
import { Start } from './Start';
import { useBereich } from './router';

export function Shell() {
  const bereich = useBereich();

  useEffect(() => {
    // Der Farbmodus gehört zu den Einstellungen eines Bereichs. Die
    // Bereichsauswahl selbst zeigt immer die Standardfarben.
    if (!bereich) document.documentElement.dataset.farbmodus = 'standard';
  }, [bereich]);

  return (
    <>
      {bereich === 'planlauf' ? (
        <BereichPlanlauf />
      ) : bereich === 'baubetrieb' ? (
        <BereichBaubetrieb />
      ) : bereich === 'projektsteuerung' ? (
        <BereichProjektsteuerung />
      ) : bereich === 'leistungsnachweise' ? (
        <BereichLeistungsnachweise />
      ) : bereich === 'controlling' ? (
        <BereichControlling />
      ) : (
        <Start />
      )}
      <NeueFassungHinweis />
    </>
  );
}
