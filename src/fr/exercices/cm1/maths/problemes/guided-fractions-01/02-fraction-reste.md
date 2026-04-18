---
type: guided-problem
title: "La bouteille d'eau (Frac. 2)"
story: "Léa a bu **3/8** d'une bouteille d'eau. Quelle fraction de la bouteille **reste-t-il** ?"
steps:
  - kind: keywords
    tokens: ["bu", "reste-t-il"]
    hint: "La bouteille entière vaut 8/8. On enlève la partie consommée pour trouver ce qui reste."
  - kind: numbers
    tokens: ["3", "8"]
  - kind: convert
    question: "La bouteille entière = ___/8"
    answer: "8"
    hint: "Un entier = 8/8 (le numérateur et le dénominateur sont égaux)"
  - kind: operation
    answers: ["−"]
    choices: ["+", "−"]
    hint: "Je soustrais la fraction consommée de l'entier (8/8 − 3/8)."
  - kind: calculate
    answer: "5/8"
    unit: "de la bouteille"
---
