# Sovereign Identity Flow

The onboarding is purely visual and anonymous. We do not collect emails, real names, or ages.
All data is stored in the browser's `localStorage` — no server required.

## 1. Identity Selection (The Triple-Name)

The user chooses from 6 pre-shuffled identities drawn from two hardcoded pools (3 masculine-coded, 3 feminine-coded).
Each identity is a 3-part name (e.g., `petit-renard-roux`, `grande-chouette-bleue`).

## 2. Unicity & Recognition (The Sticker)

The system assigns a random sticker from a pool of 20.
Full ID = Triple-Name + Sticker index (e.g., `petit-renard-roux-3`).
The user is told: "Remember your animal and your sticker!"

## 3. The Visual Password (The Key)

Password = sequence of 3 fruit icons chosen from 10 options.
Stored as a hyphen-joined string in `localStorage` (e.g., `🍎-🍌-🍒`).
Verified client-side on re-login via `connexion-page`.

## 4. Personal Space (The Permanent Link)

URL format: `https://cahier-melimee.fr/fr/cahier/?user=[triple-name]-[sticker-index]`
This link is the user's bookmark for future visits on the same device.

## GDPR & Privacy

- **Data minimization:** Only progress, scores, and visual credentials stored
- **Zero PII:** No names, IPs, or contact info linked to identity
- **Local only:** All data lives in `localStorage` on the user's device — nothing sent to a server
- **Risk level:** Low — worst case is losing access to math scores if localStorage is cleared
- **Licence:** EUPL v1.2 (Copyleft)

## localStorage Schema

```js
// Key: 'melimee_v1'
{
  user: {
    slug: 'petit-renard-roux-3',
    username: 'petit-renard-roux',
    sticker_id: '🎈',
    visual_key: '🍎-🍌-🍒'
  },
  progress: {
    'series-id': { done: true, completedAt: '2026-04-09T10:00:00.000Z' }
  }
}
```

## Pages

- **`/fr/onboarding/`** — Creates new identity, saves to localStorage, shows secret link
- **`/fr/cahier/?user=<slug>`** — Personal progress page, loaded from localStorage
- **`/fr/connexion/`** — Checks localStorage; if a user exists shows their cahier link; otherwise redirects to onboarding
