/**
 * Kompakte Darstellung eines Workflows: die Schritte des Standardverlaufs als
 * Punktkette (Entscheidungen als Raute) und die Zahl der Abweichungen – in der
 * Workflow-Liste und beim Start eines Planlaufs. Dazu der Baustein, mit dem
 * sich die Schritte eines einzelnen Planlaufs im Workflow-Editor anpassen
 * lassen („Individueller Workflow“).
 */
import { useState } from 'react';
import { STEP_TYPE_LABEL, type ProcessTemplate, type ProcessTemplateStep } from '../domain/types';
import { dauerImStandardverlauf, gliedern } from '../domain/workflowGraph';
import { Badge } from '../../../shared/ui';
import { Icon } from '../../../shared/icons';
import { WorkflowEditor } from './WorkflowEditor';
import './workflowEditor.css';

export function AblaufVorschau({ steps }: { steps: ProcessTemplateStep[] }) {
  const { haupt, abweichungen, rueckSprungZu } = gliedern(steps);
  const nachId = new Map(steps.map((s, i) => [s.id, { s, i }]));
  return (
    <div className="wf-vorschau" aria-hidden="true">
      {haupt.map((id, k) => {
        const { s, i } = nachId.get(id)!;
        return (
          <span key={id} style={{ display: 'contents' }}>
            {k > 0 ? <span className="wf-vorschau-strich" /> : null}
            <span
              className={`wf-vorschau-knoten ${s.typ}`}
              title={`${String(i + 1).padStart(2, '0')} · ${s.name || 'ohne Bezeichnung'} (${STEP_TYPE_LABEL[s.typ]})`}
            />
          </span>
        );
      })}
      {haupt.length > 0 ? (
        <>
          <span className="wf-vorschau-strich" />
          {rueckSprungZu ? <Icon name="schleife" size={12} /> : <span className="wf-vorschau-ende" />}
        </>
      ) : null}
      {abweichungen.length > 0 ? (
        <span className="wf-vorschau-zusatz">
          + {abweichungen.length} {abweichungen.length === 1 ? 'Abweichung' : 'Abweichungen'}
        </span>
      ) : null}
    </div>
  );
}

/** Zahlen zu einem Workflow: Schritte, Entscheidungen, Tage im Standardverlauf. */
export function ablaufZahlen(steps: ProcessTemplateStep[]) {
  return {
    schritte: steps.length,
    entscheidungen: steps.filter((s) => s.typ === 'entscheidung').length,
    tage: dauerImStandardverlauf(steps),
  };
}

/**
 * Schritte eines neuen Planlaufs: Vorschau des gewählten Workflows und die
 * Schaltfläche „Individueller Workflow“, die den Editor für genau diesen
 * Planlauf öffnet. Der Workflow selbst bleibt unverändert.
 */
export function LaufSchritte({
  vorlage,
  steps,
  angepasst,
  rollen,
  arbeitstage,
  onUebernehmen,
  onZuruecksetzen,
  neuerLauf = false,
}: {
  vorlage: ProcessTemplate | undefined;
  steps: ProcessTemplateStep[];
  angepasst: boolean;
  rollen: string[];
  arbeitstage: boolean;
  onUebernehmen: (steps: ProcessTemplateStep[]) => void;
  onZuruecksetzen: () => void;
  /** Beim Neustart: Die Schritte gehören zum neuen Planlauf, nicht zum laufenden. */
  neuerLauf?: boolean;
}) {
  const [offen, setOffen] = useState(false);
  const z = ablaufZahlen(steps);
  const bezug = neuerLauf ? 'den neuen Planlauf' : 'diesen Planlauf';
  return (
    <div className="wf-lauf">
      <div className="wf-lauf-kopf">
        <div style={{ minWidth: 0 }}>
          <div className="row wrap" style={{ gap: 8 }}>
            <strong>{neuerLauf ? 'Ablauf des neuen Planlaufs' : 'Ablauf dieses Planlaufs'}</strong>
            {angepasst ? <Badge ton="orange">Individuell angepasst</Badge> : null}
          </div>
          <div className="small tertiary">
            {z.schritte} {z.schritte === 1 ? 'Schritt' : 'Schritte'} · {z.entscheidungen} {z.entscheidungen === 1 ? 'Entscheidung' : 'Entscheidungen'} ·{' '}
            {z.tage} Tage im Standardverlauf{arbeitstage ? ' (Arbeitstage)' : ''}
          </div>
        </div>
        <div className="row wrap" style={{ gap: 6 }}>
          {angepasst ? (
            <button type="button" className="btn btn-sm" onClick={onZuruecksetzen}>
              Auf Workflow zurücksetzen
            </button>
          ) : null}
          <button type="button" className="btn btn-sm btn-outline" onClick={() => setOffen(true)}>
            <Icon name="bearbeiten" size={13} /> Individueller Workflow
          </button>
        </div>
      </div>
      <AblaufVorschau steps={steps} />
      <p className="small muted">
        {angepasst
          ? `Die Schritte weichen für ${bezug} vom Workflow „${vorlage?.name ?? '–'}“ ab; der Workflow selbst bleibt unverändert.`
          : `Die Schritte folgen dem Workflow „${vorlage?.name ?? '–'}“. „Individueller Workflow“ passt sie nur für ${bezug} an.`}
      </p>

      {offen ? (
        <WorkflowEditor
          titel="Individueller Workflow"
          untertitel={`Nur für ${bezug} – Grundlage: „${vorlage?.name ?? 'ohne Workflow'}“, der Workflow selbst bleibt unverändert`}
          steps={steps}
          rollen={rollen}
          arbeitstage={arbeitstage}
          speichernLabel="Übernehmen"
          onSpeichern={(e) => {
            // Ohne Änderung bleibt es beim Workflow
            if (e.geaendert) onUebernehmen(e.steps);
            setOffen(false);
          }}
          onClose={() => setOffen(false)}
        />
      ) : null}
    </div>
  );
}
