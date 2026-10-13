// One language menu shared by every locale. Navigation remains ordinary links.
(() => {
 document.querySelectorAll('[data-language-trigger]').forEach(button=>{
  const menu=document.getElementById(button.getAttribute('aria-controls'));if(!menu)return;
  const links=[...menu.querySelectorAll('a')];
  function set(open){button.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-hidden',String(!open));for(const c of ['pointer-events-none','invisible','opacity-0'])menu.classList.toggle(c,!open);for(const c of ['pointer-events-auto','visible','opacity-100'])menu.classList.toggle(c,open);links.forEach(link=>link.tabIndex=open?0:-1);button.querySelector('.icon-chevron-down')?.classList.toggle('motion-safe:rotate-180',open);}
  button.addEventListener('click',()=>set(button.getAttribute('aria-expanded')!=='true'));
  button.addEventListener('keydown',event=>{if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();set(true);links[event.key==='ArrowDown'?0:links.length-1].focus();}});
  menu.addEventListener('keydown',event=>{const i=links.indexOf(document.activeElement);if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();links[event.key==='Home'?0:event.key==='End'?links.length-1:(i+(event.key==='ArrowDown'?1:-1)+links.length)%links.length].focus();}});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&button.getAttribute('aria-expanded')==='true'){set(false);button.focus();}});
  document.addEventListener('click',event=>{if(!button.parentElement.contains(event.target))set(false);});
  button.parentElement.addEventListener('focusout',event=>{if(!button.parentElement.contains(event.relatedTarget))set(false);});
  links.forEach(link=>link.addEventListener('click',()=>{const url=new URL(link.href);url.search=location.search;url.hash=location.hash;link.href=url.href;}));
 });
})();
