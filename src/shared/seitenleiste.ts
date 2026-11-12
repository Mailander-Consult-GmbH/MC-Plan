/**
 * Die aufklappbare Seitenleiste der schmalen Ansicht (bis 860 px,
 * `.sidebar.open` in src/shared/global.css): offen oder zu. Sie schließt bei
 * jedem Seitenwechsel – auch bei einem, der nicht aus der Seitenleiste kommt,
 * etwa „Zurück“ im Browser oder die Zurück-Geste der installierten App; sonst
 * bliebe sie offen und verdeckte die neue Seite. Verwendet in den App.tsx
 * aller Bereiche.
 */
import { useEffect, useState } from 'react';

export function useSeitenleiste() {
  const [offen, setOffen] = useState(false);
  useEffect(() => {
    const schliessen = () => setOffen(false);
    window.addEventListener('hashchange', schliessen);
    return () => window.removeEventListener('hashchange', schliessen);
  }, []);
  return [offen, setOffen] as const;
}
