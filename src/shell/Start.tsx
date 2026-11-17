/**
 * Startbildschirm: Auswahl des Bereichs, am Fuß die laufende Fassung
 * (src/shared/pwa.ts). Im Koralle-Design mit Tailwind-Utilities gebaut: oben
 * Logo und Wortmarke, darunter Datum, Begrüßung und Aufforderung wie der Kopf
 * der Vorlage, dann je Bereich eine Karte, die sich beim Überfahren anhebt.
 * Die Karten stehen ab 768 px dreispaltig, darunter untereinander.
 *
 * Begrüßt wird nach der Tageszeit und mit dem Vornamen aus „Angemeldet als“
 * (src/gemeinsam/benutzer.ts) – ohne Namen, solange dort keiner eingetragen
 * ist.
 */
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useBenutzer, vornameVon } from '../gemeinsam/benutzer';
import { FEDER, KURVE } from '../shared/bewegung';
import { Icon } from '../shared/icons';
import { KaPlanLogo, MailaenderLogo } from '../shared/logos';
import { FASSUNG, fassungText } from '../shared/pwa';
import { BEREICHE } from './bereiche';
import { zumBereich } from './router';

/** Gruß nach der Tageszeit: von 5 bis 11 Uhr „Guten Morgen“, ab 18 Uhr „Guten Abend“, dazwischen „Hallo“. */
function gruss(stunde: number): string {
  if (stunde >= 5 && stunde < 11) return 'Guten Morgen';
  if (stunde >= 18 || stunde < 5) return 'Guten Abend';
  return 'Hallo';
}

/** Die Uhrzeit – jede Minute neu, damit Gruß und Datum in einem offenen Fenster nicht stehen bleiben. */
function useJetzt(): Date {
  const [jetzt, setJetzt] = useState(() => new Date());
  useEffect(() => {
    const takt = window.setInterval(() => setJetzt(new Date()), 60_000);
    return () => window.clearInterval(takt);
  }, []);
  return jetzt;
}

export function Start() {
  const jetzt = useJetzt();
  const heute = jetzt.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
  const vorname = vornameVon(useBenutzer().name);

  return (
    <div className="start">
      <div className="mx-auto flex min-h-full w-full max-w-[1120px] flex-col px-4 py-5 sm:px-8 sm:py-7">
        <header className="flex items-center justify-between gap-3">
          <h1 className="w-[190px]">
            <KaPlanLogo zustand="neutral" />
          </h1>
          <div className="logo-hell hidden sm:block">
            <MailaenderLogo height={34} />
          </div>
        </header>

        <div className="flex flex-1 flex-col justify-center py-10">
          <p className="text-sm text-gedaempft">{heute}</p>
          <h2 className="mt-1 text-3xl font-medium tracking-tight sm:text-4xl">
            {gruss(jetzt.getHours())}
            {vorname ? `, ${vorname}` : ''}
          </h2>
          <p className="mt-2 text-base text-zweitrangig">Bitte einen Bereich wählen.</p>

          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {BEREICHE.map((b, i) => (
              <motion.button
                key={b.id}
                type="button"
                className="group relative flex flex-col rounded-3xl bg-karte p-6 text-left shadow-karte"
                onClick={() => zumBereich(b.id)}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.6, ease: KURVE } }}
                whileHover={{ y: -5, boxShadow: 'var(--schatten-hoch)', transition: FEDER }}
                whileTap={{ scale: 0.985 }}
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-marke-zart text-marke transition-colors duration-300 group-hover:bg-marke group-hover:text-white">
                    <Icon name={b.icon} size={22} />
                  </span>
                  {b.marke ? (
                    <span className="rounded-full bg-flaeche px-2.5 py-0.5 text-[11px] font-medium text-gedaempft">{b.marke}</span>
                  ) : null}
                </span>
                <strong className="mt-8 text-xl font-medium tracking-tight">{b.titel}</strong>
                {b.untertitel ? <span className="mt-1 text-sm text-gedaempft">{b.untertitel}</span> : null}
                <span className="mt-7 flex justify-end">
                  <span className="grid h-9 w-9 place-items-center rounded-full border border-linie transition-colors duration-300 group-hover:border-transparent group-hover:bg-betont group-hover:text-auf-betont">
                    <Icon name="chevron" size={16} />
                  </span>
                </span>
              </motion.button>
            ))}
          </div>
        </div>

        <p className="mx-auto max-w-[760px] pt-4 text-center text-xs leading-relaxed text-gedaempft max-md:text-left">
          Die Bereiche arbeiten unabhängig voneinander – jeder mit eigenem Datenbestand. Gemeinsam sind
          „Angemeldet als“ (Name und Farbschema) und das Projektregister, über das sie sich Projekte und
          Projektbeteiligte teilen. Daten werden lokal im Browser gespeichert.
          <span className="mt-1.5 block">Fassung vom {fassungText(FASSUNG)}</span>
        </p>
      </div>
    </div>
  );
}
