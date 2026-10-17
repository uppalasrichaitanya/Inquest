// INQ_TZ=Area/City runs the whole test in that time zone (the TZ variable itself is ignored on Windows)
if (process.env.INQ_TZ) process.env.TZ = process.env.INQ_TZ;
const { JSDOM } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync('dist/test.html', 'utf8').replace(/<link[^>]*>/g, '');
const errors = [];
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
// a fresh page; seeded = someone who has already done the warm-up. The clock is fixed at
// Tuesday 3 November 2026 (case No. 20), so the daily case and the archive are the same on every run.
const NOW = new Date(2026, 10, 3, 9, 30).getTime();
function page(seeded) {
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.test/', beforeParse(w) {
    w.addEventListener('error', (e) => errors.push('window error: ' + e.message));
    w.scrollTo = () => {};
    w.scrollBy = () => {};
    const Real = w.Date;
    w.Date = class extends Real { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
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
  click($('[data-act="warm-fold"]'));
  ok($('.warm-head.folded') && !$('.case-head .rules3'), '"Got it" folds the rules away');
  click($('.warm-fold [data-act="how"]'));
  ok($$('#scrim .rules3 li').length === 3, 'the rules stay in How to play');
  click($('#scrim [data-act="close"]'));
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
  click($('#scrim [data-act="gentle"]'));
  ok(w.eval('G.mode') === 'archive' && w.eval('G.day') === 19 && w.eval('G.puzzle.tier') === 'constable', 'then a gentle first case: last Monday, No. 19');
  click($('.bar .mark'));
  ok($('.today-case') && !$('.warm-head'), 'home shows today, and the warm-up does not come back');
  ok($('.gentle') && /Monday 2 November/.test($('.gentle').textContent), 'someone new is pointed at Monday: ' + $('.gentle').textContent.trim());
  click($('[data-act="tutorial"]'));
  ok($('.warm-head') && $('.case-head .rules3') && w.eval('G.marks.sw[0][1]') === 0, 'the warm-up can be replayed, fresh, rules open');
  $('#grid .cell[data-b="sw"][data-i="0"][data-j="1"]').dispatchEvent(new w.MouseEvent('click', { bubbles: true, detail: 0 }));
  ok($('.warm-head.folded'), 'the first mark folds the rules too');
  click($('[data-act="warm-skip"]'));
  ok($('.home h1'), 'and skipped');
}

// ---- a returning player
const { w, d, $, $$, click } = page(true);
ok($('.bar .mark') && $('.bar .mark').textContent === 'Inquest', 'home renders');
// the daily mapping: a week across a month boundary and the October clock change (Sunday 25 October to Monday 2 November)
{
  const seq = JSON.parse(w.eval(`JSON.stringify([...Array(9).keys()].map((k) => { const n = dayNumber(new Date(2026, 9, 25 + k)); const D = dailyFor(n); return [n, D.tier[0], D.idx, dateOfDay(n).getDate()]; }))`));
  ok(seq.map((x) => x[0]).join() === '11,12,13,14,15,16,17,18,19', 'case numbers run on by one a day, across the clock change and into November: ' + seq.map((x) => x[0]).join());
  ok(seq.map((x) => x[3]).join() === '25,26,27,28,29,30,31,1,2', 'and map back to their dates');
  ok(seq.map((x) => x[1] + x[2]).join() === 'm1,c1,d2,d3,i6,i7,i8,m2,c2', 'Sunday hardest, Monday gentlest, each kind of day takes the next case of its tier: ' + seq.map((x) => x[1] + x[2]).join());
  ok(w.eval('dayNumber(new Date(2026, 9, 15))') === 1 && w.eval('weekdayOf(1)') === 4, 'No. 1 is Thursday 15 October');
  const steady = w.eval(`(() => { const last = {}; for (let n = 1; n <= 1500; n++) { const D = dailyFor(n); if (dayNumber(dateOfDay(n)) !== n) return 'date ' + n; if (D.tier !== WEEK_TIER[dateOfDay(n).getDay()]) return 'weekday ' + n; if (D.tier in last && D.idx !== last[D.tier] + 1) return 'skip ' + n; last[D.tier] = D.idx; } return 'ok'; })()`);
  ok(steady === 'ok', 'four years of days: dates round-trip, weekdays match, no tier skips or repeats a case: ' + steady);
  ok(w.eval('new Set([...Array(200).keys()].map((k) => dailyFor(5 + 7 * k).spec.s)).size') === 200, 'two hundred Mondays, two hundred different cases');
  ok(w.eval('liveStreak({ streak: 4, lastDay: 19 })') === 4 && w.eval('liveStreak({ streak: 4, lastDay: 18 })') === 0, 'a streak lives while yesterday was closed, and lapses after a missed day');
}
ok(/Exactly one answer/.test($('.home h1').textContent), 'home says what the game is');
ok($('.today-case h2') && /No\. 20/.test($('.today-case .label').textContent), "today's case leads the page: " + $('.today-case .label').textContent);
ok(/Tuesday 3 November/.test($('.home .date').textContent), 'with the date');
ok($$('.days li').length === 7 && $('.day.is-today') && /Tue/.test($('.day.is-today').textContent) && $$('.day.future').length === 5, 'this week, Monday to Sunday: today marked, five days to come');
click($('.today-case [data-act="open-day"]'));
ok(w.eval('G.mode') === 'daily' && w.eval('G.day') === 20 && w.eval('G.puzzle.tier') === 'detective', "today's case opens: a Tuesday, five guests");
ok(/Tuesday 3 November, No\. 20/.test($('.case-head .date').textContent), 'the case says which day it is');
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
ok(!$('#scrim') && /Case closed/.test($('#closed-stamp').textContent), 'right accusation closes the case, and the finish waits for the ink');
{
  const rings = $$('#grid td .ring'), cells = $$('#grid .cell.answer');
  ok(rings.length === 3 && cells.length === 3 && cells.every((c) => +c.dataset.i === sol.killer), 'the three answer squares are ringed: did it, the weapon, the room');
  ok(cells.some((c) => c.dataset.b === 'k') && cells.some((c) => c.dataset.b === 'sw' && +c.dataset.j === sol.weapon) && cells.some((c) => c.dataset.b === 'sr' && +c.dataset.j === sol.room), 'on the right squares');
}
w.eval('FINISH_DELAY = 0');
ok($('.bar .accuse').textContent === 'See the finish', 'the closed case offers the finish instead of another accusation');
click($('.bar .accuse'));
{
  const fin = $('#scrim .finish');
  ok(fin && /^It was /.test($('.finish h2.tale').textContent) && $('.finish h2.tale').textContent.includes(w.eval('G.puzzle.ctx.suspects[G.puzzle.solution.killer].name')), 'the finish says what happened in one sentence: ' + $('.finish h2.tale').textContent);
  ok(/Named on the second try/.test($('.finish .went').textContent) && /with \d+ hints/.test($('.finish .went').textContent), 'and how it went: ' + $('.finish .went').textContent);
  ok($('.finish details.how') && !$('.finish details.how').open && /How it happened/.test($('.finish details.how summary').textContent), '"How it happened" is there, folded');
  ok($$('#scrim .btn').length === 1 && $('#scrim .btn').dataset.act === 'share' && $('#scrim .btn').textContent === 'Share', 'one primary button: Share');
  ok($('#scrim .link[data-act="archive"]') && $('#scrim .link[data-act="archive"]').textContent === 'Play an older case', '"Play an older case" is a quiet link');
  ok(/^Inquest No\. 20 · Tuesday ●●○○\n✕✕✕\n✒️✒️✒️ named on the second try\n.+ · (?:💡)+ \d+ hints$/.test($('#share').textContent), 'share text: ' + $('#share').textContent.replace(/\n/g, ' | '));
}
click($('[data-act="home"]'));
ok($('.home h1'), 'back home');
ok($('.day.is-today.is-closed .tick') && /Closed in/.test($('.today-case').textContent) && /See it again/.test($('.today-case .btn').textContent), 'today is ticked in the week and shown closed');
const st = w.eval("JSON.stringify(LS.get('inq1:stats',{}))"); ok(/"streak":1/.test(st) && /"lastDay":20/.test(st), 'streak recorded ' + st);
ok(/A 1-day streak/.test($('.home .row').textContent), 'and shown small: ' + $('.home .row .soft').textContent);
// past cases
click($('[data-act="archive"]'));
ok($('.archive h1') && $$('.archive .case-row').length === 19, 'past cases: every day from No. 19 back to No. 1 (' + $$('.archive .case-row').length + ')');
ok($$('.archive .wk').length === 4 && /Week of 2 November/.test($('.archive .wk .label').textContent), 'grouped by week, newest first');
click($('[data-act="archfilter"][data-f="constable"]'));
ok($$('.archive .case-row').length === 3 && $$('.archive .day-name').every((e) => /^Monday/.test(e.textContent)), 'Mondays only: three of them');
click($('[data-act="archfilter"][data-f="mastermind"]'));
ok($$('.archive .case-row').length === 3, 'Sundays only: three of them');
click($('[data-act="archfilter"][data-f="constable"]'));
click($('.archive .case-row'));
ok(w.eval('G.mode') === 'archive' && w.eval('G.day') === 19 && /past case/.test($('.case-head .date').textContent), 'an old day opens as a past case');
w.eval('G.pick = { killer: G.puzzle.solution.killer, weapon: G.puzzle.solution.weapon, room: G.puzzle.solution.room }; submitAccuse();');
ok(/"streak":1/.test(w.eval("JSON.stringify(LS.get('inq1:stats',{}))")) && w.eval("LS.get('inq1:stats',{}).solved.constable") === 1, 'closing a past case counts as closed but does not touch the streak');
ok(/^Inquest No\. 19 · Monday ●○○○$/.test($('#share').textContent.split('\n')[0]), 'its result names the day: ' + $('#share').textContent.split('\n')[0]);
click($('#scrim [data-act="archive"]'));
ok($('.archive') && /Closed in/.test($('.archive .case-row').textContent), 'and the archive shows it closed');
w.localStorage.setItem('inq1:archfilter', '"all"');
click($('.bar .mark'));

// the share text for every outcome: clean, with hints, after wrong accusations. Never a name, a weapon or a room.
{
  const shareOf = (setup) => {
    w.eval(`localStorage.removeItem(caseKey(dailyFor(18).spec)); newGame(dailyFor(18).spec, 'archive', 18); renderCase(); G.elapsed = 370;`);
    setup();
    w.eval('G.pick = { ...G.puzzle.solution }; submitAccuse();');
    return $('#share').textContent;
  };
  const wrongPick = () => w.eval('G.pick = { killer: (G.puzzle.solution.killer + 1) % G.puzzle.n, weapon: G.puzzle.solution.weapon, room: G.puzzle.solution.room }; submitAccuse();');
  const outcomes = {
    clean: shareOf(() => {}),
    hinted: shareOf(() => { click($('[data-act="hint"]')); click($('[data-act="hint-more"]')); click($('#scrim [data-act="close"]')); }),
    wrong: shareOf(() => { click($('[data-act="accuse"]')); wrongPick(); wrongPick(); }),
    many: shareOf(() => { click($('[data-act="accuse"]')); for (let k = 0; k < 6; k++) wrongPick(); }),
  };
  ok(outcomes.clean === 'Inquest No. 18 · Sunday ●●●●\n✒️✒️✒️ named on the first try\n6 min · no hints', 'clean solve: ' + outcomes.clean.replace(/\n/g, ' | '));
  ok(outcomes.hinted === 'Inquest No. 18 · Sunday ●●●●\n✒️✒️✒️ named on the first try\n6 min · 💡💡 2 hints', 'with hints: ' + outcomes.hinted.replace(/\n/g, ' | '));
  ok(outcomes.wrong === 'Inquest No. 18 · Sunday ●●●●\n✕✕✕\n✕✕✕\n✒️✒️✒️ named on the third try\n6 min · no hints', 'after two wrong accusations: ' + outcomes.wrong.replace(/\n/g, ' | '));
  ok(outcomes.many === 'Inquest No. 18 · Sunday ●●●●\n✕✕✕ ×6\n✒️✒️✒️ named on the seventh try\n6 min · no hints', 'after six: ' + outcomes.many.replace(/\n/g, ' | '));
  ok(/^Named on the third try, in 6 minutes, with no hints\.$/.test(w.eval('(() => { G.wrong = 2; G.hints = 0; openVerdict(); return document.querySelector(".finish .went").textContent; })()')), 'the finish says the same in words');
  const ctx = JSON.parse(w.eval('JSON.stringify({ s: G.puzzle.ctx.suspects, w: G.puzzle.ctx.weapons, r: G.puzzle.ctx.rooms })'));
  const words = new Set([...ctx.s.map((x) => x.name + ' ' + x.short), ...ctx.w.map((x) => x.name + ' ' + x.short), ...ctx.r.map((x) => x.name + ' ' + x.short)].join(' ').replace(/&shy;/g, '').toLowerCase().split(/[^a-z]+/).filter((x) => x.length > 3));
  const leaks = Object.entries(outcomes).map(([k, s]) => [k, s.toLowerCase().split(/[^a-z]+/).filter((x) => words.has(x))]).filter(([, l]) => l.length);
  ok(!leaks.length, 'no outcome names a suspect, a weapon or a room' + (leaks.length ? ': ' + JSON.stringify(leaks) : ''));
  w.eval(`newGame(null, 'practice'); `.replace('null', 'BANK.constable[BANK.constable.length - 1]') + 'renderCase(); G.pick = { ...G.puzzle.solution }; submitAccuse();');
  ok(/^Inquest, a practice case ●○○○\n/.test($('#share').textContent), 'a practice case shares without a number');
}

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

// sharing: the share sheet on a phone, the clipboard elsewhere, and selected text if the clipboard says no
(async () => {
  const { w, $, $$, click } = page(true);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let coarse = false, shared = [], copied = [], shareErr = null, clipErr = null;
  w.matchMedia = (q) => ({ matches: /coarse/.test(q) ? coarse : false, addListener() {}, removeListener() {} });
  const nav = (k, v) => Object.defineProperty(w.navigator, k, { value: v, configurable: true });
  nav('share', async (d) => { if (shareErr) { const e = new Error('no'); e.name = shareErr; throw e; } shared.push(d.text); });
  nav('clipboard', { writeText: async (s) => { if (clipErr) throw new Error('denied'); copied.push(s); } });
  const toastSays = () => ($('#toast') && !$('#toast').hidden ? $('#toast').textContent : '');
  // the finish waits for the rings, then opens by itself
  click($('.today-case [data-act="open-day"]'));
  w.eval('G.pick = { ...G.puzzle.solution }; submitAccuse();');
  ok(!$('#scrim') && $$('#grid .ring').length === 3, 'closing the case draws the rings first');
  await sleep(1300);
  ok($('#scrim .finish'), 'and the finish opens a moment later');
  const text = w.eval('shareText()');
  const run = async (cfg) => { shared = []; copied = []; ({ coarse, shareErr, clipErr } = cfg); w.getSelection().removeAllRanges(); if ($('#toast')) $('#toast').hidden = true; return w.eval('shareResult()'); };
  ok(await run({ coarse: true }) === 'shared' && shared[0] === text && !copied.length, 'on a phone: the share sheet, with the result text');
  ok(await run({ coarse: true, shareErr: 'AbortError' }) === 'cancelled' && !copied.length && !toastSays(), 'closing the share sheet does nothing more');
  ok(await run({ coarse: true, shareErr: 'NotAllowedError' }) === 'copied' && copied[0] === text, 'if the share sheet fails, it copies instead');
  ok(await run({ coarse: false }) === 'copied' && !shared.length && copied[0] === text && /Copied/.test(toastSays()), 'on a computer: copied, and it says so: ' + toastSays());
  ok(await run({ coarse: false, clipErr: true }) === 'selected' && w.getSelection().rangeCount === 1 && w.getSelection().getRangeAt(0).commonAncestorContainer.closest?.('#share') !== null && /selected: press Ctrl\+C/.test(toastSays()), 'clipboard refused: the text is selected, with how to copy it: ' + toastSays());
  ok(await run({ coarse: true, shareErr: 'NotAllowedError', clipErr: true }) === 'selected' && /tap Copy/.test(toastSays()), 'on a phone with nothing working: selected, tap Copy');
  nav('clipboard', undefined);
  ok(await run({ coarse: false }) === 'selected', 'no clipboard at all: selected');
  nav('clipboard', { writeText: async (s) => { copied.push(s); } });
  ({ coarse, shareErr, clipErr } = { coarse: false });
  copied = [];
  click($('#scrim [data-act="share"]'));
  await sleep(20);
  ok(copied[0] === text && /Copied/.test(toastSays()), 'the Share button does it');

  ok(errors.length === 0, 'no page errors ' + errors.join(';'));
  console.log(fails ? fails + ' FAILED' : 'all UI checks passed');
  process.exit(fails ? 1 : 0);
})();
