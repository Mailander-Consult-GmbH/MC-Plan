/**
 * Monatsbestätigungen der Mitarbeiter im Controlling (domain/erfassung.ts).
 *
 * `Bestaetigungen` ist der Reiter „Bestätigungen“ eines Projekts: je Monat mit
 * Leistungen (neueste zuerst, `bestaetigungsUebersicht`) die Personen mit
 * Leistungen im Projekt – Stunden, Stand der Bestätigung als Badge
 * (`monatsStatusBadge`: „Bestätigt am …“, „Offen“, „Geändert seit
 * Bestätigung“, „Abgerechnet“) und die Zeiträume ohne gemeinsamen
 * Leistungstext („Ohne Text“, etwa „1 von 4“) samt dem Hinweis auf Leistungen,
 * die nach dem Abschluss in einem abgerechneten Zeitraum erfasst bzw. als
 * abgerechnete geändert wurden –, dazu „x von y bestätigt“ und die
 * Leistungsnachweise, in denen der Monat liegt (ein Klick öffnet die
 * Abrechnung). Monate, deren Leistungen alle abgerechnet sind und in denen
 * nichts nach dem Abschluss erfasst bzw. geändert wurde, stehen eingeklappt
 * darunter („Abgerechnete Monate anzeigen“).
 *
 * `BestaetigungsStand` ist der kurze Stand in der Abrechnung eines offenen
 * Nachweises: je Monat seines Zeitraums „x von y bestätigt“ und wer noch nicht
 * bzw. nach einer Änderung nicht erneut bestätigt hat – nur Personen mit
 * Leistungen in diesem Nachweis (`bestaetigungenDesNachweises`) –, mit dem Weg
 * zum Reiter.
 * `FehlendeBestaetigungen` nennt dieselben in der Rückfrage „Leistungsnachweis
 * abschließen?“ (Abrechnung.tsx, `fehlendeBestaetigungen`) – abschließen
 * bleibt möglich.
 *
 * Bestätigen können nur die Mitarbeiter selbst, im Bereich Leistungsnachweise
 * (domain/rechte.ts, `darfBestaetigen`) – hier wird nur gelesen.
 */
import { useState } from 'react';
import { Icon } from '../../../../shared/icons';
import { Badge, Callout, Card, CardHeader, EmptyState } from '../../../../shared/ui';
import { NachweisStatusBadge, anzahl } from '../../components/common';
import {
  bestaetigungenDesNachweises,
  bestaetigungsUebersicht,
  monatName,
  monateDesNachweises,
  monatsStatusBadge,
  periodeKurztext,
  type BestaetigungsMonat,
  type MonatsStatus,
} from '../../domain/erfassung';
import { nachweisTitel, nachweiseVon, stundenVon, tagVon } from '../../domain/nachweis';
import { mitarbeiterName, type ID, type Leistungsnachweis, type Mitarbeiter, type Projekt } from '../../domain/types';
import { langDatum, stundenText } from '../../domain/zeitraum';
import type { Route } from '../../lib/router';
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
/* Reiter „Bestätigungen“                                              */
/* ------------------------------------------------------------------ */

export function Bestaetigungen({ projekt, navigate }: { projekt: Projekt; navigate: (r: Route) => void }) {
  const { data } = useStore();
  const [abgerechneteZeigen, setAbgerechneteZeigen] = useState(false);

  const monate = bestaetigungsUebersicht(data, projekt.id);
  const mitarbeiter = new Map(data.mitarbeiter.map((m) => [m.id, m]));
  // Leistungsnachweise je Monat ihrer Leistungen (samt nachgereichten)
  const nachweiseJeMonat = new Map<string, Leistungsnachweis[]>();
  for (const n of nachweiseVon(data, projekt.id)) {
    for (const monat of monateDesNachweises(data, n)) {
      const liste = nachweiseJeMonat.get(monat);
      if (liste) liste.push(n);
      else nachweiseJeMonat.set(monat, [n]);
    }
  }
  // Eingeklappt stehen nur Monate, in denen alles abgerechnet ist – auch nichts nach dem Abschluss Erfasstes
  const offenBleiben = (m: BestaetigungsMonat) =>
    m.zuBestaetigen > 0 || m.personen.some((p) => p.nachAbschluss.length > 0 || p.nachAbschlussGeaendert.length > 0);
  const laufend = monate.filter(offenBleiben);
  const abgerechnet = monate.filter((m) => !offenBleiben(m));
  const offen = laufend.reduce((s, m) => s + m.personen.filter((p) => p.status === 'offen').length, 0);
  const geaendert = laufend.reduce((s, m) => s + m.personen.filter((p) => p.status === 'geaendert').length, 0);

  const einleitung = (
    <p className="small muted" style={{ margin: 0, maxWidth: 680 }}>
      Die Mitarbeiter bestätigen im Bereich Leistungsnachweise je Monat, dass ihre Stunden und die gemeinsamen
      Leistungstexte vollständig erfasst sind. Ändern sich danach ihre Leistungen oder die Texte eines noch nicht
      abgerechneten Zeitraums, erlischt die Bestätigung. Abschließen lässt sich ein Leistungsnachweis auch ohne
      Bestätigung.
    </p>
  );

  if (monate.length === 0) {
    return (
      <div className="stack">
        {einleitung}
        <Card>
          <EmptyState
            icon="stunden"
            titel="Noch keine Leistungen"
            text="Sobald Mitarbeiter im Bereich Leistungsnachweise Leistungen in diesem Projekt erfassen oder importieren, steht hier je Monat, wer bestätigt hat."
          />
        </Card>
      </div>
    );
  }

  const karte = (m: BestaetigungsMonat) => (
    <MonatsKarte
      key={m.monat}
      monat={m}
      mitarbeiter={mitarbeiter}
      nachweise={nachweiseJeMonat.get(m.monat) ?? []}
      onNachweis={(n) => navigate({ view: 'abrechnung', projektId: projekt.id, nachweisId: n.id })}
    />
  );

  return (
    <div className="stack">
      {einleitung}
      {laufend.some((m) => m.zuBestaetigen > 0) ? (
        <p className="small ln-co-bst-summe" style={{ margin: 0 }}>
          {offen === 0 && geaendert === 0 ? (
            <span className="ln-co-bst-ok">
              <Icon name="check" size={13} /> Alle Mitarbeiter haben ihre Monate bestätigt.
            </span>
          ) : (
            <>
              {offen ? <span className="ln-co-warnung">{anzahl(offen, 'Bestätigung offen', 'Bestätigungen offen')}</span> : null}
              {offen && geaendert ? ' · ' : null}
              {geaendert ? (
                <span className="ln-co-bst-geaendert">
                  {anzahl(geaendert, 'Bestätigung erloschen', 'Bestätigungen erloschen')} (geändert seit Bestätigung)
                </span>
              ) : null}
            </>
          )}
        </p>
      ) : (
        <Card>
          <EmptyState
            icon="check"
            titel="Alles abgerechnet"
            text="Alle Monate mit Leistungen liegen in abgeschlossenen Leistungsnachweisen – zu bestätigen ist nichts."
          />
        </Card>
      )}

      {laufend.map(karte)}

      {abgerechnet.length > 0 ? (
        <div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            aria-expanded={abgerechneteZeigen}
            onClick={() => setAbgerechneteZeigen((z) => !z)}
          >
            <Icon name={abgerechneteZeigen ? 'runter' : 'chevron'} size={12} />{' '}
            {abgerechneteZeigen ? 'Abgerechnete Monate ausblenden' : `Abgerechnete Monate anzeigen (${abgerechnet.length})`}
          </button>
        </div>
      ) : null}
      {abgerechneteZeigen ? abgerechnet.map(karte) : null}
    </div>
  );
}

/** Ein Monat: Personen mit Leistungen, ihre Stunden und ihr Stand. */
function MonatsKarte({
  monat: m,
  mitarbeiter,
  nachweise,
  onNachweis,
}: {
  monat: BestaetigungsMonat;
  mitarbeiter: Map<ID, Mitarbeiter>;
  /** Leistungsnachweise mit Leistungen dieses Monats. */
  nachweise: Leistungsnachweis[];
  onNachweis: (n: Leistungsnachweis) => void;
}) {
  return (
    <Card>
      <CardHeader
        titel={monatName(m.monat)}
        sub={`${anzahl(m.personen.length, 'Person', 'Personen')} · ${stundenText(stundenVon(m.personen))} Std.`}
        actions={<MonatsBadge monat={m} />}
      />
      <div className="table-scroll">
        <table className="table table-stack ln-co-bestaetigungen">
          <thead>
            <tr>
              <th>Mitarbeiter</th>
              <th className="ln-stunden ln-co-bst-zahl">Stunden</th>
              <th className="ln-co-bst-spalte-status">Status</th>
              <th className="ln-stunden ln-co-bst-zahl" title="Zeiträume mit eigenen Leistungen ohne gemeinsamen Leistungstext – ohne Text lässt sich nicht bestätigen">
                Ohne Text
              </th>
            </tr>
          </thead>
          <tbody>
            {m.personen.map((p) => (
              <PersonZeile key={p.mitarbeiterId} status={p} person={mitarbeiter.get(p.mitarbeiterId)} />
            ))}
          </tbody>
        </table>
      </div>
      {nachweise.length > 0 ? (
        <div className="ln-co-bst-fuss small">
          <span className="tertiary">{nachweise.length === 1 ? 'Leistungsnachweis:' : 'Leistungsnachweise:'}</span>
          {nachweise.map((n) => (
            <span key={n.id} className="ln-co-bst-nachweis">
              <button type="button" className="ln-co-link" onClick={() => onNachweis(n)} title="Abrechnung öffnen">
                {n.status === 'abgeschlossen' && n.stand ? n.stand.titel : nachweisTitel(n)}
              </button>
              <NachweisStatusBadge status={n.status} />
            </span>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

function PersonZeile({ status: p, person }: { status: MonatsStatus; person: Mitarbeiter | undefined }) {
  const badge = monatsStatusBadge(p);
  const offenePerioden = p.perioden.filter((x) => !x.gesperrt).length;
  return (
    <tr>
      <td className="ln-co-bst-person">
        <strong>{person ? mitarbeiterName(person) || person.kuerzel || '?' : '?'}</strong>
        {person?.kuerzel ? <span className="muted ln-co-kuerzel">{person.kuerzel}</span> : null}
        {person && !person.aktiv ? <span className="tertiary ln-co-kuerzel">ausgeschieden</span> : null}
      </td>
      <td className="ln-stunden" data-label="Stunden">
        {stundenText(p.stunden)}
      </td>
      <td data-label="Status">
        <div className="ln-co-bst-status">
          <Badge ton={badge.ton}>{badge.text}</Badge>
          {p.status === 'geaendert' && p.bestaetigung ? (
            <span className="small tertiary ln-co-bst-zusatz">zuletzt bestätigt am {amTag(p.bestaetigung.am)}</span>
          ) : null}
          {p.nachAbschluss.length > 0 ? (
            <span
              className="small ln-co-warnung ln-co-bst-zusatz"
              title="Liegen in einem bereits abgerechneten Zeitraum – sie gehen nicht in den abgeschlossenen Leistungsnachweis ein; über ein Nachreichen entscheidet das Controlling in der Abrechnung."
            >
              {anzahl(p.nachAbschluss.length, 'Leistung', 'Leistungen')} nach dem Abschluss erfasst
            </span>
          ) : null}
          {p.nachAbschlussGeaendert.length > 0 ? (
            <span
              className="small ln-co-warnung ln-co-bst-zusatz"
              title="Bereits abgerechnet und danach geändert – abgerechnet bleibt der Stand des Abschlusses; die Änderung geht erst nach „Wieder öffnen“ ein."
            >
              {anzahl(p.nachAbschlussGeaendert.length, 'Leistung', 'Leistungen')} nach dem Abschluss geändert
            </span>
          ) : null}
        </div>
      </td>
      <td
        className={`ln-stunden ln-co-bst-ohne ${p.ohneText.length ? 'ln-co-warnung' : 'tertiary'}`}
        data-label="Ohne Text"
        title={p.ohneText.length ? `Ohne gemeinsamen Leistungstext: ${p.ohneText.map(periodeKurztext).join('; ')}` : undefined}
      >
        {p.ohneText.length ? `${p.ohneText.length} von ${offenePerioden}` : '–'}
      </td>
    </tr>
  );
}

/* ------------------------------------------------------------------ */
/* Kurzer Stand in der Abrechnung                                      */
/* ------------------------------------------------------------------ */

/**
 * Stand der Bestätigungen für die Monate eines offenen Nachweises, in
 * zeitlicher Folge – nichts, solange er keine Leistungen hat.
 */
export function BestaetigungsStand({
  nachweis: n,
  navigate,
}: {
  nachweis: Leistungsnachweis;
  navigate: (r: Route) => void;
}) {
  const { data } = useStore();
  const monate = [...bestaetigungenDesNachweises(data, n)].reverse();
  if (monate.length === 0) return null;
  const mitarbeiter = new Map(data.mitarbeiter.map((m) => [m.id, m]));
  const namen = (liste: MonatsStatus[]) => liste.map((p) => personText(mitarbeiter, p.mitarbeiterId)).join(', ');

  return (
    <div className="ln-co-bst-stand">
      <div className="ln-co-bst-stand-kopf">
        <span className="ln-co-bst-stand-titel">Bestätigungen der Mitarbeiter</span>
        <button
          type="button"
          className="ln-co-link"
          onClick={() => navigate({ view: 'controllingProjekt', projektId: n.projektId, tab: 'bestaetigungen' })}
        >
          Alle Bestätigungen des Projekts <Icon name="chevron" size={11} />
        </button>
      </div>
      <ul className="ln-co-bst-monate">
        {monate.map((m) => {
          const offen = m.personen.filter((p) => p.status === 'offen');
          const geaendert = m.personen.filter((p) => p.status === 'geaendert');
          return (
            <li key={m.monat}>
              <span className="ln-co-bst-monat">{monatName(m.monat)}</span>
              <MonatsBadge monat={m} />
              <span className="small ln-co-bst-fehlend">
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
