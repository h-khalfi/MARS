import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { MARS_ROOT, THEMES_DIR } from './paths.mjs';
import { ensureDir } from './utils.mjs';

export function marpBin() {
  const exe = process.platform === 'win32' ? 'marp.cmd' : 'marp';
  return path.join(MARS_ROOT, 'node_modules', '.bin', exe);
}

export function requireMarp() {
  const p = marpBin();
  if (!fs.existsSync(p)) {
    throw new Error(`Marp CLI n'est pas installé dans MARS. Depuis ${MARS_ROOT}, lancez : npm install`);
  }
  return p;
}

export function runMarp(source, extraArgs = [], { cwd } = {}) {
  const marp = requireMarp();
  const args = [
    '--theme-set', THEMES_DIR,
    '--html',
    '--allow-local-files',
    ...extraArgs,
    '--', source,
  ];
  const r = spawnSync(marp, args, {
    cwd: cwd || path.dirname(source),
    stdio: 'inherit',
    encoding: 'utf8',
  });
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error(`Marp a terminé avec le code ${r.status}.`);
}

export function buildPdf(source, output) {
  ensureDir(path.dirname(output));
  runMarp(source, ['--pdf', '-o', output]);
}

export function preview(source) {
  runMarp(source, ['--watch', '--preview']);
}
