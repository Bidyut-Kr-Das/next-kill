#!/usr/bin/env node
import './env.js';
import { readFile, stat } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';
import readline from 'node:readline';
import { parseArgs } from 'node:util';
import { CONCURRENCY, dirSize, find, limit, remove } from './scan.js';

const HELP = `next-kill [dir]

Find every .next folder under dir (default: current dir) and delete the ones you pick.
Skips node_modules and .git.

Keys:  up/down, j/k, pgup/pgdn, home/end   move
       space / delete                      delete selected .next
       q / esc / ctrl+c                    quit
`;

type Status = 'idle' | 'deleting' | 'deleted' | 'error';
type Item = { path: string; rel: string; size?: number; status: Status };

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { help: { type: 'boolean', short: 'h' }, version: { type: 'boolean', short: 'v' } },
});

if (values.help) {
  process.stdout.write(HELP);
  process.exit(0);
}
if (values.version) {
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  console.log(pkg.version);
  process.exit(0);
}

const root = resolve(positionals[0] ?? '.');
if (!(await stat(root).catch(() => null))?.isDirectory()) {
  console.error(`next-kill: not a directory: ${root}`);
  process.exit(1);
}

function fmt(bytes?: number) {
  if (bytes === undefined) return '…';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  while (bytes >= 1024 && i < units.length - 1) (bytes /= 1024), i++;
  return `${bytes.toFixed(i ? 1 : 0)} ${units[i]}`;
}

const items: Item[] = [];
const rel = (p: string) => relative(root, p) || `.${sep}.next`;
const sizeRun = limit(CONCURRENCY);
const started = performance.now();

if (!process.stdout.isTTY || !process.stdin.isTTY) {
  // Pipe mode: list only, never deletes.
  await find(root, (path) => items.push({ path, rel: rel(path), status: 'idle' }));
  let total = 0;
  await Promise.all(
    items.map(async (it) => {
      const size = await dirSize(it.path, sizeRun);
      total += size; // safe: size already awaited
      console.log(`${fmt(size).padStart(9)}  ${it.rel}`);
    }),
  );
  console.log(`${fmt(total).padStart(9)}  total, ${items.length} folders`);
  process.exit(0);
}

let cursor = 0;
let scroll = 0;
let scanTime: number | undefined;
let quitting = false;
const pending = new Set<Promise<void>>();
const out = process.stdout;
const ESC = '\x1b[';
const color = (code: number, s: string) => `${ESC}${code}m${s}${ESC}0m`;

function render() {
  const rows = out.rows || 24;
  const cols = out.columns || 80;
  const listH = Math.max(1, rows - 4);
  cursor = Math.max(0, Math.min(cursor, items.length - 1));
  if (cursor < scroll) scroll = cursor;
  if (cursor >= scroll + listH) scroll = cursor - listH + 1;

  const sum = (s?: Status) => items.reduce((a, it) => a + (s && it.status !== s ? 0 : (it.size ?? 0)), 0);
  const state = quitting
    ? color(33, `finishing ${pending.size} deletions…`)
    : scanTime === undefined
      ? color(33, 'scanning…')
      : `scanned in ${(scanTime / 1000).toFixed(2)}s`;
  const lines = [
    `${color(1, 'next-kill')}  ${root}  ${state}`,
    `found ${items.length}  ·  total ${fmt(sum())}  ·  freed ${color(32, fmt(sum('deleted')))}`,
    '',
  ];
  for (let i = scroll; i < Math.min(items.length, scroll + listH); i++) {
    const it = items[i];
    const tag = { idle: '', deleting: color(33, ' deleting…'), deleted: color(32, ' deleted'), error: color(31, ' error') }[it.status];
    const line = `${fmt(it.size).padStart(9)}  ${it.rel.slice(0, cols - 22)}`;
    lines.push((i === cursor ? color(7, line) : it.status === 'deleted' ? color(2, line) : line) + tag);
  }
  if (!items.length && scanTime !== undefined) lines.push('  no .next folders found');
  while (lines.length < rows - 1) lines.push('');
  lines.push(color(2, 'up/down move · space delete · q quit'));
  out.write(`${ESC}H` + lines.map((l) => l + `${ESC}K`).join('\n'));
}

let queued = false;
function schedule() {
  if (queued) return;
  queued = true;
  setTimeout(() => ((queued = false), render()), 50);
}

function cleanup() {
  out.write(`${ESC}?25h${ESC}?1049l`);
  if (process.stdin.isTTY) process.stdin.setRawMode(false);
}

function exit(code = 0) {
  cleanup();
  const freed = items.reduce((a, it) => a + (it.status === 'deleted' ? (it.size ?? 0) : 0), 0);
  if (freed) console.log(`next-kill: freed ${fmt(freed)}`);
  process.exit(code);
}

async function quit() {
  if (quitting) return exit(); // second press forces exit
  quitting = true;
  render();
  await Promise.allSettled(pending);
  exit();
}

function del(it: Item) {
  if (it.status !== 'idle') return;
  it.status = 'deleting';
  render();
  remove(it.path).then(
    ({ done }) => {
      it.status = 'deleted';
      schedule();
      const p = done.catch(() => void (it.status = 'error')).finally(() => (pending.delete(p), schedule()));
      pending.add(p);
    },
    () => ((it.status = 'error'), schedule()),
  );
}

process.on('uncaughtException', (err) => {
  cleanup();
  console.error(err);
  process.exit(1);
});
out.write(`${ESC}?1049h${ESC}?25l`);
out.on('resize', render);
readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);
process.stdin.on('keypress', (_s, key: readline.Key) => {
  const page = Math.max(1, (out.rows || 24) - 5);
  if (key.ctrl && key.name === 'c') return void quit();
  switch (key.name) {
    case 'q': case 'escape': return void quit();
    case 'up': case 'k': cursor--; break;
    case 'down': case 'j': cursor++; break;
    case 'pageup': cursor -= page; break;
    case 'pagedown': cursor += page; break;
    case 'home': cursor = 0; break;
    case 'end': cursor = items.length - 1; break;
    case 'space': case 'delete': if (items[cursor]) del(items[cursor]); break;
    default: return;
  }
  render();
});

render();
await find(root, (path) => {
  items.push({ path, rel: rel(path), status: 'idle' });
  schedule();
});
scanTime = performance.now() - started;
render();
// Sizes only after scan, so the scan gets the whole threadpool.
// ponytail: an item deleted before its size lands counts 0 toward "freed".
await Promise.all(
  items.map(async (it) => {
    if (it.status !== 'idle') return;
    it.size = await dirSize(it.path, sizeRun);
    schedule();
  }),
);
