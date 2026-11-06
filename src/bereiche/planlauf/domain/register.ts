/**
 * Anbindung an das Projektregister (`src/gemeinsam/`): Projekte und Kontakte
 * teilt sich das Planlaufmanagement mit den anderen Bereichen, die dasselbe
 * Projekt führen.
 *
 * * `sichtFuerRegister` beschreibt den Bestand für den Abgleich: Nummer,
 *   Bezeichnung, Beschreibung der Projekte; Kontaktdaten und Funktionen der
 *   Kontakte. Der eigene Kontakt (*Angemeldet als*) und die Funktion
 *   Planlaufmanagement bleiben außen vor – sie gehören zur angemeldeten Person
 *   dieses Arbeitsplatzes.
 * * `registerPlanAnwenden` übernimmt, was das Register Neues kennt – als reine
 *   Funktion im `mutate()` des Stores (Löschen mit Löschvermerk über
 *   domain/bestand.ts). Funktionen werden über Bezeichnung und Gewerk erkannt;
 *   fehlt eine im Projekt, wird sie als Projektfunktion angelegt. Eine
 *   Funktion, die bereits eine andere Person ausfüllt, bleibt bei dieser.
 */
import type { Plan, Sicht } from '../../../gemeinsam/abgleich';
import { funktionsSchluessel, type FunktionsBezug, type RegisterPerson } from '../../../gemeinsam/register';
import { kontaktLoeschen, projektLoeschen, type Vorgang } from './bestand';
import {
  istEigeneFunktion,
  kuerzelAus,
  seiteAusFunktion,
  type AppData,
  type Contact,
  type ID,
  type Project,
  type Role,
  type Zuordnung,
} from './types';

export function sichtFuerRegister(d: AppData): Sicht {
  const rollen = new Map(d.roles.map((r) => [r.id, r]));
  /** Wer welche Funktion ausfüllt: Projekt|Schlüssel → Kontakte. */
  const inhaber = new Map<string, ID[]>();
  for (const c of d.contacts) {
    for (const z of c.zuordnungen) {
      const r = rollen.get(z.roleId);
      if (!r) continue;
      const k = `${c.projectId}|${funktionsSchluessel(r)}`;
      inhaber.set(k, [...(inhaber.get(k) ?? []), c.id]);
    }
  }
  return {
    /**
     * Die Funktionen passen, wenn die Person keine führt, die das Register
     * nicht nennt, und jede fehlende bereits eine andere Person ausfüllt –
     * mehr kann der Abgleich nicht erreichen (siehe zuordnungenFuer).
     */
    funktionenPassen: (person, register) => {
      const ziel = register.filter((f) => !istEigeneFunktion(f));
      const schluessel = new Set(ziel.map(funktionsSchluessel));
      if (person.funktionen.some((f) => !schluessel.has(funktionsSchluessel(f)))) return false;
      const eigene = new Set(person.funktionen.map(funktionsSchluessel));
      return ziel.every((f) => {
        const k = funktionsSchluessel(f);
        if (eigene.has(k)) return true;
        return (inhaber.get(`${person.projektId}|${k}`) ?? []).some((id) => id !== person.id);
      });
    },
    projekte: d.projects.map((p) => ({ id: p.id, nummer: p.nummer, name: p.name, beschreibung: p.beschreibung })),
    personen: d.contacts
      .filter((c) => !c.eigen)
      .map((c) => {
        const funktionen: FunktionsBezug[] = [];
        for (const z of c.zuordnungen) {
          const r = rollen.get(z.roleId);
          if (!r || istEigeneFunktion(r)) continue;
          if (funktionen.some((f) => funktionsSchluessel(f) === funktionsSchluessel(r))) continue;
          funktionen.push({ name: r.name, gewerk: r.gewerk, kuerzel: r.kuerzel });
        }
        return {
          id: c.id,
          projektId: c.projectId,
          anrede: c.anrede,
          vorname: c.vorname,
          nachname: c.nachname,
          firma: c.firma,
          email: c.email,
          telefon: c.telefon,
          anschrift: c.anschrift,
          notiz: c.notiz,
          funktionen,
        };
      }),
  };
}

const felder = (p: RegisterPerson) => ({
  anrede: p.anrede,
  vorname: p.vorname,
  nachname: p.nachname,
  firma: p.firma,
  email: p.email,
  telefon: p.telefon,
  anschrift: p.anschrift,
  notiz: p.notiz,
});

/** Neues Projekt aus dem Register – mit den Einstellungen eines im Planlaufmanagement angelegten Projekts. */
function neuesProjekt(id: ID, werte: { nummer: string; name: string; beschreibung: string }): Project {
  return {
    id,
    nummer: werte.nummer,
    name: werte.name || 'Ohne Bezeichnung',
    status: 'aktiv',
    markiert: true,
    beschreibung: werte.beschreibung,
    settings: { erinnerungVorlaufTage: 5, fristenInArbeitstagen: true, feiertage: [], absenderName: '', absenderEmail: '' },
  };
}

/**
 * Übernimmt den Plan aus dem Abgleich; ändert er nichts, bleibt der Bestand
 * derselbe. `neueId` vergibt Kennungen neuer Projektfunktionen.
 */
export function registerPlanAnwenden(daten: AppData, plan: Plan, vorgang: Vorgang, neueId: (prefix: string) => ID): AppData {
  let d = daten;

  // Gelöschte Projekte – mit Löschvermerk für jedes Element
  for (const id of plan.projekteLoeschen) d = projektLoeschen(d, id, vorgang);

  // Übernommene Projekte samt den projektübergreifenden Funktionen
  for (const { id, projekt } of plan.projekteAnlegen) {
    if (d.projects.some((p) => p.id === id)) continue;
    const rollen: Role[] = d.standardRollen.map((r) => ({
      id: neueId('rol'),
      projectId: id,
      name: r.name,
      kuerzel: r.kuerzel,
      farbe: r.farbe,
      beschreibung: r.beschreibung,
      gewerk: r.gewerk,
      seite: r.seite ?? null,
    }));
    d = { ...d, projects: [...d.projects, neuesProjekt(id, projekt)], roles: [...d.roles, ...rollen] };
  }

  // Stammdaten
  for (const a of plan.projekteAendern) {
    const p = d.projects.find((x) => x.id === a.id);
    if (!p || (p.nummer === a.nummer && p.name === a.name && p.beschreibung === a.beschreibung)) continue;
    d = {
      ...d,
      projects: d.projects.map((x) => (x.id === a.id ? { ...x, nummer: a.nummer, name: a.name, beschreibung: a.beschreibung } : x)),
    };
  }

  // Gelöschte Personen – offene Schritte verlieren sie, die Besetzung zieht nach
  for (const id of plan.personenLoeschen) d = kontaktLoeschen(d, id, vorgang);

  /**
   * Besetzungen einer Person laut Register: bleibt, was das Register nennt
   * (und die eigene Funktion), dazu kommen fehlende Funktionen – sofern sie
   * nicht schon eine andere Person ausfüllt.
   */
  const zuordnungenFuer = (projectId: ID, kontaktId: ID, liste: FunktionsBezug[], bisher: Zuordnung[]): Zuordnung[] => {
    const ziel = liste.filter((f) => !istEigeneFunktion(f));
    const schluessel = new Set(ziel.map(funktionsSchluessel));
    const rolle = (id: ID) => d.roles.find((r) => r.id === id);
    const ergebnis = bisher.filter((z) => {
      const r = rolle(z.roleId);
      return !r || istEigeneFunktion(r) || schluessel.has(funktionsSchluessel(r));
    });
    for (const f of ziel) {
      const k = funktionsSchluessel(f);
      if (ergebnis.some((z) => {
        const r = rolle(z.roleId);
        return r && funktionsSchluessel(r) === k;
      })) continue;
      let r = d.roles.find((x) => x.projectId === projectId && funktionsSchluessel(x) === k);
      if (!r) {
        const vorlage = d.standardRollen.find((x) => funktionsSchluessel(x) === k);
        r = {
          id: neueId('rol'),
          projectId,
          name: f.name,
          kuerzel: f.kuerzel || vorlage?.kuerzel || kuerzelAus(f.name),
          farbe: vorlage?.farbe ?? '#8e8e93',
          beschreibung: vorlage?.beschreibung ?? '',
          gewerk: f.gewerk,
          seite: vorlage?.seite ?? seiteAusFunktion(f.name),
        };
        const gewerk = f.gewerk;
        d = {
          ...d,
          roles: [...d.roles, r],
          gewerke:
            gewerk && !d.gewerke.some((g) => g.trim().toLowerCase() === gewerk.trim().toLowerCase())
              ? [...d.gewerke, gewerk].sort((a, b) => a.localeCompare(b, 'de'))
              : d.gewerke,
        };
      }
      const rid = r.id;
      const besetzt = d.contacts.some((c) => c.id !== kontaktId && c.projectId === projectId && c.zuordnungen.some((z) => z.roleId === rid));
      if (besetzt) continue;
      ergebnis.push({ roleId: r.id, gewerk: r.gewerk });
    }
    return ergebnis;
  };

  // Neue Personen
  for (const { id, projektId, person } of plan.personenAnlegen) {
    if (!d.projects.some((p) => p.id === projektId) || d.contacts.some((c) => c.id === id)) continue;
    const kontakt: Contact = {
      id,
      projectId: projektId,
      ...felder(person),
      sharepointEingang: '',
      sharepointAusgang: '',
      zuordnungen: [],
      eigen: false,
    };
    kontakt.zuordnungen = zuordnungenFuer(projektId, id, person.funktionen, []);
    d = { ...d, contacts: [...d.contacts, kontakt] };
  }

  // Geänderte Personen
  for (const { id, person } of plan.personenAendern) {
    const c = d.contacts.find((x) => x.id === id);
    if (!c || c.eigen) continue;
    const zuordnungen = zuordnungenFuer(c.projectId, c.id, person.funktionen, c.zuordnungen);
    const neu: Contact = { ...c, ...felder(person), zuordnungen };
    if (JSON.stringify(neu) === JSON.stringify(c)) continue;
    d = { ...d, contacts: d.contacts.map((x) => (x.id === id ? neu : x)) };
  }

  return d;
}
