/**
 * Projekte: Liste mit Anlage- und Bearbeitungsdialog. Die Kacheln nennen nur
 * die Projektnummer, die Bezeichnung, die Bemerkung und die anderen
 * Bereiche des Projekts. Darunter die im Bereich
 * archivierten Projekte und – grau hinterlegt – Projekte aus anderen Bereichen
 * zum Übernehmen (Projektregister, src/gemeinsam/): „Übernehmen in …“ öffnet
 * die Maske für ein neues Projekt, vorausgefüllt mit dem, was das Register
 * über das Projekt weiß.
 */
import { useState } from 'react';
import { beschreibungOhneVermerke, inBereichUebernehmen } from '../../../gemeinsam/abgleich';
import {
  ArchivAbschnitt,
  BereichsMarken,
  FremdeProjekte,
  UebernahmeHinweis,
  VerknuepfungsHinweis,
  uebernahmeMeldung,
  useArchivierte,
  useSucheOhneTreffer,
} from '../../../gemeinsam/ProjektBereiche';
import { registerAendern, useRegister, type RegisterProjekt } from '../../../gemeinsam/register';
import { formatDate, today } from '../../../shared/dates';
import { Icon } from '../../../shared/icons';
import { useToast } from '../../../shared/toast';
import { Card, EmptyState, Field, Modal, Search, TextArea, TextInput } from '../../../shared/ui';
import { ersteAnmeldung, fahrplanjahrBeginn, fahrplanjahrEnde, fahrplanjahrVon } from '../domain/fristen';
import { ERSTE_PHASE_LABEL, type Projekt } from '../domain/types';
import type { Route } from '../lib/router';
import { newId, useStore } from '../store/store';

export function Projekte({ navigate }: { navigate: (r: Route) => void }) {
  const { data, toggleMarkiert, ladeZustand } = useStore();
  const [suche, setSuche] = useState('');
  const [dialog, setDialog] = useState(false);
  // Projekt eines anderen Bereichs, das gerade übernommen wird – die Maske steht dann vorausgefüllt
  const [uebernahme, setUebernahme] = useState<RegisterProjekt | null>(null);

  const projekte = data.projekte.filter((p) =>
    [p.name, p.dbGNummer, p.projektnummer, p.bemerkung]
      .join(' ')
      .toLowerCase()
      .includes(suche.toLowerCase()),
  );
  const archiviert = useArchivierte('baubetrieb');
  const aktive = projekte.filter((p) => !archiviert.has(p.id));
  const archivierte = projekte.filter((p) => archiviert.has(p.id));
  const nurArchivierte = archivierte.length > 0 && !suche.trim();
  const ohneTreffer = useSucheOhneTreffer('baubetrieb', suche, archivierte.length, ladeZustand === 'ok');

  const karte = (p: Projekt) => {
    return (
      <button
        key={p.id}
        type="button"
        className="card card-click gem-kachel"
        onClick={() => navigate({ view: 'projekt', projektId: p.id })}
      >
        <div className="card-pad">
          <div className="row-between" style={{ alignItems: 'flex-start' }}>
            <div style={{ minWidth: 0 }}>
              <div className="mono tertiary">{p.projektnummer}</div>
              <h2 style={{ marginTop: 2 }}>{p.name}</h2>
              {p.bemerkung ? (
                <div className="small muted truncate" style={{ marginTop: 3 }}>
                  {p.bemerkung}
                </div>
              ) : null}
            </div>
            <span className="row" style={{ gap: 6 }}>
              <span
                role="button"
                tabIndex={0}
                className={`stern ${p.markiert ? 'aktiv' : ''}`}
                title={p.markiert ? 'Markierung aufheben' : 'Markieren – erscheint in Übersicht und Seitenleiste'}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMarkiert(p.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleMarkiert(p.id);
                  }
                }}
              >
                <Icon name="stern" size={16} />
              </span>
            </span>
          </div>

          <BereichsMarken bereich="baubetrieb" lokaleId={p.id} />
        </div>
      </button>
    );
  };

  return (
    <div className="stack">
      <div className="row-between wrap">
        <div className="row wrap">
          <Search value={suche} onChange={setSuche} placeholder="Bezeichnung, Projektnr., G-Nr. …" />
          <span className="small tertiary">
            Das Projekt wird bei der MIC-Beauftragung angelegt. Mit ★ markierte erscheinen in der Übersicht und
            in der Seitenleiste.
          </span>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setDialog(true)}>
          <Icon name="plus" size={14} /> Neues Projekt
        </button>
      </div>

      {aktive.length === 0 && suche.trim() ? (
        // Suche ohne Treffer ist kein leerer Bestand – kein Anlegen-Knopf; Treffer im Archiv und in anderen
        // Bereichen stehen darunter, der Text nennt sie (useSucheOhneTreffer)
        <Card>
          <EmptyState icon="projekt" titel={ohneTreffer.titel} text={ohneTreffer.text} />
        </Card>
      ) : aktive.length === 0 ? (
        <Card>
          <EmptyState
            icon="projekt"
            // Sind alle Projekte archiviert, liest sich „Kein Projekt gefunden“, als gäbe es keines
            titel={nurArchivierte ? 'Kein aktives Projekt' : 'Kein Projekt gefunden'}
            text={
              nurArchivierte
                ? 'Alle Projekte dieses Bereichs sind archiviert – sie stehen unten unter „Archiv“.'
                : 'Legen Sie ein Projekt an oder übernehmen Sie eines aus einem anderen Bereich, um die baubetrieblichen Anmeldungen der Maßnahme zu verfolgen.'
            }
            action={
              <button type="button" className="btn btn-primary" onClick={() => setDialog(true)}>
                <Icon name="plus" size={14} /> Neues Projekt
              </button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-2">{aktive.map(karte)}</div>
      )}

      <ArchivAbschnitt anzahl={archivierte.length}>{archivierte.map(karte)}</ArchivAbschnitt>
      {/* Nur bei geladenem Bestand: Sonst sähe das Register die Übernahme vor, angelegt würde nichts */}
      {ladeZustand === 'ok' ? <FremdeProjekte bereich="baubetrieb" suche={suche} onUebernehmen={setUebernahme} /> : null}

      {dialog ? <ProjektDialog onClose={() => setDialog(false)} navigate={navigate} /> : null}
      {uebernahme ? (
        <ProjektDialog uebernahme={uebernahme} onClose={() => setUebernahme(null)} navigate={navigate} />
      ) : null}
    </div>
  );
}

/**
 * Maske zum Anlegen und Bearbeiten eines Projekts. Mit `uebernahme` legt sie
 * ein Projekt an, das ein anderer Bereich schon führt: Projektnummer,
 * Bezeichnung und Beschreibung (als Bemerkung) stehen vorausgefüllt, und beim
 * Anlegen wird das neue Projekt mit dem des Registers verknüpft.
 */
export function ProjektDialog({
  projekt,
  uebernahme,
  onClose,
  navigate,
}: {
  projekt?: Projekt;
  uebernahme?: RegisterProjekt;
  onClose: () => void;
  navigate?: (r: Route) => void;
}) {
  const { data, addProjekt, updateProjekt } = useStore();
  const register = useRegister();
  const toast = useToast();
  const [form, setForm] = useState({
    name: projekt?.name ?? uebernahme?.name ?? '',
    projektnummer: projekt?.projektnummer ?? uebernahme?.nummer ?? '',
    dbGNummer: projekt?.dbGNummer ?? uebernahme?.gNummer ?? '',
    fahrplanjahre: projekt?.fahrplanjahre ?? [],
    inbetriebnahme: projekt?.inbetriebnahme ?? '',
    bemerkung: projekt?.bemerkung ?? (uebernahme ? beschreibungOhneVermerke(uebernahme.beschreibung) : ''),
  });
  const set = <K extends keyof typeof form>(key: K, wert: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: wert }));

  // Phase und Frist der ersten Anmeldung ergeben sich aus dem ersten Fahrplanjahr
  const erste = ersteAnmeldung(form, data.einstellungen);

  const speichern = () => {
    if (!form.name.trim()) {
      toast('Bitte eine Bezeichnung angeben.');
      return;
    }
    // Leerzeichen am Rand (etwa aus Excel kopiert) gehen nicht in den Bestand: Die
    // Projektnummer verknüpft das Projekt über das Projektregister mit den anderen
    // Bereichen und stünde sonst auch dort mit Leerzeichen; die G-Nummer ordnet der
    // Import aus BBPNeo zu.
    const werte = {
      ...form,
      name: form.name.trim(),
      projektnummer: form.projektnummer.trim(),
      dbGNummer: form.dbGNummer.trim(),
      inbetriebnahme: form.inbetriebnahme || null,
    };
    if (projekt) {
      updateProjekt(projekt.id, werte);
      toast('Projekt gespeichert.');
      onClose();
      return;
    }
    if (uebernahme) {
      // Erst das Projekt, dann die Zugehörigkeit im Register – unter derselben Kennung. So findet der
      // Abgleich das Projekt vor und legt es nicht noch einmal mit Vorgabewerten an.
      const kennung = data.projekte.some((p) => p.id === uebernahme.id) ? newId('pr') : uebernahme.id;
      const id = addProjekt({ ...werte, markiert: true }, kennung);
      registerAendern((r) =>
        inBereichUebernehmen(r, uebernahme.id, 'baubetrieb', id, {
          nummer: werte.projektnummer,
          gNummer: werte.dbGNummer,
          name: werte.name,
          jetzt: new Date().toISOString(),
        }),
      );
      toast(uebernahmeMeldung(register, uebernahme, werte.name));
      onClose();
      navigate?.({ view: 'projekt', projektId: id });
      return;
    }
    const id = addProjekt({ ...werte, markiert: true });
    toast('Projekt angelegt.');
    onClose();
    navigate?.({ view: 'projekt', projektId: id });
  };

  return (
    <Modal
      titel={projekt ? 'Projekt bearbeiten' : 'Neues Projekt'}
      sub={projekt ? projekt.name : uebernahme ? 'Übernahme aus einem anderen Bereich' : 'Wird bei der MIC-Beauftragung angelegt'}
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Abbrechen
          </button>
          <button type="button" className="btn btn-primary" onClick={speichern}>
            {projekt ? 'Speichern' : uebernahme ? 'Übernehmen' : 'Anlegen'}
          </button>
        </>
      }
    >
      <div className="bb-projekt-maske">
        <Field label="Bezeichnung" full>
          <TextInput value={form.name} onChange={(v) => set('name', v)} placeholder="EÜ … – Erneuerung …" />
        </Field>
        <Field label="Projektnummer">
          <TextInput value={form.projektnummer} onChange={(v) => set('projektnummer', v)} placeholder="K1234" />
        </Field>
        <Field label="G-Nummer">
          <TextInput value={form.dbGNummer} onChange={(v) => set('dbGNummer', v)} placeholder="G.123456789" />
        </Field>
        <Field label="Inbetriebnahme">
          <TextInput type="date" value={form.inbetriebnahme} onChange={(v) => set('inbetriebnahme', v)} />
        </Field>

        <section className="bb-projekt-gruppe full" aria-label="Fahrplanjahre und erste Anmeldung">
          <div className="bb-projekt-gruppe-kopf">Fahrplanjahre und erste Anmeldung</div>
          <div className="bb-projekt-gruppe-felder">
            <div className="field">
              <label>Betroffene Fahrplanjahre</label>
              <FahrplanjahrWahl jahre={form.fahrplanjahre} onChange={(j) => set('fahrplanjahre', j)} />
            </div>
            <Field
              label="Erste Anmeldung"
              hint={
                erste
                  ? `Nächster offener Termin laut Richtlinie für das Fahrplanjahr ${erste.fahrplanjahr}`
                  : 'Ergibt sich, sobald Fahrplanjahre gewählt sind.'
              }
            >
              <div className="bb-projekt-erste">
                {erste ? (
                  <>
                    <strong>{ERSTE_PHASE_LABEL[erste.phase]}</strong> bis {formatDate(erste.frist)}
                  </>
                ) : (
                  <span className="tertiary">–</span>
                )}
              </div>
            </Field>
          </div>
        </section>

        <Field label="Bemerkung" full>
          <TextArea value={form.bemerkung} onChange={(v) => set('bemerkung', v)} rows={2} />
        </Field>
      </div>
      {projekt ? null : uebernahme ? (
        <UebernahmeHinweis projekt={uebernahme} bereich="baubetrieb" />
      ) : (
        <VerknuepfungsHinweis bereich="baubetrieb" nummer={form.projektnummer} />
      )}
    </Modal>
  );
}

/** Jahre von `a` bis `b` (beide eingeschlossen). */
const jahreVonBis = (a: number, b: number) => Array.from({ length: Math.max(0, b - a + 1) }, (_, i) => a + i);

/**
 * Betroffene Fahrplanjahre als Zeitraum: „von“ und „bis“ als Auswahl, darunter
 * – ab zwei Jahren – die Jahre des Zeitraums als Leiste, in der sich einzelne
 * Jahre abwählen lassen. Eine neue Wahl von „von“ oder „bis“ nimmt den ganzen
 * Zeitraum; ohne Änderung bleiben ausgenommene Jahre ausgenommen.
 */
function FahrplanjahrWahl({ jahre, onChange }: { jahre: number[]; onChange: (jahre: number[]) => void }) {
  const jetzt = fahrplanjahrVon(today()) ?? new Date().getFullYear();
  const von = jahre.length > 0 ? Math.min(...jahre) : null;
  const bis = jahre.length > 0 ? Math.max(...jahre) : null;
  // Zur Wahl: das vorige bis 15 Jahre nach dem laufenden Fahrplanjahr, dazu bereits gewählte
  const angebot = jahreVonBis(Math.min(jetzt - 1, von ?? jetzt), Math.max(jetzt + 15, bis ?? jetzt));
  const zeitraum = von !== null && bis !== null ? jahreVonBis(von, bis) : [];
  const ausgenommen = zeitraum.filter((n) => !jahre.includes(n));
  const umschalten = (n: number) =>
    onChange(jahre.includes(n) ? jahre.filter((x) => x !== n) : [...jahre, n].sort((a, b) => a - b));

  return (
    <div className="bb-fpj">
      <div className="bb-fpj-wahl">
        <select
          className="select"
          aria-label="Fahrplanjahr von"
          value={von ?? ''}
          onChange={(e) => {
            const n = Number(e.target.value);
            onChange(e.target.value ? jahreVonBis(n, Math.max(n, bis ?? n)) : []);
          }}
        >
          <option value="">– keine –</option>
          {angebot.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <span>bis</span>
        <select
          className="select"
          aria-label="Fahrplanjahr bis"
          value={bis ?? ''}
          disabled={von === null}
          onChange={(e) => {
            const n = Number(e.target.value);
            onChange(jahreVonBis(Math.min(von ?? n, n), n));
          }}
        >
          {von === null ? <option value="">–</option> : null}
          {angebot
            .filter((n) => von === null || n >= von)
            .map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
        </select>
      </div>
      {zeitraum.length > 1 ? (
        <div className="bb-fpj-leiste" role="group" aria-label="Fahrplanjahre im Zeitraum – zum Abwählen anklicken">
          {zeitraum.map((n) => {
            const an = jahre.includes(n);
            return (
              <button
                key={n}
                type="button"
                className={`bb-fpj-jahr ${an ? 'an' : ''}`}
                aria-pressed={an}
                title={`Fahrplanjahr ${n}: ${formatDate(fahrplanjahrBeginn(n))} – ${formatDate(fahrplanjahrEnde(n))}${
                  an ? ' – zum Abwählen anklicken' : ' – nicht betroffen'
                }`}
                onClick={() => umschalten(n)}
              >
                {n}
              </button>
            );
          })}
        </div>
      ) : null}
      <span className="hint">
        {von === null || bis === null
          ? 'Daraus ergeben sich der Anmeldebedarf in Übersicht und Terminen und die Frist der ersten Anmeldung.'
          : `${jahre.length === 1 ? '1 Fahrplanjahr' : `${jahre.length} Fahrplanjahre`}: ${formatDate(
              fahrplanjahrBeginn(von),
            )} – ${formatDate(fahrplanjahrEnde(bis))}${ausgenommen.length > 0 ? ` (ohne ${ausgenommen.join(', ')})` : ''}`}
      </span>
    </div>
  );
}
