/**
 * Breite Tabellen bleiben erreichbar.
 *
 * Ab Tabletbreite ist `.table-scroll` kein eigener Scrollbereich
 * (`overflow-x: clip`, global.css), damit die Tabellenkopfzeile beim Blättern
 * der Seite stehen bleibt. Passt eine Tabelle aber nicht in ihre Karte, würde
 * sie so stumm abgeschnitten – samt der Aktionen am rechten Rand. Diese
 * Beobachtung setzt dann die Klasse `table-scroll-quer`, mit der der Bereich
 * quer scrollt; passt die Tabelle wieder, entfällt sie. Die Kopfzeile steht
 * also, solange die Tabelle passt, und sonst ist alles per Querscrollen
 * erreichbar. Gilt für jede `.table-scroll` in allen Bereichen.
 */

const QUER = 'table-scroll-quer';

export function tabellenBreiteBeobachten(): void {
  if (typeof ResizeObserver === 'undefined' || typeof MutationObserver === 'undefined') return;

  // Bereich → beobachteter Inhalt (die Tabelle)
  const beobachtet = new Map<HTMLElement, Element | null>();
  const offen = new Set<HTMLElement>();
  let geplant = false;

  const pruefen = () => {
    geplant = false;
    for (const el of offen) {
      if (!el.isConnected) continue;
      // Ein Pixel Spielraum gegen Rundungen
      el.classList.toggle(QUER, el.scrollWidth > el.clientWidth + 1);
    }
    offen.clear();
  };
  // Erst im nächsten Bild umschalten: Die Scrollleiste ändert die Höhe, und
  // ein Umschalten mitten in der Meldung löste eine Endlosschleife aus.
  const vormerken = (el: HTMLElement) => {
    offen.add(el);
    if (!geplant) {
      geplant = true;
      requestAnimationFrame(pruefen);
    }
  };

  const groesse = new ResizeObserver((eintraege) => {
    for (const e of eintraege) {
      const el = e.target instanceof HTMLElement ? e.target.closest<HTMLElement>('.table-scroll') : null;
      if (el) vormerken(el);
    }
  });

  const aufnehmen = () => {
    for (const [el, inhalt] of beobachtet) {
      if (!el.isConnected) {
        groesse.unobserve(el);
        if (inhalt) groesse.unobserve(inhalt);
        beobachtet.delete(el);
      }
    }
    for (const el of document.querySelectorAll<HTMLElement>('.table-scroll')) {
      // Auch der Inhalt: Er wird breiter, ohne dass sich der Rahmen ändert
      const inhalt = el.firstElementChild;
      if (!beobachtet.has(el)) groesse.observe(el);
      else if (beobachtet.get(el) === inhalt) continue;
      else {
        const alt = beobachtet.get(el);
        if (alt) groesse.unobserve(alt);
        vormerken(el);
      }
      beobachtet.set(el, inhalt);
      if (inhalt) groesse.observe(inhalt);
    }
  };

  new MutationObserver(aufnehmen).observe(document.body, { childList: true, subtree: true });
  aufnehmen();
}
