import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

export const TYPE_DIR = { chapter: 'chapters', td: 'td', tp: 'tp' };
export const TYPE_LABEL = { chapter: 'Chapitre', td: 'TD', tp: 'TP' };

export function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'document';
}

export function normalizeShortTitle(value, fallback = 'COURSE') {
  const token = String(value || fallback)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9_-]+/g, '')
    .toUpperCase();
  if (!token) throw new Error('Abréviation de cours invalide.');
  return token;
}

export function normalizeDocumentNumber(value) {
  const raw = String(value ?? '').trim();
  if (!/^\d{1,2}$/.test(raw)) throw new Error(`Numéro de document invalide : ${raw || 'vide'}. Utilisez un entier entre 01 et 99.`);
  const n = Number(raw);
  if (n < 1 || n > 99) throw new Error(`Numéro de document invalide : ${raw}. Utilisez un entier entre 01 et 99.`);
  return String(n).padStart(2, '0');
}

export function inferAcademicYear(date = new Date()) {
  const y = date.getFullYear();
  return date.getMonth() >= 6 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

export function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
export function fileExists(...parts) { return fs.existsSync(path.join(...parts)); }

export function isPathWithin(root, candidate) {
  const r = path.resolve(root);
  const c = path.resolve(candidate);
  const rel = path.relative(r, c);
  return rel === '' || (!rel.startsWith(`..${path.sep}`) && rel !== '..' && !path.isAbsolute(rel));
}

export function safePathWithin(root, candidate, label = 'chemin') {
  const resolved = path.resolve(candidate);
  if (!isPathWithin(root, resolved)) throw new Error(`${label} hors du périmètre autorisé : ${resolved}`);
  return resolved;
}

export function safePdfFilename(value) {
  const name = String(value || '').trim();
  if (!name || path.basename(name) !== name || name.includes('..') || /[\\/]/.test(name)) {
    throw new Error(`Nom de PDF invalide : ${name || 'vide'}`);
  }
  if (!name.toLowerCase().endsWith('.pdf')) throw new Error(`Le nom de sortie doit se terminer par .pdf : ${name}`);
  return name;
}

export function commandVersion(cmd, args = ['--version']) {
  const r = spawnSync(cmd, args, { encoding: 'utf8' });
  if (r.error || r.status !== 0) return null;
  return (r.stdout || r.stderr || '').trim();
}

export function commandExists(cmd) {
  const finder = process.platform === 'win32' ? 'where' : 'which';
  const r = spawnSync(finder, [cmd], { stdio: 'ignore' });
  return r.status === 0;
}

export function browserInfo() {
  const candidates = [];
  if (process.platform === 'darwin') {
    candidates.push(
      ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', 'Google Chrome'],
      ['/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge', 'Microsoft Edge'],
      ['/Applications/Firefox.app/Contents/MacOS/firefox', 'Firefox'],
    );
  }
  if (process.platform === 'win32') {
    const local = process.env.LOCALAPPDATA || '';
    const programFiles = process.env.PROGRAMFILES || '';
    const programFilesX86 = process.env['PROGRAMFILES(X86)'] || '';
    candidates.push(
      [path.join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'), 'Google Chrome'],
      [path.join(programFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'), 'Microsoft Edge'],
      [path.join(local, 'Mozilla Firefox', 'firefox.exe'), 'Firefox'],
    );
  }
  for (const [p, name] of candidates) if (p && fs.existsSync(p)) return name;
  for (const [cmd, name] of [['google-chrome', 'Google Chrome'], ['chromium', 'Chromium'], ['microsoft-edge', 'Microsoft Edge'], ['firefox', 'Firefox']]) {
    if (commandExists(cmd)) return name;
  }
  return null;
}

export function copyFileIfExists(src, dest) {
  if (!fs.existsSync(src)) return false;
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
  return true;
}

export function relativeDisplay(base, target) {
  const rel = path.relative(base, target);
  return rel || '.';
}
