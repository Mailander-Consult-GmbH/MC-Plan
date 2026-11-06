/**
 * Einstiegspunkt des Bereichs „Projektsteuerung“: Projektbeteiligte mit
 * projektübergreifenden Funktionen und Besprechungsprotokolle je Projekt.
 * Eigener Speicherort, eigener Router; Name und Farbmodus kommen aus der
 * gemeinsamen Anmeldung („Angemeldet als“, src/gemeinsam/benutzer.ts).
 */
import { App } from './App';
import { StoreProvider } from './store/store';
import './projektsteuerung.css';

export function BereichProjektsteuerung() {
  return (
    <StoreProvider>
      <App />
    </StoreProvider>
  );
}
