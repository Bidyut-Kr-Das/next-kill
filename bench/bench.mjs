// Builds a fake monorepo-ish tree in tmpdir and times scan / size / delete.
// Usage: npm run bench [-- projects=60]
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const PROJECTS = Number(process.argv.find((a) => a.startsWith('projects='))?.split('=')[1] ?? 60);
const scanJs = new URL('../dist/scan.js', import.meta.url).href;
const root = await mkdtemp(join(tmpdir(), 'cache-kill-bench-'));

async function tree(dir, dirs, filesPer, depth) {
  await mkdir(dir, { recursive: true });
  await Promise.all(Array.from({ length: filesPer }, (_, i) => writeFile(join(dir, `f${i}.js`), 'x'.repeat(512))));
  if (depth) await Promise.all(Array.from({ length: dirs }, (_, i) => tree(join(dir, `d${i}`), dirs, filesPer, depth - 1)));
}

let t = performance.now();
for (let p = 0; p < PROJECTS; p++) {
  const proj = join(root, `group${p % 6}`, `app${p}`);
  await Promise.all([
    tree(join(proj, 'node_modules'), 6, 6, 3), // ~1.5k files
    tree(join(proj, '.next'), 5, 8, 3), // ~1.2k files
    tree(join(proj, 'src'), 3, 5, 2),
  ]);
}
console.log(`fixture: ${PROJECTS} projects in ${root} (${((performance.now() - t) / 1000).toFixed(1)}s)`);

// Each measurement runs in a fresh process so UV_THREADPOOL_SIZE takes effect.
async function measure(label, threads, code) {
  const env = { ...process.env };
  if (threads) env.UV_THREADPOOL_SIZE = String(threads);
  else delete env.UV_THREADPOOL_SIZE;
  const script = `const s = await import(${JSON.stringify(scanJs)}); const root = ${JSON.stringify(root)};
    const t = performance.now(); const r = await (async () => { ${code} })(); console.log(JSON.stringify([performance.now() - t, r]));`;
  const { stdout } = await run(process.execPath, ['--input-type=module', '-e', script], { env });
  const [ms, result] = JSON.parse(stdout);
  console.log(`${label.padEnd(36)} ${ms.toFixed(0).padStart(6)} ms  ${result ?? ''}`);
  return result;
}

const findCode = 'const f = []; await s.find(root, p => f.push(p)); return f.length;';
const sizeCode = 'const f = []; await s.find(root, p => f.push(p)); const r = s.limit(s.CONCURRENCY); return (await Promise.all(f.map(p => s.dirSize(p, r)))).reduce((a, b) => a + b, 0);';
const tuned = 64;
for (const n of [4, 16, 32, tuned]) await measure(`scan (threads=${n})`, n, findCode);
for (const n of [4, 16, 32, tuned]) await measure(`scan + size (threads=${n})`, n, sizeCode);

// Delete: half the .next dirs via remove() (fs.rm), the rest via native rm, same concurrency.
await measure('delete half via remove()', tuned,
  `const f = []; await s.find(root, p => f.push(p)); const a = f.slice(0, f.length >> 1);
   await Promise.all(a.map(async p => (await s.remove(p)).done)); return a.length;`);
const nativeRm = process.platform === 'win32'
  ? `(p) => ex('cmd', ['/d', '/c', 'rmdir', '/s', '/q', p])`
  : `(p) => ex('rm', ['-rf', p])`;
await measure('delete half via native rm', tuned,
  `const { execFile } = await import('node:child_process'); const { promisify } = await import('node:util'); const ex = promisify(execFile);
   const f = []; await s.find(root, p => f.push(p)); const a = f;
   const r = s.limit(16); await Promise.all(a.map(p => r(() => (${nativeRm})(p)))); return a.length;`);

await rm(root, { recursive: true, force: true });
