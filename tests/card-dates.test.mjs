import {test} from 'node:test';
import assert from 'node:assert/strict';
import {annotateCardDates,annotateInteractionDates} from '../src/components/card-dates.mjs';
test('card dates recover calendar data from English and Spanish snapshots',()=>{
 for(const [token,month] of [['Apr','04'],['abr','04'],['sept','09'],['Sep','09'],['dic','12']]){
  const source=`<p class="font-eyebrow uppercase">Yaju Team - ${token} 01, 2026</p>`;
  const result=annotateCardDates(source);
  assert.ok(result.includes(`data-native-card-date="2026-${month}-01"`));
  assert.equal(annotateCardDates(result),result);
  assert.ok(result.includes(`Yaju Team - ${token} 01, 2026`));
 }
});
test('interaction snapshots are annotated without changing unrelated content or input data',()=>{
 const html='<p class="font-eyebrow">Author - ago 09, 2026</p>';
 const input={pagination:[{states:[{html}]}],label:html};
 const output=annotateInteractionDates(input);
 assert.ok(output.pagination[0].states[0].html.includes('2026-08-09'));
 assert.equal(output.label,html);assert.equal(input.pagination[0].states[0].html,html);
 assert.equal(annotateCardDates('<p>Text - abr 01, 2026</p>'),'<p>Text - abr 01, 2026</p>');
});
test('cards retain their original publication time, including different dates for the same link',()=>{
 const href='/blog/a-day-in-the-life-of-a-wealth-manager-with-and-without-ai';
 const card=date=>`<a href="${href}"><p class="font-eyebrow">Author - ${date}</p></a>`;
 assert.ok(annotateCardDates(card('jul 27, 2026')).includes('2026-07-27T13:02:00.000Z'));
 assert.ok(annotateCardDates(card('jun 09, 2026')).includes('2026-06-09T09:00:00.000Z'));
});
