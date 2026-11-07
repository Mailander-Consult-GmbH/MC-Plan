/**
 * Rahmen der Leistungsnachweise: Seitenleiste, Kopfzeile, Hinweise (nach einem
 * Ladefehler, ohne Anmeldung) und Auswahl der Ansicht. Der Excel-Import ist
 * projektübergreifend und öffnet sich aus der Seitenleiste und der Übersicht.
 *
 * Unten in der Seitenleiste „Angemeldet als“ – Name und Farbmodus gelten in
 * allen Bereichen (src/gemeinsam/AngemeldetAls.tsx). Die Anmeldung als
 * Mitarbeiter (components/AnmeldeDialog.tsx) wird hier bereitgestellt: Jede
 * Ansicht kann sie öffnen – „Leistung erfassen“ und „Excel-Import“ führen ohne
 * Anmeldung zuerst dorthin. Im Bereich werden nur Leistungen erfasst; alles
 * Übrige – Leistungsnachweise, Projekteinstellungen, Auswertung, Abschluss,
 * Export, Mitarbeiter – liegt im Controlling-Bereich von KaPlan
 * (controlling.tsx); Adressen dorthin lenkt der Bereich um.
 */
import { useCallback, useEffect, useState } from 'react';
import { Icon, type IconName } from '../../shared/icons';
import { KaPlanLogo, MailaenderLogo } from '../../shared/logos';
import { useToast } from '../../shared/toast';
import { Callout, Card, ConfirmDialog, EmptyState } from '../../shared/ui';
import { BereichWechsel } from '../../shell/BereichWechsel';
import { AngemeldetAls } from '../../gemeinsam/AngemeldetAls';
import { useArchivierte, useMarkiertAnderswo } from '../../gemeinsam/ProjektBereiche';
import { AnmeldeDialog, AnmeldeHinweis, AnmeldungBereitstellen, type AnmeldungOeffnen } from './components/AnmeldeDialog';
import { ImportDialog } from './components/ImportDialog';
import { SpeicherHinweis } from './components/SpeicherHinweis';
import { SicherungEinspielenDialog, SicherungKnopf, SicherungWaehlen, type Sicherung } from './components/Sicherung';
import { angemeldet } from './domain/rechte';
import { projektTitel, type Projekt } from './domain/types';
import { istControllingRoute, routeToHash, useRoute, type Route } from './lib/router';
import { useNachObenBeiSeitenwechsel } from '../../shared/scrollen';
import { useSeitenleiste } from '../../shared/seitenleiste';
import { ProjektDetail } from './pages/ProjektDetail';
import { Projekte } from './pages/Projekte';
import { Uebersicht, sichtbareProjekte } from './pages/Uebersicht';
import { rohdatenHerunterladen } from './store/storage';
import { useStore } from './store/store';

export function App() {
  const { data, ladeZustand, zuruecksetzen } = useStore();
  const toast = useToast();
  const [route, navigate] = useRoute();
  const [menuOffen, setMenuOffen] = useSeitenleiste();
  const [anmeldung, setAnmeldung] = useState<{ danach?: () => void } | null>(null);
  const [zuruecksetzenDialog, setZuruecksetzenDialog] = useState(false);
  const [sicherung, setSicherung] = useState<Sicherung | null>(null);
  const [importOffen, setImportOffen] = useState(false);

  const archiviert = useArchivierte('leistungsnachweise');
  const anderswo = useMarkiertAnderswo('leistungsnachweise');
  const markierte = sichtbareProjekte(data.projekte, archiviert, anderswo);
  const aktiveAnzahl = data.projekte.filter((p) => !archiviert.has(p.id)).length;
  const projekt = route.view === 'projekt' ? data.projekte.find((p) => p.id === route.projektId) : undefined;
  const ich = angemeldet(data);

  // Controlling-Adressen (auch frühere unter #/leistungsnachweise/controlling/…) führen in den Controlling-Bereich
  const controllingAnsicht = istControllingRoute(route);
  useEffect(() => {
    if (controllingAnsicht) window.location.replace(routeToHash(route));
  }, [controllingAnsicht, route]);

  // Eine neue Seite beginnt oben (src/shared/scrollen.ts)
  const inhalt = useNachObenBeiSeitenwechsel<HTMLDivElement>(route.view === 'projekt' ? `projekt/${route.projektId}` : route.view);

  const gehe = (r: Route) => {
    navigate(r);
    setMenuOffen(false);
  };

  // Anmeldedialog – von jeder Ansicht aus (useAnmeldung), mit Fortsetzung nach der Anmeldung
  const anmeldungOeffnen = useCallback<AnmeldungOeffnen>((danach) => {
    setAnmeldung({ danach });
    setMenuOffen(false);
  }, []);

  // Ohne Anmeldung führt der Import zuerst in die Anmeldung
  const importOeffnen = () => {
    setMenuOffen(false);
    if (ich) setImportOffen(true);
    else anmeldungOeffnen(() => setImportOffen(true));
  };

  const farbmodus = data.einstellungen.farbmodus;
  useEffect(() => {
    // Spiegel des gemeinsamen Farbmodus aus „Angemeldet als“ (src/gemeinsam/benutzer.ts),
    // nachgezogen über useBenutzerAbgleich im Store.
    document.documentElement.dataset.farbmodus = farbmodus;
  }, [farbmodus]);

  const kopf = kopfzeile(route, projekt);

  return (
    <AnmeldungBereitstellen value={anmeldungOeffnen}>
      <div className="app ln-app">
        <aside className={`sidebar ${menuOffen ? 'open' : ''}`}>
          <button type="button" className="sidebar-brand" onClick={() => gehe({ view: 'uebersicht' })} title="Zur Übersicht">
            <KaPlanLogo variante="Leistungsnachweise" width="100%" />
          </button>

          <NavItem icon="dashboard" label="Übersicht" aktiv={route.view === 'uebersicht'} onClick={() => gehe({ view: 'uebersicht' })} />
          <NavItem icon="projekt" label="Projekte" aktiv={route.view === 'projekte'} onClick={() => gehe({ view: 'projekte' })} />
          <NavItem
            icon="importieren"
            label="Excel-Import"
            aktiv={false}
            titel={
              ich
                ? 'Eigene Leistungen aus der Zeiterfassung (Excel) übernehmen'
                : 'Leistungen aus der Zeiterfassung (Excel) übernehmen – zuerst anmelden'
            }
            onClick={importOeffnen}
          />
          <div className="nav-group-label">
            Projekte
            {markierte.length < aktiveAnzahl ? <span className="tertiary"> (markierte)</span> : null}
          </div>
          {markierte.map((p) => (
            <NavItem
              key={p.id}
              icon="stunden"
              label={projektTitel(p)}
              aktiv={projekt?.id === p.id}
              onClick={() => gehe({ view: 'projekt', projektId: p.id })}
            />
          ))}

          <div className="sidebar-footer">
            <AngemeldetAls hinweis="Unter diesem Namen erfassen Sie Ihre Leistungen – er muss dem Namen eines Mitarbeiters entsprechen (Vor- und Nachname). Fehlt die Person, lässt sie sich im Bereich als Mitarbeiter anlegen." />
            {ich ? null : (
              <button type="button" className="link-btn ln-anmeldung-link" onClick={() => anmeldungOeffnen()}>
                Nicht als Mitarbeiter angemeldet – anmelden
              </button>
            )}
            <div className="sicherung-knoepfe">
              <SicherungKnopf />
              <SicherungWaehlen onGelesen={setSicherung} />
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => setZuruecksetzenDialog(true)}
                disabled={ladeZustand === 'neuere_fassung'}
                title={
                  ladeZustand === 'neuere_fassung'
                    ? 'Gesperrt, damit der Stand aus der neueren Fassung erhalten bleibt'
                    : undefined
                }
              >
                Zurücksetzen
              </button>
            </div>
            Daten werden lokal im Browser gespeichert.
            <BereichWechsel />
          </div>
        </aside>

        <main className="main">
          <header className="topbar">
            <button type="button" className="btn-icon menu-toggle" onClick={() => setMenuOffen((o) => !o)} aria-label="Menü">
              <Icon name="menu" size={18} />
            </button>
            <div className="topbar-title">
              <h1>{kopf.titel}</h1>
              {kopf.sub ? <div className="sub">{kopf.sub}</div> : null}
            </div>
            <div className="topbar-logo">
              <MailaenderLogo height={34} />
            </div>
          </header>

          <div className="content" ref={inhalt}>
            <div className="content-inner">
              <LadeHinweis />
              <SpeicherHinweis />
              <AnmeldeHinweis daten={data} />
              {route.view === 'uebersicht' ? <Uebersicht navigate={gehe} onImport={importOeffnen} /> : null}
              {route.view === 'projekte' ? <Projekte navigate={gehe} /> : null}
              {route.view === 'projekt' ? (
                projekt ? (
                  <ProjektDetail key={projekt.id} projekt={projekt} navigate={gehe} />
                ) : (
                  <NichtGefunden label="Zu den Projekten" onZurueck={() => gehe({ view: 'projekte' })} />
                )
              ) : null}
            </div>
          </div>
        </main>

        {menuOffen ? (
          <div className="overlay" style={{ background: 'rgba(0,0,0,0.18)', zIndex: 80 }} onClick={() => setMenuOffen(false)} />
        ) : null}

        {importOffen ? <ImportDialog onClose={() => setImportOffen(false)} navigate={gehe} /> : null}

        {sicherung ? (
          <SicherungEinspielenDialog
            sicherung={sicherung}
            onClose={() => setSicherung(null)}
            onEingespielt={() => gehe({ view: 'uebersicht' })}
          />
        ) : null}

        {zuruecksetzenDialog ? (
          <ConfirmDialog
            titel="Daten zurücksetzen?"
            text="Alle lokal gespeicherten Projekte, Mitarbeiter, Leistungen und Leistungsnachweise dieses Bereichs werden verworfen und der Demodatenbestand wird neu geladen. Die anderen Bereiche bleiben unberührt."
            bestaetigenLabel="Zurücksetzen"
            onConfirm={() => {
              zuruecksetzen();
              toast('Demodaten wiederhergestellt.');
              gehe({ view: 'uebersicht' });
            }}
            onClose={() => setZuruecksetzenDialog(false)}
          />
        ) : null}

        {/* Zuletzt, damit die Anmeldung über einem offenen Dialog liegt */}
        {anmeldung ? (
          <AnmeldeDialog
            onClose={() => setAnmeldung(null)}
            onAngemeldet={anmeldung.danach}
          />
        ) : null}
      </div>
    </AnmeldungBereitstellen>
  );
}

/**
 * Hinweis über dem Inhalt, solange der gespeicherte Stand nicht geladen werden
 * konnte oder aus einer neueren Fassung stammt. Der Bereich zeigt dann
 * Demodaten und speichert nichts (store/storage.ts `ladeDaten`).
 */
function LadeHinweis() {
  const { ladeZustand, zuruecksetzen } = useStore();
  const toast = useToast();
  const [neuBeginnen, setNeuBeginnen] = useState(false);

  if (ladeZustand === 'ok') return null;

  const gespeichertHerunterladen = () => {
    if (!rohdatenHerunterladen()) toast('Es ist kein gespeicherter Stand vorhanden, der sich herunterladen ließe.');
  };

  return (
    <div className="ln-ladehinweis" role="alert">
      {ladeZustand === 'ladefehler' ? (
        <Callout ton="error" icon="!">
          <strong>Der gespeicherte Stand ließ sich nicht laden.</strong> Angezeigt werden Demodaten. Damit der gespeicherte
          Stand erhalten bleibt, wird nichts gespeichert – bitte herunterladen und aufbewahren.
          <div className="row wrap ln-ladehinweis-knoepfe">
            <button type="button" className="btn btn-sm btn-outline" onClick={gespeichertHerunterladen}>
              Gespeicherten Stand herunterladen
            </button>
            <button type="button" className="btn btn-sm btn-outline" onClick={() => setNeuBeginnen(true)}>
              Mit Demodaten neu beginnen
            </button>
          </div>
        </Callout>
      ) : (
        <Callout ton="warn" icon="!">
          <strong>Die gespeicherten Daten stammen aus einer neueren Fassung von KaPlan.</strong> Diese Seite zeigt Demodaten
          und speichert nichts, damit der neuere Stand erhalten bleibt. Bitte die Seite neu laden.
          <div className="row wrap ln-ladehinweis-knoepfe">
            <button type="button" className="btn btn-sm btn-outline" onClick={() => window.location.reload()}>
              Seite neu laden
            </button>
          </div>
        </Callout>
      )}
      {neuBeginnen ? (
        <ConfirmDialog
          titel="Mit Demodaten neu beginnen?"
          text="Der gespeicherte, nicht lesbare Stand wird durch die Demodaten ersetzt. Wer ihn noch braucht, lädt ihn vorher herunter."
          bestaetigenLabel="Neu beginnen"
          onConfirm={() => {
            zuruecksetzen();
            toast('Mit Demodaten neu begonnen.');
          }}
          onClose={() => setNeuBeginnen(false)}
        />
      ) : null}
    </div>
  );
}

function NavItem({
  icon,
  label,
  aktiv,
  titel,
  onClick,
}: {
  icon: IconName;
  label: string;
  aktiv: boolean;
  /** Tooltip; ohne Angabe die Beschriftung. */
  titel?: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className={`nav-item ${aktiv ? 'active' : ''}`} onClick={onClick} title={titel ?? label}>
      <span className="nav-icon">
        <Icon name={icon} size={16} />
      </span>
      <span className="nav-label">{label}</span>
    </button>
  );
}

function NichtGefunden({ label, onZurueck }: { label: string; onZurueck: () => void }) {
  return (
    <Card>
      <EmptyState
        icon="projekt"
        titel="Nicht gefunden"
        text="Das aufgerufene Projekt existiert nicht (mehr) – etwa weil es gelöscht wurde."
        action={
          <button type="button" className="btn btn-primary" onClick={onZurueck}>
            {label}
          </button>
        }
      />
    </Card>
  );
}

function kopfzeile(route: Route, projekt?: Projekt): { titel: string; sub?: string } {
  switch (route.view) {
    case 'uebersicht':
      return { titel: 'Übersicht', sub: 'Eigene Leistungen erfassen und übernehmen' };
    case 'projekte':
      return { titel: 'Projekte', sub: 'Projekte, in denen Leistungen erfasst werden' };
    case 'projekt':
      return { titel: projekt?.name ?? 'Projekt', sub: 'Eigene Leistungen im Projekt' };
    default:
      // Controlling-Ansichten werden sofort in den Controlling-Bereich umgelenkt
      return { titel: 'Controlling' };
  }
}
