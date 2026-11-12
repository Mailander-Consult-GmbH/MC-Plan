/**
 * Anbindung an das Projektregister (`src/gemeinsam/`): Projekte und
 * Projektbeteiligte teilt sich die Projektsteuerung mit den anderen Bereichen,
 * die dasselbe Projekt führen.
 *
 * * `sichtFuerRegister` beschreibt den Bestand für den Abgleich: Nummer,
 *   Bezeichnung, Beschreibung der Projekte; Kontaktdaten und Funktion der
 *   Beteiligten.
 * * `registerPlanAnwenden` übernimmt, was das Register Neues kennt – als reine
 *   Funktion im `mutate()` des Stores. Eine Person führt hier genau eine
 *   Funktion: Bleibt die bisherige im Register, bleibt sie; sonst gilt die erste
 *   bekannte Funktion des Registers. Fehlt sie unter den projektübergreifenden
 *   Funktionen, wird sie angelegt (Funktionen anderer Bereiche heißen teils
 *   anders, etwa „Fachplaner“ statt „Fachplanung“).
 */
import type { Plan, Sicht } from '../../../gemeinsam/abgleich';
import { funktionsSchluessel, type FunktionsBezug, type RegisterPerson } from '../../../gemeinsam/register';
import { kuerzelAus, newId, type Beteiligter, type Funktion, type ID, type ProjektsteuerungDaten } from './types';

export function sichtFuerRegister(d: ProjektsteuerungDaten): Sicht {
  const funktionen = new Map(d.funktionen.map((f) => [f.id, f]));
  return {
    projekte: d.projekte.map((p) => ({ id: p.id, nummer: p.nummer, name: p.name, beschreibung: p.beschreibung })),
    personen: d.beteiligte.map((b) => {
      const f = b.funktionId ? funktionen.get(b.funktionId) : undefined;
      return {
        id: b.id,
        projektId: b.projektId,
        anrede: b.anrede,
        vorname: b.vorname,
        nachname: b.nachname,
        firma: b.firma,
        kuerzel: b.kuerzel,
        email: b.email,
        telefon: b.telefon,
        mobil: b.mobil,
        anschrift: b.anschrift,
        notiz: b.notiz,
        funktionen: f ? [{ name: f.name, gewerk: f.gewerk, kuerzel: f.kuerzel }] : [],
      };
    }),
    // Je Person eine Funktion: Sie muss zu denen des Registers gehören.
    funktionenPassen: (person, register) =>
      register.length === 0
        ? person.funktionen.length === 0
        : person.funktionen.length === 1 &&
          register.some((f) => funktionsSchluessel(f) === funktionsSchluessel(person.funktionen[0])),
  };
}

const felder = (p: RegisterPerson) => ({
  anrede: p.anrede,
  vorname: p.vorname,
  nachname: p.nachname,
  firma: p.firma,
  kuerzel: p.kuerzel,
  email: p.email,
  telefon: p.telefon,
  mobil: p.mobil,
  anschrift: p.anschrift,
  notiz: p.notiz,
});

/** Übernimmt den Plan aus dem Abgleich; ändert er nichts, bleibt der Bestand derselbe. */
export function registerPlanAnwenden(daten: ProjektsteuerungDaten, plan: Plan): ProjektsteuerungDaten {
  let d = daten;
  let funktionen = d.funktionen;
  let gewerke = d.gewerke;

  /** Funktion für eine Person: die bisherige, solange das Register sie nennt, sonst die erste bekannte bzw. eine neue. */
  const funktionFuer = (liste: FunktionsBezug[], bisher: ID | null): ID | null => {
    if (liste.length === 0) return null;
    const schluessel = new Set(liste.map(funktionsSchluessel));
    const aktuell = funktionen.find((f) => f.id === bisher);
    if (aktuell && schluessel.has(funktionsSchluessel(aktuell))) return aktuell.id;
    for (const f of liste) {
      const vorhanden = funktionen.find((x) => funktionsSchluessel(x) === funktionsSchluessel(f));
      if (vorhanden) return vorhanden.id;
    }
    const erste = liste[0];
    const neu: Funktion = {
      id: newId('fn'),
      name: erste.name,
      kuerzel: erste.kuerzel || kuerzelAus(erste.name),
      farbe: '#8e8e93',
      beschreibung: '',
      gewerk: erste.gewerk,
    };
    funktionen = [...funktionen, neu];
    if (neu.gewerk && !gewerke.some((g) => g.toLowerCase() === neu.gewerk!.toLowerCase())) {
      gewerke = [...gewerke, neu.gewerk].sort((a, b) => a.localeCompare(b, 'de'));
    }
    return neu.id;
  };

  // Gelöschte Projekte samt Beteiligten und Protokollen
  if (plan.projekteLoeschen.length > 0) {
    const weg = new Set(plan.projekteLoeschen);
    if (d.projekte.some((p) => weg.has(p.id))) {
      d = {
        ...d,
        projekte: d.projekte.filter((p) => !weg.has(p.id)),
        beteiligte: d.beteiligte.filter((b) => !weg.has(b.projektId)),
        protokolle: d.protokolle.filter((p) => !weg.has(p.projektId)),
      };
    }
  }

  // Übernommene Projekte
  const neueProjekte = plan.projekteAnlegen.filter((x) => !d.projekte.some((p) => p.id === x.id));
  if (neueProjekte.length > 0) {
    d = {
      ...d,
      projekte: [
        ...d.projekte,
        ...neueProjekte.map(({ id, projekt }) => ({
          id,
          nummer: projekt.nummer,
          name: projekt.name || 'Ohne Bezeichnung',
          status: 'aktiv' as const,
          markiert: true,
          beschreibung: projekt.beschreibung,
          logos: null,
        })),
      ],
    };
  }

  // Stammdaten
  for (const a of plan.projekteAendern) {
    const p = d.projekte.find((x) => x.id === a.id);
    if (!p || (p.nummer === a.nummer && p.name === a.name && p.beschreibung === a.beschreibung)) continue;
    d = {
      ...d,
      projekte: d.projekte.map((x) => (x.id === a.id ? { ...x, nummer: a.nummer, name: a.name, beschreibung: a.beschreibung } : x)),
    };
  }

  // Personen
  if (plan.personenLoeschen.length > 0) {
    const weg = new Set(plan.personenLoeschen);
    if (d.beteiligte.some((b) => weg.has(b.id))) d = { ...d, beteiligte: d.beteiligte.filter((b) => !weg.has(b.id)) };
  }
  const projektIds = new Set(d.projekte.map((p) => p.id));
  const neue: Beteiligter[] = plan.personenAnlegen
    .filter((x) => projektIds.has(x.projektId) && !d.beteiligte.some((b) => b.id === x.id))
    .map((x) => ({ id: x.id, projektId: x.projektId, funktionId: funktionFuer(x.person.funktionen, null), ...felder(x.person) }));
  if (neue.length > 0) d = { ...d, beteiligte: [...d.beteiligte, ...neue] };
  for (const a of plan.personenAendern) {
    const b = d.beteiligte.find((x) => x.id === a.id);
    if (!b) continue;
    const neu: Beteiligter = { ...b, ...felder(a.person), funktionId: funktionFuer(a.person.funktionen, b.funktionId) };
    if (JSON.stringify(neu) === JSON.stringify(b)) continue;
    d = { ...d, beteiligte: d.beteiligte.map((x) => (x.id === a.id ? neu : x)) };
  }

  if (funktionen !== d.funktionen || gewerke !== d.gewerke) d = { ...d, funktionen, gewerke };
  return d;
}
