/**
 * Bearbeitung der Plancodierung eines Pflichtenhefts.
 *
 * Oben steht der Aufbau des Codes als Kette: je Kategorie ein farbiges Glied
 * mit ihrem Beispiel, dazwischen „_“, am Ende „.pdf“. Ein Klick wählt die
 * Kategorie; darunter steht sie in einer grauen Kachel – Name, Beispiel, wie
 * die Stelle geprüft wird (`pruefRegelText`), Verschieben und Entfernen – mit
 * ihrem Katalog als Liste (`CodierungsKatalog`) oder, zum Einfügen aus Excel,
 * als Text. Zuletzt der Hinweis unter dem Schema.
 *
 * Gespeichert bleibt das Format der Prüfung und der Druckfassung
 * (domain/plancodierung.ts): die Einträge einer Kategorie als Text. Eingaben
 * gehen verzögert an `onChange` (`useEntwurf`), weil jede Änderung den ganzen
 * Bestand schreibt; Anlegen, Verschieben und Entfernen sofort.
 */
import { memo, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { beispielCode, eintraegeLesen, pruefRegelText, standardPlancodierung } from '../../../domain/plancodierung';
import type { CodierungsKategorie, Plancodierung } from '../../../domain/types';
import { ConfirmDialog, Field, Segmented, TextArea, TextInput } from '../../../../../shared/ui';
import { Icon } from '../../../../../shared/icons';
import { Einblenden, listenEintrag } from '../../../../../shared/bewegung';
import { CodierungsKatalog, codeZahl } from './CodierungsKatalog';
import './plancodierung.css';

/** Töne der Glieder, reihum je Kategorie (Token-Farben, hell wie dunkel). */
const TOENE = [
  'bg-marke-zart text-marke-text',
  'bg-gruen-zart text-gruen-text',
  'bg-orange-zart text-orange-text',
  'bg-violett-zart text-violett',
  'bg-blau-zart text-blau-text',
] as const;
const ton = (i: number) => TOENE[i % TOENE.length];

const PLATZHALTER = [
  'Je Zeile ein Code und seine Bezeichnung –',
  'getrennt durch Tabulator (Einfügen aus Excel),',
  '„ – “ oder zwei Leerzeichen, etwa:',
  'AP – Ausführungsplanung',
  '# Überschrift gliedert die Liste',
].join('\n');

type Darstellung = 'liste' | 'text';

function neueId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Bearbeiten mit verzögertem Speichern (wie `useEntwurf` in Pflichtenheft.tsx,
 * hier für die ganze Plancodierung): Der Entwurf folgt jeder Eingabe,
 * gespeichert wird nach einer kurzen Pause und spätestens beim Verlassen; mit
 * `sofort` gleich. Gespeichert wird mit dem `speichern` aus der Zeit der
 * Eingabe – wechselt dazwischen das Projekt, geht der Entwurf an seines.
 *
 * Ändert sich der gespeicherte Wert von außen, übernimmt ihn der Entwurf. Ist
 * dabei ein Entwurf offen (eine andere Karte oder ein anderes Fenster hat
 * gespeichert, oder es ist ein anderes Projekt), wird er sofort gespeichert;
 * danach gilt der gespeicherte Stand, wenn er vom Entwurf abweicht.
 */
function useEntwurf<T>(wert: T, speichern: (v: T) => void, ms = 450): [T, (fn: (v: T) => T, sofort?: boolean) => void] {
  const [entwurf, setEntwurf] = useState(wert);
  const offen = useRef(false);
  const aktuell = useRef(wert);
  const wertRef = useRef(wert);
  wertRef.current = wert;
  const speichernRef = useRef(speichern);
  speichernRef.current = speichern;
  /** Wohin der offene Entwurf gehört. */
  const ziel = useRef(speichern);
  const [nachSichern, setNachSichern] = useState(0);

  const sichern = useCallback(() => {
    if (!offen.current) return;
    offen.current = false;
    ziel.current(aktuell.current);
  }, []);

  // Vor dem Zeichnen, damit kein fremder oder veralteter Stand aufblitzt.
  useLayoutEffect(() => {
    if (offen.current) {
      sichern();
      setNachSichern((n) => n + 1);
      return;
    }
    setEntwurf(wert);
    aktuell.current = wert;
  }, [wert, sichern]);
  useLayoutEffect(() => {
    if (nachSichern === 0 || offen.current) return;
    if (JSON.stringify(aktuell.current) === JSON.stringify(wertRef.current)) return;
    setEntwurf(wertRef.current);
    aktuell.current = wertRef.current;
  }, [nachSichern]);
  useEffect(() => {
    if (!offen.current) return;
    const t = setTimeout(sichern, ms);
    return () => clearTimeout(t);
  }, [entwurf, ms, sichern]);
  useEffect(() => sichern, [sichern]);

  const aendern = useCallback((fn: (v: T) => T, sofort = false) => {
    const neu = fn(aktuell.current);
    aktuell.current = neu;
    ziel.current = speichernRef.current;
    setEntwurf(neu);
    if (sofort) {
      offen.current = false;
      ziel.current(neu);
    } else {
      offen.current = true;
    }
  }, []);
  return [entwurf, aendern];
}

export function PlancodierungEditor({ wert, onChange }: { wert: Plancodierung; onChange: (p: Plancodierung) => void }) {
  const [pc, aendernPc] = useEntwurf(wert, onChange);
  const kategorien = pc.kategorien;
  const [gewaehlt, setGewaehlt] = useState<string | null>(null);
  /** Neu angelegte Kategorie – ihr Name bekommt den Fokus. */
  const [neu, setNeu] = useState<string | null>(null);
  const [loeschen, setLoeschen] = useState<CodierungsKategorie | null>(null);
  const [darstellung, setDarstellung] = useState<Darstellung>('liste');
  const wurzel = useRef<HTMLDivElement>(null);
  const kachelId = useId();

  const index = Math.max(
    0,
    kategorien.findIndex((k) => k.id === gewaehlt),
  );
  const k: CodierungsKategorie | undefined = kategorien[index];

  const setzen = (fn: (k: CodierungsKategorie[]) => CodierungsKategorie[], sofort = false) =>
    aendernPc((p) => ({ ...p, kategorien: fn(p.kategorien) }), sofort);
  const aendern = (id: string, patch: Partial<CodierungsKategorie>) =>
    setzen((ks) => ks.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const gliedFokus = (id: string | null) =>
    requestAnimationFrame(() =>
      wurzel.current?.querySelector<HTMLElement>(id ? `[data-pc-kategorie="${id}"]` : '[data-pc-neu]')?.focus(),
    );

  const verschieben = (id: string, um: -1 | 1) =>
    setzen((ks) => {
      const i = ks.findIndex((x) => x.id === id);
      const j = i + um;
      if (i < 0 || j < 0 || j >= ks.length) return ks;
      const folge = [...ks];
      [folge[i], folge[j]] = [folge[j], folge[i]];
      return folge;
    }, true);
  const hinzufuegen = useCallback(() => {
    const id = neueId('kat');
    aendernPc((p) => ({ ...p, kategorien: [...p.kategorien, { id, name: '', beispiel: '', eintraege: '' }] }), true);
    setGewaehlt(id);
    setNeu(id);
  }, [aendernPc]);
  /** Wählt eine Kategorie; ihr Name bekommt den Fokus nur gleich nach dem Anlegen. */
  const waehlen = useCallback((id: string) => {
    setGewaehlt(id);
    setNeu(null);
  }, []);
  // Die Kette zeichnet nur neu, wenn sich Name, Beispiel oder Folge ändern – nicht bei Eingaben im Katalog.
  const gliederSchluessel = kategorien.map((x) => `${x.id}\u0000${x.name}\u0000${x.beispiel}`).join('\u0001');
  const glieder = useMemo(
    () => kategorien.map(({ id, name, beispiel }) => ({ id, name, beispiel })),
    // Allein der Schlüssel: Er fasst zusammen, was die Kette zeigt.
    [gliederSchluessel],
  );
  /** Entfernt die Kategorie und wählt die daneben; der Fokus geht an ihr Glied. */
  const entfernen = (id: string) => {
    const i = kategorien.findIndex((x) => x.id === id);
    const rest = kategorien.filter((x) => x.id !== id);
    const naechste = rest[Math.min(i, rest.length - 1)] ?? null;
    setzen((ks) => ks.filter((x) => x.id !== id), true);
    setGewaehlt(naechste?.id ?? null);
    gliedFokus(naechste?.id ?? null);
  };

  return (
    <div ref={wurzel} className="@container flex flex-col gap-5">
      {kategorien.length > 0 && k ? (
        <>
          <CodeKette glieder={glieder} gewaehlt={k.id} kachelId={kachelId} onWaehlen={waehlen} onNeu={hinzufuegen} />

          <section id={kachelId} className="rounded-2xl bg-flaeche p-4 @2xl:p-5" aria-label={`${index + 1}. Kategorie`}>
            <Einblenden schluessel={k.id}>
              <KategorieKachel
                k={k}
                index={index}
                anzahl={kategorien.length}
                tonKlasse={ton(index)}
                autoFokus={k.id === neu}
                darstellung={darstellung}
                onDarstellung={setDarstellung}
                onAendern={(patch) => aendern(k.id, patch)}
                onVerschieben={(um) => verschieben(k.id, um)}
                onEntfernen={() => (k.eintraege.trim() ? setLoeschen(k) : entfernen(k.id))}
              />
            </Einblenden>
          </section>
        </>
      ) : (
        <div className="flex flex-col items-start gap-3 rounded-2xl bg-flaeche p-4 @2xl:p-5">
          <p className="text-[13px] text-zweitrangig">
            Noch keine Kategorie. Die mitgelieferte Vorlage hat acht Kategorien – von „Projekt“ bis „Index“ – mit den
            üblichen Katalogen.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-outline" onClick={() => aendernPc(() => standardPlancodierung(neueId), true)}>
              Mitgelieferte Vorlage übernehmen
            </button>
            <button type="button" className="btn btn-ghost" data-pc-neu onClick={hinzufuegen}>
              <Icon name="plus" size={14} /> Kategorie
            </button>
          </div>
        </div>
      )}

      <Field label="Hinweis unter dem Schema" hint="Steht in der Druckfassung unter der Tabelle.">
        <TextArea value={pc.hinweis} onChange={(v) => aendernPc((p) => ({ ...p, hinweis: v }))} rows={3} />
      </Field>

      {loeschen ? (
        <ConfirmDialog
          titel="Kategorie entfernen?"
          text={`Die Kategorie ${loeschen.name.trim() ? `„${loeschen.name.trim()}“` : 'ohne Namen'} wird samt ihrem Katalog entfernt.`}
          bestaetigenLabel="Entfernen"
          onConfirm={() => entfernen(loeschen.id)}
          onClose={() => setLoeschen(null)}
        />
      ) : null}
    </div>
  );
}

type Glied = Pick<CodierungsKategorie, 'id' | 'name' | 'beispiel'>;

/**
 * Aufbau des Codes: je Kategorie ein Glied mit ihrem Beispiel, Nummer und
 * Name; „_“ dazwischen, „.pdf“ am Ende, zuletzt der Platz für eine neue
 * Kategorie. Ein Klick wählt die Kategorie.
 */
const CodeKette = memo(function CodeKette({
  glieder,
  gewaehlt,
  kachelId,
  onWaehlen,
  onNeu,
}: {
  glieder: Glied[];
  gewaehlt: string;
  kachelId: string;
  onWaehlen: (id: string) => void;
  onNeu: () => void;
}) {
  return (
    <div>
      <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-[12.5px] text-gedaempft">Aufbau des Codes</span>
        <span className="text-[12.5px] text-gedaempft">Kategorie anklicken, um sie zu bearbeiten</span>
      </div>
      <p className="sr-only">Beispiel: {beispielCode({ kategorien: glieder.map((g) => ({ ...g, eintraege: '' })), hinweis: '' })}</p>
      <div className="flex flex-wrap items-start gap-y-3" role="group" aria-label="Aufbau des Codes – Kategorie wählen">
        <AnimatePresence initial={false}>
          {glieder.map((x, i) => {
            const name = x.name.trim();
            const beispiel = x.beispiel.trim();
            return (
              // Das Trennzeichen hängt am Glied davor, damit schmal nach „_“ umbrochen wird.
              <motion.div key={x.id} className="flex items-stretch" {...listenEintrag}>
                <button
                  type="button"
                  className={`pc-glied ${ton(i)}`}
                  data-pc-kategorie={x.id}
                  aria-pressed={x.id === gewaehlt}
                  aria-controls={kachelId}
                  aria-label={`${i + 1}. Kategorie: ${name || 'ohne Namen'}, Beispiel ${beispiel || 'fehlt'}`}
                  title={name || `${i + 1}. Kategorie`}
                  onClick={() => onWaehlen(x.id)}
                >
                  <span className="pc-glied-wert">{beispiel || '…'}</span>
                  <span className="pc-glied-name">
                    <span className="pc-glied-nr">{i + 1}</span> {name || 'Neue Kategorie'}
                  </span>
                </button>
                {i < glieder.length - 1 ? (
                  <span className="pc-trenner unterstrich" aria-hidden="true">
                    _
                  </span>
                ) : (
                  <span className="pc-trenner pr-2.5" aria-hidden="true">
                    .pdf
                  </span>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
        <button type="button" className="pc-glied-neu" data-pc-neu onClick={onNeu} aria-label="Kategorie hinzufügen">
          <Icon name="plus" size={18} />
          <span className="pc-glied-name">Kategorie</span>
        </button>
      </div>
    </div>
  );
});

/** Die gewählte Kategorie: Kopf, Name und Beispiel, Prüfregel und Katalog. */
function KategorieKachel({
  k,
  index,
  anzahl,
  tonKlasse,
  autoFokus,
  darstellung,
  onDarstellung,
  onAendern,
  onVerschieben,
  onEntfernen,
}: {
  k: CodierungsKategorie;
  index: number;
  anzahl: number;
  tonKlasse: string;
  autoFokus: boolean;
  darstellung: Darstellung;
  onDarstellung: (d: Darstellung) => void;
  onAendern: (patch: Partial<CodierungsKategorie>) => void;
  onVerschieben: (um: -1 | 1) => void;
  onEntfernen: () => void;
}) {
  const name = k.name.trim();
  const titel = name ? `„${name}“` : `${index + 1}. Kategorie`;
  const textZeilen = k.eintraege.split('\n').length;
  const codes = darstellung === 'text' ? codeZahl(eintraegeLesen(k.eintraege)) : 0;
  const umschalter = (
    <Segmented<Darstellung>
      value={darstellung}
      onChange={onDarstellung}
      options={[
        { value: 'liste', label: 'Liste' },
        { value: 'text', label: 'Als Text' },
      ]}
    />
  );
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span
          className={`grid h-9 min-w-9 shrink-0 place-items-center rounded-full px-2 text-sm font-semibold tabular-nums ${tonKlasse}`}
          aria-hidden="true"
        >
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className={`truncate text-[15px] font-medium tracking-tight ${name ? '' : 'text-gedaempft'}`}>{name || 'Neue Kategorie'}</h3>
          <p className="text-[12px] tabular-nums text-gedaempft">
            Stelle {index + 1} von {anzahl}
          </p>
        </div>
        <div className="flex shrink-0 items-center">
          <button
            type="button"
            className="btn-icon aria-disabled:cursor-not-allowed aria-disabled:opacity-35"
            aria-disabled={index === 0}
            onClick={() => onVerschieben(-1)}
            aria-label={`Kategorie ${titel} nach links`}
            title="Nach links"
          >
            <Icon name="links" size={15} />
          </button>
          <button
            type="button"
            className="btn-icon aria-disabled:cursor-not-allowed aria-disabled:opacity-35"
            aria-disabled={index === anzahl - 1}
            onClick={() => onVerschieben(1)}
            aria-label={`Kategorie ${titel} nach rechts`}
            title="Nach rechts"
          >
            <Icon name="rechts" size={15} />
          </button>
          <button
            type="button"
            className="btn-icon hover:text-rot-text"
            onClick={onEntfernen}
            aria-label={`Kategorie ${titel} entfernen`}
            title="Kategorie entfernen"
          >
            <Icon name="loeschen" size={15} />
          </button>
        </div>
      </div>

      <div className="grid gap-5 @4xl:grid-cols-[15rem_minmax(0,1fr)]">
        <div className="grid content-start gap-3 grid-cols-[minmax(0,2fr)_minmax(0,1fr)] @4xl:grid-cols-1">
          <Field label="Name">
            <TextInput
              value={k.name}
              onChange={(v) => onAendern({ name: v })}
              placeholder="Planart"
              aria-label={`Name der ${index + 1}. Kategorie`}
              autoFocus={autoFokus}
            />
          </Field>
          <Field label="Beispiel">
            <TextInput
              value={k.beispiel}
              onChange={(v) => onAendern({ beispiel: v })}
              placeholder="BWP"
              aria-label={`Beispiel der ${index + 1}. Kategorie`}
              spellCheck={false}
            />
          </Field>
          <p className="col-span-full flex items-start gap-1.5 text-[12px] leading-snug text-gedaempft">
            <span className="mt-px">
              <Icon name="info" size={13} />
            </span>
            {pruefRegelText(k)}
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-2.5">
          {darstellung === 'liste' ? (
            <CodierungsKatalog text={k.eintraege} onText={(t) => onAendern({ eintraege: t })} titel={k.name} zusatz={umschalter} />
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <h4 className="font-medium tracking-tight">Katalog</h4>
                <span className="text-[12.5px] tabular-nums text-gedaempft">
                  {codes} {codes === 1 ? 'Code' : 'Codes'}
                </span>
                <div className="ml-auto">{umschalter}</div>
              </div>
              <TextArea
                mono
                value={k.eintraege}
                onChange={(v) => onAendern({ eintraege: v })}
                placeholder={PLATZHALTER}
                rows={Math.min(Math.max(textZeilen + 1, 8), 22)}
                spellCheck={false}
                aria-label={`Katalog der Kategorie ${titel} als Text`}
                style={{ tabSize: 8 }}
              />
              <p className="text-[11.5px] text-gedaempft">
                Je Zeile Code und Bezeichnung, getrennt durch Tabulator (aus Excel einfügen), „ – “ oder zwei Leerzeichen;
                „# Überschrift“ beginnt eine Gruppe, eine Zeile ohne Code ist eine Erläuterung.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
