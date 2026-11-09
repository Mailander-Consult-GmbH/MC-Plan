/**
 * „Neues Projekt“ – nur im Controlling (domain/rechte.ts, `projektVerwalten`):
 * Projektnummer, Status, Name, Bezeichnung im Nachweis, Leistungsbereich,
 * Raster, Beschreibung. Ändern lässt sich ein Projekt danach auf seiner Seite
 * unter „Einstellungen“ (pages/controlling/ProjektEinstellungen.tsx). Einen
 * Rhythmus gibt es nicht – den Umfang eines Nachweises legt das Abschließen
 * fest; das Raster gliedert auch die gemeinsamen Leistungstexte der
 * Mitarbeiter.
 * Die Projektnummer („K9101“) ist der Schlüssel, über den der Excel-Import
 * die Leistungen einem Projekt zuordnet; sie ist deshalb eindeutig.
 */
import { useId, useState } from 'react';
import { VerknuepfungsHinweis } from '../../../gemeinsam/ProjektBereiche';
import { useToast } from '../../../shared/toast';
import { Field, Modal, Segmented, Select, TextArea, TextInput } from '../../../shared/ui';
import { IMPORT_PROJEKT_VORGABEN, nummerNormal } from '../domain/import';
import { NUR_CONTROLLING } from '../domain/rechte';
import {
  LEISTUNGSBEREICH_VORSCHLAEGE,
  PROJEKT_STATUS_LABEL,
  type ProjektStatus,
  type Raster,
} from '../domain/types';
import type { Route } from '../lib/router';
import { useStore } from '../store/store';
import { RASTER_OPTIONEN } from './common';

const STATUS_OPTIONEN = (Object.keys(PROJEKT_STATUS_LABEL) as ProjektStatus[]).map((s) => ({
  value: s,
  label: PROJEKT_STATUS_LABEL[s],
}));

export function ProjektDialog({ onClose, navigate }: { onClose: () => void; navigate?: (r: Route) => void }) {
  const { data, addProjekt, controlling } = useStore();
  const toast = useToast();
  const liste = useId();
  const [form, setForm] = useState({
    nummer: '',
    name: '',
    kurzname: '',
    status: 'aktiv' as ProjektStatus,
    leistungsbereich: IMPORT_PROJEKT_VORGABEN.leistungsbereich,
    raster: IMPORT_PROJEKT_VORGABEN.raster,
    beschreibung: '',
  });

  const set = <K extends keyof typeof form>(key: K, wert: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: wert }));

  const speichern = () => {
    const name = form.name.trim();
    if (!name) {
      toast('Bitte einen Projektnamen angeben.');
      return;
    }
    const nummer = form.nummer.trim();
    if (nummer && data.projekte.some((p) => nummerNormal(p.nummer) === nummerNormal(nummer))) {
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
    if (!controlling) {
      toast(NUR_CONTROLLING);
      return;
    }
    const id = addProjekt({ ...werte, markiert: true, abschnitte: [], logos: null });
    if (!id) {
      toast(NUR_CONTROLLING);
      return;
    }
    toast('Projekt angelegt.');
    onClose();
    navigate?.({ view: 'controllingProjekt', projektId: id });
  };

  return (
    <Modal
      titel="Neues Projekt"
      sub="Grunddaten erfassen – Abschnitte und Logos folgen in den Einstellungen des Projekts"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Abbrechen
          </button>
          <button type="button" className="btn btn-primary" onClick={speichern}>
            Projekt anlegen
          </button>
        </>
      }
    >
      <div className="form-grid ln-zweispaltig">
        <Field label="Projektnummer" hint="Daran erkennt der Excel-Import das Projekt.">
          <TextInput value={form.nummer} onChange={(v) => set('nummer', v)} placeholder="K1234" autoFocus />
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
        <Field
          label="Nachweis"
          hint="Zeilen je Tag, Woche oder Monat – Vorgabe für neue Leistungsnachweise; gliedert auch die gemeinsamen Leistungstexte der Mitarbeiter."
        >
          <Segmented<Raster> value={form.raster} onChange={(v) => set('raster', v)} options={RASTER_OPTIONEN} />
        </Field>
        <Field label="Beschreibung" full>
          <TextArea value={form.beschreibung} onChange={(v) => set('beschreibung', v)} rows={3} />
        </Field>
      </div>
      <VerknuepfungsHinweis bereich="leistungsnachweise" nummer={form.nummer} />
    </Modal>
  );
}
