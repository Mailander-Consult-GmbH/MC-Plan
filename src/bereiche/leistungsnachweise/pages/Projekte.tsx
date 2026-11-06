/**
 * Projektliste des Bereichs. Hier wird nichts angelegt oder eingestellt – das
 * macht das Controlling (Projekte im Controlling-Bereich bzw. Reiter
 * „Projekte“ der Leistungsnachweise dort); unbekannte Projekte legt auch der
 * Excel-Import an. Jedes Projekt der anderen Bereiche steht von selbst auch
 * hier (`JEDES_PROJEKT_IN`, Projektregister). Was ein anderer Bereich mit ★
 * markiert hat, ist hier fest markiert (`useMarkiertAnderswo`); weitere
 * Projekte markiert man hier dazu. Ein Klick öffnet die eigenen Leistungen im Projekt; mit ★
 * markierte Projekte erscheinen in der Übersicht und in der Seitenleiste.
 *
 * Die Kacheln nennen nur Projektnummer, Projektname, Beschreibung und die
 * anderen Bereiche des Projekts. Darunter die im Bereich archivierten Projekte
 * (Projektregister, src/gemeinsam/). Der Abschnitt „Projekte aus anderen
 * Bereichen“ bleibt hier leer, weil der Bereich jedes Projekt führt.
 */
import { useState } from 'react';
import {
  ArchivAbschnitt,
  BereichsMarken,
  FremdeProjekte,
  useArchivierte,
  useMarkiertAnderswo,
} from '../../../gemeinsam/ProjektBereiche';
import { Badge, Card, EmptyState, Search } from '../../../shared/ui';
import { STATUS_TON } from '../components/common';
import { PROJEKT_STATUS_LABEL, type Projekt } from '../domain/types';
import type { Route } from '../lib/router';
import { useStore } from '../store/store';

export function Projekte({ navigate }: { navigate: (r: Route) => void }) {
  const { data, toggleMarkiert } = useStore();
  const anderswo = useMarkiertAnderswo('leistungsnachweise');
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
            {anderswo.has(p.id) ? (
              // In einem anderen Bereich markiert – gilt hier von selbst und lässt sich nur dort aufheben
              <span
                className="stern aktiv ln-stern-fest"
                title={`In ${anderswo.get(p.id)!.join(' und ')} markiert – deshalb auch hier markiert; aufheben lässt es sich nur dort`}
                aria-label="Markiert in einem anderen Bereich"
                onClick={(e) => e.stopPropagation()}
              >
                ★
              </span>
            ) : (
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
            )}
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
          Alle sehen alle Projekte. Mit ★ markierte Projekte erscheinen in der Übersicht und in der Seitenleiste – in
          anderen Bereichen markierte sind es hier von selbst, weitere lassen sich dazu markieren. Projekte
          legt das Controlling an.
        </span>
      </div>

      {aktive.length === 0 ? (
        <Card>
          <EmptyState
            icon="projekt"
            titel="Kein Projekt gefunden"
            text="Hier stehen alle Projekte der anderen Bereiche und des Controllings von selbst; unbekannte Projekte legt auch der Excel-Import an."
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
