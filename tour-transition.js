// Display the world's real loading progress above the portfolio grid.
(() => {
 // Only the world frame relays events. A portfolio inside a preview iframe
 // still needs its own click handler and loading screen.
 const isWorldFrame = window.parent !== window && new URLSearchParams(location.search).get('embedded') === '1' && /^\/virtual-tour\/(?:index\.html)?$/.test(location.pathname);
 if (isWorldFrame) {
  window.addEventListener('portfolio-world-ring-color', event => parent.postMessage({type:'portfolio-world-ring-color', color:event.detail.color}, location.origin));
  window.addEventListener('portfolio-world-progress', event => parent.postMessage({type:'portfolio-world-progress', progress:event.detail.progress}, location.origin));
  window.addEventListener('portfolio-world-ready', () => parent.postMessage({type:'portfolio-world-ready'}, location.origin));
  window.addEventListener('portfolio-world-error', () => parent.postMessage({type:'portfolio-world-error'}, location.origin));
  document.addEventListener('click', event => {
   if (event.target.closest('.portfolio-return')) { event.preventDefault(); parent.postMessage({type:'portfolio-world-close'}, location.origin); }
  });
  return;
 }
 const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
 let frame, loading, previousOverflow, timeout, revealTimer, focusTimer, entered=false, ready=false, percent=0;
 const close = () => {
  clearTimeout(timeout); clearTimeout(revealTimer); clearTimeout(focusTimer);
  frame?.remove(); loading?.remove(); frame=null; loading=null;
  document.documentElement.classList.remove('tour-loading','tour-entered');
  if (previousOverflow !== undefined) document.body.style.overflow=previousOverflow;
  entered=false; ready=false; percent=0;
 };
 function updateProgress(value) {
  if (!loading || !Number.isFinite(value)) return;
  percent=Math.max(percent,Math.min(100,Math.max(0,Math.floor(value))));
  loading.querySelector('.tour-progress').setAttribute('aria-valuenow',String(percent));
  loading.querySelector('.tour-percent').textContent=percent+'%';
  loading.querySelector('.tour-ring-progress').style.strokeDashoffset=String(100-percent);
 }
 window.addEventListener('popstate', close);
 window.addEventListener('message', event => {
  if (event.origin!==location.origin || !frame || event.source!==frame.contentWindow) return;
  if (event.data?.type==='portfolio-world-ring-color') {
   if (loading && typeof event.data.color==='string' && /^rgb\([\d.,%\s]+\)$/.test(event.data.color)) loading.style.setProperty('--tour-ring-color', event.data.color);
   return;
  }
  if (event.data?.type==='portfolio-world-close') { if(entered) history.back(); else close(); return; }
  if (event.data?.type==='portfolio-world-error') { close(); return; }
  if (event.data?.type==='portfolio-world-progress') {
   updateProgress(Math.min(99, Number(event.data.progress)*100)); return;
  }
  if (event.data?.type!=='portfolio-world-ready' || ready) return;
  ready=true; clearTimeout(timeout); updateProgress(100);
  loading.querySelector('.tour-loading-label').textContent='Your world is ready';
  // Hold the completed ring briefly, then dissolve it into the car's reveal.
  revealTimer=setTimeout(() => {
   frame.removeAttribute('inert'); frame.removeAttribute('aria-hidden');
   document.documentElement.classList.add('tour-entered');
   history.pushState({portfolioTour:true}, '', '/virtual-tour/'); entered=true;
   focusTimer=setTimeout(()=>{loading?.remove();loading=null;frame?.focus();frame?.contentWindow.focus();},reduced.matches?0:1600);
  },reduced.matches?0:450);
 });
 document.addEventListener('click', event => {
  const link=event.target.closest('a[href]');
  if(!link || event.defaultPrevented || event.button!==0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || link.hasAttribute('download') || (link.target && link.target!=='_self')) return;
  const url=new URL(link.href, location.href);
  if(url.origin!==location.origin || !['/virtual-tour/','/virtual-tour/index.html'].includes(url.pathname)) return;
  event.preventDefault(); if(frame) return;
  percent=0;ready=false;
  previousOverflow=document.body.style.overflow; document.body.style.overflow='hidden';
  document.documentElement.classList.add('tour-loading');
  loading=document.createElement('div'); loading.className='tour-status';
  loading.innerHTML='<div class="tour-progress" role="progressbar" aria-label="Loading virtual world" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><svg class="tour-ring" viewBox="0 0 200 200" aria-hidden="true"><circle class="tour-ring-track" cx="100" cy="100" r="86"/><circle class="tour-ring-progress" cx="100" cy="100" r="86" pathLength="100"/></svg><span class="tour-percent">0%</span></div><p class="tour-loading-label" role="status">Loading your world</p><div class="tour-loading-actions"><button type="button">Cancel</button><a href="/virtual-tour/" target="_blank" rel="noopener">Open directly</a></div>';
  loading.querySelector('button').addEventListener('click',close);
  document.body.append(loading);
  frame=document.createElement('iframe'); frame.className='tour-world-frame';frame.title='Interactive 3D virtual tour';
  frame.setAttribute('aria-hidden','true');frame.setAttribute('inert','');frame.allow='fullscreen; autoplay; gamepad';
  frame.src='/virtual-tour/?embedded=1';document.body.append(frame);
  timeout=setTimeout(()=>{ if(loading) loading.querySelector('.tour-loading-label').textContent='Still loading your world. You can wait or open it directly.'; },30000);
 });
 window.addEventListener('keydown',event=>{if(event.key==='Escape' && frame && !entered)close();});
})();
