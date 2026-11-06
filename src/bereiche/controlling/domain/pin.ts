/**
 * Zugang zum Controlling über eine PIN. Das ist ein einfacher Schutz vor
 * versehentlichem Zugriff, keine Sicherheit: Die PIN steht im Quelltext, und
 * die Daten liegen ohnehin unverschlüsselt im Browser. Entsperrt bleibt das
 * Controlling bis zum Schließen des Fensters bzw. bis „Sperren“.
 */
export const CONTROLLING_PIN = '0000';

/** Merkt sich die Entsperrung für die Dauer der Sitzung (sessionStorage). */
const SCHLUESSEL = 'kaplan-controlling.entsperrt';

export function istEntsperrt(): boolean {
  try {
    return sessionStorage.getItem(SCHLUESSEL) === '1';
  } catch {
    return false;
  }
}

/** Entsperrt bei richtiger PIN; liefert, ob sie stimmte. */
export function entsperren(pin: string): boolean {
  if (pin.trim() !== CONTROLLING_PIN) return false;
  try {
    sessionStorage.setItem(SCHLUESSEL, '1');
  } catch {
    /* ohne sessionStorage gilt die Entsperrung nur bis zum Neuladen */
  }
  return true;
}

export function sperren(): void {
  try {
    sessionStorage.removeItem(SCHLUESSEL);
  } catch {
    /* nichts zu tun */
  }
}
