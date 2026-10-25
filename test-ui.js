// Plays the game in a simulated browser (jsdom): the warm-up from a first visit, today's case to the verdict,
// the share text, the archive and the daily rhythm. node test-ui.js (after node build.js)
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
function page(seeded, wide) {
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.test/', beforeParse(w) {
    w.addEventListener('error', (e) => errors.push('window error: ' + e.message));
    w.scrollTo = () => {};
    w.scrollBy = () => {};
    const Real = w.Date;
    w.Date = class extends Real { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
    // wide: the desktop layout (everything on one page); otherwise the phone's panes
    w.matchMedia = (q) => ({ matches: wide ? /min-width/.test(q) : /max-width/.test(q), addListener() {}, removeListener() {} });
    if (seeded) w.localStorage.setItem('inq2:tutorial', '1');
    w.HTMLElement.prototype.scrollIntoView = () => {};
  } });
  const w = dom.window, d = w.document;
  return { w, d, $: (s) => d.querySelector(s), $$: (s) => [...d.querySelectorAll(s)], click: (el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, detail: 1 })) };
}
const press = (w, el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, detail: 0 })); // keyboard activation

// ---- the shipped page has no clock of its own: it reads the real date, and No. 1 is 15 October 2026.
{
  const shipped = fs.readFileSync('dist/index.html', 'utf8');
  ok(!/Date\s*=\s*class|setFixedTime|FIXED_NOW|inq2:now|[?&]date=/.test(shipped) && /new Date\(\)/.test(shipped), 'dist/index.html reads the real date, with no test clock or date override');
  ok(/const LAUNCH = Date\.UTC\(2026, 9, 15\); \/\/ Case No\. 1/.test(shipped), 'and No. 1 is 15 October 2026');
  const tags = ['<title>Inquest</title>', '<meta name="description" content="A daily murder mystery.', '<meta property="og:title" content="Inquest">', '<meta property="og:description" content="A daily murder mystery.', '<meta name="theme-color" content="#1D5641" media="(prefers-color-scheme: light)">', '<meta name="theme-color" content="#143B2E" media="(prefers-color-scheme: dark)">', '<link rel="icon" href="data:image/svg+xml,'];
  ok(/^<!doctype html>\n<html lang="en">\n<head>/.test(shipped) && tags.every((x) => shipped.includes(x)), 'dist/index.html is a full document with title, description, favicon, theme colours and Open Graph tags: ' + tags.filter((x) => !shipped.includes(x)).join(' | '));
  ok(!/https?:\/\/(?!fonts\.(googleapis|gstatic)\.com)[^"'\s)]+\.(js|css|png|svg|woff2?)\b/.test(shipped), 'and nothing outside it is loaded except Google Fonts');
}

// ---- a first visit, from empty storage: the warm-up opens by itself and is played to the end
{
  const { w, $, $$, click } = page(false);
  ok(w.localStorage.length === 0, 'first visit starts with nothing stored');
  ok($('.warm-head') && w.eval('G.mode') === 'tutorial', 'a first visit opens the warm-up');
  ok($$('.rules3 li').length === 3 && $$('.rules3 li .pic').length === 3, 'three rules, each with a picture');
  ok(/except the killer/.test($('.rules3').textContent), 'and one of them is that the killer lies');
  ok($$('.suspect').length === 3 && $$('.suspect .quote').length === 3 && $$('.suspect .face svg').length === 3, 'three suspects, each with a portrait and a statement');
  ok($('.suspect.on .try') && /Study/.test($('.suspect.on .try').textContent), 'the statement in hand says what to look for');
  click($('[data-act="warm-fold"]'));
  ok($('.warm-head.folded'), '"Got it" folds the rules away');
  ok($('.bar .accuse').getAttribute('aria-disabled') === 'true', '"Accuse" waits for an answer');
  click($('.bar .accuse'));
  ok(!$('#scrim') && /Not yet/.test($('.wnote').textContent), 'pressed too soon, it says why, inline');
  const tap = (b, i, j) => { const c = $(`#grid .cell[data-b="${b}"][data-i="${i}"][data-j="${j}"]`); press(w, c); return c; };
  const note = () => $('.wnote').textContent;
  // a wrong mark stays in pencil, has no effect, and Undo takes it back
  const p = tap('sw', 0, 1); tap('sw', 0, 1);
  ok(p.dataset.v === '2' && p.dataset.p === '1' && /pencil/.test(note()), 'a mark that does not fit stays in pencil: ' + note());
  ok($('#grid .cell[data-b="sw"][data-i="1"][data-j="1"]').dataset.v === '0', 'and nothing follows from it');
  click($('[data-act="undo"]')); click($('[data-act="undo"]'));
  ok(w.eval('G.marks.sw[0][1]') === 0, 'Undo takes it back');
  // calling the wrong statement a lie is caught; the right one circles the killer
  click($('.suspect[data-s="2"] [data-act="say"][data-v="2"]'));
  ok(/Not Miss Lark/.test(note()), 'calling the innocent a liar is caught: ' + note());
  click($('.suspect[data-s="2"] [data-act="say"][data-v="2"]'));
  click($('.suspect[data-s="1"] [data-act="say"][data-v="2"]'));
  ok($('.suspect[data-s="1"].lie .stamp') && /the liar is the killer/.test(note()), 'the liar gets a stamp: ' + note());
  ok($('#grid .cell[data-b="k"][data-i="1"]').dataset.v === '4', 'and the notebook circles them under "Did it?" by itself');
  ok($('#grid .cell[data-b="k"][data-i="0"]').dataset.v === '3', 'which rules out the others');
  // the rest, as the evidence says
  tap('sr', 2, 0); tap('sr', 2, 0);
  ok(/told the truth/.test(note()), 'a right circle lands in ink with its reason: ' + note());
  tap('sr', 1, 1); tap('sr', 1, 1);
  tap('sw', 2, 0); tap('sw', 2, 0);
  tap('sw', 0, 2); tap('sw', 0, 2);
  ok($('#grid .cell[data-b="sw"][data-i="1"][data-j="1"]').dataset.v === '4', 'the last weapon follows by itself');
  ok($('#grid .cell[data-b="wr"][data-i="1"][data-j="1"]').dataset.v === '4', 'and who-what plus who-where gives what-where');
  ok($$('#plan .occupants > g').length >= 4, 'people and weapons appear on the map as they are placed: ' + $$('#plan .occupants g').length);
  ok($('.bar .accuse').getAttribute('aria-disabled') === 'false', '"Accuse" wakes up once the notebook has its answer');
  click($('.bar .accuse'));
  w.eval('G.pick = { ...G.puzzle.solution }; submitAccuse();');
  ok($('.finish') && /It was Major Barnaby Crisp/.test($('.finish .tale').textContent) && /Guilty/.test($('.finish .stamp').textContent), 'the warm-up ends on its own verdict');
  ok(w.localStorage.getItem('inq2:tutorial') === '1', 'and is remembered as done');
}

// ---- someone who knows the game: today's case, start to finish
const { w, $, $$, click } = page(true);
{
  const seq = JSON.parse(w.eval(`JSON.stringify([...Array(9).keys()].map((k) => { const n = dayNumber(new Date(2026, 9, 25 + k)); const D = dailyFor(n); return [n, D.tier[0], D.idx, dateOfDay(n).getDate()]; }))`));
  ok(seq.map((x) => x[0]).join() === '11,12,13,14,15,16,17,18,19', 'case numbers run on by one a day, across the clock change and into November: ' + seq.map((x) => x[0]).join());
  ok(seq.map((x) => x[3]).join() === '25,26,27,28,29,30,31,1,2', 'and map back to their dates');
  ok(seq.map((x) => x[1] + x[2]).join() === 'm1,c1,d2,d3,i6,i7,i8,m2,c2', 'Sunday hardest, Monday gentlest, each kind of day takes the next case of its tier: ' + seq.map((x) => x[1] + x[2]).join());
  const steady = w.eval(`(() => { const last = {}; for (let n = 1; n <= 1500; n++) { const D = dailyFor(n); if (dayNumber(dateOfDay(n)) !== n) return 'date ' + n; if (D.tier !== WEEK_TIER[dateOfDay(n).getDay()]) return 'weekday ' + n; if (D.tier in last && D.idx !== last[D.tier] + 1) return 'skip ' + n; last[D.tier] = D.idx; } return 'ok'; })()`);
  ok(steady === 'ok', 'four years of days: dates round-trip, weekdays match, no tier skips or repeats a case: ' + steady);
  ok(w.eval('new Set([...Array(200).keys()].map((k) => dailyFor(5 + 7 * k).spec.s)).size') === 200, 'two hundred Mondays, two hundred different cases');
  ok(w.eval('liveStreak({ streak: 4, lastDay: 19 })') === 4 && w.eval('liveStreak({ streak: 4, lastDay: 18 })') === 0, 'a streak lives while yesterday was closed, and lapses after a missed day');
}
ok(/One of them is lying/.test($('.hero h1').textContent), 'home says what the game is');
ok($('.today h2') && /No\. 20/.test($('.today .kicker').textContent) && /Tuesday 3 November/.test($('.hero .kicker').textContent), "today's case leads the page, with the date");
ok($$('.lineup li .face').length === 4, 'with its four suspects in a line-up');
ok($$('.days li').length === 7 && $('.day.is-today') && $$('.day.future').length === 5, 'this week, Monday to Sunday: today marked, five days to come');
click($('.today [data-act="open-day"]'));
const n = w.eval('G.puzzle.n'), nc = w.eval('G.puzzle.clues.length');
ok(w.eval('G.mode') === 'daily' && w.eval('G.day') === 20 && w.eval('G.puzzle.tier') === 'detective' && n === 4, "today's case opens: a Tuesday, four suspects");
ok(/Tuesday 3 November · No\. 20/.test($('.case-head .kicker').textContent), 'the case says which day it is');
ok($('.case-head .scene').textContent.length > 60 && /The victim/.test($('.case-head .victim').textContent), 'it has a story and a victim');
ok($$('.suspect').length === n && $$('.suspect .traits li').length === 3 * n, 'a card for each suspect, with their three traits');
ok($$('.ev').length === nc - n, 'and the evidence: ' + (nc - n));
ok($$('#grid .cell').length === 3 * n * n + n, `one notebook, the whole L: who-what, who-where, what-where and "Did it?" (${$$('#grid .cell').length} squares)`);
const ctx = JSON.parse(w.eval('JSON.stringify({ adj: G.puzzle.ctx.adj, line: G.puzzle.ctx.world.layoutKind === "line" })'));
ok($$('#plan .room').length === n && (ctx.line ? $$('#plan .coupling').length === 7 : $$('#plan .door').length === ctx.adj.flat().filter(Boolean).length / 2), 'the map draws the rooms in play, and a doorway or stair per pair next to each other (or the couplings)');
ok($$('.tk').length > 0 && $$('.hl').length > 0, 'names in the statements are marked up, and the statement in hand lights up what it mentions');
// statements and evidence
click($$('.ev .use')[0]); ok(w.eval('G.struck.length') === 1 && $('.ev.used'), 'evidence can be ticked off');
click($$('.ev .use')[0]); ok(w.eval('G.struck.length') === 0, 'and ticked back on');
const ev0 = +$$('.ev')[0].dataset.i;
click($$('.ev .evtext')[0]); ok(w.eval('G.cur') === ev0 && $$('.ev')[0].classList.contains('on'), 'picking evidence puts it in hand');
ok($('#strip .txt') && /Evidence 1/.test($('#strip .who').textContent), 'and it rides above the notebook on a phone');
click($('[data-act="stmt-step"][data-d="1"]')); ok(w.eval('G.cur') === (ev0 + 1) % nc, 'next statement');
click($('[data-act="pane"][data-pane="notebook"]')); ok($('#case').dataset.pane === 'notebook' && w.document.body.dataset.pane === 'notebook', 'the dock turns to the notebook');
click($('[data-act="nbtab"][data-tab="wr"]')); ok($('#nb').dataset.tab === 'wr', 'and the tabs to what-where');
click($('[data-act="pane"][data-pane="clues"]'));
// marking a statement
click($('.suspect[data-s="0"] [data-act="say"][data-v="1"]'));
ok(w.eval('G.say[0]') === 1 && $('.suspect[data-s="0"].true') && $('#grid .cell[data-b="k"][data-i="0"]').dataset.v === '3', 'believing a statement rules its speaker out, faintly');
click($('.suspect[data-s="0"] [data-act="say"][data-v="1"]'));
ok(w.eval('G.say[0]') === 0 && $('#grid .cell[data-b="k"][data-i="0"]').dataset.v === '0', 'pressing it again clears it');
// the squares
const cell = (sel) => $(`#grid .cell${sel}`);
const c0 = cell('[data-b="sw"][data-i="0"][data-j="0"]');
press(w, c0); ok(c0.dataset.v === '1' && /ruled out/.test(c0.getAttribute('aria-label')), 'first press crosses out');
press(w, c0); ok(c0.dataset.v === '2', 'second press circles');
ok(cell('[data-b="sw"][data-i="0"][data-j="1"]').dataset.v === '3' && cell('[data-b="sw"][data-i="1"][data-j="0"]').dataset.v === '3', 'a circle crosses the rest of its row and column, faintly');
const c1 = cell('[data-b="sr"][data-i="0"][data-j="0"]');
press(w, c1); press(w, c1);
ok(cell('[data-b="wr"][data-i="0"][data-j="0"]').dataset.v === '4', "a person's weapon and room together say where the weapon was");
ok($$('#plan .occupants > g').length === 2, 'and both appear on the map');
const before = w.eval('JSON.stringify(G.marks)');
click($('[data-act="clear"]'));
ok(w.eval('[...G.marks.sw, ...G.marks.sr, ...G.marks.wr, G.marks.k].flat().every((v) => !v)'), 'Clear all empties the notebook');
click($('[data-act="undo"]'));
ok(w.eval('JSON.stringify(G.marks)') === before, 'and Undo brings every mark back');
// a hint
click($('[data-act="hint"]'));
ok($('#scrim .hintbox') && /Inspector Mallory/.test($('#scrim').textContent), 'hint opens: ' + $('#scrim .hintbox').textContent);
click($('[data-act="hint-more"]')); ok(/crossed|cleared/.test($('#hintbox').textContent), 'hint spells out: ' + $('#hintbox').textContent);
click($('#scrim [data-act="close"]'));
ok(w.eval('G.hints') === 2, 'hints counted');
// a wrong accusation, then the right one
click($('.bar .accuse'));
ok($$('#scrim .opt').length === 3 * n && $$('#scrim .opt .face').length === n, 'the accusation: suspects with their faces, weapons, rooms');
w.eval('G.pick = { killer: (G.puzzle.solution.killer + 1) % G.puzzle.n, weapon: G.puzzle.solution.weapon, room: G.puzzle.solution.room }; updateSaid();');
ok(!$('#do-accuse').disabled, 'enabled once three are picked');
click($('#do-accuse'));
ok(/Not quite/.test($('#accuse-result').textContent) && /statement|evidence/.test($('#accuse-result').textContent), 'a wrong accusation says which clue it breaks: ' + $('#accuse-result').textContent.replace(/\s+/g, ' '));
w.eval('FINISH_DELAY = 0; G.pick = { ...G.puzzle.solution }; submitAccuse();');
ok(/Case closed/.test($('#closed-stamp').textContent) && $('.bar .accuse').textContent === 'The verdict', 'the right one closes the case');
ok($$('#grid .ring').length === 4, 'the answer is ringed: did it, the weapon, the room, and where the weapon was');
{
  const K = w.eval('G.puzzle.ctx.suspects[G.puzzle.solution.killer]');
  ok($('.finish') && $('.finish .tale').textContent.startsWith('It was ' + K.name), 'the verdict: ' + $('.finish .tale').textContent);
  ok(/^Why\? /.test($('.finish .motive').textContent) && !/\{v\}/.test($('.finish .motive').textContent), 'with a motive: ' + $('.finish .motive').textContent);
  ok($('.finish .thelie .txt').textContent.length > 8, 'and the lie that gave it away: ' + $('.finish .thelie .txt').textContent);
  ok(/Solved on the second try/.test($('.finish .went').textContent) && /2 hints/.test($('.finish .went').textContent), 'and how it went: ' + $('.finish .went').textContent);
  ok(/^Inquest No\. 20 · Tuesday ●●○○\n✕🔎 solved on the second try\n.+ · 💡💡 2 hints$/.test($('#share').textContent), 'share text: ' + $('#share').textContent.replace(/\n/g, ' | '));
  const names = w.eval('JSON.stringify([...G.puzzle.ctx.suspects, ...G.puzzle.ctx.weapons, ...G.puzzle.ctx.rooms].map((x) => x.name))');
  const words = new Set(JSON.parse(names).join(' ').toLowerCase().split(/[^a-z]+/).filter((x) => x.length > 3));
  ok(!$('#share').textContent.toLowerCase().split(/[^a-z]+/).some((x) => words.has(x)), 'and it names no suspect, weapon or room');
}
const closedMarks = w.eval('JSON.stringify(G.marks)');
click($('#scrim [data-act="home"]'));
ok($('.day.is-today.is-closed .tick') && /Closed in/.test($('.today').textContent) && /See the verdict/.test($('.today .btn').textContent), 'today is ticked in the week and shown closed');
const st = w.eval("JSON.stringify(LS.get('stats',{}))"); ok(/"streak":1/.test(st) && /"lastDay":20/.test(st), 'streak recorded ' + st);
// the saved case comes back as it was
click($('.today [data-act="open-day"]'));
ok(w.eval('G.solved') && w.eval('JSON.stringify(G.marks)') === closedMarks, 'reopening the case restores it, closed');
// the archive
click($('.wordmark'));
click($('[data-act="archive"]'));
ok($('.archive') && $$('.archive .case-row').length === 19 && $$('.archive .case-row .faces .face').length > 19, 'past cases: every day from No. 19 back to No. 1, with their suspects');
click($('[data-act="archfilter"][data-f="constable"]'));
ok($$('.archive .case-row').length === 3 && $$('.archive .day-name').every((e) => /^Monday/.test(e.textContent)), 'Mondays only: three of them');
click($('[data-act="archfilter"][data-f="all"]'));
click($$('.archive .case-row')[0]);
ok(w.eval('G.mode') === 'archive' && w.eval('G.day') === 19 && /past case/.test($('.case-head .kicker').textContent) && w.eval('G.puzzle.n') === 3, 'an old Monday opens as a past case, with three suspects');
w.eval('G.pick = { ...G.puzzle.solution }; submitAccuse();');
ok(/"streak":1/.test(w.eval("JSON.stringify(LS.get('stats',{}))")), 'closing a past case does not touch the streak');
ok(/^Inquest No\. 19 · Monday ●○○○$/.test($('#share').textContent.split('\n')[0]), 'its result names the day: ' + $('#share').textContent.split('\n')[0]);
// a mistake is caught by the hint
w.eval(`newGame(BANK.inspector[3], 'practice'); renderCase();`);
{
  const sol = w.eval('G.puzzle.solution'), m = w.eval('G.puzzle.n');
  w.eval(`G.marks.sw[${sol.killer}][${(sol.weapon + 1) % m}] = 2`);
  ok(w.eval('nextHint().type') === 'mistake', 'a wrong circle is flagged as a mistake');
  w.eval(`G.marks.sw[${sol.killer}][${(sol.weapon + 1) % m}] = 0; G.say[${sol.killer}] = 1;`);
  ok(w.eval('nextHint().b') === 'say', "and so is believing the killer's statement");
}
// every tier, wide and narrow, renders without an error
for (const wide of [true, false]) {
  const P = page(true, wide);
  for (const t of ['constable', 'detective', 'inspector', 'mastermind']) {
    P.w.eval(`newGame(BANK.${t}[7], 'practice'); renderCase();`);
    ok(P.$$('.suspect').length === P.w.eval('G.puzzle.n') && P.$('#plan svg'), `${t} renders ${wide ? 'wide' : 'narrow'}`);
  }
}

ok(!errors.length, 'no errors in the page: ' + errors.join(' | '));
console.log(fails ? `\n${fails} FAILED` : '\nall UI checks passed');
process.exit(fails ? 1 : 0);
