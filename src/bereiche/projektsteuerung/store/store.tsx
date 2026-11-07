/**
 * Datenbestand des Bereichs „Projektsteuerung“. Alle Schreibzugriffe laufen
 * über `mutate()`; danach werden die Teilnehmenden der Protokolle mit der
 * Projektbeteiligtenliste abgeglichen (`teilnehmerNachziehen`) und der
 * Bestand lokal gespeichert. Der Aufbau entspricht dem des
 * Planlaufmanagements, ist davon aber getrennt – gemeinsam ist nur das
 * Projektregister (`src/gemeinsam/`): Projekte und Projektbeteiligte gleicht
 * der Store nach jeder Änderung mit ihm ab (`useRegisterAbgleich`,
 * domain/register.ts). Name und Farbmodus unter „Angemeldet als“ spiegeln die
 * gemeinsame Anmeldung aller Bereiche (`useBenutzerAbgleich`,
 * src/gemeinsam/benutzer.ts).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useRegisterAbgleich } from '../../../gemeinsam/useRegisterAbgleich';
import { useFremdeAenderung } from '../../../gemeinsam/useFremdeAenderung';
import { useBenutzerAbgleich } from '../../../gemeinsam/useBenutzerAbgleich';
import { folgeprotokoll, naechsteNr, teilnehmerNachziehen } from '../domain/protokoll';
import { registerPlanAnwenden, sichtFuerRegister } from '../domain/register';
import { seedDaten } from '../domain/seed';
import {
  newId,
  type Beteiligter,
  type Einstellungen,
  type Funktion,
  type ID,
  type Logo,
  type Projekt,
  type ProjektsteuerungDaten,
  type Protokoll,
} from '../domain/types';
import type { Punkt } from '../domain/punkte';
import { SPEICHER_SCHLUESSEL, ladeDaten, speichereDaten, type LadeZustand, type SpeicherZustand } from './storage';

export { newId };

/** Lässt Logos von Protokollreihen fallen, die es nicht mehr gibt. */
function reihenLogosBereinigen(d: ProjektsteuerungDaten): ProjektsteuerungDaten {
  const reihen = new Set(d.protokolle.map((p) => p.reiheId));
  const ids = Object.keys(d.reihenLogos);
  if (ids.every((id) => reihen.has(id))) return d;
  return { ...d, reihenLogos: Object.fromEntries(ids.filter((id) => reihen.has(id)).map((id) => [id, d.reihenLogos[id]])) };
}

interface StoreValue {
  data: ProjektsteuerungDaten;
  /** Ergebnis des Ladens; außer bei 'ok' werden Demodaten gezeigt und nichts gespeichert. */
  ladeZustand: LadeZustand;
  /** Ergebnis des letzten Speicherns: 'voll' bzw. 'gesperrt' – nicht gespeichert (Hinweis: components/Hinweisleisten.tsx). */
  speicherZustand: SpeicherZustand;
  /* Einstellungen */
  setEinstellungen: (e: Partial<Einstellungen>) => void;
  /* Gewerke */
  addGewerk: (name: string) => void;
  /** Löscht ein Gewerk samt seiner Funktionen; ob diese noch Personen tragen, prüft die Oberfläche vorher. */
  deleteGewerk: (name: string) => void;
  /* Funktionen (projektübergreifend) */
  addFunktion: (f: Omit<Funktion, 'id'>) => ID;
  updateFunktion: (id: ID, patch: Partial<Omit<Funktion, 'id'>>) => void;
  /** Löscht eine Funktion; ob sie noch Projektbeteiligten zugeordnet ist, prüft die Oberfläche vorher. */
  deleteFunktion: (id: ID) => void;
  /* Projekte */
  addProjekt: (p: Omit<Projekt, 'id'>) => ID;
  updateProjekt: (id: ID, patch: Partial<Omit<Projekt, 'id'>>) => void;
  /** Löscht das Projekt mit Beteiligten und Protokollen. */
  deleteProjekt: (id: ID) => void;
  toggleMarkiert: (id: ID) => void;
  /* Projektbeteiligte */
  addBeteiligter: (b: Omit<Beteiligter, 'id'>) => ID;
  updateBeteiligter: (id: ID, patch: Partial<Omit<Beteiligter, 'id' | 'projektId'>>) => void;
  /** Entfernt die Person; in Protokollen bleiben ihre Angaben als Text stehen. */
  deleteBeteiligter: (id: ID) => void;
  /* Protokolle */
  addProtokoll: (p: Protokoll) => void;
  /** Ändert ein Protokoll über eine reine Funktion und vermerkt den Zeitpunkt. */
  updateProtokoll: (id: ID, fn: (p: Protokoll) => Protokoll) => void;
  /** Löscht ein Protokoll; Aufgaben, die es weitergeführt hat, gelten im Vorprotokoll wieder als offen. */
  deleteProtokoll: (id: ID) => void;
  /** Legt das Folgeprotokoll an (Nummer: höchste der Reihe + 1) und liefert seine Kennung. */
  folgeprotokollAnlegen: (id: ID) => ID | null;
  /** Übernimmt Protokolle (etwa aus dem Protokoll-Tool); gleiche Kennungen werden ersetzt. */
  protokolleUebernehmen: (liste: Protokoll[]) => void;
  /** Eigene Logos einer Protokollreihe; null = wieder die Logos des Projekts. */
  setReihenLogos: (reiheId: ID, logos: Logo[] | null) => void;
  /* Aufgaben aus den Protokollen */
  /** Setzt „erledigt“ an einer Aufgabe – Eintrag oder Ergänzung mit eigener Art. */
  punktErledigen: (punkt: Punkt, erledigt: boolean) => void;
  /* Verwaltung */
  ersetzeDaten: (d: ProjektsteuerungDaten) => void;
  zuruecksetzen: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [geladen] = useState(ladeDaten);
  const [data, setData] = useState<ProjektsteuerungDaten>(geladen.daten);
  const [ladeZustand, setLadeZustand] = useState<LadeZustand>(geladen.zustand);
  const [speicherZustand, setSpeicherZustand] = useState<SpeicherZustand>('ok');

  // Nach einem Ladefehler bzw. bei einer neueren Fassung bleibt der gespeicherte Stand unberührt
  // Ein aus einem anderen Fenster nachgeladener Stand steht schon im Speicher – nicht zurückschreiben
  const uebernommen = useRef<ProjektsteuerungDaten | null>(null);
  useEffect(() => {
    if (ladeZustand !== 'ok' || data === uebernommen.current) return;
    setSpeicherZustand(speichereDaten(data));
  }, [data, ladeZustand]);

  /** Jede Änderung läuft hierüber – die Funktion muss rein sein. */
  const mutate = useCallback((fn: (d: ProjektsteuerungDaten) => ProjektsteuerungDaten) => {
    setData((alt) => {
      const neu = fn(alt);
      return neu === alt ? alt : teilnehmerNachziehen(neu);
    });
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

  // Projekte und Beteiligte mit dem Projektregister abgleichen – solange der gespeicherte Stand gelesen werden konnte.
  // Muss nach dem Speichern stehen: Ein anderes Fenster soll erst den Bestand, dann das Register erhalten.
  const { ersetzt, nachgeladen } = useRegisterAbgleich({
    bereich: 'projektsteuerung',
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

  const protokollAendern = useCallback(
    (id: ID, fn: (p: Protokoll) => Protokoll) =>
      mutate((d) => ({
        ...d,
        protokolle: d.protokolle.map((p) => (p.id === id ? { ...fn(p), id, geaendert: new Date().toISOString() } : p)),
      })),
    [mutate],
  );

  const value = useMemo<StoreValue>(
    () => ({
      data,
      ladeZustand,
      speicherZustand,
      setEinstellungen: (e) => mutate((d) => ({ ...d, einstellungen: { ...d.einstellungen, ...e } })),

      addGewerk: (name) =>
        mutate((d) =>
          d.gewerke.some((g) => g.toLowerCase() === name.trim().toLowerCase())
            ? d
            : { ...d, gewerke: [...d.gewerke, name.trim()].sort((a, b) => a.localeCompare(b, 'de')) },
        ),
      deleteGewerk: (name) =>
        mutate((d) => {
          const gleich = (g: string | null) => (g ?? '').toLowerCase() === name.toLowerCase();
          const weg = new Set(d.funktionen.filter((f) => gleich(f.gewerk)).map((f) => f.id));
          return {
            ...d,
            gewerke: d.gewerke.filter((g) => !gleich(g)),
            funktionen: d.funktionen.filter((f) => !weg.has(f.id)),
            beteiligte: d.beteiligte.map((b) => (b.funktionId && weg.has(b.funktionId) ? { ...b, funktionId: null } : b)),
          };
        }),

      addFunktion: (f) => {
        const id = newId('fn');
        mutate((d) => {
          // Ein Gewerk, das es noch nicht gibt, kommt mit der Funktion hinzu.
          const neuesGewerk = f.gewerk && !d.gewerke.some((g) => g.toLowerCase() === f.gewerk!.toLowerCase());
          return {
            ...d,
            gewerke: neuesGewerk ? [...d.gewerke, f.gewerk!].sort((a, b) => a.localeCompare(b, 'de')) : d.gewerke,
            funktionen: [...d.funktionen, { ...f, id }],
          };
        });
        return id;
      },
      updateFunktion: (id, patch) =>
        mutate((d) => ({ ...d, funktionen: d.funktionen.map((f) => (f.id === id ? { ...f, ...patch, id } : f)) })),
      deleteFunktion: (id) =>
        mutate((d) => ({
          ...d,
          funktionen: d.funktionen.filter((f) => f.id !== id),
          beteiligte: d.beteiligte.map((b) => (b.funktionId === id ? { ...b, funktionId: null } : b)),
        })),

      addProjekt: (p) => {
        const id = newId('pr');
        mutate((d) => ({ ...d, projekte: [...d.projekte, { ...p, id }] }));
        return id;
      },
      updateProjekt: (id, patch) =>
        mutate((d) => ({ ...d, projekte: d.projekte.map((p) => (p.id === id ? { ...p, ...patch, id } : p)) })),
      deleteProjekt: (id) =>
        mutate((d) =>
          reihenLogosBereinigen({
            ...d,
            projekte: d.projekte.filter((p) => p.id !== id),
            beteiligte: d.beteiligte.filter((b) => b.projektId !== id),
            protokolle: d.protokolle.filter((p) => p.projektId !== id),
          }),
        ),
      toggleMarkiert: (id) =>
        mutate((d) => ({
          ...d,
          projekte: d.projekte.map((p) => (p.id === id ? { ...p, markiert: !p.markiert } : p)),
        })),

      addBeteiligter: (b) => {
        const id = newId('bt');
        mutate((d) => ({ ...d, beteiligte: [...d.beteiligte, { ...b, id }] }));
        return id;
      },
      updateBeteiligter: (id, patch) =>
        mutate((d) => ({
          ...d,
          beteiligte: d.beteiligte.map((b) => (b.id === id ? { ...b, ...patch, id, projektId: b.projektId } : b)),
        })),
      deleteBeteiligter: (id) => mutate((d) => ({ ...d, beteiligte: d.beteiligte.filter((b) => b.id !== id) })),

      addProtokoll: (p) => mutate((d) => ({ ...d, protokolle: [...d.protokolle, p] })),
      updateProtokoll: protokollAendern,
      deleteProtokoll: (id) =>
        mutate((d) =>
          reihenLogosBereinigen({
            ...d,
            protokolle: d.protokolle
              .filter((p) => p.id !== id)
              .map((p) =>
                p.tops.some((t) => t.eintraege.some((e) => e.uebernommenIn === id))
                  ? {
                      ...p,
                      tops: p.tops.map((t) => ({
                        ...t,
                        eintraege: t.eintraege.map((e) => (e.uebernommenIn === id ? { ...e, uebernommenIn: null } : e)),
                      })),
                    }
                  : p,
              ),
          }),
        ),
      folgeprotokollAnlegen: (id) => {
        if (!data.protokolle.some((p) => p.id === id)) return null;
        // Die Kennung entsteht außerhalb von mutate, damit sie beim doppelten
        // Aufruf im StrictMode dieselbe bleibt.
        const neueId = newId('pt');
        mutate((d) => {
          const quelle = d.protokolle.find((p) => p.id === id);
          if (!quelle) return d;
          const { neu, vorher } = folgeprotokoll(quelle, neueId, naechsteNr(d.protokolle, quelle.reiheId));
          return { ...d, protokolle: [...d.protokolle.map((p) => (p.id === id ? vorher : p)), neu] };
        });
        return neueId;
      },
      protokolleUebernehmen: (liste) =>
        mutate((d) => {
          const ids = new Set(liste.map((p) => p.id));
          return { ...d, protokolle: [...d.protokolle.filter((p) => !ids.has(p.id)), ...liste] };
        }),
      setReihenLogos: (reiheId, logos) =>
        mutate((d) => {
          const { [reiheId]: _alt, ...andere } = d.reihenLogos;
          return { ...d, reihenLogos: logos ? { ...andere, [reiheId]: logos } : andere };
        }),

      punktErledigen: (punkt, erledigt) => {
        const status = erledigt ? ('erledigt' as const) : ('offen' as const);
        protokollAendern(punkt.protokollId, (p) => ({
          ...p,
          tops: p.tops.map((t) => ({
            ...t,
            eintraege: t.eintraege.map((e) =>
              e.id === punkt.id
                ? { ...e, status }
                : { ...e, zeilen: e.zeilen.map((z) => (z.id === punkt.id ? { ...z, status } : z)) },
            ),
          })),
        }));
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
        mutate(() => seedDaten());
        setLadeZustand('ok');
      },
    }),
    [data, ladeZustand, speicherZustand, mutate, protokollAendern, ersetzt],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore außerhalb von StoreProvider');
  return ctx;
}
