function checkAccusation(puzzle, acc) {
  const s = puzzle.solution;
  return { killer: acc.killer === s.killer, weapon: acc.weapon === s.weapon, room: acc.room === s.room, motive: s.motive === null || acc.motive === s.motive };
}

if (typeof module !== 'undefined') {
  module.exports = { TUTORIAL, MOTIVES, WEAPON_ATTRS, eachWorld, motivePerms, TRAITS, TRAIT_KEYS, TESTIMONY_TYPES, testimony, statementTrue, caseStory, clueHolds, countSurvivingWorlds, generatePuzzle, exportPuzzle, importPuzzle, checkAccusation, solveCount, marginals, humanDifficulty, buildCSP, propagate, TIERS, WORLDS, WEAPON_TYPES, plainText, permutations, makeRng, enumerateClues, buildCtx, clueVariants, titlePool, titleClash, titleBanned, varyWording };
}
