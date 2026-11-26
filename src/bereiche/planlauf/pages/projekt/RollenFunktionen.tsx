/**
 * Reiter „Funktion“ eines Projekts – gegliedert nach der Art der Funktion.
 *
 * Im Vordergrund steht die Funktion, nicht die Person: Das Projekt führt seine
 * Funktionen, und zu jeder Funktion wird die Person mit ihren Adressdaten
 * hinterlegt. Die Gliederung entspricht der projektübergreifenden Seite
 * „Funktionen“: Die Reiter wählen die Art („Alle“ zeigt jede Art unter ihrer
 * Gruppenzeile), der Filter daneben das Gewerk – es steht als Abzeichen hinter
 * jeder Bezeichnung –, und „Nur besetzte“ blendet die Funktionen ohne Person
 * aus (ein Projekt führt alle Funktionen des Katalogs, die meisten unbesetzt).
 *
 * Gewerke haben keine eigenen Reiter mehr: Ein neues entsteht im Dialog einer
 * Funktion (Knopf „Gewerk“); zeigt der Filter ein Gewerk, steht unter den
 * Karten „Gewerk „…“ löschen“.
 *
 * Die eigene Funktion Planlaufmanagement erscheint hier nicht: Sie füllt stets
 * die angemeldete Person mit ihrem Profil aus (siehe istEigeneFunktion).
 */
import { Fragment, useState } from 'react';
import {
  EIGENE_ROLLE,
  funktionsName,
  istEigeneFunktion,
  kuerzelAus,
  type Contact,
  type ID,
  type Project,
  type Role,
} from '../../domain/types';
import { gewerkeFuerProjekt } from '../../domain/engine';
import { useStore } from '../../store/store';
import { useToast } from '../../../../shared/toast';
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
} from '../../../../gemeinsam/FunktionsArten';
import { artInfo, artText, funktionenVergleich, nachArt } from '../../../../gemeinsam/funktionskatalog';
import { funktionsSchluessel } from '../../../../gemeinsam/register';
import { GewerkLoeschenDialog } from '../../components/GewerkDialog';
import { FunktionsMaske, useFunktionsFormular } from '../../components/FunktionsFelder';
import { FunktionsZelle, anzahlText } from '../../components/FunktionsListe';
import { RollenImport } from './RollenImport';
import {
  Avatar,
  Card,
  CardHeader,
  ConfirmDialog,
  EmptyState,
  Field,
  Modal,
  Search,
  Select,
  TextArea,
  TextInput,
  alsKlickZeile,
} from '../../../../shared/ui';
import { Icon } from '../../../../shared/icons';
import '../../components/funktionen.css';

/** Spalten der Funktionstabelle – die Gruppenzeile je Art geht über alle. */
const SPALTEN = 5;

export function RollenFunktionen({ project }: { project: Project }) {
  const { data, deleteRole, deleteContact } = useStore();
  const toast = useToast();
  const [artWahl, setArtWahl] = useState(ALLE_ARTEN);
  const [gewerkWahl, setGewerkWahl] = useState(ALLE_GEWERKE);
  const [nurBesetzte, setNurBesetzte] = useState(false);
  const [suche, setSuche] = useState('');
  const [besetzen, setBesetzen] = useState<Role | null>(null);
  const [funktionDialog, setFunktionDialog] = useState<{ rolle?: Role } | null>(null);
  const [gewerkLoeschen, setGewerkLoeschen] = useState<string | null>(null);
  const [importOffen, setImportOffen] = useState(false);
  const [loeschen, setLoeschen] = useState<Role | null>(null);
  const [personLoeschen, setPersonLoeschen] = useState<Contact | null>(null);
  const [person, setPerson] = useState<Contact | null>(null);
  const [neuePerson, setNeuePerson] = useState(false);

  // Die eigene Funktion füllt immer die angemeldete Person aus – sie wird hier
  // weder angezeigt noch zur Auswahl angeboten.
  const rollen = data.roles.filter((r) => r.projectId === project.id && !istEigeneFunktion(r));
  const kontakte = data.contacts.filter((c) => c.projectId === project.id);

  /** Gewerke aus den Stammdaten, ergänzt um die im Projekt vorkommenden. */
  const gewerke = gewerkeFuerProjekt(data, project.id);

  // Wer welche Funktion ausfüllt – je Funktion die erste Person, die sie nennt
  const inhaber = new Map<ID, Contact>();
  for (const c of kontakte) {
    for (const z of c.zuordnungen) if (!inhaber.has(z.roleId)) inhaber.set(z.roleId, c);
  }
  /** Person, die eine Funktion ausfüllt. */
  const besetztVon = (rolle: Role) => inhaber.get(rolle.id);

  // Erste Ebene: die Art – nur Arten, die das Projekt führt. Eine Art, die es nicht mehr gibt, fällt auf „Alle“ zurück.
  const art = artWahlGueltig(
    artWahl,
    rollen.map((r) => r.art),
  );
  const alleArten = art === ALLE_ARTEN;
  // Zweite Ebene: das Gewerk. `gewerk` ist das im Filter gewählte – null bei „Alle Gewerke“ und „Übergreifend“.
  const gewerkFilter = gewerkWahlGueltig(gewerkWahl, gewerke);
  const gewerk = gewerkFilter === ALLE_GEWERKE || gewerkFilter === OHNE_GEWERK ? null : gewerkFilter;

  const inAuswahl = rollen.filter(
    (r) => (alleArten || artInfo(r.art).id === art) && gewerkPasst(r.gewerk, gewerkFilter),
  );
  const besetzt = inAuswahl.filter((r) => besetztVon(r)).length;
  const gesucht = suche.trim().toLowerCase();
  const sichtbar = inAuswahl
    .filter((r) => !nurBesetzte || besetztVon(r))
    .filter((r) => {
      if (!gesucht) return true;
      const c = besetztVon(r);
      return [funktionsName(r), r.kuerzel, c?.vorname, c?.nachname, c?.firma, c?.email]
        .join(' ')
        .toLowerCase()
        .includes(gesucht);
    })
    .sort(funktionenVergleich(gewerke));
  const gruppen = nachArt(sichtbar);

  // Personen, die (noch) keine der hier geführten Funktionen ausfüllen – etwa
  // aus einem Import. Die angemeldete Person selbst gehört nicht dazu.
  const ohneFunktion = kontakte.filter(
    (c) => !c.eigen && !c.zuordnungen.some((z) => rollen.some((r) => r.id === z.roleId)),
  );

  /** Nach dem Speichern: Die Ansicht folgt der Funktion in ihre Art und ihr Gewerk, statt sie zu verlieren. */
  const zeigen = (f: Pick<Role, 'art' | 'gewerk'>, neu: boolean) => {
    if (!alleArten && artInfo(f.art).id !== art) setArtWahl(artInfo(f.art).id);
    if (!gewerkPasst(f.gewerk, gewerkFilter)) setGewerkWahl(ALLE_GEWERKE);
    // Eine neue Funktion ist noch unbesetzt
    if (neu) setNurBesetzte(false);
  };

  const gewerkZusatz =
    gewerkFilter === ALLE_GEWERKE ? '' : gewerkFilter === OHNE_GEWERK ? ', übergreifend' : ` im Gewerk ${gewerkFilter}`;
  const keineFunktion =
    gewerkFilter === OHNE_GEWERK ? 'keine übergreifende Funktion' : `keine Funktion${gewerk ? ` im Gewerk ${gewerk}` : ''}`;
  // Die Art „Projektsteuerung und Planlaufmanagement“ zeigt eine Funktion weniger, als der Katalog nennt
  const eigeneFehlt = (alleArten || art === 'ps-plm') && gewerkPasst(null, gewerkFilter);

  return (
    <div className="stack">
      <div className="pl-artreiter">
        <ArtReiter
          arten={rollen.map((r) => r.art)}
          wahl={art}
          onWahl={setArtWahl}
          anzahl={(a) =>
            rollen.filter(
              (r) =>
                artInfo(r.art).id === a && gewerkPasst(r.gewerk, gewerkFilter) && (!nurBesetzte || besetztVon(r)),
            ).length
          }
        />
      </div>

      {/* Beide Gruppen brechen um: Bei schmaler Breite ragte „Neue Funktion“ sonst über den Rand */}
      <div className="pl-werkzeug">
        <div className="pl-werkzeug-filter">
          <Search value={suche} onChange={setSuche} placeholder="Funktion, Person, Firma …" />
          <GewerkFilter gewerke={gewerke} wahl={gewerkFilter} onWahl={setGewerkWahl} />
          <label className="checkbox" title="Nur Funktionen zeigen, die eine Person ausfüllt">
            <input type="checkbox" checked={nurBesetzte} onChange={(e) => setNurBesetzte(e.target.checked)} />
            Nur besetzte
          </label>
        </div>
        <div className="pl-werkzeug-knoepfe">
          <button type="button" className="btn btn-outline" onClick={() => setImportOffen(true)}>
            <Icon name="importieren" size={14} /> Excel-Import
          </button>
          <button type="button" className="btn btn-outline" onClick={() => setNeuePerson(true)}>
            <Icon name="person" size={14} /> Person hinzufügen
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setFunktionDialog({})}>
            <Icon name="plus" size={14} /> Neue Funktion
          </button>
        </div>
      </div>

      <Card>
        <CardHeader
          titel={alleArten ? 'Alle Funktionen' : artInfo(art).name}
          sub={`${
            sichtbar.length === inAuswahl.length
              ? anzahlText(inAuswahl.length)
              : `${sichtbar.length} von ${anzahlText(inAuswahl.length)}`
          }${gewerkZusatz} · ${besetzt} besetzt · je Funktion genau eine Person${
            eigeneFehlt ? '; das Planlaufmanagement übernimmt stets die angemeldete Person' : ''
          }`}
        />
        {sichtbar.length === 0 ? (
          gesucht ? (
            // Suche ohne Treffer ist kein leerer Bestand – kein Anlegen-Knopf
            <EmptyState icon="person" titel="Keine Funktion gefunden" text="Für diese Suche gibt es keinen Treffer." />
          ) : inAuswahl.length > 0 ? (
            // „Nur besetzte“ blendet alles aus – auch das ist kein leerer Bestand
            <EmptyState
              icon="person"
              titel="Keine Funktion besetzt"
              text="In dieser Auswahl füllt noch keine Person eine Funktion aus."
              action={
                <button type="button" className="btn" onClick={() => setNurBesetzte(false)}>
                  Alle Funktionen zeigen
                </button>
              }
            />
          ) : (
            <EmptyState
              icon="person"
              titel="Keine Funktion"
              text={
                rollen.length === 0
                  ? 'Legen Sie die Funktionen an, die in diesem Projekt besetzt werden.'
                  : `${alleArten ? 'Das Projekt führt' : `In der Art „${artInfo(art).name}“ führt das Projekt`} ${keineFunktion}.`
              }
              action={
                <button type="button" className="btn btn-primary" onClick={() => setFunktionDialog({})}>
                  <Icon name="plus" size={14} /> Neue Funktion
                </button>
              }
            />
          )
        ) : (
          <div className="table-scroll">
            <table className="table pl-funktionstabelle">
              <thead>
                <tr>
                  <th>Funktion</th>
                  <th>Besetzt durch</th>
                  <th className="col-optional">Firma / Büro</th>
                  <th className="col-optional">Kontakt</th>
                  <th className="actions" />
                </tr>
              </thead>
              <tbody>
                {gruppen.map((g) => (
                  <Fragment key={g.art.id}>
                    {/* Unter einer Art nennt sie der Kartentitel – die Gruppenzeile steht nur unter „Alle“ */}
                    {alleArten ? (
                      <ArtGruppenZeile
                        art={g.art.id}
                        spalten={SPALTEN}
                        anzahl={g.eintraege.length}
                        zusatz={`${g.eintraege.filter((r) => besetztVon(r)).length} besetzt`}
                      />
                    ) : null}
                    {g.eintraege.map((rolle) => {
                      const c = besetztVon(rolle);
                      return (
                        <tr key={rolle.id} className="clickable" {...alsKlickZeile(() => setBesetzen(rolle))}>
                          <td>
                            <FunktionsZelle funktion={rolle} kuerzel beschreibung />
                          </td>
                          <td>
                            {c ? (
                              <span className="row" style={{ gap: 8 }}>
                                <Avatar name={`${c.vorname} ${c.nachname}`} farbe={rolle.farbe} />
                                <strong>
                                  {c.vorname} {c.nachname}
                                </strong>
                              </span>
                            ) : (
                              <span className="tertiary small pl-unbesetzt">– nicht besetzt –</span>
                            )}
                          </td>
                          <td className="small muted col-optional">{c?.firma || '–'}</td>
                          <td className="small col-optional">
                            {c?.email ? (
                              <a href={`mailto:${c.email}`} onClick={(e) => e.stopPropagation()}>
                                {c.email}
                              </a>
                            ) : (
                              <span className="tertiary">–</span>
                            )}
                            {c?.telefon || c?.mobil ? (
                              <div className="tertiary small">{[c.telefon, c.mobil].filter(Boolean).join(' · ')}</div>
                            ) : null}
                            {c ? <SharePointLinks kontakt={c} /> : null}
                          </td>
                          <td className="actions">
                            <button
                              type="button"
                              className="btn-icon"
                              aria-label="Funktion bearbeiten"
                              title="Funktion bearbeiten"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFunktionDialog({ rolle });
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
                                setLoeschen(rolle);
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

      {ohneFunktion.length > 0 ? (
        <Card>
          <CardHeader
            titel="Personen ohne Funktion"
            sub="Im Projekt hinterlegt, aber keiner Funktion zugeordnet"
          />
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Person</th>
                  <th className="col-optional">Firma / Büro</th>
                  <th>Kontakt</th>
                  <th className="actions" />
                </tr>
              </thead>
              <tbody>
                {ohneFunktion.map((c) => (
                  <tr key={c.id} className="clickable" {...alsKlickZeile(() => setPerson(c))}>
                    <td>
                      <span className="row" style={{ gap: 8 }}>
                        <Avatar name={`${c.vorname} ${c.nachname}`} />
                        <strong>
                          {c.vorname} {c.nachname}
                        </strong>
                      </span>
                    </td>
                    <td className="small muted col-optional">{c.firma || '–'}</td>
                    <td className="small">{c.email || '–'}</td>
                    <td className="actions">
                      <button type="button" className="btn-icon" aria-label="Person bearbeiten" title="Person bearbeiten">
                        <Icon name="bearbeiten" size={15} />
                      </button>
                      <button
                        type="button"
                        className="btn-icon"
                        aria-label="Person löschen"
                        title="Person löschen"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPersonLoeschen(c);
                        }}
                      >
                        <Icon name="loeschen" size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

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

      {besetzen ? (
        <BesetzungsDialog
          project={project}
          rolle={besetzen}
          rollen={rollen}
          gewerke={gewerke}
          kontakte={kontakte}
          onClose={() => setBesetzen(null)}
        />
      ) : null}

      {person ? (
        <BesetzungsDialog
          project={project}
          rolle={null}
          rollen={rollen}
          gewerke={gewerke}
          kontakt={person}
          kontakte={kontakte}
          onClose={() => setPerson(null)}
        />
      ) : null}

      {neuePerson ? (
        <BesetzungsDialog
          project={project}
          rolle={null}
          rollen={rollen}
          gewerke={gewerke}
          kontakte={kontakte}
          onClose={() => setNeuePerson(false)}
        />
      ) : null}

      {funktionDialog ? (
        <FunktionsDialog
          project={project}
          rolle={funktionDialog.rolle}
          gewerke={gewerke}
          vorgabe={{ art: alleArten ? undefined : art, gewerk }}
          onClose={() => setFunktionDialog(null)}
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

      {importOffen ? <RollenImport project={project} onClose={() => setImportOffen(false)} /> : null}

      {loeschen ? (
        <ConfirmDialog
          titel="Funktion löschen?"
          text={`„${funktionsName(loeschen)}“ wird aus diesem Projekt entfernt. Prozessschritte mit dieser Funktion bleiben bestehen, sind dann aber unbesetzt.`}
          onConfirm={() => {
            deleteRole(loeschen.id);
            toast('Funktion gelöscht.');
          }}
          onClose={() => setLoeschen(null)}
        />
      ) : null}

      {personLoeschen ? (
        <ConfirmDialog
          titel="Person löschen?"
          text={`${personLoeschen.vorname} ${personLoeschen.nachname} wird aus diesem Projekt entfernt. Offene Prozessschritte, denen die Person von Hand zugewiesen ist, folgen danach wieder der Besetzung ihrer Funktion.`}
          onConfirm={() => {
            deleteContact(personLoeschen.id);
            toast('Person gelöscht.');
          }}
          onClose={() => setPersonLoeschen(null)}
        />
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */

/**
 * Zwei Wege zum selben Ziel:
 *
 * – von der Funktion aus (`rolle` gesetzt): Person auswählen oder neu erfassen;
 * – von der Person aus (`rolle = null`): Angaben erfassen bzw. pflegen und die
 *   Funktion wahlweise gleich dabei zuweisen.
 */
function BesetzungsDialog({
  project,
  rolle,
  rollen,
  gewerke,
  kontakt,
  kontakte,
  onClose,
}: {
  project: Project;
  rolle: Role | null;
  /** Alle Funktionen des Projekts – Auswahl, wenn von der Person aus besetzt wird. */
  rollen: Role[];
  /** Gewerke des Projekts – sie ordnen die Auswahl der Funktionen. */
  gewerke: readonly string[];
  kontakt?: Contact;
  kontakte: Contact[];
  onClose: () => void;
}) {
  const { addContact, updateContact, deleteContact } = useStore();
  const toast = useToast();
  const bisher = kontakt ?? (rolle ? kontakte.find((c) => c.zuordnungen.some((z) => z.roleId === rolle.id)) : undefined);
  const [personId, setPersonId] = useState<ID | ''>(bisher?.id ?? '');
  // Von der Person aus gewählte Funktion; leer = (noch) ohne Funktion
  const [rolleId, setRolleId] = useState<ID | ''>('');
  const [loeschen, setLoeschen] = useState(false);
  const leer = {
    anrede: '',
    vorname: '',
    nachname: '',
    firma: '',
    email: '',
    telefon: '',
    mobil: '',
    oe: '',
    anschrift: '',
    sharepointEingang: '',
    sharepointAusgang: '',
    notiz: '',
  };
  const werteVon = (c?: Contact) =>
    c
      ? {
          anrede: c.anrede,
          vorname: c.vorname,
          nachname: c.nachname,
          firma: c.firma,
          email: c.email,
          telefon: c.telefon,
          mobil: c.mobil ?? '',
          oe: c.oe ?? '',
          anschrift: c.anschrift,
          sharepointEingang: c.sharepointEingang ?? '',
          sharepointAusgang: c.sharepointAusgang ?? '',
          notiz: c.notiz,
        }
      : leer;
  const [form, setForm] = useState(werteVon(bisher));

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  // Funktionen zur Auswahl: gegliedert nach ihrer Art, darin nach Bezeichnung und Gewerk
  const auswahlGruppen = nachArt([...rollen].sort(funktionenVergleich(gewerke)));
  const gewaehlteRolle = rollen.find((r) => r.id === rolleId);
  const vorherigerInhaber = gewaehlteRolle
    ? kontakte.find((c) => c.zuordnungen.some((z) => z.roleId === gewaehlteRolle.id))
    : undefined;

  /** Andere Person übernehmen – ihre Angaben füllen das Formular. */
  const personWechseln = (id: string) => {
    setPersonId(id);
    setForm(werteVon(kontakte.find((c) => c.id === id)));
  };

  const speichern = () => {
    if (!form.nachname.trim()) {
      toast('Bitte einen Nachnamen angeben.');
      return;
    }
    // Funktion: entweder die Zeile, aus der der Dialog kommt, oder die Auswahl
    const zielRolle = rolle ?? rollen.find((r) => r.id === rolleId);
    const ziel = personId ? kontakte.find((c) => c.id === personId) : kontakt;
    const zuordnung = zielRolle ? [{ roleId: zielRolle.id, gewerk: zielRolle.gewerk }] : [];
    const vorher = zielRolle
      ? kontakte.find((c) => c.zuordnungen.some((z) => z.roleId === zielRolle.id))
      : undefined;

    if (ziel) {
      const vorhanden = ziel.zuordnungen.filter((z) => !zielRolle || z.roleId !== zielRolle.id);
      updateContact(ziel.id, { ...form, zuordnungen: [...vorhanden, ...zuordnung] });
    } else {
      addContact({ ...form, projectId: project.id, zuordnungen: zuordnung, eigen: false });
    }

    // Bisherige Besetzung der Funktion aufheben, wenn jemand anderes übernimmt
    if (zielRolle && vorher && vorher.id !== ziel?.id) {
      updateContact(vorher.id, { zuordnungen: vorher.zuordnungen.filter((z) => z.roleId !== zielRolle.id) });
    }
    toast(zielRolle ? `${funktionsName(zielRolle)} besetzt.` : 'Person gespeichert.');
    onClose();
  };

  const freigeben = () => {
    if (!rolle || !bisher) return;
    updateContact(bisher.id, { zuordnungen: bisher.zuordnungen.filter((z) => z.roleId !== rolle.id) });
    toast('Besetzung aufgehoben – die Person bleibt im Projekt.');
    onClose();
  };

  return (
    <>
      <Modal
        titel={rolle ? funktionsName(rolle) : kontakt ? `${kontakt.vorname} ${kontakt.nachname}` : 'Neue Person'}
        sub={
          rolle
            ? 'Funktion besetzen – eine Person mit ihren Adressdaten'
            : 'Person erfassen und wahlweise gleich einer Funktion zuweisen'
        }
        onClose={onClose}
        footer={
          <>
            {rolle && bisher ? (
              <button type="button" className="btn btn-danger" onClick={freigeben}>
                Besetzung aufheben
              </button>
            ) : null}
            {!rolle && bisher && !bisher.eigen ? (
              <button type="button" className="btn btn-danger" onClick={() => setLoeschen(true)}>
                <Icon name="loeschen" size={14} /> Person löschen
              </button>
            ) : null}
            <span className="spacer" />
            <button type="button" className="btn" onClick={onClose}>
              Abbrechen
            </button>
            <button type="button" className="btn btn-primary" onClick={speichern}>
              Speichern
            </button>
          </>
        }
      >
        <div className="form-grid">
          {rolle ? (
            <Field
              label="Person"
              full
              hint="Eine im Projekt bekannte Person übernehmen oder die Angaben unten neu erfassen."
            >
              <Select
                value={personId}
                onChange={personWechseln}
                placeholder="– neue Person erfassen –"
                options={kontakte.map((c) => ({
                  value: c.id,
                  label: `${c.vorname} ${c.nachname}${c.firma ? ` (${c.firma})` : ''}`,
                }))}
              />
            </Field>
          ) : (
            <Field
              label="Funktion"
              full
              hint={
                gewaehlteRolle && vorherigerInhaber
                  ? `Bisher besetzt durch ${vorherigerInhaber.vorname} ${vorherigerInhaber.nachname} – die Besetzung wechselt.`
                  : 'Kann auch offen bleiben; die Person lässt sich später einer Funktion zuweisen.'
              }
            >
              {/* Eigene Auswahl statt `Select`: je Art eine Gruppe – ein Projekt führt weit über hundert Funktionen */}
              <select
                className="select"
                aria-label="Funktion"
                value={rolleId}
                onChange={(e) => setRolleId(e.target.value)}
              >
                <option value="">– ohne Funktion –</option>
                {auswahlGruppen.map((g) => (
                  <optgroup key={g.art.id} label={artText(g.art.id)}>
                    {g.eintraege.map((r) => {
                      const inhaber = kontakte.find((c) => c.zuordnungen.some((z) => z.roleId === r.id));
                      return (
                        <option key={r.id} value={r.id}>
                          {funktionsName(r)}
                          {inhaber ? ` (besetzt: ${inhaber.vorname} ${inhaber.nachname})` : ''}
                        </option>
                      );
                    })}
                  </optgroup>
                ))}
              </select>
            </Field>
          )}
          <Field label="Anrede">
            <Select
              value={form.anrede}
              onChange={(v) => set('anrede', v)}
              options={[
                { value: '', label: 'ohne Anrede' },
                { value: 'Frau', label: 'Frau' },
                { value: 'Herr', label: 'Herr' },
              ]}
            />
          </Field>
          <Field label="Vorname">
            <TextInput value={form.vorname} onChange={(v) => set('vorname', v)} />
          </Field>
          <Field label="Nachname">
            <TextInput value={form.nachname} onChange={(v) => set('nachname', v)} />
          </Field>
          <Field label="Firma / Büro">
            <TextInput value={form.firma} onChange={(v) => set('firma', v)} />
          </Field>
          <Field label="Organisationseinheit (OE)">
            <TextInput value={form.oe} onChange={(v) => set('oe', v)} placeholder="z. B. V.IOF 21" />
          </Field>
          <Field label="E-Mail">
            <TextInput value={form.email} onChange={(v) => set('email', v)} type="email" />
          </Field>
          <Field label="Telefon">
            <TextInput value={form.telefon} onChange={(v) => set('telefon', v)} type="tel" />
          </Field>
          <Field label="Mobil">
            <TextInput value={form.mobil} onChange={(v) => set('mobil', v)} type="tel" />
          </Field>
          <Field label="Anschrift" full hint="Straße, PLZ und Ort">
            <TextArea value={form.anschrift} onChange={(v) => set('anschrift', v)} rows={2} />
          </Field>
          <Field label="SharePoint-Link Eingang" full hint="Ordner, in dem die Unterlagen für die Person bereitliegen – für die Versandmail">
            <TextInput
              value={form.sharepointEingang}
              onChange={(v) => set('sharepointEingang', v)}
              type="url"
              inputMode="url"
              placeholder="https://…sharepoint.com/sites/…"
            />
          </Field>
          <Field label="SharePoint-Link Ausgang" full hint="Ordner, in den die Person ihre Unterlagen hochlädt">
            <TextInput
              value={form.sharepointAusgang}
              onChange={(v) => set('sharepointAusgang', v)}
              type="url"
              inputMode="url"
              placeholder="https://…sharepoint.com/sites/…"
            />
          </Field>
          <Field label="Notiz" full>
            <TextArea value={form.notiz} onChange={(v) => set('notiz', v)} rows={2} />
          </Field>
        </div>
      </Modal>

      {loeschen && bisher ? (
        <ConfirmDialog
          titel="Person löschen?"
          text={`„${bisher.vorname} ${bisher.nachname}“ wird aus dem Projekt entfernt und aus allen Prozessschritten ausgetragen.`}
          onConfirm={() => {
            deleteContact(bisher.id);
            toast('Person gelöscht.');
            onClose();
          }}
          onClose={() => setLoeschen(false)}
        />
      ) : null}
    </>
  );
}

/* ------------------------------------------------------------------ */

/** Anlage und Pflege einer Funktion dieses Projekts. */
function FunktionsDialog({
  project,
  rolle,
  gewerke,
  vorgabe,
  onClose,
  onGespeichert,
}: {
  project: Project;
  rolle?: Role;
  gewerke: string[];
  /** Für eine neue Funktion: die Art des gewählten Reiters (`undefined` unter „Alle“) und das Gewerk des Filters. */
  vorgabe: { art?: string; gewerk: string | null };
  onClose: () => void;
  /** Nach dem Speichern – die Liste folgt der Funktion in ihre Art und ihr Gewerk. */
  onGespeichert: (funktion: Pick<Role, 'art' | 'gewerk'>, neu: boolean) => void;
}) {
  const { data, addRole, updateRole } = useStore();
  const toast = useToast();
  const formular = useFunktionsFormular(rolle, vorgabe);

  const speichern = () => {
    const { form } = formular;
    const name = form.name.trim();
    if (!name) {
      toast('Bitte eine Bezeichnung angeben.');
      return;
    }
    if (istEigeneFunktion({ name, gewerk: form.gewerk })) {
      toast(`${EIGENE_ROLLE} übernimmt stets die angemeldete Person.`);
      return;
    }
    // Je Gewerk gibt es eine Bezeichnung im Projekt nur einmal – auch über die Arten hinweg: Die
    // Besetzung der Schritte nimmt die erste Funktion dieses Namens – die Person an einer zweiten
    // fände ihre Schritte nicht. Geprüft wird nur, wenn sich Bezeichnung oder Gewerk ändern – eine
    // schon doppelt geführte Funktion bleibt bearbeitbar.
    const schluessel = funktionsSchluessel({ name, gewerk: form.gewerk });
    const doppelt =
      rolle && funktionsSchluessel(rolle) === schluessel
        ? undefined
        : data.roles.find(
            (r) => r.projectId === project.id && r.id !== rolle?.id && funktionsSchluessel(r) === schluessel,
          );
    if (doppelt) {
      toast(`Die Funktion „${funktionsName(doppelt)}“ gibt es bereits.`);
      return;
    }
    const werte = {
      ...form,
      name,
      kuerzel: form.kuerzel.trim() || kuerzelAus(name),
    };
    if (rolle) {
      // Übergreifende Workflows ziehen bei einer Umbenennung nicht mit (sie gelten für alle Projekte):
      // Nennen sie die alte Bezeichnung weiter, fände der nächste Planlauf daraus für diese Schritte
      // keine zuständige Person – das sagt die Kurzmeldung, statt es stillschweigend geschehen zu lassen
      const { workflowsMitAlterBezeichnung: workflows } = updateRole(rolle.id, werte);
      toast(
        workflows > 0
          ? `Funktion gespeichert – ${workflows === 1 ? '1 Workflow nennt' : `${workflows} Workflows nennen`} weiter „${rolle.name}“; neue Planläufe daraus haben für diese Schritte keine zuständige Person.`
          : 'Funktion gespeichert.',
      );
    } else {
      addRole({ ...werte, projectId: project.id });
      toast('Funktion angelegt.');
    }
    onGespeichert(werte, !rolle);
    onClose();
  };

  return (
    <FunktionsMaske
      neu={!rolle}
      sub="Gilt in diesem Projekt"
      formular={formular}
      gewerke={gewerke}
      onClose={onClose}
      onSpeichern={speichern}
    />
  );
}

/** Kleine Links zu den SharePoint-Ordnern einer Person (nur, wenn hinterlegt). */
function SharePointLinks({ kontakt }: { kontakt: Contact }) {
  const links = [
    { text: 'SharePoint Eingang', url: kontakt.sharepointEingang },
    { text: 'SharePoint Ausgang', url: kontakt.sharepointAusgang },
  ].filter((l) => l.url?.trim());
  if (links.length === 0) return null;
  return (
    <div className="small pl-sharepoint">
      {links.map((l) => (
        <a key={l.text} href={l.url.trim()} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
          {l.text}
        </a>
      ))}
    </div>
  );
}
