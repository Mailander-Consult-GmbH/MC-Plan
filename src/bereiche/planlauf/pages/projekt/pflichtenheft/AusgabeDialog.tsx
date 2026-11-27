/**
 * „Als PDF ausgeben“: Vor dem Druck vermerkt KaPlan die Ausgabe. Die erste
 * gilt als Aufstellung; danach vergleicht es den Inhalt mit dem Stand der
 * letzten Ausgabe (`pflichtenheftStand`, `aenderungenErmitteln`) und schlägt
 * die Einträge für den Änderungsindex vor – änderbar und abwählbar. Ohne
 * Änderungen druckt es sofort. „Als Vorabzug drucken“ druckt den aktuellen
 * Stand, als Vorabzug gekennzeichnet (Deckblatt und Fuß jeder Seite), ohne
 * eine Ausgabe oder Änderungen festzuhalten – etwa zur Abstimmung.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  PFLICHTENHEFT_LOGO,
  PFLICHTENHEFT_STIL,
  aenderungenErmitteln,
  pflichtenheftDateiname,
  pflichtenheftHtml,
  pflichtenheftStand,
} from '../../../domain/pflichtenheft';
import type { AppData, Pflichtenheft, Project } from '../../../domain/types';
import { useStore } from '../../../store/store';
import { bildAlsDatenUrl, druckeHtml } from '../../../../../shared/print';
import { formatDate, today } from '../../../../../shared/dates';
import { useToast } from '../../../../../shared/toast';
import { Modal, TextInput } from '../../../../../shared/ui';

/** Druckt mit dem Logo (geladen, sobald die Seite des Pflichtenhefts offen ist) und schlägt „Pflichtenheft_<Projektname>“ als Dateinamen vor. */
async function drucken(data: AppData, project: Project, ph: Pflichtenheft, vorabzug = false): Promise<void> {
  const logo = await bildAlsDatenUrl(PFLICHTENHEFT_LOGO);
  druckeHtml(
    pflichtenheftDateiname(project, vorabzug),
    pflichtenheftHtml(data, project, ph, { logo, ...(vorabzug ? { vorabzug: today() } : {}) }),
    PFLICHTENHEFT_STIL,
    { titelAlsDateiname: true },
  );
}

export function AusgabeDialog({ project, ph, onClose }: { project: Project; ph: Pflichtenheft; onClose: () => void }) {
  const { data, pflichtenheftAusgeben } = useStore();
  const toast = useToast();
  const erst = ph.ausgaben.length === 0;
  const vorschlag = useMemo(
    () => (ph.stand ? aenderungenErmitteln(ph.stand, pflichtenheftStand(data, project, ph)) : []),
    // Nur beim Öffnen ermitteln – sonst ersetzte jede Eingabe die bearbeiteten Einträge
    [],
  );
  const [eintraege, setEintraege] = useState(vorschlag.map((x) => ({ ...x, an: true })));
  const sofort = !erst && ph.stand !== null && vorschlag.length === 0;
  const erledigt = useRef(false);

  // Nichts zu vermerken: gleich drucken (bei einem Pflichtenheft ohne früheren Stand den Stand festhalten)
  useEffect(() => {
    if (erledigt.current) return;
    if (sofort) {
      erledigt.current = true;
      void drucken(data, project, ph);
      onClose();
    } else if (!erst && ph.stand === null) {
      erledigt.current = true;
      pflichtenheftAusgeben(project.id, []);
      void drucken(data, project, ph);
      onClose();
    }
  }, [sofort, erst, ph, data, project, onClose, pflichtenheftAusgeben]);
  if (sofort || (!erst && ph.stand === null)) return null;

  const gewaehlt = eintraege.filter((x) => x.an && x.text.trim()).map(({ stelle, text }) => ({ stelle, text: text.trim() }));
  const vermerken = () => {
    pflichtenheftAusgeben(project.id, gewaehlt);
    // Gedruckt wird der Stand mit der neuen Ausgabe – wie ihn der Store gleich speichert
    const neu: Pflichtenheft =
      erst || gewaehlt.length > 0
        ? {
            ...ph,
            ausgaben: [...ph.ausgaben, { id: 'neu', datum: today(), von: data.bearbeiter.name, aenderungen: erst ? [] : gewaehlt.map((x, i) => ({ id: `neu-${i}`, ...x })) }],
          }
        : ph;
    void drucken(data, project, neu);
    toast(erst ? 'Erste Ausgabe vermerkt.' : gewaehlt.length > 0 ? `Ausgabe mit ${gewaehlt.length} ${gewaehlt.length === 1 ? 'Änderung' : 'Änderungen'} vermerkt.` : 'Ausgegeben – ohne Eintrag im Änderungsindex.');
    onClose();
  };
  const letzte = ph.ausgaben[ph.ausgaben.length - 1];

  return (
    <Modal
      titel={erst ? 'Pflichtenheft ausgeben' : 'Änderungen vermerken'}
      sub={erst ? 'Erste Ausgabe' : `Seit der Ausgabe vom ${formatDate(letzte.datum)}`}
      onClose={onClose}
      wide={!erst}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Abbrechen
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => {
              void drucken(data, project, ph, true);
              toast('Vorabzug – nichts vermerkt.');
              onClose();
            }}
            title="Druckt den aktuellen Stand als Vorabzug (so gekennzeichnet), ohne eine Ausgabe oder Änderungen zu vermerken – etwa zur Abstimmung"
          >
            Als Vorabzug drucken
          </button>
          <button type="button" className="btn btn-primary" onClick={vermerken}>
            {erst ? 'Ausgeben' : 'Vermerken und ausgeben'}
          </button>
        </>
      }
    >
      {erst ? (
        <p>
          Die erste Ausgabe gilt als Aufstellung: Ihr Datum ({formatDate(today())}) steht auf dem Deckblatt unter „Aufgestellt“, sofern
          dort keines eingetragen ist. Ab jetzt erkennt KaPlan Änderungen und vermerkt sie bei der nächsten Ausgabe im Änderungsindex.
          „Als Vorabzug drucken“ druckt dagegen nur – als Vorabzug gekennzeichnet, ohne etwas zu vermerken.
        </p>
      ) : (
        <div className="stack" style={{ gap: 10 }}>
          <p className="small muted">
            Die gewählten Einträge erscheinen im Änderungsindex; „Zuletzt geändert“ auf dem Deckblatt erhält das heutige Datum. Die
            Texte lassen sich anpassen.
          </p>
          <div className="phe-aenderungen">
            {eintraege.map((x, i) => (
              <div key={i} className="phe-aenderung-wahl">
                <input
                  type="checkbox"
                  checked={x.an}
                  onChange={(e) => setEintraege((l) => l.map((y, j) => (j === i ? { ...y, an: e.target.checked } : y)))}
                  aria-label={`„${x.text}“ vermerken`}
                />
                <span className="phe-stelle">{x.stelle}</span>
                <TextInput
                  value={x.text}
                  onChange={(v) => setEintraege((l) => l.map((y, j) => (j === i ? { ...y, text: v } : y)))}
                  aria-label={`Eintrag ${x.stelle}`}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
