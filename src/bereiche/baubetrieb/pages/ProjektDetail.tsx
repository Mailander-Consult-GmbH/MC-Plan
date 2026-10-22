/**
 * Projekt: Stammdaten, Anmeldebedarf je Fahrplanjahr und die Liste der
 * baubetrieblichen Anmeldungen mit Statuswechsel direkt in der Zeile.
 */
import { useState } from 'react';
import { formatDate } from '../../../shared/dates';
import { Icon } from '../../../shared/icons';
import { useToast } from '../../../shared/toast';
import { Badge, Card, CardHeader, ConfirmDialog, EmptyState, Search, Segmented } from '../../../shared/ui';
import { AnmeldungDialog, type AnmeldungVorgabe } from '../components/AnmeldungDialog';
import { AmpelPunkt, NachfolgerAuswahl, StatusBadge, TerminZelle } from '../components/common';
import { StatusWechselDialog } from '../components/StatusWechselDialog';
import { monitorExportieren } from '../domain/export';
import {
  ampelFuer,
  anmeldebedarf,
  bauzeitraumText,
  terminfrist,
  type BedarfPhase,
  type BedarfZelle,
} from '../domain/fristen';
import {
  ANNEX_VII_LABEL,
  ERSTE_PHASE_LABEL,
  PROJEKT_STATUS_LABEL,
  RIL_LABEL,
  type Anmeldung,
  type AnmeldungsArt,
  type ID,
  type Projekt,
  type StatusZiel,
} from '../domain/types';
import { istAenderung, statusVon, workflowFuerArt } from '../domain/workflow';
import type { Route } from '../lib/router';
import { useStore } from '../store/store';
import { ProjektDialog, PROJEKT_STATUS_TON } from './Projekte';

/** „alle“ oder die ID eines Workflows. */
type WorkflowFilter = 'alle' | ID;

/** Neuanlage aus dem Anmeldebedarf: Art je Phase – der Workflow ergibt sich aus der Art. */
const BEDARF_ART: Record<BedarfPhase, AnmeldungsArt> = {
  skm: 'SKM',
  pze: 'PzE',
  'N-2': 'A_Vor_N-2',
  'N-1': 'A_Vor_N-1',
};

export function ProjektDetail({ projekt, navigate }: { projekt: Projekt; navigate: (r: Route) => void }) {
  const { data, deleteProjekt, toggleMarkiert } = useStore();
  const toast = useToast();
  const [bearbeiten, setBearbeiten] = useState(false);
  const [loeschen, setLoeschen] = useState(false);
  const [neu, setNeu] = useState<AnmeldungVorgabe | null>(null);
  const [wechsel, setWechsel] = useState<{ anmeldung: Anmeldung; nach: StatusZiel } | null>(null);
  const [filter, setFilter] = useState<WorkflowFilter>('alle');
  const [suche, setSuche] = useState('');

  const eigene = data.anmeldungen.filter((a) => a.projektId === projekt.id);
  const bedarf = anmeldebedarf(projekt, data.anmeldungen, data.einstellungen);
  const oeffne = (a: Anmeldung) => navigate({ view: 'anmeldung', projektId: projekt.id, anmeldungId: a.id });

  const workflowVon = (a: Anmeldung) => statusVon(data.workflows, a.statusId).workflow.id;
  // Sortiert nach der Reihenfolge der Workflows, darin nach Baubeginn
  const rang = (a: Anmeldung) => data.workflows.findIndex((w) => w.id === workflowVon(a));
  const gefiltert = eigene
    .filter((a) => filter === 'alle' || workflowVon(a) === filter)
    .filter((a) => {
      if (!suche.trim()) return true;
      const { workflow, status } = statusVon(data.workflows, a.statusId);
      return [a.anmeldeId, a.bfStrecke, a.gewerk, a.bemerkung, a.art, workflow.name, status.name, a.aenderungsNr]
        .join(' ')
        .toLowerCase()
        .includes(suche.toLowerCase());
    })
    .sort((a, b) => rang(a) - rang(b) || (a.bauVon ?? '').localeCompare(b.bauVon ?? ''));

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
              <dt>Geplante Bauzeit</dt>
              <dd>
                {formatDate(projekt.bauzeitVon)} – {formatDate(projekt.bauzeitBis)}
              </dd>
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
          sub="Aus Bauzeit und erstem Anmeldetermin: ob eine Anmeldung zum nächsten SKM, PzE oder N-x fällig ist"
        />
        {bedarf.length === 0 ? (
          <EmptyState icon="kalender" titel="Ohne Bauzeit" text="Mit einer geplanten Bauzeit lässt sich der Anmeldebedarf ablesen." />
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Fahrplanjahr</th>
                  {bedarf[0].zellen.map((z) => (
                    <th key={z.phase}>{RIL_LABEL[z.phase]}</th>
                  ))}
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
                        <BedarfInhalt
                          zelle={zelle}
                          onOeffnen={oeffne}
                          onAnlegen={() =>
                            setNeu({
                              workflowId: workflowFuerArt(data.workflows, BEDARF_ART[zelle.phase])?.id,
                              art: BEDARF_ART[zelle.phase],
                              fahrplanjahr: zelle.fahrplanjahr,
                            })
                          }
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="row-between wrap">
        <Segmented<WorkflowFilter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'alle', label: `Alle (${eigene.length})` },
            ...data.workflows.map((w) => ({
              value: w.id,
              label: `${w.kurz || w.name} (${eigene.filter((a) => workflowVon(a) === w.id).length})`,
            })),
          ]}
        />
        <div className="row wrap">
          <Search value={suche} onChange={setSuche} placeholder="ID, Bf/Strecke, Gewerk, Status …" />
          <button type="button" className="btn btn-primary" onClick={() => setNeu({})}>
            <Icon name="plus" size={14} /> Neue Anmeldung
          </button>
        </div>
      </div>

      <Card>
        <CardHeader
          titel="Baubetriebliche Anmeldungen"
          sub="Je Anmeldung eine Zeile; zur Wahl stehen nur die möglichen Nachfolge-Status"
        />
        {gefiltert.length === 0 ? (
          <EmptyState
            icon="kalender"
            titel={eigene.length === 0 ? 'Noch keine Anmeldung' : 'Nichts gefunden'}
            text={
              eigene.length === 0
                ? 'Neu angelegt wird im ersten Status eines Workflows – SKM, PzE, Vorprozess oder unterjährig.'
                : 'Für diese Auswahl gibt es keine Anmeldung.'
            }
          />
        ) : (
          <div className="table-scroll">
            <table className="table table-stack">
              <thead>
                <tr>
                  <th className="col-optional" style={{ width: 22 }} />
                  <th>Anmeldung</th>
                  <th className="col-optional">Art</th>
                  <th>Bauzeitraum</th>
                  <th>Status</th>
                  <th>Terminfrist</th>
                  <th className="actions" />
                </tr>
              </thead>
              <tbody>
                {gefiltert.map((a) => {
                  const frist = terminfrist(a, data);
                  const ampel = ampelFuer(frist.datum, data.einstellungen.vorlaufTage);
                  return (
                    <tr key={a.id} className="clickable" onClick={() => oeffne(a)}>
                      <td className="col-optional">
                        <AmpelPunkt ampel={ampel} />
                      </td>
                      <td>
                        {a.anmeldeId ? <strong>{a.anmeldeId}</strong> : <span className="tertiary">ohne ID</span>}
                        <div className="small tertiary">
                          {[a.bfStrecke, a.gewerk].filter(Boolean).join(' · ') || '–'}
                        </div>
                        {a.herkunftId ? <div className="small tertiary">aus Aufteilung übernommen</div> : null}
                      </td>
                      <td className="small col-optional" style={{ whiteSpace: 'nowrap' }}>
                        {a.art}
                      </td>
                      <td className="small">{bauzeitraumText(a, data.workflows)}</td>
                      <td>
                        <StatusBadge statusId={a.statusId} />
                        {istAenderung(data.workflows, a.statusId) && (a.aenderungsNr || a.annexVII) ? (
                          <div className="small tertiary">
                            {[a.aenderungsNr && `ÄAbst-Nr ${a.aenderungsNr}`, a.annexVII && ANNEX_VII_LABEL[a.annexVII]]
                              .filter(Boolean)
                              .join(' · ')}
                          </div>
                        ) : null}
                      </td>
                      <td>
                        <TerminZelle frist={frist} />
                      </td>
                      <td className="actions" onClick={(e) => e.stopPropagation()}>
                        <NachfolgerAuswahl statusId={a.statusId} onWaehle={(nach) => setWechsel({ anmeldung: a, nach })} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {bearbeiten ? <ProjektDialog projekt={projekt} onClose={() => setBearbeiten(false)} /> : null}
      {neu ? (
        <AnmeldungDialog projekt={projekt} vorgabe={neu} onClose={() => setNeu(null)} />
      ) : null}
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
function BedarfInhalt({
  zelle,
  onOeffnen,
  onAnlegen,
}: {
  zelle: BedarfZelle;
  onOeffnen: (a: Anmeldung) => void;
  onAnlegen: () => void;
}) {
  const { data } = useStore();
  const datum = zelle.frist ? formatDate(zelle.frist) : '–';
  switch (zelle.zustand) {
    case 'abgedeckt':
      return (
        <button type="button" className="link-btn small" onClick={() => onOeffnen(zelle.durch!)} title="Eintrag öffnen">
          <Badge ton="green">✓ {zelle.durch!.art}</Badge>
          <div className="tertiary small">{statusVon(data.workflows, zelle.durch!.statusId).status.name}</div>
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
          <button type="button" className="btn btn-sm btn-outline" style={{ marginTop: 4 }} onClick={onAnlegen}>
            <Icon name="plus" size={11} /> Anlegen
          </button>
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
