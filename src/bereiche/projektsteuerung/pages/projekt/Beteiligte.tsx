/**
 * Projektbeteiligtenliste – aufgebaut wie die Funktionsliste im
 * Planlaufmanagement, aber ohne leere Funktionen: Es erscheinen nur Personen,
 * und jede trägt eine der projektübergreifenden Funktionen. Neue Personen
 * erhalten ihre Funktion aus einer Auswahl, in der sich auch gleich eine neue
 * Funktion anlegen lässt; ganze Listen kommen über den Excel-Import.
 *
 * Gegliedert wird nach der Art der Funktion: Die Reiter zeigen die Arten, die
 * im Projekt vorkommen („Alle“ zeigt jede unter ihrer Gruppenzeile, Personen
 * ohne Funktion zuletzt), der Filter daneben die Gewerke des Projekts; das
 * Gewerk steht als Abzeichen hinter der Funktion. Druck und Excel-Ausgabe
 * nehmen immer alle Personen – unabhängig von Reiter, Filter und Suche.
 */
import { useState } from 'react';
import {
  ALLE_ARTEN,
  ALLE_GEWERKE,
  ArtGruppenZeile,
  ArtReiter,
  GewerkFilter,
  OHNE_GEWERK,
  artWahlGueltig,
  gewerkPasst,
  gewerkWahlGueltig,
  useWahlNachziehen,
} from '../../../../gemeinsam/FunktionsArten';
import { artInfo, funktionenVergleich, gewerkRang, nachArt } from '../../../../gemeinsam/funktionskatalog';
import { today } from '../../../../shared/dates';
import { Icon } from '../../../../shared/icons';
import { useToast } from '../../../../shared/toast';
import { Avatar, Card, CardHeader, ConfirmDialog, EmptyState, Search } from '../../../../shared/ui';
import { BeteiligteImport } from '../../components/BeteiligteImport';
import { BeteiligterDialog } from '../../components/BeteiligterDialog';
import { FunktionsZelle } from '../../components/common';
import { beteiligteHtml, blattDrucken } from '../../domain/druck';
import { beteiligteExportieren } from '../../domain/export';
import { logosVon } from '../../domain/seed';
import {
  funktionsName,
  kuerzelVon,
  personName,
  type Beteiligter,
  type Funktion,
  type ID,
  type Projekt,
} from '../../domain/types';
import { useStore } from '../../store/store';

/** Spalten der Tabelle – die Gruppenzeile je Art geht über alle. */
const SPALTEN = 5;

/**
 * Reihenfolge der Projektbeteiligten: nach der Art der Funktion (wie im
 * Funktionskatalog), darin nach Bezeichnung und Gewerk (übergreifend zuerst,
 * dann in der Reihenfolge von `gewerke`), zuletzt nach Nach- und Vorname;
 * Personen ohne Funktion am Ende. So stehen sie in der Liste, im Druck, in
 * der Excel-Ausgabe und in der Auswahl der Teilnehmenden eines Protokolls.
 */
export function nachFunktion(
  beteiligte: Beteiligter[],
  funktionen: Funktion[],
  gewerke?: readonly string[],
): Beteiligter[] {
  const zuId = new Map(funktionen.map((f) => [f.id, f]));
  const funktion = (b: Beteiligter) => (b.funktionId ? zuId.get(b.funktionId) : undefined);
  const vergleich = funktionenVergleich(gewerke);
  const name = (a: Beteiligter, b: Beteiligter) =>
    a.nachname.localeCompare(b.nachname, 'de') || a.vorname.localeCompare(b.vorname, 'de');
  return [...beteiligte].sort((a, b) => {
    const fa = funktion(a);
    const fb = funktion(b);
    if (!fa || !fb) return fa ? -1 : fb ? 1 : name(a, b);
    return vergleich(fa, fb) || name(a, b);
  });
}

export function Beteiligte({ projekt }: { projekt: Projekt }) {
  const { data, deleteBeteiligter } = useStore();
  const toast = useToast();
  const [suche, setSuche] = useState('');
  const [dialog, setDialog] = useState<{ beteiligter?: Beteiligter } | null>(null);
  const [loeschen, setLoeschen] = useState<Beteiligter | null>(null);
  const [importOffen, setImportOffen] = useState(false);
  const [artWahl, setArtWahl] = useState(ALLE_ARTEN);
  const [gewerkWahl, setGewerkWahl] = useState(ALLE_GEWERKE);

  const zuId = new Map(data.funktionen.map((f) => [f.id, f]));
  const funktion = (b: Beteiligter) => (b.funktionId ? zuId.get(b.funktionId) : undefined);
  const alle = nachFunktion(
    data.beteiligte.filter((b) => b.projektId === projekt.id),
    data.funktionen,
    data.gewerke,
  );

  // Erste Ebene: die Arten, die im Projekt vorkommen. Eine Art, die es nicht mehr gibt, fällt auf „Alle“ zurück.
  const arten = alle.flatMap((b) => {
    const f = funktion(b);
    return f ? [artInfo(f.art).id] : [];
  });
  const mitOhneFunktion = alle.some((b) => !funktion(b));
  // Bei einer einzigen Art (und niemandem ohne Funktion) gäbe es nichts zu wählen – dann ohne Reiter, mit „Alle“
  const reiterZeigen = new Set(arten).size > 1 || (arten.length > 0 && mitOhneFunktion);
  const art = reiterZeigen ? artWahlGueltig(artWahl, arten) : ALLE_ARTEN;
  const alleArten = art === ALLE_ARTEN;
  // Zweite Ebene: die Gewerke, die im Projekt vorkommen – in der Reihenfolge der Gewerkliste
  const gewerke = [...new Set(alle.flatMap((b) => funktion(b)?.gewerk ?? []))].sort(
    (a, b) => gewerkRang(a, data.gewerke) - gewerkRang(b, data.gewerke) || a.localeCompare(b, 'de'),
  );
  const gewerkFilter = gewerkWahlGueltig(gewerkWahl, gewerke);
  useWahlNachziehen(artWahl, art, setArtWahl);
  useWahlNachziehen(gewerkWahl, gewerkFilter, setGewerkWahl);
  const passt = (b: Beteiligter, zurArt: string) => {
    const f = funktion(b);
    // Personen ohne Funktion stehen nur unter „Alle“ ohne Gewerkfilter
    if (!f) return zurArt === ALLE_ARTEN && gewerkFilter === ALLE_GEWERKE;
    return (zurArt === ALLE_ARTEN || artInfo(f.art).id === zurArt) && gewerkPasst(f.gewerk, gewerkFilter);
  };
  const inAuswahl = alle.filter((b) => passt(b, art));
  /**
   * Nach dem Speichern: Die Ansicht folgt der Person in die Art und das Gewerk
   * ihrer Funktion, statt sie zu verlieren (wie die Funktionslisten) – die
   * Zeile bleibt sichtbar, und der Dialog gibt den Fokus an ihren Knopf zurück.
   */
  const zeigen = (_id: ID, funktionId: ID | null) => {
    const f = data.funktionen.find((x) => x.id === funktionId);
    if (!alleArten && (!f || artInfo(f.art).id !== art)) setArtWahl(f ? artInfo(f.art).id : ALLE_ARTEN);
    if (!f ? gewerkFilter !== ALLE_GEWERKE : !gewerkPasst(f.gewerk, gewerkFilter)) setGewerkWahl(ALLE_GEWERKE);
  };
  const gesucht = suche.trim().toLowerCase();
  const sichtbar = inAuswahl.filter((b) => {
    if (!gesucht) return true;
    const f = funktion(b);
    return [f ? funktionsName(f) : '', f?.kuerzel, b.kuerzel, b.vorname, b.nachname, b.firma, b.email]
      .join(' ')
      .toLowerCase()
      .includes(gesucht);
  });
  const gruppen = nachArt(
    sichtbar.flatMap((b) => {
      const f = funktion(b);
      return f ? [{ art: f.art, person: b, funktion: f }] : [];
    }),
  );
  const ohneFunktion = sichtbar.filter((b) => !funktion(b));
  const funktionenImProjekt = new Set(alle.map((b) => b.funktionId).filter(Boolean)).size;

  const drucken = () =>
    blattDrucken(
      `Projektbeteiligte – ${projekt.name}`,
      beteiligteHtml(
        projekt,
        alle.map((b) => ({
          art: funktion(b)?.art ?? null,
          funktion: ((f) => (f ? funktionsName(f) : ''))(funktion(b)),
          name: [b.anrede, personName(b)].filter(Boolean).join(' '),
          firma: b.firma,
          kuerzel: kuerzelVon(b, data.funktionen),
          email: b.email,
          telefon: [b.telefon, b.mobil].filter(Boolean).join(' · '),
        })),
        logosVon(projekt),
        today(),
      ),
    );

  const zeile = (b: Beteiligter, f?: Funktion) => (
    <tr key={b.id} className="clickable" onClick={() => setDialog({ beteiligter: b })}>
      <td>
        {f ? (
          <FunktionsZelle funktion={f} kuerzel={kuerzelVon(b, data.funktionen)} />
        ) : (
          <span className="tertiary small">– ohne Funktion –</span>
        )}
      </td>
      <td>
        <span className="row" style={{ gap: 8 }}>
          <Avatar name={personName(b)} farbe={f?.farbe} />
          <span style={{ minWidth: 0 }}>
            <strong>{personName(b)}</strong>
            {b.notiz ? <div className="small tertiary truncate">{b.notiz}</div> : null}
          </span>
        </span>
      </td>
      <td className="small muted col-optional">{b.firma || '–'}</td>
      <td className="small col-optional">
        {b.email ? (
          <a href={`mailto:${b.email}`} onClick={(e) => e.stopPropagation()}>
            {b.email}
          </a>
        ) : (
          <span className="tertiary">–</span>
        )}
        {b.telefon || b.mobil ? (
          <div className="tertiary small">{[b.telefon, b.mobil].filter(Boolean).join(' · ')}</div>
        ) : null}
      </td>
      <td className="actions">
        <button
          type="button"
          className="btn-icon"
          aria-label="Person bearbeiten"
          title="Person bearbeiten"
          onClick={(e) => {
            e.stopPropagation();
            setDialog({ beteiligter: b });
          }}
        >
          <Icon name="bearbeiten" size={15} />
        </button>
        <button
          type="button"
          className="btn-icon"
          aria-label="Person löschen"
          title="Person löschen"
          onClick={(e) => {
            e.stopPropagation();
            setLoeschen(b);
          }}
        >
          <Icon name="loeschen" size={15} />
        </button>
      </td>
    </tr>
  );

  const personenText = (n: number) => `${n} ${n === 1 ? 'Person' : 'Personen'}`;
  const gewerkZusatz =
    gewerkFilter === ALLE_GEWERKE ? '' : gewerkFilter === OHNE_GEWERK ? ' ohne Gewerkbezug' : ` im Gewerk ${gewerkFilter}`;

  return (
    <div className="stack">
      {reiterZeigen ? (
        <ArtReiter
          arten={arten}
          wahl={art}
          onWahl={setArtWahl}
          anzahl={(a) => alle.filter((b) => !!funktion(b) && passt(b, a)).length}
        />
      ) : null}

      <div className="row-between wrap">
        <div className="row wrap">
          <Search value={suche} onChange={setSuche} placeholder="Funktion, Person, Firma …" />
          {gewerke.length > 0 ? <GewerkFilter gewerke={gewerke} wahl={gewerkFilter} onWahl={setGewerkWahl} /> : null}
        </div>
        <div className="row wrap">
          <button type="button" className="btn btn-outline" onClick={() => setImportOffen(true)}>
            <Icon name="importieren" size={14} /> Excel-Import
          </button>
          <button type="button" className="btn btn-outline" onClick={drucken} disabled={alle.length === 0}>
            <Icon name="plan" size={14} /> Drucken / PDF
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => beteiligteExportieren(projekt, alle, data.funktionen)}
            disabled={alle.length === 0}
          >
            <Icon name="export" size={14} /> Excel
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setDialog({})}>
            <Icon name="plus" size={14} /> Person hinzufügen
          </button>
        </div>
      </div>

      <Card>
        <CardHeader
          titel={alleArten ? 'Projektbeteiligte' : artInfo(art).name}
          sub={`${
            inAuswahl.length === alle.length
              ? personenText(alle.length)
              : `${inAuswahl.length} von ${personenText(alle.length)}`
          } · ${funktionenImProjekt} ${
            funktionenImProjekt === 1 ? 'Funktion' : 'Funktionen'
          } · Grundlage für Teilnehmende und Verantwortliche in Protokollen`}
        />
        {alle.length === 0 ? (
          <EmptyState
            icon="person"
            titel="Noch keine Projektbeteiligten"
            text="Nehmen Sie die Personen des Projekts auf – je Person mit ihrer Funktion aus den projektübergreifenden Funktionen."
            action={
              <button type="button" className="btn btn-primary" onClick={() => setDialog({})}>
                <Icon name="plus" size={14} /> Person hinzufügen
              </button>
            }
          />
        ) : sichtbar.length === 0 ? (
          gesucht ? (
            // Suche ohne Treffer ist kein leerer Bestand – kein Anlegen-Knopf
            <EmptyState icon="person" titel="Keine Person gefunden" text="Für diese Suche gibt es keinen Treffer." />
          ) : (
            <EmptyState
              icon="person"
              titel="Keine Person in dieser Auswahl"
              text={`${alleArten ? 'Im Projekt' : `In der Art „${artInfo(art).name}“`} gibt es keine Person${gewerkZusatz}.`}
            />
          )
        ) : (
          <div className="table-scroll">
            <table className="table ps-funktionsliste ps-beteiligte">
              <thead>
                <tr>
                  <th>Funktion</th>
                  <th>Person</th>
                  <th className="col-optional">Firma / Büro</th>
                  <th className="col-optional">Kontakt</th>
                  <th className="actions" />
                </tr>
              </thead>
              <tbody>
                {/* Eine flache Liste mit Schlüsseln statt je Art ein Fragment: Wechselt eine Zeile die Art, hängt React
                    sie um, statt sie neu aufzubauen – der Knopf, der den Dialog geöffnet hat, bekommt den Fokus zurück */}
                {[
                  ...gruppen.flatMap((g) => [
                    // Unter einer Art nennt sie der Kartentitel – die Gruppenzeile steht nur unter „Alle“
                    alleArten ? (
                      <ArtGruppenZeile key={`art-${g.art.id}`} art={g.art.id} spalten={SPALTEN} anzahl={g.eintraege.length} />
                    ) : null,
                    ...g.eintraege.map((e) => zeile(e.person, e.funktion)),
                  ]),
                  // Personen ohne Funktion in derselben Liste – auch wer eine Funktion bekommt, wird nur umgehängt
                  ...(ohneFunktion.length > 0
                    ? [
                        <tr key="ohne-funktion" className="gruppe-zeile gem-artzeile">
                          <td colSpan={SPALTEN}>
                            <strong>Ohne Funktion</strong>
                            <span className="small tertiary"> {ohneFunktion.length}</span>
                          </td>
                        </tr>,
                        ...ohneFunktion.map((b) => zeile(b)),
                      ]
                    : []),
                ]}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {importOffen ? <BeteiligteImport projekt={projekt} onClose={() => setImportOffen(false)} /> : null}

      {dialog ? (
        <BeteiligterDialog
          projektId={projekt.id}
          beteiligter={dialog.beteiligter}
          onClose={() => setDialog(null)}
          onGespeichert={zeigen}
        />
      ) : null}

      {loeschen ? (
        <ConfirmDialog
          titel="Person löschen?"
          text={`${personName(loeschen)} wird aus der Projektbeteiligtenliste entfernt. In bestehenden Protokollen bleiben Name und Angaben als Text stehen.`}
          onConfirm={() => {
            deleteBeteiligter(loeschen.id);
            toast('Person gelöscht.');
          }}
          onClose={() => setLoeschen(null)}
        />
      ) : null}
    </div>
  );
}
