---
type: guided-problem
title: "La randonnée"
story: "Samedi, Yanis a marché **14,5 km**, soit **3,5 km de moins** que dimanche. Quelle **distance** a-t-il parcourue dimanche ?"
steps:
  - kind: keywords
    tokens: ["de moins", "distance"]
    hint: "« de moins » dit que samedi est la plus courte marche. « Distance » indique ce qu'on cherche."
  - kind: numbers
    tokens: ["14,5", "3,5"]
  - kind: question-type
    choices: ["Dimanche, il a marché plus que samedi", "Dimanche, il a marché moins que samedi"]
    answers: ["dimanche, il a marché plus que samedi"]
    hint: "Samedi, il a marché 3,5 km de MOINS → dimanche, il a marché plus."
  - kind: operation
    answers: ["+"]
    choices: ["+", "−"]
    hint: "Dimanche est la plus longue marche → j'ajoute l'écart."
  - kind: calculate
    answer: "18"
    unit: "km"
---
