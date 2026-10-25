// Exhaustive logic solver. Weapon-only and room-only clues are applied to the permutation lists
// first, so the expensive cross product only runs over what survives. A world is a whole story: every
// suspect's weapon and room, and the killer. A puzzle is fair only if exactly one world survives, so the
// whole notebook can be filled in, not just the answer. `answers` lists the distinct (killer, weapon, room).
function solveCount(ctx, clues, limit) {
  const { n } = ctx;
  const { perms, inv } = permutations(n);
  const FULL = (1 << n) - 1;
  const wClues = clues.filter((c) => c.kind === 'W');
  const rClues = clues.filter((c) => c.kind === 'R');
  const xClues = clues.filter((c) => c.kind === 'X');
  const mClues = clues.filter((c) => c.kind === 'M');

  const LA = [];
  for (let a = 0; a < perms.length; a++) {
    let ok = true;
    for (const c of wClues) if (!c.test(perms[a], inv[a], null, null)) { ok = false; break; }
    if (ok) LA.push(a);
  }
  const LB = [];
  for (let b = 0; b < perms.length; b++) {
    let ok = true;
    for (const c of rClues) if (!c.test(null, null, perms[b], inv[b])) { ok = false; break; }
    if (ok) LB.push(b);
  }

  const seen = new Uint8Array(n * n * n);
  const answers = [], worlds = [];
  const lim = limit === undefined ? Infinity : limit;
  for (let ia = 0; ia < LA.length; ia++) {
    const pw = perms[LA[ia]], pwi = inv[LA[ia]];
    for (let ib = 0; ib < LB.length; ib++) {
      const pr = perms[LB[ib]], pri = inv[LB[ib]];
      let ok = true;
      for (let k = 0; k < xClues.length; k++) {
        if (!xClues[k].test(pw, pwi, pr, pri)) { ok = false; break; }
      }
      if (!ok) continue;
      let mask = FULL;
      for (let k = 0; k < mClues.length && mask; k++) mask &= mClues[k].test(pw, pwi, pr, pri);
      if (!mask) continue;
      for (let m = 0; m < n; m++) {
        if (!(mask & (1 << m))) continue;
        worlds.push({ pw, pr, m });
        const key = (m * n + pw[m]) * n + pr[m];
        if (!seen[key]) { seen[key] = 1; answers.push({ killer: m, weapon: pw[m], room: pr[m] }); }
        if (worlds.length > lim) return { count: worlds.length, worlds, answers, capped: true };
      }
    }
  }
  return { count: worlds.length, worlds, answers, capped: false };
}

// Every full arrangement that fits the clues (used for hints and for checking player grids).
// Returns the marginal "possible" matrices: which suspect/weapon/room cells survive in at least
// one consistent world.
function marginals(ctx, clues) {
  const { n } = ctx;
  const { perms, inv } = permutations(n);
  const FULL = (1 << n) - 1;
  const wClues = clues.filter((c) => c.kind === 'W');
  const rClues = clues.filter((c) => c.kind === 'R');
  const xClues = clues.filter((c) => c.kind === 'X');
  const mClues = clues.filter((c) => c.kind === 'M');
  const sw = Array.from({ length: n }, () => new Uint8Array(n));
  const sr = Array.from({ length: n }, () => new Uint8Array(n));
  const wr = Array.from({ length: n }, () => new Uint8Array(n));
  const killer = new Uint8Array(n);
  let worlds = 0;
  const LA = [], LB = [];
  for (let a = 0; a < perms.length; a++) if (wClues.every((c) => c.test(perms[a], inv[a], null, null))) LA.push(a);
  for (let b = 0; b < perms.length; b++) if (rClues.every((c) => c.test(null, null, perms[b], inv[b]))) LB.push(b);
  for (const a of LA) {
    const pw = perms[a], pwi = inv[a];
    for (const b of LB) {
      const pr = perms[b], pri = inv[b];
      if (!xClues.every((c) => c.test(pw, pwi, pr, pri))) continue;
      let mask = FULL;
      for (const c of mClues) mask &= c.test(pw, pwi, pr, pri);
      if (!mask) continue;
      worlds++;
      for (let s = 0; s < n; s++) { sw[s][pw[s]] = 1; sr[s][pr[s]] = 1; wr[pw[s]][pr[s]] = 1; }
      for (let m = 0; m < n; m++) if (mask & (1 << m)) killer[m] = 1;
    }
  }
  return { sw, sr, wr, killer, worlds };
}
