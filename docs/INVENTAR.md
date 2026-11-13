# Inventar der Anwendung

Stand: Analyse des Quellcodes im Repository `Mailander-Consult-GmbH/MC-Plan`
(Zweig `main`). Es sind ausschließlich Sachverhalte
aufgeführt, die sich im Code belegen lassen; Dateipfade verweisen auf die
jeweilige Fundstelle.

## 1. Zweck der Anwendung

**KaPlan** besteht aus den Bereichen **Planlaufmanagement**,
**Baubetriebsplanung** und **Projektsteuerung**; die letzten beiden liegen als
erster Entwurf vor. Projekte und Projektbeteiligte teilen sie sich über das
gemeinsame Projektregister. Die Abschnitte 1 bis 6
beschreiben das Planlaufmanagement, Abschnitt 7 die Baubetriebsplanung,
Abschnitt 8 die Projektsteuerung, Abschnitt 9 das Projektregister,
Abschnitt 10 „Angemeldet als“. Die früheren Bereiche Leistungsnachweise und
Controlling sind entfernt (`ENTFERNTE_BEREICHE` in `src/shell/router.ts`).

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

Die Anwendung besteht aus drei getrennten Bereichen (`BereichId` in
`src/shell/bereiche.ts`). Die
erste Wegmarke der Adresse benennt den Bereich; die Shell (`src/shell/router.ts`)
wählt danach aus, welcher Bereich geladen wird: `#/` zeigt die Bereichsauswahl
(`src/shell/Start.tsx`: drei hochkante Kacheln – Planlaufmanagement,
Baubetriebsplanung und Projektsteuerung, je mit
Symbol, Titel und Untertitel (`titel`, `untertitel`), ohne Beschreibungstext; die
letzten beiden mit dem Kennzeichen „Erster Entwurf“ aus `marke` in
`src/shell/bereiche.ts`; nebeneinander, unter 720 px untereinander
(`.start-kacheln` in `src/shared/global.css`); am Fuß „Fassung vom …“ mit Bauzeit und – im
Build des Workflows – Commit, `fassungText` in `src/shared/pwa.ts`),
`#/planlauf/…` das Planlaufmanagement,
`#/baubetrieb/…` die Baubetriebsplanung (Abschnitt 7), `#/projektsteuerung/…`
die Projektsteuerung (Abschnitt 8). Innerhalb des Bereichs adressiert ein Hash-Router ohne
Bibliothek (`src/bereiche/planlauf/lib/router.ts`); unbekannte Adressen führen
auf die Übersicht. Adressen aus der Fassung ohne Bereiche (`#/dashboard`,
`#/projekt/<id>/<reiter>` …) werden beim Aufruf auf `#/planlauf/…` umgelenkt
und bleiben damit als Lesezeichen gültig. Adressen der entfernten Bereiche
(`#/leistungsnachweise/…`, `#/controlling/…`) lenkt `umgelenkterHash` in
`src/shell/router.ts` auf die Bereichsauswahl `#/` (`ENTFERNTE_BEREICHE`).

### 2.1 Hauptrouten

| Route | Seite | Aktionen |
| --- | --- | --- |
| `#/planlauf` bzw. `#/planlauf/dashboard` | Übersicht (`src/bereiche/planlauf/pages/Dashboard.tsx`) | `routeToHash` liefert für die Übersicht `#/planlauf`, die Adresse, unter der die Shell den Bereich öffnet; `#/planlauf/dashboard` bleibt gültig. Vier Kacheln: Laufende Planläufe, To-Dos (Planlaufmanagement), Überfällige Schritte, Demnächst fällig – die beiden letzten führen per Klick auf `#/planlauf/fristen`. Tabelle „Meine To-Dos“ mit Schritt, Gewerk, Projekt, Soll-Termin, Status, Erinnerungs-Mail und Erledigt-Haken. Tabelle „Projekte“ mit Anzahl Pläne/Verzeichnisse, laufenden Planläufen, demnächst fällig, überfällig, Fortschrittsbalken und „Projekt öffnen“. Angezeigt werden markierte Projekte; ohne Markierung alle (`sichtbareProjekte`), archivierte (Abschnitt 9) in keinem Fall. |
| `#/planlauf/fristen` | Fristen & Erinnerungen (`src/bereiche/planlauf/pages/Fristen.tsx`) | Alle anstehenden Schritte über alle nicht archivierten Projekte (`useArchivierte`, Abschnitt 9) – bei parallelen Zweigen mehrere je Planlauf (`offeneFristen` in `engine.ts`) –, gegliedert nach Projekt; je Schritt „E-Mail vorbereitet am …“ (Datum zweistellig, TT.MM.JJJJ), wenn schon erinnert wurde. Filter Alle / Überfällig / Fällig / Im Plan mit Zählern, Suche über alles, was die Zeile zeigt: Schritt, Planlauf, Nummer und Titel des Eintrags, Projektnummer und Projekt, Funktion, Vor- und Nachname und Firma; Spalte „Funktion & Person“ (ohne Funktion am Schritt „ohne Funktion“). Je Zeile: Planlauf öffnen, Erinnerungs-Mail vorbereiten, Schritt als erledigt setzen. Kein Eintrag in der Seitenleiste – erreichbar über die Kacheln der Übersicht. |
| `#/planlauf/projekte` | Projekte (`src/bereiche/planlauf/pages/Projekte.tsx`) | Projektliste mit Suche über Name, Nummer und Beschreibung (Suchfeld „Projekt, Nummer …“); Projekt anlegen (übernimmt alle projektübergreifenden Funktionen als Projektfunktionen; Projektnummer und Name werden ohne Leerzeichen am Rand gespeichert), bearbeiten, mit ★ markieren bzw. Markierung aufheben, Projekt öffnen. Die Kachel nennt Projektnummer, Name, Beschreibung (falls vorhanden), Status und ★, unten „Auch in“ mit den anderen Bereichen des Projekts; darunter „Archiv“ und „Projekte aus anderen Bereichen“ mit „Übernehmen in Planlaufmanagement“ (siehe 9.3). |
| `#/planlauf/ketten` | Workflows (`src/bereiche/planlauf/pages/Workflows.tsx`) | Karten unter „Projektübergreifende Workflows“ (Projektvarianten erscheinen nur im Reiter „Workflows“ ihres Projekts), je Karte Kennzeichen „Standard“, „Eigener Workflow“ oder „Projektvariante“, Zahlen und die Punktkette des Standardverlaufs (`AblaufVorschau` in `src/bereiche/planlauf/components/AblaufVorschau.tsx`); „Neuer Workflow“, „Öffnen“, „Duplizieren“, Löschen. „Öffnen“ startet den Workflow-Editor (`src/bereiche/planlauf/components/WorkflowEditor.tsx`, Logik in `src/bereiche/planlauf/domain/workflowGraph.ts`): Spalten „Standardverlauf“ und „Abweichungen“ mit Karten von „Planlauf starten“ bis „Planlauf beenden“, „Rücksprung“-Kennzeichen, „+“ („Schritt hier einfügen“), „Schritt hinzufügen“, Rückgängig/Wiederholen (Strg+Z/Strg+Y), „Übersicht“. „Schrittdetails“ je Schritt: Bezeichnung, Art (Aufgabe / Entscheidung), „Verantwortliche Funktion“, Frist, „Nachweis bei Abschluss“, „Weiter mit“ bzw. Antworten mit „→ Weiter mit“ und „Als Standardverlauf“, „E-Mails“ – die E-Mail-Regeln des Schritts (`MailRegel` in `src/bereiche/planlauf/domain/types.ts`, Felder `mails` am Schritt und an jeder Antwort; Logik in `src/bereiche/planlauf/domain/mailRegeln.ts`): über die Schaltfläche „E-Mail“ je Regel eine nummerierte Karte mit „Wann“ („Sobald der Schritt ansteht“, „Nach dem Erledigen“, bei Entscheidungen „Nach jeder Antwort“ und je Antwort „Bei Antwort „…““ – die Regel wandert dann an die Antwort, `regelZeitpunktSetzen`), „An“ („Nächste Zuständige“, „Zuständige dieses Schritts“ oder unter „Funktion im Projekt“ eine Funktion außer dem Planlaufmanagement) und „Vorlage“ („Vorlage automatisch wählen“ oder eine E-Mail-Vorlage), Entfernen über „E-Mail entfernen“; ohne Regel schlägt der Schritt keine E-Mail vor. Darunter „Anliegen in der Versandmail“ (keins / Freigabe / Vorprüfung / Prüfung / Genehmigung, `ANLIEGEN_OPTIONEN` und Feld `versandAnliegen` in `src/bereiche/planlauf/domain/types.ts`; dieselbe Auswahl in „Schritt anpassen“ des Planlaufs, `PlanlaufDetail.tsx`). Karten mit Regeln tragen das Kennzeichen „E-Mail“ bzw. „… E-Mails“; die „Übersicht“ listet unter „E-Mails“ alle Regeln des Workflows als Satz (`regelSatz`), ein Klick wählt den Schritt, ohne Regeln steht dort „Dieser Workflow sieht keine E-Mails vor. Festgelegt werden sie je Schritt in den Schrittdetails unter „E-Mails“.“ Beim Speichern bringt `bereinigen` die Regeln in feste Form (`regelnBereinigen`). Ändert das Speichern eines vorhandenen Workflows seine E-Mail-Regeln (`regelnGeaendert`) und laufen Planläufe daraus mit anderen Regeln (`laeufeMitAnderenRegeln`), fragt die Seite „E-Mail-Regeln in laufende Planläufe übernehmen?“ („Übernehmen“ / „Nicht übernehmen“; Store `mailRegelnInLaeufeUebernehmen`, `mailRegelnUebernehmen`: Schritte gleicher Bezeichnung, Art und Funktion, Antworten gleichen Textes), „Im Standardverlauf“ früher/später („Früher im Ablauf“, „Später im Ablauf“, `imVerlaufVerschieben`: nur die Stelle unmittelbar davor im Standardverlauf führt danach zum bisherigen Nachfolger, Sprünge anderer Schritte zum verschobenen Schritt – Rücksprung, Nacharbeit – bleiben bei ihm), „Duplizieren“, „Entfernen“ (Verweise gehen an das Standardziel, `entfernen`; Schritte, die dabei oder bei „Aus dem Block lösen“ aus ihrem Zweig herausfallen, stehen hinter dem letzten Schritt außerhalb von Blöcken, nicht als Anschluss hinter einem Block am Listenende, und werden von `pruefen` als nie erreicht gemeldet – besteht der Workflow nur aus Blöcken, erscheint der Hinweis zum geänderten Anschluss). Hinweise in der Fußzeile aus `pruefen`; wer mit Änderungen schließt, erhält „Änderungen verwerfen?“. Escape schließt zuerst ein offenes Menü, dann die Schrittdetails, wenn sie als Blatt (bis 820 px) oder Schublade (bis 1279 px) über der Fläche liegen, erst danach den Editor. Parallele Blöcke: Containerkarte „Parallel · … Zweige“ mit „Weiter, wenn alle Zweige erledigt sind“, „Abweichungen im Zweig“ und „Ausstieg aus dem Block“; angelegt über „Schritt hinzufügen“ → „Parallele Zweige“ oder in den Schrittdetails „Parallel dazu ausführen“, gelöst über „Aus dem Block lösen“; Blöcke lassen sich nicht schachteln. Benennen im Abschnitt „Parallel“ der Schrittdetails mit „Name des Blocks“ und „Name des Zweigs“ (`blockBenennen`, `zweigBenennen` in `workflowGraph.ts`; Tippen zählt für Rückgängig als ein Schritt); ein Klick auf den Kopf der Containerkarte wählt den ersten Schritt des Blocks und fokussiert „Name des Blocks“. Ein benannter Block heißt „… · parallel, … Zweige“ (`blockTitel` in `ablauf.ts`), Zweigköpfe zeigen den Namen, sonst „Zweig …“ (`zweigTitel`). Die Namen stehen am Marker jedes Schritts (`name`, `zweigName` in `Parallel`, `src/bereiche/planlauf/domain/types.ts`); `namenVereinheitlichen` in `ablauf.ts` gleicht sie beim Ordnen der Blöcke an, `bereinigen` kürzt sie beim Speichern. Die Standard-Workflows benennen ihre Blöcke „Prüfung“, „Versand“ und „Postversand“ samt Zweigen (`BLOCK_NAMEN` in `seed.ts`). Je Antwort der Haken „führt zu Nacharbeit“. Ändert eine Umstellung den Anschluss hinter einem Block, meldet der Editor das (`bloeckeOrdnenMitHinweis` in `ablauf.ts`). |
| `#/planlauf/rollen` | Funktionen (`src/bereiche/planlauf/pages/Funktionen.tsx`) | Projektübergreifende Funktionen, gegliedert in „Übergreifend“ und je Gewerk. Neue Funktion anlegen (Bezeichnung, Kürzel, Farbe, Gewerk, Beschreibung), vorhandene Funktion eines anderen Gewerks übernehmen, bearbeiten, löschen. Eine Bezeichnung, die das Gewerk schon führt, weist der Dialog ab („Die Funktion „…“ gibt es bereits.“; geprüft nur, wenn sich Bezeichnung oder Gewerk ändern), gespeichert wird sie ohne Leerzeichen am Rand. Eine Umbenennung zieht Schritte und E-Mail-Regeln der projektübergreifenden Workflows mit, sobald keine übergreifende Funktion mehr die alte Bezeichnung trägt, und mit ihnen die Kopien der Funktion in den Projekten (gleiche Bezeichnung, gleiches Gewerk; über `funktionAendern`, also samt den Schritten ihrer Planläufe und Projekt-Workflows – Projekte starten Planläufe auch aus den übergreifenden Workflows; führt ein Projekt die neue Bezeichnung im selben Gewerk schon, bleibt seine Kopie) (`standardFunktionAendern` in `src/bereiche/planlauf/domain/bestand.ts`; `updateStandardRolle` im Store liefert die Zahl der Workflows und der Projekte); die Kurzmeldung lautet dann „Funktion gespeichert – sie heißt jetzt auch in … „…“.“ (in der Lücke Workflows und Projekte mit ihrer Zahl, verbunden mit „und“). Sonst „Funktion gespeichert.“ Über das **+** an den Reitern entsteht ein Gewerk, über „Gewerk … löschen“ am Seitenende entfällt es. Feld „Seite für den Verzug“ (Planer, Prüfer, Auftraggeber, PLM oder „nicht festgelegt“; `SEITE_LABEL` in `types.ts`, Auswahl in `src/bereiche/planlauf/components/SeiteAuswahl.tsx`), bei neuen Funktionen vorbelegt aus der Bezeichnung (`seiteAusFunktion`); Abzeichen in der Liste, „Seite offen“ ohne Seite. |
| `#/planlauf/terminrechner` | Terminrechner (`src/bereiche/planlauf/pages/Terminrechner.tsx`, Logik in `src/bereiche/planlauf/domain/terminrechner.ts`) | Menüpunkt „Terminrechner“ unter „Projekte“. „Richtung“: „Rückwärts“ („Termin auf der Baustelle → späteste Übergabe des Planers“ bzw. „Termin auf der Baustelle → spätester Start des Planlaufs“) oder „Vorwärts“ („Eingang der Planung → Ende des Planlaufs“ bzw. „Start des Planlaufs → Ende des Planlaufs“) – Anker ist die Übergabe des Planers, wenn der Workflow mit „Eingang PLM“ beginnt, sonst der Start. Eingaben: Projekt (Arbeitstage, Feiertage; „Ohne Projekt: Mo–Fr, ohne Feiertage“), Workflow (übergreifend und Projektvarianten), Datum, Fristen, „Szenario“ („Antwort je Entscheidung im ersten Durchlauf; Vorgabe ist der Standardverlauf.“) und „Zielschritt“ (Vorgabe „Ende des Planlaufs“). Gerechnet wird über `simulieren` bzw. `rueckwaerts` in `simulation.ts`, also mit denselben Regeln wie im Planlauf. „Zwischenergebnisse“ mit Schritt, Funktion, Frist, Eingang, Fristende und Puffer, auf dem kritischen Weg „spätestens“; Schritte in Zweigen mit „Zweig … von …“, bei benannten Zweigen mit dem Namen davor (`zweigKennung`); Druck über `src/shared/print.ts`. Zustände: „Noch kein Datum“, „Kein Workflow vorhanden“, „Der Workflow enthält keine Schritte“, „Das Datum ist ungültig.“, Schleife („Der Ablauf endet in diesem Szenario in einer Schleife – Terminrechnung nicht möglich.“), Grenze („Der Ablauf kommt auch nach 500 Abschlüssen nicht zum Ende – Terminrechnung abgebrochen.“, `SIMULATION_GRENZE`), Zielschritt nicht erreicht, Übergabe bzw. Start vor heute (frühestes Ende bei Übergabe bzw. Start heute) und „Das eingegebene Datum liegt vor heute – gerechnet wird trotzdem ab diesem Tag.“ |
| `#/planlauf/vorlagen` | Vorlagen (`src/bereiche/planlauf/pages/Vorlagen.tsx`) | Reiter **E-Mail-Texte**: Vorlagen anlegen, bearbeiten, löschen; Liste mit Anlass als farbigem Badge (`AnlassBadge`) und dem Anfang von Betreff und Text mit Bausteinen (`BausteinText`). Anlass je Vorlage (Erinnerung, Mahnung, Freigabe, Übergabe, Allgemein). Editor (`MailVorlagenDialog`, Gestaltung `src/bereiche/planlauf/pages/vorlagen.css`): Kopf mit Name und Anlass-Badge, Gruppen „Allgemein“ (Name der Vorlage, Anlass) und „Inhalt“; Betreff und Text als `BausteinEditor` (`src/shared/bausteinEditor.tsx`, Umwandlung in `src/shared/bausteine.ts`) – Platzhalter erscheinen als farbige Bausteine mit `label` aus `PLATZHALTER` (`src/bereiche/planlauf/domain/email.ts`), gespeichert bleibt `{{schluessel}}`; unbekannte als grauer Baustein „unbekannt: …“, Bausteine mit `aria-label` „Baustein …“. Löschen eines Bausteins per Rücktaste/Entf als Ganzes (`bausteinLoeschen`), Einfügen nur als reiner Text (`ersetzen`), Rückgängig/Wiederholen (Strg+Z/Strg+Y) über einen eigenen Verlauf. „Platzhalter einfügen“: Knöpfe je Kategorie (`PLATZHALTER_KATEGORIEN`, Feld `kategorie`; Farben `KATEGORIE_TON` in `Vorlagen.tsx`), Tooltip mit Beschreibung und „Beispiel: …“; eingefügt wird in das zuletzt fokussierte Feld (der Hinweis „fügt in … an der Schreibmarke ein“ nennt Betreff bzw. Text). „Vorschau“ mit `BEISPIEL_WERTE` über `fuelleVorlage` und `mailHtml` (ORDNERNAME EINFÜGEN rot und fett); bis 900 px Breite umschaltbar „Bearbeiten“ / „Vorschau“. Reiter **Excel-Vorlagen**: Vorlagen „Planliste“ und „Funktion“ als `.xlsx` herunterladen, mit Spaltenerläuterung. |
| `#/planlauf/projekt/<id>/<reiter>` | Projektarbeitsbereich (`src/bereiche/planlauf/pages/ProjektDetail.tsx`) | Ggf. Archivhinweis mit „Aus dem Archiv holen“ (9.3), Reiter siehe 2.2. Frühere Adressen werden umgeleitet: `planlaeufe` → `plaene`, `pakete` → `plaene`, `adressbuch` → `rollen`. |
| `#/planlauf/projekt/<id>/planlauf/<runId>` | Planlauf (`src/bereiche/planlauf/pages/projekt/PlanlaufDetail.tsx`) | Siehe 2.3. |

### 2.2 Reiter im Projekt

| Reiter | Seite | Aktionen |
| --- | --- | --- |
| `uebersicht` | Planläufe – Reiterbezeichnung „Planläufe“ (`src/bereiche/planlauf/pages/projekt/Uebersicht.tsx`, Liste in `src/bereiche/planlauf/components/PlanlaufListe.tsx`) | Kennzahlen (Planpakete, Planverzeichnisse, Pläne – je ein Klick führt auf die Planliste –, fällige und überfällige Schritte) und Gesamtfortschritt. Liste der Planläufe, gegliedert nach Planpaketen, je Eintrag in der Spalte „Aktueller Stand“ mit dem zuletzt erledigten Schritt vor dem offenen – übersprungene Schritte zählen nicht, nach dem Wiederöffnen eines früheren Schritts also nie ein späterer – und darunter in Grau seinem Ist-Datum („ohne Datum“, wenn keines eingetragen ist; `letzterAbgeschlossenerSchritt` in `src/bereiche/planlauf/domain/uebersicht.ts`), in der Spalte „Nächster Schritt“ mit dem offenen Schritt: Gliederung umschalten („Planpakete“ / „+ Pläne & Verzeichnisse“), Pakete und Planverzeichnisse am Pfeil auf- und zuklappen (Verzeichnisse zunächst zugeklappt; der Pfeil steht vor Symbol und Titel, sodass Pläne und Verzeichnisse auf einer Linie beginnen), Suche, Filter in den Spaltenüberschriften (Gewerk, Zuständig, Status – einschließlich „Angekündigt“), Sortierung je Spalte („Aktueller Stand“ nach dem Datum des zuletzt erledigten Schritts), Erinnerungs-Mail, Erledigt-Haken, Planlauf öffnen, „Export“ (`ExportDialog.tsx`, siehe `einstellungen`; bei gesetztem Filter sind die gezeigten Einträge vorgewählt – „Vorgewählt sind die Einträge, die der Filter im Reiter „Planläufe“ zeigt.“). Welche Läufe die Liste zeigt und wie sie sie gliedert, legen `massgeblicheLaeufe`, `gliederungBilden` und `knotenBilden` in `uebersicht.ts` fest – dieselben Funktionen gliedern den Export. Die Bezeichnung steht gelb, solange „Eingang PLM“ aussteht – diese Läufe tragen den Status „Angekündigt“, ist der Eingang überfällig jedoch „Überfällig“; Filter und Sortierung folgen derselben Regel –, und grün, wenn der Lauf abgeschlossen ist. Unter einem gebündelten Verzeichnis stehen seine Pläne mit „läuft im Planlauf des Verzeichnisses mit“ – solange der Verzeichnislauf läuft, mit der Schaltfläche „Herauslösen …“ (`planHerausloesen`; die Liste bleibt danach stehen) –, herausgelöste Pläne dagegen mit ihrem eigenen Schritt und Status. Ein Verzeichnis mit Plänen einzeln erscheint als Zeile „… · Pläne einzeln“ ohne eigenen Lauf, mit der Zahl seiner laufenden Pläne, dem aus ihnen zusammengefassten Fortschritt und Status (wie ein Planpaket) und der Schaltfläche „Bündeln …“; seine Pläne stehen darunter. Abgebrochene Läufe – ersatzlos wie durch neuen Index ersetzt – stehen gesammelt am Ende unter der zunächst zugeklappten Zeile „Abgebrochen · … Planläufe“, ausgegraut ohne Schritt, Fortschritt und Schaltflächen, mit dem Index des abgebrochenen Laufs, „Abgebrochen am …“ und dem Zusatz *ersatzlos* bzw. *ersetzt durch Index …*. Aufgeteilte bzw. wieder gebündelte Läufe erscheinen dort nicht (`laufUeberfuehrt` in `engine.ts`). Fortschrittsbalken stehen immer in der Hausfarbe; der Fortschritt ist nach Fristen gewichtet und schließt die laut Prognose noch ausstehenden Ausführungen ein (`fortschritt` in `engine.ts`, Mittel in `mittlererFortschritt`). Nach einem Rücksprung nennt „Aktueller Stand“ den zuletzt bis zum Wiedereingang erledigten Schritt. Stehen in parallelen Zweigen mehrere Schritte an, zeigt die Zeile den führenden mit „+… parallel“ (`src/bereiche/planlauf/components/common.tsx`); Erinnerungs-Mail und Erledigt-Haken fragen dann nach dem Schritt („… Schritte stehen an – welcher ist erledigt?“; Menü „Welcher Schritt ist erledigt?“ bzw. „Erinnerung zu welchem Schritt?“, `AufklappMenue`), Status, Filter und Suche berücksichtigen alle anstehenden Schritte. **Mehrfachauswahl:** Kästchen-Spalte – Planpaket, „Ohne Planpaket“, Verzeichnis und Kopfzeile wählen ihren Inhalt dreistufig, abgebrochene Läufe sind nicht wählbar; Aktionsleiste („Aktionen für die Auswahl“, „… ausgewählt“) mit „Schritte erledigen …“ (`src/bereiche/planlauf/components/SammelErledigen.tsx`: Ist-Datum, erledigt oder übersprungen, je Lauf die anstehenden Schritte, gemeinsame Antwort und Nachweis-Nr. für gleichnamige Schritte, Vorschau mit Rücksprüngen und Abschlüssen, danach Ergebnis und auf Wunsch „E-Mail senden“; Store `schritteAbschliessen`), „Erinnern …“ (`src/bereiche/planlauf/components/SammelErinnern.tsx`: eine Zeile je Person mit „In Outlook öffnen“, bei zu langer E-Mail stattdessen „Text kopieren“; unten „Abbrechen“), „Versandmail …“ (dieselbe Komponente mit `art="versand"`, Titel „Versandmail“: je Empfänger und Anliegen eine E-Mail mit der Vorlage „Versand“ über alle gewählten Pläne am Versandschritt – `versandPosten` in `src/bereiche/planlauf/domain/email.ts`: steht ein Versandschritt an, sind die Zuständigen der Schritte danach Empfänger, steht ein Schritt direkt nach einem erledigten Versandschritt an, dessen Zuständige; vermerkt wird am anstehenden Schritt; Läufe ohne Versandschritt nennt „Ohne Versandschritt und hier außen vor: …“), „Exportieren …“ („Vorgewählt ist Ihre Auswahl im Reiter „Planläufe“.“) und „Auswahl aufheben“. Vor den Aktionen wird die Auswahl in Planläufe aufgelöst; ein mitlaufender Plan wirkt auf den Lauf seines Verzeichnisses. |
| `plaene` | Planliste (`src/bereiche/planlauf/pages/projekt/Plaene.tsx`) | Alle Pläne und Planverzeichnisse mit laufender Nummer, Art, Bezeichnung/Titel, Gewerk, zugehörigem Planverzeichnis und Eingang Soll, gegliedert nach Planpaketen: je Paket eine Kopfzeile mit Name, Kurzzeichen, Gewerk und Zahl der angezeigten Einträge samt eingerückter Pläne („noch nichts zugeordnet“ bei leeren Paketen) – der Pfeil klappt sie zu, ein Klick öffnet das Paket –, danach die Einträge ohne Paket, sobald Pakete angezeigt werden unter „Ohne Planpaket · …“ (gleich gezählt). Leere Pakete erscheinen ohne Suche und Filter bzw. wenn Name, Kurzzeichen oder Gewerk zur Suche passen; die Suche erfasst auch den Paketnamen. Die Schaltflächen über der Liste brechen auf schmalen Bildschirmen um. „Neues Planpaket“ und die Kopfzeilen öffnen den Paketdialog (`src/bereiche/planlauf/components/PaketDialog.tsx`): Name, Kurzzeichen, Gewerk, Bemerkung, Löschen mit Rückfrage – die Einträge bleiben mit ihren Planläufen erhalten und verlieren ihre Paketzuordnung (`deleteDocument`) –, beim Bearbeiten außerdem „Inhalt“ (mit dem Hinweis „gilt sofort“) mit „Entfernen“ je Eintrag und „Hinzufügen:“ für Planverzeichnisse und Pläne ohne Verzeichnis und ohne (noch vorhandenes) Paket; Pläne eines Verzeichnisses folgen dessen Paket (`paketVon` in `uebersicht.ts`). Reines Ordnungsmerkmal ohne Einfluss auf Planläufe. Pläne eines Planverzeichnisses stehen unter ihm, mit Symbol, Art und Titel eingerückt; der Pfeil zum Auf- und Zuklappen steht zwischen Nummer und Symbol (zunächst aufgeklappt). Ist das Verzeichnis ausgefiltert, stehen seine Pläne für sich. Filter (Alle / Pläne / Verzeichnisse), Suche, Sortierung je Spalte (der Tastaturfokus bleibt auf der Spaltenüberschrift, ein zweites Enter kehrt die Richtung um). Einträge, deren Planlauf noch beim Schritt „Eingang PLM“ steht, tragen eine gelbe Bezeichnung und das Kennzeichen „Angekündigt“; bei abgeschlossenen Läufen steht die Bezeichnung grün. Kennzeichen „Pläne einzeln“ an Verzeichnissen mit Einzelläufen, „eigener Lauf“ an herausgelösten Plänen eines gebündelten Verzeichnisses. Eintrag anlegen (startet zugleich den Planlauf, sofern der Eintrag einen eigenen hat; „Ablauf dieses Planlaufs“ zeigt den gewählten Workflow, „Individueller Workflow“ öffnet den Workflow-Editor nur für diesen Lauf, Kennzeichen „Individuell angepasst“, „Auf Workflow zurücksetzen“ – `LaufSchritte` in `AblaufVorschau.tsx`), bearbeiten (Plancodierung, Index, Titel, Gewerk und Planungsphase gehen ohne Leerzeichen am Rand in den Bestand und in den Namen des Planlaufs, ebenso Name, Kurzzeichen und Gewerk des Planpakets; ein Planverzeichnis, das Pläne führt, lässt sich im Feld „Art“ nicht zum Plan machen – Kurzmeldung „Das Planverzeichnis führt … – zum Plan lässt es sich erst machen, wenn es keine mehr führt (im Plan ein anderes Planverzeichnis oder „– Einzelplan –“ wählen).“), löschen – beim Löschen eines gebündelten Verzeichnisses bleiben seine Pläne als Einzelpläne im Paket des Verzeichnisses, mitlaufende führen den Stand des Verzeichnislaufs in einem eigenen Lauf weiter (`deleteDocument` mit `laufUebernehmen`); Planverzeichnis oder Planpaket direkt aus den Auswahlfeldern neu anlegen – ein so angelegtes Planverzeichnis fragt „Codierung“ und „Titel“ ab (ohne Titel gilt die Codierung als Titel); sein Planlauf startet mit „Anlegen und Planlauf starten“ des Plans nach dem Workflow im Dialog, der Hinweis „Das Planverzeichnis „…“ hat noch keinen Planlauf.“ steht darüber (`verzeichnisOhneLauf`; gilt für jedes gebündelte Verzeichnis, das noch nie einen Lauf hatte). Bei „Abbrechen“ oder Wahl eines anderen Verzeichnisses entfällt das angelegte Verzeichnis wieder. Excel-Import (`PlaeneImport.tsx`): jede Zeile erhält ihren eigenen Eintrag; jeder Eintrag mit eigenem Planlauf – auch ohne Codierung, ein beim Import neu angelegtes Verzeichnis und ein vorhandenes gebündeltes Verzeichnis, das noch nie einen Lauf hatte – startet ihn sofort, nach dem Workflow der Spalte „Workflow“, sonst nach dem unter „Workflow für Einträge ohne Angabe“ gewählten (`planlaufAusWorkflow` in `engine.ts`). Das Dateifeld wird nach dem Lesen geleert, sodass sich dieselbe Datei nach einer Berichtigung über „Andere Datei wählen“ noch einmal lesen lässt. Pakete und Verzeichnisse werden je Art über Codierung bzw. Kurzzeichen oder Titel gefunden, auch in derselben Datei; ein neu angelegtes Verzeichnis übernimmt das früheste Eingang Soll seiner Pläne. Die Nummer eines Planverzeichnisses heißt „Codierung“ (`NUMMER_LABEL` in `types.ts`). Einträge, deren Lauf durch einen neuen Index ersetzt oder ersatzlos abgebrochen wurde, tragen einen grauen Zusatz; aufgeteilte bzw. wieder gebündelte Läufe zählen nicht als Abbruch. Im Dialog eines Planverzeichnisses: Haken „Pläne einzeln durch den Planlauf führen“ – frei wählbar, solange weder das Verzeichnis noch seine Pläne einen Lauf haben – und bei laufendem gebündeltem Lauf „Alle Pläne einzeln weiterführen …“ (`verzeichnisAufteilen`). Im Dialog eines mitlaufenden Plans: „Aus dem Verzeichnislauf herauslösen …“ (`planHerausloesen`). Haben Pläne des Verzeichnisses einen eigenen Lauf, bietet der Verzeichnis-Dialog „Pläne wieder bündeln …“: Der Dialog (`src/bereiche/planlauf/components/BuendelnDialog.tsx`) listet diese Pläne mit Haken, aktuellem Schritt und Fortschritt; die angekreuzten kehren in einen gemeinsamen Verzeichnislauf zurück (`planeBuendeln`), ihre eigenen Läufe enden mit der Abbruchart `gebuendelt`, nicht angekreuzte behalten ihren Lauf. Läuft das Verzeichnis noch, übernehmen sie dessen Stand – ein Plan, der weiter ist, wird mit „weiter als das Verzeichnis – fällt zurück“ gekennzeichnet. Ist es aufgeteilt, entsteht ein neuer Verzeichnislauf; sein Stand wird unter „Stand des Verzeichnislaufs übernehmen von“ gewählt, vorgeschlagen ist der am wenigsten weit gediehene Plan. In beiden Fällen übernimmt der Plan den Stand des Verzeichnislaufs – erledigte Schritte bleiben erledigt, Start und Termine laufen weiter (`laufUebernehmen` in `engine.ts`); der gebündelte Lauf endet beim Aufteilen mit der Abbruchart `aufgeteilt`. Ein Plan, der schon einen eigenen Lauf hat, behält ihn beim Verschieben in ein anderes Verzeichnis. „Angekündigt“ prüft alle anstehenden Schritte. Läuft ein Plan im Lauf seines Verzeichnisses mit, nennt der Dialog zu „Eingang Soll“: „Der Plan läuft im Planlauf seines Verzeichnisses mit – maßgeblich ist das Eingang Soll des Verzeichnisses.“ **Mehrfachauswahl:** Kästchen-Spalte (ein Verzeichnis wählt sich samt seinen sichtbaren Plänen; Paketzeile, „Ohne Planpaket“ und Kopfzeile wählen ihren Inhalt; was Suche oder Filter ausblenden, fällt aus der Auswahl) mit Aktionsleiste „… ausgewählt“: „Planpaket zuweisen …“ (`dokumentePaketZuweisen`, auch „– keinem Paket –“; Pläne folgen dem Paket ihres Verzeichnisses), „Neues Planpaket aus Auswahl …“ (PaketDialog mit `paketAusAuswahl`, das kein leeres Paket anlegt), „Gewerk/Planungsphase …“ (`dokumenteAendern`, „Leer lassen = unverändert“), „Löschen …“ (`dokumenteLoeschen`; die Rückfrage nennt Verzeichnisse mit oder ohne ihre Pläne, die Zahl der Planläufe samt denen mit Ist-Daten bzw. Protokoll und die künftigen Einzelpläne, mit „Sicherung vorher herunterladen“) und „Auswahl aufheben“ – Dialoge in `src/bereiche/planlauf/components/PlanlisteAktionen.tsx`. Auch „Hinzufügen“ und „Entfernen“ im Paketdialog laufen über `dokumentePaketZuweisen`. |
| `rollen` | Funktion (`src/bereiche/planlauf/pages/projekt/RollenFunktionen.tsx`) | Nach Gewerken gegliedert („Übergreifend“ + je Gewerk, **+** für ein weiteres Gewerk, „Gewerk … löschen“ am Seitenende). Je Funktion die Besetzung mit einer Person samt Adressdaten und den Feldern „SharePoint-Link Eingang“ und „SharePoint-Link Ausgang“ (`sharepointEingang`, `sharepointAusgang` an `Contact`; in der Liste als kleine Links „SharePoint Eingang“ / „SharePoint Ausgang“): Funktion anlegen, bearbeiten, löschen – eine Bezeichnung, die das Gewerk im Projekt schon führt, weist der Dialog ab („Die Funktion „…“ gibt es bereits.“, Vergleich über `funktionsSchluessel`, nur wenn sich Bezeichnung oder Gewerk ändern), gespeichert wird sie ohne Leerzeichen am Rand; eine Umbenennung zieht die Schritte der Planläufe des Projekts, für die genau diese Funktion gilt, samt ihren E-Mail-Regeln mit, die Workflows des Projekts dann, wenn im Projekt keine Funktion mehr die alte Bezeichnung trägt (`funktionAendern` in `src/bereiche/planlauf/domain/bestand.ts`; welche Läufe, entscheidet `rolleFuerSchritt` in `engine.ts` – bei einem gleichzeitigen Gewerkwechsel nur die, für die die Funktion weiter gilt); die projektübergreifenden Workflows ziehen nicht mit – nennen Workflows, aus denen das Projekt Planläufe startet (übergreifende und eigene), die alte Bezeichnung weiter, ohne dass das Projekt dafür noch eine Funktion hat (`workflowsMitAlterBezeichnung` in `bestand.ts`, `updateRole` im Store liefert ihre Zahl), lautet die Kurzmeldung „Funktion gespeichert – … weiter „…“; neue Planläufe daraus haben für diese Schritte keine zuständige Person.“ (in der Lücke „1 Workflow nennt“ bzw. die Zahl mit „Workflows nennen“), sonst „Funktion gespeichert.“; ein Gewerkwechsel zieht das Gewerk an den Zuordnungen der Personen mit; Besetzung setzen, wechseln, aufheben – von der Funktion aus (Person übernehmen oder neu erfassen) oder über „Person hinzufügen“ von der Person aus (Funktion optional gleich mitwählen). Suche über Funktion, Person und Firma – ohne Treffer „Keine Funktion gefunden“ mit „Für diese Suche gibt es keinen Treffer.“ und ohne Knopf zum Anlegen, bei leerer Seite ohne Suche dagegen „Keine Funktion“ mit „Neue Funktion“; die Knopfleiste über der Liste bricht bei schmaler Breite um (`row wrap`); Personen ohne Funktion in einer eigenen Liste, je Zeile bearbeiten und löschen (Rückfrage „Person löschen?“ mit „… wird aus diesem Projekt entfernt. Offene Prozessschritte, denen die Person von Hand zugewiesen ist, folgen danach wieder der Besetzung ihrer Funktion.“; `kontaktLoeschen` in `bestand.ts` nimmt an offenen Schritten Person und „von Hand“ zurück); das Planlaufmanagement wird nicht angezeigt (immer die angemeldete Person); Excel-Import (`RollenImport.tsx`), der fehlende Gewerke und Funktionen anlegt; die optionale Spalte „Seite“ setzt die Seite für den Verzug, die Spalten „SharePoint Eingang“ und „SharePoint Ausgang“ (`ROLLEN_SPALTEN` in `src/bereiche/planlauf/domain/importVorlagen.ts`) die Links. Vorhandene Personen werden aktualisiert, eine leere Zelle oder fehlende Spalte lässt ihre Angaben stehen (`ausgefuellt` in `RollenImport.tsx`; Hinweis im Dialog: „Personen, die es im Projekt schon gibt, werden aktualisiert; leere Zellen lassen ihre vorhandenen Angaben stehen, und eine vorhandene Anschrift wird nur ersetzt, wenn die Zeile Straße und Ort nennt.“), mehrere Zeilen derselben Person ergänzen einander. Eine Person erkennt der Import an ihrer E-Mail; fehlt die E-Mail in der Zeile oder bei der bekannten Person, entscheidet der Name, wenn er genau eine Person trifft – im Projekt wie unter den früheren Zeilen der Datei (`personenZuordnen`); trifft er mehrere, entsteht eine neue Person mit dem Hinweis „Name mehrfach im Projekt – ohne E-Mail nicht zuzuordnen, die Person wird neu angelegt“. Das Gewerk gilt in der Schreibweise der Gewerkeliste bzw. seiner ersten Nennung in der Datei („kib“ ist „KIB“ – keine zweite Funktion). Die Anschrift entsteht aus Straße, Nr., PLZ und Ort (`anschriftBauen`); eine vorhandene ersetzt nur eine Zeile mit Straße und Ort (`anschriftVoll`), eine Teilangabe füllt eine leere Anschrift – sonst Hinweis „Anschrift unvollständig (ohne Straße oder Ort) – die bisherige bleibt“. Eine Funktion, die die Datei vergibt, verliert ihre bisherige Besetzung auch dann, wenn die bisherige Person selbst in der Datei steht; steht dieselbe Funktion in mehreren Zeilen mit verschiedenen Personen, gilt die letzte Zeile (`ueberholt`), die früheren tragen den Hinweis „Funktion steht weiter unten mit einer anderen Person – es gilt die letzte Zeile“ und hinterlegen ihre Person ohne die Funktion. Das Dateifeld wird nach dem Lesen geleert – dieselbe Datei lässt sich nach einer Berichtigung über „Andere Datei wählen“ noch einmal lesen (ebenso in `PlaeneImport.tsx`). Feld „Seite für den Verzug“ im Funktionsdialog, Abzeichen in der Liste („Seite offen“ ohne Seite). |
| `ketten` | Workflows im Projekt (`src/bereiche/planlauf/pages/Workflows.tsx` mit `projectId`) | Wie der globale Bereich, zusätzlich unter „Projektvarianten“ die Varianten dieses Projekts. |
| `einstellungen` | Einstellungen (`src/bereiche/planlauf/pages/projekt/Einstellungen.tsx`) | Projektdaten bearbeiten; Vorlaufzeit für Erinnerungen, Fristenrechnung in Arbeitstagen, Feiertage (in der Liste als TT.MM.JJJJ, `formatDate`), Absendername und Absender-E-Mail pflegen; Hinweis auf die projektübergreifenden E-Mail-Texte; **Export** (`ExportDialog.tsx`, Titel „Planläufe exportieren“; ebenso im Reiter „Planläufe“): Kurz- oder Langfassung; Auswahl der Einträge in der Gliederung der Planlaufliste – je Planpaket, „Ohne Planpaket“ und „Abgebrochen“ ein Haken für die Gruppe; gewählt wird je Planlauf bzw. mitlaufendem Plan (`zeilenSchluessel`), ein Verzeichnis wählt die Pläne unter sich mit, ein mitlaufender Plan – gekennzeichnet mit „läuft im Verzeichnis mit“ – sein Verzeichnis, abgebrochene Läufe tragen ihren eigenen Index; PDF und Excel bleiben gesperrt, solange der Bericht leer wäre; eine Auswahl nach Arten gibt es nicht. Ausgabe als Excel-Datei (`src/shared/xlsx.ts`) oder als PDF über den Druckdialog (`src/shared/print.ts`). Aufbereitung in `src/bereiche/planlauf/domain/export.ts` (`berichtBilden` auf Grundlage von `uebersicht.ts`): Überschriften sind nur die Planpakete (dazu wie in der Liste „Ohne Planpaket“ und „Abgebrochen“); ein gebündeltes Verzeichnis ist ein Planlauf mit seinen mitlaufenden Plänen, ein Verzeichnis mit Plänen einzeln nur eine Klammer. Kurzfassung als PDF: die Tabelle der Planlaufliste (Plan / Planverzeichnis, Gewerk, Aktueller Stand, Nächster Schritt, Zuständig, Fortschritt, Status) ohne Schaltflächen, mit `EXPORT_STIL`; in Excel ein formatiertes Blatt (`kurzBlatt`): A1 „Projekt: …“, A2 „Stand: …“, Kopfzeile in Zeile 4 (`KURZ_KOPF`: Planpaket, Plancode, Index/Ausgabe, Titel, Gewerk, Aktueller Stand, Datum, Nächster Schritt, Frist; Planpaket „ohne Planpaket“, wenn keines), erst die laufenden Planläufe, dann gesondert „Abgeschlossen (…)“ grün und „Abgebrochen (…)“ grau hinterlegt; Datum und Frist als Excel-Daten, Frist bei fälligen Schritten orange, bei überfälligen rot; mitlaufende Pläne mit „läuft im Planlauf von … mit“, Verzeichnisklammern ohne eigene Zeile; Kopfzeilen fixiert, Druck quer auf Seitenbreite (Zellformate in `src/shared/xlsx.ts`). Langfassung: je Planlauf alle Schritte, in Excel je Schritt eine Zeile (`LANG_KOPF`, u. a. mit Durchlauf, Seite, Eingang, Soll, Ist und Verzug); frühere Durchläufe stehen als eigene graue Zeilen, voraussichtliche Termine kursiv. Die Kurzfassung nennt bei parallelen Zweigen alle anstehenden Schritte. Karte „Projekt archivieren“ mit „Archivieren“ (`ArchivKnopf`, 9.3; die Karte steht nur, wenn es etwas zu archivieren gibt – `useArchivierbar`: nicht archiviert und dem Register bekannt). Projekt löschen (danach führt `navigate` zur Projektliste). |

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
die vorbereiteten E-Mails („E-Mail vorbereitet am …“, `erinnerungText` in
`src/bereiche/planlauf/components/common.tsx`, Datum zweistellig) und aufklappbar die
früheren Durchläufe aus `historie`. Abgeschlossene Schritte bieten **Wieder
öffnen …**: Dialog „Schritt wieder öffnen“ („Wie soll der Schritt wieder
geöffnet werden?“) mit „Korrektur“ – nur solange kein Nachfolger ein Ist hat
(`wiederOeffnenArt` in `abschluss.ts`) – oder „Erneute Bearbeitung“ mit
„Eingang des neuen Durchlaufs“; Store `wiederOeffnen`. Jede Zeile **Anpassen**
(„Schritt anpassen“: Bezeichnung, Art, Funktion, zuständige Person – „– laut
Funktion –“ –, Frist, Eingang, „Ist-Termin“ nur bei erledigten Schritten,
„Soll-Termin festsetzen“, Bemerkung, Nachweis; kein Statusfeld). Ein von Hand
gesetztes Soll bleibt auch stehen, solange der Schritt außerhalb des Verlaufs
liegt, und gilt, sobald er erreicht wird; das Kennzeichen `sollManuell` gibt es
nur mit Datum – ohne nimmt `recalcSollDaten` (`engine.ts`) es zurück. Ändert sich
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
„nach dem parallelen Block (bevor es weitergeht)“; „– an den Anfang –“ nur, wenn
der Eintrag kein Eingang Soll hat, sonst ergänzt der Hinweis am Feld „Vor dem
ersten Schritt geht es nicht, solange der Eintrag ein Eingang Soll hat – es gilt
für den ersten Schritt.“; Store `schrittImLaufEinfuegen`), Antwort einer Entscheidung
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
Workflows umgestellt“. Nach dem Erledigen oder Überspringen öffnet sich –
sofern `mailNachfrage` gesetzt ist und die E-Mail-Regeln der Schritte dafür
E-Mails vorsehen (`mailVorschlaege` in
`src/bereiche/planlauf/domain/mailRegeln.ts`) – „E-Mail senden“
(`src/bereiche/planlauf/components/NeuZustaendig.tsx`): je Empfänger und Vorlage
eine Zeile mit „Anlass: …“, den betroffenen Schritten (bei E-Mails an eine
Funktion bzw. an die Person des erledigten Schritts „Zur Kenntnis“), Vorlage,
„E-Mail …“ und dem Kennzeichen „E-Mail vorbereitet“. Ausgewertet werden nach dem
Erledigen die Regeln „Nach dem Erledigen“ des Schritts und die der gewählten
Antwort – nach dem Überspringen davon nur die an die nächsten Zuständigen – und
für jeden neu anstehenden Schritt seine Regeln „Sobald der Schritt ansteht“;
gleicher Empfänger und gleiche Vorlage ergeben eine E-Mail, an die eigene
Person geht keine. Nennt die Regel keine Vorlage, wählt `vorlageFuerVorschlag`
sie nach der Lage: steht ein Schritt nach einem Versandschritt an
(`versandSchrittVor` in `email.ts`), ist die Vorlage „Versand“ vorgewählt und die
Zeile nennt „Versand zur …“ (fehlt der Link, „SharePoint-Link Eingang fehlt“);
ist eine Funktion nicht besetzt, steht „Keine Person zugeordnet“. Der
E-Mail-Dialog fasst mehrere Schritte einer Person zu einer Sammel-E-Mail
zusammen und vermerkt jede vorbereitete E-Mail am Schritt
(`erinnerungenVermerken`) – eine E-Mail „Zur Kenntnis“ am erledigten Schritt.

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
„Protokoll“. Führt der Lauf an einem Schritt des Regelwegs im Basisplan vorbei
(Antwort ohne Nacharbeit, die ihn überspringt, oder Ausstieg aus einem Block
nach vorn), entsteht ein Zeitgewinn in Höhe seiner Frist im Basisplan („Schritt
„…“ des Basisplans entfällt“), für einen ganz ausgelassenen Block in Höhe
seiner geplanten Dauer („Paralleler Block des Basisplans entfällt“) – nicht bei
abgebrochenen Läufen. Beginnt der Lauf mit einem parallelen Block und hat der
Eintrag ein Eingang Soll, misst der Nachweis jeden Zweiganfang wie einen ersten
Einzelschritt an seinem geplanten Soll laut Basisplan und den Block an seinem
geplanten Ende laut Basisplan. Ein Eingang Soll vor dem Start des Laufs zählt
dabei ab dem Start (`abStart` in `nachweis.ts`) – der Basisplan rechnet ab dem
Start weiter, die Tage zwischen Eingang Soll und Start sind kein Verzug; das
gilt für das geplante Soll, das geplante Blockende und das Soll, an dem der
erste Schritt gemessen wird („Eingang nach dem Eingang Soll“). Karte **Protokoll** (`src/bereiche/planlauf/components/Protokoll.tsx`):
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
  `src/gemeinsam/AngemeldetAls.tsx`, Abschnitt 10): Name und Schalter
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
  Funktionen ordnet der Abgleich über die Kennung zu, dann über die Kennung
  ohne angehängtes „~Gewerk“ bei gleichem Gewerk (`kennungOhneGewerk` – frühere
  Umstellungen hängten das Gewerk wiederholt an; gilt auch für Löschvermerke),
  zuletzt über Projekt, Name und Gewerk (Hinweis „über Name und Gewerk
  zugeordnet“ – nicht, wenn sich die Kennungen nur um „~Gewerk“ unterscheiden).
  Fehlende Gewerke ergänzt `verweiseBereinigen` nur, wenn sie mit dem
  Übernommenen hereinkommen: Ein Gewerk, das im Bestand schon gelöscht war und
  das Einträge nur noch als Angabe führen, kommt nicht von selbst zurück – nur
  ausdrücklich gewählt oder wenn etwas Hereingekommenes es nennt
  (`gewerkNennungen`: was vorher niemand mit dieser Kennung nannte – eine
  gewählte Funktion, ein neuer Eintrag oder ein als Kopie übernommenes Projekt,
  dessen Funktionen das Gewerk führen; es steht dann wieder in der Gewerkeliste).
  Ohne Unterschiede: „Keine Unterschiede“. Übernommen wird über `datenAbgleichen`;
  Läufe gleicher Kennung vereinigen Protokoll, Historie und Erinnerungen.
  Stammt der gespeicherte Stand aus einer neueren Fassung, sind beide Wege
  gesperrt (auch `ersetzeDaten` im Store ersetzt dann nichts), nach einem
  Ladefehler das Abgleichen. **Zurücksetzen**: verwirft den
  Bestand und lädt die Demodaten – `bearbeiter` („Angemeldet als“ samt
  E-Mail-Nachfrage) bleibt (`zuruecksetzen` in
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
  Baubetriebsplanung. Das Menü liegt per
  Portal im `body`, öffnet bei Platzmangel nach oben, bleibt im Fenster und scrollt selbst;
  der erste Eintrag erhält den Fokus, Pfeiltasten, Home und End wechseln den Eintrag, Escape
  schließt und gibt den Fokus an den Knopf zurück; Tab, ein Klick oder Tippen daneben,
  Scrollen und eine Größenänderung schließen es ebenfalls.
  Nach einer Wahl setzt das Menü den Fokus im nächsten Bild (`requestAnimationFrame`) auf den
  Knopf, wenn der Fokus auf `body` gefallen ist und der Knopf noch im Dokument steht; ein Dialog, den
  die Wahl öffnet, behält ihn. Der Erledigt-Haken einer Zeile der Planlaufliste
  (`src/bereiche/planlauf/components/PlanlaufListe.tsx`) ist für einen wie für mehrere anstehende
  Schritte derselbe Knopf (bei einem erledigt er direkt) und bleibt so auch dann im Dokument, wenn
  nach der Wahl nur noch ein Schritt ansteht.
* **Dialoge** (alle Bereiche; `Modal` in `src/shared/ui.tsx`, `role="dialog"` mit
  `aria-modal` und `aria-labelledby` auf den Titel; der Fuß `.modal-footer` bricht
  bei vielen oder langen Knöpfen um, `flex-wrap` in `src/shared/global.css`): Beim Öffnen behält ein Feld mit
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
  vor, auch wenn eine ältere noch steht, ohne dass der Fokus wandert. `.toast-wrap` ist so breit
  wie die längste Meldung, höchstens `min(640px, calc(100vw - 32px))`; `.toast` hat den festen
  Radius `--radius-xl`, damit umbrechende Meldungen nicht zur Ellipse werden (`src/shared/global.css`). Die Ablagefläche `.drop-zone` der Import-Dialoge `PlaeneImport.tsx`,
  `RollenImport.tsx` (`src/bereiche/planlauf/pages/projekt/`) und
  `src/bereiche/projektsteuerung/components/BeteiligteImport.tsx` ist über `alsKnopf`
  (`src/shared/ui.tsx`) per Tastatur bedienbar: `role="button"`, Tab-Halt, Enter und Leertaste
  öffnen die Dateiauswahl. Anklickbare Zeilen (`tr.clickable`, `.list-row.clickable`) sind über
  `alsKlickZeile` (`src/shared/ui.tsx`; `alsKnopf` baut darauf auf) Tab-Halte ohne Rolle
  „button“: Enter und Leertaste öffnen wie der Klick, Tasten auf Knöpfen und Kästchen in der
  Zeile lösen sie nicht aus, den Fokus zeigt `src/shared/global.css` an der ganzen Zeile. Im
  Planlaufmanagement gilt das für die Liste der Planläufe
  (`src/bereiche/planlauf/components/PlanlaufListe.tsx`), „Meine To-Dos“ und Projekte der
  Übersicht (`Dashboard.tsx`), Einträge und Planpakete der Planliste (`Plaene.tsx`), die
  Funktionen (`Funktionen.tsx`) sowie Funktionen und Personen im Projekt
  (`RollenFunktionen.tsx`); in der Baubetriebsplanung für die Anmeldungstabellen des Projekts
  (`src/bereiche/baubetrieb/pages/ProjektDetail.tsx`), die Zeilen der Übersicht
  (`src/bereiche/baubetrieb/pages/Uebersicht.tsx`) und den Anmeldebedarf unter „Termine &
  Nachhaken“ (`src/bereiche/baubetrieb/pages/Termine.tsx`). Felder, in denen die Eingabetaste
  den Dialog abschließt, nutzen `beiEnter` (`src/shared/ui.tsx`): Die Aktion läuft, die
  Standardaktion der Taste entfällt – sonst gäbe `Modal` den Fokus an den Öffner zurück und
  dieselbe Taste löste ihn noch einmal aus („Neues Gewerk“ in Planlaufmanagement und
  Projektsteuerung, „Angemeldet als“, Freigabe- bzw. Prüfbericht-Nr. in `SchrittStatus.tsx`,
  „Neues Planverzeichnis“ und „Neues Planpaket“ aus der Auswahl im Eintragsdialog).
* **Tabellen** (alle Bereiche): `.table-scroll` schneidet ab 861 px quer ab, damit die
  Kopfzeile stehen bleibt; passt eine Tabelle nicht in ihre Karte, setzt
  `tabellenBreiteBeobachten` (`src/shared/tabellen.ts`, aufgerufen in `src/main.tsx`) die
  Klasse `table-scroll-quer`, und sie scrollt quer. Der Ampelpunkt `.dot`
  (`src/shared/global.css`) ist `inline-block`, damit er auch in einer Tabellenzelle
  eine Größe hat. Eine neue Seite beginnt oben
  (`useNachObenBeiSeitenwechsel` in `src/shared/scrollen.ts`, am Inhaltsbereich jedes
  Bereichs; ein Reiterwechsel scrollt nicht). Dialoge sind auf `100dvh` begrenzt.
* **Seitenleiste in der schmalen Ansicht** (alle Bereiche): Bis 860 px Breite klappt sie über die
  Schaltfläche „Menü“ (`.menu-toggle`) auf (`.sidebar.open`). Sie schließt bei jedem
  Seitenwechsel – auch bei einem, der nicht aus ihr kommt, etwa per Zurück im Browser
  (`useSeitenleiste` in `src/shared/seitenleiste.ts`, hört auf `hashchange`) – und bei einem
  Klick auf den abgedunkelten Hintergrund.
* **E-Mail-Dialog** (`src/bereiche/planlauf/components/EmailDialog.tsx`): Vorlage wählen, Betreff
  und Text bearbeiten, „In Outlook öffnen“ (mailto) oder „Abbrechen“. Ein Wechsel der Vorlage füllt
  nur Betreff und Text neu; der Empfänger – auch ein von Hand eingetragener – bleibt stehen. Gibt
  es keine Vorlage, erscheint der Dialog „Keine E-Mail-Vorlage“ („Es ist noch keine
  E-Mail-Vorlage hinterlegt.“) mit dem Verweis auf „Vorlagen › E-Mail-Vorlagen“ (die Vorlagen
  gelten für alle Projekte) – ebenso in `src/bereiche/planlauf/components/SammelErinnern.tsx`. Bei mehreren Schritten einer Person eine Sammel-E-Mail
  (Vorlage „Sammelerinnerung“, `sammelMailVorbereiten` in `email.ts`, Platzhalter
  `{{liste}}` und `{{anzahl}}`); ist der Link länger als `MAILTO_GRENZE`, bleibt
  „In Outlook öffnen“ gesperrt („Zu lang für die Übergabe an Outlook – siehe Hinweis“), der
  Hinweis bietet „Text kopieren“ an.
  Lücken im Text („[SharePoint-Link Eingang fehlt]“, „[SharePoint-Link Ausgang
  fehlt]“, „[Anliegen fehlt]“, `fehlendeAngaben`) meldet „Im Text fehlen
  Angaben: …“. Jede vorbereitete E-Mail wird als Erinnerung am Schritt vermerkt.
  Empfänger ist die für den Schritt zuständige Person; aus „E-Mail senden“ die
  Person, die die E-Mail-Regel nennt (`empfaengerId`, vermerkt an `vermerk`). Der
  Platzhalter `{{antwort}}` nennt die gewählte Antwort einer Entscheidung
  (`antwortText` in `email.ts`).
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
die die Anwendung im Browser öffnet, alles lesen und ändern.
„Angemeldet als“ ist ein Name ohne Kennwort, gemeinsam für alle Bereiche
(Abschnitt 10). Der Bestand liegt ausschließlich im `localStorage` des
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
(`contactManuell`). „Von Hand“ ohne Person gibt es nicht: Wird die von Hand
gewählte Person gelöscht, nimmt `kontaktLoeschen`
(`src/bereiche/planlauf/domain/bestand.ts`) das Kennzeichen an offenen
Schritten zurück, und der Schritt folgt wieder der Besetzung (im
Änderungsprotokoll „Zuständigkeit für „…“ folgt wieder der Besetzung: …“);
ältere Stände mit dem Kennzeichen ohne Person zieht
`zustaendigkeitenNachziehen` ebenso nach.

Die Bezeichnung, die die Schritte nennen, zieht eine Umbenennung mit:
`funktionAendern` (Projektfunktion → Planläufe und Workflows des Projekts) und
`standardFunktionAendern` (übergreifende Funktion → übergreifende Workflows),
beide in `src/bereiche/planlauf/domain/bestand.ts`, jeweils samt den
E-Mail-Regeln „an Funktion“ (`MailRegel.roleName`). Trifft derselbe Wechsel
in einem Lauf mehrere Schritte, schreibt das Änderungsprotokoll einen Eintrag
je Lauf („Funktion von … Schritten geändert: …“), bei einem Schritt „Funktion
von „…“ geändert: …“ (`src/bereiche/planlauf/domain/protokoll.ts`).

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
4. **Migrationen**: laufen automatisch beim Laden. `DATEN_VERSION = 15` und
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
   (`vorlagenFassung13`). Fassung 15 ersetzt an Workflow- und Laufschritten die
   Felder `mailFrage` und `mailVorlageId` durch E-Mail-Regeln (`mails` an
   Schritten und Antworten, `mailRegelnFassung15`): eine Regel nach dem
   Erledigen an die nächsten Zuständigen überall dort, wo die Arbeit an eine
   andere Funktion als das Planlaufmanagement übergeht (`uebergabeRegeln` in
   `domain/mailRegeln.ts`, bei Entscheidungen je Antwort); war `mailFrage`
   gesetzt, erhält der Schritt die Regel in jedem Fall, mit der hinterlegten
   Vorlage. `rollenAufteilen` teilt nur Funktionen des früheren Modells
   (Liste `gewerke` bzw. `gewerkBezug`) je Gewerk auf und vergibt dabei neue
   Kennungen; Funktionen, die schon je Gewerk geführt werden (Feld `gewerk`,
   `jeGewerkGefuehrt`), behalten Kennung und Besetzung – die Umstellung läuft
   bei jeder neuen Fassung. Eine neue Stammdatenfassung ersetzt die
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
| „Die Funktion „…“ gibt es bereits.“ | `src/bereiche/planlauf/pages/Funktionen.tsx`, `src/bereiche/planlauf/pages/projekt/RollenFunktionen.tsx` | Das Gewerk führt die Bezeichnung schon – projektübergreifend bzw. im Projekt (ohne Rücksicht auf Groß- und Kleinschreibung; geprüft nur, wenn sich Bezeichnung oder Gewerk ändern). |
| „„…“ ist bereits angelegt.“ | `src/bereiche/planlauf/components/GewerkDialog.tsx` | Gewerk mit diesem Namen existiert schon. |
| „Das Planverzeichnis führt … – zum Plan lässt es sich erst machen, wenn es keine mehr führt (im Plan ein anderes Planverzeichnis oder „– Einzelplan –“ wählen).“ | `src/bereiche/planlauf/pages/projekt/Plaene.tsx` | Im Dialog eines Planverzeichnisses mit Plänen wurde die Art „Plan“ gewählt; die Wahl wird abgewiesen. |
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
| Blatt unter fremdem Namen, Spalten verschoben | Tritt nicht mehr auf: `xlsxLesen` ordnet die Blätter über die Beziehung `r:id` aus `xl/_rels/workbook.xml.rels` ihren Namen aus `workbook.xml` zu – die Nummer im Dateinamen `sheet<n>.xml` sagt nichts über die Reihenfolge der Mappe; nur wenn die Zuordnung fehlt oder nicht passt, gilt wie früher die Nummer. Blätter ohne Zellen (Ziel außerhalb `xl/worksheets/`) bleiben außen vor. Eine Zelle ohne Zellbezug `r` folgt auf die vorige Zelle der Zeile. |
| Postleitzahl ohne führende Null | Tritt nicht mehr auf: `xlsxLesen` liest die Zahlenformate aus `xl/styles.xml` (`nullenFormate`) und füllt ganze Zahlen in Zellen mit einem Format nur aus Nullen (mindestens zwei Stellen, etwa `00000` – Excels Sonderformat „Postleitzahl“) auf diese Stellenzahl auf. |
| Hinweise je Zeile: „Eintrag mit dieser Bezeichnung ist bereits vorhanden“, „Planpaket ‚…‘ wird angelegt“, „Workflow ‚…‘ ist nicht hinterlegt – es gilt der im Dialog gewählte“, „Bezeichnung kommt in der Datei mehrfach vor“, „Planverzeichnis ‚…‘ wird angelegt“, „Planverzeichnis ‚…‘ startet seinen Planlauf“, „Gewerk ‚…‘ wird angelegt“, „Funktion ‚…‘ wird angelegt“, „ersetzt … in dieser Funktion“, „Name mehrfach im Projekt – ohne E-Mail nicht zuzuordnen, die Person wird neu angelegt“, „Anschrift unvollständig (ohne Straße oder Ort) – die bisherige bleibt“, „Funktion steht weiter unten mit einer anderen Person – es gilt die letzte Zeile“ | Kein Fehler: Die Vorschau nennt, was beim Übernehmen geschieht. |

### Sicherung einspielen

| Meldung | Ursache |
| --- | --- |
| „Die Datei ist keine gültige JSON-Datei.“ | Die gewählte Datei lässt sich nicht als JSON lesen (`sicherungLesen`). |
| „Die Datei ist eine Sicherung der Baubetriebsplanung – bitte dort einspielen.“ bzw. „Die Datei ist eine Sicherung der Projektsteuerung – bitte dort einspielen.“ | Das JSON trägt das Kennzeichen `"bereich": "baubetrieb"` bzw. `"bereich": "projektsteuerung"`. |
| „Die Datei ist keine Sicherung des Planlaufmanagements.“ | Das JSON enthält keine Liste `projects`. |
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
| Hinweis „Neue Fassung von KaPlan verfügbar“ mit „Neu laden“ und „Später“ | Kein Fehler: Die veröffentlichte `fassung.json` nennt eine andere Kennung als das laufende Programm (`useNeueFassung` in `src/shared/pwa.ts`, geprüft beim Start, bei Rückkehr ins Fenster und alle fünf Minuten; `src/shell/NeueFassung.tsx`). „Später“ blendet den Hinweis für diese Fassung aus. Der Hinweis liegt mit `z-index: 80` unter der aufgeklappten mobilen Seitenleiste und unter Dialogen; seine Höhe setzt er als `--neue-fassung-hoehe`, damit Meldungen (`.toast-wrap` in `src/shared/global.css`) über ihm erscheinen und der Inhalt (`.content`, auf dem Startbildschirm `.start`) unten um diese Höhe mehr Abstand erhält – so lassen sich auch die letzten Bedienelemente einer Seite über ihn hinaus scrollen. |
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
  notfalls der Titel – `anmeldungBezeichnung`), `titel` (Titel der Anmeldung,
  in BBPNeo „Titel“), `bbk` (Mitwirkender BBK, auch mehrere Namen),
  `anmelder` (Anmelder; aus dem BBPNeo-Import oder von Hand),
  `bbpProjektnummer` (Projektnummer laut BBPNeo), `kmRunde` (`KmRunde`
  `'N-2'` | `'N-1'` | `null`, `KM_RUNDE_LABEL`: „KM N-2 (2. KP)“, „KM N-1
  (3. KP)“) und `geaendertAm` (Tag der letzten Änderung der Merkmale – gesetzt
  von `updateAnmeldung` und `terminSetzen` im Store, nur bei einer tatsächlichen
  Änderung: `updateAnmeldung` vergleicht feldweise mit dem bisherigen Stand,
  `unterscheidet`; ohne Änderung bleibt der Bestand unverändert). „Speichern“
  in „Anmeldung bearbeiten“ (`src/bereiche/baubetrieb/components/AnmeldungDialog.tsx`)
  prüft das vorab ebenso (beide Stände über `bauzeitraumAbgleichen`) und ruft
  `updateAnmeldung` samt Meldung „Anmeldung gespeichert.“ nur bei einer
  Änderung auf; sonst schließt es den Dialog nur. Das Feld „KM-Runde“ (Auswahl
  mit „– automatisch (Ril_KM) –“) steht dort nur in Workflows, deren Status
  mit Ril_KM rechnen (`rechnetMitRilKm`), oder wenn die Anmeldung eine KM-Runde
  hat. `Einstellungen.bbpStatus` (`BbpStatusZuordnung`, je `BbpPhase` `km`
  bzw. `kkm` der Status aus BBPNeo → Status-ID oder `null`) hält die
  Statuszuordnung des BBPNeo-Imports; Vorgabe `bbpStatusVorgabe()` in
  `src/bereiche/baubetrieb/domain/workflow.ts` (7.5).
* Sachstand (`sachstand` in `src/bereiche/baubetrieb/domain/ablauf.ts`): Datum
  und Anlass des jüngsten Eintrags im Verlauf (fachliches Datum; Anlass
  „Statuswechsel“, „Angelegt“ oder der Text des Vermerks, etwa „Nachgehakt“)
  oder `geaendertAm` mit „Merkmale geändert“, was später liegt; bei gleichem
  Tag gilt der Verlauf.
* Schlüssel `baubetrieb-planung.data.v1` im `localStorage`
  (`src/bereiche/baubetrieb/store/storage.ts`), `DATEN_VERSION = 11`.
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
  der Workflows und im gespeicherten Vorstand) – Anmeldungen der Art A_Vor_N-2
  bzw. A_Vor_N-1 erhalten dabei `kmRunde` `'N-2'` bzw. `'N-1'`, sofern keine
  gesetzt ist (`RUNDE_BIS_FASSUNG5`) –, Fristbezug und
  Richtlinienfrist `pze` heißen `mkm`, die Prozessphase des ersten
  Anmeldetermins `mkm` bzw. `kkm`; Fassung 6 (`ausFassung6`) führte je Projekt
  eine geplante Sperrzeit (`bauzeitVon`/`bauzeitBis`) – daraus werden die
  betroffenen Fahrplanjahre (`fahrplanjahre`, über `fahrplanjahreZwischen`,
  höchstens zehn); Fassung 7 (`ausFassung7`) kannte keine Zuständigkeit – die
  Status der Standard-Workflows erhalten die Vorgabe der mitgelieferten, die
  übrigen die Vorgabe ihrer Art (`ZUSTAENDIG_NACH_ART`); `vorhaben` und `bbk`
  der Anmeldungen ergänzt `aufbereiten()` leer; Fassung 8 kannte `anmelder`
  und `geaendertAm` nicht – `aufbereiten()` ergänzt sie leer; Fassung 9
  (`ausFassung9`) führte `bfStrecke` und `gewerk` – sie entfallen und gehen im
  `titel` auf („Bf/Strecke – Gewerk“, leere Teile fallen weg);
  `bbpProjektnummer`, `kmRunde` und `einstellungen.bbpStatus` ergänzt
  `aufbereiten()` (leer bzw. Vorgabe, `bbpStatusAufbereiten`); Fassung 10
  (`ausFassung10`) kannte keine Entscheidungen – Status der Standard-Workflows
  übernehmen die mitgelieferte `entscheidung`, sofern ihre Nachfolger alle
  Antworten enthalten, die übrigen erhalten `null` (`entscheidungAufbereiten`).
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
  `src/bereiche/baubetrieb/domain/ablauf.ts` (dort auch `statusUebernehmen` für
  den BBPNeo-Import; der gespeicherte Vorstand `AnmeldungStand` enthält seit
  Fassung 10 auch den `titel`), der Import über `bbpImportieren`
  (`bbpImportAnwenden`, 7.5), Duplizieren über
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
| `#/baubetrieb/termine` | Termine & Nachhaken (`src/bereiche/baubetrieb/pages/Termine.tsx`) | Alle Anmeldungen mit Terminfrist über alle nicht archivierten Projekte (`useArchivierte`, Abschnitt 9; ebenso ausstehende Erstanmeldungen und Anmeldebedarf), gegliedert nach Projekt; Filter Alle / Überfällig / Fällig / Im Plan / Zum Nachhaken, Suche; je Zeile „Nachgehakt“ (bei Status zum Nachhaken) und „Status ändern“ (Haken, siehe 7.3); je Projekt zuerst eine Zeile „Erstanmeldung ausstehend“ (`ausstehendeErstanmeldungen`) mit „Ausstehend“, Terminfrist und „Zum Projekt“ – sie zählt in den Filtern mit. Darunter „Anmeldebedarf aus den Projekten“. |
| `#/baubetrieb/projekte` | Projekte (`src/bereiche/baubetrieb/pages/Projekte.tsx`) | Karten mit MIC-Projektnummer, Bezeichnung, Bemerkung (falls vorhanden), Status der Betreuung, ★-Markierung und „Auch in“; Suche auch über DB-G-Nummer, Projektleiter und Hauptbearbeiter; „Neues Projekt“ (`ProjektDialog`; Bezeichnung, MIC-Projektnummer, DB-G-Nummer, Projektleiter und Hauptbearbeiter gehen ohne Leerzeichen am Rand in den Bestand – die Nummer verknüpft das Projekt über das Register mit den anderen Bereichen). Darunter „Archiv“ und „Projekte aus anderen Bereichen“ mit „Übernehmen in Baubetriebsplanung“ (siehe 9.3). |
| `#/baubetrieb/import` | Import aus BBPNeo (`src/bereiche/baubetrieb/pages/BbpImport.tsx`), Menüpunkt zwischen „Projekte“ und „Einstellungen“ | Karten „Datei“ und „Vorschau“ mit „Verwerfen“ und „Importieren“; siehe 7.5. |
| `#/baubetrieb/projekt/<id>` | Projekt (`src/bereiche/baubetrieb/pages/ProjektDetail.tsx`) | „Excel“, „Bearbeiten“, „Archivieren“ (`ArchivKnopf`, 9.3; fehlt bei einem archivierten Projekt), „Löschen“ (samt Anmeldungen; nur in diesem Bereich; die Rückfrage endet mit „Die Anmeldung lässt sich nicht wiederherstellen.“ bzw. „Die Anmeldungen lassen sich nicht wiederherstellen.“ und dem Hinweis aus `useLoeschHinweis`, 9.3); Archivhinweis mit „Aus dem Archiv holen“ (9.3); Stammdaten; am Ende die Karte „Projektbeteiligte“ mit den geteilten Beteiligten (`RegisterBeteiligte`, 9.3); ohne Anmeldung (Anmeldeleichen zählen nicht) die Karte „Erstanmeldung ausstehend“ (`ErstanmeldungKarte`) mit Prozessphase, Terminfrist samt Ampel und Herkunft der Frist (`ERSTANMELDUNG_GRUND`), ohne Frist „Projekt bearbeiten“; Überschrift „Baubetriebliche Anmeldungen“ mit Suche („ID, Titel, BBK, Status …“; auch über Anmelder, Projektnummer und Bemerkung) und „Neue Anmeldung“; darunter je Workflow eine Tabelle (`AnmeldungenTabelle`) mit den Spalten Anmeldung (im SKM der Vorhabenname, darunter tVE-Nr; in der zweiten Zeile die Maßnahmenart – nur, wo der Workflow mehrere führt –, die KM-Runde und der Titel), Sperrzeitraum, Status (ohne Workflow davor), Zuständig (`zustaendigText`: Rolle des Status samt Namen), Terminfrist (Ampelpunkt, Datum, Abstand; Regel im Tooltip), Sachstand (`SachstandKompakt` in `src/bereiche/baubetrieb/components/common.tsx`: Datum, darunter Abstand – „heute“, „gestern“, „vor … Tagen“ – und Anlass; alles im Tooltip) und „Status ändern“ (Haken, siehe 7.3; Tabellenklasse `bb-anmeldungen` – scrollt die Tabelle quer, bleibt die Haken-Spalte rechts stehen, `position: sticky` in `src/bereiche/baubetrieb/components/baubetrieb.css`; dort führt die stehende Spalte auch den Fokusrahmen der Zeile weiter). Die Zeile öffnet die Anmeldung per Klick oder – als Tab-Halt, `alsKlickZeile` – mit Enter bzw. Leertaste; „Status ändern“ und sein Menü lösen sie nicht aus. Jede Zeile umfasst höchstens zwei Textzeilen (`EINZEILIG` kürzt mit Auslassungspunkten). Workflows ohne Anmeldung zeigen nur die Kopfzeile mit „keine Anmeldung“; bei einer Suche entfallen Workflows ohne Treffer. Die frühere Karte zum Anmeldebedarf je Fahrplanjahr entfällt. |
| `#/baubetrieb/projekt/<id>/anmeldung/<id>` | Anmeldung (`src/bereiche/baubetrieb/pages/AnmeldungDetail.tsx`) | Weg durch die Workflows; Karte „Workflow …“ mit den Status des aktuellen Workflows in ihrer Reihenfolge – erreichte mit „zuletzt erreicht am …“, der aktuelle mit Terminfrist samt Rechenweg und den Nachfolgern („Weiter mit:“ – der Wechsel in eine Anmeldeleiche in Rot –, „Übernahme in neue Phase:“, „Abschluss:“ mit „Eintrag löschen“), „Nachgehakt …“, „Termin festlegen …“ (`src/bereiche/baubetrieb/components/TerminDialoge.tsx`: „Festlegen“ mit Datum meldet „Termin festgelegt.“; ein geleertes Feld hebt einen von Hand gesetzten Termin auf – „Terminfrist wird wieder berechnet.“, wie „Wieder berechnen“ –, ohne solchen Termin bleibt der Dialog offen mit „Bitte einen Termin angeben.“), „Letzten Wechsel zurücknehmen“, dazu „Zuständig:“ mit Rolle und Namen; Karte „Merkmale“ („Vorhabenname“ im SKM und wo er gesetzt ist, die Nummer als „tVE-Nr“ – bei älteren SKM-Einträgen ohne Vorhabenname weiter „Begriff / tVE-Nr“ –, „KM-Runde“ (falls gesetzt), „Titel“, „Mitwirkender BBK“, „Anmelder“, „Projektnummer (BBPNeo)“, Herkunft bzw. „Aufgeteilt in“); Karte „Statusverlauf“; oben rechts „Bearbeiten“, „Duplizieren“ (Kopie mit aktuellem Stand und Statusverlauf, Vermerk „Dupliziert aus …“, „(Kopie)“ an der führenden Bezeichnung; öffnet die Kopie) und „Löschen“. |
| `#/baubetrieb/workflows` | Workflows (`src/bereiche/baubetrieb/pages/Workflows.tsx`) | „Weg einer Anmeldung“; Karte „Workflows“ mit je Workflow einer Karte (`bb-wf-liste-karte`): Kennzeichen „Standard“ bzw. „Eigener Workflow“, Beschreibung, Standardverlauf als Punktkette (`AblaufVorschau` in `src/bereiche/baubetrieb/components/AblaufVorschau.tsx`, mit „+ … Abweichungen“), Zahl der Status, Abweichungen und Anmeldungen, Sperrzeitraum und Maßnahmenarten, „Öffnen“ (auch Klick auf die Karte), „Duplizieren“ und – bei eigenen Workflows ohne Anmeldungen – Löschen; „Neuer Workflow“; Übersicht der Richtlinienfristen nach Phase (`rilFristenNachPhase`) mit „Anpassen“. Editor siehe 7.3. Die frühere Adresse `#/baubetrieb/workflow` zeigt dieselbe Seite. |
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
* Editor (`WorkflowEditor` in `src/bereiche/baubetrieb/components/WorkflowEditor.tsx`,
  Gestaltung in `src/bereiche/baubetrieb/components/workflowEditor.css`, Präfix
  `bb-wf-`): grafischer Vollbild-Editor wie im Planlaufmanagement (dort
  unverändert), über ein Portal an `document.body`, die Seite dahinter `inert`.
  Kopf: „Workflow bearbeiten“ bzw. „Neuer Workflow“, Name (Feld „Name des
  Workflows“), Kurzbezeichnung · Sperrzeitraum · Anmeldungen, Kennzahl mit der
  Zahl der Status, der Entscheidungen und der Abweichungen, „Rückgängig“/„Wiederholen“ (Strg+Z, Strg+Y bzw.
  Strg+Umschalt+Z; Tippen in einem Feld zählt als ein Schritt), „Übersicht“
  (schmal), „Status hinzufügen“ – ein `AufklappMenue` mit „Status“ („Ein Schritt
  im Ablauf mit Terminfrist und Zuständigkeit“) und „Entscheidung“ („Verzweigt
  je nach Antwort, z. B. Ja / Nein“); sein Titel nennt die Stelle: „Hinter „…““,
  „Vor „…“ im Standardverlauf“ bzw. „Am Ende des Standardverlaufs“ –, Schließen; Fuß:
  „Vollständig“ bzw. „… Hinweise“, Entscheidungen, Abweichungen und Übernahmen, „Abbrechen“
  (mit Änderungen „Änderungen verwerfen?“ – „Verwerfen“/„Weiter bearbeiten“),
  „Speichern“. Bei Standard-Workflows ein Hinweis über der Fläche
  („Mitgelieferter Standard-Workflow: …“).
* Gliederung in `src/bereiche/baubetrieb/domain/workflowGraph.ts` (`gliedern`):
  Standardverlauf vom ersten Status über den jeweils ersten Nachfolger; er endet
  (`VerlaufEnde`) mit einer Übernahme in einen anderen Workflow, „Eintrag
  löschen“, einer Schleife, am Ziel (Status der Art `genehmigt`) oder offen.
  Abweichungen per Breitensuche (mit `anker` im Standardverlauf), auch ab
  Status, in die andere Workflows übernehmen (`einstiege`); übrige unter
  „Nicht erreichbar – kein Nachfolger führt zu diesen Status“. Arbeitsfläche:
  Spalten „Standardverlauf“ (Startknoten „Neu angelegt“, Endknoten etwa
  „Genehmigt – Ziel des Workflows“, „Übernahme in …“, „Eintrag gelöscht“,
  „Schleife zurück zu …“, „Workflow endet hier“) und „Abweichungen“; Linien
  zwischen Karten als SVG aus gemessenen Positionen (orange Abweichung, lila
  Rücksprung); Übernahmen und „Eintrag löschen“ als Text auf der Karte
  (`fremdZielText`); bei Entscheidungen die Frage auf der Karte (sonst
  „Entscheidung“) und die Antworten (`Kante.text`) an Verbinder und Linien bzw.
  vor dem Text auf der Karte; Kennzeichen „Nachhaken“, „… Anmeldungen“,
  „Einstieg aus …“; „+“ zwischen Karten („Status hier einfügen“, `einfuegen`) – nach einem
  genehmigten Status am Ziel ohne „+“. Bis 820 px untereinander, Details als
  Blatt von unten; bis 1279 px Details als Schublade. Escape gilt zuerst dem
  offenen Menü „Status hinzufügen“ (das `AufklappMenue` schließt sich selbst,
  der Editor bleibt offen), dann Blatt bzw. Schublade, erst danach dem Editor.
* Entscheidungen (`Entscheidung` in `src/bereiche/baubetrieb/domain/types.ts`,
  `WorkflowStatus.entscheidung`: `frage` und `antworten` je Ziel eines
  Nachfolgers; vorbelegt „Ja“, „Nein“, dann „Antwort …“, `STANDARD_ANTWORTEN`,
  `antwortVorgabe`): Die Bearbeitungen in `workflowGraph.ts` (`einfuegen`,
  `entfernen`, `nachfolgerErsetzen`, `nachfolgerHinzufuegen`,
  `nachfolgerEntfernen`, `antwortSetzen`, `typSetzen`, `duplizieren`) führen
  die Antworten mit; `workflowKopie` und `nachfolgerBereinigen`
  (`src/bereiche/baubetrieb/domain/workflowPflege.ts`) ebenso. Die
  Standard-Workflows (`standardWorkflows`, `jaNein`) sehen Entscheidungen bei
  „Angemeldet“ („Genehmigt?“), „Mitwirkung BBK“ („Stimmt die BBK zu?“),
  „Zugestimmt“ im KKM („Fristgerecht angemeldet?“) und den Änderungen
  („Änderung genehmigt?“) vor.
* Statusdetails (Karte gewählt): „Karte … von …“ mit Vor/Zurück, „Status
  bearbeiten“ bzw. „Entscheidung bearbeiten“, Bezeichnung, „Typ“ („Status“ /
  „Entscheidung“, `typSetzen`), bei Entscheidungen „Frage“, Art (`STATUS_ART_LABEL`), „Zuständig“ (MIC, BBK,
  Projektleitung DB oder „– niemand –“), Terminfrist (`FRIST_TYP_LABEL`:
  „Keine Terminfrist“, „Frist laut Richtlinie“, „Nächster Stichtag (TT.MM.)“,
  „Nachhak-Termin nach Statuswechsel“; der Bezug einer Frist laut Richtlinie
  nach Phase gegliedert, `RIL_BEZUG_LABEL` und `RIL_BEZUG_PHASE`, Kurzform mit
  `fristRegelText`), „Termin dient zum Nachhaken“ (bei der Terminfrist
  „Nachhak-Termin nach Statuswechsel“ gesetzt und gesperrt, mit dem Zusatz
  „(bei einem Nachhak-Termin immer)“; der Wechsel auf diese Fristart setzt
  `nachhaken` mit), Bemerkung; „Wie geht es
  weiter?“ mit den Nachfolgern (Auswahl „Dieser Workflow“, „Übernahme in …“,
  „Eintrag löschen (endgültig)“; der erste mit „Standardverlauf“, die übrigen mit
  „Als Standardverlauf“, `alsStandard`) und „Nachfolger hinzufügen …“ – bei
  Entscheidungen je Antwort ein Textfeld mit „→ Weiter mit“ und „Antwort
  hinzufügen – führt zu …“;
  „Einstieg aus anderen Workflows“; bei belegten Status „Anmeldungen“;
  „Reihenfolge“ (`verschieben`; der erste ist der Startstatus), „Duplizieren“
  (`duplizieren`) und „Entfernen“ (`entfernen`: wer zum Status führte, führt zu
  dessen erstem Nachfolger; gesperrt bei Status mit Anmeldungen). Übersicht
  (ohne Auswahl): Kurzbezeichnung, Beschreibung, Sperrzeitraum (gesperrt,
  solange Anmeldungen im Workflow stehen), Maßnahmenarten, Kacheln, „Hinweise“
  (`pruefen`: fehlender Name, kein Status, keine Maßnahmenart, Status ohne
  Bezeichnung, Entscheidungen mit leerer Antwort und belegte entfallende Status
  sperren das Speichern; nicht erreichbare Status, unbekannte Nachfolger,
  Entscheidungen mit weniger als zwei Antworten und Anmeldeleichen ohne „Eintrag
  löschen“ sind nur Hinweise) und „So lesen Sie das Bild“. Speichern prüft
  zusätzlich `belegteEntfallendeStatus`; Nachfolger auf entfallene Status
  werden in allen Workflows entfernt. „Duplizieren“ eines Workflows
  (`workflowKopie`) hängt „(Kopie)“ an Name und Kurzbezeichnung.
* „Status ändern“ (`NachfolgerAuswahl` in
  `src/bereiche/baubetrieb/components/common.tsx`, Haken gestaltet in
  `src/bereiche/baubetrieb/components/baubetrieb.css`, Präfix `bb-`) ist ein
  Haken wie der Erledigt-Haken des Planlaufmanagements und bietet nur die
  Nachfolger des aktuellen Status an (`nachfolgerVon`): Mit einem Nachfolger
  wählt der Haken ihn direkt (Tooltip „Status ändern: …“), mit mehreren öffnet
  er ein Menü „Welcher Status folgt?“ – bei einer Entscheidung mit ihrer Frage
  als Titel (`nachfolgerFrage`) und den Antworten vor den Zielen, „… → …“
  (`nachfolgerText`, auch auf der Seite der Anmeldung, deren Zeile
  „Weiter mit:“ dann die Frage nennt) – („Eintrag löschen“ in Rot) – das
  gemeinsame `AufklappMenue` (`src/shared/menue.tsx`, Abschnitt 2.4: bleibt im
  Fenster, Tastatur, schließt mit Escape, Tab, Klick daneben oder Scrollen).
  Die Wahl öffnet den Dialog des Statuswechsels.
* Statuswechsel im Dialog `src/bereiche/baubetrieb/components/StatusWechselDialog.tsx`:
  Datum, Bemerkung (aus einer Entscheidung steht die Antwort samt Frage im
  Kopf des Dialogs und vor der Bemerkung im Statusverlauf), beim Eintritt in
  eine Änderungsabstimmung ÄAbst-Nr und
  AnnexVII; bei einem Wechsel in einen anderen Workflow (`istUebernahme`)
  Maßnahmenart und je Zeile Anmelde-ID, Titel und Sperrzeitraum, mit
  „Weitere Anmeldung“ zur Aufteilung (weitere Einträge erhalten `herkunftId`;
  ein leerer Titel übernimmt den des Eintrags).
  Der Wechsel in eine Anmeldeleiche ist ein gewöhnlicher Statuswechsel mit
  Hinweis („Die Anmeldung bleibt als Anmeldeleiche rot gekennzeichnet im
  Projekt stehen …“). Erst „Eintrag löschen“ (`LOESCHEN`) fragt „Anmeldeleiche
  löschen?“ (bzw. „Anmeldung löschen?“, wenn ein eigener Workflow das Löschen
  aus einem anderen Status erlaubt) und löscht den Eintrag samt Verlauf.
* Terminfrist (`terminfrist` in `src/bereiche/baubetrieb/domain/fristen.ts`):
  von Hand festgelegter Termin (`terminManuell`, gilt bis zum nächsten
  Wechsel), sonst nach der Fristregel des Status. Richtlinienfristen aus
  `rilFristen`; welche gilt, entscheidet `rilSchluesselFuer`: Ril_KM nimmt die
  Frist der `kmRunde`, wenn sie gesetzt ist (Rechenweg „Prozessphase 2. KP“
  bzw. „Prozessphase 3. KP“), sonst die
  N-2-Frist, solange sie am Tag des Statuswechsels nicht verstrichen ist und
  nicht vor dem ersten Anmeldetermin des Projekts abzüglich `CA_TOLERANZ_TAGE`
  liegt, danach die N-1-Frist (`kmGrundFuerN1`; der Rechenweg nennt den Grund),
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
* Nachhaken: Ob der Termin eines Status zum Nachhaken dient, sagt
  `dientZumNachhaken` (`src/bereiche/baubetrieb/domain/workflow.ts`): wenn der
  Status so gekennzeichnet ist (`nachhaken`) – und immer, wenn seine Terminfrist
  ein Nachhak-Termin ist (`frist.typ === 'nachhaken'`). Danach richten sich das
  Kennzeichen „Nachhaken“ im Workflow-Editor und `nachhaken` der berechneten
  Frist (`src/bereiche/baubetrieb/domain/fristen.ts`). `nachgehakt` im Store
  (`src/bereiche/baubetrieb/store/store.tsx`) schreibt in den Statusverlauf die
  Notiz, ohne sie „Nachgehakt“, bei neuem Termin gefolgt von „neuer Termin …“
  mit dem Datum als TT.MM.JJJJ (`formatDate`).
* Ril_KKM in Wochen vor Sperrbeginn fällt auf den Mittwoch an oder vor
  diesem Datum (`rilDatum` mit `stichtagMittwoch`); der Rechenweg nennt
  „(Stichtag Mittwoch)“.

### 7.4 Übergreifende Bedienelemente

* Seitenleiste: Übersicht, „Termine & Nachhaken“ (mit der Zahl überfälliger
  Fristen – ohne archivierte Projekte), Projekte, „Import aus BBPNeo“ und die aufklappbare Gruppe „Einstellungen“ mit
  „Workflows“ und „Fristen“ (wie im Planlaufmanagement; aufgeklappt, sobald
  eine der beiden Seiten offen ist), darunter die markierten Projekte; unten „Angemeldet als“ (gemeinsam für alle Bereiche, Abschnitt 10;
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

### 7.5 Import aus BBPNeo

* Seite `BbpImport` in `src/bereiche/baubetrieb/pages/BbpImport.tsx`, Route
  `{ view: 'import' }` (`#/baubetrieb/import`, `src/bereiche/baubetrieb/lib/router.ts`),
  Menüpunkt „Import aus BBPNeo“ (Symbol `importieren`) zwischen „Projekte“ und
  „Einstellungen“ in `src/bereiche/baubetrieb/App.tsx`; Kopfzeile „Import aus
  BBPNeo“ mit „Anmeldungen im KM und KKM aus dem Excel-Export von BBPNeo“.
  Karte „Datei“ („Excel-Export der Anmeldungen aus BBPNeo (.xlsx)“) mit Ablagefläche
  „Excel-Export aus BBPNeo hierher ziehen“ (`.drop-zone` mit `alsKnopf`,
  Dateien `.xlsx`, `.csv`, `.txt`, gelesen mit `tabelleLesen` aus
  `src/shared/xlsxLesen.ts`). Als Export gilt ein Blatt mit den Überschriften
  „Anmeldung::ID“, „Anmeldung::Fachstatus-ID“ und „Anmeldung::Prozessphase“
  (`istBbpBlatt`); bei mehreren solchen Blättern die Auswahl „Tabellenblatt“.
* Reine Funktionen in `src/bereiche/baubetrieb/domain/bbpImport.ts`:
  `BBP_SPALTEN` (Feld, Lage im Export „Anmeldung (OS)“ – A, F, G, L, P, Q, AC,
  AG, AH, AJ – und Überschriften, über `spaltenZuordnen`); `bbpLesen` fasst
  die Zeilen je Anmelde-ID zusammen (`anmeldeIdSchluessel`: „Anmeldung-131437“
  = „131437“; frühester Beginn, spätestes Ende über `datumLesen`, ohne
  Uhrzeit; sonst die erste Angabe) und überspringt „Vorlage“ (`istVorlage`),
  andere Prozessphasen als „2. KP“, „3. KP“ und „KKM“ (`prozessphaseLesen`:
  KM N-2, KM N-1, KKM) sowie Zeilen ohne Anmelde-ID; fehlende übrige Spalten
  nennt `fehlend`. `massnahmenartLesen` ordnet die Maßnahmenart zu („B (S)“ →
  B(S)).
* `bbpPlanen` rechnet die Vorschau: je Anmeldung `neu`, `aktualisiert`,
  `unveraendert` oder `uebersprungen` (Status ohne Zuordnung, kein Projekt
  gewählt), die Statusliste der Datei (`statusZiel`, auch bei abweichender
  Groß-/Kleinschreibung) und die Projektgruppen nach Projektnummer
  (`projektGruppen`: Zellen „Projektnummern“, die eine gemeinsame Nummer
  verbindet, bilden eine Gruppe – ihr Schlüssel ist der der ersten Zelle, ihre
  Projektnummer nennt alle Nummern; verbindet eine Zelle zwei verschiedene
  Projekte des Bestands, bleibt jede Zelle für sich; Treffer
  über die DB-G-Nummer, ohne „G“, Punkte und Leerzeichen verglichen; Vorgabe:
  Treffer, sonst mit Projektnummer `NEUES_PROJEKT` mit Bezeichnung aus dem
  Anfang des Titels, ohne Nummer `KEIN_PROJEKT`). Vorhandene Anmeldungen
  derselben ID (`aktualisieren`): erst `statusUebernehmen` (Statuswechsel mit
  Datum des Imports, Text „Import BBPNeo (Status in BBPNeo: …)“, Vorstand zum
  Zurücknehmen; auch ohne Nachfolger-Beziehung), dann die Merkmale
  (`merkmaleUebernehmen` – leere Angaben der Datei überschreiben nichts) mit
  `geaendertAm`. Neue Anmeldungen beginnen im zugeordneten Status mit dem
  Verlaufseintrag „Aus BBPNeo importiert (Status in BBPNeo: …)“, neue Projekte
  tragen die Bemerkung „Beim Import aus BBPNeo angelegt.“.
* `bbpImportAnwenden` plant im `mutate()` gegen den aktuellen Bestand neu und
  wendet an; Kennungen vergibt der Store vorab (`bbpIdBedarf`, `BbpIds`). Die
  Zuordnung der Status der Datei wird in `einstellungen.bbpStatus` gemerkt.
* Oberfläche: Kennzahlen „… neu“, „… aktualisiert“ (mit „davon … mit neuem
  Status“), „… unverändert“, „… übersprungen“; Abschnitte „Status zuordnen“
  („Die Zuordnung gilt auch für den nächsten Import.“, Auswahl je Status mit
  „– nicht importieren –“), „Projekte“ (nur mit neuen Anmeldungen; Auswahl
  „– nicht importieren –“, „+ Neues Projekt anlegen“, „Vorhandene Projekte“,
  dazu die Bezeichnung des neuen Projekts) und „Anmeldungen“ (Anmeldung mit
  Phase und Titel, Sperrzeitraum „aus … Zeilen“, Status in BBPNeo → KaPlan,
  Ergebnis); darunter aufklappbar „Übersprungen: …“ – alles in der Karte
  „Vorschau“ (Untertitel „Blatt „…““) mit „Verwerfen“ (leert die Seite) und
  „Importieren“ oben und unten. „Importieren“ ist gesperrt, solange nichts neu
  oder zu aktualisieren ist; danach die Meldung „Import aus BBPNeo: …“ (7.6),
  die auch über der Seite stehen bleibt (mit „Zu den Projekten“), und die Seite
  ist für die nächste Datei leer.

### 7.6 Meldungen

| Meldung | Fundstelle | Ursache |
| --- | --- | --- |
| „Bitte eine Bezeichnung angeben.“ | `src/bereiche/baubetrieb/pages/Projekte.tsx` | Projekt ohne Bezeichnung. |
| „Bitte einen Workflow wählen.“ | `src/bereiche/baubetrieb/components/AnmeldungDialog.tsx` | Neuanlage ohne Workflow mit Status. |
| „Das Ende des Sperrzeitraums liegt vor dem Beginn.“ | `src/bereiche/baubetrieb/components/AnmeldungDialog.tsx` | Sperrzeitraum einer Anmeldung verkehrt. |
| „Bitte das Fahrplanjahr wählen.“ | `src/bereiche/baubetrieb/components/AnmeldungDialog.tsx` | Eintrag in einem Workflow mit ganzem Fahrplanjahr ohne Fahrplanjahr. |
| „Ohne Beginn des Sperrzeitraums lässt sich die Terminfrist nach Richtlinie nicht berechnen.“ | `src/bereiche/baubetrieb/components/AnmeldungDialog.tsx` | Hinweis bei tagesscharfen Anmeldungen ohne Beginn des Sperrzeitraums. |
| „Die Datei enthält keinen Export der Anmeldungen aus BBPNeo – erwartet werden die Spalten „Anmeldung::ID“, „Anmeldung::Fachstatus-ID“ und „Anmeldung::Prozessphase“.“ | `src/bereiche/baubetrieb/pages/BbpImport.tsx` | Kein Blatt der Datei ist ein Export der Anmeldungen. |
| „… Erwartet wird der Excel-Export der Anmeldungen aus BBPNeo (.xlsx).“ | `src/bereiche/baubetrieb/pages/BbpImport.tsx` | Datei nicht lesbar (Meldung von `tabelleLesen` davor). |
| „Die Datei enthält keine Spalte für … – diese Angaben bleiben bei neuen Anmeldungen leer und bei vorhandenen unverändert.“ | `src/bereiche/baubetrieb/pages/BbpImport.tsx` | Hinweis: Spalten außer Anmelde-ID, Status und Prozessphase fehlen. |
| „Import aus BBPNeo: …“ | `src/bereiche/baubetrieb/pages/BbpImport.tsx` | Kein Fehler: Ergebnis des Imports, durch Kommas getrennt nur die Teile, die vorkommen – „… neu“, „… aktualisiert“ (dazu „… mit neuem Status“), „… unverändert“, „… übersprungen“, „neues Projekt“ bzw. „neue Projekte“. |
| „Bitte das Datum des Statuswechsels angeben.“ | `src/bereiche/baubetrieb/components/StatusWechselDialog.tsx` | Datum geleert. |
| „Bitte einen Termin angeben.“ | `src/bereiche/baubetrieb/components/TerminDialoge.tsx` | „Termin festlegen“: Datum leer und kein von Hand gesetzter Termin, der aufzuheben wäre. |
| „Terminfrist wird wieder berechnet.“ | `src/bereiche/baubetrieb/components/TerminDialoge.tsx` | Kein Fehler: „Wieder berechnen“ bzw. „Festlegen“ mit geleertem Datum hebt den von Hand gesetzten Termin auf. |
| „Bitte je Eintrag das Fahrplanjahr wählen.“ | `src/bereiche/baubetrieb/components/StatusWechselDialog.tsx` | Übernahme in einen Workflow mit ganzem Fahrplanjahr ohne Fahrplanjahr. |
| „Das Ende eines Sperrzeitraums liegt vor dem Beginn.“ | `src/bereiche/baubetrieb/components/StatusWechselDialog.tsx` | Übernahme mit verkehrtem Sperrzeitraum. |
| „Anmeldeleiche gelöscht.“ / „Anmeldung gelöscht.“ | `src/bereiche/baubetrieb/components/StatusWechselDialog.tsx` | Kein Fehler: „Eintrag löschen“ aus der Anmeldeleiche bzw. aus einem anderen Status. |
| „Bitte einen Namen angeben.“ | `src/bereiche/baubetrieb/components/WorkflowEditor.tsx` | Workflow-Editor: Speichern ohne Namen. |
| „Der Workflow braucht mindestens einen Status.“ / „Status … hat keine Bezeichnung.“ / „Bitte mindestens eine Maßnahmenart wählen.“ | `src/bereiche/baubetrieb/domain/workflowGraph.ts` | Sperrende Hinweise (`pruefen`); „Speichern“ meldet den ersten und wählt den Status bzw. die Übersicht. |
| „Bei der Entscheidung „…“ fehlt der Text einer Antwort.“ | `src/bereiche/baubetrieb/domain/workflowGraph.ts` | Sperrender Hinweis. |
| „Die Entscheidung „…“ hat …“ („keine Antwort“ bzw. „nur eine Antwort“, „– sie braucht mindestens zwei.“) | `src/bereiche/baubetrieb/domain/workflowGraph.ts` | Hinweis ohne Sperre. |
| „„…“ wird nie erreicht – kein Nachfolger führt dorthin.“ / „„…“ hat einen Nachfolger, den es nicht mehr gibt – er entfällt beim Speichern.“ / „Aus der Anmeldeleiche „…“ führt kein „Eintrag löschen“.“ | `src/bereiche/baubetrieb/domain/workflowGraph.ts` | Hinweise ohne Sperre. |
| „„…“ kann nicht entfallen – darin stehen noch Anmeldungen.“ | `src/bereiche/baubetrieb/components/WorkflowEditor.tsx` | Sperrender Hinweis: Beim Speichern entfiele ein Status, in dem noch Anmeldungen stehen. |
| „Der Status lässt sich nicht entfernen – darin …“ („steht noch eine Anmeldung“ bzw. „stehen noch … Anmeldungen“) | `src/bereiche/baubetrieb/components/WorkflowEditor.tsx` | „Entfernen“ bei einem belegten Status (der Knopf ist dann ohnehin gesperrt). |
| „Status entfernt – „Rückgängig“ holt ihn zurück.“ | `src/bereiche/baubetrieb/components/WorkflowEditor.tsx` | Kein Fehler. |
| „Der Sperrzeitraum lässt sich nicht umstellen, solange Anmeldungen in diesem Workflow stehen.“ | `src/bereiche/baubetrieb/components/WorkflowEditor.tsx` | Schutz beim Speichern; das Auswahlfeld ist in diesem Fall ohnehin gesperrt. |
| „Die Datei ist keine gültige JSON-Datei.“ | `src/bereiche/baubetrieb/store/storage.ts` | Einspielen einer Datei, die kein JSON ist. |
| „Die Datei ist eine Sicherung des Planlaufmanagements – bitte dort einspielen.“ | `src/bereiche/baubetrieb/store/storage.ts` | Das JSON enthält `projects`. |
| „Die Datei ist eine Sicherung der Projektsteuerung – bitte dort einspielen.“ | `src/bereiche/baubetrieb/store/storage.ts` | Kennzeichen `"bereich": "projektsteuerung"`. |
| „Die Datei ist keine Sicherung der Baubetriebsplanung.“ | `src/bereiche/baubetrieb/store/storage.ts` | Kennzeichen `bereich` fehlt oder Listen fehlen. |
| „Die Sicherung stammt aus einer neueren Fassung von KaPlan. Bitte die Seite neu laden (Strg+Umschalt+R) und erneut einspielen.“ | `src/bereiche/baubetrieb/store/storage.ts` | `version` größer als `DATEN_VERSION`. |
| „Die Sicherung konnte nicht gelesen werden.“ | `src/bereiche/baubetrieb/store/storage.ts` | `migriere` scheitert an der Datei (etwa Felder falscher Art). |
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
  entfällt. Ändert sich dabei der Wert, unter dem die Person bei
  „Verantwortlich“ steht, zieht `werMitziehen` ihn in den Aufgaben mit (8.4).

### 8.2 Routen

| Route | Seite | Aktionen |
| --- | --- | --- |
| `#/projektsteuerung` bzw. `#/projektsteuerung/uebersicht` | Übersicht (`src/bereiche/projektsteuerung/pages/Uebersicht.tsx`) | `routeToHash` liefert für die Übersicht `#/projektsteuerung`; `#/projektsteuerung/uebersicht` bleibt gültig. Nur eigene To-Dos (`eigeneTodos` in `src/bereiche/projektsteuerung/domain/punkte.ts`): offene Aufgaben der Protokolle – Einträge vom Typ A und Ergänzungen mit eigener Art „Aufgabe“ (`protokollAufgaben`) –, deren „Verantwortlich“ Kürzel oder Namen der angemeldeten Person nennt – aus den Teilnehmenden, verknüpft oder gleichen Namens, oder aus ihrem Eintrag in der Projektbeteiligtenliste; Kürzel und Name aus der Liste gelten nur, wenn sie im Protokoll niemand anderes führt – wer nur dieselbe Funktion und damit dasselbe Kürzel hat, sieht die Aufgaben der anderen Person nicht als eigene (`eigeneZuordnungen`; Groß- und Kleinschreibung zählen nicht). Ein Eintrag zählt nur als Aufgabe, solange eine nicht gestrichene mitlaufende Zeile sie trägt (`protokollAufgaben` in `src/bereiche/projektsteuerung/domain/protokoll.ts`). Steht der Name in keiner Projektbeteiligtenliste der angezeigten Projekte (`angemeldetBeteiligt`), nennt ein Hinweis „Angemeldet als“. Kacheln „Aktive Projekte“, „Meine To-Dos“, „Überfällig“, „Demnächst fällig“. Karte „Meine To-Dos“, Filter Alle / Überfällig / Fällig, zunächst zehn Zeilen (`ANZAHL_PUNKTE`), je Zeile „Erledigt“ (Store `punktErledigen`, auch für Ergänzungen); ein Klick führt zum Protokoll (`punktZiel`). Karte „Projekte“ mit Beteiligten, Protokollen, letzter Besprechung, nächstem Termin, eigenen To-Dos („To-Dos“, „Überfällig“) und „Protokolle“. Angezeigt werden markierte Projekte, ohne Markierung alle (`sichtbareProjekte`), archivierte (Abschnitt 9) in keinem Fall. |
| `#/projektsteuerung/projekte` | Projekte (`src/bereiche/projektsteuerung/pages/Projekte.tsx`) | Projektkarten mit Nummer, Projektname, Beschreibung (falls vorhanden), Status, ★-Markierung und „Auch in“; „Neues Projekt“ (`ProjektDialog`: Projektnummer, Status, Projektname, Beschreibung). Darunter „Archiv“ und „Projekte aus anderen Bereichen“ mit „Übernehmen in Projektsteuerung“ (siehe 9.3). |
| `#/projektsteuerung/funktionen` | Funktionen (`src/bereiche/projektsteuerung/pages/Funktionen.tsx`) | Reiter „Übergreifend“ und je Gewerk, **+** legt ein Gewerk an (`GewerkDialog` in `src/bereiche/projektsteuerung/components/GewerkDialog.tsx`). Je Seite die Funktionen mit Suche (ohne Treffer „Keine Funktion gefunden“ mit „Für diese Suche gibt es keinen Treffer.“ und ohne Knopf zum Anlegen; bei leerer Seite ohne Suche „Keine Funktionen“ mit „Neue Funktion“) und Spalten Kürzel, Gewerk, Beschreibung, „Verwendet“; „Neue Funktion“ und Bearbeiten per Klick auf die Zeile oder über den Knopf „Funktion bearbeiten“ vor „Funktion löschen“ (`FunktionDialog` in `src/bereiche/projektsteuerung/components/FunktionDialog.tsx`: Bezeichnung, Gewerk mit „Gewerk“ zum Anlegen, Kürzel – leer aus der Bezeichnung gebildet, `kuerzelAus` –, Farbe, Beschreibung); auf Gewerkseiten „Vorhandene Funktion“ (Funktion eines anderen Gewerks übernehmen, Kürzel nach `kuerzelFuer`) und „Gewerk „…“ löschen“ (`GewerkLoeschenDialog`, entfernt das Gewerk samt Funktionen). Funktionen und Gewerke, die Projektbeteiligte tragen, lassen sich nicht löschen. |
| `#/projektsteuerung/projekt/<id>/<seite>` | Projekt (`src/bereiche/projektsteuerung/pages/ProjektDetail.tsx`) | Kopfzeile mit Nummer, Status, Beschreibung, „Bearbeiten“, „Archivieren“ (`ArchivKnopf`, 9.3; fehlt bei einem archivierten Projekt) und „Löschen“ (samt Beteiligten und Protokollen; nur in diesem Bereich – die Rückfrage nennt „… aus der Projektsteuerung gelöscht.“, bei Protokollen dazu „Die Protokolle lassen sich nicht wiederherstellen.“, und den Hinweis aus `useLoeschHinweis`, 9.3), darunter ggf. der Archivhinweis mit „Aus dem Archiv holen“ (9.3). Seiten `beteiligte` („Projektbeteiligte“) und `protokolle` („Protokolle“); die frühere Seite `lop` führt zu `protokolle`, ohne gültige Angabe `beteiligte`. Siehe 8.3 und 8.4. |
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
(„Berger, Anna“ oder „Anna Berger“). Gibt es daneben eine Spalte „Vorname“,
ist „Name“ der Nachname und wird nicht zerlegt; steht dort doch der volle
Name, bleibt nur der Nachname. Funktionen über `funktionFinden`
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
  und `.json`-Dateien des Protokoll-Tools: `protokollToolLesen` prüft jede
  Datei für sich (Meldung je Datei), `ausProtokollTool` bildet die Protokolle
  aller gewählten Dateien gemeinsam ab – so bleibt „weitergeführt in“ auch
  erhalten, wenn die Protokolle einer Reihe in einzelnen Dateien stehen; steht
  ein Protokoll in mehreren Dateien, gilt das zuletzt gelesene. Teilnehmende
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
  Karte „Kopfdaten“ (Besprechung, Nr., Datum – beide als `PflichtFeld`: die
  Eingabe bleibt im Feld stehen, übernommen wird nur eine Nummer ab 1 bzw. ein
  vollständiges Datum, beim Verlassen zeigt das Feld wieder den gespeicherten
  Wert –, Beginn, Ende, Ort, „Nächster
  Termin“, „Protokollführung“ aus Teilnehmenden oder Projektbeteiligten,
  „Verteiler (zusätzlich)“); Karte „Teilnehmende“ („Aus Beteiligtenliste …“
  mit Mehrfachauswahl und „Neue Person …“, „Weitere Person“ für Gäste,
  Status aus `TEILNAHME`; das Personensymbol nimmt Gäste in die
  Projektbeteiligtenliste auf); „Tagesordnung“ („TOP hinzufügen“,
  verschieben – „TOP nach oben“, „TOP nach unten“; der Tastaturfokus bleibt am
  Knopf des verschobenen TOP, ist er gesperrt, am Gegenknopf, wie bei den
  Einträgen –, löschen; Einträge mit Umschalter I/F/A, „Nach oben“ und „Nach
  unten“ – am Anfang bzw. Ende eines TOP in den vorigen bzw. nächsten TOP
  (`eintragVerschieben` in `src/bereiche/projektsteuerung/domain/protokoll.ts`) –, Verantwortlich als
  Auswahl aus den Teilnehmenden – Kürzel und Name, gespeichert wird das
  Kürzel, führen es im Protokoll mehrere, der Name (`zuordnung`) –, bei Aufgaben Termin und „erledigt“); Karte
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
  Nummer des Vorprotokolls. Wird ein Protokoll gelöscht (`protokollLoeschen`),
  gelten die von ihm weitergeführten Aufgaben im Vorprotokoll wieder als offen
  – außer ein späteres Protokoll führt sie schon weiter (`weitergefuehrtIn`):
  Dann verweist das Vorprotokoll auf dieses, und die Rückfrage „Protokoll
  löschen?“ endet statt mit „gelten im Vorprotokoll wieder als offen.“ mit
  „laufen in … weiter.“
* „Verantwortlich“ folgt den Personen: Ändert sich der Wert, unter dem eine
  teilnehmende Person geführt wird – eigenes Kürzel, Kürzel oder Wechsel ihrer
  Funktion, Name, Abgleich mit dem Projektregister –, oder kommt jemand mit
  einem schon geführten Kürzel hinzu bzw. geht, zieht `werMitziehen`
  (`src/bereiche/projektsteuerung/domain/protokoll.ts`; aus
  `teilnehmerNachziehen` und bei Änderungen im Protokoll aus dem Store)
  „Verantwortlich“ der Einträge und Ergänzungen samt Vorständen mit. Stehen
  bleibt, was nicht zu entscheiden ist – ein Wert, den mehrere führten und
  nicht alle gleich ablösen – und was jemand im Protokoll an Name oder Kürzel
  eines Gastes (ohne Eintrag in der Projektbeteiligtenliste) tippt.
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
  Abschnitt 10; `einstellungen.bearbeiter` und `einstellungen.farbmodus`
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
| „Die Sicherung konnte nicht gelesen werden.“ | `src/bereiche/projektsteuerung/store/storage.ts` | `migriere` scheitert an der Datei (etwa Felder falscher Art). |
| Seite „Nicht gefunden“ | `src/bereiche/projektsteuerung/App.tsx` | Adresse nennt ein Projekt oder Protokoll, das es nicht (mehr) gibt. |

## 9. Projektregister

### 9.1 Projektregister

Das einzige, was sich die Bereiche teilen, liegt in `src/gemeinsam/`:

* `src/gemeinsam/register.ts`: `Register` mit `projekte` (`RegisterProjekt`:
  `nummer`, `name`, `beschreibung`, `angelegtAm`, `geaendertAm`, `bereiche` mit je
  einer `Mitgliedschaft`: `id` des Projekts im Bereich, `archiviert`, `offen` für
  eine noch nicht vollzogene Übernahme), `personen` (`RegisterPerson` mit den
  `PERSON_FELDER` Anrede, Vorname, Nachname, Firma, Kürzel, E-Mail, Telefon,
  Mobil, Anschrift, Notiz, `funktionen` als `FunktionsBezug` – Bezeichnung,
  Gewerk, Kürzel – und `ids` je Bereich) und `geloescht` (`Grabstein` mit den
  Bereichen, die eine Löschung noch nachziehen müssen). `ProjektBereich` ist
  `'planlauf'`, `'baubetrieb'` oder `'projektsteuerung'` (`PROJEKT_BEREICHE`,
  `BEREICH_TITEL`); `andereBereicheVon(bereich)` liefert die jeweils anderen.
  Archiviert ist ein Projekt nur je Bereich (`istArchiviert`, `archivierteIds`).
  Schlüssel `kaplan-projektregister.v1` im `localStorage`, `REGISTER_VERSION = 3`.
  Lässt sich der gespeicherte Stand
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
  Fehlschlag wieder in der Konsole. `useRegisterSpeicherZustand` und
  `useRegisterZustand` liefern beides für den Hinweis in den Bereichen (9.4).
* Fassung 3 (ohne die Bereiche Leistungsnachweise und Controlling):
  `aufbereiten()` ergänzt fehlende Felder und stellt ältere Stände beim Laden
  um. Es übernimmt Mitgliedschaften der Projekte sowie Kennungen der Personen
  und Löschvermerke (`idsAufbereiten`) nur für die drei Bereiche aus
  `PROJEKT_BEREICHE` – die der Leistungsnachweise entfallen, ebenso die früheren
  Felder `markiert` der Mitgliedschaft (★-Spiegel) sowie `archiviert` und
  `herkunft` des Projekts. War ein Projekt für alle Bereiche archiviert
  (`archiviert` am Projekt, bis Fassung 2), gilt jede seiner Mitgliedschaften als
  archiviert. Projekte ohne verbleibende Mitgliedschaft entfallen samt ihren
  Personen, Löschvermerke ohne verbleibenden Bereich ebenfalls. Vor der
  Umstellung legt `laden` den gespeicherten Text einmalig als Rohkopie
  `kaplan-projektregister.v1.vor-fassung-<n>` ab (n = gespeicherte Fassung, ohne
  Angabe 0; nur, wenn es die Kopie noch nicht gibt und der Speicher reicht).
  `laden` schreibt den umgestellten Stand nicht selbst; das tut der nächste
  Aufruf von `registerAendern` mit einer Änderung.
* Ein Fenster lädt das Register neu, wenn ein anderes es speichert
  (`storage`-Ereignis). Hält es Änderungen, die sich nicht speichern ließen,
  trägt es sie auf den neuen Stand nach und speichert erneut
  (`eigeneAenderungenNachziehen`, reine Funktion: eigener Stand gegen `basis`,
  je Projekt bzw. Person über die Kennung und darin je Feld – Mitgliedschaften
  je Bereich und Feld –; bei Widerspruch gilt die eigene Änderung, eine
  Löschung geht jeder Änderung vor, Personen ohne Projekt entfallen;
  Löschvermerke: die fremden ohne die hier erledigten, dazu die hier neuen).
  Neu Eingetragenes wird nicht nachgezogen: Was ein Bereich neu eingetragen hat
  – Projekte, Personen –, steht in seinem Bestand, und sein nächster Abgleich
  trägt es wieder ein, verknüpft mit einem Projekt gleicher Nummer bzw. einer
  Person gleicher E-Mail aus dem fremden Stand (was in diesem
  Fenster sonst an einem solchen Projekt geändert wurde, etwa eine Übernahme in
  einen weiteren Bereich, entfällt dabei). Hat eine Seite ein Projekt bzw.
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
  in den Bereichen, 9.4). Schreiben zwei Fenster sonst im selben Augenblick, gilt
  der zuletzt geschriebene Stand.
* `registerAendern` ändert das Register über eine Funktion und benachrichtigt
  nur bei einer tatsächlichen Änderung (bzw. wenn sich das Ergebnis des
  Speicherns ändert); `useRegister` liefert es für die Oberfläche
  (`useSyncExternalStore`).
* Funktionen gelten bereichsübergreifend als dieselben, wenn Bezeichnung und
  Gewerk übereinstimmen (`funktionsSchluessel`).
* Der frühere Schlüssel der Leistungsnachweise, `leistungsnachweise.data.v1`,
  kommt im Code nicht mehr vor: Ein dort gespeicherter Bestand wird weder gelesen
  noch geändert. Rohkopien (`<Schlüssel>.vor-fassung-<n>`,
  `<Schlüssel>.vor-einspielen-<Zeitpunkt>`) räumt `nachRaeumenSpeichern` bei
  vollem Speicher dagegen für jeden Schlüssel (`rohkopienZumRaeumen` in
  `src/shared/speicher.ts`).

### 9.2 Abgleich mit den Bereichen

* `src/gemeinsam/useRegisterAbgleich.ts`: Jeder Store
  (`src/bereiche/planlauf/store/store.tsx`, `src/bereiche/baubetrieb/store/store.tsx`,
  `src/bereiche/projektsteuerung/store/store.tsx`)
  gleicht nach jeder Änderung seines Bestands und jeder Änderung des Registers ab – außer
  einem aus einem anderen Fenster nachgeladenen Stand (siehe unten, *Mehrere Fenster*) –, alle drei nur
  bei `ladeZustand === 'ok'`. Zuerst überträgt `uebertragen`
  (`src/gemeinsam/abgleich.ts`) die Änderungen des Bereichs (alter gegen neuen
  Stand) ins Register, dann trägt `abgleichen` Unbekanntes ein und liefert einen
  `Plan`, den der Store über sein eigenes `mutate()` übernimmt. Nach
  `ersetzeDaten` und `zuruecksetzen` meldet der Store `ersetzt()`: Dann entfällt
  das Übertragen, und für verknüpfte Projekte und Personen gilt das Register.
* Vollständig gleicht `abgleichen` (Parameter `vollstaendig`) nur beim ersten
  Abgleich nach dem Laden (Ref `erstmals` in `useRegisterAbgleich`) und nach
  `ersetzt()` ab: Nur dann löst es Mitgliedschaften von Projekten, die der
  Bereich nicht mehr führt. Sonst meldet das allein `uebertragen` (gelöscht,
  wenn das Projekt im alten Stand vorkam und im neuen fehlt). So
  kommen zwei Fenster mit verschiedenen Ständen zur Ruhe. Die ★-Markierung der
  Bereiche steht nicht im Register.
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
  `src/bereiche/baubetrieb/domain/register.ts`, `src/bereiche/projektsteuerung/domain/register.ts`):
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
* Beim ersten Abgleich verknüpft `abgleichen` ein Projekt mit einem
  Registerprojekt gleicher Projektnummer, das der Bereich noch
  nicht führt (ohne Nummer: gleicher Bezeichnung) – auch mit einem, das in
  anderen Bereichen archiviert ist –, und darin Personen gleicher
  E-Mail-Adresse, ersatzweise gleichen Vor- und Nachnamens. Ebenso verknüpft es
  eine offene Mitgliedschaft (zur Übernahme vorgesehen) mit einem noch nicht
  verknüpften eigenen Projekt gleicher Nummer, statt ein zweites anzulegen.
  An beiden Stellen führt `stammdatenZusammenfuehren` die Stammdaten zusammen:
  Leere Angaben des Registers füllt der Bereich, sonst gilt das Register; eine
  abweichende Bezeichnung oder Beschreibung des Bereichs hängt es als Vermerk an
  die Beschreibung des Registerprojekts („Bezeichnung in … vor der
  Zusammenführung: …“ – der Name in Anführungszeichen – bzw. „Beschreibung in …
  vor der Zusammenführung: …“, mit dem Titel des Bereichs). Vermerkzeilen zählen beim Lückenfüllen nicht als
  Beschreibung, gleiche Vermerke entstehen nicht doppelt.
* Führt ein Bereich ein Projekt nicht mehr, entfällt seine Mitgliedschaft; ohne
  weitere Mitgliedschaft – auch keine offene – entfällt das Projekt samt
  Personen auch im Register (`mitgliedschaftLoesen`). Löscht ein
  Bereich eine Person, entfernt das Register sie und vermerkt die Löschung für
  die anderen Bereiche.
* Unmittelbar auf dem Register arbeiten nur zwei Aktionen, beide reine
  Funktionen in `src/gemeinsam/abgleich.ts` und aufgerufen über
  `registerAendern` (9.3): `inBereichUebernehmen` trägt eine offene
  Mitgliedschaft ein, die der Bereich beim nächsten Abgleich anlegt;
  `bereichArchivieren(register, bereich, lokaleId, archiviert)` setzt den
  Archivstand der Mitgliedschaft über die Kennung des Projekts im Bereich und
  liefert ohne Änderung dasselbe Register zurück.

### 9.3 Bedienelemente in den Bereichen

Bausteine in `src/gemeinsam/ProjektBereiche.tsx` (Gestaltung in
`src/gemeinsam/gemeinsam.css`, Präfix `gem-`):

* `BereichsMarken` unten in jeder Projektkachel: „Auch in“ mit den anderen
  Bereichen des Projekts (`andereBereicheVon`), als „… · archiviert“ bzw.
  „… · vorgesehen“ (Tooltip „Zur Übernahme vorgesehen – wird beim nächsten
  Öffnen des Bereichs angelegt“).
* `FremdeProjekte`: grau hinterlegter Abschnitt „Projekte aus anderen
  Bereichen“ mit den Registerprojekten, die der Bereich nicht
  führt (mit der Suche der Projektliste gefiltert) – ohne die, die in allen
  ihren Bereichen archiviert sind; die Projektlisten der drei Bereiche zeigen
  ihn nur bei `ladeZustand === 'ok'`, sonst sähe das Register eine Übernahme
  vor, die der Bereich nicht anlegt –, je Karte Nummer,
  Bezeichnung (ohne sie „Ohne Bezeichnung“), Beschreibung (falls vorhanden),
  „Geführt in“ mit den Bereichen des Projekts und „Übernehmen in …“
  (`inBereichUebernehmen`, Kennung im Bereich = die des Registerprojekts).
* `ArchivKnopf`: „Archivieren“ im Projekt (Tooltip „Nimmt das Projekt in diesem
  Bereich aus Übersicht und Seitenleiste – es bleibt erhalten“) – im
  Planlaufmanagement in der Karte „Projekt archivieren“ („Nimmt das Projekt aus
  Übersicht und Seitenleiste – es bleibt erhalten und lässt sich zurückholen“)
  der Projekteinstellungen (`src/bereiche/planlauf/pages/projekt/Einstellungen.tsx`;
  die Karte steht nur, wenn `useArchivierbar` gilt),
  in der Baubetriebsplanung (`src/bereiche/baubetrieb/pages/ProjektDetail.tsx`)
  und in der Projektsteuerung (`src/bereiche/projektsteuerung/pages/ProjektDetail.tsx`,
  kleine Fassung `klein`) im Kopf des Projekts zwischen „Bearbeiten“ und
  „Löschen“. Ohne Rückfrage: `registerAendern` mit `bereichArchivieren`, danach
  die Meldung „„…“ archiviert – es steht in der Projektliste unter „Archiv“.“
  Der Knopf erscheint nur, wenn das Register das Projekt im Bereich kennt und
  es dort nicht archiviert ist (`useArchiv`). Der Tastaturfokus geht nach
  „Archivieren“ an „Aus dem Archiv holen“ und umgekehrt (`fokusNachArchiv`:
  Vermerk `'hinweis'` bzw. `'knopf'`, den das erscheinende Element in einem
  Effekt einlöst; erscheint keines, verfällt er nach 500 ms) – sonst fiele er
  mit dem verschwundenen Knopf auf `body`.
* `ArchivHinweis` oben im Projekt eines archivierten Projekts: „Dieses Projekt
  ist in … archiviert. Es erscheint nicht in Übersicht und Seitenleiste.“ mit
  dem Knopf „Aus dem Archiv holen“ (`bereichArchivieren` mit `false`, Meldung
  „„…“ aus dem Archiv geholt.“).
* `ArchivAbschnitt`: aufklappbares „Archiv“ (mit Anzahl) unter der Projektliste
  mit den im Bereich archivierten Projekten; ohne archivierte Projekte fehlt
  er. Sind alle Projekte des Bereichs archiviert, zeigen die Projektlisten der
  drei Bereiche (`src/bereiche/planlauf/pages/Projekte.tsx`,
  `src/bereiche/baubetrieb/pages/Projekte.tsx`,
  `src/bereiche/projektsteuerung/pages/Projekte.tsx`) ohne Suchbegriff statt
  „Kein Projekt gefunden“ den Leerzustand „Kein aktives Projekt“ mit „Alle
  Projekte dieses Bereichs sind archiviert – sie stehen unten unter „Archiv“.“
  (`nurArchivierte`). Eine Suche ohne Treffer ist kein leerer Bestand: Sie
  zeigt in allen drei Listen „Kein Projekt gefunden“ mit „Für diese Suche gibt
  es keinen Treffer.“ ohne den Knopf „Neues Projekt“; trifft sie nur
  archivierte Projekte, „Kein aktives Projekt gefunden“ mit „Für diese Suche
  gibt es nur Treffer im Archiv – sie stehen unten unter „Archiv“.“ Titel und
  Text liefert `useSucheOhneTreffer` (`src/gemeinsam/ProjektBereiche.tsx`); er
  zählt auch die Treffer unter „Projekte aus anderen Bereichen“ (derselbe
  Filter wie `FremdeProjekte`, nur bei geladenem Bestand): Dann heißt es „Kein
  Projekt in diesem Bereich gefunden“ mit „Für diese Suche gibt es nur Treffer
  in anderen Bereichen – sie stehen unten unter „Projekte aus anderen
  Bereichen“.“, bei Treffern im Archiv und in anderen Bereichen „Kein aktives
  Projekt gefunden“ mit „Für diese Suche gibt es nur Treffer im Archiv und in
  anderen Bereichen – sie stehen unten unter „Archiv“ und „Projekte aus
  anderen Bereichen“.“ Den
  Leerzustand mit „Neues Projekt“ gibt es nur ohne Suchbegriff. Archivierte
  Projekte fehlen in Übersicht und Seitenleiste
  (`useArchivierte`, `sichtbareProjekte`). Nach derselben Regel erscheint in
  den Übersichten aller drei Bereiche der Hinweis „Kein Projekt markiert – es
  werden alle angezeigt.“ (im Planlaufmanagement „Kein Projekt markiert – es
  werden alle Projekte angezeigt.“): wenn es nicht archivierte Projekte gibt und
  keines davon markiert ist; archivierte markierte zählen nicht.
* `VerknuepfungsHinweis` im Dialog „Neues Projekt“, wenn die Projektnummer zu
  einem Registerprojekt gehört, das der Bereich nicht führt: „Die
  Projektnummer gehört zu „…““ – ist das Projekt in allen seinen Bereichen
  archiviert, mit dem Zusatz „(dort archiviert)“ –, dann „Beim Anlegen wird es
  damit verknüpft: Bezeichnung und Projektbeteiligte kommen von dort und gelten
  in allen Bereichen.“
* Löschdialoge der Projekte ergänzen bei geteilten Projekten „In … bleibt das
  Projekt mit seinen Projektbeteiligten erhalten.“ (`useLoeschHinweis` mit
  `andereBereiche`: die anderen Bereiche, die das Projekt führen, ohne
  vorgesehene Übernahmen).
* `RegisterBeteiligte`: Karte „Projektbeteiligte“ in der Baubetriebsplanung mit
  Name, Funktion, Firma und Kontakt.

Ein Anlegen, Bearbeiten oder Löschen von Projekten unmittelbar im Register und
ein Zurücknehmen einer vorgesehenen Übernahme gibt es nicht (mehr).

### 9.4 Hinweise zum Projektregister

`RegisterHinweis` (`src/gemeinsam/RegisterHinweis.tsx`, Gestaltung
`.gem-registerhinweis` in `src/gemeinsam/gemeinsam.css`) steht über dem Inhalt
jedes Bereichs – in `src/bereiche/planlauf/App.tsx` als Erstes im
Inhaltsbereich, in `src/bereiche/baubetrieb/App.tsx` und
`src/bereiche/projektsteuerung/App.tsx` unter den Hinweisleisten des Bereichs:

* Ließ sich das Register nicht lesen (`useRegisterZustand` nicht `'ok'`): „Das
  Projektregister ließ sich nicht lesen.“ bzw. „Das Projektregister stammt aus
  einer neueren Fassung von KaPlan.“, je mit „Es bleibt unverändert, und dieser
  Bereich gleicht seine Projekte nicht mit den anderen Bereichen ab.“; bei einer
  neueren Fassung dazu „Seite neu laden“.
* Ließ es sich nicht speichern (`useRegisterSpeicherZustand` nicht `'ok'`, 9.1):
  „Projektregister nicht gespeichert.“ mit dem Grund („Der Speicher des Browsers
  ist voll“ bzw. „Der Browser lässt das Speichern nicht zu (etwa durch
  Datenschutzeinstellungen)“) und „Erneut speichern“ (`registerErneutSpeichern`).
  Gelingt das Speichern – über den Knopf, einen weiteren Schreibzugriff oder
  nachdem ein anderes Fenster gespeichert hat (9.1) –, verschwindet der Hinweis
  mit der Meldung „Projektregister gespeichert.“; fiele der Fokus dabei auf
  `body`, setzt ihn `RegisterHinweis` auf sein eigenes Element
  (`tabIndex={-1}`, Klasse `gem-registeranker` ohne Fokusrahmen – auch, wenn der
  Hinweis schon weg ist). Hat das andere Fenster einen Stand gespeichert, den dieses
  nicht lesen kann, entfallen die Änderungen; statt der Erfolgsmeldung
  erscheint dann „Nicht gespeicherte Änderungen am Projektregister verworfen –
  ein anderes Fenster hat einen Stand gespeichert, den diese Seite nicht lesen
  kann.“

### 9.5 Meldungen

| Meldung | Fundstelle | Ursache |
| --- | --- | --- |
| „„…“ übernommen – mit … Projektbeteiligten.“ bzw. „„…“ übernommen.“ | `src/gemeinsam/ProjektBereiche.tsx` | Kein Fehler: „Übernehmen in …“ in einem Bereich. |
| „„…“ archiviert – es steht in der Projektliste unter „Archiv“.“ | `src/gemeinsam/ProjektBereiche.tsx` | Kein Fehler: „Archivieren“ im Projekt. |
| „„…“ aus dem Archiv geholt.“ | `src/gemeinsam/ProjektBereiche.tsx` | Kein Fehler: „Aus dem Archiv holen“ im Archivhinweis. |
| „Das Projektregister ließ sich nicht lesen. …“ bzw. „Das Projektregister stammt aus einer neueren Fassung von KaPlan. …“ | `src/gemeinsam/RegisterHinweis.tsx` | Gespeichertes Register unlesbar bzw. `version` größer als `REGISTER_VERSION`. |
| „Projektregister nicht gespeichert. …; was die anderen Bereiche von den Projekten wissen müssen (Übernahmen, Archiv, Projektbeteiligte), geht beim Schließen der Seite verloren.“ | `src/gemeinsam/RegisterHinweis.tsx` | Das letzte Speichern des Registers ist gescheitert (`RegisterSpeicherZustand` `'voll'` bzw. `'gesperrt'`, 9.1) – auch nach dem Räumen der Rohkopien. Verschwindet, sobald ein erneuter Versuch gelingt. Speichert ein anderes Fenster das Register, trägt das Fenster seine nicht gespeicherten Änderungen auf dessen Stand nach und versucht es erneut (`eigeneAenderungenNachziehen`); scheitert auch das, bleibt der Hinweis. Ist dessen Stand unlesbar oder aus einer neueren Fassung, entfallen die Änderungen („Nicht gespeicherte Änderungen am Projektregister verworfen – …“). |
| „Das Projektregister lässt sich weiterhin nicht speichern.“ | `src/gemeinsam/RegisterHinweis.tsx` | „Erneut speichern“ ist wieder gescheitert. |
| „Projektregister gespeichert.“ | `src/gemeinsam/RegisterHinweis.tsx` | Kein Fehler: Nach dem Hinweis „Projektregister nicht gespeichert.“ ließ sich das Register wieder speichern. |
| „Nicht gespeicherte Änderungen am Projektregister verworfen – ein anderes Fenster hat einen Stand gespeichert, den diese Seite nicht lesen kann.“ | `src/gemeinsam/RegisterHinweis.tsx` | Während der Hinweis „Projektregister nicht gespeichert.“ stand, hat ein anderes Fenster das Register gespeichert – unlesbar oder aus einer neueren Fassung von KaPlan (`registerZustand`, 9.1). Dessen Stand gilt; neu laden. |

## 10. Angemeldet als – für alle Bereiche

* `src/gemeinsam/benutzer.ts`: `Benutzer` mit `name` und `farbmodus`, Schlüssel
  `kaplan-benutzer.v1` im `localStorage`, Vorgabe `STANDARD_NAME = 'Max
  Mustermann'`. Ohne gespeicherten Stand übernimmt `laden` einmalig den ersten
  selbst eingetragenen Namen samt Farbmodus aus den Beständen des
  Planlaufmanagements, der Projektsteuerung und der Baubetriebsplanung
  (`FRUEHER`; deren Vorgabenamen zählen nicht – auch nicht
  der Demoname „Lena Roth“ der Projektsteuerung).
  `benutzerAendern` ändert Name bzw. Farbmodus für alle Bereiche, `useBenutzer`
  liefert sie der Oberfläche; ein anderes Fenster lädt sie bei einer Änderung neu
  (`storage`-Ereignis).
* Den Farbmodus setzt allein `src/shell/Shell.tsx`: aus `useBenutzer()` in einem
  Layout-Effekt, also vor dem ersten Zeichnen
  (`document.documentElement.dataset.farbmodus`; auf der Bereichsauswahl stets
  `'standard'`). Die `App.tsx` der Bereiche setzen ihn nicht.
* `src/gemeinsam/AngemeldetAls.tsx`: Knopf „Angemeldet als“ unten in der
  Seitenleiste aller Bereiche und Dialog „Angemeldet als“
  (Name, „Farbmodus für Rot-Grün-Sehschwäche (hoher Kontrast)“, ggf. eine
  Einstellung des Bereichs als Haken, „Übernehmen“) mit dem Hinweis „Gilt in
  allen Bereichen von KaPlan. Bis zur Anmeldung über SSO ist dies eine Angabe
  ohne Kennwort; die Daten liegen lokal in diesem Browser.“ Der Dialog öffnet
  sich über ein Portal auf Seitenebene.
* `src/gemeinsam/useBenutzerAbgleich.ts`: Jeder Store zieht Name und Farbmodus
  nach jeder Änderung in seinen Bestand nach (Planlaufmanagement:
  `bearbeiter`; Baubetriebsplanung und Projektsteuerung:
  `einstellungen`).
