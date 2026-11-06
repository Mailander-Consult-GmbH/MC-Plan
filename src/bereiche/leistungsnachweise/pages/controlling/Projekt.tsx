/**
 * Projekt im Controlling der Leistungsnachweise mit drei Reitern:
 * „Leistungsnachweise“ (ProjektNachweise.tsx – ein Klick öffnet die
 * Abrechnung), „Leistungen“ (die aller Mitarbeiter, nur lesen) und
 * „Einstellungen“ (Nachweis-Vorgaben, Abschnitte, Logos). Darüber
 * Projektnummer, Status, Raster und Leistungsbereich sowie „Bearbeiten“ und
 * „Löschen“ – im Bereich gibt es davon nichts, dort erfassen die Mitarbeiter
 * nur ihre Leistungen (domain/rechte.ts).
 */
import { useState } from 'react';
import { Icon } from '../../../../shared/icons';
import { useToast } from '../../../../shared/toast';
import { Badge, Card, ConfirmDialog, EmptyState } from '../../../../shared/ui';
import { ProjektDialog } from '../../components/ProjektDialog';
import { RasterBadge, STATUS_TON, anzahl } from '../../components/common';
import { PROJEKT_STATUS_LABEL, ZEITRAUMREGEL_LABEL, projektKurzname, projektTitel } from '../../domain/types';
import type { ProjektTab, Route } from '../../lib/router';
import { useStore } from '../../store/store';
import { Leistungen } from '../projekt/Leistungen';
import { ProjektEinstellungen } from './ProjektEinstellungen';
import { ProjektNachweise } from './ProjektNachweise';

const TABS: { id: ProjektTab; label: string; titel: string }[] = [
  { id: 'nachweise', label: 'Leistungsnachweise', titel: 'Leistungsnachweise des Projekts – Klick öffnet die Abrechnung' },
  { id: 'leistungen', label: 'Leistungen', titel: 'Leistungen aller Mitarbeiter – nur lesen' },
  { id: 'einstellungen', label: 'Einstellungen', titel: 'Vorgaben für Leistungsnachweise, Abschnitte und Logos' },
];

export function ControllingProjekt({
  projektId,
  tab,
  navigate,
}: {
  projektId: string;
  tab: ProjektTab;
  navigate: (r: Route) => void;
}) {
  const { data, deleteProjekt } = useStore();
  const toast = useToast();
  const [bearbeiten, setBearbeiten] = useState(false);
  const [loeschen, setLoeschen] = useState(false);
  const projekt = data.projekte.find((p) => p.id === projektId);

  if (!projekt) {
    return (
      <Card>
        <EmptyState
          icon="projekt"
          titel="Nicht gefunden"
          text="Das Projekt existiert nicht (mehr) – etwa weil es gelöscht wurde."
          action={
            <button type="button" className="btn btn-primary" onClick={() => navigate({ view: 'controlling', tab: 'projekte' })}>
              Zu den Projekten
            </button>
          }
        />
      </Card>
    );
  }

  const umfang = {
    nachweise: data.nachweise.filter((n) => n.projektId === projekt.id).length,
    leistungen: data.leistungen.filter((l) => l.projektId === projekt.id).length,
  };
  const kurzname = projektKurzname(projekt);

  return (
    <div className="stack">
      <div className="ln-co-leiste">
        <div className="row wrap">
          <button type="button" className="btn btn-ghost" onClick={() => navigate({ view: 'controlling', tab: 'projekte' })}>
            <Icon name="zurueck" size={14} /> Alle Projekte
          </button>
          <h2 className="ln-co-projekttitel truncate">{projektTitel(projekt)}</h2>
        </div>
        <div className="row">
          <button type="button" className="btn btn-sm btn-outline" onClick={() => setBearbeiten(true)}>
            <Icon name="bearbeiten" size={12} /> Bearbeiten
          </button>
          <button type="button" className="btn btn-sm btn-danger" onClick={() => setLoeschen(true)}>
            <Icon name="loeschen" size={12} /> Löschen
          </button>
        </div>
      </div>

      <div className="ln-projektinfo">
        <Badge ton={STATUS_TON[projekt.status]}>{PROJEKT_STATUS_LABEL[projekt.status]}</Badge>
        <span title={`Neue Nachweise: ${ZEITRAUMREGEL_LABEL[projekt.zeitraumregel]}`}>
          <RasterBadge raster={projekt.raster} />
        </span>
        <span className="small muted">{ZEITRAUMREGEL_LABEL[projekt.zeitraumregel]}</span>
        {projekt.leistungsbereich ? <span className="small muted">{projekt.leistungsbereich}</span> : null}
        {kurzname !== projekt.name ? (
          <span className="small tertiary truncate" title="Bezeichnung im Nachweis">
            im Nachweis: {kurzname}
          </span>
        ) : null}
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={t.id === tab ? 'active' : ''}
            title={t.titel}
            onClick={() => navigate({ view: 'controllingProjekt', projektId: projekt.id, tab: t.id })}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'nachweise' ? <ProjektNachweise projekt={projekt} navigate={navigate} /> : null}
      {tab === 'leistungen' ? <Leistungen projekt={projekt} navigate={navigate} /> : null}
      {tab === 'einstellungen' ? <ProjektEinstellungen projekt={projekt} /> : null}

      {bearbeiten ? <ProjektDialog projekt={projekt} onClose={() => setBearbeiten(false)} /> : null}

      {loeschen ? (
        <ConfirmDialog
          titel="Projekt löschen?"
          text={`„${projekt.name}“ wird mit ${anzahl(umfang.nachweise, 'Leistungsnachweis', 'Leistungsnachweisen')} und ${anzahl(
            umfang.leistungen,
            'Leistung',
            'Leistungen',
          )} aus den Leistungsnachweisen gelöscht. In anderen Bereichen bleibt es erhalten.`}
          onConfirm={() => {
            deleteProjekt(projekt.id);
            toast('Projekt gelöscht.');
            navigate({ view: 'controlling', tab: 'projekte' });
          }}
          onClose={() => setLoeschen(false)}
        />
      ) : null}
    </div>
  );
}
