// ---- INQUEST: interface. State, storage and small helpers.
const LAUNCH = Date.UTC(2026, 9, 15); // Case No. 1
const TIER_ORDER = ['constable', 'detective', 'inspector', 'mastermind'];
const STORE = 'inq2'; // the cases changed shape (a liar, a whole notebook): nothing saved by the first edition carries over

const LS = {
  get(k, d) { try { const v = localStorage.getItem(STORE + ':' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(STORE + ':' + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
};

function dayNumber(d) {
  d = d || new Date();
  return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - LAUNCH) / 864e5) + 1;
}
// ---- the daily rhythm. Everyone gets the same case each day, and the week has a shape, like a crossword:
// Monday three suspects, Tuesday to Saturday four (Thursday on, with fewer gifts), Sunday four with a motive each.
// Each kind of day takes the next case of its tier in bank order, so nothing repeats until a bank wraps round.
const WEEK_TIER = ['mastermind', 'constable', 'detective', 'detective', 'inspector', 'inspector', 'inspector']; // by getDay(): Sunday first
const TIER_LEVEL = { constable: 1, detective: 2, inspector: 3, mastermind: 4 };
const DAY_FEEL = {
  constable: 'The gentlest day: three suspects, and a lie that shows.',
  detective: 'Four suspects. Every statement earns its place.',
  inspector: 'Four suspects, fewer gifts. Expect to test a theory.',
  mastermind: 'Four suspects, four motives: find out why, as well as who.',
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
// case taken from the far end of the Monday bank, years away from being anyone's Monday
function gentleStart() {
  for (let n = todayN(); n >= 1; n--) if (weekdayOf(n) === 1 && !caseState(dailyFor(n).spec).solved) return { n };
  const list = BANK.constable;
  for (let i = list.length - 1; i >= 0; i--) if (!caseState(list[i]).solved) return { spec: list[i] };
  return { spec: list[list.length - 1] };
}
const caseKey = (spec) => `case:${spec.t}:${spec.s}`;
const caseState = (spec) => LS.get(caseKey(spec), null) || {};
// the streak lives only while yesterday's or today's case was closed on its day
function liveStreak(st) { return st.lastDay >= todayN() - 1 ? st.streak : 0; }
const loadStats = () => LS.get('stats', { solved: {}, best: {}, streak: 0, bestStreak: 0, lastDay: 0 });

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmtTime = (sec) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
const zeros = (n) => Array.from({ length: n }, () => new Array(n).fill(0));
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const NUM_WORD = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];
// how hard a kind of day is, as four dots: Monday one, Sunday four
const dayDots = (tier) => `<span class="level" aria-hidden="true">${'<i class="on"></i>'.repeat(TIER_LEVEL[tier])}${'<i></i>'.repeat(4 - TIER_LEVEL[tier])}</span>`;
const shortName = (x) => x.short || x.name;
const unitOf = (ctx) => (ctx.world.layoutKind === 'line' ? 'carriage' : 'room');
// the traits as the card prints them, each with a small picture
const traitChips = (s) => TRAIT_KEYS.map((k) => {
  const v = s.traits[k];
  if (k === 'hair') return `<li><i class="swatch" style="background:${HAIR_COLOUR[v]}"></i>${cap(v)} hair</li>`;
  if (k === 'eyes') return `<li><i class="swatch eye" style="background:${EYE_COLOUR[v]}"></i>${cap(v)} eyes</li>`;
  return `<li>${factIcon(k)}${cap(TRAITS[k].values[v])}</li>`;
}).join('');

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
  const sw = (faint ? 1.7 : 2.5) * Math.max(0.55, Math.min(1, size / 40));
  let d;
  if (v === 1 || v === 3) {
    const p = size * 0.28, q = size - p, w = size / 46;
    d = `M${p + j(4 * w)} ${p + j(4 * w)} Q${c + j(5 * w)} ${c + j(5 * w)} ${q + j(4 * w)} ${q + j(3 * w)} M${q + j(4 * w)} ${p + j(4 * w)} Q${c + j(5 * w)} ${c + j(5 * w)} ${p + j(3 * w)} ${q + j(4 * w)}`;
  } else {
    const rad = size * 0.3, a0 = r() * 6.28, pts = [];
    for (let i = 0; i <= 26; i++) {
      const a = a0 + (i / 24) * 6.28, rr = rad * (1 + j(0.12) + (i > 23 ? 0.08 : 0));
      pts.push(`${(c + Math.cos(a) * rr * 1.06).toFixed(1)} ${(c + Math.sin(a) * rr).toFixed(1)}`);
    }
    d = 'M' + pts.join(' L');
  }
  return `<svg class="pen" viewBox="0 0 ${size} ${size}" aria-hidden="true"><path d="${d}" pathLength="1" fill="none" stroke="${faint ? 'var(--pen-faint)' : 'var(--pen)'}" stroke-width="${sw.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
// a ring round an answer square, drawn when the case is closed
function penRing(key) {
  const r = penRng(key), j = (a) => (r() - 0.5) * a, a0 = r() * 6.28, pts = [];
  for (let i = 0; i <= 28; i++) {
    const a = a0 + (i / 25) * 6.28, rr = 19 * (1 + j(0.1) + (i > 25 ? 0.07 : 0));
    pts.push(`${(23 + Math.cos(a) * rr * 1.08).toFixed(1)} ${(23 + Math.sin(a) * rr).toFixed(1)}`);
  }
  return `<svg class="ring" viewBox="0 0 46 46" aria-hidden="true"><path d="M${pts.join(' L')}" pathLength="1" fill="none" stroke="var(--gold)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
// a tick: this piece of evidence has been used
function penTick(key) {
  const r = penRng(key), j = (a) => (r() - 0.5) * a;
  return `<svg class="tick" viewBox="0 0 22 20" aria-hidden="true"><path d="M3 ${11 + j(2)} Q7 ${15 + j(2)} 8.5 ${17 + j(1)} Q12 ${8 + j(3)} 19 ${3 + j(2)}" fill="none" stroke="var(--pen)" stroke-width="2.3" stroke-linecap="round"/></svg>`;
}

// ---- light or dark: follows the device until the player picks one, then remembers it
function applyTheme() {
  const t = LS.get('theme', null);
  if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
}
const isDark = () => (document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')) === 'dark';
function toggleTheme() { LS.set('theme', isDark() ? 'light' : 'dark'); applyTheme(); refreshThemeButton(); }
function themeButton() {
  return `<button type="button" class="iconbtn" data-act="theme" aria-label="${isDark() ? 'Switch to light pages' : 'Switch to dark pages'}"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M10 3a7 7 0 0 1 0 14z" fill="currentColor"/></svg></button>`;
}
function refreshThemeButton() { document.querySelectorAll('[data-act="theme"]').forEach((b) => b.setAttribute('aria-label', isDark() ? 'Switch to light pages' : 'Switch to dark pages')); }

// Turns {s:i} {w:i} {r:i} in a clue into highlightable spans.
function tokens(text, ctx) {
  return esc(text).replace(/\{([swrmM]):(\d+)\}/g, (_, k, i) => {
    i = +i;
    if (k === 'm' || k === 'M') { const n = ctx.motives[i].name; return `<span class="tk m" data-ent="m${i}">${esc(k === 'm' ? n.toLowerCase() : n)}</span>`; }
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
  const marks = saved.marks || { sw: zeros(n), sr: zeros(n), wr: zeros(n), sm: zeros(n), k: new Array(n).fill(0) };
  if (!marks.sm) marks.sm = zeros(n);
  G = {
    spec, puzzle, key, mode, marks,
    day: day || null, // the case number, for a day's case (today's is mode 'daily', an earlier one 'archive')
    struck: saved.struck || [], // evidence ticked off
    say: saved.say || new Array(n).fill(0), // each suspect's statement: 0 open, 1 believed, 2 a lie
    elapsed: saved.elapsed || 0,
    hints: saved.hints || 0,
    wrong: saved.wrong || 0,
    solved: !!saved.solved,
    tab: 'sw', // on a phone the notebook shows one block at a time: weapons (sw), rooms (sr) or weapon-and-room (wr)
    pane: 'clues', // on a phone the case is in three panes: the clues, the notebook, the map
    cur: 0, // the statement in hand
    pick: { killer: null, weapon: null, room: null, motive: null },
    undo: [], // steps of [b, i, j, mark before], for Undo (this visit only)
    csp: null,
  };
}
function persist() {
  if (!G || G.mode === 'tutorial') return;
  LS.set(G.key, { marks: G.marks, struck: G.struck, say: G.say, elapsed: G.elapsed, hints: G.hints, wrong: G.wrong, solved: G.solved });
}

// Marks you made: 0 blank, 1 crossed out, 2 confirmed. The notebook adds faint marks (3, 4) that follow:
// a circle crosses out the rest of its row and column; two circles that share a person or a weapon give the
// third square of the triangle (who, what, where); a statement marked as a lie circles its speaker under
// "Did it?", and one marked as true crosses them out.
const BLOCKS = ['sw', 'sr', 'wr', 'sm']; // who-what, who-where, what-where, who-why (all zeros without motives)
function derive(marks, n, say) {
  const d = { sw: marks.sw.map((r) => r.slice()), sr: marks.sr.map((r) => r.slice()), wr: marks.wr.map((r) => r.slice()), sm: marks.sm.map((r) => r.slice()), k: marks.k.slice() };
  const yes = (v) => v === 2 || v === 4, no = (v) => v === 1 || v === 3;
  if (say) say.forEach((v, s) => { if (d.k[s] === 0 && v) d.k[s] = v === 2 ? 4 : 3; });
  let changed = true, guard = 0;
  while (changed && guard++ < 40) {
    changed = false;
    const set = (b, i, j, v) => { if (d[b][i][j] === 0) { d[b][i][j] = v; changed = true; } };
    const killer = d.k.findIndex(yes);
    if (killer >= 0) for (let i = 0; i < n; i++) if (i !== killer && d.k[i] === 0) { d.k[i] = 3; changed = true; }
    if (killer < 0 && d.k.filter(no).length === n - 1) { const i = d.k.findIndex((v) => v === 0); if (i >= 0) { d.k[i] = 4; changed = true; } }
    for (const b of BLOCKS) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (yes(d[b][i][j])) {
      for (let k = 0; k < n; k++) { if (k !== j) set(b, i, k, 3); if (k !== i) set(b, k, j, 3); }
    }
    for (let s = 0; s < n; s++) for (let w = 0; w < n; w++) for (let r = 0; r < n; r++) {
      const a = d.sw[s][w], b = d.sr[s][r], c = d.wr[w][r];
      if (yes(a) && yes(b)) set('wr', w, r, 4);
      if (yes(a) && yes(c)) set('sr', s, r, 4);
      if (yes(b) && yes(c)) set('sw', s, w, 4);
      if (yes(a) && no(b)) set('wr', w, r, 3);
      if (yes(a) && no(c)) set('sr', s, r, 3);
      if (yes(b) && no(a)) set('wr', w, r, 3);
      if (yes(b) && no(c)) set('sw', s, w, 3);
      if (yes(c) && no(a)) set('sr', s, r, 3);
      if (yes(c) && no(b)) set('sw', s, w, 3);
    }
    // a row or column with one open square left and no circle: that square is the one
    for (const b of BLOCKS) for (let i = 0; i < n; i++) {
      const row = d[b][i];
      if (!row.some(yes) && row.filter((v) => v === 0).length === 1) set(b, i, row.indexOf(0), 4);
      const col = d[b].map((r) => r[i]);
      if (!col.some(yes) && col.filter((v) => v === 0).length === 1) set(b, col.indexOf(0), i, 4);
    }
  }
  return d;
}
