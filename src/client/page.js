// Native content behaviours. Page content is already present in the server-rendered HTML.
(() => {
 const main=document.querySelector('main');if(!main)return;
 const data=JSON.parse(document.getElementById('native-page-data')?.textContent||'{}');
 const reveal=new IntersectionObserver(entries=>entries.forEach(({target,isIntersecting})=>{
   if(!isIntersecting)return;
   if(!target.className.includes('animate-'))target.classList.add('motion-safe:animate-[fadeInUp_0.5s_forwards_ease-in-out]');
   reveal.unobserve(target);
 }),{threshold:0.1});
 main.querySelectorAll('[class*="motion-safe:opacity-0"]').forEach(el=>reveal.observe(el));
 const accordions=[];
 main.querySelectorAll('[data-native-accordion]').forEach(list=>{
  const index=Number(list.dataset.nativeAccordion),model=data.accordions?.[index];if(!model)return;
  const buttons=[...list.querySelectorAll(':scope > li > div > button')];const open=new Set();let started=false;
  function paint(){buttons.forEach((button,i)=>{
   const expanded=open.has(i),drawer=button.nextElementSibling;
   button.parentElement.className=expanded?model.states[i].openClass:model.states[i].closedClass;
   button.setAttribute('aria-expanded',String(expanded));button.querySelector('i')?.classList.toggle('rotate-180',expanded);
   drawer.style.height=expanded?`${drawer.scrollHeight}px`:'0px';
  });}
  function select(i){
   if(model.multiple){if(open.has(i))open.delete(i);else open.add(i);}else{open.clear();open.add(i);}
   const media=main.querySelector(`[data-accordion-media="${index}"]`);
   if(media&&model.states[i].media){const template=document.createElement('template');template.innerHTML=model.states[i].media;const replacement=template.content.firstElementChild;replacement.dataset.accordionMedia=index;media.replaceWith(replacement);}
   paint();
  }
  buttons.forEach((button,i)=>button.addEventListener('click',event=>{event.preventDefault();started=true;select(i);}));
  const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)&&!started){started=true;open.add(0);paint();observer.disconnect();}},{threshold:0.1});observer.observe(list);
  accordions.push(paint);
 });
 window.addEventListener('resize',()=>accordions.forEach(paint=>paint()),{passive:true});
 // Tab content is captured at build time; selection never needs a network request.
 main.querySelectorAll('[data-native-tabs]').forEach(section=>{
  const model=data.tabs?.[Number(section.dataset.nativeTabs)];if(!model?.states?.length)return;
  let selected=0;
  function closeMenu(){
   section.querySelectorAll('[data-native-tab-toggle]').forEach(toggle=>{
    toggle.setAttribute('aria-expanded','false');
    toggle.querySelector('i')?.classList.remove('rotate-180');
    toggle.nextElementSibling?.classList.add('pointer-events-none','invisible','opacity-0');
   });
  }
  function positionIndicator(){
   const button=section.querySelector(`button[data-native-tab-item="${selected}"]`);
   if(!button||!button.offsetWidth)return;
   const indicator=button.parentElement.querySelector(':scope > div.absolute');if(!indicator)return;
   indicator.style.left=`${button.offsetLeft}px`;indicator.style.width=`${button.offsetWidth}px`;
   if(!indicator.classList.contains('bottom-0')){
    indicator.style.top=`${button.offsetTop}px`;indicator.style.height=`${button.offsetHeight}px`;
   }
  }
  function select(index,focus=false){
   if(!model.states[index])return;
   selected=index;section.innerHTML=model.states[index].html;
   section.querySelectorAll('[class*="motion-safe:opacity-0"]').forEach(el=>reveal.observe(el));
   closeMenu();positionIndicator();
   if(focus)section.querySelector(`button[data-native-tab-item="${index}"]`)?.focus({preventScroll:true});
  }
  section.addEventListener('click',event=>{
   const item=event.target.closest('[data-native-tab-item]');
   if(item){event.preventDefault();select(Number(item.dataset.nativeTabItem));return;}
   const toggle=event.target.closest('[data-native-tab-toggle]');if(!toggle)return;
   const open=toggle.getAttribute('aria-expanded')!=='true';
   toggle.setAttribute('aria-expanded',String(open));toggle.querySelector('i')?.classList.toggle('rotate-180',open);
   for(const cls of ['pointer-events-none','invisible','opacity-0'])toggle.nextElementSibling?.classList.toggle(cls,!open);
  });
  section.addEventListener('keydown',event=>{
   if(event.key==='Escape'){closeMenu();return;}
   if(!event.target.matches('button[data-native-tab-item]'))return;
   const steps={ArrowRight:1,ArrowLeft:-1};
   if(event.key in steps){event.preventDefault();select((selected+steps[event.key]+model.states.length)%model.states.length,true);}
  });
  document.addEventListener('click',event=>{if(!section.contains(event.target))closeMenu();});
  window.addEventListener('resize',positionIndicator,{passive:true});
 document.fonts.ready.then(positionIndicator);closeMenu();positionIndicator();
 });
 main.querySelectorAll('[data-native-carousel]').forEach(section=>{
  const model=data.carousels?.[Number(section.dataset.nativeCarousel)];if(!model?.states?.length)return;
  let selected=0;
  function observeTestimonials(){
   section.querySelectorAll('div.lg\\:hidden').forEach(card=>{
    if(!card.className.includes('aspect-[989/'))return;
    const observer=new IntersectionObserver(entries=>{
     if(!entries.some(entry=>entry.isIntersecting))return;
     const panels=[...card.children];
     for(const panel of panels.slice(0,2)){
      panel.classList.replace('h-[78%]','h-[58.5%]');
      const surface=panel.firstElementChild;
      surface?.classList.replace('[clip-path:polygon(100%_0,0_0,0_100%,100%_100%)]','[clip-path:polygon(100%_0,0_0,0_98%,100%_72%)]');
     }
     const image=panels[2];image?.classList.replace('h-[20%]','h-[58%]');
     image?.firstElementChild?.classList.replace('[clip-path:polygon(100%_0,0_0,0_100%,100%_100%)]','[clip-path:polygon(100%_2%,0_28%,0_100%,100%_100%)]');
     card.querySelectorAll('.motion-safe\\:translate-y-8').forEach(el=>{
      el.classList.replace('motion-safe:translate-y-8','motion-safe:translate-y-0');
      el.classList.replace('motion-safe:opacity-0','motion-safe:opacity-100');
     });
     observer.disconnect();
    },{threshold:0});observer.observe(card);
   });
  }
  observeTestimonials();
  section.addEventListener('click',event=>{
   const button=event.target.closest('button[aria-label="Next"],button[aria-label="Previous"]');
   if(!button||button.disabled)return;
   const direction=button.getAttribute('aria-label')==='Next'?1:-1;
   const next=selected+direction;if(!model.states[next])return;
   selected=next;section.innerHTML=model.states[selected].html;
   observeTestimonials();
   section.querySelectorAll('[class*="motion-safe:opacity-0"]').forEach(el=>reveal.observe(el));
   section.querySelector(`button[aria-label="${direction===1?'Next':'Previous'}"]`)?.focus({preventScroll:true});
  });
 });
})();
