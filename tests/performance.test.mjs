import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import sharp from 'sharp';
import {optimizeMedia} from '../src/components/performance.mjs';
const manifest=JSON.parse(await readFile('config/optimized-images.json','utf8'));
test('optimized images preserve dimensions, alpha and every visible pixel',async()=>{
 for(const [source,image] of Object.entries(manifest)){
  const input=JSON.parse(await readFile('config/site-inputs.json','utf8')).find(e=>'/'+e.output===source);
  const original=await sharp(input.source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const optimized=await sharp('static'+image.src).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  assert.equal(optimized.info.width,original.info.width,source);assert.equal(optimized.info.height,original.info.height,source);
  for(let i=0;i<original.data.length;i+=4){assert.equal(optimized.data[i+3],original.data[i+3],source);if(original.data[i+3])for(let c=0;c<3;c++)assert.equal(optimized.data[i+c],original.data[i+c],source);}
  assert(image.bytes<image.originalBytes*.9);
 }
});
test('media optimization preserves image semantics and disables video prefetch',()=>{
 const [source,image]=Object.entries(manifest)[0];
 assert.equal(optimizeMedia(`<img src="${source}" alt="Example" width="120"><video src="/movie.mp4" controls preload="auto"></video>`),`<img src="${image.src}" alt="Example" width="120"><video src="/movie.mp4" controls preload="none"></video>`);
});
test('responsive badges use real width variants and preserve their original aspect ratio',async()=>{
 for(const [source,image] of Object.entries(manifest)){
  if(!image.variants.length)continue;
  const html=optimizeMedia(`<img src="${source}" srcset="${source} 60w, ${source} 120w" width="120" height="120" alt="Security">`);
  assert(html.includes('sizes="120px"'));assert(!html.includes(' 60w'));
  for(const variant of image.variants){const m=await sharp('static'+variant.src).metadata();assert.equal(m.width,variant.width);assert(Math.abs(m.height-m.width*image.height/image.width)<=1);assert(html.includes(`${variant.src} ${variant.width}w`));}
 }
});
