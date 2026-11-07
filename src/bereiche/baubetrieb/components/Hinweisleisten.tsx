/**
 * Dauerhafte Hinweisleisten über dem Inhalt (eingebunden in App.tsx), wie im
 * Planlaufmanagement:
 *  - Ladefehler: der gespeicherte Stand ließ sich nicht lesen. Angezeigt werden
 *    Demodaten, gespeichert wird nichts (store/storage.ts `ladeDaten`), bis man
 *    ausdrücklich mit Demodaten neu beginnt oder eine Sicherung einspielt.
 *  - Neuere Fassung: die gespeicherten Daten stammen aus einer neueren Fassung;
 *    nur „Seite neu laden“ – alles andere könnte den neueren Stand überschreiben.
 *  - Speicherfehler: der letzte Stand ließ sich nicht speichern (Speicher voll
 *    oder gesperrt, `speichereDaten`).
 */
import { useState } from 'react';
import { useToast } from '../../../shared/toast';
import { Callout, ConfirmDialog } from '../../../shared/ui';
import { exportiereDaten, rohdatenHerunterladen } from '../store/storage';
import { useStore } from '../store/store';
import './hinweisleisten.css';

export function Hinweisleisten() {
  const { data, ladeZustand, speicherZustand, zuruecksetzen } = useStore();
  const toast = useToast();
  const [neuBeginnen, setNeuBeginnen] = useState(false);

  const speicherfehler = ladeZustand === 'ok' && speicherZustand !== 'ok';
  if (ladeZustand === 'ok' && !speicherfehler && !neuBeginnen) return null;

  const gespeichertHerunterladen = () => {
    if (!rohdatenHerunterladen()) toast('Es ist kein gespeicherter Stand vorhanden, der sich herunterladen ließe.');
  };

  return (
    <div className="bb-ladehinweis" role="alert">
      {ladeZustand === 'ladefehler' ? (
        <Callout ton="error" icon="!">
          <strong>Der gespeicherte Stand ließ sich nicht laden.</strong> Angezeigt werden Demodaten. Damit der gespeicherte
          Stand erhalten bleibt, wird nichts gespeichert – bitte herunterladen und aufbewahren.
          <div className="row wrap bb-ladehinweis-knoepfe">
            <button type="button" className="btn btn-sm btn-outline" onClick={gespeichertHerunterladen}>
              Gespeicherten Stand herunterladen
            </button>
            <button type="button" className="btn btn-sm btn-outline" onClick={() => setNeuBeginnen(true)}>
              Mit Demodaten neu beginnen
            </button>
          </div>
        </Callout>
      ) : null}
      {ladeZustand === 'neuere_fassung' ? (
        <Callout ton="warn" icon="!">
          <strong>Die gespeicherten Daten stammen aus einer neueren Fassung von KaPlan.</strong> Diese Seite zeigt Demodaten
          und speichert nichts, damit der neuere Stand erhalten bleibt. Bitte die Seite neu laden.
          <div className="row wrap bb-ladehinweis-knoepfe">
            <button type="button" className="btn btn-sm btn-outline" onClick={() => window.location.reload()}>
              Seite neu laden
            </button>
          </div>
        </Callout>
      ) : null}
      {speicherfehler ? (
        <Callout ton="error" icon="!">
          <strong>Nicht gespeichert – bitte Sicherung herunterladen.</strong>{' '}
          {speicherZustand === 'voll'
            ? 'Der Speicher des Browsers ist voll'
            : 'Der Browser lässt das Speichern nicht zu (etwa durch Datenschutzeinstellungen)'}
          ; Änderungen gehen beim Schließen der Seite verloren.
          <div className="row wrap bb-ladehinweis-knoepfe">
            <button type="button" className="btn btn-sm btn-outline" onClick={() => exportiereDaten(data)}>
              Sicherung herunterladen
            </button>
          </div>
        </Callout>
      ) : null}
      {neuBeginnen ? (
        <ConfirmDialog
          titel="Mit Demodaten neu beginnen?"
          text="Der gespeicherte, nicht lesbare Stand wird durch die Demodaten ersetzt. Wer ihn noch braucht, lädt ihn vorher herunter."
          bestaetigenLabel="Neu beginnen"
          onConfirm={() => {
            zuruecksetzen();
            toast('Mit Demodaten neu begonnen.');
          }}
          onClose={() => setNeuBeginnen(false)}
        />
      ) : null}
    </div>
  );
}
