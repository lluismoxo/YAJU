// Report-specific animation. GSAP is pinned to the version used by the reference.
(() => {
  const { gsap, ScrollTrigger, SplitText } = window;
  const desktop = document.querySelector('[data-component="idc-report-hero"]');
  const mobile = document.querySelector('[data-component="idc-report-hero-mobile"]');
  if (!desktop || !mobile || !gsap || !ScrollTrigger || !SplitText) return;
  gsap.registerPlugin(ScrollTrigger, SplitText);
  const hidden = { yPercent: 125 }, visible = { yPercent: 0 };
  const reveal = { duration: 1.1, ease: 'power4.out', stagger: { each: .06 } };
  const revealStats = { ...reveal, stagger: { amount: .35 } };
  const digits = { yPercent: value => gsap.utils.wrap(-1000 / 11, 0, parseFloat(value)) };
  const list = (root, selector) => [...root.querySelectorAll(selector)];
  function split(root) {
    const splits = [];
    list(root, '[data-idc-clip]').forEach(parent => {
      if (!parent.textContent.trim()) return;
      const text = parent.querySelector('.portable-text-breaks') || parent;
      const children = [...text.children];
      for (const element of children.length ? children : [text]) {
        const instance = new SplitText(element, { type: 'lines,words', mask: 'lines', tag: 'span' });
        instance.lines.forEach(line => { line.style.position = 'relative'; line.style.display = 'block'; });
        instance.words.forEach(word => { word.style.position = 'relative'; word.style.display = 'inline-block'; word.dataset.reportWord = ''; });
        instance.masks.forEach((mask, index) => {
          mask.style.position = 'relative'; mask.style.display = 'block';
          const padding = .2 * instance.lines[index].offsetHeight;
          mask.style.paddingBottom = `${padding}px`; mask.style.marginBottom = `-${padding}px`;
        });
        splits.push({ instance, parent });
      }
    });
    return {
      words: container => splits.filter(item => container?.contains(item.parent)).flatMap(item => item.instance.words),
      dispose: () => splits.forEach(item => item.instance.revert()),
    };
  }
  document.fonts.ready.then(() => {
    const media = gsap.matchMedia();
    media.add({ desktop: '(min-width: 768px)', reduce: '(prefers-reduced-motion: reduce)' }, context => {
      if (!context.conditions.desktop) return;
      const stage = desktop.firstElementChild;
      const reduced = context.conditions.reduce;
      const text = split(stage), animations = [];
      const grid = stage.querySelector('[data-idc-grid]'), root = stage.querySelector('[data-idc-grid-root]');
      const marks = stage.querySelector('[data-idc-marks]'), plane = stage.querySelector('[data-idc-plane]');
      const firstImage = stage.querySelector('[data-slide1-image]'), zoom = stage.querySelector('[data-slide1-zoom]');
      const firstCopy = stage.querySelector('[data-slide1-copy]'), secondImage = stage.querySelector('[data-slide2-image]');
      const secondCopy = stage.querySelector('[data-slide2-copy]'), fourthCopy = stage.querySelector('[data-slide4-copy]');
      const thirdImages = list(stage, '[data-slide3-images] [data-idc-clip-inner]');
      const fourthImages = list(stage, '[data-slide4-images] [data-idc-clip-inner]');
      const statDigits = list(stage, '[data-idc-stat] [data-idc-digit]');
      const titleDigits = list(stage, '[data-slide4-title] [data-idc-digit]');
      const numbers = list(stage, '[data-idc-stat] [data-idc-number]'), fourthTitle = stage.querySelector('[data-slide4-title]');
      gsap.set(text.words(stage), reduced ? visible : hidden);
      gsap.set([...thirdImages, ...fourthImages], { yPercent: reduced ? 0 : 100, opacity: reduced ? 1 : 0 });
      gsap.set(numbers, { opacity: reduced ? 1 : 0 }); gsap.set(fourthTitle, { opacity: reduced ? 1 : 0 });
      gsap.set(secondCopy, { autoAlpha: reduced ? 1 : 0 }); gsap.set(grid, { opacity: reduced ? 1 : .55 });
      if (reduced) [...statDigits, ...titleDigits].forEach(el => gsap.set(el, { yPercent: -100 / 11 * (Number(el.dataset.idcDigitTotal || 0) % 10) }));
      gsap.set(firstCopy, { opacity: 1 });
      if (reduced) gsap.set(zoom, { scale: 1 }); else gsap.to(zoom, { scale: 1, duration: 1.6, ease: 'power2.out' });
      if (!reduced) gsap.to(text.words(firstCopy), { ...visible, ...reveal, delay: .15 });
      const rows = list(stage, '[data-idc-grid-row]');
      let cell, steps;
      function measure() {
        const tops = rows.map(row => row.getBoundingClientRect().top).sort((a, b) => a - b);
        cell = tops.length < 2 ? stage.offsetHeight / 6 : (tops.at(-1) - tops[0]) / (tops.length - 1);
        steps = Math.max(1, Math.round(stage.offsetHeight / cell));
        stage.style.setProperty('--idc-step', String(steps)); stage.style.setProperty('--idc-travel', String(steps * 3));
      }
      measure();
      const timeline = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: {
        trigger: stage, start: 'top top', end: '+=450%', pin: true, scrub: .4,
        anticipatePin: 1, invalidateOnRefresh: true, onRefreshInit: measure,
      } });
      timeline.fromTo([grid, marks], { y: 0 }, { y: () => -steps * cell * 3, duration: 3 }, 0);
      if (!reduced) {
        timeline.to(grid, { opacity: 1, duration: 1 }, 1);
        const shimmer = { progress: 0 };
        timeline.to(shimmer, { progress: 1, duration: 3, onUpdate: () => root.style.setProperty('--idc-shimmer', String(shimmer.progress)) }, 0);
      }
      timeline.fromTo(plane, { y: () => steps * cell * 2 }, { y: () => -steps * cell, duration: 3 }, 0); gsap.set(plane, { opacity: 1 });
      timeline.to(firstImage, { y: () => -1.05 * stage.offsetHeight, duration: 1 }, 0);
      timeline.to(firstCopy, { y: () => -.95 * stage.offsetHeight, duration: 1 }, 0);
      timeline.fromTo(secondImage, { y: () => 1.05 * stage.offsetHeight, x: () => .04 * stage.offsetWidth }, { y: 0, x: 0, duration: 1 }, 0);
      timeline.to(secondImage, { y: () => -1.05 * stage.offsetHeight, duration: 1 }, 1);
      timeline.fromTo(secondCopy, { y: () => .95 * stage.offsetHeight }, { y: 0, duration: 1 }, 0);
      timeline.to(secondCopy, { y: () => -.95 * stage.offsetHeight, duration: 1 }, 1);
      function once(position, callback) { let played = false; timeline.call(() => { if (!played) { played = true; callback(); } }, undefined, position); }
      const track = animation => { animations.push(animation); return animation; };
      if (!reduced) {
        once(.55, () => { gsap.set(secondCopy, { autoAlpha: 1 }); track(gsap.to(text.words(secondCopy), { ...visible, ...reveal })); });
        const showImages = { yPercent: 0, opacity: 1, duration: .9, ease: 'power3.out', stagger: .12 };
        const showNumbers = { opacity: 1, duration: .35, ease: 'power1.out', stagger: .08 };
        const count = elements => elements.forEach(el => track(gsap.fromTo(el, { yPercent: 0 }, { yPercent: -Number(el.dataset.idcDigitTotal || 0) * 100 / 11, duration: 1.4, ease: 'power3.out', modifiers: digits })));
        once(1.35, () => track(gsap.to(thirdImages, showImages)));
        once(1.6, () => count(statDigits)); once(1.65, () => track(gsap.to(numbers, showNumbers)));
        once(1.7, () => track(gsap.to(list(stage, '[data-idc-stat]').flatMap(text.words), { ...visible, ...revealStats })));
        once(2.35, () => track(gsap.to(fourthImages, showImages)));
        once(2.6, () => count(titleDigits)); once(2.65, () => track(gsap.to(fourthTitle, showNumbers)));
        once(2.7, () => track(gsap.to(text.words(fourthCopy), { ...visible, ...revealStats })));
      }
      return () => { animations.forEach(animation => animation.kill()); text.dispose(); };
    });
    media.add({ mobile: '(max-width: 767px)', reduce: '(prefers-reduced-motion: reduce)' }, context => {
      if (!context.conditions.mobile) return;
      const text = split(mobile), firstCopy = mobile.querySelector('[data-slide1-copy]');
      gsap.set(firstCopy, { opacity: 1 });
      if (context.conditions.reduce) {
        list(mobile, '[data-idc-digit]').forEach(el => gsap.set(el, { yPercent: -100 / 11 * (Number(el.dataset.idcDigitTotal || 0) % 10) }));
        return text.dispose;
      }
      gsap.set(text.words(mobile), hidden);
      gsap.set(list(mobile, '[data-idc-clip-inner]'), { yPercent: 100, opacity: 0 });
      gsap.set(list(mobile, '[data-idc-number]'), { opacity: 0 });
      const trigger = element => ({ trigger: element, start: 'top 82%', once: true });
      const shimmer = { progress: 0 }, root = mobile.querySelector('[data-idc-grid-root]');
      gsap.to(shimmer, { progress: 1, ease: 'none', scrollTrigger: { trigger: mobile, start: 'top bottom', end: 'bottom top', scrub: .4 }, onUpdate: () => root.style.setProperty('--idc-shimmer', String(shimmer.progress)) });
      const revealCopy = (element, first = false) => gsap.to(text.words(element), { ...visible, ...reveal, ...(first ? { delay: .15 } : { scrollTrigger: trigger(element) }) });
      function count(section) {
        gsap.to(list(section, '[data-idc-number]'), { opacity: 1, duration: .5, ease: 'power1.out', scrollTrigger: trigger(section) });
        list(section, '[data-idc-digit]').forEach(el => gsap.fromTo(el, { yPercent: 0 }, { yPercent: -Number(el.dataset.idcDigitTotal || 0) * 100 / 11, duration: 1.2, ease: 'power1.out', modifiers: digits, scrollTrigger: trigger(section) }));
      }
      revealCopy(firstCopy, true); revealCopy(mobile.querySelector('[data-slide2-copy]'));
      list(mobile, '[data-idc-stat], [data-slide4-copy]').forEach(section => { count(section); revealCopy(section); });
      list(mobile, '[data-idc-clip-inner]').forEach(el => gsap.to(el, { yPercent: 0, opacity: 1, duration: .6, ease: 'power2.out', scrollTrigger: trigger(el.parentElement) }));
      return text.dispose;
    });
  });
})();
