import fs from 'node:fs';
import path from 'node:path';
import { ensureDir } from './utils.mjs';
import { listBricks, allDecks } from './stack.mjs';

function removeIfExists(target, removed) {
  if (!fs.existsSync(target)) return;
  fs.rmSync(target, { recursive: true, force: true });
  removed.push(target);
}

function clearDirectory(dir, removed) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir)) removeIfExists(path.join(dir, entry), removed);
}

export function cleanStack(stackRoot, { all = false } = {}) {
  const removed = [];
  const dist = path.join(stackRoot, 'dist');
  clearDirectory(dist, removed);
  ensureDir(dist);
  for (const brick of listBricks(stackRoot)) ensureDir(path.join(dist, brick.info.slug || brick.name));

  for (const rel of ['.mars/cache', '.mars/preview', '.mars/tmp']) removeIfExists(path.join(stackRoot, rel), removed);

  if (all) {
    clearDirectory(path.join(stackRoot, 'figures', 'generated'), removed);
    ensureDir(path.join(stackRoot, 'figures', 'generated'));
    for (const deck of allDecks(stackRoot)) {
      const generated = path.join(deck.root, 'figures', 'generated');
      clearDirectory(generated, removed);
      if (fs.existsSync(path.dirname(generated))) ensureDir(generated);
    }
  }
  return { removed, all };
}

export const cleanCourse = cleanStack;
