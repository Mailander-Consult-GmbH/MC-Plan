/**
 * Großer Monatskalender zum Erfassen der eigenen Leistungen: je Tag die
 * Leistungen mit Stunden und Text, die Tagessumme und rechts die Summe der
 * Woche. Ein Klick auf einen Tag erfasst dort eine neue Leistung (`onNeu`),
 * ein Klick auf eine Leistung öffnet sie (`onOeffnen`). Monat vor und zurück,
 * „Heute“ springt in den laufenden Monat. Wochenenden und Tage außerhalb des
 * Monats sind zurückgenommen, heute ist hervorgehoben.
 *
 * Projektübergreifend (Übersicht) nennt jede Leistung ihr Projekt
 * (`projektKurz`). Ist der Kalender selbst schmal (bis 730 px, Container-Abfrage
 * in leistungen.css – also auch neben der Seitenleiste), zeigt jeder Tag nur
 * seine Stunden; ein Klick auf einen leeren Tag erfasst wie gewohnt, ein Klick
 * auf einen belegten Tag öffnet erst die Liste seiner Leistungen (`TagesListe`)
 * mit „Neue Leistung“.
 */
import { useState } from 'react';
import { addDays, today, wochentag } from '../../../shared/dates';
import { Icon } from '../../../shared/icons';
import { Modal } from '../../../shared/ui';
import { stundenVon } from '../domain/nachweis';
import type { ID, ISODate, Leistung } from '../domain/types';
import { istWochenende, kalenderwoche, langDatum, monatText, monatVersetzt, monatsanfang, monatsende, stundenText, wochenanfang } from '../domain/zeitraum';
import './leistungen.css';

const WOCHENTAGE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

/** Die Wochen (je sieben Tage ab Montag), die den Monat berühren. */
function wochenDesMonats(monat: ISODate): ISODate[][] {
  const wochen: ISODate[][] = [];
  for (let tag = wochenanfang(monatsanfang(monat)); tag <= monatsende(monat); tag = addDays(tag, 7)) {
    wochen.push(Array.from({ length: 7 }, (_, i) => addDays(tag, i)));
  }
  return wochen;
}

export function LeistungsKalender({
  leistungen,
  projektKurz,
  onNeu,
  onOeffnen,
  titel = 'Kalender',
}: {
  /** Die Leistungen, die der Kalender zeigt – im Bereich die eigenen. */
  leistungen: Leistung[];
  /** Kurzbezeichnung des Projekts an jeder Leistung – nur projektübergreifend. */
  projektKurz?: (projektId: ID) => string;
  onNeu: (datum: ISODate) => void;
  onOeffnen: (l: Leistung) => void;
  titel?: string;
}) {
  const heute = today();
  const [monat, setMonat] = useState(() => monatsanfang(heute));
  const [tagesListe, setTagesListe] = useState<ISODate | null>(null);
  const wochen = wochenDesMonats(monat);
  const ersterTag = monatsanfang(monat);
  const letzterTag = monatsende(monat);

  // Leistungen je Tag, am Tag in der Reihenfolge der Erfassung
  const jeTag = new Map<ISODate, Leistung[]>();
  for (const l of leistungen) {
    if (l.datum < wochen[0][0] || l.datum > wochen[wochen.length - 1][6]) continue;
    const liste = jeTag.get(l.datum) ?? [];
    liste.push(l);
    jeTag.set(l.datum, liste);
  }
  for (const liste of jeTag.values()) liste.sort((a, b) => a.erfasst.localeCompare(b.erfasst));
  const imMonat = leistungen.filter((l) => l.datum >= ersterTag && l.datum <= letzterTag);

  // Ein Tag wurde gewählt: Sind seine Einträge ausgeblendet (schmaler Kalender), zeigt ein belegter
  // Tag erst seine Leistungen – sonst ließen sie sich hier nicht öffnen. Was ausgeblendet ist,
  // entscheidet allein die Container-Abfrage in leistungen.css.
  const tagWaehlen = (tag: ISODate, zelle: HTMLElement) => {
    const eintraege = zelle.querySelector('.ln-kal-eintraege');
    const verborgen = !!eintraege && getComputedStyle(eintraege).display === 'none';
    if (verborgen && jeTag.has(tag)) setTagesListe(tag);
    else onNeu(tag);
  };

  return (
    <>
      <div className="card ln-kal">
        <div className="ln-kal-kopf">
          <div className="ln-kal-titel">
            <h2>{titel}</h2>
            <span className="small muted">
              {monatText(monat)}: <b>{stundenText(stundenVon(imMonat))} Std.</b> · {imMonat.length}{' '}
              {imMonat.length === 1 ? 'Leistung' : 'Leistungen'}
            </span>
          </div>
          <div className="ln-kal-nav">
            <button type="button" className="btn-icon" aria-label="Vorheriger Monat" title="Vorheriger Monat" onClick={() => setMonat((m) => monatVersetzt(m, -1))}>
              <Icon name="zurueck" size={16} />
            </button>
            <strong className="ln-kal-monat">{monatText(monat)}</strong>
            <button type="button" className="btn-icon" aria-label="Nächster Monat" title="Nächster Monat" onClick={() => setMonat((m) => monatVersetzt(m, 1))}>
              <Icon name="chevron" size={16} />
            </button>
            <button type="button" className="btn btn-sm btn-outline" disabled={monat === monatsanfang(heute)} onClick={() => setMonat(monatsanfang(heute))}>
              Heute
            </button>
          </div>
        </div>
        <p className="small tertiary ln-kal-hinweis">
          <span className="ln-kal-hinweis-breit">Tag anklicken, um dort eine Leistung zu erfassen – eine Leistung anklicken, um sie zu bearbeiten.</span>
          <span className="ln-kal-hinweis-schmal">Tag anklicken, um dort eine Leistung zu erfassen – ein Tag mit Stunden zeigt erst seine Leistungen.</span>
        </p>

        <div className="ln-kal-raster" role="grid" aria-label={`Leistungen ${monatText(monat)}`}>
          <div className="ln-kal-zeile ln-kal-kopfzeile" role="row">
            {WOCHENTAGE.map((t, i) => (
              <div key={t} role="columnheader" className={`ln-kal-wt ${i >= 5 ? 'ln-kal-we' : ''}`}>
                {t}
              </div>
            ))}
            <div role="columnheader" className="ln-kal-wt ln-kal-summe-kopf" title="Summe der Woche">
              Σ
            </div>
          </div>
          {wochen.map((woche) => {
            const wocheLeistungen = woche.flatMap((t) => jeTag.get(t) ?? []);
            const { woche: kw } = kalenderwoche(woche[0]);
            return (
              <div key={woche[0]} className="ln-kal-zeile" role="row">
                {woche.map((tag) => {
                  const eigene = jeTag.get(tag) ?? [];
                  const summe = stundenVon(eigene);
                  const fremd = tag < ersterTag || tag > letzterTag;
                  const klassen = [
                    'ln-kal-tag',
                    istWochenende(tag) ? 'ln-kal-we' : '',
                    fremd ? 'ln-kal-fremd' : '',
                    tag === heute ? 'ln-kal-heute' : '',
                    eigene.length ? 'ln-kal-belegt' : '',
                  ]
                    .filter(Boolean)
                    .join(' ');
                  // Ob ein belegter Tag erfasst oder erst seine Liste zeigt, hängt an der Breite (tagWaehlen) –
                  // der Text nennt deshalb beides
                  const aktion = eigene.length ? 'Leistungen ansehen oder erfassen' : 'Leistung erfassen';
                  return (
                    <div
                      key={tag}
                      role="gridcell"
                      tabIndex={0}
                      className={klassen}
                      title={`${wochentag(tag)}, ${langDatum(tag)} – ${aktion}`}
                      aria-label={`${wochentag(tag)}, ${langDatum(tag)}${summe ? `, ${stundenText(summe)} Stunden` : ''} – ${aktion}`}
                      onClick={(e) => tagWaehlen(tag, e.currentTarget)}
                      onKeyDown={(e) => {
                        if (e.target !== e.currentTarget) return;
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          tagWaehlen(tag, e.currentTarget);
                        }
                      }}
                    >
                      <div className="ln-kal-tagkopf">
                        <span className="ln-kal-nr">{Number(tag.slice(8, 10))}</span>
                        {summe ? <span className="ln-kal-tagsumme">{stundenText(summe)}</span> : null}
                      </div>
                      <div className="ln-kal-eintraege">
                        {eigene.map((l) => (
                          <button
                            key={l.id}
                            type="button"
                            className="ln-kal-eintrag"
                            title={`${stundenText(l.stunden)} Std. – ${l.text}${projektKurz ? ` (${projektKurz(l.projektId)})` : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onOeffnen(l);
                            }}
                          >
                            <b>{stundenText(l.stunden)}</b>{' '}
                            {projektKurz ? <span className="ln-kal-projekt">{projektKurz(l.projektId)} </span> : null}
                            <span className="ln-kal-text">{l.text}</span>
                          </button>
                        ))}
                      </div>
                      <span className="ln-kal-plus" aria-hidden="true">
                        <Icon name="plus" size={12} />
                      </span>
                    </div>
                  );
                })}
                <div className="ln-kal-woche" title={`KW ${kw}: ${stundenText(stundenVon(wocheLeistungen))} Std.`}>
                  <span className="ln-kal-kw">KW {kw}</span>
                  <span className={stundenVon(wocheLeistungen) ? 'ln-kal-wochensumme' : 'ln-kal-wochensumme leer'}>
                    {stundenText(stundenVon(wocheLeistungen))}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {/* Außerhalb der Karte: Die Container-Abfrage an .ln-kal soll den Dialog nicht einfassen */}
      {tagesListe ? (
        <TagesListe
          tag={tagesListe}
          leistungen={jeTag.get(tagesListe) ?? []}
          projektKurz={projektKurz}
          onNeu={() => {
            setTagesListe(null);
            onNeu(tagesListe);
          }}
          onOeffnen={(l) => {
            setTagesListe(null);
            onOeffnen(l);
          }}
          onClose={() => setTagesListe(null)}
        />
      ) : null}
    </>
  );
}

/** Die Leistungen eines Tages zum Öffnen – im schmalen Kalender, dessen Tage nur ihre Stunden zeigen. */
function TagesListe({
  tag,
  leistungen,
  projektKurz,
  onNeu,
  onOeffnen,
  onClose,
}: {
  tag: ISODate;
  leistungen: Leistung[];
  projektKurz?: (projektId: ID) => string;
  onNeu: () => void;
  onOeffnen: (l: Leistung) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      titel={`${wochentag(tag)}, ${langDatum(tag)}`}
      sub={`${stundenText(stundenVon(leistungen))} Std. · ${leistungen.length} ${leistungen.length === 1 ? 'Leistung' : 'Leistungen'}`}
      onClose={onClose}
      footer={
        <>
          <span className="spacer" />
          <button type="button" className="btn" onClick={onClose}>
            Schließen
          </button>
          <button type="button" className="btn btn-primary" onClick={onNeu}>
            <Icon name="plus" size={14} /> Neue Leistung
          </button>
        </>
      }
    >
      <ul className="ln-kal-tagesliste">
        {leistungen.map((l) => (
          <li key={l.id}>
            <button type="button" className="ln-kal-tageseintrag" onClick={() => onOeffnen(l)}>
              <span className="ln-kal-tageskopf">
                <b>{stundenText(l.stunden)} Std.</b>
                {projektKurz ? <span className="ln-kal-projekt">{projektKurz(l.projektId)}</span> : null}
              </span>
              <span className="ln-kal-tagestext">{l.text || <span className="tertiary">ohne Text</span>}</span>
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
