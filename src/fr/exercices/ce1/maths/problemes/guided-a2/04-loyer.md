---
type: guided-problem
title: "Le loyer (A2.4)"
story: "Après une **hausse de 50 €**, le loyer est maintenant de **800 €**. Quel était le loyer **avant** la hausse ?"
steps:
  - kind: keywords
    tokens: ["avant", "hausse"]
    hint: "Ces mots indiquent qu'on cherche la valeur de départ, avant le changement."
  - kind: numbers
    tokens: ["50", "800"]
  - kind: question-type
    choices: ["Le loyer a augmenté", "Le loyer a diminué"]
    answers: ["le loyer a augmenté"]
    hint: "Une hausse, c'est une augmentation."
  - kind: operation
    answers: ["−"]
    choices: ["+", "−"]
    hint: "Pour retrouver le loyer de départ, j'enlève la hausse."
  - kind: calculate
    answer: "750"
    unit: "€"
---
