#!/usr/bin/env node
/**
 * Checks that the packed tarball contains what consumers and registries expect.
 *
 * `npm publish` ships whatever is in the build output, so an omission here is
 * only visible after release — a missing LICENSE or an `exports` map that lost
 * its `types` condition is not something the compatibility matrix would catch.
 *
 * Usage:
 *   npm run build
 *   npm run verify:package
 *   npm run verify:package -- --tarball package.tgz
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(repoRoot, 'dist', 'ngx-api-client');

/**
 * Entries every published tarball must have. Directory-shaped entries are
 * matched as prefixes so file naming inside them stays free to change.
 */
const REQUIRED_FILES = ['package.json', 'README.md', 'LICENSE', 'CHANGELOG.md'];
const REQUIRED_PATTERNS = [
  { label: 'FESM bundle', test: (f) => /^fesm2022\/.+\.mjs$/.test(f) },
  { label: 'type declarations', test: (f) => /\.d\.ts$/.test(f) },
];

const parseArgs = (argv) => {
  let tarball = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--tarball') {
      tarball = argv[++i];
      continue;
    }
    throw new Error(`Unexpected argument "${argv[i]}"`);
  }
  return { tarball };
};

/** Lists tarball contents without unpacking, via `npm pack`'s JSON report. */
const inspect = (suppliedTarball) => {
  if (suppliedTarball) {
    const path = resolve(process.cwd(), suppliedTarball);
    if (!existsSync(path)) throw new Error(`Tarball not found: ${path}`);
    const listing = execFileSync('tar', ['-tzf', path], { encoding: 'utf8' })
      .split('\n')
      .filter(Boolean)
      // npm tarballs root everything under `package/`.
      .map((entry) => entry.replace(/^package\//, ''))
      .filter((entry) => entry && !entry.endsWith('/'));

    const manifest = JSON.parse(
      execFileSync('tar', ['-xzOf', path, 'package/package.json'], { encoding: 'utf8' }),
    );
    return { files: listing, manifest, source: path };
  }

  if (!existsSync(distDir)) {
    throw new Error(`${distDir} not found — run \`npm run build\` first.`);
  }

  const report = JSON.parse(
    execFileSync('npm', ['pack', '--dry-run', '--json', '--pack-destination', tmpdir()], {
      cwd: distDir,
      encoding: 'utf8',
    }),
  );
  return {
    files: report[0].files.map((file) => file.path),
    manifest: JSON.parse(readFileSync(join(distDir, 'package.json'), 'utf8')),
    source: distDir,
  };
};

const main = () => {
  const { tarball } = parseArgs(process.argv.slice(2));
  const { files, manifest, source } = inspect(tarball);
  const problems = [];

  console.log(`Verifying ${manifest.name}@${manifest.version}`);
  console.log(`Source: ${source}`);
  console.log(`Files (${files.length}):`);
  for (const file of [...files].sort()) console.log(`  ${file}`);

  // --- contents ---
  for (const required of REQUIRED_FILES) {
    if (!files.includes(required)) problems.push(`missing ${required}`);
  }
  for (const { label, test } of REQUIRED_PATTERNS) {
    if (!files.some(test)) problems.push(`no ${label} in the package`);
  }

  // --- exports map ---
  // A library consumed by bundlers and `tsc` alike breaks quietly if `types`
  // stops resolving, so assert the shape rather than trusting ng-packagr.
  const rootExport = manifest.exports?.['.'];
  if (!rootExport) {
    problems.push('exports map has no "." entry');
  } else {
    for (const condition of ['types', 'default']) {
      const target = rootExport[condition];
      if (!target) {
        problems.push(`exports["."] is missing the "${condition}" condition`);
        continue;
      }
      const relative = target.replace(/^\.\//, '');
      if (!files.includes(relative)) {
        problems.push(`exports["."].${condition} points at "${target}", which is not packaged`);
      }
    }
  }
  if (!manifest.exports?.['./package.json']) {
    problems.push('exports map does not expose "./package.json"');
  }

  // --- manifest sanity ---
  for (const field of ['name', 'version', 'license', 'peerDependencies']) {
    if (!manifest[field]) problems.push(`package.json is missing "${field}"`);
  }

  if (problems.length > 0) {
    console.error('\nPackage verification failed:');
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exitCode = 1;
    return;
  }

  console.log('\nPackage contents and exports map ok.');
};

main();
