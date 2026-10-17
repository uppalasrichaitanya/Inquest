// ---- 00-rng.js
// Seeded randomness. Same seed -> same case on every device.
function hashString(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeRng(seed) {
  const r = mulberry32(hashString(String(seed))());
  const rng = {
    next: r,
    int: (n) => Math.floor(r() * n),
    chance: (p) => r() < p,
    pick: (a) => a[Math.floor(r() * a.length)],
    shuffle(a) {
      a = a.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(r() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
    // pick one index according to non-negative weights
    weighted(weights) {
      let total = 0;
      for (const w of weights) total += w;
      if (total <= 0) return -1;
      let x = r() * total;
      for (let i = 0; i < weights.length; i++) {
        x -= weights[i];
        if (x < 0) return i;
      }
      return weights.length - 1;
    },
  };
  return rng;
}

// All permutations of 0..n-1 plus their inverses (inv[value] = position).
const _permCache = {};
function permutations(n) {
  if (_permCache[n]) return _permCache[n];
  const out = [];
  const cur = [];
  const used = new Array(n).fill(false);
  (function rec() {
    if (cur.length === n) { out.push(cur.slice()); return; }
    for (let i = 0; i < n; i++) {
      if (used[i]) continue;
      used[i] = true; cur.push(i);
      rec();
      cur.pop(); used[i] = false;
    }
  })();
  const inv = out.map((p) => {
    const q = new Array(n);
    for (let i = 0; i < n; i++) q[p[i]] = i;
    return q;
  });
  return (_permCache[n] = { perms: out, inv });
}

// ---- 10-worlds-manor.js
// World data. Rooms carry a rectangle on a grid; adjacency and floors are derived from geometry,
// so the floor plan the player sees is exactly the one the clues talk about.
const WORLDS = {};

WORLDS.manor = {
  id: 'manor',
  name: 'Blackwood Manor',
  year: '1926',
  tagline: 'A storm, a locked gate, and a dinner nobody finishes.',
  layoutKind: 'dollhouse',
  floors: ['in the cellar', 'on the ground floor', 'upstairs'],
  relations: ['adjacent', 'floor'],
  victim: { name: 'Sir Aldous Blackwood', desc: 'master of the manor and keeper of far too many secrets' },
  scene: [
    'The storm cut the telephone wires at nine. By midnight the gate was a river of mud.',
    'Sir Aldous was found at one in the morning, and the household has been standing very still ever since.',
  ],
  rooms: [
    { id: 'bedroom', name: 'Master Bedroom', short: 'Bed&shy;room', rect: { x: 0, y: 0, w: 5, h: 1 } },
    { id: 'study', name: 'Study', short: 'Study', rect: { x: 5, y: 0, w: 4, h: 1 } },
    { id: 'kitchen', name: 'Kitchen', short: 'Kitchen', rect: { x: 0, y: 1, w: 2, h: 1 } },
    { id: 'dining', name: 'Dining Hall', short: 'Dining Hall', rect: { x: 2, y: 1, w: 3, h: 1 } },
    { id: 'library', name: 'Library', short: 'Library', rect: { x: 5, y: 1, w: 2, h: 1 } },
    { id: 'conservatory', name: 'Conservatory', short: 'Conser&shy;vatory', rect: { x: 7, y: 1, w: 2, h: 1 } },
    { id: 'cellar', name: 'Wine Cellar', short: 'Wine Cellar', rect: { x: 0, y: 2, w: 2, h: 1 } },
  ],
  weapons: [
    { id: 'dagger', name: 'Moroccan Dagger', short: 'Dagger', type: 'blade', note: 'taken from the trophy wall' },
    { id: 'opener', name: 'Silver Letter Opener', short: 'Letter opener', type: 'blade', note: 'monogrammed A.B.' },
    { id: 'candlestick', name: 'Brass Candlestick', short: 'Candle&shy;stick', type: 'blunt', note: 'one of a pair, now a single' },
    { id: 'poker', name: 'Fire Poker', short: 'Poker', type: 'blunt', note: 'still warm' },
    { id: 'port', name: 'Decanter of Port', short: 'Port', type: 'poison', note: 'the stopper is missing' },
    { id: 'cord', name: 'Curtain Cord', short: 'Curtain cord', type: 'cord', note: 'cut cleanly from the drapes' },
    { id: 'revolver', name: 'Service Revolver', short: 'Revol&shy;ver', type: 'firearm', note: 'one chamber empty' },
  ],
  suspects: [
    { id: 'vane', name: 'Lady Ottoline Vane', short: 'Lady Vane', role: "the widow's sister, always in black", hue: 340 },
    { id: 'pell', name: 'Dr. Rufus Pell', short: 'Dr. Pell', role: 'family physician, never without his bag', hue: 200 },
    { id: 'crisp', name: 'Major Barnaby Crisp', short: 'Major Crisp', role: 'retired officer who owed Sir Aldous money', hue: 28 },
    { id: 'fenn', name: 'Miss Odalys Fenn', short: 'Miss Fenn', role: 'private secretary; knows every secret', hue: 160 },
    { id: 'thorne', name: 'Reverend Silas Thorne', short: 'Rev. Thorne', role: 'parish vicar, sermon notes in his pocket', hue: 265 },
    { id: 'marrow', name: 'Mrs. Edith Marrow', short: 'Mrs. Marrow', role: 'housekeeper of thirty years', hue: 95 },
    { id: 'dray', name: 'Cassius Dray', short: 'Mr. Dray', role: 'art dealer with a suspiciously fresh Vermeer', hue: 48 },
    { id: 'lark', name: 'Imogen Lark', short: 'Miss Lark', role: 'niece, aviator, arrived by motorcycle', hue: 5 },
  ],
};

// ---- 11-worlds-train.js
WORLDS.train = {
  id: 'train',
  name: 'The Meridian Express',
  year: '1931',
  tagline: 'Eleven hours to the border. One carriage too many.',
  layoutKind: 'line',
  floors: null,
  relations: ['adjacent', 'ahead'],
  victim: { name: 'Lucian Marlowe', desc: 'a banker who bought secrets the way others buy newspapers' },
  scene: [
    'The night train is in the mountains, past the last station and short of the next.',
    'Mr. Marlowe was found at a quarter to three. Nobody has been allowed to leave their carriage since.',
  ],
  // listed front (engine end) to back
  rooms: [
    { id: 'mail', name: 'Mail Car', short: 'Mail', rect: { x: 0, y: 0, w: 1, h: 1 } },
    { id: 'dining', name: 'Dining Car', short: 'Dining', rect: { x: 1, y: 0, w: 1, h: 1 } },
    { id: 'smoking', name: 'Smoking Lounge', short: 'Smoking', rect: { x: 2, y: 0, w: 1, h: 1 } },
    { id: 'sleeper', name: 'Sleeper Car', short: 'Sleeper', rect: { x: 3, y: 0, w: 1, h: 1 } },
    { id: 'bar', name: 'Bar Car', short: 'Bar', rect: { x: 4, y: 0, w: 1, h: 1 } },
    { id: 'observation', name: 'Observation Car', short: 'Obser&shy;vation', rect: { x: 5, y: 0, w: 1, h: 1 } },
    { id: 'luggage', name: 'Luggage Van', short: 'Luggage', rect: { x: 6, y: 0, w: 1, h: 1 } },
  ],
  weapons: [
    { id: 'hatpin', name: 'Jewelled Hat Pin', short: 'Hat pin', type: 'blade', note: 'longer than it looks' },
    { id: 'icepick', name: 'Ice Pick', short: 'Ice pick', type: 'blade', note: 'from behind the bar' },
    { id: 'bottle', name: 'Champagne Bottle', short: 'Bottle', type: 'blunt', note: 'unopened, and heavier for it' },
    { id: 'lantern', name: 'Brass Signal Lantern', short: 'Lantern', type: 'blunt', note: 'dented on one side' },
    { id: 'cocoa', name: 'Cup of Laced Cocoa', short: 'Cocoa', type: 'poison', note: 'half finished' },
    { id: 'scarf', name: 'Silk Scarf', short: 'Scarf', type: 'cord', note: 'embroidered with a crest' },
    { id: 'pistol', name: 'Pocket Pistol', short: 'Pistol', type: 'firearm', note: 'pearl handled' },
  ],
  suspects: [
    { id: 'valcourt', name: 'Madame Zora Valcourt', short: 'Mme Valcourt', role: 'opera singer, travelling with three hatboxes', hue: 330 },
    { id: 'orlov', name: 'Count Mikhail Orlov', short: 'Count Orlov', role: 'exiled aristocrat with a borrowed title', hue: 220 },
    { id: 'brandt', name: 'Professor Hugo Brandt', short: 'Prof. Brandt', role: 'archaeologist, guarding a locked crate', hue: 35 },
    { id: 'ashgrove', name: 'Miss Winifred Ashgrove', short: 'Miss Ashgrove', role: 'travel writer who notices everything', hue: 150 },
    { id: 'quill', name: 'Mr. Jasper Quill', short: 'Mr. Quill', role: 'diamond broker with nervous hands', hue: 275 },
    { id: 'crane', name: 'Lady Philippa Crane', short: 'Lady Crane', role: 'heiress, bored and well informed', hue: 10 },
    { id: 'reyes', name: 'Dr. Tomas Reyes', short: 'Dr. Reyes', role: 'surgeon on his way to a conference', hue: 185 },
    { id: 'hale', name: 'Captain Edmund Hale', short: 'Capt. Hale', role: 'retired naval officer, insomniac', hue: 75 },
  ],
};

// Weapon types: how the coroner and the witnesses talk about them.
const WEAPON_TYPES = {
  blade:   { label: 'a blade',        cause: 'a clean, deep cut',              held: 'something sharp',            any: 'anything sharp' },
  blunt:   { label: 'a blunt object', cause: 'a single heavy blow',            held: 'something heavy and blunt',  any: 'anything heavy' },
  poison:  { label: 'poison',         cause: 'poison in the blood',            held: 'something poisonous',        any: 'any poison' },
  cord:    { label: 'a cord',         cause: 'ligature marks around the neck', held: 'something to strangle with', any: 'any cord or scarf' },
  firearm: { label: 'a firearm',      cause: 'a gunshot wound',                held: 'a gun',                      any: 'a gun' },
};

// ---- 20-clues.js
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

// ---- 25-text.js
// Turns a clue into words. Tokens {s:i} {w:i} {r:i} are swapped for names by the renderer,
// so the UI can highlight and cross-reference them. Everyone tells the truth.
// Banked cases store the variant index, so keep the number of variants and their voice
// ('say' or 'note') per type exactly as they are when rewording.
function clueVariants(c, ctx) {
  const a = c.args;
  const line = ctx.world.layoutKind === 'line';
  const unit = line ? 'carriage' : 'room';
  const S = (i) => `{s:${i}}`, W = (i) => `{w:${i}}`, R = (i) => `{r:${i}}`;
  const T = (t) => WEAPON_TYPES[t];
  const floorWord = (f) => ctx.world.floors[f];
  // what "next to" counts as, said in the clue itself: in the house a door or a stair joins the two rooms
  // (upstairs and down included); on the train the two carriages are coupled, with none in between
  const join = line ? 'a coupling' : 'a door or a stair';
  const away = line ? 'coupled to it' : 'a door or a stair away';
  switch (c.type) {
    case 'has': return [
      ['say', `I saw ${S(a.s)} with the ${W(a.w)} in hand. I'm certain of it.`],
      ['note', `${S(a.s)} had the ${W(a.w)}. The prints leave no doubt.`]];
    case 'notHas': return [
      ['say', `${S(a.s)} never touched the ${W(a.w)}. I'd swear to it.`],
      ['note', `Whoever had the ${W(a.w)}, it was not ${S(a.s)}.`]];
    case 'in': return [
      ['say', `${S(a.s)} was in the ${R(a.r)} when the clock struck. I'd know that voice through any door.`],
      ['note', `A witness puts ${S(a.s)} in the ${R(a.r)} at the time of the murder.`]];
    case 'notIn': return [
      ['say', `${S(a.s)} never set foot in the ${R(a.r)}. I'd have seen.`],
      ['note', `${S(a.s)} was not in the ${R(a.r)}.`]];
    case 'eitherHas': return [
      ['say', `Either ${S(a.a)} or ${S(a.b)} had the ${W(a.w)}. I couldn't tell you which.`],
      ['note', `The ${W(a.w)} was held by ${S(a.a)} or by ${S(a.b)}.`]];
    case 'eitherIn': return [
      ['say', `Someone was in the ${R(a.r)}: ${S(a.a)} or ${S(a.b)}. It was too dark to see which.`],
      ['note', `Whoever was in the ${R(a.r)}, it was ${S(a.a)} or ${S(a.b)}.`]];
    case 'holdsType': return [
      ['say', `${S(a.s)} was carrying ${T(a.t).held}. I noticed it straight away.`],
      ['note', `${S(a.s)}'s weapon was ${T(a.t).held}.`]];
    case 'notHoldsType': return [
      ['say', `${S(a.s)} wasn't carrying ${T(a.t).any}. I checked.`],
      ['note', `Whatever ${S(a.s)} was carrying, it wasn't ${T(a.t).label}.`]];
    case 'sameType': return [
      ['say', `${S(a.a)} and ${S(a.b)} were carrying the same kind of weapon. I thought that was odd.`],
      ['note', `${S(a.a)}'s weapon was the same kind as ${S(a.b)}'s.`]];
    case 'diffType': return [
      ['say', `${S(a.a)} and ${S(a.b)} were carrying different kinds of weapon.`],
      ['note', `${S(a.a)}'s weapon and ${S(a.b)}'s were of different kinds.`]];
    case 'adjacent': return [
      ['say', `${S(a.a)} and ${S(a.b)} were in ${unit}s next to each other, ${line ? 'coupled together' : 'a door or a stair apart'}. I could hear them both.`],
      ['note', `${S(a.a)}'s ${unit} was next to ${S(a.b)}'s, joined by ${join}.`]];
    case 'notAdjacent': return [
      ['say', `${S(a.a)} and ${S(a.b)} weren't in ${unit}s next to each other. ${line ? 'There was at least one carriage between them, sealed or not.' : 'You would need more than one door or stair to get from one to the other.'}`],
      ['note', line ? `${S(a.a)}'s carriage and ${S(a.b)}'s were not coupled together.` : `No single door or stair joined ${S(a.a)}'s room to ${S(a.b)}'s.`]];
    case 'sameFloor': return [
      ['say', `${S(a.a)} and ${S(a.b)} were on the same floor. I heard the boards creak under both of them.`],
      ['note', `${S(a.a)}'s room and ${S(a.b)}'s were on one floor.`]];
    case 'diffFloor': return [
      ['say', `${S(a.a)} was on one floor and ${S(a.b)} on another. I'm sure of that.`],
      ['note', `${S(a.a)} and ${S(a.b)} were on different floors.`]];
    case 'ahead': return [
      ['say', `I walked the train from the engine back, and passed ${S(a.a)} before ${S(a.b)}.`],
      ['note', `${S(a.a)}'s carriage was nearer the engine than ${S(a.b)}'s.`]];
    case 'weaponIn': return [
      ['say', `The ${W(a.w)} was in the ${R(a.r)}. I saw it in someone's hand.`],
      ['note', `Whoever was in the ${R(a.r)} was holding the ${W(a.w)}.`]];
    case 'weaponNotIn': return [
      ['say', `The ${W(a.w)} was never in the ${R(a.r)}.`],
      ['note', `Whoever was in the ${R(a.r)}, they weren't holding the ${W(a.w)}.`]];
    case 'weaponNear': return [
      ['say', `I saw the ${W(a.w)} ${line ? `in a carriage coupled to the ${R(a.r)}` : `one door or one stair from the ${R(a.r)}`}. Not in it.`],
      ['note', `The ${W(a.w)} was in a ${unit} next to the ${R(a.r)} (${away}), not in the ${R(a.r)} itself.`]];
    case 'typeInRoom': return [
      ['say', `Whoever was in the ${R(a.r)} had ${T(a.t).held}. I saw it myself.`],
      ['note', `The person in the ${R(a.r)} was carrying ${T(a.t).held}.`]];
    case 'notTypeInRoom': return [
      ['say', `Whoever was in the ${R(a.r)} didn't have ${T(a.t).any}. I'd have noticed.`],
      ['note', `The person in the ${R(a.r)} wasn't carrying ${T(a.t).label}.`]];
    // ---- the body
    case 'murderType': return [
      ['note', `The coroner found ${T(a.t).cause}. The killer used ${T(a.t).held}.`]];
    case 'murderNotType': return [
      ['note', `The coroner rules out ${T(a.t).label}.`]];
    case 'murderNotSuspect': return [
      ['note', `${S(a.s)} has an alibi that holds. Not the killer.`]];
    case 'murderNextTo': return [
      ['note', `The killer was in a ${unit} next to ${S(a.s)}'s, ${away}.`]];
    case 'murderFarFrom': return [
      ['note', `It wasn't ${S(a.s)}, nor anyone ${line ? `in a carriage coupled to ${S(a.s)}'s` : `a door or a stair from ${S(a.s)}'s room`}.`]];
    case 'murderSameFloor': return [
      ['note', `The killer was on the same floor as ${S(a.s)}, but it wasn't ${S(a.s)}.`]];
    case 'murderAheadOf': return [
      ['note', `The killer's carriage was nearer the engine than ${S(a.s)}'s.`]];
    case 'murderBehind': return [
      ['note', `The killer's carriage was further from the engine than ${S(a.s)}'s.`]];
    case 'murderNotWeapon': return [
      ['note', `The ${W(a.w)} is clean. It is not the murder weapon.`]];
    case 'murderNotRoom': return [
      ['note', `The body was not found in the ${R(a.r)}.`]];
    case 'murderAdjRoom': return [
      ['note', `The body was found ${line ? 'in a carriage coupled to' : 'a door or a stair away from'} the ${R(a.r)}, not in the ${R(a.r)} itself.`]];
    case 'murderNotAdjRoom': return [
      ['note', `The body was not in the ${R(a.r)}, nor ${line ? 'in a carriage coupled to it' : 'anywhere a door or a stair away'}.`]];
    case 'murderFloor': return [
      ['note', `The body was found ${floorWord(a.f)}.`]];
    case 'murderNotFloor': return [
      ['note', `The body was not found ${floorWord(a.f)}.`]];
  }
  throw new Error('no text for clue type ' + c.type);
}

// In the house, "next to" is spelled out as "a door or a stair". A case can hold several such clues, so every
// second one, in statement order, says "a doorway or a flight of stairs" instead. Wording only: types and variants stay.
const DOOR_WORDS = /\b(a|one|single) door or (a |one )?stair\b/g;
function varyWording(clues) {
  let k = 0;
  for (const c of clues) {
    if (!c.text.match(DOOR_WORDS)) continue;
    if (k++ % 2) c.text = c.text.replace(DOOR_WORDS, '$1 doorway or $2flight of stairs');
  }
  return clues;
}

// Which suspects does a clue talk about? (so a witness is never the subject of their own statement)
function clueSuspects(c) {
  const a = c.args, out = [];
  for (const k of ['s', 'a', 'b']) if (a[k] !== undefined) out.push(a[k]);
  return out;
}

// Plain-text rendering (tests, share text). The UI renders tokens itself.
function plainText(str, ctx) {
  return str.replace(/\{([swr]):(\d+)\}/g, (_, k, i) => {
    i = +i;
    return k === 's' ? ctx.suspects[i].short : k === 'w' ? ctx.weapons[i].name : ctx.rooms[i].name;
  });
}

// ---- 30-solver.js
// Exhaustive logic solver. Weapon-only and room-only clues are applied to the permutation lists
// first, so the expensive cross product only runs over what survives. The answer is the triple
// (killer, weapon, room); a puzzle is fair only if exactly one triple survives.
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
  const answers = [];
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
        const key = (m * n + pw[m]) * n + pr[m];
        if (!seen[key]) {
          seen[key] = 1;
          answers.push({ killer: m, weapon: pw[m], room: pr[m] });
          if (answers.length > lim) return { count: answers.length, answers, capped: true };
        }
      }
    }
  }
  return { count: answers.length, answers, capped: false };
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

// ---- 32-survivors.js
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

// How many distinct (killer, weapon, room) answers survive?
function countSurvivingAnswers(ctx, set) {
  const n = ctx.n, { perms } = permutations(n);
  const seen = new Uint8Array(n * n * n);
  let count = 0;
  for (let i = 0; i < set.size; i++) {
    const pw = perms[set.A[i]], pr = perms[set.B[i]], mask = set.M[i];
    for (let m = 0; m < n; m++) {
      if (!(mask & (1 << m))) continue;
      const key = (m * n + pw[m]) * n + pr[m];
      if (!seen[key]) { seen[key] = 1; count++; }
    }
  }
  return count;
}

// ---- 35-human.js
// A "human" solver: candidate lists for every suspect's weapon and room, plus the killer, the
// murder weapon and the murder room. Each clue becomes small local constraints; each deduction
// is a candidate being crossed out. Where plain elimination stalls, it tries one "what if?" at a
// time (depth 1), or a what-if inside a what-if (depth 2). That depth is how hard the case feels.
//
// Variables: 0..n-1 weapon of suspect s | n..2n-1 room of suspect s | 2n killer | 2n+1 murder weapon | 2n+2 murder room

function buildCSP(ctx, clues) {
  const n = ctx.n, { adj, floor, pos, types } = ctx;
  const PW = (s) => s, PR = (s) => n + s, K = 2 * n, MW = 2 * n + 1, MR = 2 * n + 2;
  const cons = [];
  const add = (clue, vars, pred) => cons.push({ clue, vars, pred });
  const each = (f) => { for (let s = 0; s < n; s++) f(s); };
  clues.forEach((c, ci) => {
    const a = c.args;
    switch (c.type) {
      case 'has': add(ci, [PW(a.s)], (x) => x === a.w); break;
      case 'notHas': add(ci, [PW(a.s)], (x) => x !== a.w); break;
      case 'in': add(ci, [PR(a.s)], (x) => x === a.r); break;
      case 'notIn': add(ci, [PR(a.s)], (x) => x !== a.r); break;
      case 'eitherHas': add(ci, [PW(a.a), PW(a.b)], (x, y) => x === a.w || y === a.w); break;
      case 'eitherIn': add(ci, [PR(a.a), PR(a.b)], (x, y) => x === a.r || y === a.r); break;
      case 'holdsType': add(ci, [PW(a.s)], (x) => types[x] === a.t); break;
      case 'notHoldsType': add(ci, [PW(a.s)], (x) => types[x] !== a.t); break;
      case 'sameType': add(ci, [PW(a.a), PW(a.b)], (x, y) => types[x] === types[y]); break;
      case 'diffType': add(ci, [PW(a.a), PW(a.b)], (x, y) => types[x] !== types[y]); break;
      case 'adjacent': add(ci, [PR(a.a), PR(a.b)], (x, y) => adj[x][y]); break;
      case 'notAdjacent': add(ci, [PR(a.a), PR(a.b)], (x, y) => !adj[x][y]); break;
      case 'sameFloor': add(ci, [PR(a.a), PR(a.b)], (x, y) => floor[x] === floor[y]); break;
      case 'diffFloor': add(ci, [PR(a.a), PR(a.b)], (x, y) => floor[x] !== floor[y]); break;
      case 'ahead': add(ci, [PR(a.a), PR(a.b)], (x, y) => pos[x] < pos[y]); break;
      case 'weaponIn': each((s) => add(ci, [PW(s), PR(s)], (x, y) => (x === a.w) === (y === a.r))); break;
      case 'weaponNotIn': each((s) => add(ci, [PW(s), PR(s)], (x, y) => !(x === a.w && y === a.r))); break;
      case 'weaponNear': each((s) => add(ci, [PW(s), PR(s)], (x, y) => x !== a.w || adj[y][a.r])); break;
      case 'typeInRoom': each((s) => add(ci, [PW(s), PR(s)], (x, y) => y !== a.r || types[x] === a.t)); break;
      case 'notTypeInRoom': each((s) => add(ci, [PW(s), PR(s)], (x, y) => y !== a.r || types[x] !== a.t)); break;
      case 'murderType': add(ci, [MW], (x) => types[x] === a.t); break;
      case 'murderNotType': add(ci, [MW], (x) => types[x] !== a.t); break;
      case 'murderNotSuspect': add(ci, [K], (x) => x !== a.s); break;
      case 'murderNextTo': add(ci, [K], (x) => x !== a.s); add(ci, [MR, PR(a.s)], (x, y) => adj[x][y]); break;
      case 'murderFarFrom': add(ci, [K], (x) => x !== a.s); add(ci, [MR, PR(a.s)], (x, y) => !adj[x][y]); break;
      case 'murderSameFloor': add(ci, [K], (x) => x !== a.s); add(ci, [MR, PR(a.s)], (x, y) => floor[x] === floor[y]); break;
      case 'murderAheadOf': add(ci, [MR, PR(a.s)], (x, y) => pos[x] < pos[y]); break;
      case 'murderBehind': add(ci, [MR, PR(a.s)], (x, y) => pos[x] > pos[y]); break;
      case 'murderNotWeapon': add(ci, [MW], (x) => x !== a.w); break;
      case 'murderNotRoom': add(ci, [MR], (x) => x !== a.r); break;
      case 'murderAdjRoom': add(ci, [MR], (x) => adj[x][a.r]); break;
      case 'murderNotAdjRoom': add(ci, [MR], (x) => x !== a.r && !adj[x][a.r]); break;
      case 'murderFloor': add(ci, [MR], (x) => floor[x] === a.f); break;
      case 'murderNotFloor': add(ci, [MR], (x) => floor[x] !== a.f); break;
      default: throw new Error('human solver: unknown clue ' + c.type);
    }
  });
  // the killer is whoever holds the murder weapon and stands in the murder room
  each((s) => {
    add(-1, [K, PW(s), MW], (k, w, mw) => (k === s) === (w === mw));
    add(-1, [K, PR(s), MR], (k, r, mr) => (k === s) === (r === mr));
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

const answered = (csp, dom) => popcount(dom[csp.K]) === 1 && popcount(dom[csp.MW]) === 1 && popcount(dom[csp.MR]) === 1;

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
  if (answered(csp, dom)) return { depth: 0, probes: 0, dom };
  for (let d = 1; d <= (maxDepth || 2); d++) {
    const t = dom.slice(); stats.probes = 0;
    if (probe(csp, t, d, stats) && answered(csp, t)) return { depth: d, probes: stats.probes, dom: t };
  }
  return { depth: 99, probes: stats.probes };
}

// ---- 40-generate.js
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
  const clues = varyWording(ordered.map((c) => {
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
  }));

  const solution = { killer: truth.m, weapon: truth.pw[truth.m], room: truth.pr[truth.m] };
  const rating = Math.max(1, Math.min(5, tier.stars + (human.probes >= 45 ? 1 : 0) - (human.depth === 0 ? 1 : 0)));
  return {
    seed: String(seed), tier: tierId, tierName: tier.name, worldId, n: ctx.n, ctx, clues,
    solution, truth, rating, human: { depth: human.depth, probes: human.probes }, tries, strict,
    title: rng.pick(titlePool(worldId)), // one draw, as before; node retitle.js makes banked titles unique
  };
}

// ---- 45-bank.js
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

// ---- 46-tutorial.js
// The hand-made first case, in bank format. Three guests, five statements, one move taught per statement:
// cross out (1), confirm a match (2), cross out (3), the last open square (rooms), a weapon kind (4),
// and the body's floor (5). test-engine.js checks it has one answer and no spare statement.
//   suspects: Dr. Pell, Major Crisp, Miss Lark   weapons: Brass Candlestick, Decanter of Port, Service Revolver
//   rooms: Study (upstairs), Library (ground floor), Wine Cellar (cellar)
//   truth: Pell has the Revolver in the Cellar, Crisp has the Port in the Library (the killer), Lark has the Candlestick in the Study
const TUTORIAL = {
  s: 'tutorial', t: 'constable', w: 'manor', ti: 'A Lesson at Blackwood', r: 1, h: [0, 0],
  S: [1, 2, 7], W: [2, 4, 6], R: [1, 4, 6],
  pw: [2, 1, 0], pr: [2, 1, 0], m: 1,
  c: [
    ['notHas', { s: 0, w: 1 }, 0, 2],
    ['in', { s: 2, r: 0 }, 1, null],
    ['notIn', { s: 1, r: 2 }, 0, 0],
    ['holdsType', { s: 2, t: 'blunt' }, 0, 1],
    ['murderFloor', { f: 1 }, 0, null],
  ],
};

// ---- 47-titles.js
// Case titles. They are only a name for the day: never part of the clues, and never a hint.
// A title may not use any word from a suspect, weapon or room of its setting, nor a word that points
// at a way of killing, a room or a suspect's trade. Every banked case has its own title (node retitle.js).

// hand-picked titles that suit either setting (each is used once across the whole bank)
const TITLE_THE = [
  'The Uninvited Guest', 'The Unanswered Question', 'The Second Visitor', 'The Last Word', 'The Quiet Guest', 'The Patient Stranger',
  'The Crooked Alibi', 'The Double Bluff', 'The Unwelcome Visitor', 'The Absent Host', 'The Wrong Door', 'The Long Pause',
  'The Careless Remark', 'The Unspoken Bargain', 'The Sudden Silence', 'The Grey Stranger', 'The Uneasy Truce', 'The Unfinished Sentence',
  'The Overdue Guest', 'The Muddled Witness', 'The Silent Partner', 'The Borrowed Alibi', 'The Faded Photograph', 'The Hollow Promise',
  'The Improbable Witness', 'The Forgotten Promise', 'The Hidden Motive', 'The Third Guest', 'The Fourth Guest', 'The Seventh Guest',
  'The Missing Minute', 'The Wrong Answer', 'The Right Question', 'The Small Deception', 'The Restless Guests', 'The Curious Coincidence',
  'The Peculiar Silence', 'The Unseen Witness', 'The Untold Story', 'The Narrow Margin', 'The Final Reckoning', 'The Odd Man Out',
  'The Quiet Accusation', 'The Uneasy Guest', 'The Distant Relation', 'The Rival Claim', 'The Polite Lie', 'The Little Lie',
  'The Honest Liar', 'The Perfect Alibi', 'The Imperfect Alibi', 'The Weekend Guest', 'The Open Question', 'The Closed Circle',
  'The Inner Circle', 'The Wrong Impression', 'The Missing Motive', 'The Stray Remark', 'The Broken Promise', 'The Kept Promise',
  'The Last Witness', 'The First Witness', 'The Shared Silence', 'The Missing Hour', 'The Awkward Pause', 'The Unlikely Suspect',
];
// "{phrase} {tail}": Murder at Blackwood, Loose Ends on the Meridian
const TITLE_PHRASE = [
  'Murder', 'Trouble', 'Silence', 'Rumours', 'Whispers', 'Strangers', 'Footsteps', 'Questions', 'A Reckoning', 'An Absence',
  'A Quarrel', 'A Wager', 'A Confession', 'An Accusation', 'An Alibi', 'A Riddle', 'A Stranger', 'Uninvited Guests', 'Second Thoughts', 'Loose Ends',
  'Bad Company', 'Ill Feeling', 'Old Grudges', 'Death', 'Foul Play', 'No Witnesses', 'A Vanishing', 'Unfinished Business', 'Doubts', 'False Pretences',
  'Hard Feelings', 'A Narrow Escape', 'Crossed Purposes', 'Idle Talk', 'Fair Warning',
];
// "The {noun} of {owner}": The Undoing of Sir Aldous
const TITLE_OF = ['Affair', 'Matter', 'Riddle', 'Problem', 'Mystery', 'Silence', 'Reckoning', 'Undoing', 'Puzzle', 'Question', 'Ruin', 'Fall', 'Shadow', 'Ghost', 'Curse'];
const TITLE_PLACE = {
  manor: {
    tails: ['at Blackwood', 'at the Manor', 'in the Shires', 'at Michaelmas', 'in the Fog', 'Under the Eaves', 'Behind the Gate', 'in the Rain',
      'Before the Storm', 'After the Storm', 'on the Moor', 'Down the Long Drive', 'in the Small Hours', 'Past the Lodge'],
    owners: ['Sir Aldous', 'Blackwood Manor', 'the Blackwoods', 'the Old House'],
  },
  train: {
    tails: ['on the Meridian', 'Aboard the Express', 'in the Mountains', 'at the Border', 'Through the Pass', 'Before Vienna', 'East of Zurich',
      'Beyond the Viaduct', 'in the Tunnel', 'at Full Speed', 'Past the Frontier', 'at the Eleventh Hour', 'Between Stations', 'Above the Valley'],
    owners: ['Lucian Marlowe', 'the Meridian', 'the Express', 'the High Pass'],
  },
};
// words that would point at a method, a room or a suspect even though no name uses them
const TITLE_HINTS = `poison poisoned bitter laced drink draught cup toast port wine cocoa champagne vintage glass bottle
  blade knife steel edge sharp point pin cut stab dagger blunt blow heavy brass iron struck cord rope noose knot strangled scarf
  silk thread tie shot shoot shooting gun bullet trigger pistol revolver chamber powder dinner supper dining feast banquet
  kitchen cook library book books page chapter study desk cellar vault garden greenhouse orchid bed bedroom sleep sleeper
  sleeping sleepless dream smoke smoking cigar mail post letter envelope luggage trunk baggage bar cocktail observation view
  window lounge hall stair attic doctor physician medicine vicar sermon church prayer parish housekeeper keys secretary secret
  secrets major army regiment debt debts money owed art painting portrait canvas niece flight wings aviator opera aria song
  singer encore count crown exile professor relic tomb crate ink diary diamond jewel jewels gem heiress fortune surgeon
  scalpel naval sea ship captain admiral anchor tide widow mourning black veil fire flame ember candle candlelight light
  lantern signal lamp ice frost frozen thaw cold chill snow night midnight hat crest trophy curtain drapes`.split(/\s+/).filter(Boolean);
const TITLE_STOP = new Set('the a an of in on at to by and his her one from for with than it is its who never without were was'.split(' '));

const titleWords = (s) => String(s).replace(/&shy;/g, '').toLowerCase().split(/[^a-z]+/).filter((w) => w && !TITLE_STOP.has(w));
// every word a title for this setting may not use
function titleBanned(worldId) {
  const W = WORLDS[worldId], out = new Set(TITLE_HINTS);
  for (const s of W.suspects) for (const w of titleWords(`${s.name} ${s.short} ${s.role}`)) out.add(w);
  for (const r of W.rooms) for (const w of titleWords(`${r.name} ${r.short}`)) out.add(w);
  for (const x of W.weapons) for (const w of titleWords(`${x.name} ${x.short} ${x.note} ${x.type}`)) out.add(w);
  return out;
}
// the first banned word in a title, or null
function titleClash(worldId, title) {
  const ban = titleBanned(worldId);
  return titleWords(title).find((w) => ban.has(w) || ban.has(w + 's') || ban.has(w.replace(/e?s$/, ''))) || null;
}
// every allowed title for a setting, in a fixed shuffled order so neighbouring days read differently
const TITLE_POOLS = {};
function titlePool(worldId) {
  if (TITLE_POOLS[worldId]) return TITLE_POOLS[worldId];
  const P = TITLE_PLACE[worldId], all = [];
  all.push(...TITLE_THE);
  for (const p of TITLE_PHRASE) for (const t of P.tails) all.push(`${p} ${t}`);
  for (const n of TITLE_OF) for (const o of P.owners) all.push(`The ${n} of ${o}`);
  const ok = [...new Set(all)].filter((t) => !titleClash(worldId, t));
  return (TITLE_POOLS[worldId] = makeRng('titles-' + worldId).shuffle(ok));
}

// ---- 99-exports.js
function checkAccusation(puzzle, acc) {
  const s = puzzle.solution;
  return { killer: acc.killer === s.killer, weapon: acc.weapon === s.weapon, room: acc.room === s.room };
}

if (typeof module !== 'undefined') {
  module.exports = { TUTORIAL, generatePuzzle, exportPuzzle, importPuzzle, checkAccusation, solveCount, marginals, humanDifficulty, buildCSP, propagate, TIERS, WORLDS, WEAPON_TYPES, plainText, permutations, makeRng, enumerateClues, buildCtx, clueVariants, titlePool, titleClash, titleBanned, varyWording };
}
