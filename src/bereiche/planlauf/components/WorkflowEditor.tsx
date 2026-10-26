/**
 * Grafischer Workflow-Editor.
 *
 * Links die Arbeitsfläche mit dem Ablaufbild: der Standardverlauf als Spalte
 * von Karten (Weg mit der jeweils ersten Antwort), daneben die Abweichungen –
 * Schritte, die nur über eine andere Antwort erreicht werden. Übergänge
 * abseits des Standardverlaufs zeichnet eine SVG-Ebene aus den gemessenen
 * Kartenpositionen. Rechts stehen die Schrittdetails des gewählten Schritts,
 * ohne Auswahl die Übersicht über den Workflow. Auf schmalen Bildschirmen
 * stehen die Abweichungen unter dem Standardverlauf und die Details öffnen
 * sich als Blatt von unten.
 *
 * Der Editor arbeitet auf einer eigenen Kopie der Schritte (mit Rückgängig
 * und Wiederholen) und gibt sie erst mit „Speichern“ bzw. „Übernehmen“ zurück.
 * Er wird über ein Portal an `document.body` gehängt, weil er auch aus einem
 * Dialog heraus geöffnet wird, dessen Hintergrundfilter fest positionierte
 * Elemente sonst einschließt.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  EIGENE_ROLLE,
  NACHWEIS_LABEL,
  STANDARD_ANTWORTEN,
  STEP_TYPE_LABEL,
  type ID,
  type Nachweis,
  type ProcessTemplateStep,
  type StepType,
} from '../domain/types';
import {
  alsStandard,
  artSetzen,
  bereinigen,
  dauerImStandardverlauf,
  duplizieren,
  einfuegen,
  einfuegenAmAnfang,
  entfernen,
  funktionSetzen,
  gliedern,
  neuerSchritt,
  pruefen,
  standardKante,
  imVerlaufVerschieben,
  zielSetzen,
  type Gliederung,
  type Kante,
  type Ziel,
} from '../domain/workflowGraph';
import { newId, useStore } from '../store/store';
import { useToast } from '../../../shared/toast';
import { ConfirmDialog } from '../../../shared/ui';
import { Icon } from '../../../shared/icons';
import './workflowEditor.css';

export interface WorkflowErgebnis {
  steps: ProcessTemplateStep[];
  name: string;
  beschreibung: string;
  /** Im Editor wurde etwas geändert. */
  geaendert: boolean;
}

interface Stand {
  steps: ProcessTemplateStep[];
  name: string;
  beschreibung: string;
}

interface Verlauf {
  vorher: Stand[];
  jetzt: Stand;
  nachher: Stand[];
  /** Zuletzt bearbeitetes Feld – Tippen im selben Feld ergibt nur einen Rückgängig-Schritt. */
  feld: string | null;
}

const nr = (i: number) => String(i + 1).padStart(2, '0');
const tage = (n: number) => `${n} ${n === 1 ? 'Tag' : 'Tage'}`;
const schritteText = (n: number) => `${n} ${n === 1 ? 'Schritt' : 'Schritte'}`;

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

export function WorkflowEditor({
  titel,
  untertitel,
  hinweis,
  steps: anfangsSchritte,
  name: anfangsName,
  beschreibung: anfangsBeschreibung = '',
  rollen,
  arbeitstage = false,
  speichernLabel,
  onSpeichern,
  onClose,
}: {
  titel: string;
  untertitel?: ReactNode;
  /** Hinweis über der Arbeitsfläche, etwa bei Standard-Workflows. */
  hinweis?: ReactNode;
  steps: ProcessTemplateStep[];
  /** Mit Namen bearbeitet der Editor einen Workflow samt Name und Beschreibung. */
  name?: string;
  beschreibung?: string;
  /** Vorschläge für die verantwortliche Funktion. */
  rollen: string[];
  /** Fristen werden in Arbeitstagen gerechnet (nur Anzeige). */
  arbeitstage?: boolean;
  speichernLabel: string;
  onSpeichern: (ergebnis: WorkflowErgebnis) => void;
  onClose: () => void;
}) {
  const { data } = useStore();
  const toast = useToast();
  const schmal = useSchmal();
  // Bis zu dieser Breite liegen die Details als Schublade über der Fläche
  const mittel = useSchmal(1279) && !schmal;
  const mitStammdaten = anfangsName !== undefined;

  const [verlauf, setVerlauf] = useState<Verlauf>(() => ({
    vorher: [],
    jetzt: { steps: anfangsSchritte, name: anfangsName ?? '', beschreibung: anfangsBeschreibung },
    nachher: [],
    feld: null,
  }));
  const { steps, name, beschreibung } = verlauf.jetzt;
  const geaendert = verlauf.vorher.length > 0;

  /** Auswahl: ein Schritt, die Übersicht oder (nur schmal) nichts. */
  const [auswahl, setAuswahl] = useState<ID | 'uebersicht' | null>(() =>
    anfangsSchritte.length === 1 && !anfangsSchritte[0].name ? anfangsSchritte[0].id : null,
  );
  const [menuOffen, setMenuOffen] = useState(false);
  const [verwerfenFrage, setVerwerfenFrage] = useState(false);
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
  const aendernSchritte = useCallback(
    (f: (s: ProcessTemplateStep[]) => ProcessTemplateStep[], feld: string | null = null) =>
      aendern((s) => ({ ...s, steps: f(s.steps) }), feld),
    [aendern],
  );
  const schrittAendern = (id: ID, f: (s: ProcessTemplateStep) => ProcessTemplateStep, feld: string | null = null) =>
    aendernSchritte((alle) => alle.map((s) => (s.id === id ? f(s) : s)), feld);

  const rueckgaengig = useCallback(
    () =>
      setVerlauf((v) =>
        v.vorher.length === 0
          ? v
          : { vorher: v.vorher.slice(0, -1), jetzt: v.vorher[v.vorher.length - 1], nachher: [v.jetzt, ...v.nachher], feld: null },
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

  const gliederung = useMemo(() => gliedern(steps), [steps]);
  const hinweise = useMemo(() => pruefen(steps), [steps]);
  const fehlend = useMemo(() => new Set(hinweise.filter((h) => h.sperrt && h.stepId).map((h) => h.stepId!)), [hinweise]);
  const dauer = dauerImStandardverlauf(steps);
  const entscheidungen = steps.filter((s) => s.typ === 'entscheidung').length;

  // Gewählter Schritt verschwindet (Rückgängig, Entfernen) → Auswahl aufheben
  const gewaehlt = typeof auswahl === 'string' && auswahl !== 'uebersicht' ? steps.find((s) => s.id === auswahl) : undefined;
  useEffect(() => {
    if (auswahl && auswahl !== 'uebersicht' && !steps.some((s) => s.id === auswahl)) setAuswahl(null);
  }, [auswahl, steps]);

  /** Reihenfolge der Karten im Bild: Standardverlauf, Abweichungen, nicht erreichbar. */
  const bildFolge = useMemo(
    () => [...gliederung.haupt, ...gliederung.abweichungen.map((a) => a.id), ...gliederung.unerreichbar],
    [gliederung],
  );

  /* ---------------------------------------------------------------- */
  /* Bearbeitungen                                                     */
  /* ---------------------------------------------------------------- */

  const einfuegenIn = (vonId: ID | null, antwortId: ID | null, typ: StepType = 'aufgabe') => {
    const neu = neuerSchritt(typ, newId);
    aendernSchritte((alle) => (vonId === null ? einfuegenAmAnfang(alle, neu) : einfuegen(alle, vonId, antwortId, neu, true)));
    setAuswahl(neu.id);
    setMenuOffen(false);
  };

  /** „Schritt hinzufügen“: hinter dem gewählten Schritt, sonst am Ende des Standardverlaufs. */
  const hinzufuegen = (typ: StepType) => {
    if (steps.length === 0) {
      const neu = neuerSchritt(typ, newId);
      aendernSchritte(() => [neu]);
      setAuswahl(neu.id);
      setMenuOffen(false);
      return;
    }
    const vonId = gewaehlt?.id ?? gliederung.haupt[gliederung.haupt.length - 1] ?? steps[steps.length - 1].id;
    const i = steps.findIndex((s) => s.id === vonId);
    einfuegenIn(vonId, standardKante(steps, i).antwortId, typ);
  };

  const entfernenMitMeldung = (id: ID) => {
    aendernSchritte((alle) => entfernen(alle, id));
    setAuswahl(null);
    toast('Schritt entfernt – „Rückgängig“ holt ihn zurück.');
  };

  const speichern = () => {
    if (mitStammdaten && !name.trim()) {
      toast('Bitte einen Namen angeben.');
      nameRef.current?.focus();
      return;
    }
    const sperrend = hinweise.find((h) => h.sperrt);
    if (sperrend) {
      toast(sperrend.text);
      if (sperrend.stepId) setAuswahl(sperrend.stepId);
      return;
    }
    onSpeichern({ steps: bereinigen(steps), name: name.trim(), beschreibung, geaendert });
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
        // Der Editor liegt über anderen Dialogen – Escape gilt nur ihm
        e.stopPropagation();
        if (verwerfenFrage) setVerwerfenFrage(false);
        else if (menuOffen) setMenuOffen(false);
        else if (schmal && auswahl) setAuswahl(null);
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
  }, [auswahl, menuOffen, rueckgaengig, schliessen, schmal, verwerfenFrage, wiederholen]);

  /* ---------------------------------------------------------------- */
  /* Darstellung                                                       */
  /* ---------------------------------------------------------------- */

  const kuerzel = useMemo(() => {
    const m = new Map<string, string>([[EIGENE_ROLLE.toLowerCase(), 'PLM']]);
    for (const r of [...data.standardRollen, ...data.roles]) if (r.kuerzel) m.set(r.name.toLowerCase(), r.kuerzel);
    return (rolle: string) => m.get(rolle.trim().toLowerCase()) ?? rolle.trim().slice(0, 3).toUpperCase();
  }, [data.standardRollen, data.roles]);

  const rollenListe = useMemo(
    () => [...new Set([EIGENE_ROLLE, ...rollen].map((r) => r.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'de')),
    [rollen],
  );

  const detailsSichtbar = (!schmal && !mittel) || auswahl !== null;
  const panel =
    gewaehlt ? (
      <SchrittDetails
        key={gewaehlt.id}
        step={gewaehlt}
        steps={steps}
        gliederung={gliederung}
        bildFolge={bildFolge}
        rollenListe={rollenListe}
        onAuswahl={setAuswahl}
        onSchrittAendern={schrittAendern}
        onSchritteAendern={aendernSchritte}
        onEntfernen={entfernenMitMeldung}
        onSchliessen={() => setAuswahl(null)}
        schmal={schmal || mittel}
      />
    ) : (
      <Uebersicht
        mitStammdaten={mitStammdaten}
        beschreibung={beschreibung}
        onBeschreibung={(v) => aendern((s) => ({ ...s, beschreibung: v }), 'beschreibung')}
        steps={steps}
        gliederung={gliederung}
        hinweise={hinweise}
        dauer={dauer}
        arbeitstage={arbeitstage}
        onAuswahl={setAuswahl}
        onSchliessen={schmal || mittel ? () => setAuswahl(null) : undefined}
      />
    );

  return createPortal(
    <div className="wf-overlay" onMouseDown={(e) => e.target === e.currentTarget && schliessen()}>
      <div className="wf-dialog" role="dialog" aria-modal="true" aria-label={titel} ref={dialogRef} tabIndex={-1}>
        <header className="wf-kopf">
          <div className="wf-kopf-titel">
            <div className="wf-kopf-oben">{titel}</div>
            {mitStammdaten ? (
              <input
                ref={nameRef}
                className={`wf-name ${name.trim() ? '' : 'wf-pflicht'}`}
                value={name}
                placeholder="Name des Workflows"
                aria-label="Name des Workflows"
                onChange={(e) => aendern((s) => ({ ...s, name: e.target.value }), 'name')}
              />
            ) : null}
            {untertitel ? <div className="wf-kopf-sub">{untertitel}</div> : null}
          </div>
          <div className="wf-werkzeuge">
            <span className="wf-kennzahl">
              {schritteText(steps.length)} · {tage(dauer)} im Standardverlauf
            </span>
            <div className="wf-knopfgruppe">
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
            <div className="wf-menu-anker">
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => setMenuOffen((o) => !o)}
                aria-expanded={menuOffen}
              >
                <Icon name="plus" size={13} /> Schritt hinzufügen
              </button>
              {menuOffen ? (
                <>
                  <div className="wf-menu-schatten" onMouseDown={() => setMenuOffen(false)} />
                  <div className="wf-menu" role="menu">
                    <div className="wf-menu-hinweis">
                      {gewaehlt ? `Hinter „${gewaehlt.name || 'Schritt ' + nr(steps.indexOf(gewaehlt))}“` : 'Am Ende des Standardverlaufs'}
                    </div>
                    <button type="button" role="menuitem" onClick={() => hinzufuegen('aufgabe')}>
                      <span className="wf-typ-zeichen aufgabe">
                        <Icon name="aufgabe" size={15} />
                      </span>
                      <span>
                        <b>Aufgabe</b>
                        <small>Ein Arbeitsschritt mit Frist und Zuständigkeit</small>
                      </span>
                    </button>
                    <button type="button" role="menuitem" onClick={() => hinzufuegen('entscheidung')}>
                      <span className="wf-typ-zeichen entscheidung">
                        <Icon name="raute" size={15} />
                      </span>
                      <span>
                        <b>Entscheidung</b>
                        <small>Verzweigt je nach Antwort, z. B. Ja / Nein</small>
                      </span>
                    </button>
                  </div>
                </>
              ) : null}
            </div>
            <button type="button" className="btn-icon wf-zu" onClick={schliessen} aria-label="Schließen">
              ✕
            </button>
          </div>
        </header>

        <div className={`wf-rumpf ${schmal ? 'schmal' : mittel ? 'mittel' : ''}`}>
          <div
            className="wf-flaeche"
            inert={(schmal || mittel) && auswahl !== null}
            onMouseDown={(e) => e.target === e.currentTarget && setAuswahl(null)}
          >
            {hinweis ? <div className="wf-banner">{hinweis}</div> : null}
            {steps.length === 0 ? (
              <div className="wf-leer">
                <Icon name="kette" size={30} strokeWidth={1.3} />
                <strong>Noch kein Schritt</strong>
                <span>Legen Sie den ersten Schritt an.</span>
                <div className="row">
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => hinzufuegen('aufgabe')}>
                    <Icon name="plus" size={13} /> Aufgabe
                  </button>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => hinzufuegen('entscheidung')}>
                    <Icon name="plus" size={13} /> Entscheidung
                  </button>
                </div>
              </div>
            ) : (
              <Ablaufbild
                steps={steps}
                gliederung={gliederung}
                auswahl={gewaehlt?.id ?? null}
                hover={hover}
                fehlend={fehlend}
                schmal={schmal}
                kuerzel={kuerzel}
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
                <div className={schmal ? 'wf-blatt-schatten' : 'wf-schublade-schatten'} onMouseDown={() => setAuswahl(null)} />
              ) : null}
              <aside ref={panelRef} tabIndex={-1} className={`wf-panel ${schmal ? 'blatt' : mittel ? 'schublade' : ''}`}>
                {panel}
              </aside>
            </>
          ) : null}
        </div>

        <footer className="wf-fuss">
          <span className="wf-fuss-info">
            {hinweise.length > 0 ? (
              <button
                type="button"
                className={`wf-hinweis-knopf ${hinweise.some((h) => h.sperrt) ? 'sperrt' : ''}`}
                onClick={() => setAuswahl('uebersicht')}
              >
                {hinweise.length} {hinweise.length === 1 ? 'Hinweis' : 'Hinweise'}
              </button>
            ) : (
              <span className="wf-ok">
                <Icon name="check" size={13} /> Vollständig
              </span>
            )}
            {entscheidungen > 0 ? (
              <span className="tertiary">
                {entscheidungen} {entscheidungen === 1 ? 'Entscheidung' : 'Entscheidungen'} ·{' '}
                {gliederung.abweichungen.length} {gliederung.abweichungen.length === 1 ? 'Abweichung' : 'Abweichungen'}
              </span>
            ) : null}
            {arbeitstage ? <span className="tertiary">Fristen in Arbeitstagen</span> : null}
          </span>
          <span className="spacer" />
          <button type="button" className="btn" onClick={schliessen}>
            Abbrechen
          </button>
          <button type="button" className="btn btn-primary" onClick={speichern}>
            {speichernLabel}
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

function Ablaufbild({
  steps,
  gliederung,
  auswahl,
  hover,
  fehlend,
  schmal,
  kuerzel,
  onAuswahl,
  onHover,
  onEinfuegen,
}: {
  steps: ProcessTemplateStep[];
  gliederung: Gliederung;
  auswahl: ID | null;
  hover: ID | null;
  fehlend: Set<ID>;
  schmal: boolean;
  kuerzel: (rolle: string) => string;
  onAuswahl: (id: ID, perTastatur: boolean) => void;
  onHover: (id: ID | null) => void;
  onEinfuegen: (vonId: ID | null, antwortId: ID | null) => void;
}) {
  const rasterRef = useRef<HTMLDivElement>(null);
  const hauptRef = useRef<HTMLDivElement>(null);
  const abwRef = useRef<HTMLDivElement>(null);
  const karten = useRef(new Map<ID, HTMLElement>());
  const [geo, setGeo] = useState<Geometrie | null>(null);

  const index = useMemo(() => new Map(steps.map((s, i) => [s.id, i])), [steps]);
  const schritt = (id: ID) => steps[index.get(id)!];
  const { haupt, abweichungen, unerreichbar, rueckSprungZu, kanten } = gliederung;

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

  /** Übergänge, die als Linie gezeichnet werden: alle außer dem Standardverlauf und dem Ende. */
  const seitenKanten = kanten.filter((k) => !k.standard && k.nach !== 'ende');
  const abwNachAnker = new Map<number, ID[]>();
  for (const a of abweichungen) abwNachAnker.set(a.anker, [...(abwNachAnker.get(a.anker) ?? []), a.id]);
  const hauptPos = new Map(haupt.map((id, k) => [id, k]));
  /** Stelle im Ablauf: Index im Standardverlauf, bei Abweichungen ihr Anker + ½. */
  const rang = new Map<ID, number>([...hauptPos, ...abweichungen.map((a): [ID, number] => [a.id, a.anker + 0.5])]);
  /** Rücksprung: Übergang zu einem Schritt des Standardverlaufs, der nicht später kommt. */
  const istRueck = (von: ID, nach: Ziel) =>
    nach !== 'ende' && hauptPos.has(nach) && rang.has(von) && hauptPos.get(nach)! <= rang.get(von)!;

  const karte = (id: ID, ort: 'haupt' | 'abweichung' | 'unerreichbar') => {
    const s = schritt(id);
    const i = index.get(id)!;
    const eigene = kanten.filter((k) => k.von === id && !k.standard);
    // Zweige als Text: auf schmalen Bildschirmen alle, sonst nur die nicht gezeichneten (Ende, nicht erreichbar)
    const zweige = eigene.filter((k) => schmal || ort === 'unerreichbar' || k.nach === 'ende');
    return (
      <KarteAnzeige
        key={id}
        step={s}
        nummer={i}
        ort={ort}
        aktiv={auswahl === id}
        hervor={hover !== null && (hover === id || kanten.some((k) => (k.von === hover && k.nach === id) || (k.nach === hover && k.von === id)))}
        fehlt={fehlend.has(id)}
        kuerzel={kuerzel(s.roleName)}
        zweige={zweige.map((k) => ({
          text: k.text,
          ziel: k.nach === 'ende' ? 'Planlauf endet' : `${nr(index.get(k.nach)!)} · ${schritt(k.nach).name || 'ohne Bezeichnung'}`,
          rueck: istRueck(id, k.nach),
        }))}
        refFn={merke(id)}
        onClick={(perTastatur) => onAuswahl(id, perTastatur)}
        onHover={onHover}
      />
    );
  };

  const verbinder = (vonId: ID | null) => {
    // Übergang vom Start zum ersten Schritt bzw. zwischen zwei Schritten des Standardverlaufs
    const s = vonId ? schritt(vonId) : null;
    const std = s ? standardKante(steps, index.get(vonId!)!) : null;
    return (
      <div className="wf-verbinder">
        <span className="wf-linie" />
        {s && s.typ === 'entscheidung' && std?.text ? <span className="wf-antwort standard">{std.text}</span> : null}
        <button
          type="button"
          className="wf-einfuegen"
          tabIndex={-1}
          title="Schritt hier einfügen"
          aria-label="Schritt hier einfügen"
          onClick={() => onEinfuegen(vonId, std?.antwortId ?? null)}
        >
          <Icon name="plus" size={12} strokeWidth={2.2} />
        </button>
        <span className="wf-pfeil" />
      </div>
    );
  };

  const endknoten = (
    <div className="wf-knoten wf-ende">
      {rueckSprungZu ? (
        <>
          <Icon name="schleife" size={14} /> Schleife zurück zu {nr(index.get(rueckSprungZu)!)} ·{' '}
          {schritt(rueckSprungZu).name || 'ohne Bezeichnung'}
        </>
      ) : (
        <>
          <Icon name="ziel" size={14} /> Planlauf abgeschlossen
        </>
      )}
    </div>
  );

  /* -------------------------- schmal: untereinander -------------------------- */
  if (schmal) {
    return (
      <div className="wf-schmal">
        <div className="wf-spaltenkopf">Standardverlauf</div>
        <div className="wf-knoten wf-start">
          <Icon name="start" size={14} /> Planlauf starten
        </div>
        {verbinder(null)}
        {haupt.map((id) => (
          <div key={id} className="wf-zelle">
            {karte(id, 'haupt')}
            {verbinder(id)}
          </div>
        ))}
        {endknoten}
        {abweichungen.length > 0 ? (
          <>
            <div className="wf-spaltenkopf abw">Abweichungen</div>
            <div className="wf-stapel">{abweichungen.map((a) => karte(a.id, 'abweichung'))}</div>
          </>
        ) : null}
        {unerreichbar.length > 0 ? (
          <>
            <div className="wf-spaltenkopf weg">Nicht erreichbar</div>
            <div className="wf-stapel">{unerreichbar.map((id) => karte(id, 'unerreichbar'))}</div>
          </>
        ) : null}
      </div>
    );
  }

  /* -------------------------- breit: zwei Spalten mit Linien -------------------------- */
  const zeilen = haupt.length + 2;
  return (
    <div className="wf-raster" ref={rasterRef}>
      <div className="wf-spaltenkopf" style={{ gridColumn: 1, gridRow: 1 }}>
        Standardverlauf
      </div>
      <div className="wf-spaltenkopf abw" style={{ gridColumn: 3, gridRow: 1 }}>
        Abweichungen
      </div>
      {/* Messleisten für die Spaltenkanten */}
      <div ref={hauptRef} className="wf-messleiste" style={{ gridColumn: 1, gridRow: `2 / ${zeilen + 2}` }} />
      <div ref={abwRef} className="wf-messleiste" style={{ gridColumn: 3, gridRow: `2 / ${zeilen + 2}` }} />

      <div className="wf-zelle wf-start-zelle" style={{ gridColumn: 1, gridRow: 2 }}>
        <div className="wf-knoten wf-start">
          <Icon name="start" size={14} /> Planlauf starten
        </div>
        {verbinder(null)}
      </div>
      {haupt.map((id, k) => (
        <div key={id} className="wf-zelle" style={{ gridColumn: 1, gridRow: k + 3 }}>
          {karte(id, 'haupt')}
          {verbinder(id)}
        </div>
      ))}
      <div className="wf-zelle" style={{ gridColumn: 1, gridRow: haupt.length + 3 }}>
        {endknoten}
      </div>

      {abweichungen.length === 0 ? (
        <div className="wf-abw-leer" style={{ gridColumn: 3, gridRow: 3 }}>
          Keine Abweichungen – jede Antwort führt durch den Standardverlauf. Schritte, die nur über eine andere Antwort
          erreicht werden, erscheinen hier.
        </div>
      ) : null}
      {[...abwNachAnker.entries()].map(([anker, ids]) => (
        <div key={`abw-${anker}`} className="wf-stapel" style={{ gridColumn: 3, gridRow: anker + 3 }}>
          {ids.map((id) => karte(id, 'abweichung'))}
        </div>
      ))}

      {unerreichbar.length > 0 ? (
        <div className="wf-weg" style={{ gridColumn: '1 / -1', gridRow: haupt.length + 4 }}>
          <div className="wf-spaltenkopf weg">Nicht erreichbar – kein Übergang führt zu diesen Schritten</div>
          <div className="wf-weg-karten">{unerreichbar.map((id) => karte(id, 'unerreichbar'))}</div>
        </div>
      ) : null}

      {geo ? (
        <Linien
          geo={geo}
          kanten={seitenKanten}
          rang={rang}
          haupt={new Set(haupt)}
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
  step,
  nummer,
  ort,
  aktiv,
  hervor,
  fehlt,
  kuerzel,
  zweige,
  refFn,
  onClick,
  onHover,
}: {
  step: ProcessTemplateStep;
  nummer: number;
  ort: 'haupt' | 'abweichung' | 'unerreichbar';
  aktiv: boolean;
  hervor: boolean;
  fehlt: boolean;
  kuerzel: string;
  zweige: { text: string | null; ziel: string; rueck: boolean }[];
  refFn: (el: HTMLElement | null) => void;
  onClick: (perTastatur: boolean) => void;
  onHover: (id: ID | null) => void;
}) {
  const entscheidung = step.typ === 'entscheidung';
  return (
    <button
      type="button"
      ref={refFn}
      className={`wf-karte ${step.typ} ${ort} ${aktiv ? 'aktiv' : ''} ${hervor ? 'hervor' : ''} ${fehlt ? 'fehlt' : ''}`}
      onClick={(e) => onClick(e.detail === 0)}
      onMouseEnter={() => onHover(step.id)}
      onMouseLeave={() => onHover(null)}
      aria-pressed={aktiv}
    >
      <span className="wf-karte-kopf">
        <span className={`wf-typ ${step.typ}`}>
          <Icon name={entscheidung ? 'raute' : 'aufgabe'} size={13} />
          {STEP_TYPE_LABEL[step.typ]}
        </span>
        <span className="wf-nr">{nr(nummer)}</span>
      </span>
      <span className={`wf-karte-titel ${step.name ? '' : 'leer'}`}>{step.name || 'Bezeichnung fehlt'}</span>
      <span className="wf-karte-fuss">
        <span className="wf-rolle">
          {step.roleName ? (
            <>
              <span className="wf-kuerzel">{kuerzel}</span>
              <span className="truncate">{step.roleName}</span>
            </>
          ) : (
            <span className="tertiary">keine Funktion</span>
          )}
        </span>
        <span className="wf-frist">
          <Icon name="frist" size={12} />
          {tage(step.fristTage)}
        </span>
      </span>
      {step.nachweis !== 'keine' || step.mailFrage ? (
        <span className="wf-merkmale">
          {step.nachweis !== 'keine' ? <span className="wf-merkmal">{NACHWEIS_LABEL[step.nachweis]}</span> : null}
          {step.mailFrage ? (
            <span className="wf-merkmal">
              <Icon name="mail" size={11} /> E-Mail
            </span>
          ) : null}
        </span>
      ) : null}
      {zweige.length > 0 ? (
        <span className="wf-zweige">
          {zweige.map((z, n) => (
            <span key={n} className={`wf-zweig ${z.rueck ? 'rueck' : ''}`}>
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
    .filter((k) => k.nach !== 'ende' && geo.karten[k.von] && geo.karten[k.nach as ID] && rang.has(k.von) && rang.has(k.nach as ID))
    .map((k) => {
      const nach = k.nach as ID;
      const vonHaupt = haupt.has(k.von);
      const nachHaupt = haupt.has(nach);
      const art: Art = vonHaupt ? (nachHaupt ? 'hauptHaupt' : 'zurAbw') : nachHaupt ? 'zurHaupt' : 'abwAbw';
      const q = geo.karten[k.von];
      const z = geo.karten[nach];
      const linksRaus = art === 'zurHaupt';
      // Direkt darunter gestapelte Abweichung: senkrecht von Karte zu Karte
      const gestapelt = art === 'abwAbw' && z.t >= q.b && z.t - q.b < 40 && Math.abs(z.l - q.l) < 2;
      const sx = linksRaus ? q.l : q.r;
      const sy = Math.min(q.t + Y + versetzt(`${k.von}:${linksRaus ? 'l' : 'r'}`), q.b - 8);
      // Rücksprung: führt zu einem Schritt des Standardverlaufs, der nicht später kommt
      const rueck = nachHaupt && rang.get(nach)! <= rang.get(k.von)!;
      // Linien zum selben Ziel teilen sich Bahn und Anschluss (Bündel)
      const bereich: 'zwischen' | 'rechts' = art === 'abwAbw' ? 'rechts' : 'zwischen';
      const gruppe = `${nach}:${art === 'zurAbw' ? 'l' : 'r'}:${bereich}`;
      // Eingänge an der rechten Kartenseite etwas tiefer als die Ausgänge dort
      const ty = z.t + Y + (art === 'zurAbw' ? 0 : 16);
      return { k, nach, art, q, z, sx, sy, ty, rueck, bereich, gruppe, gestapelt };
    });

  // Bahnen: je Bündel eine, überlappende Bündel nebeneinander
  const spannen = new Map<string, { von: number; bis: number; bereich: 'zwischen' | 'rechts' }>();
  for (const g of gezeichnet) {
    if (g.gestapelt) continue;
    const alt = spannen.get(g.gruppe);
    const von = Math.min(g.sy, g.ty, alt?.von ?? Infinity);
    const bis = Math.max(g.sy, g.ty, alt?.bis ?? -Infinity);
    spannen.set(g.gruppe, { von, bis, bereich: g.bereich });
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
    if (g.gestapelt) {
      const cx = (g.q.l + g.q.r) / 2;
      return {
        k: g.k,
        d: `M ${cx} ${g.q.b} L ${cx} ${g.z.t}`,
        spitze: `M ${cx} ${g.z.t} l -4.5 -7 l 9 0 z`,
        label: { x: cx + 8, y: g.q.b + 16, links: false },
        rueck: g.rueck,
        aktiv: auswahl !== null && (g.k.von === auswahl || g.nach === auswahl),
        hervor: hover !== null && (g.k.von === hover || g.nach === hover),
      };
    }
    const x = bahnX(g.gruppe, g.bereich);
    const tx = g.art === 'zurAbw' ? g.z.l : g.z.r;
    const punkte: [number, number][] =
      g.art === 'zurAbw' && Math.abs(g.sy - g.ty) < 1
        ? [[g.sx, g.sy], [tx, g.ty]]
        : [[g.sx, g.sy], [x, g.sy], [x, g.ty], [tx, g.ty]];
    const nachRechts = g.art === 'zurAbw';
    const spitze = nachRechts ? `M ${tx} ${g.ty} l -7 -4.5 l 0 9 z` : `M ${tx} ${g.ty} l 7 -4.5 l 0 9 z`;
    const links = g.art === 'zurHaupt';
    return {
      k: g.k,
      d: eckenPfad(punkte),
      spitze,
      label: { x: links ? g.sx - 8 : g.sx + 8, y: g.sy, links },
      rueck: g.rueck,
      aktiv: auswahl !== null && (g.k.von === auswahl || g.nach === auswahl),
      hervor: hover !== null && (g.k.von === hover || g.nach === hover),
    };
  });

  return (
    <>
      <svg className="wf-linien" width={geo.breite} height={geo.hoehe} aria-hidden="true">
        {linien.map((l, n) => (
          <g key={n} className={`wf-kante ${l.rueck ? 'rueck' : 'abw'} ${l.aktiv ? 'aktiv' : ''} ${l.hervor ? 'hervor' : ''}`}>
            <path className="wf-kante-linie" d={l.d} />
            <path className="wf-kante-spitze" d={l.spitze} />
          </g>
        ))}
      </svg>
      {linien.map((l, n) =>
        l.k.text ? (
          <span
            key={`t${n}`}
            className={`wf-antwort ${l.rueck ? 'rueck' : 'abw'} ${l.aktiv ? 'aktiv' : ''}`}
            style={{
              left: l.label.x,
              top: l.label.y,
              transform: `translate(${l.label.links ? '-100%' : '0'}, -125%)`,
            }}
          >
            {l.k.text}
          </span>
        ) : null,
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Schrittdetails                                                      */
/* ------------------------------------------------------------------ */

function SchrittDetails({
  step,
  steps,
  gliederung,
  bildFolge,
  rollenListe,
  onAuswahl,
  onSchrittAendern,
  onSchritteAendern,
  onEntfernen,
  onSchliessen,
  schmal,
}: {
  step: ProcessTemplateStep;
  steps: ProcessTemplateStep[];
  gliederung: Gliederung;
  bildFolge: ID[];
  rollenListe: string[];
  onAuswahl: (id: ID | 'uebersicht' | null) => void;
  onSchrittAendern: (id: ID, f: (s: ProcessTemplateStep) => ProcessTemplateStep, feld?: string | null) => void;
  onSchritteAendern: (f: (s: ProcessTemplateStep[]) => ProcessTemplateStep[], feld?: string | null) => void;
  onEntfernen: (id: ID) => void;
  onSchliessen: () => void;
  schmal: boolean;
}) {
  const { data } = useStore();
  const i = steps.indexOf(step);
  const pos = bildFolge.indexOf(step.id);
  const ort = gliederung.haupt.includes(step.id)
    ? 'Standardverlauf'
    : gliederung.unerreichbar.includes(step.id)
      ? 'nicht erreichbar'
      : 'Abweichung';
  const entscheidung = step.typ === 'entscheidung';
  const hauptPos = gliederung.haupt.indexOf(step.id);
  const aendern = (patch: Partial<ProcessTemplateStep>, feld: string | null = null) =>
    onSchrittAendern(step.id, (s) => ({ ...s, ...patch }), feld);
  const folge = steps[i + 1];

  /** Auswahl „weiter mit“: nächster Schritt der Liste, jeder andere Schritt, Ende. */
  const zielAuswahl = (wert: ID | 'ende' | null, setzen: (z: ID | 'ende' | null) => void, beschriftung: string) => (
    <select
      className="select"
      aria-label={beschriftung}
      value={wert ?? ''}
      onChange={(e) => setzen(e.target.value === '' ? null : (e.target.value as ID | 'ende'))}
    >
      <option value="">
        {folge ? `Nächster Schritt: ${nr(i + 1)} · ${folge.name || 'ohne Bezeichnung'}` : 'Nächster Schritt (Planlauf endet)'}
      </option>
      {steps.map((z, n) =>
        z.id === step.id ? null : (
          <option key={z.id} value={z.id}>
            {nr(n)} · {z.name || 'ohne Bezeichnung'}
          </option>
        ),
      )}
      <option value="ende">Planlauf beenden</option>
      {wert !== null && wert !== 'ende' && (wert === step.id || !steps.some((z) => z.id === wert)) ? (
        <option value={wert}>{wert === step.id ? `${nr(i)} · dieser Schritt (Wiederholung)` : 'Unbekannter Schritt – bitte wählen'}</option>
      ) : null}
    </select>
  );

  return (
    <div className="wf-details">
      <div className="wf-panel-kopf">
        <span>Schrittdetails</span>
        <span className="wf-panel-nav">
          <button
            type="button"
            className="btn-icon"
            disabled={pos <= 0}
            onClick={() => onAuswahl(bildFolge[pos - 1])}
            aria-label="Vorheriger Schritt"
            title="Vorheriger Schritt"
          >
            <Icon name="zurueck" size={14} />
          </button>
          <span className="tertiary">
            {pos + 1} von {bildFolge.length}
          </span>
          <button
            type="button"
            className="btn-icon"
            disabled={pos < 0 || pos >= bildFolge.length - 1}
            onClick={() => onAuswahl(bildFolge[pos + 1])}
            aria-label="Nächster Schritt"
            title="Nächster Schritt"
          >
            <Icon name="chevron" size={14} />
          </button>
          <button type="button" className="btn-icon" onClick={onSchliessen} aria-label="Details schließen" title="Schließen">
            ✕
          </button>
        </span>
      </div>

      <div className="wf-panel-titel">
        <span className={`wf-typ-zeichen ${step.typ}`}>
          <Icon name={entscheidung ? 'raute' : 'aufgabe'} size={18} />
        </span>
        <div>
          <strong>{entscheidung ? 'Entscheidung bearbeiten' : 'Aufgabe bearbeiten'}</strong>
          <div className="small tertiary">
            Schritt {nr(i)} im Workflow · {ort}
          </div>
        </div>
      </div>

      <div className="wf-felder">
        <label className="wf-feld">
          <span>Bezeichnung</span>
          <input
            className={`input ${step.name.trim() ? '' : 'wf-pflicht'}`}
            value={step.name}
            autoFocus={!step.name && !schmal}
            placeholder={entscheidung ? 'z. B. Prüfung ohne Mängel?' : 'z. B. Planerstellung'}
            onChange={(e) => aendern({ name: e.target.value }, `${step.id}:name`)}
          />
        </label>

        <div className="wf-feld">
          <span>Art</span>
          <div className="segmented wf-art" role="radiogroup" aria-label="Art">
            {(['aufgabe', 'entscheidung'] as StepType[]).map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={step.typ === t}
                className={step.typ === t ? 'active' : ''}
                onClick={() => {
                  // IDs neuer Antworten vor der Änderung erzeugen (StrictMode)
                  const neu = artSetzen(step, t, newId);
                  onSchrittAendern(step.id, () => neu);
                }}
              >
                <Icon name={t === 'entscheidung' ? 'raute' : 'aufgabe'} size={13} /> {STEP_TYPE_LABEL[t]}
              </button>
            ))}
          </div>
        </div>

        <label className="wf-feld">
          <span>Verantwortliche Funktion</span>
          <input
            className="input"
            value={step.roleName}
            list="wf-rollen"
            placeholder="z. B. Fachplaner"
            onChange={(e) => onSchrittAendern(step.id, (s) => funktionSetzen(s, e.target.value), `${step.id}:rolle`)}
          />
          <datalist id="wf-rollen">
            {rollenListe.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </label>

        <div className="wf-feld-reihe">
          <label className="wf-feld">
            <span>Frist</span>
            <span className="wf-mit-einheit">
              <input
                className="input"
                inputMode="numeric"
                value={step.fristTage}
                onChange={(e) =>
                  aendern({ fristTage: Number(e.target.value.replace(/\D/g, '')) || 0 }, `${step.id}:frist`)
                }
              />
              <span>Tage</span>
            </span>
          </label>
          <label className="wf-feld">
            <span>Nachweis bei Abschluss</span>
            <select
              className="select"
              value={step.nachweis}
              onChange={(e) => aendern({ nachweis: e.target.value as Nachweis })}
            >
              {Object.entries(NACHWEIS_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="wf-hilfe">
          Die Frist zählt ab dem Soll-Termin des vorherigen Schritts. Ein Nachweis wird beim Erledigen abgefragt.
        </p>
      </div>

      <section className="wf-abschnitt">
        <h4>
          <Icon name="kette" size={14} /> Wie geht es weiter?
        </h4>
        {entscheidung ? (
          <>
            <p className="wf-hilfe">Jede Antwort führt zu einem nächsten Schritt. Die erste Antwort bildet den Standardverlauf.</p>
            <div className="wf-antworten">
              {step.antworten.map((a, n) => (
                <div key={a.id} className={`wf-antwort-karte ${n === 0 ? 'standard' : ''}`}>
                  <div className="wf-antwort-zeile">
                    <span className="wf-punkt" />
                    <input
                      className="input"
                      value={a.text}
                      placeholder={STANDARD_ANTWORTEN[n] ?? `Antwort ${n + 1}`}
                      aria-label={`Antwort ${n + 1}`}
                      onChange={(e) =>
                        onSchrittAendern(
                          step.id,
                          (s) => ({ ...s, antworten: s.antworten.map((x) => (x.id === a.id ? { ...x, text: e.target.value } : x)) }),
                          `${a.id}:text`,
                        )
                      }
                    />
                    <button
                      type="button"
                      className="btn-icon"
                      aria-label="Antwort entfernen"
                      title="Antwort entfernen"
                      disabled={step.antworten.length <= 1}
                      onClick={() =>
                        onSchrittAendern(step.id, (s) => ({ ...s, antworten: s.antworten.filter((x) => x.id !== a.id) }))
                      }
                    >
                      ✕
                    </button>
                  </div>
                  <div className="wf-weiter">
                    <span>→ Weiter mit</span>
                    {zielAuswahl(a.ziel, (z) => onSchritteAendern((alle) => zielSetzen(alle, step.id, a.id, z)), `Weiter mit nach „${a.text}“`)}
                  </div>
                  {n === 0 ? (
                    <span className="wf-standard-marke">Standardverlauf</span>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost wf-als-standard"
                      onClick={() => onSchritteAendern((alle) => alsStandard(alle, step.id, a.id))}
                    >
                      Als Standardverlauf
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={() => {
                const antwort = { id: newId('ant'), text: '', ziel: null };
                onSchrittAendern(step.id, (s) => ({ ...s, antworten: [...s.antworten, antwort] }));
              }}
            >
              <Icon name="plus" size={13} /> Antwort
            </button>
          </>
        ) : (
          <label className="wf-feld">
            <span>Weiter mit</span>
            {zielAuswahl(step.naechster, (z) => onSchritteAendern((alle) => zielSetzen(alle, step.id, null, z)), 'Weiter mit')}
          </label>
        )}
      </section>

      <section className="wf-abschnitt">
        <h4>
          <Icon name="mail" size={14} /> E-Mail nach Abschluss
        </h4>
        <label className="checkbox">
          <input type="checkbox" checked={step.mailFrage} onChange={(e) => aendern({ mailFrage: e.target.checked })} />
          Nach einer E-Mail fragen
        </label>
        <p className="wf-hilfe">
          Fragt nach dem Erledigen, ob die für den nächsten Schritt zuständige Person informiert werden soll.
        </p>
        {step.mailFrage ? (
          <select
            className="select"
            value={step.mailVorlageId ?? ''}
            onChange={(e) => aendern({ mailVorlageId: e.target.value || null })}
            aria-label="E-Mail-Vorlage"
          >
            <option value="">Vorlage automatisch wählen</option>
            {data.emailVorlagen.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        ) : null}
      </section>

      <section className="wf-abschnitt wf-aktionen">
        <div className="wf-position">
          <span className="small tertiary">Im Standardverlauf</span>
          <button
            type="button"
            className="btn-icon"
            disabled={hauptPos <= 0}
            onClick={() => onSchritteAendern((alle) => imVerlaufVerschieben(alle, step.id, -1))}
            aria-label="Früher im Ablauf"
            title="Früher im Ablauf"
          >
            <Icon name="hoch" size={14} />
          </button>
          <button
            type="button"
            className="btn-icon"
            disabled={hauptPos < 0 || hauptPos >= gliederung.haupt.length - 1}
            onClick={() => onSchritteAendern((alle) => imVerlaufVerschieben(alle, step.id, 1))}
            aria-label="Später im Ablauf"
            title="Später im Ablauf"
          >
            <Icon name="runter" size={14} />
          </button>
        </div>
        <div className="row wrap" style={{ gap: 6 }}>
          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={() => {
              const ergebnis = duplizieren(steps, step.id, newId);
              onSchritteAendern(() => ergebnis);
              const kopie = ergebnis.find((x) => !steps.some((y) => y.id === x.id));
              if (kopie) onAuswahl(kopie.id);
            }}
          >
            <Icon name="kopieren" size={13} /> Duplizieren
          </button>
          <button type="button" className="btn btn-sm btn-danger" onClick={() => onEntfernen(step.id)}>
            <Icon name="loeschen" size={13} /> Entfernen
          </button>
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Übersicht ohne gewählten Schritt                                    */
/* ------------------------------------------------------------------ */

function Uebersicht({
  mitStammdaten,
  beschreibung,
  onBeschreibung,
  steps,
  gliederung,
  hinweise,
  dauer,
  arbeitstage,
  onAuswahl,
  onSchliessen,
}: {
  mitStammdaten: boolean;
  beschreibung: string;
  onBeschreibung: (v: string) => void;
  steps: ProcessTemplateStep[];
  gliederung: Gliederung;
  hinweise: ReturnType<typeof pruefen>;
  dauer: number;
  arbeitstage: boolean;
  onAuswahl: (id: ID | 'uebersicht' | null) => void;
  onSchliessen?: () => void;
}) {
  const entscheidungen = steps.filter((s) => s.typ === 'entscheidung').length;
  return (
    <div className="wf-details">
      <div className="wf-panel-kopf">
        <span>Übersicht</span>
        {onSchliessen ? (
          <button type="button" className="btn-icon" onClick={onSchliessen} aria-label="Übersicht schließen">
            ✕
          </button>
        ) : null}
      </div>

      {mitStammdaten ? (
        <div className="wf-felder">
          <label className="wf-feld">
            <span>Beschreibung</span>
            <textarea
              className="textarea"
              rows={2}
              value={beschreibung}
              placeholder="Erscheint bei der Auswahl des Workflows"
              onChange={(e) => onBeschreibung(e.target.value)}
            />
          </label>
        </div>
      ) : null}

      <div className="wf-kacheln">
        <div>
          <b>{steps.length}</b>
          <span>Schritte</span>
        </div>
        <div>
          <b>{entscheidungen}</b>
          <span>Entscheidungen</span>
        </div>
        <div>
          <b>{dauer}</b>
          <span>Tage im Standardverlauf{arbeitstage ? ' (Arbeitstage)' : ''}</span>
        </div>
        <div>
          <b>{gliederung.abweichungen.length}</b>
          <span>Abweichungen</span>
        </div>
      </div>

      {hinweise.length > 0 ? (
        <section className="wf-abschnitt">
          <h4>
            <Icon name="info" size={14} /> Hinweise
          </h4>
          <div className="wf-hinweise">
            {hinweise.map((h, n) => (
              <button
                key={n}
                type="button"
                className={`wf-hinweis ${h.sperrt ? 'sperrt' : ''}`}
                disabled={!h.stepId}
                onClick={() => h.stepId && onAuswahl(h.stepId)}
              >
                {h.text}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className="wf-abschnitt">
        <h4>So lesen Sie das Bild</h4>
        <ul className="wf-legende">
          <li>
            <span className="wf-legende-linie standard" />
            <span>
              <b>Standardverlauf</b> – der Weg mit der jeweils ersten Antwort; nach ihm rechnen die Soll-Termine.
            </span>
          </li>
          <li>
            <span className="wf-legende-linie abw" />
            <span>
              <b>Abweichung</b> – Weg über eine andere Antwort, etwa „Nein“.
            </span>
          </li>
          <li>
            <span className="wf-legende-linie rueck" />
            <span>
              <b>Rücksprung</b> – führt zu einem früheren Schritt zurück; der Planlauf durchläuft ihn erneut.
            </span>
          </li>
        </ul>
      </section>

      <section className="wf-abschnitt">
        <h4>Bedienung</h4>
        <ul className="wf-tipps">
          <li>Karte anklicken, um den Schritt zu bearbeiten.</li>
          <li>„+“ zwischen zwei Karten fügt dort eine Aufgabe ein.</li>
          <li>Strg+Z bzw. Strg+Y: Rückgängig und Wiederholen.</li>
        </ul>
      </section>
    </div>
  );
}
