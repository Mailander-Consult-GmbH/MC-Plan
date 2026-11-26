/**
 * Bausteine für die Gliederung der Funktionen nach ihrer **Art** – in beiden
 * Bereichen dieselben, damit „Einstellungen → Funktionen“ und die Listen in
 * den Projekten gleich aussehen und sich gleich bedienen:
 *
 * * `ArtReiter` – erste Ebene: „Alle“ und je vorkommender Art ein Reiter
 *   (Kurzzeichen der Art, der Name steht im Tooltip),
 * * `artWahlGueltig` – eine gewählte Art, die es nicht mehr gibt, fällt auf „Alle“,
 * * `ArtGruppenZeile` – Gruppenzeile je Art in der Tabelle unter „Alle“,
 * * `ArtFeld` – Auswahl der Art im Dialog einer Funktion,
 * * `GewerkFilter` mit `gewerkPasst` – zweite Ebene: Auswahl „Alle Gewerke“,
 *   „Übergreifend“ oder ein Gewerk,
 * * `GewerkAbzeichen` – das Gewerk einer Funktion als Abzeichen hinter ihrer
 *   Bezeichnung; so bleibt es in jeder Zeile zu sehen, auch auf dem Telefon.
 *
 * Arten, Reihenfolge und Namen kommen aus `funktionskatalog.ts`.
 */
import { Badge } from '../shared/ui';
import { FUNKTIONS_ARTEN, artInfo, artRang, artText } from './funktionskatalog';
import './gemeinsam.css';

/** Wahl „Alle“ in `ArtReiter`. */
export const ALLE_ARTEN = 'alle';

/** Eine gewählte Art, die unter `arten` nicht (mehr) vorkommt, fällt auf „Alle“ zurück. */
export function artWahlGueltig(wahl: string, arten: readonly string[]): string {
  return wahl !== ALLE_ARTEN && arten.some((a) => artInfo(a).id === wahl) ? wahl : ALLE_ARTEN;
}

/**
 * Reiter der ersten Ebene. `arten`: die Arten, die es in der Liste gibt
 * (Kennungen, beliebige Reihenfolge, auch mehrfach) – gezeigt werden sie in
 * der Reihenfolge des Katalogs. `anzahl` nennt je Art die Zahl im Tooltip.
 * Schmal brechen die Reiter um (`.gem-artreiter`), statt in einer Zeile zu
 * rollen – es sind bis zu dreizehn und „Alle“.
 */
export function ArtReiter({
  arten,
  wahl,
  onWahl,
  anzahl,
}: {
  arten: readonly string[];
  wahl: string;
  onWahl: (art: string) => void;
  anzahl?: (art: string) => number;
}) {
  const vorhanden = [...new Set(arten.map((a) => artInfo(a).id))].sort((a, b) => artRang(a) - artRang(b));
  const aktiv = artWahlGueltig(wahl, vorhanden);
  return (
    <div className="tabs gem-artreiter" role="group" aria-label="Art der Funktion">
      <button
        type="button"
        className={aktiv === ALLE_ARTEN ? 'active' : ''}
        aria-pressed={aktiv === ALLE_ARTEN}
        onClick={() => onWahl(ALLE_ARTEN)}
      >
        Alle
      </button>
      {vorhanden.map((id) => {
        const art = artInfo(id);
        const n = anzahl?.(id);
        return (
          <button
            key={id}
            type="button"
            className={aktiv === id ? 'active' : ''}
            aria-pressed={aktiv === id}
            title={n === undefined ? art.name : `${art.name} · ${n}`}
            onClick={() => onWahl(id)}
          >
            {art.kuerzel}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Gruppenzeile einer Art in einer Tabelle (unter „Alle“): Name der Art, ihr
 * Kurzzeichen und die Zahl der Zeilen darunter. `zusatz` steht dahinter, etwa
 * „3 besetzt“.
 */
export function ArtGruppenZeile({
  art,
  spalten,
  anzahl,
  zusatz,
}: {
  art: string;
  spalten: number;
  anzahl: number;
  zusatz?: string;
}) {
  const a = artInfo(art);
  return (
    <tr className="gruppe-zeile gem-artzeile">
      <td colSpan={spalten}>
        <strong>{a.name}</strong>
        <span className="small tertiary">
          {a.kuerzel === a.name ? '' : ` ${a.kuerzel} ·`} {anzahl}
          {zusatz ? ` · ${zusatz}` : ''}
        </span>
      </td>
    </tr>
  );
}

/** Auswahl der Art im Dialog einer Funktion. */
export function ArtFeld({ value, onChange }: { value: string; onChange: (art: string) => void }) {
  return (
    <select className="select" value={artInfo(value).id} onChange={(e) => onChange(e.target.value)}>
      {FUNKTIONS_ARTEN.map((a) => (
        <option key={a.id} value={a.id}>
          {artText(a.id)}
        </option>
      ))}
    </select>
  );
}

/** Text der Auswahl und des Abzeichens für Funktionen ohne Gewerk. */
const UEBERGREIFEND = 'Übergreifend';

/** Wahl „Alle Gewerke“ in `GewerkFilter`. */
export const ALLE_GEWERKE = '*';
/** Wahl „Übergreifend“ in `GewerkFilter` (Funktionen ohne Gewerk). */
export const OHNE_GEWERK = '';

/**
 * Trifft die Wahl des Gewerkfilters auf das Gewerk einer Funktion zu? Gewerke
 * gelten ohne Groß-/Kleinschreibung als dieselben – wie beim Anlegen und
 * Löschen eines Gewerks.
 */
export function gewerkPasst(gewerk: string | null, wahl: string): boolean {
  if (wahl === ALLE_GEWERKE) return true;
  if (wahl === OHNE_GEWERK) return gewerk === null;
  return gewerk !== null && gewerk.trim().toLowerCase() === wahl.trim().toLowerCase();
}

/** Eine Wahl, die es unter `gewerke` nicht (mehr) gibt, fällt auf „Alle Gewerke“ zurück. */
export function gewerkWahlGueltig(wahl: string, gewerke: readonly string[]): string {
  return wahl === ALLE_GEWERKE || wahl === OHNE_GEWERK || gewerke.includes(wahl) ? wahl : ALLE_GEWERKE;
}

/** Zweite Ebene: Filter nach Gewerk – „Alle Gewerke“, „Übergreifend“ und die Gewerke. */
export function GewerkFilter({
  gewerke,
  wahl,
  onWahl,
}: {
  gewerke: readonly string[];
  wahl: string;
  onWahl: (wahl: string) => void;
}) {
  return (
    <select
      className="select gem-gewerkfilter"
      aria-label="Gewerk"
      value={gewerkWahlGueltig(wahl, gewerke)}
      onChange={(e) => onWahl(e.target.value)}
    >
      <option value={ALLE_GEWERKE}>Alle Gewerke</option>
      <option value={OHNE_GEWERK}>{UEBERGREIFEND}</option>
      {gewerke.map((g) => (
        <option key={g} value={g}>
          {g}
        </option>
      ))}
    </select>
  );
}

/** Abzeichen des Gewerks einer Funktion: blau „Übergreifend“, sonst das Gewerk. */
export function GewerkAbzeichen({ gewerk }: { gewerk: string | null }) {
  return gewerk === null ? <Badge ton="blue">{UEBERGREIFEND}</Badge> : <Badge>{gewerk}</Badge>;
}
