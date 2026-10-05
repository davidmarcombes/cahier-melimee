---
type: guided-problem
title: "Le vélo d'Inès"
story: "Le vélo de Nolan coûte **240 €**, soit **65 € de moins** que celui d'Inès. Quel est le **prix** du vélo d'Inès ?"
steps:
  - kind: keywords
    tokens: ["de moins", "prix"]
    hint: "« de moins » dit qui a le vélo le moins cher. « Prix » indique ce qu'on cherche."
  - kind: numbers
    tokens: ["240", "65"]
  - kind: question-type
    choices: ["Le vélo cherché coûte plus de 240 €", "Le vélo cherché coûte moins de 240 €"]
    answers: ["le vélo cherché coûte plus de 240 €"]
    hint: "Nolan paie 65 € de MOINS → le vélo d'Inès est plus cher."
  - kind: operation
    answers: ["+"]
    choices: ["+", "−"]
    hint: "Le vélo d'Inès est plus cher → pour le trouver, j'ajoute l'écart."
  - kind: calculate
    answer: "305"
    unit: "€"
---
