# List of things to address

## Clean up
- [_] topic and subtopic not needed any more in index.yaml ?

## Images
- [✓] Salto identity ok
- [_] Mélimée must be prepared, in particulare share_image.png is BAD

## Colors
- [_] Lighthouse reports lack of contrast on the blue buttons with white font

## Fonts
- [✓] We have stripped version of Inter font. Small file already 
- [_] Dedicated font ?

## Alpine / Pocketbase js
- [_] Do not go via CDN for javascript host in a vendor folder + benefit of pinning ( alpinejs@3.x.x means cache bust on every minor update)

## Cache life on server
- [_] Manage items cache through serve config or metadata on bucket ( Cache-Control key )

## Contributor DX
- [_] No content validation — malformed exercise YAML causes silent runtime failures. A npm run validate script with schema checks per exercise type would catch errors at build time.
- [_] Add ESLint + Prettier — no linting configured currently.

## Performance

- [_] CSS at 32KB vs 30KB budget — audit unused Tailwind utilities.
- [_] app.js is monolithic (330 lines, one giant seriesPlayer function handling 12+ types). Could split validators/type logic into separate files for tree-shaking.

## Contributor DX

- [_] Split .eleventy.js when it grows more — the seriesPayload filter alone is 243 lines. Extract into lib/plugins/exercises.js, lib/filters/series-payload.js, etc. Makes individual pieces testable.

- [_] Automated tests — zero tests currently. Even minimal Jest coverage for generators.js + seriesPayload would make refactoring safe.

- [_] CI pipeline —  build, validate exercises, check bundle budgets on PRs.

- [_] Schema validation per exercise type — define required fields (answer for number-check, columns/rows/solution for logic-grid, etc.) and validate at build time with clear error messages pointing to the offending file.

## LLM.txt
- [_] Render is not good, problem with special chars and carraige returns