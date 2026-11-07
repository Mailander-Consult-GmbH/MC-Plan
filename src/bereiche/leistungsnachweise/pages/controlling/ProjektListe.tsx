/**
 * Übersicht der Leistungsnachweise im Controlling – die Startseite des
 * Menüpunkts „Leistungsnachweise“ im Controlling-Bereich: je Projekt eine
 * Zeile mit
 * * dem Raster (Tages-, Wochen- oder Monatsscharf) als Auswahl direkt in der
 *   Tabelle; ändert sich dadurch etwas an den gemeinsamen Leistungstexten der
 *   Mitarbeiter, fragt ein Dialog vorher nach (RasterwechselHinweis.tsx),
 * * dem aktuellen Leistungsnachweis (`aktuellerNachweis`: der früheste
 *   offene, sonst der zuletzt abgeschlossene) mit Stand – „Fällig“, wenn er
 *   Leistungen aus einem schon vergangenen Monat enthält (`nachweisFaellig`,
 *   dazu der Monat der ältesten, `offenSeit`), sonst „Offen“ bzw. „Abgeschlossen“ – und
 *   weiteren offenen. Einen Rhythmus gibt es nicht: Erfasste Leistungen
 *   sammeln sich im offenen Nachweis, bis das Controlling ihn erstellt und
 *   dabei festlegt, bis zu welchem Tag er reicht – spätere bleiben für den
 *   nächsten offen,
 * * seinen erfassten Stunden und
 * * „x von y bestätigt“: wer im Zeitraum Stunden gebucht und seine Monate
 *   bestätigt hat (`bestaetigungsZahl`, BestaetigungsStand.tsx).
 * Darüber die Summe: fällige Leistungsnachweise und fehlende Bestätigungen.
 * „Öffnen“ bzw. ein Klick auf die Zeile führt auf die Seite des Projekts
 * (Projekt.tsx) mit dem aktuellen Nachweis. „Neues Projekt“ legt ein Projekt
 * nur in den Leistungsnachweisen an; für alle Bereiche gibt es die Projekte
 * des Controllings (Projektregister). „Excel-Import (alle Mitarbeiter)“
 * übernimmt den Sammel-Export der Zeiterfassung. Archivierte Projekte stehen
 * am Ende.
 */
import { useState } from 'react';
import { useArchivierte } from '../../../../gemeinsam/ProjektBereiche';
import { today } from '../../../../shared/dates';
import { Icon } from '../../../../shared/icons';
import { useToast } from '../../../../shared/toast';
import { Badge, Card, CardHeader, EmptyState, Modal, Search } from '../../../../shared/ui';
import { ImportDialog } from '../../components/ImportDialog';
import { ProjektDialog } from '../../components/ProjektDialog';
import { RasterwechselHinweis } from '../../components/RasterwechselHinweis';
import { RASTER_OPTIONEN, STATUS_TON, anzahl } from '../../components/common';
import { periodentexteNachRasterwechsel } from '../../domain/erfassung';
import {
  aktuellerNachweis,
  leistungenDesNachweises,
  nachweisFaellig,
  nachweisTitel,
  offenSeit,
  offeneNachweise,
  stundenVon,
} from '../../domain/nachweis';
import {
  PROJEKT_STATUS_LABEL,
  RASTER_LABEL,
  projektTitel,
  type Leistungsnachweis,
  type Projekt,
  type Raster,
} from '../../domain/types';
import { monatText, stundenText } from '../../domain/zeitraum';
import type { Route } from '../../lib/router';
import { useStore } from '../../store/store';
import { BestaetigtBadge, bestaetigungsZahl } from './BestaetigungsStand';

/** Rückfrage vor einem Rasterwechsel, der gemeinsame Texte der Mitarbeiter berührt. */
type Rueckfrage = { projekt: Projekt; raster: Raster };

export function ProjektListe({ navigate }: { navigate: (r: Route) => void }) {
  const { data, updateProjekt } = useStore();
  const toast = useToast();
  const [suche, setSuche] = useState('');
  const [neu, setNeu] = useState(false);
  const [importOffen, setImportOffen] = useState(false);
  const [rueckfrage, setRueckfrage] = useState<Rueckfrage | null>(null);
  const archiviert = useArchivierte('leistungsnachweise');
  const heute = today();

  const begriff = suche.trim().toLowerCase();
  const projekte = data.projekte
    .filter((p) => [p.nummer, p.name, p.kurzname, p.leistungsbereich].join(' ').toLowerCase().includes(begriff))
    .sort(
      (a, b) =>
        Number(archiviert.has(a.id)) - Number(archiviert.has(b.id)) ||
        a.nummer.localeCompare(b.nummer, 'de', { numeric: true }) ||
        a.name.localeCompare(b.name, 'de'),
    );
  const oeffne = (p: Projekt) => navigate({ view: 'controllingProjekt', projektId: p.id });

  // Je Projekt der aktuelle Nachweis und sein Stand – auch für die Summe oben
  const stand = new Map(
    data.projekte.map((p) => {
      const n = aktuellerNachweis(data, p.id);
      const offen = offeneNachweise(data, p.id);
      const leistungen = n ? leistungenDesNachweises(data, n) : [];
      return [
        p.id,
        {
          nachweis: n,
          weitereOffene: n && n.status === 'entwurf' ? offen.length - 1 : offen.length,
          faellig: !!n && nachweisFaellig(data, n, heute),
          // Im Hinweis „Fällig“ der Monat, seit dem Leistungen offen sind (ohne nachgereichte)
          seit: n ? offenSeit(data, n) : null,
          stunden: stundenVon(leistungen),
          zahl: n ? bestaetigungsZahl(data, n) : null,
        },
      ];
    }),
  );
  const faellige = [...stand.values()].filter((s) => s.faellig).length;
  const fehlend = [...stand.values()].reduce((summe, s) => summe + (s.zahl ? s.zahl.gesamt - s.zahl.bestaetigt : 0), 0);

  /* Raster aus der Tabelle */
  const rasterWaehlen = (p: Projekt, raster: Raster) => {
    if (raster === p.raster) return;
    if (periodentexteNachRasterwechsel(data, p.id, raster) > 0) setRueckfrage({ projekt: p, raster });
    else {
      updateProjekt(p.id, { raster });
      toast(`${projektTitel(p)}: ${RASTER_LABEL[raster]}.`);
    }
  };
  const bestaetigen = () => {
    if (!rueckfrage) return;
    updateProjekt(rueckfrage.projekt.id, { raster: rueckfrage.raster });
    toast(`${projektTitel(rueckfrage.projekt)}: ${RASTER_LABEL[rueckfrage.raster]}.`);
    setRueckfrage(null);
  };

  return (
    <div className="stack">
      <div className="row-between wrap">
        <div className="row wrap">
          <Search value={suche} onChange={setSuche} placeholder="Projekt, Nummer …" />
        </div>
        <div className="row wrap">
          <button
            type="button"
            className="btn btn-outline"
            title="Sammel-Export der Zeiterfassung: Leistungen aller Mitarbeiter der Datei übernehmen"
            onClick={() => setImportOffen(true)}
          >
            <Icon name="importieren" size={14} /> Excel-Import (alle Mitarbeiter)
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setNeu(true)}>
            <Icon name="plus" size={14} /> Neues Projekt
          </button>
        </div>
      </div>

      <Card>
        <CardHeader
          titel="Projekte"
          sub={`${anzahl(projekte.length, 'Projekt', 'Projekte')} · Erfasste Leistungen sammeln sich im offenen Leistungsnachweis, bis das Controlling ihn erstellt; das Raster gliedert ihn`}
          actions={
            <span className="row wrap ln-co-summen">
              <Badge ton={faellige ? 'orange' : ''}>{anzahl(faellige, 'Nachweis fällig', 'Nachweise fällig')}</Badge>
              <Badge ton={fehlend ? 'orange' : 'green'}>
                {fehlend ? anzahl(fehlend, 'Bestätigung offen', 'Bestätigungen offen') : 'Alle bestätigt'}
              </Badge>
            </span>
          }
        />
        {projekte.length === 0 ? (
          <EmptyState
            icon="projekt"
            titel="Kein Projekt gefunden"
            text="Projekte kommen aus dem Projektregister, aus dem Excel-Import oder über „Neues Projekt“."
          />
        ) : (
          <div className="table-scroll">
            <table className="table table-stack ln-co-projektliste">
              <thead>
                <tr>
                  <th>Projekt</th>
                  <th title="Zeilen je Tag, Woche oder Monat – gliedert auch die Leistungstexte der Mitarbeiter">Raster</th>
                  <th>Aktueller Leistungsnachweis</th>
                  <th className="ln-stunden">Stunden</th>
                  <th>Bestätigt</th>
                  <th className="actions" />
                </tr>
              </thead>
              <tbody>
                {projekte.map((p) => {
                  const s = stand.get(p.id)!;
                  return (
                    <tr key={p.id} className={`clickable ${archiviert.has(p.id) ? 'ln-co-archiviert' : ''}`} onClick={() => oeffne(p)}>
                      <td>
                        <span className="num tertiary">{p.nummer}</span>
                        <div>
                          <strong>{p.name}</strong>
                        </div>
                        <span className="row wrap" style={{ gap: 6, marginTop: 3 }}>
                          <Badge ton={STATUS_TON[p.status]}>{PROJEKT_STATUS_LABEL[p.status]}</Badge>
                          {archiviert.has(p.id) ? <Badge>Archiviert</Badge> : null}
                        </span>
                      </td>
                      {/* Auswahl in der Zeile – ein Klick darauf öffnet nicht das Projekt */}
                      <td data-label="Raster" className="ln-co-auswahl" onClick={(e) => e.stopPropagation()}>
                        <select
                          className="select"
                          value={p.raster}
                          aria-label={`Raster der Leistungsnachweise von ${projektTitel(p)}`}
                          onChange={(e) => rasterWaehlen(p, e.target.value as Raster)}
                        >
                          {RASTER_OPTIONEN.map((o) => (
                            <option key={o.value} value={o.value}>
                              {RASTER_LABEL[o.value as Raster]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td data-label="Aktueller Leistungsnachweis">
                        <NachweisStand nachweis={s.nachweis} faellig={s.faellig} seit={s.seit} weitere={s.weitereOffene} />
                      </td>
                      <td className="ln-stunden" data-label="Stunden">
                        {s.nachweis ? stundenText(s.stunden) : '–'}
                      </td>
                      <td data-label="Bestätigt">
                        <BestaetigtBadge zahl={s.zahl} />
                      </td>
                      <td className="actions">
                        <button
                          type="button"
                          className={`btn btn-sm ${s.faellig ? 'btn-primary' : 'btn-outline'}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            oeffne(p);
                          }}
                        >
                          Öffnen <Icon name="chevron" size={13} />
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

      {neu ? <ProjektDialog onClose={() => setNeu(false)} navigate={navigate} /> : null}
      {importOffen ? <ImportDialog onClose={() => setImportOffen(false)} navigate={navigate} /> : null}
      {rueckfrage ? (
        <Modal
          titel="Raster ändern?"
          sub={`${projektTitel(rueckfrage.projekt)}: ${RASTER_LABEL[rueckfrage.projekt.raster]} → ${RASTER_LABEL[rueckfrage.raster]}`}
          onClose={() => setRueckfrage(null)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setRueckfrage(null)}>
                Abbrechen
              </button>
              <button type="button" className="btn btn-primary" onClick={bestaetigen}>
                Raster ändern
              </button>
            </>
          }
        >
          <RasterwechselHinweis projekt={rueckfrage.projekt} raster={rueckfrage.raster} />
        </Modal>
      ) : null}
    </div>
  );
}

/** Aktueller Leistungsnachweis eines Projekts: Überschrift und Stand. */
function NachweisStand({
  nachweis: n,
  faellig,
  seit,
  weitere,
}: {
  nachweis: Leistungsnachweis | null;
  faellig: boolean;
  /** Datum der ältesten offenen Leistung (`offenSeit`) */
  seit: string | null;
  weitere: number;
}) {
  if (!n) return <span className="tertiary">Noch keiner</span>;
  return (
    <span className="ln-co-nachweisstand">
      <span>{nachweisTitel(n)}</span>
      <span className="row wrap" style={{ gap: 6 }}>
        {n.status === 'abgeschlossen' ? (
          <Badge ton="green">Abgeschlossen</Badge>
        ) : faellig ? (
          <>
            <Badge ton="orange">Fällig</Badge>
            {seit ? <span className="small muted">Leistungen seit {monatText(seit)} offen</span> : null}
          </>
        ) : (
          <Badge ton="blue">Offen</Badge>
        )}
        {weitere > 0 ? <span className="small tertiary">+ {anzahl(weitere, 'weiterer offen', 'weitere offen')}</span> : null}
      </span>
    </span>
  );
}
