// Guards clue rewording (src/25-text.js). Banked cases store a variant index per clue, so for every clue type
// the number of variants and their voice ('say' = a witness speaks, 'note' = a case note) must stay exactly as
// recorded in clue-variants.json. The wording itself may change freely.
//   node test-variants.js           check
//   node test-variants.js --update  re-record (only when a change of shape is intended AND the bank is re-mined)
// Also checks every shipped clue: its variant exists, and it has a speaker exactly when its voice is 'say'.
const fs = require('fs');
const E = require('./dist/engine.js');
const SNAP = __dirname + '/clue-variants.json';

// one context per setting, so every clue type turns up (floors only exist in the manor, "ahead" only on the train)
const shapes = {};
for (const w of Object.keys(E.WORLDS)) {
  const pick = [0, 1, 2, 3, 4, 5];
  const ctx = E.buildCtx(E.WORLDS[w], pick, pick, pick);
  for (const c of E.enumerateClues(ctx)) {
    if (shapes[c.type]) continue;
    shapes[c.type] = E.clueVariants(c, ctx).map((v) => v[0]);
  }
}
const now = Object.fromEntries(Object.keys(shapes).sort().map((k) => [k, shapes[k]]));

let bad = 0;
if (process.argv.includes('--update') || !fs.existsSync(SNAP)) {
  fs.writeFileSync(SNAP, JSON.stringify(now, null, 1) + '\n');
  console.log('recorded', Object.keys(now).length, 'clue types to clue-variants.json');
} else {
  const was = JSON.parse(fs.readFileSync(SNAP, 'utf8'));
  for (const k of new Set([...Object.keys(was), ...Object.keys(now)])) {
    const a = JSON.stringify(was[k]), b = JSON.stringify(now[k]);
    if (a !== b) { console.log(`CHANGED ${k}: was ${a}, now ${b}`); bad++; }
  }
  console.log(`clue shapes: ${Object.keys(now).length} types compared with clue-variants.json`);
}

const shipped = [['tutorial', E.TUTORIAL]];
for (const f of fs.readdirSync(__dirname + '/bank').filter((f) => f.endsWith('.json'))) {
  for (const spec of JSON.parse(fs.readFileSync(__dirname + '/bank/' + f, 'utf8'))) shipped.push([f, spec]);
}
let clues = 0;
for (const [src, spec] of shipped) {
  for (const [type, , vi, speaker] of spec.c) {
    clues++;
    const voices = now[type];
    if (!voices || vi >= voices.length) { console.log('NO SUCH VARIANT', src, spec.s, type, vi); bad++; continue; }
    if ((voices[vi] === 'say') !== (speaker !== null)) { console.log('VOICE MISMATCH', src, spec.s, type, vi, voices[vi], speaker); bad++; }
  }
}
console.log(`shipped clues: ${clues} in ${shipped.length} cases checked`);
console.log(bad ? `\n${bad} PROBLEMS` : '\nall checks passed');
process.exit(bad ? 1 : 0);
