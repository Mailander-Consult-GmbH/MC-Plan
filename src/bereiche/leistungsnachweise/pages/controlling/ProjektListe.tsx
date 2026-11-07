/**
 * Projekte der Leistungsnachweise im Controlling – die Startseite des
 * Menüpunkts „Leistungsnachweise“ im Controlling-Bereich (ohne Reiter): alle
 * Projekte mit dem Raster ihrer Leistungsnachweise und den erfassten Stunden.
 *
 * Das Raster (Tages-, Wochen- oder Monatsscharf) lässt sich direkt in der
 * Tabelle wählen; gelten danach gemeinsame Leistungstexte der Mitarbeiter
 * nicht mehr, fragt ein Dialog vorher nach (components/RasterwechselHinweis.tsx,
 * `periodentexteNachRasterwechsel`). „Leistungsnachweis erstellen“ öffnet
 * „Neuer Leistungsnachweis“ (components/NachweisDialog.tsx: alle nicht
 * abgerechneten Leistungen des Projekts) und führt danach in die Abrechnung.
 * Ein Klick auf die Zeile öffnet das Projekt (Projekt.tsx: Leistungsnachweise,
 * Leistungen, Einstellungen). „Neues Projekt“ legt ein Projekt nur in den
 * Leistungsnachweisen an; für alle Bereiche gibt es die Projekte des
 * Controllings (Projektregister). „Excel-Import (alle Mitarbeiter)“ übernimmt
 * den Sammel-Export der Zeiterfassung. Archivierte Projekte stehen am Ende.
 */
import { useState } from 'react';
import { useArchivierte } from '../../../../gemeinsam/ProjektBereiche';
import { Icon } from '../../../../shared/icons';
import { useToast } from '../../../../shared/toast';
import { Badge, Card, CardHeader, EmptyState, Modal, Search } from '../../../../shared/ui';
import { ImportDialog } from '../../components/ImportDialog';
import { NachweisDialog } from '../../components/NachweisDialog';
import { ProjektDialog } from '../../components/ProjektDialog';
import { RasterwechselHinweis } from '../../components/RasterwechselHinweis';
import { RASTER_OPTIONEN, STATUS_TON, anzahl } from '../../components/common';
import { periodentexteNachRasterwechsel } from '../../domain/erfassung';
import { stundenVon } from '../../domain/nachweis';
import { PROJEKT_STATUS_LABEL, RASTER_LABEL, projektTitel, type Projekt, type Raster } from '../../domain/types';
import { stundenText } from '../../domain/zeitraum';
import type { Route } from '../../lib/router';
import { useStore } from '../../store/store';

export function ProjektListe({ navigate }: { navigate: (r: Route) => void }) {
  const { data, updateProjekt } = useStore();
  const toast = useToast();
  const [suche, setSuche] = useState('');
  const [neu, setNeu] = useState(false);
  const [importOffen, setImportOffen] = useState(false);
  const [erstellen, setErstellen] = useState<Projekt | null>(null);
  const [rasterwechsel, setRasterwechsel] = useState<{ projekt: Projekt; raster: Raster } | null>(null);
  const archiviert = useArchivierte('leistungsnachweise');

  const begriff = suche.trim().toLowerCase();
  const projekte = data.projekte
    .filter((p) => [p.nummer, p.name, p.kurzname, p.leistungsbereich].join(' ').toLowerCase().includes(begriff))
    .sort(
      (a, b) =>
        Number(archiviert.has(a.id)) - Number(archiviert.has(b.id)) ||
        a.nummer.localeCompare(b.nummer, 'de', { numeric: true }) ||
        a.name.localeCompare(b.name, 'de'),
    );
  const oeffne = (p: Projekt) => navigate({ view: 'controllingProjekt', projektId: p.id, tab: 'nachweise' });

  const rasterSetzen = (p: Projekt, raster: Raster) => {
    updateProjekt(p.id, { raster });
    toast(`${projektTitel(p)}: ${RASTER_LABEL[raster]}.`);
  };
  /** Raster aus der Tabelle – gelten danach gemeinsame Texte nicht mehr, erst nachfragen. */
  const rasterWaehlen = (p: Projekt, raster: Raster) => {
    if (raster === p.raster) return;
    if (periodentexteNachRasterwechsel(data, p.id, raster) > 0) setRasterwechsel({ projekt: p, raster });
    else rasterSetzen(p, raster);
  };

  return (
    <div className="stack">
      <div className="row-between wrap">
        <div className="row wrap">
          <Search value={suche} onChange={setSuche} placeholder="Projekt, Nummer …" />
          <span className="small tertiary">
            Die Mitarbeiter erfassen ihre Leistungen im Bereich Leistungsnachweise; hier werden die Nachweise erstellt,
            abgerechnet und exportiert.
          </span>
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
        <CardHeader titel="Projekte" sub={anzahl(projekte.length, 'Projekt', 'Projekte')} />
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
                  <th title="Gliederung der Leistungsnachweise und der Leistungstexte der Mitarbeiter">Nachweis</th>
                  <th className="ln-stunden">Stunden</th>
                  <th className="actions" />
                </tr>
              </thead>
              <tbody>
                {projekte.map((p) => {
                  const stunden = stundenVon(data.leistungen.filter((l) => l.projektId === p.id));
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
                      <td data-label="Nachweis" className="ln-co-raster" onClick={(e) => e.stopPropagation()}>
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
                      <td className="ln-stunden" data-label="Stunden">
                        {stundenText(stunden)}
                      </td>
                      <td className="actions">
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          title="Neuer Leistungsnachweis mit allen nicht abgerechneten Leistungen des Projekts"
                          onClick={(e) => {
                            e.stopPropagation();
                            setErstellen(p);
                          }}
                        >
                          <Icon name="plus" size={13} /> Leistungsnachweis erstellen
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
      {erstellen ? <NachweisDialog projekt={erstellen} onClose={() => setErstellen(null)} navigate={navigate} /> : null}
      {rasterwechsel ? (
        <Modal
          titel="Raster ändern?"
          sub={`${projektTitel(rasterwechsel.projekt)}: ${RASTER_LABEL[rasterwechsel.projekt.raster]} → ${RASTER_LABEL[rasterwechsel.raster]}`}
          onClose={() => setRasterwechsel(null)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setRasterwechsel(null)}>
                Abbrechen
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  rasterSetzen(rasterwechsel.projekt, rasterwechsel.raster);
                  setRasterwechsel(null);
                }}
              >
                Raster ändern
              </button>
            </>
          }
        >
          <RasterwechselHinweis projekt={rasterwechsel.projekt} raster={rasterwechsel.raster} />
        </Modal>
      ) : null}
    </div>
  );
}
