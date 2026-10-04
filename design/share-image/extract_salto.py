"""Cut Salto out of the Gemini picture: crop around the frog, then remove the pale-blue disc
by flood-filling from the crop border (so the cream belly, enclosed by blue, is kept).
Edges get a soft alpha from the colour distance to the disc."""
import sys
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert("RGB")
crop = im.crop((540, 105, 885, 445))  # frog bbox (567,128)-(857,417) + margin, still inside the disc
a = np.asarray(crop).astype(float)
bg = np.array([222, 238, 250])
dist = np.sqrt(((a - bg) ** 2).sum(axis=2))

near_bg = dist < 60
labels, _ = ndimage.label(near_bg)
border = set(np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))) - {0}
outside = np.isin(labels, list(border))

# Grow the outside a little and fade across the band, so no pale fringe stays around the frog
grown = ndimage.binary_dilation(outside, iterations=2)
alpha = np.where(outside, 0.0, 1.0)
band = grown & ~outside
alpha[band] = np.clip((dist[band] - 40) / 45, 0, 1)
alpha_img = Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7))

rgba = crop.copy()
rgba.putalpha(alpha_img)
bbox = rgba.getbbox()
rgba = rgba.crop(bbox)
rgba.save(out)
print("saved", out, rgba.size)
