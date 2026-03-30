---
marp: true
theme: marp_melimee
paginate: true
html: true 

---

# Architecture & Stack

## **Le Cahier de Mélimée : Frugalité et Souveraineté**

<center><br>

![width:180px](../src/assets/images/logo.png)

</center>

> "Simple is better than complex. Complex is better than complicated."
> — The Zen of Python (applied to Web)

---

# 1. Le Noyau Statique : Eleventy (11ty) ⚡

### **Génération à l'exécution (Build-time)**

- **0ms Time-to-First-Byte (TTFB)** : Pages servies via CDN/Nginx sans calcul serveur.
- **Data Cascade** : Utilisation intensive des `exercices.json` pour injecter les métadonnées et schémas de validation par dossier.
- **Isomorphisme JS** : Les générateurs d'exercices (`generators.js`) sont partagés entre Node.js (correction côté build) et Alpine.js (navigation côté client).
- **Zéro-JS par défaut** : Progressive enhancement strict.

---

# 2. Réactivité Sans "VDOM" : Alpine.js 🧩

### **L'alternative chirurgicale à React/Vue**

- **State Management Local** : Utilisation de `Alpine.store('exercises')` pour synchroniser le score global.
- **Encapsulation HTML** : Logique métier injectée directement via attributs `x-data`, `x-init` et `x-text`.
- **Payload Ridicule** : ~15 Ko gzipped pour gérer l'intégralité du cycle de vie des exercices.
- **Communication Inter-Composants** : `@click` et `$dispatch` pour une architecture événementielle simple.

---

# 3. Le Principe 1000 / 10 / 3 🧠

### **Scalabilité par abstraction**

1. **1000+ Fichiers Markdown** : Données pures (Front-matter YAML). Pas de duplication de structure.
2. **10 Layouts Nunjucks** : Templates génériques (`grid.njk`, `pyramid.njk`, `matching.njk`) utilisant des macros.
3. **3 Moteurs Alpine** :
    - `seriesPlayer` : Orchestration des exercices.
    - `defiPlayer` : Gestion du temps réel (RequestAnimationFrame).
    - `appliPlayer` : Outils interactifs (Glisser-déposer, manipulations).

---

# 4. Pipeline de Qualité 🛠️

`npm run build` n'autorise aucune erreur sur la chaîne CI/CD :

1. **Unit Testing** : Vitest pour les algorithmes de génération aléatoire (`npm test`).
2. **E2E Testing** : Playwright sur le `_site/` compilé — un test par série (layout) et un par type (smoke) (`npm run test:e2e`). 689 tests couvrent 634 séries et 44 types via un serveur statique sur `:4173`.
3. **Exercise Validation** : Schémas JSON stricts sur chaque `.md`.
4. **Token Injection** : Transformation de `design-tokens.json` vers Tailwind & CSS Vars.
5. **Eleventy Core** : Assemblage Nunjucks + Minification HTML (Terser).
6. **Atomic CSS** : Build Tailwind optimisé sur le contenu réel.
7. **Linter WCAG** : `html-validate` sur le rendu final (A11y & Structure).

---

# 5. Budgets de Performance Draconiens 🏃‍♂️

### **L'accessibilité par la légèreté**

- **Target HTML < 18 KB** : Nettoyage via Nunjucks pour n'inclure que les partials (`types/*.njk`) utilisés sur la page.
- **Target CSS < 30 KB** : Bundle Tailwind expurgé sans plugins lourds.
- **Conditional Script Loading** : `svg.js` ou `KaTeX` chargés uniquement via détection de flags (`generator:` ou `$`) dans le front-matter.
- **Brotli Quality 11** : Scripts de post-compression pour un transfert optimal.

---

# 6. Design System  💎

### **De `design-tokens.json` vers le DOM**

```json
{ "colors": { "primary-500": { "light": "#2a85bf", "dark": "#4da7d9" } } }
```

1. **Génération Tailwind** : Les classes `bg-p` ou `text-p` sont créées dynamiquement.
2. **CSS Custom Properties** : Injection d'un bloc de variables courtes (`--p`, `--a`, `--sf`) dans le `:root`.
3. **Dual-Theme Natif** : Bascule Cahier (Light) / Étang (Dark) sans rechargement, supportant `prefers-color-scheme`.

---

# 7. Rendu Géométrique (SVG Gen) 🎨

### **Pourquoi générer les figures dynamiquement ?**

- **Vecteur vs Raster** : 1 Ko de texte (SVG) vs 50 Ko d'image (PNG).
- **Intégration Design Token** : Utilisation de `fill="var(--green)"` directement dans le code JS.
- **Précision Chirurgicale** : Générateurs d'`horloges`, `fractions` et `réglettes` avec angles et subdivisions calculés à la volée.
- **Optimisation** : Arrondi des coordonnées à 2 décimales pour réduire le poids du DOM.

---

# 8. Backend PocketBase & Privacy 🔐

### **Infrastructure "Zero-Maintenance"**

- **Single Binary Go** : Performance I/O maximale pour la persistance des scores.
- **Anonymous Auth** : Génération de pseudonymes (Loup Agile) pour éviter tout stockage de PII (RGPD by design).
- **Zéro Tracking GAFAM** : Pas de Google Analytics, pas de polices externes, pas de CDN tiers en production.
- **PWA Offline-First** : Cache Service Worker pour permettre l'usage en classe sans connexion stable.

---

# 9. QA IA : Validation par LLM Local 🤖

### **L'IA comme correcteur de bugs, pas de code**

- **Ollama Engine** : Utilisation d'un modèle local (`Qwen-2.5-Coder`) pour "jouer" les exercices lors du build.
- **Détection d'Impasibles** : L'IA identifie si un exercice généré aléatoirement n'a pas de solution ou est ambigu.
- **Fingerprinting** : Chaque exercice est validé par hash ; si le contenu change, l'IA re-valide.

---

# 10. Audit Pédagogique 📊

### **Le "Data-Mining" éducatif**

- **`exercises-report.csv`** : Analyse dimensionnelle de la base de contenu.
- **Mapping Conceptuel** : Chaque exercice est taggué selon les classes de problèmes de Vergnaud.
- **Coverage Monitoring** : Scripts d'analyse pour détecter les "trous" dans la progression (ex: "Manque d'exercices sur la division en CM1").

---

# 11. Souveraineté & Licence EUPL 🇫🇷

### **Un Commun Numérique**

- **Hébergement Souverain** : Serveurs localisés en France / UE.
- **Copyleft Européen** : La licence EUPL protège le code contre l'appropriation propriétaire tout en facilitant la réutilisation par les institutions publiques.
- **Indépendance Technique** : Reproductibilité totale du build sur n'importe quel environnement Linux ou Windows standard.
