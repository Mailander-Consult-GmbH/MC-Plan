/**
 * Projektübergreifende Funktionen. Sie bilden die Auswahl, aus der jede
 * Person der Projektbeteiligtenliste ihre Funktion erhält. Eine Funktion, die
 * noch Projektbeteiligten zugeordnet ist, lässt sich nicht löschen.
 */
import { useState } from 'react';
import { Icon } from '../../../shared/icons';
import { useToast } from '../../../shared/toast';
import { Card, CardHeader, ConfirmDialog, EmptyState, Search } from '../../../shared/ui';
import { FunktionDialog } from '../components/FunktionDialog';
import type { Funktion } from '../domain/types';
import { useStore } from '../store/store';

export function Funktionen() {
  const { data, deleteFunktion } = useStore();
  const toast = useToast();
  const [suche, setSuche] = useState('');
  const [dialog, setDialog] = useState<{ funktion?: Funktion } | null>(null);
  const [loeschen, setLoeschen] = useState<Funktion | null>(null);

  const verwendung = (f: Funktion) => {
    const personen = data.beteiligte.filter((b) => b.funktionId === f.id);
    return { personen: personen.length, projekte: new Set(personen.map((b) => b.projektId)).size };
  };

  const funktionen = [...data.funktionen]
    .filter((f) => [f.name, f.kuerzel, f.beschreibung].join(' ').toLowerCase().includes(suche.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name, 'de'));

  return (
    <div className="stack">
      <div className="row-between wrap">
        <div className="row wrap">
          <Search value={suche} onChange={setSuche} placeholder="Funktion, Kürzel …" />
          <p className="muted small" style={{ maxWidth: 560 }}>
            Funktionen gelten für alle Projekte. Wer eine Person in die Projektbeteiligtenliste aufnimmt, wählt ihre
            Funktion aus dieser Liste – oder legt dort eine neue an, die dann ebenfalls hier erscheint.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setDialog({})}>
          <Icon name="plus" size={14} /> Neue Funktion
        </button>
      </div>

      <Card>
        <CardHeader titel="Funktionen" sub={`${data.funktionen.length} Funktionen, projektübergreifend`} />
        {funktionen.length === 0 ? (
          <EmptyState
            icon="person"
            titel={suche ? 'Keine Funktion gefunden' : 'Keine Funktionen'}
            text="Legen Sie die Funktionen an, die in Ihren Projekten vorkommen."
            action={
              <button type="button" className="btn btn-primary" onClick={() => setDialog({})}>
                <Icon name="plus" size={14} /> Neue Funktion
              </button>
            }
          />
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Funktion</th>
                  <th>Kürzel</th>
                  <th className="col-optional">Beschreibung</th>
                  <th className="col-optional">Verwendet</th>
                  <th className="actions" />
                </tr>
              </thead>
              <tbody>
                {funktionen.map((f) => {
                  const v = verwendung(f);
                  return (
                    <tr key={f.id} className="clickable" onClick={() => setDialog({ funktion: f })}>
                      <td>
                        <span className="row" style={{ gap: 8 }}>
                          <span className="dot" style={{ background: f.farbe }} />
                          <strong>{f.name}</strong>
                        </span>
                      </td>
                      <td className="num">{f.kuerzel || '–'}</td>
                      <td className="small muted col-optional">{f.beschreibung || '–'}</td>
                      <td className="small muted col-optional">
                        {v.personen === 0
                          ? '–'
                          : `${v.personen} ${v.personen === 1 ? 'Person' : 'Personen'} in ${v.projekte} ${
                              v.projekte === 1 ? 'Projekt' : 'Projekten'
                            }`}
                      </td>
                      <td className="actions">
                        <button
                          type="button"
                          className="btn-icon"
                          aria-label="Funktion löschen"
                          title="Funktion löschen"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (v.personen > 0) {
                              toast(
                                `„${f.name}“ ist noch ${v.personen} Projektbeteiligten zugeordnet und lässt sich deshalb nicht löschen.`,
                              );
                              return;
                            }
                            setLoeschen(f);
                          }}
                        >
                          <Icon name="loeschen" size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {dialog ? <FunktionDialog funktion={dialog.funktion} onClose={() => setDialog(null)} /> : null}

      {loeschen ? (
        <ConfirmDialog
          titel="Funktion löschen?"
          text={`„${loeschen.name}“ steht danach in keinem Projekt mehr zur Auswahl.`}
          onConfirm={() => {
            deleteFunktion(loeschen.id);
            toast('Funktion gelöscht.');
          }}
          onClose={() => setLoeschen(null)}
        />
      ) : null}
    </div>
  );
}
