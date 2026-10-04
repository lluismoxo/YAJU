// Native content behaviours. Page content is already present in the server-rendered HTML.
(() => {
 const main=document.querySelector('main');if(!main)return;
 const data=JSON.parse(document.getElementById('native-page-data')?.textContent||'{}');
 main.querySelectorAll('video[data-native-autoplay]').forEach(video=>{
  video.muted=true;
  video.play().catch(()=>{}); // Browsers can defer playback until media is ready or interacted with.
 });
 // Reflow the report's masked text at the current viewport instead of retaining
 // line breaks produced by the old runtime at its capture width.
 const reportText=[...main.querySelectorAll('[data-component^="idc-report-hero"] [data-idc-clip] .portable-text-breaks > *')].map(element=>{
  const original=element.cloneNode(true);
  original.querySelectorAll('span[aria-hidden="true"]').forEach(span=>span.replaceWith(...span.childNodes));
  original.removeAttribute('aria-label');
  // SplitText consumed the explicit heading break in the desktop snapshot.
  if(element.closest('h1')&&element.closest('[data-component="idc-report-hero"]')){
   const mobile=main.querySelector('[data-component="idc-report-hero-mobile"] h1 .portable-text-breaks > *');
   if(mobile)original.innerHTML=mobile.innerHTML;
  }
  return {element,html:original.innerHTML};
 });
 function reflowReportText(){
  for(const {element,html} of reportText){
   element.innerHTML=html;
   if(!element.getBoundingClientRect().width)continue;
   const walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT),nodes=[];
   while(walker.nextNode())nodes.push(walker.currentNode);
   const words=[];
   for(const node of nodes){
    const fragment=document.createDocumentFragment();
    for(const part of node.textContent.split(/(\s+)/)){
     if(!part)continue;
     if(/^\s+$/.test(part)){fragment.append(document.createTextNode(part));continue;}
     const word=document.createElement('span');word.textContent=part;
     word.style.cssText='position:relative;display:inline-block;';word.setAttribute('aria-hidden','true');
     words.push(word);fragment.append(word);
    }
    node.replaceWith(fragment);
   }
   const lines=[];
   for(const word of words){const top=word.getBoundingClientRect().top;
    if(!lines.length||Math.abs(lines.at(-1).top-top)>2)lines.push({top,words:[]});
    lines.at(-1).words.push(word);
   }
   const content=document.createDocumentFragment();
   for(const line of lines){
    const range=document.createRange();range.setStartBefore(line.words[0]);range.setEndAfter(line.words.at(-1));
    const mask=document.createElement('span'),inner=document.createElement('span');
    mask.setAttribute('aria-hidden','true');inner.setAttribute('aria-hidden','true');
    const padding=line.words[0].offsetHeight*.2;
    mask.style.cssText=`text-align:center;overflow:clip;position:relative;display:block;padding-bottom:${padding}px;margin-bottom:-${padding}px;`;
    inner.style.cssText='text-align:center;position:relative;display:block;';
    inner.append(range.cloneContents());mask.append(inner);content.append(mask);
   }
   const label=element.textContent;element.replaceChildren(content);element.setAttribute('aria-label',label);
  }
 }
 if(reportText.length){document.fonts.ready.then(reflowReportText);window.addEventListener('resize',reflowReportText,{passive:true});}
 const reportHero=main.querySelector('[data-component="idc-report-hero"]');
 const mobileReportHero=main.querySelector('[data-component="idc-report-hero-mobile"]');
 if(mobileReportHero){
  const copy=mobileReportHero.querySelector('[data-slide1-copy]');if(copy)copy.style.opacity='1';
  mobileReportHero.querySelectorAll('[data-idc-digit]').forEach(digit=>{
   const value=Number(digit.dataset.idcDigitTotal||0)%10;digit.style.transform=`translateY(${-100/11*value}%)`;
  });
 }
 if(reportHero){
  const spacer=reportHero.querySelector(':scope > .pin-spacer');
  const stage=spacer?.firstElementChild;
  if(stage){
   const clamp=value=>Math.max(0,Math.min(1,value));
   function translate(selector,y,x=0){stage.querySelectorAll(selector).forEach(el=>{
    el.style.translate='none';el.style.rotate='none';el.style.scale='none';el.style.transform=`translate(${x}px, ${y}px)`;
   });}
   function paintHero(){
    if(innerWidth<768)return;
    const height=innerHeight,width=stage.clientWidth,cell=Math.min(innerWidth,1920)*0.1;
    const steps=Math.max(1,Math.round(height/cell));
    const position=clamp(-reportHero.getBoundingClientRect().top/(height*4.5))*3;
    stage.style.setProperty('--idc-step',String(steps));stage.style.setProperty('--idc-travel',String(3*steps));
    translate('[data-idc-grid], [data-idc-marks]',-steps*cell*position);
    translate('[data-idc-plane]',steps*cell*(2-position));
    translate('[data-slide1-image]',-1.05*height*clamp(position));
    translate('[data-slide1-copy]',-.95*height*clamp(position));
    translate('[data-slide2-image]',1.05*height*(1-clamp(position)-clamp(position-1)),.04*width*(1-clamp(position)));
    translate('[data-slide2-copy]',.95*height*(1-clamp(position)-clamp(position-1)));
    const copy=stage.querySelector('[data-slide2-copy]');if(copy){copy.style.opacity='1';copy.style.visibility='inherit';}
    const plane=stage.querySelector('[data-idc-plane]');if(plane)plane.style.opacity='1';
   }
   function sizeHero(){
    spacer.style.cssText='position:relative;display:block;width:100%;height:550dvh;';
    stage.style.cssText='position:sticky;top:0;width:100%;height:100dvh;';
    paintHero();
   }
   let frame=0;window.addEventListener('scroll',()=>{if(!frame)frame=requestAnimationFrame(()=>{frame=0;paintHero();});},{passive:true});
   window.addEventListener('resize',sizeHero,{passive:true});sizeHero();
  }
 }
 const shareUrl=document.querySelector('link[rel="canonical"]')?.href||location.href;
 function copySection(anchor){
  const url=new URL(shareUrl);url.hash=anchor.id;
  navigator.clipboard?.writeText(url.href).catch(()=>{});
 }
 main.querySelectorAll('[aria-label="Copy link to this section"][id]').forEach(anchor=>{
  anchor.addEventListener('click',()=>copySection(anchor));
  anchor.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();copySection(anchor);}});
 });
 main.querySelectorAll('button.react-share__ShareButton').forEach(button=>{
  const label=button.querySelector('img')?.alt||'';
  const endpoint=label.includes('LinkedIn')?'https://www.linkedin.com/sharing/share-offsite/':label.includes('Twitter')?'https://twitter.com/intent/tweet':null;
  if(!endpoint)return;
  button.setAttribute('aria-label',label.includes('LinkedIn')?'Share on LinkedIn':'Share on X');
  button.addEventListener('click',()=>{const url=new URL(endpoint);url.searchParams.set('url',shareUrl);window.open(url.href,'_blank','noopener,noreferrer,width=550,height=400');});
 });
 if(data.toc){
  const anchors=data.toc.ids.map(id=>document.getElementById(id));
  const toggle=main.querySelector('[aria-controls="blog-mobile-toc-list"]');
  const desktop=[...main.querySelectorAll('aside nav ol > li > button')];
  let menu=null,oldOverflow='',lastY=window.scrollY,headerOffset=60;
  function closeToc(){if(!menu)return;menu.remove();menu=null;document.body.style.overflowY=oldOverflow;toggle.setAttribute('aria-expanded','false');toggle.classList.remove('pointer-events-none','opacity-0');}
  function goTo(index){
   const anchor=anchors[index];if(!anchor)return;
   closeToc();history.replaceState(null,'',`${location.pathname}${location.search}#${anchor.id}`);
   anchor.scrollIntoView({behavior:'smooth',block:'start'});
  }
  desktop.forEach((button,index)=>button.addEventListener('click',()=>goTo(index)));
  toggle?.addEventListener('click',()=>{
   if(menu){closeToc();return;}
   const template=document.createElement('template');template.innerHTML=data.toc.html;menu=template.content.firstElementChild;
   toggle.parentElement.parentElement.append(menu);toggle.setAttribute('aria-expanded','true');toggle.classList.add('pointer-events-none','opacity-0');
   oldOverflow=document.body.style.overflowY;document.body.style.overflowY='hidden';
   menu.querySelectorAll('ol > li').forEach((li,index)=>li.querySelector('button').addEventListener('click',()=>goTo(index)));
   menu.querySelector('[aria-label="Close table of contents"]')?.addEventListener('click',closeToc);
  });
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&menu){closeToc();toggle?.focus({preventScroll:true});}});
  document.addEventListener('mousedown',event=>{if(menu&&!menu.contains(event.target)&&!toggle.contains(event.target))closeToc();});
  function updateToc(){
   const y=window.scrollY,position=y+61;let active=0;
   const tops=anchors.map(a=>a.getBoundingClientRect().top+y);tops.forEach((top,i)=>{if(top<=position)active=i;});
   let progress;
   if(anchors[active+1])progress=(position-tops[active])/Math.max(tops[active+1]-tops[active],1);
   else{const bottom=anchors[active].closest('.blog-post-body')?.getBoundingClientRect().bottom+y||document.documentElement.scrollHeight;
    const start=Math.max(tops[active]-60,0);progress=(y-start)/Math.max(Math.min(Math.max(bottom-60,start),Math.max(document.documentElement.scrollHeight-innerHeight,0))-start,1);}
   progress=Math.min(1,Math.max(0,progress));
   desktop.forEach((button,index)=>{
    [...button.children].forEach((span,i)=>span.style.color=index===active?'rgb(255, 255, 255)':i===0?'rgb(117, 117, 138)':'rgb(189, 189, 189)');
    const track=button.nextElementSibling;if(!track)return;
    track.style.backgroundColor=index===active?'rgb(117, 117, 138)':'rgb(58, 58, 64)';
    if(index===active){if(!track.firstElementChild){const bar=document.createElement('div');bar.className='absolute inset-y-0 left-0 bg-gradient-to-r from-coral-500 via-violet-500 to-blue-500';track.append(bar);}track.firstElementChild.style.width=`${progress*100}%`;}else track.replaceChildren();
   });
   if(toggle){toggle.children[0].textContent=String(active+1);toggle.children[1].textContent=anchors[active].textContent.trim();
    const bar=toggle.nextElementSibling?.firstElementChild;if(bar)bar.style.width=`${progress*100}%`;
    if(y>lastY&&y>30)headerOffset=0;else if(y<lastY)headerOffset=60;
    const sticky=toggle.closest('.sticky');if(sticky&&!menu){
     const top=headerOffset?61:0;sticky.style.top=`${top}px`;
     const pinned=(sticky.previousElementSibling?.getBoundingClientRect().top??Infinity)<top-2;
     const surface=toggle.parentElement;surface.classList.toggle('bg-pureBlack',pinned);
     surface.classList.toggle('border-t',pinned&&headerOffset>0);
     surface.classList.toggle('border-neutral-30',pinned&&headerOffset>0);
    }}
   lastY=y;
  }
  let queued=false;function queueToc(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;updateToc();});}
  window.addEventListener('scroll',queueToc,{passive:true});window.addEventListener('resize',queueToc,{passive:true});updateToc();
 }
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
 main.querySelectorAll('[data-native-pagination]').forEach(section=>{
  const model=data.pagination?.[Number(section.dataset.nativePagination)];if(!model?.states?.length)return;
  let selected=0;
  section.addEventListener('click',event=>{
   const button=event.target.closest('button[data-native-page-item],button[data-native-page-step]');
   if(!button||button.disabled)return;
   const next=button.hasAttribute('data-native-page-item')?Number(button.dataset.nativePageItem):selected+Number(button.dataset.nativePageStep);
   if(!model.states[next])return;
   selected=next;section.innerHTML=model.states[next].html;
   section.querySelectorAll('[class*="motion-safe:opacity-0"]').forEach(el=>reveal.observe(el));
  });
 });
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
