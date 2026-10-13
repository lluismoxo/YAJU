// Keep the original visual assets byte-for-byte when releasing native templates.
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {site} from '../config/site.mjs';

const root=resolve(process.argv[2]||'public');
const baseline=JSON.parse(await readFile('tests/fixtures/production-a1c700f.sha256.json','utf8'));
const replaced=new Set(['assets/native-navigation.js','assets/forms/forms2.js']);
let preserved=0,removed=0;
for(const [path,hash] of Object.entries(baseline.files)){
 if(path.endsWith('.html')||replaced.has(path))continue;
 if((path.startsWith('_yaju/')&&path.endsWith('.js'))||path===`assets/${site.compatibilityScript}`){
  await assert.rejects(access(resolve(root,path)),{code:'ENOENT'},`Legacy script must not ship: ${path}`);
  removed++;continue;
 }
 const bytes=await readFile(resolve(root,path));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),hash,`Changed shared asset: ${path}`);
 preserved++;
}
console.log(`PASS: ${preserved} original shared assets unchanged; ${removed} legacy scripts excluded.`);
