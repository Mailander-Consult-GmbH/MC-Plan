/** Rahmen der Projektsteuerung: Seitenleiste, Kopfzeile und Auswahl der Ansicht. */
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Icon, type IconName } from '../../shared/icons';
import { KaPlanLogo, KaPlanZeichen, MailaenderLogo } from '../../shared/logos';
import { Einblenden, NavAktiv } from '../../shared/bewegung';
import { useToast } from '../../shared/toast';
import { Card, ConfirmDialog, EmptyState } from '../../shared/ui';
import { useNachObenBeiSeitenwechsel } from '../../shared/scrollen';
import { SeitenleisteGriff, SeitenleisteKnopf, useSeitenleiste } from '../../shared/seitenleiste';
import { BereichWechsel } from '../../shell/BereichWechsel';
import { Hinweisleisten } from './components/Hinweisleisten';
import { SicherungEinspielenDialog, SicherungWaehlen, type Sicherung } from './components/Sicherung';
import { bezeichnung } from './domain/protokoll';
import { offenePunkte } from './domain/punkte';
import { zeitkritisch } from './domain/todos';
import { useRoute, type Route } from './lib/router';
import { Funktionen } from './pages/Funktionen';
import { ProjektDetail } from './pages/ProjektDetail';
import { Projekte } from './pages/Projekte';
import { ProtokollEditor } from './pages/projekt/ProtokollEditor';
import { TodoListe } from './pages/Todos';
import { Uebersicht, sichtbareProjekte } from './pages/Uebersicht';
import { exportiereDaten, rohdatenHerunterladen } from './store/storage';
import { useStore } from './store/store';
import { useArchivierte } from '../../gemeinsam/ProjektBereiche';
import { AngemeldetAls } from '../../gemeinsam/AngemeldetAls';
import { RegisterHinweis } from '../../gemeinsam/RegisterHinweis';

export function App() {
  const { data, ladeZustand, zuruecksetzen } = useStore();
  // Ein Stand aus einer neueren Fassung darf weder ersetzt noch zurückgesetzt werden
  const gesperrt = ladeZustand === 'neuere_fassung';
  const gesperrtTitel = 'Gesperrt, damit der Stand aus der neueren Fassung erhalten bleibt';
  const toast = useToast();
  const [route, navigate] = useRoute();
  // Eine neue Seite beginnt oben – ein Reiterwechsel nicht (src/shared/scrollen.ts)
  const inhalt = useNachObenBeiSeitenwechsel<HTMLDivElement>(route.view === 'projekt' ? `projekt/${route.projektId}` : route.view === 'protokoll' ? `protokoll/${route.protokollId}` : route.view);
  const [menuOffen, setMenuOffen, leiste] = useSeitenleiste();
  const inEinstellungen = route.view === 'funktionen';
  const [einstellungenOffen, setEinstellungenOffen] = useState(inEinstellungen);
  // Wer eine der Seiten unter „Einstellungen“ aufruft, sieht die Gruppe aufgeklappt
  useEffect(() => {
    if (inEinstellungen) setEinstellungenOffen(true);
  }, [inEinstellungen]);
  const [zuruecksetzenDialog, setZuruecksetzenDialog] = useState(false);
  const [sicherung, setSicherung] = useState<Sicherung | null>(null);

  const archiviert = useArchivierte('projektsteuerung');
  const markierte = sichtbareProjekte(data.projekte, archiviert);
  const aktiveAnzahl = data.projekte.filter((p) => !archiviert.has(p.id)).length;
  const ueberfaellig = offenePunkte(data, markierte.map((p) => p.id)).filter((p) => p.ampel === 'ueberfaellig');
  // To-Do-Liste: fällige und überfällige Aufgaben – rot wie die Zähler der Projekte im Planlaufmanagement
  const faelligeTodos = data.todos.filter((t) => zeitkritisch(t));
  const projekt =
    route.view === 'projekt' || route.view === 'protokoll'
      ? data.projekte.find((p) => p.id === route.projektId)
      : undefined;
  const protokoll =
    route.view === 'protokoll'
      ? data.protokolle.find((p) => p.id === route.protokollId && p.projektId === route.projektId)
      : undefined;

  const gehe = (r: Route) => {
    navigate(r);
    setMenuOffen(false);
  };

  const kopf = kopfzeile(route, projekt?.name, protokoll ? bezeichnung(protokoll) : undefined);

  return (
    <div className={`app ${leiste.eingeklappt ? 'leiste-zu' : ''}`}>
      {/* layoutScroll: Die Fläche des aktiven Menüpunkts (NavAktiv) gleitet auch in der gescrollten Leiste an die richtige Stelle */}
      <motion.aside layoutScroll className={`sidebar ${menuOffen ? 'open' : ''} ${leiste.eingeklappt ? 'eingeklappt' : ''}`}>
        <button type="button" className="sidebar-brand" onClick={() => gehe({ view: 'uebersicht' })} title="Zur Übersicht">
          <span className="marke-voll">
            <KaPlanLogo zustand="projekt" />
          </span>
          <KaPlanZeichen zustand="projekt" />
        </button>

        <NavItem
          icon="dashboard"
          label="Übersicht"
          aktiv={route.view === 'uebersicht'}
          onClick={() => gehe({ view: 'uebersicht' })}
        />
        <NavItem
          icon="aufgabe"
          label="To-Do-Liste"
          aktiv={route.view === 'todos'}
          badge={faelligeTodos.length > 0 ? String(faelligeTodos.length) : undefined}
          badgeAlarm
          onClick={() => gehe({ view: 'todos' })}
        />
        <NavItem icon="projekt" label="Projekte" aktiv={route.view === 'projekte'} onClick={() => gehe({ view: 'projekte' })} />
        {/* Funktionen unter „Einstellungen“ – wie im Planlaufmanagement */}
        <NavItem
          icon="einstellungen"
          label="Einstellungen"
          aktiv={false}
          offen={einstellungenOffen}
          onClick={() => setEinstellungenOffen((o) => !o)}
        />
        {einstellungenOffen ? (
          <NavItem
            unter
            icon="person"
            label="Funktionen"
            aktiv={route.view === 'funktionen'}
            onClick={() => gehe({ view: 'funktionen' })}
          />
        ) : null}

        {/* Die markierten Projekte, zweizeilig: Projektnummer klein über dem Namen – in der eingeklappten Leiste nur ihr Symbol (Nummer und Name im Tooltip), unter einer Trennlinie */}
        <div className="nav-projekte">
          <div className="nav-group-label">
            Projekte
            {markierte.length < aktiveAnzahl ? <span className="tertiary"> (markierte)</span> : null}
          </div>
          {markierte.map((p) => {
            const spaet = ueberfaellig.filter((x) => x.projekt.id === p.id).length;
            return (
              <NavItem
                key={p.id}
                icon="projekt"
                nummer={p.nummer}
                label={p.name}
                aktiv={projekt?.id === p.id}
                badge={spaet > 0 ? String(spaet) : undefined}
                badgeAlarm
                onClick={() => gehe({ view: 'projekt', projektId: p.id, tab: 'beteiligte' })}
              />
            );
          })}
        </div>

        <div className="sidebar-footer">
          <AngemeldetAls hinweis="Steht dieser Name in der Projektbeteiligtenliste, übernehmen Sie die Protokollführung neuer Protokollreihen, und Aufgaben mit Ihrem Kürzel oder Namen sind bei der Übernahme in die To-Do-Liste vorgewählt." />
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
                  ? 'Gesamten Datenbestand der Projektsteuerung als JSON sichern'
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
          <span className="sidebar-hinweis">Daten werden lokal im Browser gespeichert.</span>
          <BereichWechsel />
        </div>
      </motion.aside>
      <SeitenleisteGriff leiste={leiste} />

      <main className="main">
        <header className="topbar">
          {/* So breit und an derselben Stelle wie der Inhalt (.content-inner): Titel und Hauslogo stehen in der Flucht der Kacheln */}
          <div className="topbar-inner">
            <SeitenleisteKnopf leiste={leiste} offen={menuOffen} />
            <div className="topbar-title">
              <h1>{kopf.titel}</h1>
              {kopf.sub ? <div className="sub">{kopf.sub}</div> : null}
            </div>
            <div className="topbar-logo">
              <MailaenderLogo height={34} />
            </div>
          </div>
        </header>

        <div className="content" ref={inhalt}>
          <div className="content-inner">
            <Hinweisleisten />
            <RegisterHinweis />
            <Einblenden schluessel={route.view}>
              {route.view === 'uebersicht' ? <Uebersicht navigate={gehe} /> : null}
              {route.view === 'projekte' ? <Projekte navigate={gehe} /> : null}
              {route.view === 'funktionen' ? <Funktionen /> : null}
              {route.view === 'todos' ? (
                <TodoListe key={route.filter ?? 'offen'} startFilter={route.filter} navigate={gehe} />
              ) : null}
              {route.view === 'projekt' ? (
                projekt ? (
                  <ProjektDetail projekt={projekt} tab={route.tab} navigate={gehe} />
                ) : (
                  <NichtGefunden onZurueck={() => gehe({ view: 'projekte' })} />
                )
              ) : null}
              {route.view === 'protokoll' ? (
                projekt && protokoll ? (
                  <ProtokollEditor key={protokoll.id} projekt={projekt} protokoll={protokoll} navigate={gehe} />
                ) : (
                  <NichtGefunden onZurueck={() => gehe({ view: 'projekte' })} />
                )
              ) : null}
            </Einblenden>
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
          text="Alle lokal gespeicherten Projekte, Projektbeteiligten, Protokolle und To-Dos der Projektsteuerung werden verworfen und der Demodatenbestand samt Standard-Funktionen wird neu geladen. Die anderen Bereiche bleiben unberührt."
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
  nummer,
  aktiv,
  badge,
  badgeAlarm,
  unter,
  offen,
  onClick,
}: {
  icon: IconName;
  label: string;
  /** Nur Projekte: die Projektnummer – steht klein über dem Namen (zweizeilig). */
  nummer?: string;
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
      title={nummer ? `${nummer} ${label}` : label}
      aria-expanded={offen}
    >
      {aktiv ? <NavAktiv /> : null}
      <span className="nav-icon">
        <Icon name={icon} size={17} />
      </span>
      {nummer ? (
        <span className="nav-label zweizeilig">
          <span className="nav-nummer">{nummer}</span>
          <span className="nav-name">{label}</span>
        </span>
      ) : (
        <span className="nav-label">{label}</span>
      )}
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
        text="Der aufgerufene Eintrag existiert nicht (mehr) – etwa weil das Projekt oder Protokoll gelöscht wurde."
        action={
          <button type="button" className="btn btn-primary" onClick={onZurueck}>
            Zu den Projekten
          </button>
        }
      />
    </Card>
  );
}

function kopfzeile(route: Route, projektName?: string, protokollName?: string): { titel: string; sub?: string } {
  switch (route.view) {
    case 'uebersicht':
      return { titel: 'Übersicht', sub: 'Eigene To-Dos und Besprechungen aller Projekte' };
    case 'projekte':
      return { titel: 'Projekte', sub: 'Projektverwaltung' };
    case 'funktionen':
      return { titel: 'Funktionen', sub: 'Projektübergreifend, gegliedert nach Gewerken' };
    case 'todos':
      return { titel: 'To-Do-Liste', sub: 'Eigene Aufgaben – auf Wunsch mit Projekt' };
    case 'projekt':
      return { titel: projektName ?? 'Projekt', sub: 'Projektarbeitsbereich' };
    case 'protokoll':
      return { titel: protokollName ?? 'Protokoll', sub: projektName };
  }
}
