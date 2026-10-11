// Preserve the original Labs mission typography and scroll sequence.
(() => {
  const mission = document.querySelector('[data-labs-mission]');
  if (!mission || !window.gsap || !window.SplitText || !window.ScrollTrigger) return;
  const {gsap, SplitText, ScrollTrigger} = window;
  gsap.registerPlugin(SplitText, ScrollTrigger);
  const section = mission.closest('section');
  const headline = mission.querySelector('[data-labs-headline]');
  const body = mission.querySelector('[data-labs-body]');
  const eyebrow = mission.querySelector('.font-eyebrow')?.parentElement;
  if (!headline || !body || !eyebrow) return;
  let context, mediaGroups = [], splits = [];
  function mount() {
    context = gsap.context(() => {
      // The reference initializes this sequence twice after its headline state update.
      // Preserve both word layers: their combined opacity is part of its visible design.
      for (let pass = 0; pass < 2; pass++) {
        const split = new SplitText([headline, body], {type:'words'});
        gsap.set([eyebrow, split.words], {opacity:0.4});
        splits.push(split);
        const media = gsap.matchMedia();
        mediaGroups.push(media);
        media.add('(min-width: 768px)', () => {
          gsap.set(mission, {y:150});
          gsap.timeline({scrollTrigger:{trigger:section,start:'top 20%',end:'bottom 90%',scrub:0.5,toggleActions:'play none none reverse'}})
            .to(mission,{y:0,duration:1.5})
            .to([eyebrow,split.words],{opacity:1,ease:'expo.out',stagger:0.05,duration:2},'>-1');
        });
        media.add('(max-width: 767px)', () => {
          gsap.set(mission, {y:0});
          gsap.to([eyebrow,split.words],{opacity:1,ease:'expo.out',stagger:0.05,duration:1.5,scrollTrigger:{trigger:section,start:'top 20%',end:'bottom 90%',scrub:1,toggleActions:'play none none reverse'}});
        });
      }
    }, section);
  }
  mount();
  window.addEventListener('pagehide', () => {mediaGroups.reverse().forEach(media=>media.revert());splits.reverse().forEach(split=>split.revert());context?.revert();mediaGroups=[];splits=[];});
  window.addEventListener('pageshow', event => {if(event.persisted)mount();});
})();

// Original featured-work card pinning, isolated from the mission animation.
(() => {
  const stack = document.querySelector('[data-native-stack]');
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
        const labels=[...stack.querySelectorAll('.left-text-container a span.font-body')];
        const saved=labels.map(label=>({label,labelClass:label.className,wrapperClass:label.parentElement.className}));
        for(const {label} of saved){label.className='text-web3-14 font-body';label.parentElement.className='[&>*]:text-web3-14';}
        return ()=>saved.forEach(({label,labelClass,wrapperClass})=>{label.className=labelClass;label.parentElement.className=wrapperClass;});
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
})();
