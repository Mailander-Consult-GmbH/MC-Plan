/** Platzhalter – wird durch die Umsetzung der Plancodierung ersetzt. */
import type { Plancodierung } from './types';

export function standardPlancodierung(_neueId: (p: string) => string): Plancodierung {
  return { kategorien: [], hinweis: '' };
}

export function plancodierungHtml(_pc: Plancodierung, _kopf: string): string {
  return '';
}
