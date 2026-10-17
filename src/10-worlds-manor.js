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
