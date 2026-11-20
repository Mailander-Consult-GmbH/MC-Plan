/**
 * Import aus PzE auf der Seite „Excel-Import“ (pages/BbpImport.tsx): Kachel
 * „Import aus PzE“ mit Ablagefläche für den Export der „Vorhaben Übersicht“
 * und – nach dem Lesen – die Vorschau mit den relevanten Erstellern, den
 * Projekten und den Anmeldungen je Vorhaben und Fahrplanjahr
 * (domain/pzeImport.ts). Jede Änderung plant neu (`pzePlanen`); „Importieren“
 * wendet den Plan in einem `mutate()` an (`pzeImportieren` im Store) und leert
 * die Kachel für die nächste Datei.
 *
 * `usePzeImport` liefert Kachel, Vorschau und Ergebnismeldung getrennt: Die
 * Seite stellt die Kachel neben die von BBPNeo und die Vorschau darunter.
 */
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { today } from '../../../shared/dates';
import { Icon } from '../../../shared/icons';
import { useToast } from '../../../shared/toast';
import { Badge, Callout, Card, CardHeader, Field, Select, TextInput, alsKnopf } from '../../../shared/ui';
import { tabelleLesen, type GeleseneTabelle } from '../../../shared/xlsxLesen';
import { istBbpBlatt } from '../domain/bbpImport';
import {
  KEIN_PROJEKT,
  NEUES_PROJEKT,
  PZE_PFLICHT,
  PZE_SPALTEN,
  istPzeBlatt,
  pzeLesen,
  pzePlanen,
  type PzeErgebnis,
  type PzeGelesen,
  type PzeOptionen,
  type PzePosten,
} from '../domain/pzeImport';
import type { ID } from '../domain/types';
import { zielText } from '../domain/workflow';
import type { Route } from '../lib/router';
import { useStore } from '../store/store';

const ERGEBNIS: Record<PzeErgebnis, { label: string; ton: '' | 'green' | 'orange' }> = {
  neu: { label: 'neu', ton: 'green' },
  vorhanden: { label: 'vorhanden', ton: '' },
  uebersprungen: { label: 'übersprungen', ton: 'orange' },
};

/** „1 Anmeldung“, „3 Anmeldungen“ */
const anzahl = (n: number, eins: string, mehr: string) => `${n} ${n === 1 ? eins : mehr}`;

/** Name eines Erstellers – leer „ohne Angabe“. */
const erstellerName = (name: string) => name || 'ohne Angabe';

export function usePzeImport(navigate: (r: Route) => void): { kachel: ReactNode; vorschau: ReactNode; meldung: ReactNode } {
  const { data, pzeImportieren } = useStore();
  const toast = useToast();
  const eingabe = useRef<HTMLInputElement>(null);
  const [ueber, setUeber] = useState(false);
  const [datei, setDatei] = useState<string | null>(null);
  const [blaetter, setBlaetter] = useState<GeleseneTabelle[]>([]);
  const [blattIndex, setBlattIndex] = useState(0);
  const [fehler, setFehler] = useState<string | null>(null);
  const [ersteller, setErsteller] = useState<Record<string, boolean>>({});
  const [projektWahl, setProjektWahl] = useState<Record<string, string>>({});
  const [projektNamen, setProjektNamen] = useState<Record<string, string>>({});
  const [workflowWahl, setWorkflowWahl] = useState<Record<string, ID>>({});
  /** Ergebnis des letzten Imports. */
  const [ergebnis, setErgebnis] = useState<string | null>(null);

  const wahlLeeren = () => {
    setErsteller({});
    setProjektWahl({});
    setProjektNamen({});
    setWorkflowWahl({});
  };

  /** Leert die Kachel für die nächste Datei. */
  const verwerfen = () => {
    setDatei(null);
    setFehler(null);
    setBlaetter([]);
    setBlattIndex(0);
    wahlLeeren();
  };

  const lies = async (f: File) => {
    setErgebnis(null);
    setDatei(f.name);
    setFehler(null);
    setBlaetter([]);
    setBlattIndex(0);
    wahlLeeren();
    try {
      const alle = await tabelleLesen(f);
      const tabellen = alle.filter((t) => istPzeBlatt(t.zeilen[0] ?? []));
      if (tabellen.length === 0) {
        setFehler(
          alle.some((t) => istBbpBlatt(t.zeilen[0] ?? []))
            ? 'Die Datei ist ein Export der Anmeldungen aus BBPNeo – bitte in die Kachel „Import aus BBPNeo“ ziehen.'
            : `Die Datei enthält keine Vorhaben-Übersicht aus PzE – erwartet werden die Spalten ${PZE_PFLICHT.map(
                (s) => `„${PZE_SPALTEN[s].koepfe[0]}“`,
              ).join(', ')}.`,
        );
        return;
      }
      setBlaetter(tabellen);
    } catch (e) {
      setFehler(
        `${e instanceof Error ? e.message : 'Die Datei konnte nicht gelesen werden.'} Erwartet wird der Export der „Vorhaben Übersicht“ aus PzE (.xlsx).`,
      );
    }
  };

  const blatt = blaetter[blattIndex];
  const gelesen = useMemo<PzeGelesen | null>(() => {
    if (!blatt) return null;
    try {
      return pzeLesen(blatt.zeilen, blatt.name, blatt.zeilenNummern);
    } catch {
      return null;
    }
  }, [blatt]);
  const heute = today();
  const optionen: PzeOptionen = { ersteller, projektWahl, projektNamen, workflowWahl };
  const plan = useMemo(
    () => (gelesen ? pzePlanen(data, gelesen, { ersteller, projektWahl, projektNamen, workflowWahl }, heute) : null),
    [data, gelesen, ersteller, projektWahl, projektNamen, workflowWahl, heute],
  );

  const projekte = [...data.projekte].sort((a, b) => a.name.localeCompare(b.name, 'de'));
  const projektName = (id: ID) => data.projekte.find((p) => p.id === id)?.name ?? '';
  const relevante = plan?.posten.filter((p) => p.relevant) ?? [];
  const gruppen = plan?.gruppen.filter((g) => g.neu + g.vorhanden > 0) ?? [];
  const gruende = [
    ...[
      ...(gelesen?.uebersprungen ?? []).map((u) => ({ grund: u.grund, name: u.bezeichnung || '–' })),
      ...relevante
        .filter((p) => p.ergebnis === 'uebersprungen')
        .map((p) => ({ grund: p.grund, name: `${p.quelle.bezeichnung} (${p.fahrplanjahr})` })),
    ].reduce((m, u) => m.set(u.grund, [...(m.get(u.grund) ?? []), u.name]), new Map<string, string[]>()),
  ];
  const moeglich = !!plan && plan.summe.neu + plan.summe.projekteErgaenzt > 0;

  const alleErsteller = (relevant: boolean) =>
    setErsteller(Object.fromEntries((plan?.ersteller ?? []).map((e) => [e.name, relevant])));

  const importieren = () => {
    if (!gelesen || !plan || !moeglich) return;
    pzeImportieren(gelesen, optionen);
    const s = plan.summe;
    const text = `Import aus PzE: ${[
      s.neu ? `${s.neu} neu` : '',
      s.vorhanden ? `${s.vorhanden} schon vorhanden` : '',
      s.uebersprungen ? `${s.uebersprungen} übersprungen` : '',
      s.neueProjekte ? anzahl(s.neueProjekte, 'neues Projekt', 'neue Projekte') : '',
      s.projekteErgaenzt ? `Fahrplanjahre in ${anzahl(s.projekteErgaenzt, 'Projekt', 'Projekten')} ergänzt` : '',
    ]
      .filter(Boolean)
      .join(', ')}.`;
    toast(text);
    setErgebnis(text);
    verwerfen();
  };

  /** Zweite Zeile im Ergebnis: wohin die Anmeldung kommt bzw. wo sie steht. */
  const erlaeuterung = (p: PzePosten): string => {
    if (p.ergebnis === 'uebersprungen') return p.grund;
    if (p.ergebnis === 'vorhanden' && p.bestehend) return `in „${projektName(p.bestehend.projektId)}“`;
    const g = plan?.gruppen.find((x) => x.schluessel === p.gruppe);
    if (!g) return '';
    return g.wahl === NEUES_PROJEKT ? `neues Projekt „${g.name}“` : `in „${projektName(g.wahl)}“`;
  };

  const importKnopf = (
    <button type="button" className="btn btn-primary" onClick={importieren} disabled={!moeglich}>
      <Icon name="importieren" size={14} /> Importieren
    </button>
  );

  const kachel = (
    <Card>
      <CardHeader titel="Import aus PzE" sub="Anmeldungen im SKM und MKM aus PzE" />
      <div className="card-pad stack" style={{ gap: 14 }}>
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
              <strong>Export der „Vorhaben Übersicht“ aus PzE hierher ziehen</strong>
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
          <Field label="Tabellenblatt" hint="Mehrere Blätter der Datei sind Vorhaben-Übersichten.">
            <Select
              value={String(blattIndex)}
              onChange={(v) => {
                setBlattIndex(Number(v));
                setProjektWahl({});
                setProjektNamen({});
                setWorkflowWahl({});
              }}
              options={blaetter.map((b, i) => ({ value: String(i), label: `${b.name} (${b.zeilen.length - 1} Zeilen)` }))}
            />
          </Field>
        ) : null}
      </div>
    </Card>
  );

  const meldung = ergebnis ? (
    <Callout ton="" icon="✓" role="status">
      <div className="row-between wrap">
        <span>{ergebnis}</span>
        <button type="button" className="btn btn-sm btn-outline" onClick={() => navigate({ view: 'projekte' })}>
          Zu den Projekten
        </button>
      </div>
    </Callout>
  ) : null;

  const vorschau =
    gelesen && plan ? (
      <Card>
        <CardHeader
          titel="Vorschau – Import aus PzE"
          sub={`Blatt „${gelesen.blatt}“`}
          actions={
            <>
              <button type="button" className="btn btn-outline" onClick={verwerfen}>
                Verwerfen
              </button>
              {importKnopf}
            </>
          }
        />
        <div className="card-pad stack" style={{ gap: 14 }}>
          <div className="bb-imp-summe">
            <span className="small muted">
              {anzahl(gelesen.vorhaben.length, 'Vorhaben', 'Vorhaben')} ·{' '}
              {anzahl(plan.posten.length, 'Anmeldung', 'Anmeldungen')} (je Fahrplanjahr eine)
            </span>
            <Badge ton="green">{plan.summe.neu} neu</Badge>
            {plan.summe.vorhanden ? <Badge>{plan.summe.vorhanden} vorhanden</Badge> : null}
            {plan.summe.uebersprungen ? <Badge ton="orange">{plan.summe.uebersprungen} übersprungen</Badge> : null}
            {plan.summe.nichtRelevant ? (
              <span className="small tertiary">{plan.summe.nichtRelevant} von nicht relevanten Erstellern</span>
            ) : null}
          </div>

          {gelesen.fehlend.length > 0 ? (
            <Callout ton="warn" icon="!">
              Die Datei enthält keine Spalte für {gelesen.fehlend.map((f) => PZE_SPALTEN[f].label).join(', ')} – diese
              Angaben bleiben leer.
            </Callout>
          ) : null}

          <section>
            <div className="row-between wrap">
              <h3 className="bb-imp-titel">Relevante Ersteller</h3>
              <div className="row wrap" style={{ gap: 6 }}>
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => alleErsteller(true)}>
                  Alle
                </button>
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => alleErsteller(false)}>
                  Keinen
                </button>
              </div>
            </div>
            <p className="small tertiary bb-imp-text">
              Importiert werden nur Vorhaben der angehakten Ersteller („Erstellt von“). Die Auswahl gilt auch für den
              nächsten Import; wer neu dazukommt, ist nicht angehakt.
            </p>
            <div className="bb-imp-ersteller">
              {plan.ersteller.map((e) => (
                <label key={e.name} className="checkbox">
                  <input
                    type="checkbox"
                    checked={e.relevant}
                    onChange={(ev) => setErsteller((w) => ({ ...w, [e.name]: ev.target.checked }))}
                  />
                  <span>
                    {erstellerName(e.name)}{' '}
                    <span className="tertiary">· {anzahl(e.vorhaben, 'Vorhaben', 'Vorhaben')}</span>
                  </span>
                  {e.unbekannt ? <Badge ton="blue">neu</Badge> : null}
                </label>
              ))}
            </div>
          </section>

          {relevante.length === 0 ? (
            <Callout icon="i">Noch kein Ersteller angehakt – es wird nichts importiert.</Callout>
          ) : null}

          {gruppen.length > 0 ? (
            <section>
              <h3 className="bb-imp-titel">Projekte</h3>
              <p className="small tertiary bb-imp-text">
                Je Angabe unter „Enthaltene Projekte“ ein Projekt; seine Fahrplanjahre ergänzt der Import. Die Zuordnung
                gilt auch für den nächsten Import.
              </p>
              <div className="table-scroll">
                <table className="table table-stack">
                  <thead>
                    <tr>
                      <th>Projekt in PzE</th>
                      <th>Projekt in KaPlan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gruppen.map((g) => (
                      <tr key={g.schluessel}>
                        <td>
                          <strong>{g.projekt || 'ohne Angabe'}</strong>
                          <div className="small tertiary">
                            {[
                              anzahl(g.neu, 'neue Anmeldung', 'neue Anmeldungen'),
                              g.vorhanden ? `${g.vorhanden} vorhanden` : '',
                              `Fahrplanjahre ${g.fahrplanjahre.join(', ')}`,
                              g.treffer ? `${g.gemerkt ? 'zugeordnet' : 'passt zu'} „${g.treffer.name}“` : '',
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </div>
                        </td>
                        <td style={{ minWidth: 220 }}>
                          <div className="stack" style={{ gap: 6 }}>
                            <select
                              className="select"
                              value={g.wahl}
                              aria-label={`Projekt für ${g.projekt || 'Vorhaben ohne Projekt'}`}
                              onChange={(e) => setProjektWahl((w) => ({ ...w, [g.schluessel]: e.target.value }))}
                            >
                              <option value={KEIN_PROJEKT}>– nicht importieren –</option>
                              <option value={NEUES_PROJEKT}>+ Neues Projekt anlegen</option>
                              <optgroup label="Vorhandene Projekte">
                                {projekte.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name}
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
                            {g.ergaenzt.length > 0 ? (
                              <span className="small tertiary">Fahrplanjahre ergänzen: {g.ergaenzt.join(', ')}</span>
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

          {relevante.length > 0 ? (
            <section>
              <h3 className="bb-imp-titel">Anmeldungen</h3>
              <p className="small tertiary bb-imp-text">
                Vorgabe je Fahrplanjahr nach dem nächsten offenen Stichtag laut Richtlinie: SKM oder MKM – fällt ein
                Fahrplanjahr in beide, der frühere. Ist keiner mehr offen, gehört das Vorhaben ins KM bzw. unterjährig und
                wird übersprungen. Neue Anmeldungen beginnen im ersten Status.
              </p>
              <div className="table-scroll">
                <table className="table table-stack">
                  <thead>
                    <tr>
                      <th>Vorhaben</th>
                      <th>Fahrplanjahr</th>
                      <th>Workflow</th>
                      <th>Ergebnis</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relevante.map((p) => (
                      <tr key={`${p.schluessel}|${p.quelle.zeile}`}>
                        <td>
                          <strong>{p.quelle.bezeichnung}</strong>
                          <div className="small tertiary">
                            {[erstellerName(p.quelle.ersteller), p.quelle.projekt].filter(Boolean).join(' · ')}
                          </div>
                        </td>
                        <td className="num">{p.fahrplanjahr}</td>
                        <td style={{ minWidth: 150 }}>
                          {p.ergebnis === 'neu' ? (
                            <>
                              <select
                                className="select"
                                value={p.workflowId ?? ''}
                                aria-label={`Workflow für „${p.quelle.bezeichnung}“ (${p.fahrplanjahr})`}
                                onChange={(e) => setWorkflowWahl((w) => ({ ...w, [p.schluessel]: e.target.value }))}
                              >
                                {plan.workflows.map((w) => (
                                  <option key={w.id} value={w.id}>
                                    {w.kurz || w.name}
                                  </option>
                                ))}
                              </select>
                              {p.statusId ? (
                                <div className="small tertiary">→ {zielText(data.workflows, p.statusId)}</div>
                              ) : null}
                            </>
                          ) : p.ergebnis === 'vorhanden' && p.bestehend ? (
                            <span className="small">{zielText(data.workflows, p.bestehend.statusId)}</span>
                          ) : (
                            <span className="small tertiary">–</span>
                          )}
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
                Übersprungen: {gruende.map(([grund, namen]) => `${grund} (${namen.length})`).join(' · ')}
              </summary>
              <ul className="small tertiary">
                {gruende.map(([grund, namen]) => (
                  <li key={grund}>
                    {grund}: {namen.join(', ')}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            {importKnopf}
          </div>
        </div>
      </Card>
    ) : null;

  return { kachel, vorschau, meldung };
}
