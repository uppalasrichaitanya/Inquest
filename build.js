// Assembles the single-file page: styles + engine + case bank + interface.
const fs = require('fs'), path = require('path');
const read = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8');
const dir = (d, ext) => fs.readdirSync(path.join(__dirname, d)).filter((f) => f.endsWith(ext)).sort().map((f) => read(d + '/' + f)).join('\n');

require('child_process').execSync('node build-engine.js', { cwd: __dirname, stdio: 'inherit' });
const bank = {};
for (const t of ['constable', 'detective', 'inspector']) bank[t] = JSON.parse(read(`bank/${t}.json`));
bank.mastermind = [];
for (const f of fs.readdirSync(path.join(__dirname, 'bank')).filter((f) => /^mastermind.*\.json$/.test(f))) bank.mastermind.push(...JSON.parse(read('bank/' + f)));
// keep one copy of each case, and cap the size
for (const t in bank) { const seen = new Set(); bank[t] = bank[t].filter((c) => !seen.has(c.s) && seen.add(c.s)).slice(0, 200); }

const css = dir('ui', '.css');
const engine = read('dist/engine.js').replace(/if \(typeof module[\s\S]*$/, '');
const ui = dir('ui', '.js');
const fonts = 'https://fonts.googleapis.com/css2?family=Courier+Prime:ital,wght@0,400;0,700;1,400&family=Limelight&family=Reenie+Beanie&display=swap';
const frag = `<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Inquest</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${fonts}">
<style>
${css}
</style>
<div id="app"></div>
<script>
const BANK = ${JSON.stringify(bank)};
${engine}
${ui}
</script>
`;
fs.writeFileSync(path.join(__dirname, 'dist/index.html'), frag);
fs.writeFileSync(path.join(__dirname, 'dist/test.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>${frag}</body></html>`);
console.log('index.html', (frag.length / 1024).toFixed(0) + 'KB', Object.fromEntries(Object.entries(bank).map(([k, v]) => [k, v.length])));
