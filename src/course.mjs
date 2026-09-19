import fs from 'node:fs';
import path from 'node:path';
import { parseFlatYaml, writeFlatYaml } from './yaml.mjs';
import { loadProfile, loadUserConfig, touchRecent } from './config.mjs';
import { TEMPLATES_DIR, THEMES_DIR, SNIPPETS_FILE } from './paths.mjs';
import { TYPE_DIR, TYPE_LABEL, ensureDir, inferAcademicYear, slugify, copyFileIfExists, normalizeShortTitle, normalizeDocumentNumber, safePdfFilename, safePathWithin } from './utils.mjs';
import { normalizeCourseConfig, structuredCourseConfig, splitAuthor } from './course-config.mjs';
import { writeMarsLock } from './metadata.mjs';

export function courseInfo(courseRoot) {
  return normalizeCourseConfig(parseFlatYaml(path.join(courseRoot, 'course.yml')), courseRoot);
}

export function writeCourseConfig(courseRoot, info) {
  writeFlatYaml(path.join(courseRoot, 'course.yml'), structuredCourseConfig(info), 'MARS course configuration');
}

export function listDocuments(courseRoot, type) {
  const dir = path.join(courseRoot, TYPE_DIR[type]);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .filter(name => fs.existsSync(path.join(dir, name, 'slides.md')))
    .sort();
}

export function nextNumber(courseRoot, type) {
  let max = 0;
  for (const name of listDocuments(courseRoot, type)) {
    const m = name.match(/^(\d+)/);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return String(max + 1).padStart(2, '0');
}

export function courseShortTitle(info, courseRoot = '') {
  const explicit = info.short_title || info.abbreviation || info.code;
  if (explicit) return normalizeShortTitle(explicit);
  const base = String(info.name || path.basename(courseRoot) || 'COURSE').trim();
  const words = base.replace(/[-_]+/g, ' ').split(/\s+/).filter(Boolean);
  if (words.length >= 2) return normalizeShortTitle(words.map(w => w[0]).join(''));
  return normalizeShortTitle(base.slice(0, 3));
}

function outputPattern(info, type) {
  if (type === 'chapter') return info.output_chapter || '{short_title}_{number}.pdf';
  if (type === 'td') return info.output_td || '{short_title}_TD{number}.pdf';
  if (type === 'tp') return info.output_tp || '{short_title}_TP{number}.pdf';
  return '{short_title}_{number}.pdf';
}

export function documentPdfName(courseRoot, type, name) {
  const info = courseInfo(courseRoot);
  const short = courseShortTitle(info, courseRoot);
  const m = String(name).match(/^(\d{1,3})/);
  const n = (m ? m[1] : '01').padStart(2, '0');
  const filename = outputPattern(info, type)
    .replaceAll('{short_title}', short)
    .replaceAll('{number}', n)
    .replaceAll('{type}', type)
    .replaceAll('{course}', slugify(info.name || path.basename(courseRoot)));
  return safePdfFilename(filename);
}

function renderTemplate(templateName, vars) {
  let text = fs.readFileSync(path.join(TEMPLATES_DIR, `${templateName}.md`), 'utf8');
  for (const [key, value] of Object.entries(vars)) text = text.replaceAll(`{{${key}}}`, String(value ?? ''));
  return text;
}

export function ensureCourseStructure(courseRoot) {
  for (const rel of [
    'assets/branding', 'assets/common', 'assets/bibliography',
    'figures/src', 'figures/generated',
    'chapters', 'td', 'tp',
    'dist/chapters', 'dist/td', 'dist/tp',
    '.mars/themes', '.vscode',
  ]) ensureDir(path.join(courseRoot, rel));
}

function updateGitignore(courseRoot) {
  const file = path.join(courseRoot, '.gitignore');
  // Generated scientific figures are intentionally committed for portable previews/builds.
  const desired = ['dist/', '.mars/', '.DS_Store', '__pycache__/'];
  const existing = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split(/\r?\n/) : [];
  const lines = [...existing.filter(Boolean)];
  for (const d of desired) if (!lines.includes(d)) lines.push(d);
  fs.writeFileSync(file, `${lines.join('\n')}\n`);
}

function updateVsCodeSettings(courseRoot) {
  const file = path.join(courseRoot, '.vscode', 'settings.json');
  let data = {};
  if (fs.existsSync(file)) {
    try { data = JSON.parse(fs.readFileSync(file, 'utf8')); }
    catch {
      const backup = `${file}.before-mars`;
      fs.copyFileSync(file, backup);
      data = {};
    }
  }
  data['markdown.marp.themes'] = [
    './.mars/themes/marpx.css',
    './.mars/themes/gödel.css',
    './.mars/themes/mars.css',
  ];
  data['markdown.marp.html'] = 'all';
  data['markdown.marp.diagnostics.slideContentOverflow'] = true;
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

function ensureFiguresReadme(courseRoot) {
  const file = path.join(courseRoot, 'figures', 'README.md');
  if (fs.existsSync(file)) return;
  fs.writeFileSync(file, `# Figures scientifiques MARS\n\n- Placez les scripts Python reproductibles dans \`figures/src/\`.\n- Les scripts doivent écrire leurs sorties dans le dossier indiqué par \`MARS_FIGURE_OUT_DIR\`.\n- Les sorties SVG/PNG vont dans \`figures/generated/\` et peuvent être versionnées avec le cours.\n- Exécutez \`mars figures\` ou \`mars build --figures\`.\n\nExemple Python :\n\n\`\`\`python\nfrom pathlib import Path\nimport os\n\nout = Path(os.environ["MARS_FIGURE_OUT_DIR"])\nout.mkdir(parents=True, exist_ok=True)\n# sauvegarder ici : out / "ma-figure.svg"\n\`\`\`\n`);
}

export function syncCourse(courseRoot) {
  ensureCourseStructure(courseRoot);
  for (const name of ['marpx.css', 'gödel.css', 'mars.css']) {
    fs.copyFileSync(path.join(THEMES_DIR, name), path.join(courseRoot, '.mars', 'themes', name));
  }
  if (fs.existsSync(SNIPPETS_FILE)) fs.copyFileSync(SNIPPETS_FILE, path.join(courseRoot, '.vscode', 'mars.code-snippets'));
  updateVsCodeSettings(courseRoot);
  updateGitignore(courseRoot);
  ensureFiguresReadme(courseRoot);
  return courseRoot;
}

export function copyBranding(profile, courseRoot) {
  const dest = path.join(courseRoot, 'assets', 'branding');
  ensureDir(dest);
  if (profile.primary_logo) copyFileIfExists(path.join(profile.__dir, profile.primary_logo), path.join(dest, path.basename(profile.primary_logo)));
  if (profile.secondary_logo) copyFileIfExists(path.join(profile.__dir, profile.secondary_logo), path.join(dest, path.basename(profile.secondary_logo)));
}

export function createCourse({ parentDir, name, slug, shortTitle, academicYear, profileId, author, language, school, university, theme, footer }) {
  const user = loadUserConfig();
  const profile = loadProfile(profileId || user.default_profile || 'ensak-usms');
  const courseSlug = slugify(slug || name);
  const courseRoot = path.resolve(parentDir, courseSlug);
  if (fs.existsSync(courseRoot)) throw new Error(`Le dossier existe déjà : ${courseRoot}`);

  const authorFull = author || user.default_author || profile.author || 'Pr. Hamza Khalfi';
  const authorParts = splitAuthor(authorFull);
  const info = {
    mars: '0.6',
    name,
    slug: courseSlug,
    short_title: normalizeShortTitle(shortTitle || courseShortTitle({ name }, courseRoot)),
    academic_year: academicYear || inferAcademicYear(),
    profile: profile.id || profileId || 'ensak-usms',
    author: authorFull,
    author_title: authorParts.title,
    author_name: authorParts.name,
    school: school || profile.school || '',
    university: university || profile.university || '',
    language: language || user.default_language || profile.language || 'fr',
    theme: theme || profile.theme || 'mars',
    footer: footer || profile.footer || `${profile.school || ''} · ${profile.university || ''}`.replace(/^ · | · $/g, ''),
    output_chapter: '{short_title}_{number}.pdf',
    output_td: '{short_title}_TD{number}.pdf',
    output_tp: '{short_title}_TP{number}.pdf',
  };

  ensureCourseStructure(courseRoot);
  writeCourseConfig(courseRoot, info);
  copyBranding(profile, courseRoot);
  syncCourse(courseRoot);
  writeMarsLock(courseRoot, { shortTitle: info.short_title, theme: info.theme, profile: info.profile });
  touchRecent(courseRoot);
  return { root: courseRoot, info };
}

export function addDocument(courseRoot, type, { number, title }) {
  if (!TYPE_DIR[type]) throw new Error(`Type de document inconnu : ${type}`);
  const info = courseInfo(courseRoot);
  const profile = loadProfile(info.profile || 'ensak-usms');
  const n = normalizeDocumentNumber(number || nextNumber(courseRoot, type));
  const dirname = `${n}-${slugify(title)}`;
  const dir = path.join(courseRoot, TYPE_DIR[type], dirname);
  if (fs.existsSync(dir)) throw new Error(`${TYPE_LABEL[type]} déjà présent : ${dirname}`);
  ensureDir(path.join(dir, 'assets'));
  if (type === 'tp') ensureDir(path.join(dir, 'notebooks'));

  const text = renderTemplate(type, {
    THEME: info.theme || 'mars',
    LANGUAGE: info.language || 'fr',
    TITLE: title,
    AUTHOR: info.author || 'Pr. Hamza Khalfi',
    NUMBER: n,
    COURSE_NAME: info.name || path.basename(courseRoot),
    ACADEMIC_YEAR: info.academic_year || inferAcademicYear(),
    SCHOOL: info.school || '',
    UNIVERSITY: info.university || '',
    FOOTER: info.footer || `${info.school || ''} · ${info.university || ''}`.replace(/^ · | · $/g, ''),
    PRIMARY_LOGO: path.basename(profile.primary_logo || 'ensak-logo.png'),
    PRIMARY_LOGO_ALT: profile.primary_logo_alt || profile.school || 'Logo principal',
    SECONDARY_LOGO: path.basename(profile.secondary_logo || 'usms-logo.png'),
    SECONDARY_LOGO_ALT: profile.secondary_logo_alt || profile.university || 'Logo secondaire',
  });
  fs.writeFileSync(path.join(dir, 'slides.md'), text);
  syncCourse(courseRoot);
  touchRecent(courseRoot);
  return { root: dir, source: path.join(dir, 'slides.md'), name: dirname, type };
}

export function documentPaths(courseRoot, type, name) {
  const source = safePathWithin(courseRoot, path.join(courseRoot, TYPE_DIR[type], name, 'slides.md'), 'Source');
  if (!fs.existsSync(source)) throw new Error(`Source introuvable : ${source}`);
  const outDir = safePathWithin(path.join(courseRoot, 'dist'), path.join(courseRoot, 'dist', TYPE_DIR[type]), 'Dossier de sortie');
  ensureDir(outDir);
  const output = safePathWithin(path.join(courseRoot, 'dist'), path.join(outDir, documentPdfName(courseRoot, type, name)), 'PDF de sortie');
  return { source, output };
}

export function findDocumentFromPath(inputPath) {
  const p = path.resolve(inputPath);
  if (fs.existsSync(p) && fs.statSync(p).isFile()) {
    if (path.basename(p) !== 'slides.md') throw new Error('Le fichier doit être un slides.md MARS.');
    return p;
  }
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
    const source = path.join(p, 'slides.md');
    if (fs.existsSync(source)) return source;
  }
  return null;
}

export function migrateCourse(courseRoot) {
  const file = path.join(courseRoot, 'course.yml');
  if (!fs.existsSync(file)) throw new Error(`course.yml introuvable : ${courseRoot}`);
  const info = courseInfo(courseRoot);
  const user = loadUserConfig();
  const profile = loadProfile(info.profile || user.default_profile || 'ensak-usms');
  ensureCourseStructure(courseRoot);
  copyBranding(profile, courseRoot);

  let changed = 0;
  for (const type of ['chapter', 'td', 'tp']) {
    for (const name of listDocuments(courseRoot, type)) {
      const source = safePathWithin(courseRoot, path.join(courseRoot, TYPE_DIR[type], name, 'slides.md'), 'Source');
      const before = fs.readFileSync(source, 'utf8');
      const after = before
        .replaceAll('../../../shared/branding/ensak-logo.png', '../../assets/branding/ensak-logo.png')
        .replaceAll('../../../shared/branding/usms-logo.png', '../../assets/branding/usms-logo.png')
        .replaceAll('../../../assets/branding/ensak-logo.png', '../../assets/branding/ensak-logo.png')
        .replaceAll('../../../assets/branding/usms-logo.png', '../../assets/branding/usms-logo.png');
      if (after !== before) {
        fs.writeFileSync(source, after);
        changed += 1;
      }
    }
  }

  const migrated = {
    ...info,
    mars: '0.6',
    short_title: info.short_title || courseShortTitle(info, courseRoot),
    output_chapter: info.output_chapter || '{short_title}_{number}.pdf',
    output_td: info.output_td || '{short_title}_TD{number}.pdf',
    output_tp: info.output_tp || '{short_title}_TP{number}.pdf',
  };
  writeCourseConfig(courseRoot, migrated);
  syncCourse(courseRoot);
  writeMarsLock(courseRoot, { shortTitle: migrated.short_title, theme: migrated.theme, profile: migrated.profile });
  touchRecent(courseRoot);
  return { courseRoot, changed };
}
