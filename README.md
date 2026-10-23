# KaPlan

KaPlan gliedert sich in zwei getrennte Bereiche, zwischen denen der Startbildschirm wählt:

* **Planlaufmanagement** – Verwaltungssoftware für Planläufe: Projekte,
  Planpakete/Pläne/Planverzeichnisse und die Prozessketten, die diese durchlaufen – mit
  Soll-/Ist-Terminen, Fristenüberwachung und vorbereiteten Erinnerungs-E-Mails.
* **Baubetriebsplanung** (erster Entwurf) – Monitor für baubetriebliche Anmeldungen von
  Sperrpausen: Projekte mit ihren Anmeldungen, die anpassbare Workflows je Phase durchlaufen –
  SKM, MKM, KM (n-2 & n-1) und KKM (unterjährig) – mit Terminfristen laut Richtlinie,
  Nachhak-Terminen und dem Anmeldebedarf je Fahrplanjahr.

Die Bereiche arbeiten unabhängig voneinander: eigener Datenbestand, eigener Speicherort im
Browser, eigene Einstellungen, eigener Router. Der Startbildschirm zeigt beide als Kacheln; in einem
Bereich führt **Bereich wechseln** unten in der Seitenleiste zurück. Der Abschnitt
**Funktionsumfang** beschreibt das Planlaufmanagement, der Abschnitt
[**Baubetriebsplanung**](#baubetriebsplanung) den zweiten Bereich.

Dieser Stand ist ein **lauffähiger Prototyp ohne Datenbank**: Alle Daten liegen lokal im Browser
(`localStorage`). Die Anwendung ist responsiv und als PWA installierbar.

Die Software ist auf die Nutzung durch mehrere Personen ausgelegt – alle sehen alle Projekte, und
jede Person stellt in der Seitenleiste ein, wer sie ist (eigene Funktion im Projekt:
**Planlaufmanagement**). Solange die
Daten lokal im Browser liegen, arbeitet allerdings jeder Arbeitsplatz auf einem eigenen Stand; ein
gemeinsamer Datenbestand setzt den nächsten Schritt – die Anbindung einer Datenbank – voraus. Das Datenmodell ist bereits so geschnitten, dass es später ohne Änderungen an
der Oberfläche auf eine relationale Datenbank umgestellt werden kann.

## Logos

Die Logos von KaPlan liegen unter `public/logos/`:

| Datei | Verwendung |
| --- | --- |
| `Logo_Startseite.png` | Startbildschirm (Bereichsauswahl), oben links |
| `Logo_Planlaufmanagement.png` | Kopf der Menüleiste im Planlaufmanagement |
| `Logo_Baubetriebsplanung.png` | Kopf der Menüleiste in der Baubetriebsplanung |
| `Logo.png` | Symbol; daraus sind Favicons und App-Symbole unter `public/icons/` erzeugt |

Zum Austauschen genügt es, die Datei unter gleichem Namen zu ersetzen; die Logos werden nur über
die Breite bzw. Höhe skaliert. Nach einem neuen Symbol müssen die Dateien in `public/icons/`
(`favicon-32/64`, `icon-192/512`, `icon-maskable-512`, `apple-touch-icon`) neu erzeugt und der
Cache-Name in `public/sw.js` hochgezählt werden.

Die Wortmarke Mailänder Consult in der Kopfzeile stammt aus der Datei `public/mailaender-consult.svg`. Die derzeit
hinterlegte Fassung ist mit der Systemschrift nachgezeichnet. Um das Original zu verwenden, genügt
es, diese Datei durch die Originaldatei zu **ersetzen** – gleicher Name, gleicher Ort; eine
PNG-Datei funktioniert ebenso (`public/mailaender-consult.png`, dann in
`src/shared/logos.tsx` die Konstante `MAILAENDER_DATEI` anpassen). Die Anwendung skaliert die
Datei ausschließlich über die Höhe, das Seitenverhältnis bleibt damit unverändert.

## Starten

```bash
npm install
npm run dev      # Entwicklungsserver auf http://localhost:5173
npm run build    # Produktionsbuild nach dist/
npm run preview  # Produktionsbuild lokal ansehen
npm run typecheck
```

Beim ersten Start wird ein Demodatenbestand mit einem Projekt samt Funktionen, Besetzungen, Plänen
und laufenden Planläufen geladen. Über **Zurücksetzen** (unten in der Seitenleiste) lässt sich
dieser Stand jederzeit wiederherstellen, über **Sicherung** der gesamte Bestand als JSON sichern
und über **Einspielen** eine solche Sicherung wieder laden. Vor dem Einspielen nennt eine Rückfrage
Projekte, Pläne und Planläufe der Sicherung und bietet an, den jetzigen Stand vorher zu sichern –
denn er wird vollständig ersetzt. Sicherungen älterer Fassungen werden dabei auf den aktuellen Stand
gehoben. *Angemeldet als* bleibt erhalten, es sei denn, der Name aus der Sicherung wird ausdrücklich
übernommen.

## Veröffentlichen (GitHub Pages)

Veröffentlicht wird über [`.github/workflows/pages.yml`](.github/workflows/pages.yml). Der Workflow
baut bei jedem Push auf `main` (`npm ci`, `npm run build`) und legt den Build an drei Stellen ab:

1. als **GitHub-Pages-Bereitstellung** – greift bei **Settings → Pages → Build and deployment →
   Source: „GitHub Actions“**,
2. im Branch **`gh-pages`** (nur der Build, ohne Verlauf) – für „Deploy from a branch“ mit
   `gh-pages` und `/ (root)`,
3. im Ordner **`app/`** auf `main` – für „Deploy from a branch“ mit `main` und `/ (root)`.

Bei Pull Requests baut der Workflow nur (einschließlich Typprüfung) und veröffentlicht nichts.
Die Seite erscheint unter `https://mailander-consult-gmbh.github.io/MC-Plan/`.

Zu Variante 3: GitHub liefert dabei den Zweig selbst aus. Die `index.html` im Stamm ist die
Einstiegsdatei für die Entwicklung und verweist auf `/src/main.tsx`, das ein Browser nicht ausführen
kann. Ihr kleines Skript wechselt deshalb nach 1,5 Sekunden auf **`app/`**, wo der eingecheckte Build
liegt (direkt erreichbar unter `…/MC-Plan/app/`). Fehlt dieser Build, erscheint statt einer weißen
Seite ein Hinweis. Der fertige Build selbst leitet nie um – auch nicht, wenn er langsam lädt. `app/` wird auf `main` vom Workflow erneuert und nicht von Hand gepflegt; nur wer
einen anderen Zweig über Pages ansehen will, baut dort selbst:

```bash
npm run build
rm -rf app && cp -r dist app
```

Die Quelle muss auf „GitHub Actions“, `gh-pages` oder `main` stehen. Zeigt „Deploy from a branch“
auf einen anderen Zweig, liefert GitHub dessen Stand aus und überschreibt damit auch die
Bereitstellung des Workflows. Mit „Deploy from a branch“ auf `main` laufen beide Wege parallel –
es gilt, was zuletzt fertig wird; eindeutig ist daher „GitHub Actions“.

Die Schreibrechte für die Ablage in `gh-pages` und `app/` fordert der Workflow selbst an
(`permissions: contents: write` im Job `ablage`); die Voreinstellung unter Settings → Actions →
General → Workflow permissions muss dafür nicht geändert werden. Ist `main` gegen direkte Pushes
geschützt, scheitert nur die Ablage in `app/` – der Workflow meldet das als Warnung. Wird der Push
nach `gh-pages` abgewiesen, schlägt der Lauf fehl. Für private Repositories setzt GitHub Pages
einen kostenpflichtigen GitHub-Plan voraus.

Ändert sich die Hülle (Titel, Symbole, Manifest), zusätzlich den Cache-Namen in `public/sw.js`
hochzählen, damit installierte Fassungen die neuen Dateien laden.

Technische Voraussetzung für Unterverzeichnisse: Der Build verwendet `base: './'` (relative Pfade).
Ohne diese Einstellung verweisen die Dateien auf `/assets/…` und die Seite bleibt unter einem
Unterverzeichnis wie `…/MC-Plan/` weiß. Die Navigation arbeitet mit Hash-Adressen (`#/planlauf/fristen`), daher
funktionieren Direktaufrufe und das Neuladen ohne zusätzliche Serverregeln.

## Als App installieren (PWA)

Die Anwendung ist eine installierbare Progressive Web App und läuft nach dem ersten Aufruf auch
ohne Netzverbindung – die Daten liegen ohnehin lokal im Browser.

* **iPhone/iPad (Safari):** Teilen → *Zum Home-Bildschirm*
* **Android (Chrome):** Menü → *App installieren*
* **Desktop (Chrome/Edge):** Installationssymbol in der Adressleiste

Enthalten sind `manifest.webmanifest`, App-Symbole aus `public/logos/Logo.png` (192/512 px, maskable und Apple-Touch-Icon)
sowie ein Service Worker (`public/sw.js`): Seitenaufrufe werden zuerst aus dem Netz geladen – eine
gültige Antwort ersetzt die zwischengespeicherte Startseite, eine Fehlerseite nicht – und
bei fehlender Verbindung aus dem Zwischenspeicher beantwortet, Programmdateien (gehashte Namen unter
`assets/`) kommen direkt aus dem Zwischenspeicher. Logos und Symbole werden wie Seitenaufrufe zuerst
aus dem Netz geladen – ein unter gleichem Namen ausgetauschtes Logo erscheint also sofort. Der Service Worker ist nur im Produktionsbuild aktiv, in der Entwicklung
stört er also nicht.

Die Oberfläche ist durchgehend responsiv: Ab etwa 860 px klappt die Seitenleiste in ein Menü, auf
Telefonbreite stehen die Kennzahlen zweispaltig, Tabellen scrollen quer bzw. werden – wie die
Fristenliste – zu gestapelten Karten, damit die Schaltflächen erreichbar bleiben.

## Funktionsumfang

### Projekte
Anlage und Pflege von Projekten (Projektnummer, Name, Status, Beschreibung). Beim Anlegen werden
die projektübergreifenden Funktionen als Projektfunktionen übernommen. Die E-Mail-Texte gelten
projektübergreifend und werden unter **Vorlagen** in der Seitenleiste gepflegt.

### Funktionen und Gewerke
Im übergeordneten Reiter **Funktionen** werden die projektübergreifenden Funktionen gepflegt –
gegliedert in eine Seite je Gewerk sowie eine Seite **Übergreifend**. Neue Projekte übernehmen sie
automatisch. Mitgeliefert sind die vorgegebenen Funktionen: Planlaufmanagement (PLM), Projektleitung (PL), Fachplaner (FP),
Fachspezialist (FS), Bauvorlageberechtiger (BVB), Bau AN, Bauüberwachung (BÜW), Fachtechnischer
Prüfer (PSV), Prüfstatiker, Vermessungs-, Erdungs-, Schweißtechnischer, Korrosionsschutz-,
Gleisgeometrie- und Geotechnischer Prüfer.

Das **Planlaufmanagement** füllt stets die angemeldete Person mit ihrem Profil (*Angemeldet als*)
aus. Es steht deshalb weder hier noch im Projekt unter **Funktion** zur Bearbeitung, bleibt aber in
den Workflows als Verantwortlicher wählbar.

Übergreifende Funktionen (z.B. Projektleitung) werden im Projekt einmal besetzt; alle übrigen gehören zu einem oder mehreren Gewerken und werden je Gewerk mit einer
eigenen Person belegt – es gibt also z.B. einen Fachplaner je Gewerk. Beim Start eines Planlaufs
setzt die Anwendung die Verantwortlichen **nach dem Gewerk des Plans** ein: Zwei Pläne nach
demselben Workflow, aber mit unterschiedlichem Gewerk, erhalten unterschiedliche Verantwortliche.

Gewerke zur Auswahl: EEA, KIB, LST, OLA, OSE, TK, VA – weitere lassen sich über das **+** an den
Gewerk-Reitern anlegen; sie gelten dann überall.

### Funktion (im Projekt)
Im Vordergrund steht die **Funktion, nicht die Person**: Die Seite ist – wie der projektübergreifende
Reiter *Funktionen* – nach **Gewerken** gegliedert (je Gewerk eine Seite, dazu „Übergreifend“). Je
Funktion steht in der Zeile, wer sie ausfüllt; ein Klick öffnet die Besetzung, in der eine im Projekt
bekannte Person übernommen oder eine neue mit Anrede, Firma, E-Mail, Telefon und Anschrift erfasst
wird. Jede Funktion wird von genau einer Person ausgefüllt; eine Person kann mehrere Funktionen
haben.

Über das **+** an den Gewerk-Reitern entsteht ein weiteres Gewerk, über *Gewerk löschen* am Ende der
Seite verschwindet das gerade geöffnete wieder – der Dialog nennt vorher, welche Funktionen und Besetzungen damit
entfallen. Gewerke gelten projektübergreifend: angelegt oder gelöscht wird überall, also auch im
Reiter *Funktionen* im Hauptmenü, und jedes Gewerk des Projekts steht in der **Planliste** für Pläne,
Planverzeichnisse und Planpakete zur Auswahl – darüber findet ein Planlauf die Verantwortlichen seines Gewerks.
Über *Neue Funktion* entsteht eine weitere Funktion im gewählten Gewerk. Beide Wege führen zum Ziel: **Funktion anlegen und dort die Person
eintragen** oder mit *Person hinzufügen* die **Person erfassen und die Funktion gleich dabei
zuweisen** – die Zuweisung kann offen bleiben und später nachgeholt werden. Personen ohne Funktion –
aus einem Import, nach einem Wechsel oder bewusst ohne Zuordnung – stehen in einer eigenen Liste
darunter; ein Klick weist ihnen eine Funktion zu, das Papierkorb-Symbol rechts löscht sie aus dem
Projekt. Das Planlaufmanagement erscheint auf dieser Seite nicht – es ist immer die angemeldete Person.

**Excel-Import:** Je Zeile *Gewerk · Funktion · Kürzel · Anrede · Vorname · Name · Firma · Telefon ·
Email · Straße · Nr. · PLZ · Ort · Notiz*. Gewerke und Funktionen, die es noch nicht gibt, werden
beim Import angelegt; „Übergreifend“ steht für Funktionen ohne Gewerkbezug. Die Vorschau nennt je
Zeile, was angelegt wird und wen eine Besetzung ersetzt.

### Planliste
Planbestand aus Plänen, Planpaketen und Planverzeichnissen im Reiter **Planliste**. Je Eintrag
werden Plancodierung, Titel, Index (standardmäßig leer), Gewerk (EEA, KIB, LST, OLA, OSE, TK, VA oder
freie Eingabe), Planungsphase (Entwurfs-, Genehmigungs- oder Ausführungsplanung, ebenfalls frei ergänzbar),
der Soll-Termin für den Eingang und eine Bemerkung geführt.

Pläne lassen sich einem **Planpaket oder Planverzeichnis unterordnen**. Wie die Pläne eines
**Planverzeichnisses** laufen, legt das Verzeichnis fest (siehe nächster Abschnitt). In der
Planliste stehen die Pläne eingerückt unter ihrem Verzeichnis und lassen sich am Pfeil zwischen
Nummer und Symbol zuklappen.

**Planpakete** sind ein reines Ordnungsmerkmal ohne eigenen Planlauf – und gliedern die Planliste:
Je Paket steht eine Kopfzeile mit der Zahl seiner Einträge, darunter seine Planverzeichnisse und
Pläne; Einträge ohne Paket folgen – sobald Pakete angezeigt werden – unter **Ohne Planpaket**. Der
Pfeil an der Kopfzeile klappt das Paket zu, ein Klick auf die Zeile öffnet es zum Bearbeiten.
Angelegt werden Pakete über **Neues Planpaket** oder direkt beim Anlegen eines Eintrags. Im Dialog
des Pakets lassen sich unter **Inhalt** Planverzeichnisse und Pläne ohne Verzeichnis hinzufügen und
wieder entfernen – das gilt sofort; Pläne eines Verzeichnisses folgen dem Paket ihres Verzeichnisses.
Wird ein Paket gelöscht, bleiben seine Einträge mit ihren Planläufen erhalten. Die Suche erfasst
auch Name, Kurzzeichen und Gewerk des Pakets. Frühere Adressen der eigenen Seite *Planpakete*
führen auf die Planliste.

**Zu jedem Eintrag mit eigenem Lauf gehört genau ein laufender Planlauf – er startet immer
automatisch.** Er entsteht zusammen mit dem Eintrag: Im selben Dialog werden der Workflow gewählt und
seine Schritte für diesen Lauf angepasst. Ein Planverzeichnis, das beim Anlegen eines Plans über
*+ Neues Planverzeichnis anlegen …* entsteht, fragt Codierung und Titel ab; sein Planlauf startet
mit dem Speichern des Plans (**Anlegen und Planlauf starten**) nach dem Workflow im Dialog, und der
Plan läuft darin mit. Wird der Plan nicht gespeichert oder ein anderes Verzeichnis gewählt, entfällt
das angelegte Verzeichnis wieder. Ebenso startet ein vorhandenes gebündeltes Verzeichnis, das noch
nie einen Planlauf hatte, ihn mit dem ersten Plan, der darin gespeichert wird. Die Planliste führt die Stammdaten – Art, Bezeichnung, Gewerk, Planverzeichnis und Eingang Soll – und
lässt sich über die Spaltenüberschriften sortieren; den Stand der Abläufe zeigt der Reiter
**Planläufe**. Ein Klick auf die Zeile öffnet den Eintrag.

Die Feldbezeichnungen richten sich nach der Art: **Plancodierung** beim Plan, **Name Planpaket**
beim Paket und **Codierung** beim Verzeichnis, wo statt *Index* die **Ausgabe** geführt wird.

**Farbige Bezeichnungen:** Steht in einem Planlauf noch der Schritt **Eingang PLM** aus, ist der
Plan angekündigt, aber noch nicht eingegangen – seine Bezeichnung steht in Planliste und
Planlaufliste **gelb**, in der Planlaufliste trägt er den Status **Angekündigt** (nach ihm lässt sich
auch filtern und sortieren), in der Planliste das Kennzeichen *Angekündigt*. Ist der Eingang
überfällig, lautet der Status **Überfällig**; die Bezeichnung bleibt gelb. Abgeschlossene
Planläufe stehen in **Grün**, abgebrochene grau.

### Planverzeichnisse: gebündelt oder Pläne einzeln
Jedes Planverzeichnis läuft auf eine von zwei Arten:

* **Gebündelt** (Vorgabe): Das Verzeichnis durchläuft den Planlauf, seine Pläne laufen darin mit.
* **Pläne einzeln**: Jeder Plan hat einen eigenen Planlauf; das Verzeichnis ordnet sie nur und
  zeigt – wie ein Planpaket – den aus ihnen zusammengefassten Fortschritt und Status.

Gewählt wird mit dem Haken **„Pläne einzeln durch den Planlauf führen“** im Dialog des Verzeichnisses,
solange weder das Verzeichnis noch seine Pläne einen Lauf haben. Danach geht es über Nachträge weiter:

* **Herauslösen …** – ein Plan erhält einen eigenen Lauf, das Verzeichnis läuft für die übrigen
  gebündelt weiter.
* **Alle Pläne einzeln weiterführen …** – jeder Plan ohne eigenen Lauf erhält einen; der gebündelte
  Lauf endet als „aufgeteilt“.
* **Pläne wieder bündeln …** – die angekreuzten Pläne mit eigenem Lauf kehren in einen gemeinsamen
  Verzeichnislauf zurück, nicht angekreuzte behalten ihren eigenen. Läuft das Verzeichnis noch,
  übernehmen sie dessen Stand; ein Plan, der schon weiter war, fällt dabei zurück (der Dialog weist
  darauf hin). Ist das Verzeichnis aufgeteilt, entsteht ein neuer Verzeichnislauf mit dem Stand
  eines der angekreuzten Pläne – vorgeschlagen ist der am wenigsten weit gediehene.

Beim Herauslösen und Aufteilen übernimmt der Plan den Stand des Verzeichnislaufs: erledigte
Schritte bleiben erledigt, Start und Termine laufen weiter. Aufgeteilte bzw. wieder gebündelte Läufe
gelten nicht als Abbruch. Die Nachträge stehen im Dialog des Verzeichnisses bzw. Plans in der
Planliste, in der Karte **Pläne dieses Verzeichnisses** des Planlaufs und in der Planlaufliste
des Projekts.

Wird ein gebündeltes Verzeichnis gelöscht, bleiben seine Pläne als Einzelpläne im Paket des
Verzeichnisses erhalten; wer bisher mitlief, führt den Stand des Verzeichnislaufs in einem eigenen
Planlauf weiter.

**Excel-Import:** Planlisten lassen sich als `.xlsx` oder `.csv` einlesen. Erwartete Spalten:
*Art · Plancodierung / Name · Index/Ausgabe · Titel · Gewerk · Planungsphase · Planpaket ·
Planverzeichnis · Eingang Soll · Datum Ausgabe · Workflow · Bemerkung* (frühere Schreibweisen wie
*Name PlanVZ* werden weiter erkannt). Genannte, aber noch nicht vorhandene Planpakete und
Planverzeichnisse entstehen beim Import; ein neues Verzeichnis übernimmt das früheste *Eingang Soll*
seiner Pläne. Verweise auf Pakete und Verzeichnisse gelten über Codierung bzw. Kurzzeichen oder
Titel, auch auf Einträge derselben Datei. **Jeder Eintrag mit eigenem Planlauf startet ihn beim
Import** – auch Zeilen ohne Codierung, ein dabei neu angelegtes Planverzeichnis und ein vorhandenes
gebündeltes Verzeichnis, das noch nie einen Lauf hatte: nach dem in *Workflow* genannten Workflow,
sonst nach dem im Dialog unter *Workflow für Einträge ohne Angabe* gewählten. Die Vorschau nennt je
Zeile den Workflow bzw. *läuft im Verzeichnis mit* und weist auf Bezeichnungen hin, die in der Datei
mehrfach vorkommen.

### Planläufe im Projekt
Der erste Reiter eines Projekts, **Planläufe**, zeigt Kennzahlen und die Planlaufliste. Je Eintrag
steht in der Spalte **Aktueller Stand** der zuletzt abgeschlossene Prozessschritt vor dem offenen –
auch nach dem Wiederöffnen eines früheren Schritts –, darunter in Grau sein Erledigungsdatum, und in der Spalte **Nächster Schritt** der offene Schritt mit seiner Frist.
Die Liste ist nach Planpaketen gegliedert; Planverzeichnisse lassen sich am Pfeil vor Symbol und Titel
aufklappen (zunächst zugeklappt). Darunter stehen die Pläne – mitlaufend mit **Herauslösen …**,
herausgelöst mit eigenem Schritt und Status. Ein Verzeichnis mit Plänen einzeln erscheint als
zusammenfassende Zeile mit **Bündeln …**. Abgebrochene Läufe stehen gesammelt am Ende unter einer
eigenen, zunächst zugeklappten Zeile **Abgebrochen**.

Die Planlaufliste lässt sich über die Spaltenüberschriften **sortieren** – nach Bezeichnung, Gewerk,
Datum des aktuellen Stands, Soll-Termin des nächsten Schritts, Zuständigkeit, Fortschritt oder Status
(überfällige zuerst). Ein zweiter Klick kehrt die Richtung um, ein dritter hebt die Sortierung auf. Sortiert wird
innerhalb der Planpakete, die Paketzeilen folgen derselben Spalte.

Die **Kopfzeile der Tabellen bleibt beim Scrollen stehen**, sodass die Spaltenbezeichnungen auch in
langen Listen sichtbar sind.

**Filtern** geschieht in derselben Überschrift: Der Trichter neben *Gewerk*, *Zuständig* und *Status*
öffnet die Auswahl der vorhandenen Werte; der gewählte Wert steht anschließend in der Überschrift.
Die **Suche** über Nummer, Titel und Schritt steht oben in der Kartenzeile neben der Gliederung,
daneben erscheint bei gesetzten Filtern *Filter zurücksetzen*.

### Zuständigkeiten
Ein Schritt nennt eine **Funktion**; wer sie ausfüllt, steht unter **Funktion** des Projekts (das Planlaufmanagement übernimmt stets die angemeldete Person).
Gemeint ist stets die Funktion des Gewerks des Plans – ersatzweise die übergreifende gleichen
Namens. Darum bietet die Auswahl beim Anpassen eines Schritts nur die Funktionen dieses Gewerks und
die übergreifenden an, jede einmal. Die
Zuordnung wird laufend nachgezogen: Wird eine Person erst nach dem Start eines Planlaufs eingetragen
oder wechselt sie während des Projekts, gilt die neue Besetzung sofort auch in laufenden Planläufen.
Bereits erledigte Schritte behalten ihre Person, ebenso Schritte, in denen im Planlauf eine Person
von Hand gewählt wurde.

### Prozessketten
Ein Schritt ist eine **Aufgabe**, eine **Entscheidung** oder **Sonstiges**, hat eine Frist in Tagen und
einen Verantwortlichen (Rolle). Entscheidungen erhalten zwei Antwortmöglichkeiten („Ja“/„Nein“ als
Vorbelegung, frei überschreibbar); weitere lassen sich ergänzen. Je Antwort wird festgelegt, mit
welchem Schritt es weitergeht – mit dem nächsten Schritt, einem beliebigen anderen oder dem Ende des
Laufs.

Zeigt eine Antwort auf einen bereits durchlaufenen Schritt zurück, entsteht eine **Schleife**
(z.B. Überarbeitung nach einer Prüfung): Der Ablauf endet dort nicht, sondern nimmt den genannten
Schritt in einem weiteren Durchlauf erneut auf.

Mitgeliefert sind die drei vorgegebenen Ketten **VVBau ohne Prüfstatik**, **VVBau mit Prüfstatik**
und **VVBau STE** mit ihren Verzweigungen und Rücksprüngen. Die Fristen sind dort nicht vorgegeben
und daher als Erfahrungswerte vorbelegt (z.B. 10 Tage Planerstellung, 3 Tage formale Prüfung,
10 Tage BVB-Freigabe, 15 Tage Fachprüfung); sie lassen sich je Kette und je Planlauf ändern. Schritte,
die in der Vorgabe parallel laufen (etwa die vier Versandschritte nach der Genehmigung), sind
nacheinander abgebildet.

Ketten lassen sich duplizieren und als **Projektvariante** abweichend pflegen. Die eigene Rolle im
Projekt ist **Planlaufmanagement (PLM)**.

### Nachweise: Freigabe- und Prüfbericht-Nummern
Je Schritt lässt sich hinterlegen, welcher Nachweis bei erfolgreichem Abschluss zu erfassen ist:

* **Freigabe-Nr.** – hinterlegt an den BVB-Freigaben (nicht an der Freigabe *zur fachtechnischen
  Prüfung*).
* **Prüfbericht-Nr.** – hinterlegt an den Fachprüfungen; bei Schritten mit prüfender Rolle
  (Erdungs-, Vermessungsprüfer …) wird sie automatisch vorgeschlagen.

Beim Erledigen fragt die Anwendung die Nummer ab – bei Entscheidungen nur, wenn die erste
(zustimmende) Antwort gewählt ist. Die Nummer steht anschließend am Schritt und in beiden
Exportfassungen.

### Prüfer individuell ergänzen
Über **Schritt einfügen** wird ein zusätzlicher Prüfschritt in den laufenden Verlauf eingehängt –
mit Rolle (z.B. Erdungsprüfer), Frist und Nachweis. Die Einfügeposition wird aus dem aktuellen
Verlauf gewählt; die Verkettung wird dabei richtig gesetzt, auch hinter Entscheidungen.

### Planläufe (Soll-/Ist-Termine)
Ein Planlauf ist die laufende Instanz einer Prozesskette für einen Plan oder ein gebündeltes
Planverzeichnis. Beim Start werden die Schritte der Vorlage kopiert und lassen sich **für diesen Lauf**
noch ergänzen, ändern oder entfernen – **individuelle Abweichungen** wirken deshalb nur auf den
jeweiligen Lauf und sind als solche gekennzeichnet.

* **Soll-Termine** werden aus den Fristen gerechnet: Soll = Soll des Vorgängers + Frist. Wahlweise
  in Arbeitstagen (Mo–Fr, ohne hinterlegte Feiertage) oder Kalendertagen.
* Ein Soll-Termin kann **manuell festgesetzt** werden und bildet dann die Basis für alle folgenden
  Schritte.
* Führt eine Antwort zurück auf einen früheren Schritt, beginnt mit dem Erledigen der Entscheidung
  ein **weiterer Durchlauf** ab diesem Schritt; die betroffenen Schritte werden erneut geöffnet und
  als „2. Durchlauf“ gekennzeichnet.
* **Ist-Termine** dokumentieren die Erledigung; Schritte lassen sich auch **überspringen**. Der
  jeweils nächste Schritt wird automatisch aktiv, der Lauf schließt sich, wenn alle Schritte des
  Verlaufs erledigt sind.
* Bei **Entscheidungen** wird die Antwort im Lauf gewählt. Der angezeigte Verlauf folgt dieser
  Antwort; ohne Auswahl der ersten Möglichkeit. Schritte, die nur bei anderer Antwort durchlaufen
  werden, sind unterhalb der Liste aufgeführt.
* Im Planlauf sind die Schaltflächen (Erledigt, Überspringen, Erinnern) nur am **aktuell anstehenden
  Schritt** sichtbar; abgeschlossene Schritte bieten *Wieder öffnen*, und *Anpassen* steht als
  Stiftsymbol rechts an jeder Zeile.
* Ein Lauf kann mit Begründung **abgebrochen** werden – wahlweise **ersatzlos** oder mit **neuem
  Index bzw. neuer Ausgabe**. Im zweiten Fall erhält der Eintrag den angegebenen Index, und der
  Planlauf beginnt mit denselben Schritten von vorn.
* Ein abgebrochener Lauf ist **nicht mehr zu bearbeiten**: In der Planlaufliste steht seine Zeile
  gesammelt am Ende unter **Abgebrochen**, ausgegraut, ohne aktuellen Schritt, Fortschritt und
  Schaltflächen – stattdessen mit seinem eigenen Index und in Grau „Abgebrochen am …“ mit dem
  Zusatz *ersatzlos abgebrochen* bzw. *ersetzt durch Index C*. Er lässt
  sich weiterhin zum Nachschlagen öffnen, bietet dort aber keine Aktionen mehr und erscheint nicht
  in der Fristenliste. In der **Planliste** trägt der Eintrag den entsprechenden Zusatz
  (`Index B → C` bzw. `abgebrochen`).

### Fristen & Erinnerungen
Fristenübersicht über alle Projekte, sortiert nach Dringlichkeit und gefiltert nach
überfällig / fällig / im Plan. Angezeigt wird je Planlauf **nur der aktuell anstehende Schritt**.
Ein Schritt gilt als *fällig*, sobald der Soll-Termin näher liegt als die in den Projekteinstellungen
gepflegte Vorlaufzeit.

Je Schritt öffnet der Button **Erinnern** ein Fenster mit der vorbereiteten E-Mail: Die zur Lage
passende Vorlage (Erinnerung oder Mahnung) wird ausgewählt, die Platzhalter aus Projekt, Plan,
Schritt, Frist und Empfänger ersetzt. Von dort lässt sich die Nachricht in **Outlook** öffnen
(`mailto:`, also das eingerichtete Standardprogramm), in **Outlook im Web** anlegen oder in die
Zwischenablage kopieren; der Zeitpunkt wird am Schritt vermerkt.

### Export je Projekt
Über **Export** im Reiter **Planläufe** (oder in den Projekteinstellungen) lassen sich die Planläufe
eines Projekts ausgeben. Die Auswahl der Einträge ist wie die Planlaufliste gegliedert – je
Planpaket, *Ohne Planpaket* und *Abgebrochen* mit eigenem Haken. Gewählt wird je Planlauf, sodass
ein abgebrochener Vorgänger und der laufende Lauf eines Eintrags getrennt bleiben; ein Verzeichnis
wählt die Pläne unter sich mit, ein mitlaufender Plan sein Verzeichnis. Ist im Reiter *Planläufe*
ein Filter gesetzt, sind die gezeigten Einträge vorgewählt. Zwei Umfänge:

* **Kurzfassung** – als PDF genau die Angaben der Planlaufliste: Aktueller Stand, Nächster
  Schritt, Zuständig, Fortschritt und Status; in Excel nach Planpaket, Plancode, Stand und Frist
  (siehe unten).
* **Langfassung** – je Planlauf zusätzlich alle bereits durchlaufenen und alle ausstehenden
  Schritte mit Verantwortlichen.

Beides jeweils als **Excel** (.xlsx, ohne zusätzliche Programmbibliothek erzeugt) und als **PDF**
über den Druckdialog des Browsers („Als PDF sichern“). Das PDF der Kurzfassung sieht aus wie die
Planlaufliste im Programm – ohne Schaltflächen für E-Mail, Erledigt oder Auf-/Zuklappen.

Die **Kurzfassung in Excel** nennt in A1 das Projekt („Projekt: …“) und in A2 den Stand („Stand:
TT.MM.JJJJ“). Darunter steht je Zeile der Planlaufliste eine Zeile mit den Spalten *Planpaket*
(„ohne Planpaket“, wenn keines) · *Plancode* · *Index/Ausgabe* · *Titel* · *Gewerk* · *Aktueller
Stand* · *Datum* · *Nächster Schritt* · *Frist*. Laufende Planläufe stehen zuerst; abgeschlossene
folgen gesondert unter **Abgeschlossen (n)** grün hinterlegt, abgebrochene unter **Abgebrochen (n)**
grau – jeweils in der Reihenfolge der Liste. Datum und Frist sind echte Excel-Daten; eine fällige
Frist ist orange, eine überfällige rot hinterlegt. Ein mitlaufender Plan nennt in *Aktueller Stand*
das Verzeichnis, in dessen Planlauf er mitläuft; ein abgebrochener Lauf trägt sein Abbruchdatum und
den Zusatz *ersatzlos* bzw. *ersetzt durch Index …*. Die Kopfzeilen bleiben beim Scrollen stehen,
gedruckt wird quer auf Seitenbreite. Die Langfassung in Excel hat je Prozessschritt eine Zeile mit
Planpaket, Planverzeichnis, Art, Codierung, Index, Titel und Gewerk in eigenen Spalten.

Im PDF beider Umfänge und in der Excel-Langfassung sind **nur die Planpakete Überschriften** (dazu
wie in der Liste *Ohne Planpaket* und *Abgebrochen*); Planverzeichnisse folgen der Logik der
Planlaufliste – ein gebündeltes Verzeichnis ist ein Planlauf mit mitlaufenden Plänen, ein
Verzeichnis mit Plänen einzeln fasst diese nur zusammen und hat keine eigene Zeile mit
Schrittangaben.

### Übersicht und Markierung von Projekten
Alle Bearbeiter sehen alle Projekte. Mit ★ markierte Projekte erscheinen in der Übersicht und in der
Seitenleiste (mit vorangestellter Projektnummer); ohne Markierung werden alle angezeigt. Die
Übersicht zeigt Kennzahlen, die eigenen **To-Dos** (laufende Schritte des Planlaufmanagements) und
die laufenden Planläufe nach Projekt gegliedert. In einem markierten Projekt ist die angemeldete
Person automatisch das **Planlaufmanagement** und ist damit für dessen Schritte zuständig; unter
**Funktion** wird es deshalb nicht eigens geführt.

### Angemeldet als
Unten links in der Seitenleiste stehen der eigene Name (bis zur Anmeldung je Person „Max
Mustermann“), die Nachfrage nach E-Mails und der **Farbmodus für eine Rot-Grün-Sehschwäche**: er
stellt Blaugrün, Bernstein und Magenta statt Grün, Orange und Rot dar und erhöht die Kontraste.

### Projekteinstellungen
Vorlaufzeit für Erinnerungen, Arbeitstage/Feiertage und Absenderangaben sowie – wie im Reiter
*Planläufe* – der **Export**. Die
**E-Mail-Texte** (Betreff und Text, mit Übersicht der Platzhalter) werden projektübergreifend unter
**Vorlagen** in der Seitenleiste gepflegt; dort liegen auch die Excel-Vorlagen für die Importe.

## Baubetriebsplanung

Erster Entwurf nach dem Lastenheft „Laufender Baubetrieb – Ideensammler für einen groben Monitor“
der Anwender. Offene fachliche Fragen und die Annahmen des Entwurfs stehen in
[`docs/BAUBETRIEB_RUECKFRAGEN.md`](docs/BAUBETRIEB_RUECKFRAGEN.md).

### Projekt
Im Lastenheft „Projekthülle“; wird bei der MIC-Beauftragung angelegt: Bezeichnung, Projektleiter,
DB-G-Nummer, erster Anmeldetermin (ca.-Wert) samt Prozessphase, **betroffene Fahrplanjahre** (zum
Ankreuzen, statt einer geplanten Sperrzeit), Inbetriebnahme, Hauptbearbeiter MIC,
MIC-Projektnummer (wiko), Status der Betreuung (Aktiv, Betreuungspause, Abgeschlossen) und
Bemerkung. Aus Prozessphase und erstem betroffenen Fahrplanjahr schlägt der Dialog den ersten
Anmeldetermin laut Richtlinie vor. Mit ★ markierte Projekte erscheinen in Übersicht und
Seitenleiste.

**Anmeldebedarf je Fahrplanjahr:** Für jedes betroffene Fahrplanjahr stellt das Projekt die
Fristen für SKM, MKM, KM N-2 und KM N-1 dar und zeigt, ob dafür schon ein Eintrag besteht (ein
Eintrag einer späteren Phase deckt frühere ab, ein Eintrag im KM oder KKM beide KM-Fristen;
Anmeldeleichen zählen nicht). Fristen, die mehr als einen Monat vor dem ersten Anmeldetermin
liegen, gelten als „vor Betreuung“; was in die Vorschau fällt (Vorgabe 180 Tage), erscheint auch
in Übersicht und Terminen. Die Spalte **KKM (unterjährig)** nennt je Maßnahmenart (A, B(0),
B(S), B, C, Container) keine Frist, sondern den **frühesten Sperrbeginn bei Anmeldung heute**:
Stichtag der Anmeldung ist der nächste Mittwoch, dazu kommt der Vorlauf der Maßnahmenart laut
Einstellungen (z. B. C mit 6 Wochen: Anmeldung zum Mittwoch, 28.10. – Sperrpause frühestens ab
9.12.). Angezeigt wird „ganzes Jahr“, „ab …“ oder „nicht mehr“; dahinter stehen vorhandene
unterjährige Anmeldungen dieser Art mit ihrem Status (abgelehnte ohne Haken), denn je Sperrpause
wird eigens angemeldet. Angelegt wird nur über **Neue Anmeldung**. So lässt
sich nach längeren Betreuungspausen ablesen, ob eine Anmeldung zum nächsten SKM, MKM oder KM
fällig ist und was unterjährig noch möglich ist.

### Anmeldung
Je Anmeldung eine Zeile im Projekt: Anmelde-ID (in Workflows mit ganzem Fahrplanjahr Begriff bzw.
tVE-Nr, weil es in SKM und MKM noch keine Anmeldungen gibt), Maßnahmenart (SKM und MKM für die
Sammeleinträge dieser Phasen, sonst A, B(0), B(S), B, C, Container – dieselbe Art kann in mehreren
Phasen vorkommen, getrennt wird nach Workflow), Workflow und Status, Sperrzeitraum (ganzes
Fahrplanjahr oder tagesscharf – je nach Workflow), Terminfrist, Bf/Strecke, Gewerk/Tätigkeit,
Bemerkungen. ÄAbst-Nr und AnnexVII-Kennzeichen sind nur in Status der Art „Änderungsabstimmung“
aktiv; endet sie, werden beide im Statusverlauf festgehalten und in der Anmeldung geleert.

Im Projekt stehen die Anmeldungen **je Workflow in einer eigenen Tabelle** (SKM, MKM, KM (n-2 &
n-1), KKM (unterjährig)) mit den Spalten Anmeldung, Maßnahmenart, Sperrzeitraum, Status und
Terminfrist, dazu „Status ändern …“. Jede Anmeldung belegt höchstens zwei Textzeilen; Längeres
wird gekürzt und steht vollständig im Tooltip. Der Status steht hier ohne den Workflow davor, weil
die Tabelle ihn nennt. Workflows ohne Anmeldung zeigen nur ihre Kopfzeile.

Die Seite einer Anmeldung ist wie ein Planlauf aufgebaut: der Weg durch die Workflows, darunter
die Status des aktuellen Workflows in ihrer Reihenfolge – erreichte mit Haken und Datum, der
aktuelle mit Terminfrist, Ampel und den möglichen Nachfolgern („Weiter mit“, „Übernahme in neue
Phase“, „Abschluss“ mit „Eintrag löschen“). Darunter Merkmale und Statusverlauf.

### Workflows
Wie im Planlaufmanagement sind die Workflows **anpassbar**. Mitgeliefert wird je Phase ein
Standard-Workflow nach der Statustabelle des Lastenhefts: **SKM**, **MKM**, **KM (n-2 & n-1)**
und **KKM (unterjährig)** – im Lastenheft SKM, PzE, Vorprozess N-x und unterjährige Anmeldung.
Die Statusnummern des Lastenhefts (V0 … Y9) dienten nur der Veranschaulichung; die Status tragen
lesbare Namen („Entwurf“, „Mitwirkung BBK“, „Angemeldet (fristgerecht)“ …) und erscheinen
außerhalb der Projekttabellen mit der Kurzbezeichnung ihres Workflows, z. B. „MKM · Angemeldet“
oder „KKM · Entwurf“.

* Die Seite **Workflows** listet alle Workflows mit **Öffnen**, **Duplizieren** und – bei eigenen
  Workflows ohne Anmeldungen – **Löschen**; **Neuer Workflow** legt einen weiteren an.
* Im **Editor** stehen Name, Kurzbezeichnung, Beschreibung, Sperrzeitraum (ganzes Fahrplanjahr oder
  tagesscharf) und die zulässigen Maßnahmenarten; darunter je Status eine Karte mit
  Bezeichnung, Art (Entwurf, In Abstimmung, Angemeldet, Angemeldet (verspätet), Genehmigt,
  Abgelehnt, Änderungsabstimmung, Anmeldeleiche), Terminfrist, „Termin dient zum Nachhaken“, Bemerkung und
  **Nachfolgern**. Status lassen sich verschieben, ergänzen und entfernen; der erste ist der
  **Startstatus**. Ein Status, in dem noch Anmeldungen stehen, kann nicht entfallen, und der
  Sperrzeitraum eines Workflows bleibt fest, solange Anmeldungen darin stehen. Eine Kopie erhält
  „(Kopie)“ an Name und Kurzbezeichnung.
* **Nachfolger** sind Status desselben Workflows, Status eines anderen Workflows (**Übernahme in
  eine neue Phase**) oder **Eintrag löschen**. Beim Statuswechsel stehen nur sie zur Wahl – in der
  Liste („Status ändern …“) und auf der Seite der Anmeldung.
* **Anmeldeleiche:** Jeder Standard-Workflow endet mit dem Status **Anmeldeleiche** (erreichbar aus
  „Entwurf“ und „Abgelehnt“). Er ist ein gewöhnlicher Status mit Datum im Statusverlauf, wird
  **rot** angezeigt, hat keine Terminfrist und deckt keinen Anmeldebedarf mehr ab. Gelöscht wird
  erst im **nächsten Schritt** mit „Eintrag löschen“ – samt Statusverlauf und ohne Rückweg; bis
  dahin lässt sich der Wechsel in die Anmeldeleiche zurücknehmen. Ältere Bestände erhalten den
  Status beim Laden automatisch (Fassung 5).
* **Neu angelegt** wird immer im ersten Status eines Workflows. Ein Auswahlfeld, nach Phase
  gegliedert, legt Phase und Maßnahmenart zugleich fest (z. B. „KKM · B(S)“); vorbelegt ist
  „KKM · A“.
* **Übernahme in eine neue Phase:** Maßnahmenart, Anmelde-ID und Sperrzeitraum werden neu
  erfasst. Der Eintrag lässt sich dabei auf mehrere Anmeldungen **aufteilen** – die weiteren
  verweisen auf ihn als Herkunft.
* **Statusverlauf:** Jeder Wechsel mit Datum (frei wählbar), Bearbeitung und Bemerkung; der Text
  des Status wird zum Zeitpunkt des Wechsels festgehalten. Der letzte Wechsel lässt sich
  **zurücknehmen** (der vorherige Stand samt Art, ID und Sperrzeitraum kehrt zurück), solange es
  den früheren Status noch gibt.

### Terminfristen und Nachhaken
Jeder Status trägt eine Terminfrist: **Frist laut Richtlinie** (Ril_SKM, Ril_MKM, Ril_KM N-2,
Ril_KM, Ril_KKM A oder Ril_KKM – im Lastenheft Ril_skm, Ril_pze, Ril_N-2, Ril_Nx, Ril_A und
Ril_X –, ggf. abzüglich einiger Tage, etwa „Ril_KKM − 14 Tage“), **nächster Stichtag** („Nächster
1.8.“ ab dem Statuswechsel), **Nachhak-Termin** (Tage nach dem Statuswechsel, je Status
einstellbar) oder **keine**; im Workflow-Editor ist die Auswahl nach Phase gegliedert. Die
Richtlinienfristen werden unter **Einstellungen** gepflegt, nach Phase gegliedert – je Frist als
Stichtag TT.MM. im Jahr N − k des Fahrplanjahres oder als Wochen vor Sperrbeginn. **Die
vorbelegten Werte sind Platzhalter** und als solche gekennzeichnet, bis sie geändert oder als
„Geprüft“ bestätigt werden. **Ril_KM** nimmt die N-2-Frist, solange sie am Tag des
Statuswechsels nicht verstrichen ist und nicht vor dem ersten Anmeldetermin des Projekts liegt,
sonst die N-1-Frist; der Rechenweg nennt den Grund. **Ril_KKM** richtet sich nach der Maßnahmenart
(Einträge der Art SKM oder MKM rechnen dabei wie A); ihr Stichtag ist ein Mittwoch – die Frist
fällt auf den Mittwoch an oder vor „Sperrbeginn minus Vorlauf“.
Das Fahrplanjahr N reicht vom Sonntag nach dem zweiten Samstag im Dezember N−1 bis zum zweiten
Samstag im Dezember N.

Die Ampel zeigt *Überfällig*, *Fällig* (Vorgabe 14 Tage vorher) und *Im Plan*; Status „zum
Nachhaken“ sind eigens gekennzeichnet. **Nachgehakt …** hält das Nachhaken mit Notiz und neuem
Termin fest, **Termin festlegen …** setzt die Frist im aktuellen Status von Hand.

### Ansichten
**Übersicht** (Kennzahlen, anstehende Terminfristen, Anmeldebedarf, Projekte mit ihren
Anmeldungen je Workflow), **Termine & Nachhaken** (alle Fristen nach Projekten, Filter
Überfällig/Fällig/Im Plan/Zum Nachhaken), **Projekte**, **Workflows**, **Einstellungen**.
**Excel** im Projekt lädt Anmeldungen und Projekt als Arbeitsmappe herunter.

### Daten
Eigener Schlüssel `baubetrieb-planung.data.v1` im `localStorage`, eigene Demodaten,
**Sicherung**/**Einspielen** (JSON mit dem Kennzeichen `"bereich": "baubetrieb"`; eine Sicherung
des Planlaufmanagements wird abgewiesen) und **Zurücksetzen** (lädt Demodaten und
Standard-Workflows neu). Stände der ersten Entwurfsfassung mit Statusnummern werden beim Laden
übernommen: Die Nummern werden den Status der Standard-Workflows zugeordnet, der bisher
eingestellte Nachhak-Abstand gilt für deren Nachhak-Termine. Ältere Stände übernehmen die
Phasennamen SKM, MKM, KM (n-2 & n-1) und KKM (unterjährig), sofern Name, Kurzbezeichnung bzw.
Beschreibung der Standard-Workflows nicht geändert wurden; die Maßnahmenart PzE wird MKM,
A_Vor_N-2, A_Vor_N-1 und A_unterjahr werden A. Aus der bisherigen geplanten Sperrzeit eines
Projekts werden seine betroffenen Fahrplanjahre. Name unter „Angemeldet als“ und Farbmodus gelten
nur in diesem Bereich.

## Aufbau des Codes

Hinweise für die Arbeit am Code – was nach jeder Änderung nachzuziehen ist, wie gebaut und
veröffentlicht wird und welche Randbedingungen gelten – stehen in [`CLAUDE.md`](CLAUDE.md).

KaPlan besteht aus zwei getrennten Bereichen. Jeder Bereich bringt seinen eigenen Datenbestand,
seinen eigenen localStorage-Schlüssel, seine eigenen Einstellungen und seinen eigenen Router mit;
die beiden greifen nicht aufeinander zu. Die Shell wählt anhand der ersten Wegmarke der Adresse
aus, welcher Bereich geladen wird, und hängt ihn erst beim Betreten ein.

```
src/
  main.tsx       Start der Anwendung, Umlenkung alter Lesezeichen
  shell/         Startbildschirm und Bereichswechsel
    Shell.tsx    Wählt Bereichsauswahl oder Bereich
    Start.tsx    Startbildschirm mit den Bereichskacheln
    bereiche.ts  Verzeichnis der Bereiche
    router.ts    #/ · #/planlauf/… · #/baubetrieb/…
    BereichWechsel.tsx  Rückweg aus einem Bereich zur Bereichsauswahl
  shared/        Bausteine ohne fachlichen Bezug – von keinem Bereich abhängig
    ui.tsx       Karten, Felder, Dialoge, Segmented Controls …
    icons.tsx    Strichsymbole
    logos.tsx    Logos KaPlan (public/logos/) und Wortmarke Mailänder Consult
    toast.tsx    Kurzmeldungen
    dates.ts     Fristen- und Datumsrechnung
    xlsx.ts      Erzeugt Excel-Arbeitsmappen ohne externe Abhängigkeit (mit Zellformaten)
    xlsxLesen.ts Liest Excel- und CSV-Listen für die Importe
    print.ts     Druckausgabe als Grundlage der PDF-Fassung
    pwa.ts       Registrierung des Service Workers
    global.css   Design-Tokens im hellen Apple-Erscheinungsbild
  bereiche/
    planlauf/    Bereich „Planlaufmanagement“
      index.tsx  Einstiegspunkt samt Datenbestand des Bereichs
      App.tsx    Seitenleiste, Kopfzeile und Auswahl der Ansicht
      domain/    Fachlogik ohne UI-Bezug
        types.ts     Datenmodell (Projekt, Rolle, Kontakt, Plan, Vorlage, Planlauf …)
        engine.ts    Verlauf durch die Kette, Fristenrechnung, Ampelstatus, To-Dos
        abschluss.ts Statuswechsel eines Schritts samt Nachweis
        email.ts     Platzhalter und Aufbereitung der Vorlagen
        uebersicht.ts  Gliederung und Zeilenwerte der Planlaufliste – auch für den Export
        export.ts    Kurz- und Langfassung für Excel und PDF
        importVorlagen.ts  Spalten und Schreibweisen der Excel-Vorlagen
        seed.ts      Standard-Prozessketten und Demodaten
      store/
        storage.ts   Persistenz (localStorage) – Austauschpunkt für eine spätere Datenbank
        store.tsx    Zentraler Zustand, alle Schreibzugriffe
      lib/router.ts  Hash-Adressen unterhalb von #/planlauf
      pages/         Ansichten (Übersicht, Fristen, Projekte, Workflows, Funktionen, Vorlagen, Projektreiter)
      components/    Fachliche Bausteine (common.tsx, EmailDialog, PlanlaufListe, PaketDialog, BuendelnDialog,
                     SicherungEinspielen …)
    baubetrieb/  Bereich „Baubetriebsplanung“ (erster Entwurf)
      index.tsx  Einstiegspunkt samt Datenbestand des Bereichs
      App.tsx    Seitenleiste, Kopfzeile und Auswahl der Ansicht
      domain/
        types.ts     Datenmodell (Projekt, Anmeldung, Workflow mit Status, Arten, AnnexVII, Richtlinienfristen)
        workflow.ts  Standard-Workflows je Phase, Nachschlagen von Status und Nachfolgern
        workflowPflege.ts  Workflows speichern, duplizieren, löschen – mit Prüfung belegter Status
        fristen.ts   Fahrplanjahr, Terminfrist je Status, Ampel, Anmeldebedarf
        ablauf.ts    Statuswechsel, Übernahme mit Aufteilung, Rücknahme
        export.ts    Excel-Ausgabe des Monitors
        seed.ts      Platzhalter der Richtlinienfristen und Demodaten
      store/         storage.ts (Laden, Migration, Sicherung) und store.tsx (alle Schreibzugriffe)
      lib/router.ts  Hash-Adressen unterhalb von #/baubetrieb
      pages/         Übersicht, Termine, Projekte, Projekt, Anmeldung, Workflows (mit Editor), Einstellungen
      components/    Status- und Fristanzeigen, Dialoge (Anmeldung, Statuswechsel, Nachhaken), Sicherung
```

Alte Lesezeichen aus der Fassung ohne Bereiche (`#/dashboard`, `#/projekt/<id>/<reiter>` …) werden
beim Aufruf auf `#/planlauf/…` umgelenkt und bleiben damit gültig.

## Gestaltung

Helles Erscheinungsbild in Anlehnung an Apple: Systemschriftart (SF Pro / `-apple-system`),
zurückhaltende Flächen auf `#f5f5f7`, weiße Karten mit weichen Radien und feinen Schatten, die
Hausfarbe von Mailänder Consult `#24456e` als Akzent (auch für alle Fortschrittsbalken),
transluzente Seitenleiste und Kopfzeile, Segmented Controls und Pill-Buttons. Die Oberfläche ist bis auf Telefonbreite (~400 px) nutzbar.

## Nächste Schritte (Ausblick)

* Ablösung von `storage.ts` durch eine Datenbank (z.B. PostgreSQL) samt API – das Datenmodell in
  `domain/types.ts` ist bereits auf Tabellen mit ID-Referenzen ausgelegt.
* Mehrbenutzerbetrieb auf einem gemeinsamen Datenbestand mit Anmeldung und Rechten je Rolle
  (heute sieht jeder Arbeitsplatz nur seinen lokalen Stand).
* Automatischer Mailversand über SMTP statt `mailto:` inkl. Erinnerungslauf im Hintergrund.
* Dateiablage für die eigentlichen Plandateien (PDF/DWG) je Index.
* Auswertungen: Terminlisten, Planlieferlisten und Verzugsberichte als Export.
