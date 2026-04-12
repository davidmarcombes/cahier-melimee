---
type: guided-problem
title: "Les sacs de billes (M1.3 — groupement)"
story: "J'ai **20 billes**. Je les mets dans des **sacs de 5**. Combien de **sacs** puis-je faire ?"
steps:
  - kind: keywords
    tokens: ["sacs de 5"]
    hint: "On cherche combien de groupes de 5 on peut former."
  - kind: numbers
    tokens: ["20", "5"]
  - kind: question-type
    choices: ["Je cherche combien dans chaque groupe", "Je cherche combien de groupes"]
    answers: ["je cherche combien de groupes"]
    hint: "Je connais la taille du groupe (5), je cherche le nombre de groupes."
  - kind: operation
    answers: ["÷"]
    choices: ["×", "÷"]
    hint: "Pour trouver le nombre de groupes, je divise le total par la taille du groupe."
  - kind: calculate
    answer: "4"
    unit: "sacs"
---
