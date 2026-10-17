// ---- the guided first case. A coach card walks through TUTORIAL (src/46-tutorial.js) one move at a time:
// read a statement, cross out, circle a match, watch the plan, use the last open square, accuse.
// While it runs, only the square the coach points at can be marked.
const COACH = { on: false, step: 0, timer: null };

function tutSteps() {
  const ctx = G.puzzle.ctx;
  const S = (i) => `<b>${esc(ctx.suspects[i].short)}</b>`, W = (i) => `the <b>${esc(ctx.weapons[i].name)}</b>`, R = (i) => `the <b>${esc(ctx.rooms[i].name)}</b>`;
  return [
    { say: `${esc(ctx.world.victim.name)} is dead, and one of three guests did it. Your job is to name <b>who</b>, <b>with what</b>, and <b>where</b>.</p><p>Everything in the case file is true. Let's solve this one together; it takes about two minutes.`,
      button: 'Start the lesson', skip: 'Skip, I know how to play' },
    { stmt: 0, tab: 'sw', cell: ['sw', 0, 1, 1],
      say: `<b>Statement 1</b>: ${S(0)} never touched ${W(1)}.</p><p>In the notebook, find ${S(0)}'s row and the ${esc(ctx.weapons[1].name)} column. Tap that square <b>once</b> to cross it out.` },
    { stmt: 1, tab: 'sr', cell: ['sr', 2, 0, 2],
      say: `<b>Statement 2</b> puts ${S(2)} in ${R(0)}. That's a match.</p><p>The notebook has turned to the <i>Who was where</i> page. Tap ${S(2)}'s ${esc(ctx.rooms[0].name)} square <b>twice</b>: once to cross, again to circle.` },
    { plan: true, button: 'Next',
      say: `See the faint crosses? Each person was in one room and each room held one person, so the notebook crossed out the rest of that row and column for you.</p><p>${S(2)} is now pinned on the floor plan, too.` },
    { stmt: 2, tab: 'sr', cell: ['sr', 1, 2, 1],
      say: `<b>Statement 3</b>: ${S(1)} was nowhere near ${R(2)}. Cross it out.` },
    { tab: 'sr', cell: ['sr', 1, 1, 2],
      say: `Look along ${S(1)}'s row. Only one room is still open.</p><p>When a row has one square left, that's the answer. Circle it.` },
    { tab: 'sr', cell: ['sr', 0, 2, 2],
      say: `${S(0)} has one room left too. Circle it.` },
    { stmt: 3, tab: 'sw', cell: ['sw', 2, 0, 2], evidence: true,
      say: `<b>Statement 4</b>: ${S(2)} was carrying something heavy and blunt.</p><p>Under <i>What was found</i>, only ${W(0)} is a blunt object. Circle ${S(2)} and the ${esc(ctx.weapons[0].name)}.` },
    { tab: 'sw', cell: ['sw', 0, 2, 2],
      say: `${S(0)} never touched ${W(1)} (statement 1), and ${W(0)} is taken. Circle the only weapon left for ${S(0)}.` },
    { tab: 'sw', cell: ['sw', 1, 1, 2],
      say: `And ${S(1)} gets the weapon that's left. Circle it.` },
    { tab: 'wr', cell: ['wr', 1, 1, 2],
      say: `The third page, <i>What was where</i>, joins the other two. ${S(1)} had ${W(1)} and was in ${R(1)}, so ${W(1)} was in ${R(1)}. Circle it.` },
    { stmt: 4, plan: true, accuse: true,
      say: `<b>Statement 5</b>: the body was found on the ground floor.</p><p>On the floor plan, ${R(1)} is the only ground-floor room in this case. So who is the killer, and with what? Press <b>Accuse</b> when you know.` },
  ];
}

function startTutorial() {
  closeModal();
  newGame(TUTORIAL, 'tutorial');
  G.opts = { cross: true, chain: false };
  renderCase();
  COACH.on = true; COACH.step = 0;
  document.body.classList.add('coached');
  showStep();
}

function endCoach() {
  COACH.on = false; clearTimeout(COACH.timer);
  const c = document.getElementById('coach'); if (c) c.remove();
  document.body.classList.remove('coached');
  document.querySelectorAll('.coach-target').forEach((x) => x.classList.remove('coach-target'));
}

function showStep() {
  const steps = tutSteps(), st = steps[COACH.step];
  if (!st) return;
  document.querySelectorAll('.coach-target').forEach((x) => x.classList.remove('coach-target'));
  if (st.tab && G.tab !== st.tab) { G.tab = st.tab; buildGrid(); paintAll(); }
  let c = document.getElementById('coach');
  if (!c) { c = document.createElement('aside'); c.id = 'coach'; c.className = 'coach paper'; c.setAttribute('aria-label', 'Tutorial'); document.body.appendChild(c); }
  const buttons = (st.button ? `<button class="btn red" data-act="coach-next">${st.button}</button>` : '') + (st.skip ? `<button class="btn ghost" data-act="coach-skip">${st.skip}</button>` : '');
  c.innerHTML = `<div class="coach-top"><span>${COACH.step ? `Step ${COACH.step} of ${steps.length - 1}` : 'Welcome to Inquest'}</span>${st.skip ? '' : '<button data-act="coach-skip">Skip tutorial</button>'}</div>
    <div role="status" aria-live="polite"><p>${st.say}</p></div><p class="warn" id="coach-warn"></p>${buttons ? `<div class="actions">${buttons}</div>` : ''}`;
  if (st.stmt !== undefined) { const li = document.querySelector(`.stmt[data-i="${st.stmt}"]`); if (li) li.classList.add('coach-target'); }
  if (st.evidence) { const ev = document.getElementById('evidence'); if (ev) ev.open = true; }
  const smooth = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  let target = null;
  if (st.cell) {
    target = document.querySelector(`#lg .cell[data-b="${st.cell[0]}"][data-i="${st.cell[1]}"][data-j="${st.cell[2]}"]`);
    if (target) target.classList.add('coach-target');
  }
  if (st.plan) {
    const pl = document.getElementById('plan');
    if (pl) { pl.classList.remove('flash'); void pl.offsetWidth; pl.classList.add('flash'); target = target || pl; }
  }
  if (st.accuse) document.querySelector('.tool.go').classList.add('coach-target');
  if (target && target.scrollIntoView) target.scrollIntoView({ block: 'center', behavior: smooth });
  const first = c.querySelector('.actions .btn');
  if (first) first.focus({ preventScroll: true });
  else if (target && target.classList.contains('cell')) target.focus({ preventScroll: true });
}

// after the notebook is redrawn (page turn, resize), point at the square again
function coachHighlight() {
  const st = tutSteps()[COACH.step];
  if (!st || !st.cell) return;
  const t = document.querySelector(`#lg .cell[data-b="${st.cell[0]}"][data-i="${st.cell[1]}"][data-j="${st.cell[2]}"]`);
  if (t) t.classList.add('coach-target');
  else coachWarn(`The square you need is on page ${['sw', 'sr', 'wr'].indexOf(st.cell[0]) + 1}, ${BLOCKS[st.cell[0]].name}.`);
}

function coachWarn(msg) {
  const w = document.getElementById('coach-warn');
  if (w) w.textContent = msg;
}

function coachAllows(b, i, j) {
  if (!COACH.on) return true;
  const st = tutSteps()[COACH.step];
  if (st && st.cell && st.cell[0] === b && st.cell[1] === i && st.cell[2] === j) return true;
  coachWarn(st && st.cell ? 'For now, use the square with the red outline.' : st && st.accuse ? 'Your notebook is done. Press Accuse at the top.' : 'Press the button below to carry on.');
  return false;
}

function coachCheck() {
  if (!COACH.on) return;
  const st = tutSteps()[COACH.step];
  if (!st || !st.cell) return;
  const [b, i, j, want] = st.cell, v = G.marks[b][i][j];
  if (v === want) { coachWarn(''); clearTimeout(COACH.timer); COACH.timer = setTimeout(coachNext, 550); return; }
  if (want === 2 && v === 1) coachWarn('That is a cross. Tap the same square once more to circle it.');
  else if (want === 1 && v === 2) coachWarn('That is a circle, which means a match. Tap again to clear it, then once more to cross it out.');
  else coachWarn(want === 2 ? 'Tap it twice: once to cross, again to circle.' : 'Tap it once to cross it out.');
}

function coachNext() {
  if (!COACH.on) return;
  COACH.step++;
  showStep();
}

function finishTutorial() {
  LS.set('inq1:tutorial', 1);
  endCoach();
  const ctx = G.puzzle.ctx, s = G.puzzle.solution;
  openModal(`<div class="verdict"><h2>You've got it</h2>
    <p class="closed">Case closed.</p>
    <p class="tale">It was <b>${esc(ctx.suspects[s.killer].name)}</b>, in the <b>${esc(ctx.rooms[s.room].name)}</b>, with the <b>${esc(ctx.weapons[s.weapon].name)}</b>.</p>
    <p>That's the whole game. Real cases have more suspects and trickier statements, but every one is solved the same way: read a statement, cross out what it rules out, circle what it proves, then accuse.</p>
    <p class="soft">If you get stuck, the <b>Hint</b> button points you to the next step, and tells you if a square in your notebook doesn't add up.</p>
    <div class="actions"><button class="btn red" data-act="open-daily" data-tier="constable">Start your first real case</button><button class="btn ghost" data-act="home">Back to the cases</button></div></div>`);
  const cs = document.getElementById('closed-stamp');
  if (cs) cs.textContent = 'Case closed.';
}
