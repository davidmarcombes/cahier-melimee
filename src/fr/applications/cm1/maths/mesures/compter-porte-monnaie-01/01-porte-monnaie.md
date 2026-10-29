---
type: multi-question
title: "Calcule le contenu du porte-monnaie"
generator: porteMonnaie
repeat: 8
params:
  notes: [500, 1000, 2000, 5000]
  minNotes: 2
  maxNotes: 3
  maxEuroCoins: 3
  cents: [1, 2, 5, 10, 20, 50]
  minCents: 4
  maxCents: 6
  carryRate: 0.8
---

Compte d'abord les **euros**, puis les **centimes**. Si les centimes font 100 ou plus, ils font un euro de plus.

> 1 € = 100 centimes
