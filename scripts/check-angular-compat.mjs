#!/usr/bin/env node
/**
 * Verifies the packed library against a given Angular major.
 *
 * The workspace itself is pinned to the newest Angular, but the published
 * package supports a range of majors. This script installs the packed tarball
 * into a throwaway consumer project built against one specific major and runs
 * three checks, each covering something the previous one cannot:
 *
 *   1. `ngc` compiles `compat/src` — catches type-level breaks between the
 *      shipped `.d.ts` and that version's Angular types.
 *   2. `ng build --configuration production` bundles a consumer app — the only
 *      leg that runs the Angular *linker* over the shipped partial declarations,
 *      and it asserts none survive into the bundle.
 *   3. `compat/smoke.mjs` runs — exercises that version's JIT compiler and
 *      injector, and the `exports` map, which no compile step reaches.
 *
 * The matrix is derived from the library's `peerDependencies`, so widening the
 * supported range is a one-line change in one file.
 *
 * Usage:
 *   npm run build
 *   npm run compat                 # every supported major
 *   npm run compat -- 17 22        # selected majors
 *   npm run compat -- --list       # supported majors as JSON (CI matrix input)
 *   npm run compat -- --tarball package.tgz --report results.json
 */
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixtureDir = join(repoRoot, 'compat');
const libManifestPath = join(repoRoot, 'projects', 'ngx-api-client', 'package.json');
const distDir = join(repoRoot, 'dist', 'ngx-api-client');

// Must live outside the repo: nested under it, Node would resolve anything the
// fixture does not declare — typescript above all — from the workspace's own
// node_modules, silently type-checking every major against the newest compiler.
const workRoot = join(tmpdir(), 'ngx-api-client-compat');

/**
 * `@angular/build` is the application builder from v20 on; before that it lives
 * in `@angular-devkit/build-angular`. Nothing else differs between the two.
 */
const builderPackageFor = (major) =>
  Number(major) >= 20 ? '@angular/build' : '@angular-devkit/build-angular';

/**
 * Expands the library's `@angular/core` peer range into the majors it claims to
 * support, so the matrix cannot drift from what is published. Handles the
 * `>=X.Y.Z <N.0.0` form the package uses; anything else is a hard error rather
 * than a silently narrower matrix.
 */
const supportedMajors = () => {
  const manifest = JSON.parse(readFileSync(libManifestPath, 'utf8'));
  const range = manifest.peerDependencies?.['@angular/core'];
  if (!range) throw new Error(`No @angular/core peer range in ${libManifestPath}`);

  const lower = /^>=\s*(\d+)/.exec(range);
  const upper = /<\s*(\d+)/.exec(range);
  if (!lower || !upper) {
    throw new Error(
      `Cannot derive a matrix from "@angular/core": "${range}". ` +
        `Expected a bounded range such as ">=17.0.0 <23.0.0".`,
    );
  }

  const from = Number(lower[1]);
  const to = Number(upper[1]) - 1;
  if (to < from) throw new Error(`Empty Angular range: "${range}"`);

  return Array.from({ length: to - from + 1 }, (_, i) => String(from + i));
};

const parseArgs = (argv, known) => {
  const majors = [];
  let tarball = null;
  let report = null;
  let list = false;

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--tarball') {
      tarball = argv[++i];
      continue;
    }
    if (argv[i] === '--report') {
      report = argv[++i];
      continue;
    }
    if (argv[i] === '--list') {
      list = true;
      continue;
    }
    if (!/^\d+$/.test(argv[i])) {
      throw new Error(`Unexpected argument "${argv[i]}" — pass Angular majors, e.g. 17 18`);
    }
    majors.push(argv[i]);
  }

  const unknown = majors.filter((m) => !known.includes(m));
  if (unknown.length > 0) {
    throw new Error(
      `Angular ${unknown.join(', ')} is outside the supported range (${known.join(', ')}). ` +
        `Widen "@angular/core" in ${libManifestPath} first.`,
    );
  }

  return { majors: majors.length > 0 ? majors : known, tarball, report, list };
};

/** Packs `dist/ngx-api-client` unless a prebuilt tarball was supplied. */
const resolveTarball = (supplied) => {
  if (supplied) {
    const path = resolve(process.cwd(), supplied);
    if (!existsSync(path)) throw new Error(`Tarball not found: ${path}`);
    return path;
  }

  if (!existsSync(distDir)) {
    throw new Error(`${distDir} not found — run \`npm run build\` first.`);
  }

  mkdirSync(workRoot, { recursive: true });
  const name = execFileSync('npm', ['pack', '--pack-destination', workRoot, '--silent'], {
    cwd: distDir,
    encoding: 'utf8',
  })
    .trim()
    .split('\n')
    .pop();

  return join(workRoot, name);
};

const run = (command, args, cwd) =>
  execFileSync(command, args, { cwd, stdio: 'inherit', env: process.env });

const readJson = (path) =>
  JSON.parse(
    execFileSync('node', ['-p', `JSON.stringify(require(${JSON.stringify(path)}))`], {
      encoding: 'utf8',
    }),
  );

/** Version of a package as resolved inside the fixture, or null if absent. */
const installedVersion = (workDir, pkg) => {
  const manifest = join(workDir, 'node_modules', ...pkg.split('/'), 'package.json');
  return existsSync(manifest) ? readJson(manifest).version : null;
};

const writeFixture = (workDir, major, tarball) => {
  rmSync(workDir, { recursive: true, force: true });
  mkdirSync(workDir, { recursive: true });

  cpSync(join(fixtureDir, 'src'), join(workDir, 'src'), { recursive: true });
  for (const file of ['tsconfig.json', 'tsconfig.app.json', 'smoke.mjs']) {
    cpSync(join(fixtureDir, file), join(workDir, file));
  }

  const builderPackage = builderPackageFor(major);

  // zone.js is a peer of @angular/core; leaving it out lets npm pick the version
  // each major actually supports. TypeScript is installed separately below.
  writeFileSync(
    join(workDir, 'package.json'),
    `${JSON.stringify(
      {
        name: `ngx-api-client-compat-v${major}`,
        version: '0.0.0',
        private: true,
        dependencies: {
          '@angular/common': `^${major}.0.0`,
          '@angular/core': `^${major}.0.0`,
          '@angular/platform-browser': `^${major}.0.0`,
          '@ismailza/ngx-api-client': `file:${tarball}`,
          rxjs: '^7.8.0',
          tslib: '^2.3.0',
        },
        devDependencies: {
          '@angular/cli': `^${major}.0.0`,
          '@angular/compiler': `^${major}.0.0`,
          '@angular/compiler-cli': `^${major}.0.0`,
          [builderPackage]: `^${major}.0.0`,
        },
      },
      null,
      2,
    )}\n`,
  );

  writeFileSync(
    join(workDir, 'angular.json'),
    `${JSON.stringify(
      {
        version: 1,
        projects: {
          'compat-app': {
            projectType: 'application',
            root: '',
            sourceRoot: 'src',
            architect: {
              build: {
                builder: `${builderPackage}:application`,
                options: {
                  browser: 'src/browser.ts',
                  index: 'src/index.html',
                  tsConfig: 'tsconfig.app.json',
                  outputPath: 'dist-app',
                  outputHashing: 'none',
                },
                configurations: {
                  production: { optimization: true },
                },
                defaultConfiguration: 'production',
              },
            },
          },
        },
      },
      null,
      2,
    )}\n`,
  );
};

/**
 * The linker rewrites `ɵɵngDeclare*` into `ɵɵdefine*` at build time. Any
 * surviving declaration means the bundle shipped unlinked metadata, which fails
 * at runtime — and a bundle with no trace of the library means the fixture was
 * tree-shaken away and the build proved nothing.
 */
const assertBundleLinked = (workDir) => {
  const bundle = join(workDir, 'dist-app', 'browser', 'main.js');
  if (!existsSync(bundle)) {
    throw new Error(`Expected a bundle at ${bundle} — the build layout changed.`);
  }

  const code = readFileSync(bundle, 'utf8');
  if (code.includes('ngDeclare')) {
    throw new Error('Bundle still contains partial declarations — the Angular linker did not run.');
  }
  if (!code.includes('API_BASE_URL')) {
    throw new Error('Bundle contains no trace of the library — the fixture was tree-shaken away.');
  }
};

const checkMajor = (major, tarball) => {
  const workDir = join(workRoot, `v${major}`);
  writeFixture(workDir, major, tarball);

  console.log(`\n=== Angular ${major} ===`);
  console.log(workDir);
  run('npm', ['install', '--no-audit', '--no-fund', '--loglevel=error'], workDir);

  // Angular 20+ marks its `typescript` peer optional, so npm installs nothing and
  // ngc would fall back to whatever TypeScript it can resolve. Read the range off
  // the compiler that actually got installed and pin to it — no version map to
  // keep in sync as majors are added.
  const compilerCli = readJson(
    join(workDir, 'node_modules', '@angular', 'compiler-cli', 'package.json'),
  );
  const typescriptRange = compilerCli.peerDependencies?.typescript;
  if (!typescriptRange) {
    throw new Error(`@angular/compiler-cli@${major} declares no typescript peer range.`);
  }
  run(
    'npm',
    [
      'install',
      '--no-audit',
      '--no-fund',
      '--loglevel=error',
      '--save-dev',
      `typescript@${typescriptRange}`,
    ],
    workDir,
  );

  // Fail loudly rather than silently type-check against a hoisted TypeScript:
  // both must resolve inside the workdir for the result to mean anything.
  const versions = {
    node: process.version.replace(/^v/, ''),
    angular: installedVersion(workDir, '@angular/core'),
    cli: installedVersion(workDir, '@angular/cli'),
    typescript: installedVersion(workDir, 'typescript'),
    library: readJson(join(workDir, 'node_modules', '@ismailza', 'ngx-api-client', 'package.json'))
      .version,
  };
  for (const pkg of ['angular', 'typescript']) {
    if (!versions[pkg]) {
      throw new Error(`${pkg} was not installed into ${workDir} — resolution escaped the fixture.`);
    }
  }
  console.log(
    `node ${versions.node} | @angular/core ${versions.angular} | @angular/cli ${versions.cli} | ` +
      `typescript ${versions.typescript} | @ismailza/ngx-api-client ${versions.library}`,
  );

  run('node', [join('node_modules', '.bin', 'ngc'), '-p', 'tsconfig.json'], workDir);
  console.log('type-check ok');

  run('node', [join('node_modules', '.bin', 'ng'), 'build'], workDir);
  assertBundleLinked(workDir);
  console.log('production build ok (linker ran, library retained)');

  run('node', ['smoke.mjs'], workDir);

  return versions;
};

const main = () => {
  const known = supportedMajors();
  const {
    majors,
    tarball: suppliedTarball,
    report,
    list,
  } = parseArgs(process.argv.slice(2), known);

  if (list) {
    console.log(JSON.stringify(known));
    return;
  }

  const tarball = resolveTarball(suppliedTarball);
  const results = [];

  // Recorded on every result, pass or fail: the report groups by it, so a run
  // that failed before installing anything still lands in the right column.
  const node = process.version.replace(/^v/, '');

  for (const major of majors) {
    try {
      results.push({ major, node, ok: true, versions: checkMajor(major, tarball) });
    } catch (error) {
      // A failed subprocess already streamed its own output; anything else is a
      // fault in this script's setup and would otherwise vanish silently.
      if (error.status === undefined) console.error(error.message);
      results.push({ major, node, ok: false, versions: null });
    }
  }

  console.log(`\n=== Summary ===`);
  for (const result of results) {
    console.log(`Angular ${result.major}: ${result.ok ? 'ok' : 'FAIL'}`);
  }

  if (report) {
    const path = resolve(process.cwd(), report);
    writeFileSync(path, `${JSON.stringify(results, null, 2)}\n`);
    console.log(`\nWrote ${path}`);
  }

  const failed = results.filter((result) => !result.ok).map((result) => result.major);
  if (failed.length > 0) {
    console.error(`\nIncompatible with Angular ${failed.join(', ')}.`);
    process.exitCode = 1;
  }
};

main();
