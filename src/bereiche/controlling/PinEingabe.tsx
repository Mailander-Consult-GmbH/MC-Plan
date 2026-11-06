/** PIN-Abfrage vor dem Controlling. */
import { useEffect, useRef, useState } from 'react';
import { Icon } from '../../shared/icons';
import { KaPlanLogo } from '../../shared/logos';
import { zurBereichsauswahl } from '../../shell/router';
import { CONTROLLING_PIN, entsperren } from './domain/pin';

export function PinEingabe({ onEntsperrt }: { onEntsperrt: () => void }) {
  const [pin, setPin] = useState('');
  const [falsch, setFalsch] = useState(false);
  const feld = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Die Bereichsauswahl zeigt die Standardfarben – ebenso die PIN-Abfrage.
    document.documentElement.dataset.farbmodus = 'standard';
  }, []);

  const pruefen = (wert: string) => {
    if (entsperren(wert)) {
      onEntsperrt();
      return;
    }
    setFalsch(true);
    setPin('');
    feld.current?.focus();
  };

  return (
    <div className="ct-pin">
      <form
        className="card ct-pin-karte"
        onSubmit={(e) => {
          e.preventDefault();
          pruefen(pin);
        }}
      >
        <div className="ct-pin-logo">
          <KaPlanLogo variante="Startseite" width={180} />
        </div>
        <div className="ct-pin-symbol">
          <Icon name="schloss" size={30} strokeWidth={1.4} />
        </div>
        <h1 className="ct-pin-titel">Controlling</h1>
        <p className="small muted ct-pin-text">
          Projekte für alle Bereiche anlegen, archivieren und löschen. Bitte die PIN eingeben.
        </p>
        <input
          ref={feld}
          className={`input ct-pin-feld ${falsch ? 'falsch' : ''}`}
          type="password"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          maxLength={CONTROLLING_PIN.length}
          aria-label="PIN"
          value={pin}
          onChange={(e) => {
            const wert = e.target.value.replace(/\D/g, '');
            setPin(wert);
            setFalsch(false);
            // Mit der letzten Ziffer gleich prüfen
            if (wert.length === CONTROLLING_PIN.length) pruefen(wert);
          }}
        />
        <div className="ct-pin-meldung" role="alert">
          {falsch ? 'Die PIN stimmt nicht.' : ' '}
        </div>
        <button type="submit" className="btn btn-primary ct-pin-knopf">
          Entsperren
        </button>
        <button type="button" className="link-btn ct-pin-zurueck" onClick={zurBereichsauswahl}>
          <Icon name="zurueck" size={12} /> Zur Bereichsauswahl
        </button>
      </form>
    </div>
  );
}
