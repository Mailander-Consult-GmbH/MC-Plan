/**
 * Mitgelieferte Vorlagen des Pflichtenhefts je Geschäftsbereich – Texte aus
 * den Muster-Pflichtenheften (Personenbahnhöfe: Hp Herbolzheim, Fahrweg:
 * Hochrheinbahn). Projektdaten stehen als Platzhalter darin (siehe
 * `PFLICHTENHEFT_PLATZHALTER` in pflichtenheft.ts). Jedes neue
 * Pflichtenheft entsteht aus der Vorlage seines Geschäftsbereichs
 * (`standardVorlage`); eigene Vorlagen gibt es nicht.
 */
import { standardPlancodierung } from './plancodierung';
import { ROLLE_BVB, ROLLE_PL, ROLLE_PRST, ROLLE_PSV } from './seed';
import type { GeschaeftsbereichId, ID, PflichtenheftAbschnitt, PflichtenheftVorlage } from './types';

type AbschnittRoh = Omit<PflichtenheftAbschnitt, 'id' | 'text' | 'funktionen' | 'kontaktIds'> &
  Partial<Pick<PflichtenheftAbschnitt, 'text' | 'funktionen' | 'kontaktIds'>>;

/** Personenbahnhöfe – nach dem Pflichtenheft Hp Herbolzheim (Jagst). */
const PERSONENBAHNHOEFE: AbschnittRoh[] = [
  {
    art: 'text',
    ebene: 1,
    titel: 'Einleitung',
    text: `Dieses Pflichtenheft gilt für das Projekt

**{{gNummer}} {{projektname}}**

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

Trassendaten zur Bestimmung der verbindlichen Kilometrierung, das zugrunde zu legende Lage- und Höhensystem, sowie Festpunkte sind über das Portal IPID zu beziehen beim Datenmanagement {{region}} der {{auftraggeber}}.`,
  },
  { art: 'anlagen', ebene: 1, titel: 'Anlagenverzeichnis' },
];


/** Fahrweg – nach dem Pflichtenheft Ausbau und Elektrifizierung der Hochrheinbahn (Planläufe mit Eplass). */
const FAHRWEG: AbschnittRoh[] = [
  {
    art: 'text',
    ebene: 1,
    titel: 'Einleitung',
    text: `Dieses Pflichtenheft gilt für das Projekt

**{{gNummer}} {{projektname}}**

der {{auftraggeber}}.

Es regelt die Planläufe dieses Projekts, sowie den dafür erforderlichen Datenaustausch und trifft formale Festlegungen bezüglich der Projektbezeichnungen, der Plancodierung, der Datenformate, der Schriftfelder, etc.

Die Vorgaben dieses Pflichtenheftes sind von allen beteiligten Projektverantwortlichen und deren Mitarbeitern einzuhalten.

Mailänder Consult (MC) ist von der {{auftraggeber}} mit dem Planlaufmanagement (PLM) beauftragt und überwacht damit die terminliche und formale Einhaltung der Vorgaben dieses Pflichtenheftes durch die Projektbeteiligten.`,
  },
  {
    art: 'text',
    ebene: 1,
    titel: 'Abwicklung der Planläufe mit Eplass',
    text: `Die Projektleitung der {{auftraggeber}} hat entschieden, die Planläufe der HOAI-Leistungsphase 5 ({{planungsphase}}) digital mit der internetbasierten Projektplattform System Eplass durchzuführen. Hierbei erfolgen alle Prüfläufe, Freigaben und Genehmigungen der einzelnen Fachgewerke in digitaler Form innerhalb des Systems Eplass durch die jeweils freigeschalteten Benutzer (Planprüfer, Fachprüfer, Bauvorlageberechtigte, Projektleitung je nach Workflow).

Erforderliche Unterschriften erfolgen mit fortgeschrittener elektronischer Signatur gemäß Signaturgesetz (Verordnung (EU) Nr. 910/2014).

Das Planlaufmanagement MC steuert und überwacht die Planläufe (siehe Kapitel 8 und Anlage {{anlagePlanlaeufe}}) in formaler und terminlicher Hinsicht zusätzlich in einer gesonderten Planverfolgungsliste (PVL), um den jeweils Beteiligten im Gesamtprozess des Planlaufmanagements bedarfs- und termingerecht eine Orientierungshilfe und klare Gesamtübersicht beizustellen. Diese PVL ist im Regelfall das zentrale Dokument der Planungsbesprechungen.

Verteilungen und Übergaben von Plänen erfolgen innerhalb des Eplass-Systems digital über eine interne und E-Mail-basierte Mitteilung an die Workflow-Teilnehmer.

Die Erstellung von genehmigten Papier-Planunterlagen kann hierbei zusätzlich in Abstimmung mit den einzelnen Gewerken erfolgen (z. B. Abnahmeprüfpläne STE).

Das Änderungsmanagement (wie Fehlerbereinigungen, Anpassungen, Änderungsmitteilungen STE, Ablehnung durch Planprüfer etc.) erfolgt ebenfalls automatisiert im System Eplass. Planunterlagen werden mit Hilfe der Plancodierung im Falle eines erneut erforderlichen Uploads eindeutig durch einen fortlaufenden Index gekennzeichnet. Der Workflow beginnt in diesem Falle erneut.

Der vollständige Workflow aller Gewerke ist in den Anlagen {{anlagePlanlaeufe}} ff. dargestellt.`,
  },
  {
    art: 'text',
    ebene: 1,
    titel: 'Plancodierung und Dateibenennung',
    text: `Zur Gewährleistung einer korrekten und automatisierten Gewerke- und Infrastrukturzuordnung der Planunterlagen in das Eplass-System und den Upload der Daten in die zugehörige Projektgliederung ist zwingend eine vorabgestimmte Plancodierung zu verwenden. Die Pläne sind somit jederzeit mit einem eindeutigen Dateinamen gekennzeichnet.

Alle erfassten Dokumente müssen eine eindeutige Plancodierung erhalten. Über die Plancodierung ist jedem Dokument eine unverwechselbare Codierung und ein damit identischer Dateiname zugeordnet. Als Dateiname ist ausschließlich die Plancodierung entsprechend der Anlage {{anlagePlancodierung}} mit der Namenserweiterung .pdf zu verwenden, die auch im Schriftfeld der Unterlage einzutragen ist. Dies gilt sowohl für Pläne als auch für Planverzeichnisse, Listen, statische Berechnungen, Erläuterungsberichte etc.`,
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
  { art: 'ansprechpartner', ebene: 2, titel: 'EG-Prüfung', funktionen: ['Benannte Stelle', 'Bestimmte Stelle'] },
  { art: 'ansprechpartner', ebene: 2, titel: 'Bauvorlageberechtigte (BVB)', funktionen: [ROLLE_BVB] },
  {
    art: 'ansprechpartner',
    ebene: 2,
    titel: 'Planprüfer / Prüfingenieure',
    funktionen: [ROLLE_PSV, 'Geotechnischer Prüfer', 'Schweißtechnischer Prüfer', 'Vermessungsprüfer', ROLLE_PRST],
  },
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
    text: `Die Planer benennen gegenüber dem Planlaufmanagement MC einen verantwortlichen Ansprechpartner (Planungskoordinator AN) zur Abstimmung aller den Planlauf betreffenden Belange.

Dieser Planungskoordinator unterschreibt im Schriftfeld jedes Planes bereits auf dem ersten zur Prüfung vorgelegten Exemplar und bestätigt am Ende des Planlaufs durch seine Unterschrift die ordnungsgemäße Gleichstellung der Pläne.

Den eingereichten Ausführungsunterlagen ist grundsätzlich der Prüfbericht der internen Qualitätsprüfung beizufügen, dies ist Voraussetzung für die Prüfbarkeit von Unterlagen.

Die Planungskoordinatoren vertreten gegenüber dem Planlaufmanagement MC auch ihre sämtlichen Nachunternehmer.

Zur vorausschauenden Steuerung erhält das Planlaufmanagement MC vom Planungskoordinator AN eine Planlieferliste, aus der die Planliefertermine des Planers und die Zusammensetzung der einzelnen Planpakete hervorgehen.

Die aktuelle Planlieferliste ist durch den Planungskoordinator des AN zum Beginn jedes Monats unaufgefordert dem Planlaufmanagement MC zu übermitteln.`,
  },
  {
    art: 'text',
    ebene: 1,
    titel: 'Planläufe',
    text: `Die verbindlich festgelegten Planläufe sind in Anlage {{anlagePlanlaeufe}} dargestellt. Die Ablaufschemen geben Auskunft über die Anzahl der benötigten Fertigungen, den Adressaten der jeweils erforderlichen Weiterleitung, die für jeden Schritt maximal verfügbare Zeit, erforderliche E-Mail-Benachrichtigungen etc. Zwingend erforderliche Änderungen sind nur in Abstimmung mit dem Planlaufmanagement MC möglich.`,
  },
  {
    art: 'text',
    ebene: 1,
    titel: 'Digitale Plandaten',
    text: `Der Austausch digitaler Pläne und Dokumente im Rahmen des Planlaufmanagements erfolgt grundsätzlich im PDF-Format. Die PDF-Dateien sind mit einer Auflösung von 300 dpi zu erstellen. Zur Benennung der Dateien siehe Kapitel 3.

Digitale Planprüfungen erfolgen ausschließlich auf der Grundlage von PDF-Dateien. Ein eventueller Austausch von bearbeitbaren Daten (DWG, DGN etc.) erfolgt gegebenenfalls in selbständiger Abstimmung zwischen den Planern.`,
  },
  {
    art: 'text',
    ebene: 1,
    titel: 'Schriftfeld',
    text: `Alle Pläne sind abhängig vom Gewerk mit den im Regelwerk der DB aktuell vorgeschriebenen Schriftfeldern zu versehen. Im Schriftfeld anzugeben sind unter anderem:

**{{strecken}}**`,
  },
  {
    art: 'text',
    ebene: 1,
    titel: 'Streckennummern, Kilometrierung, Lage- und Höhenbezug',
    text: `Folgende Strecken sind von den Planungen im Projekt betroffen:

{{strecken}}

Trassendaten zur Bestimmung der verbindlichen Kilometrierung, das zugrunde zu legende Lage- und Höhensystem, sowie Festpunkte sind vom Planer über das System IPID zu beziehen bei der {{auftraggeber}}, Datenmanagement {{region}}.`,
  },
  { art: 'anlagen', ebene: 1, titel: 'Anlagenverzeichnis' },
];

const VORLAGE_WORKFLOW_HINWEIS = `Der Planlaufbeginn ist vom Planungsverantwortlichen des AN so einzutakten, dass die genehmigten Pläne spätestens 6 Wochen vor Baubeginn beim EBA vorliegen.

Hinweis: Der dargestellte Zeitbedarf berücksichtigt nicht die Planungszeiten des Ausführungsplaners. Außerplanmäßige Korrekturläufe sind im Zeitbedarf nicht berücksichtigt.

Die Weitergabe der digitalen Unterlagen erfolgt per E-Mail oder über die Datenaustauschplattform der Mailänder Consult GmbH.`;

/** Bezeichnungen der mitgelieferten Gewerke (die des Funktionskatalogs) in den Ansprechpartnern. */
const VORLAGE_GEWERKNAMEN: Record<string, string> = {
  EEA: 'EEA 50 Hz',
  KIB: 'Konstruktiver Ingenieurbau',
  LST: 'Leit- und Sicherungstechnik',
  OB: 'Oberbau',
  OLA: 'Oberleitungsanlagen',
  PT1: 'Leit- und Sicherungstechnik PT1',
  PT2: 'Leit- und Sicherungstechnik PT2',
  TK: 'Telekommunikation',
  VA: 'Verkehrsanlagen',
};


/**
 * Text unter dem Titel des Deckblatts je Geschäftsbereich. Die Station steht
 * dort nicht eigens – sie ist in der Regel Teil des Projektnamens.
 */
const DECKBLATT: Record<GeschaeftsbereichId, string> = {
  personenbahnhoefe: `Projekt {{gNummer}}

**{{projektname}}**`,
  fahrweg: `Projektnummer {{gNummer}}

**{{projektname}}**

{{streckenabschnitte}}`,
};

const ABSCHNITTE: Record<GeschaeftsbereichId, AbschnittRoh[]> = { personenbahnhoefe: PERSONENBAHNHOEFE, fahrweg: FAHRWEG };

/**
 * Die mitgelieferte Vorlage eines Geschäftsbereichs (ohne die gespeicherte des
 * Bestands); `projektKuerzel` ist das Beispiel der Kategorie „Projekt“ der
 * Plancodierung.
 */
export function standardVorlage(
  gb: GeschaeftsbereichId,
  neueId: (prefix: string) => ID,
  projektKuerzel = '',
): PflichtenheftVorlage {
  return {
    titel: 'Pflichtenheft Planlauf {{planungsphase}}',
    deckblatt: DECKBLATT[gb],
    abschnitte: ABSCHNITTE[gb].map((a) => ({ id: neueId('phab'), text: '', funktionen: [], kontaktIds: [], ...a })),
    gewerkNamen: { ...VORLAGE_GEWERKNAMEN },
    workflowHinweis: VORLAGE_WORKFLOW_HINWEIS,
    plancodierung: standardPlancodierung(neueId, projektKuerzel),
  };
}
