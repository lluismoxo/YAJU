// Native content behaviours. Page content is already present in the server-rendered HTML.
(() => {
 const main=document.querySelector('main');if(!main)return;
 function formatCardDates(root){
  root.querySelectorAll('[data-native-card-date]').forEach(node=>{
   const date=new Date(node.dataset.nativeCardDate);
   const year=date.getFullYear(),day=date.getDate();
   const label=date.toLocaleString(document.documentElement.lang||'en-US',{month:'short'});
   node.textContent=node.textContent.replace(/ - [^<>]*$/,` - ${label} ${String(day).padStart(2,'0')}, ${year}`);
  });
 }
 formatCardDates(main);

 // The original page enables its keyboard focus theme after the first Tab.
 function enableKeyboardFocus(event){
  if(event.code!=='Tab')return;
  document.body.classList.add('user-is-tabbing');
  window.removeEventListener('keydown',enableKeyboardFocus);
 }
 window.addEventListener('keydown',enableKeyboardFocus);
 const data=JSON.parse(document.getElementById('native-page-data')?.textContent||'{}');
 // CTA colours, outlines and underlines were previously driven by React mouse state.
 // Delegate so cards inserted by the native carousels keep the same behaviour.
 const buttonStates=new WeakMap(), activeButtons=new Set();
 const nativeButton=event=>event.target.closest?.('.web3-primary-solid-btn, a.ease-button-gradient, button.ease-button-gradient');
 function buttonState(button){
  if(!buttonStates.has(button)){
   const classes=button.classList;
   const kind=classes.contains('web3-primary-solid-btn')?'solid':classes.contains('rounded-full')&&classes.contains('border')?'outlined':classes.contains('pb-1.5')?'secondary':null;
   if(!kind)return null;
   const dark=kind==='solid'?classes.contains('bg-pureWhite'):kind==='outlined'?classes.contains('border-pureWhite'):classes.contains('text-white');
   if(kind==='solid'&&!dark&&!classes.contains('bg-neutral-15'))return null;
   buttonStates.set(button,{kind,dark,hover:false,pressed:false});
  }
  return buttonStates.get(button);
 }
 function paintButton(button,state){
  const disabled=button.disabled||button.getAttribute('aria-disabled')==='true';
  const highlighted=!disabled&&(state.hover||state.pressed);
  if(state.kind==='solid'){
   button.classList.toggle('web3-primary-solid-btn-hover',!disabled&&state.hover);
   const base=state.dark?'text-neutral-15':'bg-neutral-15';
   const highlight=state.dark?'text-pureBlack':'bg-pureBlack';
   // Do not overwrite a separate disabled theme applied by a form controller.
   if(button.classList.contains(base)||button.classList.contains(highlight)){
    button.classList.remove(base,highlight);button.classList.add(highlighted?highlight:base);
   }
  }else if(!disabled&&state.kind==='outlined'){
   button.classList.remove('bg-transparent','bg-neutral-15','bg-pureWhite','text-neutral-15','text-pureWhite','text-pureBlack');
   button.classList.add(highlighted?(state.dark?'bg-pureWhite':'bg-neutral-15'):'bg-transparent',highlighted?(state.dark?'text-pureBlack':'text-pureWhite'):(state.dark?'text-pureWhite':'text-neutral-15'));
  }else if(!disabled&&state.kind==='secondary'){
   const line=button.querySelector('[aria-hidden="true"].h-px');
   if(line){line.classList.toggle('w-full',state.hover);line.classList.toggle('w-0',!state.hover);}
   else{
    const colours=state.dark?['from-coral-85','via-quartz-500','to-blue-325']:['from-coral-500','via-violet-500','to-blue-500'];
    const base=state.dark?['from-white','to-white']:['from-neutral-15','to-neutral-15'];
    button.classList.remove(...colours,...base);
    button.classList.add(...(state.hover&&!state.pressed?colours:base));
   }
  }
  if(state.hover||state.pressed)activeButtons.add(button);else activeButtons.delete(button);
 }
 for(const type of ['mouseover','mouseout','mousedown','mouseup'])main.addEventListener(type,event=>{
  const button=nativeButton(event);if(!button||!main.contains(button))return;
  if((type==='mouseover'||type==='mouseout')&&button.contains(event.relatedTarget))return;
  const state=buttonState(button);if(!state)return;
  if(type==='mouseover')state.hover=true;
  if(type==='mouseout'){state.hover=false;state.pressed=false;}
  if(type==='mousedown')state.pressed=true;
  if(type==='mouseup')state.pressed=false;
  paintButton(button,state);
 });
 window.addEventListener('pagehide',()=>{
  for(const button of activeButtons){const state=buttonStates.get(button);state.hover=false;state.pressed=false;paintButton(button,state);}
 });

 const autoplayVideos=[...main.querySelectorAll('video[data-native-autoplay]')];
 function startVideo(video){video.muted=true;video.play().catch(()=>{});}
 if('IntersectionObserver' in window){
  const videoObserver=new IntersectionObserver(entries=>entries.forEach(({target,isIntersecting})=>{
   if(isIntersecting){startVideo(target);videoObserver.unobserve(target);}
  }),{rootMargin:'250px'});
  autoplayVideos.forEach(video=>videoObserver.observe(video));
 }else autoplayVideos.forEach(startVideo);
 const searchTemplate=document.getElementById('native-search-template');
 if(searchTemplate){
  let overlay=null,opener=null,previousOverflow='',closing=false;
  function closeSearch(){
   if(!overlay||closing)return;closing=true;
   const current=overlay,dialog=current.querySelector('[role="dialog"]');
   current.firstElementChild.classList.replace('opacity-100','opacity-0');
   dialog.classList.replace('opacity-100','opacity-0');dialog.classList.replace('translate-y-0','-translate-y-12');
   document.body.style.overflow=previousOverflow;opener?.focus({preventScroll:true});
   setTimeout(()=>{current.remove();overlay=null;closing=false;},300);
  }
  main.querySelectorAll('[data-search-scope]').forEach(button=>button.addEventListener('click',()=>{
   if(overlay)return;
   opener=button;previousOverflow=document.body.style.overflow;
   overlay=searchTemplate.content.firstElementChild.cloneNode(true);
   const dialog=overlay.querySelector('[role="dialog"]'),input=overlay.querySelector('input');
   const scope=button.dataset.searchScope==='newsroom'?'newsroom':'blog';
   overlay.firstElementChild.classList.replace('opacity-100','opacity-0');
   dialog.classList.replace('opacity-100','opacity-0');dialog.classList.replace('translate-y-0','-translate-y-12');
   document.body.append(overlay);document.body.style.overflow='hidden';
   overlay.firstElementChild.addEventListener('click',closeSearch);
   overlay.querySelector('button').addEventListener('click',closeSearch);
   let clearButton=null;
   function updateClearButton(){
    const hasQuery=input.value.length>0;input.classList.toggle('pr-10',hasQuery);
    if(!hasQuery){clearButton?.remove();clearButton=null;return;}
    if(clearButton)return;
    clearButton=document.createElement('button');clearButton.type='button';clearButton.setAttribute('aria-label','Clear search');
    clearButton.className='absolute right-3 inline-flex h-6 w-6 items-center justify-center text-[24px] transition-transform duration-300 hover:rotate-90 text-pureBlack';
    clearButton.innerHTML='<i class="icon-default icon-close" aria-hidden="true"></i>';
    clearButton.addEventListener('click',()=>{input.value='';updateClearButton();input.focus({preventScroll:true});});
    input.after(clearButton);
   }
   input.addEventListener('input',updateClearButton);
   overlay.querySelector('form').addEventListener('submit',event=>{
    event.preventDefault();const query=input.value.trim();if(!query)return;
    location.assign(`/${scope}/search?${new URLSearchParams({q:query})}`);
   });
   setTimeout(()=>{if(overlay&&!closing)input.focus({preventScroll:true});},0);
   requestAnimationFrame(()=>requestAnimationFrame(()=>{
    if(!overlay||closing)return;
    overlay.firstElementChild.classList.replace('opacity-0','opacity-100');
    dialog.classList.replace('opacity-0','opacity-100');dialog.classList.replace('-translate-y-12','translate-y-0');
   }));
  }));
  document.addEventListener('keydown',event=>{
   if(!overlay||closing)return;
   if(event.key==='Escape'){event.preventDefault();closeSearch();return;}
   if(event.key!=='Tab')return;
   const controls=[...overlay.querySelectorAll('button,input')],first=controls[0],last=controls.at(-1);
   if(event.shiftKey&&(document.activeElement===first||!overlay.contains(document.activeElement))){event.preventDefault();last.focus();}
   else if(!event.shiftKey&&(document.activeElement===last||!overlay.contains(document.activeElement))){event.preventDefault();first.focus();}
  });
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
 main.querySelectorAll('[class*="motion-safe:opacity-0"]').forEach(el=>{if(!el.closest('[data-native-pagination]'))reveal.observe(el);});
 const accordions=[];
 main.querySelectorAll('[data-native-accordion]').forEach(list=>{
  const index=Number(list.dataset.nativeAccordion),model=data.accordions?.[index];if(!model)return;
  const buttons=[...list.querySelectorAll(':scope > li > div > button')];const open=new Set();let started=false,activeMedia=0;
  function paint(){buttons.forEach((button,i)=>{
   const expanded=open.has(i),drawer=button.nextElementSibling;
   button.parentElement.className=expanded?model.states[i].openClass:model.states[i].closedClass;
   button.setAttribute('aria-expanded',String(expanded));button.querySelector('i')?.classList.toggle('rotate-180',expanded);
   drawer.style.height=expanded?`${drawer.scrollHeight}px`:'0px';
  });}
  function select(i){
   if(model.multiple){if(open.has(i))open.delete(i);else open.add(i);}else{open.clear();open.add(i);}
   const media=main.querySelector(`[data-accordion-media="${index}"]`);
   if(media&&i!==activeMedia&&model.states[i].media){
    const template=document.createElement('template');template.innerHTML=model.states[i].media;
    const replacement=template.content.firstElementChild;replacement.dataset.accordionMedia=index;
    // Preserve the image's scroll anchor when its source changes.
    const image=media.querySelector(':scope > img'),nextImage=replacement.querySelector(':scope > img');
    if(media.tagName===replacement.tagName&&media.children.length===1&&replacement.children.length===1&&image&&nextImage){
     for(const [target,source] of [[media,replacement],[image,nextImage]]){
      for(const attribute of [...target.attributes])if(!source.hasAttribute(attribute.name))target.removeAttribute(attribute.name);
      for(const attribute of source.attributes)if(target.getAttribute(attribute.name)!==attribute.value)target.setAttribute(attribute.name,attribute.value);
     }
    }else media.replaceWith(replacement);
    activeMedia=i;
   }
   paint();
  }
  buttons.forEach((button,i)=>button.addEventListener('click',event=>{event.preventDefault();started=true;select(i);}));
  // FAQ sections originally reveal at 30% of their content column (useInView).
  // Merely intersecting the viewport can open a drawer during a jump past it.
  const threshold=model.multiple?0.3:0.1;
  const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting&&(!model.multiple||e.intersectionRatio>=threshold))&&!started){started=true;open.add(0);paint();observer.disconnect();}},{threshold});observer.observe(model.multiple?list.parentElement:list);
  accordions.push(paint);
 });
 window.addEventListener('resize',()=>accordions.forEach(paint=>paint()),{passive:true});
 main.querySelectorAll('[data-native-pagination]').forEach(section=>{
  const model=data.pagination?.[Number(section.dataset.nativePagination)];if(!model?.states?.length)return;
  let selected=0,started=false;
  const entryAnimation='motion-safe:animate-[fadeInUp_0.8s_forwards]';
  const arrowsAnimation='motion-safe:animate-[fadeInRight_0.8s_ease_forwards_200ms]';
  let pending=[];
  // Images loaded before their translated entrance can retain Chromium's
  // animation raster. Refresh once at rest and fully visible, retaining attributes.
  const settledMedia=new WeakSet();
  const mediaReveal=new IntersectionObserver(entries=>entries.forEach(({target,isIntersecting,intersectionRatio})=>{
   if(!isIntersecting||intersectionRatio<1)return;
   mediaReveal.unobserve(target);
   // Let visibility paint before renewing the shared cover/logo layer.
   requestAnimationFrame(()=>requestAnimationFrame(()=>{
    if(!target.isConnected)return;
    target.querySelectorAll('img').forEach(image=>image.replaceWith(image.cloneNode(true)));
   }));
  }),{threshold:1});
  section.addEventListener('animationend',event=>{
   const media=event.target;
   if(event.animationName!=='fadeInUp'||!media.matches('[data-yaju-blog-media]')||settledMedia.has(media))return;
   settledMedia.add(media);
   mediaReveal.observe(media);
  });
  // The original card group reveals once when 20% of the whole grid is visible.
  const observer=new IntersectionObserver(entries=>{
   if(started||!entries.some(entry=>entry.isIntersecting&&entry.intersectionRatio>=0.2))return;
   started=true;pending.forEach(({node,classes})=>node.classList.add(...classes));observer.disconnect();
  },{threshold:0.2});
  function prepareCardReveal(){
   if(started)return;
   pending=[...section.querySelectorAll('[class*="motion-safe:animate-"]')].map(node=>({node,classes:[entryAnimation,arrowsAnimation].filter(name=>node.classList.contains(name))}));
   pending.forEach(({node,classes})=>node.classList.remove(...classes));
   const grid=section.querySelector('a[class~="group/calloutCard"]')?.parentElement;
   if(grid)observer.observe(grid);
  }
  prepareCardReveal();
  section.addEventListener('click',event=>{
   const button=event.target.closest('button[data-native-page-item],button[data-native-page-step]');
   if(!button||button.disabled)return;
   const next=button.hasAttribute('data-native-page-item')?Number(button.dataset.nativePageItem):selected+Number(button.dataset.nativePageStep);
   if(next===selected||!model.states[next])return;
   selected=next;mediaReveal.disconnect();section.innerHTML=model.states[next].html;formatCardDates(section);
   observer.disconnect();prepareCardReveal();
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
   selected=index;section.innerHTML=model.states[index].html;formatCardDates(section);
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
   selected=next;section.innerHTML=model.states[selected].html;formatCardDates(section);
   observeTestimonials();
   section.querySelectorAll('[class*="motion-safe:opacity-0"]').forEach(el=>reveal.observe(el));
   section.querySelector(`button[aria-label="${direction===1?'Next':'Previous'}"]`)?.focus({preventScroll:true});
  });
 });
})();
