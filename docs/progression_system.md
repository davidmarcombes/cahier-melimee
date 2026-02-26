# Progression System — Design Notes

## Core Philosophy

Curriculum levels (cp, ce1, ce2, etc.) are **administrative constructs**, not cognitive ones. Two students at "ce2 difficulty 2" may be in completely different positions in the real knowledge space and need completely different next exercises. The level label masks this entirely.

The system's job is to find the **next little climb** on each dimension — not to assign a level badge.

Levels and difficulty labels are kept in the CSV and UI as a **translation layer for parents and teachers**, because that's the vocabulary they know from the school system. But the engine doesn't use them for navigation.

---

## The Knowledge Space

### Global Embedding Space

The space is **global across the entire curriculum** — not partitioned by level. A child who struggles with fractions in cm1 and a child who struggles with fractions in 6e have the same conceptual gap. Level is just one feature among many, not a partitioning key.

Each subject domain (maths, français, etc.) has its own embedding space. Within maths, dimensions might include:

- `decomposition`
- `place_value`
- `operations`
- `fractions`
- `geometry`
- `proportionality`
- `algebra`
- `trigonometry`

### The Manifold Unfolds Over Time

The accessible space is not fixed — it **unfolds as the student progresses**. Early in the curriculum only a few dimensions are active. New dimensions open as the student reaches sufficient depth on existing ones.

```
cp/ce:    ──────────────────→           1D ridge, one active dimension
cm:       ──────────────────→
                         ↗              new dimension opens
collège:  ───────────────────→          2D plateau
                         ↗  ↗           further dimensions open
lycée:    (3D+ space, multiple independent climbs possible)
```

The opening of a new dimension is itself a **learnable event** — detectable from student performance data rather than imposed by calendar year. A gifted student can reach new dimensions early. A struggling student can stay on familiar ground until ready.

Early exercises have near-zero coordinates on dimensions that haven't opened yet. Sparse representation handles this efficiently in the static file.

### Exercise Positions

Each exercise is a point in the space. Its position is determined at build time from frontmatter metadata using a declared coordinate system.

```yaml
# src/_data/dimensions.yaml
maths:
  dims:
    - name: decomposition
      proxy: subtopic contains 'base10' or 'recomposer'
    - name: magnitude
      proxy: subtopic contains 'encadrement' or 'comparaison'
    - name: notation
      proxy: subtopic contains 'chiffres' or 'mots'
```

A build-time script scores each exercise against the axis definitions from its frontmatter:

```
exercise frontmatter → scoring rules → [0.2, 0.7, 0.4] → positions.json
```

The LLM can assist bootstrapping — given axis definitions and exercise frontmatter, ask it to place the exercise. Controllable and auditable since the coordinate system is declared, not discovered.

### The Embedding File

Small, static, cacheable, works offline:

```json
{
  "maths": {
    "dims": ["decomposition", "place_value", "operations"],
    "positions": {
      "ab3f9x2k": [0.2, 0.7, 0.0],
      "cd7h4n8p": [0.4, 0.3, 0.1]
    }
  }
}
```

---

## Student Position

### Representation

The student's current knowledge state is a **position vector** in the same space as the exercises. It starts near the origin and moves outward as the student climbs.

A point is the simplest representation. A probability distribution over positions is more powerful (capturing uncertainty about where the student actually is) but more complex to implement and store.

### Position Updates from Completion Data

Position is updated **purely from completion data** — no self-assessment. Two signals are combined:

**1. Success/failure** — did the student get it right?

**2. Time to completion** — how long did it take relative to the expected time for that exercise?

```
success + fast   → well past this point, move far along the dimension
success + slow   → reached it but it was a climb, move a fraction
failure + fast   → knew quickly it was beyond reach, small retreat
failure + slow   → struggled and failed, larger retreat or stay
```

Time is an honest signal that children cannot fake. It also compresses naturally as a child consolidates — the same exercise completed faster on a later visit is evidence of consolidation.

**Update rule:**

```javascript
const timeScore = Math.max(0, 1 - (elapsed / expectedTime))
const successScore = correct ? 1 : -0.5
const delta = successScore * timeScore * stepSize

studentPos[dim] += delta * exerciseVector[dim]
```

`expectedTime` is an a priori estimate per exercise, authored in frontmatter and refinable from aggregate data over time.

**Implementation note:** cap elapsed time at a maximum before it stops counting, to handle tab-switching, distractions, and leaving the page open.

---

## Recommendation Engine

### Finding the Next Climb

Given a student's current position vector, find exercises where:

1. The student is above the exercise's minimum threshold on required dimensions
2. The exercise advances them on at least one dimension they haven't plateaued on
3. The step size is small — achievable from where the student currently is

Criterion 3 is what `difficulty` encodes in the a priori embedding — not hardness in absolute terms, but **gradient steepness relative to where most students approach from**.

The recommendation is simply: **find the nearest reachable point on the frontier**.

### The Landscape Has Gravity — Spaced Repetition

Children forget. Without periodic revisiting, a student's coordinates **decay back towards the origin** over time. Position is not a permanent achievement — it's a dynamic state requiring maintenance.

```javascript
// Run on each session start
studentPos[dim] = studentPos[dim] * decayFactor(daysSinceLastVisit, dim)
```

`decayFactor` returns a value less than 1, growing weaker with time. Well-consolidated skills decay slowly; recently acquired ones decay faster — matching how memory actually works.

### Recommendation Mix

A natural session composition emerges from combining the two objectives:

- **~70% frontier exercises** — the next little climb on active dimensions
- **~30% maintenance exercises** — revisiting coordinates that are decaying

The engine doesn't distinguish between the two goals. It always finds the most valuable next exercise, whether that means climbing new ground or shoring up eroding ground.

### Learning Per-Student Decay Rates

Over time the system can learn **per-student decay rates per dimension**:

- A student who breezes through a maintenance exercise faster than their original attempt → skill consolidated well → reduce decay rate for that coordinate
- A student who struggles on a maintenance exercise → decaying faster than expected → increase decay sensitivity

Some students retain geometry effortlessly but arithmetic fades fast. This emerges from the data without being explicitly programmed.

---

## Data Architecture

### A Priori vs Posterior Embeddings

**Phase 1 — A priori** (build time):
- Frontmatter → declared axis definitions → exercise positions
- Bootstrapped with LLM assistance if needed
- Stored as a static `positions.json` file

**Phase 2 — Posterior** (runtime):
- Student performance → position updates → local fine-tuning
- Stored in `localStorage` (persistent) or `sessionStorage` (session only)
- Aggregate across students → periodically update base `positions.json`

### Sync Strategy

Student local adjustments are a **diff on top of the a priori embeddings**. When online:
- Upload the diff
- Aggregate across all students
- Periodically release updated base embeddings as a new static file

This preserves the offline-first architecture. The site works fully without connectivity; sync is an enhancement not a requirement.

### Offline First

The entire recommendation engine runs in the browser:
- `positions.json` — exercise coordinates, loaded and cached
- `data.csv` — exercise metadata, loaded and cached in `sessionStorage`
- Student position vector — stored in `localStorage`
- Decay calculation — runs locally on session start
- Recommendation — computed locally from position + positions.json

No server required for personalised learning once the initial assets are downloaded.

---

## Open Questions

- **Device switching** — how does a student's position transfer when they move to a different device? Options: account sync, QR code export, teacher-managed import.
- **Dimension discovery** — can active dimensions be inferred from student data rather than hand-declared? Useful as the exercise library grows.
- **Transition mapping** — when a new dimension opens for a student, what is their starting position on it? Likely inferred from performance on exercises that partially load that dimension.
- **Group dynamics** — can aggregate student data improve the a priori embeddings over time without exposing individual data?
- **Expected time calibration** — how is `expectedTime` per exercise established initially, and how is it refined from real completion data?