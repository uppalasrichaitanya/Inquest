// Gives every banked case its own title: node retitle.js (run it after adding cases to bank/).
// Titles are cosmetic, so this never touches a clue. Each case takes the next unused title from its
// setting's pool, in a fixed order, so running it twice gives the same bank.
const fs = require('fs');
const E = require('./dist/engine.js');
const tiers = ['constable', 'detective', 'inspector', 'mastermind'];
const used = new Set([E.TUTORIAL.ti]);
const next = Object.fromEntries(Object.keys(E.WORLDS).map((w) => [w, 0]));
let changed = 0;
for (const t of tiers) {
  const file = `${__dirname}/bank/${t}.json`, bank = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const spec of bank) {
    const pool = E.titlePool(spec.w);
    while (next[spec.w] < pool.length && used.has(pool[next[spec.w]])) next[spec.w]++;
    if (next[spec.w] >= pool.length) throw new Error(`out of ${spec.w} titles: add words to src/47-titles.js`);
    const ti = pool[next[spec.w]++];
    used.add(ti);
    if (spec.ti !== ti) { spec.ti = ti; changed++; }
  }
  fs.writeFileSync(file, JSON.stringify(bank));
}
console.log(`${used.size - 1} titles, ${changed} changed; left unused: ${Object.keys(next).map((w) => `${w} ${E.titlePool(w).length - next[w]}`).join(', ')}`);
