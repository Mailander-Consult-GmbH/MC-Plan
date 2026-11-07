/**
 * „Leistungstexte“ eines Projekts im Bereich – die Vorgabe der Projektseite
 * (ProjektDetail.tsx). Je Monat (‹ ›) die Erfassungsperioden mit eigenen
 * Leistungen (`monatsStatus`, domain/erfassung.ts) im Raster des Projekts, das
 * das Controlling einstellt (abgerechnete im Raster ihres Abschlusses); eine
 * Woche über ein Monatsende steht in jedem Monat mit ihrem Teil. Je Periode: Zeitraum, die eigenen Stunden und die
 * eigenen Stichpunkte zur Orientierung (anklicken bearbeitet die Leistung),
 * darunter der gemeinsame Leistungstext, den alle mit Leistungen in der Periode
 * sehen und bearbeiten – gespeichert beim Verlassen des Felds
 * (`periodentextSetzen` mit `neueStichpunkteOffenLassen`), mit „Zuletzt
 * bearbeitet von … am …“. Offene Eingaben gehen auch nicht verloren, wenn die
 * Seite ohne Verlassen des Felds neu geladen, geschlossen oder verdeckt wird
 * (`pagehide`, `visibilitychange` – synchron gespeichert über `flushSync`)
 * oder der Monat wechselt (etwa mit „Zurück“ im Browser); Gespeichertes ist
 * danach kein Entwurf mehr – zurück im Fenster zeigt das Feld den aktuellen
 * gemeinsamen Text, auch den eines anderen Fensters.
 *
 * Jeder Entwurf merkt sich den gespeicherten Text, von dem er ausging
 * (`Entwurf.basis`). Hat inzwischen jemand anderes – etwa in einem anderen
 * Fenster – den Text gespeichert, überschreibt ihn der Entwurf nicht still:
 * Das Feld sagt es an, und gespeichert wird die dreiseitige Zusammenführung
 * beider Fassungen (`texteDreiseitig` – was der andere gelöscht hat, kehrt
 * nicht zurück; nur die eigenen Änderungen kommen hinzu) mit einer Kurzmeldung;
 * ein netto unveränderter Entwurf entfällt. Entfällt der
 * Zeitraum eines Entwurfs (geänderte Grenzen der Nachweise), zieht er mit
 * seinen eigenen Änderungen in den Zeitraum um, der seinen Beginn jetzt enthält; gibt es keinen (keine
 * eigenen Leistungen mehr, inzwischen abgerechnet) oder scheitert das
 * Speichern sonst, steht die Eingabe als „Nicht gespeichert“ über den
 * Zeiträumen, statt still zu verschwinden.
 * „Stichpunkte übernehmen“ setzt in einen leeren Text
 * die eigenen Stichpunkte ein (`automatikText`), „Neue Stichpunkte ergänzen“
 * hängt eigene an, die noch nicht im Text stehen (`textErgaenzen`); „Als
 * berücksichtigt markieren“ merkt sie, ohne den Text zu ändern (etwa wenn sie
 * umformuliert schon darin stehen).
 *
 * Stichpunkte, Stunden und Leistungen der anderen zeigt die Seite nicht – auch
 * nicht als Zahl (`stichpunkteDerPeriode`, domain/rechte.ts); gemeinsam ist
 * allein der Text. Umfasst ein abgeschlossener Nachweis die Periode, ist der
 * Text nur zu lesen (`gesperrtHinweis`); danach erfasste bzw. geänderte eigene
 * Leistungen nennt ein Hinweis (`nachAbschlussHinweis`), ebenso abgerechnete
 * Leistungen, deren Datum danach aus ihrem Nachweis herausgelegt wurde
 * (`anderswoAbgerechnetHinweis` – sie zählen zu keinem Zeitraum). Endet ein
 * Leistungsnachweis mitten in einer Periode (etwa beim Abschluss), steht der
 * Rest als eigener Zeitraum darunter.
 *
 * Unten bestätigt die Person den Monat (`monatBestaetigen`) – erst, wenn jede
 * nicht gesperrte Periode einen Text hat; bis dahin nennt die Karte die
 * fehlenden. Ändern sich danach die eigenen Leistungen oder ein gemeinsamer
 * Text in einem Zeitraum, der noch nicht abgerechnet ist, ist die Bestätigung
 * erloschen (Status „geändert“). „Bestätigung
 * zurücknehmen“ steht klein neben „Bestätigt am …“ – nicht dort, wo eben
 * „Monat bestätigen“ stand –, und ein zweiter Klick kurz nach dem Umschalten
 * zählt nicht: Ein Doppelklick bestätigt nicht und nimmt gleich wieder zurück.
 */
import { useCallback, useEffect, useId, useRef, useState, type MouseEvent } from 'react';
import { flushSync } from 'react-dom';
import { today, wochentag } from '../../../../shared/dates';
import { Icon, type IconName } from '../../../../shared/icons';
import { useToast } from '../../../../shared/toast';
import { Badge, Callout, Card, EmptyState } from '../../../../shared/ui';
import { useMitAnmeldung } from '../../components/Anmeldung';
import { ImportDialog } from '../../components/ImportDialog';
import { LeistungDialog } from '../../components/LeistungDialog';
import { Textfeld } from '../../components/Textfeld';
import { anzahl, zeitpunkt } from '../../components/common';
import {
  anderswoAbgerechnetHinweis,
  bestaetigungsSatz,
  gesperrtHinweis,
  monatName,
  monatsStatus,
  monatsStatusBadge,
  monatsStatusText,
  monatVerschieben,
  nachAbschlussHinweis,
  offeneBestaetigungen,
  periodeKurztext,
  type ErfassungsPeriode,
  type MonatsStatusArt,
} from '../../domain/erfassung';
import { automatikText, textErgaenzen, texteDreiseitig } from '../../domain/nachweis';
import { angemeldet, darfPeriodentextBearbeiten, stichpunkteDerPeriode } from '../../domain/rechte';
import { RASTER_LABEL, type Leistung, type Projekt } from '../../domain/types';
import { erfassungsPeriodeAusSchluessel, kurzDatum, stundenText } from '../../domain/zeitraum';
import type { Route } from '../../lib/router';
import { useStore } from '../../store/store';
import '../../components/erfassung.css';

/** Ungespeicherte Eingabe in einem Zeitraum. */
interface Entwurf {
  text: string;
  /** Der gespeicherte gemeinsame Text, als die Eingabe begann – weicht der heutige ab, hat ihn inzwischen jemand geändert. */
  basis: string;
  /** Zeitraum für Meldungen, etwa „KW 48 · 23.11.26 - 27.11.26“. */
  zeitraum: string;
}

/** Eine Eingabe, die sich nicht speichern ließ – sie steht über den Zeiträumen, bis sie verworfen wird. */
interface NichtGespeichert {
  zeitraum: string;
  text: string;
  grund: string;
}

/**
 * Was beim Speichern eines Entwurfs geschrieben wird: der Entwurf – oder, hat
 * inzwischen jemand anderes den Text gespeichert (`basis` weicht ab), beide
 * Fassungen dreiseitig zusammengeführt (`texteDreiseitig`, `zusammengefuehrt`):
 * Was der andere gelöscht hat, kehrt nicht zurück, die eigenen Ergänzungen und
 * Streichungen bleiben. Ist der Entwurf netto unverändert (gleich der Basis),
 * wird er verworfen – es bleibt der gespeicherte Text.
 */
function zuSpeichern(e: Entwurf, gespeichert: string): { text: string; zusammengefuehrt: boolean } {
  if (gespeichert.trim() === e.basis.trim()) return { text: e.text, zusammengefuehrt: false };
  if (e.text.trim() === e.basis.trim()) return { text: gespeichert, zusammengefuehrt: false };
  return { text: texteDreiseitig(e.basis, gespeichert, e.text), zusammengefuehrt: true };
}

/** Kurzmeldung nach dem Zusammenführen mit einer inzwischen gespeicherten Fassung. */
const zusammengefuehrtMeldung = (zeitraum: string, von: string) =>
  `Den Leistungstext für ${zeitraum} hat inzwischen ${von || 'jemand anderes'} geändert – Ihre Eingabe ist mit dieser Fassung zusammengeführt. Bitte prüfen.`;

/** Kennzeichen des Monatsstands in der Statuszeile. */
const STATUS_ICON: Record<MonatsStatusArt, IconName> = {
  keine: 'info',
  abgerechnet: 'schloss',
  offen: 'frist',
  bestaetigt: 'check',
  geaendert: 'info',
};

export function MonatsErfassung({ projekt, monat, navigate }: { projekt: Projekt; monat: string; navigate: (r: Route) => void }) {
  const { data, zugang, periodentextSetzen, monatBestaetigen, bestaetigungZuruecknehmen } = useStore();
  const toast = useToast();
  const mitAnmeldung = useMitAnmeldung();
  const praefix = useId();
  const ich = angemeldet(data);
  const s = ich ? monatsStatus(data, projekt.id, ich.id, monat) : null;
  // Ungespeicherte Eingaben je Periode (Schlüssel) – gespeichert beim Verlassen des Felds
  const [entwuerfe, setEntwuerfe] = useState<Record<string, Entwurf>>({});
  // Eingaben, die sich nicht speichern ließen – sie bleiben sichtbar, statt still zu verschwinden
  const [nichtGespeichert, setNichtGespeichert] = useState<NichtGespeichert[]>([]);
  // Zog ein Entwurf samt Fokus in einen anderen Zeitraum um, geht der Fokus in dessen Feld
  const [fokusZeitraum, setFokusZeitraum] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Leistung | null>(null);
  const [importOffen, setImportOffen] = useState(false);
  // Nach Bestätigen bzw. Zurücknehmen bleibt der Fokus beim Gegenstück des Knopfs
  const [fokusNach, setFokusNach] = useState<'bestaetigen' | 'zuruecknehmen' | null>(null);
  const bestaetigenKnopf = useRef<HTMLButtonElement>(null);
  const zuruecknehmenKnopf = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!fokusNach) return;
    (fokusNach === 'bestaetigen' ? bestaetigenKnopf : zuruecknehmenKnopf).current?.focus();
    setFokusNach(null);
  }, [fokusNach]);

  // Offene Eingaben speichern, auch ohne dass jemand das Feld verlässt: beim Verlassen der Seite (andere
  // Ansicht, neu laden, schließen), wenn sie verdeckt wird und beim Wechsel des Monats
  const offen = useRef({ entwuerfe, speichern: periodentextSetzen, projektId: projekt.id, data, toast });
  offen.current = { entwuerfe, speichern: periodentextSetzen, projektId: projekt.id, data, toast };
  /** Speichert alle Entwürfe; liefert die, die sich nicht speichern ließen (sie bleiben Entwurf). */
  const alleSpeichern = useCallback((): NichtGespeichert[] => {
    const { entwuerfe: rest, speichern, projektId, data: stand, toast: melden } = offen.current;
    const erledigt: string[] = [];
    const fehlgeschlagen: NichtGespeichert[] = [];
    for (const [schluessel, e] of Object.entries(rest)) {
      const gespeichert = stand.periodentexte.find((t) => t.projektId === projektId && t.schluessel === schluessel);
      const { text, zusammengefuehrt } = zuSpeichern(e, gespeichert?.text ?? '');
      const meldung = text.trim() === (gespeichert?.text ?? '') ? null : speichern(projektId, schluessel, text, { neueStichpunkteOffenLassen: true });
      if (meldung) {
        fehlgeschlagen.push({ zeitraum: e.zeitraum, text: e.text, grund: meldung });
        continue;
      }
      erledigt.push(schluessel);
      if (zusammengefuehrt) melden(zusammengefuehrtMeldung(e.zeitraum, gespeichert?.bearbeiter ?? ''));
    }
    if (erledigt.length > 0) {
      // Gespeichertes ist kein Entwurf mehr: Nach der Rückkehr zeigt das Feld den aktuellen gemeinsamen Text – auch
      // den eines anderen Fensters –, und ein bloßes Verlassen des Felds schreibt den alten Stand nicht noch einmal
      setEntwuerfe((alt) => {
        const neu = { ...alt };
        for (const k of erledigt) if (neu[k] === rest[k]) delete neu[k];
        return neu;
      });
    }
    return fehlgeschlagen;
  }, []);
  useEffect(() => {
    // Beim Entladen läuft kein späterer Durchlauf mehr: synchron rechnen und speichern (Speicher-Effekt des Stores)
    const sofort = () => flushSync(alleSpeichern);
    const beiVerdecken = () => {
      if (document.visibilityState === 'hidden') sofort();
    };
    window.addEventListener('pagehide', sofort);
    document.addEventListener('visibilitychange', beiVerdecken);
    return () => {
      window.removeEventListener('pagehide', sofort);
      document.removeEventListener('visibilitychange', beiVerdecken);
      // Die Seite verschwindet: Was sich nicht speichern ließ, nennt eine Kurzmeldung
      for (const f of alleSpeichern()) offen.current.toast(`Nicht gespeichert (${f.zeitraum}): ${f.grund} Ihre Eingabe: „${f.text}“`);
    };
  }, [alleSpeichern]);
  // Anderer Monat (‹ ›, „Zurück“ im Browser): Die Felder des bisherigen verschwinden ohne Verlassen
  const gezeigterMonat = useRef(monat);
  useEffect(() => {
    if (gezeigterMonat.current === monat) return;
    gezeigterMonat.current = monat;
    const fehlgeschlagen = alleSpeichern();
    setEntwuerfe({});
    if (fehlgeschlagen.length) setNichtGespeichert((alt) => [...alt, ...fehlgeschlagen]);
  }, [monat, alleSpeichern]);
  // Entfällt der Zeitraum eines Entwurfs (ein anderes Fenster hat die Grenzen der Nachweise geändert, Leistungen
  // gelöscht oder abgeschlossen), zieht er in den Zeitraum, der seinen Beginn jetzt enthält – sonst bleibt er sichtbar
  useEffect(() => {
    if (!s) return;
    const offenePerioden = s.perioden.filter((p) => !p.gesperrt);
    const bekannt = new Set(offenePerioden.map((p) => p.schluessel));
    // Entwürfe eines anderen Monats räumt der Monatswechsel oben ab
    const verwaist = Object.keys(entwuerfe).filter((k) => k.slice(0, 7) === monat && !bekannt.has(k));
    if (verwaist.length === 0) return;
    const neu = { ...entwuerfe };
    const weg: NichtGespeichert[] = [];
    // Mit dem Abschnitt des Entwurfs verschwand sein Feld – hatte es den Fokus, folgt er dem Entwurf
    const fokusVerloren = document.activeElement === document.body || document.activeElement === null;
    for (const k of verwaist) {
      const e = neu[k];
      delete neu[k];
      const beginn = erfassungsPeriodeAusSchluessel(k)?.von;
      const ziel = beginn ? offenePerioden.find((p) => p.von <= beginn && beginn <= p.bis) : undefined;
      if (ziel) {
        // Der gespeicherte Text des Teils ging im Text des Zeitraums auf: Nur die eigenen Änderungen daran ziehen um
        // (`texteDreiseitig`) – ein netto unveränderter Entwurf entfällt
        if (e.text.trim() !== e.basis.trim()) {
          const gespeichert = ziel.text?.text ?? '';
          const dort = neu[ziel.schluessel];
          neu[ziel.schluessel] = {
            text: texteDreiseitig(e.basis, dort?.text ?? gespeichert, e.text),
            basis: dort?.basis ?? gespeichert,
            zeitraum: periodeKurztext(ziel),
          };
        }
        if (fokusVerloren) setFokusZeitraum(ziel.schluessel);
      } else {
        const gesperrt = s.perioden.find((p) => p.schluessel === k && p.gesperrt);
        weg.push({
          zeitraum: e.zeitraum,
          text: e.text,
          grund: gesperrt ? gesperrtHinweis(gesperrt) : 'In diesem Zeitraum haben Sie keine eigenen Leistungen mehr.',
        });
      }
    }
    setEntwuerfe(neu);
    if (weg.length) setNichtGespeichert((alt) => [...alt, ...weg]);
  }, [entwuerfe, s, monat]);
  useEffect(() => {
    if (!fokusZeitraum || !s) return;
    const index = s.perioden.findIndex((p) => p.schluessel === fokusZeitraum);
    if (index >= 0) document.getElementById(`${praefix}-text-${index}`)?.focus();
    setFokusZeitraum(null);
  }, [fokusZeitraum, s, praefix]);

  // Ein zweiter Klick kurz nach Bestätigen bzw. Zurücknehmen (Doppelklick, doppeltes Tippen) zählt nicht
  const umgeschaltet = useRef(0);
  const einmal = (e: MouseEvent, fn: () => void) => {
    if (e.detail > 1 || Date.now() - umgeschaltet.current < 800) return;
    umgeschaltet.current = Date.now();
    fn();
  };

  const zuMonat = (m: string) => navigate({ view: 'projekt', projektId: projekt.id, monat: m });
  const textfeldId = (i: number) => `${praefix}-text-${i}`;

  if (!ich || !s) {
    return (
      <Card>
        <EmptyState
          icon="person"
          titel="Nicht als Mitarbeiter angemeldet"
          text="Hier verfassen Sie die Leistungstexte zu Ihren Leistungen und bestätigen den Monat – immer für die Person unter „Angemeldet als“."
        />
      </Card>
    );
  }

  const laufend = monat === today().slice(0, 7);
  const weitereOffene = offeneBestaetigungen(data, ich.id).filter((o) => o.projektId === projekt.id && o.monat !== monat);
  const abschnitte = new Map(projekt.abschnitte.map((a) => [a.id, a]));

  // Wie der Text gerade dasteht – mit der ungespeicherten Eingabe
  const aktuellerText = (p: ErfassungsPeriode) => entwuerfe[p.schluessel]?.text ?? p.text?.text ?? '';
  const fehlend = s.perioden.filter((p) => !p.gesperrt && !aktuellerText(p).trim());
  const bestaetigbar = (s.status === 'offen' || s.status === 'geaendert') && fehlend.length === 0;

  // Die erste Eingabe merkt sich den gespeicherten Text, von dem sie ausgeht
  const entwurfSetzen = (p: ErfassungsPeriode, text: string) =>
    setEntwuerfe((alt) => ({
      ...alt,
      [p.schluessel]: { text, basis: alt[p.schluessel]?.basis ?? p.text?.text ?? '', zeitraum: periodeKurztext(p) },
    }));
  const entwurfVerwerfen = (schluessel: string) =>
    setEntwuerfe((alt) => {
      if (!(schluessel in alt)) return alt;
      const { [schluessel]: _weg, ...rest } = alt;
      return rest;
    });

  /**
   * Speichert die Eingabe beim Verlassen des Felds; die gemerkten Stichpunkte bleiben (Hinweis auf neue bleibt).
   * Hat inzwischen jemand anderes gespeichert, werden beide Fassungen zusammengeführt (`zuSpeichern`); scheitert
   * das Speichern, bleibt die Eingabe ein Entwurf.
   */
  const speichern = (p: ErfassungsPeriode) => {
    const entwurf = entwuerfe[p.schluessel];
    if (entwurf === undefined) return;
    const gespeichert = p.text?.text ?? '';
    if (entwurf.text.trim() === gespeichert) {
      entwurfVerwerfen(p.schluessel);
      return;
    }
    mitAnmeldung(() => {
      const { text, zusammengefuehrt } = zuSpeichern(entwurf, gespeichert);
      if (text.trim() !== gespeichert) {
        const meldung = periodentextSetzen(projekt.id, p.schluessel, text, { neueStichpunkteOffenLassen: true });
        if (meldung) {
          toast(meldung);
          return;
        }
      }
      entwurfVerwerfen(p.schluessel);
      if (zusammengefuehrt) toast(zusammengefuehrtMeldung(entwurf.zeitraum, p.text?.bearbeiter ?? ''));
    });
  };

  /** Setzt einen neuen Text sofort (Stichpunkte übernehmen bzw. ergänzen) und führt zurück ins Feld. */
  const setzen = (p: ErfassungsPeriode, index: number, text: string, erledigt: string) =>
    mitAnmeldung(() => {
      const meldung = periodentextSetzen(projekt.id, p.schluessel, text);
      if (meldung) {
        toast(meldung);
        return;
      }
      entwurfVerwerfen(p.schluessel);
      toast(erledigt);
      document.getElementById(textfeldId(index))?.focus();
    });

  const bestaetigen = () =>
    mitAnmeldung(() => {
      const meldung = monatBestaetigen(projekt.id, monat);
      if (meldung) {
        toast(meldung);
        return;
      }
      toast(`${monatName(monat)} bestätigt.`);
      setFokusNach('zuruecknehmen');
    });

  const zuruecknehmen = () =>
    mitAnmeldung(() => {
      bestaetigungZuruecknehmen(projekt.id, monat);
      toast(`Bestätigung für ${monatName(monat)} zurückgenommen.`);
      setFokusNach('bestaetigen');
    });

  const nachAbschluss = nachAbschlussHinweis(s.nachAbschluss, s.nachAbschlussGeaendert);
  const anderswo = anderswoAbgerechnetHinweis(s.anderswoAbgerechnet);
  const badge = monatsStatusBadge(s);
  const titelId = `${praefix}-titel`;
  const bestaetigenTitelId = `${praefix}-bestaetigen`;

  return (
    <div className="stack ln-me">
      {/* Block 1: alle Zeiträume des Monats mit Stichpunkten und gemeinsamem Text */}
      <section className="card ln-me-texte" aria-labelledby={titelId}>
        <div className="ln-me-kopf">
          <div className="ln-me-kopf-titel">
            <h2 id={titelId}>Leistungstexte</h2>
            <span className="small muted">
              {s.anzahl > 0 ? (
                <>
                  Meine Stunden: <b>{stundenText(s.stunden)} Std.</b> · {anzahl(s.perioden.length, 'Zeitraum', 'Zeiträume')}
                </>
              ) : (
                'Keine eigenen Leistungen in diesem Monat'
              )}{' '}
              · <span title="Gliederung der Zeiträume – stellt das Controlling ein">Raster: {RASTER_LABEL[projekt.raster]}</span>
              {/* Abgerechnete Zeiträume behalten das Raster ihres Abschlusses */}
              {s.perioden.some((p) => p.raster !== projekt.raster) ? ' (abgerechnete Zeiträume im Raster ihres Abschlusses)' : null}
            </span>
          </div>
          <div className="ln-me-kopf-rechts">
            {s.status === 'keine' ? null : <Badge ton={badge.ton}>{badge.text}</Badge>}
            <div className="ln-me-monatwahl" role="group" aria-label="Monat wählen">
              <button
                type="button"
                className="btn-icon"
                aria-label="Vorheriger Monat"
                title="Vorheriger Monat"
                onClick={() => zuMonat(monatVerschieben(monat, -1))}
              >
                <Icon name="zurueck" size={16} />
              </button>
              <strong className="ln-me-monat" aria-live="polite">
                {monatName(monat)}
              </strong>
              <button
                type="button"
                className="btn-icon"
                aria-label="Nächster Monat"
                title="Nächster Monat"
                onClick={() => zuMonat(monatVerschieben(monat, 1))}
              >
                <Icon name="chevron" size={16} />
              </button>
            </div>
          </div>
        </div>

        {s.status === 'keine' ? null : (
          <p className="small tertiary ln-me-erklaerung">
            Je Zeitraum ein gemeinsamer Text für alle, die darin Leistungen haben. Ihre Stichpunkte dienen der Orientierung;
            die der anderen sind hier nicht zu sehen.
          </p>
        )}

        {nichtGespeichert.length > 0 ? (
          <div className="ln-me-hinweise">
            {nichtGespeichert.map((f, i) => (
              <Callout key={`${f.zeitraum}-${i}`} ton="warn" icon="!">
                <div className="stack ln-me-nicht-gespeichert">
                  <span>
                    <strong>Nicht gespeichert ({f.zeitraum}):</strong> {f.grund} Ihre Eingabe:
                  </span>
                  <span className="ln-me-nicht-gespeichert-text">„{f.text}“</span>
                  <div>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      onClick={() => setNichtGespeichert((alt) => alt.filter((x) => x !== f))}
                    >
                      Verwerfen
                    </button>
                  </div>
                </div>
              </Callout>
            ))}
          </div>
        ) : null}

        {s.status === 'keine' ? (
          <EmptyState
            icon="stunden"
            titel={`Keine eigenen Leistungen in ${monatName(monat)}`}
            text="Erfassen Sie Ihre Leistungen im Kalender unter „Meine Leistungen“ oder übernehmen Sie sie per Excel-Import – danach verfassen Sie hier je Zeitraum den Leistungstext und bestätigen den Monat."
            action={
              <div className="row wrap ln-me-leer-knoepfe">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => navigate({ view: 'projekt', projektId: projekt.id, ansicht: 'leistungen' })}
                >
                  <Icon name="kalender" size={14} /> Meine Leistungen
                </button>
                <button type="button" className="btn btn-outline" onClick={() => mitAnmeldung(() => setImportOffen(true))}>
                  <Icon name="importieren" size={14} /> Excel-Import
                </button>
              </div>
            }
          />
        ) : (
          s.perioden.map((p, i) => {
            const { eigene } = stichpunkteDerPeriode(data, p, zugang);
            const bearbeitbar = darfPeriodentextBearbeiten(data, p, zugang);
            const text = aktuellerText(p);
            const entwurf = entwuerfe[p.schluessel];
            const ungespeichert = !!entwurf && entwurf.text.trim() !== (p.text?.text ?? '');
            // Inzwischen von jemand anderem gespeichert – beim Verlassen wird zusammengeführt bzw. ein netto
            // unveränderter Entwurf verworfen (`zuSpeichern`)
            const inzwischen = ungespeichert && (p.text?.text ?? '') !== entwurf.basis.trim();
            const eigeneAenderung = !!entwurf && entwurf.text.trim() !== entwurf.basis.trim();
            const vorschlag = automatikText(eigene);
            const nachAbschlussIds = new Set(p.nachAbschluss.map((l) => l.id));
            const geaendertIds = new Set(p.nachAbschlussGeaendert.map((l) => l.id));
            const periodeTitelId = `${praefix}-titel-${i}`;
            const punkteId = `${praefix}-punkte-${i}`;
            return (
              <section key={p.schluessel} className={`ln-me-periode ${p.gesperrt ? 'ln-me-gesperrt' : ''}`} aria-labelledby={periodeTitelId}>
                <div className="ln-me-periode-kopf">
                  <h3 id={periodeTitelId} className="ln-me-periode-titel">
                    {periodeKurztext(p)}
                  </h3>
                  <div className="ln-me-periode-merkmale">
                    {p.gesperrt ? (
                      <Badge ton="blue">Abgerechnet</Badge>
                    ) : !text.trim() ? (
                      <Badge ton="orange">Text fehlt</Badge>
                    ) : null}
                    <span className="ln-me-stunden" title="Meine Stunden in diesem Zeitraum">
                      <b>{stundenText(p.stundenEigene)}</b> Std.
                    </span>
                  </div>
                </div>

                <div className="ln-me-periode-inhalt">
                  <div className="ln-me-punkte">
                    <div className="ln-me-feldtitel" id={punkteId}>
                      Meine Stichpunkte
                    </div>
                    {/* Datum, Stunden und Stichpunkt in festen Spalten – über alle Zeilen und Zeiträume bündig */}
                    <div className="ln-me-punkt-kopf" aria-hidden="true">
                      <span>Datum</span>
                      <span className="ln-me-punkt-std">Std.</span>
                      <span>Stichpunkt</span>
                    </div>
                    <ul className="ln-me-punktliste" aria-labelledby={punkteId}>
                      {eigene.map((l) => {
                        const a = l.abschnittId ? abschnitte.get(l.abschnittId) : undefined;
                        return (
                          <li key={l.id}>
                            <button
                              type="button"
                              className="ln-me-punkt"
                              onClick={() => setDialog(l)}
                              title="Leistung bearbeiten"
                              aria-label={`Leistung vom ${kurzDatum(l.datum)}, ${stundenText(l.stunden)} Stunden${l.text ? `: ${l.text}` : ''} – bearbeiten`}
                            >
                              <span className="ln-me-punkt-datum">
                                {wochentag(l.datum)} {kurzDatum(l.datum)}
                              </span>
                              <span className="ln-me-punkt-std">{stundenText(l.stunden)}</span>
                              <span className="ln-me-punkt-text">
                                {a ? <span className="ln-me-punkt-abschnitt">{a.kurz}</span> : null}
                                {l.text || <span className="tertiary">ohne Stichpunkt</span>}
                                {nachAbschlussIds.has(l.id) ? <span className="ln-me-punkt-nach">nach dem Abschluss erfasst</span> : null}
                                {geaendertIds.has(l.id) ? <span className="ln-me-punkt-nach">nach dem Abschluss geändert</span> : null}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  <div className="ln-me-text">
                    <div className="ln-me-feldtitel" id={`${praefix}-feld-${i}`}>
                      Gemeinsamer Leistungstext
                    </div>
                    {p.gesperrt ? (
                      <>
                        {p.text ? (
                          <Textfeld
                            id={textfeldId(i)}
                            value={p.text.text}
                            onChange={() => undefined}
                            readOnly
                            aria-labelledby={`${praefix}-feld-${i} ${periodeTitelId}`}
                          />
                        ) : (
                          <p id={textfeldId(i)} className="small tertiary ln-me-ohne">
                            Für diesen Zeitraum gibt es keinen gemeinsamen Leistungstext.
                          </p>
                        )}
                        <p className="small ln-me-gesperrt-hinweis">
                          <Icon name="schloss" size={12} /> {gesperrtHinweis(p)}
                        </p>
                      </>
                    ) : (
                      <>
                        <Textfeld
                          id={textfeldId(i)}
                          value={text}
                          onChange={(v) => entwurfSetzen(p, v)}
                          onBlur={() => speichern(p)}
                          readOnly={!bearbeitbar}
                          aria-labelledby={`${praefix}-feld-${i} ${periodeTitelId}`}
                          placeholder="Was wurde in diesem Zeitraum geleistet? – Ein Text für alle, die hier Leistungen haben."
                          aria-describedby={`${praefix}-stand-${i}`}
                        />
                        <div id={`${praefix}-stand-${i}`} className="ln-me-stand small">
                          {inzwischen && eigeneAenderung ? (
                            <span className="ln-me-ungespeichert">
                              Inzwischen von {p.text?.bearbeiter || 'jemand anderem'} geändert – Ihre Eingabe wird beim Verlassen des
                              Felds mit dieser Fassung zusammengeführt.
                            </span>
                          ) : inzwischen ? (
                            <span className="ln-me-ungespeichert">
                              Inzwischen von {p.text?.bearbeiter || 'jemand anderem'} geändert – Ihre Eingabe ändert nichts daran; beim
                              Verlassen des Felds gilt diese Fassung.
                            </span>
                          ) : ungespeichert ? (
                            <span className="ln-me-ungespeichert">Wird beim Verlassen des Felds gespeichert.</span>
                          ) : p.text ? (
                            <span className="tertiary">
                              Zuletzt bearbeitet von {p.text.bearbeiter || 'unbekannt'} {zeitpunkt(p.text.geaendert)}
                            </span>
                          ) : (
                            <span className="ln-me-pflicht">Pflicht – ohne Text lässt sich der Monat nicht bestätigen.</span>
                          )}
                        </div>
                        {bearbeitbar && !text.trim() && vorschlag ? (
                          <div className="ln-me-aktion">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline"
                              onClick={() => setzen(p, i, vorschlag, 'Stichpunkte übernommen.')}
                              title={`Übernimmt Ihre Stichpunkte: ${vorschlag}`}
                            >
                              <Icon name="kopieren" size={12} /> Stichpunkte übernehmen
                            </button>
                          </div>
                        ) : null}
                        {bearbeitbar && p.text && p.neueStichpunkte.length > 0 ? (
                          <div className="ln-me-neu">
                            <span className="small">
                              <strong>Noch nicht im Text:</strong> {automatikText(p.neueStichpunkte)}
                            </span>
                            <div className="row wrap ln-me-neu-knoepfe">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline"
                                onClick={() => setzen(p, i, textErgaenzen(text, p.neueStichpunkte), 'Neue Stichpunkte ergänzt.')}
                              >
                                <Icon name="plus" size={12} /> Neue Stichpunkte ergänzen
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-ghost"
                                title="Der Text bleibt, wie er ist – etwa wenn die Stichpunkte umformuliert schon darin stehen."
                                onClick={() => setzen(p, i, text, 'Stichpunkte als berücksichtigt markiert.')}
                              >
                                Als berücksichtigt markieren
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>
              </section>
            );
          })
        )}
      </section>

      {/* Block 2: Stand und Bestätigung des Monats, Hinweise und weitere offene Monate */}
      {s.status === 'keine' && weitereOffene.length === 0 ? null : (
        <section className="card ln-me-bestaetigen" aria-labelledby={bestaetigenTitelId}>
          <div className="card-pad">
            <h3 id={bestaetigenTitelId} className="ln-me-bestaetigen-titel">
              Monat bestätigen
            </h3>

            {s.status === 'keine' ? null : s.status === 'bestaetigt' ? (
              // Bestätigt: Stand und „zurücknehmen“ in einer Zeile – der Knopf liegt nie dort, wo eben „Monat bestätigen“ stand
              <div className="row wrap ln-me-bestaetigen-knoepfe" role="status">
                <span className="ln-me-bestaetigt">
                  <Icon name="check" size={14} /> {monatsStatusText(s)}
                </span>
                <button
                  ref={zuruecknehmenKnopf}
                  type="button"
                  className="btn btn-sm btn-ghost ln-me-zuruecknehmen"
                  onClick={(e) => einmal(e, zuruecknehmen)}
                >
                  Bestätigung zurücknehmen
                </button>
              </div>
            ) : (
              <div className={`ln-me-status ln-me-status-${s.status}`} role="status">
                <Icon name={STATUS_ICON[s.status]} size={15} />
                <span>
                  {monatsStatusText(s)}
                  {laufend && (s.status === 'offen' || s.status === 'geaendert') ? (
                    <span className="ln-me-status-zusatz"> · Der Monat läuft noch – bestätigen Sie ihn, wenn er vollständig erfasst ist.</span>
                  ) : null}
                </span>
              </div>
            )}

            {nachAbschluss ? (
              <Callout ton="warn" icon="!">
                {nachAbschluss}
              </Callout>
            ) : null}
            {anderswo ? <Callout icon="i">{anderswo}</Callout> : null}

            {s.status === 'abgerechnet' ? (
              <p className="small muted">
                {s.nachAbschluss.length > 0 || s.nachAbschlussGeaendert.length > 0
                  ? `Alle Zeiträume in ${monatName(monat)} sind abgerechnet – eine Bestätigung ist nicht mehr nötig; über danach erfasste bzw. geänderte Leistungen entscheidet das Controlling.`
                  : `Alle Ihre Leistungen in ${monatName(monat)} sind bereits abgerechnet – eine Bestätigung ist nicht mehr nötig.`}
              </p>
            ) : s.status === 'offen' || s.status === 'geaendert' ? (
              <>
                <p className="ln-me-satz">{bestaetigungsSatz(monat)}</p>
                {fehlend.length > 0 ? (
                  <div className="ln-me-fehlt" id={`${praefix}-fehlt`}>
                    <span>
                      {fehlend.length === 1
                        ? 'Es fehlt noch der Leistungstext für diesen Zeitraum:'
                        : `Es fehlen noch die Leistungstexte für ${fehlend.length} Zeiträume:`}
                    </span>
                    <ul>
                      {fehlend.map((p) => {
                        const index = s.perioden.indexOf(p);
                        return (
                          <li key={p.schluessel}>
                            <button
                              type="button"
                              className="link-btn ln-me-link"
                              onClick={() => document.getElementById(textfeldId(index))?.focus()}
                            >
                              {periodeKurztext(p)}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}
                <div className="row wrap ln-me-bestaetigen-knoepfe">
                  <button
                    ref={bestaetigenKnopf}
                    type="button"
                    className="btn btn-primary"
                    disabled={!bestaetigbar}
                    aria-describedby={fehlend.length > 0 ? `${praefix}-fehlt` : undefined}
                    onClick={(e) => einmal(e, bestaetigen)}
                  >
                    <Icon name="check" size={14} /> Monat bestätigen
                  </button>
                </div>
              </>
            ) : null}

            {weitereOffene.length > 0 ? (
              <div className="ln-me-weitere small">
                <span className="muted">Noch zu bestätigen:</span>
                {weitereOffene.map((o) => (
                  <button key={o.monat} type="button" className="link-btn ln-me-link" onClick={() => zuMonat(o.monat)}>
                    {monatName(o.monat)}
                    {o.status === 'geaendert' ? ' (geändert)' : ''}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </section>
      )}

      {dialog ? <LeistungDialog key={dialog.id} projektId={projekt.id} leistung={dialog} onClose={() => setDialog(null)} /> : null}
      {importOffen ? <ImportDialog onClose={() => setImportOffen(false)} navigate={navigate} /> : null}
    </div>
  );
}
