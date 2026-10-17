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
  switch (c.type) {
    case 'has': return [
      ['say', `I saw ${S(a.s)} with the ${W(a.w)} in hand. I'm certain of it.`],
      ['note', `The ${W(a.w)} was last seen in ${S(a.s)}'s hands.`]];
    case 'notHas': return [
      ['say', `${S(a.s)} never touched the ${W(a.w)}. I'd swear to it.`],
      ['note', `${S(a.s)}'s prints are nowhere on the ${W(a.w)}.`]];
    case 'in': return [
      ['say', `${S(a.s)} was in the ${R(a.r)} when the clock struck. I heard them through the door.`],
      ['note', `A witness puts ${S(a.s)} in the ${R(a.r)} at the time of the murder.`]];
    case 'notIn': return [
      ['say', `${S(a.s)} was nowhere near the ${R(a.r)} that night.`],
      ['note', `${S(a.s)} was not in the ${R(a.r)}.`]];
    case 'eitherHas': return [
      ['say', `Either ${S(a.a)} or ${S(a.b)} had the ${W(a.w)}. I couldn't tell you which.`],
      ['note', `The ${W(a.w)} was held by ${S(a.a)} or by ${S(a.b)}.`]];
    case 'eitherIn': return [
      ['say', `Someone was in the ${R(a.r)}: ${S(a.a)} or ${S(a.b)}. It was too dark to see which.`],
      ['note', `Whoever was in the ${R(a.r)}, it was ${S(a.a)} or ${S(a.b)}.`]];
    case 'holdsType': return [
      ['say', `${S(a.s)} was carrying ${T(a.t).held}. I noticed it straight away.`],
      ['note', `${S(a.s)} was carrying ${T(a.t).held}.`]];
    case 'notHoldsType': return [
      ['say', `${S(a.s)} wasn't carrying ${T(a.t).any}. I checked.`],
      ['note', `Whatever ${S(a.s)} was carrying, it wasn't ${T(a.t).label}.`]];
    case 'sameType': return [
      ['say', `${S(a.a)} and ${S(a.b)} were carrying the same kind of weapon. I thought that was odd.`],
      ['note', `${S(a.a)} and ${S(a.b)} carried the same kind of weapon.`]];
    case 'diffType': return [
      ['say', `${S(a.a)} and ${S(a.b)} weren't carrying the same kind of weapon. Not even close.`],
      ['note', `${S(a.a)} and ${S(a.b)} carried different kinds of weapon.`]];
    case 'adjacent': return [
      ['say', `${S(a.a)} and ${S(a.b)} were in ${unit}s right next to each other. I could hear them both.`],
      ['note', `${S(a.a)}'s ${unit} was right next to ${S(a.b)}'s.`]];
    case 'notAdjacent': return [
      ['say', `${S(a.a)} and ${S(a.b)} weren't in ${unit}s next to each other. Not even close.`],
      ['note', `${S(a.a)}'s ${unit} was not next to ${S(a.b)}'s.`]];
    case 'sameFloor': return [
      ['say', `${S(a.a)} and ${S(a.b)} were on the same floor. I heard the boards creak under both of them.`],
      ['note', `${S(a.a)} and ${S(a.b)} were on the same floor.`]];
    case 'diffFloor': return [
      ['say', `${S(a.a)} and ${S(a.b)} weren't on the same floor. I'm sure of that.`],
      ['note', `${S(a.a)} and ${S(a.b)} were on different floors.`]];
    case 'ahead': return [
      ['say', `${S(a.a)} was in a carriage closer to the engine than ${S(a.b)}.`],
      ['note', `${S(a.a)}'s carriage was nearer the engine than ${S(a.b)}'s.`]];
    case 'weaponIn': return [
      ['say', `The ${W(a.w)} was in the ${R(a.r)}. I saw it in someone's hand.`],
      ['note', `Whoever was in the ${R(a.r)} was holding the ${W(a.w)}.`]];
    case 'weaponNotIn': return [
      ['say', `The ${W(a.w)} was never in the ${R(a.r)}.`],
      ['note', `Whoever was in the ${R(a.r)}, they weren't holding the ${W(a.w)}.`]];
    case 'weaponNear': return [
      ['say', `I saw the ${W(a.w)} in a ${unit} next to the ${R(a.r)}.`],
      ['note', `The ${W(a.w)} was in a ${unit} next to the ${R(a.r)}, not in the ${R(a.r)} itself.`]];
    case 'typeInRoom': return [
      ['say', `Whoever was in the ${R(a.r)} had ${T(a.t).held}. I saw it myself.`],
      ['note', `The person in the ${R(a.r)} was carrying ${T(a.t).held}.`]];
    case 'notTypeInRoom': return [
      ['say', `Whoever was in the ${R(a.r)} didn't have ${T(a.t).any}. I'd have noticed.`],
      ['note', `The person in the ${R(a.r)} wasn't carrying ${T(a.t).label}.`]];
    // ---- the body
    case 'murderType': return [
      ['note', `The coroner is certain: the cause of death was ${T(a.t).cause}.`]];
    case 'murderNotType': return [
      ['note', `The coroner is clear: he was not killed with ${T(a.t).label}.`]];
    case 'murderNotSuspect': return [
      ['note', `${S(a.s)} has a solid alibi and can be ruled out as the killer.`]];
    case 'murderNextTo': return [
      ['note', `The killer was in a ${unit} right next to ${S(a.s)}'s.`]];
    case 'murderFarFrom': return [
      ['note', `It wasn't ${S(a.s)}, and it wasn't anyone in a ${unit} next to ${S(a.s)}'s.`]];
    case 'murderSameFloor': return [
      ['note', `The killer was on the same floor as ${S(a.s)}, but it wasn't ${S(a.s)}.`]];
    case 'murderAheadOf': return [
      ['note', `The killer's carriage was nearer the engine than ${S(a.s)}'s.`]];
    case 'murderBehind': return [
      ['note', `The killer's carriage was further from the engine than ${S(a.s)}'s.`]];
    case 'murderNotWeapon': return [
      ['note', `Forensics cleared the ${W(a.w)}. It is not the murder weapon.`]];
    case 'murderNotRoom': return [
      ['note', `The body was not found in the ${R(a.r)}.`]];
    case 'murderAdjRoom': return [
      ['note', `The body was found in a ${unit} next to the ${R(a.r)}.`]];
    case 'murderNotAdjRoom': return [
      ['note', `The body was not in the ${R(a.r)}, and not in any ${unit} next to it.`]];
    case 'murderFloor': return [
      ['note', `The body was found ${floorWord(a.f)}.`]];
    case 'murderNotFloor': return [
      ['note', `The body was not found ${floorWord(a.f)}.`]];
  }
  throw new Error('no text for clue type ' + c.type);
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
