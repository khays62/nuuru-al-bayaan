import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { builtinModules } from "node:module";

const root = process.cwd();
const ignoreDirs = new Set(["node_modules", "dist", "build", ".git"]);

function walk(dir) {
  const out = [];
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    if (ignoreDirs.has(ent.name)) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(p));
    else if (ent.isFile() && (p.endsWith(".js") || p.endsWith(".mjs") || p.endsWith(".cjs"))) {
      out.push(p);
    }
  }
  return out;
}

function topLevel(spec) {
  if (!spec) return null;
  if (spec.startsWith("node:")) return null;
  if (spec.startsWith(".") || spec.startsWith("/")) return null;
  if (builtinModules.includes(spec)) return null;
  if (spec.startsWith("@")) {
    const parts = spec.split("/");
    return parts.length >= 2 ? parts.slice(0, 2).join("/") : spec;
  }
  return spec.split("/")[0];
}

const files = walk(root);
const pkgs = new Set();

const importFromRe = /\bfrom\s+["']([^"']+)["']/g;
const dynImportRe = /\bimport\(\s*["']([^"']+)["']\s*\)/g;
const requireRe = /\brequire\(\s*["']([^"']+)["']\s*\)/g;

for (const f of files) {
  const txt = readFileSync(f, "utf8");
  for (const re of [importFromRe, dynImportRe, requireRe]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(txt))) {
      const pkg = topLevel(m[1]);
      if (pkg) pkgs.add(pkg);
    }
  }
}

const pkgJson = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
const declared = new Set([
  ...Object.keys(pkgJson.dependencies || {}),
  ...Object.keys(pkgJson.devDependencies || {}),
]);
const missing = [...pkgs].filter((p) => !declared.has(p)).sort();

console.log("Found external imports:");
console.log([...pkgs].sort().join(", ") || "(none)");
console.log("\nMissing from package.json:");
console.log(missing.join(", ") || "(none)");
