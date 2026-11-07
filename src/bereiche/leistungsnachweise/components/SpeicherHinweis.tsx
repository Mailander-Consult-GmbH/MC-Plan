/**
 * Dauerhafter Hinweis über dem Inhalt, solange sich der Bestand nicht
 * speichern lässt (`speicherZustand` des Stores, store/storage.ts
 * `speichereDaten`): Der Speicher des Browsers ist voll oder das Speichern ist
 * gesperrt. Änderungen gingen beim Schließen der Seite verloren – der Hinweis
 * bietet eine Sicherung zum Herunterladen an. Wie im Planlaufmanagement; nur
 * bei einwandfrei geladenem Stand (sonst gilt der Ladehinweis).
 */
import { Callout } from '../../../shared/ui';
import { exportiereDaten } from '../store/storage';
import { useStore } from '../store/store';

export function SpeicherHinweis() {
  const { data, ladeZustand, speicherZustand } = useStore();
  if (ladeZustand !== 'ok' || speicherZustand === 'ok') return null;
  return (
    <div className="ln-ladehinweis" role="alert">
      <Callout ton="error" icon="!">
        <strong>Nicht gespeichert – bitte Sicherung herunterladen.</strong>{' '}
        {speicherZustand === 'voll'
          ? 'Der Speicher des Browsers ist voll'
          : 'Der Browser lässt das Speichern nicht zu (etwa durch Datenschutzeinstellungen)'}
        ; Änderungen gehen beim Schließen der Seite verloren.
        <div className="row wrap ln-ladehinweis-knoepfe">
          <button type="button" className="btn btn-sm btn-outline" onClick={() => exportiereDaten(data)}>
            Sicherung herunterladen
          </button>
        </div>
      </Callout>
    </div>
  );
}
