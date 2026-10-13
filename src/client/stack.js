// Shared native controller for the original stacking-card component.
document.querySelectorAll('[data-native-stack]').forEach(stack => {
  if (!stack || !window.gsap || !window.ScrollTrigger) return;
  const {gsap, ScrollTrigger} = window;
  gsap.registerPlugin(ScrollTrigger);
  const cards = [...stack.children];
  const textBlocks = cards.slice(0,-1).map(card=>card.querySelector('.left-text-container'));
  const hasEyebrow = cards.some(card=>card.querySelector('.font-eyebrow'));
  // About's visible copy was widened after its original scroll measurements.
  // Keep that motion geometry without loading or displaying the removed media.
  function measurePreviousColumn(text,index) {
    const column=cards[index].dataset.stackMotionColumn;
    if(!column)return null;
    const clone=cards[index].cloneNode(true);
    clone.style.cssText=`position:absolute;visibility:hidden;pointer-events:none;left:0;top:0;width:${stack.offsetWidth}px`;
    clone.setAttribute('aria-hidden','true');
    const copy=clone.querySelector('.left-text-container');
    copy.removeAttribute('style');
    clone.replaceChildren(copy);
    const columnBox=document.createElement('div');
    columnBox.style.cssText=`width:${column==='viewport'?innerWidth:Number(column)}px;max-width:620px;height:480px;flex-shrink:1`;
    clone.append(columnBox);
    stack.append(clone);
    const offset=copy.getBoundingClientRect().top-clone.getBoundingClientRect().top;
    columnBox.remove();
    copy.style.width='100%';copy.style.maxWidth='800px';
    const currentOffset=copy.getBoundingClientRect().top-clone.getBoundingClientRect().top;
    clone.remove();
    return {offset,delta:offset-currentOffset};
  }
  let context, media, mounted=false, active=true;
  function mount() {
    if(mounted||!active)return;
    mounted=true;
    context = gsap.context(() => {
      media = gsap.matchMedia();
      media.add('(max-width: 767px)', () => {
        const backgrounds=cards.filter(card=>card.dataset.stackMobileBackground).map(card=>({card,background:card.style.backgroundImage}));
        backgrounds.forEach(({card})=>{card.style.backgroundImage=`url("${card.dataset.stackMobileBackground}")`;});
        const labels=[...stack.querySelectorAll('.left-text-container a span.font-body')];
        const saved=labels.map(label=>({label,labelClass:label.className,wrapperClass:label.parentElement.className,icons:[...label.closest('a').querySelectorAll('i')].map(icon=>({icon,className:icon.className}))}));
        for(const {label,icons} of saved){
          label.className='text-web3-14 font-body';
          const wrapper=label.parentElement;
          wrapper.classList.replace('[&>*]:text-web3-18','[&>*]:text-web3-14');
          wrapper.classList.replace('[&>*]:text-web3-16','[&>*]:text-web3-14');
          if(wrapper.matches('a.web3-primary-solid-btn')){
            wrapper.classList.remove('px-6','py-3');
            wrapper.classList.add('h-9','px-4');
          }
          icons.forEach(({icon})=>icon.classList.replace('text-icon-md','text-icon-sm'));
        }
        return ()=>{backgrounds.forEach(({card,background})=>{card.style.backgroundImage=background;});saved.forEach(({label,labelClass,wrapperClass,icons})=>{label.className=labelClass;label.parentElement.className=wrapperClass;icons.forEach(({icon,className})=>{icon.className=className;});});};
      });
      media.add({isMobile:'(max-width: 767px)',isDesktop:'(min-width: 768px)'}, ({conditions}) => {
        if (conditions.isMobile || !hasEyebrow) return;
        textBlocks.forEach((text,index)=>{
          let measure, measuredWidth;
          const measurement=()=>{
            const width=`${stack.offsetWidth}/${innerWidth}`;
            if(width!==measuredWidth){measure=measurePreviousColumn(text,index);measuredWidth=width;}
            return measure;
          };
          return gsap.to(text,{
          y:()=>{const measured=measurement();return measured?25-measured.offset:text.parentElement.getBoundingClientRect().top-text.getBoundingClientRect().top+25;},
          ease:'power1.inOut',scrollTrigger:{trigger:text,start:()=>`${-100+(measurement()?.delta||0)} ${35+100*index+1}`,end:()=>`${100+(measurement()?.delta||0)} ${35+100*index+1}`,scrub:true,toggleActions:'play none none reverse',pinSpacing:false,invalidateOnRefresh:true},
          });
        });
      });
      media.add({isMobile:'(max-width: 767px)',isDesktop:'(min-width: 768px)'}, ({conditions}) => {
        const mobile=conditions.isMobile, spacing=mobile?35:28;
        const width=stack.offsetWidth||1;
        cards.forEach((card,index)=>gsap.to(card,{
          scale:mobile?undefined:1-15*(cards.length-1-index)/width,
          ease:'power1.in',scrollTrigger:{trigger:card,start:`${-80-30*index} ${35*(index+1)}`,end:`${-25*cards.length-(cards.length-index+1)*spacing} ${35*(index+1)}`,endTrigger:cards.at(-1),pin:!mobile&&card,scrub:true,toggleActions:'play none none reverse',pinSpacing:false,invalidateOnRefresh:true},
        }));
      });
    },stack);
  }
  const mountWhenReady=()=>document.fonts.ready.then(()=>{if(active)mount();});
  mountWhenReady();
  window.addEventListener('pagehide',()=>{active=false;media?.revert();context?.revert();mounted=false;});
  window.addEventListener('pageshow',event=>{if(event.persisted){active=true;mountWhenReady();}});
});
