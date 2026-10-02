// Native site navigation. Content and images are rendered by the build, not patched here.
(() => {
  const desktop = document.querySelector('[data-desktop-nav]');
  const mobile = document.querySelector('[data-mobile-nav]');
  if (!desktop || !mobile) return;
  const bar = desktop.querySelector('[data-nav-bar]');
  const desktopPanel = desktop.querySelector('[data-desktop-panel]');
  const desktopMenus = [...desktop.querySelectorAll('[data-desktop-menu]')];
  const items = [...desktop.querySelectorAll('[data-menu-item]')];
  const overlay = document.querySelector('[data-nav-overlay]');
  const panel = document.querySelector('[data-mobile-panel]');
  const rootMenu = panel.querySelector('[data-mobile-root]');
  const mobileMenus = [...panel.querySelectorAll('[data-mobile-menu]')];
  const toggle = mobile.querySelector('button');
  const banner = document.querySelector('[data-site-banner]');
  const barBase = 'relative z-10 w-full transition-colors duration-300 ease-in-out';
  const desktopBase = 'z-nav hidden lg:block fixed left-0 right-0 transition-transform duration-300 ease-in-out';
  const mobileBase = 'z-nav flex h-[60px] items-center justify-between px-4 lg:hidden fixed left-0 right-0 transition-[transform,background-color,color] duration-300 ease-in-out';
  let activeDesktop = null;
  let desktopHover = false;
  let mobileOpen = false;
  let activeMobile = null;
  let previousScroll = window.scrollY;
  let visible = true;
  let closeTimer;
  const back = document.createElement('div');
  back.className = 'fixed inset-x-0 z-[99] lg:hidden bg-pureWhite';
  back.innerHTML = '<div class="shrink-0 px-4 bg-neutral-90"><button type="button" class="flex min-h-[44px] items-center gap-x-1"><i class="icon-default icon-chevron-left text-icon-sm"></i><span class="relative block overflow-hidden"><span class="text-web3-14 font-body block transition-transform duration-300 ease-out motion-reduce:transition-none translate-y-full motion-reduce:transform-none">Back</span><span class="text-web3-14 font-body absolute inset-x-0 top-0 block transition-transform duration-300 ease-out motion-reduce:transition-none translate-y-0 motion-reduce:translate-y-0" aria-hidden="true">Back</span></span></button></div>';

  function positionPanel() {
    const bottom = mobile.getBoundingClientRect().bottom;
    back.style.top = `${bottom}px`;
    panel.style.top = `${bottom + (mobileOpen && activeMobile !== null ? 44 : 0)}px`;
  }
  function chrome() {
    const scrolled = window.scrollY > 30;
    const menuOpen = activeDesktop !== null || mobileOpen;
    const filled = scrolled || menuOpen;
    const translation = visible ? 'translate-y-0' : '-translate-y-full';
    desktop.className = `${desktopBase}${scrolled ? ' top-0' : ''} ${translation}`;
    mobile.className = `${mobileBase}${scrolled ? ' top-0' : ''} ${translation} ${filled ? 'bg-pureWhite' : 'bg-transparent'}`;
    bar.className = `${barBase} ${filled || desktopHover ? 'bg-pureWhite' : 'border-transparent border-b-transparent bg-transparent'}${activeDesktop !== null ? ' border-neutral-85 border-b' : ''}`;
    overlay.classList.toggle('opacity-100',menuOpen);
    overlay.classList.toggle('opacity-0',!menuOpen);
    requestAnimationFrame(positionPanel);
  }
  function setDesktop(index) {
    clearTimeout(closeTimer);
    activeDesktop = index;
    desktopPanel.className = `grid transition-[grid-template-rows] ease-in-out ${index === null ? 'grid-rows-[0fr] duration-[650ms]' : 'grid-rows-[1fr] duration-300'}`;
    items.forEach((item,i) => item.querySelector('a').classList.toggle('bg-neutral-90', i === index));
    if (index !== null) desktopMenus.forEach((menu,i) => {
      menu.classList.toggle('hidden',i !== index);
      menu.setAttribute('aria-hidden',String(i !== index));
      if (i === index) menu.firstElementChild.dataset.animated = 'true';
    });
    chrome();
  }
  items.forEach((item,index) => {
    item.querySelector('a').addEventListener('click',event=>{if(event.currentTarget.classList.contains('pointer-events-none'))event.preventDefault();});
    item.addEventListener('mouseenter',()=>setDesktop(index));
    item.addEventListener('focusin',()=>setDesktop(index));
    item.addEventListener('focusout',event=>{if(!item.contains(event.relatedTarget))setDesktop(null);});
  });
  desktop.addEventListener('mouseenter',()=>{desktopHover=true;clearTimeout(closeTimer);chrome();});
  desktop.addEventListener('mouseleave',()=>{desktopHover=false;closeTimer=setTimeout(()=>setDesktop(null),200);});
  desktop.querySelector('a[href="/"]').addEventListener('mouseenter',()=>setDesktop(null));

  function setMobile(open, index = null) {
    mobileOpen=open;activeMobile=index;visible=true;
    toggle.setAttribute('aria-expanded',String(open));
    toggle.setAttribute('aria-label',open?'Close navigation menu':'Open navigation menu');
    const icon=toggle.querySelector('img');
    icon.src=open?'/nav_close.svg':'/nav_icon.svg';
    icon.className=open?'m-1 h-6 w-6 p-1':'h-8 w-8 p-1';
    panel.classList.toggle('[clip-path:inset(0_0_0_0)]',open);
    panel.classList.toggle('[clip-path:inset(0_0_100%_0)]',!open);
    panel.classList.toggle('pointer-events-auto',open);
    panel.classList.toggle('pointer-events-none',!open);
    panel.setAttribute('aria-hidden',String(!open));
    panel.dataset.navAnimated=String(open);
    rootMenu.classList.toggle('hidden',index!==null);
    rootMenu.setAttribute('aria-hidden',String(index!==null));
    mobileMenus.forEach((menu,i)=>{
      menu.classList.toggle('hidden',i!==index);
      menu.classList.toggle('flex',i===index);
      menu.setAttribute('aria-hidden',String(i!==index));
    });
    if(open&&index!==null) panel.before(back);else back.remove();
    document.body.style.overflowY=open?'hidden':'unset';
    chrome();
  }
  toggle.addEventListener('click',()=>setMobile(!mobileOpen));
  panel.querySelectorAll('[data-mobile-menu-item]').forEach(button=>button.addEventListener('click',()=>setMobile(true,Number(button.dataset.mobileMenuItem))));
  back.querySelector('button').addEventListener('click',()=>setMobile(true));
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){setDesktop(null);if(mobileOpen){setMobile(false);toggle.focus();}}});
  banner?.querySelector('button').addEventListener('click',()=>{banner.remove();chrome();});
  window.addEventListener('scroll',()=>{
    const y=window.scrollY;
    visible=window.innerWidth>=1024 || mobileOpen || activeDesktop!==null || y<=previousScroll || y<=30;
    previousScroll=y;chrome();
  },{passive:true});
  window.addEventListener('resize',()=>{if(window.innerWidth>=1024&&mobileOpen)setMobile(false);chrome();});
  new ResizeObserver(positionPanel).observe(document.body);

  document.querySelectorAll('[data-footer-accordion]').forEach(button=>{
    button.addEventListener('click',()=>{
      const open=button.getAttribute('aria-expanded')!=='true';
      button.setAttribute('aria-expanded',String(open));
      button.querySelector('i').classList.toggle('rotate-180',open);
      const drawer=button.nextElementSibling;
      drawer.classList.toggle('grid-rows-[1fr]',open);
      drawer.classList.toggle('grid-rows-[0fr]',!open);
      drawer.classList.toggle('duration-300',open);
      drawer.classList.toggle('duration-500',!open);
      drawer.firstElementChild.setAttribute('aria-hidden',String(!open));
      drawer.querySelector('[class*="group/footer-drawer"]').dataset.animated=String(open);
    });
  });
  const language = [...document.querySelectorAll('footer button')].find(button=>button.textContent.trim()==='English');
  if(language) {
    const options=language.nextElementSibling;
    const setLanguageOpen=open=>{
      language.setAttribute('aria-expanded',String(open));
      ['pointer-events-none','invisible','opacity-0'].forEach(name=>options.classList.toggle(name,!open));
      ['pointer-events-auto','visible','opacity-100'].forEach(name=>options.classList.toggle(name,open));
      language.querySelector('.icon-chevron-down')?.classList.toggle('motion-safe:rotate-180',open);
    };
    language.addEventListener('click',()=>setLanguageOpen(options.classList.contains('invisible')));
    options.addEventListener('click',()=>setLanguageOpen(false));
    document.addEventListener('click',event=>{if(!language.parentElement.contains(event.target))setLanguageOpen(false);});
  }
  chrome();
})();
