import readline from 'node:readline';
import readlinePromises from 'node:readline/promises';
import { color } from './console.mjs';

async function lineQuestion(prompt) {
  const rl = readlinePromises.createInterface({ input: process.stdin, output: process.stdout });
  try { return await rl.question(prompt); }
  finally { rl.close(); }
}

export async function ask(label, defaultValue = '') {
  const suffix = defaultValue !== '' && defaultValue !== undefined ? color.dim(` [${defaultValue}]`) : '';
  const value = (await lineQuestion(`${label}${suffix}: `)).trim();
  return value || defaultValue;
}

export async function yesNo(label, defaultYes = true) {
  const hint = defaultYes ? 'Y/n' : 'y/N';
  const value = (await lineQuestion(`${label} ${color.dim(`[${hint}]`)}: `)).trim().toLowerCase();
  if (!value) return defaultYes;
  return ['y', 'yes', 'o', 'oui'].includes(value);
}

async function numericChoose(label, options) {
  console.log(`\n${color.yellow(label)}`);
  options.forEach((o, i) => console.log(`  ${color.cyan(`${i + 1}.`)} ${o.label ?? o}`));
  while (true) {
    const raw = (await lineQuestion('Choice: ')).trim();
    const n = Number(raw);
    if (Number.isInteger(n) && n >= 1 && n <= options.length) return options[n - 1];
    console.log(color.red('Invalid choice.'));
  }
}

function eraseLines(count) {
  if (count <= 0) return;
  process.stdout.write(`\x1b[${count}A`);
  for (let i = 0; i < count; i += 1) {
    process.stdout.write('\x1b[2K\r');
    if (i < count - 1) process.stdout.write('\x1b[1B');
  }
  if (count > 1) process.stdout.write(`\x1b[${count - 1}A`);
}

export async function choose(label, options, { initial = 0 } = {}) {
  if (!options.length) throw new Error(`No option available for “${label}”.`);
  if (!process.stdin.isTTY || !process.stdout.isTTY || typeof process.stdin.setRawMode !== 'function') return numericChoose(label, options);

  readline.emitKeypressEvents(process.stdin);
  let index = Math.max(0, Math.min(initial, options.length - 1));
  const totalLines = options.length + 2;
  const wasRaw = Boolean(process.stdin.isRaw);

  const render = (first = false) => {
    if (!first) eraseLines(totalLines);
    process.stdout.write(`\n${color.yellow(label)}\n`);
    options.forEach((o, i) => {
      const text = o.label ?? String(o);
      process.stdout.write(`${i === index ? color.cyan('❯') : ' '} ${i === index ? color.bold(text) : text}\n`);
    });
  };

  return await new Promise((resolve, reject) => {
    const cleanup = () => {
      process.stdin.off('keypress', onKey);
      process.stdout.write('\x1b[?25h');
      try { process.stdin.setRawMode(wasRaw); } catch {}
      if (!wasRaw) process.stdin.pause();
    };
    const onKey = (_str, key = {}) => {
      if (key.ctrl && key.name === 'c') { cleanup(); reject(new Error('Interrupted.')); return; }
      if (['up', 'k'].includes(key.name)) { index = (index - 1 + options.length) % options.length; render(); return; }
      if (['down', 'j'].includes(key.name)) { index = (index + 1) % options.length; render(); return; }
      if (key.name === 'return') { const chosen = options[index]; cleanup(); resolve(chosen); }
      if (key.name === 'escape') { cleanup(); reject(new Error('Cancelled.')); }
    };
    try { process.stdin.setRawMode(true); } catch {}
    process.stdout.write('\x1b[?25l');
    process.stdin.on('keypress', onKey);
    render(true);
  });
}
