// ---- the warm-up: the first case (TUTORIAL, src/46-tutorial.js), taught in the case rather than on top of it.
// Three rules with pictures sit above it. The player marks any square they like: a mark that fits the case lands
// in ink with a one-line reason; anything else stays in pencil with a gentle note and does nothing to the rest of
// the notebook. Nothing is locked, and nothing covers the notebook.
const WARM = { note: '', toldFaint: false, toldReady: false, folded: false };

// the three rules, each with its picture. Shown above the warm-up and in "How to play".
function rulesHTML() {
  const sq = (v, k) => `<span class="rsq">${penMark(v, 'rule' + k, 26)}</span>`;
  return `<ol class="rules3">
    <li><span class="pic" aria-hidden="true"><span class="rlab">Pell</span>${sq(2, 1)}${sq(1, 2)}${sq(1, 3)}</span>
      <span><b>Each person had one weapon and was in one room.</b><span class="more"> No two shared, so one circle rules out the rest of its row.</span></span></li>
    <li><span class="pic" aria-hidden="true"><span class="bubble ok">“I was in the Study.”</span><span class="bubble no">“So was I.”</span></span>
      <span><b>Everyone tells the truth, except the killer.</b><span class="more"> The evidence is always true. Find the statement that can’t be, and you have found the killer.</span></span></li>
    <li><span class="pic joined" aria-hidden="true">${sq(2, 5)}${sq(2, 6)}${sq(2, 7)}<span class="rlab3"><i>who</i><i>what</i><i>where</i></span></span>
      <span><b>The killer</b> held the murder weapon in the room where the body was found.</span></li></ol>`;
}

// the rules above the warm-up. Once read ("Got it", or the first mark) they fold away; they stay in How to play.
function warmHeadHTML() {
  if (WARM.folded) return `<div class="warm-head folded"><p class="warm-fold"><button type="button" class="link" data-act="how">The three rules</button><button type="button" class="link" data-act="warm-skip">Skip the warm-up</button></p></div>`;
  return `<div class="warm-head"><p class="warm-lede">Three suspects, three rules:</p>${rulesHTML()}
    <div class="warm-skip"><button type="button" class="btn ghost" data-act="warm-fold">Got it</button><button type="button" class="link" data-act="warm-skip">Skip the warm-up</button></div></div>`;
}
function foldRules(toTop) {
  if (WARM.folded) return;
  WARM.folded = true;
  const head = document.querySelector('.warm-head');
  if (head) head.outerHTML = warmHeadHTML();
  if (toTop) window.scrollTo(0, 0);
}

// what each statement asks of you, said under the statement in hand
const WARM_TRY = [
  'Dr. Pell tells the truth, unless Dr. Pell is the killer. Hold that thought.',
  'Major Crisp says the Study. So does Miss Lark. They can’t both be right: one of them is lying, and the liar is the killer.',
  'One of Crisp and Lark is lying. The evidence will say which. Then mark that statement as a lie.',
  'The killer is tall. Look at the cards: who is tall? Mark them under “Did it?”.',
  'The killer was with the body. Which room is on the ground floor? Check the map.',
  'Find Miss Lark’s row. Which weapon is heavy and blunt?',
];

function startWarmup() {
  closeModal();
  newGame(TUTORIAL, 'tutorial');
  Object.assign(WARM, { note: '', toldFaint: false, toldReady: false, folded: false });
  renderCase();
  selectStatement(1);
  setWarmNote('Start with the statements. Two of them can’t both be true.');
}

// is this mark right? (the warm-up judges against the answer)
function fact(b, i, j) {
  const t = G.puzzle.truth;
  if (b === 'sw') return t.pw[i] === j;
  if (b === 'sr') return t.pr[i] === j;
  if (b === 'wr') return t.pr[t.pw.indexOf(i)] === j;
  return t.m === i; // k and say: did it, lied
}
const warmRight = (b, i, j, v) => (v === 2) === fact(b, i, j);
// keys of the marks that stay in pencil: they are drawn, but the notebook draws nothing from them
function warmPencil() {
  const out = new Set(), n = G.puzzle.n;
  for (const b of ['sw', 'sr', 'wr']) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const v = G.marks[b][i][j];
    if (v && !warmRight(b, i, j, v)) out.add(b + i + '-' + j);
  }
  for (let i = 0; i < n; i++) {
    if (G.marks.k[i] && !warmRight('k', i, 0, G.marks.k[i])) out.add('k' + i + '-0');
    if (G.say[i] && !warmRight('say', i, 0, G.say[i])) out.add('say' + i + '-0');
  }
  return out;
}
// the notebook as it stands without the pencil marks
function stripPencil() {
  const pencil = warmPencil(), m = JSON.parse(JSON.stringify(G.marks)), say = G.say.slice();
  pencil.forEach((key) => {
    const [, b, i, j] = key.match(/^(sw|sr|wr|k|say)(\d+)-(\d+)$/);
    if (b === 'k') m.k[i] = 0; else if (b === 'say') say[i] = 0; else m[b][i][j] = 0;
  });
  return derive(m, G.puzzle.n, say);
}
// does the notebook point to one killer, with their weapon and room circled?
function warmReady(d) {
  const yes = (v) => v === 2 || v === 4;
  const s = d.k.findIndex(yes);
  return s >= 0 && d.sw[s].some(yes) && d.sr[s].some(yes);
}

// the one-line reason for a mark that is right
function warmReason(b, i, j, v) {
  const ctx = G.puzzle.ctx, S = (x) => esc(ctx.suspects[x].short), W = (x) => 'the ' + esc(ctx.weapons[x].name), R = (x) => 'the ' + esc(ctx.rooms[x].name);
  const said = {
    'k1-0-2': `Right. The killer is tall, and ${S(1)} is the only tall one here.`,
    'k0-0-1': `Right. ${S(0)} is short, and the killer is tall.`,
    'k2-0-1': `Right. ${S(2)} is short, and the killer is tall.`,
    'sr2-0-2': `Right. ${S(2)} isn’t the killer, so ${S(2)} told the truth: ${R(0)}.`,
    'sr1-0-1': `Right. ${S(1)} lied about ${R(0)}.`,
    'sr1-1-2': `Right. The body was on the ground floor, and the killer was with it. ${cap(R(1))} is the only room down there.`,
    'sr0-2-2': `Right. ${S(0)} has one room left: ${R(2)}.`,
    'sw2-0-2': `Right. ${S(2)}’s weapon was heavy and blunt, and ${W(0)} is the only blunt one.`,
    'sw0-1-1': `Right. ${S(0)} isn’t the killer, so the statement is true: never touched ${W(1)}.`,
    'sw0-2-2': `Right. Not ${W(1)}, and ${W(0)} is ${S(2)}’s: ${W(2)}.`,
    'sw1-1-2': `Right. ${S(1)} gets what’s left: ${W(1)}.`,
  };
  const key = `${b}${i}-${j}-${v}`;
  if (said[key]) return said[key];
  const yes = v === 2;
  const what = b === 'sw' ? `${S(i)} ${yes ? 'had' : 'didn’t have'} ${W(j)}`
    : b === 'sr' ? `${S(i)} ${yes ? 'was' : 'wasn’t'} in ${R(j)}`
      : b === 'wr' ? `${W(i)} ${yes ? 'was' : 'wasn’t'} in ${R(j)}`
        : `${S(i)} ${yes ? 'did it' : 'didn’t do it'}`;
  return `Right: ${what}.`;
}

function setWarmNote(html) {
  WARM.note = html;
  document.querySelectorAll('.wnote').forEach((e) => { e.innerHTML = html; });
}
// after each mark: say why it is right, or why it stays in pencil. The square just tapped stays where it was.
function warmAfter(b, i, j, v) {
  const all = [...document.querySelectorAll(`.cell[data-b="${b}"][data-i="${i}"][data-j="${j}"]`)];
  const keep = all.find((x) => x.getClientRects().length), y0 = keep && keep.getBoundingClientRect().top;
  foldRules(false);
  if (!v) setWarmNote('Cleared.');
  else setWarmNote(warmRight(b, i, j, v) ? warmReason(b, i, j, v) + warmExtra(v) : 'That doesn’t fit the clues, so it stays in pencil. Tap it again to change it.');
  if (keep && keep.isConnected && window.scrollBy) window.scrollBy(0, keep.getBoundingClientRect().top - y0);
}
function warmSay(s, v) {
  foldRules(false);
  const S = esc(G.puzzle.ctx.suspects[s].short);
  if (!v) { setWarmNote('Cleared.'); return; }
  const liar = s === G.puzzle.truth.m;
  let note;
  if (v === 2) note = liar ? `Right: ${S} is lying, and the liar is the killer. The notebook circles ${S} under “Did it?” by itself.` : `Not ${S}. Look at the evidence again: the killer is tall.`;
  else note = liar ? `Careful: ${S} and Miss Lark can’t both be in the Study. Who is tall?` : `Right: ${S} isn’t the killer, so ${S} is telling the truth.`;
  setWarmNote(note + (warmRight('say', s, 0, v) ? warmExtra(2) : ''));
}
function warmExtra(v) {
  let out = '';
  if (v === 2 && !WARM.toldFaint) {
    WARM.toldFaint = true;
    out += ' <span class="aside">The faint marks are the notebook’s own: it fills in what follows from yours.</span>';
  }
  if (!WARM.toldReady && warmReady(stripPencil())) {
    WARM.toldReady = true;
    out += ' <span class="aside">The notebook has its answer. Press <b>Accuse</b>.</span>';
  }
  return out;
}
// "Accuse" wakes up once the notebook gives an answer
function warmAccuseState() {
  const btn = document.querySelector('.bar .accuse');
  if (btn) btn.setAttribute('aria-disabled', String(!warmReady(stripPencil())));
}

function finishWarmup() {
  LS.set('tutorial', 1);
  const ctx = G.puzzle.ctx, s = G.puzzle.solution, K = ctx.suspects[s.killer];
  openModal(`<div class="verdict">
    <div class="reveal" style="--h:${K.hue}">${face(K, 112)}<span class="stamp big" aria-hidden="true">Guilty</span></div>
    <p class="kicker">The warm-up · Case closed</p>
    <h2 class="tale">It was ${esc(K.name)}, in the ${esc(ctx.rooms[s.room].name)}, with the ${esc(ctx.weapons[s.weapon].name)}.</h2>
    <p>Two people claimed the Study, so one of them was lying. The evidence said who. That is the whole game: real cases have more suspects and sneakier lies, but every one is solved the same way.</p>
    <p class="soft">Stuck later on? <b>Hint</b> points to the next step, and tells you if a mark doesn’t add up.</p>
    <div class="actions"><button class="btn" data-act="gentle">Play a gentle first case</button><button class="btn ghost" data-act="home">Today’s case</button></div></div>`, 'finish');
  const cs = document.getElementById('closed-stamp');
  if (cs) cs.textContent = 'Case closed';
}
