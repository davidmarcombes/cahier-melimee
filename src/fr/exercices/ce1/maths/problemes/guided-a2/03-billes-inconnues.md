---
type: guided-problem
title: "Ce qui s'est passé (A2.3)"
story: "J'avais **12 billes**. Maintenant j'en ai **15**. Que s'est-il passé ? Combien de billes ai-je **gagnées** ?"
steps:
  - kind: keywords
    tokens: ["gagnées"]
    hint: "Ce mot indique un changement positif — le nombre a augmenté."
  - kind: numbers
    tokens: ["12", "15"]
  - kind: question-type
    choices: ["J'ai gagné des billes", "J'ai perdu des billes"]
    answers: ["j'ai gagné des billes"]
    hint: "Le nombre de billes a augmenté de 12 à 15."
  - kind: operation
    answers: ["−"]
    choices: ["+", "−"]
    hint: "Pour trouver combien j'ai gagné, je calcule la différence."
  - kind: calculate
    answer: "3"
    unit: "billes"
---
