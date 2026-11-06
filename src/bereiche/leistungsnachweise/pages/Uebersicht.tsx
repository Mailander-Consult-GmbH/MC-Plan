/**
 * Startseite des Bereichs – hier geht es nur um die eigenen Leistungen:
 * Kennzahlen der angemeldeten Person (Stunden und Leistungen im laufenden
 * Monat, Stunden im Jahr), die zuletzt erfassten eigenen Leistungen und die
 * Projekte mit den eigenen Stunden im Monat. Angezeigt werden die markierten
 * Projekte; ohne Markierung alle. Leistungsnachweise, Abschluss und Abrechnung
 * liegen im Controlling. Ohne Anmeldung steht darüber der Hinweis zum
 * Anmelden (App.tsx, `AnmeldeHinweis`).
 */
import { formatDate, today } from '../../../shared/dates';
import { Icon } from '../../../shared/icons';
import { Card, CardHeader, EmptyState, Stat } from '../../../shared/ui';
import { useAnmeldung } from '../components/AnmeldeDialog';
import { stundenVon } from '../domain/nachweis';
import { angemeldet, eigeneLeistungen } from '../domain/rechte';
import { projektKurzname, type Projekt } from '../domain/types';
import { MONATSNAMEN, monatsanfang, monatsende, stundenText } from '../domain/zeitraum';
import type { Route } from '../lib/router';
import { useStore } from '../store/store';
import { useArchivierte } from '../../../gemeinsam/ProjektBereiche';

/** So viele eigene Leistungen nennt „Zuletzt erfasst“. */
const LETZTE = 8;

/** Markierte Projekte; ohne Markierung alle. */
export function sichtbareProjekte(projekte: Projekt[], archiviert: Set<string>): Projekt[] {
  const aktiv = projekte.filter((p) => !archiviert.has(p.id));
  const markiert = aktiv.filter((p) => p.markiert);
  return markiert.length > 0 ? markiert : aktiv;
}

export function Uebersicht({ navigate, onImport }: { navigate: (r: Route) => void; onImport: () => void }) {
  const { data } = useStore();
  const anmeldung = useAnmeldung();
  const ich = angemeldet(data);

  const projekte = sichtbareProjekte(data.projekte, useArchivierte('leistungsnachweise'));
  const heute = today();
  const anfang = monatsanfang(heute);
  const ende = monatsende(heute);
  const jahr = heute.slice(0, 4);
  const monat = MONATSNAMEN[Number(heute.slice(5, 7)) - 1];

  // Alle eigenen Leistungen, auch in nicht markierten Projekten
  const meine = eigeneLeistungen(data, data.leistungen);
  const meineImMonat = meine.filter((l) => l.datum >= anfang && l.datum <= ende);
  const meineImJahr = meine.filter((l) => l.datum.startsWith(jahr));
  const letzte = [...meine].sort((a, b) => b.datum.localeCompare(a.datum) || b.erfasst.localeCompare(a.erfasst)).slice(0, LETZTE);
  const alleMarkiert = data.projekte.filter((p) => p.markiert).length;
  const projektVon = new Map(data.projekte.map((p) => [p.id, p]));

  return (
    <div className="stack">
      <div className="row-between wrap">
        <p className="small muted" style={{ maxWidth: 620 }}>
          Hier erfassen Sie Ihre Leistungen – im Projekt von Hand oder aus der Zeiterfassung per Excel-Import; ein Import
          kann mehrere Projekte enthalten, übernommen werden nur die eigenen Zeilen der Datei. Leistungsnachweise erstellt
          und rechnet das Controlling ab.
        </p>
        <button type="button" className="btn btn-primary" onClick={onImport}>
          <Icon name="importieren" size={14} /> Excel-Import
        </button>
      </div>

      <div className="grid grid-4">
        <Stat
          wert={projekte.filter((p) => p.status === 'aktiv').length}
          label="Aktive Projekte"
          onClick={() => navigate({ view: 'projekte' })}
        />
        <Stat wert={ich ? stundenText(stundenVon(meineImMonat)) : '–'} label={`Meine Stunden ${monat}`} ton={ich ? 'blue' : ''} />
        <Stat wert={ich ? meineImMonat.length : '–'} label={`Meine Leistungen ${monat}`} />
        <Stat wert={ich ? stundenText(stundenVon(meineImJahr)) : '–'} label={`Meine Stunden ${jahr}`} />
      </div>

      {alleMarkiert === 0 ? (
        <p className="small tertiary">
          Kein Projekt markiert – es werden alle angezeigt. Unter <strong>Projekte</strong> lassen sich einzelne
          markieren; dann erscheinen nur diese hier und in der Seitenleiste.
        </p>
      ) : null}

      <Card>
        <CardHeader titel="Zuletzt erfasst" sub="Meine neuesten Leistungen – Klick öffnet das Projekt" />
        {!ich ? (
          <EmptyState
            icon="person"
            titel="Bitte anmelden"
            text="Leistungen erfasst, wer als Mitarbeiter angemeldet ist."
            action={
              <button type="button" className="btn btn-primary" onClick={() => anmeldung()}>
                Anmelden
              </button>
            }
          />
        ) : letzte.length === 0 ? (
          <EmptyState
            icon="stunden"
            titel="Noch keine eigenen Leistungen"
            text="Öffnen Sie ein Projekt und erfassen Sie dort Ihre Leistungen – oder übernehmen Sie sie per Excel-Import."
          />
        ) : (
          <div className="table-scroll">
            <table className="table table-stack">
              <thead>
                <tr>
                  <th>Datum</th>
                  <th>Projekt</th>
                  <th>Leistungstext</th>
                  <th className="ln-stunden">Stunden</th>
                </tr>
              </thead>
              <tbody>
                {letzte.map((l) => {
                  const projekt = projektVon.get(l.projektId);
                  return (
                    <tr key={l.id} className="clickable" onClick={() => navigate({ view: 'projekt', projektId: l.projektId })}>
                      <td>{formatDate(l.datum)}</td>
                      <td className="small">
                        <span className="num tertiary">{projekt?.nummer}</span>
                        <div>{projekt ? projektKurzname(projekt) : '–'}</div>
                      </td>
                      <td className="small">{l.text || <span className="tertiary">ohne Text</span>}</td>
                      <td className="ln-stunden">{stundenText(l.stunden)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader titel="Projekte" sub={`Meine Stunden je Projekt – im ${monat}`} />
        {projekte.length === 0 ? (
          <EmptyState
            icon="projekt"
            titel="Kein Projekt"
            text="Übernehmen Sie unter „Projekte“ ein Projekt aus einem anderen Bereich – oder Leistungen per Excel-Import; unbekannte Projekte legt der Import an."
          />
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Projekt</th>
                  <th className="col-optional ln-spalte-weit">Leistungsbereich</th>
                  <th className="zahl">Meine Stunden {monat}</th>
                  <th className="col-optional">Zuletzt erfasst</th>
                  <th className="actions" />
                </tr>
              </thead>
              <tbody>
                {projekte.map((projekt) => {
                  const eigene = meine.filter((l) => l.projektId === projekt.id);
                  const stunden = stundenVon(eigene.filter((l) => l.datum >= anfang && l.datum <= ende));
                  const zuletzt = eigene.reduce((m, l) => (l.datum > m ? l.datum : m), '');
                  return (
                    <tr key={projekt.id} className="clickable" onClick={() => navigate({ view: 'projekt', projektId: projekt.id })}>
                      <td>
                        <span className="num tertiary">{projekt.nummer}</span>
                        <div>
                          <strong>{projekt.name}</strong>
                        </div>
                      </td>
                      <td className="small muted col-optional ln-spalte-weit">{projekt.leistungsbereich || '–'}</td>
                      <td className={`zahl ${stunden ? '' : 'leer'}`}>{stundenText(stunden)}</td>
                      <td className="small col-optional">{zuletzt ? formatDate(zuletzt) : <span className="tertiary">–</span>}</td>
                      <td className="actions">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate({ view: 'projekt', projektId: projekt.id });
                          }}
                        >
                          Leistungen <Icon name="chevron" size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
