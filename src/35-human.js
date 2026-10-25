// A "human" solver: candidate lists for every suspect's weapon and room, plus the killer, the
// murder weapon and the murder room. Each clue becomes small local constraints; each deduction
// is a candidate being crossed out. Where plain elimination stalls, it tries one "what if?" at a
// time (depth 1), or a what-if inside a what-if (depth 2). That depth is how hard the case feels.
//
// Variables: 0..n-1 weapon of suspect s | n..2n-1 room of suspect s | 2n killer | 2n+1 murder weapon | 2n+2 murder room

// The constraints a clue puts on the variables: a list of { vars, pred }.
function clueCons(ctx, type, a) {
  const n = ctx.n, { adj, floor, pos, types, traits } = ctx;
  const PW = (s) => s, PR = (s) => n + s, K = 2 * n, MW = 2 * n + 1, MR = 2 * n + 2;
  const out = [];
  const add = (vars, pred) => out.push({ vars, pred });
  const each = (f) => { for (let s = 0; s < n; s++) f(s); };
  switch (type) {
    case 'has': add([PW(a.s)], (x) => x === a.w); break;
    case 'notHas': add([PW(a.s)], (x) => x !== a.w); break;
    case 'in': add([PR(a.s)], (x) => x === a.r); break;
    case 'notIn': add([PR(a.s)], (x) => x !== a.r); break;
    case 'eitherHas': add([PW(a.a), PW(a.b)], (x, y) => x === a.w || y === a.w); break;
    case 'eitherIn': add([PR(a.a), PR(a.b)], (x, y) => x === a.r || y === a.r); break;
    case 'holdsType': add([PW(a.s)], (x) => types[x] === a.t); break;
    case 'notHoldsType': add([PW(a.s)], (x) => types[x] !== a.t); break;
    case 'sameType': add([PW(a.a), PW(a.b)], (x, y) => types[x] === types[y]); break;
    case 'diffType': add([PW(a.a), PW(a.b)], (x, y) => types[x] !== types[y]); break;
    case 'adjacent': add([PR(a.a), PR(a.b)], (x, y) => adj[x][y]); break;
    case 'notAdjacent': add([PR(a.a), PR(a.b)], (x, y) => !adj[x][y]); break;
    case 'sameFloor': add([PR(a.a), PR(a.b)], (x, y) => floor[x] === floor[y]); break;
    case 'diffFloor': add([PR(a.a), PR(a.b)], (x, y) => floor[x] !== floor[y]); break;
    case 'ahead': add([PR(a.a), PR(a.b)], (x, y) => pos[x] < pos[y]); break;
    case 'weaponIn': each((s) => add([PW(s), PR(s)], (x, y) => (x === a.w) === (y === a.r))); break;
    case 'weaponNotIn': each((s) => add([PW(s), PR(s)], (x, y) => !(x === a.w && y === a.r))); break;
    case 'weaponNear': each((s) => add([PW(s), PR(s)], (x, y) => x !== a.w || adj[y][a.r])); break;
    case 'typeInRoom': each((s) => add([PW(s), PR(s)], (x, y) => y !== a.r || types[x] === a.t)); break;
    case 'notTypeInRoom': each((s) => add([PW(s), PR(s)], (x, y) => y !== a.r || types[x] !== a.t)); break;
    case 'traitWeapon': each((s) => { if (traits[s][a.k] !== a.v) add([PW(s)], (x) => x !== a.w); }); break;
    case 'traitRoom': each((s) => { if (traits[s][a.k] !== a.v) add([PR(s)], (x) => x !== a.r); }); break;
    case 'murderType': add([MW], (x) => types[x] === a.t); break;
    case 'murderNotType': add([MW], (x) => types[x] !== a.t); break;
    case 'murderNotSuspect': add([K], (x) => x !== a.s); break;
    case 'murderNextTo': add([K], (x) => x !== a.s); add([MR, PR(a.s)], (x, y) => adj[x][y]); break;
    case 'murderFarFrom': add([K], (x) => x !== a.s); add([MR, PR(a.s)], (x, y) => !adj[x][y]); break;
    case 'murderSameFloor': add([K], (x) => x !== a.s); add([MR, PR(a.s)], (x, y) => floor[x] === floor[y]); break;
    case 'murderAheadOf': add([MR, PR(a.s)], (x, y) => pos[x] < pos[y]); break;
    case 'murderBehind': add([MR, PR(a.s)], (x, y) => pos[x] > pos[y]); break;
    case 'murderNotWeapon': add([MW], (x) => x !== a.w); break;
    case 'murderNotRoom': add([MR], (x) => x !== a.r); break;
    case 'murderAdjRoom': add([MR], (x) => adj[x][a.r]); break;
    case 'murderNotAdjRoom': add([MR], (x) => x !== a.r && !adj[x][a.r]); break;
    case 'murderFloor': add([MR], (x) => floor[x] === a.f); break;
    case 'murderNotFloor': add([MR], (x) => floor[x] !== a.f); break;
    case 'murderTrait': add([K], (x) => traits[x][a.k] === a.v); break;
    default: throw new Error('human solver: unknown clue ' + type);
  }
  return out;
}

function buildCSP(ctx, clues) {
  const n = ctx.n;
  const PW = (s) => s, PR = (s) => n + s, K = 2 * n, MW = 2 * n + 1, MR = 2 * n + 2;
  const cons = [];
  const each = (f) => { for (let s = 0; s < n; s++) f(s); };
  clues.forEach((c, ci) => {
    const list = clueCons(ctx, c.type, c.args);
    if (c.speaker === null || c.speaker === undefined) { list.forEach((x) => cons.push({ clue: ci, vars: x.vars, pred: x.pred })); return; }
    // testimony: true unless the speaker is the killer, in which case it is false
    if (list.length !== 1) throw new Error('testimony must be one constraint: ' + c.type);
    const { vars, pred } = list[0], sp = c.speaker;
    if (vars.includes(K)) cons.push({ clue: ci, vars: [K], pred: (k) => (k === sp) !== pred(k) });
    else cons.push({ clue: ci, vars: [K, ...vars], pred: (k, x, y) => (k === sp) !== pred(x, y) });
  });
  // the killer is whoever holds the murder weapon and stands in the murder room
  each((s) => {
    cons.push({ clue: -1, vars: [K, PW(s), MW], pred: (k, w, mw) => (k === s) === (w === mw) });
    cons.push({ clue: -1, vars: [K, PR(s), MR], pred: (k, r, mr) => (k === s) === (r === mr) });
  });
  const groups = [[...Array(n).keys()].map(PW), [...Array(n).keys()].map(PR)];
  return { n, cons, groups, nv: 2 * n + 3, K, MW, MR, PW, PR };
}

const popcount = (x) => { let c = 0; while (x) { x &= x - 1; c++; } return c; };

// Remove candidates until nothing more follows. Returns false on contradiction.
function propagate(csp, dom, trace) {
  const { n, cons, groups } = csp;
  const full = (1 << n) - 1;
  const note = (v, removed, clue) => { if (trace && removed) trace.push({ v, removed, clue }); };
  let changed = true;
  while (changed) {
    changed = false;
    for (const con of cons) {
      const vs = con.vars, k = vs.length;
      const sup = [0, 0, 0];
      const d0 = dom[vs[0]], d1 = k > 1 ? dom[vs[1]] : 1, d2 = k > 2 ? dom[vs[2]] : 1;
      for (let x = 0; x < n; x++) {
        if (!(d0 & (1 << x))) continue;
        if (k === 1) { if (con.pred(x)) sup[0] |= 1 << x; continue; }
        for (let y = 0; y < n; y++) {
          if (!(d1 & (1 << y))) continue;
          if (k === 2) { if (con.pred(x, y)) { sup[0] |= 1 << x; sup[1] |= 1 << y; } continue; }
          for (let z = 0; z < n; z++) {
            if (!(d2 & (1 << z))) continue;
            if (con.pred(x, y, z)) { sup[0] |= 1 << x; sup[1] |= 1 << y; sup[2] |= 1 << z; }
          }
        }
      }
      for (let i = 0; i < k; i++) {
        const nd = dom[vs[i]] & sup[i];
        if (nd !== dom[vs[i]]) {
          note(vs[i], dom[vs[i]] & ~nd, con.clue);
          dom[vs[i]] = nd; changed = true;
          if (!nd) return false;
        }
      }
    }
    // each weapon / room is used exactly once
    for (const g of groups) {
      for (const v of g) {
        if (popcount(dom[v]) === 1) {
          for (const u of g) if (u !== v && (dom[u] & dom[v])) {
            note(u, dom[u] & dom[v], -1);
            dom[u] &= ~dom[v]; changed = true;
            if (!dom[u]) return false;
          }
        }
      }
      for (let x = 0; x < n; x++) {
        let only = -1, cnt = 0;
        for (const v of g) if (dom[v] & (1 << x)) { cnt++; only = v; }
        if (cnt === 0) return false;
        if (cnt === 1 && popcount(dom[only]) > 1) {
          note(only, dom[only] & ~(1 << x), -1);
          dom[only] = 1 << x; changed = true;
        }
      }
    }
  }
  return true;
}

// solved: every suspect's weapon and room, and the killer, are settled (the whole notebook, not just the answer)
const answered = (csp, dom) => dom.every((d) => popcount(d) === 1);

// Probing: assume a candidate; if that leads to a contradiction, it can be crossed out.
function probe(csp, dom, depth, stats) {
  let progress = true;
  while (progress && !answered(csp, dom)) {
    progress = false;
    for (let v = 0; v < csp.nv; v++) {
      for (let x = 0; x < csp.n; x++) {
        if (!(dom[v] & (1 << x)) || popcount(dom[v]) === 1) continue;
        const trial = dom.slice();
        trial[v] = 1 << x;
        stats.probes++;
        let ok = propagate(csp, trial);
        if (ok && depth > 1 && !answered(csp, trial)) ok = probe(csp, trial, depth - 1, stats);
        if (!ok) {
          dom[v] &= ~(1 << x);
          if (!dom[v] || !propagate(csp, dom)) return false;
          progress = true;
        }
      }
    }
  }
  return true;
}

// How hard is this case for a careful human? depth 0 = elimination only, 1 = needs a what-if, 2 = nested what-ifs.
function humanDifficulty(ctx, clues, maxDepth) {
  const csp = buildCSP(ctx, clues);
  const dom = new Array(csp.nv).fill((1 << ctx.n) - 1);
  const stats = { probes: 0 };
  if (!propagate(csp, dom)) return { depth: -1, probes: 0 };
  // how many could still be the killer (the liar) once plain elimination stalls
  const open = popcount(dom[csp.K]);
  if (answered(csp, dom)) return { depth: 0, probes: 0, open, dom };
  for (let d = 1; d <= (maxDepth || 2); d++) {
    const t = dom.slice(); stats.probes = 0;
    if (probe(csp, t, d, stats) && answered(csp, t)) return { depth: d, probes: stats.probes, open, dom: t };
  }
  return { depth: 99, probes: stats.probes, open };
}
