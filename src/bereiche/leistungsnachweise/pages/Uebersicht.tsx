/**
 * Startseite des Bereichs – hier geht es nur um die eigenen Leistungen:
 * Kennzahlen der angemeldeten Person (Stunden und Leistungen im laufenden
 * Monat, Stunden im Jahr), der Kalender „Mein Kalender“ über alle Projekte
 * (Tag anklicken erfasst dort eine Leistung, das Projekt wählt der Dialog;
 * eine Leistung anklicken bearbeitet sie), die zuletzt erfassten eigenen
 * Leistungen und die Projekte mit den eigenen Stunden im Monat. Angezeigt werden die markierten
 * Projekte – auch die in anderen Bereichen markierten (`istMarkiert`); ohne Markierung alle. Leistungsnachweise, Abschluss und Abrechnung
 * liegen im Controlling. Ohne Anmeldung steht darüber der Hinweis zum
 * Anmelden (App.tsx, `AnmeldeHinweis`).
 */
import { useState } from 'react';
import { formatDate, today } from '../../../shared/dates';
import { Icon } from '../../../shared/icons';
import { Card, CardHeader, EmptyState, Stat } from '../../../shared/ui';
import { useAnmeldung, useMitAnmeldung } from '../components/AnmeldeDialog';
import { LeistungDialog } from '../components/LeistungDialog';
import { LeistungsKalender } from '../components/LeistungsKalender';
import { stundenVon } from '../domain/nachweis';
import { angemeldet, eigeneLeistungen } from '../domain/rechte';
import { projektKurzname, type ISODate, type Leistung, type Projekt } from '../domain/types';
import { MONATSNAMEN, monatsanfang, monatsende, stundenText } from '../domain/zeitraum';
import type { Route } from '../lib/router';
import { useStore } from '../store/store';
import { useArchivierte, useMarkiertAnderswo } from '../../../gemeinsam/ProjektBereiche';

/** So viele eigene Leistungen nennt „Zuletzt erfasst“. */
const LETZTE = 8;

/**
 * Ist das Projekt markiert – hier oder in einem anderen Bereich? Was ein
 * anderer Bereich mit ★ markiert, gilt hier von selbst (`useMarkiertAnderswo`).
 */
export const istMarkiert = (p: Projekt, anderswo: Map<string, string[]>) => p.markiert || anderswo.has(p.id);

/** Markierte Projekte (auch die in anderen Bereichen markierten); ohne Markierung alle. */
export function sichtbareProjekte(projekte: Projekt[], archiviert: Set<string>, anderswo: Map<string, string[]>): Projekt[] {
  const aktiv = projekte.filter((p) => !archiviert.has(p.id));
  const markiert = aktiv.filter((p) => istMarkiert(p, anderswo));
  return markiert.length > 0 ? markiert : aktiv;
}

export function Uebersicht({ navigate, onImport }: { navigate: (r: Route) => void; onImport: () => void }) {
  const { data } = useStore();
  const anmeldung = useAnmeldung();
  const mitAnmeldung = useMitAnmeldung();
  const ich = angemeldet(data);
  const [dialog, setDialog] = useState<{ leistung?: Leistung; datum?: ISODate } | null>(null);

  const archiviert = useArchivierte('leistungsnachweise');
  const anderswo = useMarkiertAnderswo('leistungsnachweise');
  const projekte = sichtbareProjekte(data.projekte, archiviert, anderswo);
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
  const alleMarkiert = data.projekte.filter((p) => istMarkiert(p, anderswo)).length;
  const projektVon = new Map(data.projekte.map((p) => [p.id, p]));

  // Projekte zur Wahl beim Erfassen aus dem Kalender: alle nicht archivierten; vorgewählt ist das
  // Projekt der zuletzt erfassten eigenen Leistung, sonst das erste angezeigte
  const auswahl = data.projekte
    .filter((p) => !archiviert.has(p.id))
    .sort((a, b) => a.nummer.localeCompare(b.nummer, 'de', { numeric: true }) || a.name.localeCompare(b.name, 'de'));
  const zuletztProjekt = [...meine].sort((a, b) => b.erfasst.localeCompare(a.erfasst))[0]?.projektId;
  const vorgabeProjekt =
    auswahl.find((p) => p.id === zuletztProjekt) ?? projekte.find((p) => auswahl.includes(p)) ?? auswahl[0];
  const projektKurz = (id: string) => {
    const p = projektVon.get(id);
    return p ? p.nummer || projektKurzname(p) : '?';
  };

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

      {vorgabeProjekt ? (
        <LeistungsKalender
          titel="Mein Kalender"
          leistungen={meine}
          projektKurz={projektKurz}
          onNeu={(datum) => mitAnmeldung(() => setDialog({ datum }))}
          onOeffnen={(leistung) => setDialog({ leistung })}
        />
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
            text="Alle Projekte der anderen Bereiche und des Controllings stehen hier von selbst – markieren Sie unter „Projekte“ mit ★, woran Sie arbeiten. Unbekannte Projekte legt auch der Excel-Import an."
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

      {dialog && vorgabeProjekt ? (
        <LeistungDialog
          key={dialog.leistung?.id ?? `neu-${dialog.datum ?? ''}`}
          projektId={dialog.leistung?.projektId ?? vorgabeProjekt.id}
          leistung={dialog.leistung}
          vorgabeDatum={dialog.datum}
          projektAuswahl={dialog.leistung ? undefined : auswahl}
          onClose={() => setDialog(null)}
        />
      ) : null}
    </div>
  );
}
