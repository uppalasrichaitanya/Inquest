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
// ---- the daily rhythm. Everyone gets the same case each day, and the week has a shape, like a crossword:
// Monday four guests, Tuesday and Wednesday five, Thursday to Saturday six, Sunday the Mastermind.
// Each kind of day takes the next case of its tier in bank order, so nothing repeats until a bank wraps round.
const WEEK_TIER = ['mastermind', 'constable', 'detective', 'detective', 'inspector', 'inspector', 'inspector']; // by getDay(): Sunday first
const TIER_LEVEL = { constable: 1, detective: 2, inspector: 3, mastermind: 4 };
const DAY_FEEL = {
  constable: 'The gentlest day: plain testimony, nothing to test.',
  detective: 'Every statement earns its place.',
  inspector: 'Fewer gifts. Expect to test a theory.',
  mastermind: 'No direct testimony. Only what the evidence implies.',
};
const DAY_GROUP = { constable: 'Mondays', detective: 'Tuesdays and Wednesdays', inspector: 'Thursdays to Saturdays', mastermind: 'Sundays' };
const todayN = () => Math.max(1, dayNumber());
// the calendar date of case No. n, at local midnight
function dateOfDay(n) {
  const L = new Date(LAUNCH);
  return new Date(L.getUTCFullYear(), L.getUTCMonth(), L.getUTCDate() + n - 1);
}
const weekdayOf = (n) => (((new Date(LAUNCH).getUTCDay() + n - 1) % 7) + 7) % 7;
// case No. n: its date, its kind of day, and which case of that tier it gets
function dailyFor(n) {
  const tier = WEEK_TIER[weekdayOf(n)], list = BANK[tier];
  const weeks = Math.floor((n - 1) / 7);
  let idx = weeks * WEEK_TIER.filter((t) => t === tier).length;
  for (let m = 1 + weeks * 7; m < n; m++) if (WEEK_TIER[weekdayOf(m)] === tier) idx++;
  return { n, date: dateOfDay(n), tier, idx, spec: list[idx % list.length] };
}
const dayName = (n, opts) => dateOfDay(n).toLocaleDateString('en-GB', opts || { weekday: 'long', day: 'numeric', month: 'long' });
// a gentle first case for someone new: the latest Monday not yet closed, or (before the first Monday) a practice
// four-guest case taken from the far end of the bank, years away from being anyone's Monday
function gentleStart() {
  for (let n = todayN(); n >= 1; n--) if (weekdayOf(n) === 1 && !caseState(dailyFor(n).spec).solved) return { n };
  const list = BANK.constable;
  for (let i = list.length - 1; i >= 0; i--) if (!caseState(list[i]).solved) return { spec: list[i] };
  return { spec: list[list.length - 1] };
}
const caseState = (spec) => LS.get(caseKey(spec), null) || {};
// the streak lives only while yesterday's or today's case was closed on its day
function liveStreak(st) { return st.lastDay >= todayN() - 1 ? st.streak : 0; }
const caseKey = (spec) => `inq1:case:${spec.t}:${spec.s}`;
const loadStats = () => LS.get('inq1:stats', { solved: {}, best: {}, streak: 0, bestStreak: 0, lastDay: 0 });

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmtTime = (sec) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
const zeros = (n) => Array.from({ length: n }, () => new Array(n).fill(0));
// difficulty as a row of printed dots: filled for each level of five
const stars = (k, of = 5) => `<span class="level" aria-hidden="true">${'<i class="on"></i>'.repeat(k)}${'<i></i>'.repeat(of - k)}</span>`;
// how hard a kind of day is, as four dots: Monday one, Sunday four
const dayDots = (tier) => stars(TIER_LEVEL[tier], 4);

function initials(name) {
  const w = name.split(' ').filter((x) => !TITLES_RANK.includes(x));
  return (w[0][0] + w[w.length - 1][0]).toUpperCase();
}
// a suspect is marked by a small dot in their colour (the name always travels with it)
const seal = (s) => `<span class="dot" style="--h:${s.hue}" aria-hidden="true"></span>`;

// Weapon kinds, as printer's marks: a dagger, a weight, a loop, a drop, a pistol. Defined once, used by reference.
const KIND_DEFS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <symbol id="k-blade" viewBox="0 0 16 16"><path d="M8 1 10 9.5H6Z" fill="currentColor"/><path d="M4.5 10.5h7M8 11v4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></symbol>
  <symbol id="k-blunt" viewBox="0 0 16 16"><circle cx="8" cy="8.5" r="5" fill="currentColor"/></symbol>
  <symbol id="k-cord" viewBox="0 0 16 16"><path d="M2 10c2-6 5-6 6-2s4 4 6-2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></symbol>
  <symbol id="k-poison" viewBox="0 0 16 16"><path d="M8 2.5c2.8 3.6 4.2 6 4.2 7.8a4.2 4.2 0 0 1-8.4 0C3.8 8.5 5.2 6.1 8 2.5z" fill="currentColor"/></symbol>
  <symbol id="k-firearm" viewBox="0 0 16 16"><path d="M2 5.5h12v3H7.5l-1 4.5H4l1-4.5H2z" fill="currentColor"/></symbol>
</svg>`;
const glyph = (t) => `<svg class="kg" aria-hidden="true"><use href="#k-${t}"/></svg>`;
// how the notebook names a kind: the words the statements use
const KIND_WORD = { blade: 'Sharp', blunt: 'Blunt', cord: 'Cord', poison: 'Poison', firearm: 'Gun' };
const shortName = (x) => x.short || x.name;

// ---- the pen: every mark is drawn by hand, slightly differently for each square, and the same way every time
function penRng(key) {
  let h = 2166136261;
  for (const c of key) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296;
}
// v: 1 your cross, 2 your circle, 3 a cross that follows, 4 a circle that follows (fainter). size: the square's side.
function penMark(v, key, size) {
  if (!v) return '';
  const r = penRng(key), j = (a) => (r() - 0.5) * a, c = size / 2, faint = v >= 3;
  const sw = (faint ? 1.6 : 2.3) * Math.max(0.55, Math.min(1, size / 40));
  let d;
  if (v === 1 || v === 3) {
    const p = size * 0.27, q = size - p, w = size / 46;
    d = `M${p + j(4 * w)} ${p + j(4 * w)} Q${c + j(5 * w)} ${c + j(5 * w)} ${q + j(4 * w)} ${q + j(3 * w)} M${q + j(4 * w)} ${p + j(4 * w)} Q${c + j(5 * w)} ${c + j(5 * w)} ${p + j(3 * w)} ${q + j(4 * w)}`;
  } else {
    const rad = size * 0.3, a0 = r() * 6.28, pts = [];
    for (let i = 0; i <= 26; i++) {
      const a = a0 + (i / 24) * 6.28, rr = rad * (1 + j(0.12) + (i > 23 ? 0.08 : 0));
      pts.push(`${(c + Math.cos(a) * rr * 1.06).toFixed(1)} ${(c + Math.sin(a) * rr).toFixed(1)}`);
    }
    d = 'M' + pts.join(' L');
  }
  return `<svg class="pen" viewBox="0 0 ${size} ${size}" aria-hidden="true"><path d="${d}" fill="none" stroke="${faint ? 'var(--pen-faint)' : 'var(--pen)'}" stroke-width="${sw.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
// a ring round an answer square, drawn when the case is closed
function penRing(key) {
  const r = penRng(key), j = (a) => (r() - 0.5) * a, a0 = r() * 6.28, pts = [];
  for (let i = 0; i <= 28; i++) {
    const a = a0 + (i / 25) * 6.28, rr = 19 * (1 + j(0.1) + (i > 25 ? 0.07 : 0));
    pts.push(`${(23 + Math.cos(a) * rr * 1.08).toFixed(1)} ${(23 + Math.sin(a) * rr).toFixed(1)}`);
  }
  return `<svg class="ring" viewBox="0 0 46 46" aria-hidden="true"><path d="M${pts.join(' L')}" pathLength="1" fill="none" stroke="var(--pen)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
// a tick in the margin: this statement has been used
function penTick(key) {
  const r = penRng(key), j = (a) => (r() - 0.5) * a;
  return `<svg class="tick" viewBox="0 0 22 20" aria-hidden="true"><path d="M3 ${11 + j(2)} Q7 ${15 + j(2)} 8.5 ${17 + j(1)} Q12 ${8 + j(3)} 19 ${3 + j(2)}" fill="none" stroke="var(--pen)" stroke-width="2.1" stroke-linecap="round"/></svg>`;
}
// a bracket in the margin: the statement in hand
const penBrace = () => '<svg class="brace" viewBox="0 0 12 100" preserveAspectRatio="none" aria-hidden="true"><path d="M10 2 Q3 3 3.5 12 L4 88 Q3.5 98 10.5 98" fill="none" stroke="var(--pen)" stroke-width="2.2" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>';

// ---- light or dark: follows the device until the player picks one, then remembers it
function applyTheme() {
  const t = LS.get('inq1:theme', null);
  if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
}
const isDark = () => (document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')) === 'dark';
function toggleTheme() { LS.set('inq1:theme', isDark() ? 'light' : 'dark'); applyTheme(); refreshThemeButton(); }
function themeButton() {
  return `<button type="button" class="theme" data-act="theme" aria-label="${isDark() ? 'Switch to light pages' : 'Switch to dark pages'}"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M10 3a7 7 0 0 1 0 14z" fill="currentColor"/></svg></button>`;
}
function refreshThemeButton() { document.querySelectorAll('[data-act="theme"]').forEach((b) => b.setAttribute('aria-label', isDark() ? 'Switch to light pages' : 'Switch to dark pages')); }

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

function newGame(spec, mode, day) {
  const puzzle = importPuzzle(spec);
  const key = caseKey(spec);
  const saved = mode === 'tutorial' ? {} : LS.get(key, null) || {};
  const n = puzzle.n;
  const marks = saved.marks || { sw: zeros(n), sr: zeros(n), wr: zeros(n) };
  if (!marks.k) marks.k = new Array(n).fill(0); // the "Did it?" column (cases saved before it existed have none)
  const struck = saved.struck || [];
  G = {
    spec, puzzle, key, mode, marks,
    day: day || null, // the case number, for a day's case (today's is mode 'daily', an earlier one 'archive')
    struck,
    elapsed: saved.elapsed || 0,
    hints: saved.hints || 0,
    wrong: saved.wrong || 0,
    solved: !!saved.solved,
    opts: saved.opts || { cross: true, chain: false },
    tab: 'sw', // on a phone the notebook shows weapons (sw) or rooms (sr); wide screens show both
    cur: Math.max(0, puzzle.clues.findIndex((c, i) => !struck.includes(i))), // the statement in hand
    wrView: LS.get('inq1:wrview', 'plan'), // which weapon was where: on the floor plan, or as a table
    pick: { killer: null, weapon: null, room: null },
    undo: [], // steps of [b, i, j, mark before], for Undo (this visit only)
    csp: null,
  };
}
function persist() {
  if (!G || G.mode === 'tutorial') return;
  LS.set(G.key, { marks: G.marks, struck: G.struck, elapsed: G.elapsed, hints: G.hints, wrong: G.wrong, solved: G.solved, opts: G.opts });
}

// Marks you made: 0 blank, 1 crossed out, 2 confirmed. The notebook can add faint auto marks (3, 4).
// Always: a circle crosses out the rest of its row and column, and a person's weapon and room, once both are
// circled, place that weapon in that room. With opts.chain, more follows between the blocks.
function derive(marks, n, opts) {
  const d = { sw: marks.sw.map((r) => r.slice()), sr: marks.sr.map((r) => r.slice()), wr: marks.wr.map((r) => r.slice()), k: (marks.k || new Array(n).fill(0)).slice() };
  const yes = (v) => v === 2 || v === 4, no = (v) => v === 1 || v === 3;
  const B = ['sw', 'sr', 'wr'];
  let changed = true, guard = 0;
  const killer = d.k.findIndex(yes);
  if (killer >= 0) for (let i = 0; i < n; i++) if (i !== killer && d.k[i] === 0) d.k[i] = 3;
  while (changed && guard++ < 40) {
    changed = false;
    for (let s = 0; s < n; s++) {
      const w = d.sw[s].findIndex(yes), r = d.sr[s].findIndex(yes);
      if (w >= 0 && r >= 0 && d.wr[w][r] === 0) { d.wr[w][r] = 4; changed = true; }
    }
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
