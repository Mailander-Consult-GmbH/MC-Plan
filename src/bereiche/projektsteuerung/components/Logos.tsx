/**
 * Logos im Druckkopf. Das Projekt legt sie für Protokolle und
 * Projektbeteiligtenliste fest – ohne eigene Auswahl gelten die
 * Standardlogos. Jede Protokollreihe kann davon abweichen; ohne eigene Auswahl
 * gelten die Logos des Projekts. Hinzugefügte Bilder werden verkleinert und als
 * Bilddaten im Bestand gespeichert.
 */
import { useRef } from 'react';
import { Icon } from '../../../shared/icons';
import { useToast } from '../../../shared/toast';
import { Card, CardHeader, Modal } from '../../../shared/ui';
import { logoQuelle } from '../domain/druck';
import { STANDARD_LOGOS, logosFuer, logosVon } from '../domain/seed';
import { newId, type ID, type Logo, type Projekt } from '../domain/types';
import { useStore } from '../store/store';

/** Höhe, auf die Rasterbilder verkleinert werden. */
const LOGO_HOEHE = 240;

function logoLesen(datei: File): Promise<string> {
  return new Promise((aufloesen, ablehnen) => {
    const leser = new FileReader();
    leser.onerror = () => ablehnen(leser.error);
    leser.onload = () => {
      const url = String(leser.result);
      if (datei.type === 'image/svg+xml') {
        aufloesen(url);
        return;
      }
      const bild = new Image();
      bild.onerror = () => ablehnen(new Error('Bild'));
      bild.onload = () => {
        const h = Math.min(LOGO_HOEHE, bild.height);
        const w = Math.round((bild.width * h) / bild.height);
        const flaeche = document.createElement('canvas');
        flaeche.width = w;
        flaeche.height = h;
        flaeche.getContext('2d')?.drawImage(bild, 0, 0, w, h);
        aufloesen(flaeche.toDataURL('image/png'));
      };
      bild.src = url;
    };
    leser.readAsDataURL(datei);
  });
}

/**
 * Logos bearbeiten: hinzufügen, nach links verschieben, entfernen. `vorgabe`
 * setzt auf die geerbten Logos zurück, solange eigene gelten.
 */
function LogoFeld({
  logos,
  onSetzen,
  vorgabe,
}: {
  logos: Logo[];
  onSetzen: (logos: Logo[]) => void;
  vorgabe: { label: string; leer: string; aktiv: boolean; onZurueck: () => void };
}) {
  const toast = useToast();
  const eingabe = useRef<HTMLInputElement>(null);

  const hinzufuegen = async (dateien: File[]) => {
    const neu: Logo[] = [];
    for (const datei of dateien) {
      try {
        neu.push({ id: newId('logo'), name: datei.name.replace(/\.[^.]+$/, ''), src: await logoLesen(datei) });
      } catch {
        toast(`${datei.name} konnte nicht gelesen werden.`);
      }
    }
    if (neu.length === 0) return;
    onSetzen([...logos, ...neu]);
    toast(neu.length === 1 ? 'Logo hinzugefügt.' : `${neu.length} Logos hinzugefügt.`);
  };

  return (
    <div className="stack" style={{ gap: 12 }}>
      <div className="row wrap">
        <button type="button" className="btn btn-sm btn-outline" onClick={() => eingabe.current?.click()}>
          <Icon name="plus" size={12} /> Logo hinzufügen
        </button>
        {vorgabe.aktiv ? (
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => {
              vorgabe.onZurueck();
              toast(`${vorgabe.label} wiederhergestellt.`);
            }}
          >
            {vorgabe.label}
          </button>
        ) : null}
        <input
          ref={eingabe}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => {
            const dateien = [...(e.target.files ?? [])];
            e.target.value = '';
            void hinzufuegen(dateien);
          }}
        />
      </div>
      {logos.length === 0 ? (
        <p className="small tertiary">{vorgabe.leer}</p>
      ) : (
        <div className="ps-logo-liste">
          {logos.map((l, i) => (
            <div key={l.id} className="ps-logo">
              <img src={logoQuelle(l.src)} alt={l.name} title={l.name} />
              <button
                type="button"
                className="btn-icon"
                disabled={i === 0}
                title="Nach links"
                aria-label="Logo nach links"
                onClick={() => {
                  const neu = [...logos];
                  [neu[i - 1], neu[i]] = [neu[i], neu[i - 1]];
                  onSetzen(neu);
                }}
              >
                <Icon name="zurueck" size={13} />
              </button>
              <button
                type="button"
                className="btn-icon"
                title="Logo entfernen"
                aria-label="Logo entfernen"
                onClick={() => {
                  onSetzen(logos.filter((x) => x.id !== l.id));
                  toast('Logo entfernt.');
                }}
              >
                <Icon name="loeschen" size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Logos des Projekts – Vorgabe für alle Protokollreihen ohne eigene Logos und für die Beteiligtenliste. */
export function LogoVerwaltung({ projekt }: { projekt: Projekt }) {
  const { updateProjekt } = useStore();
  return (
    <Card>
      <CardHeader
        titel="Logos im Druckkopf"
        sub={`Oben rechts in Protokollen und Beteiligtenliste dieses Projekts – in dieser Reihenfolge${
          projekt.logos === null ? ' (Standardlogos)' : ''
        }. Protokollreihen können eigene Logos führen.`}
      />
      <div className="card-pad">
        <LogoFeld
          logos={logosVon(projekt)}
          onSetzen={(logos) => updateProjekt(projekt.id, { logos })}
          vorgabe={{
            label: 'Standardlogos',
            leer: `Keine Logos – der Druckkopf bleibt rechts leer. „Standardlogos“ stellt ${STANDARD_LOGOS.map((l) => l.name).join(' und ')} wieder her.`,
            aktiv: projekt.logos !== null,
            onZurueck: () => updateProjekt(projekt.id, { logos: null }),
          }}
        />
      </div>
    </Card>
  );
}

/** Logos einer Protokollreihe; ohne eigene gelten die des Projekts. */
export function ReihenLogosDialog({
  projekt,
  reiheId,
  titel,
  onClose,
}: {
  projekt: Projekt;
  reiheId: ID;
  titel: string;
  onClose: () => void;
}) {
  const { data, setReihenLogos } = useStore();
  const eigene = reiheId in data.reihenLogos;
  return (
    <Modal
      titel="Logos im Druckkopf"
      sub={`${titel} – gilt für alle Protokolle dieser Reihe${eigene ? '' : ' (wie im Projekt)'}`}
      onClose={onClose}
      footer={
        <button type="button" className="btn btn-primary" onClick={onClose}>
          Fertig
        </button>
      }
    >
      <LogoFeld
        logos={logosFuer(projekt, reiheId, data.reihenLogos)}
        onSetzen={(logos) => setReihenLogos(reiheId, logos)}
        vorgabe={{
          label: 'Logos des Projekts',
          leer: 'Keine Logos – der Druckkopf dieser Reihe bleibt rechts leer. „Logos des Projekts“ stellt die Vorgabe des Projekts wieder her.',
          aktiv: eigene,
          onZurueck: () => setReihenLogos(reiheId, null),
        }}
      />
    </Modal>
  );
}
