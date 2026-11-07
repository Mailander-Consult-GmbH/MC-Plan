/**
 * Einstiegspunkt des Bereichs „Baubetriebsplanung“: baubetriebliche
 * Anmeldungen für Sperrpausen je Projekt verfolgen. Der Datenbestand des
 * Bereichs wird hier bereitgestellt – eigener Speicherort, eigene
 * Einstellungen (Vorlauf, Nachhaken, Fristen), eigener Router; Name und Farbmodus kommen
 * aus der gemeinsamen Anmeldung („Angemeldet als“, src/gemeinsam/benutzer.ts).
 */
import { App } from './App';
import { StoreProvider } from './store/store';

export function BereichBaubetrieb() {
  return (
    <StoreProvider>
      <App />
    </StoreProvider>
  );
}
