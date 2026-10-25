// Incremental candidate set used while building a case: every (weapon arrangement, room arrangement, motive
// arrangement) triple that still fits the clues so far, with a bitmask of who could be the killer in each.
// Adding a clue only ever shrinks the set, so building costs little more than one full scan.
function newSurvivors(ctx) {
  const n = ctx.n, N = permutations(n).perms.length, NC = motivePerms(ctx).perms.length, FULL = (1 << n) - 1;
  const size = N * N * NC;
  const A = new Uint16Array(size), B = new Uint16Array(size), Cc = new Uint16Array(size), M = new Uint8Array(size).fill(FULL);
  let k = 0;
  for (let a = 0; a < N; a++) for (let b = 0; b < N; b++) for (let c = 0; c < NC; c++) { A[k] = a; B[k] = b; Cc[k] = c; k++; }
  return { A, B, C: Cc, M, size };
}

// Applies `clue` to `src`, writing survivors into `dst`. Returns dst.
function narrow(ctx, src, clue, dst) {
  const { perms, inv } = permutations(ctx.n), MP = motivePerms(ctx);
  let out = 0;
  const keep = (i, m) => { dst.A[out] = src.A[i]; dst.B[out] = src.B[i]; dst.C[out] = src.C[i]; dst.M[out] = m; out++; };
  if (clue.kind === 'W' || clue.kind === 'R' || clue.kind === 'P') {
    const list = clue.kind === 'P' ? MP : { perms, inv };
    const pass = new Uint8Array(list.perms.length);
    for (let p = 0; p < list.perms.length; p++) {
      const x = list.perms[p], y = list.inv[p];
      pass[p] = (clue.kind === 'W' ? clue.test(x, y) : clue.kind === 'R' ? clue.test(null, null, x, y) : clue.test(null, null, null, null, x, y)) ? 1 : 0;
    }
    const key = clue.kind === 'W' ? src.A : clue.kind === 'R' ? src.B : src.C;
    for (let i = 0; i < src.size; i++) if (pass[key[i]]) keep(i, src.M[i]);
  } else {
    for (let i = 0; i < src.size; i++) {
      const a = src.A[i], b = src.B[i], c = src.C[i];
      const v = clue.test(perms[a], inv[a], perms[b], inv[b], MP.perms[c], MP.inv[c]);
      if (clue.kind === 'X') { if (v) keep(i, src.M[i]); } else { const m = src.M[i] & v; if (m) keep(i, m); }
    }
  }
  dst.size = out;
  return dst;
}

// How many whole worlds (weapons, rooms, motives and killer) survive?
function countSurvivingWorlds(ctx, set) {
  let count = 0;
  for (let i = 0; i < set.size; i++) count += popcount(set.M[i]);
  return count;
}
