/**
 * Reiter „Projekte“ des Controllings: alle Projekte der Leistungsnachweise
 * mit Raster, Zeitraumregel, offenen Nachweisen, Leistungen ohne Nachweis und
 * den erfassten Stunden. Ein Klick öffnet das Projekt im Controlling
 * (Projekt.tsx: Leistungsnachweise, Bestätigungen, Leistungen, Einstellungen). „Neues
 * Projekt“ legt ein Projekt nur in den Leistungsnachweisen an; für alle
 * Bereiche gibt es die Projekte des Controllings (Projektregister).
 * Archivierte Projekte stehen am Ende.
 */
import { useState } from 'react';
import { useArchivierte } from '../../../../gemeinsam/ProjektBereiche';
import { Icon } from '../../../../shared/icons';
import { Badge, Card, CardHeader, EmptyState, Search } from '../../../../shared/ui';
import { ProjektDialog } from '../../components/ProjektDialog';
import { RasterBadge, STATUS_TON, anzahl } from '../../components/common';
import { leistungenOhneNachweis, stundenVon } from '../../domain/nachweis';
import { PROJEKT_STATUS_LABEL, ZEITRAUMREGEL_LABEL, type Projekt } from '../../domain/types';
import { stundenText } from '../../domain/zeitraum';
import type { Route } from '../../lib/router';
import { useStore } from '../../store/store';

export function ProjektListe({ navigate }: { navigate: (r: Route) => void }) {
  const { data } = useStore();
  const [suche, setSuche] = useState('');
  const [neu, setNeu] = useState(false);
  const archiviert = useArchivierte('leistungsnachweise');

  const begriff = suche.trim().toLowerCase();
  const projekte = data.projekte
    .filter((p) => [p.nummer, p.name, p.kurzname, p.leistungsbereich].join(' ').toLowerCase().includes(begriff))
    .sort(
      (a, b) =>
        Number(archiviert.has(a.id)) - Number(archiviert.has(b.id)) ||
        a.nummer.localeCompare(b.nummer, 'de', { numeric: true }) ||
        a.name.localeCompare(b.name, 'de'),
    );
  const ohneNachweis = leistungenOhneNachweis(data);
  const oeffne = (p: Projekt) => navigate({ view: 'controllingProjekt', projektId: p.id, tab: 'nachweise' });

  return (
    <div className="stack">
      <div className="row-between wrap">
        <div className="row wrap">
          <Search value={suche} onChange={setSuche} placeholder="Projekt, Nummer …" />
          <span className="small tertiary">
            Leistungsnachweise und Einstellungen je Projekt. Projekte für alle Bereiche legt das Controlling unter
            „Projekte“ an.
          </span>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setNeu(true)}>
          <Icon name="plus" size={14} /> Neues Projekt
        </button>
      </div>

      <Card>
        <CardHeader titel="Projekte" sub={anzahl(projekte.length, 'Projekt', 'Projekte')} />
        {projekte.length === 0 ? (
          <EmptyState
            icon="projekt"
            titel="Kein Projekt gefunden"
            text="Projekte kommen aus dem Projektregister, aus dem Excel-Import oder über „Neues Projekt“."
          />
        ) : (
          <div className="table-scroll">
            <table className="table table-stack ln-co-projekte">
              <thead>
                <tr>
                  <th>Projekt</th>
                  <th className="col-optional">Nachweis</th>
                  <th className="zahl">In Bearbeitung</th>
                  <th className="zahl">Ohne Nachweis</th>
                  <th className="ln-stunden">Stunden</th>
                  <th className="actions" />
                </tr>
              </thead>
              <tbody>
                {projekte.map((p) => {
                  const offen = data.nachweise.filter((n) => n.projektId === p.id && n.status === 'entwurf').length;
                  const ohne = ohneNachweis.filter((l) => l.projektId === p.id).length;
                  const stunden = stundenVon(data.leistungen.filter((l) => l.projektId === p.id));
                  return (
                    <tr key={p.id} className={`clickable ${archiviert.has(p.id) ? 'ln-co-archiviert' : ''}`} onClick={() => oeffne(p)}>
                      <td>
                        <span className="num tertiary">{p.nummer}</span>
                        <div>
                          <strong>{p.name}</strong>
                        </div>
                        <span className="row wrap" style={{ gap: 6, marginTop: 3 }}>
                          <Badge ton={STATUS_TON[p.status]}>{PROJEKT_STATUS_LABEL[p.status]}</Badge>
                          {archiviert.has(p.id) ? <Badge>Archiviert</Badge> : null}
                        </span>
                      </td>
                      <td className="col-optional small">
                        <RasterBadge raster={p.raster} />
                        <div className="tertiary" style={{ marginTop: 3 }}>
                          {ZEITRAUMREGEL_LABEL[p.zeitraumregel]}
                        </div>
                      </td>
                      <td className={`zahl ${offen ? '' : 'leer'}`} data-label="In Bearbeitung">
                        {offen}
                      </td>
                      <td className={`zahl ${ohne ? 'ln-co-warnzahl' : 'leer'}`} data-label="Ohne Nachweis">
                        {ohne}
                      </td>
                      <td className="ln-stunden" data-label="Stunden">
                        {stundenText(stunden)}
                      </td>
                      <td className="actions">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            oeffne(p);
                          }}
                        >
                          Öffnen <Icon name="chevron" size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {neu ? <ProjektDialog onClose={() => setNeu(false)} navigate={navigate} /> : null}
    </div>
  );
}
