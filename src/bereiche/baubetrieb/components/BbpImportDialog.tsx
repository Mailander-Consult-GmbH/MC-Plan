/**
 * Dialog „Import aus BBPNeo“ (Seite „Projekte“): Excel-Export der Anmeldungen
 * aus BBPNeo wählen, Status aus BBPNeo den Status in KaPlan zuordnen (die
 * Zuordnung merkt sich KaPlan für den nächsten Import), Projekte nach
 * DB-G-Nummer zuordnen oder anlegen und die Vorschau prüfen. Jede Änderung
 * plant neu (`bbpPlanen`); „Importieren“ wendet den Plan in einem `mutate()`
 * an (`bbpImportieren` im Store, domain/bbpImport.ts).
 */
import { useMemo, useRef, useState } from 'react';
import { formatDate } from '../../../shared/dates';
import { Icon } from '../../../shared/icons';
import { useToast } from '../../../shared/toast';
import { Badge, Callout, Field, Modal, Select, TextInput, alsKnopf } from '../../../shared/ui';
import { tabelleLesen, type GeleseneTabelle } from '../../../shared/xlsxLesen';
import {
  BBP_PHASE_LABEL,
  BBP_SPALTEN,
  KEIN_PROJEKT,
  NEUES_PROJEKT,
  bbpLesen,
  bbpPlanen,
  istBbpBlatt,
  type BbpErgebnis,
  type BbpGelesen,
  type BbpOptionen,
  type BbpPosten,
} from '../domain/bbpImport';
import type { BbpPhase, BbpStatusZuordnung, ID, Workflow } from '../domain/types';
import { startbareWorkflows, zielText } from '../domain/workflow';
import { useStore } from '../store/store';

const ERGEBNIS: Record<BbpErgebnis, { label: string; ton: '' | 'green' | 'blue' | 'orange' }> = {
  neu: { label: 'neu', ton: 'green' },
  aktualisiert: { label: 'aktualisiert', ton: 'blue' },
  unveraendert: { label: 'unverändert', ton: '' },
  uebersprungen: { label: 'übersprungen', ton: 'orange' },
};

/** „1 Anmeldung“, „3 Anmeldungen“ */
const anzahl = (n: number, eins: string, mehr: string) => `${n} ${n === 1 ? eins : mehr}`;

/** Phase einer Anmeldung aus BBPNeo: „KM N-2“, „KKM“. */
const phaseText = (p: Pick<BbpPosten['quelle'], 'phase' | 'kmRunde'>) =>
  p.phase === 'km' && p.kmRunde ? `KM ${p.kmRunde}` : BBP_PHASE_LABEL[p.phase];

/** Auswahl eines Status in KaPlan, nach Workflow gegliedert; leer – nicht importieren. */
function StatusWahl({
  wert,
  onChange,
  workflows,
  label,
}: {
  wert: ID | null;
  onChange: (ziel: ID | null) => void;
  workflows: Workflow[];
  label: string;
}) {
  return (
    <select className="select" value={wert ?? ''} aria-label={label} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">– nicht importieren –</option>
      {startbareWorkflows(workflows).map((w) => (
        <optgroup key={w.id} label={w.name}>
          {w.status.map((s) => (
            <option key={s.id} value={s.id}>
              {w.kurz || w.name} · {s.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

export function BbpImportDialog({ onClose }: { onClose: () => void }) {
  const { data, bbpImportieren } = useStore();
  const toast = useToast();
  const eingabe = useRef<HTMLInputElement>(null);
  const [ueber, setUeber] = useState(false);
  const [datei, setDatei] = useState<string | null>(null);
  const [blaetter, setBlaetter] = useState<GeleseneTabelle[]>([]);
  const [blattIndex, setBlattIndex] = useState(0);
  const [fehler, setFehler] = useState<string | null>(null);
  const [zuordnung, setZuordnung] = useState<BbpStatusZuordnung>(() => ({
    km: { ...data.einstellungen.bbpStatus.km },
    kkm: { ...data.einstellungen.bbpStatus.kkm },
  }));
  const [projektWahl, setProjektWahl] = useState<Record<string, string>>({});
  const [projektNamen, setProjektNamen] = useState<Record<string, string>>({});

  const lies = async (f: File) => {
    setDatei(f.name);
    setFehler(null);
    setBlaetter([]);
    setBlattIndex(0);
    setProjektWahl({});
    setProjektNamen({});
    try {
      const tabellen = (await tabelleLesen(f)).filter((t) => istBbpBlatt(t.zeilen[0] ?? []));
      if (tabellen.length === 0) {
        setFehler(
          `Die Datei enthält keinen Export der Anmeldungen aus BBPNeo – erwartet werden die Spalten „${BBP_SPALTEN.id.koepfe[0]}“, „${BBP_SPALTEN.status.koepfe[0]}“ und „${BBP_SPALTEN.phase.koepfe[0]}“.`,
        );
        return;
      }
      setBlaetter(tabellen);
    } catch (e) {
      setFehler(
        `${e instanceof Error ? e.message : 'Die Datei konnte nicht gelesen werden.'} Erwartet wird der Excel-Export der Anmeldungen aus BBPNeo (.xlsx).`,
      );
    }
  };

  const blatt = blaetter[blattIndex];
  const gelesen = useMemo<BbpGelesen | null>(() => {
    if (!blatt) return null;
    try {
      return bbpLesen(blatt.zeilen, blatt.name);
    } catch {
      return null;
    }
  }, [blatt]);
  const optionen: BbpOptionen = { zuordnung, projektWahl, projektNamen };
  const plan = useMemo(
    () => (gelesen ? bbpPlanen(data, gelesen, { zuordnung, projektWahl, projektNamen }) : null),
    [data, gelesen, zuordnung, projektWahl, projektNamen],
  );

  const zuordnen = (phase: BbpPhase, status: string, ziel: ID | null) =>
    setZuordnung((z) => ({ ...z, [phase]: { ...z[phase], [status]: ziel } }));

  const projekte = [...data.projekte].sort((a, b) => a.name.localeCompare(b.name, 'de'));
  const projektName = (id: ID) => data.projekte.find((p) => p.id === id)?.name ?? '';
  const gruppen = plan?.gruppen.filter((g) => g.neu > 0) ?? [];
  const uebersprungen = [
    ...(gelesen?.uebersprungen ?? []).map((u) => ({ grund: u.grund, id: u.anmeldeId || `${u.zeilen} Zeilen` })),
    ...(plan?.posten ?? [])
      .filter((p) => p.ergebnis === 'uebersprungen')
      .map((p) => ({ grund: p.grund, id: p.quelle.anmeldeId })),
  ];
  const gruende = [
    ...uebersprungen.reduce((m, u) => m.set(u.grund, [...(m.get(u.grund) ?? []), u.id]), new Map<string, string[]>()),
  ];
  const moeglich = !!plan && plan.summe.neu + plan.summe.aktualisiert > 0;

  const importieren = () => {
    if (!gelesen || !plan || !moeglich) return;
    bbpImportieren(gelesen, optionen);
    const s = plan.summe;
    toast(
      `Import aus BBPNeo: ${[
        s.neu ? `${s.neu} neu` : '',
        s.aktualisiert
          ? `${s.aktualisiert} aktualisiert${s.statusWechsel ? ` (${s.statusWechsel} mit neuem Status)` : ''}`
          : '',
        s.unveraendert ? `${s.unveraendert} unverändert` : '',
        s.uebersprungen ? `${s.uebersprungen} übersprungen` : '',
        s.neueProjekte ? anzahl(s.neueProjekte, 'neues Projekt', 'neue Projekte') : '',
      ]
        .filter(Boolean)
        .join(', ')}.`,
    );
    onClose();
  };

  /** Zweite Zeile eines Postens: was passiert und warum. */
  const erlaeuterung = (p: BbpPosten): string => {
    const teile: string[] = [];
    if (p.ergebnis === 'uebersprungen') teile.push(p.grund);
    if (p.ergebnis === 'aktualisiert') {
      const bisher = p.statusWechsel ? p.bestehend.map((a) => zielText(data.workflows, a.statusId)) : [];
      teile.push(`${p.aenderungen.join(', ')}${bisher.length ? ` – bisher ${[...new Set(bisher)].join(', ')}` : ''}`);
    }
    if (p.ergebnis === 'neu') {
      const g = plan?.gruppen.find((x) => x.schluessel === p.gruppe);
      if (g) teile.push(g.wahl === NEUES_PROJEKT ? `neues Projekt „${g.name}“` : `in „${projektName(g.wahl)}“`);
    }
    return [...teile, ...p.hinweise].join(' · ');
  };

  return (
    <Modal
      titel="Import aus BBPNeo"
      sub="Anmeldungen im KM und KKM aus dem Excel-Export von BBPNeo"
      wide
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Abbrechen
          </button>
          <button type="button" className="btn btn-primary" onClick={importieren} disabled={!moeglich}>
            Importieren
          </button>
        </>
      }
    >
      <div className="stack" style={{ gap: 14 }}>
        <p className="small muted" style={{ margin: 0 }}>
          Übernommen werden Anmeldungen im KM (Prozessphase 2. KP = N-2, 3. KP = N-1) und im KKM; „Vorlage“ wird
          übersprungen. Je Anmelde-ID entsteht eine Anmeldung mit dem frühesten Beginn und dem spätesten Ende des
          Sperrzeitraums. Vorhandene Anmeldungen derselben ID übernehmen die Angaben aus BBPNeo, ein anderer Status
          steht als „Import BBPNeo“ im Verlauf.
        </p>

        <div
          className={`drop-zone ${ueber ? 'over' : ''} ${datei ? 'bb-imp-klein' : ''}`}
          {...alsKnopf(() => eingabe.current?.click())}
          onDragOver={(e) => {
            e.preventDefault();
            setUeber(true);
          }}
          onDragLeave={() => setUeber(false)}
          onDrop={(e) => {
            e.preventDefault();
            setUeber(false);
            const f = e.dataTransfer.files[0];
            if (f) void lies(f);
          }}
        >
          {datei ? (
            <>
              <Icon name="importieren" size={18} strokeWidth={1.5} />
              <strong>{datei}</strong>
              {blatt ? <span className="small">Blatt „{blatt.name}“</span> : null}
              <span className="small">· Andere Datei wählen</span>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                <Icon name="importieren" size={26} strokeWidth={1.4} />
              </div>
              <strong>Excel-Export aus BBPNeo hierher ziehen</strong>
              <div className="small">oder klicken, um eine Datei auszuwählen</div>
            </>
          )}
          <input
            ref={eingabe}
            type="file"
            accept=".xlsx,.csv,.txt"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) void lies(f);
            }}
          />
        </div>

        {fehler ? (
          <Callout ton="error" icon="!">
            {fehler}
          </Callout>
        ) : null}

        {blaetter.length > 1 ? (
          <Field label="Tabellenblatt" hint="Mehrere Blätter der Datei sind Exporte der Anmeldungen.">
            <Select
              value={String(blattIndex)}
              onChange={(v) => {
                setBlattIndex(Number(v));
                setProjektWahl({});
                setProjektNamen({});
              }}
              options={blaetter.map((b, i) => ({
                value: String(i),
                label: `${b.name} (${b.zeilen.length - 1} Zeilen)`,
              }))}
            />
          </Field>
        ) : null}

        {gelesen && plan ? (
          <>
            <div className="bb-imp-summe">
              <span className="small muted">
                {anzahl(gelesen.zeilen, 'Zeile', 'Zeilen')} ·{' '}
                {anzahl(
                  gelesen.anmeldungen.length + gelesen.uebersprungen.filter((u) => u.anmeldeId).length,
                  'Anmeldung',
                  'Anmeldungen',
                )}
              </span>
              <Badge ton="green">{plan.summe.neu} neu</Badge>
              <Badge ton="blue">
                {plan.summe.aktualisiert} aktualisiert
                {plan.summe.statusWechsel ? `, davon ${plan.summe.statusWechsel} mit neuem Status` : ''}
              </Badge>
              {plan.summe.unveraendert ? <Badge>{plan.summe.unveraendert} unverändert</Badge> : null}
              {plan.summe.uebersprungen ? <Badge ton="orange">{plan.summe.uebersprungen} übersprungen</Badge> : null}
            </div>

            {gelesen.fehlend.length > 0 ? (
              <Callout ton="warn" icon="!">
                Die Datei enthält keine Spalte für {gelesen.fehlend.map((f) => BBP_SPALTEN[f].label).join(', ')} – diese
                Angaben bleiben bei neuen Anmeldungen leer und bei vorhandenen unverändert.
              </Callout>
            ) : null}

            {plan.statusListe.length > 0 ? (
              <section>
                <h3 className="bb-imp-titel">Status zuordnen</h3>
                <p className="small tertiary bb-imp-text">Die Zuordnung gilt auch für den nächsten Import.</p>
                <div className="table-scroll">
                  <table className="table table-stack">
                    <thead>
                      <tr>
                        <th>Status in BBPNeo</th>
                        <th>Status in KaPlan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plan.statusListe.map((z) => (
                        <tr key={`${z.phase}|${z.status}`}>
                          <td>
                            <strong>{z.status}</strong>
                            <div className="small tertiary">
                              {BBP_PHASE_LABEL[z.phase]} · {anzahl(z.anzahl, 'Anmeldung', 'Anmeldungen')}
                            </div>
                          </td>
                          <td style={{ minWidth: 220 }}>
                            <StatusWahl
                              wert={z.ziel}
                              onChange={(ziel) => zuordnen(z.phase, z.status, ziel)}
                              workflows={data.workflows}
                              label={`Status in KaPlan für „${z.status}“ (${BBP_PHASE_LABEL[z.phase]})`}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}

            {gruppen.length > 0 ? (
              <section>
                <h3 className="bb-imp-titel">Projekte</h3>
                <p className="small tertiary bb-imp-text">
                  Neue Anmeldungen kommen in das Projekt mit derselben DB-G-Nummer; vorhandene bleiben in ihrem Projekt.
                </p>
                <div className="table-scroll">
                  <table className="table table-stack">
                    <thead>
                      <tr>
                        <th>Projektnummer (BBPNeo)</th>
                        <th>Projekt in KaPlan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gruppen.map((g) => (
                        <tr key={g.schluessel}>
                          <td>
                            <strong>{g.projektnummer || 'ohne Projektnummer'}</strong>
                            <div className="small tertiary">
                              {anzahl(g.neu, 'neue Anmeldung', 'neue Anmeldungen')}
                              {g.treffer
                                ? ` · passt zu „${g.treffer.name}“`
                                : g.projektnummer
                                  ? ' · kein Projekt mit dieser DB-G-Nummer'
                                  : ''}
                            </div>
                          </td>
                          <td style={{ minWidth: 220 }}>
                            <div className="stack" style={{ gap: 6 }}>
                              <select
                                className="select"
                                value={g.wahl}
                                aria-label={`Projekt für ${g.projektnummer || 'Anmeldungen ohne Projektnummer'}`}
                                onChange={(e) => setProjektWahl((w) => ({ ...w, [g.schluessel]: e.target.value }))}
                              >
                                <option value={KEIN_PROJEKT}>– nicht importieren –</option>
                                <option value={NEUES_PROJEKT}>+ Neues Projekt anlegen</option>
                                <optgroup label="Vorhandene Projekte">
                                  {projekte.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.name}
                                      {p.dbGNummer ? ` (${p.dbGNummer})` : ''}
                                    </option>
                                  ))}
                                </optgroup>
                              </select>
                              {g.wahl === NEUES_PROJEKT ? (
                                <TextInput
                                  value={projektNamen[g.schluessel] ?? g.name}
                                  onChange={(v) => setProjektNamen((n) => ({ ...n, [g.schluessel]: v }))}
                                  aria-label="Bezeichnung des neuen Projekts"
                                  placeholder="Bezeichnung des neuen Projekts"
                                />
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}

            {plan.posten.length > 0 ? (
              <section>
                <h3 className="bb-imp-titel">Anmeldungen</h3>
                <div className="table-scroll">
                  <table className="table table-stack">
                    <thead>
                      <tr>
                        <th>Anmeldung</th>
                        <th>Sperrzeitraum</th>
                        <th>Status</th>
                        <th>Ergebnis</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plan.posten.map((p) => (
                        <tr key={p.quelle.anmeldeId}>
                          <td>
                            <strong>{p.quelle.anmeldeId}</strong>
                            <div className="small tertiary">
                              <span title={`Prozessphase „${p.quelle.prozessphase}“`}>{phaseText(p.quelle)}</span>
                              {p.quelle.titel ? ` · ${p.quelle.titel}` : ''}
                            </div>
                          </td>
                          <td className="small">
                            {p.quelle.von ? formatDate(p.quelle.von) : '–'} –{' '}
                            {p.quelle.bis ? formatDate(p.quelle.bis) : '–'}
                            {p.quelle.zeilen > 1 ? <div className="tertiary">aus {p.quelle.zeilen} Zeilen</div> : null}
                          </td>
                          <td className="small">
                            {p.quelle.status}
                            {p.statusId ? (
                              <div className="tertiary">→ {zielText(data.workflows, p.statusId)}</div>
                            ) : null}
                          </td>
                          <td>
                            <Badge ton={ERGEBNIS[p.ergebnis].ton}>{ERGEBNIS[p.ergebnis].label}</Badge>
                            {erlaeuterung(p) ? <div className="small tertiary">{erlaeuterung(p)}</div> : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}

            {gruende.length > 0 ? (
              <details className="bb-imp-details">
                <summary className="small">
                  Übersprungen: {gruende.map(([grund, ids]) => `${grund} (${ids.length})`).join(' · ')}
                </summary>
                <ul className="small tertiary">
                  {gruende.map(([grund, ids]) => (
                    <li key={grund}>
                      {grund}: {ids.join(', ')}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </>
        ) : null}
      </div>
    </Modal>
  );
}
