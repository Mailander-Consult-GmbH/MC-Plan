/**
 * Einstieg für den Controlling-Bereich von KaPlan: die Controlling-Ansichten
 * der Leistungsnachweise – zwei Seiten, je Menüpunkt des Controlling-Bereichs:
 * „Leistungsnachweise“ zeigt die Übersicht der Projekte
 * (pages/controlling/ProjektListe.tsx: Rhythmus und Raster wählen, aktueller
 * Leistungsnachweis mit Stand, Stunden und Bestätigungen; Sammel-Import aus
 * Excel, Neues Projekt), ein Projekt seine Seite (pages/controlling/Projekt.tsx)
 * mit dem Leistungsnachweis (Abrechnung.tsx: Mitarbeiter und Bestätigungen,
 * Texte, Aufschläge, Leistungsnachweis erstellen, Druck und Export);
 * „Auswertung“ die Stunden je Mitarbeiter, Monat und Projekt
 * (pages/controlling/Auswertung.tsx). Eine eigene Seite für Mitarbeiter gibt es
 * nicht: Wer unter „Angemeldet als“ steht, wird im Bereich als Mitarbeiter
 * geführt (domain/rechte.ts, `anmeldungAnwenden`), der Sammel-Import legt
 * Personen der Datei an.
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
 * bzw. …/auswertung, …/projekt/<id> und …/projekt/<id>/nachweis/<id>
 * (lib/router.ts).
 */
import { Callout } from '../../shared/ui';
import { SpeicherHinweis } from './components/SpeicherHinweis';
import { CONTROLLING_PREFIX, hashToRoute, useRoute, type ControllingTab, type Route } from './lib/router';
import { useNachObenBeiSeitenwechsel } from '../../shared/scrollen';
import { AuswertungAnsicht } from './pages/controlling/Auswertung';
import { ControllingProjekt } from './pages/controlling/Projekt';
import { ProjektListe } from './pages/controlling/ProjektListe';
import { StoreProvider, useStore } from './store/store';
import './leistungsnachweise.css';
import './pages/controlling/controlling.css';

/** Präfix der Adressen im Controlling-Bereich (ohne „#/“). */
export const LEISTUNGSNACHWEISE_CONTROLLING = CONTROLLING_PREFIX;

const UNTERTITEL: Record<ControllingTab, string> = {
  projekte: 'Projekte – Rhythmus, Raster, Stand der Leistungsnachweise und Bestätigungen',
  auswertung: 'Leistungsnachweise – Stunden je Mitarbeiter, Monat und Projekt',
};

/** Untertitel der Kopfzeile im Controlling-Bereich zur aktuellen Adresse. */
export function leistungsnachweiseUntertitel(hash: string): string {
  const route = hashToRoute(hash);
  if (route.view === 'abrechnung' || route.view === 'controllingProjekt') {
    return 'Projekt – Leistungsnachweis mit Texten, Aufschlägen und Bestätigungen erstellen';
  }
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
  // Eine neue Seite beginnt oben (src/shared/scrollen.ts)
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
        <ControllingProjekt key={route.projektId} projektId={route.projektId} nachweisId={route.nachweisId} navigate={navigate} />
      ) : route.view === 'controllingProjekt' ? (
        <ControllingProjekt key={route.projektId} projektId={route.projektId} navigate={navigate} />
      ) : route.view === 'controlling' && route.tab === 'auswertung' ? (
        <AuswertungAnsicht navigate={navigate} />
      ) : (
        <ProjektListe navigate={navigate} />
      )}
    </div>
  );
}

/** Kennung der Seite – ein anderer Nachweis desselben Projekts ist eine neue Seite. */
function seite(r: Route): string {
  switch (r.view) {
    case 'controlling':
      return `controlling/${r.tab}`;
    case 'controllingProjekt':
      return `projekt/${r.projektId}`;
    case 'abrechnung':
      return `projekt/${r.projektId}/${r.nachweisId}`;
    default:
      return r.view;
  }
}
