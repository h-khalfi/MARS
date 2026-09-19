import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { commandExists, ensureDir } from './utils.mjs';
import { allDecks } from './stack.mjs';

function pyFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(e => e.isFile() && e.name.endsWith('.py') && !e.name.startsWith('_'))
    .map(e => path.join(dir, e.name)).sort();
}

function scopeJobs(scopeRoot, scopeKind, stackRoot, deckRoot = null) {
  const srcDir = path.join(scopeRoot, 'figures', 'src');
  const outDir = path.join(scopeRoot, 'figures', 'generated');
  return pyFiles(srcDir).map(script => ({ script, outDir, scopeRoot, scopeKind, stackRoot, deckRoot }));
}

export function discoverFigureJobs(stackRoot, { deck = null, all = false } = {}) {
  const jobs = [...scopeJobs(stackRoot, 'stack', stackRoot)];
  if (deck && !all) {
    jobs.push(...scopeJobs(deck.root, 'deck', stackRoot, deck.root));
    return jobs;
  }
  for (const item of allDecks(stackRoot)) jobs.push(...scopeJobs(item.root, `deck:${item.name}`, stackRoot, item.root));
  return jobs;
}

export function pythonCommand() {
  if (process.env.MARS_PYTHON && commandExists(process.env.MARS_PYTHON)) return process.env.MARS_PYTHON;
  for (const cmd of ['python3', 'python']) if (commandExists(cmd)) return cmd;
  return null;
}

function hashFile(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}
function stateFile(stackRoot) { return path.join(stackRoot, '.mars', 'figures-state.json'); }
function readState(stackRoot) {
  try { return JSON.parse(fs.readFileSync(stateFile(stackRoot), 'utf8')); }
  catch { return { schema: 1, scripts: {} }; }
}
function writeState(stackRoot, state) {
  ensureDir(path.join(stackRoot, '.mars'));
  fs.writeFileSync(stateFile(stackRoot), `${JSON.stringify(state, null, 2)}\n`);
}
function jobKey(job) { return path.relative(job.stackRoot, job.script).split(path.sep).join('/'); }
function snapshot(dir) {
  const map = new Map();
  if (!fs.existsSync(dir)) return map;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!e.isFile() || e.name.startsWith('.')) continue;
    const f = path.join(dir, e.name); const s = fs.statSync(f);
    map.set(f, `${s.size}:${s.mtimeMs}`);
  }
  return map;
}

export function figureJobState(job) {
  const state = readState(job.stackRoot);
  const entry = state.scripts?.[jobKey(job)];
  if (!entry) return { stale: true, outputs: [], reason: 'no generation state recorded' };
  const hash = hashFile(job.script);
  if (entry.hash !== hash) return { stale: true, outputs: entry.outputs || [], reason: 'source script changed' };
  const outputs = (entry.outputs || []).map(rel => path.resolve(job.stackRoot, rel));
  if (!outputs.length) return { stale: true, outputs: [], reason: 'no outputs recorded' };
  const missing = outputs.filter(f => !fs.existsSync(f));
  if (missing.length) return { stale: true, outputs, reason: 'one or more outputs are missing' };
  return { stale: false, outputs, reason: '' };
}

export function figureSummary(stackRoot, opts = {}) {
  const states = discoverFigureJobs(stackRoot, opts).map(job => ({ job, ...figureJobState(job) }));
  return { jobs: states, total: states.length, stale: states.filter(s => s.stale).length, ready: states.filter(s => !s.stale).length };
}

export function runFigures(stackRoot, { deck = null, all = false, quiet = false, staleOnly = false } = {}) {
  let jobs = discoverFigureJobs(stackRoot, { deck, all });
  if (staleOnly) jobs = jobs.filter(job => figureJobState(job).stale);
  if (!jobs.length) {
    if (!quiet) console.log(staleOnly ? 'No stale figures.' : 'No Python figure scripts found.');
    return { total: 0, ok: 0 };
  }
  const python = pythonCommand();
  if (!python) throw new Error('Python is required to generate figures. Install python3 or define MARS_PYTHON.');
  const state = readState(stackRoot); state.schema = 1; state.scripts ||= {};
  let ok = 0;
  for (const job of jobs) {
    ensureDir(job.outDir);
    if (!quiet) console.log(`→ Figure: ${path.relative(stackRoot, job.script)}`);
    const before = snapshot(job.outDir);
    const r = spawnSync(python, [job.script], {
      cwd: path.dirname(job.script), stdio: quiet ? 'pipe' : 'inherit', encoding: 'utf8',
      env: {
        ...process.env,
        MARS_STACK_ROOT: stackRoot,
        MARS_DECK_ROOT: job.deckRoot || '',
        MARS_FIGURE_OUT_DIR: job.outDir,
        // legacy environment variables kept through 0.7
        MARS_COURSE_ROOT: stackRoot,
        MARS_DOCUMENT_ROOT: job.deckRoot || '',
      },
    });
    if (r.error) throw r.error;
    if (r.status !== 0) {
      const detail = quiet ? `\n${r.stdout || ''}${r.stderr || ''}` : '';
      throw new Error(`Figure script ${path.basename(job.script)} failed (code ${r.status}).${detail}`);
    }
    const after = snapshot(job.outDir);
    const changed = [...after.entries()].filter(([f, sig]) => !before.has(f) || before.get(f) !== sig).map(([f]) => f);
    const previous = state.scripts[jobKey(job)]?.outputs || [];
    const outputs = changed.length ? changed : previous.map(rel => path.resolve(stackRoot, rel)).filter(fs.existsSync);
    if (!outputs.length) throw new Error(`${path.basename(job.script)} produced no detectable output in ${job.outDir}.`);
    state.scripts[jobKey(job)] = {
      hash: hashFile(job.script),
      outputs: outputs.map(f => path.relative(stackRoot, f).split(path.sep).join('/')),
      generated_at: new Date().toISOString(),
    };
    writeState(stackRoot, state);
    ok += 1;
  }
  if (!quiet) console.log(`\n✓ ${ok} figure script(s) executed.`);
  return { total: jobs.length, ok };
}
