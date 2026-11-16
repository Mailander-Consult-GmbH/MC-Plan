"""
Erzeugt die Fassungen der KaPlan-Logos für dunklen Grund.

Die Logos unter public/logos/ (Logo_Startseite.png und je Bereich eines) sind
für hellen Grund gezeichnet: dunkle Schrift, das Dreieck in Blau und Grau. Für
das dunkle Schema entsteht daraus je Logo eine Datei Logo_<Name>_dunkel.png:

  * Schrift und graue Teile des Dreiecks werden weiß,
  * der blaue Teil des Dreiecks bleibt blau und erhält einen feinen weißen
    Rand, damit er sich vom dunklen Grund abhebt.

Nach dem Austausch eines Logos neu ausführen (braucht Python mit Pillow):

    python3 werkzeuge/logos_dunkel.py

Die Oberfläche zeigt je nach Farbschema die eine oder die andere Datei
(KaPlanLogo in src/shared/logos.tsx).
"""
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter

ORDNER = Path(__file__).resolve().parent.parent / 'public' / 'logos'
LOGOS = ['Startseite', 'Planlaufmanagement', 'Baubetriebsplanung', 'Projektsteuerung']

RAND = 3.5        # Breite des weißen Rands in Bildpunkten der Logodatei (960 px breit)
UEBER = 4         # Überabtastung, damit der Rand glatte Kanten bekommt
WEISS = (255, 255, 255)


def ist_blau(r: int, g: int, b: int) -> bool:
    """Blau des Dreiecks (#21426d) – die dunkle Schrift (#3c434a) ist nur leicht bläulich."""
    return b > r + 30


def dunkle_fassung(bild: Image.Image) -> Image.Image:
    bild = bild.convert('RGBA')
    breite, hoehe = bild.size
    quelle = bild.load()

    # Deckkraft getrennt nach blauen und übrigen Bildpunkten
    blau = Image.new('L', bild.size, 0)
    rest = Image.new('L', bild.size, 0)
    blau_px, rest_px = blau.load(), rest.load()
    for y in range(hoehe):
        for x in range(breite):
            r, g, b, a = quelle[x, y]
            if a == 0:
                continue
            if ist_blau(r, g, b):
                blau_px[x, y] = a
            else:
                rest_px[x, y] = a

    # Weißer Rand: die blaue Fläche rundum um RAND erweitert (vergrößert rechnen, dann verkleinern)
    gross = blau.resize((breite * UEBER, hoehe * UEBER), Image.LANCZOS)
    radius = RAND * UEBER
    erweitert = gross.filter(ImageFilter.GaussianBlur(radius / 2)).point(lambda v: 255 if v > 14 else 0)
    erweitert = erweitert.filter(ImageFilter.GaussianBlur(UEBER / 2))
    rand = erweitert.resize((breite, hoehe), Image.LANCZOS)

    ergebnis = Image.new('RGBA', bild.size, (0, 0, 0, 0))
    ergebnis.paste(Image.new('RGBA', bild.size, WEISS + (255,)), (0, 0), rand)          # Rand
    nur_blau = bild.copy()
    nur_blau.putalpha(blau)
    ergebnis = Image.alpha_composite(ergebnis, nur_blau)                               # Blau darüber
    weiss = Image.new('RGBA', bild.size, WEISS + (0,))
    weiss.putalpha(rest)
    return Image.alpha_composite(ergebnis, weiss)                                      # Schrift und Grau in Weiß


def main() -> None:
    for name in LOGOS:
        quelle = ORDNER / f'Logo_{name}.png'
        ziel = ORDNER / f'Logo_{name}_dunkel.png'
        dunkle_fassung(Image.open(quelle)).save(ziel, optimize=True)
        print(f'{ziel.name} aus {quelle.name}')


if __name__ == '__main__':
    main()
