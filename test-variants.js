// Guards clue rewording (src/25-text.js). Banked cases store a variant index per clue, so for every clue type the
// number of evidence wordings ('note') and testimony wordings ('say', spoken by a suspect) must stay exactly as
// recorded in clue-variants.json. The wording itself may change freely.
//   node test-variants.js           check
//   node test-variants.js --update  re-record (only when a change of shape is intended AND the bank is re-mined)
//   node test-variants.js --wording re-record clue-wording.txt after rewording, then review its diff
// clue-wording.txt holds every variant written out with real names, in each setting, so a rewording shows as a diff.
// Testimony is written out twice: about someone else, and about the speaker ("I was in the Library").
// Also checks every shipped clue: its variant exists, and only testimony types have a speaker.
const fs = require('fs');
const E = require('./dist/engine.js');
const SNAP = __dirname + '/clue-variants.json';
const WORDS = __dirname + '/clue-wording.txt';

const shapes = {}, seen = {};
for (const w of Object.keys(E.WORLDS)) {
  const pick = [0, 1, 2, 3, 4];
  const ctx = E.buildCtx(E.WORLDS[w], pick, pick, pick, pick); // with motives, so every clue type turns up
  for (const c of E.enumerateClues(ctx)) {
    const say = E.TESTIMONY_TYPES.includes(c.type);
    if (!shapes[c.type]) shapes[c.type] = { note: E.clueVariants(c, ctx, null).length, say: say ? E.clueVariants(c, ctx, 4).length : 0 };
    if (seen[c.type + w]) continue;
    const lines = [];
    const put = (tag, sp) => E.clueVariants(c, ctx, sp).forEach(([voice, text], i) => {
      lines.push(`  ${w.padEnd(5)} ${i} ${tag.padEnd(9)} ${E.plainText(text, ctx)}`);
      const second = E.varyWording([{ text: 'a door or a stair' }, { text }])[1].text;
      if (second !== text) lines.push(`  ${w.padEnd(5)} ${i} ${tag.padEnd(9)} ${E.plainText(second, ctx)}   (every second such clue in a case)`);
    });
    put('note', null);
    if (say) {
      put('say', 4);
      const about = c.args.s !== undefined ? c.args.s : c.args.a;
      if (about !== undefined && c.type !== 'murderNotSuspect') put('say self', about);
    }
    seen[c.type + w] = lines;
  }
}
const now = Object.fromEntries(Object.keys(shapes).sort().map((k) => [k, shapes[k]]));
const wording = Object.keys(now).map((k) => [k, ...Object.keys(E.WORLDS).flatMap((w) => seen[k + w] || [])].join('\n')).join('\n\n') + '\n';
if (process.argv.includes('--wording')) { fs.writeFileSync(WORDS, wording); console.log('recorded clue-wording.txt: review it with git diff'); }

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
  if (!fs.existsSync(WORDS) || fs.readFileSync(WORDS, 'utf8').replace(/\r\n/g, '\n') !== wording) { console.log('WORDING CHANGED: run node test-variants.js --wording and review the diff of clue-wording.txt'); bad++; }
}

const shipped = [['tutorial', E.TUTORIAL]];
for (const f of fs.readdirSync(__dirname + '/bank').filter((f) => f.endsWith('.json'))) {
  for (const spec of JSON.parse(fs.readFileSync(__dirname + '/bank/' + f, 'utf8'))) shipped.push([f, spec]);
}
let clues = 0;
for (const [src, spec] of shipped) {
  for (const [type, , vi, speaker] of spec.c) {
    clues++;
    const shape = now[type], say = speaker !== null && speaker !== undefined;
    if (!shape || vi >= (say ? shape.say : shape.note)) { console.log('NO SUCH VARIANT', src, spec.s, type, vi, say ? 'say' : 'note'); bad++; }
  }
}
console.log(`shipped clues: ${clues} in ${shipped.length} cases checked`);
console.log(bad ? `\n${bad} PROBLEMS` : '\nall checks passed');
process.exit(bad ? 1 : 0);
