/**
 * Rechte im Bereich „Leistungsnachweise“ – an genau einer Stelle, damit sie
 * später unverändert auf die gemeinsame Datenbank übergehen.
 *
 * Zwei Zugänge (`Zugang`):
 *
 * * **Bereich** – wer angemeldet ist (`einstellungen.mitarbeiterId`, ein
 *   aktiver Mitarbeiter), erfasst, ändert und importiert nur eigene Leistungen,
 *   schreibt am gemeinsamen Leistungstext der Zeiträume mit, in denen er
 *   eigene Leistungen hat (`darfPeriodentextBearbeiten`), und bestätigt seine
 *   Monate (`darfBestaetigen`) – sonst nichts. Wer angemeldet ist, ergibt sich
 *   aus dem Namen der gemeinsamen Anmeldung aller Bereiche
 *   (`mitarbeiterZumNamen`); fehlt die Person, legt der Store sie an
 *   (`anmeldeLage`, `anmeldungAnwenden`) – eine eigene Anmeldung gibt es
 *   nicht. Die Leistungsnachweise entstehen dabei von selbst
 *   (`nachweiseErgaenzen`). Einzige Ausnahme: Der Excel-Import legt auch hier
 *   unbekannte Projekte (wenn „Projekt anlegen“ angehakt ist) und fehlende
 *   Abschnitte an, soweit die eigenen Leistungen sie brauchen (`planErlaubt`
 *   im Store) – einstellen lassen sie sich danach nur im Controlling
 *   (`projektVerwalten`).
 * * **Controlling** – der Controlling-Bereich von KaPlan (nach der PIN) bindet
 *   den Bestand mit diesem Zugang ein (controlling.tsx). Dort gibt es alles
 *   Übrige: Projekte anlegen und einstellen (Vorgaben, Abschnitte, Logos),
 *   Leistungsnachweise anlegen, bearbeiten (Leistungstext, Bemerkung),
 *   abschließen und löschen, Aufschläge, Auswertung, Export, Sammel-Import und
 *   Mitarbeiterverwaltung – eine Anmeldung als Mitarbeiter ist nicht nötig
 *   (angelegt wird hier niemand). Gemeinsame Leistungstexte und
 *   Bestätigungen liest das Controlling nur. Ist die Person unter „Angemeldet
 *   als“ Mitarbeiter, gilt sie auch hier als angemeldet: Ihre eigenen
 *   Leistungen lassen sich beim Löschen eines Nachweises mitlöschen.
 *
 * Leistungen anderer ändert niemand, auch das Controlling nicht. Im Bereich
 * sieht man sie nur als Zahl – außer in Zeiträumen, in denen man selbst
 * Leistungen hat: Dort stehen ihre Stichpunkte (Name, Datum, Stunden, Text)
 * zur Orientierung beim gemeinsamen Text (`stichpunkteDerPeriode`).
 *
 * Der Store (store/store.tsx) prüft jede Änderung hiermit; die Oberfläche
 * blendet Unerlaubtes zusätzlich aus. Alles rein, ohne React.
 */
import { namensTeile } from '../../../gemeinsam/benutzer';
import type { ErfassungsPeriode } from './erfassung';
import { kuerzelFrei } from './import';
import {
  kuerzelAus,
  mitarbeiterName,
  pruefsumme,
  type ID,
  type Leistung,
  type LeistungsnachweisDaten,
  type Mitarbeiter,
  type NachweisZeile,
} from './types';

/** Zugang, unter dem der Bestand bearbeitet wird: im Bereich oder im Controlling (nach der PIN). */
export type Zugang = 'bereich' | 'controlling';

/** Meldung einer Aktion, die eine Anmeldung voraussetzt – wenn kein genauerer Hinweis vorliegt (`anmeldeHinweis`). */
export const NICHT_ANGEMELDET =
  'Leistungen erfasst nur, wer als Mitarbeiter geführt ist – bitte unten links unter „Angemeldet als“ Vor- und Nachnamen eintragen.';

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

/* ------------------------------------------------------------------ */
/* Anmeldung über „Angemeldet als“                                     */
/* ------------------------------------------------------------------ */

/**
 * Wie der Name unter „Angemeldet als“ zum Bestand steht:
 * * `angemeldet` – ein aktiver Mitarbeiter dieses Namens;
 * * `anlegen` – kein Mitarbeiter dieses Namens (auch kein ausgeschiedener), der
 *   Name hat Vor- und Nachnamen und der Bestand darf ihn anlegen
 *   (`automatisch`: im Bereich bei einwandfrei geladenem Stand) – der Store
 *   legt ihn gleich an (`anmeldungAnwenden`);
 * * `ohneNachname` – der Name hat nur ein Wort;
 * * `ausgeschieden` – der Name gehört einem ausgeschiedenen Mitarbeiter;
 * * `nichtGefuehrt` – kein Mitarbeiter dieses Namens, und angelegt wird hier
 *   niemand (im Controlling bzw. solange der gespeicherte Stand nicht geladen ist).
 */
export type AnmeldeLage =
  | { art: 'angemeldet'; mitarbeiter: Mitarbeiter }
  | { art: 'anlegen'; vorname: string; nachname: string }
  | { art: 'ohneNachname' }
  | { art: 'ausgeschieden'; mitarbeiter: Mitarbeiter }
  | { art: 'nichtGefuehrt' };

/**
 * Vor- und Nachname aus dem Namen unter „Angemeldet als“: „Nachname, Vorname“
 * (wie `mitarbeiterZumNamen` ihn auch versteht), sonst ist das letzte Wort der
 * Nachname (`namensTeile`).
 */
function vorUndNachname(name: string): { vorname: string; nachname: string } {
  const komma = name.indexOf(',');
  if (komma < 0) return namensTeile(name);
  const zusammen = (t: string) => t.trim().split(/\s+/).filter(Boolean).join(' ');
  return { vorname: zusammen(name.slice(komma + 1).replace(/,/g, ' ')), nachname: zusammen(name.slice(0, komma)) };
}

/** Lage des Namens unter „Angemeldet als“ (siehe `AnmeldeLage`). */
export function anmeldeLage(d: Pick<LeistungsnachweisDaten, 'mitarbeiter'>, name: string, automatisch: boolean): AnmeldeLage {
  const aktiv = mitarbeiterZumNamen(d.mitarbeiter, name);
  if (aktiv) return { art: 'angemeldet', mitarbeiter: aktiv };
  const ausgeschieden = mitarbeiterZumNamen(d.mitarbeiter, name, true);
  if (ausgeschieden) return { art: 'ausgeschieden', mitarbeiter: ausgeschieden };
  const { vorname, nachname } = vorUndNachname(name);
  if (!vorname || !nachname) return { art: 'ohneNachname' };
  return automatisch ? { art: 'anlegen', vorname, nachname } : { art: 'nichtGefuehrt' };
}

/**
 * Hinweis zur Lage (wörtlich) – als Leiste über dem Inhalt und als Kurzmeldung,
 * wenn eine Handlung eine Anmeldung braucht; null, wenn die Person angemeldet
 * ist. `anlegen` dauert nur bis zur nächsten Änderung des Stores – dafür gibt
 * es nur die Kurzmeldung (`mitLeiste` false).
 */
export function anmeldeHinweis(lage: AnmeldeLage, name: string, mitLeiste = false): string | null {
  const n = name.trim();
  switch (lage.art) {
    case 'angemeldet':
      return null;
    case 'anlegen':
      return mitLeiste ? null : `„${n}“ wird gerade als Mitarbeiter angelegt – bitte noch einmal versuchen.`;
    case 'ohneNachname':
      return `„${n}“ ist kein vollständiger Name – bitte unten links unter „Angemeldet als“ Vor- und Nachnamen eintragen. Unter diesem Namen werden Ihre Leistungen geführt.`;
    case 'ausgeschieden':
      return `${mitarbeiterName(lage.mitarbeiter) || lage.mitarbeiter.kuerzel} ist als ausgeschieden markiert – Leistungen erfasst nur, wer aktiv ist. Das Controlling kann die Person unter „Mitarbeiter“ wieder aktiv setzen.`;
    case 'nichtGefuehrt':
      return `Unter „${n}“ ist kein Mitarbeiter geführt – angelegt wird er im Bereich Leistungsnachweise, sobald der gespeicherte Stand geladen ist.`;
  }
}

/**
 * Kennung eines automatisch angelegten Mitarbeiters – aus dem Namen
 * abgeleitet (ohne Rücksicht auf Groß-/Kleinschreibung, Umlaute, Kommas und
 * die Reihenfolge der Wörter), damit zwei Fenster bzw. der doppelte Aufruf im
 * StrictMode dieselbe Person nicht zweimal anlegen. Vor `mutate` bilden.
 */
export function mitarbeiterKennung(name: string): ID {
  const woerter = namensForm(name).split(' ').filter(Boolean).sort();
  return `ma-${pruefsumme(woerter.join(' ')).slice(0, 10)}`;
}

/**
 * Zieht den Namen unter „Angemeldet als“ (Spiegel `einstellungen.bearbeiter`),
 * den Farbmodus und den Mitarbeiter dieses Namens (`einstellungen.mitarbeiterId`)
 * nach – rein; so arbeitet der Store nach jeder Änderung. Mit `automatisch`
 * (im Bereich bei einwandfrei geladenem Stand) legt es eine fehlende Person
 * an (`anmeldeLage` `anlegen`): aktiv, Kürzel aus dem Namen (`kuerzelFrei`),
 * Kennung `kennung` (`mitarbeiterKennung`); ist sie schon an eine andere
 * Person vergeben, mit angehängter Zahl. Ändert sich nichts, liefert es
 * denselben Bestand.
 */
export function anmeldungAnwenden<T extends Pick<LeistungsnachweisDaten, 'einstellungen' | 'mitarbeiter'>>(
  d: T,
  benutzer: { name: string; farbmodus: LeistungsnachweisDaten['einstellungen']['farbmodus'] },
  automatisch: boolean,
  kennung: ID = mitarbeiterKennung(benutzer.name),
): T {
  let mitarbeiter = d.mitarbeiter;
  const lage = anmeldeLage(d, benutzer.name, automatisch);
  if (lage.art === 'anlegen') {
    let id = kennung;
    for (let i = 2; mitarbeiter.some((m) => m.id === id); i++) id = `${kennung}-${i}`;
    const neu: Mitarbeiter = {
      id,
      kuerzel: kuerzelFrei(kuerzelAus(`${lage.vorname} ${lage.nachname}`), mitarbeiter),
      vorname: lage.vorname,
      nachname: lage.nachname,
      aktiv: true,
    };
    mitarbeiter = [...mitarbeiter, neu];
  }
  const mitarbeiterId = mitarbeiterZumNamen(mitarbeiter, benutzer.name)?.id ?? null;
  const e = d.einstellungen;
  if (mitarbeiter === d.mitarbeiter && e.bearbeiter === benutzer.name && e.farbmodus === benutzer.farbmodus && e.mitarbeiterId === mitarbeiterId) {
    return d;
  }
  return {
    ...d,
    mitarbeiter,
    einstellungen: { ...e, bearbeiter: benutzer.name, farbmodus: benutzer.farbmodus, mitarbeiterId },
  };
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

/* ------------------------------------------------------------------ */
/* Gemeinsame Leistungstexte und Monatsbestätigung                     */
/* ------------------------------------------------------------------ */

/** Hat die angemeldete Person Leistungen in der Periode? */
function eigeneIn(d: Pick<LeistungsnachweisDaten, 'einstellungen' | 'mitarbeiter'>, periode: Pick<ErfassungsPeriode, 'leistungen'>): boolean {
  const ich = angemeldet(d);
  return !!ich && periode.leistungen.some((l) => l.mitarbeiterId === ich.id);
}

/**
 * Darf den gemeinsamen Text der Periode lesen? Wer darin eigene Leistungen hat
 * (auch in einer abgerechneten, gesperrten Periode); im Controlling jeder.
 */
export function darfPeriodentextLesen(
  d: Pick<LeistungsnachweisDaten, 'einstellungen' | 'mitarbeiter'>,
  periode: Pick<ErfassungsPeriode, 'leistungen'>,
  zugang: Zugang,
): boolean {
  return zugang === 'controlling' || eigeneIn(d, periode);
}

/**
 * Darf den gemeinsamen Text der Periode bearbeiten? Nur im Bereich, wer darin
 * eigene Leistungen hat, und nur, solange die Periode nicht gesperrt ist
 * (keine ihrer Leistungen in einem abgeschlossenen Nachweis abgerechnet).
 * Das Controlling liest ihn nur – es bearbeitet die Texte im Nachweis.
 */
export function darfPeriodentextBearbeiten(
  d: Pick<LeistungsnachweisDaten, 'einstellungen' | 'mitarbeiter'>,
  periode: Pick<ErfassungsPeriode, 'leistungen' | 'gesperrt'>,
  zugang: Zugang,
): boolean {
  return zugang === 'bereich' && !periode.gesperrt && eigeneIn(d, periode);
}

/**
 * Stichpunkte einer Periode, wie sie zu sehen sind: die eigenen; die der
 * anderen (Name, Datum, Stunden, Text – nur lesen) nur, wer selbst Leistungen
 * in der Periode hat, und im Controlling – sonst nur ihre Zahl.
 */
export function stichpunkteDerPeriode(
  d: Pick<LeistungsnachweisDaten, 'einstellungen' | 'mitarbeiter'>,
  periode: Pick<ErfassungsPeriode, 'leistungen'>,
  zugang: Zugang,
): { eigene: Leistung[]; andere: Leistung[]; andereAnzahl: number } {
  const ich = angemeldet(d);
  const eigene = ich ? periode.leistungen.filter((l) => l.mitarbeiterId === ich.id) : [];
  const fremd = periode.leistungen.filter((l) => !ich || l.mitarbeiterId !== ich.id);
  const sichtbar = zugang === 'controlling' || eigene.length > 0;
  return { eigene, andere: sichtbar ? fremd : [], andereAnzahl: fremd.length };
}

/** Darf den Monat bestätigen bzw. die Bestätigung zurücknehmen? Nur im Bereich und nur eigene Monate. */
export function darfBestaetigen(d: Pick<LeistungsnachweisDaten, 'einstellungen' | 'mitarbeiter'>, mitarbeiterId: ID, zugang: Zugang): boolean {
  const ich = angemeldet(d);
  return zugang === 'bereich' && !!ich && ich.id === mitarbeiterId;
}
