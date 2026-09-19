export const PRESETS = {
  blank: {
    id: 'blank',
    label: 'Blank presentation',
    bricks: [
      { title: 'Main', slug: 'main', short_title: '', kind: 'main', deck_label: 'Deck', output_pattern: '{stack.short}_{deck.number}.pdf' },
    ],
  },
  course: {
    id: 'course',
    label: 'Course',
    bricks: [
      { title: 'Lectures', slug: 'lectures', short_title: '', kind: 'lectures', deck_label: 'Chapter', output_pattern: '{stack.short}_{deck.number}.pdf' },
      { title: 'Tutorials', slug: 'td', short_title: 'TD', kind: 'tutorials', deck_label: 'TD', output_pattern: '{stack.short}_{brick.short}{deck.number}.pdf' },
      { title: 'Labs', slug: 'tp', short_title: 'TP', kind: 'labs', deck_label: 'TP', output_pattern: '{stack.short}_{brick.short}{deck.number}.pdf' },
    ],
  },
  conference: {
    id: 'conference',
    label: 'Conference',
    bricks: [
      { title: 'Talks', slug: 'talks', short_title: '', kind: 'talks', deck_label: 'Talk', output_pattern: '{stack.short}_{deck.number}.pdf' },
    ],
  },
  workshop: {
    id: 'workshop',
    label: 'Workshop',
    bricks: [
      { title: 'Modules', slug: 'modules', short_title: '', kind: 'modules', deck_label: 'Module', output_pattern: '{stack.short}_{deck.number}.pdf' },
      { title: 'Exercises', slug: 'exercises', short_title: 'EX', kind: 'exercises', deck_label: 'Exercise', output_pattern: '{stack.short}_{brick.short}{deck.number}.pdf' },
    ],
  },
  training: {
    id: 'training',
    label: 'Training',
    bricks: [
      { title: 'Sessions', slug: 'sessions', short_title: '', kind: 'sessions', deck_label: 'Session', output_pattern: '{stack.short}_{deck.number}.pdf' },
      { title: 'Labs', slug: 'labs', short_title: 'LAB', kind: 'labs', deck_label: 'Lab', output_pattern: '{stack.short}_{brick.short}{deck.number}.pdf' },
    ],
  },
};

export function presetById(id = 'blank') {
  return PRESETS[id] || PRESETS.blank;
}

export function presetChoices() {
  return Object.values(PRESETS).map(p => ({ label: p.label, value: p.id }));
}

export function presetBricks(id = 'blank', language = 'en') {
  const base = presetById(id).bricks.map(b => ({ ...b }));
  if (id === 'course' && String(language).toLowerCase().startsWith('fr')) {
    const byKind = Object.fromEntries(base.map(b => [b.kind, b]));
    Object.assign(byKind.lectures, { title: 'Cours', deck_label: 'Chapitre' });
    Object.assign(byKind.tutorials, { title: 'Travaux dirigés', deck_label: 'TD' });
    Object.assign(byKind.labs, { title: 'Travaux pratiques', deck_label: 'TP' });
  }
  return base;
}
