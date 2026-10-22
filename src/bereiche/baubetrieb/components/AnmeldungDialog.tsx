/**
 * Anlegen und Bearbeiten einer baubetrieblichen Anmeldung. Neu angelegt wird
 * immer in einem der vier Entwurfs-Status; der Status selbst ändert sich
 * danach nur noch über den Workflow.
 */
import { useState } from 'react';
import { formatDate, today } from '../../../shared/dates';
import { useToast } from '../../../shared/toast';
import { Callout, Field, Modal, Segmented, Select, TextArea, TextInput } from '../../../shared/ui';
import { fahrplanjahrBeginn, fahrplanjahrEnde, fahrplanjahrVon } from '../domain/fristen';
import {
  ANNEX_VII,
  ARTEN_JE_PHASE,
  PHASE_NAME,
  phaseMitFahrplanjahr,
  type Anmeldung,
  type AnmeldungsArt,
  type AnnexVIIGrund,
  type ArbeitsPhase,
  type ID,
  type Projekt,
  type StatusCode,
} from '../domain/types';
import { START_STATUS, istAenderung, statusDef } from '../domain/workflow';
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

const START_LABEL: Record<string, string> = {
  V0: 'SKM',
  W0: 'PzE',
  X0: 'Vorprozess',
  Y0: 'Unterjahr',
};

/**
 * Baubeginn einer vorbelegten tagesscharfen Anmeldung: der Beginn der Bauzeit
 * im vorgegebenen Fahrplanjahr, damit sich die Frist gleich berechnen lässt.
 */
function vorgabeBaubeginn(projekt: Projekt, vorgabe?: { status: StatusCode; fahrplanjahr?: number }): string {
  if (!vorgabe?.fahrplanjahr || phaseMitFahrplanjahr(statusDef(vorgabe.status).phase)) return '';
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
  /** Vorbelegung einer Neuanlage, etwa aus dem Anmeldebedarf der Projekthülle. */
  vorgabe?: { status: StatusCode; art?: AnmeldungsArt; fahrplanjahr?: number };
  onClose: () => void;
  onAngelegt?: (id: ID) => void;
}) {
  const { addAnmeldung, updateAnmeldung } = useStore();
  const toast = useToast();
  const [form, setForm] = useState({
    status: (anmeldung?.status ?? vorgabe?.status ?? 'Y0') as StatusCode,
    statusSeit: anmeldung?.statusSeit ?? today(),
    art: (anmeldung?.art ??
      vorgabe?.art ??
      ARTEN_JE_PHASE[statusDef(vorgabe?.status ?? 'Y0').phase as ArbeitsPhase][0]) as AnmeldungsArt,
    anmeldeId: anmeldung?.anmeldeId ?? '',
    fahrplanjahr:
      anmeldung?.fahrplanjahr ?? vorgabe?.fahrplanjahr ?? fahrplanjahrVon(projekt.bauzeitVon) ?? fahrplanjahrVon(today()),
    bauVon: anmeldung?.bauVon ?? vorgabeBaubeginn(projekt, vorgabe),
    bauBis: anmeldung?.bauBis ?? '',
    bfStrecke: anmeldung?.bfStrecke ?? '',
    gewerk: anmeldung?.gewerk ?? '',
    aenderungsNr: anmeldung?.aenderungsNr ?? '',
    annexVII: (anmeldung?.annexVII ?? '') as AnnexVIIGrund | '',
    bemerkung: anmeldung?.bemerkung ?? '',
  });
  const set = <K extends keyof typeof form>(key: K, wert: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: wert }));

  const phase = statusDef(form.status).phase as ArbeitsPhase;
  const ganzesJahr = phaseMitFahrplanjahr(phase);
  const arten = ARTEN_JE_PHASE[phase];
  const aenderung = !!anmeldung && istAenderung(anmeldung.status);

  const startWaehlen = (code: StatusCode) => {
    const neuePhase = statusDef(code).phase as ArbeitsPhase;
    setForm((f) => ({
      ...f,
      status: code,
      art: ARTEN_JE_PHASE[neuePhase].includes(f.art) ? f.art : ARTEN_JE_PHASE[neuePhase][0],
    }));
  };

  const speichern = () => {
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
    const id = addAnmeldung({
      ...gemeinsam,
      projektId: projekt.id,
      status: form.status,
      statusSeit: form.statusSeit || today(),
    });
    toast(`Eintrag in ${statusDef(form.status).name} angelegt.`);
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
              <StatusBadge code={anmeldung.status} />
            </span>
          </Field>
        ) : (
          <>
            <Field
              label="Beginnen in"
              full
              hint={`Neu angelegt wird immer als Entwurf: ${statusDef(form.status).code} · ${statusDef(form.status).name} (${PHASE_NAME[phase]}).`}
            >
              <Segmented<StatusCode>
                value={form.status}
                onChange={startWaehlen}
                options={START_STATUS.map((s) => ({ value: s, label: START_LABEL[s] }))}
              />
            </Field>
            <Field label="Im Entwurf seit">
              <TextInput type="date" value={form.statusSeit} onChange={(v) => set('statusSeit', v)} />
            </Field>
          </>
        )}

        <Field label="Anmeldungs-Art">
          {arten.length === 1 ? (
            <TextInput value={arten[0]} onChange={() => undefined} disabled />
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
          hint={ganzesJahr ? 'In SKM und PzE gibt es noch keine Anmeldungen – Sammeleintrag nach Begriffen bzw. tVE-Nr.' : undefined}
        >
          <TextInput
            value={form.anmeldeId}
            onChange={(v) => set('anmeldeId', v)}
            placeholder={ganzesJahr ? 'tVE 4000-17' : 'noch ohne ID'}
          />
        </Field>

        {ganzesJahr ? (
          <Field label="Bauzeitraum" full hint="In SKM und PzE gilt das gesamte Fahrplanjahr.">
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
