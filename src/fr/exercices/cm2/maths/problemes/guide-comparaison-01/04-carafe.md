---
type: guided-problem
title: "Carafe et bouteille"
story: "Une carafe contient **1,25 L** d'eau, soit **0,75 L de moins** qu'une bouteille. Quelle est la **contenance** de la bouteille ?"
steps:
  - kind: keywords
    tokens: ["de moins", "contenance"]
    hint: "« de moins » dit que la carafe contient le moins d'eau. « Contenance » indique ce qu'on cherche."
  - kind: numbers
    tokens: ["1,25", "0,75"]
  - kind: question-type
    choices: ["La bouteille contient plus que la carafe", "La bouteille contient moins que la carafe"]
    answers: ["la bouteille contient plus que la carafe"]
    hint: "La carafe contient 0,75 L de MOINS → la bouteille contient plus."
  - kind: operation
    answers: ["+"]
    choices: ["+", "−"]
    hint: "La bouteille contient plus → j'ajoute l'écart."
  - kind: calculate
    answer: "2"
    unit: "L"
---
