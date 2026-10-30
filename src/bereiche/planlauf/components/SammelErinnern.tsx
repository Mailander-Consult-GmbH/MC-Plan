/**
 * Sammel-Erinnern („Erinnern …“ im Reiter „Planläufe“): eine Sammel-E-Mail je
 * Person über alle ihre anstehenden Schritte in den gewählten Planläufen
 * (email.sammelMailVorbereiten, Platzhalter {{liste}}).
 *
 * Je Person eine Zeile mit eigenen Schaltflächen – Outlook, Outlook im Web,
 * Kopieren –, denn ein Browser öffnet je Klick nur eine E-Mail. Vermerkt
 * werden nur die Schritte der angeklickten Person (Erinnerungen, Protokoll).
 * Wird die E-Mail-Verknüpfung zu lang (MAILTO_GRENZE), bleibt nur „Kopieren“.
 */
import { useState } from 'react';
import { formatDate } from '../../../shared/dates';
import { ampelFuerSchritt, kontaktName } from '../domain/engine';
import { sammelMailVorbereiten, vorlageVorschlagen, type SammelPosten } from '../domain/email';
import { anstehendeSchritte } from '../domain/uebersicht';
import { EMAIL_ANLASS_LABEL, type Contact, type ID } from '../domain/types';
import { useStore } from '../store/store';
import { useToast } from '../../../shared/toast';
import { Callout, Field, Modal, Select } from '../../../shared/ui';
import { Icon } from '../../../shared/icons';
import './auswahl.css';

type Weg = 'outlook' | 'web' | 'kopie';

const WEG_TEXT: Record<Weg, string> = {
  outlook: 'in Outlook geöffnet',
  web: 'in Outlook im Web geöffnet',
  kopie: 'in die Zwischenablage kopiert',
};

export function SammelErinnern({
  runIds,
  hinweise = [],
  onClose,
}: {
  /** Die gewählten Planläufe (aus der Auswahl aufgelöst, ohne Dubletten). */
  runIds: ID[];
  /** Hinweise zur Auflösung – etwa „wirkt auf den Planlauf von …“. */
  hinweise?: string[];
  onClose: () => void;
}) {
  const { data, erinnerungenVermerken } = useStore();
  const toast = useToast();
  /** Je Person, wie ihre E-Mail zuletzt vorbereitet wurde. */
  const [vermerkt, setVermerkt] = useState<Record<ID, Weg>>({});

  // Anstehende Schritte der gewählten Läufe, frisch aus dem Bestand
  const posten: SammelPosten[] = runIds.flatMap((id) => {
    const run = data.runs.find((r) => r.id === id);
    return run && run.status === 'laufend' ? anstehendeSchritte(run).map((step) => ({ run, step })) : [];
  });
  const vorlauf = (p: SammelPosten) =>
    data.projects.find((pr) => pr.id === p.run.projectId)?.settings.erinnerungVorlaufTage ?? 0;
  const ueberfaellig = (p: SammelPosten) => ampelFuerSchritt(p.step, vorlauf(p), true) === 'ueberfaellig';

  // Je Person ihre Schritte; Schritte ohne (bekannte) Person gesondert
  const personen: { kontakt: Contact; posten: SammelPosten[] }[] = [];
  const ohnePerson: SammelPosten[] = [];
  for (const p of posten) {
    const kontakt = data.contacts.find((c) => c.id === p.step.contactId);
    if (!kontakt) {
      ohnePerson.push(p);
      continue;
    }
    const gruppe = personen.find((g) => g.kontakt.id === kontakt.id);
    if (gruppe) gruppe.posten.push(p);
    else personen.push({ kontakt, posten: [p] });
  }
  personen.sort((a, b) => `${a.kontakt.nachname} ${a.kontakt.vorname}`.localeCompare(`${b.kontakt.nachname} ${b.kontakt.vorname}`, 'de'));

  const vorlagen = data.emailVorlagen;
  const [vorlageId, setVorlageId] = useState(
    () =>
      vorlagen.find((v) => v.id === 'mail-sammel')?.id ??
      vorlageVorschlagen(vorlagen, posten.some(ueberfaellig))?.id ??
      vorlagen[0]?.id ??
      '',
  );
  const vorlage = vorlagen.find((v) => v.id === vorlageId) ?? vorlagen[0];

  /** Vermerkt die vorbereitete Sammel-E-Mail an allen Schritten dieser Person. */
  const vermerken = (kontakt: Contact, liste: SammelPosten[], an: string, betreff: string, weg: Weg) => {
    erinnerungenVermerken(
      liste.map((p) => ({
        runId: p.run.id,
        stepId: p.step.id,
        erinnerung: {
          contactId: kontakt.id,
          kontaktName: kontaktName(kontakt),
          an,
          betreff,
          anlass: vorlage?.anlass ?? null,
          weg: 'sammel',
        },
      })),
    );
    setVermerkt((alt) => ({ ...alt, [kontakt.id]: weg }));
  };

  if (!vorlage) {
    return (
      <Modal titel="Keine E-Mail-Vorlage" onClose={onClose}>
        <Callout ton="warn" icon="!">
          Es ist noch keine E-Mail-Vorlage hinterlegt. Legen Sie unter <strong>Vorlagen › E-Mail-Vorlagen</strong> eine Vorlage an.
        </Callout>
      </Modal>
    );
  }

  return (
    <Modal
      titel="Erinnern"
      sub={`${personen.length} ${personen.length === 1 ? 'Person' : 'Personen'} · ${posten.length} anstehende ${
        posten.length === 1 ? 'Schritt' : 'Schritte'
      }`}
      wide
      onClose={onClose}
      footer={
        <button type="button" className="btn btn-primary" onClick={onClose}>
          Fertig
        </button>
      }
    >
      <div className="stack" style={{ gap: 14 }}>
        {hinweise.length > 0 ? (
          <div className="pll-hinweise">
            {hinweise.map((h) => (
              <Callout key={h}>{h}</Callout>
            ))}
          </div>
        ) : null}

        <Field
          label="Vorlage"
          hint="Je Person eine E-Mail mit der Liste ihrer anstehenden Schritte ({{liste}}). Vermerkt wird nur bei der Person, deren E-Mail Sie öffnen bzw. kopieren."
        >
          <Select
            value={vorlage.id}
            onChange={setVorlageId}
            options={vorlagen.map((t) => ({ value: t.id, label: `${t.name} · ${EMAIL_ANLASS_LABEL[t.anlass]}` }))}
          />
        </Field>

        {personen.length === 0 ? (
          <Callout ton="warn" icon="!">
            In den gewählten Planläufen steht kein Schritt mit zuständiger Person an.
          </Callout>
        ) : (
          <div className="pll-gruppen">
            {personen.map(({ kontakt, posten: liste }) => {
              const mail = sammelMailVorbereiten(vorlage, { contact: kontakt, posten: liste, data });
              const zuSpaet = liste.filter(ueberfaellig).length;
              const weg = vermerkt[kontakt.id];
              const oeffnen = (art: 'outlook' | 'web') => {
                if (art === 'outlook') window.location.href = mail.mailto;
                else window.open(mail.outlookWeb, '_blank', 'noopener,noreferrer');
                vermerken(kontakt, liste, mail.an, mail.betreff, art);
                toast(art === 'outlook' ? 'Outlook wird mit der E-Mail geöffnet.' : 'Outlook im Web wird geöffnet.');
              };
              const kopieren = async () => {
                try {
                  await navigator.clipboard.writeText(`An: ${mail.an}\nBetreff: ${mail.betreff}\n\n${mail.text}`);
                  vermerken(kontakt, liste, mail.an, mail.betreff, 'kopie');
                  toast('E-Mail in die Zwischenablage kopiert.');
                } catch {
                  toast('Kopieren nicht möglich – bitte Text manuell markieren.');
                }
              };
              return (
                <div key={kontakt.id} className={`pll-person ${weg ? 'pll-vermerkt' : ''}`}>
                  <div className="pll-person-name">
                    <strong>
                      {kontakt.vorname} {kontakt.nachname}
                    </strong>
                    <div className="small tertiary">
                      {[kontakt.firma, kontakt.email || 'keine E-Mail-Adresse'].filter(Boolean).join(' · ')}
                    </div>
                    <div className="small muted">
                      {liste.length} {liste.length === 1 ? 'Schritt' : 'Schritte'}
                      {zuSpaet > 0 ? <span className="pll-fehlt"> · {zuSpaet} überfällig</span> : null}
                      {weg ? <span className="pll-vorschau"> · E-Mail {WEG_TEXT[weg]}, vermerkt</span> : null}
                    </div>
                  </div>
                  <div className="pll-person-knoepfe">
                    {!mail.zuLang ? (
                      <>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline"
                          disabled={!mail.an}
                          onClick={() => oeffnen('outlook')}
                          title={mail.an ? 'In Outlook öffnen' : 'Keine E-Mail-Adresse hinterlegt'}
                        >
                          <Icon name="mail" size={13} /> Outlook
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline"
                          disabled={!mail.an}
                          onClick={() => oeffnen('web')}
                          title={mail.an ? 'In Outlook im Web öffnen' : 'Keine E-Mail-Adresse hinterlegt'}
                        >
                          Web
                        </button>
                      </>
                    ) : null}
                    <button type="button" className="btn btn-sm btn-outline" onClick={kopieren}>
                      <Icon name="kopieren" size={13} /> Kopieren
                    </button>
                  </div>
                  {mail.zuLang ? (
                    <span className="pll-warnung" style={{ flexBasis: '100%' }}>
                      Die E-Mail ist für eine direkte Verknüpfung zu lang – bitte kopieren und in Outlook einfügen.
                    </span>
                  ) : null}
                  <details>
                    <summary>Text ansehen</summary>
                    <pre>{`Betreff: ${mail.betreff}\n\n${mail.text}`}</pre>
                  </details>
                </div>
              );
            })}
          </div>
        )}

        {ohnePerson.length > 0 ? (
          <Callout ton="warn" icon="!">
            {ohnePerson.length === 1 ? 'Ein Schritt hat' : `${ohnePerson.length} Schritte haben`} keine zuständige Person
            und {ohnePerson.length === 1 ? 'bleibt' : 'bleiben'} hier außen vor:{' '}
            {ohnePerson
              .map((p) => {
                const doc = data.documents.find((d) => d.id === p.run.documentId);
                return `${doc?.nummer ?? p.run.name} – ${p.step.name} (Soll ${formatDate(p.step.sollDatum)})`;
              })
              .join('; ')}
            .
          </Callout>
        ) : null}
      </div>
    </Modal>
  );
}
