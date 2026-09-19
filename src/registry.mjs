import fs from 'node:fs';
import path from 'node:path';
import { configHome } from './paths.mjs';
import { ensureDir } from './utils.mjs';
import { stackInfo, STACK_FILE } from './stack.mjs';
import { parseFlatYaml } from './yaml.mjs';
import { normalizeCourseConfig } from './course-config.mjs';

function registryFile() { return path.join(configHome(), 'registry.json'); }

function emptyRegistry() { return { schema: 1, parked: [], links: {} }; }

export function readRegistry() {
  ensureDir(configHome());
  try {
    const data = JSON.parse(fs.readFileSync(registryFile(), 'utf8'));
    return {
      schema: 1,
      parked: Array.isArray(data.parked) ? data.parked.map(p => path.resolve(p)) : [],
      links: data.links && typeof data.links === 'object' ? data.links : {},
    };
  } catch { return emptyRegistry(); }
}

export function writeRegistry(registry) {
  ensureDir(configHome());
  const data = {
    schema: 1,
    parked: [...new Set((registry.parked || []).map(p => path.resolve(p)))],
    links: registry.links || {},
  };
  fs.writeFileSync(registryFile(), `${JSON.stringify(data, null, 2)}\n`);
  return data;
}

export function park(root = process.cwd()) {
  const p = path.resolve(root);
  if (!fs.existsSync(p) || !fs.statSync(p).isDirectory()) throw new Error(`Directory not found: ${p}`);
  const r = readRegistry();
  if (!r.parked.some(x => path.resolve(x) === p)) r.parked.push(p);
  writeRegistry(r);
  return p;
}

export function unpark(root = process.cwd()) {
  const p = path.resolve(root);
  const r = readRegistry();
  const before = r.parked.length;
  r.parked = r.parked.filter(x => path.resolve(x) !== p);
  writeRegistry(r);
  return { root: p, removed: before !== r.parked.length };
}

function infoForRoot(root) {
  if (fs.existsSync(path.join(root, STACK_FILE))) return { root, info: stackInfo(root), legacy: false };
  const legacy = path.join(root, 'course.yml');
  if (fs.existsSync(legacy)) return { root, info: normalizeCourseConfig(parseFlatYaml(legacy), root), legacy: true };
  return null;
}

export function discoverParkedStacks() {
  const r = readRegistry();
  const out = [];
  const seen = new Set();
  const add = item => {
    if (!item) return;
    const resolved = path.resolve(item.root);
    if (seen.has(resolved)) return;
    seen.add(resolved);
    out.push({ ...item, root: resolved });
  };
  for (const parked of r.parked) {
    if (!fs.existsSync(parked) || !fs.statSync(parked).isDirectory()) continue;
    add(infoForRoot(parked));
    for (const entry of fs.readdirSync(parked, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
      add(infoForRoot(path.join(parked, entry.name)));
    }
  }
  for (const [alias, target] of Object.entries(r.links)) {
    const item = infoForRoot(path.resolve(target));
    if (item) add({ ...item, alias });
  }
  return out.sort((a, b) => String(a.info.title || a.info.name || path.basename(a.root)).localeCompare(String(b.info.title || b.info.name || path.basename(b.root))));
}

export function linkStack(root = process.cwd(), alias = null) {
  const p = path.resolve(root);
  const item = infoForRoot(p);
  if (!item) throw new Error(`Not a MARS stack: ${p}`);
  const name = alias || item.info.slug || path.basename(p);
  const r = readRegistry();
  r.links[name] = p;
  writeRegistry(r);
  return { alias: name, root: p };
}

export function unlinkStack(aliasOrPath) {
  const r = readRegistry();
  let removed = null;
  if (r.links[aliasOrPath]) {
    removed = { alias: aliasOrPath, root: r.links[aliasOrPath] };
    delete r.links[aliasOrPath];
  } else {
    const p = path.resolve(aliasOrPath || process.cwd());
    for (const [alias, target] of Object.entries(r.links)) {
      if (path.resolve(target) === p) { removed = { alias, root: target }; delete r.links[alias]; break; }
    }
  }
  writeRegistry(r);
  return removed;
}

export function findRegisteredStack(selector) {
  if (!selector) return null;
  const needle = String(selector).toLowerCase();
  return discoverParkedStacks().find(item => {
    const title = item.info.title || item.info.name || '';
    const slug = item.info.slug || path.basename(item.root);
    return String(item.alias || '').toLowerCase() === needle || String(slug).toLowerCase() === needle || path.basename(item.root).toLowerCase() === needle || String(title).toLowerCase() === needle;
  }) || null;
}
