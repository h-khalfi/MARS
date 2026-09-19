import fs from 'node:fs';
import path from 'node:path';
import { configHome, PROFILES_DIR } from './paths.mjs';
import { ensureDir } from './utils.mjs';
import { parseFlatYaml, writeFlatYaml } from './yaml.mjs';

export const DEFAULT_USER_CONFIG = {
  default_profile: 'ensak-usms',
  default_author: 'Pr. Hamza Khalfi',
  default_language: 'fr',
};

export function userConfigPath() { return path.join(configHome(), 'config.yml'); }
export function recentPath() { return path.join(configHome(), 'recent.json'); }
export function userProfilesDir() { return path.join(configHome(), 'profiles'); }

export function ensureConfigHome() {
  ensureDir(configHome());
  ensureDir(userProfilesDir());
}

export function loadUserConfig() {
  ensureConfigHome();
  const file = userConfigPath();
  if (!fs.existsSync(file)) return { ...DEFAULT_USER_CONFIG };
  return { ...DEFAULT_USER_CONFIG, ...parseFlatYaml(file) };
}

export function initUserConfig({ overwrite = false } = {}) {
  ensureConfigHome();
  const file = userConfigPath();
  if (!fs.existsSync(file) || overwrite) writeFlatYaml(file, DEFAULT_USER_CONFIG, 'MARS user configuration');
  return file;
}

export function loadProfile(id) {
  const userFile = path.join(userProfilesDir(), id, 'profile.yml');
  const builtInFile = path.join(PROFILES_DIR, id, 'profile.yml');
  const file = fs.existsSync(userFile) ? userFile : builtInFile;
  if (!fs.existsSync(file)) throw new Error(`MARS profile not found: ${id}`);
  return { ...parseFlatYaml(file), __dir: path.dirname(file), __file: file };
}

export function listProfiles() {
  const ids = new Set();
  for (const base of [PROFILES_DIR, userProfilesDir()]) {
    if (!fs.existsSync(base)) continue;
    for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
      if (entry.isDirectory() && fs.existsSync(path.join(base, entry.name, 'profile.yml'))) ids.add(entry.name);
    }
  }
  return [...ids].sort();
}

export function loadRecent() {
  ensureConfigHome();
  try {
    const data = JSON.parse(fs.readFileSync(recentPath(), 'utf8'));
    const items = Array.isArray(data.stacks) ? data.stacks : Array.isArray(data.courses) ? data.courses : [];
    return items;
  } catch { return []; }
}

export function saveRecent(stacks) {
  ensureConfigHome();
  fs.writeFileSync(recentPath(), JSON.stringify({ stacks: stacks.slice(0, 12) }, null, 2) + '\n');
}

export function touchRecent(stackRoot) {
  const root = path.resolve(stackRoot);
  const stacks = [root, ...loadRecent().filter(p => path.resolve(p) !== root && fs.existsSync(p))];
  saveRecent(stacks);
}
