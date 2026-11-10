/**
 * „E-Mail senden“: Nach einem Abschluss (auch nach dem Sammel-Erledigen)
 * bietet der Dialog die E-Mails an, die die E-Mail-Regeln des Workflows jetzt
 * vorsehen (`mailVorschlaege` in domain/mailRegeln.ts) – nach dem Erledigen
 * des Schritts bzw. mit der gewählten Antwort und für jeden Schritt, der
 * dadurch neu ansteht. Je Empfänger und Vorlage eine Zeile mit dem Anlass, den
 * betroffenen Schritten, der Vorlage und einer E-Mail (bei mehreren Schritten
 * als Sammel-E-Mail); ein Haken zeigt, welche E-Mail schon vorbereitet ist.
 * Nennt die Regel keine Vorlage, ist die zur Lage passende vorgewählt – nach
 * einem Versandschritt (Anliegen am Schritt) die Vorlage „Versand“.
 *
 * Übergeben werden nur die Abschlüsse (IDs); Läufe und Schritte werden frisch
 * aus dem Bestand gelesen (Termine sind erst nach dem Neuberechnen im Store
 * aktuell).
 */
import { useState } from 'react';
import { kontaktName } from '../domain/engine';
import { versandSchrittVor } from '../domain/email';
import { mailVorschlaege, vorlageFuerVorschlag, type MailEreignis, type MailVorschlag } from '../domain/mailRegeln';
import { VERSAND_ANLIEGEN_LABEL } from '../domain/types';
import { useStore } from '../store/store';
import { formatDate } from '../../../shared/dates';
import { Modal, Select } from '../../../shared/ui';
import { Icon } from '../../../shared/icons';
import { EmailDialog } from './EmailDialog';
import './planlauf.css';

export function NeuZustaendig({
  ereignisse,
  onClose,
}: {
  /** Die Abschlüsse, nach denen der Workflow E-Mails vorsehen kann. */
  ereignisse: MailEreignis[];
  onClose: () => void;
}) {
  const { data } = useStore();
  const [gewaehlt, setGewaehlt] = useState<Record<string, string>>({});
  const [vermerkt, setVermerkt] = useState<string[]>([]);
  const [mailFuer, setMailFuer] = useState<string | null>(null);

  // Frisch aus dem Bestand: was die Regeln nach diesen Abschlüssen vorsehen
  const vorschlaege = mailVorschlaege(data, ereignisse);
  const vorlagen = data.emailVorlagen;
  const schritte = (v: MailVorschlag) =>
    v.posten.flatMap((p) => {
      const run = data.runs.find((r) => r.id === p.runId);
      const step = run?.steps.find((s) => s.id === p.stepId);
      return run && step ? [{ run, step }] : [];
    });
  /** Anliegen, wenn die Person nach einem Versandschritt an der Reihe ist (z. B. „Freigabe“). */
  const anliegenVon = (v: MailVorschlag) =>
    v.art === 'schritt'
      ? (schritte(v)
          .map((p) => versandSchrittVor(p.run, p.step.id))
          .find(Boolean)?.versandAnliegen ?? null)
      : null;
  /** Vorauswahl: die Vorlage der Regel, sonst die zur Lage passende (siehe vorlageFuerVorschlag). */
  const vorlageVon = (v: MailVorschlag) => gewaehlt[v.schluessel] ?? vorlageFuerVorschlag(data, v)?.id ?? '';

  const offen = mailFuer ? vorschlaege.find((v) => v.schluessel === mailFuer) : undefined;
  if (offen) {
    return (
      <EmailDialog
        posten={offen.posten}
        vorlageId={vorlageVon(offen) || null}
        empfaengerId={offen.contactId}
        vermerk={offen.vermerk}
        onVermerkt={() => setVermerkt((v) => (v.includes(offen.schluessel) ? v : [...v, offen.schluessel]))}
        onClose={() => setMailFuer(null)}
      />
    );
  }

  return (
    <Modal
      titel="E-Mail senden"
      sub={
        vorschlaege.length === 0
          ? 'Keine E-Mail vorgesehen'
          : 'Diese E-Mails sieht der Workflow jetzt vor – auf Wunsch vorbereiten'
      }
      wide
      onClose={onClose}
      footer={
        <button type="button" className="btn btn-primary" onClick={onClose}>
          {vermerkt.length > 0 ? 'Fertig' : 'Schließen'}
        </button>
      }
    >
      {vorschlaege.length === 0 ? (
        <p className="small muted">Der Workflow sieht hierzu keine E-Mail (mehr) vor.</p>
      ) : (
        <div>
          {vorschlaege.map((v) => {
            const kontakt = data.contacts.find((c) => c.id === v.contactId);
            const fertig = vermerkt.includes(v.schluessel);
            const anliegen = anliegenVon(v);
            return (
              <div className="pl-zustaendig" key={v.schluessel}>
                <span
                  className={`pl-zustaendig-haken ${fertig ? '' : 'offen'}`}
                  title={fertig ? 'E-Mail vorbereitet' : 'Noch keine E-Mail vorbereitet'}
                >
                  <Icon name={fertig ? 'check' : 'mail'} size={16} strokeWidth={fertig ? 2.4 : 1.6} />
                </span>
                <div className="pl-zustaendig-person">
                  <strong>{kontakt ? kontaktName(kontakt) : 'Keine Person zugeordnet'}</strong>
                  {kontakt?.email ? <span>{kontakt.email}</span> : null}
                  {anliegen ? (
                    <span>
                      Versand zur {VERSAND_ANLIEGEN_LABEL[anliegen]}
                      {kontakt && !kontakt.sharepointEingang?.trim() ? ' · SharePoint-Link Eingang fehlt' : ''}
                    </span>
                  ) : null}
                  {!kontakt ? <span>Funktion „{v.roleName || '–'}“ ist im Projekt nicht besetzt.</span> : null}
                  <span>Anlass: {v.anlaesse.join(' · ')}</span>
                  {schritte(v).map(({ run, step }) => (
                    <span key={`${run.id}/${step.id}`}>
                      {v.art === 'schritt' ? (
                        <>
                          {step.name}
                          {step.roleName ? ` (${step.roleName})` : ''} · {run.name} · Soll {formatDate(step.sollDatum)}
                        </>
                      ) : (
                        <>
                          Zur Kenntnis{v.roleName ? ` (${v.roleName})` : ''} · {run.name}
                        </>
                      )}
                    </span>
                  ))}
                </div>
                <Select
                  value={vorlageVon(v)}
                  onChange={(id) => setGewaehlt((alt) => ({ ...alt, [v.schluessel]: id }))}
                  options={vorlagen.map((x) => ({ value: x.id, label: x.name }))}
                />
                <button
                  type="button"
                  className={`btn btn-sm ${fertig ? 'btn-outline' : 'btn-primary'}`}
                  onClick={() => setMailFuer(v.schluessel)}
                  disabled={vorlagen.length === 0}
                >
                  <Icon name="mail" size={13} /> {fertig ? 'Erneut …' : 'E-Mail …'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
