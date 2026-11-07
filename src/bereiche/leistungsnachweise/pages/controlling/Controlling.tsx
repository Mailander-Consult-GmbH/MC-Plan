/**
 * Controlling der Leistungsnachweise – eingebunden im Controlling-Bereich von
 * KaPlan (controlling.tsx, Zugang 'controlling', nach der PIN):
 * Reiter „Auswertung“ (Stunden je Mitarbeiter, Monat und Projekt; Excel),
 * „Leistungsnachweise“ (alle Nachweise aller Projekte, Klick öffnet die
 * Abrechnung mit Leistungstexten, Aufschlägen, Abschluss und Export),
 * „Projekte“ (je Projekt Leistungsnachweise, Bestätigungen, Leistungen und Einstellungen) und
 * „Mitarbeiter“ (Verwaltung). Die Auswahl der Filter bleibt erhalten,
 * solange die Seite offen ist.
 */
import { CONTROLLING_TABS, type ControllingTab, type Route } from '../../lib/router';
import { AuswertungAnsicht } from './Auswertung';
import { Mitarbeiter } from './Mitarbeiter';
import { NachweisListe } from './NachweisListe';
import { ProjektListe } from './ProjektListe';
import './controlling.css';

/** Beschriftung und Tooltip der Reiter. */
const REITER: Record<ControllingTab, { label: string; titel: string }> = {
  auswertung: { label: 'Auswertung', titel: 'Stunden je Mitarbeiter, Monat und Projekt – mit Excel' },
  nachweise: { label: 'Leistungsnachweise', titel: 'Alle Leistungsnachweise – Leistungstexte, Aufschläge, Abschluss und Export' },
  projekte: { label: 'Projekte', titel: 'Projekte der Leistungsnachweise – Nachweise, Leistungen und Einstellungen je Projekt' },
  mitarbeiter: { label: 'Mitarbeiter', titel: 'Mitarbeiter verwalten' },
};

export function Controlling({ tab, navigate }: { tab: ControllingTab; navigate: (r: Route) => void }) {
  return (
    <div className="stack">
      <div className="tabs" role="tablist" aria-label="Controlling">
        {CONTROLLING_TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={t === tab}
            className={t === tab ? 'active' : ''}
            title={REITER[t].titel}
            onClick={() => navigate({ view: 'controlling', tab: t })}
          >
            {REITER[t].label}
          </button>
        ))}
      </div>

      {tab === 'auswertung' ? <AuswertungAnsicht navigate={navigate} /> : null}
      {tab === 'nachweise' ? <NachweisListe navigate={navigate} /> : null}
      {tab === 'projekte' ? <ProjektListe navigate={navigate} /> : null}
      {tab === 'mitarbeiter' ? <Mitarbeiter /> : null}
    </div>
  );
}
