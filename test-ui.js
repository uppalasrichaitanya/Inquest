const { JSDOM } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync('dist/test.html', 'utf8').replace(/<link[^>]*>/g, '');
const errors = [];
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
// a fresh page; seeded = someone who has already done the warm-up
function page(seeded) {
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.test/', beforeParse(w) {
    w.addEventListener('error', (e) => errors.push('window error: ' + e.message));
    w.scrollTo = () => {};
    w.matchMedia = w.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {} }));
    if (seeded) w.localStorage.setItem('inq1:tutorial', '1');
    w.HTMLElement.prototype.scrollIntoView = () => {};
  } });
  const w = dom.window, d = w.document;
  return { w, d, $: (s) => d.querySelector(s), $$: (s) => [...d.querySelectorAll(s)], click: (el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, detail: 1 })) };
}

// ---- a first visit, from empty storage: the warm-up opens by itself and is played to the end
{
  const { w, $, $$, click } = page(false);
  ok(w.localStorage.length === 0 || !w.localStorage.getItem('inq1:tutorial'), 'first visit starts with nothing stored');
  ok($('.warm-head') && w.eval('G.mode') === 'tutorial', 'a first visit opens the warm-up');
  ok($$('.rules3 li').length === 3 && $$('.rules3 li .pic').length === 3, 'three rules, each with a picture');
  ok($('.stmt.on .try') && /Try it/.test($('.stmt.on .try').textContent), 'the statement in hand says what to try');
  ok(!$('#coach') && !$('.coach'), 'no coach card over the notebook');
  ok($('.bar .accuse').getAttribute('aria-disabled') === 'true', '"Name the killer" waits for an answer');
  click($('.bar .accuse'));
  ok(!$('#scrim') && /Not yet/.test($('.wnote').textContent), 'pressed too soon, it says why, inline');
  const tap = (b, i, j) => { const c = $(`#grid .cell[data-b="${b}"][data-i="${i}"][data-j="${j}"]`); c.dispatchEvent(new w.MouseEvent('click', { bubbles: true, detail: 0 })); return c; };
  const note = () => $('.wnote').textContent;
  // a mark nothing proves stays in pencil, has no effect, and Undo takes it back
  const p = tap('sw', 0, 0);
  ok(p.dataset.v === '1' && p.dataset.p === '1' && /pencil/.test(note()), 'an unproven mark stays in pencil: ' + note());
  ok($('#grid .cell[data-b="sw"][data-i="0"][data-j="1"]').dataset.v === '0', 'and nothing follows from it');
  click($('[data-act="undo"]'));
  ok(w.eval('G.marks.sw[0][0]') === 0 && p.dataset.v === '0', 'Undo takes it back');
  // the right mark lands in ink with its reason, and ticks the statement
  const c = tap('sw', 0, 1);
  ok(c.dataset.v === '1' && c.dataset.p === '0' && /Statement 1 says/.test(note()), 'a proven mark lands in ink: ' + note());
  ok(w.eval('G.struck.includes(0)'), 'and ticks off the statement it used');
  tap('sw', 0, 1);
  ok(c.dataset.p === '1' && /says otherwise/.test(note()), 'circling a ruled-out pair is pencilled, with the statement that says otherwise');
  click($('[data-act="undo"]'));
  ok(c.dataset.v === '1' && c.dataset.p === '0', 'Undo restores the cross');
  // statement 2: a match, and the faint crosses explained once
  click($$('.stmt .say')[1]);
  tap('sr', 2, 0); tap('sr', 2, 0);
  ok(/A circle means a match/.test(note()) && /faint crosses/.test(note()), 'circle explained, and the faint crosses named: ' + note());
  ok($('#grid .cell[data-b="sr"][data-i="0"][data-j="0"]').dataset.v === '3', 'the rest of the column is crossed faintly');
  // a true guess made too early is pencil, then ink once the statement that proves it is read
  const early = tap('sr', 1, 1); tap('sr', 1, 1);
  ok(early.dataset.p === '1', 'a right guess made too early is still pencil');
  click($$('.stmt .say')[2]);
  ok(early.dataset.p === '0' && early.dataset.v === '2', 'it turns to ink once statement 3 proves it');
  tap('sr', 1, 2); tap('sr', 0, 2); tap('sr', 0, 2);
  click($$('.stmt .say')[3]);
  for (const [i, j] of [[2, 0], [0, 2], [1, 1]]) { tap('sw', i, j); tap('sw', i, j); }
  ok(/weapon that/.test(note()), 'the last weapon, explained: ' + note());
  click($$('.stmt .say')[4]);
  ok($('.bar .accuse').getAttribute('aria-disabled') === 'true', 'still waiting until the killer is marked');
  tap('k', 1, 0); tap('k', 1, 0);
  ok($('.bar .accuse').getAttribute('aria-disabled') === 'false' && /has its answer/.test(note()), 'the answer wakes the button: ' + note());
  ok(!$$('#grid .cell').some((x) => x.dataset.p === '1'), 'no pencil left');
  click($('.bar .accuse'));
  const ts = w.eval('G.puzzle.solution');
  for (const [k, v] of [['killer', ts.killer], ['weapon', ts.weapon], ['room', ts.room]]) click($(`[data-pick="${k}"][data-v="${v}"]`));
  click($('#do-accuse'));
  ok(/whole game/.test($('#scrim').textContent) && w.localStorage.getItem('inq1:tutorial') === '1', 'the warm-up ends warmly and is remembered');
  click($('#scrim [data-act="home"]'));
  ok($$('.case-row').length === 4 && !$('.warm-head'), 'then home lists the cases, and the warm-up does not come back');
  click($('[data-act="tutorial"]'));
  ok($('.warm-head') && w.eval('G.marks.sw[0][1]') === 0, 'the warm-up can be replayed, fresh');
  click($('[data-act="warm-skip"]'));
  ok($('.home h1'), 'and skipped');
}

// ---- a returning player
const { w, d, $, $$, click } = page(true);
ok($('.bar .mark') && $('.bar .mark').textContent === 'Inquest', 'home renders');
ok($$('.case-row').length === 4, 'four cases listed');
ok(/Exactly one answer/.test($('.home h1').textContent), 'home says what the game is');
click($$('.case-row')[1]);
ok($('.case-head h1'), 'case opens: ' + ($('.case-head h1') || {}).textContent);
const n = w.eval('G.puzzle.n'), ctx = w.eval('G.puzzle.ctx');
const key = (el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, detail: 0 }));
const cell = (sel) => $('#grid .cell' + sel);
ok($$('.stmt').length === w.eval('G.puzzle.clues.length'), 'statements rendered: ' + $$('.stmt').length);
ok($('#strip .txt') && $('#strip .txt').innerHTML === $('.stmt .txt').innerHTML, 'the strip holds the first statement');
ok($$('#grid .cell').length === 2 * n * n + n, `one notebook: weapons, rooms and "Did it?" (${$$('#grid .cell').length} squares)`);
ok($$('#grid .grp').length >= 3 && $$('#grid .grp span').length === $$('#grid .grp').length, 'column groups carry their own rule: ' + $$('#grid .grp').map((g) => g.textContent).join(', '));
ok($$('#plan .room').length === n && $$('#plan .chip').length === n * n, 'plan draws the rooms in play, each with its weapons');
ok($$('#plan .door').length === ctx.adj.flat().filter(Boolean).length / 2, 'one doorway or stair per pair of rooms next to each other');
ok($$('.tk').length > 0, 'names in the statements are marked up');
ok($$('.hl').length > 0, 'the statement in hand lights up what it mentions');
// statements: use, step, pick
click($('.stmt .use')); ok(w.eval('G.struck.includes(0)') && $('.stmt.used'), 'a statement can be ticked off');
click($('.stmt .use')); ok(!w.eval('G.struck.includes(0)'), 'and ticked back on');
click($('[data-act="stmt-step"][data-d="1"]')); ok(w.eval('G.cur') === 1 && /2 of/.test($('#strip .count').textContent), 'next statement');
click($$('.stmt .say')[0]); ok(w.eval('G.cur') === 0 && $$('.stmt')[0].classList.contains('on'), 'picking a statement puts it in hand');
click($('[data-act="all-stmts"]')); ok($$('#scrim .allstmts li').length === w.eval('G.puzzle.clues.length'), 'all statements open in a sheet');
click($$('#scrim .pickrow')[2]); ok(w.eval('G.cur') === 2 && !$('#scrim'), 'choosing one there closes the sheet');
click($('[data-act="nbtab"][data-tab="sr"]')); ok($('#nb').dataset.tab === 'sr', 'phone tab turns to rooms');
// marks
const c0 = cell('[data-b="sw"][data-i="0"][data-j="0"]');
key(c0); ok(c0.dataset.v === '1' && /ruled out/.test(c0.getAttribute('aria-label')), 'cell: first press crosses out');
key(c0); ok(c0.dataset.v === '2', 'cell: second press circles');
ok(cell('[data-b="sw"][data-i="0"][data-j="1"]').dataset.v === '3', 'a circle crosses the rest of its row, faintly');
ok(cell('[data-b="sw"][data-i="1"][data-j="0"]').dataset.v === '3', 'and the rest of its column');
ok(!$('#plan .pin'), 'no one on the plan yet');
const c1 = cell('[data-b="sr"][data-i="0"][data-j="0"]');
key(c1); key(c1);
ok($$('#plan .pin').length === 1, 'circling a room puts the person on the plan');
ok($('#plan .chip[data-i="0"][data-j="0"]').dataset.v === '4', "a person's weapon and room together place the weapon on the plan");
const k1 = cell('[data-b="k"][data-i="1"]');
key(k1); key(k1); ok(cell('[data-b="k"][data-i="2"]').dataset.v === '3', 'naming one killer rules out the others');
key(k1);
// the plan: a room opens its weapons at full size; the table fallback holds the same marks
click($('#plan .room[data-room="1"] .floorspace'));
ok($$('#scrim .wr-list .cell').length === n, 'a room opens its weapons in a sheet');
const sheetCell = $('#scrim .wr-list .cell[data-i="2"]');
key(sheetCell); ok(w.eval('G.marks.wr[2][1]') === 1 && $('#plan .chip[data-i="2"][data-j="1"]').dataset.v === '1', 'marking in the sheet marks the plan');
click($('#scrim [data-act="close"]'));
click($('[data-act="wrview"]'));
ok($$('#plan table.wr .cell').length === n * n && $('#plan table.wr .cell[data-i="2"][data-j="1"]').dataset.v === '1', 'show as a table: the same marks, rooms by weapons');
ok(w.localStorage.getItem('inq1:wrview') === '"table"' || w.localStorage.getItem('inq1:wrview') === 'table', 'the choice is remembered');
click($('[data-act="wrview"]')); ok($('#plan svg'), 'and back to the plan');
// undo and clear all
{
  const u = cell('[data-b="sw"][data-i="2"][data-j="2"]');
  key(u);
  ok(u.dataset.v === '1' && !$('[data-act="undo"]').disabled, 'a mark, and Undo is ready');
  click($('[data-act="undo"]'));
  ok(u.dataset.v === '0', 'Undo clears a mistap in one press');
  const before = w.eval('JSON.stringify(G.marks)');
  click($('[data-act="clear"]'));
  ok(w.eval('[...G.marks.sw, ...G.marks.sr, ...G.marks.wr, [G.marks.k]].flat(2).every((v) => !v)'), 'Clear all empties the notebook');
  click($('[data-act="undo"]'));
  ok(w.eval('JSON.stringify(G.marks)') === before, 'and Undo brings every mark back');
  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }));
  ok(w.eval('JSON.stringify(G.marks)') !== before, 'Ctrl+Z undoes too');
  click($('[data-act="undo"]')); // nothing left to undo from before Clear all is fine either way
}
// a statement about the half of the notebook that is not showing puts a cue on its tab
{
  click($('[data-act="nbtab"][data-tab="sw"]'));
  const ri = w.eval('G.puzzle.clues.findIndex((c) => { const f = clueFocus(c); return (f.r.length || f.floor !== null) && !f.w.length && !f.kind; })');
  ok(ri >= 0, 'the case has a statement about rooms only: ' + ri);
  if (ri >= 0) {
    click($$('.stmt .say')[ri]);
    ok($('[data-act="nbtab"][data-tab="sr"]').classList.contains('has-cue') && !$('[data-act="nbtab"][data-tab="sw"]').classList.contains('has-cue'), 'a room statement cues the Rooms tab');
    click($('[data-act="nbtab"][data-tab="sr"]'));
    ok(!$('[data-act="nbtab"][data-tab="sr"]').classList.contains('has-cue'), 'and the cue goes once it is open');
  }
  click($$('.stmt .say')[0]);
}
// hint
click($('[data-act="hint"]'));
ok($('#scrim .hintbox'), 'hint opens: ' + ($('#scrim .hintbox') || {}).textContent);
click($('[data-act="hint-more"]')); ok(/crossed it out|cleared that square/.test($('#hintbox').textContent), 'hint spells out: ' + $('#hintbox').textContent);
click($('#scrim [data-act="close"]'));
ok(w.eval('G.hints') >= 2, 'hints counted: ' + w.eval('G.hints'));
// wrong accusation
click($('[data-act="accuse"]'));
const sol = w.eval('G.puzzle.solution');
const pick = (k, v) => click($(`[data-pick="${k}"][data-v="${v}"]`));
pick('killer', (sol.killer + 1) % n); pick('weapon', sol.weapon); pick('room', sol.room);
ok(!$('#do-accuse').disabled, 'accuse enabled once three are picked');
click($('#do-accuse'));
ok(/Not quite/.test($('#accuse-result').textContent) && /statement/.test($('#accuse-result').textContent), 'wrong accusation: ' + $('#accuse-result').textContent.replace(/\s+/g, ' '));
ok(w.eval('G.wrong') === 1, 'wrong counted');
pick('killer', (sol.killer + 1) % n); pick('killer', sol.killer);
click($('#do-accuse'));
ok($('.verdict .closed') && /Case closed/.test($('.verdict').textContent), 'right accusation closes the case');
ok(/Closed in/.test($('#share').textContent), 'share text: ' + $('#share').textContent.replace(/\n/g, ' | '));
click($('[data-act="home"]'));
ok($('.home h1'), 'back home'); ok(/Closed/.test($$('.case-row')[1].textContent), 'case row shows it is closed');
const st = w.eval("JSON.stringify(LS.get('inq1:stats',{}))"); ok(/"streak":1/.test(st), 'streak recorded ' + st);

// a circle the statements rule out is caught by the hint
w.eval(`newGame(BANK.constable[0], 'random'); renderCase();`);
{
  const sol = w.eval('G.puzzle.solution'), m = w.eval('G.puzzle.n');
  w.eval(`G.marks.sw[${sol.killer}][${(sol.weapon + 1) % m}] = 2`);
  const h = w.eval('nextHint()');
  ok(h.type === 'mistake' && h.b === 'sw', 'wrong circle on the killer is flagged as a mistake: ' + h.type);
}

// every banked case: hints never throw, and following hints to the end leaves the answer settled
let bad = 0;
for (const t of ['constable', 'detective', 'inspector', 'mastermind']) {
  const len = w.eval(`BANK.${t}.length`);
  for (let i = 0; i < len; i += 7) {
    try {
      w.eval(`newGame(BANK.${t}[${i}], 'random')`);
      let guard = 0;
      while (guard++ < 80) {
        const h = w.eval('nextHint()');
        if (h.type === 'ready') break;
        w.eval(`G.marks['${h.b}'][${h.i}][${h.j}] = 1`);
      }
      const h = w.eval('nextHint()');
      if (h.type !== 'ready' || guard >= 80) { bad++; console.log('hint chain did not finish', t, i, guard); }
    } catch (e) { bad++; console.log('hint error', t, i, e.message); }
  }
}
ok(bad === 0, 'hint chains finish on sampled cases');
ok(errors.length === 0, 'no page errors ' + errors.join(';'));
console.log(fails ? fails + ' FAILED' : 'all UI checks passed');
process.exit(fails ? 1 : 0);
