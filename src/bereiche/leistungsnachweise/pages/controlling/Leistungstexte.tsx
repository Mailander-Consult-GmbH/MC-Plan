/**
 * Leistungstext einer Zeile in der Tabelle des Leistungsnachweises im
 * Controlling (Abrechnung.tsx) – eine eigene Ansicht „Leistungstexte“ gibt es
 * nicht mehr: Text, Stunden und Aufschlag stehen in einer Tabelle.
 *
 * Der Text entsteht, solange das Controlling ihn nicht bearbeitet hat, aus den
 * gemeinsamen Leistungstexten der Mitarbeiter (`textGemeinsam`, Badge „Text
 * der Mitarbeiter“), sonst aus den Texten der Leistungen. Wer ihn bearbeitet,
 * behält seinen Text (`zeilenTextSetzen`): Kommen danach Leistungen hinzu oder
 * ändert sich der Text der Mitarbeiter (`ueberholteZeilen`), nennt die Zeile
 * das und bietet „Ergänzen“, „Text der Mitarbeiter übernehmen“ bzw. „Text so
 * lassen“ an – überschrieben wird nie still. Bearbeiten darf nur das
 * Controlling, solange der Nachweis offen ist; abgeschlossene zeigen den
 * festgeschriebenen Stand, nur zum Lesen. Auch offen steht der Text zunächst
 * so da, wie er im PDF erscheint; „Korrigieren“ macht ihn bearbeitbar,
 * „Fertig“ (oder Escape) zeigt ihn wieder zum Lesen – gespeichert wird bei
 * jeder Eingabe.
 */
import { useState } from 'react';
import { Badge, Callout } from '../../../../shared/ui';
import { Textfeld } from '../../components/Textfeld';
import { anzahl } from '../../components/common';
import type { ID, Leistung, NachweisZeile } from '../../domain/types';
import { kurzDatum } from '../../domain/zeitraum';
import '../../components/nachweis.css';

/** Leistungstexte ab dieser Länge erscheinen beim Lesen gekürzt mit „mehr“. */
export const KURZ_AB = 180;

export function ZeilenText({
  zeile: z,
  bearbeitbar,
  gemeinsamMoeglich,
  mitarbeiterTextNeu,
  neue,
  textOffen,
  personName,
  onText,
  onErgaenzen,
  onBeibehalten,
  onAutomatisch,
  onMehr,
}: {
  zeile: NachweisZeile;
  /** Offen und im Controlling: der Text lässt sich bearbeiten. */
  bearbeitbar: boolean;
  /** Von Hand bearbeitet, und ohne die Bearbeitung käme der Text aus den gemeinsamen Texten der Mitarbeiter. */
  gemeinsamMoeglich: boolean;
  /** Von Hand bearbeitet, und der Text der Mitarbeiter (bzw. der automatische) hat sich seitdem geändert: der heutige – sonst null. */
  mitarbeiterTextNeu: string | null;
  /** Leistungen, die nach der Textbearbeitung hinzukamen. */
  neue: Leistung[];
  /** Langer Text beim Lesen ganz gezeigt. */
  textOffen: boolean;
  personName: (id: ID) => string;
  onText: (text: string) => void;
  onErgaenzen: (neue: Leistung[]) => void;
  onBeibehalten: () => void;
  onAutomatisch: () => void;
  onMehr: () => void;
}) {
  const datum = z.datumText.replace('\n', ' ');
  // Offen: erst lesen wie im PDF, „Korrigieren“ öffnet das Feld
  const [aendern, setAendern] = useState(false);
  const lang = z.text.length > KURZ_AB || z.text.split('\n').length > 3;
  const text = (
    <div className={`ln-co-lesetext ${lang && !textOffen ? 'ln-co-gekuerzt' : ''}`}>
      {z.text || <span className="tertiary">ohne Leistungstext</span>}
    </div>
  );
  const mehr = lang ? (
    <button type="button" className="ln-co-link" aria-expanded={textOffen} onClick={onMehr}>
      {textOffen ? 'weniger' : 'mehr'}
    </button>
  ) : null;
  if (!bearbeitbar) {
    return (
      <>
        {text}
        {mehr}
      </>
    );
  }
  return (
    <>
      {aendern ? (
        <>
          <Textfeld
            value={z.text}
            onChange={onText}
            aria-label={`Leistungstext ${datum}`}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.stopPropagation();
                setAendern(false);
              }
            }}
          />
          <button type="button" className="ln-co-link ln-co-fertig" onClick={() => setAendern(false)}>
            Fertig
          </button>
        </>
      ) : (
        <>
          {text}
          <div className="ln-co-text-links">
            {mehr}
            <button
              type="button"
              className="ln-co-link ln-co-korrigieren"
              aria-label={`Leistungstext ${datum} korrigieren`}
              onClick={() => setAendern(true)}
            >
              ✎ Korrigieren
            </button>
          </div>
        </>
      )}
      <div className="ln-zeile-hinweis">
        {z.textBearbeitet ? (
          <>
            Von Hand bearbeitet ·{' '}
            <button type="button" className="ln-zeile-link" onClick={onAutomatisch}>
              {gemeinsamMoeglich ? 'Text der Mitarbeiter wiederherstellen' : 'Automatischen Text wiederherstellen'}
            </button>
          </>
        ) : z.textGemeinsam ? (
          <span title="Aus den Leistungstexten, die die Mitarbeiter je Zeitraum gemeinsam verfassen – Änderungen hier bleiben stehen">
            <Badge ton="blue">Text der Mitarbeiter</Badge>
          </span>
        ) : (
          'Automatisch aus den Texten der Leistungen'
        )}
      </div>
      {neue.length > 0 || mitarbeiterTextNeu !== null ? (
        <div className="ln-zeile-neu">
          <Callout ton="warn" icon="!">
            <div className="stack" style={{ gap: 6 }}>
              {neue.length > 0 ? (
                <>
                  <strong>{anzahl(neue.length, 'neue Leistung', 'neue Leistungen')} seit der Bearbeitung</strong>
                  <ul className="ln-zeile-neu-liste">
                    {neue.map((l) => (
                      <li key={l.id}>
                        {kurzDatum(l.datum)} · {personName(l.mitarbeiterId)}: {l.text}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
              {mitarbeiterTextNeu !== null ? (
                <>
                  <strong>
                    {gemeinsamMoeglich
                      ? 'Der Text der Mitarbeiter hat sich seit der Bearbeitung geändert:'
                      : 'Der automatische Text hat sich seit der Bearbeitung geändert:'}
                  </strong>
                  <span className="ln-zeile-neu-liste">„{mitarbeiterTextNeu}“</span>
                </>
              ) : null}
              <div className="row wrap" style={{ gap: 6 }}>
                {neue.length > 0 ? (
                  <button type="button" className="btn btn-sm btn-primary" onClick={() => onErgaenzen(neue)}>
                    Ergänzen
                  </button>
                ) : null}
                {mitarbeiterTextNeu !== null ? (
                  <button type="button" className={`btn btn-sm ${neue.length > 0 ? 'btn-outline' : 'btn-primary'}`} onClick={onAutomatisch}>
                    {gemeinsamMoeglich ? 'Text der Mitarbeiter übernehmen' : 'Automatischen Text übernehmen'}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  title="Den Text unverändert lassen und den Hinweis ausblenden"
                  onClick={onBeibehalten}
                >
                  Text so lassen
                </button>
              </div>
            </div>
          </Callout>
        </div>
      ) : null}
    </>
  );
}
