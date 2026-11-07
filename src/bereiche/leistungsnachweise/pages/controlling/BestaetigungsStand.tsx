/**
 * Monatsbestätigungen der Mitarbeiter im Controlling (domain/erfassung.ts) –
 * eine eigene Seite dafür gibt es nicht.
 *
 * `MitarbeiterBestaetigungen` ist der Block „Mitarbeiter und Bestätigungen“
 * auf der Seite eines Projekts (Projekt.tsx, Abrechnung.tsx): je Person mit
 * Leistungen im gezeigten Leistungsnachweis die erfassten Stunden und je Monat
 * seines Zeitraums der Stand ihrer Bestätigung (bestätigt mit Tag, offen,
 * geändert seit Bestätigung, abgerechnet) – nur Personen und Monate dieses
 * Nachweises (`bestaetigungenDesNachweises`). Oben „x von y bestätigt“:
 * bestätigt hat, wessen Monate alle bestätigt bzw. abgerechnet sind
 * (`bestaetigungsZahl`, auch für die Übersicht der Projekte). Abgeschlossene
 * Nachweise zeigen nur die Stunden ihres festgeschriebenen Stands.
 * `FehlendeBestaetigungen` nennt die Fehlenden in der Rückfrage
 * „Leistungsnachweis erstellen?“ (`fehlendeBestaetigungen`) – erstellen
 * bleibt möglich.
 *
 * Bestätigen können nur die Mitarbeiter selbst, im Bereich Leistungsnachweise
 * (domain/rechte.ts, `darfBestaetigen`) – hier wird nur gelesen.
 */
import { Icon } from '../../../../shared/icons';
import { Badge, Callout, Card, CardHeader } from '../../../../shared/ui';
import { anzahl } from '../../components/common';
import type { FassungMitarbeiter } from '../../domain/druck';
import { bestaetigungenDesNachweises, monatName, type MonatsStatus, type MonatsStatusArt } from '../../domain/erfassung';
import { tagVon } from '../../domain/nachweis';
import { MONATSNAMEN, kurzDatum, stundenText } from '../../domain/zeitraum';
import { mitarbeiterName, type ID, type Leistungsnachweis, type LeistungsnachweisDaten, type Mitarbeiter } from '../../domain/types';
import { useStore } from '../../store/store';
import './controlling.css';

/** Name einer Person für Listen; unbekannte (gelöscht) als „?“. */
function personText(mitarbeiter: Map<ID, Mitarbeiter>, id: ID): string {
  const m = mitarbeiter.get(id);
  return m ? mitarbeiterName(m) || m.kuerzel || '?' : '?';
}

/** „Okt 26“ – Monat kurz für die Kennzeichen. */
function monatKurz(monat: string): string {
  const name = MONATSNAMEN[Number(monat.slice(5, 7)) - 1] ?? monat;
  return `${name.slice(0, 3)} ${monat.slice(2, 4)}`;
}

/** Hat die Person ihre Monate des Nachweises bestätigt (bzw. sind sie abgerechnet)? */
const erledigt = (s: MonatsStatusArt) => s === 'bestaetigt' || s === 'abgerechnet' || s === 'keine';

/**
 * Wie viele Personen mit Leistungen in einem offenen Nachweis haben alle ihre
 * Monate darin bestätigt (oder sind dort ganz abgerechnet)? Für „x von y
 * bestätigt“ – im Block und in der Übersicht der Projekte. Abgeschlossene
 * Nachweise: null.
 */
export function bestaetigungsZahl(daten: LeistungsnachweisDaten, n: Leistungsnachweis): { bestaetigt: number; gesamt: number } | null {
  if (n.status === 'abgeschlossen') return null;
  const jePerson = new Map<ID, MonatsStatusArt[]>();
  for (const m of bestaetigungenDesNachweises(daten, n)) {
    for (const p of m.personen) jePerson.set(p.mitarbeiterId, [...(jePerson.get(p.mitarbeiterId) ?? []), p.status]);
  }
  const gesamt = jePerson.size;
  const bestaetigt = [...jePerson.values()].filter((liste) => liste.every(erledigt)).length;
  return { bestaetigt, gesamt };
}

/** „1 von 2 bestätigt“ – grün, wenn alle bestätigt haben. */
export function BestaetigtBadge({ zahl }: { zahl: { bestaetigt: number; gesamt: number } | null }) {
  if (!zahl || zahl.gesamt === 0) return <span className="tertiary">–</span>;
  return (
    <Badge ton={zahl.bestaetigt === zahl.gesamt ? 'green' : 'orange'}>{`${zahl.bestaetigt} von ${zahl.gesamt} bestätigt`}</Badge>
  );
}

/** Kennzeichen eines Monats: „Okt 26 ✓ 01.11.26“, „Nov 26 offen“ … */
function MonatsKennzeichen({ status: s }: { status: MonatsStatus }) {
  const tag = s.bestaetigung ? kurzDatum(tagVon(s.bestaetigung.am)) : '';
  const text =
    s.status === 'bestaetigt'
      ? `bestätigt ${tag}`
      : s.status === 'geaendert'
        ? 'geändert seit Bestätigung'
        : s.status === 'abgerechnet'
          ? 'abgerechnet'
          : s.status === 'offen'
            ? 'offen'
            : '–';
  return (
    <span
      className={`ln-co-bst-chip ln-co-bst-chip-${s.status}`}
      title={`${monatName(s.monat)}: ${text}${s.ohneText.length ? ` – ${anzahl(s.ohneText.length, 'Zeitraum', 'Zeiträume')} ohne Leistungstext` : ''}`}
    >
      <span className="ln-co-bst-chip-monat">{monatKurz(s.monat)}</span>
      {s.status === 'bestaetigt' ? <Icon name="check" size={12} strokeWidth={2.4} /> : null}
      <span>{text}</span>
    </span>
  );
}

export function MitarbeiterBestaetigungen({ nachweis: n, mitarbeiter }: { nachweis: Leistungsnachweis; mitarbeiter: FassungMitarbeiter[] }) {
  const { data } = useStore();
  const offen = n.status !== 'abgeschlossen';
  // Je Person ihr Stand in den Monaten des Nachweises, aufsteigend
  const monate = offen ? [...bestaetigungenDesNachweises(data, n)].reverse() : [];
  const jePerson = new Map<ID, MonatsStatus[]>();
  for (const m of monate) for (const p of m.personen) jePerson.set(p.mitarbeiterId, [...(jePerson.get(p.mitarbeiterId) ?? []), p]);
  const zahl = bestaetigungsZahl(data, n);
  const summe = mitarbeiter.reduce((s, m) => s + m.stunden, 0);

  return (
    <Card>
      <CardHeader
        titel="Mitarbeiter und Bestätigungen"
        sub={
          offen
            ? 'Wer im Zeitraum Stunden gebucht hat und ob er seine Monate (Stunden und Leistungstexte) bestätigt hat'
            : 'Stunden des festgeschriebenen Stands'
        }
        actions={offen ? <BestaetigtBadge zahl={zahl} /> : undefined}
      />
      {mitarbeiter.length === 0 ? (
        <p className="small tertiary ln-co-bst-leer">Noch keine Stunden im Zeitraum.</p>
      ) : (
        <div className="table-scroll">
          <table className="table table-stack ln-co-bst-tabelle">
            <thead>
              <tr>
                <th>Mitarbeiter</th>
                <th className="ln-stunden">Stunden</th>
                {offen ? <th>Bestätigung je Monat</th> : null}
              </tr>
            </thead>
            <tbody>
              {mitarbeiter.map((m) => (
                <tr key={m.id}>
                  <td>
                    <span className="ln-co-bst-person">{m.name || m.kuerzel}</span>
                    {m.kuerzel ? <span className="num tertiary"> {m.kuerzel}</span> : null}
                  </td>
                  <td className="ln-stunden" data-label="Stunden">
                    {stundenText(m.stunden)}
                  </td>
                  {offen ? (
                    <td data-label="Bestätigung">
                      <span className="ln-co-bst-chips">
                        {(jePerson.get(m.id) ?? []).map((s) => (
                          <MonatsKennzeichen key={s.monat} status={s} />
                        ))}
                      </span>
                    </td>
                  ) : null}
                </tr>
              ))}
              <tr className="ln-co-summe">
                <td>Summe</td>
                <td className="ln-stunden" data-label="Stunden">
                  {stundenText(summe)}
                </td>
                {offen ? <td /> : null}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

/**
 * Hinweis in der Rückfrage beim Erstellen: wer für welchen Monat noch nicht
 * bzw. nach einer Änderung nicht erneut bestätigt hat (`fehlendeBestaetigungen`,
 * aufsteigend nach Monat) – je Monat eine Zeile. Erstellen bleibt möglich.
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
          Erstellen ist trotzdem möglich – danach lassen sich die gemeinsamen Leistungstexte der abgerechneten Zeiträume
          nicht mehr ändern.
        </span>
      </div>
    </Callout>
  );
}
