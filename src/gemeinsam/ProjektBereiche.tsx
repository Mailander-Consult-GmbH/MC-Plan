/**
 * Oberflächenbausteine zum Projektregister, die alle Bereiche verwenden:
 *
 * * `BereichsMarken` – unten in der Projektkachel: in welchen anderen
 *   Bereichen das Projekt noch geführt wird,
 * * `FremdeProjekte` – grau hinterlegter Abschnitt „Projekte aus anderen
 *   Bereichen“ mit „Übernehmen in …“,
 * * `ArchivAbschnitt`, `ArchivHinweis`, `useArchivierte` – im Bereich
 *   archivierte Projekte (archiviert wird im Controlling),
 * * `VerknuepfungsHinweis` – beim Anlegen: Das Projekt gibt es schon,
 * * `RegisterBeteiligte` – die geteilten Projektbeteiligten zum Nachschlagen.
 */
import { useMemo, useState, type ReactNode } from 'react';
import { Icon } from '../shared/icons';
import { useToast } from '../shared/toast';
import { Badge, Callout, Card, CardHeader, EmptyState } from '../shared/ui';
import { inBereichUebernehmen } from './abgleich';
import {
  BEREICH_TITEL,
  PROJEKT_BEREICHE,
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

/** Kennungen der im Bereich archivierten Projekte – im Bereich selbst oder im Controlling. */
export function useArchivierte(bereich: ProjektBereich): Set<ID> {
  const register = useRegister();
  return useMemo(() => archivierteIds(register, bereich), [register, bereich]);
}

/** Titel der anderen Bereiche, die das Projekt führen, etwa „Planlaufmanagement und Projektsteuerung“. */
export function andereBereiche(register: Register, bereich: ProjektBereich, lokaleId: ID): string {
  const p = projektImBereich(register, bereich, lokaleId);
  if (!p) return '';
  const titel = PROJEKT_BEREICHE.filter((b) => b.id !== bereich && p.bereiche[b.id] && !p.bereiche[b.id]!.offen).map((b) => b.titel);
  return titel.length <= 1 ? (titel[0] ?? '') : `${titel.slice(0, -1).join(', ')} und ${titel[titel.length - 1]}`;
}

/** Hinweis für Löschdialoge: Was in den anderen Bereichen bleibt. */
export function useLoeschHinweis(bereich: ProjektBereich, lokaleId: ID): string {
  const register = useRegister();
  const andere = andereBereiche(register, bereich, lokaleId);
  return andere ? ` In ${andere} bleibt das Projekt mit seinen Projektbeteiligten erhalten.` : '';
}

/** Marken der Bereiche eines Registerprojekts (ohne `ohne`). */
export function ProjektMarken({ projekt, ohne, label }: { projekt: RegisterProjekt; ohne?: ProjektBereich; label?: string }) {
  const marken = PROJEKT_BEREICHE.filter((b) => b.id !== ohne && projekt.bereiche[b.id]);
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
  return <ProjektMarken projekt={p} ohne={bereich} label="Auch in" />;
}

/** Archivhinweis oben im Projekt. */
export function ArchivHinweis({ bereich, lokaleId }: { bereich: ProjektBereich; lokaleId: ID }) {
  const register = useRegister();
  const p = projektImBereich(register, bereich, lokaleId);
  if (!p || !istArchiviert(p, bereich)) return null;
  return (
    <Callout icon="🗄">
      Dieses Projekt ist {p.archiviert ? 'im Controlling für alle Bereiche' : `in ${BEREICH_TITEL[bereich]}`} archiviert. Es
      erscheint nicht in Übersicht und Seitenleiste; zurückholen lässt es sich im Controlling.
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
        <span className="small tertiary gem-umschalter-text">Archiviert wird im Controlling – je Bereich oder für alle.</span>
      </button>
      {offen ? <div className="grid grid-2 gem-archiv-liste">{children}</div> : null}
    </section>
  );
}

/**
 * Grau hinterlegter Abschnitt mit den Projekten, die andere Bereiche (oder das
 * Controlling) führen, dieser aber nicht. „Übernehmen in …“ legt das Projekt
 * im Bereich an – samt den geteilten Projektbeteiligten.
 */
export function FremdeProjekte({ bereich, suche }: { bereich: ProjektBereich; suche: string }) {
  const register = useRegister();
  const toast = useToast();
  const begriff = suche.trim().toLowerCase();
  const liste = register.projekte
    .filter((p) => !p.bereiche[bereich] && !p.archiviert)
    .filter((p) => !begriff || [p.nummer, p.name, p.beschreibung].join(' ').toLowerCase().includes(begriff))
    .sort((a, b) => projektTitel(a).localeCompare(projektTitel(b), 'de'));
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
        {liste.map((p) => {
          const personen = register.personen.filter((x) => x.projektId === p.id).length;
          return (
            <div key={p.id} className="card gem-fremd">
              <div className="card-pad">
                <div className="mono tertiary">{p.nummer || 'ohne Nummer'}</div>
                <h2 className="gem-fremd-titel">{p.name || 'Ohne Bezeichnung'}</h2>
                {p.beschreibung ? <div className="small muted truncate">{p.beschreibung}</div> : null}
                <div className="row wrap gem-fremd-fuss">
                  <span className="small muted">
                    <b>{personen}</b> {personen === 1 ? 'Projektbeteiligter' : 'Projektbeteiligte'}
                  </span>
                  <button type="button" className="btn btn-sm btn-outline" onClick={() => uebernehmen(p)}>
                    <Icon name="importieren" size={12} /> Übernehmen in {BEREICH_TITEL[bereich]}
                  </button>
                </div>
                {Object.keys(p.bereiche).length > 0 ? (
                  <ProjektMarken projekt={p} label="Geführt in" />
                ) : (
                  <div className="gem-marken">
                    <span className="gem-marken-label">Im Controlling angelegt, noch in keinem Bereich</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
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
  const p = register.projekte.find((x) => !x.bereiche[bereich] && !x.archiviert && x.nummer.trim().toLowerCase() === n);
  if (!p) return null;
  return (
    <Callout icon="↔">
      Die Projektnummer gehört zu „{projektTitel(p)}“. Beim Anlegen wird es damit verknüpft: Bezeichnung und
      Projektbeteiligte kommen von dort und gelten in allen Bereichen.
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
