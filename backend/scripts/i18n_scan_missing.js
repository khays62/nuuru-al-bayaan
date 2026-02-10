import fs from 'fs';
import path from 'path';

function walk(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules') continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

function readUtf8(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

function addMatches(set, re, txt) {
  let m;
  while ((m = re.exec(txt))) {
    const val = String(m[2] ?? '').trim();
    if (val) set.add(val);
  }
}

const repoRoot = process.cwd();
const backendDir = path.join(repoRoot, 'backend');
const files = walk(backendDir).filter((f) => f.endsWith('.js'));

const captured = new Set();
for (const f of files) {
  if (f.endsWith(path.join('i18n', 'messageMap.js'))) continue;
  const txt = readUtf8(f);

  // Capture object properties: message: '...'
  addMatches(captured, /\bmessage\s*:\s*(["'`])([^\n\r]*?)\1/g, txt);
  addMatches(captured, /\berror\s*:\s*(["'`])([^\n\r]*?)\1/g, txt);
}

const messageMapPath = path.join(backendDir, 'i18n', 'messageMap.js');
const mm = readUtf8(messageMapPath);

const known = new Set();
// capture static keys in arStatic / soStatic objects
let km;
const keyRe = /^\s*(["'])(.+?)\1\s*:\s*(["'])/gm;
while ((km = keyRe.exec(mm))) {
  known.add(String(km[2] || '').trim());
}

const missing = [...captured].filter((s) => s && !known.has(s)).sort();

const out = {
  capturedCount: captured.size,
  knownCount: known.size,
  missingCount: missing.length,
  missing,
};

const outPath = path.join(repoRoot, 'i18n_scan_missing.json');
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(`Wrote ${outPath}`);
console.log(`captured=${out.capturedCount} known=${out.knownCount} missing=${out.missingCount}`);
