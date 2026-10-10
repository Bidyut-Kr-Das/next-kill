import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { RULES } from './rules.js';
import { dirSize, find, remove } from './scan.js';

async function fixture(files: string[]) {
  const root = await mkdtemp(join(tmpdir(), 'cache-kill-test-'));
  for (const f of files) {
    await mkdir(join(root, f, '..'), { recursive: true });
    await writeFile(join(root, f), 'hello');
  }
  return root;
}

async function scan(root: string, rules = RULES) {
  const found: string[] = [];
  await find(root, (p, rule) => found.push(`${p.slice(root.length + 1).replaceAll('\\', '/')} ${rule.label}`), rules);
  return found.sort();
}

test('find matches rules, markers and inside files', async () => {
  const root = await fixture([
    'web/.next/x',
    'web/.next/nested/.next/y', // inside a match: not reported
    'node_modules/p/.next/z', // node_modules never walked
    '.git/.next/z',
    'rs/Cargo.toml',
    'rs/target/x',
    'docs/target/x', // no Cargo.toml / pom.xml: user folder, keep
    'java/pom.xml',
    'java/target/x',
    'cs/app.csproj',
    'cs/bin/x',
    'cs/obj/x',
    'plain/bin/x', // no project file: keep
    'py/__pycache__/x',
    'py/.venv/pyvenv.cfg',
    'fake/.venv/x', // no pyvenv.cfg: keep
    'nuxt/nuxt.config.ts',
    'nuxt/.output/x',
    'other/.output/x', // no nuxt/app config: keep
  ]);

  assert.deepEqual(await scan(root), [
    'cs/bin .NET',
    'cs/obj .NET',
    'java/target Maven',
    'nuxt/.output Nuxt / Nitro',
    'py/.venv Python venv',
    'py/__pycache__ Python',
    'rs/target Rust',
    'web/.next Next.js',
  ]);

  // Filtering: only Rust. Excluded unconditional names (.next) are still not walked into.
  assert.deepEqual(await scan(root, RULES.filter((r) => r.id === 'rust')), ['rs/target Rust']);

  await rm(root, { recursive: true });
});

test('dirSize and remove', async () => {
  const many = Array.from({ length: 50 }, (_, i) => `a/.next/many/f${i}`);
  const root = await fixture([...many, 'a/.next/x']);

  assert.equal(await dirSize(join(root, 'a/.next')), 51 * 5);

  const { done } = await remove(join(root, 'a/.next'));
  assert.ok(!(await readdir(join(root, 'a'))).includes('.next'), 'gone from its place immediately');
  await done;
  assert.deepEqual(await readdir(join(root, 'a')), [], 'temp dir removed too');

  await rm(root, { recursive: true });
});
