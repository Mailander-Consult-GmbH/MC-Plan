/**
 * Projekt im Bereich: oben Projektnummer, Status und Leistungsbereich, daneben
 * der Umschalter zwischen „Leistungstexte“ (Vorgabe, pages/projekt/
 * MonatsErfassung.tsx – gemeinsame Texte je Zeitraum und Monatsbestätigung)
 * und „Meine Leistungen“ (pages/projekt/Leistungen.tsx – Kalender und Liste
 * der eigenen Leistungen). Die Ansicht steht in der Adresse
 * (`Route.ansicht`, `Route.monat`): Ohne Monat zeigen die Leistungstexte den
 * Vorgabemonat (`vorgabeMonat`) – einmal beim Öffnen des Projekts bestimmt,
 * damit die Seite nach dem Bestätigen nicht in einen anderen Monat springt;
 * zurück aus „Meine Leistungen“ geht es in den zuletzt gezeigten Monat.
 * Leistungsnachweise, Einstellungen, Bearbeiten und Löschen liegen im
 * Controlling (pages/controlling/Projekt.tsx).
 */
import { useEffect, useRef, useState } from 'react';
import { ArchivHinweis } from '../../../gemeinsam/ProjektBereiche';
import { today } from '../../../shared/dates';
import { Badge, Segmented } from '../../../shared/ui';
import { STATUS_TON } from '../components/common';
import { vorgabeMonat } from '../domain/erfassung';
import { angemeldet } from '../domain/rechte';
import { PROJEKT_STATUS_LABEL, type Projekt } from '../domain/types';
import { istMonat } from '../domain/zeitraum';
import type { ProjektAnsicht, Route } from '../lib/router';
import { useStore } from '../store/store';
import { Leistungen } from './projekt/Leistungen';
import { MonatsErfassung } from './projekt/MonatsErfassung';

export function ProjektDetail({
  projekt,
  ansicht = 'texte',
  monat,
  navigate,
}: {
  projekt: Projekt;
  ansicht?: ProjektAnsicht;
  /** JJJJ-MM aus der Adresse; ohne Angabe der Vorgabemonat. */
  monat?: string;
  navigate: (r: Route) => void;
}) {
  const { data } = useStore();
  const ichId = angemeldet(data)?.id ?? null;
  // Vorgabemonat einmal je Person bestimmen (die Anmeldung kann nach dem ersten Zeichnen kommen)
  const [vorgabe, setVorgabe] = useState(() => ({ fuer: ichId, monat: vorgabeMonat(data, projekt.id, ichId, today()) }));
  if (vorgabe.fuer !== ichId) setVorgabe({ fuer: ichId, monat: vorgabeMonat(data, projekt.id, ichId, today()) });
  const gezeigt = monat && istMonat(monat) ? monat : vorgabe.monat;

  // Zuletzt gezeigter Monat der Leistungstexte – dorthin führt der Umschalter zurück
  const zuletzt = useRef(gezeigt);
  useEffect(() => {
    if (ansicht === 'texte') zuletzt.current = gezeigt;
  }, [ansicht, gezeigt]);

  const umschalten = (a: ProjektAnsicht) => {
    if (a === ansicht) return;
    navigate(
      a === 'leistungen'
        ? { view: 'projekt', projektId: projekt.id, ansicht: 'leistungen' }
        : { view: 'projekt', projektId: projekt.id, monat: zuletzt.current },
    );
  };

  return (
    <div className="stack">
      <div className="ln-projektkopf">
        <div className="ln-projektinfo">
          {projekt.nummer ? <span className="mono tertiary">{projekt.nummer}</span> : null}
          <Badge ton={STATUS_TON[projekt.status]}>{PROJEKT_STATUS_LABEL[projekt.status]}</Badge>
          {projekt.leistungsbereich ? <span className="small muted">{projekt.leistungsbereich}</span> : null}
        </div>
        <Segmented<ProjektAnsicht>
          value={ansicht}
          onChange={umschalten}
          options={[
            { value: 'texte', label: 'Leistungstexte' },
            { value: 'leistungen', label: 'Meine Leistungen' },
          ]}
        />
      </div>

      <ArchivHinweis bereich="leistungsnachweise" lokaleId={projekt.id} />

      {ansicht === 'leistungen' ? (
        <Leistungen projekt={projekt} navigate={navigate} />
      ) : (
        <MonatsErfassung projekt={projekt} monat={gezeigt} navigate={navigate} />
      )}
    </div>
  );
}
