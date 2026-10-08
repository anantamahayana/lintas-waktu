from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
import json
f = TTFont('../fonts/Marcellus-Regular.ttf'); gs = f.getGlyphSet(); cmap = f.getBestCmap(); upm = f['head'].unitsPerEm
S = 100 / upm  # cap height ~ 72 units at font size 100
def fmt(v):
    s = f"{v:.1f}"; return s[:-2] if s.endswith('.0') else s
def build(text, tracking):
    # first pass: bounds, so the path can start at x=0, y=0 (top of caps)
    bp = BoundsPen(gs); x = 0; pos = []
    for i, ch in enumerate(text):
        g = cmap[ord(ch)]; pos.append((g, x, ch))
        if ch != ' ': gs[g].draw(TransformPen(bp, (S, 0, 0, -S, x, 0)))
        x += f['hmtx'][g][0] * S + (tracking * 100 if i < len(text) - 1 else 0)
    xmin, ymin, xmax, ymax = bp.bounds
    pen = SVGPathPen(gs, ntos=fmt)
    for g, gx, ch in pos:
        if ch != ' ': gs[g].draw(TransformPen(pen, (S, 0, 0, -S, gx - xmin, -ymin)))
    return dict(d=pen.getCommands(), w=round(xmax - xmin, 1), h=round(ymax - ymin, 1))
out = {'wordmark': build('LINTAS WAKTU', 0.30)}
json.dump(out, open('wordmark.json', 'w'))
w = out['wordmark']; print(w['w'], w['h'], len(w['d']))
