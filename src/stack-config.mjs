export function splitAuthor(full = '') {
  const text = String(full || '').trim();
  if (!text) return { title: '', name: '', full: '' };
  const m = text.match(/^((?:Pr\.|Prof\.|Dr\.|Mme\.|M\.)\s+)(.+)$/i);
  if (!m) return { title: '', name: text, full: text };
  return { title: m[1].trim(), name: m[2].trim(), full: text };
}

export function normalizeStackConfig(raw = {}, stackRoot = '') {
  const authorTitle = raw['author.title'] ?? '';
  const authorName = raw['author.name'] ?? '';
  const authorFull = raw['author.full'] || [authorTitle, authorName].filter(Boolean).join(' ').trim() || raw.author || '';
  return {
    schema: raw['mars.schema'] ?? 1,
    compatibility: raw['mars.compatibility'] ?? raw['mars.version'] ?? raw.mars ?? '',
    title: raw['stack.title'] ?? raw['project.title'] ?? raw.name ?? '',
    slug: raw['stack.slug'] ?? raw['project.slug'] ?? raw.slug ?? '',
    short_title: raw['stack.short_title'] ?? raw['project.short_title'] ?? raw.short_title ?? raw.abbreviation ?? raw.code ?? '',
    preset: raw['stack.preset'] ?? raw['project.preset'] ?? raw.preset ?? 'blank',
    language: raw['stack.language'] ?? raw['project.language'] ?? raw.language ?? 'fr',
    academic_year: raw['academic.year'] ?? raw.academic_year ?? '',
    profile: raw['institution.profile'] ?? raw.profile ?? 'ensak-usms',
    author: authorFull,
    author_title: authorTitle || splitAuthor(authorFull).title,
    author_name: authorName || splitAuthor(authorFull).name,
    school: raw['institution.school'] ?? raw.school ?? '',
    university: raw['institution.university'] ?? raw.university ?? '',
    theme: raw['theme.name'] ?? raw.theme ?? 'mars',
    footer: raw['footer.text'] ?? raw.footer ?? '',
    __raw: raw,
    __stackRoot: stackRoot,
  };
}

export function structuredStackConfig(info) {
  const author = splitAuthor(info.author || [info.author_title, info.author_name].filter(Boolean).join(' '));
  return {
    'mars.schema': 1,
    'mars.compatibility': '0.7',
    'stack.title': info.title,
    'stack.slug': info.slug,
    'stack.short_title': info.short_title,
    'stack.preset': info.preset || 'blank',
    'stack.language': info.language || 'fr',
    'academic.year': info.academic_year || '',
    'author.title': info.author_title || author.title,
    'author.name': info.author_name || author.name,
    'author.full': info.author || author.full,
    'institution.profile': info.profile || 'ensak-usms',
    'institution.school': info.school || '',
    'institution.university': info.university || '',
    'theme.name': info.theme || 'mars',
    'footer.text': info.footer || '',
  };
}

export function normalizeBrickConfig(raw = {}, brickRoot = '') {
  return {
    title: raw['brick.title'] ?? raw.title ?? '',
    slug: raw['brick.slug'] ?? raw.slug ?? '',
    short_title: raw['brick.short_title'] ?? raw.short_title ?? '',
    kind: raw['brick.kind'] ?? raw.kind ?? 'generic',
    order: Number(raw['brick.order'] ?? raw.order ?? 0),
    output_pattern: raw['output.pattern'] ?? raw.output_pattern ?? '{stack.short}_{brick.short}{deck.number}.pdf',
    deck_label: raw['deck.label'] ?? raw.deck_label ?? 'Deck',
    __raw: raw,
    __brickRoot: brickRoot,
  };
}

export function structuredBrickConfig(info) {
  return {
    'brick.title': info.title,
    'brick.slug': info.slug,
    'brick.short_title': info.short_title || '',
    'brick.kind': info.kind || 'generic',
    'brick.order': Number(info.order || 0),
    'deck.label': info.deck_label || 'Deck',
    'output.pattern': info.output_pattern || '{stack.short}_{brick.short}{deck.number}.pdf',
  };
}

export function normalizeDeckConfig(raw = {}, deckRoot = '') {
  return {
    title: raw['deck.title'] ?? raw.title ?? '',
    slug: raw['deck.slug'] ?? raw.slug ?? '',
    number: String(raw['deck.number'] ?? raw.number ?? '').padStart(2, '0'),
    kind: raw['deck.kind'] ?? raw.kind ?? 'deck',
    subtitle: raw['deck.subtitle'] ?? raw.subtitle ?? '',
    __raw: raw,
    __deckRoot: deckRoot,
  };
}

export function structuredDeckConfig(info) {
  return {
    'deck.title': info.title,
    'deck.slug': info.slug,
    'deck.number': info.number,
    'deck.kind': info.kind || 'deck',
    'deck.subtitle': info.subtitle || '',
  };
}
