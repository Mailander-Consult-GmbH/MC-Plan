"""
Erzeugt die Fassungen der KaPlan-Logos für dunklen Grund.

Die Logos unter public/logos/ (Logo_Startseite.png und je Bereich eines) sind
für hellen Grund gezeichnet: dunkle Schrift, das Dreieck in Blau und Grau. Für
das dunkle Schema entsteht daraus je Logo eine Datei Logo_<Name>_dunkel.png:

  * Schrift und graue Teile des Dreiecks werden weiß,
  * der blaue Teil des Dreiecks bleibt, wie er ist.

Nach dem Austausch eines Logos neu ausführen (braucht Python mit Pillow):

    python3 werkzeuge/logos_dunkel.py

Die Oberfläche zeigt je nach Farbschema die eine oder die andere Datei
(KaPlanLogo in src/shared/logos.tsx).
"""
from pathlib import Path

from PIL import Image

ORDNER = Path(__file__).resolve().parent.parent / 'public' / 'logos'
LOGOS = ['Startseite', 'Planlaufmanagement', 'Baubetriebsplanung', 'Projektsteuerung']

WEISS = (255, 255, 255)


def ist_blau(r: int, g: int, b: int) -> bool:
    """Blau des Dreiecks (#21426d) – die dunkle Schrift (#3c434a) ist nur leicht bläulich."""
    return b > r + 30


def dunkle_fassung(bild: Image.Image) -> Image.Image:
    bild = bild.convert('RGBA')
    breite, hoehe = bild.size
    punkte = bild.load()
    # Die Deckkraft bleibt, wie sie ist – so behalten Schrift und Dreieck ihre glatten Kanten.
    # Auch durchsichtige Bildpunkte werden weiß: Die Datei wird dadurch deutlich kleiner.
    for y in range(hoehe):
        for x in range(breite):
            r, g, b, a = punkte[x, y]
            if a == 0 or not ist_blau(r, g, b):
                punkte[x, y] = WEISS + (a,)
    return bild


def main() -> None:
    for name in LOGOS:
        quelle = ORDNER / f'Logo_{name}.png'
        ziel = ORDNER / f'Logo_{name}_dunkel.png'
        dunkle_fassung(Image.open(quelle)).save(ziel, optimize=True)
        print(f'{ziel.name} aus {quelle.name}')


if __name__ == '__main__':
    main()
