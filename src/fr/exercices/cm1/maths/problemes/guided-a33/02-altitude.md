---
type: guided-problem
title: "Les deux cols (A3.3)"
story: "Le col A est à **1 870 m**. Il est **215 m plus haut** que le col B. À quelle **altitude** est le col B ?"
steps:
  - kind: keywords
    tokens: ["plus haut", "altitude"]
    hint: "« Plus haut » indique lequel est au-dessus. On cherche l'altitude du col B."
  - kind: numbers
    tokens: ["1 870", "215"]
  - kind: question-type
    choices: ["Le col B est plus haut que A", "Le col B est moins haut que A"]
    answers: ["le col b est moins haut que a"]
    hint: "C'est A qui est 215 m PLUS HAUT → B est en dessous."
  - kind: operation
    answers: ["−"]
    choices: ["+", "−"]
    hint: "A est plus haut → pour trouver B, je soustrais l'écart."
  - kind: calculate
    answer: "1655"
    unit: "m"
---
