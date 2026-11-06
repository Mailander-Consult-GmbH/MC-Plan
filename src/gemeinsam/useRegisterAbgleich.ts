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
 *    Projekte lösen, ★ übernehmen) gilt der Bestand nur beim ersten Abgleich
 *    nach dem Laden und nach `ersetzt()` – so nimmt ein zweites Fenster mit
 *    älterem Bestand nicht zurück, was das erste eben eingetragen hat. Damit
 *    es seinen Bestand gar nicht erst veraltet hält, lädt der Store ihn bei
 *    Änderungen aus einem anderen Fenster nach (`useFremdeAenderung`) und
 *    meldet vorher `ersetzt()`.
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

export function useRegisterAbgleich<D>(optionen: AbgleichOptionen<D>): { ersetzt: () => void } {
  const register = useRegister();
  const zustand = useRegisterZustand();
  const vorher = useRef<D | null>(null);
  const ersetzt = useRef(false);
  const erstmals = useRef(true);
  const aktuell = useRef(optionen);
  aktuell.current = optionen;

  useEffect(() => {
    const { bereich, daten, aktiv, sicht, anwenden } = aktuell.current;
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
  return { ersetzt: ersetztMelden };
}
