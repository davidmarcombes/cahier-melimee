# Phase 1 — contenu avec les types existants

> Plan couverture 2026-10 (programmes 2024–2025). Statut : **terminée** le 2026-10-26.
> Suite : [plan-phase-2.md](plan-phase-2.md) (nouveaux types), [plan-phase-3.md](plan-phase-3.md) (équilibre).
> Le détail des lots 1.1–1.9 (séries créées, générateurs) est dans [roadmap.md](roadmap.md) « Plan couverture 2026-10 ».

## Bilan

- 44 nouvelles séries GS → CM2, sans changement moteur.
- Générateurs ajoutés : `multiplierDecimalParEntier`, `calculParentheses` (`operations.js`), `arrondirDecimal` (`fractions-decimaux.js`, + contrôle oracle dans `scripts/lib/gen-checks.js`), `compterEuros` (`mesures.js`).
- Validateur : `fill-table` vérifie que chaque ligne a autant de « ? » que de réponses.
- Voix GS : 6 clips Piper pour `melanger-couleurs-01`.
- Contrôles : `npm run check` vert, `npm run regress -- avant-couverture-2026-10` sans régression.
- Validation par modèle (claude-sonnet-5-5, 2026-10-26) : 183 items, 0 incorrect, 17 sans verdict (figure non décrite, ou rang d'arrondi absent de l'invite — titres non exportés). Verdicts dans `reports/validate-llm-cache.csv`.

## Reste à faire (hors phase 2)

- [ ] Validation à la main des nouvelles séries (`/admin/`, lignes en attente dans `reports/human-validate.csv`).
- [x] Signalements tranchés (2026-10-26) : patrons de cube, couleurs primaires et voix GS validés ; trapèze = « deux côtés opposés parallèles » (inclusif), CM1 `quadrilateres-01` #2 #3 et CM2 `programmes-construction-01` #3 harmonisés.
- [x] Décimal × entier **posé** (`column-op` avec virgule) CM1 / CM2 — `multiplication-posee-decimaux` (exercices CM1, CM2) ; `column-op` × aligne à droite, la virgule n'est alignée que pour + et −.
- [x] Défi « lire l'heure » : le lecteur chronométré affiche l'horloge (`type: clock`) ; défis CE2 `lire-heure-01` (5 min), CM1 `lire-heure-01` (à la minute).
- [x] `scripts/validate-llm.js --export` : un item généré sans titre reprend celui du fichier, comme dans le lecteur.
