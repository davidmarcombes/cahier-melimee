# Classification System (Skills-based - Granular)

This document defines the skill classification codes for exercises that are **NOT** word problems (which use Vergnaud classes). This applies to all exercises, applications, and timed challenges (defis).

## 1. Skill Classes (`class`)

For non-problem exercises, we use `class:` with a granular code from this table.

| Code | Group | Skill Description | Examples |
|------|-------|-------------------|----------|
| **S1.1.1** | **Faits & Automatismes** | Récupération directe en mémoire. | Tables d'addition, multiplication. |
| **S1.1.2** | **Faits & Automatismes** | Compléments, doubles, moitiés simples | Compléments à 10/100, doubles de 1-20. |
| **S1.1.3** | **Calcul mental stratégique** | Stratégies de calcul réfléchi (astuces). | Passer par 10, décomposer le 2e terme. |
| **S1.2.1** | **Procédures (Posé)** | Application d'un algorithme standard. | Addition/Soustraction posée en colonnes. |
| **S1.2.2** | **Procédures (Flux)** | Suites d'opérations en chaîne. | Calcul-en-chaîne, pyramides complexes. |
| **S2.1.1** | **Dénombrement** | Dénombrer des collections d'objets. | Compter des points, des jetons, des fruits. |
| **S2.1.2** | **Valeur de position** | Comprendre le système décimal (U, D, C). | Base-10, boulier, abaque. |
| **S2.1.3** | **Fractions / Décimaux** | Comprendre les parts et le partage. | Fractions sur cercle/rectangle, dixièmes. |
| **S2.1.4** | **Codage / Décodage** | Traduire lettre -> chiffre ou inversement. | Écriture des nombres en lettres. |
| **S2.2.1** | **Structure additive** | Relation entre (+) et (-) sur un groupe. | Familles de faits (+/-), pyramides à trous. |
| **S2.2.2** | **Structure multiplicative** | Relation entre (x) et (/) sur un groupe. | Familles de faits (x/:), inverse-problem. |
| **S3.1.1** | **Comparaison** | Utilisation des signes. | Signes <, >, = entre deux nombres/calculs. |
| **S3.1.2** | **Rangement / Encadre.** | Ordonner ou situer entre deux bornes. | Ranger par ordre croissant, encadrer au millier. |
| **S3.1.3** | **Droite numérique** | Position relative sur une droite. | Placer ou lire un curseur sur la droite, bande numérique (GS). |
| **S3.1.4** | **Comparer des grandeurs** | Comparer ou ranger sans mesurer. | Plus long / plus court, plus lourd, ranger trois objets. |
| **S3.2.1** | **Suites & Patterns** | Identifier une règle de progression. | Suites numériques, motifs logiques. |
| **S3.2.2** | **Logique déductive** | Utiliser des indices pour déduire. | Grilles de logique, élimination. |
| **S3.2.3** | **Vérification / Vérité** | Évaluer la vérité d'énoncés. | Vrai/Faux, Always/Sometimes/Never. |
| **S3.2.4** | **Tri / Catégorisation** | Classer des objets selon un critère. | Trier par couleur, par taille (GS). |
| **S3.2.5** | **Choix de l'opération** | Reconnaître la structure d'un énoncé. | Quelle opération pour ce problème ? (+, −, ×, ÷) |
| **S4.1.1** | **Conversions d'unités** | Passer d'une unité à l'autre, comparer des mesures. | km/m/cm/mm, kg/g, L/cL, tableaux de conversion. |
| **S4.1.2** | **Monnaie** | Compter, composer, rendre la monnaie. | Pièces et billets, euros/centimes. |
| **S4.2.1** | **Périmètre** | Calculer le tour d'une figure. | Polygones, figures composées, quadrillage. |
| **S4.2.2** | **Aire** | Mesurer ou calculer une surface. | Compter les carreaux, rectangle, unités d'aire. |
| **I1.1.1** | **Instruments (Temps)** | Lire un affichage temporel. | Horloges à aiguilles ou digitales, calendriers. |
| **I1.1.2** | **Instruments (Mesures)** | Lire une graduation physique. | Règles, thermomètres, balances. |
| **I1.2.1** | **Manipulation Instr.** | Utilisation active de l'instrument. | Placer les aiguilles, tracer un segment. |
| **D1.1.1** | **Lecture de données** | Extraire l'info d'un support visuel. | Lire un tableau, un graphique, un plan. |
| **D1.1.2** | **Saisie de données** | Organiser l'info dans un support. | Compléter un tableau, construire un graphique. |
| **G1.1.1** | **Figures planes** | Reconnaître et nommer des figures. | Carré, triangle, cercle, figures tournées, trier par forme. |
| **G1.1.2** | **Propriétés géométriques** | Angles, côtés, droites. | Angle droit, comparer des angles, parallèles et perpendiculaires. |
| **G1.1.3** | **Solides** | Reconnaître et décrire des solides. | Cube, pavé, pyramide, faces / arêtes / sommets. |
| **G1.2.1** | **Repérage / Déplacement** | Se repérer et coder un déplacement. | Coordonnées sur quadrillage, programmer un robot. |
| **G1.2.2** | **Symétrie axiale** | Axes et figures symétriques. | Trouver l'axe, compléter ou construire le symétrique. |

Every series (`index.yaml`) needs a `class:` from this table or from `docs/maths_classification_vergnaud.md`;
`npm run validate:exercises` refuses one without. A problem series that mixes the sub-classes of one
Vergnaud group (guided problems, bar models, proportionality tables) takes the group code: `A1`–`A4`, `M1`–`M3`.
To add a code: a row here (or in the Vergnaud doc), then append it at the END of `CSV_CLASSES` in both
`.eleventy.js` and `src/assets/js/app.js` (the dashboard and the exercise list read it by index).

## Usage in Front-Matter

```yaml
---
type: "clock"
class: "I1.1.1"        # Instrument: Reading the clock
title: "Quelle heure est-il ?"
---
```
