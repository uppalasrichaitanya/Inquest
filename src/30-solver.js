// Exhaustive logic solver. A world is a whole story: every suspect's weapon (a permutation), room (another) and,
// in cases with motives, motive (a third), plus the killer. Weapon-only, room-only and motive-only clues are
// applied to the permutation lists first, so the expensive cross product only runs over what survives. A puzzle
// is fair only if exactly one world survives, so the whole notebook can be filled in, not just the answer.
// Every clue test takes (pw, pwi, pr, pri, pm, pmi); pm and pmi are null in a case without motives.

// the motive arrangements to walk: all of them, or a single "none" when the case has no motives
function motivePerms(ctx) {
  return ctx.motives ? permutations(ctx.n) : { perms: [null], inv: [null] };
}
// the arrangements that pass every one-dimensional clue of a kind (W weapons, R rooms, P motives)
function passing(ctx, clues, kind) {
  const { perms, inv } = kind === 'P' ? motivePerms(ctx) : permutations(ctx.n);
  const cs = clues.filter((c) => c.kind === kind), out = [];
  for (let i = 0; i < perms.length; i++) {
    const p = perms[i], q = inv[i];
    if (cs.every((c) => (kind === 'W' ? c.test(p, q) : kind === 'R' ? c.test(null, null, p, q) : c.test(null, null, null, null, p, q)))) out.push(i);
  }
  return out;
}

// Walk every world that fits the clues, calling visit(pw, pwi, pr, pri, pm, pmi, killerMask); stop when it returns true.
function eachWorld(ctx, clues, visit) {
  const { n } = ctx, { perms, inv } = permutations(n), MP = motivePerms(ctx);
  const FULL = (1 << n) - 1;
  const xClues = clues.filter((c) => c.kind === 'X'), mClues = clues.filter((c) => c.kind === 'M');
  const LA = passing(ctx, clues, 'W'), LB = passing(ctx, clues, 'R'), LC = passing(ctx, clues, 'P');
  for (const a of LA) {
    const pw = perms[a], pwi = inv[a];
    for (const b of LB) {
      const pr = perms[b], pri = inv[b];
      for (const c of LC) {
        const pm = MP.perms[c], pmi = MP.inv[c];
        let ok = true;
        for (let k = 0; k < xClues.length; k++) if (!xClues[k].test(pw, pwi, pr, pri, pm, pmi)) { ok = false; break; }
        if (!ok) continue;
        let mask = FULL;
        for (let k = 0; k < mClues.length && mask; k++) mask &= mClues[k].test(pw, pwi, pr, pri, pm, pmi);
        if (mask && visit(pw, pwi, pr, pri, pm, pmi, mask)) return;
      }
    }
  }
}

function solveCount(ctx, clues, limit) {
  const { n } = ctx;
  const seen = new Uint8Array(n * n * n);
  const answers = [], worlds = [];
  const lim = limit === undefined ? Infinity : limit;
  let capped = false;
  eachWorld(ctx, clues, (pw, pwi, pr, pri, pm, pmi, mask) => {
    for (let m = 0; m < n; m++) {
      if (!(mask & (1 << m))) continue;
      worlds.push({ pw, pr, pm, m });
      const key = (m * n + pw[m]) * n + pr[m];
      if (!seen[key]) { seen[key] = 1; answers.push({ killer: m, weapon: pw[m], room: pr[m], motive: pm ? pm[m] : null }); }
      if (worlds.length > lim) { capped = true; return true; }
    }
    return false;
  });
  return { count: worlds.length, worlds, answers, capped };
}

// Every full arrangement that fits the clues (used for hints and for checking player grids).
// Returns the marginal "possible" matrices: which cells survive in at least one consistent world.
function marginals(ctx, clues) {
  const { n } = ctx;
  const mat = () => Array.from({ length: n }, () => new Uint8Array(n));
  const sw = mat(), sr = mat(), wr = mat(), sm = mat();
  const killer = new Uint8Array(n);
  let worlds = 0;
  eachWorld(ctx, clues, (pw, pwi, pr, pri, pm, pmi, mask) => {
    worlds++;
    for (let s = 0; s < n; s++) { sw[s][pw[s]] = 1; sr[s][pr[s]] = 1; wr[pw[s]][pr[s]] = 1; if (pm) sm[s][pm[s]] = 1; }
    for (let m = 0; m < n; m++) if (mask & (1 << m)) killer[m] = 1;
    return false;
  });
  return { sw, sr, wr, sm, killer, worlds };
}
