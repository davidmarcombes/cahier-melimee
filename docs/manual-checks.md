# Manual checks — September 2026 session

Start the dev server with `npm start`, then open the links. `#n` jumps to exercise n. On the priority 1, 3 and 4 series, the **« ✓ Valider la série »** button (dev mode) removes them from the reminder at the end of `npm run check`.

## Priority 1 — Bugs fixed (they were broken in production)

Check that the correct answer is accepted **and** that a wrong answer is refused.

- [ ] [f06ea123 #1](http://localhost:8080/fr/exercices/f06ea123/#1): Market, carrots + tomatoes = **4,50** (was 4)
- [ ] [f06ea123 #4](http://localhost:8080/fr/exercices/f06ea123/#4): Temperatures, difference **Monday–Thursday** = 6 (the question changed)
- [ ] [f06ea123 #5](http://localhost:8080/fr/exercices/f06ea123/#5): Bike, longest − shortest = **11** (was 7)
- [ ] [a46fcf69 #5](http://localhost:8080/fr/exercices/a46fcf69/#5): Estimate 9,2 − 3,6 → **5** (rounding the terms), new wording
- [ ] [f2b129c7](http://localhost:8080/fr/exercices/f2b129c7/): CM2 comparing expressions with decimals, #1 to #4 had wrong answers
- [ ] [e582773e #1](http://localhost:8080/fr/exercices/e582773e/#1): « 1 000 − 1 » vs …, was impossible to answer
- [ ] [b11a2193 #2](http://localhost:8080/fr/exercices/b11a2193/#2): CE2 pyramid, the given cell is now **24** (was 20, contradictory)
- [ ] Pyramids with hidden cells: one extra cell is now revealed, so each hidden cell follows from **one addition or subtraction**. They used to need algebra (e.g. `2 160 + 3 × ? = 3 240`) or couldn't be solved at all.
  - [ ] [a21f1dae #4](http://localhost:8080/fr/exercices/a21f1dae/#4): CM2 (the one from the screenshot), 1690 revealed
  - [ ] [fee25a49 #4](http://localhost:8080/fr/exercices/fee25a49/#4): CM2 decimals, 13,85 revealed
  - [ ] [c268f457 #2](http://localhost:8080/fr/exercices/c268f457/#2): CM1, 99 revealed
  - [ ] [ba49b2ae #3](http://localhost:8080/fr/exercices/ba49b2ae/#3): CM1, 645 revealed
  - [ ] [b6da0e79 #4](http://localhost:8080/fr/exercices/b6da0e79/#4): CM1 decimals, 15,6 revealed
  - [ ] [b11a2193 #4](http://localhost:8080/fr/exercices/b11a2193/#4): CE2, 27 revealed
  - [ ] [e036faca #5](http://localhost:8080/fr/exercices/e036faca/#5): CE1, 6 revealed
  - [ ] [e036faca #6](http://localhost:8080/fr/exercices/e036faca/#6): CE1, 4 revealed
- [ ] Column multiplications:
  - [ ] [d9746130 #1](http://localhost:8080/fr/exercices/d9746130/#1): 34 × 2 now has **2** boxes
  - [ ] [d9746130 #5](http://localhost:8080/fr/exercices/d9746130/#5): 324 × 5 now has **4** boxes
- [ ] [da73b97f](http://localhost:8080/fr/exercices/da73b97f/): CE2 logic grids, were impossible (people are now in the columns)
- [ ] [ad885698](http://localhost:8080/fr/exercices/ad885698/): Conversions, a **wrong** answer used to be accepted. Try one
- [ ] Numberlink, were impossible (puzzles are now generated):
  - [ ] [b5c3e7f2](http://localhost:8080/fr/applications/b5c3e7f2/) (4×4)
  - [ ] [d8f2a4c6](http://localhost:8080/fr/applications/d8f2a4c6/) (5×5)
- [ ] [a3e7c501](http://localhost:8080/fr/applications/a3e7c501/): Position of a digit (MCQ), the choices didn't show
- [ ] Comparing numbers, blank page:
  - [ ] [fa708ecd](http://localhost:8080/fr/applications/fa708ecd/)
  - [ ] [ed911252](http://localhost:8080/fr/applications/ed911252/)
- [ ] [b2025e33](http://localhost:8080/fr/applications/b2025e33/): **« Recommencer la série »**. Play to the end and restart: the count must stay at 10 (it used to go 58, then 370)

## Priority 2 — Display (on desktop **and** tablet)

The text must stay inside the card.

- [ ] [aaf5ce97](http://localhost:8080/fr/applications/aaf5ce97/): **Control**, a short operation must look exactly like before (large text)
- [ ] [cf457f3d](http://localhost:8080/fr/applications/cf457f3d/): « ? centaines et 8 unités », text reduced, stays inside the card
- [ ] [e1c11318](http://localhost:8080/fr/applications/e1c11318/): Rows of fruit emojis
- [ ] Areas, the shape's data moved from the operation line into the statement:
  - [ ] [ec163b25 #3](http://localhost:8080/fr/exercices/ec163b25/#3)
  - [ ] [ec163b25 #4](http://localhost:8080/fr/exercices/ec163b25/#4)
  - [ ] [f6f9d225 #2](http://localhost:8080/fr/exercices/f6f9d225/#2): CM1 area of a square
- [ ] Sentences removed from the operation line (the long dashes read like minus signs); the data is now in the statement:
  - [ ] [f5155038 #3](http://localhost:8080/fr/exercices/f5155038/#3): Change, « monnaie = ? € »
  - [ ] [cffc03e5 #2](http://localhost:8080/fr/exercices/cffc03e5/#2): Duration, « durée = ? min »
  - [ ] [f6f9d225 #3](http://localhost:8080/fr/exercices/f6f9d225/#3): CM1 area of a rectangle
  - [ ] [ec163b25 #1](http://localhost:8080/fr/exercices/ec163b25/#1): CM2 area of a rectangle
- [ ] Base-10 blocks: the diagram scales down again (a `viewBox` bug), plates on two rows above 4 hundreds, and **the title no longer gives the answer away**:
  - [ ] [cbe5b194](http://localhost:8080/fr/exercices/cbe5b194/): CE2 up to 999 (754 → 4 + 3 plates), title « Quel nombre est représenté ? »
  - [ ] [aeed3b5f](http://localhost:8080/fr/exercices/aeed3b5f/): CE2, generic title
  - [ ] [fd72d04d](http://localhost:8080/fr/exercices/fd72d04d/): CP, title « Compte les barres et les cubes »
- [ ] Matching with long labels:
  - [ ] [e1933f9e #1](http://localhost:8080/fr/exercices/e1933f9e/#1)
  - [ ] [a9a121ac #1](http://localhost:8080/fr/exercices/a9a121ac/#1)

## Priority 3 — New exercises (content and pedagogy)

- [ ] **Emoji equations**:
  - [ ] [a3f0b05b](http://localhost:8080/fr/exercices/a3f0b05b/) (hand-written)
  - [ ] [e77418e9](http://localhost:8080/fr/applications/e77418e9/)
  - [ ] [edef6836](http://localhost:8080/fr/applications/edef6836/)
  - [ ] [b294032c](http://localhost:8080/fr/applications/b294032c/)
  - [ ] [c3527948](http://localhost:8080/fr/applications/c3527948/)
- [ ] **Sequences with a check cell**:
  - [ ] [b2025e33](http://localhost:8080/fr/applications/b2025e33/)
  - [ ] [f9ed2a85](http://localhost:8080/fr/applications/f9ed2a85/)
  - [ ] [bc18c893](http://localhost:8080/fr/applications/bc18c893/)
- [ ] **Forms of a number**:
  - [ ] [af1aca94](http://localhost:8080/fr/exercices/af1aca94/)
  - [ ] [faf3eab7](http://localhost:8080/fr/exercices/faf3eab7/)
  - [ ] [ca013d8f](http://localhost:8080/fr/applications/ca013d8f/)
  - [ ] [ca2694b1](http://localhost:8080/fr/applications/ca2694b1/)
- [ ] **Operator diagrams**:
  - [ ] [a81b228a](http://localhost:8080/fr/applications/a81b228a/)
  - [ ] [befd9d18](http://localhost:8080/fr/applications/befd9d18/)
  - [ ] [fe1fb044](http://localhost:8080/fr/applications/fe1fb044/)
  - [ ] [b8ac9e59](http://localhost:8080/fr/applications/b8ac9e59/)
- [ ] **Sorting from a table**:
  - [ ] [ccd02417](http://localhost:8080/fr/exercices/ccd02417/) (hand-written)
  - [ ] [aeafbbf3](http://localhost:8080/fr/applications/aeafbbf3/)
  - [ ] [c1b8ee38](http://localhost:8080/fr/applications/c1b8ee38/)
- [ ] **× and ÷ by 10, 100, 1 000 (CM2)**:
  - [ ] [dba70bab](http://localhost:8080/fr/applications/dba70bab/)
  - [ ] [bd4c42a2](http://localhost:8080/fr/applications/bd4c42a2/)

## Priority 4 — Quick sanity check

- [ ] Sorting decimals, the type became `drag-sort`:
  - [ ] [b51629c0](http://localhost:8080/fr/applications/b51629c0/)
  - [ ] [d941e7c0](http://localhost:8080/fr/applications/d941e7c0/)
- [ ] [add0fa62](http://localhost:8080/fr/exercices/add0fa62/): Solids, « Mélimée » (the accent was missing)
