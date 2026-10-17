let modalReturn = null;
function openModal(html, cls) {
  closeModal();
  modalReturn = document.activeElement;
  const s = document.createElement('div');
  s.className = 'scrim'; s.id = 'scrim';
  s.innerHTML = `<div class="sheetbox paper ${cls || ''}" role="dialog" aria-modal="true"><button class="x" data-act="close" aria-label="Close">&times;</button>${html}</div>`;
  document.body.appendChild(s);
  const f = s.querySelector('.opt, .btn, button:not(.x)');
  if (f) f.focus();
}
function closeModal() {
  const s = document.getElementById('scrim');
  if (s) s.remove();
  if (modalReturn && modalReturn.focus && document.contains(modalReturn)) modalReturn.focus();
  modalReturn = null;
}
let toastTimer = null;
function toast(msg) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
}

// ---- accusation
function openAccuse() {
  const ctx = G.puzzle.ctx;
  const group = (title, key, items) => `<div class="pick"><h4>${title}</h4><div class="opts">${items.map((it, i) => `<button type="button" class="opt" data-pick="${key}" data-v="${i}" aria-pressed="${G.pick[key] === i}">${it}</button>`).join('')}</div></div>`;
  openModal(`<h2>Name the killer</h2>
    <p>Who did it, with what, and where. A wrong guess goes on your record.</p>
    ${group('Who did it?', 'killer', ctx.suspects.map((s) => `${seal(s)}${esc(s.name)}`))}
    ${group('With what?', 'weapon', ctx.weapons.map((w) => `${glyph(w.type)}${esc(w.name)}`))}
    ${group('Where?', 'room', ctx.rooms.map((r) => esc(r.name)))}
    <p class="said" id="said"></p>
    <div id="accuse-result"></div>
    <div class="actions"><button class="btn" id="do-accuse" data-act="submit-accuse">Name them</button><button class="btn ghost" data-act="close">Not yet</button></div>`);
  updateSaid();
}
function updateSaid() {
  const ctx = G.puzzle.ctx, p = G.pick;
  const b = (t) => `<b>${esc(t)}</b>`;
  const who = p.killer === null ? '…' : b(ctx.suspects[p.killer].name);
  const wp = p.weapon === null ? '…' : b(ctx.weapons[p.weapon].name);
  const rm = p.room === null ? '…' : b(ctx.rooms[p.room].name);
  const el = document.getElementById('said');
  if (el) el.innerHTML = `I accuse ${who}, in the ${rm}, with the ${wp}.`;
  const btn = document.getElementById('do-accuse');
  if (btn) btn.disabled = p.killer === null || p.weapon === null || p.room === null;
}

// Which statement first rules out this exact accusation?
function firstContradiction(P, acc) {
  const { perms, inv } = permutations(P.n);
  const A = [], B = [];
  perms.forEach((p, a) => { if (p[acc.killer] === acc.weapon) A.push(a); if (p[acc.killer] === acc.room) B.push(a); });
  let alive = [];
  for (const a of A) for (const b of B) alive.push([a, b]);
  for (let k = 0; k < P.clues.length; k++) {
    const c = P.clues[k];
    alive = alive.filter(([a, b]) => {
      const v = c.test(perms[a], inv[a], perms[b], inv[b]);
      return c.kind === 'M' ? (v & (1 << acc.killer)) !== 0 : v;
    });
    if (!alive.length) return k + 1;
  }
  return null;
}

function submitAccuse() {
  const p = G.pick;
  if (p.killer === null || p.weapon === null || p.room === null) return;
  const res = checkAccusation(G.puzzle, p);
  if (res.killer && res.weapon && res.room) { closeModal(); solveCase(); return; }
  G.wrong++; persist();
  const k = firstContradiction(G.puzzle, p);
  const box = document.getElementById('accuse-result');
  box.innerHTML = `<p class="miss"><b>Not quite.</b> ${k ? `That story breaks against statement <b>${k}</b>.` : 'The statements do not support that.'} Wrong accusations so far: ${G.wrong}.</p>`;
}

function solveCase() {
  if (G.mode === 'tutorial') { G.solved = true; finishTutorial(); return; }
  const first = !G.solved && !(LS.get(G.key, {}) || {}).solved;
  G.solved = true; persist();
  if (first) {
    const st = loadStats(), t = G.puzzle.tier;
    st.solved[t] = (st.solved[t] || 0) + 1;
    st.best[t] = st.best[t] ? Math.min(st.best[t], G.elapsed) : G.elapsed;
    if (G.mode === 'daily') {
      const today = dayNumber();
      if (st.lastDay !== today) { st.streak = st.lastDay === today - 1 ? st.streak + 1 : 1; st.lastDay = today; }
      st.bestStreak = Math.max(st.bestStreak, st.streak);
    }
    LS.set('inq1:stats', st);
  }
  const cs = document.getElementById('closed-stamp');
  if (cs) cs.textContent = 'Case closed.';
  openVerdict();
}

function shareText() {
  const P = G.puzzle;
  const head = G.mode === 'daily' ? `INQUEST No. ${dayNumber()}` : 'INQUEST, cold case';
  const wrong = G.wrong === 1 ? '1 wrong accusation' : `${G.wrong} wrong accusations`;
  const hints = G.hints === 1 ? '1 hint' : `${G.hints} hints`;
  return `${head}  ${'★'.repeat(P.rating)}${'☆'.repeat(5 - P.rating)}\n${P.tierName}: ${P.title}\nClosed in ${fmtTime(G.elapsed)}, ${hints}, ${wrong}.`;
}

function openVerdict() {
  const P = G.puzzle, ctx = P.ctx, s = P.solution, t = P.truth;
  const rows = ctx.suspects.map((su, i) => `<tr class="${i === s.killer ? 'killer' : ''}"><td>${seal(su)} ${esc(su.name)}</td><td>${esc(ctx.rooms[t.pr[i]].name)}</td><td>${esc(ctx.weapons[t.pw[i]].name)}</td></tr>`).join('');
  openModal(`<div class="verdict"><h2>${esc(P.title)}</h2>
    <p class="closed">Case closed.</p>
    <p class="tale">It was <b>${esc(ctx.suspects[s.killer].name)}</b>, in the <b>${esc(ctx.rooms[s.room].name)}</b>, with the <b>${esc(ctx.weapons[s.weapon].name)}</b>.</p>
    <p>Closed in ${fmtTime(G.elapsed)}. ${G.hints} hint${G.hints === 1 ? '' : 's'}, ${G.wrong} wrong accusation${G.wrong === 1 ? '' : 's'}.</p>
    <details><summary>The night as it really happened</summary>
      <table><thead><tr><td></td><td>Was in</td><td>Held</td></tr></thead><tbody>${rows}</tbody></table>
      <p class="soft">Only the killer's row can be proved from the statements. The rest is one story that fits.</p></details>
    <div class="share" id="share">${esc(shareText())}</div>
    ${nextStepHTML()}
    <div class="actions"><button class="btn" data-act="copy-share">Copy result</button><button class="btn ghost" data-act="home">Back to the cases</button><button class="btn ghost" data-act="random">Another case</button></div></div>`);
}

// After a win, point at the next thing worth doing: the next level up today, or tomorrow's case.
function nextStepHTML() {
  const st = loadStats(), closed = Object.values(st.solved).reduce((a, b) => a + b, 0);
  const up = TIER_ORDER[TIER_ORDER.indexOf(G.puzzle.tier) + 1];
  const record = `${closed} case${closed === 1 ? '' : 's'} closed${st.streak > 1 ? `, a ${st.streak}-day streak` : ''}.`;
  if (G.mode === 'daily' && up) {
    const s = LS.get(caseKey(dailySpec(up)), null);
    if (!(s && s.solved)) return `<div class="next"><p>${record} Ready for more? Today's <b>${TIERS[up].name}</b> case is waiting. ${esc(TIER_COPY[up].line)}</p><button class="btn red" data-act="open-daily" data-tier="${up}">Open today's ${TIERS[up].name} case</button></div>`;
  }
  return `<div class="next"><p>${record} A new set of cases opens at midnight.</p></div>`;
}

async function copyShare() {
  const txt = shareText();
  try { await navigator.clipboard.writeText(txt); toast('Result copied'); }
  catch (e) {
    const r = document.createRange(); r.selectNodeContents(document.getElementById('share'));
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
    toast('Press copy to take the selected text');
  }
}

// ---- hints from Inspector Mallory
function nextHint() {
  const P = G.puzzle, n = P.n;
  if (!G.csp) G.csp = buildCSP(P.ctx, P.clues);
  const csp = G.csp;
  const d = derive(G.marks, n, G.opts);
  const done = (b, i, j) => d[b][i][j] === 1 || d[b][i][j] === 3;
  // a square the player marked that the statements contradict: a circle on something impossible,
  // or a cross on something that has to be true
  if (!G.marg) G.marg = marginals(P.ctx, P.clues);
  const M = G.marg;
  for (const b of ['sw', 'sr', 'wr']) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const v = G.marks[b][i][j];
    if (v === 2 && !M[b][i][j]) return { type: 'mistake', b, i, j, v };
    if (v === 1) {
      let rowAlt = false, colAlt = false;
      for (let k = 0; k < n; k++) { if (k !== j && M[b][i][k]) rowAlt = true; if (k !== i && M[b][k][j]) colAlt = true; }
      if (!rowAlt || !colAlt) return { type: 'mistake', b, i, j, v };
    }
  }
  const dom = new Array(csp.nv).fill((1 << n) - 1), trace = [];
  propagate(csp, dom, trace);
  for (const ev of trace) {
    if (ev.v >= 2 * n) continue;
    for (let x = 0; x < n; x++) {
      if (!(ev.removed & (1 << x))) continue;
      const b = ev.v < n ? 'sw' : 'sr', i = ev.v < n ? ev.v : ev.v - n;
      if (!done(b, i, x)) return { type: 'elim', b, i, j: x, clue: ev.clue };
    }
  }
  if (answered(csp, dom) && !dom.slice(0, 2 * n).some((m) => popcount(m) > 1)) return { type: 'ready' };
  for (let v = 0; v < 2 * n; v++) for (let x = 0; x < n; x++) {
    if (!(dom[v] & (1 << x)) || popcount(dom[v]) === 1) continue;
    const trial = dom.slice(); trial[v] = 1 << x;
    if (!propagate(csp, trial)) {
      const b = v < n ? 'sw' : 'sr', i = v < n ? v : v - n;
      if (!done(b, i, x)) return { type: 'whatif', b, i, j: x, clue: -1 };
    }
  }
  return { type: 'ready' };
}

let hintNow = null;
function hintNames(h) {
  const ctx = G.puzzle.ctx;
  if (h.b === 'wr') return { S: `the ${ctx.weapons[h.i].name}`, what: `in the ${ctx.rooms[h.j].name}`, pair: `the ${ctx.weapons[h.i].name} and the ${ctx.rooms[h.j].name}` };
  const S = ctx.suspects[h.i].short;
  const X = h.b === 'sw' ? ctx.weapons[h.j].name : ctx.rooms[h.j].name;
  return { S, X, what: h.b === 'sw' ? `holding the ${X}` : `in the ${X}`, pair: `${S} and the ${X}` };
}
function openHint() {
  const h = nextHint();
  hintNow = h;
  if (h.type === 'ready') {
    openModal(`<h2>Inspector Mallory</h2><div class="hintbox">Your notes already settle it. Nothing left to look up, so name the killer.</div><div class="actions"><button class="btn" data-act="accuse">Name the killer</button><button class="btn ghost" data-act="close">Keep looking</button></div>`);
    return;
  }
  G.hints++; persist();
  const { S, what } = hintNames(h);
  let nudge;
  if (h.type === 'mistake') nudge = `Something in your notebook doesn't fit the statements. Look again at the square for ${esc(hintNames(h).pair)}.`;
  else if (h.type === 'whatif') nudge = `Test a theory. Could ${esc(S)} be ${esc(what)}? Follow that through the statements and see whether anything survives.`;
  else if (h.clue >= 0) nudge = `Read statement <b>${h.clue + 1}</b> again, alongside what your notebook already says about ${esc(S)}.`;
  else nudge = `Look along ${esc(S)}'s row in the notebook. The squares you have already crossed out leave only one way for this to go.`;
  openModal(`<h2>Inspector Mallory</h2><div class="hintbox" id="hintbox">${nudge}</div>
    <div class="actions"><button class="btn" data-act="hint-more">Spell it out</button><button class="btn ghost" data-act="close">I'll take it from here</button></div>`);
  if (h.clue >= 0) {
    selectStatement(h.clue);
    const li = document.querySelector(`.stmt[data-i="${h.clue}"]`);
    if (li) { li.classList.add('nudge'); setTimeout(() => li.classList.remove('nudge'), 5000); }
  }
}
function hintMore() {
  const h = hintNow; if (!h || h.type === 'ready') return;
  G.hints++;
  const { S, what, pair } = hintNames(h);
  if (h.type === 'mistake') {
    G.marks[h.b][h.i][h.j] = 0;
    persist(); paintAll();
    document.getElementById('hintbox').innerHTML = `You ${h.v === 2 ? 'circled' : 'crossed out'} ${esc(pair)}, but the statements ${h.v === 2 ? 'rule that out' : 'say it has to be true'}. I have cleared that square for you.`;
    document.querySelector('[data-act="hint-more"]').remove();
    return;
  }
  const why = h.type === 'whatif' ? 'Assume it and the statements contradict each other.' : h.clue >= 0 ? `Statement ${h.clue + 1} rules it out, given what you already know.` : 'The rest of the grid leaves no room for it.';
  if (G.marks[h.b][h.i][h.j] === 0) G.marks[h.b][h.i][h.j] = 1;
  persist(); paintAll();
  document.getElementById('hintbox').innerHTML = `${esc(S)} was not ${esc(what)}. ${why} I have crossed it out for you.`;
  document.querySelector('[data-act="hint-more"]').remove();
}

function openStats() {
  const st = loadStats();
  const row = (t) => `<tr><td>${TIERS[t].name}</td><td>${st.solved[t] || 0}</td><td>${st.best[t] ? fmtTime(st.best[t]) : 'none yet'}</td></tr>`;
  openModal(`<h2>Your record</h2><div class="stats"><div><b>${st.streak}</b><span>day streak</span></div><div><b>${st.bestStreak}</b><span>best streak</span></div><div><b>${Object.values(st.solved).reduce((a, b) => a + b, 0)}</b><span>cases closed</span></div></div>
    <table class="verdict" style="width:100%"><thead><tr><td></td><td>Closed</td><td>Best time</td></tr></thead><tbody>${TIER_ORDER.map(row).join('')}</tbody></table>`, 'verdict');
}
