---
type: guided-problem
title: "La dépense au magasin"
story: "Enzo achète un casque audio à **28 €**. Sa sœur achète une tablette qui coûte **6 fois plus** cher. Quel est le **prix** de la tablette ?"
steps:
  - kind: keywords
    tokens: ["fois plus", "prix"]
    hint: "« fois plus » indique que le prix est multiplié. « Prix » désigne la somme finale."
  - kind: numbers
    tokens: ["28", "6"]
  - kind: question-type
    choices: ["La tablette coûte plus cher que le casque", "La tablette coûte moins cher que le casque"]
    answers: ["la tablette coûte plus cher que le casque"]
    hint: "La tablette coûte 6 fois PLUS → son prix est plus élevé."
  - kind: operation
    answers: ["×"]
    choices: ["+", "−", "×", "÷"]
    hint: "On cherche un montant 6 fois plus élevé, on fait donc une multiplication par 6."
  - kind: calculate
    answer: "168"
    unit: "€"
---
