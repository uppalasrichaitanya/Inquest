// A "case context" is the slice of a world in play tonight: n suspects, n weapons, n rooms.
// Every clue is a small closure over the context that can be tested against any candidate
// arrangement (pw: suspect->weapon, pwi: weapon->suspect, pr: suspect->room, pri: room->suspect).

function rectsAdjacent(a, b) {
  const horiz = (a.x + a.w === b.x || b.x + b.w === a.x) && a.y < b.y + b.h && b.y < a.y + a.h;
  const vert = (a.y + a.h === b.y || b.y + b.h === a.y) && a.x < b.x + b.w && b.x < a.x + a.w;
  return horiz || vert;
}

function buildCtx(world, suspectPick, weaponPick, roomPick, motivePick) {
  const n = suspectPick.length;
  const rooms = roomPick.map((i) => world.rooms[i]);
  const adj = rooms.map((a) => rooms.map((b) => a !== b && rectsAdjacent(a.rect, b.rect)));
  const maxY = Math.max(...world.rooms.map((r) => r.rect.y));
  const floor = rooms.map((r) => (world.floors ? maxY - r.rect.y : 0));
  const pos = rooms.map((r) => r.rect.x);
  const suspects = suspectPick.map((i) => world.suspects[i]);
  return {
    world, n, suspects,
    weapons: weaponPick.map((i) => world.weapons[i]),
    rooms, adj, floor, pos,
    types: weaponPick.map((i) => world.weapons[i].type),
    traits: suspects.map((s) => s.traits),
    wattr: Object.fromEntries(WEAPON_ATTR_KEYS.map((k) => [k, weaponPick.map((i) => world.weapons[i][k])])),
    light: rooms.map((r) => r.light),
    motives: motivePick ? motivePick.map((i) => MOTIVES[i]) : null,
    roomIdx: roomPick, suspectIdx: suspectPick, weaponIdx: weaponPick, motiveIdx: motivePick || null,
  };
}

// kind: W = weapons only, R = rooms only, X = both, M = murder (returns a bitmask of possible killers)
// family: direct | neg | link | rel | murder | trait -- used to tune difficulty
function C(type, kind, family, args, test) {
  return { type, kind, family, args, test };
}

function enumerateClues(ctx) {
  const { n, adj, floor, pos, types, traits, world, wattr, light } = ctx;
  const S = [...Array(n).keys()];
  const out = [];
  const typeSet = [...new Set(types)];
  const floorSet = [...new Set(floor)];
  const hasFloors = world.relations.includes('floor');
  const hasAhead = world.relations.includes('ahead');
  const FULL = (1 << n) - 1;
  const maskOf = (f) => { let m = 0; for (const s of S) if (f(s)) m |= 1 << s; return m; };
  // trait values that split tonight's suspects (a trait everyone shares tells nobody anything)
  const traitVals = [];
  for (const k of TRAIT_KEYS) {
    const vals = [...new Set(traits.map((t) => t[k]))];
    if (vals.length > 1) for (const v of vals) traitVals.push([k, v]);
  }

  for (const s of S) for (const w of S) {
    out.push(C('has', 'W', 'direct', { s, w }, (pw) => pw[s] === w));
    out.push(C('notHas', 'W', 'neg', { s, w }, (pw) => pw[s] !== w));
  }
  for (const s of S) for (const r of S) {
    out.push(C('in', 'R', 'direct', { s, r }, (pw, pwi, pr) => pr[s] === r));
    out.push(C('notIn', 'R', 'neg', { s, r }, (pw, pwi, pr) => pr[s] !== r));
  }
  for (const w of S) for (const a of S) for (const b of S) if (a < b) {
    out.push(C('eitherHas', 'W', 'rel', { w, a, b }, (pw, pwi) => pwi[w] === a || pwi[w] === b));
  }
  for (const r of S) for (const a of S) for (const b of S) if (a < b) {
    out.push(C('eitherIn', 'R', 'rel', { r, a, b }, (pw, pwi, pr, pri) => pri[r] === a || pri[r] === b));
  }
  for (const s of S) for (const t of typeSet) {
    out.push(C('holdsType', 'W', 'link', { s, t }, (pw) => types[pw[s]] === t));
    out.push(C('notHoldsType', 'W', 'neg', { s, t }, (pw) => types[pw[s]] !== t));
  }
  for (const a of S) for (const b of S) if (a < b) {
    out.push(C('sameType', 'W', 'rel', { a, b }, (pw) => types[pw[a]] === types[pw[b]]));
    out.push(C('diffType', 'W', 'rel', { a, b }, (pw) => types[pw[a]] !== types[pw[b]]));
    out.push(C('adjacent', 'R', 'rel', { a, b }, (pw, pwi, pr) => adj[pr[a]][pr[b]]));
    out.push(C('notAdjacent', 'R', 'rel', { a, b }, (pw, pwi, pr) => !adj[pr[a]][pr[b]]));
    if (hasFloors) {
      out.push(C('sameFloor', 'R', 'rel', { a, b }, (pw, pwi, pr) => floor[pr[a]] === floor[pr[b]]));
      out.push(C('diffFloor', 'R', 'rel', { a, b }, (pw, pwi, pr) => floor[pr[a]] !== floor[pr[b]]));
    }
  }
  if (hasAhead) for (const a of S) for (const b of S) if (a !== b) {
    out.push(C('ahead', 'R', 'rel', { a, b }, (pw, pwi, pr) => pos[pr[a]] < pos[pr[b]]));
  }
  for (const w of S) for (const r of S) {
    out.push(C('weaponIn', 'X', 'link', { w, r }, (pw, pwi, pr) => pr[pwi[w]] === r));
    out.push(C('weaponNotIn', 'X', 'neg', { w, r }, (pw, pwi, pr) => pr[pwi[w]] !== r));
    out.push(C('weaponNear', 'X', 'link', { w, r }, (pw, pwi, pr) => adj[pr[pwi[w]]][r]));
  }
  for (const r of S) for (const t of typeSet) {
    out.push(C('typeInRoom', 'X', 'link', { r, t }, (pw, pwi, pr, pri) => types[pw[pri[r]]] === t));
    out.push(C('notTypeInRoom', 'X', 'neg', { r, t }, (pw, pwi, pr, pri) => types[pw[pri[r]]] !== t));
  }
  // ---- traits: a hair on the weapon, a footprint in the room. Read them off the suspects' cards.
  for (const [k, v] of traitVals) {
    for (const w of S) out.push(C('traitWeapon', 'W', 'trait', { w, k, v }, (pw, pwi) => traits[pwi[w]][k] === v));
    for (const r of S) out.push(C('traitRoom', 'R', 'trait', { r, k, v }, (pw, pwi, pr, pri) => traits[pri[r]][k] === v));
  }

  // ---- weapon attributes (weight, material) and lit or dark rooms: read them off the weapon and room cards
  for (const k of WEAPON_ATTR_KEYS) for (const v of [...new Set(wattr[k])]) {
    if (new Set(wattr[k]).size < 2) break;
    for (const s of S) out.push(C('holdsAttr', 'W', 'link', { s, k, v }, (pw) => wattr[k][pw[s]] === v));
    for (const r of S) out.push(C('attrInRoom', 'X', 'link', { r, k, v }, (pw, pwi, pr, pri) => wattr[k][pw[pri[r]]] === v));
    out.push(C('murderAttr', 'M', 'murder', { k, v }, (pw) => maskOf((m) => wattr[k][pw[m]] === v)));
  }
  if (new Set(light).size > 1) for (const v of [...new Set(light)]) {
    for (const s of S) out.push(C('inLight', 'R', 'link', { s, v }, (pw, pwi, pr) => light[pr[s]] === v));
    for (const w of S) out.push(C('weaponLight', 'X', 'link', { w, v }, (pw, pwi, pr) => light[pr[pwi[w]]] === v));
    out.push(C('murderLight', 'M', 'murder', { v }, (pw, pwi, pr) => maskOf((m) => light[pr[m]] === v)));
  }
  // ---- motives (only in cases that have them): each suspect had a different one
  if (ctx.motives) {
    for (const s of S) for (const m of S) {
      out.push(C('hasMotive', 'P', 'direct', { s, m }, (pw, pwi, pr, pri, pm) => pm[s] === m));
      out.push(C('notMotive', 'P', 'neg', { s, m }, (pw, pwi, pr, pri, pm) => pm[s] !== m));
    }
    for (const m of S) for (const a of S) for (const b of S) if (a < b) {
      out.push(C('eitherMotive', 'P', 'rel', { m, a, b }, (pw, pwi, pr, pri, pm, pmi) => pmi[m] === a || pmi[m] === b));
    }
    for (const m of S) {
      for (const w of S) {
        out.push(C('motiveWeapon', 'X', 'link', { m, w }, (pw, pwi, pr, pri, pm, pmi) => pw[pmi[m]] === w));
        out.push(C('motiveNotWeapon', 'X', 'neg', { m, w }, (pw, pwi, pr, pri, pm, pmi) => pw[pmi[m]] !== w));
      }
      for (const r of S) {
        out.push(C('motiveRoom', 'X', 'link', { m, r }, (pw, pwi, pr, pri, pm, pmi) => pr[pmi[m]] === r));
        out.push(C('motiveNotRoom', 'X', 'neg', { m, r }, (pw, pwi, pr, pri, pm, pmi) => pr[pmi[m]] !== r));
      }
      out.push(C('murderMotive', 'M', 'murder', { m }, (pw, pwi, pr, pri, pm) => maskOf((x) => pm[x] === m)));
      out.push(C('murderNotMotive', 'M', 'murder', { m }, (pw, pwi, pr, pri, pm) => maskOf((x) => pm[x] !== m)));
    }
  }

  // ---- murder clues: each returns the set of suspects who could still be the killer
  for (const t of typeSet) {
    out.push(C('murderType', 'M', 'murder', { t }, (pw) => maskOf((m) => types[pw[m]] === t)));
    out.push(C('murderNotType', 'M', 'murder', { t }, (pw) => maskOf((m) => types[pw[m]] !== t)));
  }
  for (const s of S) {
    out.push(C('murderNotSuspect', 'M', 'murder', { s }, () => FULL & ~(1 << s)));
    out.push(C('murderNextTo', 'M', 'murder', { s }, (pw, pwi, pr) => maskOf((m) => m !== s && adj[pr[m]][pr[s]])));
    out.push(C('murderFarFrom', 'M', 'murder', { s }, (pw, pwi, pr) => maskOf((m) => m !== s && !adj[pr[m]][pr[s]])));
    if (hasFloors) out.push(C('murderSameFloor', 'M', 'murder', { s }, (pw, pwi, pr) => maskOf((m) => m !== s && floor[pr[m]] === floor[pr[s]])));
    if (hasAhead) {
      out.push(C('murderAheadOf', 'M', 'murder', { s }, (pw, pwi, pr) => maskOf((m) => pos[pr[m]] < pos[pr[s]])));
      out.push(C('murderBehind', 'M', 'murder', { s }, (pw, pwi, pr) => maskOf((m) => pos[pr[m]] > pos[pr[s]])));
    }
  }
  for (const w of S) out.push(C('murderNotWeapon', 'M', 'murder', { w }, (pw) => maskOf((m) => pw[m] !== w)));
  for (const r of S) {
    out.push(C('murderNotRoom', 'M', 'murder', { r }, (pw, pwi, pr) => maskOf((m) => pr[m] !== r)));
    out.push(C('murderAdjRoom', 'M', 'murder', { r }, (pw, pwi, pr) => maskOf((m) => adj[pr[m]][r])));
    out.push(C('murderNotAdjRoom', 'M', 'murder', { r }, (pw, pwi, pr) => maskOf((m) => pr[m] !== r && !adj[pr[m]][r])));
  }
  if (hasFloors) for (const f of floorSet) {
    out.push(C('murderFloor', 'M', 'murder', { f }, (pw, pwi, pr) => maskOf((m) => floor[pr[m]] === f)));
    out.push(C('murderNotFloor', 'M', 'murder', { f }, (pw, pwi, pr) => maskOf((m) => floor[pr[m]] !== f)));
  }
  for (const [k, v] of traitVals) out.push(C('murderTrait', 'M', 'murder', { k, v }, () => maskOf((m) => traits[m][k] === v)));
  return out;
}

// ---- testimony. Every suspect says one thing. The innocent tell the truth; the killer lies.
// Only statements a person could sensibly make, and that the human solver can turn into one small constraint
// (so it can also be negated), can be testimony. Everything else is evidence, which is always true.
const TESTIMONY_TYPES = ['has', 'notHas', 'in', 'notIn', 'eitherHas', 'eitherIn', 'holdsType', 'notHoldsType', 'sameType', 'diffType',
  'adjacent', 'notAdjacent', 'sameFloor', 'diffFloor', 'ahead', 'murderNotSuspect', 'murderType', 'murderNotType', 'murderNotWeapon',
  'murderNotRoom', 'murderFloor', 'murderNotFloor', 'murderAdjRoom', 'murderNotAdjRoom', 'murderTrait',
  'holdsAttr', 'inLight', 'murderAttr', 'murderLight', 'hasMotive', 'notMotive', 'eitherMotive', 'murderMotive', 'murderNotMotive'];

// A statement by `sp`, as a murder clue: in each arrangement, the killers it allows are those for whom it is
// consistent (the statement is true and sp is not the killer, or it is false and sp is).
function testimony(c, sp, n) {
  const FULL = (1 << n) - 1, me = 1 << sp, base = c.test, M = c.kind === 'M';
  const test = (pw, pwi, pr, pri, pm, pmi) => ((M ? base(pw, pwi, pr, pri, pm, pmi) : base(pw, pwi, pr, pri, pm, pmi) ? FULL : 0) ^ me) & FULL;
  return { type: c.type, kind: 'M', baseKind: c.kind, family: c.family, args: c.args, speaker: sp, test, base: c };
}
// the inverse of a permutation (who holds weapon w, who is in room r, whose motive is m)
const invert = (p) => { if (!p) return null; const q = new Array(p.length); p.forEach((x, i) => { q[x] = i; }); return q; };
// Is the statement itself true in this arrangement (ignoring who said it)?
function statementTrue(c, truth) {
  const b = c.base || c, v = b.test(truth.pw, invert(truth.pw), truth.pr, invert(truth.pr), truth.pm || null, invert(truth.pm));
  return b.kind === 'M' ? (v & (1 << truth.m)) !== 0 : v;
}

// Does the clue hold for the hidden truth {pw, pr, m}?
function clueHolds(clue, truth) {
  const v = clue.test(truth.pw, invert(truth.pw), truth.pr, invert(truth.pr), truth.pm || null, invert(truth.pm));
  return clue.kind === 'M' ? (v & (1 << truth.m)) !== 0 : v;
}
