/**
 * Datenbestand des Bereichs „Leistungsnachweise“. Alle Schreibzugriffe laufen
 * über `mutate()`; danach setzt `nachweiseBereinigen` den Änderungszeitpunkt
 * geänderter Nachweise und verwirft Nachweise ohne Projekt, und der Bestand
 * wird lokal gespeichert – aber nur, wenn er einwandfrei geladen wurde
 * (`ladeZustand` 'ok'). Der Aufbau entspricht dem der Projektsteuerung, ist
 * davon aber getrennt – gemeinsam ist nur das Projektregister
 * (`src/gemeinsam/`), mit dem der Store die Projekte nach jeder Änderung
 * abgleicht (`useRegisterAbgleich`, domain/register.ts).
 *
 * Kennungen, die die Oberfläche braucht, entstehen vor `mutate()`; solche,
 * die erst in der Änderung anfallen (Nachweise, Abschnitte), liefert ein
 * Vorrat (`idVorrat`), der beim doppelten Aufruf im StrictMode dieselben
 * Kennungen wieder ausgibt.
 *
 * „Angemeldet als“ (src/gemeinsam/benutzer.ts) gilt auch hier – eine eigene
 * Anmeldung gibt es nicht: Der Store zieht Name, Farbmodus und den
 * Mitarbeiter dieses Namens nach jeder Änderung nach und legt im Bereich
 * (nicht im Controlling) eine fehlende Person selbst an, sobald der Name Vor-
 * und Nachnamen hat (`anmeldungAnwenden`, domain/rechte.ts) – mit einer aus
 * dem Namen abgeleiteten Kennung (`mitarbeiterKennung`), damit StrictMode und
 * zwei Fenster keine Doppel erzeugen. Nur bei `ladeZustand` 'ok'.
 *
 * Gemeinsame Leistungstexte je Zeitraum und Monatsbestätigungen
 * (domain/erfassung.ts) ändern nur `periodentextSetzen`, `monatBestaetigen`
 * und `bestaetigungZuruecknehmen`; nach jeder Änderung ziehen die Texte mit,
 * wenn sich die Grenzen der Nachweise ändern (`periodentexteNachziehen`), und
 * `erfassungBereinigen` räumt Texte und Bestätigungen gelöschter Projekte bzw.
 * Mitarbeiter ab.
 *
 * Die Rechte (domain/rechte.ts) werden hier durchgesetzt: Jede Änderung prüft
 * sie auf dem Stand, den sie ändert – ohne Recht ändert eine Methode nichts.
 * Der Zugang (`zugang`) kommt von außen: Der Bereich bindet den Store mit
 * 'bereich' ein, der Controlling-Bereich von KaPlan (nach der PIN) mit
 * 'controlling' (controlling.tsx).
 * Rückgabewerte (Kennungen, Meldungen) rechnet die Methode zusätzlich auf dem
 * angezeigten Stand. Mit der gemeinsamen Datenbank gehen dieselben Prüfungen
 * auf den Server über.
 *
 * Bereich und Controlling können in zwei Fenstern zugleich offen sein und
 * teilen denselben Schlüssel: Speichert das andere Fenster, übernimmt der
 * Store dessen Stand (`useFremdeAenderung`, `ladeDaten`), ohne ihn
 * zurückzuschreiben und ohne ihn mit dem Projektregister abzugleichen
 * (`nachgeladen`, src/gemeinsam/useRegisterAbgleich.ts) – so überschreibt
 * keines die Änderungen des anderen; einen Stand aus einer
 * neueren Fassung überschreibt es nicht, sondern speichert nicht mehr. Lässt sich nicht speichern
 * (Speicher voll), meldet `speicherZustand` das für einen dauerhaften Hinweis.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useRegisterAbgleich } from '../../../gemeinsam/useRegisterAbgleich';
import { useBenutzerAbgleich } from '../../../gemeinsam/useBenutzerAbgleich';
import { useFremdeAenderung } from '../../../gemeinsam/useFremdeAenderung';
import { abschnitteAusElementen, importAnwenden, type ImportPlan } from '../domain/import';
import {
  bestaetigenAnwenden,
  bestaetigenMeldung,
  bestaetigungZuruecknehmenAnwenden,
  erfassungBereinigen,
  erfassungsPeriodeZu,
  gesperrtHinweis,
  monatsStatus,
  periodentextAnwenden,
  periodentexteNachziehen,
} from '../domain/erfassung';
import {
  abgerechnetIn,
  aufschlagPruefen,
  leistungenDesNachweises,
  leistungenOhneNachweis,
  mitAufschlag,
  mitZeilenText,
  nachweisAbschliessenAnwenden,
  nachweisFuerNichtAbgerechneteAnwenden,
  nachreichenAnwenden,
  nachweiseBereinigen,
  nichtAbgerechnet,
  tagVon,
  nachweiseSichern,
  ueberschneidung,
} from '../domain/nachweis';
import {
  NICHT_ANGEMELDET,
  NUR_CONTROLLING,
  anmeldungAnwenden,
  angemeldet,
  darf,
  darfBestaetigen,
  darfLeistungAendern,
  darfPeriodentextBearbeiten,
  eigeneLeistungen,
  mitarbeiterKennung,
  mitarbeiterLoeschenPruefen,
  type Zugang,
} from '../domain/rechte';
import { registerPlanAnwenden, sichtFuerRegister } from '../domain/register';
import { seedDaten } from '../domain/seed';
import {
  newId,
  type ID,
  type Leistung,
  type Leistungsnachweis,
  type LeistungsnachweisDaten,
  type Mitarbeiter,
  type NachweisZeile,
  type Projekt,
  type Quelle,
  type Raster,
} from '../domain/types';
import { istDatum, istMonat, runden } from '../domain/zeitraum';
import { SPEICHER_SCHLUESSEL, ladeDaten, speichereDaten, type LadeZustand, type SpeicherZustand } from './storage';

export { newId };

interface StoreValue {
  data: LeistungsnachweisDaten;
  /** Zugang, unter dem der Store eingebunden ist: im Bereich oder im Controlling (nach der PIN). */
  zugang: Zugang;
  /** Kurz für `zugang === 'controlling'`. */
  controlling: boolean;
  /** 'ok' – es wird gespeichert; sonst zeigt der Bereich Demodaten und lässt den gespeicherten Stand unberührt. */
  ladeZustand: LadeZustand;
  /** Ergebnis des letzten Speicherns: 'voll' bzw. 'gesperrt' – nicht gespeichert (Hinweis: components/SpeicherHinweis.tsx). */
  speicherZustand: SpeicherZustand;
  /*
   * Anmeldung: Name und Farbmodus kommen aus der gemeinsamen Anmeldung aller
   * Bereiche (src/gemeinsam/benutzer.ts); der Store zieht sie samt dem
   * passenden Mitarbeiter (`mitarbeiterZumNamen`) nach jeder Änderung nach und
   * legt ihn im Bereich bei Bedarf selbst an (`anmeldungAnwenden`). Wie die Lage
   * gerade ist, sagt `anmeldeLage` (domain/rechte.ts; Oberfläche:
   * components/Anmeldung.tsx).
   */
  /* Mitarbeiter (nur Controlling) */
  /** Legt einen Mitarbeiter an; null ohne Recht. */
  addMitarbeiter: (m: Omit<Mitarbeiter, 'id'>) => ID | null;
  /** Ändert einen Mitarbeiter; liefert die Meldung oder null. */
  updateMitarbeiter: (id: ID, patch: Partial<Omit<Mitarbeiter, 'id'>>) => string | null;
  /** Nur ohne Leistungen; liefert die Meldung oder null. */
  deleteMitarbeiter: (id: ID) => string | null;
  /* Projekte */
  /** Nur Controlling; null ohne Recht. */
  addProjekt: (p: Omit<Projekt, 'id'>) => ID | null;
  /** Ändern (nur Controlling); entfallene Abschnitte verlieren ihre Leistungen (diese stehen dann ohne Abschnitt). */
  updateProjekt: (id: ID, patch: Partial<Omit<Projekt, 'id'>>) => void;
  /** Mit allen Leistungen und Nachweisen – nur Controlling. */
  deleteProjekt: (id: ID) => void;
  /** Markieren für Übersicht und Seitenleiste – jeder. */
  toggleMarkiert: (id: ID) => void;
  /**
   * Abschnitte aus den Projektelementen der Leistungen anlegen und Leistungen ohne Abschnitt
   * zuordnen (nur Controlling); liefert die Zahl neuer Abschnitte.
   */
  abschnitteAusProjektelementen: (projektId: ID) => number;
  /* Leistungen – nur eigene */
  /**
   * Legt eine Leistung der angemeldeten Person an und ergänzt bei Bedarf einen Nachweis
   * (`nachweiseErgaenzen`); liefert die ID, ohne Anmeldung null (keine Änderung).
   */
  addLeistung: (l: Omit<Leistung, 'id' | 'erfasst' | 'quelle' | 'mitarbeiterId'> & { quelle?: Quelle }) => ID | null;
  /**
   * Ändern – nur eigene; Mitarbeiter und Projekt bleiben. Ein neues Datum außerhalb aller Nachweise ergänzt einen –
   * außer die Leistung ist schon abgerechnet (`abgerechnetIn`): Sie bleibt im Stand ihres abgeschlossenen Nachweises.
   */
  updateLeistung: (id: ID, patch: Partial<Omit<Leistung, 'id' | 'projektId' | 'mitarbeiterId'>>) => void;
  /** Nur eigene. */
  deleteLeistung: (id: ID) => void;
  /** Nur eigene; fremde Kennungen bleiben unberührt. */
  deleteLeistungen: (ids: ID[]) => void;
  /* Gemeinsame Leistungstexte und Monatsbestätigung (domain/erfassung.ts) – nur im Bereich, nur die angemeldete Person */
  /**
   * Setzt den gemeinsamen Text einer Erfassungsperiode (`schluessel` etwa „2026-10|W2026-44“) – nur,
   * wer darin eigene Leistungen hat, und nur, solange sie nicht gesperrt ist
   * (`darfPeriodentextBearbeiten`). Merkt sich die eigenen Leistungen der Periode, den Namen unter
   * „Angemeldet als“ und den Zeitpunkt; ein leerer Text entfernt den Eintrag. Mit
   * `neueStichpunkteOffenLassen` bleiben die bisher gemerkten Leistungen (beim bloßen
   * Weiterschreiben, damit „Neue Stichpunkte“ nicht verschwindet). Liefert die Meldung oder null.
   */
  periodentextSetzen: (projektId: ID, schluessel: string, text: string, optionen?: { neueStichpunkteOffenLassen?: boolean }) => string | null;
  /**
   * Bestätigt den Monat (JJJJ-MM) der angemeldeten Person im Projekt – nur ohne Zeitraum ohne Text
   * und nicht bei 'keine'/'abgerechnet' (`MonatsStatus.bestaetigbar`); ersetzt eine frühere
   * Bestätigung. Liefert die Meldung oder null (auch, wenn er schon bestätigt ist).
   */
  monatBestaetigen: (projektId: ID, monat: string) => string | null;
  /** Nimmt die eigene Bestätigung des Monats zurück (nur im Bereich). */
  bestaetigungZuruecknehmen: (projektId: ID, monat: string) => void;
  /** Fehlende Nachweise für alle Leistungen ohne Nachweis des Projekts anlegen (nur Controlling); liefert { neu, erweitert } (Anzahl). */
  nachweiseFuerOffeneLeistungen: (projektId: ID) => { neu: number; erweitert: number };
  /* Nachweise */
  /**
   * „Neuer Leistungsnachweis“ (nur Controlling): ohne Zeitraum, für alle nicht abgerechneten
   * Leistungen des Projekts (`nichtAbgerechnet`); offene Nachweise gehen darin auf, mit
   * `nachreichen` (nach der Rückfrage) auch die nicht erfassten Leistungen. Liefert die Kennung
   * des Nachweises – bzw. des vorhandenen, der schon alles enthält – oder null ohne Recht.
   */
  nachweisFuerNichtAbgerechnete: (projektId: ID, vorgaben: { raster: Raster; titel: string; nachreichen?: boolean }) => ID | null;
  /** Übernimmt die nicht erfassten Leistungen als nachgereichte in den offenen Nachweis (nur Controlling, nach Rückfrage). */
  leistungenNachreichen: (nachweisId: ID) => void;
  /**
   * Zeitraum, Raster, Titel und Bemerkung – nur Controlling (Zeitraum ohne Überschneidung). Ein
   * geändertes Ende legt den Zeitraum fest (`bisFest`: läuft nicht mehr bis zum Abschluss), außer
   * der Patch nennt `bisFest` ausdrücklich.
   */
  updateNachweis: (id: ID, patch: Partial<Pick<Leistungsnachweis, 'titel' | 'von' | 'bis' | 'bisFest' | 'raster' | 'bemerkung'>>) => void;
  /**
   * Löscht den Nachweis (nur Controlling); mitLeistungen = auch die eigenen Leistungen des
   * Nachweises löschen – dieselben, die die Oberfläche nennt (`leistungenDesNachweises` mit
   * `eigeneLeistungen`): samt seinen nachgereichten, ohne die in einen anderen Nachweis
   * nachgereichten. Leistungen anderer bleiben – sie löscht auch das Controlling nicht.
   */
  deleteNachweis: (id: ID, mitLeistungen: boolean) => void;
  /** Text einer Zeile setzen (mit den Leistungs-IDs der Zeile); null = wieder automatisch. Nur Controlling, nur offene Nachweise. */
  zeilenTextSetzen: (nachweisId: ID, zeile: NachweisZeile, text: string | null) => void;
  /**
   * Abschließen (nur Controlling, nur offene): fortlaufende Nachweise enden am letzten Tag mit
   * Leistungen (`abschlussZeitraum`), der Stand wird mit Aufschlägen festgeschrieben.
   */
  nachweisAbschliessen: (id: ID) => void;
  /** Status in Bearbeitung, Stand verwerfen (nur Controlling; die Rückfrage macht die Oberfläche). */
  nachweisOeffnen: (id: ID) => void;
  /**
   * Aufschlag einer Zeile (± Stunden; null/0 entfernt) – nur Controlling, nur offene Nachweise.
   * Ohne Abschnittsspalten gilt er der ganzen Zeile (`abschnittId` null). Liefert die Meldung
   * (`AUFSCHLAG_KEINE_ZAHL`, `AUFSCHLAG_UNTER_NULL` …) oder null.
   */
  aufschlagSetzen: (nachweisId: ID, zeilenSchluessel: string, abschnittId: ID | null, stunden: number | null) => string | null;
  /** Alle Aufschläge des Nachweises entfernen – nur Controlling, nur offen. */
  aufschlaegeZuruecksetzen: (nachweisId: ID) => void;
  /* Import */
  /**
   * Übernimmt den Plan (`importPlanen`). Im Controlling alles (Sammel-Import); im Bereich ohne
   * Anmeldung nichts, sonst nur eigene Leistungen, keine neuen Mitarbeiter und nur eigene frühere
   * Importe als „ersetzt“.
   */
  importUebernehmen: (plan: ImportPlan) => void;
  /* Verwaltung */
  /** Ersetzt den Bestand (Sicherung einspielen); danach wird wieder gespeichert. */
  ersetzeDaten: (d: LeistungsnachweisDaten) => void;
  /** Demodaten laden; bei einem Stand aus einer neueren Fassung wirkungslos, damit er nicht verloren geht. */
  zuruecksetzen: () => void;
}

/** Eine Änderung: rein, mit dem Zeitpunkt der Änderung. */
export type Aenderung = (d: LeistungsnachweisDaten, jetzt: string) => LeistungsnachweisDaten;

/**
 * Vorrat an Kennungen für eine Änderungsfunktion, die im StrictMode doppelt
 * läuft: Jeder Durchlauf (`folge()`) erhält je Präfix dieselbe Folge von
 * Kennungen; erzeugt wird nur, was der erste Durchlauf braucht.
 */
function idVorrat(): () => (prefix: string) => ID {
  const vorrat: Record<string, ID[]> = {};
  return () => {
    const zaehler: Record<string, number> = {};
    return (prefix) => {
      const n = zaehler[prefix] ?? 0;
      zaehler[prefix] = n + 1;
      const liste = (vorrat[prefix] ??= []);
      if (liste.length <= n) liste.push(newId(prefix));
      return liste[n];
    };
  };
}

/** Ändert ein Element einer Liste; die Kennung bleibt. */
const aendern = <T extends { id: ID }>(liste: T[], id: ID, fn: (x: T) => T): T[] =>
  liste.map((x) => (x.id === id ? { ...fn(x), id } : x));

/** Felder ohne `undefined` – ein Patch soll nichts auf undefined setzen. */
const ohneLeere = <T extends object>(patch: T): T =>
  Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)) as T;

/** Änderung anwenden – im Store über `setData`, in Prüfungen auf einem lokalen Stand. */
export type Mutate = (fn: Aenderung, optionen?: { zeitstempel?: boolean }) => void;

/** Die Methoden des Stores ohne Zustände (für Prüfungen auch außerhalb von React nutzbar). */
export type StoreAktionen = Omit<
  StoreValue,
  'data' | 'zugang' | 'controlling' | 'ladeZustand' | 'speicherZustand' | 'ersetzeDaten' | 'zuruecksetzen'
>;

/**
 * Beschränkt einen Importplan auf das, was der Zugang darf: im Controlling
 * alles (Sammel-Import); im Bereich ohne Anmeldung nichts, sonst nur eigene
 * neue Leistungen, keine neuen Mitarbeiter und als „ersetzt“ nur eigene
 * frühere Importe. Ausnahme vom Rechtemodell (domain/rechte.ts): Projekte,
 * Abschnitte und Nachweise, die die eigenen Leistungen brauchen, legt der
 * Import auch im Bereich an – unbekannte Projekte nur, wenn in der Vorschau
 * „Projekt anlegen“ angehakt ist. Einstellen lassen sie sich danach nur im
 * Controlling (`projektVerwalten`).
 */
function planErlaubt(d: LeistungsnachweisDaten, plan: ImportPlan, zugang: Zugang): ImportPlan | null {
  if (darf(zugang, 'sammelImport')) return plan;
  const ich = angemeldet(d);
  if (!ich) return null;
  const eigen = new Set(d.leistungen.filter((l) => l.mitarbeiterId === ich.id && l.quelle === 'import').map((l) => l.id));
  const neueLeistungen = plan.neueLeistungen.filter((l) => l.mitarbeiterId === ich.id);
  // Projekte und Nachweise nur, soweit eigene Leistungen sie brauchen
  const projekte = new Set(neueLeistungen.map((l) => l.projektId));
  const brauchtNachweis = (projektId: ID, von: string, bis: string) =>
    neueLeistungen.some((l) => l.projektId === projektId && l.datum >= von && l.datum <= bis);
  return {
    ...plan,
    neueMitarbeiter: [],
    // Ausnahme (siehe oben): Projekte und Abschnitte für die eigenen Leistungen
    neueProjekte: plan.neueProjekte.filter((p) => projekte.has(p.id)),
    neueLeistungen,
    neueNachweise: plan.neueNachweise.filter((n) => brauchtNachweis(n.projektId, n.von, n.bis)),
    erweiterteNachweise: plan.erweiterteNachweise.filter((e) => {
      const n = d.nachweise.find((x) => x.id === e.id);
      return !!n && brauchtNachweis(n.projektId, e.von, e.bis);
    }),
    entfernen: plan.entfernen.filter((id) => eigen.has(id)),
  };
}

/**
 * Die Methoden des Stores auf dem Stand `data`. Jede Methode ist genau ein
 * `mutate`; Rückgabewerte für die Oberfläche (etwa die Zahl neuer Nachweise)
 * werden zusätzlich auf `data` gerechnet – mit denselben Kennungen.
 */
export function storeAktionen(data: LeistungsnachweisDaten, mutate: Mutate, zugang: Zugang = 'bereich'): StoreAktionen {
  /** Ändert einen Nachweis, wenn `erlaubt` auf dem aktuellen Stand zutrifft. */
  const nachweisAendern = (
    id: ID,
    erlaubt: (n: Leistungsnachweis, d: LeistungsnachweisDaten) => boolean,
    fn: (n: Leistungsnachweis, d: LeistungsnachweisDaten, jetzt: string) => Leistungsnachweis,
  ) =>
    mutate((d, jetzt) => {
      const alt = d.nachweise.find((n) => n.id === id);
      if (!alt || !erlaubt(alt, d)) return d;
      return {
        ...d,
        nachweise: d.nachweise.map((n) => (n.id === id ? { ...fn(n, d, jetzt), id, projektId: n.projektId, geaendert: jetzt } : n)),
      };
    });
  /** Nur im Controlling. */
  const controllingNur = (fn: Aenderung): Aenderung => (d, jetzt) => (zugang === 'controlling' ? fn(d, jetzt) : d);

  /** Prüft das Setzen eines gemeinsamen Texts auf dem Stand `d`; liefert die Meldung oder null. */
  const periodentextPruefen = (d: LeistungsnachweisDaten, projektId: ID, schluessel: string): string | null => {
    if (zugang !== 'bereich') return 'Die gemeinsamen Leistungstexte verfassen die Mitarbeiter im Bereich Leistungsnachweise.';
    const ich = angemeldet(d);
    if (!ich) return NICHT_ANGEMELDET;
    const periode = erfassungsPeriodeZu(d, projektId, schluessel, ich.id);
    if (!periode || periode.eigene.length === 0) return 'In diesem Zeitraum haben Sie keine eigenen Leistungen.';
    if (periode.gesperrt) return gesperrtHinweis(periode);
    return darfPeriodentextBearbeiten(d, periode, zugang) ? null : 'Diesen Leistungstext können Sie nicht bearbeiten.';
  };
  /** Prüft das Bestätigen auf dem Stand `d`; liefert die Meldung oder null. */
  const bestaetigenPruefen = (d: LeistungsnachweisDaten, projektId: ID, monat: string): string | null => {
    if (zugang !== 'bereich') return 'Bestätigen können die Mitarbeiter nur ihre eigenen Monate im Bereich Leistungsnachweise.';
    const ich = angemeldet(d);
    if (!ich || !darfBestaetigen(d, ich.id, zugang)) return NICHT_ANGEMELDET;
    if (!istMonat(monat) || !d.projekte.some((p) => p.id === projektId)) return 'Diesen Monat bzw. dieses Projekt gibt es nicht.';
    return bestaetigenMeldung(monatsStatus(d, projektId, ich.id, monat));
  };

  return {
    addMitarbeiter: (m) => {
      if (!darf(zugang, 'mitarbeiterVerwalten')) return null;
      const id = newId('ma');
      mutate(controllingNur((d) => (d.mitarbeiter.some((x) => x.id === id) ? d : { ...d, mitarbeiter: [...d.mitarbeiter, { ...m, id }] })));
      return id;
    },
    updateMitarbeiter: (id, patch) => {
      if (!darf(zugang, 'mitarbeiterVerwalten')) return NUR_CONTROLLING;
      if (!data.mitarbeiter.some((m) => m.id === id)) return 'Diesen Mitarbeiter gibt es nicht (mehr).';
      const sauber = ohneLeere(patch);
      mutate(controllingNur((d) => ({ ...d, mitarbeiter: aendern(d.mitarbeiter, id, (m) => ({ ...m, ...sauber })) })));
      return null;
    },
    deleteMitarbeiter: (id) => {
      const meldung = mitarbeiterLoeschenPruefen(data, id, zugang);
      mutate((d) =>
        mitarbeiterLoeschenPruefen(d, id, zugang) === null
          ? {
              ...d,
              mitarbeiter: d.mitarbeiter.filter((m) => m.id !== id),
              bestaetigungen: d.bestaetigungen.filter((b) => b.mitarbeiterId !== id),
              einstellungen: d.einstellungen.mitarbeiterId === id ? { ...d.einstellungen, mitarbeiterId: null } : d.einstellungen,
            }
          : d,
      );
      return meldung;
    },

    addProjekt: (p) => {
      if (!darf(zugang, 'projektVerwalten')) return null;
      const id = newId('pr');
      mutate(controllingNur((d) => (d.projekte.some((x) => x.id === id) ? d : { ...d, projekte: [...d.projekte, { ...p, id }] })));
      return id;
    },
    updateProjekt: (id, patch) =>
      mutate(
        controllingNur((d) => {
          const projekte = aendern(d.projekte, id, (p) => ({ ...p, ...patch }));
          if (!patch.abschnitte) return { ...d, projekte };
          const gueltig = new Set(patch.abschnitte.map((a) => a.id));
          return {
            ...d,
            projekte,
            leistungen: d.leistungen.map((l) =>
              l.projektId === id && l.abschnittId && !gueltig.has(l.abschnittId) ? { ...l, abschnittId: null } : l,
            ),
          };
        }),
      ),
    deleteProjekt: (id) =>
      mutate(
        controllingNur((d) => ({
          ...d,
          projekte: d.projekte.filter((p) => p.id !== id),
          leistungen: d.leistungen.filter((l) => l.projektId !== id),
          nachweise: d.nachweise.filter((n) => n.projektId !== id),
          periodentexte: d.periodentexte.filter((t) => t.projektId !== id),
          bestaetigungen: d.bestaetigungen.filter((b) => b.projektId !== id),
        })),
      ),
    toggleMarkiert: (id) =>
      mutate((d) => ({ ...d, projekte: aendern(d.projekte, id, (p) => ({ ...p, markiert: !p.markiert })) })),
    abschnitteAusProjektelementen: (projektId) => {
      if (!darf(zugang, 'projektVerwalten')) return 0;
      const folge = idVorrat();
      // Die Zahl auf dem angezeigten Stand; die Kennungen gelten auch in der Änderung
      const { anzahl } = abschnitteAusElementen(data, projektId, folge());
      mutate(controllingNur((d) => abschnitteAusElementen(d, projektId, folge()).daten));
      return anzahl;
    },

    addLeistung: (l) => {
      if (!angemeldet(data)) return null;
      const id = newId('le');
      const folge = idVorrat();
      mutate((d, jetzt) => {
        const ich = angemeldet(d);
        if (!ich || d.leistungen.some((x) => x.id === id)) return d;
        const { mitarbeiterId: _fremd, ...werte } = l as typeof l & { mitarbeiterId?: ID };
        void _fremd;
        const leistung: Leistung = {
          ...werte,
          id,
          mitarbeiterId: ich.id,
          stunden: runden(l.stunden),
          quelle: l.quelle ?? 'manuell',
          erfasst: jetzt,
        };
        const ids = folge();
        return nachweiseSichern({ ...d, leistungen: [...d.leistungen, leistung] }, leistung.projektId, [leistung.datum], jetzt, () =>
          ids('ln'),
        ).daten;
      });
      return id;
    },
    updateLeistung: (id, patch) => {
      const folge = idVorrat();
      mutate((d, jetzt) => {
        const alt = d.leistungen.find((l) => l.id === id);
        if (!alt || !darfLeistungAendern(d, alt)) return d;
        const neu: Leistung = {
          ...alt,
          ...ohneLeere(patch),
          id,
          projektId: alt.projektId,
          mitarbeiterId: alt.mitarbeiterId,
          stunden: runden(patch.stunden ?? alt.stunden),
        };
        const daten = { ...d, leistungen: d.leistungen.map((l) => (l.id === id ? neu : l)) };
        // Eine abgerechnete Leistung bleibt im Stand ihres abgeschlossenen Nachweises – sie braucht keinen neuen
        if (neu.datum === alt.datum || abgerechnetIn(d, alt)) return daten;
        const ids = folge();
        return nachweiseSichern(daten, neu.projektId, [neu.datum], jetzt, () => ids('ln')).daten;
      });
    },
    deleteLeistung: (id) =>
      mutate((d) => {
        const l = d.leistungen.find((x) => x.id === id);
        return l && darfLeistungAendern(d, l) ? { ...d, leistungen: d.leistungen.filter((x) => x.id !== id) } : d;
      }),
    deleteLeistungen: (ids) => {
      const weg = new Set(ids);
      mutate((d) => {
        const loeschen = d.leistungen.filter((l) => weg.has(l.id) && darfLeistungAendern(d, l));
        if (loeschen.length === 0) return d;
        const raus = new Set(loeschen.map((l) => l.id));
        return { ...d, leistungen: d.leistungen.filter((l) => !raus.has(l.id)) };
      });
    },
    periodentextSetzen: (projektId, schluessel, text, optionen = {}) => {
      const meldung = periodentextPruefen(data, projektId, schluessel);
      if (meldung) return meldung;
      // Gemerkt werden nur die eigenen Leistungen – die Stichpunkte der anderen hat die Person nicht gesehen
      mutate((d, jetzt) =>
        periodentextPruefen(d, projektId, schluessel) === null
          ? periodentextAnwenden(d, projektId, schluessel, text, d.einstellungen.bearbeiter, jetzt, {
              neueStichpunkteOffenLassen: optionen.neueStichpunkteOffenLassen,
              mitarbeiterId: angemeldet(d)?.id,
            })
          : d,
      );
      return null;
    },
    monatBestaetigen: (projektId, monat) => {
      const meldung = bestaetigenPruefen(data, projektId, monat);
      if (meldung) return meldung;
      mutate((d, jetzt) => {
        const ich = angemeldet(d);
        return ich && bestaetigenPruefen(d, projektId, monat) === null ? bestaetigenAnwenden(d, projektId, ich.id, monat, jetzt) : d;
      });
      return null;
    },
    bestaetigungZuruecknehmen: (projektId, monat) =>
      mutate((d) => {
        const ich = angemeldet(d);
        return ich && darfBestaetigen(d, ich.id, zugang) ? bestaetigungZuruecknehmenAnwenden(d, projektId, ich.id, monat) : d;
      }),

    nachweiseFuerOffeneLeistungen: (projektId) => {
      if (!darf(zugang, 'nachweisVerwalten')) return { neu: 0, erweitert: 0 };
      const folge = idVorrat();
      const offen = (d: LeistungsnachweisDaten, jetzt: string) => {
        const ids = folge();
        return nachweiseSichern(d, projektId, leistungenOhneNachweis(d, projektId).map((l) => l.datum), jetzt, () => ids('ln'));
      };
      const { ergaenzung } = offen(data, new Date().toISOString());
      mutate(controllingNur((d, jetzt) => offen(d, jetzt).daten));
      return { neu: ergaenzung.neu.length, erweitert: ergaenzung.erweitert.length };
    },

    nachweisFuerNichtAbgerechnete: (projektId, vorgaben) => {
      if (!darf(zugang, 'nachweisVerwalten') || !data.projekte.some((p) => p.id === projektId)) return null;
      const id = newId('ln');
      // Die Kennung auf dem angezeigten Stand – die Änderung rechnet denselben Plan
      const plan = nichtAbgerechnet(data, projektId, tagVon(new Date().toISOString()));
      mutate(controllingNur((d, jetzt) => nachweisFuerNichtAbgerechneteAnwenden(d, projektId, vorgaben, id, jetzt)));
      return plan.vorhanden?.id ?? plan.offene[0]?.id ?? id;
    },
    leistungenNachreichen: (nachweisId) => {
      if (!darf(zugang, 'nachweisVerwalten')) return;
      mutate(controllingNur((d, jetzt) => nachreichenAnwenden(d, nachweisId, jetzt)));
    },
    updateNachweis: (id, patch) => {
      const sauber = ohneLeere(patch);
      if (Object.keys(sauber).length === 0) return;
      nachweisAendern(
        id,
        (n, d) => {
          if (!darf(zugang, 'nachweisVerwalten')) return false;
          const von = sauber.von ?? n.von;
          const bis = sauber.bis ?? n.bis;
          return istDatum(von) && istDatum(bis) && von <= bis && !ueberschneidung(d, n.projektId, von, bis, n.id);
        },
        // Ein von Hand geändertes Ende steht fest – der Nachweis läuft dann nicht mehr bis zum Abschluss
        (n) => ({ ...n, ...sauber, bisFest: sauber.bisFest ?? (sauber.bis !== undefined && sauber.bis !== n.bis ? true : n.bisFest) }),
      );
    },
    deleteNachweis: (id, mitLeistungen) =>
      mutate(
        controllingNur((d) => {
          const n = d.nachweise.find((x) => x.id === id);
          if (!n) return d;
          // Dieselbe Zuordnung wie die Anzeige – nicht nach Datum, sonst fielen nachgereichte heraus bzw. hinein
          const weg = new Set(mitLeistungen ? eigeneLeistungen(d, leistungenDesNachweises(d, n)).map((l) => l.id) : []);
          return {
            ...d,
            nachweise: d.nachweise.filter((x) => x.id !== id),
            leistungen: weg.size ? d.leistungen.filter((l) => !weg.has(l.id)) : d.leistungen,
          };
        }),
      ),
    zeilenTextSetzen: (nachweisId, zeile, text) =>
      nachweisAendern(
        nachweisId,
        (n) => darf(zugang, 'nachweisVerwalten') && n.status === 'entwurf',
        (n) => mitZeilenText(n, zeile, text),
      ),
    nachweisAbschliessen: (id) => {
      const folge = idVorrat();
      mutate(
        controllingNur((d, jetzt) => {
          const ids = folge();
          return nachweisAbschliessenAnwenden(d, id, jetzt, () => ids('ln'));
        }),
      );
    },
    nachweisOeffnen: (id) =>
      nachweisAendern(
        id,
        (n) => darf(zugang, 'abschliessen') && n.status === 'abgeschlossen',
        (n) => ({ ...n, status: 'entwurf', abgeschlossen: null, stand: null }),
      ),
    aufschlagSetzen: (nachweisId, zeilenSchluessel, abschnittId, stunden) => {
      const pruefen = (d: LeistungsnachweisDaten): string | null => {
        if (!darf(zugang, 'aufschlag')) return NUR_CONTROLLING;
        const n = d.nachweise.find((x) => x.id === nachweisId);
        if (!n) return 'Diesen Leistungsnachweis gibt es nicht (mehr).';
        if (n.status !== 'entwurf') return 'Der Leistungsnachweis ist abgeschlossen – Aufschläge erst nach „Wieder öffnen“.';
        return aufschlagPruefen(d, n, zeilenSchluessel, abschnittId, stunden);
      };
      const meldung = pruefen(data);
      if (meldung) return meldung;
      nachweisAendern(
        nachweisId,
        (_n, d) => pruefen(d) === null,
        (n, d) =>
          mitAufschlag(
            n,
            d.projekte.find((p) => p.id === n.projektId),
            zeilenSchluessel,
            abschnittId,
            stunden,
          ),
      );
      return null;
    },
    aufschlaegeZuruecksetzen: (nachweisId) =>
      nachweisAendern(
        nachweisId,
        (n) => darf(zugang, 'aufschlag') && n.status === 'entwurf' && Object.keys(n.aufschlaege).length > 0,
        (n) => ({ ...n, aufschlaege: {} }),
      ),

    importUebernehmen: (plan) =>
      mutate((d) => {
        const erlaubt = planErlaubt(d, plan, zugang);
        return erlaubt ? importAnwenden(d, erlaubt) : d;
      }),
  };
}

/**
 * Wendet eine Änderung an und räumt danach auf – rein: Ändern sich die Grenzen
 * der Nachweise, ziehen die gemeinsamen Texte mit (`periodentexteNachziehen`;
 * nicht ohne Zeitstempel – ein eingespielter Stand wird nicht mit dem
 * bisherigen verglichen), dann `nachweiseBereinigen` und `erfassungBereinigen`.
 */
export function aenderungAnwenden(
  alt: LeistungsnachweisDaten,
  fn: Aenderung,
  jetzt: string,
  optionen: { zeitstempel?: boolean } = {},
): LeistungsnachweisDaten {
  const zeitstempel = optionen.zeitstempel !== false;
  const neu = fn(alt, jetzt);
  return erfassungBereinigen(nachweiseBereinigen(alt, zeitstempel ? periodentexteNachziehen(alt, neu) : neu, jetzt, zeitstempel));
}

const StoreContext = createContext<StoreValue | null>(null);

/**
 * Hält den Bestand des Bereichs und stellt ihn mit allen Schreibzugriffen
 * bereit – im Bereich mit dem Zugang 'bereich', im Controlling-Bereich (nach
 * der PIN) mit 'controlling'.
 */
export function StoreProvider({ zugang = 'bereich', children }: { zugang?: Zugang; children: ReactNode }) {
  const [geladen] = useState(ladeDaten);
  const [data, setData] = useState<LeistungsnachweisDaten>(geladen.daten);
  const [ladeZustand, setLadeZustand] = useState<LadeZustand>(geladen.zustand);
  const [speicherZustand, setSpeicherZustand] = useState<SpeicherZustand>('ok');
  // Stand, den ein anderes Fenster gespeichert hat – er wird übernommen, aber nicht zurückgeschrieben
  const uebernommen = useRef<LeistungsnachweisDaten | null>(null);

  // Nach einem Ladefehler bzw. bei einer neueren Fassung bleibt der gespeicherte Stand unberührt
  useEffect(() => {
    if (ladeZustand !== 'ok' || data === uebernommen.current) return;
    setSpeicherZustand(speichereDaten(data));
  }, [data, ladeZustand]);

  /** Jede Änderung läuft hierüber – die Funktion muss rein sein. */
  const mutate = useCallback<Mutate>((fn, optionen = {}) => {
    const jetzt = new Date().toISOString();
    setData((alt) => aenderungAnwenden(alt, fn, jetzt, optionen));
  }, []);

  // „Angemeldet als“ aus der gemeinsamen Anmeldung: Name, Farbmodus und der Mitarbeiter dieses Namens –
  // im Bereich bei einwandfrei geladenem Stand legt der Store eine fehlende Person selbst an
  const automatisch = zugang === 'bereich' && ladeZustand === 'ok';
  useBenutzerAbgleich(
    data,
    (d, b) => anmeldungAnwenden(d, b, automatisch) !== d,
    (b) => {
      // Kennung vor `mutate` aus dem Namen – gleich in jedem Durchlauf und in jedem Fenster
      const kennung = mitarbeiterKennung(b.name);
      mutate((d) => anmeldungAnwenden(d, b, automatisch, kennung), { zeitstempel: false });
    },
  );

  // Projekte mit dem Projektregister abgleichen – solange der gespeicherte Stand gelesen werden konnte.
  // Muss nach dem Speichern stehen: Ein anderes Fenster soll erst den Bestand, dann das Register erhalten.
  const { ersetzt, nachgeladen } = useRegisterAbgleich({
    bereich: 'leistungsnachweise',
    daten: data,
    aktiv: ladeZustand === 'ok',
    sicht: sichtFuerRegister,
    anwenden: (plan) => mutate((d) => registerPlanAnwenden(d, plan)),
  });

  // Ein anderes Fenster (Bereich bzw. Controlling) hat gespeichert: dessen Stand übernehmen, ohne ihn
  // zurückzuschreiben (`uebernommen`), ans Register zu übertragen oder abzugleichen (`nachgeladen`, bis
  // sich das Register ändert) – das andere Fenster hat all das getan. Stammt er aus einer neueren Fassung,
  // zeigt der Bereich wie beim Laden Demodaten und speichert nicht mehr (`ladeZustand`), statt ihn mit dem
  // älteren Stand zu überschreiben.
  useFremdeAenderung(SPEICHER_SCHLUESSEL, ladeZustand === 'ok', () => {
    const neu = ladeDaten();
    uebernommen.current = neu.daten;
    nachgeladen(neu.daten);
    setLadeZustand(neu.zustand);
    setData(neu.daten);
    setSpeicherZustand('ok');
  });

  const value = useMemo<StoreValue>(
    () => ({
      data,
      zugang,
      controlling: zugang === 'controlling',
      ladeZustand,
      speicherZustand,
      ...storeAktionen(data, mutate, zugang),
      ersetzeDaten: (d) => {
        ersetzt();
        mutate(() => d, { zeitstempel: false });
        setLadeZustand('ok');
      },
      zuruecksetzen: () => {
        // Ein Stand aus einer neueren Fassung darf nicht überschrieben werden
        if (ladeZustand === 'neuere_fassung') return;
        const demo = seedDaten();
        ersetzt();
        mutate(() => demo, { zeitstempel: false });
        setLadeZustand('ok');
      },
    }),
    [data, ladeZustand, speicherZustand, mutate, zugang, ersetzt],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

/** Zugriff auf den Bestand und die Schreibzugriffe – nur innerhalb von `StoreProvider`. */
export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore außerhalb von StoreProvider');
  return ctx;
}
