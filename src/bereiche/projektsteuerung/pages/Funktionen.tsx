/**
 * Projektübergreifende Funktionen, gegliedert nach der Art der Funktion – wie
 * im Planlaufmanagement: Die Reiter wählen die Art („Alle“ zeigt jede Art
 * unter ihrer Gruppenzeile), der Filter daneben das Gewerk; es steht als
 * Abzeichen hinter jeder Bezeichnung. Die Funktionen bilden die Auswahl, aus
 * der jede Person der Projektbeteiligtenliste ihre Funktion erhält. Eine
 * Funktion – oder ein Gewerk –, die noch Projektbeteiligten zugeordnet ist,
 * lässt sich nicht löschen.
 *
 * Gewerke haben keine eigene Seite mehr: Ein neues entsteht im Dialog einer
 * Funktion (Knopf „Gewerk“); zeigt der Filter ein Gewerk, stehen dort
 * „Vorhandene Funktion“ (eine Funktion eines anderen Gewerks hier ergänzen)
 * und unter der Karte „Gewerk „…“ löschen“.
 */
import { Fragment, useState, type CSSProperties } from 'react';
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
} from '../../../gemeinsam/FunktionsArten';
import { artInfo, funktionenVergleich, kuerzelFuerGewerk, nachArt } from '../../../gemeinsam/funktionskatalog';
import { Icon } from '../../../shared/icons';
import { useToast } from '../../../shared/toast';
import { Card, CardHeader, ConfirmDialog, EmptyState, Modal, Search } from '../../../shared/ui';
import { FunktionDialog } from '../components/FunktionDialog';
import { GewerkLoeschenDialog } from '../components/GewerkDialog';
import { FunktionsZelle } from '../components/common';
import { funktionsName, kuerzelAus, type Beteiligter, type Funktion, type ID } from '../domain/types';
import { useStore } from '../store/store';

/** Spalten der Tabelle – die Gruppenzeile je Art geht über alle. */
const SPALTEN = 5;

const gleich = (a: string | null, b: string | null) => (a ?? '').trim().toLowerCase() === (b ?? '').trim().toLowerCase();
const anzahlText = (n: number) => `${n} ${n === 1 ? 'Funktion' : 'Funktionen'}`;

export function Funktionen() {
  const { data, addFunktion, deleteFunktion } = useStore();
  const toast = useToast();
  const [artWahl, setArtWahl] = useState(ALLE_ARTEN);
  const [gewerkWahl, setGewerkWahl] = useState(ALLE_GEWERKE);
  const [suche, setSuche] = useState('');
  const [dialog, setDialog] = useState<{ funktion?: Funktion } | null>(null);
  const [loeschen, setLoeschen] = useState<Funktion | null>(null);
  const [ergaenzen, setErgaenzen] = useState(false);
  const [gewerkLoeschen, setGewerkLoeschen] = useState<string | null>(null);

  // Erste Ebene: die Art. Eine Art, die es nicht mehr gibt, fällt auf „Alle“ zurück.
  const art = artWahlGueltig(
    artWahl,
    data.funktionen.map((f) => f.art),
  );
  const alleArten = art === ALLE_ARTEN;
  const inArt = (f: Funktion) => alleArten || artInfo(f.art).id === art;
  // Zweite Ebene: das Gewerk. `gewerk` ist das im Filter gewählte – null bei „Alle Gewerke“ und „Übergreifend“.
  const gewerkFilter = gewerkWahlGueltig(gewerkWahl, data.gewerke);
  const gewerk = gewerkFilter === ALLE_GEWERKE || gewerkFilter === OHNE_GEWERK ? null : gewerkFilter;

  const personenJe = new Map<ID, Beteiligter[]>();
  for (const b of data.beteiligte) {
    if (b.funktionId) personenJe.set(b.funktionId, [...(personenJe.get(b.funktionId) ?? []), b]);
  }
  const personen = (f: Funktion) => personenJe.get(f.id) ?? [];

  const inAuswahl = data.funktionen.filter((f) => inArt(f) && gewerkPasst(f.gewerk, gewerkFilter));
  const gesucht = suche.trim().toLowerCase();
  const funktionen = inAuswahl
    .filter((f) => [funktionsName(f), f.kuerzel, f.beschreibung].join(' ').toLowerCase().includes(gesucht))
    .sort(funktionenVergleich(data.gewerke));
  const gruppen = nachArt(funktionen);

  // Funktionen anderer Gewerke, die es im gewählten Gewerk noch nicht gibt – je Bezeichnung einmal
  // (die erste dient als Vorlage; ihr Kürzel stellt `kuerzelFuerGewerk` auf das neue Gewerk um).
  const imGewerk = gewerk ? data.funktionen.filter((f) => gleich(f.gewerk, gewerk)) : [];
  const vorlagen = new Map<string, Funktion>();
  if (gewerk) {
    for (const f of data.funktionen) {
      if (f.gewerk === null || gleich(f.gewerk, gewerk) || !inArt(f)) continue;
      if (imGewerk.some((x) => gleich(x.name, f.name))) continue;
      const schluessel = f.name.trim().toLowerCase();
      if (!vorlagen.has(schluessel)) vorlagen.set(schluessel, f);
    }
  }
  const ergaenzbar = [...vorlagen.values()].sort(funktionenVergleich(data.gewerke));
  const gewerkInVerwendung = imGewerk.some((f) => personen(f).length > 0);

  /** Nach dem Speichern: Die Ansicht folgt der Funktion in ihre Art und ihr Gewerk, statt sie zu verlieren. */
  const zeigen = (f: Pick<Funktion, 'art' | 'gewerk'>) => {
    if (!alleArten && artInfo(f.art).id !== art) setArtWahl(artInfo(f.art).id);
    if (!gewerkPasst(f.gewerk, gewerkFilter)) setGewerkWahl(ALLE_GEWERKE);
  };

  const gewerkZusatz =
    gewerkFilter === ALLE_GEWERKE ? '' : gewerkFilter === OHNE_GEWERK ? ' ohne Gewerkbezug' : ` im Gewerk ${gewerkFilter}`;
  const neueFunktionKnopf = (
    <button type="button" className="btn btn-primary" onClick={() => setDialog({})}>
      <Icon name="plus" size={14} /> Neue Funktion
    </button>
  );

  return (
    <div className="stack">
      <ArtReiter
        arten={data.funktionen.map((f) => f.art)}
        wahl={art}
        onWahl={setArtWahl}
        anzahl={(a) =>
          data.funktionen.filter((f) => artInfo(f.art).id === a && gewerkPasst(f.gewerk, gewerkFilter)).length
        }
      />

      <div className="row-between wrap">
        <div className="row wrap">
          <Search value={suche} onChange={setSuche} placeholder="Funktion, Kürzel …" />
          <GewerkFilter gewerke={data.gewerke} wahl={gewerkFilter} onWahl={setGewerkWahl} />
        </div>
        <div className="row wrap">
          {gewerk && ergaenzbar.length > 0 ? (
            <button type="button" className="btn btn-outline" onClick={() => setErgaenzen(true)}>
              <Icon name="plus" size={14} /> Vorhandene Funktion
            </button>
          ) : null}
          {neueFunktionKnopf}
        </div>
      </div>

      <p className="muted small ps-einleitung">
        Die Art gliedert die Funktionen, das Gewerk unterscheidet darunter: „Fachplaner LST“ ist eine andere Funktion
        als „Fachplaner OLA“. Personen der Projektbeteiligtenliste erhalten ihre Funktion aus dieser Liste.
      </p>

      <Card>
        <CardHeader
          titel={alleArten ? 'Alle Funktionen' : artInfo(art).name}
          sub={
            inAuswahl.length === data.funktionen.length
              ? `${anzahlText(inAuswahl.length)}, projektübergreifend`
              : `${anzahlText(inAuswahl.length)}${gewerkZusatz} · ${data.funktionen.length} insgesamt, projektübergreifend`
          }
        />
        {funktionen.length === 0 ? (
          gesucht ? (
            // Suche ohne Treffer ist kein leerer Bestand – kein Anlegen-Knopf
            <EmptyState icon="person" titel="Keine Funktion gefunden" text="Für diese Suche gibt es keinen Treffer." />
          ) : (
            <EmptyState
              icon="person"
              titel="Keine Funktionen"
              text={
                data.funktionen.length === 0
                  ? 'Legen Sie die Funktionen an, aus denen die Projektbeteiligten ihre Funktion erhalten.'
                  : `${alleArten ? 'Es gibt' : `In der Art „${artInfo(art).name}“ gibt es`} keine Funktion${gewerkZusatz}.`
              }
              action={neueFunktionKnopf}
            />
          )
        ) : (
          <div className="table-scroll">
            <table className="table ps-funktionsliste">
              <thead>
                <tr>
                  <th>Funktion</th>
                  <th>Kürzel</th>
                  <th className="col-optional">Beschreibung</th>
                  <th className="col-optional">Verwendet</th>
                  <th className="actions" />
                </tr>
              </thead>
              <tbody>
                {gruppen.map((g) => (
                  <Fragment key={g.art.id}>
                    {/* Unter einer Art nennt sie der Kartentitel – die Gruppenzeile steht nur unter „Alle“ */}
                    {alleArten ? <ArtGruppenZeile art={g.art.id} spalten={SPALTEN} anzahl={g.eintraege.length} /> : null}
                    {g.eintraege.map((f) => {
                      const wer = personen(f);
                      const projekte = new Set(wer.map((b) => b.projektId)).size;
                      return (
                        <tr key={f.id} className="clickable" onClick={() => setDialog({ funktion: f })}>
                          <td>
                            <FunktionsZelle funktion={f} />
                          </td>
                          <td className="num">{f.kuerzel || '–'}</td>
                          <td className="small muted col-optional">{f.beschreibung || '–'}</td>
                          <td className="small muted col-optional">
                            {wer.length === 0
                              ? '–'
                              : `${wer.length} ${wer.length === 1 ? 'Person' : 'Personen'} in ${projekte} ${
                                  projekte === 1 ? 'Projekt' : 'Projekten'
                                }`}
                          </td>
                          <td className="actions">
                            {/* Die Zeile öffnet den Dialog nur per Mausklick – der Knopf ist der Weg mit der Tastatur */}
                            <button
                              type="button"
                              className="btn-icon"
                              aria-label="Funktion bearbeiten"
                              title="Funktion bearbeiten"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDialog({ funktion: f });
                              }}
                            >
                              <Icon name="bearbeiten" size={15} />
                            </button>
                            <button
                              type="button"
                              className="btn-icon"
                              aria-label="Funktion löschen"
                              title="Funktion löschen"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (wer.length > 0) {
                                  toast(
                                    `„${funktionsName(f)}“ ist noch ${wer.length} Projektbeteiligten zugeordnet und lässt sich deshalb nicht löschen.`,
                                  );
                                  return;
                                }
                                setLoeschen(f);
                              }}
                            >
                              <Icon name="loeschen" size={15} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {gewerk ? (
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            title={`Gewerk „${gewerk}“ mit seinen Funktionen löschen`}
            onClick={() =>
              gewerkInVerwendung
                ? toast(
                    `Funktionen des Gewerks „${gewerk}“ sind noch Projektbeteiligten zugeordnet – das Gewerk lässt sich deshalb nicht löschen.`,
                  )
                : setGewerkLoeschen(gewerk)
            }
          >
            <Icon name="loeschen" size={13} /> Gewerk „{gewerk}“ löschen
          </button>
        </div>
      ) : null}

      {ergaenzen && gewerk ? (
        <Modal
          titel={`Funktion in ${gewerk} ergänzen`}
          sub="Aus einem anderen Gewerk übernehmen – als eigene Funktion dieses Gewerks, in der Art des Originals"
          onClose={() => setErgaenzen(false)}
          footer={
            <button type="button" className="btn btn-primary" onClick={() => setErgaenzen(false)}>
              Fertig
            </button>
          }
        >
          {ergaenzbar.length === 0 ? (
            <p className="muted">
              {alleArten
                ? `Jede Funktion der anderen Gewerke gibt es in ${gewerk} bereits.`
                : `Jede Funktion der Art „${artInfo(art).name}“ aus den anderen Gewerken gibt es in ${gewerk} bereits.`}
            </p>
          ) : (
            <div className="row wrap" style={{ gap: 6 }}>
              {ergaenzbar.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className="role-chip"
                  title={artInfo(f.art).name}
                  style={{ '--chip-farbe': f.farbe, cursor: 'pointer', padding: '4px 11px' } as CSSProperties}
                  onClick={() => {
                    // Das Kürzel nennt das neue Gewerk; gleichnamige Funktionen geben notfalls die Form vor
                    const gleichnamige = data.funktionen.filter((x) => gleich(x.name, f.name));
                    addFunktion({
                      name: f.name,
                      kuerzel: kuerzelFuerGewerk(f, gewerk, gleichnamige) || kuerzelAus(f.name),
                      farbe: f.farbe,
                      beschreibung: '',
                      gewerk,
                      // Die Kopie übernimmt die Art des Originals
                      art: f.art,
                    });
                    toast(`„${f.name} ${gewerk}“ angelegt.`);
                  }}
                >
                  <Icon name="plus" size={12} /> {f.name}
                </button>
              ))}
            </div>
          )}
        </Modal>
      ) : null}

      {dialog ? (
        <FunktionDialog
          funktion={dialog.funktion}
          vorauswahl={gewerk}
          art={alleArten ? undefined : art}
          onClose={() => setDialog(null)}
          onGespeichert={zeigen}
        />
      ) : null}

      {gewerkLoeschen ? (
        <GewerkLoeschenDialog
          gewerk={gewerkLoeschen}
          onClose={() => setGewerkLoeschen(null)}
          onGeloescht={() => setGewerkWahl(ALLE_GEWERKE)}
        />
      ) : null}

      {loeschen ? (
        <ConfirmDialog
          titel="Funktion löschen?"
          text={`„${funktionsName(loeschen)}“ steht danach in keinem Projekt mehr zur Auswahl.`}
          onConfirm={() => {
            deleteFunktion(loeschen.id);
            toast('Funktion gelöscht.');
          }}
          onClose={() => setLoeschen(null)}
        />
      ) : null}
    </div>
  );
}
