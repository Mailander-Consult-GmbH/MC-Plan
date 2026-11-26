/**
 * Umstellung eines Bestands auf den Funktionskatalog
 * (src/gemeinsam/funktionskatalog.ts) – einmalig, mit Stammdaten-Fassung 7.
 *
 * Bis Fassung 6 lieferte das Planlaufmanagement zwei übergreifende Funktionen
 * (Planlaufmanagement, Projektleitung) und dreizehn je Gewerk mit; jedes
 * Projekt führte alle als Kopie. Seit Fassung 7 kommen die mitgelieferten
 * Funktionen aus dem Katalog der Anwender, gegliedert nach der Art der
 * Funktion. `funktionenAufKatalogUmstellen` bringt einen vorhandenen Bestand
 * auf diesen Stand, ohne dass eine Person ihre Funktion oder ein Schritt seine
 * zuständige Person verliert:
 *
 * 1. Frühere Bezeichnungen bekommen die des Katalogs (`FUNKTIONS_UMBENENNUNGEN`)
 *    – an den Funktionen der Projekte und an allen Stellen, die eine Funktion
 *    nur beim Namen nennen: Schritte und E-Mail-Regeln der Workflows und
 *    Planläufe (samt den Momentaufnahmen erledigter Schritte) und die
 *    Ansprechpartner der Pflichtenhefte und ihrer Vorlagen.
 * 2. Jede Funktion erhält ihre Art.
 * 3. Die projektübergreifenden Funktionen sind die des Katalogs und die selbst
 *    angelegten.
 * 4. In den Projekten entfallen früher mitgelieferte Funktionen, die der
 *    Katalog nicht mehr führt und die niemand ausfüllt; die des Katalogs
 *    kommen hinzu – mit einer festen Kennung aus Projekt und Katalogeintrag,
 *    damit Bestand, Sicherung und ein zweites Gerät dieselbe vergeben.
 *    Besetzte und selbst angelegte Funktionen bleiben immer.
 * 5. Die Gewerke des Katalogs kommen hinzu – in der Schreibweise, die der
 *    Bestand schon führt; OSE entfällt, wo es niemand mehr nennt.
 * 6. Kein offener Schritt eines laufenden Planlaufs wechselt dabei die
 *    zuständige Person: Meinte er nach der Umstellung eine andere Funktion
 *    (etwa die neue, unbesetzte des Gewerks statt der besetzten
 *    übergreifenden gleicher Bezeichnung), bleibt die bisherige Person am
 *    Schritt stehen – wie von Hand gesetzt. Erledigte Schritte fasst das Netz
 *    nicht an (sie halten fest, wer sie bearbeitet hat); wird einer später
 *    wieder geöffnet, folgt er der Funktion, die dann für ihn gilt.
 *
 * Das Projektregister und die Projektsteuerung stellen ihre Bestände mit
 * derselben Tabelle um – sonst holte der Abgleich die alten Bezeichnungen
 * zurück. Die Funktion ist rein (`neueId` vergibt nur dort eine Kennung, wo
 * die feste schon vergeben ist) und ändert auf einem schon umgestellten
 * Bestand nichts mehr.
 */
import {
  KATALOG_GEWERKE,
  artAus,
  fehlendeKatalogFunktionen,
  katalogEintrag,
  umbenannt,
  umbenannterVerweis,
} from '../../../gemeinsam/funktionskatalog';
import { funktionsSchluessel } from '../../../gemeinsam/register';
import { kontaktFuerRolleUndGewerk, rolleFuerSchritt } from '../domain/engine';
import { STANDARD_ROLLEN } from '../domain/seed';
import type {
  Antwort,
  AppData,
  ID,
  MailRegel,
  Pflichtenheft,
  PflichtenheftVorlage,
  ProcessTemplate,
  Role,
  RunStep,
  StandardRolle,
} from '../domain/types';

/* ------------------------------------------------------------------ */
/* Was bis Fassung 6 mitgeliefert wurde                                */
/* ------------------------------------------------------------------ */

/** Die Gewerke, die bis Stammdaten-Fassung 6 mitgeliefert wurden. */
export const GEWERKE_BIS_FASSUNG6: readonly string[] = ['EEA', 'KIB', 'LST', 'OLA', 'OSE', 'TK', 'VA'];

/** Die beiden Funktionen, die bis Fassung 6 übergreifend mitgeliefert wurden – alle anderen je Gewerk. */
export const UEBERGREIFEND_BIS_FASSUNG6: readonly string[] = ['Planlaufmanagement', 'Projektleitung'];

/**
 * Die dreizehn Funktionen, die bis Fassung 6 je Gewerk mitgeliefert wurden –
 * mit ihrer heutigen Bezeichnung (damals „Bauvorlageberechtiger“, „Bau AN“,
 * „Bauüberwachung“, „Fachtechnischer Prüfer“) und ihrem damaligen Kürzel.
 */
const FRUEHER_JE_GEWERK: readonly { name: string; kuerzel: string }[] = [
  { name: 'Fachplaner', kuerzel: 'FP' },
  { name: 'Fachspezialist', kuerzel: 'FS' },
  { name: 'Bauvorlageberechtigter', kuerzel: 'BVB' },
  { name: 'Auftragnehmer', kuerzel: 'AN' },
  { name: 'Bauüberwacher', kuerzel: 'BÜW' },
  { name: 'Planprüfer', kuerzel: 'PSV' },
  { name: 'Prüfstatiker', kuerzel: 'PrSt' },
  { name: 'Vermessungsprüfer', kuerzel: 'VeP' },
  { name: 'Erdungsprüfer', kuerzel: 'ErP' },
  { name: 'Schweißtechnischer Prüfer', kuerzel: 'StP' },
  { name: 'Korrosionsschutzprüfer', kuerzel: 'KoP' },
  { name: 'Gleisgeometrie Prüfer', kuerzel: 'GgP' },
  { name: 'Geotechnischer Prüfer', kuerzel: 'GtP' },
];

const norm = (s: string | null | undefined) => (s ?? '').trim().toLowerCase();

/** Schlüssel einer Funktion: Bezeichnung + Gewerk, wie im Projektregister. */
const schluesselVon = (f: { name: string; gewerk: string | null }) => funktionsSchluessel(f);

/**
 * Schlüssel (heutige Bezeichnung + Gewerk) der Funktionen, die bis Fassung 6
 * je Gewerk mitgeliefert wurden: dreizehn Bezeichnungen in sieben Gewerken.
 * Was davon nicht mehr im Katalog steht, entfällt in den Vorlagen – und in den
 * Projekten, wenn es niemand ausfüllt. Alles andere, was der Katalog nicht
 * kennt, ist selbst angelegt und bleibt.
 */
export const BISHER_MITGELIEFERT: ReadonlySet<string> = new Set(
  FRUEHER_JE_GEWERK.flatMap((f) => GEWERKE_BIS_FASSUNG6.map((gewerk) => schluesselVon({ name: f.name, gewerk }))),
);

/** Früheres mitgeliefertes Kürzel je (heutiger) Bezeichnung. */
const FRUEHERES_KUERZEL = new Map(FRUEHER_JE_GEWERK.map((f) => [norm(f.name), f.kuerzel]));

/** Die mitgelieferte Funktion mit diesem Schlüssel. */
const VORLAGE_NACH_SCHLUESSEL = new Map(STANDARD_ROLLEN.map((r) => [schluesselVon(r), r]));

/* ------------------------------------------------------------------ */
/* Funktionen der Projekte umbenennen                                  */
/* ------------------------------------------------------------------ */

/**
 * Gibt den Funktionen der Projekte die Bezeichnungen des Katalogs
 * (`umbenannt`: Bezeichnung + Gewerk). Kennung, Besetzung und alle übrigen
 * Angaben bleiben. Führt ein Projekt die neue Bezeichnung im selben Gewerk
 * schon (etwa ein selbst angelegter „Planprüfer KIB“ neben „Fachtechnischer
 * Prüfer KIB“), entscheidet die Besetzung:
 *
 * * Die vorhandene ist unbesetzt – sie entfällt, die umbenannte bleibt. Hat
 *   die umbenannte keine Seite für den Terminnachweis, übernimmt sie die der
 *   entfallenden (eine aus der Projektsteuerung übernommene „Fachplanung LST“
 *   ohne Seite wird so nicht zum „Fachplaner LST“, den keine Seite zählt).
 * * Die vorhandene ist besetzt, die umzubenennende nicht – diese entfällt.
 * * Beide sind besetzt – die umzubenennende behält ihre frühere Bezeichnung;
 *   niemand verliert seine Funktion.
 *
 * Entfallen kann so nur eine Funktion, die niemand ausfüllt. Die Reihenfolge
 * der Funktionen bleibt.
 */
function projektFunktionenUmbenennen(roles: readonly Role[], besetzt: ReadonlySet<ID>): Role[] {
  /** Stand je Projekt – ändert sich beim Durchgehen. */
  const jeProjekt = new Map<ID, Role[]>();
  for (const r of roles) jeProjekt.set(r.projectId, [...(jeProjekt.get(r.projectId) ?? []), r]);

  /** Neue Fassung je Funktion; `null` = entfällt. */
  const neu = new Map<Role, Role | null>();
  for (const liste of jeProjekt.values()) {
    /** Die Funktionen des Projekts, wie sie gerade heißen – ohne die entfallenen. */
    const stand = new Map<Role, Role>(liste.map((r) => [r, r]));
    for (const alt of liste) {
      const aktuell = stand.get(alt);
      if (!aktuell) continue; // als Ziel einer anderen Umbenennung schon entfallen
      const name = umbenannt(aktuell.name, aktuell.gewerk ?? null);
      if (name === aktuell.name) continue;
      const k = schluesselVon({ name, gewerk: aktuell.gewerk ?? null });
      const ziel = [...stand.entries()].find(([ursprung, r]) => ursprung !== alt && schluesselVon(r) === k);
      if (ziel && besetzt.has(ziel[1].id)) {
        // Besetztes Ziel: Die unbesetzte umzubenennende entfällt, die besetzte behält ihre Bezeichnung
        if (!besetzt.has(aktuell.id)) stand.delete(alt);
        continue;
      }
      if (ziel) stand.delete(ziel[0]);
      // Ohne eigene Seite gilt die der entfallenden Funktion – sonst zählte der Terminnachweis sie nirgends
      const seiteVomZiel = aktuell.seite == null ? ziel?.[1].seite : undefined;
      stand.set(alt, { ...aktuell, name, ...(seiteVomZiel != null ? { seite: seiteVomZiel } : {}) });
    }
    for (const r of liste) neu.set(r, stand.get(r) ?? null);
  }
  return roles.map((r) => neu.get(r) ?? null).filter((r): r is Role => r !== null);
}

/* ------------------------------------------------------------------ */
/* Verweise, die eine Funktion nur beim Namen nennen                   */
/* ------------------------------------------------------------------ */

type MitGewerk = (alt: string) => boolean;

/** Gab es die frühere Bezeichnung unter diesen Funktionen in einem Gewerk? (Für `umbenannterVerweis`.) */
const gabEsMitGewerk =
  (funktionen: readonly { name: string; gewerk: string | null }[]): MitGewerk =>
  (alt) =>
    funktionen.some((r) => r.gewerk !== null && norm(r.name) === norm(alt));

/** Setzt die Bezeichnungen in E-Mail-Regeln „an Funktion“ um; ohne Änderung dieselbe Liste. */
function regelnUmbenennen(regeln: MailRegel[] | undefined, verweis: (name: string) => string): MailRegel[] | undefined {
  if (!regeln || !regeln.some((r) => verweis(r.roleName) !== r.roleName)) return regeln;
  return regeln.map((r) => {
    const roleName = verweis(r.roleName);
    return roleName === r.roleName ? r : { ...r, roleName };
  });
}

/**
 * Setzt die Bezeichnungen in Schritten um – am Schritt (`roleName`) und in den
 * E-Mail-Regeln des Schritts und seiner Antworten. Ohne Änderung kommt
 * dieselbe Liste zurück (unveränderte Workflows und Läufe bleiben dieselben
 * Objekte).
 */
function schritteUmbenennen<T extends { roleName: string; mails: MailRegel[]; antworten: Antwort[] }>(
  steps: T[],
  verweis: (name: string) => string,
  weitere: (schritt: T) => T = (s) => s,
): T[] {
  let geaendert = false;
  const liste = (steps ?? []).map((s) => {
    const roleName = verweis(s.roleName ?? '');
    const mails = regelnUmbenennen(s.mails, verweis);
    const bisher = s.antworten ?? [];
    const antworten = bisher.map((a) => {
      const m = regelnUmbenennen(a.mails, verweis);
      return m === a.mails ? a : { ...a, mails: m as MailRegel[] };
    });
    const antwortenGeaendert = antworten.some((a, i) => a !== bisher[i]);
    const basis =
      roleName === s.roleName && mails === s.mails && !antwortenGeaendert
        ? s
        : { ...s, roleName, ...(mails !== s.mails ? { mails } : {}), ...(antwortenGeaendert ? { antworten } : {}) };
    const fertig = weitere(basis);
    if (fertig !== s) geaendert = true;
    return fertig;
  });
  return geaendert ? liste : steps;
}

/** Momentaufnahmen eines Laufschritts: Abschluss und frühere Durchläufe nennen die Funktion ebenfalls beim Namen. */
function momentaufnahmenUmbenennen(s: RunStep, verweis: (name: string) => string): RunStep {
  const info = s.abschlussInfo && verweis(s.abschlussInfo.roleName) !== s.abschlussInfo.roleName
    ? { ...s.abschlussInfo, roleName: verweis(s.abschlussInfo.roleName) }
    : s.abschlussInfo;
  const historieGeaendert = (s.historie ?? []).some((h) => verweis(h.roleName) !== h.roleName);
  if (info === s.abschlussInfo && !historieGeaendert) return s;
  return {
    ...s,
    abschlussInfo: info,
    ...(historieGeaendert
      ? { historie: s.historie.map((h) => (verweis(h.roleName) === h.roleName ? h : { ...h, roleName: verweis(h.roleName) })) }
      : {}),
  };
}

/** Entfernt Doppelte (ohne Groß-/Kleinschreibung), die erste Nennung bleibt. */
function ohneDoppelte(namen: string[]): string[] {
  const gesehen = new Set<string>();
  return namen.filter((n) => {
    const k = norm(n);
    if (gesehen.has(k)) return false;
    gesehen.add(k);
    return true;
  });
}

/* ------------------------------------------------------------------ */
/* Pflichtenheft                                                       */
/* ------------------------------------------------------------------ */

/**
 * Stellt die Schlüssel `<Präfix><Abschnitt>|<bezeichnung>|<gewerk>` eines
 * Verzeichnisses um (abweichende Zeilennamen, Stand der letzten Ausgabe).
 * `umstellen` liefert zum Schlüssel der Funktion (`bezeichnung|gewerk`) den
 * neuen und ob er einem schon vorhandenen Eintrag vorgeht. Schlüssel anderen
 * Aufbaus (etwa `ap:<Abschnitt>|<Kontakt>`, `ab:…`) bleiben.
 */
function schluesselUmstellen<W>(
  verzeichnis: Record<string, W>,
  praefix: string,
  umstellen: (funktion: string) => { schluessel: string; vorrang: boolean } | null,
): Record<string, W> {
  const bleibt: [string, W][] = [];
  const nachrangig: [string, W][] = [];
  const vorrangig: [string, W][] = [];
  for (const [k, wert] of Object.entries(verzeichnis)) {
    const rest = k.startsWith(praefix) ? k.slice(praefix.length) : null;
    const trenner = rest === null ? -1 : rest.indexOf('|');
    const funktion = trenner === -1 ? '' : rest!.slice(trenner + 1);
    // Nur Zeilen der Ansprechpartner tragen Bezeichnung und Gewerk
    const neu = funktion.includes('|') ? umstellen(funktion) : null;
    if (!neu) bleibt.push([k, wert]);
    else (neu.vorrang ? vorrangig : nachrangig).push([`${praefix}${rest!.slice(0, trenner)}|${neu.schluessel}`, wert]);
  }
  if (nachrangig.length === 0 && vorrangig.length === 0) return verzeichnis;
  const ergebnis: Record<string, W> = Object.fromEntries(bleibt);
  for (const [k, wert] of nachrangig) if (!(k in ergebnis)) ergebnis[k] = wert;
  for (const [k, wert] of vorrangig) ergebnis[k] = wert;
  return ergebnis;
}

/**
 * Pflichtenheft eines Projekts: Die Abschnitte „Ansprechpartner“ nennen
 * Funktionen beim Namen (in allen Gewerken), abweichende Zeilennamen und der
 * Stand der letzten Ausgabe hängen am Schlüssel der Funktion.
 *
 * * `funktionen`: Jede Nennung deckt danach dieselben Funktionen des Projekts
 *   wie vorher – in der Regel ist das die neue Bezeichnung. Behält eine der
 *   Funktionen ihre Bezeichnung (die übergreifende „Bauüberwachung“ neben
 *   „Bauüberwacher KIB“; eine besetzte Funktion, deren neue Bezeichnung schon
 *   vergeben ist), steht sie zusätzlich dahinter.
 * * `zeilenNamen`, `stand`: Der Schlüssel folgt der Funktion, die umbenannt
 *   wurde – so bleibt die abweichende Bezeichnung an ihrer Zeile, und die
 *   nächste Ausgabe meldet die Zeile nicht als entfallen und neu.
 *
 * `vorher`/`nachher`: die Funktionen des Projekts vor und nach dem Umbenennen.
 */
function pflichtenheftUmstellen(ph: Pflichtenheft, vorher: readonly Role[], nachher: readonly Role[]): Pflichtenheft {
  const mitGewerk = gabEsMitGewerk(vorher);
  const nachId = new Map(nachher.map((r) => [r.id, r]));
  const funktionenNeu = (funktionen: string[]): string[] => {
    const liste = funktionen.flatMap((nennung) => {
      // Heutige Bezeichnungen der Funktionen, die die Nennung bisher deckte (entfallene zählen nicht)
      const heute = vorher
        .filter((r) => norm(r.name) === norm(nennung))
        .map((r) => nachId.get(r.id)?.name)
        .filter((n): n is string => n !== undefined);
      // Keine Funktion dieses Namens im Projekt (mehr): Die Nennung folgt der Tabelle der Umbenennungen
      if (heute.length === 0) return [umbenannterVerweis(nennung, mitGewerk)];
      // Die neue Bezeichnung zuerst – die Zeilen ihrer Funktionen behalten so ihre Beschriftung;
      // dahinter die bisherige, wenn eine der Funktionen sie behalten hat
      const neue = heute.filter((n) => norm(n) !== norm(nennung));
      return heute.length > neue.length ? [...neue, nennung] : neue;
    });
    const ergebnis = ohneDoppelte(liste);
    return ergebnis.length === funktionen.length && ergebnis.every((n, i) => n === funktionen[i]) ? funktionen : ergebnis;
  };

  /** Schlüssel der Funktionen, die umbenannt wurden: früher → heute. */
  const umbenannteSchluessel = new Map<string, string>();
  for (const r of vorher) {
    const n = nachId.get(r.id);
    if (n && schluesselVon(n) !== schluesselVon(r)) umbenannteSchluessel.set(schluesselVon(r), schluesselVon(n));
  }
  const vorhanden = new Set(nachher.map(schluesselVon));
  const umstellen = (funktion: string): { schluessel: string; vorrang: boolean } | null => {
    const heute = umbenannteSchluessel.get(funktion);
    if (heute) return { schluessel: heute, vorrang: true };
    // Die Funktion gibt es unter diesem Schlüssel weiter (nicht umbenannt oder Bezeichnung behalten)
    if (vorhanden.has(funktion)) return null;
    // Keine Funktion dazu (entfallen oder nie vorhanden): der Schlüssel folgt der Tabelle der Umbenennungen
    const trenner = funktion.lastIndexOf('|');
    const name = funktion.slice(0, trenner);
    const gewerk = funktion.slice(trenner + 1);
    const neu = norm(umbenannt(name, gewerk ? gewerk : null));
    return neu === name ? null : { schluessel: `${neu}|${gewerk}`, vorrang: false };
  };

  let geaendert = false;
  const abschnitte = (ph.abschnitte ?? []).map((a) => {
    if (!Array.isArray(a.funktionen) || a.funktionen.length === 0) return a;
    const funktionen = funktionenNeu(a.funktionen);
    if (funktionen === a.funktionen) return a;
    geaendert = true;
    return { ...a, funktionen };
  });
  const zeilenNamen = ph.zeilenNamen ? schluesselUmstellen(ph.zeilenNamen, '', umstellen) : ph.zeilenNamen;
  const stand = ph.stand ? schluesselUmstellen(ph.stand, 'ap:', umstellen) : ph.stand;
  if (!geaendert && zeilenNamen === ph.zeilenNamen && stand === ph.stand) return ph;
  return {
    ...ph,
    ...(geaendert ? { abschnitte } : {}),
    ...(zeilenNamen !== ph.zeilenNamen ? { zeilenNamen } : {}),
    ...(stand !== ph.stand ? { stand } : {}),
  };
}

/** Gespeicherte Vorlage eines Pflichtenhefts: Die Ansprechpartner nennen die Funktionen des Katalogs. */
function vorlageUmstellen(vorlage: PflichtenheftVorlage, mitGewerk: MitGewerk): PflichtenheftVorlage {
  let geaendert = false;
  const abschnitte = (vorlage.abschnitte ?? []).map((a) => {
    if (!Array.isArray(a.funktionen)) return a;
    const funktionen = ohneDoppelte(a.funktionen.map((n) => umbenannterVerweis(n, mitGewerk)));
    if (funktionen.length === a.funktionen.length && funktionen.every((n, i) => n === a.funktionen[i])) return a;
    geaendert = true;
    return { ...a, funktionen };
  });
  return geaendert ? { ...vorlage, abschnitte } : vorlage;
}

/* ------------------------------------------------------------------ */
/* Die Umstellung                                                      */
/* ------------------------------------------------------------------ */

/**
 * Stellt Funktionen, Namensverweise und Gewerke eines Bestands auf den
 * Funktionskatalog um (siehe Kopf der Datei). Erwartet einen Bestand der
 * aktuellen Daten-Fassung (nach `migriere`); die Standard-Workflows behandelt
 * der Aufrufer (`stammdatenAktualisieren` in storage.ts) – selbst geänderte
 * erkennt er am Fingerabdruck, und der zählt die früheren Bezeichnungen.
 * Funktionen, die aus dem Katalog in die Projekte kommen, tragen eine feste
 * Kennung (`rol-<Projekt>-<Katalogeintrag>`); `neueId` vergibt nur dort eine,
 * wo sie schon vergeben ist.
 *
 * `vorKatalog`: Der Bestand kommt von einem Stand vor Stammdaten-Fassung 7.
 * Nur dann entfällt, was bis Fassung 6 mitgeliefert war und nicht mehr im
 * Katalog steht (`BISHER_MITGELIEFERT`, das Gewerk OSE). Bei einer späteren
 * Fassung – ein neuer Stand der Liste – kommen Umbenennungen, Arten und
 * fehlende Funktionen des Katalogs hinzu, aber eine Funktion, die jemand nach
 * der Umstellung wieder angelegt hat, bleibt stehen.
 */
export function funktionenAufKatalogUmstellen(
  daten: AppData,
  neueId: (prefix: string) => ID,
  vorKatalog = true,
): AppData {
  const rollenVorher = daten.roles ?? [];
  const vorlagenVorher = daten.standardRollen ?? [];
  const besetzt = new Set((daten.contacts ?? []).flatMap((c) => (c.zuordnungen ?? []).map((z) => z.roleId)));
  const jeProjekt = (rollen: readonly Role[]) => {
    const karte = new Map<ID, Role[]>();
    for (const r of rollen) karte.set(r.projectId, [...(karte.get(r.projectId) ?? []), r]);
    return (projectId: ID): Role[] => karte.get(projectId) ?? [];
  };

  /* 1. Umbenennen: Funktionen der Projekte (mit Kollisionsregel) … */
  const umbenannte = projektFunktionenUmbenennen(rollenVorher, besetzt);
  const vorherIn = jeProjekt(rollenVorher);
  const nachherIn = jeProjekt(umbenannte);

  /* … und die Verweise beim Namen. Ob eine Umbenennung „nur mit Gewerk“ einen Verweis trifft,
     sagt der Stand vor der Umbenennung: übergreifend die Vorlagen, im Projekt dessen Funktionen. */
  const uebergreifend = gabEsMitGewerk(vorlagenVorher);
  const imProjekt = new Map<ID, MitGewerk>();
  const mitGewerkIn = (projectId: ID): MitGewerk => {
    let fn = imProjekt.get(projectId);
    if (!fn) imProjekt.set(projectId, (fn = gabEsMitGewerk(vorherIn(projectId))));
    return fn;
  };

  // Workflows unterscheiden keine Gewerke: Die Bezeichnung folgt der Tabelle
  const templates = (daten.templates ?? []).map((t): ProcessTemplate => {
    const mitGewerk = t.projectId === null ? uebergreifend : mitGewerkIn(t.projectId);
    const steps = schritteUmbenennen(t.steps, (name) => umbenannterVerweis(name, mitGewerk));
    return steps === t.steps ? t : { ...t, steps };
  });

  // Planläufe kennen ihr Gewerk (das des Eintrags): Ein Schritt folgt der Funktion, die für ihn galt.
  // Behält sie ihre Bezeichnung (die übergreifende „Bauüberwachung“; eine besetzte Funktion, deren
  // neue Bezeichnung schon vergeben ist), behält sie auch der Schritt – er bleibt bei derselben Person.
  const gewerkVon = new Map((daten.documents ?? []).map((d) => [d.id, d.gewerk ?? '']));
  const runs = (daten.runs ?? []).map((run) => {
    const mitGewerk = mitGewerkIn(run.projectId);
    const gewerk = gewerkVon.get(run.documentId) ?? '';
    const merk = new Map<string, string>();
    const verweis = (name: string): string => {
      const bekannt = merk.get(name);
      if (bekannt !== undefined) return bekannt;
      let neu = umbenannterVerweis(name, mitGewerk);
      if (neu !== name) {
        const galt = rolleFuerSchritt(vorherIn(run.projectId), name, gewerk);
        const giltWeiter = rolleFuerSchritt(nachherIn(run.projectId), name, gewerk);
        if (galt && giltWeiter && galt.id === giltWeiter.id) neu = name;
      }
      merk.set(name, neu);
      return neu;
    };
    const steps = schritteUmbenennen(run.steps, verweis, (s) => momentaufnahmenUmbenennen(s, verweis));
    return steps === run.steps ? run : { ...run, steps };
  });

  // Pflichtenhefte der Projekte und die gespeicherten Vorlagen
  const projects = (daten.projects ?? []).map((p) => {
    if (!p.pflichtenheft) return p;
    const pflichtenheft = pflichtenheftUmstellen(p.pflichtenheft, vorherIn(p.id), nachherIn(p.id));
    return pflichtenheft === p.pflichtenheft ? p : { ...p, pflichtenheft };
  });
  const pflichtenheftVorlagen = daten.pflichtenheftVorlagen
    ? (Object.fromEntries(
        Object.entries(daten.pflichtenheftVorlagen).map(([gb, v]) => [gb, v ? vorlageUmstellen(v, uebergreifend) : v]),
      ) as AppData['pflichtenheftVorlagen'])
    : undefined;

  /* 2. Art der Funktion – die des Katalogs, sonst die gespeicherte bzw. die zur (heutigen) Bezeichnung */
  const artFuer = (r: { art?: unknown; name: string; gewerk: string | null }) =>
    katalogEintrag(r.name, r.gewerk ?? null)?.art ?? artAus(r.art, umbenannt(r.name, r.gewerk ?? null), r.gewerk ?? null);

  /* 3. Vorlagen: die des Katalogs und die selbst angelegten. Was der Katalog führt, gewinnt;
        was früher mitgeliefert war und nicht mehr im Katalog steht, entfällt. */
  const vergeben = new Set(STANDARD_ROLLEN.map((r) => r.id));
  const eigeneSchluessel = new Set<string>();
  const eigene: StandardRolle[] = [];
  for (const r of vorlagenVorher) {
    const name = umbenannt(r.name, r.gewerk ?? null);
    const k = schluesselVon({ name, gewerk: r.gewerk ?? null });
    if (VORLAGE_NACH_SCHLUESSEL.has(k) || (vorKatalog && BISHER_MITGELIEFERT.has(k)) || eigeneSchluessel.has(k)) continue;
    eigeneSchluessel.add(k);
    // Keine Kennung zweimal: Eine eigene Funktion, die die Kennung einer mitgelieferten trägt, bekommt eine neue
    const id = vergeben.has(r.id) ? neueId('srol') : r.id;
    vergeben.add(id);
    eigene.push({ ...r, id, name, art: artFuer({ ...r, name }) });
  }
  // Ein Gewerk des Katalogs, das der Bestand in anderer Schreibweise führt („Ob“ statt „OB“), bleibt
  // ein Gewerk: Vorlagen und ergänzte Funktionen stehen in der Schreibweise des Bestands
  const schreibweise = new Map<string, string>();
  for (const g of daten.gewerke ?? []) if (g && g.trim() && !schreibweise.has(norm(g))) schreibweise.set(norm(g), g);
  const gewerkWieImBestand = (g: string | null): string | null => (g === null ? null : (schreibweise.get(norm(g)) ?? g));
  const standardRollen: StandardRolle[] = [
    ...STANDARD_ROLLEN.map((r) => ({ ...r, gewerk: gewerkWieImBestand(r.gewerk) })),
    ...eigene,
  ];

  /* 4. Projekte: nicht mehr Gelistetes ohne Person entfällt, der Katalog kommt hinzu,
        vorhandene Funktionen des Katalogs erhalten dessen Kürzel – wenn es noch das frühere ist. */
  const bleibt = (r: Role): boolean => {
    const k = schluesselVon(r);
    return !vorKatalog || besetzt.has(r.id) || VORLAGE_NACH_SCHLUESSEL.has(k) || !BISHER_MITGELIEFERT.has(k);
  };
  const angepasst = (r: Role): Role => {
    const vorlage = VORLAGE_NACH_SCHLUESSEL.get(schluesselVon(r));
    const art = artFuer(r);
    const kuerzel =
      vorlage && FRUEHERES_KUERZEL.get(norm(r.name)) === (r.kuerzel ?? '').trim() ? vorlage.kuerzel : r.kuerzel;
    return art === r.art && kuerzel === r.kuerzel ? r : { ...r, art, kuerzel };
  };
  const roles: Role[] = umbenannte.filter(bleibt).map(angepasst);
  const nachProjekt = jeProjekt(roles);
  const kennungen = new Set(roles.map((r) => r.id));
  for (const p of daten.projects ?? []) {
    for (const f of fehlendeKatalogFunktionen(nachProjekt(p.id))) {
      const vorlage = VORLAGE_NACH_SCHLUESSEL.get(schluesselVon(f))!;
      // Fest und sprechend statt gewürfelt: Der Bestand, eine Sicherung desselben Stands und ein
      // zweites Gerät vergeben dieselbe Kennung – der Abgleich erkennt daran Gelöschtes und Umbenanntes
      const fest = `rol-${p.id}-${vorlage.id.replace(/^srol-/, '')}`;
      const id = kennungen.has(fest) ? neueId('rol') : fest;
      kennungen.add(id);
      roles.push({
        id,
        projectId: p.id,
        name: vorlage.name,
        kuerzel: vorlage.kuerzel,
        farbe: vorlage.farbe,
        beschreibung: vorlage.beschreibung,
        art: vorlage.art,
        gewerk: gewerkWieImBestand(vorlage.gewerk),
        seite: vorlage.seite,
      });
    }
  }

  /* 5. Gewerke: die des Katalogs kommen hinzu; ein früher mitgeliefertes, das der Katalog nicht führt
        (OSE), entfällt, wenn es keine Funktion und kein Eintrag mehr nennt. Was eine Funktion nennt,
        steht in der Liste – auch wenn sie es bisher nicht führte (sonst ließe es sich nicht pflegen). */
  const nennungen = [...standardRollen.map((r) => r.gewerk), ...roles.map((r) => r.gewerk)].filter(
    (g): g is string => !!g && !!g.trim(),
  );
  const genannt = new Set([...nennungen, ...(daten.documents ?? []).map((d) => d.gewerk)].map(norm));
  const imKatalog = new Set(KATALOG_GEWERKE.map(norm));
  const frueher = new Set(GEWERKE_BIS_FASSUNG6.map(norm));
  const bisher = (daten.gewerke ?? []).filter((g) => g && g.trim());
  const gewerke = ohneDoppelte([...bisher, ...KATALOG_GEWERKE, ...nennungen])
    .filter((g) => !vorKatalog || imKatalog.has(norm(g)) || !frueher.has(norm(g)) || genannt.has(norm(g)))
    .sort((a, b) => a.localeCompare(b, 'de'));

  /* 6. Netz: Kein offener Schritt eines laufenden Planlaufs wechselt durch die Umstellung die Person.
        Die Funktion des Gewerks gilt vor der übergreifenden gleicher Bezeichnung (`rolleFuerSchritt`) –
        auch die unbesetzte, die eben aus dem Katalog kam, und auch dort, wo zwei frühere Bezeichnungen
        jetzt dieselbe sind („Bauunternehmen“ und „Bau AN KIB“ heißen beide „Auftragnehmer“). Meint ein
        Schritt deshalb eine andere Funktion als vorher, bleibt die bisherige Person an ihm stehen, wie
        von Hand gesetzt. Hatte er niemanden, gilt die neue Besetzung. */
  const endgueltigIn = jeProjekt(roles);
  const kontakteIn = new Map<ID, AppData['contacts']>();
  for (const c of daten.contacts ?? []) kontakteIn.set(c.projectId, [...(kontakteIn.get(c.projectId) ?? []), c]);
  const laeufe = runs.map((run, i) => {
    if (run.status !== 'laufend') return run;
    const kontakte = kontakteIn.get(run.projectId) ?? [];
    if (kontakte.length === 0) return run;
    const gewerk = gewerkVon.get(run.documentId) ?? '';
    const frueherSchritte = daten.runs[i].steps;
    let geaendert = false;
    const steps = run.steps.map((s, j) => {
      if (s.status === 'erledigt' || (s.contactManuell && s.contactId !== null)) return s;
      const vorher = kontaktFuerRolleUndGewerk(kontakte, vorherIn(run.projectId), frueherSchritte[j].roleName ?? '', gewerk);
      if (vorher === null) return s;
      const nachher = kontaktFuerRolleUndGewerk(kontakte, endgueltigIn(run.projectId), s.roleName ?? '', gewerk);
      if (vorher === nachher) return s;
      geaendert = true;
      return { ...s, contactId: vorher, contactManuell: true };
    });
    return geaendert ? { ...run, steps } : run;
  });

  return {
    ...daten,
    gewerke,
    standardRollen,
    projects,
    roles,
    templates,
    runs: laeufe,
    ...(pflichtenheftVorlagen ? { pflichtenheftVorlagen } : {}),
  };
}
