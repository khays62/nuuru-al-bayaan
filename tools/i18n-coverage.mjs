import ar from '../frontend/src/i18n/locales/ar.js';
import so from '../frontend/src/i18n/locales/so.js';
import fs from 'node:fs';
import path from 'node:path';

function flatten(obj, prefix = '') {
  const out = {};
  if (!obj || typeof obj !== 'object') return out;
  for (const [key, value] of Object.entries(obj)) {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(out, flatten(value, nextPrefix));
    } else {
      out[nextPrefix] = value;
    }
  }
  return out;
}

const arKeys = new Set(Object.keys(flatten(ar)));
const soKeys = new Set(Object.keys(flatten(so)));

function walkFiles(dir) {
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name === 'dist') continue;
      out.push(...walkFiles(full));
    } else {
      if (!/\.(js|jsx|ts|tsx)$/.test(ent.name)) continue;
      out.push(full);
    }
  }
  return out;
}

function extractTKeys(sourceText) {
  const keys = new Set();
  const re = /\bt\(\s*(['"`])([^'"`]+)\1\s*(?:,|\))/g;
  let m;
  while ((m = re.exec(sourceText))) {
    keys.add(m[2]);
  }
  return keys;
}

const frontendSrcDir = path.resolve(process.cwd(), 'frontend', 'src');
const files = walkFiles(frontendSrcDir);

const usedKeys = new Set();
for (const file of files) {
  // Skip dictionaries themselves.
  if (file.includes(`${path.sep}i18n${path.sep}`)) continue;
  const txt = fs.readFileSync(file, 'utf8');
  for (const k of extractTKeys(txt)) usedKeys.add(k);
}

const usedKeyList = Array.from(usedKeys).sort();

const dynamicKeys = usedKeyList.filter((k) => k.includes('${'));
const staticKeys = usedKeyList.filter((k) => !k.includes('${'));

const missingAr = staticKeys.filter((k) => !arKeys.has(k));
const missingSo = staticKeys.filter((k) => !soKeys.has(k));

const missingArCommon = missingAr.filter((k) => k.startsWith('common.'));
const missingSoCommon = missingSo.filter((k) => k.startsWith('common.'));

function groupCounts(keys, depth = 1) {
  const counts = new Map();
  for (const k of keys) {
    const parts = String(k).split('.');
    const g = parts.slice(0, Math.max(1, depth)).join('.');
    counts.set(g, (counts.get(g) || 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([group, count]) => ({ group, count }));
}

function groupKeys(keys, depth = 1) {
  const grouped = new Map();
  for (const k of keys) {
    const parts = String(k).split('.');
    const g = parts.slice(0, Math.max(1, depth)).join('.');
    if (!grouped.has(g)) grouped.set(g, []);
    grouped.get(g).push(k);
  }
  // sort keys within each group for stable diffs
  const obj = {};
  for (const [g, arr] of Array.from(grouped.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
    obj[g] = arr.sort();
  }
  return obj;
}

const report = {
  usedKeyCount: usedKeyList.length,
  staticKeyCount: staticKeys.length,
  dynamicKeyCount: dynamicKeys.length,
  missingArCount: missingAr.length,
  missingSoCount: missingSo.length,
  missingArCommonCount: missingArCommon.length,
  missingSoCommonCount: missingSoCommon.length,
  missingArabicTopGroups: groupCounts(missingAr, 1).slice(0, 20),
  missingSomaliTopGroups: groupCounts(missingSo, 1).slice(0, 20),
  missingInArabicSample: missingAr.slice(0, 80),
  missingInSomaliSample: missingSo.slice(0, 80),
  missingInSomaliCommon: missingSoCommon,
  missingInSomaliAll: missingSo,
  missingSomaliByTopGroup: groupKeys(missingSo, 1),
  dynamicKeySamples: dynamicKeys.slice(0, 30),
};

console.log(JSON.stringify(report, null, 2));
