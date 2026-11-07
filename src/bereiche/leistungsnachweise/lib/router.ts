/**
 * Hash-Router des Bereichs – erlaubt Lesezeichen und Vor/Zurück im Browser.
 * Die Seiten des Bereichs liegen unter #/leistungsnachweise, die des
 * Controllings im Controlling-Bereich unter #/controlling/leistungsnachweise
 * (controlling.tsx); die Wahl des Bereichs selbst trifft die Shell.
 *
 * Im Bereich gibt es nur Übersicht, Projekte und je Projekt die
 * „Leistungstexte“ (gemeinsame Texte und Monatsbestätigung, Vorgabe) und „Meine
 * Leistungen“: #/leistungsnachweise/projekt/<id> (Leistungstexte im
 * Vorgabemonat, `vorgabeMonat`), …/projekt/<id>/<JJJJ-MM> (Leistungstexte
 * dieses Monats) und …/projekt/<id>/leistungen (Meine Leistungen).
 * Leistungsnachweise und Einstellungen der Projekte liegen im Controlling.
 *
 * Das Controlling kennt die Projekte (#/controlling/leistungsnachweise/projekte),
 * die Auswertung (…/auswertung), je Projekt eine Seite (…/projekt/<id>)
 * und dieselbe Seite mit einem gewählten Nachweis (…/projekt/<id>/nachweis/<id>).
 *
 * Frühere Adressen bleiben gültig: #/leistungsnachweise/controlling/… führt in
 * den Controlling-Bereich, ebenso die entfallene Seite „Mitarbeiter“
 * (#/leistungsnachweise/mitarbeiter, jetzt die Projekte) und ein Nachweis
 * (#/leistungsnachweise/projekt/<id>/nachweis/<id>, jetzt die Seite des Projekts mit diesem Nachweis im
 * Controlling); …/projekt/<id>/<sonstiger Reiter> zeigt die Leistungstexte des
 * Projekts.
 */
import { useEffect, useState } from 'react';
import type { ID } from '../domain/types';
import { istMonat } from '../domain/zeitraum';

/** Ansicht eines Projekts im Bereich: gemeinsame Leistungstexte mit Monatsbestätigung (Vorgabe) oder die eigenen Leistungen. */
export type ProjektAnsicht = 'texte' | 'leistungen';

/** Seiten des Controllings: die Projekte und die Auswertung (je ein Menüpunkt im Controlling-Bereich). */
export type ControllingTab = 'projekte' | 'auswertung';

/** Seiten des Bereichs und des Controllings. */
export type Route =
  | { view: 'uebersicht' }
  | { view: 'projekte' }
  /**
   * Projekt im Bereich: „Leistungstexte“ (`ansicht` fehlt bzw. 'texte'; `monat` JJJJ-MM, ohne
   * Angabe der Vorgabemonat) oder „Meine Leistungen“ (`ansicht` 'leistungen').
   */
  | { view: 'projekt'; projektId: ID; ansicht?: ProjektAnsicht; monat?: string }
  | { view: 'controlling'; tab: ControllingTab }
  /** Projekt im Controlling: Seite mit seinem aktuellen Leistungsnachweis (`aktuellerNachweis`). */
  | { view: 'controllingProjekt'; projektId: ID }
  /** Projekt im Controlling mit einem bestimmten Leistungsnachweis (Texte, Aufschläge, Erstellen, Export). */
  | { view: 'abrechnung'; projektId: ID; nachweisId: ID };

/** Seiten des Controllings. */
export const CONTROLLING_TABS: ControllingTab[] = ['projekte', 'auswertung'];

/** Präfix aller Adressen dieses Bereichs. */
export const PREFIX = 'leistungsnachweise';

/** Präfix der Controlling-Ansichten im Controlling-Bereich. */
export const CONTROLLING_PREFIX = `controlling/${PREFIX}`;

/** Gehört die Seite dem Controlling? Der Bereich lenkt sie dorthin um. */
export function istControllingRoute(r: Route): boolean {
  return r.view === 'controlling' || r.view === 'controllingProjekt' || r.view === 'abrechnung';
}

/**
 * #/leistungsnachweise/projekt/<id> (dazu /<JJJJ-MM> bzw. /leistungen), sonst
 * #/leistungsnachweise/<seite>; das Controlling unter
 * #/controlling/leistungsnachweise/<seite>, …/projekt/<id> bzw.
 * …/projekt/<id>/nachweis/<id>.
 */
export function routeToHash(r: Route): string {
  switch (r.view) {
    case 'projekt':
      if (r.ansicht === 'leistungen') return `#/${PREFIX}/projekt/${r.projektId}/leistungen`;
      return r.monat && istMonat(r.monat) ? `#/${PREFIX}/projekt/${r.projektId}/${r.monat}` : `#/${PREFIX}/projekt/${r.projektId}`;
    case 'controlling':
      return `#/${CONTROLLING_PREFIX}/${r.tab}`;
    case 'controllingProjekt':
      return `#/${CONTROLLING_PREFIX}/projekt/${r.projektId}`;
    case 'abrechnung':
      return `#/${CONTROLLING_PREFIX}/projekt/${r.projektId}/nachweis/${r.nachweisId}`;
    default:
      return `#/${PREFIX}/${r.view}`;
  }
}

/**
 * Liest eine Adresse; unbekannte und die anderer Bereiche führen zur Übersicht
 * (ohne Umlenkung – die Wahl des Bereichs trifft die Shell), das Controlling ohne
 * gültige Seite zu den Projekten, frühere Reiter eines Projekts im Controlling
 * auf die Seite des Projekts. Frühere Adressen siehe oben.
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
    // Früher der gemeinsame Nachweis im Bereich – jetzt die Seite des Projekts mit diesem Nachweis im Controlling
    if (teile[2] === 'nachweis' && teile[3]) return { view: 'abrechnung', projektId: teile[1], nachweisId: teile[3] };
    if (teile[2] === 'leistungen') return { view: 'projekt', projektId: teile[1], ansicht: 'leistungen' };
    if (istMonat(teile[2])) return { view: 'projekt', projektId: teile[1], monat: teile[2] };
    // Ohne bzw. mit einem früheren Reiter: die Leistungstexte im Vorgabemonat
    return { view: 'projekt', projektId: teile[1] };
  }
  if (teile[0] === 'projekte') return { view: 'projekte' };
  // Frühere Seite „Mitarbeiter“ (entfallen) – das Controlling der Leistungsnachweise
  if (teile[0] === 'mitarbeiter') return { view: 'controlling', tab: 'projekte' };
  return { view: 'uebersicht' };
}

/**
 * Seite des Controllings aus den Wegmarken nach dem Präfix: die Projekte bzw.
 * die Auswertung (im Controlling-Bereich ein eigener Menüpunkt). Frühere
 * Reiter („nachweise“, „mitarbeiter“) und Adressen ohne Reiter führen zu den
 * Projekten, frühere Reiter eines Projekts (auch „bestaetigungen“) auf die
 * Seite des Projekts.
 */
function controllingRoute(teile: string[]): Route {
  if (teile[0] === 'projekt' && teile[1]) {
    if (teile[2] === 'nachweis' && teile[3]) return { view: 'abrechnung', projektId: teile[1], nachweisId: teile[3] };
    // Frühere Reiter des Projekts (…/nachweise, …/leistungen, …/einstellungen, …/bestaetigungen) führen auf die Seite des Projekts
    return { view: 'controllingProjekt', projektId: teile[1] };
  }
  const reiter = teile[0] ?? '';
  return { view: 'controlling', tab: (CONTROLLING_TABS as string[]).includes(reiter) ? (reiter as ControllingTab) : 'projekte' };
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
