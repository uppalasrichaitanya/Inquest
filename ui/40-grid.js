// ---- the notebook: three blocks (who/what, who/where, what/where). By default one block at a time,
// with a plain note on what it is for; "All three" shows the classic L-shaped grid on wide screens.
const BLOCKS = {
  sw: { name: 'Who had what', rows: 'Suspects', cols: 'Weapons',
    note: () => 'Each person held exactly one weapon, and no two held the same one.' },
  sr: { name: 'Who was where', rows: 'Suspects', cols: 'Rooms',
    note: () => 'Each person was in exactly one room, and no two shared a room.' },
  wr: { name: 'What was where', rows: 'Rooms', cols: 'Weapons',
    note: (ctx) => `Which weapon was in which room. Statements rarely say this outright: fill it in from blocks 1 and 2. If someone had the ${esc(ctx.weapons[0].name)} and was in the ${esc(ctx.rooms[0].name)}, then the ${esc(ctx.weapons[0].name)} was in the ${esc(ctx.rooms[0].name)}.` },
};

function chooseGridMode() {
  const nb = document.getElementById('nb');
  if (!nb) return;
  buildGrid(); paintAll();
}

function buildGrid() {
  const nb = document.getElementById('nb');
  const wide = nb.clientWidth >= 560 || nb.clientWidth === 0;
  const all = G.view === 'all' && wide;
  G.gridMode = all ? 'L' : G.tab;
  nb.classList.toggle('tabbed', !all);
  nb.classList.toggle('narrow', !wide);
  const ctx = G.puzzle.ctx, n = ctx.n, m = G.gridMode;
  const showSW = m === 'L' || m === 'sw', showSR = m === 'L' || m === 'sr', showWR = m === 'L' || m === 'wr';
  const colsW = showSW || showWR, colsR = showSR, rowsS = showSW || showSR, rowsR = showWR;
  const cols = (colsW ? n : 0) + (colsR ? n : 0);
  const lg = document.getElementById('lg');
  // one block at a time gets roomier squares, sized to the space there is
  // and names get whatever width is left over, so they are not cut short
  if (!all && nb.clientWidth) {
    const cs = getComputedStyle(nb);
    const rhw = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--rhw')) || 120;
    const avail = nb.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0) - 4;
    const size = Math.max(30, Math.min(50, Math.floor((avail - rhw) / n)));
    lg.style.setProperty('--cell', size + 'px');
    lg.style.setProperty('--rhw', Math.max(rhw, Math.min(180, avail - size * n)) + 'px');
  } else { lg.style.removeProperty('--cell'); lg.style.removeProperty('--rhw'); }
  lg.style.gridTemplateColumns = `var(--rhw) repeat(${cols}, var(--cell))`;
  const ch = (kind, i, name) => `<div class="ch" data-ent="${kind}${i}"><span>${esc(name)}</span></div>`;
  // column group labels, then the names
  let h = `<div class="grp-corner">${m === 'wr' ? 'Rooms' : 'Suspects'} &darr;</div>`;
  if (colsW) h += `<div class="grp" style="grid-column: span ${n}">Weapons &rarr;</div>`;
  if (colsR) h += `<div class="grp" style="grid-column: span ${n}">Rooms &rarr;</div>`;
  h += '<div></div>';
  if (colsW) for (let w = 0; w < n; w++) h += ch('w', w, ctx.weapons[w].name);
  if (colsR) for (let r = 0; r < n; r++) h += ch('r', r, ctx.rooms[r].name);
  const cell = (b, i, j, cls, label) => `<button type="button" class="mk cell ${cls}" data-b="${b}" data-i="${i}" data-j="${j}" data-v="0" aria-label="${esc(label)}"></button>`;
  if (rowsS) for (let s = 0; s < n; s++) {
    const S = ctx.suspects[s];
    h += `<div class="rh" data-ent="s${s}"><span>${esc(S.short)}</span>${seal(S)}</div>`;
    if (showSW) for (let w = 0; w < n; w++) h += cell('sw', s, w, w === 0 ? 'bl' : '', `${S.short} with the ${ctx.weapons[w].name}`);
    if (showSR) for (let r = 0; r < n; r++) h += cell('sr', s, r, r === 0 ? 'bl' : '', `${S.short} in the ${ctx.rooms[r].name}`);
  }
  if (rowsR && m === 'L') h += `<div class="grp-corner sub">Rooms &darr;</div><div class="grp-gap" style="grid-column: span ${2 * n}"></div>`;
  if (rowsR) for (let r = 0; r < n; r++) {
    h += `<div class="rh" data-ent="r${r}"><span>${esc(ctx.rooms[r].name)}</span></div>`;
    if (showWR) for (let w = 0; w < n; w++) h += cell('wr', w, r, (w === 0 ? 'bl ' : '') + (r === 0 && m === 'L' ? 'bt' : ''), `The ${ctx.weapons[w].name} in the ${ctx.rooms[r].name}`);
    if (showSR && m === 'L') for (let k = 0; k < n; k++) h += '<div class="dead"></div>';
  }
  lg.innerHTML = h;
  document.querySelectorAll('#nb-tabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === G.tab)));
  document.querySelectorAll('.nb-view button').forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.v === 'all') === all)));
  const note = document.getElementById('nb-note');
  if (note) note.innerHTML = all
    ? '<b>Three blocks in one.</b> Top left: who had what. Top right: who was where. Bottom: which weapon was in which room.'
    : `<b>${BLOCKS[m].name}.</b> ${BLOCKS[m].note(ctx)}`;
  if (COACH.on) coachHighlight();
}

function paintCell(el, d) {
  const b = el.dataset.b, i = +el.dataset.i, j = +el.dataset.j;
  el.dataset.v = d[b][i][j];
}
function paintAll() {
  const n = G.puzzle.n, d = derive(G.marks, n, G.opts);
  document.querySelectorAll('#lg .cell').forEach((c) => paintCell(c, d));
  // progress on each block: how many matches are circled
  for (const b of ['sw', 'sr', 'wr']) {
    const el = document.getElementById('tp-' + b);
    if (!el) continue;
    const k = d[b].reduce((a, row) => a + row.filter((v) => v === 2 || v === 4).length, 0);
    el.textContent = `${k}/${n}`;
    el.parentElement.classList.toggle('done', k === n);
  }
  paintPlan();
}

function setMark(b, i, j, v) {
  if (G.mode === 'tutorial' && !coachAllows(b, i, j)) return;
  G.marks[b][i][j] = v;
  persist();
  paintAll();
  if (G.mode === 'tutorial') coachCheck();
}

const cellInfo = (el) => ({ b: el.dataset.b, i: +el.dataset.i, j: +el.dataset.j });
// which suspect/weapon/room entities a cell sits between (for highlighting headers)
function cellEnts(el) {
  const { b, i, j } = cellInfo(el);
  return b === 'sw' ? [`s${i}`, `w${j}`] : b === 'sr' ? [`s${i}`, `r${j}`] : [`w${i}`, `r${j}`];
}
function lightEnts(ents, on) {
  ents.forEach((e) => document.querySelectorAll(`[data-ent="${e}"]`).forEach((x) => x.classList.toggle('hl-ent', on)));
}

let drag = null, lastTouch = null;
function wireGrid() {
  const lg = document.getElementById('lg');
  if (!lg || lg._wired) return;
  lg._wired = true;
  lg.addEventListener('pointerdown', (e) => {
    const c = e.target.closest('.cell');
    if (!c || G.solved) return;
    const { b, i, j } = cellInfo(c);
    if (e.pointerType === 'mouse') {
      e.preventDefault();
      const next = (G.marks[b][i][j] + 1) % 3;
      drag = { v: next };
      setMark(b, i, j, next);
    } else {
      lastTouch = { c, x: e.clientX, y: e.clientY };
    }
  });
  lg.addEventListener('pointerover', (e) => {
    const c = e.target.closest('.cell');
    if (!c) return;
    lightEnts(cellEnts(c), true);
    if (drag && e.buttons === 1) { const { b, i, j } = cellInfo(c); if (G.marks[b][i][j] !== drag.v) setMark(b, i, j, drag.v); }
  });
  lg.addEventListener('pointerout', (e) => {
    const c = e.target.closest('.cell');
    if (c) lightEnts(cellEnts(c), false);
  });
  lg.addEventListener('pointerup', (e) => {
    if (e.pointerType !== 'mouse' && lastTouch && !G.solved) {
      const c = e.target.closest('.cell');
      if (c && c === lastTouch.c && Math.abs(e.clientX - lastTouch.x) < 8 && Math.abs(e.clientY - lastTouch.y) < 8) {
        const { b, i, j } = cellInfo(c);
        setMark(b, i, j, (G.marks[b][i][j] + 1) % 3);
      }
    }
    lastTouch = null;
  });
  lg.addEventListener('click', (e) => { // keyboard activation only
    const c = e.target.closest('.cell');
    if (!c || e.detail !== 0 || G.solved) return;
    const { b, i, j } = cellInfo(c);
    setMark(b, i, j, (G.marks[b][i][j] + 1) % 3);
  });
  lg.addEventListener('keydown', (e) => {
    const c = e.target.closest('.cell');
    if (!c) return;
    let d = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[e.key];
    if (!d) return;
    e.preventDefault();
    const { b, i, j } = cellInfo(c);
    if (b === 'wr') d = [d[1], d[0]]; // this block is drawn with rooms down the side
    const t = lg.querySelector(`.cell[data-b="${b}"][data-i="${i + d[0]}"][data-j="${j + d[1]}"]`);
    if (t) t.focus();
  });
}
window.addEventListener('pointerup', () => { drag = null; });
