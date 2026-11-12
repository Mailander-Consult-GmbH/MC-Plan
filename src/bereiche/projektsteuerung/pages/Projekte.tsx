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
import { Icon } from '../../../shared/icons';
import { useToast } from '../../../shared/toast';
import { Badge, Card, EmptyState, Field, Modal, Search, Select, TextArea, TextInput } from '../../../shared/ui';
import { PROJEKT_STATUS_LABEL, type Projekt, type ProjektStatus } from '../domain/types';
import type { Route } from '../lib/router';
import { useStore } from '../store/store';

const STATUS_OPTIONEN = (Object.keys(PROJEKT_STATUS_LABEL) as ProjektStatus[]).map((s) => ({
  value: s,
  label: PROJEKT_STATUS_LABEL[s],
}));

export const STATUS_TON: Record<ProjektStatus, '' | 'green' | 'orange'> = {
  aktiv: 'green',
  pausiert: 'orange',
  abgeschlossen: '',
};

export function Projekte({ navigate }: { navigate: (r: Route) => void }) {
  const { data, toggleMarkiert, ladeZustand } = useStore();
  const [suche, setSuche] = useState('');
  const [dialog, setDialog] = useState(false);

  const projekte = data.projekte.filter((p) =>
    [p.name, p.nummer, p.beschreibung].join(' ').toLowerCase().includes(suche.toLowerCase()),
  );
  const archiviert = useArchivierte('projektsteuerung');
  const aktive = projekte.filter((p) => !archiviert.has(p.id));
  const archivierte = projekte.filter((p) => archiviert.has(p.id));
  const nurArchivierte = archivierte.length > 0 && !suche.trim();

  const karte = (p: Projekt) => {
    return (
      <button
        key={p.id}
        type="button"
        className="card card-click gem-kachel"
        onClick={() => navigate({ view: 'projekt', projektId: p.id, tab: 'beteiligte' })}
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
              <Badge ton={STATUS_TON[p.status]}>{PROJEKT_STATUS_LABEL[p.status]}</Badge>
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
          <BereichsMarken bereich="projektsteuerung" lokaleId={p.id} />
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
            Alle sehen alle Projekte. Mit ★ markierte Projekte erscheinen in der Übersicht und in der Seitenleiste.
          </span>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setDialog(true)}>
          <Icon name="plus" size={14} /> Neues Projekt
        </button>
      </div>

      {aktive.length === 0 && suche.trim() ? (
        // Suche ohne Treffer ist kein leerer Bestand – kein Anlegen-Knopf; Treffer im Archiv stehen eingeklappt darunter
        <Card>
          <EmptyState
            icon="projekt"
            titel={archivierte.length > 0 ? 'Kein aktives Projekt gefunden' : 'Kein Projekt gefunden'}
            text={
              archivierte.length > 0
                ? 'Für diese Suche gibt es nur Treffer im Archiv – sie stehen unten unter „Archiv“.'
                : 'Für diese Suche gibt es keinen Treffer.'
            }
          />
        </Card>
      ) : aktive.length === 0 ? (
        <Card>
          <EmptyState
            icon="projekt"
            // Sind alle Projekte archiviert, liest sich „Kein Projekt gefunden“, als gäbe es keines
            titel={nurArchivierte ? 'Kein aktives Projekt' : 'Kein Projekt gefunden'}
            text={
              nurArchivierte
                ? 'Alle Projekte dieses Bereichs sind archiviert – sie stehen unten unter „Archiv“.'
                : 'Legen Sie ein Projekt an oder übernehmen Sie eines aus einem anderen Bereich, um Projektbeteiligte und Protokolle zu führen.'
            }
            action={
              <button type="button" className="btn btn-primary" onClick={() => setDialog(true)}>
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
      {ladeZustand === 'ok' ? <FremdeProjekte bereich="projektsteuerung" suche={suche} /> : null}

      {dialog ? <ProjektDialog onClose={() => setDialog(false)} navigate={navigate} /> : null}
    </div>
  );
}

export function ProjektDialog({
  projekt,
  onClose,
  navigate,
}: {
  projekt?: Projekt;
  onClose: () => void;
  navigate?: (r: Route) => void;
}) {
  const { addProjekt, updateProjekt } = useStore();
  const toast = useToast();
  const [form, setForm] = useState({
    nummer: projekt?.nummer ?? '',
    name: projekt?.name ?? '',
    status: projekt?.status ?? ('aktiv' as ProjektStatus),
    beschreibung: projekt?.beschreibung ?? '',
  });

  const set = <K extends keyof typeof form>(key: K, wert: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: wert }));

  const speichern = () => {
    if (!form.name.trim()) {
      toast('Bitte einen Projektnamen angeben.');
      return;
    }
    const werte = { ...form, name: form.name.trim(), nummer: form.nummer.trim() };
    if (projekt) {
      updateProjekt(projekt.id, werte);
      toast('Projekt aktualisiert.');
      onClose();
      return;
    }
    const id = addProjekt({ ...werte, markiert: true, logos: null });
    toast('Projekt angelegt.');
    onClose();
    navigate?.({ view: 'projekt', projektId: id, tab: 'beteiligte' });
  };

  return (
    <Modal
      titel={projekt ? 'Projekt bearbeiten' : 'Neues Projekt'}
      sub={projekt ? projekt.nummer : 'Grunddaten erfassen – Beteiligte und Protokolle folgen im Projekt'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Abbrechen
          </button>
          <button type="button" className="btn btn-primary" onClick={speichern}>
            {projekt ? 'Speichern' : 'Projekt anlegen'}
          </button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Projektnummer">
          <TextInput value={form.nummer} onChange={(v) => set('nummer', v)} placeholder="P-2026-001" />
        </Field>
        <Field label="Status">
          <Select value={form.status} onChange={(v) => set('status', v as ProjektStatus)} options={STATUS_OPTIONEN} />
        </Field>
        <Field label="Projektname" full>
          <TextInput value={form.name} onChange={(v) => set('name', v)} placeholder="z. B. EÜ … – Ersatzneubau" />
        </Field>
        <Field label="Beschreibung" full>
          <TextArea value={form.beschreibung} onChange={(v) => set('beschreibung', v)} rows={3} />
        </Field>
      </div>
      {projekt ? null : <VerknuepfungsHinweis bereich="projektsteuerung" nummer={form.nummer} />}
    </Modal>
  );
}
