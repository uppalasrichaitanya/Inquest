// ---- INQUEST: interface. State, storage and small helpers.
const LAUNCH = Date.UTC(2026, 9, 15); // Case No. 1
const TIER_ORDER = ['constable', 'detective', 'inspector', 'mastermind'];
const TITLES_RANK = ['Lady', 'Dr.', 'Major', 'Miss', 'Reverend', 'Mrs.', 'Mr.', 'Count', 'Professor', 'Madame', 'Captain'];

const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
};

function dayNumber(d) {
  d = d || new Date();
  return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - LAUNCH) / 864e5) + 1;
}
function dailySpec(tier) {
  const list = BANK[tier], n = dayNumber();
  return list[(((n - 1) % list.length) + list.length) % list.length];
}
const caseKey = (spec) => `inq1:case:${spec.t}:${spec.s}`;
const loadStats = () => LS.get('inq1:stats', { solved: {}, best: {}, streak: 0, bestStreak: 0, lastDay: 0 });

function randomSpec(tier) {
  const list = BANK[tier];
  const fresh = list.filter((s) => !(LS.get(caseKey(s), null) || {}).solved);
  const pool = fresh.length ? fresh : list;
  return pool[Math.floor(Math.random() * pool.length)];
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmtTime = (sec) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
const zeros = (n) => Array.from({ length: n }, () => new Array(n).fill(0));
const stars = (k) => '★'.repeat(k) + `<i>${'★'.repeat(5 - k)}</i>`;

function initials(name) {
  const w = name.split(' ').filter((x) => !TITLES_RANK.includes(x));
  return (w[0][0] + w[w.length - 1][0]).toUpperCase();
}
const seal = (s) => `<span class="seal" style="--h:${s.hue}" aria-hidden="true">${initials(s.name)}</span>`;

const GLYPHS = {
  blade: '<path d="M20 4 9 15M6 12l6 6M8 16l-4 4"/>',
  blunt: '<path d="m14 4 6 6-4 4-6-6zM11 11 4 18l2 2 7-7"/>',
  poison: '<path d="M9 3h6M10 3v5l-4 8a3 3 0 0 0 3 4h6a3 3 0 0 0 3-4l-4-8V3M8.5 15h7"/>',
  cord: '<circle cx="12" cy="9" r="5"/><path d="M12 14v5M9 18l3 3 3-3"/>',
  firearm: '<path d="M3 9h13l2 2h3v3h-6l-1 4H9l1-4H6L3 12z"/>',
};
const glyph = (t) => `<svg class="wg" viewBox="0 0 24 24" aria-hidden="true">${GLYPHS[t] || ''}</svg>`;

// Turns {s:i} {w:i} {r:i} in a clue into highlightable spans.
function tokens(text, ctx) {
  return esc(text).replace(/\{([swr]):(\d+)\}/g, (_, k, i) => {
    i = +i;
    if (k === 's') return `<span class="tk s" data-ent="s${i}" style="--h:${ctx.suspects[i].hue}">${esc(ctx.suspects[i].short)}</span>`;
    if (k === 'w') return `<span class="tk w" data-ent="w${i}">${esc(ctx.weapons[i].name)}</span>`;
    return `<span class="tk r" data-ent="r${i}">${esc(ctx.rooms[i].name)}</span>`;
  });
}

// ---- the game in progress
let G = null;      // current case
let VIEW = 'home';

function newGame(spec, mode) {
  const puzzle = importPuzzle(spec);
  const key = caseKey(spec);
  const saved = mode === 'tutorial' ? {} : LS.get(key, null) || {};
  const n = puzzle.n;
  G = {
    spec, puzzle, key, mode,
    marks: saved.marks || { sw: zeros(n), sr: zeros(n), wr: zeros(n) },
    struck: saved.struck || [],
    elapsed: saved.elapsed || 0,
    hints: saved.hints || 0,
    wrong: saved.wrong || 0,
    solved: !!saved.solved,
    opts: saved.opts || { cross: true, chain: false },
    gridMode: 'L', tab: 'sw',
    view: mode === 'tutorial' ? 'one' : LS.get('inq1:nbview', 'one'), // notebook: one block at a time, or all three
    pick: { killer: null, weapon: null, room: null },
    csp: null,
  };
}
function persist() {
  if (!G || G.mode === 'tutorial') return;
  LS.set(G.key, { marks: G.marks, struck: G.struck, elapsed: G.elapsed, hints: G.hints, wrong: G.wrong, solved: G.solved, opts: G.opts });
}

// Marks you made: 0 blank, 1 crossed out, 2 confirmed. The notebook can add faint auto marks (3, 4).
function derive(marks, n, opts) {
  const d = { sw: marks.sw.map((r) => r.slice()), sr: marks.sr.map((r) => r.slice()), wr: marks.wr.map((r) => r.slice()) };
  const yes = (v) => v === 2 || v === 4, no = (v) => v === 1 || v === 3;
  const B = ['sw', 'sr', 'wr'];
  let changed = true, guard = 0;
  while (changed && guard++ < 40) {
    changed = false;
    if (opts.cross || opts.chain) {
      for (const b of B) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (yes(d[b][i][j])) {
        for (let k = 0; k < n; k++) {
          if (k !== j && d[b][i][k] === 0) { d[b][i][k] = 3; changed = true; }
          if (k !== i && d[b][k][j] === 0) { d[b][k][j] = 3; changed = true; }
        }
      }
    }
    if (opts.chain) {
      for (let s = 0; s < n; s++) for (let w = 0; w < n; w++) for (let r = 0; r < n; r++) {
        const t = [['sw', s, w], ['sr', s, r], ['wr', w, r]];
        const v = t.map(([b, i, j]) => d[b][i][j]);
        const ys = v.filter(yes).length, ns = v.filter(no).length, zi = v.indexOf(0);
        if (v.filter((x) => x === 0).length !== 1) continue;
        const [b, i, j] = t[zi];
        if (ys === 2) { d[b][i][j] = 4; changed = true; }
        else if (ys === 1 && ns === 1) { d[b][i][j] = 3; changed = true; }
      }
      for (const b of B) {
        for (let i = 0; i < n; i++) {
          const row = d[b][i], z = row.map((v, j) => (v === 0 ? j : -1)).filter((j) => j >= 0);
          if (z.length === 1 && row.filter(no).length === n - 1 && !row.some(yes)) { row[z[0]] = 4; changed = true; }
          const col = d[b].map((r) => r[i]), zc = col.map((v, j) => (v === 0 ? j : -1)).filter((j) => j >= 0);
          if (zc.length === 1 && col.filter(no).length === n - 1 && !col.some(yes)) { d[b][zc[0]][i] = 4; changed = true; }
        }
      }
    }
  }
  return d;
}
