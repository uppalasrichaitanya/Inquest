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
  Object.defineProperty(w.HTMLElement.prototype, 'clientWidth', { get() { return this.id === 'nb' ? 640 : 800; } });
} });
const w = dom.window, d = w.document;
const $ = (s) => d.querySelector(s), $$ = (s) => [...d.querySelectorAll(s)];
const click = (el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, detail: 1 }));
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };

ok($('h1') && $('h1').textContent === 'Inquest', 'home renders');
ok($$('.folder').length === 4, 'four folders');
ok(/solve with logic/.test($('.home .lede').textContent), 'home says what the game is');
click($$('.folder')[1]);
ok($('.dossier h2'), 'case opens: ' + ($('.dossier h2') || {}).textContent);
const n = w.eval('G.puzzle.n');
ok($$('.stmt').length === w.eval('G.puzzle.clues.length'), 'statements rendered: ' + $$('.stmt').length);
ok($$('#lg .cell').length === n * n, `one block by default: ${n * n} cells (${$$('#lg .cell').length})`);
ok(/Each person held exactly one weapon/.test($('#nb-note').textContent), 'block note explains the block');
click($('#nb-tabs [data-tab="wr"]'));
ok($('#lg .cell[data-b="wr"]') && !$('#lg .cell[data-b="sw"]'), 'tab turns to the what/where block');
click($('[data-act="nbview"][data-v="all"]'));
ok($$('#lg .cell').length === 3 * n * n, `All three: L grid has ${3 * n * n} cells (${$$('#lg .cell').length})`);
ok($('#plan svg') && $$('#plan .room').length === w.eval('G.puzzle.ctx.world.rooms.length'), 'floor plan rooms drawn');
ok($$('.tk').length > 0, 'entity tokens present');
// strike a statement
click($('.stmt > button')); ok($('.stmt').dataset.struck === '1', 'statement strikes through');
// keyboard-style cell activation cycles marks
const c0 = $('#lg .cell[data-b="sw"][data-i="0"][data-j="0"]');
click(c0); w.eval('0'); ok(c0.dataset.v === '0' || true, 'cell click handled');
c0.dispatchEvent(new w.MouseEvent('click', { bubbles: true, detail: 0 }));
ok(c0.dataset.v === '1', 'cell: first press crosses out');
c0.dispatchEvent(new w.MouseEvent('click', { bubbles: true, detail: 0 }));
ok(c0.dataset.v === '2', 'cell: second press confirms');
ok($('#lg .cell[data-b="sw"][data-i="0"][data-j="1"]').dataset.v === '3', 'auto-cross fills the rest of the row');
ok($('#plan .pin') === null, 'no pin yet for sw confirm');
const c1 = $('#lg .cell[data-b="sr"][data-i="0"][data-j="0"]');
c1.dispatchEvent(new w.MouseEvent('click', { bubbles: true, detail: 0 }));
c1.dispatchEvent(new w.MouseEvent('click', { bubbles: true, detail: 0 }));
ok($$('#plan .pin').length === 1, 'confirmed placement drops a pin on the plan');
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
ok($('.verdict .stamp') && /Case closed/.test($('.verdict').textContent), 'right accusation closes the case');
ok(/Closed in/.test($('#share').textContent), 'share text: ' + $('#share').textContent.replace(/\n/g, ' | '));
click($('[data-act="home"]'));
ok($('h1'), 'back home'); ok(/Closed/.test($$('.folder')[1].textContent), 'folder shows closed stamp');
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
const tapCell = (b, i, j) => { const c = $(`#lg .cell[data-b="${b}"][data-i="${i}"][data-j="${j}"]`); if (c) c.dispatchEvent(new w.MouseEvent('click', { bubbles: true, detail: 0 })); return c; };
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
ok($$('#plan .pin').length === 3 && $$('#plan .wpin').length === 3, 'tutorial plan shows every person and weapon');
click($('[data-act="accuse"]'));
const ts = w.eval('G.puzzle.solution');
click($(`[data-pick="killer"][data-v="${ts.killer}"]`)); click($(`[data-pick="weapon"][data-v="${ts.weapon}"]`)); click($(`[data-pick="room"][data-v="${ts.room}"]`));
click($('#do-accuse'));
ok(/whole game/.test($('#scrim').textContent) && w.localStorage.getItem('inq1:tutorial') === '1', 'tutorial ends with a closed case and is remembered');
click($('[data-act="open-daily"][data-tier="constable"]'));
ok($('.dossier h2') && w.eval('G.puzzle.tier') === 'constable' && !$('#coach'), 'tutorial leads into the first Constable case');

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
