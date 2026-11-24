/**
 * Startseite des Bereichs: Kennzahlen – aktive Projekte und die eigene
 * To-Do-Liste (offen, überfällig, demnächst fällig; ein Klick führt in die
 * Liste) – und die Projekte mit ihren Besprechungen und den offenen Aufgaben der
 * To-Do-Liste. Angezeigt werden die markierten Projekte; ohne Markierung alle.
 * Die Aufgaben selbst stehen in der To-Do-Liste, die der Protokolle im Protokoll.
 */
import { formatDate, today } from '../../../shared/dates';
import { Icon } from '../../../shared/icons';
import { Card, CardHeader, EmptyState, Stat } from '../../../shared/ui';
import { reihenVon } from '../domain/protokoll';
import { todoAmpel } from '../domain/todos';
import type { Projekt } from '../domain/types';
import type { Route } from '../lib/router';
import { useStore } from '../store/store';
import { useArchivierte } from '../../../gemeinsam/ProjektBereiche';

/** Markierte Projekte; ohne Markierung alle. */
export function sichtbareProjekte(projekte: Projekt[], archiviert: Set<string>): Projekt[] {
  const aktiv = projekte.filter((p) => !archiviert.has(p.id));
  const markiert = aktiv.filter((p) => p.markiert);
  return markiert.length > 0 ? markiert : aktiv;
}

export function Uebersicht({ navigate }: { navigate: (r: Route) => void }) {
  const { data } = useStore();
  const archiviert = useArchivierte('projektsteuerung');
  const projekte = sichtbareProjekte(data.projekte, archiviert);
  const heute = today();
  // Meine To-Dos: die offenen Aufgaben der To-Do-Liste – alle, wie „Offen“ in der Liste
  const offen = data.todos.filter((t) => t.status !== 'erledigt');
  const ueberfaellig = offen.filter((t) => todoAmpel(t, heute) === 'ueberfaellig').length;
  const faellig = offen.filter((t) => todoAmpel(t, heute) === 'faellig').length;
  // Hinweis „Kein Projekt markiert“ nach derselben Regel wie sichtbareProjekte: Markierte archivierte zählen nicht
  const aktive = data.projekte.filter((p) => !archiviert.has(p.id));
  const keinesMarkiert = aktive.length > 0 && !aktive.some((p) => p.markiert);

  return (
    <div className="stack">
      <div className="grid grid-4">
        <Stat
          wert={projekte.filter((p) => p.status === 'aktiv').length}
          label="Aktive Projekte"
          onClick={() => navigate({ view: 'projekte' })}
        />
        <Stat wert={offen.length} label="Meine To-Dos" ton="blue" onClick={() => navigate({ view: 'todos' })} />
        <Stat
          wert={ueberfaellig}
          label="Überfällig"
          ton={ueberfaellig ? 'red' : 'green'}
          onClick={() => navigate({ view: 'todos', filter: 'faellig' })}
        />
        <Stat
          wert={faellig}
          label="Demnächst fällig"
          ton={faellig ? 'orange' : ''}
          onClick={() => navigate({ view: 'todos', filter: 'faellig' })}
        />
      </div>

      {keinesMarkiert ? (
        <p className="small tertiary">
          Kein Projekt markiert – es werden alle angezeigt. Unter <strong>Projekte</strong> lassen sich einzelne
          markieren; dann erscheinen nur diese hier und in der Seitenleiste.
        </p>
      ) : null}

      <Card>
        <CardHeader titel="Projekte" sub="Beteiligte, Besprechungen und offene To-Dos der To-Do-Liste je Projekt" />
        {projekte.length === 0 ? (
          <EmptyState icon="projekt" titel="Kein Projekt" text="Legen Sie unter „Projekte“ ein Projekt an." />
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Projekt</th>
                  <th className="zahl col-optional">Beteiligte</th>
                  <th className="zahl col-optional">Protokolle</th>
                  <th className="col-optional">Letzte Besprechung</th>
                  <th>Nächster Termin</th>
                  <th className="zahl">To-Dos</th>
                  <th className="zahl">Überfällig</th>
                  <th className="actions" />
                </tr>
              </thead>
              <tbody>
                {projekte.map((projekt) => {
                  const protokolle = data.protokolle.filter((x) => x.projektId === projekt.id);
                  const vergangen = protokolle.filter((x) => x.datum <= heute).sort((a, b) => b.datum.localeCompare(a.datum));
                  // Nächster Termin: das nächste angesetzte Protokoll oder der „Nächste Termin“ der Reihen
                  const kuenftig = [
                    ...protokolle.filter((x) => x.datum > heute).map((x) => x.datum),
                    ...reihenVon(protokolle)
                      .map((r) => r.letztes.naechster)
                      .filter((d) => d && d >= heute),
                  ].sort();
                  const letzte = vergangen[0];
                  const punkte = offen.filter((t) => t.projektId === projekt.id);
                  const spaet = punkte.filter((t) => todoAmpel(t, heute) === 'ueberfaellig').length;
                  const beteiligte = data.beteiligte.filter((b) => b.projektId === projekt.id).length;
                  return (
                    <tr
                      key={projekt.id}
                      className="clickable"
                      onClick={() => navigate({ view: 'projekt', projektId: projekt.id, tab: 'beteiligte' })}
                    >
                      <td>
                        <span className="num tertiary">{projekt.nummer}</span>
                        <div>
                          <strong>{projekt.name}</strong>
                        </div>
                      </td>
                      <td className={`zahl col-optional ${beteiligte ? '' : 'leer'}`}>{beteiligte}</td>
                      <td className={`zahl col-optional ${protokolle.length ? '' : 'leer'}`}>{protokolle.length}</td>
                      <td className="small col-optional">
                        {letzte ? (
                          <>
                            {formatDate(letzte.datum)}
                            <div className="tertiary small">
                              {letzte.art} Nr. {letzte.nr}
                            </div>
                          </>
                        ) : (
                          <span className="tertiary">–</span>
                        )}
                      </td>
                      <td className="small">{kuenftig[0] ? formatDate(kuenftig[0]) : <span className="tertiary">–</span>}</td>
                      <td className={`zahl ${punkte.length ? '' : 'leer'}`}>{punkte.length}</td>
                      <td className={`zahl ${spaet ? '' : 'leer'}`} style={{ color: spaet ? 'var(--rot-text)' : undefined }}>
                        {spaet}
                      </td>
                      <td className="actions">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate({ view: 'projekt', projektId: projekt.id, tab: 'protokolle' });
                          }}
                        >
                          Protokolle <Icon name="chevron" size={13} />
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
