import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createStack, addBrick, addDeck, listBricks, listDecks, deckPdfName, deckPaths, migrateLegacyCourse, stackInfo } from '../src/stack.mjs';
import { detectContext } from '../src/context.mjs';
import { MARS_ROOT } from '../src/paths.mjs';

function temp(name) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), `${name}-`));
  process.env.MARS_CONFIG_HOME = path.join(base, '.config');
  return base;
}

function makeCourseStack(base, title = 'Deep Learning') {
  return createStack({
    parentDir: base,
    title,
    slug: 'deep-learning',
    shortTitle: 'DL',
    preset: 'course',
    academicYear: '2026-2027',
    profileId: 'ensak-usms',
    author: 'Pr. Hamza Khalfi',
    language: 'fr',
  });
}

test('createStack creates the Stack/Brick structure for a course preset', () => {
  const base = temp('mars-stack');
  const { root } = makeCourseStack(base);
  assert.ok(fs.existsSync(path.join(root, 'mars.yml')));
  assert.equal(stackInfo(root).title, 'Deep Learning');
  assert.equal(stackInfo(root).preset, 'course');
  const bricks = listBricks(root);
  assert.equal(bricks.length, 3);
  assert.deepEqual(bricks.map(b => b.info.kind), ['lectures', 'tutorials', 'labs']);
  assert.ok(fs.existsSync(path.join(root, 'assets', 'branding', 'ensak-logo.png')));
  assert.ok(fs.existsSync(path.join(root, '.mars', 'themes', 'mars.css')));
  assert.ok(fs.existsSync(path.join(root, 'mars.lock')));
});

test('Stack hierarchy is Stack -> Brick -> Deck -> slides.md', () => {
  const base = temp('mars-hierarchy');
  const { root } = makeCourseStack(base);
  const brick = listBricks(root).find(b => b.info.kind === 'lectures');
  const deck = addDeck(root, brick.root, { number: '01', title: 'Introduction au Deep Learning' });
  assert.ok(fs.existsSync(path.join(deck.root, 'deck.yml')));
  assert.ok(fs.existsSync(deck.source));
  const md = fs.readFileSync(deck.source, 'utf8');
  assert.match(md, /math:\s*mathjax/);
  assert.match(md, /src="\.\.\/\.\.\/assets\/branding\/ensak-logo\.png"/);
  assert.match(md, /Chapitre 01 · Deep Learning/);
  assert.match(md, /Année universitaire : 2026-2027/);
});

test('course preset preserves expected PDF naming through Brick output patterns', () => {
  const base = temp('mars-output');
  const { root } = makeCourseStack(base);
  const bricks = Object.fromEntries(listBricks(root).map(b => [b.info.kind, b]));
  const chapter = addDeck(root, bricks.lectures.root, { number: '01', title: 'Introduction' });
  const td = addDeck(root, bricks.tutorials.root, { number: '02', title: 'Exercises' });
  const tp = addDeck(root, bricks.labs.root, { number: '03', title: 'PyTorch' });
  assert.equal(deckPdfName(root, bricks.lectures.root, chapter.root), 'DL_01.pdf');
  assert.equal(deckPdfName(root, bricks.tutorials.root, td.root), 'DL_TD02.pdf');
  assert.equal(deckPdfName(root, bricks.labs.root, tp.root), 'DL_TP03.pdf');
});

test('detectContext resolves Stack, Brick and Deck from nested folders', () => {
  const base = temp('mars-context');
  const { root } = makeCourseStack(base);
  const brick = listBricks(root)[0];
  const deck = addDeck(root, brick.root, { number: '01', title: 'Introduction' });
  const nested = path.join(deck.root, 'assets');
  const ctx = detectContext(nested);
  assert.equal(ctx.stackRoot, root);
  assert.equal(ctx.brick.root, brick.root);
  assert.equal(ctx.deck.root, deck.root);
  assert.equal(ctx.deck.info.number, '01');
});

test('generic Stack preset can add arbitrary Bricks and Decks', () => {
  const base = temp('mars-generic');
  const { root } = createStack({ parentDir: base, title: 'AI Symposium', slug: 'ai-symposium', shortTitle: 'AIS', preset: 'conference', profileId: 'ensak-usms', author: 'Dr. A', language: 'en' });
  const custom = addBrick(root, { title: 'Workshops', slug: 'workshops', shortTitle: 'WS', kind: 'workshops', deckLabel: 'Workshop', outputPattern: '{stack.short}_{brick.short}{deck.number}.pdf' });
  const deck = addDeck(root, custom.root, { number: '01', title: 'Scientific ML' });
  assert.equal(deckPdfName(root, custom.root, deck.root), 'AIS_WS01.pdf');
});

test('legacy 0.6 course migrates without moving slides', async () => {
  const { createCourse, addDocument } = await import('../src/course.mjs');
  const base = temp('mars-migrate');
  const { root } = createCourse({ parentDir: base, name: 'Deep Learning', slug: 'deep-learning', shortTitle: 'DL', academicYear: '2026-2027', profileId: 'ensak-usms', author: 'Pr. Hamza Khalfi', language: 'fr' });
  const legacy = addDocument(root, 'chapter', { number: '01', title: 'Introduction' });
  const before = fs.readFileSync(legacy.source, 'utf8');
  const result = migrateLegacyCourse(root);
  assert.ok(fs.existsSync(path.join(root, 'mars.yml')));
  assert.ok(fs.existsSync(path.join(root, 'chapters', 'brick.yml')));
  assert.ok(fs.existsSync(path.join(legacy.root, 'deck.yml')));
  assert.equal(fs.readFileSync(legacy.source, 'utf8'), before);
  assert.equal(result.decks, 1);
  const ctx = detectContext(legacy.source);
  assert.equal(ctx.legacy, false);
  assert.equal(ctx.deck.root, legacy.root);
});

test('registry park supports multiple roots and discovers direct child Stacks', async () => {
  const { park, discoverParkedStacks, readRegistry } = await import('../src/registry.mjs');
  const base = temp('mars-park');
  const courses = path.join(base, 'Courses'); const talks = path.join(base, 'Talks');
  fs.mkdirSync(courses); fs.mkdirSync(talks);
  createStack({ parentDir: courses, title: 'Deep Learning', slug: 'deep-learning', shortTitle: 'DL', preset: 'course', profileId: 'ensak-usms', author: 'Pr. H', language: 'fr' });
  createStack({ parentDir: talks, title: 'AI Talk', slug: 'ai-talk', shortTitle: 'AIT', preset: 'conference', profileId: 'ensak-usms', author: 'Pr. H', language: 'en' });
  park(courses); park(talks);
  assert.equal(readRegistry().parked.length, 2);
  const found = discoverParkedStacks();
  assert.deepEqual(found.map(x => x.info.title).sort(), ['AI Talk', 'Deep Learning']);
});

test('state remembers the last Deck', async () => {
  const { rememberDeck, lastDeck } = await import('../src/state.mjs');
  const base = temp('mars-state');
  const { root } = makeCourseStack(base);
  const brick = listBricks(root)[0];
  const deck = addDeck(root, brick.root, { number: '01', title: 'Introduction' });
  rememberDeck(root, deck);
  assert.equal(lastDeck(root).source, deck.source);
});

test('checkStack reports broken assets', async () => {
  const { checkStack } = await import('../src/check.mjs');
  const base = temp('mars-check');
  const { root } = makeCourseStack(base);
  const brick = listBricks(root)[0];
  const deck = addDeck(root, brick.root, { number: '01', title: 'Introduction' });
  fs.appendFileSync(deck.source, '\n![Missing](assets/missing.svg)\n');
  const result = checkStack(root);
  assert.equal(result.ok, false);
  assert.ok(result.issues.some(i => i.message.includes('asset not found')));
});

test('cleanStack removes generated output and preserves source state/themes', async () => {
  const { cleanStack } = await import('../src/clean.mjs');
  const { rememberDeck } = await import('../src/state.mjs');
  const base = temp('mars-clean');
  const { root } = makeCourseStack(base);
  const brick = listBricks(root)[0];
  const deck = addDeck(root, brick.root, { number: '01', title: 'Introduction' });
  rememberDeck(root, deck);
  const paths = deckPaths(root, brick.root, deck.root);
  fs.writeFileSync(paths.output, 'fake');
  cleanStack(root);
  assert.equal(fs.existsSync(paths.output), false);
  assert.equal(fs.existsSync(path.join(root, '.mars', 'state.json')), true);
  assert.equal(fs.existsSync(path.join(root, '.mars', 'themes', 'mars.css')), true);
});

test('figure pipeline works at Stack scope and exports Stack environment variables', async (t) => {
  const { runFigures, figureSummary, pythonCommand } = await import('../src/figures.mjs');
  if (!pythonCommand()) return t.skip('Python not available');
  const base = temp('mars-figures');
  const { root } = makeCourseStack(base);
  const script = path.join(root, 'figures', 'src', 'demo.py');
  fs.writeFileSync(script, [
    'from pathlib import Path', 'import os',
    'out = Path(os.environ["MARS_FIGURE_OUT_DIR"])',
    'assert os.environ["MARS_STACK_ROOT"]',
    'out.mkdir(parents=True, exist_ok=True)',
    '(out / "demo.svg").write_text("<svg xmlns=\\"http://www.w3.org/2000/svg\\"></svg>")',
  ].join('\n'));
  assert.equal(figureSummary(root, { all: true }).stale, 1);
  runFigures(root, { all: true, quiet: true });
  assert.equal(figureSummary(root, { all: true }).stale, 0);
});

test('figure freshness remains independent per script', async (t) => {
  const { runFigures, figureSummary, pythonCommand } = await import('../src/figures.mjs');
  if (!pythonCommand()) return t.skip('Python not available');
  const base = temp('mars-figure-independent');
  const { root } = makeCourseStack(base);
  for (const name of ['a', 'b']) {
    fs.writeFileSync(path.join(root, 'figures', 'src', `${name}.py`), [
      'from pathlib import Path', 'import os', 'out = Path(os.environ["MARS_FIGURE_OUT_DIR"])', 'out.mkdir(parents=True, exist_ok=True)',
      `(out / "${name}.svg").write_text("<svg xmlns='http://www.w3.org/2000/svg'></svg>")`,
    ].join('\n'));
  }
  runFigures(root, { all: true, quiet: true });
  fs.appendFileSync(path.join(root, 'figures', 'src', 'a.py'), '\n# changed\n');
  const summary = figureSummary(root, { all: true });
  assert.equal(summary.stale, 1);
  assert.match(summary.jobs.find(j => j.stale).job.script, /a\.py$/);
});

test('unsafe Brick output pattern cannot escape dist', () => {
  const base = temp('mars-safe-output');
  const { root } = makeCourseStack(base);
  const brick = listBricks(root)[0];
  const cfg = fs.readFileSync(path.join(brick.root, 'brick.yml'), 'utf8').replace(/output\.pattern:.*/, 'output.pattern: "../../escape.pdf"');
  fs.writeFileSync(path.join(brick.root, 'brick.yml'), cfg);
  const deck = addDeck(root, brick.root, { number: '01', title: 'Unsafe' });
  assert.throws(() => deckPdfName(root, brick.root, deck.root), /Nom de PDF invalide|PDF invalide/);
});

test('Deck numbers remain restricted to 01..99', () => {
  const base = temp('mars-safe-number');
  const { root } = makeCourseStack(base);
  const brick = listBricks(root)[0];
  assert.throws(() => addDeck(root, brick.root, { number: '../2', title: 'Unsafe' }), /Numéro de document invalide/);
  assert.throws(() => addDeck(root, brick.root, { number: '00', title: 'Zero' }), /Numéro de document invalide/);
});

test('default mars command is compact console help, not the large interactive menu', () => {
  const base = temp('mars-help');
  const r = spawnSync(process.execPath, [path.join(MARS_ROOT, 'bin', 'mars.mjs'), '--no-ansi'], {
    cwd: base,
    env: { ...process.env, MARS_CONFIG_HOME: path.join(base, '.config'), NO_COLOR: '1' },
    encoding: 'utf8',
  });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /Marp Authoring & Rendering Studio/);
  assert.match(r.stdout, /Core/);
  assert.match(r.stdout, /Make/);
  assert.match(r.stdout, /Registry/);
  assert.doesNotMatch(r.stdout, /Que voulez-vous faire/);
});

test('shell completion exposes Stack/Brick/Deck and park commands', () => {
  const base = temp('mars-completion');
  const r = spawnSync(process.execPath, [path.join(MARS_ROOT, 'bin', 'mars.mjs'), 'completion', 'zsh'], { cwd: base, env: { ...process.env, MARS_CONFIG_HOME: path.join(base, '.config') }, encoding: 'utf8' });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /make:stack/);
  assert.match(r.stdout, /make:brick/);
  assert.match(r.stdout, /make:deck/);
  assert.match(r.stdout, /park/);
});

test('plain profile supports non-academic Stacks without institutional logos', () => {
  const base = temp('mars-plain');
  const { root } = createStack({ parentDir: base, title: 'Product Demo', slug: 'product-demo', shortTitle: 'PD', preset: 'conference', profileId: 'plain', author: 'Alex Doe', language: 'en' });
  const brick = listBricks(root)[0];
  const deck = addDeck(root, brick.root, { number: '01', title: 'Launch' });
  const md = fs.readFileSync(deck.source, 'utf8');
  assert.doesNotMatch(md, /logo-primary|logo-secondary/);
  assert.doesNotMatch(md, /ensak-logo|usms-logo/);
});
