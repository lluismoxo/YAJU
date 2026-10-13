// Pointer-only headline effect, using the same sampling and motion as the original.
(() => {
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const padding=96;
 document.querySelectorAll('.dissolve-headline').forEach(root=>{
  const text=root.querySelector('.dissolve-headline__text');
  const canvas=root.querySelector('.dissolve-headline__canvas');
  if(!text||!canvas)return;
  let particles=[],pointer={x:0,y:0},padLeft=48,padTop=48;
  let hovering=false,returning=false,frame=0,color='#000',generation=0;
  function clearMask(){for(const key of ['maskImage','webkitMaskImage','maskComposite','webkitMaskComposite'])text.style[key]='';}
  function mask(){
   const x=pointer.x-padding-padLeft,y=pointer.y-padding-padTop;
   const value=`radial-gradient(126px 86.39999999999999px at ${x-18}px ${y+10}px, transparent 0%, transparent 22%, rgba(0,0,0,0.4) 48%, black 78%), radial-gradient(81.60000000000001px 134.4px at ${x+16}px ${y-14}px, transparent 0%, transparent 18%, rgba(0,0,0,0.35) 44%, black 76%), radial-gradient(105.6px 98.39999999999999px at ${x+6}px ${y+16}px, transparent 0%, transparent 20%, rgba(0,0,0,0.45) 50%, black 80%), radial-gradient(93.60000000000001px 114px at ${x-8}px ${y-8}px, transparent 0%, transparent 16%, rgba(0,0,0,0.3) 46%, black 74%)`;
   text.style.maskImage=value;text.style.webkitMaskImage=value;
   text.style.maskComposite='intersect';text.style.webkitMaskComposite='source-in';
  }
  function reset(){
   generation++;cancelAnimationFrame(frame);frame=0;hovering=false;returning=false;particles=[];
   canvas.getContext('2d')?.clearRect(0,0,canvas.width,canvas.height);
   canvas.style.opacity='0';clearMask();root.classList.remove('is-dissolved');
  }
  function draw(){
   const context=canvas.getContext('2d');if(!context)return;
   context.clearRect(0,0,canvas.width,canvas.height);context.shadowBlur=0;context.shadowColor='transparent';context.imageSmoothingEnabled=false;
   for(const particle of particles){
    const dx=particle.ox-pointer.x,dy=particle.oy-pointer.y;
    if(dx*dx+dy*dy>14400&&Math.abs(particle.x-particle.ox)<=.35&&Math.abs(particle.y-particle.oy)<=.35)continue;
    context.save();context.translate(particle.x,particle.y);context.rotate(particle.rot);
    context.globalAlpha=particle.opacity;context.fillStyle=color;
    context.fillRect(-.5*particle.w,-.5*particle.h,particle.w,particle.h);context.restore();
   }
   context.globalAlpha=1;
  }
  function animate(){
   let settled=returning||!hovering;
   for(const particle of particles){
    const dx=particle.ox-pointer.x,dy=particle.oy-pointer.y,distance=Math.hypot(dx,dy)||1;
    if(hovering&&!returning&&dx*dx+dy*dy<=14400){
     const proximity=1-Math.min(1,distance/120),edge=1-proximity;
     const force=.05+.72*edge,jitter=.55+1.05*proximity;
     particle.vx+=dx/distance*force+(Math.random()-.5)*jitter;
     particle.vy+=dy/distance*force+(Math.random()-.5)*jitter+.1;
     const damping=.84+.1*proximity;particle.vx*=damping;particle.vy*=damping;
     particle.x+=particle.vx;particle.y+=particle.vy;
     const limit=10+78*edge,travel=Math.hypot(particle.x-particle.ox,particle.y-particle.oy);
     if(travel>limit){const scale=limit/travel;particle.x=particle.ox+(particle.x-particle.ox)*scale;particle.y=particle.oy+(particle.y-particle.oy)*scale;particle.vx*=.5;particle.vy*=.5;}
     particle.rot+=particle.spin+.02*particle.vx;
     particle.opacity=Math.max(.2,particle.baseOpacity*(1-Math.hypot(particle.x-particle.ox,particle.y-particle.oy)/110));settled=false;
    }else{
     const dx=particle.ox-particle.x,dy=particle.oy-particle.y;
     particle.vx=.2*dx;particle.vy=.2*dy;particle.x+=particle.vx;particle.y+=particle.vy;
     particle.rot*=.85;particle.opacity+=(particle.baseOpacity-particle.opacity)*.2;
     if(Math.abs(dx)>.4||Math.abs(dy)>.4)settled=false;
    }
   }
   if(hovering&&!returning)mask();draw();
   if(returning&&settled){reset();return;}
   if(hovering||!settled||returning)frame=requestAnimationFrame(animate);else frame=0;
  }
  function start(){if(!frame)frame=requestAnimationFrame(animate);}
  function move(event){
   const rect=text.getBoundingClientRect(),scaleX=rect.width/Math.max(text.offsetWidth,1),scaleY=rect.height/Math.max(text.offsetHeight,1);
   pointer={x:(event.clientX-rect.left)/scaleX+padding+padLeft,y:(event.clientY-rect.top)/scaleY+padding+padTop};
  }
  async function prepare(){
   const request=++generation;await document.fonts.ready;
   if(request!==generation||!hovering||reduced.matches)return;
   const style=getComputedStyle(text),size=parseFloat(style.fontSize)||180;
   const font=`${style.fontStyle&&style.fontStyle!=='normal'?style.fontStyle+' ':''}${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
   const spacing=parseFloat(style.letterSpacing)||0,label=text.textContent;
   color=style.color||'#000';
   const sample=document.createElement('canvas'),context=sample.getContext('2d',{willReadFrequently:true});if(!context)return;
   context.font=font;const metrics=context.measureText(label);
   const textHeight=Math.max(text.offsetHeight,text.scrollHeight,Math.ceil((metrics.actualBoundingBoxAscent??.8*size)+(metrics.actualBoundingBoxDescent??.3*size)+.12*size),1);
   let advance=0,inkLeft=0,inkRight=0;
   if('letterSpacing' in context){context.letterSpacing=`${spacing}px`;const measured=context.measureText(label);advance=measured.width;inkLeft=measured.actualBoundingBoxLeft??0;inkRight=measured.actualBoundingBoxRight??advance;}
   else [...label].forEach((letter,index,letters)=>{const measured=context.measureText(letter),left=advance-(measured.actualBoundingBoxLeft??0),right=advance+(measured.actualBoundingBoxRight??measured.width);inkLeft=index===0?left:Math.min(inkLeft,left);inkRight=Math.max(inkRight,right);advance+=measured.width;if(index<letters.length-1)advance+=spacing;});
   const inkPadding=Math.max(48,Math.ceil(.35*size));padLeft=Math.ceil(Math.max(inkPadding,inkLeft+8));
   sample.width=Math.max(1,Math.ceil(padLeft+Math.max(text.offsetWidth,text.scrollWidth,1,advance,Math.ceil(inkRight))+Math.ceil(Math.max(inkPadding,Math.ceil(inkRight)-advance+16))));
   sample.height=Math.max(1,Math.ceil(textHeight+2*inkPadding));padTop=Math.max(0,Math.round((sample.height-textHeight)/2));
   context.fillStyle=color;context.font=font;context.textBaseline='middle';context.textAlign='left';
   if('letterSpacing' in context){context.letterSpacing=`${spacing}px`;context.fillText(label,padLeft,sample.height/2);}
   else{let x=padLeft;[...label].forEach((letter,index,letters)=>{context.fillText(letter,x,sample.height/2);x+=context.measureText(letter).width;if(index<letters.length-1)x+=spacing;});}
   const pixels=context.getImageData(0,0,sample.width,sample.height).data;
   let ink=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]>24)ink++;
   const step=ink>4400?Math.max(1,Math.ceil(Math.sqrt(ink/4400))):1;particles=[];
   for(let y=0;y<sample.height;y+=step)for(let x=0;x<sample.width;x+=step){
    if(pixels[(y*sample.width+x)*4+3]<=24)continue;
    const a=43758.5453*Math.sin(12.9898*x+78.233*y),random=a-Math.floor(a);
    const b=23421.631*Math.sin(39.346*x+11.135*y),other=b-Math.floor(b),size=.55+1.1*random,elongated=other>.72,opacity=.72+.28*random;
    particles.push({ox:x+padding,oy:y+padding,x:x+padding,y:y+padding,vx:0,vy:0,w:elongated?size*(1.4+other):size,h:elongated?size*(.35+.45*random):size*(.55+.55*other),rot:random*Math.PI*2,spin:(other-.5)*.18,baseOpacity:opacity,opacity});
   }
   const ratio=Math.min(devicePixelRatio||1,2),width=sample.width+192,height=sample.height+192;
   canvas.width=Math.ceil(width*ratio);canvas.height=Math.ceil(height*ratio);
   Object.assign(canvas.style,{width:`${width}px`,height:`${height}px`,left:`${text.offsetLeft-(padding+padLeft)}px`,top:`${text.offsetTop-(padding+padTop)}px`,opacity:'1'});
   canvas.getContext('2d')?.setTransform(ratio,0,0,ratio,0,0);root.classList.add('is-dissolved');mask();draw();
   if(hovering&&particles.length)start();
  }
  root.addEventListener('pointerenter',event=>{if(reduced.matches||event.pointerType==='touch')return;move(event);hovering=true;returning=false;prepare();});
  root.addEventListener('pointermove',event=>{if(!hovering)return;move(event);mask();start();});
  root.addEventListener('pointerleave',()=>{hovering=false;clearMask();if(particles.length){returning=true;start();}});
  reduced.addEventListener('change',()=>{if(reduced.matches)reset();});
  window.addEventListener('resize',reset,{passive:true});
  window.addEventListener('pagehide',reset);
 });
})();
