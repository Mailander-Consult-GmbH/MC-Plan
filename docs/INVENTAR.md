# Inventar der Anwendung

Stand: Analyse des Quellcodes im Repository `Mailander-Consult-GmbH/MC-Plan`
(Zweig `main`). Es sind ausschließlich Sachverhalte
aufgeführt, die sich im Code belegen lassen; Dateipfade verweisen auf die
jeweilige Fundstelle.

## 1. Zweck der Anwendung

**KaPlan** besteht aus den Bereichen **Planlaufmanagement**,
**Baubetriebsplanung** und **Projektsteuerung**; die beiden letzten liegen als
erster Entwurf vor. Die Abschnitte 1 bis 6 beschreiben das
Planlaufmanagement, Abschnitt 7 die Baubetriebsplanung, Abschnitt 8 die
Projektsteuerung.

Der Bereich verwaltet die Planläufe von Bauprojekten: Zu
jedem Plan bzw. Planverzeichnis wird ein Workflow (Prozesskette) gestartet,
dessen Schritte Soll-Termine, eine zuständige Funktion und eine Person tragen
(`src/bereiche/planlauf/domain/engine.ts`, `src/bereiche/planlauf/domain/types.ts`).
Ein Planverzeichnis durchläuft den Planlauf entweder **gebündelt** – das
Verzeichnis hat den Lauf, seine Pläne laufen mit – oder mit **Plänen einzeln**,
dann hat jeder Plan einen eigenen Lauf und das Verzeichnis ordnet nur
(`planlaufModus`; ohne Angabe gilt gebündelt). Einzelne Pläne eines
gebündelten Verzeichnisses lassen sich nachträglich herauslösen
(`eigenerLauf`), Pläne mit eigenem Lauf wieder bündeln (`planeBuendeln`). Welcher Eintrag einen eigenen Lauf hat, entscheidet allein
`hatEigenenPlanlauf` in `types.ts`. Die Anwendung rechnet aus den
Fristen je Schritt die Soll-Termine, überwacht sie mit einer Ampel (im Plan /
fällig / überfällig) und bereitet Erinnerungen als E-Mail für Outlook vor
(`ampelFuerSchritt`, `src/bereiche/planlauf/components/EmailDialog.tsx`). Sie läuft vollständig im
Browser: Der gesamte Bestand liegt in `localStorage`, ein Server wird nicht
angesprochen (`src/bereiche/planlauf/store/storage.ts`).

## 2. Routen und Seiten

Die Anwendung besteht aus drei getrennten Bereichen. Die erste Wegmarke der
Adresse benennt den Bereich; die Shell (`src/shell/router.ts`) wählt danach
aus, welcher Bereich geladen wird: `#/` zeigt die Bereichsauswahl
(`src/shell/Start.tsx`: drei hochkante Kacheln nebeneinander – Planlaufmanagement,
Baubetriebsplanung und Projektsteuerung, die beiden letzten mit dem Kennzeichen
„Erster Entwurf“ aus `marke` in
`src/shell/bereiche.ts`), `#/planlauf/…` das Planlaufmanagement,
`#/baubetrieb/…` die Baubetriebsplanung (Abschnitt 7), `#/projektsteuerung/…` die
Projektsteuerung (Abschnitt 8). Innerhalb des Bereichs adressiert ein Hash-Router ohne
Bibliothek (`src/bereiche/planlauf/lib/router.ts`); unbekannte Adressen führen
auf die Übersicht. Adressen aus der Fassung ohne Bereiche (`#/dashboard`,
`#/projekt/<id>/<reiter>` …) werden beim Aufruf auf `#/planlauf/…` umgelenkt
und bleiben damit als Lesezeichen gültig.

### 2.1 Hauptrouten

| Route | Seite | Aktionen |
| --- | --- | --- |
| `#/planlauf` bzw. `#/planlauf/dashboard` | Übersicht (`src/bereiche/planlauf/pages/Dashboard.tsx`) | Vier Kacheln: Laufende Planläufe, To-Dos (Planlaufmanagement), Überfällige Schritte, Demnächst fällig – die beiden letzten führen per Klick auf `#/planlauf/fristen`. Tabelle „Meine To-Dos“ mit Schritt, Gewerk, Projekt, Soll-Termin, Status, Erinnerungs-Mail und Erledigt-Haken. Tabelle „Projekte“ mit Anzahl Pläne/Verzeichnisse, laufenden Planläufen, demnächst fällig, überfällig, Fortschrittsbalken und „Projekt öffnen“. Angezeigt werden markierte Projekte; ohne Markierung alle (`sichtbareProjekte`). |
| `#/planlauf/fristen` | Fristen & Erinnerungen (`src/bereiche/planlauf/pages/Fristen.tsx`) | Alle offenen Schritte über alle Projekte, gegliedert nach Projekt. Filter Alle / Überfällig / Fällig / Im Plan mit Zählern, Suche über Schritt, Planlauf, Projekt, Funktion, Nachname und Firma. Je Zeile: Planlauf öffnen, Erinnerungs-Mail vorbereiten, Schritt als erledigt setzen. Kein Eintrag in der Seitenleiste – erreichbar über die Kacheln der Übersicht. |
| `#/planlauf/projekte` | Projekte (`src/bereiche/planlauf/pages/Projekte.tsx`) | Projektliste mit Suche über Name, Nummer und Beschreibung; Projekt anlegen (übernimmt alle projektübergreifenden Funktionen als Projektfunktionen), bearbeiten, mit ★ markieren bzw. Markierung aufheben, Projekt öffnen. |
| `#/planlauf/ketten` | Workflows (`src/bereiche/planlauf/pages/Workflows.tsx`) | Standard-Workflows und projektspezifische Ketten: neue Kette anlegen, Kette bearbeiten, duplizieren (wird zur manuellen Kette), löschen. Je Schritt: Bezeichnung, Art (Aufgabe / Entscheidung / Sonstiges), Verantwortlicher (Vorschlagsliste der Funktionen, je Bezeichnung einmal), Frist in Tagen, Nachweis bei Abschluss, „Weiter mit“, Antworten einer Entscheidung und die Option „E-Mail nach Abschluss“ samt Vorlage. „Weiter mit“ und die Antwortziele nennen die Nummer des Zielschritts im Workflow (`ziele` in `SchrittListe`). |
| `#/planlauf/rollen` | Funktionen (`src/bereiche/planlauf/pages/Funktionen.tsx`) | Projektübergreifende Funktionen, gegliedert in „Übergreifend“ und je Gewerk. Neue Funktion anlegen (Bezeichnung, Kürzel, Farbe, Gewerk, Beschreibung), vorhandene Funktion eines anderen Gewerks übernehmen, bearbeiten, löschen. Über das **+** an den Reitern entsteht ein Gewerk, über „Gewerk … löschen“ am Seitenende entfällt es. |
| `#/planlauf/vorlagen` | Vorlagen (`src/bereiche/planlauf/pages/Vorlagen.tsx`) | Reiter **E-Mail-Texte**: Vorlagen anlegen, bearbeiten, löschen; Editor mit Bausteinen aus `PLATZHALTER` (`src/bereiche/planlauf/domain/email.ts`) und Vorschau mit Beispielwerten; Anlass je Vorlage (Erinnerung, Mahnung, Freigabe, Übergabe, Allgemein). Reiter **Excel-Vorlagen**: Vorlagen „Planliste“ und „Funktion“ als `.xlsx` herunterladen, mit Spaltenerläuterung. |
| `#/planlauf/projekt/<id>/<reiter>` | Projektarbeitsbereich (`src/bereiche/planlauf/pages/ProjektDetail.tsx`) | Reiter siehe 2.2. Frühere Adressen werden umgeleitet: `planlaeufe` → `plaene`, `pakete` → `plaene`, `adressbuch` → `rollen`. |
| `#/planlauf/projekt/<id>/planlauf/<runId>` | Planlauf (`src/bereiche/planlauf/pages/projekt/PlanlaufDetail.tsx`) | Siehe 2.3. |

### 2.2 Reiter im Projekt

| Reiter | Seite | Aktionen |
| --- | --- | --- |
| `uebersicht` | Planläufe – Reiterbezeichnung „Planläufe“ (`src/bereiche/planlauf/pages/projekt/Uebersicht.tsx`, Liste in `src/bereiche/planlauf/components/PlanlaufListe.tsx`) | Kennzahlen (Planpakete, Planverzeichnisse, Pläne – je ein Klick führt auf die Planliste –, fällige und überfällige Schritte) und Gesamtfortschritt. Liste der Planläufe, gegliedert nach Planpaketen, je Eintrag in der Spalte „Aktueller Stand“ mit dem zuletzt erledigten Schritt vor dem offenen – übersprungene Schritte zählen nicht, nach dem Wiederöffnen eines früheren Schritts also nie ein späterer – und darunter in Grau seinem Ist-Datum („ohne Datum“, wenn keines eingetragen ist; `letzterAbgeschlossenerSchritt` in `src/bereiche/planlauf/domain/uebersicht.ts`), in der Spalte „Nächster Schritt“ mit dem offenen Schritt: Gliederung umschalten („Planpakete“ / „+ Pläne & Verzeichnisse“), Pakete und Planverzeichnisse am Pfeil auf- und zuklappen (Verzeichnisse zunächst zugeklappt; der Pfeil steht vor Symbol und Titel, sodass Pläne und Verzeichnisse auf einer Linie beginnen), Suche, Filter in den Spaltenüberschriften (Gewerk, Zuständig, Status – einschließlich „Angekündigt“), Sortierung je Spalte („Aktueller Stand“ nach dem Datum des zuletzt erledigten Schritts), Erinnerungs-Mail, Erledigt-Haken, Planlauf öffnen, „Export“ (`ExportDialog.tsx`, siehe `einstellungen`; bei gesetztem Filter sind die gezeigten Einträge vorgewählt – „Vorgewählt sind die Einträge, die der Filter im Reiter „Planläufe“ zeigt.“). Welche Läufe die Liste zeigt und wie sie sie gliedert, legen `massgeblicheLaeufe`, `gliederungBilden` und `knotenBilden` in `uebersicht.ts` fest – dieselben Funktionen gliedern den Export. Die Bezeichnung steht gelb, solange „Eingang PLM“ aussteht – diese Läufe tragen den Status „Angekündigt“, ist der Eingang überfällig jedoch „Überfällig“; Filter und Sortierung folgen derselben Regel –, und grün, wenn der Lauf abgeschlossen ist. Unter einem gebündelten Verzeichnis stehen seine Pläne mit „läuft im Planlauf des Verzeichnisses mit“ – solange der Verzeichnislauf läuft, mit der Schaltfläche „Herauslösen …“ (`planHerausloesen`; die Liste bleibt danach stehen) –, herausgelöste Pläne dagegen mit ihrem eigenen Schritt und Status. Ein Verzeichnis mit Plänen einzeln erscheint als Zeile „… · Pläne einzeln“ ohne eigenen Lauf, mit der Zahl seiner laufenden Pläne, dem aus ihnen zusammengefassten Fortschritt und Status (wie ein Planpaket) und der Schaltfläche „Bündeln …“; seine Pläne stehen darunter. Abgebrochene Läufe – ersatzlos wie durch neuen Index ersetzt – stehen gesammelt am Ende unter der zunächst zugeklappten Zeile „Abgebrochen · … Planläufe“, ausgegraut ohne Schritt, Fortschritt und Schaltflächen, mit dem Index des abgebrochenen Laufs, „Abgebrochen am …“ und dem Zusatz *ersatzlos* bzw. *ersetzt durch Index …*. Aufgeteilte bzw. wieder gebündelte Läufe erscheinen dort nicht (`laufUeberfuehrt` in `engine.ts`). Fortschrittsbalken stehen immer in der Hausfarbe. |
| `plaene` | Planliste (`src/bereiche/planlauf/pages/projekt/Plaene.tsx`) | Alle Pläne und Planverzeichnisse mit laufender Nummer, Art, Bezeichnung/Titel, Gewerk, zugehörigem Planverzeichnis und Eingang Soll, gegliedert nach Planpaketen: je Paket eine Kopfzeile mit Name, Kurzzeichen, Gewerk und Zahl der angezeigten Einträge samt eingerückter Pläne („noch nichts zugeordnet“ bei leeren Paketen) – der Pfeil klappt sie zu, ein Klick öffnet das Paket –, danach die Einträge ohne Paket, sobald Pakete angezeigt werden unter „Ohne Planpaket · …“ (gleich gezählt). Leere Pakete erscheinen ohne Suche und Filter bzw. wenn Name, Kurzzeichen oder Gewerk zur Suche passen; die Suche erfasst auch den Paketnamen. Die Schaltflächen über der Liste brechen auf schmalen Bildschirmen um. „Neues Planpaket“ und die Kopfzeilen öffnen den Paketdialog (`src/bereiche/planlauf/components/PaketDialog.tsx`): Name, Kurzzeichen, Gewerk, Bemerkung, Löschen mit Rückfrage – die Einträge bleiben mit ihren Planläufen erhalten und verlieren ihre Paketzuordnung (`deleteDocument`) –, beim Bearbeiten außerdem „Inhalt“ (mit dem Hinweis „gilt sofort“) mit „Entfernen“ je Eintrag und „Hinzufügen:“ für Planverzeichnisse und Pläne ohne Verzeichnis und ohne (noch vorhandenes) Paket; Pläne eines Verzeichnisses folgen dessen Paket (`paketVon` in `uebersicht.ts`). Reines Ordnungsmerkmal ohne Einfluss auf Planläufe. Pläne eines Planverzeichnisses stehen unter ihm, mit Symbol, Art und Titel eingerückt; der Pfeil zum Auf- und Zuklappen steht zwischen Nummer und Symbol (zunächst aufgeklappt). Ist das Verzeichnis ausgefiltert, stehen seine Pläne für sich. Filter (Alle / Pläne / Verzeichnisse), Suche, Sortierung je Spalte. Einträge, deren Planlauf noch beim Schritt „Eingang PLM“ steht, tragen eine gelbe Bezeichnung und das Kennzeichen „Angekündigt“; bei abgeschlossenen Läufen steht die Bezeichnung grün. Kennzeichen „Pläne einzeln“ an Verzeichnissen mit Einzelläufen, „eigener Lauf“ an herausgelösten Plänen eines gebündelten Verzeichnisses. Eintrag anlegen (startet zugleich den Planlauf, sofern der Eintrag einen eigenen hat), bearbeiten, löschen – beim Löschen eines gebündelten Verzeichnisses bleiben seine Pläne als Einzelpläne im Paket des Verzeichnisses, mitlaufende führen den Stand des Verzeichnislaufs in einem eigenen Lauf weiter (`deleteDocument` mit `laufUebernehmen`); Planverzeichnis oder Planpaket direkt aus den Auswahlfeldern neu anlegen – ein so angelegtes Planverzeichnis fragt „Codierung“ und „Titel“ ab (ohne Titel gilt die Codierung als Titel); sein Planlauf startet mit „Anlegen und Planlauf starten“ des Plans nach dem Workflow im Dialog, der Hinweis „Das Planverzeichnis „…“ hat noch keinen Planlauf.“ steht darüber (`verzeichnisOhneLauf`; gilt für jedes gebündelte Verzeichnis, das noch nie einen Lauf hatte). Bei „Abbrechen“ oder Wahl eines anderen Verzeichnisses entfällt das angelegte Verzeichnis wieder. Excel-Import (`PlaeneImport.tsx`): jede Zeile erhält ihren eigenen Eintrag; jeder Eintrag mit eigenem Planlauf – auch ohne Codierung, ein beim Import neu angelegtes Verzeichnis und ein vorhandenes gebündeltes Verzeichnis, das noch nie einen Lauf hatte – startet ihn sofort, nach dem Workflow der Spalte „Workflow“, sonst nach dem unter „Workflow für Einträge ohne Angabe“ gewählten (`planlaufAusWorkflow` in `engine.ts`). Pakete und Verzeichnisse werden je Art über Codierung bzw. Kurzzeichen oder Titel gefunden, auch in derselben Datei; ein neu angelegtes Verzeichnis übernimmt das früheste Eingang Soll seiner Pläne. Die Nummer eines Planverzeichnisses heißt „Codierung“ (`NUMMER_LABEL` in `types.ts`). Einträge, deren Lauf durch einen neuen Index ersetzt oder ersatzlos abgebrochen wurde, tragen einen grauen Zusatz; aufgeteilte bzw. wieder gebündelte Läufe zählen nicht als Abbruch. Im Dialog eines Planverzeichnisses: Haken „Pläne einzeln durch den Planlauf führen“ – frei wählbar, solange weder das Verzeichnis noch seine Pläne einen Lauf haben – und bei laufendem gebündeltem Lauf „Alle Pläne einzeln weiterführen …“ (`verzeichnisAufteilen`). Im Dialog eines mitlaufenden Plans: „Aus dem Verzeichnislauf herauslösen …“ (`planHerausloesen`). Haben Pläne des Verzeichnisses einen eigenen Lauf, bietet der Verzeichnis-Dialog „Pläne wieder bündeln …“: Der Dialog (`src/bereiche/planlauf/components/BuendelnDialog.tsx`) listet diese Pläne mit Haken, aktuellem Schritt und Fortschritt; die angekreuzten kehren in einen gemeinsamen Verzeichnislauf zurück (`planeBuendeln`), ihre eigenen Läufe enden mit der Abbruchart `gebuendelt`, nicht angekreuzte behalten ihren Lauf. Läuft das Verzeichnis noch, übernehmen sie dessen Stand – ein Plan, der weiter ist, wird mit „weiter als das Verzeichnis – fällt zurück“ gekennzeichnet. Ist es aufgeteilt, entsteht ein neuer Verzeichnislauf; sein Stand wird unter „Stand des Verzeichnislaufs übernehmen von“ gewählt, vorgeschlagen ist der am wenigsten weit gediehene Plan. In beiden Fällen übernimmt der Plan den Stand des Verzeichnislaufs – erledigte Schritte bleiben erledigt, Start und Termine laufen weiter (`laufUebernehmen` in `engine.ts`); der gebündelte Lauf endet beim Aufteilen mit der Abbruchart `aufgeteilt`. Ein Plan, der schon einen eigenen Lauf hat, behält ihn beim Verschieben in ein anderes Verzeichnis. |
| `rollen` | Funktion (`src/bereiche/planlauf/pages/projekt/RollenFunktionen.tsx`) | Nach Gewerken gegliedert („Übergreifend“ + je Gewerk, **+** für ein weiteres Gewerk, „Gewerk … löschen“ am Seitenende). Je Funktion die Besetzung mit einer Person samt Adressdaten: Funktion anlegen, bearbeiten, löschen; Besetzung setzen, wechseln, aufheben – von der Funktion aus (Person übernehmen oder neu erfassen) oder über „Person hinzufügen“ von der Person aus (Funktion optional gleich mitwählen). Suche über Funktion, Person und Firma; Personen ohne Funktion in einer eigenen Liste, je Zeile bearbeiten und löschen (Rückfrage „Person löschen?“); das Planlaufmanagement wird nicht angezeigt (immer die angemeldete Person); Excel-Import (`RollenImport.tsx`), der fehlende Gewerke und Funktionen anlegt. |
| `ketten` | Workflows im Projekt (`src/bereiche/planlauf/pages/Workflows.tsx` mit `projectId`) | Wie der globale Bereich, zusätzlich mit den Projektvarianten dieses Projekts. |
| `einstellungen` | Einstellungen (`src/bereiche/planlauf/pages/projekt/Einstellungen.tsx`) | Projektdaten bearbeiten; Vorlaufzeit für Erinnerungen, Fristenrechnung in Arbeitstagen, Feiertage, Absendername und Absender-E-Mail pflegen; Hinweis auf die projektübergreifenden E-Mail-Texte; **Export** (`ExportDialog.tsx`, Titel „Planläufe exportieren“; ebenso im Reiter „Planläufe“): Kurz- oder Langfassung; Auswahl der Einträge in der Gliederung der Planlaufliste – je Planpaket, „Ohne Planpaket“ und „Abgebrochen“ ein Haken für die Gruppe; gewählt wird je Planlauf bzw. mitlaufendem Plan (`zeilenSchluessel`), ein Verzeichnis wählt die Pläne unter sich mit, ein mitlaufender Plan – gekennzeichnet mit „läuft im Verzeichnis mit“ – sein Verzeichnis, abgebrochene Läufe tragen ihren eigenen Index; PDF und Excel bleiben gesperrt, solange der Bericht leer wäre; eine Auswahl nach Arten gibt es nicht. Ausgabe als Excel-Datei (`src/shared/xlsx.ts`) oder als PDF über den Druckdialog (`src/shared/print.ts`). Aufbereitung in `src/bereiche/planlauf/domain/export.ts` (`berichtBilden` auf Grundlage von `uebersicht.ts`): Überschriften sind nur die Planpakete (dazu wie in der Liste „Ohne Planpaket“ und „Abgebrochen“); ein gebündeltes Verzeichnis ist ein Planlauf mit seinen mitlaufenden Plänen, ein Verzeichnis mit Plänen einzeln nur eine Klammer. Kurzfassung als PDF: die Tabelle der Planlaufliste (Plan / Planverzeichnis, Gewerk, Aktueller Stand, Nächster Schritt, Zuständig, Fortschritt, Status) ohne Schaltflächen, mit `EXPORT_STIL`; in Excel ein formatiertes Blatt (`kurzBlatt`): A1 „Projekt: …“, A2 „Stand: …“, Kopfzeile in Zeile 4 (`KURZ_KOPF`: Planpaket, Plancode, Index/Ausgabe, Titel, Gewerk, Aktueller Stand, Datum, Nächster Schritt, Frist; Planpaket „ohne Planpaket“, wenn keines), erst die laufenden Planläufe, dann gesondert „Abgeschlossen (…)“ grün und „Abgebrochen (…)“ grau hinterlegt; Datum und Frist als Excel-Daten, Frist bei fälligen Schritten orange, bei überfälligen rot; mitlaufende Pläne mit „läuft im Planlauf von … mit“, Verzeichnisklammern ohne eigene Zeile; Kopfzeilen fixiert, Druck quer auf Seitenbreite (Zellformate in `src/shared/xlsx.ts`). Langfassung: je Planlauf alle Schritte, in Excel je Schritt eine Zeile (`LANG_KOPF`). Projekt löschen. |

### 2.3 Planlauf

`src/bereiche/planlauf/pages/projekt/PlanlaufDetail.tsx`: Kopf mit Stammdaten, Status und
Fortschritt, Verlaufskette und Schrittliste. Aktionen am jeweils anstehenden
Schritt: **Erledigt**, **Überspringen**, **Erinnern** (E-Mail vorbereiten);
abgeschlossene Schritte bieten **Wieder öffnen**, jede Zeile **Anpassen**
(Bezeichnung, Art, Funktion, zuständige Person, Frist, Soll-Termin, Status,
Bemerkung, Nachweis). Zur Wahl der Funktion stehen die Funktionen des Gewerks
des Eintrags und die übergreifenden, je Bezeichnung einmal
(`funktionenFuerGewerk` in `engine.ts`); eine bereits gesetzte Funktion bleibt
wählbar. Beim Lauf eines Planverzeichnisses steht unter dem Kopf die Karte
**Pläne dieses Verzeichnisses**, zunächst zugeklappt, mit der Zahl der
mitlaufenden Pläne und der Pläne mit eigenem Lauf. Läuft der gebündelte Lauf,
bietet sie **Alle Pläne einzeln weiterführen …** (`verzeichnisAufteilen`) und
je mitlaufendem Plan **Herauslösen …** (`planHerausloesen`); Pläne mit eigenem
Lauf haben **Planlauf öffnen**. Gibt es solche Pläne, steht dort auch **Pläne
wieder bündeln …** – ebenso auf der Seite eines bereits aufgeteilten Laufs;
entsteht dabei ein neuer Verzeichnislauf, öffnet die Seite ihn. Ein
aufgeteilter Lauf zeigt statt der roten Abbruchmeldung den Hinweis „In
Einzelläufe der Pläne aufgeteilt am …“, der eigene Lauf eines wieder
gebündelten Plans „Wieder im Planlauf des Verzeichnisses gebündelt am …“.
Weiter: **Schritt einfügen**, Antwort einer Entscheidung
wählen, **Workflow ändern …**, **Planlauf abbrechen** (ersatzlos oder mit neuem Index bzw. neuer
Ausgabe – dann startet ein Nachfolgelauf) und **Lauf löschen**. „Workflow
ändern …“ öffnet „Workflow ändern und neu starten“: Workflow, „Start des
Planlaufs“, „Eingang Soll“ (wird am Eintrag nachgetragen; ein vergangenes
Datum ist nicht vorbelegt, leer gelten die Termine ab dem Start), „Grund“ und
die Schritte des neuen Laufs (`SchrittListe`); „Neu starten“ beendet den Lauf
mit der Abbruchart `neu_gestartet` und legt einen neuen mit Name und Index des
Eintrags an (`planlaufNeuStarten` in `store/store.tsx`). Ein so beendeter Lauf
gilt wie ein aufgeteilter nicht als Abbruch (`laufUeberfuehrt`), behält seine
Soll-Termine (`recalcRun` lässt ihn stehen) und zeigt „Mit geändertem Workflow
neu gestartet am …“ mit „Aktuellen Planlauf öffnen“; der neue Lauf führt unter
„Frühere Läufe vor dem Neustart:“ zu den Läufen der Neustart-Kette vor ihm. Ein
abgebrochener Lauf ist schreibgeschützt: `beendet = run.status !== 'laufend'`
blendet alle Schaltflächen aus. Verlangt ein Schritt einen Nachweis
(`Freigabe-Nr.` oder `Prüfbericht-Nr.`), wird die Nummer beim Erledigen
abgefragt (`src/bereiche/planlauf/components/SchrittStatus.tsx`).

### 2.4 Übergreifende Bedienelemente

* **Seitenleiste** (`src/bereiche/planlauf/App.tsx`): Navigation (Übersicht, Projekte, Workflows,
  Funktionen, Vorlagen), darunter die markierten Projekte mit vorangestellter
  Projektnummer und der Anzahl überfälliger Schritte. Ganz unten
  **Bereich wechseln** zurück zur Bereichsauswahl
  (`src/shell/BereichWechsel.tsx`).
* **Angemeldet als** (unten links): Name (Vorgabe `STANDARD_BEARBEITER =
  'Max Mustermann'`), Schalter „Nachfragen zulassen, wenn ein Workflow-Schritt
  eine E-Mail vorsieht“ und Schalter „Farbmodus für Rot-Grün-Sehschwäche
  (hoher Kontrast)“.
* **Sicherung**: lädt den gesamten Bestand als JSON herunter
  (`exportiereDaten`). **Einspielen**
  (`src/bereiche/planlauf/components/SicherungEinspielen.tsx`): wählt eine
  solche JSON-Datei, liest sie mit `sicherungLesen`
  (`src/bereiche/planlauf/store/storage.ts`, Anhebung wie beim Laden) und
  fragt „Sicherung einspielen?“ – mit der Zahl der Projekte, Pläne und
  Planverzeichnisse und Planläufe, der Warnung, dass der jetzige Bestand
  ersetzt wird, „Aktuellen Stand sichern“ und, wenn die Namen abweichen, dem
  Haken „„Angemeldet als“ aus der Sicherung übernehmen“ (vorgewählt, solange
  der Name `STANDARD_BEARBEITER` ist); ohne gesetzten Haken bleiben Name,
  Farbmodus und E-Mail-Nachfrage der Person am Rechner. „Einspielen“ ersetzt den Bestand über
  `ersetzeDaten` und wechselt zur Übersicht. **Zurücksetzen**: verwirft den
  Bestand und lädt die Demodaten (`zuruecksetzen` in
  `src/bereiche/planlauf/store/store.tsx`).
* **E-Mail-Dialog** (`src/bereiche/planlauf/components/EmailDialog.tsx`): Vorlage wählen, Betreff
  und Text bearbeiten, „In Outlook öffnen“ (mailto), „Outlook im Web“ oder „In
  die Zwischenablage“.

## 3. Nutzerrollen und Rechte

**Es gibt keine Anmeldung, keine Benutzerverwaltung und keine Rechteprüfung.**
Weder `src/bereiche/planlauf/App.tsx` noch der Store (`src/bereiche/planlauf/store/store.tsx`) prüfen irgendeine
Berechtigung; jede Person, die die Anwendung im Browser öffnet, kann alles
lesen und ändern. Der Bestand liegt ausschließlich im `localStorage` des
jeweiligen Browsers, wird also ohnehin nicht geteilt.

Der Begriff „Rolle“ hat im Code zwei rein fachliche Bedeutungen:

1. **Bearbeiter** (`Bearbeiter` in `src/bereiche/planlauf/domain/types.ts`): Name,
   `mailNachfrage` und `farbmodus`. Die Funktion der angemeldeten Person ist
   stets `EIGENE_ROLLE = 'Planlaufmanagement'`; Schritte dieser Funktion gelten
   als eigene To-Dos (`eigeneTodos` in `src/bereiche/planlauf/domain/engine.ts`). In jedem
   markierten Projekt besetzt die Person automatisch das Planlaufmanagement
   (`eigeneKontakteSichern`). Diese Funktion (`istEigeneFunktion` in
   `src/bereiche/planlauf/domain/types.ts`) erscheint weder im Reiter „Funktion“
   noch unter „Funktionen“ und lässt sich dort weder bearbeiten noch neu
   anlegen; der Excel-Import übernimmt solche Zeilen ohne diese Funktion.
   Rechte verleiht das nicht.
2. **Funktionen** (`StandardRolle` projektübergreifend, `Role` je Projekt):
   fachliche Zuständigkeiten, die Prozessschritten zugeordnet und im Projekt mit
   Personen besetzt werden (`kontaktFuerRolleUndGewerk`). Ein Schritt speichert
   nur die Bezeichnung der Funktion; welche Funktion und damit welche Person
   gemeint ist, ergibt sich aus dem Gewerk des Eintrags – ersatzweise gilt die
   übergreifende Funktion gleichen Namens. Mitgeliefert werden 15
   Funktionen (`src/bereiche/planlauf/domain/seed.ts`), davon zwei übergreifend
   (Planlaufmanagement, Projektleitung) und dreizehn je Gewerk (Fachplaner,
   Fachspezialist, Bauvorlageberechtiger, Bau AN, Bauüberwachung,
   Fachtechnischer Prüfer, Prüfstatiker, Vermessungsprüfer, Erdungsprüfer,
   Schweißtechnischer Prüfer, Korrosionsschutzprüfer, Gleisgeometrie Prüfer,
   Geotechnischer Prüfer) für die mitgelieferten Gewerke EEA, KIB, LST, OLA,
   OSE, TK und VA. Gewerke und Funktionen lassen sich ergänzen und löschen.

Die Besetzung wirkt sofort: `zustaendigkeitenNachziehen` (`src/bereiche/planlauf/domain/engine.ts`)
setzt in laufenden Planläufen die zuständige Person aus der aktuellen Besetzung
– außer bei erledigten Schritten und bei von Hand gewählten Personen
(`contactManuell`).

## 4. Umgebungsvariablen

**Eine `.env.example` existiert in diesem Repository nicht**, ebenso wenig eine
`.env`-Datei oder ein Zugriff auf `process.env` im Anwendungscode. Die
Anwendung benötigt keine Umgebungsvariablen – es gibt keinen Server, keine
Datenbank und keine API-Schlüssel.

Verwendet werden ausschließlich die von Vite bereitgestellten Werte:

| Variable | Bedeutung | Pflicht |
| --- | --- | --- |
| `import.meta.env.BASE_URL` | Basispfad der Auslieferung; wird für die Pfade der Logos (`public/logos/`) und des Hauslogos verwendet (`src/shared/logos.tsx`). Vite setzt ihn aus `base: './'` in `vite.config.ts`. | von Vite gesetzt, keine eigene Pflege |
| `import.meta.env.PROD` | Nur im Produktionsbuild wird der Service Worker registriert (`src/shared/pwa.ts`). | von Vite gesetzt, keine eigene Pflege |

## 5. Setup von Null bis zur laufenden Anwendung

1. **Voraussetzungen**: Node.js und npm. Eine Fassung legt das Repository nicht
   fest (kein `engines`-Eintrag in `package.json`, keine `.nvmrc`); der
   Workflow `.github/workflows/pages.yml` baut mit Node 22. Weitere Werkzeuge
   sind nicht nötig.
2. **Abhängigkeiten installieren**: `npm install` (bzw. `npm ci` bei
   vorhandener `package-lock.json`). Laufzeitabhängigkeiten sind nur `react`
   und `react-dom`; Vite, TypeScript und die Typpakete sind Entwicklungs-
   abhängigkeiten (`package.json`).
3. **Datenbank**: entfällt. Es gibt keine Datenbank, keinen Server und keine
   Migrationsskripte. Der Bestand liegt unter dem Schlüssel
   `planlauf-management.data.v1` im `localStorage`
   (`src/bereiche/planlauf/store/storage.ts`).
4. **Migrationen**: laufen automatisch beim Laden. `DATEN_VERSION = 11` und
   `STAMMDATEN_VERSION = 4` (`src/bereiche/planlauf/domain/types.ts`) steuern, ob `migriere()`
   einen älteren Bestand auf die aktuelle Struktur hebt und ob neue Stammdaten
   (Funktionen, Standard-Workflows) übernommen werden. Ohne gespeicherten
   Bestand werden die Demodaten aus `src/bereiche/planlauf/domain/seed.ts` geladen.
5. **Entwicklung starten**: `npm run dev` – Vite startet auf Port 5173 und ist
   im Netz erreichbar (`server: { port: 5173, host: true }`).
6. **Prüfen und bauen**: `npm run typecheck` (`tsc --noEmit`) und `npm run
   build` (`tsc -b && vite build`, Ergebnis in `dist/`). `npm run preview`
   liefert den Build lokal aus.
7. **Veröffentlichen**: Der Workflow `.github/workflows/pages.yml` baut bei
   jedem Push auf `main` und stellt den Build über GitHub Pages bereit
   (Quelle „GitHub Actions“); zusätzlich legt er ihn im Branch `gh-pages` und
   im Ordner `app/` auf `main` ab. Steht Pages auf „Deploy from a branch“ mit
   `main`, liefert GitHub den Zweig selbst aus: Die Wurzel-`index.html`
   verweist auf `/src/main.tsx`, das der Browser nicht ausführen kann; ihr
   Skript wechselt deshalb nach 1,5 Sekunden auf `app/`. Bei Pull Requests
   baut der Workflow nur (einschließlich Typprüfung). Wegen
   `base: './'` funktioniert die Anwendung auch in einem Unterverzeichnis.

## 6. Bekannte Meldungen und ihre Ursachen

### Eingabeprüfungen (als Hinweis eingeblendet)

| Meldung | Fundstelle | Ursache |
| --- | --- | --- |
| „Bitte einen Projektnamen angeben.“ | `src/bereiche/planlauf/pages/Projekte.tsx` | Projektname leer. |
| „Bitte einen Titel angeben.“ | `src/bereiche/planlauf/pages/projekt/Plaene.tsx` | Titel eines Plans / Planverzeichnisses leer. |
| „Bitte Codierung oder Titel angeben.“ | `src/bereiche/planlauf/pages/projekt/Plaene.tsx` | Ein Planverzeichnis soll aus dem Auswahlfeld heraus ohne Codierung und Titel angelegt werden. |
| „Bitte einen Namen für das Planpaket angeben.“ | `src/bereiche/planlauf/components/PaketDialog.tsx` | Name des Planpakets leer. |
| „Bitte die … angeben.“ | `src/bereiche/planlauf/components/SchrittStatus.tsx` | Beim Erledigen eines Schritts fehlt die verlangte Nachweisnummer. |
| „Bitte … angeben.“ | `src/bereiche/planlauf/pages/projekt/PlanlaufDetail.tsx` | Beim Abbruch mit neuem Index bzw. neuer Ausgabe fehlt dieser. |
| „Bitte einen Nachnamen angeben.“ | `src/bereiche/planlauf/pages/projekt/RollenFunktionen.tsx` | Besetzung ohne Nachname gespeichert. |
| „Bitte eine Bezeichnung angeben.“ | `Funktionen.tsx`, `RollenFunktionen.tsx`, `GewerkDialog.tsx`, `Plaene.tsx` | Funktion oder Gewerk ohne Bezeichnung bzw. Planpaket aus dem Auswahlfeld ohne Namen. |
| „Planlaufmanagement übernimmt stets die angemeldete Person.“ | `Funktionen.tsx`, `RollenFunktionen.tsx` | Eine übergreifende Funktion mit dieser Bezeichnung soll angelegt werden. |
| „„…“ ist bereits angelegt.“ | `src/bereiche/planlauf/components/GewerkDialog.tsx` | Gewerk mit diesem Namen existiert schon. |
| „Bitte einen Namen angeben.“ / „Bitte jeden Schritt benennen.“ | `src/bereiche/planlauf/pages/Workflows.tsx` | Workflow ohne Namen bzw. Schritt ohne Bezeichnung. |
| „Bitte jeden Schritt der Workflow benennen.“ | `src/bereiche/planlauf/pages/projekt/Plaene.tsx`, `PlanlaufDetail.tsx` | Beim Start bzw. Neustart eines Planlaufs ist ein Schritt unbenannt. |
| „Bitte einen Grund angeben.“ | `src/bereiche/planlauf/pages/projekt/PlanlaufDetail.tsx` | Abbruch ohne Begründung. |
| „Bitte mindestens einen Eintrag auswählen.“ | `src/bereiche/planlauf/pages/projekt/ExportDialog.tsx` | Export ohne Auswahl. |

### Import aus Excel/CSV

| Meldung | Ursache |
| --- | --- |
| „Die Datei enthält keine Datenzeilen.“ | Die Tabelle hat nur eine Kopfzeile oder ist leer (`PlaeneImport.tsx`, `RollenImport.tsx`). |
| „Weder ‚Plancodierung‘ noch ‚Titel‘ gefunden. Gelesene Überschriften: …“ | Die Kopfzeile der Planliste enthält keine der erkannten Schreibweisen (`PLAN_SPALTEN` in `src/bereiche/planlauf/domain/importVorlagen.ts`). |
| „Die Spalte ‚Name‘ wurde nicht gefunden. Gelesene Überschriften: …“ | Dasselbe für die Rollenliste (`ROLLEN_SPALTEN`). |
| „Die Datei ist keine gültige Excel-Datei (ZIP-Ende fehlt).“ | `src/shared/xlsxLesen.ts`: Die Datei ist kein ZIP – etwa eine alte `.xls`-Datei. |
| „Die Datei verwendet ein nicht unterstütztes Packverfahren.“ | Der ZIP-Eintrag ist nicht „deflate“ (`methode !== 8`). |
| „Dieser Browser kann keine Excel-Dateien entpacken – bitte die Liste als CSV speichern.“ | `DecompressionStream` fehlt im Browser. |
| „Die Datei konnte nicht gelesen werden.“ | Auffangmeldung für alle übrigen Lesefehler. |
| Hinweise je Zeile: „Eintrag mit dieser Bezeichnung ist bereits vorhanden“, „Planpaket ‚…‘ wird angelegt“, „Workflow ‚…‘ ist nicht hinterlegt – es gilt der im Dialog gewählte“, „Bezeichnung kommt in der Datei mehrfach vor“, „Planverzeichnis ‚…‘ wird angelegt“, „Planverzeichnis ‚…‘ startet seinen Planlauf“, „Gewerk ‚…‘ wird angelegt“, „Funktion ‚…‘ wird angelegt“, „ersetzt … in dieser Funktion“ | Kein Fehler: Die Vorschau nennt, was beim Übernehmen geschieht. |

### Sicherung einspielen

| Meldung | Ursache |
| --- | --- |
| „Die Datei ist keine gültige JSON-Datei.“ | Die gewählte Datei lässt sich nicht als JSON lesen (`sicherungLesen`). |
| „Die Datei ist keine Sicherung von KaPlan.“ | Das JSON enthält keine Liste `projects`. |
| „Die Sicherung stammt aus einer neueren Fassung von KaPlan. Bitte die Seite neu laden (Strg+Umschalt+R) und erneut einspielen.“ | `version` der Sicherung ist größer als `DATEN_VERSION` – die geladene Programmfassung ist älter als die, die gesichert hat. |
| „Die Sicherung ist unvollständig.“ | Einer Sicherung der aktuellen Fassung fehlt eine der Listen (Projekte, Funktionen, Kontakte, Einträge, Workflows, Planläufe …) oder der Name unter „Angemeldet als“. |
| „Die Sicherung konnte nicht gelesen werden.“ | Das Anheben auf die aktuelle Fassung schlug fehl. |
| „Sicherung eingespielt – ….“ | Kein Fehler: Der Bestand wurde ersetzt; die Meldung nennt die Zahl der Projekte und Planläufe. |

### Laufzeit und Technik

| Meldung | Ursache |
| --- | --- |
| „Kopieren nicht möglich – bitte Text manuell markieren.“ | `navigator.clipboard.writeText` wurde abgelehnt (fehlende Berechtigung oder unsicherer Kontext), `src/bereiche/planlauf/components/EmailDialog.tsx`. |
| „Druckdialog geöffnet – dort ‚Als PDF sichern‘ wählen.“ | Kein Fehler: Der PDF-Export läuft über den Druckdialog des Browsers (`src/shared/print.ts`). |
| Konsole: „Daten konnten nicht lokal gespeichert werden: …“ | `localStorage.setItem` schlug fehl – Speicher voll oder gesperrt (privates Fenster), `src/bereiche/planlauf/store/storage.ts`. |
| Konsole: „Service Worker konnte nicht registriert werden: …“ | Registrierung abgelehnt, etwa ohne HTTPS (`src/shared/pwa.ts`). Die Anwendung läuft weiter, nur der Offline-Betrieb entfällt. |
| Ausnahme: „useStore muss innerhalb des StoreProvider verwendet werden.“ | Entwicklungsfehler: Eine Komponente nutzt `useStore` außerhalb von `StoreProvider` (`src/bereiche/planlauf/store/store.tsx`). |
| Seite „Nicht gefunden – Der aufgerufene Eintrag existiert nicht (mehr).“ | Die Adresse nennt ein Projekt oder einen Planlauf, den es nicht (mehr) gibt (`src/bereiche/planlauf/App.tsx`). |
| Ein alter Stand erscheint nach einer Aktualisierung | Entweder liegt unter `app/` noch ein älterer Build (siehe Abschnitt 5, Schritt 7), oder der Service Worker liefert aus seinem Cache, derzeit `mc-plan-v5` (`public/sw.js`). Beim Aktivieren löscht er alle älteren Caches; bis dahin hilft einmal Neuladen bzw. Strg+Umschalt+R. |
| Planliste: Haken „Pläne einzeln durch den Planlauf führen“ ist ausgegraut – „Es bestehen bereits Planläufe. Die Pläne lassen sich nur noch nachträglich einzeln weiterführen.“ bzw. „Die Pläne laufen bereits einzeln. Über „Pläne wieder bündeln …“ lassen sich ausgewählte Pläne zurückführen.“ | Kein Fehler: Sobald das Verzeichnis oder einer seiner Pläne einen Lauf hat, ist die Wahl gesperrt (`modusGesperrt` in `Plaene.tsx`). Weiter geht es über die Nachträge „Herauslösen …“, „Alle Pläne einzeln weiterführen …“ und „Pläne wieder bündeln …“ bzw. „Bündeln …“ – im Dialog der Planliste, in der Karte „Pläne dieses Verzeichnisses“ des Planlaufs und im Reiter „Planläufe“. |
| Konsole der Wurzelseite: 404 für `/src/main.tsx` und die Symbole unter `icons/` | Kein Fehler: Die Wurzelseite ist der ausgelieferte Quellcode und springt nur nach `app/` weiter; dort gibt es diese Fehlanfragen nicht. |

## 7. Bereich Baubetriebsplanung

Monitor für baubetriebliche Anmeldungen von Sperrpausen, erster Entwurf nach
dem Lastenheft der Anwender. Offene Fragen und Annahmen:
`docs/BAUBETRIEB_RUECKFRAGEN.md`. Der Bereich greift nicht auf das
Planlaufmanagement zu; Einstiegspunkt ist `src/bereiche/baubetrieb/index.tsx`,
Rahmen und Seitenleiste stehen in `src/bereiche/baubetrieb/App.tsx`. Die
„Projekthülle“ des Lastenhefts heißt in der Anwendung „Projekt“; die Phasen
heißen SKM, MKM, KM (n-2 & n-1) und KKM (unterjährig) (`PHASE_LABEL` in
`src/bereiche/baubetrieb/domain/types.ts`), im Lastenheft SKM, PzE, Vorprozess
N-x und unterjährige Anmeldung.

### 7.1 Datenmodell und Speicherung

* `src/bereiche/baubetrieb/domain/types.ts`: `Projekt`, `Anmeldung` mit
  `statusId` und `verlauf` (`VerlaufEintrag`: `anlage`, `wechsel`, `notiz`;
  `vonText`/`nachText` halten Workflow und Status zum Zeitpunkt des Eintrags
  fest), `Workflow` mit `status` (`WorkflowStatus`: Name, Art, Fristregel,
  `nachhaken`, Bemerkung, `nachfolger`), `Einstellungen` mit `rilFristen`.
  Maßnahmenarten in `ALLE_ARTEN` (SKM, MKM, A, B(0), B(S), B, C, Container;
  mit eigener KKM-Frist `MASSNAHMENARTEN`), AnnexVII-Gründe in `ANNEX_VII`
  („Entspricht Prozessphase“ und „Zustimmung EVU/EIU“ mit `selten`). Ein
  Nachfolger ist die ID eines Status – auch eines anderen Workflows – oder
  `LOESCHEN` (Eintrag löschen). Statusarten in `STATUS_ART_LABEL`, darunter
  `leiche` („Anmeldeleiche“).
* Schlüssel `baubetrieb-planung.data.v1` im `localStorage`
  (`src/bereiche/baubetrieb/store/storage.ts`), `DATEN_VERSION = 7`.
  `migriere()` hebt ältere Stände in einem Aufruf Schritt für Schritt: Fassung 1 kannte nur den
  Farbmodus und erhält die Demodaten; Fassung 2 führte Statusnummern (V0 … Y9),
  die `STATUS_AUS_NUMMER` (`src/bereiche/baubetrieb/domain/workflow.ts`) den
  Status der Standard-Workflows zuordnet – in Anmeldungen, Verlauf und
  gespeichertem Vorstand; der bisher eingestellte `nachhakTage` wird zum
  Abstand der Nachhak-Termine (`standardWorkflows(nachhakTage)`); Fassung 3
  (`ausFassung3`) erhält statt der Kurzbezeichnung „Unterjahr“ die aktuelle
  (auch in den Texten des Statusverlaufs), sofern sie nicht geändert wurde;
  Fassung 4 (`ausFassung4`) kannte die Anmeldeleiche nur als Nachfolger, der
  sofort löschte – jeder Workflow mit diesem Nachfolger erhält am Ende den
  Status „Anmeldeleiche“ (in den Standard-Workflows mit fester ID, z. B.
  `skm-anmeldeleiche`), auf den die bisherigen Verweise zeigen und dessen
  einziger Nachfolger `LOESCHEN` ist; hat eine ältere Fassung einen Bestand
  der Fassung 5 gespeichert und die Art dabei zu „Entwurf“ gemacht, führt
  `ausFassung4` den Status mit fester ID wieder als Anmeldeleiche; Fassung 5
  (`ausFassung5`) kannte die Phasennamen des Lastenhefts – Standard-Workflows
  erhalten Name, Kurzbezeichnung und Beschreibung von MKM, KM und KKM, soweit
  sie nicht geändert wurden (die Texte im Statusverlauf folgen), die Art PzE
  wird MKM, A_Vor_N-2, A_Vor_N-1 und A_unterjahr werden A (auch in den Arten
  der Workflows und im gespeicherten Vorstand), Fristbezug und
  Richtlinienfrist `pze` heißen `mkm`, die Prozessphase des ersten
  Anmeldetermins `mkm` bzw. `kkm`; Fassung 6 (`ausFassung6`) führte je Projekt
  eine geplante Sperrzeit (`bauzeitVon`/`bauzeitBis`) – daraus werden die
  betroffenen Fahrplanjahre (`fahrplanjahre`, über `fahrplanjahreZwischen`,
  höchstens zehn). Ohne gespeicherten Bestand lädt `seedDaten()`
  (`src/bereiche/baubetrieb/domain/seed.ts`) drei Projekte mit acht
  Anmeldungen, Termine relativ zum heutigen Tag, und die Standard-Workflows.
* Alle Schreibzugriffe über `mutate()` in
  `src/bereiche/baubetrieb/store/store.tsx`; Statuswechsel und Rücknahme als
  reine Funktionen `wechselAnwenden` und `wechselZuruecknehmen` in
  `src/bereiche/baubetrieb/domain/ablauf.ts`, Workflows über
  `workflowSpeichern`, `workflowLoeschen` und `workflowKopie` in
  `src/bereiche/baubetrieb/domain/workflowPflege.ts`.

### 7.2 Routen

| Route | Seite | Aktionen |
| --- | --- | --- |
| `#/baubetrieb` | Übersicht (`src/bereiche/baubetrieb/pages/Uebersicht.tsx`) | Kacheln „Anmeldungen“, „Terminfristen überfällig“, „Demnächst fällig“, „Nachhaken & Anmeldebedarf“. Karte „Anstehende Terminfristen“ (die ersten acht, `ANZAHL_TERMINE`) mit „Status ändern …“ je Zeile; Karte „Anmeldebedarf aus den Projekten“ (nur wenn Bedarf besteht); Karte „Projekte“ mit der Zahl der Anmeldungen je Workflow, überfälligen Fristen und nächster Frist. Angezeigt werden markierte Projekte, ohne Markierung alle (`sichtbareProjekte`). |
| `#/baubetrieb/termine` | Termine & Nachhaken (`src/bereiche/baubetrieb/pages/Termine.tsx`) | Alle Anmeldungen mit Terminfrist über alle Projekte, gegliedert nach Projekt; Filter Alle / Überfällig / Fällig / Im Plan / Zum Nachhaken, Suche; je Zeile „Nachgehakt“ (bei Status zum Nachhaken) und „Status ändern …“. Darunter „Anmeldebedarf aus den Projekten“. |
| `#/baubetrieb/projekte` | Projekte (`src/bereiche/baubetrieb/pages/Projekte.tsx`) | Karten mit DB-G-Nummer, MIC-Projektnummer, betroffenen Fahrplanjahren, Status der Betreuung, ★-Markierung, Zahl der Anmeldungen, überfälligen Fristen und „Nächste Anmeldung“ aus dem Anmeldebedarf; „Neues Projekt“ (`ProjektDialog`). |
| `#/baubetrieb/projekt/<id>` | Projekt (`src/bereiche/baubetrieb/pages/ProjektDetail.tsx`) | „Excel“, „Bearbeiten“, „Löschen“ (samt Anmeldungen); Stammdaten; Karte „Anmeldebedarf je Fahrplanjahr“ je betroffenem Fahrplanjahr (SKM, MKM, KM N-2, KM N-1; ein abgedecktes Feld nennt Phase und Status des Eintrags; dazu „KKM (unterjährig)“ mit je Maßnahmenart „ganzes Jahr“, „ab …“ oder „nicht mehr“, dahinter die vorhandenen unterjährigen Anmeldungen dieser Art mit Status, abgelehnte ohne ✓ – `KkmInhalt`; ohne Fahrplanjahre „Keine Fahrplanjahre gewählt“), ohne eigene Schaltflächen zum Anlegen; Überschrift „Baubetriebliche Anmeldungen“ mit Suche und „Neue Anmeldung“; darunter je Workflow eine Tabelle (`AnmeldungenTabelle`, ohne eigene Schaltfläche zum Anlegen) mit den Spalten Anmeldung, Maßnahmenart, Sperrzeitraum, Status (ohne Workflow davor), Terminfrist (Ampelpunkt, Datum, Abstand; Regel im Tooltip) und „Status ändern …“. Jede Zeile umfasst höchstens zwei Textzeilen (`EINZEILIG` kürzt mit Auslassungspunkten). Workflows ohne Anmeldung zeigen nur die Kopfzeile mit „keine Anmeldung“; bei einer Suche entfallen Workflows ohne Treffer. |
| `#/baubetrieb/projekt/<id>/anmeldung/<id>` | Anmeldung (`src/bereiche/baubetrieb/pages/AnmeldungDetail.tsx`) | Weg durch die Workflows; Karte „Workflow …“ mit den Status des aktuellen Workflows in ihrer Reihenfolge – erreichte mit „zuletzt erreicht am …“, der aktuelle mit Terminfrist samt Rechenweg und den Nachfolgern („Weiter mit:“ – der Wechsel in eine Anmeldeleiche in Rot –, „Übernahme in neue Phase:“, „Abschluss:“ mit „Eintrag löschen“), „Nachgehakt …“, „Termin festlegen …“, „Letzten Wechsel zurücknehmen“; Karte „Merkmale“ (mit Herkunft bzw. „Aufgeteilt in“); Karte „Statusverlauf“; „Bearbeiten“, „Löschen“. |
| `#/baubetrieb/workflows` | Workflows (`src/bereiche/baubetrieb/pages/Workflows.tsx`) | „Weg einer Anmeldung“; Liste „Workflows“ mit Kennzeichen „Standard“ bzw. „Eigener Workflow“, Zahl der Status und Anmeldungen, den Status in ihrer Reihenfolge, „Öffnen“, „Duplizieren“ und – bei eigenen Workflows ohne Anmeldungen – Löschen; „Neuer Workflow“; Übersicht der Richtlinienfristen nach Phase (`rilFristenNachPhase`) mit „Anpassen“. Editor siehe 7.3. Die frühere Adresse `#/baubetrieb/workflow` zeigt dieselbe Seite. |
| `#/baubetrieb/einstellungen` | Einstellungen (`src/bereiche/baubetrieb/pages/Einstellungen.tsx`) | Richtlinienfristen je Schlüssel (`RIL_SCHLUESSEL`), nach Phase gegliedert (`rilFristenNachPhase`, je Phase eine Gruppenzeile mit Hinweis aus `RIL_PHASE_HINWEIS`) und mit Kürzel (`RIL_KUERZEL`, z. B. „Ril_KM N-2“, „Ril_KKM B(S)“), als „Stichtag im Fahrplanjahr“ oder „Wochen vor Sperrbeginn“, Kennzeichen „Platzhalter“ mit „Geprüft“; „Fällig ab“, „Nachhak-Abstand – Vorgabe“, „Anmeldebedarf – Vorschau“. Änderungen gelten sofort. |

Router: `src/bereiche/baubetrieb/lib/router.ts`; unbekannte Adressen führen auf
die Übersicht.

### 7.3 Workflows, Statuswechsel und Fristen

* `standardWorkflows()` in `src/bereiche/baubetrieb/domain/workflow.ts` liefert
  die Standard-Workflows „SKM“, „MKM“, „KM (n-2 & n-1)“ und „KKM
  (unterjährig)“ (Kurzbezeichnungen SKM, MKM, KM, KKM) mit festen Status-IDs. Jeder endet mit dem Status
  „Anmeldeleiche“ (Art `leiche`, ohne Terminfrist, einziger Nachfolger
  `LOESCHEN`), erreichbar aus „Entwurf“ und „Abgelehnt“. `STATUS_TON` in
  `src/bereiche/baubetrieb/components/common.tsx` zeigt ihn rot. Neu angelegt wird im ersten Status eines
  Workflows (`AnmeldungDialog` in
  `src/bereiche/baubetrieb/components/AnmeldungDialog.tsx`: ein Auswahlfeld
  „Phase und Maßnahmenart“, nach Phase gegliedert; je Eintrag Kurzbezeichnung
  und Art, etwa KKM · B(S));
  vorbelegt ist KKM (`NEUANLAGE_WORKFLOW`).
* Editor (`WorkflowEditor` in `src/bereiche/baubetrieb/pages/Workflows.tsx`):
  Name, Kurzbezeichnung, Beschreibung, Sperrzeitraum, Maßnahmenarten; je Status
  eine Karte mit Bezeichnung, Art (`STATUS_ART_LABEL`), Terminfrist
  (`FRIST_TYP_LABEL`: „Keine Terminfrist“, „Frist laut Richtlinie“, „Nächster
  Stichtag (TT.MM.)“, „Nachhak-Termin nach Statuswechsel“; der Bezug einer
  Frist laut Richtlinie nach Phase gegliedert, `RIL_BEZUG_LABEL` und
  `RIL_BEZUG_PHASE`, Kurzform mit `RIL_BEZUG_KUERZEL`), „Termin dient zum
  Nachhaken“, Bemerkung und Nachfolgern („Nachfolger hinzufügen …“ mit „Dieser
  Workflow“, „Übernahme in …“ und „Eintrag löschen (endgültig)“; zur Art
  „Anmeldeleiche“ ein Hinweis);
  Verschieben, Entfernen (nicht bei Status mit Anmeldungen), „Status“ fügt
  einen Status an. Der Sperrzeitraum ist gesperrt, solange Anmeldungen im
  Workflow stehen. Speichern prüft Name, Status-Bezeichnungen, Arten und
  belegte Status (`belegteEntfallendeStatus`); Nachfolger auf entfallene
  Status werden in allen Workflows entfernt. „Duplizieren“ (`workflowKopie`)
  hängt „(Kopie)“ an Name und Kurzbezeichnung.
* Die Auswahl „Status ändern …“ (`NachfolgerAuswahl` in
  `src/bereiche/baubetrieb/components/common.tsx`) bietet nur die Nachfolger
  des aktuellen Status an (`nachfolgerVon`).
* Statuswechsel im Dialog `src/bereiche/baubetrieb/components/StatusWechselDialog.tsx`:
  Datum, Bemerkung, beim Eintritt in eine Änderungsabstimmung ÄAbst-Nr und
  AnnexVII; bei einem Wechsel in einen anderen Workflow (`istUebernahme`)
  Maßnahmenart und je Zeile Anmelde-ID, Bf/Strecke und Sperrzeitraum, mit
  „Weitere Anmeldung“ zur Aufteilung (weitere Einträge erhalten `herkunftId`).
  Der Wechsel in eine Anmeldeleiche ist ein gewöhnlicher Statuswechsel mit
  Hinweis („Die Anmeldung bleibt als Anmeldeleiche rot gekennzeichnet im
  Projekt stehen …“). Erst „Eintrag löschen“ (`LOESCHEN`) fragt „Anmeldeleiche
  löschen?“ (bzw. „Anmeldung löschen?“, wenn ein eigener Workflow das Löschen
  aus einem anderen Status erlaubt) und löscht den Eintrag samt Verlauf.
* Terminfrist (`terminfrist` in `src/bereiche/baubetrieb/domain/fristen.ts`):
  von Hand festgelegter Termin (`terminManuell`, gilt bis zum nächsten
  Wechsel), sonst nach der Fristregel des Status. Richtlinienfristen aus
  `rilFristen`; welche gilt, entscheidet `rilSchluesselFuer`: Ril_KM nimmt die
  N-2-Frist, solange sie am Tag des Statuswechsels nicht verstrichen ist und
  nicht vor dem ersten Anmeldetermin des Projekts abzüglich `CA_TOLERANZ_TAGE`
  liegt, sonst die N-1-Frist (`kmGrundFuerN1`; der Rechenweg nennt den Grund),
  Ril_KKM die Frist der Maßnahmenart, für die Arten SKM und MKM die von A. Die Vorbelegung `standardRilFristen()` in `seed.ts` ist als
  `platzhalter` gekennzeichnet. Ampel `ampelFuer` mit `vorlaufTage`.
* Fahrplanjahr: `fahrplanjahrBeginn`, `fahrplanjahrEnde`, `fahrplanjahrVon` –
  Ende am zweiten Samstag im Dezember. Ob ein Workflow den Sperrzeitraum als
  ganzes Fahrplanjahr führt, entscheidet `ganzesFahrplanjahr`.
* Anmeldebedarf (`anmeldebedarf`, `faelligerBedarf`): je betroffenem
  Fahrplanjahr (`Projekt.fahrplanjahre`) und je SKM, MKM, KM N-2, KM N-1 die
  Frist (bei Wochen vor Sperrbeginn gerechnet ab Beginn des Fahrplanjahres) und der Zustand `abgedeckt`
  (Einträge im KM oder KKM decken beide KM-Fristen ab, bei mehreren zählt der
  frühere Workflow; Anmeldungen in einer Anmeldeleiche zählen nicht,
  `istLeiche`),
  `faellig`, `kuenftig`, `verstrichen`, `vorBeginn` oder `offen`; Fristen, die
  mehr als 31 Tage vor dem ersten Anmeldetermin liegen, gelten als `vorBeginn`
  (`CA_TOLERANZ_TAGE`, weil der erste Anmeldetermin nur ein ca.-Wert ist).
  Für KKM je Maßnahmenart (`kkmZellen`): frühester Sperrbeginn bei Anmeldung
  zum nächsten Stichtag (`naechsterMittwoch`, ein Mittwoch an oder nach heute)
  zuzüglich `wochenVorher`; Zustand `ganzesJahr`, `ab` oder `nichtMehr`, bei
  einer Frist als Stichtag im Fahrplanjahr ab dem Stichtag der Anmeldung oder
  `nichtMehr`. Vorhandene unterjährige Anmeldungen (`eintraege`, nach
  Sperrbeginn) ändern daran nichts.
  Unterjährige Anmeldungen sind Einträge in einem KKM-Workflow
  (`istKkmWorkflow`).
* Ril_KKM in Wochen vor Sperrbeginn fällt auf den Mittwoch an oder vor
  diesem Datum (`rilDatum` mit `stichtagMittwoch`); der Rechenweg nennt
  „(Stichtag Mittwoch)“.

### 7.4 Übergreifende Bedienelemente

* Seitenleiste: Übersicht, „Termine & Nachhaken“ (mit der Zahl überfälliger
  Fristen), Projekte, Workflows, Einstellungen, darunter die markierten
  Projekte; unten „Angemeldet als“ (Name, Vorgabe `STANDARD_BEARBEITER =
  'Bearbeitung MIC'`, und „Farbmodus für Rot-Grün-Sehschwäche (hoher
  Kontrast)“), „Sicherung“, „Einspielen“, „Zurücksetzen“ und „Bereich
  wechseln“.
* Sicherung (`exportiereDaten`) lädt `baubetrieb-sicherung-<Datum>.json` mit
  `"bereich": "baubetrieb"`. Einspielen
  (`src/bereiche/baubetrieb/components/Sicherung.tsx`) fragt „Sicherung
  einspielen?“, bietet „Aktuellen Stand sichern“ und übernimmt „Angemeldet
  als“ und Farbmodus nur mit dem Haken „Auch „Angemeldet als“ und Farbmodus
  aus der Sicherung übernehmen“.
* Excel (`monitorExportieren` in `src/bereiche/baubetrieb/domain/export.ts`):
  Blätter „Anmeldungen“ (mit den Spalten „Workflow“ und „Status“) und
  „Projekte“, Terminfristen bei überfälligen Anmeldungen rot, bei fälligen
  orange hinterlegt.

### 7.5 Meldungen

| Meldung | Fundstelle | Ursache |
| --- | --- | --- |
| „Bitte eine Bezeichnung angeben.“ | `src/bereiche/baubetrieb/pages/Projekte.tsx` | Projekt ohne Bezeichnung. |
| „Bitte einen Workflow wählen.“ | `src/bereiche/baubetrieb/components/AnmeldungDialog.tsx` | Neuanlage ohne Workflow mit Status. |
| „Das Ende des Sperrzeitraums liegt vor dem Beginn.“ | `src/bereiche/baubetrieb/components/AnmeldungDialog.tsx` | Sperrzeitraum einer Anmeldung verkehrt. |
| „Bitte das Fahrplanjahr wählen.“ | `src/bereiche/baubetrieb/components/AnmeldungDialog.tsx` | Eintrag in einem Workflow mit ganzem Fahrplanjahr ohne Fahrplanjahr. |
| „Ohne Beginn des Sperrzeitraums lässt sich die Terminfrist nach Richtlinie nicht berechnen.“ | `src/bereiche/baubetrieb/components/AnmeldungDialog.tsx` | Hinweis bei tagesscharfen Anmeldungen ohne Beginn des Sperrzeitraums. |
| „Bitte das Datum des Statuswechsels angeben.“ | `src/bereiche/baubetrieb/components/StatusWechselDialog.tsx` | Datum geleert. |
| „Bitte je Eintrag das Fahrplanjahr wählen.“ | `src/bereiche/baubetrieb/components/StatusWechselDialog.tsx` | Übernahme in einen Workflow mit ganzem Fahrplanjahr ohne Fahrplanjahr. |
| „Das Ende eines Sperrzeitraums liegt vor dem Beginn.“ | `src/bereiche/baubetrieb/components/StatusWechselDialog.tsx` | Übernahme mit verkehrtem Sperrzeitraum. |
| „Anmeldeleiche gelöscht.“ / „Anmeldung gelöscht.“ | `src/bereiche/baubetrieb/components/StatusWechselDialog.tsx` | Kein Fehler: „Eintrag löschen“ aus der Anmeldeleiche bzw. aus einem anderen Status. |
| „Bitte einen Namen angeben.“ / „Bitte mindestens einen Status anlegen.“ / „Bitte jeden Status benennen.“ / „Bitte mindestens eine Maßnahmenart wählen.“ | `src/bereiche/baubetrieb/pages/Workflows.tsx` | Workflow-Editor: Pflichtangaben fehlen. |
| „„…“ kann nicht entfallen – darin stehen noch Anmeldungen.“ | `src/bereiche/baubetrieb/pages/Workflows.tsx` | Beim Speichern entfiele ein Status, in dem noch Anmeldungen stehen. |
| „Der Sperrzeitraum lässt sich nicht umstellen, solange Anmeldungen in diesem Workflow stehen.“ | `src/bereiche/baubetrieb/pages/Workflows.tsx` | Schutz beim Speichern; das Auswahlfeld ist in diesem Fall ohnehin gesperrt. |
| „Die Datei ist keine gültige JSON-Datei.“ | `src/bereiche/baubetrieb/store/storage.ts` | Einspielen einer Datei, die kein JSON ist. |
| „Die Datei ist eine Sicherung des Planlaufmanagements – bitte dort einspielen.“ | `src/bereiche/baubetrieb/store/storage.ts` | Das JSON enthält `projects`. |
| „Die Datei ist keine Sicherung der Baubetriebsplanung.“ | `src/bereiche/baubetrieb/store/storage.ts` | Kennzeichen `bereich` fehlt oder Listen fehlen. |
| „Die Sicherung stammt aus einer neueren Fassung von KaPlan. Bitte die Seite neu laden (Strg+Umschalt+R) und erneut einspielen.“ | `src/bereiche/baubetrieb/store/storage.ts` | `version` größer als `DATEN_VERSION`. |
| Seite „Nicht gefunden“ | `src/bereiche/baubetrieb/App.tsx` | Adresse nennt ein Projekt oder eine Anmeldung, die es nicht (mehr) gibt – etwa nach „Eintrag löschen“. |

## 8. Bereich Projektsteuerung

Erster Entwurf für die externe Projektsteuerung: je Projekt die
Projektbeteiligtenliste, Besprechungsprotokolle und die Liste offener Punkte
(LOP). Einstiegspunkt ist `src/bereiche/projektsteuerung/index.tsx`, Rahmen und Seitenleiste stehen in
`src/bereiche/projektsteuerung/App.tsx`, die Gestaltung in `src/bereiche/projektsteuerung/projektsteuerung.css` (Klassen mit dem
Präfix `ps-`, Farben aus den Design-Tokens). Der Bereich greift nicht auf die
anderen Bereiche zu. Die Protokolle bilden das eigenständige Protokoll-Tool
(HTML-Datei) nach; dessen Dateien lassen sich übernehmen (`ausProtokollTool`
in `src/bereiche/projektsteuerung/domain/protokoll.ts`).

### 8.1 Datenmodell und Speicherung

* `src/bereiche/projektsteuerung/domain/types.ts`: `Projekt` (mit `logos`; `null` steht für
  `STANDARD_LOGOS` aus `src/bereiche/projektsteuerung/domain/seed.ts`), `Funktion` (projektübergreifend,
  mit `gewerk`; `null` = übergreifend, Seite `UEBERGREIFEND`; volle Bezeichnung
  `funktionsName`, etwa „Fachplanung LST“), Liste `gewerke`,
  `Beteiligter` (Person der Projektbeteiligtenliste mit `funktionId`),
  `Protokoll` mit `reiheId`, `teilnehmer` (`Teilnehmer` mit `beteiligterId`)
  und `tops` (`Top` mit `eintraege`; `Eintrag` vom Typ `I`, `F` oder `A`,
  `EINTRAG_TYP_LABEL`; `vor` hält den Stand im Vorprotokoll, `uebernommenIn`
  das Folgeprotokoll einer weitergeführten Aufgabe, `lopPunktId` – nur intern –
  den LOP-Punkt einer in die LOP übernommenen Aufgabe, `entfaellt` einen
  gestrichenen Eintrag) sowie je Projekt eine
  `Lop` mit `themen`, `punkte` (`LopPunkt` mit fester `nr`, `vor` und
  `archiviertAb`), `naechsteNr` und `fortschreibungen`. Teilnahmestatus in
  `TEILNAHME` (anwesend, entschuldigt, abwesend, nur Verteiler).
* Schlüssel `projektsteuerung.data.v1` im `localStorage`
  (`src/bereiche/projektsteuerung/store/storage.ts`), `DATEN_VERSION = 3`. `aufbereiten()` ergänzt
  fehlende Felder (`entfaellt` als false), ergänzt die Gewerke der Funktionen
  in `gewerke` und legt je Projekt genau eine LOP an. `migriere()` hebt
  Fassung 1 (ohne Gewerke und LOP-Verweise) an: Sie erhält `STANDARD_GEWERKE`,
  ihre Funktionen gelten als übergreifend; Fassung 2 kannte keine gestrichenen
  Einträge. Ohne gespeicherten Bestand lädt `seedDaten()`
  (`src/bereiche/projektsteuerung/domain/seed.ts`) die Gewerke (`STANDARD_GEWERKE`: 50 Hz, KIB, LST, OLA,
  TK), die Standard-Funktionen (`STANDARD_FUNKTIONEN`, je Gewerk die
  Fachplanung, für LST und OLA zusätzlich die Bauüberwachung) und zwei
  Projekte mit Projektbeteiligten, zwei Protokollen einer Reihe und LOP;
  Termine relativ zum heutigen Tag.
* Alle Schreibzugriffe über `mutate()` in `src/bereiche/projektsteuerung/store/store.tsx`. Danach
  gleicht `teilnehmerNachziehen` (`src/bereiche/projektsteuerung/domain/protokoll.ts`) Name, Funktion,
  Firma und Kürzel verknüpfter Teilnehmender mit der Projektbeteiligtenliste
  ab; ist die Person gelöscht, bleiben die Angaben stehen und der Verweis
  entfällt. `lopVerweiseNachziehen` löst Verweise auf LOP-Punkte, die es nicht
  mehr gibt.

### 8.2 Routen

| Route | Seite | Aktionen |
| --- | --- | --- |
| `#/projektsteuerung` bzw. `#/projektsteuerung/uebersicht` | Übersicht (`src/bereiche/projektsteuerung/pages/Uebersicht.tsx`) | Kacheln „Aktive Projekte“, „Offene Punkte“, „Überfällig“, „Demnächst fällig“. Karte „Offene Punkte“ aus LOP und Aufgaben der Protokolle (`offenePunkte` in `src/bereiche/projektsteuerung/domain/punkte.ts`), Filter Alle / Überfällig / Fällig, zunächst zehn Zeilen (`ANZAHL_PUNKTE`), je Zeile „Erledigt“; ein Klick führt zur LOP bzw. zum Protokoll (`punktZiel`). Karte „Projekte“ mit Beteiligten, Protokollen, letzter Besprechung, nächstem Termin, offenen und überfälligen Punkten. Angezeigt werden markierte Projekte, ohne Markierung alle (`sichtbareProjekte`). |
| `#/projektsteuerung/projekte` | Projekte (`src/bereiche/projektsteuerung/pages/Projekte.tsx`) | Projektkarten mit Nummer, Status, ★-Markierung und der Zahl der Beteiligten, Protokolle und offenen Punkte; „Neues Projekt“ (`ProjektDialog`: Projektnummer, Status, Projektname, Beschreibung). |
| `#/projektsteuerung/funktionen` | Funktionen (`src/bereiche/projektsteuerung/pages/Funktionen.tsx`) | Reiter „Übergreifend“ und je Gewerk, **+** legt ein Gewerk an (`GewerkDialog` in `src/bereiche/projektsteuerung/components/GewerkDialog.tsx`). Je Seite die Funktionen mit Suche und Spalten Kürzel, Gewerk, Beschreibung, „Verwendet“; „Neue Funktion“ und Bearbeiten per Klick (`FunktionDialog` in `src/bereiche/projektsteuerung/components/FunktionDialog.tsx`: Bezeichnung, Gewerk mit „Gewerk“ zum Anlegen, Kürzel – leer aus der Bezeichnung gebildet, `kuerzelAus` –, Farbe, Beschreibung); auf Gewerkseiten „Vorhandene Funktion“ (Funktion eines anderen Gewerks übernehmen, Kürzel nach `kuerzelFuer`) und „Gewerk „…“ löschen“ (`GewerkLoeschenDialog`, entfernt das Gewerk samt Funktionen). Funktionen und Gewerke, die Projektbeteiligte tragen, lassen sich nicht löschen. |
| `#/projektsteuerung/projekt/<id>/<seite>` | Projekt (`src/bereiche/projektsteuerung/pages/ProjektDetail.tsx`) | Kopfzeile mit Nummer, Status, Beschreibung, „Bearbeiten“ und „Löschen“ (samt Beteiligten, Protokollen und LOP). Seiten `beteiligte` („Projektbeteiligte“), `protokolle` („Protokolle“) und `lop` („LOP“); ohne gültige Angabe `beteiligte`. Siehe 8.3 bis 8.5. |
| `#/projektsteuerung/projekt/<id>/protokoll/<id>` | Protokoll (`src/bereiche/projektsteuerung/pages/projekt/ProtokollEditor.tsx`) | Siehe 8.4. |

Router: `src/bereiche/projektsteuerung/lib/router.ts`; unbekannte Adressen führen auf die Übersicht.

### 8.3 Projektbeteiligte

`src/bereiche/projektsteuerung/pages/projekt/Beteiligte.tsx`: Tabelle mit Funktion (Farbpunkt, volle
Bezeichnung und Kürzel), Person, Firma / Büro und Kontakt – nur Personen,
keine leeren Funktionen; übergreifende Funktionen zuerst, dann nach Gewerk,
Funktion und Nachname (`nachFunktion`). Reiter „Alle“, „Übergreifend“ und je
Gewerk, das im Projekt vorkommt. Suche, „Excel-Import“ (siehe unten),
„Drucken / PDF“ (`beteiligteHtml` und `blattDrucken` in
`src/bereiche/projektsteuerung/domain/druck.ts`), „Excel“ (`beteiligteExportieren` in
`src/bereiche/projektsteuerung/domain/export.ts`), „Person hinzufügen“. Dialog `BeteiligterDialog`
(`src/bereiche/projektsteuerung/components/BeteiligterDialog.tsx`): Funktion als Auswahl der
projektübergreifenden Funktionen mit „+ Neue Funktion anlegen …“ (öffnet
`FunktionDialog`; die neue Funktion ist danach gewählt), Anrede, Vorname,
Nachname, Firma / Büro, Kürzel (leer: Kürzel der Funktion, `kuerzelVon`),
E-Mail, Telefon, Mobil, Anschrift, Notiz; die Funktionsauswahl ist nach
Gewerk gruppiert, der Hinweis nennt, wer die Funktion im Projekt bereits führt;
„Person löschen“.

Excel-Import (`BeteiligteImport` in
`src/bereiche/projektsteuerung/components/BeteiligteImport.tsx`, Logik in
`src/bereiche/projektsteuerung/domain/beteiligteImport.ts`): .xlsx oder .csv, Kopfzeile in den ersten 15
Zeilen gesucht, Spalten nach `BETEILIGTE_KOPF` (Funktion, Gewerk, Kürzel,
Anrede, Vorname, Nachname, Firma / Büro, E-Mail, Telefon, Mobil, Anschrift,
Notiz) mit weiteren Schreibweisen; statt Vor- und Nachname genügt „Name“
(„Berger, Anna“ oder „Anna Berger“). Funktionen über `funktionFinden`
(Bezeichnung und Gewerk, volle Bezeichnung, eindeutige Bezeichnung, Kürzel);
fehlende werden samt Gewerk angelegt. Personen gleichen Namens im Projekt
werden mit den ausgefüllten Angaben aktualisiert. Die Vorschau nennt je
Zeile „wird aktualisiert“, „neue Funktion“, „neues Gewerk“, „ohne Funktion“
bzw. „doppelt in der Liste“. „Vorlage“ lädt `Vorlage_Projektbeteiligte.xlsx`
(`beteiligteVorlageLaden`); die Excel-Ausgabe hat dieselben Spalten.

### 8.4 Protokolle

* Liste (`src/bereiche/projektsteuerung/pages/projekt/Protokolle.tsx`): je Reihe (`reihenVon`) eine
  Karte mit „Folgeprotokoll“ und den Protokollen (Datum, Bezeichnung,
  Anwesende, übernommene Einträge, offene Aufgaben; „Öffnen“,
  „Folgeprotokoll“, Löschen). „Neue Protokollreihe“ (`NeueReiheDialog`:
  Besprechung mit Vorschlägen aus `BESPRECHUNG_VORSCHLAEGE`, Datum, Beginn,
  Ort; die Protokollführung übernimmt die angemeldete Person, wenn ihr Name in
  der Projektbeteiligtenliste steht). „Aus Protokoll-Tool“ liest `.protokoll`-
  und `.json`-Dateien des Protokoll-Tools (`ausProtokollTool`); Teilnehmende
  gleichen Namens werden mit der Projektbeteiligtenliste verknüpft,
  Protokolle gleicher Kennung im Projekt ersetzt. Karte „Aufgaben aus den
  Protokollen“ (`protokollAufgaben`: Aufgaben ohne `uebernommenIn`) mit
  Filter Offen / Erledigt / Alle, Verantwortlich und „nur überfällige“,
  Haken zum Erledigen. Karte „Logos im Druckkopf“
  (`src/bereiche/projektsteuerung/components/Logos.tsx`): „Logo hinzufügen“ (PNG, JPEG, SVG, WebP;
  Rasterbilder auf `LOGO_HOEHE` = 240 px Höhe verkleinert), Reihenfolge,
  Entfernen, „Standardlogos“.
* Editor (`src/bereiche/projektsteuerung/pages/projekt/ProtokollEditor.tsx`): Umschalter „Bearbeiten“ /
  „Druckansicht“, „Live-Druckansicht ↗“ (`useLiveDruck` in
  `src/bereiche/projektsteuerung/components/common.tsx`: ein eigenes Fenster, das der jeweils
  geöffneten Ansicht folgt), „Drucken / PDF“, „Folgeprotokoll anlegen“.
  Karte „Kopfdaten“ (Besprechung, Nr., Datum, Beginn, Ende, Ort, „Nächster
  Termin“, „Protokollführung“ aus Teilnehmenden oder Projektbeteiligten,
  „Verteiler (zusätzlich)“); Karte „Teilnehmende“ („Aus Beteiligtenliste …“
  mit Mehrfachauswahl und „Neue Person …“, „Weitere Person“ für Gäste,
  Status aus `TEILNAHME`; das Personensymbol nimmt Gäste in die
  Projektbeteiligtenliste auf); „Tagesordnung“ („TOP hinzufügen“,
  verschieben, löschen; Einträge mit Umschalter I/F/A, Verantwortlich mit
  Vorschlägen aus den Kürzeln der Projektbeteiligten – `KuerzelListe` –, bei
  Aufgaben Termin und „erledigt“; der Papierkorb „Aus dem Protokoll löschen“
  öffnet den Dialog `EintragLoeschenDialog` mit „Durchstreichen“ und „Sofort
  löschen“, ein leerer Eintrag entfällt sofort; gestrichene Einträge zeigen
  „entfällt“, einen Hinweis zum weiteren Verlauf und „Wiederherstellen“);
  Karte „Abschluss“ („Hinweis am
  Protokollende“, Vorgabe `STANDARD_HINWEIS`). Übernommene Einträge zeigen den
  Ursprungstext fest („Ursprungstext korrigieren“) und ein eigenes Feld für
  die Ergänzung.
* In die LOP übernehmen (`aufgabenInLop` in
  `src/bereiche/projektsteuerung/domain/lopUebernahme.ts`, Store `aufgabenInLopUebernehmen`): offene,
  nicht weitergeführte Aufgaben (`uebernehmbareAufgaben`) einzeln über „→ In
  die LOP übernehmen“ am Eintrag oder gesammelt über „Aufgaben in die LOP …“
  (Dialog „Aufgaben in die LOP übernehmen“ mit Auswahl). Jede wird ein neuer
  LOP-Punkt im Thema, das wie ihr Tagesordnungspunkt heißt (`zielThema`; fehlt
  es, entsteht es); als Herkunft stehen Besprechung, Nummer und Punkt des
  Protokolls. Die Aufgabe erhält `lopPunktId`; nur der Editor zeigt „In die
  LOP übernommen (Nr. …) – nur intern, nicht im Druck“ mit „Verknüpfung
  lösen“. Im Protokoll läuft sie weiter wie jede andere, auch in
  Folgeprotokolle. „Erledigt“ gleicht `lopStatusAbgleichen` nach jeder
  Änderung in beide Richtungen ab – zwischen dem LOP-Punkt und dem jüngsten
  Vorkommen der Aufgabe im jüngsten Protokoll ihrer Reihe. Die Übersicht
  (`allePunkte` in `src/bereiche/projektsteuerung/domain/punkte.ts`) zählt sie nur über die LOP.
* Folgeprotokoll (`folgeprotokoll` in `src/bereiche/projektsteuerung/domain/protokoll.ts`): Nummer =
  höchste der Reihe + 1 (`naechsteNr`), Datum = nächster Termin des
  Vorprotokolls, Teilnehmende mit Status anwesend (außer nur Verteiler),
  alle Einträge außer denen, die schon im Vorprotokoll erledigt bzw.
  gestrichen waren (`letztmalig`), und Aufgaben, die bereits weitergeführt
  wurden (`mitgehen`). Erledigte und gestrichene Einträge (`abgeschlossen`)
  gehen also noch einmal mit und entfallen im übernächsten Protokoll.
  Ergänzungen gehen in den Text über, `herkunft` nennt Protokoll und Punkt des
  Ursprungs. Wird ein Protokoll gelöscht,
  gelten die von ihm weitergeführten Aufgaben im Vorprotokoll wieder als
  offen.
* Druckfassung `protokollHtml` (`src/bereiche/projektsteuerung/domain/druck.ts`): Kopf mit Logos,
  Datum, Zeit, Ort, Protokollführung, Teilnehmende und Verteiler, Legende,
  Tabelle Nr. / Inhalt / Typ / Verantwortlich / Termin, nächster Termin,
  „Aufgestellt:“ und „Freigegeben:“, Hinweis. Neue und gegenüber dem
  Vorprotokoll geänderte Angaben stehen blau (`eintragNeu`, `topNeu`).
  Erledigte und gestrichene Einträge stehen durchgestrichen (Klasse
  `ps-gestrichen`): mit blauer Linie, wenn sie in diesem Protokoll erledigt
  bzw. gestrichen wurden (`neuGestrichen`, `ps-gestrichen-neu`), sonst mit
  schwarzer; der Text behält seine Farbe. Die Termin-Spalte nennt „entfällt“
  bzw. „erledigt“, die Legende „Durchgestrichene Einträge sind erledigt oder
  entfallen.“ Verweise auf die LOP erscheinen nicht. „Als Text kopieren“
  nutzt `alsText` (gestrichene Einträge mit „(entfällt)“, ohne LOP-Verweis).

### 8.5 LOP

`src/bereiche/projektsteuerung/pages/projekt/Lop.tsx`, Logik in `src/bereiche/projektsteuerung/domain/lop.ts`:

* Umschalter „Bearbeiten“ / „Druckansicht“, „Live-Druckansicht ↗“, „Drucken /
  PDF“, „Excel“ (`lopExportieren` in `src/bereiche/projektsteuerung/domain/export.ts`: Blätter „LOP“
  und „Archiv“), „Fortschreiben …“. Kopfkarte mit den Kennzahlen „Offen“,
  „Überfällig“, „Erledigt in diesem Stand“ und „Im Archiv“ sowie „Datum des
  Stands“, „Aufgestellt von“ (Projektbeteiligte) und „Hinweis am Ende der
  Liste“. Filter: Suche, Alle / Offen / Erledigt, Verantwortlich, „nur
  überfällige“. Je Thema eine Karte (Titel, verschieben, löschen, „Punkt“);
  je Punkt Nummer, Text (bei Punkten aus früheren Ständen fest, mit Feld für
  die Fortschreibung), Herkunft, Verantwortlich, Termin und „erledigt“ mit
  Datum. „Thema hinzufügen“; Karte „Archiv“ mit „Wieder aufnehmen“.
* `punktAnfuegen` vergibt `naechsteNr`; Nummern werden nie neu vergeben.
* `fortschreiben`: Stand + 1, Ergänzungen gehen in den Text über, `vor` hält
  den abgeschlossenen Stand, erledigte Punkte erhalten `archiviertAb`; der
  abgeschlossene Stand kommt mit Datum in `fortschreibungen`. Dialog „LOP
  fortschreiben“ mit „Datum des neuen Stands“ und Druck des bisherigen
  Stands. Ältere Stände werden nicht aufbewahrt.
* Druckfassung `lopHtml`: Stand, Datum, Aufgestellt, offene Punkte; neue und
  geänderte Angaben blau (`punktNeu`, `themaNeu`), überschrittene Termine
  fett.

### 8.6 Übergreifende Bedienelemente

* Seitenleiste: Übersicht (mit der Zahl überfälliger Punkte), Projekte,
  Funktionen, darunter die markierten Projekte mit ihren überfälligen
  Punkten; unten „Angemeldet als“ (Name, Vorgabe `STANDARD_BEARBEITER =
  'Projektsteuerung MIC'`, und „Farbmodus für Rot-Grün-Sehschwäche (hoher
  Kontrast)“), „Sicherung“, „Einspielen“, „Zurücksetzen“ und „Bereich
  wechseln“.
* Ampel (`ampelFuer` in `src/bereiche/projektsteuerung/domain/punkte.ts`, Bezeichnungen in
  `AMPEL_LABEL`): erledigt, überfällig, demnächst fällig (`VORLAUF_TAGE = 7`
  Tage vorher), im Plan, ohne Termin.
* Sicherung (`exportiereDaten`) lädt `projektsteuerung-sicherung-<Datum>.json`
  mit `"bereich": "projektsteuerung"`. Einspielen
  (`src/bereiche/projektsteuerung/components/Sicherung.tsx`) fragt „Sicherung einspielen?“, bietet
  „Aktuellen Stand sichern“ und übernimmt „Angemeldet als“ und Farbmodus nur
  mit dem Haken „Auch „Angemeldet als“ und Farbmodus aus der Sicherung
  übernehmen“.

### 8.7 Meldungen

| Meldung | Fundstelle | Ursache |
| --- | --- | --- |
| „Bitte einen Projektnamen angeben.“ | `src/bereiche/projektsteuerung/pages/Projekte.tsx` | Projekt ohne Namen. |
| „Bitte eine Bezeichnung angeben.“ | `src/bereiche/projektsteuerung/components/FunktionDialog.tsx`, `src/bereiche/projektsteuerung/components/GewerkDialog.tsx` | Funktion bzw. Gewerk ohne Bezeichnung. |
| „Die Funktion „…“ gibt es bereits.“ | `src/bereiche/projektsteuerung/components/FunktionDialog.tsx` | Bezeichnung im selben Gewerk schon vergeben (ohne Rücksicht auf Groß- und Kleinschreibung). |
| „„…“ ist bereits angelegt.“ | `src/bereiche/projektsteuerung/components/GewerkDialog.tsx` | Gewerk gibt es schon (auch „Übergreifend“). |
| „Funktionen des Gewerks „…“ sind noch Projektbeteiligten zugeordnet – das Gewerk lässt sich deshalb nicht löschen.“ | `src/bereiche/projektsteuerung/pages/Funktionen.tsx` | Löschen eines Gewerks, dessen Funktionen Personen tragen. |
| „In der Datei fehlt eine Spalte „Nachname“ oder „Name“.“ | `src/bereiche/projektsteuerung/domain/beteiligteImport.ts` | Excel-Import ohne erkennbare Kopfzeile. |
| „Die Datei enthält keine Zeile mit einem Nachnamen.“ | `src/bereiche/projektsteuerung/components/BeteiligteImport.tsx` | Excel-Import ohne verwertbare Zeile. |
| „Aufgabe als LOP-Punkt Nr. … übernommen.“ / „… Aufgaben in die LOP übernommen (Nr. …).“ | `src/bereiche/projektsteuerung/pages/projekt/ProtokollEditor.tsx` | Kein Fehler: Aufgaben wurden in die LOP übernommen. |
| „Eintrag … durchgestrichen.“ / „Eintrag … gelöscht.“ | `src/bereiche/projektsteuerung/pages/projekt/ProtokollEditor.tsx` | Kein Fehler: „Durchstreichen“ bzw. „Sofort löschen“ im Dialog „Eintrag … aus dem Protokoll löschen?“. |
| „„…“ ist noch … Projektbeteiligten zugeordnet und lässt sich deshalb nicht löschen.“ | `src/bereiche/projektsteuerung/pages/Funktionen.tsx` | Löschen einer Funktion, die Personen tragen. |
| „Bitte eine Funktion wählen.“ / „Bitte einen Nachnamen angeben.“ | `src/bereiche/projektsteuerung/components/BeteiligterDialog.tsx` | Pflichtangaben einer Person fehlen. |
| „Bitte die Besprechung benennen.“ / „Bitte das Datum angeben.“ | `src/bereiche/projektsteuerung/pages/projekt/Protokolle.tsx` | Neue Protokollreihe ohne Besprechung bzw. Datum. |
| Dateiname mit „ist keine gültige JSON-Datei“, „enthält keine Protokolle“ bzw. „ist keine gültige Protokolldatei“ | `src/bereiche/projektsteuerung/domain/protokoll.ts` | Übernahme aus dem Protokoll-Tool mit unpassender Datei. |
| „Das Vorschaufenster wurde blockiert. Bitte Pop-ups für KaPlan zulassen und erneut auf „Live-Druckansicht“ klicken.“ | `src/bereiche/projektsteuerung/components/common.tsx` | Der Browser verhindert das Fenster der Live-Druckansicht. |
| „Kopieren nicht möglich.“ | `src/bereiche/projektsteuerung/pages/projekt/ProtokollEditor.tsx` | Zwischenablage nicht erreichbar. |
| „Die Datei ist keine gültige JSON-Datei.“ | `src/bereiche/projektsteuerung/store/storage.ts` | Einspielen einer Datei, die kein JSON ist. |
| „Die Datei ist eine Sicherung des Planlaufmanagements – bitte dort einspielen.“ | `src/bereiche/projektsteuerung/store/storage.ts` | Das JSON enthält `projects`. |
| „Die Datei ist eine Sicherung der Baubetriebsplanung – bitte dort einspielen.“ | `src/bereiche/projektsteuerung/store/storage.ts` | Kennzeichen `"bereich": "baubetrieb"`. |
| „Die Datei stammt aus dem Protokoll-Tool – bitte im Projekt unter „Protokolle“ importieren.“ | `src/bereiche/projektsteuerung/store/storage.ts` | Das JSON enthält `protocols`. |
| „Die Datei ist keine Sicherung der Projektsteuerung.“ | `src/bereiche/projektsteuerung/store/storage.ts` | Kennzeichen `bereich` fehlt oder Listen fehlen. |
| „Die Sicherung stammt aus einer neueren Fassung von KaPlan. Bitte die Seite neu laden (Strg+Umschalt+R) und erneut einspielen.“ | `src/bereiche/projektsteuerung/store/storage.ts` | `version` größer als `DATEN_VERSION`. |
| Seite „Nicht gefunden“ | `src/bereiche/projektsteuerung/App.tsx` | Adresse nennt ein Projekt oder Protokoll, das es nicht (mehr) gibt. |
