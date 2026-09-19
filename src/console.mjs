const supportsColor = () => {
  if (process.env.NO_COLOR !== undefined) return false;
  if (process.argv.includes('--no-ansi')) return false;
  if (!process.stdout.isTTY) return false;
  return true;
};

function wrap(code, text) {
  const value = String(text ?? '');
  return supportsColor() ? `\x1b[${code}m${value}\x1b[0m` : value;
}

export const color = {
  bold: text => wrap('1', text),
  dim: text => wrap('2', text),
  cyan: text => wrap('36', text),
  green: text => wrap('32', text),
  yellow: text => wrap('33', text),
  red: text => wrap('31', text),
  white: text => wrap('37', text),
};

export function heading(text) { return color.yellow(text); }
export function command(text) { return color.cyan(text); }
export function success(text) { return `${color.green('✓')} ${text}`; }
export function warning(text) { return `${color.yellow('!')} ${text}`; }
export function failure(text) { return `${color.red('✗')} ${text}`; }
export function info(text) { return `${color.cyan('→')} ${text}`; }

export function twoColumn(rows, { indent = 2, gap = 4 } = {}) {
  const width = Math.max(0, ...rows.map(([left]) => String(left).length));
  return rows.map(([left, right]) => `${' '.repeat(indent)}${command(String(left).padEnd(width + gap))}${color.dim(right)}`).join('\n');
}
