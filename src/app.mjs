import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { VERSION_FILE, MARS_ROOT, STYLE_GUIDE } from './paths.mjs';
import { loadUserConfig, initUserConfig, listProfiles, loadRecent, touchRecent, loadProfile } from './config.mjs';
import { detectContext, findStacksUnder } from './context.mjs';
import { createStack, addBrick, addDeck, stackInfo, listBricks, listDecks, findBrick, allDecks, deckPaths, findDeckFromPath, syncStack, migrateLegacyCourse, nextDeckNumber } from './stack.mjs';
import { buildPdf, marpBin, preview } from './marp.mjs';
import { browserInfo, commandExists, commandVersion, inferAcademicYear, slugify, relativeDisplay, ensureDir } from './utils.mjs';
import { checkStack } from './check.mjs';
import { figureSummary, runFigures, pythonCommand } from './figures.mjs';
import { lockCompatibility } from './metadata.mjs';
import { ensureLauncher, ensureLocalBinInShellRc, launcherStatus, localBinDir, pathContainsLocalBin, shellRcFile, shellRcHasLocalBin } from './installation.mjs';
import { ask, yesNo, choose } from './ui.mjs';
import { lastDeck, rememberDeck, figureExecutionTrusted, setFigureExecutionTrusted } from './state.mjs';
import { cleanStack } from './clean.mjs';
import { presetChoices } from './presets.mjs';
import { park, unpark, readRegistry, discoverParkedStacks, linkStack, unlinkStack, findRegisteredStack } from './registry.mjs';
import { color, heading, command, success, warning, failure, info, twoColumn } from './console.mjs';

const VERSION = fs.readFileSync(VERSION_FILE, 'utf8').trim();

function titleOf(infoObj, root = '') { return infoObj?.title || infoObj?.name || path.basename(root); }
function shortOf(infoObj) { return infoObj?.short_title || ''; }

function parseOptions(args = []) {
  const options = {};
  const positional = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg.startsWith('--')) { positional.push(arg); continue; }
    const eq = arg.indexOf('=');
    if (eq > 2) { options[arg.slice(2, eq)] = arg.slice(eq + 1); continue; }
    const key = arg.slice(2);
    const next = args[i + 1];
    if (next && !next.startsWith('--')) { options[key] = next; i += 1; }
    else options[key] = true;
  }
  return { options, positional };
}

function recentStacks() {
  return loadRecent().map(root => {
    if (fs.existsSync(path.join(root, 'mars.yml'))) return { root, info: stackInfo(root), legacy: false };
    if (fs.existsSync(path.join(root, 'course.yml'))) return { root, info: { title: path.basename(root), name: path.basename(root) }, legacy: true };
    return null;
  }).filter(Boolean);
}

function availableStacks() {
  const out = [];
  const seen = new Set();
  const add = item => {
    if (!item) return;
    const root = path.resolve(item.root);
    if (seen.has(root)) return;
    seen.add(root);
    out.push({ ...item, root });
  };
  const ctx = detectContext();
  if (ctx.stackRoot) add({ root: ctx.stackRoot, info: ctx.stack, legacy: ctx.legacy });
  for (const item of discoverParkedStacks()) add(item);
  if (!ctx.stackRoot && !ctx.workspaceRoot) for (const item of findStacksUnder(process.cwd())) add(item);
  for (const item of recentStacks()) add(item);
  return out;
}

async function selectStack({ preferCurrent = true } = {}) {
  const ctx = detectContext();
  if (preferCurrent && ctx.stackRoot && !ctx.legacy) return ctx.stackRoot;
  const stacks = availableStacks().filter(s => !s.legacy);
  if (!stacks.length) throw new Error('No MARS stack found. Create one with: mars make:stack');
  const o = await choose('Stack', stacks.map(s => ({ label: `${titleOf(s.info, s.root)}  ${color.dim(`(${path.basename(s.root)})`)}`, value: s.root })));
  return o.value;
}

async function selectBrick(stackRoot, selector = null) {
  if (selector) {
    const found = findBrick(stackRoot, selector);
    if (!found) throw new Error(`Brick not found: ${selector}`);
    return found;
  }
  const ctx = detectContext();
  if (ctx.stackRoot === stackRoot && ctx.brick) return { root: ctx.brick.root, info: ctx.brick.info, name: ctx.brick.name };
  const bricks = listBricks(stackRoot);
  if (!bricks.length) throw new Error('This stack has no Brick. Use: mars make:brick');
  if (bricks.length === 1) return bricks[0];
  return await choose('Brick', bricks.map(b => ({ label: `${b.info.title}  ${color.dim(`(${b.name})`)}`, value: b }))).then(o => o.value);
}

async function selectDeck(stackRoot, brickRoot = null) {
  const ctx = detectContext();
  if (ctx.stackRoot === stackRoot && ctx.deck && (!brickRoot || ctx.brick?.root === brickRoot)) return { root: ctx.deck.root, source: ctx.deck.source, info: ctx.deck.info, name: ctx.deck.name, brickRoot: ctx.brick.root, brick: ctx.brick.info };
  const brick = brickRoot ? { root: brickRoot, info: (listBricks(stackRoot).find(b => b.root === brickRoot)?.info) } : await selectBrick(stackRoot);
  const decks = listDecks(brick.root);
  if (!decks.length) throw new Error(`No Deck in Brick ${brick.info?.title || path.basename(brick.root)}.`);
  const o = await choose('Deck', decks.map(d => ({ label: `${d.info.number}  ${d.info.title || d.name}`, value: d })));
  return { ...o.value, brickRoot: brick.root, brick: brick.info };
}

async function resolveDeck(pathArg = null) {
  if (pathArg) {
    const source = findDeckFromPath(pathArg);
    if (!source) throw new Error(`MARS Deck not found: ${pathArg}`);
    const ctx = detectContext(source);
    if (!ctx.stackRoot || ctx.legacy || !ctx.deck || !ctx.brick) throw new Error('This deck is not inside a migrated MARS Stack.');
    return { stackRoot: ctx.stackRoot, root: ctx.deck.root, source: ctx.deck.source, info: ctx.deck.info, name: ctx.deck.name, brickRoot: ctx.brick.root, brick: ctx.brick.info };
  }
  const ctx = detectContext();
  if (ctx.legacy) throw new Error('Legacy course detected. Run: mars migrate');
  if (ctx.stackRoot && ctx.deck && ctx.brick) return { stackRoot: ctx.stackRoot, root: ctx.deck.root, source: ctx.deck.source, info: ctx.deck.info, name: ctx.deck.name, brickRoot: ctx.brick.root, brick: ctx.brick.info };
  if (ctx.stackRoot) {
    const last = lastDeck(ctx.stackRoot);
    if (last) {
      const lctx = detectContext(last.source);
      if (lctx.deck && lctx.brick) return { stackRoot: ctx.stackRoot, root: lctx.deck.root, source: lctx.deck.source, info: lctx.deck.info, name: lctx.deck.name, brickRoot: lctx.brick.root, brick: lctx.brick.info };
    }
    const selected = await selectDeck(ctx.stackRoot);
    return { stackRoot: ctx.stackRoot, ...selected };
  }
  const stackRoot = await selectStack();
  const last = lastDeck(stackRoot);
  if (last) {
    const lctx = detectContext(last.source);
    if (lctx.deck && lctx.brick) return { stackRoot, root: lctx.deck.root, source: lctx.deck.source, info: lctx.deck.info, name: lctx.deck.name, brickRoot: lctx.brick.root, brick: lctx.brick.info };
  }
  return { stackRoot, ...await selectDeck(stackRoot) };
}

async function makeStack(args = []) {
  const { options, positional } = parseOptions(args);
  const user = loadUserConfig();
  const title = positional.join(' ') || await ask('Stack title');
  if (!title) throw new Error('Stack title is required.');
  const slug = options.slug || await ask('Folder / slug', slugify(title));
  const defaultShort = title.split(/\s+/).filter(Boolean).map(w => w[0]).join('').toUpperCase() || slug.slice(0, 3).toUpperCase();
  const shortTitle = options.short || options.code || await ask('Short title', defaultShort);
  let preset = options.preset;
  if (!preset) preset = (await choose('Preset', presetChoices())).value;
  const profileId = options.profile || await ask('Institution profile', user.default_profile || 'ensak-usms');
  const author = options.author || await ask('Author', user.default_author || '');
  const language = options.language || await ask('Language', user.default_language || 'fr');
  const academicYear = options.year || (preset === 'course' ? await ask('Academic year', inferAcademicYear()) : '');
  const created = createStack({ parentDir: process.cwd(), title, slug, shortTitle, preset, profileId, author, language, academicYear });
  console.log(`\n${success(`Stack created: ${created.root}`)}`);
  console.log(color.dim(`Preset: ${preset} · ${listBricks(created.root).length} Brick(s)`));
  return created;
}

async function makeBrick(args = []) {
  const { options, positional } = parseOptions(args);
  const stackRoot = detectContext().stackRoot || await selectStack();
  if (detectContext(stackRoot).legacy) throw new Error('Legacy course detected. Run: mars migrate');
  const title = positional.join(' ') || await ask('Brick title');
  if (!title) throw new Error('Brick title is required.');
  const slug = options.slug || await ask('Folder / slug', slugify(title));
  const shortTitle = options.short ?? await ask('Brick short code', '');
  const deckLabel = options.label || await ask('Deck label', 'Deck');
  const outputPattern = options.output || await ask('PDF pattern', '{stack.short}_{brick.short}{deck.number}.pdf');
  const created = addBrick(stackRoot, { title, slug, shortTitle, kind: options.kind || 'generic', deckLabel, outputPattern });
  console.log(`\n${success(`Brick created: ${relativeDisplay(stackRoot, created.root)}`)}`);
  return created;
}

async function makeDeck(args = [], forcedBrickKind = null) {
  const { options, positional } = parseOptions(args);
  const stackRoot = detectContext().stackRoot || await selectStack();
  if (detectContext(stackRoot).legacy) throw new Error('Legacy course detected. Run: mars migrate');
  let brick = null;
  if (forcedBrickKind) brick = findBrick(stackRoot, forcedBrickKind);
  if (!brick) brick = await selectBrick(stackRoot, options.brick || null);
  const number = options.number || await ask('Number', nextDeckNumber(brick.root));
  const title = positional.join(' ') || await ask('Deck title');
  if (!title) throw new Error('Deck title is required.');
  const deck = addDeck(stackRoot, brick.root, { number, title, kind: options.kind || brick.info.deck_label?.toLowerCase() || 'deck', subtitle: options.subtitle || '' });
  rememberDeck(stackRoot, deck);
  console.log(`\n${success(`Deck created: ${relativeDisplay(stackRoot, deck.source)}`)}`);
  return deck;
}

async function makeFigure(args = []) {
  const { options, positional } = parseOptions(args);
  const ctx = detectContext();
  const stackRoot = ctx.stackRoot || await selectStack();
  if (ctx.legacy) throw new Error('Legacy course detected. Run: mars migrate');
  const name = slugify(positional.join(' ') || await ask('Figure name'));
  let engine = options.engine;
  if (!engine) engine = (await choose('Engine', [
    { label: 'Matplotlib', value: 'matplotlib' },
    { label: 'Plotly', value: 'plotly' },
    { label: 'Blank Python', value: 'python' },
  ])).value;
  const scope = ctx.deck ? ctx.deck.root : stackRoot;
  const srcDir = path.join(scope, 'figures', 'src');
  ensureDir(srcDir);
  const file = path.join(srcDir, `${name}.py`);
  if (fs.existsSync(file)) throw new Error(`Figure source already exists: ${file}`);
  let body;
  if (engine === 'matplotlib') body = `from pathlib import Path\nimport os\nimport matplotlib.pyplot as plt\n\nout = Path(os.environ["MARS_FIGURE_OUT_DIR"])\nout.mkdir(parents=True, exist_ok=True)\n\nfig, ax = plt.subplots()\n# ax.plot(x, y)\nax.set_title("${name}")\nfig.savefig(out / "${name}.svg", bbox_inches="tight")\n`;
  else if (engine === 'plotly') body = `from pathlib import Path\nimport os\nimport plotly.graph_objects as go\n\nout = Path(os.environ["MARS_FIGURE_OUT_DIR"])\nout.mkdir(parents=True, exist_ok=True)\n\nfig = go.Figure()\n# fig.add_scatter(x=x, y=y)\nfig.write_image(out / "${name}.svg")\n`;
  else body = `from pathlib import Path\nimport os\n\nout = Path(os.environ["MARS_FIGURE_OUT_DIR"])\nout.mkdir(parents=True, exist_ok=True)\n\n# Generate your figure here and write it to out / "${name}.svg"\n`;
  fs.writeFileSync(file, body);
  console.log(success(`Figure source created: ${relativeDisplay(stackRoot, file)}`));
  return file;
}

async function dev(pathArg = null) {
  const deck = await resolveDeck(pathArg);
  syncStack(deck.stackRoot);
  rememberDeck(deck.stackRoot, deck);
  touchRecent(deck.stackRoot);

  const figs = figureSummary(deck.stackRoot, { deck: { root: deck.root } });
  if (figs.stale) {
    const py = pythonCommand();
    if (py) {
      let allowed = figureExecutionTrusted(deck.stackRoot);
      if (!allowed && process.stdin.isTTY) {
        console.log(warning(`${figs.stale} figure(s) are stale and require Python execution.`));
        allowed = await yesNo('Execute figure scripts now?', false);
        if (allowed && await yesNo('Trust Python figure scripts in this Stack for future mars dev runs?', false)) setFigureExecutionTrusted(deck.stackRoot, true);
      }
      if (allowed) runFigures(deck.stackRoot, { deck: { root: deck.root }, staleOnly: true });
      else console.log(warning('Figures were not regenerated automatically. Run: mars figures'));
    } else console.log(warning(`${figs.stale} stale figure(s), but Python is unavailable.`));
  }
  const validation = checkStack(deck.stackRoot);
  if (validation.errors) throw new Error(`${validation.errors} validation error(s). Run: mars check`);
  console.log(info(`${titleOf(stackInfo(deck.stackRoot))} · ${deck.brick.title} · ${deck.info.number} ${deck.info.title}`));
  preview(deck.source);
}

async function buildOne(pathArg = null, { withFigures = false, force = false } = {}) {
  const deck = await resolveDeck(pathArg);
  syncStack(deck.stackRoot);
  if (withFigures) runFigures(deck.stackRoot, { deck: { root: deck.root }, staleOnly: true });
  const validation = checkStack(deck.stackRoot);
  if (validation.errors && !force) throw new Error(`${validation.errors} validation error(s). Build stopped. Use --force only if intentional.`);
  const paths = deckPaths(deck.stackRoot, deck.brickRoot, deck.root);
  console.log(info(`Building ${deck.brick.title} / ${deck.info.number} ${deck.info.title}`));
  buildPdf(paths.source, paths.output);
  rememberDeck(deck.stackRoot, deck);
  touchRecent(deck.stackRoot);
  console.log(success(relativeDisplay(deck.stackRoot, paths.output)));
  return paths.output;
}

async function buildBrick(stackRoot, brick, opts = {}) {
  const decks = listDecks(brick.root);
  if (!decks.length) { console.log(warning(`No Deck in ${brick.info.title}.`)); return []; }
  const outputs = [];
  for (const d of decks) outputs.push(await buildOne(d.source, opts));
  return outputs;
}

async function buildStack(stackRoot, opts = {}) {
  const outputs = [];
  for (const brick of listBricks(stackRoot)) outputs.push(...await buildBrick(stackRoot, brick, opts));
  return outputs;
}

async function buildCommand(args = []) {
  const { options, positional } = parseOptions(args);
  const pathArg = positional[0] || null;
  if (options.stack || options.all) {
    const stackRoot = detectContext().stackRoot || await selectStack();
    return buildStack(stackRoot, { withFigures: Boolean(options.figures), force: Boolean(options.force) });
  }
  if (options.brick) {
    const stackRoot = detectContext().stackRoot || await selectStack();
    const brick = options.brick === true ? await selectBrick(stackRoot) : await selectBrick(stackRoot, options.brick);
    return buildBrick(stackRoot, brick, { withFigures: Boolean(options.figures), force: Boolean(options.force) });
  }
  return buildOne(pathArg, { withFigures: Boolean(options.figures), force: Boolean(options.force) });
}

async function figuresCommand() {
  const ctx = detectContext();
  const stackRoot = ctx.stackRoot || await selectStack();
  if (ctx.legacy) throw new Error('Legacy course detected. Run: mars migrate');
  return runFigures(stackRoot, ctx.deck ? { deck: { root: ctx.deck.root } } : { all: true });
}

function status() {
  const ctx = detectContext();
  console.log(`${color.bold('MARS')} ${color.dim(`v${VERSION}`)}`);
  if (ctx.legacy) {
    console.log(warning(`Legacy course detected: ${ctx.stackRoot}`));
    console.log(color.dim('Run: mars migrate'));
    return;
  }
  if (!ctx.stackRoot) {
    console.log(color.dim('No Stack detected in the current directory.'));
    const r = readRegistry();
    console.log(`Parked paths: ${r.parked.length}`);
    return;
  }
  const stack = stackInfo(ctx.stackRoot);
  const rows = [
    ['Stack', `${stack.title} (${stack.short_title})`],
    ['Root', ctx.stackRoot],
    ['Preset', stack.preset || 'blank'],
    ['Bricks', String(listBricks(ctx.stackRoot).length)],
    ['Decks', String(allDecks(ctx.stackRoot).length)],
  ];
  if (ctx.brick) rows.push(['Brick', ctx.brick.info.title]);
  if (ctx.deck) rows.push(['Deck', `${ctx.deck.info.number} ${ctx.deck.info.title}`]);
  const last = lastDeck(ctx.stackRoot);
  if (last) rows.push(['Last', relativeDisplay(ctx.stackRoot, last.source)]);
  const compat = lockCompatibility(ctx.stackRoot);
  rows.push(['Lock', compat.ok ? 'compatible' : compat.missing ? 'missing' : `${compat.locked} → ${compat.current}`]);
  for (const [k, v] of rows) console.log(`  ${color.cyan(k.padEnd(10))}${v}`);
}

async function checkCommand() {
  const ctx = detectContext();
  const stackRoot = ctx.stackRoot || await selectStack();
  if (ctx.legacy) throw new Error('Legacy course detected. Run: mars migrate');
  const result = checkStack(stackRoot);
  console.log(`${color.bold('MARS Check')} · ${titleOf(result.info, stackRoot)}\n`);
  if (!result.issues.length) console.log(success(`Valid Stack · ${result.bricks} Brick(s) · ${allDecks(stackRoot).length} Deck(s)`));
  for (const issue of result.issues) {
    const mark = issue.level === 'error' ? failure(issue.message) : warning(issue.message);
    console.log(mark);
    if (issue.detail) console.log(color.dim(`    ${issue.detail}`));
  }
  console.log(`\n${result.errors ? color.red(`${result.errors} error(s)`) : color.green('0 errors')} · ${result.warnings ? color.yellow(`${result.warnings} warning(s)`) : '0 warnings'}`);
  if (!result.ok) process.exitCode = 1;
  return result;
}

async function syncCommand() {
  const ctx = detectContext();
  const stackRoot = ctx.stackRoot || await selectStack();
  if (ctx.legacy) throw new Error('Legacy course detected. Run: mars migrate');
  syncStack(stackRoot);
  const stack = stackInfo(stackRoot);
  const { writeMarsLock } = await import('./metadata.mjs');
  writeMarsLock(stackRoot, { shortTitle: stack.short_title, theme: stack.theme, profile: stack.profile, kind: 'stack' });
  console.log(success('Themes, editor integration and mars.lock synchronized.'));
}

async function migrate(target = null) {
  const root = target ? path.resolve(target) : detectContext().stackRoot || process.cwd();
  if (fs.existsSync(path.join(root, 'mars.yml')) && !fs.existsSync(path.join(root, 'course.yml'))) {
    syncStack(root); console.log(success('Stack is already on the 0.7 content model.')); return;
  }
  const result = migrateLegacyCourse(root);
  console.log(success(`Legacy course migrated to Stack/Brick/Deck model.`));
  console.log(color.dim(`${result.bricks} Brick manifest(s), ${result.decks} Deck manifest(s) created.`));
  console.log(color.dim('course.yml was preserved for rollback; mars.yml is now authoritative.'));
}

async function cleanCommand(args = []) {
  const { options } = parseOptions(args);
  const ctx = detectContext();
  const stackRoot = ctx.stackRoot || await selectStack();
  if (ctx.legacy) throw new Error('Legacy course detected. Run: mars migrate');
  const result = cleanStack(stackRoot, { all: Boolean(options.all) });
  console.log(success(`${result.removed.length} generated item(s) removed.`));
}

function listCommand() {
  const stacks = availableStacks();
  if (!stacks.length) { console.log(color.dim('No MARS Stack found. Use mars park or mars make:stack.')); return; }
  console.log(`${heading('Stacks')}\n`);
  const parked = new Set(discoverParkedStacks().map(s => path.resolve(s.root)));
  for (const s of stacks) {
    const marker = s.legacy ? color.yellow('legacy') : parked.has(path.resolve(s.root)) ? color.green('parked') : color.dim('recent');
    console.log(`  ${command(String(s.info.slug || path.basename(s.root)).padEnd(28))} ${titleOf(s.info, s.root)}  ${marker}`);
    console.log(color.dim(`    ${s.root}`));
  }
}

async function openCommand(selector = null) {
  let target = null;
  const ctx = detectContext();
  if (!selector && ctx.stackRoot) target = { root: ctx.stackRoot, info: ctx.stack, legacy: ctx.legacy };
  if (!target && selector) target = findRegisteredStack(selector) || availableStacks().find(s => path.basename(s.root) === selector || s.info.slug === selector || titleOf(s.info, s.root) === selector);
  if (!target) {
    const stacks = availableStacks();
    if (!stacks.length) throw new Error('No Stack to open.');
    target = (await choose('Open Stack', stacks.map(s => ({ label: titleOf(s.info, s.root), value: s })))).value;
  }
  if (commandExists('code')) spawnSync('code', [target.root], { stdio: 'inherit' });
  else if (process.platform === 'darwin') spawnSync('open', [target.root], { stdio: 'inherit' });
  else if (process.platform === 'win32') spawnSync('explorer', [target.root], { stdio: 'inherit' });
  else if (commandExists('xdg-open')) spawnSync('xdg-open', [target.root], { stdio: 'inherit' });
  else console.log(target.root);
}

function parkCommand(target = null) {
  const root = park(target || process.cwd());
  console.log(success(`Parked: ${root}`));
  console.log(color.dim('Every direct MARS Stack in this directory is now discoverable.'));
}
function unparkCommand(target = null) {
  const result = unpark(target || process.cwd());
  console.log(result.removed ? success(`Unparked: ${result.root}`) : warning(`Path was not parked: ${result.root}`));
}
function pathsCommand() {
  const r = readRegistry();
  console.log(`${heading('Parked paths')}\n`);
  if (!r.parked.length) console.log(color.dim('  None. Run mars park in a directory containing stacks.'));
  else for (const p of r.parked) console.log(`  ${command(p)}`);
  if (Object.keys(r.links).length) {
    console.log(`\n${heading('Linked stacks')}\n`);
    for (const [alias, target] of Object.entries(r.links)) console.log(`  ${command(alias.padEnd(20))}${color.dim(target)}`);
  }
}
function linkCommand(alias = null) {
  const ctx = detectContext();
  if (!ctx.stackRoot) throw new Error('Run mars link from inside a MARS Stack.');
  const result = linkStack(ctx.stackRoot, alias);
  console.log(success(`Linked ${result.alias} → ${result.root}`));
}
function unlinkCommand(alias = null) {
  const result = unlinkStack(alias || process.cwd());
  console.log(result ? success(`Unlinked ${result.alias}`) : warning('No matching linked Stack.'));
}

function guide(pdf = false) {
  if (pdf) {
    const out = path.join(MARS_ROOT, 'mars-guide.pdf');
    buildPdf(STYLE_GUIDE, out);
    console.log(success(out));
    return;
  }
  console.log(STYLE_GUIDE);
}

function setup() {
  const file = initUserConfig();
  console.log(success(`User configuration: ${file}`));
  console.log(color.dim(`Default profile: ${loadUserConfig().default_profile}`));
  console.log(color.dim(`Profiles: ${listProfiles().join(', ')}`));
}

function doctor({ fix = false } = {}) {
  const ctx = detectContext();
  const checks = [];
  const fixes = [];
  if (fix && process.platform !== 'win32') {
    try { const result = ensureLauncher(); if (result.changed) fixes.push(`Launcher: ${result.launcher}`); } catch {}
    try { const result = ensureLocalBinInShellRc(); if (result.changed) fixes.push(`PATH updated: ${result.file}`); } catch {}
    if (ctx.stackRoot && !ctx.legacy) { syncStack(ctx.stackRoot); fixes.push('Stack resources synchronized'); }
  }
  checks.push(['Node', process.version, Number(process.versions.node.split('.')[0]) >= 18]);
  checks.push(['Marp CLI', fs.existsSync(marpBin()) ? (commandVersion(marpBin()) || marpBin()) : 'not installed', fs.existsSync(marpBin())]);
  checks.push(['Browser', browserInfo() || 'not detected', Boolean(browserInfo())]);
  checks.push(['Config', initUserConfig(), true]);
  if (process.platform !== 'win32') {
    const launcher = launcherStatus();
    checks.push(['Global launcher', launcher.correct ? launcher.launcher : 'missing or incorrect', launcher.correct]);
    checks.push(['~/.local/bin', pathContainsLocalBin() || shellRcHasLocalBin() ? 'configured' : 'not in PATH', pathContainsLocalBin() || shellRcHasLocalBin()]);
  }
  if (ctx.stackRoot && !ctx.legacy) {
    const figs = figureSummary(ctx.stackRoot, { all: true });
    if (figs.total) checks.push(['Python figures', pythonCommand() || 'python not found', Boolean(pythonCommand())]);
    let brandingOk = false;
    try {
      const stack = stackInfo(ctx.stackRoot); const profile = loadProfile(stack.profile || 'ensak-usms');
      brandingOk = [profile.primary_logo, profile.secondary_logo].filter(Boolean).every(x => fs.existsSync(path.join(ctx.stackRoot, 'assets', 'branding', path.basename(x))));
    } catch {}
    checks.push(['Branding', path.join(ctx.stackRoot, 'assets', 'branding'), brandingOk]);
  }
  console.log(`${color.bold('MARS Doctor')}\n`);
  for (const [name, detail, ok] of checks) console.log(`${ok ? color.green('✓') : color.yellow('!')} ${name.padEnd(18)} ${detail}`);
  if (fixes.length) { console.log(`\n${heading('Fixes')}`); fixes.forEach(f => console.log(`  ${success(f)}`)); }
  if (fix && process.platform !== 'win32' && !pathContainsLocalBin() && shellRcHasLocalBin()) console.log(color.dim(`Reload shell: source ${shellRcFile() || '~/.zshrc'}`));
  return checks.every(c => c[2]);
}

function completion(shell = 'zsh') {
  const commands = ['dev','build','check','status','make:stack','make:brick','make:deck','make:figure','make:chapter','make:td','make:tp','figures','park','unpark','paths','link','unlink','list','open','doctor','sync','clean','migrate','guide','menu','help'];
  if (shell === 'zsh') {
    console.log(`#compdef mars\n_arguments '1:command:(${commands.join(' ')})' '*::args:->args'`);
  } else if (shell === 'bash') {
    console.log(`_mars_complete(){ COMPREPLY=( $(compgen -W '${commands.join(' ')}' -- "${'${COMP_WORDS[1]}'}") ); }\ncomplete -F _mars_complete mars`);
  } else if (shell === 'fish') {
    for (const c of commands) console.log(`complete -c mars -f -a '${c}'`);
  } else throw new Error('Supported shells: zsh, bash, fish');
}

const COMMAND_HELP = {
  build: `Description:\n  Build Deck, Brick or complete Stack output.\n\nUsage:\n  mars build [deck] [--figures] [--force]\n  mars build --brick [name]\n  mars build --stack\n\nOptions:\n  --figures       Generate stale figures first\n  --brick [name]  Build one Brick\n  --stack, --all  Build the complete Stack\n  --force         Continue despite validation errors`,
  'make:stack': `Description:\n  Create a new MARS Stack.\n\nUsage:\n  mars make:stack [title] [--preset course|conference|workshop|training|blank]\n\nOptions:\n  --slug NAME\n  --short CODE\n  --profile ID\n  --author NAME\n  --language CODE\n  --year YYYY-YYYY`,
  'make:brick': `Description:\n  Add a Brick to the current Stack.\n\nUsage:\n  mars make:brick [title] [--short CODE] [--kind KIND]`,
  'make:deck': `Description:\n  Add a Deck to a Brick.\n\nUsage:\n  mars make:deck [title] [--brick BRICK] [--number NN]`,
  park: `Description:\n  Register a directory as a MARS Stack root. All direct child Stacks become discoverable.\n\nUsage:\n  mars park [path]\n  mars unpark [path]\n  mars paths`,
  dev: `Description:\n  Start Marp live preview for the current or last Deck.\n\nUsage:\n  mars dev [slides.md|deck-directory]`,
};

function printHelp(commandName = null) {
  if (commandName && COMMAND_HELP[commandName]) { console.log(COMMAND_HELP[commandName]); return; }
  const ctx = detectContext();
  console.log(`${color.bold(`MARS ${VERSION}`)}  ${color.dim('Marp Authoring & Rendering Studio')}`);
  if (ctx.stackRoot && !ctx.legacy) {
    const s = stackInfo(ctx.stackRoot);
    console.log(`${color.dim('Stack')}  ${s.title}${s.short_title ? ` (${s.short_title})` : ''}`);
    if (ctx.deck) console.log(`${color.dim('Deck ')}  ${ctx.deck.info.number} · ${ctx.deck.info.title}`);
  } else if (ctx.legacy) console.log(warning('Legacy course detected — run mars migrate'));
  console.log(`\n${heading('Usage:')}\n  mars <command> [options]\n`);
  console.log(`${heading('Core')}`);
  console.log(twoColumn([
    ['dev', 'Start live preview'], ['build', 'Build Deck / Brick / Stack'], ['check', 'Validate the current Stack'], ['status', 'Display detected context'],
  ]));
  console.log(`\n${heading('Make')}`);
  console.log(twoColumn([
    ['make:stack', 'Create a Stack'], ['make:brick', 'Create a Brick'], ['make:deck', 'Create a Deck'], ['make:figure', 'Create a scientific figure source'],
  ]));
  console.log(`\n${heading('Registry')}`);
  console.log(twoColumn([
    ['park', 'Register the current root'], ['unpark', 'Remove a parked root'], ['paths', 'List parked roots'], ['list', 'List known Stacks'], ['open', 'Open a Stack'], ['link', 'Link an individual Stack'], ['unlink', 'Remove a linked Stack'],
  ]));
  console.log(`\n${heading('Tools')}`);
  console.log(twoColumn([
    ['figures', 'Generate scientific figures'], ['doctor', 'Diagnose the environment'], ['sync', 'Synchronize MARS resources'], ['clean', 'Remove generated outputs'], ['migrate', 'Migrate a 0.6 course'], ['guide', 'Show the MARS design guide'], ['completion', 'Generate shell completion'], ['menu', 'Open compact interactive menu'],
  ]));
  console.log(`\n${color.dim('Run “mars help <command>” or “mars <command> --help” for details.')}`);
}

async function compactMenu() {
  while (true) {
    const ctx = detectContext();
    const label = ctx.stackRoot && !ctx.legacy ? titleOf(ctx.stack, ctx.stackRoot) : 'No Stack';
    console.log(`\n${color.bold('MARS')} ${color.dim(`· ${label}`)}`);
    const top = await choose('Menu', [
      { label: 'Author', value: 'author' },
      { label: 'Preview & Build', value: 'build' },
      { label: 'Stack', value: 'stack' },
      { label: 'Tools', value: 'tools' },
      { label: 'Quit', value: 'quit' },
    ]);
    if (top.value === 'quit') return;
    if (top.value === 'author') {
      const o = await choose('Author', [
        { label: 'New Deck', value: 'deck' }, { label: 'New Brick', value: 'brick' }, { label: 'New Figure', value: 'figure' }, { label: 'Back', value: 'back' },
      ]);
      if (o.value === 'deck') await makeDeck(); else if (o.value === 'brick') await makeBrick(); else if (o.value === 'figure') await makeFigure();
    } else if (top.value === 'build') {
      const o = await choose('Preview & Build', [
        { label: 'Live preview', value: 'dev' }, { label: 'Build current Deck', value: 'deck' }, { label: 'Build current Brick', value: 'brick' }, { label: 'Build complete Stack', value: 'stack' }, { label: 'Check Stack', value: 'check' }, { label: 'Back', value: 'back' },
      ]);
      if (o.value === 'dev') await dev(); else if (o.value === 'deck') await buildOne(); else if (o.value === 'brick') await buildCommand(['--brick']); else if (o.value === 'stack') await buildCommand(['--stack']); else if (o.value === 'check') await checkCommand();
    } else if (top.value === 'stack') {
      const o = await choose('Stack', [
        { label: 'Status', value: 'status' }, { label: 'Open', value: 'open' }, { label: 'List known Stacks', value: 'list' }, { label: 'Park current root', value: 'park' }, { label: 'Back', value: 'back' },
      ]);
      if (o.value === 'status') status(); else if (o.value === 'open') await openCommand(); else if (o.value === 'list') listCommand(); else if (o.value === 'park') parkCommand();
    } else if (top.value === 'tools') {
      const o = await choose('Tools', [
        { label: 'Doctor', value: 'doctor' }, { label: 'Sync', value: 'sync' }, { label: 'Clean', value: 'clean' }, { label: 'Guide', value: 'guide' }, { label: 'Back', value: 'back' },
      ]);
      if (o.value === 'doctor') doctor(); else if (o.value === 'sync') await syncCommand(); else if (o.value === 'clean') await cleanCommand(); else if (o.value === 'guide') guide(false);
    }
  }
}

export async function main(argv = process.argv.slice(2)) {
  const filtered = argv.filter(a => a !== '--no-ansi');
  const [cmd, ...args] = filtered;
  try {
    if (!cmd) return printHelp();
    if (cmd === '--version' || cmd === '-V' || cmd === 'version') return console.log(VERSION);
    if (cmd === '--help' || cmd === '-h') return printHelp();
    if (cmd === 'help') return printHelp(args[0] || null);
    if (args.includes('--help') || args.includes('-h')) return printHelp(cmd);

    if (cmd === 'setup') return setup();
    if (cmd === 'menu') return await compactMenu();
    if (cmd === 'status') return status();
    if (cmd === 'check') return await checkCommand();
    if (cmd === 'dev' || cmd === 'preview') return await dev(args[0] || null);
    if (cmd === 'build') return await buildCommand(args);
    if (cmd === 'figures') return await figuresCommand();
    if (cmd === 'clean') return await cleanCommand(args);
    if (cmd === 'sync') return await syncCommand();
    if (cmd === 'migrate') return await migrate(args[0] || null);
    if (cmd === 'doctor') return void doctor({ fix: args.includes('--fix') || args.includes('fix') });
    if (cmd === 'guide') return guide(args.includes('--pdf') || args.includes('pdf'));
    if (cmd === 'completion') return completion(args[0] || 'zsh');

    if (cmd === 'make:stack') return await makeStack(args);
    if (cmd === 'make:brick') return await makeBrick(args);
    if (cmd === 'make:deck') return await makeDeck(args);
    if (cmd === 'make:figure') return await makeFigure(args);
    if (cmd === 'make:chapter') return await makeDeck(args, 'lectures');
    if (cmd === 'make:td') return await makeDeck(args, 'tutorials');
    if (cmd === 'make:tp') return await makeDeck(args, 'labs');

    if (cmd === 'park') return parkCommand(args[0] || null);
    if (cmd === 'unpark') return unparkCommand(args[0] || null);
    if (cmd === 'paths') return pathsCommand();
    if (cmd === 'link') return linkCommand(args[0] || null);
    if (cmd === 'unlink') return unlinkCommand(args[0] || null);
    if (cmd === 'list') return listCommand();
    if (cmd === 'open') return await openCommand(args.join(' ') || null);

    // 0.6 aliases kept for a transition period.
    if (cmd === 'new') {
      console.log(warning('“mars new …” is deprecated. Use “mars make:*”.'));
      const [sub, ...rest] = args;
      if (!sub || sub === 'course') return await makeStack([...(sub === 'course' ? ['--preset', 'course'] : []), ...rest]);
      if (sub === 'chapter') return await makeDeck(rest, 'lectures');
      if (sub === 'td') return await makeDeck(rest, 'tutorials');
      if (sub === 'tp') return await makeDeck(rest, 'labs');
    }

    throw new Error(`Unknown command: ${filtered.join(' ')}`);
  } catch (e) {
    console.error(failure(e.message));
    process.exitCode = 1;
  }
}
