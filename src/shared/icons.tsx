/**
 * Symbole der Oberfläche: Lucide-Icons (lucide-react), angesprochen über die
 * fachlichen Namen der Anwendung. Neue Symbole hier eintragen – nicht
 * `lucide-react` in den Ansichten selbst einbinden, damit ein Name überall
 * dasselbe Symbol zeigt.
 */
import {
  Archive,
  ArrowDown,
  ArrowUp,
  Bell,
  BookUser,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CirclePlay,
  ClipboardList,
  Clock,
  Copy,
  Diamond,
  Download,
  Ellipsis,
  FileText,
  Flag,
  Folder,
  Funnel,
  Info,
  LayoutGrid,
  List,
  Mail,
  Menu,
  Package,
  Pencil,
  Plus,
  Redo2,
  RefreshCw,
  Search,
  Settings,
  SquareCheck,
  Star,
  Trash2,
  TriangleAlert,
  Undo2,
  Upload,
  User,
  Workflow,
  X,
  BookText,
  Printer,
  ImagePlus,
  Eye,
  type LucideIcon,
} from 'lucide-react';

const symbole = {
  dashboard: LayoutGrid,
  projekt: Folder,
  plan: FileText,
  paket: Package,
  // Planverzeichnis: Liste – klar vom Planblatt unterscheidbar
  verzeichnis: List,
  kette: Workflow,
  adressbuch: BookUser,
  frist: Clock,
  mail: Mail,
  einstellungen: Settings,
  plus: Plus,
  check: Check,
  chevron: ChevronRight,
  zurueck: ChevronLeft,
  bearbeiten: Pencil,
  loeschen: Trash2,
  export: Upload,
  importieren: Download,
  glocke: Bell,
  suche: Search,
  filter: Funnel,
  kalender: CalendarDays,
  menu: Menu,
  person: User,
  hoch: ArrowUp,
  runter: ArrowDown,
  kopieren: Copy,
  // Klemmbrett mit Textzeilen – Protokolle und Projektsteuerung
  protokoll: ClipboardList,
  // Workflow-Editor: Rückgängig/Wiederholen, Schrittarten, Start und Ende
  rueckgaengig: Undo2,
  wiederholen: Redo2,
  aufgabe: SquareCheck,
  raute: Diamond,
  start: CirclePlay,
  ziel: Flag,
  schleife: RefreshCw,
  info: Info,
  // Archivkarton – Archiv der Projektlisten
  archiv: Archive,
  mehr: Ellipsis,
  schliessen: X,
  // Projektmarkierung; gefüllt über `.stern.aktiv` in global.css
  stern: Star,
  warnung: TriangleAlert,
  // Pflichtenheft (Planlaufmanagement)
  pflichtenheft: BookText,
  drucken: Printer,
  bild: ImagePlus,
  vorschau: Eye,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof symbole;

export function Icon({
  name,
  size = 16,
  strokeWidth = 1.75,
}: {
  name: IconName | string;
  size?: number;
  strokeWidth?: number;
}) {
  const Symbol: LucideIcon = (symbole as Record<string, LucideIcon>)[name] ?? symbole.plan;
  return <Symbol size={size} strokeWidth={strokeWidth} aria-hidden="true" style={{ display: 'block', flex: 'none' }} />;
}

/*
 * Strichzeichnungen für Ausgaben außerhalb der Oberfläche (Druck- und
 * PDF-Fassung, `iconSvg`): Dort wird ein eigenständiges HTML-Dokument
 * geschrieben, in dem keine React-Bausteine stehen. Die Druckfassungen
 * behalten damit ihr bisheriges Bild.
 */
const druckPfade: Record<string, string> = {
  plan: 'M7 3h7l5 5v13H7zM14 3v5h5M10 12.5h6M10 16h4',
  paket: 'M12 3 4 7v10l8 4 8-4V7zM4 7l8 4 8-4M12 11v10',
  verzeichnis: 'M4.5 6.5h.01M9 6.5h10.5M4.5 12h.01M9 12h10.5M4.5 17.5h.01M9 17.5h10.5',
};

/** Symbol als SVG-Text – für Ausgaben außerhalb der Oberfläche, etwa die PDF-Fassung. */
export function iconSvg(name: string, size = 16, strokeWidth = 1.6): string {
  const d = druckPfade[name] ?? druckPfade.plan;
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
}
