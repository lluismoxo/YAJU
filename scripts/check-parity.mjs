import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, 'public');
const baseline = JSON.parse(await readFile(resolve(root, 'tests/fixtures/production-a1c700f.sha256.json'), 'utf8'));
const approved = JSON.parse(await readFile(resolve(root, 'tests/fixtures/native-legal-approved.sha256.json'), 'utf8'));
const expected = {...baseline.files, ...approved.files};
const actual = {};
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) await walk(path);
    else actual[relative(output, path)] = createHash('sha256').update(await readFile(path)).digest('hex');
  }
}
await walk(output);
const errors = [];
for (const [name, hash] of Object.entries(expected)) {
  if (!(name in actual)) errors.push(`MISSING ${name}`);
  else if (actual[name] !== hash) errors.push(`CHANGED ${name}`);
}
for (const name of Object.keys(actual)) if (!(name in expected)) errors.push(`UNEXPECTED ${name}`);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`PASS: 1201 unchanged browser files; native Legal and navigation match the user-approved preview hashes.`);
}
