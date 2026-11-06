/**
 * Rahmen des Controllings: Seitenleiste, Kopfzeile und Auswahl der Ansicht –
 * Projekte und Archiv auf dem Projektregister, dazu das Controlling der
 * Leistungsnachweise, das der Bereich selbst bereitstellt
 * (`LeistungsnachweiseControlling`, src/bereiche/leistungsnachweise/controlling.tsx).
 */
import { useEffect, useState } from 'react';
import { useRegister, useRegisterZustand } from '../../gemeinsam/register';
import { Icon, type IconName } from '../../shared/icons';
import { KaPlanLogo, MailaenderLogo } from '../../shared/logos';
import { Callout } from '../../shared/ui';
import { useNachObenBeiSeitenwechsel } from '../../shared/scrollen';
import { BereichWechsel } from '../../shell/BereichWechsel';
import { AngemeldetAls } from '../../gemeinsam/AngemeldetAls';
import { useBenutzer } from '../../gemeinsam/benutzer';
import { LeistungsnachweiseControlling, leistungsnachweiseUntertitel } from '../leistungsnachweise/controlling';
import { useRoute, type Route } from './lib/router';
import { Projekte } from './pages/Projekte';

export function App({ onSperren }: { onSperren: () => void }) {
  const register = useRegister();
  const zustand = useRegisterZustand();
  const [route, navigate] = useRoute();
  // Ein neuer Menüpunkt beginnt oben (src/shared/scrollen.ts); die Leistungsnachweise
  // setzen innerhalb ihres Menüpunkts selbst zurück.
  const inhalt = useNachObenBeiSeitenwechsel<HTMLDivElement>(route.view);
  const [menuOffen, setMenuOffen] = useState(false);

  // Das Controlling hat keine eigenen Einstellungen – es folgt dem Farbmodus der gemeinsamen Anmeldung.
  const { farbmodus } = useBenutzer();
  useEffect(() => {
    document.documentElement.dataset.farbmodus = farbmodus;
  }, [farbmodus]);

  const gehe = (r: Route) => {
    navigate(r);
    setMenuOffen(false);
  };

  const laufend = register.projekte.filter((p) => !p.archiviert).length;
  const archiviert = register.projekte.length - laufend;
  const kopf =
    route.view === 'archiv'
      ? { titel: 'Archiv', sub: 'Im Controlling archivierte Projekte – in allen Bereichen archiviert' }
      : route.view === 'leistungsnachweise'
        ? { titel: 'Leistungsnachweise', sub: leistungsnachweiseUntertitel(window.location.hash) }
        : { titel: 'Projekte', sub: 'Alle Projekte der Bereiche – anlegen, übernehmen, archivieren, löschen' };

  return (
    <div className="app">
      <aside className={`sidebar ${menuOffen ? 'open' : ''}`}>
        <button type="button" className="sidebar-brand ct-marke" onClick={() => gehe({ view: 'projekte' })} title="Zu den Projekten">
          <KaPlanLogo variante="Startseite" width="100%" />
          <span className="ct-marke-text">Controlling</span>
        </button>

        <NavItem
          icon="projekt"
          label="Projekte"
          aktiv={route.view === 'projekte'}
          badge={laufend > 0 ? String(laufend) : undefined}
          onClick={() => gehe({ view: 'projekte' })}
        />
        <NavItem
          icon="archiv"
          label="Archiv"
          aktiv={route.view === 'archiv'}
          badge={archiviert > 0 ? String(archiviert) : undefined}
          onClick={() => gehe({ view: 'archiv' })}
        />

        <div className="nav-group-label">Bereiche</div>
        <NavItem
          icon="stunden"
          label="Leistungsnachweise"
          aktiv={route.view === 'leistungsnachweise'}
          onClick={() => gehe({ view: 'leistungsnachweise' })}
        />

        <div className="sidebar-footer">
          <AngemeldetAls />
          <button type="button" className="btn btn-sm btn-outline ct-sperren" onClick={onSperren}>
            <Icon name="schloss" size={12} /> Sperren
          </button>
          Das Projektregister liegt lokal im Browser; die Bereiche übernehmen Änderungen beim nächsten Öffnen.
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
            <div className="sub">{kopf.sub}</div>
          </div>
          <div className="topbar-logo">
            <MailaenderLogo height={34} />
          </div>
        </header>

        <div className="content" ref={inhalt}>
          <div className="content-inner">
            {route.view === 'leistungsnachweise' ? (
              <LeistungsnachweiseControlling />
            ) : zustand !== 'ok' ? (
              <Callout ton="error" icon="!">
                {zustand === 'neuere_fassung'
                  ? 'Das Projektregister stammt aus einer neueren Fassung von KaPlan. Bitte die Seite neu laden (Strg+Umschalt+R). Bis dahin bleibt es unverändert, und die Bereiche gleichen nicht ab.'
                  : 'Das Projektregister ließ sich nicht lesen. Es bleibt unverändert, und die Bereiche gleichen ihre Projekte nicht ab.'}
              </Callout>
            ) : (
              <Projekte archiv={route.view === 'archiv'} />
            )}
          </div>
        </div>
      </main>

      {menuOffen ? (
        <div className="overlay" style={{ background: 'rgba(0,0,0,0.18)', zIndex: 80 }} onClick={() => setMenuOffen(false)} />
      ) : null}
    </div>
  );
}

function NavItem({
  icon,
  label,
  aktiv,
  badge,
  onClick,
}: {
  icon: IconName;
  label: string;
  aktiv: boolean;
  badge?: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className={`nav-item ${aktiv ? 'active' : ''}`} onClick={onClick} title={label}>
      <span className="nav-icon">
        <Icon name={icon} size={16} />
      </span>
      <span className="nav-label">{label}</span>
      {badge ? <span className="nav-badge">{badge}</span> : null}
    </button>
  );
}
