---
type: guided-problem
title: "Les bibliothèques"
story: "La bibliothèque de la ville contient **2 480 livres**, soit **760 de plus** que celle de l'école. Combien de **livres** contient celle de l'école ?"
steps:
  - kind: keywords
    tokens: ["de plus", "livres"]
    hint: "« de plus » dit que la bibliothèque de la ville est la plus grande. « Livres » indique ce qu'on cherche."
  - kind: numbers
    tokens: ["2 480", "760"]
  - kind: question-type
    choices: ["La bibliothèque de l'école est plus petite que celle de la ville", "La bibliothèque de l'école est plus grande que celle de la ville"]
    answers: ["la bibliothèque de l'école est plus petite que celle de la ville"]
    hint: "La ville a 760 livres de PLUS → celle de l'école est plus petite."
  - kind: operation
    answers: ["−"]
    choices: ["+", "−"]
    hint: "L'école a moins de livres → j'enlève l'écart."
  - kind: calculate
    answer: "1720"
    unit: "livres"
---
