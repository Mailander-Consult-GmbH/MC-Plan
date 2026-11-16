/**
 * Bewegungen des Koralle-Designs (framer-motion), wie sie die Vorlage
 * KoralleDashboard.jsx zeigt: Karten heben sich an, Zahlen zählen hoch, die
 * Fläche des aktiven Menüpunkts gleitet, Balken wachsen, Seiten blenden ein.
 * Fachfrei – hier stehen nur die Bausteine; wer sich bewegt, entscheiden die
 * Ansichten. Wer im Betriebssystem „Bewegung reduzieren“ gewählt hat, sieht
 * die Endzustände ohne Bewegung (`MotionConfig reducedMotion="user"` in
 * main.tsx und `useReducedMotion` hier).
 */
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';

/** Die Kurve der Vorlage: schnell los, weich auslaufend (wie `--ease-koralle`). */
export const KURVE = [0.2, 0.8, 0.2, 1] as const;

/** Feder für das Anheben von Karten. */
export const FEDER = { type: 'spring', stiffness: 300, damping: 22 } as const;

/** Feder für Flächen, die zu einer neuen Wahl gleiten (Menüpunkt, Segment). */
export const FEDER_STRAFF = { type: 'spring', stiffness: 400, damping: 30 } as const;

/**
 * Anheben beim Überfahren: `<motion.div {...hoverLift}>`. Der Schatten kommt
 * aus dem Token, damit er dem dunklen Schema folgt. Elemente damit dürfen
 * keine CSS-Transition auf `transform` tragen (siehe `.bewegt` in global.css).
 */
export const hoverLift = {
  whileHover: { y: -5, boxShadow: 'var(--schatten-hoch)' },
  transition: FEDER,
};

/** Ganze Zahl, die beim Erscheinen und bei jeder Änderung zum Wert zählt. */
export function Zaehler({ wert }: { wert: number }) {
  const ruhig = useReducedMotion();
  const stand = useMotionValue(ruhig ? wert : 0);
  const text = useTransform(stand, (v) => Math.round(v).toLocaleString('de-DE'));
  useEffect(() => {
    if (ruhig) {
      stand.set(wert);
      return;
    }
    const lauf = animate(stand, wert, { duration: 0.9, ease: KURVE });
    return () => lauf.stop();
  }, [wert, ruhig, stand]);
  return <motion.span>{text}</motion.span>;
}

/**
 * Fläche hinter dem aktiven Menüpunkt der Seitenleiste. Es gibt sie nur am
 * aktiven Punkt; wechselt er, gleitet sie über die gemeinsame `layoutId`
 * dorthin. Die Seitenleiste selbst ist ein `motion.aside` mit `layoutScroll`,
 * damit die Lage auch stimmt, wenn sie gescrollt ist.
 */
export function NavAktiv() {
  return <motion.span layoutId="nav-aktiv" className="nav-aktiv" transition={FEDER_STRAFF} />;
}

/** Füllung eines Fortschrittsbalkens: wächst beim Erscheinen von null auf `prozent`. */
export function BalkenFuellung({ prozent, verzoegerung = 0 }: { prozent: number; verzoegerung?: number }) {
  const ruhig = useReducedMotion();
  const breite = `${Math.min(100, Math.max(0, prozent))}%`;
  return (
    <motion.div
      initial={ruhig ? false : { width: 0 }}
      animate={{ width: breite }}
      transition={{ duration: 0.8, delay: verzoegerung, ease: KURVE }}
    />
  );
}

/**
 * Blendet den Inhalt einer Ansicht ein, sobald `schluessel` wechselt. Nur über
 * die Deckkraft: Eine Verschiebung machte den Rahmen zum Bezug fest
 * positionierter Dialoge, die in der Ansicht stehen. Der Schlüssel ist die
 * Ansicht (nicht das Projekt) – wie bisher wird also nur neu eingehängt, was
 * ohnehin wechselt.
 */
export function Einblenden({ schluessel, children }: { schluessel: string; children: ReactNode }) {
  return (
    <motion.div key={schluessel} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35, ease: KURVE }}>
      {children}
    </motion.div>
  );
}
