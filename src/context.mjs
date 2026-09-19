import fs from 'node:fs';
import path from 'node:path';
import { parseFlatYaml } from './yaml.mjs';
import { stackInfo, brickInfo, deckInfo, STACK_FILE, BRICK_FILE, DECK_FILE } from './stack.mjs';
import { normalizeCourseConfig } from './course-config.mjs';

export function findUp(filename, start = process.cwd()) {
  let current = fs.existsSync(start) && fs.statSync(start).isFile() ? path.dirname(start) : path.resolve(start);
  while (true) {
    const candidate = path.join(current, filename);
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

function legacyCourseInfo(root) {
  return normalizeCourseConfig(parseFlatYaml(path.join(root, 'course.yml')), root);
}

export function detectContext(start = process.cwd()) {
  const startPath = path.resolve(start);
  let stackFile = findUp(STACK_FILE, startPath);
  const legacyFile = stackFile ? null : findUp('course.yml', startPath);
  const stackRoot = stackFile ? path.dirname(stackFile) : legacyFile ? path.dirname(legacyFile) : null;
  const legacy = Boolean(!stackFile && legacyFile);

  let workspaceFile = findUp('mars-workspace.yml', startPath);
  if (!workspaceFile && stackRoot) workspaceFile = findUp('mars-workspace.yml', path.dirname(stackRoot));
  const workspaceRoot = workspaceFile ? path.dirname(workspaceFile) : null;

  let brick = null;
  let deck = null;
  if (stackRoot && !legacy) {
    const brickFile = findUp(BRICK_FILE, startPath);
    if (brickFile && path.dirname(brickFile) !== stackRoot) {
      const brickRoot = path.dirname(brickFile);
      const rel = path.relative(stackRoot, brickRoot);
      if (!rel.startsWith('..') && !path.isAbsolute(rel)) brick = { root: brickRoot, info: brickInfo(brickRoot), name: path.basename(brickRoot) };
    }
    const sourceCandidate = fs.existsSync(startPath) && fs.statSync(startPath).isFile() ? startPath : null;
    let deckRoot = null;
    if (sourceCandidate && path.basename(sourceCandidate) === 'slides.md') deckRoot = path.dirname(sourceCandidate);
    else {
      const deckFile = findUp(DECK_FILE, startPath);
      if (deckFile) deckRoot = path.dirname(deckFile);
      else {
        let current = fs.existsSync(startPath) && fs.statSync(startPath).isFile() ? path.dirname(startPath) : startPath;
        while (stackRoot && current.startsWith(stackRoot)) {
          if (fs.existsSync(path.join(current, 'slides.md'))) { deckRoot = current; break; }
          if (current === stackRoot) break;
          current = path.dirname(current);
        }
      }
    }
    if (deckRoot && fs.existsSync(path.join(deckRoot, 'slides.md'))) {
      const rel = path.relative(stackRoot, deckRoot);
      if (!rel.startsWith('..') && !path.isAbsolute(rel)) {
        const parent = path.dirname(deckRoot);
        if (!brick && fs.existsSync(path.join(parent, BRICK_FILE))) brick = { root: parent, info: brickInfo(parent), name: path.basename(parent) };
        deck = { root: deckRoot, info: deckInfo(deckRoot), name: path.basename(deckRoot), source: path.join(deckRoot, 'slides.md') };
      }
    }
  }

  return {
    cwd: startPath,
    stackRoot,
    stack: stackRoot ? (legacy ? legacyCourseInfo(stackRoot) : stackInfo(stackRoot)) : null,
    brick,
    deck,
    legacy,
    legacyFile,
    workspaceRoot,
    workspace: workspaceFile ? parseFlatYaml(workspaceFile) : null,
    // compatibility aliases during 0.7 migration
    courseRoot: stackRoot,
    course: stackRoot ? (legacy ? legacyCourseInfo(stackRoot) : stackInfo(stackRoot)) : null,
    document: deck ? { type: brick?.info?.kind || 'deck', name: deck.name, root: deck.root, source: deck.source } : null,
  };
}

export function listWorkspaceStacks(workspaceRoot) {
  if (!workspaceRoot || !fs.existsSync(workspaceRoot)) return [];
  const out = [];
  for (const entry of fs.readdirSync(workspaceRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
    const root = path.join(workspaceRoot, entry.name);
    if (fs.existsSync(path.join(root, STACK_FILE))) out.push({ root, info: stackInfo(root), legacy: false });
    else if (fs.existsSync(path.join(root, 'course.yml'))) out.push({ root, info: legacyCourseInfo(root), legacy: true });
  }
  return out.sort((a, b) => String(a.info.title || a.info.name || path.basename(a.root)).localeCompare(String(b.info.title || b.info.name || path.basename(b.root))));
}

export function findStacksUnder(dir) {
  if (!dir || !fs.existsSync(dir)) return [];
  const ctx = detectContext(dir);
  if (ctx.stackRoot) return [{ root: ctx.stackRoot, info: ctx.stack, legacy: ctx.legacy }];
  if (ctx.workspaceRoot) return listWorkspaceStacks(ctx.workspaceRoot);
  const direct = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
    const root = path.join(dir, entry.name);
    if (fs.existsSync(path.join(root, STACK_FILE))) direct.push({ root, info: stackInfo(root), legacy: false });
    else if (fs.existsSync(path.join(root, 'course.yml'))) direct.push({ root, info: legacyCourseInfo(root), legacy: true });
  }
  return direct;
}

// 0.6 compatibility exports
export const listWorkspaceCourses = listWorkspaceStacks;
export const findCoursesUnder = findStacksUnder;
