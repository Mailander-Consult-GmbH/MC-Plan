/**
 * Datenbestand des Bereichs „Baubetriebsplanung“. Alle Schreibzugriffe laufen
 * über `mutate()`; der Bestand wird danach lokal gespeichert. Der Aufbau
 * entspricht dem des Planlaufmanagements, ist davon aber getrennt – gemeinsam
 * ist nur das Projektregister (`src/gemeinsam/`), mit dem der Store die
 * Projekte nach jeder Änderung abgleicht (`useRegisterAbgleich`,
 * domain/register.ts). Name und Farbmodus unter „Angemeldet als“ spiegeln die
 * gemeinsame Anmeldung aller Bereiche (`useBenutzerAbgleich`,
 * src/gemeinsam/benutzer.ts).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { today } from '../../../shared/dates';
import {
  anmeldungDuplizieren,
  bauzeitraumAbgleichen,
  wechselAnwenden,
  wechselZuruecknehmen,
  type Wechsel,
} from '../domain/ablauf';
import { newId, seedDaten } from '../domain/seed';
import type {
  Anmeldung,
  BaubetriebDaten,
  Einstellungen,
  ID,
  ISODate,
  Projekt,
  RilFrist,
  RilSchluessel,
  Workflow,
} from '../domain/types';
import { useRegisterAbgleich } from '../../../gemeinsam/useRegisterAbgleich';
import { useFremdeAenderung } from '../../../gemeinsam/useFremdeAenderung';
import { useBenutzerAbgleich } from '../../../gemeinsam/useBenutzerAbgleich';
import { registerPlanAnwenden, sichtFuerRegister } from '../domain/register';
import { zielText } from '../domain/workflow';
import { workflowLoeschen, workflowSpeichern } from '../domain/workflowPflege';
import { SPEICHER_SCHLUESSEL, ladeDaten, speichereDaten, type LadeZustand, type SpeicherZustand } from './storage';

export { newId };

/** Angaben zur Neuanlage einer Anmeldung; Verlauf und Änderungsmerkmale entstehen im Store. */
export type NeueAnmeldung = Omit<
  Anmeldung,
  'id' | 'verlauf' | 'herkunftId' | 'aenderungsNr' | 'annexVII' | 'terminManuell' | 'geaendertAm'
>;

interface StoreValue {
  data: BaubetriebDaten;
  /** Ergebnis des Ladens; außer bei 'ok' werden Demodaten gezeigt und nichts gespeichert. */
  ladeZustand: LadeZustand;
  /** Ergebnis des letzten Speicherns: 'voll' bzw. 'gesperrt' – nicht gespeichert (Hinweis: components/Hinweisleisten.tsx). */
  speicherZustand: SpeicherZustand;
  /* Einstellungen */
  setEinstellungen: (e: Partial<Omit<Einstellungen, 'rilFristen'>>) => void;
  /** Ändert eine Richtlinienfrist; sie gilt danach nicht mehr als Platzhalter. */
  setRilFrist: (schluessel: RilSchluessel, patch: Partial<RilFrist>) => void;
  /* Workflows */
  /**
   * Legt einen Workflow an oder ersetzt ihn. Nachfolger, die auf entfallene
   * Status zeigen, werden in allen Workflows entfernt. Ob entfallende Status
   * noch belegt sind, prüft der Editor vorher (belegteEntfallendeStatus).
   */
  saveWorkflow: (w: Workflow) => void;
  /** Löscht einen Workflow, in dem keine Anmeldung mehr steht. */
  deleteWorkflow: (id: ID) => void;
  /* Projekte */
  addProjekt: (p: Omit<Projekt, 'id'>) => ID;
  updateProjekt: (id: ID, patch: Partial<Projekt>) => void;
  /** Löscht das Projekt samt seiner Anmeldungen. */
  deleteProjekt: (id: ID) => void;
  toggleMarkiert: (id: ID) => void;
  /* Anmeldungen */
  addAnmeldung: (a: NeueAnmeldung) => ID;
  /** Ändert Merkmale; setzt `geaendertAm` auf heute – nur, wenn sich dabei etwas ändert. */
  updateAnmeldung: (id: ID, patch: Partial<Omit<Anmeldung, 'id' | 'statusId' | 'verlauf' | 'geaendertAm'>>) => void;
  deleteAnmeldung: (id: ID) => void;
  /** Legt eine Kopie mit aktuellem Stand und Statusverlauf an und liefert ihre Kennung. */
  duplicateAnmeldung: (id: ID) => ID;
  /**
   * Statuswechsel auf einen zulässigen Nachfolger. Liefert die Kennungen der
   * bei einer Aufteilung zusätzlich entstandenen Anmeldungen.
   */
  statusWechseln: (id: ID, w: Wechsel) => ID[];
  /** Nimmt den letzten Statuswechsel zurück. */
  statusZuruecknehmen: (id: ID) => void;
  /** Hält fest, dass nachgehakt wurde, und setzt ggf. einen neuen Termin. */
  nachgehakt: (id: ID, datum: ISODate, notiz: string, neuerTermin: ISODate | null) => void;
  /** Legt die Terminfrist im aktuellen Status von Hand fest (null: berechnen); setzt `geaendertAm`, wenn sie sich ändert. */
  terminSetzen: (id: ID, termin: ISODate | null) => void;
  /* Verwaltung */
  ersetzeDaten: (d: BaubetriebDaten) => void;
  zuruecksetzen: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

/** Ob sich zwei Fassungen einer Anmeldung in einem Feld unterscheiden (Werte, Listen, kleine Objekte). */
function unterscheidet(a: Anmeldung, b: Anmeldung): boolean {
  const schluessel = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof Anmeldung>;
  for (const k of schluessel) {
    if (a[k] !== b[k] && JSON.stringify(a[k]) !== JSON.stringify(b[k])) return true;
  }
  return false;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [geladen] = useState(ladeDaten);
  const [data, setData] = useState<BaubetriebDaten>(geladen.daten);
  const [ladeZustand, setLadeZustand] = useState<LadeZustand>(geladen.zustand);
  const [speicherZustand, setSpeicherZustand] = useState<SpeicherZustand>('ok');

  // Nach einem Ladefehler bzw. bei einer neueren Fassung bleibt der gespeicherte Stand unberührt
  // Ein aus einem anderen Fenster nachgeladener Stand steht schon im Speicher – nicht zurückschreiben
  const uebernommen = useRef<BaubetriebDaten | null>(null);
  useEffect(() => {
    if (ladeZustand !== 'ok' || data === uebernommen.current) return;
    setSpeicherZustand(speichereDaten(data));
  }, [data, ladeZustand]);

  /** Jede Änderung läuft hierüber – die Funktion muss rein sein. */
  const mutate = useCallback((fn: (d: BaubetriebDaten) => BaubetriebDaten) => {
    setData((alt) => fn(alt));
  }, []);

  // Name und Farbmodus aus der gemeinsamen Anmeldung aller Bereiche (src/gemeinsam/benutzer.ts)
  useBenutzerAbgleich(
    data,
    (d, b) => d.einstellungen.bearbeiter !== b.name || d.einstellungen.farbmodus !== b.farbmodus,
    (b) =>
      mutate((d) =>
        d.einstellungen.bearbeiter === b.name && d.einstellungen.farbmodus === b.farbmodus
          ? d
          : { ...d, einstellungen: { ...d.einstellungen, bearbeiter: b.name, farbmodus: b.farbmodus } },
      ),
  );

  // Projekte mit dem Projektregister abgleichen – solange der gespeicherte Stand gelesen werden konnte.
  // Muss nach dem Speichern stehen: Ein anderes Fenster soll erst den Bestand, dann das Register erhalten.
  const { ersetzt, nachgeladen } = useRegisterAbgleich({
    bereich: 'baubetrieb',
    daten: data,
    aktiv: ladeZustand === 'ok',
    sicht: sichtFuerRegister,
    anwenden: (plan) => mutate((d) => registerPlanAnwenden(d, plan)),
  });

  // Hat ein anderes Fenster den Bestand gespeichert, gilt sein Stand: nachladen,
  // statt ihn mit dem nächsten Speichern zu überschreiben. Das andere Fenster hat
  // ihn schon ins Register übertragen und abgeglichen (`nachgeladen`: hier weder
  // übertragen noch abgleichen, bis sich das Register ändert); er wird nicht
  // zurückgeschrieben (`uebernommen`). Stammt er aus einer neueren Fassung, ruht das Speichern.
  useFremdeAenderung(SPEICHER_SCHLUESSEL, ladeZustand === 'ok', () => {
    const neu = ladeDaten();
    uebernommen.current = neu.daten;
    nachgeladen(neu.daten);
    setLadeZustand(neu.zustand);
    setData(neu.daten);
  });

  /** Ändert eine Anmeldung; liefert `fn` sie unverändert zurück, bleibt der Bestand derselbe. */
  const anmeldungAendern = useCallback(
    (id: ID, fn: (a: Anmeldung) => Anmeldung) =>
      mutate((d) => {
        let geaendert = false;
        const anmeldungen = d.anmeldungen.map((a) => {
          if (a.id !== id) return a;
          const neu = fn(a);
          if (neu !== a) geaendert = true;
          return neu;
        });
        return geaendert ? { ...d, anmeldungen } : d;
      }),
    [mutate],
  );

  const value = useMemo<StoreValue>(
    () => ({
      data,
      ladeZustand,
      speicherZustand,
      setEinstellungen: (e) => mutate((d) => ({ ...d, einstellungen: { ...d.einstellungen, ...e } })),
      setRilFrist: (schluessel, patch) =>
        mutate((d) => ({
          ...d,
          einstellungen: {
            ...d.einstellungen,
            rilFristen: {
              ...d.einstellungen.rilFristen,
              [schluessel]: { ...d.einstellungen.rilFristen[schluessel], platzhalter: false, ...patch },
            },
          },
        })),

      saveWorkflow: (w) => mutate((d) => workflowSpeichern(d, w)),
      deleteWorkflow: (id) => mutate((d) => workflowLoeschen(d, id)),

      addProjekt: (p) => {
        const id = newId('pr');
        mutate((d) => ({ ...d, projekte: [...d.projekte, { ...p, id }] }));
        return id;
      },
      updateProjekt: (id, patch) =>
        mutate((d) => ({ ...d, projekte: d.projekte.map((p) => (p.id === id ? { ...p, ...patch, id } : p)) })),
      deleteProjekt: (id) =>
        mutate((d) => ({
          ...d,
          projekte: d.projekte.filter((p) => p.id !== id),
          anmeldungen: d.anmeldungen.filter((a) => a.projektId !== id),
        })),
      toggleMarkiert: (id) =>
        mutate((d) => ({
          ...d,
          projekte: d.projekte.map((p) => (p.id === id ? { ...p, markiert: !p.markiert } : p)),
        })),

      addAnmeldung: (werte) => {
        const id = newId('an');
        const verlaufId = newId('vl');
        const erfasst = new Date().toISOString();
        mutate((d) => {
          const neu: Anmeldung = bauzeitraumAbgleichen(
            {
            ...werte,
            id,
            aenderungsNr: '',
            annexVII: null,
            terminManuell: null,
            herkunftId: null,
            geaendertAm: null,
            verlauf: [
              {
                id: verlaufId,
                typ: 'anlage',
                datum: werte.statusSeit,
                erfasst,
                bearbeiter: d.einstellungen.bearbeiter,
                von: null,
                nach: werte.statusId,
                vonText: '',
                nachText: zielText(d.workflows, werte.statusId),
                text: 'Eintrag angelegt',
              },
            ],
            },
            d.workflows,
          );
          return { ...d, anmeldungen: [...d.anmeldungen, neu] };
        });
        return id;
      },
      updateAnmeldung: (id, patch) => {
        const heute = today();
        mutate((d) => {
          let geaendert = false;
          const anmeldungen = d.anmeldungen.map((a) => {
            if (a.id !== id) return a;
            const neu = bauzeitraumAbgleichen({ ...a, ...patch, id }, d.workflows);
            // Nur eine tatsächliche Änderung zählt – „Speichern“ ohne Änderung verschiebt den Sachstand nicht
            if (!unterscheidet(bauzeitraumAbgleichen(a, d.workflows), neu)) return a;
            geaendert = true;
            return { ...neu, geaendertAm: heute };
          });
          return geaendert ? { ...d, anmeldungen } : d;
        });
      },
      deleteAnmeldung: (id) =>
        mutate((d) => ({
          ...d,
          anmeldungen: d.anmeldungen
            .filter((a) => a.id !== id)
            .map((a) => (a.herkunftId === id ? { ...a, herkunftId: null } : a)),
        })),

      duplicateAnmeldung: (id) => {
        // Kennungen vor mutate() – im StrictMode läuft die Änderungsfunktion doppelt.
        const quelle = data.anmeldungen.find((a) => a.id === id);
        const ids = {
          anmeldung: newId('an'),
          verlauf: (quelle?.verlauf ?? []).map(() => newId('vl')),
          vermerk: newId('vl'),
        };
        const erfasst = new Date().toISOString();
        mutate((d) => anmeldungDuplizieren(d, id, ids, d.einstellungen.bearbeiter, erfasst, today()));
        return ids.anmeldung;
      },

      statusWechseln: (id, w) => {
        const ids = {
          verlauf: newId('vl'),
          weitere: (w.weitere ?? []).map(() => ({ anmeldung: newId('an'), verlauf: newId('vl') })),
        };
        const erfasst = new Date().toISOString();
        mutate((d) => wechselAnwenden(d, id, w, ids, d.einstellungen.bearbeiter, erfasst));
        return ids.weitere.map((x) => x.anmeldung);
      },
      statusZuruecknehmen: (id) => mutate((d) => wechselZuruecknehmen(d, id)),
      nachgehakt: (id, datum, notiz, neuerTermin) => {
        const verlaufId = newId('vl');
        const erfasst = new Date().toISOString();
        mutate((d) => ({
          ...d,
          anmeldungen: d.anmeldungen.map((a) =>
            a.id === id
              ? {
                  ...a,
                  terminManuell: neuerTermin ?? a.terminManuell,
                  verlauf: [
                    ...a.verlauf,
                    {
                      id: verlaufId,
                      typ: 'notiz',
                      datum,
                      erfasst,
                      bearbeiter: d.einstellungen.bearbeiter,
                      von: null,
                      nach: null,
                      vonText: '',
                      nachText: '',
                      text: [notiz.trim() || 'Nachgehakt', neuerTermin ? `neuer Termin ${neuerTermin}` : '']
                        .filter(Boolean)
                        .join(' · '),
                    },
                  ],
                }
              : a,
          ),
        }));
      },
      terminSetzen: (id, termin) => {
        const heute = today();
        anmeldungAendern(id, (a) => (a.terminManuell === termin ? a : { ...a, terminManuell: termin, geaendertAm: heute }));
      },

      ersetzeDaten: (d) => {
        // Ein Stand aus einer neueren Fassung darf nicht überschrieben werden
        if (ladeZustand === 'neuere_fassung') return;
        ersetzt();
        mutate(() => d);
        setLadeZustand('ok');
      },
      zuruecksetzen: () => {
        if (ladeZustand === 'neuere_fassung') return;
        ersetzt();
        setLadeZustand('ok');
        const neu = seedDaten();
        // Persönliche Einstellungen bleiben erhalten.
        mutate((d) => ({
          ...neu,
          einstellungen: {
            ...neu.einstellungen,
            farbmodus: d.einstellungen.farbmodus,
            bearbeiter: d.einstellungen.bearbeiter,
          },
        }));
      },
    }),
    [data, ladeZustand, speicherZustand, mutate, anmeldungAendern, ersetzt],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore muss innerhalb des StoreProvider verwendet werden.');
  return ctx;
}
