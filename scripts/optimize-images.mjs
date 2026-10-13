// Generate lossless alternatives; keep originals and their dimensions intact.
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
const inputs=JSON.parse(await fs.readFile('config/site-inputs.json','utf8'));
const manifest={};let before=0,after=0;
await fs.mkdir('static/assets/optimized',{recursive:true});
for(const entry of inputs){
 if(!entry.source.endsWith('.png'))continue;
 const original=await fs.readFile(entry.source);if(original.length<30000)continue;
 const image=sharp(original);const meta=await image.metadata();if(meta.pages>1||meta.hasProfile)continue;
 const result=await image.webp({lossless:true,effort:6}).toBuffer();
 if(result.length>original.length*.9)continue;
 const name=createHash('sha256').update(result).digest('hex').slice(0,20)+'.webp';
 await fs.writeFile('static/assets/optimized/'+name,result);
 const variants=[];
 if(/yaju-(?:aes-256|tls|rbac|owasp)-240x240\.png$/.test(entry.source)){
  for(const width of (meta.width===1324&&meta.height===1188?[331,662]:[240,480])){
   const bytes=await sharp(original).resize({width,withoutEnlargement:true}).webp({lossless:true,effort:6}).toBuffer();
   const variantName=createHash('sha256').update(bytes).digest('hex').slice(0,20)+'.webp';
   await fs.writeFile('static/assets/optimized/'+variantName,bytes);
   variants.push({src:'/assets/optimized/'+variantName,width,bytes:bytes.length});
  }
 }
 manifest['/'+entry.output]={variants,src:'/assets/optimized/'+name,width:meta.width,height:meta.height,originalBytes:original.length,bytes:result.length};before+=original.length;after+=result.length;
}
await fs.writeFile('config/optimized-images.json',JSON.stringify(manifest,null,2)+'\n');
console.log({images:Object.keys(manifest).length,before,after,saved:before-after});
