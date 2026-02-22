# Le Cahier de Mélimée

Plateforme d'exercices scolaires **gratuite**, **anonyme** et **souveraine** pour les élèves du CP à la 3e.

Pas de compte, pas de pub, pas de tracking. L'élève choisit un pseudonyme, résout des exercices, et progresse à son rythme.

## Principes

- **Anonymat radical** — Zéro donnée personnelle collectée. Identité par pseudonyme triple + clé visuelle.
- **Gratuité réelle** — Pas de pub, pas d'abonnement, pas de revente de données.
- **Souveraineté** — Open source, hébergé en France, aucune dépendance GAFAM.
- **Sobriété** — Pages ultra-légères (< 14.6 KB par série), architecture minimale.

## Stack technique

| Composant | Rôle |
|-----------|------|
| [Eleventy 2](https://www.11ty.dev/) | Générateur de site statique |
| [Tailwind CSS 3.4](https://tailwindcss.com/) | Framework CSS utility-first |
| [Alpine.js 3](https://alpinejs.dev/) | Interactivité côté client (validation, navigation) |
| [Nunjucks](https://mozilla.github.io/nunjucks/) | Templating |
| [@11ty/eleventy-img](https://www.11ty.dev/docs/plugins/image/) | Optimisation d'images (AVIF, WebP) |
| [PocketBase](https://pocketbase.io/) | Backend pour identité anonyme et progression |

## Architecture

Le site suit une règle **1000 / 10 / 3** :

1. **1000s de `.md`** — Les exercices sont du pur contenu (front-matter + Markdown)
2. **~10 layouts `.njk`** — Les représentations visuelles (calcul, problème, etc.)
3. **2-3 composants Alpine** — Les moteurs centralisés (validation, navigation, filtres)

Chaque série d'exercices génère **une seule page HTML**. Alpine.js affiche un exercice à la fois depuis un payload JSON embarqué au build. Zéro requête réseau entre les exercices.

```
src/
├── _data/                  # Données globales (site.json, navigation.json)
├── _layouts/               # Templates de page
│   ├── base.njk            # Structure HTML de base
│   ├── series-player.njk   # Moteur d'exercices : une page par série
│   ├── exercices-list.njk  # Liste des séries avec filtres
│   ├── connexion-page.njk  # Page de connexion (pseudonyme + autocollant + clé visuelle)
│   ├── onboarding.njk      # Assistant de création de compte
│   ├── page.njk            # Pages statiques
│   ├── post.njk            # Article de blog
│   ├── blog-list.njk       # Liste des articles
│   └── llm.njk             # Génère /llm.txt
├── _includes/components/   # Header, footer
├── assets/
│   ├── images/             # Logo, favicon (optimisés au build). Favicons are also
│   │                       # mirrored to site root via Eleventy passthrough for
│   │                       # maximum browser compatibility.
│   └── js/app.js           # Alpine components (themeToggle, seriesPlayer, seriesBrowser)
├── css/input.css           # Point d'entrée Tailwind
├── fr/
│   ├── index.md            # Accueil
│   ├── connexion.md        # Page de connexion
│   ├── onboarding.md       # Création de compte
│   ├── exercices.md        # Liste des séries (layout: exercices-list)
│   ├── a-propos.md         # À propos
│   ├── contribuer.md       # Guide de contribution
│   ├── confidentialite.md  # Politique de confidentialité
│   ├── mentions-legales.md # Mentions légales
│   ├── blog/               # Articles de blog
│   └── exercices/
│       ├── exercices.json  # Defaults : permalink:false, layout:null
│       ├── series-pages.njk # Pagination : génère une page par série
│       ├── cp-maths-operations-bases-01/
│       │   ├── index.yaml              # Métadonnées (seriesTitle, level, topic…)
│       │   ├── 01-addition-simple.md
│       │   └── 02-soustraction-facile.md
│       ├── ce1-maths-multiplication-tables-01/
│       │   └── ...
│       └── cm2-maths-fractions-bases-01/
│           └── ...
├── llm.md                  # Génère /llm.txt pour les LLM
└── sitemap.xml.njk
```

## Développement

### Prérequis

- Node.js 18+
- npm
- pocketbase

### Installation

```bash
git clone https://github.com/davidmarcombes/cahier-melimee.git
cd cahier-melimee
npm install
```

### Commandes

```bash
npm run dev        # Serveur local avec live reload (http://localhost:8080)
npm run build      # Build de production
npm run clean      # Supprimer _site/
npm run tokens     # Regénérer tailwind.config.js depuis design-tokens.json
npm run db:start   # Lancer PocketBase (http://localhost:8090)
npm run gennames   # Générer les identités 3 mots (CSV vers stdout)
```

### Design tokens

Les couleurs, typographies et espacements sont définis dans `design-tokens.json`. Ne pas éditer `tailwind.config.js` directement — il est généré par `npm run tokens`.

## Contribuer

Toute aide est bienvenue : exercices, code, design, relecture.

### Ajouter des exercices

C'est la contribution la plus utile. Un exercice est un simple fichier Markdown :

```markdown
---
type: number-check
title: "Addition simple"
answer: "7"
operation: "3 + 4"
---

Combien font **3 + 4** ? Écris le résultat.
```

Pour créer une nouvelle série, suivre la convention de nommage `{level}-{topic}-{subtopic}-{name}-{num}` :

1. Créer un dossier dans `src/fr/exercices/` (ex: `cm1-maths-fractions-partage-01/`)
2. Ajouter un fichier `index.yaml` avec les métadonnées :
   ```yaml
   seriesTitle: Fractions et partage
   level: CM1
   topic: maths
   subtopic: fractions
   difficulty: moyen
   ```
3. Ajouter les exercices en `.md` (préfixés `01-`, `02-`, etc.)
4. `npm run build` et vérifier — la page est générée automatiquement par `series-pages.njk`

### Types d'exercices

| `type` | Visuel | Cas d'usage |
|--------|--------|-------------|
| `number-check` | Carte blanche + opération en grand | Calcul mental, opérations |
| `problem` | Carte ambrée + icône livre | Problèmes rédigés |

### Améliorer le code

```bash
npm install
npm run dev
# Modifier, tester, soumettre une PR
```

Le code suit quelques conventions :

- **Tailwind utility-first** — Pas de CSS custom sauf dans `input.css` sous `@layer components`
- **Alpine.js minimal** — Composants déclaratifs dans `app.js`, état simple
- **Mobile-first** — Tester sur petits écrans d'abord
- **Dark mode** — Toute modification UI doit fonctionner en mode jour et nuit
- **Budget taille** — Les pages série doivent rester sous 14.6 KB (fenêtre TCP initiale)

### Règles

- **Zéro PII** — Ne jamais proposer de fonctionnalité qui collecte email, nom, âge ou IP
- **Droit d'auteur** — Créer ses propres énoncés, ne pas copier de manuels scolaires
- **Vérification humaine** — Les exercices générés par IA doivent être relus par un humain

## Licence

[EUPL v1.2](https://joinup.ec.europa.eu/collection/eupl/eupl-text-eupl-12) (European Union Public Licence) — Copyleft, compatible avec la plupart des licences open source.
