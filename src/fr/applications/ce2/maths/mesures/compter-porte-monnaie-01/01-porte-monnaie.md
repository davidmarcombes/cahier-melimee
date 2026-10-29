---
type: multi-question
title: "Calcule le contenu du porte-monnaie"
generator: porteMonnaie
repeat: 8
params:
  notes: [500, 1000, 2000]
  maxNotes: 2
  cents: [5, 10, 20, 50]
  maxCents: 4
  carryRate: 0.35
---

Compte d'abord les **euros**, puis les **centimes**. Si les centimes font 100 ou plus, ils font un euro de plus.

> 1 € = 100 centimes
