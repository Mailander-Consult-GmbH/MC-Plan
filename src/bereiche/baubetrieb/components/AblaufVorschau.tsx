/**
 * Kompakte Darstellung eines Workflows in der Workflow-Liste – wie im
 * Planlaufmanagement: die Status des Standardverlaufs als Punktkette (Farbe
 * nach Art des Status), am Ende die Übernahme in den nächsten Workflow bzw.
 * ein offener Kreis, dazu die Zahl der Abweichungen (domain/workflowGraph.ts).
 */
import { STATUS_ART_LABEL, type Workflow } from '../domain/types';
import { statusInfo } from '../domain/workflow';
import { gliedern } from '../domain/workflowGraph';
import { STATUS_TON } from './common';
import './workflowEditor.css';

export function AblaufVorschau({ workflow, workflows }: { workflow: Workflow; workflows: Workflow[] }) {
  const { haupt, ende, abweichungen } = gliedern(workflow.status, workflow.id, workflows);
  const nachId = new Map(workflow.status.map((s, i) => [s.id, { s, i }]));
  const ziel = ende.art === 'uebernahme' ? statusInfo(workflows, ende.ziel) : null;
  return (
    <div className="bb-wf-vorschau" aria-hidden="true">
      {haupt.map((id, k) => {
        const { s, i } = nachId.get(id)!;
        const ton = STATUS_TON[s.art];
        return (
          <span key={id} style={{ display: 'contents' }}>
            {k > 0 ? <span className="bb-wf-vorschau-strich" /> : null}
            <span
              className={`bb-wf-vorschau-knoten ${ton ? `ton-${ton}` : ''}`}
              title={`${String(i + 1).padStart(2, '0')} · ${s.name || 'ohne Bezeichnung'} (${STATUS_ART_LABEL[s.art]})`}
            />
          </span>
        );
      })}
      {haupt.length > 0 ? (
        <>
          <span className="bb-wf-vorschau-strich" />
          {ziel ? (
            <span className="bb-wf-vorschau-weiter" title={`Übernahme in ${ziel.workflow.name} · ${ziel.status.name}`}>
              → {ziel.workflow.kurz || ziel.workflow.name}
            </span>
          ) : (
            <span className="bb-wf-vorschau-ende" />
          )}
        </>
      ) : null}
      {abweichungen.length > 0 ? (
        <span className="bb-wf-vorschau-zusatz">
          + {abweichungen.length} {abweichungen.length === 1 ? 'Abweichung' : 'Abweichungen'}
        </span>
      ) : null}
    </div>
  );
}
