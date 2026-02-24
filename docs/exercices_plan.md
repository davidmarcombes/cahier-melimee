# Exercise Listing — Architecture Decisions

## 1. Folder Structure Refactor

Reorganise exercise source files from flat hyphenated folders into a nested hierarchy.

**Before:**
```
src/fr/exercices/
  ce1-maths-logique-grille-01/
    01-couleurs.md
    01-couleurs.md
    index.yaml
```

**After:**
```
src/exercices/
  ce1/
    maths/
      logique/
        grille-01.md/
            01-couleurs.md
            01-couleurs.md
            index.yaml
    ...
```

**Rules:**
- First 3 levels (`level/subject/topic`) are curated — contributors do not create these
- Contributors only add `.md` files inside existing leaf folders
- New topics require a PR to add the folder
- do this for both 'exercices' and 'applications'

**Benefit:** The path becomes the taxonomy. Derive `level`, `subject`, `topic` from the file path rather than repeating them in every frontmatter:


**Important**
'/home/david/Code/web/cahier-melimee/scripts/generate-ids.js' Will likely need to be tweaked for the new structure.


**Use ID fr slugs**
Every 'index.yaml' should have an 'id' field. This ID will be used for the URL slug.
It is important that the ID is unique and follows the slug format (lowercase, hyphens, etc.).


The build must warn with red alert at teh end if some files are missing an ID.

User runs the id generation script to generate the missing IDs. Build should not change code.

---

## 2. Split Listing: HTML Shell + CSV Data

Replace the single large HTML listing page with a lightweight HTML shell that loads exercise metadata from a separate CSV file.

**File structure:**
```
_site/fr/exercices/
  index.html       ← tiny shell with filter UI (~8KB)
  data.csv         ← all exercise metadata, loaded on demand
```

**Generate `data.csv` in 11ty:**


**Benefits:**
- HTML page stays lean forever regardless of exercise count
- CSV is cached separately and independently
- Brotli compresses repetitive CSV extremely well (~90%)

---

## 3. Compact CSV Format

Use single-character codes for enumerable fields to minimise data size. Target: ~100 bytes per exercise row.

**Format:**
```
id,l,s,t,title,d
ab3f9x2k1qmz,1,m,num,Numération base 10,1
cd7h4n8p2rwy,1,m,mes,Les heures,2
```

**Field encoding:**

| Field | Key | Example values |
|-------|-----|----------------|
| `id` | Fixed-length hash from index.yaml | `ab3f9x2k1qmz` |
| `level` | 1 char | `1`=cp, `2`=ce1, `3`=ce2, `4`=cm1, `5`=cm2 |
| `subject` | 1 char | `M`=maths, `F`=français |
| `topic` | free text theme | `Numération`, `Logique`, `Géometrie` |
| `title` | free text | `Numération base 10` |
| `difficulty` | 1 char | `1`, `2`, `3` |

Build should warn if topic is more than 12 characters
Build should warn if full line is more than 64 characters

**Parse in browser:**
```javascript
const rows = csv.trim().split('\n').slice(1)
  .map(row => {
    const [id, level, subject, topic, title, difficulty] = row.split(',')
    return { id, level, subject, topic, title, difficulty }
  })
```

---

## 4. Client-side Filtering with Alpine

The `index.html` shell handles filtering entirely in the browser using Alpine.js. No server-side pagination needed.

```html
<div x-data x-init="$store.exercises.load()">
  <template x-if="$store.exercises.loading">
    <p>Chargement...</p>
  </template>
  <template x-if="$store.exercises.data">
    <div>
      <!-- filter controls bound to $store.exercises.data -->
    
By default the page should not load all exercises. Especially when no filters are applied. It should use pagination or a show more button.
---

## 5. Session Cache with Alpine Store + sessionStorage

Load the CSV once per browser session. Subsequent page visits (e.g. returning from an exercise) read from `sessionStorage` with no network request.

```javascript
document.addEventListener('alpine:init', () => {
  Alpine.store('exercises', {
    data: null,
    loading: false,

    async load() {
      // Return immediately if already in memory
      if (this.data) return

      // Check sessionStorage before fetching
      const cached = sessionStorage.getItem('exercises')
      if (cached) {
        this.data = JSON.parse(cached)
        return
      }

      // Fetch, parse, and cache
      this.loading = true
      const res = await fetch('/fr/exercices/data.csv')
      const text = await res.text()
      this.data = text.trim().split('\n').slice(1).map(row => {
        const [id, level, subject, topic, title, difficulty] = row.split(',')
        return { id, level, subject, topic, title, difficulty }
      })
      sessionStorage.setItem('exercises', JSON.stringify(this.data))
      this.loading = false
    }
  })
})
```

**Cache lifecycle:**
- First visit → fetch CSV, parse, store in `sessionStorage`
- Navigation within the same tab → read from `sessionStorage`, no fetch
- New tab or browser restart → fresh fetch

---

## Implementation Order

1. Refactor folder structure (one-time, do while ~50 files)
2. Add `id` field generation to exercise frontmatter or build step
3. Create `data.csv` 11ty template
4. Build Alpine store with sessionStorage cache
5. Rebuild `exercices/index.html` as a shell with client-side filters