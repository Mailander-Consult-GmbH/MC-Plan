/**
 * Seite eines Projekts im Controlling der Leistungsnachweise – ohne Reiter.
 * Oben „Alle Projekte“, Projektnummer und -name, Status, Raster und eine Reihe
 * beschrifteter Knöpfe wie in den anderen Bereichen: „Einstellen“
 * (Leistungsbereich, Bezeichnung im Nachweis, Raster, Abschnitte, Logos –
 * ProjektEinstellungen.tsx), „Bearbeiten“ und zum gezeigten Nachweis
 * „Vorschau“ (mit „Drucken / PDF“) und rot „Nachweis löschen“
 * (Abrechnung.tsx). Ein Projekt löscht man nur im Controlling unter
 * „Projekte“ (für alle Bereiche). Einen Rhythmus gibt es nicht: Erfasste
 * Leistungen sammeln sich im offenen Leistungsnachweis – wie in einer Excel je
 * Projekt –, bis das Controlling ihn abschließt und dabei festlegt, bis wann
 * er reicht; bis dahin läuft er einfach weiter.
 * Liegen Leistungen in keinem Leistungsnachweis (etwa nach dem Löschen eines
 * Nachweises), nennt ein Hinweis sie und ordnet sie mit „Einem
 * Leistungsnachweis zuordnen“ zu (`nachweiseFuerOffeneLeistungen`).
 * Darunter der Leistungsnachweis (Abrechnung.tsx, `NachweisBearbeitung`): ohne
 * Angabe in der Adresse der offene (der früheste, `offeneNachweise`) in drei
 * Schritten – Bestätigungen, Prüfen, Abschließen und PDF –, sonst der
 * gewählte (abgeschlossene nur zum Lesen, mit „Zum offenen
 * Leistungsnachweis“). Gibt es keinen offenen, sagt die Seite, wann einer
 * entsteht, und bietet „Neuer Leistungsnachweis“ an. Ganz unten „Frühere
 * Leistungsnachweise“: alle übrigen Nachweise des Projekts, der jüngste
 * zuerst, mit Stand, Stunden, „Ansehen“ und – abgeschlossen – „PDF“.
 */
import { useState } from 'react';
import { Icon } from '../../../../shared/icons';
import { useToast } from '../../../../shared/toast';
import { Badge, Callout, Card, CardHeader, EmptyState, Modal } from '../../../../shared/ui';
import { NachweisDialog } from '../../components/NachweisDialog';
import { ProjektDialog } from '../../components/ProjektDialog';
import { STATUS_TON, anzahl, nachweiseAngelegtText, zeitpunkt } from '../../components/common';
import { nachweisDrucken } from '../../domain/druck';
import {
  leistungenOhneNachweis,
  nachweisSummen,
  nachweisTitel,
  nachweisZeilen,
  nachweiseVon,
  offeneNachweise,
  stundenVon,
} from '../../domain/nachweis';
import { PROJEKT_STATUS_LABEL, RASTER_LABEL, projektTitel, type ID, type Leistungsnachweis, type Projekt } from '../../domain/types';
import { stundenText } from '../../domain/zeitraum';
import type { Route } from '../../lib/router';
import { useStore } from '../../store/store';
import { NachweisBearbeitung, NachweisLoeschenDialog, NachweisVorschau } from './Abrechnung';
import { ProjektEinstellungen } from './ProjektEinstellungen';

export function ControllingProjekt({
  projektId,
  nachweisId,
  navigate,
}: {
  projektId: ID;
  /** Gewählter Leistungsnachweis; ohne Angabe der aktuelle. */
  nachweisId?: ID;
  navigate: (r: Route) => void;
}) {
  const { data, nachweiseFuerOffeneLeistungen } = useStore();
  const toast = useToast();
  const [einstellen, setEinstellen] = useState(false);
  const [bearbeiten, setBearbeiten] = useState(false);
  const [vorschau, setVorschau] = useState(false);
  const [nachweisLoeschen, setNachweisLoeschen] = useState(false);
  const [neuerNachweis, setNeuerNachweis] = useState(false);
  const projekt = data.projekte.find((p) => p.id === projektId);
  const zuDenProjekten = () => navigate({ view: 'controlling', tab: 'projekte' });

  if (!projekt) {
    return (
      <Card>
        <EmptyState
          icon="projekt"
          titel="Nicht gefunden"
          text="Das Projekt existiert nicht (mehr) – etwa weil es gelöscht wurde."
          action={
            <button type="button" className="btn btn-primary" onClick={zuDenProjekten}>
              Zu den Projekten
            </button>
          }
        />
      </Card>
    );
  }

  // Ohne Angabe der offene Nachweis (der früheste), sonst der gewählte
  const offener = offeneNachweise(data, projekt.id)[0];
  const nachweis = nachweisId ? data.nachweise.find((n) => n.id === nachweisId && n.projektId === projekt.id) : offener;
  // Alle übrigen Nachweise des Projekts, der jüngste zuerst
  const uebrige = [...nachweiseVon(data, projekt.id)].reverse().filter((x) => x.id !== nachweis?.id);
  const leistungenImProjekt = data.leistungen.filter((l) => l.projektId === projekt.id).length;
  // Leistungen ohne Leistungsnachweis (etwa nach dem Löschen eines Nachweises) – sie kommen in den offenen
  const ohneNachweis = leistungenOhneNachweis(data, projekt.id);

  return (
    <div className="stack">
      <div className="ln-co-leiste">
        <div className="row wrap ln-co-projektkopf">
          <button type="button" className="btn btn-ghost" onClick={zuDenProjekten}>
            <Icon name="zurueck" size={14} /> Alle Projekte
          </button>
          <h2 className="ln-co-projekttitel truncate">{projektTitel(projekt)}</h2>
          <Badge ton={STATUS_TON[projekt.status]}>{PROJEKT_STATUS_LABEL[projekt.status]}</Badge>
          <span className="small muted">{RASTER_LABEL[projekt.raster]}</span>
        </div>
        {/* Alle Knöpfe in einer Reihe, beschriftet wie in den anderen Bereichen: Projekt und gezeigter Nachweis */}
        <div className="row wrap ln-co-aktionen">
          <button type="button" className="btn btn-outline" onClick={() => setEinstellen(true)}>
            <Icon name="einstellungen" size={14} /> Einstellen
          </button>
          <button type="button" className="btn btn-outline" onClick={() => setBearbeiten(true)}>
            <Icon name="bearbeiten" size={14} /> Bearbeiten
          </button>
          {nachweis ? (
            <>
              <button type="button" className="btn btn-outline" onClick={() => setVorschau(true)}>
                <Icon name="suche" size={14} /> Vorschau
              </button>
              <button type="button" className="btn btn-danger" onClick={() => setNachweisLoeschen(true)}>
                <Icon name="loeschen" size={14} /> Nachweis löschen
              </button>
            </>
          ) : null}
        </div>
      </div>

      {ohneNachweis.length > 0 ? (
        <Callout ton="warn" icon="!">
          <div className="row-between wrap">
            <span>
              {anzahl(ohneNachweis.length, 'Leistung liegt', 'Leistungen liegen')} ({stundenText(stundenVon(ohneNachweis))} Std.) in keinem
              Leistungsnachweis.
            </span>
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={() => {
                const ergebnis = nachweiseFuerOffeneLeistungen(projekt.id);
                toast(ergebnis.neu || ergebnis.erweitert ? nachweiseAngelegtText(ergebnis) : 'Keine Änderung.');
              }}
            >
              Einem Leistungsnachweis zuordnen
            </button>
          </div>
        </Callout>
      ) : null}

      {nachweis && offener && nachweis.id !== offener.id ? (
        <div>
          <button type="button" className="btn btn-ghost" onClick={() => navigate({ view: 'controllingProjekt', projektId: projekt.id })}>
            <Icon name="zurueck" size={14} /> Zum offenen Leistungsnachweis
          </button>
        </div>
      ) : null}
      {nachweis ? (
        <NachweisBearbeitung key={nachweis.id} projekt={projekt} nachweis={nachweis} navigate={navigate} />
      ) : (
        <Card>
          <EmptyState
            icon="stunden"
            titel={nachweisId ? 'Leistungsnachweis nicht gefunden' : 'Kein offener Leistungsnachweis'}
            text={
              nachweisId
                ? 'Der Leistungsnachweis existiert nicht (mehr) – etwa weil er gelöscht wurde.'
                : 'Sobald Mitarbeiter Leistungen erfassen, entsteht ein offener Leistungsnachweis; er sammelt alle Leistungen, bis das Controlling ihn abschließt.'
            }
            action={
              nachweisId ? (
                <button type="button" className="btn btn-primary" onClick={() => navigate({ view: 'controllingProjekt', projektId: projekt.id })}>
                  Zum offenen Leistungsnachweis
                </button>
              ) : leistungenImProjekt > 0 ? (
                <button type="button" className="btn btn-primary" onClick={() => setNeuerNachweis(true)}>
                  <Icon name="plus" size={14} /> Neuer Leistungsnachweis
                </button>
              ) : undefined
            }
          />
        </Card>
      )}

      {uebrige.length > 0 ? <FruehereNachweise projekt={projekt} nachweise={uebrige} navigate={navigate} /> : null}

      {einstellen ? (
        <Modal titel="Projekt einstellen" sub={projektTitel(projekt)} wide onClose={() => setEinstellen(false)}>
          <ProjektEinstellungen projekt={projekt} />
        </Modal>
      ) : null}
      {bearbeiten ? <ProjektDialog projekt={projekt} onClose={() => setBearbeiten(false)} /> : null}
      {neuerNachweis ? <NachweisDialog projekt={projekt} onClose={() => setNeuerNachweis(false)} navigate={navigate} /> : null}

      {vorschau && nachweis ? <NachweisVorschau projekt={projekt} nachweis={nachweis} onClose={() => setVorschau(false)} /> : null}
      {nachweisLoeschen && nachweis ? (
        <NachweisLoeschenDialog nachweis={nachweis} navigate={navigate} onClose={() => setNachweisLoeschen(false)} />
      ) : null}
    </div>
  );
}

/**
 * „Frühere Leistungsnachweise“ unter dem offenen: die übrigen Nachweise des
 * Projekts, der jüngste zuerst – Zeitraum, Stand (abgeschlossen mit Zeitpunkt
 * bzw. offen), abgerechnete Stunden, „Ansehen“ und für abgeschlossene „PDF“.
 */
function FruehereNachweise({
  projekt,
  nachweise,
  navigate,
}: {
  projekt: Projekt;
  nachweise: Leistungsnachweis[];
  navigate: (r: Route) => void;
}) {
  const { data } = useStore();
  return (
    <Card>
      <CardHeader titel="Frühere Leistungsnachweise" sub="Abgeschlossene nur zum Lesen – PDF jederzeit erneut" />
      <div className="table-scroll">
        <table className="table table-stack ln-co-frueher">
          <thead>
            <tr>
              <th>Leistungsnachweis</th>
              <th>Stand</th>
              <th className="ln-stunden">Abgerechnet</th>
              <th className="actions" />
            </tr>
          </thead>
          <tbody>
            {nachweise.map((x) => {
              const abgeschlossen = x.status === 'abgeschlossen';
              return (
                <tr key={x.id}>
                  <td>
                    <strong>{nachweisTitel(x)}</strong>
                  </td>
                  <td data-label="Stand">
                    {abgeschlossen ? (
                      <span className="small">Abgeschlossen {zeitpunkt(x.abgeschlossen)}</span>
                    ) : (
                      <Badge ton="blue">Offen</Badge>
                    )}
                  </td>
                  <td className="ln-stunden" data-label="Abgerechnet">
                    {stundenText(nachweisSummen(nachweisZeilen(data, x)).abgerechnet)}
                  </td>
                  <td className="actions">
                    <span className="row wrap" style={{ gap: 6, justifyContent: 'flex-end' }}>
                      {abgeschlossen ? (
                        <button type="button" className="btn btn-sm btn-outline" onClick={() => nachweisDrucken(data, x, projekt)}>
                          <Icon name="plan" size={13} /> PDF
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        onClick={() => navigate({ view: 'abrechnung', projektId: projekt.id, nachweisId: x.id })}
                      >
                        Ansehen <Icon name="chevron" size={13} />
                      </button>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
