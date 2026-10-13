import assert from 'node:assert/strict';import {readFile,writeFile} from 'node:fs/promises';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const {chromium}=require(require.resolve('playwright',{paths:[process.env.YAJU_BROWSER_MODULES||process.cwd()]}));
const routes=JSON.parse(await readFile('config/native-pages.json','utf8'));const browser=await chromium.launch({channel:'chrome',headless:true});const results=[];
try{for(const entry of routes){const content=JSON.parse(await readFile(entry.source,'utf8'));if(!content.forms)continue;
 if(process.env.YAJU_SKIP_TESTED==='1' && ['/ai-spend-explorer','/ai-observability','/contact-sales','/credential-vault','/cost-control','/customization','/developers','/get-started'].includes(content.route))continue;
 const context=await browser.newContext({viewport:{width:1440,height:900}});let requests=[],status=429;
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.hostname.endsWith('.supabase.co')){requests.push({url:url.pathname,body:request.postDataJSON()});return route.fulfill({status,contentType:'application/json',body:JSON.stringify(status===200?{ok:true}:{error:'test'})});}
  if(url.origin==='http://127.0.0.1:4183')return route.continue();return route.abort();
 });
 const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));await page.goto('http://127.0.0.1:4183'+content.route,{waitUntil:'load'});
 const form=page.locator('form.mktoForm').first();assert.equal(await form.count(),1,content.route);
 const button=form.locator('button[type="submit"]');const age=form.locator('[name="yajuAgeConfirmed"]'),privacy=form.locator('[name="yajuPrivacyAccepted"]');
 assert.equal(await button.isDisabled(),true);await age.check();assert.equal(await button.isDisabled(),true);await privacy.check();assert.equal(await button.isDisabled(),false);
 await button.click();assert.equal(requests.length,0,'Invalid fields must not submit');
 await form.evaluate(form=>{
  for(const field of form.querySelectorAll('.mktoField[name]')) {
   if(field.type==='hidden')continue;
   if(field.type==='checkbox'||field.type==='radio'){field.checked=true;field.dispatchEvent(new Event('change',{bubbles:true}));continue;}
   if(field.tagName==='SELECT')field.value=[...field.options].find(option=>option.value)?.value||'';
   else if(field.type==='email'||field.name==='Email')field.value='migration-test@example.com';
   else if(field.type==='number')field.value='2';
   else if(field.type==='tel'||field.name==='Phone')field.value='+34930000000';
   else field.value='Migration test';
   field.dispatchEvent(new Event('input',{bubbles:true}));field.dispatchEvent(new Event('change',{bubbles:true}));
  }
 });
 await button.click();await page.getByRole('alert').filter({hasText:'Too many requests'}).waitFor({timeout:8000}).catch(async error=>{console.error(content.route,await form.locator('.mktoErrorMsg').allTextContents(),await form.locator('.mktoInvalid').evaluateAll(es=>es.map(e=>({name:e.name,value:e.value,type:e.type}))));throw error;});assert.equal(requests.length,1);assert.equal(await button.isEnabled(),true);
 status=200;await button.click();await page.getByRole('status').filter({hasText:"Thanks! You're all set."}).waitFor();assert.equal(requests.length,2);assert.equal(await form.isVisible(),false);assert.deepEqual(errors,[]);
 results.push({route:content.route,endpoint:requests[0].url,form:requests[0].body.form,consents:true,invalidBlocked:true,rateLimitRetry:true,success:true});console.log('PASS',content.route);
 await context.close();
}}finally{await browser.close();await writeFile('artifacts/native-forms-report.json',JSON.stringify(results,null,2)+'\n')}
