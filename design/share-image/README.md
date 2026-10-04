# Share image (`src/assets/images/share-image.jpg`)

The `og:image` of every page (`src/_layouts/base.njk`): 1200 × 630 JPEG. Keep Salto and the title
inside the centre square (x 285–915): WhatsApp and iMessage crop link previews to a square.

- `share-image.html` — the layout (1200 × 630, site palette, Inter from `src/assets/fonts/`).
- `salto.png` — Salto cut out of a Gemini illustration (the source picture was not kept).
- `extract_salto.py` — how he was cut out: crop, then flood-fill the pale-blue disc from the border
  so the cream belly stays. `uv run --with pillow --with numpy --with scipy python extract_salto.py <source.jpg> salto.png`
  (the crop box is specific to that source picture).

Render after editing the HTML:

```js
// node render.cjs (from this folder)
const { chromium } = require('../../node_modules/@playwright/test');
const { pathToFileURL } = require('url');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  await p.goto(pathToFileURL(__dirname + '/share-image.html').href);
  await p.screenshot({ path: __dirname + '/../../src/assets/images/share-image.jpg', type: 'jpeg', quality: 88 });
  await b.close();
})();
```

Social networks cache previews: after a change, refresh them with the Facebook / LinkedIn sharing
debuggers, or rename the file (and the `og:image` URL).
