/**
 * Monatsbestätigungen der Mitarbeiter in der Abrechnung eines Nachweises im
 * Controlling (Abrechnung.tsx, domain/erfassung.ts) – eine eigene Seite dafür
 * gibt es nicht.
 *
 * `BestaetigungsStand` steht in der Abrechnung eines offenen Nachweises: je
 * Monat seines Zeitraums „x von y bestätigt“, wer bestätigt hat (mit Tag) und
 * wer noch nicht bzw. nach einer Änderung nicht erneut – nur Personen mit
 * Leistungen in diesem Nachweis (`bestaetigungenDesNachweises`).
 * `FehlendeBestaetigungen` nennt die Fehlenden in der Rückfrage
 * „Leistungsnachweis abschließen?“ (`fehlendeBestaetigungen`) – abschließen
 * bleibt möglich.
 *
 * Bestätigen können nur die Mitarbeiter selbst, im Bereich Leistungsnachweise
 * (domain/rechte.ts, `darfBestaetigen`) – hier wird nur gelesen.
 */
import { Badge, Callout } from '../../../../shared/ui';
import { bestaetigungenDesNachweises, monatName, type BestaetigungsMonat, type MonatsStatus } from '../../domain/erfassung';
import { tagVon } from '../../domain/nachweis';
import { mitarbeiterName, type ID, type Leistungsnachweis, type Mitarbeiter } from '../../domain/types';
import { langDatum } from '../../domain/zeitraum';
import { useStore } from '../../store/store';
import './controlling.css';

/** „03.11.2026“ – Tag eines Zeitpunkts (Ortszeit). */
const amTag = (iso: string) => langDatum(tagVon(iso));

/** Name einer Person für Listen; unbekannte (gelöscht) als „?“. */
function personText(mitarbeiter: Map<ID, Mitarbeiter>, id: ID): string {
  const m = mitarbeiter.get(id);
  return m ? mitarbeiterName(m) || m.kuerzel || '?' : '?';
}

/** „2 von 3 bestätigt“ – grün, wenn alle bestätigt haben; ohne zu Bestätigende „Abgerechnet“. */
function MonatsBadge({ monat: m }: { monat: BestaetigungsMonat }) {
  if (m.zuBestaetigen === 0) return <Badge ton="blue">Abgerechnet</Badge>;
  return <Badge ton={m.bestaetigt === m.zuBestaetigen ? 'green' : 'orange'}>{`${m.bestaetigt} von ${m.zuBestaetigen} bestätigt`}</Badge>;
}

/* ------------------------------------------------------------------ */
/* Kurzer Stand in der Abrechnung                                      */
/* ------------------------------------------------------------------ */

/**
 * Stand der Bestätigungen für die Monate eines offenen Nachweises, in
 * zeitlicher Folge – nichts, solange er keine Leistungen hat.
 */
export function BestaetigungsStand({ nachweis: n }: { nachweis: Leistungsnachweis }) {
  const { data } = useStore();
  const monate = [...bestaetigungenDesNachweises(data, n)].reverse();
  if (monate.length === 0) return null;
  const mitarbeiter = new Map(data.mitarbeiter.map((m) => [m.id, m]));
  const namen = (liste: MonatsStatus[]) => liste.map((p) => personText(mitarbeiter, p.mitarbeiterId)).join(', ');

  return (
    <div className="ln-co-bst-stand">
      <div className="ln-co-bst-stand-kopf">
        <span className="ln-co-bst-stand-titel">Bestätigungen der Mitarbeiter</span>
      </div>
      <ul className="ln-co-bst-monate">
        {monate.map((m) => {
          const bestaetigt = m.personen.filter((p) => p.status === 'bestaetigt');
          const offen = m.personen.filter((p) => p.status === 'offen');
          const geaendert = m.personen.filter((p) => p.status === 'geaendert');
          return (
            <li key={m.monat}>
              <span className="ln-co-bst-monat">{monatName(m.monat)}</span>
              <MonatsBadge monat={m} />
              <span className="small ln-co-bst-fehlend">
                {bestaetigt.length ? (
                  <span>
                    <span className="tertiary">Bestätigt:</span>{' '}
                    {bestaetigt
                      .map((p) => `${personText(mitarbeiter, p.mitarbeiterId)}${p.bestaetigung ? ` (${amTag(p.bestaetigung.am)})` : ''}`)
                      .join(', ')}
                  </span>
                ) : null}
                {offen.length ? (
                  <span>
                    <span className="tertiary">Offen:</span> {namen(offen)}
                  </span>
                ) : null}
                {geaendert.length ? (
                  <span>
                    <span className="tertiary">Geändert seit Bestätigung:</span> {namen(geaendert)}
                  </span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Hinweis in der Rückfrage beim Abschließen: wer für welchen Monat noch nicht
 * bzw. nach einer Änderung nicht erneut bestätigt hat (`fehlendeBestaetigungen`,
 * aufsteigend nach Monat) – je Monat eine Zeile. Abschließen bleibt möglich.
 */
export function FehlendeBestaetigungen({ fehlende }: { fehlende: MonatsStatus[] }) {
  const { data } = useStore();
  if (fehlende.length === 0) return null;
  const mitarbeiter = new Map(data.mitarbeiter.map((m) => [m.id, m]));
  const jeMonat = new Map<string, MonatsStatus[]>();
  for (const p of fehlende) {
    const liste = jeMonat.get(p.monat);
    if (liste) liste.push(p);
    else jeMonat.set(p.monat, [p]);
  }
  const personen = new Set(fehlende.map((p) => p.mitarbeiterId)).size;
  return (
    <Callout ton="warn" icon="!">
      <div className="stack" style={{ gap: 6 }}>
        <strong>
          {personen === 1
            ? 'Eine Person hat ihre Leistungen noch nicht bestätigt:'
            : `${personen} Personen haben ihre Leistungen noch nicht bestätigt:`}
        </strong>
        <ul className="ln-co-bst-fehlende">
          {[...jeMonat.entries()].map(([monat, liste]) => (
            <li key={monat}>
              <span className="ln-co-bst-monat">{monatName(monat)}:</span>{' '}
              {liste
                .map((p) => `${personText(mitarbeiter, p.mitarbeiterId)}${p.status === 'geaendert' ? ' (geändert seit Bestätigung)' : ''}`)
                .join(', ')}
            </li>
          ))}
        </ul>
        <span>
          Abschließen ist trotzdem möglich – danach lassen sich die gemeinsamen Leistungstexte der abgerechneten
          Zeiträume nicht mehr ändern.
        </span>
      </div>
    </Callout>
  );
}
