/**
 * Projektübergreifende Funktionen (vormals Rollen), gegliedert nach der Art
 * der Funktion: Die Reiter wählen die Art („Alle“ zeigt jede Art unter ihrer
 * Gruppenzeile), der Filter daneben das Gewerk – es steht als Abzeichen hinter
 * jeder Bezeichnung. „Übergreifend“ sind die Funktionen, die für alle Gewerke
 * gelten und im Projekt einmal besetzt werden. Neue Projekte übernehmen diese
 * Funktionen; besetzt werden sie im Projekt unter „Funktion“. Die eigene
 * Funktion Planlaufmanagement ist fest vorgegeben und erscheint hier nicht –
 * sie füllt stets die angemeldete Person aus.
 *
 * Gewerke haben keine eigenen Reiter mehr: Ein neues entsteht im Dialog einer
 * Funktion (Knopf „Gewerk“); zeigt der Filter ein Gewerk, stehen dort
 * „Vorhandene Funktion“ (eine Funktion eines anderen Gewerks hier ergänzen)
 * und unter der Karte „Gewerk „…“ löschen“.
 */
import { useState, type CSSProperties } from 'react';
import {
  EIGENE_ROLLE,
  funktionsName,
  istEigeneFunktion,
  kuerzelAus,
  type StandardRolle,
} from '../domain/types';
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
} from '../../../gemeinsam/FunktionsArten';
import { artInfo, funktionenVergleich, kuerzelFuerGewerk, nachArt } from '../../../gemeinsam/funktionskatalog';
import { funktionsSchluessel } from '../../../gemeinsam/register';
import { useStore } from '../store/store';
import { useToast } from '../../../shared/toast';
import { Card, CardHeader, ConfirmDialog, EmptyState, Modal, Search, alsKlickZeile } from '../../../shared/ui';
import { Icon } from '../../../shared/icons';
import { GewerkLoeschenDialog } from '../components/GewerkDialog';
import { FunktionsMaske, useFunktionsFormular } from '../components/FunktionsFelder';
import { FunktionsZelle, anzahlText, inSchrittenGenannt } from '../components/FunktionsListe';
import '../components/funktionen.css';

/** Spalten der Tabelle – die Gruppenzeile je Art geht über alle. */
const SPALTEN = 4;

const gleich = (a: string | null, b: string | null) => (a ?? '').trim().toLowerCase() === (b ?? '').trim().toLowerCase();

export function Funktionen() {
  const { data, addStandardRolle, deleteStandardRolle } = useStore();
  const toast = useToast();
  const [artWahl, setArtWahl] = useState(ALLE_ARTEN);
  const [gewerkWahl, setGewerkWahl] = useState(ALLE_GEWERKE);
  const [suche, setSuche] = useState('');
  const [dialog, setDialog] = useState<{ funktion?: StandardRolle } | null>(null);
  const [ergaenzen, setErgaenzen] = useState(false);
  const [loeschen, setLoeschen] = useState<StandardRolle | null>(null);
  const [gewerkLoeschen, setGewerkLoeschen] = useState<string | null>(null);

  // Die eigene Funktion füllt immer die angemeldete Person aus – sie wird hier nicht geführt
  const alle = data.standardRollen.filter((r) => !istEigeneFunktion(r));
  // „Seite offen“ steht nur an Funktionen, die ein projektübergreifender Workflow nennt
  const genannt = inSchrittenGenannt(data.templates.filter((t) => t.projectId === null));

  // Alle vorkommenden Gewerke – gepflegte Stammdaten und die der Funktionen
  const gewerke = [
    ...new Set([...data.gewerke, ...alle.map((r) => r.gewerk).filter((g): g is string => Boolean(g))]),
  ].sort((a, b) => a.localeCompare(b, 'de'));

  // Erste Ebene: die Art. Eine Art, die es nicht mehr gibt, fällt auf „Alle“ zurück.
  const art = artWahlGueltig(
    artWahl,
    alle.map((f) => f.art),
  );
  const alleArten = art === ALLE_ARTEN;
  const inArt = (f: StandardRolle) => alleArten || artInfo(f.art).id === art;
  // Zweite Ebene: das Gewerk. `gewerk` ist das im Filter gewählte – null bei „Alle Gewerke“ und „Übergreifend“.
  const gewerkFilter = gewerkWahlGueltig(gewerkWahl, gewerke);
  useWahlNachziehen(artWahl, art, setArtWahl);
  useWahlNachziehen(gewerkWahl, gewerkFilter, setGewerkWahl);
  const gewerk = gewerkFilter === ALLE_GEWERKE || gewerkFilter === OHNE_GEWERK ? null : gewerkFilter;

  const inAuswahl = alle.filter((f) => inArt(f) && gewerkPasst(f.gewerk, gewerkFilter));
  const gesucht = suche.trim().toLowerCase();
  const funktionen = inAuswahl
    .filter((f) => [funktionsName(f), f.kuerzel, f.beschreibung].join(' ').toLowerCase().includes(gesucht))
    .sort(funktionenVergleich(gewerke));
  const gruppen = nachArt(funktionen);

  // Funktionen anderer Gewerke, die es im gewählten Gewerk noch nicht gibt – je Bezeichnung einmal,
  // unter einer Art nur die dieser Art
  const imGewerk = gewerk ? alle.filter((f) => gleich(f.gewerk, gewerk)) : [];
  const ergaenzbar = gewerk
    ? [
        ...new Map(
          alle
            .filter((f) => f.gewerk !== null && !gleich(f.gewerk, gewerk) && inArt(f))
            .filter((f) => !imGewerk.some((x) => gleich(x.name, f.name)))
            .map((f) => [f.name.trim().toLowerCase(), f]),
        ).values(),
      ].sort(funktionenVergleich(gewerke))
    : [];

  /** Nach dem Speichern: Die Ansicht folgt der Funktion in ihre Art und ihr Gewerk, statt sie zu verlieren. */
  const zeigen = (f: Pick<StandardRolle, 'art' | 'gewerk'>) => {
    if (!alleArten && artInfo(f.art).id !== art) setArtWahl(artInfo(f.art).id);
    if (!gewerkPasst(f.gewerk, gewerkFilter)) setGewerkWahl(ALLE_GEWERKE);
  };

  const gewerkZusatz =
    gewerkFilter === ALLE_GEWERKE ? '' : gewerkFilter === OHNE_GEWERK ? ', übergreifend' : ` im Gewerk ${gewerkFilter}`;
  const keineFunktion =
    gewerkFilter === OHNE_GEWERK ? 'keine übergreifende Funktion' : `keine Funktion${gewerk ? ` im Gewerk ${gewerk}` : ''}`;
  const neueFunktionKnopf = (
    <button type="button" className="btn btn-primary" onClick={() => setDialog({})}>
      <Icon name="plus" size={14} /> Neue Funktion
    </button>
  );

  return (
    <div className="stack">
      <ArtReiter
        arten={alle.map((f) => f.art)}
        wahl={art}
        onWahl={setArtWahl}
        anzahl={(a) => alle.filter((f) => artInfo(f.art).id === a && gewerkPasst(f.gewerk, gewerkFilter)).length}
      />

      <div className="pl-werkzeug">
        <div className="pl-werkzeug-filter">
          <Search value={suche} onChange={setSuche} placeholder="Funktion, Kürzel …" />
          <GewerkFilter gewerke={gewerke} wahl={gewerkFilter} onWahl={setGewerkWahl} />
        </div>
        <div className="pl-werkzeug-knoepfe">
          {gewerk && ergaenzbar.length > 0 ? (
            <button type="button" className="btn btn-outline" onClick={() => setErgaenzen(true)}>
              <Icon name="plus" size={14} /> Vorhandene Funktion
            </button>
          ) : null}
          {neueFunktionKnopf}
        </div>
      </div>

      <p className="muted small pl-einleitung">
        Erste Ebene ist die Art der Funktion, das Gewerk unterscheidet darunter: „Planprüfer KIB“ ist eine andere
        Funktion als „Planprüfer LST“. Übergreifende Funktionen gelten für alle Gewerke und werden im Projekt einmal
        besetzt. Neue Projekte übernehmen alle Funktionen dieser Liste.
      </p>

      <Card>
        <CardHeader
          titel={alleArten ? 'Alle Funktionen' : artInfo(art).name}
          sub={`${
            funktionen.length === inAuswahl.length
              ? anzahlText(inAuswahl.length)
              : `${funktionen.length} von ${anzahlText(inAuswahl.length)}`
          }${gewerkZusatz}`}
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
                alle.length === 0
                  ? 'Legen Sie die Funktionen an, die neue Projekte übernehmen.'
                  : `${alleArten ? 'Es gibt' : `In der Art „${artInfo(art).name}“ gibt es`} ${keineFunktion}.`
              }
              action={neueFunktionKnopf}
            />
          )
        ) : (
          <div className="table-scroll">
            <table className="table pl-funktionstabelle">
              <thead>
                <tr>
                  <th>Funktion</th>
                  <th>Kürzel</th>
                  <th className="col-optional">Beschreibung</th>
                  <th className="actions" />
                </tr>
              </thead>
              <tbody>
                {/* Eine flache Liste mit Schlüsseln statt je Art ein Fragment: Wechselt eine Zeile die Art, hängt React
                    sie um, statt sie neu aufzubauen – der Knopf, der den Dialog geöffnet hat, bekommt den Fokus zurück */}
                {gruppen.flatMap((g) => [
                  // Unter einer Art nennt sie der Kartentitel – die Gruppenzeile steht nur unter „Alle“
                  alleArten ? <ArtGruppenZeile key={`art-${g.art.id}`} art={g.art.id} spalten={SPALTEN} anzahl={g.eintraege.length} /> : null,
                  ...g.eintraege.map((f) => (
                    // Tab-Halt: „Funktion bearbeiten“ ist sonst nur mit der Maus erreichbar
                    <tr key={f.id} className="clickable" {...alsKlickZeile(() => setDialog({ funktion: f }))}>
                      <td>
                        <FunktionsZelle funktion={f} seiteNoetig={genannt.has(f.name.trim().toLowerCase())} />
                      </td>
                      <td className="num">{f.kuerzel || '–'}</td>
                      <td className="small muted col-optional">{f.beschreibung || '–'}</td>
                      <td className="actions">
                        <button
                          type="button"
                          className="btn-icon"
                          aria-label="Funktion löschen"
                          title="Funktion löschen"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLoeschen(f);
                          }}
                        >
                          <Icon name="loeschen" size={15} />
                        </button>
                      </td>
                    </tr>
                  )),
                ])}
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
            onClick={() => setGewerkLoeschen(gewerk)}
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
                    const { id: _id, ...werte } = f;
                    // Die Kopie übernimmt die Art des Originals; das Kürzel nennt das neue Gewerk
                    const gleichnamige = alle.filter((x) => gleich(x.name, f.name));
                    addStandardRolle({
                      ...werte,
                      gewerk,
                      kuerzel: kuerzelFuerGewerk(f, gewerk, gleichnamige) || kuerzelAus(f.name),
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

      {gewerkLoeschen ? (
        <GewerkLoeschenDialog
          gewerk={gewerkLoeschen}
          onClose={() => setGewerkLoeschen(null)}
          onGeloescht={() => setGewerkWahl(ALLE_GEWERKE)}
        />
      ) : null}

      {dialog ? (
        <FunktionsDialog
          funktion={dialog.funktion}
          gewerke={gewerke}
          vorgabe={{ art: alleArten ? undefined : art, gewerk }}
          onClose={() => setDialog(null)}
          onGespeichert={zeigen}
        />
      ) : null}

      {loeschen ? (
        <ConfirmDialog
          titel="Funktion löschen?"
          text={`„${funktionsName(loeschen)}“ steht neuen Projekten nicht mehr zur Verfügung. Bereits angelegte Projektfunktionen bleiben erhalten.`}
          onConfirm={() => {
            deleteStandardRolle(loeschen.id);
            toast('Funktion gelöscht.');
          }}
          onClose={() => setLoeschen(null)}
        />
      ) : null}
    </div>
  );
}

/** Anlage und Pflege einer projektübergreifenden Funktion. */
function FunktionsDialog({
  funktion,
  gewerke,
  vorgabe,
  onClose,
  onGespeichert,
}: {
  funktion?: StandardRolle;
  gewerke: string[];
  /** Für eine neue Funktion: die Art des gewählten Reiters (`undefined` unter „Alle“) und das Gewerk des Filters. */
  vorgabe: { art?: string; gewerk: string | null };
  onClose: () => void;
  /** Nach dem Speichern – die Liste folgt der Funktion in ihre Art und ihr Gewerk. */
  onGespeichert: (funktion: Pick<StandardRolle, 'art' | 'gewerk'>) => void;
}) {
  const { data, addStandardRolle, updateStandardRolle } = useStore();
  const toast = useToast();
  const formular = useFunktionsFormular(funktion, vorgabe);

  const speichern = () => {
    const { form } = formular;
    // Ohne Leerzeichen am Rand – die Bezeichnung ist der Schlüssel der Funktion
    // (Schritte nennen sie beim Namen, Löschvermerk und Register ebenso)
    const name = form.name.trim();
    if (!name) {
      toast('Bitte eine Bezeichnung angeben.');
      return;
    }
    if (istEigeneFunktion({ name, gewerk: form.gewerk })) {
      toast(`${EIGENE_ROLLE} übernimmt stets die angemeldete Person.`);
      return;
    }
    // Je Gewerk gibt es eine Bezeichnung nur einmal – auch über die Arten hinweg: Ein neues Projekt
    // erhielte sonst beide Funktionen, und die Besetzung der Schritte fände nur die Person an der
    // ersten. Geprüft wird nur, wenn sich Bezeichnung oder Gewerk ändern – eine schon doppelt
    // geführte Funktion bleibt bearbeitbar.
    const schluessel = funktionsSchluessel({ name, gewerk: form.gewerk });
    const doppelt =
      funktion && funktionsSchluessel(funktion) === schluessel
        ? undefined
        : data.standardRollen.find((r) => r.id !== funktion?.id && funktionsSchluessel(r) === schluessel);
    if (doppelt) {
      toast(`Die Funktion „${funktionsName(doppelt)}“ gibt es bereits.`);
      return;
    }
    const werte = {
      ...form,
      name,
      kuerzel: form.kuerzel.trim() || kuerzelAus(name),
    };
    if (funktion) {
      // Eine Umbenennung zieht die übergreifenden Workflows und die Kopien der Funktion in den
      // Projekten mit – sonst fänden neue Planläufe dort keine zuständige Person
      const { workflows, projekte } = updateStandardRolle(funktion.id, werte);
      const mitgezogen = [
        workflows > 0 ? `${workflows} ${workflows === 1 ? 'Workflow' : 'Workflows'}` : '',
        projekte > 0 ? `${projekte} ${projekte === 1 ? 'Projekt' : 'Projekten'}` : '',
      ].filter(Boolean);
      toast(
        mitgezogen.length > 0
          ? `Funktion gespeichert – sie heißt jetzt auch in ${mitgezogen.join(' und ')} „${werte.name.trim()}“.`
          : 'Funktion gespeichert.',
      );
    } else {
      addStandardRolle(werte);
      toast('Funktion angelegt.');
    }
    onGespeichert(werte);
    onClose();
  };

  return (
    <FunktionsMaske
      neu={!funktion}
      sub="Gilt projektübergreifend"
      formular={formular}
      gewerke={gewerke}
      onClose={onClose}
      onSpeichern={speichern}
    />
  );
}
