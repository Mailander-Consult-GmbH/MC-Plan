/**
 * Großer Monatskalender zum Erfassen der eigenen Leistungen: je Tag die
 * Leistungen mit Stunden und Text, die Tagessumme und rechts die Summe der
 * Woche. Ein Klick auf einen Tag erfasst dort eine neue Leistung (`onNeu`),
 * ein Klick auf eine Leistung öffnet sie (`onOeffnen`). Monat vor und zurück,
 * „Heute“ springt in den laufenden Monat. Wochenenden und Tage außerhalb des
 * Monats sind zurückgenommen, heute ist hervorgehoben.
 *
 * Projektübergreifend (Übersicht) nennt jede Leistung ihr Projekt
 * (`projektKurz`). Auf schmalen Bildschirmen zeigt jeder Tag nur seine
 * Stunden; ein Klick erfasst wie gewohnt.
 */
import { useState } from 'react';
import { addDays, today, wochentag } from '../../../shared/dates';
import { Icon } from '../../../shared/icons';
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

  return (
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
      <p className="small tertiary ln-kal-hinweis">Tag anklicken, um dort eine Leistung zu erfassen – eine Leistung anklicken, um sie zu bearbeiten.</p>

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
                return (
                  <div
                    key={tag}
                    role="gridcell"
                    tabIndex={0}
                    className={klassen}
                    title={`${wochentag(tag)}, ${langDatum(tag)} – Leistung erfassen`}
                    aria-label={`${wochentag(tag)}, ${langDatum(tag)}${summe ? `, ${stundenText(summe)} Stunden` : ''} – Leistung erfassen`}
                    onClick={() => onNeu(tag)}
                    onKeyDown={(e) => {
                      if (e.target !== e.currentTarget) return;
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onNeu(tag);
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
  );
}
