import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const MARS_ROOT = path.resolve(here, '..');
export const THEMES_DIR = path.join(MARS_ROOT, 'themes');
export const TEMPLATES_DIR = path.join(MARS_ROOT, 'templates');
export const PROFILES_DIR = path.join(MARS_ROOT, 'profiles');
export const STYLE_GUIDE = path.join(MARS_ROOT, 'style-guide', 'mars-guide.md');
export const SNIPPETS_FILE = path.join(MARS_ROOT, '.vscode', 'mars.code-snippets');
export const VERSION_FILE = path.join(MARS_ROOT, 'VERSION');

export function configHome() {
  if (process.env.MARS_CONFIG_HOME) return path.resolve(process.env.MARS_CONFIG_HOME);
  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'mars');
  }
  return path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), 'mars');
}

export function expandHome(input) {
  if (!input) return input;
  if (input === '~') return os.homedir();
  if (input.startsWith('~/')) return path.join(os.homedir(), input.slice(2));
  return input;
}
