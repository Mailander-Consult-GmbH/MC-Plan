/**
 * Rahmen der Baubetriebsplanung: Seitenleiste, Kopfzeile und Auswahl der
 * Ansicht. Zwischen „Projekte“ und „Einstellungen“ steht der Import aus
 * BBPNeo; Workflows und Fristen stehen – wie im Planlaufmanagement – unter
 * der aufklappbaren Gruppe „Einstellungen“.
 */
import { useEffect, useState } from 'react';
import { Icon, type IconName } from '../../shared/icons';
import { KaPlanLogo, MailaenderLogo } from '../../shared/logos';
import { useToast } from '../../shared/toast';
import { Card, ConfirmDialog, EmptyState } from '../../shared/ui';
import { useNachObenBeiSeitenwechsel } from '../../shared/scrollen';
import { useSeitenleiste } from '../../shared/seitenleiste';
import { BereichWechsel } from '../../shell/BereichWechsel';
import { Hinweisleisten } from './components/Hinweisleisten';
import { SicherungEinspielenDialog, SicherungWaehlen, type Sicherung } from './components/Sicherung';
import { ausstehendeErstanmeldungen, offeneTermine } from './domain/fristen';
import { anmeldungBezeichnung } from './domain/workflow';
import { useRoute, type Route } from './lib/router';
import { AnmeldungDetail } from './pages/AnmeldungDetail';
import { BbpImport } from './pages/BbpImport';
import { Fristen } from './pages/Fristen';
import { ProjektDetail } from './pages/ProjektDetail';
import { Projekte } from './pages/Projekte';
import { Termine } from './pages/Termine';
import { Uebersicht, sichtbareProjekte } from './pages/Uebersicht';
import { Workflows } from './pages/Workflows';
import { exportiereDaten, rohdatenHerunterladen } from './store/storage';
import { useStore } from './store/store';
import { useArchivierte } from '../../gemeinsam/ProjektBereiche';
import { AngemeldetAls } from '../../gemeinsam/AngemeldetAls';

export function App() {
  const { data, ladeZustand, zuruecksetzen } = useStore();
  // Ein Stand aus einer neueren Fassung darf weder ersetzt noch zurückgesetzt werden
  const gesperrt = ladeZustand === 'neuere_fassung';
  const gesperrtTitel = 'Gesperrt, damit der Stand aus der neueren Fassung erhalten bleibt';
  const toast = useToast();
  const [route, navigate] = useRoute();
  // Eine neue Seite beginnt oben – ein Reiterwechsel nicht (src/shared/scrollen.ts)
  const inhalt = useNachObenBeiSeitenwechsel<HTMLDivElement>(route.view === 'projekt' ? `projekt/${route.projektId}` : route.view === 'anmeldung' ? `anmeldung/${route.anmeldungId}` : route.view);
  const [menuOffen, setMenuOffen] = useSeitenleiste();
  const inEinstellungen = route.view === 'workflows' || route.view === 'fristen';
  const [einstellungenOffen, setEinstellungenOffen] = useState(inEinstellungen);
  // Wer eine der Seiten unter „Einstellungen“ aufruft, sieht die Gruppe aufgeklappt
  useEffect(() => {
    if (inEinstellungen) setEinstellungenOffen(true);
  }, [inEinstellungen]);
  const [zuruecksetzenDialog, setZuruecksetzenDialog] = useState(false);
  const [sicherung, setSicherung] = useState<Sicherung | null>(null);

  const archiviert = useArchivierte('baubetrieb');
  const markierte = sichtbareProjekte(data.projekte, archiviert);
  const aktiveAnzahl = data.projekte.filter((p) => !archiviert.has(p.id)).length;
  const termine = offeneTermine(data);
  // Überfällig: Terminfristen der Anmeldungen und ausstehende Erstanmeldungen
  const ueberfaellig = [...termine, ...ausstehendeErstanmeldungen(data)].filter((t) => t.ampel === 'ueberfaellig');
  const projekt =
    route.view === 'projekt' || route.view === 'anmeldung'
      ? data.projekte.find((p) => p.id === route.projektId)
      : undefined;
  const anmeldung =
    route.view === 'anmeldung' ? data.anmeldungen.find((a) => a.id === route.anmeldungId) : undefined;

  const gehe = (r: Route) => {
    navigate(r);
    setMenuOffen(false);
  };

  const farbmodus = data.einstellungen.farbmodus;
  useEffect(() => {
    // Spiegel des gemeinsamen Farbmodus aus „Angemeldet als“ (src/gemeinsam/benutzer.ts),
    // nachgezogen über useBenutzerAbgleich im Store.
    document.documentElement.dataset.farbmodus = farbmodus;
  }, [farbmodus]);

  const kopf = kopfzeile(route, projekt?.name, anmeldung ? anmeldungBezeichnung(anmeldung) : undefined);

  return (
    <div className="app">
      <aside className={`sidebar ${menuOffen ? 'open' : ''}`}>
        <button
          type="button"
          className="sidebar-brand"
          onClick={() => gehe({ view: 'uebersicht' })}
          title="Zur Übersicht"
        >
          <KaPlanLogo variante="Baubetriebsplanung" width="100%" />
        </button>

        <NavItem icon="dashboard" label="Übersicht" aktiv={route.view === 'uebersicht'} onClick={() => gehe({ view: 'uebersicht' })} />
        <NavItem
          icon="frist"
          label="Termine & Nachhaken"
          aktiv={route.view === 'termine'}
          badge={ueberfaellig.length > 0 ? String(ueberfaellig.length) : undefined}
          badgeAlarm
          onClick={() => gehe({ view: 'termine' })}
        />
        <NavItem icon="projekt" label="Projekte" aktiv={route.view === 'projekte'} onClick={() => gehe({ view: 'projekte' })} />
        <NavItem
          icon="importieren"
          label="Import aus BBPNeo"
          aktiv={route.view === 'import'}
          onClick={() => gehe({ view: 'import' })}
        />
        {/* Workflows und Fristen gebündelt unter „Einstellungen“ */}
        <NavItem
          icon="einstellungen"
          label="Einstellungen"
          aktiv={false}
          offen={einstellungenOffen}
          onClick={() => setEinstellungenOffen((o) => !o)}
        />
        {einstellungenOffen ? (
          <>
            <NavItem unter icon="kette" label="Workflows" aktiv={route.view === 'workflows'} onClick={() => gehe({ view: 'workflows' })} />
            <NavItem unter icon="kalender" label="Fristen" aktiv={route.view === 'fristen'} onClick={() => gehe({ view: 'fristen' })} />
          </>
        ) : null}

        <div className="nav-group-label">
          Projekte
          {markierte.length < aktiveAnzahl ? <span className="tertiary"> (markierte)</span> : null}
        </div>
        {markierte.map((p) => {
          const spaet = ueberfaellig.filter((t) => t.projekt.id === p.id).length;
          return (
            <NavItem
              key={p.id}
              icon="projekt"
              label={p.name}
              aktiv={projekt?.id === p.id}
              badge={spaet > 0 ? String(spaet) : undefined}
              badgeAlarm
              onClick={() => gehe({ view: 'projekt', projektId: p.id })}
            />
          );
        })}

        <div className="sidebar-footer">
          <AngemeldetAls hinweis="Erscheint im Statusverlauf jeder Anmeldung bei den Wechseln, die Sie erfassen, und als Hauptbearbeiter neuer Projekte." />
          <div className="sicherung-knoepfe">
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={() => {
                // Nach einem Lade- oder Fassungsfehler zeigt die Seite nur Demodaten –
                // gesichert wird dann der gespeicherte Stand, unverändert.
                if (ladeZustand === 'ok') exportiereDaten(data);
                else if (!rohdatenHerunterladen())
                  toast('Es ist kein gespeicherter Stand vorhanden, der sich herunterladen ließe.');
              }}
              title={
                ladeZustand === 'ok'
                  ? 'Gesamten Datenbestand der Baubetriebsplanung als JSON sichern'
                  : 'Gespeicherten Stand unverändert herunterladen'
              }
            >
              <Icon name="export" size={12} /> Sicherung
            </button>
            {gesperrt ? (
              <button type="button" className="btn btn-sm btn-outline" disabled title={gesperrtTitel}>
                <Icon name="importieren" size={12} /> Einspielen
              </button>
            ) : (
              <SicherungWaehlen onGelesen={setSicherung} />
            )}
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={() => setZuruecksetzenDialog(true)}
              disabled={gesperrt}
              title={gesperrt ? gesperrtTitel : undefined}
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
            <Hinweisleisten />
            {route.view === 'uebersicht' ? <Uebersicht navigate={gehe} /> : null}
            {route.view === 'termine' ? <Termine navigate={gehe} /> : null}
            {route.view === 'projekte' ? <Projekte navigate={gehe} /> : null}
            {route.view === 'import' ? <BbpImport navigate={gehe} /> : null}
            {route.view === 'workflows' ? <Workflows navigate={gehe} /> : null}
            {route.view === 'fristen' ? <Fristen /> : null}
            {route.view === 'projekt' ? (
              projekt ? (
                <ProjektDetail projekt={projekt} navigate={gehe} />
              ) : (
                <NichtGefunden onZurueck={() => gehe({ view: 'projekte' })} />
              )
            ) : null}
            {route.view === 'anmeldung' ? (
              projekt && anmeldung ? (
                <AnmeldungDetail projekt={projekt} anmeldung={anmeldung} navigate={gehe} />
              ) : (
                <NichtGefunden onZurueck={() => gehe({ view: 'projekte' })} />
              )
            ) : null}
          </div>
        </div>
      </main>

      {menuOffen ? (
        <div className="overlay" style={{ background: 'rgba(0,0,0,0.18)', zIndex: 80 }} onClick={() => setMenuOffen(false)} />
      ) : null}


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
          text="Alle lokal gespeicherten Projekte, Anmeldungen und Workflows der Baubetriebsplanung werden verworfen und der Demodatenbestand samt Standard-Workflows wird neu geladen. Das Planlaufmanagement bleibt unberührt."
          bestaetigenLabel="Zurücksetzen"
          onConfirm={() => {
            zuruecksetzen();
            toast('Demodaten wiederhergestellt.');
            gehe({ view: 'uebersicht' });
          }}
          onClose={() => setZuruecksetzenDialog(false)}
        />
      ) : null}
    </div>
  );
}

function NavItem({
  icon,
  label,
  aktiv,
  badge,
  badgeAlarm,
  unter,
  offen,
  onClick,
}: {
  icon: IconName;
  label: string;
  aktiv: boolean;
  badge?: string;
  badgeAlarm?: boolean;
  /** Unterpunkt einer aufklappbaren Gruppe (eingerückt). */
  unter?: boolean;
  /** Nur Gruppen: aufgeklappt? Zeigt den Pfeil. */
  offen?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`nav-item ${aktiv ? 'active' : ''} ${unter ? 'unter' : ''}`}
      onClick={onClick}
      title={label}
      aria-expanded={offen}
    >
      <span className="nav-icon">
        <Icon name={icon} size={16} />
      </span>
      <span className="nav-label">{label}</span>
      {badge ? <span className={`nav-badge ${badgeAlarm ? 'alert' : ''}`}>{badge}</span> : null}
      {offen !== undefined ? (
        <span className={`nav-pfeil ${offen ? 'offen' : ''}`}>
          <Icon name="chevron" size={13} />
        </span>
      ) : null}
    </button>
  );
}

function NichtGefunden({ onZurueck }: { onZurueck: () => void }) {
  return (
    <Card>
      <EmptyState
        icon="projekt"
        titel="Nicht gefunden"
        text="Der aufgerufene Eintrag existiert nicht (mehr) – etwa weil er als Anmeldeleiche gelöscht wurde."
        action={
          <button type="button" className="btn btn-primary" onClick={onZurueck}>
            Zu den Projekten
          </button>
        }
      />
    </Card>
  );
}

function kopfzeile(route: Route, projektName?: string, anmeldungName?: string): { titel: string; sub?: string } {
  switch (route.view) {
    case 'uebersicht':
      return { titel: 'Übersicht', sub: 'Baubetriebliche Anmeldungen für Sperrpausen' };
    case 'termine':
      return { titel: 'Termine & Nachhaken', sub: 'Terminfristen aller Anmeldungen und Anmeldebedarf' };
    case 'projekte':
      return { titel: 'Projekte', sub: 'Je Baumaßnahme ein Projekt mit seinen Anmeldungen' };
    case 'import':
      return { titel: 'Import aus BBPNeo', sub: 'Anmeldungen im KM und KKM aus dem Excel-Export von BBPNeo' };
    case 'workflows':
      return { titel: 'Workflows', sub: 'Status, Terminfristen und Nachfolger je Phase – anpassbar' };
    case 'fristen':
      return { titel: 'Fristen', sub: 'Fristen laut Richtlinie, Ampel und Nachhaken' };
    case 'projekt':
      return { titel: projektName ?? 'Projekt', sub: 'Projekt' };
    case 'anmeldung':
      return { titel: anmeldungName || 'Anmeldung', sub: projektName };
  }
}
