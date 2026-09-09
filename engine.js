/* Pure simulation. Coordinates are in the 240 × 320 room, independent of display size. */
(function(root){
'use strict';
const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,n));
const defs={lumi:{name:'Lumi',speed:17,pat:1.5,rest:6,temper:17},hoya:{name:'Hoya',speed:28,pat:1,rest:3,temper:25}};
const stats=['hunger','mood','energy','sleepiness','bond','anger'];
const platforms=[{level:1,x:36,y:258,z:32},{level:2,x:57,y:258,z:80}];
function freshCat(id){return {id,level:0,z:0,lift:0,jump:null,desiredLevel:0,resume:null,pendingCall:false,x:id==='lumi'?82:164,y:id==='lumi'?235:261,tx:120,ty:260,facing:id==='lumi'?1:-1,state:'idle',timer:2,age:0,hunger:78,mood:85,energy:80,sleepiness:15,bond:20,anger:0,interrupts:0,sleeping:false,goal:null,petGlow:0,petTotal:0,rewardAt:0};}
class World{
 litterCleanAt=-Infinity;
 constructor(saved,random=Math.random){this.random=random;this.cats=[freshCat('lumi'),freshCat('hoya')];this.selected='lumi';this.coins=150;this.night=false;this.outdoorNight=false;this.manualNight=null;this.close=null;this.events=[];this.foods=[];this.foodSerial=0;this.toy=null;this.time=0;this.cleanliness=100;this.poops=0;this.nextPlane=45+random()*45;this.nextWolf=80+random()*65;if(saved&&saved.version===1){this.coins=Number.isFinite(saved.coins)?clamp(saved.coins,0,99999):150;this.selected=defs[saved.selected]?saved.selected:'lumi';if(typeof saved.manualNight==='boolean')this.manualNight=saved.manualNight;if(Number.isFinite(saved.lightsOffAt)&&saved.lightsOffAt<=Date.now())this.lightsOffAt=saved.lightsOffAt;for(const c of this.cats){const old=saved.cats?.[c.id];if(!old)continue;if(typeof old.companionDay==='string')c.companionDay=old.companionDay;if(['warmup','tired'].includes(old.playPhase))c.playPhase=old.playPhase;if(Number.isFinite(old.playRestUntil))c.playRestUntil=Math.min(old.playRestUntil,Date.now()+45000);if(Number.isFinite(old.petBlockedUntil))c.petBlockedUntil=Math.min(old.petBlockedUntil,Date.now()+60000);for(const k of stats)if(Number.isFinite(old[k]))c[k]=clamp(old[k]);if(old.sleeping){c.sleeping=true;c.state='sleep';c.x=c.id==='lumi'?112:192;c.y=217;}c.interrupts=Number.isFinite(old.interrupts)?clamp(old.interrupts,0,10):0;}if(Array.isArray(saved.foods))this.foods=saved.foods.filter(b=>b&&Number.isFinite(b.x)&&Number.isFinite(b.y)&&Number.isFinite(b.left)&&b.x>=34&&b.x<=206&&b.y>=213&&b.y<=299&&b.left>0).slice(0,2).map(b=>({id:++this.foodSerial,x:b.x,y:b.y,left:Math.min(30,b.left)}));this.cleanliness=Number.isFinite(saved.cleanliness)?clamp(saved.cleanliness):100;this.poops=Number.isFinite(saved.poops)?clamp(Math.floor(saved.poops),0,8):0;for(const c of this.cats){c.digestion=Number.isFinite(saved.cats?.[c.id]?.digestion)?clamp(saved.cats[c.id].digestion,0,30):0;c.needsToilet=!!saved.cats?.[c.id]?.needsToilet;}this.nightRewardDay=typeof saved.nightRewardDay==='string'?saved.nightRewardDay:'';this.applyOffline(saved.savedAt);}}
 get current(){return this.cats.find(c=>c.id===this.selected);}
 get food(){return this.foods[0]||null;}
 get interacting(){return !!this.wolf||!!this.close||this.cats.some(c=>c.pendingCall||c.goal==='close'||['turn-look','come-to-player'].includes(c.state)||c.resume?.goal==='close');}
 assignMeals(){
 const cats=this.cats.filter(c=>!c.sleeping&&c.anger<=30&&c.hunger<99&&!c.jump&&!['angry','bite-warning'].includes(c.state));
 for(const c of this.cats)if(!cats.includes(c))c.foodId=null;
 if(this.interacting)return;
 const used=new Set();for(const c of cats){let bowl=this.foods.find(b=>b.id===c.foodId&&!used.has(b.id));if(!bowl)bowl=[...this.foods].filter(b=>!used.has(b.id)).sort((a,b)=>Math.hypot(c.x-a.x,c.y-a.y)-Math.hypot(c.x-b.x,c.y-b.y))[0]||this.food;c.foodId=bowl?.id; if(bowl)used.add(bowl.id);}
 }
 feed(c,dt){const bowl=this.foods.find(b=>b.id===c.foodId);if(!bowl||this.interacting||this.night)return false;
 const shared=this.cats.filter(v=>v.foodId===bowl.id),seat=shared.length>1?(shared.indexOf(c)?10:-10):0,x=bowl.x+seat,y=bowl.y;
 if(c.level){this.target(c,x,y,'food');return true;}
 if(Math.hypot(c.x-x,c.y-y)>2){if(c.goal!=='food'||c.tx!==x||c.ty!==y)this.target(c,x,y,'food');this.move(c,dt,defs[c.id].speed*1.2);return true;}
 if(c.state!=='eat')this.set(c,'eat');const bite=Math.min(bowl.left,dt*2);bowl.left-=bite;c.digestion=(c.digestion||0)+bite;if(c.digestion>=12){c.needsToilet=true;c.digestion=0;}c.hunger=clamp(c.hunger+bite);c.mood=clamp(c.mood+dt*.3);if(Math.floor(c.age*3)!==Math.floor((c.age-dt)*3))this.emit('eat',null,c);
 if(bowl.left<=0){this.foods=this.foods.filter(b=>b!==bowl);c.foodId=null;this.set(c,'sit',3);this.emit('note',`${defs[c.id].name} 舔舔嘴巴，吃完了。`,c);}return true;}
 toggleNight(now=Date.now()){
 if(this.interacting)return;const date=new Date(now),hour=date.getHours();if(!this.night&&hour>=6&&hour<20){this.emit('note','晚安燈在晚上 20:00 後開放。');return;}if(!this.night){const evening=new Date(now);if(hour<6)evening.setDate(evening.getDate()-1);const day=evening.toLocaleDateString('en-CA');if(this.nightRewardDay!==day){this.nightRewardDay=day;for(const c of this.cats)for(const k of ['hunger','mood','energy','bond'])c[k]=clamp(c[k]+5);this.emit('note','晚安獎勵 ♥ 飽足、心情、精力、親密各 +5。');}this.lightsOffAt=now;this.manualNight=true;this.night=true;this.toy=null;}
 else{this.manualNight=false;this.night=false;if(this.lightsOffAt&&now-this.lightsOffAt<600000){for(const c of this.cats){c.mood=clamp(c.mood-8);c.anger=clamp(c.anger+15);this.emit('angry',null,c);}this.emit('note','才剛關燈又亮了…牠們不高興，心情 −8。');}else this.emit('note','早安，讓牠們慢慢醒來。');this.lightsOffAt=0;}}
 touchCat(id){const c=this.cats.find(c=>c.id===id);if(c?.state==='watch-bird'&&this.bird?.phase==='perch'){c.goal=null;this.set(c,'startled',.7);this.bird.phase='startled';this.bird.age=0;this.bird.fright=true;this.emit('jump',`${defs[id].name} 嚇了一跳，小鳥也趕快飛走了！`,c);this.emit('chirp');return;}this.call(id);}
 applyOffline(since,now=Date.now()){
 if(!Number.isFinite(since)||!Number.isFinite(now)||now<=since)return;
 const hours=Math.min(24,(now-Math.max(since,this.offlineAppliedAt||since))/3600000);if(hours<=0)return;this.offlineAppliedAt=now;
 this.cleanliness=clamp(this.cleanliness-hours*3);for(const c of this.cats){c.hunger=Math.min(c.hunger,Math.max(10,c.hunger-hours*4));c.mood=Math.min(c.mood,Math.max(20,c.mood-hours*2));c.energy=Math.min(c.energy,Math.max(20,c.energy-hours*1.5));c.sleepiness=clamp(c.sleepiness+hours*2);c.bond=clamp(c.bond-hours*.1);c.anger=clamp(c.anger-hours*30);}
 if(hours>=.25)this.emit('note','你回來了。牠們有點餓，也想你陪一會。');
 }
 companionReward(c){const today=new Date().toLocaleDateString('en-CA');if(c.companionDay===today)return;c.companionDay=today;this.coins+=5;c.bond=clamp(c.bond+1);this.emit('coin',`今天第一次好好陪 ${defs[c.id].name}：＋5 金幣 ♡`,c);}
 finishPet(c){c.petBlockedUntil=Date.now()+30000;this.set(c,'pet-satisfied',1);this.companionReward(c);this.emit('purr',`${defs[c.id].name} 已經很滿足了，蹭蹭你，自己去休息。`,c);}
 playEnergy(c,dt){
 if(c.playRestUntil>Date.now())return false;
 if(!c.playPhase)c.playPhase=c.energy>=99?'tired':'warmup';
 if(c.playPhase==='warmup'){c.energy=clamp(c.energy+dt*3);if(c.energy>=100){c.playPhase='tired';this.emit('note',`${defs[c.id].name} 玩開了！接下來會慢慢消耗精力。`,c);}}
 else c.energy=clamp(c.energy-dt*2.2);
 c.playSeconds=(c.playSeconds||0)+dt;if(c.playSeconds>=8)this.companionReward(c);
 if(c.playPhase==='tired'&&c.energy<50){c.playRestUntil=Date.now()+45000;c.playPhase=null;c.playSeconds=0;this.target(c,c.id==='lumi'?104:202,242,'rest-play');this.emit('note',`${defs[c.id].name} 不想玩了～自己走開休息。`,c);return false;}return true;
 }
 updateVisitors(dt){
 if(this.time>=(this.nextWolf??420)&&!this.wolf){this.nextWolf=this.time+95+this.random()*60;this.wolf={age:0,hits:0,flash:0};this.plane=null;this.bird=null;this.endSocial();this.close=null;this.toy=null;for(const c of this.cats){c.sleeping=false;c.pendingCall=false;c.resume=null;c.goal=null;this.set(c,'puffed',1.5);}this.emit('howl','窗外有狼！點牠 5 下，幫貓咪趕走牠。');}
 if(this.wolf){this.wolf.age+=dt;this.wolf.flash=Math.max(0,this.wolf.flash-dt);if(this.wolf.age>=60)this.dismissWolf();return;}
 if(!this.plane&&!this.bird&&this.time>=(this.nextPlane??300)){this.nextPlane=this.time+55+this.random()*40;this.plane={age:0,direction:this.random()<.5?1:-1,variant:Math.floor(this.random()*3)};this.bird=null;this.endSocial();this.emit('note','抬頭看，一架小飛機經過窗外。');}
 if(this.plane){this.plane.age+=dt;if(this.plane.age>=18)this.plane=null;}
 }
 hitWolf(x,y){if(!this.wolf||x<40||x>99||y<82||y>126)return false;this.wolf.hits++;this.wolf.flash=.18;this.emit('thump');if(this.wolf.hits>=5)this.dismissWolf();return true;}
 dismissWolf(){this.wolf=null;this.emit('note','狼離開了，安全了。牠們探探頭，慢慢走出來。');for(const c of this.cats){if(c.state==='hidden') {c.x=c.id==='lumi'?164:202;c.y=206;}c.goal=null;this.set(c,'sit',2);}}
 visitorCat(c,dt){
 if(this.wolf){if(c.state==='puffed'&&c.timer>0)return true;if(c.level){this.jumpTo(c,0);return true;}if(c.state==='hidden')return true;const x=c.id==='lumi'?164:202,y=199,dist=Math.hypot(x-c.x,y-c.y);if(dist<2){this.set(c,'hidden');return true;}this.setRunningVisitor(c,x,y,dt,defs[c.id].speed*3);return true;}
 if(c.state==='watch-plane'&&!this.plane){this.set(c,'sit',2);c.goal=null;}
 if(this.plane&&!c.sleeping&&!this.interacting&&!this.toy&&!this.food&&!c.level&&c.anger<30){const x=c.id==='lumi'?58:88,y=215;if(Math.hypot(c.x-x,c.y-y)>2)this.setRunningVisitor(c,x,y,dt,defs[c.id].speed*1.5);else this.set(c,'watch-plane');return true;}return false;
 }
 setRunningVisitor(c,x,y,dt,speed){if(c.state!=='walk')this.set(c,'walk');const distance=Math.hypot(x-c.x,y-c.y),step=Math.min(distance,speed*dt);c.facing=x<c.x?-1:1;c.x+=(x-c.x)/distance*step;c.y+=(y-c.y)/distance*step;}
 updateBird(dt){
 if(!this.bird){if(!this.outdoorNight&&!this.night&&this.time>=(this.nextBird??18)){this.bird={phase:'arrive',age:0,id:this.time,direction:this.random()<.5?1:-1,variant:Math.floor(this.random()*3)};}return;}
 const b=this.bird;b.age+=dt;
 if((this.outdoorNight||this.night)&&b.phase!=='leave'){b.phase='leave';b.age=0;}
 if(b.phase==='arrive'&&b.age>=1.8){b.phase='perch';b.age=0;this.emit('chirp','窗邊來了一位小客人。');}
 else if(b.phase==='perch'){if(Math.floor(b.age/4)!==Math.floor((b.age-dt)/4))this.emit('chirp');if(b.age>=16){b.phase='leave';b.age=0;}}
 else if(b.phase==='startled'&&b.age>=.3){b.phase='leave';b.age=0;}
 else if(b.phase==='leave'&&b.age>=(b.fright?.8:1.6)){this.bird=null;this.nextBird=this.time+20+this.random()*20;}
 }
 socialReady(){return !this.wolf&&!this.plane&&!this.bird&&!this.close&&!this.food&&!this.toy&&!this.night&&this.cats.every(c=>!c.sleeping&&!c.level&&!c.jump&&c.energy>35&&c.sleepiness<70&&c.mood>55&&c.anger<10&&['idle','sit','wander','walk'].includes(c.state)&&(!c.goal||c.goal==='wander'));}
 startSocial(){if(!this.socialReady())return false;const kind=this.random()<.55?'rub':'knead',kneader=this.random()<.75?'lumi':'hoya';this.social={kind,kneader,phase:'approach',age:0};this.cats.forEach((c,i)=>{this.target(c,124+i*34,268,'social');});return true;}
 endSocial(){if(!this.social)return;this.social=null;this.nextSocial=this.time+45+this.random()*45;for(const c of this.cats){c.goal=null;this.set(c,'sit',3);}}
 updateSocial(dt){
 if(!this.social){if(this.time>=(this.nextSocial??25)){if(!this.startSocial())this.nextSocial=this.time+3;}return;}
 const s=this.social;s.age+=dt;
 if(this.close||this.food||this.toy||this.night||this.cats.some(c=>c.energy<30||c.sleepiness>=70||c.mood<50||c.anger>=10)){this.endSocial();return;}
 if(s.phase==='approach'){
 for(const c of this.cats)if(Math.hypot(c.tx-c.x,c.ty-c.y)>1)this.move(c,dt,defs[c.id].speed);
 if(this.cats.every(c=>Math.hypot(c.tx-c.x,c.ty-c.y)<=1)){s.phase='active';s.age=0;this.cats.forEach((c,i)=>{c.facing=i===0?1:-1;this.set(c,s.kind==='rub'?'rub':c.id===s.kneader?'knead':'social-rest');});this.emit('purr',s.kind==='rub'?'碰個頭，再蹭一下。牠們也很喜歡彼此。':`${defs[s.kneader].name} 在同伴身旁踩踩軟墊，呼嚕嚕…`);}
 else if(s.age>12)this.endSocial();return;
 }
 for(const c of this.cats)c.mood=clamp(c.mood+dt*.35);
 if(Math.floor(s.age/2.5)!==Math.floor((s.age-dt)/2.5))this.emit('purr');
 if(s.age>8)this.endSocial();
 }
 emit(type,text,c){if(type==='meow'&&c)c.meowUntil=this.time+1.2;this.events.push({type,text,id:c?.id});}
 set(c,state,timer=0){c.state=state;c.timer=timer;c.age=0;}
 rejectPet(reason){const c=this.cats.find(c=>c.id===this.close);if(!c||c.state==='bite-warning')return;c.mood=clamp(c.mood-15);c.anger=clamp(Math.max(45,c.anger+30));c.petBlockedUntil=Date.now()+60000;c.petGlow=0;this.set(c,'bite-warning',.65);this.emit('angry',`${defs[c.id].name} ${reason}，張嘴警告！先讓牠休息一分鐘。`,c);}
 nap(c){c.sleeping=true;c.interrupts=0;c.napUntil=this.time+20+this.random()*20;c.goal=null;this.set(c,'sleep');}
 target(c,x,y,goal){if(c.level){c.resume={x,y,goal};this.jumpTo(c,0);return;}c.tx=clamp(x,24,216);c.ty=clamp(y,213,299);c.goal=goal;this.set(c,goal==='close'?'come-to-player':'walk');}
 platformAt(x,y){return [...platforms].reverse().find(p=>Math.abs(x-p.x)<=22&&y>=p.y-p.z-22&&y<=p.y-p.z+7);}
 toyAt(x,y){const p=this.platformAt(x,y);if(p)return {x:p.x,y:p.y,z:p.z,level:p.level,drawX:x,drawY:y};return x>=24&&x<=216&&y>=213&&y<=299?{x,y,level:0}:null;}
 available(level,c){return !this.cats.some(other=>other!==c&&(other.level===level||other.jump?.level===level));}
 climb(c,level){c.desiredLevel=level;this.target(c,platforms[0].x,platforms[0].y,'climb');}
 jumpTo(c,level){if(level&&!this.available(level,c))return false;const p=platforms.find(p=>p.level===level)||{x:82,y:281,z:0};c.jump={level,x:c.x,y:c.y,z:c.z||0,to:p,duration:c.id==='hoya'?.62:.82};c.goal=null;this.set(c,'jump');this.emit('jump',null,c);return true;}
 updateJump(c,dt){const j=c.jump,p=clamp(c.age/j.duration,0,1);c.x=j.x+(j.to.x-j.x)*p;c.y=j.y+(j.to.y-j.y)*p;c.z=j.z+(j.to.z-j.z)*p;c.lift=Math.sin(Math.PI*p)*24;c.facing=j.to.x>=j.x?1:-1;if(p===1){c.level=j.level;c.z=j.to.z;c.lift=0;c.jump=null;c.energy=clamp(c.energy-1.2);this.set(c,'land',.25);this.emit('land',null,c);}}
 call(id=this.selected){const c=this.cats.find(c=>c.id===id);if(!c||this.close||this.wolf)return;if(c.petBlockedUntil>Date.now()){this.emit('note',`${defs[id].name} 還想自己待著，再等 ${Math.ceil((c.petBlockedUntil-Date.now())/1000)} 秒。`,c);return;}this.toy=null;this.endSocial();this.selected=id;if(c.jump||c.state==='land'||c.state==='startled'){c.pendingCall=true;return;}if(c.sleeping){c.interrupts++;if(c.interrupts===1){this.set(c,'sleep',1);this.emit('meow',`${defs[id].name} 耳朵動了動…讓牠再睡一下。`,c);}else if(c.interrupts===2){c.anger=clamp(c.anger+defs[id].temper);this.set(c,'annoyed',2);this.emit('angry',id==='lumi'?'Lumi 縮起身子：還想睡嘛…':'Hoya 甩了甩尾巴：別吵啦。',c);}else{c.anger=clamp(c.anger+defs[id].temper*2);c.mood=clamp(c.mood-12);c.bond=clamp(c.bond-2);c.sleeping=false;this.set(c,'angry',2);this.emit('angry',`${defs[id].name} 生氣了，先給牠一點空間。`,c);}return;}
 if(c.anger>30||['angry','annoyed'].includes(c.state)){this.emit('angry',`${defs[id].name} 現在想自己待一會。`,c);return;}
 if(this.cats.some(v=>v.state==='turn-look'||v.state==='come-to-player'))return;
 this.toy=null;for(const other of this.cats){if(other.goal==='food'||other.state==='eat'){other.goal=null;this.set(other,'sit',2);}}this.set(c,'turn-look',.8);this.emit('meow',`${defs[id].name} 注意到你了。`,c);}
 leave(){if(this.close){const c=this.cats.find(c=>c.id===this.close);this.set(c,'sit',3);this.close=null;}}
 dropFood(x,y){if(this.interacting||this.foods.length>=2||this.platformAt(x,y)||x<34||x>206||y<213||y>299)return false;if(this.foods.some(b=>Math.hypot(x-b.x,y-b.y)<28)){this.emit('note','另一盤放遠一點，讓牠們有空間吃。');return false;}if(this.coins<5){this.emit('note','金幣不足，陪伴可以獲得金幣。');return false;}this.coins-=5;this.foods.push({id:++this.foodSerial,x,y,left:30});this.emit('note','香香的晚餐，等醒著的貓自己過來。');return true;}
 pet(distance,speed){const c=this.cats.find(c=>c.id===this.close);if(!c||distance<1)return false;if(['bite-warning','pet-satisfied'].includes(c.state))return false;if(speed>430){this.rejectPet('覺得你摸得太快了');return false;}c.mood=clamp(c.mood+distance*.025*defs[c.id].pat);c.bond=clamp(c.bond+distance*.006*defs[c.id].pat);c.petGlow=1.2;c.petTotal+=distance;c.petSession=(c.petSession||0)+distance;this.set(c,'pet-happy',1.2);if((c.mood>=95&&c.petSession>=180)||c.petSession>=700){this.finishPet(c);return true;}if(c.petTotal>=24){c.petTotal=0;this.emit('purr','呼嚕嚕…就是這裡。',c);if(this.time-c.rewardAt>8){this.coins+=2;c.rewardAt=this.time;this.emit('coin',null,c);}return true;}return false;}
 update(dt,hour=new Date().getHours()){
 if(this.time-this.litterCleanAt>=60)this.cleanliness=clamp(this.cleanliness-dt*.008);this.time+=dt;this.outdoorNight=hour>=18||hour<6;this.night=this.manualNight===true;
 this.updateVisitors(dt);
 if(!this.wolf&&!this.plane)this.updateBird(dt);
 this.updateSocial(dt);
 this.assignMeals();
 for(const c of this.cats){const d=defs[c.id];c.age+=dt;c.timer-=dt;c.petGlow=Math.max(0,c.petGlow-dt);c.hunger=clamp(c.hunger-dt*.035);c.anger=clamp(c.anger-dt*.65);c.energy=clamp(c.energy+dt*(c.sleeping?1.6:-.025));c.sleepiness=clamp(c.sleepiness+dt*(c.sleeping?-1.1:.04));
 if(!c.sleeping&&!this.social&&!this.close&&c.anger<10&&this.time>=(c.nextMeow??(c.id==='lumi'?12:20))){c.nextMeow=this.time+35+this.random()*45;this.emit('meow',null,c);}if(this.social)continue;
 if(c.state==='startled'){c.lift=Math.sin(Math.min(1,c.age/.7)*Math.PI)*18;if(c.timer<=0){c.lift=0;this.set(c,'land',.25);this.emit('land',null,c);}continue;}
 if(c.jump){this.updateJump(c,dt);continue;}
 if(this.visitorCat(c,dt))continue;
 if(c.state==='land'){if(c.timer>0)continue;this.set(c,'sit',d.rest);if(c.pendingCall){c.pendingCall=false;c.resume=null;this.call(c.id);continue;}if(c.resume){const r=c.resume;c.resume=null;this.target(c,r.x,r.y,r.goal);continue;}}
 if(this.close===c.id){if(c.state==='pet-satisfied'&&c.timer<=0){this.close=null;this.target(c,c.id==='lumi'?104:202,245,'rest-play');continue;}if(c.state==='bite-warning'&&c.timer<=0){this.close=null;this.target(c,c.id==='lumi'?99:209,245,'retreat');continue;}if(c.state==='pet-happy'&&c.timer<=0)this.set(c,'sit');continue;}
 if(c.sleeping){if(c.state==='annoyed'&&c.timer<=0)this.set(c,'sleep');if(!this.night&&((c.napUntil&&this.time>=c.napUntil)||(c.energy>=98&&c.sleepiness<5))){c.sleeping=false;c.napUntil=0;c.interrupts=0;this.set(c,'sit',3);}continue;}
 if(c.state==='angry'){if(c.timer<=0)this.target(c,c.id==='lumi'?33:207,242,'retreat');continue;}
 if(c.state==='turn-look'){if(c.timer<=0)this.target(c,120,291,'close');continue;}
 if(c.state==='come-to-player'){this.move(c,dt,d.speed);continue;}
 if(c.goal==='rest-play'&&c.state==='walk'){this.move(c,dt,d.speed);continue;}
 if(c.goal==='retreat'&&c.state==='walk'){this.move(c,dt,d.speed*2.3);continue;}
 if(c.anger>30){if(c.state==='walk')this.move(c,dt,d.speed);else if(c.timer<=0)this.set(c,'annoyed',2);continue;}
 if(this.toy&&!this.food&&!this.night&&c.energy>16&&!(c.playRestUntil>Date.now())){if(!this.playEnergy(c,dt))continue;}
 if(this.toilet(c,dt))continue;if(!this.night&&this.feed(c,dt))continue;if(c.state==='eat'){this.set(c,'sit',2);c.goal=null;}
 if(c.level){
 if(this.night||c.energy<24||c.sleepiness>80){this.target(c,c.id==='lumi'?112:192,217,'bed');continue;}
 const desired=this.toy&&!(c.playRestUntil>Date.now())?this.toy.level||0:c.desiredLevel||c.level;
 if(this.toy&&!(c.playRestUntil>Date.now())&&desired===0){c.desiredLevel=0;this.jumpTo(c,0);continue;}
 if(desired!==c.level&&desired>0){if(this.jumpTo(c,desired))continue;}
 if(this.toy&&!(c.playRestUntil>Date.now())&&desired===c.level){if(c.state!=='play')this.set(c,'play');c.mood=clamp(c.mood+dt*.9);c.bond=clamp(c.bond+dt*.1);if(this.time-c.rewardAt>10){this.coins++;c.rewardAt=this.time;this.emit('toy',null,c);}continue;}
 if(c.state==='play')this.set(c,'sit',d.rest+4);
 if(c.timer<=0){if(c.state!=='lounge'&&this.random()<.55){this.set(c,'lounge',8+this.random()*8);}else if(this.random()<.35){this.nap(c);}else{c.desiredLevel=0;this.jumpTo(c,0);}}continue;
 }
 if((c.energy<24||c.sleepiness>80||this.night)&&c.goal!=='bed'){if(this.toy&&c.energy>35&&!this.night){}else{this.target(c,c.id==='lumi'?112:192,217,'bed');}}
 if(c.goal==='bed'&&c.state==='walk'){this.move(c,dt,d.speed);continue;}
 if(this.toy&&c.energy>16&&!(c.playRestUntil>Date.now())){if(this.toy.level){c.desiredLevel=this.toy.level;if(c.goal!=='climb')this.climb(c,this.toy.level);this.move(c,dt,d.speed*(c.id==='hoya'?2.2:1.65));continue;}const dist=Math.hypot(c.x-this.toy.x,c.y-this.toy.y);if(dist>12){c.tx=this.toy.x;c.ty=this.toy.y;c.goal='toy';if(c.state!=='walk')this.set(c,'walk');this.move(c,dt,d.speed*(c.id==='hoya'?2.2:1.65));}else{if(c.state!=='play')this.set(c,'play');c.mood=clamp(c.mood+dt*.9);c.bond=clamp(c.bond+dt*.1);if(this.time-c.rewardAt>10){c.rewardAt=this.time;this.coins++;this.emit('toy',null,c);}}continue;}
 if(c.state==='play'||c.goal==='toy'){c.goal=null;this.set(c,'sit',2);}
 if(c.state==='watch-bird'||c.goal==='bird'){
 if(!this.bird||this.bird.phase!=='perch'||this.food||this.toy){c.goal=null;this.set(c,'sit',2);}
 else{if(c.goal==='bird'){this.move(c,dt,d.speed*1.4);if(Math.hypot(c.x-c.tx,c.y-c.ty)<=1){c.facing=-1;this.set(c,'watch-bird');}}continue;}
 }
 if(this.bird?.phase==='perch'&&!this.food&&!this.toy&&c.birdSeen!==this.bird.id&&c.energy>35&&c.mood>40&&['idle','sit','wander','walk','lounge'].includes(c.state)&&(!c.goal||c.goal==='wander')){c.birdSeen=this.bird.id;this.target(c,c.id==='lumi'?94:122,218,'bird');continue;}
 if(c.state==='walk'){this.move(c,dt,d.speed);continue;}
 if(c.state==='wander'){if(c.timer<=0)this.set(c,'walk');continue;}
 if(c.state==='lounge'){if(c.timer<=0){if(this.random()<.4)this.nap(c);else this.set(c,'sit',3);}continue;}
 if(c.timer<=0){if(c.energy>35&&this.random()<.24&&this.available(1,c)){this.climb(c,this.random()<.5?1:2);}else if(this.random()<.18){this.target(c,95+this.random()*100,239+this.random()*47,'lounge');}else if(this.random()<.35){this.set(c,this.random()<.5?'sit':'idle',d.rest+this.random()*3);}else{this.set(c,'wander',.45);c.tx=30+this.random()*180;c.ty=228+this.random()*59;c.goal='wander';}}
 }
 }
 move(c,dt,speed){const dx=c.tx-c.x,dy=c.ty-c.y,dist=Math.hypot(dx,dy);if(dist>1){const step=Math.min(dist,speed*dt);c.x+=dx/dist*step;c.y+=dy/dist*step;if(Math.abs(dx)>1)c.facing=dx>0?1:-1;}if(dist<=Math.max(1,speed*dt)){c.x=c.tx;c.y=c.ty;const goal=c.goal;c.goal=null;if(goal==='close'){this.close=c.id;c.petSession=0;this.selected=c.id;this.set(c,'sit');this.emit('note','用手指慢慢滑過額頭和身體。',c);}else if(goal==='rest-play'){this.set(c,'lounge',10);}else if(goal==='lounge'){this.set(c,'lounge',8+this.random()*8);}else if(goal==='bed'){c.napUntil=0;c.sleeping=true;c.interrupts=0;this.set(c,'sleep');}else if(goal==='climb'){if(!this.jumpTo(c,1))this.set(c,'sit',2);}else if(goal==='food')this.set(c,'eat');else this.set(c,'sit',defs[c.id].rest);}}
 beginLitterCleaning(){if(this.interacting||this.cats.some(c=>c.state==='toilet')){this.emit('note','等牠上完廁所再清喔。');return null;}if(!this.poops){this.emit('note','貓砂盆目前很乾淨。');return null;}return {initial:this.poops,required:Math.min(6,this.poops+1),progress:0};}
 scoopLitter(session){if(!session||session.progress>=session.required)return false;session.progress++;const removed=Math.ceil(session.initial*session.progress/session.required);this.poops=Math.max(0,session.initial-removed);this.cleanliness=clamp(this.cleanliness+(100-this.cleanliness)/Math.max(1,session.required-session.progress+1));this.emit('scoop',`清理中 ${session.progress}/${session.required}`);if(session.progress>=session.required){this.poops=0;this.cleanliness=100;this.litterCleanAt=this.time;this.emit('note','沙沙沙…貓砂盆乾淨了 ♥');}return true;}
 toilet(c,dt){if(!c.needsToilet||this.interacting)return false;if(c.state!=='toilet'&&this.foods.some(b=>b.id===c.foodId)&&c.hunger<98)return false;if(c.level){this.target(c,210,289,'toilet');return true;}if(this.cats.some(v=>v!==c&&v.state==='toilet'))return false;if(Math.hypot(c.x-210,c.y-289)>2){this.setRunningVisitor(c,210,289,dt,defs[c.id].speed);return true;}if(c.state!=='toilet'){this.set(c,'toilet',3);this.emit('note',defs[c.id].name+' 吃飽了，去一下貓砂盆。');}if(c.timer<=0){c.needsToilet=false;this.poops=Math.min(8,this.poops+1);this.cleanliness=clamp(this.cleanliness-18);this.target(c,174,266,'wander');}return true;}
 snapshot(){const cats={};for(const c of this.cats){cats[c.id]={digestion:c.digestion||0,needsToilet:!!c.needsToilet,sleeping:c.sleeping,interrupts:c.interrupts,petBlockedUntil:c.petBlockedUntil||0,companionDay:c.companionDay||'',playPhase:c.playPhase||null,playRestUntil:c.playRestUntil||0};for(const key of stats)cats[c.id][key]=c[key];}return {version:1,cleanliness:this.cleanliness,poops:this.poops,savedAt:Date.now(),foods:this.foods.map(b=>({...b})),manualNight:this.manualNight,nightRewardDay:this.nightRewardDay||'',lightsOffAt:this.lightsOffAt||0,selected:this.selected,coins:this.coins,cats};}
}
root.CatRoom={World,defs,clamp,platforms};if(typeof module!=='undefined')module.exports=root.CatRoom;
})(typeof window==='undefined'?globalThis:window);
