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
