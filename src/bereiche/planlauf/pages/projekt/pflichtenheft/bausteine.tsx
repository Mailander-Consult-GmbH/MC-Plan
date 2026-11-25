/**
 * Bausteine des Reiters „Pflichtenheft“, die Seite und Assistent teilen:
 * verzögertes Speichern (`useEntwurf`, `EntwurfFeld`), Text mit farbigen
 * Platzhaltern (`PlatzhalterText`, `usePlatzhalterBausteine`), Bildwahl und
 * die Felder einer Unterschriftszeile.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { PFLICHTENHEFT_GRUPPEN, PFLICHTENHEFT_PLATZHALTER, type PflichtenheftPlatzhalterGruppe } from '../../../domain/pflichtenheft';
import type { PflichtenheftArt, Unterschrift } from '../../../domain/types';
import { Icon } from '../../../../../shared/icons';
import { useToast } from '../../../../../shared/toast';
import {
  BausteinEditor,
  type BausteinEditorGriff,
  type BausteinTon,
  type BausteinVerzeichnis,
} from '../../../../../shared/bausteinEditor';
import { TextInput } from '../../../../../shared/ui';

/* ------------------------------------------------------------------ */
/* Hilfen                                                              */
/* ------------------------------------------------------------------ */

/**
 * Eingabe mit verzögertem Speichern: Der Entwurf folgt jedem Tastendruck,
 * gespeichert wird nach einer kurzen Pause und spätestens beim Verlassen.
 * Ändert sich der gespeicherte Wert von außen, übernimmt ihn der Entwurf,
 * solange nichts ungespeichert ist.
 */
export function useEntwurf(wert: string, speichern: (v: string) => void, ms = 450): [string, (v: string) => void] {
  const [entwurf, setEntwurf] = useState(wert);
  const offen = useRef(false);
  const aktuell = useRef(wert);
  const speichernRef = useRef(speichern);
  speichernRef.current = speichern;
  useEffect(() => {
    if (!offen.current) {
      setEntwurf(wert);
      aktuell.current = wert;
    }
  }, [wert]);
  useEffect(() => {
    if (!offen.current) return;
    const t = setTimeout(() => {
      offen.current = false;
      speichernRef.current(aktuell.current);
    }, ms);
    return () => clearTimeout(t);
  }, [entwurf, ms]);
  useEffect(
    () => () => {
      if (offen.current) speichernRef.current(aktuell.current);
    },
    [],
  );
  return [
    entwurf,
    (v: string) => {
      offen.current = true;
      aktuell.current = v;
      setEntwurf(v);
    },
  ];
}

export const GRUPPEN_TON: Record<PflichtenheftPlatzhalterGruppe, BausteinTon> = {
  projekt: 'blau',
  station: 'gruen',
  auftraggeber: 'lila',
  anlagen: 'orange',
};

export const ART_LABEL: Record<PflichtenheftArt, string> = {
  text: 'Text',
  ansprechpartner: 'Ansprechpartner',
  plm: 'Planlaufmanagement',
  anlagen: 'Anlagenverzeichnis',
};

/** Text mit farbigen Platzhaltern und der Leiste zum Einfügen. */
export function PlatzhalterText({
  wert,
  onChange,
  bausteine,
  label,
  zeilen = 6,
  einzeilig = false,
  leiste = true,
}: {
  wert: string;
  onChange: (v: string) => void;
  bausteine: BausteinVerzeichnis;
  label: string;
  zeilen?: number;
  einzeilig?: boolean;
  leiste?: boolean;
}) {
  const griff = useRef<BausteinEditorGriff>(null);
  const [entwurf, setEntwurf] = useEntwurf(wert, onChange);
  return (
    <div className="phe-text">
      <BausteinEditor
        griff={griff}
        wert={entwurf}
        onChange={setEntwurf}
        bausteine={bausteine}
        label={label}
        zeilen={zeilen}
        einzeilig={einzeilig}
        leer="Text eingeben …"
      />
      {leiste ? (
        <div className="phe-palette" role="group" aria-label={`Platzhalter in „${label}“ einfügen`}>
          {PFLICHTENHEFT_GRUPPEN.map((g) => (
            <div key={g.id} className="phe-palette-zeile">
              <span className="phe-palette-kat">{g.label}</span>
              <div className="row wrap" style={{ gap: 6 }}>
                {PFLICHTENHEFT_PLATZHALTER.filter((p) => p.gruppe === g.id).map((p) => (
                  <button
                    key={p.schluessel}
                    type="button"
                    className={`bst-knopf bst-ton-${GRUPPEN_TON[g.id]}`}
                    title={bausteine[p.schluessel]?.titel}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => griff.current?.einfuegen(p.schluessel)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <p className="small tertiary">Absätze durch eine Leerzeile trennen, **fett** mit zwei Sternchen.</p>
        </div>
      ) : null}
    </div>
  );
}

/** Eingabefeld mit verzögertem Speichern. */
export function EntwurfFeld({
  wert,
  onChange,
  ...rest
}: { wert: string; onChange: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  const [entwurf, setEntwurf] = useEntwurf(wert, onChange);
  return <TextInput value={entwurf} onChange={setEntwurf} {...rest} />;
}

/** Verkleinert ein Bild auf höchstens 1600 px Breite (JPEG) – der Bestand liegt im localStorage. */
export function bildVerkleinern(datei: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const leser = new FileReader();
    leser.onerror = () => reject(new Error('Bild nicht lesbar'));
    leser.onload = () => {
      const bild = new Image();
      bild.onerror = () => reject(new Error('Bild nicht lesbar'));
      bild.onload = () => {
        const faktor = Math.min(1, 1600 / bild.width);
        const leinwand = document.createElement('canvas');
        leinwand.width = Math.round(bild.width * faktor);
        leinwand.height = Math.round(bild.height * faktor);
        const ctx = leinwand.getContext('2d');
        if (!ctx) return reject(new Error('Bild nicht lesbar'));
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, leinwand.width, leinwand.height);
        ctx.drawImage(bild, 0, 0, leinwand.width, leinwand.height);
        resolve(leinwand.toDataURL('image/jpeg', 0.8));
      };
      bild.src = String(leser.result);
    };
    leser.readAsDataURL(datei);
  });
}

/** Platzhalter als farbige Bausteine; der Tooltip nennt den Wert im Projekt. */
export function usePlatzhalterBausteine(werte: Record<string, string>): BausteinVerzeichnis {
  return useMemo(
    () =>
      Object.fromEntries(
        PFLICHTENHEFT_PLATZHALTER.map((p) => [
          p.schluessel,
          {
            label: p.label,
            ton: GRUPPEN_TON[p.gruppe],
            titel: `${p.beschreibung}\nIm Projekt: ${werte[p.schluessel]?.trim() ? werte[p.schluessel] : '(noch leer)'}`,
          },
        ]),
      ),
    [werte],
  );
}

/** Bild für das Deckblatt wählen, ersetzen oder entfernen. */
export function BildWahl({ wert, onChange }: { wert: string; onChange: (url: string) => void }) {
  const toast = useToast();
  const datei = useRef<HTMLInputElement>(null);
  const waehlen = async (f: File | undefined) => {
    if (!f) return;
    try {
      onChange(await bildVerkleinern(f));
    } catch {
      toast('Das Bild ließ sich nicht lesen.');
    }
  };
  return (
    <div className="row wrap" style={{ gap: 12, alignItems: 'center' }}>
      {wert ? <img className="phe-bild" src={wert} alt="Bild auf dem Deckblatt" /> : null}
      <button type="button" className="btn btn-outline btn-sm" onClick={() => datei.current?.click()}>
        <Icon name="bild" size={13} /> {wert ? 'Bild ersetzen' : 'Bild wählen'}
      </button>
      {wert ? (
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange('')}>
          Bild entfernen
        </button>
      ) : null}
      <input
        ref={datei}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          void waehlen(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </div>
  );
}

/** Ort, Datum, Funktion (OE) und Name einer Unterschriftszeile; die Vorbelegung steht grau im Feld. */
export function UnterschriftFelder({
  label,
  wert,
  vorgabe,
  onChange,
}: {
  label: string;
  wert: Unterschrift;
  vorgabe: Unterschrift;
  onChange: (patch: Partial<Unterschrift>) => void;
}) {
  return (
    <div className="phe-unterschrift">
      <div className="phe-unterschrift-titel">{label}</div>
      <div className="phe-unterschrift-felder">
        <EntwurfFeld wert={wert.ort} onChange={(v) => onChange({ ort: v })} placeholder={vorgabe.ort || 'Ort'} aria-label={`${label}: Ort`} />
        <TextInput
          type="date"
          value={wert.datum ?? ''}
          onChange={(v) => onChange({ datum: v || null })}
          aria-label={`${label}: Datum`}
          title={!wert.datum && vorgabe.datum ? 'Leer: Datum der ersten Ausgabe' : undefined}
        />
        <EntwurfFeld
          wert={wert.funktion}
          onChange={(v) => onChange({ funktion: v })}
          placeholder={vorgabe.funktion || 'Funktion (OE)'}
          aria-label={`${label}: Funktion (OE)`}
        />
        <EntwurfFeld wert={wert.name} onChange={(v) => onChange({ name: v })} placeholder={vorgabe.name || 'Name'} aria-label={`${label}: Name`} />
      </div>
    </div>
  );
}
