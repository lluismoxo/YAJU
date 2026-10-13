import test from 'node:test';
import assert from 'node:assert/strict';
import {createTranslator,languages} from '../src/i18n/translate.mjs';
import {localizedPage} from '../src/i18n/pages.mjs';
const dictionary={'Hello world':'Hola mundo','Email address':'Correo electrónico','Next':'Siguiente','Accept Cookies':'Aceptar cookies'};
const tr=createTranslator({language:languages[3],dictionary,routes:new Set(['/','/about']),scripts:new Set(['/assets/native-page.js'])});
test('localizes visible text and routes without changing identifiers or code',()=>{
 const result=tr.html('<a href="/about?q=1#team">Hello world</a><input name="Email" placeholder="Email address"><pre>Hello world</pre>',true);
 assert.match(result,/href="\/es\/about\?q=1#team"/);assert.match(result,/Hola mundo/);assert.match(result,/name="Email"/);assert.match(result,/placeholder="Correo electrónico"/);assert.match(result,/<pre>Hello world<\/pre>/);
 assert.equal(tr.url('https://external.test/about'),'https://external.test/about');assert.equal(tr.url('/unknown'),'/unknown');
});
test('runtime translations preserve machine field keys and synchronize aria selectors',()=>{
 const result=tr.js(`var field='Email';var country='Country';var label='Next';var target='[aria-label="Next"]';var html='<button>Accept Cookies</button>';`);
 assert.match(result,/field='Email'/);assert.match(result,/country='Country'/);assert.match(result,/label="Siguiente"/);assert.match(result,/aria-label=\\"Siguiente/);assert.match(result,/Aceptar cookies/);
});
test('missing translations fail the build instead of silently publishing English',()=>assert.throws(()=>tr.html('<p>Untranslated sentence</p>',true),/Missing es translation/));
test('page metadata and language switcher point to the equivalent page',()=>{
 const source='<html lang="en"><head><title>Hello world</title><link rel="canonical" href="old"></head><body><button>English</button><ul class="invisible"><li>English</li></ul></body></html>';
 const result=localizedPage(source,'/about',languages[3],dictionary,new Set(['/about']),new Set());
 assert.match(result,/lang="es"/);assert.match(result,/<title>Hola mundo/);assert.equal((result.match(/rel="canonical"/g)||[]).length,1);assert.match(result,/hreflang="x-default" href="https:\/\/yajuas.com\/about"/);assert.match(result,/data-language-trigger/);assert.match(result,/href="\/ja\/about"/);
});
test('external runtime scripts use the localized asset without inline text',()=>assert.equal(tr.html('<script src="/assets/native-page.js" defer></script>',true),'<script src="/es/assets/native-page.js" defer></script>'));
