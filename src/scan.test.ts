import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { dirSize, find, remove } from './scan.js';

test('find, dirSize, remove', async () => {
  const root = await mkdtemp(join(tmpdir(), 'next-kill-test-'));
  const many = Array.from({ length: 50 }, (_, i) => `a/.next/many/f${i}`);
  const files = [...many, 'a/.next/x','a/.next/nested/.next/y', 'b/c/.next/y', 'node_modules/p/.next/z', '.git/.next/z', 'd/src/z'];
  for (const f of files) {
    await mkdir(join(root, f, '..'), { recursive: true });
    await writeFile(join(root, f), 'hello');
  }

  const found: string[] = [];
  await find(root, (p) => found.push(p));
  assert.deepEqual(found.sort(), [join(root, 'a/.next'), join(root, 'b/c/.next')]);

  assert.equal(await dirSize(join(root, 'a/.next')), 52 * 5);

  const { done } = await remove(join(root, 'a/.next'));
  assert.ok(!(await readdir(join(root, 'a'))).includes('.next'), 'gone from its place immediately');
  await done;
  assert.deepEqual(await readdir(join(root, 'a')), [], 'temp dir removed too');

  await rm(root, { recursive: true });
});
