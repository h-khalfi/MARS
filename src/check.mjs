import fs from 'node:fs';
import path from 'node:path';
import { stackInfo, listBricks, listDecks, deckPaths } from './stack.mjs';
import { loadProfile } from './config.mjs';
import { isPathWithin } from './utils.mjs';
import { figureSummary } from './figures.mjs';
import { lockCompatibility, readMarsLock, DESIGN_API, CONTENT_MODEL } from './metadata.mjs';

function assetRefs(markdown) {
  const refs = [];
  const md = /!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  const html = /<(?:img|source)[^>]+(?:src|href)=["']([^"']+)["']/gi;
  let m;
  while ((m = md.exec(markdown))) refs.push(m[1]);
  while ((m = html.exec(markdown))) refs.push(m[1]);
  return [...new Set(refs)];
}
function localRef(ref) { return ref && !/^(?:https?:|data:|file:|#)/i.test(ref); }
function stripSuffix(ref) { return ref.split('#')[0].split('?')[0]; }
function hasFrontMatter(md) {
  if (!md.startsWith('---')) return false;
  const end = md.indexOf('\n---', 3);
  if (end < 0) return false;
  const fm = md.slice(0, end + 4);
  return /\bmarp:\s*true\b/.test(fm) && /\btheme:\s*[^\s]+/.test(fm) && /\bmath:\s*mathjax\b/.test(fm);
}
function issue(level, message, detail = '') { return { level, message, detail }; }

export function checkStack(stackRoot) {
  const issues = [];
  const info = stackInfo(stackRoot);
  if (!info.title) issues.push(issue('error', 'mars.yml: stack title missing', 'stack.title'));
  if (!info.short_title) issues.push(issue('warning', 'mars.yml: short title missing', 'stack.short_title'));
  if (!info.language) issues.push(issue('warning', 'mars.yml: language missing', 'stack.language'));

  try {
    const profile = loadProfile(info.profile || 'ensak-usms');
    const branding = path.join(stackRoot, 'assets', 'branding');
    for (const logo of [profile.primary_logo, profile.secondary_logo].filter(Boolean)) {
      const target = path.join(branding, path.basename(logo));
      if (!fs.existsSync(target)) issues.push(issue('error', `Branding missing: ${path.basename(logo)}`, path.relative(stackRoot, target)));
    }
  } catch (e) {
    issues.push(issue('error', 'Institution profile not found', e.message));
  }

  for (const theme of ['marpx.css', 'gödel.css', 'mars.css']) {
    const p = path.join(stackRoot, '.mars', 'themes', theme);
    if (!fs.existsSync(p)) issues.push(issue('warning', `Editor theme not synchronized: ${theme}`, 'Run: mars sync'));
  }

  const compat = lockCompatibility(stackRoot);
  const lock = readMarsLock(stackRoot);
  if (compat.missing) issues.push(issue('warning', 'mars.lock missing', 'Run: mars sync'));
  else if (!compat.ok) issues.push(issue('warning', `MARS compatibility: stack ${compat.locked}, tool ${compat.current}`, 'Run: mars migrate or mars sync.'));
  if (lock['design.api'] && String(lock['design.api']) !== String(DESIGN_API)) issues.push(issue('warning', `Design API differs: stack ${lock['design.api']}, tool ${DESIGN_API}`));
  if (lock['content.model'] && String(lock['content.model']) !== CONTENT_MODEL) issues.push(issue('warning', `Content model differs: ${lock['content.model']}`, CONTENT_MODEL));

  const bricks = listBricks(stackRoot);
  if (!bricks.length) issues.push(issue('error', 'No Brick found', 'Create one with: mars make:brick'));
  const outputOwners = new Map();
  const brickSlugs = new Set();

  for (const brick of bricks) {
    if (!brick.info.title) issues.push(issue('error', `Brick ${brick.name}: title missing`, 'brick.title'));
    if (!brick.info.slug) issues.push(issue('error', `Brick ${brick.name}: slug missing`, 'brick.slug'));
    if (brickSlugs.has(brick.info.slug)) issues.push(issue('error', `Duplicate Brick slug: ${brick.info.slug}`));
    brickSlugs.add(brick.info.slug);

    const seenNumbers = new Map();
    for (const deck of listDecks(brick.root)) {
      const number = String(deck.info.number || '');
      if (!/^\d{2}$/.test(number) || Number(number) < 1 || Number(number) > 99) issues.push(issue('error', `Deck ${brick.name}/${deck.name}: invalid number`, 'Use 01 to 99.'));
      if (seenNumbers.has(number)) issues.push(issue('error', `Brick ${brick.name}: duplicate deck number ${number}`, `${seenNumbers.get(number)} and ${deck.name}`));
      seenNumbers.set(number, deck.name);

      let paths;
      try { paths = deckPaths(stackRoot, brick.root, deck.root); }
      catch (e) { issues.push(issue('error', `Deck ${brick.name}/${deck.name}: invalid output path`, e.message)); continue; }
      const owner = outputOwners.get(paths.output);
      if (owner) issues.push(issue('error', `PDF output collision: ${path.basename(paths.output)}`, `${owner} and ${brick.name}/${deck.name}`));
      else outputOwners.set(paths.output, `${brick.name}/${deck.name}`);

      const md = fs.readFileSync(paths.source, 'utf8');
      if (!hasFrontMatter(md)) issues.push(issue('error', `Deck ${brick.name}/${deck.name}: invalid Marp front matter`, 'Required: marp:true, theme, math:mathjax.'));
      for (const ref of assetRefs(md).filter(localRef)) {
        const resolved = path.resolve(path.dirname(paths.source), stripSuffix(ref));
        if (!fs.existsSync(resolved)) issues.push(issue('error', `Deck ${brick.name}/${deck.name}: asset not found`, ref));
        else if (!isPathWithin(stackRoot, resolved)) issues.push(issue('warning', `Deck ${brick.name}/${deck.name}: external asset`, ref));
      }
    }
  }

  const figs = figureSummary(stackRoot, { all: true });
  for (const f of figs.jobs.filter(j => j.stale)) issues.push(issue('warning', `Figure is stale: ${path.relative(stackRoot, f.job.script)}`, f.reason));

  const errors = issues.filter(i => i.level === 'error').length;
  const warnings = issues.filter(i => i.level === 'warning').length;
  return { ok: errors === 0, errors, warnings, issues, figures: figs, info, lock, bricks: bricks.length };
}

export const checkCourse = checkStack;
