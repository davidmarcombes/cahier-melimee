---
type: guided-problem
title: "L'heure de départ"
story: "Le cours se termine à **11 h 45**. Il a duré **1 heure 15 minutes**. À quelle heure a-t-il **commencé** ?"
steps:
  - kind: keywords
    tokens: ["terminé", "commencé", "duré"]
    hint: "On soustrait la durée de l'heure de fin pour trouver l'heure de début."
  - kind: numbers
    tokens: ["11 h 45", "1 h 15"]
  - kind: convert
    question: "45 min − 15 min = ___ min"
    answer: "30"
    hint: "45 − 15 = 30 minutes"
  - kind: operation
    answers: ["−"]
    choices: ["+", "−"]
    hint: "Je recule dans le temps : je soustrais la durée."
  - kind: calculate
    answer: "10 h 30"
    unit: ""
---
