/**
 * Rechte im Bereich „Leistungsnachweise“ – an genau einer Stelle, damit sie
 * später unverändert auf die gemeinsame Datenbank übergehen.
 *
 * Zwei Zugänge (`Zugang`):
 *
 * * **Bereich** – wer angemeldet ist (`einstellungen.mitarbeiterId`, ein
 *   aktiver Mitarbeiter), erfasst, ändert und importiert nur eigene Leistungen
 *   – sonst nichts. Wer angemeldet ist, ergibt sich aus dem Namen der
 *   gemeinsamen Anmeldung aller Bereiche (`mitarbeiterZumNamen`). Die
 *   Leistungsnachweise entstehen dabei von selbst (`nachweiseErgaenzen`).
 * * **Controlling** – der Controlling-Bereich von KaPlan (nach der PIN) bindet
 *   den Bestand mit diesem Zugang ein (controlling.tsx). Dort gibt es alles
 *   Übrige: Projekte anlegen und einstellen (Vorgaben, Abschnitte, Logos),
 *   Leistungsnachweise anlegen, bearbeiten (Leistungstext, Bemerkung),
 *   abschließen und löschen, Aufschläge, Auswertung, Export, Sammel-Import und
 *   Mitarbeiterverwaltung – ohne Anmeldung als Mitarbeiter.
 *
 * Leistungen anderer ändert niemand, auch das Controlling nicht.
 *
 * Der Store (store/store.tsx) prüft jede Änderung hiermit; die Oberfläche
 * blendet Unerlaubtes zusätzlich aus. Alles rein, ohne React.
 */
import { type Leistung, type LeistungsnachweisDaten, type Mitarbeiter, type NachweisZeile } from './types';

/** Zugang, unter dem der Bestand bearbeitet wird: im Bereich oder im Controlling (nach der PIN). */
export type Zugang = 'bereich' | 'controlling';

/** Hinweis an der Anmeldung (wörtlich). */
export const RECHTE_HINWEIS =
  'Solange die Daten nur in diesem Browser liegen, ist die Anmeldung eine Auswahl und keine Kennwortprüfung – mit der gemeinsamen Datenbank wird daraus eine echte Anmeldung mit Berechtigungen.';

/** Meldung einer Aktion, die eine Anmeldung voraussetzt. */
export const NICHT_ANGEMELDET = 'Bitte zuerst anmelden.';

/** Meldung einer Aktion, die dem Controlling vorbehalten ist. */
export const NUR_CONTROLLING = 'Das ist dem Controlling vorbehalten.';

/** Rechte, die allein der Zugang über das Controlling gewährt. */
export type Recht =
  | 'projektVerwalten'
  | 'sammelImport'
  | 'projektLoeschen'
  | 'nachweisVerwalten'
  | 'abschliessen'
  | 'aufschlag'
  | 'export'
  | 'auswertung'
  | 'mitarbeiterVerwalten';

/** Vergleichsform eines Namens: klein, Umlaute ausgeschrieben, ohne Kommas, einfache Leerzeichen. */
function namensForm(name: string): string {
  return name
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/,/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Mitarbeiter zum Namen unter „Angemeldet als“ (gilt in allen Bereichen):
 * „Vorname Nachname“ oder „Nachname, Vorname“, ohne Rücksicht auf Groß- und
 * Kleinschreibung. Ohne `auchAusgeschiedene` nur aktive.
 */
export function mitarbeiterZumNamen(
  mitarbeiter: Mitarbeiter[],
  name: string,
  auchAusgeschiedene = false,
): Mitarbeiter | null {
  const gesucht = namensForm(name);
  if (!gesucht) return null;
  return (
    mitarbeiter.find(
      (m) =>
        (auchAusgeschiedene || m.aktiv) &&
        (namensForm(`${m.vorname} ${m.nachname}`) === gesucht || namensForm(`${m.nachname} ${m.vorname}`) === gesucht),
    ) ?? null
  );
}

/** Die angemeldete Person – ein existierender, aktiver Mitarbeiter – oder null. */
export function angemeldet(d: Pick<LeistungsnachweisDaten, 'einstellungen' | 'mitarbeiter'>): Mitarbeiter | null {
  const id = d.einstellungen.mitarbeiterId;
  if (!id) return null;
  return d.mitarbeiter.find((m) => m.id === id && m.aktiv) ?? null;
}

/** Darf der Zugang das? Alle Rechte gewährt das Controlling. */
export function darf(zugang: Zugang, recht: Recht): boolean {
  void recht;
  return zugang === 'controlling';
}

/** Darf die angemeldete Person die Leistung ändern oder löschen? Nur eigene. */
export function darfLeistungAendern(d: Pick<LeistungsnachweisDaten, 'einstellungen' | 'mitarbeiter'>, l: Pick<Leistung, 'mitarbeiterId'>): boolean {
  const ich = angemeldet(d);
  return !!ich && l.mitarbeiterId === ich.id;
}

/** Darf die Leistung einzeln sichtbar sein? Eigene, im Controlling alle (nur lesen). */
export function darfLeistungSehen(
  d: Pick<LeistungsnachweisDaten, 'einstellungen' | 'mitarbeiter'>,
  l: Pick<Leistung, 'mitarbeiterId'>,
  zugang: Zugang,
): boolean {
  return darfLeistungAendern(d, l) || zugang === 'controlling';
}

/**
 * Prüft das Löschen eines Mitarbeiters (Controlling): nur ohne Leistungen.
 * Liefert die Meldung oder null.
 */
export function mitarbeiterLoeschenPruefen(d: LeistungsnachweisDaten, mitarbeiterId: string, zugang: Zugang): string | null {
  if (!darf(zugang, 'mitarbeiterVerwalten')) return NUR_CONTROLLING;
  const m = d.mitarbeiter.find((x) => x.id === mitarbeiterId);
  if (!m) return 'Diesen Mitarbeiter gibt es nicht (mehr).';
  const anzahl = d.leistungen.filter((l) => l.mitarbeiterId === mitarbeiterId).length;
  if (anzahl > 0) {
    const name = `${m.vorname} ${m.nachname}`.trim() || m.kuerzel;
    return `„${name}“ hat noch ${anzahl} ${anzahl === 1 ? 'Leistung' : 'Leistungen'} und lässt sich deshalb nicht löschen – stattdessen als ausgeschieden markieren.`;
  }
  return null;
}

/** Eigene Leistungen der angemeldeten Person aus einer Liste (ohne Anmeldung keine). */
export function eigeneLeistungen<T extends Pick<Leistung, 'mitarbeiterId'>>(
  d: Pick<LeistungsnachweisDaten, 'einstellungen' | 'mitarbeiter'>,
  leistungen: T[],
): T[] {
  const ich = angemeldet(d);
  return ich ? leistungen.filter((l) => l.mitarbeiterId === ich.id) : [];
}

/**
 * Leistungen einer Nachweiszeile, wie sie aufgeklappt werden dürfen: die
 * eigenen einzeln, die der anderen nur als Zahl („+ 3 Leistungen von
 * Kolleginnen und Kollegen“). Im Controlling stehen auch die der anderen
 * einzeln darin (`andere`, nur lesen).
 */
export function leistungenDerZeile(
  d: Pick<LeistungsnachweisDaten, 'einstellungen' | 'mitarbeiter' | 'leistungen'>,
  zeile: Pick<NachweisZeile, 'leistungIds'>,
  zugang: Zugang,
): { eigene: Leistung[]; andere: Leistung[]; andereAnzahl: number } {
  const ids = new Set(zeile.leistungIds);
  const alle = d.leistungen.filter((l) => ids.has(l.id)).sort((a, b) => (a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : 0));
  const ich = angemeldet(d);
  const eigene = ich ? alle.filter((l) => l.mitarbeiterId === ich.id) : [];
  const fremd = alle.filter((l) => !ich || l.mitarbeiterId !== ich.id);
  return { eigene, andere: zugang === 'controlling' ? fremd : [], andereAnzahl: fremd.length };
}
