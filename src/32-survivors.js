// Incremental candidate set used while building a case: every (weapon arrangement, room arrangement)
// pair that still fits the clues so far, with a bitmask of who could be the killer in each.
// Adding a clue only ever shrinks the set, so building costs little more than one full scan.
function newSurvivors(ctx) {
  const n = ctx.n, N = permutations(n).perms.length, FULL = (1 << n) - 1;
  const size = N * N;
  const A = new Uint16Array(size), B = new Uint16Array(size), M = new Uint8Array(size).fill(FULL);
  let k = 0;
  for (let a = 0; a < N; a++) for (let b = 0; b < N; b++) { A[k] = a; B[k] = b; k++; }
  return { A, B, M, size };
}

// Applies `clue` to `src`, writing survivors into `dst`. Returns dst.
function narrow(ctx, src, clue, dst) {
  const { perms, inv } = permutations(ctx.n);
  const N = perms.length;
  let out = 0;
  if (clue.kind === 'W' || clue.kind === 'R') {
    const pass = new Uint8Array(N);
    for (let p = 0; p < N; p++) {
      pass[p] = clue.kind === 'W' ? (clue.test(perms[p], inv[p], null, null) ? 1 : 0) : (clue.test(null, null, perms[p], inv[p]) ? 1 : 0);
    }
    const key = clue.kind === 'W' ? src.A : src.B;
    for (let i = 0; i < src.size; i++) {
      if (!pass[key[i]]) continue;
      dst.A[out] = src.A[i]; dst.B[out] = src.B[i]; dst.M[out] = src.M[i]; out++;
    }
  } else if (clue.kind === 'X') {
    for (let i = 0; i < src.size; i++) {
      const a = src.A[i], b = src.B[i];
      if (!clue.test(perms[a], inv[a], perms[b], inv[b])) continue;
      dst.A[out] = a; dst.B[out] = b; dst.M[out] = src.M[i]; out++;
    }
  } else {
    for (let i = 0; i < src.size; i++) {
      const a = src.A[i], b = src.B[i];
      const m = src.M[i] & clue.test(perms[a], inv[a], perms[b], inv[b]);
      if (!m) continue;
      dst.A[out] = a; dst.B[out] = b; dst.M[out] = m; out++;
    }
  }
  dst.size = out;
  return dst;
}

// How many whole worlds (weapons, rooms and killer) survive?
function countSurvivingWorlds(ctx, set) {
  let count = 0;
  for (let i = 0; i < set.size; i++) count += popcount(set.M[i]);
  return count;
}
