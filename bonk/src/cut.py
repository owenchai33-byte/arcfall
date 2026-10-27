# Cut a 2x2 transparent sheet into separate sprites (row-major order).
# Split at the emptiest gap lines, then per quadrant keep only blobs whose centre lies inside it
# (looking a margin past the split so limbs that cross the line stay whole).
import sys, numpy as np
from PIL import Image
from scipy import ndimage
src, names, outdir = sys.argv[1], sys.argv[2].split(','), sys.argv[3]
a = np.array(Image.open(src).convert('RGBA')); al = a[:,:,3].astype(float)
H, W = al.shape
def gap(prof, lo, hi):
    seg = prof[lo:hi]; return lo + int(np.argmin(np.convolve(seg, np.ones(9)/9, 'same')))
ry = gap(al.sum(1), int(H*.35), int(H*.65))
quads = []
for (y0, y1) in ((0, ry), (ry, H)):
    cx = gap(al[y0:y1].sum(0), int(W*.35), int(W*.65))
    quads += [(y0, y1, 0, cx), (y0, y1, cx, W)]
M = 90
for name, (y0, y1, x0, x1) in zip(names, quads):
    if name == '-': continue
    Y0, Y1, X0, X1 = max(0, y0-M), min(H, y1+M), max(0, x0-M), min(W, x1+M)
    sub = a[Y0:Y1, X0:X1].copy()
    m = sub[:,:,3] > 20
    lab, nl = ndimage.label(m)
    idx = range(1, nl+1)
    areas = ndimage.sum(m, lab, idx); cents = ndimage.center_of_mass(m, lab, idx)
    inside = lambda c: y0 <= c[0]+Y0 < y1 and x0 <= c[1]+X0 < x1
    big = [i+1 for i in range(nl) if areas[i] > 2500 and inside(cents[i])]
    bigmask = ndimage.binary_dilation(np.isin(lab, big), iterations=25)
    keep = [i+1 for i in range(nl) if (i+1) in big or (areas[i] >= 30 and inside(cents[i]) and (bigmask & (lab == i+1)).any())]
    km = ndimage.binary_dilation(np.isin(lab, keep), iterations=2)
    sub[~km] = 0
    ys, xs = np.nonzero(sub[:,:,3] > 8); sub = sub[ys.min():ys.max()+1, xs.min():xs.max()+1]
    im = Image.fromarray(sub)
    if max(im.size) > 520: im.thumbnail((520, 520), Image.LANCZOS)
    im.save(f'{outdir}/{name}.png'); print(name, im.size)
