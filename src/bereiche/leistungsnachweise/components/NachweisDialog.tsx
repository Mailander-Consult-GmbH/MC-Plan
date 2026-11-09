/**
 * Leistungsnachweise anlegen – dem Controlling vorbehalten
 * (domain/rechte.ts).
 *
 * * **Neuer Leistungsnachweis** (`NeuerNachweisDialog`) fragt keinen Zeitraum
 *   ab: Er umfasst alle nicht abgerechneten Leistungen des Projekts
 *   (`nichtAbgerechnet`); offene Nachweise gehen darin auf. Bis zu welchem Tag
 *   er reicht, legt erst das Abschließen fest (Schritt „Abschließen und PDF“). Liegt schon alles in einem offenen Nachweis,
 *   bietet der Dialog „Öffnen“ an. Nicht erfasste Leistungen aus schon abgerechneten
 *   Zeiträumen nennt der Dialog (`NichtErfasstHinweis`); übernommen werden sie
 *   erst nach Bestätigung – als nachgereichte.
 * Einen Dialog „Zeitraum ändern“ gibt es nicht (mehr): bis wann ein Nachweis
 * reicht, legt das Abschließen fest; ein von Hand festgelegtes Ende (`bisFest`)
 * älterer Stände bleibt, wie es ist.
 *
 * Wechselt das Raster – für offene Nachweise, die im neuen aufgehen –, warnt
 * der Dialog, wenn dadurch von Hand bearbeitete Texte
 * oder Aufschläge nicht mehr angezeigt werden (`rasterwechselHinweis`) – sie
 * bleiben gespeichert und kehren mit dem alten Raster zurück. Ändern sich die
 * Grenzen der Nachweise, sagt der Dialog, was das für die gemeinsamen
 * Leistungstexte und Bestätigungen der Mitarbeiter bedeutet (`grenzFolgen`,
 * `grenzFolgenHinweis`): Texte von Teilen eines Zeitraums gehen im Text des
 * ganzen auf (`periodentexteNachziehen`, die Bestätigungen ziehen mit); teilt
 * ein neuer Beginn bzw. ein neues Ende einen Zeitraum, verfassen die
 * Mitarbeiter für den neuen Teil einen eigenen Text, und ihre Bestätigungen
 * des Monats erlöschen – dann als Warnung mit den Namen.
 */
import { useMemo, useState, type ReactNode } from 'react';
import { today, wochentag } from '../../../shared/dates';
import { useToast } from '../../../shared/toast';
import { Callout, Field, Modal, Segmented, TextInput } from '../../../shared/ui';
import { grenzFolgen, grenzFolgenHinweis, type GrenzFolgen } from '../domain/erfassung';
import {
  nachweisDerLeistung,
  nachweisFuerNichtAbgerechneteAnwenden,
  nachweisTitel,
  nichtAbgerechnet,
  rasterwechselHinweis,
  rasterwechselVerdecktAlle,
  stundenVon,
} from '../domain/nachweis';
import {
  RASTER_LABEL,
  mitarbeiterName,
  projektTitel,
  type Leistung,
  type LeistungsnachweisDaten,
  type Projekt,
  type Raster,
} from '../domain/types';
import { kurzDatum, langDatum, stundenText } from '../domain/zeitraum';
import type { Route } from '../lib/router';
import { useStore } from '../store/store';
import { RASTER_OPTIONEN, anzahl } from './common';
import './nachweis.css';

export function NachweisDialog({
  projekt,
  onClose,
  navigate,
}: {
  projekt: Projekt;
  onClose: () => void;
  navigate?: (r: Route) => void;
}) {
  return <NeuerNachweisDialog projekt={projekt} onClose={onClose} navigate={navigate} />;
}

/** „Neuer Leistungsnachweis“: ohne Zeitraum – alle nicht abgerechneten Leistungen des Projekts. */
function NeuerNachweisDialog({
  projekt,
  onClose,
  navigate,
}: {
  projekt: Projekt;
  onClose: () => void;
  navigate?: (r: Route) => void;
}) {
  const { data, nachweisFuerNichtAbgerechnete, leistungenNachreichen } = useStore();
  const toast = useToast();
  // Nicht erfasste Leistungen kommen nur nach Bestätigung hinein
  const [nachreichen, setNachreichen] = useState(false);
  const plan = nichtAbgerechnet(data, projekt.id, today());
  const [raster, setRaster] = useState<Raster>(plan.offene[0]?.raster ?? projekt.raster);
  const [titel, setTitel] = useState('');

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
  // Neue Grenzen (offene Nachweise gehen darin auf): Gemeinsame Texte von Teilen eines Zeitraums gehen zusammen
  const folgen = useMemo(
    () =>
      vorhanden
        ? null
        : grenzFolgen(data, nachweisFuerNichtAbgerechneteAnwenden(data, projekt.id, { raster, titel: '' }, 'vorschau', new Date().toISOString())),
    [data, projekt.id, raster, vorhanden],
  );

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
      sub={projektTitel(projekt)}
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
        {vorhanden ? (
          <Callout icon="i">
            {umfang} – {plan.leistungen.length === 1 ? 'sie liegt' : 'sie liegen'} bereits im offenen Leistungsnachweis „
            {nachweisTitel(vorhanden)}“. Er läuft weiter, bis das Controlling ihn abschließt; dabei wird festgelegt, bis wann er reicht.
          </Callout>
        ) : (
          <>
            <Callout icon="i">
              Der Leistungsnachweis umfasst ohne Zeitraumwahl alle nicht abgerechneten Leistungen: {umfang}. Später
              erfasste kommen hinzu; bis wann er reicht, wird beim Abschließen festgelegt.
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
            <FolgenHinweis folgen={folgen} daten={data} />
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

/**
 * Folgen geänderter Grenzen für die gemeinsamen Texte und Bestätigungen
 * (`grenzFolgenHinweis`): als Warnung, wenn ein Teil einen eigenen Text braucht
 * oder Bestätigungen erlöschen, sonst als kleiner Hinweis; nichts ohne Folgen.
 */
function FolgenHinweis({ folgen, daten }: { folgen: GrenzFolgen | null; daten: LeistungsnachweisDaten }) {
  const text = folgen ? grenzFolgenHinweis(folgen, daten.mitarbeiter) : null;
  if (!folgen || !text) return null;
  return folgen.neueTeile.length > 0 || folgen.erloschen.length > 0 ? (
    <Callout ton="warn" icon="!">
      {text}
    </Callout>
  ) : (
    <p className="small muted">{text}</p>
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
