/**
 * Anbindung an das Projektregister (`src/gemeinsam/`): Die
 * Leistungsnachweise teilen ihre Projekte (Projektnummer, Bezeichnung,
 * Beschreibung) mit den anderen Bereichen. Personen teilt der Bereich nicht –
 * seine Mitarbeiter sind keine Projektbeteiligten.
 *
 * Ein aus dem Register übernommenes Projekt erhält die Vorgaben eines
 * importierten Projekts (`IMPORT_PROJEKT_VORGABEN`: Leistungsbereich, Raster,
 * Zeitraumregel).
 */
import type { Plan, Sicht } from '../../../gemeinsam/abgleich';
import { IMPORT_PROJEKT_VORGABEN } from './import';
import type { LeistungsnachweisDaten, Projekt } from './types';

export function sichtFuerRegister(d: LeistungsnachweisDaten): Sicht {
  return {
    projekte: d.projekte.map((p) => ({ id: p.id, nummer: p.nummer, name: p.name, beschreibung: p.beschreibung })),
    personen: null,
  };
}

/** Übernimmt den Plan aus dem Abgleich; ändert er nichts, bleibt der Bestand derselbe. */
export function registerPlanAnwenden(daten: LeistungsnachweisDaten, plan: Plan): LeistungsnachweisDaten {
  let d = daten;

  // Gelöschte Projekte samt Leistungen und Nachweisen
  if (plan.projekteLoeschen.length > 0) {
    const weg = new Set(plan.projekteLoeschen);
    if (d.projekte.some((p) => weg.has(p.id))) {
      d = {
        ...d,
        projekte: d.projekte.filter((p) => !weg.has(p.id)),
        leistungen: d.leistungen.filter((l) => !weg.has(l.projektId)),
        nachweise: d.nachweise.filter((n) => !weg.has(n.projektId)),
      };
    }
  }

  const neue: Projekt[] = plan.projekteAnlegen
    .filter((x) => !d.projekte.some((p) => p.id === x.id))
    .map(({ id, projekt }) => ({
      id,
      nummer: projekt.nummer,
      name: projekt.name || 'Ohne Bezeichnung',
      kurzname: '',
      status: 'aktiv',
      markiert: true,
      beschreibung: projekt.beschreibung,
      ...IMPORT_PROJEKT_VORGABEN,
      abschnitte: [],
      logos: null,
    }));
  if (neue.length > 0) d = { ...d, projekte: [...d.projekte, ...neue] };

  for (const a of plan.projekteAendern) {
    const p = d.projekte.find((x) => x.id === a.id);
    if (!p || (p.nummer === a.nummer && p.name === a.name && p.beschreibung === a.beschreibung)) continue;
    d = {
      ...d,
      projekte: d.projekte.map((x) => (x.id === a.id ? { ...x, nummer: a.nummer, name: a.name, beschreibung: a.beschreibung } : x)),
    };
  }

  return d;
}
