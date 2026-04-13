---
type: guided-problem
title: "Les deux salles (A3.3)"
story: "La salle A accueille **312 personnes**, soit **48 de plus** que la salle B. Quelle est la **capacité** de la salle B ?"
steps:
  - kind: keywords
    tokens: ["de plus", "capacité"]
    hint: "« de plus » dit qui est la plus grande. « Capacité » indique ce qu'on cherche."
  - kind: numbers
    tokens: ["312", "48"]
  - kind: question-type
    choices: ["La salle B est plus grande que A", "La salle B est plus petite que A"]
    answers: ["la salle b est plus petite que a"]
    hint: "C'est A qui a 48 de PLUS → la salle B est plus petite."
  - kind: operation
    answers: ["−"]
    choices: ["+", "−"]
    hint: "A est plus grande → pour trouver B, j'enlève l'écart."
  - kind: calculate
    answer: "264"
    unit: "places"
---
