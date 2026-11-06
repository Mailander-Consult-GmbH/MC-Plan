/**
 * Sicherung des Bereichs: Bestand als JSON herunterladen und wieder
 * einspielen. Die Sicherung trägt das Kennzeichen des Bereichs; eine Sicherung
 * des Planlaufmanagements wird abgewiesen (sicherungLesen in store/storage.ts).
 */
import { benutzerAendern } from '../../../gemeinsam/benutzer';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '../../../shared/icons';
import { useToast } from '../../../shared/toast';
import { Callout, Modal } from '../../../shared/ui';
import type { BaubetriebDaten } from '../domain/types';
import { exportiereDaten, rohdatenHerunterladen, rohkopieVorEinspielen, sicherungLesen } from '../store/storage';
import { useStore } from '../store/store';

export interface Sicherung {
  datei: string;
  daten: BaubetriebDaten;
}

/** Schaltfläche „Einspielen“ in der Seitenleiste: wählt die Datei und liest sie. */
export function SicherungWaehlen({ onGelesen }: { onGelesen: (s: Sicherung) => void }) {
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
          e.target.value = '';
          if (datei) void lesen(datei);
        }}
      />
    </>
  );
}

const anzahl = (n: number, eins: string, mehr: string) => `${n} ${n === 1 ? eins : mehr}`;

/**
 * Rückfrage vor dem Einspielen – „Angemeldet als“ und Farbmodus bleiben
 * erhalten. Nach einem Lade- oder Fassungsfehler sichert „Gespeicherten Stand
 * herunterladen“ den gespeicherten Text unverändert (`rohdatenHerunterladen`);
 * bei einem Stand aus einer neueren Fassung ist „Einspielen“ gesperrt. Vor dem
 * Ersetzen eines unlesbaren Stands bleibt eine Rohkopie im Browser (`rohkopieVorEinspielen`). Passt sie
 * nicht in den Speicher, sagt der Dialog das und ersetzt erst auf „Ohne Kopie
 * einspielen“.
 */
export function SicherungEinspielenDialog({
  sicherung,
  onClose,
  onEingespielt,
}: {
  sicherung: Sicherung;
  onClose: () => void;
  onEingespielt: () => void;
}) {
  const { data, ersetzeDaten, ladeZustand } = useStore();
  const toast = useToast();
  const [mitEinstellungen, setMitEinstellungen] = useState(false);
  // Die Rohkopie passte nicht in den Speicher – eingespielt wird erst auf ausdrücklichen Wunsch
  const [ohneKopie, setOhneKopie] = useState(false);
  const herunterladenKnopf = useRef<HTMLButtonElement>(null);
  const { daten } = sicherung;
  // Ein gespeicherter Stand aus einer neueren Fassung darf nicht überschrieben werden;
  // nach einem Ladefehler zeigt der Bereich Demodaten statt des gespeicherten Stands.
  const neuereFassung = ladeZustand === 'neuere_fassung';
  const ohneBestand = ladeZustand !== 'ok';
  // Gilt nur, solange der gespeicherte Stand unlesbar bleibt (ein anderes Fenster kann ihn ersetzen)
  const kopieFehlt = ohneKopie && ohneBestand;

  // Nach dem Hinweis steht der Fokus auf dem Herunterladen, nicht mehr auf dem Ersetzen
  useEffect(() => {
    if (kopieFehlt) herunterladenKnopf.current?.focus();
  }, [kopieFehlt]);

  const einspielen = () => {
    if (neuereFassung) return;
    // Den unlesbaren Stand nicht ohne Kopie überschreiben – er ließe sich vielleicht noch retten.
    // Passt die Kopie nicht in den Speicher, erst darauf hinweisen
    if (ohneBestand && rohkopieVorEinspielen() === 'gescheitert' && !kopieFehlt) {
      setOhneKopie(true);
      return;
    }
    // „Angemeldet als“ gilt in allen Bereichen – aus der Sicherung nur auf ausdrücklichen Wunsch
    if (mitEinstellungen) benutzerAendern({ name: daten.einstellungen.bearbeiter, farbmodus: daten.einstellungen.farbmodus });
    ersetzeDaten({
      ...daten,
      einstellungen: mitEinstellungen
        ? daten.einstellungen
        : { ...daten.einstellungen, bearbeiter: data.einstellungen.bearbeiter, farbmodus: data.einstellungen.farbmodus },
    });
    toast(
      `Sicherung eingespielt – ${anzahl(daten.projekte.length, 'Projekt', 'Projekte')}, ${anzahl(
        daten.anmeldungen.length,
        'Anmeldung',
        'Anmeldungen',
      )}.`,
    );
    onClose();
    onEingespielt();
  };

  return (
    <Modal
      titel="Sicherung einspielen?"
      sub={sicherung.datei}
      onClose={onClose}
      footer={
        <>
          <button
            ref={herunterladenKnopf}
            type="button"
            className="btn btn-outline"
            onClick={() => {
              // Nach einem Lade- oder Fassungsfehler zeigt der Bereich nur Demodaten –
              // gesichert wird dann der gespeicherte Stand, unverändert
              if (!ohneBestand) exportiereDaten(data);
              else if (!rohdatenHerunterladen()) toast('Es ist kein gespeicherter Stand vorhanden, der sich herunterladen ließe.');
            }}
            title={ohneBestand ? 'Gespeicherten Stand unverändert herunterladen' : 'Den jetzigen Bestand vorher als JSON sichern'}
          >
            <Icon name="export" size={14} /> {ohneBestand ? 'Gespeicherten Stand herunterladen' : 'Aktuellen Stand sichern'}
          </button>
          <span className="spacer" />
          <button type="button" className="btn" onClick={onClose}>
            Abbrechen
          </button>
          <button
            type="button"
            className="btn btn-primary"
            style={{ background: 'var(--red)' }}
            disabled={neuereFassung}
            onClick={einspielen}
          >
            {kopieFehlt ? 'Ohne Kopie einspielen' : 'Einspielen'}
          </button>
        </>
      }
    >
      <div className="stack" style={{ gap: 14 }}>
        <p>
          Die Sicherung enthält {anzahl(daten.projekte.length, 'Projekt', 'Projekte')} und{' '}
          {anzahl(daten.anmeldungen.length, 'Anmeldung', 'Anmeldungen')}.
        </p>
        {neuereFassung ? (
          <Callout ton="error" icon="!">
            Gespeichert ist ein Stand aus einer neueren Fassung von KaPlan. Damit er nicht überschrieben wird, lässt sich
            hier nichts einspielen – bitte zuerst die Seite neu laden.
          </Callout>
        ) : kopieFehlt ? (
          <Callout key="ohne-kopie" ton="error" icon="!" role="alert">
            Für eine Kopie des gespeicherten Stands reicht der Speicher des Browsers nicht. Wer ihn noch braucht, lädt ihn
            jetzt mit „Gespeicherten Stand herunterladen“ herunter; „Ohne Kopie einspielen“ ersetzt ihn endgültig.
          </Callout>
        ) : ladeZustand === 'ladefehler' ? (
          <Callout ton="error" icon="!">
            Der gespeicherte Stand ließ sich nicht laden. Das Einspielen ersetzt ihn; eine unveränderte Kopie bleibt im
            Browser, solange der Speicher reicht. Wer ihn noch braucht, lädt ihn vorher mit „Gespeicherten Stand
            herunterladen“ herunter.
          </Callout>
        ) : (
          <Callout ton="warn" icon="!">
            Der gesamte jetzige Bestand der Baubetriebsplanung in diesem Browser wird ersetzt. Die anderen Bereiche
            bleiben unberührt.
          </Callout>
        )}
        <label className="checkbox">
          <input type="checkbox" checked={mitEinstellungen} onChange={(e) => setMitEinstellungen(e.target.checked)} />
          Auch „Angemeldet als“ und Farbmodus aus der Sicherung übernehmen – gilt dann in allen Bereichen
        </label>
      </div>
    </Modal>
  );
}
