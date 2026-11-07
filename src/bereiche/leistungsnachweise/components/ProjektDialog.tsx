/**
 * Projekt anlegen bzw. bearbeiten – nur im Controlling (domain/rechte.ts,
 * `projektVerwalten`): Projektnummer, Status, Name, Bezeichnung im Nachweis,
 * Leistungsbereich, Raster und Zeitraumregel neuer Nachweise, Beschreibung.
 * Das Raster gliedert auch die gemeinsamen Leistungstexte der Mitarbeiter;
 * ein Wechsel nennt Texte, die danach nicht mehr gelten (`RasterwechselHinweis`).
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
  type Projekt,
  type ProjektStatus,
  type Raster,
  type Zeitraumregel,
} from '../domain/types';
import type { Route } from '../lib/router';
import { useStore } from '../store/store';
import { RASTER_OPTIONEN, REGEL_OPTIONEN } from './common';
import { RasterwechselHinweis } from './RasterwechselHinweis';

const STATUS_OPTIONEN = (Object.keys(PROJEKT_STATUS_LABEL) as ProjektStatus[]).map((s) => ({
  value: s,
  label: PROJEKT_STATUS_LABEL[s],
}));

export function ProjektDialog({
  projekt,
  onClose,
  navigate,
}: {
  projekt?: Projekt;
  onClose: () => void;
  navigate?: (r: Route) => void;
}) {
  const { data, addProjekt, updateProjekt, controlling } = useStore();
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
    if (!controlling) {
      toast(NUR_CONTROLLING);
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
      toast(NUR_CONTROLLING);
      return;
    }
    toast('Projekt angelegt.');
    onClose();
    navigate?.({ view: 'controllingProjekt', projektId: id });
  };

  return (
    <Modal
      titel={projekt ? 'Projekt bearbeiten' : 'Neues Projekt'}
      sub={projekt ? projekt.nummer : 'Grunddaten erfassen – Abschnitte und Logos folgen in den Einstellungen des Projekts'}
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
        <Field
          label="Nachweis"
          hint="Zeilen je Tag, Woche oder Monat – Vorgabe für neue Leistungsnachweise; gliedert auch die gemeinsamen Leistungstexte der Mitarbeiter."
        >
          <Segmented<Raster> value={form.raster} onChange={(v) => set('raster', v)} options={RASTER_OPTIONEN} />
        </Field>
        <Field
          label="Rhythmus"
          hint="Über welche Monate ein Leistungsnachweis geht: monatlich, alle 2 oder alle 3 Monate – gezählt ab Projektbeginn – oder bis er abgeschlossen wird (danach beginnt ein neuer)."
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
      {projekt ? <RasterwechselHinweis projekt={projekt} raster={form.raster} /> : null}
      {projekt ? null : <VerknuepfungsHinweis bereich="leistungsnachweise" nummer={form.nummer} />}
    </Modal>
  );
}
