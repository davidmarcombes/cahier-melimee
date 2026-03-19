---
marp: true
theme: marp_melimee
paginate: true
html: true 

---

# Le Cahier de Mélimée

### **Choix Techniques : La frugalité au service de la pédagogie**

<center><br>

![width:180px](../src/assets/images/logo.png)

</center>

> Réfléchir avant de coder, pour ne pas avoir à maintenir.

---

# 1. 11ty : Le Statique Souverain ⚡

### **Pourquoi Eleventy ?**

- **Zéro JS côté serveur** : Tout est pré-généré à la compilation.
- **Vitesse brute** : Pas de base de données à interroger à chaque clic.
- **Sécurité maximale** : Ce qui n'existe pas ne peut pas être piraté.
- **Maintenance nulle** : Pas de vulnérabilités PHP/Node en production.

> Un site statique qui se comporte comme une application dynamique.

---

# 2. Alpine.js : L'Interactivité Légère 🧩

### **La réactivité sans le poids**

- **Pas de framework lourd** : Pas de bundles React/Vue de 200 Ko.
- **Logique encapsulée** : Les comportements sont directement dans le HTML.
- **Empreinte minimale** : ~15 Ko (CDN) pour gérer toute la validation.
- **Transition fluide** : Idéal pour transformer un document en studio de calcul.

---

# 3. PocketBase : L'Identité Anonyme 🔐

### **Le backend qui s'oublie**

- **Go Power** : Un seul binaire ultra-rapide et économe.
- **Privacy by Design** : Pas d'emails, pas de mots de passe oubliés.
- **Identités générées** : "Loup Agile", "Hibou Sage"... des pseudos ludiques.
- **Sync invisible** : Sauvegarde de la progression sans interrompre l'élève.

---

# 4. Unified Player : Un Moteur Unique 🧠

### **Une architecture pour 300+ séries**

- **3 moteurs Alpine** : `seriesPlayer` (exercices), `defiPlayer` (défis chronométrés), player applicatif.
- **Modularité** : 25+ types (QCM, Relier, Pyramides, Glisser-déposer) via inclusions conditionnelles.
- **Scalabilité** : Ajouter un exercice, c'est juste du Markdown. Pas de code à écrire.

> **Le 1000/10/3** : 1000s de fichiers MD, 10s de layouts, 3 moteurs Alpine.

---

# 5. Les Défis : La Vitesse (Fluency) ⏱️

### **L'entraînement aux réflexes**

- **Mode Timed** : Une interface dédiée au calcul mental rapide.
- **Feedback instantané** : Flash de validation en 120ms.
- **Statistiques réelles** : Calcul de la cadence (réponses/min) en fin de session.
- **Countdown visuel** : Barre de progression dynamique (Vert → Orange → Rouge).

---

# 6. Budgets de Performance : La Règle du 18 KB 🏃‍♂️

### **L'accessibilité par la légèreté**

- **Target 18 KB** : Cible maximale pour le HTML d'une page d'exercice.
- **CSS < 30 KB** : Bundle Tailwind minifié et expurgé.
- **Inclusion intelligente** : On ne charge `svg.js` ou `KaTeX` que si nécessaire.
- **Compression Brotli** : Script `compress.js` pour gagner jusqu'à 90% (Quality 11).

---

# 7. SVG Gen : Le Dessin Mathématique 🎨

### **Pourquoi générer les figures en JS ?**

- **Poids plume** : Texte brut au lieu de PNG lourds.
- **Netteté infinie** : Rendu parfait sur tous les écrans (Retina, 4K).
- **Thémable** : Les couleurs changent via variables CSS selon le mode sombre.
- **Paramétrable** : Fractions, horloges et réglettes générées chirurgicalement.

---

# 8. Design Tokens : Source Unique 💎

### **`design-tokens.json` pilotent tout**

- **Couleurs & Typo** : Définies une seule fois, injectées partout.
- **Dual Mode** : Cahier (clair) vs Étang (sombre) via variables CSS courtes.
- **Génération atomique** : Tailwind est configuré à partir des tokens.
- **Cohérence** : Les SVGs, le CSS et le JS partagent les mêmes codes couleurs.

---

# 9. Validation par LLM (Ollama) 🤖

### **L'IA locale comme correcteur de QA**

- **Ollama + Qwen2.5** : Une IA locale qui "résout" les exercices pour détecter les fautes.
- **Cache par modèle** : Colonne par modèle (`qwen2.5:7b`, `phi4:14b`…) — chaque fichier validé une seule fois par hash.
- **Override manuel** : Colonne `manual=ok` pour confirmer définitivement un exercice correct.
- **Souverain** : Zéro donnée envoyée dans le cloud — rapport d'erreurs en `.scratch/`.

---

# 10. Audit Pédagogique (Vergnaud) 📊

### **Garder la main sur la progression**

- **Classification de Vergnaud** : Suivi des classes de problèmes mathématiques.
- **`reports/exercises-report.csv`** : Carte complète du projet générée à chaque build.
- **Analyse des lacunes** : Détection automatique des niveaux ou thèmes sous-représentés.
- **Stats SVG** : Monitoring de l'usage des composants graphiques.

---

# 11. Pipeline de Qualité : Le Rigorisme 🛠️

### **Build en 6 étapes forcées**

1. **Tests unitaires** (Vitest) sur les générateurs de nombres.
2. **Validation YAML** : Schémas stricts pour chaque type d'exercice.
3. **Design Tokens** : Injection des variables CSS et config Tailwind.
4. **Eleventy Build** : Génération des pages et minification HTML.
5. **Tailwind Build** : CSS atomique compressé.
6. **HTML Validate** : `html-validate` pour la structure DOM (WCAG).

---

# 12. Un Projet Français et Souverain 🇫🇷

### **Liberté, Égalité, Frugalité**

- **Hébergement en France**.
- **Zéro dépendance GAFAM** : Pas de Google Fonts, pas de trackers, pas d'IA externe.
- **Licence EUPL v1.2** : Le copyleft européen pour protéger le commun numérique.
- **PWA Ready** : Téléchargement complet pour usage sans connexion internet.

---

# <img src="../src/assets/images/salto_none.gif" alt="logo" style="vertical-align:bottom;" width="75px"> Rejoignez l'expédition !

### **On cherche des mains et des neurones**

**→ GitHub :** [davidmarcombes/cahier-melimee](https://github.com/davidmarcombes/cahier-melimee)

**→ Demo :** [Alpha Version](https://www.marcombes.fr/melimee/fr/index.html)

**→ Plus qu'un site :** Un outil de justice sociale par le code.

> **Salto vous attend pour la prochaine étape !**
