// Difficulty tiers. Every case has one statement per suspect (the killer's is a lie) plus a few pieces of
// evidence, which are always true. `ev` bounds the evidence after squeezing; `weights` steer which evidence is
// drawn (by family); `say` steers testimony; `avoid` keeps clue shapes out of a tier (for evidence and testimony).
const SPATIAL = ['murderFarFrom', 'murderNotAdjRoom', 'murderNextTo', 'murderAdjRoom', 'murderAheadOf', 'murderBehind', 'murderSameFloor',
  'notAdjacent', 'adjacent', 'weaponNear', 'diffFloor', 'ahead'];
const TIERS = {
  // The on-ramp: three suspects, plain evidence, and a lie that shows at a glance.
  constable: {
    id: 'constable', name: 'Constable', blurb: 'Three suspects. A gentle start.',
    n: 3, ev: [1, 4], maxDirect: 1, minTypes: 2,
    weights: { direct: 1.2, neg: 1.3, link: 1.0, rel: 0.4, murder: 1.3, trait: 1.4 },
    avoid: SPATIAL.concat(['diffType', 'notTypeInRoom', 'weaponNotIn', 'eitherIn', 'eitherHas', 'diffFloor', 'sameFloor', 'murderNotAdjRoom']),
    accept: (h) => h.depth === 0 || (h.depth === 1 && h.probes <= 8), stars: 1,
  },
  detective: {
    id: 'detective', name: 'Detective', blurb: 'Four suspects. Patient reasoning.',
    n: 4, ev: [2, 6], maxDirect: 1, minTypes: 3,
    weights: { direct: 0.5, neg: 1.0, link: 1.2, rel: 0.9, murder: 1.4, trait: 1.4 },
    avoid: ['murderFarFrom', 'murderNotAdjRoom', 'weaponNear', 'murderAheadOf', 'murderBehind'],
    accept: (h) => h.depth === 1 && h.probes <= 30, stars: 2,
  },
  inspector: {
    id: 'inspector', name: 'Inspector', blurb: 'Four suspects. Fewer gifts.',
    n: 4, ev: [2, 7], maxDirect: 0, minTypes: 3,
    weights: { direct: 0, neg: 1.0, link: 1.3, rel: 1.3, murder: 1.4, trait: 1.3 },
    accept: (h) => h.depth === 1 && h.probes >= 15 && h.probes <= 70 && h.open > 1, stars: 3,
  },
  mastermind: {
    id: 'mastermind', name: 'Mastermind', blurb: 'Five suspects. Nothing given away.',
    n: 5, ev: [3, 9], maxDirect: 0, minTypes: 4,
    weights: { direct: 0, neg: 0.8, link: 1.4, rel: 1.6, murder: 1.4, trait: 1.2 },
    accept: (h) => h.open > 1 && (h.depth === 2 || (h.depth === 1 && h.probes >= 30)), stars: 4,
  },
};

// How likely a suspect is to say each kind of thing. People mostly talk about where they were and what they
// held; liars mostly lie about themselves.
const SAY_WEIGHT = {
  has: 1.0, notHas: 1.0, in: 1.2, notIn: 1.0, eitherHas: 0.6, eitherIn: 0.6, holdsType: 0.9, notHoldsType: 0.9, sameType: 0.6, diffType: 0.5,
  adjacent: 0.6, notAdjacent: 0.5, sameFloor: 0.6, diffFloor: 0.5, ahead: 0.7, murderNotSuspect: 0.6, murderType: 0.7, murderNotType: 0.6,
  murderNotWeapon: 0.6, murderNotRoom: 0.7, murderFloor: 0.6, murderNotFloor: 0.5, murderAdjRoom: 0.4, murderNotAdjRoom: 0.3, murderTrait: 0.7,
};

function pickN(rng, count, n) {
  return rng.shuffle([...Array(count).keys()]).slice(0, n).sort((a, b) => a - b);
}

function validPicks(world, ctx) {
  const types = ctx.types;
  const distinct = new Set(types).size;
  const dup = types.length - distinct;
  if (distinct < Math.min(3, ctx.n - 1) || (ctx.n >= 4 && dup < 1)) return false;
  if (world.relations.includes('floor') && new Set(ctx.floor).size < 2) return false;
  // at least two traits must tell tonight's suspects apart, or the cards are dead weight
  if (TRAIT_KEYS.filter((k) => new Set(ctx.traits.map((t) => t[k])).size > 1).length < 2) return false;
  // there must be some adjacency among the rooms in play, or the layout clues are dead weight
  let edges = 0;
  for (let i = 0; i < ctx.n; i++) for (let j = i + 1; j < ctx.n; j++) if (ctx.adj[i][j]) edges++;
  return edges >= (ctx.n >= 4 ? 2 : 1);
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
  const avoid = (c) => tier.avoid && tier.avoid.includes(c.type);
  const all = enumerateClues(ctx);
  // a statement that is true (or false) whatever happened gives itself away: nobody says one
  const informative = (c) => {
    let yes = false, no = false;
    for (let a = 0; a < perms.length; a++) for (let b = 0; b < perms.length; b++) {
      const v = c.test(perms[a], inv[a], perms[b], inv[b]);
      if (c.kind === 'M') { if (v) yes = true; if (v !== (1 << n) - 1) no = true; } else if (v) yes = true; else no = true;
      if (yes && no) return true;
    }
    return false;
  };

  // ---- testimony: one statement each. The innocent say something true, the killer something false.
  const says = [], usedKey = new Set();
  let directSaid = 0;
  for (let sp = 0; sp < n; sp++) {
    const liar = sp === truth.m;
    const cands = all.filter((c) => TESTIMONY_TYPES.includes(c.type) && !avoid(c) && !usedKey.has(c.type + JSON.stringify(c.args))
      && !(c.type === 'murderNotSuspect' && c.args.s === sp) && statementTrue(c, truth, pwi, pri) !== liar
      && !(c.family === 'direct' && !liar && directSaid >= 1) && informative(c));
    if (!cands.length) return null;
    const perType = {};
    cands.forEach((c) => { perType[c.type] = (perType[c.type] || 0) + 1; });
    const w = cands.map((c) => {
      const self = clueSuspects(c).includes(sp);
      return (SAY_WEIGHT[c.type] || 0.5) / perType[c.type] * (self ? (liar ? 3 : 1.6) : 1);
    });
    const c = cands[rng.weighted(w)];
    usedKey.add(c.type + JSON.stringify(c.args));
    if (c.family === 'direct' && !liar) directSaid++;
    says.push(testimony(c, sp, n));
  }

  // ---- evidence: always true. Draw until exactly one world is left, then squeeze out what isn't needed.
  const pool = all.filter((c) => clueHolds(c, truth, pwi, pri) && !avoid(c));
  const perType = {};
  pool.forEach((c) => { perType[c.type] = (perType[c.type] || 0) + 1; });
  const alive = pool.map(() => true);
  const usedType = {};
  let chosen = [];
  let direct = 0;
  let cur = newSurvivors(ctx), spare = newSurvivors(ctx);
  for (const t of says) { narrow(ctx, cur, t, spare); [cur, spare] = [spare, cur]; }
  let count = countSurvivingWorlds(ctx, cur);
  while (count > 1 && chosen.length < tier.ev[1] + 10) {
    // every kind of clue gets a fair turn, however many instances of it happen to be true
    const w = pool.map((c, j) => alive[j] ? (tier.weights[c.family] || 0) / perType[c.type] * Math.pow(0.3, usedType[c.type] || 0) : 0);
    const i = rng.weighted(w);
    if (i < 0) return null;
    alive[i] = false;
    const c = pool[i];
    if (c.family === 'direct' && direct >= tier.maxDirect) continue;
    narrow(ctx, cur, c, spare);
    const cnt = countSurvivingWorlds(ctx, spare);
    if (cnt >= count) continue; // adds nothing right now
    [cur, spare] = [spare, cur];
    chosen.push(c);
    usedType[c.type] = (usedType[c.type] || 0) + 1;
    if (c.family === 'direct') direct++;
    count = cnt;
  }
  if (count !== 1) return null;
  for (const c of rng.shuffle(chosen)) {
    const rest = chosen.filter((x) => x !== c);
    if (solveCount(ctx, says.concat(rest), 1).count === 1) chosen = rest;
  }
  if (chosen.length < tier.ev[0] || chosen.length > tier.ev[1]) return null;
  const typeCount = {};
  chosen.forEach((c) => { typeCount[c.type] = (typeCount[c.type] || 0) + 1; });
  if (Object.keys(typeCount).length < Math.min(tier.minTypes, chosen.length) || Math.max(...Object.values(typeCount)) > 2) return null;
  // the testimony has to matter: the evidence alone leaves more than one story
  if (solveCount(ctx, chosen, 1).count < 2) return null;
  // and the lie has to show: taken at their word, the statements and the evidence cannot all be true
  if (solveCount(ctx, says.map((t) => t.base).concat(chosen), 0).count !== 0) return null;
  const clues = says.concat(chosen);
  const human = humanDifficulty(ctx, clues, 2);
  if (human.depth < 0 || human.depth > 2) return null; // needs more than nested what-ifs: not a fair puzzle
  return { ctx, truth, says, chosen, human };
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
  const { ctx, truth, says, chosen, human } = got;

  const word = (c, sp) => {
    const variants = clueVariants(c.base || c, ctx, sp);
    const vi = rng.int(variants.length);
    return Object.assign(c, { voice: variants[vi][0], text: variants[vi][1], vi, speaker: sp === undefined ? null : sp });
  };
  const clues = varyWording(says.map((t) => word(t, t.speaker)).concat(rng.shuffle(chosen).map((c) => word(Object.assign({}, c)))));
  const solution = { killer: truth.m, weapon: truth.pw[truth.m], room: truth.pr[truth.m] };
  const rating = Math.max(1, Math.min(5, tier.stars + (human.probes >= 45 ? 1 : 0) - (human.depth === 0 ? 1 : 0)));
  return {
    seed: String(seed), tier: tierId, tierName: tier.name, worldId, n: ctx.n, ctx, clues,
    solution, truth, rating, human: { depth: human.depth, probes: human.probes }, tries, strict,
    story: pickStory(rng, ctx.world),
    title: rng.pick(titlePool(worldId)), // one draw; node retitle.js makes banked titles unique
  };
}
