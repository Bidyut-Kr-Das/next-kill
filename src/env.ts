import os from 'node:os';

// libuv defaults to 4 threads for all fs work; that is the real bottleneck. Must run before the first fs call.
// Bench (npm run bench): scan ~3x faster at 16+ threads, flat beyond 32.
process.env.UV_THREADPOOL_SIZE ??= String(Math.max(16, Math.min(64, (os.availableParallelism?.() ?? os.cpus().length) * 4)));
