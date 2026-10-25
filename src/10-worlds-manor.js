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
  eyes: { label: 'Eyes', values: { blue: 'blue-eyed', brown: 'brown-eyed', green: 'green-eyed', grey: 'grey-eyed' } },
};
const TRAIT_KEYS = ['height', 'hand', 'hair', 'eyes'];
// what the weapon cards print, and the evidence can point at: how heavy, and what it's made of
const WEAPON_ATTRS = {
  weight: { label: 'Weight', values: { heavy: 'heavy', light: 'light' } },
  material: { label: 'Material', values: { metal: 'metal', glass: 'glass', wood: 'wood', fabric: 'fabric', china: 'china' } },
};
const WEAPON_ATTR_KEYS = ['weight', 'material'];
// rooms are lit or dark (the storm, the tunnel, the fog): the room cards and the map show which
const LIGHT_WORD = { lit: 'lamps lit', dark: 'in darkness' };

// Motives, for the cases that ask why as well as who (Sundays). Each suspect had a different one.
// `did` finishes the verdict's sentence: "{killer} {did}." with {v} the victim.
const MOTIVES = [
  { id: 'money', name: 'Money', did: 'did it for the money: {v} was worth far more dead than alive' },
  { id: 'revenge', name: 'Revenge', did: 'did it for revenge, for something {v} did years ago and never once regretted' },
  { id: 'love', name: 'Love', did: 'did it for love, which is the worst reason of all' },
  { id: 'jealousy', name: 'Jealousy', did: 'did it out of jealousy: {v} had everything, and flaunted it' },
  { id: 'blackmail', name: 'Blackmail', did: 'did it to stop the blackmail: {v} had the letters, and had started to read them aloud' },
  { id: 'ambition', name: 'Ambition', did: 'did it out of ambition: {v} was the only thing standing in the way' },
  { id: 'inheritance', name: 'Inheritance', did: 'did it for the inheritance, and had already measured the curtains' },
  { id: 'fear', name: 'Fear', did: 'did it out of fear: {v} knew a secret that would have ruined everything' },
];

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
    { id: 'bedroom', name: 'Master Bedroom', short: 'Bed&shy;room', pattern: 'carpet', light: 'dark', rect: { x: 0, y: 0, w: 5, h: 1 } },
    { id: 'study', name: 'Study', short: 'Study', pattern: 'rug', light: 'lit', rect: { x: 5, y: 0, w: 4, h: 1 } },
    { id: 'kitchen', name: 'Kitchen', short: 'Kitchen', pattern: 'checker', light: 'lit', rect: { x: 0, y: 1, w: 2, h: 1 } },
    { id: 'dining', name: 'Dining Hall', short: 'Dining Hall', pattern: 'parquet', light: 'lit', rect: { x: 2, y: 1, w: 3, h: 1 } },
    { id: 'library', name: 'Library', short: 'Library', pattern: 'planks', light: 'dark', rect: { x: 5, y: 1, w: 2, h: 1 } },
    { id: 'conservatory', name: 'Conservatory', short: 'Conser&shy;vatory', pattern: 'leaves', light: 'dark', rect: { x: 7, y: 1, w: 2, h: 1 } },
    { id: 'cellar', name: 'Wine Cellar', short: 'Wine Cellar', pattern: 'stone', light: 'dark', rect: { x: 0, y: 2, w: 2, h: 1 } },
  ],
  weapons: [
    { id: 'dagger', name: 'Moroccan Dagger', short: 'Dagger', type: 'blade', weight: 'light', material: 'metal', note: 'taken from the trophy wall' },
    { id: 'opener', name: 'Silver Letter Opener', short: 'Letter opener', type: 'blade', weight: 'light', material: 'metal', note: 'monogrammed A.B.' },
    { id: 'candlestick', name: 'Brass Candlestick', short: 'Candle&shy;stick', type: 'blunt', weight: 'heavy', material: 'metal', note: 'one of a pair, now a single' },
    { id: 'poker', name: 'Fire Poker', short: 'Poker', type: 'blunt', weight: 'heavy', material: 'metal', note: 'still warm' },
    { id: 'port', name: 'Decanter of Port', short: 'Port', type: 'poison', weight: 'heavy', material: 'glass', note: 'the stopper is missing' },
    { id: 'cord', name: 'Curtain Cord', short: 'Curtain cord', type: 'cord', weight: 'light', material: 'fabric', note: 'cut cleanly from the drapes' },
    { id: 'revolver', name: 'Service Revolver', short: 'Revol&shy;ver', type: 'firearm', weight: 'heavy', material: 'metal', note: 'one chamber empty' },
  ],
  suspects: [
    { id: 'vane', name: 'Lady Ottoline Vane', short: 'Lady Vane', role: 'the widow’s sister, in mourning since 1911 for reasons nobody can recall', hue: 340,
      traits: { height: 'tall', hand: 'right', hair: 'dark', eyes: 'grey' }, look: { skin: '#EBC9AE', hair: 'bun', acc: ['veil', 'pearls'] },
      motive: 'had been promised the house for twenty years, and had just learned that {v} meant to turn it into a hotel' },
    { id: 'pell', name: 'Dr. Rufus Pell', short: 'Dr. Pell', role: 'family physician, whose bedside manner frightens the healthy', hue: 200,
      traits: { height: 'short', hand: 'right', hair: 'grey', eyes: 'brown' }, look: { skin: '#E3B48F', hair: 'bald', acc: ['glasses', 'moustache'] },
      motive: 'had signed a death certificate years ago that {v} knew to be wildly optimistic' },
    { id: 'crisp', name: 'Major Barnaby Crisp', short: 'Major Crisp', role: 'retired officer, in debt to half the county and at war with the other half', hue: 28,
      traits: { height: 'tall', hand: 'left', hair: 'grey', eyes: 'blue' }, look: { skin: '#D99F7E', hair: 'short', acc: ['moustache', 'medal'] },
      motive: 'owed {v} a small fortune, and {v} had started asking for it back, loudly, at dinner' },
    { id: 'fenn', name: 'Miss Odalys Fenn', short: 'Miss Fenn', role: 'private secretary; knows every secret and charges for most of them', hue: 160,
      traits: { height: 'short', hand: 'left', hair: 'dark', eyes: 'brown' }, look: { skin: '#B98563', hair: 'bob', acc: ['glasses'] },
      motive: 'had been forging {v}’s signature for a year, and had recently got rather good at it' },
    { id: 'thorne', name: 'Reverend Silas Thorne', short: 'Rev. Thorne', role: 'parish vicar, with a sermon for every occasion and a bookmaker for the rest', hue: 265,
      traits: { height: 'tall', hand: 'right', hair: 'fair', eyes: 'blue' }, look: { skin: '#F0D2BC', hair: 'slick', acc: ['collar'] },
      motive: 'had spent the church roof fund at Epsom, and {v} held the betting slips' },
    { id: 'marrow', name: 'Mrs. Edith Marrow', short: 'Mrs. Marrow', role: 'housekeeper of thirty years; has seen everything and dusted most of it', hue: 95,
      traits: { height: 'short', hand: 'right', hair: 'grey', eyes: 'green' }, look: { skin: '#E8BFA0', hair: 'curly', acc: ['brooch'] },
      motive: 'had been dismissed by {v} that very morning, after thirty years, over a soufflé' },
    { id: 'dray', name: 'Cassius Dray', short: 'Mr. Dray', role: 'art dealer with a suspiciously fresh Vermeer', hue: 48,
      traits: { height: 'tall', hand: 'right', hair: 'dark', eyes: 'green' }, look: { skin: '#C99272', hair: 'slick', acc: ['monocle', 'bowtie'] },
      motive: 'had sold {v} a Vermeer that was still wet, and {v} had noticed the smell' },
    { id: 'lark', name: 'Imogen Lark', short: 'Miss Lark', role: 'niece and aviator; arrived by motorcycle and left a dent in the lawn', hue: 5,
      traits: { height: 'short', hand: 'left', hair: 'red', eyes: 'blue' }, look: { skin: '#F2CDB3', hair: 'long', acc: ['goggles'] },
      motive: 'needed {v}’s money to fly the Atlantic, and had been told to take the boat like everyone else' },
  ],
};
