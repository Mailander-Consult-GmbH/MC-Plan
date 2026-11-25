/**
 * Assistent zum Erstellen des Pflichtenhefts: fünf Schritte in einem Dialog,
 * vorausgefüllt aus dem Projekt – Projekt und Stammdaten (je Geschäftsbereich),
 * Deckblatt, Ansprechpartner, Planläufe und Plancodierung. „Pflichtenheft
 * erstellen“ schreibt Projektnummer der DB und Stammdaten ins Projekt und legt
 * das Pflichtenheft aus der Vorlage des Geschäftsbereichs an – in einem
 * Schritt (`pflichtenheftAnlegen`). Ersetzt er ein vorhandenes, bleiben dessen
 * Ausgaben erhalten.
 */
import { useMemo, useState } from 'react';
import {
  ansprechpartnerZeilen,
  eigenerKontakt,
  neuesPflichtenheft,
  plmKontakte,
  unterschriftVorgabe,
  UNTERSCHRIFT_LABEL,
  verwendeteWorkflows,
  waehlbareWorkflows,
} from '../../../domain/pflichtenheft';
import {
  GESCHAEFTSBEREICHE,
  STANDARD_AUFTRAGGEBER,
  geschaeftsbereichVon,
  leereStammdaten,
  type ID,
  type ProjektStammdaten,
  type Project,
  type Unterschrift,
} from '../../../domain/types';
import { useStore } from '../../../store/store';
import { useToast } from '../../../../../shared/toast';
import { Icon } from '../../../../../shared/icons';
import { Callout, Field, Modal, TextInput } from '../../../../../shared/ui';
import { StammdatenFelder } from '../Stammdaten';
import { BildWahl, UnterschriftFelder } from './bausteine';

const SCHRITTE = ['Projekt', 'Deckblatt', 'Ansprechpartner', 'Planläufe', 'Plancodierung'] as const;

const leer = (): Unterschrift => ({ ort: '', datum: null, funktion: '', name: '' });

export function PflichtenheftAssistent({
  project,
  ersetzen = false,
  onClose,
}: {
  project: Project;
  ersetzen?: boolean;
  onClose: () => void;
}) {
  const { data, pflichtenheftAnlegen } = useStore();
  const toast = useToast();
  const [schritt, setSchritt] = useState(0);

  // Vorbelegung: was das Projekt kennt, sonst die üblichen Werte
  const [gNummer, setGNummer] = useState(project.gNummer);
  const [stammdaten, setStammdaten] = useState<ProjektStammdaten>(() => {
    const s = { ...leereStammdaten(), ...project.stammdaten };
    return {
      ...s,
      auftraggeber: s.auftraggeber || STANDARD_AUFTRAGGEBER,
      geschaeftsbereich: s.geschaeftsbereich || GESCHAEFTSBEREICHE[0].label,
      planungsphase: s.planungsphase || 'Ausführungsplanung',
    };
  });
  const [titelbild, setTitelbild] = useState(project.pflichtenheft?.titelbild ?? '');
  const [aufgestellt, setAufgestellt] = useState<Unterschrift>(project.pflichtenheft?.aufgestellt ?? leer());
  const [freigegeben, setFreigegeben] = useState<Unterschrift>(project.pflichtenheft?.freigegeben ?? leer());
  const [kontaktIds, setKontaktIds] = useState<ID[]>([]);
  const verwendet = verwendeteWorkflows(data, project);
  const waehlbar = waehlbareWorkflows(data, project);
  const [workflowIds, setWorkflowIds] = useState<ID[]>(() => (verwendet.length > 0 ? verwendet : waehlbar).map((t) => t.id));
  const [projektKuerzel, setProjektKuerzel] = useState<string | null>(null);

  const gb = GESCHAEFTSBEREICHE.find((g) => g.id === geschaeftsbereichVon(stammdaten.geschaeftsbereich))!;
  const projektNeu: Project = { ...project, gNummer, stammdaten };
  const kuerzel = projektKuerzel ?? stammdaten.stationKuerzel;
  // Probeweise erstellt – für die Ansprechpartner und die Vorbelegung der Unterschriften
  const probe = useMemo(
    () => neuesPflichtenheft(data, projektNeu, (p) => `${p}-probe-${Math.random().toString(36).slice(2, 8)}`, { kontaktIds }),
    [data, kontaktIds, gNummer, stammdaten],
  );

  const erstellen = () => {
    pflichtenheftAnlegen(
      project.id,
      { workflowIds, kontaktIds, titelbild, aufgestellt, freigegeben, projektKuerzel: kuerzel },
      { gNummer: gNummer.trim(), stammdaten },
    );
    toast(ersetzen ? 'Pflichtenheft neu erstellt.' : 'Pflichtenheft erstellt.');
    onClose();
  };
  const letzter = schritt === SCHRITTE.length - 1;

  return (
    <Modal
      titel={ersetzen ? 'Pflichtenheft neu aus Vorlage' : 'Pflichtenheft erstellen'}
      sub={`Schritt ${schritt + 1} von ${SCHRITTE.length}: ${SCHRITTE[schritt]}`}
      onClose={onClose}
      wide
      klickDanebenSchliesst={false}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Abbrechen
          </button>
          {schritt > 0 ? (
            <button type="button" className="btn btn-outline" onClick={() => setSchritt((s) => s - 1)}>
              Zurück
            </button>
          ) : null}
          {letzter ? (
            <button type="button" className="btn btn-primary" onClick={erstellen}>
              Pflichtenheft erstellen
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={() => setSchritt((s) => s + 1)}>
              Weiter
            </button>
          )}
        </>
      }
    >
      <ol className="phe-schritte" aria-label="Schritte">
        {SCHRITTE.map((t, i) => (
          <li key={t} className={i === schritt ? 'aktiv' : i < schritt ? 'fertig' : ''} aria-current={i === schritt ? 'step' : undefined}>
            <button type="button" onClick={() => setSchritt(i)}>
              <span className="phe-schritt-nr">{i < schritt ? <Icon name="check" size={12} /> : i + 1}</span>
              <span className="phe-schritt-text">{t}</span>
            </button>
          </li>
        ))}
      </ol>

      {schritt === 0 ? (
        <div className="stack">
          {ersetzen ? (
            <Callout icon="!" ton="warn">
              Kapitel, Texte und Anlagen werden durch die Vorlage ersetzt; die bisherigen Ausgaben bleiben, die nächste vermerkt die
              Änderungen.
            </Callout>
          ) : null}
          <p className="small muted">
            Die Angaben gelten für das Projekt (Einstellungen › Stammdaten). Der Geschäftsbereich bestimmt die Felder und die Vorlage des
            Pflichtenhefts.
          </p>
          <div className="form-grid">
            <Field label="Projektnummer der DB (G- bzw. E-Nummer)">
              <TextInput value={gNummer} onChange={setGNummer} placeholder="G.011606148" />
            </Field>
            <Field label="Projektname">
              <TextInput value={project.name} onChange={() => undefined} disabled />
            </Field>
          </div>
          <StammdatenFelder wert={stammdaten} onChange={setStammdaten} idPraefix="assistent" />
        </div>
      ) : null}

      {schritt === 1 ? (
        <div className="stack">
          <p className="small muted">
            Leere Felder füllt KaPlan aus den Kontakten – „Aufgestellt“ vom Planlaufmanagement, „Freigegeben“ von der Projektleitung.
            Das Datum „Aufgestellt“ ist ohne Eintrag das der ersten Ausgabe; „Zuletzt geändert“ vermerkt KaPlan bei jeder weiteren.
          </p>
          <div className="field">
            <label>Bild auf dem Deckblatt</label>
            <BildWahl wert={titelbild} onChange={setTitelbild} />
          </div>
          <UnterschriftFelder
            label={UNTERSCHRIFT_LABEL.aufgestellt}
            wert={aufgestellt}
            vorgabe={unterschriftVorgabe(data, projektNeu, probe, 'aufgestellt')}
            onChange={(patch) => setAufgestellt((u) => ({ ...u, ...patch }))}
          />
          <UnterschriftFelder
            label={UNTERSCHRIFT_LABEL.freigegeben}
            wert={freigegeben}
            vorgabe={unterschriftVorgabe(data, projektNeu, probe, 'freigegeben')}
            onChange={(patch) => setFreigegeben((u) => ({ ...u, ...patch }))}
          />
        </div>
      ) : null}

      {schritt === 2 ? (
        <AnsprechpartnerSchritt
          project={projektNeu}
          kontaktIds={kontaktIds}
          setKontaktIds={setKontaktIds}
          probe={probe}
        />
      ) : null}

      {schritt === 3 ? (
        <div className="stack" style={{ gap: 10 }}>
          <p className="small muted">Je gewähltem Workflow entsteht eine Anlage mit dem Ablaufdiagramm. Vorgewählt sind die im Projekt verwendeten.</p>
          <div className="phe-workflows">
            {waehlbar.map((t) => {
              const an = workflowIds.includes(t.id);
              return (
                <label key={t.id} className={`phe-workflow ${an ? 'an' : 'aus'}`}>
                  <input
                    type="checkbox"
                    className="phe-wf-haken"
                    checked={an}
                    onChange={() => setWorkflowIds((l) => (an ? l.filter((x) => x !== t.id) : [...l, t.id]))}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="truncate">{t.name}</div>
                    <div className="small tertiary">
                      {[t.projectId ? 'Projektvariante' : 'projektübergreifend', verwendet.some((v) => v.id === t.id) ? 'im Projekt verwendet' : '']
                        .filter(Boolean)
                        .join(' · ')}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      ) : null}

      {schritt === 4 ? (
        <div className="stack">
          <p className="small muted">
            Die Kataloge der Plancodierung kommen aus der Vorlage und lassen sich danach im Pflichtenheft bearbeiten. Hier nur der Code
            des Projekts – die erste Stelle jeder Plancodierung.
          </p>
          <div className="form-grid">
            <Field label="Code des Projekts" hint={gb.station ? 'Vorgabe: das Kürzel der Betriebsstelle' : 'z. B. ein Kürzel der Strecke oder des Projekts'}>
              <TextInput value={kuerzel} onChange={(v) => setProjektKuerzel(v)} placeholder={gb.station ? 'THZ' : 'HRB'} />
            </Field>
          </div>
          <Callout icon="✓">
            Bereit: Vorlage „{gb.label}“, {workflowIds.length} {workflowIds.length === 1 ? 'Planlauf' : 'Planläufe'}
            {kontaktIds.length > 0 ? `, ${kontaktIds.length} weitere Person(en) im Planlaufmanagement` : ''}.
          </Callout>
        </div>
      ) : null}
    </Modal>
  );
}

/** Schritt „Ansprechpartner“: wer im Pflichtenheft steht, was fehlt, und die Personen des Planlaufmanagements. */
function AnsprechpartnerSchritt({
  project,
  kontaktIds,
  setKontaktIds,
  probe,
}: {
  project: Project;
  kontaktIds: ID[];
  setKontaktIds: (ids: ID[]) => void;
  probe: ReturnType<typeof neuesPflichtenheft>;
}) {
  const { data } = useStore();
  const eigen = eigenerKontakt(data, project);
  const andere = data.contacts
    .filter((c) => c.projectId === project.id && !c.eigen)
    .sort((x, y) => `${x.nachname} ${x.vorname}`.localeCompare(`${y.nachname} ${y.vorname}`, 'de'));
  const name = (c: { vorname: string; nachname: string; firma: string }) => `${c.vorname} ${c.nachname}`.trim() || c.firma;
  const offenAlle: string[] = [];

  return (
    <div className="stack">
      <p className="small muted">
        Ansprechpartner kommen aus den Funktionen des Projekts und bleiben im Pflichtenheft stets auf deren Stand. Fehlende Personen
        lassen sich auch später im Reiter „Funktion“ ergänzen.
      </p>
      <div className="phe-assistent-ap">
        {probe.abschnitte.map((a) => {
          if (a.art === 'plm') {
            return (
              <div key={a.id} className="phe-assistent-ap-zeile">
                <span className="phe-assistent-ap-titel">{a.titel}</span>
                <span className="small">{plmKontakte(data, project, a).map(name).join(', ') || (eigen ? name(eigen) : '–')}</span>
              </div>
            );
          }
          if (a.art !== 'ansprechpartner') return null;
          const { zeilen, offen } = ansprechpartnerZeilen(data, project, a, probe);
          offenAlle.push(...offen);
          return (
            <div key={a.id} className="phe-assistent-ap-zeile">
              <span className="phe-assistent-ap-titel">{a.titel}</span>
              <span className="small">
                {zeilen.length === 0 ? <span className="tertiary">noch niemand</span> : zeilen.map((z) => `${z.label}: ${z.kontakte.map(name).join(', ')}`).join(' · ')}
              </span>
            </div>
          );
        })}
      </div>
      <Field label="Weitere Personen im Planlaufmanagement (etwa die Vertretung)" full>
        <div className="row wrap" style={{ gap: 6 }}>
          {andere.length === 0 ? <span className="small tertiary">Keine weiteren Kontakte im Projekt.</span> : null}
          {andere.map((c) => {
            const an = kontaktIds.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                className={`phe-chip ${an ? 'an' : ''}`}
                aria-pressed={an}
                onClick={() => setKontaktIds(an ? kontaktIds.filter((x) => x !== c.id) : [...kontaktIds, c.id])}
              >
                {an ? <Icon name="check" size={12} /> : null}
                {name(c)}
              </button>
            );
          })}
        </div>
      </Field>
      {offenAlle.length > 0 ? (
        <Callout icon="!" ton="warn">
          Ohne Person: {[...new Set(offenAlle)].join(', ')}.
        </Callout>
      ) : null}
    </div>
  );
}
