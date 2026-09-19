import fs from 'node:fs';
import path from 'node:path';
import { parseFlatYaml, writeFlatYaml } from './yaml.mjs';
import { loadProfile, loadUserConfig, touchRecent } from './config.mjs';
import { TEMPLATES_DIR, THEMES_DIR, SNIPPETS_FILE } from './paths.mjs';
import { ensureDir, inferAcademicYear, slugify, copyFileIfExists, normalizeShortTitle, normalizeDocumentNumber, safePdfFilename, safePathWithin } from './utils.mjs';
import { normalizeStackConfig, structuredStackConfig, normalizeBrickConfig, structuredBrickConfig, normalizeDeckConfig, structuredDeckConfig, splitAuthor } from './stack-config.mjs';
import { normalizeCourseConfig } from './course-config.mjs';
import { presetById, presetBricks } from './presets.mjs';
import { writeMarsLock } from './metadata.mjs';

export const STACK_FILE = 'mars.yml';
export const BRICK_FILE = 'brick.yml';
export const DECK_FILE = 'deck.yml';

export function stackInfo(stackRoot) {
  return normalizeStackConfig(parseFlatYaml(path.join(stackRoot, STACK_FILE)), stackRoot);
}

export function writeStackConfig(stackRoot, info) {
  writeFlatYaml(path.join(stackRoot, STACK_FILE), structuredStackConfig(info), 'MARS stack configuration');
}

export function brickInfo(brickRoot) {
  return normalizeBrickConfig(parseFlatYaml(path.join(brickRoot, BRICK_FILE)), brickRoot);
}

export function writeBrickConfig(brickRoot, info) {
  writeFlatYaml(path.join(brickRoot, BRICK_FILE), structuredBrickConfig(info), 'MARS brick configuration');
}

export function deckInfo(deckRoot) {
  const file = path.join(deckRoot, DECK_FILE);
  if (fs.existsSync(file)) return normalizeDeckConfig(parseFlatYaml(file), deckRoot);
  const name = path.basename(deckRoot);
  const m = name.match(/^(\d{1,2})-(.+)$/);
  return normalizeDeckConfig({
    'deck.number': m ? m[1] : '01',
    'deck.slug': m ? m[2] : slugify(name),
    'deck.title': m ? m[2].replace(/-/g, ' ') : name,
  }, deckRoot);
}

export function writeDeckConfig(deckRoot, info) {
  writeFlatYaml(path.join(deckRoot, DECK_FILE), structuredDeckConfig(info), 'MARS deck configuration');
}

export function stackShortTitle(info, stackRoot = '') {
  const explicit = info.short_title || info.abbreviation || info.code;
  if (explicit) return normalizeShortTitle(explicit, 'MARS');
  const base = String(info.title || path.basename(stackRoot) || 'MARS').trim();
  const words = base.replace(/[-_]+/g, ' ').split(/\s+/).filter(Boolean);
  if (words.length >= 2) return normalizeShortTitle(words.map(w => w[0]).join(''), 'MARS');
  return normalizeShortTitle(base.slice(0, 3), 'MARS');
}

export function listBricks(stackRoot) {
  if (!stackRoot || !fs.existsSync(stackRoot)) return [];
  const bricks = [];
  for (const entry of fs.readdirSync(stackRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('.') || ['assets', 'dist', 'figures', 'node_modules'].includes(entry.name)) continue;
    const root = path.join(stackRoot, entry.name);
    if (!fs.existsSync(path.join(root, BRICK_FILE))) continue;
    const info = brickInfo(root);
    bricks.push({ root, name: entry.name, info });
  }
  return bricks.sort((a, b) => {
    const ao = Number(a.info.order || 0); const bo = Number(b.info.order || 0);
    return ao !== bo ? ao - bo : String(a.info.title || a.name).localeCompare(String(b.info.title || b.name));
  });
}

export function findBrick(stackRoot, selector) {
  const bricks = listBricks(stackRoot);
  if (!selector) return null;
  const needle = String(selector).toLowerCase();
  return bricks.find(b => b.name.toLowerCase() === needle || String(b.info.slug).toLowerCase() === needle || String(b.info.kind).toLowerCase() === needle || String(b.info.title).toLowerCase() === needle) || null;
}

export function listDecks(brickRoot) {
  if (!brickRoot || !fs.existsSync(brickRoot)) return [];
  return fs.readdirSync(brickRoot, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith('.'))
    .map(d => ({ root: path.join(brickRoot, d.name), name: d.name }))
    .filter(d => fs.existsSync(path.join(d.root, 'slides.md')))
    .map(d => ({ ...d, info: deckInfo(d.root), source: path.join(d.root, 'slides.md') }))
    .sort((a, b) => Number(a.info.number || 0) - Number(b.info.number || 0) || a.name.localeCompare(b.name));
}

export function nextDeckNumber(brickRoot) {
  let max = 0;
  for (const deck of listDecks(brickRoot)) max = Math.max(max, Number(deck.info.number || 0));
  return String(max + 1).padStart(2, '0');
}

export function ensureStackStructure(stackRoot) {
  for (const rel of ['assets/branding', 'assets/common', 'assets/bibliography', 'figures/src', 'figures/generated', 'dist', '.mars/themes', '.vscode']) {
    ensureDir(path.join(stackRoot, rel));
  }
}

function updateGitignore(stackRoot) {
  const file = path.join(stackRoot, '.gitignore');
  const desired = ['dist/', '.mars/', '.DS_Store', '__pycache__/'];
  const existing = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split(/\r?\n/) : [];
  const lines = [...existing.filter(Boolean)];
  for (const d of desired) if (!lines.includes(d)) lines.push(d);
  fs.writeFileSync(file, `${lines.join('\n')}\n`);
}

function updateVsCodeSettings(stackRoot) {
  const file = path.join(stackRoot, '.vscode', 'settings.json');
  let data = {};
  if (fs.existsSync(file)) {
    try { data = JSON.parse(fs.readFileSync(file, 'utf8')); }
    catch { fs.copyFileSync(file, `${file}.before-mars`); data = {}; }
  }
  data['markdown.marp.themes'] = ['./.mars/themes/marpx.css', './.mars/themes/gödel.css', './.mars/themes/mars.css'];
  data['markdown.marp.html'] = 'all';
  data['markdown.marp.diagnostics.slideContentOverflow'] = true;
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

function ensureFiguresReadme(stackRoot) {
  const file = path.join(stackRoot, 'figures', 'README.md');
  if (fs.existsSync(file)) return;
  fs.writeFileSync(file, `# Scientific figures in MARS\n\n- Put reproducible Python sources in \`figures/src/\`.\n- Write generated SVG/PNG files to \`MARS_FIGURE_OUT_DIR\`.\n- Run \`mars figures\` or \`mars build --figures\`.\n`);
}

export function syncStack(stackRoot) {
  ensureStackStructure(stackRoot);
  for (const name of ['marpx.css', 'gödel.css', 'mars.css']) fs.copyFileSync(path.join(THEMES_DIR, name), path.join(stackRoot, '.mars', 'themes', name));
  if (fs.existsSync(SNIPPETS_FILE)) fs.copyFileSync(SNIPPETS_FILE, path.join(stackRoot, '.vscode', 'mars.code-snippets'));
  updateVsCodeSettings(stackRoot);
  updateGitignore(stackRoot);
  ensureFiguresReadme(stackRoot);
  return stackRoot;
}

export function copyBranding(profile, stackRoot) {
  const dest = path.join(stackRoot, 'assets', 'branding');
  ensureDir(dest);
  if (profile.primary_logo) copyFileIfExists(path.join(profile.__dir, profile.primary_logo), path.join(dest, path.basename(profile.primary_logo)));
  if (profile.secondary_logo) copyFileIfExists(path.join(profile.__dir, profile.secondary_logo), path.join(dest, path.basename(profile.secondary_logo)));
}

function renderTemplate(templateName, vars) {
  let text = fs.readFileSync(path.join(TEMPLATES_DIR, `${templateName}.md`), 'utf8');
  for (const [key, value] of Object.entries(vars)) text = text.replaceAll(`{{${key}}}`, String(value ?? ''));
  return text;
}

export function addBrick(stackRoot, { title, slug, shortTitle = '', kind = 'generic', order = null, outputPattern = null, deckLabel = 'Deck' }) {
  const stack = stackInfo(stackRoot);
  const brickSlug = slugify(slug || title);
  const root = safePathWithin(stackRoot, path.join(stackRoot, brickSlug), 'Brick');
  if (fs.existsSync(root)) throw new Error(`Brick already exists: ${brickSlug}`);
  ensureDir(root);
  const existing = listBricks(stackRoot);
  const info = {
    title,
    slug: brickSlug,
    short_title: shortTitle || '',
    kind,
    order: order ?? existing.length + 1,
    deck_label: deckLabel || 'Deck',
    output_pattern: outputPattern || '{stack.short}_{brick.short}{deck.number}.pdf',
  };
  writeBrickConfig(root, info);
  ensureDir(path.join(stackRoot, 'dist', brickSlug));
  touchRecent(stackRoot);
  return { root, info: brickInfo(root), stack };
}

export function createStack({ parentDir, title, slug, shortTitle, preset = 'blank', academicYear = '', profileId, author, language, school, university, theme, footer }) {
  const user = loadUserConfig();
  const profile = loadProfile(profileId || user.default_profile || 'ensak-usms');
  const stackSlug = slugify(slug || title);
  const stackRoot = path.resolve(parentDir, stackSlug);
  if (fs.existsSync(stackRoot)) throw new Error(`Folder already exists: ${stackRoot}`);
  const authorFull = author || user.default_author || profile.author || '';
  const authorParts = splitAuthor(authorFull);
  const info = {
    title,
    slug: stackSlug,
    short_title: normalizeShortTitle(shortTitle || stackShortTitle({ title }, stackRoot), 'MARS'),
    preset,
    academic_year: academicYear || (preset === 'course' ? inferAcademicYear() : ''),
    profile: profile.id || profileId || 'ensak-usms',
    author: authorFull,
    author_title: authorParts.title,
    author_name: authorParts.name,
    school: school || profile.school || '',
    university: university || profile.university || '',
    language: language || user.default_language || profile.language || 'fr',
    theme: theme || profile.theme || 'mars',
    footer: footer || profile.footer || `${profile.school || ''} · ${profile.university || ''}`.replace(/^ · | · $/g, ''),
  };
  ensureStackStructure(stackRoot);
  writeStackConfig(stackRoot, info);
  copyBranding(profile, stackRoot);
  syncStack(stackRoot);
  const bricks = presetBricks(preset, info.language);
  bricks.forEach((b, i) => addBrick(stackRoot, { ...b, shortTitle: b.short_title, outputPattern: b.output_pattern, deckLabel: b.deck_label, order: i + 1 }));
  writeMarsLock(stackRoot, { shortTitle: info.short_title, theme: info.theme, profile: info.profile, kind: 'stack' });
  touchRecent(stackRoot);
  return { root: stackRoot, info: stackInfo(stackRoot) };
}

export function deckPdfName(stackRoot, brickRoot, deckRoot) {
  const stack = stackInfo(stackRoot);
  const brick = brickInfo(brickRoot);
  const deck = deckInfo(deckRoot);
  const short = stackShortTitle(stack, stackRoot);
  const number = normalizeDocumentNumber(deck.number || '01');
  const pattern = brick.output_pattern || '{stack.short}_{brick.short}{deck.number}.pdf';
  const filename = pattern
    .replaceAll('{stack.short}', short)
    .replaceAll('{stack.slug}', slugify(stack.slug || stack.title || path.basename(stackRoot)))
    .replaceAll('{brick.short}', String(brick.short_title || ''))
    .replaceAll('{brick.slug}', slugify(brick.slug || path.basename(brickRoot)))
    .replaceAll('{deck.number}', number)
    .replaceAll('{deck.slug}', slugify(deck.slug || path.basename(deckRoot)));
  return safePdfFilename(filename);
}

export function deckPaths(stackRoot, brickRoot, deckRoot) {
  const source = safePathWithin(stackRoot, path.join(deckRoot, 'slides.md'), 'Deck source');
  if (!fs.existsSync(source)) throw new Error(`slides.md not found: ${source}`);
  const brick = brickInfo(brickRoot);
  const outDir = safePathWithin(path.join(stackRoot, 'dist'), path.join(stackRoot, 'dist', brick.slug || path.basename(brickRoot)), 'Output directory');
  ensureDir(outDir);
  const output = safePathWithin(path.join(stackRoot, 'dist'), path.join(outDir, deckPdfName(stackRoot, brickRoot, deckRoot)), 'PDF output');
  return { source, output };
}

export function addDeck(stackRoot, brickRoot, { number, title, kind = 'deck', subtitle = '' }) {
  const stack = stackInfo(stackRoot);
  const brick = brickInfo(brickRoot);
  const profile = loadProfile(stack.profile || 'ensak-usms');
  const n = normalizeDocumentNumber(number || nextDeckNumber(brickRoot));
  const slug = slugify(title);
  const dirname = `${n}-${slug}`;
  const root = safePathWithin(brickRoot, path.join(brickRoot, dirname), 'Deck');
  if (fs.existsSync(root)) throw new Error(`Deck already exists: ${dirname}`);
  ensureDir(path.join(root, 'assets'));
  writeDeckConfig(root, { title, slug, number: n, kind, subtitle });

  const label = brick.deck_label || 'Deck';
  const computedSubtitle = subtitle || `${label} ${n} · ${stack.title}`;
  const text = renderTemplate('deck', {
    THEME: stack.theme || 'mars',
    LANGUAGE: stack.language || 'fr',
    TITLE: title,
    AUTHOR: stack.author || '',
    NUMBER: n,
    STACK_TITLE: stack.title || path.basename(stackRoot),
    BRICK_TITLE: brick.title || path.basename(brickRoot),
    DECK_LABEL: label,
    DECK_SUBTITLE: computedSubtitle,
    ACADEMIC_YEAR: stack.academic_year || '',
    SCHOOL: stack.school || '',
    UNIVERSITY: stack.university || '',
    FOOTER: stack.footer || '',
    PRIMARY_LOGO_HTML: profile.primary_logo ? `<img class="logo-primary" src="../../assets/branding/${path.basename(profile.primary_logo)}" alt="${profile.primary_logo_alt || profile.school || 'Primary logo'}" />` : '',
    SECONDARY_LOGO_HTML: profile.secondary_logo ? `<img class="logo-secondary" src="../../assets/branding/${path.basename(profile.secondary_logo)}" alt="${profile.secondary_logo_alt || profile.university || 'Secondary logo'}" />` : '',
    ORGANIZATION_HTML: [stack.school, stack.university].filter(Boolean).length ? `<div class="organization">${[stack.school, stack.university].filter(Boolean).join('<br>')}</div>` : '',
    DATE_HTML: stack.academic_year ? `<div class="date">${stack.preset === 'course' ? (String(stack.language || '').toLowerCase().startsWith('fr') ? 'Année universitaire : ' : 'Academic year: ') : ''}${stack.academic_year}</div>` : '',
  });
  fs.writeFileSync(path.join(root, 'slides.md'), text);
  syncStack(stackRoot);
  touchRecent(stackRoot);
  return { root, source: path.join(root, 'slides.md'), name: dirname, info: deckInfo(root), brickRoot, brick, stackRoot };
}

export function findDeckFromPath(inputPath) {
  const p = path.resolve(inputPath);
  if (fs.existsSync(p) && fs.statSync(p).isFile()) {
    if (path.basename(p) !== 'slides.md') throw new Error('The file must be a MARS slides.md deck.');
    return p;
  }
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
    const source = path.join(p, 'slides.md');
    if (fs.existsSync(source)) return source;
  }
  return null;
}

export function allDecks(stackRoot) {
  const out = [];
  for (const brick of listBricks(stackRoot)) {
    for (const deck of listDecks(brick.root)) out.push({ ...deck, brickRoot: brick.root, brick: brick.info, stackRoot });
  }
  return out;
}

export function migrateLegacyCourse(courseRoot) {
  const legacyFile = path.join(courseRoot, 'course.yml');
  if (!fs.existsSync(legacyFile)) throw new Error(`Legacy course.yml not found: ${courseRoot}`);
  const legacy = normalizeCourseConfig(parseFlatYaml(legacyFile), courseRoot);
  if (!fs.existsSync(path.join(courseRoot, STACK_FILE))) {
    writeStackConfig(courseRoot, {
      title: legacy.name || path.basename(courseRoot),
      slug: legacy.slug || path.basename(courseRoot),
      short_title: legacy.short_title || stackShortTitle({ title: legacy.name }, courseRoot),
      preset: 'course',
      language: legacy.language || 'fr',
      academic_year: legacy.academic_year || '',
      profile: legacy.profile || 'ensak-usms',
      author: legacy.author || '',
      author_title: legacy.author_title || '',
      author_name: legacy.author_name || '',
      school: legacy.school || '',
      university: legacy.university || '',
      theme: legacy.theme || 'mars',
      footer: legacy.footer || '',
    });
  }

  const mappings = [
    { dir: 'chapters', title: 'Lectures', short: '', kind: 'lectures', label: 'Chapter', pattern: legacy.output_chapter || '{stack.short}_{deck.number}.pdf' },
    { dir: 'td', title: 'Tutorials', short: 'TD', kind: 'tutorials', label: 'TD', pattern: legacy.output_td || '{stack.short}_TD{deck.number}.pdf' },
    { dir: 'tp', title: 'Labs', short: 'TP', kind: 'labs', label: 'TP', pattern: legacy.output_tp || '{stack.short}_TP{deck.number}.pdf' },
  ];
  let decks = 0;
  let bricks = 0;
  for (const [index, m] of mappings.entries()) {
    const brickRoot = path.join(courseRoot, m.dir);
    if (!fs.existsSync(brickRoot)) continue;
    if (!fs.existsSync(path.join(brickRoot, BRICK_FILE))) {
      writeBrickConfig(brickRoot, { title: m.title, slug: m.dir, short_title: m.short, kind: m.kind, order: index + 1, deck_label: m.label, output_pattern: m.pattern.replaceAll('{short_title}', '{stack.short}').replaceAll('{number}', '{deck.number}') });
      bricks += 1;
    }
    for (const entry of fs.readdirSync(brickRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const deckRoot = path.join(brickRoot, entry.name);
      const source = path.join(deckRoot, 'slides.md');
      if (!fs.existsSync(source)) continue;
      if (!fs.existsSync(path.join(deckRoot, DECK_FILE))) {
        const mm = entry.name.match(/^(\d{1,2})-(.+)$/);
        const number = normalizeDocumentNumber(mm ? mm[1] : '01');
        const slug = mm ? mm[2] : slugify(entry.name);
        writeDeckConfig(deckRoot, { title: slug.replace(/-/g, ' '), slug, number, kind: m.label.toLowerCase(), subtitle: '' });
        decks += 1;
      }
    }
  }
  syncStack(courseRoot);
  const stack = stackInfo(courseRoot);
  writeMarsLock(courseRoot, { shortTitle: stack.short_title, theme: stack.theme, profile: stack.profile, kind: 'stack' });
  touchRecent(courseRoot);
  return { stackRoot: courseRoot, bricks, decks, legacyFile };
}
