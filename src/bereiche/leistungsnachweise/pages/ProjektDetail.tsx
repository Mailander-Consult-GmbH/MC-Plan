/**
 * Projekt im Bereich: die eigenen Leistungen der angemeldeten Person – mehr
 * gibt es hier nicht. Darüber Projektnummer, Status und Leistungsbereich.
 * Leistungsnachweise, Einstellungen, Bearbeiten und Löschen liegen im
 * Controlling (pages/controlling/Projekt.tsx).
 */
import { ArchivHinweis } from '../../../gemeinsam/ProjektBereiche';
import { Badge } from '../../../shared/ui';
import { STATUS_TON } from '../components/common';
import { PROJEKT_STATUS_LABEL, type Projekt } from '../domain/types';
import type { Route } from '../lib/router';
import { Leistungen } from './projekt/Leistungen';

export function ProjektDetail({ projekt, navigate }: { projekt: Projekt; navigate: (r: Route) => void }) {
  return (
    <div className="stack">
      <div className="ln-projektkopf">
        <div className="ln-projektinfo">
          {projekt.nummer ? <span className="mono tertiary">{projekt.nummer}</span> : null}
          <Badge ton={STATUS_TON[projekt.status]}>{PROJEKT_STATUS_LABEL[projekt.status]}</Badge>
          {projekt.leistungsbereich ? <span className="small muted">{projekt.leistungsbereich}</span> : null}
        </div>
      </div>

      <ArchivHinweis bereich="leistungsnachweise" lokaleId={projekt.id} />

      <Leistungen projekt={projekt} navigate={navigate} />
    </div>
  );
}
