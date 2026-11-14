/**
 * programme.js — parse the programme reference docs (docs/maths_<level>.md) into
 * domain → section → item, and tag each section with a cross-level « strand »
 * (numération, fractions, géométrie…) so levels can be compared side by side.
 *
 * CP → CM2 docs: `## Domain`, `### Section`, `- item`. The « Programme 202x — compléments »
 * h2 holds sections from every domain: their domain comes from the section heading.
 * GS doc: `## Content to do — <Section>` with `- [✓|_] item (`series-slug`, …)` lines;
 * the backticked slugs are explicit links to series.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const LEVELS = ['gs', 'cp', 'ce1', 'ce2', 'cm1', 'cm2'];

const DOMAINS = {
  NC: 'Nombres et calculs',
  GM: 'Grandeurs et mesures',
  EG: 'Espace et géométrie',
  OD: 'Données et probabilités',
};

/** Sections whose items span several strands. */
const BROAD_SECTION = /^(grandeurs et mesures|espace et géométrie|les quatre opérations)/i;

/** Sections that are notes, not programme content. */
const SKIP_SECTION =
  /écarts avec la liste|tableau de progression|schémas de représentation|leviers de différenciation/i;

/**
 * Strands: first regex matching the section heading wins (then the item text, for broad
 * headings such as « Grandeurs et mesures » in the compléments). Order matters.
 */
const STRANDS = [
  ['problemes', 'Résolution de problèmes', /problème/i],
  ['donnees', 'Données, probabilités', /données|probabilit|hasard/i],
  ['algebre', 'Algèbre, suites, motifs', /algèbre|suite|motif|dessins|pensée informatique|régularit/i],
  ['fractions', 'Fractions', /fraction/i],
  ['monnaie', 'Monnaie', /monnaie|euro/i],
  ['decimaux', 'Nombres décimaux', /décima/i],
  ['proportion', 'Proportionnalité', /proportion|pourcentage|échelle/i],
  ['mental', 'Calcul mental, tables', /calcul mental|tables? d|astuces|faits/i],
  ['addsub', 'Addition, soustraction', /addition|soustraction|soustration/i],
  ['multdiv', 'Multiplication, division', /multipli|division|quatre opérations|ordre de grandeur/i],
  ['numeration', 'Numération (entiers)', /nombre|compter|décompos|comparer et ranger|quantit|rang et position/i],
  ['temps', 'Temps, durées', /temps|heure|durée|date|calendrier/i],
  ['aires', 'Périmètres, aires, volumes', /périmètre|aire|volume/i],
  ['mesures', 'Longueurs, masses, contenances', /longueur|masse|contenance|température|grandeur/i],
  ['angles', 'Angles, droites', /angle|droite|perpendic|parallèl/i],
  ['figures', 'Figures, solides', /figure|solide|forme|géométrie plane|polygone|cercle/i],
  ['reperage', 'Repérage, symétrie', /repér|quadrillage|symétrie|espace|déplacement|plan/i],
  ['couleurs', 'Couleurs (GS)', /couleur/i],
];

function strandOf(...texts) {
  for (const t of texts) {
    for (const [key, label, re] of STRANDS) if (re.test(t)) return { key, label };
  }
  return { key: 'autre', label: 'Autre' };
}

function domainOfSection(h2, h3, items) {
  const t = `${h3} ${items.join(' ')}`;
  if (/données|probabilit/i.test(h3)) return 'OD';
  if (/compléments/i.test(h2) || /content to do/i.test(h2)) {
    if (
      /grandeur|mesure|longueur|masse|contenance|monnaie|heure|durée|temps|aire|périmètre|volume|température/i.test(h3)
    )
      return 'GM';
    if (/espace|géométrie|figure|solide|forme|symétrie|repér|angle|droite|informatique/i.test(h3)) return 'EG';
    if (/grandeur/i.test(h3) || /longueur|masse/i.test(t.slice(0, 80))) return 'GM';
    return 'NC';
  }
  if (/grandeurs/i.test(h2)) return 'GM';
  if (/espace|géométrie/i.test(h2)) return 'EG';
  return 'NC';
}

const slugify = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);

/** Words in backticks that are not series slugs (types, difficulties, generators…). */
const NOT_SLUG = /^(facile|moyen|difficile|[a-z]+[A-Z]\w*)$/;

function parseLevel(level) {
  const file = path.join(ROOT, 'docs', `maths_${level}.md`);
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const sections = [];
  let h2 = '';
  let cur = null;
  const gs = level === 'gs';

  const open = (title) => {
    cur = { title, h2, items: [] };
    sections.push(cur);
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith('## ')) {
      h2 = line.slice(3).trim();
      cur = null;
      if (gs) {
        const m = h2.match(/^Content to do — (.+)$/);
        if (m) open(m[1].trim());
      }
      continue;
    }
    if (!gs && line.startsWith('### ')) {
      open(line.slice(4).trim());
      continue;
    }
    if (!cur || !/^- /.test(line)) continue;
    let text = line.slice(2).trim();
    let status = null;
    const st = text.match(/^\[(✓|_|x| )\]\s*/);
    if (st) {
      status = st[1] === '✓' || st[1] === 'x' ? 'done' : 'todo';
      text = text.slice(st[0].length);
    }
    const st2 = text.match(/^\[~\]\s*/);
    if (st2) {
      status = 'partial';
      text = text.slice(st2[0].length);
    }
    // `-02` after `montre-moi-01` is shorthand for `montre-moi-02`
    const links = [];
    if (gs)
      for (const [, s] of text.matchAll(/`([a-z0-9-]+)`/g)) {
        if (NOT_SLUG.test(s)) continue;
        const prev = links[links.length - 1];
        links.push(/^-\d+$/.test(s) && prev ? prev.replace(/-\d+$/, s) : s);
      }
    cur.items.push({ text, status, links });
  }

  const out = [];
  const seen = new Set();
  for (const s of sections) {
    if (SKIP_SECTION.test(s.title) || s.items.length === 0) continue;
    const domain = domainOfSection(
      s.h2,
      s.title,
      s.items.map((i) => i.text)
    );
    const strand = strandOf(s.title, s.items.map((i) => i.text).join(' '));
    const complement = /compléments/i.test(s.h2);
    let sectionId = `${level}:${slugify(s.title)}${complement ? '-2' : ''}`;
    while (seen.has(sectionId)) sectionId += '+';
    seen.add(sectionId);
    out.push({
      id: sectionId,
      level,
      title: s.title,
      complement,
      domain,
      strand: strand.key,
      strandLabel: strand.label,
      items: s.items.map((it, i) => {
        // Broad sections mix strands: each item gets its own
        const st = BROAD_SECTION.test(s.title) ? strandOf(it.text, s.title) : strand;
        return { ...it, id: `${sectionId}#${i + 1}`, strand: st.key };
      }),
    });
  }
  return out;
}

function loadProgramme(levels = LEVELS) {
  return Object.fromEntries(levels.map((l) => [l, parseLevel(l)]));
}

module.exports = { LEVELS, DOMAINS, STRANDS, loadProgramme };
