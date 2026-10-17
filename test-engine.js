const E = require('./dist/engine.js');
const N = +process.argv[2] || 40;
const tiers = ['constable', 'detective', 'inspector', 'mastermind'];
let bad = 0;
for (const tier of tiers) {
  const stats = { ms: [], clues: [], fam: {}, worlds: {}, types: {} };
  for (let i = 0; i < N; i++) {
    const seed = 'test-' + i;
    const t0 = Date.now();
    let p;
    try { p = E.generatePuzzle(seed, tier); } catch (e) { console.log('FAIL gen', tier, seed, e.message); bad++; continue; }
    stats.ms.push(Date.now() - t0);
    stats.clues.push(p.clues.length);
    stats.worlds[p.worldId] = (stats.worlds[p.worldId] || 0) + 1;
    // independent checks
    const r = E.solveCount(p.ctx, p.clues);
    if (r.count !== 1) { console.log('NOT UNIQUE', tier, seed, r.count); bad++; }
    else if (r.answers[0].killer !== p.solution.killer || r.answers[0].weapon !== p.solution.weapon || r.answers[0].room !== p.solution.room) {
      console.log('WRONG ANSWER', tier, seed); bad++;
    }
    for (const c of p.clues) {
      stats.fam[c.family] = (stats.fam[c.family] || 0) + 1;
      stats.types[c.type] = (stats.types[c.type] || 0) + 1;
      if (/undefined|NaN|\[object/.test(E.plainText(c.text, p.ctx))) { console.log('BAD TEXT', c.text); bad++; }
      if (c.voice === 'say' && c.speaker === null) { console.log('NO SPEAKER', seed); bad++; }
    }
    // minimality: dropping any clue must break uniqueness
    for (let k = 0; k < p.clues.length; k++) {
      const rest = p.clues.filter((_, j) => j !== k);
      if (E.solveCount(p.ctx, rest, 1).count === 1) { console.log('REDUNDANT CLUE', tier, seed, p.clues[k].type); bad++; }
    }
    // determinism
    if (i < 3) {
      const q = E.generatePuzzle(seed, tier);
      if (JSON.stringify(q.solution) !== JSON.stringify(p.solution) || q.clues.length !== p.clues.length) { console.log('NOT DETERMINISTIC', seed); bad++; }
    }
  }
  const avg = (a) => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1);
  console.log(`\n== ${tier}: ${stats.ms.length} cases | avg ${avg(stats.ms)}ms max ${Math.max(...stats.ms)}ms | clues avg ${avg(stats.clues)} [${Math.min(...stats.clues)}-${Math.max(...stats.clues)}]`);
  console.log('   worlds', JSON.stringify(stats.worlds), '\n   families', JSON.stringify(stats.fam));
  console.log('   types', Object.entries(stats.types).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ':' + v).join(' '));
}
// the hand-made tutorial and every shipped case: imports cleanly, one answer, the stored answer, no spare clue
const fs = require('fs');
const shipped = [['tutorial', E.TUTORIAL]];
for (const f of fs.readdirSync(__dirname + '/bank').filter((f) => f.endsWith('.json'))) {
  for (const spec of JSON.parse(fs.readFileSync(__dirname + '/bank/' + f, 'utf8'))) shipped.push([f, spec]);
}
let checked = 0;
for (const [src, spec] of shipped) {
  let p;
  try { p = E.importPuzzle(spec); } catch (e) { console.log('IMPORT FAIL', src, spec.s, e.message); bad++; continue; }
  const r = E.solveCount(p.ctx, p.clues);
  if (r.count !== 1 || r.answers[0].killer !== p.solution.killer || r.answers[0].weapon !== p.solution.weapon || r.answers[0].room !== p.solution.room) { console.log('BANK CASE WRONG', src, spec.s, r.count); bad++; }
  for (const c of p.clues) if (/undefined|NaN|\[object/.test(E.plainText(c.text, p.ctx))) { console.log('BAD TEXT', src, c.text); bad++; }
  if (src === 'tutorial' || checked % 10 === 0) { // minimality is slower; sample the bank, always check the tutorial
    for (let k = 0; k < p.clues.length; k++) {
      if (E.solveCount(p.ctx, p.clues.filter((_, j) => j !== k), 1).count === 1) { console.log('REDUNDANT CLUE', src, spec.s, p.clues[k].type); bad++; }
    }
  }
  checked++;
}
console.log(`\n== shipped: ${checked} cases checked (tutorial + bank)`);
// titles: every shipped case has its own, and none gives away the killer, the weapon or the room
const seen = new Map(), words = (s) => String(s).replace(/&shy;/g, '').toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 3);
for (const [src, spec] of shipped) {
  if (!spec.ti) { console.log('NO TITLE', src, spec.s); bad++; continue; }
  if (seen.has(spec.ti)) { console.log('TITLE REPEATED', JSON.stringify(spec.ti), seen.get(spec.ti), 'and', spec.s); bad++; }
  seen.set(spec.ti, spec.s);
  const p = E.importPuzzle(spec), k = p.ctx.suspects[p.solution.killer], w = p.ctx.weapons[p.solution.weapon], r = p.ctx.rooms[p.solution.room];
  const answer = new Set(words(`${k.name} ${k.short} ${k.role} ${w.name} ${w.short} ${w.note} ${w.type} ${r.name} ${r.short}`));
  const hit = words(spec.ti).find((x) => answer.has(x) || answer.has(x + 's') || answer.has(x.replace(/s$/, '')));
  if (hit || E.titleClash(spec.w, spec.ti)) { console.log('TITLE HINTS', src, spec.s, JSON.stringify(spec.ti), hit || E.titleClash(spec.w, spec.ti)); bad++; }
}
console.log(`== titles: ${seen.size} distinct across ${shipped.length} cases, none naming the answer`);
console.log(bad ? `\n${bad} PROBLEMS` : '\nall checks passed');
process.exit(bad ? 1 : 0);
