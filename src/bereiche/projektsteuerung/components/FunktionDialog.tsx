/**
 * Anlage und Pflege einer projektübergreifenden Funktion – aus der Seite
 * „Funktionen“ und direkt beim Hinzufügen einer Person zur
 * Projektbeteiligtenliste. Jede Funktion gehört zu einer Art (erste Ebene der
 * Gliederung) und darunter zu einem Gewerk oder gilt übergreifend.
 *
 * Die Art einer neuen Funktion ist die des Aufrufers (der gewählte Reiter);
 * ohne Vorgabe folgt sie dem Funktionskatalog, solange niemand sie wählt –
 * eine gewählte Art setzt der Dialog nicht mehr um. Ebenso folgt die Farbe der
 * Art, bis jemand eine eigene wählt. Eine vorhandene Funktion behält Art und
 * Farbe, bis sie hier geändert werden.
 */
import { useState } from 'react';
import { ArtFeld } from '../../../gemeinsam/FunktionsArten';
import { artInfo, artVon, katalogEintrag } from '../../../gemeinsam/funktionskatalog';
import { Icon } from '../../../shared/icons';
import { useToast } from '../../../shared/toast';
import { Field, Modal, Select, TextArea, TextInput } from '../../../shared/ui';
import { UEBERGREIFEND, funktionsName, kuerzelAus, type Funktion, type ID } from '../domain/types';
import { useStore } from '../store/store';
import { GewerkDialog } from './GewerkDialog';

export function FunktionDialog({
  funktion,
  vorschlag = '',
  vorauswahl = null,
  art,
  onClose,
  onAngelegt,
  onGespeichert,
}: {
  funktion?: Funktion;
  /** Vorbelegte Bezeichnung einer neuen Funktion. */
  vorschlag?: string;
  /** Gewerk einer neuen Funktion; null = übergreifend. */
  vorauswahl?: string | null;
  /** Art einer neuen Funktion (der gewählte Reiter); ohne Angabe gilt die des Funktionskatalogs. */
  art?: string;
  onClose: () => void;
  /** Meldet die Kennung einer neu angelegten Funktion. */
  onAngelegt?: (id: ID) => void;
  /** Meldet die gespeicherten Werte – so kann die Liste der Funktion in ihre Art und ihr Gewerk folgen. */
  onGespeichert?: (werte: Omit<Funktion, 'id'>) => void;
}) {
  const { data, addFunktion, updateFunktion } = useStore();
  const toast = useToast();
  const [form, setForm] = useState({
    name: funktion?.name ?? vorschlag,
    kuerzel: funktion?.kuerzel ?? '',
    beschreibung: funktion?.beschreibung ?? '',
    gewerk: funktion ? funktion.gewerk : vorauswahl,
  });
  // Gewählte Art und Farbe; null = noch nicht gewählt, es gilt die Vorgabe (Katalog bzw. Farbe der Art)
  const [artWahl, setArtWahl] = useState<string | null>(funktion?.art ?? art ?? null);
  const [farbWahl, setFarbWahl] = useState<string | null>(funktion?.farbe ?? null);
  const [neuesGewerk, setNeuesGewerk] = useState(false);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const name = form.name.trim();
  const gewaehlteArt = artWahl ?? artVon(name, form.gewerk);
  const farbe = farbWahl ?? artInfo(gewaehlteArt).farbe;
  // Kürzel ohne Eingabe: das des Funktionskatalogs, sonst aus der Bezeichnung
  const kuerzelVorgabe = katalogEintrag(name, form.gewerk)?.kuerzel ?? kuerzelAus(name);

  const speichern = () => {
    if (!name) {
      toast('Bitte eine Bezeichnung angeben.');
      return;
    }
    const doppelt = data.funktionen.find(
      (f) =>
        f.id !== funktion?.id &&
        f.name.toLowerCase() === name.toLowerCase() &&
        (f.gewerk ?? '').toLowerCase() === (form.gewerk ?? '').toLowerCase(),
    );
    if (doppelt) {
      toast(`Die Funktion „${funktionsName(doppelt)}“ gibt es bereits.`);
      return;
    }
    const werte = { ...form, name, kuerzel: form.kuerzel.trim() || kuerzelVorgabe, farbe, art: gewaehlteArt };
    if (funktion) {
      updateFunktion(funktion.id, werte);
      toast('Funktion gespeichert.');
    } else {
      const id = addFunktion(werte);
      toast(`Funktion „${funktionsName(werte)}“ angelegt.`);
      onAngelegt?.(id);
    }
    onGespeichert?.(werte);
    onClose();
  };

  return (
    <>
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
          <Field
            label="Art"
            full
            hint={
              artWahl === null
                ? 'Erste Ebene der Gliederung – vorbelegt aus der Bezeichnung laut Funktionskatalog.'
                : 'Erste Ebene der Gliederung – unter dieser Art steht die Funktion in den Listen.'
            }
          >
            <ArtFeld value={gewaehlteArt} onChange={setArtWahl} />
          </Field>
          <Field
            label="Gewerk"
            full
            hint="Übergreifend bedeutet: ohne Gewerkbezug. Sonst gehört die Funktion genau zu diesem Gewerk – „Fachplaner“ in LST ist eine andere Funktion als in OLA."
          >
            <div className="row" style={{ gap: 8 }}>
              <Select
                value={form.gewerk ?? UEBERGREIFEND}
                onChange={(v) => set('gewerk', v === UEBERGREIFEND ? null : v)}
                options={[UEBERGREIFEND, ...data.gewerke].map((g) => ({ value: g, label: g }))}
              />
              <button type="button" className="btn btn-sm btn-outline" onClick={() => setNeuesGewerk(true)}>
                <Icon name="plus" size={13} /> Gewerk
              </button>
            </div>
          </Field>
          <Field label="Kürzel" hint={name ? `leer = ${kuerzelVorgabe}` : 'leer = aus der Bezeichnung gebildet'}>
            <TextInput value={form.kuerzel} onChange={(v) => set('kuerzel', v)} />
          </Field>
          <Field label="Farbe">
            <input
              type="color"
              value={farbe}
              onChange={(e) => setFarbWahl(e.target.value)}
              style={{ width: 52, height: 32, border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}
            />
          </Field>
          <Field label="Beschreibung" full>
            <TextArea value={form.beschreibung} onChange={(v) => set('beschreibung', v)} rows={2} />
          </Field>
        </div>
      </Modal>

      {neuesGewerk ? (
        <GewerkDialog onClose={() => setNeuesGewerk(false)} onAngelegt={(g) => set('gewerk', g)} />
      ) : null}
    </>
  );
}
