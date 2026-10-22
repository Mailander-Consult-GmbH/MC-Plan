# Baubetriebsplanung – Rückfragen an die Anwender

Grundlage: Lastenheft „Laufender Baubetrieb – Ideensammler für einen groben Monitor“
(`Idee_BBP_grobplaner_261021.docx`). Der erste Entwurf in KaPlan setzt das Lastenheft um und
trifft dort, wo es offen ist, Annahmen. Jede Frage nennt deshalb unter **Entwurf** den heutigen
Stand – eine kurze Bestätigung („passt“) genügt, wo die Annahme stimmt.

Die Fragen sind nach Themen gegliedert; die mit ★ markierten bestimmen das Verhalten am stärksten
und sollten zuerst geklärt werden.

---

## A. Begriffe und Abkürzungen

**A1. SKM und PzE** – Wofür stehen die Abkürzungen ausgeschrieben, und was geschieht in diesen
Phasen fachlich (wer meldet bei wem, was ist das Ergebnis)?
*Entwurf:* Beide Phasen werden als „noch keine Anmeldung“ behandelt – Sammeleintrag nach Begriff
bzw. tVE-Nr, Bauzeitraum ein ganzes Fahrplanjahr.

**A2. tVE-Nr** – Was bezeichnet die tVE-Nr, wie ist sie aufgebaut, und hat ein SKM-/PzE-Eintrag
genau eine oder mehrere tVE-Nr?
*Entwurf:* Ein Freitextfeld „Begriff / tVE-Nr“ je Eintrag.

**A3. BBK / „MitwirkungBBK“** – Ist die Baubetriebskoordination gemeint? Was genau ist
„Mitwirkung“ (Abstimmung des Entwurfs vor der Anmeldung, Freigabe, Stellungnahme)?

**A4. „Ggf. cfPeDi“** (Bemerkung bei Y8 Änderung_abgelehnt) – Was bedeutet das, und soll die
Anwendung dabei etwas tun (Hinweis anzeigen, Aufgabe anlegen, Feld erfassen)?
*Entwurf:* Der Text steht nur als Hinweis am Status.

**A5. Anmeldungs-Arten** – Die Tabelle im Lastenheft ist zweispaltig. Wir lesen sie als zehn
Arten: SKM, PzE, A_Vor_N-2, A_Vor_N-1, A_unterjahr, B(0), B(S), B, C, Container. Stimmt das?
Was unterscheidet B(0), B(S) und B, und was ist eine „Container“-Anmeldung?
*Entwurf:* Zuordnung zu den Phasen – SKM → SKM, PzE → PzE, A_Vor_N-2/N-1 → Vorprozess, alle
übrigen → unterjährige Anmeldung.

**A6. ÄAbst-Nr** – Woher kommt die Nummer (welches DB-System), wie ist sie aufgebaut?

**A7. „MIC-Projektnummer-wiko“** – Ist „wiko“ das interne System/Kostenträger? Gibt es eine feste
Schreibweise, die wir prüfen sollen?

---

## B. Projekthülle

**B1. Zusätzliche Felder** – Für Listen und Seitenleiste haben wir eine **Bezeichnung** der
Maßnahme ergänzt. Werden weitere Angaben gebraucht, z. B. Streckennummer(n), Regionalbereich,
Auftraggeber/Ansprechpartner DB, Vertretung des Hauptbearbeiters?

**B2. ★ Erster Anmeldetermin** – „je nach Prozessphase lt. Richtlinie, ca-Wert“: Wird der Termin
von Hand eingetragen oder soll er sich aus Bauzeit und Prozessphase ergeben? Welche Prozessphase
ist gemeint – die, in der MIC in das Projekt einsteigt?
*Entwurf:* Feld „Prozessphase des ersten Anmeldetermins“ (SKM, PzE, N-2, N-1, unterjährig) und
ein Vorschlag laut Richtlinie, der übernommen werden kann, aber nicht muss.

**B3. Bauzeit-Ende** – „Ende = i. d. R. Inbetriebnahme + 4 Wochen“: Gilt das immer? Soll die
Inbetriebnahme als eigenes Feld geführt werden?
*Entwurf:* Optionales Feld Inbetriebnahme; das Ende wird auf Knopfdruck mit IBN + 4 Wochen
vorgeschlagen.

**B4. Projektleiter** – Ist der Projektleiter der DB oder der von MIC gemeint?

**B5. Status der Projekthülle** – Wir haben „Aktiv“, „Betreuungspause“ und „Abgeschlossen“
ergänzt. Ist das hilfreich? Wann gilt eine Hülle als abgeschlossen (nach Bauende, nach
Schlussrechnung)?
*Entwurf:* Der Anmeldebedarf abgeschlossener Hüllen erscheint nicht mehr in Übersicht und Terminen.

**B6. ★ Anmeldebedarf** – „Bei längeren Betreuungspausen … nachvollziehen, ob eine Anmeldung zum
nächsten SKM oder PzE oder N-x fällig ist“.
*Entwurf:* Für jedes Fahrplanjahr der Bauzeit werden die Fristen für SKM, PzE, N-2 und N-1
berechnet. Eine Frist gilt als **abgedeckt**, sobald die Hülle für dieses Fahrplanjahr einen
Eintrag in dieser oder einer späteren Phase hat. Fristen deutlich vor dem ersten Anmeldetermin
gelten als „vor Betreuung“. Fristen der nächsten 180 Tage ohne Eintrag erscheinen in der
Übersicht.
– Ist die Prüfung je Fahrplanjahr richtig, oder je Maßnahme/Bauabschnitt?
– Reicht ein beliebiger Eintrag als „abgedeckt“, oder muss er einen bestimmten Status haben
  (z. B. mindestens „Angemeldet“)?
– Wie weit im Voraus soll der Bedarf angezeigt werden?

---

## C. Merkmale der Anmeldung

**C1. Anmelde-ID** – Wann wird sie vergeben (erst mit der Anmeldung im DB-System?), wie ist sie
aufgebaut, und ändert sie sich beim Übergang Vorprozess → unterjährige Anmeldung?
*Entwurf:* Freitext, im Entwurf darf sie fehlen; bei jeder Übernahme in eine neue Phase wird sie
neu abgefragt (vorbelegt mit der bisherigen).

**C2. ★ Bauzeitraum in SKM und PzE** – „gesamtes Fahrplanjahr“: immer genau **ein**
Fahrplanjahr je Eintrag? Oder kann ein Sammeleintrag mehrere Fahrplanjahre umfassen?
*Entwurf:* Ein Fahrplanjahr je Eintrag; das Fahrplanjahr reicht vom Fahrplanwechsel im Dezember
(zweiter Samstag) bis zum nächsten.

**C3. ★ Bauzeitraum tagesscharf** – Reicht „von – bis“ als Datum? Oder braucht es mehrere
Sperrzeiträume je Anmeldung, Uhrzeiten (Nacht-/Wochenendsperrpausen), Sperrart (Totalsperrung,
eingleisig, Gleissperrung) oder betroffene Gleise?
*Entwurf:* Ein Zeitraum von – bis, ohne Uhrzeit.

**C4. Bf/Strecke, Gewerk/Tätigkeit** – Freitext „in Stichworten“ oder Auswahllisten
(Streckennummer, Betriebsstelle/DS100, km von–bis, Gewerkeliste)? Soll danach gefiltert werden?
*Entwurf:* Freitext, durchsuchbar.

**C5. ★ ÄAbst-Nr und AnnexVII** – „nur relevant (und aktiv), wenn eine Änderungsabstimmung
läuft“:
– Welche Status sind „Änderungsabstimmung läuft“? *Entwurf:* X6 Änderung_angemeldet_Vorprozess
  und Y7 Änderung_angestoßen.
– Was geschieht mit beiden Feldern, wenn die Änderung abgeschlossen ist? *Entwurf:* Sie werden im
  Statusverlauf festgehalten und in der Anmeldung geleert, sodass die nächste Änderung leer
  beginnt.
– Braucht auch eine **verspätete Anmeldung** (Y5) ein AnnexVII-Kennzeichen?
– Ist AnnexVII Pflicht, sobald eine Änderung angestoßen wird?

**C6. AnnexVII-Gründe** – „Entspricht Prozessphase“ und „Zustimmung EVU/EIU“ kommen „so gut wie
nie“ vor. *Entwurf:* Sie stehen mit dem Zusatz „(selten)“ am Ende der Auswahl. Lieber ganz
ausblenden?

**C7. Weitere Merkmale** – Fehlt etwas für den Monitor, z. B. Auswirkungskategorie der
Kapazitätseinschränkung, betroffene EVU, Bezug zur tVE, Kosten, Ansprechpartner BBK, Link/Pfad zur
Anmeldung im DB-System?

---

## D. Status-Workflow

**D1. ★ Übernahme in eine neue Phase** – Soll der Eintrag beim Wechsel in die nächste Phase
(z. B. V3 → W0, W3 → X0) **fortgeführt** werden, oder entsteht eine **neue Zeile** und die alte
bleibt mit ihrem Endstatus stehen?
*Entwurf:* Der Eintrag wird fortgeführt; Art, ID und Bauzeitraum werden neu erfasst, der frühere
Stand bleibt im Statusverlauf sichtbar.

**D2. ★ Aufteilen** – „In SKM und PzE gibt es keine Anmeldungen. Daher hier sinnvoll mit
Begriffen/tVE-Nr zusammenfassen.“ Wird ein solcher Sammeleintrag beim Übergang in den Vorprozess
in **mehrere** Anmeldungen aufgeteilt?
*Entwurf:* Bei jeder Übernahme lassen sich weitere Anmeldungen anlegen, die auf den
Ursprungseintrag verweisen. Wird auch das Umgekehrte gebraucht (mehrere Einträge
zusammenfassen)?

**D3. ★ X5 → X5** – Genehmigt_Vorprozess hat sich selbst als Nachfolger. Was ist gemeint – der
Übergang von N-2 nach N-1 bei weiter bestehender Genehmigung? Soll sich dabei die Art von
A_Vor_N-2 auf A_Vor_N-1 ändern?
*Entwurf:* Der Status wird erneut gesetzt, das neue Datum im Verlauf festgehalten; die Art bleibt.

**D4. X5 → Y4** – Eine im Vorprozess genehmigte Anmeldung wird direkt „Angemeldet_fristgerecht“
(unterjährig), ohne Entwurf und BBK-Mitwirkung. Richtig? Ist die Art dann immer A_unterjahr?
*Entwurf:* Die Art wird bei der Übernahme gewählt, vorbelegt ist A_unterjahr.

**D5. Rückfälle nach Ablehnung** – V4 → V0/W0, W4 → V0/W0/X0, X8 → X0/W0/Y0: Bedeutet z. B.
W4 → V0 einen neuen Anlauf im SKM für ein **späteres** Fahrplanjahr? Soll das Fahrplanjahr dabei
automatisch um eins steigen?
*Entwurf:* Das Fahrplanjahr wird bei der Übernahme abgefragt und nicht automatisch verändert.

**D6. Y6 ↔ Y9** – Was bedeutet Y6 Genehmigt → Y9 Abgelehnt (Rücknahme einer Genehmigung?) und
Y9 Abgelehnt → Y6 Genehmigt (Genehmigung nach Einspruch/Eskalation?)? Braucht es dabei eine
Pflichtbemerkung?

**D7. Y8 Änderung_abgelehnt** – Einziger Nachfolger ist Y6. Soll Y8 als eigener Status stehen
bleiben (bis jemand Y6 setzt), oder springt die Anmeldung nach Ablehnung der Änderung gleich auf
Genehmigt zurück?

**D8. X6 „Änderung_angemeldet“ vs. Y7 „Änderung_angestoßen“** – Ist der Unterschied in der
Benennung fachlich gewollt?

**D9. Nummern ohne „1“** – In jeder Phase fehlt die Ziffer 1 (V1, W1, X1, Y1), in Y außerdem
nichts zwischen Y0 und Y2. Ist dort ein Status vorgesehen (z. B. „in Bearbeitung“)?

**D10. ★ Ende einer Anmeldung** – Wann ist eine Anmeldung erledigt? Es gibt keinen Status
„Durchgeführt“ oder „Abgeschlossen“ nach der Sperrpause. Sollen Anmeldungen nach dem Bauzeitraum
automatisch ausgeblendet oder archiviert werden?

**D11. Anmeldeleichen** – „werden komplett gelöscht“. Soll wirklich nichts übrig bleiben, oder
zumindest ein Vermerk in der Projekthülle (wer, wann, warum)?
*Entwurf:* Rückfrage, dann vollständiges Löschen samt Verlauf.

**D12. Korrekturen** – Ein versehentlicher Statuswechsel lässt sich im Entwurf zurücknehmen
(„Letzten Wechsel zurücknehmen“). Ist das gewünscht, oder sollen Wechsel unveränderlich sein?

**D13. Datum des Statuswechsels** – Darf es rückdatiert werden (z. B. Genehmigung vom Vortag erst
heute erfasst)? *Entwurf:* Ja, frei wählbar, Vorgabe heute.

---

## E. Terminfristen

**E1. ★ Werte laut Richtlinie** – Bitte die konkreten Fristen und die Fundstelle (Richtlinie,
Abschnitt, Stand) nennen:

| Frist | Frage | Platzhalter im Entwurf |
| --- | --- | --- |
| Ril_skm | Stichtag je Fahrplanjahr? | 31.03. im Jahr N−4 |
| Ril_pze | Stichtag je Fahrplanjahr? | 31.03. im Jahr N−3 |
| Ril_N-2 | Stichtag je Fahrplanjahr? | 31.10. im Jahr N−2 |
| Ril_N-1 | Stichtag je Fahrplanjahr? | 30.04. im Jahr N−1 |
| Ril_A | Wochen vor Baubeginn? | 26 Wochen |
| Ril_B(0) | Wochen vor Baubeginn? | 20 Wochen |
| Ril_B(S) | Wochen vor Baubeginn? | 16 Wochen |
| Ril_B | Wochen vor Baubeginn? | 12 Wochen |
| Ril_C | Wochen vor Baubeginn? | 6 Wochen |
| Ril_Container | Wochen vor Baubeginn? | 4 Wochen |

Die Platzhalter sind frei gewählt und in der Anwendung als solche gekennzeichnet. Falls sich eine
Frist anders berechnet (z. B. Monate vor dem Fahrplanwechsel, Kalenderwoche, abhängig von
Dauer oder Auswirkung der Sperrung), bitte die Regel beschreiben.

**E2. „Nächster 1.8.“ / „Nächster 31.7.“** – Gerechnet ab dem Tag, an dem angemeldet wurde?
Was ist an diesem Tag zu erwarten (Ergebnis/Bescheid) – und warum unterscheiden sich SKM (1.8.)
und PzE (31.7.)?
*Entwurf:* Der nächste 1.8. bzw. 31.7. ab dem Statuswechsel.

**E3. „− 14 Tage“ und „− 2 Tage“** – Kalender- oder Arbeitstage? Gehen die 14 Tage an die BBK
(Vorlauf für die Mitwirkung)?
*Entwurf:* Kalendertage.

**E4. ★ „Nachhak-Termin!?“** (X4, X6, Y4, Y5, Y7) – Welcher Abstand ist sinnvoll? Für alle Status
gleich oder je Status verschieden? Ab Statuswechsel oder abhängig vom Baubeginn?
*Entwurf:* Einheitlich 21 Tage nach dem Statuswechsel (einstellbar); jeder Termin lässt sich je
Anmeldung von Hand setzen, „Nachgehakt …“ hält das Nachhaken mit Notiz und neuem Termin fest.

**E5. Fristen in „Genehmigt“-Status** – V3 (Ril_pze), W3 (Ril_N-2), X5 (Ril_A): Wir verstehen
diese Frist als „bis dahin muss die Übernahme in die nächste Phase erfolgt sein“. Richtig?

**E6. Ampel** – Ab wie vielen Tagen vor der Frist soll eine Anmeldung als „fällig“ gelten?
*Entwurf:* 14 Tage (einstellbar).

**E7. ★ Fristgerecht oder verspätet** – Wann ist eine unterjährige Anmeldung „verspätet“ (Y5)?
Soll die Anwendung beim Wechsel aus Y3 selbst vorschlagen, ob Y4 oder Y5 zutrifft (Anmeldedatum
nach Ril_X)?
*Entwurf:* Die Wahl trifft die bearbeitende Person.

**E8. Vorprozess immer fristgerecht** – Das Lastenheft nimmt an, dass Anmeldungen in den
Vorprozessen N-x immer fristgerecht erfolgen. Gibt es Ausnahmen, die abgebildet werden müssen?

---

## F. Bedienung, Ausgaben und Betrieb

**F1. Nutzerkreis** – Wer arbeitet mit dem Monitor (Hauptbearbeiter, Projektleitung,
Vertretung)? Brauchen mehrere Personen denselben Datenbestand?
*Hinweis:* Wie im Planlaufmanagement liegen die Daten derzeit lokal im Browser; ein gemeinsamer
Bestand setzt eine Datenbank voraus.

**F2. Sicht „Meine Projekthüllen“** – Soll nach Hauptbearbeiter gefiltert werden können?
*Entwurf:* Markieren mit ★ wie im Planlaufmanagement.

**F3. E-Mail-Erinnerungen** – Sollen wie im Planlaufmanagement vorbereitete E-Mails erzeugt
werden (z. B. Nachhaken bei BBK oder DB-Projektleitung)? An wen, mit welchem Inhalt?

**F4. Berichte** – Welche Ausgaben werden gebraucht (Liste je Projekthülle, Gesamtliste aller
Anmeldungen, Monatsbericht an den Auftraggeber, PDF)?
*Entwurf:* Excel je Projekthülle mit den Blättern „Anmeldungen“ und „Projekthüllen“.

**F5. Import** – Gibt es bestehende Listen (Excel), die übernommen werden sollen? Wenn ja, bitte
ein Beispiel mit den Spaltenüberschriften.

**F6. Zeitstrahl** – Wäre eine Kalender- oder Balkenansicht der Sperrpausen hilfreich, etwa je
Strecke, um Überschneidungen zu erkennen? Soll die Anwendung vor Überschneidungen warnen?

**F7. Verbindung zum Planlaufmanagement** – Betreffen beide Bereiche oft dieselben Projekte?
Soll eine Projekthülle mit einem Projekt des Planlaufmanagements verknüpft werden können?
*Entwurf:* Beide Bereiche sind vollständig getrennt.
