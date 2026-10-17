const TIERS = {
  // The on-ramp: four suspects, mostly plain testimony, and no step that needs a "what if?".
  // `avoid` keeps out the clue shapes new players find hardest to read (layout negatives, relative positions).
  constable: {
    id: 'constable', name: 'Constable', blurb: 'Four suspects. A gentle start.',
    n: 4, minClues: 4, maxClues: 7, maxDirect: 3, minIndirect: 0, minTypes: 3,
    weights: { direct: 2.0, neg: 1.4, link: 0.9, rel: 0.5, murder: 1.2 },
    avoid: ['murderFarFrom', 'murderNotAdjRoom', 'murderNextTo', 'murderAdjRoom', 'murderAheadOf', 'murderBehind', 'murderSameFloor',
      'notAdjacent', 'diffType', 'diffFloor', 'weaponNear', 'weaponNotIn', 'notTypeInRoom', 'ahead', 'sameType'],
    accept: (h) => h.depth === 0, stars: 1,
  },
  detective: {
    id: 'detective', name: 'Detective', blurb: 'Five suspects. Patient reasoning.',
    n: 5, minClues: 6, maxClues: 10, maxDirect: 1, minIndirect: 3, minTypes: 4,
    weights: { direct: 0.4, neg: 1.0, link: 1.2, rel: 1.2, murder: 1.6 },
    accept: (h) => h.depth <= 1 && h.probes <= 30, stars: 2,
  },
  inspector: {
    id: 'inspector', name: 'Inspector', blurb: 'Six suspects. Fewer gifts.',
    n: 6, minClues: 8, maxClues: 13, maxDirect: 1, minIndirect: 5, minTypes: 6,
    weights: { direct: 0.2, neg: 1.0, link: 1.3, rel: 1.5, murder: 1.5 },
    accept: (h) => h.depth === 1 && h.probes >= 25 && h.probes <= 75, stars: 3,
  },
  mastermind: {
    id: 'mastermind', name: 'Mastermind', blurb: 'Six suspects. No direct testimony at all.',
    n: 6, minClues: 8, maxClues: 14, maxDirect: 0, minIndirect: 7, minTypes: 7,
    weights: { direct: 0, neg: 0.8, link: 1.4, rel: 1.8, murder: 1.4 },
    accept: (h) => h.depth === 2 || (h.depth === 1 && h.probes >= 55), stars: 4,
  },
};

const TITLES = {
  manor: ['The Blackwood Affair', 'A Quiet Dinner at Blackwood', 'Murder by Candlelight', 'The Storm at Blackwood'],
  train: ['Death on the Meridian', 'The Last Carriage', 'Murder in the Mountains', 'The Night Express'],
};

function pickN(rng, count, n) {
  return rng.shuffle([...Array(count).keys()]).slice(0, n).sort((a, b) => a - b);
}

function validPicks(world, ctx) {
  const types = ctx.types;
  const distinct = new Set(types).size;
  const dup = types.length - distinct;
  if (distinct < 3 || dup < 1) return false;
  if (world.relations.includes('floor') && new Set(ctx.floor).size < 2) return false;
  // there must be some adjacency among the rooms in play, or the layout clues are dead weight
  let edges = 0;
  for (let i = 0; i < ctx.n; i++) for (let j = i + 1; j < ctx.n; j++) if (ctx.adj[i][j]) edges++;
  return edges >= 2;
}

function attempt(rng, tier, worldId) {
  const world = WORLDS[worldId];
  const n = tier.n;
  let ctx, tries = 0;
  do {
    ctx = buildCtx(world, pickN(rng, world.suspects.length, n), pickN(rng, world.weapons.length, n), pickN(rng, world.rooms.length, n));
  } while (!validPicks(world, ctx) && ++tries < 200);

  const { perms, inv } = permutations(n);
  const pw = perms[rng.int(perms.length)], pr = perms[rng.int(perms.length)];
  const pwi = inv[perms.indexOf(pw)], pri = inv[perms.indexOf(pr)];
  const truth = { pw, pr, m: rng.int(n) };

  const pool = enumerateClues(ctx).filter((c) => clueHolds(c, truth, pwi, pri) && !(tier.avoid && tier.avoid.includes(c.type)));
  const perType = {};
  pool.forEach((c) => { perType[c.type] = (perType[c.type] || 0) + 1; });
  const alive = pool.map(() => true);
  const usedType = {};
  const chosen = [];
  let direct = 0, count = n * n * n * 2; // anything above the true maximum
  let cur = newSurvivors(ctx), spare = newSurvivors(ctx);
  while (chosen.length < tier.maxClues + 8) {
    // every kind of clue gets a fair turn, however many instances of it happen to be true
    const w = pool.map((c, j) => alive[j] ? (tier.weights[c.family] || 0) / perType[c.type] * Math.pow(0.3, usedType[c.type] || 0) : 0);
    const i = rng.weighted(w);
    if (i < 0) return null;
    alive[i] = false;
    const c = pool[i];
    if (c.family === 'direct' && direct >= tier.maxDirect) continue;
    narrow(ctx, cur, c, spare);
    const cnt = countSurvivingAnswers(ctx, spare);
    if (cnt >= count) continue; // adds nothing right now
    [cur, spare] = [spare, cur];
    chosen.push(c);
    usedType[c.type] = (usedType[c.type] || 0) + 1;
    if (c.family === 'direct') direct++;
    count = cnt;
    if (count === 1) break;
  }
  if (count !== 1) return null;

  // squeeze out every clue that is not pulling its weight
  for (const c of rng.shuffle(chosen)) {
    const rest = chosen.filter((x) => x !== c);
    if (solveCount(ctx, rest, 1).count === 1) chosen.splice(chosen.indexOf(c), 1);
  }
  const indirect = chosen.filter((c) => c.family !== 'direct' && c.family !== 'neg').length;
  if (chosen.length < tier.minClues || chosen.length > tier.maxClues || indirect < tier.minIndirect) return null;
  const typeCount = {};
  chosen.forEach((c) => { typeCount[c.type] = (typeCount[c.type] || 0) + 1; });
  if (Object.keys(typeCount).length < tier.minTypes || Math.max(...Object.values(typeCount)) > 3) return null;
  const murders = chosen.filter((c) => c.kind === 'M').length;
  if (murders < 2 || murders > Math.ceil(chosen.length * 0.55)) return null;
  const human = humanDifficulty(ctx, chosen, 2);
  if (human.depth < 0 || human.depth > 2) return null; // needs more than nested what-ifs: not a fair puzzle
  return { ctx, truth, chosen, human };
}

function generatePuzzle(seed, tierId, opts) {
  opts = opts || {};
  const tier = TIERS[tierId];
  const rng = makeRng(`${seed}|${tierId}`);
  const worldId = opts.world || rng.pick(Object.keys(WORLDS));
  let got = null, best = null, tries = 0;
  const maxTries = opts.maxTries || 120;
  while (!got && tries < maxTries) {
    const g = attempt(rng, tier, worldId);
    tries++;
    if (!g) continue;
    if (tier.accept(g.human)) got = g;
    else if (!best) best = g; // keep something fair in case the tier's taste is never met
  }
  const strict = !!got;
  got = got || best;
  if (!got) throw new Error(`could not build a ${tierId} case for seed ${seed}`);
  const { ctx, truth, chosen, human } = got;

  const ordered = rng.shuffle(chosen);
  const clues = ordered.map((c) => {
    const variants = clueVariants(c, ctx);
    const say = variants.filter((v) => v[0] === 'say'), note = variants.filter((v) => v[0] === 'note');
    const useSay = say.length && (!note.length || rng.chance(0.62));
    const v = useSay ? rng.pick(say) : rng.pick(note);
    let speaker = null;
    if (v[0] === 'say') {
      const banned = clueSuspects(c);
      speaker = rng.pick([...Array(ctx.n).keys()].filter((i) => !banned.includes(i)));
    }
    return { type: c.type, kind: c.kind, family: c.family, args: c.args, voice: v[0], speaker, text: v[1], vi: variants.indexOf(v), test: c.test };
  });

  const solution = { killer: truth.m, weapon: truth.pw[truth.m], room: truth.pr[truth.m] };
  const rating = Math.max(1, Math.min(5, tier.stars + (human.probes >= 45 ? 1 : 0) - (human.depth === 0 ? 1 : 0)));
  return {
    seed: String(seed), tier: tierId, tierName: tier.name, worldId, n: ctx.n, ctx, clues,
    solution, truth, rating, human: { depth: human.depth, probes: human.probes }, tries, strict,
    title: rng.pick(TITLES[worldId]),
  };
}
