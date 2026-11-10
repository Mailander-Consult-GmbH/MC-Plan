/**
 * E-Mail-Regeln der Workflows – unabhängig von der Oberfläche.
 *
 * Ein Workflow-Schritt legt mit seinen Regeln fest, ob, wann und mit welcher
 * Vorlage KaPlan eine E-Mail an wen vorschlägt (`MailRegel` in types.ts):
 * Regeln am Schritt (`mails`) gelten, sobald er ansteht bzw. nach seinem
 * Erledigen; Regeln an einer Antwort (`Antwort.mails`) nach dem Erledigen mit
 * dieser Antwort – zu „Ja“ und „Nein“ gehören so verschiedene E-Mails.
 * Planläufe übernehmen die Regeln beim Start mit ihren Schritten.
 *
 * * `uebergabeRegeln` – Vorbelegung: eine E-Mail an die danach Zuständigen
 *   überall dort, wo die Arbeit an eine andere Funktion als das
 *   Planlaufmanagement übergeht (mitgelieferte Workflows, Umstellung älterer
 *   Bestände).
 * * `mailVorschlaege` – wertet die Regeln nach einem Abschluss aus und nennt
 *   die vorgesehenen E-Mails je Empfänger und Vorlage (Dialog „E-Mail senden“);
 *   `vorlageFuerVorschlag` wählt die Vorlage, wenn die Regel keine nennt.
 * * `regelnVon`, `regelAendern`, `regelZeitpunktSetzen` … – Bearbeiten der
 *   Regeln eines Schritts im Workflow-Editor.
 * * `mailRegelnUebernehmen` – trägt die Regeln eines Workflows in einen daraus
 *   gestarteten Planlauf nach (Schritte gleicher Bezeichnung, Art und Funktion).
 */
import { istErledigt, nachfolger, strukturVon, verfolgen, type AblaufSchritt, type Struktur } from './ablauf';
import { kontaktFuerRolleUndGewerk } from './engine';
import { versandSchrittVor, vorlageVorschlagen } from './email';
import {
  EIGENE_ROLLE,
  type Antwort,
  type AppData,
  type EmailTemplate,
  type ID,
  type MailRegel,
  type MailWann,
  type PlanRun,
  type ProcessTemplate,
  type RunStep,
} from './types';

/** Was die Regeln von einem Schritt brauchen – Workflow- wie Laufschritte. */
export interface MailSchritt extends AblaufSchritt {
  name: string;
  roleName: string;
  mails: MailRegel[];
}

const gleich = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Die eigene Funktion (Planlaufmanagement) – an sie geht keine E-Mail. */
const istEigeneRolle = (roleName: string) => gleich(roleName, EIGENE_ROLLE);

/* ------------------------------------------------------------------ */
/* Vorbelegung                                                         */
/* ------------------------------------------------------------------ */

/**
 * Die Schritte (Listenindizes), die nach dem Übergang `ziel` des Schritts an
 * Listenindex `i` an die Reihe kommen können: der Zielschritt, am Zweigende
 * der Anschluss hinter dem Block; führt das Ziel in einen (anderen) Block,
 * alle seine Zweiganfänge. Aufgelöst über `nachfolger` (ablauf.ts).
 */
export function folgeIndizes(
  steps: readonly AblaufSchritt[],
  i: number,
  ziel: ID | 'ende' | null,
  struktur: Struktur = strukturVon(steps),
): number[] {
  const f = nachfolger(steps, i, ziel, struktur);
  const eigene = struktur.lage[i] ?? null;
  let j: number | undefined;
  if (f.art === 'schritt' || f.art === 'ausstieg') j = f.index;
  else if (f.art === 'zweigende' && eigene && eigene.block.ende < steps.length) j = eigene.block.ende;
  if (j === undefined) return [];
  const lage = struktur.lage[j] ?? null;
  if (lage && lage.block !== eigene?.block) return lage.block.zweige.map((z) => z[0]);
  return [j];
}

/** Regel „nach dem Erledigen an die Zuständigen der nächsten Schritte“, Vorlage nach der Lage. */
export function regelAnNaechste(id: ID): MailRegel {
  return { id, wann: 'abschluss', an: 'naechste', roleName: '', vorlageId: null };
}

/**
 * Vorbelegung der E-Mail-Regeln: Überall, wo die Arbeit nach einem Schritt
 * (bei Entscheidungen: nach einer Antwort) an eine andere Funktion als das
 * Planlaufmanagement übergeht, steht eine E-Mail an die danach Zuständigen –
 * Vorlage nach der Lage (nach einem Versandschritt „Versand“). Vorhandene
 * Regeln werden ersetzt. Die Kennungen entstehen aus der des Schritts bzw. der
 * Antwort – gleiche Schritte ergeben gleiche Regeln (Abgleich mit Sicherungen).
 */
export function uebergabeRegeln<T extends Pick<MailSchritt, 'id' | 'typ' | 'antworten' | 'naechster' | 'parallel' | 'roleName'>>(
  steps: T[],
  regelId: (basis: ID) => ID = (basis) => `${basis}-mail`,
): (T & { mails: MailRegel[] })[] {
  const struktur = strukturVon(steps);
  const anAndere = (i: number, ziel: ID | 'ende' | null) =>
    folgeIndizes(steps, i, ziel, struktur).some((j) => {
      const rolle = (steps[j].roleName ?? '').trim();
      return rolle !== '' && !istEigeneRolle(rolle);
    });
  return steps.map((s, i) => {
    const entscheidung = s.typ === 'entscheidung' && s.antworten.length > 0;
    return {
      ...s,
      mails: !entscheidung && anAndere(i, s.naechster) ? [regelAnNaechste(regelId(s.id))] : [],
      antworten: s.antworten.map((a) => ({
        ...a,
        mails: entscheidung && anAndere(i, a.ziel) ? [regelAnNaechste(regelId(a.id))] : [],
      })),
    };
  });
}

/* ------------------------------------------------------------------ */
/* Regeln eines Schritts bearbeiten                                    */
/* ------------------------------------------------------------------ */

type MitRegeln = { mails: MailRegel[]; antworten: Antwort[] };

/** Eine Regel mit ihrem Ort: am Schritt (`antwortId` null) oder an einer Antwort. */
export interface RegelOrt {
  regel: MailRegel;
  antwortId: ID | null;
}

/** Alle Regeln eines Schritts: erst die am Schritt, dann die der Antworten. */
export function regelnVon(step: MitRegeln): RegelOrt[] {
  return [
    ...(step.mails ?? []).map((regel) => ({ regel, antwortId: null })),
    ...step.antworten.flatMap((a) => (a.mails ?? []).map((regel) => ({ regel, antwortId: a.id }))),
  ];
}

/** Sieht der Schritt E-Mails vor? */
export function hatMails(step: MitRegeln): boolean {
  return regelnVon(step).length > 0;
}

/** Wendet `fn` auf jede Regelliste des Schritts an (am Schritt und an den Antworten). */
function listenAendern<T extends MitRegeln>(step: T, fn: (mails: MailRegel[], antwortId: ID | null) => MailRegel[]): T {
  return {
    ...step,
    mails: fn(step.mails ?? [], null),
    antworten: step.antworten.map((a) => ({ ...a, mails: fn(a.mails ?? [], a.id) })),
  };
}

/** Ergänzt eine Regel am Schritt. */
export function regelHinzufuegen<T extends MitRegeln>(step: T, regel: MailRegel): T {
  return { ...step, mails: [...(step.mails ?? []), regel] };
}

/** Ändert Empfänger bzw. Vorlage einer Regel (wo immer sie steht). */
export function regelAendern<T extends MitRegeln>(step: T, regelId: ID, patch: Partial<Pick<MailRegel, 'an' | 'roleName' | 'vorlageId'>>): T {
  return listenAendern(step, (mails) => mails.map((r) => (r.id === regelId ? { ...r, ...patch } : r)));
}

export function regelEntfernen<T extends MitRegeln>(step: T, regelId: ID): T {
  return listenAendern(step, (mails) => mails.filter((r) => r.id !== regelId));
}

/** Zeitpunkt einer Regel: am Schritt („anstehen“, „abschluss“) oder bei einer Antwort. */
export type RegelZeitpunkt = MailWann | { antwortId: ID };

/** Der Zeitpunkt als Wert einer Auswahl: „anstehen“, „abschluss“ bzw. „antwort:<ID>“. */
export function zeitpunktWert(ort: RegelOrt): string {
  return ort.antwortId ? `antwort:${ort.antwortId}` : ort.regel.wann;
}

export function zeitpunktAusWert(wert: string): RegelZeitpunkt {
  if (wert.startsWith('antwort:')) return { antwortId: wert.slice('antwort:'.length) };
  return wert === 'anstehen' ? 'anstehen' : 'abschluss';
}

/**
 * Setzt den Zeitpunkt einer Regel – sie wandert dabei zwischen Schritt und
 * Antwort. Regeln an einer Antwort gelten stets nach dem Erledigen.
 */
export function regelZeitpunktSetzen<T extends MitRegeln>(step: T, regelId: ID, zeitpunkt: RegelZeitpunkt): T {
  const ort = regelnVon(step).find((o) => o.regel.id === regelId);
  if (!ort) return step;
  const antwortId = typeof zeitpunkt === 'string' ? null : zeitpunkt.antwortId;
  if (antwortId !== null && !step.antworten.some((a) => a.id === antwortId)) return step;
  const regel: MailRegel = { ...ort.regel, wann: typeof zeitpunkt === 'string' ? zeitpunkt : 'abschluss' };
  if (ort.antwortId === antwortId) return listenAendern(step, (mails) => mails.map((r) => (r.id === regelId ? regel : r)));
  return listenAendern(step, (mails, ziel) => {
    const ohne = mails.filter((r) => r.id !== regelId);
    return ziel === antwortId ? [...ohne, regel] : ohne;
  });
}

/**
 * Regeln in fester Form (beim Speichern eines Workflows): Die Funktion steht
 * nur bei `an: 'funktion'`, Regeln an Antworten gelten nach dem Erledigen.
 */
export function regelnBereinigen<T extends MitRegeln>(step: T): T {
  const fest = (r: MailRegel): MailRegel => ({ ...r, roleName: r.an === 'funktion' ? r.roleName.trim() : '' });
  return listenAendern(step, (mails, antwortId) => mails.map((r) => (antwortId ? { ...fest(r), wann: 'abschluss' as const } : fest(r))));
}

/** Zeitpunkt einer Regel in Worten: „Sobald der Schritt ansteht“, „Nach dem Erledigen“, „Bei „Nein““. */
export function regelWannText(ort: RegelOrt, step: Pick<MitRegeln, 'antworten'>): string {
  if (ort.antwortId) return `Bei „${step.antworten.find((a) => a.id === ort.antwortId)?.text || 'Antwort'}“`;
  return ort.regel.wann === 'anstehen' ? 'Sobald der Schritt ansteht' : 'Nach dem Erledigen';
}

/** Empfänger einer Regel in Worten. */
export function regelAnText(regel: MailRegel): string {
  if (regel.an === 'funktion') return `an ${regel.roleName || 'eine Funktion'}`;
  if (regel.an === 'zustaendig') return 'an die für den Schritt zuständige Person';
  return regel.wann === 'anstehen' ? 'an die Zuständigen der Schritte danach' : 'an die Zuständigen der nächsten Schritte';
}

/** Eine Regel als Satz: „Bei „Nein“: „Rückmeldung“ an Fachplaner“. */
export function regelSatz(ort: RegelOrt, step: Pick<MitRegeln, 'antworten'>, vorlagen: Pick<EmailTemplate, 'id' | 'name'>[]): string {
  const vorlage = vorlagen.find((v) => v.id === ort.regel.vorlageId);
  return `${regelWannText(ort, step)}: ${vorlage ? `„${vorlage.name}“` : 'E-Mail'} ${regelAnText(ort.regel)}`;
}

/* ------------------------------------------------------------------ */
/* Auswertung nach einem Abschluss                                     */
/* ------------------------------------------------------------------ */

/** Ein Schritt eines Planlaufs. */
export interface MailPosten {
  runId: ID;
  stepId: ID;
}

/**
 * Ein Abschluss, nach dem E-Mails vorgesehen sein können. Die gewählte Antwort
 * steht hier und wird nicht aus dem Bestand gelesen: Führt sie zurück, ist der
 * Schritt dort schon für den nächsten Durchlauf zurückgesetzt.
 */
export interface MailEreignis {
  runId: ID;
  /** Der abgeschlossene Schritt. */
  stepId: ID;
  status: 'erledigt' | 'uebersprungen';
  /** Gewählte Antwort einer Entscheidung. */
  antwortId: ID | null;
  /** Die Schritte, die dadurch neu anstehen. */
  neu: ID[];
}

/** Eine vorgesehene E-Mail: eine je Empfänger und Vorlage. */
export interface MailVorschlag {
  schluessel: string;
  /**
   * `schritt`: Die Person ist mit den genannten Schritten an der Reihe;
   * `info`: E-Mail über den Schritt an jemanden, der ihn nicht bearbeitet.
   */
  art: 'schritt' | 'info';
  /** Empfänger; null = niemand hinterlegt (Funktion nicht besetzt). */
  contactId: ID | null;
  /** Funktion, über die der Empfänger bestimmt ist. */
  roleName: string;
  /** Vorlage laut Regel; null = nach der Lage (siehe vorlageFuerVorschlag). */
  vorlageId: ID | null;
  /** Schritte, aus denen die Vorlage ihre Platzhalter füllt (mehrere: Sammel-E-Mail). */
  posten: MailPosten[];
  /** Schritte, an denen die vorbereitete E-Mail vermerkt wird. */
  vermerk: MailPosten[];
  /** Wodurch die E-Mail vorgesehen ist, z. B. „„BVB-Freigabe“: Nein“. */
  anlaesse: string[];
}

const gleicherPosten = (a: MailPosten, b: MailPosten) => a.runId === b.runId && a.stepId === b.stepId;

/**
 * Die E-Mails, die die Regeln der Schritte nach diesen Abschlüssen vorsehen:
 *
 * * nach dem Erledigen eines Schritts seine Regeln „nach dem Erledigen“ und
 *   die der gewählten Antwort – an die Zuständigen der neu anstehenden
 *   Schritte, an die für den Schritt zuständige Person bzw. an eine Funktion.
 *   Nach dem Überspringen gelten davon nur die E-Mails an die nächsten
 *   Zuständigen: Die Arbeit geht weiter, entschieden wurde aber nichts;
 * * für jeden neu anstehenden Schritt seine Regeln „sobald der Schritt
 *   ansteht“ – an seine zuständige Person, an die Zuständigen der Schritte
 *   danach (im Verlauf) bzw. an eine Funktion.
 *
 * Gleicher Empfänger und gleiche Vorlage ergeben eine E-Mail über alle
 * betroffenen Schritte. An die eigene Person (Planlaufmanagement) geht nichts.
 * Gelesen wird der aktuelle Stand der Läufe – also nach dem Abschluss.
 */
export function mailVorschlaege(
  data: Pick<AppData, 'runs' | 'contacts' | 'roles' | 'documents'>,
  ereignisse: MailEreignis[],
): MailVorschlag[] {
  const liste: MailVorschlag[] = [];
  const dazu = (v: Omit<MailVorschlag, 'schluessel'>) => {
    const kontakt = v.contactId ? data.contacts.find((c) => c.id === v.contactId) : undefined;
    if (kontakt?.eigen || (!kontakt && istEigeneRolle(v.roleName))) return;
    const contactId = kontakt ? kontakt.id : null;
    const schluessel = `${v.art}|${contactId ?? `ohne:${v.roleName.trim().toLowerCase()}`}|${v.vorlageId ?? ''}`;
    const vorhanden = liste.find((x) => x.schluessel === schluessel);
    if (!vorhanden) {
      liste.push({ ...v, contactId, schluessel });
      return;
    }
    for (const p of v.posten) if (!vorhanden.posten.some((x) => gleicherPosten(x, p))) vorhanden.posten.push(p);
    for (const p of v.vermerk) if (!vorhanden.vermerk.some((x) => gleicherPosten(x, p))) vorhanden.vermerk.push(p);
    for (const a of v.anlaesse) if (!vorhanden.anlaesse.includes(a)) vorhanden.anlaesse.push(a);
  };

  for (const e of ereignisse) {
    const run = data.runs.find((r) => r.id === e.runId);
    if (!run) continue;
    const kontakte = data.contacts.filter((c) => c.projectId === run.projectId);
    const rollen = data.roles.filter((r) => r.projectId === run.projectId);
    const gewerk = data.documents.find((d) => d.id === run.documentId)?.gewerk ?? '';
    const posten = (s: RunStep): MailPosten => ({ runId: run.id, stepId: s.id });
    const funktion = (roleName: string) => ({ contactId: kontaktFuerRolleUndGewerk(kontakte, rollen, roleName, gewerk), roleName });
    const neu = e.neu
      .map((id) => run.steps.find((s) => s.id === id))
      .filter((s): s is RunStep => Boolean(s) && !istErledigt(s!));

    // Nach dem Abschluss: Regeln des Schritts und der gewählten Antwort –
    // übersprungen nur die an die nächsten Zuständigen
    const erledigt = run.steps.find((s) => s.id === e.stepId);
    if (erledigt) {
      const uebersprungen = e.status === 'uebersprungen';
      const antwort = erledigt.typ === 'entscheidung' ? erledigt.antworten.find((a) => a.id === e.antwortId) : undefined;
      const anlass = uebersprungen
        ? `„${erledigt.name}“ übersprungen`
        : antwort
          ? `„${erledigt.name}“: ${antwort.text}`
          : `„${erledigt.name}“ erledigt`;
      const regeln = [...(erledigt.mails ?? []).filter((r) => r.wann === 'abschluss'), ...(antwort?.mails ?? [])].filter(
        (r) => !uebersprungen || r.an === 'naechste',
      );
      for (const regel of regeln) {
        const rahmen = { vorlageId: regel.vorlageId, anlaesse: [anlass] };
        if (regel.an === 'naechste') {
          for (const n of neu) {
            dazu({ ...rahmen, art: 'schritt', contactId: n.contactId, roleName: n.roleName, posten: [posten(n)], vermerk: [posten(n)] });
          }
        } else {
          const an = regel.an === 'zustaendig' ? { contactId: erledigt.contactId, roleName: erledigt.roleName } : funktion(regel.roleName);
          dazu({ ...rahmen, ...an, art: 'info', posten: [posten(erledigt)], vermerk: [posten(erledigt)] });
        }
      }
    }

    // Sobald ein Schritt ansteht: seine eigenen Regeln
    const mitRegel = neu.filter((n) => (n.mails ?? []).some((r) => r.wann === 'anstehen'));
    if (mitRegel.length === 0) continue;
    const vorgaenger = verfolgen(run.steps).vorgaenger;
    for (const n of mitRegel) {
      const rahmen = { anlaesse: [`„${n.name}“ steht an`], vermerk: [posten(n)] };
      for (const regel of n.mails.filter((r) => r.wann === 'anstehen')) {
        if (regel.an === 'zustaendig') {
          dazu({ ...rahmen, art: 'schritt', vorlageId: regel.vorlageId, contactId: n.contactId, roleName: n.roleName, posten: [posten(n)] });
        } else if (regel.an === 'naechste') {
          for (const f of run.steps.filter((s) => (vorgaenger.get(s.id) ?? []).includes(n.id))) {
            dazu({ ...rahmen, art: 'schritt', vorlageId: regel.vorlageId, contactId: f.contactId, roleName: f.roleName, posten: [posten(f)] });
          }
        } else {
          dazu({ ...rahmen, ...funktion(regel.roleName), art: 'info', vorlageId: regel.vorlageId, posten: [posten(n)] });
        }
      }
    }
  }
  return liste;
}

/**
 * Vorlage einer vorgesehenen E-Mail: die der Regel; nennt sie keine (oder gibt
 * es sie nicht mehr), die zur Lage passende – nach einem Versandschritt die
 * Vorlage „Versand“ (Platzhalter {{versandliste}}), bei mehreren Schritten die
 * Sammelerinnerung ({{liste}}), sonst die erste mit Anlass „Übergabe“ bzw. –
 * für E-Mails an Unbeteiligte – „Allgemein“.
 */
export function vorlageFuerVorschlag(
  data: Pick<AppData, 'runs' | 'emailVorlagen'>,
  vorschlag: Pick<MailVorschlag, 'art' | 'vorlageId' | 'posten'>,
): EmailTemplate | undefined {
  const vorlagen = data.emailVorlagen;
  const hinterlegt = vorschlag.vorlageId ? vorlagen.find((v) => v.id === vorschlag.vorlageId) : undefined;
  if (hinterlegt) return hinterlegt;
  const nachVersand =
    vorschlag.art === 'schritt' &&
    vorschlag.posten.some((p) => {
      const run = data.runs.find((r) => r.id === p.runId);
      return Boolean(run && versandSchrittVor(run, p.stepId));
    });
  const versand = nachVersand ? vorlagen.find((v) => /\{\{\s*versandliste\s*\}\}/.test(v.text)) : undefined;
  const sammel = vorschlag.posten.length > 1 ? vorlagen.find((v) => /\{\{\s*liste\s*\}\}/.test(v.text)) : undefined;
  const nachAnlass =
    vorschlag.art === 'schritt'
      ? vorlagen.find((v) => v.anlass === 'uebergabe')
      : (vorlagen.find((v) => v.anlass === 'allgemein') ?? vorlagen.find((v) => v.anlass === 'uebergabe'));
  return versand ?? sammel ?? nachAnlass ?? vorlageVorschlagen(vorlagen, false);
}

/* ------------------------------------------------------------------ */
/* Regeln eines Workflows in laufende Planläufe übernehmen             */
/* ------------------------------------------------------------------ */

const schrittSchluessel = (s: Pick<MailSchritt, 'typ' | 'name' | 'roleName'>) =>
  `${s.typ}|${s.name.trim().toLowerCase()}|${s.roleName.trim().toLowerCase()}`;

/** Regeln ohne Kennung – zum Vergleich. */
const regelnForm = (step: MitRegeln) =>
  JSON.stringify({
    mails: (step.mails ?? []).map(({ id: _id, ...r }) => r),
    antworten: step.antworten.map((a) => ({ text: a.text.trim().toLowerCase(), mails: (a.mails ?? []).map(({ id: _id, ...r }) => r) })),
  });

/** Unterscheiden sich die E-Mail-Regeln zweier Fassungen eines Workflows? */
export function regelnGeaendert(alt: (MitRegeln & Pick<MailSchritt, 'typ' | 'name' | 'roleName'>)[], neu: typeof alt): boolean {
  const form = (steps: typeof alt) => JSON.stringify(steps.map((s) => [schrittSchluessel(s), regelnForm(s)]));
  return form(alt) !== form(neu);
}

/**
 * Trägt die E-Mail-Regeln des Workflows in einen Planlauf nach: Jeder
 * Laufschritt erhält die Regeln des Workflow-Schritts gleicher Bezeichnung, Art
 * und Funktion, seine Antworten die der Antwort gleichen Textes. Schritte ohne
 * (eindeutiges) Gegenstück – etwa individuell eingefügte – bleiben, wie sie
 * sind. Ändert sich nichts, kommt derselbe Lauf zurück.
 */
export function mailRegelnUebernehmen(run: PlanRun, vorlage: Pick<ProcessTemplate, 'steps'>): PlanRun {
  const gegenstuecke = new Map<string, ProcessTemplate['steps'][number] | null>();
  for (const t of vorlage.steps) {
    const k = schrittSchluessel(t);
    const schon = gegenstuecke.get(k);
    // Gleichnamige Schritte mit verschiedenen Regeln: nicht eindeutig
    gegenstuecke.set(k, schon === undefined || (schon && regelnForm(schon) === regelnForm(t)) ? t : null);
  }
  let geaendert = false;
  const steps = run.steps.map((s) => {
    const t = gegenstuecke.get(schrittSchluessel(s));
    if (!t) return s;
    const neu: RunStep = {
      ...s,
      mails: t.mails ?? [],
      antworten: s.antworten.map((a) => {
        const ta = t.antworten.find((x) => gleich(x.text, a.text));
        return ta ? { ...a, mails: ta.mails ?? [] } : a;
      }),
    };
    if (regelnForm(neu) === regelnForm(s)) return s;
    geaendert = true;
    return neu;
  });
  return geaendert ? { ...run, steps } : run;
}

/** Laufende Planläufe aus diesem Workflow, deren E-Mail-Regeln von seinen abweichen. */
export function laeufeMitAnderenRegeln(runs: PlanRun[], vorlage: Pick<ProcessTemplate, 'id' | 'steps'>): PlanRun[] {
  return runs.filter((r) => r.status === 'laufend' && r.templateId === vorlage.id && mailRegelnUebernehmen(r, vorlage) !== r);
}
