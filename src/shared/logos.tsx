import { useState } from 'react';

/**
 * Bildmarken der Anwendung.
 *
 * KaPlan erscheint im Koralle-Design als Kachel im Korallenverlauf mit dem
 * Dreieck der Marke in Weiß, daneben der Name und – in einem Bereich – dessen
 * Bezeichnung (`KaPlanMarke`). Die früheren Logodateien unter `public/logos/`
 * (dunkle Schrift, für hellen Grund) werden in der Oberfläche nicht mehr
 * gezeigt. Die Wortmarke Mailänder Consult stammt aus der Originaldatei
 * `public/mailaender-consult.svg` und wird nur über die Höhe skaliert.
 */

/** Hausfarbe nach dem Logo Mailänder Consult – nur für die Ersatzzeichnung der Wortmarke. */
export const MARKE_BLAU = '#24456e';

/** Bereiche, deren Namen die Marke tragen kann. */
export type KaPlanBereich = 'Planlaufmanagement' | 'Baubetriebsplanung' | 'Projektsteuerung';

/**
 * Das Dreieck von KaPlan (drei offene Ecken), nachgezeichnet nach
 * `public/logos/Logo.png`; es nimmt die Schriftfarbe an.
 */
export function KaPlanZeichen({ size = 25 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" fill="currentColor" aria-hidden="true" style={{ display: 'block', flex: 'none' }}>
      <path d="M255.5 57 349.5 219.5H324L255.5 100 187 219.5h-25z" />
      <path d="M114 302h24.5L63 433.5h140.5v22H26z" />
      <path d="M397.5 302H373l75.5 131.5H308v22h177.5z" />
    </svg>
  );
}

/**
 * Marke von KaPlan: auf dem Startbildschirm ohne Zusatz, in den Bereichen mit
 * dem Namen des Bereichs. Für Bildschirmleser ein Bild mit dem vollen Namen.
 */
export function KaPlanMarke({ bereich }: { bereich?: KaPlanBereich }) {
  return (
    <span className="marke" role="img" aria-label={bereich ? `KaPlan – ${bereich}` : 'KaPlan'}>
      <span className="marke-kachel">
        <KaPlanZeichen />
      </span>
      <span className="marke-text" aria-hidden="true">
        <span className="marke-name">KaPlan</span>
        {bereich ? <span className="marke-bereich">{bereich}</span> : null}
      </span>
    </span>
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
