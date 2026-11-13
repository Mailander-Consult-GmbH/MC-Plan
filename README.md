# KaPlan

KaPlan gliedert sich in drei getrennte Bereiche, zwischen denen der Startbildschirm wählt:

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

Die Bereiche arbeiten unabhängig voneinander: eigener Datenbestand, eigener Speicherort im
Browser, eigene Einstellungen, eigener Router. **Projekte und Projektbeteiligte teilen sie sich**
über das Projektregister: Ein Projekt kann in mehreren Bereichen geführt werden, Kontaktdaten und
Funktionen seiner Beteiligten gelten dann überall (siehe
[**Gemeinsame Projekte**](#gemeinsame-projekte)). Der
Startbildschirm zeigt die Bereiche als Kacheln mit Titel und Untertitel; in einem Bereich führt **Bereich wechseln** unten
in der Seitenleiste zurück. Der Abschnitt **Funktionsumfang** beschreibt das Planlaufmanagement,
die Abschnitte [**Baubetriebsplanung**](#baubetriebsplanung) und
[**Projektsteuerung**](#projektsteuerung) die übrigen Bereiche.

Die früheren Bereiche **Leistungsnachweise** und **Controlling** (mit PIN) gibt es nicht mehr; ihre
Adressen (`#/leistungsnachweise/…`, `#/controlling/…`) führen zur Bereichsauswahl. Was das
Controlling allein konnte – Projekte archivieren und zurückholen –, steht jetzt in den Bereichen.
Der Stand mit beiden Bereichen liegt im Branch
`backup/2026-11-12-mit-leistungsnachweisen-und-controlling`; der im Browser gespeicherte Bestand
der Leistungsnachweise (Schlüssel `leistungsnachweise.data.v1`) bleibt unberührt liegen und wird
nicht mehr gelesen.

Dieser Stand ist ein **lauffähiger Prototyp ohne Datenbank**: Alle Daten liegen lokal im Browser
(`localStorage`). Die Anwendung ist responsiv und als PWA installierbar.

Die Software ist auf die Nutzung durch mehrere Personen ausgelegt – alle sehen alle Projekte, und
jede Person stellt in der Seitenleiste ein, wer sie ist (eigene Funktion im Projekt:
**Planlaufmanagement**). Solange die
Daten lokal im Browser liegen, arbeitet allerdings jeder Arbeitsplatz auf einem eigenen Stand; ein
gemeinsamer Datenbestand setzt den nächsten Schritt – die Anbindung einer Datenbank – voraus. Das Datenmodell ist bereits so geschnitten, dass es später ohne Änderungen an
der Oberfläche auf eine relationale Datenbank umgestellt werden kann.

## Logos

Die Logos von KaPlan liegen unter `public/logos/`. Die Logos der Bereiche folgen einem Muster: das
Dreieck mit je eigener Verteilung von Blau und Grau (Planlaufmanagement oben blau,
Baubetriebsplanung links, Projektsteuerung rechts), daneben „KaPlan“ und darunter rechtsbündig der
Name in Roboto Light.

| Datei | Verwendung |
| --- | --- |
| `Logo_Startseite.png` | Startbildschirm (Bereichsauswahl), oben links |
| `Logo_Planlaufmanagement.png` | Kopf der Menüleiste im Planlaufmanagement |
| `Logo_Baubetriebsplanung.png` | Kopf der Menüleiste in der Baubetriebsplanung |
| `Logo_Projektsteuerung.png` | Kopf der Menüleiste in der Projektsteuerung |
| `Druck_DB_InfraGO.png`, `Druck_Mailaender_Consult.png` | Standardlogos im Druckkopf von Protokoll und Beteiligtenliste der Projektsteuerung |
| `Logo.png` | Symbol (Dreiecksmarke ohne Schriftzug); nach ihm sind die App-Symbole unter `public/icons/` gezeichnet |

Zum Austauschen genügt es, die Datei unter gleichem Namen zu ersetzen; die Logos werden nur über
die Breite bzw. Höhe skaliert.

Die Symbole in `public/icons/` zeigen die Marke aus `Logo.png` in der Logofarbe `#21426d`, im
Browser-Tab und in der Titelleiste des App-Fensters **ohne Hintergrund**, in der Taskleiste, im
Startmenü und als Desktop-Verknüpfung auf einer **Kachel in der Hintergrundfarbe der Anwendung**
(`#f5f5f7`, `--bg`, mit feiner Randlinie) – das dünne Dreieck allein war in der Windows-Taskleiste
kaum zu sehen. Die Marke ist vektoriell nachgezeichnet, je Größe gerastert und steht genau mittig
(gleicher Abstand oben und unten bzw. links und rechts); bis 64 px ist sie größer und kräftiger
gezeichnet:

| Datei | Verwendung |
| --- | --- |
| `kaplan-dreieck-32/64/192.png` | Browser-Tab und Titelleiste des App-Fensters (`index.html`) – nur das Dreieck |
| `kaplan-app-48/64/96/192/512.png` | Manifest, `purpose: any` – Kachel mit runden Ecken (Taskleiste, Startmenü, Desktop-Verknüpfung, Android-Browser ohne maskierbare Symbole) |
| `kaplan-app-maskable-192/512.png` | Manifest, `purpose: maskable` – deckend, Marke im sicheren Bereich (Android) |
| `kaplan-app-apple-180.png` | `apple-touch-icon` – deckend, iOS rundet selbst ab |

Ein neues Symbol bekommt **neue Dateinamen** (Verweise in `index.html`, `public/manifest.webmanifest`
und `SHELL` in `public/sw.js` anpassen), und der Cache-Name in `public/sw.js` wird hochgezählt –
Browser, Taskleiste und Handy halten Symbole sonst unter dem alten Namen fest.

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
dieser Stand jederzeit wiederherstellen („Angemeldet als“ samt E-Mail-Nachfrage bleibt), über **Sicherung** der gesamte Bestand als JSON sichern
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
`.content` und `.start` in `src/shared/global.css`). Welche Fassung läuft, steht am Fuß des
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

Ein neues App-Symbol übernimmt eine schon installierte App nicht sofort: Chrome und Edge (Android,
Desktop) prüfen das Manifest beim Öffnen und tauschen das Symbol meist innerhalb eines Tages aus,
teils mit Rückfrage. Auf dem iPhone ändert es sich nur, wenn die App neu zum Home-Bildschirm
hinzugefügt wird – die neue App kann dort mit eigenem, leerem Speicher beginnen. **Vor dem
Entfernen einer installierten App deshalb in jedem genutzten Bereich eine Sicherung
herunterladen**; Android und Desktop fragen beim Entfernen, ob auch die Daten gelöscht werden
sollen.

Enthalten sind `manifest.webmanifest`, App-Symbole auf einer Kachel in Programmfarbe (`public/icons/`, siehe
[Logos](#logos): 48–512 px, maskierbar für Android und Apple-Touch-Icon für iOS) sowie ein Service Worker (`public/sw.js`): Seitenaufrufe werden zuerst aus dem Netz geladen – eine
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
**Einspielen**). Die Ablageflächen der Importe (Pläne,
Funktionen, Projektbeteiligte, BBPNeo) sind per Tab erreichbar; Enter oder Leertaste
öffnen die Dateiauswahl. Ebenso sind **anklickbare Zeilen** Tab-Halte (`alsKlickZeile` in
`src/shared/ui.tsx`): Enter oder Leertaste öffnen wie der Klick – im Planlaufmanagement Planläufe,
*Meine To-Dos*, Projekte der Übersicht, Einträge und Planpakete der Planliste, Funktionen und
Personen, in der Baubetriebsplanung die Anmeldungen des Projekts, die Zeilen der Übersicht und der
Anmeldebedarf unter *Termine & Nachhaken*; Knöpfe und Kästchen in der Zeile lösen weiter nur sich
selbst aus. Schließt die Eingabetaste in einem Feld den Dialog ab (*Neues Gewerk*, *Angemeldet
als*, Freigabe- bzw. Prüfbericht-Nr.), löst sie den Knopf, an den der Fokus zurückgeht, nicht noch
einmal aus (`beiEnter`). Die Dateifelder der Importe werden nach dem Lesen geleert – eine
berichtigte Datei gleichen Namens lässt sich über *Andere Datei wählen* erneut lesen.
Kurzmeldungen am unteren Rand (`src/shared/toast.tsx`) lesen
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

Je Gewerk gibt es eine Bezeichnung nur einmal – hier wie im Projekt: Eine Funktion, die das Gewerk
schon führt, weist der Dialog ab („Die Funktion „…“ gibt es bereits.“, ohne Rücksicht auf Groß- und
Kleinschreibung); dieselbe Bezeichnung in einem anderen Gewerk bleibt möglich. Gespeichert wird die
Bezeichnung ohne Leerzeichen am Rand. Wird eine projektübergreifende Funktion **umbenannt**, nennen
auch die projektübergreifenden Workflows – Schritte und E-Mail-Regeln „an Funktion“ – die neue
Bezeichnung, sobald keine übergreifende Funktion mehr die alte trägt. Mit ihnen ziehen die Kopien
der Funktion in den bereits angelegten Projekten mit (gleiche Bezeichnung, gleiches Gewerk) – samt
den Schritten ihrer Planläufe und Projekt-Workflows: Projekte starten Planläufe auch aus den
übergreifenden Workflows und fänden sonst für diese Schritte keine zuständige Person. Führt ein
Projekt die neue Bezeichnung im selben Gewerk schon, bleibt seine Kopie, wie sie ist. Die
Kurzmeldung nennt, wo die Funktion jetzt so heißt („Funktion gespeichert – sie heißt jetzt auch in
3 Workflows und 2 Projekten „…“.“).

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
Über *Neue Funktion* entsteht eine weitere Funktion im gewählten Gewerk; eine Suche ohne Treffer
meldet „Keine Funktion gefunden“ und bietet kein Anlegen an. Beide Wege führen zum Ziel: **Funktion anlegen und dort die Person
eintragen** oder mit *Person hinzufügen* die **Person erfassen und die Funktion gleich dabei
zuweisen** – die Zuweisung kann offen bleiben und später nachgeholt werden. Personen ohne Funktion –
aus einem Import, nach einem Wechsel oder bewusst ohne Zuordnung – stehen in einer eigenen Liste
darunter; ein Klick weist ihnen eine Funktion zu, das Papierkorb-Symbol rechts löscht sie aus dem
Projekt. Das Planlaufmanagement erscheint auf dieser Seite nicht – es ist immer die angemeldete Person.

Wird eine Funktion des Projekts **umbenannt**, nehmen die Planläufe des Projekts die neue
Bezeichnung mit: die Schritte, für die genau diese Funktion gilt (die des Gewerks ihres Eintrags,
ersatzweise die übergreifende), samt ihren E-Mail-Regeln „an Funktion“ – sie blieben sonst ohne
zuständige Person. Die Workflows des Projekts ziehen mit, wenn im Projekt keine Funktion mehr die
alte Bezeichnung trägt. Wechselt die Funktion zugleich das Gewerk, behalten die Läufe, für die sie
nicht mehr gilt, die alte Bezeichnung. Das Änderungsprotokoll fasst das je Lauf zusammen
(„Funktion von 6 Schritten geändert: …“). Die projektübergreifenden Workflows ziehen nicht mit –
sie gelten für alle Projekte. Nennen Workflows, aus denen das Projekt Planläufe startet, die alte
Bezeichnung weiter, ohne dass das Projekt dafür noch eine Funktion hat, sagt es die Kurzmeldung:
„Funktion gespeichert – 3 Workflows nennen weiter „Projektleitung“; neue Planläufe daraus haben für
diese Schritte keine zuständige Person.“ Dann die Funktion im Workflow anpassen oder die Person im
neuen Planlauf von Hand eintragen.

**Excel-Import:** Je Zeile *Gewerk · Funktion · Kürzel · Anrede · Vorname · Name · Firma · Telefon ·
Email · Straße · Nr. · PLZ · Ort · Notiz · SharePoint Eingang · SharePoint Ausgang*. Personen, die
es im Projekt schon gibt, werden aktualisiert; eine leere Zelle oder fehlende Spalte heißt „keine
Angabe“ und lässt stehen, was bei der Person schon eingetragen ist (Telefon, Firma, Anschrift,
SharePoint-Links …), mehrere Zeilen derselben Person ergänzen einander. Erkannt wird eine Person
an ihrer E-Mail; fehlt die E-Mail in der Zeile oder bei der bekannten Person, entscheidet der Name,
wenn er genau eine Person trifft – trifft er mehrere, entsteht eine neue Person, und die Vorschau
sagt es. Die **Anschrift** entsteht aus Straße, Nr., PLZ und Ort: Eine vorhandene Anschrift ersetzt
nur eine Zeile, die Straße und Ort nennt; eine Teilangabe (etwa nur der Ort) füllt eine leere
Anschrift, sonst bleibt die bisherige. Eine Funktion, die die
Datei vergibt, verliert ihre bisherige Besetzung – auch wenn die bisherige Person selbst in der
Datei steht. Nennt die Datei dieselbe Funktion in mehreren Zeilen mit verschiedenen Personen, gilt
die letzte Zeile; die Personen der früheren Zeilen werden ohne diese Funktion hinterlegt. Eine
Postleitzahl im Excel-Format „Postleitzahl“
(Zahlenformat aus Nullen) behält ihre führende Null. Gewerke und Funktionen, die es noch nicht gibt, werden
beim Import angelegt; ein Gewerk, das die Datei nur anders schreibt als die Gewerkeliste („kib“
statt „KIB“), ist dasselbe Gewerk und legt keine zweite Funktion an. „Übergreifend“ steht für
Funktionen ohne Gewerkbezug. Eine optionale Spalte
*Seite* setzt die Seite für den Verzug – bei neuen Funktionen (sonst gilt die Vorbelegung) und bei
vorhandenen, wenn sie abweicht. Die Vorschau nennt je Zeile, was angelegt wird, wen eine Besetzung
ersetzt, welche Seite sich ändert, wo eine unvollständige Anschrift nicht übernommen wird und
welche Zeile eine mehrfach genannte Funktion nicht vergibt.

### Planliste
Planbestand aus Plänen, Planpaketen und Planverzeichnissen im Reiter **Planliste**. Je Eintrag
werden Plancodierung, Titel, Index (standardmäßig leer), Gewerk (EEA, KIB, LST, OLA, OSE, TK, VA oder
freie Eingabe), Planungsphase (Entwurfs-, Genehmigungs- oder Ausführungsplanung, ebenfalls frei ergänzbar),
der Soll-Termin für den Eingang und eine Bemerkung geführt. Plancodierung, Index, Titel, Gewerk und
Planungsphase – beim Planpaket Name, Kurzzeichen und Gewerk – werden ohne Leerzeichen am Rand
gespeichert, damit der Name des Planlaufs, die Besetzung nach Gewerk und das Wiedererkennen im
Excel-Import stimmen.

Pläne lassen sich einem **Planpaket oder Planverzeichnis unterordnen**. Wie die Pläne eines
**Planverzeichnisses** laufen, legt das Verzeichnis fest (siehe nächster Abschnitt). In der
Planliste stehen die Pläne eingerückt unter ihrem Verzeichnis und lassen sich am Pfeil zwischen
Nummer und Symbol zuklappen. Ein Planverzeichnis, das Pläne führt, lässt sich nicht zum Plan
umstellen – erst wenn seine Pläne einem anderen Verzeichnis zugeordnet oder Einzelpläne sind.

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
von Hand gewählt wurde. Wird die von Hand gewählte Person aus dem Projekt gelöscht, folgt der
offene Schritt wieder der Besetzung seiner Funktion – die Rückfrage *Person löschen?* sagt das
vorher.

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
*Als Standardverlauf*, *E-Mails* (siehe *E-Mail-Regeln*), *Anliegen in der Versandmail*, Verschieben im Standardverlauf, Duplizieren,
Entfernen). Karten mit E-Mail-Regeln tragen das Kennzeichen „E-Mail“ bzw. „… E-Mails“; ohne gewählten
Schritt listet die *Übersicht* alle E-Mails des Workflows, ein Klick führt zum Schritt. „+“ zwischen zwei Karten fügt dort eine Aufgabe ein, *Schritt hinzufügen* hängt einen
Schritt an. Ein paralleler Block erscheint als Containerkarte „Parallel · … Zweige“ mit den
Zweigen nebeneinander (bei Platzmangel untereinander), Gabel- und Zusammenführungsbalken, „+“ je
Zweig, Abweichungen im Zweig gestrichelt darunter und Ausstiegen als Text; angelegt wird er über
*Schritt hinzufügen* → *Parallele Zweige* oder in den Schrittdetails mit *Parallel dazu ausführen*,
aufgelöst mit *Aus dem Block lösen*. Ändert sich dabei der Anschluss hinter einem Block, weist der
Editor darauf hin. *Früher im Ablauf* / *Später im Ablauf* ändert nur die Reihenfolge im
Standardverlauf: Sprünge anderer Schritte zum verschobenen Schritt (Rücksprung, Nacharbeit) führen
weiter zu ihm. Fallen beim Entfernen oder Lösen Schritte aus ihrem Zweig heraus, werden sie nicht
zum Anschluss des Blocks, sondern nicht mehr erreicht – die Fußzeile meldet sie. Block und Zweige
lassen sich **benennen**: im Abschnitt *Parallel* der
Schrittdetails mit *Name des Blocks* und *Name des Zweigs*; ein Klick auf den Kopf der
Containerkarte wählt den ersten Schritt des Blocks und setzt den Cursor in *Name des Blocks*. Die
Karte heißt dann etwa „Versand · parallel, 4 Zweige“, die Zweigköpfe tragen ihren Namen statt
„Zweig 1“ usw. Neue Schritte im Block bzw. Zweig übernehmen die Namen, ein neuer Block beginnt ohne;
Planläufe übernehmen sie mit dem Workflow. Änderungen lassen sich rückgängig machen (Strg+Z / Strg+Y); die Fußzeile meldet
Unvollständiges (fehlende Bezeichnung, Entscheidung ohne Antwort, nie erreichte Schritte), und
erst *Speichern* bzw. *Übernehmen* schreibt den Stand. Auf schmalen Bildschirmen stehen die
Schrittdetails in einem Blatt von unten, bei mittlerer Breite in einer Schublade; Escape schließt
dann zuerst Blatt bzw. Schublade, erst danach den Editor.

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

**E-Mail-Regeln.** Der Workflow legt je Schritt fest, **ob, wann und mit welcher Vorlage** KaPlan
eine E-Mail **an wen** vorschlägt – im Abschnitt *E-Mails* der Schrittdetails, je E-Mail eine Regel:

* **Wann:** *Sobald der Schritt ansteht* oder *Nach dem Erledigen*. Bei Entscheidungen zusätzlich
  je Antwort (*Bei Antwort „Ja“*, *Bei Antwort „Nein“* …) – so gehören zu den Ausgängen einer
  Entscheidung verschiedene E-Mails; *Nach jeder Antwort* gilt unabhängig vom Ausgang.
* **An:** *Nächste Zuständige* (die Personen, deren Schritte als Nächstes anstehen), *Zuständige
  dieses Schritts* oder eine **Funktion im Projekt** (etwa der Fachplaner, der vom Ergebnis einer
  Freigabe erfährt) – gemeint ist die Person, die die Funktion für das Gewerk des Plans ausfüllt.
* **Vorlage:** eine der E-Mail-Vorlagen oder *Vorlage automatisch wählen* – dann nach der Lage:
  nach einem Versandschritt **Versand**, bei mehreren Schritten die **Sammelerinnerung**, sonst
  die erste Vorlage mit Anlass *Übergabe* (für E-Mails an eine Funktion bzw. an die Person des
  erledigten Schritts: *Allgemein*).

Ein Schritt ohne Regel schlägt keine E-Mail vor. Verschickt wird nie selbsttätig: Nach dem
Abschluss eines Schritts bietet **E-Mail senden** die vorgesehenen E-Mails an (siehe *Planlauf*).
Die mitgelieferten Workflows sehen eine E-Mail an die nächsten Zuständigen überall dort vor, wo
die Arbeit an eine andere Funktion als das Planlaufmanagement übergeht – bei Entscheidungen je
Antwort („BVB-Freigabe“: nur bei „Nachreichung“, denn nach „Ja“ und „Nein“ ist das
Planlaufmanagement an der Reihe). An die eigene Person geht nie eine E-Mail. Der Platzhalter
`{{antwort}}` nennt in der E-Mail die gewählte Antwort einer Entscheidung.

Planläufe übernehmen die Regeln beim Start mit ihren Schritten. Ändert das Speichern eines
Workflows seine E-Mail-Regeln, fragt KaPlan, ob laufende Planläufe aus diesem Workflow sie
übernehmen sollen – für Schritte gleicher Bezeichnung, Art und Funktion; Schritte, Fristen und
Termine der Planläufe bleiben dabei unverändert.

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
Stellen, hinter denen noch nichts erledigt ist – die Stelle *– an den Anfang –* vor dem ersten
Schritt nur, wenn der Eintrag kein Eingang Soll hat (es gilt für den ersten Schritt; der Hinweis am
Feld sagt das). Im parallelen Block landet der Schritt im Zweig des
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
  Schritte. Er bleibt auch stehen, solange der Schritt nicht im aktuellen Verlauf liegt (andere
  Antwort, abgeschnittener Zweig), und gilt, sobald der Schritt erreicht wird.
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
* Nach dem Erledigen oder Überspringen zeigt **E-Mail senden** die E-Mails, die die
  *E-Mail-Regeln* des Workflows jetzt vorsehen – je Empfänger und Vorlage eine Zeile mit Anlass
  („„BVB-Freigabe“: Nein“), betroffenen Schritten, Vorlage und E-Mail-Schaltfläche –, sofern unter
  *Angemeldet als* die Nachfrage zugelassen ist. Sieht der Workflow nichts vor, erscheint der
  Dialog nicht. Nach dem Überspringen gelten nur die E-Mails an die nächsten Zuständigen. Steht
  die Person nach einem Versandschritt an, ist die Vorlage **Versand** vorgewählt („Versand zur
  Freigabe“ usw.). Eine E-Mail an eine Funktion („Zur Kenntnis“) wird am erledigten Schritt
  vermerkt.
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
  …“, das Datum zweistellig als TT.MM.JJJJ). Die Karte **Protokoll** führt alle Änderungen am Lauf – wer wann einen Schritt erledigt,
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
darüber hinausgeht, hat der Puffer aufgefangen. Beginnt der Workflow mit einem parallelen Block und
hat der Eintrag ein Eingang Soll, werden die Zweiganfänge – wie sonst der erste Schritt – an ihrem
geplanten Soll laut Basisplan gemessen, der Block an seinem geplanten Ende. Liegt das Eingang Soll
vor dem Start des Laufs (die Unterlage kam später als geplant), zählt es dabei ab dem Start – ab da
rechnet auch der Basisplan weiter; die Tage zwischen Eingang Soll und Start sind kein Verzug des
Laufs. Führt der Lauf an einem
Schritt des Regelwegs vorbei (Antwort ohne Nacharbeit, die ihn überspringt, oder Ausstieg aus einem
Block nach vorn), zählt dessen Frist aus dem Basisplan als Zeitgewinn („Schritt „…“ des Basisplans
entfällt“), ein ganz ausgelassener Block mit seiner geplanten Dauer – nicht bei abgebrochenen
Läufen. Bei laufenden Läufen geht die Prognose bis zum Ende
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
Fristenübersicht über alle Projekte – ohne archivierte –, sortiert nach Dringlichkeit und gefiltert nach
überfällig / fällig / im Plan. Angezeigt werden **alle anstehenden Schritte** – bei parallelen
Zweigen mehrere je Planlauf. Ein Schritt gilt als *fällig*, sobald der Soll-Termin näher liegt als
die in den Projekteinstellungen gepflegte Vorlaufzeit. Die Suche findet alles, was die Zeile zeigt –
Schritt, Planlauf, Plannummer und -titel, Projektnummer und -name, Funktion, Person und Firma.

Je Schritt öffnet der Button **Erinnern** ein Fenster mit der vorbereiteten E-Mail: Die zur Lage
passende Vorlage (Erinnerung oder Mahnung) wird ausgewählt, die Platzhalter aus Projekt, Plan,
Schritt, Frist und Empfänger ersetzt (`{{verzug}}` nennt die Einheit, etwa „5 Arbeitstage“,
`{{verzug.zahl}}` nur die Zahl). Von dort lässt sich die Nachricht in **Outlook** öffnen
(`mailto:`, also das eingerichtete Standardprogramm); jede vorbereitete E-Mail wird am Schritt vermerkt. Ein Wechsel der Vorlage füllt
Betreff und Nachricht neu, ein von Hand eingetragener Empfänger bleibt stehen; fehlt jede Vorlage,
verweist der Dialog auf **Vorlagen › E-Mail-Vorlagen**. Stehen bei einer Person
mehrere Schritte an, entsteht eine **Sammel-E-Mail** (Vorlage *Sammelerinnerung*, Platzhalter
`{{liste}}` und `{{anzahl}}`). Ist sie für die Übergabe an das Mailprogramm zu lang, bietet der Dialog
stattdessen **Text kopieren** an.

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

Ausgelöst wird die Versandmail auf zwei Wegen: nach dem Erledigen eines Versandschritts in
**E-Mail senden** – wenn der Workflow dort eine E-Mail an die nächsten Zuständigen vorsieht (siehe
*E-Mail-Regeln*; in den mitgelieferten Workflows ist das so) – und gesammelt über **Versandmail …**
in der Planlaufliste. Dort gilt je
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
[Gemeinsame Projekte](#gemeinsame-projekte)). Der Hinweis
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
solche Datei – Sicherungen der anderen Bereiche weist es mit Hinweis ab („… bitte dort
einspielen.“) – und bietet danach **Alles ersetzen** oder **Abgleichen und auswählen**: Der Abgleich
vergleicht Sicherung und Bestand je Element – übergreifend Gewerke, Funktionen, E-Mail-Vorlagen und
Workflows, je Projekt Projektdaten, Funktionen, Kontakte, Projekt-Workflows und Einträge samt Plänen
und Planläufen – und kennzeichnet sie als neu, geändert, gleich, nur im Bestand oder im Bestand
gelöscht. Gewählte Elemente werden samt Abhängigkeiten übernommen; bei Läufen gleicher Kennung
werden Protokoll, frühere Durchläufe und Erinnerungen beider Seiten vereinigt. Einträge gleicher
Codierung mit anderer Kennung gelten als „vermutlich dasselbe“, ein Projekt mit gleicher Kennung und
anderer Projektnummer lässt sich als Kopie übernehmen. Ein Gewerk, das im Bestand gelöscht wurde
und das Pläne nur noch als Angabe führen, holt der Abgleich nicht von selbst zurück – nur, wenn es
gewählt wird oder mit dem Übernommenen hereinkommt: mit einer gewählten Funktion, einem neuen
Eintrag oder einem als Kopie übernommenen Projekt, dessen Funktionen es nennen. Wäre der Stand
danach nicht stimmig,
wird nichts übernommen. Dazu merkt sich der Bestand Löschungen (Löschvermerke) und den
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
Vorlaufzeit für Erinnerungen, Arbeitstage/Feiertage (aufgelistet als TT.MM.JJJJ) und Absenderangaben sowie – wie im Reiter
*Planläufe* – der **Export**. Unten stehen die Karten **Projekt archivieren** (mit **Archivieren**;
sie steht nur, wenn es etwas zu archivieren gibt – das Projekt also nicht schon archiviert und dem
Projektregister bekannt ist, siehe [Gemeinsame Projekte](#gemeinsame-projekte)) und
**Projekt löschen** (danach erscheint die Projektliste). Die
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
zeigt eine Vorschau Betreff und Text mit Beispielwerten (Links anklickbar, „ORDNERNAME EINFÜGEN“
rot und fett); auf schmalen Bildschirmen wechselt man zwischen „Bearbeiten“ und „Vorschau“. Die
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
Beschriftungen. Bezeichnung, MIC-Projektnummer, DB-G-Nummer, Projektleiter und Hauptbearbeiter
werden ohne Leerzeichen am Rand gespeichert – die MIC-Projektnummer verknüpft das Projekt mit den
anderen Bereichen. Mit ★ markierte Projekte erscheinen in Übersicht und Seitenleiste. Oben rechts im
Projekt stehen **Excel**, **Bearbeiten**, **Archivieren** (siehe
[Gemeinsame Projekte](#gemeinsame-projekte)) und **Löschen**.

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
  werden erst importiert, wenn man ihnen ein Projekt wählt. Anmeldungen, die eine Projektnummer
  verbindet, gehören zusammen – nennt eine „G.016010101“ und eine andere „G.016010101,
  G.016267085“, kommen beide in dasselbe Projekt, das alle Nummern trägt. Verbindet eine Zelle zwei
  verschiedene Projekte des Bestands, bleibt es bei der Zuordnung je Zelle.
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

* Die Seite **Workflows** zeigt die Workflows wie im Planlaufmanagement als **Karten**: Name,
  Kennzeichen (Standard bzw. eigener Workflow), Beschreibung, der Standardverlauf als **Punktkette**
  (Farbe nach Art des Status, am Ende die Übernahme in den nächsten Workflow, dazu die Zahl der
  Abweichungen), Zahl der Status, Abweichungen und Anmeldungen, Sperrzeitraum und Maßnahmenarten;
  dazu **Öffnen** (auch ein Klick auf die Karte), **Duplizieren** und – bei eigenen Workflows ohne
  Anmeldungen – **Löschen**. **Neuer Workflow** legt einen weiteren an.
* Der **Workflow-Editor** ist in Optik und Bedienung der grafische Editor des
  Planlaufmanagements – übernommen ist, was zu Status mit Nachfolgern passt, samt
  **Entscheidungen**; E-Mails und parallele Zweige gibt es hier nicht. Er füllt das Fenster: im Kopf
  der Name, Kennzahlen, **Rückgängig**/**Wiederholen** (Strg+Z/Strg+Y) und **Status hinzufügen** – ein
  Menü mit **Status** und **Entscheidung** (hinter dem gewählten Status, sonst am Ende des
  Standardverlaufs bzw. vor „Genehmigt“); links die
  **Arbeitsfläche**, rechts die Details; im Fuß „Vollständig“ bzw. die Zahl der **Hinweise**,
  **Abbrechen** (mit Rückfrage „Änderungen verwerfen?“) und **Speichern**. Escape schließt zuerst
  das offene Menü bzw. die Details, wenn sie als Blatt oder Schublade über der Fläche liegen, erst
  danach den Editor.
  * **Arbeitsfläche:** Der **Standardverlauf** führt vom Startstatus über den jeweils ersten
    Nachfolger, bis ein Status der Art „Genehmigt“ erreicht ist (Ziel des Workflows), der erste
    Nachfolger in einen anderen Workflow übernimmt, „Eintrag löschen“ ist oder zurückführt
    (Schleife). Daneben stehen die **Abweichungen** – Status, die nur über andere Nachfolger
    erreicht werden, etwa „Abgelehnt“ oder die Anmeldeleiche –, verbunden durch gestrichelte
    Linien (orange: Abweichung, lila: Rücksprung). Übernahmen in andere Workflows und „Eintrag
    löschen“ stehen als Text auf der Karte, Einstiege aus anderen Workflows als Kennzeichen. Jede
    Karte nennt Art, Nummer, Bezeichnung, bei Entscheidungen die Frage (lila Raute), Zuständigkeit,
    Terminfrist, „Nachhaken“ und die Zahl der Anmeldungen. Die **Antworten** einer Entscheidung
    stehen an ihren Übergängen („Ja“ am Standardverlauf, „Nein“ an der Linie zur Abweichung). Das
    **„+“** zwischen zwei Karten fügt dort einen Status ein. Status, zu denen kein Nachfolger führt,
    stehen unter „Nicht erreichbar“.
  * **Entscheidungen** wie im Planlaufmanagement: Ein Status vom Typ **Entscheidung** trägt eine
    **Frage** (etwa „Stimmt die BBK zu?“) und je Nachfolger eine **Antwort** („Ja“ → Zugestimmt,
    „Nein“ → Abgelehnt); die erste Antwort bildet den Standardverlauf. Beim **Status ändern** nennt
    das Menü die Frage und die Antworten („Ja → Zugestimmt“), ebenso die Seite der Anmeldung; der
    Dialog des Statuswechsels und der **Statusverlauf** vermerken die gewählte Antwort. In den
    Standard-Workflows sind „Angemeldet“ („Genehmigt?“), „Mitwirkung BBK“ („Stimmt die BBK zu?“),
    „Zugestimmt“ im KKM („Fristgerecht angemeldet?“) und die Änderungen („Änderung genehmigt?“)
    Entscheidungen.
  * **Statusdetails** (Klick auf eine Karte): Bezeichnung, **Typ** (Status oder Entscheidung, bei
    Entscheidungen die Frage), Art (Entwurf, In Abstimmung, Angemeldet,
    Angemeldet (verspätet), Genehmigt, Abgelehnt, Änderungsabstimmung, Anmeldeleiche),
    **Zuständig** (MIC, BBK, Projektleitung DB oder niemand – in den Standard-Workflows MIC für
    Entwurf, Zugestimmt, Genehmigt und Abgelehnt, die BBK für Mitwirkung, Angemeldet und
    Änderungen), Terminfrist, „Termin dient zum Nachhaken“ (bei der Terminfrist „Nachhak-Termin
    nach Statuswechsel“ immer – der Haken ist dann gesetzt und gesperrt), Bemerkung und unter „Wie geht es
    weiter?“ die **Nachfolger** bzw. bei Entscheidungen die **Antworten** mit „→ Weiter mit“ – der
    erste bildet den Standardverlauf, **Als Standardverlauf** macht einen anderen zum ersten; eine
    leere Antwort verhindert das Speichern; dazu Reihenfolge (der erste Status ist der **Startstatus**),
    **Duplizieren** und **Entfernen** (wer zum entfernten Status führte, führt dann zu dessen erstem
    Nachfolger).
  * **Übersicht** (ohne gewählten Status): Kurzbezeichnung, Beschreibung, Sperrzeitraum (ganzes
    Fahrplanjahr oder tagesscharf), Maßnahmenarten, Kennzahlen, Hinweise und eine Legende.
  * Ein Status, in dem noch Anmeldungen stehen, kann nicht entfallen, und der Sperrzeitraum eines
    Workflows bleibt fest, solange Anmeldungen darin stehen. Auf schmalen Bildschirmen stehen die
    Abweichungen unter dem Standardverlauf, und die Details öffnen sich als Blatt von unten. Eine
    Kopie eines Workflows erhält „(Kopie)“ an Name und Kurzbezeichnung.
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
Nachhaken“ sind eigens gekennzeichnet – das sind die so gekennzeichneten Status und stets die mit
einem Nachhak-Termin als Terminfrist. **Nachgehakt …** hält das Nachhaken mit Notiz und neuem
Termin fest (im Statusverlauf „… · neuer Termin TT.MM.JJJJ“), **Termin festlegen …** setzt die
Frist im aktuellen Status von Hand; ein geleertes Datum hebt den von Hand gesetzten Termin wieder
auf („Terminfrist wird wieder berechnet.“), ohne solchen Termin verlangt der Dialog ein Datum.

### Ansichten
**Übersicht** (Kennzahlen, anstehende Terminfristen samt ausstehender Erstanmeldungen,
Anmeldebedarf, Projekte mit ihren Anmeldungen je Workflow), **Termine & Nachhaken** (alle Fristen
nach Projekten, je Projekt zuerst eine ausstehende Erstanmeldung, Filter
Überfällig/Fällig/Im Plan/Zum Nachhaken; archivierte Projekte fehlen hier wie im Zähler der
Seitenleiste), **Projekte**, **Import aus BBPNeo** und – wie im Planlaufmanagement unter der
aufklappbaren Gruppe **Einstellungen** – **Workflows** und **Fristen** (Fristen laut Richtlinie,
Ampel und Nachhaken; früher die Seite „Einstellungen“, deren Adresse weiter gilt).
**Excel** im Projekt lädt Anmeldungen und Projekt als Arbeitsmappe herunter.

### Daten
Eigener Schlüssel `baubetrieb-planung.data.v1` im `localStorage`, eigene Demodaten,
**Sicherung**/**Einspielen** (JSON mit dem Kennzeichen `"bereich": "baubetrieb"`; Sicherungen
der anderen Bereiche werden mit Hinweis abgewiesen – „… bitte dort einspielen.“ –, eine
beschädigte Datei mit „Die Sicherung konnte nicht gelesen werden.“) und **Zurücksetzen** (lädt Demodaten und
Standard-Workflows neu). Stände der ersten Entwurfsfassung mit Statusnummern werden beim Laden
übernommen: Die Nummern werden den Status der Standard-Workflows zugeordnet, der bisher
eingestellte Nachhak-Abstand gilt für deren Nachhak-Termine. Ältere Stände übernehmen die
Phasennamen SKM, MKM, KM (n-2 & n-1) und KKM (unterjährig), sofern Name, Kurzbezeichnung bzw.
Beschreibung der Standard-Workflows nicht geändert wurden; die Maßnahmenart PzE wird MKM,
A_Vor_N-2, A_Vor_N-1 und A_unterjahr werden A – aus A_Vor_N-2 und A_Vor_N-1 bleibt die KM-Runde
(N-2 bzw. N-1) an der Anmeldung erhalten, damit die Terminfrist weiter gegen die richtige Runde
rechnet. Aus der bisherigen geplanten Sperrzeit eines
Projekts werden seine betroffenen Fahrplanjahre. Die Status der Standard-Workflows erhalten ihre
vorgegebene Zuständigkeit (Fassung 8). Fassung 9 ergänzt an den Anmeldungen den Anmelder und den
Tag der letzten Änderung der Merkmale (beide leer; gesetzt wird er nur bei einer tatsächlichen
Änderung – „Speichern“ ohne Änderung schließt den Dialog nur, ohne „Anmeldung gespeichert.“, und
lässt den Sachstand stehen). Fassung 10 ersetzt Bf/Strecke und Gewerk/Tätigkeit durch den Titel
(beim Umstellen „Bf/Strecke – Gewerk“), ergänzt Projektnummer (BBPNeo) und KM-Runde (leer, soweit
nicht aus der alten Maßnahmenart übernommen) und die
Statuszuordnung des BBPNeo-Imports (Vorgabe). Fassung 11 führt Entscheidungen an Status ein; die
Status der Standard-Workflows übernehmen die mitgelieferten Entscheidungen, solange ihre Nachfolger
die Antworten noch enthalten. Name unter „Angemeldet als“ und
Farbmodus gelten in allen Bereichen; der Name steht im Statusverlauf und ist Hauptbearbeiter neuer
Projekte.

Gespeichert wird – wie im Planlaufmanagement – nur, wenn der Bestand
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
**Projektbeteiligte** und **Protokolle** –, darüber Projektnummer, Status sowie **Bearbeiten**,
**Archivieren** (siehe [Gemeinsame Projekte](#gemeinsame-projekte)) und **Löschen**.
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
Projektbeteiligten zugeordnet sind, lassen sich nicht löschen. Eine Suche ohne Treffer meldet
„Keine Funktion gefunden“ und bietet kein Anlegen an. Bearbeitet wird per Klick auf die Zeile oder
– auch mit der Tastatur – über den Knopf *Funktion bearbeiten* vor dem Löschknopf.

### Projektbeteiligte
Aufgebaut wie die Seite **Funktion** im Planlaufmanagement, aber ohne leere Funktionen: Es stehen
nur Personen in der Liste, je Person mit ihrer Funktion, Firma/Büro, Kürzel und Kontaktdaten.
Beim Hinzufügen wird die Funktion aus einem Auswahlfeld gewählt, nach Gewerk gruppiert;
**+ Neue Funktion anlegen …** legt dort gleich eine neue projektübergreifende Funktion an. Ohne
eigenes Kürzel gilt das der Funktion. Reiter gliedern die Liste nach den Gewerken, die im Projekt
vorkommen. Die Liste lässt sich drucken (PDF) und als Excel-Datei herunterladen.

**Excel-Import** liest eine Liste (.xlsx oder .csv) mit den Spalten Funktion, Gewerk, Kürzel,
Anrede, Vorname, Nachname, Firma / Büro, E-Mail, Telefon, Mobil, Anschrift, Notiz; zwingend ist nur
der Nachname (oder eine Spalte „Name“ mit Vor- und Nachnamen; steht daneben eine Spalte
„Vorname“, gilt „Name“ als Nachname und wird nicht zerlegt). Gelesen wird das erste Blatt mit
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
gewählt und erscheint mit ihrem Kürzel – führen im Protokoll mehrere dasselbe Kürzel (etwa zwei
Personen derselben Funktion ohne eigenes Kürzel), mit ihrem Namen, damit jede Person wählbar und im
Druck erkennbar bleibt. **Nr.** und **Datum** übernehmen nur Gültiges (eine Nummer ab 1, ein
vollständiges Datum); die Eingabe bleibt beim Tippen stehen, beim Verlassen zeigt das Feld wieder
den gespeicherten Wert.

* **Teilnehmende** kommen aus der Projektbeteiligtenliste (**Aus Beteiligtenliste …**, auch mit
  **Neue Person …**); Name, Funktion, Firma und Kürzel werden dort gepflegt und im Protokoll
  nachgezogen. Ändert sich dabei das Kürzel, unter dem eine Person geführt wird – eigenes Kürzel,
  Funktion, Abgleich mit dem Projektregister –, oder kommt jemand mit einem schon geführten Kürzel
  hinzu bzw. geht, folgt **Verantwortlich** der Aufgaben der Person; stehen bleibt, was nicht zu
  entscheiden ist, und was jemand im Protokoll an Name oder Kürzel eines Gastes tippt.
  **Weitere Person** nimmt Gäste ohne Eintrag auf; über das Personensymbol lassen
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
  an den Anfang des nächsten. Die Nummern folgen der neuen Reihenfolge. Beim Verschieben mit der
  Tastatur – auch eines Tagesordnungspunkts – bleibt der Fokus am Knopf des verschobenen Elements.
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
  Protokolle, statt sie zu verdoppeln. Mehrere gewählte Dateien werden gemeinsam übernommen: Stehen
  die Protokolle einer Reihe in einzelnen Dateien, bleibt der Verweis auf das Folgeprotokoll
  erhalten und weitergeführte Aufgaben zählen nicht doppelt – die Dateien einer Reihe also in einem
  Zug wählen.
* **Protokoll löschen**: Aufgaben, die das gelöschte Protokoll weitergeführt hat, gelten im
  Vorprotokoll wieder als offen – außer ein späteres Protokoll führt sie schon weiter; dann laufen
  sie dort weiter, und die Rückfrage nennt dieses Protokoll.

### Übersicht
Nur die **eigenen To-Dos**: offene Aufgaben der Protokolle aller markierten Projekte (Einträge vom
Typ A und Ergänzungen mit eigener Art „Aufgabe“), deren Verantwortlich die Person unter
**Angemeldet als** nennt – mit ihrem Kürzel oder Namen aus den Teilnehmenden oder der
Projektbeteiligtenliste; Groß- und Kleinschreibung zählen nicht. Kürzel und Name aus der Liste
gelten nur, wenn sie im Protokoll niemand anderes führt – wer bloß dieselbe Funktion hat, sieht die
Aufgaben der anderen Person nicht als eigene. Ein Eintrag zählt nur als Aufgabe, solange eine nicht
gestrichene Zeile sie trägt – ist sie gestrichen und bleibt nur eine Ergänzung mit eigener Art,
zählt allein diese. Steht der Name in keiner
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
Protokoll-Tools werden mit Hinweis abgewiesen, eine beschädigte Datei mit „Die Sicherung konnte
nicht gelesen werden.“) und **Zurücksetzen**. Stände der ersten Fassung
erhalten beim Laden die mitgelieferten Gewerke; ihre Funktionen gelten als übergreifend. Ältere
Stände kennen keine gestrichenen Einträge – ihre Einträge gelten als nicht gestrichen. Bis
Fassung 3 bestand ein Eintrag aus Text und Ergänzung: Beim Laden wird der Text eine Zeile aus dem
Protokoll seiner Fundstelle („Prot. 2, Pkt. 1.3“ → „aus Prot. 2“), die Ergänzung eine neue Zeile.
Bis Fassung 4 führte jedes Projekt eine Liste offener Punkte (LOP); sie entfällt beim Laden samt
den Verweisen der Aufgaben, vorhandene Zeilen laufen unter dem Ursprung mit. Die frühere Adresse
`#/projektsteuerung/projekt/<id>/lop` führt zu den Protokollen. Bis Fassung 5 galten für alle
Protokollreihen die Logos des Projekts; daran ändert das Laden nichts. Name unter „Angemeldet als“
und Farbmodus gelten in allen Bereichen.

Gespeichert wird – wie im Planlaufmanagement – nur, wenn der Bestand
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

## Angemeldet als – für alle Bereiche

Unten in der Seitenleiste jedes Bereichs steht **Angemeldet als** mit Name und
Kürzel. Der Dialog dazu fragt den Namen (Vor- und Nachname) und den **Farbmodus für eine
Rot-Grün-Sehschwäche** ab – beides gilt in allen Bereichen: Wer seinen Namen einmal einträgt, ist
überall dieselbe Person. Den Farbmodus setzt allein die Hülle (`src/shell/Shell.tsx`), noch vor dem
ersten Zeichnen eines Bereichs; die Bereichsauswahl zeigt stets die Standardfarben. Bis zur Anmeldung über SSO ist das eine Angabe ohne Kennwort; sie liegt
lokal im Browser (Schlüssel `kaplan-benutzer.v1`). Ohne Eintrag gilt „Max Mustermann“; beim ersten
Start nach dem Umstieg übernimmt KaPlan den ersten selbst eingetragenen Namen der Bereiche
(Planlaufmanagement, Projektsteuerung, Baubetriebsplanung) samt Farbmodus;
die Vorgaben und der Demoname „Lena Roth“ der Projektsteuerung zählen dabei nicht als selbst
eingetragen.

Was die Bereiche mit dem Namen tun: Im Planlaufmanagement füllt die Person in markierten Projekten
das Planlaufmanagement aus (dazu die E-Mail-Nachfrage als eigene Einstellung im Dialog), in der
Baubetriebsplanung steht sie im Statusverlauf und als Hauptbearbeiter neuer Projekte, in der
Projektsteuerung führt sie – steht sie in der Projektbeteiligtenliste – neue Protokollreihen und sieht
ihre Aufgaben als eigene To-Dos. Beim Einspielen einer Sicherung
bleibt der Name, es sei denn, er wird ausdrücklich aus der Sicherung übernommen – dann für alle
Bereiche.

## Gemeinsame Projekte

### Projektregister
Neben den Beständen der Bereiche führt KaPlan ein **Projektregister** (Schlüssel
`kaplan-projektregister.v1` im `localStorage`). Es kennt jedes Projekt mit **Projektnummer,
Bezeichnung und Beschreibung**, die Bereiche, in denen es geführt wird – je Bereich aktiv oder
archiviert –, und die **Projektbeteiligten** des Projekts. Jeder Bereich gleicht seinen Bestand nach
jeder Änderung mit dem Register ab; was ein anderer Bereich geändert hat,
übernimmt er spätestens beim nächsten Öffnen. Speichert ein anderes Fenster denselben Bereich, lädt
der Store dessen Stand sofort nach (`src/gemeinsam/useFremdeAenderung.ts`), statt ihn mit dem
älteren eigenen zu überschreiben. Diesen Stand gleicht das Fenster nicht selbst mit dem Register ab,
denn das hat das andere Fenster getan; erst wenn sich danach das Register ändert, gleicht es mit
beiden aktuellen Ständen ab (`nachgeladen` in `src/gemeinsam/useRegisterAbgleich.ts`).

Mit mehreren Fenstern kommt der Abgleich zur Ruhe: Mitgliedschaften nicht mehr geführter Projekte
löst er nur beim ersten Abgleich nach dem Laden und nach
**Einspielen** bzw. **Zurücksetzen** (`vollstaendig` in `abgleichen`, `src/gemeinsam/abgleich.ts`).
Sonst meldet das allein `uebertragen` aus dem Vergleich von altem und neuem Stand. Führt kein
Bereich ein Projekt mehr – auch nicht als vorgesehene Übernahme –, entfällt es im Register samt
seinen Projektbeteiligten (`mitgliedschaftLoesen`).

Geteilt werden:

* **Stammdaten des Projekts** – Projektnummer und Bezeichnung in allen Bereichen (in der
  Baubetriebsplanung als *MIC-Projektnummer (wiko)*), die Beschreibung zwischen
  Planlaufmanagement und Projektsteuerung. Status (*Aktiv*, *Pausiert* …), ★-Markierung und alles
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
* **Archivstand** – je Bereich; er steht allein im Register, nicht im Bestand der Bereiche.
* Nicht ins Projektregister geht der eigene Kontakt des Planlaufmanagements (*Angemeldet als*) mit
  der Funktion **Planlaufmanagement** – er gehört zum jeweiligen Arbeitsplatz.

Die Baubetriebsplanung führt keine eigenen Personen; im Projekt zeigt die Karte
**Projektbeteiligte** die geteilten Beteiligten zum Nachschlagen.

**Fassung 3 – ohne Leistungsnachweise und Controlling.** Bis Fassung 2 führte das Register auch die
Leistungsnachweise als Bereich (jedes Projekt stand dort), einen Spiegel der ★-Markierungen, die
Herkunft jedes Projekts und ein Archiv „für alle Bereiche“, das das Controlling setzte. Beim Laden
eines älteren Stands stellt `aufbereiten()` (`src/gemeinsam/register.ts`) um:

* Mitgliedschaften der Projekte und Kennungen der Personen in den Leistungsnachweisen entfallen,
  ebenso ★-Spiegel und Herkunft.
* War ein Projekt für alle Bereiche archiviert, ist es danach in jedem seiner Bereiche archiviert
  und lässt sich dort einzeln zurückholen.
* Projekte, die danach kein Bereich mehr führt und die für keinen zur Übernahme vorgesehen sind –
  etwa nur in den Leistungsnachweisen geführte –, entfallen samt ihren Projektbeteiligten.

Vor der Umstellung legt das Laden den gespeicherten Text als Rohkopie ab
(`kaplan-projektregister.v1.vor-fassung-<n>` mit der gespeicherten Fassung, hier also
`…vor-fassung-2`), sofern es sie noch nicht gibt und der Speicher reicht. Der Bestand der
Leistungsnachweise selbst (Schlüssel `leistungsnachweise.data.v1`) bleibt im Browser liegen; KaPlan
liest und ändert ihn nicht mehr. Projekte für alle Bereiche anlegen, bearbeiten und löschen sowie
eine vorgesehene Übernahme zurücknehmen – das konnte nur das Controlling – gibt es nicht mehr:
Angelegt, bearbeitet und gelöscht wird in den Bereichen.

### In den Bereichen
* Die **Projektkacheln** nennen nur Projektnummer (in der Baubetriebsplanung die MIC-Projektnummer),
  Projektname und – falls vorhanden – den Zusatztext (Beschreibung bzw. Bemerkung), dazu oben rechts
  Status und ★-Markierung. Kennzahlen wie Pläne, Planläufe, Anmeldungen, Beteiligte, Protokolle oder
  offene Punkte stehen in Übersicht und Projekt, nicht mehr in der Kachel.
* Unten in jeder Projektkachel nennt die Zeile **Auch in** die anderen Bereiche, die das Projekt
  führen – grau mit *archiviert*, gestrichelt mit *vorgesehen*, solange der Bereich eine Übernahme
  noch nicht vollzogen hat (das tut er beim nächsten Öffnen).
* Unter der Projektliste stehen **grau hinterlegt** die **Projekte aus anderen Bereichen**, die der
  Bereich noch nicht führt – mit Nummer, Name, Zusatztext und unter **Geführt in** den Bereichen,
  die es führen. Projekte, die in allen ihren Bereichen archiviert sind, erscheinen dort nicht.
  **Übernehmen in …** legt das Projekt im Bereich an – samt den Projektbeteiligten (die Meldung
  nennt ihre Zahl). Der Abschnitt steht nur, wenn der Bereich seinen Bestand laden konnte – sonst
  sähe das Register eine Übernahme vor, die niemand anlegt.
* **Archivieren** nimmt ein Projekt in diesem Bereich aus Übersicht und Seitenleiste; es bleibt
  erhalten und steht in der Projektliste im aufklappbaren Abschnitt **Archiv**. Der Knopf steht im
  Planlaufmanagement in den Einstellungen des Projekts (Karte **Projekt archivieren**), in der
  Baubetriebsplanung und in der Projektsteuerung oben im Projekt zwischen **Bearbeiten** und
  **Löschen**; eine Rückfrage gibt es nicht, eine Meldung nennt das Archiv. Ein archiviertes Projekt
  zeigt oben den Hinweis „Dieses Projekt ist in … archiviert. Es erscheint nicht in Übersicht und
  Seitenleiste.“ mit **Aus dem Archiv holen** – der Knopf *Archivieren* fehlt dann; der
  Tastaturfokus geht dabei vom einen Knopf an den anderen, statt verloren zu gehen. Sind alle
  Projekte eines Bereichs archiviert, sagt die Projektliste „Kein aktives Projekt“ und verweist
  auf das Archiv darunter. Findet die Suche der Projektliste nichts, heißt es „Kein Projekt
  gefunden“ – ohne den Knopf *Neues Projekt*, den es nur ohne Suchbegriff gibt –, und bei Treffern
  allein im Archiv „Kein aktives Projekt gefunden“. Trifft die Suche nur Projekte unter *Projekte
  aus anderen Bereichen*, heißt es „Kein Projekt in diesem Bereich gefunden“, und der Text verweist
  auf den Abschnitt darunter (bei Treffern im Archiv und in anderen Bereichen auf beide). Auch die
  bereichsweiten Fristenlisten lassen archivierte Projekte weg – *Fristen & Erinnerungen* im
  Planlaufmanagement, *Termine & Nachhaken* samt Zähler in der Baubetriebsplanung –; im Projekt
  selbst bleiben die Fristen sichtbar. Archiviert wird
  je Bereich: Ein Projekt kann in einem Bereich archiviert und in einem anderen aktiv sein. Der
  Archivstand steht allein im Register (`bereichArchivieren` in `src/gemeinsam/abgleich.ts`);
  solange das Register das Projekt nicht kennt – etwa, weil es sich nicht lesen ließ –, fehlen Knopf
  und Hinweis (im Planlaufmanagement die ganze Karte).
* **Löschen** im Projekt entfernt es nur aus diesem Bereich; in den anderen Bereichen bleibt es mit
  seinen Beteiligten erhalten (der Dialog nennt sie); hier steht es danach unter „Projekte aus
  anderen Bereichen“. Führt es sonst kein Bereich, entfällt es auch im Register. Die Löschdialoge
  nennen nur, was in diesem Bereich entfällt –
  in der Projektsteuerung „Die Protokolle lassen sich nicht wiederherstellen.“, in der
  Baubetriebsplanung „Die Anmeldungen lassen sich nicht wiederherstellen.“.
* Wer ein Projekt mit einer **Projektnummer** anlegt, die es in einem anderen Bereich schon gibt,
  erhält einen Hinweis: Beim Anlegen wird es mit dem vorhandenen verknüpft – auch mit einem dort
  archivierten (der Hinweis sagt dann „(dort archiviert)“); Bezeichnung und
  Beteiligte kommen von dort. Ebenso verknüpft der erste Abgleich nach dem Umstieg Projekte gleicher
  Projektnummer (ohne Nummer: gleicher Bezeichnung) und darin Personen gleicher E-Mail-Adresse bzw.
  gleichen Namens; bei abweichenden Angaben gilt der Stand des Bereichs, der zuerst geöffnet wurde.
  Eine abweichende Bezeichnung oder Beschreibung des anderen Bereichs geht dabei nicht verloren: Sie
  steht danach als Vermerk in der Beschreibung des Projekts („Bezeichnung in … vor der
  Zusammenführung: …“, `stammdatenZusammenfuehren`). Ebenso verknüpft ein Bereich ein zur Übernahme
  vorgesehenes Projekt mit einem eigenen Projekt gleicher Nummer, statt es doppelt anzulegen.
* Nach **Einspielen** einer Sicherung (*Alles ersetzen*) und nach **Zurücksetzen** gilt für geteilte
  Projekte und Personen der Stand des Registers; der Abgleich mit Auswahl im Planlaufmanagement
  zählt dagegen als gewöhnliche Änderung.

Übernahmen und Änderungen an geteilten Projekten und Personen vollziehen die anderen Bereiche beim
nächsten Öffnen; der Archivstand gilt sofort – er steht im Register, nicht im Bestand des Bereichs.

### Hinweise zum Projektregister
Über dem Inhalt jedes Bereichs steht – unter dessen eigenen Hinweisleisten – ein dauerhafter Hinweis,
wenn mit dem Projektregister etwas nicht stimmt (`src/gemeinsam/RegisterHinweis.tsx`):

* **„Das Projektregister ließ sich nicht lesen.“** bzw. **„Das Projektregister stammt aus einer
  neueren Fassung von KaPlan.“** (dann mit **Seite neu laden**): Das Register bleibt unverändert,
  und der Bereich gleicht seine Projekte nicht mit den anderen Bereichen ab.
* **„Projektregister nicht gespeichert.“** samt Grund – meist, weil der Speicher des Browsers voll
  ist und auch das Räumen der Rohkopien nicht reicht. Die Änderungen gelten in
  diesem Fenster weiter, gingen aber beim Schließen der Seite verloren. **Erneut speichern** versucht
  es noch einmal (etwa nachdem anderswo Platz frei geworden ist; gelingt es nicht: „Das
  Projektregister lässt sich weiterhin nicht speichern.“), ebenso jeder weitere Schreibzugriff
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
speichern*, geht er an die Stelle des Hinweises. Hat das andere Fenster einen Stand gespeichert,
den dieses nicht lesen kann (unlesbar oder aus einer neueren Fassung von KaPlan), gilt jener, und
die nicht gespeicherten Änderungen entfallen – dann lautet die Meldung **„Nicht gespeicherte
Änderungen am Projektregister verworfen – …“**. Schreiben zwei Fenster sonst im selben Augenblick,
gilt wie bisher der zuletzt geschriebene Stand.

## Aufbau des Codes

Hinweise für die Arbeit am Code – was nach jeder Änderung nachzuziehen ist, wie gebaut und
veröffentlicht wird und welche Randbedingungen gelten – stehen in [`CLAUDE.md`](CLAUDE.md); das
belegte Inventar aller Routen, Aktionen und Meldungen in [`docs/INVENTAR.md`](docs/INVENTAR.md),
Optimierungspotenzial aus dem Vergleich der drei Bereiche in
[`docs/OPTIMIERUNG.md`](docs/OPTIMIERUNG.md).

KaPlan besteht aus drei getrennten Bereichen. Jeder Bereich bringt seinen
eigenen Datenbestand, seinen eigenen localStorage-Schlüssel, seine eigenen Einstellungen und seinen
eigenen Router mit (Name und Farbmodus kommen aus der gemeinsamen Anmeldung); die Bereiche greifen
nicht aufeinander zu. Gemeinsam ist ihnen nur das
Projektregister in `src/gemeinsam/`: Jeder Store gleicht über `useRegisterAbgleich` ab und
übernimmt Änderungen über sein eigenes `mutate()` (`domain/register.ts` je Bereich). Die Shell
wählt anhand der ersten Wegmarke der Adresse aus, welcher Bereich geladen wird, und hängt ihn erst
beim Betreten ein.

```
src/
  main.tsx       Start der Anwendung, Umlenkung alter Lesezeichen; lädt global.css vor der Shell,
                 damit Regeln der Bereiche gleicher Spezifität gewinnen
  shell/         Startbildschirm und Bereichswechsel
    Shell.tsx    Wählt Bereichsauswahl oder Bereich; setzt den Farbmodus aus „Angemeldet als“
    Start.tsx    Startbildschirm mit den Bereichskacheln und der laufenden Fassung
    NeueFassung.tsx  Hinweis „Neue Fassung von KaPlan verfügbar“ über allen Bereichen
    bereiche.ts  Verzeichnis der Bereiche
    router.ts    #/ · #/planlauf/… · #/baubetrieb/… · #/projektsteuerung/…; Adressen der früheren
                 Bereiche (#/leistungsnachweise/…, #/controlling/…) führen zur Bereichsauswahl
    BereichWechsel.tsx  Rückweg aus einem Bereich zur Bereichsauswahl
  shared/        Bausteine ohne fachlichen Bezug – von keinem Bereich abhängig
    ui.tsx       Karten, Felder, Dialoge (Modal: Fokus, Tab, Escape, Fokus zurück), Segmented
                 Controls (die gewählte Option mit aria-pressed), alsKnopf, alsKlickZeile
                 (anklickbare Zeilen als Tab-Halt), beiEnter (Eingabetaste im Dialogfeld) …
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
                 behalten führende Nullen; Blätter über ihre Beziehung r:id zugeordnet, nicht
                 über die Nummer im Dateinamen; Zellen ohne Zellbezug folgen auf die vorige)
    print.ts     Druckausgabe als Grundlage der PDF-Fassung
    pwa.ts       Registrierung des Service Workers; Fassung des Builds und Prüfung auf eine neuere
    global.css   Design-Tokens im hellen Apple-Erscheinungsbild
  gemeinsam/     Projektregister – der einzige Bestand, den sich die Bereiche teilen
    register.ts  Datenmodell, Laden/Speichern, gemeinsamer Zustand (useRegister, Ergebnis des
                 Speicherns: useRegisterSpeicherZustand; nicht Gespeichertes übersteht das
                 Speichern eines anderen Fensters: eigeneAenderungenNachziehen)
    abgleich.ts  Abgleich Bereich ↔ Register als reine Funktionen (uebertragen, abgleichen),
                 dazu „Übernehmen in …“ und das Archiv je Bereich (inBereichUebernehmen,
                 bereichArchivieren)
    useRegisterAbgleich.ts  Bindet den Store eines Bereichs an das Register
    useFremdeAenderung.ts   Lädt den Bestand nach, wenn ein anderes Fenster ihn speichert
    benutzer.ts  „Angemeldet als“ für alle Bereiche: Name und Farbmodus (useBenutzer)
    useBenutzerAbgleich.ts  Zieht Name und Farbmodus in den Bestand eines Bereichs nach
    AngemeldetAls.tsx       Knopf in der Seitenleiste und Dialog „Angemeldet als“
    ProjektBereiche.tsx     Marken „Auch in“, Projekte aus anderen Bereichen, Archiv
                            (Archivieren, Aus dem Archiv holen), Beteiligte
    RegisterHinweis.tsx     Hinweis in jedem Bereich, wenn sich das Register nicht lesen oder
                            nicht speichern lässt
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
                     (rolleFuerSchritt)
        simulation.ts  Simulation eines Laufs: Prognose, Basisplan, Rückwärtsrechnung
        nachweis.ts  Terminnachweis – Verzug gegenüber dem Basisplan je Seite
        protokoll.ts Änderungsprotokoll der Planläufe (protokollNachziehen)
        bestand.ts   Ablauf von mutate, Löschen mit Löschvermerk, Sammelaktionen, Funktionen
                     ändern (funktionAendern, standardFunktionAendern – Umbenennen zieht
                     Schritte und E-Mail-Regeln mit)
        abgleich.ts  Selektiver Abgleich mit einer Sicherung
        terminrechner.ts  Späteste Übergabe bzw. Ende des Planlaufs aus einem Workflow
        workflowGraph.ts  Gliederung und Bearbeitung eines Workflows für den Editor (blockbewusst)
        abschluss.ts Statuswechsel, Wieder öffnen, Einfügen eines Schritts samt Nachweis
        email.ts     Platzhalter und Aufbereitung der Vorlagen, Sammel-E-Mail, Versandmail
        mailRegeln.ts  E-Mail-Regeln der Workflows: Vorbelegung, Auswertung nach einem Abschluss,
                     Bearbeiten im Editor, Übernahme in laufende Planläufe
        uebersicht.ts  Gliederung und Zeilenwerte der Planlaufliste – auch für den Export
        export.ts    Kurz- und Langfassung für Excel und PDF
        importVorlagen.ts  Spalten und Schreibweisen der Excel-Vorlagen
        seed.ts      Standard-Prozessketten und Demodaten
        register.ts  Sicht für das Projektregister und Übernahme von dort
      store/
        storage.ts   Persistenz (localStorage), Migration, Rohkopie vor der Umstellung, Sicherung
        store.tsx    Zentraler Zustand, alle Schreibzugriffe, Lade- und Speicherzustand
      lib/router.ts  Hash-Adressen unterhalb von #/planlauf (Übersicht unter #/planlauf selbst)
      pages/         Ansichten (Übersicht, Fristen, Projekte, Workflows, Funktionen, Vorlagen,
                     Terminrechner, Projektreiter)
      components/    Fachliche Bausteine (common.tsx, WorkflowEditor, AblaufVorschau, EmailDialog,
                     PlanlaufListe, PaketDialog, BuendelnDialog, SicherungEinspielen, Abgleich,
                     Hinweisleisten, Terminnachweis, Protokoll, NeuZustaendig („E-Mail senden“), SammelErledigen,
                     SammelErinnern, PlanlisteAktionen, SeiteAuswahl …)
    baubetrieb/  Bereich „Baubetriebsplanung“ (erster Entwurf)
      index.tsx  Einstiegspunkt samt Datenbestand des Bereichs
      App.tsx    Seitenleiste, Kopfzeile und Auswahl der Ansicht
      domain/
        types.ts     Datenmodell (Projekt, Anmeldung, Workflow mit Status, Arten, AnnexVII, Richtlinienfristen)
        workflow.ts  Standard-Workflows je Phase, Nachschlagen von Status und Nachfolgern
        workflowPflege.ts  Workflows speichern, duplizieren, löschen – mit Prüfung belegter Status
        workflowGraph.ts   Standardverlauf, Abweichungen, Prüfung und Bearbeitungen für den Workflow-Editor
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
                     Dialoge (Anmeldung, Statuswechsel, Nachhaken), grafischer Workflow-Editor mit
                     Punktkette der Liste (WorkflowEditor, AblaufVorschau, workflowEditor.css,
                     Präfix bb-wf-), Sicherung, Hinweisleisten
                     (Ladefehler, neuere Fassung, Speicher voll); baubetrieb.css (Präfix bb-)
    projektsteuerung/  Bereich „Projektsteuerung“ (erster Entwurf)
      index.tsx  Einstiegspunkt samt Datenbestand und Stylesheet des Bereichs
      App.tsx    Seitenleiste, Kopfzeile und Auswahl der Ansicht
      projektsteuerung.css  Gestaltung des Bereichs (Klassen mit Präfix ps-, nur Design-Tokens)
      domain/
        types.ts     Datenmodell (Projekt, Funktion mit Gewerk, Beteiligter, Protokoll mit TOPs, Einträgen
                     und Zeilen)
        protokoll.ts Reihen, Folgeprotokoll, Löschen (protokollLoeschen), Zeilen mit eigener Art
                     und Streichen, Aufgaben, Teilnehmende nachziehen samt „Verantwortlich“
                     (zuordnung, werMitziehen), Übernahme aus dem Protokoll-Tool
        beteiligteImport.ts  Excel-/CSV-Import der Projektbeteiligten (Spalten, Abgleich von Funktionen)
        punkte.ts    Offene Aufgaben der Protokolle mit Ampel
        druck.ts     Druckfassungen (Protokoll, Beteiligtenliste) samt Gestaltung und Live-Fenster
        export.ts    Excel-Ausgabe und -Vorlage der Projektbeteiligten
        seed.ts      Standard-Funktionen, Standardlogos und Demodaten
        register.ts  Sicht für das Projektregister und Übernahme von dort
      store/         storage.ts (Laden, Aufbereiten, Rohkopie, Sicherung) und store.tsx (alle
                     Schreibzugriffe, Lade- und Speicherzustand)
      lib/router.ts  Hash-Adressen unterhalb von #/projektsteuerung (Übersicht unter
                     #/projektsteuerung selbst)
      pages/         Übersicht, Projekte, Funktionen, Projekt mit Projektbeteiligten und Protokollen
                     (Liste und Editor)
      components/    Dialoge (Person, Funktion, Gewerk), Excel-Import, Logos, Sicherung, Ampel, Live-Druckansicht,
                     Hinweisleisten (Ladefehler, neuere Fassung, Speicher voll)
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
  gemeinsame Tabelle.
* Automatischer Mailversand über SMTP statt `mailto:` inkl. Erinnerungslauf im Hintergrund.
* Dateiablage für die eigentlichen Plandateien (PDF/DWG) je Index.
* Auswertungen: Terminlisten, Planlieferlisten und projektweite Verzugsberichte als Export (heute
  gibt es den Terminnachweis je Planlauf).
