// A "case context" is the slice of a world in play tonight: n suspects, n weapons, n rooms.
// Every clue is a small closure over the context that can be tested against any candidate
// arrangement (pw: suspect->weapon, pwi: weapon->suspect, pr: suspect->room, pri: room->suspect).

function rectsAdjacent(a, b) {
  const horiz = (a.x + a.w === b.x || b.x + b.w === a.x) && a.y < b.y + b.h && b.y < a.y + a.h;
  const vert = (a.y + a.h === b.y || b.y + b.h === a.y) && a.x < b.x + b.w && b.x < a.x + a.w;
  return horiz || vert;
}

function buildCtx(world, suspectPick, weaponPick, roomPick) {
  const n = suspectPick.length;
  const rooms = roomPick.map((i) => world.rooms[i]);
  const adj = rooms.map((a) => rooms.map((b) => a !== b && rectsAdjacent(a.rect, b.rect)));
  const maxY = Math.max(...world.rooms.map((r) => r.rect.y));
  const floor = rooms.map((r) => (world.floors ? maxY - r.rect.y : 0));
  const pos = rooms.map((r) => r.rect.x);
  return {
    world, n,
    suspects: suspectPick.map((i) => world.suspects[i]),
    weapons: weaponPick.map((i) => world.weapons[i]),
    rooms, adj, floor, pos,
    types: weaponPick.map((i) => world.weapons[i].type),
    roomIdx: roomPick, suspectIdx: suspectPick, weaponIdx: weaponPick,
  };
}

// kind: W = weapons only, R = rooms only, X = both, M = murder (returns a bitmask of possible killers)
// family: direct | neg | link | rel | murder -- used to tune difficulty
function C(type, kind, family, args, test) {
  return { type, kind, family, args, test };
}

function enumerateClues(ctx) {
  const { n, adj, floor, pos, types, world } = ctx;
  const S = [...Array(n).keys()];
  const out = [];
  const typeSet = [...new Set(types)];
  const floorSet = [...new Set(floor)];
  const hasFloors = world.relations.includes('floor');
  const hasAhead = world.relations.includes('ahead');
  const FULL = (1 << n) - 1;
  const maskOf = (f) => { let m = 0; for (const s of S) if (f(s)) m |= 1 << s; return m; };

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
  return out;
}

// Does the clue hold for the hidden truth {pw, pr, m}?
function clueHolds(clue, truth, pwi, pri) {
  const v = clue.test(truth.pw, pwi, truth.pr, pri);
  return clue.kind === 'M' ? (v & (1 << truth.m)) !== 0 : v;
}
