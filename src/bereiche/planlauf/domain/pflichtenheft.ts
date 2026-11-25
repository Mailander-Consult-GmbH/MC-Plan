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
import { plancodierungHtml, standardPlancodierung } from './plancodierung';
import { ROLLE_BVB, ROLLE_PL, ROLLE_PRST, ROLLE_PSV } from './seed';
import {
  EIGENE_ROLLE,
  funktionsName,
  leereStammdaten,
  type AppData,
  type Contact,
  type ID,
  type Pflichtenheft,
  type PflichtenheftAbschnitt,
  type PflichtenheftVorlage,
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
  { schluessel: 'gNummer', label: 'G-Nummer', gruppe: 'projekt', beschreibung: 'Projektnummer der DB' },
  { schluessel: 'projektnummer', label: 'Projektnummer', gruppe: 'projekt', beschreibung: 'Projektnummer von Mailänder Consult' },
  { schluessel: 'projektname', label: 'Projektname', gruppe: 'projekt', beschreibung: 'Bezeichnung des Projekts' },
  { schluessel: 'planungsphase', label: 'Planungsphase', gruppe: 'projekt', beschreibung: 'Stammdaten: Planungsphase' },
  { schluessel: 'station', label: 'Station', gruppe: 'station', beschreibung: 'Bahnhof bzw. Haltepunkt' },
  { schluessel: 'stationKuerzel', label: 'Kürzel', gruppe: 'station', beschreibung: 'Kürzel der Betriebsstelle (Ril 100)' },
  { schluessel: 'bahnhofsNummer', label: 'Bahnhofsnummer', gruppe: 'station', beschreibung: 'Bahnhofsnummer' },
  { schluessel: 'stationsKm', label: 'Stations-km', gruppe: 'station', beschreibung: 'Stations-Kilometrierung' },
  { schluessel: 'streckenNummern', label: 'Streckennummern', gruppe: 'station', beschreibung: 'Nummern der betroffenen Strecken, mit Komma' },
  { schluessel: 'strecken', label: 'Streckenliste', gruppe: 'station', beschreibung: 'Je Zeile „Strecke Nummer  Bezeichnung“' },
  { schluessel: 'auftraggeber', label: 'Auftraggeber', gruppe: 'auftraggeber', beschreibung: 'Stammdaten: Auftraggeber' },
  { schluessel: 'geschaeftsbereich', label: 'Geschäftsbereich', gruppe: 'auftraggeber', beschreibung: 'Stammdaten: Geschäftsbereich' },
  { schluessel: 'projektleitung', label: 'Projektleitung', gruppe: 'auftraggeber', beschreibung: 'Name der Person mit der Funktion Projektleitung' },
  { schluessel: 'sharepointZentral', label: 'SharePoint zentral', gruppe: 'auftraggeber', beschreibung: 'Zentraler SharePoint-Ordner' },
  { schluessel: 'anlagePlanlaeufe', label: 'Anlage Planläufe', gruppe: 'anlagen', beschreibung: 'Nummer der Anlage „Planläufe und Ablaufdiagramme“' },
  { schluessel: 'anlagePlancodierung', label: 'Anlage Plancodierung', gruppe: 'anlagen', beschreibung: 'Nummer der Anlage „Plancodierung“' },
  { schluessel: 'anlageAenderungsindex', label: 'Anlage Änderungsindex', gruppe: 'anlagen', beschreibung: 'Nummer der Anlage „Änderungsindex“' },
];

/* ------------------------------------------------------------------ */
/* Mitgelieferte Vorlage                                               */
/* ------------------------------------------------------------------ */

type AbschnittRoh = Omit<PflichtenheftAbschnitt, 'id' | 'text' | 'funktionen' | 'kontaktIds'> &
  Partial<Pick<PflichtenheftAbschnitt, 'text' | 'funktionen' | 'kontaktIds'>>;

const VORLAGE_ABSCHNITTE: AbschnittRoh[] = [
  {
    art: 'text',
    ebene: 1,
    titel: 'Einleitung',
    text: `Dieses Pflichtenheft gilt für das Projekt

**{{gNummer}} {{station}} – {{projektname}}**

der {{auftraggeber}} – Geschäftsbereich {{geschaeftsbereich}}.

Es regelt die Planläufe dieser Projekte, sowie den dafür erforderlichen Datenaustausch und trifft formale Festlegungen bezüglich der Projektbezeichnungen, der Plancodierung, der Datenformate, der Schriftfelder, etc. Die Vorgaben dieses Pflichtenheftes sind von allen beteiligten Projektverantwortlichen und deren Mitarbeitern einzuhalten.

Mailänder Consult (MC) ist von der {{auftraggeber}} mit dem Planlaufmanagement (PLM) beauftragt und überwacht damit die terminliche und formale Einhaltung der Vorgaben dieses Pflichtenheftes durch die Projektbeteiligten.`,
  },
  {
    art: 'text',
    ebene: 1,
    titel: 'Abwicklung der Planläufe',
    text: `Die Projektleitung der {{auftraggeber}} hat entschieden, die Planläufe in digitaler Form durchzuführen. Deshalb erfolgen alle Prüfungen anhand der PDF-Daten der zu prüfenden Unterlagen. Unterschriften erfolgen mit fortgeschrittener elektronischer Signatur gemäß Signaturgesetz (Verordnung (EU) Nr. 910/2014).

Das Planlaufmanagement MC steuert und überwacht die Planläufe (siehe Kapitel 8 und Anlage {{anlagePlanlaeufe}}) in formaler und terminlicher Hinsicht. Verteilungen und Übergaben von Plänen erfolgen in der Regel digital. Das Planlaufmanagement richtet dazu jedem am Planlauf Beteiligten ein SharePoint-Verzeichnis ‚Eingang‘ zum Herunterladen und ein SharePoint-Verzeichnis ‚Ausgang‘ zum Hochladen ein.

Das Planlaufmanagement stellt die genehmigten Unterlagen einschließlich der Prüfberichte und Freigabeschreiben auf einem zentralen SharePoint-Ordner bereit. Alle Projektbeteiligten mit berechtigtem Interesse erhalten Lese-Zugriff auf diesen Ordner.

Alle Unterlagen sind mit einem eindeutigen Dateinamen zu kennzeichnen. Siehe dazu Kapitel 3.

Die verbindlich festgelegten Planläufe sind in Anlage {{anlagePlanlaeufe}} dargestellt. Die Ablaufschemen geben Auskunft über die Anzahl der benötigten Fertigungen, den Adressaten der jeweils erforderlichen Weiterleitung, die für jeden Schritt maximal verfügbare Zeit, erforderliche E-Mail-Benachrichtigungen etc. Zwingend erforderliche Änderungen sind nur in Abstimmung mit dem Planlaufmanagement MC möglich.

Falls nach dem abgeschlossenen Planlauf Planänderungen erforderlich werden, so sind die geänderten Pläne auf Grundlage der letztgültigen Fassung zu erstellen und erneut in den Planlauf einzureichen. Die bei der Einarbeitung der Prüfergebnisse mit „gez. ….“ ins Schriftfeld übernommenen Unterschriften und Prüfanmerkungen sind zu entfernen.`,
  },
  {
    art: 'text',
    ebene: 1,
    titel: 'Plannummerierung',
    text: `Alle erfassten Dokumente müssen einen eindeutigen Plancode erhalten. Über die Plancodierung ist jedem Dokument eine unverwechselbare Codierung und ein damit identischer Dateiname zugeordnet. Als Dateiname ist ausschließlich die Plancodierung entsprechend der Anlage {{anlagePlancodierung}} mit der Namenserweiterung .pdf zu verwenden, die auch im Schriftfeld der Unterlage eingetragen ist. Dies gilt sowohl für Pläne als auch für Planverzeichnisse, Listen, statische Berechnungen, Erläuterungsberichte etc.

Bei den bautechnischen Gewerken werden Änderungen durch einen Index gekennzeichnet.
Bei den STE-Gewerken (VV BAU-STE) werden erstmals herausgegebene Dokumente als Ausgabe Nr. 1 bezeichnet. Diese Nummer wird mit jeder Planänderung erhöht.

Die erfolgten Prüf- und Genehmigungsschritte werden im Dateinamen dokumentiert. Dazu hängt der für den letzten Schritt Verantwortliche dem Dateinamen ein entsprechendes Kurzzeichen an. Nach der Freigabe zur bautechnischen Prüfung erhält ein Dokument den Anhang ‚_BVB1‘, nach der Prüfung durch den Prüfsachverständigen zusätzlich ‚_PSV‘, nach der BVB-Freigabe zusätzlich ‚_BVB2‘ und nach erfolgter Genehmigung der Bauausführung noch ‚_PL‘.

Zulässige Zeichen für Dateinamen sind die Buchstaben a – z und A – Z, Ziffern, Bindestriche und Unterstriche. Nicht zulässig sind Umlaute, Sonderzeichen, Leerzeichen und Interpunktionen.`,
  },
  {
    art: 'text',
    ebene: 1,
    titel: 'Änderungen am Pflichtenheft',
    text: `Soweit sich aus der Projektabwicklung die Notwendigkeit zu Änderungen an diesem Pflichtenheft ergibt, werden diese von Mailänder Consult in Abstimmung mit der Projektleitung {{auftraggeber}} eingepflegt, und das Pflichtenheft erneut digital an die Beteiligten verteilt.
Alle Änderungen werden im Änderungsindex (Anlage {{anlageAenderungsindex}}) dargestellt.`,
  },
  { art: 'text', ebene: 1, titel: 'Ansprechpartner' },
  { art: 'plm', ebene: 2, titel: 'Planlaufmanagement und Pflichtenheft' },
  { art: 'ansprechpartner', ebene: 2, titel: 'Projektleitung', funktionen: [ROLLE_PL] },
  { art: 'ansprechpartner', ebene: 2, titel: 'Bauvorlageberechtigte (BVB)', funktionen: [ROLLE_BVB] },
  {
    art: 'ansprechpartner',
    ebene: 2,
    titel: 'Planprüfer / Prüfingenieure',
    funktionen: [ROLLE_PSV, ROLLE_PRST, 'Schweißtechnischer Prüfer', 'Vermessungsprüfer', 'Erdungsprüfer'],
  },
  { art: 'ansprechpartner', ebene: 2, titel: 'Inbetriebnahmeverantwortliche', funktionen: ['Inbetriebnahmeverantwortlicher'] },
  { art: 'ansprechpartner', ebene: 2, titel: 'Fachspezialisten', funktionen: ['Fachspezialist'] },
  {
    art: 'text',
    ebene: 1,
    titel: 'Weitere Projektbeteiligte',
    text: 'Weitere Projektbeteiligte sind der jeweils aktuellen Projektbeteiligtenliste zu entnehmen.',
  },
  {
    art: 'text',
    ebene: 1,
    titel: 'Verpflichtungen der Planer',
    text: `Die Planer benennen gegenüber dem Planlaufmanagement MC einen verantwortlichen Ansprechpartner (Planungskoordinator AN) zur Abstimmung aller den Planlauf betreffenden Belange. In einzelnen Gewerken kann diese Funktion durch den Qualitätsprüfer des AN wahrgenommen werden.

Dieser Planungskoordinator unterschreibt im Schriftfeld jedes Planes bereits auf dem ersten zur Prüfung vorgelegten Exemplar. Den eingereichten Ausführungsunterlagen ist grundsätzlich der Prüfbericht der internen Qualitätsprüfung beizufügen, dies ist Voraussetzung für die Prüfbarkeit von Unterlagen.

Die Planungskoordinatoren vertreten gegenüber dem Planlaufmanagement MC auch ihre sämtlichen Nachunternehmer.
Zur vorausschauenden Steuerung erhält das Planlaufmanagement MC vom Planungskoordinator AN eine Planlieferliste, aus der die Planliefertermine des Planers und die Zusammensetzung der einzelnen Planpakete hervorgehen.

Die aktuelle Planlieferliste ist durch den Planungsverantwortlichen des AN zum Beginn jedes Monats unaufgefordert dem Planlaufmanagement MC zu übermitteln.`,
  },
  {
    art: 'text',
    ebene: 1,
    titel: 'Digitale Plandaten',
    text: `Der Austausch digitaler Pläne und Dokumente im Rahmen des Planlaufmanagements erfolgt grundsätzlich im PDF/A-Format. Die PDF/A-Dateien sind mit einer Auflösung von 300 dpi zu erstellen. Als Dateiname ist ausschließlich die eindeutige Plannummer mit der Namenserweiterung .pdf zu verwenden, die auch im Schriftfeld der Unterlage eingetragen ist.

Digitale Planprüfungen erfolgen ausschließlich auf der Grundlage von PDF/A-Dateien. Ein eventueller Austausch von bearbeitbaren Daten (DWG, DGN etc.) erfolgt gegebenenfalls in selbständiger Abstimmung zwischen den Planern.`,
  },
  {
    art: 'text',
    ebene: 1,
    titel: 'Schriftfeld',
    text: `Alle Pläne sind abhängig vom Gewerk mit den im Regelwerk der DB aktuell vorgeschriebenen Schriftfeldern zu versehen. Im Schriftfeld anzugeben sind unter anderem:

**{{station}} ({{stationKuerzel}})  ·  Strecke {{streckenNummern}}  ·  Stations-km {{stationsKm}}  ·  Bahnhofs-Nr. {{bahnhofsNummer}}**`,
  },
  {
    art: 'text',
    ebene: 1,
    titel: 'Streckennummern, Kilometrierung und Lage- und Höhenbezug',
    text: `Folgende Strecken sind von den Planungen in den Projekten betroffen:

{{strecken}}

Trassendaten zur Bestimmung der verbindlichen Kilometrierung, das zugrunde zu legende Lage- und Höhensystem, sowie Festpunkte sind über das Portal IPID zu beziehen beim Datenmanagement Südwest der DB InfraGO AG.`,
  },
  { art: 'anlagen', ebene: 1, titel: 'Anlagenverzeichnis' },
];

const VORLAGE_WORKFLOW_HINWEIS = `Der Planlaufbeginn ist vom Planungsverantwortlichen des AN so einzutakten, dass die genehmigten Pläne spätestens 6 Wochen vor Baubeginn beim EBA vorliegen.

Hinweis: Der dargestellte Zeitbedarf berücksichtigt nicht die Planungszeiten des Ausführungsplaners. Außerplanmäßige Korrekturläufe sind im Zeitbedarf nicht berücksichtigt.

Die Weitergabe der digitalen Unterlagen erfolgt per E-Mail oder über die Datenaustauschplattform der Mailänder Consult GmbH.`;

/** Bezeichnungen der mitgelieferten Gewerke in den Ansprechpartnern. */
const VORLAGE_GEWERKNAMEN: Record<string, string> = {
  EEA: 'EEA 50 Hz',
  KIB: 'Konstruktiver Ingenieurbau',
  LST: 'Leit- und Sicherungstechnik',
  OLA: 'Oberleitungsanlagen',
  TK: 'Telekommunikation',
  VA: 'Verkehrsanlagen',
};

/** Die mitgelieferte Vorlage (ohne die gespeicherte des Bestands); `projektKuerzel` ist das Beispiel der Kategorie „Projekt“. */
export function standardVorlage(neueId: NeueId, projektKuerzel = ''): PflichtenheftVorlage {
  return {
    titel: 'Pflichtenheft Planlauf {{planungsphase}}',
    abschnitte: VORLAGE_ABSCHNITTE.map((a) => ({
      id: neueId('phab'),
      text: '',
      funktionen: [],
      kontaktIds: [],
      ...a,
    })),
    gewerkNamen: { ...VORLAGE_GEWERKNAMEN },
    workflowHinweis: VORLAGE_WORKFLOW_HINWEIS,
    plancodierung: standardPlancodierung(neueId, projektKuerzel),
  };
}

const leereUnterschrift = (): Unterschrift => ({ ort: '', datum: null, funktion: '', name: '' });

/**
 * Neues Pflichtenheft aus der Vorlage des Bestands (sonst der mitgelieferten):
 * Abschnitte und Kategorien erhalten neue Kennungen; als Planläufe gelten die
 * Workflows des Projekts, ohne eigene die projektübergreifenden. Ist die
 * Kategorie „Projekt“ der Plancodierung leer, trägt das Kürzel der
 * Betriebsstelle aus den Stammdaten sie (samt Station) ein.
 */
export function neuesPflichtenheft(data: AppData, project: Project, neueId: NeueId): Pflichtenheft {
  const s = { ...leereStammdaten(), ...project.stammdaten };
  const kuerzel = s.stationKuerzel.trim();
  const vorlage = data.pflichtenheftVorlage ?? standardVorlage(neueId, kuerzel);
  const eigene = data.templates.filter((t) => t.projectId === project.id);
  const workflows = (eigene.length > 0 ? eigene : data.templates.filter((t) => t.projectId === null)).map((t) => ({
    workflowId: t.id,
    titel: t.name,
  }));
  return {
    titel: vorlage.titel,
    abschnitte: vorlage.abschnitte.map((a) => ({ ...a, id: neueId('phab'), funktionen: [...a.funktionen], kontaktIds: [] })),
    aufgestellt: leereUnterschrift(),
    freigegeben: leereUnterschrift(),
    geaendert: leereUnterschrift(),
    titelbild: '',
    gewerkNamen: { ...vorlage.gewerkNamen },
    zeilenNamen: {},
    workflows,
    workflowHinweis: vorlage.workflowHinweis,
    plancodierung: {
      hinweis: vorlage.plancodierung.hinweis,
      kategorien: vorlage.plancodierung.kategorien.map((k) =>
        kuerzel && norm(k.name) === 'projekt' && !k.eintraege.trim()
          ? { ...k, id: neueId('phkat'), beispiel: kuerzel, eintraege: `${kuerzel}\t${s.station.trim() || project.name}` }
          : { ...k, id: neueId('phkat') },
      ),
    },
    aenderungen: [],
  };
}

/** Die Vorlage aus einem Pflichtenheft – für „Als Vorlage speichern“. */
export function alsVorlage(ph: Pflichtenheft): PflichtenheftVorlage {
  return {
    titel: ph.titel,
    abschnitte: ph.abschnitte.map((a) => ({ ...a, kontaktIds: [] })),
    gewerkNamen: { ...ph.gewerkNamen },
    workflowHinweis: ph.workflowHinweis,
    plancodierung: ph.plancodierung,
  };
}

/** Ergänzt fehlende Felder – etwa in einer Sicherung, die von Hand bearbeitet wurde. */
export function pflichtenheftAufbereiten(ph: Partial<Pflichtenheft>): Pflichtenheft {
  const u = (x?: Partial<Unterschrift>): Unterschrift => ({ ...leereUnterschrift(), ...(x ?? {}) });
  return {
    titel: ph.titel ?? '',
    abschnitte: (ph.abschnitte ?? []).map((a) => ({
      ...a,
      text: a.text ?? '',
      funktionen: a.funktionen ?? [],
      kontaktIds: a.kontaktIds ?? [],
      ebene: a.ebene === 2 ? 2 : 1,
    })),
    aufgestellt: u(ph.aufgestellt),
    freigegeben: u(ph.freigegeben),
    geaendert: u(ph.geaendert),
    titelbild: ph.titelbild ?? '',
    gewerkNamen: ph.gewerkNamen ?? {},
    zeilenNamen: ph.zeilenNamen ?? {},
    workflows: ph.workflows ?? [],
    workflowHinweis: ph.workflowHinweis ?? '',
    plancodierung: { kategorien: ph.plancodierung?.kategorien ?? [], hinweis: ph.plancodierung?.hinweis ?? '' },
    aenderungen: ph.aenderungen ?? [],
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
    auftraggeber: s.auftraggeber,
    geschaeftsbereich: s.geschaeftsbereich,
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
  const offen: string[] = [];
  const zeilen: AnsprechpartnerZeile[] = [];
  for (const r of rollen) {
    const kontakte = data.contacts.filter((c) => c.projectId === project.id && c.zuordnungen.some((z) => z.roleId === r.id));
    if (kontakte.length === 0) {
      offen.push(funktionsName(r));
      continue;
    }
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
  // Nicht gefundene Funktionen nennen, damit sie im Editor auffallen
  for (const f of abschnitt.funktionen) {
    if (f.trim() && !rollen.some((r) => norm(r.name) === norm(f))) offen.push(f.trim());
  }
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
  const juengste = [...ph.aenderungen].map((a) => a.datum).filter(Boolean).sort().pop() ?? null;
  return {
    ort: person ? ortAus(person.anschrift) : '',
    datum: art === 'geaendert' ? juengste : null,
    funktion,
    name: person ? `i. A. ${personName(person)}` : '',
  };
}

/** Unterschriftszeile, wie sie gedruckt wird: Eingetragenes vor der Vorbelegung. */
export function unterschriftWert(data: AppData, project: Project, ph: Pflichtenheft, art: UnterschriftArt): Unterschrift {
  const v = unterschriftVorgabe(data, project, ph, art);
  const e = ph[art];
  return {
    ort: e.ort.trim() || v.ort,
    datum: e.datum ?? v.datum,
    funktion: e.funktion.trim() || v.funktion,
    name: e.name.trim() || v.name,
  };
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
function anlagenKopf(nummer: string, titel: string, werte: Record<string, string>): string {
  return `<div class="ph-anlagenkopf">
  <div class="ph-anlage-nr">Anlage ${html(nummer)} zum Pflichtenheft Planlauf</div>
  <div class="ph-anlage-projekt"><strong>${html(werte.station)}</strong><br>${html(werte.projektname)}</div>
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
  .ph-station { font-size: 15pt; font-weight: 700; margin: 0; }
  .ph-name { font-size: 13pt; font-weight: 700; margin: 0 0 14mm; }
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
  @media screen {
    html { background: #e9e9ec; }
    body { background: #fff; max-width: 210mm; margin: 0 auto; padding: 18mm 18mm 18mm 22mm; box-sizing: border-box; }
    .ph-umbruch { border-top: 2px dashed #c7c7cc; margin-top: 14mm; padding-top: 14mm; }
  }
`;

/** Das ganze Pflichtenheft als HTML-Fragment (für `druckeHtml` bzw. die Vorschau mit `htmlDokument`). */
export function pflichtenheftHtml(data: AppData, project: Project, ph: Pflichtenheft): string {
  const werte = platzhalterWerte(data, project, ph);
  const nummern = kapitelNummern(ph.abschnitte);
  const anlage = anlagenNummer(ph.abschnitte);
  const titel = textEinsetzen(ph.titel, werte);
  const einheit = project.settings.fristenInArbeitstagen ? 'AT' : 'KT';
  const workflows = ph.workflows
    .map((w) => ({ w, t: data.templates.find((t) => t.id === w.workflowId) }))
    .filter((x): x is { w: (typeof ph.workflows)[number]; t: NonNullable<typeof x.t> } => !!x.t);

  const teile: string[] = [];

  // Deckblatt
  teile.push(`<section class="ph-deckblatt">
  <h1 class="ph-titel">${html(titel)}</h1>
  <div class="ph-projekt">Projekt ${html(project.gNummer || project.nummer)}</div>
  ${ph.titelbild ? `<img class="ph-bild" src="${ph.titelbild.replace(/"/g, '%22')}" alt="">` : ''}
  <p class="ph-station">${html(werte.station)}</p>
  <p class="ph-name">${html(project.name)}</p>
  ${(['aufgestellt', 'freigegeben', 'geaendert'] as const).map((a) => unterschriftHtml(unterschriftWert(data, project, ph, a), a)).join('')}
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
  ${anlagenKopf(`${anlage}.1.${i + 1}`, w.titel, werte)}
  <div class="ph-diagramm">${svg}</div>
  ${hinweis}
</section>`);
  });

  // Anlage Plancodierung – auf der Querformatseite der Plancodierung (pc-quer), deren Spaltenbreiten darauf rechnen
  teile.push(`<section class="ph-umbruch ph-pc">
  ${anlagenKopf(`${anlage}.2`, `Plancodierungsschema für das Projekt ${werte.station || project.name}`, werte)}
  ${plancodierungHtml(ph.plancodierung, '')}
</section>`);

  // Anlage Änderungsindex
  const aenderungen = [...ph.aenderungen].sort((a, b) => b.datum.localeCompare(a.datum));
  teile.push(`<section class="ph-umbruch">
  ${anlagenKopf(`${anlage}.3`, 'Änderungsindex', werte)}
  ${
    aenderungen.length === 0
      ? '<p class="grau">Noch keine Änderungen.</p>'
      : `<table class="ph-tab ph-index"><tr><th>Seite / Anlagen-Nr.</th><th>Änderung</th><th>Datum</th></tr>${aenderungen
          .map(
            (x) =>
              `<tr><td class="stelle">${html(x.stelle)}</td><td>${html(x.text)}</td><td class="datum num">${html(formatDate(x.datum))}</td></tr>`,
          )
          .join('')}</table>`
  }
</section>`);

  return teile.join('\n');
}
