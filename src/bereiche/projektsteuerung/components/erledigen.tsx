/**
 * Erledigen in der To-Do-Liste der Projektsteuerung: `ErledigtHaken` ist
 * derselbe kleine Haken wie im Planlaufmanagement (`btn btn-sm btn-haken`,
 * nur das Symbol); erledigt ist er grün gefüllt und springt dabei kurz auf.
 * `useNachlauf` lässt eine Zeile, die gerade erledigt wurde, noch einen
 * Augenblick mit dem neuen Stand stehen, bevor sie die Ansicht verlässt –
 * gespeichert ist sofort, nur das Ausblenden wartet.
 */
import { useEffect, useRef, useState } from 'react';
import { Aufspringen } from '../../../shared/bewegung';
import { Icon } from '../../../shared/icons';

/** So lange bleibt eine erledigte Zeile noch stehen (ms). */
export const NACHLAUF_MS = 700;

export function ErledigtHaken({
  erledigt,
  text,
  onUmschalten,
}: {
  erledigt: boolean;
  /** Text der Aufgabe – für die Beschriftung des Knopfs. */
  text: string;
  onUmschalten: () => void;
}) {
  return (
    <button
      type="button"
      className={`btn btn-sm btn-haken ps-erledigt-haken${erledigt ? ' erledigt' : ''}`}
      aria-pressed={erledigt}
      title={erledigt ? 'Wieder öffnen' : 'Als erledigt markieren'}
      aria-label={`„${text}“ erledigt`}
      onClick={(e) => {
        e.stopPropagation();
        onUmschalten();
      }}
    >
      <Aufspringen wert={erledigt}>
        <Icon name="check" size={13} />
      </Aufspringen>
    </button>
  );
}

/**
 * Zeilen, die nach einer Änderung noch kurz stehen bleiben (`merken`), obwohl
 * sie nicht mehr zur Auswahl passen. Die Liste fragt `hat(schluessel)` und
 * nimmt solche Zeilen mit; nach `NACHLAUF_MS` gehen sie.
 */
export function useNachlauf() {
  const [schluessel, setSchluessel] = useState<ReadonlySet<string>>(() => new Set());
  const zeitgeber = useRef(new Map<string, number>());

  useEffect(() => {
    const laufend = zeitgeber.current;
    return () => laufend.forEach((id) => window.clearTimeout(id));
  }, []);

  const merken = (k: string) => {
    window.clearTimeout(zeitgeber.current.get(k));
    setSchluessel((s) => new Set(s).add(k));
    zeitgeber.current.set(
      k,
      window.setTimeout(() => {
        zeitgeber.current.delete(k);
        setSchluessel((s) => {
          const n = new Set(s);
          n.delete(k);
          return n;
        });
      }, NACHLAUF_MS),
    );
  };

  return { hat: (k: string) => schluessel.has(k), merken };
}
