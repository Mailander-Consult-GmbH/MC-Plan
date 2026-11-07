/**
 * Leistungsnachweise anlegen und ändern – dem Controlling vorbehalten
 * (domain/rechte.ts).
 *
 * * **Neuer Leistungsnachweis** (`NeuerNachweisDialog`) fragt keinen Zeitraum
 *   ab: Er umfasst alle nicht abgerechneten Leistungen des Projekts
 *   (`nichtAbgerechnet`); offene Nachweise gehen darin auf. Der Zeitraum steht
 *   erst beim Abschluss fest. Liegt schon alles in einem offenen Nachweis,
 *   bietet der Dialog „Öffnen“ an. Das Projekt lässt sich im Dialog wählen
 *   (`projektWahl`). Nicht erfasste Leistungen aus schon abgerechneten
 *   Zeiträumen nennt der Dialog (`NichtErfasstHinweis`); übernommen werden sie
 *   erst nach Bestätigung – als nachgereichte.
 * * **Zeitraum ändern** (`ZeitraumDialog`) korrigiert Zeitraum, Raster und
 *   Überschrift eines vorhandenen: ein Kalendermonat (Schnellwahl) oder frei
 *   mit Beginn und Ende – auch über mehrere Monate. Nachweise eines Projekts
 *   überschneiden sich nie; welche Leistungen ein Nachweis zeigt, ergibt sich
 *   aus seinem Zeitraum – dazu die nachgereichten, ohne die schon in einem
 *   anderen abgeschlossenen Nachweis abgerechneten (`leistungenDesNachweises`). Ein
 *   geändertes Ende steht danach fest (`bisFest`): Der Nachweis läuft nicht
 *   mehr bis zum Abschluss, wird nicht verlängert und beim Abschluss nicht
 *   gekürzt. Liefe er mit dem neuen Ende bis zum Abschluss, legt „Ende
 *   festlegen“ das Ende auch ohne Änderung fest (etwa den vorausgewählten
 *   Monat); „Wieder bis zum Abschluss laufen lassen“ hebt ein festgelegtes Ende
 *   auf. Beide Kästchen gibt es nur, wo ein festgelegtes Ende etwas bewirkt
 *   (`endeFestlegenWirkt`: Regel „fortlaufend“ oder ein Ende nach heute); sonst
 *   setzt nur ein geändertes Ende `bisFest`, ein gesetztes bleibt – es wirkt,
 *   sobald das Projekt auf „fortlaufend“ wechselt. Kästchen und Hinweis sagen
 *   „läuft nicht mehr bis zum Abschluss“ nur, wenn er es bisher tat. Der Dialog
 *   übergibt `bisFest` stets ausdrücklich an `updateNachweis`.
 *
 * Wechselt das Raster – auch für offene Nachweise, die in einem neuen
 * aufgehen –, warnen beide Dialoge, wenn dadurch von Hand bearbeitete Texte
 * oder Aufschläge nicht mehr angezeigt werden (`rasterwechselHinweis`) – sie
 * bleiben gespeichert und kehren mit dem alten Raster zurück.
 */
import { useState, type ReactNode } from 'react';
import { today, wochentag } from '../../../shared/dates';
import { useToast } from '../../../shared/toast';
import { Callout, Field, Modal, Segmented, Select, TextInput } from '../../../shared/ui';
import {
  endeFestlegenWirkt,
  leistungenIm,
  nachweisDerLeistung,
  nachweisTitel,
  nichtAbgerechnet,
  laeuftBisAbschluss,
  rasterwechselHinweis,
  rasterwechselVerdeckt,
  rasterwechselVerdecktAlle,
  stundenVon,
  ueberschneidung,
} from '../domain/nachweis';
import {
  RASTER_LABEL,
  mitarbeiterName,
  projektTitel,
  type Leistung,
  type Leistungsnachweis,
  type LeistungsnachweisDaten,
  type Projekt,
  type Raster,
} from '../domain/types';
import { imZeitraum, istDatum, kurzDatum, langDatum, monatsanfang, monatsende, stundenText, zeitraumText } from '../domain/zeitraum';
import type { Route } from '../lib/router';
import { useStore } from '../store/store';
import { RASTER_OPTIONEN, anzahl } from './common';
import './nachweis.css';

type Art = 'monat' | 'frei';

/** Ist [von, bis] genau ein Kalendermonat? */
const istMonat = (von: string, bis: string) => istDatum(von) && von === monatsanfang(von) && bis === monatsende(von);

/** „2026-10“ aus dem Monatsfeld; Browser ohne Monatsauswahl liefern Text – „10.2026“ und „10/2026“ gelten auch. */
function monatLesen(wert: string): string | null {
  const t = wert.trim();
  const iso = /^(\d{4})-(\d{1,2})$/.exec(t);
  const de = /^(\d{1,2})[./](\d{4})$/.exec(t);
  const [jahr, monat] = iso ? [iso[1], iso[2]] : de ? [de[2], de[1]] : [null, null];
  if (!jahr || !monat || Number(monat) < 1 || Number(monat) > 12) return null;
  return `${jahr}-${monat.padStart(2, '0')}`;
}

export function NachweisDialog({
  projekt,
  nachweis,
  onClose,
  navigate,
  projektWahl = false,
}: {
  projekt: Projekt;
  /** Vorhandener Nachweis: Zeitraum ändern; ohne: neuer Nachweis. */
  nachweis?: Leistungsnachweis;
  onClose: () => void;
  navigate?: (r: Route) => void;
  /** Neuer Nachweis: das Projekt im Dialog wählen (Vorgabe `projekt`). */
  projektWahl?: boolean;
}) {
  return nachweis ? (
    <ZeitraumDialog projekt={projekt} nachweis={nachweis} onClose={onClose} />
  ) : (
    <NeuerNachweisDialog projekt={projekt} onClose={onClose} navigate={navigate} projektWahl={projektWahl} />
  );
}

/** „Neuer Leistungsnachweis“: ohne Zeitraum – alle nicht abgerechneten Leistungen des Projekts. */
function NeuerNachweisDialog({
  projekt: vorgabe,
  onClose,
  navigate,
  projektWahl,
}: {
  projekt: Projekt;
  onClose: () => void;
  navigate?: (r: Route) => void;
  projektWahl: boolean;
}) {
  const { data, nachweisFuerNichtAbgerechnete, leistungenNachreichen } = useStore();
  const toast = useToast();
  const [projektId, setProjektId] = useState(vorgabe.id);
  // Nicht erfasste Leistungen kommen nur nach Bestätigung hinein
  const [nachreichen, setNachreichen] = useState(false);
  const projekt = (projektWahl ? data.projekte.find((p) => p.id === projektId) : undefined) ?? vorgabe;
  const plan = nichtAbgerechnet(data, projekt.id, today());
  const [raster, setRaster] = useState<Raster>(plan.offene[0]?.raster ?? projekt.raster);
  const [titel, setTitel] = useState('');

  // Ein anderes Projekt bringt sein Raster mit
  const projektWechseln = (id: string) => {
    const p = data.projekte.find((x) => x.id === id);
    if (!p) return;
    setProjektId(id);
    setRaster(nichtAbgerechnet(data, id, today()).offene[0]?.raster ?? p.raster);
    setNachreichen(false);
  };
  const projektOptionen = [...data.projekte]
    .sort((a, b) => a.nummer.localeCompare(b.nummer, 'de', { numeric: true }) || a.name.localeCompare(b.name, 'de'))
    .map((p) => ({ value: p.id, label: projektTitel(p) }));

  const stunden = stundenVon(plan.leistungen);
  const erste = plan.leistungen[0]?.datum;
  const letzte = plan.leistungen.at(-1)?.datum;
  const umfang = plan.leistungen.length
    ? `${anzahl(plan.leistungen.length, 'nicht abgerechnete Leistung', 'nicht abgerechnete Leistungen')} mit ${stundenText(stunden)} Std.${
        erste && letzte ? ` (${erste === letzte ? `am ${langDatum(erste)}` : `vom ${langDatum(erste)} bis ${langDatum(letzte)}`})` : ''
      }`
    : 'Noch keine nicht abgerechnete Leistung';
  const vorhanden = plan.vorhanden;
  const nachgereicht = nachreichen ? plan.nichtErfasst.length : 0;
  // Was in den offenen Nachweisen zu einem anderen Raster gehört, wird nach dem Zusammenfassen nicht mehr angezeigt
  const rasterHinweis = vorhanden ? null : rasterwechselHinweis(rasterwechselVerdecktAlle(plan.offene, raster));

  const oeffnen = (id: string) => navigate?.({ view: 'abrechnung', projektId: projekt.id, nachweisId: id });

  const nachgereichtText = nachgereicht
    ? ` ${anzahl(nachgereicht, 'Leistung', 'Leistungen')} nachgereicht übernommen.`
    : '';

  const anlegen = () => {
    if (vorhanden) {
      if (nachgereicht) {
        leistungenNachreichen(vorhanden.id);
        toast(nachgereichtText.trim());
      }
      onClose();
      oeffnen(vorhanden.id);
      return;
    }
    const id = nachweisFuerNichtAbgerechnete(projekt.id, { raster, titel, nachreichen });
    if (!id) {
      toast('Das ist dem Controlling vorbehalten.');
      return;
    }
    toast(
      (plan.offene.length > 1
        ? `${anzahl(plan.offene.length, 'offener Leistungsnachweis', 'offene Leistungsnachweise')} zu einem zusammengefasst.`
        : plan.offene.length === 1
          ? 'Der offene Leistungsnachweis umfasst jetzt alle nicht abgerechneten Leistungen.'
          : 'Leistungsnachweis angelegt.') + nachgereichtText,
    );
    onClose();
    oeffnen(id);
  };

  return (
    <Modal
      titel="Neuer Leistungsnachweis"
      sub={projektWahl ? 'Alle nicht abgerechneten Leistungen eines Projekts' : projektTitel(projekt)}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Abbrechen
          </button>
          <button type="button" className="btn btn-primary" onClick={anlegen}>
            {vorhanden ? (nachgereicht ? 'Übernehmen und öffnen' : 'Öffnen') : 'Anlegen'}
          </button>
        </>
      }
    >
      <div className="stack ln-nachweisdialog">
        {projektWahl ? (
          <div className="form-grid">
            <Field label="Projekt" full>
              <Select value={projekt.id} onChange={projektWechseln} options={projektOptionen} />
            </Field>
          </div>
        ) : null}

        {vorhanden ? (
          <Callout icon="i">
            {umfang} – {plan.leistungen.length === 1 ? 'sie liegt' : 'sie liegen'} bereits im offenen Leistungsnachweis „
            {nachweisTitel(vorhanden)}“. Er läuft bis zum Abschluss; sein Zeitraum wird beim Abschluss festgelegt.
          </Callout>
        ) : (
          <>
            <Callout icon="i">
              Der Leistungsnachweis umfasst ohne Zeitraumwahl alle nicht abgerechneten Leistungen: {umfang}. Später
              erfasste kommen hinzu; der Zeitraum wird erst beim Abschluss festgelegt.
              {plan.offene.length
                ? ` ${
                    plan.offene.length === 1 ? 'Der offene Leistungsnachweis' : 'Die offenen Leistungsnachweise'
                  } ${plan.offene.map((n) => `„${nachweisTitel(n)}“`).join(', ')} ${
                    plan.offene.length === 1 ? 'geht' : 'gehen'
                  } darin auf – Leistungstexte, Aufschläge und Bemerkungen bleiben ${rasterHinweis ? 'gespeichert' : 'erhalten'}.`
                : ''}
            </Callout>
            <div className="form-grid">
              <Field label="Raster" full hint={`Vorgabe des Projekts: ${RASTER_LABEL[projekt.raster]}`}>
                <Segmented<Raster> value={raster} onChange={setRaster} options={RASTER_OPTIONEN} />
              </Field>
              <Field label="Überschrift" full hint="Optional – leer lassen für die automatische Überschrift.">
                <TextInput value={titel} onChange={setTitel} placeholder={plan.offene[0]?.titel || 'Leistungsnachweis'} />
              </Field>
            </div>
            {rasterHinweis ? (
              <Callout ton="warn" icon="!">
                {rasterHinweis}
              </Callout>
            ) : null}
          </>
        )}

        {plan.nichtErfasst.length ? (
          <NichtErfasstHinweis daten={data} leistungen={plan.nichtErfasst}>
            <label className="checkbox">
              <input type="checkbox" checked={nachreichen} onChange={(e) => setNachreichen(e.target.checked)} />
              {plan.nichtErfasst.length === 1
                ? 'In diesen Leistungsnachweis übernehmen'
                : `Alle ${plan.nichtErfasst.length} in diesen Leistungsnachweis übernehmen`}{' '}
              (nachgereicht)
            </label>
          </NichtErfasstHinweis>
        ) : null}
      </div>
    </Modal>
  );
}

/** So viele nicht erfasste Leistungen nennt der Hinweis einzeln. */
const NICHT_ERFASST_EINZELN = 8;

/**
 * Mitteilung über nicht erfasste Leistungen (`nichtAbgerechnet().nichtErfasst`):
 * Leistungen aus schon abgerechneten Zeiträumen, die in keinem abgerechneten
 * Leistungsnachweis stehen – je mit Datum, Person, Stunden, Text und dem Grund.
 * Die ersten `NICHT_ERFASST_EINZELN` stehen einzeln da, „Alle … anzeigen“
 * klappt die übrigen auf (in einem Bereich mit eigener Bildlaufleiste), damit
 * jede Leistung zu sehen ist, die die Bestätigung übernimmt. Darunter
 * (`children`) die Bestätigung zum Übernehmen.
 */
export function NichtErfasstHinweis({
  daten,
  leistungen,
  children,
}: {
  daten: LeistungsnachweisDaten;
  leistungen: Leistung[];
  children?: ReactNode;
}) {
  const mitarbeiter = new Map(daten.mitarbeiter.map((m) => [m.id, m]));
  const grund = (l: Leistung) => {
    const n = nachweisDerLeistung(daten, l);
    return n ? `nach dem Abschluss von „${nachweisTitel(n)}“ erfasst` : 'in keinem Leistungsnachweis';
  };
  const [alle, setAlle] = useState(false);
  const mehr = leistungen.length > NICHT_ERFASST_EINZELN;
  const gezeigt = alle ? leistungen : leistungen.slice(0, NICHT_ERFASST_EINZELN);
  return (
    <Callout ton="warn" icon="!">
      <div className="stack" style={{ gap: 8 }}>
        <span>
          <strong>
            {anzahl(leistungen.length, 'Leistung', 'Leistungen')} mit {stundenText(stundenVon(leistungen))} Std.{' '}
            {leistungen.length === 1 ? 'ist' : 'sind'} noch nicht erfasst
          </strong>{' '}
          – {leistungen.length === 1 ? 'sie liegt' : 'sie liegen'} in bereits abgerechneten Zeiträumen, aber in keinem
          abgerechneten Leistungsnachweis.
        </span>
        <ul className={alle && mehr ? 'ln-nicht-erfasst ln-nicht-erfasst-alle' : 'ln-nicht-erfasst'}>
          {gezeigt.map((l) => {
            const m = mitarbeiter.get(l.mitarbeiterId);
            return (
              <li key={l.id}>
                {wochentag(l.datum)} {kurzDatum(l.datum)} · {m ? mitarbeiterName(m) || m.kuerzel : '?'} ·{' '}
                {stundenText(l.stunden)} Std. – {l.text || 'ohne Text'} <span className="tertiary">({grund(l)})</span>
              </li>
            );
          })}
        </ul>
        {mehr ? (
          <div>
            <button type="button" className="ln-zeile-link ln-nicht-erfasst-umschalter" onClick={() => setAlle((a) => !a)} aria-expanded={alle}>
              {alle ? 'Weniger anzeigen' : `Alle ${leistungen.length} anzeigen (${leistungen.length - NICHT_ERFASST_EINZELN} weitere)`}
            </button>
          </div>
        ) : null}
        {children}
      </div>
    </Callout>
  );
}

/** „Zeitraum ändern“: Zeitraum, Raster und Überschrift eines vorhandenen Nachweises. */
function ZeitraumDialog({
  projekt,
  nachweis,
  onClose,
}: {
  projekt: Projekt;
  nachweis: Leistungsnachweis;
  onClose: () => void;
}) {
  const { data, updateNachweis } = useStore();
  const toast = useToast();
  const abgeschlossen = nachweis.status === 'abgeschlossen';

  const [art, setArt] = useState<Art>(() => (istMonat(nachweis.von, nachweis.bis) ? 'monat' : 'frei'));
  const [monat, setMonat] = useState(() => nachweis.von.slice(0, 7));
  const [von, setVon] = useState(nachweis.von);
  const [bis, setBis] = useState(nachweis.bis);
  const [raster, setRaster] = useState<Raster>(nachweis.raster);
  const [titel, setTitel] = useState(nachweis.titel);
  // Ein festgelegtes Ende lässt sich wieder aufheben: Der Nachweis läuft dann wieder bis zum Abschluss
  const [wiederLaufen, setWiederLaufen] = useState(false);
  const heute = today();
  const laeuft = laeuftBisAbschluss(data, nachweis, heute);
  // Liefe er bis zum Abschluss, lässt sich das Ende ausdrücklich festlegen – auch unverändert (etwa den
  // vorausgewählten Monat abrechnen). Ohne eigene Wahl legt ein geändertes Ende es fest.
  const [festlegenWahl, setFestlegenWahl] = useState<boolean | null>(null);

  // Rasterwechsel: Was von Hand bearbeitet wurde, verschwindet aus der Anzeige (bleibt aber gespeichert)
  const rasterHinweis = rasterwechselHinweis(rasterwechselVerdeckt(nachweis, raster));

  const gewaehlt = monatLesen(monat);
  const zeitraum =
    art === 'monat'
      ? gewaehlt
        ? { von: `${gewaehlt}-01`, bis: monatsende(`${gewaehlt}-01`) }
        : { von: '', bis: '' }
      : { von, bis };
  const gueltig = istDatum(zeitraum.von) && istDatum(zeitraum.bis) && zeitraum.von <= zeitraum.bis;
  const andere = gueltig ? ueberschneidung(data, projekt.id, zeitraum.von, zeitraum.bis, nachweis.id) : undefined;
  const automatisch = gueltig ? nachweisTitel({ titel: '', ...zeitraum }) : 'Leistungsnachweis';

  // Was im neuen Zeitraum liegt – und was beim Verkleinern aus jedem Nachweis fiele
  const darin = gueltig ? leistungenIm(data, projekt.id, zeitraum.von, zeitraum.bis) : [];
  const stunden = stundenVon(darin);
  const herausfallend =
    gueltig
      ? data.leistungen.filter(
          (l) =>
            l.projektId === projekt.id &&
            imZeitraum(l.datum, nachweis.von, nachweis.bis) &&
            !imZeitraum(l.datum, zeitraum.von, zeitraum.bis),
        ).length
      : 0;

  // Ein festgelegtes Ende (`bisFest`) wirkt nur, wo der Nachweis mit dem neuen Ende sonst bis zum Abschluss
  // liefe (Regel „fortlaufend“ oder ein Ende nach heute) – nur dann bietet der Dialog die Kästchen an.
  // Festgelegt ist es danach, wenn ausdrücklich gewählt oder, ohne Wahl, weil das Ende geändert wurde. Wo es
  // gerade nichts bewirkt, hält ein geändertes Ende es trotzdem fest (es wirkt, sobald das Projekt auf
  // „fortlaufend“ wechselt), ein gesetztes bleibt.
  const endeGeaendert = gueltig && zeitraum.bis !== nachweis.bis;
  const festWirkt = gueltig && endeFestlegenWirkt(data, nachweis, zeitraum.bis, heute);
  const festlegen = !festWirkt
    ? nachweis.bisFest || endeGeaendert
    : nachweis.bisFest
      ? !wiederLaufen
      : (festlegenWahl ?? endeGeaendert);
  // Hinweis, wenn der Nachweis danach nicht bis zum Abschluss läuft, obwohl er es bisher tat oder mit dem neuen
  // Ende täte – „nicht mehr“ nur, wenn er es bisher tat
  const laeuftDanach = festWirkt && !festlegen;
  const festHinweis =
    gueltig && !laeuftDanach && (laeuft || (festWirkt && endeGeaendert))
      ? laeuft
        ? `Das Ende steht damit fest: Der Leistungsnachweis endet am ${langDatum(zeitraum.bis)}, läuft nicht mehr bis zum Abschluss und wird beim Abschluss nicht gekürzt. Spätere Leistungen kommen in einen neuen Leistungsnachweis.`
        : `Das Ende steht damit fest: Der Leistungsnachweis endet am ${langDatum(zeitraum.bis)}, läuft nicht bis zum Abschluss und wird beim Abschluss nicht gekürzt. Spätere Leistungen kommen in einen neuen Leistungsnachweis.`
      : null;

  const inhaltText = [
    `Im Zeitraum liegen ${anzahl(darin.length, 'Leistung', 'Leistungen')}${darin.length ? ` mit ${stundenText(stunden)} Stunden` : ''}.`,
    herausfallend ? `${anzahl(herausfallend, 'Leistung liegt', 'Leistungen liegen')} danach außerhalb dieses Leistungsnachweises.` : '',
  ]
    .filter(Boolean)
    .join(' ');

  const artWechseln = (neu: Art) => {
    // Beim Wechsel zu „frei“ beginnt der Zeitraum mit dem gewählten Monat
    if (neu === 'frei' && !von && !bis && gewaehlt) {
      setVon(`${gewaehlt}-01`);
      setBis(monatsende(`${gewaehlt}-01`));
    }
    if (neu === 'monat' && istDatum(von)) setMonat(von.slice(0, 7));
    setArt(neu);
  };

  const speichern = () => {
    const { von: beginn, bis: ende } = zeitraum;
    if (!istDatum(beginn) || !istDatum(ende)) {
      toast('Bitte Beginn und Ende angeben.');
      return;
    }
    if (ende < beginn) {
      toast('Das Ende liegt vor dem Beginn.');
      return;
    }
    if (andere) {
      toast(`Der Zeitraum überschneidet sich mit „${nachweisTitel(andere)}“.`);
      return;
    }
    updateNachweis(nachweis.id, {
      von: beginn,
      bis: ende,
      raster,
      titel: titel.trim(),
      bisFest: festlegen,
    });
    toast('Leistungsnachweis gespeichert.');
    onClose();
  };

  return (
    <Modal
      titel="Zeitraum ändern"
      sub={projektTitel(projekt)}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            {abgeschlossen ? 'Schließen' : 'Abbrechen'}
          </button>
          {abgeschlossen ? null : (
            <button type="button" className="btn btn-primary" onClick={speichern}>
              Speichern
            </button>
          )}
        </>
      }
    >
      {abgeschlossen ? (
        <Callout>
          Der Leistungsnachweis ist abgeschlossen. Zeitraum, Raster und Überschrift lassen sich erst nach „Wieder öffnen“
          ändern.
        </Callout>
      ) : (
        <div className="stack ln-nachweisdialog">
          <div className="form-grid">
            <Field label="Zeitraum" full>
              <Segmented<Art>
                value={art}
                onChange={artWechseln}
                options={[
                  { value: 'monat', label: 'Monat' },
                  { value: 'frei', label: 'Von – bis' },
                ]}
              />
            </Field>
            {art === 'monat' ? (
              <Field label="Monat" full hint={gewaehlt ? zeitraumText(zeitraum.von, zeitraum.bis) : undefined}>
                <TextInput type="month" value={monat} onChange={setMonat} placeholder="JJJJ-MM" autoFocus />
              </Field>
            ) : (
              <>
                <Field label="Von">
                  <TextInput type="date" value={von} onChange={setVon} autoFocus />
                </Field>
                <Field label="Bis" hint="Auch über mehrere Monate">
                  <TextInput type="date" value={bis} onChange={setBis} min={von || undefined} />
                </Field>
              </>
            )}
            <Field label="Raster" full hint={`Vorgabe des Projekts: ${RASTER_LABEL[projekt.raster]}`}>
              <Segmented<Raster>
                value={raster}
                onChange={setRaster}
                options={RASTER_OPTIONEN}
              />
            </Field>
            <Field label="Überschrift" full hint="Optional – leer lassen für die automatische Überschrift.">
              <TextInput value={titel} onChange={setTitel} placeholder={automatisch} />
            </Field>
          </div>

          {festWirkt && !nachweis.bisFest ? (
            <label className="checkbox">
              <input type="checkbox" checked={festlegen} onChange={(e) => setFestlegenWahl(e.target.checked)} />
              {laeuft
                ? 'Ende festlegen – der Leistungsnachweis läuft nicht mehr bis zum Abschluss'
                : 'Ende festlegen – der Leistungsnachweis läuft nicht bis zum Abschluss'}
            </label>
          ) : null}
          {festWirkt && nachweis.bisFest ? (
            <label className="checkbox">
              <input type="checkbox" checked={wiederLaufen} onChange={(e) => setWiederLaufen(e.target.checked)} />
              Wieder bis zum Abschluss laufen lassen (das Ende ist von Hand festgelegt)
            </label>
          ) : null}
          {festHinweis ? (
            <Callout ton="warn" icon="!">
              {festHinweis}
            </Callout>
          ) : null}
          {rasterHinweis ? (
            <Callout ton="warn" icon="!">
              {rasterHinweis}
            </Callout>
          ) : null}
          {andere ? (
            <Callout ton="warn" icon="!">
              Der Zeitraum überschneidet sich mit „{nachweisTitel(andere)}“.
            </Callout>
          ) : gueltig ? (
            <p className="small muted">{inhaltText}</p>
          ) : null}
        </div>
      )}
    </Modal>
  );
}
