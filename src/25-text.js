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
