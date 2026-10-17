# Inquest

A daily murder-mystery logic game. Read true statements, work the notebook, name the killer, the weapon and the room.

**To play:** open `dist/index.html` in a browser (needs internet only for the Google Fonts).

## Layout
- `src/` puzzle engine: settings, clue types, solvers, case generator
- `ui/` stylesheets and interface code
- `bank/` the 750 mined cases (constable, detective, inspector, mastermind)
- `src/46-tutorial.js` the hand-made first case, played as the warm-up (`ui/60-warmup.js`)
- `dist/index.html` the finished single-file game, `dist/engine.js` the bundled engine

## Commands (Node 18+)
- `npm install` (only needed for the UI test, installs jsdom)
- `node build.js` rebuilds `dist/index.html` from `src/`, `ui/` and `bank/`
- `node mine.js <tier> <count> <startIndex> <out.json>` mines more verified cases (tiers: constable, detective, inspector, mastermind)
- `node test-engine.js 30` checks every generated case has exactly one answer, no redundant clues, and is deterministic; it also re-imports every shipped bank case and the tutorial
- `node test-ui.js` runs the game in a simulated browser (run `node build.js` first; it reads `dist/test.html`, which build.js creates). Its clock is fixed at Tuesday 3 November 2026; `INQ_TZ=Area/City node test-ui.js` runs it in another time zone
- `node test-variants.js` checks clue rewording kept each clue type's number of variants and their voice (`clue-variants.json`), and that every shipped clue still points at a valid variant
- `node shots.js [page.html]` screenshots a page (default `dist/index.html`) at 1366px and 390px, light and dark, into `playtest/latest/`, and fails on horizontal scroll, script errors or unnamed buttons. It uses the installed Edge or Chrome via `playwright-core`

Case No. 1 is 15 October 2026, and there is one case a day for everyone, on the player's local calendar. The week rises like a crossword: Monday is a Constable case (four guests), Tuesday and Wednesday Detective, Thursday to Saturday Inspector, Sunday Mastermind. Each kind of day takes the next case of its tier in bank order (`dailyFor` in `ui/10-state.js`). Past days are in the archive; only today's case, closed on its day, counts towards the streak.

## Notes for editing
- Clue wording lives in `src/25-text.js`. Banked cases store a variant index, so keep the number of variants and their voice (`say` / `note`) per clue type unchanged when rewording.
- First visit opens the warm-up automatically (remembered in `localStorage` as `inq1:tutorial`); it can be replayed from the home screen and from How to play. `node test-ui.js` plays it from empty storage.
