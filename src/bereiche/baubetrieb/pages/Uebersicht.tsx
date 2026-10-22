/**
 * Startseite des Bereichs: Kennzahlen, anstehende Terminfristen, Anmeldebedarf
 * aus den Projekthüllen und die Projekthüllen nach Phasen. Angezeigt werden
 * die markierten Projekthüllen.
 */
import { useState } from 'react';
import { formatDate, relativeLabel } from '../../../shared/dates';
import { Icon } from '../../../shared/icons';
import { Card, CardHeader, EmptyState, Stat } from '../../../shared/ui';
import { AmpelPunkt, NachfolgerAuswahl, StatusBadge, TerminZelle } from '../components/common';
import { StatusWechselDialog } from '../components/StatusWechselDialog';
import { faelligerBedarf, offeneTermine } from '../domain/fristen';
import { PHASEN, RIL_LABEL, type Anmeldung, type Projekt, type StatusCode } from '../domain/types';
import { statusDef } from '../domain/workflow';
import type { Route } from '../lib/router';
import { useStore } from '../store/store';

/** Markierte Projekthüllen; ohne Markierung alle. */
export function sichtbareProjekte(projekte: Projekt[]): Projekt[] {
  const markiert = projekte.filter((p) => p.markiert);
  return markiert.length > 0 ? markiert : projekte;
}

/** So viele Terminfristen zeigt die Übersicht; alle stehen unter „Termine“. */
const ANZAHL_TERMINE = 8;

export function Uebersicht({ navigate }: { navigate: (r: Route) => void }) {
  const { data } = useStore();
  const [wechsel, setWechsel] = useState<{ anmeldung: Anmeldung; nach: StatusCode } | null>(null);
  const projekte = sichtbareProjekte(data.projekte);
  const ids = projekte.map((p) => p.id);
  const anmeldungen = data.anmeldungen.filter((a) => ids.includes(a.projektId));
  const termine = offeneTermine(data, ids);
  const ueberfaellig = termine.filter((t) => t.ampel === 'ueberfaellig');
  const faellig = termine.filter((t) => t.ampel === 'faellig');
  const nachhaken = termine.filter((t) => t.frist.nachhaken && t.ampel !== 'geplant');
  const bedarf = faelligerBedarf(data, ids);
  const vorn = termine.slice(0, ANZAHL_TERMINE);
  const alleMarkiert = data.projekte.filter((p) => p.markiert).length;

  return (
    <div className="stack">
      <div className="grid grid-4">
        <Stat wert={anmeldungen.length} label="Anmeldungen" onClick={() => navigate({ view: 'projekte' })} />
        <Stat
          wert={ueberfaellig.length}
          label="Terminfristen überfällig"
          ton={ueberfaellig.length ? 'red' : 'green'}
          onClick={() => navigate({ view: 'termine' })}
        />
        <Stat
          wert={faellig.length}
          label="Demnächst fällig"
          ton={faellig.length ? 'orange' : ''}
          onClick={() => navigate({ view: 'termine' })}
        />
        <Stat
          wert={nachhaken.length + bedarf.length}
          label="Nachhaken & Anmeldebedarf"
          ton="blue"
          onClick={() => navigate({ view: 'termine' })}
        />
      </div>

      {alleMarkiert === 0 ? (
        <p className="small tertiary">
          Keine Projekthülle markiert – es werden alle angezeigt. Unter <strong>Projekthüllen</strong> lassen sich
          einzelne markieren; dann erscheinen nur diese hier und in der Seitenleiste.
        </p>
      ) : null}

      <Card>
        <CardHeader
          titel="Anstehende Terminfristen"
          sub="Je Anmeldung die Frist im aktuellen Status – Überfälliges zuerst"
          actions={
            termine.length > ANZAHL_TERMINE ? (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate({ view: 'termine' })}>
                Alle {termine.length} <Icon name="chevron" size={13} />
              </button>
            ) : null
          }
        />
        {vorn.length === 0 ? (
          <EmptyState icon="check" titel="Nichts offen" text="Keine Anmeldung hat derzeit eine Terminfrist." />
        ) : (
          <div className="table-scroll">
            <table className="table table-stack">
              <thead>
                <tr>
                  <th className="col-optional" style={{ width: 22 }} />
                  <th>Anmeldung</th>
                  <th className="col-optional">Projekthülle</th>
                  <th>Status</th>
                  <th>Terminfrist</th>
                  <th className="actions" />
                </tr>
              </thead>
              <tbody>
                {vorn.map((t) => (
                  <tr
                    key={t.anmeldung.id}
                    className="clickable"
                    onClick={() =>
                      navigate({ view: 'anmeldung', projektId: t.projekt.id, anmeldungId: t.anmeldung.id })
                    }
                  >
                    <td className="col-optional">
                      <AmpelPunkt ampel={t.ampel} />
                    </td>
                    <td>
                      <strong>{t.anmeldung.anmeldeId || 'ohne ID'}</strong>
                      <div className="small tertiary">
                        {[t.anmeldung.art, t.anmeldung.gewerk].filter(Boolean).join(' · ')}
                      </div>
                    </td>
                    <td className="small muted col-optional">{t.projekt.name}</td>
                    <td>
                      <StatusBadge code={t.anmeldung.status} />
                      {t.frist.nachhaken ? <div className="small tertiary">zum Nachhaken</div> : null}
                    </td>
                    <td>
                      <TerminZelle frist={t.frist} />
                    </td>
                    <td className="actions" onClick={(e) => e.stopPropagation()}>
                      <NachfolgerAuswahl
                        code={t.anmeldung.status}
                        onWaehle={(nach) => setWechsel({ anmeldung: t.anmeldung, nach })}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {bedarf.length > 0 ? (
        <Card>
          <CardHeader
            titel="Anmeldebedarf aus den Projekthüllen"
            sub={`Fristen laut Richtlinie in den nächsten ${data.einstellungen.bedarfVorschauTage} Tagen, für die noch kein Eintrag besteht`}
          />
          {bedarf.map(({ projekt, zelle }) => (
            <div
              key={`${projekt.id}-${zelle.fahrplanjahr}-${zelle.phase}`}
              className="list-row clickable"
              onClick={() => navigate({ view: 'projekt', projektId: projekt.id })}
            >
              <Icon name="kalender" size={16} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong>
                  {RIL_LABEL[zelle.phase]} für Fahrplanjahr {zelle.fahrplanjahr}
                </strong>
                <div className="small tertiary">{projekt.name}</div>
              </div>
              <span className="small">
                bis <b>{formatDate(zelle.frist)}</b>
                <div className="tertiary small">{relativeLabel(zelle.frist)}</div>
              </span>
            </div>
          ))}
        </Card>
      ) : null}

      <Card>
        <CardHeader titel="Projekthüllen" sub="Anmeldungen je Phase und Fristenlage" />
        {projekte.length === 0 ? (
          <EmptyState icon="projekt" titel="Keine Projekthülle" text="Legen Sie unter „Projekthüllen“ eine an." />
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Projekthülle</th>
                  {PHASEN.map((p) => (
                    <th key={p.id} className="zahl">
                      {p.kurz}
                    </th>
                  ))}
                  <th className="zahl">Überfällig</th>
                  <th>Nächste Frist</th>
                </tr>
              </thead>
              <tbody>
                {projekte.map((p) => {
                  const eigene = data.anmeldungen.filter((a) => a.projektId === p.id);
                  const eigeneTermine = termine.filter((t) => t.projekt.id === p.id);
                  const spaet = eigeneTermine.filter((t) => t.ampel === 'ueberfaellig').length;
                  const naechste = eigeneTermine.find((t) => t.ampel !== 'ueberfaellig');
                  return (
                    <tr key={p.id} className="clickable" onClick={() => navigate({ view: 'projekt', projektId: p.id })}>
                      <td>
                        <span className="num tertiary">{p.dbGNummer}</span>
                        <div>
                          <strong>{p.name}</strong>
                        </div>
                      </td>
                      {PHASEN.map((ph) => {
                        const n = eigene.filter((a) => statusDef(a.status).phase === ph.id).length;
                        return (
                          <td key={ph.id} className={`zahl ${n ? '' : 'leer'}`}>
                            {n}
                          </td>
                        );
                      })}
                      <td
                        className={`zahl ${spaet ? '' : 'leer'}`}
                        style={{ color: spaet ? 'var(--red)' : undefined }}
                      >
                        {spaet}
                      </td>
                      <td className="small">
                        {naechste ? (
                          <>
                            {formatDate(naechste.frist.datum)}
                            <div className="tertiary small">{naechste.anmeldung.anmeldeId || naechste.status.name}</div>
                          </>
                        ) : (
                          <span className="tertiary">–</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {wechsel ? (
        <StatusWechselDialog anmeldung={wechsel.anmeldung} nach={wechsel.nach} onClose={() => setWechsel(null)} />
      ) : null}
    </div>
  );
}
