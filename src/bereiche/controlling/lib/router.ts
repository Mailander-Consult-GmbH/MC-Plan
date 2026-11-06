/**
 * Hash-Router des Controllings. Alle Adressen liegen unter dem Bereichspräfix
 * #/controlling; die Wahl des Bereichs selbst trifft die Shell.
 *
 *   #/controlling/projekte              laufende Projekte
 *   #/controlling/archiv                im Controlling archivierte Projekte
 *   #/controlling/leistungsnachweise/…  Controlling der Leistungsnachweise – die
 *                                       Wegmarken dahinter liest der Bereich
 *                                       Leistungsnachweise (controlling.tsx)
 */
import { useEffect, useState } from 'react';

export type Route = { view: 'projekte' } | { view: 'archiv' } | { view: 'leistungsnachweise' };

export const PREFIX = 'controlling';

export function routeToHash(r: Route): string {
  if (r.view === 'leistungsnachweise') return `#/${PREFIX}/leistungsnachweise/auswertung`;
  return `#/${PREFIX}/${r.view}`;
}

export function hashToRoute(hash: string): Route {
  const teile = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (teile[0] === PREFIX) teile.shift();
  if (teile[0] === 'leistungsnachweise') return { view: 'leistungsnachweise' };
  return teile[0] === 'archiv' ? { view: 'archiv' } : { view: 'projekte' };
}

export function useRoute(): [Route, (r: Route) => void] {
  const [route, setRoute] = useState<Route>(() => hashToRoute(window.location.hash));

  useEffect(() => {
    const onHash = () => setRoute(hashToRoute(window.location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = (r: Route) => {
    const ziel = routeToHash(r);
    if (window.location.hash !== ziel) window.location.hash = ziel;
    else setRoute(r);
  };

  return [route, navigate];
}
