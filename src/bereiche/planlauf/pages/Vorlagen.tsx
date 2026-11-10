/**
 * Projektübergreifende Vorlagen.
 *
 * Hier stehen die Excel-Vorlagen für den Upload von Plänen und Kontakten
 * sowie die Standardtexte der E-Mails. Die Texte arbeiten mit Bausteinen –
 * Platzhaltern, die beim Vorbereiten einer E-Mail aus Projekt, Plan, Schritt
 * und Empfänger befüllt werden.
 */
import { useRef, useState } from 'react';
import { EMAIL_ANLASS_LABEL, type EmailAnlass, type EmailTemplate } from '../domain/types';
import {
  BEISPIEL_WERTE,
  PLATZHALTER,
  PLATZHALTER_KATEGORIEN,
  fuelleVorlage,
  mailHtml,
  sharepointKurztexte,
  type PlatzhalterKategorie,
} from '../domain/email';
import {
  ROLLEN_HINWEISE,
  ROLLEN_KOPFZEILE,
  PLAN_HINWEISE,
  PLAN_KOPFZEILE,
  rollenVorlageLaden,
  planVorlageLaden,
} from '../domain/importVorlagen';
import { newId, useStore } from '../store/store';
import { useToast } from '../../../shared/toast';
import {
  Badge,
  Callout,
  Card,
  CardHeader,
  ConfirmDialog,
  Field,
  Modal,
  Select,
  TextInput,
} from '../../../shared/ui';
import { Icon } from '../../../shared/icons';
import {
  BausteinEditor,
  BausteinText,
  type BausteinEditorGriff,
  type BausteinTon,
  type BausteinVerzeichnis,
} from '../../../shared/bausteinEditor';
import './vorlagen.css';

type Seite = 'mail' | 'listen';

export function Vorlagen() {
  const { data, setEmailVorlage, deleteEmailVorlage } = useStore();
  const toast = useToast();
  const [seite, setSeite] = useState<Seite>('mail');
  const [dialog, setDialog] = useState<{ template?: EmailTemplate } | null>(null);
  const [loeschen, setLoeschen] = useState<EmailTemplate | null>(null);

  return (
    <div className="stack">
      <div className="tabs">
        <button type="button" className={seite === 'mail' ? 'active' : ''} onClick={() => setSeite('mail')}>
          E-Mail-Texte
        </button>
        <button type="button" className={seite === 'listen' ? 'active' : ''} onClick={() => setSeite('listen')}>
          Excel-Vorlagen
        </button>
      </div>

      {seite === 'listen' ? (
        <>
          <p className="muted small" style={{ maxWidth: 720 }}>
            Die Vorlagen enthalten die erwarteten Spalten und einige Beispielzeilen. Eingelesen werden sie im
            Projekt unter <strong>Planliste</strong> bzw. <strong>Funktion</strong> über
            <em> Excel-Import</em>.
          </p>

          <ListenKarte
            titel="Planliste"
            sub="Pläne, Planverzeichnisse und Planpakete"
            spalten={PLAN_KOPFZEILE}
            hinweise={PLAN_HINWEISE}
            onLaden={planVorlageLaden}
            text="Planpakete und Planverzeichnisse, die in der Liste genannt, im Projekt aber noch nicht angelegt sind, entstehen beim Import automatisch. Der Planlauf startet beim Import immer – nach dem genannten Workflow, sonst nach dem im Import gewählten."
          />

          <ListenKarte
            titel="Funktion"
            sub="Funktionen eines Projekts samt Besetzung"
            spalten={ROLLEN_KOPFZEILE}
            hinweise={ROLLEN_HINWEISE}
            onLaden={rollenVorlageLaden}
            text="Je Zeile eine Funktion mit der Person, die sie ausfüllt. Gewerke und Funktionen, die im Projekt noch nicht vorhanden sind, werden beim Import angelegt."
          />
        </>
      ) : (
        <>
          <div className="row-between wrap">
            <p className="muted small" style={{ maxWidth: 680 }}>
              Diese Texte stehen in allen Projekten zur Verfügung. Die farbigen Bausteine sind Platzhalter – sie
              werden beim Vorbereiten einer E-Mail aus Projekt, Plan, Schritt und Empfänger befüllt.
            </p>
            <button type="button" className="btn btn-primary" onClick={() => setDialog({})}>
              <Icon name="plus" size={14} /> Neue Vorlage
            </button>
          </div>

          <Card>
            <CardHeader titel="E-Mail-Vorlagen" sub={`${data.emailVorlagen.length} Vorlagen`} />
            {data.emailVorlagen.length === 0 ? (
              <div className="card-pad">
                <Callout ton="warn" icon="!">
                  Ohne Vorlage kann keine E-Mail vorbereitet werden.
                </Callout>
              </div>
            ) : (
              data.emailVorlagen.map((t) => (
                <div className="list-row" key={t.id}>
                  <span className="tertiary" style={{ display: 'flex' }}>
                    <Icon name="mail" size={17} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row wrap" style={{ gap: 8 }}>
                      <strong>{t.name}</strong>
                      <AnlassBadge anlass={t.anlass} />
                    </div>
                    <div className="small vl-anriss">
                      <BausteinText text={t.betreff} bausteine={BAUSTEINE} />
                    </div>
                    <div className="small tertiary vl-anriss">
                      <BausteinText text={t.text.replace(/\s*\n\s*/g, ' ').slice(0, 160).replace(/\{\{[\w.\s]*\}?$/, '')} bausteine={BAUSTEINE} />
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={() => setDialog({ template: t })}
                  >
                    Bearbeiten
                  </button>
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={() => setLoeschen(t)}
                    aria-label="Vorlage löschen"
                  >
                    <Icon name="loeschen" size={15} />
                  </button>
                </div>
              ))
            )}
          </Card>
        </>
      )}

      {dialog ? (
        <MailVorlagenDialog
          template={dialog.template}
          onSpeichern={(t) => {
            setEmailVorlage(t);
            toast(dialog.template ? 'Vorlage gespeichert.' : 'Vorlage angelegt.');
          }}
          onClose={() => setDialog(null)}
        />
      ) : null}

      {loeschen ? (
        <ConfirmDialog
          titel="Vorlage löschen?"
          text={`„${loeschen.name}“ steht dann in keinem Projekt mehr zur Verfügung.`}
          onConfirm={() => {
            deleteEmailVorlage(loeschen.id);
            toast('Vorlage gelöscht.');
          }}
          onClose={() => setLoeschen(null)}
        />
      ) : null}
    </div>
  );
}

function ListenKarte({
  titel,
  sub,
  spalten,
  hinweise,
  text,
  onLaden,
}: {
  titel: string;
  sub: string;
  spalten: string[];
  hinweise: [string, string][];
  text: string;
  onLaden: () => void;
}) {
  return (
    <Card>
      <CardHeader
        titel={titel}
        sub={sub}
        actions={
          <button type="button" className="btn btn-primary btn-sm" onClick={onLaden}>
            <Icon name="export" size={13} /> Vorlage herunterladen
          </button>
        }
      />
      <div className="card-pad stack" style={{ gap: 12 }}>
        <div className="row wrap" style={{ gap: 6 }}>
          {spalten.map((s) => (
            <span key={s} className="badge">
              {s}
            </span>
          ))}
        </div>
        <dl className="kv kv-breit">
          {hinweise.map(([spalte, erklaerung]) => (
            <div key={spalte} style={{ display: 'contents' }}>
              <dt>{spalte}</dt>
              <dd>{erklaerung}</dd>
            </div>
          ))}
        </dl>
        <p className="small muted">{text}</p>
      </div>
    </Card>
  );
}

/** Farbe je Gruppe der Platzhalter. */
const KATEGORIE_TON: Record<PlatzhalterKategorie, BausteinTon> = {
  empfaenger: 'blau',
  plan: 'gruen',
  termine: 'orange',
  versand: 'lila',
  sonstiges: 'grau',
};

/** Beschriftung, Farbe und Tooltip der Bausteine im Editor. */
const BAUSTEINE: BausteinVerzeichnis = Object.fromEntries(
  PLATZHALTER.map((p) => [
    p.schluessel,
    { label: p.label, ton: KATEGORIE_TON[p.kategorie], titel: `${p.beschreibung}\nBeispiel: ${p.beispiel}` },
  ]),
);

const ANLASS_TON: Record<EmailAnlass, 'orange' | 'red' | 'green' | 'purple' | 'blue'> = {
  erinnerung: 'orange',
  ueberfaellig: 'red',
  freigabe: 'green',
  uebergabe: 'purple',
  allgemein: 'blue',
};

/** Anlass als farbiges Badge. */
function AnlassBadge({ anlass }: { anlass: EmailAnlass }) {
  return <Badge ton={ANLASS_TON[anlass]}>{EMAIL_ANLASS_LABEL[anlass]}</Badge>;
}

type Feld = 'betreff' | 'text';

function MailVorlagenDialog({
  template,
  onSpeichern,
  onClose,
}: {
  template?: EmailTemplate;
  onSpeichern: (t: EmailTemplate) => void;
  onClose: () => void;
}) {
  const toast = useToast();
  const betreffRef = useRef<BausteinEditorGriff>(null);
  const textRef = useRef<BausteinEditorGriff>(null);
  // Zuletzt bearbeitetes Feld – dort fügen die Knöpfe ein
  const [ziel, setZiel] = useState<Feld>('text');
  // Schmale Ansicht: Bearbeiten oder Vorschau; breit stehen beide nebeneinander
  const [ansicht, setAnsicht] = useState<'bearbeiten' | 'vorschau'>('bearbeiten');
  const [form, setForm] = useState<EmailTemplate>(
    template ?? {
      id: newId('mail'),
      name: '',
      anlass: 'erinnerung',
      betreff: '[{{projekt.nummer}}] {{schritt}} – {{plan.nummer}}',
      text: `{{anrede}}

zum Planlauf {{plan.nummer}} „{{plan}}“ steht der Schritt „{{schritt}}“ an.
Der Soll-Termin ist der {{soll}} ({{frist}}).

Mit freundlichen Grüßen
{{absender}}`,
    },
  );

  const einfuegen = (schluessel: string) => {
    (ziel === 'betreff' ? betreffRef : textRef).current?.einfuegen(schluessel);
  };

  const speichern = () => {
    if (!form.name.trim()) {
      toast('Bitte einen Namen angeben.');
      return;
    }
    onSpeichern(form);
    onClose();
  };

  return (
    <Modal
      titel={form.name.trim() || (template ? 'E-Mail-Vorlage' : 'Neue E-Mail-Vorlage')}
      sub={
        <span className="row wrap" style={{ gap: 8 }}>
          <AnlassBadge anlass={form.anlass} />
          <span>Platzhalter werden beim Vorbereiten der E-Mail automatisch befüllt</span>
        </span>
      }
      wide
      klasse="vl-dialog"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Abbrechen
          </button>
          <button type="button" className="btn btn-primary" onClick={speichern}>
            Speichern
          </button>
        </>
      }
    >
      <div className="vl-editor" data-ansicht={ansicht}>
        <div className="tabs vl-umschalter">
          <button type="button" className={ansicht === 'bearbeiten' ? 'active' : ''} onClick={() => setAnsicht('bearbeiten')}>
            Bearbeiten
          </button>
          <button type="button" className={ansicht === 'vorschau' ? 'active' : ''} onClick={() => setAnsicht('vorschau')}>
            Vorschau
          </button>
        </div>

        <div className="vl-bearbeiten">
          <section className="vl-gruppe">
            <h3 className="vl-gruppe-titel">Allgemein</h3>
            <div className="form-grid">
              <Field label="Name der Vorlage">
                <TextInput value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
              </Field>
              <Field label="Anlass" hint="Bestimmt, welche Vorlage automatisch vorgeschlagen wird.">
                <Select
                  value={form.anlass}
                  onChange={(v) => setForm({ ...form, anlass: v as EmailAnlass })}
                  options={Object.entries(EMAIL_ANLASS_LABEL).map(([value, label]) => ({ value, label }))}
                />
              </Field>
            </div>
          </section>

          <section className="vl-gruppe">
            <h3 className="vl-gruppe-titel">Inhalt</h3>
            <div className="field">
              <label onClick={() => betreffRef.current?.fokus()}>Betreff</label>
              <BausteinEditor
                griff={betreffRef}
                wert={form.betreff}
                onChange={(v) => setForm((f) => ({ ...f, betreff: v }))}
                bausteine={BAUSTEINE}
                einzeilig
                label="Betreff"
                leer="Betreff eingeben …"
                onFokus={() => setZiel('betreff')}
              />
            </div>

            <div className="vl-palette" role="group" aria-label="Platzhalter einfügen">
              <div className="row-between wrap" style={{ gap: 6 }}>
                <strong className="small">Platzhalter einfügen</strong>
                <span className="small tertiary">
                  fügt in <strong>{ziel === 'betreff' ? 'Betreff' : 'Text'}</strong> an der Schreibmarke ein
                </span>
              </div>
              {PLATZHALTER_KATEGORIEN.map((k) => (
                <div className="vl-palette-zeile" key={k.id}>
                  <span className="vl-palette-kat">{k.label}</span>
                  <div className="row wrap" style={{ gap: 6 }}>
                    {PLATZHALTER.filter((p) => p.kategorie === k.id).map((p) => (
                      <button
                        key={p.schluessel}
                        type="button"
                        className={`bst-knopf bst-ton-${KATEGORIE_TON[k.id]}`}
                        title={`${p.beschreibung}\nBeispiel: ${p.beispiel}`}
                        // Schreibmarke und Auswahl im Feld bleiben beim Klick erhalten
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => einfuegen(p.schluessel)}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="field">
              <label onClick={() => textRef.current?.fokus()}>Text</label>
              <BausteinEditor
                griff={textRef}
                wert={form.text}
                onChange={(v) => setForm((f) => ({ ...f, text: v }))}
                bausteine={BAUSTEINE}
                label="Text"
                leer="Text der E-Mail …"
                zeilen={12}
                onFokus={() => setZiel('text')}
              />
            </div>
          </section>
        </div>

        <aside className="vl-vorschau" aria-label="Vorschau">
          <div className="row-between wrap" style={{ gap: 6 }}>
            <h3 className="vl-gruppe-titel">Vorschau</h3>
            <span className="small tertiary">mit Beispielwerten eines Planlaufs</span>
          </div>
          <div className="vl-mail">
            <dl className="vl-mail-kopf">
              <dt>An</dt>
              <dd>{BEISPIEL_WERTE.empfaenger}</dd>
              <dt>Betreff</dt>
              <dd>
                <strong>{fuelleVorlage(form.betreff, BEISPIEL_WERTE)}</strong>
              </dd>
            </dl>
            {/* mailHtml maskiert den Text selbst – wie „Kopieren (formatiert)“ im E-Mail-Dialog */}
            <div className="vl-mail-text" dangerouslySetInnerHTML={{ __html: mailHtml(fuelleVorlage(form.text, BEISPIEL_WERTE), sharepointKurztexte({ sharepointEingang: BEISPIEL_WERTE['sharepoint.eingang'], sharepointAusgang: BEISPIEL_WERTE['sharepoint.ausgang'] })) }} />
          </div>
        </aside>
      </div>
    </Modal>
  );
}
