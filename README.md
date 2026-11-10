# KaPlan

KaPlan gliedert sich in vier getrennte Bereiche und das Controlling, zwischen denen der
Startbildschirm wählt:

* **Planlaufmanagement** – Verwaltungssoftware für Planläufe: Projekte,
  Planpakete/Pläne/Planverzeichnisse und die Prozessketten, die diese durchlaufen – mit
  Soll-/Ist-Terminen ab dem tatsächlichen Eingang, parallelen Prüf- und Versandschritten,
  Fristenüberwachung, Terminnachweis je Seite und vorbereiteten Erinnerungs-E-Mails.
* **Baubetriebsplanung** (erster Entwurf) – Monitor für baubetriebliche Anmeldungen von
  Sperrpausen: Projekte mit ihren Anmeldungen, die anpassbare Workflows je Phase durchlaufen –
  SKM, MKM, KM (n-2 & n-1) und KKM (unterjährig) – mit Terminfristen laut Richtlinie,
  Nachhak-Terminen, ausstehenden Erstanmeldungen und dem Anmeldebedarf je Fahrplanjahr.
* **Projektsteuerung** (erster Entwurf) – je Projekt die Projektbeteiligtenliste mit
  projektübergreifenden Funktionen und Besprechungsprotokolle mit Folgeprotokollen.
* **Leistungsnachweise** (erster Entwurf) – jede Person erfasst nur ihre Leistungen je Projekt (von
  Hand oder per Excel-Import aus der Zeiterfassung), schreibt je Zeitraum mit den anderen Beteiligten
  am gemeinsamen Leistungstext und bestätigt je Monat, dass Stunden und Texte vollständig sind;
  daraus entstehen gemeinsame tages-, wochen- oder monatsscharfe Leistungsnachweise – je Projekt
  läuft ein offener weiter, bis das Controlling ihn bis zu einem Monatsende oder bis heute
  abschließt –, als PDF ausgegeben im Controlling.
* **Controlling** (mit PIN) – Projekte für alle Bereiche anlegen, in Bereiche übernehmen, je
  Bereich oder ganz archivieren und löschen; dazu das Controlling der Leistungsnachweise (eine
  Übersicht je Projekt mit dem letzten abgeschlossenen Leistungsnachweis, den offenen Stunden und
  dem Stand der Monatsbestätigungen, danach geordnet; je Projekt eine Seite mit dem offenen
  Leistungsnachweis in drei Schritten – Bestätigungen, Prüfen mit Leistungstexten und Aufschlägen
  je Zeile, Abschließen und PDF – und den früheren Leistungsnachweisen; dazu die Auswertung).

Die Bereiche arbeiten unabhängig voneinander: eigener Datenbestand, eigener Speicherort im
Browser, eigene Einstellungen, eigener Router. **Projekte und Projektbeteiligte teilen sie sich**
über das Projektregister: Ein Projekt kann in mehreren Bereichen geführt werden, Kontaktdaten und
Funktionen seiner Beteiligten gelten dann überall (siehe
[**Gemeinsame Projekte und Controlling**](#gemeinsame-projekte-und-controlling)). Der
Startbildschirm zeigt die Bereiche als Kacheln mit Titel und Untertitel; in einem Bereich führt **Bereich wechseln** unten
in der Seitenleiste zurück. Der Abschnitt **Funktionsumfang** beschreibt das Planlaufmanagement,
die Abschnitte [**Baubetriebsplanung**](#baubetriebsplanung),
[**Projektsteuerung**](#projektsteuerung) und [**Leistungsnachweise**](#leistungsnachweise) die
übrigen Bereiche.

Dieser Stand ist ein **lauffähiger Prototyp ohne Datenbank**: Alle Daten liegen lokal im Browser
(`localStorage`). Die Anwendung ist responsiv und als PWA installierbar.

Die Software ist auf die Nutzung durch mehrere Personen ausgelegt – alle sehen alle Projekte, und
jede Person stellt in der Seitenleiste ein, wer sie ist (eigene Funktion im Projekt:
**Planlaufmanagement**). Solange die
Daten lokal im Browser liegen, arbeitet allerdings jeder Arbeitsplatz auf einem eigenen Stand; ein
gemeinsamer Datenbestand setzt den nächsten Schritt – die Anbindung einer Datenbank – voraus. Das Datenmodell ist bereits so geschnitten, dass es später ohne Änderungen an
der Oberfläche auf eine relationale Datenbank umgestellt werden kann.

## Logos

Die Logos von KaPlan liegen unter `public/logos/`. Die Logos der Bereiche und des Controllings
folgen einem Muster: das Dreieck mit je eigener Verteilung von Blau und Grau (Planlaufmanagement
oben blau, Baubetriebsplanung links, Projektsteuerung rechts, Leistungsnachweise links und rechts,
Controlling oben und links), daneben „KaPlan“ und darunter rechtsbündig der Name in Roboto Light.

| Datei | Verwendung |
| --- | --- |
| `Logo_Startseite.png` | Startbildschirm (Bereichsauswahl), oben links |
| `Logo_Planlaufmanagement.png` | Kopf der Menüleiste im Planlaufmanagement |
| `Logo_Baubetriebsplanung.png` | Kopf der Menüleiste in der Baubetriebsplanung |
| `Logo_Projektsteuerung.png` | Kopf der Menüleiste in der Projektsteuerung |
| `Logo_Leistungsnachweise.png` | Kopf der Menüleiste in den Leistungsnachweisen |
| `Logo_Controlling.png` | Kopf der Menüleiste im Controlling |
| `Druck_DB_InfraGO.png`, `Druck_Mailaender_Consult.png` | Standardlogos im Druckkopf von Protokoll und Beteiligtenliste der Projektsteuerung |
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
übernommen – er gilt dann in allen Bereichen.

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

Die beiden Wege kommen sich ins Gehege: Ein Branch-Build von GitHub bricht eine noch wartende
Bereitstellung des Workflows ab („Deployment cancelled.“) – nach PR #31 blieb so die Fassung
von PR #30 online, obwohl der Workflow grün war. Der Workflow legt den Build deshalb erst nach
der Bereitstellung unter `app/` ab (der Push dorthin stößt den nächsten Branch-Build an) und
versucht eine abgebrochene Bereitstellung nach 150 Sekunden ein zweites Mal, mit einer Warnung im
Lauf. Bleibt trotzdem ein alter Stand online, lässt sich der Workflow unter **Actions → Pages →
Run workflow** auf `main` von Hand erneut starten.

Die Schreibrechte für die Ablage in `gh-pages` und `app/` fordert der Workflow selbst an
(`permissions: contents: write` im Job `ablage`); die Voreinstellung unter Settings → Actions →
General → Workflow permissions muss dafür nicht geändert werden. Ist `main` gegen direkte Pushes
geschützt, scheitert nur die Ablage in `app/` – der Workflow meldet das als Warnung. Wird der Push
nach `gh-pages` abgewiesen, schlägt der Lauf fehl. Für private Repositories setzt GitHub Pages
einen kostenpflichtigen GitHub-Plan voraus.

Ändert sich die Hülle (Titel, Symbole, Manifest), zusätzlich den Cache-Namen in `public/sw.js`
hochzählen, damit installierte Fassungen die neuen Dateien laden.

Ein Fenster, das vor einer Veröffentlichung geöffnet wurde (Browser-Tab oder installierte App),
zeigt bis zum Neuladen weiter die alte Fassung. Deshalb trägt jeder Build eine Kennung aus Commit
(`GITHUB_SHA` im Workflow) und Bauzeit (`vite.config.ts`): Sie steht als `fassung.json` neben der
`index.html` und im Programm selbst. Die Anwendung vergleicht beide beim Start, wenn das Fenster
wieder in den Vordergrund kommt, und alle fünf Minuten (`useNeueFassung` in `src/shared/pwa.ts`).
Weichen sie ab, erscheint unten rechts **„Neue Fassung von KaPlan verfügbar“** mit **Neu laden**
und **Später** (`src/shell/NeueFassung.tsx`). Dialoge und die aufgeklappte Seitenleiste liegen
darüber; Meldungen erscheinen oberhalb des Hinweises statt ihn zu verdecken, und der Inhalt erhält
unten zusätzlich die Höhe des Hinweises als Abstand, sodass sich auch die letzten Schaltflächen
einer Seite über ihn hinaus scrollen lassen (der Hinweis setzt seine Höhe als `--neue-fassung-hoehe`, genutzt von
`.content` und `.start` in `src/shared/global.css` und von der PIN-Abfrage des Controllings,
`.ct-pin` in `src/bereiche/controlling/controlling.css`). Welche Fassung läuft, steht am Fuß des
Startbildschirms („Fassung vom …“, im Build des Workflows mit dem Commit).

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

Die Oberfläche ist durchgehend responsiv: Ab etwa 860 px klappt die Seitenleiste in ein Menü (☰),
das bei jedem Seitenwechsel schließt – auch bei *Zurück* im Browser oder per Zurück-Geste
(`useSeitenleiste` in `src/shared/seitenleiste.ts`); auf Telefonbreite stehen die Kennzahlen
zweispaltig, Tabellen scrollen quer bzw. werden – wie die Fristenliste – zu gestapelten Karten,
damit die Schaltflächen erreichbar bleiben. Ab Tabletbreite
bleibt die Kopfzeile einer Tabelle beim Blättern stehen, solange die Tabelle in ihre Karte passt;
ist sie breiter, scrollt sie quer (`tabellenBreiteBeobachten` in `src/shared/tabellen.ts`, Klasse
`table-scroll-quer`), sodass keine Spalte und keine Schaltfläche abgeschnitten wird. Dialoge sind
auf die sichtbare Höhe begrenzt (`dvh`), ihr Fuß liegt also nicht unter den Leisten mobiler
Browser. Eine neue Seite beginnt oben (`useNachObenBeiSeitenwechsel` in `src/shared/scrollen.ts`);
ein Reiterwechsel innerhalb einer Seite scrollt nicht.

Aufklappmenüs an Knöpfen – die Haken „Status ändern“ der Baubetriebsplanung und „Erledigt“ des
Planlaufmanagements, die Schrittwahl und die Spaltenfilter der Planliste – sind ein gemeinsamer
Baustein (`AufklappMenue` in `src/shared/menue.tsx`): Das Menü öffnet bei Platzmangel nach oben,
bleibt im Fenster und scrollt bei Bedarf selbst; lange Einträge brechen um. Der erste Eintrag
erhält den Fokus, Pfeiltasten sowie Pos1/Ende wechseln den Eintrag; Escape schließt das Menü und
gibt den Fokus an den Knopf zurück. Tab, ein Klick oder Tippen daneben, Scrollen, eine
Größenänderung des Fensters und ein zweiter Klick auf den Knopf schließen es ebenfalls. Nach einer
Wahl kehrt der Fokus an den Knopf zurück, sofern es ihn noch gibt – öffnet die Wahl einen
Dialog, steht er dort und kehrt erst nach dessen Schließen zurück. Der Erledigt-Haken einer Zeile
der Planlaufliste bleibt dabei derselbe Knopf, auch wenn nach der Wahl nur noch ein Schritt
ansteht (dann erledigt er ihn direkt).

Dialoge sind ebenfalls ein gemeinsamer Baustein (`Modal` in `src/shared/ui.tsx`). Beim Öffnen
behält ein Feld mit `autoFocus` den Fokus; sonst bekommt ihn das erste Eingabefeld (Text, Zahl,
Datum, Auswahlliste), wenn es ohne Scrollen zu sehen ist, ansonsten der Dialog selbst. Kästchen und
Knöpfe erhalten nie den Anfangsfokus, und gescrollt wird dabei nie; ohne Feld mit `autoFocus`
bekommt auf Touch-Geräten immer der Dialog selbst den Fokus, damit sich die Bildschirmtastatur nicht
ungefragt öffnet (ein Feld mit `autoFocus`, etwa in „Angemeldet als“ oder in „Neue Funktion“ der
Projektsteuerung, behält ihn auch dort). Tab und
Umschalt+Tab bleiben im obersten Dialog, Escape und ein Klick daneben schließen nur ihn – nur
*Sicherung abgleichen* bleibt bei einem Klick daneben offen, damit eine aufwendige Auswahl nicht
verloren geht (`klickDanebenSchliesst={false}`); der Fokus bleibt dabei im Dialog. Verschwindet
das fokussierte Element, bleibt der Fokus im Dialog. Nach dem Schließen – auch per Klick daneben –
geht er an das Element zurück, von dem der Dialog kam, bzw. an den Knopf des Aufklappmenüs, sofern es
noch da ist; löst ein Dialog einen anderen ab, landet er im neuen und kehrt nach dessen Schließen
dorthin zurück, wo der erste herkam (etwa *Sicherung abgleichen* nach *Sicherung einspielen* an
**Einspielen**). Die Ablageflächen der Importe von
Plänen, Funktionen, Projektbeteiligten und Leistungen sind per Tab erreichbar; Enter oder Leertaste
öffnen die Dateiauswahl. Kurzmeldungen am unteren Rand (`src/shared/toast.tsx`) lesen
Bildschirmleser vor, jede neue für sich, auch wenn eine ältere noch steht (`role="status"`,
`aria-atomic="false"`); lange brechen um und bleiben auch auf schmalen Bildschirmen ganz lesbar.

## Funktionsumfang

### Projekte
Anlage und Pflege von Projekten (Projektnummer, Name, Status, Beschreibung). Beim Anlegen werden
die projektübergreifenden Funktionen als Projektfunktionen übernommen. Die E-Mail-Texte gelten
projektübergreifend und werden unter **Einstellungen › Vorlagen** in der Seitenleiste gepflegt.

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

Jede Funktion trägt eine **Seite für den Verzug** – *Planer*, *Prüfer*, *Auftraggeber*, *PLM* oder
„nicht festgelegt“. Der Terminnachweis rechnet Verzug in Schritten dieser Funktion der Seite zu.
Neue Funktionen erhalten sie aus der Bezeichnung vorbelegt (Planlaufmanagement → PLM, Planer und
Fachspezialisten → Planer, prüfende Funktionen → Prüfer, Bauvorlageberechtigte, Projektleitung und
Bauüberwachung → Auftraggeber), bis sie von Hand gewählt wird. Die Listen zeigen die Seite als
Abzeichen; fehlt sie, steht dort gelb *Seite offen*. Dasselbe Feld gibt es im Projekt unter
**Funktion**.

### Funktion (im Projekt)
Im Vordergrund steht die **Funktion, nicht die Person**: Die Seite ist – wie der projektübergreifende
Reiter *Funktionen* – nach **Gewerken** gegliedert (je Gewerk eine Seite, dazu „Übergreifend“). Je
Funktion steht in der Zeile, wer sie ausfüllt; ein Klick öffnet die Besetzung, in der eine im Projekt
bekannte Person übernommen oder eine neue mit Anrede, Firma, E-Mail, Telefon und Anschrift erfasst
wird – dazu die Felder **SharePoint-Link Eingang** (Ordner, in dem die Unterlagen für die Person
bereitliegen) und **SharePoint-Link Ausgang** (Ordner, in den sie ihre Unterlagen hochlädt) für die
Versandmail; hinterlegte Links stehen als kleine Links unter den Kontaktdaten in der Liste. Jede Funktion wird von genau einer Person ausgefüllt; eine Person kann mehrere Funktionen
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
Email · Straße · Nr. · PLZ · Ort · Notiz · SharePoint Eingang · SharePoint Ausgang*; leere
SharePoint-Zellen lassen vorhandene Links stehen; eine Postleitzahl im Excel-Format „Postleitzahl“
(Zahlenformat aus Nullen) behält ihre führende Null. Gewerke und Funktionen, die es noch nicht gibt, werden
beim Import angelegt; „Übergreifend“ steht für Funktionen ohne Gewerkbezug. Eine optionale Spalte
*Seite* setzt die Seite für den Verzug – bei neuen Funktionen (sonst gilt die Vorbelegung) und bei
vorhandenen, wenn sie abweicht. Die Vorschau nennt je Zeile, was angelegt wird, wen eine Besetzung
ersetzt und welche Seite sich ändert.

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
automatisch.** Er entsteht zusammen mit dem Eintrag: Im selben Dialog wird der Workflow gewählt; der
Abschnitt *Ablauf dieses Planlaufs* zeigt seinen Standardverlauf als Punktkette. Über **Individueller
Workflow** öffnet sich derselbe Workflow-Editor wie unter *Workflows*, um die Schritte nur für
diesen Lauf anzupassen (Kennzeichen *Individuell angepasst*, zurück über *Auf Workflow
zurücksetzen*); der Workflow selbst bleibt unverändert. Ein Planverzeichnis, das beim Anlegen eines Plans über
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

**Mehrfachauswahl:** Über die Kästchen-Spalte lassen sich Einträge wählen. Das Kästchen eines
Verzeichnisses wählt es samt seinen sichtbaren Plänen; Paketzeile, *Ohne Planpaket* und Kopfzeile
wählen ihren Inhalt (bei abweichender Auswahl teilweise markiert). Was Suche oder Filter ausblenden,
fällt aus der Auswahl. Die Aktionsleiste bietet **Planpaket zuweisen …** (auch „– keinem Paket –“;
Pläne folgen dem Paket ihres Verzeichnisses), **Neues Planpaket aus Auswahl …**,
**Gewerk/Planungsphase …** (ein leeres Feld bleibt unverändert), **Löschen …** und **Auswahl
aufheben**. Die Rückfrage zum Löschen nennt jedes Verzeichnis mit oder ohne seine Pläne, die Zahl
der Planläufe – davon die mit Ist-Daten bzw. Protokoll –, die künftigen Einzelpläne und bietet
**Sicherung vorher herunterladen**.

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
steht in der Spalte **Aktueller Stand** der zuletzt erledigte Prozessschritt vor dem offenen –
übersprungene Schritte zählen nicht, und auch nach dem Wiederöffnen eines früheren Schritts liegt er
nie dahinter; nach einem Rücksprung ist es der zuletzt bis zum Wiedereingang erledigte –, darunter
in Grau sein Erledigungsdatum, und in der Spalte **Nächster Schritt** der offene Schritt mit seiner
Frist. Stehen in parallelen Zweigen mehrere Schritte an, nennt die Zeile den dringlichsten mit
„+n parallel“; Erinnern und Erledigt-Haken fragen dann in einem Menü nach dem Schritt („Welcher
Schritt ist erledigt?“ bzw. „Erinnerung zu welchem Schritt?“). Status, Filter und Suche
berücksichtigen alle anstehenden Schritte. Der **Fortschritt** ist nach Fristen gewichtet: die
Fristen der erledigten Schritte im Verhältnis zu ihnen plus den Fristen aller laut Prognose noch
ausstehenden Ausführungen – ein Rücksprung senkt ihn also; 100 % hat nur ein abgeschlossener Lauf.
Die Liste ist nach Planpaketen gegliedert; Planverzeichnisse lassen sich am Pfeil vor Symbol und Titel
aufklappen (zunächst zugeklappt). Darunter stehen die Pläne – mitlaufend mit **Herauslösen …**,
herausgelöst mit eigenem Schritt und Status. Ein Verzeichnis mit Plänen einzeln erscheint als
zusammenfassende Zeile mit **Bündeln …**. Abgebrochene Läufe stehen gesammelt am Ende unter einer
eigenen, zunächst zugeklappten Zeile **Abgebrochen**.

**Mehrfachauswahl:** Über die Kästchen-Spalte lassen sich Planläufe wählen – Planpaket, *Ohne
Planpaket*, Verzeichnis und Kopfzeile wählen ihren Inhalt, abgebrochene Läufe sind nicht wählbar.
Die Aktionsleiste bietet **Schritte erledigen …** (Ist-Datum, erledigt oder übersprungen, je Lauf
die anstehenden Schritte; gleichnamige Schritte lassen sich gemeinsam beantworten und mit einer
Nachweis-Nr. versehen; eine Vorschau nennt Rücksprünge und Abschlüsse, danach folgen das Ergebnis
und auf Wunsch **E-Mail senden**), **Erinnern …** (eine E-Mail je Person mit all ihren Schritten),
**Versandmail …** (siehe *Versandmail*),
**Exportieren …** (Export mit der Auswahl vorgewählt) und **Auswahl aufheben**. Ein gewählter
mitlaufender Plan wirkt auf den Planlauf seines Verzeichnisses.

Die Planlaufliste lässt sich über die Spaltenüberschriften **sortieren** – nach Bezeichnung, Gewerk,
Datum des aktuellen Stands, Soll-Termin des nächsten Schritts, Zuständigkeit, Fortschritt oder Status
(überfällige zuerst). Ein zweiter Klick kehrt die Richtung um, ein dritter hebt die Sortierung auf. Sortiert wird
innerhalb der Planpakete, die Paketzeilen folgen derselben Spalte.

Die **Kopfzeile der Tabellen bleibt beim Scrollen stehen**, sodass die Spaltenbezeichnungen auch in
langen Listen sichtbar sind – solange die Tabelle in ihre Karte passt; eine breitere scrollt quer.

**Filtern** geschieht in derselben Überschrift: Der Trichter neben *Gewerk*, *Zuständig* und *Status*
öffnet die Auswahl der vorhandenen Werte (der gewählte ist im Menü hervorgehoben, „Alle“ hebt den
Filter auf); der gewählte Wert steht anschließend in der Überschrift.
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
Ein Schritt ist eine **Aufgabe** oder eine **Entscheidung**, hat eine Frist in Tagen und
einen Verantwortlichen (Funktion). Entscheidungen erhalten zwei Antwortmöglichkeiten („Ja“/„Nein“ als
Vorbelegung, frei überschreibbar); weitere lassen sich ergänzen. Je Antwort wird festgelegt, mit
welchem Schritt es weitergeht – mit dem nächsten Schritt, einem beliebigen anderen oder dem Ende des
Laufs – und ob sie **zu Nacharbeit führt** (Vorgabe: alle außer der ersten); der Weg danach gilt im
Terminnachweis als Nacharbeit. Die erste Antwort bildet den **Standardverlauf**, die übrigen die
**Abweichungen**.

Zeigt eine Antwort oder das „Weiter mit“ einer Aufgabe auf einen bereits durchlaufenen Schritt
zurück, entsteht eine **Schleife** (z.B. Überarbeitung nach einer Prüfung): Der Ablauf endet dort
nicht, sondern nimmt den genannten Schritt in einem weiteren Durchlauf erneut auf.

**Parallele Blöcke.** Schritte, die gleichzeitig laufen, bilden einen parallelen Block aus zwei oder
mehr **Zweigen**. Ein Block wird immer als Ganzes betreten – alle Zweige beginnen zugleich –, und
weiter geht es hinter dem Block, wenn alle Zweige erledigt sind (Zusammenführung). Im Zweig geht es
zum nächsten Schritt des Zweigs, zum Zweigende oder zurück auf einen früheren Schritt desselben
Zweigs (**Zweig-Rücksprung**, etwa eine erneute Nachreichung); ein Ziel in einem anderen Zweig ist
unzulässig. Ein Ziel außerhalb des Blocks ist ein **Ausstieg** (etwa „Nein“ einer Prüfung zur
Rückmeldung an den Planer): Ist der auslösende Schritt erledigt, beginnen die übrigen Zweige nichts
Neues mehr – Laufendes wird noch erledigt –, und es geht am Ziel des Ausstiegs weiter. Ein
Rücksprung auf einen Schritt im Block betritt wieder den ganzen Block. Blöcke lassen sich nicht
schachteln.

**Workflow-Editor.** Workflows werden in einem bildschirmfüllenden Editor bearbeitet – projektübergreifend
unter *Workflows*, als Projektvariante im Reiter *Workflows* des Projekts und für einen einzelnen
Planlauf über *Individueller Workflow*. Links steht der Ablauf als Bild: in der Spalte
*Standardverlauf* die Karten des Regelwegs von *Planlauf starten* bis *Planlauf beenden*, rechts
daneben unter *Abweichungen* die Schritte, die nur über eine andere Antwort erreicht werden, mit
farbigen Linien und Antwortbeschriftungen; Rücksprünge sind eigens gekennzeichnet. Jede Karte zeigt
Art, Nummer, Bezeichnung, Funktion und Frist. Ein Klick öffnet rechts die *Schrittdetails*
(Bezeichnung, Art, verantwortliche Funktion, Frist, Nachweis, „Weiter mit“ bzw. die Antworten mit
*Als Standardverlauf*, *E-Mail nach Abschluss*, *Anliegen in der Versandmail*, Verschieben im Standardverlauf, Duplizieren,
Entfernen). „+“ zwischen zwei Karten fügt dort eine Aufgabe ein, *Schritt hinzufügen* hängt einen
Schritt an. Ein paralleler Block erscheint als Containerkarte „Parallel · … Zweige“ mit den
Zweigen nebeneinander (bei Platzmangel untereinander), Gabel- und Zusammenführungsbalken, „+“ je
Zweig, Abweichungen im Zweig gestrichelt darunter und Ausstiegen als Text; angelegt wird er über
*Schritt hinzufügen* → *Parallele Zweige* oder in den Schrittdetails mit *Parallel dazu ausführen*,
aufgelöst mit *Aus dem Block lösen*. Ändert sich dabei der Anschluss hinter einem Block, weist der
Editor darauf hin. Block und Zweige lassen sich **benennen**: im Abschnitt *Parallel* der
Schrittdetails mit *Name des Blocks* und *Name des Zweigs*; ein Klick auf den Kopf der
Containerkarte wählt den ersten Schritt des Blocks und setzt den Cursor in *Name des Blocks*. Die
Karte heißt dann etwa „Versand · parallel, 4 Zweige“, die Zweigköpfe tragen ihren Namen statt
„Zweig 1“ usw. Neue Schritte im Block bzw. Zweig übernehmen die Namen, ein neuer Block beginnt ohne;
Planläufe übernehmen sie mit dem Workflow. Änderungen lassen sich rückgängig machen (Strg+Z / Strg+Y); die Fußzeile meldet
Unvollständiges (fehlende Bezeichnung, Entscheidung ohne Antwort, nie erreichte Schritte), und
erst *Speichern* bzw. *Übernehmen* schreibt den Stand. Auf schmalen Bildschirmen stehen die
Schrittdetails in einem Blatt von unten, bei mittlerer Breite in einer Schublade.

Mitgeliefert sind die drei vorgegebenen Ketten **VVBau ohne Prüfstatik**, **VVBau mit Prüfstatik**
und **VVBau STE** mit ihren Verzweigungen und Rücksprüngen. Jede Prüf- bzw. Freigabeentscheidung
hat neben „Ja“ und „Nein“ die Antwort **Nachreichung**: Der Fachplaner reicht beim ablehnenden
Prüfer nach („Nachreichung an …“), dieselbe Funktion prüft bzw. gibt die Nachreichung frei – „Ja“
führt weiter wie das „Ja“ der Ausgangsentscheidung, „Nein“ zur Rückmeldung an den Planer, eine
weitere „Nachreichung“ zurück zur Nachreichung. In *VVBau mit Prüfstatik* laufen Fachprüfung und
Prüfstatik als paralleler Block (jede mit eigener Nachreichung im Zweig, „Nein“ als Ausstieg zur
Rückmeldung an den Planer); in allen drei Ketten laufen nach der Genehmigung der digitale Versand an
Bau AN, BVB und BÜW sowie der Plotauftrag parallel, danach der Postversand an Bau AN und BÜW. Die
Blöcke sind benannt: *Prüfung* (Zweige *Fachprüfung* und *Prüfstatik*), *Versand* (*Bau AN*,
*BVB*, *BÜW*, *Plot*) und *Postversand* (*Bau AN*, *BÜW*). Die
Fristen sind dort nicht vorgegeben und daher als Erfahrungswerte vorbelegt (z.B. 10 Tage
Planerstellung, 3 Tage formale Prüfung, 10 Tage BVB-Freigabe, 15 Tage Fachprüfung, je 5 Tage für
Nachreichung und Prüfung der Nachreichung); sie lassen sich je Kette und je Planlauf ändern.

**Versandschritte** tragen ein *Anliegen in der Versandmail*: „PLM an BVB zur Freigabe“ →
Freigabe, „PLM an BVB zur Freigabe zur fachtechnischen Prüfung“ → Vorprüfung, „PLM an Fachprüfer
und Prüfstatiker“ und „PLM an Planprüfer“ → Prüfung, „PLM an PL zur Genehmigung“ → Genehmigung;
alle übrigen Schritte keins.

Diese Ketten kamen mit Stammdatenfassung 5, das Anliegen mit Fassung 6. Ein vorhandener Bestand
übernimmt sie beim Laden; wer einen mitgelieferten Workflow der Fassung 4 bzw. 5 selbst geändert
hatte, behält diesen als eigene Kopie „… (eigene Fassung)“ – ein einmaliger Hinweis nennt sie.
Vorhandene Workflow-Kopien, Projektvarianten und Planläufe erhalten das Anliegen über den
Schrittnamen. Laufende Planläufe behalten ihre Schritte;
der Planlauf bietet dann **Auf aktuelle Fassung umstellen …**.

Ketten lassen sich duplizieren und als **Projektvariante** abweichend pflegen; Projektvarianten erscheinen nur im Reiter *Workflows* ihres Projekts. Die eigene Rolle im
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
mit Funktion (z.B. Erdungsprüfer), Frist und Nachweis. Die Einfügeposition wird aus dem aktuellen
Verlauf gewählt, vorgeschlagen ist die Stelle hinter dem anstehenden Schritt; angeboten werden nur
Stellen, hinter denen noch nichts erledigt ist. Im parallelen Block landet der Schritt im Zweig des
gewählten Schritts, wahlweise am Ende eines Zweigs oder nach dem Block. Die Verkettung wird dabei
richtig gesetzt, auch hinter Entscheidungen.

### Planläufe (Soll-/Ist-Termine)
Ein Planlauf ist die laufende Instanz einer Prozesskette für einen Plan oder ein gebündeltes
Planverzeichnis. Beim Start werden die Schritte der Vorlage kopiert und lassen sich **für diesen Lauf**
noch ergänzen, ändern oder entfernen – **individuelle Abweichungen** wirken deshalb nur auf den
jeweiligen Lauf und sind als solche gekennzeichnet.

* **Die Frist zählt ab dem tatsächlichen Eingang.** Sobald ein Schritt ansteht, erhält er einen
  **festen Eingang**: den Abschluss seines Vorgängers – nach einem parallelen Block den spätesten
  Abschluss der Zweige –, beim ersten Schritt den Start. **Soll = Eingang + Frist**, wahlweise in
  Arbeitstagen (Mo–Fr, ohne hinterlegte Feiertage; das Soll fällt mindestens auf den nächsten
  Arbeitstag) oder Kalendertagen. Der erste Schritt erhält das *Eingang Soll* des Eintrags, falls
  hinterlegt. Der feste Eingang ändert sich danach nicht mehr von selbst; unter *Anpassen* lässt er
  sich ändern, auf Wunsch samt dem Eingang der Nachfolger.
* Künftige Schritte rechnen mit dem **voraussichtlichen Eingang** – erledigte Vorgänger mit ihrem
  Abschluss, offene mit ihrem Soll, frühestens heute. Diese **Prognose** liegt nie in der
  Vergangenheit und ist als „voraussichtlich“ gekennzeichnet; aus ihr ergibt sich auch das
  voraussichtliche Ende des Laufs.
* Ein Soll-Termin kann **manuell festgesetzt** werden und bildet dann die Basis für alle folgenden
  Schritte.
* Führt eine Antwort oder das „Weiter mit“ einer Aufgabe zurück auf einen früheren Schritt
  (**Rücksprung**), beginnt mit dem Erledigen dieses Schritts ein **weiterer Durchlauf** ab dem Ziel:
  Das Ziel und alles, was ab ihm schon begonnen war, wird zurückgesetzt und als „2. Durchlauf“
  gekennzeichnet; ein Zweig-Rücksprung betrifft nur den Rest des Zweigs, ein Rücksprung in einen
  Block den ganzen Block. Der bisherige Stand bleibt als **früherer Durchlauf** in der Historie des
  Schritts erhalten (aufklappbar). Das Ziel erhält als **Wiedereingang** den Abschluss des
  Auslösers („Wiedereingang am … (aus Rücksprung)“), und seine Frist zählt ab dann neu.
* **Parallele Blöcke** stehen in der Schrittliste als Gruppe mit dem Namen des Blocks, die Zweige
  nebeneinander (bei Platzmangel untereinander), je Zweig mit Namen, Stand, Zweig-Rücksprung, Ausstieg und abgeschnittenen
  Schritten. Jeder anstehende Schritt – in parallelen Zweigen also mehrere zugleich – bietet die
  Aktionen.
* **Ist-Termine** dokumentieren die Erledigung; Schritte lassen sich auch **überspringen**. Ein Ist
  vor dem Eingang wird angezeigt und verlangt beim gesammelten Erledigen eine Bestätigung. Mit dem
  Abschluss hält der Schritt die zuständige Person fest. Die folgenden Schritte werden automatisch
  aktiv, der Lauf schließt sich, wenn alle Schritte des Verlaufs erledigt sind.
* Nach jedem Erledigen oder Überspringen zeigt **E-Mail senden** die nun anstehenden Schritte je
  Person mit Vorlage und E-Mail-Schaltfläche – sofern unter *Angemeldet als* die Nachfrage
  zugelassen ist. War der erledigte Schritt ein Versandschritt, ist die Vorlage **Versand** für die
  neu zuständige Person vorgewählt („Versand zur Freigabe“ usw.).
* Bei **Entscheidungen** wird die Antwort im Lauf gewählt. Der angezeigte Verlauf folgt dieser
  Antwort; ohne Auswahl der ersten Möglichkeit. Schritte, die nur bei anderer Antwort durchlaufen
  werden, sind unterhalb der Liste aufgeführt.
* Im Planlauf sind die Schaltflächen (Erledigt, Überspringen, Erinnern) nur an **anstehenden
  Schritten** sichtbar; *Anpassen* steht als Stiftsymbol rechts an jeder Zeile.
* Abgeschlossene Schritte bieten **Wieder öffnen …**. Der Dialog fragt nach der Art: **Korrektur**
  (Fehlbedienung – das Ist entfällt, Nachfolger, die dadurch nicht mehr anstehen, warten wieder;
  nur solange kein Nachfolger ein Ist hat) oder **Erneute Bearbeitung** (ab diesem Schritt beginnt
  ein weiterer Durchlauf, dessen Eingang abgefragt wird; der bisherige bleibt in der Historie). Er
  nennt die betroffenen Schritte. Ein abgeschlossener Lauf läuft danach wieder.
* Der **Kopf** des Planlaufs zeigt den Fortschritt, das voraussichtliche bzw. tatsächliche Ende samt
  geplantem Ende, den Verzug gegenüber der Basis und den am stärksten überfälligen Schritt.
* Jede vorbereitete E-Mail wird am Schritt als **Erinnerung** vermerkt („E-Mail vorbereitet am … an
  …“). Die Karte **Protokoll** führt alle Änderungen am Lauf – wer wann einen Schritt erledigt,
  wieder geöffnet, angepasst, eine Person gewählt oder eine E-Mail vorbereitet hat, Rücksprünge,
  geänderte Arbeitstage, Feiertage oder Eingang Soll –, neueste zuerst; berechnete Termine
  erscheinen dort nicht.
* Ein Lauf kann mit Begründung **abgebrochen** werden – wahlweise **ersatzlos** oder mit **neuem
  Index bzw. neuer Ausgabe**. Im zweiten Fall erhält der Eintrag den angegebenen Index, und der
  Planlauf beginnt mit denselben Schritten von vorn.
* Über **Workflow ändern …** lässt sich ein laufender Planlauf mit einem anderen (oder demselben)
  Workflow **von vorn beginnen**: Workflow wählen, Schritte bei Bedarf über *Individueller Workflow* anpassen, Start und
  *Eingang Soll* setzen, optional einen Grund angeben, dann **Neu starten**. Mit **Erledigte Schritte
  übernehmen** behält der neue Lauf entlang seines Ablaufs ab Beginn die erledigten Schritte gleicher
  Bezeichnung und Funktion – mit Ist, Eingang, Antwort und Nachweis. Folgt ein laufender Planlauf
  noch einer früheren Fassung seines Workflows, weist er darauf hin und bietet **Auf aktuelle
  Fassung umstellen …** (derselbe Workflow, erledigte Schritte übernommen). Der bisherige Lauf gilt
  nicht als Abbruch – er erscheint nicht unter *Abgebrochen*, bleibt aber mit dem Hinweis „Mit
  geändertem Workflow neu gestartet am …“ zum Nachschlagen erhalten. Der neue Lauf vermerkt den
  vorherigen Workflow und führt unter *Frühere Läufe vor dem Neustart* zu ihm.
* Ein abgebrochener Lauf ist **nicht mehr zu bearbeiten**: In der Planlaufliste steht seine Zeile
  gesammelt am Ende unter **Abgebrochen**, ausgegraut, ohne aktuellen Schritt, Fortschritt und
  Schaltflächen – stattdessen mit seinem eigenen Index und in Grau „Abgebrochen am …“ mit dem
  Zusatz *ersatzlos abgebrochen* bzw. *ersetzt durch Index C*. Er lässt
  sich weiterhin zum Nachschlagen öffnen, bietet dort aber keine Aktionen mehr und erscheint nicht
  in der Fristenliste. In der **Planliste** trägt der Eintrag den entsprechenden Zusatz
  (`Index B → C` bzw. `abgebrochen`).

### Terminnachweis
Die Karte **Terminnachweis** im Planlauf zeigt den Verzug gegenüber dem **Basisplan** – dem beim
Start festgehaltenen Plan mit Fristen und geplantem Ende – und rechnet ihn einer **Seite** zu:
Planer, Prüfer, Auftraggeber oder PLM, vorbelegt aus der Funktion des Schritts. Der Gesamtverzug
zerfällt in Posten je Ausführung: Fristüberschreitung, Nacharbeit (der Weg nach einer Antwort, die
zu Nacharbeit führt, oder eine erneute Bearbeitung), Planänderung, Soll von Hand, Übergabelücke,
erster Termin verschoben und Zeitgewinn. Ein paralleler Block zählt als Ganzes: nur sein Verzug
gegenüber dem längsten Zweig des Basisplans, verteilt auf genau einen maßgeblichen Zweig; was
darüber hinausgeht, hat der Puffer aufgefangen. Bei laufenden Läufen geht die Prognose bis zum Ende
ein. Es gilt Gesamtverzug = Summe der Seiten + Seite fehlt − Zeitgewinn; ein Rest erscheint als
*Nicht erklärt*.

Die **Ursache der Nacharbeit** lässt sich je Entscheidung einer Seite zuordnen, mit **Zuordnen …**
der Verzug einer Ausführung von Hand auf die Seiten verteilen (Grund Pflicht) und mit **Basis neu
festlegen …** der Basisplan erneuern (Grund Pflicht). **Nachweis als Excel** gibt die Blätter
*Ausführungen*, *Verzug je Seite*, *Erinnerungen* und *Protokoll* aus.

### Terminrechner
Der **Terminrechner** (Seitenleiste, unter *Projekte*) rechnet mit den Regeln des Planlaufs –
Fristen ab Eingang, parallele Zweige, Rücksprünge und Nachreichungen –, ohne einen Lauf anzulegen:
**Rückwärts** vom Termin auf der Baustelle bis zur spätesten Übergabe des Planers (bzw. zum
spätesten Start des Planlaufs, wenn der Workflow nicht mit *Eingang PLM* beginnt), **Vorwärts** vom
Eingang der Planung bzw. Start bis zum Ende des Planlaufs. Eingaben: Projekt (Arbeitstage und
Feiertage; ohne Projekt Mo–Fr ohne Feiertage), Workflow (übergreifend und Projektvarianten),
Richtung, Datum, Fristen, ein **Szenario** (Antwort je Entscheidung im ersten Durchlauf, Vorgabe
der Standardverlauf) und wahlweise ein **Zielschritt** statt des Endes. Die Zwischenergebnisse
nennen je Schritt Eingang und Fristende, auf dem kritischen Weg „spätestens“, für die übrigen den
Puffer; Schritte in parallelen Zweigen tragen den Zweig samt Namen („Prüfstatik · Zweig 2 von 2“).
Das Ergebnis lässt sich drucken.

### Fristen & Erinnerungen
Fristenübersicht über alle Projekte, sortiert nach Dringlichkeit und gefiltert nach
überfällig / fällig / im Plan. Angezeigt werden **alle anstehenden Schritte** – bei parallelen
Zweigen mehrere je Planlauf. Ein Schritt gilt als *fällig*, sobald der Soll-Termin näher liegt als
die in den Projekteinstellungen gepflegte Vorlaufzeit.

Je Schritt öffnet der Button **Erinnern** ein Fenster mit der vorbereiteten E-Mail: Die zur Lage
passende Vorlage (Erinnerung oder Mahnung) wird ausgewählt, die Platzhalter aus Projekt, Plan,
Schritt, Frist und Empfänger ersetzt (`{{verzug}}` nennt die Einheit, etwa „5 Arbeitstage“,
`{{verzug.zahl}}` nur die Zahl). Von dort lässt sich die Nachricht in **Outlook** öffnen
(`mailto:`, also das eingerichtete Standardprogramm), in **Outlook im Web** anlegen oder in die
Zwischenablage kopieren; jede vorbereitete E-Mail wird am Schritt vermerkt. Stehen bei einer Person
mehrere Schritte an, entsteht eine **Sammel-E-Mail** (Vorlage *Sammelerinnerung*, Platzhalter
`{{liste}}` und `{{anzahl}}`). Ist sie für die Übergabe an das Mailprogramm zu lang, bleibt nur
„Kopieren“. **Kopieren (formatiert)** legt nur den Text mit Formatierung (Links anklickbar, die SharePoint-Links des Empfängers als Kurztext „SharePoint-Eingang“ bzw. „SharePoint-Ausgang“,
Aufzählungen, „ORDNERNAME EINFÜGEN“ rot und fett) und zugleich als Klartext in die Zwischenablage –
zum Einfügen in eine neue Outlook-Mail.

### Versandmail
Die Vorlage **Versand** schreibt der Person, die **nach einem Versandschritt** zuständig ist:

```
{{anrede}}

auf Ihrem SharePoint-Ordner {{sharepoint.eingang}} haben wir Ihnen die folgenden Unterlagen bereitgestellt und bitten um {{anliegen}}.

Hier der Link zum Hochladen der Unterlagen nach Ihrer {{anliegen}}:
{{sharepoint.ausgang}}

Ordnername: ORDNERNAME EINFÜGEN

{{versandliste}}
```

Die Anrede kommt aus `{{anrede}}` („Sehr geehrter Herr Lindqvist,“, ohne Anrede „Guten Tag Vorname
Nachname,“), das Anliegen aus dem
vorangehenden Versandschritt, die Links aus dem Kontakt. `{{versandliste}}` gliedert die Unterlagen
nach Planpaketen („PP-Nordkanal Eisenbahnüberführung Nordkanal:“, darunter „* Codierung Titel“),
ein Planverzeichnis mit seinen mitlaufenden Plänen eingerückt („  – …“); ein einzelner Plan ohne
Paket steht mit seinem Namen für sich, mehrere unter „Ohne Planpaket:“. Fehlt ein Link, steht
„[SharePoint-Link Eingang fehlt]“ bzw. „[SharePoint-Link Ausgang fehlt]“ im Text und der Dialog
weist darauf hin. „ORDNERNAME EINFÜGEN“ wird vor dem Absenden von Hand ersetzt.

Ausgelöst wird die Versandmail auf zwei Wegen: nach dem Erledigen eines Versandschritts in **Neu
zuständig** (siehe oben) und gesammelt über **Versandmail …** in der Planlaufliste. Dort gilt je
gewähltem Planlauf: Steht ein Versandschritt an (etwa „PLM an BVB zur Freigabe“), ist Empfänger
die Person des Schritts danach (bei einem parallelen Block jedes Zweigs); steht der Schritt direkt
nach einem erledigten Versandschritt an, dessen Person. Je Empfänger und Anliegen entsteht **eine**
Mail mit allen betroffenen Plänen; vermerkt wird wie bei Erinnerungen am anstehenden Schritt.
Planläufe ohne Versandschritt nennt ein Hinweis.

### Export je Projekt
Über **Export** im Reiter **Planläufe** (oder in den Projekteinstellungen) lassen sich die Planläufe
eines Projekts ausgeben. Die Auswahl der Einträge ist wie die Planlaufliste gegliedert – je
Planpaket, *Ohne Planpaket* und *Abgebrochen* mit eigenem Haken. Gewählt wird je Planlauf, sodass
ein abgebrochener Vorgänger und der laufende Lauf eines Eintrags getrennt bleiben; ein Verzeichnis
wählt die Pläne unter sich mit, ein mitlaufender Plan sein Verzeichnis. Ist im Reiter *Planläufe*
ein Filter gesetzt, sind die gezeigten Einträge vorgewählt. Zwei Umfänge:

* **Kurzfassung** – als PDF genau die Angaben der Planlaufliste: Aktueller Stand, Nächster
  Schritt (bei parallelen Zweigen alle anstehenden), Zuständig, Fortschritt und Status; in Excel
  nach Planpaket, Plancode, Stand und Frist (siehe unten).
* **Langfassung** – je Planlauf zusätzlich alle bereits durchlaufenen und alle ausstehenden
  Schritte mit Verantwortlichen, Durchlauf, Eingang, Soll, Ist, Verzug und Seite; frühere
  Durchläufe stehen als eigene graue Zeilen, voraussichtliche Termine kursiv.

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
Seitenleiste (mit vorangestellter Projektnummer); ohne Markierung werden alle angezeigt –
archivierte Projekte in keinem Fall (siehe
[Gemeinsame Projekte und Controlling](#gemeinsame-projekte-und-controlling)). Der Hinweis
„Kein Projekt markiert“ erscheint nach derselben Regel – wenn es nicht archivierte Projekte gibt und
keines davon markiert ist; das gilt ebenso in den Übersichten der anderen Bereiche. Die
Übersicht zeigt Kennzahlen, die eigenen **To-Dos** (laufende Schritte des Planlaufmanagements) und
die laufenden Planläufe nach Projekt gegliedert. In einem markierten Projekt ist die angemeldete
Person automatisch das **Planlaufmanagement** und ist damit für dessen Schritte zuständig; unter
**Funktion** wird es deshalb nicht eigens geführt.

### Angemeldet als
Unten links in der Seitenleiste stehen der eigene Name (bis zur Anmeldung je Person „Max
Mustermann“), die Nachfrage nach E-Mails und der **Farbmodus für eine Rot-Grün-Sehschwäche**: er
stellt Blaugrün, Bernstein und Magenta statt Grün, Orange und Rot dar und erhöht die Kontraste.
Name und Farbmodus gelten in **allen Bereichen** (siehe
[Angemeldet als – für alle Bereiche](#angemeldet-als--für-alle-bereiche)); die E-Mail-Nachfrage gilt
nur im Planlaufmanagement.

### Sicherung, Abgleich und Hinweise
**Sicherung** (Seitenleiste) lädt den gesamten Bestand als JSON herunter. **Einspielen** liest eine
solche Datei und bietet danach **Alles ersetzen** oder **Abgleichen und auswählen**: Der Abgleich
vergleicht Sicherung und Bestand je Element – übergreifend Gewerke, Funktionen, E-Mail-Vorlagen und
Workflows, je Projekt Projektdaten, Funktionen, Kontakte, Projekt-Workflows und Einträge samt Plänen
und Planläufen – und kennzeichnet sie als neu, geändert, gleich, nur im Bestand oder im Bestand
gelöscht. Gewählte Elemente werden samt Abhängigkeiten übernommen; bei Läufen gleicher Kennung
werden Protokoll, frühere Durchläufe und Erinnerungen beider Seiten vereinigt. Einträge gleicher
Codierung mit anderer Kennung gelten als „vermutlich dasselbe“, ein Projekt mit gleicher Kennung und
anderer Projektnummer lässt sich als Kopie übernehmen. Wäre der Stand danach nicht stimmig, wird
nichts übernommen. Dazu merkt sich der Bestand Löschungen (Löschvermerke) und den
Änderungszeitpunkt von Projekten, Einträgen, Kontakten, Funktionen und Workflows.

**Hinweisleisten** unter der Kopfzeile melden, wenn sich der gespeicherte Stand nicht laden lässt
(*Gespeicherten Stand herunterladen* oder mit Demodaten neu beginnen), wenn er aus einer neueren
Fassung von KaPlan stammt (nur *Seite neu laden*; Einspielen und *Zurücksetzen* sind dann
gesperrt), wenn nicht gespeichert werden kann – Speicher voll oder vom Browser gesperrt (*Sicherung
herunterladen*) – und einmalig, wenn ein selbst geänderter Standard-Workflow als Kopie behalten
wurde. Bei einem Lade- oder Fassungsfehler zeigt die Anwendung Demodaten und speichert nicht, damit
der gespeicherte Stand erhalten bleibt. Vor jeder Umstellung auf eine neue Fassung legt sie den
gespeicherten Text als **Sicherungskopie** im Browser ab (Schlüssel
`planlauf-management.data.v1.vor-fassung-<n>`). Nach einem Lade- oder Fassungsfehler bietet der
Dialog *Sicherung einspielen* statt *Aktuellen Stand sichern* **Gespeicherten Stand herunterladen**
an, das den gespeicherten Text unverändert herunterlädt. Ersetzt *Alles ersetzen* einen Stand, der
sich nicht laden ließ, bleibt davon ebenfalls eine Kopie im Browser
(`planlauf-management.data.v1.vor-einspielen-<Zeitpunkt>`); passt sie nicht mehr in den Speicher,
ersetzt der Dialog nichts, sondern sagt das und bietet **Ohne Kopie ersetzen** an. Wird der Speicher
knapp, räumt das Speichern solche Kopien einzeln, bis der Bestand passt – zuerst die vor einer
Umstellung (die eigenen vor denen anderer Bereiche und des Projektregisters), dann die vor dem
Einspielen, gleich welchen Bereichs, die älteste zuerst (`nachRaeumenSpeichern` in
`src/shared/speicher.ts`); reicht das nicht, kommen sie zurück.
Speichert ein anderes Fenster (Tab oder installierte App) den Bestand, lädt die Anwendung dessen
Stand nach, statt ihn mit dem eigenen älteren zu überschreiben (`useFremdeAenderung`).

### Projekteinstellungen
Vorlaufzeit für Erinnerungen, Arbeitstage/Feiertage und Absenderangaben sowie – wie im Reiter
*Planläufe* – der **Export**. Die
**E-Mail-Texte** (Betreff und Text) werden projektübergreifend unter
**Einstellungen › Vorlagen** in der Seitenleiste gepflegt; dort liegen auch die Excel-Vorlagen für die Importe.
Im Editor erscheinen Platzhalter als farbige **Bausteine** mit verständlicher Beschriftung
(„Anrede“, „Plannummer“, „Soll-Termin“, „SharePoint Eingang“ …) statt als `{{schluessel}}`;
gespeichert wird weiterhin der Text mit `{{schluessel}}`. Farbige Knöpfe unter
„Platzhalter einfügen“ – je Gruppe eine Farbe: Empfänger blau, Projekt und Plan grün, Termine orange, Versand
lila, Sonstiges grau – fügen einen Baustein an der Schreibmarke des zuletzt bearbeiteten Felds
(Betreff oder Text) ein; der Tooltip nennt Beschreibung und Beispielwert. Ein Baustein lässt sich
nur als Ganzes löschen (Rücktaste/Entf), Eingefügtes kommt als reiner Text an (darin enthaltene
`{{…}}` werden zu Bausteinen), unbekannte Platzhalter erscheinen grau als „unbekannt: …“. Daneben
zeigt eine Vorschau Betreff und Text mit Beispielwerten so, wie „Kopieren (formatiert)“ sie
aufbereitet; auf schmalen Bildschirmen wechselt man zwischen „Bearbeiten“ und „Vorschau“. Die
Vorlagenliste zeigt den Anlass als farbiges Abzeichen und den Anfang von Betreff und Text mit
Bausteinen.

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
Anmeldetermin laut Richtlinie vor („übernehmen“ unter dem Datumsfeld); Prozessphase, erster
Anmeldetermin, Inbetriebnahme und Status der Betreuung stehen in einer Zeile mit einzeiligen
Beschriftungen. Mit ★ markierte Projekte erscheinen in Übersicht und Seitenleiste.

**Erstanmeldung ausstehend:** Solange ein Projekt keine Anmeldung hat (Anmeldeleichen zählen nicht)
und nicht abgeschlossen ist, steht zwischen den Projektangaben und den Anmeldungen der Hinweis
„Erstanmeldung ausstehend“ mit Prozessphase und Terminfrist – dem ersten Anmeldetermin, sonst dem
Vorschlag laut Richtlinie. Dieselbe Frist erscheint als eigene Zeile unter **Termine & Nachhaken**
und in den anstehenden Terminfristen der **Übersicht** und zählt bei „überfällig“ mit.

**Anmeldebedarf:** Aus den betroffenen Fahrplanjahren berechnet die Anwendung je Jahr die Fristen
für SKM, MKM, KM N-2 und KM N-1 und ob dafür schon ein Eintrag besteht (ein Eintrag einer späteren
Phase deckt frühere ab, ein Eintrag im KM oder KKM beide KM-Fristen; Anmeldeleichen zählen nicht).
Was in die Vorschau fällt (Vorgabe 180 Tage), steht unter „Anmeldebedarf aus den Projekten“ in
Übersicht und Terminen. Die eigene Karte im Projekt ist entfallen.

### Anmeldung
Je Anmeldung eine Zeile im Projekt: Anmelde-ID (in Workflows mit ganzem Fahrplanjahr Begriff bzw.
tVE-Nr, weil es in SKM und MKM noch keine Anmeldungen gibt; im **SKM** führt der
**Vorhabenname**, die tVE-Nr steht darunter – bei älteren SKM-Einträgen übernimmt
„als Vorhabenname übernehmen“ im Dialog den bisherigen Begriff), **Titel** (Ort und Tätigkeit in
Stichworten, in BBPNeo „Titel“), **Mitwirkender BBK** (auch mehrere Namen, durch Komma getrennt),
**Anmelder** (wer die Anmeldung eingereicht hat), **Projektnummer (BBPNeo)** (DB-G-Nummer laut
Anmeldung), in Workflows mit Ril_KM die **KM-Runde** (N-2 = 2. KP, N-1 = 3. KP; leer – Ril_KM wählt
selbst), Maßnahmenart (SKM und MKM für die
Sammeleinträge dieser Phasen, sonst A, B(0), B(S), B, C, Container – dieselbe Art kann in mehreren
Phasen vorkommen, getrennt wird nach Workflow), Workflow und Status, Sperrzeitraum (ganzes
Fahrplanjahr oder tagesscharf – je nach Workflow), Terminfrist, Bemerkungen. Bf/Strecke und
Gewerk/Tätigkeit gibt es nicht mehr (Fassung 10; sie stehen seitdem im Titel). ÄAbst-Nr und AnnexVII-Kennzeichen sind nur in Status der Art „Änderungsabstimmung“
aktiv; endet sie, werden beide im Statusverlauf festgehalten und in der Anmeldung geleert.

Im Projekt stehen die Anmeldungen **je Workflow in einer eigenen Tabelle** (SKM, MKM, KM (n-2 &
n-1), KKM (unterjährig)) mit den Spalten Anmeldung, Sperrzeitraum, Status, **Zuständig**,
Terminfrist und **Sachstand** – dem Datum des letzten Abgleichs bzw. der letzten Änderung: der
jüngste Eintrag im Statusverlauf (Anlage, Statuswechsel, „Nachgehakt“ und andere Vermerke, je mit
ihrem Datum) oder die letzte Änderung der Merkmale („Bearbeiten“, Termin von Hand), was später liegt;
darunter Abstand zu heute und Anlass –, dazu **Status ändern** als Haken wie im Planlaufmanagement: Hat der Status nur einen
möglichen Nachfolger, wählt der Haken ihn direkt; bei mehreren öffnet er ein Menü „Welcher Status
folgt?“ (wie bei parallelen Schritten im Planlauf; zu Menüs siehe „Als App installieren“). In
den Anmeldungstabellen bleibt der Haken rechts stehen, wenn eine Tabelle quer scrollt. Bestätigt wird der Wechsel im Dialog des
Statuswechsels. „Zuständig“ nennt die Rolle des aktuellen Status samt Namen:
BBK mit den mitwirkenden BBK der Anmeldung, MIC mit dem Hauptbearbeiter, Projektleitung DB mit dem
Projektleiter des Projekts. In der zweiten Zeile stehen die Maßnahmenart (wo der Workflow mehrere
führt, KKM), die KM-Runde und der Titel. Jede Anmeldung belegt höchstens zwei Textzeilen; Längeres
wird gekürzt und steht vollständig im Tooltip. Der Status steht hier ohne den Workflow davor, weil
die Tabelle ihn nennt. Workflows ohne Anmeldung zeigen nur ihre Kopfzeile.

Die Seite einer Anmeldung ist wie ein Planlauf aufgebaut: der Weg durch die Workflows, darunter
die Status des aktuellen Workflows in ihrer Reihenfolge – erreichte mit Haken und Datum, der
aktuelle mit Terminfrist, Ampel und den möglichen Nachfolgern („Weiter mit“, „Übernahme in neue
Phase“, „Abschluss“ mit „Eintrag löschen“) und wer zuständig ist. Darunter Merkmale und
Statusverlauf. Oben rechts stehen **Bearbeiten**, **Duplizieren** und **Löschen**: Duplizieren legt
direkt hinter dem Original eine Kopie mit aktuellem Stand und Statusverlauf an (Vermerk „Dupliziert
aus …“, die führende Bezeichnung erhält „(Kopie)“, ohne Nummer wird „(Kopie)“ die Nummer) und
öffnet sie.

### Import aus BBPNeo
**Import aus BBPNeo** – ein eigener Punkt in der Seitenleiste zwischen *Projekte* und
*Einstellungen* (`#/baubetrieb/import`) – legt Anmeldungen aus dem Excel-Export von BBPNeo an
bzw. aktualisiert sie – **nur KM und KKM**. Die Spalten erkennt der Import an ihren Überschriften,
weil die Exporte von BBPNeo sie verschieden anordnen; im Export „Anmeldung (OS)“ sind es A
`Anmeldung::ID` (Anmelde-ID), F `Anmeldung::Anmelder`, G `Anmeldung::Fachstatus-ID` (Status im
Workflow), L `Anmeldung::Angemeldete Maßnahmenkategorie`, P/Q `Anmeldung::Bauzeitraum: Beginn`/`Ende`,
AC `Anmeldung::Mitwirkende BBK`, AG `Anmeldung::Projektnummern`, AH `Anmeldung::Prozessphase` und AJ
`Anmeldung::Titel`. Enthält die Datei mehrere solche Blätter, wählt man eines.

* **Je Anmelde-ID eine Anmeldung:** Der Export führt eine Anmeldung in mehreren Zeilen, die sich
  meist nur im Bauzeitraum unterscheiden. KaPlan nimmt den **frühesten Beginn** und das **späteste
  Ende** (ohne Uhrzeit); „Anmeldung-131437“ und „131437“ gelten als dieselbe ID.
* **Übersprungen** werden der Status **„Vorlage“**, andere Prozessphasen als „2. KP“ (KM N-2),
  „3. KP“ (KM N-1) und „KKM“ sowie Zeilen ohne Anmelde-ID.
* **Status zuordnen:** Je Phase (KM, KKM) und Status aus BBPNeo wählt man den Status in KaPlan –
  vorgegeben sind „Anmeldung in Bearbeitung“ → Angemeldet (fristgerecht), „Anmeldung bearbeitet“ →
  Genehmigt, „Anmeldung abgewiesen“ → Abgelehnt, jeweils im Standard-Workflow KM bzw. KKM. Andere
  Status stehen auf „– nicht importieren –“, bis man sie zuordnet. Die Zuordnung merkt sich KaPlan
  für den nächsten Import.
* **Projekte:** Neue Anmeldungen kommen in das Projekt, dessen **DB-G-Nummer** zur Projektnummer
  aus BBPNeo passt (z. B. G.016010101). Ohne Treffer schlägt der Dialog ein neues Projekt mit dieser
  DB-G-Nummer vor (Bezeichnung aus dem Anfang des Titels, änderbar); Anmeldungen ohne Projektnummer
  werden erst importiert, wenn man ihnen ein Projekt wählt.
* **Vorhandene Anmeldungen** derselben Anmelde-ID bleiben in ihrem Projekt und übernehmen alle
  Angaben aus BBPNeo (Maßnahmenart, Sperrzeitraum, Titel, Mitwirkender BBK, Anmelder,
  Projektnummer, KM-Runde); leere Angaben der Datei überschreiben nichts. Ein anderer Status wird
  als Statuswechsel mit dem Tag des Imports und dem Vermerk „Import BBPNeo (Status in BBPNeo: …)“
  gesetzt – auch wenn er kein Nachfolger des bisherigen ist – und lässt sich wie jeder Wechsel
  zurücknehmen. Neue Anmeldungen beginnen im zugeordneten Status („Aus BBPNeo importiert“).
* Die Seite gliedert sich in die Karten **Datei** und **Vorschau**. Die Vorschau zählt, was neu
  angelegt, aktualisiert (davon mit neuem Status), unverändert gelassen und übersprungen wird, und
  nennt je Anmeldung Phase, Sperrzeitraum, Status in BBPNeo und KaPlan sowie das Ergebnis;
  **Verwerfen** und **Importieren** stehen oben und unten. Nach dem Import meldet die Seite das
  Ergebnis (mit **Zu den Projekten**) und ist für die nächste Datei leer.

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
  Abgelehnt, Änderungsabstimmung, Anmeldeleiche), **Zuständig** (MIC, BBK, Projektleitung DB oder
  niemand – in den Standard-Workflows MIC für Entwurf, Zugestimmt, Genehmigt und Abgelehnt, die BBK
  für Mitwirkung, Angemeldet und Änderungen), Terminfrist, „Termin dient zum Nachhaken“, Bemerkung und
  **Nachfolgern**. Status lassen sich verschieben, ergänzen und entfernen; der erste ist der
  **Startstatus**. Ein Status, in dem noch Anmeldungen stehen, kann nicht entfallen, und der
  Sperrzeitraum eines Workflows bleibt fest, solange Anmeldungen darin stehen. Eine Kopie erhält
  „(Kopie)“ an Name und Kurzbezeichnung.
* **Nachfolger** sind Status desselben Workflows, Status eines anderen Workflows (**Übernahme in
  eine neue Phase**) oder **Eintrag löschen**. Beim Statuswechsel stehen nur sie zur Wahl – am
  Haken „Status ändern“ in Übersicht, Terminen und Projekt und auf der Seite der Anmeldung.
* **Anmeldeleiche:** Jeder Standard-Workflow endet mit dem Status **Anmeldeleiche** (erreichbar aus
  „Entwurf“ und „Abgelehnt“). Er ist ein gewöhnlicher Status mit Datum im Statusverlauf, wird
  **rot** angezeigt, hat keine Terminfrist und deckt keinen Anmeldebedarf mehr ab. Gelöscht wird
  erst im **nächsten Schritt** mit „Eintrag löschen“ – samt Statusverlauf und ohne Rückweg; bis
  dahin lässt sich der Wechsel in die Anmeldeleiche zurücknehmen. Ältere Bestände erhalten den
  Status beim Laden automatisch (Fassung 5).
* **Neu angelegt** wird immer im ersten Status eines Workflows. Ein Auswahlfeld, nach Phase
  gegliedert, legt Phase und Maßnahmenart zugleich fest (z. B. „KKM · B(S)“); vorbelegt ist
  „KKM · A“.
* **Übernahme in eine neue Phase:** Maßnahmenart, Anmelde-ID, Titel und Sperrzeitraum werden neu
  erfasst. Der Eintrag lässt sich dabei auf mehrere Anmeldungen **aufteilen** – die weiteren
  übernehmen die übrigen Angaben und verweisen auf ihn als Herkunft.
* **Statusverlauf:** Jeder Wechsel mit Datum (frei wählbar), Bearbeitung und Bemerkung; der Text
  des Status wird zum Zeitpunkt des Wechsels festgehalten. Der letzte Wechsel lässt sich
  **zurücknehmen** (der vorherige Stand samt Art, ID, Titel und Sperrzeitraum kehrt zurück), solange es
  den früheren Status noch gibt.

### Terminfristen und Nachhaken
Jeder Status trägt eine Terminfrist: **Frist laut Richtlinie** (Ril_SKM, Ril_MKM, Ril_KM N-2,
Ril_KM, Ril_KKM A oder Ril_KKM – im Lastenheft Ril_skm, Ril_pze, Ril_N-2, Ril_Nx, Ril_A und
Ril_X –, ggf. abzüglich einiger Tage, etwa „Ril_KKM − 14 Tage“), **nächster Stichtag** („Nächster
1.8.“ ab dem Statuswechsel), **Nachhak-Termin** (Tage nach dem Statuswechsel, je Status
einstellbar) oder **keine**; im Workflow-Editor ist die Auswahl nach Phase gegliedert. Die
Richtlinienfristen werden unter **Einstellungen › Fristen** gepflegt, nach Phase gegliedert – je Frist als
Stichtag TT.MM. im Jahr N − k des Fahrplanjahres oder als Wochen vor Sperrbeginn. **Die
vorbelegten Werte sind Platzhalter** und als solche gekennzeichnet, bis sie geändert oder als
„Geprüft“ bestätigt werden. **Ril_KM** nimmt die Frist der **KM-Runde**, wenn die Anmeldung sie
kennt (Prozessphase aus BBPNeo oder im Dialog gewählt: 2. KP = N-2, 3. KP = N-1); sonst die
N-2-Frist, solange sie am Tag des Statuswechsels nicht verstrichen ist und nicht vor dem ersten
Anmeldetermin des Projekts liegt, danach die N-1-Frist; der Rechenweg nennt den Grund. **Ril_KKM** richtet sich nach der Maßnahmenart
(Einträge der Art SKM oder MKM rechnen dabei wie A); ihr Stichtag ist ein Mittwoch – die Frist
fällt auf den Mittwoch an oder vor „Sperrbeginn minus Vorlauf“.
Das Fahrplanjahr N reicht vom Sonntag nach dem zweiten Samstag im Dezember N−1 bis zum zweiten
Samstag im Dezember N.

Die Ampel zeigt *Überfällig*, *Fällig* (Vorgabe 14 Tage vorher) und *Im Plan*; Status „zum
Nachhaken“ sind eigens gekennzeichnet. **Nachgehakt …** hält das Nachhaken mit Notiz und neuem
Termin fest, **Termin festlegen …** setzt die Frist im aktuellen Status von Hand.

### Ansichten
**Übersicht** (Kennzahlen, anstehende Terminfristen samt ausstehender Erstanmeldungen,
Anmeldebedarf, Projekte mit ihren Anmeldungen je Workflow), **Termine & Nachhaken** (alle Fristen
nach Projekten, je Projekt zuerst eine ausstehende Erstanmeldung, Filter
Überfällig/Fällig/Im Plan/Zum Nachhaken), **Projekte**, **Import aus BBPNeo** und – wie im Planlaufmanagement unter der
aufklappbaren Gruppe **Einstellungen** – **Workflows** und **Fristen** (Fristen laut Richtlinie,
Ampel und Nachhaken; früher die Seite „Einstellungen“, deren Adresse weiter gilt).
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
Projekts werden seine betroffenen Fahrplanjahre. Die Status der Standard-Workflows erhalten ihre
vorgegebene Zuständigkeit (Fassung 8). Fassung 9 ergänzt an den Anmeldungen den Anmelder und den
Tag der letzten Änderung der Merkmale (beide leer; gesetzt wird er nur bei einer tatsächlichen
Änderung – „Speichern“ ohne Änderung schließt den Dialog nur, ohne „Anmeldung gespeichert.“, und
lässt den Sachstand stehen). Fassung 10 ersetzt Bf/Strecke und Gewerk/Tätigkeit durch den Titel
(beim Umstellen „Bf/Strecke – Gewerk“), ergänzt Projektnummer (BBPNeo) und KM-Runde (leer) und die
Statuszuordnung des BBPNeo-Imports (Vorgabe). Name unter „Angemeldet als“ und
Farbmodus gelten in allen Bereichen; der Name steht im Statusverlauf und ist Hauptbearbeiter neuer
Projekte.

Gespeichert wird – wie im Planlaufmanagement und in den Leistungsnachweisen – nur, wenn der Bestand
einwandfrei geladen wurde (`ladeZustand === 'ok'`); vor jeder Umstellung auf eine neue Fassung
entsteht die Rohkopie `<Schlüssel>.vor-fassung-<n>`. Nach einem Ladefehler zeigt eine Hinweisleiste
**„Der gespeicherte Stand ließ sich nicht laden.“** mit **Gespeicherten Stand herunterladen** und
**Mit Demodaten neu beginnen** (Rückfrage „Mit Demodaten neu beginnen?“); stammt der Stand aus einer
neueren Fassung, **„Die gespeicherten Daten stammen aus einer neueren Fassung von KaPlan.“** mit
**Seite neu laden** – dann sind *Einspielen* (auch im Dialog) und *Zurücksetzen* gesperrt, und **Sicherung** lädt den
gespeicherten Stand unverändert herunter (`baubetrieb-gespeicherter-stand-<Datum>.json`, Datum nach
Ortszeit). Nach einem Lade- oder Fassungsfehler bietet auch der Dialog *Sicherung einspielen?* statt
*Aktuellen Stand sichern* **Gespeicherten Stand herunterladen** an. Wer über einen unlesbaren Stand
einspielt, behält eine Rohkopie `<Schlüssel>.vor-einspielen-<Zeitpunkt>` im Browser; passt sie nicht
in den Speicher, sagt der Dialog das und spielt erst auf **Ohne Kopie einspielen** ein. Der Abgleich mit
dem Projektregister ruht, solange der Stand nicht geladen ist. Ist der Speicher des Browsers voll,
räumt das Speichern die Rohkopien einzeln wie im Planlaufmanagement und meldet sonst **„Nicht gespeichert – bitte Sicherung
herunterladen.“** mit **Sicherung herunterladen** (`components/Hinweisleisten.tsx`). Speichert ein
anderes Fenster denselben Bereich, lädt der Store dessen Stand nach (`useFremdeAenderung`).

## Projektsteuerung

Erster Entwurf für die externe Projektsteuerung. Aufbau und Gestaltung folgen dem
Planlaufmanagement: Seitenleiste mit **Übersicht**, **Projekte** und der einklappbaren Gruppe
**Einstellungen** mit den **Funktionen**, darunter die markierten Projekte; im Projekt zwei Seiten –
**Projektbeteiligte** und **Protokolle**.
Die Protokolle übernehmen die Funktionen des bisherigen eigenständigen Protokoll-Tools
(HTML-Datei), in der Optik von KaPlan.

### Funktionen
Projektübergreifende Funktionen (Bezeichnung, Gewerk, Kürzel, Farbe, Beschreibung) – die Auswahl,
aus der jede Person der Projektbeteiligtenliste ihre Funktion erhält. Gegliedert wie im
Planlaufmanagement: eine Seite **Übergreifend** und je **Gewerk** eine eigene; „Fachplanung“ im
Gewerk LST ist eine andere Funktion als „Fachplanung“ in OLA und erscheint überall als
„Fachplanung LST“. Über das **+** an den Reitern entsteht ein Gewerk, **Vorhandene Funktion**
übernimmt eine Funktion aus einem anderen Gewerk, **Gewerk … löschen** entfernt ein Gewerk samt
seinen Funktionen. Mitgeliefert sind typische Funktionen einer DB-Baumaßnahme (übergreifend etwa
Auftraggeber, Projektleitung, Teilprojektleitung, Projektsteuerung, Objektplanung, Bauüberwachung,
Bauunternehmen, Prüfsachverständiger, Eisenbahn-Bundesamt; je Gewerk 50 Hz, KIB, LST, OLA und TK
die Fachplanung, für LST und OLA zusätzlich die Bauüberwachung). Funktionen und Gewerke, die noch
Projektbeteiligten zugeordnet sind, lassen sich nicht löschen.

### Projektbeteiligte
Aufgebaut wie die Seite **Funktion** im Planlaufmanagement, aber ohne leere Funktionen: Es stehen
nur Personen in der Liste, je Person mit ihrer Funktion, Firma/Büro, Kürzel und Kontaktdaten.
Beim Hinzufügen wird die Funktion aus einem Auswahlfeld gewählt, nach Gewerk gruppiert;
**+ Neue Funktion anlegen …** legt dort gleich eine neue projektübergreifende Funktion an. Ohne
eigenes Kürzel gilt das der Funktion. Reiter gliedern die Liste nach den Gewerken, die im Projekt
vorkommen. Die Liste lässt sich drucken (PDF) und als Excel-Datei herunterladen.

**Excel-Import** liest eine Liste (.xlsx oder .csv) mit den Spalten Funktion, Gewerk, Kürzel,
Anrede, Vorname, Nachname, Firma / Büro, E-Mail, Telefon, Mobil, Anschrift, Notiz; zwingend ist nur
der Nachname (oder eine Spalte „Name“ mit Vor- und Nachnamen). Gelesen wird das erste Blatt mit
Kopfzeile und Personen – ein vorangestelltes Hinweis- oder Deckblatt wird übersprungen. Die Vorschau nennt je Zeile, ob die
Person neu ist oder aktualisiert wird (gleicher Name im Projekt) und ob Funktion oder Gewerk neu
angelegt werden. **Vorlage** lädt eine leere Datei mit diesen Spalten; die Excel-Ausgabe der
Beteiligtenliste hat dieselben Spalten und lässt sich so in ein anderes Projekt übernehmen.

### Protokolle
Je Besprechung (z. B. Baubesprechung, Jour fixe) eine **Protokollreihe**. Ein Protokoll besteht
aus Kopfdaten (Besprechung, Nr., Datum, Beginn, Ende, Ort, nächster Termin, Protokollführung,
zusätzlicher Verteiler), den **Teilnehmenden**, der **Tagesordnung** mit Einträgen vom Typ
**I** (Information), **F** (Festlegung) und **A** (Aufgabe, mit Verantwortlich, Termin und
Erledigt) und einem Hinweis am Ende. **Verantwortlich** wird aus den Teilnehmenden des Protokolls
gewählt und erscheint mit ihrem Kürzel.

* **Teilnehmende** kommen aus der Projektbeteiligtenliste (**Aus Beteiligtenliste …**, auch mit
  **Neue Person …**); Name, Funktion, Firma und Kürzel werden dort gepflegt und im Protokoll
  nachgezogen. **Weitere Person** nimmt Gäste ohne Eintrag auf; über das Personensymbol lassen
  sie sich nachträglich in die Projektbeteiligtenliste übernehmen. Die Protokollführung wird aus
  den Teilnehmenden oder der Projektbeteiligtenliste gewählt; bei einer neuen Reihe übernimmt sie
  die angemeldete Person, sofern ihr Name in der Projektbeteiligtenliste steht.
* **Folgeprotokoll anlegen** übernimmt Kopfdaten, Teilnehmende und Tagesordnung mit allen
  Einträgen; Datum ist der „nächste Termin“. Ein Eintrag besteht aus **Zeilen**: Übernommene
  Zeilen stehen fest (✎ korrigiert sie), eine Ergänzung kommt als neue Zeile in ein eigenes Feld.
  Unter jeder übernommenen Zeile steht ihr Ursprung – in Protokoll Nr. 3 etwa unter der ersten
  Zeile „aus Prot. 1“ und unter der in Nr. 2 ergänzten „aus Prot. 2“. Im Druck erscheinen neue und
  gegenüber dem Vorprotokoll geänderte Angaben **blau**.
* **Ergänzungen mit eigener Art**: Unter einer Ergänzung lässt sich **I**, **F** oder **A** wählen
  – mit eigenem Verantwortlich, bei einer Aufgabe auch Termin und Erledigt. Im Druck steht sie in
  einer eigenen Tabellenzeile unter ihrem Eintrag. Ohne Auswahl läuft sie **unter dem Ursprung
  mit** und teilt dessen Art, Verantwortlich und Termin; ein zweiter Klick auf die gewählte Art hebt
  die Auswahl auf. Aufgaben aus Ergänzungen erscheinen in der Übersicht. Ist der Ursprung erledigt,
  laufen offene Ergänzungen mit eigener Art weiter; sobald der Ursprung entfällt, wird die erste
  von ihnen zum Eintrag.
* **Einträge verschieben**: Die Pfeile am rechten Rand rücken einen Eintrag eine Stelle nach oben
  oder unten; am Anfang bzw. Ende seines Tagesordnungspunkts wechselt er ans Ende des vorigen bzw.
  an den Anfang des nächsten. Die Nummern folgen der neuen Reihenfolge.
* **Löschen heißt Durchstreichen** (Standard) – für Tagesordnungspunkte, Einträge und einzelne
  Zeilen (sobald ein Eintrag mehr als eine hat): Der Papierkorb bietet **Durchstreichen** und
  **Sofort löschen**. Gestrichenes steht im Druck und in der Live-Druckansicht dieses Protokolls
  mit **blauer Linie** durchgestrichen – der Text bleibt schwarz – und **entfällt im
  Folgeprotokoll**; ein gestrichener Tagesordnungspunkt nimmt seine Einträge mit. Erledigte
  Aufgaben stehen im Protokoll der Erledigung blau, im Folgeprotokoll noch einmal schwarz
  durchgestrichen und entfallen danach. Die Termin-Spalte nennt „entfällt“ bzw. „erledigt“.
  **Wiederherstellen** hebt das Streichen auf; **Sofort löschen** entfernt ohne Spur.
* **Druckansicht**, **Drucken / PDF** (Druckdialog des Browsers, „Als PDF speichern“) und
  **Live-Druckansicht ↗** – ein eigenes Fenster, etwa für den zweiten Bildschirm in der
  Besprechung, das jeder Eingabe folgt.
* **Logos im Druckkopf** je Projekt – Standard sind DB InfraGO und Mailänder Consult; eigene
  Bilder werden verkleinert im Bestand gespeichert. Jede **Protokollreihe** kann über **Logos …**
  eigene Logos führen; ohne eigene gelten die des Projekts (**Logos des Projekts** stellt das
  wieder her). Die Beteiligtenliste druckt stets mit den Logos des Projekts.
* **Aus Protokoll-Tool** übernimmt Dateien des bisherigen Protokoll-Tools (`.protokoll` oder
  dessen Sicherung `.json`) in das Projekt. Teilnehmende, deren Name in der
  Projektbeteiligtenliste steht, werden mit ihr verknüpft; ein erneuter Import ersetzt die
  Protokolle, statt sie zu verdoppeln.

### Übersicht
Nur die **eigenen To-Dos**: offene Aufgaben der Protokolle aller markierten Projekte (Einträge vom
Typ A und Ergänzungen mit eigener Art „Aufgabe“), deren Verantwortlich die Person unter
**Angemeldet als** nennt – mit ihrem Kürzel oder Namen aus der Projektbeteiligtenliste oder den
Teilnehmenden; Groß- und Kleinschreibung zählen nicht. Steht der Name in keiner
Projektbeteiligtenliste der angezeigten Projekte, weist die Übersicht darauf hin. Kennzahlen
(aktive Projekte, meine To-Dos, überfällig, demnächst fällig – 7 Tage vorher), die Liste
**Meine To-Dos**, Überfälliges zuerst, mit **Erledigt** je Zeile;
dazu die Projekte mit Beteiligten, Protokollen, letzter Besprechung, nächstem Termin und ihren
eigenen To-Dos. Die Seitenleiste zählt die eigenen To-Dos an **Übersicht** und die überfälligen
Aufgaben je Projekt.

### Daten
Eigener Schlüssel `projektsteuerung.data.v1` im `localStorage`, eigene Demodaten (zwei Projekte
mit Projektbeteiligten und zwei Protokollen, darunter Aufgaben der Projektsteuerin Lena Roth – wer
unter „Angemeldet als“ „Lena Roth“ einträgt, sieht sie als eigene To-Dos), **Sicherung**/**Einspielen** (JSON mit dem
Kennzeichen `"bereich": "projektsteuerung"`; Sicherungen der anderen Bereiche und des
Protokoll-Tools werden mit Hinweis abgewiesen) und **Zurücksetzen**. Stände der ersten Fassung
erhalten beim Laden die mitgelieferten Gewerke; ihre Funktionen gelten als übergreifend. Ältere
Stände kennen keine gestrichenen Einträge – ihre Einträge gelten als nicht gestrichen. Bis
Fassung 3 bestand ein Eintrag aus Text und Ergänzung: Beim Laden wird der Text eine Zeile aus dem
Protokoll seiner Fundstelle („Prot. 2, Pkt. 1.3“ → „aus Prot. 2“), die Ergänzung eine neue Zeile.
Bis Fassung 4 führte jedes Projekt eine Liste offener Punkte (LOP); sie entfällt beim Laden samt
den Verweisen der Aufgaben, vorhandene Zeilen laufen unter dem Ursprung mit. Die frühere Adresse
`#/projektsteuerung/projekt/<id>/lop` führt zu den Protokollen. Bis Fassung 5 galten für alle
Protokollreihen die Logos des Projekts; daran ändert das Laden nichts. Name unter „Angemeldet als“
und Farbmodus gelten in allen Bereichen.

Gespeichert wird – wie im Planlaufmanagement und in den Leistungsnachweisen – nur, wenn der Bestand
einwandfrei geladen wurde (`ladeZustand === 'ok'`); vor jeder Umstellung auf eine neue Fassung
entsteht die Rohkopie `<Schlüssel>.vor-fassung-<n>`. Nach einem Ladefehler zeigt eine Hinweisleiste
**„Der gespeicherte Stand ließ sich nicht laden.“** mit **Gespeicherten Stand herunterladen** und
**Mit Demodaten neu beginnen** (Rückfrage „Mit Demodaten neu beginnen?“); stammt der Stand aus einer
neueren Fassung, **„Die gespeicherten Daten stammen aus einer neueren Fassung von KaPlan.“** mit
**Seite neu laden** – dann sind *Einspielen* (auch im Dialog) und *Zurücksetzen* gesperrt, und **Sicherung** lädt den
gespeicherten Stand unverändert herunter (`projektsteuerung-gespeicherter-stand-<Datum>.json`). Wie in
der Baubetriebsplanung bietet der Dialog *Sicherung einspielen?* nach einem Lade- oder Fassungsfehler
**Gespeicherten Stand herunterladen** an, hinterlässt beim Einspielen über einen unlesbaren Stand die
Rohkopie `<Schlüssel>.vor-einspielen-<Zeitpunkt>` und fragt mit **Ohne Kopie einspielen** nach, wenn
sie nicht in den Speicher passt. Der Abgleich mit
dem Projektregister ruht, solange der Stand nicht geladen ist. Ist der Speicher des Browsers voll,
räumt das Speichern die Rohkopien einzeln wie im Planlaufmanagement und meldet sonst **„Nicht gespeichert – bitte Sicherung
herunterladen.“** mit **Sicherung herunterladen** (`components/Hinweisleisten.tsx`). Speichert ein
anderes Fenster denselben Bereich, lädt der Store dessen Stand nach (`useFremdeAenderung`).

## Leistungsnachweise

Erster Entwurf, übernommen aus dem Testprojekt *KaPlan-Test*. **Im Bereich werden nur Leistungen
erfasst und beschrieben:** Jede Person erfasst ihre eigenen Leistungen je Projekt, verfasst mit den
anderen Beteiligten je Zeitraum den gemeinsamen Leistungstext und bestätigt ihre Monate; daraus
entstehen von selbst gemeinsame Leistungsnachweise für den Auftraggeber. Leistungsnachweise und
Einstellungen der Projekte gibt es nur im [Controlling](#controlling-der-leistungsnachweise) – dort
werden sie bearbeitet, abgerechnet, abgeschlossen und exportiert.

### Anmeldung
**Angemeldet als** unten in der Seitenleiste ist derselbe Name wie in allen Bereichen – eine eigene
Anmeldung gibt es in den Leistungsnachweisen nicht. Leistungen erfasst, wer unter diesem Namen (Vor-
und Nachname, auch „Nachname, Vorname“) als aktiver Mitarbeiter geführt ist. **Fehlt die Person, legt
der Bereich sie selbst an** (aktiv, Kürzel aus dem Namen; `anmeldungAnwenden`) – mit einer aus dem
Namen abgeleiteten Kennung, sodass zwei Fenster keine Doppel erzeugen, und nur, solange der
gespeicherte Stand einwandfrei geladen ist; das Controlling legt niemanden an. Eine früher als
ausgeschieden markierte Person dieses Namens setzt der Bereich ebenso wieder aktiv – eine Seite zum
Pflegen der Mitarbeiter gibt es nicht. Wechselt der Name
danach, entfernt der Bereich die unter dem bisherigen Namen angelegte Person wieder, solange sie
keine Leistungen hat, in keinem abgeschlossenen Nachweis steht und noch so ist, wie der Bereich sie
angelegt hat (noch der bisherige Name und das Kürzel aus dem Namen) – ein Tippfehler unter
„Angemeldet als“ hinterlässt so keinen Mitarbeiter. Übrig bleiben
Hinweise über dem Inhalt: Der Name hat keinen Nachnamen (bitte unten links Vor- und Nachnamen
eintragen), er gehört einem ausgeschiedenen Mitarbeiter (nur, solange der gespeicherte Stand nicht
geladen ist; ist er geladen, setzt der Bereich die Person wieder aktiv), das Controlling hat die unter dem Namen
angelegte Person umbenannt (der Hinweis nennt den neuen Namen; angelegt wird niemand), oder der
gespeicherte Stand ist nicht geladen. *Leistung erfassen* und *Excel-Import* zeigen den
Hinweis dann als Kurzmeldung statt eines Dialogs; *Leistungstexte* und *Meine Leistungen* sagen
„Nicht als Mitarbeiter angemeldet“. Eine Rolle
„Controlling“ an Mitarbeitern gibt es – anders als im Testprojekt – nicht: Das Controlling ist der
PIN-geschützte Controlling-Bereich.

### Übersicht und Projekte
Die **Übersicht** zeigt die eigenen Stunden und Leistungen des Monats, die eigenen Stunden im Jahr,
den Kalender **Mein Kalender** mit allen eigenen Leistungen über alle Projekte (siehe
[Kalender](#kalender)), die Karte **Offene Bestätigungen** (je Projekt und Monat mit eigenen
Leistungen, der noch nicht bzw. nach einer Änderung nicht erneut bestätigt ist, eine Zeile mit
Projekt, Monat – der laufende ist gekennzeichnet –, eigenen Stunden, Status und der Zahl der
Zeiträume ohne Leistungstext; ein Klick öffnet die Leistungstexte des Projekts in diesem Monat; ist
nichts offen, sagt das ein Satz), die zuletzt erfassten eigenen Leistungen (ein Klick öffnet die
Leistungstexte ihres Monats) und je Projekt die eigenen Stunden des Monats. Gibt es kein nicht archiviertes Projekt, steht der Kalender trotzdem da (eigene
Leistungen lassen sich öffnen), darüber ein Hinweis, dass Projekte das Controlling anlegt bzw. dass
alle archiviert sind – erfassen lässt sich dann weiterhin im archivierten Projekt unter *Projekte ›
Archiv*. Der Hinweis „Kein Projekt markiert – es werden alle angezeigt.“ erscheint, wenn
es nicht archivierte Projekte gibt und keines davon markiert ist (auch in einem anderen Bereich
markierte zählen als markiert). Die
**Projektliste** legt nichts an: Jedes Projekt der anderen Bereiche und des Controllings steht von
selbst hier (Projektregister); unbekannte Projekte legt auch der Excel-Import an. Ein Projekt
(Projektliste, Seitenleiste, Übersicht) zeigt unter Projektnummer, Status und Leistungsbereich zwei
Reiter wie in den anderen Bereichen:
**Leistungstexte** (Vorgabe, siehe [Leistungstexte und Monatsbestätigung](#leistungstexte-und-monatsbestätigung))
und **Meine Leistungen** – die eigenen Leistungen, zuerst im Kalender, mit dem Umschalter **Liste**
als Tabelle mit Filtern und Auswahl. Die Ansicht steht in der Adresse: `#/leistungsnachweise/projekt/<id>`
(Leistungstexte im Vorgabemonat), `…/projekt/<id>/<JJJJ-MM>` (Leistungstexte dieses Monats) und
`…/projekt/<id>/leistungen` (Meine Leistungen); zurück aus *Meine Leistungen* geht es in den zuletzt
gezeigten Monat. Frühere Adressen der Reiter (`…/projekt/<id>/nachweise` usw.) zeigen die
Leistungstexte, die eines Nachweises (`…/projekt/<id>/nachweis/<id>`) führt im Controlling auf die
Seite des Projekts mit diesem Leistungsnachweis. Ein Wechsel der Ansicht oder des Monats beginnt
oben auf der Seite.

### Kalender
Ein großer Monatskalender (Montag bis Sonntag) zeigt je Tag die eigenen Leistungen mit Stunden und
Text sowie die Tagessumme, rechts je Woche die Kalenderwoche und ihre Summe; Wochenenden und Tage
außerhalb des Monats sind zurückgenommen, heute ist hervorgehoben. **Ein Klick auf einen Tag
erfasst dort eine Leistung**, ein Klick auf eine Leistung öffnet sie zum Bearbeiten; auf Geräten
ohne Maus steht das Plus in jedem Tag dauerhaft da. Mit den Pfeilen
geht es einen Monat vor oder zurück, **Heute** springt in den laufenden Monat. In der Übersicht
umfasst der Kalender alle Projekte – jede Leistung nennt ihre Projektnummer, und der Dialog fragt
das Projekt ab (vorgewählt ist das der zuletzt erfassten Leistung; zur Wahl stehen nur nicht
archivierte Projekte). Ist der Kalender schmal – bis 730 px Kalenderbreite, also auch neben der
Seitenleiste bis etwa 1036 px Fensterbreite (Container-Abfrage) –, zeigt jeder Tag nur seine Stunden:
Ein leerer Tag erfasst direkt, ein Tag mit Stunden öffnet erst die Liste seiner Leistungen
(Wochentag und Datum, Stunden und Zahl der Leistungen) mit **Neue Leistung** und **Schließen**; ein
Eintrag darin öffnet die Leistung.

### Leistungen
Eigene Leistungen von Hand erfassen (Datum, Text, Stunden, Abschnitt) oder per **Excel-Import** aus
dem Export der Zeiterfassung übernehmen – auch mehrere Projekte je Datei. Unbekannte Projekte und
fehlende Abschnitte (Spalte J „Projektelement“) legt der Import an, doppelte Zeilen überspringt er,
frühere eigene Importe im Zeitraum der Datei lassen sich ersetzen – ist eine ersetzte Leistung schon
abgerechnet oder nachgereicht, übernimmt die neue Zeile derselben Person für dasselbe Projekt und
denselben Tag ihre Kennung, sodass sie nicht doppelt abgerechnet wird; weicht ihr Inhalt ab, gilt
sie als nach dem Abschluss geändert (siehe „Abgerechnete Zeiträume“). Im Bereich übernimmt jede
Person nur ihre eigenen Zeilen; Leistungen anderer ändert niemand. Projekte (nur mit dem Haken
„Projekt anlegen“) und Abschnitte legt der Import auch im Bereich an, soweit die eigenen Leistungen
sie brauchen; einstellen lassen sie sich nur im Controlling. Betrifft ein Import genau ein Projekt,
geht es danach zu dessen Leistungstexten im jüngsten Monat der übernommenen Leistungen, sonst zur
Übersicht.

Wird eine schon abgerechnete Leistung auf ein anderes Datum gelegt, bleibt sie im abgeschlossenen
Nachweis – der Dialog sagt das an („Bleibt im abgeschlossenen Leistungsnachweis … abgerechnet“); mit
dem neuen Datum erscheint sie erst, wenn das Controlling ihn wieder öffnet.

### Leistungstexte und Monatsbestätigung
Jede Person erfasst bzw. importiert ihre Stunden mit ihren **Stichpunkten** (dem Text der Leistung).
Daraus schreiben alle, die in einem Zeitraum eines Projekts Leistungen haben, **einen gemeinsamen
Fließtext**; beide bzw. alle sehen und bearbeiten ihn. Gemeinsam ist allein dieser Text:
**Stichpunkte, Stunden und Leistungen der anderen sieht im Bereich niemand** – auch nicht in
Zeiträumen mit eigenen Leistungen und auch nicht als Zahl; im Controlling ist alles zu sehen.
Ausnahme, solange alles nur lokal im Browser liegt: **Sicherung** in der Seitenleiste des Bereichs
lädt den gesamten Bestand der Leistungsnachweise als JSON herunter – samt den Leistungen aller
Mitarbeiter –, und **Einspielen** bzw. **Zurücksetzen** ersetzen ihn ganz.

Die Zeiträume folgen dem **Raster des Projekts**, das das Controlling einstellt (tages-, wochen- oder
monatsscharf), gekürzt auf den Kalendermonat: Eine Woche über ein Monatsende gehört mit ihren Tagen
in jeden Monat für sich (26.–31.10. im Oktober, 1.11. im November); im Leistungsnachweis über beide
Monate bleibt sie eine Zeile, deren Text sich aus beiden zusammensetzt. Geteilt wird zudem an den
Grenzen der Leistungsnachweise (an jedem Beginn und am Tag nach jedem Ende) – jeder Zeitraum liegt
in höchstens einem Nachweis. Ändern sich diese Grenzen (etwa durch Löschen eines Nachweises,
Zusammenfassen, ein Abschließen bis heute mitten in einem Zeitraum oder einen Nachweis, der
mit einer späteren Leistung bis zum Monatsende wächst), ziehen die Texte mit: Der Text eines weggefallenen Teils geht im
Text des ganzen Zeitraums auf – waren alle Teile so bestätigt, gilt die Bestätigung für den ganzen
Zeitraum weiter –; bei einer neuen Grenze behält der erste Teil den Text, der Rest bekommt einen
eigenen (Pflicht), und die Bestätigungen der Personen mit Leistungen darin erlöschen. Die
Rückfragen im Controlling nennen beides vorher.

Der Reiter **Leistungstexte** eines Projekts zeigt einen Monat in zwei Blöcken (ohne Angabe in der
Adresse der jüngste Monat mit eigenen Leistungen, der noch zu bestätigen ist, sonst der jüngste mit
eigenen Leistungen, sonst der laufende). Der Block **Leistungstexte** nennt im Kopf die eigenen
Stunden und die Zahl der Zeiträume, das Raster, den Stand des Monats als Kennzeichen („Offen“,
„Bestätigt am …“, „Geändert seit Bestätigung“ oder „Abgerechnet“) und die Monatswahl (‹ ›
blättern); darunter stehen ein kurzer Erklärsatz und nicht gespeicherte Eingaben (siehe unten). Im
selben Block folgen, durch Linien getrennt, alle Zeiträume des Monats mit eigenen Leistungen:
Zeitraum, **eigene Stunden**, die **eigenen Stichpunkte** zur Orientierung – in festen Spalten
*Datum*, *Std.* und *Stichpunkt* mit Kopfzeile, bündig über alle Zeilen und Zeiträume, auch bei
400 px Breite (dazu der Abschnitt; ein Klick öffnet die Leistung) – und der **gemeinsame
Leistungstext** – gespeichert beim
Verlassen des Felds (offene Eingaben auch beim Neuladen, Schließen, Verdecken der Seite und beim
Monatswechsel) mit „Zuletzt bearbeitet von … am …“. Hat inzwischen jemand anderes – etwa in einem
zweiten Fenster – den Text gespeichert, sagt das Feld es an („Inzwischen von … geändert – Ihre
Eingabe wird beim Verlassen des Felds mit dieser Fassung zusammengeführt.“), und gespeichert wird
die Zusammenführung beider Fassungen mit einer Kurzmeldung – keine geht still verloren. Zusammengeführt
wird dreiseitig (`texteDreiseitig`): Was der andere gelöscht hat, kehrt nicht zurück; aus der eigenen
Eingabe kommen nur die eigenen Ergänzungen hinzu, und eigene Streichungen gelten auch für die andere
Fassung. Hat die Eingabe netto nichts geändert, gilt die Fassung des anderen („… Ihre Eingabe ändert
nichts daran; beim Verlassen des Felds gilt diese Fassung.“). Entfällt der
Zeitraum einer offenen Eingabe (ein anderes Fenster ändert die Grenzen), zieht sie mit ihren eigenen
Änderungen in den Zeitraum um, der ihren Beginn jetzt enthält; lässt sie sich gar nicht speichern (keine eigenen Leistungen mehr
darin, inzwischen abgerechnet), steht sie als **„Nicht gespeichert (…)“** mit **Verwerfen** über den
Zeiträumen. **Stichpunkte übernehmen** setzt in einen leeren
Text die eigenen Stichpunkte ein; kommen danach eigene Leistungen hinzu, nennt der Block sie („Noch
nicht im Text“) mit **Neue Stichpunkte ergänzen** und **Als berücksichtigt markieren** (wenn sie
umformuliert schon im Text stehen). Fremde Stichpunkte gelangen nie in diese Vorschläge; ein
unveränderter Neuimport gilt als schon berücksichtigt.

Darunter steht der Block **Monat bestätigen**: der Stand des Monats („Noch nicht bestätigt“, „Seit der
Bestätigung am … geändert – bitte erneut bestätigen.“ oder „Abgerechnet“, im laufenden Monat mit dem
Zusatz, ihn erst zu bestätigen, wenn er vollständig erfasst ist), die Hinweise zu Leistungen nach
dem Abschluss bzw. anderswo abgerechneten Leistungen (siehe „Abgerechnete Zeiträume“), der Satz „Ich
bestätige, dass meine Stunden und die Leistungstexte für … vollständig erfasst sind.“ und der Knopf
**Monat bestätigen** – nutzbar erst, wenn **jeder Zeitraum mit eigenen Leistungen einen gemeinsamen
Text hat**; bis dahin nennt der Block die fehlenden (ein Klick führt ins Feld). Am Ende verweist
**Noch zu bestätigen:** auf weitere offene Monate des Projekts. Nach dem Bestätigen steht dort
„Bestätigt am …“ mit **Bestätigung zurücknehmen** (ein Doppelklick bestätigt nicht und nimmt gleich
wieder zurück). **Die Bestätigung erlischt**, sobald sich in einem noch nicht abgerechneten Zeitraum
die eigenen Leistungen (Datum, Stunden, Abschnitt, Text) oder der gemeinsame Text ändern – auch, wenn
ein anderer den Text ändert –, und wenn eine neue Grenze eines Leistungsnachweises einen Zeitraum mit
eigenen Leistungen teilt; dann heißt es „Seit der Bestätigung am … geändert – bitte erneut
bestätigen.“. Gehen bestätigte Teile dagegen nur in einem Zeitraum auf, bleibt sie bestehen – außer
der zusammengeführte Text bringt Text aus einem Teil mit, den die Person nicht bestätigt hat (ein Teil
ohne eigene Leistungen): Dann hat sich der Text für sie geändert, und sie erlischt. Verglichen werden
Sätze bzw. ihre Teile: Stehen nur Sätze darin, die sie in ihren Teilen bestätigt hat, bleibt sie
bestehen, auch wenn sie in anderer Reihenfolge stehen. Hat ein
Monat keine eigenen Leistungen, verweist der Block *Leistungstexte* auf *Meine Leistungen* und den
Excel-Import; *Monat bestätigen* steht dann nur, wenn weitere Monate offen sind.

**Abgerechnete Zeiträume:** Umfasst ein abgeschlossener Leistungsnachweis einen Zeitraum, ist sein
Text nur noch zu lesen („Abgerechnet in „…“ – der Leistungstext lässt sich nicht mehr ändern.“ –
klein mit Schloss unter dem Text), und
er zählt nicht mehr zur Bestätigung – auch spätere Änderungen darin lassen sie nicht erlöschen. Sind
alle eigenen Leistungen eines Monats abgerechnet, steht der Monat auf „Abgerechnet“. Eigene
Leistungen, die nach dem Abschluss in einem abgerechneten Zeitraum **erfasst** wurden, nennt ein
Hinweis im Block *Monat bestätigen*: Sie gehen nicht in den abgeschlossenen Nachweis ein, über ein Nachreichen entscheidet das
Controlling. Ebenso nennt er abgerechnete Leistungen, die nach dem Abschluss **geändert** wurden –
von Hand oder durch einen Neuimport mit „Frühere eigene Importe im Zeitraum ersetzen“ – und jetzt
anders sind als im festgeschriebenen Stand (Stichpunkt „nach dem Abschluss geändert“): Abgerechnet
bleibt der Stand des Abschlusses, die Änderung geht erst ein, wenn das Controlling den Nachweis wieder
öffnet. Wer auf den abgerechneten Wert zurückändert, hebt den Hinweis wieder auf (der Stand merkt sich
dazu Datum, Stunden, Abschnitt und Text jeder abgerechneten Leistung; in früher abgeschlossenen
Nachweisen zählt allein, ob sie danach geändert wurde). Ordnet das Controlling Abschnitte neu zu –
es entfernt einen Abschnitt oder legt *Abschnitte aus Projektelementen* an –, zieht der Abschnitt im
Stand mit: Das zählt nicht als Änderung der Person. Wird eine abgerechnete
Leistung nach dem Abschluss auf einen Tag außerhalb ihres Nachweises gelegt, bleibt sie dort
abgerechnet und zählt in keinem Zeitraum – weder zu den eigenen Stunden noch zur Bestätigung, einen
Text verlangt sie nicht; ein Hinweis nennt sie („Ihre Leistung vom … ist bereits in „…“
abgerechnet …“). Abgeschlossene Nachweise gliedern ihre Tage weiter im Raster ihres Abschlusses,
auch wenn das Projekt später umgestellt wird.

### Leistungsnachweise
Ein Nachweis ist ein Zeitraum eines Projekts; welche Leistungen er zeigt, ergibt sich aus ihrem
Datum – außer nachgereichten Leistungen, die ein späterer Nachweis nach Rückfrage übernommen hat
(siehe „Nicht erfasste Leistungen“), und Leistungen, die schon im Stand eines anderen
abgeschlossenen Nachweises stehen: Abgerechnet bleibt abgerechnet (`leistungenDesNachweises`,
`nachweisDerLeistung`). **Einen Abrechnungsrhythmus gibt es nicht** (seit Fassung 9): Erfasste
Leistungen sammeln sich je Projekt im **offenen Leistungsnachweis** – wie in einer Excel je
Projekt –, bis das Controlling ihn abschließt. Fehlt für eine Leistung ein Nachweis, entsteht er
beim Erfassen oder Importieren von selbst: Ist der letzte Nachweis des Projekts vor dem Tag der
Leistung noch offen und sein Ende nicht von Hand festgelegt, wächst er bis zum Monatsende der
Leistung mit; sonst entsteht ein neuer ab dem Monatsanfang (`nachweiseErgaenzen`). Bis zum
Abschließen nennt ihn sein Kopf im Controlling – solange sein Ende nicht festgelegt ist – „seit … ·
läuft bis zum Abschließen“.

**Den Umfang legt erst das Abschließen fest:** Im Schritt *Abschließen und PDF* (siehe
[Controlling der Leistungsnachweise](#controlling-der-leistungsnachweise)) wählt das Controlling,
bis wann der Nachweis reicht – statt eines freien Datums steht **jedes Monatsende** ab seinem
Beginn bis heute zur Wahl, höchstens bis zu seinem bisherigen Ende, dazu **bis heute** bzw. das
bisherige Ende, wenn es vor heute liegt und kein Monatsende ist (`abschlussEnden`). Vorgeschlagen
ist das letzte Monatsende, meist das Ende des Vormonats (`abschlussVorschlag`). Der Nachweis endet
dort, und **spätere Leistungen laufen im nächsten weiter** – sie kommen in einen neuen offenen
Nachweis. Wird am Monatsende keiner abgeschlossen, läuft der offene einfach weiter; eine
Fälligkeit oder eine Entscheidung „weiterlaufen lassen“ gibt es nicht. Einen Dialog *Zeitraum
ändern* gibt es nicht (mehr); ein früher von Hand festgelegtes Ende älterer Stände bleibt: Der
Nachweis wächst dann nicht mehr mit, spätere Leistungen kommen in einen neuen, und beim Abschließen
reicht die Wahl höchstens bis zu diesem Ende. Abgeschlossene Nachweise bleiben stets unverändert.

Je Tag, Woche oder Monat mit Leistungen eine Zeile mit Datum, Bearbeitern,
Leistungstext und Stunden. **Den Leistungstext einer Zeile liefern die gemeinsamen Leistungstexte der
Mitarbeiter:** je Zeitraum der Zeile in zeitlicher Folge der gemeinsame Text bzw. – wo keiner steht –
die Stichpunkte der Leistungen, zusammengeführt ohne Wiederholungen. Ohne gemeinsame Texte entsteht er
wie bisher aus den Texten der Leistungen; ein im Controlling von Hand bearbeiteter Text geht vor.
Nicht übernommen wird ein gemeinsamer Text in nachgereichte Zeilen, in Zeiträume, die ein anderer
abgeschlossener Nachweis sperrt, und in Zeilen, die nur einen Teil seines Zeitraums abdecken (Nachweis
feiner gegliedert als das Projekt, etwa Wochenzeilen bei Monatstexten). So lassen sich auch Leistungen
mehrerer Monate (etwa Oktober bis Dezember) in einem Nachweis sammeln – der offene wächst mit, bis er
abgeschlossen wird –, und jede Zeile übernimmt die Texte ihrer Zeiträume.

### Controlling der Leistungsnachweise
Im Controlling-Bereich (PIN) gibt es dafür unter *Bereiche* zwei Menüpunkte:
**Leistungsnachweise** (`#/controlling/leistungsnachweise/projekte`) und **Auswertung**
(`#/controlling/leistungsnachweise/auswertung`). *Leistungsnachweise* hat zwei Seiten ohne Reiter:
die Übersicht der Projekte und die Seite eines Projekts.

* **Übersicht** – die Karte **Leistungsnachweise je Projekt**: Je Projekt läuft ein
  Leistungsnachweis weiter, bis das Controlling ihn abschließt. Je Projekt eine Zeile, geordnet
  danach, ob sich sein offener Nachweis (der früheste) bis zum letzten Monatsende abschließen ließe –
  meist das Ende des Vormonats –, in drei Gruppen: **Bereit zum Abschließen – alle haben bestätigt**
  (es gibt Leistungen bis dahin, und alle Personen mit solchen Leistungen haben ihre Monate
  bestätigt), **Bestätigungen fehlen** und **Noch nichts abzuschließen** (kein offener Nachweis oder
  bis zum letzten Monatsende keine Leistungen, etwa nur im laufenden Monat). Spalten: *Projekt*
  (Nummer, Name, Status, ggf. *Archiviert*), *Letzter Leistungsnachweis* (der Zeitraum des zuletzt
  abgeschlossenen – ein Monat etwa als „Oktober 2026“ –, darunter „abgeschlossen am …“; ohne einen
  „noch keiner“), *Offene Stunden* (die Stunden des offenen Nachweises bis zum letzten Monatsende,
  darunter „bis Ende …“), *Bestätigung* (nur „1 von 2 bestätigt“, grün, wenn alle bestätigt haben;
  wer für welchen Monat fehlt, zeigt erst die Seite des Projekts) und **Prüfen und abschließen** (bei
  bereiten, hervorgehoben) bzw. **Öffnen**; auch ein
  Klick auf die Zeile öffnet die Seite des Projekts. Oben rechts zählt die Karte, wie viele Projekte
  bereit sind und wie viele auf Bestätigungen warten. Mit Suche; archivierte Projekte stehen in
  ihrer Gruppe am Ende. Eine Fälligkeit und eine Auswahl des Rasters gibt es in der Übersicht
  nicht – das Raster stellen die *Einstellungen* des Projekts ein (siehe unten). In der Leiste darüber stehen
  **Excel-Import (alle Mitarbeiter)** und **Neues Projekt** – es legt ein Projekt nur hier an (für
  alle Bereiche gibt es die Projekte des Controllings) und öffnet danach dessen Seite. Bis 640 px
  Breite steht in jeder Zeile das Projekt, darunter je zwei Angaben nebeneinander, dann der Knopf.
* **Seite eines Projekts** (`#/controlling/leistungsnachweise/projekt/<id>`, mit einem gewählten
  Nachweis `…/projekt/<id>/nachweis/<id>`) – oben **Alle Projekte**, Projektnummer und -name,
  Status (das Raster nennt der Kopf des Nachweises) und rechts drei Knöpfe – beschriftet und mit Symbol wie in den anderen
  Bereichen: zum gezeigten Leistungsnachweis **Vorschau**, dann **Einstellungen** und, wieder zum
  gezeigten Leistungsnachweis, rot **Nachweis löschen** (siehe unten). **Einstellungen** fasst alle Angaben des Projekts an einer
  Stelle zusammen: die Karte *Projekt* mit Projektnummer (eindeutig, daran erkennt der Excel-Import
  das Projekt), Status, Projektname, Bezeichnung im Nachweis, Leistungsbereich, Raster und
  Beschreibung (**Verwerfen**/**Speichern**), darunter die Abschnitte und die Logos im Druckkopf.
  Ein eigenes *Projekt bearbeiten* gibt es nicht (mehr), der Projektdialog dient nur *Neues
  Projekt*. Ein Projekt löscht man hier nicht – das Controlling löscht Projekte unter *Projekte*
  (für alle Bereiche). Hat ein Projekt mindestens zwei Abschnitte (etwa Streckenabschnitte), weist
  der Nachweis die Stunden je Abschnitt in eigenen Spalten aus. Das **Raster** gilt für den offenen
  und alle neuen Leistungsnachweise – abgeschlossene behalten ihres – und gliedert auch die
  Leistungstexte der Mitarbeiter; ein Wechsel nennt die gemeinsamen Texte noch nicht abgerechneter
  Zeiträume, die im neuen Raster nicht mehr gelten, und die Bestätigungen, die damit erlöschen, dazu
  was im offenen Leistungsnachweis von Hand im alten Raster steht (bearbeitete Texte, Aufschläge) –
  all das bleibt gespeichert und gilt wieder, wenn das Raster zurückgestellt wird. Liegen Leistungen in keinem
  Leistungsnachweis (etwa nach dem Löschen eines Nachweises), nennt ein Hinweis ihre Zahl und
  Stunden mit **Einem Leistungsnachweis zuordnen** (der offene wächst mit bzw. ein neuer entsteht).
  Darunter steht der offene Leistungsnachweis – der früheste offene – in drei Schritten (siehe
  unten), mit einem gewählten Nachweis in der Adresse dieser; ist ein anderer als der offene
  gewählt, führt **Zum offenen Leistungsnachweis** zurück. Gibt es keinen offenen, sagt die Seite
  (*Kein offener Leistungsnachweis*), dass einer entsteht, sobald Mitarbeiter Leistungen erfassen,
  und alle Leistungen sammelt, bis das Controlling ihn abschließt, und bietet – gibt es schon
  Leistungen – **Neuer Leistungsnachweis** an. Ganz unten steht die Liste **Frühere
  Leistungsnachweise**: alle übrigen Nachweise des Projekts, der jüngste zuerst, mit Stand
  (*Abgeschlossen* mit Datum und Uhrzeit bzw. *Offen*), abgerechneten Stunden, **Ansehen** und –
  abgeschlossen – **PDF** (der Druckdialog mit dem festgeschriebenen Stand); abgeschlossene sind nur
  zu lesen.
* **Leistungsnachweis** (auf der Seite des Projekts) – ein Kopf mit **Offener
  Leistungsnachweis** bzw. der Überschrift des abgeschlossenen, seinem Zeitraum („seit … · läuft bis
  zum Abschließen“ bzw. Beginn und Ende) und Raster, bei abgeschlossenen *Abgeschlossen am …* mit
  Datum und Uhrzeit und dem Link **Wieder öffnen …**, dazu das Kennzeichen *geändert* (Leistungen
  haben sich seit dem Abschluss geändert). Knöpfe stehen dort nicht: **Vorschau** und **Nachweis
  löschen** stehen oben in der Reihe des Projekts. **Vorschau** zeigt das Druckblatt in einem
  Fenster mit **Schließen** und **Drucken / PDF** (abgeschlossen der festgeschriebene Stand, offen
  der Stand des offenen Nachweises). Eine Excel-Fassung des Leistungsnachweises, *Zeitraum ändern*
  und *Aufschläge zurücksetzen* gibt es nicht (mehr) – Aufschläge leert man je Zeile. Eine Auswahl
  unter den Nachweisen gibt es dort nicht – frühere öffnet die Liste unten. Ein offener Nachweis steht in **drei
  Schritten**, jeder mit seiner Nummer (grün mit Haken, wenn erledigt):
  1. **Haben alle eingetragen und bestätigt?** – nur die Bestätigungen: je Person mit Stunden im
     Nachweis je Monat seines Zeitraums ein Kennzeichen – *bestätigt* mit dem Tag, *offen*,
     *geändert seit Bestätigung* oder *abgerechnet*; nicht bestätigte Monate nach dem in Schritt 3
     gewählten Ende *läuft weiter* –, im Kopf „x von y bestätigt“, gezählt bis zu diesem Ende;
     erledigt, wenn alle bestätigt haben. Die Stunden stehen in Schritt 2. Eine eigene Seite für die
     Bestätigungen gibt es nicht.
  2. **Prüfen – so geht der Leistungsnachweis raus** – **eine Tabelle**: je Zeile Datum, Bearbeiter,
     der Leistungstext, *Erfasst*, *Aufschlag* in ± Stunden und *Abgerechnet* (wer *Abgerechnet*
     eingibt, setzt den Aufschlag als Differenz), unten die Summe, darunter die **Bemerkung** (steht
     im Druck unter der Tabelle). Aufgeschlagen wird je Zeile (mit Abschnittsspalten je Abschnitt);
     einen Aufschlag auf den ganzen Nachweis gibt es nicht (mehr, Fassung 10, siehe unten *Daten*). Der
     Leistungstext steht zunächst so da, wie er
     im PDF erscheint; **✎ Korrigieren** macht ihn bearbeitbar (gespeichert bei jeder Eingabe),
     **Fertig** oder Escape zeigt ihn wieder zum Lesen.
  3. **Abschließen und PDF** – bis wann der Nachweis reicht: jedes Monatsende bzw. **bis heute**
     (siehe [Leistungsnachweise](#leistungsnachweise)), je mit Zeitraum, Zahl der Leistungen und
     Stunden; vorgewählt ist das letzte Monatsende. Darunter je Monat, wer noch nicht bzw. nach
     einer Änderung nicht erneut bestätigt hat – dann lässt er sich nur mit dem Haken **Trotzdem abschließen – auch ohne
     alle Bestätigungen** abschließen; ohne Leistungen bis dahin gibt es nichts abzuschließen. Endet
     der Nachweis mitten in einem Zeitraum, sagt der Schritt, dass die Mitarbeiter für die Tage
     danach einen eigenen Text verfassen; von Hand bearbeitete Zeilen, in denen seitdem Leistungen
     hinzukamen oder sich der Text der Mitarbeiter bzw. der automatische Text geändert hat, nennt er
     mit „Achtung: …“ – abgeschlossen wird der von Hand bearbeitete Text. **Abschließen und PDF**
     schließt ab und schreibt den Stand fest, öffnet den Druckdialog („Als PDF sichern“) und zeigt
     danach die Seite des abgeschlossenen Nachweises; die Kurzmeldung nennt den letzten Tag
     („Leistungen bis …“) und die Zahl der späteren Leistungen, die im nächsten weiterlaufen. Ohne
     Abschluss läuft der Nachweis einfach weiter.

  Erläuternde Untertitel unter den Schritten und Bedienhinweise (etwa zum Aufschlag oder zum
  Festschreiben) zeigt die Seite nicht – nur Angaben und Meldungen zum Stand.

  Abgeschlossene Nachweise zeigen ohne Schritte den Block **Mitarbeiter und Bestätigungen** (nur
  die Stunden ihres festgeschriebenen Stands mit Summe) und die Tabelle, nur zum Lesen.
  Den Leistungstext bearbeitet das Controlling direkt in der Zeile, solange der
  Nachweis offen ist – ein bearbeiteter Text wird nie still überschrieben, neue Leistungen bietet
  die Zeile zum **Ergänzen** an; die Leistungen aller Mitarbeiter lassen sich je Zeile aufklappen
  (nur lesen); stammt der Text aus den gemeinsamen Leistungstexten, ist er als **Text der
  Mitarbeiter** gekennzeichnet, und nach einer Bearbeitung stellt **Text der Mitarbeiter
  wiederherstellen** ihn wieder her; ändern die Mitarbeiter ihren Text nach der Bearbeitung, nennt
  die Zeile den neuen („Der Text der Mitarbeiter hat sich seit der Bearbeitung geändert:“) mit
  **Text der Mitarbeiter übernehmen** und **Text so lassen** – dieselben Zeilen zählt über der
  Tabelle eine Warnung („In … kamen nach der Bearbeitung des Leistungstexts Leistungen hinzu.“, „In
  … hat sich der Text der Mitarbeiter seit der Bearbeitung des Leistungstexts geändert.“), und
  Schritt 3 warnt ebenso; sind die Zeilen feiner gegliedert als das Raster des
  Projekts, erklärt ein Hinweis, warum dort die Texte der Leistungen stehen. Der Druck zeigt die
  abgerechneten Stunden; der Aufschlag selbst erscheint nicht. Unter der Überschrift des Drucks
  stehen nur Überschrift bzw. Zeitraum und Leistungsbereich – kein Raster und kein Stand
  (`nachweisMeta`). Den Stand eines offenen Nachweises druckt **Drucken / PDF** in der
  **Vorschau**.
  **Nachweis löschen** nimmt auf Wunsch die eigenen Leistungen des Nachweises mit (einschließlich der
  nachgereichten); danach zeigt die Seite den offenen Nachweis des Projekts. Wurde ein Nachweis in
  einem anderen Raster abgeschlossen, als das Projekt heute hat, nennt *Wieder öffnen* die
  gemeinsamen Texte, die danach nicht mehr gelten.
* **Neuer Leistungsnachweis** (auf der Seite eines Projekts ohne offenen Nachweis, wenn es
  Leistungen gibt – neben einem Nachweis gibt es den Knopf nicht mehr) fragt **keinen Zeitraum**
  ab, nur Raster
  und optional die Überschrift: Er umfasst automatisch alle nicht abgerechneten Leistungen des
  Projekts (nach dem letzten abgeschlossenen Nachweis); offene Nachweise gehen darin auf, ihre
  Leistungstexte, Aufschläge und Bemerkungen bleiben erhalten – Texte derselben Zeile aus mehreren
  Nachweisen werden verbunden, Aufschläge derselben Zeile summiert, ein von Hand festgelegtes Ende
  entfällt. Er reicht bis
  zum Ende des laufenden Monats, mindestens bis zur letzten Leistung. Wechselt dabei das Raster, warnt
  der Dialog, wenn von Hand bearbeitete Texte oder Aufschläge nicht mehr angezeigt werden (sie
  bleiben gespeichert und kehren mit dem alten Raster zurück). Später erfasste Leistungen kommen
  hinzu; bis wann er reicht, legt das Abschließen fest. So entsteht auch ein Nachweis über
  mehrere Monate, etwa Oktober bis Dezember.
  Liegt schon alles in einem offenen Nachweis, bietet der Dialog **Öffnen** an; danach zeigt die
  Seite des Projekts den Nachweis. Ändern sich mit dem neuen Nachweis – wie mit *Nachweis
  löschen* – Grenzen der Zeiträume, sagen Dialog und Rückfragen, was das für
  die gemeinsamen Leistungstexte bedeutet: wie viele Texte von Teilen eines Zeitraums im Text des
  neuen Zeitraums aufgehen, ab welchem Tag ein neuer Beginn bzw. ein neues Ende mitten in einem
  Zeitraum einen eigenen Text verlangt und wessen Bestätigungen damit erlöschen (mit Namen und
  Monat, dann als Warnung); *Wieder öffnen* und der Schritt *Abschließen und PDF* nennen die
  erlöschenden Bestätigungen ebenso. Einen Dialog *Zeitraum ändern* gibt es nicht (mehr): Bis wann
  ein Nachweis reicht, legt das Abschließen fest.
  **Nicht erfasste Leistungen:** Abgerechnet ist, was im festgeschriebenen Stand eines
  abgeschlossenen Nachweises steht. Leistungen aus schon abgerechneten Zeiträumen, die dort fehlen
  (etwa nach dem Abschluss nachgetragen), meldet der Dialog – und der laufende Nachweis auf der
  Seite des Projekts – mit Datum, Person, Stunden, Text und Grund; die ersten acht einzeln, die
  übrigen lassen sich aufklappen. Übernommen werden sie **erst nach Bestätigung** (Haken im Dialog
  bzw. **In diesen Leistungsnachweis übernehmen …** mit Rückfrage) – als **nachgereichte**
  Leistungen mit ihrem Datum als eigene Zeile (eigener Schlüssel mit vorangestelltem „N“, gekürzt
  auf die Tage vor dem Zeitraum), gekennzeichnet „nachgereicht“. Der abgeschlossene Nachweis bleibt
  unverändert.
* **Auswertung** – Stunden je Mitarbeiter, je Mitarbeiter und Monat und je Projekt (erfasst,
  Aufschlag, abgerechnet, ohne Nachweis) für Monat, Quartal, Jahr oder einen freien Zeitraum, mit
  Excel; ein Klick auf ein Projekt öffnet dessen Seite mit dem offenen Leistungsnachweis.
* **Excel-Import (alle Mitarbeiter)** – Sammel-Export der Zeiterfassung, legt unbekannte Mitarbeiter
  an; danach geht es zu den Projekten. Eine Anmeldung als Mitarbeiter braucht das Controlling nicht.
  Ist die Person unter „Angemeldet als“ Mitarbeiter, gilt sie auch hier als angemeldet (Zeilen ohne
  Mitarbeiter lassen sich ihr zuordnen, beim Löschen eines Nachweises ihre eigenen Leistungen
  mitlöschen).

Eine Seite für die Mitarbeiter gibt es nicht: Wer im Bereich unter „Angemeldet als“ steht, wird dort
als Mitarbeiter angelegt bzw. – früher als ausgeschieden markiert – wieder aktiv gesetzt (siehe
[Anmeldung](#anmeldung)); unbekannte Personen einer Datei legt der Sammel-Import an.

Gemeinsame Leistungstexte und Bestätigungen liest das Controlling nur – bestätigen können die
Mitarbeiter allein im Bereich; den Text einer Zeile bearbeitet das Controlling im Nachweis.

Eine neue Seite beginnt oben – auch ein anderer Leistungsnachweis desselben Projekts.

Frühere Adressen bleiben gültig: Die des Controllings im Bereich (`#/leistungsnachweise/controlling/…`)
führen in den Controlling-Bereich; `…/nachweise` (früher alle Nachweise), `…/mitarbeiter` und die
Adresse ohne Seite führen zu den Projekten, ebenso `#/leistungsnachweise/mitarbeiter`; frühere
Reiter eines Projekts (`…/projekt/<id>/nachweise`, `…/leistungen`, `…/einstellungen`,
`…/bestaetigungen`) führen auf die Seite des Projekts.

### Daten
Eigener Schlüssel `leistungsnachweise.data.v1` im `localStorage`, eigene Demodaten (vier
Mitarbeiter – darunter Anna Becker –, drei Projekte, Leistungen der letzten Monate; bei der Brücke
steht für den Vormonat ein gemeinsamer Leistungstext, den Anna Becker bestätigt hat; die offenen
Leistungsnachweise enthalten Leistungen aus vergangenen Monaten und lassen sich deshalb bis zum Ende
des Vormonats abschließen),
**Sicherung**/**Einspielen** (JSON mit dem Kennzeichen `"bereich": "leistungsnachweise"`) und
**Zurücksetzen**. Sicherungen und Stände aus dem Testprojekt lassen sich einspielen; die frühere
Rolle Controlling entfällt dabei (Fassung 3). Fassung 4 stellte alle Projekte auf den damaligen
Rhythmus *Bis zum Abschluss* (vorhandene Nachweise blieben, wie sie waren); seit Fassung 9 entfällt
dieser Schritt, denn den Rhythmus gibt es nicht mehr. Fassung 5 ergänzt an den Nachweisen die
nachgereichten Leistungen (leer). Fassung 6 ergänzt das von Hand festgelegte Ende (`bisFest`, nicht
gesetzt) und stellt die Zeilen nachgereichter Leistungen in Texten, Aufschlägen und im
festgeschriebenen Stand auf eigene Schlüssel um (`nachgereichteZeilenUmstellen`); die abgerechneten
Stunden bleiben gleich. Texte und Aufschläge einer Zeile, in der laufende und nachgereichte
Leistungen zusammenstanden, werden auf die beiden neuen Zeilen aufgeteilt, ohne die abgerechneten
Stunden zu ändern – bei Nachweisen mit Abschnittsspalten auch nicht die einer Spalte –, sodass
abgeschlossene Nachweise nicht als geändert gelten. Fassung 7 ergänzt die gemeinsamen Leistungstexte je
Zeitraum (`periodentexte`) und die Monatsbestätigungen (`bestaetigungen`), beide zunächst leer; der
festgeschriebene Stand eines Nachweises merkt sich seither das Raster des Projekts beim Abschluss.
Fassung 8 brachte die Rhythmen *Alle 2 Monate* und *Alle 3 Monate* und den Monat, ab dem die
Blöcke eines Rhythmus zählten (`rhythmusAb`, optional); umgerechnet wurde dabei nichts. Fassung 9
entfernt den Rhythmus wieder (`zeitraumregel` und `rhythmusAb` übernimmt der Bestand nicht mehr):
Aufeinanderfolgende offene Leistungsnachweise eines Projekts ohne festgelegtes Ende – etwa einer je
Monat nach dem früheren Rhythmus *Monatlich* – gehen im ersten auf, mit Leistungstexten,
Aufschlägen, Bemerkungen und nachgereichten Leistungen (`laufendeZusammenfuehren`); abgeschlossene
Nachweise und solche mit festgelegtem Ende bleiben, wie sie sind, und trennen. Gemeinsame Texte und
Bestätigungen ziehen dabei mit wie nach jeder Änderung. Dazu brachte Fassung 9 den Aufschlag auf
den ganzen Nachweis (`gesamtAufschlag`, ± Std. oder ± %, zunächst keiner). Fassung 10 rechnet ihn
in Aufschläge je Zeile um und entfernt ihn (`gesamtAufschlaegeUmrechnen` in
`domain/migrationGesamtaufschlag.ts`): Jede Zeile – mit Abschnittsspalten jede Spalte – behält die
abgerechneten Stunden, die sie mit ihm hatte; abgeschlossene Nachweise übernehmen die Anteile aus
ihrem festgeschriebenen Stand, der selbst unverändert bleibt. Gemeinsame Texte und Bestätigungen gelöschter Projekte bzw. Mitarbeiter räumt der Store mit ab.
Demodaten gibt es nur, solange weder ein Bestand noch Projekte im
Projektregister vorhanden sind; wer zuvor einen anderen Bereich geöffnet hat, beginnt mit leeren
Leistungsnachweisen und den Projekten des Registers. Gespeichert wird nur bei einwandfrei geladenem
Stand; ist der Speicher voll, räumt das Speichern nach Bedarf Rohkopien (`…vor-fassung-<n>`,
`…vor-einspielen-…`, auch die anderer Bereiche; `nachRaeumenSpeichern`) und zeigt
sonst „Nicht gespeichert – bitte Sicherung herunterladen.“ mit **Sicherung herunterladen**
(`components/SpeicherHinweis.tsx`, auch im Controlling). Speichert ein anderes Fenster den Bereich,
lädt der Store dessen Stand nach (`useFremdeAenderung`) – stammt er aus einer neueren Fassung,
speichert die Seite nicht mehr. Projekte teilt der Bereich über das Projektregister;
seine Mitarbeiter sind keine Projektbeteiligten und werden nicht geteilt. Name unter „Angemeldet als“
und Farbmodus gelten in allen Bereichen.

## Angemeldet als – für alle Bereiche

Unten in der Seitenleiste jedes Bereichs (auch im Controlling) steht **Angemeldet als** mit Name und
Kürzel. Der Dialog dazu fragt den Namen (Vor- und Nachname) und den **Farbmodus für eine
Rot-Grün-Sehschwäche** ab – beides gilt in allen Bereichen: Wer seinen Namen einmal einträgt, ist
überall dieselbe Person. Bis zur Anmeldung über SSO ist das eine Angabe ohne Kennwort; sie liegt
lokal im Browser (Schlüssel `kaplan-benutzer.v1`). Ohne Eintrag gilt „Max Mustermann“; beim ersten
Start nach dem Umstieg übernimmt KaPlan den ersten selbst eingetragenen Namen der Bereiche
(Planlaufmanagement, Projektsteuerung, Baubetriebsplanung, Leistungsnachweise) samt Farbmodus;
die Vorgaben und Demonamen („Lena Roth“ der Projektsteuerung, „Anna Becker“ der
Leistungsnachweise) zählen dabei nicht als selbst eingetragen.

Was die Bereiche mit dem Namen tun: Im Planlaufmanagement füllt die Person in markierten Projekten
das Planlaufmanagement aus (dazu die E-Mail-Nachfrage als eigene Einstellung im Dialog), in der
Baubetriebsplanung steht sie im Statusverlauf und als Hauptbearbeiter neuer Projekte, in der
Projektsteuerung führt sie – steht sie in der Projektbeteiligtenliste – neue Protokollreihen und sieht
ihre Aufgaben als eigene To-Dos, in den
Leistungsnachweisen erfasst sie als Mitarbeiter gleichen Namens – fehlt der, legt der Bereich ihn
selbst an (eine zweite Anmeldung gibt es dort nicht). Beim Einspielen einer Sicherung
bleibt der Name, es sei denn, er wird ausdrücklich aus der Sicherung übernommen – dann für alle
Bereiche.

## Gemeinsame Projekte und Controlling

### Projektregister
Neben den Beständen der Bereiche führt KaPlan ein **Projektregister** (Schlüssel
`kaplan-projektregister.v1` im `localStorage`). Es kennt jedes Projekt mit **Projektnummer,
Bezeichnung und Beschreibung**, die Bereiche, in denen es geführt wird – je Bereich aktiv oder
archiviert –, und die **Projektbeteiligten** des Projekts. Jeder Bereich gleicht seinen Bestand nach
jeder Änderung mit dem Register ab; was ein anderer Bereich oder das Controlling geändert hat,
übernimmt er spätestens beim nächsten Öffnen. Speichert ein anderes Fenster denselben Bereich, lädt
der Store dessen Stand sofort nach (`src/gemeinsam/useFremdeAenderung.ts`), statt ihn mit dem
älteren eigenen zu überschreiben. Diesen Stand gleicht das Fenster nicht selbst mit dem Register ab,
denn das hat das andere Fenster getan; erst wenn sich danach das Register ändert, gleicht es mit
beiden aktuellen Ständen ab (`nachgeladen` in `src/gemeinsam/useRegisterAbgleich.ts`).

Mit mehreren Fenstern kommt der Abgleich zur Ruhe: Mitgliedschaften nicht mehr geführter Projekte
löst er und die ★ aus dem Bestand übernimmt er nur beim ersten Abgleich nach dem Laden und nach
**Einspielen** bzw. **Zurücksetzen** (`vollstaendig` in `abgleichen`, `src/gemeinsam/abgleich.ts`);
außerdem einmal die ★ eines eben übernommenen Projekts. Sonst meldet beides allein `uebertragen`
aus dem Vergleich von altem und neuem Stand. Ein Projekt des Controllings, das nur die
Leistungsnachweise führen, bleibt nach deren Zurücksetzen oder Einspielen im Register, und sie legen
es wieder an – ganz entfällt es nur, wenn es dort ausdrücklich gelöscht wird.

**Jedes Projekt steht auch in den Leistungsnachweisen** – auf jedes Projekt lassen sich Leistungen
erfassen. Ihr Abgleich nimmt alle Projekte des Registers auf, die sie noch nicht führen (zuvor
verknüpft er eigene Projekte gleicher Nummer); im Controlling archivierte folgen, sobald sie
zurückgeholt werden. So übernommene Projekte sind dort nicht mit ★ markiert, damit Übersicht und
Seitenleiste nicht volllaufen. **Was ein Bereich mit ★ markiert, ist in den Leistungsnachweisen
von selbst markiert** – dort fest (aufheben lässt es sich nur im markierenden Bereich, der Tooltip
nennt ihn); weitere Projekte lassen sich dort zusätzlich markieren. Die anderen Bereiche nennen die
Leistungsnachweise in ihren Projektansichten nicht (weder unter „Auch in“ noch unter „Geführt in“
noch im Löschdialog); die Leistungsnachweise nennen die anderen Bereiche weiter.

Geteilt werden:

* **Stammdaten des Projekts** – Projektnummer und Bezeichnung in allen Bereichen (in der
  Baubetriebsplanung als *MIC-Projektnummer (wiko)*), die Beschreibung zwischen
  Planlaufmanagement, Projektsteuerung und Leistungsnachweisen. Status (*Aktiv*, *Pausiert* …), ★-Markierung und alles
  Fachliche (Pläne, Planläufe, Anmeldungen, Protokolle) bleiben im jeweiligen Bereich.
* **Projektbeteiligte** – Kontakte des Planlaufmanagements und Projektbeteiligte der
  Projektsteuerung sind dieselben Personen: Anrede, Vor- und Nachname, Firma, E-Mail, Telefon,
  Anschrift und Notiz gelten in beiden Bereichen; Mobilnummer und persönliches Kürzel führt nur die
  Projektsteuerung, die SharePoint-Links nur das Planlaufmanagement. Wer eine Person in einem
  Bereich anlegt, ändert oder löscht, tut das auch im anderen.
* **Funktionen** – eine Funktion gilt in allen Bereichen als dieselbe, wenn Bezeichnung und Gewerk
  übereinstimmen. Fehlt sie im anderen Bereich, wird sie dort angelegt – im Planlaufmanagement als
  Projektfunktion, in der Projektsteuerung als projektübergreifende Funktion. Mitgeliefert heißen
  die Funktionen teils verschieden (etwa *Fachplaner* bzw. *Fachplanung*); wer sie angleicht,
  vermeidet Doppelungen. Die Projektsteuerung führt je Person **eine** Funktion (die erste bekannte
  aus dem Register), das Planlaufmanagement mehrere; eine Funktion, die im Planlaufmanagement
  bereits eine andere Person ausfüllt, bleibt bei dieser.
* Nicht ins Projektregister geht der eigene Kontakt des Planlaufmanagements (*Angemeldet als*) mit
  der Funktion **Planlaufmanagement** – er gehört zum jeweiligen Arbeitsplatz.

Die Baubetriebsplanung führt keine eigenen Personen; im Projekt zeigt die Karte
**Projektbeteiligte** die geteilten Beteiligten zum Nachschlagen. Die Leistungsnachweise teilen nur
ihre Projekte – ihre Mitarbeiter sind keine Projektbeteiligten.

### In den Bereichen
* Die **Projektkacheln** nennen nur Projektnummer (in der Baubetriebsplanung die MIC-Projektnummer),
  Projektname und – falls vorhanden – den Zusatztext (Beschreibung bzw. Bemerkung), dazu oben rechts
  Status und ★-Markierung. Kennzahlen wie Pläne, Planläufe, Anmeldungen, Beteiligte, Protokolle oder
  offene Punkte stehen in Übersicht und Projekt, nicht mehr in der Kachel.
* Unten in jeder Projektkachel nennt die Zeile **Auch in** die anderen Bereiche, die das Projekt
  führen – grau mit *archiviert*, gestrichelt mit *vorgesehen*, solange eine Übernahme aus dem
  Controlling noch aussteht. Die Leistungsnachweise erscheinen dort nie – sie führen jedes Projekt
  (`genannteBereiche`); in ihrem eigenen Bereich nennt die Zeile die anderen Bereiche.
* Unter der Projektliste stehen **grau hinterlegt** die **Projekte aus anderen Bereichen** (und aus
  dem Controlling), die der Bereich noch nicht führt – mit Nummer, Name, Zusatztext und den
  Bereichen, die es führen. Führt es keiner der genannten Bereiche, nennt die Karte die Herkunft:
  „Im Controlling angelegt“, „Hier gelöscht – weiter in den Leistungsnachweisen geführt“ oder „Nur
  in den Leistungsnachweisen geführt“. **Übernehmen in …** legt das Projekt im Bereich an – samt
  den Projektbeteiligten.
* Ist ein Projekt im Bereich archiviert, steht es im aufklappbaren Abschnitt **Archiv** und fehlt in
  Übersicht und Seitenleiste; das Projekt selbst nennt den Archivstand oben. Archiviert wird im
  Controlling – je Bereich: Ein Projekt kann in einem Bereich archiviert und in einem anderen aktiv
  sein.
* **Löschen** im Projekt entfernt es nur aus diesem Bereich; in den anderen Bereichen bleibt es mit
  seinen Beteiligten erhalten (der Dialog nennt sie). In den Leistungsnachweisen bleibt es stets
  erhalten; führt sonst kein Bereich das Projekt, sagt der Dialog das eigens (es steht danach unter
  „Projekte aus anderen Bereichen“). Die Löschdialoge nennen nur, was in diesem Bereich entfällt –
  in der Projektsteuerung „Die Protokolle lassen sich nicht wiederherstellen.“, in der
  Baubetriebsplanung „Die Anmeldungen lassen sich nicht wiederherstellen.“. Im Bereich
  Leistungsnachweise und im Controlling der Leistungsnachweise gibt es kein Löschen im Projekt;
  Projekte löscht das Controlling unter **Projekte** (für alle Bereiche).
* Wer ein Projekt mit einer **Projektnummer** anlegt, die es in einem anderen Bereich schon gibt,
  erhält einen Hinweis: Beim Anlegen wird es mit dem vorhandenen verknüpft; Bezeichnung und
  Beteiligte kommen von dort. Ebenso verknüpft der erste Abgleich nach dem Umstieg Projekte gleicher
  Projektnummer (ohne Nummer: gleicher Bezeichnung) und darin Personen gleicher E-Mail-Adresse bzw.
  gleichen Namens; bei abweichenden Angaben gilt der Stand des Bereichs, der zuerst geöffnet wurde.
  Eine abweichende Bezeichnung oder Beschreibung des anderen Bereichs geht dabei nicht verloren: Sie
  steht danach als Vermerk in der Beschreibung des Projekts („Bezeichnung in … vor der
  Zusammenführung: …“, `stammdatenZusammenfuehren`). Ebenso verknüpft ein Bereich ein vom
  Controlling vorgesehenes Projekt mit einem eigenen Projekt gleicher Nummer, statt es doppelt
  anzulegen.
* Nach **Einspielen** einer Sicherung (*Alles ersetzen*) und nach **Zurücksetzen** gilt für geteilte
  Projekte und Personen der Stand des Registers; der Abgleich mit Auswahl im Planlaufmanagement
  zählt dagegen als gewöhnliche Änderung.

### Controlling
Das Controlling (die letzte Kachel des Startbildschirms) ist mit einer **PIN** geschützt (derzeit
`0000`; ein einfacher Schutz vor versehentlichem Zugriff, keine Sicherheit). Entsperrt bleibt es bis zum
Schließen des Fensters oder bis **Sperren** in der Seitenleiste. Das Controlling hat keinen eigenen
Datenbestand – es arbeitet auf dem Projektregister:

* **Projekte**: Kennzahlen (Projekte, aktiv je Bereich – ohne vorgesehene Übernahmen) und je Projekt eine Karte mit Nummer,
  Bezeichnung, Beschreibung, dem Stand in jedem Bereich (*Aktiv*, *Archiviert*, *Vorgesehen* oder
  *nicht geführt*). Je Bereich: **Übernehmen**,
  **Zurücknehmen** (einer noch nicht vollzogenen Übernahme), **Archivieren** bzw. **Zurückholen**.
  In den Leistungsnachweisen steht jedes Projekt – bis zu ihrem nächsten Abgleich als *Vorgesehen*,
  archivierte, sobald sie zurückgeholt sind; dort gibt es nur Archivieren bzw. Zurückholen. Die
  Beschreibung behält ihre Zeilen (etwa Vermerke aus einer Zusammenführung).
  Für das ganze Projekt: **Bearbeiten** (Nummer, Bezeichnung, Beschreibung – gelten danach in allen
  Bereichen), **Archivieren** (in allen Bereichen) und **Löschen** – im Register und in allen
  Bereichen samt allem, was diese dazu gespeichert haben.
* **Neues Projekt**: Projektnummer (eindeutig), Bezeichnung, Beschreibung und die Bereiche, die es
  übernehmen sollen; *Leistungsnachweise* ist fest angehakt („immer“).
* **Archiv**: die im Controlling archivierten Projekte mit **Aus dem Archiv holen** und Löschen.
* **Leistungsnachweise** und **Auswertung** (unter *Bereiche*): das Controlling der
  Leistungsnachweise – siehe [Controlling der Leistungsnachweise](#controlling-der-leistungsnachweise).
  Es arbeitet auf dem Bestand des Bereichs Leistungsnachweise, den dieser dafür bereitstellt.

Die Bereiche vollziehen Übernahmen, Archivierung und Löschungen beim nächsten Öffnen.

Lässt sich das Projektregister nicht speichern – meist, weil der Speicher des Browsers voll ist und
auch das Räumen der Rohkopien nicht reicht –, zeigt das Controlling über allen Ansichten den
dauerhaften Hinweis **„Projektregister nicht gespeichert.“** samt Grund. Die Änderungen gelten in
diesem Fenster weiter, gingen aber beim Schließen der Seite verloren. **Erneut speichern** versucht
es noch einmal (etwa nachdem anderswo Platz frei geworden ist), ebenso jeder weitere Schreibzugriff
auf das Register – auch einer ohne neuen Inhalt, etwa der Abgleich eines Bereichs
(`useRegisterSpeicherZustand` und `registerErneutSpeichern` in `src/gemeinsam/register.ts`).
Speichert ein anderes Fenster das Register – etwa, weil dort ein Projekt gelöscht und so Platz
geschaffen wurde –, übernimmt dieses Fenster dessen Stand, trägt seine noch nicht gespeicherten
Änderungen darauf nach und speichert erneut (`eigeneAenderungenNachziehen`): je Projekt, Person und
Feld; bei Widerspruch gilt die eigene Änderung, eine Löschung geht jeder Änderung vor – hat die
andere Seite ein gelöschtes Projekt bzw. eine gelöschte Person inzwischen in einen Bereich
übernommen, löscht auch dieser es. Was ein Bereich in diesem Fenster neu eingetragen hat, trägt sein
nächster Abgleich wieder ein und verknüpft es dabei mit einem Projekt gleicher Nummer bzw. einer
Person gleicher E-Mail-Adresse, die das andere Fenster eingetragen hat – so entstehen keine Doppel.
Halten zwei Fenster zugleich nicht Gespeichertes, ziehen beide nach; wessen Stand dabei
überschrieben wird, zieht noch einmal nach. Gelingt das Speichern auf einem dieser Wege, verschwindet
der Hinweis mit der Meldung **„Projektregister gespeichert.“**; stand der Fokus auf *Erneut
speichern*, geht er an die Überschrift der Seite. Hat das andere Fenster einen Stand gespeichert,
den dieses nicht lesen kann (unlesbar oder aus einer neueren Fassung von KaPlan), gilt jener, und
die nicht gespeicherten Änderungen entfallen – dann meldet das Controlling **„Nicht gespeicherte
Änderungen am Projektregister verworfen – …“**. Schreiben zwei Fenster sonst im selben Augenblick,
gilt wie bisher der zuletzt geschriebene Stand.

## Aufbau des Codes

Hinweise für die Arbeit am Code – was nach jeder Änderung nachzuziehen ist, wie gebaut und
veröffentlicht wird und welche Randbedingungen gelten – stehen in [`CLAUDE.md`](CLAUDE.md).

KaPlan besteht aus vier getrennten Bereichen und dem Controlling. Jeder Bereich bringt seinen
eigenen Datenbestand, seinen eigenen localStorage-Schlüssel, seine eigenen Einstellungen und seinen
eigenen Router mit (Name und Farbmodus kommen aus der gemeinsamen Anmeldung); die Bereiche greifen
nicht aufeinander zu. Gemeinsam ist ihnen nur das
Projektregister in `src/gemeinsam/`: Jeder Store gleicht über `useRegisterAbgleich` ab und
übernimmt Änderungen über sein eigenes `mutate()` (`domain/register.ts` je Bereich). Einzige
Ausnahme: Das Controlling bindet das Controlling der Leistungsnachweise über deren Einstiegsmodul
`src/bereiche/leistungsnachweise/controlling.tsx` ein. Die Shell
wählt anhand der ersten Wegmarke der Adresse aus, welcher Bereich geladen wird, und hängt ihn erst
beim Betreten ein.

```
src/
  main.tsx       Start der Anwendung, Umlenkung alter Lesezeichen; lädt global.css vor der Shell,
                 damit Regeln der Bereiche gleicher Spezifität gewinnen
  shell/         Startbildschirm und Bereichswechsel
    Shell.tsx    Wählt Bereichsauswahl oder Bereich
    Start.tsx    Startbildschirm mit den Bereichskacheln und der laufenden Fassung
    NeueFassung.tsx  Hinweis „Neue Fassung von KaPlan verfügbar“ über allen Bereichen
    bereiche.ts  Verzeichnis der Bereiche
    router.ts    #/ · #/planlauf/… · #/baubetrieb/… · #/projektsteuerung/… · #/leistungsnachweise/…
                 · #/controlling/…
    BereichWechsel.tsx  Rückweg aus einem Bereich zur Bereichsauswahl
  shared/        Bausteine ohne fachlichen Bezug – von keinem Bereich abhängig
    ui.tsx       Karten, Felder, Dialoge (Modal: Fokus, Tab, Escape, Fokus zurück), Segmented
                 Controls (die gewählte Option mit aria-pressed), alsKnopf …
    icons.tsx    Strichsymbole
    logos.tsx    Logos KaPlan (public/logos/) und Wortmarke Mailänder Consult
    toast.tsx    Kurzmeldungen (role="status", aria-atomic="false")
    bausteine.ts Platzhalter {{schluessel}} zerlegen, zusammensetzen, aus der Ansicht lesen
    bausteinEditor.tsx  Eingabefeld mit farbigen, nicht teilbaren Bausteinen (BausteinEditor,
                 BausteinText; Gestaltung bausteinEditor.css, Präfix bst-)
    menue.tsx    Aufklappmenü an einem Knopf (AufklappMenue): Portal, bleibt im Fenster, Tastatur
    tabellen.ts  Breite Tabellen scrollen quer (tabellenBreiteBeobachten, Klasse table-scroll-quer)
    scrollen.ts  Eine neue Seite beginnt oben (useNachObenBeiSeitenwechsel)
    seitenleiste.ts  Aufklappbare Seitenleiste der schmalen Ansicht, schließt bei jedem
                 Seitenwechsel (useSeitenleiste)
    speicher.ts  Rohkopien im localStorage: anlegen vor dem Einspielen, bei vollem Speicher
                 einzeln räumen (nachRaeumenSpeichern)
    dates.ts     Fristen- und Datumsrechnung
    xlsx.ts      Erzeugt Excel-Arbeitsmappen ohne externe Abhängigkeit (mit Zellformaten)
    xlsxLesen.ts Liest Excel- und CSV-Listen für die Importe (Zahlenformate aus Nullen wie „00000“
                 behalten führende Nullen)
    zwischenablage.ts  Formatiert (text/html) und als Klartext kopieren
    print.ts     Druckausgabe als Grundlage der PDF-Fassung
    pwa.ts       Registrierung des Service Workers; Fassung des Builds und Prüfung auf eine neuere
    global.css   Design-Tokens im hellen Apple-Erscheinungsbild
  gemeinsam/     Projektregister – der einzige Bestand, den sich die Bereiche teilen
    register.ts  Datenmodell, Laden/Speichern, gemeinsamer Zustand (useRegister, Ergebnis des
                 Speicherns: useRegisterSpeicherZustand; nicht Gespeichertes übersteht das
                 Speichern eines anderen Fensters: eigeneAenderungenNachziehen)
    abgleich.ts  Abgleich Bereich ↔ Register als reine Funktionen (uebertragen, abgleichen)
                 und die Aktionen des Controllings
    useRegisterAbgleich.ts  Bindet den Store eines Bereichs an das Register
    useFremdeAenderung.ts   Lädt den Bestand nach, wenn ein anderes Fenster ihn speichert
    benutzer.ts  „Angemeldet als“ für alle Bereiche: Name und Farbmodus (useBenutzer)
    useBenutzerAbgleich.ts  Zieht Name und Farbmodus in den Bestand eines Bereichs nach
    AngemeldetAls.tsx       Knopf in der Seitenleiste und Dialog „Angemeldet als“
    ProjektBereiche.tsx     Marken „Auch in“, Projekte aus anderen Bereichen, Archiv, Beteiligte
    gemeinsam.css           Gestaltung dieser Bausteine (Präfix gem-)
  bereiche/
    planlauf/    Bereich „Planlaufmanagement“
      index.tsx  Einstiegspunkt samt Datenbestand des Bereichs
      App.tsx    Seitenleiste, Kopfzeile und Auswahl der Ansicht
      domain/    Fachlogik ohne UI-Bezug
        types.ts     Datenmodell (Projekt, Rolle, Kontakt, Plan, Vorlage, Planlauf …)
        ablauf.ts    Ablaufverfolgung – die einzige Auflösung der Ziele, parallele Blöcke
                     (samt Namen), Zweige, Ausstiege, Rücksprünge, anstehende Schritte,
                     Einfügestellen
        engine.ts    Fristenrechnung ab dem tatsächlichen Eingang, Rücksprung mit Historie,
                     Ampel, Verzug, gewichteter Fortschritt, To-Dos, Zuständigkeiten
        simulation.ts  Simulation eines Laufs: Prognose, Basisplan, Rückwärtsrechnung
        nachweis.ts  Terminnachweis – Verzug gegenüber dem Basisplan je Seite
        protokoll.ts Änderungsprotokoll der Planläufe (protokollNachziehen)
        bestand.ts   Ablauf von mutate, Löschen mit Löschvermerk, Sammelaktionen
        abgleich.ts  Selektiver Abgleich mit einer Sicherung
        terminrechner.ts  Späteste Übergabe bzw. Ende des Planlaufs aus einem Workflow
        workflowGraph.ts  Gliederung und Bearbeitung eines Workflows für den Editor (blockbewusst)
        abschluss.ts Statuswechsel, Wieder öffnen, Einfügen eines Schritts samt Nachweis
        email.ts     Platzhalter und Aufbereitung der Vorlagen, Sammel-E-Mail, Versandmail
        uebersicht.ts  Gliederung und Zeilenwerte der Planlaufliste – auch für den Export
        export.ts    Kurz- und Langfassung für Excel und PDF
        importVorlagen.ts  Spalten und Schreibweisen der Excel-Vorlagen
        seed.ts      Standard-Prozessketten und Demodaten
        register.ts  Sicht für das Projektregister und Übernahme von dort
      store/
        storage.ts   Persistenz (localStorage), Migration, Rohkopie vor der Umstellung, Sicherung
        store.tsx    Zentraler Zustand, alle Schreibzugriffe, Lade- und Speicherzustand
      lib/router.ts  Hash-Adressen unterhalb von #/planlauf
      pages/         Ansichten (Übersicht, Fristen, Projekte, Workflows, Funktionen, Vorlagen,
                     Terminrechner, Projektreiter)
      components/    Fachliche Bausteine (common.tsx, WorkflowEditor, AblaufVorschau, EmailDialog,
                     PlanlaufListe, PaketDialog, BuendelnDialog, SicherungEinspielen, Abgleich,
                     Hinweisleisten, Terminnachweis, Protokoll, NeuZustaendig, SammelErledigen,
                     SammelErinnern, PlanlisteAktionen, SeiteAuswahl …)
    baubetrieb/  Bereich „Baubetriebsplanung“ (erster Entwurf)
      index.tsx  Einstiegspunkt samt Datenbestand des Bereichs
      App.tsx    Seitenleiste, Kopfzeile und Auswahl der Ansicht
      domain/
        types.ts     Datenmodell (Projekt, Anmeldung, Workflow mit Status, Arten, AnnexVII, Richtlinienfristen)
        workflow.ts  Standard-Workflows je Phase, Nachschlagen von Status und Nachfolgern
        workflowPflege.ts  Workflows speichern, duplizieren, löschen – mit Prüfung belegter Status
        fristen.ts   Fahrplanjahr, Terminfrist je Status, Ampel, Anmeldebedarf
        ablauf.ts    Statuswechsel, Übernahme mit Aufteilung, Status aus dem Import, Rücknahme, Sachstand
        bbpImport.ts Import aus BBPNeo: Lesen (je Anmelde-ID), Vorschau, Anwenden
        export.ts    Excel-Ausgabe des Monitors
        seed.ts      Platzhalter der Richtlinienfristen und Demodaten
        register.ts  Sicht für das Projektregister und Übernahme von dort
      store/         storage.ts (Laden, Migration, Rohkopie, Sicherung) und store.tsx (alle
                     Schreibzugriffe, Lade- und Speicherzustand)
      lib/router.ts  Hash-Adressen unterhalb von #/baubetrieb
      pages/         Übersicht, Termine, Projekte, Import aus BBPNeo (BbpImport), Projekt, Anmeldung,
                     Workflows (mit Editor), Fristen
      components/    Status- und Fristanzeigen, „Status ändern“ als Haken mit Auswahl (AufklappMenue),
                     Dialoge (Anmeldung, Statuswechsel, Nachhaken), Sicherung, Hinweisleisten
                     (Ladefehler, neuere Fassung, Speicher voll); baubetrieb.css (Präfix bb-)
    projektsteuerung/  Bereich „Projektsteuerung“ (erster Entwurf)
      index.tsx  Einstiegspunkt samt Datenbestand und Stylesheet des Bereichs
      App.tsx    Seitenleiste, Kopfzeile und Auswahl der Ansicht
      projektsteuerung.css  Gestaltung des Bereichs (Klassen mit Präfix ps-, nur Design-Tokens)
      domain/
        types.ts     Datenmodell (Projekt, Funktion mit Gewerk, Beteiligter, Protokoll mit TOPs, Einträgen
                     und Zeilen)
        protokoll.ts Reihen, Folgeprotokoll, Zeilen mit eigener Art und Streichen, Aufgaben,
                     Teilnehmende nachziehen, Übernahme aus dem Protokoll-Tool
        beteiligteImport.ts  Excel-/CSV-Import der Projektbeteiligten (Spalten, Abgleich von Funktionen)
        punkte.ts    Offene Aufgaben der Protokolle mit Ampel
        druck.ts     Druckfassungen (Protokoll, Beteiligtenliste) samt Gestaltung und Live-Fenster
        export.ts    Excel-Ausgabe und -Vorlage der Projektbeteiligten
        seed.ts      Standard-Funktionen, Standardlogos und Demodaten
        register.ts  Sicht für das Projektregister und Übernahme von dort
      store/         storage.ts (Laden, Aufbereiten, Rohkopie, Sicherung) und store.tsx (alle
                     Schreibzugriffe, Lade- und Speicherzustand)
      lib/router.ts  Hash-Adressen unterhalb von #/projektsteuerung
      pages/         Übersicht, Projekte, Funktionen, Projekt mit Projektbeteiligten und Protokollen
                     (Liste und Editor)
      components/    Dialoge (Person, Funktion, Gewerk), Excel-Import, Logos, Sicherung, Ampel, Live-Druckansicht,
                     Hinweisleisten (Ladefehler, neuere Fassung, Speicher voll)
    leistungsnachweise/  Bereich „Leistungsnachweise“ (erster Entwurf, aus KaPlan-Test)
      index.tsx  Einstiegspunkt samt Datenbestand des Bereichs (Zugang „bereich“)
      controlling.tsx  Einstieg für den Controlling-Bereich (Zugang „controlling“)
      App.tsx    Seitenleiste, Kopfzeile, Lade- und Anmeldehinweise
      domain/
        types.ts     Datenmodell (Mitarbeiter, Projekt mit Abschnitten, Leistung, Leistungsnachweis,
                     gemeinsamer Leistungstext je Zeitraum, Monatsbestätigung)
        rechte.ts    Rechte je Zugang – an einer Stelle; Anmeldung über „Angemeldet als“ samt
                     automatischem Anlegen (anmeldungAnwenden)
        erfassung.ts Gemeinsame Leistungstexte je Zeitraum, Monatsstatus und Bestätigung,
                     Sperre abgerechneter Zeiträume, Nachziehen der Texte bei neuen Grenzen
        nachweis.ts  Zeilen (Text aus den gemeinsamen Leistungstexten, überholte bearbeitete
                     Zeilen), Texte zusammenführen (auch dreiseitig), Zeiträume, Ergänzen (der
                     offene Nachweis wächst mit), offene Nachweise, Aufschläge je Zeile,
                     neuer Nachweis für alle nicht
                     abgerechneten Leistungen, Abschließen bis zu einem Monatsende oder heute
                     (abschlussEnden, abschlussVorschlag; Stand samt Inhalt der abgerechneten
                     Leistungen), Zusammenführen laufender Nachweise (Fassung 9)
        migrationGesamtaufschlag.ts  Fassung 9 → 10: Gesamtaufschlag in Aufschläge je Zeile
                     umrechnen (gesamtAufschlaegeUmrechnen)
        zeitraum.ts  Tage, Kalenderwochen, Monate, Erfassungsperioden und Stundenformat
        import.ts    Excel-Import der Zeiterfassung (Lesen, Planen, Anwenden)
        auswertung.ts  Stunden je Mitarbeiter, Monat und Projekt
        druck.ts     Druckfassung (PDF)
        export.ts    Excel: Auswertung, Leistungen, Importvorlage (den Nachweis gibt es nur als PDF)
        register.ts  Sicht für das Projektregister und Übernahme von dort
        seed.ts      Standardlogos und Demodaten
      store/         storage.ts (Laden, Migration, Sicherung) und store.tsx (alle Schreibzugriffe, Rechte)
      lib/router.ts  #/leistungsnachweise/… und #/controlling/leistungsnachweise/… (nur diese
                     Adressen; frühere unter #/leistungsnachweise/controlling/… lenkt er um)
      pages/         Übersicht (mit offenen Bestätigungen), Projekte, Projekt mit den Reitern
                     Leistungstexte (projekt/MonatsErfassung.tsx: Leistungstexte und
                     Monatsbestätigung) und Meine Leistungen (projekt/Leistungen.tsx);
                     controlling/ ohne Reiter: ProjektListe.tsx (Leistungsnachweise je Projekt:
                     letzter abgeschlossener, offene Stunden und Bestätigung, gruppiert nach den
                     Bestätigungen bis zum letzten Monatsende), Projekt.tsx (Seite je Projekt mit
                     den Knöpfen Vorschau, Einstellungen, Nachweis löschen und den früheren
                     Leistungsnachweisen), Abrechnung.tsx (der Leistungsnachweis mit seinem
                     Kopf, offen in drei Schritten: Bestätigungen aus BestaetigungsStand.tsx;
                     Prüfen – eine Tabelle mit Leistungstext aus Leistungstexte.tsx, Aufschlag
                     je Zeile, Bemerkung; Abschließen und PDF; dazu Vorschau und Löschen des
                     Nachweises), hilfen.tsx (Eingabe von Stunden und Aufschlägen, Auswahl der
                     Filter, SchrittKopf), ProjektEinstellungen.tsx (Einstellungen: Projekt,
                     Abschnitte, Logos), Auswertung
      components/    Anmeldehinweise (Anmeldung.tsx), Dialoge (Leistung, Nachweis, Neues Projekt),
                     Kalender zum Erfassen (mit Tagesliste), Excel-Import, Hinweis zum
                     Rasterwechsel, Logos, Sicherung, Druckblatt, SpeicherHinweis
    controlling/ Bereich „Controlling“ (mit PIN, ohne eigenen Bestand)
      index.tsx  Einstiegspunkt: PIN-Abfrage, danach der Bereich
      PinEingabe.tsx  PIN-Abfrage
      App.tsx    Seitenleiste, Kopfzeile, Projekte, Archiv bzw. Leistungsnachweise und Auswertung;
                 Hinweis, wenn sich das Projektregister nicht speichern lässt
      controlling.css  Gestaltung (Präfix ct-)
      domain/pin.ts    PIN und Entsperrung für die Sitzung
      lib/router.ts    #/controlling/projekte · #/controlling/archiv · #/controlling/leistungsnachweise/…
                       (…/auswertung: Menüpunkt „Auswertung“)
      pages/Projekte.tsx  Projektkarten mit Stand je Bereich, Dialoge Projekt und Löschen
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
  (heute sieht jeder Arbeitsplatz nur seinen lokalen Stand) – das Projektregister wäre die erste
  gemeinsame Tabelle; die PIN des Controllings wird dann durch Rechte ersetzt.
* Automatischer Mailversand über SMTP statt `mailto:` inkl. Erinnerungslauf im Hintergrund.
* Dateiablage für die eigentlichen Plandateien (PDF/DWG) je Index.
* Auswertungen: Terminlisten, Planlieferlisten und projektweite Verzugsberichte als Export (heute
  gibt es den Terminnachweis je Planlauf).
