/* Pure simulation. Coordinates are in the 240 × 320 room, independent of display size. */
(function(root){
'use strict';
const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,n));
const APP_VERSION='v0.1.11';
const defs={lumi:{name:'Lumi',speed:17,pat:1.5,rest:6,sleepAnger2:15,sleepAnger3:30,fastAnger:20,sensitiveAnger:25},hoya:{name:'Hoya',speed:28,pat:1,rest:3,sleepAnger2:20,sleepAnger3:40,fastAnger:30,sensitiveAnger:35}};
const stats=['hunger','mood','energy','sleepiness','bond','anger'];
const formalStats=['hunger','mood','energy','bond'];
const statLimits={hunger:[0,20],mood:[0,20],energy:[0,20],bond:[0,10],water:[0,15]};
const THREAT_EFFECTS={THUNDER:{mood:-2},LOUD_NOISE:{mood:-2},DOG:{mood:-2,energy:-1},WOLF:{mood:-4,energy:-2},BEAR:{mood:-6,energy:-2}};
const cleanByPoops=[30,26,22,18,14,10,6,2,0];
const getCleanlinessFromPoops=poops=>cleanByPoops[clamp(Math.floor(Number(poops)||0),0,8)];
const freshBuckets=()=>({activeHunger:0,activeMood:0,activeEnergy:0,sleepEnergy:0,activeWater:0,offlineHunger:0,offlineMood:0,offlineEnergy:0,offlineWater:0,toilet:0,naturalPoop:0,anger:0});
const windowApproachPoint={x:70,y:216},windowJumpPoint={x:70,y:211},windowPerchLeft={x:48,y:258,z:110},windowPerchRight={x:92,y:258,z:110};
const windowPlatform={level:4,x:70,y:258,z:110,kind:'window',halfWidth:50};
const platforms=[{level:1,x:18,y:258,z:32,kind:'tree'},{level:2,x:39,y:258,z:80,kind:'tree'},{level:3,x:183,y:258,z:104,kind:'cabinet',halfWidth:42},windowPlatform];
function freshCat(id){return {id,level:0,z:0,lift:0,jump:null,desiredLevel:0,resume:null,pendingCall:false,windowIntent:null,x:id==='lumi'?82:164,y:id==='lumi'?235:261,tx:120,ty:260,facing:id==='lumi'?1:-1,state:'idle',timer:2,age:0,hunger:10,mood:10,energy:10,sleepiness:15,bond:0,anger:0,toiletNeed:0,toiletDelayRemaining:0,poopQueue:0,poopTimer:0,queuedToilet:false,timeBuckets:freshBuckets(),interrupts:0,sleeping:false,goal:null,petGlow:0,petTotal:0,rewardAt:0};}
class World{
 litterCleanAt=-Infinity;
 floorBounds={left:-30,right:270,bottom:299};
 litter={x:234,y:289};
 yarn={x:145,y:278};
 fountain={x:6,y:294};
 refillWater(){if(this.water>=15){this.emit('note','已經滿水了，不用再補囉！');return false;}this.applyStatDelta({target:'shared',stat:'water',requestedDelta:15},{source:'REFILL_WATER'});this.emit('note','飲水機已補滿，水量 15/15。');return true;}
 playYarn(){if(this.interacting||this.toy||this.current.sleeping)return false;this.endSocial();this.current.yarnUntil=this.time+12;return true;}
 updateYarnPlay(){
  if(this.time<(this.nextYarnPlay??75)||this.wolf||this.critter||this.plane||this.bird||this.social||this.close||this.toy||this.cats.some(c=>c.yarnUntil>this.time))return;
  this.nextYarnPlay=this.time+75+this.random()*90;
  const cats=this.cats.filter(c=>!c.sleeping&&!c.level&&!c.jump&&c.energy>2&&c.anger<30&&!c.goal&&['idle','sit','wander'].includes(c.state));
  if(!cats.length)return;
  const c=cats[Math.floor(this.random()*cats.length)];c.yarnUntil=this.time+8;this.emit('note',`${defs[c.id].name} 發現毛線球，伸手撥了撥。`,c);
 }
 updateCritter(dt){
  if(!this.critter){
   if(this.time<(this.nextCritter??300))return;
   if(this.wolf||this.plane||this.bird||this.social||this.close||this.toy||this.cats.some(c=>c.yarnUntil>this.time)){this.nextCritter=this.time+15;return;}
 this.nextCritter=this.time+90+this.random()*150;
   const cats=this.cats.filter(c=>!c.sleeping&&!c.level&&!c.jump&&c.toiletNeed<100&&c.anger<30),target=cats[Math.floor(this.random()*cats.length)];
   const kind=this.random()<.5?'mouse':'ant',direction=kind==='mouse'?-1:1;
   this.critter={kind,direction,age:0,duration:9,x:direction>0?this.floorBounds.left-16:this.floorBounds.right+16,y:kind==='mouse'?this.floorBounds.bottom-48:this.floorBounds.bottom-8,target:target?.id||null};
   if(kind==='mouse')this.emit('squeak');return;
  }
  const v=this.critter;v.age+=dt;const p=Math.min(1,v.age/v.duration),left=this.floorBounds.left-16,right=this.floorBounds.right+16;v.x=v.direction>0?left+(right-left)*p:right-(right-left)*p;
  if(v.age>=v.duration){const c=this.cats.find(c=>c.id===v.target);if(c?.goal==='critter'){c.goal=null;this.set(c,'sit',2);}this.critter=null;}
 }
 updateMosquito(dt){
  if(this.mosquitoPop){this.mosquitoPop.age+=dt;if(this.mosquitoPop.age>=.45)this.mosquitoPop=null;}
  if(this.isGoodnightMode||this.wolf){this.removeMosquito();return;}
  if(!this.mosquito){if(this.time<(this.nextMosquito??90))return;this.nextMosquito=this.time+90+this.random()*150;const direction=this.random()<.5?1:-1;this.mosquito={age:0,duration:11+this.random()*5,direction,phase:this.random()*Math.PI*2,x:direction>0?this.floorBounds.left-8:this.floorBounds.right+8,y:70};this.emit('mosquito-start');return;}
  const m=this.mosquito;m.age+=dt;const p=m.age/m.duration,left=this.floorBounds.left-8,right=this.floorBounds.right+8,travel=right-left;m.x=m.direction>0?left+travel*p:right-travel*p;m.y=clamp(72+Math.sin(m.age*1.45+m.phase)*20+Math.sin(m.age*.57+m.phase*.6)*11,38,132);
  if(m.age>=m.duration)this.removeMosquito();
 }
 removeMosquito(){if(!this.mosquito)return;this.mosquito=null;this.emit('mosquito-stop');}
 hitMosquito(x,y){const m=this.mosquito;if(!m||Math.hypot(x-m.x,y-m.y)>15)return false;this.mosquitoPop={x:m.x,y:m.y,age:0};this.mosquito=null;this.nextMosquito=this.time+120+this.random()*180;this.emit('mosquito-stop');this.emit('swat','啪！打到蚊子了。');return true;}
 chase(c,dt,toy){
  if(c.sleeping){c.sleeping=false;c.napUntil=0;c.interrupts=0;}
  if(c.goal==='bed'||c.resume?.goal==='bed'){c.goal=null;c.resume=null;}
  c.foodId=null;
  if(toy.level===4){
   const selected=c.id===this.selected,speed=defs[c.id].speed*(c.id==='hoya'?2.5:1.65);
   if(!selected){c.windowIntent=null;c.desiredLevel=0;if(c.level===4){if(!c.jump)this.jumpTo(c,0);return;}const x=windowApproachPoint.x+(c.id==='lumi'?-13:13),y=windowApproachPoint.y+5,dist=Math.hypot(c.x-x,c.y-y);c.goal='toy';c.tx=x;c.ty=y;if(dist>10){if(c.state!=='walk')this.set(c,'walk');this.move(c,dt,speed);}else if(c.state!=='play')this.set(c,'play');return;}
   c.windowIntent='wand';c.desiredLevel=4;
   for(const other of this.cats)if(other!==c&&other.level===4){other.windowIntent=null;other.desiredLevel=0;if(!other.jump)this.jumpTo(other,0);}
   if(c.level===4){const x=clamp(toy.drawX??toy.x,windowPerchLeft.x,windowPerchRight.x),dist=Math.abs(c.x-x);c.goal='toy';if(dist>8){c.facing=x<c.x?-1:1;c.x+=Math.sign(x-c.x)*Math.min(dist,speed*dt*.55);if(c.state!=='walk')this.set(c,'walk');}else{if(c.state!=='play')this.set(c,'play');if(this.playEnergy(c,dt)&&this.time-c.rewardAt>10){this.coins++;c.rewardAt=this.time;this.emit('toy',null,c);}}return;}
   if(c.level){if(!c.jump)this.jumpTo(c,0);return;}
   if(c.goal!=='climb'||c.climbEntryLevel!==4)this.climb(c,4);this.move(c,dt,speed);return;
  }
  if(toy.level){c.windowIntent=null;c.desiredLevel=toy.level;if(c.level===toy.level){if(c.state!=='play')this.set(c,'play');if(this.playEnergy(c,dt)&&this.time-c.rewardAt>10){this.coins++;c.rewardAt=this.time;this.emit('toy',null,c);}}else if(c.level){this.jumpTo(c,toy.level);}else{if(c.goal!=='climb')this.climb(c,toy.level);this.move(c,dt,defs[c.id].speed*(c.id==='hoya'?2.5:1.65));}return;
  }
  if(c.level){c.windowIntent=null;c.desiredLevel=0;if(!c.jump)this.jumpTo(c,0);return;}
  // Route around the tree base; the cabinet is above the walkable floor.
  let x=clamp(toy.x,toy.y>=280?this.floorBounds.left:65,this.floorBounds.right);const y=clamp(toy.y,230,this.floorBounds.bottom);if(y>this.fountain.y-30)x=Math.max(x,this.fountain.x+27);const dist=Math.hypot(c.x-x,c.y-y);
  c.goal='toy';
  if(dist>(c.id==='hoya'?(c.state==='play'?12:8):(c.state==='play'?15:10))){c.tx=x;c.ty=y;if(c.x<65&&c.y<272&&y>=250){c.tx=70;c.ty=235;}else if(x<65&&c.y<278){c.tx=70;c.ty=282;}if(c.state!=='walk')this.set(c,'walk');this.move(c,dt,defs[c.id].speed*(c.id==='hoya'?2.5:1.65));}
  else{if(c.state!=='play')this.set(c,'play');const rewardAllowed=c.energy>2&&c.anger<10&&!(c.playRestUntil>Date.now());if(rewardAllowed&&this.playEnergy(c,dt)&&this.time-c.rewardAt>10){this.coins++;c.rewardAt=this.time;this.emit('toy',null,c);}}
 }
 constructor(saved,random=Math.random){
 this.random=random;this.cats=[freshCat('lumi'),freshCat('hoya')];this.selected='lumi';this.coins=150;this.water=15;this.isGoodnightMode=false;Object.defineProperties(this,{night:{get:()=>this.isGoodnightMode,set:value=>{this.isGoodnightMode=!!value;}},manualNight:{get:()=>this.isGoodnightMode,set:value=>{this.isGoodnightMode=value===true;}}});this.outdoorNight=false;this.close=null;this.events=[];this.foods=[];this.foodSerial=0;this.toy=null;this.time=0;this.poops=0;this.plantKnocked=false;this.lampKnocked=false;this.lastThreat='';this.nextMischief=70;this.nextBird=18;this.nextPlane=45+random()*45;this.nextWolf=80+random()*65;this.nextMeteor=60;this.nextYarnPlay=90;this.nextCritter=120;this.nextMosquito=100;this.mosquito=null;
 if(saved&&[1,2,3,4,5].includes(saved.version)){
  this.coins=Number.isFinite(saved.coins)?clamp(saved.coins,0,99999):150;this.water=saved.version>=4&&Number.isFinite(saved.water)?Math.round(clamp(saved.water,0,15)):15;this.selected=defs[saved.selected]?saved.selected:'lumi';const savedGoodnight=typeof saved.isGoodnightMode==='boolean'?saved.isGoodnightMode:saved.manualNight;if(typeof savedGoodnight==='boolean')this.isGoodnightMode=savedGoodnight;if(Number.isFinite(saved.lightsOffAt)&&saved.lightsOffAt<=Date.now())this.lightsOffAt=saved.lightsOffAt;
  for(const c of this.cats){const old=saved.cats?.[c.id];if(!old)continue;if(typeof old.companionDay==='string')c.companionDay=old.companionDay;if(['warmup','tired'].includes(old.playPhase))c.playPhase=old.playPhase;if(Number.isFinite(old.playRestUntil))c.playRestUntil=Math.min(old.playRestUntil,Date.now()+45000);if(Number.isFinite(old.petBlockedUntil))c.petBlockedUntil=Math.min(old.petBlockedUntil,Date.now()+60000);for(const k of formalStats)if(Number.isFinite(old[k]))c[k]=saved.version>=5?Math.round(clamp(old[k],...statLimits[k])):saved.version>=3?Math.round(clamp(old[k]*2,...statLimits[k])):Math.round(clamp(old[k]/100*statLimits[k][1],...statLimits[k]));if(Number.isFinite(old.sleepiness))c.sleepiness=clamp(old.sleepiness);if(Number.isFinite(old.anger))c.anger=Math.round(clamp(old.anger));if(saved.version>=2&&Number.isFinite(old.toiletNeed))c.toiletNeed=Math.round(clamp(old.toiletNeed));else if(old.needsToilet)c.toiletNeed=100;else if(Number.isFinite(old.digestion))c.toiletNeed=Math.round(clamp(old.digestion/12,0,1)*99);if(old.timeBuckets&&typeof old.timeBuckets==='object')for(const key of Object.keys(c.timeBuckets))if(Number.isFinite(old.timeBuckets[key]))c.timeBuckets[key]=Math.max(0,old.timeBuckets[key]);c.poopQueue=Number.isFinite(old.poopQueue)?Math.max(0,Math.floor(old.poopQueue)):old.pendingPoop?1:0;c.poopTimer=Number.isFinite(old.poopTimer)?clamp(old.poopTimer,0,120):old.pendingPoop&&Number.isFinite(old.pendingPoop.remaining)?clamp(old.pendingPoop.remaining,0,120):0;c.queuedToilet=!!old.queuedToilet;for(const key of ['playEffectiveSeconds','playWarmup','playTiredSeconds','playEnergyAwards'])if(Number.isFinite(old[key]))c[key]=Math.max(0,old[key]);c.playMoodAwarded=!!old.playMoodAwarded;c.mealHungerGain=Number.isFinite(old.mealHungerGain)?Math.max(0,Math.round(old.mealHungerGain)):0;c.mealCareStart=Number.isFinite(old.mealCareStart)?Math.round(old.mealCareStart):null;c.mealToiletWasUrgent=!!old.mealToiletWasUrgent;c.toiletDelayRemaining=Number.isFinite(old.toiletDelayRemaining)?clamp(old.toiletDelayRemaining,0,180):0;c.foodAccumulator=Number.isFinite(old.foodAccumulator)?clamp(old.foodAccumulator,0,2.999999):0;c.toiletFoodAccumulator=Number.isFinite(old.toiletFoodAccumulator)?clamp(old.toiletFoodAccumulator,0,.999999):0;if(old.sleeping){c.sleeping=true;c.state='sleep';c.x=c.id==='lumi'?112:192;c.y=217;}c.interrupts=Number.isFinite(old.interrupts)?clamp(old.interrupts,0,10):0;}
  if(Array.isArray(saved.foods))this.foods=saved.foods.filter(b=>b&&Number.isFinite(b.x)&&Number.isFinite(b.y)&&Number.isFinite(b.left)&&b.y>=205&&b.left>.001).slice(0,2).map(b=>({id:++this.foodSerial,x:clamp(b.x,this.floorBounds.left,this.floorBounds.right),y:clamp(b.y,205,this.floorBounds.bottom),left:Math.min(30,b.left)}));this.poops=Number.isFinite(saved.poops)?clamp(Math.floor(saved.poops),0,8):0;this.plantKnocked=!!saved.plantKnocked;this.lampKnocked=!!saved.lampKnocked;this.lastThreat=typeof saved.lastThreat==='string'?saved.lastThreat:'';this.nightRewardDay=typeof saved.nightRewardDay==='string'?saved.nightRewardDay:'';if(saved.activeWaterInterval!==30)this.cats[0].timeBuckets.activeWater=Math.min(29.999,this.cats[0].timeBuckets.activeWater/12);this.applyOffline(saved.savedAt);
 }}
 get current(){return this.cats.find(c=>c.id===this.selected);}
 get food(){return this.foods[0]||null;}
 get cleanliness(){return clamp(getCleanlinessFromPoops(this.poops)-Math.floor((15-this.water)/3)-(this.plantKnocked?3:0)-(this.lampKnocked?2:0),0,30);}
 careBreakdown(){const score=c=>c.hunger+c.mood+c.energy+c.bond+this.cleanliness,lumi=score(this.cats[0]),hoya=score(this.cats[1]);return {lumi,hoya,environment:this.cleanliness,overall:clamp(score(this.current),0,100)};}
 careScore(){return this.careBreakdown().overall;}
 statTargets(target){if(target==='each')return this.cats;if(target==='shared')return [this];if(typeof target==='string')return this.cats.filter(c=>c.id===target);return target?[target]:[];}
 applyStatDelta(change,options={}){return this.applyStatChanges([change],options)[0]?.delta||0;}
 applyStatChanges(changes,{source='action',feedback=true}={}){const before=this.careScore(),cleanBefore=this.cleanliness,actual=[];for(const change of changes){for(const target of this.statTargets(change.target)){const stat=change.stat;if(stat==='cleanliness'||!statLimits[stat]||!Number.isFinite(change.requestedDelta))continue;const requested=Math.round(change.requestedDelta),old=target[stat],next=Math.round(clamp(old+requested,...statLimits[stat])),delta=next-old;if(delta)target[stat]=next;if(delta||requested>0&&old===statLimits[stat][1])actual.push({id:target===this?'shared':target.id,stat,delta,capped:delta===0});}}const after=this.careScore();if(this.cleanliness!==cleanBefore)actual.push({id:'shared',stat:'cleanliness',delta:this.cleanliness-cleanBefore});if(feedback&&actual.length)this.emitStatFeedback(actual,before,after,source);return actual;}
 emitStatFeedback(changes,before,after,source){this.events.push({type:'stat-feedback',changes,careDelta:after-before,source});}
 passiveDelta(c,stat,requestedDelta,floor){const old=c[stat],next=requestedDelta<0?Math.min(old,Math.max(floor,old+requestedDelta)):old+requestedDelta;return this.applyStatDelta({target:c,stat,requestedDelta:next-old},{source:'time',feedback:false});}
 applyThreat(type,target='each'){const effect=THREAT_EFFECTS[type];if(!effect)return [];const changes=[];for(const stat of Object.keys(effect))changes.push({target,stat,requestedDelta:effect[stat]});return this.applyStatChanges(changes,{source:`THREAT_${type}`});}
 knockObject(kind){const key=kind==='plant'?'plantKnocked':'lampKnocked',loss=kind==='plant'?3:2;if(this[key])return false;const before=this.careScore(),clean=this.cleanliness;this[key]=true;this.emitStatFeedback([{id:'shared',stat:'cleanliness',delta:this.cleanliness-clean}],before,this.careScore(),`MISCHIEF_${kind.toUpperCase()}`);this.emit('note',kind==='plant'?'花盆被撞倒了，點一下把它扶好。':'落地燈被撞倒了，點一下把它扶好。');return loss>0;}
 resetObject(x,y){let kind=null;if(this.plantKnocked&&x>=-30&&x<=12&&y>=150&&y<=202)kind='plant';else if(this.lampKnocked&&x>=186&&x<=224&&y>=116&&y<=160)kind='lamp';if(!kind)return false;const key=kind==='plant'?'plantKnocked':'lampKnocked',before=this.careScore(),clean=this.cleanliness;this[key]=false;this.emitStatFeedback([{id:'shared',stat:'cleanliness',delta:this.cleanliness-clean}],before,this.careScore(),`RESET_${kind.toUpperCase()}`);this.emit('note',kind==='plant'?'扶好花盆，房間又整齊了。':'扶好落地燈，房間又整齊了。');return true;}
 maybeKnockByCat(c,kind,chance){if(!c||this[`${kind}Knocked`]||this.time<(c.mischiefCooldown||0))return false;c.mischiefCooldown=this.time+6;if(this.random()>=chance)return false;return this.knockObject(kind);}
 updateMischief(){if(this.time<(this.nextMischief??90)||this.wolf||this.critter||this.plane||this.bird||this.social||this.close||this.toy)return;this.nextMischief=this.time+75+this.random()*90;const available=[];if(!this.plantKnocked)available.push('plant');if(!this.lampKnocked)available.push('lamp');const cats=this.cats.filter(c=>!c.sleeping&&!c.jump&&!c.goal&&!c.level&&c.anger<30&&['idle','sit','wander','walk','lounge'].includes(c.state));if(!available.length||!cats.length)return;const kind=available[Math.floor(this.random()*available.length)],c=cats[Math.floor(this.random()*cats.length)];if(kind==='lamp'){c.mischiefObject='lamp';this.climb(c,3);}else this.target(c,4,219,'mischief-plant');}
 schedulePoop(c){if(c.poopTimer>0||c.queuedToilet||c.poopQueue<=0)return false;c.poopTimer=30+this.random()*90;return true;}
 advancePoopTimers(seconds,offline){for(const c of this.cats){let remaining=seconds;while(c.poopQueue>0&&remaining>0){if(c.queuedToilet)break;if(c.poopTimer<=0)this.schedulePoop(c);if(remaining<c.poopTimer){c.poopTimer-=remaining;break;}remaining-=c.poopTimer;c.poopTimer=0;if(offline){if(this.poops>=8)break;this.poops++;c.poopQueue--;if(c.poopQueue>0)this.schedulePoop(c);}else{c.toiletNeed=100;c.toiletDelayRemaining=0;c.queuedToilet=true;break;}}}}
 get interacting(){return !!this.wolf||!!this.close||this.cats.some(c=>c.pendingCall||c.goal==='close'||['turn-look','come-to-player'].includes(c.state)||c.resume?.goal==='close');}
 assignMeals(){
  this.foods=this.foods.filter(b=>b.left>.001);const cats=this.cats.filter(c=>!c.sleeping&&c.anger<=30&&c.hunger<20&&!c.jump&&!['angry','bite-warning'].includes(c.state));
  if(this.foods.length&&this.cats.every(c=>c.hunger>=20)){this.foods=[];for(const c of this.cats){this.finishMeal(c);c.foodId=null;}this.emit('note','Lumi 和 Hoya 現在都不餓，先把碗收起來。');return;}
 for(const c of this.cats)if(!cats.includes(c)){if(c.hunger>=20)this.finishMeal(c);c.foodId=null;}
 if(this.interacting||this.bird?.phase==='perch'){for(const c of this.cats)c.foodId=null;return;}
 const used=new Set();for(const c of cats){let bowl=this.foods.find(b=>b.id===c.foodId&&!used.has(b.id));if(!bowl)bowl=[...this.foods].filter(b=>!used.has(b.id)).sort((a,b)=>Math.hypot(c.x-a.x,c.y-a.y)-Math.hypot(c.x-b.x,c.y-b.y))[0]||this.food;c.foodId=bowl?.id; if(bowl)used.add(bowl.id);}
 }
 feed(c,dt){const bowl=this.foods.find(b=>b.id===c.foodId);if(!bowl||this.interacting)return false;
 const shared=this.cats.filter(v=>v.foodId===bowl.id),seat=shared.length>1?(shared.indexOf(c)?10:-10):0,x=bowl.x+seat,y=bowl.y;
 if(c.level){this.target(c,x,y,'food');return true;}
 if(Math.hypot(c.x-x,c.y-y)>2){if(c.goal!=='food'||c.tx!==x||c.ty!==y)this.target(c,x,y,'food');this.move(c,dt,defs[c.id].speed*1.2);return true;}
 if(c.state!=='eat')this.set(c,'eat');if(c.mealCareStart==null){c.mealCareStart=this.careScore();c.mealToiletWasUrgent=c.toiletNeed>=100;}const bite=Math.min(bowl.left,dt*2);bowl.left-=bite;c.foodAccumulator=(c.foodAccumulator||0)+bite;c.toiletFoodAccumulator=(c.toiletFoodAccumulator||0)+bite;while(c.toiletFoodAccumulator>=1){c.toiletFoodAccumulator-=1;c.toiletNeed=clamp(c.toiletNeed+1);}while(c.foodAccumulator>=3&&c.hunger<20){c.foodAccumulator-=3;const gained=this.applyStatDelta({target:c,stat:'hunger',requestedDelta:2},{source:'CAT_EAT_FOOD',feedback:false});c.mealHungerGain=(c.mealHungerGain||0)+gained;}if(Math.floor(c.age*3)!==Math.floor((c.age-dt)*3))this.emit('eat',null,c);
 if(bowl.left<=.001){bowl.left=0;this.foods=this.foods.filter(b=>b!==bowl);for(const eater of this.cats.filter(v=>v.foodId===bowl.id)){eater.foodId=null;this.finishMeal(eater);this.set(eater,'sit',3);}this.emit('note',`${defs[c.id].name} 舔舔嘴巴，吃完了。`,c);}return true;}
 finishMeal(c){if(c.mealCareStart==null)return;const changes=[];if(c.mealHungerGain>0){changes.push({id:c.id,stat:'hunger',delta:c.mealHungerGain});if(!c.mealToiletWasUrgent)c.toiletDelayRemaining=Math.max(c.toiletDelayRemaining||0,180);c.poopQueue++;this.schedulePoop(c);}if(c.mealHungerGain>=1){changes.push(...this.applyStatChanges([{target:c,stat:'mood',requestedDelta:2}],{source:'CAT_EAT_FOOD',feedback:false}));}const before=c.mealCareStart;c.mealCareStart=null;c.mealToiletWasUrgent=false;c.mealHungerGain=0;c.foodAccumulator=0;if(changes.length)this.emitStatFeedback(changes,before,this.careScore(),'CAT_EAT_FOOD');}
 toggleNight(now=Date.now()){
  if(this.close)return;const date=new Date(now),hour=date.getHours();if(!this.isGoodnightMode&&hour>=6&&hour<20){this.emit('note','晚安燈在晚上 20:00 後開放。');return;}if(!this.isGoodnightMode){const evening=new Date(now);if(hour<6)evening.setDate(evening.getDate()-1);const day=evening.toLocaleDateString('en-CA');if(this.nightRewardDay!==day){this.nightRewardDay=day;this.applyStatChanges(this.cats.map(c=>({target:c,stat:'mood',requestedDelta:4})),{source:'NIGHT_LIGHT_FIRST_REWARD'});this.emit('note','晚安獎勵：Lumi、Hoya 心情各 +4。');}this.lightsOffAt=now;this.isGoodnightMode=true;this.toy=null;this.clearExternalEvents();this.resetExternalCooldowns();}
  else{this.isGoodnightMode=false;this.resetExternalCooldowns();if(this.lightsOffAt&&now-this.lightsOffAt<600000){this.applyStatChanges(this.cats.map(c=>({target:c,stat:'mood',requestedDelta:-4})),{source:'NIGHT_LIGHT_EARLY_REOPEN'});for(const c of this.cats){c.anger=clamp(c.anger+15);this.emit('angry',null,c);}this.emit('note','才剛關燈又亮了…牠們不高興，心情 −4。');}else this.emit('note','早安，讓牠們慢慢醒來。');this.lightsOffAt=0;}}
 touchCat(id){const c=this.cats.find(c=>c.id===id),watching=c&&this.bird?.phase==='perch'&&(c.state==='watch-bird'||c.goal==='bird'||c.windowIntent==='bird'||c.level===4);if(watching&&this.frightenBird(c,true))return;this.call(id);}
 applyOffline(since,now=Date.now()){if(!Number.isFinite(since)||!Number.isFinite(now)||now<=since)return;const seconds=Math.min(72*3600,(now-Math.max(since,this.offlineAppliedAt||since))/1000);if(seconds<=0)return;this.offlineAppliedAt=now;this.advanceTime(seconds,true);for(const c of this.cats)c.sleepiness=clamp(c.sleepiness+seconds/1800);if(seconds>=21600){if(!this.plantKnocked&&this.random()<.35)this.plantKnocked=true;if(!this.lampKnocked&&this.random()<.25)this.lampKnocked=true;}if(seconds>=900)this.emit('note','你回來了。牠們有點餓，也想你陪一會。');}
 companionReward(c){const today=new Date().toLocaleDateString('en-CA');if(c.companionDay===today)return;c.companionDay=today;this.coins+=5;this.applyStatDelta({target:c,stat:'bond',requestedDelta:2},{source:'DAILY_COMPANIONSHIP_REWARD'});this.emit('coin',`今天第一次好好陪 ${defs[c.id].name}：＋5 金幣 ♡`,c);}
 finishPet(c){c.petBlockedUntil=Date.now()+30000;this.set(c,'pet-satisfied',1);this.companionReward(c);this.emit('purr',`${defs[c.id].name} 已經很滿足了，蹭蹭你，自己去休息。`,c);}
 playEnergy(c,dt){
 if(c.playRestUntil>Date.now())return false;
 if(!c.playPhase)c.playPhase='warmup';c.playEffectiveSeconds=(c.playEffectiveSeconds||0)+dt;
 if(c.playPhase==='warmup'){c.playWarmup=(c.playWarmup||0)+dt;if(c.playWarmup>=7){c.playPhase='tired';this.emit('note',`${defs[c.id].name} 玩開了！接下來會慢慢玩累。`,c);}}
 else c.playTiredSeconds=(c.playTiredSeconds||0)+dt;
 if(!c.playMoodAwarded&&c.playEffectiveSeconds>=8){c.playMoodAwarded=true;this.applyStatChanges([{target:c,stat:'mood',requestedDelta:2},{target:c,stat:'bond',requestedDelta:2}],{source:'TOY_PLAY_SESSION'});}
 if(c.playPhase==='tired'&&(c.playTiredSeconds||0)>=23){this.applyStatDelta({target:c,stat:'hunger',requestedDelta:-2},{source:'PLAY_EXERTION',feedback:false});c.playRestUntil=Date.now()+45000;c.playPhase=null;c.playEffectiveSeconds=0;c.playWarmup=0;c.playTiredSeconds=0;c.playEnergyAwards=0;c.playMoodAwarded=false;this.target(c,c.id==='lumi'?104:202,242,'rest-play');this.emit('note',`${defs[c.id].name} 玩累也有點餓了，自己走開休息。`,c);return false;}return true;
 }
 canSpawnExternalEvent(kind){
  if(this.isGoodnightMode)return false;
  if(kind==='threat')return !this.wolf&&!this.critter&&this.time>=(this.nextWolf??420);
  if(kind==='plane')return !this.plane&&!this.critter&&!this.social&&!this.cats.some(c=>c.yarnUntil>this.time)&&this.time>=(this.nextPlane??300);
  if(kind==='bird')return !this.bird&&!this.social&&this.time>=(this.nextBird??18);
  if(kind==='meteor')return this.outdoorNight&&!this.meteor&&this.time>=(this.nextMeteor??60);
  return false;
 }
 resetExternalCooldowns(){this.nextBird=this.time+20+this.random()*20;this.nextPlane=this.time+55+this.random()*40;this.nextWolf=this.time+120+this.random()*90;this.nextMeteor=this.time+90+this.random()*150;this.nextMosquito=this.time+70+this.random()*110;}
 clearExternalEvents(){if(this.wolf)this.dismissWolf(false);this.plane=null;this.bird=null;this.meteor=null;this.removeMosquito();for(const c of this.cats){if(c.goal==='bird'||['bird','plane'].includes(c.windowIntent)||['watch-bird','watch-plane'].includes(c.state)){c.goal=null;c.windowIntent=null;this.set(c,'sit',2);}if(this.isGoodnightMode&&(c.level===4||c.jump?.level===4)){const wasSleeping=c.sleeping;if(c.jump?.level===4&&c.level!==4)this.resolveInterruptedJump(c);c.sleeping=false;c.windowIntent=null;c.desiredLevel=0;if(wasSleeping)c.resume={x:c.id==='lumi'?112:192,y:217,goal:'bed'};if(c.level===4&&!c.jump)this.jumpTo(c,0);}}}
 updateVisitors(dt){
 if(this.isGoodnightMode){this.clearExternalEvents();return;}
 if(this.canSpawnExternalEvent('threat')){this.nextWolf=this.time+120+this.random()*90;const choices=['WOLF','DOG','BEAR'].filter(v=>v!==this.lastThreat),kind=choices[Math.floor(this.random()*choices.length)],target=this.random()<.5?'lumi':'hoya',names={WOLF:'狼',DOG:'狗狗',BEAR:'熊'};this.lastThreat=kind;this.wolf={kind,target,age:0,hits:0,flash:0};this.plane=null;this.bird=null;this.removeMosquito();this.endSocial();this.close=null;this.toy=null;this.applyThreat(kind,target);for(const c of this.cats){this.resolveInterruptedJump(c);c.sleeping=false;c.pendingCall=false;c.resume=null;c.goal=null;c.windowIntent=null;c.desiredLevel=0;this.set(c,'puffed',1.5);}this.emit(kind==='DOG'?'bark':kind==='BEAR'?'roar':'howl',kind==='DOG'?'窗外來了一隻狗狗，把貓咪嚇了一跳。摸摸狗狗 5 下，牠就會開心離開。':`窗外有${names[kind]}！點牠 5 下，幫貓咪趕走牠。`);}
 if(this.hitFx){this.hitFx.age+=dt;if(this.hitFx.age>.32)this.hitFx=null;}if(this.wolf){this.wolf.age+=dt;this.wolf.flash=Math.max(0,this.wolf.flash-dt);if(this.wolf.kind==='DOG'&&this.wolf.happy&&this.time>=this.wolf.leaveAt)this.dismissWolf(false);else if(this.wolf.age>=60)this.dismissWolf(false);return;}
 if(this.canSpawnExternalEvent('plane')){this.nextPlane=this.time+55+this.random()*40;this.plane={age:0,direction:-1,variant:Math.floor(this.random()*3)};this.endSocial();this.assignPlaneWatcher();this.emit('plane');this.emit('note','抬頭看，一架小飛機經過窗外。');}
 if(this.plane){this.plane.age+=dt;if(this.plane.age>=18)this.plane=null;}
 }
 threatHitFeedback(x,y){this.hitFx={x,y,age:0,kind:'hammer'};this.emit('thump');}
 hitWolf(x,y){if(!this.wolf)return false;const dog=this.wolf.kind==='DOG',bear=this.wolf.kind==='BEAR',left=dog?64:bear?55:40,right=dog?94:bear?113:99,top=dog?95:82,bottom=dog?142:bear?142:126;if(x<left||x>right||y<top||y>bottom)return false;if(dog){if(this.wolf.happy)return true;this.wolf.hits++;this.wolf.pettedAt=this.time;this.emit('dog-love',this.wolf.hits>=5?'狗狗被摸得很開心，搖著尾巴準備離開。':`摸摸狗狗 ${this.wolf.hits}/5，再摸 ${5-this.wolf.hits} 下。`);if(this.wolf.hits>=5){this.wolf.happy=true;this.wolf.leaveAt=this.time+2.4;}return true;}this.wolf.hits++;this.wolf.flash=.18;this.threatHitFeedback(x,y);if(this.wolf.hits>=5)this.dismissWolf(true);return true;}
 defendCatsSuccess(){this.applyStatChanges(this.cats.flatMap(c=>[{target:c,stat:'mood',requestedDelta:2},{target:c,stat:'bond',requestedDelta:2}]),{source:'DEFEND_CATS_SUCCESS'});}
 dismissWolf(defended=false){if(!this.wolf)return;const kind=this.wolf.kind||'WOLF',name={WOLF:'狼',DOG:'狗狗',BEAR:'熊'}[kind],friendly=kind==='DOG'&&this.wolf.happy;this.wolf=null;if(defended)this.defendCatsSuccess();this.emit('note',friendly?'狗狗滿足地搖著尾巴離開了。':defended?'你保護了牠們！Lumi 和 Hoya 安心地走出來。':`${name}離開了，安全了。牠們探探頭，慢慢走出來。`);for(const c of this.cats){if(c.state==='hidden') {c.x=c.id==='lumi'?164:202;c.y=206;}c.goal=null;this.set(c,'sit',2);}}
 visitorCat(c,dt){
 if(this.wolf){if(c.state==='puffed'&&c.timer>0)return true;if(c.level){this.jumpTo(c,0);return true;}if(c.state==='hidden')return true;const x=c.id==='lumi'?164:202,y=199,dist=Math.hypot(x-c.x,y-c.y);if(dist<2){this.set(c,'hidden');return true;}this.setRunningVisitor(c,x,y,dt,defs[c.id].speed*3);return true;}
 if(c.state==='watch-plane'&&!this.plane){this.set(c,'sit',2);c.goal=null;c.windowIntent=null;}
 if(this.plane&&!c.sleeping&&!this.interacting&&!this.toy&&!this.food&&c.anger<30){if(this.plane.watcher===c.id&&c.windowIntent==='plane'){if(c.level===4){if(c.state!=='watch-plane')this.set(c,'watch-plane');return true;}return false;}if(!c.level){const x=c.id==='lumi'?94:122,y=216;if(Math.hypot(c.x-x,c.y-y)>2)this.setRunningVisitor(c,x,y,dt,defs[c.id].speed*1.5);else this.set(c,'watch-plane');return true;}}
 if(c.goal==='critter'&&!this.critter){c.goal=null;this.set(c,'sit',2);}
 if(this.critter?.target===c.id&&!c.sleeping&&!c.level&&!c.jump&&c.toiletNeed<100&&!this.interacting){const v=this.critter,ahead=v.direction>0?v.x>c.x+12:v.x<c.x-12;if(ahead){const x=clamp(v.x-v.direction*14,this.floorBounds.left+8,this.floorBounds.right-8),y=v.y;if(Math.hypot(c.x-x,c.y-y)>1)this.setRunningVisitor(c,x,y,dt,defs[c.id].speed*1.8,'chase-critter');c.goal='critter';}else if(c.state!=='watch-critter')this.set(c,'watch-critter');return true;}return false;
 }
 setRunningVisitor(c,x,y,dt,speed,state='walk'){if(c.state!==state)this.set(c,state);const distance=Math.hypot(x-c.x,y-c.y),step=Math.min(distance,speed*dt);if(distance<=0)return;c.facing=x<c.x?-1:1;c.x+=(x-c.x)/distance*step;c.y+=(y-c.y)/distance*step;}
 frightenBird(c,startleCat=false){if(!this.bird||this.bird.phase!=='perch')return false;this.bird.phase='startled';this.bird.age=0;this.bird.fright=true;if(startleCat){this.resolveInterruptedJump(c);this.selected=c.id;this.applyStatDelta({target:c,stat:'mood',requestedDelta:-2},{source:'BIRD_WATCH_STARTLE'});c.goal=null;c.windowIntent=null;this.set(c,'startled',.7);this.emit('jump',`${defs[c.id].name} 嚇了一跳，窗邊的小客人也趕快飛走了！`,c);}else this.emit('note',`${defs[c.id].name} 一靠近，窗邊的小客人就飛走了。`,c);if(this.bird.kind!=='butterfly')this.emit('chirp');return true;}
 assignBirdWatcher(){const b=this.bird;if(!b||b.watcher)return;const perched=!this.toy&&this.cats.find(c=>c.level===4&&!c.sleeping&&!c.jump&&c.anger<30);if(perched){b.watcher=perched.id;perched.birdSeen=b.id;perched.windowIntent='bird';return;}if(this.random()>=.7)return;const cats=this.cats.filter(c=>!c.sleeping&&!c.level&&!c.jump&&!c.goal&&c.energy>6&&c.anger<30&&c.toiletNeed<100&&['idle','sit','wander','walk','lounge'].includes(c.state));if(!cats.length)return;const c=cats[Math.floor(this.random()*cats.length)],perchOccupied=this.cats.some(other=>other.level===4||other.jump?.level===4);b.watcher=c.id;c.birdSeen=b.id;if(!perchOccupied&&this.random()<.55){c.windowIntent='bird';c.desiredLevel=4;this.climb(c,4);}else this.target(c,c.id==='lumi'?94:122,216,'bird');}
 assignPlaneWatcher(){const p=this.plane;if(!p||p.watcher)return;const cats=this.cats.filter(c=>!c.sleeping&&!c.level&&!c.jump&&!c.goal&&c.energy>6&&c.anger<30&&c.toiletNeed<100&&['idle','sit','wander','walk','lounge'].includes(c.state));if(!cats.length)return;const c=cats[Math.floor(this.random()*cats.length)],perchOccupied=this.cats.some(other=>other.level===4||other.jump?.level===4);p.watcher=c.id;if(!perchOccupied&&this.random()<.4){c.windowIntent='plane';c.desiredLevel=4;this.climb(c,4);}}
 updateBird(dt){
 if(this.isGoodnightMode){this.bird=null;return;}if(!this.bird){if(this.canSpawnExternalEvent('bird'))this.bird={phase:'arrive',age:0,id:this.time,direction:this.random()<.5?1:-1,variant:Math.floor(this.random()*3),kind:this.random()<.25?'butterfly':'bird'};return;}
 const b=this.bird;b.age+=dt;
 if(this.night&&b.phase!=='leave'){b.phase='leave';b.age=0;}
 if(b.phase==='arrive'&&b.age>=1.8){b.phase='perch';b.age=0;if(b.kind==='butterfly')this.emit('note','一隻蝴蝶輕輕停在窗邊。');else this.emit('chirp','窗邊來了一位小客人。');}
 else if(b.phase==='perch'){this.assignBirdWatcher();if(b.kind!=='butterfly'&&Math.floor(b.age/4)!==Math.floor((b.age-dt)/4))this.emit('chirp');if(b.age>=16){b.phase='leave';b.age=0;}}
 else if(b.phase==='startled'&&b.age>=.3){b.phase='leave';b.age=0;}
 else if(b.phase==='leave'&&b.age>=(b.fright?.8:1.6)){this.bird=null;this.nextBird=this.time+20+this.random()*20;}
 }
 socialReady(){return !this.wolf&&!this.critter&&!this.plane&&!this.bird&&!this.close&&!this.food&&!this.toy&&!this.cats.some(c=>c.yarnUntil>this.time)&&this.cats.every(c=>!c.sleeping&&!c.level&&!c.jump&&c.energy>=6&&c.sleepiness<70&&c.anger<10&&['idle','sit','wander','walk','lounge'].includes(c.state)&&(!c.goal||c.goal==='wander'));}
 startSocial(){if(!this.socialReady())return false;const kind=this.random()<.55?'rub':'knead',kneader=this.random()<.75?'lumi':'hoya';this.social={kind,kneader,phase:'approach',age:0};this.cats.forEach((c,i)=>{this.target(c,124+i*34,268,'social');});return true;}
 endSocial(){if(!this.social)return;this.social=null;this.nextSocial=this.time+45+this.random()*45;for(const c of this.cats){c.goal=null;this.set(c,'sit',3);}}
 updateSocial(dt){
 if(!this.social){if(this.time>=(this.nextSocial??25)){if(!this.startSocial())this.nextSocial=this.time+3;}return;}
 const s=this.social;s.age+=dt;
 if(this.close||this.critter||this.food||this.toy||this.cats.some(c=>c.energy<6||c.sleepiness>=70||c.anger>=10)){this.endSocial();return;}
 if(s.phase==='approach'){
 for(const c of this.cats)if(Math.hypot(c.tx-c.x,c.ty-c.y)>1)this.move(c,dt,defs[c.id].speed);
 if(this.cats.every(c=>Math.hypot(c.tx-c.x,c.ty-c.y)<=1)){s.phase='active';s.age=0;this.cats.forEach((c,i)=>{c.facing=i===0?1:-1;this.set(c,s.kind==='rub'?'rub':c.id===s.kneader?'knead':'social-rest');});this.emit('purr',s.kind==='rub'?'碰個頭，再蹭一下。牠們也很喜歡彼此。':`${defs[s.kneader].name} 在同伴身旁踩踩軟墊，呼嚕嚕…`);}
 else if(s.age>12)this.endSocial();return;
 }
 if(Math.floor(s.age/2.5)!==Math.floor((s.age-dt)/2.5))this.emit('purr');
 if(s.age>8){this.applyStatChanges(this.cats.map(c=>({target:c,stat:'mood',requestedDelta:4})),{source:'CAT_SOCIAL_COMPLETE'});this.endSocial();}
 }
 emit(type,text,c){if(type==='meow'&&c)c.meowUntil=this.time+1.2;this.events.push({type,text,id:c?.id});}
 set(c,state,timer=0){c.state=state;c.timer=timer;c.age=0;}
 rejectPet(reason,kind='fast'){const c=this.cats.find(c=>c.id===this.close);if(!c||c.state==='bite-warning')return;const sensitive=kind==='sensitive';this.applyStatDelta({target:c,stat:'mood',requestedDelta:-2},{source:sensitive?'PET_SENSITIVE_AREA':'PET_FAST_SWIPE'});c.anger=clamp(c.anger+(sensitive?defs[c.id].sensitiveAnger:defs[c.id].fastAnger));c.petBlockedUntil=Date.now()+60000;c.petGlow=0;this.set(c,'bite-warning',.65);this.emit('angry',`${defs[c.id].name} ${reason}，張嘴警告！先讓牠休息一分鐘。`,c);}
 nap(c){c.sleeping=true;c.interrupts=0;c.napUntil=this.time+20+this.random()*20;c.goal=null;this.set(c,'sleep');}
 target(c,x,y,goal){if(c.level){c.resume={x,y,goal};this.jumpTo(c,0);return;}c.tx=clamp(x,this.floorBounds.left,this.floorBounds.right);c.ty=clamp(y,205,this.floorBounds.bottom);c.goal=goal;this.set(c,goal==='close'?'come-to-player':'walk');}
 platformAt(x,y){return [...platforms].reverse().find(p=>Math.abs(x-p.x)<=(p.halfWidth||22)&&y>=p.y-p.z-22&&y<=p.y-p.z+7);}
 toyAt(x,y){const p=this.platformAt(x,y);if(p)return {x:p.x,y:p.y,z:p.z,level:p.level,drawX:x,drawY:y};if(x<this.floorBounds.left||x>this.floorBounds.right||y<20||y>this.floorBounds.bottom)return null;if(y<205)return {x,y:230,level:0,drawX:x,drawY:y};return {x,y,level:0};}
 available(level,c){return !this.cats.some(other=>other!==c&&(other.level===level||other.jump?.level===level));}
 climb(c,level){c.desiredLevel=level;const entry=level===4?windowJumpPoint:level===3?platforms.find(p=>p.level===3):platforms[0];c.climbEntryLevel=level===4?4:level===3?3:1;this.target(c,entry.x,entry.y,'climb');}
 jumpTo(c,level){if(level&&!this.available(level,c))return false;const p=level===4?{...(c.id==='lumi'?windowPerchLeft:windowPerchRight),level:4}:level===0&&c.level===4?{...windowJumpPoint,z:0,level:0}:platforms.find(p=>p.level===level)||{x:82,y:281,z:0};c.jump={level,x:c.x,y:c.y,z:c.z||0,to:p,duration:c.id==='hoya'?.62:.82};c.goal=null;this.set(c,'jump');this.emit('jump',null,c);return true;}
 resolveInterruptedJump(c){if(!c?.jump)return false;const j=c.jump,useDestination=clamp(c.age/j.duration,0,1)>=.5;if(useDestination){c.level=j.level;c.x=j.to.x;c.y=j.to.y;c.z=j.to.z;}else{c.x=j.x;c.y=j.y;c.z=j.z;c.level=platforms.some(p=>p.level===c.level)?c.level:0;}c.jump=null;c.lift=0;this.stabilizeSurface(c);return true;}
 stabilizeSurface(c){if(c.jump||c.state==='startled')return;const floorTop=this.wolf?190:205,p=platforms.find(p=>p.level===c.level);if(p){const half=p.halfWidth||22;if(Math.abs(c.x-p.x)>half+2){c.y=clamp(c.y-p.z,floorTop,this.floorBounds.bottom);c.level=0;c.z=0;}else{c.x=clamp(c.x,p.x-half,p.x+half);c.y=p.y;c.z=p.z;}}else{c.level=0;c.z=0;c.y=clamp(Number.isFinite(c.y)?c.y:245,floorTop,this.floorBounds.bottom);}c.lift=0;}
 updateJump(c,dt){const j=c.jump,p=clamp(c.age/j.duration,0,1);c.x=j.x+(j.to.x-j.x)*p;c.y=j.y+(j.to.y-j.y)*p;c.z=j.z+(j.to.z-j.z)*p;c.lift=Math.sin(Math.PI*p)*24;c.facing=j.to.x>=j.x?1:-1;if(p===1){c.level=j.level;c.z=j.to.z;c.lift=0;c.jump=null;this.set(c,'land',.25);this.emit('land',null,c);if(j.level===3){const guided=this.toy?.level===3;this.maybeKnockByCat(c,'lamp',guided?.5:c.mischiefObject==='lamp'?.35:.2);delete c.mischiefObject;}}}
 call(id=this.selected){const c=this.cats.find(c=>c.id===id);if(!c||this.close||this.wolf)return;if(c.petBlockedUntil>Date.now()){this.emit('note',`${defs[id].name} 還想自己待著，再等 ${Math.ceil((c.petBlockedUntil-Date.now())/1000)} 秒。`,c);return;}this.toy=null;this.endSocial();this.selected=id;if(c.jump||c.state==='land'||c.state==='startled'){c.pendingCall=true;return;}if(c.sleeping){c.interrupts++;if(c.interrupts===1){this.set(c,'sleep',1);this.emit('meow',`${defs[id].name} 耳朵動了動…讓牠再睡一下。`,c);}else if(c.interrupts===2){c.anger=clamp(c.anger+defs[id].sleepAnger2);this.set(c,'annoyed',2);this.emit('angry',id==='lumi'?'Lumi 縮起身子：還想睡嘛…':'Hoya 甩了甩尾巴：別吵啦。',c);}else{c.anger=clamp(c.anger+defs[id].sleepAnger3);this.applyStatChanges([{target:c,stat:'mood',requestedDelta:-2},{target:c,stat:'bond',requestedDelta:-2}],{source:'SLEEP_INTERRUPT_THIRD'});c.sleeping=false;this.set(c,'angry',2);this.emit('angry',`${defs[id].name} 生氣了，先給牠一點空間。`,c);}return;}
 if(c.anger>30||['angry','annoyed'].includes(c.state)){this.emit('angry',`${defs[id].name} 現在想自己待一會。`,c);return;}
 if(this.cats.some(v=>v.state==='turn-look'||v.state==='come-to-player'))return;
 this.toy=null;for(const other of this.cats){if(other.goal==='food'||other.state==='eat'){other.goal=null;this.set(other,'sit',2);}}this.set(c,'turn-look',.8);this.emit('meow',`${defs[id].name} 注意到你了。`,c);}
 leave(){if(this.close){const c=this.cats.find(c=>c.id===this.close);this.set(c,'sit',3);this.close=null;}}
 dropFood(x,y){if(this.interacting||this.foods.length>=2||this.platformAt(x,y)||x<this.floorBounds.left||x>this.floorBounds.right||y<205||y>this.floorBounds.bottom)return false;if(this.cats.every(c=>c.hunger>=20)){this.foods=[];for(const c of this.cats)c.foodId=null;this.emit('note','Lumi 和 Hoya 現在都不餓。');return false;}if(this.foods.some(b=>Math.hypot(x-b.x,y-b.y)<28)){this.emit('note','另一盤放遠一點，讓牠們有空間吃。');return false;}if(this.coins<5){this.emit('note','金幣不足，陪伴可以獲得金幣。');return false;}this.coins-=5;this.foods.push({id:++this.foodSerial,x,y,left:30});this.emit('note','香香的晚餐，等醒著的貓自己過來。');return true;}
 pet(distance,speed){const c=this.cats.find(c=>c.id===this.close);if(!c||distance<1)return false;if(['bite-warning','pet-satisfied'].includes(c.state))return false;if(speed>430){this.rejectPet('覺得你摸得太快了','fast');return false;}c.petGlow=1.2;c.petTotal+=distance;c.petSession=(c.petSession||0)+distance;this.set(c,'pet-happy',1.2);const milestone=24/defs[c.id].pat;if(c.petTotal>=milestone){c.petTotal=0;this.emit('purr','呼嚕嚕…就是這裡。',c);if((c.petMoodRewards||0)<2){c.petMoodRewards=(c.petMoodRewards||0)+1;this.applyStatDelta({target:c,stat:'mood',requestedDelta:2},{source:'PET_GENTLE_STROKE'});}if(this.time-c.rewardAt>8){this.coins+=2;c.rewardAt=this.time;this.emit('coin',null,c);}}if(((c.petMoodRewards||0)>=2&&c.petSession>=180)||c.petSession>=700){this.finishPet(c);return true;}return c.petTotal===0;}
 advanceTime(seconds,offline=false){if(!Number.isFinite(seconds)||seconds<=0)return;const toiletSteps=[];for(const c of this.cats){const delayBefore=Math.max(0,c.toiletDelayRemaining||0);c.toiletDelayRemaining=Math.max(0,delayBefore-seconds);const b=c.timeBuckets||(c.timeBuckets=freshBuckets()),prefix=offline?'offline':'active',intervals=offline?{Hunger:3600,Mood:5400,Energy:7200}:{Hunger:120,Mood:180,Energy:240},floor=offline?8:0;for(const stat of ['Hunger','Mood','Energy']){if(stat==='Energy'&&c.sleeping)continue;const key=prefix+stat;b[key]=(b[key]||0)+seconds;const steps=Math.floor(b[key]/intervals[stat]);if(steps){b[key]-=steps*intervals[stat];this.passiveDelta(c,stat.toLowerCase(),-steps*2,floor);}}if(c.sleeping){b.sleepEnergy=(b.sleepEnergy||0)+seconds;const steps=Math.floor(b.sleepEnergy/20);if(steps){b.sleepEnergy-=steps*20;this.passiveDelta(c,'energy',steps*2,0);}}b.toilet=(b.toilet||0)+seconds;const needs=Math.floor(b.toilet/900);if(needs)b.toilet-=needs*900;toiletSteps.push({c,needs,blocked:delayBefore>seconds});if(!offline){b.naturalPoop=(b.naturalPoop||0)+seconds;while(b.naturalPoop>=300){b.naturalPoop-=300;if(c.poopQueue===0&&!c.queuedToilet&&this.random()<.08)c.toiletNeed=100;}}b.anger=(b.anger||0)+seconds;const angerSteps=Math.floor(b.anger/10);if(angerSteps){b.anger-=angerSteps*10;c.anger=clamp(c.anger-angerSteps);}}
 const waterBucket=this.cats[0].timeBuckets,waterKey=offline?'offlineWater':'activeWater',waterInterval=offline?10800:30;waterBucket[waterKey]=(waterBucket[waterKey]||0)+seconds;const waterSteps=Math.floor(waterBucket[waterKey]/waterInterval);if(waterSteps){waterBucket[waterKey]-=waterSteps*waterInterval;if(offline)this.passiveDelta(this,'water',-waterSteps,6);else this.applyStatDelta({target:'shared',stat:'water',requestedDelta:-waterSteps},{source:'WATER_LEVEL'});}this.advancePoopTimers(seconds,offline);
 if(offline){const rounds=Math.max(0,...toiletSteps.map(v=>v.needs));for(let i=0;i<rounds;i++)for(const entry of toiletSteps)if(i<entry.needs){entry.c.toiletNeed=clamp(entry.c.toiletNeed+1);if(!entry.blocked&&entry.c.toiletNeed>=100&&this.poops<8){entry.c.toiletNeed-=100;this.poops++;}else if(this.poops>=8&&entry.c.toiletNeed>=100)entry.c.toiletNeed=100;}for(const entry of toiletSteps)if(!entry.blocked&&entry.c.toiletNeed>=100&&this.poops<8){entry.c.toiletNeed-=100;this.poops++;}}else for(const entry of toiletSteps)if(entry.needs)entry.c.toiletNeed=clamp(entry.c.toiletNeed+entry.needs);}
 update(dt,hour=new Date().getHours(),elapsedSeconds=dt){
 this.advanceTime(elapsedSeconds,false);this.time+=dt;this.outdoorNight=hour>=18||hour<6;
 this.updateVisitors(dt);
 this.updateCritter(dt);
 this.updateMosquito(dt);
 if(!this.outdoorNight||this.isGoodnightMode)this.meteor=null;
 else if(this.meteor){this.meteor.age+=dt;if(this.meteor.age>=.75)this.meteor=null;}
 else if(this.canSpawnExternalEvent('meteor')){this.nextMeteor=this.time+90+this.random()*150;if(this.random()<.45)this.meteor={age:0,x:40+this.random()*25,y:44+this.random()*12};}
 this.updateMischief();
 this.updateYarnPlay();
 if(!this.wolf)this.updateBird(dt);
 this.updateSocial(dt);
 this.assignMeals();
 for(const c of this.cats){const d=defs[c.id];c.age+=dt;c.timer-=dt;c.petGlow=Math.max(0,c.petGlow-dt);c.sleepiness=clamp(c.sleepiness+dt*(c.sleeping?-1.1:.04));this.stabilizeSurface(c);
 if(!c.sleeping&&!this.social&&!this.close&&c.anger<10&&this.time>=(c.nextMeow??(c.id==='lumi'?12:20))){c.nextMeow=this.time+35+this.random()*45;this.emit('meow',null,c);}if(this.social)continue;
 if(c.state==='startled'){c.lift=Math.sin(Math.min(1,c.age/.7)*Math.PI)*18;if(c.timer<=0){c.lift=0;this.set(c,'land',.25);this.emit('land',null,c);}continue;}
 if(c.jump){this.updateJump(c,dt);continue;}
 if(this.visitorCat(c,dt))continue;
 if(c.toiletNeed>=100&&this.toilet(c,dt))continue;
 if(c.state==='land'){if(c.timer>0)continue;this.set(c,'sit',d.rest);if(c.pendingCall){c.pendingCall=false;c.resume=null;this.call(c.id);continue;}if(c.resume){const r=c.resume;c.resume=null;this.target(c,r.x,r.y,r.goal);continue;}}
 if(this.close===c.id){if(c.state==='pet-satisfied'&&c.timer<=0){this.close=null;this.target(c,c.id==='lumi'?104:202,245,'rest-play');continue;}if(c.state==='bite-warning'&&c.timer<=0){this.close=null;this.target(c,c.id==='lumi'?99:209,245,'retreat');continue;}if(c.state==='pet-happy'&&c.timer<=0)this.set(c,'sit');continue;}
 // Threats, jumps and urgent toilet finish first; the active wand owns both cats before sleep/food/idle.
 if(this.toy){c.yarnUntil=0;const offset=c.id==='lumi'?-6:6;this.chase(c,dt,{...this.toy,x:this.toy.x+offset});continue;}
 if(c.goal==='toy'&&['walk','play'].includes(c.state)&&!this.toy&&!(c.yarnUntil>this.time)){c.goal=null;this.set(c,'sit',2);}
 if(c.sleeping){if(c.state==='annoyed'&&c.timer<=0)this.set(c,'sleep');if(!this.night&&c.energy>=8&&((c.napUntil&&this.time>=c.napUntil)||c.sleepiness<5)){c.sleeping=false;c.napUntil=0;c.interrupts=0;this.set(c,'sit',3);}continue;}
 if(c.state==='angry'){if(c.timer<=0)this.target(c,c.id==='lumi'?33:207,242,'retreat');continue;}
 if(c.state==='turn-look'){if(c.timer<=0)this.target(c,120,291,'close');continue;}
 if(c.state==='come-to-player'){this.move(c,dt,d.speed);continue;}
 if(c.goal==='rest-play'&&c.state==='walk'){this.move(c,dt,d.speed);continue;}
 if(c.goal==='retreat'&&c.state==='walk'){this.move(c,dt,d.speed*2.3);continue;}
 if(c.anger>30){if(c.state==='walk')this.move(c,dt,d.speed);else if(c.timer<=0)this.set(c,'annoyed',2);continue;}
 if(!this.toy&&c.yarnUntil>this.time&&c.energy>2&&!(c.playRestUntil>Date.now())){this.chase(c,dt,{x:this.yarn.x-10,y:this.yarn.y,level:0});continue;}
 if(this.toilet(c,dt))continue;if(this.feed(c,dt))continue;if(c.state==='eat'){this.set(c,'sit',2);c.goal=null;}
 if(c.level===4){
 if(this.isGoodnightMode){const wasSleeping=c.sleeping;c.sleeping=false;c.windowIntent=null;c.desiredLevel=0;if(wasSleeping)c.resume={x:c.id==='lumi'?112:192,y:217,goal:'bed'};if(!c.jump)this.jumpTo(c,0);continue;}
 if(this.bird?.phase==='perch'&&!this.toy&&(this.bird.watcher===c.id||!this.bird.watcher)){this.bird.watcher=c.id;c.windowIntent='bird';if(c.state!=='watch-bird')this.set(c,'watch-bird',2);continue;}
 if(this.plane&&!this.toy&&(this.plane.watcher===c.id||!this.plane.watcher)){this.plane.watcher=c.id;c.windowIntent='plane';if(c.state!=='watch-plane')this.set(c,'watch-plane',2);continue;}
 if(c.windowIntent==='bird'&&this.bird?.phase==='perch'){if(c.state!=='watch-bird')this.set(c,'watch-bird',2);continue;}
 if(c.windowIntent==='plane'&&this.plane){if(c.state!=='watch-plane')this.set(c,'watch-plane',2);continue;}
 if(c.state==='play'||c.state==='walk')this.set(c,'sit',2);
 if(c.timer<=0){if(!c.windowIntent&&c.energy<18&&c.sleepiness>35&&this.random()<.28)this.nap(c);else{c.windowIntent=null;c.desiredLevel=0;this.jumpTo(c,0);}}continue;
 }
 if(c.level){
 if(c.energy<6||c.sleepiness>80){this.target(c,c.id==='lumi'?112:192,217,'bed');continue;}
 const desired=c.desiredLevel||c.level;
 if(desired!==c.level&&desired>0){if(this.jumpTo(c,desired))continue;}
 if(c.state==='play')this.set(c,'sit',d.rest+4);
 if(c.timer<=0){if(c.state!=='lounge'&&this.random()<.55){this.set(c,'lounge',8+this.random()*8);}else if(this.random()<.35){this.nap(c);}else{c.desiredLevel=0;this.jumpTo(c,0);}}continue;
 }
 if((c.energy<6||c.sleepiness>80)&&c.goal!=='bed'){if(this.toy&&c.energy>6){}else{this.target(c,c.id==='lumi'?112:192,217,'bed');}}
 if(c.goal==='bed'&&c.state==='walk'){this.move(c,dt,d.speed);continue;}
 if(c.state==='play'||c.goal==='toy'){c.goal=null;this.set(c,'sit',2);}
 if(c.state==='watch-bird'||c.goal==='bird'){
 if(!this.bird||this.bird.phase!=='perch'||this.toy){c.goal=null;this.set(c,'sit',2);}
 else{if(c.goal==='bird'){this.move(c,dt,d.speed*1.4);if(Math.hypot(c.x-c.tx,c.y-c.ty)<=1){c.facing=-1;this.set(c,'watch-bird');}}continue;}
 }
 if(this.drink(c,dt))continue;
 if(c.state==='walk'){this.move(c,dt,d.speed);continue;}
 if(c.state==='wander'){if(c.timer<=0)this.set(c,'walk');continue;}
 if(c.state==='lounge'){if(c.timer<=0){if(this.random()<.4)this.nap(c);else this.set(c,'sit',3);}continue;}
 if(c.timer<=0){if(c.energy>6&&this.random()<.24&&this.available(1,c)){const choice=this.random();this.climb(c,choice<.08&&this.available(4,c)?4:choice<.25?3:choice<.62?1:2);}else if(this.random()<.18){this.target(c,95+this.random()*100,239+this.random()*47,'lounge');}else if(this.random()<.35){this.set(c,this.random()<.5?'sit':'idle',d.rest+this.random()*3);}else{this.set(c,'wander',.45);c.tx=30+this.random()*180;c.ty=228+this.random()*59;c.goal='wander';}}
 }
 }
 drink(c,dt){
 if(this.water<=0||this.toy||this.interacting){if(c.goal==='water'||c.state==='drink'){c.goal=null;this.set(c,'sit',2);}return false;}
 if(c.goal!=='water'&&c.state!=='drink'){
  if(this.time<(c.nextDrink??(c.id==='lumi'?25:45))||c.level||c.sleeping||c.energy<6||c.goal||!['idle','sit','wander'].includes(c.state)||this.cats.some(v=>v!==c&&(v.goal==='water'||v.state==='drink')))return false;
  c.goal='water';
 }
 const f=this.fountain,x=f.x+29,y=f.y+4;
 if(Math.hypot(c.x-x,c.y-y)>1){let tx=x,ty=y;if(c.y<278){tx=70;ty=282;}c.tx=tx;c.ty=ty;if(c.state!=='walk')this.set(c,'walk');this.move(c,dt,defs[c.id].speed);c.goal='water';return true;}
 c.facing=-1;if(c.state!=='drink'){this.set(c,'drink',6);c.goal='water';this.emit('drink',defs[c.id].name+' 正在舔水，咕嚕咕嚕。',c);}
 if(c.timer<=0){this.applyStatDelta({target:'shared',stat:'water',requestedDelta:-1},{source:'CAT_DRINK'});c.nextDrink=this.time+45+this.random()*30;c.goal=null;this.target(c,75,282,'wander');}return true;
 }
 move(c,dt,speed){const dx=c.tx-c.x,dy=c.ty-c.y,dist=Math.hypot(dx,dy);if(dist>1){const step=Math.min(dist,speed*dt);c.x+=dx/dist*step;c.y+=dy/dist*step;if(Math.abs(dx)>1)c.facing=dx>0?1:-1;}if(dist<=Math.max(1,speed*dt)){c.x=c.tx;c.y=c.ty;const goal=c.goal;c.goal=null;if(goal==='close'){this.close=c.id;c.petSession=0;c.petMoodRewards=0;c.petTotal=0;this.selected=c.id;this.set(c,'sit');this.emit('note','用手指慢慢滑過額頭和身體。',c);}else if(goal==='rest-play'){this.set(c,'lounge',10);}else if(goal==='lounge'){this.set(c,'lounge',8+this.random()*8);}else if(goal==='bed'){c.napUntil=0;c.sleeping=true;c.interrupts=0;this.set(c,'sleep');}else if(goal==='climb'){const entry=c.climbEntryLevel||1;delete c.climbEntryLevel;if(!this.jumpTo(c,entry))this.set(c,'sit',2);}else if(goal==='mischief-plant'){this.maybeKnockByCat(c,'plant',.5);this.set(c,'sit',2);}else if(goal==='food')this.set(c,'eat');else this.set(c,'sit',defs[c.id].rest);}}
 beginLitterCleaning(){if(this.interacting||this.cats.some(c=>c.state==='toilet')){this.emit('note','等牠上完廁所再清喔。');return null;}if(!this.poops){this.emit('note','貓砂盆目前很乾淨。');return null;}return {initial:this.poops,required:this.poops,progress:0};}
 scoopLitter(session){if(!session||session.progress>=session.required||this.poops<=0)return false;const beforeClean=this.cleanliness,beforeScore=this.careScore();session.progress++;this.poops--;const cleanDelta=this.cleanliness-beforeClean;this.emitStatFeedback([{id:'shared',stat:'cleanliness',delta:cleanDelta}],beforeScore,this.careScore(),'PLAYER_SCOOP_LITTER');this.emit('scoop',`鏟掉一坨，剩下 ${this.poops} 坨。`);for(const c of this.cats)if(c.state==='litter-wait'){c.goal=null;c.toiletCommitted=false;this.set(c,'sit',0);}if(!this.poops)this.emit('note','沙沙沙…貓砂盆乾淨了 ♥');return true;}
 toilet(c,dt){if(c.toiletNeed<100){c.toiletCommitted=false;return false;}if((c.toiletDelayRemaining||0)>0&&!c.mealToiletWasUrgent)return false;if(c.mealCareStart!=null&&!c.mealToiletWasUrgent)return false;if(this.interacting)return false;if(c.sleeping){c.sleeping=false;c.napUntil=0;this.set(c,'sit',0);}c.toiletCommitted=true;if(this.poops>=8){const x=c.id==='lumi'?208:226,y=this.litter.y-18;if(Math.hypot(c.x-x,c.y-y)>2){this.setRunningVisitor(c,x,y,dt,defs[c.id].speed);c.goal='litter-wait';}else if(c.state!=='litter-wait')this.set(c,'litter-wait');return true;}if(c.level){this.target(c,this.litter.x,this.litter.y,'toilet');return true;}if(this.cats.some(v=>v!==c&&v.state==='toilet'))return true;if(Math.hypot(c.x-this.litter.x,c.y-this.litter.y)>2){this.setRunningVisitor(c,this.litter.x,this.litter.y,dt,defs[c.id].speed);return true;}if(c.state!=='toilet'){this.set(c,'toilet',3);this.emit('note',defs[c.id].name+' 想上廁所，跑去貓砂盆。');}if(c.timer<=0){c.toiletNeed=clamp(c.toiletNeed-100);c.toiletCommitted=false;this.poops=Math.min(8,this.poops+1);if(c.queuedToilet){c.queuedToilet=false;c.poopQueue=Math.max(0,c.poopQueue-1);if(c.poopQueue>0)this.schedulePoop(c);}this.target(c,198,266,'wander');}return true;}
 snapshot(){const cats={};for(const c of this.cats){cats[c.id]={toiletNeed:Math.round(c.toiletNeed),poopQueue:Math.max(0,Math.floor(c.poopQueue||0)),poopTimer:Math.max(0,c.poopTimer||0),queuedToilet:!!c.queuedToilet,timeBuckets:{...c.timeBuckets},sleeping:c.sleeping,interrupts:c.interrupts,petBlockedUntil:c.petBlockedUntil||0,companionDay:c.companionDay||'',playPhase:c.playPhase||null,playRestUntil:c.playRestUntil||0,playEffectiveSeconds:c.playEffectiveSeconds||0,playWarmup:c.playWarmup||0,playTiredSeconds:c.playTiredSeconds||0,playEnergyAwards:c.playEnergyAwards||0,playMoodAwarded:!!c.playMoodAwarded,mealHungerGain:c.mealHungerGain||0,mealCareStart:Number.isFinite(c.mealCareStart)?Math.round(c.mealCareStart):null,mealToiletWasUrgent:!!c.mealToiletWasUrgent,toiletDelayRemaining:Math.round(c.toiletDelayRemaining||0),foodAccumulator:c.foodAccumulator||0,toiletFoodAccumulator:c.toiletFoodAccumulator||0};for(const key of formalStats)cats[c.id][key]=Math.round(c[key]);cats[c.id].sleepiness=c.sleepiness;cats[c.id].anger=Math.round(c.anger);}return {version:5,activeWaterInterval:30,poops:this.poops,plantKnocked:this.plantKnocked,lampKnocked:this.lampKnocked,lastThreat:this.lastThreat,water:Math.round(this.water),savedAt:Date.now(),foods:this.foods.map(b=>({...b})),isGoodnightMode:this.isGoodnightMode,manualNight:this.isGoodnightMode,nightRewardDay:this.nightRewardDay||'',lightsOffAt:this.lightsOffAt||0,selected:this.selected,coins:this.coins,cats};}
}
root.CatRoom={World,defs,clamp,platforms,APP_VERSION,getCleanlinessFromPoops,THREAT_EFFECTS,windowApproachPoint,windowJumpPoint,windowPerchLeft,windowPerchRight};if(typeof module!=='undefined')module.exports=root.CatRoom;
})(typeof window==='undefined'?globalThis:window);
