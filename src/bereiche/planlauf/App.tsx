/** Anwendungsrahmen: Seitenleiste, Kopfzeile und Auswahl der Ansicht. */
import { useEffect, useState } from 'react';
import { eigeneTodos, offeneFristen } from './domain/engine';
import { exportiereDaten, rohdatenHerunterladen } from './store/storage';
import { useStore } from './store/store';
import { useRoute, type Route } from './lib/router';
import { useToast } from '../../shared/toast';
import { Dashboard, sichtbareProjekte } from './pages/Dashboard';
import { Fristen } from './pages/Fristen';
import { ProjektDetail } from './pages/ProjektDetail';
import { Projekte } from './pages/Projekte';
import { Workflows } from './pages/Workflows';
import { Funktionen } from './pages/Funktionen';
import { Vorlagen } from './pages/Vorlagen';
import { Terminrechner } from './pages/Terminrechner';
import { PlanlaufDetail } from './pages/projekt/PlanlaufDetail';
import { Card, ConfirmDialog, EmptyState } from '../../shared/ui';
import { EIGENE_ROLLE } from './domain/types';
import { Icon } from '../../shared/icons';
import { KaPlanLogo, MailaenderLogo } from '../../shared/logos';
import { BereichWechsel } from '../../shell/BereichWechsel';
import { SicherungEinspielenDialog, SicherungWaehlen, type Sicherung } from './components/SicherungEinspielen';
import { Hinweisleisten } from './components/Hinweisleisten';
import { useArchivierte } from '../../gemeinsam/ProjektBereiche';
import { AngemeldetAls } from '../../gemeinsam/AngemeldetAls';
import { RegisterHinweis } from '../../gemeinsam/RegisterHinweis';
import type { IconName } from '../../shared/icons';
import { useNachObenBeiSeitenwechsel } from '../../shared/scrollen';
import { useSeitenleiste } from '../../shared/seitenleiste';

export function App() {
  const { data, zuruecksetzen, ladeZustand, setBearbeiter } = useStore();
  const toast = useToast();
  const [route, navigate] = useRoute();
  // Eine neue Seite beginnt oben – ein Reiterwechsel nicht (src/shared/scrollen.ts)
  const inhalt = useNachObenBeiSeitenwechsel<HTMLDivElement>(route.view === 'projekt' ? `projekt/${route.projectId}` : route.view === 'planlauf' ? `planlauf/${route.runId}` : route.view);
  const [menuOffen, setMenuOffen] = useSeitenleiste();
  const inEinstellungen = route.view === 'ketten' || route.view === 'rollen' || route.view === 'vorlagen';
  const [einstellungenOffen, setEinstellungenOffen] = useState(inEinstellungen);
  // Wer eine der Seiten unter „Einstellungen“ aufruft, sieht die Gruppe aufgeklappt
  useEffect(() => {
    if (inEinstellungen) setEinstellungenOffen(true);
  }, [inEinstellungen]);
  const [zuruecksetzenDialog, setZuruecksetzenDialog] = useState(false);
  const [sicherung, setSicherung] = useState<Sicherung | null>(null);

  const archiviert = useArchivierte('planlauf');
  const markierte = sichtbareProjekte(data.projects, archiviert);
  const aktiveAnzahl = data.projects.filter((p) => !archiviert.has(p.id)).length;
  const markierteIds = markierte.map((p) => p.id);
  const todos = eigeneTodos(data, markierteIds).length;
  const projekt =
    route.view === 'projekt' || route.view === 'planlauf'
      ? data.projects.find((p) => p.id === route.projectId)
      : undefined;
  const lauf = route.view === 'planlauf' ? data.runs.find((r) => r.id === route.runId) : undefined;

  const gehe = (r: Route) => {
    navigate(r);
    setMenuOffen(false);
  };

  const farbmodus = data.bearbeiter.farbmodus ?? 'standard';
  useEffect(() => {
    // Der Farbmodus steuert die Farbtokens der gesamten Oberfläche.
    document.documentElement.dataset.farbmodus = farbmodus;
  }, [farbmodus]);

  const kopf = kopfzeile(route, projekt?.name, lauf?.name);

  return (
    <div className="app">
      <aside className={`sidebar ${menuOffen ? 'open' : ''}`}>
        <button type="button" className="sidebar-brand" onClick={() => gehe({ view: 'dashboard' })} title="Zur Übersicht">
          <KaPlanLogo variante="Planlaufmanagement" width="100%" />
        </button>

        <NavItem
          icon="dashboard"
          label="Übersicht"
          aktiv={route.view === 'dashboard'}
          badge={todos > 0 ? String(todos) : undefined}
          onClick={() => gehe({ view: 'dashboard' })}
        />
        <NavItem icon="projekt" label="Projekte" aktiv={route.view === 'projekte'} onClick={() => gehe({ view: 'projekte' })} />
        <NavItem
          icon="kalender"
          label="Terminrechner"
          aktiv={route.view === 'terminrechner'}
          onClick={() => gehe({ view: 'terminrechner' })}
        />
        {/* Workflows, Funktionen und Vorlagen gebündelt unter „Einstellungen“ */}
        <NavItem
          icon="einstellungen"
          label="Einstellungen"
          aktiv={false}
          offen={einstellungenOffen}
          onClick={() => setEinstellungenOffen((o) => !o)}
        />
        {einstellungenOffen ? (
          <>
            <NavItem unter icon="kette" label="Workflows" aktiv={route.view === 'ketten'} onClick={() => gehe({ view: 'ketten' })} />
            <NavItem unter icon="person" label="Funktionen" aktiv={route.view === 'rollen'} onClick={() => gehe({ view: 'rollen' })} />
            <NavItem unter icon="kopieren" label="Vorlagen" aktiv={route.view === 'vorlagen'} onClick={() => gehe({ view: 'vorlagen' })} />
          </>
        ) : null}

        <div className="nav-group-label">
          Projekte
          {markierte.length < aktiveAnzahl ? <span className="tertiary"> (markierte)</span> : null}
        </div>
        {markierte.map((p) => {
          const offen = offeneFristen(data, [p.id]).filter((f) => f.ampel === 'ueberfaellig').length;
          return (
            <NavItem
              key={p.id}
              icon="projekt"
              label={p.nummer ? `${p.nummer} ${p.name}` : p.name}
              aktiv={projekt?.id === p.id}
              badge={offen > 0 ? String(offen) : undefined}
              badgeAlarm
              onClick={() => gehe({ view: 'projekt', projectId: p.id, tab: 'uebersicht' })}
            />
          );
        })}

        <div className="sidebar-footer">
          <AngemeldetAls
            hinweis={`In markierten Projekten füllen Sie automatisch die Funktion ${EIGENE_ROLLE} aus – sie wird deshalb unter „Funktion“ nicht eigens geführt.`}
            zusatz={{
              label: 'E-Mail nach Erledigung',
              text: 'Nachfragen zulassen, wenn ein Workflow-Schritt eine E-Mail vorsieht',
              wert: data.bearbeiter.mailNachfrage ?? true,
              uebernehmen: (mailNachfrage) => setBearbeiter({ mailNachfrage }),
            }}
          />
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
                  ? 'Gesamten Datenbestand als JSON sichern'
                  : 'Gespeicherten Stand unverändert herunterladen'
              }
            >
              <Icon name="export" size={12} /> Sicherung
            </button>
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

        <Hinweisleisten />

        <div className="content" ref={inhalt}>
          <div className="content-inner">
            <RegisterHinweis />
            {route.view === 'dashboard' ? <Dashboard navigate={gehe} /> : null}
            {route.view === 'fristen' ? <Fristen navigate={gehe} /> : null}
            {route.view === 'projekte' ? <Projekte navigate={gehe} /> : null}
            {route.view === 'ketten' ? <Workflows /> : null}
            {route.view === 'rollen' ? <Funktionen /> : null}
            {route.view === 'vorlagen' ? <Vorlagen /> : null}
            {route.view === 'terminrechner' ? <Terminrechner /> : null}
            {route.view === 'projekt' ? (
              projekt ? (
                <ProjektDetail project={projekt} tab={route.tab} navigate={gehe} />
              ) : (
                <NichtGefunden onZurueck={() => gehe({ view: 'projekte' })} />
              )
            ) : null}
            {route.view === 'planlauf' ? (
              projekt && lauf ? (
                <PlanlaufDetail
                  project={projekt}
                  run={lauf}
                  onZurueck={() => gehe({ view: 'projekt', projectId: projekt.id, tab: 'uebersicht' })}
                  oeffneLauf={(runId) => gehe({ view: 'planlauf', projectId: projekt.id, runId })}
                />
              ) : (
                <NichtGefunden onZurueck={() => gehe({ view: 'projekte' })} />
              )
            ) : null}
          </div>
        </div>
      </main>

      {menuOffen ? (
        <div
          className="overlay"
          style={{ background: 'rgba(0,0,0,0.18)', zIndex: 80 }}
          onClick={() => setMenuOffen(false)}
        />
      ) : null}


      {sicherung ? (
        <SicherungEinspielenDialog
          sicherung={sicherung}
          onClose={() => setSicherung(null)}
          onEingespielt={() => gehe({ view: 'dashboard' })}
        />
      ) : null}

      {zuruecksetzenDialog ? (
        <ConfirmDialog
          titel="Daten zurücksetzen?"
          text="Alle lokal gespeicherten Änderungen werden verworfen und der Demodatenbestand wird neu geladen."
          bestaetigenLabel="Zurücksetzen"
          onConfirm={() => {
            zuruecksetzen();
            toast('Demodaten wiederhergestellt.');
            gehe({ view: 'dashboard' });
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
        text="Der aufgerufene Eintrag existiert nicht (mehr)."
        action={
          <button type="button" className="btn btn-primary" onClick={onZurueck}>
            Zu den Projekten
          </button>
        }
      />
    </Card>
  );
}

function kopfzeile(route: Route, projektName?: string, laufName?: string): { titel: string; sub?: string } {
  switch (route.view) {
    case 'dashboard':
      return { titel: 'Übersicht', sub: 'Alle Projekte auf einen Blick' };
    case 'fristen':
      return { titel: 'Fristen & Erinnerungen', sub: 'Anstehende Prozessschritte über alle Projekte' };
    case 'projekte':
      return { titel: 'Projekte', sub: 'Projektverwaltung' };
    case 'ketten':
      return { titel: 'Workflows', sub: 'Standard-Workflows und Projektvarianten' };
    case 'rollen':
      return { titel: 'Funktionen', sub: 'Projektübergreifend, gegliedert nach Gewerken' };
    case 'vorlagen':
      return { titel: 'Vorlagen', sub: 'E-Mail-Texte und Excel-Vorlagen für den Upload' };
    case 'terminrechner':
      return { titel: 'Terminrechner', sub: 'Späteste Übergabe und Ende des Planlaufs aus den Fristen' };
    case 'projekt':
      return { titel: projektName ?? 'Projekt', sub: 'Projektarbeitsbereich' };
    case 'planlauf':
      return { titel: laufName ?? 'Planlauf', sub: projektName };
    default:
      return { titel: 'KaPlan' };
  }
}
