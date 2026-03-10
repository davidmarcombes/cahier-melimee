const fs = require('fs');
const html = fs.readFileSync('e:/Code/cahier-melimee/_site/fr/exercices/192e5f75/index.html', 'utf8');
const m = html.match(/x-data='seriesPlayer\(([\s\S]*?)\)'\s/);
if (m) {
  const payload = m[1];
  console.log('Payload chars:', payload.length);
  const data = JSON.parse(payload);
  console.log('Exercise count:', data.length);
  data.forEach((ex, i) => {
    const bodyLen = (ex.body || '').length;
    const keys = Object.keys(ex).join(',');
    console.log(`  [${i}] type=${ex.type}, body=${bodyLen}c, keys=${keys}`);
    if (ex.statements) console.log(`    statements: ${ex.statements.length}`);
    if (ex.choices) console.log(`    choices: ${ex.choices.length}`);
  });
} else {
  console.log('No match found');
}
