/** Fachliche Anzeige-Bausteine der Baubetriebsplanung, die mehrere Ansichten brauchen. */
import { formatDate, relativeLabel } from '../../../shared/dates';
import { Badge } from '../../../shared/ui';
import { AMPEL_LABEL, type Ampel, type Terminfrist } from '../domain/fristen';
import { PHASE_NAME, type StatusArt, type StatusCode } from '../domain/types';
import { istUebernahme, statusDef } from '../domain/workflow';

type Ton = '' | 'green' | 'orange' | 'red' | 'blue' | 'purple' | 'gelb';

const STATUS_TON: Record<StatusArt, Ton> = {
  entwurf: '',
  abstimmung: 'blue',
  angemeldet: 'blue',
  genehmigt: 'green',
  abgelehnt: 'red',
  aenderung: 'purple',
  leiche: '',
};

/** Status mit Nummer und Bezeichnung, eingefärbt nach seiner Art. */
export function StatusBadge({ code, kurz = false }: { code: StatusCode; kurz?: boolean }) {
  const def = statusDef(code);
  // Eine verspätete Anmeldung ist kein Fehler, verdient aber Aufmerksamkeit.
  const ton = code === 'Y5' ? 'orange' : STATUS_TON[def.art];
  return (
    <span title={`${def.code} · ${def.name} (${PHASE_NAME[def.phase]})`}>
      <Badge ton={ton}>{kurz ? def.code : `${def.code} · ${def.name}`}</Badge>
    </span>
  );
}

const AMPEL_TON: Record<Ampel, Ton> = {
  ueberfaellig: 'red',
  faellig: 'orange',
  geplant: 'blue',
  ohne: '',
};

export function AmpelBadge({ ampel }: { ampel: Ampel }) {
  return <Badge ton={AMPEL_TON[ampel]}>{AMPEL_LABEL[ampel]}</Badge>;
}

export function AmpelPunkt({ ampel }: { ampel: Ampel }) {
  // Als Inline-Element hätte der Punkt in einer Tabellenzelle keine Größe
  return <span className={`dot ${AMPEL_TON[ampel]}`} title={AMPEL_LABEL[ampel]} style={{ display: 'inline-block' }} />;
}

export function NachhakenBadge() {
  return <Badge ton="purple">Zum Nachhaken</Badge>;
}

/** Terminfrist in Tabellen: Datum, Abstand und Regel. */
export function TerminZelle({ frist, mitRegel = true }: { frist: Terminfrist; mitRegel?: boolean }) {
  if (!frist.datum) return <span className="small tertiary">{frist.regel === '.-.' ? 'keine' : 'nicht berechenbar'}</span>;
  return (
    <span className="small">
      <b>{formatDate(frist.datum)}</b>
      <div className="tertiary small">{relativeLabel(frist.datum)}</div>
      {mitRegel ? (
        <div className="tertiary small" title={frist.erlaeuterung}>
          {frist.manuell ? 'von Hand' : frist.regel}
          {frist.platzhalter ? ' · Platzhalter' : ''}
        </div>
      ) : null}
    </span>
  );
}

/**
 * Auswahl des nächsten Status – angeboten werden nur die möglichen
 * Nachfolger des aktuellen Status.
 */
export function NachfolgerAuswahl({
  code,
  onWaehle,
}: {
  code: StatusCode;
  onWaehle: (nach: StatusCode) => void;
}) {
  const nachfolger = statusDef(code).nachfolger;
  if (nachfolger.length === 0) return null;
  return (
    <select
      className="select"
      value=""
      aria-label="Status ändern"
      title="Nur die möglichen Nachfolge-Status stehen zur Wahl"
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => {
        if (e.target.value) onWaehle(e.target.value as StatusCode);
      }}
      style={{ minWidth: 150 }}
    >
      <option value="">Status ändern …</option>
      {nachfolger.map((n) => (
        <option key={n} value={n}>
          {nachfolgerText(code, n)}
        </option>
      ))}
    </select>
  );
}

/** „W0 · Entwurf_PzE → Übernahme in PzE“ bzw. „Z0 · Anmeldeleiche (löschen)“. */
export function nachfolgerText(von: StatusCode, nach: StatusCode): string {
  const def = statusDef(nach);
  if (nach === von) return `${def.code} · ${def.name} (erneut)`;
  if (def.art === 'leiche') return `${def.code} · ${def.name} (löschen)`;
  if (istUebernahme(von, nach)) return `${def.code} · ${def.name} → Übernahme in ${PHASE_NAME[def.phase]}`;
  return `${def.code} · ${def.name}`;
}
