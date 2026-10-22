/**
 * Projekthülle: Stammdaten, Anmeldebedarf je Fahrplanjahr und die Liste der
 * baubetrieblichen Anmeldungen mit Statuswechsel direkt in der Zeile.
 */
import { useState } from 'react';
import { formatDate } from '../../../shared/dates';
import { Icon } from '../../../shared/icons';
import { useToast } from '../../../shared/toast';
import { Badge, Card, CardHeader, ConfirmDialog, EmptyState, Search, Segmented } from '../../../shared/ui';
import { AnmeldungDialog } from '../components/AnmeldungDialog';
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
  PHASEN,
  PROJEKT_STATUS_LABEL,
  RIL_LABEL,
  type Anmeldung,
  type AnmeldungsArt,
  type ArbeitsPhase,
  type Projekt,
  type StatusCode,
} from '../domain/types';
import { PHASEN_FOLGE, istAenderung, statusDef } from '../domain/workflow';
import type { Route } from '../lib/router';
import { useStore } from '../store/store';
import { ProjektDialog, PROJEKT_STATUS_TON } from './Projekte';

type PhasenFilter = 'alle' | ArbeitsPhase;

/** Neuanlage aus dem Anmeldebedarf: Startstatus und Art je Phase. */
const BEDARF_VORGABE: Record<BedarfPhase, { status: StatusCode; art?: AnmeldungsArt }> = {
  skm: { status: 'V0' },
  pze: { status: 'W0' },
  'N-2': { status: 'X0', art: 'A_Vor_N-2' },
  'N-1': { status: 'X0', art: 'A_Vor_N-1' },
};

export function ProjektDetail({ projekt, navigate }: { projekt: Projekt; navigate: (r: Route) => void }) {
  const { data, deleteProjekt, toggleMarkiert } = useStore();
  const toast = useToast();
  const [bearbeiten, setBearbeiten] = useState(false);
  const [loeschen, setLoeschen] = useState(false);
  const [neu, setNeu] = useState<{ status: StatusCode; art?: AnmeldungsArt; fahrplanjahr?: number } | null>(null);
  const [wechsel, setWechsel] = useState<{ anmeldung: Anmeldung; nach: StatusCode } | null>(null);
  const [filter, setFilter] = useState<PhasenFilter>('alle');
  const [suche, setSuche] = useState('');

  const eigene = data.anmeldungen.filter((a) => a.projektId === projekt.id);
  const bedarf = anmeldebedarf(projekt, data.anmeldungen, data.einstellungen);
  const oeffne = (a: Anmeldung) => navigate({ view: 'anmeldung', projektId: projekt.id, anmeldungId: a.id });

  const phaseVon = (a: Anmeldung) => statusDef(a.status).phase as ArbeitsPhase;
  const gefiltert = eigene
    .filter((a) => filter === 'alle' || phaseVon(a) === filter)
    .filter((a) => {
      if (!suche.trim()) return true;
      const def = statusDef(a.status);
      return [a.anmeldeId, a.bfStrecke, a.gewerk, a.bemerkung, a.art, def.code, def.name, a.aenderungsNr]
        .join(' ')
        .toLowerCase()
        .includes(suche.toLowerCase());
    })
    .sort(
      (a, b) =>
        PHASEN_FOLGE.indexOf(phaseVon(a)) - PHASEN_FOLGE.indexOf(phaseVon(b)) ||
        (a.bauVon ?? '').localeCompare(b.bauVon ?? ''),
    );

  return (
    <div className="stack">
      <div className="row-between wrap">
        <button type="button" className="btn btn-ghost" onClick={() => navigate({ view: 'projekte' })}>
          <Icon name="zurueck" size={14} /> Projekthüllen
        </button>
        <div className="row wrap">
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => monitorExportieren(data, [projekt.id])}
            title="Anmeldungen und Projekthülle als Excel-Datei"
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
                            setNeu({ ...BEDARF_VORGABE[zelle.phase], fahrplanjahr: zelle.fahrplanjahr })
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
        <Segmented<PhasenFilter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'alle', label: `Alle (${eigene.length})` },
            ...PHASEN.map((p) => ({
              value: p.id,
              label: `${p.kurz} (${eigene.filter((a) => phaseVon(a) === p.id).length})`,
            })),
          ]}
        />
        <div className="row wrap">
          <Search value={suche} onChange={setSuche} placeholder="ID, Bf/Strecke, Gewerk, Status …" />
          <button type="button" className="btn btn-primary" onClick={() => setNeu({ status: 'Y0' })}>
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
                ? 'Neu angelegt wird als Entwurf in SKM, PzE, Vorprozess oder unterjährig.'
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
                  const frist = terminfrist(a, data.einstellungen);
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
                      <td className="small">{bauzeitraumText(a)}</td>
                      <td>
                        <StatusBadge code={a.status} />
                        {istAenderung(a.status) && (a.aenderungsNr || a.annexVII) ? (
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
                        <NachfolgerAuswahl code={a.status} onWaehle={(nach) => setWechsel({ anmeldung: a, nach })} />
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
          titel="Projekthülle löschen?"
          text={`„${projekt.name}“ wird samt ${eigene.length} ${
            eigene.length === 1 ? 'Anmeldung' : 'Anmeldungen'
          } gelöscht. Das lässt sich nicht rückgängig machen.`}
          onConfirm={() => {
            deleteProjekt(projekt.id);
            toast('Projekthülle gelöscht.');
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
  const datum = zelle.frist ? formatDate(zelle.frist) : '–';
  switch (zelle.zustand) {
    case 'abgedeckt':
      return (
        <button type="button" className="link-btn small" onClick={() => onOeffnen(zelle.durch!)} title="Eintrag öffnen">
          <Badge ton="green">✓ {zelle.durch!.art}</Badge>
          <div className="tertiary small">{statusDef(zelle.durch!.status).name}</div>
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
        <span className="small tertiary" title="Liegt vor dem ersten Anmeldetermin der Projekthülle">
          vor Betreuung
          <div>{datum}</div>
        </span>
      );
    default:
      return <span className="small tertiary">–</span>;
  }
}
