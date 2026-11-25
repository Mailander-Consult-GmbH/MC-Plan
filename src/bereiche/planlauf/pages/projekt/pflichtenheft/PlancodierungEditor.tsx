/**
 * Bearbeitung der Plancodierung eines Pflichtenhefts: oben der Beispielcode
 * aus den Beispielen der Kategorien, darunter je Kategorie eine graue Kachel
 * mit Name, Beispiel und Katalog, zuletzt der Hinweis unter dem Schema.
 *
 * Die Einträge eines Katalogs sind Text – je Zeile Code und Bezeichnung (aus
 * Excel eingefügt mit Tabulator, sonst „ – “ oder zwei Leerzeichen), „# …“
 * gliedert; gelesen und geprüft wird er in domain/plancodierung.ts. Unter jedem
 * Katalog steht, wie die Stelle geprüft wird (`pruefRegelText`). Jede Eingabe
 * geht sofort an `onChange`.
 */
import { useRef, useState } from 'react';
import { beispielCode, pruefRegelText, standardPlancodierung } from '../../../domain/plancodierung';
import type { CodierungsKategorie, Plancodierung } from '../../../domain/types';
import { ConfirmDialog, Field, TextArea, TextInput } from '../../../../../shared/ui';
import { Icon } from '../../../../../shared/icons';

const PLATZHALTER = [
  'Je Zeile ein Code und seine Bezeichnung –',
  'getrennt durch Tabulator (Einfügen aus Excel),',
  '„ – “ oder zwei Leerzeichen, etwa:',
  'AP – Ausführungsplanung',
  '# Überschrift gliedert die Liste',
].join('\n');

function neueId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function PlancodierungEditor({ wert, onChange }: { wert: Plancodierung; onChange: (p: Plancodierung) => void }) {
  const kategorien = wert.kategorien;
  /** Neu angelegte Kategorie – ihr Name bekommt den Fokus. */
  const [neu, setNeu] = useState<string | null>(null);
  const [loeschen, setLoeschen] = useState<CodierungsKategorie | null>(null);
  const hinzufuegenRef = useRef<HTMLButtonElement>(null);

  const setzen = (k: CodierungsKategorie[]) => onChange({ ...wert, kategorien: k });
  const aendern = (id: string, patch: Partial<CodierungsKategorie>) =>
    setzen(kategorien.map((k) => (k.id === id ? { ...k, ...patch } : k)));
  const verschieben = (i: number, um: -1 | 1) => {
    const j = i + um;
    if (j < 0 || j >= kategorien.length) return;
    const neueFolge = [...kategorien];
    [neueFolge[i], neueFolge[j]] = [neueFolge[j], neueFolge[i]];
    setzen(neueFolge);
  };
  const hinzufuegen = () => {
    const id = neueId('kat');
    setzen([...kategorien, { id, name: '', beispiel: '', eintraege: '' }]);
    setNeu(id);
  };
  /** Entfernt die Kategorie; der Fokus geht an „Kategorie hinzufügen“, weil der Knopf mit ihr verschwindet. */
  const entfernen = (id: string) => {
    setzen(kategorien.filter((k) => k.id !== id));
    requestAnimationFrame(() => hinzufuegenRef.current?.focus());
  };

  return (
    <div className="@container flex flex-col gap-4">
      {kategorien.length > 0 ? (
        <div className="rounded-2xl bg-flaeche px-4 py-3.5">
          <div className="text-[12.5px] text-gedaempft">Beispiel</div>
          <p className="sr-only">{beispielCode(wert)}</p>
          {/* Je Stelle der Code mit der Nummer der Kategorie darunter; das Trennzeichen
              hängt an der Stelle davor, damit schmal nach „_“ umbrochen wird. */}
          <div className="mt-1.5 flex flex-wrap items-start gap-y-1 text-lg font-medium tracking-tight" aria-hidden="true">
            {kategorien.map((k, i) => (
              <span key={k.id} className="flex items-start">
                <span className="flex flex-col items-center" title={k.name.trim() || `${i + 1}. Kategorie`}>
                  <span className="text-marke-text">{k.beispiel.trim() || '…'}</span>
                  <span className="text-[11px] font-normal tabular-nums text-gedaempft">{i + 1}</span>
                </span>
                <span className="px-0.5 text-gedaempft">{i < kategorien.length - 1 ? '_' : '.pdf'}</span>
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-start gap-3 rounded-2xl bg-flaeche p-4">
          <p className="text-[13px] text-zweitrangig">
            Noch keine Kategorie. Die mitgelieferte Vorlage hat acht Kategorien – von „Projekt“ bis „Index“ – mit den
            üblichen Katalogen.
          </p>
          <button type="button" className="btn btn-outline" onClick={() => onChange(standardPlancodierung(neueId))}>
            Mitgelieferte Vorlage übernehmen
          </button>
        </div>
      )}

      {kategorien.length > 0 ? (
        <div className="grid items-start gap-4 @3xl:grid-cols-2">
          {kategorien.map((k, i) => {
            const titel = k.name.trim() ? `„${k.name.trim()}“` : `${i + 1}. Kategorie`;
            const zeilen = k.eintraege.split('\n').length;
            return (
              <section key={k.id} className="flex min-w-0 flex-col gap-3 rounded-2xl bg-flaeche p-4" aria-label={`${i + 1}. Kategorie`}>
                <div className="flex items-center gap-2.5">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-marke-zart text-xs font-semibold tabular-nums text-marke-text">
                    {i + 1}
                  </span>
                  {k.name.trim() ? (
                    <span className="min-w-0 flex-1 truncate font-medium tracking-tight">{k.name.trim()}</span>
                  ) : (
                    <span className="min-w-0 flex-1 truncate text-gedaempft">Neue Kategorie</span>
                  )}
                  <span className="flex shrink-0 items-center">
                    <button
                      type="button"
                      className="btn-icon aria-disabled:cursor-not-allowed aria-disabled:opacity-35"
                      aria-disabled={i === 0}
                      onClick={() => verschieben(i, -1)}
                      aria-label={`Kategorie ${titel} nach oben`}
                      title="Nach oben"
                    >
                      <Icon name="hoch" size={15} />
                    </button>
                    <button
                      type="button"
                      className="btn-icon aria-disabled:cursor-not-allowed aria-disabled:opacity-35"
                      aria-disabled={i === kategorien.length - 1}
                      onClick={() => verschieben(i, 1)}
                      aria-label={`Kategorie ${titel} nach unten`}
                      title="Nach unten"
                    >
                      <Icon name="runter" size={15} />
                    </button>
                    <button
                      type="button"
                      className="btn-icon"
                      onClick={() => (k.eintraege.trim() ? setLoeschen(k) : entfernen(k.id))}
                      aria-label={`Kategorie ${titel} entfernen`}
                      title="Kategorie entfernen"
                    >
                      <Icon name="loeschen" size={15} />
                    </button>
                  </span>
                </div>
                <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-3">
                  <Field label="Name">
                    <TextInput
                      value={k.name}
                      onChange={(v) => aendern(k.id, { name: v })}
                      placeholder="Planart"
                      aria-label={`Name der ${i + 1}. Kategorie`}
                      autoFocus={k.id === neu}
                    />
                  </Field>
                  <Field label="Beispiel">
                    <TextInput
                      value={k.beispiel}
                      onChange={(v) => aendern(k.id, { beispiel: v })}
                      placeholder="BWP"
                      aria-label={`Beispiel der ${i + 1}. Kategorie`}
                      spellCheck={false}
                    />
                  </Field>
                </div>
                <Field label="Einträge" hint={pruefRegelText(k)}>
                  <TextArea
                    mono
                    value={k.eintraege}
                    onChange={(v) => aendern(k.id, { eintraege: v })}
                    placeholder={PLATZHALTER}
                    rows={Math.min(Math.max(zeilen + 1, 5), 12)}
                    spellCheck={false}
                    aria-label={`Einträge der ${i + 1}. Kategorie`}
                    style={{ tabSize: 6 }}
                  />
                </Field>
              </section>
            );
          })}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button ref={hinzufuegenRef} type="button" className="btn btn-outline" onClick={hinzufuegen}>
          <Icon name="plus" size={14} /> Kategorie hinzufügen
        </button>
      </div>

      <Field label="Hinweis unter dem Schema" hint="Steht in der Druckfassung unter der Tabelle.">
        <TextArea value={wert.hinweis} onChange={(v) => onChange({ ...wert, hinweis: v })} rows={3} />
      </Field>

      {loeschen ? (
        <ConfirmDialog
          titel="Kategorie entfernen?"
          text={`Die Kategorie ${loeschen.name.trim() ? `„${loeschen.name.trim()}“` : 'ohne Namen'} wird samt ihrem Katalog entfernt.`}
          bestaetigenLabel="Entfernen"
          onConfirm={() => entfernen(loeschen.id)}
          onClose={() => setLoeschen(null)}
        />
      ) : null}
    </div>
  );
}
