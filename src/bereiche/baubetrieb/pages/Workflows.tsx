/**
 * Verwaltung der Workflows – aufgebaut wie im Planlaufmanagement: Karten der
 * Workflows mit dem Standardverlauf als Punktkette (components/AblaufVorschau.tsx),
 * Öffnen, Duplizieren und Löschen; „Öffnen“ bzw. ein Klick auf die Karte führt
 * in den grafischen Workflow-Editor (components/WorkflowEditor.tsx). Ein
 * Workflow besteht aus Status in einer Reihenfolge; jeder Status hat eine
 * Terminfrist und mögliche Nachfolger. Ein Nachfolger in einem anderen
 * Workflow übernimmt die Anmeldung in die nächste Phase. Neu angelegt wird im
 * ersten Status.
 */
import { Fragment, useState } from 'react';
import { Icon } from '../../../shared/icons';
import { useToast } from '../../../shared/toast';
import { Badge, Card, CardHeader, ConfirmDialog, EmptyState } from '../../../shared/ui';
import { AblaufVorschau } from '../components/AblaufVorschau';
import { WorkflowEditor } from '../components/WorkflowEditor';
import { rilFristText } from '../domain/fristen';
import { BAUZEITRAUM_LABEL, PHASE_LABEL, RIL_KUERZEL, RIL_LABEL, rilFristenNachPhase, type Workflow } from '../domain/types';
import { anmeldungenJeStatus, workflowKopie } from '../domain/workflowPflege';
import { gliedern } from '../domain/workflowGraph';
import type { Route } from '../lib/router';
import { newId, useStore } from '../store/store';

export function Workflows({ navigate }: { navigate: (r: Route) => void }) {
  const { data, saveWorkflow, deleteWorkflow } = useStore();
  const toast = useToast();
  const [editor, setEditor] = useState<{ workflow?: Workflow } | null>(null);
  const [loeschen, setLoeschen] = useState<Workflow | null>(null);
  const zahl = anmeldungenJeStatus(data);
  const anmeldungenIn = (w: Workflow) => w.status.reduce((summe, s) => summe + (zahl.get(s.id) ?? 0), 0);

  const duplizieren = (w: Workflow) => {
    saveWorkflow(workflowKopie(w, () => newId('st'), newId('wf')));
    toast('Workflow dupliziert – jetzt individuell anpassbar.');
  };

  const karte = (w: Workflow) => {
    const anzahl = anmeldungenIn(w);
    const g = gliedern(w.status, w.id, data.workflows);
    return (
      // Die ganze Karte öffnet den Editor; per Tastatur über „Öffnen“
      <div key={w.id} className="bb-wf-liste-karte" onClick={() => setEditor({ workflow: w })}>
        <div className="bb-wf-liste-kopf">
          <span className="bb-wf-liste-zeichen">
            <Icon name="kette" size={16} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <strong>{w.name}</strong>
            <div className="row wrap" style={{ gap: 6, marginTop: 3 }}>
              {w.herkunft === 'standard' ? <Badge>Standard</Badge> : <Badge ton="blue">Eigener Workflow</Badge>}
              {w.kurz && w.kurz !== w.name ? <span className="small tertiary">Kurzbezeichnung {w.kurz}</span> : null}
            </div>
          </div>
        </div>
        {w.beschreibung ? <p className="bb-wf-liste-text">{w.beschreibung}</p> : null}
        <AblaufVorschau workflow={w} workflows={data.workflows} />
        <div className="bb-wf-liste-zahlen">
          <span>
            <b>{w.status.length}</b> Status
          </span>
          <span>
            <b>{g.abweichungen.length}</b> {g.abweichungen.length === 1 ? 'Abweichung' : 'Abweichungen'}
          </span>
          <span>
            <b>{anzahl}</b> {anzahl === 1 ? 'Anmeldung' : 'Anmeldungen'}
          </span>
          <span>{BAUZEITRAUM_LABEL[w.bauzeitraum]}</span>
          <span>Maßnahmenarten: {w.arten.join(', ')}</span>
        </div>
        <div className="bb-wf-liste-fuss" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="btn btn-sm btn-primary" onClick={() => setEditor({ workflow: w })}>
            <Icon name="bearbeiten" size={13} /> Öffnen
          </button>
          <button type="button" className="btn btn-sm" onClick={() => duplizieren(w)}>
            <Icon name="kopieren" size={13} /> Duplizieren
          </button>
          <span className="spacer" />
          {w.herkunft === 'manuell' ? (
            <button
              type="button"
              className="btn-icon"
              onClick={() => setLoeschen(w)}
              disabled={anzahl > 0}
              title={anzahl > 0 ? 'In diesem Workflow stehen noch Anmeldungen.' : 'Workflow löschen'}
              aria-label="Workflow löschen"
            >
              <Icon name="loeschen" size={15} />
            </button>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <div className="stack">
      <div className="row-between wrap">
        <p className="muted small" style={{ maxWidth: 680 }}>
          Je Phase ein Workflow. Eine Anmeldung durchläuft die Status ihres Workflows; ein Nachfolger in einem anderen
          Workflow übernimmt sie in die nächste Phase. Neu angelegt wird immer im ersten Status. Änderungen wirken
          sofort auf alle Anmeldungen.
        </p>
        <button type="button" className="btn btn-primary" onClick={() => setEditor({})}>
          <Icon name="plus" size={14} /> Neuer Workflow
        </button>
      </div>

      <Card>
        <CardHeader titel="Weg einer Anmeldung" sub="Die Workflows in ihrer Reihenfolge" />
        <div className="card-pad">
          <div className="chain">
            {data.workflows.map((w, i) => (
              <Fragment key={w.id}>
                {i > 0 ? <div className="chain-arrow">›</div> : null}
                <div className="chain-node" style={{ maxWidth: 220 }}>
                  <div className="cn-name">{w.name}</div>
                  <div className="cn-meta">{w.beschreibung || BAUZEITRAUM_LABEL[w.bauzeitraum]}</div>
                </div>
              </Fragment>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader titel="Workflows" sub="Mitgelieferte Standard-Workflows und eigene" />
        <div className="card-pad">
          {data.workflows.length === 0 ? (
            <EmptyState icon="kette" titel="Kein Workflow" text="Legen Sie einen Workflow an." />
          ) : (
            <div className="bb-wf-liste">{data.workflows.map(karte)}</div>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader
          titel="Fristen laut Richtlinie"
          sub="Grundlage der Terminfristen „Frist laut Richtlinie“, gegliedert nach Phase: Ril_KM nimmt die N-2- oder die N-1-Frist, Ril_KKM die Frist der Maßnahmenart"
          actions={
            <button type="button" className="btn btn-outline btn-sm" onClick={() => navigate({ view: 'fristen' })}>
              Anpassen
            </button>
          }
        />
        {rilFristenNachPhase().map(({ phase, schluessel }) => (
          <Fragment key={phase}>
            <div className="list-row small" style={{ background: 'var(--fill-gruppe)', paddingTop: 6, paddingBottom: 6 }}>
              <strong>{PHASE_LABEL[phase]}</strong>
            </div>
            {schluessel.map((s) => {
              const frist = data.einstellungen.rilFristen[s];
              return (
                <div key={s} className="list-row">
                  <div style={{ flex: 1, minWidth: 0 }} title={RIL_LABEL[s]}>
                    <strong>{RIL_KUERZEL[s]}</strong>
                  </div>
                  <span className="small">{rilFristText(frist)}</span>
                  {frist.platzhalter ? <Badge ton="orange">Platzhalter</Badge> : <Badge ton="green">geprüft</Badge>}
                </div>
              );
            })}
          </Fragment>
        ))}
      </Card>

      {editor ? <WorkflowEditor workflow={editor.workflow} onClose={() => setEditor(null)} /> : null}
      {loeschen ? (
        <ConfirmDialog
          titel="Workflow löschen?"
          text={`„${loeschen.name}“ wird gelöscht. Nachfolger anderer Workflows, die in ihn führen, entfallen.`}
          onConfirm={() => {
            deleteWorkflow(loeschen.id);
            toast('Workflow gelöscht.');
          }}
          onClose={() => setLoeschen(null)}
        />
      ) : null}
    </div>
  );
}
