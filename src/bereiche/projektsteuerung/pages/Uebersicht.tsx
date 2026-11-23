/**
 * Startseite des Bereichs: Kennzahlen, die eigenen To-Dos – offene Aufgaben
 * der Protokolle für die angemeldete Person („Angemeldet als“) – nach
 * Dringlichkeit, die fälligen Aufgaben der eigenen To-Do-Liste und die
 * Projekte mit ihren Besprechungen. Angezeigt werden die markierten Projekte;
 * ohne Markierung alle. Erledigt wird mit dem kleinen Haken
 * (`ErledigtHaken`); die Zeile bleibt danach noch kurz stehen (`useNachlauf`).
 */
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { listenEintrag } from '../../../shared/bewegung';
import { formatDate, relativeLabel, today } from '../../../shared/dates';
import { Icon } from '../../../shared/icons';
import { useToast } from '../../../shared/toast';
import { Card, CardHeader, EmptyState, Segmented, Stat } from '../../../shared/ui';
import { AmpelBadge, AmpelPunkt } from '../components/common';
import { ErledigtHaken, useNachlauf } from '../components/erledigen';
import { reihenVon } from '../domain/protokoll';
import { allePunkte, ampelFuer, angemeldetBeteiligt, nachDringlichkeit, type Punkt } from '../domain/punkte';
import type { Projekt } from '../domain/types';
import type { Route } from '../lib/router';
import { useStore } from '../store/store';
import { FaelligeTodos } from './Todos';
import { useArchivierte } from '../../../gemeinsam/ProjektBereiche';

/** Markierte Projekte; ohne Markierung alle. */
export function sichtbareProjekte(projekte: Projekt[], archiviert: Set<string>): Projekt[] {
  const aktiv = projekte.filter((p) => !archiviert.has(p.id));
  const markiert = aktiv.filter((p) => p.markiert);
  return markiert.length > 0 ? markiert : aktiv;
}

/** So viele Punkte zeigt die Übersicht zunächst. */
const ANZAHL_PUNKTE = 10;

type Filter = 'alle' | 'ueberfaellig' | 'faellig';

/** Ziel eines Punkts: das Protokoll der Aufgabe. */
export function punktZiel(p: Punkt): Route {
  return { view: 'protokoll', projektId: p.projekt.id, protokollId: p.protokollId };
}

export function Uebersicht({ navigate }: { navigate: (r: Route) => void }) {
  const { data, punktErledigen } = useStore();
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>('alle');
  const [alle, setAlle] = useState(false);
  const nachlauf = useNachlauf();
  const heute = today();

  const archiviert = useArchivierte('projektsteuerung');
  const projekte = sichtbareProjekte(data.projekte, archiviert);
  const ids = projekte.map((p) => p.id);
  // Eigene Aufgaben (wie eigeneTodos); eben erledigte bleiben kurz an ihrem Platz – mit
  // der Ampel, die sie offen hätten, damit Filter und Reihenfolge sie dort lassen
  const eigene = allePunkte(data, ids).filter((p) => p.eigen);
  const offen = eigene.filter((p) => p.status !== 'erledigt');
  const ueberfaellig = offen.filter((p) => p.ampel === 'ueberfaellig');
  const faellig = offen.filter((p) => p.ampel === 'faellig');
  const ampelOffen = (p: Punkt) => (p.status === 'erledigt' ? ampelFuer(p.termin, 'offen', heute) : p.ampel);
  const gefiltert = eigene
    .filter((p) => p.status !== 'erledigt' || nachlauf.hat(p.schluessel))
    .filter((p) => filter === 'alle' || ampelOffen(p) === (filter === 'ueberfaellig' ? 'ueberfaellig' : 'faellig'))
    .sort((a, b) => nachDringlichkeit({ ...a, ampel: ampelOffen(a) }, { ...b, ampel: ampelOffen(b) }));
  const sichtbar = alle ? gefiltert : gefiltert.slice(0, ANZAHL_PUNKTE);
  // Hinweis „Kein Projekt markiert“ nach derselben Regel wie sichtbareProjekte: Markierte archivierte zählen nicht
  const aktive = data.projekte.filter((p) => !archiviert.has(p.id));
  const keinesMarkiert = aktive.length > 0 && !aktive.some((p) => p.markiert);
  const ich = data.einstellungen.bearbeiter;

  return (
    <div className="stack">
      <div className="grid grid-4">
        <Stat
          wert={projekte.filter((p) => p.status === 'aktiv').length}
          label="Aktive Projekte"
          onClick={() => navigate({ view: 'projekte' })}
        />
        <Stat wert={offen.length} label="Meine To-Dos" ton="blue" onClick={() => setFilter('alle')} />
        <Stat
          wert={ueberfaellig.length}
          label="Überfällig"
          ton={ueberfaellig.length ? 'red' : 'green'}
          onClick={() => setFilter('ueberfaellig')}
        />
        <Stat
          wert={faellig.length}
          label="Demnächst fällig"
          ton={faellig.length ? 'orange' : ''}
          onClick={() => setFilter('faellig')}
        />
      </div>

      {keinesMarkiert ? (
        <p className="small tertiary">
          Kein Projekt markiert – es werden alle angezeigt. Unter <strong>Projekte</strong> lassen sich einzelne
          markieren; dann erscheinen nur diese hier und in der Seitenleiste.
        </p>
      ) : null}

      {projekte.length > 0 && !angemeldetBeteiligt(data, ids) ? (
        <p className="small tertiary">
          „{ich}“ steht in keiner Projektbeteiligtenliste der angezeigten Projekte. Eigene To-Dos erkennt KaPlan am
          Namen unter <strong>Angemeldet als</strong> (unten in der Seitenleiste) – bitte so eintragen, wie er in der
          Projektbeteiligtenliste steht.
        </p>
      ) : null}

      <Card>
        <CardHeader
          titel="Meine To-Dos"
          sub={`Offene Aufgaben aus den Protokollen für ${ich} – Überfälliges zuerst`}
          actions={
            <Segmented<Filter>
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'alle', label: `Alle (${offen.length})` },
                { value: 'ueberfaellig', label: `Überfällig (${ueberfaellig.length})` },
                { value: 'faellig', label: `Fällig (${faellig.length})` },
              ]}
            />
          }
        />
        {gefiltert.length === 0 ? (
          <EmptyState
            icon="check"
            titel="Nichts offen"
            text="Für diese Auswahl liegt keine Aufgabe bei Ihnen. Eigene To-Dos sind Aufgaben, deren Verantwortlich Ihr Kürzel oder Ihren Namen nennt."
          />
        ) : (
          <div className="table-scroll">
            <table className="table table-stack">
              <thead>
                <tr>
                  <th className="col-optional" style={{ width: 22 }} />
                  <th>Punkt</th>
                  <th>Verantwortlich</th>
                  <th className="col-optional">Projekt</th>
                  <th>Termin</th>
                  <th>Status</th>
                  <th className="actions" />
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {sichtbar.map((p) => (
                    <motion.tr
                      key={p.schluessel}
                      {...listenEintrag}
                      className="clickable"
                      onClick={() => navigate(punktZiel(p))}
                    >
                      <td className="col-optional">
                        <AmpelPunkt ampel={p.ampel} />
                      </td>
                      <td style={{ maxWidth: 460 }}>
                        <div
                          className={`ps-zweizeilig transition-colors duration-300 ${p.status === 'erledigt' ? 'text-gedaempft line-through' : ''}`}
                        >
                          {p.text || <span className="tertiary">ohne Text</span>}
                        </div>
                        <div className="small tertiary">{p.fundstelle}</div>
                      </td>
                      <td className="small">{p.wer || <span className="tertiary">–</span>}</td>
                      <td className="small muted col-optional">
                        {p.projekt.nummer} {p.projekt.name}
                      </td>
                      <td className="small">
                        {p.termin ? formatDate(p.termin) : <span className="tertiary">ohne Termin</span>}
                        {p.termin ? <div className="tertiary small">{relativeLabel(p.termin)}</div> : null}
                      </td>
                      <td>
                        <AmpelBadge ampel={p.ampel} />
                      </td>
                      <td className="actions">
                        <ErledigtHaken
                          erledigt={p.status === 'erledigt'}
                          text={p.text}
                          onUmschalten={() => {
                            const erledigt = p.status !== 'erledigt';
                            punktErledigen(p, erledigt);
                            nachlauf.merken(p.schluessel);
                            toast(erledigt ? `${p.fundstelle} als erledigt markiert.` : `${p.fundstelle} wieder offen.`);
                          }}
                        />
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
        {gefiltert.length > ANZAHL_PUNKTE ? (
          <div className="card-pad" style={{ paddingTop: 10, paddingBottom: 10 }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAlle((a) => !a)}>
              {alle ? 'Weniger anzeigen' : `Alle ${gefiltert.length} anzeigen`}
            </button>
          </div>
        ) : null}
      </Card>

      <FaelligeTodos onZurListe={() => navigate({ view: 'todos' })} />

      <Card>
        <CardHeader titel="Projekte" sub="Beteiligte, Besprechungen und eigene To-Dos je Projekt" />
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
                  const punkte = offen.filter((x) => x.projekt.id === projekt.id);
                  const spaet = punkte.filter((x) => x.ampel === 'ueberfaellig').length;
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
