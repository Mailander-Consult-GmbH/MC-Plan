/**
 * Projektliste des Bereichs. Hier wird nichts angelegt oder eingestellt – das
 * macht das Controlling (Projekte im Controlling-Bereich bzw. Reiter
 * „Projekte“ der Leistungsnachweise dort); unbekannte Projekte legt auch der
 * Excel-Import an. Ein Klick öffnet die eigenen Leistungen im Projekt; mit ★
 * markierte Projekte erscheinen in der Übersicht und in der Seitenleiste.
 *
 * Die Kacheln nennen nur Projektnummer, Projektname, Beschreibung und die
 * anderen Bereiche des Projekts. Darunter die im Bereich archivierten Projekte
 * und – grau hinterlegt – Projekte aus anderen Bereichen zum Übernehmen
 * (Projektregister, src/gemeinsam/).
 */
import { useState } from 'react';
import { ArchivAbschnitt, BereichsMarken, FremdeProjekte, useArchivierte } from '../../../gemeinsam/ProjektBereiche';
import { Badge, Card, EmptyState, Search } from '../../../shared/ui';
import { STATUS_TON } from '../components/common';
import { PROJEKT_STATUS_LABEL, type Projekt } from '../domain/types';
import type { Route } from '../lib/router';
import { useStore } from '../store/store';

export function Projekte({ navigate }: { navigate: (r: Route) => void }) {
  const { data, toggleMarkiert } = useStore();
  const [suche, setSuche] = useState('');

  const projekte = data.projekte.filter((p) =>
    [p.name, p.nummer, p.kurzname, p.leistungsbereich, p.beschreibung]
      .join(' ')
      .toLowerCase()
      .includes(suche.toLowerCase()),
  );
  const archiviert = useArchivierte('leistungsnachweise');
  const aktive = projekte.filter((p) => !archiviert.has(p.id));
  const archivierte = projekte.filter((p) => archiviert.has(p.id));

  const karte = (p: Projekt) => (
    <button
      key={p.id}
      type="button"
      className="card card-click ln-projektkarte gem-kachel"
      onClick={() => navigate({ view: 'projekt', projektId: p.id })}
    >
      <div className="card-pad">
        <div className="row-between" style={{ alignItems: 'flex-start' }}>
          <div style={{ minWidth: 0 }}>
            <div className="mono tertiary">{p.nummer}</div>
            <h2 style={{ marginTop: 2 }}>{p.name}</h2>
            {p.beschreibung ? (
              <div className="small muted truncate" style={{ marginTop: 3 }}>
                {p.beschreibung}
              </div>
            ) : null}
          </div>
          <span className="row" style={{ gap: 6 }}>
            <Badge ton={STATUS_TON[p.status]}>{PROJEKT_STATUS_LABEL[p.status]}</Badge>
            <span
              role="button"
              tabIndex={0}
              className={`stern ${p.markiert ? 'aktiv' : ''}`}
              title={p.markiert ? 'Markierung aufheben' : 'Projekt markieren – erscheint in Übersicht und Seitenleiste'}
              onClick={(e) => {
                e.stopPropagation();
                toggleMarkiert(p.id);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleMarkiert(p.id);
                }
              }}
            >
              {p.markiert ? '★' : '☆'}
            </span>
          </span>
        </div>
        <BereichsMarken bereich="leistungsnachweise" lokaleId={p.id} />
      </div>
    </button>
  );

  return (
    <div className="stack">
      <div className="row wrap">
        <Search value={suche} onChange={setSuche} placeholder="Projekt, Nummer …" />
        <span className="small tertiary">
          Alle sehen alle Projekte. Mit ★ markierte Projekte erscheinen in der Übersicht und in der Seitenleiste. Projekte
          legt das Controlling an.
        </span>
      </div>

      {aktive.length === 0 ? (
        <Card>
          <EmptyState
            icon="projekt"
            titel="Kein Projekt gefunden"
            text="Übernehmen Sie ein Projekt aus einem anderen Bereich oder Leistungen per Excel-Import – unbekannte Projekte legt der Import an. Neue Projekte legt das Controlling an."
          />
        </Card>
      ) : (
        <div className="grid grid-2">{aktive.map(karte)}</div>
      )}

      <ArchivAbschnitt anzahl={archivierte.length}>{archivierte.map(karte)}</ArchivAbschnitt>
      <FremdeProjekte bereich="leistungsnachweise" suche={suche} />
    </div>
  );
}
