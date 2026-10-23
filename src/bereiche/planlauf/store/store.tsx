/**
 * Zentraler Anwendungsstatus. Alle Schreibzugriffe laufen über diesen Store,
 * der den Bestand nach jeder Änderung lokal persistiert und die Soll-Termine
 * betroffener Planläufe neu berechnet.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  eigeneKontakteSichern,
  laufUebernehmen,
  planlaufName,
  recalcRun,
  zustaendigkeitenNachziehen,
} from '../domain/engine';
import { seedData } from '../domain/seed';
import { ladeDaten, speichereDaten } from './storage';
import { formatDate, today } from '../../../shared/dates';
import { hatEigenenPlanlauf } from '../domain/types';
import type {
  AbbruchArt,
  AppData,
  Bearbeiter,
  Contact,
  ID,
  PlanDocument,
  PlanRun,
  ProcessTemplate,
  EmailTemplate,
  Project,
  Role,
  RunStep,
  StandardRolle,
} from '../domain/types';

export function newId(prefix = 'id'): ID {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Name eines Planlaufs – wie beim Start aus der Planliste. */
interface StoreValue {
  data: AppData;
  /* Bearbeiter */
  setBearbeiter: (b: Partial<Bearbeiter>) => void;
  /* Gewerke */
  addGewerk: (name: string) => void;
  /** Löscht ein Gewerk samt seiner Funktionen (Stammdaten und Projekte). */
  deleteGewerk: (name: string) => void;
  /* Projekte */
  addProject: (p: Omit<Project, 'id'>) => ID;
  toggleMarkiert: (id: ID) => void;
  updateProject: (id: ID, patch: Partial<Project>) => void;
  deleteProject: (id: ID) => void;
  /* Funktionen (projektübergreifend) */
  addStandardRolle: (r: Omit<StandardRolle, 'id'>) => ID;
  updateStandardRolle: (id: ID, patch: Partial<StandardRolle>) => void;
  deleteStandardRolle: (id: ID) => void;
  /* Projektfunktionen */
  addRole: (r: Omit<Role, 'id'>) => ID;
  updateRole: (id: ID, patch: Partial<Role>) => void;
  deleteRole: (id: ID) => void;
  /* Kontakte */
  addContact: (c: Omit<Contact, 'id'>) => ID;
  updateContact: (id: ID, patch: Partial<Contact>) => void;
  deleteContact: (id: ID) => void;
  /* Dokumente */
  addDocument: (d: Omit<PlanDocument, 'id'>) => ID;
  updateDocument: (id: ID, patch: Partial<PlanDocument>) => void;
  deleteDocument: (id: ID) => void;
  /* E-Mail-Vorlagen (projektübergreifend) */
  setEmailVorlage: (t: EmailTemplate) => void;
  deleteEmailVorlage: (id: ID) => void;
  /* Vorlagen */
  addTemplate: (t: Omit<ProcessTemplate, 'id'> & { id?: ID }) => ID;
  updateTemplate: (id: ID, patch: Partial<ProcessTemplate>) => void;
  deleteTemplate: (id: ID) => void;
  /* Planläufe */
  addRun: (r: Omit<PlanRun, 'id'>) => ID;
  updateRun: (id: ID, patch: Partial<PlanRun>) => void;
  deleteRun: (id: ID) => void;
  updateStep: (runId: ID, stepId: ID, patch: Partial<RunStep>) => void;
  addStep: (runId: ID, step: Omit<RunStep, 'id'>, position?: number) => void;
  /** Bricht einen Lauf mit Begründung ab; er bleibt im Projekt sichtbar. */
  abbrechenRun: (runId: ID, grund: string, art: AbbruchArt, neuerIndex: string | null) => void;
  /**
   * Beginnt einen laufenden Planlauf mit einem (anderen) Workflow von vorn:
   * Der bisherige Lauf endet als „neu gestartet“ und bleibt zum Nachschlagen
   * erhalten, ein neuer Lauf mit den übergebenen Schritten tritt an seine
   * Stelle. Ein übergebenes Eingang Soll gilt fortan für den Eintrag (es
   * bestimmt den Termin des ersten Schritts). Liefert die Kennung des neuen Laufs.
   */
  planlaufNeuStarten: (
    runId: ID,
    neu: {
      templateId: ID | null;
      templateName: string;
      steps: RunStep[];
      start: string;
      grund: string;
      eingangSoll?: string | null;
    },
  ) => ID | null;
  /* Planverzeichnisse: gebündelt oder Pläne einzeln */
  /**
   * Löst einen Plan aus dem laufenden Lauf seines gebündelten Verzeichnisses
   * heraus. Der Plan übernimmt dessen Stand. Liefert die Kennung des neuen Laufs.
   */
  planHerausloesen: (planId: ID) => ID | null;
  /**
   * Stellt ein Planverzeichnis auf Einzelläufe um. Läuft es bereits, übernimmt
   * jeder Plan ohne eigenen Lauf dessen Stand, und der gebündelte Lauf endet
   * als „aufgeteilt“. Liefert die Zahl der neu entstandenen Läufe.
   */
  verzeichnisAufteilen: (verzeichnisId: ID) => number;
  /**
   * Führt Pläne mit eigenem Lauf wieder im gebündelten Lauf ihres Verzeichnisses
   * zusammen. Läuft das Verzeichnis noch, kehren die Pläne in dessen Lauf
   * zurück; sonst entsteht ein neuer Verzeichnislauf mit dem Stand von
   * `quelleRunId`. Die eigenen Läufe der Pläne enden als „gebündelt“, nicht
   * gewählte Pläne behalten ihren Lauf. Liefert die Kennung des Verzeichnislaufs.
   */
  planeBuendeln: (verzeichnisId: ID, planIds: ID[], quelleRunId: ID | null) => ID | null;
  /* Verwaltung */
  ersetzeDaten: (d: AppData) => void;
  zuruecksetzen: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => ladeDaten());

  useEffect(() => {
    speichereDaten(data);
  }, [data]);

  /** Änderung anwenden und alle Läufe mit aktuellen Projekteinstellungen durchrechnen. */
  const mutate = useCallback((fn: (d: AppData) => AppData) => {
    setData((alt) => {
      // Die angemeldete Person wird in ihren Projekten stets als
      // Planlaufmanagement geführt – auch nach einem neuen Projekt,
      // einer Markierung oder einer Namensänderung.
      // Zuständigkeiten folgen der Besetzung der Funktionen: neue oder gewechselte
      // Besetzungen greifen sofort auch in laufenden Planläufen.
      const neu = zustaendigkeitenNachziehen(eigeneKontakteSichern(fn(alt), newId));
      return {
        ...neu,
        runs: neu.runs.map((r) =>
          recalcRun(
            r,
            neu.projects.find((p) => p.id === r.projectId),
            neu.documents.find((d) => d.id === r.documentId),
          ),
        ),
      };
    });
  }, []);

  const value = useMemo<StoreValue>(() => {
    const upd = <T extends { id: ID }>(list: T[], id: ID, patch: Partial<T>) =>
      list.map((x) => (x.id === id ? { ...x, ...patch } : x));

    return {
      data,

      setBearbeiter: (b) =>
        mutate((d) => ({ ...d, bearbeiter: { ...d.bearbeiter, ...b } })),

      // Gewerke sind Stammdaten: einmal ergänzt, stehen sie überall zur Auswahl
      deleteGewerk: (name) =>
        mutate((d) => {
          const gleich = (g: string | null) => (g ?? '').trim().toLowerCase() === name.trim().toLowerCase();
          // Funktionen dieses Gewerks entfallen – samt ihrer Besetzung
          const rollenIds = new Set(d.roles.filter((r) => gleich(r.gewerk)).map((r) => r.id));
          return {
            ...d,
            gewerke: d.gewerke.filter((g) => !gleich(g)),
            standardRollen: d.standardRollen.filter((r) => !gleich(r.gewerk)),
            roles: d.roles.filter((r) => !rollenIds.has(r.id)),
            contacts: d.contacts.map((c) =>
              c.zuordnungen.some((z) => rollenIds.has(z.roleId))
                ? { ...c, zuordnungen: c.zuordnungen.filter((z) => !rollenIds.has(z.roleId)) }
                : c,
            ),
          };
        }),

      addGewerk: (name) =>
        mutate((d) =>
          d.gewerke.some((g) => g.trim().toLowerCase() === name.trim().toLowerCase())
            ? d
            : { ...d, gewerke: [...d.gewerke, name.trim()].sort((a, b) => a.localeCompare(b, 'de')) },
        ),

      toggleMarkiert: (id) =>
        mutate((d) => ({
          ...d,
          projects: d.projects.map((p) => (p.id === id ? { ...p, markiert: !p.markiert } : p)),
        })),

      addProject: (p) => {
        const id = newId('prj');
        mutate((d) => ({ ...d, projects: [...d.projects, { ...p, id }] }));
        return id;
      },
      updateProject: (id, patch) => mutate((d) => ({ ...d, projects: upd(d.projects, id, patch) })),
      deleteProject: (id) =>
        mutate((d) => ({
          ...d,
          projects: d.projects.filter((p) => p.id !== id),
          roles: d.roles.filter((r) => r.projectId !== id),
          contacts: d.contacts.filter((c) => c.projectId !== id),
          documents: d.documents.filter((x) => x.projectId !== id),
          runs: d.runs.filter((r) => r.projectId !== id),
          templates: d.templates.filter((t) => t.projectId !== id),
        })),

      addStandardRolle: (r) => {
        const id = newId('srol');
        mutate((d) => ({ ...d, standardRollen: [...d.standardRollen, { ...r, id }] }));
        return id;
      },
      updateStandardRolle: (id, patch) =>
        mutate((d) => ({ ...d, standardRollen: upd(d.standardRollen, id, patch) })),
      deleteStandardRolle: (id) =>
        mutate((d) => ({ ...d, standardRollen: d.standardRollen.filter((r) => r.id !== id) })),

      addRole: (r) => {
        const id = newId('rol');
        mutate((d) => ({ ...d, roles: [...d.roles, { ...r, id }] }));
        return id;
      },
      updateRole: (id, patch) => mutate((d) => ({ ...d, roles: upd(d.roles, id, patch) })),
      deleteRole: (id) =>
        mutate((d) => ({
          ...d,
          roles: d.roles.filter((r) => r.id !== id),
          contacts: d.contacts.map((c) => ({
            ...c,
            zuordnungen: c.zuordnungen.filter((z) => z.roleId !== id),
          })),
        })),

      addContact: (c) => {
        const id = newId('con');
        mutate((d) => ({ ...d, contacts: [...d.contacts, { ...c, id }] }));
        return id;
      },
      updateContact: (id, patch) => mutate((d) => ({ ...d, contacts: upd(d.contacts, id, patch) })),
      deleteContact: (id) =>
        mutate((d) => ({
          ...d,
          contacts: d.contacts.filter((c) => c.id !== id),
          runs: d.runs.map((r) => ({
            ...r,
            steps: r.steps.map((s) => (s.contactId === id ? { ...s, contactId: null } : s)),
          })),
        })),

      addDocument: (doc) => {
        const id = newId('doc');
        mutate((d) => ({ ...d, documents: [...d.documents, { ...doc, id }] }));
        return id;
      },
      updateDocument: (id, patch) => mutate((d) => ({ ...d, documents: upd(d.documents, id, patch) })),
      deleteDocument: (id) => {
        const geloescht = data.documents.find((x) => x.id === id);
        // Pläne eines gelöschten Verzeichnisses werden zu Einzelplänen im Paket
        // des Verzeichnisses – sonst verlören Pläne mit eigenem Lauf ihren Platz
        // in den Listen. Wer im Lauf des Verzeichnisses mitlief, führt dessen
        // Stand in einem eigenen Lauf weiter, damit kein Plan ohne Planlauf bleibt.
        const quelle =
          geloescht?.kind === 'verzeichnis'
            ? data.runs
                .filter((r) => r.documentId === id && r.status !== 'abgebrochen')
                .sort((a, b) => (a.status === 'laufend' ? 0 : 1) - (b.status === 'laufend' ? 0 : 1))[0]
            : undefined;
        const uebernommen = quelle
          ? data.documents
              .filter(
                (x) =>
                  x.kind === 'plan' &&
                  x.parentId === id &&
                  !hatEigenenPlanlauf(x, data.documents) &&
                  !data.runs.some((r) => r.documentId === x.id && r.status !== 'abgebrochen'),
              )
              .map((plan) => ({
                ...laufUebernehmen(
                  quelle,
                  {
                    documentId: plan.id,
                    name: planlaufName(plan),
                    index: plan.index,
                    bemerkung: `Stand von „${quelle.name}“ übernommen – Planverzeichnis gelöscht`,
                  },
                  newId,
                ),
                status: quelle.status,
                id: newId('run'),
              }))
          : [];
        mutate((d) => ({
          ...d,
          // Einträge eines gelöschten Planpakets sind keinem Paket mehr zugeordnet.
          documents: d.documents
            .filter((x) => x.id !== id)
            .map((x) =>
              x.parentId === id
                ? { ...x, parentId: null, eigenerLauf: undefined, paketId: geloescht?.paketId ?? null }
                : x,
            )
            .map((x) => (x.paketId === id ? { ...x, paketId: null } : x)),
          runs: [...d.runs.filter((r) => r.documentId !== id), ...uebernommen],
        }));
      },

      setEmailVorlage: (t) =>
        mutate((d) => ({
          ...d,
          emailVorlagen: d.emailVorlagen.some((x) => x.id === t.id)
            ? d.emailVorlagen.map((x) => (x.id === t.id ? t : x))
            : [...d.emailVorlagen, t],
        })),

      deleteEmailVorlage: (id) =>
        mutate((d) => ({ ...d, emailVorlagen: d.emailVorlagen.filter((x) => x.id !== id) })),

      addTemplate: (t) => {
        const id = t.id ?? newId('tpl');
        mutate((d) => ({ ...d, templates: [...d.templates, { ...t, id } as ProcessTemplate] }));
        return id;
      },
      updateTemplate: (id, patch) => mutate((d) => ({ ...d, templates: upd(d.templates, id, patch) })),
      deleteTemplate: (id) => mutate((d) => ({ ...d, templates: d.templates.filter((t) => t.id !== id) })),

      addRun: (r) => {
        const id = newId('run');
        mutate((d) => ({ ...d, runs: [...d.runs, { ...r, id }] }));
        return id;
      },
      updateRun: (id, patch) => mutate((d) => ({ ...d, runs: upd(d.runs, id, patch) })),
      deleteRun: (id) => mutate((d) => ({ ...d, runs: d.runs.filter((r) => r.id !== id) })),

      updateStep: (runId, stepId, patch) =>
        mutate((d) => ({
          ...d,
          runs: d.runs.map((r) =>
            r.id === runId ? { ...r, steps: r.steps.map((s) => (s.id === stepId ? { ...s, ...patch } : s)) } : r,
          ),
        })),

      addStep: (runId, step, position) =>
        mutate((d) => ({
          ...d,
          runs: d.runs.map((r) => {
            if (r.id !== runId) return r;
            const neu = { ...step, id: newId('rs') };
            const steps = [...r.steps];
            steps.splice(position ?? steps.length, 0, neu);
            return { ...r, steps };
          }),
        })),

      abbrechenRun: (runId, grund, art, neuerIndex) =>
        mutate((d) => ({
          ...d,
          runs: d.runs.map((r) =>
            r.id === runId
              ? {
                  ...r,
                  status: 'abgebrochen' as const,
                  abbruchGrund: grund,
                  abbruchDatum: today(),
                  abbruchArt: art,
                  abbruchNeuerIndex: neuerIndex,
                }
              : r,
          ),
        })),

      planlaufNeuStarten: (runId, neu) => {
        const alt = data.runs.find((r) => r.id === runId);
        if (!alt || alt.status !== 'laufend') return null;
        const id = newId('run');
        const heute = today();
        const grund = neu.grund.trim();
        const lauf: PlanRun = {
          id,
          projectId: alt.projectId,
          documentId: alt.documentId,
          templateId: neu.templateId,
          templateName: neu.templateName,
          name: alt.name,
          index: alt.index,
          start: neu.start,
          status: 'laufend',
          abbruchGrund: null,
          abbruchDatum: null,
          abbruchArt: null,
          abbruchNeuerIndex: null,
          steps: neu.steps,
          bemerkung: `Neu gestartet am ${formatDate(heute)} – vorher Workflow „${alt.templateName}“${
            grund ? ` (${grund})` : ''
          }`,
        };
        mutate((d) => ({
          ...d,
          documents:
            neu.eingangSoll === undefined
              ? d.documents
              : d.documents.map((x) => (x.id === alt.documentId ? { ...x, eingangSoll: neu.eingangSoll ?? null } : x)),
          runs: [
            ...d.runs.map((r) =>
              r.id === runId
                ? {
                    ...r,
                    status: 'abgebrochen' as const,
                    abbruchArt: 'neu_gestartet' as const,
                    abbruchGrund: grund || `Mit Workflow „${neu.templateName}“ neu gestartet`,
                    abbruchDatum: heute,
                    abbruchNeuerIndex: null,
                  }
                : r,
            ),
            lauf,
          ],
        }));
        return id;
      },

      planHerausloesen: (planId) => {
        const plan = data.documents.find((x) => x.id === planId);
        if (!plan || plan.kind !== 'plan' || !plan.parentId) return null;
        const quelle = data.runs.find((r) => r.documentId === plan.parentId && r.status === 'laufend');
        if (!quelle) return null;
        const id = newId('run');
        const lauf = laufUebernehmen(
          quelle,
          {
            documentId: plan.id,
            name: planlaufName(plan),
            index: plan.index,
            bemerkung: `Aus „${quelle.name}“ herausgelöst`,
          },
          newId,
        );
        mutate((d) => ({
          ...d,
          documents: d.documents.map((x) => (x.id === planId ? { ...x, eigenerLauf: true } : x)),
          runs: [...d.runs, { ...lauf, id }],
        }));
        return id;
      },

      verzeichnisAufteilen: (verzeichnisId) => {
        const verzeichnis = data.documents.find((x) => x.id === verzeichnisId);
        if (!verzeichnis || verzeichnis.kind !== 'verzeichnis') return 0;
        const quelle = data.runs.find((r) => r.documentId === verzeichnisId && r.status === 'laufend');
        // Pläne, die noch keinen eigenen (nicht abgebrochenen) Lauf haben
        const ohneLauf = data.documents.filter(
          (x) =>
            x.kind === 'plan' &&
            x.parentId === verzeichnisId &&
            !data.runs.some((r) => r.documentId === x.id && r.status !== 'abgebrochen'),
        );
        const neue = quelle
          ? ohneLauf.map((plan) => ({
              ...laufUebernehmen(
                quelle,
                {
                  documentId: plan.id,
                  name: planlaufName(plan),
                  index: plan.index,
                  bemerkung: `Aus „${quelle.name}“ aufgeteilt`,
                },
                newId,
              ),
              id: newId('run'),
            }))
          : [];
        mutate((d) => ({
          ...d,
          documents: d.documents.map((x) =>
            x.id === verzeichnisId ? { ...x, planlaufModus: 'einzeln' as const } : x,
          ),
          runs: [
            ...d.runs.map((r) =>
              quelle && r.id === quelle.id
                ? {
                    ...r,
                    status: 'abgebrochen' as const,
                    abbruchArt: 'aufgeteilt' as const,
                    abbruchGrund: 'In Einzelläufe der Pläne aufgeteilt',
                    abbruchDatum: today(),
                    abbruchNeuerIndex: null,
                  }
                : r,
            ),
            ...neue,
          ],
        }));
        return neue.length;
      },

      planeBuendeln: (verzeichnisId, planIds, quelleRunId) => {
        const verzeichnis = data.documents.find((x) => x.id === verzeichnisId);
        if (!verzeichnis || verzeichnis.kind !== 'verzeichnis' || planIds.length === 0) return null;
        const aktiv = (docId: ID) => data.runs.find((r) => r.documentId === docId && r.status !== 'abgebrochen');
        const laufend = data.runs.find((r) => r.documentId === verzeichnisId && r.status === 'laufend');
        let neuerLauf: PlanRun | null = null;
        if (!laufend) {
          const quelle = data.runs.find((r) => r.id === quelleRunId);
          if (!quelle) return null;
          neuerLauf = {
            ...laufUebernehmen(
              quelle,
              {
                documentId: verzeichnisId,
                name: planlaufName(verzeichnis),
                index: verzeichnis.index,
                bemerkung: `Pläne wieder gebündelt – Stand von „${quelle.name}“ übernommen`,
              },
              newId,
            ),
            id: newId('run'),
          };
        }
        const beendete = new Set(planIds.map((id) => aktiv(id)?.id).filter((id): id is ID => Boolean(id)));
        mutate((d) => ({
          ...d,
          documents: d.documents.map((x) => {
            if (x.id === verzeichnisId) return { ...x, planlaufModus: 'gebuendelt' as const };
            if (x.kind !== 'plan' || x.parentId !== verzeichnisId) return x;
            if (planIds.includes(x.id)) return { ...x, eigenerLauf: undefined };
            // Nicht gewählte Pläne mit eigenem Lauf behalten ihn
            return aktiv(x.id) ? { ...x, eigenerLauf: true } : x;
          }),
          runs: [
            ...d.runs.map((r) =>
              beendete.has(r.id)
                ? {
                    ...r,
                    status: 'abgebrochen' as const,
                    abbruchArt: 'gebuendelt' as const,
                    abbruchGrund: 'Wieder im Planlauf des Verzeichnisses gebündelt',
                    abbruchDatum: today(),
                    abbruchNeuerIndex: null,
                  }
                : r,
            ),
            ...(neuerLauf ? [neuerLauf] : []),
          ],
        }));
        return laufend?.id ?? neuerLauf!.id;
      },

      ersetzeDaten: (d) => mutate(() => d),
      zuruecksetzen: () => mutate(() => seedData()),
    };
  }, [data, mutate]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore muss innerhalb des StoreProvider verwendet werden.');
  return ctx;
}
