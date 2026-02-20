# Sovereign Identity Flow

The onboarding is purely visual and anonymous. We do not collect emails, real names, or ages.

## 1. Identity Selection (The Triple-Name)

The user chooses from 4 pre-generated identities.
Each identity is a 3-item name (e.g., petit-renard-roux, grande-chouette-bleue).
Gender balance: 2 masculine-coded and 2 feminine-coded identities using distinct animals and colors.

## 2. Unicity & Recognition (The Sticker)

The system assigns a sticker to ensure uniqueness.
Full ID = Triple-Name + Sticker ID.
The user is told: "Remember your animal and your sticker!"

## 3. The Visual Password (The Key)

Password = sequence of 3 images chosen from 8-10 icons per step.
Stored as a hashed string in PocketBase.

## 4. Personal Space (The Permanent Link)

URL format: `https://cahier-melimee.fr/[triple-name]-[sticker-id]`
This link is the user's "front door" for future visits.

## GDPR & Privacy

- **Data minimization:** Only progress, scores, and visual credentials stored
- **Zero PII:** No names, IPs, or contact info linked to identity
- **Risk level:** Low — worst case is losing access to math scores
- **Licence:** EUPL v1.2 (Copyleft)

## PocketBase Integration

- SDK loaded synchronously in `base.njk` (see `agents/performance.md` for why)
- Health check via `window.__pbAvailable` promise (plain fetch, no SDK dependency)
- Demo mode: when PocketBase unavailable, forms show "Mode demo" error
- Lazy instantiation in `reportForm()` — PocketBase only created on submit
