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
  ],
  found: [
    '{v} was found at one in the morning, and the house has been holding its breath ever since.',
    'At the stroke of midnight there was a crash, and then a scream. {v} was dead.',
    'By breakfast {v} was dead, and the gate was a river of mud.',
    'The butler found {v} at dawn, and dropped the tea tray.',
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
    { id: 'vane', name: 'Lady Ottoline Vane', short: 'Lady Vane', role: 'the widow’s sister, always in black', hue: 340,
      traits: { height: 'tall', hand: 'right', hair: 'dark' }, look: { skin: '#EBC9AE', hair: 'bun', acc: ['veil', 'pearls'] },
      motive: 'had been promised the house for twenty years, and had just learned that {v} meant to sell it' },
    { id: 'pell', name: 'Dr. Rufus Pell', short: 'Dr. Pell', role: 'family physician, never without his bag', hue: 200,
      traits: { height: 'short', hand: 'right', hair: 'grey' }, look: { skin: '#E3B48F', hair: 'bald', acc: ['glasses', 'moustache'] },
      motive: 'had signed a death certificate years ago that {v} knew to be false' },
    { id: 'crisp', name: 'Major Barnaby Crisp', short: 'Major Crisp', role: 'retired officer, in debt to half the county', hue: 28,
      traits: { height: 'tall', hand: 'left', hair: 'grey' }, look: { skin: '#D99F7E', hair: 'short', acc: ['moustache', 'medal'] },
      motive: 'owed {v} a small fortune, and {v} had started asking for it back' },
    { id: 'fenn', name: 'Miss Odalys Fenn', short: 'Miss Fenn', role: 'private secretary; knows every secret', hue: 160,
      traits: { height: 'short', hand: 'left', hair: 'dark' }, look: { skin: '#B98563', hair: 'bob', acc: ['glasses'] },
      motive: 'had been quietly forging {v}’s signature for a year, and {v} had begun to notice' },
    { id: 'thorne', name: 'Reverend Silas Thorne', short: 'Rev. Thorne', role: 'parish vicar, sermon notes in his pocket', hue: 265,
      traits: { height: 'tall', hand: 'right', hair: 'fair' }, look: { skin: '#F0D2BC', hair: 'slick', acc: ['collar'] },
      motive: 'had spent the church roof fund at the races, and {v} held the receipts' },
    { id: 'marrow', name: 'Mrs. Edith Marrow', short: 'Mrs. Marrow', role: 'housekeeper of thirty years', hue: 95,
      traits: { height: 'short', hand: 'right', hair: 'grey' }, look: { skin: '#E8BFA0', hair: 'curly', acc: ['brooch'] },
      motive: 'had been dismissed by {v} that very morning, after thirty years and without a reference' },
    { id: 'dray', name: 'Cassius Dray', short: 'Mr. Dray', role: 'art dealer with a suspiciously fresh Vermeer', hue: 48,
      traits: { height: 'tall', hand: 'right', hair: 'dark' }, look: { skin: '#C99272', hair: 'slick', acc: ['monocle', 'bowtie'] },
      motive: 'had sold {v} a Vermeer that was still drying, and {v} had sent it to be examined' },
    { id: 'lark', name: 'Imogen Lark', short: 'Miss Lark', role: 'niece, aviator, arrived by motorcycle', hue: 5,
      traits: { height: 'short', hand: 'left', hair: 'red' }, look: { skin: '#F2CDB3', hair: 'long', acc: ['goggles'] },
      motive: 'needed {v}’s money for a flight across the Atlantic, and had been told no' },
  ],
};
