/**
 * Node entry point: every generator merged into one object (validator, unit tests, build).
 * Pages do not load it — they load _core.js + the modules they use (see generatorScripts in .eleventy.js).
 * Non-enumerable extras: moduleOf (generator name → module) and MODULES (load order).
 */
const MODULES = ['numeration', 'nombres', 'calcul', 'operations', 'fractions-decimaux', 'mesures', 'logique'];
const all = {};
const moduleOf = {};
for (const m of MODULES) {
  for (const [name, gen] of Object.entries(require(`./${m}.js`))) {
    if (name in all) throw new Error(`generator "${name}" defined in both ${moduleOf[name]}.js and ${m}.js`);
    all[name] = gen;
    moduleOf[name] = m;
  }
}
Object.defineProperty(all, 'moduleOf', { value: moduleOf, enumerable: false });
Object.defineProperty(all, 'MODULES', { value: MODULES, enumerable: false });
module.exports = all;
