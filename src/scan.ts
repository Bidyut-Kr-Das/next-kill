import { readdir, lstat, rename, rm } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { dirname, join } from 'node:path';

const TARGET = '.next';
const SKIP = new Set(['node_modules', '.git']);
const TMP_PREFIX = '.next-kill-';
const RM_OPTS = { recursive: true, force: true, maxRetries: 3 } as const;

export const CONCURRENCY = Number(process.env.UV_THREADPOOL_SIZE ?? 4) * 2;

/** Run at most `n` tasks at once. A finishing task hands its slot straight to the next waiter. */
export function limit(n: number) {
  let active = 0;
  const waiters: (() => void)[] = [];
  return async <T>(fn: () => Promise<T>): Promise<T> => {
    if (active < n) active++;
    else await new Promise<void>((r) => waiters.push(r));
    try {
      return await fn();
    } finally {
      const next = waiters.shift();
      if (next) next();
      else active--;
    }
  };
}

/** Walk `root`, calling `onFound` for every `.next` dir. Never descends into `.next`, `node_modules` or `.git`. */
export async function find(root: string, onFound: (path: string) => void, run = limit(CONCURRENCY)) {
  const walk = async (dir: string): Promise<void> => {
    let entries;
    try {
      entries = await run(() => readdir(dir, { withFileTypes: true }));
    } catch {
      return; // EACCES, EPERM, ENOENT (deleted mid-scan), ...
    }
    const subs: Promise<void>[] = [];
    for (const e of entries) {
      if (!e.isDirectory()) continue; // symlinks report false, so never followed
      const p = join(dir, e.name);
      if (e.name === TARGET) onFound(p);
      else if (!SKIP.has(e.name) && !e.name.startsWith(TMP_PREFIX)) subs.push(walk(p));
    }
    await Promise.all(subs);
  };
  await walk(root);
}

/** Total bytes of all files under `dir`. Unreadable entries count as 0. */
export async function dirSize(dir: string, run = limit(CONCURRENCY)): Promise<number> {
  let total = 0;
  const walk = async (d: string): Promise<void> => {
    let entries;
    try {
      entries = await run(() => readdir(d, { withFileTypes: true }));
    } catch {
      return;
    }
    await Promise.all(
      entries.map(async (e) => {
        const p = join(d, e.name);
        if (e.isDirectory()) return walk(p);
        try {
          const { size } = await run(() => lstat(p)); // not `total += await`: that reads total before awaiting
          total += size;
        } catch {}
      }),
    );
  };
  await walk(dir);
  return total;
}

/**
 * Resolves as soon as `path` is gone from its place: renamed to a hidden sibling (atomic, O(1)).
 * `done` resolves when the bytes are actually freed. If rename fails (e.g. Windows lock) it removes in place.
 */
export async function remove(path: string): Promise<{ done: Promise<void> }> {
  const tmp = join(dirname(path), TMP_PREFIX + randomBytes(4).toString('hex'));
  try {
    await rename(path, tmp);
  } catch {
    await rm(path, RM_OPTS);
    return { done: Promise.resolve() };
  }
  return { done: rm(tmp, RM_OPTS) };
}
