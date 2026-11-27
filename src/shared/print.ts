/**
 * Druckausgabe: Erzeugt ein eigenständiges HTML-Dokument und öffnet den
 * Druckdialog des Browsers. Dort lässt sich „Als PDF sichern“ wählen – so
 * entsteht die PDF-Fassung ohne zusätzliche Programmbibliothek. Eigene
 * Stilangaben ergänzen die Grundgestaltung.
 *
 * Mit `titelAlsDateiname` schlägt der Dialog den Titel als Dateinamen vor:
 * Chrome und Edge nehmen dafür den Titel des Fensters, nicht den des
 * Druckrahmens – er steht deshalb bis zum Ende des Drucks auch dort.
 */
export function druckeHtml(titel: string, inhalt: string, zusatzStil = '', { titelAlsDateiname = false } = {}): void {
  const rahmen = document.createElement('iframe');
  rahmen.setAttribute('aria-hidden', 'true');
  rahmen.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(rahmen);

  const dokument = rahmen.contentDocument;
  if (!dokument) {
    rahmen.remove();
    return;
  }

  dokument.open();
  dokument.write(htmlDokument(titel, inhalt, zusatzStil));
  dokument.close();

  const fensterTitel = document.title;
  let titelZurueck = () => {};
  if (titelAlsDateiname && dokument.title) {
    document.title = dokument.title;
    titelZurueck = () => {
      titelZurueck = () => {};
      // Nur zurückstellen, was der Druck gesetzt hat
      if (document.title === dokument.title) document.title = fensterTitel;
    };
    rahmen.contentWindow?.addEventListener('afterprint', () => titelZurueck());
  }

  const drucken = () => {
    rahmen.contentWindow?.focus();
    rahmen.contentWindow?.print();
    // Der Rahmen muss bis zum Ende des Druckdialogs bestehen bleiben.
    setTimeout(() => {
      titelZurueck();
      rahmen.remove();
    }, 60_000);
  };

  if (rahmen.contentWindow?.document.readyState === 'complete') drucken();
  else rahmen.onload = drucken;
}

/**
 * Schrift der Druckfassungen. Kopf- und Fußzeilen im Seitenrand (`@page`,
 * `@bottom-right` usw.) erben sie nicht vom Dokument – dort eigens angeben.
 */
export const DRUCK_SCHRIFT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

/**
 * Das vollständige HTML-Dokument der Druckausgabe – auch für eine Vorschau in
 * einem eingebetteten Rahmen (`srcDoc`), die dann genau so aussieht wie der Druck.
 */
export function htmlDokument(titel: string, inhalt: string, zusatzStil = ''): string {
  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><title>${titel}</title>
<style>
  @page { size: A4 landscape; margin: 14mm 12mm; }
  body { font-family: ${DRUCK_SCHRIFT};
         font-size: 9.5pt; color: #1d1d1f; margin: 0; }
  h1 { font-size: 15pt; margin: 0 0 2mm; }
  h2 { font-size: 11pt; margin: 6mm 0 2mm; page-break-after: avoid; }
  .kopf { border-bottom: 1px solid #c7c7cc; padding-bottom: 3mm; margin-bottom: 5mm; }
  .kopf .meta { color: #6e6e73; font-size: 9pt; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 4mm; }
  th { text-align: left; font-size: 8pt; text-transform: uppercase; letter-spacing: .03em;
       color: #6e6e73; border-bottom: 1px solid #c7c7cc; padding: 1.5mm 2mm; }
  td { padding: 1.5mm 2mm; border-bottom: 1px solid #ebebf0; vertical-align: top; }
  tr { page-break-inside: avoid; }
  .num { font-variant-numeric: tabular-nums; white-space: nowrap; }
  .ueberfaellig { color: #c9261c; font-weight: 600; }
  .erledigt { color: #248a3d; }
  .grau { color: #6e6e73; }
  .fuss { margin-top: 6mm; color: #8e8e93; font-size: 8pt; }
${zusatzStil}
</style></head><body>${inhalt}</body></html>`;
}

/**
 * Ob der Browser im Druck je Seite zwischen Hoch- und Querformat wechseln kann
 * (CSS-Eigenschaft `page` mit benannten Seiten) – Chrome und Edge können es.
 * Ohne diese Fähigkeit stünden Anlagen im Querformat auf Hochformatseiten.
 */
export function querformatImDruck(): boolean {
  return typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('page', 'quer');
}

const datenUrls = new Map<string, Promise<string>>();

/**
 * Eine Datei unter `public/` als `data:`-Adresse – für Bilder im Seitenrand
 * eines Drucks (`@page`), die der Browser sonst womöglich erst nach dem Öffnen
 * des Druckdialogs lädt. Leer, wenn sie sich nicht laden lässt; je Pfad nur
 * einmal geladen.
 */
export function bildAlsDatenUrl(pfad: string): Promise<string> {
  let ergebnis = datenUrls.get(pfad);
  if (!ergebnis) {
    ergebnis = fetch(`${import.meta.env.BASE_URL}${pfad}`)
      .then((antwort) => (antwort.ok ? antwort.blob() : Promise.reject(new Error(String(antwort.status)))))
      .then(
        (blob) =>
          new Promise<string>((fertig, fehler) => {
            const leser = new FileReader();
            leser.onload = () => fertig(String(leser.result));
            leser.onerror = () => fehler(leser.error);
            leser.readAsDataURL(blob);
          }),
      )
      .catch(() => {
        datenUrls.delete(pfad); // später erneut versuchen
        return '';
      });
    datenUrls.set(pfad, ergebnis);
  }
  return ergebnis;
}

/** Maskiert Text für die Ausgabe in HTML. */
export function html(wert: string | number | null | undefined): string {
  return String(wert ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
