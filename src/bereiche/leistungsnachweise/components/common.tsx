/** Fachliche Anzeige-Bausteine und Texte, die in mehreren Ansichten gebraucht werden. */
import { formatDate, toISO } from '../../../shared/dates';
import { Badge } from '../../../shared/ui';
import { laeuftBisAbschluss } from '../domain/nachweis';
import { langDatum } from '../domain/zeitraum';
import {
  QUELLE_LABEL,
  RASTER_KURZ,
  mitarbeiterName,
  type Leistungsnachweis,
  type Mitarbeiter,
  type ProjektStatus,
  type Quelle,
  type Raster,
} from '../domain/types';

/** Farbe des Projektstatus – wie in der Projektsteuerung. */
export const STATUS_TON: Record<ProjektStatus, '' | 'green' | 'orange'> = {
  aktiv: 'green',
  pausiert: 'orange',
  abgeschlossen: '',
};

/** Herkunft einer Leistung: Import lila, händisch neutral. */
export function QuelleBadge({ quelle }: { quelle: Quelle }) {
  return <Badge ton={quelle === 'import' ? 'purple' : ''}>{QUELLE_LABEL[quelle]}</Badge>;
}

/** „1 Leistung“, „3 Leistungen“ */
export function anzahl(n: number, eins: string, mehr: string): string {
  return `${n} ${n === 1 ? eins : mehr}`;
}

/** Auswahl des Rasters (Tag/Woche/Monat) – im Projektdialog, in den Einstellungen und im Nachweisdialog. */
export const RASTER_OPTIONEN = (['tag', 'woche', 'monat'] as Raster[]).map((r) => ({ value: r, label: RASTER_KURZ[r] }));

/** Mitarbeiter nach Nach- und Vorname. */
export function nachNamen(a: Mitarbeiter, b: Mitarbeiter): number {
  return a.nachname.localeCompare(b.nachname, 'de') || a.vorname.localeCompare(b.vorname, 'de');
}

/** Eintrag einer Mitarbeiterauswahl: „MM: Max Mustermann“, bei Ausgeschiedenen mit Zusatz. */
export function mitarbeiterAuswahlText(m: Mitarbeiter): string {
  return `${m.kuerzel ? `${m.kuerzel}: ` : ''}${mitarbeiterName(m) || m.kuerzel}${m.aktiv ? '' : ' (ausgeschieden)'}`;
}

/** Meldung nach „Einem Leistungsnachweis zuordnen“ auf der Seite eines Projekts im Controlling. */
export function nachweiseAngelegtText({ neu, erweitert }: { neu: number; erweitert: number }): string {
  if (neu === 0) return `${anzahl(erweitert, 'Leistungsnachweis', 'Leistungsnachweise')} erweitert.`;
  return `${anzahl(neu, 'Leistungsnachweis', 'Leistungsnachweise')} angelegt${erweitert ? `, ${erweitert} erweitert` : ''}.`;
}

/** Zeitpunkt in Ortszeit: „am 23.10.2026 um 14:05 Uhr“; leer ohne gültige Angabe. */
export function zeitpunkt(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `am ${formatDate(toISO(d))} um ${d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`;
}

/**
 * Zeitraum eines Nachweises in Listen und Köpfen: „01.09.2026 – 30.11.2026“ –
 * läuft ein offener noch bis zum Erstellen (`laeuftBisAbschluss`: das
 * Controlling hat sein Ende nicht festgelegt), „ab 01.09.2026 · offen bis zum
 * Erstellen“, denn seinen Umfang legt erst das Erstellen fest.
 */
export function nachweisZeitraumText(n: Leistungsnachweis): string {
  return laeuftBisAbschluss(n)
    ? `ab ${langDatum(n.von)} · offen bis zum Erstellen`
    : `${langDatum(n.von)} – ${langDatum(n.bis)}`;
}
