/**
 * Dauerhafter Hinweis über dem Inhalt jedes Bereichs (eingebunden in den
 * App.tsx, unter den Hinweisleisten des Bereichs), wenn mit dem Projektregister
 * etwas nicht stimmt:
 *
 * * Es ließ sich nicht lesen oder stammt aus einer neueren Fassung
 *   (`useRegisterZustand`): Dann bleibt es unberührt, und der Bereich gleicht
 *   seine Projekte nicht mit den anderen Bereichen ab.
 * * Es ließ sich nicht speichern (`useRegisterSpeicherZustand`): Was am
 *   Register geändert wurde – Übernahmen, Archiv, der Abgleich des Bereichs –,
 *   steht nur im Register dieses Fensters und ginge beim Schließen der Seite
 *   verloren. „Erneut speichern“ versucht es noch einmal, etwa nachdem anderswo
 *   Platz frei geworden ist; das tut auch jeder weitere Aufruf von
 *   `registerAendern`, und speichert ein anderes Fenster das Register, trägt
 *   dieses seine Änderungen auf dessen Stand nach und speichert erneut
 *   (`eigeneAenderungenNachziehen`). Gelingt es – wie auch immer –,
 *   verschwindet der Hinweis mit der Meldung „Projektregister gespeichert.“;
 *   ein Fokus, der mit dem Knopf auf `body` fiele, geht an die Stelle des
 *   Hinweises. Hat ein anderes Fenster einen Stand gespeichert, den dieses
 *   nicht lesen kann, gilt jener, und die Änderungen entfallen – dann sagt die
 *   Meldung das.
 */
import { useEffect, useRef } from 'react';
import { useToast } from '../shared/toast';
import { Callout } from '../shared/ui';
import { registerErneutSpeichern, useRegisterSpeicherZustand, useRegisterZustand } from './register';
import './gemeinsam.css';

export function RegisterHinweis() {
  const gespeichert = useRegisterSpeicherZustand();
  const zustand = useRegisterZustand();
  const toast = useToast();
  const vorher = useRef(gespeichert);
  const anker = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const war = vorher.current;
    vorher.current = gespeichert;
    if (war === 'ok' || gespeichert !== 'ok') return;
    toast(
      zustand === 'ok'
        ? 'Projektregister gespeichert.'
        : 'Nicht gespeicherte Änderungen am Projektregister verworfen – ein anderes Fenster hat einen Stand gespeichert, den diese Seite nicht lesen kann.',
    );
    const aktiv = document.activeElement;
    if (!aktiv || aktiv === document.body) anker.current?.focus({ preventScroll: true });
  }, [gespeichert, zustand, toast]);

  const ungespeichert = zustand === 'ok' && gespeichert !== 'ok';
  return (
    <div ref={anker} tabIndex={-1} className={zustand !== 'ok' || ungespeichert ? 'gem-registeranker gem-registerhinweis' : 'gem-registeranker'}>
      {zustand !== 'ok' ? (
        <Callout ton="error" icon="!" role="alert">
          <strong>
            {zustand === 'neuere_fassung'
              ? 'Das Projektregister stammt aus einer neueren Fassung von KaPlan.'
              : 'Das Projektregister ließ sich nicht lesen.'}
          </strong>{' '}
          Es bleibt unverändert, und dieser Bereich gleicht seine Projekte nicht mit den anderen Bereichen ab.
          {zustand === 'neuere_fassung' ? (
            <div className="row wrap gem-registerhinweis-knoepfe">
              <button type="button" className="btn btn-sm btn-outline" onClick={() => window.location.reload()}>
                Seite neu laden
              </button>
            </div>
          ) : null}
        </Callout>
      ) : null}
      {ungespeichert ? (
        <Callout ton="error" icon="!" role="alert">
          <strong>Projektregister nicht gespeichert.</strong>{' '}
          {gespeichert === 'voll'
            ? 'Der Speicher des Browsers ist voll'
            : 'Der Browser lässt das Speichern nicht zu (etwa durch Datenschutzeinstellungen)'}
          ; was die anderen Bereiche von den Projekten wissen müssen (Übernahmen, Archiv, Projektbeteiligte), geht beim
          Schließen der Seite verloren.
          <div className="row wrap gem-registerhinweis-knoepfe">
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={() => {
                if (registerErneutSpeichern() !== 'ok') toast('Das Projektregister lässt sich weiterhin nicht speichern.');
              }}
            >
              Erneut speichern
            </button>
          </div>
        </Callout>
      ) : null}
    </div>
  );
}
