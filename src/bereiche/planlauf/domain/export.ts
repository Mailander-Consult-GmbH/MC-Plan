/**
 * Projektbezogene Auswertungen für den Export als Excel-Arbeitsmappe oder PDF
 * (über den Druckdialog).
 *
 * Grundlage ist dieselbe Gliederung wie im Reiter „Planläufe“
 * (domain/uebersicht.ts): Planpakete sind Überschriften, ein gebündelt
 * laufendes Planverzeichnis ist ein Planlauf mit mitlaufenden Plänen, ein
 * Verzeichnis mit einzeln laufenden Plänen fasst diese zusammen; abgebrochene
 * Läufe stehen am Ende.
 *
 * Kurzfassung: Die PDF-Fassung gibt die Tabelle der Übersicht so wieder, wie
 * sie im Programm erscheint (ohne Schaltflächen) – Aktueller Stand, Nächster
 * Schritt, Zuständig, Fortschritt und Status. In Excel ist sie ein formatiertes
 * Blatt mit Planpaket, Plancode, Index/Ausgabe, Titel, Gewerk, Aktuellem Stand,
 * Datum, Nächstem Schritt und Frist (kurzBlatt). Langfassung: zusätzlich alle
 * durchlaufenen und ausstehenden Schritte je Planlauf.
 */
import { formatDate, relativeLabel, today } from '../../../shared/dates';
import { iconSvg } from '../../../shared/icons';
import { html } from '../../../shared/print';
import type { Blatt, Stil, Zelle } from '../../../shared/xlsx';
import { AMPEL_LABEL, abbruchHinweis, ampelFuerSchritt, fortschritt, pfad } from './engine';
import {
  DOCUMENT_KIND_LABEL,
  INDEX_LABEL,
  NACHWEIS_LABEL,
  RUN_STATUS_LABEL,
  STEP_STATUS_LABEL,
  STEP_TYPE_LABEL,
  hatEigenenPlanlauf,
  type AppData,
  type DocumentKind,
  type ID,
  type PlanDocument,
  type PlanRun,
  type Project,
  type RunStatus,
  type RunStep,
} from './types';
import {
  eintraegeVon,
  gliederungBilden,
  knotenBilden,
  letzterAbgeschlossenerSchritt,
  massgeblicheLaeufe,
  mitlaufendePlaene,
  paketStand,
  standAnzeige,
  statusAnzeige,
  verzeichnisStand,
  wartetAufEingang,
  type Stand,
  type StatusTon,
  type UebersichtEintrag,
} from './uebersicht';

export type ExportUmfang = 'kurz' | 'lang';

export const UMFANG_LABEL: Record<ExportUmfang, string> = {
  kurz: 'Kurzfassung',
  lang: 'Langfassung',
};

/* ------------------------------------------------------------------ */
/* Bericht: die Gliederung der Übersicht für die gewählten Einträge     */
/* ------------------------------------------------------------------ */

/** Eine Zeile des Berichts. */
export type BerichtZeile =
  /** Ein Planlauf – Plan oder gebündelt laufendes Planverzeichnis. */
  | { art: 'lauf'; eintrag: UebersichtEintrag; ebene: 0 | 1 }
  /** Ein Plan, der im Planlauf seines Verzeichnisses mitläuft. */
  | { art: 'mitlaufend'; plan: PlanDocument; verzeichnisLauf: PlanRun; ebene: 1 }
  /** Ein Planverzeichnis, dessen Pläne einzeln laufen – es fasst sie zusammen. */
  | { art: 'klammer'; verzeichnis: PlanDocument; anzahl: number; stand: Stand; ebene: 0 };

/** Eine Gruppe des Berichts: ein Planpaket, die Einträge ohne Paket oder die abgebrochenen Läufe. */
export interface BerichtGruppe {
  art: 'paket' | 'ohne-paket' | 'abgebrochen';
  paket: PlanDocument | null;
  /** Stand des Planpakets – nur bei Paketen. */
  stand: Stand | null;
  /** Anzahl der Planläufe der Gruppe (wie in der Kopfzeile der Übersicht). */
  laeufe: number;
  zeilen: BerichtZeile[];
}

export interface Bericht {
  gruppen: BerichtGruppe[];
  /** Kopfzeilen für Gruppen werden gezeigt, sobald es Planpakete gibt – wie in der Übersicht. */
  mitPaketen: boolean;
}

/**
 * Schlüssel, über den eine Zeile ausgewählt wird: bei Planläufen der Lauf –
 * ein Eintrag kann neben seinem laufenden auch einen abgebrochenen Lauf haben –,
 * bei mitlaufenden Plänen der Plan. Verzeichnisklammern sind nicht auswählbar.
 */
export function zeilenSchluessel(zeile: BerichtZeile): ID | undefined {
  if (zeile.art === 'lauf') return zeile.eintrag.run.id;
  if (zeile.art === 'mitlaufend') return zeile.plan.id;
  return undefined;
}

/**
 * Baut den Bericht eines Projekts. Ohne Auswahl enthält er alles, was die
 * Übersicht zeigt; mit Auswahl (Schlüssel nach zeilenSchluessel) nur die
 * gewählten Planläufe und mitlaufenden Pläne. Ein gewählter mitlaufender Plan
 * bringt den Lauf seines Verzeichnisses mit – ohne ihn stünde er nirgends.
 */
export function berichtBilden(data: AppData, project: Project, auswahl?: Set<ID>): Bericht {
  const vorlauf = project.settings.erinnerungVorlaufTage;
  const documents = data.documents;
  const alleLaeufe = massgeblicheLaeufe(data, project.id);
  const gewaehlt = (id: ID) => !auswahl || auswahl.has(id);
  const eintraege = eintraegeVon(documents, alleLaeufe).filter(
    (e) =>
      gewaehlt(e.run.id) ||
      (e.run.status !== 'abgebrochen' &&
        e.doc?.kind === 'verzeichnis' &&
        mitlaufendePlaene(documents, e.doc.id).some((p) => gewaehlt(p.id))),
  );
  const gliederung = gliederungBilden(documents, eintraege);
  const laufende = eintraege.filter((e) => e.run.status !== 'abgebrochen');
  const basis = eigeneLaeufeDesProjekts(data, project.id);

  /** Zeilen einer Gruppe: Planläufe, darunter die Pläne ihrer Verzeichnisse. */
  const zeilenVon = (liste: UebersichtEintrag[]): BerichtZeile[] =>
    knotenBilden(documents, liste).flatMap((k): BerichtZeile[] => {
      if (k.art === 'klammer') {
        return [
          {
            art: 'klammer',
            verzeichnis: k.verzeichnis,
            anzahl: k.kinder.length,
            stand: verzeichnisStand(documents, k.verzeichnis.id, basis, vorlauf),
            ebene: 0,
          },
          ...k.kinder.map((eintrag): BerichtZeile => ({ art: 'lauf', eintrag, ebene: 1 })),
        ];
      }
      const zeilen: BerichtZeile[] = [{ art: 'lauf', eintrag: k.eintrag, ebene: 0 }];
      const doc = k.eintrag.doc;
      if (doc?.kind === 'verzeichnis') {
        // Pläne des Verzeichnisses: mitlaufend oder – herausgelöst – mit eigenem Lauf
        for (const plan of documents.filter((d) => d.parentId === doc.id)) {
          if (hatEigenenPlanlauf(plan, documents)) {
            const eigener = laufende.find((e) => e.doc?.id === plan.id);
            if (eigener) zeilen.push({ art: 'lauf', eintrag: eigener, ebene: 1 });
          } else if (gewaehlt(plan.id)) {
            zeilen.push({ art: 'mitlaufend', plan, verzeichnisLauf: k.eintrag.run, ebene: 1 });
          }
        }
      }
      return zeilen;
    });

  const gruppen: BerichtGruppe[] = [
    ...gliederung.pakete.map(
      ({ paket, eintraege: inhalt }): BerichtGruppe => ({
        art: 'paket',
        paket,
        stand: paketStand(documents, paket.id, basis, vorlauf),
        laeufe: inhalt.length,
        zeilen: zeilenVon(inhalt),
      }),
    ),
  ];
  if (gliederung.ohnePaket.length > 0) {
    gruppen.push({
      art: 'ohne-paket',
      paket: null,
      stand: null,
      laeufe: gliederung.ohnePaket.length,
      zeilen: zeilenVon(gliederung.ohnePaket),
    });
  }
  if (gliederung.verworfene.length > 0) {
    gruppen.push({
      art: 'abgebrochen',
      paket: null,
      stand: null,
      laeufe: gliederung.verworfene.length,
      zeilen: gliederung.verworfene.map((eintrag): BerichtZeile => ({ art: 'lauf', eintrag, ebene: 0 })),
    });
  }
  return { gruppen, mitPaketen: gliederung.pakete.length > 0 };
}

/** Alle eigenständigen Läufe des Projekts – Grundlage für den Stand von Paketen und Klammern. */
function eigeneLaeufeDesProjekts(data: AppData, projectId: ID): PlanRun[] {
  return data.runs.filter((r) => {
    if (r.projectId !== projectId) return false;
    const doc = data.documents.find((d) => d.id === r.documentId);
    return !doc || hatEigenenPlanlauf(doc, data.documents);
  });
}

/* ------------------------------------------------------------------ */
/* Werte einer Zeile – wie in der Übersicht                             */
/* ------------------------------------------------------------------ */

interface ZeilenWerte {
  art: DocumentKind;
  nummer: string;
  /** Index bzw. Ausgabe ohne Bezeichnung … */
  index: string;
  /** … und mit Bezeichnung („Index C“, „Ausgabe 02“). */
  indexText: string;
  titel: string;
  zusatz: string;
  gewerk: string;
  stand: { name: string; datum: string } | null;
  naechster: { name: string; soll: string; frist: string } | null;
  zustaendig: { funktion: string; person: string } | null;
  pct: number | null;
  status: { text: string; ton: StatusTon } | null;
  /** Hinweis anstelle der Schrittangaben – abgebrochen, mitlaufend, Klammer. */
  hinweis: string;
  /** Bei abgebrochenen Läufen: wann und wie (ersatzlos bzw. ersetzt). */
  abbruch: { wann: string; wie: string } | null;
  /** Farbe der Bezeichnung wie in der Übersicht. */
  farbe: '' | 'eingang' | 'fertig' | 'verworfen';
}

function personText(data: AppData, step: RunStep | undefined): string {
  const kontakt = data.contacts.find((c) => c.id === step?.contactId);
  return kontakt ? `${kontakt.vorname} ${kontakt.nachname}` : '';
}

function indexText(kind: DocumentKind, index: string): string {
  return index ? `${INDEX_LABEL[kind]} ${index}` : '';
}

function zeilenWerte(data: AppData, project: Project, zeile: BerichtZeile): ZeilenWerte {
  const vorlauf = project.settings.erinnerungVorlaufTage;
  if (zeile.art === 'klammer') {
    const v = zeile.verzeichnis;
    return {
      art: 'verzeichnis',
      nummer: v.nummer,
      index: v.index,
      indexText: indexText('verzeichnis', v.index),
      titel: v.titel,
      zusatz: 'Pläne einzeln',
      gewerk: v.gewerk,
      stand: null,
      naechster: null,
      zustaendig: null,
      pct: zeile.stand.status ? zeile.stand.pct : null,
      status: standAnzeige(zeile.stand),
      hinweis: `${zeile.anzahl} ${zeile.anzahl === 1 ? 'laufender Plan' : 'laufende Pläne'}`,
      abbruch: null,
      farbe: '',
    };
  }
  if (zeile.art === 'mitlaufend') {
    const p = zeile.plan;
    return {
      art: 'plan',
      nummer: p.nummer,
      index: p.index,
      indexText: indexText('plan', p.index),
      titel: p.titel,
      zusatz: '',
      gewerk: p.gewerk,
      stand: null,
      naechster: null,
      zustaendig: null,
      pct: null,
      status: null,
      hinweis: 'läuft im Planlauf des Verzeichnisses mit',
      abbruch: null,
      farbe: '',
    };
  }
  const { run, doc, step: offen } = zeile.eintrag;
  const abgebrochen = run.status === 'abgebrochen';
  const step = abgebrochen ? undefined : offen;
  const plaene = doc?.kind === 'verzeichnis' ? data.documents.filter((d) => d.parentId === doc.id).length : 0;
  const stand = letzterAbgeschlossenerSchritt(run);
  const kind = doc?.kind ?? 'plan';
  // Ein abgebrochener Lauf trägt seinen eigenen Index – der Eintrag steht längst auf dem Nachfolger
  const index = (abgebrochen ? run.index : doc?.index) ?? '';
  const abbruch = abgebrochen
    ? {
        wann: `Abgebrochen${run.abbruchDatum ? ` am ${formatDate(run.abbruchDatum)}` : ''}`,
        wie: abbruchHinweis(run, kind),
      }
    : null;
  return {
    art: kind,
    nummer: doc?.nummer ?? '',
    index,
    indexText: indexText(kind, index),
    titel: doc?.titel ?? run.name,
    zusatz: plaene > 0 ? `${plaene} ${plaene === 1 ? 'Plan' : 'Pläne'}` : '',
    gewerk: doc?.gewerk ?? '',
    stand: abgebrochen || !stand ? null : { name: stand.name, datum: stand.istDatum ? formatDate(stand.istDatum) : '' },
    naechster: step ? { name: step.name, soll: step.sollDatum ? formatDate(step.sollDatum) : '', frist: relativeLabel(step.sollDatum) } : null,
    zustaendig: step ? { funktion: step.roleName, person: personText(data, step) } : null,
    pct: abgebrochen ? null : fortschritt(run),
    status: statusAnzeige(run, step, vorlauf),
    hinweis: abbruch ? `${abbruch.wann} · ${abbruch.wie}` : '',
    abbruch,
    farbe: abgebrochen ? 'verworfen' : run.status === 'abgeschlossen' ? 'fertig' : wartetAufEingang(run, step) ? 'eingang' : '',
  };
}

/** Planverzeichnis einer Zeile (bei Plänen ihr Verzeichnis, bei Verzeichnissen sie selbst). */
function verzeichnisVon(data: AppData, zeile: BerichtZeile): PlanDocument | undefined {
  if (zeile.art === 'klammer') return zeile.verzeichnis;
  const doc = zeile.art === 'mitlaufend' ? zeile.plan : zeile.eintrag.doc;
  if (!doc) return undefined;
  if (doc.kind === 'verzeichnis') return doc;
  return doc.parentId ? data.documents.find((d) => d.id === doc.parentId) : undefined;
}

const gruppenTitel = (g: BerichtGruppe) =>
  g.art === 'paket' ? (g.paket?.titel ?? '') : g.art === 'ohne-paket' ? 'Ohne Planpaket' : 'Abgebrochen';

/* ------------------------------ Excel ----------------------------- */

/** Gestaltung der Excel-Kurzfassung – Hausfarbe, Grün für Abgeschlossenes, Grau für Abgebrochenes. */
const EXCEL = {
  titel: { fett: true, groesse: 14, farbe: '24456E' },
  stand: { kursiv: true, groesse: 10 },
  kopf: { fett: true, farbe: 'FFFFFF', fuellung: '24456E', rahmen: true, zentriert: true },
  laufend: { rahmen: true },
  abgeschlossen: { rahmen: true, fuellung: 'E8F5E9' },
  abgebrochen: { rahmen: true, fuellung: 'EDEDED', farbe: '595959' },
  gruppeAbgeschlossen: { fett: true, farbe: '2E7D32', fuellung: 'E8F5E9' },
  gruppeAbgebrochen: { fett: true, farbe: '595959', fuellung: 'EDEDED' },
  faellig: { rahmen: true, fuellung: 'F28C28' },
  ueberfaellig: { rahmen: true, fuellung: 'D93025', farbe: 'FFFFFF', fett: true },
} satisfies Record<string, Stil>;

const KURZ_KOPF = [
  'Planpaket',
  'Plancode',
  'Index/Ausgabe',
  'Titel',
  'Gewerk',
  'Aktueller Stand',
  'Datum',
  'Nächster Schritt',
  'Frist',
];

/**
 * Kurzfassung als Excel-Blatt: in A1 das Projekt, in A2 der Stand, darunter je
 * Zeile der Übersicht eine Zeile. Laufende Planläufe stehen zuerst, danach
 * gesondert die abgeschlossenen (grün) und die abgebrochenen (grau) – jeweils
 * in der Reihenfolge der Übersicht. Datum und Frist sind echte Excel-Daten; die
 * Frist ist bei fälligen Schritten orange, bei überfälligen rot hinterlegt.
 * Verzeichnisklammern laufen selbst nicht und fehlen – ihre Pläne stehen mit
 * eigenem Lauf in der Liste.
 */
export function kurzBlatt(data: AppData, project: Project, auswahl?: Set<ID>): Blatt {
  const vorlauf = project.settings.erinnerungVorlaufTage;
  const bericht = berichtBilden(data, project, auswahl);
  const bloecke: Record<RunStatus, Zelle[][]> = { laufend: [], abgeschlossen: [], abgebrochen: [] };

  for (const gruppe of bericht.gruppen) {
    for (const zeile of gruppe.zeilen) {
      if (zeile.art === 'klammer') continue;
      const run = zeile.art === 'lauf' ? zeile.eintrag.run : zeile.verzeichnisLauf;
      const doc = zeile.art === 'lauf' ? zeile.eintrag.doc : zeile.plan;
      const grund: Stil = EXCEL[run.status];
      const zelle = (wert: string | null | undefined, stil: Stil = grund, datum = false): Zelle => ({ wert, stil, datum });

      let stand = '';
      let datum: string | null = null;
      let naechster = '';
      let frist = zelle('');
      if (zeile.art === 'mitlaufend') {
        const verzeichnis = verzeichnisVon(data, zeile);
        stand = `läuft im Planlauf von ${verzeichnis?.nummer || verzeichnis?.titel || 'Planverzeichnis'} mit`;
      } else if (run.status === 'abgebrochen') {
        stand = RUN_STATUS_LABEL.abgebrochen;
        datum = run.abbruchDatum;
        naechster = abbruchHinweis(run, doc?.kind ?? 'plan');
      } else {
        const fertig = letzterAbgeschlossenerSchritt(run);
        stand = fertig?.name ?? '';
        datum = fertig?.istDatum ?? null;
        const step = zeile.eintrag.step;
        if (run.status === 'laufend' && step) {
          const ampel = ampelFuerSchritt(step, vorlauf);
          naechster = step.name;
          frist = zelle(step.sollDatum, ampel === 'ueberfaellig' ? EXCEL.ueberfaellig : ampel === 'faellig' ? EXCEL.faellig : grund, true);
        }
      }
      // Ein abgebrochener Lauf trägt seinen eigenen Index
      const index = zeile.art === 'lauf' && run.status === 'abgebrochen' ? run.index : (doc?.index ?? '');

      bloecke[run.status].push([
        zelle(paketDerZeile(data, zeile)?.titel ?? 'ohne Planpaket'),
        zelle(doc?.nummer),
        zelle(index),
        zelle(doc?.titel ?? run.name),
        zelle(doc?.gewerk),
        zelle(stand),
        zelle(datum, grund, true),
        zelle(naechster),
        frist,
      ]);
    }
  }

  const letzte = String.fromCharCode(64 + KURZ_KOPF.length);
  const zeilen: Zelle[][] = [
    [{ wert: `Projekt: ${project.name}`, stil: EXCEL.titel }],
    [{ wert: `Stand: ${formatDate(today())}`, stil: EXCEL.stand }],
    [],
    KURZ_KOPF.map((titel) => ({ wert: titel, stil: EXCEL.kopf })),
    ...bloecke.laufend,
  ];
  const zusammenfassen = [`A1:${letzte}1`, `A2:${letzte}2`];
  /** Gesonderter Abschnitt mit Überschrift über die ganze Breite. */
  const abschnitt = (status: 'abgeschlossen' | 'abgebrochen', stil: Stil) => {
    const inhalt = bloecke[status];
    if (inhalt.length === 0) return;
    zeilen.push(KURZ_KOPF.map((_, i) => ({ wert: i === 0 ? `${RUN_STATUS_LABEL[status]} (${inhalt.length})` : '', stil })));
    zusammenfassen.push(`A${zeilen.length}:${letzte}${zeilen.length}`);
    zeilen.push(...inhalt);
  };
  abschnitt('abgeschlossen', EXCEL.gruppeAbgeschlossen);
  abschnitt('abgebrochen', EXCEL.gruppeAbgebrochen);

  return {
    name: UMFANG_LABEL.kurz,
    zeilen,
    kopfzeileFett: false,
    spaltenbreiten: [28, 28, 14, 44, 10, 36, 12, 36, 12],
    zusammenfassen,
    fixierteZeilen: 4,
    querformat: true,
  };
}

/** Planpaket einer Zeile – bei Plänen eines Verzeichnisses das Paket des Verzeichnisses. */
function paketDerZeile(data: AppData, zeile: BerichtZeile): PlanDocument | undefined {
  const doc = zeile.art === 'lauf' ? zeile.eintrag.doc : zeile.art === 'mitlaufend' ? zeile.plan : zeile.verzeichnis;
  if (!doc) return undefined;
  const eltern = doc.kind === 'plan' && doc.parentId ? data.documents.find((d) => d.id === doc.parentId) : undefined;
  const paketId = eltern ? eltern.paketId : doc.paketId;
  return data.documents.find((d) => d.id === paketId && d.kind === 'paket');
}

const LANG_KOPF = [
  'Planpaket',
  'Planverzeichnis',
  'Art',
  'Plancodierung / Codierung',
  'Index / Ausgabe',
  'Titel',
  'Gewerk',
  'Planlauf',
  'Nr.',
  'Prozessschritt',
  'Schrittart',
  'Status',
  'Verantwortlich',
  'Person',
  'Frist (Tage)',
  'Soll',
  'Ist',
  'Nachweis',
  'Bemerkung',
];

/** Langfassung als Tabelle: je Prozessschritt eine Zeile, gegliedert wie die Übersicht. */
export function langZeilen(data: AppData, project: Project, auswahl?: Set<ID>): Zelle[][] {
  const vorlauf = project.settings.erinnerungVorlaufTage;
  const bericht = berichtBilden(data, project, auswahl);
  const ausgabe: Zelle[][] = [LANG_KOPF];
  for (const gruppe of bericht.gruppen) {
    for (const zeile of gruppe.zeilen) {
      if (zeile.art === 'klammer') continue;
      const w = zeilenWerte(data, project, zeile);
      const verzeichnis = verzeichnisVon(data, zeile);
      const paket = gruppe.art === 'paket' ? gruppe.paket : paketDerZeile(data, zeile);
      const vorne: Zelle[] = [
        paket ? paket.titel : '',
        verzeichnis ? verzeichnis.nummer || verzeichnis.titel : '',
        DOCUMENT_KIND_LABEL[w.art],
        w.nummer,
        w.index,
        w.titel,
        w.gewerk,
      ];
      if (zeile.art === 'mitlaufend') {
        ausgabe.push([...vorne, zeile.verzeichnisLauf.name, '', 'läuft im Planlauf des Verzeichnisses mit', '', 'läuft mit', '', '', '', '', '', '', '']);
        continue;
      }
      const run = zeile.eintrag.run;
      pfad(run.steps).forEach((step, i) => {
        const antwort = step.antworten.find((a) => a.id === step.gewaehlteAntwortId);
        ausgabe.push([
          ...vorne,
          run.name,
          i + 1,
          step.name,
          STEP_TYPE_LABEL[step.typ],
          schrittStatus(step, vorlauf),
          step.roleName,
          personText(data, step),
          step.fristTage,
          step.sollDatum ? formatDate(step.sollDatum) : '',
          step.istDatum ? formatDate(step.istDatum) : '',
          step.nachweisNummer ? `${NACHWEIS_LABEL[step.nachweis]} ${step.nachweisNummer}` : '',
          [antwort ? `Antwort: ${antwort.text}` : '', step.bemerkung].filter(Boolean).join(' · '),
        ]);
      });
      if (run.status === 'abgebrochen') {
        ausgabe.push([...vorne, run.name, '', 'Planlauf abgebrochen', '', RUN_STATUS_LABEL.abgebrochen, '', '', '', run.abbruchDatum ? formatDate(run.abbruchDatum) : '', '', '', run.abbruchGrund ?? '']);
      }
    }
  }
  return ausgabe;
}

function schrittStatus(step: RunStep, vorlauf: number): string {
  return step.status === 'erledigt' || step.status === 'uebersprungen'
    ? STEP_STATUS_LABEL[step.status]
    : AMPEL_LABEL[ampelFuerSchritt(step, vorlauf)];
}

/* ------------------------------- PDF ------------------------------ */

/**
 * Gestaltung der PDF-Fassung. Die Kurzfassung gibt die Tabelle der Übersicht
 * wieder – gleiche Spalten, Gruppenzeilen, Farben, Badges und Fortschrittsbalken.
 */
export const EXPORT_STIL = `
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-size: 9pt; letter-spacing: -0.01em; }
  table.liste { font-size: 9pt; }
  table.liste th { font-size: 7.5pt; font-weight: 600; color: #8e8e93; letter-spacing: .03em;
    border-bottom: 1px solid rgba(0,0,0,.12); padding: 2mm 2.5mm; white-space: nowrap; }
  table.liste td { padding: 2mm 2.5mm; border-bottom: 1px solid rgba(0,0,0,.08); vertical-align: middle; }
  .zelle { display: flex; align-items: center; gap: 2.2mm; }
  .symbol { color: #8e8e93; display: flex; flex: none; }
  .nr { font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace; font-size: 8pt; color: #6e6e73; white-space: nowrap; }
  .titel { font-weight: 600; }
  .klein { font-size: 8.5pt; }
  .grau { color: #8e8e93; }
  .mittel { color: #6e6e73; }
  tr.paket td { background: #f2f2f7; border-top: 1px solid rgba(0,0,0,.08); }
  tr.unter td { background: rgba(0,0,0,.015); }
  tr.eingang .titel { color: #8a6100; }
  tr.fertig .titel { color: #1f7a37; }
  tr.verworfen td { color: #8e8e93; }
  tr.verworfen .titel { font-weight: 500; color: #8e8e93; }
  .badge { display: inline-block; padding: .4mm 2.4mm; border-radius: 99px; font-size: 8pt; font-weight: 500;
    white-space: nowrap; background: rgba(120,120,128,.12); color: #6e6e73; }
  .badge.green { background: rgba(52,199,89,.14); color: #248a3d; }
  .badge.orange { background: rgba(255,149,0,.16); color: #b26a00; }
  .badge.red { background: rgba(255,59,48,.12); color: #c9261c; }
  .badge.blue { background: rgba(36,69,110,.12); color: #24456e; }
  .badge.gelb { background: rgba(255,204,0,.3); color: #8a6100; }
  .fortschritt { display: flex; align-items: center; gap: 2mm; }
  .balken { width: 16mm; height: 1.3mm; border-radius: 1mm; background: rgba(120,120,128,.16); overflow: hidden; }
  .balken > div { height: 100%; background: #24456e; }
  h2.gruppe { display: flex; align-items: center; gap: 2mm; font-size: 11pt; margin: 6mm 0 2mm; }
  h3 { font-size: 10pt; margin: 4mm 0 1.5mm; page-break-after: avoid; }
  h3.unter { margin-left: 6mm; font-size: 9.5pt; }
  .block-unter { margin-left: 6mm; }
`;

/** Einzug der ersten Spalte – wie in der Übersicht rücken Einträge unter Gruppenzeilen ein. */
const AUSRICHTUNG = (ebene: number, eingerueckt: boolean) => `padding-left:${(eingerueckt ? 6 : 2.5) + ebene * 6}mm`;

function badge(status: { text: string; ton: StatusTon } | null): string {
  return status ? `<span class="badge ${status.ton}">${html(status.text)}</span>` : '';
}

function balken(pct: number | null): string {
  if (pct === null) return '';
  return `<span class="fortschritt"><span class="balken"><div style="width:${pct}%"></div></span><span class="klein grau">${pct}%</span></span>`;
}

/** Erste Spalte: Symbol, Nummer und Titel – mitlaufende Pläne wie in der Liste nicht fett. */
function bezeichnung(w: ZeilenWerte, fett = true): string {
  const nr = [w.nummer, w.indexText].filter(Boolean).join(' · ');
  return `<span class="zelle"><span class="symbol">${iconSvg(w.art, 13)}</span><span>${
    nr ? `<span class="nr">${html(nr)}</span>` : ''
  }<div><span class="${fett ? 'titel' : 'klein'}">${html(w.titel)}</span>${w.zusatz ? `<span class="klein grau"> · ${html(w.zusatz)}</span>` : ''}</div></span></span>`;
}

/** Kurzfassung als HTML-Tabelle – wie die Tabelle im Reiter „Planläufe“. */
function kurzHtml(data: AppData, project: Project, bericht: Bericht): string {
  const kopf = `<thead><tr><th>Plan / Planverzeichnis</th><th>Gewerk</th><th>Aktueller Stand</th>
    <th>Nächster Schritt</th><th>Zuständig</th><th>Fortschritt</th><th>Status</th></tr></thead>`;
  const zeilen = bericht.gruppen
    .map((gruppe) => {
      const imPaket = bericht.mitPaketen;
      let kopfzeile = '';
      if (gruppe.art === 'paket' && gruppe.paket) {
        const p = gruppe.paket;
        kopfzeile = `<tr class="paket"><td><span class="zelle"><span class="symbol">${iconSvg('paket', 13)}</span><span>${
          p.nummer ? `<span class="nr">${html(p.nummer)}</span>` : ''
        }<div><span class="titel">${html(p.titel)}</span></div></span></span></td>
          <td class="klein mittel">${html(p.gewerk || '–')}</td>
          <td class="klein grau" colspan="3">Planpaket · ${gruppe.laeufe} ${gruppe.laeufe === 1 ? 'laufender Eintrag' : 'laufende Einträge'}</td>
          <td>${balken(gruppe.stand?.pct ?? 0)}</td>
          <td>${gruppe.stand ? badge(standAnzeige(gruppe.stand)) : ''}</td></tr>`;
      } else if (gruppe.art === 'ohne-paket' && bericht.mitPaketen) {
        kopfzeile = `<tr class="paket"><td colspan="7" class="klein mittel">Ohne Planpaket · ${gruppe.laeufe} ${gruppe.laeufe === 1 ? 'Eintrag' : 'Einträge'}</td></tr>`;
      } else if (gruppe.art === 'abgebrochen') {
        kopfzeile = `<tr class="paket"><td colspan="7" class="klein mittel">Abgebrochen · ${gruppe.laeufe} ${gruppe.laeufe === 1 ? 'Planlauf' : 'Planläufe'}</td></tr>`;
      }
      const inhalt = gruppe.zeilen
        .map((zeile) => {
          const w = zeilenWerte(data, project, zeile);
          const klassen = [zeile.ebene > 0 && zeile.art === 'mitlaufend' ? 'unter' : '', w.farbe].filter(Boolean).join(' ');
          const erste = `<td style="${AUSRICHTUNG(zeile.ebene, imPaket)}">${bezeichnung(w, zeile.art !== 'mitlaufend')}</td>`;
          const gewerk = `<td class="klein mittel">${html(w.gewerk || '–')}</td>`;
          if (zeile.art === 'mitlaufend') {
            return `<tr class="${klassen}">${erste}${gewerk}<td class="klein grau" colspan="3">${html(w.hinweis)}</td><td></td><td></td></tr>`;
          }
          if (zeile.art === 'klammer') {
            return `<tr class="${klassen}">${erste}${gewerk}<td class="klein grau" colspan="3">${html(w.hinweis)}</td><td>${balken(w.pct ?? 0)}</td><td>${badge(w.status)}</td></tr>`;
          }
          if (w.abbruch) {
            return `<tr class="${klassen}">${erste}${gewerk}<td class="klein grau" colspan="4"><div>${html(w.abbruch.wann)}</div><span class="klein">${html(w.abbruch.wie)}</span></td><td>${badge(w.status)}</td></tr>`;
          }
          const zweizeilig = (oben: string, unten: string) =>
            `<td class="klein"><div>${html(oben)}</div><span class="klein grau">${html(unten)}</span></td>`;
          return `<tr class="${klassen}">${erste}${gewerk}${
            w.stand ? zweizeilig(w.stand.name, w.stand.datum || 'ohne Datum') : '<td class="klein grau">–</td>'
          }${w.naechster ? zweizeilig(w.naechster.name, w.naechster.frist) : '<td class="klein grau">–</td>'}${
            w.zustaendig ? zweizeilig(w.zustaendig.funktion || '–', w.zustaendig.person || 'keine Person') : '<td class="klein grau">–</td>'
          }<td>${balken(w.pct)}</td><td>${badge(w.status)}</td></tr>`;
        })
        .join('');
      return kopfzeile + inhalt;
    })
    .join('');
  return `<table class="liste">${kopf}<tbody>${zeilen}</tbody></table>`;
}

/** Langfassung als HTML: je Planlauf ein Abschnitt mit allen Schritten, gegliedert wie die Übersicht. */
function langHtml(data: AppData, project: Project, bericht: Bericht): string {
  const vorlauf = project.settings.erinnerungVorlaufTage;
  return bericht.gruppen
    .map((gruppe) => {
      const ueberschrift =
        gruppe.art === 'ohne-paket' && !bericht.mitPaketen
          ? ''
          : `<h2 class="gruppe">${gruppe.art === 'paket' ? `<span class="symbol">${iconSvg('paket', 14)}</span>` : ''}${html(
              gruppenTitel(gruppe),
            )}${gruppe.art === 'paket' && gruppe.paket?.nummer ? ` <span class="nr">${html(gruppe.paket.nummer)}</span>` : ''}</h2>`;
      const abschnitte = gruppe.zeilen
        .map((zeile) => {
          const w = zeilenWerte(data, project, zeile);
          const titel = `${html(DOCUMENT_KIND_LABEL[w.art])} ${html(w.nummer)} – ${html(w.titel)}${
            w.indexText ? ` (${html(w.indexText)})` : ''
          }`;
          const unter = zeile.ebene > 0 ? ' class="unter"' : '';
          if (zeile.art === 'klammer') {
            return `<h3>${titel} · Pläne einzeln</h3><div class="meta grau">${html(w.hinweis)} · Fortschritt ${w.pct ?? 0} %${
              w.status ? ` · ${html(w.status.text)}` : ''
            }</div>`;
          }
          if (zeile.art === 'mitlaufend') return '';
          const { run } = zeile.eintrag;
          const mitlaufend = gruppe.zeilen.filter(
            (z): z is Extract<BerichtZeile, { art: 'mitlaufend' }> =>
              z.art === 'mitlaufend' && z.verzeichnisLauf.id === run.id,
          );
          const meta = `<div class="meta grau${zeile.ebene > 0 ? ' block-unter' : ''}">Gewerk: ${html(w.gewerk || '–')} ·
            Planlauf „${html(run.name)}“ (${html(RUN_STATUS_LABEL[run.status])}${w.pct !== null ? `, ${w.pct} %` : ''}) ·
            Aktueller Stand: ${w.stand ? `${html(w.stand.name)}${w.stand.datum ? ` (${w.stand.datum})` : ''}` : '–'} ·
            Nächster Schritt: ${w.naechster ? `${html(w.naechster.name)}${w.naechster.soll ? ` (Soll ${w.naechster.soll})` : ''}` : '–'}${
              mitlaufend.length > 0
                ? `<br>Pläne in diesem Planlauf: ${mitlaufend.map((m) => html(`${m.plan.nummer} ${m.plan.titel}`.trim())).join(', ')}`
                : ''
            }</div>`;
          const schritte = pfad(run.steps)
            .map((step, i) => {
              const ampel = ampelFuerSchritt(step, vorlauf);
              const erledigt = step.status === 'erledigt' || step.status === 'uebersprungen';
              const antwort = step.antworten.find((a) => a.id === step.gewaehlteAntwortId);
              return `<tr>
                <td class="num">${i + 1}</td>
                <td>${html(step.name)}${antwort ? ` <span class="grau">→ ${html(antwort.text)}</span>` : ''}</td>
                <td class="${erledigt ? 'erledigt' : ampel === 'ueberfaellig' ? 'ueberfaellig' : ''}">${html(schrittStatus(step, vorlauf))}</td>
                <td>${html(step.roleName)}</td>
                <td>${html(personText(data, step))}</td>
                <td class="num">${step.fristTage}</td>
                <td class="num">${step.sollDatum ? formatDate(step.sollDatum) : '–'}</td>
                <td class="num">${step.istDatum ? formatDate(step.istDatum) : '–'}</td>
                <td>${step.nachweisNummer ? `${html(NACHWEIS_LABEL[step.nachweis])} ${html(step.nachweisNummer)}` : '–'}</td>
                <td class="grau">${html(step.bemerkung)}</td>
              </tr>`;
            })
            .join('');
          const abbruch =
            run.status === 'abgebrochen'
              ? `<p class="meta ueberfaellig">Planlauf abgebrochen am ${run.abbruchDatum ? formatDate(run.abbruchDatum) : '–'}: ${html(run.abbruchGrund ?? '')}</p>`
              : '';
          return `<h3${unter}>${titel}</h3>${meta}<table${zeile.ebene > 0 ? ' class="block-unter"' : ''}><thead><tr>
            <th>Nr.</th><th>Prozessschritt</th><th>Status</th><th>Verantwortlich</th><th>Person</th>
            <th>Frist</th><th>Soll</th><th>Ist</th><th>Nachweis</th><th>Bemerkung</th>
          </tr></thead><tbody>${schritte}</tbody></table>${abbruch}`;
        })
        .join('');
      return ueberschrift + abschnitte;
    })
    .join('');
}

/** PDF-Fassung (HTML für den Druckdialog). */
export function exportHtml(data: AppData, project: Project, auswahl: Set<ID> | undefined, umfang: ExportUmfang): string {
  const bericht = berichtBilden(data, project, auswahl);
  const anzahl = bericht.gruppen.reduce((summe, g) => summe + g.laeufe, 0);
  const kopf = `<div class="kopf">
    <h1>${html(project.nummer)} · ${html(project.name)}</h1>
    <div class="meta">Planläufe – ${UMFANG_LABEL[umfang]} · Stand: ${formatDate(today())} · ${anzahl} ${
      anzahl === 1 ? 'Planlauf' : 'Planläufe'
    }</div>
  </div>`;
  const fuss = `<p class="fuss">Erzeugt mit KaPlan am ${formatDate(today())}. Soll-Termine ergeben sich aus den hinterlegten Fristen${
    project.settings.fristenInArbeitstagen ? ' (Arbeitstage)' : ''
  }.</p>`;
  return `${kopf}${umfang === 'kurz' ? kurzHtml(data, project, bericht) : langHtml(data, project, bericht)}${fuss}`;
}

/** Dateiname ohne Erweiterung. */
export function exportDateiname(project: Project, umfang: ExportUmfang): string {
  const sauber = `${project.nummer}-${project.name}`.replace(/[^\wäöüÄÖÜß -]/g, '').trim().replace(/\s+/g, '-');
  return `Planlauf-${UMFANG_LABEL[umfang]}-${sauber}-${today()}`;
}

