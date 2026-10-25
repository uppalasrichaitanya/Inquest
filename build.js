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
const fonts = 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT@0,9..144,400..700,0..100;1,9..144,400..700,0..100&family=Instrument+Sans:wght@400..700&display=swap';
// What a shared link shows: the name and a one-line pitch. SITE_URL (the published address, e.g.
// https://you.github.io/inquest/) adds the canonical link and og:url, which must be absolute.
const SITE = { name: 'Inquest', pitch: 'A daily murder mystery. Every suspect makes a statement, and only the killer lies.' };
const url = process.env.SITE_URL || '';
const icon = 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#1D5641"/><circle cx="13.5" cy="13.5" r="7.5" fill="none" stroke="#F4EEDF" stroke-width="3"/><path d="M19.5 19.5L26 26" stroke="#F4EEDF" stroke-width="4" stroke-linecap="round"/><circle cx="13.5" cy="13.5" r="3" fill="#D9452F"/></svg>`);
const head = `<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${SITE.name}</title>
<meta name="description" content="${SITE.pitch}">
<meta name="theme-color" content="#1D5641" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#143B2E" media="(prefers-color-scheme: dark)">
<link rel="icon" href="${icon}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${SITE.name}">
<meta property="og:title" content="${SITE.name}">
<meta property="og:description" content="${SITE.pitch}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${SITE.name}">
<meta name="twitter:description" content="${SITE.pitch}">${url ? `
<link rel="canonical" href="${url}">
<meta property="og:url" content="${url}">` : ''}
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${fonts}">
<style>
${css}
</style>`;
const body = `<div id="app"></div>
<script>
const BANK = ${JSON.stringify(bank)};
${engine}
${ui}
</script>`;
const page = `<!doctype html>
<html lang="en">
<head>
${head}
</head>
<body>
${body}
</body>
</html>
`;
fs.writeFileSync(path.join(__dirname, 'dist/index.html'), page);
// the UI test loads the same page
fs.writeFileSync(path.join(__dirname, 'dist/test.html'), page);
console.log('index.html', (page.length / 1024).toFixed(0) + 'KB', Object.fromEntries(Object.entries(bank).map(([k, v]) => [k, v.length])));
