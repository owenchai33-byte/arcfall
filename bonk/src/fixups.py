# Hand clean-ups for stray bits the sheet cutter picks up, then re-trim.
import numpy as np, sys
from PIL import Image
d = sys.argv[1]
FIX = {'ducky': [(215, 425, 9999, 9999)], 'hotdog': [(150, 0, 380, 36)]}
RED = {'ducky': 360}
for name, rects in FIX.items():
    a = np.array(Image.open(f'{d}/{name}.png').convert('RGBA'))
    for x0, y0, x1, y1 in rects: a[y0:y1, x0:x1] = 0
    if name in RED:
        r, g, b = [a[:,:,i].astype(int) for i in range(3)]
        red = (r > 120) & (g < 80) & (b < 80); red[:RED[name]] = False; a[red] = 0
    ys, xs = np.nonzero(a[:,:,3] > 8); a = a[ys.min():ys.max()+1, xs.min():xs.max()+1]
    Image.fromarray(a).save(f'{d}/{name}.png'); print(name, a.shape)
