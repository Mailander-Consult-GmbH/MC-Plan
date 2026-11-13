/**
 * Hülle der Anwendung: zeigt entweder die Bereichsauswahl oder einen Bereich.
 * Die Bereiche werden erst beim Betreten eingehängt – ihr Datenbestand wird
 * also nicht geladen, solange man sie nicht geöffnet hat. Darüber liegt in
 * allen Bereichen der Hinweis auf eine neuere Fassung (NeueFassung.tsx).
 */
import { useLayoutEffect } from 'react';
import { BereichBaubetrieb } from '../bereiche/baubetrieb';
import { BereichPlanlauf } from '../bereiche/planlauf';
import { BereichProjektsteuerung } from '../bereiche/projektsteuerung';
import { useBenutzer } from '../gemeinsam/benutzer';
import { NeueFassungHinweis } from './NeueFassung';
import { Start } from './Start';
import { useBereich } from './router';

export function Shell() {
  const bereich = useBereich();

  const { farbmodus } = useBenutzer();

  useLayoutEffect(() => {
    // Der Farbmodus gilt für alle Bereiche (gemeinsame Anmeldung „Angemeldet
    // als“, src/gemeinsam/benutzer.ts) und wird nur hier gesetzt; die
    // Bereichsauswahl selbst zeigt immer die Standardfarben. Als Layout-Effekt,
    // also vor dem ersten Zeichnen: Sonst erschiene ein Bereich bei „kontrast“
    // nach jedem Öffnen oder Neuladen kurz in den Standardfarben.
    document.documentElement.dataset.farbmodus = bereich ? farbmodus : 'standard';
  }, [bereich, farbmodus]);

  return (
    <>
      {bereich === 'planlauf' ? (
        <BereichPlanlauf />
      ) : bereich === 'baubetrieb' ? (
        <BereichBaubetrieb />
      ) : bereich === 'projektsteuerung' ? (
        <BereichProjektsteuerung />
      ) : (
        <Start />
      )}
      <NeueFassungHinweis />
    </>
  );
}
