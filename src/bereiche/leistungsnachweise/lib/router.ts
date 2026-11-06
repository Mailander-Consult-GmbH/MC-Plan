/**
 * Hash-Router des Bereichs – erlaubt Lesezeichen und Vor/Zurück im Browser.
 * Die Seiten des Bereichs liegen unter #/leistungsnachweise, die des
 * Controllings im Controlling-Bereich unter #/controlling/leistungsnachweise
 * (controlling.tsx); die Wahl des Bereichs selbst trifft die Shell.
 *
 * Im Bereich gibt es nur Übersicht, Projekte und je Projekt die eigenen
 * Leistungen. Leistungsnachweise und Einstellungen der Projekte liegen im
 * Controlling.
 *
 * Frühere Adressen bleiben gültig: #/leistungsnachweise/controlling/… führt in
 * den Controlling-Bereich, ebenso die Seite „Mitarbeiter“
 * (#/leistungsnachweise/mitarbeiter) und ein Nachweis
 * (#/leistungsnachweise/projekt/<id>/nachweis/<id>, jetzt die Abrechnung im
 * Controlling); …/projekt/<id>/<reiter> zeigt die Leistungen des Projekts.
 */
import { useEffect, useState } from 'react';
import type { ID } from '../domain/types';

/** Reiter eines Projekts im Controlling. */
export type ProjektTab = 'nachweise' | 'leistungen' | 'einstellungen';

/** Reiter des Controllings. */
export type ControllingTab = 'auswertung' | 'nachweise' | 'projekte' | 'mitarbeiter';

/** Seiten des Bereichs und des Controllings. */
export type Route =
  | { view: 'uebersicht' }
  | { view: 'projekte' }
  /** Projekt im Bereich: die eigenen Leistungen. */
  | { view: 'projekt'; projektId: ID }
  | { view: 'controlling'; tab: ControllingTab }
  /** Projekt im Controlling: Leistungsnachweise, Leistungen aller, Einstellungen. */
  | { view: 'controllingProjekt'; projektId: ID; tab: ProjektTab }
  /** Leistungsnachweis im Controlling (Leistungstexte, Aufschläge, Abschluss, Export). */
  | { view: 'abrechnung'; projektId: ID; nachweisId: ID };

/** Reiter eines Projekts im Controlling in ihrer Reihenfolge. */
export const TABS: ProjektTab[] = ['nachweise', 'leistungen', 'einstellungen'];

/** Reiter des Controllings in ihrer Reihenfolge. */
export const CONTROLLING_TABS: ControllingTab[] = ['auswertung', 'nachweise', 'projekte', 'mitarbeiter'];

/** Präfix aller Adressen dieses Bereichs. */
export const PREFIX = 'leistungsnachweise';

/** Präfix der Controlling-Ansichten im Controlling-Bereich. */
export const CONTROLLING_PREFIX = `controlling/${PREFIX}`;

/** Gehört die Seite dem Controlling? Der Bereich lenkt sie dorthin um. */
export function istControllingRoute(r: Route): boolean {
  return r.view === 'controlling' || r.view === 'controllingProjekt' || r.view === 'abrechnung';
}

/**
 * #/leistungsnachweise/projekt/<id>, sonst #/leistungsnachweise/<seite>; das
 * Controlling unter #/controlling/leistungsnachweise/<reiter>,
 * …/projekt/<id>/<reiter> bzw. …/projekt/<id>/nachweis/<id>.
 */
export function routeToHash(r: Route): string {
  switch (r.view) {
    case 'projekt':
      return `#/${PREFIX}/projekt/${r.projektId}`;
    case 'controlling':
      return `#/${CONTROLLING_PREFIX}/${r.tab}`;
    case 'controllingProjekt':
      return `#/${CONTROLLING_PREFIX}/projekt/${r.projektId}/${r.tab}`;
    case 'abrechnung':
      return `#/${CONTROLLING_PREFIX}/projekt/${r.projektId}/nachweis/${r.nachweisId}`;
    default:
      return `#/${PREFIX}/${r.view}`;
  }
}

/**
 * Liest eine Adresse; unbekannte und die anderer Bereiche führen zur Übersicht
 * (ohne Umlenkung – die Wahl des Bereichs trifft die Shell), das Controlling ohne
 * gültigen Reiter zur Auswertung, ein Projekt im Controlling ohne gültigen
 * Reiter zu seinen Leistungsnachweisen. Frühere Adressen siehe oben.
 */
export function hashToRoute(hash: string): Route {
  const alle = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  // Controlling-Bereich: #/controlling/leistungsnachweise/…
  if (alle[0] === 'controlling' && alle[1] === PREFIX) return controllingRoute(alle.slice(2));
  // Andere Adressen (etwa #/controlling/projekte, solange dieser Router noch
  // eingehängt ist) gehören nicht diesem Bereich: Übersicht, nichts umlenken.
  if (alle[0] !== PREFIX) return { view: 'uebersicht' };
  // Das Bereichspräfix gehört der Shell und wird hier übersprungen.
  const teile = alle.slice(1);
  // Frühere Adressen des Controllings im Bereich (#/leistungsnachweise/controlling/…)
  if (teile[0] === 'controlling') return controllingRoute(teile.slice(1));
  if (teile[0] === 'projekt' && teile[1]) {
    // Früher der gemeinsame Nachweis im Bereich – jetzt die Abrechnung im Controlling
    if (teile[2] === 'nachweis' && teile[3]) return { view: 'abrechnung', projektId: teile[1], nachweisId: teile[3] };
    return { view: 'projekt', projektId: teile[1] };
  }
  if (teile[0] === 'projekte') return { view: 'projekte' };
  // Frühere Seite „Mitarbeiter“ – jetzt ein Reiter des Controllings
  if (teile[0] === 'mitarbeiter') return { view: 'controlling', tab: 'mitarbeiter' };
  return { view: 'uebersicht' };
}

/** Seite des Controllings aus den Wegmarken nach dem Präfix; ohne gültigen Reiter die Auswertung. */
function controllingRoute(teile: string[]): Route {
  if (teile[0] === 'projekt' && teile[1]) {
    if (teile[2] === 'nachweis' && teile[3]) return { view: 'abrechnung', projektId: teile[1], nachweisId: teile[3] };
    const seite = teile[2] ?? '';
    const tab = (TABS as string[]).includes(seite) ? (seite as ProjektTab) : 'nachweise';
    return { view: 'controllingProjekt', projektId: teile[1], tab };
  }
  const reiter = teile[0] ?? '';
  return { view: 'controlling', tab: (CONTROLLING_TABS as string[]).includes(reiter) ? (reiter as ControllingTab) : 'auswertung' };
}

/** Aktuelle Seite und `navigate` – folgt Vor/Zurück im Browser. */
export function useRoute(): [Route, (r: Route) => void] {
  const [route, setRoute] = useState<Route>(() => hashToRoute(window.location.hash));

  useEffect(() => {
    const onHash = () => setRoute(hashToRoute(window.location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Die Seite wechselt sofort und nicht erst mit dem (verzögerten) hashchange –
  // sonst zeigt etwa das Löschen des geöffneten Nachweises kurz „Nicht gefunden“.
  const navigate = (r: Route) => {
    const hash = routeToHash(r);
    setRoute(r);
    if (window.location.hash !== hash) window.location.hash = hash;
  };

  return [route, navigate];
}
