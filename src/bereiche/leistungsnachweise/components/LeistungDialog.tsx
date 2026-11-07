/**
 * Eine eigene Leistung erfassen oder bearbeiten – aus der Liste der Leistungen
 * und aus dem Kalender (components/LeistungsKalender.tsx). Aus dem
 * projektübergreifenden Kalender der Übersicht wählt der Dialog auch das
 * Projekt (`projektAuswahl`). Erfasst wird immer für die angemeldete Person
 * (der Store setzt sie); Leistungen anderer lassen sich nicht ändern, auch
 * nicht im Controlling – der Dialog zeigt sie dann nur an.
 *
 * Die Leistung gehört dem Projekt; in welchem Leistungsnachweis sie erscheint,
 * ergibt sich aus ihrem Datum – außer sie ist nachgereicht oder schon in einem
 * abgeschlossenen Nachweis abgerechnet (`nachweisDerLeistung`; dort bleibt sie
 * auch mit einem neuen Datum, bis das Controlling ihn wieder öffnet). Liegt
 * das Datum in keinem Nachweis, legt der Store nach der Zeitraumregel des
 * Projekts einen an oder verlängert den offenen – der Dialog sagt das vorher
 * an. Ein abgeschlossener Nachweis ändert sich erst nach „Wieder öffnen“ im
 * Controlling. Hat das Projekt genau einen Abschnitt, ist er vorausgewählt.
 */
import { useRef, useState } from 'react';
import { today } from '../../../shared/dates';
import { Icon } from '../../../shared/icons';
import { useToast } from '../../../shared/toast';
import { Callout, ConfirmDialog, Field, Modal, Select, TextArea } from '../../../shared/ui';
import { zahlLesen } from '../domain/import';
import {
  abgerechnetIn,
  mitAbschnittsspalten,
  nachweisDerLeistung,
  nachweiseErgaenzen,
  nachweisFuer,
  type Ergaenzung,
} from '../domain/nachweis';
import { NICHT_ANGEMELDET, angemeldet, darfLeistungAendern } from '../domain/rechte';
import { mitarbeiterName, type ID, type ISODate, type Leistung, type Leistungsnachweis, type LeistungsnachweisDaten, type Projekt } from '../domain/types';
import { imZeitraum, istDatum, langDatum, stundenText, zeitraumText } from '../domain/zeitraum';
import { useStore } from '../store/store';
import { useAnmeldung } from './AnmeldeDialog';
import './leistungen.css';

/** Höchstens so viele Stunden an einem Tag. */
const STUNDEN_HOECHSTENS = 24;

/** Kurzname eines Nachweises für Meldungen und Tabellen: die Überschrift, sonst der Zeitraum („Oktober 2026“). */
export function nachweisName(n: Pick<Leistungsnachweis, 'titel' | 'von' | 'bis'>): string {
  return n.titel.trim() || zeitraumText(n.von, n.bis);
}

/** Stunden für das Eingabefeld: „2,5“. */
const stundenEingabe = (stunden: number) => String(stunden).replace('.', ',');

/** Meldung nach dem Speichern – mit dem Nachweis, der dafür angelegt bzw. erweitert wurde. */
function meldung(basis: string, ergaenzung: Ergaenzung, daten: LeistungsnachweisDaten): string {
  const neu = ergaenzung.neu[0];
  if (neu) return `${basis} – Leistungsnachweis „${nachweisName(neu)}“ angelegt.`;
  const erweitert = ergaenzung.erweitert[0];
  const vorher = erweitert ? daten.nachweise.find((n) => n.id === erweitert.id) : undefined;
  if (erweitert && vorher) {
    return `${basis} – Leistungsnachweis „${nachweisName({ ...vorher, von: erweitert.von, bis: erweitert.bis })}“ erweitert.`;
  }
  return `${basis}.`;
}

/** Hinweis, wenn eine Leistung in einem abgeschlossenen Nachweis liegt. */
export function abgeschlossenHinweis(n: Leistungsnachweis): string {
  return `Die Leistung liegt im abgeschlossenen Nachweis „${nachweisName(n)}“ – er ändert sich erst nach „Wieder öffnen“ im Controlling.`;
}

/**
 * Nachweis, in dem die Leistung mit dem Datum steht: bei einer vorhandenen
 * nach `nachweisDerLeistung` (nachgereicht bzw. abgerechnet zählt vor dem
 * Datum), bei einer neuen der des Datums.
 */
function nachweisMitDatum(daten: LeistungsnachweisDaten, projekt: Projekt, datum: ISODate, leistung?: Leistung): Leistungsnachweis | undefined {
  return leistung ? nachweisDerLeistung(daten, { ...leistung, datum }) : nachweisFuer(daten, projekt.id, datum);
}

/** Was mit dem Nachweis zum gewählten Datum geschieht – als Hinweis unter dem Datum. */
function datumHinweis(daten: LeistungsnachweisDaten, projekt: Projekt, datum: ISODate, leistung?: Leistung): string {
  if (!istDatum(datum)) return 'Tag der Leistung';
  const eigenesDatum = !!leistung && leistung.datum === datum;
  const n = nachweisMitDatum(daten, projekt, datum, leistung);
  if (n) {
    if (n.status !== 'abgeschlossen') return `Erscheint im Leistungsnachweis „${nachweisName(n)}“.`;
    // Beim unveränderten Datum sagt es schon der Hinweis über dem Formular
    if (eigenesDatum) return 'Tag der Leistung';
    // Schon abgerechnet: Sie bleibt dort – kein anderer Nachweis rechnet sie ein zweites Mal ab
    if (!imZeitraum(datum, n.von, n.bis)) {
      return `Bleibt im abgeschlossenen Leistungsnachweis „${nachweisName(n)}“ abgerechnet – mit dem neuen Datum erscheint sie erst, wenn das Controlling ihn wieder öffnet.`;
    }
    return `Liegt im abgeschlossenen Leistungsnachweis „${nachweisName(n)}“ – er ändert sich erst nach „Wieder öffnen“ im Controlling.`;
  }
  if (eigenesDatum) return 'Liegt in keinem Leistungsnachweis.';
  const vorschau = nachweiseErgaenzen(daten, projekt, [datum], new Date().toISOString(), () => 'vorschau');
  if (vorschau.neu[0]) return `Dafür wird der Leistungsnachweis „${nachweisName(vorschau.neu[0])}“ angelegt.`;
  const e = vorschau.erweitert[0];
  const vorher = e ? daten.nachweise.find((x) => x.id === e.id) : undefined;
  if (e && vorher) return `Der Leistungsnachweis „${nachweisName(vorher)}“ wird bis zum ${langDatum(e.bis)} verlängert.`;
  return 'Liegt in keinem Leistungsnachweis.';
}

export function LeistungDialog({
  projektId,
  leistung,
  vorgabeDatum,
  projektAuswahl,
  onClose,
}: {
  /** Projekt der Leistung; mit `projektAuswahl` die Vorgabe. */
  projektId: ID;
  /** Ohne Leistung wird eine neue erfasst. */
  leistung?: Leistung;
  /** Datum einer neuen Leistung; ohne Angabe heute. */
  vorgabeDatum?: ISODate;
  /** Neue Leistung: Projekte zur Wahl im Dialog (projektübergreifender Kalender). */
  projektAuswahl?: Projekt[];
  onClose: () => void;
}) {
  const { data, addLeistung, updateLeistung, deleteLeistung } = useStore();
  const toast = useToast();
  const anmeldung = useAnmeldung();
  const stundenFeld = useRef<HTMLInputElement>(null);
  const waehlbar = !leistung && !!projektAuswahl && projektAuswahl.length > 0;
  const [gewaehltesProjekt, setGewaehltesProjekt] = useState(projektId);
  const projekt = data.projekte.find((p) => p.id === (waehlbar ? gewaehltesProjekt : projektId));
  const abschnitte = projekt?.abschnitte ?? [];

  const [form, setForm] = useState(() => ({
    datum: leistung?.datum ?? (vorgabeDatum && istDatum(vorgabeDatum) ? vorgabeDatum : today()),
    stunden: leistung ? stundenEingabe(leistung.stunden) : '',
    // Bei genau einem Abschnitt ist er für neue Leistungen vorausgewählt
    abschnittId:
      leistung?.abschnittId && abschnitte.some((a) => a.id === leistung.abschnittId)
        ? leistung.abschnittId
        : !leistung && abschnitte.length === 1
          ? abschnitte[0].id
          : '',
    text: leistung?.text ?? '',
  }));
  const [loeschen, setLoeschen] = useState(false);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  // Ein anderes Projekt bringt seine Abschnitte mit – bei genau einem ist er vorausgewählt
  const projektWechseln = (id: string) => {
    const p = data.projekte.find((x) => x.id === id);
    setGewaehltesProjekt(id);
    setForm((f) => ({ ...f, abschnittId: p && p.abschnitte.length === 1 ? p.abschnitte[0].id : '' }));
  };

  if (!projekt) return null;

  const ich = angemeldet(data);
  // Eine fremde Leistung zeigt der Dialog nur an – ändern kann sie nur die Person selbst
  const nurLesen = !!leistung && !darfLeistungAendern(data, leistung);
  const person = leistung ? data.mitarbeiter.find((m) => m.id === leistung.mitarbeiterId) : ich;
  const personName = person ? mitarbeiterName(person) || person.kuerzel : leistung ? 'unbekannten Mitarbeiter' : '';
  const bisherNachweis = leistung ? nachweisDerLeistung(data, leistung) : undefined;
  const spalten = mitAbschnittsspalten(abschnitte);

  const speichern = (weitere: boolean) => {
    if (nurLesen) return;
    if (!ich) {
      toast(NICHT_ANGEMELDET);
      return;
    }
    const datum = form.datum;
    if (!istDatum(datum)) {
      toast('Bitte ein Datum angeben.');
      return;
    }
    const stunden = zahlLesen(form.stunden);
    if (stunden === null || !(stunden > 0) || stunden > STUNDEN_HOECHSTENS) {
      toast('Bitte die Stunden angeben (mehr als 0, höchstens 24).');
      return;
    }
    // Zeilenumbrüche im Text bleiben – nur Leerraum am Anfang und Ende fällt weg
    const text = form.text.trim();
    if (!text) {
      toast('Bitte einen Leistungstext angeben.');
      return;
    }
    const abschnittId = abschnitte.some((a) => a.id === form.abschnittId) ? form.abschnittId : null;
    const werte = { datum, stunden, abschnittId, text };

    // Was der Store für das Datum an Nachweisen ergänzt – vorab auf dem angezeigten Stand gerechnet
    const datumNeu = !leistung || (leistung.datum !== datum && !abgerechnetIn(data, leistung));
    const ergaenzung: Ergaenzung = datumNeu
      ? nachweiseErgaenzen(data, projekt, [datum], new Date().toISOString(), () => 'vorschau')
      : { neu: [], erweitert: [] };
    // Nachgereicht bzw. abgerechnet zählt vor dem Datum (`nachweisDerLeistung`); dazu der bisherige Nachweis
    const geschlossen = [nachweisMitDatum(data, projekt, datum, leistung), leistung ? nachweisDerLeistung(data, leistung) : undefined].find(
      (n) => n?.status === 'abgeschlossen',
    );

    if (leistung) {
      updateLeistung(leistung.id, werte);
      toast(meldung('Leistung gespeichert', ergaenzung, data));
    } else {
      if (!addLeistung({ ...werte, projektId: projekt.id, projektelement: '' })) {
        toast(NICHT_ANGEMELDET);
        return;
      }
      toast(meldung('Leistung erfasst', ergaenzung, data));
    }
    if (geschlossen) toast(abgeschlossenHinweis(geschlossen));

    if (weitere) {
      // Datum und Abschnitt bleiben für die nächste Leistung stehen
      setForm((f) => ({ ...f, stunden: '', text: '' }));
      stundenFeld.current?.focus();
    } else {
      onClose();
    }
  };

  const projektText = [projekt.nummer, projekt.name].filter(Boolean).join(' ');

  return (
    <>
      <Modal
        titel={nurLesen ? 'Leistung' : leistung ? 'Leistung bearbeiten' : 'Leistung erfassen'}
        sub={personName ? `für ${personName} · ${projektText}` : projektText}
        onClose={onClose}
        footer={
          nurLesen ? (
            <button type="button" className="btn" onClick={onClose}>
              Schließen
            </button>
          ) : (
            <>
              {leistung ? (
                <button type="button" className="btn btn-danger" onClick={() => setLoeschen(true)}>
                  <Icon name="loeschen" size={14} /> Löschen
                </button>
              ) : null}
              <span className="spacer" />
              <button type="button" className="btn" onClick={onClose}>
                Abbrechen
              </button>
              {!leistung ? (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => speichern(true)}
                  disabled={!ich}
                  title="Speichern und gleich die nächste Leistung erfassen – Datum und Abschnitt bleiben"
                >
                  Speichern und weitere
                </button>
              ) : null}
              <button type="button" className="btn btn-primary" onClick={() => speichern(false)} disabled={!ich}>
                Speichern
              </button>
            </>
          )
        }
      >
        <div className="ln-le-dialog">
          {nurLesen ? (
            <Callout icon="i">
              Leistung von {personName} – nur zu lesen. Ändern und löschen kann sie nur {personName} selbst.
            </Callout>
          ) : null}
          {!ich && !nurLesen ? (
            <Callout ton="warn" icon="!">
              <div className="row-between wrap">
                <span>Erfasst wird für die angemeldete Person – bitte zuerst anmelden.</span>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={() => {
                    onClose();
                    anmeldung();
                  }}
                >
                  Anmelden
                </button>
              </div>
            </Callout>
          ) : null}
          {bisherNachweis?.status === 'abgeschlossen' && !nurLesen ? (
            <Callout ton="warn" icon="!">
              Diese Leistung liegt im abgeschlossenen Leistungsnachweis „{nachweisName(bisherNachweis)}“. Änderungen
              erscheinen dort erst nach „Wieder öffnen“ im Controlling.
            </Callout>
          ) : null}
          {leistung?.quelle === 'import' ? (
            <Callout icon="i">
              Aus dem Excel-Import{leistung.projektelement ? ` (Projektelement „${leistung.projektelement}“)` : ''}.
              {nurLesen ? '' : ' Ein erneuter Import mit „Frühere Importe ersetzen“ stellt den Stand der Datei wieder her.'}
            </Callout>
          ) : null}
          <fieldset className="ln-fieldset" disabled={nurLesen}>
            <div className="form-grid ln-zweispaltig">
              {waehlbar ? (
                <Field label="Projekt" full>
                  <Select
                    value={projekt.id}
                    onChange={projektWechseln}
                    options={projektAuswahl.map((p) => ({ value: p.id, label: [p.nummer, p.name].filter(Boolean).join(' ') }))}
                  />
                </Field>
              ) : null}
              <Field
                label="Datum"
                hint={nurLesen ? undefined : datumHinweis(data, projekt, form.datum, leistung)}
              >
                <input
                  className="input"
                  type="date"
                  value={form.datum}
                  onChange={(e) => set('datum', e.target.value)}
                  autoFocus={!leistung && !vorgabeDatum}
                />
              </Field>
              <Field label="Stunden" hint={nurLesen ? undefined : 'Mit Komma oder Punkt, etwa 2,5 – höchstens 24.'}>
                <input
                  ref={stundenFeld}
                  className="input"
                  value={form.stunden}
                  onChange={(e) => set('stunden', e.target.value)}
                  inputMode="decimal"
                  placeholder="z. B. 2,5"
                  autoFocus={!leistung && !!vorgabeDatum}
                />
              </Field>
              {abschnitte.length > 0 ? (
                <Field
                  label="Abschnitt"
                  hint={
                    spalten
                      ? 'Spalte im Nachweis unter „Aufwand (Std)“.'
                      : 'Das Projekt hat einen Abschnitt – der Nachweis zeigt eine Spalte „Stunden“.'
                  }
                >
                  <Select
                    value={form.abschnittId}
                    onChange={(v) => set('abschnittId', v)}
                    options={[
                      { value: '', label: 'ohne Abschnitt' },
                      ...abschnitte.map((a) => ({ value: a.id, label: a.name ? `${a.kurz} – ${a.name}` : a.kurz })),
                    ]}
                  />
                </Field>
              ) : null}
              <Field
                label="Leistungstext"
                full
                hint={nurLesen ? undefined : 'Mehrere Tätigkeiten mit Komma trennen – der Nachweis fasst gleiche Teile einer Zeile zusammen.'}
              >
                <TextArea
                  value={form.text}
                  onChange={(v) => set('text', v)}
                  rows={3}
                  placeholder="z. B. Abstimmung PL, Fortschreibung Terminplan"
                />
              </Field>
            </div>
          </fieldset>
        </div>
      </Modal>

      {loeschen && leistung && !nurLesen ? (
        <ConfirmDialog
          titel="Leistung löschen?"
          text={`Die Leistung vom ${langDatum(leistung.datum)} mit ${stundenText(leistung.stunden)} Std. wird gelöscht.${
            bisherNachweis?.status === 'abgeschlossen'
              ? ` Der abgeschlossene Nachweis „${nachweisName(bisherNachweis)}“ ändert sich erst nach „Wieder öffnen“ im Controlling.`
              : ''
          }`}
          onConfirm={() => {
            deleteLeistung(leistung.id);
            toast('Leistung gelöscht.');
            onClose();
          }}
          onClose={() => setLoeschen(false)}
        />
      ) : null}
    </>
  );
}
