---
type: guided-problem
title: "La température (A4.3)"
story: "Le matin, la température **monte de 4 °C**. Le bilan de la journée est **+1 °C**. De combien la température a-t-elle **varié l'après-midi** ?"
steps:
  - kind: keywords
    tokens: ["monte", "bilan", "varié l'après-midi"]
    hint: "Le bilan est le résultat de deux variations. Je cherche la seconde variation."
  - kind: numbers
    tokens: ["4", "1"]
  - kind: question-type
    choices: ["La température a monté l'après-midi", "La température a baissé l'après-midi"]
    answers: ["la température a baissé l'après-midi"]
    hint: "Bilan +1, mais le matin +4. Il a donc fallu que ça baisse l'après-midi."
  - kind: operation
    answers: ["−"]
    choices: ["+", "−"]
    hint: "Variation matin − bilan total = variation après-midi."
  - kind: calculate
    answer: "3"
    unit: "°C de moins"
---
