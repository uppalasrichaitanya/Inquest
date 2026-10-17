// ---- the case screen: the story, the statements, the notebook (40-grid.js) and the floor plan (45-plan.js).
// One statement is always "in hand": its names are lit in the notebook and on the plan. On a phone it sits in a
// strip pinned above the notebook, so the statement and the squares it talks about are on screen together.
const NARROW = matchMedia('(max-width: 1179px)'); // one statement at a time, in the strip
const PHONE = matchMedia('(max-width: 760px)'); // the small plan, worked through the room sheet
const NUM_WORD = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];
const cap = (s) => s[0].toUpperCase() + s.slice(1);

function noteLabel(c) {
  if (c.type === 'murderType' || c.type === 'murderNotType') return 'Coroner';
  if (c.type === 'murderNotWeapon') return 'Forensics';
  if (c.type === 'murderNotSuspect') return 'Inspector Mallory';
  if (c.type.startsWith('murder')) return 'Police report';
  return 'Case notes';
}

// what a statement talks about: people, weapons, rooms, a kind of weapon, a floor, the killer
function clueFocus(c) {
  const a = c.args, f = { s: [], w: [], r: [], kind: a.t || null, floor: a.f === undefined ? null : a.f, k: c.kind === 'M' };
  for (const k of ['s', 'a', 'b']) if (a[k] !== undefined) f.s.push(a[k]);
  if (a.w !== undefined) f.w.push(a.w);
  if (a.r !== undefined) f.r.push(a.r);
  return f;
}

function stmtParts(c, ctx) {
  const say = c.voice === 'say', body = tokens(c.text, ctx);
  return { text: say ? `&ldquo;${body}&rdquo;` : body, who: say ? esc(ctx.suspects[c.speaker].name) : esc(noteLabel(c)) };
}

function statementHTML(c, i, ctx) {
  const { text, who } = stmtParts(c, ctx);
  const used = G.struck.includes(i), on = i === G.cur;
  return `<li class="stmt${used ? ' used' : ''}${on ? ' on' : ''}" data-i="${i}">${on ? penBrace() : ''}
    <button type="button" class="use" data-act="use" data-i="${i}" aria-pressed="${used}" aria-label="Statement ${i + 1}, ${used ? 'used' : 'not used yet'}">${used ? penTick('t' + i) : `<span>${i + 1}</span>`}</button>
    <button type="button" class="say" data-act="pick-stmt" data-i="${i}" aria-current="${on}"><span class="txt">${text}</span><span class="who">${who}</span>${on ? tryLine(i, 'span') : ''}</button></li>`;
}
// the warm-up says what each statement asks of you
function tryLine(i, tag) {
  return G.mode === 'tutorial' && WARM_TRY[i] ? `<${tag} class="try">${WARM_TRY[i]}</${tag}>` : '';
}

function renderCase() {
  VIEW = 'case';
  const P = G.puzzle, ctx = P.ctx, w = ctx.world, n = P.n, tut = G.mode === 'tutorial';
  const unit = w.layoutKind === 'line' ? 'carriage' : 'room';
  const when = tut ? 'The warm-up' : G.day ? `${esc(dayName(G.day))}, No. ${G.day}${G.mode === 'daily' ? '' : ' <span class="soft">(past case)</span>'}` : 'A practice case';
  const mk = (v, k) => `<span class="mini">${penMark(v, k, 18)}</span>`;
  app().innerHTML = `
    <div class="bar"><button class="mark" data-act="home" aria-label="Inquest: back to the cases">Inquest</button>
      ${tut ? '' : '<button class="quiet" data-act="hint">Hint</button>'}
      <button class="quiet" data-act="how">How to play</button>${themeButton()}
      <button class="btn accuse" data-act="accuse">${G.solved && !tut ? 'See the finish' : 'Name the killer'}</button></div>
    <header class="case-head">
      <p class="date">${when}<span class="sep"></span><span aria-label="Difficulty ${TIER_LEVEL[P.tier]} of 4">${dayDots(P.tier)}</span></p>
      <h1>${esc(P.title)}</h1>
      <p class="closed" id="closed-stamp">${G.solved ? 'Case closed.' : ''}</p>
      ${tut ? warmHeadHTML() : ''}
      <details class="story"${tut ? ' hidden' : ''}${NARROW.matches ? '' : ' open'}><summary>The story and the rules</summary>
        <div class="story-body">
          <p class="scene">${w.scene.map(esc).join(' ')} ${cap(NUM_WORD[n])} guests, ${NUM_WORD[n]} ${unit}s, ${NUM_WORD[n]} weapons. One of them did it.</p>
          <p class="rules"><b>Each guest</b> had one weapon and was in one ${unit}; no two shared. <b>Every statement is true.</b> <b>The killer</b> held the murder weapon in the ${unit} where the body was found.</p>
        </div></details>
    </header>
    <main class="case" id="case">
      <section class="stmts-col" aria-labelledby="stmts-label">
        <p class="label" id="stmts-label">Statements</p>
        <ol class="stmts" id="stmts"></ol>
      </section>
      <section class="nb-col" aria-label="Notebook">
        <div class="strip" id="strip"></div>
        <div class="notebook${tut ? ' warm' : ''}" id="nb" data-tab="${G.tab}">
          <div class="nb-head"><p class="label">Notebook</p>
            <p class="howmark">Tap once to rule out ${mk(1, 'leg-x')}, twice for a match ${mk(2, 'leg-o')}. Faint marks follow from yours.</p></div>
          ${tut ? `<p class="wnote wide" aria-live="polite">${WARM.note}</p>` : ''}
          <div class="nb-bar"><div class="tabs" role="tablist" aria-label="Notebook columns">
            <button type="button" role="tab" data-act="nbtab" data-tab="sw" aria-selected="${G.tab === 'sw'}">Weapons<span class="cue" aria-hidden="true"></span><span class="sr cue-word">, in this statement</span></button>
            <button type="button" role="tab" data-act="nbtab" data-tab="sr" aria-selected="${G.tab === 'sr'}">${cap(unit)}s<span class="cue" aria-hidden="true"></span><span class="sr cue-word">, in this statement</span></button>
          </div>
          <div class="nbtools"><button type="button" class="quiet" data-act="undo" disabled>Undo</button><button type="button" class="quiet" data-act="clear">Clear all</button></div></div>
          <div class="tablewrap"><table class="grid" id="grid"></table></div>
        </div>
        <div class="plan" id="plan"></div>
      </section>
    </main>`;
  renderStatements();
  buildGrid();
  buildPlan();
  paintAll();
  autoTab();
  applyFocus();
  fitGrid();
  if (document.fonts) document.fonts.ready.then(fitGrid);
  window.scrollTo(0, 0);
}

function renderStatements() {
  const P = G.puzzle, list = document.getElementById('stmts');
  if (list) list.innerHTML = P.clues.map((c, i) => statementHTML(c, i, P.ctx)).join('');
  const strip = document.getElementById('strip');
  if (!strip) return;
  const i = G.cur, c = P.clues[i], used = G.struck.includes(i), { text, who } = stmtParts(c, P.ctx);
  strip.innerHTML = `<div class="nav"><span class="count">Statement ${i + 1} of ${P.clues.length}</span>
      <button type="button" class="quiet" data-act="all-stmts" aria-label="All statements">All</button>
      <button type="button" class="arrow" data-act="stmt-step" data-d="-1" aria-label="Previous statement">&lsaquo;</button>
      <button type="button" class="arrow" data-act="stmt-step" data-d="1" aria-label="Next statement">&rsaquo;</button></div>
    <p class="txt${used ? ' used' : ''}" data-i="${i}">${text}</p>${tryLine(i, 'p')}
    <div class="foot"><span class="who">${who}</span>
      <button type="button" class="usebtn" data-act="use" data-i="${i}" aria-pressed="${used}">${used ? `${penTick('s' + i)}Used` : 'Done with this one'}</button></div>${G.mode === 'tutorial' ? `<p class="wnote" aria-live="polite">${WARM.note}</p>` : ''}`;
}

function selectStatement(i) {
  G.cur = i;
  renderStatements();
  autoTab();
  applyFocus();
  if (G.mode === 'tutorial') paintAll(); // a pencil mark may be proven now
}
function stepStatement(d) {
  const len = G.puzzle.clues.length;
  selectStatement((G.cur + d + len) % len);
}
// tick a statement off (or back on). On a phone, ticking the one in hand moves on to the next one still unused.
function toggleUsed(i) {
  const on = !G.struck.includes(i);
  G.struck = on ? G.struck.concat(i) : G.struck.filter((x) => x !== i);
  persist();
  if (on && i === G.cur && NARROW.matches) {
    const len = G.puzzle.clues.length;
    for (let k = 1; k < len; k++) { const j = (i + k) % len; if (!G.struck.includes(j)) { G.cur = j; break; } }
  }
  renderStatements();
  autoTab();
  applyFocus();
}
function openAllStatements() {
  const P = G.puzzle;
  const rows = P.clues.map((c, i) => {
    const { text, who } = stmtParts(c, P.ctx), used = G.struck.includes(i);
    return `<li class="${used ? 'used' : ''}"><button type="button" class="pickrow" data-act="pick-stmt" data-i="${i}" aria-current="${i === G.cur}">
      <span class="n">${used ? penTick('a' + i) : i + 1}</span><span><span class="txt">${text}</span><span class="who">${who}</span></span></button></li>`;
  }).join('');
  openModal(`<h2>Statements</h2><ol class="allstmts">${rows}</ol>`, 'listsheet');
}

// light up everything the statement in hand talks about
function applyFocus() {
  document.querySelectorAll('.hl').forEach((e) => e.classList.remove('hl'));
  if (!G) return;
  const ctx = G.puzzle.ctx, f = clueFocus(G.puzzle.clues[G.cur]);
  const lit = (sel) => document.querySelectorAll(sel).forEach((e) => e.classList.add('hl'));
  f.s.forEach((s) => lit(`[data-row="s${s}"]`));
  const ws = f.w.concat(f.kind ? ctx.types.map((t, i) => (t === f.kind ? i : -1)).filter((i) => i >= 0) : []);
  ws.forEach((w) => lit(`[data-col="w${w}"]`));
  if (f.kind) lit(`[data-kind="${f.kind}"]`);
  const rs = f.r.concat(f.floor === null ? [] : ctx.floor.map((fl, i) => (fl === f.floor ? i : -1)).filter((i) => i >= 0));
  rs.forEach((r) => { lit(`[data-col="r${r}"]`); lit(`[data-row="r${r}"]`); lit(`[data-room="${r}"]`); });
  if (f.floor !== null) lit(`[data-floor="${f.floor}"]`);
  if (f.k) lit('[data-col="k"]');
  // on a phone only half the notebook shows: a dot on the other tab when the statement is about it too
  const touches = { sw: ws.length > 0, sr: rs.length > 0 };
  document.querySelectorAll('[data-act="nbtab"]').forEach((b) => b.classList.toggle('has-cue', b.dataset.tab !== G.tab && touches[b.dataset.tab]));
}
// a statement only about weapons (or only about rooms) turns the phone notebook to that half by itself
function autoTab() {
  if (!NARROW.matches) return;
  const f = clueFocus(G.puzzle.clues[G.cur]);
  const w = f.w.length > 0 || !!f.kind, r = f.r.length > 0 || f.floor !== null;
  if (w !== r) setTab(w ? 'sw' : 'sr');
}
