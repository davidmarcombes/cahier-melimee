---
type: guided-problem
title: "Le bus (A4.2)"
story: "Au **1er arrêt**, le bus **perd 5 passagers**. Au **2ème arrêt**, il en **gagne 8**. Quelle est l'**évolution totale** du nombre de passagers ?"
steps:
  - kind: keywords
    tokens: ["perd", "gagne", "évolution totale"]
    hint: "Ces mots décrivent deux changements successifs. L'évolution totale est le résultat combiné."
  - kind: numbers
    tokens: ["5", "8"]
  - kind: question-type
    choices: ["Il y a plus de passagers qu'au départ", "Il y a moins de passagers qu'au départ"]
    answers: ["il y a plus de passagers qu'au départ"]
    hint: "8 gagnés − 5 perdus = +3 : le bus a plus de passagers."
  - kind: operation
    answers: ["−"]
    choices: ["+", "−"]
    hint: "Je calcule la différence entre les passagers gagnés et perdus."
  - kind: calculate
    answer: "3"
    unit: "passagers de plus"
---
