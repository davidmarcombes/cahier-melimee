---
type: number-check
title: "Trouve le nombre de départ."
generator: multDivTrou
repeat: 8
params:
  powers: [10, 100, 1000, 10000]
  minDec: 1
  maxDec: 3
  wholeMin: 0
  wholeMax: 99
  variants: [mult_input]
---

Multiplier par 10, 100 ou 1 000 : chaque chiffre avance de 1, 2 ou 3 rangs vers la gauche. Pour retrouver le nombre de départ, on fait le chemin inverse.
