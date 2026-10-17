# Inquest — plan for the rework

Status: **proposal, nothing built yet.** Questions for you are in section 8.

---

## 0. What I did before writing this

- Read README, all of `src/` and `ui/`, `build.js`, the tests.
- `node test-engine.js 30` passes: 120 freshly generated cases plus 751 shipped ones (the tutorial and 200/200/200/150 in the bank). There are 750 bank cases, not 550.
- Rebuilt in a scratch copy. `dist/index.html` is identical to a fresh build of the current source.
- **The root `Inquest.html` is an older build.** It has no tutorial and no four-suspect tier, and it opens on a five-suspect case. That matches your play-test exactly ("dropped into a hard case with no explanation"). The current `dist/` adds an 11-step coached tutorial and a "Constable" tier, but most of the other problems are still there.
- Played `dist/index.html` in Chromium (Playwright) at 1366×850 and 390×844, in light and dark mode. I did the whole tutorial, then a real Detective case, which I solved by reasoning, not by reading the answer. I also tried a hint and a wrong accusation, then opened an Inspector case on the phone. I looked at the old `Inquest.html` too.
- Screenshots are in `.playwright-mcp/`: `d01`–`d11` are desktop, `m01`–`m06` are phone, `o01` is the old build.

### What I found when I played

**The puzzles are good.** The Detective case ("The Storm at Blackwood", 8 statements) was fair and satisfying. It took about 2 minutes, and the "aha" came from counting weapon *kinds* and reasoning about *floors*. That is a good sign for the engine. It is also the main finding about the UI, below.

Confusing:
1. **The notebook doesn't hold the reasoning the clues need.** Most clues talk about weapon *kinds* ("something heavy and blunt", "the same kind of weapon"), *floors*, and *"next to"*. The grid shows weapon names with no kind, rooms with no floor, and nothing about adjacency. To use a clue you have to scroll to a collapsed "What was found" list (closed by default above four suspects) or to the floor plan, keep it in your head, and come back.
2. **Three blocks, one of them redundant.** "What was where" can always be derived from the other two blocks. Beginners are told so in a paragraph, which shows it shouldn't be a block they have to fill in.
3. **"Next to" includes above and below.** On the manor, the Study is "next to" the Library because it sits on top of it. That is a reasonable rule, but no one would guess it. It is explained in a sentence above the plan and not drawn anywhere.
4. **The tutorial is on rails.** Eleven steps of "tap the square with the red outline". It teaches where to tap, not how to think. On a phone the coach card covers the bottom third of the screen, and step 7 tells you to look at a list that is hidden under the card.
5. **Four "daily" cases at once.** The home screen is a drawer of four folders. That breaks the one-puzzle ritual that makes daily games work, and it asks a new player to make a choice before they know anything.
6. **The hint can refer to marks you haven't made.** "Read statement 4 alongside what your notebook already says about Major Crisp", shown when the notebook was empty.

Ugly:
7. Too many competing elements. Each screen has a green-grey desk, a parchment texture, a typewriter font, a handwritten font ("Notebook"), a display font (Limelight), a navy blueprint, a red stamp, and coloured wax seals. Each one is fine. Together they read as a theme rather than a design.
8. Two "CASE CLOSED" stamps overlap on the finish screen (`d11`). The background gradient stops at the first screen height (`d07`). The sticky top bar is transparent over the text below it (`m02`).
9. Dark mode only darkens the desk around a light paper card (`m05`).
10. On the phone, "Accuse" is clipped at the right edge and long weapon names get cut ("Silver Letter Ope…").

Slow:
11. **On a phone, the statements and the notebook are about 1,500px apart** (the page is about 3,000px tall). Every clue means scrolling up, reading, scrolling down, finding the square, and scrolling up again. This is the biggest usability cost in the game.
12. The tutorial takes about 2 minutes of clicking before you play anything real.
13. The finish screen has four buttons, and the share text is a plain line with nothing that shows *how* you solved it.

---

## 1. The goal, in my words

A daily logic puzzle, about 3–10 minutes long, that feels like a **small, well-made object**: one page, one mystery, one answer you can be sure of. Its satisfaction comes from the click of deduction, not from the decoration. You come back tomorrow because yesterday's felt fair and clever, and because your friends are sharing theirs.

### A first-time player's first 30 seconds, done right

| Seconds | What happens |
|---|---|
| 0–5 | One screen: the name, a one-line promise ("One murder. A few true statements. Exactly one answer."), today's date and **one** button: *Play today's case*. |
| 5–15 | On a first visit, a **warm-up case** opens instead: three people, three statements. Above it, three short rules, each with its example drawn right next to it, not a wall of text. |
| 15–30 | They read statement 1, tap a square, and **see a cross appear with a one-line note saying why** ("Pell never touched the port, so that pair is out"). They've done a real deduction and they know what the notebook is for. |

Within about a minute they have closed the warm-up, and the first real case (the easiest day of the week) is one tap away. There is no modal, no 11-step script, and no choice of tiers yet.

---

## 2. Audit

### Keep (unchanged)
- **The engine (`src/`)**: generation, the exact solver (`solveCount`), the minimality squeeze, and the human-difficulty model (`humanDifficulty`: depth of "what if?" plus probe count). This last one is the most valuable piece here, because it lets us control difficulty by *how people reason*, not by clue count.
- **The bank format and the 750 verified cases**, and `test-engine.js` as the gate.
- **Two settings** (Blackwood Manor, the Meridian Express). They are enough variety for now.
- **The build shape**: a single `dist/index.html` from `node build.js`.

### Keep the idea, rework the execution
- **The tutorial case** (`src/46-tutorial.js`): keep a hand-made, verified warm-up, but rework how it is taught (section 4).
- **The tiers**: keep the four difficulty profiles as the source, but present them as **days of the week**, not as four folders (section 6).
- **The hint system** ("which statement to read next", "this mark is wrong"): keep it, but word hints only from marks that exist.
- **The wrong-accusation feedback** ("that story breaks against statement 3") is excellent. Keep it.
- **The floor plan**: keep it, but make it smaller, plain, and responsible for showing "next to" (connections drawn), instead of a navy blueprint panel.
- **Clue wording**: keep the voices (a witness says it vs. a case note). Reword the clue types that tested worst (section 5), keeping the variant counts per clue type, as the README requires.

### Drop
- The desk, paper texture, typewriter font, handwritten font, Limelight, blueprint panel, wax seals, rubber stamps, and the "Case closed" stamp animation.
- The **"What was where"** block as something you have to fill in (it becomes automatic or hidden; section 5).
- **"One block / All three"** and the notebook settings drawer. One good default replaces two modes.
- The **four-folder home screen**.
- The **11-step coach overlay**.
- The visible running **timer** during play (the time still appears at the end; see question 6).
- The stale root **`Inquest.html`** (once you confirm).

---

## 3. Visual direction

The common rule for all three: **one typeface family, one accent colour, no textures, no pictures of things.** Charm comes from a single memorable element and from carefully written copy, not from props.

### A. "Casebook" — recommended

A clean printed page, like a good paperback puzzle book.

- **Palette** (light): paper `#F5F0E6`, ink `#1F1C19`, faint rule `#D9D0C0`, one accent, **vermilion `#C2412D`**, used only for *your* marks and the final answer.
  Dark: night `#15171C`, chalk `#ECE6DA`, rule `#2D3038`, accent `#E2674F`. A real redraw, not a dimmed card.
- **Type**: **Newsreader** (Google Fonts, a serif with optical sizes and good italics) for everything. Display size for the title, text size for statements, small caps for labels. Tabular figures for times. One family.
- **Layout**: a single centred column of about 640px. On wide screens, the statements on the left and the notebook on the right, sharing one baseline. Generous margins. Thin rules instead of boxes.
- **The memorable element: the pen.** Your crosses and circles are drawn as slightly irregular **vermilion ink strokes**: an SVG path with a tiny random wobble per mark, seeded by the square, so it is stable. Everything printed is black and still; everything *you* did is red and alive. When you solve the case, the three answer squares get a single ink circle each, and that is the whole celebration. The same marks become the share image (section 6).
- **Suspects**: a small filled dot in a muted colour, plus a surname. No initials-in-seals.

```
 ┌───────────────────────────────────────────────────────────────┐
 │  INQUEST                                   No. 214 · Thursday │
 │  ─────────────────────────────────────────────────────────────│
 │  The Storm at Blackwood                                       │
 │  Sir Aldous is dead. Five guests, five rooms, five weapons.   │
 │                                                               │
 │  STATEMENTS                     │  NOTEBOOK                   │
 │  1  The body was found in a     │           Weapons    Rooms  │
 │     room next to the Library.   │           ⟋ ⟋ ● ● ∿  S D L C W│
 │  2  “Vane and Thorne carried    │  Vane     · · ✕ ✕ ·  · ○ · · ·│
 │     the same kind of weapon.”   │  Crisp    ✕ ✕ · ○ ✕  · · · · ·│
 │       — Imogen Lark             │  Thorne   · · ✕ · ✕  · · · · ·│
 │  3  Death by a heavy blow.      │  Marrow   ...                 │
 │  ...                            │  Lark     ...                 │
 │                                 │                               │
 │                                 │  [small plan with doors]      │
 │                                 │            [ Name the killer ]│
 └───────────────────────────────────────────────────────────────┘
   ⟋ blade  ● blunt  ∿ cord   S/D/L… rooms, grouped by floor
```

### B. "Parlour game"

Mid-century board-game card: cream background, flat saturated tokens, a rounded geometric sans (e.g. **DM Sans**). Each suspect is a coloured counter. **Memorable element:** when you circle a match, the suspect's counter *slides onto the floor plan*. It is friendly and tactile, but it pulls the look toward colourful-cartoon territory, close to Murdle's feel, and needs more drawing work to keep it original.

```
 ┌──────────────────────────────┐
 │ (●Vane)(●Crisp)(●Thorne)...  │  ← tokens
 │ ┌────────┬───────┐           │
 │ │ Study  │       │  plan with │
 │ ├────┬───┴──┬────┤  counters  │
 │ │Din │ Lib ●│Cons│            │
 │ └────┴──────┴────┘           │
 │ 1. The body was found ...    │
 └──────────────────────────────┘
```

### C. "Late edition"

A newspaper puzzle column: black on white, a strict grid, a condensed headline face (**Libre Franklin**) with a serif text face, and hairlines everywhere. **Memorable element:** a masthead with the case number and the day, and the puzzle set like a crossword in the paper. It is the most restrained, but also the coldest. It suits "logic puzzle" more than "murder mystery".

```
 ═══════════════════════════════
  THE INQUEST · No. 214 · THURS
 ═══════════════════════════════
  Statements      │  Grid
  ────────────────┼─────────────
  1. ...          │  ■□□□□ ...
```

### Why A has more taste than the current look

The current look piles up *references* to a theme: desk, paper, typewriter, blueprint, wax, stamp. Each adds noise and none adds meaning. A keeps **one idea that carries meaning: printed ink vs. your ink**. It tells you at a glance what was given and what you worked out, and it makes the finish moment and the share image from the same material. It removes about 80% of the surface decoration, two fonts out of three, and all the textures, and it gives dark mode a real design.

---

## 4. Onboarding

**Recommendation: a 60-second warm-up case, taught *in* the case, not on top of it.** It would be shown automatically on the first visit and kept under "How to play".

1. **Three rules, each with a picture.** Shown above the warm-up, and later in "How to play":
   - *Each person had one weapon and was in one room. No two shared.*  (a row with one circle and the rest crossed)
   - *Every statement is true.*  (a statement next to the cross it causes)
   - *The killer held the murder weapon in the room where the body was found.*  (three circled squares joined)
2. **The warm-up**: three suspects, three or four statements, rebuilt from the existing `TUTORIAL` and still verified by `test-engine.js`. Each statement has a small grey line under it: *"Try it: what does this rule out?"*
3. **Do, then explain.** The player taps *any* square. If the mark is right (we know the truth), the ink lands with a one-line reason ("Pell never touched the port"). If it is wrong, it is drawn faint, with a gentle note ("Statement 1 doesn't say that; it only rules out one pair"). Nothing is locked, and there are no red outlines to follow.
4. **Automatic crossing is shown, then named once.** After the first circle, the rest of the row and column fade to crosses, and a one-time note explains why.
5. **The finish teaches accusing.** "Name the killer" becomes active only once the notebook gives an answer, and the warm-up ends on a short, warm closing line.

**Do we need an easier first tier?** Yes, and it already exists (Constable: four suspects, no "what if?" needed). In the weekly plan (section 6) it is **Monday**. A first-time player is sent to the warm-up, then to Monday's case if today isn't Monday (from the archive, labelled "a gentle one to start").

**Simpler wording, everywhere:** "statement" not "testimony"; "Name the killer" not "Accuse"; no ranks (Constable/Inspector) in the main path. Days and a 1–3 dot difficulty mark are enough.

---

## 5. A clearer notebook and clearer clues

### The notebook: one table, the facts the clues talk about printed on it

- **One table**: suspects as rows; **weapons** and then **rooms** as two column groups. That merges blocks 1 and 2. "What was where" is no longer something you fill in: it is shown automatically on the plan, as now.
- **Column headers carry the facts the clues use.** Each weapon gets its kind glyph and kind word under its name (⟋ blade · ● blunt · ⚗ poison · ∿ cord · ⌐ firearm). Rooms are **grouped under their floor** ("Upstairs · Ground · Cellar") or, on the train, ordered from the engine. A "blunt weapon" clue becomes something you can *see* in the grid.
- **Tapping a statement highlights the names it mentions** in the grid and the plan, as the current token highlight does, but stronger, and it is the main way of working.
- **Marks**: tap = cross, second tap = circle, third = clear. Automatic crossing (the row and column of a circle) is always on and drawn fainter than your own marks.
- **The killer**: a final short row, "Killer: ○ ○ ○ ○ ○" under the table, so the third question has a place. Murder clues ("not Crisp", "same floor as Pell") get marked there.
- **The plan draws "next to"**: thin lines (doors and stairs) between connected rooms, so "next to" is *seen*, not explained. Rooms not in this case are left out or drawn as faint ghosts.

**On a phone (390px):** the case page is one screen, not three stacked panels.
```
 ┌──────────────────────────┐
 │ No. 214 · Thu       ?  ☰ │
 │ ◀  3 / 8  ▶              │ ← clue strip: one statement at a time,
 │ “Vane and Thorne carried │   swipe or arrows; tap ☰ for the full list
 │  the same kind of weapon”│
 ├──────────────────────────┤
 │ [ Weapons ] [ Rooms ]    │ ← one group at a time at this width
 │        ⟋  ⟋  ●  ●  ∿     │
 │ Vane   ·  ·  ✕  ✕  ·     │
 │ Crisp  ✕  ✕  ·  ○  ✕     │
 │ ...                      │
 │ Killer ○  ○  ✕  ○  ✕     │
 ├──────────────────────────┤
 │ [plan, collapsible]      │
 │       [ Name the killer ]│
 └──────────────────────────┘
```
The **clue strip** removes the 1,500px scroll: the statement you are working on always sits right above the squares it talks about. On desktop, the full statement list stays visible beside the notebook.

### Clue wording to revisit (variant counts stay as they are)
- `murderFarFrom`: "It wasn't X, and it wasn't anyone in a room next to X's" → split into a clear two-part sentence.
- `weaponNear`: "…in a room next to the R, not in the R itself" → shorter.
- `murderNextTo` / `adjacent`: once the plan draws connections, "next to" can stay. Possibly rename to "connected to" if testing shows people still read it as side-by-side only.
- Drop the filler flourishes from witness lines ("Not even close", "I thought that was odd") where they add length but no meaning. Keep one bit of character per witness.

---

## 6. Difficulty, pacing, the finish

### One case a day, rising through the week
| Day | Source tier | Feel |
|---|---|---|
| Mon | Constable | 4 suspects, plain elimination |
| Tue–Wed | Detective | 5 suspects, maybe one "what if?" |
| Thu–Sat | Inspector | 6 suspects, a theory to test |
| Sun | Mastermind | No direct testimony, nested "what ifs" |

This is the crossword convention: everyone plays the same case, and the week has a shape. The other tiers stay playable from an **archive** of past days, so a beginner can practise Mondays and an expert can go back for Sundays. That's a question for you (Q2).

### Keeping it hard without being confusing
The rule: **difficulty should come from the logic, never from the presentation.** Concretely:
- Difficulty is set by the engine's measured `depth` / `probes`, not by clue count.
- Every fact a clue relies on (kind, floor, adjacency) is visible in the notebook or plan, so a hard case is hard because of *reasoning*, not lookup.
- Confusing clue types are reworded or kept out of the early days (Constable already excludes the hardest shapes).
- Hints are graded: 1) "Look at statement 4", 2) "It's about Crisp's weapon", 3) the deduction. Each counts in the share line.

### The finish and share moment
- The three answer squares get their circles, and one sentence says what happened ("It was Mrs. Marrow, in the Conservatory, with the candlestick"). There is an optional "How it happened" with the full solution, then **one** primary button: *Share*. "Play an older case" is a quiet link.
- **Share text**, spoiler-free, showing how it went rather than what the answer was:
  ```
  Inquest No. 214 · Thursday ●●○
  ✒️✒️✒️ named on the first try
  6 min · no hints
  ```
  A wrong accusation adds a crossed line before the final one (✕✕✕ then ✒️✒️✒️). Hints add a 💡 each. It's original, short, and readable without the game.
- Streak and solve count are shown small on the home screen, not celebrated with modals.

### How we find out if it works
1. **Automated, every build**: `node test-engine.js 30`, plus a Playwright script that plays the warm-up and a real case and screenshots 1366/390 × light/dark. It also checks for no horizontal scroll at 390px, every control reachable by keyboard, and an axe-core pass.
2. **Clue comprehension check** (cheap, early): show 10 people one statement each and ask them to mark what it means on a small grid. Any clue type that more than ~2 in 10 misread gets reworded.
3. **Watched play-tests**: 5–6 people who have never seen it (two puzzle fans, two casual Wordle players, one or two who "don't do logic puzzles"), on their own phones, thinking aloud. We measure:
   - time to their first correct mark (target under 30s),
   - whether they finish the warm-up unaided (target 5 of 6),
   - Monday solve time (target 3–6 min) and Thursday solve time (8–15 min),
   - where they got stuck, and whether they blamed themselves (a good puzzle) or the screen (a bug).
4. **A small week-long run**: the same people play daily for a week. We look at return rate and which days were "too hard / unfair". It needs no server: they paste their share lines into a group chat, which also tests the share text.

---

## 7. Risks, open questions, milestones

### Risks
- **Rewording clues** must keep the variant count and voice per clue type, or the banked cases point at the wrong text. That's mitigated by a test that compares variant counts and voices against a stored snapshot.
- **Re-merging the notebook** removes the "What was where" block that the tutorial and hint code use. The hints must be re-expressed in two blocks plus the killer row.
- **Phone width with six suspects**: 6 weapons + 6 rooms + names won't fit in 358px, which is why the phone gets the Weapons/Rooms switch. We need to check that the switch doesn't bring back the "where was that fact?" problem.
- **"Do, then explain"** in the warm-up judges marks against the truth. In real cases we must *not* do that by default (it would give away answers). It stays a warm-up-only behaviour.
- **Taste is subjective.** Direction A could come out plain if the pen mark isn't right. A small static mock-up before the full build reduces that risk (milestone 2).
- **Sunday (Mastermind) may be too hard for a daily audience.** The play-tests decide.

### Open questions (mine, answerable by testing)
- Does "next to = shares a wall or a staircase" read clearly once it is drawn, or should we rename it?
- Does the killer row help, or do people just accuse once the two blocks are full?
- Are hints that cost nothing but appear in the share line enough of a deterrent?

### Milestones (each built and verified on its own)
1. **Baseline and safety net.** `git init` (if you agree), and add the Playwright screenshot script (`shots.js`) and a clue-variant snapshot test. *Verify:* the engine tests and the script pass on the current game.
2. **Static look.** One HTML mock-up of the case screen in direction A (desktop + phone, light + dark), with no logic. *Verify:* screenshots, and your sign-off on the look.
3. **New shell and type.** Swap the fonts, palette, and tokens across all screens. Remove the textures, stamps, seals and blueprint. Behaviour is unchanged. *Verify:* screenshots in all four modes, no horizontal scroll at 390px.
4. **The case screen.** The merged notebook, kind and floor headers, the killer row, the clue strip on phone, and the plan with drawn connections. *Verify:* solve a case on each tier on desktop, on phone, and by keyboard only.
5. **Onboarding.** The three rules, a reworked warm-up with "do, then explain", and a first-visit flow. *Verify:* the warm-up stays unique and minimal in `test-engine.js`, and Playwright completes it from an empty localStorage.
6. **Home and daily rhythm.** One daily case with a weekday ramp, an archive, and the streak. *Verify:* the date-to-case mapping is unit-tested across a week and across a month boundary.
7. **Finish and share.** The final circles, the share text, and the "how it happened" section. *Verify:* the share text has no spoilers and is checked for each outcome (clean, hinted, wrong guess).
8. **Clue wording pass** for the types listed in section 5. *Verify:* the variant snapshot is unchanged and all 750 bank cases re-import cleanly.
9. **Play-test round** (section 6) and tuning of tier boundaries, possibly re-mining a few days. *Verify:* the targets in section 6.

---

## 8. Questions for you

1. **The look.** I recommend **A, "Casebook"**: a printed page, one serif, vermilion ink only for your own marks. The alternatives are B (playful board-game tokens) and C (austere newspaper column). Which one?
2. **Daily structure.** I recommend **one case per day, rising Monday → Sunday**, with the other tiers in an archive. The alternative is keeping four cases every day.
3. **How hard should the top end be?** I recommend keeping Mastermind as **Sunday only**. The alternatives are dropping it from the daily, or keeping it as an optional extra.
4. **Tone.** I recommend **dry and warm**: Golden Age whodunit, a little wry, no gore. The alternatives are straight noir or broadly comic. This decides the copy for the home screen, the statements and the finish line.
5. **Timer.** I recommend **hidden while you play, shown at the end and in the share line.** Or should it be visible as now?
6. **Housekeeping.** May I delete the stale root `Inquest.html`, `git init` the folder, and put playtest screenshots in a `playtest/` folder (they are in `.playwright-mcp/` now)?
