---
type: guided-problem
title: "Bilan de la journée (A4.1)"
story: "Ce matin, j'ai **perdu 15 €**. Cet après-midi, j'ai **gagné 20 €**. Quel est le **bilan** de la journée ?"
steps:
  - kind: keywords
    tokens: ["perdu", "gagné", "bilan"]
    hint: "Ces mots décrivent deux événements successifs. Le bilan est le résultat final."
  - kind: numbers
    tokens: ["15", "20"]
  - kind: question-type
    choices: ["J'ai gagné de l'argent au total", "J'ai perdu de l'argent au total"]
    answers: ["j'ai gagné de l'argent au total"]
    hint: "20 € gagnés − 15 € perdus : le bilan est positif."
  - kind: operation
    answers: ["−"]
    choices: ["+", "−"]
    hint: "Je calcule la différence entre ce que j'ai gagné et ce que j'ai perdu."
  - kind: calculate
    answer: "5"
    unit: "€"
---
