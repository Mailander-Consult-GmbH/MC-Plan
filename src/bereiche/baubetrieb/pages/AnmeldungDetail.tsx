/**
 * Detailansicht einer Anmeldung: Weg durch die Phasen, aktueller Status mit
 * Terminfrist und den möglichen Nachfolgern, Merkmale und Statusverlauf.
 */
import { Fragment, useState } from 'react';
import { formatDate } from '../../../shared/dates';
import { Icon } from '../../../shared/icons';
import { useToast } from '../../../shared/toast';
import { Badge, Callout, Card, CardHeader, ConfirmDialog } from '../../../shared/ui';
import { AnmeldungDialog } from '../components/AnmeldungDialog';
import { AmpelBadge, NachhakenBadge, StatusBadge, nachfolgerText } from '../components/common';
import { StatusWechselDialog } from '../components/StatusWechselDialog';
import { NachhakenDialog, TerminDialog } from '../components/TerminDialoge';
import { letzterWechsel, verwandte } from '../domain/ablauf';
import { ampelFuer, bauzeitraumText, terminfrist } from '../domain/fristen';
import {
  ANNEX_VII_LABEL,
  PHASEN,
  PHASE_NAME,
  phaseMitFahrplanjahr,
  type Anmeldung,
  type Projekt,
  type StatusCode,
} from '../domain/types';
import { PHASEN_FOLGE, istAenderung, istUebernahme, statusDef } from '../domain/workflow';
import type { Route } from '../lib/router';
import { useStore } from '../store/store';

export function AnmeldungDetail({
  projekt,
  anmeldung,
  navigate,
}: {
  projekt: Projekt;
  anmeldung: Anmeldung;
  navigate: (r: Route) => void;
}) {
  const { data, deleteAnmeldung, statusZuruecknehmen } = useStore();
  const toast = useToast();
  const [wechsel, setWechsel] = useState<StatusCode | null>(null);
  const [bearbeiten, setBearbeiten] = useState(false);
  const [loeschen, setLoeschen] = useState(false);
  const [zuruecknehmen, setZuruecknehmen] = useState(false);
  const [nachhaken, setNachhaken] = useState(false);
  const [termin, setTermin] = useState(false);

  const def = statusDef(anmeldung.status);
  const frist = terminfrist(anmeldung, data.einstellungen);
  const ampel = ampelFuer(frist.datum, data.einstellungen.vorlaufTage);
  const letzter = letzterWechsel(anmeldung);
  const { herkunft, aufgeteilt } = verwandte(data, anmeldung);
  const zurProjekthuelle = () => navigate({ view: 'projekt', projektId: projekt.id });
  const oeffne = (a: Anmeldung) => navigate({ view: 'anmeldung', projektId: a.projektId, anmeldungId: a.id });

  // Phasen, die die Anmeldung schon durchlaufen hat
  const besucht = new Set(
    anmeldung.verlauf.flatMap((v) => [v.von, v.nach]).filter((c): c is StatusCode => !!c).map((c) => statusDef(c).phase),
  );
  const aktuellePhase = PHASEN_FOLGE.indexOf(def.phase);

  const imWorkflow = def.nachfolger.filter((n) => !istUebernahme(anmeldung.status, n) && n !== 'Z0');
  const uebernahmen = def.nachfolger.filter((n) => istUebernahme(anmeldung.status, n));
  const leiche = def.nachfolger.includes('Z0');

  return (
    <div className="stack">
      <div className="row-between wrap">
        <button type="button" className="btn btn-ghost" onClick={zurProjekthuelle}>
          <Icon name="zurueck" size={14} /> {projekt.name}
        </button>
        <div className="row wrap">
          <button type="button" className="btn btn-outline" onClick={() => setBearbeiten(true)}>
            <Icon name="bearbeiten" size={14} /> Bearbeiten
          </button>
          <button type="button" className="btn btn-danger" onClick={() => setLoeschen(true)}>
            <Icon name="loeschen" size={14} /> Löschen
          </button>
        </div>
      </div>

      <Card>
        <CardHeader
          titel={anmeldung.anmeldeId || 'Anmeldung ohne ID'}
          sub={`${anmeldung.art} · ${bauzeitraumText(anmeldung)}${anmeldung.gewerk ? ` · ${anmeldung.gewerk}` : ''}`}
          actions={<StatusBadge code={anmeldung.status} />}
        />
        <div className="card-pad">
          <div className="chain">
            {PHASEN.map((p, i) => {
              const index = PHASEN_FOLGE.indexOf(p.id);
              const aktuell = p.id === def.phase;
              const erledigt = !aktuell && besucht.has(p.id) && index < aktuellePhase;
              return (
                <Fragment key={p.id}>
                  {i > 0 ? <div className="chain-arrow">›</div> : null}
                  <div className={`chain-node ${aktuell ? 'current' : erledigt ? 'done' : ''}`}>
                    <div className="cn-name">{p.name}</div>
                    <div className="cn-meta">
                      {aktuell ? `${def.code} · ${def.name}` : erledigt ? 'durchlaufen' : besucht.has(p.id) ? 'zuvor besucht' : '–'}
                    </div>
                  </div>
                </Fragment>
              );
            })}
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          titel="Aktueller Status"
          sub={`${def.code} · ${def.name} seit ${formatDate(anmeldung.statusSeit)} – ${PHASE_NAME[def.phase]}`}
          actions={
            <span className="row" style={{ gap: 6 }}>
              {frist.datum ? <AmpelBadge ampel={ampel} /> : null}
              {frist.nachhaken && frist.datum ? <NachhakenBadge /> : null}
            </span>
          }
        />
        <div className="card-pad stack" style={{ gap: 14 }}>
          <dl className="kv kv-breit" style={{ margin: 0 }}>
            <dt>Terminfrist</dt>
            <dd>
              {frist.datum ? <b>{formatDate(frist.datum)}</b> : <span className="tertiary">keine</span>}
              {frist.datum ? <span className="tertiary"> · {frist.manuell ? 'von Hand festgelegt' : frist.regel}</span> : null}
              <div className="small tertiary">{frist.erlaeuterung}</div>
              {frist.platzhalter ? (
                <div className="small" style={{ color: 'var(--orange)' }}>
                  Berechnet aus einem Platzhalterwert – Richtlinienfrist unter „Einstellungen“ prüfen.
                </div>
              ) : null}
            </dd>
            {def.bemerkung ? (
              <>
                <dt>Hinweis</dt>
                <dd>{def.bemerkung}</dd>
              </>
            ) : null}
          </dl>

          {def.nachfolger.length > 0 ? (
            <div className="stack" style={{ gap: 8 }}>
              {imWorkflow.length > 0 ? (
                <div className="row wrap" style={{ gap: 6 }}>
                  <span className="small muted">Weiter im Workflow:</span>
                  {imWorkflow.map((n) => (
                    <button key={n} type="button" className="antwort-chip" onClick={() => setWechsel(n)}>
                      {nachfolgerText(anmeldung.status, n)}
                    </button>
                  ))}
                </div>
              ) : null}
              {uebernahmen.length > 0 ? (
                <div className="row wrap" style={{ gap: 6 }}>
                  <span className="small muted">Übernahme in neue Phase:</span>
                  {uebernahmen.map((n) => (
                    <button key={n} type="button" className="antwort-chip" onClick={() => setWechsel(n)}>
                      {nachfolgerText(anmeldung.status, n)}
                    </button>
                  ))}
                </div>
              ) : null}
              {leiche ? (
                <div className="row wrap" style={{ gap: 6 }}>
                  <span className="small muted">Erledigt sich:</span>
                  <button
                    type="button"
                    className="antwort-chip"
                    style={{ color: 'var(--red)' }}
                    onClick={() => setWechsel('Z0')}
                  >
                    {nachfolgerText(anmeldung.status, 'Z0')}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="step-actions">
            {frist.nachhaken ? (
              <button type="button" className="btn btn-sm btn-outline" onClick={() => setNachhaken(true)}>
                <Icon name="glocke" size={13} /> Nachgehakt …
              </button>
            ) : null}
            <button type="button" className="btn btn-sm btn-outline" onClick={() => setTermin(true)}>
              <Icon name="kalender" size={13} /> Termin festlegen …
            </button>
            {letzter ? (
              <button type="button" className="btn btn-sm" onClick={() => setZuruecknehmen(true)}>
                Letzten Wechsel zurücknehmen
              </button>
            ) : null}
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader titel="Merkmale" />
        <div className="card-pad">
          <dl className="kv kv-breit" style={{ margin: 0 }}>
            <dt>{phaseMitFahrplanjahr(def.phase) ? 'Begriff / tVE-Nr' : 'Anmelde-ID'}</dt>
            <dd>{anmeldung.anmeldeId || '–'}</dd>
            <dt>Anmeldungs-Art</dt>
            <dd>{anmeldung.art}</dd>
            <dt>Bauzeitraum</dt>
            <dd>
              {bauzeitraumText(anmeldung)}
              {phaseMitFahrplanjahr(def.phase) && anmeldung.bauVon ? (
                <span className="tertiary small">
                  {' '}
                  · {formatDate(anmeldung.bauVon)} – {formatDate(anmeldung.bauBis)}
                </span>
              ) : anmeldung.fahrplanjahr ? (
                <span className="tertiary small"> · Fahrplanjahr {anmeldung.fahrplanjahr}</span>
              ) : null}
            </dd>
            <dt>Bf/Strecke</dt>
            <dd>{anmeldung.bfStrecke || '–'}</dd>
            <dt>Gewerk/Tätigkeit</dt>
            <dd>{anmeldung.gewerk || '–'}</dd>
            {istAenderung(anmeldung.status) ? (
              <>
                <dt>ÄAbst-Nr</dt>
                <dd>{anmeldung.aenderungsNr || '–'}</dd>
                <dt>AnnexVII-Kennzeichen</dt>
                <dd>{anmeldung.annexVII ? ANNEX_VII_LABEL[anmeldung.annexVII] : '–'}</dd>
              </>
            ) : null}
            <dt>Bemerkungen</dt>
            <dd>{anmeldung.bemerkung || '–'}</dd>
            {herkunft ? (
              <>
                <dt>Herkunft</dt>
                <dd>
                  <button type="button" className="link-btn" onClick={() => oeffne(herkunft)}>
                    {herkunft.anmeldeId || 'ohne ID'}
                  </button>{' '}
                  <span className="tertiary small">– bei der Übernahme aufgeteilt</span>
                </dd>
              </>
            ) : null}
            {aufgeteilt.length > 0 ? (
              <>
                <dt>Aufgeteilt in</dt>
                <dd className="row wrap" style={{ gap: 8 }}>
                  {aufgeteilt.map((a) => (
                    <button key={a.id} type="button" className="link-btn" onClick={() => oeffne(a)}>
                      {a.anmeldeId || 'ohne ID'}
                    </button>
                  ))}
                </dd>
              </>
            ) : null}
          </dl>
          {!istAenderung(anmeldung.status) ? (
            <p className="small tertiary" style={{ marginTop: 10 }}>
              ÄAbst-Nr und AnnexVII-Kennzeichen sind nur während einer laufenden Änderungsabstimmung aktiv.
            </p>
          ) : null}
        </div>
      </Card>

      <Card>
        <CardHeader titel="Statusverlauf" sub="Jeder Wechsel mit Datum, Bearbeitung und Bemerkung" />
        {anmeldung.verlauf.length === 0 ? (
          <div className="card-pad small tertiary">Noch kein Eintrag.</div>
        ) : (
          anmeldung.verlauf.map((v, i) => {
            const letzterEintrag = i === anmeldung.verlauf.length - 1;
            const aktiv = letzterEintrag && v.typ !== 'notiz';
            const uebernommen = v.typ === 'wechsel' && !!v.von && !!v.nach && istUebernahme(v.von, v.nach);
            return (
              <div className={`step-row ${aktiv ? 'aktiv' : ''}`} key={v.id}>
                <div className="step-marker">
                  <div className={`step-num ${v.typ === 'notiz' ? '' : aktiv ? 'current' : 'done'}`}>
                    {v.typ === 'notiz' ? '…' : v.typ === 'anlage' ? '+' : <Icon name="check" size={12} strokeWidth={2.4} />}
                  </div>
                  {!letzterEintrag ? <div className="step-line" /> : null}
                </div>
                <div className="step-body">
                  <div className="step-title">
                    {v.typ === 'notiz' ? (
                      <strong>Notiz</strong>
                    ) : v.nach ? (
                      <StatusBadge code={v.nach} />
                    ) : null}
                    {uebernommen && v.von ? (
                      <Badge ton="purple">Übernahme aus {PHASE_NAME[statusDef(v.von).phase]}</Badge>
                    ) : null}
                    {v.typ === 'anlage' && v.von ? <Badge ton="purple">Aus Aufteilung</Badge> : null}
                  </div>
                  <div className="step-meta">
                    <span>
                      Datum: <b>{formatDate(v.datum)}</b>
                    </span>
                    <span>
                      Bearbeitung: <b>{v.bearbeiter}</b>
                    </span>
                    {v.typ === 'wechsel' && v.von ? (
                      <span>
                        zuvor: <b>{v.von}</b>
                      </span>
                    ) : null}
                    {uebernommen && v.vorher ? (
                      <span>
                        vorher: <b>{v.vorher.art}</b>
                        {v.vorher.anmeldeId ? ` · ${v.vorher.anmeldeId}` : ''}
                      </span>
                    ) : null}
                    {v.aenderungsNr || v.annexVII ? (
                      <span>
                        Änderung: <b>{v.aenderungsNr || 'ohne ÄAbst-Nr'}</b>
                        {v.annexVII ? ` · ${ANNEX_VII_LABEL[v.annexVII]}` : ''}
                      </span>
                    ) : null}
                  </div>
                  {v.text ? <p className="small muted">{v.text}</p> : null}
                </div>
              </div>
            );
          })
        )}
      </Card>

      {def.phase === 'X' ? (
        <Callout>Annahme laut Lastenheft: Anmeldungen in den Vorprozessen N-x erfolgen immer fristgerecht.</Callout>
      ) : null}

      {wechsel ? (
        <StatusWechselDialog
          anmeldung={anmeldung}
          nach={wechsel}
          onClose={() => setWechsel(null)}
          onGeloescht={zurProjekthuelle}
        />
      ) : null}
      {bearbeiten ? <AnmeldungDialog projekt={projekt} anmeldung={anmeldung} onClose={() => setBearbeiten(false)} /> : null}
      {nachhaken ? <NachhakenDialog anmeldung={anmeldung} onClose={() => setNachhaken(false)} /> : null}
      {termin ? <TerminDialog anmeldung={anmeldung} onClose={() => setTermin(false)} /> : null}
      {zuruecknehmen && letzter ? (
        <ConfirmDialog
          titel="Letzten Statuswechsel zurücknehmen?"
          text={`Die Anmeldung kehrt von ${letzter.nach} zurück nach ${letzter.von} – mit dem Stand von vorher (Art, ID, Bauzeitraum). ${
            aufgeteilt.length > 0 ? 'Bei der Übernahme aufgeteilte Anmeldungen bleiben bestehen.' : ''
          }`}
          bestaetigenLabel="Zurücknehmen"
          ton="blau"
          onConfirm={() => {
            statusZuruecknehmen(anmeldung.id);
            toast('Statuswechsel zurückgenommen.');
          }}
          onClose={() => setZuruecknehmen(false)}
        />
      ) : null}
      {loeschen ? (
        <ConfirmDialog
          titel="Anmeldung löschen?"
          text={`„${anmeldung.anmeldeId || anmeldung.gewerk || 'ohne ID'}“ wird samt Statusverlauf gelöscht. Für Anmeldeleichen ist der Status Z0 vorgesehen.`}
          onConfirm={() => {
            deleteAnmeldung(anmeldung.id);
            toast('Anmeldung gelöscht.');
            zurProjekthuelle();
          }}
          onClose={() => setLoeschen(false)}
        />
      ) : null}
    </div>
  );
}
