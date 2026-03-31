---
type: number-check
title: "Compléments à 100"
templateEngineOverride: md
repeat: 5
vars:
  - name: a
    formula: "rand(1, 19) * 5"
answer: "{{ 100 - a }}"
operation: "{{ a }} + ? = 100"
---

Trouve le nombre manquant pour faire **100**.

[[ a ]] + ... = 100
