// Native controller for the existing public contact endpoints. No analytics events or third-party form submissions.
(() => {
 const types={1013:['contact-sales','contact_sales'],1152:['contact-sales','early_access'],1141:['form-submit','report_download'],1080:['form-submit','labs_newsletter'],1079:['form-submit','labs_research_grant'],1097:['form-submit','labs_open_science'],1393:['form-submit','partner_application']};
 document.querySelectorAll('form.mktoForm').forEach(element=>{
  const id=element.querySelector('[name="formid"]')?.value||element.id.match(/\d+/)?.[0];const type=types[id];if(!type||!window.MktoForms2)return;
  const form=window.MktoForms2.mountForm(element,id);let pending=false,complete=false;
  const params=new URLSearchParams(location.search);
  for(const key of ['source','medium','campaign','term','content']) {const value=params.get(`utm_${key}`);if(value)form.vals({[`utm_${key}__c`]:value});}
  form.onSubmit(()=>{
   form.submittable(false);if(pending||complete||!form._hasConsent())return;
   pending=true;element.setAttribute('data-yaju-sending','');element.querySelector('.yaju-form-error')?.remove();
   const button=element.querySelector('button[type="submit"],.mktoButton');const label=button.innerHTML;button.disabled=true;button.textContent='Sending…';
   const values=form.vals();const get=key=>values[key]==null?'':String(values[key]);let body;
   if(type[0]==='contact-sales')body={form:type[1],first_name:get('FirstName'),last_name:get('LastName'),email:get('Email'),job_title:get('Title'),country:get('Country'),phone:get('Phone'),company_size:get('No_of_Employees_Range__c'),use_case:get('Expressed_Use_Case_s__c'),marketing_opt_in:[true,'yes','true','on',1,'1'].includes(values.emailOptIn)};
   else {
    const fields={},labels={};for(const key of Object.keys(values)){
     if(/^(utm_|formid$|munchkinId$|webPageID$|HtmlText_)/.test(key))continue;
     fields[key]=values[key];const input=[...element.elements].find(e=>e.name===key);const label=input?.closest('.mktoFieldWrap')?.querySelector('label');if(label)labels[key]=label.textContent.replace(/\s+/g,' ').trim().replace(/^\*\s*/,'').slice(0,300);
    }body={form:type[1],fields,labels};
   }
   Object.assign(body,{age_confirmed:element.querySelector('[name="yajuAgeConfirmed"]').checked,privacy_accepted:element.querySelector('[name="yajuPrivacyAccepted"]').checked,source_page:location.pathname,source_url:location.origin+location.pathname,referrer:document.referrer?new URL(document.referrer).origin+new URL(document.referrer).pathname:""});
   for(const key of ['source','medium','campaign','term','content'])body[`utm_${key}`]=get(`utm_${key}__c`);
   function failure(message){pending=false;element.removeAttribute('data-yaju-sending');button.disabled=!form._hasConsent();button.innerHTML=label;const error=document.createElement('p');error.className='yaju-form-error font-body';error.setAttribute('role','alert');error.style.cssText='color:#c4320a;margin-top:12px;font-size:14px';error.textContent=message;const row=button.closest('.mktoButtonRow');if(row)row.before(error);else element.append(error);}
   fetch(`https://axtvwhltyxwufqhsasqd.supabase.co/functions/v1/${type[0]}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(30000)})
    .then(async response=>({status:response.status,data:await response.json().catch(()=>({}))}))
    .then(({status,data})=>{
     if(status>=200&&status<300&&data.ok){pending=false;complete=true;const notice=document.createElement('div');notice.setAttribute('role','status');notice.className='text-center';const text=document.createElement('p');text.className='text-web3-24-heading lg:text-web3-32 font-body text-center text-pureBlack';text.textContent="Thanks! You're all set.";notice.append(text);if(element.dataset.reportLink){const link=document.createElement('a');link.href=element.dataset.reportLink;link.className='font-body underline text-pureBlack';link.style.cssText='display:inline-block;margin-top:16px';link.textContent='Read the full report';notice.append(link);}element.style.display='none';element.after(notice);return;}
     const fields=data.fields||{};failure(status===429?'Too many requests. Please wait a few minutes and try again.':status===400&&(fields.email||fields.Email)?'Please enter a valid email address.':status===400&&fields.phone?'Please enter a valid phone number.':status===400?'Please check your details and try again.':'Something went wrong and your request was not sent. Please try again in a few minutes.');
    }).catch(()=>failure("We couldn't reach our server. Check your connection and try again."));
  });
 });
})();
