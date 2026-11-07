/**
 * Anmeldung im Bereich „Leistungsnachweise“ – ohne eigenen Dialog: Wer
 * angemeldet ist, steht unter „Angemeldet als“ unten links, derselbe Name in
 * allen Bereichen (src/gemeinsam/benutzer.ts). Leistungen erfasst, wer unter
 * diesem Namen als aktiver Mitarbeiter geführt ist (`mitarbeiterZumNamen`);
 * fehlt die Person, legt der Store sie im Bereich selbst an
 * (`anmeldungAnwenden`, domain/rechte.ts).
 *
 * Übrig bleiben Hinweise (`anmeldeHinweis`): Der Name hat keinen Nachnamen,
 * er gehört einem ausgeschiedenen Mitarbeiter, das Controlling hat die unter
 * ihm angelegte Person umbenannt, oder der gespeicherte Stand ist nicht
 * geladen (dann wird niemand angelegt). Handlungen, die
 * eine Anmeldung brauchen (Leistung erfassen, Excel-Import, Leistungstext,
 * Bestätigen), zeigen dann den Hinweis als Kurzmeldung (`useMitAnmeldung`).
 */
import { useBenutzer } from '../../../gemeinsam/benutzer';
import { useToast } from '../../../shared/toast';
import { Callout } from '../../../shared/ui';
import { NICHT_ANGEMELDET, anmeldeHinweis, anmeldeLage, angemeldet, type AnmeldeLage } from '../domain/rechte';
import { useStore } from '../store/store';

/**
 * Lage des Namens unter „Angemeldet als“ (`anmeldeLage`): Im Bereich legt der
 * Store eine fehlende Person an, solange der gespeicherte Stand geladen ist;
 * im Controlling nie.
 */
export function useAnmeldeLage(): { lage: AnmeldeLage; name: string } {
  const { data, zugang, ladeZustand } = useStore();
  const { name } = useBenutzer();
  return {
    lage: anmeldeLage(data, name, zugang === 'bereich' && ladeZustand === 'ok', zugang === 'bereich' && ladeZustand !== 'ok'),
    name,
  };
}

/**
 * Hinweis zur Anmeldung als Text – für Leisten und leere Zustände; null, wenn
 * die Person angemeldet ist (oder gerade angelegt wird).
 */
export function useAnmeldeHinweis(): string | null {
  const { data } = useStore();
  const { lage, name } = useAnmeldeLage();
  if (angemeldet(data)) return null;
  return anmeldeHinweis(lage, name, true);
}

/**
 * Führt eine Handlung aus, wenn jemand angemeldet ist – sonst zeigt es den
 * Hinweis zur Anmeldung als Kurzmeldung (etwa „Leistung erfassen“ mit einem
 * Namen ohne Nachnamen).
 */
export function useMitAnmeldung(): (fn: () => void) => void {
  const { data } = useStore();
  const { lage, name } = useAnmeldeLage();
  const toast = useToast();
  return (fn) => {
    if (angemeldet(data)) fn();
    else toast(anmeldeHinweis(lage, name) ?? NICHT_ANGEMELDET);
  };
}

/**
 * Hinweis oben im Inhalt, solange der Name unter „Angemeldet als“ keinem
 * aktiven Mitarbeiter gehört: ohne Nachnamen, ausgeschieden bzw. umbenannt
 * (und solange der gespeicherte Stand nicht geladen ist). Leere Zustände der
 * Seiten wiederholen ihn nicht.
 */
export function AnmeldeHinweis() {
  const hinweis = useAnmeldeHinweis();
  if (!hinweis) return null;
  return (
    <div className="ln-anmeldehinweis">
      <Callout icon="i">{hinweis}</Callout>
    </div>
  );
}
