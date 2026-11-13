/**
 * Abgleich zwischen dem Bestand eines Bereichs und dem Projektregister – als
 * reine Funktionen. Jeder Bereich beschreibt seinen Bestand dafür in einer
 * einheitlichen `Sicht` (Projekte mit Nummer und Bezeichnung, Personen mit
 * Kontaktdaten und Funktionen); was der Bereich nicht führt, fehlt in der
 * Sicht (`undefined` bzw. `null`) und bleibt im Register unberührt.
 *
 * Zwei Richtungen:
 *
 * * `uebertragen` – was jemand im Bereich geändert hat (alter gegen neuen
 *   Stand), geht ins Register: geänderte Felder, hinzugekommene und
 *   entfallene Funktionen, gelöschte Personen (mit Vermerk für die anderen
 *   Bereiche) und Projekte, die der Bereich nicht mehr führt.
 * * `abgleichen` – trägt Unbekanntes aus dem Bereich ins Register ein und
 *   liefert einen `Plan`, was der Bereich übernehmen muss: zur Übernahme
 *   vorgesehene Projekte anlegen, gelöschte entfernen, Stammdaten und
 *   Personen auf den Stand des Registers bringen. Ein zweiter Aufruf auf dem
 *   so geänderten Bestand liefert einen leeren Plan.
 *
 * Personen gelten als dieselben, wenn sie im Register mit ihrer Kennung im
 * Bereich verknüpft sind. Beim ersten Abgleich eines Projekts werden Personen
 * gleicher E-Mail-Adresse bzw. gleichen Namens verknüpft, Projekte gleicher
 * Projektnummer (ohne Nummer: gleicher Bezeichnung).
 */
import {
  PERSON_FELDER,
  PROJEKT_BEREICHE,
  funktionsSchluessel,
  newId,
  personName,
  projektImBereich,
  type FunktionsBezug,
  type ID,
  type PersonFelder,
  type ProjektBereich,
  type Register,
  type RegisterPerson,
  type RegisterProjekt,
} from './register';

export interface LokalesProjekt {
  id: ID;
  nummer: string;
  name: string;
  /** null: Der Bereich führt keine Beschreibung. */
  beschreibung: string | null;
}

/** Person im Bereich; Felder, die der Bereich nicht führt, fehlen. */
export interface LokalePerson extends Partial<PersonFelder> {
  id: ID;
  /** Kennung des Projekts im Bereich. */
  projektId: ID;
  funktionen: FunktionsBezug[];
}

export interface Sicht {
  projekte: LokalesProjekt[];
  /** null: Der Bereich führt keine Personen. */
  personen: LokalePerson[] | null;
  /**
   * Ob die Funktionen einer Person dem Register entsprechen, soweit der Bereich
   * sie abbilden kann (etwa nur eine Funktion je Person). Ohne Angabe: dieselben
   * Funktionen. So entsteht kein Plan, den der Bereich nicht erfüllen kann.
   */
  funktionenPassen?: (person: LokalePerson, register: FunktionsBezug[]) => boolean;
}

/** Was ein Bereich aus dem Register übernehmen muss – alle Kennungen sind die des Bereichs. */
export interface Plan {
  projekteAnlegen: { id: ID; projekt: RegisterProjekt }[];
  projekteAendern: { id: ID; nummer: string; name: string; beschreibung: string }[];
  projekteLoeschen: ID[];
  /** Personen in bestehenden oder im selben Plan angelegten Projekten. */
  personenAnlegen: { id: ID; projektId: ID; person: RegisterPerson }[];
  personenAendern: { id: ID; person: RegisterPerson }[];
  personenLoeschen: ID[];
}

export const leererPlan = (): Plan => ({
  projekteAnlegen: [],
  projekteAendern: [],
  projekteLoeschen: [],
  personenAnlegen: [],
  personenAendern: [],
  personenLoeschen: [],
});

export function planLeer(p: Plan): boolean {
  return Object.values(p).every((liste) => liste.length === 0);
}

const klon = (r: Register): Register => JSON.parse(JSON.stringify(r)) as Register;
const norm = (s: string | null | undefined) => (s ?? '').trim().toLowerCase();

/* ------------------------------------------------------------------ */
/* Bausteine                                                           */
/* ------------------------------------------------------------------ */

/** Gleiches Projekt laut Projektnummer; ohne Nummer laut Bezeichnung. */
function gleichesProjekt(p: RegisterProjekt, l: LokalesProjekt): boolean {
  if (norm(p.nummer) || norm(l.nummer)) return norm(p.nummer) === norm(l.nummer);
  return !!norm(p.name) && norm(p.name) === norm(l.name);
}

function stammdatenWeichen(l: LokalesProjekt, p: RegisterProjekt): boolean {
  return l.nummer !== p.nummer || l.name !== p.name || (l.beschreibung !== null && l.beschreibung !== p.beschreibung);
}

/** Kennzeichen der Vermerke, die `stammdatenZusammenfuehren` an die Beschreibung anhängt. */
const VERMERK = ' vor der Zusammenführung: ';

/**
 * Verknüpft der Abgleich ein eigenes Projekt des Bereichs mit einem
 * Registerprojekt gleicher Nummer: Lücken im Register füllt der Bereich,
 * sonst gelten Bezeichnung und Beschreibung des Registers – welche das sind,
 * hängt davon ab, welcher Bereich das Projekt zuerst eingetragen hat. Damit
 * die abweichende Bezeichnung bzw. Beschreibung des Bereichs nicht ohne
 * Hinweis verloren geht, hängt der Abgleich sie als Vermerk an die
 * Beschreibung des Registerprojekts an; so steht sie in allen Bereichen, die
 * eine Beschreibung führen. Vermerke zählen nicht als Beschreibung.
 */
function stammdatenZusammenfuehren(p: RegisterProjekt, l: LokalesProjekt, bereich: ProjektBereich): void {
  const titel = PROJEKT_BEREICHE.find((b) => b.id === bereich)?.titel ?? bereich;
  const einzeilig = (t: string) => t.replace(/\s*\n\s*/g, ' ');
  if (!p.nummer.trim() && l.nummer.trim()) p.nummer = l.nummer;

  const neu: string[] = [];
  const name = l.name.trim();
  if (!p.name.trim()) {
    if (name) p.name = l.name;
  } else if (name && norm(name) !== norm(p.name)) {
    neu.push(`Bezeichnung in ${titel}${VERMERK}„${einzeilig(name)}“`);
  }

  const ohneVermerke = (t: string) =>
    t
      .split('\n')
      .filter((z) => !z.includes(VERMERK))
      .join('\n')
      .trim();
  const vermerke = p.beschreibung.split('\n').filter((z) => z.includes(VERMERK));
  const eigene = ohneVermerke(p.beschreibung);
  const beschreibung = ohneVermerke(l.beschreibung ?? '');
  let fuellt = false;
  if (beschreibung && !eigene) fuellt = true;
  else if (beschreibung && norm(beschreibung) !== norm(eigene)) {
    neu.push(`Beschreibung in ${titel}${VERMERK}${einzeilig(beschreibung)}`);
  }

  const hinzu = neu.filter((v) => !vermerke.includes(v));
  if (!fuellt && hinzu.length === 0) return;
  p.beschreibung = [fuellt ? beschreibung : eigene, ...vermerke, ...hinzu].filter(Boolean).join('\n');
}

/** Gleiche Person laut E-Mail-Adresse, ersatzweise laut Vor- und Nachname. */
function gleichePerson(r: RegisterPerson, l: LokalePerson): boolean {
  if (norm(r.email) && norm(l.email)) return norm(r.email) === norm(l.email);
  const name = (x: Partial<PersonFelder>) => `${norm(x.vorname)} ${norm(x.nachname)}`.trim();
  return !!name(r) && name(r) === name(l);
}

function funktionenVereinigen(a: FunktionsBezug[], b: FunktionsBezug[]): FunktionsBezug[] {
  const schluessel = new Set(a.map(funktionsSchluessel));
  return [...a, ...b.filter((f) => !schluessel.has(funktionsSchluessel(f)))];
}

/** Dieselben Funktionen (nach Bezeichnung und Gewerk)? */
export function gleicheFunktionen(a: FunktionsBezug[], b: FunktionsBezug[]): boolean {
  const x = new Set(a.map(funktionsSchluessel));
  const y = new Set(b.map(funktionsSchluessel));
  return x.size === y.size && [...x].every((k) => y.has(k));
}

/** Weicht die Person im Bereich vom Register ab – in Feldern, die der Bereich führt, oder in den Funktionen? */
export function personWeicht(l: LokalePerson, r: RegisterPerson, funktionenPassen?: Sicht['funktionenPassen']): boolean {
  if (PERSON_FELDER.some((f) => l[f] !== undefined && l[f] !== r[f])) return true;
  return funktionenPassen ? !funktionenPassen(l, r.funktionen) : !gleicheFunktionen(l.funktionen, r.funktionen);
}

function neuePerson(l: LokalePerson, projektId: ID, bereich: ProjektBereich, id: ID, jetzt: string): RegisterPerson {
  const felder = Object.fromEntries(PERSON_FELDER.map((f) => [f, l[f] ?? ''])) as unknown as PersonFelder;
  return { ...felder, id, projektId, funktionen: [...l.funktionen], ids: { [bereich]: l.id }, geaendertAm: jetzt };
}

/**
 * Das Projekt wird im Bereich nicht mehr geführt. Bleibt es in keinem Bereich
 * (auch nicht zur Übernahme vorgesehen), entfällt es samt seinen Personen.
 */
function mitgliedschaftLoesen(r: Register, projektId: ID, bereich: ProjektBereich): void {
  const p = r.projekte.find((x) => x.id === projektId);
  if (!p) return;
  delete p.bereiche[bereich];
  r.personen.filter((x) => x.projektId === projektId).forEach((x) => delete x.ids[bereich]);
  if (Object.keys(p.bereiche).length === 0) {
    r.projekte = r.projekte.filter((x) => x.id !== projektId);
    r.personen = r.personen.filter((x) => x.projektId !== projektId);
  }
}

/** Entfernt eine Person; die anderen Bereiche löschen sie beim nächsten Abgleich. */
function personEntfernen(r: Register, person: RegisterPerson, bereich: ProjektBereich, jetzt: string): void {
  r.personen = r.personen.filter((x) => x.id !== person.id);
  const offen = { ...person.ids };
  delete offen[bereich];
  if (Object.keys(offen).length > 0) {
    r.geloescht.push({ art: 'person', offen, bezeichnung: personName(person), am: jetzt });
  }
}

/* ------------------------------------------------------------------ */
/* Änderungen des Bereichs ins Register                                */
/* ------------------------------------------------------------------ */

/** Überträgt, was sich zwischen `alt` und `neu` im Bereich geändert hat, ins Register. */
export function uebertragen(bereich: ProjektBereich, alt: Sicht, neu: Sicht, register: Register, jetzt: string): Register {
  const r = klon(register);
  const neueProjekte = new Map(neu.projekte.map((p) => [p.id, p]));

  for (const a of alt.projekte) {
    const reg = projektImBereich(r, bereich, a.id);
    if (!reg) continue;
    const n = neueProjekte.get(a.id);
    if (!n) {
      mitgliedschaftLoesen(r, reg.id, bereich);
      continue;
    }
    let geaendert = false;
    if (a.nummer !== n.nummer) (reg.nummer = n.nummer), (geaendert = true);
    if (a.name !== n.name) (reg.name = n.name), (geaendert = true);
    if (n.beschreibung !== null && a.beschreibung !== n.beschreibung) (reg.beschreibung = n.beschreibung), (geaendert = true);
    if (geaendert) reg.geaendertAm = jetzt;
  }

  if (alt.personen && neu.personen) {
    const neuePersonen = new Map(neu.personen.map((p) => [p.id, p]));
    for (const a of alt.personen) {
      if (!neueProjekte.has(a.projektId)) continue;
      const regProjekt = projektImBereich(r, bereich, a.projektId);
      if (!regProjekt) continue;
      const reg = r.personen.find((x) => x.projektId === regProjekt.id && x.ids[bereich] === a.id);
      if (!reg) continue;
      const n = neuePersonen.get(a.id);
      if (!n) {
        personEntfernen(r, reg, bereich, jetzt);
        continue;
      }
      let geaendert = false;
      for (const f of PERSON_FELDER) {
        const wert = n[f];
        if (wert === undefined || a[f] === wert || reg[f] === wert) continue;
        reg[f] = wert;
        geaendert = true;
      }
      const vorher = new Set(a.funktionen.map(funktionsSchluessel));
      const nachher = new Set(n.funktionen.map(funktionsSchluessel));
      const weg = [...vorher].filter((k) => !nachher.has(k));
      const dazu = n.funktionen.filter((f) => !vorher.has(funktionsSchluessel(f)));
      if (weg.length > 0 || dazu.length > 0) {
        const ohne = reg.funktionen.filter((f) => !weg.includes(funktionsSchluessel(f)));
        const funktionen = funktionenVereinigen(ohne, dazu);
        if (JSON.stringify(funktionen) !== JSON.stringify(reg.funktionen)) {
          reg.funktionen = funktionen;
          geaendert = true;
        }
      }
      if (geaendert) reg.geaendertAm = jetzt;
    }
  }
  return r;
}

/* ------------------------------------------------------------------ */
/* Register und Bereich abgleichen                                     */
/* ------------------------------------------------------------------ */

/**
 * Trägt Projekte und Personen des Bereichs, die das Register noch nicht
 * kennt, ein und liefert, was der Bereich aus dem Register übernehmen muss.
 * Verändert nichts im Bereich selbst – das erledigt dessen Store mit dem Plan.
 *
 * `vollstaendig`: Der Bestand ist frisch geladen, eingespielt oder
 * zurückgesetzt und gilt als maßgeblich – dann löst der Abgleich
 * Mitgliedschaften, deren Projekt der Bereich nicht (mehr) führt. Sonst meldet
 * das allein `uebertragen` (alter gegen neuer Stand): Ein zweites Fenster
 * desselben Bereichs mit älterem Bestand soll nicht zurücknehmen, was das erste
 * eben eingetragen hat – sonst schaukeln sich die beiden Fenster endlos auf.
 *
 * Bestand und Register müssen zueinander passen: Mit einem neueren Bestand
 * und einem älteren Register (oder umgekehrt) hielte der Abgleich Änderungen
 * des einen für Rückstände und nähme sie zurück. Einen Bestand, den ein
 * anderes Fenster gespeichert hat, gleicht `useRegisterAbgleich` deshalb erst
 * ab, wenn sich danach auch das Register ändert.
 */
export function abgleichen(
  bereich: ProjektBereich,
  sicht: Sicht,
  register: Register,
  jetzt: string,
  vollstaendig = true,
): { register: Register; plan: Plan } {
  const r = klon(register);
  const plan = leererPlan();
  const lokal = new Map(sicht.projekte.map((p) => [p.id, p]));
  const lokalePersonen = sicht.personen ? new Map(sicht.personen.map((p) => [p.id, p])) : null;

  // 1. Gelöschtes: Was im Register gelöscht wurde, entfällt auch im Bereich.
  r.geloescht = r.geloescht.filter((g) => {
    const id = g.offen[bereich];
    if (!id) return true;
    const vorhanden = g.art === 'projekt' ? lokal.has(id) : !!lokalePersonen?.has(id);
    if (vorhanden) {
      (g.art === 'projekt' ? plan.projekteLoeschen : plan.personenLoeschen).push(id);
      return true; // bleibt vermerkt, bis der Bereich gelöscht hat
    }
    delete g.offen[bereich];
    return Object.keys(g.offen).length > 0;
  });
  const projektWeg = new Set(plan.projekteLoeschen);
  const personWeg = new Set(plan.personenLoeschen);

  // 2. Projekte des Bereichs laut Register: zur Übernahme vorgesehene mit einem
  //    noch nicht verknüpften eigenen Projekt gleicher Nummer verknüpfen bzw.
  //    anlegen, nicht mehr geführte lösen (nur bei maßgeblichem Bestand),
  //    Stammdaten auf den Stand des Registers bringen.
  const verknuepft = new Set<ID>(
    r.projekte.flatMap((p) => {
      const id = p.bereiche[bereich]?.id;
      return id && lokal.has(id) ? [id] : [];
    }),
  );
  for (const p of [...r.projekte]) {
    const m = p.bereiche[bereich];
    if (!m) continue;
    let l = lokal.get(m.id);
    if (!l && m.offen) {
      // Zur Übernahme vorgesehen ist ein Projekt, das der Bereich schon führt, aber noch nicht gemeldet hat
      l = sicht.projekte.find((k) => !verknuepft.has(k.id) && !projektWeg.has(k.id) && gleichesProjekt(p, k));
      if (l) {
        m.id = l.id;
        verknuepft.add(l.id);
        // Kennungen, die ein früherer Abgleich für die Personen vorgesehen hatte, gelten nicht mehr
        r.personen
          .filter((x) => x.projektId === p.id && x.ids[bereich] && !lokalePersonen?.has(x.ids[bereich]!))
          .forEach((x) => delete x.ids[bereich]);
        stammdatenZusammenfuehren(p, l, bereich);
      }
    }
    if (!l) {
      if (m.offen) plan.projekteAnlegen.push({ id: m.id, projekt: p });
      else if (vollstaendig) mitgliedschaftLoesen(r, p.id, bereich);
      continue;
    }
    m.offen = false;
    if (!projektWeg.has(l.id) && stammdatenWeichen(l, p)) {
      plan.projekteAendern.push({ id: l.id, nummer: p.nummer, name: p.name, beschreibung: p.beschreibung });
    }
  }

  // 3. Projekte, die das Register noch nicht kennt: mit einem gleichen Projekt
  //    eines anderen Bereichs verknüpfen oder neu eintragen.
  for (const l of sicht.projekte) {
    if (projektWeg.has(l.id) || projektImBereich(r, bereich, l.id)) continue;
    const gleich = r.projekte.find((p) => !p.bereiche[bereich] && gleichesProjekt(p, l));
    if (gleich) {
      gleich.bereiche[bereich] = { id: l.id, archiviert: false, offen: false };
      // Lücken im Register füllt der Bereich, sonst gilt das Register –
      // Abweichendes des Bereichs bleibt in der Beschreibung vermerkt
      stammdatenZusammenfuehren(gleich, l, bereich);
      if (stammdatenWeichen(l, gleich)) {
        plan.projekteAendern.push({ id: l.id, nummer: gleich.nummer, name: gleich.name, beschreibung: gleich.beschreibung });
      }
      continue;
    }
    r.projekte.push({
      id: r.projekte.some((p) => p.id === l.id) ? newId('prj') : l.id,
      nummer: l.nummer,
      name: l.name,
      beschreibung: l.beschreibung ?? '',
      angelegtAm: jetzt,
      geaendertAm: jetzt,
      bereiche: { [bereich]: { id: l.id, archiviert: false, offen: false } },
    });
  }

  // 4. Personen der Projekte, die der Bereich führt bzw. jetzt anlegt.
  if (sicht.personen && lokalePersonen) {
    const belegt = new Set(sicht.personen.map((x) => x.id));
    for (const p of r.projekte) {
      const m = p.bereiche[bereich];
      if (!m || projektWeg.has(m.id)) continue;
      const wirdAngelegt = !lokal.has(m.id);
      if (wirdAngelegt && !plan.projekteAnlegen.some((x) => x.id === m.id)) continue;
      const imRegister = r.personen.filter((x) => x.projektId === p.id);

      // a) Personen des Bereichs zuordnen bzw. eintragen
      const imBereich = wirdAngelegt ? [] : sicht.personen.filter((x) => x.projektId === m.id && !personWeg.has(x.id));
      for (const l of imBereich) {
        if (imRegister.some((x) => x.ids[bereich] === l.id)) continue;
        const gleich = imRegister.find((x) => !x.ids[bereich] && gleichePerson(x, l));
        if (gleich) {
          gleich.ids[bereich] = l.id;
          for (const f of PERSON_FELDER) {
            const wert = l[f];
            if (wert !== undefined && !gleich[f].trim() && wert.trim()) gleich[f] = wert;
          }
          gleich.funktionen = funktionenVereinigen(gleich.funktionen, l.funktionen);
          continue;
        }
        const id = r.personen.some((x) => x.id === l.id) ? newId('pers') : l.id;
        const neu = neuePerson(l, p.id, bereich, id, jetzt);
        r.personen.push(neu);
        imRegister.push(neu);
      }

      // b) Personen des Registers in den Bereich
      for (const x of imRegister) {
        const id = x.ids[bereich];
        if (id) {
          if (personWeg.has(id)) continue;
          const l = lokalePersonen.get(id);
          if (!l) plan.personenAnlegen.push({ id, projektId: m.id, person: x });
          else if (personWeicht(l, x, sicht.funktionenPassen)) plan.personenAendern.push({ id, person: x });
          continue;
        }
        const neueId = belegt.has(x.id) ? newId('pers') : x.id;
        belegt.add(neueId);
        x.ids[bereich] = neueId;
        plan.personenAnlegen.push({ id: neueId, projektId: m.id, person: x });
      }
    }
  }

  return { register: r, plan };
}

/* ------------------------------------------------------------------ */
/* Aktionen auf dem Register („Übernehmen in …“ und Archiv je Bereich) */
/* ------------------------------------------------------------------ */

/** Archiviert ein Projekt in einem Bereich bzw. holt es dort zurück – über seine Kennung im Bereich. */
export function bereichArchivieren(register: Register, bereich: ProjektBereich, lokaleId: ID, archiviert: boolean): Register {
  const r = klon(register);
  const m = projektImBereich(r, bereich, lokaleId)?.bereiche[bereich];
  if (!m || m.archiviert === archiviert) return register;
  m.archiviert = archiviert;
  return r;
}

/**
 * Sieht ein Projekt zur Übernahme in einen Bereich vor; der Bereich legt es
 * beim nächsten Abgleich mit der Kennung `lokaleId` an – samt Beteiligten.
 */
export function inBereichUebernehmen(register: Register, id: ID, bereich: ProjektBereich, lokaleId: ID): Register {
  const r = klon(register);
  const p = r.projekte.find((x) => x.id === id);
  if (!p || p.bereiche[bereich]) return register;
  p.bereiche[bereich] = { id: lokaleId, archiviert: false, offen: true };
  return r;
}
