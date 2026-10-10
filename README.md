<div align="center">

<pre>
 ████  ███   ████ █   █ █████    █   █ ███ █     █    
█     █   █ █     █   █ █        █  █   █  █     █    
█     █████ █     █████ ████     ███    █  █     █    
█     █   █ █     █   █ █        █  █   █  █     █    
 ████ █   █  ████ █   █ █████    █   █ ███ █████ █████
</pre>

**Find and delete build and cache folders. Fast.**

`.next`, `.nuxt`, `.svelte-kit`, `target`, `__pycache__`, `.venv`, `.gradle`, `bin/obj` and more.
Like [npkill](https://npmjs.com/package/npkill), but for build output.

[![npm version](https://img.shields.io/npm/v/cache-kill?style=flat-square&color=cb3837&logo=npm)](https://www.npmjs.com/package/cache-kill)
[![npm downloads](https://img.shields.io/npm/dm/cache-kill?style=flat-square&color=blue)](https://www.npmjs.com/package/cache-kill)
[![node](https://img.shields.io/badge/node-%3E%3D18.14-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![zero dependencies](https://img.shields.io/badge/dependencies-0-brightgreen?style=flat-square)](package.json)
[![license](https://img.shields.io/github/license/Bidyut-Kr-Das/cache-kill?style=flat-square)](LICENSE)
[![stars](https://img.shields.io/github/stars/Bidyut-Kr-Das/cache-kill?style=flat-square&logo=github)](https://github.com/Bidyut-Kr-Das/cache-kill)

<br />

<a href="https://skillicons.dev">
  <img src="https://skillicons.dev/icons?i=nextjs,nuxtjs,svelte,angular,astro,gatsby,python,rust,java,maven,gradle,flutter,dotnet,swift,elixir,haskell,zig&perline=9" alt="Supported: Next.js, Nuxt, SvelteKit, Angular, Astro, Gatsby, Python, Rust, Java, Maven, Gradle, Flutter, .NET, Swift, Elixir, Haskell, Zig" />
</a>

</div>

---

## Quick start

```sh
npx cache-kill                        # scan the current directory
npx cache-kill ~/projects             # scan another directory
npx cache-kill --only next,rust       # only some types
npx github:Bidyut-Kr-Das/cache-kill   # run straight from GitHub
```

Or install it globally:

```sh
npm i -g cache-kill
cache-kill
```

## What it does

- Scans the directory tree for build and cache folders.
- Lists each one with its type, size and a running total.
- Deletes the ones you pick and shows how much space you freed.
- Skips `node_modules` and `.git`. Use [npkill](https://npmjs.com/package/npkill) for `node_modules`.

## Supported

Generic names such as `target`, `build` or `bin` are matched **only** when the project file next to them proves what they are. A `target` folder with no `Cargo.toml` or `pom.xml` beside it is left alone.

| Type | Folders | Matched when |
| :-- | :-- | :-- |
| `next` | `.next` | always |
| `nuxt` | `.nuxt`, `.output` | `.output` only next to `nuxt.config.*` / `app.config.*` |
| `sveltekit` | `.svelte-kit` | always |
| `angular` | `.angular` | always |
| `astro` | `.astro` | always |
| `react-router` | `.react-router` | always |
| `docusaurus` | `.docusaurus` | always |
| `gatsby` | `.cache` | next to `gatsby-config.*` |
| `expo` | `.expo` | always |
| `solidstart` | `.vinxi` | always |
| `python` | `__pycache__`, `.pytest_cache`, `.mypy_cache`, `.ruff_cache`, `.tox`, `.venv`, `venv` | venvs only with `pyvenv.cfg` inside |
| `rust` | `target` | next to `Cargo.toml` |
| `maven` | `target` | next to `pom.xml` |
| `gradle` | `.gradle`, `build` | `build` only next to `build.gradle(.kts)` / `settings.gradle(.kts)` |
| `flutter` | `.dart_tool`, `build` | `build` only next to `pubspec.yaml` |
| `dotnet` | `bin`, `obj` | next to `*.csproj` / `*.fsproj` / `*.vbproj` / `*.sln` |
| `swift` | `.build` | next to `Package.swift` |
| `elixir` | `_build`, `deps` | next to `mix.exs` |
| `haskell` | `.stack-work`, `dist-newstyle` | `dist-newstyle` only next to `*.cabal` / `cabal.project` |
| `zig` | `.zig-cache`, `zig-out` | `zig-out` only next to `build.zig` |

## Options

| Option | Description |
| :-- | :-- |
| `--only <types>` | Only these types, comma separated. Example: `--only next,nuxt` |
| `--exclude <types>` | Skip these types. Example: `--exclude python` |
| `--list-types` | Print every type and the folders it matches |
| `-h`, `--help` | Show help |
| `-v`, `--version` | Show version |

## Controls

| Key | Action |
| :-- | :-- |
| <kbd>↑</kbd> <kbd>↓</kbd> / <kbd>k</kbd> <kbd>j</kbd> | Move |
| <kbd>PgUp</kbd> <kbd>PgDn</kbd> / <kbd>Home</kbd> <kbd>End</kbd> | Jump |
| <kbd>Space</kbd> / <kbd>Del</kbd> | Delete selected folder |
| <kbd>q</kbd> / <kbd>Esc</kbd> / <kbd>Ctrl</kbd>+<kbd>C</kbd> | Quit |

> [!TIP]
> When output is piped, `cache-kill` prints `size  type  path` lines and never deletes anything:
> ```sh
> npx cache-kill | sort -h
> ```

## Why it's fast

| | |
| :-- | :-- |
| **Zero dependencies** | Node.js standard library only. |
| **Bigger threadpool** | Node.js runs file system work on 4 threads by default. `cache-kill` raises that, which makes scans about 3× faster. |
| **Few system calls** | One `readdir` per directory. No `stat` on every entry. |
| **Scan first, sizes later** | Sizes are computed after the scan finishes, so the scan gets every thread. |
| **Instant delete** | The folder is renamed (one atomic call), then removed in the background. |

Run the benchmark yourself:

```sh
npm run bench
```

## Warning

> [!WARNING]
> Deletion is permanent. Every supported folder is rebuilt by its tool (`next build`, `cargo build`, `pip install`, ...), so deleting one costs a rebuild or reinstall. Deleting a Python venv means recreating it and reinstalling its packages.

## Development

```sh
git clone https://github.com/Bidyut-Kr-Das/cache-kill.git
cd cache-kill
npm install
npm test
node dist/index.js
```

## License

[MIT](LICENSE) © Bidyut Kr. Das
