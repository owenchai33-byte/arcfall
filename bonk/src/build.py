# Build bonk/index.html: optimise art to webp, make red towers, inline everything.
import base64, io, json, os, re, sys
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
ART = sys.argv[1] if len(sys.argv) > 1 else '/mnt/project-files/bonk-royale/assets'
OUT = os.path.join(HERE, '..', 'index.html')
SIZE = {'king': 460, 'princess': 400, 'logo': 900}
def to_red(im):
    a = np.array(im.convert('RGBA')).astype(float) / 255
    r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    mx, mn = a[..., :3].max(-1), a[..., :3].min(-1)
    bluish = (b >= mx - 1e-6) & (mx - mn > .12) & (b > r + .06)
    out = a.copy()
    # swap blue <-> red channels where blue dominates, keep green
    out[..., 0] = np.where(bluish, b, r); out[..., 2] = np.where(bluish, r * .9, b)
    out[..., 1] = np.where(bluish, g * .75, g)
    return Image.fromarray((out * 255).clip(0, 255).astype('uint8'), 'RGBA')
CACHE = os.path.join(os.path.dirname(ART), 'webp'); os.makedirs(CACHE, exist_ok=True)
def enc(im, q=86):
    buf = io.BytesIO(); im.save(buf, 'WEBP', quality=q, method=4)
    return buf.getvalue()
assets = {}
for f in sorted(os.listdir(ART)):
    if not f.endswith('.png'): continue
    name = f[:-4]; src = os.path.join(ART, f)
    outs = [name] + ([name + '_r'] if name in ('king', 'princess') else [])
    cached = [os.path.join(CACHE, o + '.webp') for o in outs]
    if not all(os.path.exists(c) and os.path.getmtime(c) >= os.path.getmtime(src) for c in cached):
        im = Image.open(src).convert('RGBA')
        mx = SIZE.get(name, 260 if name.startswith('emote') else 380)
        im.thumbnail((mx, mx), Image.LANCZOS)
        open(cached[0], 'wb').write(enc(im))
        if len(outs) > 1: open(cached[1], 'wb').write(enc(to_red(im)))
    for o, c in zip(outs, cached):
        assets[o] = 'data:image/webp;base64,' + base64.b64encode(open(c, 'rb').read()).decode()
head = open(os.path.join(HERE, 'head.html')).read()
cards = re.sub(r'^export ', '', open(os.path.join(HERE, 'cards.js')).read(), flags=re.M)
js = cards + '\n' + '\n'.join(open(os.path.join(HERE, n)).read() for n in ('core.js', 'render.js', 'ui.js'))
html = head.replace('/*__ASSETS__*/', 'window.ASSETS=' + json.dumps(assets) + ';').replace('/*__GAME__*/', js)
open(OUT, 'w').write(html)
print('assets', len(assets), 'bytes', len(html))
