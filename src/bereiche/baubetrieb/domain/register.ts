/**
 * Anbindung an das Projektregister (`src/gemeinsam/`). Die
 * Baubetriebsplanung teilt ihre Projekte mit den anderen Bereichen; als
 * Projektnummer gilt die MIC-Projektnummer (wiko). Eigene Personen führt sie
 * nicht – die Projektbeteiligten liest die Projektseite direkt aus dem Register.
 */
import type { Plan, Sicht } from '../../../gemeinsam/abgleich';
import type { BaubetriebDaten, Projekt } from './types';

export function sichtFuerRegister(d: BaubetriebDaten): Sicht {
  return {
    projekte: d.projekte.map((p) => ({ id: p.id, nummer: p.projektnummer, name: p.name, beschreibung: null })),
    personen: null,
  };
}

/** Übernimmt den Plan aus dem Abgleich; ändert er nichts, bleibt der Bestand derselbe. */
export function registerPlanAnwenden(daten: BaubetriebDaten, plan: Plan): BaubetriebDaten {
  let d = daten;

  if (plan.projekteLoeschen.length > 0) {
    const weg = new Set(plan.projekteLoeschen);
    if (d.projekte.some((p) => weg.has(p.id))) {
      d = {
        ...d,
        projekte: d.projekte.filter((p) => !weg.has(p.id)),
        anmeldungen: d.anmeldungen.filter((a) => !weg.has(a.projektId)),
      };
    }
  }

  const neue: Projekt[] = plan.projekteAnlegen
    .filter((x) => !d.projekte.some((p) => p.id === x.id))
    .map(({ id, projekt }) => ({
      id,
      name: projekt.name || 'Ohne Bezeichnung',
      projektleiter: '',
      dbGNummer: '',
      ersterAnmeldetermin: null,
      erstePhase: 'skm',
      fahrplanjahre: [],
      inbetriebnahme: null,
      hauptbearbeiter: d.einstellungen.bearbeiter,
      projektnummer: projekt.nummer,
      status: 'aktiv',
      markiert: true,
      bemerkung: '',
    }));
  if (neue.length > 0) d = { ...d, projekte: [...d.projekte, ...neue] };

  for (const a of plan.projekteAendern) {
    const p = d.projekte.find((x) => x.id === a.id);
    if (!p || (p.projektnummer === a.nummer && p.name === a.name)) continue;
    d = { ...d, projekte: d.projekte.map((x) => (x.id === a.id ? { ...x, projektnummer: a.nummer, name: a.name } : x)) };
  }

  return d;
}
