---
type: guided-problem
title: "L'entraînement de natation"
story: "Yara a nagé **350 mètres** ce matin. Son entraîneur lui demande de nager **3 fois plus** de distance cet après-midi. Quelle **distance** doit-elle nager cet après-midi ?"
steps:
  - kind: keywords
    tokens: ["fois plus", "distance"]
    hint: "« fois plus » annonce une multiplication. « Distance » correspond à la longueur à calculer."
  - kind: numbers
    tokens: ["350", "3"]
  - kind: question-type
    choices: ["La distance de l'après-midi est plus grande", "La distance de l'après-midi est plus petite"]
    answers: ["la distance de l'après-midi est plus grande"]
    hint: "Elle nage 3 fois PLUS → la distance augmente."
  - kind: operation
    answers: ["×"]
    choices: ["+", "−", "×", "÷"]
    hint: "Pour calculer une valeur 3 fois plus grande, on multiplie par 3."
  - kind: calculate
    answer: "1050"
    unit: "m"
---
