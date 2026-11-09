/**
 * Verzeichnis der Bereiche. Jeder Bereich ist in sich geschlossen: eigener
 * Datenbestand, eigene Einstellungen, eigener Router. Hier steht nur, was die
 * Bereichsauswahl anzeigen muss – die Bereiche selbst wissen nichts
 * voneinander. Gemeinsam ist ihnen nur das Projektregister (`src/gemeinsam/`),
 * das das Controlling verwaltet.
 */
import type { IconName } from '../shared/icons';

export type BereichId = 'planlauf' | 'baubetrieb' | 'projektsteuerung' | 'leistungsnachweise' | 'controlling';

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
  {
    id: 'leistungsnachweise',
    titel: 'Leistungsnachweise',
    untertitel: 'Stunden und Leistungen je Projekt',
    icon: 'stunden',
    marke: 'Erster Entwurf',
  },
  {
    id: 'controlling',
    titel: 'Controlling',
    untertitel: 'Projekte aller Bereiche',
    icon: 'schloss',
    marke: 'Mit PIN',
  },
];

export const BEREICH_IDS: BereichId[] = BEREICHE.map((b) => b.id);

export function bereichInfo(id: BereichId): Bereich {
  return BEREICHE.find((b) => b.id === id)!;
}
