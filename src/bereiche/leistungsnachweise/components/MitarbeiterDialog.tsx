/**
 * Anlage und Pflege eines Mitarbeiters – im Reiter „Mitarbeiter“ des
 * Controllings (domain/rechte.ts: `mitarbeiterVerwalten`). Das Kürzel ist
 * eindeutig: Daran und am Namen erkennt der Excel-Import die Person
 * („MM: Mustermann, Max“). Bleibt es leer, entsteht es aus dem Namen (bei
 * Bedarf mit angehängter Zahl, etwa „MM2“).
 *
 * Wer die angemeldete Person umbenennt (Name unter „Angemeldet als“), ändert
 * „Angemeldet als“ mit (`benutzerAendern`) – sonst gehörte der Name dort
 * niemandem mehr. Das geschieht erst nach dem Speichern des Bestands, damit
 * ein anderes Fenster zuerst die umbenannte Person sieht.
 */
import { useState } from 'react';
import { benutzerAendern } from '../../../gemeinsam/benutzer';
import { useToast } from '../../../shared/toast';
import { Field, Modal, TextInput } from '../../../shared/ui';
import { kuerzelFrei, kuerzelNormal } from '../domain/import';
import { kuerzelAus, mitarbeiterName, type ID, type Mitarbeiter } from '../domain/types';
import { useStore } from '../store/store';

export function MitarbeiterDialog({
  mitarbeiter,
  onClose,
  onAngelegt,
}: {
  mitarbeiter?: Mitarbeiter;
  onClose: () => void;
  /** Meldet die Kennung eines neu angelegten Mitarbeiters. */
  onAngelegt?: (id: ID) => void;
}) {
  const { data, addMitarbeiter, updateMitarbeiter } = useStore();
  const toast = useToast();
  const [form, setForm] = useState({
    kuerzel: mitarbeiter?.kuerzel ?? '',
    vorname: mitarbeiter?.vorname ?? '',
    nachname: mitarbeiter?.nachname ?? '',
    aktiv: mitarbeiter?.aktiv ?? true,
  });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const vorschlag = kuerzelAus(`${form.vorname} ${form.nachname}`);

  const speichern = () => {
    const vorname = form.vorname.trim();
    const nachname = form.nachname.trim();
    if (!nachname) {
      toast('Bitte einen Nachnamen angeben.');
      return;
    }
    const andere = data.mitarbeiter.filter((m) => m.id !== mitarbeiter?.id);
    const eingegeben = form.kuerzel.trim();
    if (eingegeben && andere.some((m) => kuerzelNormal(m.kuerzel) === kuerzelNormal(eingegeben))) {
      toast(`Das Kürzel „${eingegeben}“ ist bereits vergeben.`);
      return;
    }
    const kuerzel = eingegeben || kuerzelFrei(kuerzelAus(`${vorname} ${nachname}`), andere);
    const werte = { kuerzel, vorname, nachname, aktiv: form.aktiv };
    if (mitarbeiter) {
      const meldung = updateMitarbeiter(mitarbeiter.id, werte);
      if (meldung) {
        toast(meldung);
        return;
      }
      const neuerName = mitarbeiterName(werte);
      if (mitarbeiter.id === data.einstellungen.mitarbeiterId && neuerName !== mitarbeiterName(mitarbeiter)) {
        // Nach dem Speichern des Bestands (Effekt des Stores): erst die Person, dann der neue Name
        window.setTimeout(() => benutzerAendern({ name: neuerName }), 0);
        toast(`Mitarbeiter gespeichert – „Angemeldet als“ lautet jetzt „${neuerName}“.`);
      } else toast('Mitarbeiter gespeichert.');
    } else {
      const id = addMitarbeiter(werte);
      if (!id) {
        toast('Mitarbeiter anlegen ist dem Controlling vorbehalten.');
        return;
      }
      toast(`„${mitarbeiterName(werte)}“ angelegt.`);
      onAngelegt?.(id);
    }
    onClose();
  };

  return (
    <Modal
      titel={mitarbeiter ? 'Mitarbeiter bearbeiten' : 'Neuer Mitarbeiter'}
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
      <div className="form-grid ln-zweispaltig">
        <Field label="Vorname">
          <TextInput value={form.vorname} onChange={(v) => set('vorname', v)} placeholder="z. B. Max" autoFocus />
        </Field>
        <Field label="Nachname">
          <TextInput value={form.nachname} onChange={(v) => set('nachname', v)} placeholder="z. B. Mustermann" />
        </Field>
        <Field
          label="Kürzel"
          hint="Wie in der Zeiterfassung („MM: Mustermann, Max“) – daran und am Namen erkennt der Excel-Import die Person. Leer = aus dem Namen gebildet."
        >
          <TextInput
            value={form.kuerzel}
            onChange={(v) => set('kuerzel', v)}
            placeholder={vorschlag || 'MM'}
            maxLength={8}
          />
        </Field>
        <Field label="Status" hint="Ausgeschiedene behalten ihre Leistungen, erfassen unter „Angemeldet als“ aber keine neuen.">
          <label className="checkbox" style={{ paddingTop: 7 }}>
            <input type="checkbox" checked={form.aktiv} onChange={(e) => set('aktiv', e.target.checked)} />
            aktiv
          </label>
        </Field>
      </div>
    </Modal>
  );
}
