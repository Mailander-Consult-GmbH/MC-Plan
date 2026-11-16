import { useEffect, useState } from 'react';
import { motion, animate, useMotionValue, useTransform } from 'framer-motion';
import {
  LayoutGrid, CalendarDays, FileText, Users, MessageSquare, Settings,
  Search, Bell, Plus, Euro, TrendingUp, Percent, Video, Circle,
} from 'lucide-react';

/* ---------- Farben & gemeinsame Klassen ---------- */
const CORAL = '#F25F4C';
const CORAL_2 = '#FF8A73';
const card =
  'rounded-3xl bg-white p-6 shadow-[0_1px_2px_rgba(20,20,30,.04),0_8px_24px_rgba(20,20,30,.05)] dark:bg-[#1B1C20]';
const muted = 'text-[#8B8D94]';
const hoverLift = {
  whileHover: { y: -5, boxShadow: '0 18px 40px rgba(20,20,30,.10)' },
  transition: { type: 'spring', stiffness: 300, damping: 22 },
};

/* ---------- Beispieldaten ---------- */
const team = [
  { kz: 'AK', name: 'A. Keller', rolle: 'Projektsteuerung', last: 86, farbe: '#F2994A' },
  { kz: 'TS', name: 'T. Schmid', rolle: 'Planlaufmanagement', last: 62, farbe: '#56CCF2' },
  { kz: 'LM', name: 'L. Maier', rolle: 'Kostencontrolling', last: 45, farbe: '#9B51E0' },
];
const plaene = [
  { plan: 'Bahnsteig Gleis 1 – Grundriss', gewerk: 'Verkehrsanlagen', index: 'c', status: 'ok' },
  { plan: 'Bahnsteigdach – Statik', gewerk: 'Konstruktiver Ingenieurbau', index: 'b', status: 'overdue' },
  { plan: 'Kabeltrassen – Längsschnitt', gewerk: 'LST / TK', index: 'a', status: 'review' },
  { plan: 'Beleuchtung Zugang', gewerk: '50-Hz-Anlagen', index: 'b', status: 'overdue' },
];
const statusStil = {
  ok: { text: 'Freigegeben', cls: 'bg-[#E3F6EC] text-[#1F9D61]' },
  overdue: { text: 'Prüfung überfällig', cls: 'bg-[#FFEBE7] text-[#F25F4C]' },
  review: { text: 'In Prüfung', cls: 'bg-[#F7F7F8] text-[#8B8D94] dark:bg-[#232429]' },
};
const termine = {
  0: [['Jour fixe mit DB-Projektleitung', '09:00 · Teams', true], ['Kostenstand an PL senden', 'bis 12:00'], ['Baustellenbegehung', '14:30 · vor Ort']],
  1: [['Planbesprechung LST', '10:00 · Teams', true], ['Nachtragsprüfung N07', 'ganztägig']],
  2: [['Abstimmung Sperrpausen', '08:30 · Telefon', true]],
  3: [['Baubesprechung', '10:00 · Baucontainer'], ['Protokoll versenden', 'bis 16:00']],
};

/* ---------- Bausteine ---------- */
function Zaehler({ wert, suffix = '' }) {
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) =>
    v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + suffix);
  useEffect(() => {
    const c = animate(mv, wert, { duration: 1.2, ease: [0.2, 0.8, 0.2, 1] });
    return c.stop;
  }, [wert]);
  return <motion.span>{text}</motion.span>;
}

const StatsCard = ({ title, value, icon: Icon }) => (
  <motion.div {...hoverLift} className="flex items-center gap-3 rounded-2xl bg-[#F7F7F8] p-3 dark:bg-[#232429]">
    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white dark:bg-[#1B1C20]" style={{ color: CORAL }}>
      <Icon size={15} />
    </div>
    <div>
      <p className="text-base font-semibold">{value}</p>
      <p className={`text-xs ${muted}`}>{title}</p>
    </div>
  </motion.div>
);

function Sidebar() {
  const [aktiv, setAktiv] = useState(0);
  const items = [LayoutGrid, CalendarDays, FileText, Users, MessageSquare];
  return (
    <nav className="sticky top-0 hidden h-screen w-16 shrink-0 flex-col items-center gap-1.5 bg-[#17181B] py-4 md:flex">
      <div className="mb-4 grid h-9 w-9 place-items-center rounded-xl font-bold text-white"
        style={{ background: `linear-gradient(135deg, ${CORAL}, ${CORAL_2})` }}>P</div>
      {items.map((Icon, i) => (
        <button key={i} onClick={() => setAktiv(i)}
          className={`relative grid h-10 w-10 place-items-center rounded-xl transition-colors ${aktiv === i ? 'text-white' : 'text-[#8E9097] hover:text-white'}`}>
          {aktiv === i && (
            <motion.span layoutId="rail-aktiv" className="absolute inset-0 rounded-xl"
              style={{ background: CORAL, boxShadow: '0 6px 18px rgba(242,95,76,.45)' }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
          )}
          <Icon size={18} className="relative" />
        </button>
      ))}
      <div className="flex-1" />
      <button className="grid h-10 w-10 place-items-center rounded-xl text-[#8E9097] hover:text-white"><Settings size={18} /></button>
    </nav>
  );
}

function Header() {
  const heute = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
  return (
    <header className="mb-6 flex items-center gap-3">
      <div>
        <p className={`text-sm ${muted}`}>{heute}</p>
        <h1 className="text-base font-medium">Guten Tag 👋</h1>
      </div>
      <div className={`ml-auto hidden w-80 items-center gap-2 rounded-full border border-[#ECECEF] bg-white px-4 py-2 text-sm sm:flex dark:border-[#2C2D33] dark:bg-[#1B1C20] ${muted}`}>
        <Search size={15} /> Projekte, Pläne, Personen suchen
        <kbd className="ml-auto rounded-md bg-[#F7F7F8] px-1.5 text-xs dark:bg-[#232429]">⌘K</kbd>
      </div>
      <button className="grid h-10 w-10 place-items-center rounded-full border border-[#ECECEF] bg-white dark:border-[#2C2D33] dark:bg-[#1B1C20]"><Bell size={16} /></button>
      <div className="grid h-10 w-10 place-items-center rounded-full text-sm font-semibold text-white"
        style={{ background: `linear-gradient(135deg, #F7B267, ${CORAL})` }}>PM</div>
    </header>
  );
}

function BudgetCard() {
  return (
    <motion.article {...hoverLift} className={`${card} lg:col-span-8`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className={`text-xs ${muted}`}>Verkehrsstation Musterstadt · Budget</p>
          <h2 className="text-2xl font-medium tracking-tight sm:text-3xl">Kosten im Rahmen halten</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden -space-x-2 sm:flex">
            {team.map((t) => (
              <span key={t.kz} className="grid h-8 w-8 place-items-center rounded-full border-2 border-white text-[11px] font-semibold text-white dark:border-[#1B1C20]"
                style={{ background: t.farbe }}>{t.kz}</span>
            ))}
          </div>
          <span className="hidden items-center gap-1 text-xs text-[#1F9D61] sm:flex"><Circle size={7} fill="currentColor" /> 3 online</span>
          <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}
            className="flex items-center gap-1 rounded-full bg-[#1B1C20] px-4 py-2.5 text-sm font-medium text-white dark:bg-white dark:text-[#1B1C20]">
            <Plus size={15} /> Neue Aufgabe
          </motion.button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <p className="text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl"><Zaehler wert={2.84} suffix=" Mio €" /></p>
        <span className="mb-2 rounded-full bg-[#E3F6EC] px-2.5 py-0.5 text-xs font-medium text-[#1F9D61]">71 % vom Budget</span>
      </div>

      <div className="relative mb-5 mt-9 h-3">
        <div className="absolute inset-0 rounded-full"
          style={{ background: 'repeating-linear-gradient(-45deg,#ECECEF 0 4px,transparent 4px 9px)' }} />
        <motion.div className="absolute inset-y-0 left-0 rounded-full"
          style={{ background: `linear-gradient(90deg, ${CORAL}, ${CORAL_2})` }}
          initial={{ width: 0 }} animate={{ width: '71%' }}
          transition={{ duration: 1.4, ease: [0.2, 0.8, 0.2, 1] }} />
        <div className="absolute -bottom-2 -top-2 w-0.5 bg-[#1B1C20] dark:bg-white" style={{ left: '88%' }}>
          <span className="absolute bottom-full left-1/2 mb-1 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#1B1C20] px-2 py-0.5 text-[11px] font-medium text-white dark:bg-white dark:text-[#1B1C20]">
            Prognose 3,52 Mio €
          </span>
        </div>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-3">
        <StatsCard title="Gesamtbudget" value="4,00 Mio €" icon={Euro} />
        <StatsCard title="Kostenprognose" value="3,52 Mio €" icon={TrendingUp} />
        <StatsCard title="Baufortschritt" value="64 %" icon={Percent} />
      </div>
    </motion.article>
  );
}

function TermineCard() {
  const jetzt = new Date();
  const montag = new Date(jetzt);
  montag.setDate(jetzt.getDate() - ((jetzt.getDay() + 6) % 7));
  const [tag, setTag] = useState((jetzt.getDay() + 6) % 7);
  const tage = Array.from({ length: 7 }, (_, i) => { const d = new Date(montag); d.setDate(montag.getDate() + i); return d; });
  const liste = termine[tag] || [];

  return (
    <aside className={`${card} flex flex-col lg:col-span-4 lg:row-span-2`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Termine</h3>
          <p className={`text-xs ${muted}`}>{tage[tag].toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <button className="grid h-9 w-9 place-items-center rounded-full border border-[#ECECEF] dark:border-[#2C2D33]"><Plus size={15} /></button>
      </div>

      <div className="my-4 grid grid-cols-7 gap-1.5">
        {tage.map((d, i) => (
          <button key={i} onClick={() => setTag(i)}
            className={`relative rounded-2xl py-2 text-center text-[11px] ${tag === i ? 'text-white dark:text-[#1B1C20]' : `bg-[#F7F7F8] dark:bg-[#232429] ${muted}`}`}>
            {tag === i && <motion.span layoutId="tag-aktiv" className="absolute inset-0 rounded-2xl bg-[#1B1C20] dark:bg-white" />}
            <span className="relative">{d.toLocaleDateString('de-DE', { weekday: 'short' })}</span>
            <strong className="relative block text-[15px] font-medium">{d.getDate()}</strong>
          </button>
        ))}
      </div>

      <motion.ul key={tag} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-1 flex-col gap-1">
        {liste.length === 0 && <li className={`px-1.5 py-5 text-sm ${muted}`}>Keine Termine – Zeit für die Kostenfortschreibung.</li>}
        {liste.map(([titel, info, online]) => (
          <li key={titel} className="flex items-center gap-3 rounded-2xl px-1.5 py-2.5 hover:bg-[#F7F7F8] dark:hover:bg-[#232429]">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#FFEBE7]" style={{ color: CORAL }}>
              {online ? <Video size={14} /> : <CalendarDays size={14} />}
            </span>
            <div>
              <p className="text-sm">{titel}</p>
              <p className={`text-xs ${muted}`}>{info}</p>
            </div>
            {online && <button className="ml-auto rounded-full border border-[#ECECEF] px-3 py-1 text-xs dark:border-[#2C2D33]">Beitreten</button>}
          </li>
        ))}
      </motion.ul>
    </aside>
  );
}

function PhasenCard() {
  return (
    <motion.article {...hoverLift} className={`${card} lg:col-span-5`}>
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-xs ${muted}`}>Projektstand</p>
          <p className="text-3xl font-semibold tracking-tight">LPH 8</p>
        </div>
        <button className="rounded-full border border-[#ECECEF] px-3.5 py-1.5 text-xs dark:border-[#2C2D33]">Zum Terminplan</button>
      </div>
      <div className="mt-5 flex h-32 items-end gap-2.5">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((p, i) => {
          const h = p < 8 ? 100 : p === 8 ? 64 : 8;
          const farbe = p < 8 ? 'bg-[#1B1C20] dark:bg-white' : p === 8 ? '' : 'bg-[#F7F7F8] dark:bg-[#232429]';
          return (
            <div key={p} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
              <motion.span className={`w-full rounded-xl ${farbe}`} style={p === 8 ? { background: CORAL } : undefined}
                initial={{ height: 0 }} animate={{ height: `${h}%` }}
                transition={{ delay: i * 0.05, duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }} />
              <small className={`text-[11px] ${muted}`}>{p}</small>
            </div>
          );
        })}
      </div>
    </motion.article>
  );
}

function BehinderungenCard() {
  return (
    <motion.article {...hoverLift} className="relative overflow-hidden rounded-3xl p-6 text-white lg:col-span-3"
      style={{ background: `linear-gradient(150deg, ${CORAL_2}, ${CORAL})` }}>
      <div className="absolute -bottom-10 -right-10 h-44 w-44 rounded-full border-[26px] border-white/15" />
      <h3 className="font-medium">Offene Behinderungen</h3>
      <p className="mb-1.5 mt-2.5 text-5xl font-semibold">4</p>
      <p className="text-sm opacity-90">2 davon mit Terminwirkung</p>
      <div className="relative mt-2 rounded-2xl border border-white/30 bg-white/20 px-3 py-2.5 text-sm backdrop-blur-md">
        Sperrpause KW 48 noch nicht bestätigt
      </div>
    </motion.article>
  );
}

function PlanlaufCard() {
  return (
    <article className={`${card} lg:col-span-7`}>
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Planlauf</h3>
        <span className="rounded-full bg-[#FFEBE7] px-2.5 py-0.5 text-xs font-medium" style={{ color: CORAL }}>2 Freigaben überfällig</span>
      </div>
      <table className="mt-3 w-full text-sm">
        <thead>
          <tr className={`border-b border-[#ECECEF] text-left dark:border-[#2C2D33] ${muted}`}>
            <th className="py-2 font-normal">Plan</th>
            <th className="hidden py-2 font-normal sm:table-cell">Gewerk</th>
            <th className="py-2 font-normal">Index</th>
            <th className="py-2 font-normal">Status</th>
          </tr>
        </thead>
        <tbody>
          {plaene.map((p) => (
            <tr key={p.plan} className="border-b border-[#ECECEF] last:border-0 dark:border-[#2C2D33]">
              <td className="py-3 pr-2">{p.plan}</td>
              <td className="hidden py-3 sm:table-cell">{p.gewerk}</td>
              <td className="py-3">{p.index}</td>
              <td className="py-3"><span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusStil[p.status].cls}`}>{statusStil[p.status].text}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}

function TeamCard() {
  return (
    <article className={`${card} lg:col-span-5`}>
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Team-Auslastung</h3>
        <span className={`text-xs ${muted}`}>diese Woche</span>
      </div>
      <div className="mt-2.5">
        {team.map((t, i) => (
          <div key={t.kz} className="flex items-center gap-3 py-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-full text-[13px] font-semibold text-white" style={{ background: t.farbe }}>{t.kz}</div>
            <div>
              <p className="text-sm">{t.name}</p>
              <p className={`text-xs ${muted}`}>{t.rolle}</p>
            </div>
            <div className="ml-auto h-1.5 w-28 overflow-hidden rounded-full bg-[#F7F7F8] dark:bg-[#232429]">
              <motion.div className="h-full rounded-full" style={{ background: CORAL }}
                initial={{ width: 0 }} animate={{ width: `${t.last}%` }}
                transition={{ delay: 0.3 + i * 0.1, duration: 0.8 }} />
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

/* ---------- Seite ---------- */
export default function KoralleDashboard() {
  return (
    <div className="flex min-h-screen bg-[#F2F2F4] text-[#1B1C20] dark:bg-[#121316] dark:text-[#F2F2F4]"
      style={{ fontFamily: '"Outfit", system-ui, sans-serif' }}>
      <Sidebar />
      <main className="min-w-0 flex-1 p-4 sm:p-6">
        <Header />
        <section className="grid gap-4 lg:grid-cols-12">
          <BudgetCard />
          <TermineCard />
          <PhasenCard />
          <BehinderungenCard />
          <PlanlaufCard />
          <TeamCard />
        </section>
      </main>
    </div>
  );
}
