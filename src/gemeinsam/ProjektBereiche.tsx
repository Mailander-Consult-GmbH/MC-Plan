/**
 * Oberflächenbausteine zum Projektregister, die alle Bereiche verwenden:
 *
 * * `BereichsMarken` – unten in der Projektkachel: in welchen anderen
 *   Bereichen das Projekt noch geführt wird,
 * * `FremdeProjekte` – grau hinterlegter Abschnitt „Projekte aus anderen
 *   Bereichen“ mit „Übernehmen in …“,
 * * `useSucheOhneTreffer` – Leerzustand der Projektlisten bei einer Suche ohne
 *   aktiven Treffer (nennt Treffer im Archiv und in anderen Bereichen),
 * * `andereBereiche`, `useLoeschHinweis` – für Löschdialoge,
 * * `ArchivKnopf`, `useArchivierbar`, `ArchivHinweis`, `ArchivAbschnitt`, `useArchivierte` – das
 *   Archiv je Bereich: Archiviert wird im Projekt („Archivieren“), zurückgeholt
 *   im archivierten Projekt („Aus dem Archiv holen“); der Archivstand steht
 *   allein im Register (`bereichArchivieren`),
 * * `VerknuepfungsHinweis` – beim Anlegen: Das Projekt gibt es schon,
 * * `RegisterBeteiligte` – die geteilten Projektbeteiligten zum Nachschlagen.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Icon } from '../shared/icons';
import { useToast } from '../shared/toast';
import { Badge, Callout, Card, CardHeader, EmptyState } from '../shared/ui';
import { bereichArchivieren, inBereichUebernehmen } from './abgleich';
import {
  BEREICH_TITEL,
  PROJEKT_BEREICHE,
  andereBereicheVon,
  archivierteIds,
  funktionText,
  istArchiviert,
  personName,
  projektImBereich,
  projektTitel,
  registerAendern,
  useRegister,
  type ID,
  type ProjektBereich,
  type Register,
  type RegisterProjekt,
} from './register';
import './gemeinsam.css';

/** Kennungen der im Bereich archivierten Projekte. */
export function useArchivierte(bereich: ProjektBereich): Set<ID> {
  const register = useRegister();
  return useMemo(() => archivierteIds(register, bereich), [register, bereich]);
}

/**
 * Titel der anderen Bereiche, die das Projekt führen, etwa „Planlaufmanagement
 * und Projektsteuerung“.
 */
export function andereBereiche(register: Register, bereich: ProjektBereich, lokaleId: ID): string {
  return bereicheMitStand(register, bereich, lokaleId, false);
}

function bereicheMitStand(register: Register, bereich: ProjektBereich, lokaleId: ID, offen: boolean): string {
  const p = projektImBereich(register, bereich, lokaleId);
  if (!p) return '';
  const andere = andereBereicheVon(bereich);
  const titel = PROJEKT_BEREICHE.filter((b) => andere.includes(b.id) && p.bereiche[b.id] && p.bereiche[b.id]!.offen === offen).map((b) => b.titel);
  return titel.length <= 1 ? (titel[0] ?? '') : `${titel.slice(0, -1).join(', ')} und ${titel[titel.length - 1]}`;
}

/** Hinweis für Löschdialoge: Was in den anderen Bereichen bleibt. */
export function useLoeschHinweis(bereich: ProjektBereich, lokaleId: ID): string {
  const register = useRegister();
  const andere = andereBereiche(register, bereich, lokaleId);
  return andere ? ` In ${andere} bleibt das Projekt mit seinen Projektbeteiligten erhalten.` : '';
}

/** Marken der Bereiche eines Registerprojekts – aus Sicht des Bereichs `aus`, dessen eigene Marke entfällt. */
function ProjektMarken({ projekt, aus, label }: { projekt: RegisterProjekt; aus: ProjektBereich; label?: string }) {
  const andere = andereBereicheVon(aus);
  const marken = PROJEKT_BEREICHE.filter((b) => andere.includes(b.id) && projekt.bereiche[b.id]);
  if (marken.length === 0) return null;
  return (
    <div className="gem-marken">
      {label ? <span className="gem-marken-label">{label}</span> : null}
      {marken.map((b) => {
        const m = projekt.bereiche[b.id]!;
        if (m.offen) {
          return (
            <span key={b.id} className="badge gem-vorgesehen" title="Zur Übernahme vorgesehen – wird beim nächsten Öffnen des Bereichs angelegt">
              {b.titel} · vorgesehen
            </span>
          );
        }
        return istArchiviert(projekt, b.id) ? (
          <span key={b.id} className="badge gem-archiv" title={`In ${b.titel} archiviert`}>
            {b.titel} · archiviert
          </span>
        ) : (
          <Badge key={b.id} ton="blue">
            {b.titel}
          </Badge>
        );
      })}
    </div>
  );
}

/** Unten in der Projektkachel: In welchen anderen Bereichen das Projekt noch geführt wird. */
export function BereichsMarken({ bereich, lokaleId }: { bereich: ProjektBereich; lokaleId: ID }) {
  const register = useRegister();
  const p = projektImBereich(register, bereich, lokaleId);
  if (!p) return null;
  return <ProjektMarken projekt={p} aus={bereich} label="Auch in" />;
}

/**
 * Archiviert das Projekt im Bereich bzw. holt es zurück – der Archivstand
 * steht allein im Register. `archiviert` ist null, solange das Register das
 * Projekt nicht kennt (etwa, weil es sich nicht lesen ließ).
 */
/**
 * Wohin der Tastaturfokus nach „Archivieren“ bzw. „Aus dem Archiv holen“ geht:
 * Der gedrückte Knopf verschwindet, der Fokus fiele auf `body` – und der
 * nächste Tab auf „Löschen“. Er geht an das Element, das dafür erscheint
 * (Archivhinweis bzw. Knopf „Archivieren“); erscheint keines, verfällt der
 * Vermerk.
 */
let fokusNachArchiv: 'hinweis' | 'knopf' | null = null;

function useArchiv(bereich: ProjektBereich, lokaleId: ID): { archiviert: boolean | null; setzen: (an: boolean) => void } {
  const register = useRegister();
  const toast = useToast();
  const p = projektImBereich(register, bereich, lokaleId);
  return {
    archiviert: p ? istArchiviert(p, bereich) : null,
    setzen: (an) => {
      if (!p) return;
      const ziel = an ? 'hinweis' : 'knopf';
      fokusNachArchiv = ziel;
      window.setTimeout(() => {
        if (fokusNachArchiv === ziel) fokusNachArchiv = null;
      }, 500);
      registerAendern((r) => bereichArchivieren(r, bereich, lokaleId, an));
      toast(
        an
          ? `„${p.name}“ archiviert – es steht in der Projektliste unter „Archiv“.`
          : `„${p.name}“ aus dem Archiv geholt.`,
      );
    },
  };
}

/**
 * „Archivieren“ im Projekt: nimmt es in diesem Bereich aus Übersicht und
 * Seitenleiste; in den anderen Bereichen bleibt es, wie es ist. Bei einem
 * archivierten Projekt steht stattdessen der `ArchivHinweis` mit „Aus dem
 * Archiv holen“.
 */
/**
 * Ob sich das Projekt hier archivieren lässt – also ob `ArchivKnopf` etwas
 * zeigt: nicht, wenn es schon archiviert ist oder das Register es nicht kennt.
 * Für Karten, die den Knopf einrahmen.
 */
export function useArchivierbar(bereich: ProjektBereich, lokaleId: ID): boolean {
  return useArchiv(bereich, lokaleId).archiviert === false;
}

export function ArchivKnopf({ bereich, lokaleId, klein = false }: { bereich: ProjektBereich; lokaleId: ID; klein?: boolean }) {
  const { archiviert, setzen } = useArchiv(bereich, lokaleId);
  const knopf = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (archiviert === false && fokusNachArchiv === 'knopf') {
      fokusNachArchiv = null;
      knopf.current?.focus();
    }
  }, [archiviert]);
  if (archiviert !== false) return null;
  return (
    <button
      ref={knopf}
      type="button"
      className={`btn btn-outline ${klein ? 'btn-sm' : ''}`}
      title="Nimmt das Projekt in diesem Bereich aus Übersicht und Seitenleiste – es bleibt erhalten"
      onClick={() => setzen(true)}
    >
      <Icon name="archiv" size={klein ? 12 : 14} /> Archivieren
    </button>
  );
}

/** Archivhinweis oben im Projekt, mit „Aus dem Archiv holen“. */
export function ArchivHinweis({ bereich, lokaleId }: { bereich: ProjektBereich; lokaleId: ID }) {
  const { archiviert, setzen } = useArchiv(bereich, lokaleId);
  const knopf = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    // focus() holt den Hinweis zugleich ins Bild, wenn weiter unten archiviert wurde
    if (archiviert && fokusNachArchiv === 'hinweis') {
      fokusNachArchiv = null;
      knopf.current?.focus();
    }
  }, [archiviert]);
  if (!archiviert) return null;
  return (
    <Callout icon="🗄">
      <div className="gem-archivhinweis">
        <span>{`Dieses Projekt ist in ${BEREICH_TITEL[bereich]} archiviert. Es erscheint nicht in Übersicht und Seitenleiste.`}</span>
        <button ref={knopf} type="button" className="btn btn-sm btn-outline" onClick={() => setzen(false)}>
          <Icon name="rueckgaengig" size={12} /> Aus dem Archiv holen
        </button>
      </div>
    </Callout>
  );
}

/** Aufklappbarer Abschnitt mit den im Bereich archivierten Projekten. */
export function ArchivAbschnitt({ anzahl, children }: { anzahl: number; children: ReactNode }) {
  const [offen, setOffen] = useState(false);
  if (anzahl === 0) return null;
  return (
    <section className="stack gem-abschnitt">
      <button type="button" className="gem-umschalter" onClick={() => setOffen((o) => !o)} aria-expanded={offen}>
        <span className={`gem-pfeil ${offen ? 'offen' : ''}`}>
          <Icon name="chevron" size={13} />
        </span>
        <Icon name="archiv" size={15} />
        Archiv <span className="tertiary">({anzahl})</span>
      </button>
      {offen ? <div className="grid grid-2 gem-archiv-liste">{children}</div> : null}
    </section>
  );
}

/** Projekte, die andere Bereiche führen, dieser nicht (ohne überall archivierte) – auf die Suche gefiltert. */
function fremdeTreffer(register: Register, bereich: ProjektBereich, suche: string): RegisterProjekt[] {
  const begriff = suche.trim().toLowerCase();
  return register.projekte
    .filter((p) => !p.bereiche[bereich] && !Object.values(p.bereiche).every((m) => m?.archiviert))
    .filter((p) => !begriff || [p.nummer, p.name, p.beschreibung].join(' ').toLowerCase().includes(begriff));
}

/**
 * Leerzustand der Projektliste, wenn die Suche kein aktives Projekt des
 * Bereichs trifft. Die Liste sucht mit demselben Begriff auch im Archiv und –
 * `mitFremden`, also bei geladenem Bestand – unter „Projekte aus anderen
 * Bereichen“; steht dort ein Treffer, sagt der Text, wo – „keinen Treffer“
 * stünde sonst unmittelbar über einem.
 */
export function useSucheOhneTreffer(
  bereich: ProjektBereich,
  suche: string,
  archivTreffer: number,
  mitFremden: boolean,
): { titel: string; text: string } {
  const register = useRegister();
  const fremde = mitFremden ? fremdeTreffer(register, bereich, suche).length : 0;
  if (archivTreffer > 0) {
    return {
      titel: 'Kein aktives Projekt gefunden',
      text:
        fremde > 0
          ? 'Für diese Suche gibt es nur Treffer im Archiv und in anderen Bereichen – sie stehen unten unter „Archiv“ und „Projekte aus anderen Bereichen“.'
          : 'Für diese Suche gibt es nur Treffer im Archiv – sie stehen unten unter „Archiv“.',
    };
  }
  if (fremde > 0) {
    return {
      titel: 'Kein Projekt in diesem Bereich gefunden',
      text: 'Für diese Suche gibt es nur Treffer in anderen Bereichen – sie stehen unten unter „Projekte aus anderen Bereichen“.',
    };
  }
  return { titel: 'Kein Projekt gefunden', text: 'Für diese Suche gibt es keinen Treffer.' };
}

/**
 * Grau hinterlegter Abschnitt mit den Projekten, die andere Bereiche führen,
 * dieser aber nicht – ohne die, die in allen ihren Bereichen archiviert sind.
 * „Übernehmen in …“ legt das Projekt im Bereich an – samt den geteilten
 * Projektbeteiligten.
 */
export function FremdeProjekte({ bereich, suche }: { bereich: ProjektBereich; suche: string }) {
  const register = useRegister();
  const toast = useToast();
  const liste = fremdeTreffer(register, bereich, suche).sort((a, b) =>
    projektTitel(a).localeCompare(projektTitel(b), 'de'),
  );
  if (liste.length === 0) return null;

  const uebernehmen = (p: RegisterProjekt) => {
    const personen = register.personen.filter((x) => x.projektId === p.id).length;
    registerAendern((r) => inBereichUebernehmen(r, p.id, bereich, p.id));
    toast(
      personen > 0
        ? `„${p.name}“ übernommen – mit ${personen} ${personen === 1 ? 'Projektbeteiligtem' : 'Projektbeteiligten'}.`
        : `„${p.name}“ übernommen.`,
    );
  };

  return (
    <section className="stack gem-abschnitt">
      <div className="gem-abschnitt-kopf">
        <h2>Projekte aus anderen Bereichen</h2>
        <span className="small tertiary">
          Noch nicht in {BEREICH_TITEL[bereich]} geführt. „Übernehmen“ legt das Projekt hier an – Projektbeteiligte
          und Kontaktdaten teilt es mit den anderen Bereichen.
        </span>
      </div>
      <div className="grid grid-2">
        {liste.map((p) => (
          <div key={p.id} className="card gem-fremd">
            <div className="card-pad gem-fremd-inhalt">
              <div className="mono tertiary">{p.nummer}</div>
              <h2 className="gem-fremd-titel">{p.name || 'Ohne Bezeichnung'}</h2>
              {p.beschreibung ? <div className="small muted truncate">{p.beschreibung}</div> : null}
              <ProjektMarken projekt={p} aus={bereich} label="Geführt in" />
              <div className="gem-fremd-fuss">
                <button type="button" className="btn btn-sm btn-outline" onClick={() => uebernehmen(p)}>
                  <Icon name="importieren" size={12} /> Übernehmen in {BEREICH_TITEL[bereich]}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Beim Anlegen: Gibt es das Projekt (gleiche Projektnummer) schon in einem
 * anderen Bereich, wird es beim Anlegen damit verknüpft.
 */
export function VerknuepfungsHinweis({ bereich, nummer }: { bereich: ProjektBereich; nummer: string }) {
  const register = useRegister();
  const n = nummer.trim().toLowerCase();
  if (!n) return null;
  const p = register.projekte.find((x) => !x.bereiche[bereich] && x.nummer.trim().toLowerCase() === n);
  if (!p) return null;
  // Ein überall archiviertes Projekt steht nicht unter „Projekte aus anderen Bereichen“ – hier sagen, dass es eines ist
  const archiviert = Object.values(p.bereiche).every((m) => m?.archiviert);
  return (
    <Callout icon="↔">
      {`Die Projektnummer gehört zu „${projektTitel(p)}“${archiviert ? ' (dort archiviert)' : ''}. Beim Anlegen wird es damit verknüpft: Bezeichnung und Projektbeteiligte kommen von dort und gelten in allen Bereichen.`}
    </Callout>
  );
}

/** Die geteilten Projektbeteiligten eines Projekts – zum Nachschlagen (Pflege im Planlaufmanagement bzw. in der Projektsteuerung). */
export function RegisterBeteiligte({ bereich, lokaleId }: { bereich: ProjektBereich; lokaleId: ID }) {
  const register = useRegister();
  const p = projektImBereich(register, bereich, lokaleId);
  const personen = p
    ? register.personen
        .filter((x) => x.projektId === p.id)
        .sort((a, b) => (a.nachname || a.firma).localeCompare(b.nachname || b.firma, 'de'))
    : [];
  return (
    <Card>
      <CardHeader
        titel="Projektbeteiligte"
        sub="Gemeinsam mit den anderen Bereichen des Projekts – gepflegt im Planlaufmanagement bzw. in der Projektsteuerung"
      />
      {personen.length === 0 ? (
        <EmptyState
          icon="person"
          titel="Noch keine Projektbeteiligten"
          text="Sobald das Projekt im Planlaufmanagement oder in der Projektsteuerung Beteiligte führt, stehen sie hier."
        />
      ) : (
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Funktion</th>
                <th>Firma</th>
                <th>Kontakt</th>
              </tr>
            </thead>
            <tbody>
              {personen.map((x) => (
                <tr key={x.id}>
                  <td>
                    <strong>{personName(x) || '–'}</strong>
                  </td>
                  <td>{x.funktionen.map(funktionText).join(', ') || <span className="tertiary">–</span>}</td>
                  <td>{x.firma || <span className="tertiary">–</span>}</td>
                  <td className="small">
                    {x.email ? (
                      <div>
                        <a href={`mailto:${x.email}`}>{x.email}</a>
                      </div>
                    ) : null}
                    {x.telefon ? <div>{x.telefon}</div> : null}
                    {x.mobil ? <div>{x.mobil}</div> : null}
                    {!x.email && !x.telefon && !x.mobil ? <span className="tertiary">–</span> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
