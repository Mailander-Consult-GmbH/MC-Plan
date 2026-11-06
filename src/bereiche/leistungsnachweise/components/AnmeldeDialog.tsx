/**
 * Anmeldung im Bereich „Leistungsnachweise“. Wer angemeldet ist, steht unter
 * „Angemeldet als“ – derselbe Name in allen Bereichen (src/gemeinsam/benutzer.ts).
 * Leistungen erfasst hier, wer unter diesem Namen als Mitarbeiter geführt ist
 * (`mitarbeiterZumNamen`); der Store zieht die Zuordnung nach jeder Änderung
 * nach. Fehlt die Person in der Mitarbeiterliste, legt sie sich hier selbst an
 * (`selbstAnlegen`) – der Dialog setzt dabei auch den gemeinsamen Namen.
 *
 * Solange die Daten nur im Browser liegen, ist die Anmeldung eine Angabe ohne
 * Kennwort (`RECHTE_HINWEIS`).
 *
 * `useAnmeldung` öffnet den Dialog von überall im Bereich (App.tsx stellt ihn
 * bereit) – mit einer Fortsetzung, die nach der Anmeldung läuft: „Leistung
 * erfassen“ und „Excel-Import“ führen ohne Anmeldung zuerst hierher und danach
 * weiter (`useMitAnmeldung`).
 */
import { createContext, useContext, useId, useState } from 'react';
import { benutzerAendern, namensTeile, useBenutzer } from '../../../gemeinsam/benutzer';
import { useToast } from '../../../shared/toast';
import { Callout, Field, Modal, TextInput } from '../../../shared/ui';
import { kuerzelFrei } from '../domain/import';
import { RECHTE_HINWEIS, angemeldet, mitarbeiterZumNamen } from '../domain/rechte';
import { kuerzelAus, mitarbeiterName, type LeistungsnachweisDaten } from '../domain/types';
import { useStore } from '../store/store';
import { nachNamen } from './common';

/* ------------------------------------------------------------------ */
/* Öffnen von überall                                                  */
/* ------------------------------------------------------------------ */

/** Öffnet den Anmeldedialog; `danach` läuft nach erfolgreicher Anmeldung. */
export type AnmeldungOeffnen = (danach?: () => void) => void;

const AnmeldungKontext = createContext<AnmeldungOeffnen>(() => {});

/** Stellt das Öffnen des Anmeldedialogs bereit (App.tsx). */
export const AnmeldungBereitstellen = AnmeldungKontext.Provider;

/** Öffnet den Anmeldedialog. */
export function useAnmeldung(): AnmeldungOeffnen {
  return useContext(AnmeldungKontext);
}

/**
 * Führt eine Handlung aus, wenn jemand angemeldet ist – sonst erst die
 * Anmeldung und danach die Handlung (etwa „Leistung erfassen“). Die Handlung
 * darf nach der Anmeldung nur Zustände der Oberfläche setzen (einen Dialog
 * öffnen): Store-Methoden aus der Zeit vor der Anmeldung prüfen die Rechte auf
 * dem alten Stand und ändern nichts. Für sie `useAnmeldung` ohne Fortsetzung.
 */
export function useMitAnmeldung(): (fn: () => void) => void {
  const { data } = useStore();
  const oeffnen = useAnmeldung();
  return (fn) => (angemeldet(data) ? fn() : oeffnen(fn));
}

/**
 * Hinweis oben im Inhalt, solange der Name unter „Angemeldet als“ keinem
 * aktiven Mitarbeiter gehört – mit Knopf zum Anmelden bzw. Anlegen.
 */
export function AnmeldeHinweis({ daten }: { daten: LeistungsnachweisDaten }) {
  const oeffnen = useAnmeldung();
  const { name } = useBenutzer();
  if (angemeldet(daten)) return null;
  const ausgeschieden = mitarbeiterZumNamen(daten.mitarbeiter, name, true);
  return (
    <div className="ln-anmeldehinweis">
      <Callout icon="i">
        <div className="row-between wrap">
          <span>
            {ausgeschieden
              ? `${mitarbeiterName(ausgeschieden) || ausgeschieden.kuerzel} ist als ausgeschieden markiert – Leistungen erfasst nur, wer aktiv ist. Das Controlling kann die Person unter „Mitarbeiter“ wieder aktiv setzen.`
              : `Unter „${name}“ ist kein Mitarbeiter geführt – Leistungen erfasst, wer als Mitarbeiter angemeldet ist.`}
          </span>
          {ausgeschieden ? null : (
            <button type="button" className="btn btn-sm btn-primary" onClick={() => oeffnen()}>
              Als Mitarbeiter anmelden
            </button>
          )}
        </div>
      </Callout>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dialog                                                              */
/* ------------------------------------------------------------------ */

/**
 * Als Mitarbeiter anmelden: Name (setzt „Angemeldet als“ für alle Bereiche)
 * und – für eine neue Person – das Kürzel. Gehört der Name einem aktiven
 * Mitarbeiter, ist man damit angemeldet; sonst wird die Person angelegt.
 */
export function AnmeldeDialog({
  onClose,
  onAngemeldet,
}: {
  onClose: () => void;
  /** Läuft nach erfolgreicher Anmeldung. */
  onAngemeldet?: () => void;
}) {
  const { data, selbstAnlegen } = useStore();
  const benutzer = useBenutzer();
  const toast = useToast();
  const liste = useId();
  const aktive = data.mitarbeiter.filter((m) => m.aktiv).sort(nachNamen);

  const [name, setName] = useState(benutzer.name);
  const [kuerzel, setKuerzel] = useState('');

  const vorhanden = mitarbeiterZumNamen(data.mitarbeiter, name);
  const ausgeschieden = vorhanden ? null : mitarbeiterZumNamen(data.mitarbeiter, name, true);
  const { vorname, nachname } = namensTeile(name);
  const kuerzelWunsch = kuerzel.trim() || kuerzelAus(`${vorname} ${nachname}`);
  const kuerzelNeu = kuerzelWunsch ? kuerzelFrei(kuerzelWunsch, data.mitarbeiter) : '';

  const anmelden = () => {
    if (!nachname) {
      toast('Bitte Vor- und Nachnamen angeben.');
      return;
    }
    if (ausgeschieden) return;
    benutzerAendern({ name });
    if (vorhanden) {
      toast(`Angemeldet als ${mitarbeiterName(vorhanden) || vorhanden.kuerzel}.`);
    } else {
      selbstAnlegen({ vorname, nachname, kuerzel });
      toast(`„${name.trim()}“ als Mitarbeiter angelegt und angemeldet.`);
    }
    onClose();
    onAngemeldet?.();
  };

  return (
    <Modal
      titel="Als Mitarbeiter anmelden"
      sub="Leistungen erfasst, wer als Mitarbeiter geführt ist."
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Abbrechen
          </button>
          <button type="button" className="btn btn-primary" onClick={anmelden} disabled={!!ausgeschieden}>
            {vorhanden ? 'Anmelden' : 'Als Mitarbeiter anlegen'}
          </button>
        </>
      }
    >
      <div className="stack ln-anmeldung-dialog">
        <div className="form-grid ln-zweispaltig">
          <Field
            label="Name"
            full
            hint="Vor- und Nachname, wie in der Mitarbeiterliste – er gilt als „Angemeldet als“ in allen Bereichen."
          >
            <TextInput value={name} onChange={setName} list={liste} placeholder="Max Mustermann" autoFocus />
            <datalist id={liste}>
              {aktive.map((m) => (
                <option key={m.id} value={mitarbeiterName(m)} />
              ))}
            </datalist>
          </Field>
          {vorhanden || ausgeschieden ? null : (
            <Field
              label="Kürzel"
              full
              hint={
                kuerzelWunsch && kuerzelNeu !== kuerzelWunsch
                  ? `„${kuerzelWunsch}“ ist bereits vergeben – angelegt wird „${kuerzelNeu}“.`
                  : 'So steht die Person im Export der Zeiterfassung, etwa „MM: Mustermann, Max“. Leer = aus dem Namen.'
              }
            >
              <TextInput value={kuerzel} onChange={setKuerzel} placeholder={kuerzelAus(`${vorname} ${nachname}`) || 'MM'} maxLength={6} />
            </Field>
          )}
        </div>

        {vorhanden ? (
          <Callout icon="i">
            „{mitarbeiterName(vorhanden)}“ ({vorhanden.kuerzel}) steht in der Mitarbeiterliste – mit „Anmelden“ erfassen Sie
            Leistungen unter diesem Namen.
          </Callout>
        ) : ausgeschieden ? (
          <Callout ton="warn" icon="!">
            „{mitarbeiterName(ausgeschieden)}“ ist als ausgeschieden markiert. Das Controlling kann die Person unter
            „Mitarbeiter“ wieder aktiv setzen.
          </Callout>
        ) : nachname ? (
          <Callout icon="i">„{name.trim()}“ steht noch nicht in der Mitarbeiterliste und wird angelegt.</Callout>
        ) : null}

        <p className="small tertiary ln-anmeldung-hinweis">{RECHTE_HINWEIS}</p>
      </div>
    </Modal>
  );
}
