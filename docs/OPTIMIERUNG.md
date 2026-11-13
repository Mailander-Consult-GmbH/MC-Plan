# KaPlan – Optimierungspotenzial

Stand: 12.11.2026, nach dem Entfernen der Bereiche Leistungsnachweise und Controlling.

Diese Liste beantwortet die Frage: **Wo lösen Planlaufmanagement, Baubetriebsplanung und
Projektsteuerung dasselbe unterschiedlich – in der Funktion, im Wortlaut, in der Optik oder im
Code?** Sie ist zum Durchgehen gedacht: Jeder Punkt hat eine Kennung, eine Einschätzung und eine
Zeile für die Entscheidung.

## So ist die Liste zu lesen

* **Heute** – was der Nutzer bzw. der Code heute zeigt, mit den Fundstellen.
* **Vorschlag** – wie es sich vereinheitlichen ließe und welcher Bereich das Vorbild ist.
* **Aufwand** – *klein*: bis etwa eine Stunde · *mittel*: ein halber bis ein Tag · *groß*: mehr.
* **Nutzen** – *hoch* / *mittel* / *niedrig*, aus Sicht von Bedienung und Pflege.
* **Entscheidung** – zum Ankreuzen: ☐ umsetzen · ☐ später · ☐ nicht umsetzen.

Die Punkte stammen aus einer systematischen Durchsicht des Codes und der Oberfläche im Browser
(1400 px und 400 px Breite). Funktionale Fehler, die dabei auffielen, sind **nicht** hier
gesammelt, sondern direkt behoben – siehe Abschnitt 1. Die Vorschläge sind Skizzen, keine
fertigen Pläne; die Fundstellen (Datei und Zeile) beziehen sich auf den Stand dieses Pull Requests
und verschieben sich mit jeder Änderung.

Randbedingungen des Projekts, an die sich alle Vorschläge halten: `src/shared/` enthält nur
fachfreie Bausteine, die Bereiche greifen nicht aufeinander zu und teilen sich nur
`src/gemeinsam/`; keine neuen Laufzeitabhängigkeiten.

## Empfehlung in Kürze

Wenn nur wenig Zeit ist – diese Punkte bringen am meisten:

1. **Abschnitt 2 bestätigen** (E-1 bis E-6): die Festlegungen aus dem Entfernen der beiden Bereiche.
2. **Fachlich entscheiden**, was nur Sie entscheiden können: Zähler und Kacheln (U-2), Projektstatus
   (U-13), Schwelle „fällig“ (W-2), Beschreibung/Bemerkung (D-1), Abgleich von Sicherungen in allen
   Bereichen (D-4).
3. **Schnelle Verbesserungen für die Nutzer** (je bis etwa eine Stunde): Fristenliste ins Menü des
   Planlaufmanagements (R-11), einheitliche Begriffe (U-10, M-4), Rückfrage beim Löschen (U-11),
   Tagesfelder (W-3), roter Löschen-Knopf (M-5).
4. **Größter Hebel für die Pflege:** gemeinsamer Anwendungsrahmen (R-1), Projektliste und
   Projektkopf (U-3, U-4), Hinweisleisten (R-2), Dialog „Sicherung einspielen“ (R-3) – danach laufen
   die Bereiche nicht mehr auseinander.
5. **Absichern:** die Prüfskripte der Durchsicht ins Repository übernehmen (P-2) – das Projekt hat
   bisher keine Tests.

**Inhalt**

1. [Bereits behoben](#1-bereits-behoben-in-diesem-pull-request)
2. [Entscheidungen aus dem Entfernen der beiden Bereiche](#2-entscheidungen-aus-dem-entfernen-der-beiden-bereiche)
3. [Rahmen, Navigation, Sicherung](#3-rahmen-navigation-sicherung)
4. [Übersichten, Projektlisten, Projektseiten](#4-übersichten-projektlisten-projektseiten)
5. [Bedienmuster: Dialoge, Listen, Wortlaut](#5-bedienmuster-dialoge-listen-wortlaut)
6. [Optik und Gestaltung](#6-optik-und-gestaltung)
7. [Workflows, Fristen und Ampeln](#7-workflows-fristen-und-ampeln)
8. [Datenhaltung und Datenmodell](#8-datenhaltung-und-datenmodell)
9. [Einzelhinweise je Bereich](#9-einzelhinweise-je-bereich)
10. [Aufräumen: unbenutzter Code](#10-aufräumen-unbenutzter-code)
11. [Anhang: Was schon einheitlich ist](#11-anhang-was-schon-einheitlich-ist)

---

## 1. Bereits behoben (in diesem Pull Request)

Funktionale Fehler und klare Abweichungen eines Bereichs von den beiden anderen. Jede Zeile ist
mit einem Skript oder im Browser nachgestellt und nach der Korrektur erneut geprüft.

| Bereich | Was war falsch | Jetzt |
| --- | --- | --- |
| Planlaufmanagement | Der farbige Ampelpunkt in „Meine To-Dos“ und „Fristen & Erinnerungen“ war unsichtbar (leere Spalte). Die beiden anderen Bereiche hatten denselben Fehler je für sich umgangen. | Punkt sichtbar; eine Regel für alle Bereiche. |
| Planlaufmanagement | Im Dialog „Sicherung einspielen“ ragten die Knöpfe aus dem Dialog. | Der Fuß jedes Dialogs bricht um. |
| Planlaufmanagement | „Zurücksetzen“ setzte auch die persönliche Einstellung zur E-Mail-Nachfrage zurück. | Persönliches bleibt, wie in der Baubetriebsplanung. |
| Planlaufmanagement | Eine Sicherung ließ sich im Store auch über einen Stand aus einer neueren Fassung einspielen (nur der Dialog sperrte). | Sperre im Store wie in den beiden anderen Bereichen. |
| Planlaufmanagement | Nach „Projekt löschen“ ging es über eine Adresse ohne Bereich weiter. | Über den Router zur Projektliste. |
| Planlaufmanagement | Projektnummer und Name wurden mit Leerzeichen am Rand gespeichert (die Nummer verknüpft Projekte über die Bereiche). | Werden gekürzt, wie in den anderen Bereichen. |
| Planlaufmanagement | Das Suchfeld der Projektliste versprach eine Suche nach „Bauherr“, die es nicht gibt. | „Projekt, Nummer …“ |
| Planlaufmanagement, Projektsteuerung | Ein Klick auf „Übersicht“ legte einen zweiten Verlaufseintrag für dieselbe Seite an – „Zurück“ schien nichts zu tun. | Die Übersicht steht unter der Adresse des Bereichs; frühere Adressen bleiben gültig. |
| Alle | Mit dem Farbmodus „kontrast“ erschien ein Bereich nach jedem Öffnen oder Neuladen kurz in den Standardfarben. | Der Farbmodus wird einmal zentral und vor dem ersten Zeichnen gesetzt. |
| Alle | Wer die Sicherung eines anderen Bereichs einspielen wollte, bekam je Bereich eine andere Antwort – im Planlaufmanagement eine falsche („keine Sicherung von KaPlan“), bei beschädigter Datei in Baubetriebsplanung und Projektsteuerung eine englische Technikmeldung. | Jeder Bereich nennt die fremde Sicherung beim Namen („… der Baubetriebsplanung – bitte dort einspielen.“); beschädigt: „Die Sicherung konnte nicht gelesen werden.“ |
| Planlaufmanagement, Baubetriebsplanung | Archivierte Projekte erschienen weiter in „Fristen & Erinnerungen“ bzw. „Termine & Nachhaken“ und im roten Zähler der Seitenleiste. | Archivierte bleiben außen vor; im Projekt selbst bleiben die Fristen sichtbar. |
| Alle | „Übernehmen in …“ wurde auch angeboten, wenn der Bestand des Bereichs nicht geladen war: Meldung „übernommen“, angelegt wurde nichts. | Der Abschnitt steht nur bei geladenem Bestand. |
| Alle | Nach „Archivieren“ bzw. „Aus dem Archiv holen“ ging der Tastaturfokus verloren – der nächste Tab landete auf „Löschen“. | Der Fokus geht an das Element, das dafür erscheint. |
| Alle | Waren alle Projekte archiviert, hieß es „Kein Projekt gefunden – Legen Sie ein Projekt an …“. | „Kein aktives Projekt“ mit Verweis auf das Archiv. |
| Baubetriebsplanung | Import aus BBPNeo: Nannte eine Anmeldung „G.016010101“ und eine andere desselben Vorhabens „G.016010101, G.016267085“, entstanden zwei neue Projekte, die sich in der Vorschau nicht zusammenlegen ließen. | Anmeldungen, die eine Projektnummer verbindet, kommen in dasselbe Projekt. |
| Baubetriebsplanung | Workflow-Editor: Eine Terminfrist „Nachhak-Termin nach Statuswechsel“ wurde überfällig, ließ sich aber nicht als nachgehakt festhalten (das Merkmal blieb aus). | Ein Nachhak-Termin dient immer zum Nachhaken. |
| Baubetriebsplanung | Der Vermerk „Nachgehakt · neuer Termin …“ nannte das Datum als 2026-12-03. | 03.12.2026 |
| Baubetriebsplanung | Stände bzw. Sicherungen bis Fassung 5: Die KM-Runde (N-2/N-1) ging bei der Umstellung verloren, die Terminfrist sprang im Beispiel vom 29.10.2026 auf den 28.04.2027. | Die Runde wird übernommen. |
| Planlaufmanagement, Projektsteuerung | Funktionslisten: Eine Suche ohne Treffer zeigte „Legen Sie die Funktionen an …“ samt Knopf „Neue Funktion“ – als wäre der Bestand leer. | „Keine Funktion gefunden – Für diese Suche gibt es keinen Treffer.“ |
| Planlaufmanagement | „E-Mail vorbereitet am 5.3.2026“ und die Feiertage standen einstellig, alles andere als 05.03.2026. | Überall zweistellig. |
| Planlaufmanagement | Projekt › Funktion: Bei 400 px ragte „Neue Funktion“ über den Rand, der ganze Inhalt scrollte quer. | Die Knopfleiste bricht um. |
| Planlaufmanagement | In der Übersicht standen Zahl und Text der anklickbaren Kennzahl-Kacheln 6 px versetzt zu den übrigen. | In einer Flucht. |
| Baubetriebsplanung | Workflow-Editor: Escape im Menü „Status hinzufügen“ schloss den ganzen Editor. | Schließt nur das Menü. |
| Planlaufmanagement | Workflow-Editor bei 821–1279 px Breite: Escape schloss den Editor statt der Schublade mit den Schrittdetails. | Schließt zuerst die Schublade, wie in der Baubetriebsplanung. |
| Planlaufmanagement | „Fristen & Erinnerungen“: Die Suche fand weder Projekt- noch Plannummer, obwohl die Zeile sie zeigt; die Spalte hieß noch „Rolle & Person“. | Sucht in allem, was die Zeile zeigt; „Funktion & Person“. |
| Alle (Excel-Import) | In Mappen mit umsortierten Blättern standen die Blattnamen an fremden Inhalten; Zellen ohne Zellbezug landeten alle in Spalte A. | Blätter werden über ihre Beziehung in der Mappe zugeordnet. |

### Weitere Korrekturen aus der Fehlersuche

Die Fehlersuche in den drei Bereichen hat 41 Fehler gemeldet (einige doppelt). Jeder wurde zuerst
nachgestellt, dann behoben und einzeln festgehalten – je Fehler ein eigener Commit, dessen
Nachricht beschreibt, was falsch war und was jetzt gilt. Die schwersten:

* **Planlaufmanagement – Umstellung alter Stände:** Bei jedem Wechsel auf eine neue Fassung wurden
  alle Funktionen behandelt, als stammten sie aus dem alten Modell; eine Person konnte dabei ohne
  Meldung ihre Besetzung verlieren.
* **Planlaufmanagement – Funktionen-Import:** Der Excel-Import überschrieb bei vorhandenen Personen
  alle Kontaktdaten, auch mit leeren Zellen – eine Liste nur mit Funktion, Name und E-Mail leerte
  Telefon, Firma und Anschrift.
* **Projektsteuerung – „Verantwortlich“:** Änderte sich das Kürzel oder die Funktion einer Person,
  verloren ihre Aufgaben die Zuordnung; „Meine To-Dos“ wurden ohne Hinweis leer.

Alle Korrekturen dieser Runde:

**Planlaufmanagement**

* Umstellung lässt Kennungen und Besetzung je Gewerk geführter Funktionen stehen
* Funktionen-Import lässt vorhandene Kontaktdaten bei leeren Zellen stehen
* Funktionen-Import löst die bisherige Besetzung auch bei Personen aus der Datei
* Gelöschter Kontakt hinterlässt kein „von Hand“ ohne Person
* Rückfrage „Person löschen?“ nennt die Folge für von Hand zugewiesene Schritte
* Umbenannte Projektfunktion zieht Schritte und E-Mail-Regeln der Planläufe mit
* Umbenannte übergreifende Funktion zieht die übergreifenden Workflows mit
* Abgleich mit einer Sicherung holt ein gelöschtes Gewerk nicht von selbst zurück
* Umbenennen mit Gewerkwechsel zieht nur Läufe mit, für die die Funktion weiter gilt
* Von Hand gesetztes Soll bleibt außerhalb des Verlaufs stehen
* Mit Eingang Soll kein Schritt vor dem ersten Schritt einfügen
* Terminnachweis rechnet entfallene Schritte des Basisplans als Zeitgewinn
* Terminnachweis stimmt bei Block am Anfang mit Eingang Soll
* „Früher/Später im Ablauf“ lässt Sprünge zum verschobenen Schritt stehen
* Aus dem Zweig herausfallende Schritte werden nicht zum Anschluss des Blocks
* E-Mail vorbereiten – Vorlagenwechsel lässt den Empfänger stehen
* Dialog „Keine E-Mail-Vorlage“ nennt die Seite „Vorlagen“
* Planverzeichnis mit Plänen lässt sich nicht zum Plan umstellen
* Planlauf aus der Liste der Planläufe auch mit der Tastatur öffnen
* Planliste behält den Tastaturfokus beim Sortieren
* Planliste speichert Titel, Codierung und Gewerk ohne Leerzeichen am Rand
* Excel-Import liest dieselbe Datei auch beim zweiten Wählen
* Funktion bearbeiten und To-Do öffnen auch mit der Tastatur
* Funktion gibt es je Gewerk nur einmal; Bezeichnung ohne Leerzeichen am Rand
* Meldung zum Planverzeichnis mit Plänen stimmt auch bei einem Plan

**Projektsteuerung**

* „Verantwortlich“ folgt dem Kürzel der Person
* Löschen eines mittleren Protokolls verdoppelt keine Aufgaben
* zwei Personen mit demselben Kürzel bleiben unterscheidbar
* Excel-Import liest „Name“ neben „Vorname“ als Nachnamen
* Aufgabe mit gestrichener Ursprungszeile zählt nicht mehr als offen
* Einzeldateien des Protokoll-Tools gemeinsam übernehmen
* Funktion auch mit der Tastatur bearbeiten
* Fokus bleibt beim Verschieben eines TOP mit der Tastatur
* Nummer und Datum des Protokolls lassen sich überschreiben
* im Protokoll getippte Angaben eines Gastes ziehen „Verantwortlich“ nicht mit

**Baubetriebsplanung**

* Anmeldung aus den Tabellen auch mit der Tastatur öffnen
* „Termin festlegen“ meldet bei geleertem Datum, was geschieht
* Projektdialog speichert Nummern ohne Leerzeichen am Rand

**Alle Bereiche**

* Projektlisten: Suche ohne Treffer zeigt eigenen Leerzustand ohne „Neues Projekt“
* Eingabetaste im Dialogfeld löst den Öffner des Dialogs nicht noch einmal aus

---

## 2. Entscheidungen aus dem Entfernen der beiden Bereiche

Beim Entfernen von Leistungsnachweisen und Controlling waren einige Festlegungen nötig, weil das
Controlling Aufgaben hatte, die jetzt niemand mehr übernimmt. Sie sind umgesetzt – bitte
bestätigen oder anders entscheiden.

### E-1 · Archiviert wird je Bereich, ein „Archiv für alle“ gibt es nicht mehr
* **Heute:** „Archivieren“ und „Aus dem Archiv holen“ stehen in jedem Bereich im Projekt und
  wirken nur dort. Was das Controlling früher „für alle Bereiche“ archiviert hatte, ist nach der
  Umstellung in jedem Bereich einzeln archiviert.
* **Alternative:** ein zusätzlicher Knopf „In allen Bereichen archivieren“.
* **Aufwand:** klein · **Nutzen:** niedrig, solange Projekte selten in mehreren Bereichen laufen
* **Entscheidung:** ☐ so lassen · ☐ „in allen Bereichen“ ergänzen

### E-2 · Projekte, die nur das Controlling oder die Leistungsnachweise kannten, entfallen
* **Heute:** Führt kein verbliebener Bereich ein Projekt, entfällt es samt seinen Beteiligten aus
  dem gemeinsamen Projektregister – beim Umstellen und künftig, wenn der letzte Bereich es löscht.
  Vor der Umstellung legt die Anwendung im Browser eine Rohkopie des alten Registers an
  (`kaplan-projektregister.v1.vor-fassung-2`).
* **Entscheidung:** ☐ einverstanden · ☐ anders: ______

### E-3 · Der gespeicherte Bestand der Leistungsnachweise bleibt im Browser liegen
* **Heute:** Der Schlüssel `leistungsnachweise.data.v1` wird nicht mehr gelesen, aber auch nicht
  gelöscht – wer den Stand aus dem Sicherungs-Branch
  `backup/2026-11-12-mit-leistungsnachweisen-und-controlling` wieder aufspielt, findet seine Daten
  vor. Er belegt Speicherplatz im Browser.
* **Alternative:** nach einer Übergangszeit automatisch löschen oder einen Knopf „Alte Daten der
  Leistungsnachweise entfernen“ anbieten.
* **Aufwand:** klein · **Entscheidung:** ☐ liegen lassen · ☐ Knopf · ☐ automatisch löschen ab ______

### E-4 · Projekte entstehen nur noch in den Bereichen
* **Heute:** Ein Projekt wird in einem Bereich angelegt und von den anderen über „Projekte aus
  anderen Bereichen → Übernehmen in …“ übernommen. Eine zentrale Stelle, die Projekte für mehrere
  Bereiche vorsieht oder eine vorgesehene Übernahme zurücknimmt, gibt es nicht mehr.
* **Entscheidung:** ☐ einverstanden · ☐ zentrale Projektanlage gewünscht (dann siehe U-13, R-14)

### E-5 · „Archivieren“ steht an zwei verschiedenen Orten
* **Heute:** In Baubetriebsplanung und Projektsteuerung im Projektkopf neben „Bearbeiten“ und
  „Löschen“, im Planlaufmanagement im Reiter „Einstellungen“ als eigene Karte – jeweils dort, wo
  der Bereich auch „Löschen“ hat.
* **Vorschlag:** mit dem gemeinsamen Projektkopf (U-4) an einen Ort.
* **Entscheidung:** ☐ mit U-4 erledigen · ☐ so lassen

### E-6 · Umstellung des Projektregisters wird erst mit der nächsten Änderung gespeichert
* **Heute:** Das Register wird beim Laden umgestellt (Fassung 3), geschrieben aber erst, wenn sich
  etwas ändert. Bis dahin kann ein noch offenes Fenster mit der alten Fassung weiterschreiben; die
  neue liest das richtig. Danach meldet die alte Fassung „neuere Fassung“ und schreibt nicht mehr.
* **Vorschlag:** kann so bleiben. Wer die Lücke schließen will, speichert direkt nach der
  Umstellung.
* **Aufwand:** klein · **Nutzen:** niedrig · **Entscheidung:** ☐ so lassen · ☐ sofort speichern

---

## 3. Rahmen, Navigation, Sicherung

### R-1 · Der Anwendungsrahmen steht dreimal im Code
* **Art:** Code-Doppelung · **Aufwand:** mittel · **Nutzen:** hoch
* **Heute:** Jede `App.tsx` baut denselben Rahmen: Seitenleiste mit Logo, Menüpunkten, Gruppe
  „Einstellungen“ und Projektliste, Fuß mit „Angemeldet als“, Sicherung/Einspielen/Zurücksetzen
  und „Bereich wechseln“, Kopfzeile, Karte „Nicht gefunden“ (`src/bereiche/planlauf/App.tsx`,
  `src/bereiche/baubetrieb/App.tsx`, `src/bereiche/projektsteuerung/App.tsx`, je rund 300 Zeilen;
  der Menüpunkt `NavItem` ist zeichengleich). Jede Änderung am Rahmen ist dreimal zu machen, und
  die Kopien sind schon auseinandergelaufen (siehe R-2, R-3, R-12).
* **Vorschlag:** ein fachfreier Baustein `Rahmen` in `src/shared/` (Menü, Projektliste, Titel,
  Plätze für Fuß und Hinweise) samt `NavItem`, `NichtGefunden` und den Sicherungsknöpfen. In den
  Bereichen bleiben die Menüdefinition und die Zuordnung Adresse → Seite. In zwei Schritten: erst
  die kleinen Bausteine, dann der ganze Rahmen.
* **Risiko:** gering bis mittel – nachzuprüfen sind 400 px Breite, Farbmodus „kontrast“ und die
  Fokus-Rückgabe der Dialoge.
* **Entscheidung:** ☐ umsetzen · ☐ später · ☐ nicht umsetzen

### R-2 · Warnung „… wird nichts gespeichert“: gleicher Text, andere Stelle, anderes Aussehen
* **Art:** Optik/Bedienung · **Aufwand:** klein · **Nutzen:** hoch
* **Heute:** Die Hinweise bei Ladefehler, neuerer Fassung und Speicherfehler lauten in allen drei
  Bereichen gleich. Im Planlaufmanagement stehen sie als feste Leiste über dem Inhalt und bleiben
  beim Scrollen sichtbar (`components/Hinweisleisten.tsx`, Klassen in `components/abgleich.css`);
  in Baubetriebsplanung und Projektsteuerung sind sie ein Kasten im Inhalt und **scrollen weg** –
  gerade dort arbeitet man dann unbemerkt auf Demodaten weiter. Die beiden Dateien sind bis auf
  fünf Zeilen Kopien voneinander. Der neue Hinweis zum Projektregister (`RegisterHinweis`) steht in
  allen drei Bereichen als Kasten im Inhalt.
* **Vorschlag:** eine Komponente in `src/shared/` nach dem Vorbild des Planlaufmanagements
  (feststehend), der Register-Hinweis als weitere Leiste. Bei 400 px braucht die feste Leiste
  viel Höhe – Text kürzen oder einklappbar machen.
* **Entscheidung:** ☐ umsetzen · ☐ später · ☐ nicht umsetzen

### R-3 · „Sicherung einspielen“: drei Dialoge mit anderem Titel, anderen Knöpfen, anderem Haken
* **Art:** Bedienung · **Aufwand:** mittel · **Nutzen:** mittel
* **Heute:** Planlaufmanagement: Titel „Sicherung einspielen“, Knöpfe „Alles ersetzen“ und
  „Abgleichen und auswählen …“; der Haken „Angemeldet als übernehmen“ erscheint nur bei
  abweichendem Namen und nennt beide Namen. Baubetriebsplanung und Projektsteuerung: Titel
  „Sicherung einspielen?“, ein Knopf „Einspielen“, Haken immer da und nie vorbelegt. Bei einem
  Stand aus neuerer Fassung ist einmal erst der Dialog, zweimal schon der Knopf in der Seitenleiste
  gesperrt. Drei Dateien mit 190–240 Zeilen.
* **Vorschlag:** ein gemeinsamer Dialog in `src/gemeinsam/`; Sperre wie Baubetriebsplanung/
  Projektsteuerung, Haken wie Planlaufmanagement, einheitlich „Alles ersetzen“ und Titel ohne
  Fragezeichen. Der selektive Abgleich bleibt eine Besonderheit des Planlaufmanagements (siehe
  auch R-14).
* **Risiko:** Einspielen ersetzt den ganzen Bestand – danach alle Lagen (Ladefehler, neuere
  Fassung, voller Speicher) in allen drei Bereichen nachprüfen.
* **Entscheidung:** ☐ umsetzen · ☐ später · ☐ nicht umsetzen

### R-5 · Sicherungsdateien heißen und kennzeichnen sich uneinheitlich
* **Art:** Funktion · **Aufwand:** klein · **Nutzen:** mittel
* **Heute:** Die Datei des Planlaufmanagements heißt „…-export-…“, die der anderen
  „…-sicherung-…“; nur Baubetriebsplanung und Projektsteuerung schreiben ein Kennzeichen `bereich`
  in die Datei, die des Planlaufmanagements ist nur an ihrem Aufbau zu erkennen. (Die Meldungen
  beim Einspielen einer fremden Datei sind bereits vereinheitlicht, Abschnitt 1.)
* **Vorschlag:** `planlauf-sicherung-<Datum>.json` mit Kennzeichen; das Erkennen einer Datei als
  eine fachfreie Funktion in `src/shared/speicher.ts`. Ältere Dateien ohne Kennzeichen bleiben
  lesbar.
* **Entscheidung:** ☐ umsetzen · ☐ später · ☐ nicht umsetzen

### R-6 · „Zurücksetzen“: drei Rückfragetexte, kein Angebot, vorher zu sichern
* **Art:** Wortlaut/Bedienung · **Aufwand:** klein · **Nutzen:** mittel
* **Heute:** Planlaufmanagement: „Alle lokal gespeicherten Änderungen werden verworfen und der
  Demodatenbestand wird neu geladen.“ – ohne zu sagen, dass nur dieser Bereich gemeint ist. Die
  anderen nennen ihren Bereich und was unberührt bleibt, mit je eigenem Satzbau. Keine Rückfrage
  bietet an, den Stand vorher zu sichern – anders als „Sicherung einspielen“, obwohl beides den
  ganzen Bestand ersetzt.
* **Vorschlag:** ein Textmuster („Alle Daten des Bereichs X in diesem Browser werden verworfen …
  „Angemeldet als“ und die anderen Bereiche bleiben unberührt.“) und der Knopf „Aktuellen Stand
  sichern“ in der Rückfrage.
* **Entscheidung:** ☐ umsetzen · ☐ später · ☐ nicht umsetzen

### R-7 · Laden, Speichern und Herunterladen stehen dreimal fast gleich im Code
* **Art:** Code-Doppelung · **Aufwand:** mittel · **Nutzen:** mittel
* **Heute:** Je Bereich rund 70 gleiche Zeilen in `store/storage.ts` (Zustände, Speichern mit
  Nachräumen, Rohkopien, Download); der Typ `Farbmodus` ist viermal definiert.
* **Vorschlag:** die fachfreien Teile nach `src/shared/speicher.ts`; in den Bereichen bleiben
  Schlüssel, Gültigkeitsprüfung und Umstellung alter Fassungen.
* **Risiko:** Speichern ist die empfindlichste Stelle – Verhalten nicht ändern, alle Fehlerlagen
  nachprüfen.
* **Entscheidung:** ☐ umsetzen · ☐ später · ☐ nicht umsetzen

### R-8 · Das Gerüst der drei Stores ist dreimal vorhanden
* **Art:** Code-Doppelung · **Aufwand:** mittel · **Nutzen:** mittel
* **Heute:** Laden, Speichern bei Änderung, Nachladen aus einem anderen Fenster, Abgleich mit dem
  Projektregister und mit „Angemeldet als“, Einspielen und Zurücksetzen stehen in jedem
  `store/store.tsx`. Regeln wie die Reihenfolge der Effekte mussten in jedem Store einzeln
  nachgezogen werden; die Kopien wichen bereits ab (zwei der Abweichungen sind in Abschnitt 1
  behoben).
* **Vorschlag:** ein gemeinsamer Hook in `src/gemeinsam/`, dem jeder Bereich Schlüssel, Laden,
  Speichern, Demodaten und seine Sicht fürs Register übergibt.
* **Risiko:** erhöht – das Zusammenspiel mehrerer Fenster hängt an der Reihenfolge der Effekte;
  nur mit Zwei-Fenster-Prüfung umstellen.
* **Entscheidung:** ☐ umsetzen · ☐ später · ☐ nicht umsetzen

### R-9 · Gleiche Seiten haben verschiedene Adressen
* **Art:** Wortlaut/Code-Doppelung · **Aufwand:** klein · **Nutzen:** niedrig
* **Heute:** `#/planlauf/ketten` gegen `#/baubetrieb/workflows`, `#/planlauf/rollen` gegen
  `#/projektsteuerung/funktionen`, intern „dashboard“ gegen „uebersicht“ (siehe U-14). Die
  Funktion `useRoute` steht dreimal zeichengleich in den `lib/router.ts`.
* **Vorschlag:** `useRoute` nach `src/shared/`; im Planlaufmanagement die Adressen an die
  Oberfläche angleichen (`workflows`, `funktionen`, `uebersicht`), die alten bleiben per Umleitung
  gültig.
* **Entscheidung:** ☐ umsetzen · ☐ später · ☐ nicht umsetzen

### R-10 · Zähler in der Seitenleiste zählen nach verschiedenen Regeln
* **Art:** Bedienung · **Aufwand:** klein · **Nutzen:** mittel
* **Heute:** Planlaufmanagement und Projektsteuerung zählen nur die markierten (★) Projekte, die
  Baubetriebsplanung zählt bei „Termine & Nachhaken“ alle nicht archivierten. Wer Projekte abwählt,
  sieht dort weiter den vollen roten Zähler.
* **Vorschlag:** eine Regel festlegen – siehe U-2, dort zusammen mit den Kacheln.
* **Entscheidung:** ☐ mit U-2 entscheiden

### R-11 · Die Fristenliste über alle Projekte ist unterschiedlich erreichbar, „Fristen“ meint zweierlei
* **Art:** Bedienung · **Aufwand:** klein · **Nutzen:** mittel
* **Heute:** Baubetriebsplanung: Menüpunkt „Termine & Nachhaken“ mit rotem Zähler.
  Planlaufmanagement: „Fristen & Erinnerungen“ hat keinen Menüpunkt, man erreicht die Seite nur
  über die Kacheln der Übersicht. Projektsteuerung: keine eigene Seite. Das Wort „Fristen“ ist im
  Planlaufmanagement die Liste, in der Baubetriebsplanung eine Einstellungsseite.
* **Vorschlag:** Menüpunkt „Fristen & Erinnerungen“ mit Zähler im Planlaufmanagement; die
  Einstellungsseite der Baubetriebsplanung „Fristregeln“ nennen.
* **Entscheidung:** ☐ umsetzen · ☐ später · ☐ nicht umsetzen

### R-12 · Kleine Wortlaut-Unterschiede im Rahmen
* **Art:** Wortlaut · **Aufwand:** klein · **Nutzen:** niedrig
* **Heute:** Projekt in der Seitenleiste mal mit, mal ohne Nummer; Untertitel der Projektseite
  („Projektarbeitsbereich“ / „Projekt“); drei Fassungen von „Nicht gefunden“; Tooltips der
  Sicherungsknöpfe nennen im Planlaufmanagement nicht, dass nur dieser Bereich gesichert wird.
* **Vorschlag:** mit R-1 einmal festlegen und den Bereichsnamen einsetzen.
* **Entscheidung:** ☐ mit R-1 erledigen · ☐ nicht umsetzen

### R-14 · Sicherung nur je Bereich – Projektregister und „Angemeldet als“ sind in keiner Sicherung
* **Art:** Funktion · **Aufwand:** mittel · **Nutzen:** hoch
* **Heute:** Für einen Umzug in einen anderen Browser oder auf einen anderen Rechner sind drei
  Sicherungen und drei Einspielvorgänge nötig. Was nur im Projektregister steht (Archivstand,
  vorgesehene Übernahmen) und der Name unter „Angemeldet als“ gehen dabei verloren; das Register
  baut sich nur aus den Beständen neu auf.
* **Vorschlag:** „Gesamtsicherung“ auf der Startseite: alle KaPlan-Daten des Browsers in einer
  Datei sichern und wieder einspielen. Die Sicherung je Bereich bleibt für gezieltes Einspielen.
* **Risiko:** mittel – vor dem Überschreiben Kopien anlegen und Fassungen vergleichen.
* **Entscheidung:** ☐ umsetzen · ☐ später · ☐ nicht umsetzen

---

## 4. Übersichten, Projektlisten, Projektseiten

### U-1 · Ampelpunkt und Ampelmarke sind dreifach gepflegt
* **Art:** Code-Doppelung · **Aufwand:** klein · **Nutzen:** mittel
* **Heute:** `AmpelPunkt` und `AmpelBadge` stehen in allen drei `components/common.tsx`. Der
  unsichtbare Punkt im Planlaufmanagement (Abschnitt 1) war genau die Folge: in zwei Kopien
  behoben, in der dritten vergessen.
  Ebenso mehrfach gebaut: das Datum mit dem Abstand darunter („in 3 Tagen“) in den
  Fristenlisten. Auch die Rechnung dahinter (überfällig, fällig, im Plan) und die Rangfolge der
  Stufen stehen dreimal im Code; der Wert für „kein Termin“ heißt dreimal anders.
* **Vorschlag:** fachfreie Bausteine in `src/shared/ui.tsx`; die Bereiche behalten nur ihre
  Zuordnung Stufe → Farbe und Text (siehe U-10).
* **Entscheidung:** ☐ umsetzen · ☐ später · ☐ nicht umsetzen

### U-2 · Kacheln und Zähler zählen andere Projekte als die Seite, auf die sie führen
* **Art:** Funktion · **Aufwand:** mittel · **Nutzen:** hoch
* **Heute:** Die Übersicht zählt die markierten (★) Projekte. Ein Klick auf eine Kachel öffnet im
  Planlaufmanagement „Fristen & Erinnerungen“ und in der Baubetriebsplanung „Termine & Nachhaken“
  – beide zeigen **alle** nicht archivierten Projekte, also oft eine andere Zahl als die Kachel. In
  der Projektsteuerung stimmen Kachel und Liste überein.
* **Vorschlag:** Projektsteuerung als Vorbild: Eine Kachel führt auf genau die Menge, die sie
  zählt. Die Fristen- bzw. Terminseite beginnt mit der Auswahl der Übersicht und bietet einen
  Umschalter „Markierte Projekte | Alle Projekte“; der Zähler der Seitenleiste rechnet wie die
  Kacheln.
* **Zu klären:** Soll „Termine & Nachhaken“ bewusst immer alle Projekte zeigen?
* **Entscheidung:** ☐ umsetzen · ☐ später · ☐ nicht umsetzen

### U-3 · Die Projektliste ist dreimal fast wortgleich vorhanden
* **Art:** Code-Doppelung · **Aufwand:** mittel · **Nutzen:** hoch
* **Heute:** Suche, Kachel mit ★, Leerzustand, Archiv und „Projekte aus anderen Bereichen“ stehen
  in jeder `pages/Projekte.tsx`; nur die Bausteine zum Register sind schon gemeinsam. Die Kopien
  laufen auseinander: Der Hinweis zum ★ lautet in jedem Bereich etwas anders, ebenso der
  Platzhalter der Suche.
* **Vorschlag:** `ProjektListe` und `ProjektKachel` in `src/gemeinsam/`; jeder Bereich liefert
  seine Projekte in einer gemeinsamen Form und seinen Satz für den Leerzustand. Ein Hinweis für
  alle: „Mit ★ markierte Projekte erscheinen in der Übersicht und in der Seitenleiste.“
* **Entscheidung:** ☐ umsetzen · ☐ später · ☐ nicht umsetzen

### U-4 · Projektseite: „Bearbeiten“, „Löschen“, „Archivieren“, ★ und „Zurück“ stehen überall woanders
* **Art:** Bedienung · **Aufwand:** mittel · **Nutzen:** hoch
* **Heute:**

  | | Planlaufmanagement | Baubetriebsplanung | Projektsteuerung |
  | --- | --- | --- | --- |
  | Bearbeiten, Löschen, Archivieren | im Reiter „Einstellungen“ | oben rechts, große Knöpfe | oben rechts, kleine Knöpfe |
  | ★ auf der Projektseite | – | ja | – |
  | „Zurück zu den Projekten“ | – | ja | – |
  | Nummer und Status sichtbar | nein | ja | ja |

* **Vorschlag:** ein gemeinsamer `ProjektKopf` in `src/gemeinsam/` nach dem Vorbild der
  Projektsteuerung: Nummer, Status, Beschreibung, ★, rechts die Aktionen, darunter der
  Archivhinweis. Im Planlaufmanagement kommt der Kopf über die Reiter; „Einstellungen“ behält
  Fristen, Absender, Feiertage und Export.
* **Risiko:** gering – im Planlaufmanagement ändern sich gewohnte Orte.
* **Entscheidung:** ☐ umsetzen · ☐ später · ☐ nicht umsetzen

### U-5 · Dialog „Neues Projekt“: gleiche Stammdaten, andere Wörter
* **Art:** Wortlaut · **Aufwand:** mittel · **Nutzen:** mittel
* **Heute:** Dasselbe geteilte Feld heißt „Projektname“ oder „Bezeichnung“, der Knopf „Projekt
  anlegen“ oder „Anlegen“, die Meldung „Projekt aktualisiert.“ oder „… gespeichert.“. Die
  Beispiele für die Projektnummer („2026-001“, „P-2026-001“, „MIC-…“) legen drei Schreibweisen
  nahe – dabei verknüpft gerade die Nummer ein Projekt über die Bereiche.
* **Vorschlag:** Wortlaut festlegen („Projektnummer“, „Bezeichnung“, „Beschreibung“, „Projekt
  anlegen“, „Projekt gespeichert.“) und ein gemeinsamer Baustein für die drei Stammfelder samt
  Verknüpfungshinweis; die Bereiche ergänzen ihre eigenen Felder.
* **Zu klären:** eine verbindliche Schreibweise der Projektnummer (MIC-Nummer?).
* **Entscheidung:** ☐ umsetzen · ☐ später · ☐ nicht umsetzen

### U-6 · Kennzahl-Kacheln: mal anklickbar, mal nicht, mal mit Filter
* **Art:** Bedienung · **Aufwand:** klein · **Nutzen:** mittel
* **Heute:** Projektsteuerung: Ein Klick auf „Überfällig“ zeigt genau die überfälligen Punkte.
  Planlaufmanagement und Baubetriebsplanung: Die Kachel öffnet eine andere Seite ohne Filter; im
  Planlaufmanagement reagieren zwei Kacheln gar nicht.
* **Vorschlag:** jede Kachel anklickbar, mit vorbelegtem Filter der Zielseite.
* **Entscheidung:** ☐ umsetzen · ☐ später · ☐ nicht umsetzen

### U-7 · Dasselbe Projekt trägt in der Baubetriebsplanung je nach Seite eine andere Nummer
* **Art:** Bedienung · **Aufwand:** klein · **Nutzen:** mittel
* **Heute:** Kachel der Projektliste: MIC-Projektnummer; Übersicht und Termine: DB-G-Nummer;
  Seitenleiste: keine Nummer. Der Knopf am Zeilenende der Tabelle „Projekte“ bedeutet in jedem
  Bereich etwas anderes (wiederholt den Zeilenklick, fehlt, führt woanders hin).
* **Vorschlag:** überall die Projektnummer des Registers führend, die DB-G-Nummer als Zusatz; ein
  gemeinsamer Baustein für „Nummer Name“ in Tabellen und Seitenleiste.
* **Zu klären:** Welche Nummer soll in der Baubetriebsplanung führen?
* **Entscheidung:** ☐ umsetzen · ☐ später · ☐ nicht umsetzen

### U-8 · Aufgabenliste der Übersicht: Kürzen, Filtern und „Erledigt“ dreimal anders
* **Art:** Bedienung · **Aufwand:** mittel · **Nutzen:** mittel
* **Heute:** Lange Listen werden im Planlaufmanagement gar nicht gekürzt, in der
  Baubetriebsplanung führt ein Verweis auf eine andere Seite, in der Projektsteuerung klappt die
  Liste an Ort und Stelle auf. „Erledigt“ ist zweimal ein Haken ohne Beschriftung, einmal ein
  beschrifteter Knopf.
* **Vorschlag:** die ersten 8–10 Einträge mit „Alle anzeigen“ an Ort und Stelle (Vorbild
  Projektsteuerung) und derselbe Filter „Alle | Überfällig | Fällig“; ein gemeinsames Aussehen
  für den Haken.
* **Entscheidung:** ☐ umsetzen · ☐ später · ☐ nicht umsetzen

### U-9 · Projektsteuerung: „Überfällig“ zählt in der Seitenleiste alle, in der Übersicht nur eigene Aufgaben
* **Art:** Funktion · **Aufwand:** klein · **Nutzen:** mittel
* **Heute:** Die Seitenleiste meldet am Projekt eine rote Zahl für alle überfälligen Aufgaben, die
  Übersicht daneben zeigt nur die eigenen (Name unter „Angemeldet als“) – unter Umständen null.
* **Vorschlag:** beide auf dieselbe Menge stellen (eigene Aufgaben) oder in der Übersicht beide
  Zahlen beschriften.
* **Zu klären:** Soll die Seitenleiste bewusst auf fremde Rückstände hinweisen?
* **Entscheidung:** ☐ nur eigene · ☐ beide Zahlen zeigen · ☐ so lassen

### U-10 · Begriffe der Fristenlage
* **Art:** Wortlaut · **Aufwand:** klein · **Nutzen:** mittel
* **Heute:** Dieselbe Stufe heißt „Fällig“ oder „Demnächst fällig“ (im Planlaufmanagement je nach
  Stelle beides), die graue Stufe „Ohne Termin“ oder „Ohne Frist“, die rote Kachel „Überfällige
  Schritte“, „Terminfristen überfällig“ oder „Überfällig“. Drei Tabellen mit Text und Farbe je
  Stufe.
* **Vorschlag:** ein Wort je Stufe – „Überfällig“, „Fällig“, „Im Plan“, „Ohne Termin“ – in Kachel,
  Spalte, Marke und Filter; die gemeinsamen Stufen als eine Tabelle in `src/shared/`.
* **Entscheidung:** ☐ umsetzen · ☐ später · ☐ nicht umsetzen

### U-11 · „Projekt löschen?“ ist unterschiedlich genau
* **Art:** Wortlaut · **Aufwand:** klein · **Nutzen:** mittel
* **Heute:** Baubetriebsplanung und Projektsteuerung nennen, wie viel verloren geht und dass es
  endgültig ist; das Planlaufmanagement – wo am meisten dranhängt – sagt nur „mit allen Plänen,
  Kontakten und Planläufen“. Nur die Projektsteuerung sagt, dass aus diesem Bereich gelöscht wird.
* **Vorschlag:** eine gemeinsame Rückfrage: „„<Name>“ wird mit <Umfang> aus <Bereich> gelöscht.
  Das lässt sich nicht wiederherstellen.“ – der Bereich liefert nur die Zahlen.
* **Entscheidung:** ☐ umsetzen · ☐ später · ☐ nicht umsetzen

### U-12 · Die Regel „markierte Projekte, sonst alle“ steht dreimal im Code
* **Art:** Code-Doppelung · **Aufwand:** klein · **Nutzen:** mittel
* **Heute:** `sichtbareProjekte` und der Hinweis „Kein Projekt markiert“ stehen in jeder Übersicht;
  die Zähler und Fristenseiten hatten die Regel bereits verfehlt (Abschnitt 1, U-2).
* **Vorschlag:** einmal in `src/gemeinsam/` neben `useArchivierte`.
* **Entscheidung:** ☐ umsetzen · ☐ später · ☐ nicht umsetzen

### U-13 · Projektstatus: je Bereich eigens geführt, anders benannt, mit anderer Wirkung
* **Art:** Datenmodell · **Aufwand:** mittel · **Nutzen:** mittel
* **Heute:** Dasselbe Projekt kann im Planlaufmanagement „Aktiv“, in der Baubetriebsplanung
  „Betreuungspause“ und in der Projektsteuerung „Abgeschlossen“ sein. Der Status bewirkt in jedem
  Bereich etwas anderes (nichts / eine Frist weniger / eine Kachelzahl); ausgeblendet wird ein
  Projekt nirgends über den Status, sondern nur über ★ und Archiv.
* **Vorschlag:** entscheiden, ob der Status **(a)** ins Projektregister gehört – einer je Projekt
  für alle Bereiche – oder **(b)** bewusst je Bereich bleibt. In beiden Fällen: gleiche Wörter,
  gleiche Farben, eine festgelegte Wirkung (etwa: abgeschlossene Projekte zählen nicht in Kacheln
  und Fristenlisten) und eine klare Abgrenzung zum Archiv.
* **Entscheidung:** ☐ (a) ein Status für alle · ☐ (b) je Bereich, aber einheitlich benannt · ☐ so lassen

### U-14 · Benennung: „Dashboard“ gegen „Übersicht“, Reiter „Funktion“ gegen „Projektbeteiligte“
* **Art:** Wortlaut · **Aufwand:** klein · **Nutzen:** niedrig
* **Heute:** Im Code und in der Adresse heißt die Startseite des Planlaufmanagements „dashboard“,
  und „uebersicht“ meint dort den Reiter „Planläufe“ – eine ständige Fehlerquelle beim Übertragen
  von Änderungen. Dieselbe Personenliste heißt im Planlaufmanagement „Funktion“, in der
  Projektsteuerung „Projektbeteiligte“.
* **Vorschlag:** im Planlaufmanagement angleichen (Dateien und Adressen umbenennen, alte Adressen
  umleiten); Reiter „Projektbeteiligte“ bzw. „Funktionen“.
* **Entscheidung:** ☐ umsetzen · ☐ später · ☐ nicht umsetzen

---

## 5. Bedienmuster: Dialoge, Listen, Wortlaut

### M-1 · „Kein Treffer“ heißt in jeder Liste anders
* **Art:** Wortlaut · **Aufwand:** klein · **Nutzen:** niedrig
* **Heute:** „Kein Eintrag passt zur Suche“, „Nichts gefunden“, „Keine Person gefunden“, „Keine
  Funktion gefunden“ – je Liste ein eigener Text. (Dass zwei Funktionslisten bei einer Suche ohne
  Treffer den Anlegen-Knopf eines leeren Bestands zeigten, ist behoben.)
* **Vorschlag:** ein fachfreier Baustein „Nichts gefunden – Für diese Suche gibt es keinen
  Treffer.“ für alle Listen. (Die drei Projektlisten unterscheiden „leer“ von „kein Treffer“
  inzwischen ebenfalls – noch je für sich.)
* **Entscheidung:** ☐ umsetzen · ☐ später · ☐ nicht umsetzen

### M-2 · Seite „Funktionen“, Funktionsdialog und Gewerk-Dialog gibt es zweimal – mit anderem Verhalten
* **Art:** Code-Doppelung/Funktion · **Aufwand:** mittel · **Nutzen:** hoch
* **Heute:** Planlaufmanagement (`pages/Funktionen.tsx`, ein zweiter fast gleicher Dialog in
  `pages/projekt/RollenFunktionen.tsx`, `components/GewerkDialog.tsx`) und Projektsteuerung
  (`pages/Funktionen.tsx`, `components/FunktionDialog.tsx`, `components/GewerkDialog.tsx`) – rund
  500 Zeilen in zwei, beim Dialog in drei Fassungen. Für den Nutzer: Suche und die Spalte
  „Verwendet“ gibt es nur in der Projektsteuerung; ein Gewerk mit besetzten Funktionen lässt sich
  im Planlaufmanagement löschen (die Rückfrage nennt die Folgen), in der Projektsteuerung nicht.
  Beide Bereiche führen eigene Listen der Funktionen und Gewerke – wer beide nutzt, pflegt die
  Stammdaten zweimal.
* **Vorschlag:** gemeinsame Bausteine in `src/gemeinsam/` (Seite, Funktionsdialog, Gewerk-Dialog)
  nach dem Vorbild der Projektsteuerung; die Löschregel bleibt je Bereich, wird aber gleich
  dargestellt. Kleiner Zwischenschritt: Suche im Planlaufmanagement nachziehen und dessen
  doppelten Funktionsdialog zusammenlegen.
* **Zu klären:** Sollen Funktionen und Gewerke selbst geteilte Stammdaten werden (einmal pflegen,
  in beiden Bereichen nutzen)?
* **Entscheidung:** ☐ umsetzen · ☐ später · ☐ nicht umsetzen

### M-3 · Enter speichert nur in wenigen Dialogen, Pflichtfelder sind nicht erkennbar
* **Art:** Bedienung · **Aufwand:** mittel · **Nutzen:** hoch
* **Heute:** In „Neues Gewerk“, „Angemeldet als“ und beim Anlegen von Planpaketen übernimmt die
  Eingabetaste; in den Dialogen für Projekt, Funktion, Person, Anmeldung, Planlisten-Eintrag und
  Protokollreihe passiert nichts. Welche Felder Pflicht sind, zeigt erst eine kurz eingeblendete
  Meldung nach dem Klick auf den Hauptknopf. In großen Dialogen geht ein versehentlicher Klick
  neben den Dialog mit allen Eingaben verloren.
* **Vorschlag:** der gemeinsame Dialog-Baustein erhält ein Absenden (Enter speichert in
  einzeiligen Feldern überall), Felder ein Pflicht-Kennzeichen und eine Fehlerzeile direkt am
  Feld; große Dialoge schließen nicht durch Klick daneben.
* **Risiko:** mittel – Enter darf in Auswahlfeldern und mehrzeiligen Feldern nicht absenden.
* **Entscheidung:** ☐ umsetzen · ☐ später · ☐ nicht umsetzen

### M-4 · „Anlegen“, „Speichern“, „Projekt anlegen“ – „gespeichert“, „aktualisiert“
* **Art:** Wortlaut · **Aufwand:** klein · **Nutzen:** mittel
* **Heute:** Der Hauptknopf beim Anlegen heißt je Dialog „Projekt anlegen“, „Anlegen“ oder auch
  für Neues „Speichern“; die Meldung nach dem Ändern „… aktualisiert.“ oder „… gespeichert.“.
* **Vorschlag:** eine Regel: „Anlegen“ für Neues, „Speichern“ für Bestehendes; Meldungen
  „<Ding> angelegt.“ / „… gespeichert.“ / „… gelöscht.“; Titel „Neues <Ding>“ bzw. „<Ding>
  bearbeiten“. Die Regel in `CLAUDE.md` festhalten. (Überschneidet sich mit U-5.)
* **Entscheidung:** ☐ umsetzen · ☐ später · ☐ nicht umsetzen

### M-5 · Der rote „Löschen“-Knopf ist auf vier Arten gebaut
* **Art:** Optik · **Aufwand:** klein · **Nutzen:** mittel
* **Heute:** Die rot gefüllte Bestätigung entsteht an acht Stellen über eine fest eingetragene
  Farbe, an einer über eine eigene Klasse des Planlaufmanagements; im Gewerk-Dialog des
  Planlaufmanagements ist die endgültige Bestätigung nur rote Schrift (sieht aus wie ein
  Nebenknopf), derselbe Dialog der Projektsteuerung ist rot gefüllt. Die fest eingetragene Farbe
  überschreibt außerdem den Hover-Zustand.
* **Vorschlag:** eine Klasse für „rot gefüllt“ in `src/shared/global.css` (mit Hover und
  Kontrast-Variante); Regel: Auslöser = rote Schrift, Bestätigung = rot gefüllt.
* **Entscheidung:** ☐ umsetzen · ☐ später · ☐ nicht umsetzen

### M-6 · „Lässt sich nicht löschen“ wird auf drei Arten gesagt
* **Art:** Bedienung · **Aufwand:** klein · **Nutzen:** mittel
* **Heute:** Baubetriebsplanung (Workflows): Knopf ausgegraut, der Grund steht nur im Tooltip –
  auf dem Tablet und mit der Tastatur nicht erreichbar. Projektsteuerung (Funktionen): Knopf
  bleibt bedienbar und meldet den Grund. Planlaufmanagement (mitgelieferte Workflows): Knopf fehlt
  ohne Erklärung.
* **Vorschlag:** ein Muster – der Knopf bleibt bedienbar und nennt den Grund, am besten in einem
  kleinen Hinweisdialog statt in der flüchtigen Kurzmeldung.
* **Entscheidung:** ☐ umsetzen · ☐ später · ☐ nicht umsetzen

### M-7 · Sortieren per Klick auf die Spaltenüberschrift gibt es nur im Planlaufmanagement
* **Art:** Funktion · **Aufwand:** mittel · **Nutzen:** mittel
* **Heute:** Planliste und Planlaufliste lassen sich sortieren (mit zwei leicht verschiedenen
  Regeln für den dritten Klick). Die Anmeldungen der Baubetriebsplanung stehen fest nach
  Sperrbeginn, die Beteiligten der Projektsteuerung fest nach Funktion und Name.
* **Vorschlag:** ein fachfreier Baustein für sortierbare Spaltenköpfe in `src/shared/`; danach in
  den Anmeldungstabellen (Sperrzeitraum, Status, Terminfrist, Sachstand) und in der
  Beteiligtenliste (Funktion, Person, Firma) einsetzen.
* **Entscheidung:** ☐ umsetzen · ☐ später · ☐ nicht umsetzen

### M-8 · Schmale Breite: gleichartige Listen stapeln, kürzen oder scrollen quer
* **Art:** Optik · **Aufwand:** mittel · **Nutzen:** mittel
* **Heute (400 px):** Die Protokollliste und die Fristenlisten werden zu Karten gestapelt; die
  Beteiligten- und Funktionslisten bleiben gekürzte Tabellen zum Schieben; die Anmeldungsliste der
  Baubetriebsplanung ist fest 1080 px breit – fast dreimal so breit wie der Bildschirm. In
  gestapelten Tabellen fehlen die Spaltennamen (nur der Terminrechner beschriftet seine Zellen).
  Entsprechend die Aktionen je Zeile: mal in der Karte, mal fest am rechten Rand (nur die
  Anmeldungen der Baubetriebsplanung), mal muss man erst nach rechts schieben, um Stift und
  Papierkorb zu sehen (Beteiligte und Funktionen).
* **Vorschlag:** Regel festhalten: Listen bis etwa fünf Spalten stapeln und beschriften ihre
  Zellen; nur echte Arbeitstabellen (Planliste, Planlaufliste) scrollen quer – mit der fest
  stehenden Aktionsspalte, die es heute nur in der Baubetriebsplanung gibt. Anmeldungen der
  Baubetriebsplanung unter 720 px stapeln.
* **Entscheidung:** ☐ umsetzen · ☐ später · ☐ nicht umsetzen

### M-9 · Die Excel-Import-Dialoge sind dreimal fast gleich gebaut
* **Art:** Code-Doppelung · **Aufwand:** mittel · **Nutzen:** mittel
* **Heute:** Funktionen und Planliste (Planlaufmanagement), Projektbeteiligte (Projektsteuerung):
  je 120–155 Zeilen Dialog mit Vorlage-Knopf, Ablagefläche, Hinweisen, Vorschau und „n Zeilen
  übernehmen“. Für den Nutzer weitgehend gleich – nur heißt der Vorgang beim Import aus BBPNeo
  „Importieren“ statt „Übernehmen“.
* **Vorschlag:** eine fachfreie Hülle „Import-Dialog“ in `src/shared/`; die Bereiche liefern
  Spaltenzuordnung, Vorschau und Übernahme.
* **Entscheidung:** ☐ umsetzen · ☐ später · ☐ nicht umsetzen

### M-10 · Personen eines Projekts: zwei Masken mit verschiedenen Feldern
* **Art:** Funktion/Code-Doppelung · **Aufwand:** mittel · **Nutzen:** mittel
* **Heute:** Die Beteiligten eines Projekts werden über das Projektregister geteilt, aber in zwei
  verschieden ausgestatteten Masken gepflegt: „Mobil“ und „Kürzel“ gibt es nur in der
  Projektsteuerung, SharePoint-Links nur im Planlaufmanagement. **Eine in der Projektsteuerung
  erfasste Mobilnummer ist im Planlaufmanagement weder zu sehen noch zu ändern.** „Person
  hinzufügen“ ist einmal Nebenknopf, einmal Hauptknopf; die Spalte heißt „Besetzt durch“ bzw.
  „Person“; den Reiter „Alle“ gibt es nur in der Projektsteuerung, das „+“ für ein neues Gewerk
  nur im Planlaufmanagement; Drucken und Excel der Liste nur in der Projektsteuerung. Rund 300
  Zeilen Tabelle und Formular doppelt.
* **Vorschlag:** die gemeinsamen Kontaktfelder (einschließlich „Mobil“) und die Tabellenzeile als
  Bausteine in `src/gemeinsam/`; die bereichseigenen Felder kommen dazu. Die fachlich
  verschiedene Zuordnung bleibt (Planlaufmanagement: eine Person je Funktion; Projektsteuerung:
  eine Funktion je Person).
* **Entscheidung:** ☐ umsetzen · ☐ später · ☐ nicht umsetzen

### M-11 · Drucken und Exportieren: anderes Symbol, andere Wörter
* **Art:** Wortlaut/Optik · **Aufwand:** klein · **Nutzen:** niedrig
* **Heute:** Ein Druckersymbol gibt es nicht – das Planlaufmanagement nimmt für „Drucken“ das
  Export-Symbol, die Projektsteuerung für „Drucken / PDF“ das Plan-Symbol. Das Planlaufmanagement
  bündelt die Ausgabe unter „Export“ (Dialog mit „PDF“/„Excel“), die Projektsteuerung hat zwei
  Knöpfe. Zeitstempel „TT.MM.JJJJ, hh:mm“ werden an drei Stellen je eigens formatiert.
* **Vorschlag:** ein Symbol „Drucken“, einheitlich „Drucken / PDF“ und „Excel“; Zeitstempel als
  eine Funktion in `src/shared/dates.ts`.
* **Entscheidung:** ☐ umsetzen · ☐ später · ☐ nicht umsetzen

### M-12 · Workflow-Liste und Workflow-Editor: gleiche Bedienung, zwei vollständige Codebestände
* **Art:** Code-Doppelung · **Aufwand:** groß · **Nutzen:** mittel
* **Heute:** Planlaufmanagement und Baubetriebsplanung haben je einen eigenen Editor
  (`components/WorkflowEditor.tsx`, 2226 bzw. 2020 Zeilen) samt Gestaltung (806 bzw. 613 Zeilen)
  und eine eigene Workflow-Liste – mit gleicher Optik, gleichen Kurzmeldungen und gleicher
  Rückfrage „Änderungen verwerfen?“. Für den Nutzer heute gleich; für die Pflege der größte
  doppelte Bestand der Anwendung. In der Gestaltung sind nach Angleichen des Präfixes 135 Regeln
  wortgleich, 25 tragen bereits abweichende Werte – die Fassungen laufen auseinander.
* **Vorschlag:** nicht die Fachlogik teilen (Schritte mit parallelen Blöcken gegen Status mit
  Nachfolgern), sondern den fachfreien Rahmen: zuerst die Gestaltung unter einem Präfix
  zusammenführen (geringstes Risiko), dann Kopf, Rückgängig/Wiederholen, Hinweisliste und die
  Karte der Workflow-Liste.
* **Risiko:** hoch – große, zentrale Bausteine ohne Tests; nur schrittweise.
* **Entscheidung:** ☐ umsetzen · ☐ später · ☐ nicht umsetzen

---

## 6. Optik und Gestaltung

Verglichen im Browser bei 1400 px und 400 px (Übersicht, Projektliste, Projektseite, Tabellen mit
Aktionen, Anlegen-Dialoge, Einstellungsseiten) und in den CSS-Dateien.

### O-1 · Suche, Filter und „Neu …“ stehen über den Listen an fünf verschiedenen Orten
* **Art:** Optik · **Aufwand:** mittel · **Nutzen:** mittel
* **Heute:** Das Suchfeld steht mal links über der Tabelle, mal rechts neben „Neu …“, mal im Kopf
  der Karte; der Filter „Alle / Überfällig / Fällig“ sitzt in der Projektsteuerung im Kartenkopf,
  in Planlaufmanagement und Baubetriebsplanung darüber. Jede Seite baut ihre Leiste von Hand –
  daraus entstand der behobene Überlauf im Reiter „Funktion“.
* **Vorschlag:** ein Baustein „Werkzeugleiste“ in `src/shared/ui.tsx` mit festen Plätzen (links
  Filter und Suche, rechts Nebenaktionen umrandet, die Hauptaktion ganz rechts) und eingebautem
  Umbruch; Vorbild ist die Planliste.
* **Entscheidung:** ☐ umsetzen · ☐ später · ☐ nicht umsetzen

### O-2 · „Abhaken“ sieht dreimal anders aus – und derselbe Haken bedeutet zweierlei
* **Art:** Optik/Bedienung · **Aufwand:** mittel · **Nutzen:** mittel
* **Heute:** Planlaufmanagement und Baubetriebsplanung: grauer Knopf nur mit Haken; im
  Planlaufmanagement erledigt er sofort, in der Baubetriebsplanung öffnet er die Auswahl des
  nächsten Status. Projektsteuerung: umrandeter Knopf mit Text „Erledigt“. Auf der Seite eines
  Planlaufs: blauer Knopf mit Text. „Erinnern“ ist mal nur ein Briefsymbol, mal Symbol und Text.
* **Vorschlag:** ein fachfreier „Haken-Knopf“ mit einem Aussehen; in Listen mit Platz umrandet und
  mit Text (Vorbild Projektsteuerung), der reine Haken nur in dichten Tabellen – mit Pfeil, wenn
  er ein Menü öffnet. „Erinnern“ einheitlich Symbol und Text. (Gehört zu U-8.)
* **Entscheidung:** ☐ umsetzen · ☐ später · ☐ nicht umsetzen

### O-3 · „Öffnen“ bzw. „Bearbeiten“ einer Zeile: blauer Knopf, umrandeter Knopf oder nur ein Stift
* **Art:** Optik · **Aufwand:** klein · **Nutzen:** mittel
* **Heute:** Workflow-Karten (Planlaufmanagement, Baubetriebsplanung): „Öffnen“ klein und blau –
  neben „Neuer Workflow“ stehen dadurch mehrere blaue Hauptknöpfe. Protokolle (Projektsteuerung):
  „Öffnen“ und „Folgeprotokoll“ umrandet ohne Symbol. Vorlagen (Planlaufmanagement): „Bearbeiten“
  umrandet. Planliste, Funktionen, Beteiligte: nur Stift und Papierkorb.
* **Vorschlag:** Regel festhalten: je Ansicht ein blauer Hauptknopf („Neu …“); Zeilen- und
  Kartenaktionen klein und umrandet mit Text, wenn es mehrere gibt, sonst Stift und Papierkorb;
  ein Wort für die Aktion.
* **Entscheidung:** ☐ umsetzen · ☐ später · ☐ nicht umsetzen

### O-4 · Farben stehen mehrfach im Code: Funktionsfarben fünfmal
* **Art:** Code-Doppelung · **Aufwand:** klein · **Nutzen:** mittel
* **Heute:** Die Palette der Funktionsfarben steht wortgleich in fünf Dateien (drei im
  Planlaufmanagement, zwei in der Projektsteuerung), die Ersatzfarbe in zwei weiteren. Für den
  Nutzer heute kein Unterschied – solange niemand eine der Stellen ändert.
* **Vorschlag:** einmal in `src/gemeinsam/` (Funktionen gehören zum Projektregister); zusammen mit
  den Ampelbausteinen aus U-1.
* **Entscheidung:** ☐ umsetzen · ☐ später · ☐ nicht umsetzen

### O-5 · Projektsteuerung: fest eingetragene Farben und eigene Klassen für Vorhandenes
* **Art:** Optik · **Aufwand:** klein · **Nutzen:** niedrig
* **Heute:** Nur `projektsteuerung.css` trägt feste Farbwerte (sieben Stellen) statt der
  gemeinsamen Design-Tokens – im Farbmodus „kontrast“ bleiben sie unverändert. Den kleinen
  Verknüpfungsknopf gibt es dreimal (global, Planlaufmanagement, Projektsteuerung) mit je anderer
  Größe und Unterstreichung; Ankreuzfelder sind in der Projektsteuerung 1 px größer.
* **Vorschlag:** Tokens statt fester Werte, eine Klasse für den Verknüpfungsknopf, Ankreuzfelder
  über die globale Regel.
* **Entscheidung:** ☐ umsetzen · ☐ später · ☐ nicht umsetzen

### O-6 · Die „fachfreie“ `global.css` führt Regeln einzelner Bereiche; Präfixe folgen keinem Schema
* **Art:** Code · **Aufwand:** mittel · **Nutzen:** niedrig
* **Heute:** 21 Klassen in `src/shared/global.css` nutzt nur das Planlaufmanagement, 6 nur die
  Baubetriebsplanung. Die CSS-Dateien des Planlaufmanagements tragen je Datei ein anderes Präfix
  (`pl-`, `pll-`, `pli-`, `ab-` …), Baubetriebsplanung und Projektsteuerung je eines (`bb-`,
  `ps-`). Die Projektsteuerung bricht zwischen 861 und 900 px schon um, die anderen noch nicht.
* **Vorschlag:** fachliche Regeln in die CSS des Bereichs verschieben, fachfreie Tabellenhilfen
  bleiben global; das Präfixschema und die Umbruchpunkte (640 px, 860 px) in `CLAUDE.md`
  festhalten.
* **Entscheidung:** ☐ umsetzen · ☐ später · ☐ nicht umsetzen

---

## 7. Workflows, Fristen und Ampeln

Der doppelte Workflow-Editor selbst steht unter M-12, die Fristenliste ohne Menüpunkt unter R-11,
Ampelpunkt und -marke unter U-1 und U-10, der Haken-Knopf unter O-2.

### W-1 · Menü „Schritt hinzufügen“ im Planlaufmanagement lässt sich nicht mit den Pfeiltasten bedienen
* **Art:** Bedienung · **Aufwand:** klein · **Nutzen:** mittel
* **Heute:** Die Baubetriebsplanung nutzt für „Status hinzufügen“ den gemeinsamen Baustein für
  Aufklappmenüs: Der Fokus springt auf den ersten Eintrag, die Pfeiltasten wechseln. Das
  Planlaufmanagement hat ein eigenes Menü: Der Fokus bleibt auf dem Knopf, Pfeiltasten wirken
  nicht (Einträge nur über Tab). Das weicht auch von der Projektregel ab, Aufklappmenüs immer über
  den gemeinsamen Baustein zu bauen.
* **Vorschlag:** das Menü des Planlaufmanagements auf den gemeinsamen Baustein umstellen; rund 30
  Zeilen eigene Gestaltung entfallen.
* **Entscheidung:** ☐ umsetzen · ☐ später · ☐ nicht umsetzen

### W-2 · Ab wann etwas „fällig“ ist, wird an drei Stellen und mit drei Vorgaben festgelegt
* **Art:** Datenmodell · **Aufwand:** mittel · **Nutzen:** mittel
* **Heute:** Planlaufmanagement: je Projekt, Vorgabe 5 Tage („Vorlaufzeit für Erinnerungen“ in den
  Projekteinstellungen). Baubetriebsplanung: für den ganzen Bereich, Vorgabe 14 Tage.
  Projektsteuerung: fest im Code. Ein Termin in sechs Tagen ist damit im Planlaufmanagement „Im
  Plan“, in den beiden anderen Bereichen „Fällig“. Die Regel selbst ist überall dieselbe.
* **Vorschlag:** einheitlich benennen („Fällig ab … Tagen vor dem Termin“) und als Einstellung des
  Bereichs führen; im Planlaufmanagement bleibt eine Abweichung je Projekt möglich, die
  Projektsteuerung bekommt die Einstellung.
* **Zu klären:** eine gemeinsame Vorgabe für alle Bereiche?
* **Entscheidung:** ☐ umsetzen · ☐ später · ☐ nicht umsetzen

### W-3 · Tagesfelder im Planlaufmanagement lassen sich nicht leeren und haben keine Grenzen
* **Art:** Bedienung · **Aufwand:** klein · **Nutzen:** mittel
* **Heute:** Die Felder für Fristen und Vorlaufzeit (Workflow-Editor, Projekteinstellungen,
  Planlauf, Terminnachweis) springen beim Leeren sofort auf „0“ – die nächste Ziffer ergibt „07“ –
  und nehmen beliebig große Werte an. Die Baubetriebsplanung hat dafür ein Feld, das beim Tippen
  leer sein darf, Grenzen kennt und nur gültige Werte übernimmt (allerdings in zwei fast gleichen
  Fassungen).
* **Vorschlag:** ein Zahlenfeld in `src/shared/ui.tsx` für alle sechs Stellen.
* **Entscheidung:** ☐ umsetzen · ☐ später · ☐ nicht umsetzen

### W-4 · Geänderte Standard-Workflows: in der Baubetriebsplanung bleiben sie, im Planlaufmanagement nicht
* **Art:** Datenmodell · **Aufwand:** mittel · **Nutzen:** niedrig
* **Heute:** Wer einen mitgelieferten Workflow anpasst, behält die Änderung in der
  Baubetriebsplanung dauerhaft; im Planlaufmanagement ersetzt die nächste Fassung der Stammdaten
  alle Standard-Workflows samt Änderungen. Beide Editoren raten zum Duplizieren, mit verschiedenem
  Wortlaut und aus verschiedenen Gründen.
* **Vorschlag:** eine Regel und ein Hinweistext; technisch das Verfahren der Baubetriebsplanung
  als Vorbild (Geändertes bleibt, nur Unverändertes wird fortgeschrieben).
* **Entscheidung:** ☐ umsetzen · ☐ später · ☐ nicht umsetzen

### W-5 · Workflow-Liste und Fristenlisten: gleiche Gerüste, kleine Abweichungen
* **Art:** Code-Doppelung/Wortlaut · **Aufwand:** mittel · **Nutzen:** mittel
* **Heute:** Die Karte der Workflow-Liste und die Punktkette des Standardverlaufs sind in beiden
  Bereichen je eigens gebaut (rund 150 Zeilen je), die Leerzustände weichen im Wortlaut ab. Die
  Fristenlisten („Fristen & Erinnerungen“, „Termine & Nachhaken“) haben dasselbe Gerüst (rund 200
  Zeilen je), ordnen die Projekte aber einmal nach Nummer, einmal nach Name. In den beiden
  Editoren heißen gleiche Dinge schon verschieden („Art“ / „Typ“, „Früher im Ablauf“ / „Früher in
  der Reihenfolge“).
* **Vorschlag:** Karte und Punktkette als fachfreie Bausteine zusammen mit der gemeinsamen
  Gestaltung aus M-12; Sortierung und Wörter angleichen.
* **Entscheidung:** ☐ umsetzen · ☐ später · ☐ nicht umsetzen

---

## 8. Datenhaltung und Datenmodell

### D-1 · Freitext zum Projekt: „Beschreibung“ wird geteilt, die „Bemerkung“ der Baubetriebsplanung nicht
* **Art:** Datenmodell · **Aufwand:** klein · **Nutzen:** mittel
* **Heute:** Planlaufmanagement und Projektsteuerung führen eine „Beschreibung“, die über das
  Projektregister in allen Bereichen gilt. Die Baubetriebsplanung hat an derselben Stelle des
  Dialogs eine „Bemerkung“, die nur dort steht: Ein Projekt mit Beschreibung kommt in der
  Baubetriebsplanung mit leerer Bemerkung an, und umgekehrt. Wer ein Projekt in zwei Bereichen
  führt, pflegt den Text zweimal.
* **Vorschlag:** die Bemerkung an die Beschreibung des Registers anbinden und „Beschreibung“
  nennen – oder, wenn sie bewusst bereichseigen bleiben soll, die geteilte Beschreibung daneben
  anzeigen.
* **Entscheidung:** ☐ anbinden · ☐ bereichseigen lassen, Beschreibung anzeigen · ☐ so lassen

### D-2 · Mobilnummer einer Person kennt das Planlaufmanagement nicht
* **Art:** Datenmodell · **Aufwand:** mittel · **Nutzen:** mittel
* **Heute:** Dieselbe Person zeigt in Projektsteuerung und Baubetriebsplanung eine Mobilnummer, im
  Planlaufmanagement lässt sie sich weder sehen noch eintragen (das Projektregister führt das
  Feld). Siehe auch M-10.
* **Vorschlag:** das Feld im Planlaufmanagement ergänzen (Kontaktdialog, Tabelle, Excel-Vorlage).
  Das persönliche Kürzel kann der Projektsteuerung vorbehalten bleiben – es dient nur den
  Protokollen.
* **Entscheidung:** ☐ umsetzen · ☐ später · ☐ nicht umsetzen

### D-3 · Demodaten: kein gemeinsames Projekt, Übersicht der Projektsteuerung bleibt leer
* **Art:** Funktion · **Aufwand:** mittel · **Nutzen:** mittel
* **Heute:** Nach dem Öffnen aller drei Bereiche führt das Register sechs Demoprojekte, keines in
  zwei Bereichen – „Auch in …“, geteilte Beteiligte und das Archiv je Bereich sind in der Demo
  nicht zu sehen. Mit der Vorgabe „Max Mustermann“ zeigt das Planlaufmanagement drei To-Dos, die
  Projektsteuerung keine (dort müsste man „Lena Roth“ eintragen).
* **Vorschlag:** ein gemeinsames Demoprojekt in allen drei Bereichen und Demo-Aufgaben für die
  Vorgabe-Anmeldung.
* **Entscheidung:** ☐ umsetzen · ☐ später · ☐ nicht umsetzen

### D-4 · „Sicherung abgleichen“ gibt es nur im Planlaufmanagement
* **Art:** Funktion · **Aufwand:** groß · **Nutzen:** mittel
* **Heute:** Ohne Server ist die Sicherung der einzige Weg, die Stände zweier Arbeitsplätze
  zusammenzubringen. Im Planlaufmanagement lassen sich Änderungen aus einer Sicherung einzeln
  übernehmen; in Baubetriebsplanung und Projektsteuerung überschreibt das Einspielen den ganzen
  Bestand – wer inzwischen selbst etwas eingetragen hat, verliert es. Dieselbe Aktion hat damit
  je Bereich eine andere Tragweite.
* **Vorschlag:** stufenweise: erst die Voraussetzungen schaffen (Änderungszeitpunkt je Objekt,
  D-5; Löschvermerke), dann den fachfreien Kern des Abgleichs herauslösen und in den beiden
  anderen Bereichen anbieten.
* **Zu klären:** Wird in Baubetriebsplanung und Projektsteuerung an mehreren Arbeitsplätzen
  gearbeitet? Dann ist das der wichtigste Punkt dieses Abschnitts.
* **Entscheidung:** ☐ umsetzen · ☐ später · ☐ nicht umsetzen

### D-5 · Wer hat wann was geändert? Drei verschiedene Stände
* **Art:** Datenmodell · **Aufwand:** mittel · **Nutzen:** mittel
* **Heute:** Planlaufmanagement: Änderungsprotokoll je Planlauf und Änderungszeitpunkt an jedem
  Objekt. Baubetriebsplanung: nur der Statusverlauf je Anmeldung. Projektsteuerung: nichts – wer
  ein Protokoll, eine Person oder eine Funktion zuletzt geändert hat, lässt sich nicht
  feststellen. Das gleichnamige Feld `geaendertAm` bedeutet im Planlaufmanagement „Zeitstempel
  jeder Änderung“, in der Baubetriebsplanung „Tag der letzten fachlichen Änderung“.
* **Vorschlag:** den Änderungszeitpunkt in allen drei Bereichen gleich führen (fachfreier
  Baustein, keine Umstellung der Bestände nötig); das fachliche Datum der Baubetriebsplanung
  umbenennen.
* **Entscheidung:** ☐ umsetzen · ☐ später · ☐ nicht umsetzen

### D-6 · Was nach jeder Änderung nachgezogen wird, ist dreimal anders gebaut
* **Art:** Code-Doppelung · **Aufwand:** mittel · **Nutzen:** mittel
* **Heute:** Im Planlaufmanagement läuft jede Änderung durch eine zentrale, ohne Oberfläche
  prüfbare Funktion, die Abgeleitetes nachzieht. In Baubetriebsplanung und Projektsteuerung hängt
  es an jeder einzelnen Aktion, ob Abgeleitetes stimmt – daher blieben etwa Logos gelöschter
  Protokollreihen im Bestand. Ebenso steht die Anbindung an das Projektregister als gleiches
  Gerüst in drei Dateien (rund 60 Zeilen je), und was ein neues Projekt mitbekommt, steht je
  Bereich an zwei Stellen (Dialog und Übernahme aus dem Register).
* **Vorschlag:** in beiden Bereichen eine zentrale Änderungsfunktion nach dem Muster des
  Planlaufmanagements; je Bereich eine Funktion „Projekt anlegen“, die Dialog und Register
  gemeinsam nutzen.
* **Entscheidung:** ☐ umsetzen · ☐ später · ☐ nicht umsetzen

### D-7 · Kleine Helfer mehrfach definiert – zwei gleichnamige liefern Verschiedenes
* **Art:** Code-Doppelung · **Aufwand:** klein · **Nutzen:** mittel
* **Heute:** Das Kürzel einer Funktion wird in Planlaufmanagement und Projektsteuerung von zwei
  gleichnamigen Funktionen gebildet, die Verschiedenes liefern („Bau-Überwachung“: „BAU“ gegen
  „BÜ“) – legt der Abgleich dieselbe Funktion in beiden Bereichen neu an, trägt sie verschiedene
  Kürzel. Der Anzeigename einer Person ohne Namen ist im Register die Firma, in der
  Projektsteuerung leer. Grundtypen (Kennung, Datum, Farbmodus) sind bis zu viermal definiert.
* **Vorschlag:** je eine Fassung in `src/gemeinsam/` bzw. `src/shared/`.
* **Entscheidung:** ☐ umsetzen · ☐ später · ☐ nicht umsetzen

### D-8 · Vorgabenamen und „Zurücksetzen“: verstreute Sonderfälle
* **Art:** Datenmodell · **Aufwand:** klein · **Nutzen:** niedrig
* **Heute:** „Angemeldet als“ muss fünf Vorgabenamen der Demodaten als feste Zeichenketten kennen
  („Max Mustermann“, „PLM“, „Projektsteuerung MIC“, „Lena Roth“, „Bearbeitung MIC“); ändert jemand
  einen Namen in den Demodaten, gilt er unbemerkt als selbst eingetragen. Was „Zurücksetzen“
  behält, steht an drei Stellen in drei Fassungen.
* **Vorschlag:** eine Konstante für den Vorgabenamen; eine Regel für „Zurücksetzen“ (Persönliches
  bleibt, alles Übrige kommt aus den Demodaten).
* **Entscheidung:** ☐ umsetzen · ☐ später · ☐ nicht umsetzen

### D-9 · Bezeichner im Code: Planlaufmanagement englisch, die anderen deutsch
* **Art:** Code · **Aufwand:** groß · **Nutzen:** niedrig
* **Heute:** Dieselbe Sache hat bis zu vier Namen (Person: `Contact`, `Beteiligter`,
  `RegisterPerson`, `LokalePerson`). Jede Anbindung ans Register übersetzt von Hand; gemeinsamer
  Code braucht je Bereich einen Adapter. Für den Nutzer ohne Folge.
* **Vorschlag:** die gespeicherten Feldnamen nicht anfassen (das beträfe Umstellung, Sicherungen
  und Abgleich). Neue Felder und Funktionen deutsch benennen; gemeinsamer Code arbeitet über die
  einheitliche Sicht des Registers.
* **Entscheidung:** ☐ so vorgehen · ☐ nicht umsetzen

---

## 9. Einzelhinweise je Bereich

Aus der Fehlersuche: keine belegten Fehler (die sind behoben, Abschnitt 1), sondern Stellen, an
denen eine fachliche Festlegung fehlt oder der Code robuster sein könnte. Jeder Punkt ist klein.

### Planlaufmanagement

| Kennung | Hinweis | Vorschlag | Entscheidung |
| --- | --- | --- | --- |
| P-1 | Die Umstellung alter Stände führt bei jeder neuen Fassung alle früheren Umstellungsschritte erneut aus – die Wurzel des behobenen Fehlers bei den Funktionen je Gewerk und ein Risiko für jede weitere Erweiterung. | Schritte an die Ausgangsfassung binden. Aufwand mittel. | ☐ umsetzen · ☐ später |
| P-2 | Das Projekt hat keine Tests. Die Prüfer haben für Ablauf- und Terminrechnung und für den Workflow-Editor Zufallsprüfungen geschrieben (7200 Läufe bzw. 72 000 Editor-Operationen), die Fehler in Sekunden fanden. | Die Skripte als wiederholbare Prüfung ins Repository übernehmen (keine neue Abhängigkeit). Aufwand mittel. | ☐ umsetzen · ☐ später |
| P-3 | Beide Excel-Importe (Planliste, Funktionen) schreiben je Zeile einzeln in den Bestand und rechnen auf dem Stand vor dem Import. | Je Import eine reine Funktion und ein einziger Schreibvorgang. Aufwand mittel. | ☐ umsetzen · ☐ später |
| P-4 | Ein nicht lesbares Datum im Planlisten-Import („10/30/2027“) wird stillschweigend weggelassen – der Planlauf startet ohne Eingangstermin. | In der Vorschau einen Hinweis je Zeile zeigen. | ☐ umsetzen · ☐ später |
| P-5 | Der Funktionen-Import erkennt Personen über „E-Mail, sonst Name“: Bekommt eine vorhandene Person in der Datei erstmals eine E-Mail, entsteht eine zweite Person gleichen Namens. | Ersatzweise über Vor- und Nachname suchen; in der Vorschau „neu“ bzw. „aktualisiert“ ausweisen. | ☐ umsetzen · ☐ später |
| P-6 | Nennt eine Importzeile zugleich Planverzeichnis und Planpaket, entsteht ein leeres Planpaket. | Das Paket nicht anlegen und in der Vorschau vermerken. | ☐ umsetzen · ☐ später |
| P-7 | „Schritt einfügen“ ist bei beendeten Planläufen nur in der Oberfläche gesperrt, nicht in der Rechnung. | Auch dort abweisen. | ☐ umsetzen · ☐ später |
| P-8 | Übersprungene Schritte wechseln bei einer Umbesetzung der Funktion die zuständige Person (erledigte nicht). | Übersprungene wie erledigte behandeln. | ☐ umsetzen · ☐ später |
| P-9 | Terminrechner: Der ausgewiesene Puffer eines Zweigs, dessen Antwort aus dem parallelen Block aussteigt, gilt bei Gleichstand nicht; die Hinweistexte sprechen auch bei gewähltem Zielschritt vom „Termin auf der Baustelle“; archivierte Projekte stehen in der Auswahl. | Texte aus der Feldbeschriftung ableiten, Archivierte kennzeichnen, Puffer als „bis zum Ausstieg“ ausweisen. | ☐ umsetzen · ☐ später |
| P-10 | Änderungen, die aus dem Projektregister kommen (ein anderer Bereich löscht eine geteilte Person), stehen im Änderungsprotokoll unter dem Namen der angemeldeten Person. | Als „Projektregister“ kennzeichnen. | ☐ umsetzen · ☐ später |
| P-11 | „Sicherung abgleichen“: Projektübergreifende Funktionen tragen keinen Änderungszeitpunkt („zuletzt geändert: unbekannt“); das Löschdatum im Kennzeichen kann kurz nach Mitternacht einen anderen Tag nennen als die Zeile darunter. | Zeitpunkt mitführen; Ortszeit verwenden. | ☐ umsetzen · ☐ später |
| P-12 | Die Rohkopie vor einer Umstellung wird nach der Daten-Fassung benannt und nie erneuert; nach einer reinen Stammdaten-Umstellung fehlt sie deshalb bei der nächsten Daten-Umstellung. | Eigener Schlüssel für Stammdaten-Umstellungen. | ☐ umsetzen · ☐ später |
| P-13 | Beim Duplizieren eines Schritts oder Workflows behalten die E-Mail-Regeln ihre Kennungen (heute folgenlos). | Neue Kennungen vergeben. | ☐ umsetzen · ☐ später |
| P-14 | Das Gewerk an der Zuordnung Person–Funktion ist eine Kopie ohne Leser (seit dieser Durchsicht wird es beim Ändern der Funktion wenigstens mitgezogen). | Feld auslaufen lassen. | ☐ umsetzen · ☐ später |
| P-15 | Terminnachweis: Führt eine Antwort ohne Nacharbeit auf einen Schritt, der nicht auf dem Regelweg des Basisplans liegt („anderer Weg“), geht die Rechnung weiterhin nicht auf („Nicht erklärt“). Das Auslassen von Schritten (Abkürzung, Ausstieg nach vorn) ist behoben. | Fachlich festlegen, wem die Zeit eines solchen Schritts zugerechnet wird. | ☐ festlegen · ☐ später |

### Baubetriebsplanung

Zu B-1 bis B-4 (unten) kommen aus der Prüfung der Oberfläche:

| Kennung | Hinweis | Vorschlag | Entscheidung |
| --- | --- | --- | --- |
| B-5 | „Letzten Wechsel zurücknehmen“ stellt den ganzen Stand vor dem Wechsel her – auch Merkmale, die danach von Hand geändert wurden. | Bei Wechseln im selben Workflow nur Status und Termin zurücknehmen. | ☐ umsetzen · ☐ später |
| B-6 | Übernahme-Dialog bei 400 px: Die Felder der aufgeteilten Anmeldungen stehen ohne Beschriftung untereinander. | Zellen beschriften (gehört zu M-8). | ☐ umsetzen · ☐ später |
| B-7 | Die Adresse einer Anmeldung prüft das Projekt nicht: Unter der Adresse eines anderen Projekts erscheint die Anmeldung mit dessen Kopfzeile und Zuständigkeit. | „Nicht gefunden“ zeigen. | ☐ umsetzen · ☐ später |


### B-1 · „Nachgehakt …“ überschreibt mit seiner Vorbelegung auch Richtlinienfristen
* **Aufwand:** klein · **Nutzen:** mittel
* **Heute:** Der Dialog belegt „Nächster Nachhak-Termin“ immer mit heute + Abstand vor – auch in
  Status, deren Terminfrist eine Richtlinienfrist oder ein Stichtag ist (etwa „Mitwirkung BBK“:
  Ril_KM − 2 Tage). Mit „Festhalten“ ersetzt der Termin von Hand die berechnete Frist; sie ist bis
  zum nächsten Statuswechsel nirgends mehr zu sehen.
* **Vorschlag:** nur vorbelegen, wenn die Frist des Status selbst ein Nachhak-Termin ist; sonst
  leer lassen (der Hinweis „leer lassen, um die bisherige Frist zu behalten“ steht schon da).
* **Entscheidung:** ☐ umsetzen · ☐ später · ☐ nicht umsetzen

### B-2 · Der Import aus BBPNeo holt Anmeldeleichen zurück und stuft „verspätet“ auf „fristgerecht“
* **Aufwand:** klein · **Nutzen:** mittel
* **Heute:** Steht eine Anmeldung in „Anmeldeleiche“, setzt der nächste Import sie auf den
  zugeordneten Status zurück; eine gelöschte entsteht neu. „Angemeldet (verspätet)“ wird bei jedem
  Import zu „Angemeldet (fristgerecht)“, weil je Status aus BBPNeo nur ein Ziel zugeordnet ist. Die
  Vorschau nennt das, verhindern lässt es sich nur für den ganzen Status.
* **Vorschlag:** Anmeldeleichen beim Aktualisieren auslassen und den Status nicht wechseln, wenn
  der bisherige dieselbe Bedeutung hat.
* **Entscheidung:** ☐ umsetzen · ☐ später · ☐ nicht umsetzen

### B-3 · Abgeschlossene Projekte: in den Terminen mitgezählt, im Anmeldebedarf nicht
* **Aufwand:** klein · **Nutzen:** niedrig
* **Heute:** Terminfristen der Anmeldungen zählen auch für Projekte mit Status „abgeschlossen“,
  Erstanmeldung und Anmeldebedarf lassen sie weg.
* **Vorschlag:** eine Regel festlegen und überall gleich anwenden (siehe U-13).
* **Entscheidung:** ☐ mit U-13 entscheiden

### B-4 · Verstrichener Anmeldebedarf verschwindet kommentarlos
* **Aufwand:** klein · **Nutzen:** mittel
* **Heute:** Die Berechnung kennt sechs Zustände des Anmeldebedarfs, die Oberfläche zeigt nur
  noch „fällig“. Verstreicht eine Richtlinienfrist ohne Eintrag, fällt sie aus „Anmeldebedarf aus
  den Projekten“ heraus – nirgends steht „verstrichen“.
* **Vorschlag:** verstrichenen Bedarf in „Termine & Nachhaken“ als überfällig zeigen – oder die
  ungenutzten Zustände samt Code entfernen.
* **Entscheidung:** ☐ als überfällig zeigen · ☐ ungenutzten Code entfernen · ☐ so lassen


### Projektsteuerung

| Kennung | Hinweis | Vorschlag | Entscheidung |
| --- | --- | --- | --- |
| S-1 | Zeigt der Verweis „weitergeführt in“ auf ein Protokoll, das es nicht mehr gibt (bearbeitete Sicherung, erneuter Import), ist die Aufgabe dauerhaft unsichtbar. | Beim Laden gegen die vorhandenen Protokolle prüfen. | ☐ umsetzen · ☐ später |
| S-2 | Der Excel-Import der Beteiligten bildet seinen eigenen Schlüssel dafür, wann zwei Funktionen „dieselbe“ sind – das Register einen anderen. | Den Schlüssel des Registers verwenden. | ☐ umsetzen · ☐ später |
| S-3 | Übersicht: Das Protokoll zu einer Aufgabe öffnet sich nur per Mausklick auf die Zeile; mit der Tastatur ist je Zeile nur „Erledigt“ erreichbar. | Die Fundstelle als Knopf ausführen. | ☐ umsetzen · ☐ später |
| S-4 | Protokoll-Editor: Das Feld „Ergänzung eintragen“ wechselt beim ersten Zeichen das Eingabeelement – bei Tottasten (´, ^) und Bildschirmtastaturen kann dabei ein Zeichen verloren gehen. | Dasselbe Element weiterführen. Aufwand mittel. | ☐ umsetzen · ☐ später |
| S-5 | Die Auswahl „Verantwortlich“ schneidet Namen ab („PS – Lena Rot“). | Nur das Kürzel zeigen oder die Spalte verbreitern. | ☐ umsetzen · ☐ später |
| S-6 | Löscht das Projektregister ein Projekt samt Protokollen (seltener Weg über zwei Fenster), bleiben die Logos seiner Protokollreihen im Bestand liegen und belegen Speicher. | Die Logos zentral nach jeder Änderung bereinigen (gehört zu D-6). | ☐ umsetzen · ☐ später |

---

## 10. Aufräumen: unbenutzter Code

Exporte, die nirgends verwendet werden (jeweils nur die Definition im Code). Entfernen ist
gefahrlos und hält den Code lesbar.

| Stelle | Name |
| --- | --- |
| `src/bereiche/baubetrieb/domain/seed.ts` | `leererBestand` |
| `src/bereiche/baubetrieb/domain/workflow.ts` | `KM_BESCHREIBUNG`, `KKM_BESCHREIBUNG` nur innerhalb der Datei verwendet; der Kommentar „auch für die Migration“ stimmt nicht mehr |
| `src/bereiche/planlauf/components/common.tsx` | `RollenChips` |
| `src/bereiche/planlauf/domain/engine.ts` | `verzugTage`, `zielVonSchritt` |
| `src/bereiche/planlauf/domain/mailRegeln.ts` | `hatMails` |
| `src/bereiche/planlauf/domain/types.ts` | `PLANLAUF_MODUS_LABEL`, `istUebergreifend` |
| `src/bereiche/planlauf/store/storage.ts` | `loescheDaten` |
| `src/shared/dates.ts` | `formatDateShort` |
| `src/shared/xlsx.ts` | `bildGroesse` |
| `src/shell/bereiche.ts` | `bereichInfo` |

Ebenso unbenutzt sind vier Klassen in `src/shared/global.css`: `.topbar-actions`, `.grid-3`,
`.chip-weg`, `.mail-vorschau`.

* **Aufwand:** klein · **Entscheidung:** ☐ entfernen · ☐ lassen

---

## 11. Anhang: Was schon einheitlich ist

Damit die Liste nicht den Eindruck erweckt, alles liefe auseinander – diese Dinge sind in allen
drei Bereichen bereits gleich gelöst:

* **Aussehen des Rahmens:** Seitenleiste, Menüpunkte, Zähler, Kopfzeile und Inhalt nutzen dieselben
  Klassen aus `src/shared/global.css`; die schmale Ansicht verhält sich überall gleich.
* **Fuß der Seitenleiste:** „Angemeldet als“, „Sicherung“, „Einspielen“, „Zurücksetzen“, „Bereich
  wechseln“ – gleicher Aufbau, „Angemeldet als“ ist ein gemeinsamer Baustein.
* **Speicherregeln:** gespeichert wird nur bei einwandfrei geladenem Bestand; Rohkopie vor jeder
  Umstellung und vor dem Einspielen über einen unlesbaren Stand; Nachräumen bei vollem Speicher;
  Nachladen, wenn ein anderes Fenster speichert.
* **Texte der Hinweise** zu Ladefehler, neuerer Fassung und Speicherfehler samt Knöpfen sind
  wörtlich gleich.
* **Übersicht:** vier Kennzahl-Kacheln, Hinweis „Kein Projekt markiert“, Aufgabenkarte, Karte
  „Projekte“ – gleicher Aufbau aus denselben Bausteinen; die Regel „markierte Projekte, sonst
  alle, archivierte nie“ gilt inhaltlich überall.
* **Projektliste:** gleicher Aufbau; „Auch in …“, Archiv, „Projekte aus anderen Bereichen“ und der
  Verknüpfungshinweis sind gemeinsame Bausteine.
* **Dialoge:** alle über denselben Baustein `Modal` (Fokus, Escape, Tab bleibt im Dialog); Titel
  „Neues Projekt“ / „Projekt bearbeiten“, Knöpfe „Abbrechen“ / „Speichern“.
* **Rückfragen vor dem Löschen** laufen durchweg über denselben Baustein mit Titel „<Ding>
  löschen?“ und den Knöpfen „Löschen“ / „Abbrechen“; Kurzmeldungen „<Ding> gelöscht.“ und
  „Bitte … angeben.“ lauten überall gleich.
* **Suchfelder, Tabellen, Symbole:** ein Baustein für die Suche, dieselben Tabellenklassen,
  klickbare Zeilen und Aktionen rechts; die Symbole für Bearbeiten, Löschen, Neu, Excel-Import,
  Duplizieren und Herunterladen sind in allen Bereichen dieselben.
* **Begriffe:** „löschen“ für Objekte, „entfernen“ für das Herausnehmen aus einer Zuordnung.
* **Farben** der Ampelstufen (rot, orange, blau, grau) und des Projektstatus (grün, orange, grau)
  sind in allen Bereichen gleich.
