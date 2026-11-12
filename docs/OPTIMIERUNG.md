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

**Inhalt**

1. [Bereits behoben](#1-bereits-behoben-in-diesem-pull-request)
2. [Entscheidungen aus dem Entfernen der beiden Bereiche](#2-entscheidungen-aus-dem-entfernen-der-beiden-bereiche)
3. [Rahmen, Navigation, Sicherung](#3-rahmen-navigation-sicherung)
4. [Übersichten, Projektlisten, Projektseiten](#4-übersichten-projektlisten-projektseiten)
5. [Einzelhinweise Baubetriebsplanung](#5-einzelhinweise-baubetriebsplanung)
6. [Aufräumen: unbenutzter Code](#6-aufräumen-unbenutzter-code)
7. [Anhang: Was schon einheitlich ist](#7-anhang-was-schon-einheitlich-ist)

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
| Alle (Excel-Import) | In Mappen mit umsortierten Blättern standen die Blattnamen an fremden Inhalten; Zellen ohne Zellbezug landeten alle in Spalte A. | Blätter werden über ihre Beziehung in der Mappe zugeordnet. |

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
* **Vorschlag:** ein fachfreier Baustein in `src/shared/ui.tsx`; die Bereiche behalten nur ihre
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

### U-6 · Kennzahl-Kacheln: mal anklickbar, mal nicht, mal mit Filter – und nicht in einer Flucht
* **Art:** Bedienung/Optik · **Aufwand:** klein · **Nutzen:** mittel
* **Heute:** Projektsteuerung: Ein Klick auf „Überfällig“ zeigt genau die überfälligen Punkte.
  Planlaufmanagement und Baubetriebsplanung: Die Kachel öffnet eine andere Seite ohne Filter; im
  Planlaufmanagement reagieren zwei Kacheln gar nicht. Zahl und Beschriftung anklickbarer Kacheln
  stehen 6 px versetzt zu den übrigen.
* **Vorschlag:** jede Kachel anklickbar, mit vorbelegtem Filter der Zielseite; der Versatz
  entfällt mit einer Zeile CSS.
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

## 5. Einzelhinweise Baubetriebsplanung

Aus der Fehlersuche in Domäne und Store der Baubetriebsplanung – keine Fehler, aber Stellen, an
denen eine fachliche Entscheidung fehlt.

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

---

## 6. Aufräumen: unbenutzter Code

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

* **Aufwand:** klein · **Entscheidung:** ☐ entfernen · ☐ lassen

---

## 7. Anhang: Was schon einheitlich ist

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
* **Farben** der Ampelstufen (rot, orange, blau, grau) und des Projektstatus (grün, orange, grau)
  sind in allen Bereichen gleich.
