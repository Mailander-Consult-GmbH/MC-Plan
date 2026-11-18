/**
 * ENTWURF – Anmeldeseite vor dem Startbildschirm (Anmeldung über Microsoft,
 * Single Sign-on). Nur zur Ansicht: Der Knopf meldet niemanden wirklich an.
 * Zwei Fassungen: „A“ eine Karte in der Mitte, „B“ geteilt mit einer Fläche
 * in der Markenfarbe.
 */
import { motion } from 'framer-motion';
import { KURVE } from '../shared/bewegung';
import { Icon } from '../shared/icons';
import { KaPlanLogo, MailaenderLogo } from '../shared/logos';
import { FASSUNG, fassungText } from '../shared/pwa';
import { BEREICHE } from './bereiche';

/** Zeichen von Microsoft für den Anmeldeknopf (vier Quadrate in den Farben der Marke). */
function MicrosoftZeichen({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 21 21" aria-hidden="true" style={{ flex: 'none' }}>
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

function AnmeldeKnopf({ onAnmelden }: { onAnmelden: () => void }) {
  return (
    <button
      type="button"
      className="btn btn-primary w-full justify-center gap-3 py-3 text-[15px]"
      onClick={onAnmelden}
    >
      <MicrosoftZeichen />
      Mit Microsoft anmelden
    </button>
  );
}

const HINWEIS =
  'Die Anmeldung läuft über Microsoft (Single Sign-on) – es gilt Ihr Konto von Mailänder Consult. Ein eigenes Kennwort für KaPlan gibt es nicht.';

function Fuss() {
  return <p className="pt-4 text-center text-xs text-gedaempft">Fassung vom {fassungText(FASSUNG)}</p>;
}

/** Fassung A: eine Karte in der Mitte. */
function AnmeldungMittig({ onAnmelden }: { onAnmelden: () => void }) {
  return (
    <div className="start">
      <div className="mx-auto flex min-h-full w-full max-w-[1120px] flex-col px-4 py-5 sm:px-8 sm:py-7">
        <header className="flex items-center justify-end">
          <div className="logo-hell">
            <MailaenderLogo height={34} />
          </div>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center py-10">
          <motion.div
            className="w-full max-w-[440px] rounded-3xl bg-karte p-6 shadow-karte sm:p-10"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.6, ease: KURVE } }}
          >
            <h1 className="mx-auto w-[230px]">
              <KaPlanLogo variante="Startseite" width="100%" />
            </h1>
            <p className="mt-9 text-2xl font-medium tracking-tight">Anmelden</p>
            <p className="mt-1.5 text-sm text-zweitrangig">Bitte melden Sie sich an, um KaPlan zu öffnen.</p>
            <div className="mt-7">
              <AnmeldeKnopf onAnmelden={onAnmelden} />
            </div>
            <p className="mt-6 border-t border-linie pt-5 text-xs leading-relaxed text-gedaempft">{HINWEIS}</p>
          </motion.div>
        </div>

        <Fuss />
      </div>
    </div>
  );
}

/** Fassung B: links eine Fläche in der Markenfarbe mit den Bereichen, rechts die Anmeldung. */
function AnmeldungGeteilt({ onAnmelden }: { onAnmelden: () => void }) {
  return (
    <div className="start">
      <div className="mx-auto flex min-h-full w-full max-w-[1120px] flex-col px-4 py-5 sm:px-8 sm:py-7">
        <div className="flex flex-1 flex-col justify-center">
          <motion.div
            className="grid gap-4 md:grid-cols-[1.05fr_1fr]"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.6, ease: KURVE } }}
          >
            <div
              className="flex flex-col rounded-3xl p-6 text-white shadow-karte sm:p-10 md:min-h-[520px]"
              style={{ background: 'var(--marke-verlauf)' }}
            >
              <img
                src={`${import.meta.env.BASE_URL}logos/Logo_Startseite.png`}
                alt="KaPlan"
                className="w-[200px]"
                style={{ filter: 'brightness(0) invert(1)', aspectRatio: '960 / 262', objectFit: 'cover', objectPosition: 'top' }}
              />
              <ul className="mt-8 flex flex-col gap-4 md:mt-auto">
                {BEREICHE.map((b) => (
                  <li key={b.id} className="flex items-center gap-3.5">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/15">
                      <Icon name={b.icon} size={20} />
                    </span>
                    <span className="flex flex-col">
                      <strong className="text-[15px] font-medium tracking-tight">{b.titel}</strong>
                      <span className="text-[13px] text-white/70">{b.untertitel}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col rounded-3xl bg-karte p-6 shadow-karte sm:p-10">
              <div className="logo-hell self-end">
                <MailaenderLogo height={30} />
              </div>
              <div className="flex flex-1 flex-col justify-center py-8">
                <p className="text-2xl font-medium tracking-tight sm:text-3xl">Willkommen bei KaPlan</p>
                <p className="mt-1.5 text-sm text-zweitrangig">Bitte melden Sie sich an, um KaPlan zu öffnen.</p>
                <div className="mt-7">
                  <AnmeldeKnopf onAnmelden={onAnmelden} />
                </div>
              </div>
              <p className="border-t border-linie pt-5 text-xs leading-relaxed text-gedaempft">{HINWEIS}</p>
            </div>
          </motion.div>
        </div>

        <Fuss />
      </div>
    </div>
  );
}

export function Anmeldung({ fassung, onAnmelden }: { fassung: 'A' | 'B'; onAnmelden: () => void }) {
  return fassung === 'B' ? <AnmeldungGeteilt onAnmelden={onAnmelden} /> : <AnmeldungMittig onAnmelden={onAnmelden} />;
}
