/**
 * Anlage und Pflege eines Planpakets – aus der Planliste heraus.
 *
 * Ein Planpaket bündelt Pläne und Planverzeichnisse zu einer Gruppe, etwa je
 * Bauwerk oder Bauabschnitt. Es ist ein reines Ordnungsmerkmal: Planläufe,
 * Fristen und Workflows bleiben davon unberührt. Beim Bearbeiten lassen sich
 * hier auch Einträge zuordnen und wieder entfernen; Pläne eines
 * Planverzeichnisses folgen dem Paket ihres Verzeichnisses.
 */
import { useState } from 'react';
import { DOCUMENT_KIND_LABEL, INDEX_LABEL, type PlanDocument, type Project } from '../domain/types';
import { gewerkeFuerProjekt } from '../domain/engine';
import { useStore } from '../store/store';
import { useToast } from '../../../shared/toast';
import { DocKindIcon } from './common';
import { ConfirmDialog, Field, Modal, Select, TextArea, TextInput } from '../../../shared/ui';
import { Icon } from '../../../shared/icons';

export function PaketDialog({
  project,
  paket,
  onClose,
}: {
  project: Project;
  paket?: PlanDocument;
  onClose: () => void;
}) {
  const { data, addDocument, updateDocument, deleteDocument } = useStore();
  const toast = useToast();
  const [loeschen, setLoeschen] = useState(false);
  const [form, setForm] = useState({
    nummer: paket?.nummer ?? '',
    titel: paket?.titel ?? '',
    gewerk: paket?.gewerk ?? '',
    planungsphase: paket?.planungsphase ?? '',
    bemerkung: paket?.bemerkung ?? '',
  });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  // Zuordnen lassen sich Planverzeichnisse und Pläne ohne Verzeichnis – Pläne
  // eines Verzeichnisses gehören zum Paket ihres Verzeichnisses.
  const zuordenbar = data.documents.filter(
    (d) => d.projectId === project.id && d.kind !== 'paket' && !(d.kind === 'plan' && d.parentId),
  );
  const inhalt = paket
    ? zuordenbar
        .filter((d) => d.paketId === paket.id)
        .sort((a, b) => a.nummer.localeCompare(b.nummer, 'de', { numeric: true }))
    : [];
  const ohnePaket = zuordenbar.filter((d) => !d.paketId);

  const zuweisen = (docId: string, paketId: string | null) => {
    updateDocument(docId, { paketId });
    toast(paketId ? `Eintrag zu „${paket?.titel ?? 'Paket'}“ hinzugefügt.` : 'Eintrag aus dem Paket entfernt.');
  };

  const speichern = () => {
    if (!form.titel.trim()) {
      toast('Bitte einen Namen für das Planpaket angeben.');
      return;
    }
    if (paket) {
      updateDocument(paket.id, form);
      toast('Planpaket gespeichert.');
    } else {
      addDocument({
        ...form,
        projectId: project.id,
        kind: 'paket',
        parentId: null,
        paketId: null,
        index: '',
        eingangSoll: null,
        datum: null,
      });
      toast('Planpaket angelegt.');
    }
    onClose();
  };

  return (
    <>
      <Modal
        titel={paket ? 'Planpaket bearbeiten' : 'Neues Planpaket'}
        sub="Ordnungsmerkmal ohne Einfluss auf Planläufe"
        onClose={onClose}
        footer={
          <>
            {paket ? (
              <button type="button" className="btn btn-danger" onClick={() => setLoeschen(true)}>
                <Icon name="loeschen" size={14} /> Löschen
              </button>
            ) : null}
            <span className="spacer" />
            <button type="button" className="btn" onClick={onClose}>
              Abbrechen
            </button>
            <button type="button" className="btn btn-primary" onClick={speichern}>
              Speichern
            </button>
          </>
        }
      >
        <div className="stack" style={{ gap: 16 }}>
          <div className="form-grid">
            <Field label="Name Planpaket" full>
              <TextInput
                value={form.titel}
                onChange={(v) => set('titel', v)}
                placeholder="z.B. Eisenbahnüberführung Nordkanal"
              />
            </Field>
            <Field label="Kurzzeichen" hint="optional, z.B. PP-Nordkanal">
              <TextInput value={form.nummer} onChange={(v) => set('nummer', v)} />
            </Field>
            <Field label="Gewerk" hint="Auswahl oder freie Eingabe">
              <input
                className="input"
                list="paket-gewerke"
                value={form.gewerk}
                onChange={(e) => set('gewerk', e.target.value)}
                placeholder="KIB, VA, OLA …"
              />
              <datalist id="paket-gewerke">
                {gewerkeFuerProjekt(data, project.id).map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
            </Field>
            <Field label="Bemerkung" full>
              <TextArea value={form.bemerkung} onChange={(v) => set('bemerkung', v)} rows={2} />
            </Field>
          </div>

          {paket ? (
            <div>
              <div className="row-between" style={{ marginBottom: 6 }}>
                <h3>Inhalt</h3>
                <span className="small tertiary">
                  {inhalt.length} {inhalt.length === 1 ? 'Eintrag' : 'Einträge'} · Pläne eines Verzeichnisses folgen
                  ihrem Verzeichnis
                </span>
              </div>
              <div className="card">
                {inhalt.length === 0 ? (
                  <div className="list-row small tertiary">Noch nichts zugeordnet.</div>
                ) : (
                  inhalt.map((d) => (
                    <div className="list-row" key={d.id}>
                      <DocKindIcon kind={d.kind} />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span className="num">
                          {d.nummer}
                          {d.index ? ` · ${INDEX_LABEL[d.kind]} ${d.index}` : ''}
                        </span>
                        <div className="small">{d.titel}</div>
                      </span>
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => zuweisen(d.id, null)}
                        title="Aus dem Planpaket entfernen"
                      >
                        Entfernen
                      </button>
                    </div>
                  ))
                )}
                <div className="list-row">
                  {ohnePaket.length === 0 ? (
                    <span className="small tertiary">
                      Alle Pläne und Verzeichnisse sind bereits einem Paket zugeordnet.
                    </span>
                  ) : (
                    <span className="row wrap" style={{ gap: 8, flex: 1 }}>
                      <span className="small muted">Hinzufügen:</span>
                      <Select
                        value=""
                        onChange={(v) => v && zuweisen(v, paket.id)}
                        placeholder="– Plan oder Planverzeichnis –"
                        options={ohnePaket.map((d) => ({
                          value: d.id,
                          label: `${DOCUMENT_KIND_LABEL[d.kind]} ${d.nummer} · ${d.titel}`,
                        }))}
                      />
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </Modal>

      {loeschen && paket ? (
        <ConfirmDialog
          titel="Planpaket löschen?"
          text={`„${paket.titel}“ wird gelöscht. Die enthaltenen Pläne und Planverzeichnisse bleiben mit ihren Planläufen erhalten – sie sind dann keinem Paket mehr zugeordnet.`}
          onConfirm={() => {
            deleteDocument(paket.id);
            toast('Planpaket gelöscht.');
            onClose();
          }}
          onClose={() => setLoeschen(false)}
        />
      ) : null}
    </>
  );
}
