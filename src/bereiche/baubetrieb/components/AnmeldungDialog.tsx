/**
 * Anlegen und Bearbeiten einer baubetrieblichen Anmeldung. Neu angelegt wird
 * immer im ersten Status eines Workflows; der Status selbst ändert sich danach
 * nur noch über den Workflow.
 */
import { useState } from 'react';
import { formatDate, today } from '../../../shared/dates';
import { useToast } from '../../../shared/toast';
import { Callout, Field, Modal, Segmented, Select, TextArea, TextInput } from '../../../shared/ui';
import { fahrplanjahrBeginn, fahrplanjahrEnde, fahrplanjahrVon, ganzesFahrplanjahr } from '../domain/fristen';
import {
  ANNEX_VII,
  type Anmeldung,
  type AnmeldungsArt,
  type AnnexVIIGrund,
  type ID,
  type Projekt,
  type Workflow,
} from '../domain/types';
import { istAenderung, startbareWorkflows, statusVon } from '../domain/workflow';
import { useStore } from '../store/store';
import { StatusBadge } from './common';

/** Auswahl der Fahrplanjahre rund um das gewünschte Jahr. */
export function fahrplanjahrOptionen(mindestens?: number | null): { value: string; label: string }[] {
  const jetzt = fahrplanjahrVon(today()) ?? new Date().getFullYear();
  const von = Math.min(jetzt - 1, mindestens ?? jetzt);
  const bis = Math.max(jetzt + 8, mindestens ?? jetzt);
  const jahre: { value: string; label: string }[] = [];
  for (let n = von; n <= bis; n++) {
    jahre.push({
      value: String(n),
      label: `${n} (${formatDate(fahrplanjahrBeginn(n))} – ${formatDate(fahrplanjahrEnde(n))})`,
    });
  }
  return jahre;
}

export const ANNEX_OPTIONEN = ANNEX_VII.map((a) => ({
  value: a.id,
  label: a.selten ? `${a.label} (selten)` : a.label,
}));

/** Vorbelegung einer Neuanlage, etwa aus dem Anmeldebedarf des Projekts. */
export interface AnmeldungVorgabe {
  workflowId?: ID;
  art?: AnmeldungsArt;
  fahrplanjahr?: number;
}

/**
 * Baubeginn einer vorbelegten tagesscharfen Anmeldung: der Beginn der Bauzeit
 * im vorgegebenen Fahrplanjahr, damit sich die Frist gleich berechnen lässt.
 */
function vorgabeBaubeginn(projekt: Projekt, workflow: Workflow | undefined, vorgabe?: AnmeldungVorgabe): string {
  if (!vorgabe?.fahrplanjahr || !workflow || ganzesFahrplanjahr(workflow)) return '';
  const beginn = fahrplanjahrBeginn(vorgabe.fahrplanjahr);
  return projekt.bauzeitVon && projekt.bauzeitVon > beginn ? projekt.bauzeitVon : beginn;
}

export function AnmeldungDialog({
  projekt,
  anmeldung,
  vorgabe,
  onClose,
  onAngelegt,
}: {
  projekt: Projekt;
  anmeldung?: Anmeldung;
  vorgabe?: AnmeldungVorgabe;
  onClose: () => void;
  onAngelegt?: (id: ID) => void;
}) {
  const { data, addAnmeldung, updateAnmeldung } = useStore();
  const toast = useToast();
  const startbar = startbareWorkflows(data.workflows);
  // Neuanlage: vorgegebener Workflow, sonst der letzte (unterjährige Anmeldung)
  const startWorkflow =
    startbar.find((w) => w.id === vorgabe?.workflowId) ?? startbar[startbar.length - 1] ?? undefined;
  const [form, setForm] = useState({
    workflowId: anmeldung ? statusVon(data.workflows, anmeldung.statusId).workflow.id : (startWorkflow?.id ?? ''),
    statusSeit: anmeldung?.statusSeit ?? today(),
    art: (anmeldung?.art ??
      (vorgabe?.art && startWorkflow?.arten.includes(vorgabe.art) ? vorgabe.art : startWorkflow?.arten[0]) ??
      'A_unterjahr') as AnmeldungsArt,
    anmeldeId: anmeldung?.anmeldeId ?? '',
    fahrplanjahr:
      anmeldung?.fahrplanjahr ?? vorgabe?.fahrplanjahr ?? fahrplanjahrVon(projekt.bauzeitVon) ?? fahrplanjahrVon(today()),
    bauVon: anmeldung?.bauVon ?? vorgabeBaubeginn(projekt, startWorkflow, vorgabe),
    bauBis: anmeldung?.bauBis ?? '',
    bfStrecke: anmeldung?.bfStrecke ?? '',
    gewerk: anmeldung?.gewerk ?? '',
    aenderungsNr: anmeldung?.aenderungsNr ?? '',
    annexVII: (anmeldung?.annexVII ?? '') as AnnexVIIGrund | '',
    bemerkung: anmeldung?.bemerkung ?? '',
  });
  const set = <K extends keyof typeof form>(key: K, wert: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: wert }));

  const workflow = data.workflows.find((w) => w.id === form.workflowId);
  const ganzesJahr = workflow ? ganzesFahrplanjahr(workflow) : false;
  // Die bisherige Art bleibt wählbar, auch wenn der Workflow sie nicht mehr führt.
  const arten = [...new Set([...(workflow?.arten ?? []), ...(anmeldung ? [anmeldung.art] : [])])];
  const aenderung = !!anmeldung && istAenderung(data.workflows, anmeldung.statusId);

  const workflowWaehlen = (id: ID) => {
    const neu = data.workflows.find((w) => w.id === id);
    if (!neu) return;
    setForm((f) => ({ ...f, workflowId: id, art: neu.arten.includes(f.art) ? f.art : (neu.arten[0] ?? f.art) }));
  };

  const speichern = () => {
    if (!anmeldung && !workflow?.status[0]) {
      toast('Bitte einen Workflow wählen.');
      return;
    }
    if (!ganzesJahr && form.bauVon && form.bauBis && form.bauBis < form.bauVon) {
      toast('Das Ende des Bauzeitraums liegt vor dem Beginn.');
      return;
    }
    if (ganzesJahr && !form.fahrplanjahr) {
      toast('Bitte das Fahrplanjahr wählen.');
      return;
    }
    const bauzeit = ganzesJahr
      ? { fahrplanjahr: form.fahrplanjahr, bauVon: null, bauBis: null }
      : { fahrplanjahr: null, bauVon: form.bauVon || null, bauBis: form.bauBis || form.bauVon || null };
    const gemeinsam = {
      art: form.art,
      anmeldeId: form.anmeldeId.trim(),
      bfStrecke: form.bfStrecke.trim(),
      gewerk: form.gewerk.trim(),
      bemerkung: form.bemerkung.trim(),
      ...bauzeit,
    };
    if (anmeldung) {
      updateAnmeldung(anmeldung.id, {
        ...gemeinsam,
        ...(aenderung ? { aenderungsNr: form.aenderungsNr.trim(), annexVII: form.annexVII || null } : {}),
      });
      toast('Anmeldung gespeichert.');
      onClose();
      return;
    }
    const start = workflow!.status[0];
    const id = addAnmeldung({
      ...gemeinsam,
      projektId: projekt.id,
      statusId: start.id,
      statusSeit: form.statusSeit || today(),
    });
    toast(`Eintrag in ${workflow!.kurz || workflow!.name} · ${start.name} angelegt.`);
    onClose();
    onAngelegt?.(id);
  };

  return (
    <Modal
      titel={anmeldung ? 'Anmeldung bearbeiten' : 'Neue Anmeldung'}
      sub={projekt.name}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Abbrechen
          </button>
          <button type="button" className="btn btn-primary" onClick={speichern}>
            {anmeldung ? 'Speichern' : 'Anlegen'}
          </button>
        </>
      }
    >
      <div className="form-grid">
        {anmeldung ? (
          <Field label="Status" full hint="Der Status ändert sich nur über den Workflow – in der Liste oder in der Anmeldung.">
            <span>
              <StatusBadge statusId={anmeldung.statusId} />
            </span>
          </Field>
        ) : (
          <>
            <Field
              label="Workflow"
              full
              hint={
                workflow?.status[0]
                  ? `Neu angelegt wird im ersten Status des Workflows: ${workflow.status[0].name}.`
                  : 'Der Workflow hat noch keinen Status.'
              }
            >
              {startbar.length <= 5 ? (
                <Segmented<ID>
                  value={form.workflowId}
                  onChange={workflowWaehlen}
                  options={startbar.map((w) => ({ value: w.id, label: w.kurz || w.name }))}
                />
              ) : (
                <Select
                  value={form.workflowId}
                  onChange={workflowWaehlen}
                  options={startbar.map((w) => ({ value: w.id, label: w.name }))}
                />
              )}
            </Field>
            <Field label="Im ersten Status seit">
              <TextInput type="date" value={form.statusSeit} onChange={(v) => set('statusSeit', v)} />
            </Field>
          </>
        )}

        <Field label="Anmeldungs-Art">
          {arten.length <= 1 ? (
            <TextInput value={arten[0] ?? form.art} onChange={() => undefined} disabled />
          ) : (
            <Select
              value={form.art}
              onChange={(v) => set('art', v as AnmeldungsArt)}
              options={arten.map((a) => ({ value: a, label: a }))}
            />
          )}
        </Field>

        <Field
          label={ganzesJahr ? 'Begriff / tVE-Nr' : 'Anmelde-ID'}
          hint={ganzesJahr ? 'Vor dem Vorprozess gibt es noch keine Anmeldungen – Sammeleintrag nach Begriffen bzw. tVE-Nr.' : undefined}
        >
          <TextInput
            value={form.anmeldeId}
            onChange={(v) => set('anmeldeId', v)}
            placeholder={ganzesJahr ? 'tVE 4000-17' : 'noch ohne ID'}
          />
        </Field>

        {ganzesJahr ? (
          <Field label="Bauzeitraum" full hint="In diesem Workflow gilt das gesamte Fahrplanjahr.">
            <Select
              value={String(form.fahrplanjahr ?? '')}
              onChange={(v) => set('fahrplanjahr', v ? Number(v) : null)}
              options={fahrplanjahrOptionen(form.fahrplanjahr)}
              placeholder="Fahrplanjahr wählen"
            />
          </Field>
        ) : (
          <>
            <Field label="Bauzeitraum von" hint="tagesscharf">
              <TextInput type="date" value={form.bauVon} onChange={(v) => set('bauVon', v)} />
            </Field>
            <Field label="Bauzeitraum bis">
              <TextInput type="date" value={form.bauBis} onChange={(v) => set('bauBis', v)} />
            </Field>
          </>
        )}

        <Field label="Bf/Strecke" hint="in Stichworten">
          <TextInput value={form.bfStrecke} onChange={(v) => set('bfStrecke', v)} placeholder="Strecke 4000, km 92,1–95,4" />
        </Field>
        <Field label="Gewerk/Tätigkeit" hint="in Stichworten">
          <TextInput value={form.gewerk} onChange={(v) => set('gewerk', v)} placeholder="Weichenerneuerung" />
        </Field>

        {aenderung ? (
          <>
            <Field label="ÄAbst-Nr" hint="der aktuell laufenden Änderung">
              <TextInput value={form.aenderungsNr} onChange={(v) => set('aenderungsNr', v)} />
            </Field>
            <Field label="AnnexVII-Kennzeichen">
              <Select
                value={form.annexVII}
                onChange={(v) => set('annexVII', v as AnnexVIIGrund | '')}
                options={ANNEX_OPTIONEN}
                placeholder="– ohne –"
              />
            </Field>
          </>
        ) : null}

        <Field label="Bemerkungen" full>
          <TextArea value={form.bemerkung} onChange={(v) => set('bemerkung', v)} rows={3} />
        </Field>
      </div>
      {!ganzesJahr && !form.bauVon ? (
        <div style={{ marginTop: 12 }}>
          <Callout ton="warn" icon="!">
            Ohne Baubeginn lässt sich die Terminfrist nach Richtlinie nicht berechnen.
          </Callout>
        </div>
      ) : null}
    </Modal>
  );
}
