/**
 * Stammdaten des Projekts (Einstellungen des Projekts, unter „Projektdaten“):
 * Station und Strecke, Auftraggeber, Planungsphase und der zentrale
 * SharePoint-Ordner. Sie gelten unabhängig vom Pflichtenheft; das Pflichtenheft
 * setzt sie über Platzhalter ein (domain/pflichtenheft.ts). Jede Eingabe wird
 * sofort gespeichert – wie die Fristen.
 */
import { leereStammdaten, PLANUNGSPHASEN, type Project, type ProjektStammdaten, type Strecke } from '../../domain/types';
import { useStore } from '../../store/store';
import { Card, CardHeader, Field, TextInput } from '../../../../shared/ui';
import { Icon } from '../../../../shared/icons';

export function StammdatenKarte({ project }: { project: Project }) {
  const { updateProject } = useStore();
  const s: ProjektStammdaten = { ...leereStammdaten(), ...project.stammdaten };
  const setzen = (patch: Partial<ProjektStammdaten>) => updateProject(project.id, { stammdaten: { ...s, ...patch } });
  const strecke = (i: number, patch: Partial<Strecke>) =>
    setzen({ strecken: s.strecken.map((x, j) => (j === i ? { ...x, ...patch } : x)) });

  return (
    <Card>
      <CardHeader titel="Stammdaten" sub="Station, Strecke und Auftraggeber – Grundlage des Pflichtenhefts" />
      <div className="card-pad">
        <div className="form-grid">
          <Field label="Bahnhof bzw. Haltepunkt">
            <TextInput value={s.station} onChange={(v) => setzen({ station: v })} placeholder="Hp Herbolzheim (Jagst)" />
          </Field>
          <Field label="Kürzel der Betriebsstelle (Ril 100)">
            <TextInput value={s.stationKuerzel} onChange={(v) => setzen({ stationKuerzel: v })} placeholder="THZ" />
          </Field>
          <Field label="Bahnhofsnummer">
            <TextInput value={s.bahnhofsNummer} onChange={(v) => setzen({ bahnhofsNummer: v })} placeholder="2700" inputMode="numeric" />
          </Field>
          <Field label="Stations-km">
            <TextInput value={s.stationsKm} onChange={(v) => setzen({ stationsKm: v })} placeholder="73,589 – 73,760" />
          </Field>
          <Field label="Auftraggeber">
            <TextInput value={s.auftraggeber} onChange={(v) => setzen({ auftraggeber: v })} placeholder="DB InfraGO AG" />
          </Field>
          <Field label="Geschäftsbereich">
            <TextInput value={s.geschaeftsbereich} onChange={(v) => setzen({ geschaeftsbereich: v })} placeholder="Personenbahnhöfe" />
          </Field>
          <Field label="Planungsphase">
            <TextInput
              value={s.planungsphase}
              onChange={(v) => setzen({ planungsphase: v })}
              placeholder="Ausführungsplanung"
              list="stammdaten-planungsphasen"
            />
            <datalist id="stammdaten-planungsphasen">
              {PLANUNGSPHASEN.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </Field>
          <Field label="Zentraler SharePoint-Ordner" hint="Genehmigte Unterlagen mit Prüfberichten und Freigabeschreiben">
            <TextInput
              value={s.sharepointZentral}
              onChange={(v) => setzen({ sharepointZentral: v })}
              type="url"
              inputMode="url"
              placeholder="https://…sharepoint.com/sites/…"
            />
          </Field>
          <Field label="Betroffene Strecken" full>
            <div className="stack" style={{ gap: 8 }}>
              {s.strecken.length === 0 ? <span className="tertiary small">noch keine Strecke eingetragen</span> : null}
              {s.strecken.map((x, i) => (
                <div key={i} className="row" style={{ gap: 8 }}>
                  <div style={{ width: 110, flex: 'none' }}>
                    <TextInput
                      value={x.nummer}
                      onChange={(v) => strecke(i, { nummer: v })}
                      placeholder="4900"
                      aria-label={`Streckennummer ${i + 1}`}
                      inputMode="numeric"
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <TextInput
                      value={x.bezeichnung}
                      onChange={(v) => strecke(i, { bezeichnung: v })}
                      placeholder="Bietigheim-Bissingen – Osterburken"
                      aria-label={`Bezeichnung der Strecke ${i + 1}`}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={() => setzen({ strecken: s.strecken.filter((_, j) => j !== i) })}
                    aria-label={`Strecke ${x.nummer || i + 1} entfernen`}
                    title="Strecke entfernen"
                  >
                    <Icon name="loeschen" size={14} />
                  </button>
                </div>
              ))}
              <div>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setzen({ strecken: [...s.strecken, { nummer: '', bezeichnung: '' }] })}
                >
                  <Icon name="plus" size={13} /> Strecke
                </button>
              </div>
            </div>
          </Field>
        </div>
      </div>
    </Card>
  );
}
