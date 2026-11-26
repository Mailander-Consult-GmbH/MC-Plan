/**
 * Dialog einer Funktion – derselbe für die projektübergreifenden Funktionen
 * (pages/Funktionen.tsx) und die eines Projekts
 * (pages/projekt/RollenFunktionen.tsx): Bezeichnung, Kürzel, Farbe, Art,
 * Gewerk, Seite für den Verzug, Beschreibung. Geprüft und gespeichert wird in
 * der jeweiligen Ansicht (`onSpeichern`).
 *
 * Vorbelegung einer **neuen** Funktion (`useFunktionsFormular`):
 *
 * * Art – die des gewählten Reiters; unter „Alle“ folgt sie Bezeichnung und
 *   Gewerk (Funktionskatalog, sonst „Sonstige“), bis sie von Hand gewählt wird.
 *   Eine gewählte Art setzt eine andere Bezeichnung nicht stillschweigend um.
 * * Farbe und Seite für den Verzug – folgen der Art (`artInfo`, `seiteAusArt`),
 *   bis sie von Hand gewählt werden.
 *
 * Eine **vorhandene** Funktion behält, was sie hat: Dort ändert sich nur, was
 * im Dialog geändert wird.
 *
 * Ein neues Gewerk entsteht über den Knopf „Gewerk“ am Feld „Gewerk“
 * (`GewerkDialog`) und ist danach gleich gewählt – eigene Reiter haben die
 * Gewerke nicht mehr.
 */
import { useState } from 'react';
import { ArtFeld } from '../../../gemeinsam/FunktionsArten';
import { ART_SONSTIGE, artInfo, artVon } from '../../../gemeinsam/funktionskatalog';
import { Icon } from '../../../shared/icons';
import { Field, Modal, Select, TextArea, TextInput } from '../../../shared/ui';
import { UEBERGREIFEND, seiteAusArt, type Seite } from '../domain/types';
import { GewerkDialog } from './GewerkDialog';
import { SeiteFeld } from './SeiteAuswahl';
import './funktionen.css';

/** Die Angaben einer Funktion, wie der Dialog sie führt (projektübergreifend wie im Projekt). */
export interface FunktionsWerte {
  name: string;
  kuerzel: string;
  farbe: string;
  beschreibung: string;
  /** Art der Funktion (Kennung aus `FUNKTIONS_ARTEN`). */
  art: string;
  /** null = übergreifend. */
  gewerk: string | null;
  seite: Seite | null;
}

/** Was der Anwender selbst gewählt hat – das folgt Bezeichnung, Gewerk und Art nicht mehr. */
interface VonHand {
  art: boolean;
  farbe: boolean;
  seite: boolean;
}

/** Zieht nach, was noch vorbelegt ist: die Art aus Bezeichnung und Gewerk, Farbe und Seite aus der Art. */
function nachziehen(f: FunktionsWerte, hand: VonHand): FunktionsWerte {
  const art = hand.art ? f.art : artVon(f.name.trim(), f.gewerk);
  return {
    ...f,
    art,
    farbe: hand.farbe ? f.farbe : artInfo(art).farbe,
    seite: hand.seite ? f.seite : seiteAusArt(art, f.name),
  };
}

/**
 * Zustand des Dialogs. `funktion`: die Funktion, die bearbeitet wird (sonst
 * eine neue); `vorgabe` für eine neue: die Art des gewählten Reiters
 * (`undefined` unter „Alle“) und das im Filter gewählte Gewerk.
 */
export function useFunktionsFormular(
  funktion: FunktionsWerte | undefined,
  vorgabe: { art?: string; gewerk: string | null },
) {
  const [vonHand, setVonHand] = useState<VonHand>(() => ({
    art: Boolean(funktion) || vorgabe.art !== undefined,
    farbe: Boolean(funktion),
    seite: Boolean(funktion),
  }));
  const [form, setForm] = useState<FunktionsWerte>(() =>
    funktion
      ? {
          name: funktion.name,
          kuerzel: funktion.kuerzel,
          farbe: funktion.farbe,
          beschreibung: funktion.beschreibung,
          // Eine unbekannte Art gilt als „Sonstige“ – so zeigt sie auch die Auswahl
          art: artInfo(funktion.art).id,
          gewerk: funktion.gewerk,
          seite: funktion.seite,
        }
      : nachziehen(
          {
            name: '',
            kuerzel: '',
            farbe: '',
            beschreibung: '',
            art: vorgabe.art ?? ART_SONSTIGE,
            gewerk: vorgabe.gewerk,
            seite: null,
          },
          vonHand,
        ),
  );

  /** Ändert Felder; `hand` nennt, was damit als von Hand gewählt gilt. */
  const setzen = (patch: Partial<FunktionsWerte>, hand: Partial<VonHand> = {}) => {
    const jetzt = { ...vonHand, ...hand };
    setVonHand(jetzt);
    setForm((f) => nachziehen({ ...f, ...patch }, jetzt));
  };

  return { form, vonHand, setzen };
}

export type FunktionsFormular = ReturnType<typeof useFunktionsFormular>;

/** Der Dialog „Neue Funktion“ bzw. „Funktion bearbeiten“ samt „Neues Gewerk“. */
export function FunktionsMaske({
  neu,
  sub,
  formular,
  gewerke,
  onClose,
  onSpeichern,
}: {
  /** Neue Funktion (sonst wird eine vorhandene bearbeitet). */
  neu: boolean;
  /** Unterzeile: wo die Funktion gilt. */
  sub: string;
  formular: FunktionsFormular;
  /** Gewerke zur Auswahl. */
  gewerke: readonly string[];
  onClose: () => void;
  onSpeichern: () => void;
}) {
  const { form, vonHand, setzen } = formular;
  const [gewerkDialog, setGewerkDialog] = useState(false);
  // Das gewählte Gewerk steht stets zur Wahl – auch eines, das die Liste (noch) nicht führt
  const auswahl = form.gewerk && !gewerke.includes(form.gewerk) ? [...gewerke, form.gewerk] : gewerke;

  return (
    <>
      <Modal
        titel={neu ? 'Neue Funktion' : 'Funktion bearbeiten'}
        sub={sub}
        onClose={onClose}
        footer={
          <>
            <button type="button" className="btn" onClick={onClose}>
              Abbrechen
            </button>
            <button type="button" className="btn btn-primary" onClick={onSpeichern}>
              Speichern
            </button>
          </>
        }
      >
        <div className="form-grid">
          <Field label="Bezeichnung" full>
            <TextInput value={form.name} onChange={(name) => setzen({ name })} placeholder="z.B. Erdungsprüfer" />
          </Field>
          <Field label="Kürzel" hint="leer = aus der Bezeichnung gebildet">
            <TextInput value={form.kuerzel} onChange={(kuerzel) => setzen({ kuerzel })} />
          </Field>
          <Field label="Farbe" hint={vonHand.farbe ? undefined : 'Vorbelegt aus der Art.'}>
            <input
              type="color"
              value={form.farbe}
              onChange={(e) => setzen({ farbe: e.target.value }, { farbe: true })}
              style={{ width: 52, height: 32, border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}
            />
          </Field>
          <Field
            label="Art"
            full
            hint={`Erste Ebene der Gliederung: Unter dieser Art steht die Funktion in den Listen.${
              vonHand.art ? '' : ' Vorbelegt aus Bezeichnung und Gewerk.'
            }`}
          >
            <ArtFeld value={form.art} onChange={(art) => setzen({ art }, { art: true })} />
          </Field>
          <Field
            label="Gewerk"
            full
            hint="Übergreifend bedeutet: eine Besetzung für alle Gewerke. Sonst gehört die Funktion genau zu diesem Gewerk."
          >
            <div className="pl-gewerkfeld">
              <Select
                value={form.gewerk ?? UEBERGREIFEND}
                onChange={(v) => setzen({ gewerk: v === UEBERGREIFEND ? null : v })}
                options={[UEBERGREIFEND, ...auswahl].map((g) => ({ value: g, label: g }))}
              />
              <button
                type="button"
                className="btn btn-sm btn-outline"
                title="Neues Gewerk anlegen"
                onClick={() => setGewerkDialog(true)}
              >
                <Icon name="plus" size={13} /> Gewerk
              </button>
            </div>
          </Field>
          <SeiteFeld
            value={form.seite}
            vorbelegt={!vonHand.seite}
            onChange={(seite) => setzen({ seite }, { seite: true })}
          />
          <Field label="Beschreibung" full>
            <TextArea value={form.beschreibung} onChange={(beschreibung) => setzen({ beschreibung })} rows={2} />
          </Field>
        </div>
      </Modal>

      {/* Neben dem Dialog, nicht in ihm: Der Dialog darüber ist fest positioniert */}
      {gewerkDialog ? (
        <GewerkDialog onClose={() => setGewerkDialog(false)} onAngelegt={(gewerk) => setzen({ gewerk })} />
      ) : null}
    </>
  );
}
