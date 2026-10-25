let bad = 0;
const E = require('./dist/engine.js');
const { permutations } = E;
// the rules of a case: a statement from every suspect, true unless the speaker is the killer; evidence that is
// all true and all needed; and a lie that shows (taken at their word, the statements and evidence clash)
function checkCase(name, p, minimal) {
  const n = p.n, t = p.truth, { perms, inv } = permutations(n);
  const pwi = inv[perms.findIndex((x) => x.join() === t.pw.join())], pri = inv[perms.findIndex((x) => x.join() === t.pr.join())];
  const says = p.clues.filter((c) => c.speaker !== null), ev = p.clues.filter((c) => c.speaker === null);
  if (says.map((c) => c.speaker).sort().join() !== [...Array(n).keys()].join()) { console.log('NOT ONE STATEMENT EACH', name); bad++; }
  for (const c of says) if (E.statementTrue(c, t, pwi, pri) !== (c.speaker !== t.m)) { console.log('STATEMENT TRUTH WRONG', name, c.type, c.speaker); bad++; }
  for (const c of ev) if (!E.clueHolds(c, t, pwi, pri)) { console.log('FALSE EVIDENCE', name, c.type); bad++; }
  if (E.solveCount(p.ctx, says.map((c) => c.base).concat(ev), 0).count !== 0) { console.log('THE LIE DOES NOT SHOW', name); bad++; }
  for (const c of p.clues) {
    if (/undefined|NaN|\[object|\{/.test(E.plainText(c.text, p.ctx))) { console.log('BAD TEXT', name, c.text); bad++; }
    if ((c.voice === 'say') !== (c.speaker !== null)) { console.log('VOICE AND SPEAKER DISAGREE', name); bad++; }
  }
  if (minimal) for (const c of ev) {
    if (E.solveCount(p.ctx, p.clues.filter((x) => x !== c), 1).count === 1) { console.log('REDUNDANT EVIDENCE', name, c.type); bad++; }
  }
}
const N = +process.argv[2] || 40;
const tiers = ['constable', 'detective', 'inspector', 'mastermind'];
const N_FAST = { mastermind: Math.ceil(N / 4) }; // Sundays take longer to build
for (const tier of tiers) {
  const stats = { ms: [], clues: [], fam: {}, worlds: {}, types: {} };
  for (let i = 0; i < (N_FAST[tier] || N); i++) {
    const seed = 'test-' + i;
    const t0 = Date.now();
    let p;
    try { p = E.generatePuzzle(seed, tier); } catch (e) { console.log('FAIL gen', tier, seed, e.message); bad++; continue; }
    stats.ms.push(Date.now() - t0);
    stats.clues.push(p.clues.length);
    stats.worlds[p.worldId] = (stats.worlds[p.worldId] || 0) + 1;
    // independent checks: one whole world, and it is the hidden truth
    const r = E.solveCount(p.ctx, p.clues);
    const t = p.truth;
    if (r.count !== 1) { console.log('NOT UNIQUE', tier, seed, r.count); bad++; }
    else if (r.worlds[0].m !== t.m || r.worlds[0].pw.join() !== t.pw.join() || r.worlds[0].pr.join() !== t.pr.join()) { console.log('WRONG ANSWER', tier, seed); bad++; }
    checkCase(tier + ' ' + seed, p, true);
    for (const c of p.clues) {
      stats.fam[c.family] = (stats.fam[c.family] || 0) + 1;
      stats.types[c.type] = (stats.types[c.type] || 0) + 1;
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
  if (r.count !== 1 || r.worlds[0].m !== spec.m || r.worlds[0].pw.join() !== spec.pw.join() || r.worlds[0].pr.join() !== spec.pr.join()) { console.log('BANK CASE WRONG', src, spec.s, r.count); bad++; }
  checkCase(src + ' ' + spec.s, p, src === 'tutorial' || checked % 10 === 0); // minimality is slower; sample the bank, always check the tutorial
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
// "next to" in the house: the two phrasings take turns, so no two such clues in a row read the same
let doorCases = 0;
for (const [src, spec] of shipped) {
  const said = E.importPuzzle(spec).clues.map((c) => (/door or (a |one )?stair/.test(c.text) ? 'door' : /doorway or (a |one )?flight of stairs/.test(c.text) ? 'flight' : null)).filter(Boolean);
  if (said.length > 1) doorCases++;
  if (said.some((x, i) => i > 0 && x === said[i - 1]) || (said.length && said[0] !== 'door')) { console.log('DOOR WORDING REPEATS', src, spec.s, said.join(' ')); bad++; }
}
console.log(`== "door or stair": alternates in all ${doorCases} cases with more than one such clue`);
console.log(bad ? `\n${bad} PROBLEMS` : '\nall checks passed');
process.exit(bad ? 1 : 0);
