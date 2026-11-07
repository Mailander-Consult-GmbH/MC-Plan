/**
 * Projekt im Bereich: oben Projektnummer, Status und Leistungsbereich, darunter
 * die Reiter (wie in den anderen Bereichen, `.tabs`) „Leistungstexte“ (Vorgabe, pages/projekt/
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
import { Badge } from '../../../shared/ui';
import { STATUS_TON } from '../components/common';
import { vorgabeMonat } from '../domain/erfassung';
import { angemeldet } from '../domain/rechte';
import { PROJEKT_STATUS_LABEL, type Projekt } from '../domain/types';
import { istMonat } from '../domain/zeitraum';
import type { ProjektAnsicht, Route } from '../lib/router';
import { useStore } from '../store/store';
import { Leistungen } from './projekt/Leistungen';
import { MonatsErfassung } from './projekt/MonatsErfassung';

/** Reiter der Projektseite in ihrer Reihenfolge. */
const ANSICHTEN: { id: ProjektAnsicht; label: string; titel: string }[] = [
  { id: 'texte', label: 'Leistungstexte', titel: 'Gemeinsame Leistungstexte je Zeitraum und Bestätigung des Monats' },
  { id: 'leistungen', label: 'Meine Leistungen', titel: 'Eigene Leistungen im Kalender bzw. als Liste' },
];

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

  // Zuletzt gezeigter Monat der Leistungstexte – dorthin führt der Reiter zurück
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
      </div>

      <ArchivHinweis bereich="leistungsnachweise" lokaleId={projekt.id} />

      {/* Reiter wie in den anderen Bereichen (etwa „Planläufe“ und „Planliste“ im Planlaufmanagement) */}
      <div className="tabs" role="tablist" aria-label="Ansicht des Projekts">
        {ANSICHTEN.map((a) => (
          <button
            key={a.id}
            type="button"
            role="tab"
            aria-selected={a.id === ansicht}
            className={a.id === ansicht ? 'active' : ''}
            title={a.titel}
            onClick={() => umschalten(a.id)}
          >
            {a.label}
          </button>
        ))}
      </div>

      {ansicht === 'leistungen' ? (
        <Leistungen projekt={projekt} navigate={navigate} />
      ) : (
        <MonatsErfassung projekt={projekt} monat={gezeigt} navigate={navigate} />
      )}
    </div>
  );
}
