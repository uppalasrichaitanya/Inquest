const { JSDOM } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync('dist/test.html', 'utf8').replace(/<link[^>]*>/g, '');
const errors = [];
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.test/', beforeParse(w) {
  w.addEventListener('error', (e) => errors.push('window error: ' + e.message));
  w.scrollTo = () => {};
  w.matchMedia = w.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {} }));
  if (process.env.FIRST_VISIT !== '1') w.localStorage.setItem('inq1:tutorial', '1');
  w.HTMLElement.prototype.scrollIntoView = () => {};
} });
const w = dom.window, d = w.document;
const $ = (s) => d.querySelector(s), $$ = (s) => [...d.querySelectorAll(s)];
const click = (el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, detail: 1 }));
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };

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

// the guided tutorial, start to finish, using only the coach's squares
w.eval('startTutorial()');
ok($('#coach') && /Welcome/.test($('#coach').textContent), 'tutorial opens with a welcome');
click($('[data-act="coach-next"]'));
const tapCell = (b, i, j) => { const c = $(`#grid .cell[data-b="${b}"][data-i="${i}"][data-j="${j}"]`); if (c) c.dispatchEvent(new w.MouseEvent('click', { bubbles: true, detail: 0 })); return c; };
tapCell('sr', 0, 0);
ok(w.eval('G.marks.sr[0][0]') === 0, 'tutorial blocks squares the coach is not pointing at');
let guard = 0;
while (w.eval('COACH.on') && guard++ < 40) {
  const st = w.eval('JSON.stringify(tutSteps()[COACH.step])');
  const step = JSON.parse(st);
  if (step.cell) { const [b, i, j, v] = step.cell; for (let k = 0; k < v; k++) tapCell(b, i, j); w.eval('clearTimeout(COACH.timer); coachNext()'); }
  else if (step.accuse) break;
  else click($('[data-act="coach-next"]'));
}
ok(w.eval('COACH.step') === w.eval('tutSteps().length - 1'), 'tutorial walks every step: ' + w.eval('COACH.step'));
ok($$('#plan .pin').length === 3 && $$('#plan .chip[data-v="4"]').length === 3, 'tutorial plan shows every person and weapon');
click($('[data-act="accuse"]'));
const ts = w.eval('G.puzzle.solution');
click($(`[data-pick="killer"][data-v="${ts.killer}"]`)); click($(`[data-pick="weapon"][data-v="${ts.weapon}"]`)); click($(`[data-pick="room"][data-v="${ts.room}"]`));
click($('#do-accuse'));
ok(/whole game/.test($('#scrim').textContent) && w.localStorage.getItem('inq1:tutorial') === '1', 'tutorial ends with a closed case and is remembered');
click($('[data-act="open-daily"][data-tier="constable"]'));
ok($('.case-head h1') && w.eval('G.puzzle.tier') === 'constable' && !$('#coach'), 'tutorial leads into the first Constable case');

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
