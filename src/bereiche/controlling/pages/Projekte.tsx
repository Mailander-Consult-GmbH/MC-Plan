/**
 * Projekte im Controlling: alle Projekte des Registers mit ihrem Stand je
 * Bereich. Hier entstehen Projekte für die Bereiche, werden in einen Bereich
 * übernommen, je Bereich oder ganz archiviert und gelöscht. Die Bereiche
 * vollziehen das beim nächsten Öffnen (Abgleich mit dem Projektregister).
 * In den Leistungsnachweisen steht jedes Projekt (`JEDES_PROJEKT_IN`) – dort
 * gibt es kein Übernehmen und kein Zurücknehmen, nur Archivieren.
 */
import { useState } from 'react';
import {
  bereichArchivieren,
  inBereichUebernehmen,
  projektAnlegen,
  projektArchivieren,
  projektBearbeiten,
  projektEntfernen,
  uebernahmeZuruecknehmen,
} from '../../../gemeinsam/abgleich';
import {
  JEDES_PROJEKT_IN,
  PROJEKT_BEREICHE,
  bereicheVon,
  istArchiviert,
  newId,
  projektTitel,
  registerAendern,
  useRegister,
  type ProjektBereich,
  type RegisterProjekt,
} from '../../../gemeinsam/register';
import { Icon } from '../../../shared/icons';
import { useToast } from '../../../shared/toast';
import { Badge, Card, ConfirmDialog, EmptyState, Field, Modal, Search, Stat, TextArea, TextInput } from '../../../shared/ui';

const jetzt = () => new Date().toISOString();

/** Bereiche als Aufzählung, etwa „Planlaufmanagement und Projektsteuerung“. */
function aufzaehlung(titel: string[]): string {
  return titel.length <= 1 ? (titel[0] ?? '') : `${titel.slice(0, -1).join(', ')} und ${titel[titel.length - 1]}`;
}

export function Projekte({ archiv }: { archiv: boolean }) {
  const register = useRegister();
  const toast = useToast();
  const [suche, setSuche] = useState('');
  const [dialog, setDialog] = useState<{ projekt?: RegisterProjekt } | null>(null);
  const [loeschen, setLoeschen] = useState<RegisterProjekt | null>(null);

  const begriff = suche.trim().toLowerCase();
  const liste = register.projekte
    .filter((p) => p.archiviert === archiv)
    .filter((p) => !begriff || [p.nummer, p.name, p.beschreibung].join(' ').toLowerCase().includes(begriff))
    .sort((a, b) => projektTitel(a).localeCompare(projektTitel(b), 'de'));

  const laufend = register.projekte.filter((p) => !p.archiviert);
  const imBereich = (b: ProjektBereich) => laufend.filter((p) => p.bereiche[b] && !istArchiviert(p, b)).length;

  return (
    <div className="stack">
      {archiv ? null : (
        <div className="grid grid-4">
          <Stat wert={laufend.length} label="Projekte" ton="blue" />
          {PROJEKT_BEREICHE.map((b) => (
            <Stat key={b.id} wert={imBereich(b.id)} label={`aktiv in ${b.titel}`} />
          ))}
        </div>
      )}

      <div className="row-between wrap">
        <div className="row wrap">
          <Search value={suche} onChange={setSuche} placeholder="Projekt, Nummer …" />
          <span className="small tertiary">
            {archiv
              ? 'Archivierte Projekte gelten in allen Bereichen als archiviert.'
              : 'Ein Projekt kann in einem Bereich archiviert und in einem anderen aktiv sein.'}
          </span>
        </div>
        {archiv ? null : (
          <button type="button" className="btn btn-primary" onClick={() => setDialog({})}>
            <Icon name="plus" size={14} /> Neues Projekt
          </button>
        )}
      </div>

      {liste.length === 0 ? (
        <Card>
          <EmptyState
            icon={archiv ? 'archiv' : 'projekt'}
            titel={begriff ? 'Kein Projekt gefunden' : archiv ? 'Das Archiv ist leer' : 'Noch keine Projekte'}
            text={
              archiv
                ? 'Archivierte Projekte erscheinen hier und lassen sich zurückholen.'
                : 'Projekte entstehen hier oder in einem Bereich; jedes Projekt eines Bereichs erscheint hier, sobald der Bereich einmal geöffnet wurde.'
            }
          />
        </Card>
      ) : (
        <div className="ct-raster">
          {liste.map((p) => (
            <ProjektKarte
              key={p.id}
              projekt={p}
              onBearbeiten={() => setDialog({ projekt: p })}
              onLoeschen={() => setLoeschen(p)}
              onArchivieren={(an) => {
                registerAendern((r) => projektArchivieren(r, p.id, an));
                toast(an ? `„${p.name}“ archiviert – in allen Bereichen.` : `„${p.name}“ aus dem Archiv geholt.`);
              }}
            />
          ))}
        </div>
      )}

      {dialog ? <ProjektDialog projekt={dialog.projekt} onClose={() => setDialog(null)} /> : null}

      {loeschen ? (
        <ConfirmDialog
          titel="Projekt löschen?"
          text={(() => {
            const bereiche = aufzaehlung(bereicheVon(loeschen).map((b) => PROJEKT_BEREICHE.find((x) => x.id === b)!.titel));
            return `„${projektTitel(loeschen)}“ wird mit seinen Projektbeteiligten gelöscht${
              bereiche
                ? ` – auch in ${bereiche}, samt allem, was dort dazu gespeichert ist (etwa Pläne und Planläufe, Anmeldungen, Protokolle). Die Bereiche löschen es beim nächsten Öffnen`
                : ''
            }. Das lässt sich nicht rückgängig machen.`;
          })()}
          bestaetigenLabel="Endgültig löschen"
          onConfirm={() => {
            registerAendern((r) => projektEntfernen(r, loeschen.id, jetzt()));
            toast('Projekt gelöscht.');
          }}
          onClose={() => setLoeschen(null)}
        />
      ) : null}
    </div>
  );
}

function ProjektKarte({
  projekt,
  onBearbeiten,
  onLoeschen,
  onArchivieren,
}: {
  projekt: RegisterProjekt;
  onBearbeiten: () => void;
  onLoeschen: () => void;
  onArchivieren: (an: boolean) => void;
}) {
  const toast = useToast();

  return (
    <div className="card">
      <div className="card-pad">
        <div className="row-between" style={{ alignItems: 'flex-start', gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div className="mono tertiary">{projekt.nummer || 'ohne Nummer'}</div>
            <h2 style={{ marginTop: 2 }}>{projekt.name || 'Ohne Bezeichnung'}</h2>
            {projekt.beschreibung ? <div className="small muted ct-beschreibung">{projekt.beschreibung}</div> : null}
          </div>
          <div className="row ct-aktionen">
            <button type="button" className="btn-icon" title="Bearbeiten" aria-label="Bearbeiten" onClick={onBearbeiten}>
              <Icon name="bearbeiten" size={15} />
            </button>
            <button
              type="button"
              className="btn-icon"
              title={projekt.archiviert ? 'Aus dem Archiv holen' : 'In allen Bereichen archivieren'}
              aria-label={projekt.archiviert ? 'Aus dem Archiv holen' : 'Archivieren'}
              onClick={() => onArchivieren(!projekt.archiviert)}
            >
              <Icon name={projekt.archiviert ? 'rueckgaengig' : 'archiv'} size={15} />
            </button>
            <button type="button" className="btn-icon ct-loeschen" title="Löschen" aria-label="Löschen" onClick={onLoeschen}>
              <Icon name="loeschen" size={15} />
            </button>
          </div>
        </div>

        <div className="ct-bereiche">
          {PROJEKT_BEREICHE.map((b) => {
            const m = projekt.bereiche[b.id];
            const immer = b.id === JEDES_PROJEKT_IN;
            // In die Leistungsnachweise kommt jedes Projekt – bis zu ihrem nächsten Abgleich gilt es als vorgesehen
            const zustand = !m
              ? immer
                ? 'vorgesehen'
                : 'fehlt'
              : m.offen
                ? 'vorgesehen'
                : istArchiviert(projekt, b.id)
                  ? 'archiviert'
                  : 'aktiv';
            const aendern = (fn: Parameters<typeof registerAendern>[0], meldung: string) => {
              registerAendern(fn);
              toast(meldung);
            };
            return (
              <div key={b.id} className="ct-bereich">
                <span className="ct-bereich-name">{b.titel}</span>
                <span className="ct-bereich-stand">
                  {zustand === 'aktiv' ? <Badge ton="green">Aktiv</Badge> : null}
                  {zustand === 'archiviert' ? <span className="badge gem-archiv">Archiviert</span> : null}
                  {zustand === 'vorgesehen' ? (
                    <span
                      className="badge gem-vorgesehen"
                      title={
                        immer
                          ? 'Jedes Projekt gehört in die Leistungsnachweise – sie legen es beim nächsten Öffnen an'
                          : 'Der Bereich legt das Projekt beim nächsten Öffnen an'
                      }
                    >
                      Vorgesehen
                    </span>
                  ) : null}
                  {zustand === 'fehlt' ? <span className="tertiary small">nicht geführt</span> : null}
                </span>
                {projekt.archiviert ? (
                  <span />
                ) : (
                  <span className="ct-bereich-aktion">
                    {zustand === 'fehlt' ? (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        title={`Übernehmen in ${b.titel}`}
                        onClick={() =>
                          aendern(
                            (r) => inBereichUebernehmen(r, projekt.id, b.id, projekt.id),
                            `„${projekt.name}“ wird beim nächsten Öffnen in ${b.titel} übernommen.`,
                          )
                        }
                      >
                        <Icon name="importieren" size={12} /> Übernehmen
                      </button>
                    ) : null}
                    {zustand === 'vorgesehen' && !immer ? (
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        onClick={() => aendern((r) => uebernahmeZuruecknehmen(r, projekt.id, b.id), 'Übernahme zurückgenommen.')}
                      >
                        Zurücknehmen
                      </button>
                    ) : null}
                    {zustand === 'aktiv' ? (
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        onClick={() =>
                          aendern((r) => bereichArchivieren(r, projekt.id, b.id, true), `In ${b.titel} archiviert.`)
                        }
                      >
                        <Icon name="archiv" size={12} /> Archivieren
                      </button>
                    ) : null}
                    {zustand === 'archiviert' ? (
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        onClick={() =>
                          aendern((r) => bereichArchivieren(r, projekt.id, b.id, false), `In ${b.titel} wieder aktiv.`)
                        }
                      >
                        Zurückholen
                      </button>
                    ) : null}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ProjektDialog({ projekt, onClose }: { projekt?: RegisterProjekt; onClose: () => void }) {
  const register = useRegister();
  const toast = useToast();
  const [form, setForm] = useState({
    nummer: projekt?.nummer ?? '',
    name: projekt?.name ?? '',
    beschreibung: projekt?.beschreibung ?? '',
  });
  const [bereiche, setBereiche] = useState<ProjektBereich[]>([]);
  const set = <K extends keyof typeof form>(key: K, wert: string) => setForm((f) => ({ ...f, [key]: wert }));

  const doppelt = register.projekte.find(
    (p) => p.id !== projekt?.id && form.nummer.trim() && p.nummer.trim().toLowerCase() === form.nummer.trim().toLowerCase(),
  );

  const speichern = () => {
    if (!form.name.trim()) {
      toast('Bitte eine Bezeichnung angeben.');
      return;
    }
    if (doppelt) {
      toast(`Die Projektnummer gehört bereits zu „${projektTitel(doppelt)}“.`);
      return;
    }
    const werte = { nummer: form.nummer.trim(), name: form.name.trim(), beschreibung: form.beschreibung.trim() };
    if (projekt) {
      registerAendern((r) => projektBearbeiten(r, projekt.id, werte, jetzt()));
      toast('Projekt gespeichert – die Bereiche übernehmen die Angaben.');
    } else {
      const id = newId('prj');
      registerAendern((r) => projektAnlegen(r, werte, bereiche, id, jetzt()));
      toast('Projekt angelegt – die gewählten Bereiche übernehmen es beim nächsten Öffnen.');
    }
    onClose();
  };

  return (
    <Modal
      titel={projekt ? 'Projekt bearbeiten' : 'Neues Projekt'}
      sub={projekt ? projektTitel(projekt) : 'Stammdaten für alle Bereiche'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Abbrechen
          </button>
          <button type="button" className="btn btn-primary" onClick={speichern}>
            {projekt ? 'Speichern' : 'Projekt anlegen'}
          </button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Projektnummer" hint={doppelt ? `Bereits vergeben: ${projektTitel(doppelt)}` : undefined}>
          <TextInput value={form.nummer} onChange={(v) => set('nummer', v)} placeholder="2026-001" />
        </Field>
        <Field label="Bezeichnung">
          <TextInput value={form.name} onChange={(v) => set('name', v)} placeholder="Neubau …" />
        </Field>
        <Field label="Beschreibung" full>
          <TextArea value={form.beschreibung} onChange={(v) => set('beschreibung', v)} rows={3} />
        </Field>
        {projekt ? null : (
          <Field
            label="Übernehmen in"
            full
            hint="Die gewählten Bereiche legen das Projekt beim nächsten Öffnen an. In die Leistungsnachweise kommt jedes Projekt."
          >
            <div className="row wrap" style={{ gap: '6px 18px' }}>
              {PROJEKT_BEREICHE.map((b) => {
                const immer = b.id === JEDES_PROJEKT_IN;
                return (
                  <label key={b.id} className="checkbox" title={immer ? 'Jedes Projekt gehört in die Leistungsnachweise' : undefined}>
                    <input
                      type="checkbox"
                      checked={immer || bereiche.includes(b.id)}
                      disabled={immer}
                      onChange={(e) =>
                        setBereiche((alt) => (e.target.checked ? [...alt, b.id] : alt.filter((x) => x !== b.id)))
                      }
                    />
                    {b.titel}
                    {immer ? <span className="tertiary"> (immer)</span> : null}
                  </label>
                );
              })}
            </div>
          </Field>
        )}
      </div>
    </Modal>
  );
}
