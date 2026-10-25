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
// Every suspect has three traits the evidence can point at (height, hand, hair), printed on their card,
// a look for their portrait, and a motive the reveal uses when they turn out to be the killer.
// Victims, occasions and the moment of discovery vary from case to case; {v} is the victim's short name.
const WORLDS = {};

// how the cards and the evidence talk about a trait
const TRAITS = {
  height: { label: 'Height', values: { tall: 'tall', short: 'short' } },
  hand: { label: 'Hand', values: { left: 'left-handed', right: 'right-handed' } },
  hair: { label: 'Hair', values: { dark: 'dark-haired', fair: 'fair-haired', red: 'red-haired', grey: 'grey-haired' } },
};
const TRAIT_KEYS = ['height', 'hand', 'hair'];

WORLDS.manor = {
  id: 'manor',
  name: 'Blackwood Manor',
  year: '1926',
  tagline: 'A storm, a locked gate, and a dinner nobody finishes.',
  layoutKind: 'dollhouse',
  guests: 'guests',
  floors: ['in the cellar', 'on the ground floor', 'upstairs'],
  relations: ['adjacent', 'floor'],
  victims: [
    { name: 'Sir Aldous Blackwood', short: 'Sir Aldous', desc: 'master of the manor, and keeper of far too many secrets' },
    { name: 'Lady Agatha Blackwood', short: 'Lady Agatha', desc: 'the dowager, who held the purse strings and never let go' },
    { name: 'Mr. Percival Gilt', short: 'Mr. Gilt', desc: 'the family solicitor, who arrived with a new will in his briefcase' },
    { name: 'Colonel Hector Ames', short: 'the Colonel', desc: 'a house guest who collected other people’s letters' },
    { name: 'Madame Sibyl Quist', short: 'Madame Quist', desc: 'a medium, hired to talk to the dead and suspected of listening to the living' },
  ],
  occasions: [
    '{v} had called the whole household together to hear a new will read. Nobody liked the sound of that.',
    'It was the night of the midsummer ball, and {v} had promised an announcement at midnight.',
    '{v} insisted on a séance after dinner, to ask the dead a few pointed questions.',
    'The storm cut the telephone wires at nine. {v} called it the perfect night for cards, and dealt everyone in.',
    'It was {v}’s birthday, and every guest had brought a present and a grudge.',
    'A shooting weekend, said {v}. Then the rain came, and nobody was allowed to leave.',
    '{v} had invited everyone to a murder-mystery party. In hindsight, a mistake.',
    'The annual Blackwood croquet tournament was rained off, and tempers were not.',
    '{v} had announced, over the soup, that somebody at the table was a thief. Then the fish arrived.',
  ],
  found: [
    '{v} was found at one in the morning, and the house has been holding its breath ever since.',
    'At the stroke of midnight there was a crash, and then a scream. {v} was dead.',
    'By breakfast {v} was dead, and the gate was a river of mud.',
    'The butler found {v} at dawn, and dropped the tea tray.',
    '{v} was found in the morning by the dog, who was the only one not to scream.',
    'At half past eleven the lights went out. At twenty to twelve, {v} was dead, and everyone had an alibi but one.',
  ],
  rooms: [
    { id: 'bedroom', name: 'Master Bedroom', short: 'Bed&shy;room', pattern: 'carpet', rect: { x: 0, y: 0, w: 5, h: 1 } },
    { id: 'study', name: 'Study', short: 'Study', pattern: 'rug', rect: { x: 5, y: 0, w: 4, h: 1 } },
    { id: 'kitchen', name: 'Kitchen', short: 'Kitchen', pattern: 'checker', rect: { x: 0, y: 1, w: 2, h: 1 } },
    { id: 'dining', name: 'Dining Hall', short: 'Dining Hall', pattern: 'parquet', rect: { x: 2, y: 1, w: 3, h: 1 } },
    { id: 'library', name: 'Library', short: 'Library', pattern: 'planks', rect: { x: 5, y: 1, w: 2, h: 1 } },
    { id: 'conservatory', name: 'Conservatory', short: 'Conser&shy;vatory', pattern: 'leaves', rect: { x: 7, y: 1, w: 2, h: 1 } },
    { id: 'cellar', name: 'Wine Cellar', short: 'Wine Cellar', pattern: 'stone', rect: { x: 0, y: 2, w: 2, h: 1 } },
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
    { id: 'vane', name: 'Lady Ottoline Vane', short: 'Lady Vane', role: 'the widow’s sister, in mourning since 1911 for reasons nobody can recall', hue: 340,
      traits: { height: 'tall', hand: 'right', hair: 'dark' }, look: { skin: '#EBC9AE', hair: 'bun', acc: ['veil', 'pearls'] },
      motive: 'had been promised the house for twenty years, and had just learned that {v} meant to turn it into a hotel' },
    { id: 'pell', name: 'Dr. Rufus Pell', short: 'Dr. Pell', role: 'family physician, whose bedside manner frightens the healthy', hue: 200,
      traits: { height: 'short', hand: 'right', hair: 'grey' }, look: { skin: '#E3B48F', hair: 'bald', acc: ['glasses', 'moustache'] },
      motive: 'had signed a death certificate years ago that {v} knew to be wildly optimistic' },
    { id: 'crisp', name: 'Major Barnaby Crisp', short: 'Major Crisp', role: 'retired officer, in debt to half the county and at war with the other half', hue: 28,
      traits: { height: 'tall', hand: 'left', hair: 'grey' }, look: { skin: '#D99F7E', hair: 'short', acc: ['moustache', 'medal'] },
      motive: 'owed {v} a small fortune, and {v} had started asking for it back, loudly, at dinner' },
    { id: 'fenn', name: 'Miss Odalys Fenn', short: 'Miss Fenn', role: 'private secretary; knows every secret and charges for most of them', hue: 160,
      traits: { height: 'short', hand: 'left', hair: 'dark' }, look: { skin: '#B98563', hair: 'bob', acc: ['glasses'] },
      motive: 'had been forging {v}’s signature for a year, and had recently got rather good at it' },
    { id: 'thorne', name: 'Reverend Silas Thorne', short: 'Rev. Thorne', role: 'parish vicar, with a sermon for every occasion and a bookmaker for the rest', hue: 265,
      traits: { height: 'tall', hand: 'right', hair: 'fair' }, look: { skin: '#F0D2BC', hair: 'slick', acc: ['collar'] },
      motive: 'had spent the church roof fund at Epsom, and {v} held the betting slips' },
    { id: 'marrow', name: 'Mrs. Edith Marrow', short: 'Mrs. Marrow', role: 'housekeeper of thirty years; has seen everything and dusted most of it', hue: 95,
      traits: { height: 'short', hand: 'right', hair: 'grey' }, look: { skin: '#E8BFA0', hair: 'curly', acc: ['brooch'] },
      motive: 'had been dismissed by {v} that very morning, after thirty years, over a soufflé' },
    { id: 'dray', name: 'Cassius Dray', short: 'Mr. Dray', role: 'art dealer with a suspiciously fresh Vermeer', hue: 48,
      traits: { height: 'tall', hand: 'right', hair: 'dark' }, look: { skin: '#C99272', hair: 'slick', acc: ['monocle', 'bowtie'] },
      motive: 'had sold {v} a Vermeer that was still wet, and {v} had noticed the smell' },
    { id: 'lark', name: 'Imogen Lark', short: 'Miss Lark', role: 'niece and aviator; arrived by motorcycle and left a dent in the lawn', hue: 5,
      traits: { height: 'short', hand: 'left', hair: 'red' }, look: { skin: '#F2CDB3', hair: 'long', acc: ['goggles'] },
      motive: 'needed {v}’s money to fly the Atlantic, and had been told to take the boat like everyone else' },
  ],
};

// ---- 11-worlds-train.js
WORLDS.train = {
  id: 'train',
  name: 'The Meridian Express',
  year: '1931',
  tagline: 'Eleven hours to the border. One carriage too many.',
  layoutKind: 'line',
  guests: 'passengers',
  floors: null,
  relations: ['adjacent', 'ahead'],
  victims: [
    { name: 'Lucian Marlowe', short: 'Mr. Marlowe', desc: 'a banker who bought secrets the way others buy newspapers' },
    { name: 'Baroness Ilse von Roth', short: 'the Baroness', desc: 'who travelled with forty trunks and one enemy in each country' },
    { name: 'Mr. Silas Penhaligon', short: 'Mr. Penhaligon', desc: 'a jeweller carrying a necklace nobody had seen' },
    { name: 'Signor Enzo Bellini', short: 'Signor Bellini', desc: 'an impresario who owed every one of his singers' },
    { name: 'Inspector Raoul Dufresne', short: 'the Inspector', desc: 'a detective on holiday, who could not stop asking questions' },
  ],
  occasions: [
    'The night train is in the mountains, past the last station and short of the next. {v} had booked the whole of the first class.',
    'Snow has stopped the Express on the high pass. {v} had spent the evening telling everyone exactly what they owed.',
    '{v} boarded at the last minute, with a locked case chained to one wrist.',
    'It was meant to be a quiet crossing. Then {v} announced, over dessert, that one of the passengers was not who they claimed to be.',
    'The Express left the city at ten. By eleven, {v} had quarrelled with every passenger aboard.',
    '{v} had reserved the dining car for a private party, and invited exactly the wrong people.',
    'The Express was running two hours late, and {v} had blamed each passenger in turn.',
  ],
  found: [
    '{v} was found at a quarter to three. Nobody has been allowed to leave their carriage since.',
    'In the tunnel the lights went out. When they came back on, {v} was dead.',
    'The conductor found {v} at dawn, and pulled the emergency cord.',
    'A scream at midnight, a door slamming, and {v} would never reach the border.',
    'The steward brought {v} a nightcap at one. {v} never finished it.',
  ],
  // listed front (engine end) to back
  rooms: [
    { id: 'mail', name: 'Mail Car', short: 'Mail', pattern: 'planks', rect: { x: 0, y: 0, w: 1, h: 1 } },
    { id: 'dining', name: 'Dining Car', short: 'Dining', pattern: 'parquet', rect: { x: 1, y: 0, w: 1, h: 1 } },
    { id: 'smoking', name: 'Smoking Lounge', short: 'Smoking', pattern: 'rug', rect: { x: 2, y: 0, w: 1, h: 1 } },
    { id: 'sleeper', name: 'Sleeper Car', short: 'Sleeper', pattern: 'carpet', rect: { x: 3, y: 0, w: 1, h: 1 } },
    { id: 'bar', name: 'Bar Car', short: 'Bar', pattern: 'checker', rect: { x: 4, y: 0, w: 1, h: 1 } },
    { id: 'observation', name: 'Observation Car', short: 'Obser&shy;vation', pattern: 'leaves', rect: { x: 5, y: 0, w: 1, h: 1 } },
    { id: 'luggage', name: 'Luggage Van', short: 'Luggage', pattern: 'stone', rect: { x: 6, y: 0, w: 1, h: 1 } },
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
    { id: 'valcourt', name: 'Madame Zora Valcourt', short: 'Mme Valcourt', role: 'opera singer, travelling with three hatboxes and one grudge', hue: 330,
      traits: { height: 'tall', hand: 'right', hair: 'dark' }, look: { skin: '#D9A684', hair: 'long', acc: ['feather', 'earrings'] },
      motive: 'had been replaced in next season’s Tosca on the say-so of {v}, by a soprano half the age' },
    { id: 'orlov', name: 'Count Mikhail Orlov', short: 'Count Orlov', role: 'exiled aristocrat with a borrowed title and a borrowed overcoat', hue: 220,
      traits: { height: 'tall', hand: 'left', hair: 'fair' }, look: { skin: '#F0D3C0', hair: 'slick', acc: ['beard', 'medal'] },
      motive: 'was no count at all, and {v} had the birth certificate from Croydon to prove it' },
    { id: 'brandt', name: 'Professor Hugo Brandt', short: 'Prof. Brandt', role: 'archaeologist, guarding a locked crate that occasionally hums', hue: 35,
      traits: { height: 'short', hand: 'right', hair: 'grey' }, look: { skin: '#E5B897', hair: 'bald', acc: ['glasses', 'beard'] },
      motive: 'had smuggled the crate out of Egypt, and {v} had threatened to tell the museum, and possibly the mummy' },
    { id: 'ashgrove', name: 'Miss Winifred Ashgrove', short: 'Miss Ashgrove', role: 'travel writer who notices everything and exaggerates the rest', hue: 150,
      traits: { height: 'short', hand: 'left', hair: 'fair' }, look: { skin: '#F3D6C2', hair: 'bob', acc: ['cloche'] },
      motive: 'had written a book about {v}, and {v} had paid a great deal to keep it unpublished, which only made it better' },
    { id: 'quill', name: 'Mr. Jasper Quill', short: 'Mr. Quill', role: 'diamond broker with nervous hands and very full pockets', hue: 275,
      traits: { height: 'short', hand: 'right', hair: 'dark' }, look: { skin: '#C08A68', hair: 'short', acc: ['bowler', 'moustache'] },
      motive: 'had sold {v} a diamond made of paste, and the jeweller in Vienna was expecting it' },
    { id: 'crane', name: 'Lady Philippa Crane', short: 'Lady Crane', role: 'heiress: bored, well informed, and armed with opinions', hue: 10,
      traits: { height: 'tall', hand: 'right', hair: 'red' }, look: { skin: '#F4D2BE', hair: 'curly', acc: ['pearls'] },
      motive: 'was engaged to {v}’s son, and {v} had sworn the wedding would happen over a dead body, which turned out to be accurate' },
    { id: 'reyes', name: 'Dr. Tomas Reyes', short: 'Dr. Reyes', role: 'surgeon on the way to a conference, with a suspiciously large bag', hue: 185,
      traits: { height: 'tall', hand: 'right', hair: 'dark' }, look: { skin: '#B07B57', hair: 'short', acc: ['moustache'] },
      motive: 'had lost a patient on the table in Lisbon, and {v} knew it was a game of cards that had distracted the surgeon' },
    { id: 'hale', name: 'Captain Edmund Hale', short: 'Capt. Hale', role: 'retired naval officer and lifelong insomniac', hue: 75,
      traits: { height: 'short', hand: 'left', hair: 'grey' }, look: { skin: '#DDA788', hair: 'short', acc: ['captcap', 'beard'] },
      motive: 'had run a ship aground in 1919, and {v} had the logbook that was supposed to have gone down with it' },
  ],
};

WORLDS.liner = {
  id: 'liner',
  name: 'The RMS Aurelia',
  year: '1935',
  tagline: 'Five days to New York. Somebody won’t make it.',
  layoutKind: 'dollhouse',
  guests: 'passengers',
  floors: ['below decks', 'on the promenade deck', 'on the sun deck'],
  relations: ['adjacent', 'floor'],
  victims: [
    { name: 'Mr. Thaddeus Vole', short: 'Mr. Vole', desc: 'a millionaire who had made his money in other people’s misfortunes' },
    { name: 'Mrs. Honoria Bright', short: 'Mrs. Bright', desc: 'a gossip columnist with a notebook full of names' },
    { name: 'Monsieur Gaston Leroux', short: 'Monsieur Leroux', desc: 'a card sharp who never lost, until tonight' },
    { name: 'Lord Cuthbert Ainsley', short: 'Lord Ainsley', desc: 'a peer travelling under somebody else’s name' },
    { name: 'Miss Verity Crowe', short: 'Miss Crowe', desc: 'a starlet whose last film nobody had been allowed to see' },
  ],
  occasions: [
    'It was the captain’s gala, the third night out, and {v} had a table to the left of the orchestra.',
    'The Aurelia was halfway across the Atlantic, and {v} had been heard promising to “settle accounts before New York”.',
    'Fog had settled on the ocean, the foghorn sounded every minute, and {v} was winning at cards again.',
    '{v} had come aboard at Southampton with a sealed envelope, and told the whole bar it was dynamite.',
    'A fancy-dress ball on the second night out, and {v} had come as Napoleon.',
    'The ship’s talent show was under way, and {v} had already heckled three acts.',
    '{v} had won the ship’s sweepstake on the day’s mileage, and been insufferable about it ever since.',
  ],
  found: [
    '{v} was found when the ship’s bell rang two. The captain has sealed every deck.',
    'The steward knocked, and knocked again, and found {v} dead.',
    'Over the band, the purser heard a single cry. By the time he reached {v}, it was too late.',
    'At dawn a deckhand found {v}, and the Aurelia sailed on, one passenger lighter.',
    'The band played on, which was a mercy, because {v} had stopped playing for good.',
  ],
  rooms: [
    { id: 'bridge', name: 'Wheelhouse', short: 'Wheel&shy;house', pattern: 'planks', rect: { x: 0, y: 0, w: 4, h: 1 } },
    { id: 'lido', name: 'Palm Court', short: 'Palm Court', pattern: 'leaves', rect: { x: 4, y: 0, w: 4, h: 1 } },
    { id: 'saloon', name: 'Grand Saloon', short: 'Saloon', pattern: 'parquet', rect: { x: 0, y: 1, w: 3, h: 1 } },
    { id: 'writing', name: 'Writing Room', short: 'Writing Room', pattern: 'rug', rect: { x: 3, y: 1, w: 2, h: 1 } },
    { id: 'purser', name: 'Purser’s Office', short: 'Purser’s Office', pattern: 'carpet', rect: { x: 5, y: 1, w: 3, h: 1 } },
    { id: 'engine', name: 'Engine Room', short: 'Engine Room', pattern: 'checker', rect: { x: 0, y: 2, w: 4, h: 1 } },
    { id: 'hold', name: 'Cargo Hold', short: 'Hold', pattern: 'stone', rect: { x: 4, y: 2, w: 4, h: 1 } },
  ],
  weapons: [
    { id: 'harpoon', name: 'Whaling Harpoon', short: 'Harpoon', type: 'blade', note: 'a souvenir from the smoking room wall' },
    { id: 'fishknife', name: 'Silver Fish Knife', short: 'Fish knife', type: 'blade', note: 'from the captain’s table' },
    { id: 'sextant', name: 'Brass Sextant', short: 'Sextant', type: 'blunt', note: 'its mirror cracked' },
    { id: 'pin', name: 'Belaying Pin', short: 'Belaying pin', type: 'blunt', note: 'solid oak' },
    { id: 'gin', name: 'Poisoned Gin Fizz', short: 'Gin fizz', type: 'poison', note: 'smells faintly of almonds' },
    { id: 'rope', name: 'Mooring Rope', short: 'Rope', type: 'cord', note: 'tarred and salty' },
    { id: 'flare', name: 'Flare Pistol', short: 'Flare pistol', type: 'firearm', note: 'one cartridge fired' },
  ],
  suspects: [
    { id: 'moreau', name: 'Miss Delphine Moreau', short: 'Miss Moreau', role: 'cabaret star, sailing to Broadway with forty costumes and no luggage allowance', hue: 320,
      traits: { height: 'tall', hand: 'left', hair: 'fair' }, look: { skin: '#F1D0BA', hair: 'bob', acc: ['feather', 'earrings'] },
      motive: 'had a contract on Broadway that {v} had promised to tear up, in front of the press' },
    { id: 'fitch', name: 'Sir Reginald Fitch', short: 'Sir Reginald', role: 'shipping magnate who owns a share of the ship and mentions it constantly', hue: 210,
      traits: { height: 'short', hand: 'right', hair: 'grey' }, look: { skin: '#E8B996', hair: 'bald', acc: ['tophat', 'moustache'] },
      motive: 'had saved money on the Aurelia’s lifeboats, and {v} had counted them' },
    { id: 'teague', name: 'Miss Ivy Teague', short: 'Miss Teague', role: 'ship’s nurse, with an excellent memory and a very cold stethoscope', hue: 120,
      traits: { height: 'short', hand: 'right', hair: 'red' }, look: { skin: '#F4D5C0', hair: 'bun', acc: ['nursecap'] },
      motive: 'had nursed {v}’s late wife, and had never once believed it was a fever' },
    { id: 'kraus', name: 'Dr. Anselm Kraus', short: 'Dr. Kraus', role: 'stage hypnotist, booked for the crossing; looks into your eyes far too long', hue: 270,
      traits: { height: 'tall', hand: 'left', hair: 'dark' }, look: { skin: '#E2B898', hair: 'slick', acc: ['monocle', 'beard'] },
      motive: 'had hypnotised {v} into signing a cheque, and {v} had woken up halfway through the zeros' },
    { id: 'ventura', name: 'Signor Paolo Ventura', short: 'Signor Ventura', role: 'bandleader of the Aurelia Seven, who are five', hue: 30,
      traits: { height: 'short', hand: 'right', hair: 'dark' }, look: { skin: '#C7916C', hair: 'curly', acc: ['bowtie', 'moustache'] },
      motive: 'had gambled away the band’s wages, and {v} held the markers and both missing saxophonists' },
    { id: 'holloway', name: 'Lady Beatrix Holloway', short: 'Lady Holloway', role: 'crime novelist, taking notes, and taking far too much interest', hue: 0,
      traits: { height: 'tall', hand: 'right', hair: 'grey' }, look: { skin: '#EFCDB6', hair: 'bun', acc: ['glasses', 'pearls'] },
      motive: 'had lifted the plot of a bestseller from {v}, who wanted the royalties and the film rights' },
    { id: 'pike', name: 'Mr. Oswin Pike', short: 'Mr. Pike', role: 'the ship’s purser, keeper of the safe and of everyone’s business', hue: 190,
      traits: { height: 'tall', hand: 'right', hair: 'fair' }, look: { skin: '#F0CBB0', hair: 'short', acc: ['captcap'] },
      motive: 'had been quietly emptying the passengers’ jewel cases, and {v} had kept a list' },
    { id: 'ashby', name: 'Miss Clementine Ashby', short: 'Miss Ashby', role: 'tennis champion, travelling incognito in very large sunglasses', hue: 55,
      traits: { height: 'short', hand: 'left', hair: 'dark' }, look: { skin: '#A8714F', hair: 'long', acc: ['headband'] },
      motive: 'had thrown the Wimbledon final for money, and {v} was the one who paid' },
  ],
};

// Weapon types: how the coroner and the witnesses talk about them.
const WEAPON_TYPES = {
  blade:   { label: 'a blade',        cause: 'a clean, deep cut',              held: 'something sharp',            any: 'anything sharp' },
  blunt:   { label: 'a blunt object', cause: 'a single heavy blow',            held: 'something heavy and blunt',  any: 'anything heavy' },
  poison:  { label: 'poison',         cause: 'poison in the blood',            held: 'something poisonous',        any: 'any poison' },
  cord:    { label: 'a cord',         cause: 'ligature marks around the neck', held: 'something to strangle with', any: 'any cord or rope' },
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
  const suspects = suspectPick.map((i) => world.suspects[i]);
  return {
    world, n, suspects,
    weapons: weaponPick.map((i) => world.weapons[i]),
    rooms, adj, floor, pos,
    types: weaponPick.map((i) => world.weapons[i].type),
    traits: suspects.map((s) => s.traits),
    roomIdx: roomPick, suspectIdx: suspectPick, weaponIdx: weaponPick,
  };
}

// kind: W = weapons only, R = rooms only, X = both, M = murder (returns a bitmask of possible killers)
// family: direct | neg | link | rel | murder | trait -- used to tune difficulty
function C(type, kind, family, args, test) {
  return { type, kind, family, args, test };
}

function enumerateClues(ctx) {
  const { n, adj, floor, pos, types, traits, world } = ctx;
  const S = [...Array(n).keys()];
  const out = [];
  const typeSet = [...new Set(types)];
  const floorSet = [...new Set(floor)];
  const hasFloors = world.relations.includes('floor');
  const hasAhead = world.relations.includes('ahead');
  const FULL = (1 << n) - 1;
  const maskOf = (f) => { let m = 0; for (const s of S) if (f(s)) m |= 1 << s; return m; };
  // trait values that split tonight's suspects (a trait everyone shares tells nobody anything)
  const traitVals = [];
  for (const k of TRAIT_KEYS) {
    const vals = [...new Set(traits.map((t) => t[k]))];
    if (vals.length > 1) for (const v of vals) traitVals.push([k, v]);
  }

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
  // ---- traits: a hair on the weapon, a footprint in the room. Read them off the suspects' cards.
  for (const [k, v] of traitVals) {
    for (const w of S) out.push(C('traitWeapon', 'W', 'trait', { w, k, v }, (pw, pwi) => traits[pwi[w]][k] === v));
    for (const r of S) out.push(C('traitRoom', 'R', 'trait', { r, k, v }, (pw, pwi, pr, pri) => traits[pri[r]][k] === v));
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
  for (const [k, v] of traitVals) out.push(C('murderTrait', 'M', 'murder', { k, v }, () => maskOf((m) => traits[m][k] === v)));
  return out;
}

// ---- testimony. Every suspect says one thing. The innocent tell the truth; the killer lies.
// Only statements a person could sensibly make, and that the human solver can turn into one small constraint
// (so it can also be negated), can be testimony. Everything else is evidence, which is always true.
const TESTIMONY_TYPES = ['has', 'notHas', 'in', 'notIn', 'eitherHas', 'eitherIn', 'holdsType', 'notHoldsType', 'sameType', 'diffType',
  'adjacent', 'notAdjacent', 'sameFloor', 'diffFloor', 'ahead', 'murderNotSuspect', 'murderType', 'murderNotType', 'murderNotWeapon',
  'murderNotRoom', 'murderFloor', 'murderNotFloor', 'murderAdjRoom', 'murderNotAdjRoom', 'murderTrait'];

// A statement by `sp`, as a murder clue: in each arrangement, the killers it allows are those for whom it is
// consistent (the statement is true and sp is not the killer, or it is false and sp is).
function testimony(c, sp, n) {
  const FULL = (1 << n) - 1, me = 1 << sp, base = c.test, M = c.kind === 'M';
  const test = (pw, pwi, pr, pri) => ((M ? base(pw, pwi, pr, pri) : base(pw, pwi, pr, pri) ? FULL : 0) ^ me) & FULL;
  return { type: c.type, kind: 'M', baseKind: c.kind, family: c.family, args: c.args, speaker: sp, test, base: c };
}
// Is the statement itself true in this arrangement (ignoring who said it)?
function statementTrue(c, truth, pwi, pri) {
  const b = c.base || c, v = b.test(truth.pw, pwi, truth.pr, pri);
  return b.kind === 'M' ? (v & (1 << truth.m)) !== 0 : v;
}

// Does the clue hold for the hidden truth {pw, pr, m}?
function clueHolds(clue, truth, pwi, pri) {
  const v = clue.test(truth.pw, pwi, truth.pr, pri);
  return clue.kind === 'M' ? (v & (1 << truth.m)) !== 0 : v;
}

// ---- 25-text.js
// Turns a clue into words. Tokens {s:i} {w:i} {r:i} are swapped for names by the renderer,
// so the UI can highlight and cross-reference them.
// Every clue has three wordings. Evidence ('note') is always true. Testimony ('say') is spoken by a suspect, in
// their own voice ("I was in the Library"), and is true unless the speaker is the killer. The logic always comes
// first and plainly; any joke rides on the end and never changes what the clue means.
// Banked cases store the variant index, so keep three wordings per type when rewording (test-variants.js checks it).
const HAIR_WORD = { dark: 'dark', fair: 'fair', red: 'red', grey: 'grey' };
const traitWord = (k, v) => TRAITS[k].values[v];

function clueVariants(c, ctx, sp) {
  const a = c.args;
  const line = ctx.world.layoutKind === 'line';
  const unit = line ? 'carriage' : 'room';
  const S = (i) => `{s:${i}}`, W = (i) => `{w:${i}}`, R = (i) => `{r:${i}}`;
  const T = (t) => WEAPON_TYPES[t];
  const floorWord = (f) => ctx.world.floors[f];
  const join = line ? 'a coupling' : 'a door or a stair';
  const away = line ? 'coupled to it' : 'a door or a stair away';
  const cap = (s) => (s[0] === '{' ? s : s[0].toUpperCase() + s.slice(1));
  const three = (voice, v0, v1, v2) => [[voice, v0], [voice, v1], [voice, v2]];
  const say = sp !== undefined && sp !== null;
  if (say) {
    const me = (i) => i === sp;
    const subj = (i) => (me(i) ? 'I' : S(i)), obj = (i) => (me(i) ? 'me' : S(i));
    const poss = (i) => (me(i) ? 'my' : `${S(i)}'s`), possN = (i) => (me(i) ? 'mine' : `${S(i)}'s`);
    const both = (x, y) => (me(x) ? `${S(y)} and I` : me(y) ? `${S(x)} and I` : `${S(x)} and ${S(y)}`);
    const either = (x, y, f) => (me(x) ? `${S(y)} or ${f}` : me(y) ? `${S(x)} or ${f}` : `${S(x)} or ${S(y)}`);
    const self = a.s !== undefined && me(a.s);
    const inPair = (a.a !== undefined && me(a.a)) || (a.b !== undefined && me(a.b));
    const t = (v0, v1, v2) => three('say', v0, v1, v2);
    switch (c.type) {
      case 'has': return self
        ? t(`I had the ${W(a.w)}. I won't pretend otherwise.`, `The ${W(a.w)} was mine to hold all evening.`, `Fine, yes, I had the ${W(a.w)}. It went with my outfit.`)
        : t(`${S(a.s)} had the ${W(a.w)}. I saw it plainly.`, `I saw ${S(a.s)} with the ${W(a.w)} in hand.`, `${S(a.s)} had the ${W(a.w)}, and was waving it about most unpleasantly.`);
      case 'notHas': return self
        ? t(`I never touched the ${W(a.w)}.`, `Whoever had the ${W(a.w)}, it wasn't me.`, `The ${W(a.w)}? I wouldn't touch it with a barge pole.`)
        : t(`${S(a.s)} never touched the ${W(a.w)}.`, `Whoever had the ${W(a.w)}, it wasn't ${S(a.s)}.`, `${S(a.s)} didn't have the ${W(a.w)}. ${S(a.s)} can barely hold a teacup.`);
      case 'in': return self
        ? t(`I was in the ${R(a.r)} the whole time.`, `I never left the ${R(a.r)}.`, `I was in the ${R(a.r)}, minding my own business, which is more than some people can say.`)
        : t(`${S(a.s)} was in the ${R(a.r)}. I'd know that voice anywhere.`, `I saw ${S(a.s)} in the ${R(a.r)}.`, `${S(a.s)} was in the ${R(a.r)}, humming. Badly.`);
      case 'notIn': return self
        ? t(`I never set foot in the ${R(a.r)}.`, `I wasn't in the ${R(a.r)}, whatever you've heard.`, `The ${R(a.r)}? I wasn't there. I wouldn't be seen dead there, if you'll pardon the expression.`)
        : t(`${S(a.s)} was not in the ${R(a.r)}.`, `${S(a.s)} never set foot in the ${R(a.r)}.`, `${S(a.s)} wasn't in the ${R(a.r)}. I'd have smelled the cologne.`);
      case 'eitherHas': return t(`Either ${either(a.a, a.b, 'I')} had the ${W(a.w)}.`, `The ${W(a.w)} was with ${either(a.a, a.b, 'me')}. One of the two.`,
        `I'd bet my last shilling the ${W(a.w)} was with ${either(a.a, a.b, 'me')}.`);
      case 'eitherIn': return t(`Either ${either(a.a, a.b, 'I')} was in the ${R(a.r)}.`,
        `Someone was in the ${R(a.r)}: ${either(a.a, a.b, 'me')}. ${inPair ? 'I won’t say which.' : 'It was too dark to see which.'}`,
        `The ${R(a.r)}? That was ${either(a.a, a.b, 'me')}. ${inPair ? 'I’m saying no more.' : 'One of the two, I’m sure of it.'}`);
      case 'holdsType': return self
        ? t(`I'll admit I had ${T(a.t).held}.`, `Yes, I had ${T(a.t).held} on me.`, `I had ${T(a.t).held}. For self-defence, naturally.`)
        : t(`${S(a.s)} was carrying ${T(a.t).held}.`, `${S(a.s)} had ${T(a.t).held}. I noticed it straight away.`, `${S(a.s)} had ${T(a.t).held}, and didn't care who knew it.`);
      case 'notHoldsType': return self
        ? t(`I didn't have ${T(a.t).any}. Search me.`, `I wasn't carrying ${T(a.t).any}.`, `${cap(T(a.t).any)}? On me? Don't be absurd.`)
        : t(`${S(a.s)} wasn't carrying ${T(a.t).any}.`, `${S(a.s)} didn't have ${T(a.t).any}. I checked.`, `Whatever ${S(a.s)} had, it wasn't ${T(a.t).label}. I'd have noticed.`);
      case 'sameType': return t(`${both(a.a, a.b)} carried the same kind of weapon.`, `${cap(poss(a.a))} weapon was the same kind as ${possN(a.b)}.`,
        `${both(a.a, a.b)} had the same kind of weapon. Matching, like a pair of bookends.`);
      case 'diffType': return t(`${both(a.a, a.b)} carried different kinds of weapon.`, `${cap(poss(a.a))} weapon was a different kind from ${possN(a.b)}.`,
        `${both(a.a, a.b)} had different kinds of weapon. We never agree on anything.`.replace('We never', inPair ? 'We never' : 'They never'));
      case 'adjacent': return line
        ? t(`${both(a.a, a.b)} were in carriages next to each other, coupled together.`, `${cap(poss(a.a))} carriage was coupled to ${possN(a.b)}.`,
          `${both(a.a, a.b)} were in carriages coupled together. You could hear every word through the gangway.`)
        : t(`${both(a.a, a.b)} were in rooms next to each other, a door or a stair apart.`, `${cap(poss(a.a))} room was next to ${possN(a.b)}, a door or a stair away.`,
          `${both(a.a, a.b)} were in rooms next to each other, a door or a stair apart. The walls are terribly thin.`);
      case 'notAdjacent': return line
        ? t(`${both(a.a, a.b)} weren't in carriages next to each other.`, `${cap(poss(a.a))} carriage and ${possN(a.b)} were not coupled together.`,
          `There was at least one carriage between ${obj(a.a)} and ${obj(a.b)}. Not close enough to chat.`)
        : t(`${both(a.a, a.b)} weren't in rooms next to each other.`, `No single door or stair joined ${poss(a.a)} room to ${possN(a.b)}.`,
          `${both(a.a, a.b)} weren't next to each other: more than one door or stair apart, and glad of it.`);
      case 'sameFloor': return t(`${both(a.a, a.b)} were on the same floor.`, `${cap(poss(a.a))} room and ${possN(a.b)} were on one floor.`,
        `${both(a.a, a.b)} were on the same floor. I heard the boards creak.`);
      case 'diffFloor': return t(`${both(a.a, a.b)} were on different floors.`, `${subj(a.a)} was on one floor and ${subj(a.b)} on another.`,
        `${both(a.a, a.b)} were not on the same floor. Thank heavens.`);
      case 'ahead': return t(`${cap(poss(a.a))} carriage was nearer the engine than ${possN(a.b)}.`, `Walking back from the engine, you'd pass ${obj(a.a)} before ${obj(a.b)}.`,
        `${subj(a.a)} was further up the train than ${subj(a.b)}. Nearer the engine, I mean.`);
      case 'murderNotSuspect': return t(`It wasn't ${S(a.s)}. I'd stake my life on it.`, `${S(a.s)} didn't do it. I'm certain.`,
        `${S(a.s)}? A murderer? ${S(a.s)} apologises to the furniture.`);
      case 'murderType': return t(`The killer used ${T(a.t).held}. I saw the wound.`, `It was done with ${T(a.t).label}. Anyone could see that.`,
        `${cap(T(a.t).label)}. It was ${T(a.t).label}, mark my words.`);
      case 'murderNotType': return t(`The killer didn't use ${T(a.t).any}.`, `Whatever the weapon was, it wasn't ${T(a.t).label}.`,
        `It wasn't ${T(a.t).label}. I know ${T(a.t).label} when I see it.`);
      case 'murderNotWeapon': return t(`The ${W(a.w)} wasn't the murder weapon.`, `Forget the ${W(a.w)}. It's clean.`,
        `The ${W(a.w)}? Purely decorative, I assure you. It killed nobody.`);
      case 'murderNotRoom': return t(`The body wasn't in the ${R(a.r)}.`, `Nobody died in the ${R(a.r)}. I'd have known.`,
        `Whatever happened, it didn't happen in the ${R(a.r)}.`);
      case 'murderFloor': return t(`The body was found ${floorWord(a.f)}.`, `It happened ${floorWord(a.f)}. I heard it.`,
        `It was ${floorWord(a.f)}, I'm sure of it. I heard the commotion.`);
      case 'murderNotFloor': return t(`The body wasn't found ${floorWord(a.f)}.`, `Whatever happened, it didn't happen ${floorWord(a.f)}.`,
        `It can't have been ${floorWord(a.f)}. It was quiet as a church ${floorWord(a.f)}.`);
      case 'murderAdjRoom': return line
        ? t(`The body was in a carriage coupled to the ${R(a.r)}, not in it.`, `It happened right next to the ${R(a.r)}. Not in it, next to it.`,
          `The body was one carriage over from the ${R(a.r)}, coupled to it. Not in the ${R(a.r)} itself.`)
        : t(`The body was a door or a stair away from the ${R(a.r)}, not in it.`, `It happened next to the ${R(a.r)}, a door or a stair away. Not in it.`,
          `The body was in a room next to the ${R(a.r)}, a door or a stair away. Not in the ${R(a.r)} itself.`);
      case 'murderNotAdjRoom': return line
        ? t(`The body wasn't in the ${R(a.r)}, nor in a carriage coupled to it.`, `It didn't happen in the ${R(a.r)}, or anywhere next to it.`,
          `The ${R(a.r)} and the carriages coupled to it? Nothing happened there.`)
        : t(`The body wasn't in the ${R(a.r)}, nor anywhere a door or a stair away.`, `It didn't happen in the ${R(a.r)}, or anywhere next to it.`,
          `The ${R(a.r)}, and every room a door or a stair from it? Nothing happened there.`);
      case 'murderTrait': return t(`The killer was ${traitWord(a.k, a.v)}. I caught a glimpse.`, `Whoever did it was ${traitWord(a.k, a.v)}. I'd swear to that.`,
        `I only caught a glimpse, but the killer was ${traitWord(a.k, a.v)}.`);
    }
    throw new Error('no testimony for clue type ' + c.type);
  }
  const n = (v0, v1, v2) => three('note', v0, v1, v2);
  const hair = HAIR_WORD[a.v], tw = a.k ? traitWord(a.k, a.v) : '';
  switch (c.type) {
    case 'has': return n(`${S(a.s)} had the ${W(a.w)}. The prints leave no doubt.`, `The ${W(a.w)} is covered in ${S(a.s)}'s fingerprints, and nobody else's. ${S(a.s)} had it.`,
      `${S(a.s)} had the ${W(a.w)}. A witness saw it and fainted, which is how we know.`);
    case 'notHas': return n(`Whoever had the ${W(a.w)}, it was not ${S(a.s)}. The prints don't match.`, `${S(a.s)}'s gloves are spotless, and the ${W(a.w)} would have marked them. ${S(a.s)} never had it.`,
      `${S(a.s)} did not have the ${W(a.w)}. We checked, and ${S(a.s)} was very rude about it.`);
    case 'in': return n(`Muddy footprints put ${S(a.s)} in the ${R(a.r)}.`, `${S(a.s)} was in the ${R(a.r)}. A monogrammed handkerchief proves it.`,
      `${S(a.s)} was in the ${R(a.r)}, and left a teacup ring on the furniture to prove it.`);
    case 'notIn': return n(`${S(a.s)} was not in the ${R(a.r)}: not one footprint.`, `${S(a.s)} never went into the ${R(a.r)}. The dust on the doorstep says so.`,
      `Wherever ${S(a.s)} was, it was not the ${R(a.r)}.`);
    case 'eitherHas': return n(`Only ${S(a.a)} or ${S(a.b)} could have had the ${W(a.w)}.`, `The ${W(a.w)} was held by ${S(a.a)} or by ${S(a.b)}. The smudges won't say which.`,
      `The glove marks on the ${W(a.w)} fit ${S(a.a)} or ${S(a.b)}, and nobody else. One of them had it.`);
    case 'eitherIn': return n(`Whoever was in the ${R(a.r)}, it was ${S(a.a)} or ${S(a.b)}.`, `Someone was in the ${R(a.r)}, and it was ${S(a.a)} or ${S(a.b)}. The perfume could be either's.`,
      `The ${R(a.r)} was occupied by ${S(a.a)} or by ${S(a.b)}. Each blames the other.`);
    case 'holdsType': return n(`${S(a.s)}'s weapon was ${T(a.t).held}.`, `${S(a.s)} was carrying ${T(a.t).held}, which is not the done thing at dinner.`,
      `A search of ${S(a.s)}'s pockets settles it: ${S(a.s)}'s weapon was ${T(a.t).held}.`);
    case 'notHoldsType': return n(`Whatever ${S(a.s)} carried, it wasn't ${T(a.t).label}.`, `${S(a.s)}'s weapon was not ${T(a.t).label}. We would have noticed.`,
      `${S(a.s)} was searched, and was not carrying ${T(a.t).any}.`);
    case 'sameType': return n(`${S(a.a)}'s weapon was the same kind as ${S(a.b)}'s.`, `${S(a.a)} and ${S(a.b)} carried the same kind of weapon. Great minds, as they say.`,
      `Whatever kind of weapon ${S(a.a)} carried, ${S(a.b)} carried the same kind.`);
    case 'diffType': return n(`${S(a.a)}'s weapon and ${S(a.b)}'s were of different kinds.`, `${S(a.a)} and ${S(a.b)} carried different kinds of weapon. At least they have that in common.`,
      `Whatever kind of weapon ${S(a.a)} carried, ${S(a.b)}'s was a different kind.`);
    case 'adjacent': return line
      ? n(`${S(a.a)}'s carriage was coupled to ${S(a.b)}'s.`, `${S(a.a)} and ${S(a.b)} were in carriages coupled together.`, `${S(a.a)}'s carriage was right next to ${S(a.b)}'s, coupled together, close enough to share a draught.`)
      : n(`${S(a.a)}'s room was next to ${S(a.b)}'s, joined by ${join}.`, `${S(a.a)} and ${S(a.b)} were a door or a stair apart: next to each other.`,
        `${S(a.a)}'s room and ${S(a.b)}'s were next to each other, a door or a stair apart, close enough to hear each other sneeze.`);
    case 'notAdjacent': return line
      ? n(`${S(a.a)}'s carriage and ${S(a.b)}'s were not coupled together.`, `${S(a.a)} and ${S(a.b)} were not in carriages next to each other.`, `Between ${S(a.a)}'s carriage and ${S(a.b)}'s there was at least one other carriage.`)
      : n(`No single door or stair joined ${S(a.a)}'s room to ${S(a.b)}'s.`, `${S(a.a)} and ${S(a.b)} were not in rooms next to each other.`,
        `To get from ${S(a.a)}'s room to ${S(a.b)}'s, you'd need more than one door or stair.`);
    case 'sameFloor': return n(`${S(a.a)}'s room and ${S(a.b)}'s were on one floor.`, `${S(a.a)} and ${S(a.b)} were on the same floor.`,
      `${S(a.a)} and ${S(a.b)} were on the same floor, and each blames the other for the creaking.`);
    case 'diffFloor': return n(`${S(a.a)} and ${S(a.b)} were on different floors.`, `${S(a.a)} was on one floor, ${S(a.b)} on another.`,
      `${S(a.a)} and ${S(a.b)} were not on the same floor, which suited them both.`);
    case 'ahead': return n(`${S(a.a)}'s carriage was nearer the engine than ${S(a.b)}'s.`, `${S(a.a)} was nearer the front of the train than ${S(a.b)}.`,
      `Walking back from the engine, you'd reach ${S(a.a)} before ${S(a.b)}.`);
    case 'weaponIn': return n(`Whoever was in the ${R(a.r)} was holding the ${W(a.w)}.`, `The ${W(a.w)} was in the ${R(a.r)}, in somebody's hand.`,
      `The ${W(a.w)} turned up in the ${R(a.r)}, along with whoever was holding it.`);
    case 'weaponNotIn': return n(`Whoever was in the ${R(a.r)}, they weren't holding the ${W(a.w)}.`, `The ${W(a.w)} was never in the ${R(a.r)}.`,
      `The ${W(a.w)} and the ${R(a.r)} never met.`);
    case 'weaponNear': return line
      ? n(`The ${W(a.w)} was in a carriage next to the ${R(a.r)} (${away}), not in the ${R(a.r)} itself.`, `The ${W(a.w)} was one carriage over from the ${R(a.r)}, coupled to it. Not in it.`,
        `Whoever had the ${W(a.w)} was in a carriage coupled to the ${R(a.r)}, though not in the ${R(a.r)} itself.`)
      : n(`The ${W(a.w)} was in a room next to the ${R(a.r)} (${away}), not in the ${R(a.r)} itself.`, `The ${W(a.w)} was a door or a stair from the ${R(a.r)}: next to it, not in it.`,
        `Whoever had the ${W(a.w)} was in a room next to the ${R(a.r)}, though not in the ${R(a.r)} itself.`);
    case 'typeInRoom': return n(`The person in the ${R(a.r)} was carrying ${T(a.t).held}.`, `Whoever was in the ${R(a.r)} had ${T(a.t).held}.`,
      `Whoever was in the ${R(a.r)} had ${T(a.t).held}. The marks on the furniture say so.`);
    case 'notTypeInRoom': return n(`The person in the ${R(a.r)} wasn't carrying ${T(a.t).label}.`, `Whoever was in the ${R(a.r)} didn't have ${T(a.t).any}.`,
      `Whatever the person in the ${R(a.r)} carried, it wasn't ${T(a.t).label}.`);
    case 'traitWeapon': return a.k === 'hair'
      ? n(`A ${hair} hair was caught on the ${W(a.w)}. Whoever had it is ${tw}.`, `Whoever had the ${W(a.w)} is ${tw}: there's a ${hair} hair stuck to it.`, `The ${W(a.w)} was held by someone ${tw}, judging by the hair on the handle.`)
      : a.k === 'hand'
        ? n(`The ${W(a.w)} was held in the ${a.v} hand. Whoever had it is ${tw}.`, `Whoever had the ${W(a.w)} is ${tw}: look at the grip.`, `The ${W(a.w)} was worn smooth on the ${a.v} side. Whoever had it is ${tw}.`)
        : n(`A witness saw a ${a.v} figure with the ${W(a.w)}. Whoever had it is ${a.v}.`, `Whoever had the ${W(a.w)} is ${a.v}. The witness was very definite.`, `The ${W(a.w)} was in the hands of someone ${a.v}.`);
    case 'traitRoom': return a.k === 'hair'
      ? n(`A ${hair} hair was found in the ${R(a.r)}. Whoever was there is ${tw}.`, `Whoever was in the ${R(a.r)} is ${tw}: there's a ${hair} hair on the cushion.`, `The ${R(a.r)} was visited by someone ${tw}. The hairbrush left behind is full of it.`)
      : a.k === 'hand'
        ? n(`The door of the ${R(a.r)} was opened with the ${a.v} hand. Whoever was there is ${tw}.`, `Whoever was in the ${R(a.r)} is ${tw}: see the smudge on the door.`, `Someone ${tw} was in the ${R(a.r)}. The cup on the table had its handle turned to the ${a.v}.`)
        : n(`The footprints in the ${R(a.r)} are ${a.v === 'tall' ? 'long' : 'small'}. Whoever was there is ${a.v}.`, `Whoever was in the ${R(a.r)} is ${a.v}. The footprints say so.`,
          a.v === 'tall' ? `Someone tall was in the ${R(a.r)}: there's a dent in the lampshade at head height.` : `Someone short was in the ${R(a.r)}: they stood on a chair to reach the shelf.`);
    // ---- the body
    case 'murderType': return n(`The coroner found ${T(a.t).cause}. The killer used ${T(a.t).held}.`, `Cause of death: ${T(a.t).cause}. The killer used ${T(a.t).held}.`,
      `The coroner is in no doubt: ${T(a.t).cause}, so the killer used ${T(a.t).held}.`);
    case 'murderNotType': return n(`The coroner rules out ${T(a.t).label}.`, `It was not ${T(a.t).label}. The coroner was quite firm.`, `Whatever the killer used, it wasn't ${T(a.t).label}.`);
    case 'murderNotSuspect': return n(`${S(a.s)} has an alibi that holds. Not the killer.`, `${S(a.s)} has an alibi with three witnesses and a dog. Not the killer.`,
      `${S(a.s)} didn't do it. The alibi is dull, but it holds.`);
    case 'murderNextTo': return line
      ? n(`The killer was in a carriage next to ${S(a.s)}'s, coupled to it.`, `The killer's carriage was coupled to ${S(a.s)}'s.`, `The killer was one carriage over from ${S(a.s)}, coupled to it.`)
      : n(`The killer was in a room next to ${S(a.s)}'s, a door or a stair away.`, `The killer's room was next to ${S(a.s)}'s, a door or a stair away.`,
        `The killer was just a door or a stair from ${S(a.s)}'s room, in the room next to it.`);
    case 'murderFarFrom': return line
      ? n(`It wasn't ${S(a.s)}, nor anyone in a carriage coupled to ${S(a.s)}'s.`, `Not ${S(a.s)}, and not anyone in a carriage next to ${S(a.s)}'s.`, `The killer was neither ${S(a.s)} nor anyone one carriage from ${S(a.s)}.`)
      : n(`It wasn't ${S(a.s)}, nor anyone a door or a stair from ${S(a.s)}'s room.`, `Not ${S(a.s)}, and not anyone in a room next to ${S(a.s)}'s.`,
        `The killer was neither ${S(a.s)} nor anyone a door or a stair from ${S(a.s)}.`);
    case 'murderSameFloor': return n(`The killer was on the same floor as ${S(a.s)}, but it wasn't ${S(a.s)}.`, `The killer shared a floor with ${S(a.s)}. Not ${S(a.s)}, though.`,
      `It was someone on ${S(a.s)}'s floor, other than ${S(a.s)}.`);
    case 'murderAheadOf': return n(`The killer's carriage was nearer the engine than ${S(a.s)}'s.`, `The killer was further up the train than ${S(a.s)}.`,
      `Walking back from the engine, you'd reach the killer before ${S(a.s)}.`);
    case 'murderBehind': return n(`The killer's carriage was further from the engine than ${S(a.s)}'s.`, `The killer was further back along the train than ${S(a.s)}.`,
      `Walking back from the engine, you'd reach ${S(a.s)} before the killer.`);
    case 'murderNotWeapon': return n(`The ${W(a.w)} is clean. It is not the murder weapon.`, `The ${W(a.w)} is innocent. Not the murder weapon.`,
      `Forensics cleared the ${W(a.w)}: it didn't do it.`);
    case 'murderNotRoom': return n(`The body was not found in the ${R(a.r)}.`, `It didn't happen in the ${R(a.r)}.`, `The ${R(a.r)} is the one place we know it didn't happen.`);
    case 'murderAdjRoom': return line
      ? n(`The body was found in a carriage coupled to the ${R(a.r)}, not in the ${R(a.r)} itself.`, `It happened one carriage over from the ${R(a.r)}, coupled to it.`, `The scene was next to the ${R(a.r)}, coupled to it, but not the ${R(a.r)} itself.`)
      : n(`The body was found a door or a stair away from the ${R(a.r)}, not in the ${R(a.r)} itself.`, `It happened in a room next to the ${R(a.r)}, a door or a stair away.`,
        `The scene was next to the ${R(a.r)}, a door or a stair away, but not the ${R(a.r)} itself.`);
    case 'murderNotAdjRoom': return line
      ? n(`The body was not in the ${R(a.r)}, nor in a carriage coupled to it.`, `Nothing happened in the ${R(a.r)} or the carriages coupled to it.`, `The scene was not the ${R(a.r)}, and not next to it.`)
      : n(`The body was not in the ${R(a.r)}, nor anywhere a door or a stair away.`, `Nothing happened in the ${R(a.r)}, or in any room a door or a stair from it.`,
        `The scene was not the ${R(a.r)}, and not next to it.`);
    case 'murderFloor': return n(`The body was found ${floorWord(a.f)}.`, `It happened ${floorWord(a.f)}.`, `The scene of the crime was ${floorWord(a.f)}.`);
    case 'murderNotFloor': return n(`The body was not found ${floorWord(a.f)}.`, `It didn't happen ${floorWord(a.f)}.`, `Whatever happened, it was not ${floorWord(a.f)}.`);
    case 'murderTrait': return a.k === 'hair'
      ? n(`A ${hair} hair was found on the body. The killer is ${tw}.`, `The killer is ${tw}: there's a ${hair} hair on the victim's collar.`, `The victim was clutching a single ${hair} hair. The killer is ${tw}.`)
      : a.k === 'hand'
        ? n(`The coroner says the killer is ${tw}.`, `The killer is ${tw}, says the coroner, who is never wrong about these things.`, `Everything points one way: the killer is ${tw}.`)
        : n(`A witness saw a ${a.v} figure hurry from the scene. The killer is ${a.v}.`, `The killer is ${a.v}. A witness saw the figure leave.`, `Whoever did it was ${a.v}, according to the only witness who was sober.`);
  }
  throw new Error('no text for clue type ' + c.type);
}

// ---- Inspector Mallory: opens every case with a line, and closes it with another
const MALLORY_OPEN = [
  'I’ve asked everyone to stay exactly where they are. They have all agreed, which is suspicious in itself.',
  'Somebody here is lying to me. Only one of them, for once.',
  'Every statement I’ve taken is true but one. That’s a better ratio than Scotland Yard.',
  'Nobody leaves until I know who did it. Nobody has offered to make tea, either.',
  'Everyone saw nothing, heard nothing, and has a very good reason to be glad about it.',
  'I was promised a quiet weekend.',
  'Write everything down. People lie; notebooks don’t.',
  'The evidence is honest. The suspects are honest too, all but one.',
  'One of them will say something that cannot be true. Listen for it.',
  'Somebody in this case is very calm. Too calm.',
  'I’ve seen tidier crime scenes, and I’ve seen tidier suspects.',
  'Mind the evidence. And mind the suspects even more.',
];
const MALLORY_CLOSE = [
  'Case closed. Somebody fetch the tea.',
  'Another one for the files.',
  'I’ll have the paperwork done by breakfast. Probably.',
  'That’s the trouble with lying: you have to remember everything.',
  'The truth will out. Usually with a little help.',
  'Lovely work. I shall take all the credit, naturally.',
  'And they say the countryside is restful.',
  'Somebody call a cab. Somebody else call a lawyer.',
];

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

// Which suspects does a clue talk about?
function clueSuspects(c) {
  const a = c.args, out = [];
  for (const k of ['s', 'a', 'b']) if (a[k] !== undefined) out.push(a[k]);
  return out;
}

// The case's story: who died, on what occasion, and how they were found. {v} is the victim's short name.
function caseStory(world, story) {
  const [vi, oi, fi, mi] = story;
  const v = world.victims[vi], put = (s) => s.replace(/\{v\}/g, v.short);
  const capFirst = (s) => s[0].toUpperCase() + s.slice(1);
  const m = mi || 0;
  return { victim: v, occasion: capFirst(put(world.occasions[oi])), found: capFirst(put(world.found[fi])),
    mallory: MALLORY_OPEN[m % MALLORY_OPEN.length], close: MALLORY_CLOSE[m % MALLORY_CLOSE.length] };
}
function pickStory(rng, world) {
  return [rng.int(world.victims.length), rng.int(world.occasions.length), rng.int(world.found.length), rng.int(MALLORY_OPEN.length * MALLORY_CLOSE.length)];
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

// How many whole worlds (weapons, rooms and killer) survive?
function countSurvivingWorlds(ctx, set) {
  let count = 0;
  for (let i = 0; i < set.size; i++) count += popcount(set.M[i]);
  return count;
}

// ---- 35-human.js
// A "human" solver: candidate lists for every suspect's weapon and room, plus the killer, the
// murder weapon and the murder room. Each clue becomes small local constraints; each deduction
// is a candidate being crossed out. Where plain elimination stalls, it tries one "what if?" at a
// time (depth 1), or a what-if inside a what-if (depth 2). That depth is how hard the case feels.
//
// Variables: 0..n-1 weapon of suspect s | n..2n-1 room of suspect s | 2n killer | 2n+1 murder weapon | 2n+2 murder room

// The constraints a clue puts on the variables: a list of { vars, pred }.
function clueCons(ctx, type, a) {
  const n = ctx.n, { adj, floor, pos, types, traits } = ctx;
  const PW = (s) => s, PR = (s) => n + s, K = 2 * n, MW = 2 * n + 1, MR = 2 * n + 2;
  const out = [];
  const add = (vars, pred) => out.push({ vars, pred });
  const each = (f) => { for (let s = 0; s < n; s++) f(s); };
  switch (type) {
    case 'has': add([PW(a.s)], (x) => x === a.w); break;
    case 'notHas': add([PW(a.s)], (x) => x !== a.w); break;
    case 'in': add([PR(a.s)], (x) => x === a.r); break;
    case 'notIn': add([PR(a.s)], (x) => x !== a.r); break;
    case 'eitherHas': add([PW(a.a), PW(a.b)], (x, y) => x === a.w || y === a.w); break;
    case 'eitherIn': add([PR(a.a), PR(a.b)], (x, y) => x === a.r || y === a.r); break;
    case 'holdsType': add([PW(a.s)], (x) => types[x] === a.t); break;
    case 'notHoldsType': add([PW(a.s)], (x) => types[x] !== a.t); break;
    case 'sameType': add([PW(a.a), PW(a.b)], (x, y) => types[x] === types[y]); break;
    case 'diffType': add([PW(a.a), PW(a.b)], (x, y) => types[x] !== types[y]); break;
    case 'adjacent': add([PR(a.a), PR(a.b)], (x, y) => adj[x][y]); break;
    case 'notAdjacent': add([PR(a.a), PR(a.b)], (x, y) => !adj[x][y]); break;
    case 'sameFloor': add([PR(a.a), PR(a.b)], (x, y) => floor[x] === floor[y]); break;
    case 'diffFloor': add([PR(a.a), PR(a.b)], (x, y) => floor[x] !== floor[y]); break;
    case 'ahead': add([PR(a.a), PR(a.b)], (x, y) => pos[x] < pos[y]); break;
    case 'weaponIn': each((s) => add([PW(s), PR(s)], (x, y) => (x === a.w) === (y === a.r))); break;
    case 'weaponNotIn': each((s) => add([PW(s), PR(s)], (x, y) => !(x === a.w && y === a.r))); break;
    case 'weaponNear': each((s) => add([PW(s), PR(s)], (x, y) => x !== a.w || adj[y][a.r])); break;
    case 'typeInRoom': each((s) => add([PW(s), PR(s)], (x, y) => y !== a.r || types[x] === a.t)); break;
    case 'notTypeInRoom': each((s) => add([PW(s), PR(s)], (x, y) => y !== a.r || types[x] !== a.t)); break;
    case 'traitWeapon': each((s) => { if (traits[s][a.k] !== a.v) add([PW(s)], (x) => x !== a.w); }); break;
    case 'traitRoom': each((s) => { if (traits[s][a.k] !== a.v) add([PR(s)], (x) => x !== a.r); }); break;
    case 'murderType': add([MW], (x) => types[x] === a.t); break;
    case 'murderNotType': add([MW], (x) => types[x] !== a.t); break;
    case 'murderNotSuspect': add([K], (x) => x !== a.s); break;
    case 'murderNextTo': add([K], (x) => x !== a.s); add([MR, PR(a.s)], (x, y) => adj[x][y]); break;
    case 'murderFarFrom': add([K], (x) => x !== a.s); add([MR, PR(a.s)], (x, y) => !adj[x][y]); break;
    case 'murderSameFloor': add([K], (x) => x !== a.s); add([MR, PR(a.s)], (x, y) => floor[x] === floor[y]); break;
    case 'murderAheadOf': add([MR, PR(a.s)], (x, y) => pos[x] < pos[y]); break;
    case 'murderBehind': add([MR, PR(a.s)], (x, y) => pos[x] > pos[y]); break;
    case 'murderNotWeapon': add([MW], (x) => x !== a.w); break;
    case 'murderNotRoom': add([MR], (x) => x !== a.r); break;
    case 'murderAdjRoom': add([MR], (x) => adj[x][a.r]); break;
    case 'murderNotAdjRoom': add([MR], (x) => x !== a.r && !adj[x][a.r]); break;
    case 'murderFloor': add([MR], (x) => floor[x] === a.f); break;
    case 'murderNotFloor': add([MR], (x) => floor[x] !== a.f); break;
    case 'murderTrait': add([K], (x) => traits[x][a.k] === a.v); break;
    default: throw new Error('human solver: unknown clue ' + type);
  }
  return out;
}

function buildCSP(ctx, clues) {
  const n = ctx.n;
  const PW = (s) => s, PR = (s) => n + s, K = 2 * n, MW = 2 * n + 1, MR = 2 * n + 2;
  const cons = [];
  const each = (f) => { for (let s = 0; s < n; s++) f(s); };
  clues.forEach((c, ci) => {
    const list = clueCons(ctx, c.type, c.args);
    if (c.speaker === null || c.speaker === undefined) { list.forEach((x) => cons.push({ clue: ci, vars: x.vars, pred: x.pred })); return; }
    // testimony: true unless the speaker is the killer, in which case it is false
    if (list.length !== 1) throw new Error('testimony must be one constraint: ' + c.type);
    const { vars, pred } = list[0], sp = c.speaker;
    if (vars.includes(K)) cons.push({ clue: ci, vars: [K], pred: (k) => (k === sp) !== pred(k) });
    else cons.push({ clue: ci, vars: [K, ...vars], pred: (k, x, y) => (k === sp) !== pred(x, y) });
  });
  // the killer is whoever holds the murder weapon and stands in the murder room
  each((s) => {
    cons.push({ clue: -1, vars: [K, PW(s), MW], pred: (k, w, mw) => (k === s) === (w === mw) });
    cons.push({ clue: -1, vars: [K, PR(s), MR], pred: (k, r, mr) => (k === s) === (r === mr) });
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

// solved: every suspect's weapon and room, and the killer, are settled (the whole notebook, not just the answer)
const answered = (csp, dom) => dom.every((d) => popcount(d) === 1);

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
  // how many could still be the killer (the liar) once plain elimination stalls
  const open = popcount(dom[csp.K]);
  if (answered(csp, dom)) return { depth: 0, probes: 0, open, dom };
  for (let d = 1; d <= (maxDepth || 2); d++) {
    const t = dom.slice(); stats.probes = 0;
    if (probe(csp, t, d, stats) && answered(csp, t)) return { depth: d, probes: stats.probes, open, dom: t };
  }
  return { depth: 99, probes: stats.probes, open };
}

// ---- 40-generate.js
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

// ---- 45-bank.js
// Cases can be saved as small specs (what was picked, the hidden truth, the story, which clues in which wording)
// and rebuilt instantly, so curated cases ship with the page and load with no searching.
// A clue is [type, args, variant, speaker]: a speaker means testimony (true unless the speaker is the killer).
function exportPuzzle(p) {
  const { ctx } = p;
  return {
    s: p.seed, t: p.tier, w: p.worldId, ti: p.title, r: p.rating, h: [p.human.depth, p.human.probes], y: p.story,
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
    const say = speaker !== null && speaker !== undefined;
    const v = clueVariants(c, ctx, say ? speaker : null)[vi];
    if (!v) throw new Error('bank clue variant not found: ' + type + ' ' + vi);
    const base = say ? testimony(c, speaker, ctx.n) : c;
    return Object.assign({}, base, { voice: v[0], speaker: say ? speaker : null, text: v[1], vi });
  }));
  const truth = { pw: spec.pw, pr: spec.pr, m: spec.m };
  const tier = TIERS[spec.t];
  return {
    seed: spec.s, tier: spec.t, tierName: tier.name, worldId: spec.w, n: ctx.n, ctx, clues,
    solution: { killer: truth.m, weapon: truth.pw[truth.m], room: truth.pr[truth.m] },
    truth, rating: spec.r, human: { depth: spec.h[0], probes: spec.h[1] }, title: spec.ti, strict: true,
    story: spec.y || [0, 0, 0],
  };
}

// ---- 46-tutorial.js
// The hand-made first case, in bank format. Three guests, a statement each, three pieces of evidence.
// Two guests both claim the Study, so one of them is lying, and the liar is the killer. The evidence then
// says who, where and with what. test-engine.js checks it has one answer and no spare piece of evidence.
//   suspects: Dr. Pell, Major Crisp, Miss Lark   weapons: Brass Candlestick, Decanter of Port, Service Revolver
//   rooms: Study (upstairs), Library (ground floor), Wine Cellar (cellar)
//   truth: Pell has the Revolver in the Cellar, Crisp has the Port in the Library (the killer), Lark has the Candlestick in the Study
const TUTORIAL = {
  s: 'tutorial', t: 'constable', w: 'manor', ti: 'A Lesson at Blackwood', r: 1, h: [0, 0], y: [0, 3, 0, 6],
  S: [1, 2, 7], W: [2, 4, 6], R: [1, 4, 6],
  pw: [2, 1, 0], pr: [2, 1, 0], m: 1,
  c: [
    ['notHas', { s: 0, w: 1 }, 0, 0],
    ['in', { s: 1, r: 0 }, 0, 1],
    ['in', { s: 2, r: 0 }, 1, 2],
    ['murderTrait', { k: 'height', v: 'tall' }, 0, null],
    ['murderFloor', { f: 1 }, 0, null],
    ['holdsType', { s: 2, t: 'blunt' }, 0, null],
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
    owners: ['Blackwood Manor', 'the Blackwoods', 'the Old House'],
  },
  train: {
    tails: ['on the Meridian', 'Aboard the Express', 'in the Mountains', 'at the Border', 'Through the Pass', 'Before Vienna', 'East of Zurich',
      'Beyond the Viaduct', 'in the Tunnel', 'at Full Speed', 'Past the Frontier', 'at the Eleventh Hour', 'Between Stations', 'Above the Valley'],
    owners: ['the Meridian', 'the Express', 'the High Pass'],
  },
  liner: {
    tails: ['Aboard the Aurelia', 'at Sea', 'in Mid-Atlantic', 'off Nantucket', 'in the Fog', 'on the High Seas', 'Before New York',
      'After Southampton', 'in the Gulf Stream', 'Under the Stars', 'on the Third Night', 'in Calm Waters', 'at Eight Bells', 'Out of Sight of Land'],
    owners: ['the Aurelia', 'the Atlantic', 'the Crossing'],
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
  lantern signal lamp ice frost frozen thaw cold chill snow night midnight hat crest trophy curtain drapes
  harpoon whale whaling fish sextant oak gin fizz almond almonds flare deck decks bridge lido pool saloon engine hold cargo purser
  nurse cabaret broadway tennis wimbledon band hypnotist novelist`.split(/\s+/).filter(Boolean);
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
  module.exports = { TUTORIAL, TRAITS, TRAIT_KEYS, TESTIMONY_TYPES, testimony, statementTrue, caseStory, clueHolds, countSurvivingWorlds, generatePuzzle, exportPuzzle, importPuzzle, checkAccusation, solveCount, marginals, humanDifficulty, buildCSP, propagate, TIERS, WORLDS, WEAPON_TYPES, plainText, permutations, makeRng, enumerateClues, buildCtx, clueVariants, titlePool, titleClash, titleBanned, varyWording };
}
