import { access, readdir, lstat, rename, rm } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { dirname, join } from 'node:path';
import { RULES, type Rule } from './rules.js';

// Never walked into. Unconditional cache names are pruned even when filtered out by --only/--exclude:
// nothing worth finding lives inside them, and walking them is slow.
const SKIP = new Set(['node_modules', '.git', ...RULES.filter((r) => !r.marker && !r.inside).map((r) => r.name)]);
const TMP_PREFIX = '.cache-kill-';
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

/** First rule whose marker/inside condition holds for dir `p`, or undefined. */
async function pick(candidates: Rule[], p: string, siblings: string[], run: ReturnType<typeof limit>) {
  for (const rule of candidates) {
    if (rule.marker && !siblings.some((n) => rule.marker!.test(n))) continue;
    if (rule.inside && !(await run(() => access(join(p, rule.inside!))).then(() => true, () => false))) continue;
    return rule;
  }
}

/**
 * Walk `root`, calling `onFound` for every dir matching `rules`. Matched dirs are not descended into.
 * Never walks `node_modules`, `.git` or symlinks.
 */
export async function find(
  root: string,
  onFound: (path: string, rule: Rule) => void,
  rules: Rule[] = RULES,
  run = limit(CONCURRENCY),
) {
  const byName = new Map<string, Rule[]>();
  for (const rule of rules) byName.set(rule.name, [...(byName.get(rule.name) ?? []), rule]);

  const walk = async (dir: string): Promise<void> => {
    let entries;
    try {
      entries = await run(() => readdir(dir, { withFileTypes: true }));
    } catch {
      return; // EACCES, EPERM, ENOENT (deleted mid-scan), ...
    }
    let siblings: string[] | undefined; // built only when this dir has a candidate
    const subs: Promise<void>[] = [];
    for (const e of entries) {
      if (!e.isDirectory()) continue; // symlinks report false, so never followed
      const p = join(dir, e.name);
      const skip = SKIP.has(e.name) || e.name.startsWith(TMP_PREFIX);
      const candidates = byName.get(e.name);
      if (!candidates) {
        if (!skip) subs.push(walk(p));
        continue;
      }
      siblings ??= entries.filter((x) => !x.isDirectory()).map((x) => x.name);
      subs.push(
        pick(candidates, p, siblings, run).then((rule) => (rule ? onFound(p, rule) : skip ? undefined : walk(p))),
      );
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
