/**
 * Anlage und Pflege einer projektübergreifenden Funktion – aus der Seite
 * „Funktionen“ und direkt beim Hinzufügen einer Person zur
 * Projektbeteiligtenliste.
 */
import { useState } from 'react';
import { useToast } from '../../../shared/toast';
import { Field, Modal, TextArea, TextInput } from '../../../shared/ui';
import { kuerzelAus, type Funktion, type ID } from '../domain/types';
import { useStore } from '../store/store';

const FARBEN = ['#24456e', '#5856d6', '#ff9500', '#34c759', '#ff3b30', '#af52de', '#00a0a0', '#c77700'];

export function FunktionDialog({
  funktion,
  vorschlag = '',
  onClose,
  onAngelegt,
}: {
  funktion?: Funktion;
  /** Vorbelegte Bezeichnung einer neuen Funktion. */
  vorschlag?: string;
  onClose: () => void;
  /** Meldet die Kennung einer neu angelegten Funktion. */
  onAngelegt?: (id: ID) => void;
}) {
  const { data, addFunktion, updateFunktion } = useStore();
  const toast = useToast();
  const [form, setForm] = useState({
    name: funktion?.name ?? vorschlag,
    kuerzel: funktion?.kuerzel ?? '',
    farbe: funktion?.farbe ?? FARBEN[data.funktionen.length % FARBEN.length],
    beschreibung: funktion?.beschreibung ?? '',
  });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const speichern = () => {
    const name = form.name.trim();
    if (!name) {
      toast('Bitte eine Bezeichnung angeben.');
      return;
    }
    const doppelt = data.funktionen.find((f) => f.id !== funktion?.id && f.name.toLowerCase() === name.toLowerCase());
    if (doppelt) {
      toast(`Die Funktion „${doppelt.name}“ gibt es bereits.`);
      return;
    }
    const werte = { ...form, name, kuerzel: form.kuerzel.trim() || kuerzelAus(name) };
    if (funktion) {
      updateFunktion(funktion.id, werte);
      toast('Funktion gespeichert.');
    } else {
      const id = addFunktion(werte);
      toast(`Funktion „${name}“ angelegt.`);
      onAngelegt?.(id);
    }
    onClose();
  };

  return (
    <Modal
      titel={funktion ? 'Funktion bearbeiten' : 'Neue Funktion'}
      sub="Gilt projektübergreifend"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Abbrechen
          </button>
          <button type="button" className="btn btn-primary" onClick={speichern}>
            Speichern
          </button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Bezeichnung" full>
          <TextInput value={form.name} onChange={(v) => set('name', v)} placeholder="z. B. Bauüberwachung" autoFocus />
        </Field>
        <Field label="Kürzel" hint="leer = aus der Bezeichnung gebildet">
          <TextInput value={form.kuerzel} onChange={(v) => set('kuerzel', v)} />
        </Field>
        <Field label="Farbe">
          <input
            type="color"
            value={form.farbe}
            onChange={(e) => set('farbe', e.target.value)}
            style={{ width: 52, height: 32, border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}
          />
        </Field>
        <Field label="Beschreibung" full>
          <TextArea value={form.beschreibung} onChange={(v) => set('beschreibung', v)} rows={2} />
        </Field>
      </div>
    </Modal>
  );
}
