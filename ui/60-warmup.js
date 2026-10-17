// ---- the warm-up: the first case (TUTORIAL, src/46-tutorial.js), taught in the case rather than on top of it.
// Three rules with pictures sit above it. The player marks any square they like: a mark the statements read so far
// prove lands in ink with a one-line reason; anything else stays in pencil with a gentle note and does nothing to
// the rest of the notebook. Nothing is locked, and nothing covers the notebook: the notes sit in the statement
// strip on a phone and above the notebook on a wide screen.
const WARM = { alive: null, note: '', toldFaint: false, toldReady: false, folded: false };

// the three rules, each with its picture. Shown above the warm-up and in "How to play".
function rulesHTML() {
  const sq = (v, k) => `<span class="rsq">${penMark(v, 'rule' + k, 26)}</span>`;
  return `<ol class="rules3">
    <li><span class="pic" aria-hidden="true"><span class="rlab">Pell</span>${sq(2, 1)}${sq(1, 2)}${sq(1, 3)}</span>
      <span><b>Each person had one weapon and was in one room.</b><span class="more"> No two shared, so one circle rules out the rest of its row.</span></span></li>
    <li><span class="pic" aria-hidden="true"><span class="rq">&ldquo;Pell never touched the Port.&rdquo;</span>${sq(1, 4)}</span>
      <span><b>Every statement is true.</b><span class="more"> Each one lets you rule something out, or in.</span></span></li>
    <li><span class="pic joined" aria-hidden="true">${sq(2, 5)}${sq(2, 6)}${sq(2, 7)}<span class="rlab3"><i>who</i><i>what</i><i>where</i></span></span>
      <span><b>The killer</b> held the murder weapon in the room where the body was found.</span></li></ol>`;
}

// the rules above the warm-up. Once read ("Got it", or the first mark) they fold to one line, so the statement
// and the notebook share the screen; they stay in How to play.
function warmHeadHTML() {
  const w = G.puzzle.ctx.world;
  if (WARM.folded) return `<div class="warm-head folded"><p class="warm-fold"><button type="button" class="link" data-act="how">The three rules</button><button type="button" class="link" data-act="warm-skip">Skip the warm-up</button></p></div>`;
  return `<div class="warm-head"><p class="warm-lede"><span class="scene-txt">${w.scene.map(esc).join(' ')} </span>Three guests, and three rules:</p>${rulesHTML()}
    <div class="warm-skip"><button type="button" class="btn" data-act="warm-fold">Got it</button><button type="button" class="link" data-act="warm-skip">Skip the warm-up</button></div></div>`;
}
// fold the rules away (from "Got it" the page goes back to the top; after a mark, warmAfter keeps the square still)
function foldRules(toTop) {
  if (WARM.folded) return;
  WARM.folded = true;
  const head = document.querySelector('.warm-head');
  if (head) head.outerHTML = warmHeadHTML();
  if (toTop) window.scrollTo(0, 0);
}

// what each statement asks of you, said once, under the statement in hand
const WARM_TRY = [
  'Try it: find Pell’s row and the Port column. What does this rule out?',
  'Try it: this one is a match. Tap a square twice to circle it.',
  'Try it: cross it out, then look along Crisp’s row.',
  'Try it: the notebook groups the weapons by kind.',
  'Try it: the plan shows each room’s floor. Whose room is on the ground floor? Mark them under “Did it?”',
];

function startWarmup() {
  closeModal();
  newGame(TUTORIAL, 'tutorial');
  G.opts = { cross: true, chain: false };
  Object.assign(WARM, { alive: null, note: '', toldFaint: false, toldReady: false, folded: false });
  renderCase();
  setWarmNote('');
}

// every arrangement still possible after statements 1..k+1 (three guests: 6 x 6 x 3 = 108 to start with)
function warmAlive() {
  if (WARM.alive) return WARM.alive;
  const P = G.puzzle, n = P.n, { perms, inv } = permutations(n);
  let all = [];
  for (let a = 0; a < perms.length; a++) for (let b = 0; b < perms.length; b++) for (let m = 0; m < n; m++) all.push({ pw: perms[a], pwi: inv[a], pr: perms[b], pri: inv[b], m });
  WARM.alive = P.clues.map((c) => (all = all.filter((x) => clueHolds(c, x, x.pwi, x.pri))));
  return WARM.alive;
}
function fact(x, b, i, j) {
  if (b === 'sw') return x.pw[i] === j;
  if (b === 'sr') return x.pr[i] === j;
  if (b === 'wr') return x.pr[x.pwi[i]] === j;
  return x.m === i; // k: did it
}
// the first statement after which the notebook must say this (or -1)
function provenAt(b, i, j, yes) {
  return warmAlive().findIndex((alive) => alive.every((x) => fact(x, b, i, j) === yes));
}
const warmUpto = () => Math.max(G.cur, ...G.struck);
// judge one of the player's marks against the statements read so far
function warmJudge(b, i, j, v) {
  const upto = warmUpto(), k = provenAt(b, i, j, v === 2);
  if (k >= 0 && k <= upto) return { ok: true, k };
  const no = provenAt(b, i, j, v !== 2);
  return { ok: false, against: no >= 0 && no <= upto ? no : -1 };
}
// keys of the marks that stay in pencil: they are drawn, but the notebook draws nothing from them
function warmPencil() {
  const out = new Set(), n = G.puzzle.n;
  for (const b of ['sw', 'sr', 'wr']) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const v = G.marks[b][i][j];
    if (v && !warmJudge(b, i, j, v).ok) out.add(b + i + '-' + j);
  }
  for (let i = 0; i < n; i++) if (G.marks.k[i] && !warmJudge('k', i, 0, G.marks.k[i]).ok) out.add('k' + i + '-0');
  return out;
}
// does the notebook point to one killer, with their weapon and room circled?
function warmReady(d) {
  const yes = (v) => v === 2 || v === 4, no = (v) => v === 1 || v === 3;
  let s = d.k.findIndex(yes);
  if (s < 0 && d.k.filter(no).length === d.k.length - 1) s = d.k.findIndex((v) => !no(v));
  return s >= 0 && d.sw[s].some(yes) && d.sr[s].some(yes);
}

// the one-line reason for a mark that is right
function warmReason(b, i, j, v, k) {
  const ctx = G.puzzle.ctx, S = (x) => esc(ctx.suspects[x].short), W = (x) => 'the ' + esc(ctx.weapons[x].name), R = (x) => 'the ' + esc(ctx.rooms[x].name);
  const yes = v === 2, key = `${b}${i}-${j}-${v}`;
  const said = {
    'sw0-1-1': `Statement 1 says ${S(0)} never touched ${W(1)}, so that pair is out.`,
    'sr2-0-2': `Statement 2 puts ${S(2)} in ${R(0)}. A circle means a match.`,
    'sr1-2-1': `Statement 3: ${S(1)} was nowhere near ${R(2)}.`,
    'sr1-1-2': `${S(1)}’s row has one room left, ${R(1)}. When a row has one square left, that’s the answer.`,
    'sr0-2-2': `${S(0)} has one room left too: ${R(2)}.`,
    'sw2-0-2': `Statement 4: ${S(2)}’s weapon was blunt, and ${W(0)} is the only blunt one.`,
    'sw2-1-1': `Statement 4: ${S(2)}’s weapon was blunt, and ${W(1)} isn’t.`,
    'sw2-2-1': `Statement 4: ${S(2)}’s weapon was blunt, and ${W(2)} isn’t.`,
    'sw0-2-2': `${S(0)} never touched ${W(1)}, and ${W(0)} is ${S(2)}’s. ${cap(W(2))} is all that’s left.`,
    'sw1-1-2': `${S(1)} gets the weapon that’s left: ${W(1)}.`,
    'k1-0-2': `The body was on the ground floor (statement 5), and ${R(1)} is the only room there. ${S(1)} did it.`,
  };
  if (said[key]) return said[key];
  const what = b === 'sw' ? `${S(i)} ${yes ? 'had' : 'didn’t have'} ${W(j)}`
    : b === 'sr' ? `${S(i)} ${yes ? 'was' : 'wasn’t'} in ${R(j)}`
      : b === 'wr' ? `${W(i)} ${yes ? 'was' : 'wasn’t'} in ${R(j)}`
        : `${S(i)} ${yes ? 'did it' : 'didn’t do it'}`;
  return `Right: ${what}. That follows from statement ${k + 1}${k ? ' and the ones before it' : ''}.`;
}

// the square as it shows right now (notebook, plan chip, table or room sheet)
function visibleCell(b, i, j) {
  const all = [...document.querySelectorAll(`.cell[data-b="${b}"][data-i="${i}"][data-j="${j}"]`)];
  return all.find((x) => x.getClientRects().length) || all[0] || null;
}

function setWarmNote(html) {
  WARM.note = html;
  document.querySelectorAll('.wnote').forEach((e) => { e.innerHTML = html; });
}

// after each mark: say why it is right, or why it stays in pencil
// The rules folding and the note changing both move the notebook; the square just tapped stays where it was.
function warmAfter(b, i, j, v) {
  const keep = visibleCell(b, i, j), y0 = keep && keep.getBoundingClientRect().top;
  warmExplain(b, i, j, v);
  if (keep && keep.isConnected && window.scrollBy) window.scrollBy(0, keep.getBoundingClientRect().top - y0);
}
function warmExplain(b, i, j, v) {
  foldRules(false);
  if (!v) { setWarmNote('Cleared.'); return; }
  const r = warmJudge(b, i, j, v);
  let note;
  if (r.ok) {
    note = warmReason(b, i, j, v, r.k);
    if (r.k === G.cur && !G.struck.includes(G.cur)) { G.struck = G.struck.concat(G.cur); renderStatements(); applyFocus(); }
  } else if (r.against >= 0) note = `Statement ${r.against + 1} says otherwise, so this stays in pencil. Tap it again to change it.`;
  else note = 'Nothing so far proves that, so it stays in pencil. Mark only what a statement tells you.';
  if (r.ok && v === 2 && !WARM.toldFaint) {
    WARM.toldFaint = true;
    note += ' <span class="aside">The faint crosses are the notebook’s own: one weapon and one room each, so a circle rules out the rest of its row and column.</span>';
  }
  if (!WARM.toldReady && warmReady(stripPencil())) {
    WARM.toldReady = true;
    note += ' <span class="aside">The notebook has its answer. Press <b>Name the killer</b>.</span>';
  }
  setWarmNote(note);
}
// the notebook as it stands without the pencil marks
function stripPencil() {
  const pencil = warmPencil(), m = JSON.parse(JSON.stringify(G.marks));
  pencil.forEach((key) => { const [, b, i, j] = key.match(/^(sw|sr|wr|k)(\d+)-(\d+)$/); if (b === 'k') m.k[i] = 0; else m[b][i][j] = 0; });
  return derive(m, G.puzzle.n, G.opts);
}
// "Name the killer" wakes up once the notebook gives an answer
function warmAccuseState() {
  const btn = document.querySelector('.bar .accuse');
  if (btn) btn.setAttribute('aria-disabled', String(!warmReady(stripPencil())));
}

function finishWarmup() {
  LS.set('inq1:tutorial', 1);
  const ctx = G.puzzle.ctx, s = G.puzzle.solution;
  openModal(`<div class="verdict"><h2>That’s the whole game</h2>
    <p class="closed">Case closed.</p>
    <p class="tale">It was <b>${esc(ctx.suspects[s.killer].name)}</b>, in the <b>${esc(ctx.rooms[s.room].name)}</b>, with the <b>${esc(ctx.weapons[s.weapon].name)}</b>.</p>
    <p>Five true statements, and the notebook did the rest. Real cases have more guests and trickier statements, but every one is solved the same way.</p>
    <p class="soft">Stuck later on? <b>Hint</b> points to the next step, and tells you if a mark doesn’t add up.</p>
    <div class="actions"><button class="btn" data-act="open-daily" data-tier="constable">Play a first real case</button><button class="btn ghost" data-act="home">Back to the cases</button></div></div>`);
  const cs = document.getElementById('closed-stamp');
  if (cs) cs.textContent = 'Case closed.';
}
