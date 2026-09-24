/* Optional, visual-only room details. Never writes simulation or save state. */
(function(root){
'use strict';
const flowers=[['小雛菊','#f9edc4','今天也有小小的好事，慢慢找就好。'],['勿忘我','#8bbcd0','有你回來，房間就暖了一點。'],['鬱金香','#df9b98','不趕時間，陪牠們坐一下。'],['波斯菊','#cb9cae','今天的花，替你留了一個位置。'],['幸運草','#96b18b','小小的幸運，是兩隻貓都在身邊。'],['薰衣草','#a69bbd','把忙碌留在門外，休息一下吧。']];
function dayIndex(date){return Math.floor(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate())/86400000);}
class LittleWonders{
 constructor(random=Math.random){this.random=random;this.cats=new Map();this.nextWindow=8;this.windowAge=-1;this.sparkUntil=0;}
 bouquet(date=new Date()){return flowers[((dayIndex(date)%flowers.length)+flowers.length)%flowers.length];}
 quiet(w){return !w.storm&&!w.wolf&&!w.isGoodnightMode&&!w.close&&!w.rewardFood;}
 update(w,dt){
  const quiet=this.quiet(w);
  if(!quiet)this.windowAge=-1;
  else if(this.windowAge>=0){this.windowAge+=dt;if(this.windowAge>22){this.windowAge=-1;this.nextWindow=w.time+85+this.random()*55;}}
  else if(w.time>=this.nextWindow){this.windowAge=0;this.nextWindow=w.time+85+this.random()*55;}
  for(const c of w.cats){
   let v=this.cats.get(c.id);if(!v){v={next:w.time+12+this.random()*18,age:-1};this.cats.set(c.id,v);}
   const eligible=quiet&&!w.toy&&!w.social&&!w.critter&&!w.mosquito&&!c.sleeping&&!c.goal&&!c.jump&&!c.pendingRewardFood&&c.anger<15&&['idle','sit'].includes(c.state);
   if(!eligible){if(v.age>=0)v.next=w.time+25+this.random()*30;v.age=-1;continue;}
   if(v.age>=0){v.age+=dt;if(v.age>=3.6){v.age=-1;v.next=w.time+35+this.random()*40;}}
   else if(w.time>=v.next)v.age=0;
  }
 }
 grooming(c){return this.cats.get(c.id)?.age??-1;}
 inspect(w,x,y,date=new Date()){
  if(!this.quiet(w)||w.toy||x<174||x>194||y<39||y>65)return null;
  this.sparkUntil=w.time+2;const [name,,message]=this.bouquet(date);return `今日窗邊小花 · ${name}｜${message}`;
 }
 drawWindow(g,w){
  if(!this.quiet(w)||this.windowAge<0)return;
  const t=this.windowAge,fade=Math.min(1,t/2,(22-t)/3);
  g.save();g.beginPath();g.rect(20,29,94,113);g.clip();
  for(let i=0;i<5;i++){
   const x=w.outdoorNight?35+i*16+Math.sin(t*.45+i)*7:129-t*6+i*11;
   const y=w.outdoorNight?105+Math.sin(t*.7+i*2)*17:57+i*12+Math.sin(t*.6+i)*4;
   g.globalAlpha=fade*(w.outdoorNight?.35+.65*(.5+.5*Math.sin(t*2+i*1.7)): .8);
   if(w.outdoorNight){g.fillStyle='#e4e7a533';g.beginPath();g.ellipse(x,y,4,4,0,0,Math.PI*2);g.fill();g.fillStyle='#f8edb0';g.fillRect(Math.round(x),Math.round(y),2,2);}
   else{g.strokeStyle='#fff9e7';g.lineWidth=1;g.beginPath();g.moveTo(x,y+5);g.lineTo(x,y);g.lineTo(x-3,y-2);g.moveTo(x,y);g.lineTo(x+3,y-2);g.moveTo(x,y);g.lineTo(x,y-3);g.stroke();g.fillStyle='#b29b73';g.fillRect(Math.round(x),Math.round(y+4),1,2);}
  }g.restore();
 }
 drawBouquet(g,w,date=new Date()){
  const [,color]=this.bouquet(date),kind=((dayIndex(date)%6)+6)%6;
  g.save();g.fillStyle='#ad9b8160';g.fillRect(179,59,12,2);g.strokeStyle='#7f9878';g.lineWidth=1;
  for(let i=0;i<3;i++){const x=180+i*4,y=47+(i===1?-4:0);g.beginPath();g.moveTo(185,57);g.lineTo(x,y);g.stroke();g.fillStyle='#9eaf87';g.fillRect(x+(i===0?1:-3),y+5,3,2);g.fillStyle=color;
   if(kind===2){g.fillRect(x-2,y-3,5,5);g.fillRect(x-1,y+2,3,1);}
   else if(kind===5){for(let j=0;j<4;j++)g.fillRect(x-1+j%2,y-j*2,3,2);}
   else{for(const [dx,dy]of [[-3,0],[3,0],[0,-3],[0,3]]){g.beginPath();g.ellipse(x+dx,y+dy,2,2,0,0,Math.PI*2);g.fill();}g.fillStyle=kind===4?'#c8d69c':'#e7bb68';g.fillRect(x-1,y-1,2,2);}
  }
  g.fillStyle='#abc1b6';g.fillRect(181,53,8,6);g.fillStyle='#dce3cd';g.fillRect(182,53,2,5);g.fillStyle='#8eaa9f';g.fillRect(182,59,6,1);
  if(w.time<this.sparkUntil||w.time%18<2){g.globalAlpha=.65;g.fillStyle='#e6c78e';g.fillRect(194,43,1,5);g.fillRect(192,45,5,1);}g.restore();
 }
 drawPaw(g,c,p){const age=this.grooming(c);if(age<0)return;
  const side=(c.id==='lumi'?-1:1)*(age<1.8?1:-1),phase=(age%1.8)/1.8;
  let x,y;
  if(phase<.3){const lift=Math.min(1,phase/.22);x=side*(8-5*lift);y=-17-6*lift;g.fillStyle='#d9808b';g.fillRect(side*2-1,-22,3,4);}
  else if(phase<.88){const stroke=(phase-.3)/.58,ease=.5-Math.cos(stroke*Math.PI)*.5;
   x=side*(14-11*ease+3*Math.sin(stroke*Math.PI));y=-28-14*ease-3*Math.sin(stroke*Math.PI);
  }else{const down=(phase-.88)/.12;x=side*(3+6*down);y=-42+25*down;}
  g.strokeStyle=p.shade;g.lineWidth=5;g.beginPath();g.moveTo(side*7,-14);g.quadraticCurveTo(side*14,-21,x,y);g.stroke();
  g.fillStyle=p.light;g.beginPath();g.ellipse(x,y,4,3,side*.35,0,Math.PI*2);g.fill();
 }
}
root.LittleWonders=LittleWonders;
if(typeof module!=='undefined')module.exports={LittleWonders,dayIndex};
})(typeof window!=='undefined'?window:globalThis);
