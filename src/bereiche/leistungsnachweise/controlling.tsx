/**
 * Einstieg für den Controlling-Bereich von KaPlan: die Controlling-Ansichten
 * der Leistungsnachweise – Auswertung, Leistungsnachweise mit Abrechnung
 * (Leistungstexte, Aufschläge, Abschluss, Druck und Export), Projekte mit
 * ihren Einstellungen, Mitarbeiter und der Sammel-Import aus Excel. Sie arbeiten auf dem Bestand dieses Bereichs mit
 * dem Zugang 'controlling' (domain/rechte.ts) – eine Anmeldung als
 * Mitarbeiter ist nicht nötig, und angelegt wird hier niemand; die PIN fragt
 * der Controlling-Bereich ab. Ist die Person unter „Angemeldet als“
 * Mitarbeiter, gilt sie auch hier als angemeldet (eigene Leistungen beim
 * Löschen eines Nachweises mitlöschen; im Sammel-Import lassen sich ihr
 * Zeilen ohne Mitarbeiter zuordnen).
 *
 * Der Controlling-Bereich bindet nur dieses Modul ein (die Bereiche greifen
 * sonst nicht aufeinander zu). Adressen: #/controlling/leistungsnachweise/<reiter>
 * bzw. …/projekt/<id>/<reiter> und …/projekt/<id>/nachweis/<id> (lib/router.ts).
 */
import { useState } from 'react';
import { Icon } from '../../shared/icons';
import { Callout } from '../../shared/ui';
import { ImportDialog } from './components/ImportDialog';
import { SpeicherHinweis } from './components/SpeicherHinweis';
import { CONTROLLING_PREFIX, hashToRoute, useRoute, type ControllingTab, type Route } from './lib/router';
import { useNachObenBeiSeitenwechsel } from '../../shared/scrollen';
import { Abrechnung } from './pages/controlling/Abrechnung';
import { Controlling } from './pages/controlling/Controlling';
import { ControllingProjekt } from './pages/controlling/Projekt';
import { StoreProvider, useStore } from './store/store';
import './leistungsnachweise.css';

/** Präfix der Adressen im Controlling-Bereich (ohne „#/“). */
export const LEISTUNGSNACHWEISE_CONTROLLING = CONTROLLING_PREFIX;

const UNTERTITEL: Record<ControllingTab, string> = {
  auswertung: 'Auswertung – Stunden je Mitarbeiter und Projekt',
  nachweise: 'Leistungsnachweise aller Projekte – Abrechnung, Abschluss und Export',
  projekte: 'Projekte – Leistungsnachweise, Leistungen und Einstellungen je Projekt',
  mitarbeiter: 'Mitarbeiter verwalten',
};

/** Untertitel der Kopfzeile im Controlling-Bereich zur aktuellen Adresse. */
export function leistungsnachweiseUntertitel(hash: string): string {
  const route = hashToRoute(hash);
  if (route.view === 'abrechnung') return 'Leistungsnachweis – Leistungstexte, Aufschläge, Abschluss und Export';
  if (route.view === 'controllingProjekt') return 'Projekt – Leistungsnachweise, Leistungen und Einstellungen';
  return route.view === 'controlling' ? UNTERTITEL[route.tab] : UNTERTITEL.auswertung;
}

/** Controlling der Leistungsnachweise – mit eigenem Store im Zugang 'controlling'. */
export function LeistungsnachweiseControlling() {
  return (
    <StoreProvider zugang="controlling">
      <Rahmen />
    </StoreProvider>
  );
}

function Rahmen() {
  const { ladeZustand } = useStore();
  const [route, navigate] = useRoute();
  const [importOffen, setImportOffen] = useState(false);
  // Eine neue Seite beginnt oben – der Reiter eines Projekts ist keine neue Seite (src/shared/scrollen.ts)
  const oben = useNachObenBeiSeitenwechsel<HTMLDivElement>(seite(route));

  return (
    <div className="stack ln-app" ref={oben}>
      {ladeZustand !== 'ok' ? (
        <Callout ton="error" icon="!">
          Der gespeicherte Stand der Leistungsnachweise ließ sich nicht laden bzw. stammt aus einer neueren Fassung.
          Angezeigt werden Demodaten, gespeichert wird nichts – Hinweise dazu im Bereich Leistungsnachweise.
        </Callout>
      ) : null}
      <SpeicherHinweis />

      {route.view === 'abrechnung' ? (
        <Abrechnung key={route.nachweisId} projektId={route.projektId} nachweisId={route.nachweisId} navigate={navigate} />
      ) : route.view === 'controllingProjekt' ? (
        <ControllingProjekt key={route.projektId} projektId={route.projektId} tab={route.tab} navigate={navigate} />
      ) : (
        <>
          <div className="row-between wrap">
            <p className="small muted" style={{ margin: 0, maxWidth: 640 }}>
              Die Mitarbeiter erfassen ihre Leistungen im Bereich Leistungsnachweise; hier werden die Nachweise
              abgerechnet, abgeschlossen und exportiert.
            </p>
            <button
              type="button"
              className="btn btn-outline"
              title="Sammel-Export der Zeiterfassung: Leistungen aller Mitarbeiter der Datei übernehmen"
              onClick={() => setImportOffen(true)}
            >
              <Icon name="importieren" size={14} /> Excel-Import (alle Mitarbeiter)
            </button>
          </div>
          <Controlling tab={route.view === 'controlling' ? route.tab : 'auswertung'} navigate={navigate} />
        </>
      )}

      {importOffen ? <ImportDialog onClose={() => setImportOffen(false)} navigate={navigate} /> : null}
    </div>
  );
}

/** Kennung der Seite ohne den Reiter eines Projekts. */
function seite(r: Route): string {
  switch (r.view) {
    case 'controlling':
      return `controlling/${r.tab}`;
    case 'controllingProjekt':
      return `projekt/${r.projektId}`;
    case 'abrechnung':
      return `nachweis/${r.nachweisId}`;
    default:
      return r.view;
  }
}
