/**
 * Eigene To-Do-Liste: schlichte Aufgaben für sich selbst, auf Wunsch mit
 * Projekt und Termin. `TodoListe` steht als Seite „To-Do-Liste“ in der
 * Seitenleiste (alle Aufgaben, mit Spalte und Filter „Projekt“) und als Reiter
 * „To-Dos“ im Projekt (nur dessen Aufgaben). Oben wird erfasst, darunter
 * gefiltert; ein Klick auf eine Zeile öffnet sie zum Bearbeiten.
 * `FaelligeTodos` zeigt auf der Übersicht, was überfällig oder demnächst fällig
 * ist.
 */
import { useRef, useState } from 'react';
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
import { AmpelBadge, AmpelPunkt } from '../components/common';
import { VORLAUF_TAGE, type ID, type Projekt, type Todo } from '../domain/types';
import { projektDes, todoAmpel, todosSortiert, zeitkritisch } from '../domain/todos';
import { useStore } from '../store/store';

type Filter = 'offen' | 'faellig' | 'erledigt' | 'alle';

/** Wert der Projektauswahl für Aufgaben ohne Projekt. */
const OHNE = 'ohne';

const projektText = (p: Projekt) => [p.nummer, p.name].filter(Boolean).join(' ');

/**
 * Projekte zur Auswahl: die nicht archivierten, nach Nummer und Name; ein
 * archiviertes nur, wenn die Aufgabe ihm schon zugeordnet ist.
 */
function auswahlProjekte(projekte: Projekt[], archiviert: Set<string>, aktuell: ID | null): Projekt[] {
  return projekte
    .filter((p) => !archiviert.has(p.id) || p.id === aktuell)
    .sort((a, b) => projektText(a).localeCompare(projektText(b), 'de'));
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

export function TodoListe({ projekt }: { projekt?: Projekt }) {
  const { data, addTodo, todoErledigen } = useStore();
  const toast = useToast();
  const archiviert = useArchivierte('projektsteuerung');
  const [filter, setFilter] = useState<Filter>('offen');
  const [projektFilter, setProjektFilter] = useState('');
  const [suche, setSuche] = useState('');
  const [neu, setNeu] = useState<{ text: string; projektId: ID | null; termin: string }>({
    text: '',
    projektId: projekt?.id ?? null,
    termin: '',
  });
  const [bearbeiten, setBearbeiten] = useState<ID | null>(null);
  const feld = useRef<HTMLInputElement>(null);
  const heute = today();

  // Im Projekt nur dessen Aufgaben; über alle Projekte nach der Projektauswahl
  const imBereich = data.todos.filter((t) => {
    const p = projektDes(t, data.projekte);
    if (projekt) return p?.id === projekt.id;
    if (projektFilter === OHNE) return !p;
    return !projektFilter || p?.id === projektFilter;
  });
  const begriff = suche.trim().toLowerCase();
  const gesucht = begriff
    ? imBereich.filter((t) =>
        [t.text, t.notiz, ((p) => (p ? projektText(p) : ''))(projektDes(t, data.projekte))]
          .join(' ')
          .toLowerCase()
          .includes(begriff),
      )
    : imBereich;
  const offen = gesucht.filter((t) => t.status !== 'erledigt');
  const faellig = offen.filter((t) => zeitkritisch(t, heute));
  const erledigt = gesucht.filter((t) => t.status === 'erledigt');
  const liste = todosSortiert(
    filter === 'offen' ? offen : filter === 'faellig' ? faellig : filter === 'erledigt' ? erledigt : gesucht,
    heute,
  );
  // Projekte, nach denen sich filtern lässt: die mit Aufgaben
  const mitAufgaben = data.projekte
    .filter((p) => data.todos.some((t) => t.projektId === p.id))
    .sort((a, b) => projektText(a).localeCompare(projektText(b), 'de'));
  const zuBearbeiten = bearbeiten ? data.todos.find((t) => t.id === bearbeiten) : undefined;

  const hinzufuegen = () => {
    const text = neu.text.trim();
    if (!text) return;
    addTodo({ text, projektId: projekt?.id ?? neu.projektId, termin: neu.termin });
    // Projekt bleibt gewählt – oft folgen mehrere Aufgaben zum selben Projekt
    setNeu((n) => ({ ...n, text: '', termin: '' }));
    toast('Aufgabe aufgenommen.');
    feld.current?.focus();
  };

  return (
    <div className="stack">
      <Card>
        {/* Ein Formular: Die Eingabetaste nimmt die Aufgabe aus jedem Feld heraus auf */}
        <form
          className="card-pad"
          onSubmit={(e) => {
            e.preventDefault();
            hinzufuegen();
          }}
        >
          <div className="flex flex-wrap items-center gap-2.5">
            <input
              ref={feld}
              className="input min-w-0 flex-[3_1_260px]"
              value={neu.text}
              onChange={(e) => setNeu((n) => ({ ...n, text: e.target.value }))}
              placeholder="Neue Aufgabe – was ist zu tun?"
              aria-label="Neue Aufgabe"
            />
            {projekt ? null : (
              <div className="min-w-0 flex-[1_1_200px]">
                <ProjektWahl
                  wert={neu.projektId}
                  projekte={data.projekte}
                  archiviert={archiviert}
                  onChange={(projektId) => setNeu((n) => ({ ...n, projektId }))}
                  label="Projekt der neuen Aufgabe"
                />
              </div>
            )}
            <input
              type="date"
              className="input w-auto flex-none"
              value={neu.termin}
              onChange={(e) => setNeu((n) => ({ ...n, termin: e.target.value }))}
              aria-label="Fällig am"
              title="Fällig am"
            />
            <button type="submit" className="btn btn-primary" disabled={!neu.text.trim()}>
              <Icon name="plus" size={14} /> Hinzufügen
            </button>
          </div>
        </form>
      </Card>

      <div className="row-between wrap">
        <Segmented<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'offen', label: `Offen (${offen.length})` },
            { value: 'faellig', label: `Fällig (${faellig.length})` },
            { value: 'erledigt', label: `Erledigt (${erledigt.length})` },
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

      <Card>
        <CardHeader
          titel={projekt ? 'To-Dos zum Projekt' : 'Aufgaben'}
          sub={`Offene zuerst – Überfälliges oben, „Fällig“ heißt überfällig oder in den nächsten ${VORLAUF_TAGE} Tagen`}
        />
        {liste.length === 0 ? (
          imBereich.length === 0 && !begriff ? (
            <EmptyState
              icon="aufgabe"
              titel="Noch keine Aufgaben"
              text="Tragen Sie oben ein, was zu tun ist – auf Wunsch mit Projekt und Termin."
            />
          ) : begriff && gesucht.length === 0 ? (
            <EmptyState icon="suche" titel="Keine Aufgabe gefunden" text="Für diese Suche gibt es keinen Treffer." />
          ) : (
            <EmptyState icon="check" titel="Nichts für diese Auswahl" text="Unter „Alle“ stehen sämtliche Aufgaben." />
          )
        ) : (
          <div className="table-scroll">
            <table className="table table-stack">
              <thead>
                <tr>
                  <th style={{ width: 44 }}>
                    <span className="sr-only">Erledigt</span>
                  </th>
                  <th>Aufgabe</th>
                  {projekt ? null : <th>Projekt</th>}
                  <th>Fällig</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {liste.map((t) => {
                  const fertig = t.status === 'erledigt';
                  const p = projektDes(t, data.projekte);
                  return (
                    <tr key={t.id} className="clickable" {...alsKlickZeile(() => setBearbeiten(t.id))}>
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={fertig}
                          onChange={(e) => {
                            todoErledigen(t.id, e.target.checked);
                            toast(e.target.checked ? 'Als erledigt markiert.' : 'Wieder offen.');
                          }}
                          aria-label={`„${t.text}“ erledigt`}
                        />
                      </td>
                      <td>
                        <div className={fertig ? 'text-gedaempft line-through' : ''}>{t.text}</div>
                        {t.notiz ? <div className="ps-zweizeilig small tertiary">{t.notiz}</div> : null}
                      </td>
                      {projekt ? null : (
                        <td className="small">
                          {p ? (
                            <>
                              {p.nummer ? <span className="num tertiary">{p.nummer} </span> : null}
                              {p.name}
                            </>
                          ) : (
                            <span className="tertiary">ohne Projekt</span>
                          )}
                        </td>
                      )}
                      <td className="small">
                        {t.termin ? (
                          <>
                            {formatDate(t.termin)}
                            {fertig ? null : <div className="tertiary small">{relativeLabel(t.termin)}</div>}
                          </>
                        ) : (
                          <span className="tertiary">ohne Termin</span>
                        )}
                      </td>
                      <td>
                        <AmpelBadge ampel={todoAmpel(t, heute)} />
                        {fertig && t.erledigtAm ? (
                          <div className="tertiary small">am {formatDate(t.erledigtAm)}</div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {zuBearbeiten ? (
        <TodoDialog todo={zuBearbeiten} imProjekt={!!projekt} onClose={() => setBearbeiten(null)} />
      ) : null}
    </div>
  );
}

/** Aufgabe bearbeiten: Text, Notiz, Projekt, Termin, Erledigt – und löschen. */
function TodoDialog({ todo, imProjekt, onClose }: { todo: Todo; imProjekt: boolean; onClose: () => void }) {
  const { data, updateTodo, todoErledigen, deleteTodo } = useStore();
  const toast = useToast();
  const archiviert = useArchivierte('projektsteuerung');
  const [form, setForm] = useState({
    text: todo.text,
    notiz: todo.notiz,
    projektId: todo.projektId,
    termin: todo.termin,
    erledigt: todo.status === 'erledigt',
  });
  const [loeschen, setLoeschen] = useState(false);

  const speichern = () => {
    if (!form.text.trim()) return;
    updateTodo(todo.id, { text: form.text.trim(), notiz: form.notiz, projektId: form.projektId, termin: form.termin });
    if (form.erledigt !== (todo.status === 'erledigt')) todoErledigen(todo.id, form.erledigt);
    onClose();
  };

  return (
    <>
      <Modal
        titel="Aufgabe bearbeiten"
        sub={`Aufgenommen am ${formatDate(todo.angelegt)}`}
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
          <Field label="Projekt" hint={imProjekt ? 'Mit einem anderen Projekt wechselt sie dorthin.' : undefined}>
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
          <Field label="Status" full>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={form.erledigt}
                onChange={(e) => setForm((f) => ({ ...f, erledigt: e.target.checked }))}
              />
              erledigt
            </label>
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

/** Übersicht: Aufgaben der To-Do-Liste, die überfällig oder demnächst fällig sind. */
export function FaelligeTodos({ onZurListe }: { onZurListe: () => void }) {
  const { data, todoErledigen } = useStore();
  const toast = useToast();
  const heute = today();
  const liste = todosSortiert(
    data.todos.filter((t) => t.status !== 'erledigt' && zeitkritisch(t, heute)),
    heute,
  );

  return (
    <Card>
      <CardHeader
        titel="Fällige To-Dos"
        sub={`Aus der To-Do-Liste – überfällig oder in den nächsten ${VORLAUF_TAGE} Tagen fällig`}
        actions={
          <button type="button" className="btn btn-ghost btn-sm" onClick={onZurListe}>
            To-Do-Liste <Icon name="chevron" size={13} />
          </button>
        }
      />
      {liste.length === 0 ? (
        <p className="card-pad small tertiary">Nichts fällig.</p>
      ) : (
        <div className="table-scroll">
          <table className="table table-stack">
            <thead>
              <tr>
                <th className="col-optional" style={{ width: 22 }} />
                <th>Aufgabe</th>
                <th className="col-optional">Projekt</th>
                <th>Fällig</th>
                <th>Status</th>
                <th className="actions" />
              </tr>
            </thead>
            <tbody>
              {liste.map((t) => {
                const ampel = todoAmpel(t, heute);
                const p = projektDes(t, data.projekte);
                return (
                  <tr key={t.id}>
                    <td className="col-optional">
                      <AmpelPunkt ampel={ampel} />
                    </td>
                    <td style={{ maxWidth: 460 }}>
                      <div className="ps-zweizeilig">{t.text}</div>
                      {t.notiz ? <div className="small tertiary ps-zweizeilig">{t.notiz}</div> : null}
                    </td>
                    <td className="small muted col-optional">
                      {p ? projektText(p) : <span className="tertiary">ohne Projekt</span>}
                    </td>
                    <td className="small">
                      {formatDate(t.termin)}
                      <div className="tertiary small">{relativeLabel(t.termin)}</div>
                    </td>
                    <td>
                      <AmpelBadge ampel={ampel} />
                    </td>
                    <td className="actions">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline btn-haken"
                        title="Als erledigt markieren"
                        onClick={() => {
                          todoErledigen(t.id, true);
                          toast('Als erledigt markiert.');
                        }}
                      >
                        <Icon name="check" size={13} /> Erledigt
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
