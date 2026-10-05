"""Render the existing login's diamond/gradient as launcher and browser icons.

Requires Pillow. Run with --web-public pointing to the web project's public folder.
No fonts or external artwork required.
"""
import argparse
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SIZE = 1024
COLORS = [(245, 212, 125), (191, 76, 130), (93, 32, 87)]
GEM = (255, 243, 180, 255)


def background():
    image = Image.new('RGB', (SIZE, SIZE))
    ramp = []
    for diagonal in range(2 * SIZE - 1):
        t = diagonal / (2 * (SIZE - 1))
        start, end, local = (COLORS[0], COLORS[1], t / .6) if t < .6 else (COLORS[1], COLORS[2], (t - .6) / .4)
        ramp.append(tuple(round(a + (b - a) * local) for a, b in zip(start, end)))
    image.putdata([ramp[x + y] for y in range(SIZE) for x in range(SIZE)])
    return image


def diamond(radius, color=GEM):
    # Supersample the simple vector geometry for clean diagonal edges.
    image = Image.new('RGBA', (SIZE * 2, SIZE * 2))
    center, r = SIZE, radius * 2
    ImageDraw.Draw(image).polygon([(center, center-r), (center+r, center), (center, center+r), (center-r, center)], fill=color)
    return image.resize((SIZE, SIZE), Image.Resampling.LANCZOS)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--web-public', type=Path, required=True)
    args = parser.parse_args()
    assets = ROOT / 'assets' / 'branding'
    assets.mkdir(parents=True, exist_ok=True)
    args.web_public.mkdir(parents=True, exist_ok=True)
    bg = background()
    icon = bg.convert('RGBA')
    icon.alpha_composite(diamond(250))
    icon.convert('RGB').save(assets / 'icon.png')
    bg.save(assets / 'adaptive-background.png')
    # 440px diamond fits entirely inside Android's central 66/108 safe zone.
    diamond(220).save(assets / 'adaptive-foreground.png')
    diamond(220, (255, 255, 255, 255)).save(assets / 'adaptive-monochrome.png')
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <defs><linearGradient id="brand" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f5d47d"/><stop offset=".6" stop-color="#bf4c82"/><stop offset="1" stop-color="#5d2057"/></linearGradient></defs>
  <rect width="1024" height="1024" rx="220" fill="url(#brand)"/>
  <path d="M512 262 762 512 512 762 262 512Z" fill="#fff3b4"/>
</svg>
'''
    (args.web_public / 'favicon.svg').write_text(svg, encoding='utf-8')
    icon.convert('RGB').resize((180, 180), Image.Resampling.LANCZOS).save(args.web_public / 'apple-touch-icon.png')
    mask = Image.new('L', (SIZE, SIZE))
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, SIZE-1, SIZE-1), radius=220, fill=255)
    icon.putalpha(mask)
    icon.save(args.web_public / 'favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)])
    icon.resize((32, 32), Image.Resampling.LANCZOS).save(args.web_public / 'favicon-32x32.png')
    print('Generated launcher icons (1024px), adaptive layers, SVG/ICO favicon and Apple touch icon.')


if __name__ == '__main__':
    main()
