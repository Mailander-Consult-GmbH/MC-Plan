/**
 * Seite eines Projekts im Controlling der Leistungsnachweise – ohne Reiter.
 * Oben „Alle Projekte“, Projektnummer und -name, Status, Rhythmus und Raster
 * und das Menü „Mehr“ zum Projekt (Projekt einstellen – Leistungsbereich,
 * Bezeichnung im Nachweis, Raster, Rhythmus, Abschnitte, Logos
 * (ProjektEinstellungen.tsx) –, Projekt bearbeiten, Projekt löschen).
 * Liegen Leistungen in keinem Leistungsnachweis (etwa nach dem Löschen eines
 * Nachweises), nennt ein Hinweis sie und ordnet sie mit „Nach dem Rhythmus
 * zuordnen“ zu (`nachweiseFuerOffeneLeistungen`).
 * Darunter der Leistungsnachweis (Abrechnung.tsx, `NachweisBearbeitung`): ohne
 * Angabe in der Adresse der aktuelle (`aktuellerNachweis` – der früheste
 * offene, sonst der jüngste abgeschlossene), sonst der gewählte; die Auswahl
 * dort wechselt zwischen allen Nachweisen des Projekts. Hat das Projekt noch
 * keinen, sagt die Seite, wann einer entsteht, und bietet „Neuer
 * Leistungsnachweis“ an.
 *
 * Jedes Projekt gehört in die Leistungsnachweise (`JEDES_PROJEKT_IN`): Führt
 * ein anderer Bereich das Projekt oder ist es dort zur Übernahme vorgesehen,
 * lässt es sich hier nicht löschen – nur im Controlling unter „Projekte“ für
 * alle Bereiche (dort lässt sich auch eine vorgesehene Übernahme zurücknehmen).
 */
import { useState } from 'react';
import { andereBereiche, vorgeseheneBereiche } from '../../../../gemeinsam/ProjektBereiche';
import { useRegister } from '../../../../gemeinsam/register';
import { Icon } from '../../../../shared/icons';
import { useToast } from '../../../../shared/toast';
import { Badge, Callout, Card, ConfirmDialog, EmptyState, Modal } from '../../../../shared/ui';
import { NachweisDialog } from '../../components/NachweisDialog';
import { ProjektDialog } from '../../components/ProjektDialog';
import { STATUS_TON, anzahl } from '../../components/common';
import { aktuellerNachweis, leistungenOhneNachweis, stundenVon } from '../../domain/nachweis';
import { PROJEKT_STATUS_LABEL, RASTER_LABEL, ZEITRAUMREGEL_LABEL, projektTitel, type ID } from '../../domain/types';
import { stundenText } from '../../domain/zeitraum';
import type { Route } from '../../lib/router';
import { useStore } from '../../store/store';
import { NachweisBearbeitung } from './Abrechnung';
import { MehrMenue } from './hilfen';
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
  const { data, deleteProjekt, nachweiseFuerOffeneLeistungen } = useStore();
  const register = useRegister();
  const toast = useToast();
  const [einstellen, setEinstellen] = useState(false);
  const [bearbeiten, setBearbeiten] = useState(false);
  const [loeschen, setLoeschen] = useState(false);
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

  const nachweis = nachweisId
    ? data.nachweise.find((n) => n.id === nachweisId && n.projektId === projekt.id)
    : (aktuellerNachweis(data, projekt.id) ?? undefined);
  const umfang = {
    nachweise: data.nachweise.filter((n) => n.projektId === projekt.id).length,
    leistungen: data.leistungen.filter((l) => l.projektId === projekt.id).length,
  };
  // Führt ein anderer Bereich das Projekt oder ist es dort vorgesehen, nähme der Abgleich es gleich wieder auf
  const geteilt = andereBereiche(register, 'leistungsnachweise', projekt.id);
  const vorgesehen = vorgeseheneBereiche(register, 'leistungsnachweise', projekt.id);
  const gesperrt = !!geteilt || !!vorgesehen;
  // Leistungen ohne Leistungsnachweis (etwa nach dem Löschen eines Nachweises) – sie bekommen einen nach dem Rhythmus
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
          <span className="small muted">
            {ZEITRAUMREGEL_LABEL[projekt.zeitraumregel]} · {RASTER_LABEL[projekt.raster]}
          </span>
        </div>
        <MehrMenue
          label="Weitere Aktionen zum Projekt"
          eintraege={[
            { key: 'einstellen', label: 'Projekt einstellen …', onWaehle: () => setEinstellen(true) },
            { key: 'bearbeiten', label: 'Projekt bearbeiten …', onWaehle: () => setBearbeiten(true) },
            {
              key: 'loeschen',
              label: gesperrt ? 'Projekt löschen (nur im Controlling unter „Projekte“)' : 'Projekt löschen …',
              gefahr: !gesperrt,
              onWaehle: () =>
                gesperrt
                  ? toast(
                      geteilt
                        ? `Wird auch in ${geteilt} geführt – jedes Projekt gehört in die Leistungsnachweise. Für alle Bereiche löschen lässt es sich im Controlling unter „Projekte“.`
                        : `Ist für ${vorgesehen} zur Übernahme vorgesehen – die Übernahme zurücknehmen bzw. für alle Bereiche löschen lässt es sich im Controlling unter „Projekte“.`,
                    )
                  : setLoeschen(true),
            },
          ]}
        />
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
                const { neu, erweitert } = nachweiseFuerOffeneLeistungen(projekt.id);
                toast(
                  neu || erweitert
                    ? `${neu ? anzahl(neu, 'Leistungsnachweis angelegt', 'Leistungsnachweise angelegt') : ''}${neu && erweitert ? ', ' : ''}${
                        erweitert ? anzahl(erweitert, 'Leistungsnachweis erweitert', 'Leistungsnachweise erweitert') : ''
                      }.`
                    : 'Keine Änderung.',
                );
              }}
            >
              Nach dem Rhythmus zuordnen
            </button>
          </div>
        </Callout>
      ) : null}

      {nachweis ? (
        <NachweisBearbeitung key={nachweis.id} projekt={projekt} nachweis={nachweis} navigate={navigate} />
      ) : (
        <Card>
          <EmptyState
            icon="stunden"
            titel={nachweisId ? 'Leistungsnachweis nicht gefunden' : 'Noch kein Leistungsnachweis'}
            text={
              nachweisId
                ? 'Der Leistungsnachweis existiert nicht (mehr) – etwa weil er gelöscht wurde.'
                : `Sobald Mitarbeiter Leistungen erfassen, entsteht der Leistungsnachweis nach dem Rhythmus des Projekts („${ZEITRAUMREGEL_LABEL[projekt.zeitraumregel]}“).`
            }
            action={
              nachweisId ? (
                <button type="button" className="btn btn-primary" onClick={() => navigate({ view: 'controllingProjekt', projektId: projekt.id })}>
                  Zum aktuellen Leistungsnachweis
                </button>
              ) : umfang.leistungen > 0 ? (
                <button type="button" className="btn btn-primary" onClick={() => setNeuerNachweis(true)}>
                  <Icon name="plus" size={14} /> Neuer Leistungsnachweis
                </button>
              ) : undefined
            }
          />
        </Card>
      )}

      {einstellen ? (
        <Modal titel="Projekt einstellen" sub={projektTitel(projekt)} wide onClose={() => setEinstellen(false)}>
          <ProjektEinstellungen projekt={projekt} />
        </Modal>
      ) : null}
      {bearbeiten ? <ProjektDialog projekt={projekt} onClose={() => setBearbeiten(false)} /> : null}
      {neuerNachweis ? <NachweisDialog projekt={projekt} onClose={() => setNeuerNachweis(false)} navigate={navigate} /> : null}

      {loeschen && !gesperrt ? (
        <ConfirmDialog
          titel="Projekt löschen?"
          text={`„${projekt.name}“ wird mit ${anzahl(umfang.nachweise, 'Leistungsnachweis', 'Leistungsnachweisen')} und ${anzahl(
            umfang.leistungen,
            'Leistung',
            'Leistungen',
          )} gelöscht.`}
          onConfirm={() => {
            deleteProjekt(projekt.id);
            toast('Projekt gelöscht.');
            zuDenProjekten();
          }}
          onClose={() => setLoeschen(false)}
        />
      ) : null}
    </div>
  );
}
