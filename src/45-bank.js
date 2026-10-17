// Cases can be saved as small specs (what was picked, the hidden truth, which clues in which wording)
// and rebuilt instantly, so curated cases ship with the page and load with no searching.
function exportPuzzle(p) {
  const { ctx } = p;
  return {
    s: p.seed, t: p.tier, w: p.worldId, ti: p.title, r: p.rating, h: [p.human.depth, p.human.probes],
    S: ctx.suspectIdx, W: ctx.weaponIdx, R: ctx.roomIdx,
    pw: p.truth.pw, pr: p.truth.pr, m: p.truth.m,
    c: p.clues.map((c) => [c.type, c.args, c.vi, c.speaker]),
  };
}

function importPuzzle(spec) {
  const world = WORLDS[spec.w];
  const ctx = buildCtx(world, spec.S, spec.W, spec.R);
  const pool = enumerateClues(ctx);
  const key = (type, args) => type + JSON.stringify(args);
  const byKey = new Map(pool.map((c) => [key(c.type, c.args), c]));
  const clues = varyWording(spec.c.map(([type, args, vi, speaker]) => {
    const c = byKey.get(key(type, args));
    if (!c) throw new Error('bank clue not found: ' + type);
    const v = clueVariants(c, ctx)[vi];
    return { type, kind: c.kind, family: c.family, args, voice: v[0], speaker, text: v[1], vi, test: c.test };
  }));
  const truth = { pw: spec.pw, pr: spec.pr, m: spec.m };
  const tier = TIERS[spec.t];
  return {
    seed: spec.s, tier: spec.t, tierName: tier.name, worldId: spec.w, n: ctx.n, ctx, clues,
    solution: { killer: truth.m, weapon: truth.pw[truth.m], room: truth.pr[truth.m] },
    truth, rating: spec.r, human: { depth: spec.h[0], probes: spec.h[1] }, title: spec.ti, strict: true,
  };
}
