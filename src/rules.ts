/**
 * What counts as a deletable cache/build dir.
 * `marker`: some sibling file name must match (guards generic names like `target`, `build`, `bin`).
 * `inside`: this file must exist inside the dir.
 * Several rules may share a `name`; the first one that matches wins.
 */
export type Rule = { id: string; label: string; name: string; marker?: RegExp; inside?: string };

const r = (id: string, label: string, names: string[], extra: Partial<Rule> = {}): Rule[] =>
  names.map((name) => ({ id, label, name, ...extra }));

export const RULES: Rule[] = [
  // JS frameworks
  ...r('next', 'Next.js', ['.next']),
  ...r('nuxt', 'Nuxt', ['.nuxt']),
  ...r('nuxt', 'Nuxt / Nitro', ['.output'], { marker: /^(nuxt|app)\.config\.[cm]?[jt]s$/ }),
  ...r('sveltekit', 'SvelteKit', ['.svelte-kit']),
  ...r('angular', 'Angular', ['.angular']),
  ...r('astro', 'Astro', ['.astro']),
  ...r('react-router', 'React Router', ['.react-router']),
  ...r('docusaurus', 'Docusaurus', ['.docusaurus']),
  ...r('gatsby', 'Gatsby', ['.cache'], { marker: /^gatsby-config\.[cm]?[jt]sx?$/ }),
  ...r('expo', 'Expo', ['.expo']),
  ...r('solidstart', 'SolidStart', ['.vinxi']),
  // Python
  ...r('python', 'Python', ['__pycache__', '.pytest_cache', '.mypy_cache', '.ruff_cache', '.tox']),
  ...r('python', 'Python venv', ['.venv', 'venv'], { inside: 'pyvenv.cfg' }),
  // Other languages
  ...r('rust', 'Rust', ['target'], { marker: /^Cargo\.toml$/ }),
  ...r('maven', 'Maven', ['target'], { marker: /^pom\.xml$/ }),
  ...r('gradle', 'Gradle', ['.gradle']),
  ...r('gradle', 'Gradle', ['build'], { marker: /^(build|settings)\.gradle(\.kts)?$/ }),
  ...r('flutter', 'Flutter', ['.dart_tool']),
  ...r('flutter', 'Flutter', ['build'], { marker: /^pubspec\.yaml$/ }),
  ...r('dotnet', '.NET', ['bin', 'obj'], { marker: /\.(csproj|fsproj|vbproj|sln)$/ }),
  ...r('swift', 'Swift', ['.build'], { marker: /^Package\.swift$/ }),
  ...r('elixir', 'Elixir', ['_build', 'deps'], { marker: /^mix\.exs$/ }),
  ...r('haskell', 'Haskell', ['.stack-work']),
  ...r('haskell', 'Haskell', ['dist-newstyle'], { marker: /(\.cabal|^cabal\.project)$/ }),
  ...r('zig', 'Zig', ['.zig-cache']),
  ...r('zig', 'Zig', ['zig-out'], { marker: /^build\.zig$/ }),
];

export const IDS = [...new Set(RULES.map((rule) => rule.id))];
