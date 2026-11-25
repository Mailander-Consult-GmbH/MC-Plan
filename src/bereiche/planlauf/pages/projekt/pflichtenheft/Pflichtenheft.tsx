/**
 * Reiter „Pflichtenheft“ im Projekt: Ein Assistent (`PflichtenheftAssistent`)
 * erstellt das Pflichtenheft aus der Vorlage des Geschäftsbereichs; danach
 * lassen sich Deckblatt, Kapitel und Anlagen bearbeiten. „Als PDF ausgeben“
 * vermerkt die Ausgabe (`AusgabeDialog`) – „Zuletzt geändert“ und der
 * Änderungsindex entstehen daraus, nicht von Hand.
 * Ansprechpartner kommen aus den Funktionen des Projekts (Reiter „Funktion“),
 * Projekt- und Stammdaten aus den Einstellungen des Projekts; im Text stehen
 * sie als farbige Platzhalter. „Vorschau“ zeigt das Dokument so, wie es
 * gedruckt wird; „Als PDF ausgeben“ öffnet den Druckdialog (domain/pflichtenheft.ts).
 *
 * Längere Eingaben speichert die Seite verzögert (`useEntwurf`), damit nicht
 * jeder Tastendruck den ganzen Bestand schreibt.
 */
import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  PFLICHTENHEFT_STIL,
  aenderungenErmitteln,
  ansprechpartnerZeilen,
  eigenerKontakt,
  kapitelNummern,
  letzteAenderung,
  pflichtenheftAufbereiten,
  pflichtenheftHtml,
  pflichtenheftStand,
  platzhalterWerte,
  unterschriftVorgabe,
  unterschriftWert,
  UNTERSCHRIFT_LABEL,
  verwendeteWorkflows,
  waehlbareWorkflows,
} from '../../../domain/pflichtenheft';
import {
  GESCHAEFTSBEREICHE,
  funktionsName,
  geschaeftsbereichVon,
  leereStammdaten,
  type Pflichtenheft,
  type PflichtenheftAbschnitt,
  type PflichtenheftArt,
  type Project,
} from '../../../domain/types';
import type { ProjektTab } from '../../../lib/router';
import { newId, useStore } from '../../../store/store';
import { htmlDokument, querformatImDruck } from '../../../../../shared/print';
import { useToast } from '../../../../../shared/toast';
import { Icon } from '../../../../../shared/icons';
import { listenEintrag } from '../../../../../shared/bewegung';
import { formatDate } from '../../../../../shared/dates';
import type { BausteinVerzeichnis } from '../../../../../shared/bausteinEditor';
import { Badge, Callout, Card, CardHeader, ConfirmDialog, EmptyState, Field, Segmented } from '../../../../../shared/ui';
import { PlancodierungKarte } from './PlancodierungKarte';
import { PflichtenheftAssistent } from './Assistent';
import { AusgabeDialog } from './AusgabeDialog';
import { ART_LABEL, BildWahl, EntwurfFeld, PlatzhalterText, UnterschriftFelder, usePlatzhalterBausteine } from './bausteine';
import './pflichtenheft.css';

type Ansicht = 'bearbeiten' | 'vorschau';

export function PflichtenheftSeite({ project, gotoTab }: { project: Project; gotoTab: (t: ProjektTab) => void }) {
  const { data, pflichtenheftAendern, pflichtenheftVorlageSpeichern } = useStore();
  const toast = useToast();
  const [ansicht, setAnsicht] = useState<Ansicht>('bearbeiten');
  const [assistent, setAssistent] = useState<'neu' | 'ersetzen' | null>(null);
  const [ausgabe, setAusgabe] = useState(false);
  const ph = useMemo(() => (project.pflichtenheft ? pflichtenheftAufbereiten(project.pflichtenheft) : null), [project.pflichtenheft]);
  const aendern = (fn: (p: Pflichtenheft) => Pflichtenheft) => pflichtenheftAendern(project.id, fn);

  const werte = useMemo(() => (ph ? platzhalterWerte(data, project, ph) : {}), [data, project, ph]);
  const bausteine = usePlatzhalterBausteine(werte);
  const gb = GESCHAEFTSBEREICHE.find((g) => g.id === geschaeftsbereichVon(project.stammdaten?.geschaeftsbereich ?? ''))!;

  if (!ph) {
    return (
      <>
        <Card>
          <EmptyState
            icon="pflichtenheft"
            titel="Noch kein Pflichtenheft"
            text="Ein Assistent führt in wenigen Schritten durch das Erstellen – Geschäftsbereich, Stammdaten, Deckblatt, Ansprechpartner und Planläufe, vorausgefüllt aus dem Projekt. Texte und Anlagen lassen sich danach hier anpassen."
            action={
              <button type="button" className="btn btn-primary" onClick={() => setAssistent('neu')}>
                <Icon name="plus" size={14} /> Pflichtenheft erstellen
              </button>
            }
          />
        </Card>
        {assistent ? <PflichtenheftAssistent project={project} onClose={() => setAssistent(null)} /> : null}
      </>
    );
  }

  const s = { ...leereStammdaten(), ...project.stammdaten };
  const fehlend = [
    !project.gNummer.trim() ? 'Projektnummer DB' : '',
    gb.station && !s.station.trim() ? 'Station' : '',
    !s.planungsphase.trim() ? 'Planungsphase' : '',
    !s.auftraggeber.trim() ? 'Auftraggeber' : '',
    !s.strecken.length ? 'Strecken' : '',
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
          <button type="button" className="btn btn-ghost" onClick={() => setAssistent('ersetzen')}>
            Neu aus Vorlage
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => {
              pflichtenheftVorlageSpeichern(project.id);
              toast(`Als Vorlage für neue Pflichtenhefte (${gb.label}) gespeichert.`);
            }}
            title={`Titel, Deckblatt, Kapitel, Texte, Gewerke, Hinweis der Ablaufdiagramme und Plancodierung gelten danach für jedes neu erstellte Pflichtenheft im Geschäftsbereich ${gb.label}`}
          >
            Als Vorlage speichern
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setAusgabe(true)}>
            <Icon name="drucken" size={14} /> Als PDF ausgeben
          </button>
        </div>
      </div>

      {!querformatImDruck() ? (
        <Callout icon="!" ton="warn">
          Dieser Browser kann im Druck nicht zwischen Hoch- und Querformat wechseln – Ablaufdiagramme und Plancodierung
          stünden im Hochformat. Für die PDF-Ausgabe bitte Microsoft Edge oder Google Chrome verwenden.
        </Callout>
      ) : null}

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
          <AusgabenKarte project={project} ph={ph} aendern={aendern} />
        </>
      )}

      {assistent ? <PflichtenheftAssistent project={project} ersetzen onClose={() => setAssistent(null)} /> : null}
      {ausgabe ? <AusgabeDialog project={project} ph={ph} onClose={() => setAusgabe(false)} /> : null}
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
  const geaendert = unterschriftWert(data, project, ph, 'geaendert');
  return (
    <Card>
      <CardHeader titel="Deckblatt" sub="Titel, Text, Bild und Unterschriften – leere Felder füllt KaPlan aus den Kontakten" />
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
        <Field label="Text unter dem Titel" full>
          <PlatzhalterText
            wert={ph.deckblatt}
            onChange={(v) => aendern((p) => ({ ...p, deckblatt: v }))}
            bausteine={bausteine}
            label="Text unter dem Titel"
            zeilen={4}
          />
        </Field>
        <div className="field">
          <label>Bild</label>
          <BildWahl wert={ph.titelbild} onChange={(url) => aendern((p) => ({ ...p, titelbild: url }))} />
        </div>
        {(['aufgestellt', 'freigegeben'] as const).map((art) => (
          <UnterschriftFelder
            key={art}
            label={UNTERSCHRIFT_LABEL[art]}
            wert={ph[art]}
            vorgabe={unterschriftVorgabe(data, project, ph, art)}
            onChange={(patch) => aendern((p) => ({ ...p, [art]: { ...p[art], ...patch } }))}
          />
        ))}
        <div className="phe-unterschrift">
          <div className="phe-unterschrift-titel">{UNTERSCHRIFT_LABEL.geaendert}</div>
          <div className="small muted">
            {letzteAenderung(ph)
              ? `${[geaendert.ort, geaendert.datum ? formatDate(geaendert.datum) : ''].filter(Boolean).join(', ')} · ${geaendert.funktion} · ${geaendert.name}`
              : 'Erscheint, sobald das Pflichtenheft nach Änderungen erneut ausgegeben wird.'}
          </div>
        </div>
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
  const verwendet = new Set(verwendeteWorkflows(data, project).map((t) => t.id));
  const gewaehlt = new Set(ph.workflows.map((w) => w.workflowId));
  const nichtGewaehlt = waehlbareWorkflows(data, project).filter((t) => !gewaehlt.has(t.id));
  const setzen = (workflows: Pflichtenheft['workflows']) => aendern((p) => ({ ...p, workflows }));
  const verschieben = (i: number, r: -1 | 1) => {
    const liste = [...ph.workflows];
    [liste[i], liste[i + r]] = [liste[i + r], liste[i]];
    setzen(liste);
  };
  const herkunft = (id: string) => {
    const t = data.templates.find((x) => x.id === id);
    if (!t) return 'Workflow nicht mehr vorhanden – erscheint nicht im Pflichtenheft';
    return [t.projectId ? 'Projektvariante' : 'projektübergreifend', verwendet.has(t.id) ? 'im Projekt verwendet' : '', `${t.steps.length} Schritte`]
      .filter(Boolean)
      .join(' · ');
  };

  return (
    <Card>
      <CardHeader
        titel="Planläufe und Ablaufdiagramme"
        sub="Per Klick in das Pflichtenheft aufnehmen – je Workflow eine Anlage mit dem Ablaufdiagramm"
      />
      <div className="card-pad stack">
        <div className="phe-workflows">
          <AnimatePresence initial={false}>
            {ph.workflows.map((w, i) => (
              <motion.div key={w.workflowId} {...listenEintrag} className="phe-workflow an">
                <input
                  type="checkbox"
                  className="phe-wf-haken"
                  checked
                  onChange={() => setzen(ph.workflows.filter((x) => x.workflowId !== w.workflowId))}
                  aria-label={`„${w.titel}“ aus dem Pflichtenheft nehmen`}
                />
                <span className="phe-nr num">{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <EntwurfFeld
                    wert={w.titel}
                    onChange={(v) => setzen(ph.workflows.map((x) => (x.workflowId === w.workflowId ? { ...x, titel: v } : x)))}
                    aria-label={`Titel der Anlage ${i + 1}`}
                  />
                  <div className="small tertiary">{herkunft(w.workflowId)}</div>
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
                </div>
              </motion.div>
            ))}
            {nichtGewaehlt.map((t) => (
              <motion.label key={t.id} {...listenEintrag} className="phe-workflow aus">
                <input
                  type="checkbox"
                  className="phe-wf-haken"
                  checked={false}
                  onChange={() => setzen([...ph.workflows, { workflowId: t.id, titel: t.name }])}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="truncate">{t.name}</div>
                  <div className="small tertiary">{herkunft(t.id)}</div>
                </div>
              </motion.label>
            ))}
          </AnimatePresence>
        </div>
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
/* Ausgaben und Änderungsindex                                         */
/* ------------------------------------------------------------------ */

function AusgabenKarte({
  project,
  ph,
  aendern,
}: {
  project: Project;
  ph: Pflichtenheft;
  aendern: (fn: (p: Pflichtenheft) => Pflichtenheft) => void;
}) {
  const { data } = useStore();
  const offen = ph.stand ? aenderungenErmitteln(ph.stand, pflichtenheftStand(data, project, ph)) : [];
  const eintragAendern = (ausgabeId: string, id: string, text: string | null) =>
    aendern((p) => ({
      ...p,
      ausgaben: p.ausgaben.map((a) =>
        a.id !== ausgabeId
          ? a
          : {
              ...a,
              aenderungen:
                text === null ? a.aenderungen.filter((x) => x.id !== id) : a.aenderungen.map((x) => (x.id === id ? { ...x, text } : x)),
            },
      ),
    }));
  const letzte = ph.ausgaben[ph.ausgaben.length - 1];

  return (
    <Card>
      <CardHeader
        titel="Ausgaben und Änderungsindex"
        sub="KaPlan vermerkt jede Ausgabe und erkennt, was sich seit der letzten geändert hat"
      />
      <div className="card-pad stack">
        {ph.ausgaben.length === 0 ? (
          <Callout icon="i">Noch nicht ausgegeben. Die erste Ausgabe über „Als PDF ausgeben“ gilt als Aufstellung.</Callout>
        ) : offen.length === 0 ? (
          <p className="small muted">Keine Änderungen seit der Ausgabe vom {formatDate(letzte.datum)}.</p>
        ) : (
          <Callout icon="!" ton="warn">
            Seit der Ausgabe vom {formatDate(letzte.datum)} geändert – wird bei der nächsten Ausgabe vermerkt:
            <ul className="phe-offen">
              {offen.map((x, i) => (
                <li key={i}>
                  <span className="phe-stelle">{x.stelle}</span> {x.text}
                </li>
              ))}
            </ul>
          </Callout>
        )}
        {[...ph.ausgaben].reverse().map((a, i) => {
          const nr = ph.ausgaben.length - i;
          return (
            <div key={a.id} className="phe-ausgabe">
              <div className="phe-ausgabe-kopf">
                <strong>{nr === 1 ? 'Aufgestellt' : `Ausgabe ${nr}`}</strong>
                <span className="small muted">
                  {formatDate(a.datum)}
                  {a.von ? ` · ${a.von}` : ''}
                </span>
              </div>
              {nr === 1 ? null : a.aenderungen.length === 0 ? (
                <p className="small tertiary">Keine Einträge.</p>
              ) : (
                <div className="phe-aenderungen">
                  {a.aenderungen.map((x) => (
                    <div key={x.id} className="phe-aenderung">
                      <span className="phe-stelle">{x.stelle}</span>
                      <EntwurfFeld wert={x.text} onChange={(v) => eintragAendern(a.id, x.id, v)} aria-label={`Änderung ${x.stelle}`} />
                      <button
                        type="button"
                        className="btn-icon"
                        onClick={() => eintragAendern(a.id, x.id, null)}
                        aria-label={`Eintrag „${x.text}“ entfernen`}
                        title="Aus dem Änderungsindex entfernen"
                      >
                        <Icon name="loeschen" size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
