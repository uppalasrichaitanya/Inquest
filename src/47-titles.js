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
