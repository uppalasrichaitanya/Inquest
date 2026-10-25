// Turns a clue into words. Tokens {s:i} {w:i} {r:i} are swapped for names by the renderer,
// so the UI can highlight and cross-reference them.
// Evidence ('note') is always true and has one wording. Testimony ('say') is spoken by a suspect, in their own
// voice ("I was in the Library"), and has two wordings. Banked cases store the variant index, so keep the number
// of variants per type as it is when rewording (test-variants.js checks it).
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
  const say = sp !== undefined && sp !== null;
  if (say) {
    const me = (i) => i === sp;
    const subj = (i) => (me(i) ? 'I' : S(i)), obj = (i) => (me(i) ? 'me' : S(i));
    const poss = (i) => (me(i) ? 'my' : `${S(i)}'s`), possN = (i) => (me(i) ? 'mine' : `${S(i)}'s`);
    const both = (x, y) => (me(x) ? `${S(y)} and I` : me(y) ? `${S(x)} and I` : `${S(x)} and ${S(y)}`);
    const either = (x, y, f) => (me(x) ? `${S(y)} or ${f}` : me(y) ? `${S(x)} or ${f}` : `${S(x)} or ${S(y)}`);
    const self = a.s !== undefined && me(a.s);
    const two = (v0, v1) => [['say', v0], ['say', v1]];
    switch (c.type) {
      case 'has': return self ? two(`I had the ${W(a.w)}. I won't pretend otherwise.`, `The ${W(a.w)} was mine to hold all evening.`)
        : two(`${S(a.s)} had the ${W(a.w)}. I saw it plainly.`, `I saw ${S(a.s)} with the ${W(a.w)} in hand.`);
      case 'notHas': return self ? two(`I never touched the ${W(a.w)}.`, `Whoever had the ${W(a.w)}, it wasn't me.`)
        : two(`${S(a.s)} never touched the ${W(a.w)}.`, `Whoever had the ${W(a.w)}, it wasn't ${S(a.s)}.`);
      case 'in': return self ? two(`I was in the ${R(a.r)} the whole time.`, `I never left the ${R(a.r)}.`)
        : two(`${S(a.s)} was in the ${R(a.r)}. I'd know that voice anywhere.`, `I saw ${S(a.s)} in the ${R(a.r)}.`);
      case 'notIn': return self ? two(`I never set foot in the ${R(a.r)}.`, `I wasn't in the ${R(a.r)}, whatever you've heard.`)
        : two(`${S(a.s)} was not in the ${R(a.r)}.`, `${S(a.s)} never set foot in the ${R(a.r)}.`);
      case 'eitherHas': return two(`Either ${either(a.a, a.b, 'I')} had the ${W(a.w)}.`, `The ${W(a.w)} was with ${either(a.a, a.b, 'me')}. One of the two.`);
      case 'eitherIn': return two(`Either ${either(a.a, a.b, 'I')} was in the ${R(a.r)}.`, `Someone was in the ${R(a.r)}: ${either(a.a, a.b, 'me')}. ${me(a.a) || me(a.b) ? 'I won’t say which.' : 'It was too dark to see which.'}`);
      case 'holdsType': return self ? two(`I'll admit I had ${T(a.t).held}.`, `Yes, I had ${T(a.t).held} on me.`)
        : two(`${S(a.s)} was carrying ${T(a.t).held}.`, `${S(a.s)} had ${T(a.t).held}. I noticed it straight away.`);
      case 'notHoldsType': return self ? two(`I didn't have ${T(a.t).any}. Search me.`, `I wasn't carrying ${T(a.t).any}.`)
        : two(`${S(a.s)} wasn't carrying ${T(a.t).any}.`, `${S(a.s)} didn't have ${T(a.t).any}. I checked.`);
      case 'sameType': return two(`${both(a.a, a.b)} carried the same kind of weapon.`, `${cap(poss(a.a))} weapon was the same kind as ${possN(a.b)}.`);
      case 'diffType': return two(`${both(a.a, a.b)} carried different kinds of weapon.`, `${cap(poss(a.a))} weapon was a different kind from ${possN(a.b)}.`);
      case 'adjacent': return line
        ? two(`${both(a.a, a.b)} were in carriages next to each other, coupled together.`, `${cap(poss(a.a))} carriage was coupled to ${possN(a.b)}.`)
        : two(`${both(a.a, a.b)} were in rooms next to each other, a door or a stair apart.`, `${cap(poss(a.a))} room was next to ${possN(a.b)}, a door or a stair away.`);
      case 'notAdjacent': return line
        ? two(`${both(a.a, a.b)} weren't in carriages next to each other.`, `${cap(poss(a.a))} carriage and ${possN(a.b)} were not coupled together.`)
        : two(`${both(a.a, a.b)} weren't in rooms next to each other.`, `No single door or stair joined ${poss(a.a)} room to ${possN(a.b)}.`);
      case 'sameFloor': return two(`${both(a.a, a.b)} were on the same floor.`, `${cap(poss(a.a))} room and ${possN(a.b)} were on one floor.`);
      case 'diffFloor': return two(`${both(a.a, a.b)} were on different floors.`, `${subj(a.a)} was on one floor and ${subj(a.b)} on another.`);
      case 'ahead': return two(`${cap(poss(a.a))} carriage was nearer the engine than ${possN(a.b)}.`, `Walking back from the engine, you'd pass ${obj(a.a)} before ${obj(a.b)}.`);
      case 'murderNotSuspect': return two(`It wasn't ${S(a.s)}. I'd stake my life on it.`, `${S(a.s)} didn't do it. I'm certain.`);
      case 'murderType': return two(`The killer used ${T(a.t).held}. I saw the wound.`, `It was done with ${T(a.t).label}. Anyone could see that.`);
      case 'murderNotType': return two(`The killer didn't use ${T(a.t).any}.`, `Whatever the weapon was, it wasn't ${T(a.t).label}.`);
      case 'murderNotWeapon': return two(`The ${W(a.w)} wasn't the murder weapon.`, `Forget the ${W(a.w)}. It's clean.`);
      case 'murderNotRoom': return two(`The body wasn't in the ${R(a.r)}.`, `Nobody died in the ${R(a.r)}. I'd have known.`);
      case 'murderFloor': return two(`The body was found ${floorWord(a.f)}.`, `It happened ${floorWord(a.f)}. I heard it.`);
      case 'murderNotFloor': return two(`The body wasn't found ${floorWord(a.f)}.`, `Whatever happened, it didn't happen ${floorWord(a.f)}.`);
      case 'murderAdjRoom': return line
        ? two(`The body was in a carriage coupled to the ${R(a.r)}, not in it.`, `It happened right next to the ${R(a.r)}. Not in it, next to it.`)
        : two(`The body was a door or a stair away from the ${R(a.r)}, not in it.`, `It happened next to the ${R(a.r)}, a door or a stair away. Not in it.`);
      case 'murderNotAdjRoom': return line
        ? two(`The body wasn't in the ${R(a.r)}, nor in a carriage coupled to it.`, `It didn't happen in the ${R(a.r)}, or anywhere next to it.`)
        : two(`The body wasn't in the ${R(a.r)}, nor anywhere a door or a stair away.`, `It didn't happen in the ${R(a.r)}, or anywhere next to it.`);
      case 'murderTrait': return two(`The killer was ${traitWord(a.k, a.v)}. I caught a glimpse.`, `Whoever did it was ${traitWord(a.k, a.v)}. I'd swear to that.`);
    }
    throw new Error('no testimony for clue type ' + c.type);
  }
  const note = (t) => [['note', t]];
  switch (c.type) {
    case 'has': return note(`${S(a.s)} had the ${W(a.w)}. The prints leave no doubt.`);
    case 'notHas': return note(`Whoever had the ${W(a.w)}, it was not ${S(a.s)}. The prints don't match.`);
    case 'in': return note(`Muddy footprints put ${S(a.s)} in the ${R(a.r)}.`);
    case 'notIn': return note(`${S(a.s)} was not in the ${R(a.r)}: not one footprint.`);
    case 'eitherHas': return note(`Only ${S(a.a)} or ${S(a.b)} could have had the ${W(a.w)}.`);
    case 'eitherIn': return note(`Whoever was in the ${R(a.r)}, it was ${S(a.a)} or ${S(a.b)}.`);
    case 'holdsType': return note(`${S(a.s)}'s weapon was ${T(a.t).held}.`);
    case 'notHoldsType': return note(`Whatever ${S(a.s)} carried, it wasn't ${T(a.t).label}.`);
    case 'sameType': return note(`${S(a.a)}'s weapon was the same kind as ${S(a.b)}'s.`);
    case 'diffType': return note(`${S(a.a)}'s weapon and ${S(a.b)}'s were of different kinds.`);
    case 'adjacent': return note(line ? `${S(a.a)}'s carriage was coupled to ${S(a.b)}'s.` : `${S(a.a)}'s room was next to ${S(a.b)}'s, joined by ${join}.`);
    case 'notAdjacent': return note(line ? `${S(a.a)}'s carriage and ${S(a.b)}'s were not coupled together.` : `No single door or stair joined ${S(a.a)}'s room to ${S(a.b)}'s.`);
    case 'sameFloor': return note(`${S(a.a)}'s room and ${S(a.b)}'s were on one floor.`);
    case 'diffFloor': return note(`${S(a.a)} and ${S(a.b)} were on different floors.`);
    case 'ahead': return note(`${S(a.a)}'s carriage was nearer the engine than ${S(a.b)}'s.`);
    case 'weaponIn': return note(`Whoever was in the ${R(a.r)} was holding the ${W(a.w)}.`);
    case 'weaponNotIn': return note(`Whoever was in the ${R(a.r)}, they weren't holding the ${W(a.w)}.`);
    case 'weaponNear': return note(`The ${W(a.w)} was in a ${unit} next to the ${R(a.r)} (${away}), not in the ${R(a.r)} itself.`);
    case 'typeInRoom': return note(`The person in the ${R(a.r)} was carrying ${T(a.t).held}.`);
    case 'notTypeInRoom': return note(`The person in the ${R(a.r)} wasn't carrying ${T(a.t).label}.`);
    case 'traitWeapon': return note(a.k === 'hair' ? `A ${HAIR_WORD[a.v]} hair was caught on the ${W(a.w)}. Whoever had it is ${traitWord(a.k, a.v)}.`
      : a.k === 'hand' ? `The ${W(a.w)} was held in the ${a.v} hand. Whoever had it is ${traitWord(a.k, a.v)}.`
        : `A witness saw a ${a.v} figure with the ${W(a.w)}. Whoever had it is ${a.v}.`);
    case 'traitRoom': return note(a.k === 'hair' ? `A ${HAIR_WORD[a.v]} hair was found in the ${R(a.r)}. Whoever was there is ${traitWord(a.k, a.v)}.`
      : a.k === 'hand' ? `The door of the ${R(a.r)} was opened with the ${a.v} hand. Whoever was there is ${traitWord(a.k, a.v)}.`
        : `The footprints in the ${R(a.r)} are ${a.v === 'tall' ? 'long' : 'small'}. Whoever was there is ${a.v}.`);
    // ---- the body
    case 'murderType': return note(`The coroner found ${T(a.t).cause}. The killer used ${T(a.t).held}.`);
    case 'murderNotType': return note(`The coroner rules out ${T(a.t).label}.`);
    case 'murderNotSuspect': return note(`${S(a.s)} has an alibi that holds. Not the killer.`);
    case 'murderNextTo': return note(`The killer was in a ${unit} next to ${S(a.s)}'s, ${away}.`);
    case 'murderFarFrom': return note(`It wasn't ${S(a.s)}, nor anyone ${line ? `in a carriage coupled to ${S(a.s)}'s` : `a door or a stair from ${S(a.s)}'s room`}.`);
    case 'murderSameFloor': return note(`The killer was on the same floor as ${S(a.s)}, but it wasn't ${S(a.s)}.`);
    case 'murderAheadOf': return note(`The killer's carriage was nearer the engine than ${S(a.s)}'s.`);
    case 'murderBehind': return note(`The killer's carriage was further from the engine than ${S(a.s)}'s.`);
    case 'murderNotWeapon': return note(`The ${W(a.w)} is clean. It is not the murder weapon.`);
    case 'murderNotRoom': return note(`The body was not found in the ${R(a.r)}.`);
    case 'murderAdjRoom': return note(`The body was found ${line ? 'in a carriage coupled to' : 'a door or a stair away from'} the ${R(a.r)}, not in the ${R(a.r)} itself.`);
    case 'murderNotAdjRoom': return note(`The body was not in the ${R(a.r)}, nor ${line ? 'in a carriage coupled to it' : 'anywhere a door or a stair away'}.`);
    case 'murderFloor': return note(`The body was found ${floorWord(a.f)}.`);
    case 'murderNotFloor': return note(`The body was not found ${floorWord(a.f)}.`);
    case 'murderTrait': return note(a.k === 'hair' ? `A ${HAIR_WORD[a.v]} hair was found on the body. The killer is ${traitWord(a.k, a.v)}.`
      : a.k === 'hand' ? `The coroner says the killer is ${traitWord(a.k, a.v)}.`
        : `A witness saw a ${a.v} figure hurry from the scene. The killer is ${a.v}.`);
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

// Which suspects does a clue talk about?
function clueSuspects(c) {
  const a = c.args, out = [];
  for (const k of ['s', 'a', 'b']) if (a[k] !== undefined) out.push(a[k]);
  return out;
}

// The case's story: who died, on what occasion, and how they were found. {v} is the victim's short name.
function caseStory(world, story) {
  const [vi, oi, fi] = story;
  const v = world.victims[vi], put = (s) => s.replace(/\{v\}/g, v.short);
  const capFirst = (s) => s[0].toUpperCase() + s.slice(1);
  return { victim: v, occasion: capFirst(put(world.occasions[oi])), found: capFirst(put(world.found[fi])) };
}
function pickStory(rng, world) {
  return [rng.int(world.victims.length), rng.int(world.occasions.length), rng.int(world.found.length)];
}

// Plain-text rendering (tests, share text). The UI renders tokens itself.
function plainText(str, ctx) {
  return str.replace(/\{([swr]):(\d+)\}/g, (_, k, i) => {
    i = +i;
    return k === 's' ? ctx.suspects[i].short : k === 'w' ? ctx.weapons[i].name : ctx.rooms[i].name;
  });
}
