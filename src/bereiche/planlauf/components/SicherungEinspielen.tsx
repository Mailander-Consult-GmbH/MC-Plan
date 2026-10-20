/**
 * Einspielen einer Sicherung – das Gegenstück zur Schaltfläche „Sicherung“.
 *
 * Die gewählte JSON-Datei wird gelesen und wie beim Laden auf die aktuelle
 * Fassung gehoben (sicherungLesen in store/storage.ts). Nach einer Rückfrage
 * ersetzt sie den gesamten Bestand in diesem Browser. „Angemeldet als“ bleibt
 * erhalten, sofern nicht ausdrücklich der Name aus der Sicherung gewählt wird.
 */
import { useRef, useState } from 'react';
import { STANDARD_BEARBEITER, type AppData } from '../domain/types';
import { exportiereDaten, sicherungLesen } from '../store/storage';
import { useStore } from '../store/store';
import { useToast } from '../../../shared/toast';
import { Callout, Modal } from '../../../shared/ui';
import { Icon } from '../../../shared/icons';

/** Gelesene Sicherung samt Dateiname. */
export interface Sicherung {
  datei: string;
  daten: AppData;
}

/**
 * Schaltfläche „Einspielen“ in der Seitenleiste: wählt die Datei und liest sie.
 * Die Rückfrage steht außerhalb der Seitenleiste (SicherungEinspielenDialog),
 * weil deren Hintergrundfilter fest positionierte Dialoge sonst einschließt.
 */
export function SicherungWaehlen({ onGelesen }: { onGelesen: (sicherung: Sicherung) => void }) {
  const toast = useToast();
  const eingabe = useRef<HTMLInputElement>(null);

  const lesen = async (datei: File) => {
    try {
      onGelesen({ datei: datei.name, daten: sicherungLesen(await datei.text()) });
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Die Sicherung konnte nicht gelesen werden.');
    }
  };

  return (
    <>
      <button
        type="button"
        className="btn btn-sm btn-outline"
        onClick={() => eingabe.current?.click()}
        title="Sicherung (JSON) einspielen – ersetzt den Datenbestand"
      >
        <Icon name="importieren" size={12} /> Einspielen
      </button>
      <input
        ref={eingabe}
        type="file"
        accept=".json,application/json"
        style={{ display: 'none' }}
        onChange={(e) => {
          const datei = e.target.files?.[0];
          // Dieselbe Datei soll sich erneut wählen lassen
          e.target.value = '';
          if (datei) void lesen(datei);
        }}
      />
    </>
  );
}

/** Rückfrage vor dem Einspielen – nennt den Inhalt der Sicherung und bietet an, vorher zu sichern. */
export function SicherungEinspielenDialog({
  sicherung,
  onClose,
  onEingespielt,
}: {
  sicherung: Sicherung;
  onClose: () => void;
  onEingespielt: () => void;
}) {
  const { data, ersetzeDaten } = useStore();
  const toast = useToast();
  // Ohne eingerichteten Namen liegt es nahe, den aus der Sicherung zu nehmen
  const [nameUebernehmen, setNameUebernehmen] = useState(data.bearbeiter.name === STANDARD_BEARBEITER);

  const einspielen = () => {
    const { daten } = sicherung;
    ersetzeDaten(nameUebernehmen ? daten : { ...daten, bearbeiter: data.bearbeiter });
    toast(`Sicherung eingespielt – ${daten.projects.length} Projekt(e), ${daten.runs.length} Planläufe.`);
    onClose();
    onEingespielt();
  };

  const anzahl = (n: number, eins: string, mehr: string) => `${n} ${n === 1 ? eins : mehr}`;
  const fremderName = sicherung.daten.bearbeiter.name !== data.bearbeiter.name;

  return (
    <Modal
      titel="Sicherung einspielen?"
      sub={sicherung.datei}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => exportiereDaten(data)}
            title="Den jetzigen Bestand vorher als JSON sichern"
          >
            <Icon name="export" size={14} /> Aktuellen Stand sichern
          </button>
          <span className="spacer" />
          <button type="button" className="btn" onClick={onClose}>
            Abbrechen
          </button>
          <button
            type="button"
            className="btn btn-primary"
            style={{ background: 'var(--red)' }}
            onClick={einspielen}
          >
            Einspielen
          </button>
        </>
      }
    >
      <div className="stack" style={{ gap: 14 }}>
        <p>
          Die Sicherung enthält {anzahl(sicherung.daten.projects.length, 'Projekt', 'Projekte')},{' '}
          {anzahl(
            sicherung.daten.documents.filter((d) => d.kind !== 'paket').length,
            'Plan bzw. Planverzeichnis',
            'Pläne und Planverzeichnisse',
          )}{' '}
          und {anzahl(sicherung.daten.runs.length, 'Planlauf', 'Planläufe')}.
        </p>
        <Callout ton="warn" icon="!">
          Der gesamte jetzige Bestand in diesem Browser wird durch die Sicherung ersetzt. Das lässt sich nicht
          rückgängig machen – wer ihn noch braucht, sichert ihn vorher.
        </Callout>
        {fremderName ? (
          <label className="checkbox">
            <input
              type="checkbox"
              checked={nameUebernehmen}
              onChange={(e) => setNameUebernehmen(e.target.checked)}
            />
            „Angemeldet als“ aus der Sicherung übernehmen ({sicherung.daten.bearbeiter.name}) – sonst bleibt es bei{' '}
            {data.bearbeiter.name}
          </label>
        ) : null}
      </div>
    </Modal>
  );
}
