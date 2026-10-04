# Sovereign Identity Flow

The onboarding is purely visual and anonymous. We do not collect emails, real names, or ages.
All data is stored in the browser's `localStorage` — no server, no account. Several children can
share one browser (one cahier each); a cahier moves between devices only as an exported file.

## 1. Identity Selection (The Triple-Name)

The user chooses from 6 pre-shuffled identities drawn from two pools in `assets/identities.json`
(3 masculine-coded, 3 feminine-coded). Each identity is a 3-part name (e.g., `petit-renard-roux`).

## 2. Recognition (The Sticker)

The system assigns a random sticker from a pool of 20.
Slug = Triple-Name + Sticker index (e.g., `petit-renard-roux-3`), made unique on the device
(`-2`, `-3`… if two children get the same one). The sticker is how a child spots their cahier
on the « Qui travaille aujourd'hui ? » page.

There is no password and no secret link any more: they protected nothing (stored in the same
browser) and the link did not work on another device.

## 3. Several children, one browser

`/fr/cahiers/` lists the cahiers on the device; the child taps theirs, which makes it `current`.
Progress (`markDone`) goes to the current cahier — or to a guest bucket when nobody has a cahier.
The first cahier created adopts the guest progress.

## 4. Export / import

The cahier page offers « Télécharger le fichier »: a JSON file
`{ format: 'cahier-melimee', version: 1, exportedAt, pupil: { slug, username, sticker_id, createdAt, progress } }`.
`/fr/cahiers/#importer` loads it back (`localStore.importUser`): validated, unknown fields dropped;
if the cahier already exists on the device, both progressions are merged (union, earliest date).

## GDPR & Privacy

- **Data minimization:** Only pseudonym, sticker and finished series are stored
- **Zero PII:** No names, IPs, or contact info linked to identity
- **Local only:** All data lives in `localStorage` on the user's device — nothing sent to a server
- **Risk level:** Low — worst case is losing math progress if localStorage is cleared (hence the file export), or a sibling opening another child's cahier
- **Licence:** EUPL v1.2 (Copyleft)

## localStorage Schema

```js
// Key: 'melimee_v1' (name kept; content is version 2 — v1 { user, progress } is migrated on read)
{
  version: 2,
  current: 'petit-renard-roux-3',          // who is working, or null
  pupils: {
    'petit-renard-roux-3': {
      slug: 'petit-renard-roux-3',
      username: 'petit-renard-roux',
      sticker_id: '🎈',
      createdAt: '2026-10-03T10:00:00.000Z',
      progress: { 'series-id': { done: true, completedAt: '2026-10-03T10:20:00.000Z' } }
    }
  },
  progress: {}                             // guest work, before any cahier exists
}
```

API: `src/assets/js/modules/store.js` (`getUser`, `listUsers`, `addUser`, `switchUser`, `clearUser`,
`removeUser`, `markDone`, `getProgress`, `exportUser`, `importUser`), tested in `tests/modules.test.js`.

## Pages

- **`/fr/`** — one main button « Commencer » (exercises) and a discreet « Créer mon cahier » link
- **`/fr/onboarding/`** — « Créer mon cahier »: pick an animal, get a sticker, create (adds a cahier, makes it current)
- **`/fr/cahiers/`** — « Qui travaille aujourd'hui ? »: the cahiers on this device, « Nouveau cahier », import a file. Menu entry « Mon cahier » (shows the current child's sticker)
- **`/fr/cahier/?user=<slug>`** — one child's cahier: progress, « Télécharger le fichier », « Changer d'élève », delete from this device
- **`/fr/anon/`** — privacy explanation for children and parents (keep it in line with this file)
