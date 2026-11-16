"""
Zeichnet die Logos und App-Symbole von KaPlan.

Die Marke ist ein gleichseitiges Dreieck aus drei Winkeln – der Spitze und den
beiden unteren Ecken – mit Lücken dazwischen. Daneben steht „KaPlan“, darunter
rechtsbündig der Name des Bereichs, beides in Outfit, der Schrift der
Programmoberfläche: der Schriftzug kräftig, die Unterzeile leicht.

Die Strichstärken folgen der Marke von Mailänder Consult – jeweils im
Verhältnis zur Größe: die Linien des Dreiecks wie die Linien ihres Zeichens,
„KaPlan“ nahe an ihrer Wortmarke, eine Stufe leichter.

Erzeugt werden

  * public/logos/Logo_<Name>.png        Startseite und je Bereich eines; welcher
                                        Winkel blau ist, unterscheidet die Bereiche
  * public/logos/Logo_<Name>_dunkel.png die Fassungen für das dunkle Farbschema
                                        (über logos_dunkel.py)
  * public/logos/Logo.png               die Marke allein
  * public/icons/kaplan-zeichen-*.png   die Marke für Browser-Tab und Titelleiste
  * public/icons/kaplan-kachel-*.png    die Marke auf heller Kachel (App-Symbole)

Aufruf (braucht Python mit Pillow samt WOFF2-Unterstützung und die mit
`npm ci` installierte Schrift):

    python3 werkzeuge/logos_zeichnen.py

Wer hier Maße oder Farben ändert, führt das Skript aus und checkt alle
erzeugten Dateien mit ein. Ein geändertes App-Symbol braucht neue Dateinamen
(siehe README, Abschnitt „Logos“).
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

from logos_dunkel import dunkle_fassung

WURZEL = Path(__file__).resolve().parent.parent
LOGOS = WURZEL / 'public' / 'logos'
ICONS = WURZEL / 'public' / 'icons'
OUTFIT = WURZEL / 'node_modules' / '@fontsource-variable' / 'outfit' / 'files' / 'outfit-latin-wght-normal.woff2'

# Farben
BLAU = (33, 66, 109)        # #21426d – Logofarbe
GRAU = (190, 194, 197)
TINTE = (59, 65, 72)        # Schrift
KACHEL = (245, 245, 247)    # #f5f5f7
KACHEL_RAND = (222, 222, 226)

# Die Marke in ihrem eigenen Maß: 284 breit, 246 hoch (gleichseitig)
M_BREITE, M_HOEHE = 284.0, 246.0
STRICH = 22.0               # Linienstärke – 0,089 der Höhe, wie im Zeichen von Mailänder Consult
STRICH_KLEIN = 26.0         # für sehr kleine Symbole etwas kräftiger
OBEN_BIS = 100.5            # die Spitze endet hier (waagerechter Schnitt)
UNTEN_AB = 150.5            # die unteren Ecken beginnen hier
LUECKE = (110.0, 174.0)     # Lücke in der Grundlinie

# Logo: 960 × 378, Marke oben links
L_BREITE, L_HOEHE = 960, 378
TEXT_LINKS, TEXT_RECHTS = 320.0, 957.0
GRUNDLINIE, GRUNDLINIE_UNTEN = 209.0, 355.0
GEWICHT, GEWICHT_UNTEN = 640, 300   # „KaPlan“: Stamm/Versalhöhe ≈ 0,20; Unterzeile leicht
SPERRUNG = -3.0
LAENGSTE_UNTERZEILE = 'Planlaufmanagement'   # bestimmt die Größe aller Unterzeilen

# Welcher Winkel blau ist: (Spitze, links unten, rechts unten)
BEREICHE = {
    'Startseite': (None, (True, True, True)),
    'Planlaufmanagement': ('Planlaufmanagement', (True, False, False)),
    'Baubetriebsplanung': ('Baubetriebsplanung', (False, True, False)),
    'Projektsteuerung': ('Projektsteuerung', (False, False, True)),
}

F = 4  # Überabtastung für glatte Kanten


def mitteln(bild: np.ndarray) -> Image.Image:
    """Mittelt F×F Punkte – mit der Deckkraft gewichtet, damit die Ränder keine dunklen Säume bekommen."""
    h, b = bild.shape[0] // F, bild.shape[1] // F
    deck = bild[..., 3:4] / 255.0
    farbe = (bild[..., :3] * deck).reshape(h, F, b, F, 3).mean(axis=(1, 3))
    deck = deck.reshape(h, F, b, F, 1).mean(axis=(1, 3))
    rgb = np.where(deck > 0, farbe / np.maximum(deck, 1e-6), 0)
    aus = np.concatenate([rgb, deck * 255.0], axis=2)
    return Image.fromarray(np.clip(np.rint(aus), 0, 255).astype('uint8'), 'RGBA')


def marke(breite: float, blau=(True, True, True), strich: float = STRICH, leinwand=None, versatz=(0.0, 0.0)) -> Image.Image:
    """Die Marke in der Breite `breite` (Bildpunkte), auf einer Leinwand (b, h) an der Stelle `versatz`."""
    k = breite / M_BREITE
    b, h = leinwand or (int(np.ceil(breite)), int(np.ceil(M_HOEHE * k)))
    ys, xs = np.mgrid[0:h * F, 0:b * F]
    x = ((xs + 0.5) / F - versatz[0]) / k
    y = ((ys + 0.5) / F - versatz[1]) / k
    kante = np.hypot(M_BREITE / 2, M_HOEHE)
    links = ((x - M_BREITE / 2) * M_HOEHE + y * M_BREITE / 2) / kante       # Abstand zur linken Kante, innen positiv
    rechts = ((M_BREITE / 2 - x) * M_HOEHE + y * M_BREITE / 2) / kante
    unten = M_HOEHE - y
    aussen = (links >= 0) & (rechts >= 0) & (unten >= 0)
    innen = (links >= strich) & (rechts >= strich) & (unten >= strich)
    ring = aussen & ~innen
    teile = (
        ring & (y < OBEN_BIS),
        ring & (y > UNTEN_AB) & (x < LUECKE[0]),
        ring & (y > UNTEN_AB) & (x > LUECKE[1]),
    )
    bild = np.zeros((h * F, b * F, 4), 'float32')
    for maske, ist_blau in zip(teile, blau):
        farbe = BLAU if ist_blau else GRAU
        for i in range(3):
            bild[..., i][maske] = farbe[i]
        bild[..., 3][maske] = 255.0
    return mitteln(bild)


def schrift(gewicht: int, groesse: float) -> ImageFont.FreeTypeFont:
    f = ImageFont.truetype(str(OUTFIT), groesse)
    f.set_variation_by_axes([gewicht])
    return f


def gesetzt(text: str, gewicht: int, punkt: float, grundlinie: float, sperrung: float = 0.0) -> np.ndarray:
    """Der Text als Maske (überabgetastet), beginnend bei x = 200."""
    f = schrift(gewicht, punkt * F)
    im = Image.new('L', (L_BREITE * F * 2, L_HOEHE * F), 0)
    d = ImageDraw.Draw(im)
    x = 200.0 * F
    for zeichen in text:
        d.text((x, grundlinie * F), zeichen, font=f, fill=255, anchor='ls')
        x += f.getlength(zeichen) + sperrung * F
    return np.array(im)


def breite_von(maske: np.ndarray) -> float:
    xs = np.where(maske.any(axis=0))[0]
    return (xs.max() - xs.min() + 1) / F


def groesse_fuer(text: str, gewicht: int, breite: float, sperrung: float = 0.0) -> float:
    """Größte Schriftgröße, in der `text` die Breite nicht überschreitet."""
    unten, oben = 40.0, 320.0
    for _ in range(24):
        mitte = (unten + oben) / 2
        if breite_von(gesetzt(text, gewicht, mitte, 300.0, sperrung)) > breite:
            oben = mitte
        else:
            unten = mitte
    return unten


def als_bild(maske: np.ndarray, kante: float, rechts: bool) -> Image.Image:
    """Legt die Maske linksbündig bzw. rechtsbündig an `kante` und färbt sie in Tinte."""
    xs = np.where(maske.any(axis=0))[0]
    ziel = int(round(kante * F))
    maske = np.roll(maske, ziel - (xs.max() if rechts else xs.min()), axis=1)[:, : L_BREITE * F]
    bild = np.zeros((L_HOEHE * F, L_BREITE * F, 4), 'float32')
    for i in range(3):
        bild[..., i] = TINTE[i]
    bild[..., 3] = maske.astype('float32')
    return mitteln(bild)


def logos() -> None:
    punkt = groesse_fuer('KaPlan', GEWICHT, TEXT_RECHTS - TEXT_LINKS, SPERRUNG)
    schriftzug = als_bild(gesetzt('KaPlan', GEWICHT, punkt, GRUNDLINIE, SPERRUNG), TEXT_LINKS, rechts=False)
    punkt_unten = groesse_fuer(LAENGSTE_UNTERZEILE, GEWICHT_UNTEN, TEXT_RECHTS - 2.0)
    for name, (unterzeile, blau) in BEREICHE.items():
        bild = marke(M_BREITE, blau, leinwand=(L_BREITE, L_HOEHE))
        bild.alpha_composite(schriftzug)
        if unterzeile:
            bild.alpha_composite(als_bild(gesetzt(unterzeile, GEWICHT_UNTEN, punkt_unten, GRUNDLINIE_UNTEN), TEXT_RECHTS, rechts=True))
        bild.save(LOGOS / f'Logo_{name}.png', optimize=True)
        dunkle_fassung(bild.copy()).save(LOGOS / f'Logo_{name}_dunkel.png', optimize=True)
        print(f'Logo_{name}.png und Logo_{name}_dunkel.png')


def marke_mittig(kante: int, breite: float) -> Image.Image:
    """Die Marke, ganz blau, genau mittig auf einer quadratischen, durchsichtigen Fläche."""
    hoehe = M_HOEHE * breite / M_BREITE
    strich = STRICH_KLEIN if hoehe < 45 else STRICH
    return marke(breite, strich=strich, leinwand=(kante, kante), versatz=((kante - breite) / 2, (kante - hoehe) / 2))


def kachel(kante: int, breite: float, rund: bool) -> Image.Image:
    """Die Marke auf heller Fläche – mit runden Ecken und feiner Randlinie oder deckend bis zum Rand."""
    gross = kante * F
    flaeche = Image.new('RGBA', (gross, gross), (0, 0, 0, 0) if rund else KACHEL + (255,))
    if rund:
        d = ImageDraw.Draw(flaeche)
        radius = round(gross * 0.16)
        rand = max(1.0, kante / 128) * F
        d.rounded_rectangle((0, 0, gross - 1, gross - 1), radius=radius, fill=KACHEL_RAND + (255,))
        d.rounded_rectangle((rand, rand, gross - 1 - rand, gross - 1 - rand), radius=max(1, radius - rand), fill=KACHEL + (255,))
    bild = flaeche.resize((kante, kante), Image.LANCZOS)
    bild.alpha_composite(marke_mittig(kante, breite))
    return bild


def symbole() -> None:
    marke_mittig(512, 460).save(LOGOS / 'Logo.png', optimize=True)
    print('Logo.png')
    for kante, breite in ((32, 30), (64, 60), (192, 180)):
        marke_mittig(kante, breite).save(ICONS / f'kaplan-zeichen-{kante}.png', optimize=True)
    for kante, breite in ((48, 36), (64, 46), (96, 64), (192, 122), (512, 328)):
        kachel(kante, breite, rund=True).save(ICONS / f'kaplan-kachel-{kante}.png', optimize=True)
    for kante, breite in ((192, 104), (512, 276)):
        kachel(kante, breite, rund=False).save(ICONS / f'kaplan-kachel-maskable-{kante}.png', optimize=True)
    kachel(180, 114, rund=False).save(ICONS / 'kaplan-kachel-apple-180.png', optimize=True)
    print('kaplan-zeichen-32/64/192.png, kaplan-kachel-48/64/96/192/512.png, kaplan-kachel-maskable-192/512.png, kaplan-kachel-apple-180.png')


if __name__ == '__main__':
    logos()
    symbole()
