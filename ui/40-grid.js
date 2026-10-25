// ---- the notebook: the classic logic grid, as an L. A row per person: their weapon (grouped by kind, in the words
// the statements use), their room (grouped by floor, or front to back on the train), and "Did it?". Under the
// weapons, a row per room: which weapon was there. Fill in every square and the whole story is told.
// On a phone it shows one block at a time (who-what, who-where, what-where), chosen with the tabs.
const KIND_ORDER = ['blade', 'blunt', 'poison', 'cord', 'firearm'];
const KIND_WORD = { blade: 'Sharp', blunt: 'Blunt', cord: 'Cord', poison: 'Poison', firearm: 'Gun' };
const isLine = (ctx) => ctx.world.layoutKind === 'line';
function weaponOrder(ctx) {
  return [...Array(ctx.n).keys()].sort((a, b) => KIND_ORDER.indexOf(ctx.types[a]) - KIND_ORDER.indexOf(ctx.types[b]) || a - b);
}
// rooms as you would read the plan: top floor first, left to right; carriages from the engine back
function roomOrder(ctx) {
  return [...Array(ctx.n).keys()].sort((a, b) => (isLine(ctx) ? 0 : ctx.floor[b] - ctx.floor[a]) || ctx.rooms[a].rect.x - ctx.rooms[b].rect.x);
}
function groupsOf(order, keyOf) {
  const g = [];
  order.forEach((x) => { const k = keyOf(x); if (!g.length || g[g.length - 1].key !== k) g.push({ key: k, items: [] }); g[g.length - 1].items.push(x); });
  return g;
}
// "in the cellar" -> "Cellar"
const floorLabel = (ctx, f) => cap(ctx.world.floors[f].replace(/^(in|on) the /, ''));

// one square: a button that holds a pen mark. data-r / data-c place it for the arrow keys.
function cellHTML(b, i, j, label, r, c, tdCls, col) {
  return `<td class="sq ${tdCls}" data-col="${col}"><button type="button" class="cell" data-grid="grid" data-r="${r}" data-c="${c}" data-b="${b}" data-i="${i}" data-j="${j}" data-v="-1" data-label="${esc(label)}" tabindex="${r === 0 && c === 0 ? 0 : -1}"></button></td>`;
}

function buildGrid() {
  const ctx = G.puzzle.ctx, el = document.getElementById('grid');
  if (!el) return;
  const WO = weaponOrder(ctx), RO = roomOrder(ctx), line = isLine(ctx), n = ctx.n;
  const wg = groupsOf(WO, (w) => ctx.types[w]), rg = groupsOf(RO, (r) => (line ? 'line' : ctx.floor[r]));
  const grp = (g, cls, attr, label) => `<th scope="colgroup" colspan="${g.items.length}" class="grp ${cls}" ${attr}><span>${label}</span></th>`;
  let h = '<thead><tr class="grps"><td class="corner"></td>';
  h += wg.map((g) => grp(g, 'wpart', `data-kind="${g.key}"`, KIND_WORD[g.key])).join('') + '<td class="gap"></td>';
  h += rg.map((g) => grp(g, 'rpart', line ? '' : `data-floor="${g.key}"`, line ? 'Engine end first' : floorLabel(ctx, g.key))).join('');
  h += '<td class="gap rpart"></td><td class="kpart"></td></tr><tr class="names"><td class="corner"><span class="sr">Suspect</span></td>';
  h += WO.map((w) => `<th scope="col" class="c wpart" data-col="w${w}" title="${esc(ctx.weapons[w].name)}">${weaponIcon(ctx.weapons[w])}<span>${shortName(ctx.weapons[w])}</span></th>`).join('') + '<td class="gap"></td>';
  h += RO.map((r) => `<th scope="col" class="c rpart" data-col="r${r}" title="${esc(ctx.rooms[r].name)}"><span>${shortName(ctx.rooms[r])}</span></th>`).join('');
  h += '<td class="gap rpart"></td><th scope="col" class="c kpart" data-col="k"><span>Did it?</span></th></tr></thead><tbody>';
  ctx.suspects.forEach((S, s) => {
    let c = 0;
    h += `<tr class="srow"><th scope="row" data-row="s${s}">${face(S, 26)}<span class="who">${esc(S.short)}</span></th>`;
    h += WO.map((w) => cellHTML('sw', s, w, `${S.short} with the ${ctx.weapons[w].name}`, s, c++, 'wpart', `w${w}`)).join('') + '<td class="gap"></td>';
    h += RO.map((r) => cellHTML('sr', s, r, `${S.short} in the ${ctx.rooms[r].name}`, s, c++, 'rpart', `r${r}`)).join('') + '<td class="gap rpart"></td>';
    h += cellHTML('k', s, 0, `${S.short} did it`, s, c++, 'kpart', 'k') + '</tr>';
  });
  // what was where: a row per room under the weapons
  h += `<tr class="rsep"><td colspan="${2 * n + 4}"><span>${line ? 'Which weapon was in which carriage' : 'Which weapon was in which room'}</span></td></tr>`;
  RO.forEach((r, k) => {
    let c = 0;
    h += `<tr class="rrow"><th scope="row" data-row="r${r}"><span class="who">${esc(ctx.rooms[r].name)}</span></th>`;
    h += WO.map((w) => cellHTML('wr', w, r, `The ${ctx.weapons[w].name} in the ${ctx.rooms[r].name}`, n + 1 + k, c++, 'wpart', `w${w}`)).join('');
    h += `<td class="gap"></td><td class="void rpart" colspan="${n + 2}"></td></tr>`;
  });
  el.innerHTML = h + '</tbody>';
}

// Shrink the squares until the notebook fits its column (never below 30px, still a fair tap),
// and if that is not enough, set the labels smaller.
function fitGrid() {
  const g = document.getElementById('grid');
  if (!g || !g.parentElement.clientWidth) return;
  g.classList.remove('tight');
  g.style.removeProperty('--cell');
  const avail = g.parentElement.clientWidth, sq = [...g.querySelectorAll('td.sq')].find((x) => x.getClientRects().length);
  if (!sq) return;
  let c = Math.floor(sq.getBoundingClientRect().width);
  for (const tight of [false, true]) {
    g.classList.toggle('tight', tight);
    while (g.offsetWidth > avail && c > 30) g.style.setProperty('--cell', --c + 'px');
    if (g.offsetWidth <= avail) return;
  }
}

function setTab(tab) {
  G.tab = tab;
  const nb = document.getElementById('nb');
  if (nb) nb.dataset.tab = tab;
  document.querySelectorAll('[data-act="nbtab"]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
  applyFocus();
  fitGrid();
}

// ---- marks
const markOf = (d, b, i, j) => (b === 'k' ? d.k[i] : d[b][i][j]);
const MARK_WORD = ['open', 'ruled out', 'a match', 'ruled out, follows from your marks', 'a match, follows from your marks'];
function paintAll() {
  if (!G) return;
  // in the warm-up, a mark the statements don't prove yet stays in pencil: drawn, but nothing follows from it
  const pencil = G.mode === 'tutorial' ? warmPencil() : null;
  const d = pencil && pencil.size ? stripPencil() : derive(G.marks, G.puzzle.n, G.say);
  document.querySelectorAll('.cell').forEach((el) => {
    const b = el.dataset.b, i = +el.dataset.i, j = +el.dataset.j, p = !!pencil && pencil.has(b + i + '-' + j);
    const v = p ? userMark(b, i, j) : markOf(d, b, i, j);
    if (+el.dataset.v === v && (el.dataset.p === '1') === p) return;
    el.dataset.v = v;
    el.dataset.p = p ? '1' : '0';
    el.classList.toggle('pencil', p);
    const key = el.dataset.b + el.dataset.i + '-' + el.dataset.j;
    el.innerHTML = penMark(v, key, 46);
    el.setAttribute('aria-label', `${el.dataset.label}: ${MARK_WORD[v]}${p ? ', in pencil' : ''}`);
  });
  paintMap(d);
  paintAnswer();
  const u = document.querySelector('[data-act="undo"]');
  if (u) u.disabled = !G.undo.some((s) => s.length);
  if (G.mode === 'tutorial') warmAccuseState();
}
// once the case is closed, the killer's three squares are ringed in ink: did it, the weapon, the room
function paintAnswer() {
  const s = G.puzzle.solution, want = G.solved && G.mode !== 'tutorial' ? [['k', s.killer, 0], ['sw', s.killer, s.weapon], ['sr', s.killer, s.room], ['wr', s.weapon, s.room]] : [];
  document.querySelectorAll('#grid .cell.answer').forEach((el) => { el.classList.remove('answer'); const r = el.parentNode.querySelector('.ring'); if (r) r.remove(); });
  for (const [b, i, j] of want) {
    const el = document.querySelector(`#grid .cell[data-b="${b}"][data-i="${i}"][data-j="${j}"]`);
    if (!el) continue;
    el.classList.add('answer');
    el.insertAdjacentHTML('afterend', penRing('ring' + b + i + j));
    el.setAttribute('aria-label', el.getAttribute('aria-label') + ', the answer');
  }
}
function userMark(b, i, j) { return b === 'k' ? G.marks.k[i] : b === 'say' ? G.say[i] : G.marks[b][i][j]; }
// every change can be taken back. One step of Undo is one tap, one drag along a row, or one Clear all.
let undoStep = null; // the step being recorded while a drag is under way
function writeMark(b, i, j, v) { if (b === 'k') G.marks.k[i] = v; else if (b === 'say') G.say[i] = v; else G.marks[b][i][j] = v; }
function setMark(b, i, j, v) {
  const prev = userMark(b, i, j);
  if (prev === v) return;
  (undoStep || newUndoStep()).push([b, i, j, prev]);
  writeMark(b, i, j, v);
  persist();
  paintAll();
  if (G.mode === 'tutorial') warmAfter(b, i, j, v);
}
function newUndoStep() {
  const s = [];
  G.undo.push(s);
  if (G.undo.length > 300) G.undo.shift();
  return s;
}
function undo() {
  while (G.undo.length && !G.undo[G.undo.length - 1].length) G.undo.pop();
  const s = G.undo.pop();
  if (!s || G.solved) return;
  for (let k = s.length - 1; k >= 0; k--) writeMark(...s[k]);
  persist();
  if (s.some((x) => x[0] === 'say')) renderClues();
  paintAll();
  if (G.mode === 'tutorial') setWarmNote(s.length > 1 ? 'Those marks are back.' : 'Undone.');
}
function clearAll() {
  if (G.solved) return;
  const s = [], n = G.puzzle.n;
  for (const b of ['sw', 'sr', 'wr']) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (G.marks[b][i][j]) s.push([b, i, j, G.marks[b][i][j]]);
  for (let i = 0; i < n; i++) if (G.marks.k[i]) s.push(['k', i, 0, G.marks.k[i]]);
  for (let i = 0; i < n; i++) if (G.say[i]) s.push(['say', i, 0, G.say[i]]);
  if (!s.length) return;
  s.forEach(([b, i, j]) => writeMark(b, i, j, 0));
  G.undo.push(s);
  persist();
  renderClues();
  paintAll();
  toast('Notebook cleared. Undo brings it back.');
}
const cellInfo = (el) => ({ b: el.dataset.b, i: +el.dataset.i, j: +el.dataset.j });
const cycle = (el) => { const { b, i, j } = cellInfo(el); setMark(b, i, j, (userMark(b, i, j) + 1) % 3); };

// ---- input, wired once for every square on the page (notebook, plan, table, room sheet).
// Mouse: press to mark, drag to paint the same mark along a row. Touch: a tap, not a scroll. Keys: Space/Enter, arrows.
let drag = null, lastTouch = null;
function wireGrid() {
  document.addEventListener('pointerdown', (e) => {
    const c = e.target.closest('.cell');
    if (!c || !G || G.solved) return;
    if (e.pointerType === 'mouse') {
      if (e.button !== 0) return;
      e.preventDefault();
      const { b, i, j } = cellInfo(c), next = (userMark(b, i, j) + 1) % 3;
      drag = { v: next, b };
      undoStep = newUndoStep();
      setMark(b, i, j, next);
      if (c.focus) c.focus({ preventScroll: true });
    } else lastTouch = { c, x: e.clientX, y: e.clientY };
  });
  document.addEventListener('pointerover', (e) => {
    const c = e.target.closest('.cell');
    if (!c || !drag || e.buttons !== 1 || c.dataset.b !== drag.b) return;
    const { b, i, j } = cellInfo(c);
    if (userMark(b, i, j) !== drag.v) setMark(b, i, j, drag.v);
  });
  document.addEventListener('pointerup', (e) => {
    drag = null;
    undoStep = null;
    if (e.pointerType === 'mouse' || !lastTouch || !G || G.solved) { lastTouch = null; return; }
    const c = e.target.closest('.cell');
    if (c && c === lastTouch.c && Math.abs(e.clientX - lastTouch.x) < 8 && Math.abs(e.clientY - lastTouch.y) < 8) cycle(c);
    lastTouch = null;
  });
  document.addEventListener('click', (e) => { // keyboard activation only (pointer input is handled above)
    const c = e.target.closest('.cell');
    if (c && e.detail === 0 && G && !G.solved) cycle(c);
  });
  document.addEventListener('keydown', (e) => {
    const c = e.target.closest && e.target.closest('.cell[data-grid]');
    if (!c) return;
    const d = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[e.key];
    if (!d) return;
    e.preventDefault();
    const all = [...document.querySelectorAll(`.cell[data-grid="${c.dataset.grid}"]`)].filter((x) => x.getClientRects().length);
    let r = +c.dataset.r, col = +c.dataset.c, t = null;
    for (let step = 0; step < 40 && !t; step++) {
      r += d[0]; col += d[1];
      t = all.find((x) => +x.dataset.r === r && +x.dataset.c === col);
      if (r < -1 || col < -1 || r > 40 || col > 40) break;
    }
    if (!t) return;
    c.tabIndex = -1; t.tabIndex = 0; t.focus();
  });
}
