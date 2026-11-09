/**
 * Übersicht der Leistungsnachweise im Controlling – die Startseite des
 * Menüpunkts „Leistungsnachweise“ im Controlling-Bereich. Je Projekt läuft
 * ein offener Leistungsnachweis – wie eine Excel je Projekt –, bis das
 * Controlling ihn abschließt; eine Entscheidung „weiterlaufen lassen“ gibt es
 * nicht, ohne Abschluss läuft er einfach weiter. Die Übersicht ordnet die
 * Projekte danach, ob sich ihr offener Nachweis bis zum letzten Monatsende
 * abschließen ließe (`abschlussEnden`, meist das Ende des Vormonats):
 * * „Bereit zum Abschließen“ – Leistungen bis dahin, und alle Mitarbeiter mit
 *   Leistungen haben ihre Monate bestätigt,
 * * „Bestätigungen fehlen“ – jemand hat bis dahin nicht (erneut) bestätigt
 *   (`fehlendeBestaetigungen`; wer und welcher Monat, zeigt erst die Seite
 *   des Projekts),
 * * „Noch nichts abzuschließen“ – kein offener Nachweis oder bis zum letzten
 *   Monatsende keine Leistungen (etwa nur im laufenden Monat).
 * Je Zeile: Projekt (Nummer, Name, Status, ggf. „Archiviert“), der letzte
 * abgeschlossene Leistungsnachweis (Monat/Jahr bzw. Zeitraum, mit dem Tag
 * des Abschlusses), die offenen Stunden bis zum Monatsende und die
 * Bestätigung („x von y bestätigt“); „Prüfen und abschließen“ bzw.
 * „Öffnen“ – wie ein Klick auf die Zeile – führt auf die Seite des Projekts
 * (Projekt.tsx). Darüber die Zahl der bereiten und der wartenden Projekte.
 * Das Raster stellt das Controlling in „Projekt einstellen“ ein.
 * „Neues Projekt“ legt ein Projekt nur in den Leistungsnachweisen an; für
 * alle Bereiche gibt es die Projekte des Controllings (Projektregister).
 * „Excel-Import (alle Mitarbeiter)“ übernimmt den Sammel-Export der
 * Zeiterfassung. Archivierte Projekte stehen in ihrer Gruppe am Ende.
 */
import { useState } from 'react';
import { useArchivierte } from '../../../../gemeinsam/ProjektBereiche';
import { today } from '../../../../shared/dates';
import { Icon } from '../../../../shared/icons';
import { Badge, Card, CardHeader, EmptyState, Search } from '../../../../shared/ui';
import { ImportDialog } from '../../components/ImportDialog';
import { ProjektDialog } from '../../components/ProjektDialog';
import { STATUS_TON } from '../../components/common';
import { fehlendeBestaetigungen, type MonatsStatus } from '../../domain/erfassung';
import { abschlussEnden, leistungenDesNachweises, nachweiseVon, offeneNachweise, stundenVon, tagVon } from '../../domain/nachweis';
import { PROJEKT_STATUS_LABEL, type Leistungsnachweis, type Projekt } from '../../domain/types';
import { langDatum, monatText, stundenText, zeitraumText } from '../../domain/zeitraum';
import type { Route } from '../../lib/router';
import { useStore } from '../../store/store';

/** Gruppe einer Zeile in der Übersicht. */
type Gruppe = 'bereit' | 'fehlt' | 'nichts';

const GRUPPEN: { id: Gruppe; titel: string }[] = [
  { id: 'bereit', titel: 'Bereit zum Abschließen – alle haben bestätigt' },
  { id: 'fehlt', titel: 'Bestätigungen fehlen' },
  { id: 'nichts', titel: 'Noch nichts abzuschließen' },
];

/** Stand eines Projekts in der Übersicht. */
interface Stand {
  projekt: Projekt;
  /** Der zuletzt abgeschlossene Leistungsnachweis (mit dem spätesten Zeitraum), sonst null. */
  letzter: Leistungsnachweis | null;
  /** Letztes Monatsende, bis zu dem er sich abschließen ließe. */
  ende: string | null;
  /** Stunden bis dahin. */
  stundenBisEnde: number;
  /** Wer bis dahin nicht (erneut) bestätigt hat. */
  fehlend: MonatsStatus[];
  /** Personen mit Leistungen bis dahin. */
  personen: number;
  gruppe: Gruppe;
}

export function ProjektListe({ navigate }: { navigate: (r: Route) => void }) {
  const { data } = useStore();
  const [suche, setSuche] = useState('');
  const [neu, setNeu] = useState(false);
  const [importOffen, setImportOffen] = useState(false);
  const archiviert = useArchivierte('leistungsnachweise');
  const heute = today();

  const begriff = suche.trim().toLowerCase();
  const staende: Stand[] = data.projekte
    .filter((p) => [p.nummer, p.name, p.kurzname, p.leistungsbereich].join(' ').toLowerCase().includes(begriff))
    .sort(
      (a, b) =>
        Number(archiviert.has(a.id)) - Number(archiviert.has(b.id)) ||
        a.nummer.localeCompare(b.nummer, 'de', { numeric: true }) ||
        a.name.localeCompare(b.name, 'de'),
    )
    .map((p) => {
      const offen = offeneNachweise(data, p.id)[0] ?? null;
      const letzter = nachweiseVon(data, p.id).filter((n) => n.status === 'abgeschlossen').at(-1) ?? null;
      const leistungen = offen ? leistungenDesNachweises(data, offen) : [];
      // Bis zum letzten Monatsende, das sich wählen ließe – der laufende Monat ist noch nicht bestätigt
      const ende = offen ? ([...abschlussEnden(offen, heute)].reverse().find((e) => e.art === 'monatsende')?.bis ?? null) : null;
      const bisEnde = ende ? leistungen.filter((l) => l.datum <= ende) : [];
      const fehlend = offen && ende && bisEnde.length ? fehlendeBestaetigungen(data, { ...offen, bis: ende }) : [];
      const gruppe: Gruppe = bisEnde.length === 0 ? 'nichts' : fehlend.length ? 'fehlt' : 'bereit';
      return {
        projekt: p,
        letzter,
        ende,
        stundenBisEnde: stundenVon(bisEnde),
        fehlend,
        personen: new Set(bisEnde.map((l) => l.mitarbeiterId)).size,
        gruppe,
      };
    });
  const anzahlIn = (g: Gruppe) => staende.filter((s) => s.gruppe === g).length;
  const oeffne = (p: Projekt) => navigate({ view: 'controllingProjekt', projektId: p.id });

  return (
    <div className="stack">
      <div className="row-between wrap">
        <div className="row wrap">
          <Search value={suche} onChange={setSuche} placeholder="Projekt, Nummer …" />
        </div>
        <div className="row wrap">
          <button
            type="button"
            className="btn btn-outline"
            title="Sammel-Export der Zeiterfassung: Leistungen aller Mitarbeiter der Datei übernehmen"
            onClick={() => setImportOffen(true)}
          >
            <Icon name="importieren" size={14} /> Excel-Import (alle Mitarbeiter)
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setNeu(true)}>
            <Icon name="plus" size={14} /> Neues Projekt
          </button>
        </div>
      </div>

      <Card>
        <CardHeader
          titel="Leistungsnachweise je Projekt"
          sub="Je Projekt läuft ein Leistungsnachweis weiter, bis Sie ihn abschließen – bereit ist er, wenn alle bis zum Monatsende bestätigt haben"
          actions={
            <span className="row wrap ln-co-summen">
              <Badge ton={anzahlIn('bereit') ? 'green' : ''}>{`${anzahlIn('bereit')} bereit`}</Badge>
              <Badge ton={anzahlIn('fehlt') ? 'orange' : ''}>{`${anzahlIn('fehlt')} warten auf Bestätigungen`}</Badge>
            </span>
          }
        />
        {staende.length === 0 ? (
          <EmptyState
            icon="projekt"
            titel="Kein Projekt gefunden"
            text="Projekte kommen aus dem Projektregister, aus dem Excel-Import oder über „Neues Projekt“."
          />
        ) : (
          <div className="table-scroll">
            <table className="table table-stack ln-co-projektliste">
              <thead>
                <tr>
                  <th>Projekt</th>
                  <th>Letzter Leistungsnachweis</th>
                  <th className="ln-stunden">Offene Stunden</th>
                  <th>Bestätigung</th>
                  <th className="actions" />
                </tr>
              </thead>
              {GRUPPEN.map((g) => {
                const zeilen = staende.filter((s) => s.gruppe === g.id);
                if (zeilen.length === 0) return null;
                return (
                  <tbody key={g.id}>
                    <tr className="ln-co-gruppe">
                      <th colSpan={5} scope="colgroup">
                        {g.titel}
                      </th>
                    </tr>
                    {zeilen.map((s) => (
                      <Zeile key={s.projekt.id} stand={s} archiviert={archiviert.has(s.projekt.id)} onOeffnen={() => oeffne(s.projekt)} />
                    ))}
                  </tbody>
                );
              })}
            </table>
          </div>
        )}
      </Card>

      {neu ? <ProjektDialog onClose={() => setNeu(false)} navigate={navigate} /> : null}
      {importOffen ? <ImportDialog onClose={() => setImportOffen(false)} navigate={navigate} /> : null}
    </div>
  );
}

/** Eine Zeile der Übersicht. */
function Zeile({ stand: s, archiviert, onOeffnen }: { stand: Stand; archiviert: boolean; onOeffnen: () => void }) {
  const p = s.projekt;
  return (
    <tr className={`clickable ${archiviert ? 'ln-co-archiviert' : ''}`} onClick={onOeffnen}>
      <td>
        <span className="num tertiary">{p.nummer}</span>
        <div>
          <strong>{p.name}</strong>
        </div>
        <span className="row wrap" style={{ gap: 6, marginTop: 3 }}>
          <Badge ton={STATUS_TON[p.status]}>{PROJEKT_STATUS_LABEL[p.status]}</Badge>
          {archiviert ? <Badge>Archiviert</Badge> : null}
        </span>
      </td>
      <td data-label="Letzter Leistungsnachweis">
        {s.letzter ? (
          <span className="ln-co-nachweisstand">
            <span>{zeitraumText(s.letzter.von, s.letzter.bis)}</span>
            {s.letzter.abgeschlossen ? (
              <span className="small tertiary">abgeschlossen am {langDatum(tagVon(s.letzter.abgeschlossen))}</span>
            ) : null}
          </span>
        ) : (
          <span className="tertiary">noch keiner</span>
        )}
      </td>
      <td className="ln-stunden" data-label="Offene Stunden">
        {s.ende && s.stundenBisEnde ? (
          <span className="ln-co-nachweisstand">
            <span>{stundenText(s.stundenBisEnde)}</span>
            <span className="small tertiary">bis Ende {monatText(s.ende)}</span>
          </span>
        ) : (
          '–'
        )}
      </td>
      <td data-label="Bestätigung">
        {s.gruppe === 'nichts' ? (
          <span className="tertiary">–</span>
        ) : (
          <Badge ton={s.fehlend.length ? 'orange' : 'green'}>
            {`${s.personen - new Set(s.fehlend.map((f) => f.mitarbeiterId)).size} von ${s.personen} bestätigt`}
          </Badge>
        )}
      </td>
      <td className="actions">
        <button
          type="button"
          className={`btn btn-sm ${s.gruppe === 'bereit' ? 'btn-primary' : 'btn-outline'}`}
          onClick={(e) => {
            e.stopPropagation();
            onOeffnen();
          }}
        >
          {s.gruppe === 'bereit' ? 'Prüfen und abschließen' : 'Öffnen'} <Icon name="chevron" size={13} />
        </button>
      </td>
    </tr>
  );
}
