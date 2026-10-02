import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const fixture = JSON.parse(await readFile(resolve(root,'tests/fixtures/production-a1c700f.sha256.json'),'utf8'));
const pilot = resolve(root,'artifacts/native-pilot');
const expected = new Set([...Object.keys(fixture.files), 'assets/native-navigation.js']);
async function walk(dir, prefix='') {
  for (const entry of await readdir(dir,{withFileTypes:true})) {
    const name = prefix + entry.name;
    if (entry.isDirectory()) await walk(resolve(dir,entry.name),name+'/');
    else assert.ok(expected.delete(name), `Unexpected pilot output: ${name}`);
  }
}
await walk(pilot);
assert.equal(expected.size,0,`Missing outputs: ${[...expected]}`);
for (const [name,hash] of Object.entries(fixture.files)) {
  if (name === 'legal/index.html') continue;
  assert.equal(createHash('sha256').update(await readFile(resolve(pilot,name))).digest('hex'),hash,`Unrelated page/resource changed: ${name}`);
}
const html = await readFile(resolve(pilot,'legal/index.html'),'utf8');
assert.doesNotMatch(html,/self\.__next_f|site-updates|<script[^>]+(?:_next|_yaju)/);
assert.equal((html.match(/gtag\('config', 'G-3T9YSET1R9'\)/g)||[]).length,1);
assert.deepEqual(await readFile(resolve(pilot,'assets/native-navigation.js')),await readFile(resolve(root,'src/client/navigation.js')));
console.log('PASS: native Legal only; all 1201 other browser files unchanged.');
