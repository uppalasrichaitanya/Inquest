// Offline: node mine.js <tier> <count> <startIndex> <out.json>
// Keeps only cases that meet the tier's difficulty profile strictly, with a spread of settings.
const fs = require('fs');
const E = require('./dist/engine.js');
const [tier, count, start, out] = [process.argv[2], +process.argv[3], +process.argv[4] || 0, process.argv[5]];
const bank = [];
let i = start, rejected = 0;
const t0 = Date.now();
while (bank.length < count) {
  const seed = `bank-${tier}-${i++}`;
  const p = E.generatePuzzle(seed, tier, { maxTries: 200 });
  if (!p.strict) { rejected++; continue; }
  // double check with the exhaustive solver before it ever ships
  const r = E.solveCount(p.ctx, p.clues);
  if (r.count !== 1) throw new Error('not unique: ' + seed);
  bank.push(E.exportPuzzle(p));
  if (bank.length % 10 === 0) { console.log(tier, bank.length, 'kept', rejected, 'rejected', ((Date.now() - t0) / 1000).toFixed(0) + 's'); fs.writeFileSync(out, JSON.stringify(bank)); }
}
fs.writeFileSync(out, JSON.stringify(bank));
console.log('done', tier, bank.length, ((Date.now() - t0) / 1000).toFixed(0) + 's');
