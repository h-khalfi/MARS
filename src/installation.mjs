import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { MARS_ROOT } from './paths.mjs';
import { ensureDir } from './utils.mjs';

export function localBinDir() {
  if (process.platform === 'win32') return null;
  return path.join(os.homedir(), '.local', 'bin');
}

export function launcherPath() {
  const dir = localBinDir();
  return dir ? path.join(dir, 'mars') : null;
}

export function marsExecutable() {
  return path.join(MARS_ROOT, 'bin', 'mars.mjs');
}

export function launcherStatus() {
  const launcher = launcherPath();
  const target = marsExecutable();
  if (!launcher) return { supported: false, exists: false, correct: false, launcher: null, target };
  if (!fs.existsSync(launcher)) return { supported: true, exists: false, correct: false, launcher, target };
  try {
    const stat = fs.lstatSync(launcher);
    if (!stat.isSymbolicLink()) return { supported: true, exists: true, correct: false, launcher, target, reason: 'not-symlink' };
    const resolved = path.resolve(path.dirname(launcher), fs.readlinkSync(launcher));
    return { supported: true, exists: true, correct: resolved === path.resolve(target), launcher, target, resolved };
  } catch (error) {
    return { supported: true, exists: true, correct: false, launcher, target, reason: error.message };
  }
}

export function ensureLauncher() {
  if (process.platform === 'win32') return { changed: false, supported: false, message: 'Installation ~/.local/bin non utilisée sous Windows.' };
  const dir = localBinDir();
  const launcher = launcherPath();
  const target = marsExecutable();
  ensureDir(dir);
  fs.chmodSync(target, 0o755);
  let changed = false;
  if (fs.existsSync(launcher) || (() => { try { fs.lstatSync(launcher); return true; } catch { return false; } })()) {
    const status = launcherStatus();
    if (status.correct) return { changed: false, supported: true, launcher, target };
    fs.rmSync(launcher, { force: true, recursive: false });
    changed = true;
  }
  fs.symlinkSync(target, launcher);
  return { changed: true, supported: true, launcher, target };
}

export function pathContainsLocalBin() {
  const dir = localBinDir();
  if (!dir) return true;
  const parts = String(process.env.PATH || '').split(path.delimiter).filter(Boolean).map(p => path.resolve(p));
  return parts.includes(path.resolve(dir));
}

export function shellRcHasLocalBin() {
  const rc = shellRcFile();
  if (!rc || !fs.existsSync(rc)) return false;
  const text = fs.readFileSync(rc, 'utf8');
  return text.includes('export PATH="$HOME/.local/bin:$PATH"');
}

export function shellRcFile() {
  if (process.platform === 'win32') return null;
  const shell = path.basename(process.env.SHELL || '');
  if (shell === 'zsh') return path.join(os.homedir(), '.zshrc');
  if (shell === 'bash') return path.join(os.homedir(), '.bashrc');
  return null;
}

export function ensureLocalBinInShellRc() {
  const rc = shellRcFile();
  const dir = localBinDir();
  if (!rc || !dir) return { changed: false, rc, supported: false };
  const marker = '# MARS CLI';
  const exportLine = 'export PATH="$HOME/.local/bin:$PATH"';
  const existing = fs.existsSync(rc) ? fs.readFileSync(rc, 'utf8') : '';
  if (existing.includes(exportLine)) return { changed: false, rc, supported: true };
  const prefix = existing.length && !existing.endsWith('\n') ? '\n' : '';
  fs.appendFileSync(rc, `${prefix}\n${marker}\n${exportLine}\n`);
  return { changed: true, rc, supported: true };
}

export function removeLauncher() {
  const status = launcherStatus();
  if (!status.supported || !status.exists) return { changed: false, ...status };
  if (!status.correct) return { changed: false, ...status, skipped: true };
  fs.unlinkSync(status.launcher);
  return { changed: true, ...status };
}
