/**
 * Anbindung an das Projektregister (`src/gemeinsam/`): Projekte und Kontakte
 * teilt sich das Planlaufmanagement mit den anderen Bereichen, die dasselbe
 * Projekt führen.
 *
 * * `sichtFuerRegister` beschreibt den Bestand für den Abgleich: Nummer,
 *   G-Nummer, Bezeichnung, Beschreibung der Projekte; Kontaktdaten und Funktionen der
 *   Kontakte. Der eigene Kontakt (*Angemeldet als*) und die Funktion
 *   Planlaufmanagement bleiben außen vor – sie gehören zur angemeldeten Person
 *   dieses Arbeitsplatzes.
 * * `registerPlanAnwenden` übernimmt, was das Register Neues kennt – als reine
 *   Funktion im `mutate()` des Stores (Löschen mit Löschvermerk über
 *   domain/bestand.ts). Funktionen werden über Bezeichnung und Gewerk erkannt;
 *   fehlt eine im Projekt, wird sie als Projektfunktion angelegt. Eine
 *   Funktion, die bereits eine andere Person ausfüllt, bleibt bei dieser.
 *
 * Die Art der Funktion geht als Beigabe mit (`FunktionsBezug.art`): Sie gehört
 * nicht zum Schlüssel, und eine Änderung allein an ihr wird nicht übertragen.
 * Eine aus dem Register angelegte Funktion bekommt die Art, die das Register
 * nennt – so führen die Bereiche sie unter derselben Art.
 *
 * Frühere Bezeichnungen (`FUNKTIONS_UMBENENNUNGEN`) gelten gegenüber dem
 * Register als die heutigen (`registerSchluessel`): Das Register führt seit
 * seiner Fassung 5 nur noch die Bezeichnungen des Funktionskatalogs. Im
 * Projekt kann eine Funktion ihre frühere Bezeichnung behalten haben – bei der
 * Umstellung, wenn die neue im selben Gewerk schon vergeben und besetzt war
 * (store/katalogUmstellung.ts). Ohne diese Gleichsetzung nähme ihr der erste
 * Abgleich die Person: Das Register nennt für sie die neue Bezeichnung, und
 * die füllt im Projekt schon jemand anderes aus.
 */
import type { Plan, Sicht } from '../../../gemeinsam/abgleich';
import { artAus, artInfo, umbenannt } from '../../../gemeinsam/funktionskatalog';
import { funktionsSchluessel, type FunktionsBezug, type RegisterPerson } from '../../../gemeinsam/register';
import { kontaktLoeschen, projektLoeschen, type Vorgang } from './bestand';
import {
  istEigeneFunktion,
  kuerzelAus,
  leereStammdaten,
  seiteAusArt,
  type AppData,
  type Contact,
  type ID,
  type Project,
  type Role,
  type Zuordnung,
} from './types';

/**
 * Schlüssel einer Funktion gegenüber dem Register: Bezeichnung + Gewerk
 * (`funktionsSchluessel`), eine frühere Bezeichnung zählt als die heutige
 * (siehe Kopf der Datei). Für Funktionen des Projekts wie für die Nennungen
 * des Registers.
 */
const registerSchluessel = (f: { name: string; gewerk: string | null }): string =>
  funktionsSchluessel({ name: umbenannt(f.name, f.gewerk), gewerk: f.gewerk });

export function sichtFuerRegister(d: AppData): Sicht {
  const rollen = new Map(d.roles.map((r) => [r.id, r]));
  /** Wer welche Funktion ausfüllt: Projekt|Schlüssel → Kontakte. */
  const inhaber = new Map<string, ID[]>();
  for (const c of d.contacts) {
    for (const z of c.zuordnungen) {
      const r = rollen.get(z.roleId);
      if (!r) continue;
      const k = `${c.projectId}|${registerSchluessel(r)}`;
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
      const schluessel = new Set(ziel.map(registerSchluessel));
      if (person.funktionen.some((f) => !schluessel.has(registerSchluessel(f)))) return false;
      const eigene = new Set(person.funktionen.map(registerSchluessel));
      return ziel.every((f) => {
        const k = registerSchluessel(f);
        if (eigene.has(k)) return true;
        return (inhaber.get(`${person.projektId}|${k}`) ?? []).some((id) => id !== person.id);
      });
    },
    projekte: d.projects.map((p) => ({ id: p.id, nummer: p.nummer, gNummer: p.gNummer, name: p.name, beschreibung: p.beschreibung })),
    personen: d.contacts
      .filter((c) => !c.eigen)
      .map((c) => {
        const funktionen: FunktionsBezug[] = [];
        for (const z of c.zuordnungen) {
          const r = rollen.get(z.roleId);
          if (!r || istEigeneFunktion(r)) continue;
          if (funktionen.some((f) => registerSchluessel(f) === registerSchluessel(r))) continue;
          // Dem Register gegenüber unter der heutigen Bezeichnung – so führt es die Funktion
          funktionen.push({ name: umbenannt(r.name, r.gewerk), gewerk: r.gewerk, kuerzel: r.kuerzel, art: r.art });
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
          mobil: c.mobil,
          oe: c.oe,
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
  mobil: p.mobil,
  oe: p.oe,
  anschrift: p.anschrift,
  notiz: p.notiz,
});

/** Neues Projekt aus dem Register – mit den Einstellungen eines im Planlaufmanagement angelegten Projekts. */
function neuesProjekt(id: ID, werte: { nummer: string; gNummer: string | null; name: string; beschreibung: string }): Project {
  return {
    id,
    nummer: werte.nummer,
    gNummer: werte.gNummer ?? '',
    stammdaten: leereStammdaten(),
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
      art: r.art,
      gewerk: r.gewerk,
      seite: r.seite ?? null,
    }));
    d = { ...d, projects: [...d.projects, neuesProjekt(id, projekt)], roles: [...d.roles, ...rollen] };
  }

  // Stammdaten
  for (const a of plan.projekteAendern) {
    const p = d.projects.find((x) => x.id === a.id);
    // Eine G-Nummer, die das Register (noch) nicht kennt (null), bleibt stehen
    const gNummer = a.gNummer ?? p?.gNummer ?? '';
    if (!p || (p.nummer === a.nummer && p.gNummer === gNummer && p.name === a.name && p.beschreibung === a.beschreibung)) continue;
    d = {
      ...d,
      projects: d.projects.map((x) =>
        x.id === a.id ? { ...x, nummer: a.nummer, gNummer, name: a.name, beschreibung: a.beschreibung } : x,
      ),
    };
  }

  // Gelöschte Personen – offene Schritte verlieren sie, die Besetzung zieht nach
  for (const id of plan.personenLoeschen) d = kontaktLoeschen(d, id, vorgang);

  /**
   * Besetzungen einer Person laut Register: bleibt, was das Register nennt
   * (und die eigene Funktion), dazu kommen fehlende Funktionen – sofern sie
   * nicht schon eine andere Person ausfüllt. Verglichen wird über
   * `registerSchluessel` (frühere Bezeichnungen zählen als die heutigen). Eine
   * Funktion, die das Projekt noch nicht führt, wird angelegt: mit der Art aus
   * dem Register (fehlt sie oder ist sie unbekannt, laut Funktionskatalog),
   * Kürzel, Farbe, Seite und Beschreibung von der projektübergreifenden
   * Funktion gleichen Schlüssels – sonst Kürzel aus dem Register bzw. aus der
   * Bezeichnung, Farbe und Seite aus der Art.
   */
  const zuordnungenFuer = (projectId: ID, kontaktId: ID, liste: FunktionsBezug[], bisher: Zuordnung[]): Zuordnung[] => {
    const ziel = liste.filter((f) => !istEigeneFunktion(f));
    const schluessel = new Set(ziel.map(registerSchluessel));
    const rolle = (id: ID) => d.roles.find((r) => r.id === id);
    const vergeben = (rid: ID) =>
      d.contacts.some((c) => c.id !== kontaktId && c.projectId === projectId && c.zuordnungen.some((z) => z.roleId === rid));
    const ergebnis = bisher.filter((z) => {
      const r = rolle(z.roleId);
      return !r || istEigeneFunktion(r) || schluessel.has(registerSchluessel(r));
    });
    for (const f of ziel) {
      const k = registerSchluessel(f);
      if (ergebnis.some((z) => {
        const r = rolle(z.roleId);
        return r && registerSchluessel(r) === k;
      })) continue;
      // Führt das Projekt die Funktion unter früherer und heutiger Bezeichnung, gilt die noch freie
      const passende = d.roles.filter((x) => x.projectId === projectId && registerSchluessel(x) === k);
      let r = passende.find((x) => !vergeben(x.id)) ?? passende[0];
      if (!r) {
        // Unter der heutigen Bezeichnung – nennt das Register eine frühere, entsteht sie hier nicht neu
        const name = umbenannt(f.name, f.gewerk);
        const vorlage = d.standardRollen.find((x) => funktionsSchluessel(x) === k);
        const art = artAus(f.art, name, f.gewerk);
        const neu: Role = {
          id: neueId('rol'),
          projectId,
          name,
          kuerzel: vorlage?.kuerzel || f.kuerzel || kuerzelAus(name),
          farbe: vorlage?.farbe ?? artInfo(art).farbe,
          beschreibung: vorlage?.beschreibung ?? '',
          art,
          gewerk: f.gewerk,
          seite: vorlage ? (vorlage.seite ?? null) : seiteAusArt(art, name),
        };
        r = neu;
        const gewerk = f.gewerk;
        d = {
          ...d,
          roles: [...d.roles, neu],
          gewerke:
            gewerk && !d.gewerke.some((g) => g.trim().toLowerCase() === gewerk.trim().toLowerCase())
              ? [...d.gewerke, gewerk].sort((a, b) => a.localeCompare(b, 'de'))
              : d.gewerke,
        };
      }
      if (vergeben(r.id)) continue;
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
