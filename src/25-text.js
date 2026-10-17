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
