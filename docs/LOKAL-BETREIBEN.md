# KaPlan im eigenen Haus betreiben – ohne GitHub

Diese Anleitung beschreibt, wie KaPlan auf einem Server im Haus läuft und wie es dort ohne GitHub
weiterentwickelt und veröffentlicht wird. Sie richtet sich an die Person, die KaPlan betreut, und
an die IT, die den Server stellt.

## Das Wichtigste vorweg

* **KaPlan ist ein Ordner mit fertigen Dateien.** Nach dem Bauen liegt alles in `dist/`
  (`index.html`, `assets/`, `icons/`, `logos/`, `manifest.webmanifest`, `sw.js`, `fassung.json`).
  Es gibt kein Server-Programm und keine Datenbank.
* **Es braucht einen Webserver.** Die Dateien dürfen auf einem Netzlaufwerk liegen – ein
  Doppelklick auf die `index.html` startet KaPlan aber nicht (siehe [Netzlaufwerk](#netzlaufwerk)).
* **Gemeinsam gehostet heißt nicht gemeinsame Daten.** Die Daten liegen weiterhin im Browser jeder
  einzelnen Person. Jede sieht nur ihre eigenen Projekte (siehe
  [Mehrere Personen](#mehrere-personen)).
* **Beim Umzug auf eine neue Adresse startet KaPlan leer.** Vorher sichern, danach einspielen
  (siehe [Daten umziehen](#daten-umziehen)).

## 1. Webserver einrichten (IT)

Jeder Webserver, der Dateien ausliefert, genügt – etwa der IIS eines Windows-Servers, ein
vorhandener Intranet-Server oder nginx. KaPlan arbeitet mit relativen Pfaden und läuft deshalb auch
in einem Unterordner (`https://server/kaplan/`).

1. Einen Ordner nur für KaPlan anlegen, zum Beispiel `D:\Web\kaplan`.
2. Den **Inhalt** von `dist/` hineinkopieren (nicht den Ordner `dist` selbst).
3. Den Ordner im Webserver als Website oder als virtuelles Verzeichnis freigeben.
4. Die Adresse im Browser aufrufen. Es erscheint der Startbildschirm mit den drei Bereichen.

### Worauf der Server achten muss

* **Dateitypen:** `.webmanifest` und `.woff2` müssen ausgeliefert werden. Der IIS kennt
  `.webmanifest` von Haus aus nicht und antwortet dann mit „404“. Abhilfe ist eine Datei
  `web.config` im KaPlan-Ordner:

  ```xml
  <?xml version="1.0" encoding="UTF-8"?>
  <configuration>
    <system.webServer>
      <staticContent>
        <remove fileExtension=".webmanifest" />
        <mimeMap fileExtension=".webmanifest" mimeType="application/manifest+json" />
        <remove fileExtension=".woff2" />
        <mimeMap fileExtension=".woff2" mimeType="font/woff2" />
      </staticContent>
    </system.webServer>
  </configuration>
  ```

* **Zwischenspeichern:** `index.html`, `sw.js`, `manifest.webmanifest` und `fassung.json` sollen
  nicht lange zwischengespeichert werden, sonst sehen offene Fenster eine neue Fassung erst spät.
  Die Dateien unter `assets/` tragen eine Kennung im Namen und dürfen lange gespeichert bleiben.
* **Keine Umleitungsregeln nötig:** KaPlan führt seine Seiten hinter dem `#` der Adresse
  (`…/kaplan/#/planlauf`); der Server sieht immer nur den Ordner.

Die Einstellungen für den IIS stammen aus allgemeiner Kenntnis und sind **nicht an einem IIS
erprobt** – bitte beim Einrichten prüfen.

### HTTPS oder HTTP

Geprüft am fertigen Build mit einem einfachen Webserver:

| | Adresse mit HTTPS | Adresse nur mit HTTP (`http://server/kaplan/`) |
| --- | --- | --- |
| Startbildschirm, alle drei Bereiche | ja | ja |
| Speichern, Sicherung, Einspielen | ja | ja |
| Hinweis „Neue Fassung von KaPlan verfügbar“ | ja | ja |
| Als App installieren (Taskleiste, eigenes Fenster) | ja | nein |
| Weiterarbeiten ohne Verbindung zum Server | ja | nein |
| „Kopieren“ im Dialog „E-Mail senden“ | ja | nein – es erscheint „Kopieren nicht möglich – bitte Text manuell markieren.“ |

**Empfehlung: HTTPS** mit einem Zertifikat, dem die Rechner im Haus vertrauen. Die Daten im
Browser hängen an der genauen Adresse – wer später von HTTP auf HTTPS wechselt, zieht noch einmal
um.

### Netzlaufwerk

Liegt der Ordner auf einem gemeinsamen Netzlaufwerk und wird die `index.html` per Doppelklick
geöffnet, bleibt KaPlan bei „KaPlan wird geladen …“ stehen: Browser laden die Programmteile einer
als Datei geöffneten Seite aus Sicherheitsgründen nicht (geprüft). Das Netzlaufwerk eignet sich
also als **Ablage**, auf die ein Webserver zeigt, nicht als Ersatz für ihn.

## 2. Daten umziehen

Die Daten liegen im Browser und hängen an Adresse, Browser und Benutzerkonto des Rechners. Unter
der neuen Adresse startet KaPlan mit Beispieldaten. Jede Person zieht ihre Daten selbst um:

1. Unter der **alten** Adresse in jedem Bereich, den sie nutzt, unten in der Seitenleiste
   **Sicherung** wählen. Es entsteht je Bereich eine Datei.
2. Unter der **neuen** Adresse denselben Bereich öffnen und die Datei über **Einspielen** laden.
3. Den Namen unter **Angemeldet als** prüfen und das Farbschema neu wählen – es gehört zum Gerät
   und steckt in keiner Sicherung.

Nicht in den Sicherungen enthalten ist das **Archiv**: Welche Projekte in einem Bereich
archiviert sind, steht nur im Projektregister des Browsers. Archivierte Projekte erscheinen nach
dem Umzug wieder als aktive und müssen erneut archiviert werden.

Die alte Adresse bleibt am besten noch einige Wochen erreichbar, bis alle umgezogen sind.

## 3. Mehrere Personen

Jede Person arbeitet mit ihrem eigenen Datenbestand im eigenen Browser – auch wenn alle dieselbe
Adresse aufrufen. Einen gemeinsamen Bestand gibt es nicht. Stände lassen sich über
**Sicherung** und **Einspielen** weitergeben; im Planlaufmanagement bietet **Einspielen** neben dem
vollständigen Ersetzen **Abgleichen und auswählen …** an: Es zeigt die Unterschiede zur Sicherung
einer Kollegin oder eines Kollegen und übernimmt nur, was ausgewählt wird.

Ein gemeinsamer Bestand für alle braucht eine Datenbank – siehe [Ausblick](#ausblick-gemeinsame-daten-in-einer-sql-datenbank).

## 4. Weiterentwickeln ohne GitHub

### Einmalig einrichten (Windows-Rechner der betreuenden Person)

1. **Git für Windows** und **Node.js** (aktuelle LTS-Fassung) installieren.
2. **Claude Code** installieren – als Desktop-App oder für das Terminal; die Schritte stehen in
   der Anleitung von Anthropic: <https://code.claude.com/docs>.
3. Den Code einmal von GitHub holen (`git clone …` oder „Code → Download ZIP“) und in einen
   Ordner legen, der in der Datensicherung des Hauses liegt, zum Beispiel `C:\Projekte\KaPlan`.
4. In diesem Ordner einmal die Bausteine laden:

   ```bash
   npm ci
   ```

Git arbeitet auch ganz ohne GitHub: Jede Änderung wird weiterhin als Commit im Ordner
festgehalten und lässt sich zurücknehmen. Betreibt die IT einen eigenen Git-Server, kann der
Ordner zusätzlich dorthin gesichert werden.

### Der Ablauf einer Änderung

1. Claude Code im Ordner `KaPlan` öffnen und die Änderung beschreiben – wie bisher. Die Regeln des
   Projekts (`CLAUDE.md`, `README.md`, `docs/INVENTAR.md`) liegen im Ordner und gelten weiter.
2. Ansehen, bevor etwas veröffentlicht wird:

   ```bash
   npm run dev
   ```

   KaPlan läuft dann auf dem eigenen Rechner unter `http://localhost:5173` – mit eigenen
   Testdaten, getrennt von den echten.
3. Bauen:

   ```bash
   npm run build
   ```

4. Den Inhalt von `dist/` in den KaPlan-Ordner des Servers kopieren und dort alles Bisherige
   ersetzen. Die `web.config` des Servers bleibt dabei liegen.

Offene Fenster melden danach von selbst „Neue Fassung von KaPlan verfügbar“.

### Was sich gegenüber heute ändert

| Heute mit GitHub | Künftig im Haus |
| --- | --- |
| Nach dem Merge baut und veröffentlicht GitHub selbst | Bauen und Kopieren von Hand – oder mit einem kleinen Skript, das Claude dafür schreibt |
| Jede Änderung wird vor dem Merge automatisch gebaut und geprüft | `npm run typecheck` und `npm run build` laufen auf dem eigenen Rechner |
| Der Code liegt zusätzlich bei GitHub | Der Ordner muss in die Datensicherung des Hauses |
| Sitzungen mit Claude in der Cloud | Claude Code auf dem Windows-Rechner |

Als erste Aufgabe im Haus sollte Claude die Projektunterlagen anpassen: `CLAUDE.md` und `README.md`
beschreiben noch das Veröffentlichen über GitHub (Workflow `.github/workflows/pages.yml`, Ordner
`app/`, Zweig `gh-pages`); beides entfällt dann.

## Ausblick: gemeinsame Daten in einer SQL-Datenbank

Der Server im Haus ist die Voraussetzung dafür, aber noch nicht die Kopplung. Dazu fehlen:

1. **Ein Server-Programm zwischen Browser und Datenbank.** Ein Browser kann eine SQL-Datenbank
   nicht selbst ansprechen; die Zugangsdaten lägen sonst offen bei jedem Nutzer.
2. **Ein Umbau der Speicherung in KaPlan.** Heute lädt und speichert jeder Bereich an einer Stelle
   (`store/storage.ts`) in den Browser. Diese Stelle müsste stattdessen mit dem Server sprechen.
3. **Eine Anmeldung.** Der Server muss wissen, wer liest und schreibt – das passt zur geplanten
   Anmeldung über das Microsoft-Konto.
4. **Regeln für gleichzeitiges Arbeiten.** Was geschieht, wenn zwei Personen dasselbe Projekt
   ändern, ist heute nicht geregelt, weil jede ihren eigenen Bestand hat.

Das ist ein eigenes Vorhaben mit mehreren Schritten, kein Schalter.
