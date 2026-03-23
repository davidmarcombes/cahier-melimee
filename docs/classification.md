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
| **S3.1.3** | **Droite numérique** | Position relative sur une droite. | Placer ou lire un curseur sur la droite. |
| **S3.2.1** | **Suites & Patterns** | Identifier une règle de progression. | Suites numériques, motifs logiques. |
| **S3.2.2** | **Logique déductive** | Utiliser des indices pour déduire. | Grilles de logique, élimination. |
| **S3.2.3** | **Vérification / Vérité** | Évaluer la vérité d'énoncés. | Vrai/Faux, Always/Sometimes/Never. |
| **I1.1.1** | **Instruments (Temps)** | Lire un affichage temporel. | Horloges à aiguilles ou digitales, calendriers. |
| **I1.1.2** | **Instruments (Mesures)** | Lire une graduation physique. | Règles, thermomètres, balances. |
| **I1.2.1** | **Manipulation Instr.** | Utilisation active de l'instrument. | Placer les aiguilles, tracer un segment. |
| **D1.1.1** | **Lecture de données** | Extraire l'info d'un support visuel. | Lire un tableau, un graphique, un plan. |
| **D1.1.2** | **Saisie de données** | Organiser l'info dans un support. | Compléter un tableau, construire un graphique. |

## Usage in Front-Matter

```yaml
---
type: "clock"
class: "I1.1.1"        # Instrument: Reading the clock
title: "Quelle heure est-il ?"
---
```
