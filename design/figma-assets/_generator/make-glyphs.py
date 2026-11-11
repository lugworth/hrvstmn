"""Convert the game's bundled fonts to installable TTFs and extract every glyph outline.

Run from design/figma-assets/_generator. Writes ../fonts/*.ttf and ./glyphs.json.
"""
import json
from fontTools.ttLib import TTFont
from fontTools.pens.basePen import BasePen
from fontTools.pens.transformPen import TransformPen

SRC = '../../../public/fonts/'


class DPen(BasePen):
    """Absolute M/L/Q/C/Z only, so a path is trivial to scale and move."""

    def __init__(self, gs):
        super().__init__(gs)
        self.d = []

    @staticmethod
    def f(v):
        return ('%.4f' % v).rstrip('0').rstrip('.')

    def _moveTo(self, p):
        self.d.append('M%s %s' % (self.f(p[0]), self.f(p[1])))

    def _lineTo(self, p):
        self.d.append('L%s %s' % (self.f(p[0]), self.f(p[1])))

    def _qCurveToOne(self, a, p):
        self.d.append('Q%s %s %s %s' % (self.f(a[0]), self.f(a[1]), self.f(p[0]), self.f(p[1])))

    def _curveToOne(self, a, b, p):
        self.d.append('C%s %s %s %s %s %s' % tuple(self.f(v) for v in (*a, *b, *p)))

    def _closePath(self):
        self.d.append('Z')

    def _endPath(self):
        pass


out = {}
for key, name in [('regular', 'DejaVuSansMono'), ('bold', 'DejaVuSansMono-Bold')]:
    font = TTFont(SRC + name + '.woff2')
    upm = font['head'].unitsPerEm
    glyph_set, cmap = font.getGlyphSet(), font.getBestCmap()
    glyphs = {}
    for cp, glyph_name in cmap.items():
        pen = DPen(glyph_set)
        glyph_set[glyph_name].draw(TransformPen(pen, (1 / upm, 0, 0, -1 / upm, 0, 0)))
        glyphs[chr(cp)] = ''.join(pen.d)
    out[key] = glyphs
    out[key + 'Meta'] = dict(upm=upm, advance=font['hmtx'][cmap[ord('M')]][0] / upm,
                             ascent=font['hhea'].ascent / upm, descent=font['hhea'].descent / upm)
    font.flavor = None
    font.save('../fonts/' + name + '.ttf')
json.dump(out, open('glyphs.json', 'w'), ensure_ascii=False)
print('wrote glyphs.json and ../fonts/*.ttf')
