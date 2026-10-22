/**
 * Termine & Nachhaken: alle Anmeldungen mit Terminfrist über alle
 * Projekthüllen, gefiltert nach Dringlichkeit, dazu der Anmeldebedarf aus den
 * Projekthüllen.
 */
import { Fragment, useMemo, useState } from 'react';
import { formatDate, relativeLabel } from '../../../shared/dates';
import { Icon } from '../../../shared/icons';
import { Card, CardHeader, EmptyState, Search, Segmented } from '../../../shared/ui';
import { AmpelPunkt, NachfolgerAuswahl, NachhakenBadge, StatusBadge, TerminZelle } from '../components/common';
import { StatusWechselDialog } from '../components/StatusWechselDialog';
import { NachhakenDialog } from '../components/TerminDialoge';
import { faelligerBedarf, offeneTermine } from '../domain/fristen';
import { RIL_LABEL, type Anmeldung, type StatusCode } from '../domain/types';
import type { Route } from '../lib/router';
import { useStore } from '../store/store';

type Filter = 'alle' | 'ueberfaellig' | 'faellig' | 'geplant' | 'nachhaken';

export function Termine({ navigate }: { navigate: (r: Route) => void }) {
  const { data } = useStore();
  const [filter, setFilter] = useState<Filter>('alle');
  const [suche, setSuche] = useState('');
  const [wechsel, setWechsel] = useState<{ anmeldung: Anmeldung; nach: StatusCode } | null>(null);
  const [nachhaken, setNachhaken] = useState<Anmeldung | null>(null);

  const alle = useMemo(() => offeneTermine(data), [data]);
  const bedarf = useMemo(() => faelligerBedarf(data), [data]);
  const zaehler = (f: Filter) => alle.filter((t) => passt(f, t.ampel, t.frist.nachhaken)).length;

  const eintraege = alle.filter((t) => {
    if (!passt(filter, t.ampel, t.frist.nachhaken)) return false;
    if (!suche.trim()) return true;
    return [
      t.anmeldung.anmeldeId,
      t.anmeldung.bfStrecke,
      t.anmeldung.gewerk,
      t.anmeldung.art,
      t.status.code,
      t.status.name,
      t.projekt.name,
      t.projekt.dbGNummer,
    ]
      .join(' ')
      .toLowerCase()
      .includes(suche.toLowerCase());
  });

  const projekte = [...new Map(eintraege.map((t) => [t.projekt.id, t.projekt])).values()].sort((a, b) =>
    a.name.localeCompare(b.name, 'de'),
  );

  return (
    <div className="stack">
      <div className="row-between wrap">
        <Segmented<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'alle', label: `Alle (${alle.length})` },
            { value: 'ueberfaellig', label: `Überfällig (${zaehler('ueberfaellig')})` },
            { value: 'faellig', label: `Fällig (${zaehler('faellig')})` },
            { value: 'geplant', label: `Im Plan (${zaehler('geplant')})` },
            { value: 'nachhaken', label: `Zum Nachhaken (${zaehler('nachhaken')})` },
          ]}
        />
        <Search value={suche} onChange={setSuche} placeholder="ID, Status, Projekthülle …" />
      </div>

      <Card>
        <CardHeader
          titel="Terminfristen der Anmeldungen"
          sub="Frist im aktuellen Status laut Workflow – berechnet nach Richtlinie, Stichtag oder Nachhak-Termin"
        />
        {eintraege.length === 0 ? (
          <EmptyState icon="check" titel="Nichts offen" text="Für diese Auswahl gibt es keine Terminfrist." />
        ) : (
          <div className="table-scroll">
            <table className="table table-stack">
              <thead>
                <tr>
                  <th className="col-optional" style={{ width: 22 }} />
                  <th>Anmeldung</th>
                  <th>Status</th>
                  <th>Terminfrist</th>
                  <th className="actions">Aktion</th>
                </tr>
              </thead>
              <tbody>
                {projekte.map((projekt) => {
                  const zeilen = eintraege.filter((t) => t.projekt.id === projekt.id);
                  return (
                    <Fragment key={projekt.id}>
                      <tr className="gruppe-zeile">
                        <td colSpan={5}>
                          <button
                            type="button"
                            className="link-btn"
                            onClick={() => navigate({ view: 'projekt', projektId: projekt.id })}
                          >
                            <span className="num tertiary">{projekt.dbGNummer}</span> <strong>{projekt.name}</strong>
                          </button>
                          <span className="small tertiary">
                            {' '}
                            · {zeilen.length} {zeilen.length === 1 ? 'Termin' : 'Termine'}
                          </span>
                        </td>
                      </tr>
                      {zeilen.map((t) => (
                        <tr key={t.anmeldung.id}>
                          <td className="col-optional">
                            <AmpelPunkt ampel={t.ampel} />
                          </td>
                          <td>
                            <button
                              type="button"
                              className="link-btn"
                              onClick={() =>
                                navigate({ view: 'anmeldung', projektId: projekt.id, anmeldungId: t.anmeldung.id })
                              }
                            >
                              <strong>{t.anmeldung.anmeldeId || 'ohne ID'}</strong>
                            </button>
                            <div className="small tertiary">
                              {[t.anmeldung.art, t.anmeldung.bfStrecke, t.anmeldung.gewerk].filter(Boolean).join(' · ')}
                            </div>
                          </td>
                          <td>
                            <StatusBadge code={t.anmeldung.status} />
                            {t.frist.nachhaken ? (
                              <div style={{ marginTop: 4 }}>
                                <NachhakenBadge />
                              </div>
                            ) : null}
                          </td>
                          <td>
                            <TerminZelle frist={t.frist} />
                          </td>
                          <td className="actions">
                            <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
                              {t.frist.nachhaken ? (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline"
                                  onClick={() => setNachhaken(t.anmeldung)}
                                  title="Festhalten, dass nachgehakt wurde"
                                >
                                  <Icon name="glocke" size={13} /> Nachgehakt
                                </button>
                              ) : null}
                              <NachfolgerAuswahl
                                code={t.anmeldung.status}
                                onWaehle={(nach) => setWechsel({ anmeldung: t.anmeldung, nach })}
                              />
                            </span>
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader
          titel="Anmeldebedarf aus den Projekthüllen"
          sub={`Fristen laut Richtlinie für SKM, PzE und N-x in den nächsten ${data.einstellungen.bedarfVorschauTage} Tagen ohne Eintrag`}
        />
        {bedarf.length === 0 ? (
          <EmptyState icon="check" titel="Kein Anmeldebedarf" text="In der Vorschau steht keine Anmeldung ohne Eintrag an." />
        ) : (
          bedarf.map(({ projekt, zelle }) => (
            <div
              key={`${projekt.id}-${zelle.fahrplanjahr}-${zelle.phase}`}
              className="list-row clickable"
              onClick={() => navigate({ view: 'projekt', projektId: projekt.id })}
            >
              <Icon name="kalender" size={16} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong>
                  {RIL_LABEL[zelle.phase]} für Fahrplanjahr {zelle.fahrplanjahr}
                </strong>
                <div className="small tertiary">{projekt.name}</div>
              </div>
              <span className="small">
                bis <b>{formatDate(zelle.frist)}</b>
                <div className="tertiary small">{relativeLabel(zelle.frist)}</div>
              </span>
            </div>
          ))
        )}
      </Card>

      {wechsel ? (
        <StatusWechselDialog anmeldung={wechsel.anmeldung} nach={wechsel.nach} onClose={() => setWechsel(null)} />
      ) : null}
      {nachhaken ? <NachhakenDialog anmeldung={nachhaken} onClose={() => setNachhaken(null)} /> : null}
    </div>
  );
}

function passt(filter: Filter, ampel: string, nachhaken: boolean): boolean {
  if (filter === 'alle') return true;
  if (filter === 'nachhaken') return nachhaken;
  return ampel === filter;
}
