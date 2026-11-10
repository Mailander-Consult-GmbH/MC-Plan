# KaPlan – Hinweise für die Arbeit am Code

KaPlan ist eine React-19-/TypeScript-/Vite-Anwendung **ohne Server**; alle Daten liegen im
`localStorage` des Browsers. Installierbar als PWA, veröffentlicht über GitHub Pages. Sie besteht
aus vier getrennten Bereichen: **Planlaufmanagement** (`src/bereiche/planlauf/`),
**Baubetriebsplanung** (`src/bereiche/baubetrieb/`, erster Entwurf), **Projektsteuerung**
(`src/bereiche/projektsteuerung/`, erster Entwurf) und **Leistungsnachweise**
(`src/bereiche/leistungsnachweise/`, erster Entwurf, aus `LR-PMKA/KaPlan-Test`), dazu dem
**Controlling** (`src/bereiche/controlling/`, mit PIN), das die Projekte aller Bereiche im
gemeinsamen **Projektregister** (`src/gemeinsam/`) verwaltet und das Controlling der
Leistungsnachweise einbindet. Überblick über Aufbau und
Funktionen: `README.md`; belegtes Inventar aller Routen, Aktionen und Meldungen: `docs/INVENTAR.md`.

## Nach jeder Änderung nachziehen

Eine Änderung ist erst fertig, wenn alle betroffenen Dateien zum Code passen:

1. **`README.md`** – Funktionsbeschreibung, Aufbau des Codes, Veröffentlichen.
2. **`docs/INVENTAR.md`** – nur Aussagen, die sich im Code belegen lassen. Vor dem Commit prüfen,
   dass jeder genannte Pfad existiert und jeder zitierte Oberflächentext wörtlich im Code steht.
3. **Weitere relevante Dateien**, insbesondere:
   * Code-Kommentare, die das geänderte Verhalten beschreiben,
   * der Hinweistext in `index.html` (erscheint, wenn der Quellcode statt des Builds ausgeliefert wird),
   * `public/sw.js`: Cache-Namen hochzählen, wenn sich die Hülle ändert (Titel, Symbole, Manifest).

Funktion und Dokumentation werden in getrennten Commits festgehalten.

## Prüfen, bauen, veröffentlichen

```bash
npm ci              # Abhängigkeiten
npm run dev         # Entwicklungsserver, Port 5173
npm run typecheck   # tsc --noEmit – vor jedem Commit
npm run build       # tsc -b && vite build → dist/
```

Tests und Linter gibt es nicht; `typecheck` (strict, `noUnusedLocals`, `noUnusedParameters`) und
`build` sind die einzigen Prüfungen.

`.github/workflows/pages.yml` baut bei jedem Pull Request (nur Prüfung) und bei jedem Push auf
`main`. Auf `main` stellt er den Build über GitHub Pages bereit und legt ihn zusätzlich im Branch
`gh-pages` und im Ordner **`app/`** ab. `app/` ist der eingecheckte Build, auf den die
Wurzel-`index.html` umschaltet, wenn Pages den Zweig selbst ausliefert („Deploy from a branch“).
**`app/` in Feature-Branches nicht von Hand neu bauen** – der Workflow erneuert ihn nach dem Merge;
von Hand gebaute Stände führen nur zu Konflikten zwischen den gehashten Dateinamen. `dist/` ist
ignoriert. Jeder Build trägt eine Kennung (`__FASSUNG__` und `fassung.json` aus `vite.config.ts`,
Commit aus `GITHUB_SHA`); weicht die veröffentlichte ab, meldet ein offenes Fenster „Neue Fassung
von KaPlan verfügbar“ (`useNeueFassung` in `src/shared/pwa.ts`, `src/shell/NeueFassung.tsx`).

## Aufbau

* `src/shell/` – Startbildschirm und Bereichswahl; die erste Wegmarke der Hash-Adresse
  (`#/planlauf/…`, `#/baubetrieb/…`, `#/projektsteuerung/…`, `#/leistungsnachweise/…`,
  `#/controlling/…`) bestimmt den Bereich. Ein neuer Bereich braucht einen Eintrag in `BereichId`/`BEREICHE`
  (`src/shell/bereiche.ts`) und in `src/shell/Shell.tsx`; führt er Projekte, zusätzlich einen in
  `ProjektBereich`/`PROJEKT_BEREICHE` (`src/gemeinsam/register.ts`), ein `domain/register.ts`
  und `useRegisterAbgleich` im Store.
* `src/gemeinsam/` – das **Projektregister**, der einzige Bestand, den sich die Bereiche teilen
  (Schlüssel `kaplan-projektregister.v1`): Projekte (Nummer, Bezeichnung, Beschreibung), ihre
  Zugehörigkeit je Bereich mit lokaler Kennung und Archivstand (`Mitgliedschaft`, `offen` =
  Übernahme steht aus) und die Projektbeteiligten mit Kontaktdaten und Funktionen (über
  Bezeichnung + Gewerk erkannt, `funktionsSchluessel`). Jedes Projekt gehört auch in die
  Leistungsnachweise (`JEDES_PROJEKT_IN`: deren Abgleich nimmt alle auf, kein Zurücknehmen);
  die anderen Bereiche nennen sie in ihren Projektansichten nicht (`genannteBereiche`). Die
  ★-Markierung der Bereiche steht als Spiegel in der Mitgliedschaft (`markiert`); in den
  Leistungsnachweisen gilt ein anderswo markiertes Projekt als markiert (`markiertAnderswo`).
  `register.ts` Modell, Laden/Speichern,
  `registerAendern`/`useRegister` (ob das letzte Speichern gelang: `useRegisterSpeicherZustand`;
  ein ungespeicherter Stand wird bei jedem weiteren `registerAendern` erneut geschrieben,
  `registerErneutSpeichern`; speichert ein anderes Fenster, trägt der `storage`-Hörer ihn auf
  dessen Stand nach und speichert erneut, `eigeneAenderungenNachziehen` – neue Registerfelder
  gehen dort ohne Weiteres mit, sie werden je Feld zusammengeführt; neu nachgezogen werden nur
  Projekte des Controllings, was ein Bereich eingetragen hat, trägt sein Abgleich wieder ein;
  Löschvermerke ergänzt sie um Übernahmen der anderen Seite; zogen zwei Fenster zugleich nach,
  erkennt das überschriebene es an `nachgezogenAuf` und zieht noch einmal nach); `abgleich.ts` reine Funktionen: `uebertragen` (Änderungen
  des Bereichs → Register, alter gegen neuer Stand), `abgleichen` (Unbekanntes eintragen, `Plan`
  für den Bereich; Mitgliedschaften lösen und ★ aus dem Bestand übernehmen nur bei `vollstaendig`
  – erster Abgleich nach dem Laden bzw. nach `ersetzt()` – und die ★ eines eben übernommenen,
  noch `offen`en Projekts, sonst kämen mehrere Fenster nicht zur Ruhe; Stammdaten gleicher Nummer
  führt `stammdatenZusammenfuehren` zusammen – das Register gilt, Abweichungen des Bereichs stehen
  als Vermerk in der Beschreibung) und die Aktionen des Controllings; `useRegisterAbgleich.ts`
  bindet einen Store an; `useFremdeAenderung.ts` lädt den Bestand eines Stores nach, wenn ein
  anderes Fenster seinen Schlüssel (`SPEICHER_SCHLUESSEL` aus `store/storage.ts`) speichert –
  jeder der vier Stores nutzt ihn (`nachgeladen(daten)` aus `useRegisterAbgleich` vor
  `setData(daten)` – derselbe Stand wird weder übertragen noch abgeglichen, bis sich das Register
  ändert; nicht zurückschreiben; nicht `ersetzt()`);
  `ProjektBereiche.tsx` Bausteine der Projektlisten („Auch in“, „Projekte aus anderen
  Bereichen“, Archiv, Archivhinweis, Beteiligte). Dazu **„Angemeldet als“ für alle Bereiche**:
  `benutzer.ts` (Name und Farbmodus, Schlüssel `kaplan-benutzer.v1`, `useBenutzer`,
  `benutzerAendern`), `AngemeldetAls.tsx` (Knopf und Dialog in jeder Seitenleiste; eine eigene
  Einstellung eines Bereichs kommt als `zusatz` hinein) und `useBenutzerAbgleich.ts`.
* `src/bereiche/controlling/` – ohne eigenen Bestand: Projekte und Archiv arbeiten auf dem
  Register; die Menüpunkte „Leistungsnachweise“ (`#/controlling/leistungsnachweise/projekte`,
  dazu die Seite je Projekt) und „Auswertung“ (`#/controlling/leistungsnachweise/auswertung`,
  `Route` `{ view: 'auswertung' }` in `lib/router.ts`, Symbol `diagramm`) binden beide
  `LeistungsnachweiseControlling` aus `src/bereiche/leistungsnachweise/controlling.tsx` ein. PIN in
  `domain/pin.ts` (`CONTROLLING_PIN`, Entsperrung je Sitzung im `sessionStorage`); Gestaltung in
  `controlling.css` (Präfix `ct-`). Lässt sich das Register nicht speichern, zeigt `App.tsx` über
  jeder Ansicht „Projektregister nicht gespeichert.“ mit „Erneut speichern“ (gelingt es wieder:
  „Projektregister gespeichert.“, ein verlorener Fokus geht an die Überschrift; ist der Stand
  eines anderen Fensters unlesbar, meldet es das Verwerfen).
* `src/bereiche/leistungsnachweise/` – Schlüssel `leistungsnachweise.data.v1`: `domain/types.ts`
  (Mitarbeiter, Projekt mit Abschnitten, Leistung, Leistungsnachweis, `Periodentext`,
  `Bestaetigung`), `domain/rechte.ts` – die
  Rechte an einer Stelle, je **Zugang** (`'bereich'` | `'controlling'`): Der `StoreProvider` erhält
  den Zugang als Eigenschaft (`index.tsx` ohne, `controlling.tsx` mit `'controlling'`); im Bereich
  erfasst die angemeldete Person nur eigene Leistungen, schreibt am gemeinsamen Leistungstext der
  Zeiträume mit eigenen Leistungen mit und bestätigt ihre Monate (Übersicht mit „Mein Kalender“
  über alle Projekte und „Offene Bestätigungen“, Projektliste ohne Anlegen, Projekt =
  Reiter (`.tabs`, `role="tab"`/`aria-selected`, `pages/ProjektDetail.tsx`) „Leistungstexte“ –
  Vorgabe, `pages/projekt/MonatsErfassung.tsx`: ein Block mit allen Zeiträumen des Monats (Kopf mit
  Stand und Monatswahl, „Meine Stichpunkte“ in festen Spalten Datum | Std. | Stichpunkt,
  `ln-me-punkt-kopf` in `components/erfassung.css`), darunter der Block „Monat bestätigen“ – und
  „Meine Leistungen“ – `pages/projekt/Leistungen.tsx` mit Kalender und Liste; Adressen
  `#/leistungsnachweise/projekt/<id>` (Vorgabemonat, `vorgabeMonat`), `…/<JJJJ-MM>`,
  `…/leistungen`, frühere Reiter → Leistungstexte;
  Kalender: `components/LeistungsKalender.tsx` – kompakt per Container-Abfrage bis 730 px
  Kalenderbreite, dann öffnet ein belegter Tag erst die `TagesListe`; Projektwahl im
  `LeistungDialog` über `projektAuswahl`), alles Übrige (Projekte anlegen und einstellen –
  `projektVerwalten`; Ausnahme: der Excel-Import legt auch im Bereich unbekannte Projekte und
  Abschnitte an, soweit die eigenen Leistungen sie brauchen, `planErlaubt` –,
  Leistungsnachweise samt Leistungstexten und Bemerkung, Abschließen, Aufschläge, Export,
  Auswertung, Sammel-Import) gibt es nur im Controlling – ohne Reiter (`ControllingTab` =
  `'projekte'` | `'auswertung'` in `lib/router.ts`): die Übersicht „Leistungsnachweise je Projekt“
  (`pages/controlling/ProjektListe.tsx`: je Projekt der früheste offene Nachweis, gruppiert nach dem
  Stand bis zum letzten Monatsende aus `abschlussEnden` – „Bereit zum Abschließen – alle haben
  bestätigt“, „Bestätigungen fehlen“ (`fehlendeBestaetigungen`; Namen und Monate erst auf der Seite
  des Projekts), „Noch
  nichts abzuschließen“ –; Spalten Projekt, „Letzter Leistungsnachweis“ – der zuletzt
  abgeschlossene, `zeitraumText`, „abgeschlossen am …“ bzw. „noch keiner“ –, „Offene Stunden“ bis
  Monatsende und „Bestätigung“ mit „x von y bestätigt“; das Raster steht
  nur in den „Einstellungen“ des Projekts; Sammel-Import, Neues Projekt – `ProjektDialog` dient nur
  dem Anlegen), je Projekt
  eine Seite (`Projekt.tsx`, Route `controllingProjekt`; `abrechnung` ist dieselbe Seite mit gewähltem
  Nachweis: Kopf mit rechts drei beschrifteten Knöpfen wie in den anderen Bereichen – zum
  gezeigten Nachweis „Vorschau“ (`NachweisVorschau`: Druckblatt mit „Drucken / PDF“), dann
  „Einstellungen“ (`Modal` „Einstellungen“ mit `ProjektEinstellungen`: Karte „Projekt“ =
  `ProjektDaten` mit allen Angaben samt Raster, darunter Abschnitte und Logos; ein neues Raster
  setzt `updateProjekt` auch an den offenen Nachweisen, abgeschlossene behalten ihres) und zum
  gezeigten Nachweis rot „Nachweis löschen“ (`NachweisLoeschenDialog`, beide aus
  `Abrechnung.tsx`); ein Menü „⋯“,
  „Projekt bearbeiten“ und ein Löschen des Projekts gibt es nicht (mehr) – Projekte löscht das
  Controlling unter „Projekte“; darunter
  `NachweisBearbeitung` aus `Abrechnung.tsx` – ohne Nachweis in der Adresse der früheste offene,
  sonst der gewählte, dann mit „Zum offenen Leistungsnachweis“; sein Kopf (`ln-co-nachweiskopf`)
  ohne Knöpfe: Überschrift, Zeitraum, Raster, abgeschlossen „Abgeschlossen am …“ mit dem Link
  „Wieder öffnen …“; eine Excel-Fassung des Nachweises, „Zeitraum ändern“ und „Aufschläge
  zurücksetzen“ gibt es nicht (mehr), „Neuer Leistungsnachweis“ nur auf der Seite ohne offenen
  Nachweis –, ein offener in drei
  Schritten, `SchrittKopf` in `hilfen.tsx` (ohne erläuternde Untertitel und Bedienhinweise – nur
  Angaben und Meldungen zum Stand; das Raster steht im Kopf des Nachweises, nicht im Projektkopf): 1 „Haben alle eingetragen und bestätigt?“ –
  `MitarbeiterBestaetigungen` in `pages/controlling/BestaetigungsStand.tsx` mit `schritt`: nur
  Mitarbeiter und „Bestätigung je Monat“, ohne Stunden und Summe, gezählt bis zum in
  Schritt 3 gewählten Ende –, 2 „Prüfen – so geht der Leistungsnachweis raus“ – eine Tabelle mit
  Leistungstext (`ZeilenText` in `pages/controlling/Leistungstexte.tsx`: zuerst zum Lesen,
  „✎ Korrigieren“/„Fertig“), Erfasst, Aufschlag je Zeile (`StundenFeld` in `hilfen.tsx`) und
  Abgerechnet, darunter die Bemerkung –, 3 „Abschließen und PDF“ – `AbschliessenSchritt`: Wahl unter
  `abschlussEnden`, fehlen Bestätigungen (`FehlendeBestaetigungen`), nur mit „Trotzdem
  abschließen“, danach Druckdialog und Seite des abgeschlossenen; eine Rückfrage gibt es nicht;
  ganz unten „Frühere Leistungsnachweise“, `FruehereNachweise` in `Projekt.tsx`, mit „PDF“ und
  „Ansehen“) und die Auswertung (`pages/controlling/Auswertung.tsx`). Seiten für alle Nachweise,
  für Mitarbeiter, für die Leistungen aller Mitarbeiter und für die Bestätigungen eines Projekts
  gibt es nicht; frühere Adressen lenkt `lib/router.ts` um (`…/projekt/<id>/<reiter>` auf die
  Seite des Projekts).
  Eine Rolle „Controlling“ an Mitarbeitern gibt es nicht (mehr, Fassung 3). **Eine eigene
  Anmeldung gibt es nicht:** Angemeldet ist der aktive Mitarbeiter, dessen Name dem gemeinsamen
  „Angemeldet als“ entspricht (`mitarbeiterZumNamen`); der Store zieht `einstellungen.mitarbeiterId`
  nach und legt im Bereich bei `ladeZustand` 'ok' eine fehlende Person selbst an
  (`anmeldungAnwenden`, `anmeldeLage`: Vor- und Nachname nötig, kein ausgeschiedener gleichen
  Namens – einen als ausgeschieden markierten setzt er dort wieder aktiv; Kennung aus dem Namen,
  `mitarbeiterKennung`, vor `mutate` gebildet – StrictMode und zwei Fenster erzeugen keine Doppel;
  hat das Controlling die so angelegte Person umbenannt, legt er keine neue an; ein Namenswechsel entfernt sie nur, solange sie keine Leistungen hat und
  noch so ist, wie der Bereich sie angelegt hat – Name und Kürzel unverändert,
  `automatischAngelegtOhneLeistungen`). Im Controlling wird niemand angelegt. Übrige Lagen nennt
  `components/Anmeldung.tsx` (`AnmeldeHinweis` als Leiste, `useMitAnmeldung` als Kurzmeldung
  vor Handlungen) – keinen Dialog. **Gemeinsame Leistungstexte und Monatsbestätigung**
  (`domain/erfassung.ts`, rein): Erfassungsperiode = Periode im Raster des Projekts, auf den
  Kalendermonat gekürzt und an den Grenzen aller Nachweise geteilt (`erfassungsPeriode` in
  `domain/zeitraum.ts`, `erfassungsGliederung`/`erfassungsPeriodeIn` in `domain/nachweis.ts`;
  abgeschlossene Nachweise im Raster ihres Abschlusses, `NachweisStand.erfassungsRaster`);
  gesperrt ist ein Zeitraum, den ein abgeschlossener Nachweis umfasst (`abgeschlossenIm`);
  `monatsStatus` mit Kennung je Zeitraum (`periodenKennung`, inhaltlich ohne IDs, samt
  gemeinsamem Text – ändert ein anderer ihn, erlischt die Bestätigung); Store-Methoden
  `periodentextSetzen`, `monatBestaetigen`, `bestaetigungZuruecknehmen`; nach jedem `mutate`
  `periodentexteNachziehen` (Texte ziehen mit, wenn sich Grenzen der Nachweise ändern),
  `bestaetigungenNachziehen` (gehen bestätigte Teile unverändert in einem Zeitraum auf, gilt die
  Bestätigung weiter – nur, wenn der zusammengeführte Text nichts enthält, was die Person nicht
  bestätigt hat, verglichen nach Sätzen ohne Reihenfolge, `nurBekannteTeile`; eine Teilung lässt
  sie erlöschen – die Rückfragen im Controlling nennen das,
  `grenzFolgen` rechnet wie der Store) und `erfassungBereinigen`. Eine abgerechnete Leistung, deren Datum aus ihrem
  abgeschlossenen Nachweis herausgelegt wurde, gehört zu keinem Zeitraum (`AnderswoAbgerechnet`);
  nach dem Abschluss geänderte abgerechnete erkennt `nachAbschlussGeaendert` (`domain/nachweis.ts`:
  `Leistung.geaendert` nach dem Abschluss – gesetzt von `updateLeistung` und vom Neuimport mit
  anderem Inhalt – und Abweichung vom Stand, `NachweisStand.inhalte`/`abschnittIds`;
  Zurückändern hebt es auf; ordnet das Controlling Abschnitte neu zu, zieht
  `standAbschnitteNachziehen` den Abschnitt im Stand mit). Im Bereich sieht niemand Stichpunkte, Stunden oder Leistungen der
  anderen – auch nicht als Zahl (`stichpunkteDerPeriode`); gemeinsam ist allein der Text; das
  Controlling liest alles. `domain/nachweis.ts`
  Zeilen (Text ohne Bearbeitung von Hand aus den gemeinsamen Texten, `gemeinsamerZeilentext`,
  `textGemeinsam`; sonst `automatikText`), Zeiträume, Ergänzen, Aufschläge, Abschluss (Nachweise eines Projekts überschneiden sich
  nie; welche Leistungen ein Nachweis zeigt, ergibt sich aus dem Datum – außer nachgereichten
  Leistungen, die ein späterer Nachweis nach Rückfrage übernommen hat (`nachgereicht`, eigene
  Zeile mit `NACHGEREICHT_PRAEFIX`), und Leistungen im Stand eines anderen abgeschlossenen
  Nachweises (`abgerechnetIn` – abgerechnet bleibt abgerechnet); deshalb
  immer `leistungenDesNachweises` bzw. `nachweisDerLeistung` statt Datumsvergleichen – beide
  lesen aus einem `WeakMap`-Verzeichnis je Nachweisliste, Nachweislisten also nie an Ort und
  Stelle ändern; abgerechnet
  ist, was im Stand abgeschlossener Nachweise steht, `abgerechneteLeistungen`; einen Rhythmus gibt
  es nicht (mehr, Fassung 9): ein offener Nachweis ohne festgelegtes Ende (`laeuftBisAbschluss(n)`;
  `bisFest` setzte früher „Zeitraum ändern“ – den Dialog gibt es nicht mehr, ältere Stände behalten
  es) wächst in `nachweiseErgaenzen` bis zum Monatsende neuer
  Leistungen mit, sonst entsteht ein neuer ab dem Monatsanfang; den Umfang legt erst das
  **Abschließen** fest – statt eines freien Datums jedes Monatsende, dazu heute bzw. das bisherige
  Ende vor heute (`abschlussEnden`, Vorschlag `abschlussVorschlag`: das letzte Monatsende), erlaubt
  ab dem Beginn bis heute, höchstens bis zum bisherigen Ende
  (`abschlussEndeBereich`/`abschlussEndeGueltig`), `abschlussZeitraum(…, bis?)`,
  `nachweisAbschliessenAnwenden(…, bis?)`, Store `nachweisAbschliessen(id, bis?)`; spätere
  Leistungen kommen in einen neuen offenen Nachweis; ohne Abschluss läuft der offene einfach
  weiter – eine Fälligkeit gibt es nicht (mehr; `vorgabeEnde`, `nachweisFaellig`, `offenSeit`
  entfallen); Aufschläge nur je Zeile und Abschnitt (`aufschlaege`) – einen Gesamtaufschlag gibt
  es nicht (mehr, Fassung 10: `migriere()` rechnet ihn mit `gesamtAufschlaegeUmrechnen` in
  `domain/migrationGesamtaufschlag.ts` in Aufschläge je Zeile bzw. Abschnitt um, die
  abgerechneten Stunden bleiben gleich); „Neuer Leistungsnachweis“ fragt keinen Zeitraum ab, sondern
  fasst alle nicht abgerechneten Leistungen und offenen Nachweise zusammen,
  `nichtAbgerechnet`/`nachweisFuerNichtAbgerechneteAnwenden`),
  `domain/import.ts`
  Excel-Import, `domain/druck.ts` PDF des Nachweises, `domain/export.ts` Excel nur für Auswertung,
  Leistungslisten und Importvorlage, `lib/router.ts` baut auch die
  Adressen des Controllings (`CONTROLLING_PREFIX`) und nimmt nur Adressen dieser beiden Präfixe an;
  frühere Adressen `#/leistungsnachweise/controlling/…` lenkt `App.tsx` um. Ohne eigenen Bestand
  gibt es Demodaten nur bei leerem Projektregister (`ladeDaten`), sonst beginnt der Bereich leer. Kennungen, die erst in einer Änderung
  anfallen, liefert `idVorrat` (StrictMode). Neue Felder über `DATEN_VERSION` (derzeit 10:
  Gesamtaufschlag in Aufschläge je Zeile umgerechnet – `gesamtAufschlaegeLesen` in
  `store/storage.ts` vor `aufbereiten`, `gesamtAufschlaegeUmrechnen` danach; 9: ohne
  Rhythmus – `vonFassung8` führt mit `laufendeZusammenfuehren` aufeinanderfolgende offene Nachweise
  ohne `bisFest` zusammen –, `gesamtAufschlag`; 7: `periodentexte`, `bestaetigungen`) und
  `migriere()`.
* `src/bereiche/<bereich>/` – in sich geschlossene Bereiche mit eigenem Store, eigenem
  `localStorage`-Schlüssel, eigenen Einstellungen und eigenem Router.
* `src/shared/` – fachfreie Bausteine (UI, Icons, Datumsrechnung, Excel lesen/schreiben, Druck,
  PWA, `global.css` mit den Design-Tokens). Aufklappmenüs an Knöpfen immer über `AufklappMenue`
  (`menue.tsx`: Portal, bleibt im Fenster, Tastatur; eigene Menüs werden von `.card`/`.table-scroll`
  abgeschnitten); `tabellen.ts` (`tabellenBreiteBeobachten`, in `main.tsx`) lässt überbreite
  Tabellen quer scrollen (`table-scroll-quer`); `scrollen.ts` (`useNachObenBeiSeitenwechsel`)
  hängt am `.content` jedes Bereichs; `seitenleiste.ts` (`useSeitenleiste`) hält in jeder
  `App.tsx` die aufklappbare Seitenleiste und schließt sie bei jedem Seitenwechsel (`hashchange`). Dialoge immer über `Modal` (`ui.tsx`: Fokus beim Öffnen,
  Tab bleibt im Dialog, Escape schließt nur den obersten, Fokus zurück an den Öffner; wo ein Klick
  daneben nicht schließen soll, `klickDanebenSchliesst={false}`, kein eigenes Overlay); Elemente,
  die nur auf Klicks hören (Ablageflächen `.drop-zone`), mit `alsKnopf` tastaturbedienbar machen.
  `speicher.ts` verwaltet Rohkopien im `localStorage` (`rohkopieVorEinspielen`,
  `nachRaeumenSpeichern`). `main.tsx` importiert `global.css` vor der Shell, damit
  Bereichsregeln gleicher Spezifität gewinnen – Reihenfolge nicht umdrehen.
* `src/bereiche/planlauf/`:
  * `domain/types.ts` Datenmodell (flache Listen in `AppData`, Verweise über IDs – außer: Schritte
    nennen ihre Funktion per `roleName`, Gewerke sind Namen; Umbenennungen müssen diese Stellen
    mitziehen),
  * `domain/ablauf.ts` Ablaufverfolgung – **die einzige Stelle, die Ziele auflöst**
    (`nachfolger`, `verfolgen`); Planlauf, Editor, Terminrechnung und Simulation folgen ihr.
    Blockregeln: Schritte bleiben eine flache Liste; ein paralleler Block ist nur der Marker
    `parallel: { block, zweig }`, seine Schritte stehen zusammenhängend und nach `zweig` sortiert
    (`bloeckeOrdnen` stellt das her), Blöcke werden nicht geschachtelt. Ein Ziel im Zweig führt im
    Zweig weiter, außerhalb des Blocks ist es ein Ausstieg, in einem anderen Zweig unzulässig; ein
    Ziel auf einen Blockschritt betritt den ganzen Block,
  * `domain/engine.ts` Soll-Termine ab dem tatsächlichen Eingang (`recalcSollDaten`),
    Rücksprung mit Historie, Ampel, Verzug, gewichteter Fortschritt, To-Dos, Zuständigkeiten,
  * `domain/abschluss.ts` Statuswechsel (`schrittStatusSetzen`), Wieder öffnen, Einfügen,
  * `domain/simulation.ts` Prognose, Basisplan und Rückwärtsrechnung – erledigt die Schritte mit
    `schrittStatusSetzen` und rechnet mit `recalcSollDaten`, also ohne eigene Regeln,
  * `domain/nachweis.ts` Terminnachweis (Verzug gegenüber dem Basisplan je Seite),
  * `domain/protokoll.ts` Änderungsprotokoll: `protokollNachziehen` vergleicht in jedem `mutate()`
    alten und neuen Stand und schreibt je Lauf, was jemand getan hat (nichts Berechnetes),
  * `domain/bestand.ts` Ablauf von `mutate()` (`bestandAendern`), Löschen mit Löschvermerk,
    Sammelaktionen als reine Funktionen,
  * `domain/abgleich.ts` selektiver Abgleich mit einer Sicherung; Verweise zwischen Objekten
    stehen zentral in `VERWEISFELDER`,
  * `domain/terminrechner.ts` Terminrechner über `simulieren`/`rueckwaerts`,
  * `domain/seed.ts` mitgelieferte Funktionen, Standard-Workflows, E-Mail-Vorlagen, Demodaten
    (Läufe über die Engine, zufällige IDs),
  * `store/store.tsx` alle Schreibzugriffe, `store/storage.ts` Laden, Speichern, Migration,
  * `lib/router.ts` Hash-Router, `pages/` Ansichten, `components/` fachliche Bausteine.
* `src/bereiche/baubetrieb/` – gleich aufgebaut: `domain/workflow.ts` Standard-Workflows je Phase
  und Nachschlagen von Status (Anmeldungen verweisen per `statusId` auf einen Status; die
  Workflows liegen im Bestand und sind bearbeitbar), `domain/workflowPflege.ts` Speichern,
  Duplizieren, Löschen von Workflows, `domain/fristen.ts` Fahrplanjahr, Terminfrist, Ampel,
  Anmeldebedarf, `domain/ablauf.ts` Statuswechsel samt Übernahme/Aufteilung und `sachstand`
  (jüngster Verlaufseintrag oder `geaendertAm`, das nur `updateAnmeldung`/`terminSetzen` setzen,
  und nur bei tatsächlicher Änderung;
  angezeigt in den Anmeldungstabellen des Projekts, `SachstandKompakt`),
  `domain/bbpImport.ts` Import aus BBPNeo (nur KM und KKM; Spalten über ihre Überschriften
  „Anmeldung::…“, je Anmelde-ID eine Anmeldung mit frühestem Beginn und spätestem Ende,
  Statuszuordnung in `Einstellungen.bbpStatus`, Projekte über die DB-G-Nummer; einen anderen
  Status setzt `statusUebernehmen` in `domain/ablauf.ts` ohne Nachfolger-Prüfung, mit Vorstand
  zum Zurücknehmen; Seite `pages/BbpImport.tsx`, Route `import`, Menüpunkt zwischen „Projekte“ und
  „Einstellungen“),
  `store/` mit eigenem Schlüssel `baubetrieb-planung.data.v1`. Workflows und Fristen stehen in der
  Seitenleiste unter der aufklappbaren Gruppe „Einstellungen“ (wie im Planlaufmanagement);
  „Status ändern“ ist `NachfolgerAuswahl` (Haken in `components/baubetrieb.css`, Präfix
  `bb-`; das Menü ist `AufklappMenue` aus `src/shared/menue.tsx`). Neue Felder dort über `DATEN_VERSION`
  (`baubetrieb/domain/types.ts`) und `migriere()` (`baubetrieb/store/storage.ts`). Die festen IDs
  der Standard-Status nicht ändern – `STATUS_AUS_NUMMER` ordnet ihnen ältere Stände zu.
* `src/bereiche/projektsteuerung/` – gleich aufgebaut, Schlüssel `projektsteuerung.data.v1`:
  `domain/types.ts` Datenmodell (projektübergreifende `Funktion`, `Beteiligter` mit `funktionId`,
  `Protokoll`), `domain/protokoll.ts` Reihen, Folgeprotokoll, Übernahme aus dem Protokoll-Tool und
  `teilnehmerNachziehen` (läuft nach jedem `mutate()` und hält Teilnehmende auf dem Stand der
  Projektbeteiligtenliste), `domain/beteiligteImport.ts` Excel-Import, `domain/punkte.ts` offene
  Aufgaben und Ampel, `domain/druck.ts` Druckfassungen. Eine Liste offener Punkte (LOP) gibt es
  nicht mehr; ältere Bestände verlieren sie beim Laden. Funktionen tragen ein Gewerk (`null` =
  übergreifend); angezeigt wird stets `funktionsName`. Ein Eintrag besteht aus `zeilen`; jede
  Zeile merkt sich ihr Ursprungsprotokoll (`herkunft`, im Druck „aus Prot. 1“). Eine Ergänzung mit
  eigener Art (`Zeile.typ` ≠ `null`) ist ein eigener Punkt unter dem Eintrag mit eigenem `wer`,
  `termin` und `status`; ohne Art läuft sie unter dem Ursprung mit. TOPs, Einträge und Zeilen
  werden standardmäßig gestrichen statt gelöscht (`entfaellt`) und entfallen im Folgeprotokoll;
  erledigte Aufgaben gehen noch einmal mit. Was ins Folgeprotokoll geht, entscheidet allein
  `uebernahme` mit `eintragUebernehmen` (`domain/protokoll.ts`). Die Übersicht zeigt nur eigene
  To-Dos – Aufgaben der Person unter „Angemeldet als“ (`eigeneTodos`, `domain/punkte.ts`). Logos im
  Druckkopf führt jede Protokollreihe selbst oder erbt die des Projekts (`reihenLogos`,
  `logosFuer`). Eigene
  Gestaltung in `projektsteuerung.css` (Klassen mit Präfix `ps-`, nur Design-Tokens). Neue Felder
  über `DATEN_VERSION` (`projektsteuerung/domain/types.ts`) und `migriere()`
  (`projektsteuerung/store/storage.ts`). IDs, die die Oberfläche braucht (Fokus, Navigation),
  vor `mutate()` erzeugen – im StrictMode läuft die Änderungsfunktion doppelt.

## Randbedingungen

* `src/shared/` enthält nur Bausteine ohne fachlichen Bezug und importiert nichts aus
  `src/bereiche/`. Die Bereiche greifen nicht aufeinander zu; gemeinsam nutzen sie nur
  `src/gemeinsam/` (importiert nichts aus `src/bereiche/`). Einzige Ausnahme: Das Controlling
  bindet das Controlling eines Bereichs über dessen Einstiegsmodul `controlling.tsx` ein (heute nur
  die Leistungsnachweise) – nichts sonst aus dem Bereich.
* **Angemeldet als** gilt für alle Bereiche: Name und Farbmodus ändert nur `benutzerAendern`
  (`src/gemeinsam/benutzer.ts`); die Bereiche führen sie in ihrem Bestand nur als Spiegel
  (`bearbeiter` bzw. `einstellungen`) und ziehen sie mit `useBenutzerAbgleich` nach. Keine eigenen
  Dialoge „Angemeldet als“ in den Bereichen – `AngemeldetAls` verwenden.
* **Projektregister:** Ein Bereich schreibt seinen eigenen Bestand nur über sein `mutate()` –
  auch, was aus dem Register kommt (`registerPlanAnwenden` in `domain/register.ts`, reine
  Funktion, liefert ohne Änderung denselben Bestand zurück, damit der Abgleich zur Ruhe kommt).
  Das Register ändert nur `registerAendern` (außerhalb von React-Updates). Archivstand und
  Zugehörigkeit stehen allein im Register, nicht im Bestand der Bereiche. `ersetzeDaten` und
  `zuruecksetzen` melden vorher `ersetzt()` – ein eingespielter Stand wird nicht übertragen.
  Einen aus einem anderen Fenster nachgeladenen Stand melden die Stores dagegen mit
  `nachgeladen()`, nicht mit `ersetzt()`: Bestand und Register kommen dort als zwei getrennte
  `storage`-Ereignisse an, ein Abgleich dazwischen nähme die Änderungen des anderen Fensters
  zurück. Im Store steht der Abgleich-Effekt nach dem Speicher-Effekt.
  `sichtFuerRegister` lässt weg, was nicht geteilt wird (im Planlaufmanagement der eigene Kontakt
  und die Funktion Planlaufmanagement); `funktionenPassen` sagt, wann die Funktionen einer Person
  so nah am Register sind, wie der Bereich sie abbilden kann (Projektsteuerung: eine Funktion je
  Person; Planlaufmanagement: eine Funktion hat genau eine Person). Neue Registerfelder in
  `aufbereiten()` (`register.ts`) nachtragen und `REGISTER_VERSION` erhöhen.
* **Schreibzugriffe nur über den Store.** Jede Änderung läuft über `mutate()` in
  `store/store.tsx`, das `bestandAendern` (`domain/bestand.ts`) aufruft: danach werden
  automatisch `eigeneKontakteSichern`, `zustaendigkeitenNachziehen` und `recalcRun` für alle
  Läufe ausgeführt, `protokollNachziehen` schreibt das Änderungsprotokoll und `geaendertAm` wird an
  geänderten Projekten, Einträgen, Kontakten, Funktionen und Workflows gesetzt (beides entfällt
  mit `mutate(fn, { protokoll: false })`). `fn` erhält `{ zeitpunkt, heute, bearbeiter }`. Neue
  Aktionen als Methode im `StoreValue` ergänzen, nicht an `mutate` vorbei, und möglichst in einem
  einzigen `mutate`. IDs mit `newId(prefix)`.
* Status und Ist eines Schritts nur über `domain/abschluss.ts` ändern (`schrittStatusSetzen`,
  `wiederOeffnen`, `aenderungenAufLauf`) – dort entstehen Historie, Rücksprung und die
  Momentaufnahme der Person. Der feste Eingang `eingangIst` wird beim Anstehen festgeschrieben und
  danach von der Fristenrechnung nicht mehr geändert, nur noch ausdrücklich.
* Wer löscht, hinterlässt einen Löschvermerk in `AppData.geloescht` (`loeschvermerk` bzw. die
  Löschfunktionen in `domain/bestand.ts`) – der Abgleich braucht ihn. Neue Verweisfelder in `VERWEISFELDER`
  (`domain/abgleich.ts`) eintragen.
* Gespeichert wird – in allen vier Bereichen – nur bei `ladeZustand === 'ok'`, und nur dann gleicht
  der Store mit dem Register ab: Nach einem Ladefehler oder bei einem Stand aus einer neueren
  Fassung zeigt der Bereich Demodaten (mit Hinweisleiste) und lässt den gespeicherten Stand
  unberührt. Vor jeder Umstellung legt `ladeDaten` eine Rohkopie `<Schlüssel>.vor-fassung-<n>` an.
  Im Planlaufmanagement, in der Baubetriebsplanung und in der Projektsteuerung (nicht in den
  Leistungsnachweisen) entsteht vor dem Einspielen einer Sicherung über einen unlesbaren Stand mit
  `rohkopieVorEinspielen` eine `<Schlüssel>.vor-einspielen-<Zeitpunkt>`, und „Gespeicherten Stand
  herunterladen“ im Dialog liefert dann den Rohtext statt der Demodaten. `speichereDaten` liefert `SpeicherZustand` und räumt bei vollem
  Speicher über `nachRaeumenSpeichern` (`src/shared/speicher.ts`) nach Bedarf diese Kopien – auch
  die anderer Bereiche; das Register räumt ebenso und meldet sein Ergebnis über
  `useRegisterSpeicherZustand` (Hinweis im Controlling).
* Der localStorage-Schlüssel `planlauf-management.data.v1` bleibt unverändert. Neue Felder am
  Datenmodell sind optional oder werden in `migriere()` (`store/storage.ts`) nachgetragen – dann
  **`DATEN_VERSION`** (`domain/types.ts`) erhöhen: `migriere()` läuft nur, wenn die gespeicherte
  Fassung abweicht, und hebt jeden älteren Stand in einem Schritt auf die aktuelle.
* Mitgelieferte Stammdaten geändert (`STANDARD_ROLLEN`, `STANDARD_TEMPLATES` in `seed.ts`)?
  **`STAMMDATEN_VERSION`** erhöhen, damit vorhandene Bestände sie übernehmen
  (`stammdatenAktualisieren`). Achtung: Das ersetzt alle Standard-Workflows samt Änderungen der
  Nutzer, überschreibt Funktionen gleichen Namens und Gewerks und stellt gelöschte mitgelieferte
  Funktionen (auch in Projekten) wieder her.
* `window.planlaufGestartet` nicht umbenennen – `index.html` und `app/index.html` rufen ihn auf.
* Ob ein Eintrag einen eigenen Planlauf hat, entscheidet allein `hatEigenenPlanlauf`
  (`domain/types.ts`): Planverzeichnisse laufen gebündelt oder mit Plänen einzeln, Pläne lassen
  sich herauslösen und wieder bündeln.
* Neue Route: Typ `Route` sowie `routeToHash`/`hashToRoute` in `lib/router.ts` erweitern und in
  `App.tsx` rendern. Frühere Adressen bleiben per Umleitung gültig.
* Keine neuen Laufzeitabhängigkeiten ohne Rückfrage – Router, Excel-Import/-Export, PDF-Druck und
  Icons sind bewusst selbst geschrieben; Laufzeitabhängigkeiten sind nur `react`/`react-dom`.
* Gestaltung über die Design-Tokens in `src/shared/global.css`; die Oberfläche bleibt bis etwa
  400 px Breite bedienbar, der Farbmodus `kontrast` muss weiter funktionieren.
* Sprache in Oberfläche, Bezeichnern, Kommentaren und Commit-Nachrichten ist Deutsch.

## Hinweise für Prüfungen im Browser

* Die anstehenden Schritte eines Laufs folgen dem Verlauf (`aktuelleSchritte`, `verfolgen` in
  `domain/ablauf.ts`), nicht der Reihenfolge im Array – in parallelen Zweigen stehen mehrere an.
  Wer Testdaten vorbereitet, muss den Schritt auf dem Pfad ändern. Die Demodaten haben zufällige
  IDs.
* Nach dem Schreiben in den `localStorage` die Seite neu laden (`reload`) – ein Wechsel nur im
  Hash lädt nicht neu, und der laufende Store überschreibt die Änderung.
* Hilfsserver über ihre Prozessnummer beenden, nicht mit `pkill -f "<Befehl>"`: Das Muster trifft
  auch die eigene Shell, deren Befehlszeile denselben Text enthält.
* Das Projektregister füllt sich erst, wenn ein Bereich geöffnet wird; was das Controlling ändert,
  vollzieht ein Bereich beim nächsten Öffnen. PIN des Controllings: `0000`. Wer den
  `localStorage` leert, leert auch `kaplan-projektregister.v1`.
* Leistungsnachweise: Wer unter „Angemeldet als“ „Anna Becker“ einträgt, ist in den Demodaten
  Mitarbeiterin (ebenso Jonas Keller, Miriam Vogt und Tobias Brandt); bei der Brücke
  (monatsscharf) steht im Vormonat ein gemeinsamer Text, den Anna Becker bestätigt hat. Ein
  anderer Name mit Vor- und Nachnamen – auch die Vorgabe „Max Mustermann“ – wird beim Öffnen des
  Bereichs automatisch als Mitarbeiter angelegt (im Controlling nicht); ein Name aus nur einem
  Wort zeigt den Hinweis, Vor- und Nachnamen einzutragen. Wer zwei Personen gegeneinander
  prüft (gemeinsamer Text, erlöschende Bestätigung), wechselt den Namen unter „Angemeldet als“.
  Demodaten gibt es nur, solange das Projektregister leer ist – nach dem Leeren des
  `localStorage` also zuerst `#/leistungsnachweise` öffnen, sonst beginnt der Bereich leer.
  Leistungsnachweise abschließen, Aufschläge und Raster prüft man im Controlling
  (`#/controlling/leistungsnachweise/projekte`). Die offenen Demo-Nachweise enthalten Leistungen
  aus vergangenen Monaten; die Brücke (K9101) steht unter „Bestätigungen fehlen“ und wird „bereit“,
  wenn zusätzlich „Jonas Keller“ (unter „Angemeldet als“) im Bereich seinen Vormonat bestätigt.
  Abgeschlossen wird auf der Seite eines Projekts in Schritt 3 „Abschließen und PDF“ mit einem
  Monatsende bzw. „bis heute“ (Vorschlag Ende des Vormonats; spätere Leistungen laufen in einem
  neuen offenen Nachweis weiter; danach öffnet sich der Druckdialog); Aufschläge je Zeile prüft
  man in Schritt 2.
* Projektsteuerung: Wer „Lena Roth“ einträgt, sieht die Demo-Aufgaben als eigene To-Dos; mit
  einem anderen Namen zeigt die Übersicht keine.
* „Angemeldet als“ liegt unter `kaplan-benutzer.v1` – wer es zurücksetzen will, löscht diesen
  Schlüssel.
