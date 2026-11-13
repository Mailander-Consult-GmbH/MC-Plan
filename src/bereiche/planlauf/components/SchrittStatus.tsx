/**
 * Gemeinsame Schrittaktionen für Planlauf und Übersichtslisten.
 *
 * `useSchrittStatus` kapselt den Statuswechsel samt Erfassung der Freigabe-
 * bzw. Prüfbericht-Nummer und bietet nach einem Abschluss den Dialog
 * „E-Mail senden“ an – wenn die E-Mail-Regeln des Workflows dafür E-Mails
 * vorsehen (domain/mailRegeln.ts) und die Nachfrage nicht abgeschaltet ist.
 * Geschrieben wird ausschließlich über den Store (schritteAbschliessen,
 * wiederOeffnen, aenderungenAnwenden). Die zurückgegebenen Dialoge müssen in
 * der jeweiligen Seite gerendert werden; `ErledigtButton` ist der kleine Haken,
 * mit dem sich ein anstehender Schritt direkt aus einer Liste heraus erledigen
 * lässt – bei mehreren anstehenden Schritten (parallele Zweige) mit Auswahl.
 */
import { useRef, useState } from 'react';
import { aenderungenAufLauf, schrittStatusSetzen, type Abschluss } from '../domain/abschluss';
import { istErledigt, massgeblicheAntwort } from '../domain/ablauf';
import { kontextFuer } from '../domain/bestand';
import { mailVorschlaege, type MailEreignis } from '../domain/mailRegeln';
import { NACHWEIS_LABEL, type ID, type PlanRun, type RunStep, type StepStatus } from '../domain/types';
import { useStore } from '../store/store';
import { useToast } from '../../../shared/toast';
import { Field, Modal, TextInput, beiEnter } from '../../../shared/ui';
import { NeuZustaendig } from './NeuZustaendig';
import { Icon } from '../../../shared/icons';
import { AufklappMenue } from '../../../shared/menue';
import './planlauf.css';

export function useSchrittStatus() {
  const { data, aenderungenAnwenden, schritteAbschliessen, wiederOeffnen } = useStore();
  const toast = useToast();
  const [nachweisFuer, setNachweisFuer] = useState<{ runId: ID; stepId: ID; status: StepStatus } | null>(null);
  const [neu, setNeu] = useState<MailEreignis[] | null>(null);

  /** Setzt den Status eines Schritts (gelesen frisch aus dem Bestand); Ergebnis wie schrittStatusSetzen. */
  const ausfuehren = (runId: ID, stepId: ID, status: StepStatus, nachweisNummer?: string): Abschluss | null => {
    const run = data.runs.find((r) => r.id === runId);
    const step = run?.steps.find((s) => s.id === stepId);
    if (!run || !step) return null;
    const abschluss = status === 'erledigt' || status === 'uebersprungen';
    let ergebnis: Abschluss | null;
    if (abschluss) {
      ergebnis =
        schritteAbschliessen([
          { runId, stepId, status, nachweisNummer, antwortId: step.gewaehlteAntwortId ?? undefined },
        ])[0]?.ergebnis ?? null;
      if (!ergebnis) toast(`„${step.name}“ steht nicht an.`);
    } else if (istErledigt(step)) {
      ergebnis = wiederOeffnen(runId, stepId);
    } else {
      ergebnis = schrittStatusSetzen(run, step, status, nachweisNummer, { kontext: kontextFuer(data, run) });
      if (ergebnis.art === 'aenderung') aenderungenAnwenden(runId, ergebnis.aenderungen);
    }
    if (!ergebnis) return null;
    if (ergebnis.art === 'nachweis') {
      setNachweisFuer({ runId, stepId, status });
      return ergebnis;
    }
    toast(ergebnis.meldung);

    // Nach einem Abschluss: die E-Mails anbieten, die der Workflow dafür vorsieht
    if (abschluss && (data.bearbeiter?.mailNachfrage ?? true)) {
      const ereignis: MailEreignis = {
        runId,
        stepId,
        status: status === 'uebersprungen' ? 'uebersprungen' : 'erledigt',
        // Die Antwort von vor dem Abschluss – führt sie zurück, ist der Schritt danach schon zurückgesetzt
        antwortId: step.typ === 'entscheidung' ? (massgeblicheAntwort(step)?.id ?? null) : null,
        neu: ergebnis.naechste.map((s) => s.id),
      };
      // Stand nach dem Abschluss (die Termine rechnet der Store): Ist überhaupt eine E-Mail vorgesehen?
      const aenderungen = ergebnis.aenderungen;
      const danach = { ...data, runs: data.runs.map((r) => (r.id === runId ? aenderungenAufLauf(r, aenderungen) : r)) };
      if (mailVorschlaege(danach, [ereignis]).length > 0) setNeu([ereignis]);
    }
    return ergebnis;
  };

  /** Bisherige Form: Lauf und Schritt als Objekte (gelesen wird trotzdem frisch über die IDs). */
  const setzeStatus = (run: PlanRun, step: RunStep, status: StepStatus, nachweisNummer?: string) =>
    ausfuehren(run.id, step.id, status, nachweisNummer);

  /** Erledigt (bzw. überspringt) einen anstehenden Schritt. */
  const erledigen = (runId: ID, stepId: ID, status: 'erledigt' | 'uebersprungen' = 'erledigt') =>
    ausfuehren(runId, stepId, status);

  const nachweisStep = nachweisFuer
    ? data.runs.find((r) => r.id === nachweisFuer.runId)?.steps.find((s) => s.id === nachweisFuer.stepId)
    : undefined;

  const nachweisDialog = (
    <>
      {nachweisFuer && nachweisStep ? (
        <NachweisDialog
          step={nachweisStep}
          onClose={() => setNachweisFuer(null)}
          onErfassen={(nummer) => ausfuehren(nachweisFuer.runId, nachweisFuer.stepId, nachweisFuer.status, nummer)}
        />
      ) : null}

      {neu ? <NeuZustaendig ereignisse={neu} onClose={() => setNeu(null)} /> : null}
    </>
  );

  return { setzeStatus, erledigen, nachweisDialog };
}

/**
 * Haken zum direkten Erledigen eines anstehenden Schritts aus einer Liste.
 *
 * Neue Form: `runId` und `stepIds` (alle anstehenden Schritte des Laufs); bei
 * mehreren fragt ein kleines Menü, welcher erledigt ist. Ohne `onErledigen`
 * erledigt der Haken selbst (samt Nachweis-Nr. und „E-Mail senden“).
 * Bisherige Form: `run`, `step` und `onErledigen(run, step)`.
 */
export function ErledigtButton(
  props:
    | {
        runId: ID;
        stepIds: ID[];
        onErledigen?: (runId: ID, stepId: ID) => void;
        run?: undefined;
        step?: undefined;
      }
    | {
        run: PlanRun;
        step: RunStep;
        onErledigen: (run: PlanRun, step: RunStep) => void;
        runId?: undefined;
        stepIds?: undefined;
      },
) {
  const { data } = useStore();
  const eigen = useSchrittStatus();
  const [menue, setMenue] = useState(false);
  const knopf = useRef<HTMLButtonElement>(null);

  const runId = props.run ? props.run.id : props.runId;
  const ids = props.step ? [props.step.id] : props.stepIds;
  const run = data.runs.find((r) => r.id === runId) ?? props.run;
  const schritte = ids.flatMap((id) => {
    const s = run?.steps.find((x) => x.id === id) ?? (props.step?.id === id ? props.step : undefined);
    return s ? [s] : [];
  });
  const selbst = !props.run && !props.onErledigen;

  const erledige = (stepId: ID) => {
    setMenue(false);
    if (props.run) {
      const s = schritte.find((x) => x.id === stepId) ?? props.step;
      props.onErledigen(run ?? props.run, s);
    } else if (props.onErledigen) {
      props.onErledigen(props.runId, stepId);
    } else {
      eigen.erledigen(props.runId, stepId);
    }
  };

  if (schritte.length === 0) return null;
  const einer = schritte.length === 1;

  return (
    <span className="pl-haken" onClick={(e) => e.stopPropagation()}>
      <button
        ref={knopf}
        type="button"
        className="btn btn-sm btn-haken"
        title={
          einer
            ? `„${schritte[0].name}“ als erledigt vermerken`
            : `${schritte.length} Schritte stehen an – einen davon als erledigt vermerken`
        }
        aria-label="Schritt als erledigt vermerken"
        aria-haspopup={einer ? undefined : 'menu'}
        aria-expanded={einer ? undefined : menue}
        onClick={() => (einer ? erledige(schritte[0].id) : setMenue((m) => !m))}
      >
        <Icon name="check" size={13} />
      </button>
      {menue ? (
        <AufklappMenue
          anker={knopf}
          titel="Welcher Schritt ist erledigt?"
          eintraege={schritte.map((s) => ({
            key: s.id,
            inhalt: (
              <>
                {s.name}
                {s.roleName ? <span className="tertiary"> · {s.roleName}</span> : null}
              </>
            ),
            onWaehle: () => erledige(s.id),
          }))}
          onSchliessen={(fokusZurueck) => {
            setMenue(false);
            if (fokusZurueck) knopf.current?.focus();
          }}
        />
      ) : null}
      {selbst ? eigen.nachweisDialog : null}
    </span>
  );
}

/** Erfasst die Freigabe- bzw. Prüfbericht-Nummer beim Abschluss eines Schritts. */
export function NachweisDialog({
  step,
  onClose,
  onErfassen,
}: {
  step: RunStep;
  onClose: () => void;
  onErfassen: (nummer: string) => void;
}) {
  const toast = useToast();
  const [nummer, setNummer] = useState('');
  const bezeichnung = NACHWEIS_LABEL[step.nachweis];

  const uebernehmen = () => {
    if (!nummer.trim()) {
      toast(`Bitte die ${bezeichnung} angeben.`);
      return;
    }
    onClose();
    onErfassen(nummer.trim());
  };

  return (
    <Modal
      titel={`${bezeichnung} erfassen`}
      sub={`${step.name} – wird am Schritt und im Export dokumentiert`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Abbrechen
          </button>
          <button type="button" className="btn btn-primary" onClick={uebernehmen}>
            Übernehmen und erledigen
          </button>
        </>
      }
    >
      <Field label={bezeichnung}>
        <TextInput
          value={nummer}
          onChange={setNummer}
          autoFocus
          placeholder={step.nachweis === 'freigabe' ? 'z.B. FG-2026-0147' : 'z.B. PB-2026-0032'}
          // beiEnter: Der Öffner ist „Schritt als erledigt vermerken“ – ein zweites
          // Auslösen erledigte gleich den nächsten Schritt mit
          onKeyDown={beiEnter(uebernehmen)}
        />
      </Field>
    </Modal>
  );
}
