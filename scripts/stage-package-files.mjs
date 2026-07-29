#!/usr/bin/env node
/**
 * Copies the files ng-packagr does not into the build output.
 *
 * ng-packagr copies README.md, but refuses assets from outside the project root
 * (LICENSE lives at the repo root) and does not pick up CHANGELOG.md. Running
 * this as `postbuild` keeps `npm run build` producing a complete, publishable
 * directory, so the tarball CI validates is the tarball that gets published.
 */
import { copyFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(repoRoot, 'dist', 'ngx-api-client');

if (!existsSync(distDir)) {
  console.error(`${distDir} not found — run \`ng build\` first.`);
  process.exit(1);
}

/** [source, name in the package] */
const files = [
  [join(repoRoot, 'LICENSE'), 'LICENSE'],
  [join(repoRoot, 'projects', 'ngx-api-client', 'CHANGELOG.md'), 'CHANGELOG.md'],
];

for (const [source, name] of files) {
  if (!existsSync(source)) {
    console.error(`Missing ${source} — cannot stage ${name} into the package.`);
    process.exit(1);
  }
  copyFileSync(source, join(distDir, name));
  console.log(`staged ${name}`);
}
