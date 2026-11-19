/**
 * Bereich „Admin“ – in jedem Bereich dieselbe Seite (Menüpunkt „Admin“, nur
 * für die Rolle KaPlan-Admin): Personen eintragen und einladen, Rollen
 * zuweisen, die Oberfläche einer anderen Rolle ansehen. Die Sicherung des
 * jeweiligen Bereichs (Sichern, Einspielen, Zurücksetzen) reicht der Bereich
 * als `sicherung` herein – sie gehört zu seinem Bestand.
 *
 * Dazu die beiden Bausteine, mit denen die Bereiche Rollen durchsetzen:
 * `KeinZugriff` (statt einer Seite, die der Rolle nicht zusteht) und
 * `AnsichtHinweis` (solange „Ansicht als“ läuft). Regeln der Rollen:
 * `rollen.ts`.
 */
import { useState, type ReactNode } from 'react';
import { formatDate } from '../shared/dates';
import { Icon } from '../shared/icons';
import { useToast } from '../shared/toast';
import { Badge, Callout, Card, CardHeader, ConfirmDialog, EmptyState, Field, Modal, Segmented, Select, TextInput, beiEnter } from '../shared/ui';
import { STANDARD_NAME, useBenutzer } from './benutzer';
import {
  ROLLEN,
  ansichtSetzen,
  gleicherName,
  letzterAdmin,
  nameVergeben,
  personAendern,
  personEintragen,
  personEntfernen,
  rollenName,
  usePersonen,
  useRolle,
  type Person,
  type Rolle,
} from './rollen';

const ROLLEN_WAHL = ROLLEN.map((r) => ({ value: r.id, label: r.name }));

/** Entwurf einer Einladung im E-Mail-Programm der Person am Gerät. */
function einladungsLink(person: Person, absender: string): string {
  const adresse = `${window.location.origin}${window.location.pathname}`;
  const betreff = 'Einladung zu KaPlan';
  const text = [
    `Guten Tag ${person.name},`,
    '',
    `Sie sind für KaPlan eingetragen – als ${rollenName(person.rolle)}.`,
    '',
    `Adresse: ${adresse}`,
    `Bitte tragen Sie dort unter „Angemeldet als“ Ihren Namen so ein: ${person.name}`,
    '',
    'Viele Grüße',
    absender,
  ].join('\n');
  return `mailto:${encodeURIComponent(person.email)}?subject=${encodeURIComponent(betreff)}&body=${encodeURIComponent(text)}`;
}

export function AdminSeite({ bereich, sicherung }: { bereich: string; sicherung: ReactNode }) {
  const personen = usePersonen();
  const { name: ich } = useBenutzer();
  const { eigene, rolle, ansicht } = useRolle();
  const toast = useToast();
  const [dialog, setDialog] = useState(false);
  const [entfernen, setEntfernen] = useState<Person | null>(null);
  // Ohne eigenen Namen ließe sich die Person am Gerät später nicht wiedererkennen
  const ohneNamen = ich === STANDARD_NAME;

  return (
    <div className="stack">
      <Callout>
        Die Rollen bereiten die Anmeldung über das Microsoft-Konto vor. Solange KaPlan ohne Anmeldung läuft, gilt die Rolle der
        Person, deren Name unter „Angemeldet als“ steht – das Verzeichnis liegt in diesem Browser, geschützt ist damit noch
        nichts.
      </Callout>

      <Card>
        <CardHeader
          titel="Personen und Rollen"
          sub={
            personen.length === 0
              ? 'Noch niemand eingetragen – die Person an diesem Gerät ist KaPlan-Admin'
              : `${personen.length} ${personen.length === 1 ? 'Person' : 'Personen'} · gilt für alle Bereiche`
          }
          actions={
            <button type="button" className="btn btn-primary" onClick={() => setDialog(true)} disabled={ohneNamen}>
              <Icon name="plus" size={14} /> Person einladen
            </button>
          }
        />
        {ohneNamen ? (
          <div className="card-pad" style={{ paddingTop: 0 }}>
            <Callout ton="warn" icon="!">
              Bitte tragen Sie zuerst unter „Angemeldet als“ Ihren Namen ein – unter ihm werden Sie als KaPlan-Admin geführt.
            </Callout>
          </div>
        ) : null}
        {personen.length === 0 ? (
          <EmptyState
            icon="person"
            titel="Noch keine Personen"
            text="Mit dem ersten Eintrag werden Sie selbst als KaPlan-Admin geführt; alle weiteren Personen bekommen die Rolle, die Sie ihnen zuweisen."
          />
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Person</th>
                  <th>E-Mail</th>
                  <th>Rolle</th>
                  <th>Eingetragen</th>
                  <th aria-label="Aktionen" />
                </tr>
              </thead>
              <tbody>
                {personen.map((p) => {
                  const letzter = letzterAdmin(p, personen);
                  return (
                    <tr key={p.id}>
                      <td>
                        <strong>{p.name}</strong> {gleicherName(p.name, ich) ? <Badge ton="blue">Sie</Badge> : null}
                      </td>
                      <td>{p.email || <span className="muted">–</span>}</td>
                      <td className="gem-rollenwahl">
                        {letzter ? (
                          <span title="Es muss mindestens ein KaPlan-Admin bleiben">{rollenName(p.rolle)}</span>
                        ) : (
                          <Select
                            value={p.rolle}
                            onChange={(v) => {
                              if (personAendern(p.id, { rolle: v as Rolle })) toast(`${p.name} ist jetzt ${rollenName(v as Rolle)}.`);
                            }}
                            options={ROLLEN_WAHL}
                          />
                        )}
                      </td>
                      <td>{formatDate(p.eingeladenAm.slice(0, 10))}</td>
                      <td>
                        <div className="row wrap" style={{ justifyContent: 'flex-end' }}>
                          {p.email ? (
                            <a className="btn btn-sm" href={einladungsLink(p, ich)}>
                              <Icon name="mail" size={13} /> Einladung senden
                            </a>
                          ) : null}
                          <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            onClick={() => setEntfernen(p)}
                            disabled={letzter}
                            title={letzter ? 'Es muss mindestens ein KaPlan-Admin bleiben' : undefined}
                          >
                            <Icon name="loeschen" size={13} /> Entfernen
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader titel="Rollen" sub="Jede Rolle schließt die vorige ein" />
        <div className="card-pad" style={{ paddingTop: 0 }}>
          <dl className="gem-rollen">
            {ROLLEN.map((r) => (
              <div key={r.id}>
                <dt>{r.name}</dt>
                <dd>{r.beschreibung}</dd>
              </div>
            ))}
          </dl>
          <Field label="Ansicht als" hint="Zeigt KaPlan in diesem Fenster so, wie es eine andere Rolle sieht – bis zum Neuladen oder bis Sie die Ansicht beenden.">
            <Segmented<Rolle>
              value={ansicht ? rolle : eigene}
              onChange={(v) => ansichtSetzen(v === eigene ? null : v)}
              options={[...ROLLEN_WAHL].reverse()}
            />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader titel={`Sicherung – ${bereich}`} sub="Der Bestand dieses Bereichs in diesem Browser" />
        <div className="card-pad" style={{ paddingTop: 0 }}>
          <p className="muted small" style={{ maxWidth: 720, marginBottom: 12 }}>
            „Sicherung“ lädt den gesamten Bestand des Bereichs als Datei herunter, „Einspielen“ lädt eine solche Datei, „Zurücksetzen“
            stellt die Beispieldaten wieder her.
          </p>
          {sicherung}
        </div>
      </Card>

      {dialog ? <PersonDialog personen={personen} onClose={() => setDialog(false)} /> : null}

      {entfernen ? (
        <ConfirmDialog
          titel={`${entfernen.name} entfernen?`}
          text="Die Person steht danach nicht mehr im Verzeichnis und gilt als Projektmitarbeiter. Ihre Einträge in den Projekten bleiben unberührt."
          bestaetigenLabel="Entfernen"
          onConfirm={() => {
            if (personEntfernen(entfernen.id)) toast(`${entfernen.name} entfernt.`);
          }}
          onClose={() => setEntfernen(null)}
        />
      ) : null}
    </div>
  );
}

function PersonDialog({ personen, onClose }: { personen: Person[]; onClose: () => void }) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [rolle, setRolle] = useState<Rolle>('mitarbeiter');
  const sauber = name.trim();
  const doppelt = sauber !== '' && nameVergeben(sauber, personen);
  const mailFalsch = email.trim() !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const bereit = sauber !== '' && !doppelt && !mailFalsch;

  const eintragen = () => {
    if (!bereit) return;
    if (personEintragen({ name: sauber, email, rolle })) toast(`${sauber} eingetragen.`);
    else toast('Die Person konnte nicht gespeichert werden.');
    onClose();
  };

  return (
    <Modal
      titel="Person einladen"
      sub="Die Person wird ins Verzeichnis eingetragen; die Einladung schicken Sie danach aus der Liste."
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Abbrechen
          </button>
          <button type="button" className="btn btn-primary" onClick={eintragen} disabled={!bereit}>
            Eintragen
          </button>
        </>
      }
    >
      <div className="stack">
        <Field label="Name" hint={doppelt ? 'Diese Person steht schon im Verzeichnis.' : 'Vor- und Nachname, wie die Person ihn unter „Angemeldet als“ führt'}>
          <TextInput value={name} onChange={setName} autoFocus onKeyDown={beiEnter(eintragen)} />
        </Field>
        <Field label="E-Mail" hint={mailFalsch ? 'Bitte eine vollständige E-Mail-Adresse eintragen.' : 'Für die Einladung – und später für die Anmeldung über das Microsoft-Konto'}>
          <TextInput value={email} onChange={setEmail} type="email" onKeyDown={beiEnter(eintragen)} />
        </Field>
        <Field label="Rolle" hint={ROLLEN.find((r) => r.id === rolle)?.beschreibung}>
          <Select value={rolle} onChange={(v) => setRolle(v as Rolle)} options={ROLLEN_WAHL} />
        </Field>
      </div>
    </Modal>
  );
}

/** Statt einer Seite, die der Rolle nicht zusteht. */
export function KeinZugriff({ fuer, onZurueck }: { fuer: 'Projektadmins' | 'KaPlan-Admins'; onZurueck: () => void }) {
  return (
    <Card>
      <EmptyState
        icon="admin"
        titel="Kein Zugriff"
        text={`Diese Seite ist ${fuer} vorbehalten.`}
        action={
          <button type="button" className="btn" onClick={onZurueck}>
            Zur Übersicht
          </button>
        }
      />
    </Card>
  );
}

/** Erinnert daran, dass „Ansicht als“ läuft, und beendet sie. */
export function AnsichtHinweis() {
  const { rolle, ansicht } = useRolle();
  if (!ansicht) return null;
  return (
    <div className="gem-ansicht" role="status">
      <Callout>
        <span className="row wrap" style={{ justifyContent: 'space-between' }}>
          <span>
            Sie sehen KaPlan als <strong>{rollenName(rolle)}</strong>.
          </span>
          <button type="button" className="btn btn-sm" onClick={() => ansichtSetzen(null)}>
            Ansicht beenden
          </button>
        </span>
      </Callout>
    </div>
  );
}
