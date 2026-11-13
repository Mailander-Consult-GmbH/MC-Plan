/**
 * Nach einem Seitenwechsel oben beginnen. Gescrollt wird nicht das Dokument,
 * sondern der Inhaltsbereich `.content` (src/shared/global.css), der über alle
 * Seiten bestehen bleibt – ohne Zurücksetzen öffnete die neue Seite an der
 * Stelle, an der die alte verlassen wurde.
 *
 * Der Schlüssel kennzeichnet die Seite (Ansicht und Projekt), nicht Reiter
 * oder Filter – ein Reiterwechsel innerhalb einer Seite bleibt, wo er ist. Der
 * Ref gehört an `.content` selbst oder an ein Element darin. Verwendet in den
 * App.tsx aller Bereiche.
 */
import { useLayoutEffect, useRef } from 'react';

export function useNachObenBeiSeitenwechsel<T extends HTMLElement>(schluessel: string) {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    ref.current?.closest('.content')?.scrollTo(0, 0);
  }, [schluessel]);
  return ref;
}
