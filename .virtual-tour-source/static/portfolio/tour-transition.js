// Keep the flat grid on screen until the world's floor has appeared.
(() => {
 const embedded = window.parent !== window;
 if (embedded) {
  window.addEventListener('portfolio-world-ready', () => parent.postMessage({type:'portfolio-world-ready'}, location.origin));
  window.addEventListener('portfolio-world-error', () => parent.postMessage({type:'portfolio-world-error'}, location.origin));
  document.addEventListener('click', event => {
   if (event.target.closest('.portfolio-return')) { event.preventDefault(); parent.postMessage({type:'portfolio-world-close'}, location.origin); }
  });
  return;
 }
 const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
 let frame, loading, previousOverflow, timeout, entered=false;
 const close = () => {
  clearTimeout(timeout); frame?.remove(); loading?.remove(); frame=null; loading=null;
  document.documentElement.classList.remove('tour-loading','tour-entered');
  if (previousOverflow !== undefined) document.body.style.overflow=previousOverflow;
  entered=false;
 };
 window.addEventListener('popstate', close);
 window.addEventListener('message', event => {
  if (event.origin!==location.origin || !frame || event.source!==frame.contentWindow) return;
  if (event.data?.type==='portfolio-world-close') { if(entered) history.back(); else close(); }
  if (event.data?.type==='portfolio-world-error') { close(); }
  if (event.data?.type!=='portfolio-world-ready') return;
  clearTimeout(timeout);
  frame.removeAttribute('inert'); frame.removeAttribute('aria-hidden');
  document.documentElement.classList.add('tour-entered');
  loading?.remove(); loading=null;
  history.pushState({portfolioTour:true}, '', '/virtual-tour/'); entered=true;
  setTimeout(()=>{frame?.focus();frame?.contentWindow.focus();},reduced.matches?0:1600);
 });
 document.addEventListener('click', event => {
  const link=event.target.closest('a[href]');
  if(!link || event.defaultPrevented || event.button!==0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || link.hasAttribute('download') || (link.target && link.target!=='_self')) return;
  const url=new URL(link.href, location.href);
  if(url.origin!==location.origin || !['/virtual-tour/','/virtual-tour/index.html'].includes(url.pathname)) return;
  event.preventDefault(); if(frame) return;
  previousOverflow=document.body.style.overflow; document.body.style.overflow='hidden';
  document.documentElement.classList.add('tour-loading');
  loading=document.createElement('div'); loading.className='tour-status';
  loading.innerHTML='<span role="status">Loading your world?</span><button type="button">Cancel</button><a href="/virtual-tour/" target="_blank">Open directly</a>';
  loading.querySelector('button').addEventListener('click',close);
  document.body.append(loading);
  frame=document.createElement('iframe'); frame.className='tour-world-frame';frame.title='Interactive 3D virtual tour';
  frame.setAttribute('aria-hidden','true');frame.setAttribute('inert','');frame.allow='fullscreen; autoplay; gamepad';
  frame.src='/virtual-tour/?embedded=1';document.body.append(frame);
  timeout=setTimeout(()=>{ if(loading) loading.querySelector('[role="status"]').textContent='Still loading the world? You can wait or open it directly.'; },30000);
 });
 window.addEventListener('keydown',event=>{if(event.key==='Escape' && frame && !entered)close();});
})();
