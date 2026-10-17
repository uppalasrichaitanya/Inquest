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
