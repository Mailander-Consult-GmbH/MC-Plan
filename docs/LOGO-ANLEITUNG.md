# KaPlan Logo „Planebenen“ – Einbindung

Dieses Verzeichnis enthält das neue Logo von KaPlan. Bitte binde es wie unten beschrieben in die Website ein. Die Dateien in diesem Ordner sind die Referenz und sollen nicht verändert werden.

## Konzept

Das Symbol besteht aus drei isometrischen Ebenen. Jede Ebene steht für einen Arbeitsbereich:

| Ebene  | ID im SVG    | Arbeitsbereich      |
|--------|--------------|---------------------|
| oben   | `planlauf`   | Planlaufmanagement  |
| mitte  | `baubetrieb` | Baubetriebsplanung  |
| unten  | `projekt`    | Projektsteuerung    |

Es gibt vier Zustände:

- **neutral** (Startseite, kein Bereich gewählt): alle drei Ebenen in Blautönen, hell nach dunkel. Schriftzug „KaPlan“ ohne Unterzeile.
- **planlauf / baubetrieb / projekt**: Die Ebene des aktiven Bereichs ist blau, die anderen beiden grau. Unter „KaPlan“ steht der Name des Bereichs.

## Farben

| Rolle                  | Hell      | Dunkel    |
|------------------------|-----------|-----------|
| Aktiv                  | `#1F3F6B` | `#7FA6DD` |
| Inaktiv                | `#C3C7CB` | `#454C55` |
| Neutral oben           | `#6286BA` | `#B3CBEE` |
| Neutral mitte          | `#30588C` | `#7FA6DD` |
| Neutral unten          | `#1F3F6B` | `#5A82BD` |
| Schrift                | `#3A4049` | `#E6E8EB` |

## Geometrie des Symbols (viewBox `0 0 48 48`)

```svg
<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
  <polygon id="planlauf"   points="24,5 42,14 24,23 6,14" />
  <polygon id="baubetrieb" points="6,19.5 24,28.5 42,19.5 42,24.5 24,33.5 6,24.5" />
  <polygon id="projekt"    points="6,30 24,39 42,30 42,35 24,44 6,35" />
</svg>
```

Jedes Polygon bekommt `stroke` in derselben Farbe wie `fill`, `stroke-width="1.5"` und `stroke-linejoin="round"` (für leicht gerundete Ecken).

## Schriftzug

- Schrift: **Outfit** (Google Fonts, OFL-Lizenz). „KaPlan“ in Gewicht 600, Unterzeile in Gewicht 300.
- „KaPlan“: `letter-spacing: -0.01em`.
- Unterzeile: Schriftgröße = **0,332 × Schriftgröße von „KaPlan“**. Damit ist die längste Unterzeile („Planlaufmanagement“) genau so breit wie „KaPlan“. Alle drei Unterzeilen nutzen dieselbe Größe, keine wird einzeln angepasst.
- Abstand Symbol zu Schrift: ca. 0,19 × Symbolhöhe.
- In `logo/` liegen fertige Logos, bei denen die Schrift bereits in Pfade umgewandelt ist. Sie sind die visuelle Referenz.

## Aufgaben

1. **Dateien übernehmen:** Kopiere die Inhalte dieses Ordners an die passende Stelle für statische Assets im Projekt (z. B. `public/` oder `static/`). Lege Favicons dort ab, wo das Projekt sie erwartet.

2. **Logo-Komponente bauen:** Erstelle eine wiederverwendbare Logo-Komponente passend zum Framework des Projekts, mit einem Parameter für den Zustand (`neutral | planlauf | baubetrieb | projekt`). Das Symbol bitte als **Inline-SVG** mit den Polygonen oben einbinden (nicht als `<img>`), damit sich die Farben per CSS umschalten lassen. Verwende dafür CSS-Variablen und unterstütze helle und dunkle Darstellung, falls das Projekt einen Dark Mode hat. Der Schriftzug wird als echter Text mit Outfit gesetzt (Regeln siehe oben). Optional: eine Variante „nur Symbol“ für enge Stellen.

3. **Zustand verknüpfen:** Die Komponente soll den Zustand aus dem aktuell aktiven Arbeitsbereich der Anwendung beziehen. Auf der Startseite bzw. ohne gewählten Bereich: `neutral`.

4. **Favicon und Icons einbinden:** Das Favicon ist immer neutral und wechselt nicht mit dem Bereich.
   ```html
   <link rel="icon" href="/favicon.ico" sizes="48x48">
   <link rel="icon" href="/favicon.svg" type="image/svg+xml">
   <link rel="apple-touch-icon" href="/apple-touch-icon.png">
   <link rel="manifest" href="/site.webmanifest">
   ```
   `favicon.svg` passt sich über eine Media Query selbst an den Dark Mode des Browsers an. Falls es noch kein Web-Manifest gibt, lege eines an mit `icon-192.png`, `icon-512.png` und `icon-maskable-512.png` (`"purpose": "maskable"`), `theme_color` `#1F3F6B`.

5. **Altes Logo entfernen:** Ersetze alle Stellen, an denen das bisherige dreiteilige Dreieck-Logo verwendet wird, und entferne die alten Logo-Dateien, sofern sie nirgends mehr gebraucht werden.

6. **Prüfen:** Zeige mir am Ende, wo das Logo überall verwendet wird, und prüfe alle vier Zustände in hell und dunkel.

## Dateiübersicht

- `symbol/` – nur Symbol, alle vier Zustände, hell und `-dark`
- `logo/` – Symbol mit Schriftzug (Schrift als Pfade), alle vier Zustände, hell und `-dark`
- `favicon/favicon.svg`, `favicon.ico`, `favicon-32.png` – Browser-Tab
- `favicon/apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `app-icon.svg` – App- und Taskleisten-Icons (dunkelblaue Kachel mit weißen Ebenen)
