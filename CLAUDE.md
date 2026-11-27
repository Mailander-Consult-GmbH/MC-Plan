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

Die Oberfläche folgt dem **Koralle-Design** nach der Vorlage `KoralleDashboard.jsx` im
Wurzelverzeichnis – gebaut mit Tailwind 4, Framer Motion und Lucide-Icons. Abweichend von der
Vorlage ist die **Markenfarbe das Blau von Mailänder Consult** (`#24456e`), nicht Koralle,
gezeigt wird das **Logo von KaPlan**, und die **Menüleiste ist eine Karte wie die Kacheln**. Wie das
Design anzuwenden ist, steht im Abschnitt
[Designregeln](#designregeln-koralle-design); die früheren Gestaltungsregeln (helles
Apple-Erscheinungsbild) gelten nicht mehr.

## Nach jeder Änderung nachziehen

Eine Änderung ist erst fertig, wenn alle betroffenen Dateien zum Code passen:

1. **`README.md`** – Funktionsbeschreibung, Aufbau des Codes, Veröffentlichen.
2. **`docs/INVENTAR.md`** – nur Aussagen, die sich im Code belegen lassen. Vor dem Commit prüfen,
   dass jeder genannte Pfad existiert und jeder zitierte Oberflächentext wörtlich im Code steht.
3. **Weitere relevante Dateien**, insbesondere:
   * Code-Kommentare, die das geänderte Verhalten beschreiben,
   * der Hinweistext in `index.html` (erscheint, wenn der Quellcode statt des Builds ausgeliefert wird)
     und das Skript in ihrem Kopf, das hell oder dunkel schon vor dem Start setzt – es muss dieselbe
     Regel haben wie `istDunkel` in `src/gemeinsam/benutzer.ts`,
   * `public/sw.js`: Cache-Namen hochzählen, wenn sich die Hülle ändert (Titel, Symbole, Manifest),
   * die Designregeln unten, wenn ein Token, ein Baustein oder eine Bewegung hinzukommt oder sich
     ändert.

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

## Designregeln (Koralle-Design)

Vorlage ist `KoralleDashboard.jsx` (Wurzelverzeichnis; nur Vorlage, nicht Teil des Builds). Im
Zweifel gilt ihr Bild: heller Seitengrund, weiße Karten mit großer Rundung und weichem Schatten,
Schrift Outfit, weiche Bewegungen.

**Fünf bewusste Abweichungen von der Vorlage** – sie gelten vor ihr:

* **Markenfarbe ist Blau**, das Blau von Mailänder Consult (`--marke`, `#24456e`), nicht Koralle.
  Wo die Vorlage Koralle als Akzent zeigt (aktiver Menüpunkt, Balken, Symbolflächen), steht Blau.
* **Betont wird in Blau, nicht in Tinte:** Hauptknopf, gewählter Reiter und gewähltes Segment
  haben dasselbe Blau wie der aktive Menüpunkt (`--accent`, `--accent-verlauf`); in der Vorlage
  sind sie fast schwarz. Tinte bleibt die Farbe der Schrift und der Kurzmeldung.
* **Das Rot der Ampel ist ein eigenes, klares Rot** (`--red`, `#e5484d`) – in der Vorlage ist es
  dieselbe Koralle wie der Akzent. Rot bedeutet nur „überfällig“, „fehlt“ und „löschen“.
* **Die Menüleiste ist eine Karte wie die Kacheln des Inhalts** – Kartengrund (`--bg-elev`),
  24 px Rundung, weicher Schatten, ohne Linie zum Inhalt, mit 16 px Abstand zum Fensterrand; in
  der Vorlage ist sie eine dunkle Fläche am Rand. Sie lässt sich einklappen (siehe Bausteine).
* **Logo von KaPlan** („Planebenen“: drei Ebenen, je Arbeitsbereich eine) statt der Marke der
  Vorlage – ohne Fläche dahinter, mit eigenen Farben (`--logo-…`), die nicht die Markenfarbe der
  Oberfläche sind; für das dunkle Schema hat es eigene, hellere Töne.

### Technik

* **Tailwind 4** über `@tailwindcss/vite` (`vite.config.ts`), eingebunden allein in
  `src/shared/global.css` (`@import 'tailwindcss' source(none)` mit `@source '../'` – durchsucht
  wird nur `src/`). Es gibt keine `tailwind.config`; das Theme steht in `@theme inline` in
  `global.css`.
* **Ebenen:** `theme`, `base`, `components`, `utilities`. Alle Bausteinklassen stehen in
  `@layer components` – in `global.css` und in jeder CSS-Datei der Bereiche (die ganze Datei ist
  von `@layer components { … }` umschlossen). So gewinnt eine Tailwind-Utility immer gegen eine
  Bausteinklasse, und unter den Bausteinklassen entscheidet wie bisher die Reihenfolge
  (`global.css` zuerst). **Eine neue CSS-Datei ebenso umschließen** – Regeln außerhalb einer Ebene
  schlügen alles andere.
* **Preflight** von Tailwind ist aktiv: Außenabstände sind null, Listen haben keine Punkte (wo sie
  welche brauchen: `list-style: disc`), Überschriften erben Größe und Stärke. Kästchen und
  Optionsfelder ohne Klasse behalten ihren Abstand zum Text (`@layer base` in `global.css`).
* **Schrift Outfit** aus `@fontsource-variable/outfit` – wird in den Build gebündelt. Keine
  Schriften von fremden Servern einbinden (die Anwendung läuft ohne Netz und ohne Server).
* **Symbole** nur über `Icon` aus `src/shared/icons.tsx` (Lucide, `lucide-react`) mit den
  fachlichen Namen der Anwendung; ein neues Symbol dort in `symbole` eintragen, `lucide-react`
  nicht in den Ansichten einbinden. Keine Textzeichen als Symbole (✕, ★, ▾, ↺). `iconSvg` ist nur
  für die Druckfassungen da.
* **Bewegung** mit `framer-motion`, nur über die Bausteine in `src/shared/bewegung.tsx`
  (`hoverLift`, `Zaehler`, `NavAktiv`, `BalkenFuellung`, `Einblenden`, `listenEintrag`,
  `Aufspringen`, `SortierListe`/`SortierEintrag`, dazu `KURVE`, `FEDER`, `FEDER_STRAFF`). `main.tsx` setzt `MotionConfig reducedMotion="user"`.

### Farben

Farben kommen **immer aus den Tokens** – als CSS-Variable in CSS, als Tailwind-Utility in TSX.
Keine Hex-Werte in Ansichten oder Bereichs-CSS.

| Rolle | CSS-Variable | Tailwind | Hell | Dunkel |
| --- | --- | --- | --- | --- |
| Seitengrund | `--bg` | `bg-grund` | `#f2f2f4` | `#121316` |
| Karte, Dialog | `--bg-elev` | `bg-karte` | `#ffffff` | `#1b1c20` |
| Füllfläche (Kachel in der Karte, Gruppenzeile) | `--bg-subtle`, `--fill-gruppe` | `bg-flaeche` | `#f7f7f8` | `#232429` |
| Schrift | `--text` | `text-tinte` | `#1b1c20` | `#f2f2f4` |
| Schrift zweitrangig | `--text-secondary` | `text-zweitrangig` | `#62646d` | `#b1b3bb` |
| Schrift gedämpft (Beschriftungen) | `--text-tertiary` | `text-gedaempft` | `#8b8d94` | `#8b8d94` |
| Linie | `--separator`, `--separator-strong` | `border-linie`, `border-linie-stark` | `#ececef`, `#dddde2` | `#2c2d33`, `#3c3d45` |
| Betonung (Blau wie der aktive Menüpunkt) | `--accent`, als Fläche `--accent-verlauf`, darauf `--auf-accent` | `bg-betont`, `text-auf-betont` | `#24456e` / weiß | `#3d6cab` / weiß |
| Marke (Blau) | `--marke`, `--marke-2`, `--marke-soft` | `bg-marke`, `bg-marke-hell`, `bg-marke-zart` | `#24456e`, `#4a7ab8`, `#e8eef6` | `#4f86cc`, `#7eaae4`, zart durchscheinend |
| Marke als Schrift | `--marke-text`, `--link` | `text-marke-text` | `#24456e` | `#93bbee` |
| Ampel Grün | `--green`, `--green-soft`, `--gruen-text` | `bg-gruen`, `bg-gruen-zart`, `text-gruen-text` | `#1f9d61`, `#e3f6ec` | aufgehellt |
| Ampel Orange | `--orange`, `--orange-soft`, `--orange-text` | `bg-orange`, `bg-orange-zart`, `text-orange-text` | `#f2994a` | aufgehellt |
| Ampel Rot | `--red`, `--red-soft`, `--rot-text` | `bg-rot`, `bg-rot-zart`, `text-rot-text` | `#e5484d`, `#fdecec` | aufgehellt |
| Blau (laufend, im Plan, Hinweis) | `--blau`, `--blau-soft`, `--blau-text` | `bg-blau`, `bg-blau-zart`, `text-blau-text` | `#56ccf2` | gleich |
| Violett (Entscheidung, Rücksprung) | `--purple`, `--purple-soft` | `bg-violett`, `bg-violett-zart` | `#9b51e0` | aufgehellt |

* **Blau betont und markiert.** Betonung: Hauptknopf, gewählter Reiter und gewähltes Segment,
  aktueller Schritt – als Fläche mit weißer Schrift im Verlauf des aktiven Menüpunkts
  (`--accent-verlauf`, gleich `--nav-aktiv`), als Rahmen, Punkt oder Kästchen im Ton `--accent`;
  Schrift in der Betonung ist `--marke-text`, nicht `--accent` (im dunklen Schema zu dunkel).
  Der Tastaturfokus (`--fokus`) nimmt `--marke`. Marke (`--marke`): aktiver Menüpunkt
  (`--nav-aktiv`, im dunklen Schema eine Stufe heller; mit Glanz `--marke-glanz`),
  Fortschrittsbalken (Verlauf), runde Symbolflächen, Verknüpfungen, aktive Sortier- und
  Filterzeichen. Flächen in der Markenfarbe mit weißer Schrift nehmen `--marke-verlauf` – er ist in
  beiden Schemata gleich dunkel. **Tinte** ist die Farbe der Schrift und der Kurzmeldung
  (`--text` mit `--bg-elev` als Schrift) – keine Schaltfläche ist schwarz.
* **Rot nur als Signal:** überfällig, fehlend, löschen (`--red`, `--rot-text`) – nie als Schmuck
  und nie für Fokus oder Auswahl. Es ist bewusst klar vom Orange „fällig“ abgesetzt.
* **Farbe als Schrift** immer mit den Schrifttönen (`--marke-text`, `--rot-text`,
  `--orange-text`, `--gruen-text`, `--blau-text`), nicht mit den Flächentönen – die sind auf Weiß
  zu blass.
* **Helles und dunkles Schema:** Welches gilt, wählt die Person unter „Angemeldet als“
  (**Farbschema**: „Automatisch“ – die Vorgabe: wie das Gerät eingestellt ist –, „Hell“ oder „Dunkel“). Am
  `<html>` steht stets das Ergebnis als `data-farbschema="hell"` bzw. `"dunkel"`; gesetzt wird es
  vom Skript im Kopf der `index.html` (vor dem Start, damit nichts hell aufblitzt) und danach von
  der Hülle. **In CSS deshalb keine Medienabfrage `prefers-color-scheme`**, sondern
  `:root[data-farbschema='dunkel']`; die Tailwind-Variante `dark:` ist daran gebunden
  (`@custom-variant dark` in `global.css`). Die Tokens schalten selbst um, `dark:` ist für
  Token-Farben nicht nötig. Kein festes `#fff`/`#000`: Schrift auf einer Farbfläche ist
  `var(--auf-accent)` bzw. `var(--bg-elev)` (Ausnahmen: Weiß auf dem aktiven Menüpunkt und auf
  den Verläufen `--marke-verlauf` und `--signal-verlauf`). Die Menüleiste nimmt für Grund und
  Inhalt die Tokens des Schemas; eigene Farben setzt `.sidebar` in `global.css` nicht.
* **Signale nur über die Ampel-Tokens**, nie über feste Farben. Einen eigenen Farbmodus für eine
  Rot-Grün-Sehschwäche gibt es nicht mehr (früher `data-farbmodus='kontrast'`, Variante
  `kontrast:`) – nicht wieder einführen, ohne dass es verlangt wird.
* **Funktionsfarben** sind Daten der Nutzer: als `--chip-farbe` an `.role-chip` bzw. über `Avatar`
  übergeben – `global.css` hellt sie im dunklen Schema auf.

### Formen und Schrift

* **Rundungen:** Karten und Dialoge 24 px (`--rund-xl`, `rounded-3xl`), Kacheln und Hinweise 16 px
  (`--rund-l`, `rounded-2xl`), Felder und Menüpunkte 12 px (`--rund`, `rounded-xl`), Kleines 10 px
  (`--rund-s`); Knöpfe, Kennzeichen, Suche, Reiter und Segmente sind Pillen (`rounded-full`).
* **Schatten statt Rahmen:** `--schatten` (Karte, `shadow-karte`), `--schatten-hoch` (angehoben,
  Menüs, `shadow-schweben`), `--schatten-dialog` (`shadow-dialog`). Karten haben keinen Rahmen;
  getrennt wird mit `--separator`.
* **Abstände:** Innenrand der Karte 24 px (Telefon 16 px), Abstand zwischen Karten 16 px. Erste und
  letzte Spalte einer Tabelle stehen in der Flucht des Kartenrands (`--tabellen-rand`).
* **Eine Flucht:** Kopf und Inhalt haben dieselbe Breite und Lage – `.topbar-inner` wie
  `.content-inner`: höchstens `--arbeitsbreite` (1560 px), mittig, `--seitenrand` (32 px, schmal
  16 px) zum Rand; beide Rahmen (`.topbar`, `.content`) halten den Platz des Rollbalkens frei
  (`scrollbar-gutter: stable`). So stehen die Kacheln auf jeder Seite und in jedem Bereich an
  derselben Stelle – ob die Seite rollt oder nicht –, der Titel beginnt an ihrer linken Kante,
  das Hauslogo endet an ihrer rechten, mit aus- wie mit eingeklappter Menüleiste. Breite und
  Rand nur über die beiden Variablen an `.main` ändern, nicht je Rahmen oder je Bereich.
* **Verschachteln:** In einer Karte steht keine zweite Karte, sondern eine graue Kachel
  (`--bg-subtle`, 16 px, ohne Schatten) – wie die Kennzahlen der Vorlage (`.kennzahlen`,
  Workflow-Karten in der Liste).
* **Schrift:** Outfit, Grundgröße 14 px. Überschriften und Kartentitel in Stärke 500 mit
  `letter-spacing: -0.02em`, Fettes in 600, große Zahlen in 600 mit `tabular-nums`. Beschriftungen
  klein (12–12,5 px) und gedämpft, **keine Versalien**, keine Festbreitenschrift für Nummern
  (`.mono`, `.num` sind Outfit mit gleich breiten Ziffern). Im Seitenkopf steht die Unterzeile
  klein und gedämpft **über** dem Titel.
* **Hervorhebung:** Eine Fläche im Verlauf mit Ring – rot für Überfälliges (`--signal-verlauf`:
  `Stat` mit Ton `red`), blau für ein Hauptergebnis (`--marke-verlauf`: Ergebnis des
  Terminrechners) – höchstens eine je Ansicht.

### Bausteine

Vorhandene Bausteine verwenden, nicht nachbauen (`src/shared/ui.tsx`, Klassen in `global.css`):

* `Card`/`CardHeader` (Kopf ohne Linie), `Stat` (Beschriftung klein oben, Wert groß darunter; die
  Töne zeigt ein Ampelpunkt, `red` die Verlaufskarte), `Progress`, `Badge`, `Avatar`, `Callout`
  (Symbol aus dem `icon`-Zeichen: „i“, „!“, „✓“), `EmptyState` (Symbol in runder, zart blauer
  Fläche), `Search` (Pille), `Segmented` (blaue Fläche gleitet), `Modal`, `ConfirmDialog`.
* **Knöpfe:** `.btn` weiße Pille mit feiner Linie, `.btn-primary` blaue Pille – **ein** Hauptknopf
  je Ansicht –, `.btn-ghost`, `.btn-outline`, `.btn-icon` (rund). Löschen: der Auslöser ist
  `.btn-danger` (rote Schrift), die Bestätigung `.btn-primary.btn-rot` (rot gefüllt) – nicht per
  Inline-Farbe.
* **Seitenleiste:** eine Karte (`.sidebar`), einklappbar über `SeitenleisteGriff` – eine Lasche
  mittig auf ihrem rechten Rand (`.leiste-griff`, `src/shared/seitenleiste.tsx`); der Knopf
  „Menü“ in der Kopfzeile (`SeitenleisteKnopf`) erscheint nur in der schmalen Ansicht. Die
  markierten Projekte stehen zweizeilig – Projektnummer klein über dem Namen (`NavItem` mit
  `nummer`, `.nav-label.zweizeilig`; ohne Nummer einzeilig), in allen drei Bereichen gleich. Eingeklappt bleiben Symbole (Name im Tooltip, Zähler als Marke
  am Symbol) – auch die der markierten Projekte, unter einer Trennlinie statt der Überschrift –,
  `KaPlanZeichen` (das Symbol des Logos allein), die Initialen der angemeldeten Person und der
  Bereichswechsel; Sicherungsknöpfe und Texte entfallen.
* `.tabs` sind Pillen, die gewählte blau; `.badge` mit Ton (`green`, `orange`, `red`, `blue`,
  `purple`, `gelb`); Ampelpunkt `.dot`; Stern der Projektmarkierung `Icon name="stern"` in `.stern`.
* **Funktionslisten** (Einstellungen → Funktionen und die Listen in den Projekten, in
  Planlaufmanagement und Projektsteuerung gleich): erste Ebene die Art der Funktion über
  `ArtReiter`, unter „Alle“ `ArtGruppenZeile` (`.gruppe-zeile`), zweite Ebene `GewerkFilter` neben
  der Suche und `GewerkAbzeichen` hinter der Bezeichnung (blau „Übergreifend“, sonst neutral) –
  alles aus `src/gemeinsam/FunktionsArten.tsx`, nicht nachbauen. Eine Karte mit einer Tabelle;
  ihr Titel ist „Alle Funktionen“ bzw. der Name der Art. **In den Projekten stehen nur die
  besetzten Funktionen** (Projektsteuerung: Projektbeteiligte; Planlaufmanagement: „Besetzte
  Funktionen“) – die große Liste dient dort **nur der Auswahl** im Dialog „Person hinzufügen“
  (mit „+ Neue Funktion anlegen …“); eine Ansicht aller Funktionen gibt es im Projekt auf Wunsch
  nicht – nicht wieder einführen, ohne dass es verlangt wird. Im Planlaufmanagement steht
  „Funktion löschen“ deshalb im Dialog „Funktion bearbeiten“ (`onLoeschen` an `FunktionsMaske`),
  und wer über die übergreifende Funktion einspringt, nennt die Auswahl. Die Tabellen kommen bei 400 px ohne
  Querrollen aus (`.pl-funktionstabelle`, `.ps-funktionsliste`: die Zelle der Funktion bricht um).
* **Logo:** `KaPlanLogo` und `KaPlanZeichen` (`src/shared/logos.tsx`) **zeichnen** das Logo
  „Planebenen“ als SVG – drei Polygone (oben Planlaufmanagement, Mitte Baubetriebsplanung, unten
  Projektsteuerung) und der Schriftzug als Text in Outfit – **ohne Kachel oder andere Fläche
  dahinter**. Der Zustand (`LogoZustand`) ist `neutral` auf dem Startbildschirm (alle Ebenen in
  Blautönen, keine Unterzeile) oder der Bereich (`planlauf`, `baubetrieb`, `projekt`: dessen
  Ebene blau, die anderen grau, Name des Bereichs als Unterzeile); jede `App.tsx` gibt ihren
  eigenen fest an. Welche Ebene blau ist, regelt die Klasse `logo-<zustand>` in `global.css`
  über die Tokens `--logo-aktiv`, `--logo-inaktiv`, `--logo-neutral-oben/-mitte/-unten`,
  `--logo-schriftzug` („KaPlan“: im hellen Schema das Blau der Wortmarke Mailänder Consult,
  `#21426d` – abweichend von der Vorlage, dort grau; im dunklen hell) und `--logo-schrift`
  (Unterzeile, grau) – sie schalten mit dem Farbschema um; keine Farben im Baustein. Vorlage sind
  die mitgelieferten Dateien unter `public/logos/` (`kaplan-logo-*.svg`, `kaplan-symbol-*.svg`,
  je auch `-dark`) mit `docs/LOGO-ANLEITUNG.md` – sie werden nicht verändert und von der
  Oberfläche nicht geladen. Die Symbole für Browser-Tab und App liegen unter `public/icons/`
  (`favicon.ico`, `favicon.svg`, `apple-touch-icon.png`, `icon-maskable-512.png` – mitgeliefert –
  und `app-192.png`, `app-512.png` für Taskleiste und Startmenü: aus `app-icon-rund.svg`
  gerastert, mit größeren Ebenen und abgerundeter Kachel; alle immer neutral; ein
  geändertes Symbol bekommt neue Dateinamen, siehe README, Abschnitt „Logos“). Die Wortmarke
  Mailänder Consult bleibt die Originaldatei; im dunklen Schema erscheint sie weiß
  (`.topbar-logo`, `.logo-hell`).

### Bewegung

* Anklickbare Karten und Kennzahlen **heben sich an** (5 px, `--schatten-hoch`, Feder 300/22):
  `hoverLift` an einem `motion`-Element – das dann die Klasse `bewegt` trägt, damit keine
  CSS-Transition dagegenläuft – oder die Klasse `.card-click`.
* Zahlen **zählen hoch** (`Zaehler`), Balken **wachsen** (`BalkenFuellung`), die Fläche des aktiven
  Menüpunkts und des gewählten Segments **gleitet** (`layoutId`), eine Ansicht **blendet ein**
  (`Einblenden` – nur über die Deckkraft: Eine Verschiebung an einem Vorfahren machte ihn zum
  Bezug der fest positionierten Dialoge in der Ansicht).
* Einträge einer Liste (Tabellenzeilen, Karten) **kommen, gehen und gleiten**: `listenEintrag` an
  einem `motion.tr`/`motion.div` in `AnimatePresence initial={false}` – nur die Lage gleitet
  (`position`), beim Gehen keine Verschiebung zur Seite (schmal scrollen Tabellen quer). Ein Haken
  oder Stern **springt** beim Umschalten kurz auf (`Aufspringen`, nicht beim ersten Zeichnen).
* Einträge, die man selbst ordnet, **zieht** man: `SortierListe` mit `SortierEintrag`
  (framer-motion `Reorder`, gezogen wird nur an der Stelle, die `onPointerDown` des Eintrags
  bekommt – in der To-Do-Liste der ganze Kartenkopf außer seinen Knöpfen, mit
  `touch-action: none`; die übrigen gleiten beiseite; ein- und ausgeblendet nur über die
  Deckkraft). Die Reihenfolge während des Ziehens hält die Ansicht, gespeichert wird beim
  Loslassen (`onFertig`) – nicht bei jedem `onSortiert`; dazu die Pfeiltasten an der fokussierten
  Ziehstelle für die Tastatur.
* Kurve der Vorlage: `--ease-koralle` bzw. `KURVE`; Bedienelemente 0,15–0,35 s, Zähler und Balken
  0,8–0,9 s. Der Dialog blendet per CSS ein (`pop`) – die Fokusregeln von `Modal` rechnen damit.

### Neues bauen

* Neue Ansichten und Bausteine mit Tailwind-Utilities und den Token-Farben (Beispiel:
  `src/shell/Start.tsx`); was es als Bausteinklasse gibt, wird verwendet.
* Druck- und PDF-Fassungen (`src/shared/print.ts`, `domain/druck.ts`, `domain/export.ts`) und das
  Blatt der Druckansicht (`.ps-blatt`) sind Dokumente mit eigener, fester Gestaltung – sie gehören
  nicht zum Koralle-Design und bleiben hell.
* Jede Änderung an der Oberfläche in vier Darstellungen ansehen: hell, dunkel, 400 px Breite
  und mit eingeklappter Seitenleiste.

## Aufbau

* `src/shell/` – Startbildschirm und Bereichswahl; die erste Wegmarke der Hash-Adresse
  (`#/planlauf/…`, `#/baubetrieb/…`, `#/projektsteuerung/…`) bestimmt den Bereich; Adressen der
  entfernten Bereiche (`#/leistungsnachweise/…`, `#/controlling/…`) lenkt `umgelenkterHash`
  (`src/shell/router.ts`, `ENTFERNTE_BEREICHE`) auf die Bereichsauswahl `#/`. Ein neuer Bereich
  braucht einen Eintrag in `BereichId`/`BEREICHE`
  (`src/shell/bereiche.ts`) und in `src/shell/Shell.tsx`; führt er Projekte, zusätzlich einen in
  `ProjektBereich`/`PROJEKT_BEREICHE` (`src/gemeinsam/register.ts`), ein `domain/register.ts`,
  `useRegisterAbgleich` im Store und `RegisterHinweis` in seiner `App.tsx`. Die Startseite begrüßt
  nach der Tageszeit mit dem Vornamen aus „Angemeldet als“ (`gruss` in `src/shell/Start.tsx`,
  `vornameVon` in `src/gemeinsam/benutzer.ts` – leer beim Vorgabenamen, dann steht der Gruß
  allein) und zeigt je Bereich eine Karte – ab 768 px dreispaltig, darunter untereinander (Tailwind-Utilities in
  `src/shell/Start.tsx`; in `global.css` steht nur der Scrollrahmen `.start`). In jeder `App.tsx`
  ist die Seitenleiste ein `motion.aside` mit `layoutScroll`, der aktive Menüpunkt trägt `NavAktiv`,
  und die Ansichten stehen in `Einblenden` (Schlüssel `route.view`). Der Inhalt der Kopfzeile steckt in `.topbar-inner`
  (siehe Designregeln, „Eine Flucht“); links darin steht
  `SeitenleisteKnopf` (nur schmal sichtbar), nach der Leiste `SeitenleisteGriff`; die Klassen `leiste-zu` (an `.app`) und `eingeklappt` (an `.sidebar`)
  setzt jede `App.tsx` aus `useSeitenleiste()`.
  Das **Farbschema** setzt allein `src/shell/Shell.tsx` – aus `useBenutzer()` in einem
  Layout-Effekt, also vor dem ersten Zeichnen (`document.documentElement.dataset.farbschema`,
  `hell` oder `dunkel` nach `istDunkel`; es gilt auch auf der Bereichsauswahl, bei „Automatisch“
  folgt die Hülle einem Wechsel der Geräteeinstellung sofort) samt der Farbe der Fensterleiste
  (`theme-color`).
* `src/gemeinsam/` – das **Projektregister**, der einzige Bestand, den sich die Bereiche teilen
  (Schlüssel `kaplan-projektregister.v1`): Projekte (Nummer, Bezeichnung, Beschreibung), ihre
  Zugehörigkeit je Bereich mit lokaler Kennung und Archivstand (`Mitgliedschaft`, `offen` =
  Übernahme steht aus) und die Projektbeteiligten mit Kontaktdaten und Funktionen (über
  Bezeichnung + Gewerk erkannt, `funktionsSchluessel`; gegenüber dem Register vergleichen Abgleich
  und Bereiche mit `registerSchluessel` – eine frühere Bezeichnung zählt dort als die heutige, und
  `sichtFuerRegister` beider Bereiche meldet Funktionen unter der heutigen Bezeichnung
  (`umbenannt`) –, eine geänderte Art zieht `uebertragen` am Registereintrag nach). Archiviert ist ein Projekt nur je Bereich
  (`istArchiviert`); die ★-Markierung der Bereiche steht nicht im Register. Die anderen Bereiche
  einer Projektansicht liefert `andereBereicheVon(bereich)`.
  `register.ts` Modell, Laden/Speichern (`REGISTER_VERSION` 5: `aufbereiten()` stellt ältere
  Stände um – seit Fassung 3 entfallen Mitgliedschaften und Kennungen der Leistungsnachweise,
  ★-Spiegel und `herkunft`, das frühere Archiv für alle Bereiche wird Archivstand je Bereich,
  Projekte, die kein Bereich mehr führt, entfallen samt Personen; seit Fassung 5 trägt jede
  Funktion einer Person ihre Art (`FunktionsBezug.art`), und frühere Bezeichnungen bekommen die
  des Funktionskatalogs; vorher entsteht die Rohkopie
  `kaplan-projektregister.v1.vor-fassung-<n>` – geschrieben wird der umgestellte Stand erst mit
  der nächsten Änderung des Registers),
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
  `inBereichUebernehmen` („Übernehmen in …“; mit `stammdaten`, wenn der Bereich das Projekt in
  seiner eigenen Maske selbst anlegt – Baubetriebsplanung) und `bereichArchivieren` (Archiv je Bereich, über die
  Kennung im Bereich); `useRegisterAbgleich.ts`
  bindet einen Store an; `useFremdeAenderung.ts` lädt den Bestand eines Stores nach, wenn ein
  anderes Fenster seinen Schlüssel (`SPEICHER_SCHLUESSEL` aus `store/storage.ts`) speichert –
  jeder der drei Stores nutzt ihn (`nachgeladen(daten)` aus `useRegisterAbgleich` vor
  `setData(daten)` – derselbe Stand wird weder übertragen noch abgeglichen, bis sich das Register
  ändert; nicht zurückschreiben; nicht `ersetzt()`);
  `ProjektBereiche.tsx` Bausteine der Projektlisten und Projekte („Auch in“, „Projekte aus anderen
  Bereichen“ mit „Übernehmen in …“ – ohne Projekte, die in allen ihren Bereichen archiviert sind,
  `FremdeProjekte`; mit `onUebernehmen` zeigt der Bereich stattdessen seine Maske für ein neues
  Projekt, vorausgefüllt mit dem Bekannten (`UebernahmeHinweis`, `uebernahmeMeldung`); die Projektlisten zeigen den Abschnitt nur bei `ladeZustand === 'ok'`, sonst
  sähe das Register eine Übernahme vor, die der Bereich nicht anlegt –, `ArchivAbschnitt`,
  `VerknuepfungsHinweis` (nennt ein überall archiviertes Projekt „(dort archiviert)“),
  `useSucheOhneTreffer` (Leerzustand der Projektlisten bei einer Suche ohne aktiven Treffer – nennt
  Treffer im Archiv und unter „Projekte aus anderen Bereichen“, statt „keinen Treffer“ über einen
  zu schreiben), `useLoeschHinweis`, Beteiligte)
  und das **Archiv in den Bereichen**: `ArchivKnopf` („Archivieren“ mit Kurzmeldung, ohne
  Rückfrage – im Planlaufmanagement in `pages/projekt/Einstellungen.tsx`, Karte „Projekt
  archivieren“, in Baubetriebsplanung und Projektsteuerung in `pages/ProjektDetail.tsx` im
  Projektkopf zwischen „Bearbeiten“ und „Löschen“; wer den Knopf einrahmt, fragt mit
  `useArchivierbar`, ob er etwas zeigt – nicht bei einem archivierten oder dem Register
  unbekannten Projekt) und `ArchivHinweis` oben im archivierten
  Projekt mit „Aus dem Archiv holen“ (der Tastaturfokus geht vom einen Knopf an den anderen,
  `fokusNachArchiv`; sind alle Projekte eines Bereichs archiviert, zeigt seine Projektliste
  „Kein aktives Projekt“ statt „Kein Projekt gefunden“, bei einer Suche mit Treffern nur im Archiv
  „Kein aktives Projekt gefunden“); archivierte Projekte fehlen in Übersicht und Seitenleiste
  (`useArchivierte`) und in den bereichsweiten Fristenlisten (`pages/Fristen.tsx` im
  Planlaufmanagement, `pages/Termine.tsx` samt Zähler der Seitenleiste in der
  Baubetriebsplanung), im Projekt selbst bleiben die Fristen sichtbar;
  `RegisterHinweis.tsx` steht in der `App.tsx` jedes Bereichs
  über dem Inhalt: „Das Projektregister ließ sich nicht lesen.“ bzw. „… stammt aus einer neueren
  Fassung von KaPlan.“ (mit „Seite neu laden“) und „Projektregister nicht gespeichert.“ mit
  „Erneut speichern“ (gelingt es wieder: „Projektregister gespeichert.“, ein verlorener Fokus geht
  an die Stelle des Hinweises, `.gem-registeranker`; ist der Stand eines anderen Fensters
  unlesbar, meldet er das Verwerfen). Dazu der **Funktionskatalog** für Planlaufmanagement
  und Projektsteuerung: `funktionskatalog.ts` führt die Arten der Funktionen (`FUNKTIONS_ARTEN`,
  zwölf aus der Liste „Projektbeteiligte“ der Anwender und „Sonstige“; Kennung, Kurzzeichen, Name,
  Farbe), die mitgelieferten Funktionen (`FUNKTIONS_KATALOG`: Art, Bezeichnung **ohne** Gewerk,
  Gewerk oder `null`, Kürzel; `KATALOG_GEWERKE`) und die Umbenennungen früherer Bezeichnungen
  (`FUNKTIONS_UMBENENNUNGEN` mit `umbenannt` für eine Funktion und `umbenannterVerweis` für eine
  Stelle, die nur den Namen nennt). Die **Art ist ein Merkmal** jeder Funktion (`art`) und die
  erste Ebene der Gliederung in den Listen – **nicht Teil des Schlüssels**: Erkannt wird eine
  Funktion überall an Bezeichnung + Gewerk (`funktionsSchluessel`), jede Bezeichnung steht im
  Katalog in genau einer Art. `artVon`/`artAus` liefern die Art zu einer Bezeichnung (Katalog,
  sonst bekannte ältere Namen – eine umbenannte steht in der Art ihrer heutigen –, sonst
  „Sonstige“), `funktionenVergleich` und `nachArt` die
  Reihenfolge (Art, Bezeichnung, Gewerk), `kuerzelFuerGewerk` das Kürzel beim Übernehmen in ein
  anderes Gewerk, `kuerzelDerBezeichnung` eines für eine bloße Bezeichnung, `artAusText` die Art
  aus einer Excel-Zelle. Die Farben der Arten sind Daten wie die Funktionsfarben der Nutzer (nur
  über `.dot`, `Avatar`, `--chip-farbe`), keine Farben der Oberfläche. **Ein neuer Stand der
  Liste:** Einträge im Katalog nachtragen (Regeln im Kopf der Datei), Umbenennungen in die
  Tabelle, dann die Fassungen erhöhen, mit denen die Bestände umstellen – `STAMMDATEN_VERSION`
  und `DATEN_VERSION` des Planlaufmanagements, `DATEN_VERSION` der Projektsteuerung,
  `REGISTER_VERSION`; **alle drei Speicher stellen mit derselben Tabelle um**, sonst holt der
  Abgleich die alten Bezeichnungen aus dem Register zurück und legt Funktionen doppelt an.
  `FunktionsArten.tsx` hält die Bausteine der Gliederung, in beiden Bereichen dieselben:
  `ArtReiter` („Alle“ und je vorkommender Art ein Reiter mit ihrem Kurzzeichen; schmal brechen sie
  um, `.gem-artreiter`), `ArtGruppenZeile` (Gruppenzeile je Art unter „Alle“), `ArtFeld` (Auswahl
  im Dialog einer Funktion), `GewerkFilter` mit `gewerkPasst` (zweite Ebene, ohne
  Groß-/Kleinschreibung) und `GewerkAbzeichen`
  (das Gewerk hinter der Bezeichnung – es muss auch bei 400 px in jeder Zeile zu sehen sein).
  Reiter und Filter sind Zustand der Ansicht, nicht der Adresse; `useWahlNachziehen` hält ihn auf
  der gültigen Wahl (sonst spränge die Liste in einen Reiter zurück, den es zwischendurch nicht
  gab). Die Zeilen einer Liste stehen als **eine flache, geschlüsselte Liste** im `tbody`
  (`gruppen.flatMap`, Gruppenzeile mit eigenem Schlüssel) – nicht je Art in einem Fragment:
  Wechselt eine Zeile die Art, hängt React sie um, und der Dialog gibt den Fokus an seinen Öffner
  zurück; nach dem Speichern folgt die Ansicht der Zeile in ihre neue Art (`zeigen` über
  `onGespeichert`, in allen vier Listen). Die Excel-Importe beider Bereiche schicken eine Bezeichnung durch `umbenannt`, bevor
  sie eine Funktion suchen oder anlegen – eine Liste aus einer früheren Fassung legte sonst die
  alten Namen wieder an. Dazu **„Angemeldet als“ für alle Bereiche**:
  `benutzer.ts` (Name und Farbschema, Schlüssel `kaplan-benutzer.v1`, `useBenutzer`,
  `benutzerAendern`, `istDunkel`), `AngemeldetAls.tsx` (Knopf und Dialog in jeder Seitenleiste; eine eigene
  Einstellung eines Bereichs kommt als `zusatz` hinein) und `useBenutzerAbgleich.ts`.
* `src/bereiche/<bereich>/` – in sich geschlossene Bereiche mit eigenem Store, eigenem
  `localStorage`-Schlüssel, eigenen Einstellungen und eigenem Router.
* `src/shared/` – fachfreie Bausteine (UI, Symbole `icons.tsx`, Bewegung `bewegung.tsx`, Marken
  `logos.tsx`, Datumsrechnung, Excel lesen/schreiben, Druck, PWA, `global.css` mit Tailwind, den
  Design-Tokens und den Bausteinklassen). Aufklappmenüs an Knöpfen immer über `AufklappMenue`
  (`menue.tsx`: Portal, bleibt im Fenster, Tastatur; eigene Menüs werden von `.card`/`.table-scroll`
  abgeschnitten); `tabellen.ts` (`tabellenBreiteBeobachten`, in `main.tsx`) lässt überbreite
  Tabellen quer scrollen (`table-scroll-quer`); `scrollen.ts` (`useNachObenBeiSeitenwechsel`)
  hängt am `.content` jedes Bereichs; `seitenleiste.tsx` (`useSeitenleiste`, `SeitenleisteKnopf`, `SeitenleisteGriff`)
  hält in jeder `App.tsx` die Seitenleiste: in der schmalen Ansicht (bis 860 px) liegt sie über
  dem Inhalt und schließt bei jedem Seitenwechsel (`hashchange`), in der breiten lässt sie sich
  auf eine Leiste mit Symbolen einklappen – der Zustand gehört zum Gerät (Schlüssel
  `kaplan-seitenleiste.v1`), nicht in den Bestand eines Bereichs. Schmal öffnet sie der
  Knopf „Menü“ in der Kopfzeile, breit klappt sie der Griff an ihrem rechten Rand ein und aus
  (er steht neben der Leiste in `.app`, weil ihr Scrollbereich ihn abschnitte). Was eingeklappt entfällt, regelt allein `global.css` (`.sidebar.eingeklappt`);
  ein neues Element der Leiste braucht dort eine Zeile, wenn es Text zeigt. Dialoge immer über `Modal` (`ui.tsx`: Fokus beim Öffnen,
  Tab bleibt im Dialog, Escape schließt nur den obersten, Fokus zurück an den Öffner; wo ein Klick
  daneben nicht schließen soll, `klickDanebenSchliesst={false}`, kein eigenes Overlay); Elemente,
  die nur auf Klicks hören (Ablageflächen `.drop-zone`), mit `alsKnopf` tastaturbedienbar machen;
  anklickbare Tabellen- und Listenzeilen (`tr.clickable`, `.list-row.clickable`) mit
  `alsKlickZeile` (Tab-Halt, Enter und Leertaste wie der Klick, ohne Rolle „button“ – die Zeile
  bleibt Tabellenzeile, ihre Knöpfe lösen sie nicht aus). Schließt die Eingabetaste in einem Feld
  den Dialog ab, `onKeyDown={beiEnter(…)}` (unterdrückt die Standardaktion – sonst löst dieselbe
  Taste den Öffner, an den der Fokus zurückgeht, noch einmal aus). Alle drei in `ui.tsx`.
  `speicher.ts` verwaltet Rohkopien im `localStorage` (`rohkopieVorEinspielen`,
  `nachRaeumenSpeichern`). `main.tsx` importiert `global.css` vor der Shell, damit
  Bereichsregeln gleicher Spezifität gewinnen (alle in `@layer components`) – Reihenfolge nicht
  umdrehen. Der Ampelpunkt `.dot`
  ist `inline-block` (hat auch in einer Tabellenzelle eine Größe), der Dialogfuß `.modal-footer`
  bricht um, anklickbare Karten `.card-click` haben keinen Innenabstand des Browsers
  (`padding: 0`, stehen so in einer Flucht mit nicht anklickbaren) – alles in `global.css`, nicht
  je Bereich per Inline-Style nachbessern. `xlsxLesen.ts` ordnet die Blätter einer Mappe über
  ihre Beziehung `r:id` (`xl/_rels/workbook.xml.rels`) zu, nicht über die Nummer im Dateinamen
  (nur als Rückfall); Zellen ohne Zellbezug folgen auf die vorige.
* `src/bereiche/planlauf/`:
  * `domain/types.ts` Datenmodell (flache Listen in `AppData`, Verweise über IDs – außer: Schritte
    nennen ihre Funktion per `roleName`, Gewerke sind Namen; Umbenennungen müssen diese Stellen
    mitziehen – für Funktionen tun das `funktionAendern`/`standardFunktionAendern`, siehe
    `domain/bestand.ts`),
  * `domain/ablauf.ts` Ablaufverfolgung – **die einzige Stelle, die Ziele auflöst**
    (`nachfolger`, `verfolgen`); Planlauf, Editor, Terminrechnung und Simulation folgen ihr.
    Blockregeln: Schritte bleiben eine flache Liste; ein paralleler Block ist nur der Marker
    `parallel: { block, zweig }`, seine Schritte stehen zusammenhängend und nach `zweig` sortiert
    (`bloeckeOrdnen` stellt das her), Blöcke werden nicht geschachtelt. Ein Ziel im Zweig führt im
    Zweig weiter, außerhalb des Blocks ist es ein Ausstieg, in einem anderen Zweig unzulässig; ein
    Ziel auf einen Blockschritt betritt den ganzen Block,
  * `domain/engine.ts` Soll-Termine ab dem tatsächlichen Eingang (`recalcSollDaten`; ein von Hand
    gesetztes Soll bleibt auch außerhalb des Verlaufs stehen, `sollManuell` gibt es nur mit Datum),
    Rücksprung mit Historie, Ampel, Verzug, gewichteter Fortschritt, To-Dos, Zuständigkeiten
    (`rolleFuerSchritt`: welche Funktion ein Schritt meint – die des Gewerks, ersatzweise die
    übergreifende, ohne Blick auf die Besetzung; danach richtet sich die Seite im Terminnachweis.
    `zustaendigeRolle`: wessen Besetzung gilt – die besetzte Funktion des Gewerks, sonst **die
    besetzte übergreifende gleichen Namens**, sonst die gemeinte; `kontaktFuerRolleUndGewerk`
    liefert danach die Person und ist die einzige Stelle, die Zuständigkeit, neue Planläufe,
    E-Mail-Regeln und Vorbelegungen fragen. `zustaendigkeitenNachziehen`: „von Hand“ gilt nur mit
    Person),
  * `domain/abschluss.ts` Statuswechsel (`schrittStatusSetzen`), Wieder öffnen, Einfügen,
  * `domain/simulation.ts` Prognose, Basisplan und Rückwärtsrechnung – erledigt die Schritte mit
    `schrittStatusSetzen` und rechnet mit `recalcSollDaten`, also ohne eigene Regeln,
  * `domain/nachweis.ts` Terminnachweis (Verzug gegenüber dem Basisplan je Seite; ein Eingang
    Soll vor dem Start des Laufs zählt dort ab dem Start, `abStart` – so rechnet der Basisplan;
    endet er schon mit dem ersten Schritt, wird am Eingang Soll selbst gemessen),
  * `domain/protokoll.ts` Änderungsprotokoll: `protokollNachziehen` vergleicht in jedem `mutate()`
    alten und neuen Stand und schreibt je Lauf, was jemand getan hat (nichts Berechnetes),
  * `domain/bestand.ts` Ablauf von `mutate()` (`bestandAendern`), Löschen mit Löschvermerk
    (`kontaktLoeschen` nimmt an offenen Schritten Person und „von Hand“ zurück), Sammelaktionen als
    reine Funktionen; `funktionAendern` (hinter `updateRole`): Ein Gewerkwechsel zieht
    `zuordnungen[].gewerk` der Personen mit, eine Umbenennung `roleName` und `MailRegel.roleName` in
    den Planläufen des Projekts, für die die Besetzung genau dieser Funktion gilt (`zustaendigeRolle`; führt das
    Gewerk eines Laufs die neue Bezeichnung schon, gehen seine Schritte an dessen Funktion), und – trägt
    im Projekt keine Funktion mehr den alten Namen – in den Projekt-Workflows, nicht in den
    übergreifenden (`workflowsMitAlterBezeichnung` nennt die Workflows, aus denen ein neuer
    Planlauf danach keine Funktion mehr fände; `updateRole` liefert ihre Zahl für die Kurzmeldung);
    `standardFunktionAendern` (hinter `updateStandardRolle`, liefert die Zahl der Workflows und
    Projekte) zieht ebenso die übergreifenden Workflows mit und – über `funktionAendern` – die
    Funktionen dieser Bezeichnung in den Projekten (in jedem Gewerk),
  * `domain/abgleich.ts` selektiver Abgleich mit einer Sicherung; Verweise zwischen Objekten
    stehen zentral in `VERWEISFELDER`. Funktionen ordnet er über die Kennung zu, dann über die
    Kennung ohne angehängtes „~Gewerk“ bei gleichem Gewerk (`kennungOhneGewerk`, auch für
    Löschvermerke), zuletzt über Projekt, Name und Gewerk; fehlende Gewerke ergänzt er nur, wenn
    sie mit dem Übernommenen hereinkommen (`verweiseBereinigen` – dann auch ein vorher gelöschtes,
    etwa mit einem als Kopie übernommenen Projekt),
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
  * `domain/pflichtenheft.ts` Pflichtenheft eines Projekts (`Project.pflichtenheft`, Reiter
    `pflichtenheft`, `pages/projekt/pflichtenheft/` – erstellt über den Assistenten
    `Assistent.tsx`, einmal je Projekt): mitgelieferte Vorlage je Geschäftsbereich
    (`domain/pflichtenheftVorlagen.ts`, `standardVorlage` – eigene Vorlagen gibt es nicht), Platzhalter aus Projekt- und
    Stammdaten (`platzhalterWerte`), Ansprechpartner allein aus den Funktionen des Projekts
    (`ansprechpartnerZeilen` – keine Personen im Pflichtenheft speichern), Ausgaben
    (`pflichtenheftStand` je Stelle, `aenderungenErmitteln`, Store `pflichtenheftAusgeben` –
    „Zuletzt geändert“ und Änderungsindex entstehen allein daraus, nicht von Hand; ein Vorabzug
    druckt nur, gekennzeichnet, und vermerkt nichts), Druckfassung
    (`pflichtenheftHtml`, eigene helle Gestaltung). Welche Stammdaten gelten, sagt
    `GESCHAEFTSBEREICHE` (`domain/types.ts`) – ein neuer Geschäftsbereich braucht dort einen
    Eintrag und eine Vorlage. Dazu `domain/ablaufDiagramm.ts` (Ablaufdiagramm
    eines Workflows als SVG, allein über `gliedern`) und `domain/plancodierung.ts` (Kataloge,
    `plancodePruefen` für die Planliste, Druckfassung; die Einträge einer Kategorie bleiben Text –
    der Editor `PlancodierungEditor.tsx`/`CodierungsKatalog.tsx` liest sie mit `eintraegeLesen` und
    schreibt sie mit `eintraegeSchreiben` verlustfrei zurück). Die G-Nummer (`Project.gNummer`) teilt das
    Register mit der Baubetriebsplanung (`RegisterProjekt.gNummer`, `null` = noch unbekannt),
    Mobil und OE der Kontakte ebenso (`PERSON_FELDER`),
  * `domain/seed.ts` mitgelieferte Funktionen (`STANDARD_ROLLEN` – aus dem Funktionskatalog, mit
    festen Kennungen `srol-…`; Farbe aus der Art, Seite aus `seiteAusArt` in `domain/types.ts`),
    Standard-Workflows (nennen Funktionen über die Konstanten `ROLLE_…`), E-Mail-Vorlagen,
    Demodaten (Läufe über die Engine, zufällige IDs; Funktionen über Bezeichnung + Gewerk gesucht),
  * `store/store.tsx` alle Schreibzugriffe (ein neues Projekt legt seine Funktionen mit **einem**
    `addRoles` an, nicht je Funktion ein `mutate`), `store/storage.ts` Laden, Speichern, Migration,
    `store/katalogUmstellung.ts` die Umstellung eines Bestands auf den Funktionskatalog
    (`funktionenAufKatalogUmstellen`, aus `stammdatenAktualisieren`): benennt Funktionen und alle
    Stellen um, die eine Funktion nur beim Namen nennen (Schritte, E-Mail-Regeln und
    Momentaufnahmen der Workflows und Planläufe, Pflichtenhefte und ihre Vorlagen – **eine neue
    Stelle, die einen Funktionsnamen speichert, dort nachtragen**), setzt die Art, ersetzt die
    Vorlagen durch Katalog + selbst Angelegtes und ergänzt in jedem Projekt die fehlenden
    Funktionen des Katalogs; nur beim Umstieg von einem Stand vor Stammdaten 7 entfallen dabei
    bisher mitgelieferte Funktionen, die der Katalog nicht mehr führt und die niemand ausfüllt
    (`BISHER_MITGELIEFERT`), und das Gewerk OSE. Kennungen und Besetzung bleiben; fällt eine
    umbenannte Funktion auf eine vorhandene, entscheidet die Besetzung (die unbesetzte entfällt –
    die bleibende übernimmt deren Seite, wenn sie keine hat; sind beide besetzt, behält die alte
    ihren früheren Namen – `registerSchluessel` lässt sie gegenüber dem Register trotzdem als die
    heutige gelten). Ergänzte Funktionen tragen **feste Kennungen** (`rol-<Projekt>-<Katalogeintrag>`,
    nicht `neueId`): Bestand, Sicherung und zweites Gerät vergeben dieselbe, sonst hielte der
    Abgleich Gelöschtes für neu. Ein Gewerk des Katalogs in anderer Schreibweise des Bestands
    bleibt ein Gewerk (`gewerkWieImBestand`). Zuletzt das **Netz**: Bekäme ein offener Schritt
    eines laufenden Planlaufs nach der Umstellung eine andere Person (zwei frühere Bezeichnungen
    sind jetzt dieselbe, und die besetzte Funktion des Gewerks gilt vor der übergreifenden), bleibt
    die bisherige an ihm stehen (`contactManuell`; erledigte Schritte fasst das Netz nicht an) – wer die Umstellung
    ändert, prüft je offenem Schritt, wer bisher an ihm stand (Person der gemeinten Funktion,
    `rolleFuerSchritt`), gegen `kontaktFuerRolleUndGewerk` danach – hatte er niemanden, gilt die
    neue Besetzung,
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
  Statuszuordnung in `Einstellungen.bbpStatus`, Projekte über die G-Nummer (`dbGNummer`) – Anmeldungen, die
  eine Projektnummer verbindet, bilden eine Projektgruppe, `projektGruppen`; einen anderen
  Status setzt `statusUebernehmen` in `domain/ablauf.ts` ohne Nachfolger-Prüfung, mit Vorstand
  zum Zurücknehmen; Seite `pages/BbpImport.tsx`, Route `import`, Menüpunkt „Excel-Import“ zwischen
  „Projekte“ und „Einstellungen“), daneben `domain/pzeImport.ts` Import aus PzE (Export der
  „Vorhaben Übersicht“, Kachel und Vorschau aus `usePzeImport` in `pages/PzeImport.tsx`; legt nur
  an, je Vorhaben und Fahrplanjahr eine Anmeldung mit der Bezeichnung als `vorhaben`, SKM oder MKM
  nach dem nächsten offenen Stichtag – `phaseNachFahrplanjahr` in `domain/fristen.ts`, ohne offenen
  Stichtag übersprungen; vorhanden ist, was Bezeichnung und Fahrplanjahr teilt;
  relevante Ersteller und Projektzuordnung merkt `Einstellungen.pzeErsteller`/`pzeProjekte`),
  `store/` mit eigenem Schlüssel `baubetrieb-planung.data.v1`. Workflows und Fristen stehen in der
  Seitenleiste unter der aufklappbaren Gruppe „Einstellungen“ (wie im Planlaufmanagement);
  „Status ändern“ ist `NachfolgerAuswahl` (Haken in `components/baubetrieb.css`, Präfix
  `bb-`; das Menü ist `AufklappMenue` aus `src/shared/menue.tsx`). Neue Felder dort über `DATEN_VERSION`
  (`baubetrieb/domain/types.ts`) und `migriere()` (`baubetrieb/store/storage.ts`). Die festen IDs
  der Standard-Status nicht ändern – `STATUS_AUS_NUMMER` ordnet ihnen ältere Stände zu. Stände
  bis Fassung 5 führten die KM-Runde in der Maßnahmenart; die Umstellung übernimmt sie nach
  `kmRunde` (`RUNDE_BIS_FASSUNG5` in `store/storage.ts`). Ein Projekt führt Bezeichnung,
  Projektnummer (verknüpft über das Register), G-Nummer (`dbGNummer`, für den Import),
  Fahrplanjahre, Inbetriebnahme und Bemerkung – Projektleiter, Hauptbearbeiter, erster
  Anmeldetermin (ca.) und Status der Betreuung sind seit Fassung 12 entfallen, die Prozessphase
  der ersten Anmeldung seit Fassung 15 (irreführend, ein Projekt hat Anmeldungen in mehreren
  Phasen); sie kommen nicht wieder hinein, ohne dass es verlangt wird. Phase und Frist der ersten
  Anmeldung liefert allein `ersteAnmeldung` (`domain/fristen.ts`) aus dem ersten Fahrplanjahr –
  der nächste offene Termin laut Richtlinie ab heute. Richtlinienfristen können ein
  Fenster von Jahren haben (`RilFrist.jahreVorherAb`; SKM 22.07. in N−9 bis N−5, MKM 17.02. in
  N−4 bis N−3): Das Datum liefert allein `rilDatum` mit Bezugstag – der Statuswechsel für die
  Terminfrist einer Anmeldung, heute für Anmeldebedarf und Erstanmeldung –, die Phase eines
  Fahrplanjahrs `phaseNachFahrplanjahr`; ein abgeschlossenes Projekt
  wird archiviert. „Übernehmen in Baubetriebsplanung“ öffnet `ProjektDialog` mit `uebernahme`
  (`pages/Projekte.tsx`): erst `addProjekt` mit der Kennung, dann `inBereichUebernehmen` mit
  derselben Kennung und den Stammdaten der Maske – in dieser Reihenfolge, sonst legte der
  Abgleich das Projekt ein zweites Mal mit Vorgabewerten an.
* `src/bereiche/projektsteuerung/` – gleich aufgebaut, Schlüssel `projektsteuerung.data.v1`:
  `domain/types.ts` Datenmodell (projektübergreifende `Funktion`, `Beteiligter` mit `funktionId`,
  `Protokoll`), `domain/protokoll.ts` Reihen, Folgeprotokoll, Löschen (`protokollLoeschen` –
  führt ein späteres Protokoll die Aufgaben schon weiter, `weitergefuehrtIn`, verweist das
  Vorprotokoll auf dieses), Übernahme aus dem Protokoll-Tool (`protokollToolLesen` je Datei,
  `ausProtokollTool` für alle gewählten Dateien gemeinsam – „weitergeführt in“ reicht über
  Dateigrenzen) und `teilnehmerNachziehen` (läuft nach jedem `mutate()` und hält Teilnehmende auf
  dem Stand der Projektbeteiligtenliste). „Verantwortlich“ (`wer`) ist nur Text: Den Wert bildet allein
  `zuordnung(t, alle)` – das Kürzel, führen es im Protokoll mehrere, der Name –, und ändert er
  sich für eine Person, zieht `werMitziehen` ihn an Einträgen, Ergänzungen und Vorständen mit
  (aus `teilnehmerNachziehen` und aus `protokollAendern` im Store; nicht bei getippten Angaben
  eines Gastes). `domain/beteiligteImport.ts` Excel-Import, `domain/punkte.ts` offene
  Aufgaben und Ampel, `domain/druck.ts` Druckfassungen. Eine Liste offener Punkte (LOP) gibt es
  nicht mehr; ältere Bestände verlieren sie beim Laden. Funktionen tragen eine Art (`art`, siehe
  Funktionskatalog) und ein Gewerk (`null` = übergreifend); in Auswahl, Protokoll, Druck und
  Meldungen steht `funktionsName`, in den beiden Listen (Funktionen, Projektbeteiligte) die
  Bezeichnung mit dem Gewerk als Abzeichen (`FunktionsZelle` in `components/common.tsx`).
  `STANDARD_FUNKTIONEN` und `STANDARD_GEWERKE` (`domain/seed.ts`) kommen aus dem Katalog;
  `ausFassung8` (`store/storage.ts`) stellt ältere Bestände um – umbenennen (gleichnamige
  Funktionen werden zu einer, ihre Personen gehen mit), Art setzen, Katalog ergänzen; **entfernt
  wird dort nichts**, Kürzel vorhandener Funktionen bleiben (die Protokolle nennen sie). Die
  Reihenfolge der Projektbeteiligten liefert allein `nachFunktion` (`pages/projekt/Beteiligte.tsx`:
  Art, Bezeichnung, Gewerk, Name) – für Liste, Druck, Excel und die Auswahl der Teilnehmenden. Ein Eintrag besteht aus `zeilen`; jede
  Zeile merkt sich ihr Ursprungsprotokoll (`herkunft`, im Druck „aus Prot. 1“). Eine Ergänzung mit
  eigener Art (`Zeile.typ` ≠ `null`) ist ein eigener Punkt unter dem Eintrag mit eigenem `wer`,
  `termin` und `status`; ohne Art läuft sie unter dem Ursprung mit. TOPs, Einträge und Zeilen
  werden standardmäßig gestrichen statt gelöscht (`entfaellt`) und entfallen im Folgeprotokoll;
  erledigte Aufgaben gehen noch einmal mit. Was ins Folgeprotokoll geht, entscheidet allein
  `uebernahme` mit `eintragUebernehmen` (`domain/protokoll.ts`). Aufgaben der Person unter
  „Angemeldet als“ (`Punkt.eigen`, `domain/punkte.ts`) sind bei der Übernahme in die To-Do-Liste
  vorgewählt; die Übersicht zeigt keine Aufgaben, sondern zählt die To-Do-Liste. Logos im
  Druckkopf führt jede Protokollreihe selbst oder erbt die des Projekts (`reihenLogos`,
  `logosFuer`). Die eigene **To-Do-Liste** (`todos`, `domain/todos.ts`) ist unabhängig von den
  Protokollen: `TodoListe` (`pages/Todos.tsx`) steht als Hauptpunkt „To-Do-Liste“ (Route `todos`)
  und als Reiter „To-Dos“ im Projekt (Filter über die Adresse vorwählbar, `TodoFilter` in
  `lib/router.ts` – so öffnen die Kacheln der Übersicht sie); ein gelöschtes
  Projekt lässt seine Aufgaben ohne Projekt stehen. Sie zeigt je Projekt eine schlanke Karte
  (`TodoGruppe`: Kopf ohne Zahlen, die Eingabezeile unter den vorhandenen Aufgaben erst nach
  „Neues To-Do“ – auf Wunsch ein blauer Knopf je Karte, bewusst abweichend von „ein Hauptknopf je
  Ansicht“; Karten am Kopf umordnen, eine leere Projektkarte über „Leere Karte entfernen“
  entfernen – „Ohne Projekt“ steht immer da und hat das Kreuz auf Wunsch nicht, ein Ausblenden
  von Karten mit Aufgaben gibt es auf Wunsch nicht mehr; gespeichert in
  `todoKarten` – Reihenfolge allein über `kartenOrdnen`/`kartenEinreihen` in `domain/todos.ts`);
  die Reihenfolge der Aufgaben ist die von `todos`
  (`todosTauschen`), nicht sortiert. Aus dem Protokoll übernimmt `todosAusProtokoll`
  (`todoAusAufgabe` mit `herkunft`); ob eine Aufgabe schon dort ist, sagt allein `inTodoListe` –
  den Status gleicht nichts ab. Erledigt wird in der To-Do-Liste mit
  `ErledigtHaken` (`components/erledigen.tsx`, der kleine Haken des Planlaufmanagements; daneben
  bei erledigten der Papierkorb, im Filter „Erledigt“ „Erledigte löschen“ über `todosLoeschen`); eine
  Zeile, die dadurch die Auswahl verlässt, hält `useNachlauf` kurz an ihrem Platz – gespeichert
  wird sofort, nicht erst danach. Die Klasse `ps-haken` gehört dem Kästchen „erledigt“ im
  Protokolleditor; der Knopf heißt `ps-erledigt-haken`. Der Zähler an „To-Do-Liste“ in der
  Seitenleiste (fällige und überfällige) ist auf Wunsch stets rot (`badgeAlarm`) wie die
  Projektzähler im Planlaufmanagement – nicht auf „nur bei Überfälligem“ zurückstellen. Eigene
  Gestaltung in `projektsteuerung.css` (Klassen mit Präfix `ps-`, nur Design-Tokens; weiß bleiben
  allein das Blatt der Druckansicht und die Logo-Kacheln). Neue Felder
  über `DATEN_VERSION` (`projektsteuerung/domain/types.ts`) und `migriere()`
  (`projektsteuerung/store/storage.ts`). IDs, die die Oberfläche braucht (Fokus, Navigation),
  vor `mutate()` erzeugen – im StrictMode läuft die Änderungsfunktion doppelt.

## Randbedingungen

* `src/shared/` enthält nur Bausteine ohne fachlichen Bezug und importiert nichts aus
  `src/bereiche/`. Die Bereiche greifen nicht aufeinander zu; gemeinsam nutzen sie nur
  `src/gemeinsam/` (importiert nichts aus `src/bereiche/`).
* **Angemeldet als** gilt für alle Bereiche: Name und Farbschema ändert nur
  `benutzerAendern` (`src/gemeinsam/benutzer.ts`); den Namen führen die Bereiche in ihrem
  Bestand nur als Spiegel (`bearbeiter` bzw. `einstellungen`) und ziehen ihn mit
  `useBenutzerAbgleich` nach. Das Farbschema (automatisch, hell, dunkel) steht **nur** in
  `kaplan-benutzer.v1` – es gehört zum Gerät, nicht in den Bestand eines Bereichs und nicht in
  eine Sicherung. Keine eigenen Dialoge „Angemeldet als“ in den Bereichen – `AngemeldetAls`
  verwenden. Das Farbschema setzt nur die Hülle (`src/shell/Shell.tsx`, aus
  `useBenutzer()`) – kein eigener Effekt auf `dataset.farbschema` in einer `App.tsx`.
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
  Fassung abweicht, und hebt jeden älteren Stand in einem Schritt auf die aktuelle – sie läuft
  also bei jeder neuen Fassung auch über schon Umgestelltes (`rollenAufteilen` teilt deshalb nur
  Funktionen des früheren Modells mit `gewerke`/`gewerkBezug` auf; Funktionen mit Feld `gewerk`
  behalten Kennung und Besetzung).
* Mitgelieferte Stammdaten geändert (Funktionskatalog, `STANDARD_TEMPLATES` in `seed.ts`)?
  **`STAMMDATEN_VERSION`** erhöhen, damit vorhandene Bestände sie übernehmen
  (`stammdatenAktualisieren`). Achtung: Das überschreibt die projektübergreifenden Funktionen
  gleichen Namens und Gewerks mit denen des Katalogs und stellt gelöschte mitgelieferte Funktionen
  (auch in Projekten) wieder her. Die **Standard-Workflows ersetzt es seit Fassung 7 nicht mehr**
  (nur ein Bestand vor Fassung 6 bekommt sie neu, selbst geänderte bleiben über `FINGERABDRUECKE`
  als Kopie; aus Fassung 6 werden sie nur umbenannt, damit Änderungen der Nutzer bleiben). Eine
  Fassung, die geänderte Standard-Workflows ausliefern soll, muss das in
  `stammdatenAktualisieren` wieder einschalten und braucht dafür einen Fingerabdruck der
  Fassung, die sie ablöst (samt E-Mail-Regeln).
* `window.planlaufGestartet` nicht umbenennen – `index.html` und `app/index.html` rufen ihn auf.
* Ob ein Eintrag einen eigenen Planlauf hat, entscheidet allein `hatEigenenPlanlauf`
  (`domain/types.ts`): Planverzeichnisse laufen gebündelt oder mit Plänen einzeln, Pläne lassen
  sich herauslösen und wieder bündeln.
* Neue Route: Typ `Route` sowie `routeToHash`/`hashToRoute` in `lib/router.ts` erweitern und in
  `App.tsx` rendern. Frühere Adressen bleiben per Umleitung gültig. Die Übersicht eines Bereichs
  steht unter dessen Adresse (`#/planlauf`, `#/baubetrieb`, `#/projektsteuerung`) – `routeToHash`
  liefert sie so, `#/planlauf/dashboard` und `#/projektsteuerung/uebersicht` bleiben gültig.
* Keine neuen Laufzeitabhängigkeiten ohne Rückfrage – Router, Excel-Import/-Export und PDF-Druck
  sind bewusst selbst geschrieben. Laufzeitabhängigkeiten sind `react`/`react-dom`,
  `framer-motion` (Bewegung) und `lucide-react` (Symbole); `tailwindcss` mit `@tailwindcss/vite`
  und die Schrift `@fontsource-variable/outfit` sind Entwicklungsabhängigkeiten, die in den Build
  eingehen.
* Gestaltung nach den [Designregeln](#designregeln-koralle-design); die Oberfläche bleibt bis etwa
  400 px Breite bedienbar, das dunkle Schema muss weiter funktionieren. Knopfleisten über
  Listen brechen um (`row wrap`). Eine Suche ohne Treffer ist kein leerer Bestand: eigener
  Leerzustand ohne Anlegen-Knopf („Keine Funktion gefunden“ / „Für diese Suche gibt es keinen
  Treffer.“). Ein volles Datum erscheint zweistellig als TT.MM.JJJJ (`formatDate` aus
  `src/shared/dates.ts`), nicht über `toLocaleDateString('de-DE')` ohne Angaben zur Stellenzahl.
* Sprache in Oberfläche, Bezeichnern, Kommentaren und Commit-Nachrichten ist Deutsch.

## Hinweise für Prüfungen im Browser

* Beim allerersten Aufruf nach `npm run dev` bereitet Vite die Abhängigkeiten auf; dauert das
  länger als 1,5 Sekunden, wechselt der Notausgang der `index.html` auf den eingecheckten Build
  unter `app/` – man sieht dann den Stand von `main`, nicht den eigenen. Die Adresse ohne `app/`
  noch einmal aufrufen.
* Hell oder dunkel: Mit der Vorgabe „Automatisch“ genügt in Playwright `colorScheme: 'dark'`
  im Kontext; fest wählt man es über `farbschema` (`hell`/`dunkel`) in `kaplan-benutzer.v1` oder im
  Dialog „Angemeldet als“.

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
* Projektsteuerung: Wer „Lena Roth“ einträgt, findet die Demo-Aufgaben der Protokolle bei „In die
  To-Do-Liste …“ vorgewählt; mit einem anderen Namen ist keine vorgewählt.
* „Angemeldet als“ liegt unter `kaplan-benutzer.v1` – wer es zurücksetzen will, löscht diesen
  Schlüssel.
