---
type: guided-problem
title: "Le trajet en voiture"
story: "Un trajet dure **1 heure 30 minutes**. On en a déjà fait **45 minutes**. Combien de temps reste-t-il ?"
steps:
  - kind: keywords
    tokens: ["dure", "reste"]
  - kind: numbers
    tokens: ["1 heure 30 minutes", "45 minutes"]
  - kind: convert
    question: "1 heure 30 minutes = ___ minutes"
    answer: "90"
    hint: "1 heure = 60 minutes"
  - kind: operation
    answer: "−"
    choices: ["+", "−"]
  - kind: calculate
    answer: "45"
    unit: "minutes"
---
