import {readFileSync} from 'node:fs';
const images=JSON.parse(readFileSync(new URL('../../config/optimized-images.json',import.meta.url),'utf8'));
export function optimizeMedia(html){
 // The badges render at no more than 120 CSS pixels; offer real density variants.
 html=html.replace(/<img\b[^>]*>/g,tag=>{
  const src=tag.match(/\bsrc="([^"?]+)/)?.[1],image=images[src];
  if(!image?.variants?.length)return tag;
  const choices=[...image.variants,{src:image.src,width:image.width}];
  return tag.replace(/\s+(?:srcset|sizes)="[^"]*"/g,'')
   .replace(/\bsrc="[^"]*"/,`src="${image.variants[1].src}"`)
   .replace(/>$/,` srcset="${choices.map(v=>v.src+' '+v.width+'w').join(', ')}" sizes="120px">`);
 });
 // Keep lossless full-resolution alternatives for all other uses, including social metadata.
 for(const [original,image] of Object.entries(images))html=html.replaceAll(original,image.src);
 // User-controlled videos need no bytes before play; autoplay is started near view.
 return html.replace(/<video\b[^>]*>/g,tag=>tag.replace(/\s+preload="[^"]*"/g,'').replace(/>$/,' preload="none">'));
}
