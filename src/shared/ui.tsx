/** Wiederverwendbare Oberflächenbausteine im hellen Apple-Stil. */
import { useEffect, useId, useRef, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import { Icon } from './icons';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>;
}

export function CardHeader({
  titel,
  sub,
  actions,
}: {
  titel: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="card-header">
      <div style={{ minWidth: 0 }}>
        <h2>{titel}</h2>
        {sub ? <div className="sub">{sub}</div> : null}
      </div>
      {actions ? <div className="row">{actions}</div> : null}
    </div>
  );
}

export function Stat({
  wert,
  label,
  ton = '',
  onClick,
}: {
  wert: ReactNode;
  label: string;
  ton?: '' | 'red' | 'orange' | 'green' | 'blue';
  onClick?: () => void;
}) {
  const inhalt = (
    <div className={`stat ${ton}`}>
      <div className="stat-value">{wert}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
  if (onClick) {
    return (
      <button type="button" className="card card-click" onClick={onClick}>
        {inhalt}
      </button>
    );
  }
  return <div className="card">{inhalt}</div>;
}

export function Badge({
  children,
  ton = '',
}: {
  children: ReactNode;
  ton?: '' | 'green' | 'orange' | 'red' | 'blue' | 'purple' | 'gelb';
}) {
  return <span className={`badge ${ton}`}>{children}</span>;
}

export function Field({
  label,
  hint,
  children,
  full = false,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  full?: boolean;
}) {
  return (
    <div className={`field ${full ? 'full' : ''}`}>
      <label>{label}</label>
      {children}
      {hint ? <span className="hint">{hint}</span> : null}
    </div>
  );
}

export function TextInput({
  value,
  onChange,
  ...rest
}: {
  value: string;
  onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return (
    <input
      className="input"
      value={value}
      onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      {...rest}
    />
  );
}

export function TextArea({
  value,
  onChange,
  mono = false,
  inputRef,
  ...rest
}: {
  value: string;
  onChange: (v: string) => void;
  mono?: boolean;
  /** Zugriff auf das Feld, etwa um an der Schreibmarke einzufügen. */
  inputRef?: React.Ref<HTMLTextAreaElement>;
} & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'>) {
  return (
    <textarea
      ref={inputRef}
      className={`textarea ${mono ? 'mono' : ''}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      {...rest}
    />
  );
}

export function Select({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <select className="select" value={value} onChange={(e) => onChange(e.target.value)}>
      {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="segmented">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={o.value === value ? 'active' : ''}
          // Für Bildschirmleser: welche Wahl gerade gilt
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Macht ein Element, das sonst nur auf Klicks hört (etwa die Ablagefläche
 * `.drop-zone` der Import-Dialoge), auch per Tastatur bedienbar: Tab-Halt,
 * Rolle „button“, Enter und Leertaste lösen `aktion` aus wie ein Klick.
 */
export function alsKnopf(aktion: () => void) {
  return {
    role: 'button',
    tabIndex: 0,
    onClick: aktion,
    onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
      if (e.target !== e.currentTarget || (e.key !== 'Enter' && e.key !== ' ')) return;
      e.preventDefault();
      aktion();
    },
  };
}

export function Search({
  value,
  onChange,
  placeholder = 'Suchen',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="search">
      <span style={{ display: 'flex', color: 'var(--text-tertiary)' }}>
        <Icon name="suche" size={14} />
      </span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      {value ? (
        <button type="button" className="btn-icon" onClick={() => onChange('')} aria-label="Suche leeren">
          ✕
        </button>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dialoge: Fokus beim Öffnen, Tab-Reihenfolge, Escape, Fokus zurück   */
/* ------------------------------------------------------------------ */

interface OffenerDialog {
  /** Das Element mit `role="dialog"`. */
  dialog: HTMLElement;
  schliessen: () => void;
}

/** Offene Dialoge in der Reihenfolge des Öffnens. */
const offeneDialoge: OffenerDialog[] = [];

/**
 * Wohin der Fokus nach dem Schließen eines Dialogs zurückgeht – je Dialog die
 * Kandidaten in absteigender Wahl (der erste, der noch im Dokument steht).
 */
const fokusZurueck = new WeakMap<Element, HTMLElement[]>();

/**
 * Der oberste offene Dialog: der zuletzt geöffnete – außer ein anderer offener
 * Dialog steht in ihm (ein verschachtelter Dialog liegt immer über seinem).
 */
function obersterDialog(): OffenerDialog | undefined {
  for (let i = offeneDialoge.length - 1; i >= 0; i--) {
    const d = offeneDialoge[i];
    if (!offeneDialoge.some((x) => x !== d && d.dialog.contains(x.dialog))) return d;
  }
  return undefined;
}

const FOKUSSIERBAR =
  'a[href], area[href], button, input, select, textarea, iframe, summary, [tabindex], [contenteditable=""], [contenteditable="true"]';

/** Was sich in `wurzel` mit Tab erreichen lässt, in Dokumentreihenfolge. */
function tabHalte(wurzel: HTMLElement): HTMLElement[] {
  const alle = Array.from(wurzel.querySelectorAll<HTMLElement>(FOKUSSIERBAR)).filter(
    (el) =>
      el.tabIndex >= 0 &&
      !el.matches(':disabled') &&
      !(el instanceof HTMLInputElement && el.type === 'hidden') &&
      !el.closest('[inert]') &&
      el.getClientRects().length > 0 &&
      getComputedStyle(el).visibility !== 'hidden',
  );
  // Optionsfelder einer Gruppe sind ein einziger Tab-Halt: das gewählte, sonst das erste
  return alle.filter((el) => {
    if (!(el instanceof HTMLInputElement) || el.type !== 'radio' || !el.name) return true;
    const gruppe = alle.filter(
      (x): x is HTMLInputElement => x instanceof HTMLInputElement && x.type === 'radio' && x.name === el.name && x.form === el.form,
    );
    return el === (gruppe.find((x) => x.checked) ?? gruppe[0]);
  });
}

/**
 * Felder, in die man etwas einträgt oder aus denen man wählt: Text-, Zahl- und
 * Datumsfelder, Auswahllisten. Kästchen, Optionsfelder und Knöpfe zählen nicht –
 * ein Tastendruck wirkt dort sofort.
 */
const eingabeFeld = (el: HTMLElement) =>
  el instanceof HTMLSelectElement ||
  el instanceof HTMLTextAreaElement ||
  el.isContentEditable ||
  (el instanceof HTMLInputElement &&
    !['checkbox', 'radio', 'button', 'submit', 'reset', 'image', 'file', 'range', 'color'].includes(el.type));

/**
 * Ob `el` ganz im sichtbaren Teil von `inhalt` steht, ohne dass etwas scrollen
 * müsste – auch während der Einblendung, die den Dialog noch verkleinert zeigt.
 */
function ganzSichtbar(el: HTMLElement, inhalt: HTMLElement): boolean {
  const r = el.getBoundingClientRect();
  const b = inhalt.getBoundingClientRect();
  const massstab = inhalt.offsetHeight > 0 ? b.height / inhalt.offsetHeight : 1;
  const oben = (r.top - b.top) / massstab;
  const unten = (r.bottom - b.top) / massstab;
  return oben >= inhalt.clientTop - 1 && unten <= inhalt.clientTop + inhalt.clientHeight + 1;
}

/**
 * Fokus beim Öffnen: das erste Eingabefeld des Inhalts (`eingabeFeld`), wenn es
 * ohne Scrollen zu sehen ist – sonst der Dialog selbst, damit man oben zu lesen
 * beginnt und kein Knopf mit sofortiger Wirkung den Fokus hat. Auf
 * Touch-Geräten immer der Dialog selbst: Der Fokus soll dort weder ungefragt
 * die Bildschirmtastatur aufklappen noch den Inhalt verschieben. Gescrollt
 * wird beim Fokussieren nie. Auch einen eigenen Dialog eines Bereichs kann
 * es treffen – wenn ein `Modal` über ihm schließt und sein Öffner fehlt –; der
 * Workflow-Editor trägt dafür ebenfalls `tabIndex={-1}`, einer ohne `tabindex`
 * ließe sich selbst nicht fokussieren – dort gälte sein erster Tab-Halt.
 */
function anfangsFokus(dialog: HTMLElement) {
  const inhalt = dialog.querySelector<HTMLElement>('.modal-body') ?? dialog;
  const touch = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  const feld = touch ? undefined : tabHalte(inhalt).find(eingabeFeld);
  const ziel = feld && ganzSichtbar(feld, inhalt) ? feld : dialog.hasAttribute('tabindex') ? dialog : tabHalte(dialog)[0];
  ziel?.focus({ preventScroll: true });
}

/**
 * Wo der Fokus vor dem Öffnen stand – gelesen beim ersten Rendern, bevor
 * `autoFocus` ihn verschiebt. Kam die Wahl aus einem Aufklappmenü
 * (`AufklappMenue`, verschwindet mit der Wahl), gilt der Knopf, an dem es
 * hängt. Steht der Fokus in einem anderen Dialog, der womöglich gleich
 * schließt, folgen dessen Kandidaten als Ersatz.
 */
function fokusVorDemOeffnen(): HTMLElement[] {
  const aktiv = document.activeElement;
  if (!(aktiv instanceof HTMLElement) || aktiv === document.body) return [];
  const knopf = aktiv.closest('[role="menu"]')
    ? document.querySelector<HTMLElement>('[aria-haspopup="menu"][aria-expanded="true"]')
    : aktiv;
  if (!knopf) return [];
  const eltern = knopf.closest('[role="dialog"]');
  return [knopf, ...((eltern && fokusZurueck.get(eltern)) || [])];
}

/** Tab und Umschalt+Tab bleiben im obersten Dialog. */
function fokusHalten(e: KeyboardEvent, dialog: HTMLElement) {
  const aktiv = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const drin = !!aktiv && dialog.contains(aktiv);
  // Ein Aufklappmenü (per Portal außerhalb des Dialogs) regelt Tab selbst
  if (!drin && aktiv?.closest('[role="menu"]')) return;
  const liste = tabHalte(dialog);
  let ziel: HTMLElement | undefined;
  if (liste.length === 0) ziel = dialog;
  else if (!drin || !aktiv) ziel = e.shiftKey ? liste[liste.length - 1] : liste[0];
  else if (e.shiftKey) {
    if (!liste.some((el) => aktiv.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING)) ziel = liste[liste.length - 1];
  } else if (!liste.some((el) => aktiv.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)) ziel = liste[0];
  if (!ziel) return;
  e.preventDefault();
  ziel.focus();
}

/**
 * Tasten für alle offenen Dialoge, am `window` in der Bubble-Phase – was ein
 * Feld oder Menü im Dialog selbst behandelt (stopPropagation bzw.
 * preventDefault), erreicht sie nicht. Escape schließt nur den obersten.
 */
function dialogTaste(e: KeyboardEvent) {
  if (e.defaultPrevented || e.isComposing) return;
  const oben = obersterDialog();
  if (!oben || (e.key !== 'Escape' && e.key !== 'Tab')) return;
  // Liegt ein eigener Dialog eines Bereichs darüber (etwa der Workflow-Editor, per Portal
  // später im Dokument), regelt er die Tasten selbst
  const fremdDarueber = Array.from(document.querySelectorAll('[role="dialog"][aria-modal="true"]')).some(
    (d) =>
      !offeneDialoge.some((o) => o.dialog === d) &&
      !d.contains(oben.dialog) &&
      !!(oben.dialog.compareDocumentPosition(d) & Node.DOCUMENT_POSITION_FOLLOWING),
  );
  if (fremdDarueber) return;
  if (e.key === 'Escape') {
    e.preventDefault();
    oben.schliessen();
  } else if (e.key === 'Tab') fokusHalten(e, oben.dialog);
}

function dialogAnmelden(d: OffenerDialog) {
  if (offeneDialoge.length === 0) window.addEventListener('keydown', dialogTaste);
  offeneDialoge.push(d);
}

function dialogAbmelden(d: OffenerDialog) {
  const i = offeneDialoge.indexOf(d);
  if (i >= 0) offeneDialoge.splice(i, 1);
  if (offeneDialoge.length === 0) window.removeEventListener('keydown', dialogTaste);
}

/**
 * Dialog über der Seite. Beim Öffnen erhält er den Fokus (ein Feld mit
 * `autoFocus` behält ihn, sonst `anfangsFokus`), Tab bleibt in ihm, Escape
 * und ein Klick daneben schließen ihn – bei verschachtelten Dialogen nur den
 * obersten –, und nach dem Schließen geht der Fokus dorthin zurück, wo er
 * vorher stand, sofern das Element noch im Dokument ist. Mit
 * `klickDanebenSchliesst={false}` schließt ein Klick daneben nicht – für
 * Dialoge mit aufwendiger Auswahl (etwa „Sicherung abgleichen“); `klasse`
 * ergänzt die Klassen des Dialogs.
 */
export function Modal({
  titel,
  sub,
  children,
  footer,
  onClose,
  wide = false,
  klickDanebenSchliesst = true,
  klasse,
}: {
  titel: ReactNode;
  sub?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  wide?: boolean;
  klickDanebenSchliesst?: boolean;
  klasse?: string;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titelId = useId();
  const schliessen = useRef(onClose);
  schliessen.current = onClose;
  const [zurueck] = useState(fokusVorDemOeffnen);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const eintrag: OffenerDialog = { dialog, schliessen: () => schliessen.current() };
    dialogAnmelden(eintrag);
    fokusZurueck.set(dialog, zurueck);
    // Die Effekte der Inhalte (und autoFocus) liefen schon – steht der Fokus drin, bleibt er dort
    if (!dialog.contains(document.activeElement)) anfangsFokus(dialog);
    // Verschwindet das fokussierte Element aus dem Dialog (etwa ein Knopf, der sich mit dem
    // Druck erledigt), fiele der Fokus auf body – er bleibt im Dialog. Schließt gerade ein
    // Dialog in ihm, ist dieser noch der oberste und gibt den Fokus selbst zurück.
    const beobachter = new MutationObserver(() => {
      const aktiv = document.activeElement;
      if ((!aktiv || aktiv === document.body) && obersterDialog() === eintrag) dialog.focus({ preventScroll: true });
    });
    beobachter.observe(dialog, { childList: true, subtree: true });
    return () => {
      beobachter.disconnect();
      dialogAbmelden(eintrag);
      // Steht der Dialog noch im Dokument, spielt StrictMode das Schließen nur durch
      if (dialog.isConnected) return;
      const aktiv = document.activeElement;
      // Hat beim Schließen schon jemand anderes den Fokus gesetzt, bleibt er dort
      if (aktiv && aktiv !== document.body && aktiv.isConnected) return;
      const ziel = zurueck.find((el) => el.isConnected);
      // Ist noch (oder schon) ein Dialog offen – der oberste steht zuletzt im Dokument –,
      // gehört der Fokus in ihn: etwa wenn ein Dialog den anderen ablöst
      const offen = document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]');
      const oben = offen[offen.length - 1];
      if (oben && !(ziel && oben.contains(ziel))) anfangsFokus(oben);
      else ziel?.focus({ preventScroll: true });
    };
  }, [zurueck]);

  return (
    <div
      className="overlay"
      // Eine Spalte mit fester Breite: Sonst wüchse sie mit breitem Inhalt (etwa der
      // Vorschautabelle eines Imports) und der Dialog liefe auf schmalen Bildschirmen über
      style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}
      onMouseDown={(e) => {
        if (e.target !== e.currentTarget) return;
        // Ohne preventDefault setzte der Browser den Fokus auf body – nach dem Schließen
        // gehört er an das Element, von dem der Dialog kam, sonst bleibt er im Dialog
        e.preventDefault();
        if (klickDanebenSchliesst) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className={['modal', wide ? 'wide' : '', klasse ?? ''].filter(Boolean).join(' ')}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titelId}
        tabIndex={-1}
        style={{ outline: 'none' }}
      >
        <div className="modal-header">
          <div style={{ minWidth: 0 }}>
            <h2 id={titelId}>{titel}</h2>
            {sub ? <div className="sub">{sub}</div> : null}
          </div>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Schließen">
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-footer">{footer}</div> : null}
      </div>
    </div>
  );
}

export function EmptyState({
  icon = 'plan',
  titel,
  text,
  action,
}: {
  icon?: string;
  titel: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon" style={{ display: 'flex', justifyContent: 'center' }}>
        <Icon name={icon} size={30} strokeWidth={1.3} />
      </div>
      <h3>{titel}</h3>
      {text ? <p>{text}</p> : null}
      {action}
    </div>
  );
}

/** Fortschrittsbalken. Immer in der Hausfarbe – der Status steht daneben. */
export function Progress({ wert }: { wert: number }) {
  return (
    <div className="progress" title={`${wert}%`}>
      <div style={{ width: `${Math.min(100, Math.max(0, wert))}%` }} />
    </div>
  );
}

export function Avatar({ name, farbe }: { name: string; farbe?: string }) {
  const initialen = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((t) => t[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <div
      className="avatar"
      style={farbe ? { background: `${farbe}1f`, color: farbe } : undefined}
      title={name}
    >
      {initialen || '?'}
    </div>
  );
}

export function Callout({
  ton = '',
  icon = 'ℹ︎',
  role,
  children,
}: {
  ton?: '' | 'warn' | 'error';
  icon?: string;
  /** „alert“ für Hinweise, die erst auf eine Handlung hin erscheinen – Bildschirmleser lesen sie dann vor. */
  role?: 'alert' | 'status';
  children: ReactNode;
}) {
  return (
    <div className={`callout ${ton}`} role={role}>
      <span className="callout-icon">{icon}</span>
      <div>{children}</div>
    </div>
  );
}

export function ConfirmDialog({
  titel,
  text,
  bestaetigenLabel = 'Löschen',
  abbrechenLabel = 'Abbrechen',
  ton = 'rot',
  onConfirm,
  onClose,
}: {
  titel: string;
  text: string;
  bestaetigenLabel?: string;
  abbrechenLabel?: string;
  /** „rot“ für Löschvorgänge, „blau“ für gewöhnliche Rückfragen. */
  ton?: 'rot' | 'blau';
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      titel={titel}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            {abbrechenLabel}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            style={ton === 'rot' ? { background: 'var(--red)' } : undefined}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {bestaetigenLabel}
          </button>
        </>
      }
    >
      <p className="muted">{text}</p>
    </Modal>
  );
}
