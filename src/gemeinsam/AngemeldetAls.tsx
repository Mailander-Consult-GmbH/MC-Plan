/**
 * „Angemeldet als“ – unten in der Seitenleiste jedes Bereichs: Name und
 * Kürzel der angemeldeten Person, ein Klick öffnet den Dialog mit Name und
 * Farbmodus. Was hier eingetragen wird, gilt in allen Bereichen (benutzer.ts).
 *
 * Ein Bereich kann einen Hinweis zum Namen mitgeben (was er damit tut) und
 * eine eigene Einstellung als Haken (`zusatz`, etwa die E-Mail-Nachfrage des
 * Planlaufmanagements); die speichert er selbst.
 */
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Field, Modal, TextInput, beiEnter } from '../shared/ui';
import { benutzerAendern, initialen, useBenutzer } from './benutzer';
import './gemeinsam.css';

/** Eigene Einstellung eines Bereichs im Dialog – ein Haken. */
export interface AnmeldungZusatz {
  label: string;
  text: string;
  wert: boolean;
  uebernehmen: (wert: boolean) => void;
}

/** Hinweis am Fuß des Dialogs (wörtlich). */
export const ANMELDUNG_HINWEIS =
  'Gilt in allen Bereichen von KaPlan. Bis zur Anmeldung über SSO ist dies eine Angabe ohne Kennwort; die Daten liegen lokal in diesem Browser.';

export function AngemeldetAls({ hinweis, zusatz }: { hinweis?: string; zusatz?: AnmeldungZusatz }) {
  const benutzer = useBenutzer();
  const [offen, setOffen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="bearbeiter gem-angemeldet"
        onClick={() => setOffen(true)}
        title="Name und Farbmodus – gelten in allen Bereichen"
      >
        <span className="avatar" style={{ width: 26, height: 26 }}>
          {initialen(benutzer.name)}
        </span>
        <span className="gem-angemeldet-text">
          <span className="gem-angemeldet-label">Angemeldet als</span>
          <strong className="truncate">{benutzer.name}</strong>
        </span>
      </button>
      {/* Über ein Portal auf Seitenebene – in der Seitenleiste bliebe der Dialog in deren Rahmen gefangen */}
      {offen
        ? createPortal(<BenutzerDialog hinweis={hinweis} zusatz={zusatz} onClose={() => setOffen(false)} />, document.body)
        : null}
    </>
  );
}

/** Dialog „Angemeldet als“: Name und Farbmodus für alle Bereiche, dazu die Einstellung des Bereichs. */
export function BenutzerDialog({
  hinweis,
  zusatz,
  onClose,
}: {
  hinweis?: string;
  zusatz?: AnmeldungZusatz;
  onClose: () => void;
}) {
  const benutzer = useBenutzer();
  const [name, setName] = useState(benutzer.name);
  const [kontrast, setKontrast] = useState(benutzer.farbmodus === 'kontrast');
  const [zusatzWert, setZusatzWert] = useState(zusatz?.wert ?? false);

  const uebernehmen = () => {
    benutzerAendern({ name, farbmodus: kontrast ? 'kontrast' : 'standard' });
    if (zusatz && zusatzWert !== zusatz.wert) zusatz.uebernehmen(zusatzWert);
    onClose();
  };

  return (
    <Modal
      titel="Angemeldet als"
      sub="Name und persönliche Einstellungen – für alle Bereiche"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Abbrechen
          </button>
          <button type="button" className="btn btn-primary" onClick={uebernehmen}>
            Übernehmen
          </button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Name" full hint={hinweis}>
          <TextInput
            value={name}
            onChange={setName}
            placeholder="Vor- und Nachname"
            autoFocus
            // beiEnter: sonst löste dieselbe Taste den Knopf „Angemeldet als“ gleich wieder aus
            onKeyDown={beiEnter(uebernehmen)}
          />
        </Field>
        {zusatz ? (
          <Field label={zusatz.label} full>
            <label className="checkbox">
              <input type="checkbox" checked={zusatzWert} onChange={(e) => setZusatzWert(e.target.checked)} />
              {zusatz.text}
            </label>
          </Field>
        ) : null}
        <Field
          label="Darstellung"
          full
          hint="Farben für eine Rot-Grün-Sehschwäche: Blaugrün, Bernstein und Magenta statt Grün, Orange und Rot – zusätzlich mit stärkeren Kontrasten."
        >
          <label className="checkbox">
            <input type="checkbox" checked={kontrast} onChange={(e) => setKontrast(e.target.checked)} />
            Farbmodus für Rot-Grün-Sehschwäche (hoher Kontrast)
          </label>
        </Field>
      </div>
      <p className="small tertiary" style={{ marginTop: 12 }}>
        {ANMELDUNG_HINWEIS}
      </p>
    </Modal>
  );
}
