# Inventar der Anwendung

Stand: Analyse des Quellcodes im Repository `Mailander-Consult-GmbH/MC-Plan`
(Zweig `main`). Es sind ausschließlich Sachverhalte
aufgeführt, die sich im Code belegen lassen; Dateipfade verweisen auf die
jeweilige Fundstelle.

## 1. Zweck der Anwendung

**KaPlan** besteht aus den Bereichen **Planlaufmanagement**,
**Baubetriebsplanung**, **Projektsteuerung** und **Leistungsnachweise**; die
letzten drei liegen als erster Entwurf vor. Dazu kommt das **Controlling** (mit
PIN), das die Projekte aller Bereiche im gemeinsamen Projektregister verwaltet
und das Controlling der Leistungsnachweise einbindet. Die Abschnitte 1 bis 6
beschreiben das Planlaufmanagement, Abschnitt 7 die Baubetriebsplanung,
Abschnitt 8 die Projektsteuerung, Abschnitt 9 Projektregister und Controlling,
Abschnitt 10 die Leistungsnachweise.

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
`hatEigenenPlanlauf` in `types.ts`. Den Weg durch einen Workflow – samt
parallelen Blöcken, Ausstiegen und Rücksprüngen – bestimmt allein die
Ablaufverfolgung in `src/bereiche/planlauf/domain/ablauf.ts` (`nachfolger`,
`verfolgen`). Die Anwendung rechnet aus den Fristen je Schritt die
Soll-Termine ab dem tatsächlichen Eingang (`recalcSollDaten` in `engine.ts`),
überwacht sie mit einer Ampel (im Plan / fällig / überfällig), schätzt das Ende
eines Laufs (`prognose` in `src/bereiche/planlauf/domain/simulation.ts`), weist
den Verzug gegenüber dem Basisplan je Seite nach
(`terminnachweis` in `src/bereiche/planlauf/domain/nachweis.ts`) und bereitet
Erinnerungen als E-Mail für Outlook vor (`ampelFuerSchritt`,
`src/bereiche/planlauf/components/EmailDialog.tsx`). Sie läuft vollständig im
Browser: Der gesamte Bestand liegt in `localStorage`, ein Server wird nicht
angesprochen (`src/bereiche/planlauf/store/storage.ts`).

## 2. Routen und Seiten

Die Anwendung besteht aus vier getrennten Bereichen und dem Controlling. Die
erste Wegmarke der Adresse benennt den Bereich; die Shell (`src/shell/router.ts`)
wählt danach aus, welcher Bereich geladen wird: `#/` zeigt die Bereichsauswahl
(`src/shell/Start.tsx`: fünf hochkante Kacheln – Planlaufmanagement,
Baubetriebsplanung, Projektsteuerung, Leistungsnachweise und Controlling, die
mittleren drei mit dem Kennzeichen „Erster Entwurf“, das Controlling mit „Mit
PIN“ aus `marke` in `src/shell/bereiche.ts`; unter 1240 px drei, unter 900 px
zwei, unter 720 px eine je Zeile; am Fuß „Fassung vom …“ mit Bauzeit und – im
Build des Workflows – Commit, `fassungText` in `src/shared/pwa.ts`),
`#/planlauf/…` das Planlaufmanagement,
`#/baubetrieb/…` die Baubetriebsplanung (Abschnitt 7), `#/projektsteuerung/…`
die Projektsteuerung (Abschnitt 8), `#/leistungsnachweise/…` die
Leistungsnachweise (Abschnitt 10), `#/controlling/…` das Controlling
(Abschnitt 9). Innerhalb des Bereichs adressiert ein Hash-Router ohne
Bibliothek (`src/bereiche/planlauf/lib/router.ts`); unbekannte Adressen führen
auf die Übersicht. Adressen aus der Fassung ohne Bereiche (`#/dashboard`,
`#/projekt/<id>/<reiter>` …) werden beim Aufruf auf `#/planlauf/…` umgelenkt
und bleiben damit als Lesezeichen gültig.

### 2.1 Hauptrouten

| Route | Seite | Aktionen |
| --- | --- | --- |
| `#/planlauf` bzw. `#/planlauf/dashboard` | Übersicht (`src/bereiche/planlauf/pages/Dashboard.tsx`) | Vier Kacheln: Laufende Planläufe, To-Dos (Planlaufmanagement), Überfällige Schritte, Demnächst fällig – die beiden letzten führen per Klick auf `#/planlauf/fristen`. Tabelle „Meine To-Dos“ mit Schritt, Gewerk, Projekt, Soll-Termin, Status, Erinnerungs-Mail und Erledigt-Haken. Tabelle „Projekte“ mit Anzahl Pläne/Verzeichnisse, laufenden Planläufen, demnächst fällig, überfällig, Fortschrittsbalken und „Projekt öffnen“. Angezeigt werden markierte Projekte; ohne Markierung alle (`sichtbareProjekte`), archivierte (Abschnitt 9) in keinem Fall. |
| `#/planlauf/fristen` | Fristen & Erinnerungen (`src/bereiche/planlauf/pages/Fristen.tsx`) | Alle anstehenden Schritte über alle Projekte – bei parallelen Zweigen mehrere je Planlauf (`offeneFristen` in `engine.ts`) –, gegliedert nach Projekt; je Schritt „E-Mail vorbereitet am …“, wenn schon erinnert wurde. Filter Alle / Überfällig / Fällig / Im Plan mit Zählern, Suche über Schritt, Planlauf, Projekt, Funktion, Nachname und Firma. Je Zeile: Planlauf öffnen, Erinnerungs-Mail vorbereiten, Schritt als erledigt setzen. Kein Eintrag in der Seitenleiste – erreichbar über die Kacheln der Übersicht. |
| `#/planlauf/projekte` | Projekte (`src/bereiche/planlauf/pages/Projekte.tsx`) | Projektliste mit Suche über Name, Nummer und Beschreibung; Projekt anlegen (übernimmt alle projektübergreifenden Funktionen als Projektfunktionen), bearbeiten, mit ★ markieren bzw. Markierung aufheben, Projekt öffnen. Die Kachel nennt Projektnummer, Name, Beschreibung (falls vorhanden), Status und ★, unten „Auch in“ mit den anderen Bereichen des Projekts; darunter „Archiv“ und „Projekte aus anderen Bereichen“ mit „Übernehmen in Planlaufmanagement“ (siehe 9.3). |
| `#/planlauf/ketten` | Workflows (`src/bereiche/planlauf/pages/Workflows.tsx`) | Karten unter „Projektübergreifende Workflows“ (Projektvarianten erscheinen nur im Reiter „Workflows“ ihres Projekts), je Karte Kennzeichen „Standard“, „Eigener Workflow“ oder „Projektvariante“, Zahlen und die Punktkette des Standardverlaufs (`AblaufVorschau` in `src/bereiche/planlauf/components/AblaufVorschau.tsx`); „Neuer Workflow“, „Öffnen“, „Duplizieren“, Löschen. „Öffnen“ startet den Workflow-Editor (`src/bereiche/planlauf/components/WorkflowEditor.tsx`, Logik in `src/bereiche/planlauf/domain/workflowGraph.ts`): Spalten „Standardverlauf“ und „Abweichungen“ mit Karten von „Planlauf starten“ bis „Planlauf beenden“, „Rücksprung“-Kennzeichen, „+“ („Schritt hier einfügen“), „Schritt hinzufügen“, Rückgängig/Wiederholen (Strg+Z/Strg+Y), „Übersicht“. „Schrittdetails“ je Schritt: Bezeichnung, Art (Aufgabe / Entscheidung), „Verantwortliche Funktion“, Frist, „Nachweis bei Abschluss“, „Weiter mit“ bzw. Antworten mit „→ Weiter mit“ und „Als Standardverlauf“, „E-Mail nach Abschluss“ samt Vorlage und „Anliegen in der Versandmail“ (keins / Freigabe / Vorprüfung / Prüfung / Genehmigung, `ANLIEGEN_OPTIONEN` und Feld `versandAnliegen` in `src/bereiche/planlauf/domain/types.ts`; dieselbe Auswahl in „Schritt anpassen“ des Planlaufs, `PlanlaufDetail.tsx`), „Im Standardverlauf“ früher/später (`imVerlaufVerschieben`), „Duplizieren“, „Entfernen“ (Verweise gehen an das Standardziel, `entfernen`). Hinweise in der Fußzeile aus `pruefen`; wer mit Änderungen schließt, erhält „Änderungen verwerfen?“. Parallele Blöcke: Containerkarte „Parallel · … Zweige“ mit „Weiter, wenn alle Zweige erledigt sind“, „Abweichungen im Zweig“ und „Ausstieg aus dem Block“; angelegt über „Schritt hinzufügen“ → „Parallele Zweige“ oder in den Schrittdetails „Parallel dazu ausführen“, gelöst über „Aus dem Block lösen“; Blöcke lassen sich nicht schachteln. Benennen im Abschnitt „Parallel“ der Schrittdetails mit „Name des Blocks“ und „Name des Zweigs“ (`blockBenennen`, `zweigBenennen` in `workflowGraph.ts`; Tippen zählt für Rückgängig als ein Schritt); ein Klick auf den Kopf der Containerkarte wählt den ersten Schritt des Blocks und fokussiert „Name des Blocks“. Ein benannter Block heißt „… · parallel, … Zweige“ (`blockTitel` in `ablauf.ts`), Zweigköpfe zeigen den Namen, sonst „Zweig …“ (`zweigTitel`). Die Namen stehen am Marker jedes Schritts (`name`, `zweigName` in `Parallel`, `src/bereiche/planlauf/domain/types.ts`); `namenVereinheitlichen` in `ablauf.ts` gleicht sie beim Ordnen der Blöcke an, `bereinigen` kürzt sie beim Speichern. Die Standard-Workflows benennen ihre Blöcke „Prüfung“, „Versand“ und „Postversand“ samt Zweigen (`BLOCK_NAMEN` in `seed.ts`). Je Antwort der Haken „führt zu Nacharbeit“. Ändert eine Umstellung den Anschluss hinter einem Block, meldet der Editor das (`bloeckeOrdnenMitHinweis` in `ablauf.ts`). |
| `#/planlauf/rollen` | Funktionen (`src/bereiche/planlauf/pages/Funktionen.tsx`) | Projektübergreifende Funktionen, gegliedert in „Übergreifend“ und je Gewerk. Neue Funktion anlegen (Bezeichnung, Kürzel, Farbe, Gewerk, Beschreibung), vorhandene Funktion eines anderen Gewerks übernehmen, bearbeiten, löschen. Über das **+** an den Reitern entsteht ein Gewerk, über „Gewerk … löschen“ am Seitenende entfällt es. Feld „Seite für den Verzug“ (Planer, Prüfer, Auftraggeber, PLM oder „nicht festgelegt“; `SEITE_LABEL` in `types.ts`, Auswahl in `src/bereiche/planlauf/components/SeiteAuswahl.tsx`), bei neuen Funktionen vorbelegt aus der Bezeichnung (`seiteAusFunktion`); Abzeichen in der Liste, „Seite offen“ ohne Seite. |
| `#/planlauf/terminrechner` | Terminrechner (`src/bereiche/planlauf/pages/Terminrechner.tsx`, Logik in `src/bereiche/planlauf/domain/terminrechner.ts`) | Menüpunkt „Terminrechner“ unter „Projekte“. „Richtung“: „Rückwärts“ („Termin auf der Baustelle → späteste Übergabe des Planers“ bzw. „Termin auf der Baustelle → spätester Start des Planlaufs“) oder „Vorwärts“ („Eingang der Planung → Ende des Planlaufs“ bzw. „Start des Planlaufs → Ende des Planlaufs“) – Anker ist die Übergabe des Planers, wenn der Workflow mit „Eingang PLM“ beginnt, sonst der Start. Eingaben: Projekt (Arbeitstage, Feiertage; „Ohne Projekt: Mo–Fr, ohne Feiertage“), Workflow (übergreifend und Projektvarianten), Datum, Fristen, „Szenario“ („Antwort je Entscheidung im ersten Durchlauf; Vorgabe ist der Standardverlauf.“) und „Zielschritt“ (Vorgabe „Ende des Planlaufs“). Gerechnet wird über `simulieren` bzw. `rueckwaerts` in `simulation.ts`, also mit denselben Regeln wie im Planlauf. „Zwischenergebnisse“ mit Schritt, Funktion, Frist, Eingang, Fristende und Puffer, auf dem kritischen Weg „spätestens“; Schritte in Zweigen mit „Zweig … von …“, bei benannten Zweigen mit dem Namen davor (`zweigKennung`); Druck über `src/shared/print.ts`. Zustände: „Noch kein Datum“, „Kein Workflow vorhanden“, „Der Workflow enthält keine Schritte“, „Das Datum ist ungültig.“, Schleife („Der Ablauf endet in diesem Szenario in einer Schleife – Terminrechnung nicht möglich.“), Grenze („Der Ablauf kommt auch nach 500 Abschlüssen nicht zum Ende – Terminrechnung abgebrochen.“, `SIMULATION_GRENZE`), Zielschritt nicht erreicht, Übergabe bzw. Start vor heute (frühestes Ende bei Übergabe bzw. Start heute) und „Das eingegebene Datum liegt vor heute – gerechnet wird trotzdem ab diesem Tag.“ |
| `#/planlauf/vorlagen` | Vorlagen (`src/bereiche/planlauf/pages/Vorlagen.tsx`) | Reiter **E-Mail-Texte**: Vorlagen anlegen, bearbeiten, löschen; Editor mit Bausteinen aus `PLATZHALTER` (`src/bereiche/planlauf/domain/email.ts`) und Vorschau mit Beispielwerten; Anlass je Vorlage (Erinnerung, Mahnung, Freigabe, Übergabe, Allgemein). Reiter **Excel-Vorlagen**: Vorlagen „Planliste“ und „Funktion“ als `.xlsx` herunterladen, mit Spaltenerläuterung. |
| `#/planlauf/projekt/<id>/<reiter>` | Projektarbeitsbereich (`src/bereiche/planlauf/pages/ProjektDetail.tsx`) | Ggf. Archivhinweis (9.3), Reiter siehe 2.2. Frühere Adressen werden umgeleitet: `planlaeufe` → `plaene`, `pakete` → `plaene`, `adressbuch` → `rollen`. |
| `#/planlauf/projekt/<id>/planlauf/<runId>` | Planlauf (`src/bereiche/planlauf/pages/projekt/PlanlaufDetail.tsx`) | Siehe 2.3. |

### 2.2 Reiter im Projekt

| Reiter | Seite | Aktionen |
| --- | --- | --- |
| `uebersicht` | Planläufe – Reiterbezeichnung „Planläufe“ (`src/bereiche/planlauf/pages/projekt/Uebersicht.tsx`, Liste in `src/bereiche/planlauf/components/PlanlaufListe.tsx`) | Kennzahlen (Planpakete, Planverzeichnisse, Pläne – je ein Klick führt auf die Planliste –, fällige und überfällige Schritte) und Gesamtfortschritt. Liste der Planläufe, gegliedert nach Planpaketen, je Eintrag in der Spalte „Aktueller Stand“ mit dem zuletzt erledigten Schritt vor dem offenen – übersprungene Schritte zählen nicht, nach dem Wiederöffnen eines früheren Schritts also nie ein späterer – und darunter in Grau seinem Ist-Datum („ohne Datum“, wenn keines eingetragen ist; `letzterAbgeschlossenerSchritt` in `src/bereiche/planlauf/domain/uebersicht.ts`), in der Spalte „Nächster Schritt“ mit dem offenen Schritt: Gliederung umschalten („Planpakete“ / „+ Pläne & Verzeichnisse“), Pakete und Planverzeichnisse am Pfeil auf- und zuklappen (Verzeichnisse zunächst zugeklappt; der Pfeil steht vor Symbol und Titel, sodass Pläne und Verzeichnisse auf einer Linie beginnen), Suche, Filter in den Spaltenüberschriften (Gewerk, Zuständig, Status – einschließlich „Angekündigt“), Sortierung je Spalte („Aktueller Stand“ nach dem Datum des zuletzt erledigten Schritts), Erinnerungs-Mail, Erledigt-Haken, Planlauf öffnen, „Export“ (`ExportDialog.tsx`, siehe `einstellungen`; bei gesetztem Filter sind die gezeigten Einträge vorgewählt – „Vorgewählt sind die Einträge, die der Filter im Reiter „Planläufe“ zeigt.“). Welche Läufe die Liste zeigt und wie sie sie gliedert, legen `massgeblicheLaeufe`, `gliederungBilden` und `knotenBilden` in `uebersicht.ts` fest – dieselben Funktionen gliedern den Export. Die Bezeichnung steht gelb, solange „Eingang PLM“ aussteht – diese Läufe tragen den Status „Angekündigt“, ist der Eingang überfällig jedoch „Überfällig“; Filter und Sortierung folgen derselben Regel –, und grün, wenn der Lauf abgeschlossen ist. Unter einem gebündelten Verzeichnis stehen seine Pläne mit „läuft im Planlauf des Verzeichnisses mit“ – solange der Verzeichnislauf läuft, mit der Schaltfläche „Herauslösen …“ (`planHerausloesen`; die Liste bleibt danach stehen) –, herausgelöste Pläne dagegen mit ihrem eigenen Schritt und Status. Ein Verzeichnis mit Plänen einzeln erscheint als Zeile „… · Pläne einzeln“ ohne eigenen Lauf, mit der Zahl seiner laufenden Pläne, dem aus ihnen zusammengefassten Fortschritt und Status (wie ein Planpaket) und der Schaltfläche „Bündeln …“; seine Pläne stehen darunter. Abgebrochene Läufe – ersatzlos wie durch neuen Index ersetzt – stehen gesammelt am Ende unter der zunächst zugeklappten Zeile „Abgebrochen · … Planläufe“, ausgegraut ohne Schritt, Fortschritt und Schaltflächen, mit dem Index des abgebrochenen Laufs, „Abgebrochen am …“ und dem Zusatz *ersatzlos* bzw. *ersetzt durch Index …*. Aufgeteilte bzw. wieder gebündelte Läufe erscheinen dort nicht (`laufUeberfuehrt` in `engine.ts`). Fortschrittsbalken stehen immer in der Hausfarbe; der Fortschritt ist nach Fristen gewichtet und schließt die laut Prognose noch ausstehenden Ausführungen ein (`fortschritt` in `engine.ts`, Mittel in `mittlererFortschritt`). Nach einem Rücksprung nennt „Aktueller Stand“ den zuletzt bis zum Wiedereingang erledigten Schritt. Stehen in parallelen Zweigen mehrere Schritte an, zeigt die Zeile den führenden mit „+… parallel“ (`src/bereiche/planlauf/components/common.tsx`); Erinnerungs-Mail und Erledigt-Haken fragen dann nach dem Schritt („… Schritte stehen an – welcher ist erledigt?“; Menü „Welcher Schritt ist erledigt?“ bzw. „Erinnerung zu welchem Schritt?“, `AufklappMenue`), Status, Filter und Suche berücksichtigen alle anstehenden Schritte. **Mehrfachauswahl:** Kästchen-Spalte – Planpaket, „Ohne Planpaket“, Verzeichnis und Kopfzeile wählen ihren Inhalt dreistufig, abgebrochene Läufe sind nicht wählbar; Aktionsleiste („Aktionen für die Auswahl“, „… ausgewählt“) mit „Schritte erledigen …“ (`src/bereiche/planlauf/components/SammelErledigen.tsx`: Ist-Datum, erledigt oder übersprungen, je Lauf die anstehenden Schritte, gemeinsame Antwort und Nachweis-Nr. für gleichnamige Schritte, Vorschau mit Rücksprüngen und Abschlüssen, danach Ergebnis und auf Wunsch „E-Mail senden“; Store `schritteAbschliessen`), „Erinnern …“ (`src/bereiche/planlauf/components/SammelErinnern.tsx`: eine Zeile je Person mit Outlook, Web, Kopieren und „Kopieren (formatiert)“), „Versandmail …“ (dieselbe Komponente mit `art="versand"`, Titel „Versandmail“: je Empfänger und Anliegen eine E-Mail mit der Vorlage „Versand“ über alle gewählten Pläne am Versandschritt – `versandPosten` in `src/bereiche/planlauf/domain/email.ts`: steht ein Versandschritt an, sind die Zuständigen der Schritte danach Empfänger, steht ein Schritt direkt nach einem erledigten Versandschritt an, dessen Zuständige; vermerkt wird am anstehenden Schritt; Läufe ohne Versandschritt nennt „Ohne Versandschritt und hier außen vor: …“), „Exportieren …“ („Vorgewählt ist Ihre Auswahl im Reiter „Planläufe“.“) und „Auswahl aufheben“. Vor den Aktionen wird die Auswahl in Planläufe aufgelöst; ein mitlaufender Plan wirkt auf den Lauf seines Verzeichnisses. |
| `plaene` | Planliste (`src/bereiche/planlauf/pages/projekt/Plaene.tsx`) | Alle Pläne und Planverzeichnisse mit laufender Nummer, Art, Bezeichnung/Titel, Gewerk, zugehörigem Planverzeichnis und Eingang Soll, gegliedert nach Planpaketen: je Paket eine Kopfzeile mit Name, Kurzzeichen, Gewerk und Zahl der angezeigten Einträge samt eingerückter Pläne („noch nichts zugeordnet“ bei leeren Paketen) – der Pfeil klappt sie zu, ein Klick öffnet das Paket –, danach die Einträge ohne Paket, sobald Pakete angezeigt werden unter „Ohne Planpaket · …“ (gleich gezählt). Leere Pakete erscheinen ohne Suche und Filter bzw. wenn Name, Kurzzeichen oder Gewerk zur Suche passen; die Suche erfasst auch den Paketnamen. Die Schaltflächen über der Liste brechen auf schmalen Bildschirmen um. „Neues Planpaket“ und die Kopfzeilen öffnen den Paketdialog (`src/bereiche/planlauf/components/PaketDialog.tsx`): Name, Kurzzeichen, Gewerk, Bemerkung, Löschen mit Rückfrage – die Einträge bleiben mit ihren Planläufen erhalten und verlieren ihre Paketzuordnung (`deleteDocument`) –, beim Bearbeiten außerdem „Inhalt“ (mit dem Hinweis „gilt sofort“) mit „Entfernen“ je Eintrag und „Hinzufügen:“ für Planverzeichnisse und Pläne ohne Verzeichnis und ohne (noch vorhandenes) Paket; Pläne eines Verzeichnisses folgen dessen Paket (`paketVon` in `uebersicht.ts`). Reines Ordnungsmerkmal ohne Einfluss auf Planläufe. Pläne eines Planverzeichnisses stehen unter ihm, mit Symbol, Art und Titel eingerückt; der Pfeil zum Auf- und Zuklappen steht zwischen Nummer und Symbol (zunächst aufgeklappt). Ist das Verzeichnis ausgefiltert, stehen seine Pläne für sich. Filter (Alle / Pläne / Verzeichnisse), Suche, Sortierung je Spalte. Einträge, deren Planlauf noch beim Schritt „Eingang PLM“ steht, tragen eine gelbe Bezeichnung und das Kennzeichen „Angekündigt“; bei abgeschlossenen Läufen steht die Bezeichnung grün. Kennzeichen „Pläne einzeln“ an Verzeichnissen mit Einzelläufen, „eigener Lauf“ an herausgelösten Plänen eines gebündelten Verzeichnisses. Eintrag anlegen (startet zugleich den Planlauf, sofern der Eintrag einen eigenen hat; „Ablauf dieses Planlaufs“ zeigt den gewählten Workflow, „Individueller Workflow“ öffnet den Workflow-Editor nur für diesen Lauf, Kennzeichen „Individuell angepasst“, „Auf Workflow zurücksetzen“ – `LaufSchritte` in `AblaufVorschau.tsx`), bearbeiten, löschen – beim Löschen eines gebündelten Verzeichnisses bleiben seine Pläne als Einzelpläne im Paket des Verzeichnisses, mitlaufende führen den Stand des Verzeichnislaufs in einem eigenen Lauf weiter (`deleteDocument` mit `laufUebernehmen`); Planverzeichnis oder Planpaket direkt aus den Auswahlfeldern neu anlegen – ein so angelegtes Planverzeichnis fragt „Codierung“ und „Titel“ ab (ohne Titel gilt die Codierung als Titel); sein Planlauf startet mit „Anlegen und Planlauf starten“ des Plans nach dem Workflow im Dialog, der Hinweis „Das Planverzeichnis „…“ hat noch keinen Planlauf.“ steht darüber (`verzeichnisOhneLauf`; gilt für jedes gebündelte Verzeichnis, das noch nie einen Lauf hatte). Bei „Abbrechen“ oder Wahl eines anderen Verzeichnisses entfällt das angelegte Verzeichnis wieder. Excel-Import (`PlaeneImport.tsx`): jede Zeile erhält ihren eigenen Eintrag; jeder Eintrag mit eigenem Planlauf – auch ohne Codierung, ein beim Import neu angelegtes Verzeichnis und ein vorhandenes gebündeltes Verzeichnis, das noch nie einen Lauf hatte – startet ihn sofort, nach dem Workflow der Spalte „Workflow“, sonst nach dem unter „Workflow für Einträge ohne Angabe“ gewählten (`planlaufAusWorkflow` in `engine.ts`). Pakete und Verzeichnisse werden je Art über Codierung bzw. Kurzzeichen oder Titel gefunden, auch in derselben Datei; ein neu angelegtes Verzeichnis übernimmt das früheste Eingang Soll seiner Pläne. Die Nummer eines Planverzeichnisses heißt „Codierung“ (`NUMMER_LABEL` in `types.ts`). Einträge, deren Lauf durch einen neuen Index ersetzt oder ersatzlos abgebrochen wurde, tragen einen grauen Zusatz; aufgeteilte bzw. wieder gebündelte Läufe zählen nicht als Abbruch. Im Dialog eines Planverzeichnisses: Haken „Pläne einzeln durch den Planlauf führen“ – frei wählbar, solange weder das Verzeichnis noch seine Pläne einen Lauf haben – und bei laufendem gebündeltem Lauf „Alle Pläne einzeln weiterführen …“ (`verzeichnisAufteilen`). Im Dialog eines mitlaufenden Plans: „Aus dem Verzeichnislauf herauslösen …“ (`planHerausloesen`). Haben Pläne des Verzeichnisses einen eigenen Lauf, bietet der Verzeichnis-Dialog „Pläne wieder bündeln …“: Der Dialog (`src/bereiche/planlauf/components/BuendelnDialog.tsx`) listet diese Pläne mit Haken, aktuellem Schritt und Fortschritt; die angekreuzten kehren in einen gemeinsamen Verzeichnislauf zurück (`planeBuendeln`), ihre eigenen Läufe enden mit der Abbruchart `gebuendelt`, nicht angekreuzte behalten ihren Lauf. Läuft das Verzeichnis noch, übernehmen sie dessen Stand – ein Plan, der weiter ist, wird mit „weiter als das Verzeichnis – fällt zurück“ gekennzeichnet. Ist es aufgeteilt, entsteht ein neuer Verzeichnislauf; sein Stand wird unter „Stand des Verzeichnislaufs übernehmen von“ gewählt, vorgeschlagen ist der am wenigsten weit gediehene Plan. In beiden Fällen übernimmt der Plan den Stand des Verzeichnislaufs – erledigte Schritte bleiben erledigt, Start und Termine laufen weiter (`laufUebernehmen` in `engine.ts`); der gebündelte Lauf endet beim Aufteilen mit der Abbruchart `aufgeteilt`. Ein Plan, der schon einen eigenen Lauf hat, behält ihn beim Verschieben in ein anderes Verzeichnis. „Angekündigt“ prüft alle anstehenden Schritte. Läuft ein Plan im Lauf seines Verzeichnisses mit, nennt der Dialog zu „Eingang Soll“: „Der Plan läuft im Planlauf seines Verzeichnisses mit – maßgeblich ist das Eingang Soll des Verzeichnisses.“ **Mehrfachauswahl:** Kästchen-Spalte (ein Verzeichnis wählt sich samt seinen sichtbaren Plänen; Paketzeile, „Ohne Planpaket“ und Kopfzeile wählen ihren Inhalt; was Suche oder Filter ausblenden, fällt aus der Auswahl) mit Aktionsleiste „… ausgewählt“: „Planpaket zuweisen …“ (`dokumentePaketZuweisen`, auch „– keinem Paket –“; Pläne folgen dem Paket ihres Verzeichnisses), „Neues Planpaket aus Auswahl …“ (PaketDialog mit `paketAusAuswahl`, das kein leeres Paket anlegt), „Gewerk/Planungsphase …“ (`dokumenteAendern`, „Leer lassen = unverändert“), „Löschen …“ (`dokumenteLoeschen`; die Rückfrage nennt Verzeichnisse mit oder ohne ihre Pläne, die Zahl der Planläufe samt denen mit Ist-Daten bzw. Protokoll und die künftigen Einzelpläne, mit „Sicherung vorher herunterladen“) und „Auswahl aufheben“ – Dialoge in `src/bereiche/planlauf/components/PlanlisteAktionen.tsx`. Auch „Hinzufügen“ und „Entfernen“ im Paketdialog laufen über `dokumentePaketZuweisen`. |
| `rollen` | Funktion (`src/bereiche/planlauf/pages/projekt/RollenFunktionen.tsx`) | Nach Gewerken gegliedert („Übergreifend“ + je Gewerk, **+** für ein weiteres Gewerk, „Gewerk … löschen“ am Seitenende). Je Funktion die Besetzung mit einer Person samt Adressdaten und den Feldern „SharePoint-Link Eingang“ und „SharePoint-Link Ausgang“ (`sharepointEingang`, `sharepointAusgang` an `Contact`; in der Liste als kleine Links „SharePoint Eingang“ / „SharePoint Ausgang“): Funktion anlegen, bearbeiten, löschen; Besetzung setzen, wechseln, aufheben – von der Funktion aus (Person übernehmen oder neu erfassen) oder über „Person hinzufügen“ von der Person aus (Funktion optional gleich mitwählen). Suche über Funktion, Person und Firma; Personen ohne Funktion in einer eigenen Liste, je Zeile bearbeiten und löschen (Rückfrage „Person löschen?“); das Planlaufmanagement wird nicht angezeigt (immer die angemeldete Person); Excel-Import (`RollenImport.tsx`), der fehlende Gewerke und Funktionen anlegt; die optionale Spalte „Seite“ setzt die Seite für den Verzug, die Spalten „SharePoint Eingang“ und „SharePoint Ausgang“ (`ROLLEN_SPALTEN` in `src/bereiche/planlauf/domain/importVorlagen.ts`) die Links – leere Zellen lassen vorhandene stehen. Feld „Seite für den Verzug“ im Funktionsdialog, Abzeichen in der Liste („Seite offen“ ohne Seite). |
| `ketten` | Workflows im Projekt (`src/bereiche/planlauf/pages/Workflows.tsx` mit `projectId`) | Wie der globale Bereich, zusätzlich unter „Projektvarianten“ die Varianten dieses Projekts. |
| `einstellungen` | Einstellungen (`src/bereiche/planlauf/pages/projekt/Einstellungen.tsx`) | Projektdaten bearbeiten; Vorlaufzeit für Erinnerungen, Fristenrechnung in Arbeitstagen, Feiertage, Absendername und Absender-E-Mail pflegen; Hinweis auf die projektübergreifenden E-Mail-Texte; **Export** (`ExportDialog.tsx`, Titel „Planläufe exportieren“; ebenso im Reiter „Planläufe“): Kurz- oder Langfassung; Auswahl der Einträge in der Gliederung der Planlaufliste – je Planpaket, „Ohne Planpaket“ und „Abgebrochen“ ein Haken für die Gruppe; gewählt wird je Planlauf bzw. mitlaufendem Plan (`zeilenSchluessel`), ein Verzeichnis wählt die Pläne unter sich mit, ein mitlaufender Plan – gekennzeichnet mit „läuft im Verzeichnis mit“ – sein Verzeichnis, abgebrochene Läufe tragen ihren eigenen Index; PDF und Excel bleiben gesperrt, solange der Bericht leer wäre; eine Auswahl nach Arten gibt es nicht. Ausgabe als Excel-Datei (`src/shared/xlsx.ts`) oder als PDF über den Druckdialog (`src/shared/print.ts`). Aufbereitung in `src/bereiche/planlauf/domain/export.ts` (`berichtBilden` auf Grundlage von `uebersicht.ts`): Überschriften sind nur die Planpakete (dazu wie in der Liste „Ohne Planpaket“ und „Abgebrochen“); ein gebündeltes Verzeichnis ist ein Planlauf mit seinen mitlaufenden Plänen, ein Verzeichnis mit Plänen einzeln nur eine Klammer. Kurzfassung als PDF: die Tabelle der Planlaufliste (Plan / Planverzeichnis, Gewerk, Aktueller Stand, Nächster Schritt, Zuständig, Fortschritt, Status) ohne Schaltflächen, mit `EXPORT_STIL`; in Excel ein formatiertes Blatt (`kurzBlatt`): A1 „Projekt: …“, A2 „Stand: …“, Kopfzeile in Zeile 4 (`KURZ_KOPF`: Planpaket, Plancode, Index/Ausgabe, Titel, Gewerk, Aktueller Stand, Datum, Nächster Schritt, Frist; Planpaket „ohne Planpaket“, wenn keines), erst die laufenden Planläufe, dann gesondert „Abgeschlossen (…)“ grün und „Abgebrochen (…)“ grau hinterlegt; Datum und Frist als Excel-Daten, Frist bei fälligen Schritten orange, bei überfälligen rot; mitlaufende Pläne mit „läuft im Planlauf von … mit“, Verzeichnisklammern ohne eigene Zeile; Kopfzeilen fixiert, Druck quer auf Seitenbreite (Zellformate in `src/shared/xlsx.ts`). Langfassung: je Planlauf alle Schritte, in Excel je Schritt eine Zeile (`LANG_KOPF`, u. a. mit Durchlauf, Seite, Eingang, Soll, Ist und Verzug); frühere Durchläufe stehen als eigene graue Zeilen, voraussichtliche Termine kursiv. Die Kurzfassung nennt bei parallelen Zweigen alle anstehenden Schritte. Projekt löschen. |

### 2.3 Planlauf

`src/bereiche/planlauf/pages/projekt/PlanlaufDetail.tsx`: Kopf mit Stammdaten, Status,
„Fortschritt“, „Voraussichtliches Ende“ bzw. „Abgeschlossen am“ samt geplantem
Ende, „Verzug gegenüber Basis“ und dem am stärksten überfälligen Schritt,
Verlaufskette und Schrittliste („Prozessschritte“ – „Die Frist zählt ab dem
tatsächlichen Eingang – dem Abschluss des vorherigen Schritts.“). Die
Schrittliste folgt den Abschnitten aus `verfolgen` (`ablauf.ts`): ein paralleler
Block erscheint als Gruppe mit dem Kopf „Parallel · … Zweige“ bzw. bei einem
benannten Block „… · parallel, … Zweige“ (`blockTitel`) („Die Zweige laufen
gleichzeitig.“, „Weiter, wenn alle Zweige erledigt sind.“), je Zweig mit Namen
(sonst „Zweig …“), Stand, Zweig-Rücksprung, Ausstieg
und abgeschnittenen Schritten. Aktionen an jedem anstehenden Schritt
(`aktuelleSchritte`; ein abgebrochener Lauf hat keine): **Erledigt**,
**Überspringen**, **Erinnern** (E-Mail vorbereiten). Je Schritt stehen Eingang
(fest, „voraussichtlich“, „geschätzt“ oder „Wiedereingang am …“), Frist, Soll,
Ist, Verzug bzw. Abweichung, Seite, die beim Abschluss festgehaltene Person,
die vorbereiteten E-Mails („E-Mail vorbereitet am …“) und aufklappbar die
früheren Durchläufe aus `historie`. Abgeschlossene Schritte bieten **Wieder
öffnen …**: Dialog „Schritt wieder öffnen“ („Wie soll der Schritt wieder
geöffnet werden?“) mit „Korrektur“ – nur solange kein Nachfolger ein Ist hat
(`wiederOeffnenArt` in `abschluss.ts`) – oder „Erneute Bearbeitung“ mit
„Eingang des neuen Durchlaufs“; Store `wiederOeffnen`. Jede Zeile **Anpassen**
(„Schritt anpassen“: Bezeichnung, Art, Funktion, zuständige Person – „– laut
Funktion –“ –, Frist, Eingang, „Ist-Termin“ nur bei erledigten Schritten,
„Soll-Termin festsetzen“, Bemerkung, Nachweis; kein Statusfeld). Ändert sich
dabei ein Eingang oder Ist, fragt „Eingang der Nachfolger ebenfalls
anpassen?“; gespeichert wird in einem Aufruf von `aenderungenAnwenden`. Zur Wahl der Funktion stehen die Funktionen des Gewerks
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
Weiter: **Schritt einfügen** (nur an Stellen, hinter denen nichts erledigt ist
– `einfuegenMoeglich` in `ablauf.ts` –, im Block in den Zweig des gewählten
Schritts, „am Ende von Zweig …“ (bei benannten Zweigen „am Ende von „…““) oder
„nach dem parallelen Block (bevor es weitergeht)“; Store `schrittImLaufEinfuegen`), Antwort einer Entscheidung
wählen, **Workflow ändern …**, **Planlauf abbrechen** (ersatzlos oder mit neuem Index bzw. neuer
Ausgabe – dann startet ein Nachfolgelauf in einem Schritt, `neuerIndexStarten`) und **Lauf löschen**. „Workflow
ändern …“ öffnet „Workflow ändern und neu starten“: Workflow, „Erledigte Schritte
übernehmen“ (`erledigteUebernehmen` in `engine.ts`), „Start des
Planlaufs“, „Eingang Soll“ (wird am Eintrag nachgetragen; ein vergangenes
Datum ist nicht vorbelegt, leer gelten die Termine ab dem Start), „Grund“ und
„Ablauf des neuen Planlaufs“ mit „Individueller Workflow“ (`LaufSchritte` in
`src/bereiche/planlauf/components/AblaufVorschau.tsx`); „Neu starten“ beendet den Lauf
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

Folgt ein laufender Lauf noch einer früheren Fassung seines Workflows
(`alteFassung`), steht im Kopf der Hinweis mit „Auf aktuelle Fassung umstellen
…“ – derselbe Neustart-Dialog, Grund vorbelegt mit „Auf die aktuelle Fassung des
Workflows umgestellt“. Nach jedem Erledigen oder Überspringen öffnet sich –
sofern `mailNachfrage` gesetzt ist – „E-Mail senden“
(`src/bereiche/planlauf/components/NeuZustaendig.tsx`): je Person eine Zeile mit
den neu anstehenden Schritten, Vorlage, „E-Mail …“ und dem Kennzeichen „E-Mail
vorbereitet“; steht ein Schritt nach einem Versandschritt an (`versandSchrittVor`
in `email.ts`), ist die Vorlage „Versand“ vorgewählt und die Zeile nennt „Versand
zur …“ (fehlt der Link, „SharePoint-Link Eingang fehlt“). Der E-Mail-Dialog fasst mehrere Schritte einer Person zu einer
Sammel-E-Mail zusammen und vermerkt jede vorbereitete E-Mail am Schritt
(`erinnerungenVermerken`).

Karte **Terminnachweis** (`src/bereiche/planlauf/components/Terminnachweis.tsx`,
Rechnung `terminnachweis` in `nachweis.ts`): „Verzug gegenüber dem Basisplan –
und welcher Seite er zuzurechnen ist“, „Geplantes Ende (Basis)“, „Gesamtverzug“,
Summen je Seite, „Seite fehlt“, „Zeitgewinn“, „Nicht erklärt“ und Warnungen;
„Verzug je Ausführung“ mit Posten (`POSTEN_ART_LABEL`: Fristüberschreitung,
Nacharbeit, Planänderung, Soll von Hand, Übergabelücke, Erster Termin
verschoben, Nacharbeit (paralleler Block), Zeitgewinn) und „Zuordnen …“ (Dialog
„Verzug zuordnen“, Tage je Seite, „Grund (Pflicht)“; Store `verzugZuordnen`),
„Ursache der Nacharbeit“ je Entscheidung (`nacharbeitSeiteSetzen`), „Basisplan“
mit „Basis neu festlegen …“ (Grund Pflicht, `basisNeuFestlegen`) und „Nachweis
als Excel“ mit den Blättern „Ausführungen“, „Verzug je Seite“, „Erinnerungen“ und
„Protokoll“. Karte **Protokoll** (`src/bereiche/planlauf/components/Protokoll.tsx`):
Änderungen am Lauf, neueste zuerst, 20 Einträge, dann „Alle (…)“; geschrieben
von `protokollNachziehen` (`src/bereiche/planlauf/domain/protokoll.ts`).

### 2.4 Übergreifende Bedienelemente

* **Seitenleiste** (`src/bereiche/planlauf/App.tsx`): Navigation (Übersicht, Projekte, Terminrechner
  und die aufklappbare Gruppe „Einstellungen“ mit Workflows, Funktionen und Vorlagen – aufgeklappt, sobald
  eine dieser Seiten offen ist), darunter die markierten Projekte mit vorangestellter
  Projektnummer und der Anzahl überfälliger Schritte. Ganz unten
  **Bereich wechseln** zurück zur Bereichsauswahl
  (`src/shell/BereichWechsel.tsx`).
* **Angemeldet als** (unten links, `AngemeldetAls` aus
  `src/gemeinsam/AngemeldetAls.tsx`, Abschnitt 11): Name und Schalter
  „Farbmodus für Rot-Grün-Sehschwäche (hoher Kontrast)“ – beides für alle
  Bereiche –, dazu als Einstellung dieses Bereichs „Nachfragen zulassen, wenn
  ein Workflow-Schritt eine E-Mail vorsieht“ (`bearbeiter.mailNachfrage`).
  `bearbeiter.name` und `bearbeiter.farbmodus` spiegeln die gemeinsame
  Anmeldung (`useBenutzerAbgleich` in `src/bereiche/planlauf/store/store.tsx`).
* **Sicherung**: lädt den gesamten Bestand als JSON herunter
  (`exportiereDaten`); nach einem Lade- oder Fassungsfehler stattdessen den
  gespeicherten Stand unverändert („Gespeicherten Stand unverändert
  herunterladen“, `rohdatenHerunterladen`). **Einspielen**
  (`src/bereiche/planlauf/components/SicherungEinspielen.tsx`): wählt eine
  solche JSON-Datei, liest sie mit `sicherungLesen`
  (`src/bereiche/planlauf/store/storage.ts`, Anhebung wie beim Laden) und
  zeigt „Sicherung einspielen“ – mit der Zahl der Projekte, Pläne und
  Planverzeichnisse und Planläufe, der Warnung, dass der jetzige Bestand
  ersetzt wird, „Aktuellen Stand sichern“ (Titel „Den jetzigen Bestand vorher
  als JSON sichern“; nach einem Lade- oder Fassungsfehler stattdessen
  „Gespeicherten Stand herunterladen“, Titel „Gespeicherten Stand unverändert
  herunterladen“, `rohdatenHerunterladen` – ohne gespeicherten Stand „Es ist
  kein gespeicherter Stand vorhanden, der sich herunterladen ließe.“) und, wenn die Namen abweichen, dem
  Haken „„Angemeldet als“ aus der Sicherung übernehmen“ (vorgewählt, solange
  der Name `STANDARD_BEARBEITER` ist; mit Haken gelten Name und Farbmodus der
  Sicherung danach in allen Bereichen, `benutzerAendern`); ohne gesetzten Haken
  bleiben Name, Farbmodus und E-Mail-Nachfrage der Person am Rechner. „Alles ersetzen“ ersetzt den Bestand über
  `ersetzeDaten` und wechselt zur Übersicht. Nach einem Ladefehler sagt der
  Dialog „Der gespeicherte Stand ließ sich nicht laden; abgleichen ist deshalb
  nicht möglich. „Alles ersetzen“ überschreibt ihn; eine unveränderte Kopie
  bleibt im Browser, solange der Speicher reicht. Wer ihn noch braucht, lädt
  ihn vorher mit „Gespeicherten Stand herunterladen“ herunter.“ Vor dem
  Ersetzen des unlesbaren Stands legt `rohkopieVorEinspielen`
  (`src/bereiche/planlauf/store/storage.ts`, umgesetzt in
  `src/shared/speicher.ts`, Ergebnis `RohkopieErgebnis`: `'angelegt'`,
  `'kein-stand'` oder `'gescheitert'`) die Rohkopie
  `planlauf-management.data.v1.vor-einspielen-<Zeitpunkt>` an (ISO-Zeitpunkt,
  UTC). Passt sie nicht in den Speicher, ersetzt der Dialog nichts, sondern
  meldet „Für eine Kopie des gespeicherten Stands reicht der Speicher des
  Browsers nicht. Wer ihn noch braucht, lädt ihn jetzt mit „Gespeicherten
  Stand herunterladen“ herunter; „Ohne Kopie ersetzen“ überschreibt ihn
  endgültig.“ (`role="alert"`, der Fokus springt auf das Herunterladen); erst
  „Ohne Kopie ersetzen“ ersetzt den Stand. „Abgleichen und auswählen …“
  öffnet „Sicherung abgleichen“ (`src/bereiche/planlauf/components/Abgleich.tsx`,
  Logik `abgleichErmitteln`/`abgleichAnwenden` in
  `src/bereiche/planlauf/domain/abgleich.ts`): ein Baum mit Kästchen –
  „Übergreifend“ (Gewerke, Funktionen, E-Mail-Vorlagen, Workflows) und
  „Projekte“ (Projektdaten, Funktionen, Kontakte, Projekt-Workflows,
  Eintragseinheiten) –, je Element neu, geändert, gleich, nur im Bestand oder
  im Bestand gelöscht (Löschvermerke `AppData.geloescht`), „vermutlich dasselbe“
  bei gleicher Codierung mit anderer Kennung, Projekt bei abweichender
  Projektnummer „als Kopie“; Abhängigkeiten aus `VERWEISFELDER` werden „mitgenommen“.
  Ohne Unterschiede: „Keine Unterschiede“. Übernommen wird über `datenAbgleichen`;
  Läufe gleicher Kennung vereinigen Protokoll, Historie und Erinnerungen.
  Stammt der gespeicherte Stand aus einer neueren Fassung, sind beide Wege
  gesperrt, nach einem Ladefehler das Abgleichen. **Zurücksetzen**: verwirft den
  Bestand und lädt die Demodaten (`zuruecksetzen` in
  `src/bereiche/planlauf/store/store.tsx`); gesperrt, solange der gespeicherte
  Stand aus einer neueren Fassung stammt („Gesperrt, damit der Stand aus der
  neueren Fassung erhalten bleibt“).
* **Hinweisleisten** (`src/bereiche/planlauf/components/Hinweisleisten.tsx`,
  zwischen Kopfzeile und Inhalt) nach `ladeZustand`, `speicherZustand` und
  `stammdatenKopien` des Stores: „Der gespeicherte Stand ließ sich nicht laden.“
  mit „Gespeicherten Stand herunterladen“ und „Mit Demodaten neu beginnen?“; „Die
  gespeicherten Daten stammen aus einer neueren Fassung von KaPlan.“ mit „Seite
  neu laden“; „Nicht gespeichert – bitte Sicherung herunterladen.“ samt Grund
  („Der Speicher des Browsers ist voll“ bzw. „Der Browser lässt das Speichern
  nicht zu (etwa durch Datenschutzeinstellungen)“); „Standard-Workflows
  aktualisiert.“ mit den Kopien „… (eigene Fassung)“, quittiert mit „Verstanden“.
* **Aufklappmenüs** (`AufklappMenue` in `src/shared/menue.tsx`, Gestaltung `.aufklapp-menue` in
  `src/shared/global.css`): die Schrittwahl und die Spaltenfilter der Planlaufliste (Eintrag
  „Alle“, der gewählte Wert hervorgehoben), der Haken „Erledigt“ (`ErledigtButton` in
  `src/bereiche/planlauf/components/SchrittStatus.tsx`) und „Status ändern“ der
  Baubetriebsplanung. Das Menü liegt per Portal im `body`, öffnet bei Platzmangel nach oben,
  bleibt im Fenster und scrollt selbst; der erste Eintrag erhält den Fokus, Pfeiltasten,
  Home und End wechseln den Eintrag, Escape schließt und gibt den Fokus an den Knopf zurück;
  Tab, ein Klick oder Tippen daneben, Scrollen und eine Größenänderung schließen es ebenfalls.
  Nach einer Wahl setzt das Menü den Fokus im nächsten Bild (`requestAnimationFrame`) auf den
  Knopf, wenn der Fokus auf `body` gefallen ist und der Knopf noch im Dokument steht; ein Dialog, den
  die Wahl öffnet, behält ihn. Der Erledigt-Haken einer Zeile der Planlaufliste
  (`src/bereiche/planlauf/components/PlanlaufListe.tsx`) ist für einen wie für mehrere anstehende
  Schritte derselbe Knopf (bei einem erledigt er direkt) und bleibt so auch dann im Dokument, wenn
  nach der Wahl nur noch ein Schritt ansteht.
* **Dialoge** (alle Bereiche; `Modal` in `src/shared/ui.tsx`, `role="dialog"` mit
  `aria-modal` und `aria-labelledby` auf den Titel): Beim Öffnen behält ein Feld mit
  `autoFocus` den Fokus; sonst setzt ihn `anfangsFokus` auf das erste Eingabefeld des Inhalts
  (`eingabeFeld`: Text-, Zahl- und Datumsfelder, Textbereiche, Auswahllisten – keine Kästchen,
  Optionsfelder oder Knöpfe), wenn es ohne Scrollen ganz zu sehen ist (`ganzSichtbar`), sonst
  auf den Dialog selbst (`tabIndex={-1}`); auf Touch-Geräten (`(pointer: coarse)`) setzt
  `anfangsFokus` ihn immer auf den Dialog selbst – ein Feld mit `autoFocus` behält ihn auch
  dort. Fokussiert wird mit `preventScroll`. Tab und Umschalt+Tab bleiben im
  obersten Dialog (`fokusHalten`; Optionsfelder einer Gruppe sind ein Tab-Halt), Escape schließt
  nur ihn (`obersterDialog`; ein Listener `dialogTaste` am `window`, solange ein Dialog offen
  ist – was ein Feld oder Menü selbst mit `preventDefault` behandelt, erreicht ihn nicht). Liegt
  ein eigener Dialog mit `role="dialog"` und `aria-modal="true"` darüber (der Workflow-Editor
  `src/bereiche/planlauf/components/WorkflowEditor.tsx`, mit `tabIndex={-1}`), regelt er die
  Tasten selbst. Ein Klick neben den Dialog (`mousedown` auf dem Overlay, mit `preventDefault` –
  der Fokus bleibt stehen) schließt ihn ebenfalls, außer bei `klickDanebenSchliesst={false}`:
  „Sicherung abgleichen“ (`src/bereiche/planlauf/components/Abgleich.tsx`, ein breiter `Modal`
  mit `klasse="ab-modal"`) bleibt dann offen, damit eine aufwendige Auswahl nicht verloren geht.
  Löst er den Dialog „Sicherung einspielen“ ab, erhält er selbst den Fokus (er hat kein
  Eingabefeld), nicht sein Knopf „Schließen“; nach dem Schließen geht der Fokus an das Element
  zurück, von dem „Sicherung einspielen“ kam („Einspielen“).
  Verschwindet das fokussierte Element, bleibt der Fokus im Dialog (`MutationObserver`). Nach dem
  Schließen geht der Fokus an das Element zurück, das ihn vor dem Öffnen hatte
  (`fokusVorDemOeffnen`; kam die Wahl aus einem Aufklappmenü, an dessen Knopf mit
  `aria-haspopup="menu"` und `aria-expanded="true"`), sofern es noch im Dokument steht; löst ein
  Dialog einen anderen ab, landet der Fokus im neuen. Das Overlay hat eine Spalte
  `minmax(0, 1fr)`, damit breiter Inhalt den Dialog auf schmalen Bildschirmen nicht
  verbreitert. `Callout` nimmt eine `role` („alert“ für Hinweise, die erst auf eine Handlung hin
  erscheinen). Kurzmeldungen (`ToastProvider` in `src/shared/toast.tsx`) stehen in `.toast-wrap`
  mit `role="status"` und `aria-atomic="false"` – Bildschirmleser lesen jede neue Meldung für sich
  vor, auch wenn eine ältere noch steht, ohne dass der Fokus wandert. Die Ablagefläche `.drop-zone` der Import-Dialoge `PlaeneImport.tsx`,
  `RollenImport.tsx` (`src/bereiche/planlauf/pages/projekt/`),
  `src/bereiche/projektsteuerung/components/BeteiligteImport.tsx` und
  `src/bereiche/leistungsnachweise/components/ImportDialog.tsx` ist über `alsKnopf`
  (`src/shared/ui.tsx`) per Tastatur bedienbar: `role="button"`, Tab-Halt, Enter und Leertaste
  öffnen die Dateiauswahl.
* **Tabellen** (alle Bereiche): `.table-scroll` schneidet ab 861 px quer ab, damit die
  Kopfzeile stehen bleibt; passt eine Tabelle nicht in ihre Karte, setzt
  `tabellenBreiteBeobachten` (`src/shared/tabellen.ts`, aufgerufen in `src/main.tsx`) die
  Klasse `table-scroll-quer`, und sie scrollt quer. Eine neue Seite beginnt oben
  (`useNachObenBeiSeitenwechsel` in `src/shared/scrollen.ts`, am Inhaltsbereich jedes
  Bereichs; ein Reiterwechsel scrollt nicht). Dialoge sind auf `100dvh` begrenzt.
* **Seitenleiste in der schmalen Ansicht** (alle Bereiche und das Controlling): Bis 860 px Breite klappt sie über die
  Schaltfläche „Menü“ (`.menu-toggle`) auf (`.sidebar.open`). Sie schließt bei jedem
  Seitenwechsel – auch bei einem, der nicht aus ihr kommt, etwa per Zurück im Browser
  (`useSeitenleiste` in `src/shared/seitenleiste.ts`, hört auf `hashchange`) – und bei einem
  Klick auf den abgedunkelten Hintergrund.
* **E-Mail-Dialog** (`src/bereiche/planlauf/components/EmailDialog.tsx`): Vorlage wählen, Betreff
  und Text bearbeiten, „In Outlook öffnen“ (mailto), „Outlook im Web“ oder „Kopieren“
  (in die Zwischenablage). Bei mehreren Schritten einer Person eine Sammel-E-Mail
  (Vorlage „Sammelerinnerung“, `sammelMailVorbereiten` in `email.ts`, Platzhalter
  `{{liste}}` und `{{anzahl}}`); ist der Link länger als `MAILTO_GRENZE`, bleibt
  nur „Kopieren“ („Zu lang für die Übergabe – bitte „Kopieren“ verwenden“).
  „Kopieren (formatiert)“ legt nur den Text als `text/html` und `text/plain` ab
  (`mailHtml` in `email.ts`, `formatiertKopieren` in `src/shared/zwischenablage.ts`):
  Links als Links, „ORDNERNAME EINFÜGEN“ und fehlende Angaben rot und fett.
  Lücken im Text („[SharePoint-Link Eingang fehlt]“, „[SharePoint-Link Ausgang
  fehlt]“, „[Anliegen fehlt]“, `fehlendeAngaben`) meldet „Im Text fehlen
  Angaben: …“. Jede vorbereitete E-Mail wird als Erinnerung am Schritt vermerkt.
* **Vorlage „Versand“** (`versandVorlage` in `seed.ts`, ID `mail-versand`):
  Platzhalter `{{anliegen}}` (Anliegen des vorangehenden Versandschritts),
  `{{sharepoint.eingang}}`, `{{sharepoint.ausgang}}` und `{{versandliste}}`
  (`versandListe`: je Planpaket „…:“ und „* Codierung Titel“, Planverzeichnisse
  mit „  – …“ ihrer mitlaufenden Pläne, ein einzelner Plan ohne Paket für sich,
  sonst „Ohne Planpaket:“); dazu wörtlich „Ordnername: ORDNERNAME EINFÜGEN“.
  Vorbelegte Versandschritte der Standard-Workflows: `VERSAND_ANLIEGEN_NACH_NAME`
  in `types.ts`.

## 3. Nutzerrollen und Rechte

**Es gibt keine Anmeldung mit Kennwort und keine Rechteprüfung außerhalb des Browsers.**
Weder `src/bereiche/planlauf/App.tsx` noch der Store (`src/bereiche/planlauf/store/store.tsx`) prüfen irgendeine
Berechtigung; in Planlaufmanagement, Baubetriebsplanung und Projektsteuerung kann jede Person,
die die Anwendung im Browser öffnet, alles lesen und ändern. Das Controlling fragt eine PIN ab
(`CONTROLLING_PIN = '0000'` in `src/bereiche/controlling/domain/pin.ts`) – sie
steht im Quelltext und schützt nur vor versehentlichem Zugriff (Abschnitt 9).
„Angemeldet als“ ist ein Name ohne Kennwort, gemeinsam für alle Bereiche
(Abschnitt 11). In den Leistungsnachweisen erfasst, wer unter diesem Namen als
Mitarbeiter geführt ist – fehlt die Person, legt der Bereich sie selbst an
(`anmeldungAnwenden`); dort prüft der Store die Rechte je Zugang (`darf`,
`darfLeistungAendern`, `darfPeriodentextBearbeiten`, `darfBestaetigen` in
`src/bereiche/leistungsnachweise/domain/rechte.ts`, Abschnitt 10.4) – Leistungen
anderer ändert niemand, auch das Controlling nicht, und im Bereich sieht niemand
Stichpunkte, Stunden oder Leistungen der anderen –,
und die Mitarbeiter verwaltet das Controlling (`src/bereiche/leistungsnachweise/pages/controlling/Mitarbeiter.tsx`). Der Bestand liegt ausschließlich im `localStorage` des
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
   Jede Funktion trägt eine Seite für den Verzug (`seite` vom Typ `Seite` in
   `types.ts`: Planer, Prüfer, Auftraggeber, PLM oder `null`), nach der der
   Terminnachweis Verzug zurechnet; die mitgelieferten Funktionen bringen sie
   mit, neue werden aus der Bezeichnung vorbelegt (`seiteAusFunktion`).

Die Besetzung wirkt sofort: `zustaendigkeitenNachziehen` (`src/bereiche/planlauf/domain/engine.ts`)
setzt in laufenden Planläufen die zuständige Person aus der aktuellen Besetzung
– außer bei erledigten Schritten und bei von Hand gewählten Personen
(`contactManuell`).

## 4. Umgebungsvariablen

**Eine `.env.example` existiert in diesem Repository nicht**, ebenso wenig eine
`.env`-Datei oder ein Zugriff auf `process.env` im Anwendungscode. Die
Anwendung benötigt keine Umgebungsvariablen – es gibt keinen Server, keine
Datenbank und keine API-Schlüssel. Nur der Build liest eine optional:
`GITHUB_SHA` (im Workflow von GitHub gesetzt) über `loadEnv` in
`vite.config.ts` für die Kennung der Fassung.

Verwendet werden ausschließlich die von Vite bereitgestellten Werte:

| Variable | Bedeutung | Pflicht |
| --- | --- | --- |
| `import.meta.env.BASE_URL` | Basispfad der Auslieferung; wird für die Pfade der Logos (`public/logos/`) und des Hauslogos verwendet (`src/shared/logos.tsx`). Vite setzt ihn aus `base: './'` in `vite.config.ts`. | von Vite gesetzt, keine eigene Pflege |
| `import.meta.env.PROD` | Nur im Produktionsbuild wird der Service Worker registriert und auf eine neuere Fassung geprüft (`src/shared/pwa.ts`). | von Vite gesetzt, keine eigene Pflege |
| `GITHUB_SHA` | Nur beim Bauen: Commit für die Kennung der Fassung (`__FASSUNG__` und `fassung.json`, `vite.config.ts`); fehlt er, heißt die Kennung `lokal-<Bauzeit>`. | nein, im Workflow von GitHub gesetzt |

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
   (`src/bereiche/planlauf/store/storage.ts`). Vor einer Umstellung auf eine
   neue Daten- oder Stammdatenfassung legt `ladeDaten` den gespeicherten Text
   einmalig unter `planlauf-management.data.v1.vor-fassung-<n>` ab (n = bisherige
   `version`); vor dem Einspielen über einen unlesbaren Stand entsteht ebenso
   `planlauf-management.data.v1.vor-einspielen-<Zeitpunkt>` (2.4). Ist der
   Speicher voll, entfernt `speichereDaten` Rohkopien einzeln und versucht es
   nach jeder erneut (`nachRaeumenSpeichern` und `rohkopienZumRaeumen` in
   `src/shared/speicher.ts`): zuerst die `…vor-fassung-…` – die eigenen vor
   denen anderer Bereiche und des Projektregisters –, dann die
   `…vor-einspielen-…`, die älteste zuerst. Passt der Bestand auch ohne alle
   nicht, stellt es die Kopien zurück.
4. **Migrationen**: laufen automatisch beim Laden. `DATEN_VERSION = 14` und
   `STAMMDATEN_VERSION = 6` (`src/bereiche/planlauf/domain/types.ts`) steuern, ob `migriere()`
   einen älteren Bestand auf die aktuelle Struktur hebt und ob neue Stammdaten
   (Funktionen, Standard-Workflows) übernommen werden. Seit Fassung 12 werden
   frühere Schrittarten außer Entscheidungen zur Aufgabe (`migriereTyp`), Ziele auf nicht
   mehr vorhandene Schritte entfallen (`zieleBereinigen`) und „Rückmeldung an
   Planer“ führt wieder zu „Erneute Vorlage von Planer“ (`rueckmeldungVerbinden`,
   bei Planläufen nur für laufende). Fassung 13 ergänzt Antworten mit
   `nacharbeit` (alle außer der ersten, `mitNacharbeit`), Funktionen mit Seite
   (`mitSeite`), Erinnerungen aus der früheren `letzteErinnerung`
   (`erinnerungenAus`) und die E-Mail-Vorlagen um `{{verzug.zahl}}` und die
   Sammelerinnerung (`vorlagenFassung13`); `laeufeFassung13` schätzt den
   Wiedereingang laufender Rücksprünge (`wiedereingangSchaetzen`, Eintrag im
   Protokoll „KaPlan (Umstellung auf Fassung 13)“, Kennzeichen „geschätzt“),
   gleicht den Status laufender Läufe mit dem Weg ab (`statusAbgleichen`) und
   legt für jeden Lauf ohne Basisplan einen fest (`basisplanFestlegen`) – alle in
   `store/storage.ts`. Fassung 14 ergänzt an Kontakten leere SharePoint-Links,
   an Workflow- und Laufschritten `versandAnliegen` nach dem Schrittnamen
   (`versandAnliegenNachName`, sonst `null`) und die Vorlage „Versand“
   (`vorlagenFassung13`). Eine neue Stammdatenfassung ersetzt die
   Standard-Workflows (`stammdatenAktualisieren`); hatte ein Bestand der
   Stammdatenfassung 4 bzw. 5 einen mitgelieferten Workflow selbst geändert
   (Vergleich mit `STANDARD_FASSUNG4_FINGERABDRUCK` bzw.
   `STANDARD_FASSUNG5_FINGERABDRUCK` in `seed.ts` über `FINGERABDRUECKE`;
   Fassung 5 mit Blöcken, `workflowFingerabdruck(t, true)`), bleibt dieser als
   Kopie „… (eigene Fassung)“ erhalten (`eigeneFassung`). Lässt sich der gespeicherte
   Stand nicht lesen (`ladefehler`) oder stammt er aus einer neueren Fassung
   (`neuere_fassung`), zeigt `ladeDaten` Demodaten, und der Store speichert nicht,
   solange `ladeZustand` nicht `ok` ist. Ohne gespeicherten Bestand werden die
   Demodaten aus `src/bereiche/planlauf/domain/seed.ts` geladen; ihre Läufe
   entstehen über die Engine mit zufälligen IDs.
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
   Skript wechselt deshalb nach 1,5 Sekunden auf `app/`. Die Ablage in `app/`
   folgt erst nach der Bereitstellung (Job `ablage` mit `needs: [build,
   pages]`), eine abgebrochene Bereitstellung versucht der Job `pages` nach
   150 Sekunden ein zweites Mal (`zweiter_versuch`). Bei Pull Requests
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
| „Bitte einen Namen angeben.“ | `src/bereiche/planlauf/components/WorkflowEditor.tsx` | Workflow ohne Namen gespeichert. |
| „Schritt … hat keine Bezeichnung.“ / „Entscheidung … hat keine Antwort.“ / „Schritt … wird nie erreicht – kein Übergang führt zu ihm.“ | `src/bereiche/planlauf/domain/workflowGraph.ts` (`pruefen`) | Workflow-Editor: Hinweise in der Fußzeile; die ersten beiden (und „Der Workflow hat noch keinen Schritt.“) erscheinen beim Speichern bzw. Übernehmen als Meldung und verhindern es. |
| „Bitte jeden Schritt der Workflow benennen.“ | `src/bereiche/planlauf/pages/projekt/Plaene.tsx`, `PlanlaufDetail.tsx` | Beim Start bzw. Neustart eines Planlaufs ist ein Schritt unbenannt. |
| „Bitte einen Grund angeben.“ | `src/bereiche/planlauf/pages/projekt/PlanlaufDetail.tsx`, `src/bereiche/planlauf/components/Terminnachweis.tsx` | Abbruch bzw. „Basis neu festlegen“ ohne Begründung. |
| „Bitte einen Grund für … angeben.“ | `src/bereiche/planlauf/components/Terminnachweis.tsx` | „Verzug zuordnen“: Tage für eine Seite ohne Grund. |
| „Bitte den Eingang des neuen Durchlaufs angeben.“ | `src/bereiche/planlauf/pages/projekt/PlanlaufDetail.tsx` | „Wieder öffnen …“ als erneute Bearbeitung ohne Eingang. |
| „Bitte ein Ist-Datum angeben – zum Zurücknehmen „Wieder öffnen“ verwenden.“ | `src/bereiche/planlauf/pages/projekt/PlanlaufDetail.tsx` | „Schritt anpassen“: Ist eines erledigten Schritts geleert. |
| „Bitte den Soll-Termin angeben.“ | `src/bereiche/planlauf/pages/projekt/PlanlaufDetail.tsx` | „Soll-Termin festsetzen“ ohne Datum. |
| „Bitte eine Stelle zum Einfügen wählen.“ | `src/bereiche/planlauf/pages/projekt/PlanlaufDetail.tsx` | „Schritt einfügen“ ohne Einfügestelle. |
| „Dort lässt sich kein Schritt einfügen – dahinter ist schon etwas erledigt.“ | `src/bereiche/planlauf/domain/abschluss.ts` | Die gewählte Stelle ist nicht (mehr) zulässig (`einfuegenMoeglich`). |
| „Bitte ein Planpaket wählen.“ | `src/bereiche/planlauf/components/PlanlisteAktionen.tsx` | „Planpaket zuweisen“ ohne Ziel. |
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
| Postleitzahl ohne führende Null | Tritt nicht mehr auf: `xlsxLesen` liest die Zahlenformate aus `xl/styles.xml` (`nullenFormate`) und füllt ganze Zahlen in Zellen mit einem Format nur aus Nullen (mindestens zwei Stellen, etwa `00000` – Excels Sonderformat „Postleitzahl“) auf diese Stellenzahl auf. |
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
| „Nichts übernommen – der Stand nach dem Abgleich wäre nicht stimmig:“ | „Sicherung abgleichen“: Die Konsistenzprüfung nach `abgleichAnwenden` fand Verstöße, die der Abgleich neu erzeugen würde; die ersten acht werden aufgezählt. |
| „Abgleich übernommen – ….“ | Kein Fehler: Die gewählten Elemente wurden übernommen (`src/bereiche/planlauf/components/Abgleich.tsx`). |
| „Keine Unterschiede“ – „Die Sicherung enthält nichts, was vom Bestand in diesem Browser abweicht.“ | Kein Fehler: Sicherung und Bestand stimmen überein. |

### Laufzeit und Technik

| Meldung | Ursache |
| --- | --- |
| „Kopieren nicht möglich – bitte Text manuell markieren.“ | `navigator.clipboard.writeText` wurde abgelehnt (fehlende Berechtigung oder unsicherer Kontext), `src/bereiche/planlauf/components/EmailDialog.tsx`. |
| „Druckdialog geöffnet – dort ‚Als PDF sichern‘ wählen.“ | Kein Fehler: Der PDF-Export läuft über den Druckdialog des Browsers (`src/shared/print.ts`). |
| Konsole: „Daten konnten nicht lokal gespeichert werden: …“ | `localStorage.setItem` schlug aus einem anderen Grund als vollem Speicher fehl – etwa gesperrt (privates Fenster), `src/bereiche/planlauf/store/storage.ts`; `speichereDaten` liefert dann `gesperrt`. Bei vollem Speicher liefert es ohne diese Meldung `voll`, wenn der Bestand auch nach dem einzelnen Räumen aller Rohkopien (`…vor-fassung-…`, `…vor-einspielen-…`, auch die anderer Bereiche; `nachRaeumenSpeichern` in `src/shared/speicher.ts`) nicht passt – die Kopien werden dann zurückgestellt. |
| Hinweisleiste „Nicht gespeichert – bitte Sicherung herunterladen.“ | Derselbe Fall in der Oberfläche (`speicherZustand`), mit „Der Speicher des Browsers ist voll“ bzw. „Der Browser lässt das Speichern nicht zu (etwa durch Datenschutzeinstellungen)“ (`src/bereiche/planlauf/components/Hinweisleisten.tsx`). |
| Hinweisleiste „Der gespeicherte Stand ließ sich nicht laden.“ | `ladeDaten` konnte den gespeicherten Text nicht lesen oder aufbereiten (`ladefehler`). Angezeigt werden Demodaten, gespeichert wird nicht; „Mit Demodaten neu beginnen?“ ersetzt den Stand erst nach Rückfrage. |
| Hinweisleiste „Die gespeicherten Daten stammen aus einer neueren Fassung von KaPlan.“ | `version` des gespeicherten Stands ist größer als `DATEN_VERSION` (`neuere_fassung`): Demodaten, kein Speichern, Einspielen und Zurücksetzen gesperrt; Abhilfe „Seite neu laden“. |
| Hinweisleiste „Standard-Workflows aktualisiert.“ | Kein Fehler: Beim Wechsel von Stammdatenfassung 4 bzw. 5 wurde ein selbst geänderter Standard-Workflow als Kopie „… (eigene Fassung)“ behalten (`stammdatenKopien`). |
| Terminnachweis: „Für diesen Planlauf ist kein Basisplan festgelegt – der Gesamtverzug lässt sich nicht bestimmen.“, „Die Prognose endet nicht (Schleife bzw. zu viele Schritte) – das Ende ist unsicher.“, „Der Planlauf wurde abgebrochen …“, „Frühere Durchläufe einzelner Schritte stammen aus der Zeit vor der Umstellung und sind nicht gespeichert – ihre Zeit erscheint als Übergabelücke, ein Rest ist möglich.“, „Zuordnung von Hand bei „…“ (Durchlauf …) übersteigt den Verzug um …“ | Hinweise der Karte „Terminnachweis“ (`warnungen` aus `terminnachweis` in `src/bereiche/planlauf/domain/nachweis.ts`). |
| Konsole: „Service Worker konnte nicht registriert werden: …“ | Registrierung abgelehnt, etwa ohne HTTPS (`src/shared/pwa.ts`). Die Anwendung läuft weiter, nur der Offline-Betrieb entfällt. |
| Ausnahme: „useStore muss innerhalb des StoreProvider verwendet werden.“ | Entwicklungsfehler: Eine Komponente nutzt `useStore` außerhalb von `StoreProvider` (`src/bereiche/planlauf/store/store.tsx`). |
| Seite „Nicht gefunden – Der aufgerufene Eintrag existiert nicht (mehr).“ | Die Adresse nennt ein Projekt oder einen Planlauf, den es nicht (mehr) gibt (`src/bereiche/planlauf/App.tsx`). |
| Ein alter Stand erscheint nach einer Aktualisierung | Meist ist das Fenster (Tab oder installierte App) noch vor der Veröffentlichung geöffnet worden – es behält seine Fassung bis zum Neuladen; GitHub Pages lässt die Startseite außerdem bis zu zehn Minuten im Browser-Cache. Seltener liegt unter `app/` noch ein älterer Build (siehe Abschnitt 5, Schritt 7), oder der Service Worker liefert aus seinem Cache, derzeit `mc-plan-v8` (`public/sw.js`). Abhilfe: Neuladen bzw. Strg+Umschalt+R; welche Fassung läuft, steht am Fuß des Startbildschirms. |
| Hinweis „Neue Fassung von KaPlan verfügbar“ mit „Neu laden“ und „Später“ | Kein Fehler: Die veröffentlichte `fassung.json` nennt eine andere Kennung als das laufende Programm (`useNeueFassung` in `src/shared/pwa.ts`, geprüft beim Start, bei Rückkehr ins Fenster und alle fünf Minuten; `src/shell/NeueFassung.tsx`). „Später“ blendet den Hinweis für diese Fassung aus. Der Hinweis liegt mit `z-index: 80` unter der aufgeklappten mobilen Seitenleiste und unter Dialogen; seine Höhe setzt er als `--neue-fassung-hoehe`, damit Meldungen (`.toast-wrap` in `src/shared/global.css`) über ihm erscheinen und der Inhalt (`.content`, auf dem Startbildschirm `.start`, in der PIN-Abfrage des Controllings `.ct-pin`) unten um diese Höhe mehr Abstand erhält – so lassen sich auch die letzten Bedienelemente einer Seite über ihn hinaus scrollen. |
| Planliste: Haken „Pläne einzeln durch den Planlauf führen“ ist ausgegraut – „Es bestehen bereits Planläufe. Die Pläne lassen sich nur noch nachträglich einzeln weiterführen.“ bzw. „Die Pläne laufen bereits einzeln. Über „Pläne wieder bündeln …“ lassen sich ausgewählte Pläne zurückführen.“ | Kein Fehler: Sobald das Verzeichnis oder einer seiner Pläne einen Lauf hat, ist die Wahl gesperrt (`modusGesperrt` in `Plaene.tsx`). Weiter geht es über die Nachträge „Herauslösen …“, „Alle Pläne einzeln weiterführen …“ und „Pläne wieder bündeln …“ bzw. „Bündeln …“ – im Dialog der Planliste, in der Karte „Pläne dieses Verzeichnisses“ des Planlaufs und im Reiter „Planläufe“. |
| Konsole der Wurzelseite: 404 für `/src/main.tsx` und die Symbole unter `icons/` | Kein Fehler: Die Wurzelseite ist der ausgelieferte Quellcode und springt nur nach `app/` weiter; dort gibt es diese Fehlanfragen nicht. |

## 7. Bereich Baubetriebsplanung

Monitor für baubetriebliche Anmeldungen von Sperrpausen, erster Entwurf nach
dem Lastenheft der Anwender. Offene Fragen und Annahmen:
`docs/BAUBETRIEB_RUECKFRAGEN.md`. Der Bereich greift nicht auf das
Planlaufmanagement zu – gemeinsam ist nur das Projektregister (Abschnitt 9);
Einstiegspunkt ist `src/bereiche/baubetrieb/index.tsx`,
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
  `leiche` („Anmeldeleiche“). Je Status `zustaendig` (`ZUSTAENDIGKEIT_LABEL`:
  MIC, BBK, Projektleitung DB oder `null`); je Anmeldung `vorhaben`
  (Vorhabenname, führend bei der Art SKM – `vorhabenFuehrend`, `titelFeld`,
  `anmeldungTitel`; ohne Nummer „ohne ID“, in Rückfragen und Vermerken
  notfalls das Gewerk – `anmeldungBezeichnung`), `bbk` (Zuständiger BBK),
  `anmelder` (Anmelder; soll aus dem Import der Anmeldungen kommen, bis dahin
  von Hand) und `geaendertAm` (Tag der letzten Änderung der Merkmale – gesetzt
  von `updateAnmeldung` und `terminSetzen` im Store, nur bei einer tatsächlichen
  Änderung: `updateAnmeldung` vergleicht feldweise mit dem bisherigen Stand,
  `unterscheidet`; ohne Änderung bleibt der Bestand unverändert). „Speichern“
  in „Anmeldung bearbeiten“ (`src/bereiche/baubetrieb/components/AnmeldungDialog.tsx`)
  prüft das vorab ebenso (beide Stände über `bauzeitraumAbgleichen`) und ruft
  `updateAnmeldung` samt Meldung „Anmeldung gespeichert.“ nur bei einer
  Änderung auf; sonst schließt es den Dialog nur.
* Sachstand (`sachstand` in `src/bereiche/baubetrieb/domain/ablauf.ts`): Datum
  und Anlass des jüngsten Eintrags im Verlauf (fachliches Datum; Anlass
  „Statuswechsel“, „Angelegt“ oder der Text des Vermerks, etwa „Nachgehakt“)
  oder `geaendertAm` mit „Merkmale geändert“, was später liegt; bei gleichem
  Tag gilt der Verlauf.
* Schlüssel `baubetrieb-planung.data.v1` im `localStorage`
  (`src/bereiche/baubetrieb/store/storage.ts`), `DATEN_VERSION = 9`.
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
  höchstens zehn); Fassung 7 (`ausFassung7`) kannte keine Zuständigkeit – die
  Status der Standard-Workflows erhalten die Vorgabe der mitgelieferten, die
  übrigen die Vorgabe ihrer Art (`ZUSTAENDIG_NACH_ART`); `vorhaben` und `bbk`
  der Anmeldungen ergänzt `aufbereiten()` leer; Fassung 8 kannte `anmelder`
  und `geaendertAm` nicht – `aufbereiten()` ergänzt sie leer.
  Ohne gespeicherten Bestand lädt `seedDaten()`
  (`src/bereiche/baubetrieb/domain/seed.ts`) drei Projekte mit acht
  Anmeldungen, Termine relativ zum heutigen Tag, und die Standard-Workflows.
* Ladezustand wie im Planlaufmanagement: `ladeDaten` liefert `{ daten, zustand }`
  mit `LadeZustand` `'ok'`, `'ladefehler'` (Text nicht lesbar, kein Objekt, ab
  Fassung 2 ohne `projekte`, Fehler beim Aufbereiten) oder `'neuere_fassung'`
  (`version` größer als `DATEN_VERSION`). Vor einer Umstellung legt `ladeDaten`
  einmalig die Rohkopie `baubetrieb-planung.data.v1.vor-fassung-<n>` an, vor
  dem Einspielen über einen unlesbaren Stand `rohkopieVorEinspielen` die
  Rohkopie `baubetrieb-planung.data.v1.vor-einspielen-<Zeitpunkt>` (7.4). Der
  Store speichert und gleicht mit dem Projektregister nur bei `'ok'` ab;
  `speichereDaten` liefert `SpeicherZustand` (`'ok'`, `'voll'`, `'gesperrt'`)
  und räumt bei vollem Speicher die Rohkopien einzeln wie im
  Planlaufmanagement (`nachRaeumenSpeichern` in `src/shared/speicher.ts`,
  Abschnitt 5). Hinweisleisten
  (`src/bereiche/baubetrieb/components/Hinweisleisten.tsx`, oben im Inhalt):
  „Der gespeicherte Stand ließ sich nicht laden.“ mit „Gespeicherten Stand
  herunterladen“ und „Mit Demodaten neu beginnen“ (Rückfrage „Mit Demodaten neu
  beginnen?“, „Neu beginnen“, Meldung „Mit Demodaten neu begonnen.“); „Die
  gespeicherten Daten stammen aus einer neueren Fassung von KaPlan.“ mit „Seite
  neu laden“; „Nicht gespeichert – bitte Sicherung herunterladen.“ mit „Der
  Speicher des Browsers ist voll“ bzw. „Der Browser lässt das Speichern nicht zu
  (etwa durch Datenschutzeinstellungen)“ und „Sicherung herunterladen“. Bei
  einem Stand aus einer neueren Fassung sind „Einspielen“ und „Zurücksetzen“
  gesperrt („Gesperrt, damit der Stand aus der neueren Fassung erhalten
  bleibt“; „Einspielen“ auch im Dialog, 7.4). „Sicherung“ lädt dann wie nach einem Ladefehler den gespeicherten
  Stand unverändert (`rohdatenHerunterladen`, Datei
  `baubetrieb-gespeicherter-stand-<Datum>.json`, Datum nach Ortszeit, Titel „Gespeicherten Stand
  unverändert herunterladen“; ohne gespeicherten Stand „Es ist kein
  gespeicherter Stand vorhanden, der sich herunterladen ließe.“), sonst den
  Bestand („Gesamten Datenbestand der Baubetriebsplanung als JSON sichern“).
  Speichert ein anderes Fenster `baubetrieb-planung.data.v1`, lädt der Store
  ihn nach (`useFremdeAenderung`, `SPEICHER_SCHLUESSEL`).
* Alle Schreibzugriffe über `mutate()` in
  `src/bereiche/baubetrieb/store/store.tsx`; Statuswechsel und Rücknahme als
  reine Funktionen `wechselAnwenden` und `wechselZuruecknehmen` in
  `src/bereiche/baubetrieb/domain/ablauf.ts`, Duplizieren über
  `anmeldungDuplizieren` (Kennungen vorab, Kopie direkt hinter dem Original;
  „(Kopie)“ an der führenden Bezeichnung, ohne Nummer wird „(Kopie)“ die
  Nummer, auch im gespeicherten Vorstand für das Zurücknehmen),
  Workflows über
  `workflowSpeichern`, `workflowLoeschen` und `workflowKopie` in
  `src/bereiche/baubetrieb/domain/workflowPflege.ts`.

### 7.2 Routen

| Route | Seite | Aktionen |
| --- | --- | --- |
| `#/baubetrieb` | Übersicht (`src/bereiche/baubetrieb/pages/Uebersicht.tsx`) | Kacheln „Anmeldungen“, „Terminfristen überfällig“, „Demnächst fällig“, „Nachhaken & Anmeldebedarf“. Karte „Anstehende Terminfristen“ (die ersten acht, `ANZAHL_TERMINE`, samt ausstehender Erstanmeldungen, diese mit Prozessphase und Projekt) mit den Spalten Anmeldung, Projekt, Status, Terminfrist und „Status ändern“ je Zeile (Haken, siehe 7.3); Karte „Anmeldebedarf aus den Projekten“ (nur wenn Bedarf besteht); Karte „Projekte“ mit der Zahl der Anmeldungen je Workflow, überfälligen Fristen (samt überfälliger Erstanmeldung) und nächster Frist (ohne Anmeldung die der Erstanmeldung). Angezeigt werden markierte Projekte, ohne Markierung alle (`sichtbareProjekte`), archivierte (Abschnitt 9) in keinem Fall. |
| `#/baubetrieb/termine` | Termine & Nachhaken (`src/bereiche/baubetrieb/pages/Termine.tsx`) | Alle Anmeldungen mit Terminfrist über alle Projekte, gegliedert nach Projekt; Filter Alle / Überfällig / Fällig / Im Plan / Zum Nachhaken, Suche; je Zeile „Nachgehakt“ (bei Status zum Nachhaken) und „Status ändern“ (Haken, siehe 7.3); je Projekt zuerst eine Zeile „Erstanmeldung ausstehend“ (`ausstehendeErstanmeldungen`) mit „Ausstehend“, Terminfrist und „Zum Projekt“ – sie zählt in den Filtern mit. Darunter „Anmeldebedarf aus den Projekten“. |
| `#/baubetrieb/projekte` | Projekte (`src/bereiche/baubetrieb/pages/Projekte.tsx`) | Karten mit MIC-Projektnummer, Bezeichnung, Bemerkung (falls vorhanden), Status der Betreuung, ★-Markierung und „Auch in“; Suche auch über DB-G-Nummer, Projektleiter und Hauptbearbeiter; „Neues Projekt“ (`ProjektDialog`). Darunter „Archiv“ und „Projekte aus anderen Bereichen“ mit „Übernehmen in Baubetriebsplanung“ (siehe 9.3). |
| `#/baubetrieb/projekt/<id>` | Projekt (`src/bereiche/baubetrieb/pages/ProjektDetail.tsx`) | „Excel“, „Bearbeiten“, „Löschen“ (samt Anmeldungen; nur in diesem Bereich; die Rückfrage endet mit „Die Anmeldung lässt sich nicht wiederherstellen.“ bzw. „Die Anmeldungen lassen sich nicht wiederherstellen.“ und dem Hinweis aus `useLoeschHinweis`, 9.3); Archivhinweis (9.3); Stammdaten; am Ende die Karte „Projektbeteiligte“ mit den geteilten Beteiligten (`RegisterBeteiligte`, 9.3); ohne Anmeldung (Anmeldeleichen zählen nicht) die Karte „Erstanmeldung ausstehend“ (`ErstanmeldungKarte`) mit Prozessphase, Terminfrist samt Ampel und Herkunft der Frist (`ERSTANMELDUNG_GRUND`), ohne Frist „Projekt bearbeiten“; Überschrift „Baubetriebliche Anmeldungen“ mit Suche und „Neue Anmeldung“; darunter je Workflow eine Tabelle (`AnmeldungenTabelle`) mit den Spalten Anmeldung (im SKM der Vorhabenname, darunter tVE-Nr; die Maßnahmenart in der zweiten Zeile nur, wo der Workflow mehrere führt), Sperrzeitraum, Status (ohne Workflow davor), Zuständig (`zustaendigText`: Rolle des Status samt Namen), Terminfrist (Ampelpunkt, Datum, Abstand; Regel im Tooltip), Sachstand (`SachstandKompakt` in `src/bereiche/baubetrieb/components/common.tsx`: Datum, darunter Abstand – „heute“, „gestern“, „vor … Tagen“ – und Anlass; alles im Tooltip) und „Status ändern“ (Haken, siehe 7.3; Tabellenklasse `bb-anmeldungen` – scrollt die Tabelle quer, bleibt die Haken-Spalte rechts stehen, `position: sticky` in `src/bereiche/baubetrieb/components/baubetrieb.css`). Jede Zeile umfasst höchstens zwei Textzeilen (`EINZEILIG` kürzt mit Auslassungspunkten). Workflows ohne Anmeldung zeigen nur die Kopfzeile mit „keine Anmeldung“; bei einer Suche entfallen Workflows ohne Treffer. Die frühere Karte zum Anmeldebedarf je Fahrplanjahr entfällt. |
| `#/baubetrieb/projekt/<id>/anmeldung/<id>` | Anmeldung (`src/bereiche/baubetrieb/pages/AnmeldungDetail.tsx`) | Weg durch die Workflows; Karte „Workflow …“ mit den Status des aktuellen Workflows in ihrer Reihenfolge – erreichte mit „zuletzt erreicht am …“, der aktuelle mit Terminfrist samt Rechenweg und den Nachfolgern („Weiter mit:“ – der Wechsel in eine Anmeldeleiche in Rot –, „Übernahme in neue Phase:“, „Abschluss:“ mit „Eintrag löschen“), „Nachgehakt …“, „Termin festlegen …“, „Letzten Wechsel zurücknehmen“, dazu „Zuständig:“ mit Rolle und Namen; Karte „Merkmale“ („Vorhabenname“ im SKM und wo er gesetzt ist, die Nummer als „tVE-Nr“ – bei älteren SKM-Einträgen ohne Vorhabenname weiter „Begriff / tVE-Nr“ –, „Zuständiger BBK“, „Anmelder“, Herkunft bzw. „Aufgeteilt in“); Karte „Statusverlauf“; oben rechts „Bearbeiten“, „Duplizieren“ (Kopie mit aktuellem Stand und Statusverlauf, Vermerk „Dupliziert aus …“, „(Kopie)“ an der führenden Bezeichnung; öffnet die Kopie) und „Löschen“. |
| `#/baubetrieb/workflows` | Workflows (`src/bereiche/baubetrieb/pages/Workflows.tsx`) | „Weg einer Anmeldung“; Liste „Workflows“ mit Kennzeichen „Standard“ bzw. „Eigener Workflow“, Zahl der Status und Anmeldungen, den Status in ihrer Reihenfolge, „Öffnen“, „Duplizieren“ und – bei eigenen Workflows ohne Anmeldungen – Löschen; „Neuer Workflow“; Übersicht der Richtlinienfristen nach Phase (`rilFristenNachPhase`) mit „Anpassen“. Editor siehe 7.3. Die frühere Adresse `#/baubetrieb/workflow` zeigt dieselbe Seite. |
| `#/baubetrieb/fristen` | Fristen (`src/bereiche/baubetrieb/pages/Fristen.tsx`), Menügruppe „Einstellungen“ | Richtlinienfristen je Schlüssel (`RIL_SCHLUESSEL`), nach Phase gegliedert (`rilFristenNachPhase`, je Phase eine Gruppenzeile mit Hinweis aus `RIL_PHASE_HINWEIS`) und mit Kürzel (`RIL_KUERZEL`, z. B. „Ril_KM N-2“, „Ril_KKM B(S)“), als „Stichtag im Fahrplanjahr“ oder „Wochen vor Sperrbeginn“, Kennzeichen „Platzhalter“ mit „Geprüft“; „Fällig ab“, „Nachhak-Abstand – Vorgabe“, „Anmeldebedarf – Vorschau“. Änderungen gelten sofort. Die frühere Adresse `#/baubetrieb/einstellungen` zeigt dieselbe Seite. |

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
  eine Karte mit Bezeichnung, Art (`STATUS_ART_LABEL`), „Zuständig“ (MIC, BBK,
  Projektleitung DB oder „– niemand –“), Terminfrist
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
* „Status ändern“ (`NachfolgerAuswahl` in
  `src/bereiche/baubetrieb/components/common.tsx`, Haken gestaltet in
  `src/bereiche/baubetrieb/components/baubetrieb.css`, Präfix `bb-`) ist ein
  Haken wie der Erledigt-Haken des Planlaufmanagements und bietet nur die
  Nachfolger des aktuellen Status an (`nachfolgerVon`): Mit einem Nachfolger
  wählt der Haken ihn direkt (Tooltip „Status ändern: …“), mit mehreren öffnet
  er ein Menü „Welcher Status folgt?“ („Eintrag löschen“ in Rot) – das
  gemeinsame `AufklappMenue` (`src/shared/menue.tsx`, Abschnitt 2.4: bleibt im
  Fenster, Tastatur, schließt mit Escape, Tab, Klick daneben oder Scrollen).
  Die Wahl öffnet den Dialog des Statuswechsels.
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
  Angezeigt wird er unter „Anmeldebedarf aus den Projekten“ in Übersicht und
  Terminen.
* Erstanmeldung (`erstanmeldungAusstehend`, `ausstehendeErstanmeldungen`):
  Projekte, die nicht abgeschlossen sind und keine Anmeldung außer
  Anmeldeleichen haben; Frist ist der erste Anmeldetermin, sonst
  `ersterTerminVorschlag`. Die Seitenleiste zählt überfällige Erstanmeldungen
  bei „Termine & Nachhaken“ mit, ebenso die Kacheln „Terminfristen überfällig“
  und „Demnächst fällig“ der Übersicht.
* Ril_KKM in Wochen vor Sperrbeginn fällt auf den Mittwoch an oder vor
  diesem Datum (`rilDatum` mit `stichtagMittwoch`); der Rechenweg nennt
  „(Stichtag Mittwoch)“.

### 7.4 Übergreifende Bedienelemente

* Seitenleiste: Übersicht, „Termine & Nachhaken“ (mit der Zahl überfälliger
  Fristen), Projekte und die aufklappbare Gruppe „Einstellungen“ mit
  „Workflows“ und „Fristen“ (wie im Planlaufmanagement; aufgeklappt, sobald
  eine der beiden Seiten offen ist), darunter die markierten Projekte; unten „Angemeldet als“ (gemeinsam für alle Bereiche, Abschnitt 11;
  `einstellungen.bearbeiter` und `einstellungen.farbmodus` spiegeln sie),
  „Sicherung“, „Einspielen“, „Zurücksetzen“ und „Bereich wechseln“.
* Sicherung (`exportiereDaten`) lädt `baubetrieb-sicherung-<Datum>.json` mit
  `"bereich": "baubetrieb"` (Datum nach Ortszeit, `today()` aus
  `src/shared/dates.ts`). Einspielen
  (`src/bereiche/baubetrieb/components/Sicherung.tsx`) fragt „Sicherung
  einspielen?“ – mit „Der gesamte jetzige Bestand der Baubetriebsplanung in
  diesem Browser wird ersetzt. Die anderen Bereiche bleiben unberührt.“ –,
  bietet „Aktuellen Stand sichern“ (Titel „Den jetzigen Bestand vorher als
  JSON sichern“) und übernimmt „Angemeldet
  als“ und Farbmodus – dann für alle Bereiche – nur mit dem Haken „Auch
  „Angemeldet als“ und Farbmodus aus der Sicherung übernehmen – gilt dann in
  allen Bereichen“. Nach einem Lade- oder Fassungsfehler heißt der erste Knopf
  „Gespeicherten Stand herunterladen“ (Titel „Gespeicherten Stand unverändert
  herunterladen“, `rohdatenHerunterladen`; ohne gespeicherten Stand „Es ist
  kein gespeicherter Stand vorhanden, der sich herunterladen ließe.“). Nach
  einem Ladefehler warnt der Dialog „Der gespeicherte Stand ließ sich nicht
  laden. Das Einspielen ersetzt ihn; eine unveränderte Kopie bleibt im Browser,
  solange der Speicher reicht. Wer ihn noch braucht, lädt ihn vorher mit
  „Gespeicherten Stand herunterladen“ herunter.“ und legt vor dem Ersetzen mit
  `rohkopieVorEinspielen` (`src/bereiche/baubetrieb/store/storage.ts`) die
  Rohkopie `baubetrieb-planung.data.v1.vor-einspielen-<Zeitpunkt>` an. Passt
  sie nicht in den Speicher, ersetzt er nichts und meldet „Für eine Kopie des
  gespeicherten Stands reicht der Speicher des Browsers nicht. Wer ihn noch
  braucht, lädt ihn jetzt mit „Gespeicherten Stand herunterladen“ herunter;
  „Ohne Kopie einspielen“ ersetzt ihn endgültig.“; erst „Ohne Kopie
  einspielen“ ersetzt den Stand. Bei einem Stand aus einer neueren Fassung ist
  „Einspielen“ auch im Dialog gesperrt: „Gespeichert ist ein Stand aus einer
  neueren Fassung von KaPlan. Damit er nicht überschrieben wird, lässt sich
  hier nichts einspielen – bitte zuerst die Seite neu laden.“
* Excel (`monitorExportieren` in `src/bereiche/baubetrieb/domain/export.ts`):
  Blätter „Anmeldungen“ (mit den Spalten „Workflow“, „Status“ und „Anmelder“) und
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
Projektbeteiligtenliste und die Besprechungsprotokolle. Einstiegspunkt ist `src/bereiche/projektsteuerung/index.tsx`, Rahmen und Seitenleiste stehen in
`src/bereiche/projektsteuerung/App.tsx`, die Gestaltung in `src/bereiche/projektsteuerung/projektsteuerung.css` (Klassen mit dem
Präfix `ps-`, Farben aus den Design-Tokens). Der Bereich greift nicht auf die
anderen Bereiche zu; Projekte und Projektbeteiligte teilt er über das
Projektregister (Abschnitt 9). Die Protokolle bilden das eigenständige Protokoll-Tool
(HTML-Datei) nach; dessen Dateien lassen sich übernehmen (`ausProtokollTool`
in `src/bereiche/projektsteuerung/domain/protokoll.ts`).

### 8.1 Datenmodell und Speicherung

* `src/bereiche/projektsteuerung/domain/types.ts`: `Projekt` (mit `logos`; `null` steht für
  `STANDARD_LOGOS` aus `src/bereiche/projektsteuerung/domain/seed.ts`), `Funktion` (projektübergreifend,
  mit `gewerk`; `null` = übergreifend, Seite `UEBERGREIFEND`; volle Bezeichnung
  `funktionsName`, etwa „Fachplanung LST“), Liste `gewerke`,
  `Beteiligter` (Person der Projektbeteiligtenliste mit `funktionId`),
  `Protokoll` mit `reiheId`, `teilnehmer` (`Teilnehmer` mit `beteiligterId`)
  und `tops` (`Top` mit `eintraege`, `entfaellt` für einen gestrichenen und
  `vorEntfaellt` für einen im Vorprotokoll gestrichenen Punkt; `Eintrag` vom
  Typ `I`, `F` oder `A`, `EINTRAG_TYP_LABEL`, mit `zeilen` – `Zeile` mit
  `herkunft` (Nummer des Ursprungsprotokolls, `null` = neu), `typ` (eigene
  Art einer Ergänzung mit `wer`, `termin` und `status`; `null` = läuft unter
  dem Ursprung mit), `entfaellt` und `vor` (`ZeileVorstand`) –; `vor`
  (`EintragVorstand`) hält den Stand im Vorprotokoll, `uebernommenIn` das
  Folgeprotokoll eines weitergeführten Eintrags mit Aufgaben, `entfaellt`
  einen gestrichenen Eintrag) sowie `reihenLogos` – Logos je Protokollreihe
  (Schlüssel `reiheId`; fehlt eine Reihe, gelten die des Projekts, `logosFuer`
  in `src/bereiche/projektsteuerung/domain/seed.ts`). Teilnahmestatus in `TEILNAHME` (anwesend,
  entschuldigt, abwesend, nur Verteiler).
* Schlüssel `projektsteuerung.data.v1` im `localStorage`
  (`src/bereiche/projektsteuerung/store/storage.ts`), `DATEN_VERSION = 6`. `aufbereiten()` ergänzt
  fehlende Felder (`entfaellt` als false, `typ` einer Zeile als `null`,
  `reihenLogos` leer und nur für vorhandene Reihen) und die Gewerke der
  Funktionen in `gewerke`. `migriere()` hebt Fassung 1 (ohne
  Gewerke) an: Sie erhält `STANDARD_GEWERKE`, ihre Funktionen gelten als
  übergreifend; Fassung 2 kannte keine gestrichenen Einträge. Bis Fassung 3
  bestand ein Eintrag aus Text, Ergänzung und Fundstelle: `zeilenAusAltform`
  (`src/bereiche/projektsteuerung/domain/protokoll.ts`) macht den Text zu einer Zeile aus dem
  Protokoll der Fundstelle, die Ergänzung zu einer neuen Zeile. Bis Fassung 4
  führte jedes Projekt eine Liste offener Punkte (LOP); sie entfällt beim
  Laden samt den Verweisen der Aufgaben. Ohne gespeicherten Bestand lädt `seedDaten()`
  (`src/bereiche/projektsteuerung/domain/seed.ts`) die Gewerke (`STANDARD_GEWERKE`: 50 Hz, KIB, LST, OLA,
  TK), die Standard-Funktionen (`STANDARD_FUNKTIONEN`, je Gewerk die
  Fachplanung, für LST und OLA zusätzlich die Bauüberwachung) und zwei
  Projekte mit Projektbeteiligten und zwei Protokollen einer Reihe, darunter
  Aufgaben der Projektsteuerin „Lena Roth“ – als eigene To-Dos erscheinen sie,
  wenn unter „Angemeldet als“ dieser Name steht (`einstellungen.bearbeiter` aus
  den Demodaten ist nur ein Spiegel der gemeinsamen Anmeldung und wird von
  `useBenutzerAbgleich` sofort ersetzt). Termine relativ zum heutigen Tag.
* Ladezustand, Rohkopie, Speicherzustand, Hinweisleisten und Nachladen aus
  anderen Fenstern wie in der Baubetriebsplanung (7.1): `ladeDaten` liefert
  `LadeZustand` (`'ladefehler'` auch ohne `projekte`), Rohkopien
  `projektsteuerung.data.v1.vor-fassung-<n>` und – vor dem Einspielen über
  einen unlesbaren Stand – `projektsteuerung.data.v1.vor-einspielen-<Zeitpunkt>`
  (8.5), `speichereDaten` liefert `SpeicherZustand` und räumt bei vollem
  Speicher wie dort (`nachRaeumenSpeichern`); Hinweisleisten in
  `src/bereiche/projektsteuerung/components/Hinweisleisten.tsx` mit denselben
  Texten; „Sicherung“ lädt nach einem Ladefehler bzw. bei neuerer Fassung
  `projektsteuerung-gespeicherter-stand-<Datum>.json` („Gespeicherten Stand
  unverändert herunterladen“), sonst den Bestand („Gesamten Datenbestand der
  Projektsteuerung als JSON sichern“); „Einspielen“ und „Zurücksetzen“ sind bei
  neuerer Fassung gesperrt. Gespeichert und abgeglichen wird nur bei `'ok'`.
* Alle Schreibzugriffe über `mutate()` in `src/bereiche/projektsteuerung/store/store.tsx`. Danach
  gleicht `teilnehmerNachziehen` (`src/bereiche/projektsteuerung/domain/protokoll.ts`) Name, Funktion,
  Firma und Kürzel verknüpfter Teilnehmender mit der Projektbeteiligtenliste
  ab; ist die Person gelöscht, bleiben die Angaben stehen und der Verweis
  entfällt.

### 8.2 Routen

| Route | Seite | Aktionen |
| --- | --- | --- |
| `#/projektsteuerung` bzw. `#/projektsteuerung/uebersicht` | Übersicht (`src/bereiche/projektsteuerung/pages/Uebersicht.tsx`) | Nur eigene To-Dos (`eigeneTodos` in `src/bereiche/projektsteuerung/domain/punkte.ts`): offene Aufgaben der Protokolle – Einträge vom Typ A und Ergänzungen mit eigener Art „Aufgabe“ (`protokollAufgaben`) –, deren „Verantwortlich“ Kürzel oder Namen der angemeldeten Person nennt – aus ihrem Eintrag in der Projektbeteiligtenliste oder aus den Teilnehmenden, verknüpft oder gleichen Namens (`eigeneZuordnungen`; Groß- und Kleinschreibung zählen nicht). Steht der Name in keiner Projektbeteiligtenliste der angezeigten Projekte (`angemeldetBeteiligt`), nennt ein Hinweis „Angemeldet als“. Kacheln „Aktive Projekte“, „Meine To-Dos“, „Überfällig“, „Demnächst fällig“. Karte „Meine To-Dos“, Filter Alle / Überfällig / Fällig, zunächst zehn Zeilen (`ANZAHL_PUNKTE`), je Zeile „Erledigt“ (Store `punktErledigen`, auch für Ergänzungen); ein Klick führt zum Protokoll (`punktZiel`). Karte „Projekte“ mit Beteiligten, Protokollen, letzter Besprechung, nächstem Termin, eigenen To-Dos („To-Dos“, „Überfällig“) und „Protokolle“. Angezeigt werden markierte Projekte, ohne Markierung alle (`sichtbareProjekte`), archivierte (Abschnitt 9) in keinem Fall. |
| `#/projektsteuerung/projekte` | Projekte (`src/bereiche/projektsteuerung/pages/Projekte.tsx`) | Projektkarten mit Nummer, Projektname, Beschreibung (falls vorhanden), Status, ★-Markierung und „Auch in“; „Neues Projekt“ (`ProjektDialog`: Projektnummer, Status, Projektname, Beschreibung). Darunter „Archiv“ und „Projekte aus anderen Bereichen“ mit „Übernehmen in Projektsteuerung“ (siehe 9.3). |
| `#/projektsteuerung/funktionen` | Funktionen (`src/bereiche/projektsteuerung/pages/Funktionen.tsx`) | Reiter „Übergreifend“ und je Gewerk, **+** legt ein Gewerk an (`GewerkDialog` in `src/bereiche/projektsteuerung/components/GewerkDialog.tsx`). Je Seite die Funktionen mit Suche und Spalten Kürzel, Gewerk, Beschreibung, „Verwendet“; „Neue Funktion“ und Bearbeiten per Klick (`FunktionDialog` in `src/bereiche/projektsteuerung/components/FunktionDialog.tsx`: Bezeichnung, Gewerk mit „Gewerk“ zum Anlegen, Kürzel – leer aus der Bezeichnung gebildet, `kuerzelAus` –, Farbe, Beschreibung); auf Gewerkseiten „Vorhandene Funktion“ (Funktion eines anderen Gewerks übernehmen, Kürzel nach `kuerzelFuer`) und „Gewerk „…“ löschen“ (`GewerkLoeschenDialog`, entfernt das Gewerk samt Funktionen). Funktionen und Gewerke, die Projektbeteiligte tragen, lassen sich nicht löschen. |
| `#/projektsteuerung/projekt/<id>/<seite>` | Projekt (`src/bereiche/projektsteuerung/pages/ProjektDetail.tsx`) | Kopfzeile mit Nummer, Status, Beschreibung, „Bearbeiten“ und „Löschen“ (samt Beteiligten und Protokollen; nur in diesem Bereich – die Rückfrage nennt „… aus der Projektsteuerung gelöscht.“, bei Protokollen dazu „Die Protokolle lassen sich nicht wiederherstellen.“, und den Hinweis aus `useLoeschHinweis`, 9.3), darunter ggf. der Archivhinweis (9.3). Seiten `beteiligte` („Projektbeteiligte“) und `protokolle` („Protokolle“); die frühere Seite `lop` führt zu `protokolle`, ohne gültige Angabe `beteiligte`. Siehe 8.3 und 8.4. |
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
`src/bereiche/projektsteuerung/domain/beteiligteImport.ts`): .xlsx oder .csv; gelesen wird das erste
Blatt mit Kopfzeile und Personen (ohne Personen das erste mit Kopfzeile – ein vorangestelltes
Hinweisblatt wird übersprungen), Kopfzeile in den ersten 15
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
  Karte mit „Logos …“ (`ReihenLogosDialog` in
  `src/bereiche/projektsteuerung/components/Logos.tsx`: eigene Logos der Reihe, „Logos des
  Projekts“ hebt sie auf; die Karte nennt dann „eigene Logos“), „Folgeprotokoll“
  und den Protokollen (Datum, Bezeichnung, Anwesende, übernommene Einträge,
  offene Aufgaben; „Öffnen“, „Folgeprotokoll“, Löschen). „Neue Protokollreihe“ (`NeueReiheDialog`:
  Besprechung mit Vorschlägen aus `BESPRECHUNG_VORSCHLAEGE`, Datum, Beginn,
  Ort; die Protokollführung übernimmt die angemeldete Person, wenn ihr Name in
  der Projektbeteiligtenliste steht). „Aus Protokoll-Tool“ liest `.protokoll`-
  und `.json`-Dateien des Protokoll-Tools (`ausProtokollTool`); Teilnehmende
  gleichen Namens werden mit der Projektbeteiligtenliste verknüpft,
  Protokolle gleicher Kennung im Projekt ersetzt. Karte „Logos im Druckkopf“
  (`LogoVerwaltung`, Logos des Projekts – Vorgabe für Protokollreihen ohne
  eigene Logos und für die Beteiligtenliste): „Logo hinzufügen“ (PNG, JPEG,
  SVG, WebP; Rasterbilder auf `LOGO_HOEHE` = 240 px Höhe verkleinert),
  Reihenfolge, Entfernen, „Standardlogos“.
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
  verschieben, löschen; Einträge mit Umschalter I/F/A, „Nach oben“ und „Nach
  unten“ – am Anfang bzw. Ende eines TOP in den vorigen bzw. nächsten TOP
  (`eintragVerschieben` in `src/bereiche/projektsteuerung/domain/protokoll.ts`) –, Verantwortlich als
  Auswahl aus den Teilnehmenden – Kürzel und Name, gespeichert wird das
  Kürzel (`zuordnung`) –, bei Aufgaben Termin und „erledigt“); Karte
  „Abschluss“ („Hinweis am Protokollende“, Vorgabe `STANDARD_HINWEIS`).
  Übernommene Zeilen eines Eintrags stehen fest („Zeile korrigieren“), darunter
  ihr Ursprung, etwa „aus Prot. 1“ (`zeileHerkunft`); die Ergänzung dieses
  Protokolls kommt als neue Zeile in das Feld „Ergänzung eintragen“.
* Ergänzungen mit eigener Art (`ZeileArt` und `WerAuswahl` im Editor): Unter
  einer neuen Ergänzung und unter jeder mit eigener Art steht der Umschalter
  I/F/A; mit Auswahl folgen Verantwortlich (aus den Teilnehmenden), bei A
  Termin und „erledigt“. Ein zweiter Klick auf die gewählte Art hebt sie auf –
  die Ergänzung läuft dann unter dem Ursprung mit. Ergänzungen mit eigener Art
  tragen eine Randlinie in der Farbe ihres Typs.
* Löschen (`LoeschenDialog` im Editor): Der Papierkorb an einem TOP („TOP
  löschen“), einem Eintrag („Eintrag löschen“) oder – sobald ein Eintrag mehr
  als eine Zeile hat – an einer übernommenen Zeile („Zeile löschen“) bietet
  „Durchstreichen“ und „Sofort löschen“; ein leerer neuer TOP bzw. Eintrag und
  eine neue Ergänzung entfallen sofort. Gestrichenes zeigt „Wiederherstellen“, gestrichene Einträge
  und Einträge gestrichener TOPs zusätzlich „entfällt“.
* Folgeprotokoll (`folgeprotokoll` in `src/bereiche/projektsteuerung/domain/protokoll.ts`): Nummer =
  höchste der Reihe + 1 (`naechsteNr`), Datum = nächster Termin des
  Vorprotokolls, Teilnehmende mit Status anwesend (außer nur Verteiler).
  Die Tagesordnung übernimmt `uebernahme` mit `eintragUebernehmen`:
  gestrichene TOPs, Einträge und Zeilen entfallen bereits im Folgeprotokoll,
  ebenso leere Zeilen und Einträge, die schon weitergeführt wurden
  (`uebernommenIn`). Erledigte Aufgaben – Eintrag oder Ergänzung mit eigener
  Art – gehen noch einmal mit und entfallen, wenn sie schon im Vorprotokoll
  erledigt waren (`letztmalig`). Ist der Ursprung eines Eintrags in diesem
  Sinn erledigt, laufen nur seine offenen Ergänzungen mit eigener Art weiter;
  ohne mitlaufende Zeile wird die erste von ihnen zum Eintrag. Jede
  übernommene Zeile behält ihr Ursprungsprotokoll; neue Zeilen erhalten die
  Nummer des Vorprotokolls. Wird ein Protokoll gelöscht, gelten die von ihm
  weitergeführten Aufgaben im Vorprotokoll wieder als offen.
* Druckfassung `protokollHtml` (`src/bereiche/projektsteuerung/domain/druck.ts`): Kopf mit Logos,
  Datum, Zeit, Ort, Protokollführung, Teilnehmende und Verteiler, Legende,
  Tabelle Nr. / Inhalt / Typ / Verantwortlich / Termin, nächster Termin,
  „Aufgestellt:“ und „Freigegeben:“, Hinweis. Je Eintrag zuerst der Ursprung
  mit seinen mitlaufenden Ergänzungen, darunter je Ergänzung mit eigener Art
  eine eigene Tabellenzeile mit Typ, Verantwortlich und Termin, ohne Nummer
  (`eintragHtml`). Unter jeder übernommenen Zeile steht ihr Ursprung („aus
  Prot. …“), ohne Punktnummer. Neue und gegenüber dem
  Vorprotokoll geänderte Angaben stehen blau (`eintragNeu`, `feldNeu`,
  `zeileFeldNeu`, `topNeu`; neue Zeilen ganz, ergänzter Text einer Zeile nur
  im Nachtrag).
  Erledigte und gestrichene TOPs, Einträge und Zeilen stehen durchgestrichen
  (Klasse `ps-gestrichen`): mit blauer Linie, wenn sie in diesem Protokoll
  erledigt bzw. gestrichen wurden (`zeileNeuGestrichen`, `topNeuGestrichen`,
  `ps-gestrichen-neu`), sonst mit schwarzer; der Text behält seine Farbe. Die
  Termin-Spalte nennt „entfällt“ bzw. „erledigt“, die Legende
  „Durchgestrichene Einträge sind erledigt oder entfallen.“ Die Druckansicht
  zeigt nur das Blatt; gedruckt wird über „Drucken / PDF“.

### 8.5 Übergreifende Bedienelemente

* Seitenleiste: Übersicht (mit der Zahl eigener To-Dos), Projekte, die
  einklappbare Gruppe „Einstellungen“ mit „Funktionen“ (aufgeklappt, solange
  die Seite Funktionen offen ist), darunter die markierten Projekte mit ihren
  überfälligen Aufgaben; unten „Angemeldet als“ (gemeinsam für alle Bereiche,
  Abschnitt 11; `einstellungen.bearbeiter` und `einstellungen.farbmodus`
  spiegeln sie), „Sicherung“, „Einspielen“, „Zurücksetzen“ und „Bereich
  wechseln“.
* Ampel (`ampelFuer` in `src/bereiche/projektsteuerung/domain/punkte.ts`, Bezeichnungen in
  `AMPEL_LABEL`): erledigt, überfällig, demnächst fällig (`VORLAUF_TAGE = 7`
  Tage vorher), im Plan, ohne Termin.
* Sicherung (`exportiereDaten`) lädt `projektsteuerung-sicherung-<Datum>.json`
  mit `"bereich": "projektsteuerung"`. Einspielen
  (`src/bereiche/projektsteuerung/components/Sicherung.tsx`) fragt „Sicherung einspielen?“ – mit
  „Der gesamte jetzige Bestand der Projektsteuerung in diesem Browser wird ersetzt. Die anderen
  Bereiche bleiben unberührt.“ –, bietet
  „Aktuellen Stand sichern“ und übernimmt „Angemeldet als“ und Farbmodus –
  dann für alle Bereiche – nur mit dem Haken „Auch „Angemeldet als“ und
  Farbmodus aus der Sicherung übernehmen – gilt dann in allen Bereichen“.
  Wie in der Baubetriebsplanung (7.4) heißt der erste Knopf nach einem Lade-
  oder Fassungsfehler „Gespeicherten Stand herunterladen“
  (`rohdatenHerunterladen`); nach einem Ladefehler warnt der Dialog mit
  demselben Text, legt vor dem Ersetzen mit `rohkopieVorEinspielen`
  (`src/bereiche/projektsteuerung/store/storage.ts`) die Rohkopie
  `projektsteuerung.data.v1.vor-einspielen-<Zeitpunkt>` an und ersetzt, wenn
  sie nicht in den Speicher passt, erst auf „Ohne Kopie einspielen“; bei
  einem Stand aus einer neueren Fassung ist „Einspielen“ auch im Dialog
  gesperrt.

### 8.6 Meldungen

| Meldung | Fundstelle | Ursache |
| --- | --- | --- |
| „Bitte einen Projektnamen angeben.“ | `src/bereiche/projektsteuerung/pages/Projekte.tsx` | Projekt ohne Namen. |
| „Bitte eine Bezeichnung angeben.“ | `src/bereiche/projektsteuerung/components/FunktionDialog.tsx`, `src/bereiche/projektsteuerung/components/GewerkDialog.tsx` | Funktion bzw. Gewerk ohne Bezeichnung. |
| „Die Funktion „…“ gibt es bereits.“ | `src/bereiche/projektsteuerung/components/FunktionDialog.tsx` | Bezeichnung im selben Gewerk schon vergeben (ohne Rücksicht auf Groß- und Kleinschreibung). |
| „„…“ ist bereits angelegt.“ | `src/bereiche/projektsteuerung/components/GewerkDialog.tsx` | Gewerk gibt es schon (auch „Übergreifend“). |
| „Funktionen des Gewerks „…“ sind noch Projektbeteiligten zugeordnet – das Gewerk lässt sich deshalb nicht löschen.“ | `src/bereiche/projektsteuerung/pages/Funktionen.tsx` | Löschen eines Gewerks, dessen Funktionen Personen tragen. |
| „In der Datei fehlt eine Spalte „Nachname“ oder „Name“.“ | `src/bereiche/projektsteuerung/domain/beteiligteImport.ts` | Excel-Import ohne erkennbare Kopfzeile. |
| „Die Datei enthält keine Zeile mit einem Nachnamen.“ | `src/bereiche/projektsteuerung/components/BeteiligteImport.tsx` | Excel-Import ohne verwertbare Zeile. |
| „Eintrag … durchgestrichen.“ / „Eintrag … gelöscht.“, ebenso für „TOP …“ und „Zeile … von Eintrag …“ | `src/bereiche/projektsteuerung/pages/projekt/ProtokollEditor.tsx` | Kein Fehler: „Durchstreichen“ bzw. „Sofort löschen“ im Dialog „… aus dem Protokoll löschen?“. |
| „Eintrag in TOP … verschoben.“ | `src/bereiche/projektsteuerung/pages/projekt/ProtokollEditor.tsx` | Kein Fehler: Ein Eintrag wechselte über „Nach oben“ bzw. „Nach unten“ in einen anderen TOP. |
| „„…“ ist noch … Projektbeteiligten zugeordnet und lässt sich deshalb nicht löschen.“ | `src/bereiche/projektsteuerung/pages/Funktionen.tsx` | Löschen einer Funktion, die Personen tragen. |
| „Bitte eine Funktion wählen.“ / „Bitte einen Nachnamen angeben.“ | `src/bereiche/projektsteuerung/components/BeteiligterDialog.tsx` | Pflichtangaben einer Person fehlen. |
| „Bitte die Besprechung benennen.“ / „Bitte das Datum angeben.“ | `src/bereiche/projektsteuerung/pages/projekt/Protokolle.tsx` | Neue Protokollreihe ohne Besprechung bzw. Datum. |
| Dateiname mit „ist keine gültige JSON-Datei“, „enthält keine Protokolle“ bzw. „ist keine gültige Protokolldatei“ | `src/bereiche/projektsteuerung/domain/protokoll.ts` | Übernahme aus dem Protokoll-Tool mit unpassender Datei. |
| „Das Vorschaufenster wurde blockiert. Bitte Pop-ups für KaPlan zulassen und erneut auf „Live-Druckansicht“ klicken.“ | `src/bereiche/projektsteuerung/components/common.tsx` | Der Browser verhindert das Fenster der Live-Druckansicht. |
| „Die Datei ist keine gültige JSON-Datei.“ | `src/bereiche/projektsteuerung/store/storage.ts` | Einspielen einer Datei, die kein JSON ist. |
| „Die Datei ist eine Sicherung des Planlaufmanagements – bitte dort einspielen.“ | `src/bereiche/projektsteuerung/store/storage.ts` | Das JSON enthält `projects`. |
| „Die Datei ist eine Sicherung der Baubetriebsplanung – bitte dort einspielen.“ | `src/bereiche/projektsteuerung/store/storage.ts` | Kennzeichen `"bereich": "baubetrieb"`. |
| „Die Datei stammt aus dem Protokoll-Tool – bitte im Projekt unter „Protokolle“ importieren.“ | `src/bereiche/projektsteuerung/store/storage.ts` | Das JSON enthält `protocols`. |
| „Die Datei ist keine Sicherung der Projektsteuerung.“ | `src/bereiche/projektsteuerung/store/storage.ts` | Kennzeichen `bereich` fehlt oder Listen fehlen. |
| „Die Sicherung stammt aus einer neueren Fassung von KaPlan. Bitte die Seite neu laden (Strg+Umschalt+R) und erneut einspielen.“ | `src/bereiche/projektsteuerung/store/storage.ts` | `version` größer als `DATEN_VERSION`. |
| Seite „Nicht gefunden“ | `src/bereiche/projektsteuerung/App.tsx` | Adresse nennt ein Projekt oder Protokoll, das es nicht (mehr) gibt. |

## 9. Projektregister und Controlling

### 9.1 Projektregister

Das einzige, was sich die Bereiche teilen, liegt in `src/gemeinsam/`:

* `src/gemeinsam/register.ts`: `Register` mit `projekte` (`RegisterProjekt`:
  `nummer`, `name`, `beschreibung`, `archiviert` – im Controlling für alle
  Bereiche –, `herkunft` – Bereich oder `'controlling'` –, `bereiche` mit je
  einer `Mitgliedschaft`: `id` des Projekts im Bereich, `archiviert`, `offen` für
  eine noch nicht vollzogene Übernahme, `markiert` als Spiegel der ★-Markierung
  im Bereich), `personen` (`RegisterPerson` mit den
  `PERSON_FELDER` Anrede, Vorname, Nachname, Firma, Kürzel, E-Mail, Telefon,
  Mobil, Anschrift, Notiz, `funktionen` als `FunktionsBezug` – Bezeichnung,
  Gewerk, Kürzel – und `ids` je Bereich) und `geloescht` (`Grabstein` mit den
  Bereichen, die eine Löschung noch nachziehen müssen). Schlüssel
  `kaplan-projektregister.v1` im `localStorage`, `REGISTER_VERSION = 2`
  (Fassung 2: `markiert`, vor der Umstellung eine Rohkopie
  `kaplan-projektregister.v1.vor-fassung-<n>`); `aufbereiten()` ergänzt fehlende Felder. Lässt sich der gespeicherte Stand
  nicht lesen oder stammt er aus einer neueren Fassung, bleibt er unberührt
  (`registerZustand`), und die Bereiche gleichen nicht ab. Ist der Speicher
  voll, räumt `speichern` Rohkopien über `nachRaeumenSpeichern`
  (`src/shared/speicher.ts`) und meldet sonst in der Konsole „Projektregister konnte
  nicht gespeichert werden: …“. `speichern` liefert `RegisterSpeicherZustand`
  (`'ok'`, `'voll'` oder `'gesperrt'`); der Stand des Fensters gilt auch
  ungespeichert und merkt sich das Ergebnis (`gespeichert`) sowie das Register,
  das zuletzt im Speicher stand (`basis`). Solange es nicht `'ok'` ist, schreibt
  auch ein Aufruf von `registerAendern` ohne Änderung – etwa der Abgleich eines
  Bereichs – den Stand erneut (`registerErneutSpeichern`, ohne Konsolenmeldung);
  ein Aufruf mit Änderung schreibt ohnehin den neuen Stand und meldet einen
  Fehlschlag wieder in der Konsole. `useRegisterSpeicherZustand` liefert das
  Ergebnis für den Hinweis im Controlling (9.4).
* Ein Fenster lädt das Register neu, wenn ein anderes es speichert
  (`storage`-Ereignis). Hält es Änderungen, die sich nicht speichern ließen,
  trägt es sie auf den neuen Stand nach und speichert erneut
  (`eigeneAenderungenNachziehen`, reine Funktion: eigener Stand gegen `basis`,
  je Projekt bzw. Person über die Kennung und darin je Feld – Mitgliedschaften
  je Bereich und Feld –; bei Widerspruch gilt die eigene Änderung, eine
  Löschung geht jeder Änderung vor, Personen ohne Projekt entfallen;
  Löschvermerke: die fremden ohne die hier erledigten, dazu die hier neuen).
  Neu nachgezogen werden nur Projekte des Controllings (`herkunft`
  `'controlling'`): Was ein Bereich neu eingetragen hat – Projekte seiner
  Herkunft, Personen –, steht in seinem Bestand, und sein nächster Abgleich
  trägt es wieder ein, verknüpft mit einem Projekt gleicher Nummer bzw. einer
  Person gleicher E-Mail aus dem fremden Stand (was das Controlling in diesem
  Fenster an einem solchen Projekt geändert hat, entfällt dabei). Hat eine Seite ein Projekt bzw.
  eine Person gelöscht, die die andere seit `basis` in Bereiche übernommen hat,
  ergänzt die Funktion deren Kennungen als Löschvermerk – bei Projekten auch
  noch offene Mitgliedschaften, denn der Bereich legt das Projekt an, bevor
  sein nächster Abgleich die Übernahme einträgt. Verglichen und gespeichert wird
  der nachgezogene Stand in der Form von `aufbereiten`; geschrieben wird er mit
  `nachgezogenAuf`, der Kennung des fremden Stands (`kennung`, FNV-1a über
  dessen JSON; `aufbereiten` lässt das Feld beim Laden fallen). Bringt das
  nächste `storage`-Ereignis – im Ereignis selbst oder im Speicher – einen Stand
  mit derselben Kennung, hat ein zweites Fenster zugleich auf denselben Stand
  nachgezogen und das Schreiben dieses Fensters überschrieben; dann zieht es
  seine Änderungen gegenüber jenem Stand noch einmal nach (`nachgezogen` im
  Stand des Fensters). Lässt sich auch das nicht speichern, bleibt der Stand
  ungespeichert; stammt der neue Stand aus einer neueren Fassung oder ist er
  unlesbar, gilt er, und die nicht gespeicherten Änderungen entfallen (Meldung
  im Controlling, 9.4). Schreiben zwei Fenster sonst im selben Augenblick, gilt
  der zuletzt geschriebene Stand.
* `registerAendern` ändert das Register über eine Funktion und benachrichtigt
  nur bei einer tatsächlichen Änderung (bzw. wenn sich das Ergebnis des
  Speicherns ändert); `useRegister` liefert es für die Oberfläche
  (`useSyncExternalStore`).
* Funktionen gelten bereichsübergreifend als dieselben, wenn Bezeichnung und
  Gewerk übereinstimmen (`funktionsSchluessel`).
* `JEDES_PROJEKT_IN` (`'leistungsnachweise'`): Bereich, in dem jedes Projekt
  geführt wird. `genannteBereiche(bereich)` liefert die Bereiche, die eine
  Projektansicht nennt – im Bereich die anderen ohne `JEDES_PROJEKT_IN` (außer
  dort selbst), im Controlling (`null`) alle. `markiertAnderswo(register,
  bereich)` nennt je Kennung im Bereich die anderen Bereiche, die das Projekt
  mit ★ markiert haben.

### 9.2 Abgleich mit den Bereichen

* `src/gemeinsam/useRegisterAbgleich.ts`: Jeder Store
  (`src/bereiche/planlauf/store/store.tsx`, `src/bereiche/baubetrieb/store/store.tsx`,
  `src/bereiche/projektsteuerung/store/store.tsx`, `src/bereiche/leistungsnachweise/store/store.tsx`)
  gleicht nach jeder Änderung seines Bestands und jeder Änderung des Registers ab – außer
  einem aus einem anderen Fenster nachgeladenen Stand (siehe unten, *Mehrere Fenster*) –, alle vier nur
  bei `ladeZustand === 'ok'`. Zuerst überträgt `uebertragen`
  (`src/gemeinsam/abgleich.ts`) die Änderungen des Bereichs (alter gegen neuen
  Stand) ins Register, dann trägt `abgleichen` Unbekanntes ein und liefert einen
  `Plan`, den der Store über sein eigenes `mutate()` übernimmt. Nach
  `ersetzeDaten` und `zuruecksetzen` meldet der Store `ersetzt()`: Dann entfällt
  das Übertragen, und für verknüpfte Projekte und Personen gilt das Register.
* Vollständig gleicht `abgleichen` (Parameter `vollstaendig`) nur beim ersten
  Abgleich nach dem Laden (Ref `erstmals` in `useRegisterAbgleich`) und nach
  `ersetzt()` ab: Nur dann löst es Mitgliedschaften von Projekten, die der
  Bereich nicht mehr führt, und übernimmt die ★ aus dem Bestand – außerdem die ★
  eines eben übernommenen Projekts, dessen Mitgliedschaft noch `offen` ist.
  Sonst meldet beides allein `uebertragen` (gelöscht, wenn das Projekt im alten
  Stand vorkam und im neuen fehlt; ★, wenn sich `markiert` geändert hat). So
  kommen zwei Fenster mit verschiedenen Ständen zur Ruhe.
* Mehrere Fenster: Jeder Store lädt seinen Bestand nach, wenn ein anderes
  Fenster ihn speichert (`useFremdeAenderung` in `src/gemeinsam/useFremdeAenderung.ts`,
  `storage`-Ereignis auf `SPEICHER_SCHLUESSEL` des Bereichs, nur bei
  `ladeZustand === 'ok'`). Den nachgeladenen Stand meldet der Store vorher mit
  `nachgeladen(daten)` (`useRegisterAbgleich` in `src/gemeinsam/useRegisterAbgleich.ts`,
  dasselbe Objekt, das danach der Bestand wird) – nicht mit `ersetzt()`, ein noch offenes
  `ersetzt()` verfällt. Dieser Stand wird weder übertragen noch abgeglichen, nur als
  Ausgangspunkt (`vorher`) für die nächste eigene Änderung vermerkt: Das andere Fenster hat
  beides schon getan, und sein Register kommt als eigenes `storage`-Ereignis, oft erst nach
  dem Bestand – ein Abgleich dazwischen nähme dessen Änderungen zurück. Erst wenn sich danach
  das Register ändert, gleicht der Store mit beiden aktuellen Ständen ab (nicht
  `vollstaendig`). Deshalb steht in jedem Store der Abgleich-Effekt (`useRegisterAbgleich`)
  nach dem Speicher-Effekt: Ein anderes Fenster erhält erst den Bestand, dann das Register.
  Der nachgeladene Stand wird nicht zurückgeschrieben (`uebernommen`); stammt er aus
  einer neueren Fassung, übernimmt der Store den Ladezustand und speichert nicht
  mehr.
* Je Bereich beschreibt `sichtFuerRegister` den Bestand und wendet
  `registerPlanAnwenden` einen Plan an (`src/bereiche/planlauf/domain/register.ts`,
  `src/bereiche/baubetrieb/domain/register.ts`, `src/bereiche/projektsteuerung/domain/register.ts`,
  `src/bereiche/leistungsnachweise/domain/register.ts`):
  * Planlaufmanagement: Projekte mit Nummer, Name und Beschreibung; Kontakte
    ohne den eigenen (`eigen`) mit ihren Funktionen außer der eigenen
    (`istEigeneFunktion`). Übernommene Projekte erhalten die
    projektübergreifenden Funktionen als Projektfunktionen; fehlt eine Funktion
    eines Registereintrags im Projekt, entsteht sie als Projektfunktion (Kürzel,
    Farbe und Seite von der projektübergreifenden Funktion gleicher Bezeichnung
    und gleichen Gewerks, sonst Seite aus `seiteAusFunktion`). Eine Funktion, die eine andere Person
    ausfüllt, bleibt bei dieser. Gelöscht wird über `projektLoeschen` bzw.
    `kontaktLoeschen` mit Löschvermerk.
  * Baubetriebsplanung: Projekte mit `projektnummer` als Nummer und `name`;
    keine Personen.
  * Projektsteuerung: Projekte mit Nummer, Name und Beschreibung; Beteiligte mit
    ihrer Funktion. Je Person bleibt die bisherige Funktion, solange das
    Register sie nennt, sonst gilt die erste vorhandene Funktion des Registers;
    fehlt sie, wird sie als projektübergreifende Funktion angelegt.
  * Leistungsnachweise (`src/bereiche/leistungsnachweise/domain/register.ts`):
    Projekte mit Nummer, Name und Beschreibung; keine Personen. Übernommene
    Projekte erhalten `IMPORT_PROJEKT_VORGABEN` (Leistungsbereich, Raster,
    Zeitraumregel) und sind nicht markiert (`markiert: false`).
* Jedes Projekt auch in den Leistungsnachweisen: Im Abgleich von
  `JEDES_PROJEKT_IN` erhält – nach dem Verknüpfen gleicher Projektnummern –
  jedes nicht archivierte Registerprojekt ohne Mitgliedschaft dort eine
  (`offen`; als archiviert, wenn das Projekt in allen seinen Bereichen
  archiviert ist), und der Plan legt es an (Kennung = die des Registers, bei
  Belegung eine neue). `projektAnlegen` sieht `JEDES_PROJEKT_IN` stets vor;
  `uebernahmeZuruecknehmen` ändert dort nichts.
* Markierung: Planlaufmanagement, Baubetriebsplanung und Projektsteuerung geben
  in ihrer Sicht `markiert` mit; `abgleichen` trägt es in die Mitgliedschaft
  ein. Die Leistungsnachweise geben keine Markierung weiter.
* Beim ersten Abgleich verknüpft `abgleichen` ein Projekt mit einem nicht
  archivierten Registerprojekt gleicher Projektnummer, das der Bereich noch
  nicht führt (ohne Nummer: gleicher Bezeichnung), und darin Personen gleicher
  E-Mail-Adresse, ersatzweise gleichen Vor- und Nachnamens. Ebenso verknüpft es
  eine offene Mitgliedschaft (vom Controlling vorgesehen) mit einem noch nicht
  verknüpften eigenen Projekt gleicher Nummer, statt ein zweites anzulegen.
  An beiden Stellen führt `stammdatenZusammenfuehren` die Stammdaten zusammen:
  Leere Angaben des Registers füllt der Bereich, sonst gilt das Register; eine
  abweichende Bezeichnung oder Beschreibung des Bereichs hängt es als Vermerk an
  die Beschreibung des Registerprojekts („Bezeichnung in … vor der
  Zusammenführung: …“ – der Name in Anführungszeichen – bzw. „Beschreibung in …
  vor der Zusammenführung: …“, mit dem Titel des Bereichs). Vermerkzeilen zählen beim Lückenfüllen nicht als
  Beschreibung, gleiche Vermerke entstehen nicht doppelt.
* Führt ein Bereich ein Projekt nicht mehr, entfällt seine Mitgliedschaft; ohne
  weitere Mitgliedschaft entfällt das Projekt samt Personen auch im Register,
  außer es stammt aus dem Controlling und der löschende Bereich ist nicht
  `JEDES_PROJEKT_IN` (`mitgliedschaftLoesen`). In `JEDES_PROJEKT_IN` entfällt
  ein Projekt aus dem Controlling nur, wenn es dort ausdrücklich gelöscht wurde
  (Parameter `geloescht`, von `uebertragen` gesetzt); fehlt es nach
  Zurücksetzen oder Einspielen, bleibt es im Register und wird im selben
  Abgleich wieder als offen angelegt. Löscht ein
  Bereich eine Person, entfernt das Register sie und vermerkt die Löschung für
  die anderen Bereiche.

### 9.3 Bedienelemente in den Bereichen

Bausteine in `src/gemeinsam/ProjektBereiche.tsx` (Gestaltung in
`src/gemeinsam/gemeinsam.css`, Präfix `gem-`):

* `BereichsMarken` unten in jeder Projektkachel: „Auch in“ mit den anderen
  Bereichen des Projekts (`genannteBereiche` – außerhalb der
  Leistungsnachweise ohne diese), als „… · archiviert“ bzw. „… · vorgesehen“.
  Ebenso lassen „Geführt in“ und der Löschhinweis (`andereBereiche`,
  `useLoeschHinweis`) die Leistungsnachweise außerhalb ihres Bereichs weg.
* `FremdeProjekte`: grau hinterlegter Abschnitt „Projekte aus anderen
  Bereichen“ mit den nicht archivierten Registerprojekten, die der Bereich nicht
  führt (mit der Suche der Projektliste gefiltert), je Karte Nummer,
  Bezeichnung, Beschreibung (falls vorhanden), „Geführt in“ – führt kein
  genannter Bereich das Projekt, die Herkunft (`herkunftOhneBereich`): „Im
  Controlling angelegt“, „Hier gelöscht – weiter in den Leistungsnachweisen
  geführt“ (Herkunft ist dieser Bereich) bzw. „Nur in den Leistungsnachweisen
  geführt“ – und „Übernehmen in …“ (`inBereichUebernehmen`). In den Leistungsnachweisen ist
  der Abschnitt leer, weil sie jedes Projekt führen.
* `ArchivAbschnitt`: aufklappbares „Archiv“ mit den im Bereich archivierten
  Projekten und dem Hinweis „Archiviert wird im Controlling – je Bereich oder
  für alle.“ Archivierte Projekte fehlen in Übersicht und Seitenleiste
  (`useArchivierte`, `sichtbareProjekte`). Nach derselben Regel erscheint in
  den Übersichten aller vier Bereiche der Hinweis „Kein Projekt markiert – es
  werden alle angezeigt.“ (im Planlaufmanagement „Kein Projekt markiert – es
  werden alle Projekte angezeigt.“): wenn es nicht archivierte Projekte gibt und
  keines davon markiert ist; archivierte markierte zählen nicht, in den
  Leistungsnachweisen gilt auch ein anderswo markiertes Projekt als markiert
  (`istMarkiert`).
* `ArchivHinweis` oben im Projekt eines archivierten Projekts: „Dieses Projekt
  ist … archiviert. Es erscheint nicht in Übersicht und Seitenleiste;
  zurückholen lässt es sich im Controlling.“
* `VerknuepfungsHinweis` im Dialog „Neues Projekt“, wenn die Projektnummer zu
  einem Registerprojekt gehört, das der Bereich nicht führt: „Die
  Projektnummer gehört zu „…“. Beim Anlegen wird es damit verknüpft:
  Bezeichnung und Projektbeteiligte kommen von dort und gelten in allen
  Bereichen.“
* Löschdialoge der Projekte ergänzen bei geteilten Projekten „In … bleibt das
  Projekt mit seinen Projektbeteiligten erhalten.“ (`useLoeschHinweis`); führt
  außer den Leistungsnachweisen kein genannter Bereich das Projekt, „In den
  Leistungsnachweisen bleibt das Projekt mit seinen Leistungen und
  Projektbeteiligten erhalten und steht danach hier unter „Projekte aus anderen
  Bereichen“; ganz löschen lässt es sich nur im Controlling unter „Projekte“.“
* `RegisterBeteiligte`: Karte „Projektbeteiligte“ in der Baubetriebsplanung mit
  Name, Funktion, Firma und Kontakt.

### 9.4 Controlling

Einstiegspunkt `src/bereiche/controlling/index.tsx`; ohne Entsperrung zeigt er
die PIN-Abfrage (`src/bereiche/controlling/PinEingabe.tsx`: „Controlling“, Feld für
die PIN, „Entsperren“, „Zur Bereichsauswahl“; mit der vierten Ziffer wird
geprüft; `.ct-pin` hat unten zusätzlich die Höhe des Hinweises „Neue Fassung“,
`--neue-fassung-hoehe`, und reicht der Platz nicht, scrollt die Seite). Die Entsperrung gilt für die Sitzung (`sessionStorage`, Schlüssel
`kaplan-controlling.entsperrt`) bis „Sperren“ in der Seitenleiste
(`src/bereiche/controlling/App.tsx`). Einen eigenen Bestand hat das Controlling
nicht; Gestaltung in `src/bereiche/controlling/controlling.css` (Präfix `ct-`).

| Route | Seite | Aktionen |
| --- | --- | --- |
| `#/controlling` bzw. `#/controlling/projekte` | Projekte (`src/bereiche/controlling/pages/Projekte.tsx`) | Kacheln „Projekte“ und „aktiv in …“ je Bereich (gezählt wird nur der Zustand „Aktiv“, ohne vorgesehene Übernahmen – `zustandIm`); Suche; „Neues Projekt“ (Projektnummer – eindeutig –, Bezeichnung, Beschreibung, „Übernehmen in“ mit einem Haken je Bereich; „Leistungsnachweise“ fest angehakt mit „(immer)“). Je nicht archiviertem Projekt eine Karte mit Nummer, Bezeichnung, Beschreibung, „Bearbeiten“, Archivieren („In allen Bereichen archivieren“) und „Löschen“; je Bereich der Stand „Aktiv“, „Archiviert“, „Vorgesehen“ oder „nicht geführt“ mit „Übernehmen“, „Zurücknehmen“, „Archivieren“ bzw. „Zurückholen“ – in den Leistungsnachweisen (`JEDES_PROJEKT_IN`) ohne Übernehmen und Zurücknehmen, ohne Mitgliedschaft „Vorgesehen“ (Tooltip „Jedes Projekt gehört in die Leistungsnachweise – sie legen es beim nächsten Öffnen an“, bei archiviertem Projekt „Jedes Projekt gehört in die Leistungsnachweise – sie legen es an, sobald es aus dem Archiv geholt ist“). Die Beschreibung behält ihre Zeilenumbrüche (`.ct-beschreibung`, `white-space: pre-line`). |
| `#/controlling/archiv` | Archiv (dieselbe Seite) | Die im Controlling archivierten Projekte mit „Bearbeiten“, „Aus dem Archiv holen“ und „Löschen“; der Stand je Bereich ohne Schaltflächen. |
| `#/controlling/leistungsnachweise/<reiter>`, `…/projekt/<id>/<reiter>` bzw. `…/projekt/<id>/nachweis/<id>` | Controlling der Leistungsnachweise (`LeistungsnachweiseControlling` in `src/bereiche/leistungsnachweise/controlling.tsx`), Menüpunkt „Leistungsnachweise“ unter „Bereiche“ | Siehe 10.5. |

Lässt sich das Projektregister nicht speichern (`useRegisterSpeicherZustand`,
9.1), steht über jeder Ansicht des Controllings „Projektregister nicht
gespeichert.“ mit dem Grund („Der Speicher des Browsers ist voll“ bzw. „Der
Browser lässt das Speichern nicht zu (etwa durch Datenschutzeinstellungen)“) und
„Erneut speichern“ (`registerErneutSpeichern`; `RegisterSpeicherHinweis` in
`src/bereiche/controlling/App.tsx`, Gestaltung `.ct-speicherhinweis`). Gelingt
das Speichern – über den Knopf, einen weiteren Schreibzugriff oder nachdem ein
anderes Fenster gespeichert hat (9.1) –, verschwindet der Hinweis mit der Meldung
„Projektregister gespeichert.“; fiele der Fokus dabei auf `body`, setzt ihn
`RegisterSpeicherHinweis` auf die Überschrift der Kopfzeile (`h1.ct-ueberschrift`,
`tabIndex={-1}`, ohne Fokusrahmen). Hat das andere Fenster einen Stand gespeichert,
den dieses nicht lesen kann (`useRegisterZustand` nicht `'ok'`), entfallen die
Änderungen; statt der Erfolgsmeldung erscheint dann „Nicht gespeicherte Änderungen
am Projektregister verworfen – ein anderes Fenster hat einen Stand gespeichert, den
diese Seite nicht lesen kann.“

Router: `src/bereiche/controlling/lib/router.ts`; unbekannte Adressen führen auf
die Projekte. Die Aktionen auf dem Register stehen als reine Funktionen in
`src/gemeinsam/abgleich.ts` (`projektAnlegen`, `projektBearbeiten`,
`projektArchivieren`, `bereichArchivieren`, `inBereichUebernehmen`,
`uebernahmeZuruecknehmen`, `projektEntfernen`); die Bereiche vollziehen sie
beim nächsten Abgleich.

### 9.5 Meldungen

| Meldung | Fundstelle | Ursache |
| --- | --- | --- |
| „Die PIN stimmt nicht.“ | `src/bereiche/controlling/PinEingabe.tsx` | Falsche PIN. |
| „Bitte eine Bezeichnung angeben.“ | `src/bereiche/controlling/pages/Projekte.tsx` | Projekt ohne Bezeichnung. |
| „Die Projektnummer gehört bereits zu „…“.“ | `src/bereiche/controlling/pages/Projekte.tsx` | Projektnummer schon vergeben (ohne Rücksicht auf Groß- und Kleinschreibung). |
| „Projekt angelegt – die gewählten Bereiche übernehmen es beim nächsten Öffnen.“ | `src/bereiche/controlling/pages/Projekte.tsx` | Kein Fehler: neues Projekt (die Leistungsnachweise übernehmen es immer, `JEDES_PROJEKT_IN`). |
| „Projekt gespeichert – die Bereiche übernehmen die Angaben.“ | `src/bereiche/controlling/pages/Projekte.tsx` | Kein Fehler: „Bearbeiten“. |
| „„…“ archiviert – in allen Bereichen.“ / „„…“ aus dem Archiv geholt.“ | `src/bereiche/controlling/pages/Projekte.tsx` | Kein Fehler. |
| „„…“ wird beim nächsten Öffnen in … übernommen.“, „Übernahme zurückgenommen.“, „In … archiviert.“, „In … wieder aktiv.“ | `src/bereiche/controlling/pages/Projekte.tsx` | Kein Fehler: Aktionen je Bereich. |
| „Projekt gelöscht.“ | `src/bereiche/controlling/pages/Projekte.tsx` | Kein Fehler: Löschen nach der Rückfrage „Projekt löschen?“ („Endgültig löschen“). |
| „„…“ übernommen – mit … Projektbeteiligten.“ bzw. „„…“ übernommen.“ | `src/gemeinsam/ProjektBereiche.tsx` | Kein Fehler: „Übernehmen in …“ in einem Bereich. |
| „Das Projektregister ließ sich nicht lesen. …“ bzw. „Das Projektregister stammt aus einer neueren Fassung von KaPlan. …“ | `src/bereiche/controlling/App.tsx` | Gespeichertes Register unlesbar bzw. `version` größer als `REGISTER_VERSION`. |
| „Projektregister nicht gespeichert. …; Änderungen an den Projekten gehen beim Schließen der Seite verloren.“ | `src/bereiche/controlling/App.tsx` | Das letzte Speichern des Registers ist gescheitert (`RegisterSpeicherZustand` `'voll'` bzw. `'gesperrt'`, 9.1) – auch nach dem Räumen der Rohkopien. Verschwindet, sobald ein erneuter Versuch gelingt. Speichert ein anderes Fenster das Register, trägt das Fenster seine nicht gespeicherten Änderungen auf dessen Stand nach und versucht es erneut (`eigeneAenderungenNachziehen`); scheitert auch das, bleibt der Hinweis. Ist dessen Stand unlesbar oder aus einer neueren Fassung, entfallen die Änderungen („Nicht gespeicherte Änderungen am Projektregister verworfen – …“). |
| „Das Projektregister lässt sich weiterhin nicht speichern.“ | `src/bereiche/controlling/App.tsx` | „Erneut speichern“ ist wieder gescheitert. |
| „Projektregister gespeichert.“ | `src/bereiche/controlling/App.tsx` | Kein Fehler: Nach dem Hinweis „Projektregister nicht gespeichert.“ ließ sich das Register wieder speichern. |
| „Nicht gespeicherte Änderungen am Projektregister verworfen – ein anderes Fenster hat einen Stand gespeichert, den diese Seite nicht lesen kann.“ | `src/bereiche/controlling/App.tsx` | Während der Hinweis „Projektregister nicht gespeichert.“ stand, hat ein anderes Fenster das Register gespeichert – unlesbar oder aus einer neueren Fassung von KaPlan (`registerZustand`, 9.1). Dessen Stand gilt; neu laden. |

## 10. Bereich Leistungsnachweise

Erster Entwurf, übernommen aus dem Repository `LR-PMKA/KaPlan-Test`
(Zweig `claude/gifted-cray-0qdko3`). Im Bereich erfasst jede angemeldete
Person nur ihre eigenen Leistungen je Projekt, schreibt je Zeitraum am
gemeinsamen Leistungstext mit und bestätigt ihre Monate (10.3); daraus
entstehen von selbst gemeinsame Leistungsnachweise. Leistungsnachweise und
Einstellungen der Projekte gibt es nur im Controlling (10.5). Einstiegspunkt `src/bereiche/leistungsnachweise/index.tsx`,
Rahmen und Seitenleiste in `src/bereiche/leistungsnachweise/App.tsx`, Logo
`public/logos/Logo_Leistungsnachweise.png`. Der Bereich greift nicht auf die
anderen Bereiche zu; seine Projekte teilt er über das Projektregister
(Abschnitt 9), sein Controlling bindet der Controlling-Bereich über
`src/bereiche/leistungsnachweise/controlling.tsx` ein.

### 10.1 Datenmodell und Speicherung

* `src/bereiche/leistungsnachweise/domain/types.ts`: `Mitarbeiter` (Kürzel,
  Vor- und Nachname, `aktiv`), `Projekt` (Nummer, Name, `kurzname`, Status,
  `leistungsbereich`, `raster` – `tag`, `woche`, `monat` –, `zeitraumregel` –
  `fortlaufend` (Vorgabe, `IMPORT_PROJEKT_VORGABEN` in
  `src/bereiche/leistungsnachweise/domain/import.ts`: der offene Nachweis wächst
  mit, bis er abgeschlossen wird; beim Abschluss endet er am letzten Tag mit
  Leistungen, `abschlussZeitraum`) oder `monat` (je Kalendermonat), Beschriftung
  `ZEITRAUMREGEL_LABEL` –, `abschnitte`, `logos`), `Leistung` (Projekt,
  Mitarbeiter, Datum, Text, Stunden, Abschnitt, `projektelement`, `quelle`
  `manuell` oder `import`, `erfasst`, seit Fassung 7 `geaendert` – Zeitpunkt
  der letzten Änderung von Datum, Stunden, Text oder Abschnitt, gesetzt von
  `updateLeistung`) und `Leistungsnachweis` (Zeitraum `von`/`bis`,
  Raster, Status `entwurf` oder `abgeschlossen`, bearbeitete `texte` –
  `ZeilenText` mit `text`, `leistungIds` und seit Fassung 7 `ausgang`, dem Text
  der Zeile ohne die Bearbeitung beim Beginn der Bearbeitung –,
  `aufschlaege` je Zeile und Abschnitt, `bemerkung`, `nachgereicht` –
  Kennungen übernommener Leistungen aus früheren Zeiträumen –, `bisFest` – das
  Ende hat das Controlling von Hand festgelegt –, festgeschriebener `stand`;
  dessen Zeilen tragen `nachgereicht` für die Zeile nachgereichter Leistungen,
  er selbst seit Fassung 7 `erfassungsRaster` – das Raster des Projekts beim
  Abschluss). Seit Fassung 7 dazu `Periodentext` (gemeinsamer Leistungstext
  eines Projekts für eine Erfassungsperiode: `projektId`, `schluessel` wie
  „2026-10|W2026-44“, `text`, die beim Bearbeiten berücksichtigten Leistungen
  `leistungIds` und – nach Person, Tag und Text, `stichpunktInhalt` –
  `inhalte`, `bearbeiter`, `geaendert`) und `Bestaetigung` (`projektId`,
  `mitarbeiterId`, `monat` JJJJ-MM, `am` und je Zeitraum `perioden` –
  Schlüssel → `periodenKennung`; eine Kennung des ganzen Monats führt sie
  nicht, `aufbereiten()` übernimmt eine solche aus der Entwicklung nicht);
  `NachweisZeile.textGemeinsam`
  kennzeichnet einen Zeilentext aus den gemeinsamen Texten. `pruefsumme`
  (zweimal FNV-1a) bildet Kennungen aus dem Inhalt.
  Welche Leistungen ein Nachweis zeigt, ergibt sich aus ihrem Datum,
  nachgereichte stehen statt dessen in dem Nachweis, der sie übernommen hat, und
  Leistungen im Stand eines anderen abgeschlossenen Nachweises bleiben dort
  (`leistungenDesNachweises`; `nachweisDerLeistung` prüft nachgereicht, dann
  `abgerechnetIn`, dann das Datum – beide in
  `src/bereiche/leistungsnachweise/domain/nachweis.ts`). `abgerechnetIn`,
  `nachgereichtIn` und `nachweisDerLeistung` lesen aus einem Verzeichnis je
  Nachweisliste (`WeakMap`) – Nachweislisten werden deshalb nie an Ort und
  Stelle geändert. Nachgereichte Leistungen außerhalb des Zeitraums bilden eine
  eigene Zeile: Schlüssel mit `NACHGEREICHT_PRAEFIX` (`N`) vor dem
  Periodenschlüssel, etwa `NW2026-45`, die Periode gekürzt auf die Tage vor `von`. `einstellungen.mitarbeiterId` ist die angemeldete Person.
* Schlüssel `leistungsnachweise.data.v1` im `localStorage`
  (`src/bereiche/leistungsnachweise/store/storage.ts`), `DATEN_VERSION = 7`.
  Fassung 3 kennt die Rolle Controlling an Mitarbeitern nicht mehr;
  `aufbereiten()` übernimmt sie nicht. Fassung 4 (`vonFassung3`) stellt alle
  Projekte auf `zeitraumregel` `fortlaufend`; vorhandene Nachweise bleiben.
  Fassung 5: `nachgereicht` ergänzt `aufbereiten()` leer. Fassung 6: `bisFest`
  ergänzt `aufbereiten()` als false; `migriere()` stellt mit
  `nachgereichteZeilenUmstellen` die Zeilen nachgereichter Leistungen in
  Texten, Aufschlägen und im festgeschriebenen Stand auf N-Schlüssel um – bei
  Zeilen, in denen laufende und nachgereichte Leistungen zusammenstanden, zieht
  ein Text, dessen `leistungIds` nur nachgereichte enthalten, auf den
  N-Schlüssel um, und `aufschlaegeAufteilen` teilt die Aufschläge auf beide
  Zeilen auf: mit Abschnittsspalten so, dass jede Spalte abgerechnet bleibt,
  wie sie war (ein Abzug auf die ganze Zeile wird zu Abzügen auf die
  getroffenen Abschnitte), sonst über den Aufschlag auf die ganze Zeile (ein
  Abzug mindert zuerst die laufende Zeile bis 0). Im festgeschriebenen Stand
  ersetzt das Zeilenpaar die alte Zeile nur, wenn Leistungen, erfasste Stunden
  (auch je Abschnitt und Mitarbeiter) und abgerechnete Stunden übereinstimmen –
  zeigt der Stand Abschnittsspalten, auch je Spalte –, ohne
  die abgerechneten Stunden zu ändern. Fassung 7 (`vonFassung6`) trägt die
  leeren Listen `periodentexte` und `bestaetigungen` nach; `aufbereiten()`
  verwirft gemeinsame Texte ohne bekanntes Projekt, mit ungültigem Schlüssel
  (`erfassungsPeriodeAusSchluessel`) oder leerem Text und Bestätigungen ohne
  bekanntes Projekt bzw. bekannten Mitarbeiter oder ohne gültigen Monat; je
  Schlüssel bleibt der erste Eintrag. Gespeichert wird nur bei
  `ladeZustand` 'ok'; vor einer Umstellung legt `ladeDaten` eine Rohkopie
  `leistungsnachweise.data.v1.vor-fassung-<n>` an. Ohne gespeicherten Bestand
  gibt es die Demodaten nur, solange das Projektregister leer ist; sonst beginnt
  der Bereich leer und nimmt die Registerprojekte auf (`ladeDaten`).
  `speichereDaten` liefert `SpeicherZustand` (`'ok'`, `'voll'`, `'gesperrt'`)
  und räumt bei vollem Speicher Rohkopien einzeln (`nachRaeumenSpeichern` in
  `src/shared/speicher.ts`, auch die anderer Bereiche, zurückgestellt, wenn es nicht
  reicht); dann zeigt
  `SpeicherHinweis` (`src/bereiche/leistungsnachweise/components/SpeicherHinweis.tsx`,
  im Bereich und im Controlling) „Nicht gespeichert – bitte Sicherung
  herunterladen.“ mit „Der Speicher des Browsers ist voll“ bzw. „Der Browser
  lässt das Speichern nicht zu (etwa durch Datenschutzeinstellungen)“ und
  „Sicherung herunterladen“. Speichert ein anderes Fenster den Schlüssel, lädt
  der Store ihn nach (`useFremdeAenderung`, `SPEICHER_SCHLUESSEL`, 9.2).
  Sicherungen tragen `"bereich": "leistungsnachweise"`.
* Alle Schreibzugriffe über `mutate()` in
  `src/bereiche/leistungsnachweise/store/store.tsx`; danach (`aenderungAnwenden`)
  ziehen die gemeinsamen Texte mit, wenn sich die Grenzen der Nachweise ändern
  (`periodentexteNachziehen` in
  `src/bereiche/leistungsnachweise/domain/erfassung.ts`, nicht beim Einspielen),
  mit ihnen die Bestätigungen aufgegangener Teile (`bestaetigungenNachziehen`,
  10.3),
  `nachweiseBereinigen` (`src/bereiche/leistungsnachweise/domain/nachweis.ts`)
  räumt auf – `geaendert` setzt es auch an offenen Nachweisen, in deren Zeitraum
  sich ein gemeinsamer Text geändert hat –, `erfassungBereinigen` entfernt Texte
  und Bestätigungen gelöschter Projekte bzw. Mitarbeiter, und
  `useRegisterAbgleich` gleicht die Projekte mit dem Register ab.
* Angemeldet ist der aktive Mitarbeiter, dessen Name dem unter „Angemeldet
  als“ entspricht – „Vorname Nachname“ oder „Nachname, Vorname“, ohne Rücksicht
  auf Groß- und Kleinschreibung (`mitarbeiterZumNamen` in
  `src/bereiche/leistungsnachweise/domain/rechte.ts`); eine eigene Anmeldung
  gibt es nicht. Der Store zieht Name, Farbmodus und
  `einstellungen.mitarbeiterId` nach (`useBenutzerAbgleich` mit
  `anmeldungAnwenden`). Im Bereich bei `ladeZustand` 'ok' legt er eine fehlende
  Person selbst an (`anmeldeLage` `anlegen`): kein Mitarbeiter dieses Namens,
  auch kein ausgeschiedener, und der Name hat Vor- und Nachnamen – aktiv, Kürzel
  `kuerzelFrei(kuerzelAus(…))`, Kennung aus dem Namen (`mitarbeiterKennung`, vor
  `mutate` gebildet; gleiche Namen ergeben dieselbe Kennung, sodass StrictMode
  und zwei Fenster keine Doppel anlegen). Wechselt der Name, entfernt
  `anmeldungAnwenden` im Bereich die unter dem bisherigen Namen angelegte Person
  (Kennung `mitarbeiterKennung` des bisherigen Namens in
  `einstellungen.bearbeiter`), wenn sie aktiv ist, keine Leistungen hat und in
  keinem festgeschriebenen Stand steht (`stundenJeMitarbeiter`) – ein
  Tippfehler hinterlässt so keinen Mitarbeiter. Eine vergebene Kennung führt
  schon zur Lage `umbenannt`. Im Controlling wird niemand angelegt oder entfernt.
  Die übrigen Lagen (`AnmeldeLage`) nennt `anmeldeHinweis` als Leiste über dem
  Inhalt (`AnmeldeHinweis` in
  `src/bereiche/leistungsnachweise/components/Anmeldung.tsx`) und – über
  `useMitAnmeldung` – als Kurzmeldung, wenn eine Handlung eine Anmeldung
  braucht (Leistung erfassen, Excel-Import, Leistungstext, Bestätigen):
  `ohneNachname`, `ausgeschieden`, `umbenannt` (das Controlling hat die unter
  diesem Namen angelegte Person – Kennung `mitarbeiterKennung` – umbenannt;
  angelegt wird dann niemand) und `nichtGefuehrt` (Stand nicht geladen bzw.
  Controlling). Wortlaute in 10.6.

### 10.2 Routen im Bereich

| Route | Seite | Aktionen |
| --- | --- | --- |
| `#/leistungsnachweise` bzw. `#/leistungsnachweise/uebersicht` | Übersicht (`src/bereiche/leistungsnachweise/pages/Uebersicht.tsx`) | „Excel-Import“; Kacheln „Aktive Projekte“, „Meine Stunden …“ und „Meine Leistungen …“ (laufender Monat), „Meine Stunden …“ (laufendes Jahr); Kalender „Mein Kalender“ über alle eigenen Leistungen, auch in archivierten Projekten (siehe unten; die Einträge nennen die Projektnummer, beim Erfassen fragt der Dialog das Projekt ab – `projektAuswahl`, zur Wahl stehen nur nicht archivierte Projekte, vorgewählt das Projekt der zuletzt erfassten eigenen Leistung). Gibt es kein nicht archiviertes Projekt, steht der Kalender trotzdem da, darüber „Es gibt noch kein Projekt, in dem Sie Leistungen erfassen können. Projekte legt das Controlling an; Projekte der anderen Bereiche erscheinen hier von selbst, unbekannte legt auch der Excel-Import an.“ bzw. – sind alle archiviert – „Alle Projekte sind archiviert – hier in der Übersicht stehen sie deshalb nicht zur Wahl. Leistungen lassen sich weiterhin im archivierten Projekt erfassen (…); aus dem Archiv zurückholen kann sie das Controlling. Erfasste Leistungen bleiben im Kalender sichtbar.“ (in der Klammer fett „Projekte › Archiv“); ein Klick auf einen Tag meldet dann „Kein Projekt zum Erfassen – Projekte legt das Controlling an.“ bzw. „Kein Projekt zur Wahl – alle sind archiviert. Erfassen lässt sich im Projekt unter Projekte › Archiv.“; ohne Anmeldung nennt „Leistung erfassen“ den Anmeldehinweis als Kurzmeldung (10.1). Karte „Offene Bestätigungen“ (nur mit Anmeldung; `offeneBestaetigungen` in `src/bereiche/leistungsnachweise/domain/erfassung.ts`): je Projekt und Monat mit eigenen Leistungen im Status 'offen' oder 'geaendert' eine Zeile mit Projekt, Monat (der laufende mit „laufender Monat“), „Meine Stunden“, Status als Badge („Offen“ bzw. „Geändert seit Bestätigung“) samt „… ohne Leistungstext“ und „Leistungstexte“ – ein Klick öffnet `…/projekt/<id>/<JJJJ-MM>`; ohne offene „Alle Monate mit eigenen Leistungen sind bestätigt bzw. abgerechnet.“ (Gestaltung `src/bereiche/leistungsnachweise/components/erfassung.css`, Präfix `ln-ob-`). Karte „Zuletzt erfasst“ (die neuesten eigenen Leistungen, `LETZTE`; ein Klick öffnet die Leistungstexte ihres Monats; ohne Anmeldung „Nicht als Mitarbeiter angemeldet“); Karte „Projekte“ mit Leistungsbereich, eigenen Stunden im Monat, „Zuletzt erfasst“ und „Leistungstexte“. Angezeigt werden markierte Projekte – auch die in anderen Bereichen markierten (`istMarkiert`) –, ohne Markierung alle (`sichtbareProjekte`), archivierte in keinem Fall; „Kein Projekt markiert – es werden alle angezeigt.“ nach derselben Regel (9.3). |
| `#/leistungsnachweise/projekte` | Projekte (`src/bereiche/leistungsnachweise/pages/Projekte.tsx`) | Kacheln mit Projektnummer, Projektname, Beschreibung (falls vorhanden), Status, ★ (in einem anderen Bereich markierte fest – `useMarkiertAnderswo`, Tooltip „In … markiert – deshalb auch hier markiert; aufheben lässt es sich nur dort“ – sonst umschaltbar) und „Auch in“; kein Anlegen („Projekte legt das Controlling an, unbekannte auch der Excel-Import.“); jedes Projekt des Registers steht von selbst hier (9.2); darunter „Archiv“ (9.3). Ein Klick öffnet die Leistungstexte des Projekts im Vorgabemonat. |
| `#/leistungsnachweise/projekt/<id>` bzw. `…/projekt/<id>/<JJJJ-MM>` | Projekt (`src/bereiche/leistungsnachweise/pages/ProjektDetail.tsx`), Ansicht „Leistungstexte“ (Vorgabe; `src/bereiche/leistungsnachweise/pages/projekt/MonatsErfassung.tsx`) | Projektnummer, Status, Leistungsbereich und der Umschalter „Leistungstexte“ / „Meine Leistungen“ (`Segmented`, mit `aria-pressed`); ggf. Archivhinweis (9.3); darunter die gemeinsamen Leistungstexte und die Monatsbestätigung eines Monats (10.3). Ohne Monat in der Adresse der Vorgabemonat (`vorgabeMonat`: der jüngste Monat mit eigenen Leistungen im Status 'offen' oder 'geaendert', sonst der jüngste mit eigenen Leistungen, sonst der laufende – einmal beim Öffnen bestimmt). Kopfzeile „Leistungstexte und Monatsbestätigung“. Bearbeiten, Einstellungen und Löschen gibt es nur im Controlling. Frühere Adressen `…/projekt/<id>/<reiter>` (etwa `…/nachweise`) zeigen die Leistungstexte im Vorgabemonat; `…/projekt/<id>/nachweis/<id>` führt in die Abrechnung des Controllings. |
| `#/leistungsnachweise/projekt/<id>/leistungen` | Projekt, Ansicht „Meine Leistungen“ (`src/bereiche/leistungsnachweise/pages/projekt/Leistungen.tsx`) | Die eigenen Leistungen: Umschalter „Kalender“ – Vorgabe, Kalender „Meine Leistungen“ – und „Liste“, dazu „Leistung erfassen“ und „Excel-Import“; die Liste mit Filter nach Monat, Suche, Auswahl löschen; der Nachweis je Leistung steht ohne Verweis. Ohne Anmeldung „Nicht als Mitarbeiter angemeldet“. Kopfzeile „Meine Leistungen im Projekt“. „Leistungstexte“ im Umschalter führt in den zuletzt gezeigten Monat zurück. |

Kalender (`LeistungsKalender` in
`src/bereiche/leistungsnachweise/components/LeistungsKalender.tsx`, Gestaltung
in `src/bereiche/leistungsnachweise/components/leistungen.css`, Präfix
`ln-kal-`): je Monat die Wochen von Montag bis Sonntag, je Tag die Leistungen
mit Stunden und Text und die Tagessumme, rechts „KW …“ mit der Wochensumme;
im Kopf die Summe des Monats, „Vorheriger Monat“, „Nächster Monat“ und
„Heute“, darunter „Tag anklicken, um dort eine Leistung zu erfassen – eine
Leistung anklicken, um sie zu bearbeiten.“ Ein Tag öffnet „Leistung erfassen“
mit seinem Datum (ohne Anmeldung statt dessen der Anmeldehinweis als
Kurzmeldung, 10.1), eine Leistung „Leistung bearbeiten“. Tooltip und `aria-label` eines Tags enden auf „Leistung erfassen“,
bei belegten Tagen auf „Leistungen ansehen oder erfassen“. Auf Geräten ohne
Maus (`hover: none`) steht das Plus je Tag dauerhaft da. Kompakt wird der
Kalender bis 730 px Kalenderbreite (Container-Abfrage auf `.ln-kal`, also auch
neben der Seitenleiste): Jeder Tag zeigt nur Nummer und Stunden, der Hinweis
lautet „Tag anklicken, um dort eine Leistung zu erfassen – ein Tag mit Stunden
zeigt erst seine Leistungen.“ Ein leerer Tag öffnet „Leistung erfassen“, ein
belegter den Dialog `TagesListe` (Titel Wochentag und Datum, Untertitel
„… Std. · … Leistung“ bzw. „Leistungen“, je Leistung ein Knopf zum Öffnen,
„Schließen“ und „Neue Leistung“). Ob der Kalender kompakt ist, liest
`tagWaehlen` aus dem berechneten Stil von `.ln-kal-eintraege`.

Unten in der Seitenleiste „Angemeldet als“ (gemeinsam für alle Bereiche,
Abschnitt 11) mit dem Hinweis „Unter diesem Namen (Vor- und Nachname) erfassen
Sie Ihre Leistungen. Wer hier noch nicht als Mitarbeiter geführt ist, wird
automatisch als Mitarbeiter angelegt – eine eigene Anmeldung gibt es nicht. …“
(einen Anmeldedialog des Bereichs gibt es nicht mehr). Darunter „Sicherung“,
„Einspielen“, „Zurücksetzen“ und „Bereich wechseln“; darüber „Excel-Import“
(`src/bereiche/leistungsnachweise/components/ImportDialog.tsx`; ohne Anmeldung
nennt eine Kurzmeldung den Grund, im Dialog steht „Übernommen werden nur eigene
Leistungen.“ mit dem Anmeldehinweis). Betrifft ein Import im Bereich genau ein
Projekt, führt er danach zu dessen Leistungstexten im jüngsten Monat der
übernommenen Leistungen (`importZiel`), sonst zur Übersicht. Adressen des
Controllings – auch frühere unter `#/leistungsnachweise/controlling/…` und
`#/leistungsnachweise/mitarbeiter` – lenkt `App.tsx` nach
`#/controlling/leistungsnachweise/…` um (`hashToRoute`, `routeToHash` in
`src/bereiche/leistungsnachweise/lib/router.ts`). `hashToRoute` nimmt nur
Adressen unter `#/leistungsnachweise/…` und `#/controlling/leistungsnachweise/…`
an; jede andere ergibt die Übersicht ohne Umlenkung. Eine neue Seite beginnt
oben (`useNachObenBeiSeitenwechsel` aus `src/shared/scrollen.ts` in `App.tsx`
und `controlling.tsx`) – im Bereich auch ein Wechsel zwischen „Leistungstexte“
und „Meine Leistungen“ und ein anderer Monat der Leistungstexte; Reiterwechsel
im Controlling und Blättern im Kalender scrollen nicht.

### 10.3 Gemeinsame Leistungstexte und Monatsbestätigung

Rechnung in `src/bereiche/leistungsnachweise/domain/erfassung.ts` (rein, ohne
React), Rechte in `src/bereiche/leistungsnachweise/domain/rechte.ts`, Seite
`src/bereiche/leistungsnachweise/pages/projekt/MonatsErfassung.tsx`
(Gestaltung `src/bereiche/leistungsnachweise/components/erfassung.css`, Präfix
`ln-me-`).

* Erfassungsperiode: die Periode eines Tags im Raster des Projekts
  (`Projekt.raster`, im Controlling eingestellt), auf den Kalendermonat gekürzt
  (`erfassungsPeriode` in `src/bereiche/leistungsnachweise/domain/zeitraum.ts`,
  Schlüssel `<JJJJ-MM>|<Periode>` mit `ERFASSUNG_TRENNER`, etwa
  „2026-10|W2026-44“) – eine Woche über ein Monatsende zählt in jedem Monat für
  sich. Zusätzlich beginnt an den Grenzen aller Nachweise des Projekts (Beginn
  und Tag nach dem Ende) ein neuer Teil mit eigenem Schlüssel, etwa
  „2026-11|M2026-11|2026-11-06“ (`erfassungsGliederung`,
  `erfassungsPeriodeIn` in `src/bereiche/leistungsnachweise/domain/nachweis.ts`);
  so liegt jeder Zeitraum in höchstens einem Nachweis. In abgeschlossenen
  Nachweisen gilt das Raster ihres Abschlusses (`NachweisStand.erfassungsRaster`,
  `erfassungsRasterAm`). `erfassungsPeriodeAusSchluessel` liest einen Schlüssel
  zurück. Ändern sich die Grenzen, ziehen die Texte nach jeder Änderung mit
  (`periodentexteNachziehen`): Texte weggefallener Teile gehen im Text des
  ganzen Zeitraums auf (`texteZusammenfuehren`), bei einer neuen Grenze behält
  der erste Teil mit Leistungen den Text; Texte eines anderen Rasters bleiben
  stehen. Danach zieht `bestaetigungenNachziehen` die Bestätigungen mit: Stammen
  die eigenen Leistungen eines nicht gesperrten Zeitraums mit Text aus Teilen,
  die nicht gesperrt und so bestätigt waren, wie sie vor der Änderung waren,
  sind sie unverändert, gehören die Teile zur selben Periode im selben Raster
  und hat die Änderung selbst keinen Text gesetzt, trägt die Bestätigung den
  neuen Zeitraum ein (die Kennungen der Teile entfallen). Eine Teilung zieht
  keine Bestätigung mit.
* Eine Leistung, die im Stand eines abgeschlossenen Nachweises steht, der ihr
  Datum nicht umfasst (`abgerechnetIn`, etwa nach einer Datumsänderung nach
  dem Abschluss), gehört zu keinem Zeitraum (`AnderswoAbgerechnet`): Sie zählt
  weder zu Stunden noch zur Kennung oder zur Bestätigung und verlangt keinen
  Text; `MonatsStatus.anderswoAbgerechnet` nennt sie, die Seite zeigt
  `anderswoAbgerechnetHinweis` („Ihre Leistung vom … ist bereits in …
  abgerechnet – sie zählt dort und nicht in den Zeiträumen dieses Monats.
  Änderungen an ihr gehen erst ein, wenn das Controlling … wieder öffnet.“,
  dort „den Leistungsnachweis“ bzw. „die Leistungsnachweise“).
* `erfassungsPerioden` liefert je Projekt, Person und Monat die Zeiträume mit
  eigenen Leistungen (`ErfassungsPeriode`: Schlüssel, `von`/`bis`, Raster,
  `datumText` – bis Sonntag nur bei eigenen Leistungen am Wochenende –, alle,
  eigene und andere Leistungen, `stundenEigene`, `stundenAlle`, gemeinsamer
  `text`, `neueStichpunkte`, `gesperrt`/`gesperrtIn`, `nachAbschluss`,
  `nachAbschlussGeaendert`). Die
  Leistungen und Stunden der anderen dienen nur der Rechnung und dem
  Controlling. `neueStichpunkte` sind aus Sicht einer Person nur ihre eigenen
  Leistungen, die beim letzten Bearbeiten weder nach Kennung (`leistungIds`)
  noch nach Inhalt (`inhalte`, `stichpunktInhalt`) berücksichtigt waren und
  noch nicht im Text vorkommen; ohne Person (Controlling) die aller.
* Gesperrt ist ein Zeitraum, den ein abgeschlossener Nachweis umfasst
  (`abgeschlossenIm`): Der Text ist nur zu lesen, und der Zeitraum zählt nicht
  zur Bestätigung. Eigene Leistungen darin, die weder abgerechnet
  (`abgerechneteLeistungen`) noch nachgereicht sind, stehen in
  `nachAbschluss`, abgerechnete, die nach dem Abschluss geändert wurden
  (`Leistung.geaendert` nach `Leistungsnachweis.abgeschlossen`), in
  `nachAbschlussGeaendert`; beide nennt der Hinweis `nachAbschlussHinweis`.
* Bestätigung: `periodenKennung` (Prüfsumme über die eigenen Leistungen des
  Zeitraums nach Inhalt – Datum, Stunden, Abschnitt, Text, sortiert, ohne
  Kennungen – und den gemeinsamen Text); verglichen wird je Zeitraum
  (`Bestaetigung.perioden`). `monatsStatus` liefert `MonatsStatusArt`: 'keine'
  (keine eigenen Leistungen), 'abgerechnet' (alle eigenen in gesperrten
  Zeiträumen), 'offen' (keine Bestätigung), 'bestaetigt' bzw. 'geaendert'
  (`bestaetigungGilt`: jeder nicht gesperrte Zeitraum ist so bestätigt, wie er
  ist, und kein bestätigter ist weggefallen oder anders – außer er ist
  inzwischen gesperrt; sonst ist die Bestätigung erloschen), dazu `ohneText`
  (nicht gesperrte Zeiträume ohne gemeinsamen Text), Stunden, Anzahl,
  `nachAbschluss`, `nachAbschlussGeaendert`, `anderswoAbgerechnet` und
  `bestaetigbar` ('offen' oder 'geaendert' und kein Zeitraum ohne Text). Ändert
  ein anderer den gemeinsamen Text, erlischt die eigene Bestätigung ebenfalls;
  ebenso, wenn eine neue Grenze eines Nachweises einen Zeitraum mit eigenen
  Leistungen teilt.
* Folgen geänderter Grenzen für die Rückfragen im Controlling: `grenzFolgen`
  rechnet wie `aenderungAnwenden` (mit `periodentexteNachziehen` und
  `bestaetigungenNachziehen`) die nachgezogenen Texte
  (`nachgezogenePeriodentexte`), die neuen Teile ohne Text, deren Leistungen
  bisher in einem Zeitraum mit Text lagen, und die Bestätigungen, die jetzt
  gelten ('bestaetigt' bzw. 'abgerechnet') und danach 'geaendert' sind;
  `grenzFolgenHinweis` fasst sie in Sätze („Damit beginnt am … ein neuer
  Zeitraum der gemeinsamen Leistungstexte – für die Tage ab dann verfassen die
  Mitarbeiter einen eigenen Text.“, „Die Bestätigung von … erlischt – der
  Monat ist im Bereich erneut zu bestätigen.“ bzw. „… Bestätigungen erlöschen:
  … – diese Monate sind im Bereich erneut zu bestätigen.“, dazu
  `nachziehenHinweis`).
* Rechte: Den gemeinsamen Text liest, wer im Zeitraum eigene Leistungen hat
  (`darfPeriodentextLesen`, auch gesperrt), im Controlling jeder; bearbeiten nur
  im Bereich, mit eigenen Leistungen darin und nicht gesperrt
  (`darfPeriodentextBearbeiten`). `stichpunkteDerPeriode` liefert im Bereich nur
  die eigenen Stichpunkte – `andere` leer, `andereAnzahl` 0 –, im Controlling
  auch die der anderen. Bestätigen bzw. zurücknehmen nur im Bereich und nur die
  eigenen Monate (`darfBestaetigen`).
* Store (`src/bereiche/leistungsnachweise/store/store.tsx`, je ein `mutate`,
  Prüfung auf dem aktuellen Stand): `periodentextSetzen` (über
  `periodentextAnwenden`: Text getrimmt, leer entfernt den Eintrag; gemerkt
  werden zu den bisherigen die eigenen Leistungen der Person, der Name unter
  „Angemeldet als“ und der Zeitpunkt; mit `neueStichpunkteOffenLassen` bleiben
  die gemerkten Leistungen; bleibt der Text gleich, bleiben Bearbeiter und
  Zeitpunkt), `monatBestaetigen` (`bestaetigenAnwenden`, nur wenn
  `bestaetigbar`; ersetzt eine frühere Bestätigung derselben Person) und
  `bestaetigungZuruecknehmen`. „Löschen“ eines Projekts bzw. Mitarbeiters
  räumt Texte bzw. Bestätigungen mit ab, ebenso `erfassungBereinigen` nach
  jeder Änderung.
* Seite „Leistungstexte“ (`MonatsErfassung`): Kopf „Leistungstexte“ mit
  „Meine Stunden: …“, der Zahl der Leistungen und Zeiträume (ohne eigene „Keine
  eigenen Leistungen in diesem Monat“), „Raster: …“ (`RASTER_LABEL`; liegen
  abgerechnete Zeiträume in einem anderen Raster, dazu „(abgerechnete Zeiträume
  im Raster ihres Abschlusses)“) und die Monatswahl „Vorheriger Monat“ /
  „Nächster Monat“ (`monatVerschieben`, führt nach `…/projekt/<id>/<JJJJ-MM>`).
  Statuszeile (`monatsStatusText`): „Noch nicht bestätigt“, „Bestätigt am …“,
  „Seit der Bestätigung am … geändert – bitte erneut bestätigen.“ bzw.
  „Abgerechnet“, im laufenden Monat bei 'offen'/'geaendert' mit „Der Monat läuft
  noch – bestätigen Sie ihn, wenn er vollständig erfasst ist.“ Darunter „Je
  Zeitraum gibt es einen gemeinsamen Leistungstext für alle, die darin
  Leistungen haben – alle Beteiligten sehen und bearbeiten ihn. Ihre
  Stichpunkte und Stunden dienen Ihnen zur Orientierung; die der anderen sind
  hier nicht zu sehen. Ist jeder Zeitraum beschrieben, bestätigen Sie den
  Monat.“ und – gibt es im Projekt weitere offene Monate – „Noch zu
  bestätigen:“ mit Verweisen (geänderte mit „(geändert)“).
* Je Zeitraum mit eigenen Leistungen ein Block: Überschrift wie „KW 44 ·
  26.10.26 - 30.10.26“ (`periodeKurztext`), Badge „Abgerechnet“ bzw. „Text
  fehlt“, die eigenen Stunden („Meine Stunden in diesem Zeitraum“), „Meine
  Stichpunkte“ (Wochentag, Datum, Stunden, Kurzname des Abschnitts, Text bzw.
  „ohne Stichpunkt“, „nach dem Abschluss erfasst“ bzw. „nach dem Abschluss
  geändert“; ein Klick öffnet „Leistung bearbeiten“) und „Gemeinsamer
  Leistungstext“ (`Textfeld`, Platzhalter „Was wurde in diesem Zeitraum
  geleistet? – Ein Text für alle, die hier Leistungen haben.“). Darunter „Wird
  beim Verlassen des Felds gespeichert.“ (ungespeichert), „Inzwischen von …
  geändert – Ihre Eingabe wird beim Verlassen des Felds mit dieser Fassung
  zusammengeführt.“ (ein anderes Fenster hat seit Beginn der Eingabe
  gespeichert, `Entwurf.basis`), „Zuletzt bearbeitet von … am … um … Uhr“ bzw.
  „Pflicht – ohne Text lässt sich der Monat nicht bestätigen.“ Gespeichert wird
  beim Verlassen des Felds, offene Eingaben auch beim Monatswechsel, beim
  Verlassen der Seite und bei `pagehide`/`visibilitychange` (synchron über
  `flushSync`); hat inzwischen jemand anderes gespeichert, die Zusammenführung
  beider Fassungen (`zuSpeichern`, `texteZusammenfuehren`) mit „Den
  Leistungstext für … hat inzwischen … geändert – Ihre Eingabe ist mit dieser
  Fassung zusammengeführt. Bitte prüfen.“ Entfällt der Zeitraum einer Eingabe,
  zieht sie in den Zeitraum um, der ihren Beginn jetzt enthält (mit dem Fokus,
  wenn ihr Feld ihn hatte); sonst – und wenn das Speichern scheitert – steht
  über den Zeiträumen „Nicht gespeichert (…):“ mit dem Grund, „Ihre Eingabe:“,
  dem Text und „Verwerfen“ (beim Verlassen der Seite als Kurzmeldung). Darüber
  `nachAbschlussHinweis` und `anderswoAbgerechnetHinweis`. Bei leerem Text
  „Stichpunkte übernehmen“ (setzt `automatikText` der eigenen Leistungen ein,
  Tooltip „Übernimmt Ihre Stichpunkte: …“, Meldung „Stichpunkte übernommen.“);
  bei neuen eigenen Stichpunkten „Noch nicht im Text:“ mit „Neue Stichpunkte
  ergänzen“ (`textErgaenzen`, „Neue Stichpunkte ergänzt.“) und „Als
  berücksichtigt markieren“ (Text bleibt, „Stichpunkte als berücksichtigt
  markiert.“). Fremde Stichpunkte, Stunden oder Leistungen zeigt die Seite
  nicht, auch nicht als Zahl. Gesperrt: der Text nur zu lesen bzw. „Für diesen
  Zeitraum gibt es keinen gemeinsamen Leistungstext.“, dazu „Abgerechnet in „…“
  – der Leistungstext lässt sich nicht mehr ändern.“ (`gesperrtHinweis`).
* Karte „Monat bestätigen“: „Ich bestätige, dass meine Stunden und die
  Leistungstexte für … vollständig erfasst sind.“ (`bestaetigungsSatz`); fehlen
  Texte, „Es fehlt noch der Leistungstext für diesen Zeitraum:“ bzw. „Es fehlen
  noch die Leistungstexte für … Zeiträume:“ mit Verweisen ins Feld, und der Knopf
  „Monat bestätigen“ ist gesperrt. Nach dem Bestätigen („… bestätigt.“) „Bestätigt
  am …“ mit „Bestätigung zurücknehmen“ („Bestätigung für … zurückgenommen.“);
  der Fokus wandert jeweils zum Gegenstück, ein zweiter Klick binnen 800 ms
  bzw. ein Doppelklick zählt nicht. Bei 'abgerechnet' „Alle Ihre Leistungen in …
  sind bereits abgerechnet – eine Bestätigung ist nicht mehr nötig.“ bzw. – mit
  nach dem Abschluss erfassten bzw. geänderten – „Alle Zeiträume in … sind
  abgerechnet – eine Bestätigung ist nicht mehr nötig; über danach erfasste
  bzw. geänderte Leistungen entscheidet das Controlling.“ Ohne eigene Leistungen im Monat „Keine eigenen Leistungen
  in …“ mit „Meine Leistungen“ und „Excel-Import“; ohne Anmeldung „Nicht als
  Mitarbeiter angemeldet“.
* Demodaten (`src/bereiche/leistungsnachweise/domain/seed.ts`): Bei der Brücke
  steht für den Vormonat ein gemeinsamer Leistungstext von Anna Becker, den sie
  am Ersten des laufenden Monats bestätigt hat.

### 10.4 Rechte

`src/bereiche/leistungsnachweise/domain/rechte.ts` kennt zwei Zugänge
(`Zugang`): `bereich` (Vorgabe des `StoreProvider` in `index.tsx`) und
`controlling` (`controlling.tsx`). `darf(zugang, recht)` gewährt die Rechte
`projektVerwalten` (Projekt anlegen, ändern, Abschnitte), `sammelImport`,
`projektLoeschen`, `nachweisVerwalten` (Nachweise anlegen und ändern,
Leistungstexte, Bemerkung, „Nachweise anlegen“), `abschliessen`,
`aufschlag`, `export`, `auswertung` und `mitarbeiterVerwalten` nur im
Controlling. Im Bereich bleibt nur das Erfassen, Ändern und Importieren
eigener Leistungen, das Mitschreiben am gemeinsamen Leistungstext der
Zeiträume mit eigenen Leistungen (`darfPeriodentextBearbeiten`), das
Bestätigen der eigenen Monate (`darfBestaetigen`) und die ★-Markierung; die
Nachweise dazu entstehen in
`addLeistung`/`updateLeistung` bzw. beim Import von selbst. Einzige Ausnahme
zu `projektVerwalten`: Der Excel-Import legt auch im Bereich unbekannte
Projekte (nur mit dem Haken „Projekt anlegen“) und fehlende Abschnitte an,
soweit die eigenen Leistungen sie brauchen (`planErlaubt` in
`src/bereiche/leistungsnachweise/store/store.tsx`); einstellen lassen sie sich
nur im Controlling. Eine Anmeldung als Mitarbeiter braucht das Controlling
nicht, und es legt niemanden an; ist die Person unter „Angemeldet als“
Mitarbeiter, gilt sie aber auch dort als angemeldet (eigene Leistungen beim
Löschen eines Nachweises mitlöschen, Zeilen ohne Mitarbeiter im Sammel-Import
ihr zuordnen). Eigene Leistungen ändert nur die angemeldete Person
(`darfLeistungAendern`); im Controlling sind die Leistungen anderer nur zu
lesen (`darfLeistungSehen`, `leistungenDerZeile` – im Bereich liefert es nur die
eigenen, `andereAnzahl` 0). Im Bereich sieht niemand
Stichpunkte, Stunden oder Leistungen der anderen, auch nicht als Zahl und
auch nicht in Zeiträumen mit eigenen Leistungen – gemeinsam ist dort allein
der Leistungstext des Zeitraums (`darfPeriodentextLesen`,
`stichpunkteDerPeriode`, 10.3). Ausnahme, solange alles lokal im Browser
liegt: „Sicherung“ in der Seitenleiste des Bereichs (`SicherungKnopf` in
`src/bereiche/leistungsnachweise/components/Sicherung.tsx`, `exportiereDaten`)
lädt den gesamten Bestand samt den Leistungen aller Mitarbeiter herunter, und
„Einspielen“ bzw. „Zurücksetzen“ ersetzen ihn. Gemeinsame Texte und
Bestätigungen liest das Controlling nur. Der Store prüft jede Änderung auf
dem Stand, den sie ändert.

### 10.5 Controlling der Leistungsnachweise

Im Controlling-Bereich unter „Leistungsnachweise“ (Abschnitt 9.4), mit eigenem
`StoreProvider` im Zugang `controlling`:

* Reiter (`src/bereiche/leistungsnachweise/pages/controlling/Controlling.tsx`)
  „Auswertung“ (`Auswertung.tsx`), „Leistungsnachweise“ (`NachweisListe.tsx`,
  mit „Neuer Leistungsnachweis“, siehe unten; die Filterleiste – Status,
  Projekt, Zeitraum, Knöpfe – bricht um, das Statusfeld wird nie schmaler als
  sein Umschalter, bis 640 px steht alles untereinander,
  `src/bereiche/leistungsnachweise/pages/controlling/controlling.css`), „Projekte“ (`ProjektListe.tsx`: Projekte mit
  Raster und Regel, „In Bearbeitung“, „Ohne Nachweis“, Stunden; Suche; „Neues
  Projekt“ über `ProjektDialog` in
  `src/bereiche/leistungsnachweise/components/ProjektDialog.tsx`; archivierte am
  Ende) und „Mitarbeiter“ (`Mitarbeiter.tsx`: die angemeldete Person trägt
  „angemeldet“; ihr Löschen verweigert `mitarbeiterLoeschenPruefen`, solange
  ihr Name unter „Angemeldet als“ steht – der Bereich legte sie gleich wieder
  an; wer sie in `src/bereiche/leistungsnachweise/components/MitarbeiterDialog.tsx`
  umbenennt, ändert nach dem Speichern auch „Angemeldet als“ –
  `benutzerAendern`, Meldung „Mitarbeiter gespeichert – „Angemeldet als“
  lautet jetzt „…“.“; Hinweis am Status „Ausgeschiedene behalten ihre
  Leistungen, erfassen unter „Angemeldet als“ aber keine neuen.“).
* Projekt (`ControllingProjekt` in
  `src/bereiche/leistungsnachweise/pages/controlling/Projekt.tsx`, Adresse
  `#/controlling/leistungsnachweise/projekt/<id>/<reiter>`): „Alle Projekte“,
  „Bearbeiten“ (`ProjektDialog`), „Löschen“ – gesperrt, solange ein anderer
  Bereich das Projekt führt (Hinweis „Auch in … geführt – löschen lässt sich
  das Projekt nur im Controlling unter „Projekte“, für alle Bereiche.“) oder es
  dort zur Übernahme vorgesehen ist (`vorgeseheneBereiche` in
  `src/gemeinsam/ProjektBereiche.tsx`; Hinweis „Für … zur Übernahme vorgesehen –
  löschen lässt sich das Projekt erst, wenn die Übernahme im Controlling unter
  „Projekte“ zurückgenommen ist, oder dort für alle Bereiche.“); Reiter „Leistungsnachweise“
  (`ProjektNachweise.tsx`: Nachweise des Projekts, „Nachweise anlegen“ für
  Leistungen ohne Nachweis, „Neuer Leistungsnachweis“; ein Klick öffnet die
  Abrechnung), „Bestätigungen“ (siehe unten), „Leistungen“ (`Leistungen.tsx` im Controlling: die Leistungen
  aller Mitarbeiter mit Filter nach Mitarbeiter, nur lesen, der Nachweis
  verweist auf die Abrechnung) und „Einstellungen“ (`ProjektEinstellungen.tsx`:
  Vorgaben mit „Neue Nachweise“, Abschnitte, Logos). Die Reiter tragen
  `role="tab"` und `aria-selected`; scrollt die Leiste auf schmalen
  Bildschirmen quer, rollt `scrollIntoView` den aktiven Reiter in den
  sichtbaren Teil – auch beim direkten Aufruf der Adresse. Beim Raster sagen die
  Einstellungen „Das Raster gliedert auch die Leistungstexte, die die
  Mitarbeiter je Zeitraum gemeinsam verfassen (Wochen am Monatsende und an den
  Grenzen der Leistungsnachweise geteilt).“, der Dialog „Projekt bearbeiten“ „… gliedert auch die gemeinsamen
  Leistungstexte der Mitarbeiter.“ Wird das Raster umgestellt, nennen beide
  (`RasterwechselHinweis` in
  `src/bereiche/leistungsnachweise/components/RasterwechselHinweis.tsx`) die
  gemeinsamen Texte noch nicht gesperrter Zeiträume, die im neuen Raster nicht
  mehr gelten (`periodentexteNachRasterwechsel`), und die Bestätigungen, die
  damit erlöschen: Offene Nachweise übernehmen die Texte nicht mehr, die
  Mitarbeiter verfassen sie im neuen Raster neu; sie bleiben gespeichert und
  gelten wieder, wenn das Raster zurückgestellt wird. Abgeschlossene Nachweise
  behalten ihren Stand.
* Reiter „Bestätigungen“ (`Bestaetigungen` in
  `src/bereiche/leistungsnachweise/pages/controlling/Bestaetigungen.tsx`,
  Adresse `#/controlling/leistungsnachweise/projekt/<id>/bestaetigungen`,
  Tooltip „Je Monat, wer Leistungen im Projekt hat und ob er Stunden und
  Leistungstexte bestätigt hat“): Einleitung „Die Mitarbeiter bestätigen im
  Bereich Leistungsnachweise je Monat, dass ihre Stunden und die gemeinsamen
  Leistungstexte vollständig erfasst sind. …“; Summe „Alle Mitarbeiter haben
  ihre Monate bestätigt.“ bzw. „… Bestätigungen offen“ und „… Bestätigungen
  erloschen“ mit „(geändert seit Bestätigung)“. Je Monat mit Leistungen (neueste
  zuerst, `bestaetigungsUebersicht`) eine Karte: Monat, Zahl der Personen und
  ihre Stunden, Badge „… von … bestätigt“ (grün, wenn alle bestätigt haben) bzw.
  „Abgerechnet“; Tabelle „Mitarbeiter“ (Name, Kürzel, ggf. „ausgeschieden“),
  „Stunden“, „Status“ (`monatsStatusBadge`: „Bestätigt am …“ grün, „Offen“
  orange, „Geändert seit Bestätigung“ rot – dazu „zuletzt bestätigt am …“ –,
  „Abgerechnet“ blau; dazu „… nach dem Abschluss erfasst“ bzw. „… nach dem
  Abschluss geändert“) und „Ohne Text“
  (Zeiträume ohne gemeinsamen Text von den nicht gesperrten, etwa „1 von 4“,
  sonst „–“); darunter „Leistungsnachweis:“ bzw. „Leistungsnachweise:“ mit den
  Nachweisen des Monats (`monateDesNachweises`, Klick öffnet die Abrechnung).
  Monate, in denen alles abgerechnet und nichts nach dem Abschluss erfasst bzw.
  geändert ist, stehen hinter „Abgerechnete Monate anzeigen (…)“. Ohne Leistungen „Noch
  keine Leistungen“, ist alles abgerechnet „Alles abgerechnet“. Nur lesen.
* Darüber „Excel-Import (alle Mitarbeiter)“: der Import als Sammel-Export, ohne
  Anmeldung; nach dem Übernehmen geht es zu den Leistungsnachweisen des
  Controllings (`importZiel`). Der Untertitel nennt hier keine Person, die
  Spalte Mitarbeiter erklärt „etwa „MM: Mustermann, Max“ – ordnet die Zeile
  ihrem Mitarbeiter zu; unbekannte werden angelegt“ (im Bereich „… –
  übernommen werden nur die eigenen Zeilen“). „Zeilen ohne Mitarbeiter
  zuordnen zu“ steht zu Beginn auf „– nicht übernehmen –“. Bei „Frühere
  Importe ersetzen“ übernimmt eine neue Zeile derselben Person für dasselbe
  Projekt und denselben Tag die Kennung einer ersetzten Leistung, die
  abgerechnet oder nachgereicht ist (`src/bereiche/leistungsnachweise/domain/import.ts`).
* „Neuer Leistungsnachweis“ (`NeuerNachweisDialog` in
  `src/bereiche/leistungsnachweise/components/NachweisDialog.tsx`) fragt keinen
  Zeitraum ab – nur das Projekt (in der Liste aller Nachweise), „Raster“ und
  „Überschrift“: Er umfasst alle nicht abgerechneten Leistungen nach dem
  letzten abgeschlossenen Nachweis (`nichtAbgerechnet` in
  `src/bereiche/leistungsnachweise/domain/nachweis.ts`; Zeitraum ab dem Tag
  danach, ohne abgeschlossenen ab der ersten Leistung, bis zum Monatsende bzw.
  zur letzten Leistung). Offene Nachweise in diesem Bereich gehen darin auf –
  der erste wird erweitert, Leistungstexte (gleiche Zeilen verbunden,
  `texteVerbinden`), Aufschläge (summiert) und Bemerkungen der übrigen gehen
  auf ihn über, ein festgelegtes Ende (`bisFest`) entfällt
  (`nachweisFuerNichtAbgerechneteAnwenden`, im Store
  `nachweisFuerNichtAbgerechnete`). Weicht das gewählte Raster ab, warnt der
  Dialog mit `rasterwechselHinweis` (über `rasterwechselVerdecktAlle`), etwa „…
  gehört zu einem anderen Raster und wird nicht mehr angezeigt – er kehrt
  zurück, wenn das Raster wieder umgestellt wird.“; der Satz über die offenen
  Nachweise endet dann mit „bleiben gespeichert“ statt „bleiben erhalten“.
  Liegt schon alles in genau einem offenen Nachweis, heißt der Knopf „Öffnen“.
  So lassen sich auch Leistungen mehrerer Monate (etwa Oktober bis Dezember) in
  einem Nachweis sammeln. Ändern sich mit dem neuen Nachweis Grenzen der
  Zeiträume, nennt der Dialog die Folgen (`grenzFolgen`, `grenzFolgenHinweis`
  in `src/bereiche/leistungsnachweise/domain/erfassung.ts`, `FolgenHinweis` in
  `src/bereiche/leistungsnachweise/components/NachweisDialog.tsx`): die
  gemeinsamen Texte, die dabei zusammengehen (`nachziehenHinweis`: „1
  gemeinsamer Leistungstext der Mitarbeiter gehört zu einem Teil eines
  Zeitraums, dessen Grenze sich damit ändert – er geht im Text des neuen
  Zeitraums auf.“ bzw. „… gemeinsame Leistungstexte der Mitarbeiter gehören zu
  Teilen von Zeiträumen, deren Grenzen sich damit ändern – sie gehen im Text
  der neuen Zeiträume auf.“), den Tag, ab dem ein neuer Beginn bzw. ein neues
  Ende mitten in einem Zeitraum einen eigenen Text verlangt („Damit beginnt am
  … ein neuer Zeitraum der gemeinsamen Leistungstexte – für die Tage ab dann
  verfassen die Mitarbeiter einen eigenen Text.“), und die Bestätigungen, die
  damit erlöschen (mit Namen und Monat) – mit neuem Teil oder erlöschenden
  Bestätigungen als Warnung. Ebenso „Zeitraum ändern“ und „Löschen“; „Wieder
  öffnen“ und – endet der Nachweis mitten in einem Zeitraum – „Abschließen“
  nennen die erlöschenden Bestätigungen.
  Vorhandene Nachweise korrigiert „Zeitraum ändern“ (`ZeitraumDialog`). Ob ein
  festgelegtes Ende (`bisFest`) mit dem eingegebenen Ende etwas bewirkt, sagt
  `endeFestlegenWirkt` (`src/bereiche/leistungsnachweise/domain/nachweis.ts`:
  offen und Regel `fortlaufend` oder Ende nach heute – ohne `bisFest` liefe er
  dann bis zum Abschluss). Nur dann bietet der Dialog die Kästchen an: ohne
  `bisFest` „Ende festlegen – der Leistungsnachweis läuft nicht mehr bis zum
  Abschluss“ (lief er bisher nicht bis zum Abschluss: „Ende festlegen – der
  Leistungsnachweis läuft nicht bis zum Abschluss“), das das Ende auch ohne
  Änderung festlegt und bei geändertem Ende vorgewählt, aber abwählbar ist;
  mit `bisFest` „Wieder bis zum Abschluss laufen lassen (das Ende ist von Hand
  festgelegt)“, das es aufhebt. Wo ein festgelegtes Ende nichts bewirkt (Regel
  `monat`, Ende nicht nach heute), setzt ein geändertes Ende `bisFest`
  trotzdem – es wirkt, sobald das Projekt auf `fortlaufend` wechselt –, und ein
  gesetztes bleibt. Läuft der Nachweis danach nicht bis zum Abschluss, obwohl
  er es bisher tat bzw. mit dem geänderten Ende ohne Festlegung täte, sagt der
  Hinweis „Das Ende steht damit fest: Der Leistungsnachweis endet am …, läuft
  nicht mehr bis zum Abschluss und wird beim Abschluss nicht gekürzt. Spätere
  Leistungen kommen in einen neuen Leistungsnachweis.“ – lief er bisher nicht
  bis zum Abschluss, heißt es „… läuft nicht bis zum Abschluss …“. Der Dialog
  übergibt `bisFest` stets ausdrücklich an `updateNachweis`.
* Nicht erfasste Leistungen: Abgerechnet ist, was im festgeschriebenen Stand
  der abgeschlossenen Nachweise steht (`abgerechneteLeistungen`). Leistungen vor
  dem letzten abgeschlossenen Nachweis, die dort fehlen und in keinem offenen
  Nachweis liegen, nennt `nichtAbgerechnet` als `nichtErfasst`. Der Dialog
  „Neuer Leistungsnachweis“ und die Abrechnung des laufenden Nachweises zeigen
  sie (`NichtErfasstHinweis` in
  `src/bereiche/leistungsnachweise/components/NachweisDialog.tsx`: „… noch nicht
  erfasst“, je Leistung Datum, Person, Stunden, Text und Grund – „nach dem
  Abschluss von „…“ erfasst“ bzw. „in keinem Leistungsnachweis“); die ersten
  acht einzeln, bei mehr „Alle … anzeigen (… weitere)“ bzw. „Weniger
  anzeigen“ (aufgeklappt in einem Bildlaufbereich). Übernommen
  werden sie nur nach Bestätigung: im Dialog mit dem Haken „In diesen
  Leistungsnachweis übernehmen“ bzw. „Alle … in diesen Leistungsnachweis
  übernehmen“ (Knopf dann „Übernehmen und öffnen“ bzw. „Anlegen“), in der
  Abrechnung mit „In diesen Leistungsnachweis übernehmen …“ und der Rückfrage
  „Nicht erfasste Leistungen übernehmen?“ (`leistungenNachreichen`,
  `nachreichenAnwenden`). Sie stehen danach in `nachgereicht`; ihre Zeilen
  (eigener N-Schlüssel, 10.1) sind in Abrechnung und Leistungstexten mit
  „nachgereicht“ gekennzeichnet (`NachweisZeile.nachgereicht`, für ältere
  Stände auch eine Zeile vor `von`).
* Abgerechnet bleibt abgerechnet: Wird eine Leistung aus dem Stand eines
  abgeschlossenen Nachweises auf ein anderes Datum gelegt, bleibt sie dort;
  `updateLeistung` legt für sie keinen Nachweis an, und der Dialog sagt
  „Bleibt im abgeschlossenen Leistungsnachweis „…“ abgerechnet – mit dem neuen
  Datum erscheint sie erst, wenn das Controlling ihn wieder öffnet.“
  (`src/bereiche/leistungsnachweise/components/LeistungDialog.tsx`).
* Der Zeitraum steht erst beim Abschluss fest – außer das Ende ist festgelegt
  (`bisFest`): Läuft ein Nachweis bis zum
  Abschluss (`laeuftBisAbschluss` – offen, ohne `bisFest` und Regel `fortlaufend` oder Ende nach
  heute), zeigen Listen und Abrechnung „ab … · läuft bis zum Abschluss“
  (`nachweisZeitraumText` in
  `src/bereiche/leistungsnachweise/components/common.tsx`); beim Abschluss endet
  er am letzten Tag mit Leistungen, spätestens heute (`abschlussZeitraum`), und
  die Rückfrage sagt „Der Zeitraum wird jetzt festgelegt: …“. Endet er dabei
  mitten in einem Zeitraum der gemeinsamen Texte, fügt sie „Er endet mitten in
  einem Zeitraum der gemeinsamen Leistungstexte – für die Tage ab … verfassen
  die Mitarbeiter einen eigenen Text.“ an.
* Text einer Zeile (`nachweisZeilen`): der vom Controlling bearbeitete
  (`texte`); sonst aus den gemeinsamen Leistungstexten (`gemeinsamerZeilentext`
  in `src/bereiche/leistungsnachweise/domain/nachweis.ts`): die Leistungen der
  Zeile nach Erfassungsperiode gruppiert, je Periode in zeitlicher Folge der
  gemeinsame Text bzw. `automatikText` ihrer Leistungen, verbunden ohne
  Wiederholungen (`texteZusammenfuehren`), gekennzeichnet mit `textGemeinsam`.
  Kein gemeinsamer Text gilt in nachgereichten Zeilen, für eine Periode, die
  ein anderer abgeschlossener Nachweis sperrt, und wenn die Zeile nur einen Teil
  der Periode abdeckt (Nachweis feiner gegliedert als das Projekt); ohne
  geltenden gemeinsamen Text `automatikText` der Zeile. Abgeschlossene
  Nachweise behalten ihren Stand.
* Abrechnung eines Nachweises (`src/bereiche/leistungsnachweise/pages/controlling/Abrechnung.tsx`):
  „Alle Nachweise“, „Zum Projekt“ (Tooltip „Leistungsnachweise, Bestätigungen,
  Leistungen und Einstellungen des Projekts“), Ansichten „Abrechnung“ (je Zeile
  mit „Text der Mitarbeiter“, wenn der Text aus den gemeinsamen Texten stammt,
  bzw. „Text von Hand bearbeitet“), „Leistungstexte“
  (`src/bereiche/leistungsnachweise/pages/controlling/Leistungstexte.tsx`: Text
  je Zeile bearbeiten, solange offen, „Ergänzen“ bzw. „Text so lassen“ bei
  neuen Leistungen; ändert sich nach einer Bearbeitung der Text, den die Zeile
  ohne sie hätte (`ZeilenText.ausgang`, `zeilenTextOhneBearbeitung`), „Der Text
  der Mitarbeiter hat sich seit der Bearbeitung geändert:“ bzw. „Der
  automatische Text hat sich seit der Bearbeitung geändert:“ mit dem neuen Text,
  „Text der Mitarbeiter übernehmen“ bzw. „Automatischen Text übernehmen“ und
  „Text so lassen“ („Ergänzen“ und „Text so lassen“ übernehmen den heutigen als
  `ausgang`, `zeilenTextSetzen` mit `gesehen`); stammt der Text aus den gemeinsamen Texten, „Text der
  Mitarbeiter“ mit „aus ihren gemeinsamen Leistungstexten – Änderungen hier
  bleiben stehen“, nach einer Bearbeitung „Text der Mitarbeiter
  wiederherstellen“ – Meldung „Leistungstext der Mitarbeiter wiederhergestellt.“
  –, sonst „Automatischen Text wiederherstellen“; sind die Zeilen feiner
  gegliedert als das Raster des Projekts, erklärt ein Hinweis, dass ein Text,
  der nur zum Teil in einer Zeile liegt, dort nicht gilt; je Zeile
  „Leistungen (…)“ aller Mitarbeiter zum Lesen) und „Vorschau“, „Drucken /
  PDF“, „Excel“, „Abschließen“ bzw. „Wieder öffnen“, „Zeitraum ändern“,
  „Löschen“ (mit dem Haken „Auch meine … in diesem Leistungsnachweis
  endgültig löschen“ – gemeint sind die eigenen Leistungen aus
  `leistungenDesNachweises`, samt nachgereichten; Meldung „Leistungsnachweis
  und … gelöscht.“ bzw. „Leistungsnachweis gelöscht.“); Aufschläge je Zeile,
  „Aufschläge zurücksetzen“, „Bemerkung“.
  Kamen nach einer Textbearbeitung Leistungen hinzu, weist ein Hinweis mit
  „Leistungstexte prüfen“ darauf hin.
* Bestätigungen in der Abrechnung: Ein offener Nachweis zeigt unter den
  Kennzahlen „Bestätigungen der Mitarbeiter“ (`BestaetigungsStand` in
  `src/bereiche/leistungsnachweise/pages/controlling/Bestaetigungen.tsx`) – je
  Monat seiner Leistungen in zeitlicher Folge der Badge „… von … bestätigt“
  bzw. „Abgerechnet“ und „Offen:“ bzw. „Geändert seit Bestätigung:“ mit Namen,
  nur Personen mit Leistungen in diesem Nachweis
  (`bestaetigungenDesNachweises`) –, dazu „Alle Bestätigungen des Projekts“.
  Die Rückfrage „Leistungsnachweis abschließen?“ (`Modal` mit „Abbrechen“ und
  „Abschließen“) nennt mit `FehlendeBestaetigungen` je Monat, wer noch nicht
  bzw. nach einer Änderung nicht erneut bestätigt hat
  (`fehlendeBestaetigungen`, für den beim Abschluss festgelegten Zeitraum): „Eine
  Person hat ihre Leistungen noch nicht bestätigt:“ bzw. „… Personen haben ihre
  Leistungen noch nicht bestätigt:“, Namen mit „(geändert seit Bestätigung)“
  und „Abschließen ist trotzdem möglich – danach lassen sich die gemeinsamen
  Leistungstexte der abgerechneten Zeiträume nicht mehr ändern.“
  „Wieder öffnen“ eines im früheren Raster abgeschlossenen Nachweises
  (`NachweisStand.erfassungsRaster` ≠ Raster des Projekts) nennt in der
  Rückfrage die gemeinsamen Texte, die danach nicht mehr gelten
  (`periodentexteNachOeffnen`).
* Die Kopfzeile nennt „Leistungsnachweise“ mit dem Untertitel aus
  `leistungsnachweiseUntertitel` (für ein Projekt „Projekt – Leistungsnachweise,
  Bestätigungen, Leistungen und Einstellungen“).
* Gemeinsame Leistungstexte und Bestätigungen liest das Controlling nur
  (`periodentextSetzen` meldet dort „Die gemeinsamen Leistungstexte verfassen
  die Mitarbeiter im Bereich Leistungsnachweise.“, `monatBestaetigen`
  „Bestätigen können die Mitarbeiter nur ihre eigenen Monate im Bereich
  Leistungsnachweise.“).

### 10.6 Meldungen

| Meldung | Fundstelle | Ursache |
| --- | --- | --- |
| „Leistungen erfasst nur, wer als Mitarbeiter geführt ist – bitte unten links unter „Angemeldet als“ Vor- und Nachnamen eintragen.“ | `src/bereiche/leistungsnachweise/domain/rechte.ts` (`NICHT_ANGEMELDET`) | Aktion im Bereich ohne Anmeldung, wenn kein genauerer Hinweis vorliegt. |
| „„…“ ist kein vollständiger Name – bitte unten links unter „Angemeldet als“ Vor- und Nachnamen eintragen. Unter diesem Namen werden Ihre Leistungen geführt.“ | `src/bereiche/leistungsnachweise/domain/rechte.ts` (`anmeldeHinweis`, als Leiste `AnmeldeHinweis` bzw. Kurzmeldung `useMitAnmeldung` in `src/bereiche/leistungsnachweise/components/Anmeldung.tsx`) | Der Name unter „Angemeldet als“ hat nur ein Wort (`ohneNachname`). |
| „… ist als ausgeschieden markiert – Leistungen erfasst nur, wer aktiv ist. Das Controlling kann die Person unter „Mitarbeiter“ wieder aktiv setzen.“ | ebenda | Der Name gehört einem ausgeschiedenen Mitarbeiter. |
| „Unter „…“ ist kein Mitarbeiter mehr geführt – das Controlling hat die Person in „…“ umbenannt. Bitte unten links unter „Angemeldet als“ diesen Namen eintragen; dort stehen Ihre bisherigen Leistungen.“ | ebenda | Die unter diesem Namen angelegte Person (`mitarbeiterKennung`) heißt inzwischen anders (`umbenannt`). |
| „Unter „…“ ist noch kein Mitarbeiter geführt – angelegt wird er, sobald der Bereich wieder speichern kann (siehe Hinweis oben).“ | ebenda | Im Bereich bei `ladeZustand` ≠ 'ok' – angelegt wird niemand. |
| „„…“ wird gerade als Mitarbeiter angelegt – bitte noch einmal versuchen.“ | ebenda (nur als Kurzmeldung) | Handlung, bevor der Store die Person angelegt hat (`anlegen`). |
| „„…“ ist unter „Angemeldet als“ angemeldet – solange der Name dort steht, legt der Bereich Leistungsnachweise die Person gleich wieder an. Zum Löschen zuerst unten links unter „Angemeldet als“ einen anderen Namen eintragen.“ | `src/bereiche/leistungsnachweise/domain/rechte.ts` (`mitarbeiterLoeschenPruefen`) | Das Controlling will die angemeldete Person löschen. |
| „Das ist dem Controlling vorbehalten.“ | `src/bereiche/leistungsnachweise/domain/rechte.ts` (`NUR_CONTROLLING`) | Controlling-Aktion außerhalb des Controllings. |
| „Bitte einen Projektnamen angeben.“ | `src/bereiche/leistungsnachweise/components/ProjektDialog.tsx` | Projekt ohne Namen. |
| „Die Projektnummer „…“ ist bereits vergeben.“ | `src/bereiche/leistungsnachweise/components/ProjektDialog.tsx` | Projektnummer doppelt. |
| „Bitte einen Nachnamen angeben.“ / „Das Kürzel „…“ ist bereits vergeben.“ | `src/bereiche/leistungsnachweise/components/MitarbeiterDialog.tsx` | Pflichtangabe fehlt bzw. Kürzel doppelt. |
| „„…“ hat noch … und lässt sich deshalb nicht löschen – stattdessen als ausgeschieden markieren.“ | `src/bereiche/leistungsnachweise/domain/rechte.ts` (`mitarbeiterLoeschenPruefen`) | Mitarbeiter mit Leistungen löschen. |
| „Die Datei enthält keine Zeile mit Datum, Stunden und Projektnummer.“ | `src/bereiche/leistungsnachweise/components/ImportDialog.tsx` | Excel-Import ohne verwertbare Zeile. |
| „Die Datei ist keine Sicherung der Leistungsnachweise.“ | `src/bereiche/leistungsnachweise/store/storage.ts` | Einspielen einer fremden Datei. |
| „Leistungsnachweis wieder geöffnet – er zeigt die aktuellen Leistungen.“ / „Aufschläge zurückgesetzt.“ | `src/bereiche/leistungsnachweise/pages/controlling/Abrechnung.tsx` | Kein Fehler. |
| „Der gespeicherte Stand der Leistungsnachweise ließ sich nicht laden bzw. stammt aus einer neueren Fassung. …“ | `src/bereiche/leistungsnachweise/controlling.tsx` | Controlling bei `ladeZustand` ≠ 'ok'. |
| „Nicht gespeichert – bitte Sicherung herunterladen.“ | `src/bereiche/leistungsnachweise/components/SpeicherHinweis.tsx` | `speicherZustand` ≠ 'ok': Speicher voll oder gesperrt; Änderungen gehen beim Schließen verloren. |
| „Kein Projekt zum Erfassen – Projekte legt das Controlling an.“ / „Kein Projekt zur Wahl – alle sind archiviert. Erfassen lässt sich im Projekt unter Projekte › Archiv.“ | `src/bereiche/leistungsnachweise/pages/Uebersicht.tsx` | Klick auf einen Tag in „Mein Kalender“ ohne nicht archiviertes Projekt. |
| „In diesem Zeitraum haben Sie keine eigenen Leistungen.“ / „Diesen Leistungstext können Sie nicht bearbeiten.“ | `src/bereiche/leistungsnachweise/store/store.tsx` (`periodentextSetzen`) | Gemeinsamen Text eines Zeitraums ohne eigene Leistungen bzw. ohne Recht setzen. |
| „Abgerechnet in „…“ – der Leistungstext lässt sich nicht mehr ändern.“ | `src/bereiche/leistungsnachweise/domain/erfassung.ts` (`gesperrtHinweis`) | Der Zeitraum liegt in einem abgeschlossenen Nachweis – als Hinweis am Zeitraum und als Meldung von `periodentextSetzen`. |
| „Bitte zuerst für jeden Zeitraum mit eigenen Leistungen einen Leistungstext verfassen – es fehlt noch: ….“ | `src/bereiche/leistungsnachweise/domain/erfassung.ts` (`ohneTextMeldung`, `bestaetigenMeldung`) | „Monat bestätigen“, solange ein nicht gesperrter Zeitraum keinen gemeinsamen Text hat. |
| „In diesem Monat haben Sie keine eigenen Leistungen in diesem Projekt.“ / „Der Monat ist bereits abgerechnet – eine Bestätigung ist nicht mehr nötig.“ | `src/bereiche/leistungsnachweise/domain/erfassung.ts` (`bestaetigenMeldung`) | Bestätigen bei Status 'keine' bzw. 'abgerechnet'. |
| „Diesen Monat bzw. dieses Projekt gibt es nicht.“ | `src/bereiche/leistungsnachweise/store/store.tsx` (`monatBestaetigen`) | Ungültiger Monat oder unbekanntes Projekt. |
| „Ihre Leistung vom … liegt in einem bereits abgerechneten Zeitraum und wurde nach dem Abschluss erfasst – sie geht nicht in den abgeschlossenen Leistungsnachweis ein; über ein Nachreichen entscheidet das Controlling.“ (mehrere: „… Ihrer Leistungen (…) liegen in bereits abgerechneten Zeiträumen …“) | `src/bereiche/leistungsnachweise/domain/erfassung.ts` (`nachAbschlussHinweis`) | Eigene, nicht abgerechnete Leistungen in einem gesperrten Zeitraum (Seite „Leistungstexte“). |
| „Ihre Leistung vom … ist bereits abgerechnet und wurde nach dem Abschluss geändert – abgerechnet bleibt der Stand des Abschlusses; die Änderung geht erst ein, wenn das Controlling den Leistungsnachweis wieder öffnet.“ (mehrere: „… Ihrer Leistungen (…) sind bereits abgerechnet …“) | `src/bereiche/leistungsnachweise/domain/erfassung.ts` (`nachAbschlussHinweis`) | Eigene, abgerechnete Leistungen in einem gesperrten Zeitraum, nach dem Abschluss geändert (`Leistung.geaendert`). |
| „Ihre Leistung vom … ist bereits in … abgerechnet – sie zählt dort und nicht in den Zeiträumen dieses Monats. Änderungen an ihr gehen erst ein, wenn das Controlling … wieder öffnet.“ (mehrere: „… Ihrer Leistungen (…) sind bereits in … abgerechnet …“) | `src/bereiche/leistungsnachweise/domain/erfassung.ts` (`anderswoAbgerechnetHinweis`) | Eigene Leistungen des Monats, die ein abgeschlossener Nachweis abrechnet, der ihr Datum nicht umfasst. |
| „Nicht gespeichert (…): … Ihre Eingabe:“ mit „Verwerfen“ | `src/bereiche/leistungsnachweise/pages/projekt/MonatsErfassung.tsx` | Eine Eingabe im gemeinsamen Text ließ sich nicht speichern – ihr Zeitraum hat keine eigenen Leistungen mehr („In diesem Zeitraum haben Sie keine eigenen Leistungen mehr.“), ist inzwischen abgerechnet (`gesperrtHinweis`) oder das Speichern scheiterte; beim Verlassen der Seite als Kurzmeldung. |
| „Den Leistungstext für … hat inzwischen … geändert – Ihre Eingabe ist mit dieser Fassung zusammengeführt. Bitte prüfen.“ | `src/bereiche/leistungsnachweise/pages/projekt/MonatsErfassung.tsx` | Kein Fehler: Ein anderer (etwa ein zweites Fenster) hat den Text seit Beginn der Eingabe gespeichert; gespeichert ist die Zusammenführung. |
| „… bestätigt.“ / „Bestätigung für … zurückgenommen.“ / „Stichpunkte übernommen.“ / „Neue Stichpunkte ergänzt.“ / „Stichpunkte als berücksichtigt markiert.“ | `src/bereiche/leistungsnachweise/pages/projekt/MonatsErfassung.tsx` | Kein Fehler. |
| „Leistungstext der Mitarbeiter wiederhergestellt.“ / „Automatischer Leistungstext wiederhergestellt.“ | `src/bereiche/leistungsnachweise/pages/controlling/Leistungstexte.tsx` | Kein Fehler: Bearbeitung von Hand verworfen. |

## 11. Angemeldet als – für alle Bereiche

* `src/gemeinsam/benutzer.ts`: `Benutzer` mit `name` und `farbmodus`, Schlüssel
  `kaplan-benutzer.v1` im `localStorage`, Vorgabe `STANDARD_NAME = 'Max
  Mustermann'`. Ohne gespeicherten Stand übernimmt `laden` einmalig den ersten
  selbst eingetragenen Namen samt Farbmodus aus den Beständen des
  Planlaufmanagements, der Projektsteuerung, der Baubetriebsplanung und der
  Leistungsnachweise (`FRUEHER`; deren Vorgabenamen zählen nicht – auch nicht
  die Demonamen „Lena Roth“ der Projektsteuerung und „Anna Becker“ der
  Leistungsnachweise).
  `benutzerAendern` ändert Name bzw. Farbmodus für alle Bereiche, `useBenutzer`
  liefert sie der Oberfläche; ein anderes Fenster lädt sie bei einer Änderung neu
  (`storage`-Ereignis).
* `src/gemeinsam/AngemeldetAls.tsx`: Knopf „Angemeldet als“ unten in der
  Seitenleiste aller Bereiche und des Controllings und Dialog „Angemeldet als“
  (Name, „Farbmodus für Rot-Grün-Sehschwäche (hoher Kontrast)“, ggf. eine
  Einstellung des Bereichs als Haken, „Übernehmen“) mit dem Hinweis „Gilt in
  allen Bereichen von KaPlan. Bis zur Anmeldung über SSO ist dies eine Angabe
  ohne Kennwort; die Daten liegen lokal in diesem Browser.“ Der Dialog öffnet
  sich über ein Portal auf Seitenebene.
* `src/gemeinsam/useBenutzerAbgleich.ts`: Jeder Store zieht Name und Farbmodus
  nach jeder Änderung in seinen Bestand nach (Planlaufmanagement:
  `bearbeiter`; Baubetriebsplanung, Projektsteuerung, Leistungsnachweise:
  `einstellungen`; die Leistungsnachweise zudem `mitarbeiterId` und legen im
  Bereich eine fehlende Person als Mitarbeiter an, `anmeldungAnwenden`,
  Abschnitt 10.1).
  Das Controlling folgt dem Farbmodus (`src/bereiche/controlling/App.tsx`).
