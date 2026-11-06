/**
 * Projektliste mit Anlage- und Bearbeitungsdialog. Die Projektnummer
 * („K9101“) ist der Schlüssel, über den der Excel-Import die Leistungen einem
 * Projekt zuordnet; sie ist deshalb eindeutig. Projekte anlegen und ändern
 * darf jede angemeldete Person – ohne Anmeldung führt „Neues Projekt“ zuerst
 * in die Anmeldung.
 *
 * Die Kacheln nennen nur Projektnummer, Projektname, Beschreibung und die
 * anderen Bereiche des Projekts. Darunter die im Bereich archivierten Projekte
 * und – grau hinterlegt – Projekte aus anderen Bereichen zum Übernehmen
 * (Projektregister, src/gemeinsam/).
 */
import { useId, useState } from 'react';
import {
  ArchivAbschnitt,
  BereichsMarken,
  FremdeProjekte,
  VerknuepfungsHinweis,
  useArchivierte,
} from '../../../gemeinsam/ProjektBereiche';
import { Icon } from '../../../shared/icons';
import { useToast } from '../../../shared/toast';
import { Badge, Card, EmptyState, Field, Modal, Search, Segmented, Select, TextArea, TextInput } from '../../../shared/ui';
import { useMitAnmeldung } from '../components/AnmeldeDialog';
import { RASTER_OPTIONEN, REGEL_OPTIONEN, STATUS_TON } from '../components/common';
import { IMPORT_PROJEKT_VORGABEN, nummerNormal } from '../domain/import';
import { NICHT_ANGEMELDET, angemeldet } from '../domain/rechte';
import {
  LEISTUNGSBEREICH_VORSCHLAEGE,
  PROJEKT_STATUS_LABEL,
  type Projekt,
  type ProjektStatus,
  type Raster,
  type Zeitraumregel,
} from '../domain/types';
import type { Route } from '../lib/router';
import { useStore } from '../store/store';

const STATUS_OPTIONEN = (Object.keys(PROJEKT_STATUS_LABEL) as ProjektStatus[]).map((s) => ({
  value: s,
  label: PROJEKT_STATUS_LABEL[s],
}));

export function Projekte({ navigate }: { navigate: (r: Route) => void }) {
  const { data, toggleMarkiert } = useStore();
  const mitAnmeldung = useMitAnmeldung();
  const [suche, setSuche] = useState('');
  const [dialog, setDialog] = useState(false);
  const neu = () => mitAnmeldung(() => setDialog(true));

  const projekte = data.projekte.filter((p) =>
    [p.name, p.nummer, p.kurzname, p.leistungsbereich, p.beschreibung]
      .join(' ')
      .toLowerCase()
      .includes(suche.toLowerCase()),
  );
  const archiviert = useArchivierte('leistungsnachweise');
  const aktive = projekte.filter((p) => !archiviert.has(p.id));
  const archivierte = projekte.filter((p) => archiviert.has(p.id));

  const karte = (p: Projekt) => (
    <button
      key={p.id}
      type="button"
      className="card card-click ln-projektkarte gem-kachel"
      onClick={() => navigate({ view: 'projekt', projektId: p.id, tab: 'nachweise' })}
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
        <BereichsMarken bereich="leistungsnachweise" lokaleId={p.id} />
      </div>
    </button>
  );

  return (
    <div className="stack">
      <div className="row-between wrap">
        <div className="row wrap">
          <Search value={suche} onChange={setSuche} placeholder="Projekt, Nummer …" />
          <span className="small tertiary">
            Alle sehen alle Projekte. Mit ★ markierte Projekte erscheinen in der Übersicht und in der Seitenleiste.
          </span>
        </div>
        <button type="button" className="btn btn-primary" onClick={neu}>
          <Icon name="plus" size={14} /> Neues Projekt
        </button>
      </div>

      {aktive.length === 0 ? (
        <Card>
          <EmptyState
            icon="projekt"
            titel="Kein Projekt gefunden"
            text="Legen Sie ein Projekt an, übernehmen Sie eines aus einem anderen Bereich oder übernehmen Sie Leistungen per Excel-Import – unbekannte Projekte legt der Import an."
            action={
              <button type="button" className="btn btn-primary" onClick={neu}>
                <Icon name="plus" size={14} /> Neues Projekt
              </button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-2">{aktive.map(karte)}</div>
      )}

      <ArchivAbschnitt anzahl={archivierte.length}>{archivierte.map(karte)}</ArchivAbschnitt>
      <FremdeProjekte bereich="leistungsnachweise" suche={suche} />

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
  const { data, addProjekt, updateProjekt } = useStore();
  const toast = useToast();
  const liste = useId();
  const [form, setForm] = useState({
    nummer: projekt?.nummer ?? '',
    name: projekt?.name ?? '',
    kurzname: projekt?.kurzname ?? '',
    status: projekt?.status ?? ('aktiv' as ProjektStatus),
    leistungsbereich: projekt?.leistungsbereich ?? IMPORT_PROJEKT_VORGABEN.leistungsbereich,
    raster: projekt?.raster ?? IMPORT_PROJEKT_VORGABEN.raster,
    zeitraumregel: projekt?.zeitraumregel ?? IMPORT_PROJEKT_VORGABEN.zeitraumregel,
    beschreibung: projekt?.beschreibung ?? '',
  });

  const set = <K extends keyof typeof form>(key: K, wert: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: wert }));

  const speichern = () => {
    const name = form.name.trim();
    if (!name) {
      toast('Bitte einen Projektnamen angeben.');
      return;
    }
    const nummer = form.nummer.trim();
    if (nummer && data.projekte.some((p) => p.id !== projekt?.id && nummerNormal(p.nummer) === nummerNormal(nummer))) {
      toast(`Die Projektnummer „${nummer}“ ist bereits vergeben.`);
      return;
    }
    const werte = {
      ...form,
      nummer,
      name,
      kurzname: form.kurzname.trim(),
      leistungsbereich: form.leistungsbereich.trim(),
    };
    if (!angemeldet(data)) {
      toast(NICHT_ANGEMELDET);
      return;
    }
    if (projekt) {
      updateProjekt(projekt.id, werte);
      toast('Projekt aktualisiert.');
      onClose();
      return;
    }
    const id = addProjekt({ ...werte, markiert: true, abschnitte: [], logos: null });
    if (!id) {
      toast(NICHT_ANGEMELDET);
      return;
    }
    toast('Projekt angelegt.');
    onClose();
    navigate?.({ view: 'projekt', projektId: id, tab: 'nachweise' });
  };

  return (
    <Modal
      titel={projekt ? 'Projekt bearbeiten' : 'Neues Projekt'}
      sub={projekt ? projekt.nummer : 'Grunddaten erfassen – Leistungen und Leistungsnachweise folgen im Projekt'}
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
      <div className="form-grid ln-zweispaltig">
        <Field label="Projektnummer" hint="Daran erkennt der Excel-Import das Projekt.">
          <TextInput value={form.nummer} onChange={(v) => set('nummer', v)} placeholder="K1234" autoFocus={!projekt} />
        </Field>
        <Field label="Status">
          <Select value={form.status} onChange={(v) => set('status', v as ProjektStatus)} options={STATUS_OPTIONEN} />
        </Field>
        <Field label="Projektname" full>
          <TextInput value={form.name} onChange={(v) => set('name', v)} placeholder="z. B. PS / PLM, Neubau Hp Musterstadt" />
        </Field>
        <Field label="Bezeichnung im Nachweis" hint="Optional – steht im Kopf des Leistungsnachweises; leer = Projektname.">
          <TextInput
            value={form.kurzname}
            onChange={(v) => set('kurzname', v)}
            placeholder={form.name.trim() || 'z. B. Hp Musterstadt'}
          />
        </Field>
        <Field label="Leistungsbereich" hint="Steht im Kopf des Leistungsnachweises.">
          <TextInput
            value={form.leistungsbereich}
            onChange={(v) => set('leistungsbereich', v)}
            list={liste}
            placeholder="z. B. Projektsteuerung"
          />
          <datalist id={liste}>
            {LEISTUNGSBEREICH_VORSCHLAEGE.map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>
        </Field>
        <Field label="Nachweis" hint="Zeilen je Tag, Woche oder Monat – Vorgabe für neue Leistungsnachweise.">
          <Segmented<Raster> value={form.raster} onChange={(v) => set('raster', v)} options={RASTER_OPTIONEN} />
        </Field>
        <Field
          label="Neue Nachweise"
          hint="Für Leistungen außerhalb der vorhandenen Nachweise: je Kalendermonat ein eigener, oder der offene Nachweis wächst mit, bis er abgeschlossen wird."
        >
          <Select
            value={form.zeitraumregel}
            onChange={(v) => set('zeitraumregel', v as Zeitraumregel)}
            options={REGEL_OPTIONEN}
          />
        </Field>
        <Field label="Beschreibung" full>
          <TextArea value={form.beschreibung} onChange={(v) => set('beschreibung', v)} rows={3} />
        </Field>
      </div>
      {projekt ? null : <VerknuepfungsHinweis bereich="leistungsnachweise" nummer={form.nummer} />}
    </Modal>
  );
}
