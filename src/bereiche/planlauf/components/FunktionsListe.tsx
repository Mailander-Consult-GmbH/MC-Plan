/**
 * Bausteine der beiden Funktionslisten – Einstellungen → Funktionen und
 * Projekt → Reiter „Funktion“. Beide sind nach der Art der Funktion gegliedert
 * (Reiter, Gruppenzeilen und das Abzeichen des Gewerks aus
 * src/gemeinsam/FunktionsArten.tsx); das Gewerk ist die zweite Ebene und steht
 * in jeder Zeile als Abzeichen hinter der Bezeichnung.
 */
import { GewerkAbzeichen } from '../../../gemeinsam/FunktionsArten';
import type { Seite } from '../domain/types';
import { SeiteBadge } from './SeiteAuswahl';
import './funktionen.css';

/** „1 Funktion“, „12 Funktionen“. */
export const anzahlText = (n: number) => `${n} ${n === 1 ? 'Funktion' : 'Funktionen'}`;

/**
 * Bezeichnungen (klein geschrieben), die ein Schritt der genannten Workflows
 * oder Planläufe nennt. Nur für solche Funktionen zählt die Seite für den
 * Verzug – der Hinweis „Seite offen“ steht deshalb nur an ihnen
 * (`seiteNoetig` an `FunktionsZelle`).
 */
export function inSchrittenGenannt(ablaeufe: readonly { steps: readonly { roleName: string }[] }[]): Set<string> {
  const namen = new Set<string>();
  for (const a of ablaeufe) {
    for (const s of a.steps) {
      const name = s.roleName.trim().toLowerCase();
      if (name) namen.add(name);
    }
  }
  return namen;
}

/**
 * Funktion in einer Tabellenzelle: Farbpunkt, Bezeichnung, dahinter das Gewerk
 * als Abzeichen – so bleibt es auch auf dem Telefon zu sehen, wo Spalten
 * entfallen –, auf Wunsch das Kürzel, die Seite für den Verzug und darunter
 * die Beschreibung. Ist keine Seite festgelegt, steht „Seite offen“ nur, wenn
 * ein Workflow die Funktion nennt (`seiteNoetig`) – der Katalog führt viele
 * Funktionen, die in keinem Planlauf vorkommen und keine Seite brauchen.
 */
export function FunktionsZelle({
  funktion,
  kuerzel = false,
  beschreibung = false,
  seiteNoetig = true,
}: {
  funktion: { name: string; gewerk: string | null; farbe: string; seite: Seite | null; kuerzel: string; beschreibung: string };
  /** Kürzel hinter dem Gewerk nennen (wo es keine eigene Spalte hat). */
  kuerzel?: boolean;
  /** Beschreibung unter der Bezeichnung zeigen (wo sie keine eigene Spalte hat). */
  beschreibung?: boolean;
  /** Ohne festgelegte Seite „Seite offen“ zeigen – wenn ein Workflow die Funktion nennt. */
  seiteNoetig?: boolean;
}) {
  return (
    <span className="pl-funktion">
      <span className="dot" style={{ background: funktion.farbe }} />
      <span className="pl-funktion-inhalt">
        <span className="pl-funktion-text">
          <strong>{funktion.name}</strong>
          <GewerkAbzeichen gewerk={funktion.gewerk} />
          {kuerzel && funktion.kuerzel ? <span className="num tertiary">· {funktion.kuerzel}</span> : null}
          {funktion.seite || seiteNoetig ? (
            <span className="pl-funktion-seite">
              <SeiteBadge seite={funktion.seite} />
            </span>
          ) : null}
        </span>
        {beschreibung && funktion.beschreibung ? (
          <span className="pl-funktion-beschreibung">{funktion.beschreibung}</span>
        ) : null}
      </span>
    </span>
  );
}
