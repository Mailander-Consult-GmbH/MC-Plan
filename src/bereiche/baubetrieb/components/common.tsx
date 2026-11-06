/** Fachliche Anzeige-Bausteine der Baubetriebsplanung, die mehrere Ansichten brauchen. */
import { useEffect, useRef, useState } from 'react';
import { diffDays, formatDate, relativeLabel, today } from '../../../shared/dates';
import { Icon } from '../../../shared/icons';
import { Badge } from '../../../shared/ui';
import { sachstand } from '../domain/ablauf';
import { AMPEL_LABEL, type Ampel, type Terminfrist } from '../domain/fristen';
import { LOESCHEN, type Anmeldung, type ID, type StatusArt, type StatusZiel, type Workflow } from '../domain/types';
import { istUebernahme, nachfolgerVon, statusInfo, statusVon, statusText } from '../domain/workflow';
import { useStore } from '../store/store';
import './baubetrieb.css';

type Ton = '' | 'green' | 'orange' | 'red' | 'blue' | 'purple' | 'gelb';

export const STATUS_TON: Record<StatusArt, Ton> = {
  entwurf: '',
  abstimmung: 'blue',
  angemeldet: 'blue',
  // Eine verspätete Anmeldung ist kein Fehler, verdient aber Aufmerksamkeit.
  verspaetet: 'orange',
  genehmigt: 'green',
  abgelehnt: 'red',
  aenderung: 'purple',
  // Erledigt und zum Löschen vorgemerkt – rot, damit sie auffällt.
  leiche: 'red',
};

/**
 * Status einer Anmeldung, eingefärbt nach seiner Art. Ohne `ohneWorkflow`
 * steht der Workflow davor („MKM · Angemeldet“), weil Status wie „Entwurf“ in
 * mehreren Workflows vorkommen.
 */
export function StatusBadge({ statusId, ohneWorkflow = false }: { statusId: ID; ohneWorkflow?: boolean }) {
  const { data } = useStore();
  const info = statusVon(data.workflows, statusId);
  return (
    <span title={`${info.workflow.name}: ${info.status.name}`}>
      <Badge ton={STATUS_TON[info.status.art]}>{ohneWorkflow ? info.status.name : statusText(info)}</Badge>
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

const EINZEILIG = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } as const;

/**
 * Terminfrist in höchstens zwei Zeilen: Ampelpunkt und Datum, darunter der
 * Abstand. Regel und Rechenweg stehen im Tooltip. Für Tabellen, deren Zeilen
 * nicht höher werden sollen.
 */
export function TerminKompakt({ frist, ampel }: { frist: Terminfrist; ampel: Ampel }) {
  if (!frist.datum) {
    return <span className="small tertiary">{frist.regel === '.-.' ? 'keine' : 'nicht berechenbar'}</span>;
  }
  const regel = `${frist.manuell ? 'von Hand' : frist.regel}${frist.platzhalter ? ' · Platzhalter' : ''}`;
  return (
    <div className="small" title={`${regel}\n${frist.erlaeuterung}`}>
      <div style={EINZEILIG}>
        <AmpelPunkt ampel={ampel} /> <b>{formatDate(frist.datum)}</b>
      </div>
      <div className="tertiary" style={EINZEILIG}>
        {relativeLabel(frist.datum)}
      </div>
    </div>
  );
}

/**
 * Sachstand einer Anmeldung in höchstens zwei Zeilen – Datum des letzten
 * Abgleichs bzw. der letzten Änderung (`sachstand`), darunter Abstand zu heute
 * und Anlass; alles im Tooltip. Für die Anmeldungstabellen im Projekt.
 */
export function SachstandKompakt({ anmeldung }: { anmeldung: Pick<Anmeldung, 'verlauf' | 'geaendertAm'> }) {
  const stand = sachstand(anmeldung);
  if (!stand) return <span className="small tertiary">–</span>;
  const tage = diffDays(stand.datum, today());
  const abstand = tage === 0 ? 'heute' : tage === 1 ? 'gestern' : tage > 1 ? `vor ${tage} Tagen` : `in ${-tage} Tagen`;
  return (
    <div className="small" title={`Sachstand ${formatDate(stand.datum)} (${abstand}) – letzter Abgleich bzw. letzte Änderung: ${stand.anlass}`}>
      <div style={EINZEILIG}>
        <b>{formatDate(stand.datum)}</b>
      </div>
      <div className="tertiary" style={EINZEILIG}>
        {abstand} · {stand.anlass}
      </div>
    </div>
  );
}

/**
 * „Status ändern“ – wie der Erledigt-Haken im Planlaufmanagement: ein Haken;
 * hat der Status nur einen möglichen Nachfolger, wählt ihn der Haken direkt,
 * sonst öffnet er ein kleines Menü mit den möglichen Nachfolgern (wie bei
 * parallelen Schritten im Planlauf). Den Wechsel selbst bestätigt danach der
 * Dialog des Statuswechsels.
 */
export function NachfolgerAuswahl({
  statusId,
  onWaehle,
}: {
  statusId: ID;
  onWaehle: (nach: StatusZiel) => void;
}) {
  const { data } = useStore();
  const [menue, setMenue] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  // Menü schließt bei einem Klick daneben und mit Escape
  useEffect(() => {
    if (!menue) return;
    const daneben = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenue(false);
    };
    const taste = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenue(false);
    };
    document.addEventListener('mousedown', daneben);
    document.addEventListener('keydown', taste);
    return () => {
      document.removeEventListener('mousedown', daneben);
      document.removeEventListener('keydown', taste);
    };
  }, [menue]);

  const nachfolger = nachfolgerVon(data.workflows, statusId);
  if (nachfolger.length === 0) return null;
  const einer = nachfolger.length === 1;
  const waehle = (nach: StatusZiel) => {
    setMenue(false);
    onWaehle(nach);
  };

  return (
    <span className="bb-haken" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="btn btn-sm btn-haken"
        title={
          einer
            ? `Status ändern: ${nachfolgerText(data.workflows, statusId, nachfolger[0])}`
            : 'Status ändern – nächsten Status wählen'
        }
        aria-label="Status ändern"
        aria-haspopup={einer ? undefined : 'menu'}
        aria-expanded={einer ? undefined : menue}
        onClick={() => (einer ? waehle(nachfolger[0]) : setMenue((m) => !m))}
      >
        <Icon name="check" size={13} />
      </button>
      {menue ? (
        <div className="bb-haken-menue" role="menu">
          <div className="bb-haken-titel">Welcher Status folgt?</div>
          {nachfolger.map((n) => (
            <button
              key={n}
              type="button"
              role="menuitem"
              className={n === LOESCHEN ? 'bb-haken-loeschen' : undefined}
              onClick={() => waehle(n)}
            >
              {nachfolgerText(data.workflows, statusId, n)}
            </button>
          ))}
        </div>
      ) : null}
    </span>
  );
}

/** „Genehmigt“, „→ MKM: Entwurf (Übernahme)“ bzw. „Eintrag löschen“. */
export function nachfolgerText(workflows: Workflow[], von: ID, nach: StatusZiel): string {
  if (nach === LOESCHEN) return 'Eintrag löschen';
  const ziel = statusInfo(workflows, nach);
  if (!ziel) return 'Unbekannter Status';
  if (nach === von) return `${ziel.status.name} (erneut)`;
  if (istUebernahme(workflows, von, nach)) return `→ ${ziel.workflow.kurz || ziel.workflow.name}: ${ziel.status.name} (Übernahme)`;
  return ziel.status.name;
}
