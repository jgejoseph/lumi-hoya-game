(function(root){
'use strict';
const STORAGE_KEY='lumi-hoya-polaroid-v1';
const BACKGROUNDS=Array.from({length:10},(_,i)=>`BG_${String(i+1).padStart(2,'0')}_${['Sunny_Window','Mountain_View','Rainy_Window','Moon_Night','Sunset_Room','Entryway','Reading_Corner','Cat_Playroom','Cozy_Sleep_Corner','Archway_Hall'][i]}.png`);
const SUBJECTS={lumi:Array.from({length:17},(_,i)=>`Lumi_${String(i+1).padStart(2,'0')}.png`),hoya:Array.from({length:19},(_,i)=>`Hoya_${String(i+1).padStart(2,'0')}.png`)};
const FOREGROUNDS=['foreground_bear.png','foreground_dog_blackeye.png','foreground_mouse_gray.png','foreground_mouse_white.png','foreground_wolf.png'];
const POSE_PROFILES={sleeping:new Set(['Lumi_08.png','Hoya_08.png']),bread_loaf:new Set(['Lumi_07.png']),tall_hat:new Set(['Lumi_11.png','Lumi_12.png','Lumi_14.png','Lumi_15.png','Lumi_16.png','Lumi_17.png','Hoya_11.png','Hoya_12.png','Hoya_13.png','Hoya_14.png','Hoya_15.png','Hoya_16.png','Hoya_17.png','Hoya_18.png','Hoya_19.png'])};
const pad=n=>String(n).padStart(2,'0');
function localDateKey(date=new Date()){return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;}
function displayDate(key){return key.replaceAll('-','.');}
function cleanState(value){const state=value&&typeof value==='object'?value:{};return {lastPhotoDate:typeof state.lastPhotoDate==='string'?state.lastPhotoDate:'',lastPhotoCat:['lumi','hoya'].includes(state.lastPhotoCat)?state.lastPhotoCat:'',photos:Array.isArray(state.photos)?state.photos.filter(p=>p&&typeof p.date==='string'&&['lumi','hoya'].includes(p.cat)):[]};}
function readState(storage){try{return cleanState(JSON.parse(storage.getItem(STORAGE_KEY)||'{}'));}catch{return cleanState({});}}
function writeState(storage,state){try{storage.setItem(STORAGE_KEY,JSON.stringify(cleanState(state)));return true;}catch{return false;}}
function pick(pool,random,avoid){const choices=pool.filter(item=>item!==avoid),list=choices.length?choices:pool;return list[Math.floor(random()*list.length)];}
function poseProfile(id){if(POSE_PROFILES.sleeping.has(id))return 'sleeping';if(POSE_PROFILES.bread_loaf.has(id))return 'bread_loaf';if(POSE_PROFILES.tall_hat.has(id))return 'tall_hat';return 'standard';}
function backgroundPool(context={}){if(context.storm)return [BACKGROUNDS[2]];if(context.night)return [BACKGROUNDS[3],BACKGROUNDS[8]];if(context.hour>=16&&context.hour<19)return [BACKGROUNDS[4],BACKGROUNDS[0],BACKGROUNDS[1]];return BACKGROUNDS.filter((_,i)=>i!==2&&i!==3);}
function groupPhotosByMonth(photos,todayKey=localDateKey()){
 const dates=new Map();for(const photo of photos){if(!photo?.date||!['lumi','hoya'].includes(photo.cat))continue;if(!dates.has(photo.date))dates.set(photo.date,{date:photo.date,isToday:photo.date===todayKey,lumi:null,hoya:null});const day=dates.get(photo.date);if(!day[photo.cat])day[photo.cat]=photo;}
 const months=new Map();for(const day of [...dates.values()].sort((a,b)=>b.date.localeCompare(a.date))){const monthKey=day.date.slice(0,7),[year,month]=monthKey.split('-');if(!months.has(monthKey))months.set(monthKey,{key:monthKey,label:`${Number(year)} 年 ${Number(month)} 月`,days:[]});months.get(monthKey).days.push(day);}
 return [...months.values()];
}
function composePhoto(state,{date=new Date(),random=Math.random,context={},cat:forcedCat=null}={}){
 const today=localDateKey(date),existing=forcedCat&&state.photos.find(photo=>photo.date===today&&photo.cat===forcedCat);if(existing)return existing;
 const previous=state.photos[0],cat=forcedCat||state.lastPhotoCat?forcedCat||(state.lastPhotoCat==='lumi'?'hoya':'lumi'):random()<.5?'lumi':'hoya';
 const subjectId=pick(SUBJECTS[cat],random,previous?.cat===cat?previous.subjectId:null),profile=poseProfile(subjectId),backgroundId=pick(backgroundPool(context),random,previous?.backgroundId);
 let foregroundId=null;if(random()<.2){const pool=profile==='sleeping'?FOREGROUNDS.filter(v=>v.includes('mouse')):FOREGROUNDS;foregroundId=pick(pool,random,previous?.foregroundId);}
 return {date:today,cat,backgroundId,subjectId,foregroundId,transforms:{subjectX:Math.round((random()-.5)*4),subjectScale:Number((.98+random()*.05).toFixed(3)),foregroundX:2}};
}
class DailyPhotos{
 constructor(storage,{random=Math.random,now=()=>new Date()}={}){this.storage=storage;this.random=random;this.now=now;this.state=readState(storage);this.pendingCat=null;}
 today(){const key=localDateKey(this.now());return this.state.photos.filter(photo=>photo.date===key);}
 remaining(){return Math.max(0,2-this.today().length);}
 nextCat(){const taken=new Set(this.today().map(photo=>photo.cat));if(taken.has('lumi'))return 'hoya';if(taken.has('hoya'))return 'lumi';return this.pendingCat||(this.pendingCat=this.state.lastPhotoCat?(this.state.lastPhotoCat==='lumi'?'hoya':'lumi'):(this.random()<.5?'lumi':'hoya'));}
 capture(context={}){if(!this.remaining())return {photo:this.today()[0],created:false};const photo=composePhoto(this.state,{date:this.now(),random:this.random,context,cat:this.nextCat()});this.pendingCat=null;this.state.photos=[photo,...this.state.photos.filter(p=>!(p.date===photo.date&&p.cat===photo.cat))];this.state.lastPhotoDate=photo.date;this.state.lastPhotoCat=photo.cat;writeState(this.storage,this.state);return {photo,created:true};}
}
function asset(kind,id,cat){return `assets/polaroid/${kind}${cat?'/'+cat:''}/${id}`;}
function paw(){const el=document.createElement('span');el.className='photo-paw';el.setAttribute('aria-hidden','true');for(let i=0;i<5;i++)el.append(document.createElement('i'));return el;}
function image(src,className,alt){const img=document.createElement('img');img.src=src;img.className=className;img.alt=alt;img.draggable=false;return img;}
function alphaFit(img,profile,transform={}){img.addEventListener('load',()=>{try{const sample=document.createElement('canvas'),size=420,scale=Math.min(1,size/Math.max(img.naturalWidth,img.naturalHeight));sample.width=Math.max(1,Math.round(img.naturalWidth*scale));sample.height=Math.max(1,Math.round(img.naturalHeight*scale));const ctx=sample.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0,sample.width,sample.height);const data=ctx.getImageData(0,0,sample.width,sample.height).data;let minX=sample.width,minY=sample.height,maxX=0,maxY=0;for(let y=0;y<sample.height;y+=2)for(let x=0;x<sample.width;x+=2)if(data[(y*sample.width+x)*4+3]>12){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}if(minX>maxX)return;const config={standard:[.82,.90,.01],sleeping:[.76,.85,.04],bread_loaf:[.80,.86,.03],tall_hat:[.80,.88,.02]}[profile]||[.82,.90,.01],bw=(maxX-minX+1)/sample.width,bh=(maxY-minY+1)/sample.height,fit=Math.min(config[0]/bw,config[1]/bh)*(transform.subjectScale||1),width=fit*100,left=50-((minX+maxX+1)/(2*sample.width))*width+(transform.subjectX||0),top=(1-config[2])*100-((maxY+1)/sample.height)*width*(img.naturalHeight/img.naturalWidth);Object.assign(img.style,{width:`${width}%`,left:`${left}%`,top:`${top}%`});}catch{img.classList.add('photo-subject--fallback');}},{once:true});}
function card(photo,{mini=false}={}){
 const article=document.createElement('article');article.className='daily-polaroid'+(mini?' daily-polaroid--mini':'');article.dataset.date=photo.date;article.setAttribute('aria-label',`${photo.cat==='lumi'?'Lumi':'Hoya'} 的每日寫真，${displayDate(photo.date)}`);
 const viewport=document.createElement('div');viewport.className='daily-polaroid__viewport';
 viewport.append(image(asset('background',photo.backgroundId),'photo-background','拍立得背景'));
 const subject=image(asset('main',photo.subjectId,photo.cat),'photo-subject',`${photo.cat==='lumi'?'Lumi':'Hoya'} 今日主角`);viewport.append(subject);alphaFit(subject,poseProfile(photo.subjectId),photo.transforms);
 if(photo.foregroundId){const slot=document.createElement('div');slot.className='photo-foreground';slot.style.left=`${photo.transforms?.foregroundX??2}%`;slot.append(image(asset('foreground',photo.foregroundId),'','前景小客人'));viewport.append(slot);}
 const mask=document.createElement('span');mask.className='daily-polaroid__mask';mask.setAttribute('aria-hidden','true');viewport.append(mask);
 const title=document.createElement('div');title.className='daily-polaroid__title';title.append(paw(),document.createTextNode('Lumi & Hoya 小日子'));
 const time=document.createElement('time');time.className='daily-polaroid__date';time.dateTime=photo.date;time.textContent=displayDate(photo.date);
 article.append(viewport,title,time);return article;
}
function emptyCard(cat){const empty=document.createElement('div');empty.className='photo-empty';empty.setAttribute('aria-label',`${cat==='lumi'?'Lumi':'Hoya'} 這天沒有拍照`);const name=document.createElement('strong');name.textContent=cat==='lumi'?'Lumi':'Hoya';const copy=document.createElement('span');copy.textContent='這天沒有拍照';empty.append(name,copy);return empty;}
function init({storage=root.localStorage,getContext=()=>({})}={}){
 const button=document.getElementById('photo-open'),quota=document.getElementById('photo-quota'),modal=document.getElementById('photo-modal');if(!button||!quota||!modal)return null;
 const manager=new DailyPhotos(storage),body=modal.querySelector('.photo-modal__body'),heading=modal.querySelector('h2'),copy=modal.querySelector('.photo-modal__copy'),shutter=modal.querySelector('#photo-shutter'),albumButton=modal.querySelector('#photo-album'),close=modal.querySelector('#photo-close'),flash=document.getElementById('photo-flash');
 const testMode=new URLSearchParams(root.location?.search||'').get('photoTest')==='1';let testCat=manager.nextCat(),testPrevious=null;
 const catName=id=>id==='lumi'?'Lumi':'Hoya';
 function refresh(){if(testMode){quota.textContent='測試模式：不限次數';button.classList.remove('is-complete');button.setAttribute('aria-label','拍立得測試模式，不限拍攝次數');return;}const left=manager.remaining();quota.textContent=`今日剩餘：${left} 次`;button.classList.toggle('is-complete',left===0);button.setAttribute('aria-label',left?`今日剩餘 ${left} 次拍攝`:'今日兩張皆已拍攝，點擊查看今天的照片');}
 function showPhoto(photo,created=false){body.replaceChildren(card(photo));heading.textContent=`${catName(photo.cat)} 的今日寫真`;if(testMode){copy.textContent=`測試照片完成 ♡　下一張拍 ${catName(testCat)}`;shutter.hidden=false;shutter.textContent=`再拍 ${catName(testCat)}`;}else{const left=manager.remaining();copy.textContent=created?(left?`拍得很好看 ♡　接著拍 ${catName(manager.nextCat())}`:'Lumi 和 Hoya 今天都拍得很好看 ♡'):'今天拍的這張，還是很好看 ♡';shutter.hidden=left===0;shutter.textContent=left?`拍攝 ${catName(manager.nextCat())}`:'拍下今日寫真';}albumButton.hidden=false;}
 function open(){modal.hidden=false;if(!testMode&&!manager.remaining()){album(true);return;}body.replaceChildren();const cat=testMode?testCat:manager.nextCat();heading.textContent=`今天輪到 ${catName(cat)}`;copy.textContent=testMode?'測試模式可無限拍攝，不會寫入每日正式紀錄。':`今天還能拍 ${manager.remaining()} 張，Lumi、Hoya 各一張。`;shutter.textContent=`拍攝 ${catName(cat)}`;shutter.hidden=false;albumButton.hidden=manager.state.photos.length===0;}
 function capture(){let result;if(testMode){const context={...getContext(),hour:new Date().getHours()},state={lastPhotoDate:'',lastPhotoCat:testPrevious?.cat||'',photos:testPrevious?[{...testPrevious,date:'test-previous'}]:[]},photo=composePhoto(state,{date:new Date(),random:manager.random,context,cat:testCat});testPrevious=photo;testCat=testCat==='lumi'?'hoya':'lumi';result={photo,created:true};}else result=manager.capture({...getContext(),hour:new Date().getHours()});if(result.created){flash.classList.remove('take');void flash.offsetWidth;flash.classList.add('take');}showPhoto(result.photo,result.created);refresh();}
 function album(todayOnly=false){
  heading.textContent=todayOnly?'今天的 Lumi & Hoya':'寫真相簿';copy.textContent=todayOnly?'今天留下的寫真':'從最近的日子慢慢往回看';shutter.hidden=true;albumButton.hidden=true;
  const photos=todayOnly?manager.today():manager.state.photos,months=groupPhotosByMonth(photos,localDateKey(manager.now())),book=document.createElement('div');book.className='photo-album';
  const pending=new WeakMap(),observer=typeof root.IntersectionObserver==='function'?new root.IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){pending.get(entry.target)?.();observer.unobserve(entry.target);}},{rootMargin:'180px'}):null;
  const photoSlot=(photo,cat)=>{if(!photo)return emptyCard(cat);const item=document.createElement('button');item.type='button';item.className='photo-album__photo';item.setAttribute('aria-label',`${catName(cat)} ${displayDate(photo.date)} 寫真`);item.onclick=()=>showPhoto(photo);const hydrate=()=>{if(!item.firstChild)item.append(card(photo,{mini:true}));};if(observer){pending.set(item,hydrate);observer.observe(item);}else hydrate();return item;};
  for(const month of months){const section=document.createElement('section');section.className='photo-month';const monthTitle=document.createElement('h3');monthTitle.textContent=month.label;section.append(monthTitle);for(const day of month.days){const daySection=document.createElement('section');daySection.className='photo-day';const dayTitle=document.createElement('h4');const date=document.createElement('time');date.dateTime=day.date;date.textContent=displayDate(day.date);dayTitle.append(date);if(day.isToday){const today=document.createElement('small');today.textContent='今日';dayTitle.append(today);}const row=document.createElement('div');row.className='photo-day__row';row.append(photoSlot(day.lumi,'lumi'),photoSlot(day.hoya,'hoya'));daySection.append(dayTitle,row);section.append(daySection);}book.append(section);}body.replaceChildren(book);
 }
 button.addEventListener('click',open);shutter.addEventListener('click',capture);albumButton.addEventListener('click',()=>album(false));close.addEventListener('click',()=>modal.hidden=true);modal.addEventListener('click',event=>{if(event.target===modal)modal.hidden=true;});document.addEventListener('keydown',event=>{if(event.key==='Escape')modal.hidden=true;});refresh();setInterval(refresh,60000);return {manager,open,capture,refresh,card};
}
const api={STORAGE_KEY,BACKGROUNDS,SUBJECTS,FOREGROUNDS,localDateKey,displayDate,cleanState,groupPhotosByMonth,composePhoto,DailyPhotos,card,init};root.LumiPolaroid=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
