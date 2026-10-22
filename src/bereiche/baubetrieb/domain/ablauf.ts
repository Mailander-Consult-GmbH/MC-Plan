/**
 * Ablauflogik einer Anmeldung: Statuswechsel samt Übernahme in eine neue
 * Phase und Aufteilung, Rücknahme des letzten Wechsels und Abgleich des
 * Bauzeitraums. Reine Funktionen – der Store ruft sie in `mutate()` auf.
 */
import { fahrplanjahrBeginn, fahrplanjahrEnde, fahrplanjahrVon } from './fristen';
import {
  phaseMitFahrplanjahr,
  type Anmeldung,
  type AnmeldungStand,
  type AnmeldungsArt,
  type AnnexVIIGrund,
  type BaubetriebDaten,
  type ID,
  type ISODate,
  type StatusCode,
  type VerlaufEintrag,
} from './types';
import { istAenderung, istUebernahme, statusDef } from './workflow';

/** Bauzeitraum einer übernommenen bzw. aufgeteilten Anmeldung. */
export interface Bauzeitraum {
  bauVon: ISODate | null;
  bauBis: ISODate | null;
  fahrplanjahr: number | null;
}

/** Weitere Anmeldung, die bei der Übernahme aus diesem Eintrag entsteht. */
export interface Aufteilung extends Bauzeitraum {
  anmeldeId: string;
  bfStrecke: string;
}

export interface Wechsel {
  nach: StatusCode;
  datum: ISODate;
  bemerkung: string;
  /** Beim Eintritt in eine Änderungsabstimmung. */
  aenderungsNr?: string;
  annexVII?: AnnexVIIGrund | null;
  /** Beim Wechsel in eine andere Phase: neue Art, Anmelde-ID und Bauzeitraum. */
  uebernahme?: Bauzeitraum & { art: AnmeldungsArt; anmeldeId: string };
  /** Beim Wechsel in eine andere Phase: weitere Anmeldungen aus diesem Eintrag. */
  weitere?: Aufteilung[];
}

/** Vorab vergebene Kennungen – der Store erzeugt sie außerhalb von `mutate()`. */
export interface WechselIds {
  verlauf: ID;
  /** Je weiterer Anmeldung eine Kennung für die Anmeldung und eine für ihren Verlauf. */
  weitere: { anmeldung: ID; verlauf: ID }[];
}

/**
 * In SKM und PzE umfasst der Bauzeitraum das ganze Fahrplanjahr; sonst folgt
 * das Fahrplanjahr dem Baubeginn.
 */
export function bauzeitraumAbgleichen<T extends Bauzeitraum & { status: StatusCode }>(a: T): T {
  if (phaseMitFahrplanjahr(statusDef(a.status).phase)) {
    const fpj = a.fahrplanjahr ?? fahrplanjahrVon(a.bauVon);
    return fpj
      ? { ...a, fahrplanjahr: fpj, bauVon: fahrplanjahrBeginn(fpj), bauBis: fahrplanjahrEnde(fpj) }
      : { ...a, fahrplanjahr: null };
  }
  return { ...a, fahrplanjahr: fahrplanjahrVon(a.bauVon) };
}

function standVon(a: Anmeldung): AnmeldungStand {
  return {
    status: a.status,
    statusSeit: a.statusSeit,
    art: a.art,
    anmeldeId: a.anmeldeId,
    bauVon: a.bauVon,
    bauBis: a.bauBis,
    fahrplanjahr: a.fahrplanjahr,
    aenderungsNr: a.aenderungsNr,
    annexVII: a.annexVII,
    terminManuell: a.terminManuell,
  };
}

/**
 * Wendet einen Statuswechsel an. Zulässig sind nur die Nachfolger des
 * aktuellen Status. Z0 (Anmeldeleiche) löscht den Eintrag vollständig.
 */
export function wechselAnwenden(
  d: BaubetriebDaten,
  id: ID,
  w: Wechsel,
  ids: WechselIds,
  bearbeiter: string,
  erfasst: string,
): BaubetriebDaten {
  const alt = d.anmeldungen.find((a) => a.id === id);
  if (!alt || !statusDef(alt.status).nachfolger.includes(w.nach)) return d;

  if (w.nach === 'Z0') {
    return {
      ...d,
      anmeldungen: d.anmeldungen
        .filter((a) => a.id !== id)
        .map((a) => (a.herkunftId === id ? { ...a, herkunftId: null } : a)),
    };
  }

  const warAenderung = istAenderung(alt.status);
  const wirdAenderung = istAenderung(w.nach);
  const uebernahme = istUebernahme(alt.status, w.nach) ? w.uebernahme : undefined;

  const eintrag: VerlaufEintrag = {
    id: ids.verlauf,
    typ: 'wechsel',
    datum: w.datum,
    erfasst,
    bearbeiter,
    von: alt.status,
    nach: w.nach,
    text: w.bemerkung.trim(),
    vorher: standVon(alt),
  };
  // Eine abgeschlossene Änderungsabstimmung bleibt im Verlauf dokumentiert.
  if (warAenderung && !wirdAenderung && (alt.aenderungsNr || alt.annexVII)) {
    eintrag.aenderungsNr = alt.aenderungsNr;
    eintrag.annexVII = alt.annexVII;
  }

  const neu: Anmeldung = bauzeitraumAbgleichen({
    ...alt,
    status: w.nach,
    statusSeit: w.datum,
    terminManuell: null,
    art: uebernahme?.art ?? alt.art,
    anmeldeId: uebernahme ? uebernahme.anmeldeId.trim() : alt.anmeldeId,
    bauVon: uebernahme ? uebernahme.bauVon : alt.bauVon,
    bauBis: uebernahme ? uebernahme.bauBis : alt.bauBis,
    fahrplanjahr: uebernahme ? uebernahme.fahrplanjahr : alt.fahrplanjahr,
    aenderungsNr: wirdAenderung ? (w.aenderungsNr ?? alt.aenderungsNr).trim() : '',
    annexVII: wirdAenderung ? (w.annexVII !== undefined ? w.annexVII : alt.annexVII) : null,
    verlauf: [...alt.verlauf, eintrag],
  });

  const weitere: Anmeldung[] = uebernahme
    ? (w.weitere ?? []).map((t, i) =>
        bauzeitraumAbgleichen({
          ...neu,
          id: ids.weitere[i].anmeldung,
          anmeldeId: t.anmeldeId.trim(),
          bfStrecke: t.bfStrecke.trim() || alt.bfStrecke,
          bauVon: t.bauVon,
          bauBis: t.bauBis,
          fahrplanjahr: t.fahrplanjahr,
          herkunftId: alt.id,
          verlauf: [
            {
              id: ids.weitere[i].verlauf,
              typ: 'anlage',
              datum: w.datum,
              erfasst,
              bearbeiter,
              von: alt.status,
              nach: w.nach,
              text: `Bei der Übernahme aus „${alt.anmeldeId || 'ohne ID'}“ (${statusDef(alt.status).name}) aufgeteilt`,
            },
          ],
        }),
      )
    : [];

  const index = d.anmeldungen.findIndex((a) => a.id === id);
  const anmeldungen = [...d.anmeldungen];
  anmeldungen.splice(index, 1, neu, ...weitere);
  return { ...d, anmeldungen };
}

/** Der letzte Eintrag des Verlaufs, der ein Statuswechsel ist und zurückgenommen werden kann. */
export function letzterWechsel(a: Anmeldung): VerlaufEintrag | null {
  const letzter = [...a.verlauf].reverse().find((v) => v.typ !== 'notiz');
  return letzter && letzter.typ === 'wechsel' && letzter.vorher ? letzter : null;
}

/**
 * Nimmt den letzten Statuswechsel zurück und stellt den vorherigen Stand her.
 * Bei einer Aufteilung entstandene weitere Anmeldungen bleiben bestehen.
 */
export function wechselZuruecknehmen(d: BaubetriebDaten, id: ID): BaubetriebDaten {
  return {
    ...d,
    anmeldungen: d.anmeldungen.map((a) => {
      if (a.id !== id) return a;
      const letzter = letzterWechsel(a);
      if (!letzter?.vorher) return a;
      return { ...a, ...letzter.vorher, verlauf: a.verlauf.filter((v) => v.id !== letzter.id) };
    }),
  };
}

/** Herkunft und Aufteilung: aus welchem Eintrag diese Anmeldung entstand und welche aus ihr. */
export function verwandte(d: BaubetriebDaten, a: Anmeldung): { herkunft: Anmeldung | null; aufgeteilt: Anmeldung[] } {
  return {
    herkunft: a.herkunftId ? (d.anmeldungen.find((x) => x.id === a.herkunftId) ?? null) : null,
    aufgeteilt: d.anmeldungen.filter((x) => x.herkunftId === a.id),
  };
}
