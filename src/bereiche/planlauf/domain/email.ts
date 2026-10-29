/**
 * Aufbereitung vorgefertigter E-Mails aus den Projektvorlagen.
 * Platzhalter werden im Format {{schluessel}} ersetzt.
 */
import { formatDate, relativeLabel, today } from '../../../shared/dates';
import { tageText, verzugBisHeute, zeitrahmen } from './nachweis';
import type { AppData, Contact, EmailTemplate, PlanDocument, PlanRun, Project, RunStep } from './types';

export interface Platzhalter {
  schluessel: string;
  beschreibung: string;
}

export const PLATZHALTER: Platzhalter[] = [
  { schluessel: 'anrede', beschreibung: 'Anrede-Zeile, z.B. „Sehr geehrte Frau Berger,“' },
  { schluessel: 'empfaenger', beschreibung: 'Vor- und Nachname des Empfängers' },
  { schluessel: 'empfaenger.firma', beschreibung: 'Firma des Empfängers' },
  { schluessel: 'empfaenger.anschrift', beschreibung: 'Anschrift des Empfängers (einzeilig)' },
  { schluessel: 'rolle', beschreibung: 'Funktion im Prozessschritt' },
  { schluessel: 'projekt', beschreibung: 'Projektname' },
  { schluessel: 'projekt.nummer', beschreibung: 'Projektnummer' },
  { schluessel: 'plan', beschreibung: 'Titel von Plan / Paket / Verzeichnis' },
  { schluessel: 'plan.nummer', beschreibung: 'Plannummer' },
  { schluessel: 'plan.index', beschreibung: 'Planindex' },
  { schluessel: 'plan.gewerk', beschreibung: 'Gewerk des Plans' },
  { schluessel: 'plan.phase', beschreibung: 'Planungsphase' },
  { schluessel: 'planlauf', beschreibung: 'Bezeichnung des Planlaufs' },
  { schluessel: 'schritt', beschreibung: 'Name des Prozessschritts' },
  { schluessel: 'soll', beschreibung: 'Soll-Termin, z.B. 14.03.2026' },
  { schluessel: 'frist', beschreibung: 'Relative Frist, z.B. „in 3 Tagen“' },
  { schluessel: 'verzug', beschreibung: 'Verzug mit Einheit, z.B. „5 Arbeitstage“ (0 falls im Plan)' },
  { schluessel: 'verzug.zahl', beschreibung: 'Verzug als Zahl (Arbeits- bzw. Kalendertage nach Projekt)' },
  { schluessel: 'liste', beschreibung: 'Sammel-E-Mail: Liste der Pläne mit Schritt und Soll' },
  { schluessel: 'anzahl', beschreibung: 'Sammel-E-Mail: Anzahl der Pläne in der Liste' },
  { schluessel: 'heute', beschreibung: 'Heutiges Datum' },
  { schluessel: 'absender', beschreibung: 'Absendername aus den Projekteinstellungen' },
];

export interface MailKontext {
  project: Project;
  run: PlanRun;
  step: RunStep;
  contact: Contact | null;
  data: AppData;
}

export function werteFuerKontext(ctx: MailKontext): Record<string, string> {
  const { project, run, step, contact, data } = ctx;
  const doc = data.documents.find((d) => d.id === run.documentId);
  // Verzug wie im Terminnachweis: Arbeits- bzw. Kalendertage nach Projekteinstellung
  const rahmen = zeitrahmen(project);
  const verzug = verzugBisHeute(step, rahmen);
  return {
    anrede: anredeZeile(contact),
    empfaenger: contact ? `${contact.vorname} ${contact.nachname}`.trim() : '',
    'empfaenger.firma': contact?.firma ?? '',
    'empfaenger.anschrift': (contact?.anschrift ?? '').replace(/\s*\n\s*/g, ', '),
    rolle: step.roleName,
    projekt: project.name,
    'projekt.nummer': project.nummer,
    plan: doc?.titel ?? '',
    'plan.nummer': doc?.nummer ?? '',
    'plan.index': doc?.index ?? '',
    'plan.gewerk': doc?.gewerk ?? '',
    'plan.phase': doc?.planungsphase ?? '',
    planlauf: run.name,
    schritt: step.name,
    soll: formatDate(step.sollDatum),
    frist: relativeLabel(step.sollDatum),
    verzug: tageText(verzug, rahmen.arbeitstage),
    'verzug.zahl': String(verzug),
    liste: listenZeile({ step, doc }, rahmen.arbeitstage, verzug),
    anzahl: '1',
    heute: formatDate(today()),
    absender: project.settings.absenderName,
  };
}

/** Bildet die Anredezeile aus der bei der Person hinterlegten Anrede. */
function anredeZeile(contact: Contact | null): string {
  if (!contact) return 'Guten Tag,';
  const anrede = contact.anrede.trim().toLowerCase();
  const name = contact.nachname.trim();
  if (!name) return 'Guten Tag,';
  if (anrede.startsWith('herr')) return `Sehr geehrter Herr ${name},`;
  if (anrede.startsWith('frau')) return `Sehr geehrte Frau ${name},`;
  return `Guten Tag ${contact.vorname} ${name},`.replace(/\s+/g, ' ');
}

export function fuelleVorlage(text: string, werte: Record<string, string>): string {
  return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key: string) => werte[key] ?? `{{${key}}}`);
}

export interface VorbereiteteMail {
  an: string;
  betreff: string;
  text: string;
  /** Öffnet das lokal eingerichtete Outlook (bzw. das Standard-Mailprogramm). */
  mailto: string;
  /** Öffnet ein neues Fenster in Outlook im Web. */
  outlookWeb: string;
}

export function mailVorbereiten(template: EmailTemplate, ctx: MailKontext): VorbereiteteMail {
  const werte = werteFuerKontext(ctx);
  const betreff = fuelleVorlage(template.betreff, werte);
  const text = fuelleVorlage(template.text, werte);
  const an = ctx.contact?.email ?? '';
  return { an, betreff, text, ...mailLinks(an, betreff, text) };
}

/**
 * Höchstlänge einer mailto-Verknüpfung (kodiert). Längere Verknüpfungen
 * schneiden manche Mailprogramme bzw. Browser ab – dann nur „Kopieren“ anbieten.
 */
export const MAILTO_GRENZE = 1800;

/** Baut die Verknüpfungen für Outlook (lokal) und Outlook im Web; `zuLang`: über MAILTO_GRENZE. */
export function mailLinks(an: string, betreff: string, text: string) {
  const mailto = `mailto:${encodeURIComponent(an)}?subject=${encodeURIComponent(betreff)}&body=${encodeURIComponent(text)}`;
  return {
    mailto,
    outlookWeb:
      'https://outlook.office.com/mail/deeplink/compose?' +
      `to=${encodeURIComponent(an)}&subject=${encodeURIComponent(betreff)}&body=${encodeURIComponent(text)}`,
    zuLang: mailto.length > MAILTO_GRENZE,
  };
}

/* ------------------------------------------------------------------ */
/* Sammel-E-Mail je Person                                             */
/* ------------------------------------------------------------------ */

/** Ein Plan in einer Sammel-E-Mail: der anstehende Schritt eines Laufs. */
export interface SammelPosten {
  run: PlanRun;
  step: RunStep;
}

/** Eine Zeile der Liste: „• Plancodierung – Titel: Schritt, Soll 14.03.2026 (3 Arbeitstage überfällig)“. */
function listenZeile(
  posten: { step: RunStep; doc: Pick<PlanDocument, 'nummer' | 'titel' | 'index'> | undefined },
  arbeitstage: boolean,
  verzug?: number,
): string {
  const { step, doc } = posten;
  const plan = doc ? [doc.nummer, doc.titel].filter(Boolean).join(' – ') + (doc.index ? ` (Index ${doc.index})` : '') : '';
  const ueber = verzug && verzug > 0 ? ` (${tageText(verzug, arbeitstage)} überfällig)` : '';
  return `• ${plan ? `${plan}: ` : ''}${step.name}, Soll ${formatDate(step.sollDatum)}${ueber}`;
}

/** Liste der Pläne mit Schritt und Soll – frühestes Soll zuerst (Platzhalter {{liste}}). */
export function sammelListe(posten: SammelPosten[], data: Pick<AppData, 'documents' | 'projects'>): string {
  return [...posten]
    .sort((a, b) => (a.step.sollDatum ?? '9999').localeCompare(b.step.sollDatum ?? '9999'))
    .map(({ run, step }) => {
      const project = data.projects.find((p) => p.id === run.projectId);
      const rahmen = zeitrahmen(project);
      const doc = data.documents.find((d) => d.id === run.documentId);
      return listenZeile({ step, doc }, rahmen.arbeitstage, verzugBisHeute(step, rahmen));
    })
    .join('\n');
}

/**
 * Sammel-E-Mail an eine Person über alle ihre anstehenden Schritte. Einzelwerte
 * (Projekt, Plan, Schritt, Soll …) stammen vom dringlichsten Posten; {{liste}}
 * nennt alle. Enthält die Vorlage keinen Platzhalter {{liste}}, wird die Liste
 * angehängt. `zuLang`: die mailto-Verknüpfung überschreitet MAILTO_GRENZE.
 */
export function sammelMailVorbereiten(
  template: EmailTemplate,
  ctx: { contact: Contact | null; posten: SammelPosten[]; data: AppData },
): VorbereiteteMail & { zuLang: boolean } {
  const sortiert = [...ctx.posten].sort((a, b) => (a.step.sollDatum ?? '9999').localeCompare(b.step.sollDatum ?? '9999'));
  const erster = sortiert[0];
  const project = erster ? ctx.data.projects.find((p) => p.id === erster.run.projectId) : undefined;
  const werte =
    erster && project
      ? werteFuerKontext({ project, run: erster.run, step: erster.step, contact: ctx.contact, data: ctx.data })
      : {};
  const projekte = new Set(ctx.posten.map((p) => p.run.projectId));
  const alle = {
    ...werte,
    // Über mehrere Projekte: kein einzelnes Projekt nennen
    ...(projekte.size > 1 ? { projekt: 'mehrere Projekte', 'projekt.nummer': '' } : {}),
    liste: sammelListe(ctx.posten, ctx.data),
    anzahl: String(ctx.posten.length),
  };
  const betreff = fuelleVorlage(template.betreff, alle);
  const vorlageText = /\{\{\s*liste\s*\}\}/.test(template.text) ? template.text : `${template.text}\n\n{{liste}}`;
  const text = fuelleVorlage(vorlageText, alle);
  const an = ctx.contact?.email ?? '';
  return { an, betreff, text, ...mailLinks(an, betreff, text) };
}

/** Wählt die zum Ampelstatus passende Vorlage vor. */
export function vorlageVorschlagen(
  templates: EmailTemplate[],
  ueberfaellig: boolean,
): EmailTemplate | undefined {
  const anlass = ueberfaellig ? 'ueberfaellig' : 'erinnerung';
  return templates.find((t) => t.anlass === anlass) ?? templates[0];
}
