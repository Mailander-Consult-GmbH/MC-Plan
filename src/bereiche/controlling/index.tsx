/**
 * Einstiegspunkt des Bereichs „Controlling“: Projekte für alle Bereiche
 * anlegen, archivieren und löschen. Geschützt mit einer einfachen PIN
 * (domain/pin.ts). Einen eigenen Datenbestand hat das Controlling nicht – es
 * arbeitet allein auf dem Projektregister (`src/gemeinsam/`); die Bereiche
 * übernehmen seine Änderungen beim nächsten Öffnen.
 */
import { useState } from 'react';
import { App } from './App';
import { PinEingabe } from './PinEingabe';
import { istEntsperrt, sperren } from './domain/pin';
import '../../gemeinsam/gemeinsam.css';
import './controlling.css';

export function BereichControlling() {
  const [entsperrt, setEntsperrt] = useState(istEntsperrt);
  if (!entsperrt) return <PinEingabe onEntsperrt={() => setEntsperrt(true)} />;
  return (
    <App
      onSperren={() => {
        sperren();
        setEntsperrt(false);
      }}
    />
  );
}
