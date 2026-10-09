<div align="center">

<pre>
█   █ █████ █   █ █████    █   █ ███ █     █
██  █ █      █ █    █      █  █   █  █     █
█ █ █ ████    █     █      ███    █  █     █
█  ██ █      █ █    █      █  █   █  █     █
█   █ █████ █   █   █      █   █ ███ █████ █████
</pre>

**Find and delete `.next` build folders. Fast.**

Like [npkill](https://npmjs.com/package/npkill), but for Next.js build output.

[![npm version](https://img.shields.io/npm/v/next-kill?style=flat-square&color=cb3837&logo=npm)](https://www.npmjs.com/package/next-kill)
[![npm downloads](https://img.shields.io/npm/dm/next-kill?style=flat-square&color=blue)](https://www.npmjs.com/package/next-kill)
[![node](https://img.shields.io/badge/node-%3E%3D18.14-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![zero dependencies](https://img.shields.io/badge/dependencies-0-brightgreen?style=flat-square)](package.json)
[![license](https://img.shields.io/github/license/Bidyut-Kr-Das/next-kill?style=flat-square)](LICENSE)
[![stars](https://img.shields.io/github/stars/Bidyut-Kr-Das/next-kill?style=flat-square&logo=github)](https://github.com/Bidyut-Kr-Das/next-kill)

<br />

<a href="https://skillicons.dev">
  <img src="https://skillicons.dev/icons?i=ts,nodejs,nextjs,npm,windows,linux,apple" alt="TypeScript, Node.js, Next.js, npm, Windows, Linux, macOS" />
</a>

</div>

---

## Quick start

```sh
npx next-kill                         # scan the current directory
npx next-kill ~/projects              # scan another directory
npx github:Bidyut-Kr-Das/next-kill    # run straight from GitHub
```

Or install it globally:

```sh
npm i -g next-kill
next-kill
```

## What it does

- Scans the directory tree for `.next` folders.
- Lists each one with its size and a running total.
- Deletes the ones you pick and shows how much space you freed.
- Skips `node_modules` and `.git`. Use [npkill](https://npmjs.com/package/npkill) for `node_modules`.

## Controls

| Key | Action |
| :-- | :-- |
| <kbd>↑</kbd> <kbd>↓</kbd> / <kbd>k</kbd> <kbd>j</kbd> | Move |
| <kbd>PgUp</kbd> <kbd>PgDn</kbd> / <kbd>Home</kbd> <kbd>End</kbd> | Jump |
| <kbd>Space</kbd> / <kbd>Del</kbd> | Delete selected `.next` |
| <kbd>q</kbd> / <kbd>Esc</kbd> / <kbd>Ctrl</kbd>+<kbd>C</kbd> | Quit |

> [!TIP]
> When output is piped, `next-kill` prints `size  path` lines and never deletes anything:
> ```sh
> npx next-kill | sort -h
> ```

## Why it's fast

| | |
| :-- | :-- |
| **Zero dependencies** | Node.js standard library only. |
| **Bigger threadpool** | Node.js runs file system work on 4 threads by default. `next-kill` raises that, which makes scans about 3× faster. |
| **Few system calls** | One `readdir` per directory. No `stat` on every entry. |
| **Scan first, sizes later** | Sizes are computed after the scan finishes, so the scan gets every thread. |
| **Instant delete** | The folder is renamed (one atomic call), then removed in the background. |

Run the benchmark yourself:

```sh
npm run bench
```

## Warning

> [!WARNING]
> Deletion is permanent. `next dev` or `next build` recreates `.next`, so deleting it only costs a rebuild.

## Development

```sh
git clone https://github.com/Bidyut-Kr-Das/next-kill.git
cd next-kill
npm install
npm test
node dist/index.js
```

## License

[MIT](LICENSE) © Bidyut Kr. Das
