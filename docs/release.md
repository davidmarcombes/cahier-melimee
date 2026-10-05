# Release — production deployment (www.melimee.fr, LWS)

Everything runs locally; there is no CI. `_site/` is the artifact, uploaded by hand.

## Procedure

1. **Bump the version** — `npm version <x.y.z> --no-git-tag-version`. JS and CSS are loaded as `…?v=<version>` (pages, and the module imports rewritten by `minify`): the version is what makes browsers drop their 1-year cached copies. Same version = old JS/CSS for returning visitors.
2. **Human review done** — http://localhost:8080/admin/, « À vérifier » column: nothing ↻ (stale) or 🚩 left on the series you care about.
3. **Environment** — `.env` must say `SITE_URL=https://www.melimee.fr` (`npm run env:prod`). It is used for the sitemap and absolute URLs.
4. **Full check** — `npm run check -- --full`: lint, unit tests, validation, answer oracle, minify, every e2e spec on every page (desktop + tablet). ~9 min.
5. **Stop `npm start`**, then `npm run build`. The build wipes and rewrites `_site/`, which the dev server also uses. It runs: lint → tests → validation → eleventy → answer oracle → CSS → minify → `html-validate` → service worker.
6. **`npm run release:verify`** — last check of the artifact; it must end with « ✓ Ready to upload ». It checks:
   - **Artifact:** `.htaccess`, `sw.js`, `404.html`, `sitemap.xml`, `robots.txt`, `manifest.json` and `fr/index.html` are present.
   - **No dev content:** no `/admin/`, dashboard data, `dev.js` or `/api/human-*`, and no `localhost` URLs (if there are, `.env` is not on prod).
   - **Sitemap:** every URL is on `https://www.melimee.fr` and `/admin/` isn't listed.
   - **Links:** every local `href` / `src` / `srcset` of every page points to a file of the artifact.
   - **Series:** compares with the live `data.csv` and lists the series that disappear. While we are in pre-release it's a warning, and no redirects are needed. Once the site is public, use `--strict-ids` and add `Redirect 301` lines to `src/.htaccess`.
   - `--offline` skips the live comparison.
7. **Local smoke test** — `npm run serve:local`: home page, one exercise per level, `/404.html`.
8. **Upload by hand** the *contents* of `_site/` to the web root, **including `.htaccess` and `sw.js`**. They are easy to miss: `.htaccess` is a hidden file.
9. **Verify live** — open a few pages in a private window and check `/sitemap.xml`. `/assets/js/app.js` must show a new `Last-Modified`.
10. **Tag** the deployed commit: `git tag v<version>` (e.g. `v1.1.0`), so the next release has a reference point and the footer version maps to a commit.

## Settled

- `/admin/` is a dev tool. It is only written under `npm start` (`src/admin/admin.11tydata.js`) and is never in the sitemap.
- The sitemap stays minimal: static pages only, not the series.
- Pre-release: series IDs may still change, so no redirects are kept.
- Minimal footer: « À propos » and « Contribuer » were removed; their pages are disabled.

## Known — state on 2026-09-29

- Cahiers (2026-10-03): `/fr/connexion/` replaced by `/fr/cahiers/` (several children per browser, import from a file); the onboarding lost its secret link and visual key; `/fr/anon/` rewritten to match. Visitors who already created a cahier keep it (the store migrates v1 data). See `agents/identity.md`.
- Cache: `.htaccess` caches CSS/JS for 1 year. Since v1.1.0 every JS/CSS URL carries `?v=<package version>` (templates + `minify` for module imports) and the service worker matches its cache with `ignoreSearch`, so a version bump reaches visitors with or without a service worker.
- The live site dates from 2026-04-25: 747 series live, 768 in this version (39 new, 18 IDs renamed by `generate:ids`).
