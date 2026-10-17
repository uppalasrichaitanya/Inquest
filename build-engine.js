// Concatenates src/*.js (sorted) into dist/engine.js so Node tests and the browser page share one engine.
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'src');
const files = fs.readdirSync(dir).filter((f) => /^\d\d-.*\.js$/.test(f)).sort();
const code = files.map((f) => `// ---- ${f}\n` + fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'dist', 'engine.js'), code);
console.log('engine.js', code.length, 'bytes from', files.length, 'files');
