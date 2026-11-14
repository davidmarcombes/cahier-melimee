# To do (saved 2026-11-11)

Working notes to pick up after a break. Details of each type are in `agents/exercises.md` and
`docs/exercise-types-landscape.md`.

## Machine

- [ ] `npm start` / `npm run dev` crashed with ENOSPC (Linux file-watcher limit, 65 536, with ~6 200 files
      in `src/`). Raise it once, then reboot or run `sudo sysctl --system`:
      `echo fs.inotify.max_user_watches=524288 | sudo tee /etc/sysctl.d/60-inotify.conf`
- [ ] 2026-11-11 after the reboot: `npm start` runs, but the limit still reads 65 536 (`/etc/sysctl.d/60-inotify.conf`
      does not exist). Run the line above if ENOSPC comes back.

## Check by hand (new series, not yet validated)

Open `/fr/applications/<id>/`.

**Blocs cibles** (`target-blocks`, + and × only: − and ÷ dropped, the order of the two numbers can't be
shown on the board)

- [ ] CP `ef7df38f` · CE1 `f592a7ff` · CE2 `a15d740f` · CM1 `d5b2eec8` · CM2 `b4a4edce`
- [ ] On a phone: the three-block layout (CE2, CM2), and the narrow zones under the teal block's top edge.
      Tiles now slide fully into the zone their centre is in. Check that this feels right.

**Picross**

- [ ] CP `b92fdad4` · CE1 `e33c7ef4` · CE2 `ed3018e5` · CM1 `d5422c74` · CM2 `bf102355`
- [ ] Calculation clues: CE2 `ab272dbe` · CM1 `c2fa175b` · CM2 fractions `f2caf07c`
- [ ] Static exercise: `/fr/exercices/` CP `f80d5deb`

**Tangram**

- [ ] GS `b8be7273` (voice clip) · CP `adab4a23` · CE1 `bad96b35` · CE2 `d6ea8edf` · CM1 `c1deb3b0`

**Strategy games**

- [ ] CP course à 10 `e788f444` · CE1 course à 20 `fdedc2c1`
- [ ] CE2 `fb455ebf` · CM1 `dcd56305` · CM2 `cbb6bb54`

**Small additions**

- [ ] CP decompose into tens `b1715a25`
- [ ] CM2: large-number decomposition `f1e22bcf`, thousandths decomposition `a47abdc6`, hundredths ruler
      `f4b9b13d` (scrolls sideways on a phone)

**Tableau des nombres** (`hundred-board`, new 2026-11-11)

- [ ] CP `e6440271` · CE1 `da0ee004` · CE2 `a950a4b9` — clues read well? hidden-number moves (CE1, CE2) not too hard? On a phone: typing 3-digit numbers in the full-board holes (`05-trous`, CE2)

**Cubes et patrons** (new 2026-11-11)

- [ ] CE1 `f56be06a` · CE2 `e8bbba58` · CM1 `b92d253b` · CM2 `cd142b04` — do the stacks read as 3D? Is the « vue de droite » (front on the left) what pupils expect?

**Aires** (`grid-board` mode `area`, new 2026-11-11)

- [ ] CM1 `beeb83a4` · CM2 `b97ebd9a` — colouring on a phone, the hints, half squares easy to see

**Ferme la boîte** (`dice-game`, new 2026-11-11)

- [ ] CP `d8dfedd6` · CE1 `fe00b4d4` · CE2 `aeb51e64` — fun? the « Je ne peux plus jouer » button and its hints; 12 tiles wrap to two rows on a phone

### B leftovers (2026-11-11) — check by hand

- [ ] Bar model built by the pupil — CE1 `d8536668` · CE2 `baf3bfef` · CM1 `be62a4bc` · CM2 `eb8452f3`: is « touche un nombre, puis sa case » clear? Do the hints help? Boxes drawn to scale give away which bar is longer — fine?
- [ ] Splat — GS `a12b8026` (the whole set for 2.5 s, then the splat; 👀 again) · CP `a217de06` (card only): fun? the peek long enough?
- [ ] Jug and dial — CE1 `ab5e3718` (pèse-personne, balance de cuisine) · CE2 `b694d702` (mL, cL, g, kg) · CM1 `c0085458` (L and kg with decimals; files 3–4 without the step given): readable on a phone?

## Next types (from `docs/exercise-types-landscape.md`)

- [x] C7 `hundred-board` · C8 cubes and nets (+ phase 4.2) · phase 4.3 area by tiling · C9 `dice-game` (2026-11-11)
- [x] Patrons du pavé (CM2) — `cd142b04` exercises 10–12 to check by hand
- [x] B leftovers: bar model built by the pupil, Splat (GS/CP), graduated jug and scale dial (2026-11-11)

## GS gaps (from `docs/maths_gs.md`)

- [ ] Fingers layout for counting (needs a hand SVG), and digit → fingers matching
- [ ] Fair sharing: dealing out one by one, « how many envelopes »
- [ ] Shapes: « same shape as the model »
- [ ] Colour mixing `melanger-couleurs-01` still marked partial
