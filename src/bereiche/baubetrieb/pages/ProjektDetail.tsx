/**
 * Projekt: Stammdaten, Anmeldebedarf je Fahrplanjahr und die baubetrieblichen
 * Anmeldungen – je Workflow (Phase) eine eigene Tabelle mit Statuswechsel
 * direkt in der Zeile. Eine Zeile umfasst höchstens zwei Textzeilen; längere
 * Angaben werden gekürzt und stehen vollständig im Tooltip.
 */
import { Fragment, useState } from 'react';
import { formatDate, today } from '../../../shared/dates';
import { Icon } from '../../../shared/icons';
import { useToast } from '../../../shared/toast';
import { Badge, Card, CardHeader, ConfirmDialog, EmptyState, Search } from '../../../shared/ui';
import { AnmeldungDialog } from '../components/AnmeldungDialog';
import { NachfolgerAuswahl, StatusBadge, TerminKompakt } from '../components/common';
import { StatusWechselDialog } from '../components/StatusWechselDialog';
import { monitorExportieren } from '../domain/export';
import {
  ampelFuer,
  anmeldebedarf,
  bauzeitraumText,
  naechsterMittwoch,
  terminfrist,
  type BedarfZelle,
  type KkmZelle,
} from '../domain/fristen';
import {
  ANNEX_VII_LABEL,
  ERSTE_PHASE_LABEL,
  PHASE_LABEL,
  PROJEKT_STATUS_LABEL,
  RIL_LABEL,
  type Anmeldung,
  type Projekt,
  type StatusZiel,
  type Workflow,
} from '../domain/types';
import { istAenderung, statusInfo, statusText, statusVon } from '../domain/workflow';
import type { Route } from '../lib/router';
import { useStore } from '../store/store';
import { ProjektDialog, PROJEKT_STATUS_TON } from './Projekte';

/** Kürzt einzeilig mit Auslassungspunkten – so bleibt jede Tabellenzeile bei höchstens zwei Textzeilen. */
const EINZEILIG = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } as const;

export function ProjektDetail({ projekt, navigate }: { projekt: Projekt; navigate: (r: Route) => void }) {
  const { data, deleteProjekt, toggleMarkiert } = useStore();
  const toast = useToast();
  const [bearbeiten, setBearbeiten] = useState(false);
  const [loeschen, setLoeschen] = useState(false);
  const [neu, setNeu] = useState(false);
  const [wechsel, setWechsel] = useState<{ anmeldung: Anmeldung; nach: StatusZiel } | null>(null);
  const [suche, setSuche] = useState('');

  const eigene = data.anmeldungen.filter((a) => a.projektId === projekt.id);
  const bedarf = anmeldebedarf(projekt, data);
  const oeffne = (a: Anmeldung) => navigate({ view: 'anmeldung', projektId: projekt.id, anmeldungId: a.id });

  const workflowVon = (a: Anmeldung) => statusVon(data.workflows, a.statusId).workflow.id;
  const passt = (a: Anmeldung) => {
    if (!suche.trim()) return true;
    const { workflow, status } = statusVon(data.workflows, a.statusId);
    return [a.anmeldeId, a.bfStrecke, a.gewerk, a.bemerkung, a.art, workflow.name, status.name, a.aenderungsNr]
      .join(' ')
      .toLowerCase()
      .includes(suche.toLowerCase());
  };
  // Je Workflow eine Tabelle in der Reihenfolge der Workflows, darin nach Sperrbeginn
  const tabelleFuer = (workflow: Workflow, eintraege: Anmeldung[]) => ({
    workflow,
    anzahl: eintraege.length,
    zeilen: eintraege.filter(passt).sort((a, b) => (a.bauVon ?? '').localeCompare(b.bauVon ?? '')),
  });
  const ohneWorkflow = eigene.filter((a) => !statusInfo(data.workflows, a.statusId));
  const tabellen = [
    ...data.workflows.map((w) => tabelleFuer(w, eigene.filter((a) => workflowVon(a) === w.id))),
    // Anmeldungen, deren Status in keinem Workflow mehr vorkommt (beschädigter Bestand)
    ...(ohneWorkflow.length > 0 ? [tabelleFuer(statusVon(data.workflows, ohneWorkflow[0].statusId).workflow, ohneWorkflow)] : []),
  ];

  return (
    <div className="stack">
      <div className="row-between wrap">
        <button type="button" className="btn btn-ghost" onClick={() => navigate({ view: 'projekte' })}>
          <Icon name="zurueck" size={14} /> Projekte
        </button>
        <div className="row wrap">
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => monitorExportieren(data, [projekt.id])}
            title="Anmeldungen und Projekt als Excel-Datei"
          >
            <Icon name="export" size={14} /> Excel
          </button>
          <button type="button" className="btn btn-outline" onClick={() => setBearbeiten(true)}>
            <Icon name="bearbeiten" size={14} /> Bearbeiten
          </button>
          <button type="button" className="btn btn-danger" onClick={() => setLoeschen(true)}>
            <Icon name="loeschen" size={14} /> Löschen
          </button>
        </div>
      </div>

      <Card>
        <CardHeader
          titel={projekt.name}
          sub={[projekt.dbGNummer, projekt.projektnummer].filter(Boolean).join(' · ') || 'ohne Nummer'}
          actions={
            <>
              <Badge ton={PROJEKT_STATUS_TON[projekt.status]}>{PROJEKT_STATUS_LABEL[projekt.status]}</Badge>
              <button
                type="button"
                className={`stern ${projekt.markiert ? 'aktiv' : ''}`}
                style={{ border: 'none', background: 'none', padding: 0 }}
                title={projekt.markiert ? 'Markierung aufheben' : 'Markieren'}
                onClick={() => toggleMarkiert(projekt.id)}
              >
                {projekt.markiert ? '★' : '☆'}
              </button>
            </>
          }
        />
        <div className="card-pad">
          <div className="grid grid-2" style={{ gap: 10 }}>
            <dl className="kv kv-breit" style={{ margin: 0 }}>
              <dt>Projektleiter</dt>
              <dd>{projekt.projektleiter || '–'}</dd>
              <dt>DB-G-Nummer</dt>
              <dd>{projekt.dbGNummer || '–'}</dd>
              <dt>Hauptbearbeiter MIC</dt>
              <dd>{projekt.hauptbearbeiter || '–'}</dd>
              <dt>MIC-Projektnummer (wiko)</dt>
              <dd>{projekt.projektnummer || '–'}</dd>
            </dl>
            <dl className="kv kv-breit" style={{ margin: 0 }}>
              <dt>Erster Anmeldetermin</dt>
              <dd>
                {projekt.ersterAnmeldetermin ? `ca. ${formatDate(projekt.ersterAnmeldetermin)}` : '–'}
                <span className="tertiary small"> · {ERSTE_PHASE_LABEL[projekt.erstePhase]}</span>
              </dd>
              <dt>Betroffene Fahrplanjahre</dt>
              <dd>{projekt.fahrplanjahre.length > 0 ? projekt.fahrplanjahre.join(', ') : '–'}</dd>
              <dt>Inbetriebnahme</dt>
              <dd>{formatDate(projekt.inbetriebnahme)}</dd>
              {projekt.bemerkung ? (
                <>
                  <dt>Bemerkung</dt>
                  <dd>{projekt.bemerkung}</dd>
                </>
              ) : null}
            </dl>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          titel="Anmeldebedarf je Fahrplanjahr"
          sub={`Je betroffenem Fahrplanjahr: ob eine Anmeldung zum nächsten SKM, MKM oder KM fällig ist; KKM: frühester Sperrbeginn bei Anmeldung zum nächsten Stichtag (Mittwoch, ${formatDate(naechsterMittwoch(today()))})`}
        />
        {bedarf.length === 0 ? (
          <EmptyState
            icon="kalender"
            titel="Keine Fahrplanjahre gewählt"
            text="Mit den betroffenen Fahrplanjahren des Projekts lässt sich der Anmeldebedarf ablesen."
          />
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Fahrplanjahr</th>
                  {bedarf[0].zellen.map((z) => (
                    <th key={z.phase}>{RIL_LABEL[z.phase]}</th>
                  ))}
                  <th title="Frühester Sperrbeginn je Maßnahmenart bei Anmeldung zum nächsten Stichtag (Mittwoch)">
                    {PHASE_LABEL.kkm}
                  </th>
                </tr>
              </thead>
              <tbody>
                {bedarf.map((zeile) => (
                  <tr key={zeile.fahrplanjahr}>
                    <td>
                      <strong>{zeile.fahrplanjahr}</strong>
                    </td>
                    {zeile.zellen.map((zelle) => (
                      <td key={zelle.phase}>
                        <BedarfInhalt zelle={zelle} onOeffnen={oeffne} />
                      </td>
                    ))}
                    <td>
                      <KkmInhalt zellen={zeile.kkm} onOeffnen={oeffne} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="row-between wrap">
        <div>
          <h2>Baubetriebliche Anmeldungen</h2>
          <div className="small tertiary">Je Workflow eine Tabelle; zur Wahl stehen nur die möglichen Nachfolge-Status</div>
        </div>
        <div className="row wrap">
          <Search value={suche} onChange={setSuche} placeholder="ID, Bf/Strecke, Gewerk, Status …" />
          <button type="button" className="btn btn-primary" onClick={() => setNeu(true)}>
            <Icon name="plus" size={14} /> Neue Anmeldung
          </button>
        </div>
      </div>

      {eigene.length === 0 ? (
        <Card>
          <EmptyState
            icon="kalender"
            titel="Noch keine Anmeldung"
            text="Neu angelegt wird im ersten Status eines Workflows – SKM, MKM, KM oder KKM."
          />
        </Card>
      ) : (
        tabellen.map(({ workflow, zeilen, anzahl }) =>
          // Bei einer Suche bleiben Workflows ohne Treffer ausgeblendet
          suche.trim() && zeilen.length === 0 ? null : (
            <AnmeldungenTabelle
              key={workflow.id}
              titel={workflow.name}
              anzahl={anzahl}
              zeilen={zeilen}
              onOeffnen={oeffne}
              onWechsel={(anmeldung, nach) => setWechsel({ anmeldung, nach })}
            />
          ),
        )
      )}
      {suche.trim() && eigene.length > 0 && tabellen.every((t) => t.zeilen.length === 0) ? (
        <Card>
          <EmptyState icon="suche" titel="Nichts gefunden" text="Für diese Suche gibt es keine Anmeldung." />
        </Card>
      ) : null}

      {bearbeiten ? <ProjektDialog projekt={projekt} onClose={() => setBearbeiten(false)} /> : null}
      {neu ? <AnmeldungDialog projekt={projekt} onClose={() => setNeu(false)} /> : null}
      {wechsel ? (
        <StatusWechselDialog anmeldung={wechsel.anmeldung} nach={wechsel.nach} onClose={() => setWechsel(null)} />
      ) : null}
      {loeschen ? (
        <ConfirmDialog
          titel="Projekt löschen?"
          text={`„${projekt.name}“ wird samt ${eigene.length} ${
            eigene.length === 1 ? 'Anmeldung' : 'Anmeldungen'
          } gelöscht. Das lässt sich nicht rückgängig machen.`}
          onConfirm={() => {
            deleteProjekt(projekt.id);
            toast('Projekt gelöscht.');
            navigate({ view: 'projekte' });
          }}
          onClose={() => setLoeschen(false)}
        />
      ) : null}
    </div>
  );
}

/** Inhalt einer Zelle des Anmeldebedarfs. */
function BedarfInhalt({ zelle, onOeffnen }: { zelle: BedarfZelle; onOeffnen: (a: Anmeldung) => void }) {
  const { data } = useStore();
  const datum = zelle.frist ? formatDate(zelle.frist) : '–';
  switch (zelle.zustand) {
    case 'abgedeckt':
      return (
        <button type="button" className="link-btn small" onClick={() => onOeffnen(zelle.durch!)} title="Eintrag öffnen">
          <Badge ton="green">✓ {zelle.durch!.art}</Badge>
          <div className="tertiary small">{statusText(statusVon(data.workflows, zelle.durch!.statusId))}</div>
        </button>
      );
    case 'faellig':
    case 'kuenftig':
      return (
        <span className="small">
          {zelle.zustand === 'faellig' ? <Badge ton="orange">fällig</Badge> : <span className="muted">anstehend</span>}
          <div>
            bis <b>{datum}</b>
          </div>
        </span>
      );
    case 'verstrichen':
      return (
        <span className="small tertiary" title="Frist verstrichen, ohne dass ein Eintrag besteht">
          verstrichen
          <div>{datum}</div>
        </span>
      );
    case 'vorBeginn':
      return (
        <span className="small tertiary" title="Liegt vor dem ersten Anmeldetermin des Projekts">
          vor Betreuung
          <div>{datum}</div>
        </span>
      );
    default:
      return <span className="small tertiary">–</span>;
  }
}

/**
 * KKM im Anmeldebedarf: je Maßnahmenart eine Zeile – ab wann die Sperrpause
 * bei Anmeldung zum nächsten Stichtag frühestens sein kann, dahinter die
 * vorhandenen unterjährigen Anmeldungen (abgelehnte ohne Haken).
 */
function KkmInhalt({ zellen, onOeffnen }: { zellen: KkmZelle[]; onOeffnen: (a: Anmeldung) => void }) {
  const { data } = useStore();
  return (
    <div className="small" style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 8, rowGap: 2 }}>
      {zellen.map((z) => (
        <Fragment key={z.art}>
          <b>{z.art}</b>
          <span>
            {z.zustand === 'ganzesJahr' ? (
              <span className="muted">ganzes Jahr</span>
            ) : z.zustand === 'ab' ? (
              <span>
                ab <b>{formatDate(z.fruehestens)}</b>
              </span>
            ) : (
              <span className="tertiary" title="Bei Anmeldung zum nächsten Stichtag ist in diesem Fahrplanjahr keine Sperrpause mehr möglich">
                nicht mehr
              </span>
            )}
            {z.eintraege.map((a) => {
              const status = statusVon(data.workflows, a.statusId).status;
              return (
                <Fragment key={a.id}>
                  <span className="tertiary"> · </span>
                  <button
                    type="button"
                    className="link-btn small"
                    onClick={() => onOeffnen(a)}
                    title={`${a.anmeldeId || 'ohne ID'} – Eintrag öffnen`}
                  >
                    {status.art === 'abgelehnt' ? '' : '✓ '}
                    {status.name}
                  </button>
                </Fragment>
              );
            })}
          </span>
        </Fragment>
      ))}
    </div>
  );
}

/** Anmeldungen eines Workflows – Spalten Anmeldung, Maßnahmenart, Sperrzeitraum, Status, Terminfrist. */
function AnmeldungenTabelle({
  titel,
  anzahl,
  zeilen,
  onOeffnen,
  onWechsel,
}: {
  titel: string;
  anzahl: number;
  zeilen: Anmeldung[];
  onOeffnen: (a: Anmeldung) => void;
  onWechsel: (a: Anmeldung, nach: StatusZiel) => void;
}) {
  const { data } = useStore();
  return (
    <Card>
      <CardHeader
        titel={titel}
        sub={anzahl === 0 ? 'keine Anmeldung' : `${anzahl} ${anzahl === 1 ? 'Anmeldung' : 'Anmeldungen'}`}
      />
      {/* Ohne Anmeldung bleibt es bei der Kopfzeile, damit leere Workflows wenig Platz brauchen. */}
      {zeilen.length === 0 ? null : (
        <div className="table-scroll">
          {/* Feste Breiten: Anmeldung nimmt den Rest und kürzt, alle anderen Spalten passen einzeilig. */}
          <table className="table" style={{ tableLayout: 'fixed', minWidth: 980 }}>
            <thead>
              <tr>
                <th>Anmeldung</th>
                <th style={{ width: 136 }}>Maßnahmenart</th>
                <th style={{ width: 178 }}>Sperrzeitraum</th>
                <th style={{ width: 206 }}>Status</th>
                <th style={{ width: 152 }}>Terminfrist</th>
                <th className="actions" style={{ width: 176 }} />
              </tr>
            </thead>
            <tbody>
              {zeilen.map((a) => {
                const frist = terminfrist(a, data);
                const ampel = ampelFuer(frist.datum, data.einstellungen.vorlaufTage);
                const ort = [a.bfStrecke, a.gewerk].filter(Boolean).join(' · ');
                const aenderung =
                  istAenderung(data.workflows, a.statusId) && (a.aenderungsNr || a.annexVII)
                    ? [a.aenderungsNr && `ÄAbst-Nr ${a.aenderungsNr}`, a.annexVII && ANNEX_VII_LABEL[a.annexVII]]
                        .filter(Boolean)
                        .join(' · ')
                    : '';
                const zeitraum = bauzeitraumText(a, data.workflows);
                return (
                  <tr key={a.id} className="clickable" onClick={() => onOeffnen(a)}>
                    <td>
                      <div style={EINZEILIG} title={a.anmeldeId || 'ohne ID'}>
                        {a.anmeldeId ? <strong>{a.anmeldeId}</strong> : <span className="tertiary">ohne ID</span>}
                        {a.herkunftId ? <span className="small tertiary"> · aus Aufteilung</span> : null}
                      </div>
                      <div className="small tertiary" style={EINZEILIG} title={ort || undefined}>
                        {ort || '–'}
                      </div>
                    </td>
                    <td className="small" style={EINZEILIG}>
                      {a.art}
                    </td>
                    <td className="small" style={EINZEILIG} title={zeitraum}>
                      {zeitraum}
                    </td>
                    <td>
                      <div style={EINZEILIG}>
                        <StatusBadge statusId={a.statusId} ohneWorkflow />
                      </div>
                      {aenderung ? (
                        <div className="small tertiary" style={EINZEILIG} title={aenderung}>
                          {aenderung}
                        </div>
                      ) : null}
                    </td>
                    <td>
                      <TerminKompakt frist={frist} ampel={ampel} />
                    </td>
                    <td className="actions" onClick={(e) => e.stopPropagation()}>
                      <NachfolgerAuswahl statusId={a.statusId} onWaehle={(nach) => onWechsel(a, nach)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
