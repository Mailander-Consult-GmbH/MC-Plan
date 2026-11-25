/**
 * Eigene To-Do-Liste: schlichte Aufgaben für sich selbst, auf Wunsch mit
 * Projekt und Termin, als wichtig markiert (Stern) und in eigener Reihenfolge.
 * `TodoListe` steht als Seite „To-Do-Liste“ in der Seitenleiste – je Projekt
 * eine Karte, wie die Phasen in der Baubetriebsplanung, dazu „Ohne Projekt“ –
 * und als Reiter „To-Dos“ im Projekt (nur dessen Karte). Neue Aufgaben werden
 * unter den vorhandenen eingetragen, als schriebe man die Liste fort; ein
 * Klick auf eine Zeile öffnet sie zum Bearbeiten. Erledigt wird mit dem
 * kleinen Haken des Planlaufmanagements (`ErledigtHaken`), daneben löscht der
 * Papierkorb eine erledigte Aufgabe sofort, „Erledigte löschen“ im Filter
 * „Erledigt“ alle der Ansicht nach Rückfrage; eine Zeile, die
 * damit oder mit dem Stern die Auswahl verlässt, bleibt noch kurz stehen
 * (`useNachlauf`), Zeilen und Karten kommen, gehen und gleiten an ihren Platz
 * (`listenEintrag`). Die Übersicht zählt die offenen, überfälligen und
 * demnächst fälligen Aufgaben; ihre Kacheln öffnen die Liste mit passendem
 * Filter (`startFilter` aus der Adresse).
 */
import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Aufspringen, listenEintrag } from '../../../shared/bewegung';
import { formatDate, relativeLabel, today } from '../../../shared/dates';
import { Icon } from '../../../shared/icons';
import { useToast } from '../../../shared/toast';
import {
  Card,
  CardHeader,
  ConfirmDialog,
  EmptyState,
  Field,
  Modal,
  Search,
  Segmented,
  TextArea,
  TextInput,
  alsKlickZeile,
  beiEnter,
} from '../../../shared/ui';
import { useArchivierte } from '../../../gemeinsam/ProjektBereiche';
import { AmpelBadge } from '../components/common';
import { ErledigtHaken, useNachlauf } from '../components/erledigen';
import type { ID, Projekt, Todo } from '../domain/types';
import { projektDes, todoAmpel, zeitkritisch } from '../domain/todos';
import type { Route, TodoFilter } from '../lib/router';
import { useStore } from '../store/store';

type Filter = TodoFilter;

/** Wert der Projektauswahl für Aufgaben ohne Projekt. */
const OHNE = 'ohne';

const projektText = (p: Projekt) => [p.nummer, p.name].filter(Boolean).join(' ');
const nachProjekt = (a: Projekt, b: Projekt) => projektText(a).localeCompare(projektText(b), 'de');

/**
 * Projekte zur Auswahl: die nicht archivierten, nach Nummer und Name; ein
 * archiviertes nur, wenn die Aufgabe ihm schon zugeordnet ist.
 */
function auswahlProjekte(projekte: Projekt[], archiviert: Set<string>, aktuell: ID | null): Projekt[] {
  return projekte.filter((p) => !archiviert.has(p.id) || p.id === aktuell).sort(nachProjekt);
}

function ProjektWahl({
  wert,
  projekte,
  archiviert,
  onChange,
  label,
}: {
  wert: ID | null;
  projekte: Projekt[];
  archiviert: Set<string>;
  onChange: (id: ID | null) => void;
  label: string;
}) {
  return (
    <select className="select" value={wert ?? ''} onChange={(e) => onChange(e.target.value || null)} aria-label={label}>
      <option value="">ohne Projekt</option>
      {auswahlProjekte(projekte, archiviert, wert).map((p) => (
        <option key={p.id} value={p.id}>
          {projektText(p)}
          {archiviert.has(p.id) ? ' (archiviert)' : ''}
        </option>
      ))}
    </select>
  );
}

const fertig = (t: Todo) => t.status === 'erledigt';

export function TodoListe({
  projekt,
  startFilter,
  navigate,
}: {
  projekt?: Projekt;
  /** Filter beim Öffnen – aus der Adresse (`#/projektsteuerung/todos/faellig`); sonst „Offen“. */
  startFilter?: Filter;
  navigate?: (r: Route) => void;
}) {
  const { data, todoErledigen, updateTodo, deleteTodo, todosLoeschen } = useStore();
  const toast = useToast();
  const nachlauf = useNachlauf();
  const archiviert = useArchivierte('projektsteuerung');
  const [filter, setFilter] = useState<Filter>(startFilter ?? 'offen');
  const [projektFilter, setProjektFilter] = useState('');
  const [suche, setSuche] = useState('');
  // Projekte, deren (noch leere) Karte über „Aufgabe zu weiterem Projekt“ geöffnet wurde
  const [weitere, setWeitere] = useState<ID[]>([]);
  const [fokusGruppe, setFokusGruppe] = useState<string | null>(null);
  const [bearbeiten, setBearbeiten] = useState<ID | null>(null);
  const [aufraeumen, setAufraeumen] = useState(false);
  const heute = today();

  const projektVon = (t: Todo) => projektDes(t, data.projekte);
  // Im Projekt nur dessen Aufgaben; über alle Projekte nach der Projektauswahl
  const imBereich = data.todos.filter((t) => {
    const p = projektVon(t);
    if (projekt) return p?.id === projekt.id;
    if (projektFilter === OHNE) return !p;
    return !projektFilter || p?.id === projektFilter;
  });
  const begriff = suche.trim().toLowerCase();
  const gesucht = begriff
    ? imBereich.filter((t) =>
        [t.text, t.notiz, t.herkunft?.fundstelle ?? '', ((p) => (p ? projektText(p) : ''))(projektVon(t))]
          .join(' ')
          .toLowerCase()
          .includes(begriff),
      )
    : imBereich;
  // Eben erledigt oder umgestellt: bleibt noch kurz stehen, auch wenn sie nicht mehr passt
  const passt = (t: Todo) =>
    nachlauf.hat(t.id) ||
    (filter === 'offen'
      ? !fertig(t)
      : filter === 'wichtig'
        ? !fertig(t) && t.wichtig
        : filter === 'faellig'
          ? zeitkritisch(t, heute)
          : filter === 'erledigt'
            ? fertig(t)
            : true);
  const sichtbar = gesucht.filter(passt);
  const anzahl = {
    offen: gesucht.filter((t) => !fertig(t)).length,
    wichtig: gesucht.filter((t) => !fertig(t) && t.wichtig).length,
    faellig: gesucht.filter((t) => zeitkritisch(t, heute)).length,
    erledigt: gesucht.filter(fertig).length,
  };

  // Karten: im Projekt die eine; sonst je Projekt mit passenden Aufgaben (oder eben geöffnet),
  // nach Nummer und Name, zuletzt „Ohne Projekt“ – sie bleibt zum Eintragen stehen.
  type Gruppe = { schluessel: string; projekt: Projekt | null; todos: Todo[] };
  const gruppen: Gruppe[] = [];
  if (projekt) {
    gruppen.push({ schluessel: projekt.id, projekt, todos: sichtbar });
  } else {
    const ids = new Set([
      ...sichtbar.map((t) => projektVon(t)?.id).filter((id): id is ID => !!id),
      ...weitere.filter((id) => !projektFilter || projektFilter === id),
    ]);
    for (const p of data.projekte.filter((x) => ids.has(x.id)).sort(nachProjekt)) {
      gruppen.push({ schluessel: p.id, projekt: p, todos: sichtbar.filter((t) => projektVon(t)?.id === p.id) });
    }
    const ohne = sichtbar.filter((t) => !projektVon(t));
    if ((!projektFilter || projektFilter === OHNE) && (ohne.length > 0 || !begriff)) {
      gruppen.push({ schluessel: OHNE, projekt: null, todos: ohne });
    }
  }
  // Für „Aufgabe zu weiterem Projekt“: aktive Projekte ohne Karte
  const ohneKarte = projekt
    ? []
    : data.projekte.filter((p) => !archiviert.has(p.id) && !gruppen.some((g) => g.projekt?.id === p.id)).sort(nachProjekt);
  const mitAufgaben = data.projekte.filter((p) => data.todos.some((t) => t.projektId === p.id)).sort(nachProjekt);
  const zuBearbeiten = bearbeiten ? data.todos.find((t) => t.id === bearbeiten) : undefined;

  const erledigen = (t: Todo) => {
    const erledigt = !fertig(t);
    todoErledigen(t.id, erledigt);
    nachlauf.merken(t.id);
    toast(erledigt ? 'Als erledigt markiert.' : 'Wieder offen.');
  };
  const loeschen = (t: Todo) => {
    deleteTodo(t.id);
    toast('Aufgabe gelöscht.');
  };
  // Alle erledigten der Ansicht – nach Projekt (bzw. im Projekt-Reiter) und Suche
  const erledigte = gesucht.filter(fertig);
  const wichtigUmschalten = (t: Todo) => {
    updateTodo(t.id, { wichtig: !t.wichtig });
    nachlauf.merken(t.id);
  };

  return (
    <div className="stack">
      <div className="row-between wrap">
        <Segmented<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'offen', label: `Offen (${anzahl.offen})` },
            { value: 'wichtig', label: `Wichtig (${anzahl.wichtig})` },
            { value: 'faellig', label: `Fällig (${anzahl.faellig})` },
            { value: 'erledigt', label: `Erledigt (${anzahl.erledigt})` },
            { value: 'alle', label: `Alle (${gesucht.length})` },
          ]}
        />
        <div className="row wrap">
          {projekt ? null : (
            <select
              className="select w-auto"
              value={projektFilter}
              onChange={(e) => setProjektFilter(e.target.value)}
              aria-label="Nach Projekt filtern"
            >
              <option value="">Alle Projekte</option>
              <option value={OHNE}>Ohne Projekt</option>
              {mitAufgaben.map((p) => (
                <option key={p.id} value={p.id}>
                  {projektText(p)}
                </option>
              ))}
            </select>
          )}
          <Search value={suche} onChange={setSuche} placeholder="Aufgabe, Notiz …" />
        </div>
      </div>

      {/* Im Filter „Erledigt“: alle erledigten der Ansicht auf einmal löschen – in eigener Zeile,
          damit Projektauswahl und Suche nicht umbrechen */}
      {filter === 'erledigt' && erledigte.length > 0 ? (
        <div className="flex justify-end">
          <button type="button" className="btn btn-sm btn-danger" onClick={() => setAufraeumen(true)}>
            <Icon name="loeschen" size={14} /> Erledigte löschen
          </button>
        </div>
      ) : null}

      {begriff && gesucht.length === 0 ? (
        <Card>
          <EmptyState icon="suche" titel="Keine Aufgabe gefunden" text="Für diese Suche gibt es keinen Treffer." />
        </Card>
      ) : (
        <AnimatePresence initial={false}>
          {gruppen.map((g) => (
            <motion.div key={g.schluessel} {...listenEintrag}>
              <TodoGruppe
                projekt={g.projekt}
                imProjekt={!!projekt}
                todos={g.todos}
                alle={data.todos.filter((t) => (projektVon(t)?.id ?? null) === (g.projekt?.id ?? null))}
                filter={filter}
                leer={data.todos.length === 0}
                fokus={fokusGruppe === g.schluessel}
                heute={heute}
                navigate={navigate}
                onBearbeiten={setBearbeiten}
                onErledigen={erledigen}
                onWichtig={wichtigUmschalten}
                onLoeschen={loeschen}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      )}

      {ohneKarte.length > 0 && !begriff && filter !== 'erledigt' ? (
        <div className="row">
          <select
            className="select w-auto"
            value=""
            onChange={(e) => {
              const id = e.target.value;
              if (!id) return;
              setWeitere((w) => [...w, id]);
              setFokusGruppe(id);
            }}
            aria-label="Aufgabe zu weiterem Projekt"
          >
            <option value="">Aufgabe zu weiterem Projekt …</option>
            {ohneKarte.map((p) => (
              <option key={p.id} value={p.id}>
                {projektText(p)}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {zuBearbeiten ? <TodoDialog todo={zuBearbeiten} onClose={() => setBearbeiten(null)} /> : null}

      {aufraeumen ? (
        <ConfirmDialog
          titel="Erledigte Aufgaben löschen?"
          text={
            erledigte.length === 1
              ? 'Die erledigte Aufgabe dieser Ansicht wird aus der To-Do-Liste entfernt.'
              : `Die ${erledigte.length} erledigten Aufgaben dieser Ansicht werden aus der To-Do-Liste entfernt.`
          }
          onConfirm={() => {
            todosLoeschen(erledigte.map((t) => t.id));
            toast(erledigte.length === 1 ? 'Aufgabe gelöscht.' : `${erledigte.length} Aufgaben gelöscht.`);
          }}
          onClose={() => setAufraeumen(false)}
        />
      ) : null}
    </div>
  );
}

/**
 * Karte einer Gruppe: die Aufgaben in der Reihenfolge der Liste, darunter die
 * Zeile für eine neue Aufgabe dieser Gruppe.
 */
function TodoGruppe({
  projekt,
  imProjekt,
  todos,
  alle,
  filter,
  leer,
  fokus,
  heute,
  navigate,
  onBearbeiten,
  onErledigen,
  onWichtig,
  onLoeschen,
}: {
  projekt: Projekt | null;
  imProjekt: boolean;
  /** Sichtbare Aufgaben der Gruppe – Reihenfolge der Liste. */
  todos: Todo[];
  /** Alle Aufgaben der Gruppe, für die Zahlen im Kopf. */
  alle: Todo[];
  filter: Filter;
  /** Die Liste hat noch gar keine Aufgabe. */
  leer: boolean;
  fokus: boolean;
  heute: string;
  navigate?: (r: Route) => void;
  onBearbeiten: (id: ID) => void;
  onErledigen: (t: Todo) => void;
  onWichtig: (t: Todo) => void;
  /** Löscht eine erledigte Aufgabe sofort (Papierkorb neben dem Haken). */
  onLoeschen: (t: Todo) => void;
}) {
  const { data, addTodo, todosTauschen } = useStore();
  const toast = useToast();
  const [neu, setNeu] = useState({ text: '', termin: '' });
  const feld = useRef<HTMLInputElement>(null);

  const offen = alle.filter((t) => !fertig(t));
  const faellig = offen.filter((t) => zeitkritisch(t, heute)).length;
  const wichtig = offen.filter((t) => t.wichtig).length;
  const sub = [
    `${offen.length} offen`,
    faellig ? `${faellig} fällig` : '',
    wichtig ? `${wichtig} wichtig` : '',
  ]
    .filter(Boolean)
    .join(' · ');

  const hinzufuegen = () => {
    const text = neu.text.trim();
    if (!text) return;
    addTodo({ text, projektId: projekt?.id ?? null, termin: neu.termin, wichtig: filter === 'wichtig' });
    setNeu({ text: '', termin: '' });
    toast('Aufgabe aufgenommen.');
    feld.current?.focus();
  };

  return (
    <Card>
      <CardHeader
        titel={
          imProjekt ? (
            'To-Dos zum Projekt'
          ) : projekt ? (
            <>
              {projekt.nummer ? <span className="num tertiary">{projekt.nummer} </span> : null}
              {projekt.name}
            </>
          ) : (
            'Ohne Projekt'
          )
        }
        sub={sub}
      />
      {todos.length === 0 ? (
        <p className="card-pad small tertiary pt-0 pb-0">
          {leer ? 'Noch keine Aufgaben – tragen Sie unten ein, was zu tun ist.' : 'Nichts für diese Auswahl.'}
        </p>
      ) : (
        <div className="table-scroll">
          <table className="table table-stack ps-todos">
            <thead>
              <tr>
                <th className="text-center" style={{ width: 64 }}>
                  Wichtig
                </th>
                <th>Aufgabe</th>
                <th style={{ width: 140 }}>Fällig</th>
                <th style={{ width: 150 }}>Status</th>
                <th className="actions" style={{ width: 164 }}>
                  <span className="sr-only">Reihenfolge, erledigt und löschen</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {todos.map((t, i) => {
                  const quelle = t.herkunft ? data.protokolle.find((p) => p.id === t.herkunft!.protokollId) : undefined;
                  return (
                    <motion.tr
                      key={t.id}
                      {...listenEintrag}
                      className="clickable"
                      {...alsKlickZeile(() => onBearbeiten(t.id))}
                    >
                      <td className="text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className={`stern ${t.wichtig ? 'aktiv' : ''}`}
                          aria-pressed={t.wichtig}
                          title={t.wichtig ? 'Nicht mehr wichtig' : 'Als wichtig markieren'}
                          aria-label={`„${t.text}“ wichtig`}
                          onClick={() => onWichtig(t)}
                        >
                          <Aufspringen wert={t.wichtig}>
                            <Icon name="stern" size={16} />
                          </Aufspringen>
                        </button>
                      </td>
                      <td>
                        <div
                          className={`transition-colors duration-300 ${fertig(t) ? 'text-gedaempft line-through' : t.wichtig ? 'font-medium' : ''}`}
                        >
                          {t.text}
                        </div>
                        {t.notiz ? <div className="ps-zweizeilig small tertiary">{t.notiz}</div> : null}
                        {t.herkunft ? (
                          <div className="small tertiary">
                            aus{' '}
                            {quelle && navigate ? (
                              <button
                                type="button"
                                className="link-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate({ view: 'protokoll', projektId: quelle.projektId, protokollId: quelle.id });
                                }}
                              >
                                {t.herkunft.fundstelle}
                              </button>
                            ) : (
                              t.herkunft.fundstelle
                            )}
                          </div>
                        ) : null}
                      </td>
                      <td className="small">
                        {t.termin ? (
                          <>
                            {formatDate(t.termin)}
                            {fertig(t) ? null : <div className="tertiary small">{relativeLabel(t.termin)}</div>}
                          </>
                        ) : (
                          <span className="tertiary">ohne Termin</span>
                        )}
                      </td>
                      <td>
                        <AmpelBadge ampel={todoAmpel(t, heute)} />
                        {fertig(t) && t.erledigtAm ? (
                          <div className="tertiary small">am {formatDate(t.erledigtAm)}</div>
                        ) : null}
                      </td>
                      <td className="actions" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="btn-icon"
                          disabled={i === 0}
                          title="Nach oben"
                          aria-label={`„${t.text}“ nach oben`}
                          onClick={() => todosTauschen(t.id, todos[i - 1].id)}
                        >
                          <Icon name="hoch" size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn-icon"
                          disabled={i === todos.length - 1}
                          title="Nach unten"
                          aria-label={`„${t.text}“ nach unten`}
                          onClick={() => todosTauschen(t.id, todos[i + 1].id)}
                        >
                          <Icon name="runter" size={14} />
                        </button>
                        <ErledigtHaken erledigt={fertig(t)} text={t.text} onUmschalten={() => onErledigen(t)} />
                        {fertig(t) ? (
                          <button
                            type="button"
                            className="btn-icon ps-todo-loeschen"
                            title="Löschen"
                            aria-label={`„${t.text}“ löschen`}
                            onClick={() => onLoeschen(t)}
                          >
                            <Icon name="loeschen" size={14} />
                          </button>
                        ) : null}
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}
      {filter === 'erledigt' ? null : (
        // Ein Formular unter den Aufgaben: Die Eingabetaste nimmt die neue Aufgabe aus jedem Feld heraus auf
        <form
          className="card-pad flex flex-wrap items-center gap-2.5 pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            hinzufuegen();
          }}
        >
          <input
            ref={feld}
            className="input min-w-0 flex-[3_1_240px]"
            value={neu.text}
            onChange={(e) => setNeu((n) => ({ ...n, text: e.target.value }))}
            placeholder="Neue Aufgabe …"
            aria-label={projekt ? `Neue Aufgabe zu ${projektText(projekt)}` : 'Neue Aufgabe ohne Projekt'}
            autoFocus={fokus}
          />
          <input
            type="date"
            className="input w-auto flex-none"
            value={neu.termin}
            onChange={(e) => setNeu((n) => ({ ...n, termin: e.target.value }))}
            aria-label="Fällig am"
            title="Fällig am"
          />
          <button type="submit" className="btn btn-sm btn-outline" disabled={!neu.text.trim()}>
            <Icon name="plus" size={13} /> Hinzufügen
          </button>
        </form>
      )}
    </Card>
  );
}

/** Aufgabe bearbeiten: Text, Notiz, Projekt, Termin, wichtig, erledigt – und löschen. */
function TodoDialog({ todo, onClose }: { todo: Todo; onClose: () => void }) {
  const { data, updateTodo, todoErledigen, deleteTodo } = useStore();
  const toast = useToast();
  const archiviert = useArchivierte('projektsteuerung');
  const [form, setForm] = useState({
    text: todo.text,
    notiz: todo.notiz,
    projektId: todo.projektId,
    termin: todo.termin,
    wichtig: todo.wichtig,
    erledigt: todo.status === 'erledigt',
  });
  const [loeschen, setLoeschen] = useState(false);

  const speichern = () => {
    if (!form.text.trim()) return;
    updateTodo(todo.id, {
      text: form.text.trim(),
      notiz: form.notiz,
      projektId: form.projektId,
      termin: form.termin,
      wichtig: form.wichtig,
    });
    if (form.erledigt !== (todo.status === 'erledigt')) todoErledigen(todo.id, form.erledigt);
    onClose();
  };

  return (
    <>
      <Modal
        titel="Aufgabe bearbeiten"
        sub={`Aufgenommen am ${formatDate(todo.angelegt)}${todo.herkunft ? ` aus ${todo.herkunft.fundstelle}` : ''}`}
        onClose={onClose}
        footer={
          <>
            <button type="button" className="btn btn-danger" onClick={() => setLoeschen(true)}>
              <Icon name="loeschen" size={14} /> Löschen
            </button>
            <span className="spacer" />
            <button type="button" className="btn" onClick={onClose}>
              Abbrechen
            </button>
            <button type="button" className="btn btn-primary" disabled={!form.text.trim()} onClick={speichern}>
              Speichern
            </button>
          </>
        }
      >
        <div className="form-grid">
          <Field label="Aufgabe" full>
            <TextInput
              value={form.text}
              onChange={(text) => setForm((f) => ({ ...f, text }))}
              onKeyDown={beiEnter(speichern)}
              autoFocus
            />
          </Field>
          <Field label="Projekt" hint="Mit einem anderen Projekt wechselt die Aufgabe in dessen Liste.">
            <ProjektWahl
              wert={form.projektId}
              projekte={data.projekte}
              archiviert={archiviert}
              onChange={(projektId) => setForm((f) => ({ ...f, projektId }))}
              label="Projekt"
            />
          </Field>
          <Field label="Fällig am">
            <TextInput type="date" value={form.termin} onChange={(termin) => setForm((f) => ({ ...f, termin }))} />
          </Field>
          <Field label="Notiz" full>
            <TextArea value={form.notiz} onChange={(notiz) => setForm((f) => ({ ...f, notiz }))} rows={3} />
          </Field>
          <Field label="Kennzeichen" full>
            <div className="row wrap">
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={form.wichtig}
                  onChange={(e) => setForm((f) => ({ ...f, wichtig: e.target.checked }))}
                />
                wichtig
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={form.erledigt}
                  onChange={(e) => setForm((f) => ({ ...f, erledigt: e.target.checked }))}
                />
                erledigt
              </label>
            </div>
          </Field>
        </div>
      </Modal>

      {loeschen ? (
        <ConfirmDialog
          titel="Aufgabe löschen?"
          text={`„${todo.text}“ wird aus der To-Do-Liste entfernt.`}
          onConfirm={() => {
            deleteTodo(todo.id);
            toast('Aufgabe gelöscht.');
            onClose();
          }}
          onClose={() => setLoeschen(false)}
        />
      ) : null}
    </>
  );
}
