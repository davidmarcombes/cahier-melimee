---
type: guided-problem
title: "Le chiffre d'affaires (A3.3)"
story: "En mars, le chiffre d'affaires est de **63 200 €**, soit **14 450 € de plus** qu'en janvier. Quel était le chiffre d'affaires de **janvier** ?"
steps:
  - kind: keywords
    tokens: ["de plus", "janvier"]
    hint: "« De plus » dit que mars est plus grand. On cherche le montant de janvier."
  - kind: numbers
    tokens: ["63 200", "14 450"]
  - kind: question-type
    choices: ["Janvier est plus grand que mars", "Janvier est plus petit que mars"]
    answers: ["janvier est plus petit que mars"]
    hint: "Mars a 14 450 de PLUS → janvier est plus petit."
  - kind: operation
    answers: ["−"]
    choices: ["+", "−"]
    hint: "Pour retrouver janvier, j'enlève l'écart à mars."
  - kind: calculate
    answer: "48750"
    unit: "€"
---
