#!/usr/bin/env node
/**
 * Renders the compatibility matrix results as a markdown table.
 *
 * Each matrix job writes one JSON file (`check-angular-compat.mjs --report`);
 * this collects them into the table CI publishes to the run summary and that
 * can be pasted into release notes or the README.
 *
 * Usage:
 *   node scripts/compat-report.mjs <results-dir> [--out table.md]
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const parseArgs = (argv) => {
  let dir = null;
  let out = null;

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--out') {
      out = argv[++i];
      continue;
    }
    if (dir) throw new Error(`Unexpected argument "${argv[i]}"`);
    dir = argv[i];
  }

  if (!dir) throw new Error('Usage: compat-report.mjs <results-dir> [--out table.md]');
  return { dir: resolve(process.cwd(), dir), out };
};

/** Collects every *.json under the results directory, one level deep. */
const collect = (dir) => {
  const results = [];

  const visit = (path) => {
    for (const entry of readdirSync(path)) {
      const full = join(path, entry);
      if (statSync(full).isDirectory()) {
        visit(full);
        continue;
      }
      if (!entry.endsWith('.json')) continue;
      for (const result of JSON.parse(readFileSync(full, 'utf8'))) {
        results.push(result);
      }
    }
  };

  visit(dir);
  return results;
};

const render = (results) => {
  if (results.length === 0) return '_No compatibility results were produced._\n';

  const nodeVersions = [...new Set(results.map((r) => major(r.node)))].sort(
    (a, b) => Number(a) - Number(b),
  );

  const majors = [...new Set(results.map((r) => r.major))].sort((a, b) => Number(a) - Number(b));
  const library = results.find((r) => r.versions?.library)?.versions.library ?? 'unknown';

  const cell = (angular, node) => {
    const match = results.find((r) => r.major === angular && major(r.node) === node);
    if (!match) return '—';
    if (!match.ok) return '❌ fail';
    const { angular: core, typescript } = match.versions;
    return `✅ ${core}<br>TS ${typescript}`;
  };

  const lines = [
    `### Angular compatibility — \`@ismailza/ngx-api-client@${library}\``,
    '',
    `| Angular | ${nodeVersions.map((n) => `Node ${n}`).join(' | ')} |`,
    `| --- | ${nodeVersions.map(() => '---').join(' | ')} |`,
    ...majors.map((m) => `| **${m}** | ${nodeVersions.map((n) => cell(m, n)).join(' | ')} |`),
    '',
  ];

  const failures = results.filter((r) => !r.ok);
  if (failures.length > 0) {
    lines.push(`⚠️ ${failures.length} of ${results.length} combinations failed.`, '');
  }

  return `${lines.join('\n')}\n`;
};

function major(version) {
  return String(version).split('.')[0];
}

const main = () => {
  const { dir, out } = parseArgs(process.argv.slice(2));
  const table = render(collect(dir));

  if (out) {
    const path = resolve(process.cwd(), out);
    writeFileSync(path, table);
    console.error(`Wrote ${path}`);
  }

  process.stdout.write(table);
};

main();
