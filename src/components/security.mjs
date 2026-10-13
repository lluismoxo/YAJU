import {createHash} from 'node:crypto';
import {parse} from 'parse5';
// Hash the exact inline script bytes, including localized consent controllers.
// No unsafe-inline/unsafe-eval for JavaScript. Framing is blocked by HTTP headers.
export function secureHtml(html){
 const hashes=new Set();const tree=parse(html,{sourceCodeLocationInfo:true});
 function walk(n){if(n.tagName==='script'&&!n.attrs.some(a=>a.name==='src')){const type=n.attrs.find(a=>a.name==='type')?.value;if(!type||['text/javascript','application/javascript','module'].includes(type)){const l=n.sourceCodeLocation;const source=html.slice(l.startTag.endOffset,l.endTag.startOffset);hashes.add("'sha256-"+createHash('sha256').update(source).digest('base64')+"'")}}for(const c of n.childNodes||[])walk(c)}walk(tree);
 const policy=["default-src 'self'","script-src 'self' https://www.googletagmanager.com "+[...hashes].join(' '),"style-src 'self' 'unsafe-inline' https:","img-src 'self' data: blob: https:","font-src 'self' data: https:","media-src 'self' blob: https:","connect-src 'self' https://axtvwhltyxwufqhsasqd.supabase.co https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://vitals.vercel-insights.com https://*.vercel-insights.com","frame-src https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com","worker-src 'self' blob:","object-src 'none'","base-uri 'self'","form-action 'self'","upgrade-insecure-requests"].join('; ');
 return html.replace(/<head>/,'<head><meta http-equiv="Content-Security-Policy" content="'+policy.replaceAll('&','&amp;').replaceAll('"','&quot;')+'">');
}
