# Inquest

A daily murder mystery. Every suspect makes a statement, and only the killer lies.

Each case has a victim, an occasion and a handful of suspects, each with a portrait, four traits (height, hand, hair, eyes) and one statement. Weapons have a kind, a weight and a material; rooms have a floor and are lit or dark. On Sundays every suspect also has a motive, and you name it too. The evidence is always true; so is every statement except the killer's. Find the lie, and you have the killer. The notebook is a classic logic grid that can be filled in completely, and the map shows people and weapons as you place them. Inspector Mallory opens each case with a line and closes it with another. The verdict gives the motive and the lie that gave the killer away.

The whole game is one file, `dist/index.html`, with no server and no accounts. It needs the internet only for its font (Google Fonts). Case No. 1 is 15 October 2026, and everyone gets the same case each day, on their own calendar.

## Build

Needs Node 18 or later.

```sh
node build.js            # writes dist/index.html
```

Open `dist/index.html` in a browser to play.

## Publish on GitHub Pages

The workflow in `.github/workflows/pages.yml` publishes the game on every push to `main`. It rebuilds the page with the site's address, checks the bank, and publishes `index.html` alone.

One-time setup:

1. On GitHub, create an empty repository (for example `inquest`). Don't add a README or licence there.
2. In this folder, connect it and push:
   ```sh
   git remote add origin https://github.com/<your-user>/inquest.git
   git push -u origin main
   ```
3. On GitHub, open the repository's **Settings → Pages**, and under **Build and deployment → Source** choose **GitHub Actions**.
4. Open the **Actions** tab. If the first run started before step 3 and failed, open it and press **Re-run all jobs**.

The game is then at `https://<your-user>.github.io/inquest/`. After that, every `git push` republishes it.

A shared link shows "Inquest" and the one-line pitch above. To build a local copy with the absolute link tags too, set `SITE_URL`: `SITE_URL=https://<your-user>.github.io/inquest/ node build.js`.

## Development

Folders: `src/` the puzzle engine, `ui/` the interface, `bank/` the 800 checked cases (200 per tier), `playtest/` screenshots and the playtest script.

- `npm install` installs jsdom (UI test) and playwright-core (screenshots)
- `node test-engine.js 30` every case has exactly one whole solution (every weapon, room and the killer), one statement per suspect that is false only for the killer, a lie that shows (taken at their word, the statements clash with the evidence) and no spare evidence; also re-checks every banked case, titles and wording
- `node test-variants.js` clue types keep their number of evidence and testimony wordings; `--wording` re-records `clue-wording.txt` after rewording (review its diff)
- `node test-ui.js` plays the game in a simulated browser on a fixed test date (Tuesday 3 November 2026); `INQ_TZ=Area/City node test-ui.js` runs it in another time zone. The shipped page always uses the real date
- `node shots.js` screenshots the page at 1366px and 390px, light and dark, into `playtest/latest/`, using the installed Edge or Chrome
- `node mine.js <tier> <count> <startIndex> <out.json>` mines more cases; after adding them to `bank/`, run `node retitle.js` so each gets its own title

Notes for editing:
- Clue wording lives in `src/25-text.js`. Banked cases store a variant index, so keep three wordings per clue type, for evidence and for testimony alike. Keep the logic plain and up front; a joke may ride on the end but must never change what the clue means. Testimony is spoken in the first person when a suspect talks about themselves.
- Suspects, their traits, looks and motives, and each setting's victims and occasions live in `src/10-worlds-manor.js` and `src/11-worlds-train.js` (the manor, the train and the liner). Portraits and weapon icons are drawn in `ui/12-art.js`.
- The week rises like a crossword: Monday three suspects, Tuesday and Wednesday four, Thursday to Saturday four with fewer gifts, Sunday the Mastermind: four suspects with a motive each (`dailyFor` in `ui/10-state.js`). Only today's case, closed on its day, counts towards the streak.
