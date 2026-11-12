/**
 * Projektliste mit Anlage- und Bearbeitungsdialog. Die Kacheln nennen nur
 * Projektnummer, Projektname, Beschreibung und die anderen Bereiche des
 * Projekts. Darunter die im Bereich
 * archivierten Projekte und – grau hinterlegt – Projekte aus anderen Bereichen
 * zum Übernehmen (Projektregister, src/gemeinsam/).
 */
import { useState } from 'react';
import {
  ArchivAbschnitt,
  BereichsMarken,
  FremdeProjekte,
  VerknuepfungsHinweis,
  useArchivierte,
} from '../../../gemeinsam/ProjektBereiche';
import type { Project, ProjectStatus } from '../domain/types';
import type { Route } from '../lib/router';
import { useStore } from '../store/store';
import { useToast } from '../../../shared/toast';
import { Badge, Card, EmptyState, Field, Modal, Search, Select, TextArea, TextInput } from '../../../shared/ui';
import { Icon } from '../../../shared/icons';

const STATUS_OPTIONEN = [
  { value: 'aktiv', label: 'Aktiv' },
  { value: 'pausiert', label: 'Pausiert' },
  { value: 'abgeschlossen', label: 'Abgeschlossen' },
];

const STATUS_TON: Record<ProjectStatus, '' | 'green' | 'orange'> = {
  aktiv: 'green',
  pausiert: 'orange',
  abgeschlossen: '',
};

export function Projekte({ navigate }: { navigate: (r: Route) => void }) {
  const { data, toggleMarkiert, ladeZustand } = useStore();
  const [suche, setSuche] = useState('');
  const [dialog, setDialog] = useState<{ project?: Project } | null>(null);

  const projekte = data.projects.filter((p) =>
    [p.name, p.nummer, p.beschreibung].join(' ').toLowerCase().includes(suche.toLowerCase()),
  );
  const archiviert = useArchivierte('planlauf');
  const aktive = projekte.filter((p) => !archiviert.has(p.id));
  const archivierte = projekte.filter((p) => archiviert.has(p.id));
  const nurArchivierte = archivierte.length > 0 && !suche.trim();

  const karte = (p: Project) => {
    return (
      <button
        key={p.id}
        type="button"
        className="card card-click gem-kachel"
        onClick={() => navigate({ view: 'projekt', projectId: p.id, tab: 'uebersicht' })}
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
              <Badge ton={STATUS_TON[p.status]}>{STATUS_OPTIONEN.find((s) => s.value === p.status)?.label}</Badge>
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
            </span>
          </div>
          <BereichsMarken bereich="planlauf" lokaleId={p.id} />
        </div>
      </button>
    );
  };

  return (
    <div className="stack">
      <div className="row-between wrap">
        <div className="row wrap">
          <Search value={suche} onChange={setSuche} placeholder="Projekt, Nummer …" />
          <span className="small tertiary">
            Alle Bearbeiter sehen alle Projekte. Mit ★ markierte Projekte erscheinen in der Übersicht und in der
            Seitenleiste.
          </span>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setDialog({})}>
          <Icon name="plus" size={14} /> Neues Projekt
        </button>
      </div>

      {aktive.length === 0 ? (
        <Card>
          <EmptyState
            icon="projekt"
            // Sind alle Projekte archiviert, liest sich „Kein Projekt gefunden“, als gäbe es keines
            titel={nurArchivierte ? 'Kein aktives Projekt' : 'Kein Projekt gefunden'}
            text={
              nurArchivierte
                ? 'Alle Projekte dieses Bereichs sind archiviert – sie stehen unten unter „Archiv“.'
                : 'Legen Sie ein Projekt an oder übernehmen Sie eines aus einem anderen Bereich, um Planpakete und Planläufe zu verwalten.'
            }
            action={
              <button type="button" className="btn btn-primary" onClick={() => setDialog({})}>
                <Icon name="plus" size={14} /> Neues Projekt
              </button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-2">{aktive.map(karte)}</div>
      )}

      <ArchivAbschnitt anzahl={archivierte.length}>{archivierte.map(karte)}</ArchivAbschnitt>
      {/* Nur bei geladenem Bestand: Sonst sähe das Register die Übernahme vor, angelegt würde nichts */}
      {ladeZustand === 'ok' ? <FremdeProjekte bereich="planlauf" suche={suche} /> : null}

      {dialog ? <ProjektDialog project={dialog.project} onClose={() => setDialog(null)} navigate={navigate} /> : null}
    </div>
  );
}

export function ProjektDialog({
  project,
  onClose,
  navigate,
}: {
  project?: Project;
  onClose: () => void;
  navigate?: (r: Route) => void;
}) {
  const { data, addProject, updateProject, addRole } = useStore();
  const toast = useToast();
  const [form, setForm] = useState({
    nummer: project?.nummer ?? '',
    name: project?.name ?? '',
    status: project?.status ?? ('aktiv' as ProjectStatus),
    markiert: project?.markiert ?? true,
    beschreibung: project?.beschreibung ?? '',
  });

  const set = <K extends keyof typeof form>(key: K, wert: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: wert }));

  const speichern = () => {
    if (!form.name.trim()) {
      toast('Bitte einen Projektnamen angeben.');
      return;
    }
    // Leerzeichen am Rand gehen nicht in den Bestand – die Nummer verknüpft das Projekt mit den anderen Bereichen
    const werte = { ...form, name: form.name.trim(), nummer: form.nummer.trim() };
    if (project) {
      updateProject(project.id, werte);
      toast('Projekt aktualisiert.');
      onClose();
      return;
    }
    const id = addProject({
      ...werte,
      settings: {
        erinnerungVorlaufTage: 5,
        fristenInArbeitstagen: true,
        feiertage: [],
        absenderName: '',
        absenderEmail: '',
      },
    });
    // Funktionen als Projektfunktionen übernehmen
    data.standardRollen.forEach((r) =>
      addRole({
        projectId: id,
        name: r.name,
        kuerzel: r.kuerzel,
        farbe: r.farbe,
        beschreibung: r.beschreibung,
        gewerk: r.gewerk,
        seite: r.seite ?? null,
      }),
    );
    toast('Projekt angelegt – die Funktionen wurden übernommen.');
    onClose();
    navigate?.({ view: 'projekt', projectId: id, tab: 'uebersicht' });
  };

  return (
    <Modal
      titel={project ? 'Projekt bearbeiten' : 'Neues Projekt'}
      sub={project ? project.nummer : 'Grunddaten erfassen – Rollen und Vorlagen werden vorbelegt'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Abbrechen
          </button>
          <button type="button" className="btn btn-primary" onClick={speichern}>
            {project ? 'Speichern' : 'Projekt anlegen'}
          </button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Projektnummer">
          <TextInput value={form.nummer} onChange={(v) => set('nummer', v)} placeholder="2026-001" />
        </Field>
        <Field label="Status">
          <Select value={form.status} onChange={(v) => set('status', v as ProjectStatus)} options={STATUS_OPTIONEN} />
        </Field>
        <Field label="Projektname" full>
          <TextInput value={form.name} onChange={(v) => set('name', v)} placeholder="Neubau …" />
        </Field>
        <Field label="Beschreibung" full>
          <TextArea value={form.beschreibung} onChange={(v) => set('beschreibung', v)} rows={3} />
        </Field>
      </div>
      {project ? null : <VerknuepfungsHinweis bereich="planlauf" nummer={form.nummer} />}
    </Modal>
  );
}
