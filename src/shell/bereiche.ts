/**
 * Verzeichnis der Bereiche. Jeder Bereich ist in sich geschlossen: eigener
 * Datenbestand, eigene Einstellungen, eigener Router. Hier steht nur, was die
 * Bereichsauswahl anzeigen muss – die Bereiche selbst wissen nichts
 * voneinander. Gemeinsam sind ihnen nur das Projektregister und „Angemeldet
 * als“ (`src/gemeinsam/`).
 */
import type { IconName } from '../shared/icons';

export type BereichId = 'planlauf' | 'baubetrieb' | 'projektsteuerung';

export interface Bereich {
  id: BereichId;
  titel: string;
  untertitel?: string;
  icon: IconName;
  /** Kennzeichen auf der Kachel, etwa für einen Bereich im Entwurfsstand. */
  marke?: string;
}

export const BEREICHE: Bereich[] = [
  {
    id: 'planlauf',
    titel: 'Planlaufmanagement',
    untertitel: 'Projekte, Planläufe und Fristen',
    icon: 'plan',
  },
  {
    id: 'baubetrieb',
    titel: 'Baubetriebsplanung',
    untertitel: 'Anmeldungen für Sperrpausen',
    icon: 'kalender',
    marke: 'Erster Entwurf',
  },
  {
    id: 'projektsteuerung',
    titel: 'Projektsteuerung',
    untertitel: 'Beteiligte und Protokolle',
    icon: 'protokoll',
    marke: 'Erster Entwurf',
  },
];

export const BEREICH_IDS: BereichId[] = BEREICHE.map((b) => b.id);

export function bereichInfo(id: BereichId): Bereich {
  return BEREICHE.find((b) => b.id === id)!;
}
