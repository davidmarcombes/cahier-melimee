---
type: guided-problem
title: "Les billes de Léa (A3.3)"
story: "Luc a **10 billes**. Il en a **3 de plus** que Léa. Combien Léa a-t-elle de billes ?"
steps:
  - kind: keywords
    tokens: ["de plus"]
    hint: "Attention : c'est Luc qui a plus de billes. On cherche Léa, qui en a moins."
  - kind: numbers
    tokens: ["10", "3"]
  - kind: question-type
    choices: ["Léa a plus de billes que Luc", "Léa a moins de billes que Luc"]
    answers: ["léa a moins de billes que luc"]
    hint: "Si Luc a 3 de PLUS que Léa, alors Léa a 3 de MOINS que Luc."
  - kind: operation
    answers: ["−"]
    choices: ["+", "−"]
    hint: "Luc a plus de billes, donc je soustrais pour trouver Léa."
  - kind: calculate
    answer: "7"
    unit: "billes"
---
