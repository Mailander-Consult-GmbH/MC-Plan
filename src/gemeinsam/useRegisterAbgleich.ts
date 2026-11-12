/**
 * Bindet den Store eines Bereichs an das Projektregister. Nach jeder Änderung
 * des Bestands (und wenn sich das Register ändert) gilt:
 *
 * 1. Was sich im Bereich geändert hat, geht ins Register (`uebertragen`) –
 *    außer nach „Sicherung einspielen“ bzw. „Zurücksetzen“ (`ersetzt()`): Ein
 *    eingespielter Stand ist keine Änderung, die andere Bereiche nachziehen
 *    sollen; dort gilt das Register.
 * 2. Unbekanntes trägt der Bereich ins Register ein, und was das Register
 *    Neues kennt, übernimmt er über sein eigenes `mutate()` (`abgleichen`,
 *    Plan → `anwenden`). Als maßgeblich (`vollstaendig`: nicht mehr geführte
 *    Projekte lösen) gilt der Bestand nur beim ersten Abgleich
 *    nach dem Laden und nach `ersetzt()` – so nimmt ein zweites Fenster mit
 *    älterem Bestand nicht zurück, was das erste eben eingetragen hat.
 *
 * Damit ein Fenster seinen Bestand gar nicht erst veraltet hält, lädt der Store
 * ihn nach, wenn ein anderes Fenster ihn speichert (`useFremdeAenderung`), und
 * meldet den nachgeladenen Stand vorher mit `nachgeladen(daten)`. Diesen Stand
 * überträgt und gleicht der Hook nicht ab, er merkt ihn sich nur als
 * Ausgangspunkt für die nächste eigene Änderung: Das andere Fenster hat ihn
 * schon übertragen und abgeglichen. Sein Register-Ereignis kommt als eigenes
 * `storage`-Ereignis, oft erst nach dem Nachladen – bis dahin sieht dieses
 * Fenster den neuen Bestand neben dem alten Register, und ein Abgleich würde
 * Umbenennungen zurücknehmen und gelöschte Personen wieder anlegen. Ändert
 * sich danach das Register, gleicht der Hook mit beiden aktuellen Ständen ab
 * (nicht `vollstaendig`). Folgt kein Register-Ereignis, hat das andere Fenster
 * das Register nicht geändert: Sein Abgleich desselben Bestands mit demselben
 * Register ergab nichts, hier ergäbe er dasselbe; hätte er etwas ergeben, käme
 * der danach gespeicherte Bestand wieder hier an.
 *
 * Der Abgleich ruht, solange der Bereich seinen gespeicherten Stand nicht lesen
 * konnte (`aktiv` = false) oder das Register nicht lesbar ist.
 */
import { useCallback, useEffect, useRef } from 'react';
import { abgleichen, planLeer, uebertragen, type Plan, type Sicht } from './abgleich';
import { registerAendern, useRegister, useRegisterZustand, type ProjektBereich } from './register';

export interface AbgleichOptionen<D> {
  bereich: ProjektBereich;
  daten: D;
  /** Nur bei true wird abgeglichen (etwa: Ladezustand des Bereichs „ok“). */
  aktiv: boolean;
  sicht: (d: D) => Sicht;
  /** Übernimmt den Plan über das `mutate()` des Bereichs; ändert der Plan nichts, bleibt der Bestand derselbe. */
  anwenden: (plan: Plan) => void;
}

export interface RegisterAbgleich<D> {
  /** Vor dem Einspielen bzw. Zurücksetzen melden: Der neue Stand gilt als maßgeblich und wird nicht übertragen. */
  ersetzt: () => void;
  /**
   * Vor dem Übernehmen eines Stands melden, den ein anderes Fenster gespeichert
   * hat – mit genau dem Objekt, das danach der Bestand wird.
   */
  nachgeladen: (daten: D) => void;
}

export function useRegisterAbgleich<D>(optionen: AbgleichOptionen<D>): RegisterAbgleich<D> {
  const register = useRegister();
  const zustand = useRegisterZustand();
  const vorher = useRef<D | null>(null);
  const ersetzt = useRef(false);
  // Stand aus einem anderen Fenster, der noch nicht als Bestand angekommen ist
  const fremd = useRef<D | null>(null);
  const erstmals = useRef(true);
  const aktuell = useRef(optionen);
  aktuell.current = optionen;

  useEffect(() => {
    const { bereich, daten, aktiv, sicht, anwenden } = aktuell.current;
    // Nachgeladen: nur als Ausgangspunkt vermerken (siehe oben). Ein noch
    // offenes `ersetzt()` gilt nicht mehr – der eingespielte Stand ist ersetzt.
    if (fremd.current !== null && daten === fremd.current) {
      fremd.current = null;
      ersetzt.current = false;
      vorher.current = daten;
      return;
    }
    if (!aktiv || zustand !== 'ok') {
      vorher.current = daten;
      return;
    }
    const alt = vorher.current;
    vorher.current = daten;
    const geaendert = alt !== null && alt !== daten;
    const eingespielt = geaendert && ersetzt.current;
    if (geaendert) ersetzt.current = false;

    const vollstaendig = erstmals.current || eingespielt;
    erstmals.current = false;

    const jetzt = new Date().toISOString();
    const neueSicht = sicht(daten);
    let plan: Plan | null = null;
    registerAendern((r) => {
      const stand = geaendert && !eingespielt ? uebertragen(bereich, sicht(alt as D), neueSicht, r, jetzt) : r;
      const ergebnis = abgleichen(bereich, neueSicht, stand, jetzt, vollstaendig);
      plan = ergebnis.plan;
      return ergebnis.register;
    });
    const zuTun = plan as Plan | null;
    if (zuTun && !planLeer(zuTun)) anwenden(zuTun);
  }, [optionen.daten, optionen.aktiv, register, zustand]);

  const ersetztMelden = useCallback(() => {
    ersetzt.current = true;
  }, []);
  const nachgeladenMelden = useCallback((daten: D) => {
    fremd.current = daten;
  }, []);
  return { ersetzt: ersetztMelden, nachgeladen: nachgeladenMelden };
}
