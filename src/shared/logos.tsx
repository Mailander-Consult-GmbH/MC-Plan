import { useState } from 'react';

/**
 * Bildmarken der Anwendung.
 *
 * Das Logo von KaPlan („Planebenen“) besteht aus drei isometrischen Ebenen –
 * je Arbeitsbereich eine: oben Planlaufmanagement, in der Mitte
 * Baubetriebsplanung, unten Projektsteuerung – und dem Schriftzug „KaPlan“.
 * Es gibt vier Zustände: `neutral` (Startbildschirm: alle Ebenen in Blautönen,
 * ohne Unterzeile) und je Bereich einen, in dem dessen Ebene blau ist, die
 * beiden anderen grau, und der Name des Bereichs unter „KaPlan“ steht.
 *
 * Das Logo wird hier gezeichnet, nicht als Bilddatei eingebunden: die Ebenen
 * als Polygone, der Schriftzug als Text in Outfit, der Schrift der Oberfläche.
 * Die Farben kommen aus den Tokens `--logo-…` in global.css und folgen dem
 * Farbschema – abweichend von der Vorlage steht „KaPlan“ im hellen Schema im
 * Blau der Wortmarke Mailänder Consult (`--logo-schriftzug`), die Unterzeile
 * bleibt grau. Vorlage sind die Dateien unter `public/logos/`
 * (`kaplan-logo-*.svg`, `kaplan-symbol-*.svg`); Regeln und Maße stehen in
 * `docs/LOGO-ANLEITUNG.md`. Es steht ohne Fläche dahinter.
 *
 * Die Wortmarke Mailänder Consult stammt aus der Originaldatei
 * `public/mailaender-consult.svg` und wird nur über die Höhe skaliert.
 */

/** Hausfarbe nach dem Logo Mailänder Consult – auch die Markenfarbe der Oberfläche (`--marke`). */
export const MARKE_BLAU = '#24456e';

/** Zustand des Logos: ohne gewählten Bereich `neutral`, sonst der Bereich, dessen Ebene blau ist. */
export type LogoZustand = 'neutral' | 'planlauf' | 'baubetrieb' | 'projekt';

/** Name des Bereichs unter „KaPlan“ – im neutralen Zustand steht keiner. */
const UNTERZEILE: Record<LogoZustand, string | null> = {
  neutral: null,
  planlauf: 'Planlaufmanagement',
  baubetrieb: 'Baubetriebsplanung',
  projekt: 'Projektsteuerung',
};

/**
 * Die drei Ebenen im Maß 48 × 48 (Geometrie der Vorlage). Welche blau ist,
 * entscheidet die Klasse `logo-<zustand>` am umgebenden SVG (global.css).
 */
function Ebenen() {
  return (
    <>
      <polygon className="logo-ebene logo-ebene-planlauf" points="24,5 42,14 24,23 6,14" />
      <polygon className="logo-ebene logo-ebene-baubetrieb" points="6,19.5 24,28.5 42,19.5 42,24.5 24,33.5 6,24.5" />
      <polygon className="logo-ebene logo-ebene-projekt" points="6,30 24,39 42,30 42,35 24,44 6,35" />
    </>
  );
}

/**
 * Logo von KaPlan mit Schriftzug – so breit wie sein Platz, die Höhe folgt
 * dem Seitenverhältnis. Maße wie in den Vorlagen (Symbol 96 hoch, Abstand zur
 * Schrift 18): mit Unterzeile 282 × 96, „KaPlan“ in Größe 54; ohne Unterzeile
 * 300,4 × 96, „KaPlan“ in Größe 60 und zur Mitte des Symbols gesetzt. Die
 * Unterzeile hat für alle Bereiche dieselbe Größe – die längste
 * („Planlaufmanagement“) ist so breit wie „KaPlan“.
 */
export function KaPlanLogo({ zustand }: { zustand: LogoZustand }) {
  const unterzeile = UNTERZEILE[zustand];
  return (
    <svg
      className={`kaplan-logo logo-${zustand}`}
      viewBox={unterzeile ? '0 0 282 96' : '0 0 300.4 96'}
      role="img"
      aria-label={unterzeile ? `KaPlan – ${unterzeile}` : 'KaPlan'}
    >
      <g transform="scale(2)">
        <Ebenen />
      </g>
      {unterzeile ? (
        <>
          <text className="logo-schriftzug" x="110.63" y="56.1" fontSize="54">
            KaPlan
          </text>
          <text className="logo-unterzeile" x="112.64" y="78.8" fontSize="17.5">
            {unterzeile}
          </text>
        </>
      ) : (
        <text className="logo-schriftzug" x="110.26" y="69.39" fontSize="60">
          KaPlan
        </text>
      )}
    </svg>
  );
}

/**
 * Das Symbol von KaPlan allein – für die eingeklappte Seitenleiste, in der
 * das Logo mit Schriftzug keinen Platz hat. Sichtbar ist es nur dort
 * (`.kaplan-zeichen` in global.css).
 */
export function KaPlanZeichen({ zustand, size = 36 }: { zustand: LogoZustand; size?: number }) {
  return (
    <svg className={`kaplan-zeichen logo-${zustand}`} viewBox="0 0 48 48" width={size} height={size} role="img" aria-label="KaPlan">
      <Ebenen />
    </svg>
  );
}

/** Dateiname der Originalmarke unter `public/`. */
export const MAILAENDER_DATEI = 'mailaender-consult.svg';

/**
 * Wortmarke Mailänder Consult für die Kopfzeile.
 *
 * Verwendet wird die Originaldatei `public/mailaender-consult.svg`; sie wird
 * ausschließlich über die Höhe skaliert, das Seitenverhältnis bleibt damit
 * unverändert. Fehlt die Datei, erscheint ersatzweise eine schlichte
 * Nachzeichnung, damit die Kopfzeile nicht leer bleibt.
 */
export function MailaenderLogo({ height = 34 }: { height?: number }) {
  const [original, setOriginal] = useState(true);

  if (original) {
    return (
      <img
        src={`${import.meta.env.BASE_URL}${MAILAENDER_DATEI}`}
        alt="Mailänder Consult"
        style={{ height, width: 'auto', display: 'block' }}
        onError={() => setOriginal(false)}
      />
    );
  }

  return (
    <svg
      width={(height * 1000) / 248}
      height={height}
      viewBox="0 0 1000 248"
      fill="none"
      role="img"
      aria-label="Mailänder Consult"
      style={{ display: 'block', flex: 'none' }}
    >
      <g
        fill={MARKE_BLAU}
        fontFamily="'Helvetica Neue', Helvetica, Arial, sans-serif"
        fontWeight="700"
        fontSize="104"
        letterSpacing="-2"
      >
        <text x="0" y="92">
          Mailänder
        </text>
        <text x="695" y="226" textAnchor="end">
          Consult
        </text>
      </g>
      <g stroke={MARKE_BLAU} strokeWidth="26" fill="none">
        <path d="M748 13v222h108V128z" />
        <path d="M987 13v222H879V128z" />
      </g>
    </svg>
  );
}
