/**
 * Bausteine der beiden Funktionslisten – Einstellungen → Funktionen und
 * Projekt → Reiter „Funktion“. Beide sind nach der Art der Funktion gegliedert
 * (Reiter und Gruppenzeilen aus src/gemeinsam/FunktionsArten.tsx); das Gewerk
 * ist die zweite Ebene und steht in jeder Zeile als Abzeichen hinter der
 * Bezeichnung.
 */
import { katalogEintrag, kuerzelOhneGewerk } from '../../../gemeinsam/funktionskatalog';
import { Badge } from '../../../shared/ui';
import { UEBERGREIFEND, kuerzelAus, type Seite } from '../domain/types';
import { SeiteBadge } from './SeiteAuswahl';
import './funktionen.css';

/** „1 Funktion“, „12 Funktionen“. */
export const anzahlText = (n: number) => `${n} ${n === 1 ? 'Funktion' : 'Funktionen'}`;

/** Abzeichen des Gewerks einer Funktion: blau „Übergreifend“, sonst das Gewerk. */
export function GewerkAbzeichen({ gewerk }: { gewerk: string | null }) {
  return gewerk === null ? <Badge ton="blue">{UEBERGREIFEND}</Badge> : <Badge>{gewerk}</Badge>;
}

/**
 * Funktion in einer Tabellenzelle: Farbpunkt, Bezeichnung, dahinter das Gewerk
 * als Abzeichen – so bleibt es auch auf dem Telefon zu sehen, wo Spalten
 * entfallen –, auf Wunsch das Kürzel, die Seite für den Verzug und darunter
 * die Beschreibung.
 */
export function FunktionsZelle({
  funktion,
  kuerzel = false,
  beschreibung = false,
}: {
  funktion: { name: string; gewerk: string | null; farbe: string; seite: Seite | null; kuerzel: string; beschreibung: string };
  /** Kürzel hinter dem Gewerk nennen (wo es keine eigene Spalte hat). */
  kuerzel?: boolean;
  /** Beschreibung unter der Bezeichnung zeigen (wo sie keine eigene Spalte hat). */
  beschreibung?: boolean;
}) {
  return (
    <span className="pl-funktion">
      <span className="dot" style={{ background: funktion.farbe }} />
      <span className="pl-funktion-inhalt">
        <span className="pl-funktion-text">
          <strong>{funktion.name}</strong>
          <GewerkAbzeichen gewerk={funktion.gewerk} />
          {kuerzel && funktion.kuerzel ? <span className="num tertiary">· {funktion.kuerzel}</span> : null}
          <span className="pl-funktion-seite">
            <SeiteBadge seite={funktion.seite} />
          </span>
        </span>
        {beschreibung && funktion.beschreibung ? (
          <span className="pl-funktion-beschreibung">{funktion.beschreibung}</span>
        ) : null}
      </span>
    </span>
  );
}

const gleich = (a: string | null, b: string | null) => (a ?? '').trim().toLowerCase() === (b ?? '').trim().toLowerCase();

/**
 * Kürzel für die Übernahme einer Funktion in ein anderes Gewerk („Vorhandene
 * Funktion“): Kennt der Funktionskatalog die Funktion dort, gilt seines. Sonst
 * wird das Gewerk im Kürzel getauscht („PSV KIB“ wird „PSV LST“, „BÜW-LST“
 * wird „BÜW-OLA“; ist das Kürzel das Gewerk selbst, das neue Gewerk). Nennt
 * das Kürzel kein Gewerk, bleibt es – wie im Katalog, der „AN“ oder „PING“ in
 * jedem Gewerk gleich führt.
 *
 * `gleichnamige`: dieselbe Bezeichnung in anderen Gewerken. Trägt das Kürzel
 * von `f` sein Gewerk nicht erkennbar (der Katalog führt etwa „FS ITK“ im
 * Gewerk TK neben „FS EEA“), gibt eine von ihnen die Form vor, deren Kürzel es
 * tut – sonst hieße der Fachspezialist in KIB „FS ITK“.
 */
export function kuerzelFuerGewerk(
  f: { name: string; gewerk: string | null; kuerzel: string },
  gewerk: string,
  gleichnamige: readonly { gewerk: string | null; kuerzel: string }[] = [],
): string {
  const katalog = katalogEintrag(f.name, gewerk);
  if (katalog) return katalog.kuerzel;
  for (const x of [f, ...gleichnamige]) {
    const kuerzel = x.kuerzel.trim();
    if (!kuerzel || !x.gewerk) continue;
    if (gleich(kuerzel, x.gewerk)) return gewerk;
    const ohne = kuerzelOhneGewerk(kuerzel, x.gewerk);
    if (ohne === kuerzel) continue;
    // Der Trenner des Originals bleibt: Leerzeichen oder Bindestrich
    const trenner = kuerzel.slice(ohne.length).trimStart().startsWith('-') ? '-' : ' ';
    return `${ohne}${trenner}${gewerk}`;
  }
  return f.kuerzel.trim() || kuerzelAus(f.name);
}
