/** Platzhalter – wird durch die Umsetzung des Ablaufdiagramms ersetzt. */
import type { ProcessTemplateStep } from './types';
import { dauerImStandardverlauf } from './workflowGraph';

export function ablaufDiagrammSvg(
  steps: ProcessTemplateStep[],
  _optionen: { einheit: 'AT' | 'KT'; funktionsName?: (roleName: string) => string },
): { svg: string; dauer: number } {
  return { svg: '', dauer: dauerImStandardverlauf(steps) };
}
