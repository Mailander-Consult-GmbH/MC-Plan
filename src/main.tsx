import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Zuerst die gemeinsame Gestaltung: Die Bereichs-CSS kommen mit der Shell und
// müssen danach stehen, damit ihre Regeln gleicher Spezifität gewinnen.
import './shared/global.css';
import { Shell } from './shell/Shell';
import { alteLesezeichenUmlenken } from './shell/router';
import { ToastProvider } from './shared/toast';
import { registriereServiceWorker } from './shared/pwa';
import { tabellenBreiteBeobachten } from './shared/tabellen';

// Dem Notausgang in index.html melden, dass die Anwendung läuft.
declare global {
  interface Window {
    planlaufGestartet?: () => void;
  }
}
window.planlaufGestartet?.();

// Lesezeichen aus der Fassung ohne Bereiche gelten weiter – vor dem ersten
// Rendern umlenken, damit die Shell schon die neue Adresse liest.
alteLesezeichenUmlenken();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <Shell />
    </ToastProvider>
  </StrictMode>,
);

registriereServiceWorker();
tabellenBreiteBeobachten();
