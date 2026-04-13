---
type: guided-problem
title: "Le lavage (M2.3)"
story: "Un **plein d'essence** coûte **80 €**. C'est **4 fois** le prix d'un **lavage**. Quel est le prix du lavage ?"
steps:
  - kind: keywords
    tokens: ["4 fois", "lavage"]
    hint: "« 4 fois le prix du lavage » — le plein vaut 4 fois autant que le lavage."
  - kind: numbers
    tokens: ["80", "4"]
  - kind: question-type
    choices: ["Le lavage est plus cher que le plein", "Le lavage est moins cher que le plein"]
    answers: ["le lavage est moins cher que le plein"]
    hint: "Le plein coûte 4 fois plus → le lavage est la petite valeur."
  - kind: operation
    answers: ["÷"]
    choices: ["×", "÷"]
    hint: "Le plein = 4 × lavage → lavage = plein ÷ 4."
  - kind: calculate
    answer: "20"
    unit: "€"
---
