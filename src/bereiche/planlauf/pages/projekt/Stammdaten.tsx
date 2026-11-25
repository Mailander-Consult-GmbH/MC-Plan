/**
 * Stammdaten des Projekts (Einstellungen des Projekts, unter „Projektdaten“):
 * Geschäftsbereich und Auftraggeber, Region, Planungsphase, zentraler
 * SharePoint-Ordner und Strecken – dazu je Geschäftsbereich die Station
 * (Personenbahnhöfe) bzw. die Streckenabschnitte in km (Fahrweg), siehe
 * `GESCHAEFTSBEREICHE` in domain/types.ts. Sie gelten unabhängig vom
 * Pflichtenheft; das Pflichtenheft setzt sie über Platzhalter ein
 * (domain/pflichtenheft.ts). In der Karte wird jede Eingabe sofort
 * gespeichert – wie die Fristen; der Assistent des Pflichtenhefts nutzt
 * dieselben Felder (`StammdatenFelder`).
 */
import {
  GESCHAEFTSBEREICHE,
  PLANUNGSPHASEN,
  STANDARD_AUFTRAGGEBER,
  geschaeftsbereichVon,
  leereStammdaten,
  type Project,
  type ProjektStammdaten,
  type Strecke,
} from '../../domain/types';
import { useStore } from '../../store/store';
import { Card, CardHeader, Field, Segmented, TextInput } from '../../../../shared/ui';
import { Icon } from '../../../../shared/icons';

/** Die Felder der Stammdaten – je nach Geschäftsbereich. */
export function StammdatenFelder({
  wert,
  onChange,
  idPraefix = 'stammdaten',
}: {
  wert: ProjektStammdaten;
  onChange: (s: ProjektStammdaten) => void;
  idPraefix?: string;
}) {
  const s: ProjektStammdaten = { ...leereStammdaten(), ...wert };
  const gb = GESCHAEFTSBEREICHE.find((g) => g.id === geschaeftsbereichVon(s.geschaeftsbereich))!;
  const setzen = (patch: Partial<ProjektStammdaten>) => onChange({ ...s, ...patch });
  const strecke = (i: number, patch: Partial<Strecke>) =>
    setzen({ strecken: s.strecken.map((x, j) => (j === i ? { ...x, ...patch } : x)) });

  return (
    <div className="form-grid">
      <Field label="Geschäftsbereich" full>
        <Segmented<string>
          value={gb.id}
          onChange={(v) => setzen({ geschaeftsbereich: GESCHAEFTSBEREICHE.find((g) => g.id === v)!.label })}
          options={GESCHAEFTSBEREICHE.map((g) => ({ value: g.id, label: g.label }))}
        />
      </Field>
      <Field label="Auftraggeber">
        <TextInput value={s.auftraggeber} onChange={(v) => setzen({ auftraggeber: v })} placeholder={STANDARD_AUFTRAGGEBER} />
      </Field>
      <Field label="Region" hint="Datenmanagement der DB InfraGO">
        <TextInput value={s.region} onChange={(v) => setzen({ region: v })} placeholder="Südwest" />
      </Field>
      <Field label="Planungsphase">
        <TextInput
          value={s.planungsphase}
          onChange={(v) => setzen({ planungsphase: v })}
          placeholder="Ausführungsplanung"
          list={`${idPraefix}-planungsphasen`}
        />
        <datalist id={`${idPraefix}-planungsphasen`}>
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
      {gb.station ? (
        <>
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
        </>
      ) : null}
      <Field label={gb.streckenKm ? 'Betroffene Strecken und Abschnitte' : 'Betroffene Strecken'} full>
        <div className="stack" style={{ gap: 8 }}>
          {s.strecken.length === 0 ? <span className="tertiary small">noch keine Strecke eingetragen</span> : null}
          {s.strecken.map((x, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <div className="w-[96px] flex-none">
                <TextInput
                  value={x.nummer}
                  onChange={(v) => strecke(i, { nummer: v })}
                  placeholder="4900"
                  aria-label={`Streckennummer ${i + 1}`}
                  inputMode="numeric"
                />
              </div>
              <div className="min-w-[180px] flex-1">
                <TextInput
                  value={x.bezeichnung}
                  onChange={(v) => strecke(i, { bezeichnung: v })}
                  placeholder="Bietigheim-Bissingen – Osterburken"
                  aria-label={`Bezeichnung der Strecke ${i + 1}`}
                />
              </div>
              {gb.streckenKm ? (
                <>
                  <div className="w-[104px] flex-none">
                    <TextInput
                      value={x.kmVon ?? ''}
                      onChange={(v) => strecke(i, { kmVon: v })}
                      placeholder="von km"
                      aria-label={`Strecke ${i + 1}: von km`}
                      inputMode="decimal"
                    />
                  </div>
                  <div className="w-[104px] flex-none">
                    <TextInput
                      value={x.kmBis ?? ''}
                      onChange={(v) => strecke(i, { kmBis: v })}
                      placeholder="bis km"
                      aria-label={`Strecke ${i + 1}: bis km`}
                      inputMode="decimal"
                    />
                  </div>
                </>
              ) : null}
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
  );
}

export function StammdatenKarte({ project }: { project: Project }) {
  const { updateProject } = useStore();
  return (
    <Card>
      <CardHeader titel="Stammdaten" sub="Geschäftsbereich, Station bzw. Strecke und Auftraggeber – Grundlage des Pflichtenhefts" />
      <div className="card-pad">
        <StammdatenFelder wert={project.stammdaten} onChange={(s) => updateProject(project.id, { stammdaten: s })} />
      </div>
    </Card>
  );
}
