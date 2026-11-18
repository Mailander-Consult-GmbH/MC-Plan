# Schritt für Schritt: KaPlan ins Haus holen und an die SQL-Datenbank koppeln

Umzug und Datenbank geschehen **in einem Schritt für die Nutzer**: Alle arbeiten unter der
bisherigen Adresse weiter, bis KaPlan im Haus mit Anmeldung und Datenbank fertig und geprüft ist.
Dann wird an einem Stichtag umgeschaltet – einmal sichern, einmal übernehmen, neue Adresse.

Das Protokoll hat drei Phasen:

* **Phase A – Vorbereiten** (Abschnitte 1 bis 4): Freigaben, Bestellung bei der IT, eigener
  Rechner, Test-Adresse.
* **Phase B – Bauen und prüfen** (Abschnitte 5 bis 8): Anmeldung, Datenbank, gleichzeitiges
  Bearbeiten – alles auf der Test-Adresse. Der Betrieb unter der bisherigen Adresse läuft
  unverändert weiter.
* **Phase C – Umschalten** (Abschnitte 9 bis 11): Probelauf, Stichtag, GitHub ablösen.

Bei jedem Schritt steht, **wer** ihn erledigt (**Sie**, **IT**, **Claude**), und woran Sie
erkennen, dass er geschafft ist („Fertig, wenn …“). Die technischen Einzelheiten für die IT stehen
in [`LOKAL-BETREIBEN.md`](LOKAL-BETREIBEN.md).

**Festgelegt ist bereits:** Microsoft SQL Server · alle sollen dieselben Projekte gleichzeitig
bearbeiten · keine Auswertung mit anderen Werkzeugen · Zugriff nur im Büro oder per VPN · Umzug
und Datenbank in einem Schritt.

**Stand der Erprobung:** Dass KaPlan über einen einfachen Webserver läuft, ist am fertigen
Programm geprüft; die Einstellungen für den Windows-Webserver (IIS) sind es nicht. Anmeldung und
Datenbank sind ein Plan – das Server-Programm gibt es noch nicht. Die Schritte dort beschreiben,
was Sie veranlassen und prüfen, nicht einzelne Klicks.

## Änderungen bleiben jederzeit möglich

Es gibt keinen Punkt, ab dem sich KaPlan mit Claude Code nicht mehr ändern ließe – weder während
des Umbaus noch im Betrieb mit Datenbank.

* **Während Phase B:** Kleine Änderungen am laufenden KaPlan sind weiter möglich und werden wie
  heute über GitHub veröffentlicht. Das Programm wird so gebaut, dass derselbe Code beides kann:
  im Browser speichern (bisherige Adresse) und über den Server speichern (Adresse im Haus).
* **Im Betrieb mit Datenbank:** Claude Code arbeitet weiter am Code-Ordner auf Ihrem Rechner. Drei
  Dinge kommen hinzu:
  1. Jede neue Fassung geht zuerst auf die Test-Adresse, dann in den Betrieb.
  2. Ändert sich, **was** gespeichert wird (ein neues Feld, eine neue Art von Eintrag), muss die
     Datenbank mit umgestellt werden. Claude schreibt die Umstellung mit; sie läuft erst gegen die
     Test-Datenbank.
  3. Gehört zur Änderung auch das Server-Programm, spielt die IT es ein – oder Sie, wenn die IT
     Ihnen das Recht dazu gibt.
* **Claude arbeitet nie in der Betriebs-Datenbank.** Geprüft wird mit der Test-Datenbank.

---

# Phase A – Vorbereiten

## 1. Freigaben einholen

- [ ] **Sie:** Mit Ihrer Führungskraft klären, dass KaPlan künftig auf einem Server im Haus läuft,
      eine Datenbank bekommt und alle gemeinsam darin arbeiten.
- [ ] **Sie:** Bei der IT einen Ansprechpartner für das Vorhaben erfragen.
- [ ] **Sie:** Den Datenschutz einbeziehen, falls das im Haus für neue Anwendungen vorgesehen ist –
      KaPlan führt Namen, E-Mail-Adressen und Telefonnummern von Projektbeteiligten.
- [ ] **Sie:** Klären, ob Sie auf Ihrem Rechner Programme installieren dürfen (Abschnitt 3) oder
      ob die IT das übernimmt.

**Fertig, wenn** Sie einen Ansprechpartner in der IT und das Einverständnis Ihrer Führungskraft
haben.

## 2. Alles bei der IT bestellen

- [ ] **Sie:** Diese Anfrage an die IT schicken (Text anpassen):

  > Wir möchten die Webanwendung KaPlan künftig im Haus betreiben – mit Anmeldung über unser
  > Microsoft-Konto und einer Microsoft-SQL-Datenbank. Wir bitten um:
  >
  > **Webserver**
  > 1. zwei Websites auf einem Windows-Webserver (IIS) mit HTTPS und einem Zertifikat, dem unsere
  >    Rechner vertrauen: eine für den Betrieb (z. B. `https://kaplan.<firma>.intern`) und eine
  >    zum Testen (z. B. `https://kaplan-test.<firma>.intern`), erreichbar im Büro und per VPN;
  > 2. je einen Ordner dazu, in den ich Dateien kopieren darf (Schreibrecht für mein Konto);
  > 3. die Einstellungen aus der beiliegenden Anleitung `LOKAL-BETREIBEN.md`, Abschnitt 1
  >    (Dateitypen `.webmanifest` und `.woff2`, Zwischenspeichern);
  > 4. das „ASP.NET Core Hosting Bundle“ und je eine Anwendung unter den beiden Websites, z. B.
  >    `/api`, für ein kleines Server-Programm.
  >
  > **Datenbank**
  > 5. zwei leere Datenbanken auf dem Microsoft SQL Server: `KaPlan` und `KaPlan_Test`;
  > 6. ein Dienstkonto, das in beiden lesen, schreiben und Tabellen anlegen darf;
  > 7. die Freischaltung vom Webserver zum SQL Server – und von meinem Rechner zur Datenbank
  >    `KaPlan_Test`, damit ich beim Entwickeln prüfen kann.
  >
  > **Anmeldung**
  > 8. eine App-Registrierung in Microsoft Entra ID vom Typ „Single-page application“ mit den
  >    beiden KaPlan-Adressen und `http://localhost:5173` als Umleitungsadressen. Ich brauche
  >    daraus die Mandanten-ID und die Anwendungs-ID;
  > 9. die Festlegung, wer sich anmelden darf – alle Beschäftigten oder eine Gruppe.
  >
  > Das Kennwort des Dienstkontos für den Betrieb bitte nicht per E-Mail schicken, sondern selbst
  > in der Konfiguration des Server-Programms hinterlegen; ich nenne die Stelle.

- [ ] **Sie:** Die Datei `docs/LOKAL-BETREIBEN.md` anhängen.
- [ ] **IT:** Einrichten und Ihnen nennen: die beiden Adressen, die beiden Ordnerpfade, Servername
      und Datenbanknamen, Mandanten-ID und Anwendungs-ID.

**Fertig, wenn** Sie diese Angaben haben und in beide Ordner eine Testdatei kopieren können.
Mandanten-ID und Anwendungs-ID sind keine Geheimnisse. Das **Kennwort** der Betriebs-Datenbank
geben Sie nie in Claude ein und speichern es nie im Code-Ordner.

## 3. Den eigenen Rechner einrichten

- [ ] **Sie oder IT:** **Git für Windows** installieren.
- [ ] **Sie oder IT:** **Node.js** installieren (die Fassung mit dem Zusatz „LTS“).
- [ ] **Sie oder IT:** Das **.NET SDK** installieren – es wird für das Server-Programm gebraucht.
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

Der Code bleibt bis zum Umschalten auf GitHub: Änderungen werden dorthin gesichert, und das
laufende KaPlan wird weiter von dort veröffentlicht.

## 4. Die Test-Adresse in Betrieb nehmen

Hier zeigt sich, ob der Server richtig eingerichtet ist – noch ohne Anmeldung und Datenbank.

- [ ] **Sie:** Claude beauftragen: „Baue KaPlan.“ Es entsteht der Ordner `dist`.
- [ ] **Sie:** Den **Inhalt** von `dist` in den **Test**-Ordner des Servers kopieren (nicht den
      Ordner `dist` selbst).
- [ ] **Sie:** Die Test-Adresse im Browser öffnen und prüfen:
  - [ ] Der Startbildschirm erscheint, das Logo ist zu sehen.
  - [ ] Alle drei Bereiche lassen sich öffnen.
  - [ ] Ein Projekt anlegen, Seite neu laden – das Projekt ist noch da.
  - [ ] In der Adresszeile bietet der Browser „App installieren“ an.
- [ ] **Sie:** Claude beauftragen: „Schreibe mir ein Skript, das KaPlan baut und in den Ordner
      `<Pfad>` kopiert.“ Damit ist jede spätere Veröffentlichung ein Doppelklick.

**Fertig, wenn** KaPlan unter der Test-Adresse läuft. Die Betriebs-Adresse bleibt bis zum Stichtag
leer.

Klappt etwas nicht: Fehlt das Angebot „App installieren“ oder sieht die Schrift anders aus, fehlen
meist die Dateitypen aus der Anleitung für die IT (Abschnitt 1 dort).

---

# Phase B – Bauen und prüfen

Alles in dieser Phase geschieht auf der **Test**-Adresse mit der Datenbank `KaPlan_Test`. Die
Kolleginnen und Kollegen arbeiten unter der bisherigen Adresse weiter und merken nichts davon.

## 5. Server-Programm und Microsoft-Anmeldung

- [ ] **Sie:** Claude beauftragen: „Baue die Stufe ‚Server-Programm und Microsoft-Anmeldung‘ aus
      `docs/SCHRITTE-UMZUG-UND-DATENBANK.md`.“ Claude fragt dabei nach den Angaben aus
      Abschnitt 2 und nach Ihrer Zustimmung zur Anmelde-Bibliothek von Microsoft.
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

**Fertig, wenn** Sie sich auf der Test-Adresse mit Ihrem Microsoft-Konto anmelden können.

## 6. Der erste Bereich speichert in der Datenbank

Vorschlag: das Planlaufmanagement.

- [ ] **Sie:** Vorab entscheiden und Claude mitteilen:
  - [ ] Dürfen alle Angemeldeten alle Projekte sehen und ändern (wie heute)?
  - [ ] Was soll geschehen, wenn der Server nicht erreichbar ist – nur lesen oder gar nicht
        arbeiten?
- [ ] **Sie:** Claude beauftragen: „Baue die Stufe ‚Planlaufmanagement speichert in der
      Datenbank‘.“
- [ ] **IT oder Sie:** Die neue Fassung auf der Test-Website einspielen.
- [ ] **Sie und eine zweite Person:** Auf der Test-Adresse prüfen:
  - [ ] Sie legen ein Projekt an – die zweite Person sieht es nach dem Öffnen.
  - [ ] Die zweite Person ändert einen Plan – bei Ihnen steht die Änderung nach dem Neuladen.
  - [ ] Sie schließen den Browser und öffnen KaPlan an einem anderen Rechner – alles ist da.
- [ ] **Sie:** Unter der **bisherigen** Adresse prüfen, dass dort alles unverändert läuft.

**Fertig, wenn** zwei Personen auf der Test-Adresse denselben Bestand sehen.

## 7. Gleichzeitiges Bearbeiten

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

**Fertig, wenn** alle vier Proben bestanden sind.

## 8. Die übrigen Bereiche

- [ ] **Sie:** Für die Projektsteuerung entscheiden: Ein Protokoll bearbeitet jeweils nur eine
      Person, die anderen lesen mit – einverstanden?
- [ ] **Sie:** Claude nacheinander beauftragen: Projektregister, Baubetriebsplanung,
      Projektsteuerung – jeweils „speichert in der Datenbank“ und „gleichzeitiges Bearbeiten“.
- [ ] **Sie und eine zweite Person:** Je Bereich die Proben aus den Abschnitten 6 und 7
      wiederholen.

**Fertig, wenn** alle drei Bereiche auf der Test-Adresse gemeinsam arbeiten.

---

# Phase C – Umschalten

Heute hat jede Person ihre eigene Kopie der Projekte. In der Datenbank gibt es jedes Projekt nur
einmal.

## 9. Probelauf der Übernahme

- [ ] **Sie:** Eine Liste aller Projekte anlegen und je Projekt und Bereich festlegen, **wessen
      Stand** der gemeinsame wird.
- [ ] **Jede Person:** Unter der bisherigen Adresse je genutztem Bereich unten links
      **Sicherung** wählen und Ihnen die Dateien geben. Danach normal weiterarbeiten.
- [ ] **Sie:** Claude beauftragen: „Übernimm diese Sicherungen nach der Liste in die
      Test-Datenbank.“
- [ ] **Jede Person:** Auf der Test-Adresse die eigenen Projekte durchsehen und Fehlendes melden.
- [ ] **Sie:** Projekte, die vorher im Archiv lagen, notieren – das Archiv steckt nicht in den
      Sicherungen und wird nach dem Stichtag neu gesetzt.
- [ ] **Sie:** Den Probelauf wiederholen, bis nichts mehr fehlt.

**Fertig, wenn** alle ihre Projekte auf der Test-Adresse vollständig wiederfinden.

## 10. Der Stichtag

- [ ] **Sie:** Den Stichtag ankündigen, zum Beispiel so:

  > KaPlan zieht am `<Datum>` um und wird gemeinsam: Alle sehen und bearbeiten dann dieselben
  > Projekte.
  >
  > 1. Bitte am `<Datum>` bis `<Uhrzeit>` unter der **bisherigen** Adresse in jedem Bereich, den
  >    Sie nutzen, unten links **Sicherung** wählen und mir die Dateien schicken.
  > 2. Danach unter der bisherigen Adresse **nichts mehr ändern**.
  > 3. Ab `<Datum, Uhrzeit>` gilt die neue Adresse `<Adresse>`. Anmelden mit dem Microsoft-Konto.

- [ ] **Jede Person:** Sicherungen erstellen und Ihnen geben.
- [ ] **Sie:** Alle Sicherungen aufbewahren – sie sind der Rückweg, falls etwas fehlt.
- [ ] **Sie:** Claude beauftragen: „Übernimm diese Sicherungen nach der Liste in die
      Betriebs-Datenbank.“ Das Kennwort hinterlegt dafür die IT; Claude bekommt es nicht.
- [ ] **IT oder Sie:** Die geprüfte Fassung auf der Betriebs-Website einspielen.
- [ ] **Sie:** Unter der Betriebs-Adresse anmelden und stichprobenweise prüfen.
- [ ] **Sie:** Die notierten Projekte wieder archivieren.
- [ ] **Sie:** Allen mitteilen, dass die neue Adresse gilt.

**Fertig, wenn** alle unter der Betriebs-Adresse dieselben Projekte sehen und bearbeiten.

Fehlt nach dem Stichtag etwas, liegt es in den aufbewahrten Sicherungen und lässt sich nachtragen.

## 11. GitHub ablösen

Erst wenn die neue Adresse einige Wochen ohne Störung läuft.

- [ ] **Sie:** Claude beauftragen: „Passe `CLAUDE.md` und `README.md` an: Veröffentlicht wird
      nicht mehr über GitHub, sondern durch Kopieren auf den Server im Haus.“
- [ ] **Sie:** Mit der IT klären, wie der Ordner `C:\Projekte\KaPlan` gesichert wird – oder ob es
      einen hauseigenen Git-Server gibt.
- [ ] **Sie:** Auf GitHub die Veröffentlichung abschalten (Repository → Settings → Pages) und das
      Repository archivieren (Settings → ganz unten „Archive this repository“). Es bleibt als
      Sicherung lesbar, wird aber nicht mehr verändert.

**Fertig, wenn** KaPlan nur noch unter der Adresse im Haus erreichbar ist.

---

# Danach: laufender Betrieb

- [ ] **IT:** Die Datenbank `KaPlan` in die regelmäßige Sicherung aufnehmen und das Zurückspielen
      einmal proben.
- [ ] **Sie:** Jede neue Fassung zuerst auf der Test-Adresse einspielen und prüfen, dann auf der
      Betriebs-Adresse (siehe [Änderungen bleiben jederzeit möglich](#änderungen-bleiben-jederzeit-möglich)).
- [ ] **Sie und IT:** Festhalten, wer bei Störungen angesprochen wird – für den Server die IT, für
      KaPlan selbst Sie.
