import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Contracts
import { MODULE_PERMISSIONS } from '../frontend/src/shared/auth/permissionContract.js';
import { PERMISSION_CONTRACT } from '../backend/utils/permissions.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const FRONTEND_ROOT = path.join(repoRoot, 'frontend', 'src');
const BACKEND_ROOT = path.join(repoRoot, 'backend');

// Alias maps (legacy-compat). We should be extremely conservative about removing
// modules/actions that participate in alias fallback, because old staff accounts
// may still rely on those keys.
const ALIAS_SOURCES = [
  path.join(BACKEND_ROOT, 'middleware', 'checkPermission.js'),
  path.join(FRONTEND_ROOT, 'auth', 'AuthContext.jsx'),
];

const readText = (fp) => {
  try {
    return fs.readFileSync(fp, 'utf8');
  } catch {
    return '';
  }
};

const parseAliasModules = () => {
  const keys = new Set();
  const values = new Set();

  // Match: someKey: Object.freeze(['a','b'])
  const reEntry = /([A-Za-z0-9_]+)\s*:\s*Object\.freeze\(\s*\[([^\]]*)\]\s*\)/g;
  const reQuoted = /['"`]([^'"`]+)['"`]/g;

  for (const fp of ALIAS_SOURCES) {
    const txt = readText(fp);
    if (!txt) continue;
    for (const m of txt.matchAll(reEntry)) {
      const key = String(m[1] || '').trim();
      if (key) keys.add(key);

      const listSrc = m[2] || '';
      for (const q of listSrc.matchAll(reQuoted)) {
        const v = String(q[1] || '').trim();
        if (v) values.add(v);
      }
    }
  }

  return { keys, values, protected: new Set([...keys, ...values]) };
};

const aliasInfo = parseAliasModules();
const protectedByAlias = aliasInfo.protected;

const isCodeFile = (p) =>
  /\.(js|jsx|mjs|cjs|ts|tsx)$/.test(p) && !p.includes(`${path.sep}node_modules${path.sep}`);

const walk = (dir) => {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    let entries = [];
    try {
      entries = fs.readdirSync(cur, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const fp = path.join(cur, e.name);
      if (e.isDirectory()) {
        if (e.name === 'node_modules' || e.name === 'dist' || e.name === 'build') continue;
        stack.push(fp);
      } else if (e.isFile() && isCodeFile(fp)) {
        out.push(fp);
      }
    }
  }
  return out;
};

const files = [
  ...walk(FRONTEND_ROOT),
  ...walk(path.join(BACKEND_ROOT, 'routes')),
  ...walk(path.join(BACKEND_ROOT, 'controllers')),
  ...walk(path.join(BACKEND_ROOT, 'middleware')),
  ...walk(path.join(BACKEND_ROOT, 'services')),
  ...walk(path.join(BACKEND_ROOT, 'utils')),
];

const usage = {
  pairs: new Map(), // module -> Set(actions)
  modulesMentioned: new Set(),
  moduleAnyBroad: new Set(), // checkModuleAnyPermission('x') with no explicit action list
};

const addPair = (moduleName, actionName, meta = {}) => {
  if (!moduleName || !actionName) return;
  const mod = String(moduleName);
  const act = String(actionName);

  usage.modulesMentioned.add(mod);

  if (!usage.pairs.has(mod)) usage.pairs.set(mod, new Set());
  usage.pairs.get(mod).add(act);

  if (meta.moduleAnyBroad) usage.moduleAnyBroad.add(mod);
};

const addModuleMention = (moduleName) => {
  if (!moduleName) return;
  usage.modulesMentioned.add(String(moduleName));
};

// Regex patterns (best-effort, literals only)
const reHasPermission = /hasPermission\(\s*['"`]([^'"`]+)['"`]\s*,\s*['"`]([^'"`]+)['"`]\s*\)/g;
// Common frontend helper pattern: hasAny('module', ['view','add',...])
const reHasAny = /\bhasAny\(\s*['"`]([^'"`]+)['"`]\s*,\s*(\[[^\)]*\])\s*\)/g;
const reCheckPermission = /checkPermission\(\s*['"`]([^'"`]+)['"`]\s*,\s*['"`]([^'"`]+)['"`]\s*\)/g;
const reObjReq = /\{\s*module\s*:\s*['"`]([^'"`]+)['"`]\s*,\s*action\s*:\s*['"`]([^'"`]+)['"`]\s*\}/g;
const reCheckModuleAny = /checkModuleAnyPermission\(\s*['"`]([^'"`]+)['"`]\s*(?:,\s*(\[[^\)]*\]))?\s*\)/g;

// Also track raw string mentions of module names in code (helps dynamic checks)
const allModules = Array.from(
  new Set([...Object.keys(MODULE_PERMISSIONS || {}), ...Object.keys(PERMISSION_CONTRACT || {})])
);

for (const fp of files) {
  let txt = '';
  try {
    txt = fs.readFileSync(fp, 'utf8');
  } catch {
    continue;
  }

  // skip the contracts themselves to avoid self-references skewing usage
  const norm = fp.split(path.sep).join('/');
  if (norm.endsWith('frontend/src/shared/auth/permissionContract.js')) continue;
  if (norm.endsWith('backend/utils/permissions.js')) continue;

  // Literal module mentions
  for (const mod of allModules) {
    if (txt.includes(`'${mod}'`) || txt.includes(`\"${mod}\"`) || txt.includes('`' + mod + '`')) {
      addModuleMention(mod);
    }
  }

  // hasPermission('module','action')
  for (const m of txt.matchAll(reHasPermission)) {
    addPair(m[1], m[2]);
  }

  // hasAny('module', ['a','b'])
  for (const m of txt.matchAll(reHasAny)) {
    const mod = m[1];
    const listSrc = m[2] || '';
    const actions = [];
    const reQuoted = /['"`]([^'"`]+)['"`]/g;
    for (const q of listSrc.matchAll(reQuoted)) actions.push(q[1]);
    if (!actions.length) {
      addPair(mod, '__MODULE_ANY__', { moduleAnyBroad: true });
      continue;
    }
    for (const act of actions) addPair(mod, act);
  }

  // checkPermission('module','action')
  for (const m of txt.matchAll(reCheckPermission)) {
    addPair(m[1], m[2]);
  }

  // { module: 'x', action: 'y' }
  for (const m of txt.matchAll(reObjReq)) {
    addPair(m[1], m[2]);
  }

  // checkModuleAnyPermission('module', [...])
  for (const m of txt.matchAll(reCheckModuleAny)) {
    const mod = m[1];
    const secondArg = m[2];
    if (!secondArg) {
      addPair(mod, '__MODULE_ANY__', { moduleAnyBroad: true });
      continue;
    }
    // Extract quoted action literals from the array argument
    const actions = [];
    const reQuoted = /['"`]([^'"`]+)['"`]/g;
    for (const q of secondArg.matchAll(reQuoted)) actions.push(q[1]);
    if (!actions.length) {
      addPair(mod, '__MODULE_ANY__', { moduleAnyBroad: true });
      continue;
    }
    for (const act of actions) addPair(mod, act);
  }
}

const contracts = {
  frontend: MODULE_PERMISSIONS,
  backend: PERMISSION_CONTRACT,
};

const mismatch = {
  onlyFrontendModules: [],
  onlyBackendModules: [],
  moduleActionDiffs: [],
  duplicatesInModule: [],
};

const frontendModules = new Set(Object.keys(MODULE_PERMISSIONS || {}));
const backendModules = new Set(Object.keys(PERMISSION_CONTRACT || {}));

for (const m of frontendModules) if (!backendModules.has(m)) mismatch.onlyFrontendModules.push(m);
for (const m of backendModules) if (!frontendModules.has(m)) mismatch.onlyBackendModules.push(m);

for (const mod of [...frontendModules].sort()) {
  const f = MODULE_PERMISSIONS?.[mod] || [];
  const b = PERMISSION_CONTRACT?.[mod] || [];

  // duplicates
  const seen = new Set();
  const dups = new Set();
  for (const a of f) {
    if (seen.has(a)) dups.add(a);
    seen.add(a);
  }
  if (dups.size) mismatch.duplicatesInModule.push({ module: mod, duplicates: Array.from(dups) });

  const fs = new Set(f);
  const bs = new Set(b);
  const onlyF = [...fs].filter((x) => !bs.has(x));
  const onlyB = [...bs].filter((x) => !fs.has(x));
  if (onlyF.length || onlyB.length) mismatch.moduleActionDiffs.push({ module: mod, onlyFrontend: onlyF, onlyBackend: onlyB });
}

const unused = {
  modules: [],
  actions: [],
};

for (const mod of [...frontendModules].sort()) {
  const actions = MODULE_PERMISSIONS[mod] || [];
  const usedActions = usage.pairs.get(mod) || new Set();
  const mentioned = usage.modulesMentioned.has(mod);

  if (!mentioned && usedActions.size === 0) {
    unused.modules.push(mod);
  }

  for (const a of actions) {
    if (a === 'full') continue;
    if (a === 'print' && mod === 'financePrint') {
      // keep; this is the canonical print entry
    }
    // Consider action used if explicitly found in literal checks (including route guards arrays).
    if (!usedActions.has(a)) {
      // If moduleAnyBroad is used anywhere, treat actions as "potentially meaningful" and do not mark unused.
      if (usage.moduleAnyBroad.has(mod)) continue;
      // If module participates in alias fallback, be conservative and do not
      // recommend removing actions (legacy staff may still rely on them).
      if (protectedByAlias.has(mod)) continue;
      unused.actions.push({ module: mod, action: a });
    }
  }
}

const unknownUsed = {
  modules: [],
  actions: [],
};

for (const [mod, acts] of usage.pairs.entries()) {
  if (mod === '__MODULE_ANY__') continue;
  if (!frontendModules.has(mod) || !backendModules.has(mod)) {
    unknownUsed.modules.push(mod);
    continue;
  }
  const contractActs = new Set(MODULE_PERMISSIONS[mod] || []);
  for (const a of acts) {
    if (a === '__MODULE_ANY__') continue;
    if (!contractActs.has(a)) unknownUsed.actions.push({ module: mod, action: a });
  }
}

const report = {
  summary: {
    contractModules: frontendModules.size,
    scannedFiles: files.length,
    usedModules: usage.modulesMentioned.size,
    usedPairsModules: usage.pairs.size,
    moduleAnyBroadCount: usage.moduleAnyBroad.size,
    protectedModulesByAlias: protectedByAlias.size,
  },
  alias: {
    keys: Array.from(aliasInfo.keys).sort(),
    values: Array.from(aliasInfo.values).sort(),
  },
  mismatch,
  unknownUsed,
  unused,
};

console.log(JSON.stringify(report, null, 2));
