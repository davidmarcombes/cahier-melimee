---
type: guided-problem
title: "La fin du film"
story: "Un film commence à **20 h 15** et dure **1 heure 40 minutes**. À quelle heure se termine-t-il ?"
steps:
  - kind: keywords
    tokens: ["commence", "dure", "termine"]
    hint: "On ajoute la durée à l'heure de début pour trouver l'heure de fin."
  - kind: numbers
    tokens: ["20 h 15", "1 h 40"]
  - kind: convert
    question: "15 min + 40 min = ___ min"
    answer: "55"
    hint: "15 + 40 = 55 minutes (on reste sous 60, pas besoin de convertir)"
  - kind: calculate
    answer: "21 h 55"
    unit: ""
---
