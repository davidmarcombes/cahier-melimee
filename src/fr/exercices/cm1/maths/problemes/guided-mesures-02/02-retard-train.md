---
type: guided-problem
title: "Le train en retard"
story: "Le train devait arriver à **14 h 20**. Il a **35 minutes** de retard. À quelle heure arrive-t-il vraiment ?"
steps:
  - kind: keywords
    tokens: ["retard", "arriver"]
    hint: "Un retard s'ajoute à l'heure prévue."
  - kind: numbers
    tokens: ["14 h 20", "35 minutes"]
  - kind: convert
    question: "20 min + 35 min = ___ min"
    answer: "55"
    hint: "20 + 35 = 55 minutes (on reste sous 60 min)"
  - kind: calculate
    answer: "14 h 55"
    unit: ""
---
