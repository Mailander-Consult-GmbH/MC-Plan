/**
 * Hinweis beim Wechsel des Rasters eines Projekts – in den „Einstellungen“
 * des Projekts (nur Controlling). Das Raster des Projekts gibt nicht nur die
 * Zeilen des offenen und neuer Leistungsnachweise vor, es
 * gliedert auch die gemeinsamen Leistungstexte der Mitarbeiter
 * (domain/erfassung.ts): Texte des bisherigen Rasters in Zeiträumen, die noch
 * nicht abgerechnet sind, gelten danach nicht mehr
 * (`periodentexteNachRasterwechsel`) – offene Leistungsnachweise übernehmen
 * sie nicht mehr, und Bestätigungen, deren Stand sie enthielt, erlöschen. Sie
 * bleiben gespeichert und gelten wieder, wenn das Raster zurückgestellt wird.
 * Abgeschlossene Nachweise gliedern die Texte weiter im Raster ihres
 * Abschlusses (`NachweisStand.erfassungsRaster`); erst „Wieder öffnen“ rechnet
 * sie im neuen. Nichts, solange es keine betroffenen Texte gibt.
 */
import { useMemo } from 'react';
import { Callout } from '../../../shared/ui';
import { monatsStatus, periodentexteNachRasterwechsel } from '../domain/erfassung';
import { RASTER_KURZ, type LeistungsnachweisDaten, type Projekt, type Raster } from '../domain/types';
import { useStore } from '../store/store';
import { anzahl } from './common';

/** „je Woche“ – wie die Mitarbeiter ihre Texte im neuen Raster gliedern. */
const JE: Record<Raster, string> = { tag: 'je Tag', woche: 'je Woche', monat: 'je Monat' };

/**
 * Bestätigungen des Projekts, die heute gelten und nach dem Wechsel auf
 * `raster` erloschen wären – gerechnet auf einem Bestand mit dem neuen Raster.
 */
function erloescheneBestaetigungen(daten: LeistungsnachweisDaten, projektId: string, raster: Raster): number {
  const bestaetigungen = (daten.bestaetigungen ?? []).filter((b) => b.projektId === projektId);
  if (bestaetigungen.length === 0) return 0;
  const danach: LeistungsnachweisDaten = { ...daten, projekte: daten.projekte.map((p) => (p.id === projektId ? { ...p, raster } : p)) };
  return bestaetigungen.filter(
    (b) =>
      monatsStatus(daten, projektId, b.mitarbeiterId, b.monat).status === 'bestaetigt' &&
      monatsStatus(danach, projektId, b.mitarbeiterId, b.monat).status !== 'bestaetigt',
  ).length;
}

export function RasterwechselHinweis({ projekt, raster }: { projekt: Projekt; raster: Raster }) {
  const { data } = useStore();
  const folgen = useMemo(() => {
    const texte = periodentexteNachRasterwechsel(data, projekt.id, raster);
    return { texte, erloschen: texte ? erloescheneBestaetigungen(data, projekt.id, raster) : 0 };
  }, [data, projekt.id, raster]);
  if (raster === projekt.raster || folgen.texte === 0) return null;
  const eins = folgen.texte === 1;
  return (
    // Abstand zum Formular darüber – in den Einstellungen wie im Dialog
    <div style={{ marginTop: 14 }}>
      <Callout ton="warn" icon="!">
      {eins ? '1 gemeinsamer Leistungstext' : `${folgen.texte} gemeinsame Leistungstexte`} der Mitarbeiter{' '}
      {eins ? 'gehört' : 'gehören'} zum bisherigen Raster „{RASTER_KURZ[projekt.raster]}“ und {eins ? 'gilt' : 'gelten'} im
      Raster „{RASTER_KURZ[raster]}“ nicht mehr: Offene Leistungsnachweise übernehmen {eins ? 'ihn' : 'sie'} nicht mehr, und
      die Mitarbeiter verfassen ihre Texte {JE[raster]} neu
      {folgen.erloschen ? ` – ${anzahl(folgen.erloschen, 'Bestätigung erlischt', 'Bestätigungen erlöschen')}` : ''}.{' '}
      {eins ? 'Er bleibt' : 'Sie bleiben'} gespeichert und {eins ? 'gilt' : 'gelten'} wieder, wenn das Raster zurückgestellt
      wird. Abgeschlossene Leistungsnachweise behalten ihren Stand samt den Texten der Mitarbeiter; nach „Wieder öffnen“
      gilt auch dort das neue Raster.
      </Callout>
    </div>
  );
}
