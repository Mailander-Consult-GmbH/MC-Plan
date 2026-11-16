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
import { GERAET_DUNKEL, SEITENGRUND, istDunkel, useBenutzer } from '../gemeinsam/benutzer';
import { NeueFassungHinweis } from './NeueFassung';
import { Start } from './Start';
import { useBereich } from './router';

export function Shell() {
  const bereich = useBereich();

  const { farbschema } = useBenutzer();

  useLayoutEffect(() => {
    // Hell oder dunkel gilt überall, auch auf der Bereichsauswahl: fest gewählt
    // unter „Angemeldet als“ oder – die Vorgabe „Automatisch“ – wie das Gerät
    // eingestellt ist. Als Layout-Effekt, also vor dem ersten Zeichnen.
    // Gesetzt wird stets das Ergebnis (`hell`/`dunkel`); global.css kennt keine
    // Medienabfrage dafür. Das Skript im Kopf der index.html setzt denselben
    // Wert schon vor dem Start, damit die Seite nicht erst hell aufblitzt.
    const setzen = () => {
      const schema = istDunkel(farbschema) ? 'dunkel' : 'hell';
      document.documentElement.dataset.farbschema = schema;
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', SEITENGRUND[schema]);
    };
    setzen();
    if (farbschema !== 'geraet') return;
    // „Automatisch“: einem Wechsel der Geräteeinstellung sofort folgen
    const geraet = window.matchMedia(GERAET_DUNKEL);
    geraet.addEventListener('change', setzen);
    return () => geraet.removeEventListener('change', setzen);
  }, [farbschema]);

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
