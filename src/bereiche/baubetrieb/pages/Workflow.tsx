/**
 * Status-Workflow der Anmeldungen: Phasen, Status, Terminfristen und mögliche
 * Nachfolger – die Tabelle „Ausprägung Merkmal Status Workflow“ des
 * Lastenhefts, ergänzt um die Zahl der Anmeldungen je Status.
 */
import { Fragment } from 'react';
import { Badge, Callout, Card, CardHeader } from '../../../shared/ui';
import { StatusBadge } from '../components/common';
import { fristRegelText, rilFristText } from '../domain/fristen';
import { ARTEN_JE_PHASE, PHASEN, PHASE_NAME, RIL_LABEL, RIL_SCHLUESSEL, type PhaseId } from '../domain/types';
import { START_STATUS, STATUS_WORKFLOW, istUebernahme, statusDef } from '../domain/workflow';
import type { Route } from '../lib/router';
import { useStore } from '../store/store';

export function Workflow({ navigate }: { navigate: (r: Route) => void }) {
  const { data } = useStore();
  const anzahl = (code: string) => data.anmeldungen.filter((a) => a.status === code).length;
  const phasen: PhaseId[] = ['V', 'W', 'X', 'Y', 'Z'];

  return (
    <div className="stack">
      <Card>
        <CardHeader
          titel="Weg einer Anmeldung"
          sub="Neu angelegt wird nur als Entwurf; zur Wahl stehen immer nur die möglichen Nachfolge-Status"
        />
        <div className="card-pad stack" style={{ gap: 14 }}>
          <div className="chain">
            {PHASEN.map((p, i) => (
              <Fragment key={p.id}>
                {i > 0 ? <div className="chain-arrow">›</div> : null}
                <div className="chain-node" style={{ maxWidth: 220 }}>
                  <div className="cn-name">
                    {p.name} <span className="tertiary">· {p.id}</span>
                  </div>
                  <div className="cn-meta">{p.beschreibung}</div>
                  <div className="cn-meta" style={{ marginTop: 4 }}>
                    Arten: {ARTEN_JE_PHASE[p.id].join(', ')}
                  </div>
                </div>
              </Fragment>
            ))}
          </div>
          <div className="row wrap" style={{ gap: 6 }}>
            <span className="small muted">Neuanlage in:</span>
            {START_STATUS.map((s) => (
              <StatusBadge key={s} code={s} />
            ))}
          </div>
          <Callout>
            Die Status bilden bewusst nicht den Genehmigungs- und Eskalationsprozess 1:1 ab; die verschiedenen
            Schreibtische einer Änderungsabstimmung werden nicht verfolgt. Anmeldeleichen (Z0) werden komplett
            gelöscht. Annahme: Anmeldungen in den Vorprozessen N-x erfolgen immer fristgerecht.
          </Callout>
        </div>
      </Card>

      {phasen.map((phase) => {
        const status = STATUS_WORKFLOW.filter((s) => s.phase === phase);
        return (
          <Card key={phase}>
            <CardHeader
              titel={`${PHASE_NAME[phase]} · ${phase}`}
              sub={PHASEN.find((p) => p.id === phase)?.beschreibung ?? 'Eintrag hat sich erledigt und wird gelöscht.'}
            />
            <div className="table-scroll">
              {/* Feste Spaltenbreiten, damit die Tabellen aller Phasen untereinander fluchten */}
              <table className="table" style={{ tableLayout: 'fixed', minWidth: 760 }}>
                <thead>
                  <tr>
                    <th style={{ width: 58 }}>Nr.</th>
                    <th style={{ width: '30%' }}>Name</th>
                    <th style={{ width: '20%' }}>Terminfrist in diesem Zustand</th>
                    <th style={{ width: '20%' }}>Nachfolger</th>
                    <th>Bemerkung</th>
                    <th className="zahl" style={{ width: 120 }}>
                      Anmeldungen
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {status.map((s) => (
                    <tr key={s.code}>
                      <td className="num">{s.code}</td>
                      <td>
                        <strong style={{ fontWeight: START_STATUS.includes(s.code) ? 700 : 500 }}>{s.name}</strong>
                      </td>
                      <td className="small">{fristRegelText(s.frist)}</td>
                      <td>
                        <span className="row wrap" style={{ gap: 4 }}>
                          {s.nachfolger.length === 0 ? <span className="tertiary small">–</span> : null}
                          {s.nachfolger.map((n) => (
                            <span key={n} title={`${n} · ${statusDef(n).name}`}>
                              <Badge ton={istUebernahme(s.code, n) ? 'purple' : n === 'Z0' ? 'red' : ''}>
                                {istUebernahme(s.code, n) ? `→ ${n}` : n}
                              </Badge>
                            </span>
                          ))}
                        </span>
                      </td>
                      <td className="small muted">
                        {[s.nachhaken ? 'Zum Nachhaken' : '', s.bemerkung ?? ''].filter(Boolean).join(' · ') || ''}
                      </td>
                      <td className={`zahl ${anzahl(s.code) ? '' : 'leer'}`}>{anzahl(s.code)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        );
      })}

      <Card>
        <CardHeader
          titel="Fristen laut Richtlinie"
          sub="Ril_X je nach Maßnahme (A, B(0), B(S), B, C, Container), Ril_Nx je nach Prozessphase N-2 oder N-1"
          actions={
            <button type="button" className="btn btn-outline btn-sm" onClick={() => navigate({ view: 'einstellungen' })}>
              Anpassen
            </button>
          }
        />
        {RIL_SCHLUESSEL.map((s) => {
          const frist = data.einstellungen.rilFristen[s];
          return (
            <div key={s} className="list-row">
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong>{RIL_LABEL[s]}</strong>
              </div>
              <span className="small">{rilFristText(frist)}</span>
              {frist.platzhalter ? <Badge ton="orange">Platzhalter</Badge> : <Badge ton="green">geprüft</Badge>}
            </div>
          );
        })}
        <div className="card-pad small tertiary" style={{ borderTop: '1px solid var(--separator)' }}>
          Weitere Regeln: „Nächster 1.8.“ bzw. „Nächster 31.7.“ zählen ab dem Statuswechsel; ein Nachhak-Termin liegt{' '}
          {data.einstellungen.nachhakTage} Tage nach dem Statuswechsel. Jeder Termin lässt sich in der Anmeldung von
          Hand festlegen.
        </div>
      </Card>
    </div>
  );
}
