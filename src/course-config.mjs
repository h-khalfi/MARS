export function splitAuthor(full = '') {
  const text = String(full || '').trim();
  if (!text) return { title: '', name: '', full: '' };
  const m = text.match(/^((?:Pr\.|Prof\.|Dr\.|Mme\.|M\.)\s+)(.+)$/i);
  if (!m) return { title: '', name: text, full: text };
  return { title: m[1].trim(), name: m[2].trim(), full: text };
}

export function normalizeCourseConfig(raw = {}, courseRoot = '') {
  const authorTitle = raw['author.title'] ?? '';
  const authorName = raw['author.name'] ?? '';
  const authorFull = raw['author.full'] || [authorTitle, authorName].filter(Boolean).join(' ').trim() || raw.author || '';
  return {
    mars: raw['mars.version'] ?? raw['mars.compatibility'] ?? raw.mars ?? '',
    name: raw['course.title'] ?? raw.name ?? '',
    slug: raw['course.slug'] ?? raw.slug ?? '',
    short_title: raw['course.short_title'] ?? raw.short_title ?? raw.abbreviation ?? raw.code ?? '',
    language: raw['course.language'] ?? raw.language ?? 'fr',
    academic_year: raw['academic.year'] ?? raw.academic_year ?? '',
    profile: raw['institution.profile'] ?? raw.profile ?? 'ensak-usms',
    author: authorFull,
    author_title: authorTitle || splitAuthor(authorFull).title,
    author_name: authorName || splitAuthor(authorFull).name,
    school: raw['institution.school'] ?? raw.school ?? '',
    university: raw['institution.university'] ?? raw.university ?? '',
    theme: raw['theme.name'] ?? raw.theme ?? 'mars',
    footer: raw['footer.text'] ?? raw.footer ?? '',
    output_chapter: raw['output.chapter'] ?? '{short_title}_{number}.pdf',
    output_td: raw['output.td'] ?? '{short_title}_TD{number}.pdf',
    output_tp: raw['output.tp'] ?? '{short_title}_TP{number}.pdf',
    __raw: raw,
    __courseRoot: courseRoot,
  };
}

export function structuredCourseConfig(info) {
  const author = splitAuthor(info.author || [info.author_title, info.author_name].filter(Boolean).join(' '));
  return {
    'mars.schema': 1,
    'mars.compatibility': '0.6',
    'course.title': info.name,
    'course.slug': info.slug,
    'course.short_title': info.short_title,
    'course.language': info.language || 'fr',
    'academic.year': info.academic_year,
    'author.title': info.author_title || author.title,
    'author.name': info.author_name || author.name,
    'author.full': info.author || author.full,
    'institution.profile': info.profile || 'ensak-usms',
    'institution.school': info.school || '',
    'institution.university': info.university || '',
    'theme.name': info.theme || 'mars',
    'footer.text': info.footer || '',
    'output.chapter': info.output_chapter || '{short_title}_{number}.pdf',
    'output.td': info.output_td || '{short_title}_TD{number}.pdf',
    'output.tp': info.output_tp || '{short_title}_TP{number}.pdf',
  };
}
