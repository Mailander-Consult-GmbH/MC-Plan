/**
 * Pflichtenheft eines Projekts: mitgelieferte Vorlage, Platzhalter, die
 * Tabellen der Ansprechpartner und das Druckdokument.
 *
 * Das Pflichtenheft besteht aus Abschnitten (Kapitel und Unterkapitel), deren
 * Nummern aus der Reihenfolge entstehen (`kapitelNummern`). Textabschnitte
 * enthalten Platzhalter wie `{{gNummer}}`, die beim Ausgeben aus den Projekt-
 * und Stammdaten gefüllt werden (`platzhalterWerte`). Ansprechpartner
 * entstehen aus den Funktionen des Projekts und den Kontakten, die sie
 * ausfüllen (`ansprechpartnerZeilen`) – sie sind also stets auf dem Stand der
 * Funktionsliste. Was im Projekt nicht gepflegt wird (Texte, Unterschriften,
 * Änderungsindex, Plancodierung), steht im Pflichtenheft selbst.
 *
 * Die Druckfassung (`pflichtenheftHtml`) ist ein Dokument mit eigener, fester
 * Gestaltung – sie gehört nicht zum Koralle-Design und bleibt hell.
 */
import { funktionsSchluessel } from '../../../gemeinsam/register';
import { formatDate } from '../../../shared/dates';
import { html } from '../../../shared/print';
import { ablaufDiagrammSvg } from './ablaufDiagramm';
import { plancodierungHtml } from './plancodierung';
import { standardVorlage } from './pflichtenheftVorlagen';
import { ROLLE_PL } from './seed';
import {
  EIGENE_ROLLE,
  GESCHAEFTSBEREICHE,
  geschaeftsbereichVon,
  leereStammdaten,
  type AppData,
  type Contact,
  type ID,
  type ISODate,
  type Pflichtenheft,
  type PflichtenheftAbschnitt,
  type PflichtenheftAusgabe,
  type PflichtenheftStandEintrag,
  type ProcessTemplate,
  type Project,
  type Role,
  type Unterschrift,
} from './types';

export type NeueId = (prefix: string) => ID;

/* ------------------------------------------------------------------ */
/* Platzhalter                                                         */
/* ------------------------------------------------------------------ */

export type PflichtenheftPlatzhalterGruppe = 'projekt' | 'station' | 'auftraggeber' | 'anlagen';

export const PFLICHTENHEFT_GRUPPEN: { id: PflichtenheftPlatzhalterGruppe; label: string }[] = [
  { id: 'projekt', label: 'Projekt' },
  { id: 'station', label: 'Station und Strecke' },
  { id: 'auftraggeber', label: 'Auftraggeber' },
  { id: 'anlagen', label: 'Anlagen' },
];

export interface PflichtenheftPlatzhalter {
  schluessel: string;
  label: string;
  gruppe: PflichtenheftPlatzhalterGruppe;
  beschreibung: string;
}

export const PFLICHTENHEFT_PLATZHALTER: PflichtenheftPlatzhalter[] = [
  { schluessel: 'gNummer', label: 'Projektnummer DB', gruppe: 'projekt', beschreibung: 'Projektnummer der DB (G- bzw. E-Nummer)' },
  { schluessel: 'projektnummer', label: 'Projektnummer', gruppe: 'projekt', beschreibung: 'Projektnummer von Mailänder Consult' },
  { schluessel: 'projektname', label: 'Projektname', gruppe: 'projekt', beschreibung: 'Bezeichnung des Projekts' },
  { schluessel: 'planungsphase', label: 'Planungsphase', gruppe: 'projekt', beschreibung: 'Stammdaten: Planungsphase' },
  { schluessel: 'station', label: 'Station', gruppe: 'station', beschreibung: 'Bahnhof bzw. Haltepunkt' },
  { schluessel: 'stationKuerzel', label: 'Kürzel', gruppe: 'station', beschreibung: 'Kürzel der Betriebsstelle (Ril 100)' },
  { schluessel: 'bahnhofsNummer', label: 'Bahnhofsnummer', gruppe: 'station', beschreibung: 'Bahnhofsnummer' },
  { schluessel: 'stationsKm', label: 'Stations-km', gruppe: 'station', beschreibung: 'Stations-Kilometrierung' },
  { schluessel: 'streckenNummern', label: 'Streckennummern', gruppe: 'station', beschreibung: 'Nummern der betroffenen Strecken, mit Komma' },
  { schluessel: 'strecken', label: 'Streckenliste', gruppe: 'station', beschreibung: 'Je Zeile „Strecke Nummer  Bezeichnung“' },
  {
    schluessel: 'streckenabschnitte',
    label: 'Streckenabschnitte',
    gruppe: 'station',
    beschreibung: 'Je Zeile „Strecke Nummer von km … bis km …“',
  },
  { schluessel: 'auftraggeber', label: 'Auftraggeber', gruppe: 'auftraggeber', beschreibung: 'Stammdaten: Auftraggeber' },
  { schluessel: 'geschaeftsbereich', label: 'Geschäftsbereich', gruppe: 'auftraggeber', beschreibung: 'Stammdaten: Geschäftsbereich' },
  { schluessel: 'region', label: 'Region', gruppe: 'auftraggeber', beschreibung: 'Region der DB InfraGO, etwa „Südwest“' },
  { schluessel: 'projektleitung', label: 'Projektleitung', gruppe: 'auftraggeber', beschreibung: 'Name der Person mit der Funktion Projektleitung' },
  { schluessel: 'sharepointZentral', label: 'SharePoint zentral', gruppe: 'auftraggeber', beschreibung: 'Zentraler SharePoint-Ordner' },
  { schluessel: 'anlagePlanlaeufe', label: 'Anlage Planläufe', gruppe: 'anlagen', beschreibung: 'Nummer der Anlage „Planläufe und Ablaufdiagramme“' },
  { schluessel: 'anlagePlancodierung', label: 'Anlage Plancodierung', gruppe: 'anlagen', beschreibung: 'Nummer der Anlage „Plancodierung“' },
  { schluessel: 'anlageAenderungsindex', label: 'Anlage Änderungsindex', gruppe: 'anlagen', beschreibung: 'Nummer der Anlage „Änderungsindex“' },
];

const leereUnterschrift = (): Unterschrift => ({ ort: '', datum: null, funktion: '', name: '' });

/** Workflows, die das Projekt verwendet: seine Varianten und die Workflows seiner Planläufe. */
export function verwendeteWorkflows(data: AppData, project: Project): ProcessTemplate[] {
  const ausLaeufen = new Set(data.runs.filter((r) => r.projectId === project.id).map((r) => r.templateId));
  return data.templates.filter((t) => t.projectId === project.id || ausLaeufen.has(t.id));
}

/** Workflows zur Auswahl: die des Projekts zuerst, dann die projektübergreifenden. */
export function waehlbareWorkflows(data: AppData, project: Project): ProcessTemplate[] {
  return data.templates
    .filter((t) => t.projectId === null || t.projectId === project.id)
    .sort((a, b) => Number(a.projectId === null) - Number(b.projectId === null) || a.name.localeCompare(b.name, 'de'));
}

/** Was der Assistent beim Erstellen festlegt; ohne Angabe gelten die Vorgaben. */
export interface PflichtenheftAngaben {
  /** Workflows der Anlage „Planläufe“; ohne Angabe die im Projekt verwendeten (ohne solche: alle wählbaren). */
  workflowIds?: ID[];
  /** Weitere Personen im Abschnitt „Planlaufmanagement“ (etwa die Vertretung). */
  kontaktIds?: ID[];
  titelbild?: string;
  aufgestellt?: Partial<Unterschrift>;
  freigegeben?: Partial<Unterschrift>;
  /** Code des Projekts in der Plancodierung; ohne Angabe das Kürzel der Betriebsstelle. */
  projektKuerzel?: string;
}

/**
 * Neues Pflichtenheft aus der Vorlage des Geschäftsbereichs (die gespeicherte,
 * sonst die mitgelieferte): Abschnitte und Kategorien erhalten neue Kennungen.
 * Ist die Kategorie „Projekt“ der Plancodierung leer, trägt der Code des
 * Projekts sie (samt Station bzw. Projektname) ein.
 */
export function neuesPflichtenheft(data: AppData, project: Project, neueId: NeueId, angaben: PflichtenheftAngaben = {}): Pflichtenheft {
  const s = { ...leereStammdaten(), ...project.stammdaten };
  const kuerzel = (angaben.projektKuerzel ?? s.stationKuerzel).trim();
  const gb = geschaeftsbereichVon(s.geschaeftsbereich);
  const mitStation = GESCHAEFTSBEREICHE.find((g) => g.id === gb)?.station ?? true;
  const bezeichnung = (mitStation && s.station.trim()) || project.name;
  const vorlage = standardVorlage(gb, neueId, kuerzel);
  const verwendet = verwendeteWorkflows(data, project);
  const ids = angaben.workflowIds ?? (verwendet.length > 0 ? verwendet : waehlbareWorkflows(data, project)).map((t) => t.id);
  const workflows = waehlbareWorkflows(data, project)
    .filter((t) => ids.includes(t.id))
    .map((t) => ({ workflowId: t.id, titel: t.name }));
  return {
    titel: vorlage.titel,
    deckblatt: vorlage.deckblatt,
    abschnitte: vorlage.abschnitte.map((a) => ({
      ...a,
      id: neueId('phab'),
      funktionen: [...a.funktionen],
      kontaktIds: a.art === 'plm' ? [...(angaben.kontaktIds ?? [])] : [],
    })),
    aufgestellt: { ...leereUnterschrift(), ...angaben.aufgestellt },
    freigegeben: { ...leereUnterschrift(), ...angaben.freigegeben },
    titelbild: angaben.titelbild ?? '',
    gewerkNamen: { ...vorlage.gewerkNamen },
    zeilenNamen: {},
    workflows,
    workflowHinweis: vorlage.workflowHinweis,
    plancodierung: {
      hinweis: vorlage.plancodierung.hinweis,
      kategorien: vorlage.plancodierung.kategorien.map((k) =>
        kuerzel && norm(k.name) === 'projekt' && !k.eintraege.trim()
          ? { ...k, id: neueId('phkat'), beispiel: kuerzel, eintraege: `${kuerzel}\t${bezeichnung}` }
          : { ...k, id: neueId('phkat') },
      ),
    },
    ausgaben: [],
    stand: null,
  };
}

/**
 * Ergänzt fehlende Felder – etwa in einer Sicherung, die von Hand bearbeitet
 * wurde. Pflichtenhefte vor den Ausgaben führten einen von Hand gepflegten
 * Änderungsindex (`aenderungen` mit Datum) und die Zeile „Zuletzt geändert“
 * als Eingabe: Die Einträge werden je Datum zu Ausgaben.
 */
export function pflichtenheftAufbereiten(roh: Partial<Pflichtenheft>): Pflichtenheft {
  const ph = roh as Partial<Pflichtenheft> & { aenderungen?: { id: ID; datum: string; stelle: string; text: string }[] };
  const u = (x?: Partial<Unterschrift>): Unterschrift => ({ ...leereUnterschrift(), ...(x ?? {}) });
  let ausgaben: PflichtenheftAusgabe[] = ph.ausgaben ?? [];
  if (!ph.ausgaben && ph.aenderungen?.length) {
    const daten = [...new Set(ph.aenderungen.map((a) => a.datum))].sort();
    ausgaben = daten.map((datum) => ({
      id: `phaus-${datum}`,
      datum,
      von: '',
      aenderungen: ph.aenderungen!.filter((a) => a.datum === datum).map(({ id, stelle, text }) => ({ id, stelle, text })),
    }));
  }
  return {
    titel: ph.titel ?? '',
    deckblatt: ph.deckblatt ?? 'Projekt {{gNummer}}\n\n**{{station}}**\n**{{projektname}}**',
    abschnitte: (ph.abschnitte ?? []).map((a) => ({
      ...a,
      text: a.text ?? '',
      funktionen: a.funktionen ?? [],
      kontaktIds: a.kontaktIds ?? [],
      ebene: a.ebene === 2 ? 2 : 1,
    })),
    aufgestellt: u(ph.aufgestellt),
    freigegeben: u(ph.freigegeben),
    titelbild: ph.titelbild ?? '',
    gewerkNamen: ph.gewerkNamen ?? {},
    zeilenNamen: ph.zeilenNamen ?? {},
    workflows: ph.workflows ?? [],
    workflowHinweis: ph.workflowHinweis ?? '',
    plancodierung: { kategorien: ph.plancodierung?.kategorien ?? [], hinweis: ph.plancodierung?.hinweis ?? '' },
    ausgaben,
    stand: ph.stand ?? null,
  };
}

/* ------------------------------------------------------------------ */
/* Nummern, Werte, Ansprechpartner                                     */
/* ------------------------------------------------------------------ */

/** Nummern der Abschnitte: „1“, „5.1“ … aus Ebene und Reihenfolge. */
export function kapitelNummern(abschnitte: PflichtenheftAbschnitt[]): Map<ID, string> {
  const nummern = new Map<ID, string>();
  let kapitel = 0;
  let unter = 0;
  for (const a of abschnitte) {
    if (a.ebene === 1) {
      kapitel += 1;
      unter = 0;
      nummern.set(a.id, String(kapitel));
    } else {
      unter += 1;
      nummern.set(a.id, `${kapitel}.${unter}`);
    }
  }
  return nummern;
}

/** Nummer des Anlagenverzeichnisses – ohne eigenen Abschnitt das Kapitel nach dem letzten. */
export function anlagenNummer(abschnitte: PflichtenheftAbschnitt[]): string {
  const nummern = kapitelNummern(abschnitte);
  const a = abschnitte.find((x) => x.art === 'anlagen');
  if (a) return nummern.get(a.id)!;
  return String(abschnitte.filter((x) => x.ebene === 1).length + 1);
}

const personName = (c: Pick<Contact, 'vorname' | 'nachname' | 'firma'>) => `${c.vorname} ${c.nachname}`.trim() || c.firma.trim();
const norm = (s: string) => s.trim().toLowerCase();

/** Ort aus einer Anschrift: letzte Zeile ohne Länderkennung und Postleitzahl. */
export function ortAus(anschrift: string): string {
  const zeilen = anschrift.split('\n').map((z) => z.trim()).filter(Boolean);
  const letzte = zeilen[zeilen.length - 1] ?? '';
  return letzte.replace(/^(?:[A-Z]{1,2}-)?\d{4,5}\s+/, '').trim();
}

/** Kontakte eines Projekts, die eine Funktion dieser Bezeichnung ausfüllen. */
function inhaber(data: AppData, project: Project, funktion: string): Contact[] {
  const rollen = new Set(data.roles.filter((r) => r.projectId === project.id && norm(r.name) === norm(funktion)).map((r) => r.id));
  return data.contacts.filter((c) => c.projectId === project.id && c.zuordnungen.some((z) => rollen.has(z.roleId)));
}

export function eigenerKontakt(data: AppData, project: Project): Contact | undefined {
  return data.contacts.find((c) => c.projectId === project.id && c.eigen);
}

export function platzhalterWerte(data: AppData, project: Project, ph: Pflichtenheft): Record<string, string> {
  const s = { ...leereStammdaten(), ...project.stammdaten };
  const anlage = anlagenNummer(ph.abschnitte);
  const pl = inhaber(data, project, ROLLE_PL)[0];
  return {
    gNummer: project.gNummer,
    projektnummer: project.nummer,
    projektname: project.name,
    planungsphase: s.planungsphase,
    station: s.station,
    stationKuerzel: s.stationKuerzel,
    bahnhofsNummer: s.bahnhofsNummer,
    stationsKm: s.stationsKm,
    streckenNummern: s.strecken.map((x) => x.nummer.trim()).filter(Boolean).join(', '),
    strecken: s.strecken
      .filter((x) => x.nummer.trim() || x.bezeichnung.trim())
      .map((x) => `Strecke ${x.nummer.trim()}  ${x.bezeichnung.trim()}`.trim())
      .join('\n'),
    streckenabschnitte: s.strecken
      .filter((x) => x.nummer.trim())
      .map((x) =>
        [
          `Strecke ${x.nummer.trim()}`,
          x.kmVon?.trim() ? `von km ${x.kmVon.trim()}` : '',
          x.kmBis?.trim() ? `bis km ${x.kmBis.trim()}` : '',
        ]
          .filter(Boolean)
          .join(' '),
      )
      .join('\n'),
    auftraggeber: s.auftraggeber,
    geschaeftsbereich: s.geschaeftsbereich,
    region: s.region,
    projektleitung: pl ? personName(pl) : '',
    sharepointZentral: s.sharepointZentral,
    anlagePlanlaeufe: `${anlage}.1`,
    anlagePlancodierung: `${anlage}.2`,
    anlageAenderungsindex: `${anlage}.3`,
  };
}

/** Setzt die Werte ein; unbekannte Platzhalter bleiben stehen. */
export function textEinsetzen(text: string, werte: Record<string, string>): string {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (ganz, k: string) => (k in werte ? werte[k] : ganz));
}

export interface AnsprechpartnerZeile {
  /** Schlüssel für eine abweichende Bezeichnung (`Pflichtenheft.zeilenNamen`). */
  schluessel: string;
  /** Bezeichnung ohne Abweichung – Gewerk bzw. Funktion. */
  vorgabe: string;
  label: string;
  kontakte: Contact[];
}

/**
 * Zeilen eines Abschnitts „Ansprechpartner“: je Funktion (in allen Gewerken)
 * die Personen, die sie ausfüllen. Füllen dieselben Personen mehrere der
 * Funktionen aus, stehen sie in einer Zeile („EEA 50 Hz / OLA“). `offen`
 * nennt die Funktionen ohne Person; `mitKopf`, ob die Tabelle die Kopfzeile
 * „Gewerk | Zuständig“ trägt (nicht bei rein übergreifenden Funktionen).
 */
export function ansprechpartnerZeilen(
  data: AppData,
  project: Project,
  abschnitt: PflichtenheftAbschnitt,
  ph: Pflichtenheft,
): { zeilen: AnsprechpartnerZeile[]; offen: string[]; mitKopf: boolean } {
  const gesucht = abschnitt.funktionen.map(norm).filter(Boolean);
  const gewerkRang = (g: string | null) => (g === null ? -1 : data.gewerke.indexOf(g) === -1 ? 999 : data.gewerke.indexOf(g));
  const rollen = data.roles
    .filter((r) => r.projectId === project.id && gesucht.includes(norm(r.name)))
    .sort(
      (a, b) =>
        gesucht.indexOf(norm(a.name)) - gesucht.indexOf(norm(b.name)) ||
        gewerkRang(a.gewerk) - gewerkRang(b.gewerk) ||
        (a.gewerk ?? '').localeCompare(b.gewerk ?? '', 'de'),
    );
  const gewerkName = (g: string) => ph.gewerkNamen[g]?.trim() || g;
  const vorgabeVon = (r: Role) => {
    if (!r.gewerk) return r.name;
    if (gesucht.length > 1 && norm(r.name) !== gesucht[0]) return `${r.name} ${gewerkName(r.gewerk)}`;
    return gewerkName(r.gewerk);
  };
  const zeilen: AnsprechpartnerZeile[] = [];
  const besetzt = new Set<string>();
  for (const r of rollen) {
    const kontakte = data.contacts.filter((c) => c.projectId === project.id && c.zuordnungen.some((z) => z.roleId === r.id));
    if (kontakte.length === 0) continue;
    besetzt.add(norm(r.name));
    const kennung = kontakte.map((c) => c.id).sort().join(',');
    const gleich = zeilen.find((z) => z.kontakte.map((c) => c.id).sort().join(',') === kennung);
    const vorgabe = vorgabeVon(r);
    if (gleich) {
      if (!gleich.vorgabe.split(' / ').includes(vorgabe)) gleich.vorgabe = `${gleich.vorgabe} / ${vorgabe}`;
      continue;
    }
    zeilen.push({ schluessel: `${abschnitt.id}|${funktionsSchluessel(r)}`, vorgabe, label: '', kontakte });
  }
  for (const z of zeilen) z.label = ph.zeilenNamen[z.schluessel]?.trim() || z.vorgabe;
  // Funktionen, die in keinem Gewerk eine Person ausfüllt (oder die es im Projekt nicht gibt) –
  // unbesetzte Gewerke einer sonst besetzten Funktion sind der Regelfall und bleiben ungenannt
  const offen = abschnitt.funktionen.map((f) => f.trim()).filter((f) => f && !besetzt.has(norm(f)));
  return { zeilen, offen, mitKopf: gesucht.length > 1 || rollen.some((r) => r.gewerk !== null) };
}

/** Personen des Abschnitts „Planlaufmanagement“: die angemeldete Person und die gewählten Kontakte. */
export function plmKontakte(data: AppData, project: Project, abschnitt: PflichtenheftAbschnitt): Contact[] {
  const eigen = eigenerKontakt(data, project);
  const weitere = abschnitt.kontaktIds
    .map((id) => data.contacts.find((c) => c.id === id && c.projectId === project.id))
    .filter((c): c is Contact => !!c && !c.eigen);
  return [...(eigen ? [eigen] : []), ...weitere];
}

export type UnterschriftArt = 'aufgestellt' | 'freigegeben' | 'geaendert';

export const UNTERSCHRIFT_LABEL: Record<UnterschriftArt, string> = {
  aufgestellt: 'Aufgestellt',
  freigegeben: 'Freigegeben',
  geaendert: 'Zuletzt geändert',
};

/**
 * Vorbelegung einer Unterschriftszeile: aufgestellt und zuletzt geändert vom
 * Planlaufmanagement (angemeldete Person), freigegeben von der Projektleitung;
 * „zuletzt geändert“ trägt das Datum des jüngsten Eintrags im Änderungsindex.
 */
export function unterschriftVorgabe(data: AppData, project: Project, ph: Pflichtenheft, art: UnterschriftArt): Unterschrift {
  const person = art === 'freigegeben' ? inhaber(data, project, ROLLE_PL)[0] : eigenerKontakt(data, project);
  const firma = person?.firma.trim() ?? '';
  const funktion =
    art === 'freigegeben'
      ? [person?.oe.trim() ?? '', firma].filter(Boolean).join(', ')
      : ['PLM', firma && norm(firma) !== norm(EIGENE_ROLLE) ? firma : ''].filter(Boolean).join(', ');
  const letzte = letzteAenderung(ph);
  const name = art === 'geaendert' && letzte?.von.trim() ? letzte.von.trim() : person ? personName(person) : '';
  return {
    ort: person ? ortAus(person.anschrift) : '',
    datum: art === 'aufgestellt' ? (ph.ausgaben[0]?.datum ?? null) : art === 'geaendert' ? (letzte?.datum ?? null) : null,
    funktion,
    name: name ? `i. A. ${name}` : '',
  };
}

/** Die jüngste Ausgabe mit Änderungen – „Zuletzt geändert“; vor der zweiten Ausgabe keine. */
export function letzteAenderung(ph: Pflichtenheft): PflichtenheftAusgabe | null {
  return ph.ausgaben.length >= 2 ? ph.ausgaben[ph.ausgaben.length - 1] : null;
}

/**
 * Unterschriftszeile, wie sie gedruckt wird: Eingetragenes vor der
 * Vorbelegung. „Zuletzt geändert“ wird nicht eingetragen – es folgt allein
 * den Ausgaben.
 */
export function unterschriftWert(data: AppData, project: Project, ph: Pflichtenheft, art: UnterschriftArt): Unterschrift {
  const v = unterschriftVorgabe(data, project, ph, art);
  if (art === 'geaendert') return v;
  const e = ph[art];
  return {
    ort: e.ort.trim() || v.ort,
    datum: e.datum ?? v.datum,
    funktion: e.funktion.trim() || v.funktion,
    name: e.name.trim() || v.name,
  };
}

/* ------------------------------------------------------------------ */
/* Ausgaben: Stand und Änderungen                                      */
/* ------------------------------------------------------------------ */

/** Kurze Prüfsumme eines Texts (FNV-1a samt Länge). */
function pruefsumme(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return `${(h >>> 0).toString(36)}-${text.length.toString(36)}`;
}

/** Was eine Person im Pflichtenheft zeigt (Ansprechpartner). */
function kontaktInhalt(c: Contact): string {
  return [personName(c), c.firma, c.oe, c.anschrift, c.telefon, c.mobil, c.email].map((x) => x.trim()).join('|');
}

/**
 * Inhalt des Pflichtenhefts je Stelle, so wie er gedruckt wird – zum
 * Erkennen von Änderungen zwischen zwei Ausgaben. Schlüssel: `deckblatt`,
 * `ab:<Abschnitt>` (Titel und Text), `ap:<Abschnitt>|<Zeile>` (je Zeile der
 * Ansprechpartner bzw. je Person des Planlaufmanagements), `wf:<Workflow>`,
 * `wfhinweis`, `pc:<Kategorie>` und `pchinweis`. Die Unterschriften zählen
 * nicht dazu, ebenso wenig Nummern: Umgestellte Kapitel gelten nicht als geändert.
 */
export function pflichtenheftStand(data: AppData, project: Project, ph: Pflichtenheft): Record<string, PflichtenheftStandEintrag> {
  const werte = platzhalterWerte(data, project, ph);
  const nummern = kapitelNummern(ph.abschnitte);
  const anlage = anlagenNummer(ph.abschnitte);
  const stand: Record<string, PflichtenheftStandEintrag> = {};
  const setzen = (schluessel: string, stelle: string, titel: string, inhalt: string) => {
    stand[schluessel] = { stelle, titel, wert: pruefsumme(inhalt) };
  };
  setzen(
    'deckblatt',
    'Deckblatt',
    'Deckblatt',
    [textEinsetzen(ph.titel, werte), textEinsetzen(ph.deckblatt, werte), ph.titelbild ? pruefsumme(ph.titelbild) : ''].join('\n'),
  );
  for (const a of ph.abschnitte) {
    const stelle = `Kap. ${nummern.get(a.id)}`;
    setzen(`ab:${a.id}`, stelle, a.titel, `${a.titel}\n${textEinsetzen(a.text, werte)}`);
    if (a.art === 'ansprechpartner') {
      for (const z of ansprechpartnerZeilen(data, project, a, ph).zeilen) {
        setzen(`ap:${z.schluessel}`, stelle, z.label, `${z.label}\n${z.kontakte.map(kontaktInhalt).join('\n')}`);
      }
    } else if (a.art === 'plm') {
      for (const c of plmKontakte(data, project, a)) setzen(`ap:${a.id}|${c.id}`, stelle, personName(c), kontaktInhalt(c));
    }
  }
  ph.workflows.forEach((w, i) => {
    const t = data.templates.find((x) => x.id === w.workflowId);
    if (!t) return;
    const ablauf = t.steps.map((x) => ({
      n: x.name,
      t: x.typ,
      r: x.roleName,
      f: x.fristTage,
      z: x.naechster,
      a: x.antworten.map((y) => [y.text, y.ziel]),
      p: x.parallel,
    }));
    setzen(`wf:${w.workflowId}`, `Anl. ${anlage}.1.${i + 1}`, w.titel, `${w.titel}\n${JSON.stringify(ablauf)}`);
  });
  setzen('wfhinweis', `Anl. ${anlage}.1`, 'Hinweis zu den Ablaufdiagrammen', textEinsetzen(ph.workflowHinweis, werte));
  for (const k of ph.plancodierung.kategorien) {
    setzen(`pc:${k.id}`, `Anl. ${anlage}.2`, k.name, `${k.name}\n${k.beispiel}\n${k.eintraege}`);
  }
  setzen('pchinweis', `Anl. ${anlage}.2`, 'Hinweis zur Plancodierung', ph.plancodierung.hinweis);
  return stand;
}

/**
 * Änderungen zwischen dem Stand der letzten Ausgabe und dem aktuellen, als
 * Einträge für den Änderungsindex – in der Reihenfolge des Dokuments, danach
 * Entfallenes.
 */
export function aenderungenErmitteln(
  alt: Record<string, PflichtenheftStandEintrag>,
  neu: Record<string, PflichtenheftStandEintrag>,
): { stelle: string; text: string }[] {
  const art = (k: string) => k.split(':')[0];
  const text = (k: string, e: PflichtenheftStandEintrag, wie: 'ergaenzt' | 'geaendert' | 'entfallen', vorher?: PflichtenheftStandEintrag) => {
    const titel = e.titel.trim() || 'ohne Titel';
    switch (art(k)) {
      case 'deckblatt':
        return 'Deckblatt geändert';
      case 'ab':
        if (wie === 'ergaenzt') return `Kapitel „${titel}“ ergänzt`;
        if (wie === 'entfallen') return `Kapitel „${titel}“ entfallen`;
        return vorher && vorher.titel !== e.titel ? `„${vorher.titel}“ umbenannt in „${titel}“` : `${titel}: Text geändert`;
      case 'ap':
        return wie === 'ergaenzt' ? `${titel} eingetragen` : wie === 'entfallen' ? `${titel} entfallen` : `${titel} aktualisiert`;
      case 'wf':
        return wie === 'ergaenzt'
          ? `Planlauf „${titel}“ aufgenommen`
          : wie === 'entfallen'
            ? `Planlauf „${titel}“ entfallen`
            : `Planlauf „${titel}“ geändert`;
      case 'pc':
        return wie === 'ergaenzt'
          ? `Plancodierung: ${titel} ergänzt`
          : wie === 'entfallen'
            ? `Plancodierung: ${titel} entfallen`
            : `Plancodierung: ${titel} geändert`;
      default:
        return `${titel} geändert`;
    }
  };
  const ergebnis: { stelle: string; text: string }[] = [];
  for (const [k, e] of Object.entries(neu)) {
    const a = alt[k];
    if (!a) ergebnis.push({ stelle: e.stelle, text: text(k, e, 'ergaenzt') });
    else if (a.wert !== e.wert) ergebnis.push({ stelle: e.stelle, text: text(k, e, 'geaendert', a) });
  }
  for (const [k, a] of Object.entries(alt)) {
    if (!(k in neu)) ergebnis.push({ stelle: a.stelle, text: text(k, a, 'entfallen') });
  }
  return ergebnis;
}

/* ------------------------------------------------------------------ */
/* Druckfassung                                                        */
/* ------------------------------------------------------------------ */

/** Text mit Absätzen (Leerzeile), Zeilenumbrüchen und **fett** als HTML. */
export function textHtml(text: string): string {
  return text
    .trim()
    .split(/\n\s*\n/)
    .filter((absatz) => absatz.trim())
    .map((absatz) => `<p>${html(absatz.trim()).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function kontaktZelle(c: Contact): string {
  const kopf = [personName(c), c.firma.trim(), c.oe.trim()].filter(Boolean).join(', ');
  const anschrift = c.anschrift.split('\n').map((z) => z.trim()).filter(Boolean).join(', ');
  const telefon = [c.telefon.trim(), c.mobil.trim()].filter(Boolean).join(', ');
  const erreichbar = [telefon, c.email.trim()].filter(Boolean).join(' / ');
  return [kopf, anschrift, erreichbar].filter(Boolean).map((z) => `<div>${html(z)}</div>`).join('');
}

function plmBlock(c: Contact): string {
  const zeilen = [
    c.firma.trim() && norm(c.firma) !== norm(EIGENE_ROLLE) ? c.firma.trim() : '',
    personName(c),
    ...c.anschrift.split('\n').map((z) => z.trim()),
    c.telefon.trim() ? `Tel.: ${c.telefon.trim()}` : '',
    c.mobil.trim() ? `Mobil: ${c.mobil.trim()}` : '',
    c.email.trim(),
  ].filter(Boolean);
  return `<div class="ph-plm">${zeilen.map((z) => `<div>${html(z)}</div>`).join('')}</div>`;
}

function unterschriftHtml(u: Unterschrift, art: UnterschriftArt): string {
  const ortDatum = [u.ort, u.datum ? formatDate(u.datum) : ''].filter(Boolean).join(', ');
  return `<div class="ph-unterschrift">
  <div class="ph-u-werte"><span>${html(ortDatum)}</span><span>${html(u.funktion)}</span><span>${html(u.name)}</span></div>
  <div class="ph-u-linie"><strong>${UNTERSCHRIFT_LABEL[art]}:</strong> Ort, Datum, Funktion (OE), Unterschrift</div>
</div>`;
}

/** Kopf der Anlagenseiten. */
function anlagenKopf(nummer: string, titel: string, zeilen: [string, string]): string {
  return `<div class="ph-anlagenkopf">
  <div class="ph-anlage-nr">Anlage ${html(nummer)} zum Pflichtenheft Planlauf</div>
  <div class="ph-anlage-projekt"><strong>${html(zeilen[0])}</strong><br>${html(zeilen[1])}</div>
  <h2 class="ph-anlage-titel">${html(titel)}</h2>
</div>`;
}

export const PFLICHTENHEFT_STIL = `
  @page { size: A4 portrait; margin: 20mm 18mm 18mm 22mm;
    @bottom-right { content: "Seite " counter(page) " von " counter(pages); font-size: 8pt; color: #6e6e73; } }
  @page quer { size: A4 landscape; margin: 12mm 12mm 14mm; }
  @page deckblatt { @bottom-right { content: none; } }
  body { font-size: 10.5pt; line-height: 1.45; }
  p { margin: 0 0 3mm; }
  th { text-transform: none; letter-spacing: 0; font-size: 9pt; color: #1d1d1f; font-weight: 700; }
  .ph-deckblatt { page: deckblatt; }
  .ph-umbruch { break-before: page; }
  .ph-quer { page: quer; }
  .ph-pc { page: pc-quer; }
  .ph-titel { font-size: 20pt; font-weight: 700; margin: 0 0 4mm; }
  .ph-projekt { font-size: 13pt; margin: 0 0 6mm; }
  .ph-bild { width: 100%; max-height: 95mm; object-fit: cover; display: block; margin: 0 0 6mm; }
  .ph-deckblatt-text { font-size: 13pt; margin: 0 0 14mm; }
  .ph-vorabzug { display: inline-block; border: 1.5px solid #c9261c; color: #c9261c; font-weight: 700;
    padding: 1.5mm 3mm; margin: 0 0 6mm; font-size: 10pt; letter-spacing: 0.02em; }
  .ph-deckblatt-text p { margin: 0 0 3mm; }
  .ph-unterschrift { margin: 0 0 11mm; }
  .ph-u-werte { display: grid; grid-template-columns: 1.1fr 1.3fr 1fr; gap: 4mm; min-height: 5mm; }
  .ph-u-linie { border-top: 1px dashed #1d1d1f; padding-top: 1mm; font-size: 9pt; }
  .ph-inhalt h2 { margin-top: 0; }
  .ph-toc { width: 100%; border-collapse: collapse; }
  .ph-toc td { border: 0; padding: 1mm 0; }
  .ph-toc td.nr { width: 14mm; }
  .ph-toc tr.ebene2 td { font-size: 10pt; }
  .ph-toc tr.ebene2 td.nr { padding-left: 0; }
  h2.ph-k1 { font-size: 12.5pt; margin: 8mm 0 3mm; }
  h3.ph-k2 { font-size: 11pt; margin: 6mm 0 2mm; break-after: avoid; }
  .ph-k-nr { display: inline-block; min-width: 14mm; }
  table.ph-tab { border: 1px solid #c7c7cc; }
  table.ph-tab td, table.ph-tab th { border: 1px solid #c7c7cc; padding: 2mm 2.5mm; }
  table.ph-tab td.label { width: 34%; }
  .ph-tab td div + div { margin-top: 0.5mm; }
  .ph-tab td .ph-person + .ph-person { margin-top: 3mm; }
  .ph-plm-reihe { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; margin: 0 0 3mm; }
  .ph-anlagen { break-inside: avoid; }
  .ph-anlagen div { margin: 0 0 1.5mm; }
  h2.ph-k1, h3.ph-k2 { break-after: avoid; }
  table.ph-tab tr { break-inside: avoid; }
  .ph-anlagen .ebene3 { padding-left: 10mm; }
  .ph-anlagenkopf { margin: 0 0 4mm; }
  .ph-anlage-nr { text-align: right; font-size: 9pt; color: #6e6e73; }
  .ph-anlage-projekt { font-size: 10pt; margin: 1mm 0 2mm; }
  h2.ph-anlage-titel { font-size: 13pt; margin: 0; }
  .ph-diagramm svg { display: block; margin: 0 auto; }
  .ph-hinweis { font-size: 8.5pt; color: #3a3a3c; margin-top: 3mm; }
  .ph-hinweis p { margin: 0 0 1.5mm; }
  table.ph-index td.datum { width: 26mm; white-space: nowrap; }
  table.ph-index td.stelle { width: 42mm; }
  /* Vorschau am Bildschirm: je Abschnitt ein Blatt – die Anlagen im Querformat so breit wie gedruckt */
  @media screen {
    html, body { background: #e9e9ec; }
    body { margin: 0; padding: 8mm 0; }
    body > section {
      background: #fff; width: 210mm; box-sizing: border-box; margin: 0 auto 8mm;
      padding: 18mm 18mm 18mm 22mm; box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
    }
    body > section.ph-quer, body > section.ph-pc { width: 297mm; padding: 12mm; }
  }
  /* Schmaler Rahmen: Blätter verkleinern, damit ein Querblatt ganz zu sehen ist */
  @media screen and (max-width: 1180px) { body { zoom: 0.85; } }
  @media screen and (max-width: 1000px) { body { zoom: 0.72; } }
  @media screen and (max-width: 820px) { body { zoom: 0.58; } }
  @media screen and (max-width: 640px) { body { zoom: 0.42; } }
`;

/** Das ganze Pflichtenheft als HTML-Fragment (für `druckeHtml` bzw. die Vorschau mit `htmlDokument`). */
export function pflichtenheftHtml(
  data: AppData,
  project: Project,
  ph: Pflichtenheft,
  optionen: {
    /** Vorabzug dieses Tags: auf dem Deckblatt und am Fuß jeder Seite gekennzeichnet, keine Ausgabe. */
    vorabzug?: ISODate;
  } = {},
): string {
  const werte = platzhalterWerte(data, project, ph);
  const nummern = kapitelNummern(ph.abschnitte);
  const anlage = anlagenNummer(ph.abschnitte);
  const titel = textEinsetzen(ph.titel, werte);
  const einheit = project.settings.fristenInArbeitstagen ? 'AT' : 'KT';
  // Kopf der Anlagen: Personenbahnhöfe Station und Projekt, Fahrweg Projekt und Strecke
  const mitStation = GESCHAEFTSBEREICHE.find((g) => g.id === geschaeftsbereichVon(werte.geschaeftsbereich))?.station ?? true;
  const kopf: [string, string] = mitStation
    ? [werte.station, werte.projektname]
    : [werte.projektname, werte.streckenabschnitte.split('\n')[0] ?? ''];
  const workflows = ph.workflows
    .map((w) => ({ w, t: data.templates.find((t) => t.id === w.workflowId) }))
    .filter((x): x is { w: (typeof ph.workflows)[number]; t: NonNullable<typeof x.t> } => !!x.t);

  const teile: string[] = [];

  // Vorabzug: Kennzeichen am Fuß jeder Seite (auch der Querformatseiten) und auf dem Deckblatt
  const vorabzug = optionen.vorabzug ? `Vorabzug vom ${formatDate(optionen.vorabzug)}` : '';
  if (vorabzug) {
    teile.push(`<style>@page { @bottom-left { content: "${vorabzug} – nicht ausgegeben"; font-size: 8pt; color: #c9261c; } }</style>`);
  }

  // Deckblatt
  teile.push(`<section class="ph-deckblatt">
  ${vorabzug ? `<div class="ph-vorabzug">${html(vorabzug)} – nicht ausgegeben, Änderungen nicht vermerkt</div>` : ''}
  <h1 class="ph-titel">${html(titel)}</h1>
  ${ph.titelbild ? `<img class="ph-bild" src="${ph.titelbild.replace(/"/g, '%22')}" alt="">` : ''}
  <div class="ph-deckblatt-text">${textHtml(textEinsetzen(ph.deckblatt, werte))}</div>
  ${(letzteAenderung(ph) ? (['aufgestellt', 'freigegeben', 'geaendert'] as const) : (['aufgestellt', 'freigegeben'] as const))
    .map((a) => unterschriftHtml(unterschriftWert(data, project, ph, a), a))
    .join('')}
</section>`);

  // Inhaltsverzeichnis
  teile.push(`<section class="ph-umbruch"><h2>Inhaltsverzeichnis</h2><table class="ph-toc">${ph.abschnitte
    .map((a) => `<tr class="ebene${a.ebene}"><td class="nr">${nummern.get(a.id)}</td><td>${html(a.titel)}</td></tr>`)
    .join('')}</table></section>`);

  // Kapitel
  const kapitel = ph.abschnitte.map((a) => {
    const nr = nummern.get(a.id)!;
    const kopf =
      a.ebene === 1
        ? `<h2 class="ph-k1"><span class="ph-k-nr">${nr}</span>${html(a.titel)}</h2>`
        : `<h3 class="ph-k2"><span class="ph-k-nr">${nr}</span>${html(a.titel)}</h3>`;
    let inhalt = a.text.trim() ? textHtml(textEinsetzen(a.text, werte)) : '';
    if (a.art === 'ansprechpartner') {
      const { zeilen, mitKopf } = ansprechpartnerZeilen(data, project, a, ph);
      if (zeilen.length === 0) inhalt += '<p class="grau">Noch nicht benannt.</p>';
      else {
        inhalt += `<table class="ph-tab">${mitKopf ? '<tr><th>Gewerk</th><th>Zuständig</th></tr>' : ''}${zeilen
          .map(
            (z) =>
              `<tr><td class="label">${html(z.label)}</td><td>${z.kontakte
                .map((c) => `<div class="ph-person">${kontaktZelle(c)}</div>`)
                .join('')}</td></tr>`,
          )
          .join('')}</table>`;
      }
    } else if (a.art === 'plm') {
      const personen = plmKontakte(data, project, a);
      for (let i = 0; i < personen.length; i += 2) {
        inhalt += `<div class="ph-plm-reihe">${personen.slice(i, i + 2).map(plmBlock).join('')}</div>`;
      }
    } else if (a.art === 'anlagen') {
      inhalt += `<div class="ph-anlagen">
  <div><span class="ph-k-nr">${anlage}.1</span>Planläufe und Ablaufdiagramme</div>
  ${workflows.map(({ w }, i) => `<div class="ebene3"><span class="ph-k-nr">${anlage}.1.${i + 1}</span>${html(w.titel)}</div>`).join('')}
  <div><span class="ph-k-nr">${anlage}.2</span>Plancodierung</div>
  <div><span class="ph-k-nr">${anlage}.3</span>Änderungsindex</div>
</div>`;
    }
    return kopf + inhalt;
  });
  teile.push(`<section class="ph-umbruch ph-inhalt">${kapitel.join('')}</section>`);

  // Anlage Planläufe: je Workflow eine Seite im Querformat
  const hinweis = ph.workflowHinweis.trim() ? `<div class="ph-hinweis">${textHtml(textEinsetzen(ph.workflowHinweis, werte))}</div>` : '';
  workflows.forEach(({ w, t }, i) => {
    // Kopf (≈ 25 mm) und Hinweis lassen dem Bild auf A4 quer (184 mm) den Rest; die Gesamtdauer steht im Bild
    const hoeheMm = Math.max(90, 150 - Math.ceil(ph.workflowHinweis.trim().length / 160) * 4.5);
    const { svg } = ablaufDiagrammSvg(t.steps, { einheit, hoeheMm });
    teile.push(`<section class="ph-umbruch ph-quer">
  ${anlagenKopf(`${anlage}.1.${i + 1}`, w.titel, kopf)}
  <div class="ph-diagramm">${svg}</div>
  ${hinweis}
</section>`);
  });

  // Anlage Plancodierung – auf der Querformatseite der Plancodierung (pc-quer), deren Spaltenbreiten darauf rechnen
  teile.push(`<section class="ph-umbruch ph-pc">
  ${anlagenKopf(`${anlage}.2`, `Plancodierungsschema für das Projekt ${(mitStation && werte.station) || project.name}`, kopf)}
  ${plancodierungHtml(ph.plancodierung, '')}
</section>`);

  // Anlage Änderungsindex: die Änderungen aller Ausgaben nach der ersten, jüngste zuerst
  const aenderungen = ph.ausgaben
    .slice(1)
    .flatMap((a) => a.aenderungen.map((x) => ({ ...x, datum: a.datum })))
    .reverse();
  teile.push(`<section class="ph-umbruch">
  ${anlagenKopf(`${anlage}.3`, 'Änderungsindex', kopf)}
  ${
    aenderungen.length === 0
      ? '<p class="grau">Noch keine Änderungen.</p>'
      : `<table class="ph-tab ph-index"><tr><th>Kapitel / Anlage</th><th>Änderung</th><th>Datum</th></tr>${aenderungen
          .map(
            (x) =>
              `<tr><td class="stelle">${html(x.stelle)}</td><td>${html(x.text)}</td><td class="datum num">${html(formatDate(x.datum))}</td></tr>`,
          )
          .join('')}</table>`
  }
</section>`);

  return teile.join('\n');
}
