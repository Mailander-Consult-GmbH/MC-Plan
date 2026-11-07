/**
 * Startseite des Bereichs – hier geht es nur um die eigenen Leistungen:
 * Kennzahlen der angemeldeten Person (Stunden und Leistungen im laufenden
 * Monat, Stunden im Jahr), der Kalender „Mein Kalender“ über alle Projekte
 * (Tag anklicken erfasst dort eine Leistung, das Projekt wählt der Dialog;
 * eine Leistung anklicken bearbeitet sie), die offenen Bestätigungen (je
 * Projekt und Monat mit eigenen Leistungen, die noch nicht bzw. nach einer
 * Änderung nicht erneut bestätigt sind, `offeneBestaetigungen`; ein Klick
 * öffnet die Leistungstexte des Projekts in diesem Monat), die zuletzt
 * erfassten eigenen Leistungen und die Projekte mit den eigenen Stunden im
 * Monat. Angezeigt werden die markierten
 * Projekte – auch die in anderen Bereichen markierten (`istMarkiert`); ist kein
 * nicht archiviertes markiert, alle. Steht kein Projekt zur Wahl, sagt ein
 * Hinweis über dem Kalender, woher Projekte kommen – bzw., wenn alle archiviert
 * sind, dass sich im archivierten Projekt selbst (Projekte › Archiv) weiterhin
 * erfassen lässt. Leistungsnachweise, Abschluss und Abrechnung
 * liegen im Controlling. Ist niemand angemeldet (Name ohne Nachnamen,
 * ausgeschiedener Mitarbeiter), steht darüber der Hinweis dazu (App.tsx,
 * `AnmeldeHinweis`); „Leistung erfassen“ nennt ihn als Kurzmeldung.
 */
import { useState } from 'react';
import { formatDate, today } from '../../../shared/dates';
import { Icon } from '../../../shared/icons';
import { useToast } from '../../../shared/toast';
import { Badge, Callout, Card, CardHeader, EmptyState, Stat } from '../../../shared/ui';
import { useMitAnmeldung } from '../components/Anmeldung';
import { LeistungDialog } from '../components/LeistungDialog';
import { LeistungsKalender } from '../components/LeistungsKalender';
import { monatName, monatsStatusBadge, offeneBestaetigungen } from '../domain/erfassung';
import { stundenVon } from '../domain/nachweis';
import { angemeldet, eigeneLeistungen } from '../domain/rechte';
import { projektKurzname, type ISODate, type Leistung, type Projekt } from '../domain/types';
import { MONATSNAMEN, monatsanfang, monatsende, stundenText } from '../domain/zeitraum';
import type { Route } from '../lib/router';
import { useStore } from '../store/store';
import { useArchivierte, useMarkiertAnderswo } from '../../../gemeinsam/ProjektBereiche';
import { anzahl } from '../components/common';
import '../components/erfassung.css';

/** So viele eigene Leistungen nennt „Zuletzt erfasst“. */
const LETZTE = 8;

/**
 * Ist das Projekt markiert – hier oder in einem anderen Bereich? Was ein
 * anderer Bereich mit ★ markiert, gilt hier von selbst (`useMarkiertAnderswo`).
 */
export const istMarkiert = (p: Projekt, anderswo: Map<string, string[]>) => p.markiert || anderswo.has(p.id);

/** Markierte Projekte (auch die in anderen Bereichen markierten); ist kein nicht archiviertes markiert, alle nicht archivierten. */
export function sichtbareProjekte(projekte: Projekt[], archiviert: Set<string>, anderswo: Map<string, string[]>): Projekt[] {
  const aktiv = projekte.filter((p) => !archiviert.has(p.id));
  const markiert = aktiv.filter((p) => istMarkiert(p, anderswo));
  return markiert.length > 0 ? markiert : aktiv;
}

export function Uebersicht({ navigate, onImport }: { navigate: (r: Route) => void; onImport: () => void }) {
  const { data } = useStore();
  const mitAnmeldung = useMitAnmeldung();
  const ich = angemeldet(data);
  const toast = useToast();
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
  // Hinweis „Kein Projekt markiert“ nach derselben Regel wie sichtbareProjekte: Markierte archivierte zählen nicht
  const aktive = data.projekte.filter((p) => !archiviert.has(p.id));
  const keinesMarkiert = aktive.length > 0 && !aktive.some((p) => istMarkiert(p, anderswo));
  const projektVon = new Map(data.projekte.map((p) => [p.id, p]));

  // Projekte zur Wahl beim Erfassen aus dem Kalender: alle nicht archivierten; vorgewählt ist das
  // Projekt der zuletzt erfassten eigenen Leistung, sonst das erste angezeigte
  const auswahl = [...aktive].sort((a, b) => a.nummer.localeCompare(b.nummer, 'de', { numeric: true }) || a.name.localeCompare(b.name, 'de'));
  const zuletztProjekt = [...meine].sort((a, b) => b.erfasst.localeCompare(a.erfasst))[0]?.projektId;
  const vorgabeProjekt =
    auswahl.find((p) => p.id === zuletztProjekt) ?? projekte.find((p) => auswahl.includes(p)) ?? auswahl[0];
  // Kein Projekt zur Wahl, obwohl es Projekte gibt: Sie sind alle im Bereich archiviert. Archivierte stehen hier
  // nicht zur Wahl; im archivierten Projekt selbst (Projekte › Archiv) lässt sich weiterhin erfassen
  const alleArchiviert = !vorgabeProjekt && data.projekte.length > 0;
  const projektKurz = (id: string) => {
    const p = projektVon.get(id);
    return p ? p.nummer || projektKurzname(p) : '?';
  };

  return (
    <div className="stack">
      <div className="row-between wrap">
        <p className="small muted" style={{ maxWidth: 620 }}>
          Hier erfassen Sie Ihre Leistungen – im Projekt von Hand oder aus der Zeiterfassung per Excel-Import; ein Import
          kann mehrere Projekte enthalten, übernommen werden nur die eigenen Zeilen der Datei. Im Projekt verfassen Sie
          danach unter „Leistungstexte“ je Zeitraum den gemeinsamen Text und bestätigen den Monat. Leistungsnachweise
          erstellt und rechnet das Controlling ab.
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

      {keinesMarkiert ? (
        <p className="small tertiary">
          Kein Projekt markiert – es werden alle angezeigt. Unter <strong>Projekte</strong> lassen sich einzelne
          markieren; dann erscheinen nur diese hier und in der Seitenleiste.
        </p>
      ) : null}

      {!vorgabeProjekt ? (
        <Callout icon="i">
          {alleArchiviert ? (
            <>
              Alle Projekte sind archiviert – hier in der Übersicht stehen sie deshalb nicht zur Wahl. Leistungen
              lassen sich weiterhin im archivierten Projekt erfassen (<strong>Projekte › Archiv</strong>); aus dem
              Archiv zurückholen kann sie das Controlling. Erfasste Leistungen bleiben im Kalender sichtbar.
            </>
          ) : (
            <>
              Es gibt noch kein Projekt, in dem Sie Leistungen erfassen können. Projekte legt das Controlling an;
              Projekte der anderen Bereiche erscheinen hier von selbst, unbekannte legt auch der Excel-Import an.
            </>
          )}
        </Callout>
      ) : null}

      <LeistungsKalender
        titel="Mein Kalender"
        leistungen={meine}
        projektKurz={projektKurz}
        onNeu={(datum) =>
          vorgabeProjekt
            ? mitAnmeldung(() => setDialog({ datum }))
            : toast(
                alleArchiviert
                  ? 'Kein Projekt zur Wahl – alle sind archiviert. Erfassen lässt sich im Projekt unter Projekte › Archiv.'
                  : 'Kein Projekt zum Erfassen – Projekte legt das Controlling an.',
              )
        }
        onOeffnen={(leistung) => setDialog({ leistung })}
      />

      {ich ? <OffeneBestaetigungen navigate={navigate} /> : null}

      <Card>
        <CardHeader titel="Zuletzt erfasst" sub="Meine neuesten Leistungen – Klick öffnet die Leistungstexte des Monats" />
        {!ich ? (
          <EmptyState
            icon="person"
            titel="Nicht als Mitarbeiter angemeldet"
            text="Leistungen erfasst, wer unter „Angemeldet als“ als Mitarbeiter geführt ist."
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
                    <tr
                      key={l.id}
                      className="clickable"
                      onClick={() => navigate({ view: 'projekt', projektId: l.projektId, monat: l.datum.slice(0, 7) })}
                    >
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
                          Leistungstexte <Icon name="chevron" size={13} />
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

      {dialog && (dialog.leistung || vorgabeProjekt) ? (
        <LeistungDialog
          key={dialog.leistung?.id ?? `neu-${dialog.datum ?? ''}`}
          projektId={dialog.leistung?.projektId ?? vorgabeProjekt?.id ?? ''}
          leistung={dialog.leistung}
          vorgabeDatum={dialog.datum}
          projektAuswahl={dialog.leistung ? undefined : auswahl}
          onClose={() => setDialog(null)}
        />
      ) : null}
    </div>
  );
}

/**
 * Offene Bestätigungen der angemeldeten Person über alle Projekte: je Projekt
 * und Monat mit eigenen Leistungen im Stand „offen“ bzw. „geändert seit
 * Bestätigung“ eine Zeile (`offeneBestaetigungen`, auch der laufende Monat);
 * ein Klick öffnet die Leistungstexte des Projekts in diesem Monat.
 */
function OffeneBestaetigungen({ navigate }: { navigate: (r: Route) => void }) {
  const { data } = useStore();
  const ich = angemeldet(data);
  if (!ich) return null;
  const offen = offeneBestaetigungen(data, ich.id);
  const projektVon = new Map(data.projekte.map((p) => [p.id, p]));
  const laufend = today().slice(0, 7);
  const oeffnen = (projektId: string, monat: string) => navigate({ view: 'projekt', projektId, monat });

  return (
    <Card>
      <CardHeader
        titel="Offene Bestätigungen"
        sub="Monate mit eigenen Leistungen, die Sie noch bestätigen – Klick öffnet die Leistungstexte"
      />
      {offen.length === 0 ? (
        <p className="small muted ln-ob-leer">Alle Monate mit eigenen Leistungen sind bestätigt bzw. abgerechnet.</p>
      ) : (
        <div className="table-scroll">
          <table className="table table-stack ln-ob-tabelle">
            <thead>
              <tr>
                <th>Projekt</th>
                <th>Monat</th>
                <th className="ln-stunden">Meine Stunden</th>
                <th>Status</th>
                <th className="actions" />
              </tr>
            </thead>
            <tbody>
              {offen.map((s) => {
                const projekt = projektVon.get(s.projektId);
                const badge = monatsStatusBadge(s);
                return (
                  <tr key={`${s.projektId}|${s.monat}`} className="clickable" onClick={() => oeffnen(s.projektId, s.monat)}>
                    <td>
                      <span className="num tertiary">{projekt?.nummer}</span>
                      <div>
                        <strong>{projekt ? projektKurzname(projekt) : '–'}</strong>
                      </div>
                    </td>
                    <td className="ln-ob-monat">
                      {monatName(s.monat)}
                      {s.monat === laufend ? <span className="ln-ob-zusatz">laufender Monat</span> : null}
                    </td>
                    <td className="ln-stunden">{stundenText(s.stunden)}</td>
                    <td>
                      <Badge ton={badge.ton}>{badge.text}</Badge>
                      {s.ohneText.length > 0 ? (
                        <span className="ln-ob-fehlt">{anzahl(s.ohneText.length, 'Zeitraum', 'Zeiträume')} ohne Leistungstext</span>
                      ) : null}
                    </td>
                    <td className="actions">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          oeffnen(s.projektId, s.monat);
                        }}
                      >
                        Leistungstexte <Icon name="chevron" size={13} />
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
  );
}
