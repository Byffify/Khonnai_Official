'use strict';
// First-use guide: a welcome modal once, then three coach marks on the home add-stock bar and the tab bar. ตั้งค่า → โหมดสอนใช้งาน replays it.

const TOUR_STEPS=[
 {target:'[data-action="add-stock"]',title:'เริ่มที่เพิ่มสต็อก',body:'ของเข้าร้าน กดปุ่มนี้ แล้วเลือกว่าเป็นรุ่นเดิมหรือรุ่นใหม่'},
 {target:'[data-tab="catalog"]',title:'ขายของกดปุ่มนี้',body:'เลือกสินค้าลงตะกร้าแล้วออกบิลเงินสด สต็อกจะตัดให้เอง'},
 {target:'[data-tab="stock"]',title:'ดูของในร้านที่สต็อก',body:'ดูว่าแต่ละรุ่นเหลือเท่าไร แตะสินค้าเพื่อแก้จำนวนหรือแก้ไซซ์ ดูวิธีใช้ซ้ำได้ที่หน้าตั้งค่า'},
];
let tourStep=-1;

function tourWelcome(){state.settings.tourDone=true;persist();openSheet('ยินดีต้อนรับสู่ khonnai',`<span class="alert-icon blue">${icon('book')}</span><p>ดูวิธีใช้ปุ่มหลัก 3 ปุ่มก่อนเริ่มไหม ดูซ้ำได้ทุกเมื่อที่หน้าตั้งค่า</p><button class="primary" data-action="tour-start">ดูวิธีใช้</button><button class="cancel-button" data-action="close">ข้ามไปก่อน</button>`,'alert');}
function tourTarget(){return document.querySelector(TOUR_STEPS[tourStep].target);}
// The sell circle sticks out above the capsule, so its hole covers the circle and its word together.
function tourRect(target){const r=target.getBoundingClientRect(),wrap=target.closest('.sell-wrap');if(!wrap)return r;const w=wrap.getBoundingClientRect();return{top:Math.min(r.top,w.top),bottom:Math.max(r.bottom,w.bottom),left:Math.min(r.left,w.left),right:Math.max(r.right,w.right),get width(){return this.right-this.left;},get height(){return this.bottom-this.top;}};}
function tourEnd(){tourStep=-1;document.querySelector('#coach')?.remove();}
function tourPlace(){const coach=document.querySelector('#coach');const target=coach&&tourTarget();if(!target)return;const r=tourRect(target),pad=5,inBar=Boolean(target.closest('#tabbar'));const hole=coach.querySelector('.coach-hole');hole.style.cssText=`top:${r.top-pad}px;left:${r.left-pad}px;width:${r.width+pad*2}px;height:${r.height+pad*2}px;border-radius:${inBar?30:18}px`;const card=coach.querySelector('.coach-card'),h=card.offsetHeight,below=!inBar&&r.bottom+pad+14+h<=innerHeight-12;card.style.top=`${below?r.bottom+pad+14:Math.max(12,r.top-pad-14-h)}px`;card.classList.toggle('above',!below);const c=card.getBoundingClientRect();card.style.setProperty('--pointer',`${Math.min(Math.max(r.left+r.width/2-c.left,24),c.width-24)}px`);}
// The bar must stay full while the tour points at it, even if the page scrolls under the dim layer.
function tourSync(){if(tourStep<0)return;setCompact(false);tourPlace();}
function tourRender(){const s=TOUR_STEPS[tourStep],n=tourStep+1,last=n===TOUR_STEPS.length;document.querySelector('#coach')?.remove();const coach=document.createElement('div');coach.id='coach';coach.innerHTML=`<div class="coach-hole"></div><section class="coach-card" role="dialog" aria-modal="true" aria-labelledby="coach-title"><h2 id="coach-title">${s.title}</h2><p>${s.body}</p><div class="coach-progress"><span>${n} จาก ${TOUR_STEPS.length}</span>${last?'':'<button type="button" class="link" data-action="tour-end">ข้าม</button>'}</div><div class="coach-actions">${n>1?'<button type="button" class="secondary" data-action="tour-back">ย้อนกลับ</button>':''}<button type="button" class="primary" data-action="tour-next">${last?'เริ่มใช้งาน':'ถัดไป'}</button></div></section>`;document.body.append(coach);tourSync();coach.querySelector('[data-action="tour-next"]').focus();}
function tourStart(){if(dialog.open)dialog.close();if(page!=='home'){navDir='fade';navigate('home');}let tries=0;const wait=()=>{tourStep=0;if(tourTarget()&&!transitioning){window.scrollTo(0,0);tourRender();return;}tourStep=-1;if(++tries<60)requestAnimationFrame(wait);};wait();}

Object.assign(window.extraActions,{
 'tour-start':tourStart,
 'tour-end':tourEnd,
 'tour-back':()=>{tourStep=Math.max(0,tourStep-1);tourRender();},
 'tour-next':()=>{if(tourStep>=TOUR_STEPS.length-1){tourEnd();return;}tourStep++;tourRender();},
});
window.addEventListener('resize',tourPlace);
window.addEventListener('scroll',()=>{if(tourStep>=0)requestAnimationFrame(tourSync);},{passive:true});
document.addEventListener('keydown',event=>{if(tourStep<0)return;if(event.key==='Escape'){tourEnd();return;}if(event.key!=='Tab')return;const items=[...document.querySelectorAll('#coach button')],at=items.indexOf(document.activeElement);event.preventDefault();items[(at+(event.shiftKey?-1:1)+items.length)%items.length].focus();});
window.addEventListener('DOMContentLoaded',()=>{if(!state.settings.tourDone&&page==='home')tourWelcome();});
