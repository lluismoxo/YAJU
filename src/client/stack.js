// Shared native controller for the original stacking-card component.
document.querySelectorAll('[data-native-stack]').forEach(stack => {
  if (!stack || !window.gsap || !window.ScrollTrigger) return;
  const {gsap, ScrollTrigger} = window;
  gsap.registerPlugin(ScrollTrigger);
  const cards = [...stack.children];
  const textBlocks = cards.slice(0,-1).map(card=>card.querySelector('.left-text-container'));
  const hasEyebrow = cards.some(card=>card.querySelector('.font-eyebrow'));
  let context, media;
  function mount() {
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
        textBlocks.forEach((text,index)=>gsap.to(text,{
          y:()=>text.parentElement.getBoundingClientRect().top-text.getBoundingClientRect().top+25,
          ease:'power1.inOut',scrollTrigger:{trigger:text,start:`-100 ${35+100*index+1}`,end:`100 ${35+100*index+1}`,scrub:true,toggleActions:'play none none reverse',pinSpacing:false,invalidateOnRefresh:true},
        }));
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
  mount();
  window.addEventListener('pagehide',()=>{media?.revert();context?.revert();});
  window.addEventListener('pageshow',event=>{if(event.persisted)mount();});
});
