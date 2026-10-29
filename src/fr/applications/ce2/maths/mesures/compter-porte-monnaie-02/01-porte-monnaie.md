---
type: multi-question
title: "Calcule le contenu du porte-monnaie"
generator: porteMonnaie
repeat: 8
params:
  notes: [500, 1000, 2000, 5000]
  maxNotes: 2
  cents: [1, 2, 5, 10, 20, 50]
  minCents: 3
  maxCents: 6
  carryRate: 0.7
---

Compte d'abord les **euros**, puis les **centimes**. Si les centimes font 100 ou plus, ils font un euro de plus.

> 1 € = 100 centimes
