/**
 * Einstieg für den Controlling-Bereich von KaPlan: die Controlling-Ansichten
 * der Leistungsnachweise – ohne Reiter, je Menüpunkt des Controlling-Bereichs
 * eine Seite: „Leistungsnachweise“ zeigt die Projekte
 * (pages/controlling/ProjektListe.tsx: Raster wählen, Leistungsnachweis
 * erstellen, Sammel-Import aus Excel, Neues Projekt), „Auswertung“ die Stunden
 * je Mitarbeiter, Monat und Projekt (pages/controlling/Auswertung.tsx). Ein
 * Projekt öffnet seine Leistungsnachweise, Leistungen und Einstellungen
 * (pages/controlling/Projekt.tsx), ein Nachweis die Abrechnung mit
 * Leistungstexten, Aufschlägen, Bestätigungen der Mitarbeiter, Abschluss,
 * Druck und Export. Eine eigene Seite für Mitarbeiter gibt es nicht mehr: Wer
 * unter „Angemeldet als“ steht, wird im Bereich als Mitarbeiter geführt
 * (domain/rechte.ts, `anmeldungAnwenden`), der Sammel-Import legt Personen
 * der Datei an.
 *
 * Sie arbeiten auf dem Bestand dieses Bereichs mit dem Zugang 'controlling'
 * (domain/rechte.ts) – eine Anmeldung als Mitarbeiter ist nicht nötig, und
 * angelegt wird hier niemand; die PIN fragt der Controlling-Bereich ab. Ist
 * die Person unter „Angemeldet als“ Mitarbeiter, gilt sie auch hier als
 * angemeldet (eigene Leistungen beim Löschen eines Nachweises mitlöschen; im
 * Sammel-Import lassen sich ihr Zeilen ohne Mitarbeiter zuordnen).
 *
 * Der Controlling-Bereich bindet nur dieses Modul ein (die Bereiche greifen
 * sonst nicht aufeinander zu). Adressen: #/controlling/leistungsnachweise/projekte
 * bzw. …/auswertung, …/projekt/<id>/<reiter> und …/projekt/<id>/nachweis/<id>
 * (lib/router.ts).
 */
import { Callout } from '../../shared/ui';
import { SpeicherHinweis } from './components/SpeicherHinweis';
import { CONTROLLING_PREFIX, hashToRoute, useRoute, type ControllingTab, type Route } from './lib/router';
import { useNachObenBeiSeitenwechsel } from '../../shared/scrollen';
import { Abrechnung } from './pages/controlling/Abrechnung';
import { AuswertungAnsicht } from './pages/controlling/Auswertung';
import { ControllingProjekt } from './pages/controlling/Projekt';
import { ProjektListe } from './pages/controlling/ProjektListe';
import { StoreProvider, useStore } from './store/store';
import './leistungsnachweise.css';
import './pages/controlling/controlling.css';

/** Präfix der Adressen im Controlling-Bereich (ohne „#/“). */
export const LEISTUNGSNACHWEISE_CONTROLLING = CONTROLLING_PREFIX;

const UNTERTITEL: Record<ControllingTab, string> = {
  projekte: 'Projekte – Raster, Leistungsnachweise erstellen, abrechnen und exportieren',
  auswertung: 'Leistungsnachweise – Stunden je Mitarbeiter, Monat und Projekt',
};

/** Untertitel der Kopfzeile im Controlling-Bereich zur aktuellen Adresse. */
export function leistungsnachweiseUntertitel(hash: string): string {
  const route = hashToRoute(hash);
  if (route.view === 'abrechnung') return 'Leistungsnachweis – Leistungstexte, Aufschläge, Abschluss und Export';
  if (route.view === 'controllingProjekt') return 'Projekt – Leistungsnachweise, Leistungen und Einstellungen';
  return route.view === 'controlling' ? UNTERTITEL[route.tab] : UNTERTITEL.projekte;
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
      ) : route.view === 'controlling' && route.tab === 'auswertung' ? (
        <AuswertungAnsicht navigate={navigate} />
      ) : (
        <ProjektListe navigate={navigate} />
      )}
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
