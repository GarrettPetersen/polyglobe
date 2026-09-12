"""Add U+2192 on each font's native pixel grid (requires fonttools and brotli)."""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.ttGlyphPen import TTGlyphPen

FONT_ROOT = Path(__file__).resolve().parent.parent / 'public/assets/fonts'
ARROW_ROWS = ('0000100', '0000010', '1111111', '0000010', '0000100')

for filename in ('Silkscreen-Regular.ttf', 'dogicapixel.ttf', 'pixel_pirate.ttf'):
    font = TTFont(FONT_ROOT / filename, recalcTimestamp=False)
    pixel = font['head'].unitsPerEm // 8
    hyphen = font['glyf'][font.getBestCmap()[ord('-')]]
    left = hyphen.xMin
    bottom = hyphen.yMin - 2 * pixel
    pen = TTGlyphPen(None)
    for row, cells in enumerate(ARROW_ROWS):
        for column, filled in enumerate(cells):
            if filled != '1':
                continue
            x, y = left + column * pixel, bottom + (4 - row) * pixel
            pen.moveTo((x, y))
            pen.lineTo((x, y + pixel))
            pen.lineTo((x + pixel, y + pixel))
            pen.lineTo((x + pixel, y))
            pen.closePath()
    name = 'arrowright'
    if name not in font.getGlyphOrder():
        font.setGlyphOrder(font.getGlyphOrder() + [name])
    font['glyf'][name] = pen.glyph()
    font['hmtx'][name] = (left + 8 * pixel, left)
    for table in font['cmap'].tables:
        if table.isUnicode():
            table.cmap[0x2192] = name
    font.save(FONT_ROOT / filename)
    if filename == 'pixel_pirate.ttf':
        font.flavor = 'woff2'
        font.save(FONT_ROOT / 'pixel_pirate.woff2')
