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
    { id: 'mail', name: 'Mail Car', rect: { x: 0, y: 0, w: 1, h: 1 } },
    { id: 'dining', name: 'Dining Car', rect: { x: 1, y: 0, w: 1, h: 1 } },
    { id: 'smoking', name: 'Smoking Lounge', rect: { x: 2, y: 0, w: 1, h: 1 } },
    { id: 'sleeper', name: 'Sleeper Car', rect: { x: 3, y: 0, w: 1, h: 1 } },
    { id: 'bar', name: 'Bar Car', rect: { x: 4, y: 0, w: 1, h: 1 } },
    { id: 'observation', name: 'Observation Car', rect: { x: 5, y: 0, w: 1, h: 1 } },
    { id: 'luggage', name: 'Luggage Van', rect: { x: 6, y: 0, w: 1, h: 1 } },
  ],
  weapons: [
    { id: 'hatpin', name: 'Jewelled Hat Pin', type: 'blade', note: 'longer than it looks' },
    { id: 'icepick', name: 'Ice Pick', type: 'blade', note: 'from behind the bar' },
    { id: 'bottle', name: 'Champagne Bottle', type: 'blunt', note: 'unopened, and heavier for it' },
    { id: 'lantern', name: 'Brass Signal Lantern', type: 'blunt', note: 'dented on one side' },
    { id: 'cocoa', name: 'Cup of Laced Cocoa', type: 'poison', note: 'half finished' },
    { id: 'scarf', name: 'Silk Scarf', type: 'cord', note: 'embroidered with a crest' },
    { id: 'pistol', name: 'Pocket Pistol', type: 'firearm', note: 'pearl handled' },
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
