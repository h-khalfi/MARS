import fs from 'node:fs';
import path from 'node:path';
import { ensureDir } from './utils.mjs';
import { BRICK_FILE } from './stack.mjs';

export function statePath(stackRoot) { return path.join(stackRoot, '.mars', 'state.json'); }

export function readStackState(stackRoot) {
  try {
    const data = JSON.parse(fs.readFileSync(statePath(stackRoot), 'utf8'));
    return data && typeof data === 'object' ? data : {};
  } catch { return {}; }
}

export function writeStackState(stackRoot, state) {
  ensureDir(path.join(stackRoot, '.mars'));
  fs.writeFileSync(statePath(stackRoot), `${JSON.stringify(state, null, 2)}\n`);
  return state;
}

export function rememberDeck(stackRoot, deck) {
  if (!stackRoot || !deck) return null;
  const source = deck.source || (deck.root ? path.join(deck.root, 'slides.md') : null);
  if (!source) return null;
  const state = readStackState(stackRoot);
  state.last_deck = path.relative(stackRoot, source);
  state.updated_at = new Date().toISOString();
  writeStackState(stackRoot, state);
  return source;
}

export function lastDeck(stackRoot) {
  const state = readStackState(stackRoot);
  const rel = state.last_deck || state.last_document;
  if (!rel) return null;
  const source = path.resolve(stackRoot, rel);
  if (!fs.existsSync(source) || path.basename(source) !== 'slides.md') return null;
  const root = path.dirname(source);
  const brickRoot = path.dirname(root);
  if (!fs.existsSync(path.join(brickRoot, BRICK_FILE))) return null;
  return { root, source, brickRoot, name: path.basename(root) };
}

export function figureExecutionTrusted(stackRoot) {
  return readStackState(stackRoot).trusted_python_figures === true;
}

export function setFigureExecutionTrusted(stackRoot, trusted = true) {
  const state = readStackState(stackRoot);
  state.trusted_python_figures = Boolean(trusted);
  state.updated_at = new Date().toISOString();
  writeStackState(stackRoot, state);
  return state.trusted_python_figures;
}

// Compatibility aliases for 0.6 extensions.
export const readCourseState = readStackState;
export const writeCourseState = writeStackState;
export const rememberDocument = rememberDeck;
export const lastDocument = lastDeck;
