# KaPlan – Hinweise für die Arbeit am Code

KaPlan ist eine React-19-/TypeScript-/Vite-Anwendung **ohne Server**; alle Daten liegen im
`localStorage` des Browsers. Installierbar als PWA, veröffentlicht über GitHub Pages. Sie besteht
aus drei getrennten Bereichen: **Planlaufmanagement** (`src/bereiche/planlauf/`),
**Baubetriebsplanung** (`src/bereiche/baubetrieb/`, erster Entwurf) und **Projektsteuerung**
(`src/bereiche/projektsteuerung/`, erster Entwurf). Projekte und Projektbeteiligte teilen sie sich
über das gemeinsame **Projektregister** (`src/gemeinsam/`). Die früheren Bereiche
Leistungsnachweise und Controlling (mit PIN) sind entfernt; ihr Stand liegt im Branch
`backup/2026-11-12-mit-leistungsnachweisen-und-controlling`. Überblick über Aufbau und
Funktionen: `README.md`; belegtes Inventar aller Routen, Aktionen und Meldungen: `docs/INVENTAR.md`;
Optimierungspotenzial aus dem Vergleich der drei Bereiche: `docs/OPTIMIERUNG.md`.

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
  (`#/planlauf/…`, `#/baubetrieb/…`, `#/projektsteuerung/…`) bestimmt den Bereich; Adressen der
  entfernten Bereiche (`#/leistungsnachweise/…`, `#/controlling/…`) lenkt `umgelenkterHash`
  (`src/shell/router.ts`, `ENTFERNTE_BEREICHE`) auf die Bereichsauswahl `#/`. Ein neuer Bereich
  braucht einen Eintrag in `BereichId`/`BEREICHE`
  (`src/shell/bereiche.ts`) und in `src/shell/Shell.tsx`; führt er Projekte, zusätzlich einen in
  `ProjektBereich`/`PROJEKT_BEREICHE` (`src/gemeinsam/register.ts`), ein `domain/register.ts`,
  `useRegisterAbgleich` im Store und `RegisterHinweis` in seiner `App.tsx`. Die Startseite zeigt
  die Kacheln dreispaltig, unter 720 px untereinander (`.start-kacheln` in `src/shared/global.css`).
  Den **Farbmodus** setzt allein `src/shell/Shell.tsx` – aus `useBenutzer()` in einem
  Layout-Effekt, also vor dem ersten Zeichnen (`document.documentElement.dataset.farbmodus`; auf
  der Bereichsauswahl stets `standard`).
* `src/gemeinsam/` – das **Projektregister**, der einzige Bestand, den sich die Bereiche teilen
  (Schlüssel `kaplan-projektregister.v1`): Projekte (Nummer, Bezeichnung, Beschreibung), ihre
  Zugehörigkeit je Bereich mit lokaler Kennung und Archivstand (`Mitgliedschaft`, `offen` =
  Übernahme steht aus) und die Projektbeteiligten mit Kontaktdaten und Funktionen (über
  Bezeichnung + Gewerk erkannt, `funktionsSchluessel`). Archiviert ist ein Projekt nur je Bereich
  (`istArchiviert`); die ★-Markierung der Bereiche steht nicht im Register. Die anderen Bereiche
  einer Projektansicht liefert `andereBereicheVon(bereich)`.
  `register.ts` Modell, Laden/Speichern (`REGISTER_VERSION` 3: `aufbereiten()` stellt ältere
  Stände um – Mitgliedschaften und Kennungen der Leistungsnachweise, ★-Spiegel und `herkunft`
  entfallen, das frühere Archiv für alle Bereiche wird Archivstand je Bereich, Projekte, die kein
  Bereich mehr führt, entfallen samt Personen; vorher entsteht die Rohkopie
  `kaplan-projektregister.v1.vor-fassung-<n>`),
  `registerAendern`/`useRegister` (ob das letzte Speichern gelang: `useRegisterSpeicherZustand`;
  ein ungespeicherter Stand wird bei jedem weiteren `registerAendern` erneut geschrieben,
  `registerErneutSpeichern`; speichert ein anderes Fenster, trägt der `storage`-Hörer ihn auf
  dessen Stand nach und speichert erneut, `eigeneAenderungenNachziehen` – neue Registerfelder
  gehen dort ohne Weiteres mit, sie werden je Feld zusammengeführt; neu Eingetragenes wird nicht
  nachgezogen, was ein Bereich eingetragen hat, trägt sein Abgleich wieder ein;
  Löschvermerke ergänzt sie um Übernahmen der anderen Seite; zogen zwei Fenster zugleich nach,
  erkennt das überschriebene es an `nachgezogenAuf` und zieht noch einmal nach); `abgleich.ts` reine Funktionen: `uebertragen` (Änderungen
  des Bereichs → Register, alter gegen neuer Stand), `abgleichen` (Unbekanntes eintragen, `Plan`
  für den Bereich; Mitgliedschaften lösen nur bei `vollstaendig`
  – erster Abgleich nach dem Laden bzw. nach `ersetzt()` –, sonst kämen mehrere Fenster nicht zur
  Ruhe; führt kein Bereich ein Projekt mehr, entfällt es im Register, `mitgliedschaftLoesen`;
  Stammdaten gleicher Nummer
  führt `stammdatenZusammenfuehren` zusammen – das Register gilt, Abweichungen des Bereichs stehen
  als Vermerk in der Beschreibung) und die beiden Aktionen unmittelbar auf dem Register,
  `inBereichUebernehmen` („Übernehmen in …“) und `bereichArchivieren` (Archiv je Bereich, über die
  Kennung im Bereich); `useRegisterAbgleich.ts`
  bindet einen Store an; `useFremdeAenderung.ts` lädt den Bestand eines Stores nach, wenn ein
  anderes Fenster seinen Schlüssel (`SPEICHER_SCHLUESSEL` aus `store/storage.ts`) speichert –
  jeder der drei Stores nutzt ihn (`nachgeladen(daten)` aus `useRegisterAbgleich` vor
  `setData(daten)` – derselbe Stand wird weder übertragen noch abgeglichen, bis sich das Register
  ändert; nicht zurückschreiben; nicht `ersetzt()`);
  `ProjektBereiche.tsx` Bausteine der Projektlisten und Projekte („Auch in“, „Projekte aus anderen
  Bereichen“ mit „Übernehmen in …“ – ohne Projekte, die in allen ihren Bereichen archiviert sind,
  `FremdeProjekte`; die Projektlisten zeigen den Abschnitt nur bei `ladeZustand === 'ok'`, sonst
  sähe das Register eine Übernahme vor, die der Bereich nicht anlegt –, `ArchivAbschnitt`,
  `VerknuepfungsHinweis` (nennt ein überall archiviertes Projekt „(dort archiviert)“),
  `useLoeschHinweis`, Beteiligte)
  und das **Archiv in den Bereichen**: `ArchivKnopf` („Archivieren“ mit Kurzmeldung, ohne
  Rückfrage – im Planlaufmanagement in `pages/projekt/Einstellungen.tsx`, Karte „Projekt
  archivieren“, in Baubetriebsplanung und Projektsteuerung in `pages/ProjektDetail.tsx` im
  Projektkopf zwischen „Bearbeiten“ und „Löschen“; wer den Knopf einrahmt, fragt mit
  `useArchivierbar`, ob er etwas zeigt – nicht bei einem archivierten oder dem Register
  unbekannten Projekt) und `ArchivHinweis` oben im archivierten
  Projekt mit „Aus dem Archiv holen“; archivierte Projekte fehlen in Übersicht und Seitenleiste
  (`useArchivierte`) und in den bereichsweiten Fristenlisten (`pages/Fristen.tsx` im
  Planlaufmanagement, `pages/Termine.tsx` samt Zähler der Seitenleiste in der
  Baubetriebsplanung), im Projekt selbst bleiben die Fristen sichtbar;
  `RegisterHinweis.tsx` steht in der `App.tsx` jedes Bereichs
  über dem Inhalt: „Das Projektregister ließ sich nicht lesen.“ bzw. „… stammt aus einer neueren
  Fassung von KaPlan.“ (mit „Seite neu laden“) und „Projektregister nicht gespeichert.“ mit
  „Erneut speichern“ (gelingt es wieder: „Projektregister gespeichert.“, ein verlorener Fokus geht
  an die Stelle des Hinweises, `.gem-registeranker`; ist der Stand eines anderen Fensters
  unlesbar, meldet er das Verwerfen). Dazu **„Angemeldet als“ für alle Bereiche**:
  `benutzer.ts` (Name und Farbmodus, Schlüssel `kaplan-benutzer.v1`, `useBenutzer`,
  `benutzerAendern`), `AngemeldetAls.tsx` (Knopf und Dialog in jeder Seitenleiste; eine eigene
  Einstellung eines Bereichs kommt als `zusatz` hinein) und `useBenutzerAbgleich.ts`.
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
  Bereichsregeln gleicher Spezifität gewinnen – Reihenfolge nicht umdrehen. Der Ampelpunkt `.dot`
  ist `inline-block` (hat auch in einer Tabellenzelle eine Größe), der Dialogfuß `.modal-footer`
  bricht um – beides in `global.css`, nicht je Bereich per Inline-Style nachbessern.
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
  * `domain/mailRegeln.ts` E-Mail-Regeln der Workflows (`MailRegel` in `types.ts`): Regeln stehen
    am Schritt (`mails`, „anstehen“ bzw. „abschluss“) und – für verschiedene E-Mails je Ausgang
    einer Entscheidung – an der Antwort (`Antwort.mails`), nicht als Verweis auf eine Antwort-ID
    (Antwort-IDs werden beim Kopieren von Schritten neu vergeben). `mailVorschlaege` wertet sie
    nach einem Abschluss aus (Dialog „E-Mail senden“, `components/NeuZustaendig.tsx`; die gewählte
    Antwort steht im `MailEreignis`, weil ein Rücksprung den Schritt sofort zurücksetzt);
    `uebergabeRegeln` ist die Vorbelegung der mitgelieferten Workflows und der Umstellung auf
    Fassung 15 – mit Kennungen aus denen der Schritte, damit Bestand und Sicherung gleich
    ausfallen; `mailRegelnUebernehmen` trägt geänderte Regeln in laufende Planläufe nach. Ohne
    Regel wird keine E-Mail vorgeschlagen,
  * `domain/seed.ts` mitgelieferte Funktionen, Standard-Workflows, E-Mail-Vorlagen, Demodaten
    (Läufe über die Engine, zufällige IDs),
  * `store/store.tsx` alle Schreibzugriffe, `store/storage.ts` Laden, Speichern, Migration,
  * `lib/router.ts` Hash-Router, `pages/` Ansichten, `components/` fachliche Bausteine.
* `src/bereiche/baubetrieb/` – gleich aufgebaut: `domain/workflow.ts` Standard-Workflows je Phase
  und Nachschlagen von Status (Anmeldungen verweisen per `statusId` auf einen Status; die
  Workflows liegen im Bestand und sind bearbeitbar), `domain/workflowPflege.ts` Speichern,
  Duplizieren, Löschen von Workflows, `domain/workflowGraph.ts` Standardverlauf (erster Nachfolger
  bis „Genehmigt“, Übernahme, Löschen oder Schleife), Abweichungen, Prüfung und Bearbeitungen (eine
  Entscheidung – `WorkflowStatus.entscheidung` mit Frage und Antwort je Nachfolger – führen alle
  Bearbeitungen mit; Antworten nie als eigene Liste neben `nachfolger` halten) für den
  grafischen Workflow-Editor `components/WorkflowEditor.tsx` (Optik und Bedienung wie im
  Planlaufmanagement, aber eigener Code mit Präfix `bb-wf-` in `components/workflowEditor.css`; die
  Liste zeigt den Standardverlauf mit `components/AblaufVorschau.tsx`), `domain/fristen.ts` Fahrplanjahr, Terminfrist, Ampel,
  Anmeldebedarf (ob ein Termin zum Nachhaken dient, sagt allein `dientZumNachhaken` in
  `domain/workflow.ts` – gekennzeichnete Status und stets die mit einem Nachhak-Termin als
  Terminfrist; nicht `status.nachhaken` unmittelbar lesen), `domain/ablauf.ts` Statuswechsel samt Übernahme/Aufteilung und `sachstand`
  (jüngster Verlaufseintrag oder `geaendertAm`, das nur `updateAnmeldung`/`terminSetzen` setzen,
  und nur bei tatsächlicher Änderung;
  angezeigt in den Anmeldungstabellen des Projekts, `SachstandKompakt`),
  `domain/bbpImport.ts` Import aus BBPNeo (nur KM und KKM; Spalten über ihre Überschriften
  „Anmeldung::…“, je Anmelde-ID eine Anmeldung mit frühestem Beginn und spätestem Ende,
  Statuszuordnung in `Einstellungen.bbpStatus`, Projekte über die DB-G-Nummer – Anmeldungen, die
  eine Projektnummer verbindet, bilden eine Projektgruppe, `projektGruppen`; einen anderen
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
  `src/gemeinsam/` (importiert nichts aus `src/bereiche/`).
* **Angemeldet als** gilt für alle Bereiche: Name und Farbmodus ändert nur `benutzerAendern`
  (`src/gemeinsam/benutzer.ts`); die Bereiche führen sie in ihrem Bestand nur als Spiegel
  (`bearbeiter` bzw. `einstellungen`) und ziehen sie mit `useBenutzerAbgleich` nach. Keine eigenen
  Dialoge „Angemeldet als“ in den Bereichen – `AngemeldetAls` verwenden. Den Farbmodus setzt nur
  die Hülle (`src/shell/Shell.tsx`, aus `useBenutzer()`) – kein eigener Effekt auf
  `dataset.farbmodus` in einer `App.tsx`.
* **Projektregister:** Ein Bereich schreibt seinen eigenen Bestand nur über sein `mutate()` –
  auch, was aus dem Register kommt (`registerPlanAnwenden` in `domain/register.ts`, reine
  Funktion, liefert ohne Änderung denselben Bestand zurück, damit der Abgleich zur Ruhe kommt).
  Das Register ändert nur `registerAendern` (außerhalb von React-Updates). Archivstand und
  Zugehörigkeit stehen allein im Register, nicht im Bestand der Bereiche – archiviert und
  zurückgeholt wird je Bereich über `ArchivKnopf`/`ArchivHinweis` (`bereichArchivieren`), nicht
  über eigene Knöpfe oder Felder im Bereich. `ersetzeDaten` und
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
* Gespeichert wird – in allen drei Bereichen – nur bei `ladeZustand === 'ok'`, und nur dann gleicht
  der Store mit dem Register ab: Nach einem Ladefehler oder bei einem Stand aus einer neueren
  Fassung zeigt der Bereich Demodaten (mit Hinweisleiste) und lässt den gespeicherten Stand
  unberührt. Vor jeder Umstellung legt `ladeDaten` eine Rohkopie `<Schlüssel>.vor-fassung-<n>` an.
  Vor dem Einspielen einer Sicherung über einen unlesbaren Stand entsteht mit
  `rohkopieVorEinspielen` eine `<Schlüssel>.vor-einspielen-<Zeitpunkt>`, und „Gespeicherten Stand
  herunterladen“ im Dialog liefert dann den Rohtext statt der Demodaten. `ersetzeDaten` und
  `zuruecksetzen` tun nichts, solange der gespeicherte Stand aus einer neueren Fassung stammt;
  „Zurücksetzen“ im Planlaufmanagement behält `bearbeiter`. `sicherungLesen` nennt Sicherungen
  der anderen Bereiche beim Namen („… bitte dort einspielen.“) und meldet eine beschädigte Datei
  mit „Die Sicherung konnte nicht gelesen werden.“ statt einer Technikmeldung. `speichereDaten` liefert `SpeicherZustand` und räumt bei vollem
  Speicher über `nachRaeumenSpeichern` (`src/shared/speicher.ts`) nach Bedarf diese Kopien – auch
  die anderer Bereiche; das Register räumt ebenso und meldet sein Ergebnis über
  `useRegisterSpeicherZustand` (Hinweis in jedem Bereich, `RegisterHinweis`).
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
  `App.tsx` rendern. Frühere Adressen bleiben per Umleitung gültig. Die Übersicht eines Bereichs
  steht unter dessen Adresse (`#/planlauf`, `#/baubetrieb`, `#/projektsteuerung`) – `routeToHash`
  liefert sie so, `#/planlauf/dashboard` und `#/projektsteuerung/uebersicht` bleiben gültig.
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
* Das Projektregister füllt sich erst, wenn ein Bereich geöffnet wird; was ein Bereich übernimmt
  („Übernehmen in …“ unter „Projekte aus anderen Bereichen“) oder an geteilten Projekten und
  Personen ändert, vollzieht der andere Bereich beim nächsten Öffnen. Archiviert wird im Projekt
  („Archivieren“: Planlaufmanagement in den Einstellungen des Projekts, sonst im Projektkopf),
  zurückgeholt über „Aus dem Archiv holen“ im archivierten Projekt (Projektliste, Abschnitt
  „Archiv“); der Archivstand gilt nur in diesem Bereich, der andere zeigt ihn unter „Auch in“.
  Wer den `localStorage` leert, leert auch `kaplan-projektregister.v1`.
* Projektsteuerung: Wer „Lena Roth“ einträgt, sieht die Demo-Aufgaben als eigene To-Dos; mit
  einem anderen Namen zeigt die Übersicht keine.
* „Angemeldet als“ liegt unter `kaplan-benutzer.v1` – wer es zurücksetzen will, löscht diesen
  Schlüssel.
