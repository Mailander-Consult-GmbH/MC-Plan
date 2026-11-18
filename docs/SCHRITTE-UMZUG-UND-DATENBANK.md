# Schritt für Schritt: KaPlan ins Haus holen und an die SQL-Datenbank koppeln

Dieses Protokoll führt in zwei Teilen durch das Vorhaben:

* **Teil 1 – Umzug ins Haus** (Abschnitte 1 bis 6): KaPlan läuft auf einem Server im Haus und wird
  ohne GitHub weiterentwickelt. Danach arbeitet jede Person noch mit ihrem eigenen Bestand.
* **Teil 2 – Gemeinsame Daten** (Abschnitte 7 bis 12): Anmeldung mit dem Microsoft-Konto,
  Microsoft-SQL-Datenbank, gleichzeitiges Bearbeiten.

Bei jedem Schritt steht, **wer** ihn erledigt (**Sie**, **IT**, **Claude**), und woran Sie
erkennen, dass er geschafft ist („Fertig, wenn …“). Die technischen Einzelheiten für die IT stehen
in [`LOKAL-BETREIBEN.md`](LOKAL-BETREIBEN.md).

**Festgelegt ist bereits:** Microsoft SQL Server · alle sollen dieselben Projekte gleichzeitig
bearbeiten · keine Auswertung mit anderen Werkzeugen · Zugriff nur im Büro oder per VPN.

**Stand der Erprobung:** Teil 1 ist am fertigen Programm mit einem einfachen Webserver geprüft, die
Einstellungen für den Windows-Webserver (IIS) nicht. Teil 2 ist ein Plan – das Server-Programm
gibt es noch nicht; die Schritte dort beschreiben, was Sie veranlassen und prüfen, nicht einzelne
Klicks.

---

# Teil 1 – Umzug ins Haus

## 1. Freigaben einholen

- [ ] **Sie:** Mit Ihrer Führungskraft klären, dass KaPlan künftig auf einem Server im Haus läuft
      und eine Datenbank bekommt.
- [ ] **Sie:** Bei der IT einen Ansprechpartner für das Vorhaben erfragen.
- [ ] **Sie:** Den Datenschutz einbeziehen, falls das im Haus für neue Anwendungen vorgesehen ist –
      KaPlan führt Namen, E-Mail-Adressen und Telefonnummern von Projektbeteiligten.
- [ ] **Sie:** Klären, ob Sie auf Ihrem Rechner Programme installieren dürfen (Abschnitt 3) oder
      ob die IT das übernimmt.

**Fertig, wenn** Sie einen Ansprechpartner in der IT und das Einverständnis Ihrer Führungskraft
haben.

## 2. Den Server bei der IT bestellen

- [ ] **Sie:** Diese Anfrage an die IT schicken (Text anpassen):

  > Wir möchten die Webanwendung KaPlan künftig im Haus betreiben. Sie besteht aus fertigen
  > Dateien (HTML, JavaScript, Bilder) – in der ersten Stufe ohne Server-Programm und ohne
  > Datenbank. Wir bitten um:
  >
  > 1. zwei Websites auf einem Windows-Webserver (IIS) mit HTTPS und einem Zertifikat, dem unsere
  >    Rechner vertrauen: eine für den Betrieb (z. B. `https://kaplan.<firma>.intern`) und eine
  >    zum Testen (z. B. `https://kaplan-test.<firma>.intern`), erreichbar im Büro und per VPN;
  > 2. je einen Ordner dazu, in den ich Dateien kopieren darf (Schreibrecht für mein Konto);
  > 3. die Einstellungen aus der beiliegenden Anleitung `LOKAL-BETREIBEN.md`, Abschnitt 1
  >    (Dateitypen `.webmanifest` und `.woff2`, Zwischenspeichern).
  >
  > Zur Planung: In einer späteren Stufe kommen auf demselben Server ein kleines Server-Programm
  > (ASP.NET Core), eine Microsoft-SQL-Datenbank und die Anmeldung über unser Microsoft-Konto
  > (Entra ID) hinzu. Dafür melde ich mich gesondert.

- [ ] **Sie:** Die Datei `docs/LOKAL-BETREIBEN.md` anhängen.
- [ ] **IT:** Websites und Ordner einrichten, Ihnen die beiden Adressen und die beiden
      Ordnerpfade nennen.

**Fertig, wenn** Sie zwei Adressen und zwei Ordnerpfade haben und in beide Ordner eine Testdatei
kopieren können.

## 3. Den eigenen Rechner einrichten

- [ ] **Sie oder IT:** **Git für Windows** installieren.
- [ ] **Sie oder IT:** **Node.js** installieren (die Fassung mit dem Zusatz „LTS“).
- [ ] **Sie oder IT:** **Claude Code** für Windows installieren – die Desktop-App; die Schritte
      stehen unter <https://code.claude.com/docs>. Anmelden mit Ihrem bisherigen Claude-Konto.
- [ ] **Sie:** Einen Ordner anlegen, der in der Datensicherung des Hauses liegt, zum Beispiel
      `C:\Projekte`.
- [ ] **Sie:** Den Code von GitHub in diesen Ordner holen. In Claude Code genügt der Auftrag:
      „Hole das Repository `Mailander-Consult-GmbH/MC-Plan` von GitHub in den Ordner
      `C:\Projekte\KaPlan`.“ Es öffnet sich ein Fenster zur Anmeldung bei GitHub.
- [ ] **Sie:** Claude Code im Ordner `C:\Projekte\KaPlan` öffnen und beauftragen: „Richte das
      Projekt ein und starte KaPlan zum Ansehen.“
- [ ] **Sie:** Die Adresse öffnen, die Claude nennt (`http://localhost:5173`).

**Fertig, wenn** auf Ihrem Rechner unter `http://localhost:5173` der Startbildschirm von KaPlan
erscheint.

## 4. Zum ersten Mal im Haus veröffentlichen

Zuerst auf der Test-Adresse, dann auf der Betriebs-Adresse.

- [ ] **Sie:** Claude beauftragen: „Baue KaPlan.“ Es entsteht der Ordner `dist`.
- [ ] **Sie:** Den **Inhalt** von `dist` in den **Test**-Ordner des Servers kopieren (nicht den
      Ordner `dist` selbst).
- [ ] **Sie:** Die Test-Adresse im Browser öffnen und prüfen:
  - [ ] Der Startbildschirm erscheint, das Logo ist zu sehen.
  - [ ] Alle drei Bereiche lassen sich öffnen.
  - [ ] Ein Projekt anlegen, Seite neu laden – das Projekt ist noch da.
  - [ ] In der Adresszeile bietet der Browser „App installieren“ an.
- [ ] **Sie:** Wenn alles stimmt, denselben Inhalt in den **Betriebs**-Ordner kopieren und dort
      noch einmal kurz prüfen.
- [ ] **Sie:** Claude beauftragen: „Schreibe mir ein Skript, das KaPlan baut und in den Ordner
      `<Pfad>` kopiert.“ Damit ist jede spätere Veröffentlichung ein Doppelklick.

**Fertig, wenn** KaPlan unter der Betriebs-Adresse läuft.

Klappt etwas nicht: Fehlt das Angebot „App installieren“ oder sieht die Schrift anders aus, fehlen
meist die Dateitypen aus der Anleitung für die IT (Abschnitt 1 dort).

## 5. Die Daten umziehen – jede Person für sich

Unter der neuen Adresse startet KaPlan mit Beispieldaten. Die echten Daten liegen noch im Browser
unter der bisherigen Adresse.

- [ ] **Sie:** Den Umzug zuerst selbst durchführen (Schritte unten) und prüfen, ob alles da ist.
- [ ] **Sie:** Die Kolleginnen und Kollegen informieren, zum Beispiel so:

  > KaPlan zieht um. Bitte bis zum `<Datum>` einmal Folgendes tun:
  >
  > 1. KaPlan unter der **bisherigen** Adresse öffnen.
  > 2. Jeden Bereich öffnen, den Sie nutzen, und unten links **Sicherung** wählen. Es entsteht je
  >    Bereich eine Datei im Download-Ordner.
  > 3. KaPlan unter der **neuen** Adresse `<Adresse>` öffnen.
  > 4. Denselben Bereich öffnen, unten links **Einspielen** wählen und die Datei laden.
  > 5. Unter **Angemeldet als** den Namen prüfen und das Farbschema wählen.
  > 6. Projekte, die vorher im Archiv lagen, erneut archivieren – das Archiv zieht nicht mit um.
  >
  > Ab dann bitte nur noch die neue Adresse verwenden.

- [ ] **Jede Person:** Die sechs Schritte durchführen.
- [ ] **Sie:** Nach dem Datum nachfragen, ob alle umgezogen sind.

**Fertig, wenn** alle unter der neuen Adresse mit ihren Daten arbeiten.

## 6. GitHub ablösen

Erst wenn Abschnitt 5 abgeschlossen ist und die neue Adresse einige Wochen ohne Störung läuft.

- [ ] **Sie:** Claude beauftragen: „Passe `CLAUDE.md` und `README.md` an: Veröffentlicht wird
      nicht mehr über GitHub, sondern durch Kopieren auf den Server im Haus.“
- [ ] **Sie:** Mit der IT klären, wie der Ordner `C:\Projekte\KaPlan` gesichert wird – oder ob es
      einen hauseigenen Git-Server gibt.
- [ ] **Sie:** Auf GitHub die Veröffentlichung abschalten (Repository → Settings → Pages) und das
      Repository archivieren (Settings → ganz unten „Archive this repository“). Es bleibt als
      Sicherung lesbar, wird aber nicht mehr verändert.

**Fertig, wenn** KaPlan nur noch unter der Adresse im Haus erreichbar ist.

---

# Teil 2 – Gemeinsame Daten

Jeder Abschnitt wird zuerst auf der **Test**-Adresse mit einer **Test**-Datenbank ausprobiert.
Die Betriebs-Adresse bleibt unverändert, bis ein Abschnitt abgenommen ist.

## 7. Datenbank und Anmeldung bei der IT bestellen

- [ ] **Sie:** Diese Anfrage an die IT schicken:

  > Für die nächste Stufe von KaPlan bitten wir um:
  >
  > 1. zwei leere Datenbanken auf dem Microsoft SQL Server: `KaPlan` und `KaPlan_Test`;
  > 2. ein Dienstkonto, das in beiden Datenbanken lesen, schreiben und Tabellen anlegen darf;
  > 3. das „ASP.NET Core Hosting Bundle“ auf dem Webserver und je eine Anwendung unter den beiden
  >    KaPlan-Websites, z. B. `/api`;
  > 4. die Freischaltung vom Webserver zum SQL Server;
  > 5. eine App-Registrierung in Microsoft Entra ID vom Typ „Single-page application“ mit den
  >    beiden KaPlan-Adressen als Umleitungsadressen. Ich brauche daraus die Mandanten-ID und die
  >    Anwendungs-ID;
  > 6. die Festlegung, wer sich anmelden darf – alle Beschäftigten oder eine Gruppe.
  >
  > Das Kennwort des Dienstkontos bitte nicht per E-Mail schicken, sondern selbst in der
  > Konfiguration des Server-Programms hinterlegen; ich nenne die Stelle.

- [ ] **IT:** Einrichten und Ihnen Servername, Datenbanknamen, Mandanten-ID und Anwendungs-ID
      nennen.

**Fertig, wenn** Sie diese vier Angaben haben. Mandanten-ID und Anwendungs-ID sind keine
Geheimnisse; das **Kennwort** des Dienstkontos geben Sie nie in Claude ein und speichern es nie im
Code-Ordner.

## 8. Server-Programm und Microsoft-Anmeldung

- [ ] **Sie:** Claude beauftragen: „Baue die Stufe ‚Server-Programm und Microsoft-Anmeldung‘ aus
      `docs/SCHRITTE-UMZUG-UND-DATENBANK.md`.“ Claude fragt dabei nach den Angaben aus
      Abschnitt 7 und nach Ihrer Zustimmung zur Anmelde-Bibliothek von Microsoft.
- [ ] **Claude:** Das Server-Programm bauen, die Anmeldeseite und eine Anleitung für die IT zum
      Einspielen. Der abgestimmte Entwurf der Anmeldeseite (blaue Fläche links, Anmeldung rechts)
      liegt unter `docs/entwuerfe/anmeldung/` – als Bild (`anmeldeseite.png`) und als
      Quelltext (`Anmeldung.entwurf.tsx`; Variante „B“ darin ist die gewählte).
- [ ] **IT:** Das Server-Programm auf der Test-Website einspielen und das Kennwort hinterlegen.
- [ ] **Sie:** Auf der Test-Adresse prüfen:
  - [ ] Es erscheint die Anmeldeseite.
  - [ ] Nach „Mit Microsoft anmelden“ erscheint der Startbildschirm mit „Guten Morgen, `<Ihr
        Vorname>`“.
  - [ ] „Abmelden“ führt zurück zur Anmeldeseite.
  - [ ] Eine Person, die nicht zugelassen ist, kommt nicht hinein.
- [ ] **Sie:** Abnehmen; danach spielt die IT dasselbe auf der Betriebs-Website ein.

**Fertig, wenn** sich alle mit ihrem Microsoft-Konto anmelden. Die Daten liegen in dieser Stufe
noch im Browser.

## 9. Der erste Bereich speichert in der Datenbank

Vorschlag: das Planlaufmanagement.

- [ ] **Sie:** Claude beauftragen: „Baue die Stufe ‚Planlaufmanagement speichert in der
      Datenbank‘.“
- [ ] **Sie:** Vorab entscheiden und Claude mitteilen:
  - [ ] Dürfen alle Angemeldeten alle Projekte sehen und ändern (wie heute)?
  - [ ] Was soll geschehen, wenn der Server nicht erreichbar ist – nur lesen oder gar nicht
        arbeiten?
- [ ] **IT:** Die neue Fassung auf der Test-Website einspielen.
- [ ] **Sie und eine zweite Person:** Auf der Test-Adresse prüfen:
  - [ ] Sie legen ein Projekt an – die zweite Person sieht es nach dem Öffnen.
  - [ ] Die zweite Person ändert einen Plan – bei Ihnen steht die Änderung nach dem Neuladen.
  - [ ] Sie schließen den Browser und öffnen KaPlan an einem anderen Rechner – alles ist da.

**Fertig, wenn** zwei Personen auf der Test-Adresse denselben Bestand sehen.

## 10. Gleichzeitiges Bearbeiten

- [ ] **Sie:** Claude beauftragen: „Baue die Stufe ‚Gleichzeitiges Bearbeiten‘.“
- [ ] **Sie und eine zweite Person:** Gleichzeitig auf der Test-Adresse prüfen:
  - [ ] Eine Änderung der anderen Person erscheint bei Ihnen nach wenigen Sekunden, ohne
        Neuladen.
  - [ ] Sie ändern beide **verschiedene** Pläne desselben Projekts – beide Änderungen bleiben.
  - [ ] Sie ändern beide **denselben** Schritt zur selben Zeit – die zweite Person bekommt einen
        Hinweis, wer inzwischen geändert hat, und sieht den neuen Stand. Nichts geht still
        verloren.
  - [ ] Eine Person löscht einen Plan, den die andere gerade offen hat – die andere bekommt einen
        verständlichen Hinweis.
- [ ] **Sie:** Abnehmen.

**Fertig, wenn** alle vier Proben bestanden sind.

## 11. Die übrigen Bereiche

- [ ] **Sie:** Claude nacheinander beauftragen: Projektregister, Baubetriebsplanung,
      Projektsteuerung – jeweils „speichert in der Datenbank“ und „gleichzeitiges Bearbeiten“.
- [ ] **Sie:** Für die Projektsteuerung entscheiden: Ein Protokoll bearbeitet jeweils nur eine
      Person, die anderen lesen mit – einverstanden?
- [ ] **Sie und eine zweite Person:** Je Bereich die Proben aus den Abschnitten 9 und 10
      wiederholen.

**Fertig, wenn** alle drei Bereiche auf der Test-Adresse gemeinsam arbeiten.

## 12. Die bestehenden Daten übernehmen und umschalten

Heute hat jede Person ihre eigene Kopie der Projekte. In der Datenbank gibt es jedes Projekt nur
einmal.

- [ ] **Sie:** Eine Liste aller Projekte anlegen und je Projekt und Bereich festlegen, **wessen
      Stand** der gemeinsame wird.
- [ ] **Sie:** Einen Stichtag festlegen und ankündigen. Ab dem Stichtag ändert niemand mehr etwas
      im alten Bestand.
- [ ] **Jede Person:** Am Stichtag je Bereich eine **Sicherung** erstellen und Ihnen geben.
- [ ] **Sie:** Die Sicherungen aufbewahren – sie sind der Rückweg, falls etwas fehlt.
- [ ] **Sie:** Claude beauftragen: „Übernimm diese Sicherungen nach der Liste in die
      Test-Datenbank.“
- [ ] **Jede Person:** Auf der Test-Adresse die eigenen Projekte durchsehen und Fehlendes melden.
- [ ] **Sie:** Wenn nichts mehr fehlt: dieselbe Übernahme in die Betriebs-Datenbank, danach die
      neue Fassung auf der Betriebs-Website einspielen lassen.
- [ ] **Sie:** Allen mitteilen, dass ab jetzt gemeinsam gearbeitet wird.

**Fertig, wenn** alle unter der Betriebs-Adresse dieselben Projekte sehen und bearbeiten.

---

# Danach: laufender Betrieb

- [ ] **IT:** Die Datenbank `KaPlan` in die regelmäßige Sicherung aufnehmen und das Zurückspielen
      einmal proben.
- [ ] **Sie:** Jede neue Fassung zuerst auf der Test-Adresse einspielen und prüfen, dann auf der
      Betriebs-Adresse.
- [ ] **Sie und IT:** Festhalten, wer bei Störungen angesprochen wird – für den Server die IT, für
      KaPlan selbst Sie.
