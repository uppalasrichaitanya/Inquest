# Inquest

A daily murder mystery. A few true statements, one notebook, exactly one answer.

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

Folders: `src/` the puzzle engine, `ui/` the interface, `bank/` the 750 checked cases, `playtest/` screenshots and the playtest script.

- `npm install` installs jsdom (UI test) and playwright-core (screenshots)
- `node test-engine.js 30` every case has exactly one answer and no redundant clue; also re-checks every banked case, titles and wording
- `node test-variants.js` clue types keep their variants and voices; `--wording` re-records `clue-wording.txt` after rewording (review its diff)
- `node test-ui.js` plays the game in a simulated browser on a fixed test date (Tuesday 3 November 2026); `INQ_TZ=Area/City node test-ui.js` runs it in another time zone. The shipped page always uses the real date
- `node shots.js` screenshots the page at 1366px and 390px, light and dark, into `playtest/latest/`, using the installed Edge or Chrome
- `node mine.js <tier> <count> <startIndex> <out.json>` mines more cases; after adding them to `bank/`, run `node retitle.js` so each gets its own title

Notes for editing:
- Clue wording lives in `src/25-text.js`. Banked cases store a variant index, so keep each clue type's number of variants and their voice (`say` / `note`) unchanged.
- The week rises like a crossword: Monday four guests, Tuesday and Wednesday five, Thursday to Saturday six, Sunday the Mastermind (`dailyFor` in `ui/10-state.js`). Only today's case, closed on its day, counts towards the streak.
