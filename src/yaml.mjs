import fs from 'node:fs';

function unquote(value) {
  const v = value.trim();
  if (!v) return '';
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    if (v.startsWith('"')) {
      try { return JSON.parse(v); } catch { return v.slice(1, -1); }
    }
    return v.slice(1, -1).replace(/''/g, "'");
  }
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v === 'null' || v === '~') return null;
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v;
}

function stripInlineComment(value) {
  let single = false;
  let double = false;
  for (let i = 0; i < value.length; i += 1) {
    const c = value[i];
    if (c === "'" && !double) single = !single;
    else if (c === '"' && !single && value[i - 1] !== '\\') double = !double;
    else if (c === '#' && !single && !double && (i === 0 || /\s/.test(value[i - 1]))) return value.slice(0, i).trimEnd();
  }
  return value;
}

/**
 * Parse the scalar mapping subset used by MARS.
 * Supports both historical namespaced keys (`course.title:`) and natural
 * nested mappings (`course:\n  title:`). Lists/anchors/multiline blocks are
 * rejected explicitly instead of being silently ignored.
 */
export function parseFlatYaml(file) {
  if (!fs.existsSync(file)) return {};
  const out = {};
  const stack = [];
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index];
    if (!raw.trim() || raw.trimStart().startsWith('#')) continue;
    if (/^\s*-\s+/.test(raw)) throw new Error(`${file}:${index + 1}: les listes YAML ne sont pas prises en charge dans la configuration MARS.`);
    const indentText = raw.match(/^\s*/)?.[0] || '';
    if (indentText.includes('\t')) throw new Error(`${file}:${index + 1}: utilisez des espaces, pas des tabulations.`);
    const indent = indentText.length;
    const body = raw.slice(indent);
    const match = body.match(/^([A-Za-z0-9_.-]+)\s*:\s*(.*)$/);
    if (!match) throw new Error(`${file}:${index + 1}: syntaxe YAML non prise en charge.`);
    const key = match[1];
    const value = stripInlineComment(match[2]);

    while (stack.length && indent <= stack.at(-1).indent) stack.pop();
    if (indent > 0 && !stack.length) throw new Error(`${file}:${index + 1}: indentation sans section parente.`);

    if (value === '') {
      stack.push({ indent, key });
      continue;
    }
    const prefix = stack.map(x => x.key).join('.');
    const flatKey = prefix ? `${prefix}.${key}` : key;
    out[flatKey] = unquote(value);
  }
  return out;
}

function quoteYaml(value) {
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (!s) return '""';
  if (/^[A-Za-z0-9_.\/-]+$/.test(s) && !['true', 'false', 'null', '~'].includes(s)) return s;
  return JSON.stringify(s);
}

export function writeFlatYaml(file, obj, header = '') {
  const lines = [];
  if (header) lines.push(`# ${header}`, '');
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    lines.push(`${key}: ${quoteYaml(value)}`);
  }
  fs.writeFileSync(file, `${lines.join('\n')}\n`);
}
