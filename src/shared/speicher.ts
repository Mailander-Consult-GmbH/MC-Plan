/**
 * Rohkopien im `localStorage` – fachfrei, für jeden Speicherschlüssel.
 *
 * Eine Rohkopie ist der gespeicherte Text eines Schlüssels, unverändert unter
 * einem Nebenschlüssel abgelegt: `<Schlüssel>.vor-fassung-<n>` vor einer
 * Umstellung auf eine neue Fassung, `<Schlüssel>.vor-einspielen-<Zeitpunkt>`
 * vor dem Einspielen einer Sicherung über einen unlesbaren Stand. Sie bleibt,
 * solange der Speicher reicht: Wird er knapp, gibt sie Platz für den Bestand –
 * gleich, wer sie angelegt hat, denn ein Bereich, der nicht speichern kann,
 * wiegt schwerer als eine fehlende Kopie.
 */

/** Der Speicher des Browsers ist voll. */
export function speicherVoll(err: unknown): boolean {
  if (!(err instanceof DOMException)) return false;
  return err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED' || err.code === 22 || err.code === 1014;
}

/** `<Schlüssel>.vor-fassung-<n>` bzw. `<Schlüssel>.vor-einspielen-<ISO-Zeitpunkt>`. */
const ROHKOPIE = /^(.+)\.vor-(?:fassung-(\d+)|einspielen-(\d{4}-\d{2}-\d{2}T[\d:.]+Z))$/;

/**
 * Die Rohkopien in der Reihenfolge, in der sie Platz machen: zuerst die vor
 * einer Umstellung – der umgestellte Stand steht ja im Schlüssel selbst –, die
 * von `schluessel` vor denen anderer; dann die vor dem Einspielen, die älteste
 * zuerst.
 */
export function rohkopienZumRaeumen(schluessel: string): string[] {
  const kopien: { k: string; rang: number; zeit: string }[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    const m = k === null ? null : ROHKOPIE.exec(k);
    if (!k || !m) continue;
    if (m[3] !== undefined) kopien.push({ k, rang: 2, zeit: m[3] });
    else kopien.push({ k, rang: m[1] === schluessel ? 0 : 1, zeit: '' });
  }
  return kopien.sort((a, b) => a.rang - b.rang || a.zeit.localeCompare(b.zeit)).map((x) => x.k);
}

/**
 * Speichert `text` unter `schluessel`, nachdem das am vollen Speicher
 * gescheitert ist: entfernt die Rohkopien einzeln (`rohkopienZumRaeumen`) und
 * versucht es nach jeder erneut – es fallen also nur so viele, wie nötig.
 * Passt der Text auch ohne alle Rohkopien nicht, kommen sie zurück: Dann hilft
 * das Räumen nicht, und die Kopien sollen nicht umsonst verloren sein.
 * Liefert, ob der Text gespeichert ist; wirft, wenn der Speicher aus einem
 * anderen Grund nicht nutzbar ist.
 */
export function nachRaeumenSpeichern(schluessel: string, text: string): boolean {
  const entfernt: [string, string][] = [];
  let gespeichert = false;
  try {
    for (const kopie of rohkopienZumRaeumen(schluessel)) {
      const wert = localStorage.getItem(kopie);
      localStorage.removeItem(kopie);
      if (wert !== null) entfernt.push([kopie, wert]);
      try {
        localStorage.setItem(schluessel, text);
        gespeichert = true;
        return true;
      } catch (err) {
        if (!speicherVoll(err)) throw err;
      }
    }
    return false;
  } finally {
    // Nicht gespeichert: Die geräumten Kopien passen wieder hinein, der Bestand ist ja unverändert
    if (!gespeichert) zurueckstellen(entfernt);
  }
}

function zurueckstellen(kopien: [string, string][]) {
  for (const [k, v] of kopien) {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* passt nicht mehr – dann bleibt sie entfernt */
    }
  }
}

/**
 * Ergebnis von `rohkopieVorEinspielen`: Kopie angelegt, kein lesbarer Stand
 * vorhanden (nichts zu kopieren) oder gescheitert – meist, weil der Speicher
 * nicht reicht.
 */
export type RohkopieErgebnis = 'angelegt' | 'kein-stand' | 'gescheitert';

/**
 * Legt den unter `schluessel` gespeicherten Text unverändert als
 * `<Schlüssel>.vor-einspielen-<Zeitpunkt>` ab (ISO-Zeitpunkt, UTC) – bevor eine
 * Sicherung einen Stand ersetzt, der sich nicht laden ließ.
 */
export function rohkopieVorEinspielen(schluessel: string): RohkopieErgebnis {
  let roh: string | null;
  try {
    roh = localStorage.getItem(schluessel);
  } catch {
    return 'kein-stand';
  }
  if (roh === null) return 'kein-stand';
  try {
    localStorage.setItem(`${schluessel}.vor-einspielen-${new Date().toISOString()}`, roh);
    return 'angelegt';
  } catch {
    return 'gescheitert';
  }
}
