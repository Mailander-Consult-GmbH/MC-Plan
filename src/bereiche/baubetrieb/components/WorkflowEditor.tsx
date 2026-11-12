/**
 * Grafischer Workflow-Editor der Baubetriebsplanung – in Optik und Bedienung
 * wie der Workflow-Editor des Planlaufmanagements, aber eigenständig und auf
 * Status mit Nachfolgern zugeschnitten (ohne E-Mails und parallele Zweige).
 * Ein Status kann eine Entscheidung sein (Typ „Entscheidung“): mit Frage und
 * je Nachfolger einer Antwort, die an den Übergängen steht.
 *
 * Links die Arbeitsfläche: der Standardverlauf als Spalte von Karten (vom
 * Startstatus über den jeweils ersten Nachfolger bis „Genehmigt“, einer
 * Übernahme in einen anderen Workflow, „Eintrag löschen“ oder einer Schleife,
 * domain/workflowGraph.ts), daneben die Abweichungen – Status, die nur über
 * andere Nachfolger erreicht werden. Übergänge abseits des Standardverlaufs
 * zeichnet eine SVG-Ebene aus den gemessenen Kartenpositionen; Übernahmen in
 * andere Workflows und „Eintrag löschen“ stehen als Text auf der Karte. Das
 * „+“ zwischen zwei Karten fügt dort einen Status ein. Rechts stehen die
 * Statusdetails des gewählten Status, ohne Auswahl die Übersicht mit
 * Kurzbezeichnung, Beschreibung, Sperrzeitraum, Maßnahmenarten und Hinweisen.
 * Auf schmalen Bildschirmen stehen die Abweichungen unter dem Standardverlauf
 * und die Details öffnen sich als Blatt von unten.
 *
 * Der Editor arbeitet auf einer eigenen Kopie (mit Rückgängig und
 * Wiederholen) und speichert erst mit „Speichern“ (`saveWorkflow`). Er hängt
 * über ein Portal an `document.body`.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../../../shared/icons';
import { useToast } from '../../../shared/toast';
import { AufklappMenue } from '../../../shared/menue';
import { ConfirmDialog } from '../../../shared/ui';
import { fristRegelText } from '../domain/fristen';
import {
  ALLE_ARTEN,
  BAUZEITRAUM_LABEL,
  FRIST_TYP_LABEL,
  LOESCHEN,
  PHASE_LABEL,
  RIL_BEZUG_LABEL,
  RIL_BEZUG_PHASE,
  STATUS_ART_LABEL,
  ZUSTAENDIGKEIT_LABEL,
  type AnmeldungsArt,
  type BauzeitraumModus,
  type FristRegel,
  type FristTyp,
  type ID,
  type Phase,
  type RilBezug,
  type StatusArt,
  type StatusZiel,
  type Workflow,
  type WorkflowStatus,
  type Zustaendigkeit,
} from '../domain/types';
import { dientZumNachhaken, zielText } from '../domain/workflow';
import { anmeldungenJeStatus, belegteEntfallendeStatus } from '../domain/workflowPflege';
import {
  alsStandard,
  antwortSetzen,
  antwortVorgabe,
  duplizieren,
  einfuegen,
  entfernen,
  fremdZielText,
  gliedern,
  nachfolgerEntfernen,
  nachfolgerErsetzen,
  nachfolgerHinzufuegen,
  pruefen,
  typSetzen,
  verschieben,
  type Einfuegestelle,
  type Gliederung,
  type Hinweis,
  type Kante,
} from '../domain/workflowGraph';
import { newId, useStore } from '../store/store';
import { STATUS_TON } from './common';
import './workflowEditor.css';

/** Was der Editor bearbeitet – mit Rückgängig und Wiederholen. */
interface Stand {
  name: string;
  kurz: string;
  beschreibung: string;
  bauzeitraum: BauzeitraumModus;
  arten: AnmeldungsArt[];
  status: WorkflowStatus[];
}

interface Verlauf {
  vorher: Stand[];
  jetzt: Stand;
  nachher: Stand[];
  /** Zuletzt bearbeitetes Feld – Tippen im selben Feld ergibt nur einen Rückgängig-Schritt. */
  feld: string | null;
}

const nr = (i: number) => String(i + 1).padStart(2, '0');
const statusText = (n: number) => `${n} Status`;
const abweichungenText = (n: number) => `${n} ${n === 1 ? 'Abweichung' : 'Abweichungen'}`;
const entscheidungenText = (n: number) => `${n} ${n === 1 ? 'Entscheidung' : 'Entscheidungen'}`;
const anmeldungenText = (n: number) => `${n} ${n === 1 ? 'Anmeldung' : 'Anmeldungen'}`;

/** Kürzel der Zuständigkeit auf der Karte. */
const ZUSTAENDIG_KUERZEL: Record<Zustaendigkeit, string> = { mic: 'MIC', bbk: 'BBK', projektleitung: 'PL' };

/** Kurzform der Terminfrist auf der Karte. */
const fristKurz = (f: FristRegel) => (f.typ === 'keine' ? 'keine Frist' : fristRegelText(f));

/** Neuer, noch leerer Status. */
export function neuerStatus(): WorkflowStatus {
  return {
    id: newId('st'),
    name: '',
    art: 'entwurf',
    zustaendig: null,
    frist: { typ: 'keine' },
    nachhaken: false,
    bemerkung: '',
    nachfolger: [],
    entscheidung: null,
  };
}

/** Typ eines neuen Eintrags im Ablauf: gewöhnlicher Status oder Entscheidung. */
type NeuTyp = 'status' | 'entscheidung';

/** Bildschirm schmaler als die Arbeitsfläche mit zwei Spalten. */
function useSchmal(grenze = 820): boolean {
  const abfrage = `(max-width: ${grenze}px)`;
  const [schmal, setSchmal] = useState(() => window.matchMedia(abfrage).matches);
  useEffect(() => {
    const mq = window.matchMedia(abfrage);
    const wechsel = () => setSchmal(mq.matches);
    mq.addEventListener('change', wechsel);
    return () => mq.removeEventListener('change', wechsel);
  }, [abfrage]);
  return schmal;
}

export function WorkflowEditor({ workflow, onClose }: { workflow?: Workflow; onClose: () => void }) {
  const { data, saveWorkflow } = useStore();
  const toast = useToast();
  const schmal = useSchmal();
  // Bis zu dieser Breite liegen die Details als Schublade über der Fläche
  const mittel = useSchmal(1279) && !schmal;
  const workflowId = workflow?.id ?? null;

  const [verlauf, setVerlauf] = useState<Verlauf>(() => ({
    vorher: [],
    jetzt: workflow
      ? {
          name: workflow.name,
          kurz: workflow.kurz,
          beschreibung: workflow.beschreibung,
          bauzeitraum: workflow.bauzeitraum,
          arten: [...workflow.arten],
          status: workflow.status.map((s) => ({ ...s, frist: { ...s.frist }, nachfolger: [...s.nachfolger] })),
        }
      : {
          name: '',
          kurz: '',
          beschreibung: '',
          bauzeitraum: 'tagesscharf',
          arten: [...ALLE_ARTEN],
          status: [neuerStatus()],
        },
    nachher: [],
    feld: null,
  }));
  const stand = verlauf.jetzt;
  const { status } = stand;
  const geaendert = verlauf.vorher.length > 0;

  /** Auswahl: ein Status, die Übersicht oder (nur schmal) nichts. Neu: der leere erste Status. */
  const [auswahl, setAuswahl] = useState<ID | 'uebersicht' | null>(() =>
    workflow ? null : (stand.status[0]?.id ?? null),
  );
  const [verwerfenFrage, setVerwerfenFrage] = useState(false);
  /** Menü „Status hinzufügen“ (Status oder Entscheidung). */
  const [menue, setMenue] = useState(false);
  const hinzuKnopf = useRef<HTMLButtonElement>(null);
  const [hover, setHover] = useState<ID | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  // Solange der Editor offen ist, bleibt die Seite dahinter unbedienbar
  useEffect(() => {
    const vorher = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const root = document.getElementById('root');
    root?.setAttribute('inert', '');
    (nameRef.current ?? dialogRef.current)?.focus();
    return () => {
      root?.removeAttribute('inert');
      vorher?.focus();
    };
  }, []);

  /** Übernimmt eine Änderung in den Verlauf; `feld` fasst Tippen zusammen. */
  const aendern = useCallback((f: (s: Stand) => Stand, feld: string | null = null) => {
    setVerlauf((v) => {
      const neu = f(v.jetzt);
      if (feld !== null && feld === v.feld) return { ...v, jetzt: neu };
      return { vorher: [...v.vorher, v.jetzt].slice(-150), jetzt: neu, nachher: [], feld };
    });
  }, []);
  const aendernStatus = useCallback(
    (f: (s: WorkflowStatus[]) => WorkflowStatus[], feld: string | null = null) =>
      aendern((s) => ({ ...s, status: f(s.status) }), feld),
    [aendern],
  );
  const statusAendern = (id: ID, f: (s: WorkflowStatus) => WorkflowStatus, feld: string | null = null) =>
    aendernStatus((alle) => alle.map((s) => (s.id === id ? f(s) : s)), feld);

  const rueckgaengig = useCallback(
    () =>
      setVerlauf((v) =>
        v.vorher.length === 0
          ? v
          : {
              vorher: v.vorher.slice(0, -1),
              jetzt: v.vorher[v.vorher.length - 1],
              nachher: [v.jetzt, ...v.nachher],
              feld: null,
            },
      ),
    [],
  );
  const wiederholen = useCallback(
    () =>
      setVerlauf((v) =>
        v.nachher.length === 0
          ? v
          : { vorher: [...v.vorher, v.jetzt], jetzt: v.nachher[0], nachher: v.nachher.slice(1), feld: null },
      ),
    [],
  );

  // Anmeldungen je Status – Status mit Anmeldungen können nicht entfallen
  const zahl = useMemo(() => anmeldungenJeStatus(data), [data]);
  const imWorkflow = workflow ? workflow.status.reduce((summe, s) => summe + (zahl.get(s.id) ?? 0), 0) : 0;
  const belegt = (id: ID) => (workflow?.status.some((s) => s.id === id) ? (zahl.get(id) ?? 0) : 0);

  const gliederung = useMemo(() => gliedern(status, workflowId, data.workflows), [status, workflowId, data.workflows]);
  const hinweise = useMemo<Hinweis[]>(() => {
    const liste = pruefen(stand, gliederung);
    if (workflow) {
      for (const b of belegteEntfallendeStatus(
        data,
        workflow.id,
        status.map((s) => s.id),
      )) {
        liste.unshift({
          text: `„${b.status.name}“ kann nicht entfallen – darin stehen noch Anmeldungen.`,
          sperrt: true,
        });
      }
    }
    return liste;
  }, [stand, gliederung, workflow, data, status]);
  const fehlend = useMemo(
    () => new Set(hinweise.filter((h) => h.sperrt && h.statusId).map((h) => h.statusId!)),
    [hinweise],
  );
  const uebernahmen = gliederung.kanten.filter((k) => k.art === 'uebernahme').length;
  const entscheidungen = status.filter((s) => s.entscheidung).length;

  // Gewählter Status verschwindet (Rückgängig, Entfernen) → Auswahl aufheben
  const gewaehlt =
    typeof auswahl === 'string' && auswahl !== 'uebersicht' ? status.find((s) => s.id === auswahl) : undefined;
  useEffect(() => {
    if (auswahl && auswahl !== 'uebersicht' && !status.some((s) => s.id === auswahl)) setAuswahl(null);
  }, [auswahl, status]);

  /** Reihenfolge der Karten im Bild: Standardverlauf, Abweichungen, nicht erreichbar. */
  const bildFolge = useMemo(() => {
    const folge = [...gliederung.haupt, ...gliederung.abweichungen.map((a) => a.id), ...gliederung.unerreichbar];
    return [...folge, ...status.map((s) => s.id).filter((id) => !folge.includes(id))];
  }, [gliederung, status]);

  /* ---------------------------------------------------------------- */
  /* Bearbeitungen                                                     */
  /* ---------------------------------------------------------------- */

  const einfuegenIn = (stelle: Einfuegestelle, typ: NeuTyp = 'status') => {
    const neu = neuerStatus();
    aendernStatus((alle) => {
      const mit = einfuegen(alle, stelle, neu);
      return typ === 'entscheidung' ? typSetzen(mit, neu.id, true) : mit;
    });
    setAuswahl(neu.id);
    setMenue(false);
  };

  /**
   * Wo „Status hinzufügen“ einfügt: hinter dem gewählten Status, sonst am Ende
   * des Standardverlaufs – endet er mit „Genehmigt“, davor.
   */
  const hinzufuegeStelle = (): { stelle: Einfuegestelle; text: string } => {
    const name = (id: ID) => status.find((s) => s.id === id)?.name.trim() || 'ohne Bezeichnung';
    if (gewaehlt) return { stelle: { art: 'nach', vonId: gewaehlt.id }, text: `Hinter „${name(gewaehlt.id)}“` };
    const { haupt, ende } = gliederung;
    if (haupt.length === 0) return { stelle: { art: 'anfang' }, text: 'Als Startstatus' };
    if (ende.art === 'ziel') {
      const ziel = haupt[haupt.length - 1];
      return {
        stelle: haupt.length > 1 ? { art: 'nach', vonId: haupt[haupt.length - 2] } : { art: 'anfang' },
        text: `Vor „${name(ziel)}“ im Standardverlauf`,
      };
    }
    return { stelle: { art: 'nach', vonId: haupt[haupt.length - 1] }, text: 'Am Ende des Standardverlaufs' };
  };

  const entfernenMitMeldung = (id: ID) => {
    const n = belegt(id);
    if (n > 0) {
      toast(
        `Der Status lässt sich nicht entfernen – darin ${n === 1 ? 'steht noch eine Anmeldung' : `stehen noch ${n} Anmeldungen`}.`,
      );
      return;
    }
    aendernStatus((alle) => entfernen(alle, id));
    setAuswahl(null);
    toast('Status entfernt – „Rückgängig“ holt ihn zurück.');
  };

  const speichern = () => {
    if (!stand.name.trim()) {
      toast('Bitte einen Namen angeben.');
      nameRef.current?.focus();
      return;
    }
    const sperrend = hinweise.find((h) => h.sperrt);
    if (sperrend) {
      toast(sperrend.text);
      setAuswahl(sperrend.statusId ?? 'uebersicht');
      return;
    }
    if (workflow && imWorkflow > 0 && stand.bauzeitraum !== workflow.bauzeitraum) {
      toast('Der Sperrzeitraum lässt sich nicht umstellen, solange Anmeldungen in diesem Workflow stehen.');
      return;
    }
    saveWorkflow({
      id: workflow?.id ?? newId('wf'),
      name: stand.name.trim(),
      kurz: stand.kurz.trim(),
      beschreibung: stand.beschreibung.trim(),
      herkunft: workflow?.herkunft ?? 'manuell',
      bauzeitraum: stand.bauzeitraum,
      arten: stand.arten,
      status: status.map((s) => ({ ...s, name: s.name.trim(), bemerkung: s.bemerkung.trim() })),
    });
    toast(workflow ? 'Workflow gespeichert.' : 'Workflow angelegt.');
    onClose();
  };

  const schliessen = useCallback(() => {
    if (geaendert) setVerwerfenFrage(true);
    else onClose();
  }, [geaendert, onClose]);

  /* ---------------------------------------------------------------- */
  /* Tastatur                                                          */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    const taste = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Ist das Menü „Status hinzufügen“ offen, gilt Escape ihm: Das AufklappMenue schließt sich
        // selbst und gibt den Fokus an den Knopf zurück – der Editor bleibt offen.
        if (menue) return;
        e.stopPropagation();
        if (verwerfenFrage) setVerwerfenFrage(false);
        else if ((schmal || mittel) && auswahl) setAuswahl(null);
        else schliessen();
        return;
      }
      const mod = e.ctrlKey || e.metaKey;
      // Tippen ist je Feld zu einem Schritt zusammengefasst – Rückgängig gilt daher auch in Feldern
      if (!mod || verwerfenFrage) return;
      const k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) {
        e.preventDefault();
        rueckgaengig();
      } else if (k === 'y' || (k === 'z' && e.shiftKey)) {
        e.preventDefault();
        wiederholen();
      }
    };
    window.addEventListener('keydown', taste, true);
    return () => window.removeEventListener('keydown', taste, true);
  }, [auswahl, menue, mittel, rueckgaengig, schliessen, schmal, verwerfenFrage, wiederholen]);

  /* ---------------------------------------------------------------- */
  /* Darstellung                                                       */
  /* ---------------------------------------------------------------- */

  const detailsSichtbar = (!schmal && !mittel) || auswahl !== null;
  const panel = gewaehlt ? (
    <StatusDetails
      key={gewaehlt.id}
      s={gewaehlt}
      status={status}
      workflowId={workflowId}
      gliederung={gliederung}
      bildFolge={bildFolge}
      belegt={belegt(gewaehlt.id)}
      nachhakTage={data.einstellungen.nachhakTage}
      onAuswahl={setAuswahl}
      onStatusAendern={statusAendern}
      onListeAendern={aendernStatus}
      onEntfernen={entfernenMitMeldung}
      onSchliessen={() => setAuswahl(null)}
      schmal={schmal || mittel}
    />
  ) : (
    <Uebersicht
      stand={stand}
      onAendern={aendern}
      gliederung={gliederung}
      hinweise={hinweise}
      imWorkflow={imWorkflow}
      uebernahmen={uebernahmen}
      onAuswahl={setAuswahl}
      onSchliessen={schmal || mittel ? () => setAuswahl(null) : undefined}
    />
  );
  const hinzu = hinzufuegeStelle();

  return createPortal(
    <div className="bb-wf-overlay" onMouseDown={(e) => e.target === e.currentTarget && schliessen()}>
      <div
        className="bb-wf-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={workflow ? 'Workflow bearbeiten' : 'Neuer Workflow'}
        ref={dialogRef}
        tabIndex={-1}
      >
        <header className="bb-wf-kopf">
          <div className="bb-wf-kopf-titel">
            <div className="bb-wf-kopf-oben">{workflow ? 'Workflow bearbeiten' : 'Neuer Workflow'}</div>
            <input
              ref={nameRef}
              className={`bb-wf-name ${stand.name.trim() ? '' : 'bb-wf-pflicht'}`}
              value={stand.name}
              placeholder="Name des Workflows"
              aria-label="Name des Workflows"
              onChange={(e) => aendern((s) => ({ ...s, name: e.target.value }), 'name')}
            />
            <div className="bb-wf-kopf-sub">
              {[
                stand.kurz.trim() ? `Kurzbezeichnung ${stand.kurz.trim()}` : '',
                BAUZEITRAUM_LABEL[stand.bauzeitraum],
                workflow ? anmeldungenText(imWorkflow) : '',
              ]
                .filter(Boolean)
                .join(' · ')}
            </div>
          </div>
          <div className="bb-wf-werkzeuge">
            <span className="bb-wf-kennzahl">
              {statusText(status.length)}
              {entscheidungen > 0 ? ` · ${entscheidungenText(entscheidungen)}` : ''} ·{' '}
              {abweichungenText(gliederung.abweichungen.length)}
            </span>
            <div className="bb-wf-knopfgruppe">
              <button
                type="button"
                className="btn-icon"
                onClick={rueckgaengig}
                disabled={verlauf.vorher.length === 0}
                title="Rückgängig (Strg+Z)"
                aria-label="Rückgängig"
              >
                <Icon name="rueckgaengig" size={17} />
              </button>
              <button
                type="button"
                className="btn-icon"
                onClick={wiederholen}
                disabled={verlauf.nachher.length === 0}
                title="Wiederholen (Strg+Y)"
                aria-label="Wiederholen"
              >
                <Icon name="wiederholen" size={17} />
              </button>
            </div>
            {schmal || mittel ? (
              <button type="button" className="btn btn-sm btn-outline" onClick={() => setAuswahl('uebersicht')}>
                <Icon name="info" size={13} /> Übersicht
              </button>
            ) : null}
            <button
              ref={hinzuKnopf}
              type="button"
              className="btn btn-sm btn-outline"
              onClick={() => setMenue((m) => !m)}
              aria-haspopup="menu"
              aria-expanded={menue}
            >
              <Icon name="plus" size={13} /> Status hinzufügen
            </button>
            {menue ? (
              <AufklappMenue
                anker={hinzuKnopf}
                titel={hinzu.text}
                eintraege={[
                  {
                    key: 'status',
                    inhalt: (
                      <span className="bb-wf-menue-eintrag">
                        <span className="bb-wf-art-zeichen ton-blue">
                          <Icon name="aufgabe" size={15} />
                        </span>
                        <span>
                          <b>Status</b>
                          <small>Ein Schritt im Ablauf mit Terminfrist und Zuständigkeit</small>
                        </span>
                      </span>
                    ),
                    onWaehle: () => einfuegenIn(hinzu.stelle),
                  },
                  {
                    key: 'entscheidung',
                    inhalt: (
                      <span className="bb-wf-menue-eintrag">
                        <span className="bb-wf-art-zeichen ton-purple">
                          <Icon name="raute" size={15} />
                        </span>
                        <span>
                          <b>Entscheidung</b>
                          <small>Verzweigt je nach Antwort, z. B. Ja / Nein</small>
                        </span>
                      </span>
                    ),
                    onWaehle: () => einfuegenIn(hinzu.stelle, 'entscheidung'),
                  },
                ]}
                onSchliessen={(fokusZurueck) => {
                  setMenue(false);
                  if (fokusZurueck) hinzuKnopf.current?.focus();
                }}
              />
            ) : null}
            <button type="button" className="btn-icon bb-wf-zu" onClick={schliessen} aria-label="Schließen">
              ✕
            </button>
          </div>
        </header>

        <div className={`bb-wf-rumpf ${schmal ? 'schmal' : mittel ? 'mittel' : ''}`}>
          <div
            className="bb-wf-flaeche"
            inert={(schmal || mittel) && auswahl !== null}
            onMouseDown={(e) => e.target === e.currentTarget && setAuswahl(null)}
          >
            {workflow?.herkunft === 'standard' ? (
              <div className="bb-wf-banner">
                Mitgelieferter Standard-Workflow: Änderungen wirken sofort auf alle Anmeldungen in diesem Workflow – für
                Abweichungen besser duplizieren.
              </div>
            ) : null}
            {status.length === 0 ? (
              <div className="bb-wf-leer">
                <Icon name="kette" size={30} strokeWidth={1.3} />
                <strong>Noch kein Status</strong>
                <span>Legen Sie den Startstatus an.</span>
                <div className="row">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => einfuegenIn({ art: 'anfang' })}
                  >
                    <Icon name="plus" size={13} /> Status
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => einfuegenIn({ art: 'anfang' }, 'entscheidung')}
                  >
                    <Icon name="plus" size={13} /> Entscheidung
                  </button>
                </div>
              </div>
            ) : (
              <Ablaufbild
                status={status}
                workflows={data.workflows}
                gliederung={gliederung}
                auswahl={gewaehlt?.id ?? null}
                hover={hover}
                fehlend={fehlend}
                schmal={schmal}
                belegt={belegt}
                onAuswahl={(id, perTastatur) => {
                  setAuswahl(id);
                  if (perTastatur) setTimeout(() => panelRef.current?.focus(), 0);
                }}
                onHover={setHover}
                onEinfuegen={einfuegenIn}
              />
            )}
          </div>
          {detailsSichtbar ? (
            <>
              {schmal || mittel ? (
                <div
                  className={schmal ? 'bb-wf-blatt-schatten' : 'bb-wf-schublade-schatten'}
                  onMouseDown={() => setAuswahl(null)}
                />
              ) : null}
              <aside
                ref={panelRef}
                tabIndex={-1}
                className={`bb-wf-panel ${schmal ? 'blatt' : mittel ? 'schublade' : ''}`}
              >
                {panel}
              </aside>
            </>
          ) : null}
        </div>

        <footer className="bb-wf-fuss">
          <span className="bb-wf-fuss-info">
            {hinweise.length > 0 ? (
              <button
                type="button"
                className={`bb-wf-hinweis-knopf ${hinweise.some((h) => h.sperrt) ? 'sperrt' : ''}`}
                onClick={() => setAuswahl('uebersicht')}
              >
                {hinweise.length} {hinweise.length === 1 ? 'Hinweis' : 'Hinweise'}
              </button>
            ) : (
              <span className="bb-wf-ok">
                <Icon name="check" size={13} /> Vollständig
              </span>
            )}
            <span className="tertiary">
              {entscheidungen > 0 ? `${entscheidungenText(entscheidungen)} · ` : ''}
              {abweichungenText(gliederung.abweichungen.length)}
              {uebernahmen > 0
                ? ` · ${uebernahmen} ${uebernahmen === 1 ? 'Übernahme' : 'Übernahmen'} in andere Workflows`
                : ''}
            </span>
          </span>
          <span className="spacer" />
          <button type="button" className="btn" onClick={schliessen}>
            Abbrechen
          </button>
          <button type="button" className="btn btn-primary" onClick={speichern}>
            Speichern
          </button>
        </footer>
      </div>

      {verwerfenFrage ? (
        <ConfirmDialog
          titel="Änderungen verwerfen?"
          text="Die Änderungen an diesem Workflow gehen verloren."
          bestaetigenLabel="Verwerfen"
          abbrechenLabel="Weiter bearbeiten"
          onConfirm={onClose}
          onClose={() => setVerwerfenFrage(false)}
        />
      ) : null}
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------------ */
/* Ablaufbild                                                          */
/* ------------------------------------------------------------------ */

interface Box {
  l: number;
  t: number;
  r: number;
  b: number;
}

interface Geometrie {
  breite: number;
  hoehe: number;
  karten: Record<ID, Box>;
  /** Rechte Kante der Standardspalte, linke und rechte Kante der Abweichungsspalte. */
  hauptRechts: number;
  abwLinks: number;
  abwRechts: number;
}

type KartenOrt = 'haupt' | 'abweichung' | 'unerreichbar';

function Ablaufbild({
  status,
  workflows,
  gliederung,
  auswahl,
  hover,
  fehlend,
  schmal,
  belegt,
  onAuswahl,
  onHover,
  onEinfuegen,
}: {
  status: WorkflowStatus[];
  /** Alle Workflows – für die Texte der Übernahmen. */
  workflows: Workflow[];
  gliederung: Gliederung;
  auswahl: ID | null;
  hover: ID | null;
  fehlend: Set<ID>;
  schmal: boolean;
  belegt: (id: ID) => number;
  onAuswahl: (id: ID, perTastatur: boolean) => void;
  onHover: (id: ID | null) => void;
  onEinfuegen: (stelle: Einfuegestelle) => void;
}) {
  const rasterRef = useRef<HTMLDivElement>(null);
  const hauptRef = useRef<HTMLDivElement>(null);
  const abwRef = useRef<HTMLDivElement>(null);
  const karten = useRef(new Map<ID, HTMLElement>());
  const [geo, setGeo] = useState<Geometrie | null>(null);

  const index = useMemo(() => new Map(status.map((s, i) => [s.id, i])), [status]);
  const zuStatus = (id: ID) => status[index.get(id)!];
  const { haupt, ende, abweichungen, unerreichbar, kanten, einstiege } = gliederung;

  const messen = useCallback(() => {
    const raster = rasterRef.current;
    if (!raster || schmal) return;
    const basis = raster.getBoundingClientRect();
    // Während der Öffnungsanimation ist der Dialog skaliert – Maßstab herausrechnen
    const mx = basis.width ? raster.offsetWidth / basis.width : 1;
    const my = basis.height ? raster.offsetHeight / basis.height : 1;
    const box = (el: Element): Box => {
      const r = el.getBoundingClientRect();
      return {
        l: (r.left - basis.left) * mx,
        t: (r.top - basis.top) * my,
        r: (r.right - basis.left) * mx,
        b: (r.bottom - basis.top) * my,
      };
    };
    const neu: Geometrie = {
      breite: raster.offsetWidth,
      hoehe: raster.offsetHeight,
      karten: {},
      hauptRechts: hauptRef.current ? box(hauptRef.current).r : 0,
      abwLinks: abwRef.current ? box(abwRef.current).l : 0,
      abwRechts: abwRef.current ? box(abwRef.current).r : 0,
    };
    karten.current.forEach((el, id) => {
      if (el.isConnected) neu.karten[id] = box(el);
    });
    setGeo((alt) => (alt && JSON.stringify(alt) === JSON.stringify(neu) ? alt : neu));
  }, [schmal]);

  useLayoutEffect(() => {
    messen();
  });
  useEffect(() => {
    const raster = rasterRef.current;
    if (!raster) return;
    const ro = new ResizeObserver(() => messen());
    ro.observe(raster);
    return () => ro.disconnect();
  }, [messen]);

  const merke = (id: ID) => (el: HTMLElement | null) => {
    if (el) karten.current.set(id, el);
    else karten.current.delete(id);
  };

  const titel = (id: ID) => `${nr(index.get(id)!)} · ${zuStatus(id).name || 'ohne Bezeichnung'}`;

  /* --------------------------- Rang und Rücksprünge --------------------------- */

  const hauptPos = new Map<ID, number>(haupt.map((id, k) => [id, k]));
  /** Stelle im Ablauf: Index im Standardverlauf, bei Abweichungen ihr Anker + ½. */
  const rang = new Map<ID, number>([...hauptPos, ...abweichungen.map((a): [ID, number] => [a.id, a.anker + 0.5])]);
  /** Rücksprung: Übergang zu einer Stelle des Standardverlaufs, die nicht später kommt. */
  const istRueck = (k: Kante) =>
    k.art === 'intern' && hauptPos.has(k.nach) && rang.has(k.von) && hauptPos.get(k.nach)! <= rang.get(k.von)!;

  /** Übergänge, die als Linie gezeichnet werden: abseits des Standardverlaufs, zwischen Stellen des Bilds. */
  const gezeichnet = (k: Kante) => !schmal && !k.standard && k.art === 'intern' && rang.has(k.von) && rang.has(k.nach);
  const seitenKanten = kanten.filter(gezeichnet);

  /** Ziel eines Übergangs als Text auf der Karte. */
  const zielTextVon = (k: Kante) => (k.art === 'intern' ? titel(k.nach) : fremdZielText(workflows, k.nach));

  /* --------------------------------- Bausteine --------------------------------- */

  const karte = (id: ID, ort: KartenOrt) => {
    const s = zuStatus(id);
    // Übergänge als Text: Übernahmen, Löschen und – schmal oder ohne Linie – die übrigen
    const zweige = kanten.filter((k) => k.von === id && !k.standard && !gezeichnet(k));
    return (
      <KarteAnzeige
        key={id}
        s={s}
        nummer={index.get(id)!}
        ort={ort}
        aktiv={auswahl === id}
        hervor={
          hover !== null &&
          (hover === id || kanten.some((k) => (k.von === hover && k.nach === id) || (k.nach === hover && k.von === id)))
        }
        fehlt={fehlend.has(id)}
        anmeldungen={belegt(id)}
        einstiege={einstiege.get(id) ?? []}
        zweige={zweige.map((k) => ({
          text: k.text,
          ziel: zielTextVon(k),
          art: k.art === 'intern' ? (istRueck(k) ? 'rueck' : 'abw') : k.art,
        }))}
        refFn={merke(id)}
        onClick={(perTastatur) => onAuswahl(id, perTastatur)}
        onHover={onHover}
      />
    );
  };

  /** Übergang im Standardverlauf, mit „+“ zum Einfügen an dieser Stelle; bei Entscheidungen mit der Antwort. */
  const verbinder = (stelle: Einfuegestelle | null, beschriftung: string | null = null) => (
    <div className="bb-wf-verbinder">
      <span className="bb-wf-linie" />
      {beschriftung ? <span className="bb-wf-antwort standard">{beschriftung}</span> : null}
      {stelle ? (
        <button
          type="button"
          className="bb-wf-einfuegen"
          tabIndex={-1}
          title="Status hier einfügen"
          aria-label="Status hier einfügen"
          onClick={() => onEinfuegen(stelle)}
        >
          <Icon name="plus" size={12} strokeWidth={2.2} />
        </button>
      ) : null}
      <span className="bb-wf-pfeil" />
    </div>
  );

  /** Eine Stelle des Standardverlaufs samt Übergang zur nächsten; nach „Genehmigt“ am Ziel ohne „+“. */
  const stelle = (id: ID, k: number) => {
    // Antwort einer Entscheidung, die den Standardverlauf fortsetzt
    const standard = kanten.find((x) => x.von === id && x.standard);
    return (
      <>
        {karte(id, 'haupt')}
        {verbinder(
          k === haupt.length - 1 && ende.art === 'ziel' ? null : { art: 'nach', vonId: id },
          standard?.text || null,
        )}
      </>
    );
  };

  const endknoten = (
    <div
      className={`bb-wf-knoten bb-wf-ende ${ende.art === 'uebernahme' ? 'uebernahme' : ende.art === 'loeschen' ? 'loeschen' : ''}`}
    >
      {ende.art === 'uebernahme' ? (
        <>
          <Icon name="chevron" size={14} /> Übernahme in {zielText(workflows, ende.ziel)}
        </>
      ) : ende.art === 'loeschen' ? (
        <>
          <Icon name="loeschen" size={14} /> Eintrag gelöscht
        </>
      ) : ende.art === 'schleife' ? (
        <>
          <Icon name="schleife" size={14} /> Schleife zurück zu {titel(ende.nach)}
        </>
      ) : ende.art === 'ziel' ? (
        <>
          <Icon name="ziel" size={14} /> Genehmigt – Ziel des Workflows
        </>
      ) : (
        <>
          <Icon name="ziel" size={14} /> Workflow endet hier
        </>
      )}
    </div>
  );

  const startknoten = (
    <div className="bb-wf-knoten bb-wf-start">
      <Icon name="start" size={14} /> Neu angelegt
    </div>
  );

  /* -------------------------- schmal: untereinander -------------------------- */
  if (schmal) {
    return (
      <div className="bb-wf-schmal">
        <div className="bb-wf-spaltenkopf">Standardverlauf</div>
        {startknoten}
        {verbinder({ art: 'anfang' })}
        {haupt.map((id, k) => (
          <div key={id} className="bb-wf-zelle">
            {stelle(id, k)}
          </div>
        ))}
        {endknoten}
        {abweichungen.length > 0 ? (
          <>
            <div className="bb-wf-spaltenkopf abw">Abweichungen</div>
            <div className="bb-wf-stapel">{abweichungen.map((a) => karte(a.id, 'abweichung'))}</div>
          </>
        ) : null}
        {unerreichbar.length > 0 ? (
          <>
            <div className="bb-wf-spaltenkopf weg">Nicht erreichbar</div>
            <div className="bb-wf-stapel">{unerreichbar.map((id) => karte(id, 'unerreichbar'))}</div>
          </>
        ) : null}
      </div>
    );
  }

  /* -------------------------- breit: zwei Spalten mit Linien -------------------------- */
  const abwNachAnker = new Map<number, ID[]>();
  for (const a of abweichungen) abwNachAnker.set(a.anker, [...(abwNachAnker.get(a.anker) ?? []), a.id]);
  const zeilen = haupt.length + 2;
  return (
    <div className="bb-wf-raster" ref={rasterRef}>
      <div className="bb-wf-spaltenkopf" style={{ gridColumn: 1, gridRow: 1 }}>
        Standardverlauf
      </div>
      <div className="bb-wf-spaltenkopf abw" style={{ gridColumn: 3, gridRow: 1 }}>
        Abweichungen
      </div>
      {/* Messleisten für die Spaltenkanten */}
      <div ref={hauptRef} className="bb-wf-messleiste" style={{ gridColumn: 1, gridRow: `2 / ${zeilen + 2}` }} />
      <div ref={abwRef} className="bb-wf-messleiste" style={{ gridColumn: 3, gridRow: `2 / ${zeilen + 2}` }} />

      <div className="bb-wf-zelle bb-wf-start-zelle" style={{ gridColumn: 1, gridRow: 2 }}>
        {startknoten}
        {verbinder({ art: 'anfang' })}
      </div>
      {haupt.map((id, k) => (
        <div key={id} className="bb-wf-zelle" style={{ gridColumn: 1, gridRow: k + 3 }}>
          {stelle(id, k)}
        </div>
      ))}
      <div className="bb-wf-zelle" style={{ gridColumn: 1, gridRow: haupt.length + 3 }}>
        {endknoten}
      </div>

      {abweichungen.length === 0 ? (
        <div className="bb-wf-abw-leer" style={{ gridColumn: 3, gridRow: 3 }}>
          Keine Abweichungen – jeder Status liegt im Standardverlauf. Status, die nur über einen anderen Nachfolger
          erreicht werden (etwa „Abgelehnt“), erscheinen hier.
        </div>
      ) : null}
      {[...abwNachAnker.entries()].map(([anker, ids]) => (
        <div key={`abw-${anker}`} className="bb-wf-stapel" style={{ gridColumn: 3, gridRow: anker + 3 }}>
          {ids.map((id) => karte(id, 'abweichung'))}
        </div>
      ))}

      {unerreichbar.length > 0 ? (
        <div className="bb-wf-weg" style={{ gridColumn: '1 / -1', gridRow: haupt.length + 4 }}>
          <div className="bb-wf-spaltenkopf weg">Nicht erreichbar – kein Nachfolger führt zu diesen Status</div>
          <div className="bb-wf-weg-karten">{unerreichbar.map((id) => karte(id, 'unerreichbar'))}</div>
        </div>
      ) : null}

      {geo ? (
        <Linien
          geo={geo}
          kanten={seitenKanten}
          rang={rang}
          haupt={new Set(hauptPos.keys())}
          auswahl={auswahl}
          hover={hover}
        />
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Karte                                                               */
/* ------------------------------------------------------------------ */

function KarteAnzeige({
  s,
  nummer,
  ort,
  aktiv,
  hervor,
  fehlt,
  anmeldungen,
  einstiege,
  zweige,
  refFn,
  onClick,
  onHover,
}: {
  s: WorkflowStatus;
  nummer: number;
  ort: KartenOrt;
  aktiv: boolean;
  hervor: boolean;
  fehlt: boolean;
  anmeldungen: number;
  einstiege: string[];
  zweige: { text: string | null; ziel: string; art: 'abw' | 'rueck' | 'uebernahme' | 'loeschen' | 'unbekannt' }[];
  refFn: (el: HTMLElement | null) => void;
  onClick: (perTastatur: boolean) => void;
  onHover: (id: ID | null) => void;
}) {
  const ton = STATUS_TON[s.art];
  return (
    <button
      type="button"
      ref={refFn}
      className={`bb-wf-karte ${ort} ${aktiv ? 'aktiv' : ''} ${hervor ? 'hervor' : ''} ${fehlt ? 'fehlt' : ''}`}
      onClick={(e) => onClick(e.detail === 0)}
      onMouseEnter={() => onHover(s.id)}
      onMouseLeave={() => onHover(null)}
      aria-pressed={aktiv}
    >
      <span className="bb-wf-karte-kopf">
        <span className={`bb-wf-art ${ton ? `ton-${ton}` : ''}`}>
          <span className="bb-wf-punkt-art" />
          {STATUS_ART_LABEL[s.art]}
        </span>
        <span className="bb-wf-nr">{nr(nummer)}</span>
      </span>
      <span className={`bb-wf-karte-titel ${s.name.trim() ? '' : 'leer'}`}>{s.name.trim() || 'Bezeichnung fehlt'}</span>
      {s.entscheidung ? (
        <span className="bb-wf-frage">
          <Icon name="raute" size={12} />
          {s.entscheidung.frage.trim() || 'Entscheidung'}
        </span>
      ) : null}
      <span className="bb-wf-karte-fuss">
        <span className="bb-wf-rolle">
          {s.zustaendig ? (
            <>
              <span className="bb-wf-kuerzel">{ZUSTAENDIG_KUERZEL[s.zustaendig]}</span>
              <span className="truncate">{ZUSTAENDIGKEIT_LABEL[s.zustaendig]}</span>
            </>
          ) : (
            <span className="tertiary">niemand zuständig</span>
          )}
        </span>
        <span className="bb-wf-frist" title="Terminfrist">
          <Icon name="frist" size={12} />
          {fristKurz(s.frist)}
        </span>
      </span>
      {dientZumNachhaken(s) || anmeldungen > 0 || einstiege.length > 0 ? (
        <span className="bb-wf-merkmale">
          {dientZumNachhaken(s) ? <span className="bb-wf-merkmal">Nachhaken</span> : null}
          {anmeldungen > 0 ? <span className="bb-wf-merkmal grau">{anmeldungenText(anmeldungen)}</span> : null}
          {einstiege.length > 0 ? (
            <span className="bb-wf-merkmal grau" title={`Übernahme aus ${einstiege.join(', ')}`}>
              Einstieg aus {einstiege.length === 1 ? einstiege[0] : `${einstiege.length} Status anderer Workflows`}
            </span>
          ) : null}
        </span>
      ) : null}
      {zweige.length > 0 ? (
        <span className="bb-wf-zweige">
          {zweige.map((z, n) => (
            <span key={n} className={`bb-wf-zweig ${z.art}`}>
              {z.text ? <b>{z.text}</b> : null} → {z.ziel}
            </span>
          ))}
        </span>
      ) : null}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Linien abseits des Standardverlaufs                                 */
/* ------------------------------------------------------------------ */

/** Pfad durch Eckpunkte mit abgerundeten Ecken. */
function eckenPfad(p: [number, number][], radius = 9): string {
  if (p.length < 2) return '';
  let d = `M ${p[0][0]} ${p[0][1]}`;
  for (let i = 1; i < p.length - 1; i++) {
    const [x0, y0] = p[i - 1];
    const [x1, y1] = p[i];
    const [x2, y2] = p[i + 1];
    const l1 = Math.hypot(x1 - x0, y1 - y0);
    const l2 = Math.hypot(x2 - x1, y2 - y1);
    const r = Math.min(radius, l1 / 2, l2 / 2);
    if (r < 0.5) {
      d += ` L ${x1} ${y1}`;
      continue;
    }
    const a: [number, number] = [x1 - ((x1 - x0) / l1) * r, y1 - ((y1 - y0) / l1) * r];
    const b: [number, number] = [x1 + ((x2 - x1) / l2) * r, y1 + ((y2 - y1) / l2) * r];
    d += ` L ${a[0]} ${a[1]} Q ${x1} ${y1} ${b[0]} ${b[1]}`;
  }
  const [xe, ye] = p[p.length - 1];
  return `${d} L ${xe} ${ye}`;
}

function Linien({
  geo,
  kanten,
  rang,
  haupt,
  auswahl,
  hover,
}: {
  geo: Geometrie;
  kanten: Kante[];
  /** Stelle im Ablauf: Index im Standardverlauf, bei Abweichungen ihr Anker + ½. */
  rang: Map<ID, number>;
  haupt: Set<ID>;
  auswahl: ID | null;
  hover: ID | null;
}) {
  const Y = 30; // Höhe des Anschlusspunkts unter der Kartenoberkante
  type Art = 'zurAbw' | 'zurHaupt' | 'hauptHaupt' | 'abwAbw';

  // Mehrere Linien, die dieselbe Kartenseite verlassen, leicht versetzt
  const ausgang = new Map<string, number>();
  const versetzt = (schluessel: string) => {
    const n = ausgang.get(schluessel) ?? 0;
    ausgang.set(schluessel, n + 1);
    return n * 22;
  };

  const gezeichnet = kanten
    .filter((k) => geo.karten[k.von] && geo.karten[k.nach] && rang.has(k.von) && rang.has(k.nach) && k.von !== k.nach)
    .map((k) => {
      const vonHaupt = haupt.has(k.von);
      const nachHaupt = haupt.has(k.nach);
      const art: Art = vonHaupt ? (nachHaupt ? 'hauptHaupt' : 'zurAbw') : nachHaupt ? 'zurHaupt' : 'abwAbw';
      const q = geo.karten[k.von];
      const z = geo.karten[k.nach];
      const linksRaus = art === 'zurHaupt';
      // Direkt darunter gestapelte Abweichung: senkrecht von Karte zu Karte
      const gestapelt = art === 'abwAbw' && z.t >= q.b && z.t - q.b < 40 && Math.abs(z.l - q.l) < 2;
      const sx = linksRaus ? q.l : q.r;
      const sy = Math.min(q.t + Y + versetzt(`${k.von}:${linksRaus ? 'l' : 'r'}`), q.b - 8);
      // Rücksprung: führt zu einem Status des Standardverlaufs, der nicht später kommt
      const rueck = nachHaupt && rang.get(k.nach)! <= rang.get(k.von)!;
      // Linien zum selben Ziel teilen sich Bahn und Anschluss (Bündel)
      const bereich: 'zwischen' | 'rechts' = art === 'abwAbw' ? 'rechts' : 'zwischen';
      const gruppe = `${k.nach}:${art === 'zurAbw' ? 'l' : 'r'}:${bereich}`;
      // Eingänge an der rechten Kartenseite etwas tiefer als die Ausgänge dort
      const ty = z.t + Y + (art === 'zurAbw' ? 0 : 16);
      return { k, art, q, z, sx, sy, ty, rueck, bereich, gruppe, gestapelt };
    });

  // Bahnen: je Bündel eine, überlappende Bündel nebeneinander
  const spannen = new Map<string, { von: number; bis: number; bereich: 'zwischen' | 'rechts' }>();
  for (const g of gezeichnet) {
    if (g.gestapelt) continue;
    const alt = spannen.get(g.gruppe);
    spannen.set(g.gruppe, {
      von: Math.min(g.sy, g.ty, alt?.von ?? Infinity),
      bis: Math.max(g.sy, g.ty, alt?.bis ?? -Infinity),
      bereich: g.bereich,
    });
  }
  const belegt: Record<'zwischen' | 'rechts', [number, number][][]> = { zwischen: [], rechts: [] };
  const bahn = new Map<string, number>();
  for (const [gruppe, { von, bis, bereich }] of spannen) {
    const liste = belegt[bereich];
    let n = 0;
    while (liste[n] && liste[n].some(([a, b]) => !(bis < a - 6 || von > b + 6))) n++;
    (liste[n] ??= []).push([von, bis]);
    bahn.set(gruppe, n);
  }
  const spalt = Math.max(40, geo.abwLinks - geo.hauptRechts);
  const bahnX = (gruppe: string, bereich: 'zwischen' | 'rechts') =>
    bereich === 'rechts'
      ? geo.abwRechts + 18 + bahn.get(gruppe)! * 10
      : Math.min(geo.hauptRechts + 22 + bahn.get(gruppe)! * 10, geo.hauptRechts + spalt - 18);

  const linien = gezeichnet.map((g) => {
    const aktiv = auswahl !== null && (g.k.von === auswahl || g.k.nach === auswahl);
    const hervor = hover !== null && (g.k.von === hover || g.k.nach === hover);
    if (g.gestapelt) {
      const cx = (g.q.l + g.q.r) / 2;
      return {
        d: `M ${cx} ${g.q.b} L ${cx} ${g.z.t}`,
        spitze: `M ${cx} ${g.z.t} l -4.5 -7 l 9 0 z`,
        label: { x: cx + 8, y: g.q.b + 16, links: false, unten: false },
        text: g.k.text,
        rueck: g.rueck,
        aktiv,
        hervor,
      };
    }
    const x = bahnX(g.gruppe, g.bereich);
    const tx = g.art === 'zurAbw' ? g.z.l : g.z.r;
    const punkte: [number, number][] =
      g.art === 'zurAbw' && Math.abs(g.sy - g.ty) < 1
        ? [
            [g.sx, g.sy],
            [tx, g.ty],
          ]
        : [
            [g.sx, g.sy],
            [x, g.sy],
            [x, g.ty],
            [tx, g.ty],
          ];
    const spitze = g.art === 'zurAbw' ? `M ${tx} ${g.ty} l -7 -4.5 l 0 9 z` : `M ${tx} ${g.ty} l 7 -4.5 l 0 9 z`;
    const links = g.art === 'zurHaupt';
    // Rechts der Abweichungen: führt die Linie nach oben, steht die Antwort unter ihr
    const unten = g.art === 'abwAbw' && g.ty < g.sy;
    return {
      d: eckenPfad(punkte),
      spitze,
      label: { x: links ? g.sx - 8 : g.sx + 8, y: g.sy, links, unten },
      text: g.k.text,
      rueck: g.rueck,
      aktiv,
      hervor,
    };
  });

  return (
    <>
      <svg className="bb-wf-linien" width={geo.breite} height={geo.hoehe} aria-hidden="true">
        {linien.map((l, n) => (
          <g
            key={n}
            className={`bb-wf-kante ${l.rueck ? 'rueck' : 'abw'} ${l.aktiv ? 'aktiv' : ''} ${l.hervor ? 'hervor' : ''}`}
          >
            <path className="bb-wf-kante-linie" d={l.d} />
            <path className="bb-wf-kante-spitze" d={l.spitze} />
          </g>
        ))}
      </svg>
      {/* Antworten der Entscheidungen an ihren Linien */}
      {linien.map((l, n) =>
        l.text ? (
          <span
            key={`t${n}`}
            className={`bb-wf-antwort ${l.rueck ? 'rueck' : 'abw'} ${l.aktiv ? 'aktiv' : ''}`}
            style={{
              left: l.label.x,
              top: l.label.y,
              transform: `translate(${l.label.links ? '-100%' : '0'}, ${l.label.unten ? '25%' : '-125%'})`,
            }}
          >
            {l.text}
          </span>
        ) : null,
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Statusdetails                                                       */
/* ------------------------------------------------------------------ */

function StatusDetails({
  s,
  status,
  workflowId,
  gliederung,
  bildFolge,
  belegt,
  nachhakTage,
  onAuswahl,
  onStatusAendern,
  onListeAendern,
  onEntfernen,
  onSchliessen,
  schmal,
}: {
  s: WorkflowStatus;
  status: WorkflowStatus[];
  workflowId: ID | null;
  gliederung: Gliederung;
  bildFolge: ID[];
  /** Anmeldungen in diesem Status (gespeicherter Stand). */
  belegt: number;
  nachhakTage: number;
  onAuswahl: (id: ID | 'uebersicht' | null) => void;
  onStatusAendern: (id: ID, f: (s: WorkflowStatus) => WorkflowStatus, feld?: string | null) => void;
  onListeAendern: (f: (s: WorkflowStatus[]) => WorkflowStatus[], feld?: string | null) => void;
  onEntfernen: (id: ID) => void;
  onSchliessen: () => void;
  schmal: boolean;
}) {
  const { data } = useStore();
  const andere = data.workflows.filter((w) => w.id !== workflowId);
  const i = status.indexOf(s);
  const pos = bildFolge.indexOf(s.id);
  const ton = STATUS_TON[s.art];
  const entscheidung = s.entscheidung;
  const ort = gliederung.haupt.includes(s.id)
    ? 'Standardverlauf'
    : gliederung.unerreichbar.includes(s.id)
      ? 'nicht erreichbar'
      : 'Abweichung';
  const einstiege = gliederung.einstiege.get(s.id) ?? [];
  const aendern = (patch: Partial<WorkflowStatus>, feld: string | null = null) =>
    onStatusAendern(s.id, (x) => ({ ...x, ...patch }), feld);
  const titel = (k: number) => `${nr(k)} · ${status[k].name || 'ohne Bezeichnung'}`;

  /** Auswahl eines Nachfolgers: dieser Workflow, Übernahme in andere Workflows, Löschen. */
  const zielOptionen = (aktuell: StatusZiel | null) => {
    const frei = (z: StatusZiel) => z === aktuell || !s.nachfolger.includes(z);
    return (
      <>
        <optgroup label="Dieser Workflow">
          {status.map((z, k) =>
            frei(z.id) ? (
              <option key={z.id} value={z.id}>
                {titel(k)}
                {z.id === s.id ? ' (erneut)' : ''}
              </option>
            ) : null,
          )}
        </optgroup>
        {andere.map((w) => (
          <optgroup key={w.id} label={`Übernahme in ${w.name}`}>
            {w.status.map((z) =>
              frei(z.id) ? (
                <option key={z.id} value={z.id}>
                  {w.kurz || w.name} · {z.name}
                </option>
              ) : null,
            )}
          </optgroup>
        ))}
        {frei(LOESCHEN) ? <option value={LOESCHEN}>Eintrag löschen (endgültig)</option> : null}
      </>
    );
  };

  return (
    <div className="bb-wf-details">
      <div className="bb-wf-panel-kopf">
        <span>Statusdetails</span>
        <span className="bb-wf-panel-nav">
          <button
            type="button"
            className="btn-icon"
            disabled={pos <= 0}
            onClick={() => onAuswahl(bildFolge[pos - 1])}
            aria-label="Vorheriger Status"
            title="Vorheriger Status"
          >
            <Icon name="zurueck" size={14} />
          </button>
          {/* Zählt die Karten in der Reihenfolge der Zeichenfläche – nicht die Statusnummer */}
          <span className="tertiary" title="Position in der Reihenfolge der Zeichenfläche">
            Karte {pos + 1} von {bildFolge.length}
          </span>
          <button
            type="button"
            className="btn-icon"
            disabled={pos < 0 || pos >= bildFolge.length - 1}
            onClick={() => onAuswahl(bildFolge[pos + 1])}
            aria-label="Nächster Status"
            title="Nächster Status"
          >
            <Icon name="chevron" size={14} />
          </button>
          <button
            type="button"
            className="btn-icon"
            onClick={onSchliessen}
            aria-label="Details schließen"
            title="Schließen"
          >
            ✕
          </button>
        </span>
      </div>

      <div className="bb-wf-panel-titel">
        <span className={`bb-wf-art-zeichen ${entscheidung ? 'ton-purple' : ton ? `ton-${ton}` : ''}`}>
          {entscheidung ? <Icon name="raute" size={18} /> : <span className="bb-wf-punkt-art" />}
        </span>
        <div>
          <strong>{entscheidung ? 'Entscheidung bearbeiten' : 'Status bearbeiten'}</strong>
          <div className="small tertiary">
            Status {nr(i)} im Workflow · {ort}
            {i === 0 ? ' · Startstatus' : ''}
          </div>
        </div>
      </div>

      <div className="bb-wf-felder">
        <label className="bb-wf-feld">
          <span>Bezeichnung</span>
          <input
            className={`input ${s.name.trim() ? '' : 'bb-wf-pflicht'}`}
            value={s.name}
            autoFocus={!s.name && !schmal}
            placeholder="z. B. Angemeldet"
            onChange={(e) => aendern({ name: e.target.value }, `${s.id}:name`)}
          />
        </label>
        <div className="bb-wf-feld">
          <span>Typ</span>
          <div className="segmented bb-wf-typwahl" role="radiogroup" aria-label="Typ">
            {([false, true] as const).map((alsEntscheidung) => (
              <button
                key={String(alsEntscheidung)}
                type="button"
                role="radio"
                aria-checked={!!entscheidung === alsEntscheidung}
                className={!!entscheidung === alsEntscheidung ? 'active' : ''}
                onClick={() => onListeAendern((alle) => typSetzen(alle, s.id, alsEntscheidung))}
              >
                <Icon name={alsEntscheidung ? 'raute' : 'aufgabe'} size={13} />{' '}
                {alsEntscheidung ? 'Entscheidung' : 'Status'}
              </button>
            ))}
          </div>
        </div>
        {entscheidung ? (
          <label className="bb-wf-feld">
            <span>Frage</span>
            <input
              className="input"
              value={entscheidung.frage}
              placeholder="z. B. Stimmt die BBK zu?"
              onChange={(e) =>
                onStatusAendern(
                  s.id,
                  (x) => (x.entscheidung ? { ...x, entscheidung: { ...x.entscheidung, frage: e.target.value } } : x),
                  `${s.id}:frage`,
                )
              }
            />
          </label>
        ) : null}
        <div className="bb-wf-feld-reihe">
          <label className="bb-wf-feld">
            <span>Art</span>
            <select className="select" value={s.art} onChange={(e) => aendern({ art: e.target.value as StatusArt })}>
              {(Object.keys(STATUS_ART_LABEL) as StatusArt[]).map((k) => (
                <option key={k} value={k}>
                  {STATUS_ART_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
          <label className="bb-wf-feld">
            <span>Zuständig</span>
            <select
              className="select"
              value={s.zustaendig ?? ''}
              onChange={(e) => aendern({ zustaendig: (e.target.value || null) as Zustaendigkeit | null })}
            >
              <option value="">– niemand –</option>
              {(Object.keys(ZUSTAENDIGKEIT_LABEL) as Zustaendigkeit[]).map((k) => (
                <option key={k} value={k}>
                  {ZUSTAENDIGKEIT_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
        </div>
        {s.art === 'aenderung' ? (
          <p className="bb-wf-hilfe">In diesem Status sind ÄAbst-Nr und AnnexVII aktiv.</p>
        ) : null}
        {s.art === 'genehmigt' ? (
          <p className="bb-wf-hilfe">
            Mit „Genehmigt“ ist der Standardverlauf am Ziel; weitere Nachfolger sind Abweichungen.
          </p>
        ) : null}
        {s.art === 'leiche' ? (
          <p className="bb-wf-hilfe">
            Rot gekennzeichnet; deckt keinen Anmeldebedarf ab. Gelöscht wird mit dem Nachfolger „Eintrag löschen“.
          </p>
        ) : null}
        <p className="bb-wf-hilfe">
          Die Liste der Anmeldungen nennt zur Zuständigkeit den Namen aus Anmeldung bzw. Projekt.
        </p>

        <FristFeld
          frist={s.frist}
          nachhakTage={nachhakTage}
          // Ein Nachhak-Termin dient immer zum Nachhaken – das Merkmal geht beim Wechsel der Art mit
          onChange={(frist, feld) =>
            aendern(frist.typ === 'nachhaken' && !s.nachhaken ? { frist, nachhaken: true } : { frist }, feld)
          }
          statusId={s.id}
        />

        <label className="checkbox">
          <input
            type="checkbox"
            checked={dientZumNachhaken(s)}
            disabled={s.frist.typ === 'nachhaken'}
            onChange={(e) => aendern({ nachhaken: e.target.checked })}
          />
          Termin dient zum Nachhaken{s.frist.typ === 'nachhaken' ? ' (bei einem Nachhak-Termin immer)' : ''}
        </label>
        <label className="bb-wf-feld">
          <span>Bemerkung</span>
          <input
            className="input"
            value={s.bemerkung}
            onChange={(e) => aendern({ bemerkung: e.target.value }, `${s.id}:bemerkung`)}
          />
        </label>
      </div>

      <section className="bb-wf-abschnitt">
        <h4>
          <Icon name="kette" size={14} /> Wie geht es weiter?
        </h4>
        <p className="bb-wf-hilfe">
          {entscheidung
            ? 'Jede Antwort führt zu einem Nachfolger; beim Statuswechsel stehen Frage und Antworten zur Wahl. Die erste Antwort bildet den Standardverlauf.'
            : 'Beim Statuswechsel stehen nur diese Nachfolger zur Wahl. Der erste bildet den Standardverlauf.'}{' '}
          Ein Nachfolger in einem anderen Workflow übernimmt die Anmeldung in die nächste Phase.
        </p>
        {s.nachfolger.length === 0 ? (
          <p className="bb-wf-hilfe">Ohne Nachfolger endet der Workflow in diesem Status.</p>
        ) : (
          <div className="bb-wf-nachfolger">
            {s.nachfolger.map((z, n) => (
              <div key={z} className={`bb-wf-nachfolger-karte ${n === 0 ? 'standard' : ''}`}>
                {entscheidung ? (
                  <div className="bb-wf-nachfolger-zeile">
                    <span className="bb-wf-punkt" />
                    <input
                      className={`input ${entscheidung.antworten[z]?.trim() ? '' : 'bb-wf-pflicht'}`}
                      value={entscheidung.antworten[z] ?? ''}
                      placeholder={antwortVorgabe(n)}
                      aria-label={`Antwort ${n + 1}`}
                      onChange={(e) =>
                        onListeAendern((alle) => antwortSetzen(alle, s.id, z, e.target.value), `${s.id}:${z}:antwort`)
                      }
                    />
                    <button
                      type="button"
                      className="btn-icon"
                      aria-label="Antwort entfernen"
                      title="Antwort entfernen"
                      onClick={() => onListeAendern((alle) => nachfolgerEntfernen(alle, s.id, z))}
                    >
                      ✕
                    </button>
                  </div>
                ) : null}
                <div className={entscheidung ? 'bb-wf-weiter' : 'bb-wf-nachfolger-zeile'}>
                  {entscheidung ? <span>→ Weiter mit</span> : <span className="bb-wf-punkt" />}
                  <select
                    className="select"
                    value={z}
                    aria-label={`Nachfolger ${n + 1}`}
                    onChange={(e) => onListeAendern((alle) => nachfolgerErsetzen(alle, s.id, z, e.target.value))}
                  >
                    {zielOptionen(z)}
                    {z !== LOESCHEN &&
                    !status.some((x) => x.id === z) &&
                    !andere.some((w) => w.status.some((x) => x.id === z)) ? (
                      <option value={z}>Unbekannter Status – entfällt beim Speichern</option>
                    ) : null}
                  </select>
                  {entscheidung ? null : (
                    <button
                      type="button"
                      className="btn-icon"
                      aria-label="Nachfolger entfernen"
                      title="Nachfolger entfernen"
                      onClick={() => onListeAendern((alle) => nachfolgerEntfernen(alle, s.id, z))}
                    >
                      ✕
                    </button>
                  )}
                </div>
                {n === 0 ? (
                  <span className="bb-wf-standard-marke">Standardverlauf</span>
                ) : (
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost bb-wf-als-standard"
                    onClick={() => onListeAendern((alle) => alsStandard(alle, s.id, z))}
                  >
                    Als Standardverlauf
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        <select
          className="select"
          value=""
          aria-label={entscheidung ? 'Antwort hinzufügen' : 'Nachfolger hinzufügen'}
          onChange={(e) => {
            const ziel = e.target.value;
            if (ziel) onListeAendern((alle) => nachfolgerHinzufuegen(alle, s.id, ziel));
          }}
        >
          <option value="">{entscheidung ? 'Antwort hinzufügen – führt zu …' : 'Nachfolger hinzufügen …'}</option>
          {zielOptionen(null)}
        </select>
      </section>

      {einstiege.length > 0 ? (
        <section className="bb-wf-abschnitt">
          <h4>
            <Icon name="importieren" size={14} /> Einstieg aus anderen Workflows
          </h4>
          <p className="bb-wf-hilfe">In diesen Status übernehmen: {einstiege.join(', ')}.</p>
        </section>
      ) : null}

      {belegt > 0 ? (
        <section className="bb-wf-abschnitt">
          <h4>
            <Icon name="info" size={14} /> Anmeldungen
          </h4>
          <p className="bb-wf-hilfe">
            {belegt === 1 ? 'Eine Anmeldung steht' : `${belegt} Anmeldungen stehen`} in diesem Status – er lässt sich
            deshalb nicht entfernen.
          </p>
        </section>
      ) : null}

      <section className="bb-wf-abschnitt bb-wf-aktionen">
        <div className="bb-wf-position" title="Der erste Status der Reihenfolge ist der Startstatus.">
          <span className="small tertiary">Reihenfolge</span>
          <button
            type="button"
            className="btn-icon"
            disabled={i <= 0}
            onClick={() => onListeAendern((alle) => verschieben(alle, s.id, -1))}
            aria-label="Früher in der Reihenfolge"
            title="Früher in der Reihenfolge"
          >
            <Icon name="hoch" size={14} />
          </button>
          <button
            type="button"
            className="btn-icon"
            disabled={i < 0 || i >= status.length - 1}
            onClick={() => onListeAendern((alle) => verschieben(alle, s.id, 1))}
            aria-label="Später in der Reihenfolge"
            title="Später in der Reihenfolge"
          >
            <Icon name="runter" size={14} />
          </button>
        </div>
        <div className="row wrap" style={{ gap: 6 }}>
          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={() => {
              // Kennung vor der Änderung erzeugen (StrictMode)
              const id = newId('st');
              onListeAendern((alle) => duplizieren(alle, s.id, id));
              onAuswahl(id);
            }}
          >
            <Icon name="kopieren" size={13} /> Duplizieren
          </button>
          <button
            type="button"
            className="btn btn-sm btn-danger"
            onClick={() => onEntfernen(s.id)}
            disabled={belegt > 0}
            title={belegt > 0 ? 'In diesem Status stehen noch Anmeldungen.' : undefined}
          >
            <Icon name="loeschen" size={13} /> Entfernen
          </button>
        </div>
      </section>
    </div>
  );
}

/**
 * Zahlenfeld, das während der Eingabe auch leer oder außerhalb des Bereichs
 * stehen darf – übernommen werden nur gültige Werte, beim Verlassen zeigt es
 * wieder den übernommenen Wert.
 */
function ZiffernFeld({
  wert,
  onChange,
  min,
  max,
  label,
  breite = 64,
}: {
  wert: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  label: string;
  breite?: number;
}) {
  const [text, setText] = useState(String(wert));
  const [vorher, setVorher] = useState(wert);
  // Ändert sich der Wert von außen, folgt das Feld
  if (wert !== vorher) {
    setVorher(wert);
    setText(String(wert));
  }
  return (
    <input
      className="input"
      style={{ width: breite }}
      inputMode="numeric"
      aria-label={label}
      value={text}
      onChange={(e) => {
        const roh = e.target.value.replace(/\D/g, '');
        setText(roh);
        const n = Number(roh);
        if (roh !== '' && n >= min && n <= max) onChange(n);
      }}
      onBlur={() => setText(String(wert))}
    />
  );
}

/** Terminfrist eines Status: Art der Frist und ihre Angaben. */
function FristFeld({
  frist,
  nachhakTage,
  onChange,
  statusId,
}: {
  frist: FristRegel;
  nachhakTage: number;
  /** `feld` fasst Tippen in einem Zahlenfeld zu einem Rückgängig-Schritt zusammen. */
  onChange: (f: FristRegel, feld?: string | null) => void;
  statusId: ID;
}) {
  const typWechseln = (typ: FristTyp) => {
    if (typ === frist.typ) return;
    if (typ === 'ril') onChange({ typ: 'ril', bezug: 'X', versatzTage: 0 });
    else if (typ === 'stichtag') onChange({ typ: 'stichtag', tag: 1, monat: 8 });
    else if (typ === 'nachhaken') onChange({ typ: 'nachhaken', tage: nachhakTage });
    else onChange({ typ: 'keine' });
  };
  let zusatz: ReactNode = null;
  if (frist.typ === 'ril') {
    zusatz = (
      <>
        <select
          className="select"
          value={frist.bezug}
          aria-label="Frist laut Richtlinie"
          onChange={(e) => onChange({ ...frist, bezug: e.target.value as RilBezug })}
        >
          {(Object.keys(PHASE_LABEL) as Phase[]).map((phase) => (
            <optgroup key={phase} label={PHASE_LABEL[phase]}>
              {(Object.keys(RIL_BEZUG_LABEL) as RilBezug[])
                .filter((k) => RIL_BEZUG_PHASE[k] === phase)
                .map((k) => (
                  <option key={k} value={k}>
                    {RIL_BEZUG_LABEL[k]}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
        <span className="bb-wf-frist-zeile">
          abzüglich
          <ZiffernFeld
            label="Tage vor der Frist"
            wert={Math.abs(frist.versatzTage)}
            min={0}
            max={365}
            onChange={(n) => onChange({ ...frist, versatzTage: -n }, `${statusId}:versatz`)}
          />
          Tage
        </span>
      </>
    );
  } else if (frist.typ === 'stichtag') {
    zusatz = (
      <span className="bb-wf-frist-zeile">
        nächster
        <ZiffernFeld
          label="Tag"
          wert={frist.tag}
          min={1}
          max={31}
          breite={56}
          onChange={(n) => onChange({ ...frist, tag: n }, `${statusId}:tag`)}
        />
        .
        <ZiffernFeld
          label="Monat"
          wert={frist.monat}
          min={1}
          max={12}
          breite={56}
          onChange={(n) => onChange({ ...frist, monat: n }, `${statusId}:monat`)}
        />
        . ab dem Statuswechsel
      </span>
    );
  } else if (frist.typ === 'nachhaken') {
    zusatz = (
      <span className="bb-wf-frist-zeile">
        <ZiffernFeld
          label="Tage nach dem Statuswechsel"
          wert={frist.tage}
          min={0}
          max={365}
          onChange={(n) => onChange({ ...frist, tage: n }, `${statusId}:tage`)}
        />
        Tage nach dem Statuswechsel
      </span>
    );
  }
  return (
    <div className="bb-wf-feld">
      <span>Terminfrist</span>
      <select
        className="select"
        value={frist.typ}
        aria-label="Art der Terminfrist"
        onChange={(e) => typWechseln(e.target.value as FristTyp)}
      >
        {(Object.keys(FRIST_TYP_LABEL) as FristTyp[]).map((k) => (
          <option key={k} value={k}>
            {FRIST_TYP_LABEL[k]}
          </option>
        ))}
      </select>
      {zusatz}
      {frist.typ !== 'keine' ? <p className="bb-wf-hilfe">Kurzform: {fristRegelText(frist)}</p> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Übersicht ohne gewählten Status                                     */
/* ------------------------------------------------------------------ */

function Uebersicht({
  stand,
  onAendern,
  gliederung,
  hinweise,
  imWorkflow,
  uebernahmen,
  onAuswahl,
  onSchliessen,
}: {
  stand: Stand;
  onAendern: (f: (s: Stand) => Stand, feld?: string | null) => void;
  gliederung: Gliederung;
  hinweise: Hinweis[];
  /** Anmeldungen im Workflow – solange es welche gibt, bleibt der Sperrzeitraum fest. */
  imWorkflow: number;
  uebernahmen: number;
  onAuswahl: (id: ID | 'uebersicht' | null) => void;
  onSchliessen?: () => void;
}) {
  const artUmschalten = (art: AnmeldungsArt, an: boolean) =>
    onAendern((s) => ({ ...s, arten: ALLE_ARTEN.filter((a) => (a === art ? an : s.arten.includes(a))) }));
  return (
    <div className="bb-wf-details">
      <div className="bb-wf-panel-kopf">
        <span>Übersicht</span>
        {onSchliessen ? (
          <button type="button" className="btn-icon" onClick={onSchliessen} aria-label="Übersicht schließen">
            ✕
          </button>
        ) : null}
      </div>

      <div className="bb-wf-felder">
        <label className="bb-wf-feld">
          <span>Kurzbezeichnung</span>
          <input
            className="input"
            value={stand.kurz}
            placeholder="z. B. KKM"
            onChange={(e) => onAendern((s) => ({ ...s, kurz: e.target.value }), 'kurz')}
          />
        </label>
        <p className="bb-wf-hilfe">Für Listen und Kennzeichen, z. B. „MKM · Angemeldet“.</p>
        <label className="bb-wf-feld">
          <span>Beschreibung</span>
          <textarea
            className="textarea"
            rows={3}
            value={stand.beschreibung}
            onChange={(e) => onAendern((s) => ({ ...s, beschreibung: e.target.value }), 'beschreibung')}
          />
        </label>
        <label className="bb-wf-feld">
          <span>Sperrzeitraum</span>
          <select
            className="select"
            value={stand.bauzeitraum}
            disabled={imWorkflow > 0}
            onChange={(e) => onAendern((s) => ({ ...s, bauzeitraum: e.target.value as BauzeitraumModus }))}
          >
            {(Object.keys(BAUZEITRAUM_LABEL) as BauzeitraumModus[]).map((k) => (
              <option key={k} value={k}>
                {BAUZEITRAUM_LABEL[k]}
              </option>
            ))}
          </select>
        </label>
        <p className="bb-wf-hilfe">
          {imWorkflow > 0
            ? 'Fest, solange Anmeldungen in diesem Workflow stehen – ihr Sperrzeitraum ist so erfasst.'
            : 'Ganzes Fahrplanjahr: statt Anmelde-ID Begriff bzw. tVE-Nr.'}
        </p>
        <div className="bb-wf-feld">
          <span>Maßnahmenarten</span>
          <div className="bb-wf-arten">
            {ALLE_ARTEN.map((a) => (
              <label key={a} className="checkbox">
                <input
                  type="checkbox"
                  checked={stand.arten.includes(a)}
                  onChange={(e) => artUmschalten(a, e.target.checked)}
                />
                {a}
              </label>
            ))}
          </div>
          <p className="bb-wf-hilfe">Die erste gewählte ist die Vorgabe.</p>
        </div>
      </div>

      <div className="bb-wf-kacheln">
        <div>
          <b>{stand.status.length}</b>
          <span>Status</span>
        </div>
        <div>
          <b>{stand.status.filter((x) => x.entscheidung).length}</b>
          <span>Entscheidungen</span>
        </div>
        <div>
          <b>{gliederung.haupt.length}</b>
          <span>im Standardverlauf</span>
        </div>
        <div>
          <b>{gliederung.abweichungen.length}</b>
          <span>Abweichungen</span>
        </div>
        <div>
          <b>{uebernahmen}</b>
          <span>Übernahmen in andere Workflows</span>
        </div>
        <div>
          <b>{imWorkflow}</b>
          <span>{imWorkflow === 1 ? 'Anmeldung im Workflow' : 'Anmeldungen im Workflow'}</span>
        </div>
      </div>

      {hinweise.length > 0 ? (
        <section className="bb-wf-abschnitt">
          <h4>
            <Icon name="info" size={14} /> Hinweise
          </h4>
          <div className="bb-wf-hinweise">
            {hinweise.map((h, n) => (
              <button
                key={n}
                type="button"
                className={`bb-wf-hinweis ${h.sperrt ? 'sperrt' : ''}`}
                disabled={!h.statusId}
                onClick={() => h.statusId && onAuswahl(h.statusId)}
              >
                {h.text}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className="bb-wf-abschnitt">
        <h4>So lesen Sie das Bild</h4>
        <ul className="bb-wf-legende">
          <li>
            <span className="bb-wf-legende-linie" />
            <span>
              <b>Standardverlauf</b> – vom Startstatus über den jeweils ersten Nachfolger (bei Entscheidungen die erste
              Antwort) bis „Genehmigt“, einer Übernahme in einen anderen Workflow oder „Eintrag löschen“.
            </span>
          </li>
          <li>
            <span className="bb-wf-legende-linie abw" />
            <span>
              <b>Abweichung</b> – Weg über einen anderen Nachfolger bzw. eine andere Antwort, etwa „Nein“ → „Abgelehnt“.
            </span>
          </li>
          <li>
            <span className="bb-wf-legende-linie rueck" />
            <span>
              <b>Rücksprung</b> – führt zu einem früheren Status des Standardverlaufs zurück.
            </span>
          </li>
          <li>
            <span className="bb-wf-legende-linie uebernahme" />
            <span>
              <b>Übernahme</b> – ein Nachfolger in einem anderen Workflow; er steht als Text auf der Karte und übernimmt
              die Anmeldung in die nächste Phase.
            </span>
          </li>
        </ul>
      </section>
    </div>
  );
}
