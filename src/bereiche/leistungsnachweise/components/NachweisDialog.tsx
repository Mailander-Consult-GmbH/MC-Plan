/**
 * Leistungsnachweise anlegen und ändern – dem Controlling vorbehalten
 * (domain/rechte.ts).
 *
 * * **Neuer Leistungsnachweis** (`NeuerNachweisDialog`) fragt keinen Zeitraum
 *   ab: Er umfasst alle nicht abgerechneten Leistungen des Projekts
 *   (`nichtAbgerechnet`); offene Nachweise gehen darin auf. Der Zeitraum steht
 *   erst beim Abschluss fest. Liegt schon alles in einem offenen Nachweis,
 *   bietet der Dialog „Öffnen“ an. Das Projekt lässt sich im Dialog wählen
 *   (`projektWahl`).
 * * **Zeitraum ändern** (`ZeitraumDialog`) korrigiert Zeitraum, Raster und
 *   Überschrift eines vorhandenen: ein Kalendermonat (Schnellwahl) oder frei
 *   mit Beginn und Ende – auch über mehrere Monate. Nachweise eines Projekts
 *   überschneiden sich nie; welche Leistungen ein Nachweis zeigt, ergibt sich
 *   allein aus seinem Zeitraum.
 *
 * Wechselt das Raster, warnt der Dialog, wenn dadurch von Hand bearbeitete
 * Texte oder Aufschläge nicht mehr angezeigt werden (`rasterwechselHinweis`) –
 * sie bleiben gespeichert und kehren mit dem alten Raster zurück.
 */
import { useState } from 'react';
import { today } from '../../../shared/dates';
import { useToast } from '../../../shared/toast';
import { Callout, Field, Modal, Segmented, Select, TextInput } from '../../../shared/ui';
import {
  leistungenIm,
  nachweisTitel,
  nichtAbgerechnet,
  rasterwechselHinweis,
  rasterwechselVerdeckt,
  stundenVon,
  ueberschneidung,
} from '../domain/nachweis';
import { RASTER_LABEL, projektTitel, type Leistungsnachweis, type Projekt, type Raster } from '../domain/types';
import { imZeitraum, istDatum, langDatum, monatsanfang, monatsende, stundenText, zeitraumText } from '../domain/zeitraum';
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
  const { data, nachweisFuerNichtAbgerechnete } = useStore();
  const toast = useToast();
  const [projektId, setProjektId] = useState(vorgabe.id);
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

  const oeffnen = (id: string) => navigate?.({ view: 'abrechnung', projektId: projekt.id, nachweisId: id });

  const anlegen = () => {
    if (vorhanden) {
      onClose();
      oeffnen(vorhanden.id);
      return;
    }
    const id = nachweisFuerNichtAbgerechnete(projekt.id, { raster, titel });
    if (!id) {
      toast('Das ist dem Controlling vorbehalten.');
      return;
    }
    toast(
      plan.offene.length > 1
        ? `${anzahl(plan.offene.length, 'offener Leistungsnachweis', 'offene Leistungsnachweise')} zu einem zusammengefasst.`
        : plan.offene.length === 1
          ? 'Der offene Leistungsnachweis umfasst jetzt alle nicht abgerechneten Leistungen.'
          : 'Leistungsnachweis angelegt.',
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
            {vorhanden ? 'Öffnen' : 'Anlegen'}
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
                  } darin auf – Leistungstexte, Aufschläge und Bemerkungen bleiben erhalten.`
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
          </>
        )}

        {plan.davor.length ? (
          <p className="small muted">
            {anzahl(plan.davor.length, 'nicht abgerechnete Leistung liegt', 'nicht abgerechnete Leistungen liegen')} vor dem
            letzten abgeschlossenen Leistungsnachweis und {plan.davor.length === 1 ? 'kommt' : 'kommen'} nicht hinein.
          </p>
        ) : null}
      </div>
    </Modal>
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
    updateNachweis(nachweis.id, { von: beginn, bis: ende, raster, titel: titel.trim() });
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
