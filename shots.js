// Screenshots a page at desktop and phone width, in light and dark, from a fresh visit (empty storage),
// and checks the basics every screen must pass: no horizontal scroll, no script errors, every button named.
//   node shots.js                      -> dist/index.html
//   node shots.js mockup/casebook.html -> any page in this folder
//   node shots.js --set inq1:tutorial=1 -> seed localStorage first (repeatable), e.g. to skip the first-visit lesson
// Writes playtest/latest/<page>-<size>-<scheme>.png (and -full.png for the whole page). Exit code 1 on any failure.
// Drives the Edge or Chrome already installed (playwright-core, no browser download).
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright-core');

const args = process.argv.slice(2), seed = {};
for (let i = 0; i < args.length; i++) if (args[i] === '--set') { const [k, ...v] = args.splice(i, 2)[1].split('='); seed[k] = v.join('='); i--; }
const page = args[0] || 'dist/index.html';
const file = path.resolve(__dirname, page);
if (!fs.existsSync(file)) { console.log('no such page:', page); process.exit(1); }
const url = 'file:///' + file.replace(/\\/g, '/');
const out = path.join(__dirname, 'playtest', 'latest');
fs.mkdirSync(out, { recursive: true });
const name = path.basename(page, '.html') + (Object.keys(seed).length ? '-seeded' : '');

const SIZES = { desktop: { width: 1366, height: 850 }, phone: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } };
const SCHEMES = ['light', 'dark'];

async function launch() {
  for (const channel of ['msedge', 'chrome']) {
    try { return await chromium.launch({ channel }); } catch (e) { /* try the next browser */ }
  }
  return chromium.launch(); // a Playwright-managed Chromium, if one is installed
}

(async () => {
  const browser = await launch();
  let fails = 0;
  const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
  for (const [size, vp] of Object.entries(SIZES)) {
    for (const scheme of SCHEMES) {
      const { width, height, ...rest } = vp;
      const ctx = await browser.newContext({ viewport: { width, height }, colorScheme: scheme, ...rest });
      await ctx.addInitScript((s) => { for (const k in s) localStorage.setItem(k, s[k]); }, seed);
      const p = await ctx.newPage();
      const errors = [];
      p.on('pageerror', (e) => errors.push(e.message));
      p.on('console', (m) => { if (m.type() === 'error' && !/favicon|fonts\.g/.test(m.text())) errors.push(m.text()); });
      await p.goto(url);
      await p.evaluate(() => Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 4000))]));
      await p.waitForTimeout(400);
      const tag = `${name} ${size} ${scheme}:`;
      const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      ok(over <= 0, `${tag} no horizontal scroll${over > 0 ? ` (${over}px too wide)` : ''}`);
      ok(!errors.length, `${tag} no script errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
      const unnamed = await p.evaluate(() => [...document.querySelectorAll('button, [role=button], a[href]')]
        .filter((b) => b.offsetParent !== null && !(b.getAttribute('aria-label') || b.textContent).trim()).length);
      ok(!unnamed, `${tag} every visible button has a name${unnamed ? ` (${unnamed} unnamed)` : ''}`);
      await p.screenshot({ path: path.join(out, `${name}-${size}-${scheme}.png`) });
      await p.screenshot({ path: path.join(out, `${name}-${size}-${scheme}-full.png`), fullPage: true });
      await ctx.close();
    }
  }
  await browser.close();
  console.log(fails ? `\n${fails} PROBLEMS` : `\nall checks passed, screenshots in playtest/latest/`);
  process.exit(fails ? 1 : 0);
})();
