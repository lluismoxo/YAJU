// Shared request controls. No secrets, payloads or personal data are logged.
export class RequestError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}
export function json(status: number, body: unknown, headers: Record<string,string> = {}): Response {
  return new Response(JSON.stringify(body), {status,headers:{...headers,'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(status===429?{'Retry-After':'900'}:{})}});
}
export function corsHeaders(origin: string|null, allowed: string[]): Record<string,string> {
  return {'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'content-type','Access-Control-Max-Age':'600','Vary':'Origin',...(origin&&allowed.includes(origin)?{'Access-Control-Allow-Origin':origin}:{})};
}
export async function readBody(req: Request,max: number): Promise<Record<string,unknown>> {
  if(req.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')throw new RequestError(415,'unsupported_media_type');
  const length=req.headers.get('content-length');if(length&&Number(length)>max)throw new RequestError(413,'too_large');
  const reader=req.body?.getReader();if(!reader)throw new RequestError(400,'invalid_json');
  const chunks:Uint8Array[]=[];let size=0;
  try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){await reader.cancel();throw new RequestError(413,'too_large')}chunks.push(value)}}finally{reader.releaseLock()}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}
  try{const body=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));if(!body||typeof body!=='object'||Array.isArray(body))throw Error();return body}catch{throw new RequestError(400,'invalid_json')}
}
export function consent(body: Record<string,unknown>) {
  if(body.age_confirmed!==true||body.privacy_accepted!==true)throw new RequestError(400,'consent_required');
  return {age_confirmed:true,privacy_accepted:true,consent_version:'2026-10-13',consent_recorded_at:new Date().toISOString()};
}
export function safeUrl(value: unknown, sameSite=false): string|null {
  if(typeof value!=='string'||!value)return null;
  try{const u=new URL(value);if(!['https:','http:'].includes(u.protocol)||u.username||u.password)return null;if(sameSite&&!['https://yajuas.com','https://www.yajuas.com'].includes(u.origin))return null;return (u.origin+u.pathname).slice(0,2000)}catch{return null}
}
export function safePath(value:unknown):string|null {return typeof value==='string'&&/^\/(?!\/)/.test(value)?value.split(/[?#]/)[0].slice(0,500):null}
export function controlCharacters(value:unknown):boolean {return typeof value==='string'&&/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)}
export async function hash(value:string):Promise<string> {const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return [...new Uint8Array(bytes)].map(v=>v.toString(16).padStart(2,'0')).join('')}
export async function reserve(db:any,req:Request,cfg:Record<string,string>,email:string) {
  if(!cfg.contact_ip_salt)throw new RequestError(503,'temporarily_unavailable');
  // Last forwarded hop avoids trusting a client-prepended first address. The
  // deployment's trusted gateway remains a dependency; email limits are separate.
  const ip=(req.headers.get('x-forwarded-for')||'').split(',').at(-1)?.trim()||req.headers.get('cf-connecting-ip')||'';
  const ipHash=ip?await hash(cfg.contact_ip_salt+':ip:'+ip):null;
  const emailHash=email?await hash(cfg.contact_ip_salt+':email:'+email):null;
  if(!ipHash&&!emailHash)throw new RequestError(503,'temporarily_unavailable');
  const {data,error}=await db.rpc('reserve_form_submission',{p_ip_hash:ipHash,p_email_hash:emailHash});
  if(error){console.error('form_rate_limit_unavailable');throw new RequestError(503,'temporarily_unavailable')}
  if(data!==true){console.warn('form_rate_limited');throw new RequestError(429,'rate_limited')}
  return ipHash;
}
