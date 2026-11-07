/**
 * Übersicht der Leistungsnachweise im Controlling – die Startseite des
 * Menüpunkts „Leistungsnachweise“ im Controlling-Bereich: je Projekt eine
 * Zeile mit
 * * Rhythmus (über welche Monate ein Leistungsnachweis geht – monatlich, alle
 *   2 bzw. 3 Monate ab Projektbeginn oder bis zum Abschluss, `Zeitraumregel`)
 *   und Raster (Tages-, Wochen- oder Monatsscharf) als Auswahl direkt in der
 *   Tabelle; ändert sich dadurch etwas an den gemeinsamen Leistungstexten bzw.
 *   Bestätigungen der Mitarbeiter, fragt ein Dialog vorher nach
 *   (RasterwechselHinweis.tsx bzw. `grenzFolgen` auf `regelAnwenden`),
 * * dem aktuellen Leistungsnachweis (`aktuellerNachweis`: der früheste
 *   offene, sonst der zuletzt abgeschlossene) mit Stand – „Fällig“, wenn sein
 *   Zeitraum vorbei ist (`nachweisFaellig`), sonst „läuft“ bzw.
 *   „Abgeschlossen“ – und weiteren offenen,
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
import { RASTER_OPTIONEN, REGEL_OPTIONEN, STATUS_TON, anzahl } from '../../components/common';
import { grenzFolgen, grenzFolgenHinweis, periodentexteNachRasterwechsel } from '../../domain/erfassung';
import {
  aktuellerNachweis,
  laeuftBisAbschluss,
  leistungenDesNachweises,
  nachweisFaellig,
  nachweisTitel,
  offeneNachweise,
  regelAnwenden,
  stundenVon,
} from '../../domain/nachweis';
import {
  PROJEKT_STATUS_LABEL,
  RASTER_LABEL,
  ZEITRAUMREGEL_LABEL,
  projektTitel,
  type Leistungsnachweis,
  type Projekt,
  type Raster,
  type Zeitraumregel,
} from '../../domain/types';
import { langDatum, stundenText } from '../../domain/zeitraum';
import type { Route } from '../../lib/router';
import { useStore } from '../../store/store';
import { BestaetigtBadge, bestaetigungsZahl } from './BestaetigungsStand';

/** Rückfrage vor einer Änderung, die gemeinsame Texte bzw. Bestätigungen der Mitarbeiter berührt. */
type Rueckfrage =
  | { art: 'raster'; projekt: Projekt; raster: Raster }
  | { art: 'regel'; projekt: Projekt; regel: Zeitraumregel; hinweis: string };

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
      return [
        p.id,
        {
          nachweis: n,
          weitereOffene: n && n.status === 'entwurf' ? offen.length - 1 : offen.length,
          faellig: !!n && nachweisFaellig(data, n, heute),
          stunden: n ? stundenVon(leistungenDesNachweises(data, n)) : 0,
          zahl: n ? bestaetigungsZahl(data, n) : null,
        },
      ];
    }),
  );
  const faellige = [...stand.values()].filter((s) => s.faellig).length;
  const fehlend = [...stand.values()].reduce((summe, s) => summe + (s.zahl ? s.zahl.gesamt - s.zahl.bestaetigt : 0), 0);

  /* Rhythmus und Raster aus der Tabelle */
  const rasterWaehlen = (p: Projekt, raster: Raster) => {
    if (raster === p.raster) return;
    if (periodentexteNachRasterwechsel(data, p.id, raster) > 0) setRueckfrage({ art: 'raster', projekt: p, raster });
    else {
      updateProjekt(p.id, { raster });
      toast(`${projektTitel(p)}: ${RASTER_LABEL[raster]}.`);
    }
  };
  const regelWaehlen = (p: Projekt, regel: Zeitraumregel) => {
    if (regel === p.zeitraumregel) return;
    // Was sich an Grenzen der Nachweise ändert, nennt die Rückfrage – wie der Store es rechnet
    const hinweis = grenzFolgenHinweis(
      grenzFolgen(data, regelAnwenden(data, p.id, regel, new Date().toISOString(), () => `vorschau-${Math.random()}`)),
      data.mitarbeiter,
    );
    if (hinweis) setRueckfrage({ art: 'regel', projekt: p, regel, hinweis });
    else {
      updateProjekt(p.id, { zeitraumregel: regel });
      toast(`${projektTitel(p)}: ${ZEITRAUMREGEL_LABEL[regel]}.`);
    }
  };
  const bestaetigen = () => {
    if (!rueckfrage) return;
    if (rueckfrage.art === 'raster') {
      updateProjekt(rueckfrage.projekt.id, { raster: rueckfrage.raster });
      toast(`${projektTitel(rueckfrage.projekt)}: ${RASTER_LABEL[rueckfrage.raster]}.`);
    } else {
      updateProjekt(rueckfrage.projekt.id, { zeitraumregel: rueckfrage.regel });
      toast(`${projektTitel(rueckfrage.projekt)}: ${ZEITRAUMREGEL_LABEL[rueckfrage.regel]}.`);
    }
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
          sub={`${anzahl(projekte.length, 'Projekt', 'Projekte')} · Rhythmus und Raster legen fest, über welche Zeit ein Leistungsnachweis geht und wie er gegliedert ist`}
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
                  <th title="Über welche Monate ein Leistungsnachweis geht">Rhythmus</th>
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
                      {/* Auswahlen in der Zeile – ein Klick darauf öffnet nicht das Projekt */}
                      <td data-label="Rhythmus" className="ln-co-auswahl" onClick={(e) => e.stopPropagation()}>
                        <select
                          className="select"
                          value={p.zeitraumregel}
                          aria-label={`Rhythmus der Leistungsnachweise von ${projektTitel(p)}`}
                          onChange={(e) => regelWaehlen(p, e.target.value as Zeitraumregel)}
                        >
                          {REGEL_OPTIONEN.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </td>
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
                        <NachweisStand nachweis={s.nachweis} faellig={s.faellig} weitere={s.weitereOffene} heute={heute} />
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
          titel={rueckfrage.art === 'raster' ? 'Raster ändern?' : 'Rhythmus ändern?'}
          sub={
            rueckfrage.art === 'raster'
              ? `${projektTitel(rueckfrage.projekt)}: ${RASTER_LABEL[rueckfrage.projekt.raster]} → ${RASTER_LABEL[rueckfrage.raster]}`
              : `${projektTitel(rueckfrage.projekt)}: ${ZEITRAUMREGEL_LABEL[rueckfrage.projekt.zeitraumregel]} → ${ZEITRAUMREGEL_LABEL[rueckfrage.regel]}`
          }
          onClose={() => setRueckfrage(null)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setRueckfrage(null)}>
                Abbrechen
              </button>
              <button type="button" className="btn btn-primary" onClick={bestaetigen}>
                {rueckfrage.art === 'raster' ? 'Raster ändern' : 'Rhythmus ändern'}
              </button>
            </>
          }
        >
          {rueckfrage.art === 'raster' ? (
            <RasterwechselHinweis projekt={rueckfrage.projekt} raster={rueckfrage.raster} />
          ) : (
            <p className="muted">
              Die offenen Leistungsnachweise richten sich nach dem neuen Rhythmus. {rueckfrage.hinweis}
            </p>
          )}
        </Modal>
      ) : null}
    </div>
  );
}

/** Aktueller Leistungsnachweis eines Projekts: Überschrift und Stand. */
function NachweisStand({
  nachweis: n,
  faellig,
  weitere,
  heute,
}: {
  nachweis: Leistungsnachweis | null;
  faellig: boolean;
  weitere: number;
  heute: string;
}) {
  const { data } = useStore();
  if (!n) return <span className="tertiary">Noch keiner</span>;
  // Bis zum Abschluss läuft er nach der Regel „Bis zum Abschluss“, sonst bis zum Ende seines Zeitraums
  const bisAbschluss =
    laeuftBisAbschluss(data, n, heute) && data.projekte.find((p) => p.id === n.projektId)?.zeitraumregel === 'fortlaufend';
  return (
    <span className="ln-co-nachweisstand">
      <span>{nachweisTitel(n)}</span>
      <span className="row wrap" style={{ gap: 6 }}>
        {n.status === 'abgeschlossen' ? (
          <Badge ton="green">Abgeschlossen</Badge>
        ) : faellig ? (
          <Badge ton="orange">Fällig</Badge>
        ) : (
          <Badge ton="blue">{bisAbschluss ? 'Läuft bis zum Abschluss' : `Läuft bis ${langDatum(n.bis)}`}</Badge>
        )}
        {weitere > 0 ? <span className="small tertiary">+ {anzahl(weitere, 'weiterer offen', 'weitere offen')}</span> : null}
      </span>
    </span>
  );
}
