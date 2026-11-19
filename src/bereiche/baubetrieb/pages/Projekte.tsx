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
import { Card, EmptyState, Field, Modal, Search, Select, TextArea, TextInput } from '../../../shared/ui';
import { ersterTermin, fahrplanjahrBeginn, fahrplanjahrEnde, fahrplanjahrVon } from '../domain/fristen';
import { ERSTE_PHASE_LABEL, type ErstePhase, type Projekt } from '../domain/types';
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
    dbGNummer: projekt?.dbGNummer ?? '',
    erstePhase: projekt?.erstePhase ?? ('skm' as ErstePhase),
    fahrplanjahre: projekt?.fahrplanjahre ?? [],
    inbetriebnahme: projekt?.inbetriebnahme ?? '',
    bemerkung: projekt?.bemerkung ?? (uebernahme ? beschreibungOhneVermerke(uebernahme.beschreibung) : ''),
  });
  const set = <K extends keyof typeof form>(key: K, wert: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: wert }));

  const termin = ersterTermin(form, data.einstellungen);

  // Zur Wahl: das vorige bis zehn Jahre nach dem laufenden Fahrplanjahr, dazu bereits gewählte
  const jetzt = fahrplanjahrVon(today()) ?? new Date().getFullYear();
  const jahre = [
    ...new Set([...Array.from({ length: 12 }, (_, i) => jetzt - 1 + i), ...form.fahrplanjahre]),
  ].sort((a, b) => a - b);
  const jahrUmschalten = (n: number, an: boolean) =>
    set(
      'fahrplanjahre',
      (an ? [...form.fahrplanjahre, n] : form.fahrplanjahre.filter((x) => x !== n)).sort((a, b) => a - b),
    );

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
      <div className="form-grid">
        <Field label="Bezeichnung" full>
          <TextInput value={form.name} onChange={(v) => set('name', v)} placeholder="EÜ … – Erneuerung …" />
        </Field>
        <Field label="Projektnummer">
          <TextInput value={form.projektnummer} onChange={(v) => set('projektnummer', v)} placeholder="K1234" />
        </Field>
        <Field label="G-Nummer">
          <TextInput value={form.dbGNummer} onChange={(v) => set('dbGNummer', v)} placeholder="G.123456789" />
        </Field>

        <Field label="Betroffene Fahrplanjahre" full hint="Daraus ergeben sich der Anmeldebedarf in Übersicht und Terminen und die Frist der ersten Anmeldung.">
          <div className="row wrap" style={{ gap: '6px 16px' }}>
            {jahre.map((n) => (
              <label
                key={n}
                className="checkbox"
                title={`Fahrplanjahr ${n}: ${formatDate(fahrplanjahrBeginn(n))} – ${formatDate(fahrplanjahrEnde(n))}`}
              >
                <input
                  type="checkbox"
                  checked={form.fahrplanjahre.includes(n)}
                  onChange={(e) => jahrUmschalten(n, e.target.checked)}
                />
                {n}
              </label>
            ))}
          </div>
        </Field>

        <Field
          label="Prozessphase"
          hint={
            termin
              ? `der ersten Anmeldung – laut Richtlinie bis ${formatDate(termin)}`
              : 'der ersten Anmeldung – ihre Frist ergibt sich, sobald Fahrplanjahre gewählt sind'
          }
        >
          <Select
            value={form.erstePhase}
            onChange={(v) => set('erstePhase', v as ErstePhase)}
            options={(Object.keys(ERSTE_PHASE_LABEL) as ErstePhase[]).map((k) => ({
              value: k,
              label: ERSTE_PHASE_LABEL[k],
            }))}
          />
        </Field>
        <Field label="Inbetriebnahme">
          <TextInput type="date" value={form.inbetriebnahme} onChange={(v) => set('inbetriebnahme', v)} />
        </Field>
        <Field label="Bemerkung" full>
          <TextArea value={form.bemerkung} onChange={(v) => set('bemerkung', v)} rows={3} />
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
