/**
 * Verzeichnis der Bereiche. Jeder Bereich ist in sich geschlossen: eigener
 * Datenbestand, eigene Einstellungen, eigener Router. Hier steht nur, was die
 * Bereichsauswahl anzeigen muss – die Bereiche selbst wissen nichts
 * voneinander. Gemeinsam ist ihnen nur das Projektregister (`src/gemeinsam/`),
 * das das Controlling verwaltet.
 */
import type { IconName } from '../shared/icons';

export type BereichId = 'planlauf' | 'baubetrieb' | 'projektsteuerung' | 'controlling';

export interface Bereich {
  id: BereichId;
  titel: string;
  untertitel?: string;
  beschreibung: string;
  icon: IconName;
  /** Kennzeichen auf der Kachel, etwa für einen Bereich im Entwurfsstand. */
  marke?: string;
}

export const BEREICHE: Bereich[] = [
  {
    id: 'planlauf',
    titel: 'Planlaufmanagement',
    untertitel: 'Projekte, Planläufe und Fristen',
    beschreibung:
      'Planverzeichnisse und Planpakete verwalten, Planläufe nach Workflow abarbeiten und Fristen im Blick behalten.',
    icon: 'plan',
  },
  {
    id: 'baubetrieb',
    titel: 'Baubetriebsplanung',
    untertitel: 'Anmeldungen für Sperrpausen',
    beschreibung:
      'Baubetriebliche Anmeldungen je Projekt durch anpassbare Workflows – SKM, MKM, KM und KKM – verfolgen, mit Terminfristen und Nachhak-Terminen.',
    icon: 'kalender',
    marke: 'Erster Entwurf',
  },
  {
    id: 'projektsteuerung',
    titel: 'Projektsteuerung',
    untertitel: 'Beteiligte und Protokolle',
    beschreibung:
      'Projektbeteiligte mit projektübergreifenden Funktionen führen, Besprechungen protokollieren und offene Punkte in einer fortgeschriebenen Liste verfolgen.',
    icon: 'protokoll',
    marke: 'Erster Entwurf',
  },
  {
    id: 'controlling',
    titel: 'Controlling',
    untertitel: 'Projekte aller Bereiche',
    beschreibung:
      'Projekte für alle Bereiche anlegen, in Bereiche übernehmen, je Bereich oder ganz archivieren und löschen.',
    icon: 'schloss',
    marke: 'Mit PIN',
  },
];

export const BEREICH_IDS: BereichId[] = BEREICHE.map((b) => b.id);

export function bereichInfo(id: BereichId): Bereich {
  return BEREICHE.find((b) => b.id === id)!;
}
