/**
 * Einstiegspunkt des Bereichs „Leistungsnachweise“: Jede angemeldete Person
 * erfasst ihre eigenen Leistungen je Projekt – von Hand oder per Excel-Import
 * aus der Zeiterfassung –, verfasst je Zeitraum mit den anderen Beteiligten
 * den gemeinsamen Leistungstext und bestätigt ihre Monate; daraus entstehen
 * gemeinsame tages-, wochen- oder monatsscharfe Leistungsnachweise für den
 * Auftraggeber. Abschluss, Aufschläge, Export und Auswertung übernimmt das
 * Controlling. Eigener Speicherort, eigener Router; Name und Farbmodus kommen
 * aus der gemeinsamen Anmeldung („Angemeldet als“, src/gemeinsam/benutzer.ts) –
 * eine eigene Anmeldung gibt es nicht, eine fehlende Person legt der Store an.
 */
import { App } from './App';
import { StoreProvider } from './store/store';
import './leistungsnachweise.css';

export function BereichLeistungsnachweise() {
  return (
    <StoreProvider>
      <App />
    </StoreProvider>
  );
}
