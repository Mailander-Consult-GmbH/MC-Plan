/**
 * Karte „Plancodierung“ im Reiter „Pflichtenheft“: das Schema der
 * Plancodierung (Anlage „Plancodierung“). Die Planliste prüft die
 * Plancodierungen der Pläne gegen dieses Schema (domain/plancodierung.ts).
 */
import type { Pflichtenheft, Project } from '../../../domain/types';
import { Card, CardHeader } from '../../../../../shared/ui';
import { PlancodierungEditor } from './PlancodierungEditor';

export function PlancodierungKarte({
  ph,
  aendern,
}: {
  project: Project;
  ph: Pflichtenheft;
  aendern: (fn: (p: Pflichtenheft) => Pflichtenheft) => void;
}) {
  return (
    <Card>
      <CardHeader titel="Plancodierung" sub="Schema der Plancodierung – die Planliste prüft die Plancodierungen danach" />
      <div className="card-pad">
        <PlancodierungEditor wert={ph.plancodierung} onChange={(pc) => aendern((p) => ({ ...p, plancodierung: pc }))} />
      </div>
    </Card>
  );
}
