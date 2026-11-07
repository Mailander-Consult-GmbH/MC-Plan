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
 *   nicht. Hat das Controlling die so angelegte Person umbenannt, entsteht
 *   kein Doppel (`umbenannt`). Die Leistungsnachweise entstehen dabei von selbst
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
 * sieht man von anderen weder Leistungen noch Stichpunkte oder Stunden – auch
 * nicht in Zeiträumen, in denen man selbst Leistungen hat, und auch nicht als
 * Zahl. Gemeinsam ist dort allein der Leistungstext des Zeitraums
 * (`darfPeriodentextLesen`, `stichpunkteDerPeriode`); im Controlling ist
 * alles zu sehen (nur lesen). Ausnahme, solange alles lokal im Browser liegt:
 * „Sicherung“ in der Seitenleiste des Bereichs lädt den gesamten Bestand
 * herunter (components/Sicherung.tsx).
 *
 * Der Store (store/store.tsx) prüft jede Änderung hiermit; die Oberfläche
 * blendet Unerlaubtes zusätzlich aus. Alles rein, ohne React.
 */
import { namensTeile } from '../../../gemeinsam/benutzer';
import type { ErfassungsPeriode } from './erfassung';
import { kuerzelFrei, kuerzelNormal } from './import';
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
  | 'auswertung';

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
 * * `umbenannt` – kein Mitarbeiter dieses Namens, aber der, den der Bereich
 *   unter diesem Namen angelegt hat (Kennung `mitarbeiterKennung`), heißt
 *   inzwischen anders – das Controlling hat ihn umbenannt. Angelegt wird dann
 *   niemand: Ein Doppel trüge keine der bisherigen Leistungen;
 * * `nichtGefuehrt` – kein Mitarbeiter dieses Namens, und angelegt wird hier
 *   niemand: im Controlling bzw. im Bereich, solange der gespeicherte Stand
 *   nicht geladen ist (`nichtGeladen`).
 */
export type AnmeldeLage =
  | { art: 'angemeldet'; mitarbeiter: Mitarbeiter }
  | { art: 'anlegen'; vorname: string; nachname: string }
  | { art: 'ohneNachname' }
  | { art: 'ausgeschieden'; mitarbeiter: Mitarbeiter }
  | { art: 'umbenannt'; mitarbeiter: Mitarbeiter }
  | { art: 'nichtGefuehrt'; nichtGeladen: boolean };

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

/**
 * Lage des Namens unter „Angemeldet als“ (siehe `AnmeldeLage`). `automatisch`:
 * Der Bestand darf eine fehlende Person anlegen (im Bereich bei einwandfrei
 * geladenem Stand); `nichtGeladen`: im Bereich, aber der gespeicherte Stand
 * ist nicht geladen – nur für den Hinweis.
 */
export function anmeldeLage(
  d: Pick<LeistungsnachweisDaten, 'mitarbeiter'>,
  name: string,
  automatisch: boolean,
  nichtGeladen = false,
): AnmeldeLage {
  const aktiv = mitarbeiterZumNamen(d.mitarbeiter, name);
  if (aktiv) return { art: 'angemeldet', mitarbeiter: aktiv };
  const ausgeschieden = mitarbeiterZumNamen(d.mitarbeiter, name, true);
  if (ausgeschieden) return { art: 'ausgeschieden', mitarbeiter: ausgeschieden };
  const { vorname, nachname } = vorUndNachname(name);
  if (!vorname || !nachname) return { art: 'ohneNachname' };
  // Unter diesem Namen angelegt und inzwischen umbenannt?
  const kennung = mitarbeiterKennung(name);
  const umbenannt = d.mitarbeiter.find((m) => m.id === kennung);
  if (umbenannt) return { art: 'umbenannt', mitarbeiter: umbenannt };
  return automatisch ? { art: 'anlegen', vorname, nachname } : { art: 'nichtGefuehrt', nichtGeladen };
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
      return `${mitarbeiterName(lage.mitarbeiter) || lage.mitarbeiter.kuerzel} ist als ausgeschieden markiert – wieder aktiv gesetzt wird die Person im Bereich Leistungsnachweise, sobald der gespeicherte Stand geladen ist.`;
    case 'umbenannt':
      return `Unter „${n}“ ist kein Mitarbeiter mehr geführt – das Controlling hat die Person in „${mitarbeiterName(lage.mitarbeiter) || lage.mitarbeiter.kuerzel}“ umbenannt. Bitte unten links unter „Angemeldet als“ diesen Namen eintragen; dort stehen Ihre bisherigen Leistungen.`;
    case 'nichtGefuehrt':
      return lage.nichtGeladen
        ? `Unter „${n}“ ist noch kein Mitarbeiter geführt – angelegt wird er, sobald der Bereich wieder speichern kann (siehe Hinweis oben).`
        : `Unter „${n}“ ist kein Mitarbeiter geführt – angelegt wird er im Bereich Leistungsnachweise, sobald der gespeicherte Stand geladen ist.`;
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
 * Kennung `kennung` (`mitarbeiterKennung`); eine früher als ausgeschieden
 * markierte Person dieses Namens setzt es wieder aktiv (`anmeldeLage`
 * `ausgeschieden` – eine Pflege der Mitarbeiter gibt es im Controlling nicht
 * mehr). Eine schon vergebene Kennung
 * führt bereits zur Lage `umbenannt` (angelegt wird dann niemand); die
 * angehängte Zahl sichert nur Aufrufe mit einer anderen `kennung` ab.
 *
 * Wechselt der Name, entfernt es mit `automatisch` zudem die Person, die der
 * Bereich unter dem bisherigen Namen angelegt hat (Kennung
 * `mitarbeiterKennung` des bisherigen Namens), wenn sie aktiv ist, das
 * Controlling sie nicht bearbeitet hat (noch der bisherige Name, Kürzel aus dem
 * Namen) und sie weder Leistungen hat noch in einem festgeschriebenen Stand
 * steht (`automatischAngelegtOhneLeistungen`) – so bleibt nach einem Tippfehler
 * unter „Angemeldet als“ kein Mitarbeiter zurück. Ändert sich nichts, liefert
 * es denselben Bestand.
 */
export function anmeldungAnwenden<T extends Pick<LeistungsnachweisDaten, 'einstellungen' | 'mitarbeiter' | 'leistungen' | 'nachweise'>>(
  d: T,
  benutzer: { name: string; farbmodus: LeistungsnachweisDaten['einstellungen']['farbmodus'] },
  automatisch: boolean,
  kennung: ID = mitarbeiterKennung(benutzer.name),
): T {
  let mitarbeiter = d.mitarbeiter;
  const bisher = d.einstellungen.bearbeiter;
  if (automatisch && bisher !== benutzer.name) {
    const verwaist = automatischAngelegtOhneLeistungen(d, bisher);
    if (verwaist && mitarbeiterZumNamen([verwaist], benutzer.name) === null) {
      mitarbeiter = mitarbeiter.filter((m) => m !== verwaist);
    }
  }
  const lage = anmeldeLage({ mitarbeiter }, benutzer.name, automatisch);
  // Früher als ausgeschieden markiert (eine Seite dafür gibt es nicht mehr): Wer sich so nennt, arbeitet wieder mit
  if (automatisch && lage.art === 'ausgeschieden') {
    mitarbeiter = mitarbeiter.map((m) => (m === lage.mitarbeiter ? { ...m, aktiv: true } : m));
  }
  if (lage.art === 'anlegen') {
    // Absicherung: Mit der Kennung aus dem Namen ist sie hier frei (sonst Lage `umbenannt`)
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

/**
 * Die Person, die der Bereich unter `name` angelegt hat (Kennung
 * `mitarbeiterKennung`), wenn sie noch so ist, wie er sie angelegt hat – aktiv,
 * mit diesem Namen (`mitarbeiterZumNamen`) und einem Kürzel aus dem Namen
 * (`kuerzelWieAngelegt`); hat das Controlling sie bearbeitet, bleibt sie –,
 * keine Leistungen hat und in keinem festgeschriebenen Stand steht
 * (`stundenJeMitarbeiter`) – sonst null.
 */
function automatischAngelegtOhneLeistungen(
  d: Pick<LeistungsnachweisDaten, 'mitarbeiter' | 'leistungen' | 'nachweise'>,
  name: string,
): Mitarbeiter | null {
  if (!name.trim()) return null;
  const kennung = mitarbeiterKennung(name);
  const m = d.mitarbeiter.find((x) => x.id === kennung && x.aktiv);
  if (!m) return null;
  // Vom Controlling bearbeitet (umbenannt, anderes Kürzel)? Dann ist sie mehr als ein Tippfehler
  if (mitarbeiterZumNamen([m], name) === null || !kuerzelWieAngelegt(m)) return null;
  if (d.leistungen.some((l) => l.mitarbeiterId === m.id)) return null;
  const imStand = d.nachweise.some((n) => n.stand?.zeilen.some((z) => m.id in z.stundenJeMitarbeiter));
  return imStand ? null : m;
}

/**
 * Trägt die Person das Kürzel, das `anmeldungAnwenden` ihr beim Anlegen gibt –
 * aus dem Namen (`kuerzelAus`), wenn es vergeben war mit Zahl („CZ2“,
 * `kuerzelFrei`)?
 */
function kuerzelWieAngelegt(m: Mitarbeiter): boolean {
  const basis = kuerzelNormal(kuerzelAus(`${m.vorname} ${m.nachname}`) || 'MA');
  const kuerzel = kuerzelNormal(m.kuerzel);
  if (kuerzel === basis) return true;
  const zahl = kuerzel.startsWith(basis) ? kuerzel.slice(basis.length) : '';
  return /^[1-9]\d*$/.test(zahl) && Number(zahl) >= 2;
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

/** Eigene Leistungen der angemeldeten Person aus einer Liste (ohne Anmeldung keine). */
export function eigeneLeistungen<T extends Pick<Leistung, 'mitarbeiterId'>>(
  d: Pick<LeistungsnachweisDaten, 'einstellungen' | 'mitarbeiter'>,
  leistungen: T[],
): T[] {
  const ich = angemeldet(d);
  return ich ? leistungen.filter((l) => l.mitarbeiterId === ich.id) : [];
}

/**
 * Leistungen einer Nachweiszeile, wie sie aufgeklappt werden dürfen: im
 * Bereich nur die eigenen – die der anderen bleiben verborgen, auch ihre Zahl
 * (`andere` leer, `andereAnzahl` 0, wie `stichpunkteDerPeriode`). Im
 * Controlling stehen auch die der anderen einzeln darin (`andere`, nur lesen).
 * Genutzt wird es heute nur im Controlling (Abrechnung, Leistungstexte); im
 * Bereich zeigt keine Seite Nachweiszeilen – die Seite „Leistungstexte“ nennt
 * allein eigene Stichpunkte (`stichpunkteDerPeriode`).
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
  if (zugang !== 'controlling') return { eigene, andere: [], andereAnzahl: 0 };
  return { eigene, andere: fremd, andereAnzahl: fremd.length };
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
 * eigene Leistungen hat, und nur, solange die Periode nicht gesperrt ist (ein
 * abgeschlossener Nachweis umfasst sie, `abgeschlossenIm` – auch wenn darin nur
 * nach dem Abschluss erfasste Leistungen liegen). Das Controlling liest ihn
 * nur – es bearbeitet die Texte im Nachweis.
 */
export function darfPeriodentextBearbeiten(
  d: Pick<LeistungsnachweisDaten, 'einstellungen' | 'mitarbeiter'>,
  periode: Pick<ErfassungsPeriode, 'leistungen' | 'gesperrt'>,
  zugang: Zugang,
): boolean {
  return zugang === 'bereich' && !periode.gesperrt && eigeneIn(d, periode);
}

/**
 * Stichpunkte einer Periode, wie sie zu sehen sind: im Bereich nur die
 * eigenen – Stichpunkte, Stunden und Leistungen der anderen bleiben dort
 * verborgen, auch ihre Zahl (`andere` leer, `andereAnzahl` 0), selbst wenn man
 * in der Periode eigene Leistungen hat; gemeinsam ist allein der Text der
 * Periode. Im Controlling stehen auch die der anderen darin (Name, Datum,
 * Stunden, Text – nur lesen).
 */
export function stichpunkteDerPeriode(
  d: Pick<LeistungsnachweisDaten, 'einstellungen' | 'mitarbeiter'>,
  periode: Pick<ErfassungsPeriode, 'leistungen'>,
  zugang: Zugang,
): { eigene: Leistung[]; andere: Leistung[]; andereAnzahl: number } {
  const ich = angemeldet(d);
  const eigene = ich ? periode.leistungen.filter((l) => l.mitarbeiterId === ich.id) : [];
  if (zugang !== 'controlling') return { eigene, andere: [], andereAnzahl: 0 };
  const andere = periode.leistungen.filter((l) => !ich || l.mitarbeiterId !== ich.id);
  return { eigene, andere, andereAnzahl: andere.length };
}

/** Darf den Monat bestätigen bzw. die Bestätigung zurücknehmen? Nur im Bereich und nur eigene Monate. */
export function darfBestaetigen(d: Pick<LeistungsnachweisDaten, 'einstellungen' | 'mitarbeiter'>, mitarbeiterId: ID, zugang: Zugang): boolean {
  const ich = angemeldet(d);
  return zugang === 'bereich' && !!ich && ich.id === mitarbeiterId;
}
