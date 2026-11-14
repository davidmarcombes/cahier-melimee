#!/usr/bin/env node
/**
 * programme-coverage.js — programme coverage map: which programme items (docs/maths_<level>.md)
 * have series, by level, programme section, strand and exercise type. Shows strong and weak spots.
 *
 * Matching: each series (exercices, applications, défis) is matched to the items of its own
 * level by TF-IDF similarity (title, slug, generator, exercise titles, type), with a domain
 * prior from its folder (geometrie → Espace et géométrie…). GS uses the explicit `slug`
 * links of docs/maths_gs.md. Hand corrections live in docs/programme-map.yaml (pin / skip).
 *
 * Usage:
 *   node scripts/programme-coverage.js                 # write reports/programme-coverage.{json,md}, print summary
 *   node scripts/programme-coverage.js --level=cm1     # console detail for one level (items + series)
 *   node scripts/programme-coverage.js --gaps          # console: uncovered items per level
 *   node scripts/programme-coverage.js --unmapped      # console: series matched to no item
 *   node scripts/programme-coverage.js --series=<slug> # console: why a series maps where it does (top 5 scores)
 *   node scripts/programme-coverage.js --no-write      # don't touch reports/
 */
'use strict';
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { LEVELS, DOMAINS, STRANDS, loadProgramme } = require('./lib/programme.js');

const ROOT = path.resolve(__dirname, '..');
const MAP_FILE = path.join(ROOT, 'docs/programme-map.yaml');
const OUT_JSON = path.join(ROOT, 'reports/programme-coverage.json');
const OUT_MD = path.join(ROOT, 'reports/programme-coverage.md');

const args = process.argv.slice(2);
const arg = (name) => {
  const a = args.find((x) => x === `--${name}` || x.startsWith(`--${name}=`));
  if (!a) return undefined;
  return a.includes('=') ? a.split('=').slice(1).join('=') : true;
};

/** Matching thresholds: a series maps to every item scoring ≥ max(MIN_SCORE, RELATIVE × best). */
const MIN_SCORE = 0.28;
/** Lower threshold when the series' skill class agrees with the best item's strand. */
const MIN_SCORE_CLASS_AGREES = 0.18;
const RELATIVE = 0.85;
const MAX_ITEMS_PER_SERIES = 3;
/** A pick in the other group (main list / 2025 compléments) must reach this share of the series' best score. */
const GROUP_VS_OVERALL = 0.6;

// ─── Series inventory ────────────────────────────────────────────────────────

const SCAN = [
  ['exercice', 'src/fr/exercices'],
  ['application', 'src/fr/applications'],
  ['defi', 'src/fr/defis'],
];

function frontmatter(file) {
  const c = fs.readFileSync(file, 'utf8');
  const m = c.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: c };
  try {
    return { data: yaml.load(m[1]) || {}, body: m[2] };
  } catch {
    return { data: {}, body: m[2] };
  }
}

function loadSeries() {
  const out = [];
  for (const [kind, rel] of SCAN) {
    const walk = (dir) => {
      if (!fs.existsSync(dir)) return;
      if (fs.existsSync(path.join(dir, 'index.yaml'))) {
        const relPath = path.relative(path.join(ROOT, 'src'), dir).replace(/\\/g, '/');
        const [, , level, , topic, slug] = relPath.split('/');
        if (!LEVELS.includes(level)) return;
        let meta = {};
        try {
          meta = yaml.load(fs.readFileSync(path.join(dir, 'index.yaml'), 'utf8')) || {};
        } catch {
          /* invalid index.yaml: validate:exercises reports it */
        }
        const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
        const types = new Set();
        const generators = new Set();
        const titles = [];
        const bodies = [];
        let questions = 0;
        for (const f of files) {
          const { data, body } = frontmatter(path.join(dir, f));
          types.add(data.type || 'number-check');
          if (data.generator) generators.add(data.generator);
          if (data.title) titles.push(String(data.title));
          bodies.push(body.replace(/[#*_`>|-]/g, ' ').slice(0, 200));
          questions += Number(data.repeat ?? 1) || 1;
        }
        out.push({
          key: `${level}/${topic}/${slug}`,
          kind,
          level,
          topic,
          slug,
          id: meta.id || '',
          title: String(meta.title || slug),
          class: meta.class ? String(meta.class) : '',
          difficulty: meta.difficulty || '',
          types: [...types].sort(),
          generators: [...generators],
          titles,
          bodies,
          files: files.length,
          questions,
          path: `src/${relPath}`,
        });
        return;
      }
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) if (e.isDirectory()) walk(path.join(dir, e.name));
    };
    walk(path.join(ROOT, rel));
  }
  return out;
}

// ─── Text normalisation ──────────────────────────────────────────────────────

const STOP = new Set(
  (
    'a au aux avec ce ces d dans de des du en et est il ils je l la le les leur lui ma me mes mon ne ni nos ou par pas pour qu que qui sa se ses son sur ta te tes ton tu un une vos y ' +
    'jusqu nouveau programme quelques autres autre entre chaque leurs plus moins tres bien faire etre avoir sous cas simples simple usuels usuelles usuel usuelle ' +
    'the of to and or with up from for in on is by'
  ).split(' ')
);

/** Same-concept words → one canonical stem (after accent stripping). */
const SYNONYMS = {
  potence: 'divis',
  quotient: 'divis',
  partage: 'divis',
  reste: 'divis',
  produit: 'multi',
  fois: 'multi',
  somme: 'addit',
  ajout: 'addit',
  ajouter: 'addit',
  difference: 'soust',
  enlever: 'soust',
  retrait: 'soust',
  horloge: 'heure',
  pendule: 'heure',
  aiguille: 'heure',
  minute: 'heure',
  euro: 'monna',
  piece: 'monna',
  billet: 'monna',
  centime: 'monna',
  rendre: 'monna',
  axe: 'symet',
  miroir: 'symet',
  pliage: 'symet',
  dixieme: 'decim',
  centieme: 'decim',
  virgule: 'decim',
  moitie: 'fract',
  tiers: 'fract',
  quart: 'fract',
  denominateur: 'fract',
  numerateur: 'fract',
  pose: 'posee',
  posee: 'posee',
  poser: 'posee',
  colonne: 'posee',
  trou: 'trou',
  manquant: 'trou',
  cache: 'trou',
  ranger: 'ordon',
  ordre: 'ordon',
  croissant: 'ordon',
  decroissant: 'ordon',
  plus_grand: 'compa',
  signe: 'compa',
  cube: 'solid',
  pave: 'solid',
  patron: 'solid',
  cylindre: 'solid',
  quadrillage: 'quadr',
  coordonnee: 'quadr',
  robot: 'deplac',
  fleche: 'deplac',
  chemin: 'deplac',
  graphique: 'diagr',
  histogramme: 'diagr',
  hasard: 'proba',
  chance: 'proba',
  probable: 'proba',
  pourcent: 'pourc',
  gramme: 'masse',
  kilogramme: 'masse',
  kg: 'masse',
  litre: 'conte',
  metre: 'longu',
  cm: 'longu',
  mm: 'longu',
  km: 'longu',
  dizaine: 'dizai',
  centaine: 'centa',
  millier: 'milli',
  million: 'milli',
  boulier: 'numer',
  abaque: 'numer',
};

/** Type → concept words added to a series' text (types say what is practised). */
const TYPE_WORDS = {
  clock: 'heure horloge',
  'clock-set': 'heure horloge aiguilles',
  ruler: 'longueur règle mesurer',
  'money-pay': 'monnaie euros',
  'column-op': 'posée',
  'fraction-check': 'fraction',
  'fraction-op': 'fraction',
  fraction: 'fraction',
  'bar-chart': 'diagramme données',
  'coordinate-grid': 'quadrillage repérer',
  'number-line': 'droite graduée',
  'jump-line': 'droite graduée',
  'number-strip': 'bande numérique',
  'base-10': 'unités dizaines centaines',
  sequence: 'suite',
  pyramid: 'addition',
  'calc-chain': 'calcul',
  'function-machine': 'programme calcul',
  'compare-expressions': 'comparer',
  compare: 'comparer',
  bounding: 'encadrer',
  'count-objects': 'compter collection',
  'bar-model': 'problème schéma barre',
  problem: 'problème',
  'guided-problem': 'problème',
  'inverse-problem': 'problème',
  'grid-board': 'déplacement quadrillage',
  maze: 'déplacement',
  symmetry: 'symétrie',
  convert: 'convertir unités',
  'fill-table': 'tableau',
  venn: 'tri classer',
  classify: 'tri classer',
  'logic-grid': 'logique',
  estimation: 'estimer',
};

const deaccent = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

function stem(w) {
  if (/^\d+$/.test(w)) return w;
  let s = w.replace(/(aux)$/, 'al').replace(/[sx]$/, '');
  if (SYNONYMS[s]) return SYNONYMS[s];
  if (SYNONYMS[w]) return SYNONYMS[w];
  return s.length > 5 ? s.slice(0, 5) : s;
}

function tokens(text) {
  const t = deaccent(String(text).toLowerCase())
    .replace(/(\d)[\s\u202f\u00a0](?=\d{3}\b)/g, '$1') // 1 000 → 1000
    .replace(/[’']/g, ' ')
    .replace(/plus grand/g, 'plus_grand')
    .replace(/([a-z])([A-Z])/g, '$1 $2');
  return t
    .split(/[^a-z0-9_]+/)
    .filter((w) => w && !STOP.has(w) && (w.length > 1 || /\d/.test(w)))
    .map(stem);
}

/** camelCase / kebab-case identifiers → words. */
const words = (id) =>
  String(id)
    .replace(/([a-z])([A-Z0-9])/g, '$1 $2')
    .replace(/[-_]/g, ' ');

/** Numbers say the range (« jusqu'à 18 »), titles rarely do: they count less than words. */
const NUMBER_WEIGHT = 0.3;

function addTo(vec, text, weight) {
  for (const t of tokens(text)) vec.set(t, (vec.get(t) || 0) + weight * (/^\d+$/.test(t) ? NUMBER_WEIGHT : 1));
}

function seriesVector(s) {
  const v = new Map();
  addTo(v, s.title, 3);
  addTo(v, words(s.slug).replace(/\b\d+\b$/, ''), 2);
  for (const g of s.generators) addTo(v, words(g), 2);
  for (const t of s.titles.slice(0, 8)) addTo(v, t, 1 / Math.max(1, s.titles.length / 4));
  for (const b of s.bodies.slice(0, 6)) addTo(v, b, 0.3);
  for (const t of s.types) if (TYPE_WORDS[t]) addTo(v, TYPE_WORDS[t], 1);
  if (s.types.includes('pyramid')) v.delete('pyram'); // number pyramids, not solids
  return v;
}

function itemVector(item, section) {
  const v = new Map();
  addTo(v, item.text, 2);
  addTo(v, section.title, 1);
  return v;
}

function tfidf(vec, idf) {
  const out = new Map();
  let n = 0;
  for (const [t, w] of vec) {
    const x = w * (idf.get(t) ?? 0);
    if (x > 0) {
      out.set(t, x);
      n += x * x;
    }
  }
  n = Math.sqrt(n) || 1;
  for (const [t, x] of out) out.set(t, x / n);
  return out;
}

function cosine(a, b) {
  let s = 0;
  const [small, big] = a.size < b.size ? [a, b] : [b, a];
  for (const [t, x] of small) {
    const y = big.get(t);
    if (y) s += x * y;
  }
  return s;
}

/** Folder topic → preferred programme domain(s). */
const TOPIC_DOMAIN = {
  geometrie: ['EG'],
  mesures: ['GM'],
  donnees: ['OD'],
  calcul: ['NC'],
  operations: ['NC'],
  numeration: ['NC'],
  nombres: ['NC'],
  fractions: ['NC'],
  decimaux: ['NC'],
  proportions: ['NC', 'GM'],
  problemes: ['NC', 'GM'],
  logique: ['NC', 'EG', 'OD'],
};

/** Folder topic → [strand, bonus on that strand, factor on the others] (a nudge, not a constraint). */
const TOPIC_STRAND = {
  fractions: ['fractions', 1.2, 1],
  decimaux: ['decimaux', 1.2, 1],
  problemes: ['problemes', 1.3, 0.75],
  proportions: ['proportion', 1.3, 1],
  donnees: ['donnees', 1.2, 1],
  logique: ['algebre', 1.1, 0.8],
};

/**
 * Skill class (index.yaml `class:`, docs/classification.md) → strands it belongs to. Items of those
 * strands score ×CLASS_IN, others ×CLASS_OUT. Classes not listed (logic, coding, flows) give no prior.
 */
const CLASS_IN = 1.25;
const CLASS_OUT = 0.7;
const CLASS_STRANDS = [
  [/^[AM]\d/, ['problemes', 'proportion', 'algebre']],
  [/^S1\.1\./, ['mental', 'addsub', 'multdiv', 'decimaux', 'fractions']],
  [/^S1\.2\.1/, ['addsub', 'multdiv', 'decimaux']],
  [/^S2\.1\.1/, ['numeration']],
  [/^S2\.1\.2/, ['numeration', 'decimaux']],
  [/^S2\.1\.3/, ['fractions', 'decimaux']],
  [/^S2\.2\.1/, ['addsub', 'mental', 'algebre']],
  [/^S2\.2\.2/, ['multdiv', 'mental', 'algebre']],
  [/^S3\.1\.[123]/, ['numeration', 'fractions', 'decimaux']],
  [/^S3\.1\.4/, ['mesures']],
  [/^S3\.2\.1/, ['algebre']],
  [/^S3\.2\.5/, ['problemes']],
  [/^S4\.1\.1/, ['mesures', 'temps', 'aires']],
  [/^S4\.1\.2/, ['monnaie', 'decimaux']],
  [/^S4\.2\./, ['aires']],
  [/^I1\.1\.1/, ['temps']],
  [/^I1\.(1\.2|2\.1)/, ['mesures', 'angles', 'figures', 'aires']],
  [/^D1\./, ['donnees']],
  [/^G1\.1\.[13]/, ['figures']],
  [/^G1\.1\.2/, ['angles', 'figures']],
  [/^G1\.2\./, ['reperage', 'algebre']],
];
const classStrands = (c) => CLASS_STRANDS.find(([re]) => re.test(c))?.[1];

// ─── Overrides ───────────────────────────────────────────────────────────────

function loadOverrides() {
  if (!fs.existsSync(MAP_FILE)) return { pin: {}, skip: {} };
  const y = yaml.load(fs.readFileSync(MAP_FILE, 'utf8')) || {};
  return { pin: y.pin || {}, skip: y.skip || {} };
}

const norm = (s) => deaccent(String(s).toLowerCase()).replace(/\s+/g, ' ').trim();

/** Find the series a map key names: "level/slug" or "level/topic/slug". */
function findSeries(series, key) {
  const parts = key.split('/');
  return series.filter((s) => (parts.length === 3 ? s.key === key : s.level === parts[0] && s.slug === parts[1]));
}

/** Resolve an item reference within a level: an item id ("cm1:division#3"), or a text fragment. */
function findItems(items, ref) {
  if (/^[a-z0-9]+:[^#]+#\d+$/.test(ref)) return items.filter((i) => i.id === ref);
  if (ref.startsWith('§')) {
    const t = norm(ref.slice(1));
    return items.filter((i) => norm(i.section.title) === t);
  }
  const t = norm(ref);
  const exact = items.filter((i) => norm(i.text) === t);
  return exact.length ? exact : items.filter((i) => norm(i.text).includes(t));
}

// ─── Matching ────────────────────────────────────────────────────────────────

function buildMap() {
  const programme = loadProgramme();
  const series = loadSeries();
  const overrides = loadOverrides();
  const warnings = [];

  const itemsByLevel = {};
  for (const l of LEVELS) {
    itemsByLevel[l] = [];
    for (const sec of programme[l])
      for (const it of sec.items) itemsByLevel[l].push(Object.assign(it, { section: sec, series: [] }));
  }

  // IDF over programme items of CP → CM2 (programme vocabulary)
  const df = new Map();
  let nDocs = 0;
  for (const l of LEVELS.slice(1))
    for (const it of itemsByLevel[l]) {
      nDocs++;
      for (const t of new Set(tokens(`${it.text} ${it.section.title}`))) df.set(t, (df.get(t) || 0) + 1);
    }
  const idf = new Map([...df].map(([t, d]) => [t, Math.log(1 + nDocs / d)]));
  for (const l of LEVELS) for (const it of itemsByLevel[l]) it.vec = tfidf(itemVector(it, it.section), idf);

  const pinned = new Map();
  for (const [key, refs] of Object.entries(overrides.pin)) {
    const found = findSeries(series, key);
    // Several series may share a key (an exercise and an application with the same slug): all get the pin
    if (!found.length) {
      warnings.push(`pin « ${key} »: no series`);
      continue;
    }
    const s = found[0];
    const items = [];
    for (const ref of [].concat(refs)) {
      const m = findItems(itemsByLevel[s.level], ref);
      if (!m.length) warnings.push(`pin « ${key} »: no ${s.level} item matches « ${ref} »`);
      else if (m.length > 1 && !ref.startsWith('§'))
        warnings.push(`pin « ${key} »: « ${ref} » matches ${m.length} items (all used)`);
      items.push(...m);
    }
    pinned.set(s.key, items);
  }
  const skipped = new Map();
  for (const [key, why] of Object.entries(overrides.skip)) {
    const found = findSeries(series, key);
    if (!found.length) warnings.push(`skip « ${key} »: no series`);
    for (const s of found) skipped.set(s.key, why || 'hors programme');
  }

  // GS explicit links
  const gsBySlug = new Map(series.filter((s) => s.level === 'gs').map((s) => [s.slug, s]));
  const gsLinked = new Map();
  for (const it of itemsByLevel.gs)
    for (const slug of it.links) {
      const s = gsBySlug.get(slug);
      if (!s) continue;
      if (!gsLinked.has(s.key)) gsLinked.set(s.key, []);
      gsLinked.get(s.key).push(it);
    }

  for (const s of series) {
    s.items = [];
    s.how = 'auto';
    if (skipped.has(s.key)) {
      s.how = 'skip';
      s.skipWhy = skipped.get(s.key);
      continue;
    }
    if (pinned.has(s.key)) {
      s.how = 'pin';
      s.items = pinned.get(s.key).map((it) => ({ it, score: 1 }));
    } else if (s.level === 'gs') {
      s.how = 'link';
      s.items = (gsLinked.get(s.key) || []).map((it) => ({ it, score: 1 }));
    } else {
      const v = tfidf(seriesVector(s), idf);
      const doms = TOPIC_DOMAIN[s.topic] || ['NC'];
      const [prefStrand, bonus, others] = TOPIC_STRAND[s.topic] || [];
      const cls = classStrands(s.class);
      const scored = itemsByLevel[s.level]
        .map((it) => {
          let score = cosine(v, it.vec);
          if (!doms.includes(it.section.domain)) score *= 0.6;
          if (prefStrand) score *= it.strand === prefStrand ? bonus : others;
          if (cls) score *= cls.includes(it.strand) ? CLASS_IN : CLASS_OUT;
          return { it, score };
        })
        .sort((a, b) => b.score - a.score);
      s.top = scored.slice(0, 5);
      // The 2025 « compléments » restate items of the main list: pick the best matches in each
      // group separately, or a series would only ever land in one of the two.
      const overall = scored[0]?.score || 0;
      const pick = (group) => {
        const best = group[0]?.score || 0;
        const floor = Math.max(
          cls && group[0] && cls.includes(group[0].it.strand) ? MIN_SCORE_CLASS_AGREES : MIN_SCORE,
          GROUP_VS_OVERALL * overall
        );
        return best >= floor
          ? group.filter((x) => x.score >= Math.max(floor, RELATIVE * best)).slice(0, MAX_ITEMS_PER_SERIES)
          : [];
      };
      s.items = [
        ...pick(scored.filter((x) => !x.it.section.complement)),
        ...pick(scored.filter((x) => x.it.section.complement)),
      ];
    }
    for (const { it, score } of s.items) it.series.push({ s, score });
  }
  return { programme, series, itemsByLevel, warnings };
}

// ─── Aggregation ─────────────────────────────────────────────────────────────

const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0);

function rating(sec) {
  // Strong: most items covered and several series per item; weak: most items without series.
  const r = sec.items ? sec.covered / sec.items : 0;
  if (r >= 0.75 && sec.series >= sec.items) return 'fort';
  if (r >= 0.5) return 'correct';
  if (r > 0) return 'faible';
  return 'vide';
}

function aggregate({ programme, series, itemsByLevel }) {
  const levels = [];
  for (const l of LEVELS) {
    const lvSeries = series.filter((s) => s.level === l);
    const sections = programme[l].map((sec) => {
      const its = sec.items;
      const ser = new Set();
      const types = new Map();
      const diffs = new Map();
      for (const it of its)
        for (const { s } of it.series) {
          ser.add(s);
        }
      for (const s of ser) {
        for (const t of s.types) types.set(t, (types.get(t) || 0) + 1);
        diffs.set(s.difficulty || '?', (diffs.get(s.difficulty || '?') || 0) + 1);
      }
      const row = {
        id: sec.id,
        title: sec.title,
        complement: sec.complement,
        domain: sec.domain,
        strand: sec.strand,
        items: its.length,
        covered: its.filter((i) => i.series.length).length,
        series: ser.size,
        types: Object.fromEntries([...types].sort((a, b) => b[1] - a[1])),
        difficulties: Object.fromEntries(diffs),
        itemList: its.map((i) => ({
          id: i.id,
          text: i.text,
          strand: i.strand,
          status: i.status,
          series: i.series
            .sort((a, b) => b.score - a.score)
            .map(({ s, score }) => ({
              key: s.key,
              title: s.title,
              kind: s.kind,
              types: s.types,
              score: +score.toFixed(3),
            })),
        })),
      };
      row.rating = rating(row);
      return row;
    });
    const items = itemsByLevel[l];
    levels.push({
      level: l,
      series: lvSeries.length,
      mapped: lvSeries.filter((s) => s.items.length).length,
      skipped: lvSeries.filter((s) => s.how === 'skip').length,
      items: items.length,
      covered: items.filter((i) => i.series.length).length,
      sections,
    });
  }

  // strand × level
  const strands = [...STRANDS.map(([k, label]) => ({ key: k, label })), { key: 'autre', label: 'Autre' }];
  const strandGrid = strands
    .map(({ key, label }) => {
      const cells = {};
      for (const l of LEVELS) {
        const its = itemsByLevel[l].filter((i) => i.strand === key);
        const ser = new Set(its.flatMap((i) => i.series.map((x) => x.s.key)));
        cells[l] = { items: its.length, covered: its.filter((i) => i.series.length).length, series: ser.size };
      }
      return { key, label, cells };
    })
    .filter((r) => LEVELS.some((l) => r.cells[l].items));

  // type × strand (series count) and type × level
  const typeStats = new Map();
  for (const s of series) {
    const strandsOf = new Set(s.items.map(({ it }) => it.strand));
    for (const t of s.types) {
      if (!typeStats.has(t)) typeStats.set(t, { type: t, series: 0, levels: {}, strands: {}, unmapped: 0 });
      const ts = typeStats.get(t);
      ts.series++;
      ts.levels[s.level] = (ts.levels[s.level] || 0) + 1;
      if (!s.items.length) ts.unmapped++;
      for (const k of strandsOf) ts.strands[k] = (ts.strands[k] || 0) + 1;
    }
  }
  const types = [...typeStats.values()].sort((a, b) => b.series - a.series);

  // distinct types per strand×level: variety of practice
  for (const row of strandGrid)
    for (const l of LEVELS) {
      const ts = new Set();
      for (const it of itemsByLevel[l])
        if (it.strand === row.key) for (const { s } of it.series) s.types.forEach((t) => ts.add(t));
      row.cells[l].types = ts.size;
    }

  const unmapped = series
    .filter((s) => !s.items.length && s.how !== 'skip')
    .map((s) => ({
      key: s.key,
      title: s.title,
      kind: s.kind,
      types: s.types,
      class: s.class,
      best: s.top?.[0] ? { item: s.top[0].it.text, score: +s.top[0].score.toFixed(3) } : null,
    }));
  const skipped = series.filter((s) => s.how === 'skip').map((s) => ({ key: s.key, title: s.title, why: s.skipWhy }));

  return { levels, strandGrid, types, unmapped, skipped };
}

// ─── Markdown report ─────────────────────────────────────────────────────────

const LV = (l) => l.toUpperCase();
const RATING_ICON = { fort: '🟢', correct: '🟡', faible: '🟠', vide: '🔴' };

function cellIcon(c) {
  if (!c.items) return '·';
  const r = c.covered / c.items;
  const icon = r >= 0.75 ? '🟢' : r >= 0.5 ? '🟡' : r > 0 ? '🟠' : '🔴';
  return `${icon} ${c.covered}/${c.items} (${c.series})`;
}

function markdown(agg, warnings) {
  const L = [];
  const now = new Date().toISOString().slice(0, 10);
  L.push('# Couverture du programme', '');
  L.push(
    `Généré par \`npm run coverage:programme\` le ${now}. Ne pas éditer : corriger le rattachement dans \`docs/programme-map.yaml\`.`,
    ''
  );
  L.push(
    'Un item du programme (`docs/maths_<niveau>.md`) est **couvert** quand au moins une série de son niveau y est rattachée. ' +
      'Le rattachement est automatique (similarité de texte), corrigé à la main dans `docs/programme-map.yaml` : un item couvert peut l’être mal, à vérifier avant de s’y fier pour une décision fine.',
    ''
  );
  L.push(
    'Légende : 🟢 ≥ 75 % des items couverts · 🟡 ≥ 50 % · 🟠 > 0 · 🔴 aucun. Cellule = items couverts / items (séries rattachées).',
    ''
  );

  L.push('## Par niveau', '');
  L.push(
    '| Niveau | Séries | Rattachées | Hors programme | Items | Couverts | % |',
    '|---|---:|---:|---:|---:|---:|---:|'
  );
  for (const lv of agg.levels)
    L.push(
      `| ${LV(lv.level)} | ${lv.series} | ${lv.mapped} | ${lv.skipped} | ${lv.items} | ${lv.covered} | ${pct(lv.covered, lv.items)} % |`
    );
  L.push('');

  L.push('## Par thème et niveau', '');
  L.push(`| Thème | ${LEVELS.map(LV).join(' | ')} |`, `|---|${LEVELS.map(() => '---').join('|')}|`);
  for (const r of agg.strandGrid) L.push(`| ${r.label} | ${LEVELS.map((l) => cellIcon(r.cells[l])).join(' | ')} |`);
  L.push('');

  // Strong / weak
  const allSecs = agg.levels.flatMap((lv) => lv.sections.map((s) => ({ ...s, level: lv.level })));
  const strong = allSecs.filter((s) => s.rating === 'fort').sort((a, b) => b.series / b.items - a.series / a.items);
  const weak = allSecs
    .filter((s) => s.rating === 'vide' || s.rating === 'faible')
    .sort((a, b) => a.covered / a.items - b.covered / b.items || b.items - a.items);
  L.push('## Points forts', '');
  L.push('Sections dont ≥ 75 % des items sont couverts, avec au moins une série par item.', '');
  for (const s of strong.slice(0, 40))
    L.push(
      `- ${LV(s.level)} · ${s.title}${s.complement ? ' (2025)' : ''} — ${s.covered}/${s.items} items, ${s.series} séries, ${Object.keys(s.types).length} types`
    );
  if (strong.length > 40) L.push(`- … et ${strong.length - 40} autres`);
  L.push('');
  L.push('## Points faibles', '');
  L.push('Sections sans série (🔴) ou avec moins de la moitié des items couverts (🟠).', '');
  for (const lv of agg.levels) {
    const w = weak.filter((s) => s.level === lv.level);
    if (!w.length) continue;
    L.push(`### ${LV(lv.level)}`, '');
    for (const s of w)
      L.push(
        `- ${RATING_ICON[s.rating]} ${s.title}${s.complement ? ' (2025)' : ''} — ${s.covered}/${s.items} (${DOMAINS[s.domain]})`
      );
    L.push('');
  }

  L.push('## Types d’exercice', '');
  L.push('Nombre de séries utilisant chaque type, par niveau, et les thèmes où il sert.', '');
  L.push(
    `| Type | Séries | ${LEVELS.map(LV).join(' | ')} | Non rattachées | Thèmes principaux |`,
    `|---|---:|${LEVELS.map(() => '---:').join('|')}|---:|---|`
  );
  const strandLabel = Object.fromEntries(agg.strandGrid.map((r) => [r.key, r.label]));
  for (const t of agg.types) {
    const top = Object.entries(t.strands)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k, n]) => `${strandLabel[k] || k} ${n}`)
      .join(', ');
    L.push(
      `| \`${t.type}\` | ${t.series} | ${LEVELS.map((l) => t.levels[l] || '').join(' | ')} | ${t.unmapped || ''} | ${top} |`
    );
  }
  L.push('');

  L.push('## Variété par thème', '');
  L.push('Nombre de types d’exercice différents parmi les séries rattachées (peu de types = pratique monotone).', '');
  L.push(`| Thème | ${LEVELS.map(LV).join(' | ')} |`, `|---|${LEVELS.map(() => '---:').join('|')}|`);
  for (const r of agg.strandGrid)
    L.push(`| ${r.label} | ${LEVELS.map((l) => (r.cells[l].items ? r.cells[l].types : '·')).join(' | ')} |`);
  L.push('');

  L.push('## Détail par section', '');
  for (const lv of agg.levels) {
    L.push(`### ${LV(lv.level)} — ${lv.covered}/${lv.items} items (${pct(lv.covered, lv.items)} %)`, '');
    L.push('| Section | Domaine | Items | Séries | Types |', '|---|---|---:|---:|---|');
    for (const s of lv.sections) {
      const types = Object.entries(s.types)
        .slice(0, 5)
        .map(([t, n]) => `${t} ${n}`)
        .join(', ');
      L.push(
        `| ${RATING_ICON[s.rating]} ${s.title}${s.complement ? ' (2025)' : ''} | ${s.domain} | ${s.covered}/${s.items} | ${s.series} | ${types} |`
      );
    }
    L.push('');
  }

  L.push('## Items non couverts', '');
  for (const lv of agg.levels) {
    const miss = lv.sections.flatMap((s) =>
      s.itemList.filter((i) => !i.series.length).map((i) => ({ ...i, sec: s.title }))
    );
    L.push(`<details><summary>${LV(lv.level)} — ${miss.length} items</summary>`, '');
    let last = '';
    for (const i of miss) {
      if (i.sec !== last) L.push(`- **${i.sec}**`);
      last = i.sec;
      L.push(`  - ${i.text}${i.status === 'done' ? ' *(coché dans le doc, aucune série liée)*' : ''}`);
    }
    L.push('', '</details>', '');
  }

  L.push(`## Séries non rattachées (${agg.unmapped.length})`, '');
  L.push(
    'Aucun item assez proche : hors programme (jeux, logique), item manquant dans le doc, ou titre trop vague → `pin` ou `skip` dans `docs/programme-map.yaml`.',
    ''
  );
  L.push('<details><summary>Liste</summary>', '');
  for (const s of agg.unmapped)
    L.push(
      `- \`${s.key}\` ${s.title} — ${s.types.join(', ')}${s.best ? ` · meilleur : « ${s.best.item} » ${s.best.score}` : ''}`
    );
  L.push('', '</details>', '');

  if (warnings.length) {
    L.push('## Avertissements (programme-map.yaml)', '');
    for (const w of warnings) L.push(`- ${w}`);
    L.push('');
  }
  return L.join('\n');
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
  const map = buildMap();
  const agg = aggregate(map);

  if (arg('series')) {
    const q = arg('series');
    for (const s of map.series.filter((x) => x.slug === q || x.key === q || x.key.endsWith(`/${q}`))) {
      console.log(`${s.key} « ${s.title} » [${s.how}] types=${s.types.join(',')} gen=${s.generators.join(',')}`);
      for (const { it, score } of s.top || s.items)
        console.log(
          `  ${score.toFixed(3)} ${s.items.some((x) => x.it === it) ? '✓' : ' '} ${it.section.title} › ${it.text}  (${it.id})`
        );
    }
    return;
  }

  if (!arg('no-write')) {
    const json = {
      generated: new Date().toISOString(),
      levels: agg.levels,
      strands: agg.strandGrid,
      types: agg.types,
      unmapped: agg.unmapped,
      skipped: agg.skipped,
      warnings: map.warnings,
    };
    fs.writeFileSync(OUT_JSON, JSON.stringify(json, null, 1) + '\n');
    fs.writeFileSync(OUT_MD, markdown(agg, map.warnings) + '\n');
  }

  const lvArg = arg('level');
  if (lvArg) {
    const lv = agg.levels.find((x) => x.level === String(lvArg).toLowerCase());
    for (const s of lv.sections) {
      console.log(
        `\n${RATING_ICON[s.rating]} ${s.title}${s.complement ? ' (2025)' : ''}  ${s.covered}/${s.items} items · ${s.series} séries`
      );
      for (const i of s.itemList) {
        console.log(`   ${i.series.length ? '✓' : '✗'} ${i.text}`);
        for (const x of i.series.slice(0, 6)) console.log(`       ${x.score.toFixed(2)} ${x.key}  « ${x.title} »`);
        if (i.series.length > 6) console.log(`       … +${i.series.length - 6}`);
      }
    }
    return;
  }
  if (arg('gaps')) {
    for (const lv of agg.levels) {
      console.log(`\n== ${LV(lv.level)}`);
      for (const s of lv.sections)
        for (const i of s.itemList) if (!i.series.length) console.log(`  ${s.title} › ${i.text}`);
    }
    return;
  }
  if (arg('unmapped')) {
    for (const s of agg.unmapped)
      console.log(`${s.key.padEnd(55)} ${s.title.padEnd(40)} ${s.best ? `${s.best.score} « ${s.best.item} »` : ''}`);
    console.log(`\n${agg.unmapped.length} series not mapped`);
    return;
  }

  console.log('Niveau  Séries  Rattachées  Items  Couverts');
  for (const lv of agg.levels)
    console.log(
      `${LV(lv.level).padEnd(7)} ${String(lv.series).padStart(6)}  ${String(lv.mapped).padStart(10)}  ${String(lv.items).padStart(5)}  ${String(lv.covered).padStart(4)} (${pct(lv.covered, lv.items)} %)`
    );
  console.log('');
  const head = `${'Thème'.padEnd(32)}${LEVELS.map((l) => LV(l).padStart(12)).join('')}`;
  console.log(head);
  for (const r of agg.strandGrid)
    console.log(
      `${r.label.padEnd(32)}${LEVELS.map((l) => {
        const c = r.cells[l];
        return (c.items ? `${c.covered}/${c.items} (${c.series})` : '·').padStart(12);
      }).join('')}`
    );
  for (const w of map.warnings) console.warn(`⚠ ${w}`);
  if (!arg('no-write')) console.log(`\n→ ${path.relative(ROOT, OUT_MD)}, ${path.relative(ROOT, OUT_JSON)}`);
}

main();
