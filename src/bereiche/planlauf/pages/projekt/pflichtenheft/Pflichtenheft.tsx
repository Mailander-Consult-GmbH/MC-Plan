/**
 * Reiter „Pflichtenheft“ im Projekt: erstellt das Pflichtenheft aus der
 * Vorlage und lässt Deckblatt, Kapitel, Anlagen und Änderungsindex bearbeiten.
 * Ansprechpartner kommen aus den Funktionen des Projekts (Reiter „Funktion“),
 * Projekt- und Stammdaten aus den Einstellungen des Projekts; im Text stehen
 * sie als farbige Platzhalter. „Vorschau“ zeigt das Dokument so, wie es
 * gedruckt wird; „Als PDF ausgeben“ öffnet den Druckdialog (domain/pflichtenheft.ts).
 *
 * Längere Eingaben speichert die Seite verzögert (`useEntwurf`), damit nicht
 * jeder Tastendruck den ganzen Bestand schreibt.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  PFLICHTENHEFT_GRUPPEN,
  PFLICHTENHEFT_PLATZHALTER,
  PFLICHTENHEFT_STIL,
  ansprechpartnerZeilen,
  eigenerKontakt,
  kapitelNummern,
  pflichtenheftAufbereiten,
  pflichtenheftHtml,
  platzhalterWerte,
  textEinsetzen,
  unterschriftVorgabe,
  UNTERSCHRIFT_LABEL,
  type PflichtenheftPlatzhalterGruppe,
  type UnterschriftArt,
} from '../../../domain/pflichtenheft';
import {
  funktionsName,
  type Pflichtenheft,
  type PflichtenheftAbschnitt,
  type PflichtenheftArt,
  type Project,
} from '../../../domain/types';
import type { ProjektTab } from '../../../lib/router';
import { newId, useStore } from '../../../store/store';
import { druckeHtml, htmlDokument } from '../../../../../shared/print';
import { useToast } from '../../../../../shared/toast';
import { Icon } from '../../../../../shared/icons';
import { listenEintrag } from '../../../../../shared/bewegung';
import { today } from '../../../../../shared/dates';
import {
  BausteinEditor,
  type BausteinEditorGriff,
  type BausteinTon,
  type BausteinVerzeichnis,
} from '../../../../../shared/bausteinEditor';
import {
  Badge,
  Callout,
  Card,
  CardHeader,
  ConfirmDialog,
  EmptyState,
  Field,
  Segmented,
  TextInput,
} from '../../../../../shared/ui';
import { PlancodierungKarte } from './PlancodierungKarte';
import './pflichtenheft.css';

/* ------------------------------------------------------------------ */
/* Hilfen                                                              */
/* ------------------------------------------------------------------ */

/**
 * Eingabe mit verzögertem Speichern: Der Entwurf folgt jedem Tastendruck,
 * gespeichert wird nach einer kurzen Pause und spätestens beim Verlassen.
 * Ändert sich der gespeicherte Wert von außen, übernimmt ihn der Entwurf,
 * solange nichts ungespeichert ist.
 */
function useEntwurf(wert: string, speichern: (v: string) => void, ms = 450): [string, (v: string) => void] {
  const [entwurf, setEntwurf] = useState(wert);
  const offen = useRef(false);
  const aktuell = useRef(wert);
  const speichernRef = useRef(speichern);
  speichernRef.current = speichern;
  useEffect(() => {
    if (!offen.current) {
      setEntwurf(wert);
      aktuell.current = wert;
    }
  }, [wert]);
  useEffect(() => {
    if (!offen.current) return;
    const t = setTimeout(() => {
      offen.current = false;
      speichernRef.current(aktuell.current);
    }, ms);
    return () => clearTimeout(t);
  }, [entwurf, ms]);
  useEffect(
    () => () => {
      if (offen.current) speichernRef.current(aktuell.current);
    },
    [],
  );
  return [
    entwurf,
    (v: string) => {
      offen.current = true;
      aktuell.current = v;
      setEntwurf(v);
    },
  ];
}

const GRUPPEN_TON: Record<PflichtenheftPlatzhalterGruppe, BausteinTon> = {
  projekt: 'blau',
  station: 'gruen',
  auftraggeber: 'lila',
  anlagen: 'orange',
};

const ART_LABEL: Record<PflichtenheftArt, string> = {
  text: 'Text',
  ansprechpartner: 'Ansprechpartner',
  plm: 'Planlaufmanagement',
  anlagen: 'Anlagenverzeichnis',
};

/** Text mit farbigen Platzhaltern und der Leiste zum Einfügen. */
function PlatzhalterText({
  wert,
  onChange,
  bausteine,
  label,
  zeilen = 6,
  einzeilig = false,
  leiste = true,
}: {
  wert: string;
  onChange: (v: string) => void;
  bausteine: BausteinVerzeichnis;
  label: string;
  zeilen?: number;
  einzeilig?: boolean;
  leiste?: boolean;
}) {
  const griff = useRef<BausteinEditorGriff>(null);
  const [entwurf, setEntwurf] = useEntwurf(wert, onChange);
  return (
    <div className="phe-text">
      <BausteinEditor
        griff={griff}
        wert={entwurf}
        onChange={setEntwurf}
        bausteine={bausteine}
        label={label}
        zeilen={zeilen}
        einzeilig={einzeilig}
        leer="Text eingeben …"
      />
      {leiste ? (
        <div className="phe-palette" role="group" aria-label={`Platzhalter in „${label}“ einfügen`}>
          {PFLICHTENHEFT_GRUPPEN.map((g) => (
            <div key={g.id} className="phe-palette-zeile">
              <span className="phe-palette-kat">{g.label}</span>
              <div className="row wrap" style={{ gap: 6 }}>
                {PFLICHTENHEFT_PLATZHALTER.filter((p) => p.gruppe === g.id).map((p) => (
                  <button
                    key={p.schluessel}
                    type="button"
                    className={`bst-knopf bst-ton-${GRUPPEN_TON[g.id]}`}
                    title={bausteine[p.schluessel]?.titel}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => griff.current?.einfuegen(p.schluessel)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <p className="small tertiary">Absätze durch eine Leerzeile trennen, **fett** mit zwei Sternchen.</p>
        </div>
      ) : null}
    </div>
  );
}

/** Eingabefeld mit verzögertem Speichern. */
function EntwurfFeld({
  wert,
  onChange,
  ...rest
}: { wert: string; onChange: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  const [entwurf, setEntwurf] = useEntwurf(wert, onChange);
  return <TextInput value={entwurf} onChange={setEntwurf} {...rest} />;
}

/** Verkleinert ein Bild auf höchstens 1600 px Breite (JPEG) – der Bestand liegt im localStorage. */
function bildVerkleinern(datei: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const leser = new FileReader();
    leser.onerror = () => reject(new Error('Bild nicht lesbar'));
    leser.onload = () => {
      const bild = new Image();
      bild.onerror = () => reject(new Error('Bild nicht lesbar'));
      bild.onload = () => {
        const faktor = Math.min(1, 1600 / bild.width);
        const leinwand = document.createElement('canvas');
        leinwand.width = Math.round(bild.width * faktor);
        leinwand.height = Math.round(bild.height * faktor);
        const ctx = leinwand.getContext('2d');
        if (!ctx) return reject(new Error('Bild nicht lesbar'));
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, leinwand.width, leinwand.height);
        ctx.drawImage(bild, 0, 0, leinwand.width, leinwand.height);
        resolve(leinwand.toDataURL('image/jpeg', 0.8));
      };
      bild.src = String(leser.result);
    };
    leser.readAsDataURL(datei);
  });
}

/* ------------------------------------------------------------------ */
/* Seite                                                               */
/* ------------------------------------------------------------------ */

type Ansicht = 'bearbeiten' | 'vorschau';

export function PflichtenheftSeite({ project, gotoTab }: { project: Project; gotoTab: (t: ProjektTab) => void }) {
  const { data, pflichtenheftAnlegen, pflichtenheftAendern, pflichtenheftVorlageSpeichern } = useStore();
  const toast = useToast();
  const [ansicht, setAnsicht] = useState<Ansicht>('bearbeiten');
  const [neuErstellen, setNeuErstellen] = useState(false);
  const ph = useMemo(() => (project.pflichtenheft ? pflichtenheftAufbereiten(project.pflichtenheft) : null), [project.pflichtenheft]);
  const aendern = (fn: (p: Pflichtenheft) => Pflichtenheft) => pflichtenheftAendern(project.id, fn);

  const werte = useMemo(() => (ph ? platzhalterWerte(data, project, ph) : {}), [data, project, ph]);
  const bausteine: BausteinVerzeichnis = useMemo(
    () =>
      Object.fromEntries(
        PFLICHTENHEFT_PLATZHALTER.map((p) => [
          p.schluessel,
          {
            label: p.label,
            ton: GRUPPEN_TON[p.gruppe],
            titel: `${p.beschreibung}\nIm Projekt: ${werte[p.schluessel]?.trim() ? werte[p.schluessel] : '(noch leer)'}`,
          },
        ]),
      ),
    [werte],
  );

  if (!ph) {
    return (
      <Card>
        <EmptyState
          icon="pflichtenheft"
          titel="Noch kein Pflichtenheft"
          text="KaPlan erstellt es aus der Vorlage – mit den Projekt- und Stammdaten, den Ansprechpartnern aus den Funktionen und den Workflows des Projekts. Texte und Anlagen lassen sich danach hier anpassen."
          action={
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                pflichtenheftAnlegen(project.id);
                toast('Pflichtenheft erstellt.');
              }}
            >
              <Icon name="plus" size={14} /> Pflichtenheft erstellen
            </button>
          }
        />
      </Card>
    );
  }

  const ausgeben = () => {
    const titel = textEinsetzen(ph.titel, werte) || 'Pflichtenheft';
    druckeHtml(`${titel} ${project.gNummer || project.nummer}`.trim(), pflichtenheftHtml(data, project, ph), PFLICHTENHEFT_STIL);
  };
  const s = project.stammdaten;
  const fehlend = [
    !project.gNummer.trim() ? 'G-Nummer' : '',
    !s?.station.trim() ? 'Station' : '',
    !s?.planungsphase.trim() ? 'Planungsphase' : '',
    !s?.auftraggeber.trim() ? 'Auftraggeber' : '',
    !s?.strecken.length ? 'Strecken' : '',
  ].filter(Boolean);

  return (
    <div className="stack">
      <div className="row-between wrap" style={{ gap: 10 }}>
        <Segmented<Ansicht>
          value={ansicht}
          onChange={setAnsicht}
          options={[
            { value: 'bearbeiten', label: 'Bearbeiten' },
            { value: 'vorschau', label: 'Vorschau' },
          ]}
        />
        <div className="row wrap" style={{ gap: 8 }}>
          <button type="button" className="btn btn-ghost" onClick={() => setNeuErstellen(true)}>
            Neu aus Vorlage
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => {
              pflichtenheftVorlageSpeichern(project.id);
              toast('Als Vorlage für neue Pflichtenhefte gespeichert.');
            }}
            title="Titel, Kapitel, Texte, Gewerke, Hinweis der Ablaufdiagramme und Plancodierung gelten danach für jedes neu erstellte Pflichtenheft"
          >
            Als Vorlage speichern
          </button>
          <button type="button" className="btn btn-primary" onClick={ausgeben}>
            <Icon name="drucken" size={14} /> Als PDF ausgeben
          </button>
        </div>
      </div>

      {fehlend.length > 0 ? (
        <Callout icon="i">
          In den Stammdaten fehlen noch: {fehlend.join(', ')}.{' '}
          <button type="button" className="link-btn phe-link" onClick={() => gotoTab('einstellungen')}>
            Zu den Einstellungen des Projekts
          </button>
        </Callout>
      ) : null}

      {ansicht === 'vorschau' ? (
        <Card>
          <iframe
            className="phe-vorschau"
            title="Vorschau des Pflichtenhefts"
            srcDoc={htmlDokument('Pflichtenheft', pflichtenheftHtml(data, project, ph), PFLICHTENHEFT_STIL)}
          />
        </Card>
      ) : (
        <>
          <DeckblattKarte project={project} ph={ph} aendern={aendern} bausteine={bausteine} />
          <KapitelKarte project={project} ph={ph} aendern={aendern} bausteine={bausteine} gotoTab={gotoTab} />
          <AnlagenKarte project={project} ph={ph} aendern={aendern} bausteine={bausteine} />
          <PlancodierungKarte project={project} ph={ph} aendern={aendern} />
          <AenderungsKarte ph={ph} aendern={aendern} />
        </>
      )}

      {neuErstellen ? (
        <ConfirmDialog
          titel="Pflichtenheft neu erstellen?"
          text="Kapitel, Texte, Unterschriften, Anlagen und Änderungsindex werden durch die Vorlage ersetzt. Projektdaten und Ansprechpartner bleiben, wie sie im Projekt stehen."
          bestaetigenLabel="Neu erstellen"
          onConfirm={() => {
            pflichtenheftAnlegen(project.id);
            toast('Pflichtenheft neu erstellt.');
          }}
          onClose={() => setNeuErstellen(false)}
        />
      ) : null}
    </div>
  );
}

type KartenProps = {
  project: Project;
  ph: Pflichtenheft;
  aendern: (fn: (p: Pflichtenheft) => Pflichtenheft) => void;
  bausteine: BausteinVerzeichnis;
};

/* ------------------------------------------------------------------ */
/* Deckblatt                                                           */
/* ------------------------------------------------------------------ */

function DeckblattKarte({ project, ph, aendern, bausteine }: KartenProps) {
  const { data } = useStore();
  const toast = useToast();
  const datei = useRef<HTMLInputElement>(null);

  const bildWaehlen = async (f: File | undefined) => {
    if (!f) return;
    try {
      const url = await bildVerkleinern(f);
      aendern((p) => ({ ...p, titelbild: url }));
    } catch {
      toast('Das Bild ließ sich nicht lesen.');
    }
  };

  return (
    <Card>
      <CardHeader titel="Deckblatt" sub="Titel, Bild und Unterschriften – leere Felder füllt KaPlan aus den Kontakten" />
      <div className="card-pad stack">
        <Field label="Titel" full>
          <PlatzhalterText
            wert={ph.titel}
            onChange={(v) => aendern((p) => ({ ...p, titel: v }))}
            bausteine={bausteine}
            label="Titel"
            einzeilig
            leiste={false}
          />
        </Field>
        <div className="field">
          <label>Bild</label>
          <div className="row wrap" style={{ gap: 12, alignItems: 'center' }}>
            {ph.titelbild ? <img className="phe-bild" src={ph.titelbild} alt="Bild auf dem Deckblatt" /> : null}
            <button type="button" className="btn btn-outline btn-sm" onClick={() => datei.current?.click()}>
              <Icon name="bild" size={13} /> {ph.titelbild ? 'Bild ersetzen' : 'Bild wählen'}
            </button>
            {ph.titelbild ? (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => aendern((p) => ({ ...p, titelbild: '' }))}>
                Bild entfernen
              </button>
            ) : null}
            <input
              ref={datei}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                void bildWaehlen(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </div>
        </div>
        {(['aufgestellt', 'freigegeben', 'geaendert'] as UnterschriftArt[]).map((art) => {
          const vorgabe = unterschriftVorgabe(data, project, ph, art);
          const u = ph[art];
          const setzen = (patch: Partial<typeof u>) => aendern((p) => ({ ...p, [art]: { ...p[art], ...patch } }));
          return (
            <div key={art} className="phe-unterschrift">
              <div className="phe-unterschrift-titel">{UNTERSCHRIFT_LABEL[art]}</div>
              <div className="phe-unterschrift-felder">
                <EntwurfFeld wert={u.ort} onChange={(v) => setzen({ ort: v })} placeholder={vorgabe.ort || 'Ort'} aria-label={`${UNTERSCHRIFT_LABEL[art]}: Ort`} />
                <TextInput
                  type="date"
                  value={u.datum ?? ''}
                  onChange={(v) => setzen({ datum: v || null })}
                  aria-label={`${UNTERSCHRIFT_LABEL[art]}: Datum`}
                  title={art === 'geaendert' && !u.datum ? 'Leer: Datum des jüngsten Eintrags im Änderungsindex' : undefined}
                />
                <EntwurfFeld
                  wert={u.funktion}
                  onChange={(v) => setzen({ funktion: v })}
                  placeholder={vorgabe.funktion || 'Funktion (OE)'}
                  aria-label={`${UNTERSCHRIFT_LABEL[art]}: Funktion (OE)`}
                />
                <EntwurfFeld wert={u.name} onChange={(v) => setzen({ name: v })} placeholder={vorgabe.name || 'Name'} aria-label={`${UNTERSCHRIFT_LABEL[art]}: Name`} />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Kapitel                                                             */
/* ------------------------------------------------------------------ */

function KapitelKarte({ project, ph, aendern, bausteine, gotoTab }: KartenProps & { gotoTab: (t: ProjektTab) => void }) {
  const [offen, setOffen] = useState<string | null>(null);
  const [loeschen, setLoeschen] = useState<PflichtenheftAbschnitt | null>(null);
  const nummern = kapitelNummern(ph.abschnitte);

  const abschnittAendern = (id: string, patch: Partial<PflichtenheftAbschnitt>) =>
    aendern((p) => ({ ...p, abschnitte: p.abschnitte.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));
  const verschieben = (id: string, richtung: -1 | 1) =>
    aendern((p) => {
      const i = p.abschnitte.findIndex((a) => a.id === id);
      const j = i + richtung;
      if (i < 0 || j < 0 || j >= p.abschnitte.length) return p;
      const liste = [...p.abschnitte];
      [liste[i], liste[j]] = [liste[j], liste[i]];
      return { ...p, abschnitte: liste };
    });
  const hinzufuegen = (art: PflichtenheftArt) => {
    const id = newId('phab');
    const neu: PflichtenheftAbschnitt = {
      id,
      art,
      ebene: art === 'text' ? 1 : 2,
      titel: art === 'text' ? 'Neues Kapitel' : 'Ansprechpartner',
      text: '',
      funktionen: [],
      kontaktIds: [],
    };
    // Vor das Anlagenverzeichnis, das am Ende bleibt
    aendern((p) => {
      const anlagen = p.abschnitte.findIndex((a) => a.art === 'anlagen');
      const liste = [...p.abschnitte];
      liste.splice(anlagen < 0 ? liste.length : anlagen, 0, neu);
      return { ...p, abschnitte: liste };
    });
    setOffen(id);
  };

  return (
    <Card>
      <CardHeader
        titel="Kapitel"
        sub="Nummern entstehen aus der Reihenfolge – Ansprechpartner aus den Funktionen des Projekts"
        actions={
          <div className="row wrap" style={{ gap: 6 }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => hinzufuegen('text')}>
              <Icon name="plus" size={13} /> Kapitel
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => hinzufuegen('ansprechpartner')}>
              <Icon name="plus" size={13} /> Ansprechpartner
            </button>
          </div>
        }
      />
      <div className="phe-kapitel-liste">
        <AnimatePresence initial={false}>
          {ph.abschnitte.map((a, i) => {
            const ist = offen === a.id;
            return (
              <motion.div key={a.id} {...listenEintrag} className={`phe-kapitel ${ist ? 'offen' : ''} ebene${a.ebene}`}>
                <div className="phe-kapitel-kopf">
                  <button
                    type="button"
                    className="phe-kapitel-titel"
                    aria-expanded={ist}
                    onClick={() => setOffen(ist ? null : a.id)}
                  >
                    <span className="phe-nr num">{nummern.get(a.id)}</span>
                    <span className="truncate">{a.titel || 'Ohne Titel'}</span>
                    {a.art !== 'text' ? <Badge ton="blue">{ART_LABEL[a.art]}</Badge> : null}
                  </button>
                  <div className="row" style={{ gap: 2 }}>
                    <button type="button" className="btn-icon" disabled={i === 0} onClick={() => verschieben(a.id, -1)} aria-label={`„${a.titel}“ nach oben`} title="Nach oben">
                      <Icon name="hoch" size={14} />
                    </button>
                    <button
                      type="button"
                      className="btn-icon"
                      disabled={i === ph.abschnitte.length - 1}
                      onClick={() => verschieben(a.id, 1)}
                      aria-label={`„${a.titel}“ nach unten`}
                      title="Nach unten"
                    >
                      <Icon name="runter" size={14} />
                    </button>
                    <button type="button" className="btn-icon" onClick={() => setLoeschen(a)} aria-label={`„${a.titel}“ entfernen`} title="Entfernen">
                      <Icon name="loeschen" size={14} />
                    </button>
                  </div>
                </div>
                {ist ? (
                  <AbschnittEditor
                    project={project}
                    ph={ph}
                    abschnitt={a}
                    aendern={(patch) => abschnittAendern(a.id, patch)}
                    aendernPh={aendern}
                    bausteine={bausteine}
                    gotoTab={gotoTab}
                  />
                ) : null}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      <GewerkNamen ph={ph} aendern={aendern} />
      {loeschen ? (
        <ConfirmDialog
          titel="Abschnitt entfernen?"
          text={`„${loeschen.titel}“ wird aus dem Pflichtenheft entfernt; die Nummern der folgenden Kapitel rücken auf.`}
          bestaetigenLabel="Entfernen"
          onConfirm={() => aendern((p) => ({ ...p, abschnitte: p.abschnitte.filter((x) => x.id !== loeschen.id) }))}
          onClose={() => setLoeschen(null)}
        />
      ) : null}
    </Card>
  );
}

function AbschnittEditor({
  project,
  ph,
  abschnitt: a,
  aendern,
  aendernPh,
  bausteine,
  gotoTab,
}: {
  project: Project;
  ph: Pflichtenheft;
  abschnitt: PflichtenheftAbschnitt;
  aendern: (patch: Partial<PflichtenheftAbschnitt>) => void;
  aendernPh: (fn: (p: Pflichtenheft) => Pflichtenheft) => void;
  bausteine: BausteinVerzeichnis;
  gotoTab: (t: ProjektTab) => void;
}) {
  const { data } = useStore();
  const funktionen = [...new Set(data.roles.filter((r) => r.projectId === project.id).map((r) => r.name))].sort((x, y) =>
    x.localeCompare(y, 'de'),
  );
  const unbekannt = a.funktionen.filter((f) => !funktionen.some((n) => n.toLowerCase() === f.toLowerCase()));

  return (
    <div className="phe-abschnitt stack">
      <div className="form-grid">
        <Field label="Titel">
          <EntwurfFeld wert={a.titel} onChange={(v) => aendern({ titel: v })} />
        </Field>
        <Field label="Gliederung">
          <Segmented<'1' | '2'>
            value={String(a.ebene) as '1' | '2'}
            onChange={(v) => aendern({ ebene: v === '2' ? 2 : 1 })}
            options={[
              { value: '1', label: 'Kapitel' },
              { value: '2', label: 'Unterkapitel' },
            ]}
          />
        </Field>
      </div>

      <Field label={a.art === 'text' ? 'Text' : 'Text vor der Aufstellung (optional)'} full>
        <PlatzhalterText wert={a.text} onChange={(v) => aendern({ text: v })} bausteine={bausteine} label={a.titel || 'Text'} zeilen={a.art === 'text' ? 8 : 3} />
      </Field>

      {a.art === 'ansprechpartner' ? (
        <>
          <Field label="Funktionen (in allen Gewerken)" full>
            <div className="row wrap" style={{ gap: 6 }}>
              {[...funktionen, ...unbekannt].map((f) => {
                const an = a.funktionen.some((x) => x.toLowerCase() === f.toLowerCase());
                return (
                  <button
                    key={f}
                    type="button"
                    className={`phe-chip ${an ? 'an' : ''}`}
                    aria-pressed={an}
                    onClick={() =>
                      aendern({
                        funktionen: an ? a.funktionen.filter((x) => x.toLowerCase() !== f.toLowerCase()) : [...a.funktionen, f],
                      })
                    }
                    title={unbekannt.includes(f) ? 'Im Projekt gibt es keine Funktion dieser Bezeichnung' : undefined}
                  >
                    {an ? <Icon name="check" size={12} /> : null}
                    {f}
                  </button>
                );
              })}
            </div>
          </Field>
          <AnsprechpartnerVorschau project={project} ph={ph} abschnitt={a} aendernPh={aendernPh} gotoTab={gotoTab} />
        </>
      ) : null}

      {a.art === 'plm' ? <PlmAuswahl project={project} abschnitt={a} aendern={aendern} /> : null}

      {a.art === 'anlagen' ? (
        <p className="small muted">Das Verzeichnis entsteht aus den Anlagen: Planläufe (je gewähltem Workflow), Plancodierung und Änderungsindex.</p>
      ) : null}
    </div>
  );
}

function AnsprechpartnerVorschau({
  project,
  ph,
  abschnitt,
  aendernPh,
  gotoTab,
}: {
  project: Project;
  ph: Pflichtenheft;
  abschnitt: PflichtenheftAbschnitt;
  aendernPh: (fn: (p: Pflichtenheft) => Pflichtenheft) => void;
  gotoTab: (t: ProjektTab) => void;
}) {
  const { data } = useStore();
  const { zeilen, offen } = ansprechpartnerZeilen(data, project, abschnitt, ph);
  return (
    <div className="stack" style={{ gap: 8 }}>
      {zeilen.length === 0 ? (
        <p className="small muted">Keine Person füllt eine der gewählten Funktionen aus.</p>
      ) : (
        <div className="phe-zeilen">
          {zeilen.map((z) => (
            <div key={z.schluessel} className="phe-zeile">
              <EntwurfFeld
                wert={ph.zeilenNamen[z.schluessel] ?? ''}
                onChange={(v) =>
                  aendernPh((p) => {
                    const namen = { ...p.zeilenNamen };
                    if (v.trim()) namen[z.schluessel] = v;
                    else delete namen[z.schluessel];
                    return { ...p, zeilenNamen: namen };
                  })
                }
                placeholder={z.vorgabe}
                aria-label={`Bezeichnung der Zeile ${z.vorgabe}`}
              />
              <div className="small">
                {z.kontakte.map((c) => (
                  <div key={c.id}>
                    <strong>{`${c.vorname} ${c.nachname}`.trim() || c.firma}</strong>
                    {c.firma ? <span className="muted">, {c.firma}</span> : null}
                    {c.oe ? <span className="muted">, {c.oe}</span> : null}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {offen.length > 0 ? (
        <Callout icon="!" ton="warn">
          Ohne Person (erscheinen nicht im Pflichtenheft): {offen.join(', ')}.{' '}
          <button type="button" className="link-btn phe-link" onClick={() => gotoTab('rollen')}>
            Zu den Funktionen
          </button>
        </Callout>
      ) : null}
    </div>
  );
}

function PlmAuswahl({
  project,
  abschnitt: a,
  aendern,
}: {
  project: Project;
  abschnitt: PflichtenheftAbschnitt;
  aendern: (patch: Partial<PflichtenheftAbschnitt>) => void;
}) {
  const { data } = useStore();
  const eigen = eigenerKontakt(data, project);
  const andere = data.contacts
    .filter((c) => c.projectId === project.id && !c.eigen)
    .sort((x, y) => `${x.nachname} ${x.vorname}`.localeCompare(`${y.nachname} ${y.vorname}`, 'de'));
  return (
    <Field label="Personen" full hint="Die angemeldete Person steht immer zuerst; dazu etwa die Vertretung.">
      <div className="stack" style={{ gap: 6 }}>
        <div className="small">
          <strong>{eigen ? `${eigen.vorname} ${eigen.nachname}`.trim() : 'Angemeldete Person'}</strong>
          <span className="muted"> – angemeldet{eigen?.firma ? `, ${eigen.firma}` : ''}</span>
        </div>
        <div className="row wrap" style={{ gap: 6 }}>
          {andere.map((c) => {
            const an = a.kontaktIds.includes(c.id);
            const rollen = data.roles.filter((r) => c.zuordnungen.some((z) => z.roleId === r.id)).map(funktionsName);
            return (
              <button
                key={c.id}
                type="button"
                className={`phe-chip ${an ? 'an' : ''}`}
                aria-pressed={an}
                title={rollen.join(', ') || undefined}
                onClick={() => aendern({ kontaktIds: an ? a.kontaktIds.filter((x) => x !== c.id) : [...a.kontaktIds, c.id] })}
              >
                {an ? <Icon name="check" size={12} /> : null}
                {`${c.vorname} ${c.nachname}`.trim() || c.firma}
              </button>
            );
          })}
        </div>
      </div>
    </Field>
  );
}

function GewerkNamen({ ph, aendern }: { ph: Pflichtenheft; aendern: (fn: (p: Pflichtenheft) => Pflichtenheft) => void }) {
  const { data } = useStore();
  return (
    <div className="card-pad phe-gewerke">
      <h3 className="phe-unterueberschrift">Bezeichnung der Gewerke</h3>
      <p className="small muted">So heißen die Gewerke in den Ansprechpartnern; einzelne Zeilen lassen sich im Kapitel abweichend benennen.</p>
      <div className="phe-gewerke-raster">
        {data.gewerke.map((g) => (
          <label key={g} className="phe-gewerk">
            <span className="phe-gewerk-kuerzel">{g}</span>
            <EntwurfFeld
              wert={ph.gewerkNamen[g] ?? ''}
              onChange={(v) =>
                aendern((p) => {
                  const namen = { ...p.gewerkNamen };
                  if (v.trim()) namen[g] = v;
                  else delete namen[g];
                  return { ...p, gewerkNamen: namen };
                })
              }
              placeholder={g}
            />
          </label>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Anlage Planläufe                                                    */
/* ------------------------------------------------------------------ */

function AnlagenKarte({ project, ph, aendern, bausteine }: KartenProps) {
  const { data } = useStore();
  const verfuegbar = data.templates
    .filter((t) => (t.projectId === null || t.projectId === project.id) && !ph.workflows.some((w) => w.workflowId === t.id))
    .sort((x, y) => Number(x.projectId === null) - Number(y.projectId === null) || x.name.localeCompare(y.name, 'de'));
  const setzen = (workflows: Pflichtenheft['workflows']) => aendern((p) => ({ ...p, workflows }));
  const verschieben = (i: number, r: -1 | 1) => {
    const liste = [...ph.workflows];
    [liste[i], liste[i + r]] = [liste[i + r], liste[i]];
    setzen(liste);
  };

  return (
    <Card>
      <CardHeader titel="Planläufe und Ablaufdiagramme" sub="Je Workflow eine Anlage mit dem Ablaufdiagramm – Fristen aus dem Workflow" />
      <div className="card-pad stack">
        {ph.workflows.length === 0 ? <p className="small muted">Noch kein Workflow gewählt.</p> : null}
        <div className="phe-workflows">
          <AnimatePresence initial={false}>
            {ph.workflows.map((w, i) => {
              const t = data.templates.find((x) => x.id === w.workflowId);
              return (
                <motion.div key={w.workflowId} {...listenEintrag} className="phe-workflow">
                  <span className="phe-nr num">{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <EntwurfFeld
                      wert={w.titel}
                      onChange={(v) => setzen(ph.workflows.map((x) => (x.workflowId === w.workflowId ? { ...x, titel: v } : x)))}
                      aria-label={`Titel der Anlage ${i + 1}`}
                    />
                    <div className="small tertiary">
                      {t ? `Workflow „${t.name}“${t.projectId ? ' (Projekt)' : ''} · ${t.steps.length} Schritte` : 'Workflow nicht mehr vorhanden – erscheint nicht im Pflichtenheft'}
                    </div>
                  </div>
                  <div className="row" style={{ gap: 2 }}>
                    <button type="button" className="btn-icon" disabled={i === 0} onClick={() => verschieben(i, -1)} aria-label="Nach oben" title="Nach oben">
                      <Icon name="hoch" size={14} />
                    </button>
                    <button
                      type="button"
                      className="btn-icon"
                      disabled={i === ph.workflows.length - 1}
                      onClick={() => verschieben(i, 1)}
                      aria-label="Nach unten"
                      title="Nach unten"
                    >
                      <Icon name="runter" size={14} />
                    </button>
                    <button
                      type="button"
                      className="btn-icon"
                      onClick={() => setzen(ph.workflows.filter((x) => x.workflowId !== w.workflowId))}
                      aria-label={`„${w.titel}“ entfernen`}
                      title="Entfernen"
                    >
                      <Icon name="loeschen" size={14} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
        {verfuegbar.length > 0 ? (
          <div className="row wrap" style={{ gap: 8 }}>
            <select
              className="select"
              value=""
              aria-label="Workflow hinzufügen"
              onChange={(e) => {
                const t = data.templates.find((x) => x.id === e.target.value);
                if (t) setzen([...ph.workflows, { workflowId: t.id, titel: t.name }]);
              }}
              style={{ maxWidth: 360 }}
            >
              <option value="">Workflow hinzufügen …</option>
              {verfuegbar.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {t.projectId ? ' (Projekt)' : ''}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <Field label="Hinweis unter jedem Ablaufdiagramm" full>
          <PlatzhalterText
            wert={ph.workflowHinweis}
            onChange={(v) => aendern((p) => ({ ...p, workflowHinweis: v }))}
            bausteine={bausteine}
            label="Hinweis unter jedem Ablaufdiagramm"
            zeilen={4}
            leiste={false}
          />
        </Field>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Änderungsindex                                                      */
/* ------------------------------------------------------------------ */

function AenderungsKarte({ ph, aendern }: { ph: Pflichtenheft; aendern: (fn: (p: Pflichtenheft) => Pflichtenheft) => void }) {
  const eintragAendern = (id: string, patch: Partial<Pflichtenheft['aenderungen'][number]>) =>
    aendern((p) => ({ ...p, aenderungen: p.aenderungen.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
  return (
    <Card>
      <CardHeader
        titel="Änderungsindex"
        sub="Jüngste Änderung zuerst – ihr Datum steht unter „Zuletzt geändert“"
        actions={
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => aendern((p) => ({ ...p, aenderungen: [{ id: newId('phaen'), datum: today(), stelle: '', text: '' }, ...p.aenderungen] }))}
          >
            <Icon name="plus" size={13} /> Änderung
          </button>
        }
      />
      <div className="card-pad">
        {ph.aenderungen.length === 0 ? (
          <p className="small muted">Noch keine Änderung eingetragen.</p>
        ) : (
          <div className="phe-aenderungen">
            <AnimatePresence initial={false}>
              {ph.aenderungen.map((x) => (
                <motion.div key={x.id} {...listenEintrag} className="phe-aenderung">
                  <TextInput type="date" value={x.datum} onChange={(v) => eintragAendern(x.id, { datum: v })} aria-label="Datum" />
                  <EntwurfFeld wert={x.stelle} onChange={(v) => eintragAendern(x.id, { stelle: v })} placeholder="S. 5 / Kap. 5.4" aria-label="Seite bzw. Anlage" />
                  <EntwurfFeld wert={x.text} onChange={(v) => eintragAendern(x.id, { text: v })} placeholder="Änderung" aria-label="Änderung" />
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={() => aendern((p) => ({ ...p, aenderungen: p.aenderungen.filter((y) => y.id !== x.id) }))}
                    aria-label="Eintrag entfernen"
                    title="Entfernen"
                  >
                    <Icon name="loeschen" size={14} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </Card>
  );
}
