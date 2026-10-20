/**
 * Export der Planläufe eines Projekts als Excel-Arbeitsmappe oder PDF (über
 * den Druckdialog).
 *
 * Kurzfassung: genau die Angaben der Übersicht im Reiter „Planläufe“.
 * Langfassung: zusätzlich alle durchlaufenen und ausstehenden Schritte.
 * Die Auswahl der Einträge ist wie die Übersicht nach Planpaketen gegliedert.
 */
import { useState } from 'react';
import {
  EXPORT_STIL,
  UMFANG_LABEL,
  berichtBilden,
  exportDateiname,
  exportHtml,
  kurzZeilen,
  langZeilen,
  zeilenDokument,
  type BerichtGruppe,
  type BerichtZeile,
  type ExportUmfang,
} from '../../domain/export';
import { INDEX_LABEL, type ID, type PlanDocument, type Project } from '../../domain/types';
import { druckeHtml } from '../../../../shared/print';
import { dateiLaden, xlsxErzeugen } from '../../../../shared/xlsx';
import { useStore } from '../../store/store';
import { useToast } from '../../../../shared/toast';
import { Callout, Field, Modal, Segmented } from '../../../../shared/ui';
import { DocKindIcon } from '../../components/common';
import { Icon } from '../../../../shared/icons';

/** Auswählbare Dokumente einer Zeilenfolge (Klammern selbst sind nicht auswählbar). */
const dokumenteVon = (zeilen: BerichtZeile[]): ID[] =>
  [...new Set(zeilen.map(zeilenDokument).filter((id): id is ID => Boolean(id)))];

export function ExportDialog({ project, onClose }: { project: Project; onClose: () => void }) {
  const { data } = useStore();
  const toast = useToast();

  // Die Auswahl zeigt alles, was die Übersicht zeigt – in derselben Gliederung.
  const bericht = berichtBilden(data, project);
  const alleIds = dokumenteVon(bericht.gruppen.flatMap((g) => g.zeilen));

  const [umfang, setUmfang] = useState<ExportUmfang>('kurz');
  const [auswahl, setAuswahl] = useState<Set<ID>>(() => new Set(alleIds));

  const gewaehlt = alleIds.filter((id) => auswahl.has(id)).length;

  const umschalten = (ids: ID[]) =>
    setAuswahl((alt) => {
      const neu = new Set(alt);
      const alleDrin = ids.every((id) => neu.has(id));
      ids.forEach((id) => (alleDrin ? neu.delete(id) : neu.add(id)));
      return neu;
    });

  const alleUmschalten = () => setAuswahl(gewaehlt === alleIds.length ? new Set() : new Set(alleIds));

  const alsExcel = () => {
    if (gewaehlt === 0) {
      toast('Bitte mindestens einen Eintrag auswählen.');
      return;
    }
    const zeilen = umfang === 'kurz' ? kurzZeilen(data, project, auswahl) : langZeilen(data, project, auswahl);
    const blob = xlsxErzeugen([{ name: UMFANG_LABEL[umfang], zeilen }]);
    dateiLaden(blob, `${exportDateiname(project, umfang)}.xlsx`);
    toast('Excel-Datei wurde erzeugt.');
    onClose();
  };

  const alsPdf = () => {
    if (gewaehlt === 0) {
      toast('Bitte mindestens einen Eintrag auswählen.');
      return;
    }
    druckeHtml(exportDateiname(project, umfang), exportHtml(data, project, auswahl, umfang), EXPORT_STIL);
    toast('Druckdialog geöffnet – dort „Als PDF sichern“ wählen.');
  };

  /** Kleiner Haken für eine Gruppe von Dokumenten – gesetzt, wenn alle gewählt sind. */
  const Haken = ({ ids }: { ids: ID[] }) => (
    <input
      type="checkbox"
      checked={ids.length > 0 && ids.every((id) => auswahl.has(id))}
      ref={(el) => {
        if (el) el.indeterminate = ids.some((id) => auswahl.has(id)) && !ids.every((id) => auswahl.has(id));
      }}
      onChange={() => umschalten(ids)}
      style={{ width: 15, height: 15, accentColor: 'var(--accent)' }}
    />
  );

  const eintragText = (doc: PlanDocument | undefined, name: string) => (
    <span style={{ flex: 1, minWidth: 0 }}>
      <span className="num">
        {doc?.nummer}
        {doc?.index ? ` · ${INDEX_LABEL[doc.kind]} ${doc.index}` : ''}
      </span>{' '}
      <strong>{doc?.titel ?? name}</strong>
    </span>
  );

  const gruppenTitel = (g: BerichtGruppe) =>
    g.art === 'paket' ? g.paket?.titel : g.art === 'ohne-paket' ? 'Ohne Planpaket' : 'Abgebrochen';

  return (
    <Modal
      titel="Planläufe exportieren"
      sub={`${project.nummer} · ${project.name}`}
      wide
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Abbrechen
          </button>
          <button type="button" className="btn btn-outline" onClick={alsPdf} disabled={gewaehlt === 0}>
            <Icon name="export" size={14} /> PDF
          </button>
          <button type="button" className="btn btn-primary" onClick={alsExcel} disabled={gewaehlt === 0}>
            <Icon name="export" size={14} /> Excel
          </button>
        </>
      }
    >
      <div className="stack" style={{ gap: 16 }}>
        <Field label="Umfang">
          <Segmented<ExportUmfang>
            value={umfang}
            onChange={setUmfang}
            options={[
              { value: 'kurz', label: 'Kurzfassung' },
              { value: 'lang', label: 'Langfassung' },
            ]}
          />
          <span className="hint">
            {umfang === 'kurz'
              ? 'Genau die Angaben des Reiters „Planläufe“: Aktueller Stand, Nächster Schritt, Zuständig, Fortschritt und Status. Als PDF wie im Programm, in Excel jede Angabe in einer eigenen Spalte.'
              : 'Je Planlauf alle bereits durchlaufenen und alle ausstehenden Schritte mit Verantwortlichen – gegliedert nach Planpaketen.'}
          </span>
        </Field>

        <div>
          <div className="row-between" style={{ marginBottom: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>
              Einträge ({gewaehlt} von {alleIds.length})
            </label>
            <button type="button" className="btn btn-sm btn-ghost" onClick={alleUmschalten}>
              {gewaehlt === alleIds.length ? 'Keinen' : 'Alle'} auswählen
            </button>
          </div>

          {alleIds.length === 0 ? (
            <Callout ton="warn" icon="!">
              In diesem Projekt gibt es noch keinen Planlauf.
            </Callout>
          ) : (
            <div className="card" style={{ maxHeight: 300, overflowY: 'auto' }}>
              {bericht.gruppen.map((gruppe, gi) => {
                const ids = dokumenteVon(gruppe.zeilen);
                const kopf = gruppe.art !== 'ohne-paket' || bericht.mitPaketen;
                return (
                  <div key={gi}>
                    {kopf ? (
                      <label className="list-row clickable" style={{ cursor: 'pointer', background: 'var(--fill-gruppe)' }}>
                        <Haken ids={ids} />
                        {gruppe.art === 'paket' ? <DocKindIcon kind="paket" /> : null}
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <strong>{gruppenTitel(gruppe)}</strong>
                          <span className="small tertiary">
                            {' '}
                            · {ids.length} {ids.length === 1 ? 'Eintrag' : 'Einträge'}
                          </span>
                        </span>
                      </label>
                    ) : null}
                    {gruppe.zeilen.map((zeile, zi) => {
                      const einzug = (kopf ? 26 : 0) + zeile.ebene * 22;
                      if (zeile.art === 'klammer') {
                        // Die Klammer wählt die Pläne aus, die unter ihr folgen
                        const kinder: BerichtZeile[] = [];
                        for (const z of gruppe.zeilen.slice(zi + 1)) {
                          if (z.ebene === 0) break;
                          kinder.push(z);
                        }
                        return (
                          <label key={zi} className="list-row clickable" style={{ cursor: 'pointer', paddingLeft: 20 + einzug }}>
                            <Haken ids={dokumenteVon(kinder)} />
                            <DocKindIcon kind="verzeichnis" />
                            {eintragText(zeile.verzeichnis, '')}
                            <span className="small tertiary">Pläne einzeln</span>
                          </label>
                        );
                      }
                      const id = zeilenDokument(zeile)!;
                      const doc = zeile.art === 'mitlaufend' ? zeile.plan : zeile.eintrag.doc;
                      return (
                        <label key={zi} className="list-row clickable" style={{ cursor: 'pointer', paddingLeft: 20 + einzug }}>
                          <Haken ids={[id]} />
                          {doc ? <DocKindIcon kind={doc.kind} /> : null}
                          {eintragText(doc, zeile.art === 'lauf' ? zeile.eintrag.run.name : '')}
                          {zeile.art === 'mitlaufend' ? (
                            <span className="small tertiary">läuft im Verzeichnis mit</span>
                          ) : null}
                        </label>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <p className="small tertiary">
          Excel wird als .xlsx-Datei heruntergeladen. Für PDF öffnet sich der Druckdialog des Browsers – dort
          „Als PDF sichern“ (bzw. „Microsoft Print to PDF“) wählen.
        </p>
      </div>
    </Modal>
  );
}
