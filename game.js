/* Canvas artwork is drawn locally; no photos, fonts, libraries or network assets. */
(()=>{
'use strict';
const {World,defs,clamp,platforms}=CatRoom,$=id=>document.getElementById(id),canvas=$('room'),g=canvas.getContext('2d'),VIEW_W=320,VIEW_CENTER=160;
const bgmMedia=$('bgm-media');
let saved;try{saved=JSON.parse(localStorage.getItem('lumi-hoya-room-v1'));}catch{}const world=new World(saved);
let started=false,last=0,elapsed=0,zoom=1,focus={x:120,y:160},drag=null,stroke=null,noteUntil=0,lastHud=0,lastSave=0,music=false,audio=null,bgmClock=0,bgmStep=0,particles=[],pointerId=null;
const hapticTimes={};let lastPurr=-1,lastBell=-1;
function haptic(kind,pattern,interval=.3){if(document.hidden||elapsed-(hapticTimes[kind]??-1)<interval)return;hapticTimes[kind]=elapsed;let vibrated=false;try{vibrated=!!navigator.vibrate?.(pattern);}catch{}if(!vibrated&&document.body?.classList){document.body.classList.remove('visual-haptic');void document.body.offsetWidth;document.body.classList.add('visual-haptic');setTimeout(()=>document.body.classList.remove('visual-haptic'),120);}}
let awaySince=null;let audioPaused=false;const voices=new Set();
let knowledge=null,knowledgeIndex=0,knowledgeExpanded=false,lastKnowledgeCycle=0;const pendingKnowledge=[],knowledgeTriggerAt={};
function renderKnowledge(){
 const ticker=$('knowledge-ticker'),items=knowledge?.visible||[];if(!items.length||knowledge?.dismissed){ticker.hidden=true;return;}
 knowledgeIndex=Math.min(knowledgeIndex,items.length-1);const item=items[knowledgeIndex],speaker=item.tags?.includes('lumi')?'Lumi':item.tags?.includes('hoya')?'Hoya':(item.id+knowledgeIndex)%2?'Lumi':'Hoya';ticker.hidden=false;ticker.dataset.expanded=String(knowledgeExpanded);$('knowledge-open').setAttribute('aria-expanded',knowledgeExpanded);
 $('knowledge-text').textContent=knowledgeExpanded?`${speaker} 小知識時間：${item.title}　${item.text}`:`${speaker} 小知識時間：${item.text}`;$('knowledge-open').setAttribute('aria-label',`${item.title}：${item.text}`);
}
function knowledgeTrigger(trigger,alternates=[]){
 if(elapsed-(knowledgeTriggerAt[trigger]??-99)<15)return;knowledgeTriggerAt[trigger]=elapsed;
 if(!knowledge){pendingKnowledge.push([trigger,alternates]);return;}const item=knowledge.add(trigger,alternates,true);if(item){knowledgeIndex=Math.max(0,knowledge.visible.findIndex(value=>value.id===item.id));lastKnowledgeCycle=elapsed;renderKnowledge();}
}
function loadKnowledge(){
 if(typeof fetch!=='function'||typeof KnowledgeTicker!=='function')return;
 fetch('knowledge_library.json?v=1.0.0').then(response=>{if(!response.ok)throw new Error('knowledge');return response.json();}).then(library=>{
  knowledge=new KnowledgeTicker(library,localStorage);const hour=new Date().getHours(),initial=hour>=6&&hour<10?'morning':hour>=18||hour<6?'night':'random';
  if(!knowledge.visible.length)knowledge.add(initial,[],true);for(const entry of pendingKnowledge.splice(0)){delete knowledgeTriggerAt[entry[0]];knowledgeTrigger(...entry);}renderKnowledge();
 }).catch(()=>{});
}
function eventKnowledge(event){
 const id=event.id;if(event.type==='chirp')knowledgeTrigger('bird_event');
 else if(event.type==='eat')knowledgeTrigger(id?`${id}_feed`:'feeding',['feeding']);
 else if(event.type==='toy')knowledgeTrigger(id==='hoya'?'hoya_play':'play',['play']);
 else if(event.type==='angry')knowledgeTrigger('annoyed');
 else if(event.type==='jump')knowledgeTrigger('climb');
 else if(event.type==='scoop')knowledgeTrigger('litter');
}
loadKnowledge();
const palette={lumi:{fur:'#f0e5cc',light:'#fff4df',shade:'#cbbda6',dark:'#726057',ear:'#a98c86',eye:'#78bad3',nose:'#604c49'},hoya:{fur:'#dab279',light:'#fff0cd',shade:'#ba8a50',dark:'#ae7c49',ear:'#e4afa0',eye:'#8b9e79',nose:'#d5908c'}};
function rect(x,y,w,h,c){g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
function poly(points,c){g.fillStyle=c;g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(Math.round(x),Math.round(y)):g.moveTo(Math.round(x),Math.round(y)));g.closePath();g.fill();}
function oval(x,y,rx,ry,c){for(let yy=-ry;yy<=ry;yy++){const width=Math.sqrt(Math.max(0,1-yy*yy/(ry*ry)))*rx;rect(x-width,y+yy,width*2,1,c);}}
function line(x,y,x2,y2,c,width=1){g.strokeStyle=c;g.lineWidth=width;g.beginPath();g.moveTo(Math.round(x)+.5,Math.round(y)+.5);g.lineTo(Math.round(x2)+.5,Math.round(y2)+.5);g.stroke();}
function label(text,x,y,color='#867356',size=5){g.fillStyle=color;g.font=`${size}px monospace`;g.textAlign='center';g.fillText(text,Math.round(x),Math.round(y));}
function bed(x){oval(x,218,29,9,'#b59675');oval(x,214,28,10,'#bcab87');oval(x,212,25,8,'#ede1bd');oval(x,212,21,6,'#c0bc97');line(x-16,213,x+16,213,'#aaa984');}
function plant(x,y,s=1){g.save();g.translate(x,y);g.scale(s,s);rect(-7,0,14,12,'#b87e5c');rect(-9,-2,18,4,'#d19970');rect(-5,3,2,7,'#d49d78');line(0,-1,0,-23,'#74835e',2);poly([[0,-9],[-10,-12],[-13,-20],[-5,-20],[0,-13]],'#8b9b71');poly([[1,-15],[8,-25],[13,-23],[12,-17],[2,-11]],'#738565');poly([[0,-22],[-5,-28],[-3,-33],[2,-31],[4,-24]],'#a1ac7d');g.restore();}
function room(t){
 rect(-40,0,320,320,'#eadbc0');rect(-40,0,320,191,'#e9ddc5');rect(-40,0,320,5,'#d5c3a4');
 for(let x=-34;x<280;x+=22){rect(x,0,1,190,'#e2d4b9');for(let y=17;y<185;y+=24){rect(x+9,y,2,2,'#d7cbae');rect(x+8,y+1,4,1,'#d7cbae');}}
 rect(-40,190,320,8,'#a78a68');rect(-40,190,320,2,'#c7ab86');rect(-40,198,320,122,'#d4b087');
 for(let y=201;y<320;y+=19){rect(-40,y,320,1,'#b99673');for(let x=-39+(Math.floor(y/19)%2)*39;x<280;x+=78){rect(x,y,1,19,'#bea07c');rect(x+7,y+5,22,1,'#ddba92');rect(x+37,y+12,15,1,'#c6a27c');}}
 // Deep window sill, sheer curtains, distant garden.
 rect(20,28,91,109,'#bd9b73');rect(23,31,85,101,'#f9edcd');rect(28,36,75,90,world.outdoorNight?'#4e6477':'#bad1cb');
 if(world.outdoorNight){oval(83,54,7,7,'#f0ddb0');oval(86,51,6,6,'#4e6477');for(const [x,y]of [[40,50],[61,68],[92,83],[37,93]])rect(x,y,1,2,'#e6d8b7');}else{for(const [x,y,w,h]of [[39,38,2,5],[39,57,2,5],[27,48,5,2],[48,48,5,2],[30,40,3,3],[47,40,3,3],[30,56,3,3],[47,56,3,3]])rect(x,y,w,h,'#f1c76f');oval(40,50,8,8,'#f6d77e');oval(38,48,4,4,'#ffe7a0');rect(35,52,23,4,'#e2e4d2');rect(42,49,10,3,'#e2e4d2');rect(74,72,24,4,'#d7e0ce');oval(49,114,28,22,'#9eaf87');oval(92,113,22,17,'#899f7e');rect(28,120,75,6,'#a3b490');}
 drawBird();drawVisitors();
 rect(63,34,4,95,'#f4e9cd');rect(26,81,79,4,'#f4e9cd');rect(16,133,99,5,'#b09068');rect(20,129,91,4,'#ffefd1');
 poly([[20,31],[36,31],[33,82],[28,120],[17,124]],'#f4e6ce');poly([[93,31],[109,31],[112,124],[100,120],[96,80]],'#f4e6ce');line(25,38,23,115,'#dfcfb1');line(102,38,107,117,'#dfcfb1');rect(15,27,99,3,'#9a8161');
 // Wall shelf and small still life.
 rect(151,61,65,5,'#af8b65');rect(155,66,3,6,'#c1a17a');rect(207,66,3,6,'#c1a17a');rect(156,43,5,18,'#9b9d80');rect(162,41,5,20,'#cfaa81');rect(168,45,4,16,'#a8b7ae');line(163,45,166,45,'#f0d4aa');plant(202,52,.65);
 rect(144,92,30,35,'#ba976c');rect(146,94,26,31,'#fbedd0');rect(149,97,20,24,'#ddd7b9');oval(159,111,6,7,'#bcab89');poly([[153,106],[153,101],[158,105],[164,101],[165,108]],'#bcab89');rect(157,110,1,1,'#7a775d');rect(161,110,1,1,'#7a775d');label('HOME',159,121,'#92805e',4);
 rect(190,96,19,22,'#a9a48a');rect(192,98,15,18,'#efdfbd');poly([[194,112],[197,106],[200,110],[204,102],[205,114]],'#92a183');
 // Sideboard, round radio and warm lamp.
 rect(142,158,84,35,'#bb926b');rect(139,154,89,5,'#d1ad81');rect(148,165,32,22,'#c7a27b');rect(185,165,33,22,'#c7a27b');rect(162,173,4,2,'#8e775d');rect(199,173,4,2,'#8e775d');if(world.wolf){rect(151,161,62,32,'#51483f');rect(148,161,7,32,'#c7a27b');rect(210,161,7,32,'#c7a27b');for(const c of world.cats)if(c.state==='hidden'){const x=c.id==='lumi'?165:198;rect(x-3,181,2,2,'#d2e3c2');rect(x+3,181,2,2,'#d2e3c2');}}rect(147,193,5,7,'#947958');rect(216,193,5,7,'#947958');
 rect(151,139,25,15,'#8c9580');rect(153,141,21,11,'#bdc0a3');for(let x=155;x<168;x+=3)line(x,143,x,149,'#919c85');oval(171,147,2,2,'#6e7d6a');line(157,138,168,133,'#8e8066');
 rect(204,136,2,16,'#9b8968');rect(198,152,14,2,'#a28a66');poly([[199,118],[211,118],[216,136],[194,136]],world.night?'#f9dfa2':'#e9cda0');rect(199,119,2,15,'#f6dfb5');
 plant(20,187,.8);bed(112);bed(192);
 // Woven rug and cushion, kept below the walkable furniture line.
 poly([[57,243],[181,243],[199,288],[41,288]],'#aa9a7f');poly([[60,244],[178,244],[194,284],[46,284]],'#b5b99b');poly([[64,247],[174,247],[187,280],[53,280]],'#c6c9a7');
 for(let y=251;y<279;y+=5)line(57,y,184,y,'#bec3a1');for(let x=47;x<195;x+=5)line(x,287,x-1,290,'#e8d7b3');
 poly([[61,254],[173,254],[180,273],[54,273]],'#b8bea0');poly([[65,256],[169,256],[174,270],[60,270]],'#cbd0af');
 if(!world.outdoorNight){g.globalAlpha=.17;poly([[30,139],[98,139],[155,242],[72,242]],'#fff9d8');line(71,139,118,242,'#c6ad83',3);g.globalAlpha=1;}
 else{rect(0,0,240,320,'#313e5428');oval(205,148,30,21,'#ffe5a30d');}
 // Gentle dust motes.
 for(let i=0;i<7;i++){const x=31+(i*29+t*1.4)%180,y=45+(i*41+t*2)%150;rect(x,y,1,1,world.night?'#e8d9aa70':'#fff8e270');}
 label('L',112,221,'#8b896d',4);label('H',192,221,'#8b896d',4);
}
function drawLitter(){rect(189,278,43,25,'#8f9d9b');rect(192,279,37,17,'#e1cc9e');rect(190,298,41,6,'#b0bfba');for(let i=0;i<world.poops;i++){const x=197+(i%4)*8,y=285+Math.floor(i/4)*7;oval(x,y,3,2,'#806247');rect(x-1,y-3,3,3,'#806247');}if(world.poops)label('拖鏟子清理',211,274,'#806247',5);}
function drawVisitors(){
 g.save();g.beginPath();g.rect(28,36,75,90);g.clip();
 if(world.plane){const palettes=[['#fff0d0','#d68763','#789ba8'],['#dff1ec','#5c9da0','#e6a85d'],['#f3e5ef','#ad7fa8','#6f8db4']],colors=palettes[world.plane.variant%3],direction=world.plane.direction||1,x=direction>0?8+world.plane.age*5.4:112-world.plane.age*5.4,y=54;g.save();g.translate(x,y);g.scale(direction,1);poly([[-16,-1],[9,-1],[16,1],[9,4],[-16,4],[-19,2]],colors[0]);poly([[-4,1],[7,-8],[12,-8],[4,3]],colors[1]);poly([[-4,2],[7,10],[12,10],[5,2]],colors[1]);poly([[-14,0],[-9,-6],[-6,-6],[-7,3]],colors[2]);rect(5,0,3,1,'#557184');g.restore();}
 if(world.wolf){const shake=world.wolf.flash>0?Math.sin(elapsed*100)*3:0;g.translate(shake,0);const fur=world.wolf.flash>0?'#c6b3a5':'#747887';oval(70,126,25,22,fur);poly([[47,108],[45,84],[62,99]],fur);poly([[77,99],[94,84],[91,111]],fur);oval(70,109,22,17,fur);poly([[49,111],[69,120],[91,111],[81,125],[58,125]],'#c8c4b5');rect(56,105,8,3,'#f1cb63');rect(77,105,8,3,'#f1cb63');rect(60,105,2,3,'#303441');rect(78,105,2,3,'#303441');poly([[65,115],[75,115],[70,120]],'#343d4a');line(54,101,65,105,'#444b5b',2);line(76,105,87,101,'#444b5b',2);label(world.wolf.hits+'/5',70,94,'#fff0cc',7);}
 g.restore();
}
function drawBird(){
 const b=world.bird;if(!b)return;const palettes=[['#238ebc','#ffd66b','#39b5d6','#2564a0'],['#4f9c69','#f0cf70','#79c78d','#34744e'],['#b96f86','#ffe09a','#dc93a5','#854e68']],colors=palettes[b.variant%3],direction=b.direction||1;let x=82,y=80;
 // The bird lives outside: clip before drawing, then let the frame and curtains occlude it.
 g.save();g.beginPath();g.rect(28,36,75,90);g.clip();
 if(b.phase==='arrive'){const p=Math.min(1,b.age/1.8);x=direction>0?14+68*p:110-28*p;y=43+37*p-Math.sin(p*Math.PI)*12;}
 if(b.phase==='startled'){x+=Math.sin(b.age*55)*2;y-=Math.abs(Math.sin(b.age*25))*4;}if(b.phase==='leave'){const p=Math.min(1,b.age/(b.fright?.8:1.6));x+=42*p*direction;y-=44*p;}
 g.save();g.translate(x,y);g.scale(direction,1);const flying=b.phase!=='perch';oval(0,-4,6,4,colors[0]);oval(0,-2,4,2,colors[1]);oval(4,-8,4,4,colors[2]);rect(5,-9,2,2,'#263e59');rect(5,-9,1,1,'#fff8de');poly([[7,-8],[11,-6],[7,-6]],'#ee9c3c');poly([[-5,-4],[-11,-9],[-10,-2]],colors[3]);
 if(flying){const flap=Math.sin(b.age*24)*7;poly([[-3,-5],[-7,-8+flap],[2,-5+flap]],colors[2]);}else{oval(-2,-5,3,2,colors[3]);line(-2,-1,-2,1,'#9a653e');line(2,-1,2,1,'#9a653e');}g.restore();g.restore();
}
function catTree(){
 oval(44,264,35,7,'#79694d25');rect(10,257,68,7,'#b28d65');poly([[10,257],[16,250],[72,250],[78,257]],'#d4b58a');
 for(const p of platforms){const top=p.y-p.z;rect(p.x-4,top+3,8,p.z-5,'#bcaa81');rect(p.x-3,top+3,2,p.z-5,'#e0cea0');for(let y=top+7;y<255;y+=4)line(p.x-3,y,p.x+3,y+1,'#a79270');}
 for(const p of platforms){const top=p.y-p.z;rect(p.x-23,top,46,6,'#a98963');poly([[p.x-23,top],[p.x-18,top-8],[p.x+18,top-8],[p.x+23,top]],'#e4c99e');rect(p.x-19,top-5,38,5,'#bcc09b');rect(p.x-17,top-4,34,2,'#d0d1ad');}
 if(drag?.type==='toy'&&world.toy?.level){const p=platforms.find(v=>v.level===world.toy.level);line(p.x-19,p.y-p.z+7,p.x+19,p.y-p.z+7,'#f5e7ba',2);}
}
function drawCat(c,t){if(c.state==='hidden')return;const p=palette[c.id],walk=['walk','come-to-player','jump'].includes(c.state),sleep=c.sleeping||c.state==='social-rest'||c.state==='lounge',play=c.state==='play',rub=c.state==='rub',knead=c.state==='knead',front=['turn-look','come-to-player','pet-happy'].includes(c.state)||world.close===c.id;
 const cycle=Math.sin(c.age*(c.id==='hoya'?13:9)),breath=Math.sin(t*2.4)*.45,hop=play?Math.max(0,Math.sin(c.age*7))*7:0;
 const feet=c.y-(c.z||0)-(c.lift||0),lean=rub?(1+Math.sin(c.age*2.5))*2:0;oval(c.x,c.y-(c.z||0)+1,sleep?18:15,4,'#79694d25');g.save();g.translate(Math.round(c.x+c.facing*lean),Math.round(feet-hop));if(c.state==='land')g.scale(1.08,.87);g.scale(front?1:-c.facing,1);
 if(c.state==='puffed'){g.translate(Math.sin(t*75)*3,-Math.abs(Math.sin(t*17))*9);g.scale(1.35,1.15);for(let j=0;j<4;j++){const x=-23+j*15;poly([[x,-38],[x+4,-47],[x,-47],[x+7,-58],[x+4,-46],[x+8,-46]],'#edbd53');}for(let i=0;i<7;i++){const x=-15+i*5;poly([[x,-10],[x-3,-27-(i%2)*5],[x+6,-15]],p.fur);}label('!',0,-45,'#bc7759',10);}
 const tail=Math.round(Math.sin(t*(c.anger>20?10:2)+c.x)*2);
 if(c.state==='watch-bird'||c.state==='watch-plane'||c.state==='startled'){
 // Back view: planted hind legs, raised forepaws, ears and nape instead of a face.
 rect(-10,-32,5,15,p.fur);rect(5,-32,5,15,p.fur);rect(-11,-34,7,4,p.light);rect(4,-34,7,4,p.light);
 oval(0,-13+breath,12,15,p.shade);oval(0,-15+breath,10,14,p.fur);rect(-10,0,7,3,p.light);rect(3,0,7,3,p.light);
 const tilt=Math.round(Math.sin(c.age*1.6));oval(tilt,-29,12,9,p.fur);poly([[-11+tilt,-32],[-10+tilt,-42],[-3+tilt,-36]],p.dark);poly([[3+tilt,-36],[10+tilt,-42],[11+tilt,-32]],p.dark);rect(-7+tilt,-23,14,3,p.light);
 rect(5,-3,7,5,p.fur);rect(10,-2,6,5,p.shade);rect(14,-5+tail,5,7,p.dark);
 if(c.state==='startled')label('!',17,-43,'#d58e64',9);g.restore();if(world.selected===c.id&&zoom<1.1)rect(c.x-2,feet+7,4,1,'#798b71');return;
 }
 // Tail uses articulated segments, and is tucked around the sleeping body.
 if(sleep){oval(0,-6,18,9,p.shade);oval(-1,-8-breath,16,9,p.fur);oval(7,-3,12,4,p.dark);oval(7,-4,10,3,p.shade);}
 else{rect(10,-13,8,6,p.shade);rect(16,-18+tail,6,10,p.fur);rect(18,-23+tail,5,8,p.fur);rect(18,-25+tail,4,4,p.dark);rect(18,-17+tail,2,6,p.light);
 oval(0,-11+breath,walk&&!front?16:12,walk&&!front?9:13,p.shade);oval(-1,-13+breath,walk&&!front?15:11,walk&&!front?8:12,p.fur);oval(-3,-9,7,walk&&!front?6:10,p.light);
 if(walk){for(let i=0;i<4;i++){const x=-9+i*5,dy=Math.round(Math.sin(c.age*11+i*Math.PI*.8)*2);rect(x,-5,4,7+dy,i%2?p.fur:p.shade);rect(x,1+dy,5,2,p.light);}}
 else if(knead){const press=Math.sin(c.age*6);rect(-16,-8,5,8+press*2,p.fur);rect(-10,-8,5,8-press*2,p.fur);rect(-17,press*2,7,3,p.light);rect(-11,-press*2,7,3,p.light);rect(4,0,7,3,p.light);}
 else if(play){rect(-13,-10-cycle*3,6,5,p.light);rect(7,-12+cycle*3,7,5,p.light);rect(-9,-2,7,3,p.light);rect(4,-2,7,3,p.light);}
 else{rect(-9,-9,5,11,p.fur);rect(4,-9,5,11,p.fur);rect(-10,0,7,3,p.light);rect(3,0,7,3,p.light);}}
 let hx=sleep?-9:front?0:walk?-11:-4,hy=sleep?-9:walk?-22+Math.abs(cycle):-26+breath;if(c.state==='watch-bird'){hy-=4;hx+=Math.sin(c.age*1.6)*2;}if(rub){hx-=2;hy+=Math.sin(c.age*2.5)*2;}if(knead){hx=-7;hy=-22+Math.sin(c.age*6)*.8;}if(c.state==='eat'){hx=-8;hy=-13+Math.sin(c.age*10)*1.5;}
 g.save();g.translate(Math.round(hx),Math.round(hy));
 const earTwitch=sleep&&c.interrupts===1&&c.age<1?Math.round(Math.sin(c.age*30)*2):0;
 poly([[-12,-5],[-12,-15+earTwitch],[-5,-11],[5,-11],[11,-15],[12,-4]],p.shade);
 poly([[-11,-6],[-10,-13+earTwitch],[-4,-9]],p.dark);poly([[5,-9],[10,-13],[11,-5]],p.dark);
 poly([[-10,-8],[-10,-11+earTwitch],[-7,-9]],p.ear);poly([[7,-9],[9,-11],[10,-7]],p.ear);
 oval(0,-2,c.id==='hoya'?14:13,c.id==='hoya'?11:10,p.fur);rect(-13,-5,2,7,p.shade);rect(11,-4,2,6,p.shade);
 if(c.id==='lumi'){oval(0,-1,10,8,p.dark);rect(-12,2,3,3,p.fur);rect(10,2,3,3,p.fur);rect(-9,8,18,2,p.light);rect(-7,10,14,2,p.light);rect(-4,12,8,2,p.fur);}else{oval(0,4,11,5,p.light);rect(-7,-10,14,2,'#e9c38b');rect(-4,-9,2,3,p.shade);rect(2,-9,2,3,p.shade);}
 const shut=sleep||rub||knead||c.petGlow>0||(t%5.7<.14),angry=c.state==='angry'||c.state==='annoyed'||c.state==='bite-warning';
 for(const x of [-7,4]){if(shut){line(x,-1,x+3,-1,p.dark===palette.lumi.dark?'#312f30':'#796043');rect(x-1,-2,1,1,p.dark);}else{rect(x-1,-4,6,6,c.id==='lumi'?'#514846':'#79664c');rect(x,-4,4,5,p.eye);rect(x+1,-3,2,4,'#364445');rect(x,-4,2,2,'#fff6db');if(angry)line(x-1,-5,x+4,-2,p.dark,2);}}
 if(c.state==='bite-warning'){rect(-3,4,7,5,'#694747');rect(-2,4,2,2,'#fff4df');rect(2,4,2,2,'#fff4df');}rect(-1,2,3,2,p.nose);rect(0,4,1,2,p.dark);rect(-2,6,2,1,p.dark);rect(1,6,2,1,p.dark);
 line(-9,4,-16,3,'#f8e9cc');line(-9,6,-15,7,'#f8e9cc');line(9,4,16,3,'#f8e9cc');line(9,6,15,7,'#f8e9cc');
 if(c.petGlow>0){rect(-10,3,3,2,'#d89e8d');rect(8,3,3,2,'#d89e8d');}g.restore();g.restore();
 if(c.sleeping)label('z'.repeat(2+Math.floor(t%3)),c.x+17,feet-20-Math.sin(t*2)*2,'#8e927c',7);
 if(c.meowUntil>world.time)label('喵',c.x+19,feet-43,'#a17c61',7);if(c.state==='turn-look')label('?',c.x+17,feet-38,'#8a825f',9);
 if(['annoyed','angry'].includes(c.state))label(c.id==='lumi'?'…':'!',c.x+17,c.y-35,'#b97963',9);
 if(world.selected===c.id&&zoom<1.1){rect(c.x-2,feet+7,4,1,'#798b71');}
}
function bowl(x,y){oval(x,y+1,8,3,'#8c745449');rect(x-8,y-4,16,5,'#a2b6ad');rect(x-6,y+1,12,2,'#78938c');oval(x,y-4,8,3,'#d6dfc9');oval(x,y-4,6,2,'#a08054');for(let i=0;i<4;i++)rect(x-5+i*3,y-5+i%2,2,1,'#d2ac71');}
function feather(x,y,t){line(x,y,x+13,y-27,'#796b59');line(x+13,y-27,x+21,y-39,'#b7956e',2);poly([[x,y-6],[x-6,y-10],[x-10,y-5],[x-7,y+3],[x-2,y+4]],'#c38c77');poly([[x,y-5],[x+3,y-10],[x+7,y-7],[x+6,y],[x,y+4]],'#a2b4a0');line(x,y-5,x-5,y+5,'#e9d7ac');}
function render(dt){const target=world.close?3.3:1;zoom+=(target-zoom)*Math.min(1,dt*5);const closeCat=world.cats.find(c=>c.id===world.close),fx=closeCat?closeCat.x:120,fy=closeCat?closeCat.y-19:160;focus.x+=(fx-focus.x)*Math.min(1,dt*5);focus.y+=(fy-focus.y)*Math.min(1,dt*5);
 g.imageSmoothingEnabled=false;g.save();g.translate(VIEW_CENTER,160);g.scale(zoom,zoom);g.translate(-focus.x,-focus.y);room(elapsed);drawLitter();for(const food of world.foods)bowl(food.x,food.y);const layers=world.cats.map(c=>({depth:c.y+(c.level||c.jump?.level?1:0),draw:()=>drawCat(c,elapsed)}));layers.push({depth:258,draw:catTree});layers.sort((a,b)=>a.depth-b.depth).forEach(layer=>layer.draw());if(world.social?.phase==='active')label('♡',141,222-(world.social.age%2.5)*5,'#c58f86',9);if(world.toy)feather(world.toy.drawX??world.toy.x,world.toy.drawY??world.toy.y,elapsed);g.restore();
 for(const p of particles){p.y-=dt*14;p.life-=dt;g.globalAlpha=Math.min(1,p.life);if(p.kind==='heart'){poly([[p.x,p.y+2],[p.x-4,p.y-2],[p.x-4,p.y-5],[p.x-2,p.y-6],[p.x,p.y-4],[p.x+2,p.y-6],[p.x+4,p.y-5],[p.x+4,p.y-2]],'#c78880');}else label('✦',p.x,p.y,'#c5a15c',9);}g.globalAlpha=1;particles=particles.filter(p=>p.life>0);
 if(drag?.type==='scoop'){line(drag.x,drag.y-17,drag.x,drag.y,'#947a59',3);rect(drag.x-6,drag.y,13,9,'#8eaaa5');for(let i=-3;i<5;i+=3)line(drag.x+i,drag.y+2,drag.x+i,drag.y+7,'#e8dec5');if(drag.session)label(`${drag.session.progress}/${drag.session.required}`,drag.x-14,drag.y-5,'#6b765f',7);}if(drag?.inside&&drag.type==='food')bowl(drag.x,drag.y);
}
function notify(text){if(!text)return;$('note').textContent=text;$('note').classList.add('visible');noteUntil=elapsed+3.5;}
function save(){try{localStorage.setItem('lumi-hoya-room-v1',JSON.stringify({...world.snapshot(),savedAt:awaySince??Date.now()}));}catch{if(!save.warned){notify('此瀏覽器無法儲存，進度僅保留到本次結束。');save.warned=true;}}}
const meterHistory={};function hud(){const c={...world.current,cleanliness:world.cleanliness};for(const key of ['hunger','mood','energy','bond','cleanliness']){const value=Math.round(c[key]),historyKey=c.id+key,old=meterHistory[historyKey],label=$(key).parentElement;if(label&&old!==undefined&&value!==old){label.dataset.delta=(value>old?'+♥ ':'−　 ')+Math.abs(value-old);label.dataset.direction=value>old?'up':'down';label.dataset.until=String(elapsed+1.3);}if(label&&Number(label.dataset.until)<elapsed){delete label.dataset.delta;}meterHistory[historyKey]=value;$(key).value=c[key];$(key).setAttribute('aria-label',`${key==='hunger'?'飽足':key==='mood'?'心情':key==='energy'?'精力':key==='cleanliness'?'潔淨':'親密'} ${Math.round(c[key])}`);}$('coins').textContent=Math.floor(world.coins);document.querySelectorAll('[data-cat]').forEach(b=>{b.setAttribute('aria-pressed',b.dataset.cat===world.selected);b.disabled=!!world.close;});$('back').hidden=!world.close;for(const key of ['food','toy','scoop','call','night'])$(key).disabled=world.interacting||!started;$('hint').textContent=world.wolf?'點窗外的狼！還差 '+(5-world.wolf.hits)+' 下就能趕走':world.close?'慢慢滑過額頭與身體 · 太快會讓牠不舒服':drag?drag.type==='scoop'?'拖鏟子到右下角貓砂盆，放開清理':drag.type==='food'?'拖到地毯附近的地板，放開餵食':'羽毛移到跳台上，引牠一層一層跳':'點點貓咪，等牠走到你身邊';$('time-label').textContent=world.night?'夜深了，輕輕的就好':'有貓在的，都是好日子';$('clock').textContent=new Date().toLocaleTimeString('zh-TW',{hour:'2-digit',minute:'2-digit',hour12:false});$('night').setAttribute('aria-pressed',world.night);const hour=new Date().getHours();$('night').disabled=world.interacting||!started||(!world.night&&hour>=6&&hour<20);$('night').title=world.night?'開燈':'晚安燈 · 20:00–06:00';}
function startMediaBgm(){if(!music||!started||document.hidden||typeof bgmMedia?.play!=='function')return;bgmMedia.volume=.3;const playing=bgmMedia.play();playing?.catch?.(()=>{});}
function stopAudio(){audioPaused=true;try{bgmMedia?.pause?.();navigator.vibrate?.(0);}catch{}for(const osc of voices){try{osc.stop();}catch{}}voices.clear();if(audio?.state==='running')audio.suspend().catch(()=>{});}
function soundHud(){$('music').setAttribute('aria-pressed',music);$('music').setAttribute('aria-label',music?'關閉全部聲音':'開啟全部聲音');}
function primeAudio(){if(!audio||!audio.createOscillator||!audio.createGain)return;try{const osc=audio.createOscillator(),gain=audio.createGain(),t=audio.currentTime;gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(.00011,t+.015);gain.gain.exponentialRampToValueAtTime(.0001,t+.04);osc.connect(gain);gain.connect(audio.destination);voices.add(osc);osc.start(t);osc.stop(t+.05);osc.onended=()=>{voices.delete(osc);try{osc.disconnect();gain.disconnect();}catch{}};}catch{}}
function unlock(){if(!music||document.hidden)return Promise.resolve(false);audioPaused=false;const Context=window.AudioContext||window.webkitAudioContext;if(audio&&['closed','interrupted'].includes(audio.state)){try{audio.close?.();}catch{}audio=null;}if(!audio){try{audio=new Context({latencyHint:'interactive'});if(audio.state==='interrupted'){try{audio.close?.();}catch{}audio=new Context({latencyHint:'interactive'});}}catch{return Promise.resolve(false);}}primeAudio();if(audio.state==='running')return Promise.resolve(true);try{return Promise.resolve(audio.resume()).then(()=>{primeAudio();return audio.state==='running';}).catch(()=>false);}catch{return Promise.resolve(false);}}
function tone(freq,duration,type='sine',volume=.02,delay=0,end=freq){if(!music||audioPaused||document.hidden||!audio||audio.state!=='running')return;const osc=audio.createOscillator(),gain=audio.createGain(),time=audio.currentTime+delay;osc.type=type;osc.frequency.setValueAtTime(freq,time);osc.frequency.exponentialRampToValueAtTime(Math.max(20,end),time+duration);gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(volume,time+.015);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);osc.connect(gain);gain.connect(audio.destination);voices.add(osc);osc.start(time);osc.stop(time+duration+.04);osc.onended=()=>{voices.delete(osc);osc.disconnect();gain.disconnect();};}
function sound(type,id=world.selected){if(type==='angry')haptic('bite',[30,45,55],.8);if(type==='toy')haptic('toy',[10,35,10],.35);if(type==='land')haptic('land',12,.3);if(type==='scoop')haptic('scoop',8,.07);if(type==='thump')haptic('wolf',[20,25,30],.1);if(!music||audioPaused||!audio||audio.state!=='running')return;if(type==='purr'){if(elapsed-lastPurr<.5)return;lastPurr=elapsed;}if(type==='howl'){tone(230,2.4,'sawtooth',.11,0,460);tone(460,2.6,'sine',.1,.25,280);tone(280,1.8,'triangle',.085,1.8,170);}if(type==='scoop'){for(let i=0;i<14;i++)tone(700+Math.random()*1800,.055,'triangle',.045,i*.045,180);}if(type==='thump')tone(150,.18,'triangle',.11,0,45);if(type==='jump')tone(220,.13,'sine',.027,0,440);if(type==='chirp'){tone(1900,.12,'sine',.021,0,2700);tone(2500,.08,'sine',.016,.15,2100);}if(type==='land')tone(95,.09,'sine',.026,0,55);if(type==='meow'){meowVoice(id);}if(type==='purr'){for(let i=0;i<7;i++){tone(86+i%2*12,.13,'triangle',.055,i*.09,72);tone(170,.12,'sine',.018,i*.09,145);}}if(type==='eat'){tone(190,.045,'triangle',.02,0,90);tone(260,.05,'triangle',.015,.06,110);}if(type==='toy'){tone(1800,.06,'sine',.025);tone(2300,.08,'sine',.016,.07);}if(type==='coin'){tone(880,.14,'sine',.035);tone(1320,.25,'sine',.025,.12);}if(type==='angry'){tone(155,.3,'sawtooth',.018,0,80);}}
function meowVoice(id){
 if(!music||audioPaused||document.hidden||!audio||audio.state!=='running')return;
 const f=id==='hoya'?610:420,d=id==='hoya'?.58:.82;
 if(!audio.createBiquadFilter){tone(f,d,'triangle',.06,0,f*.65);return;}
 const t=audio.currentTime,o=audio.createOscillator(),gain=audio.createGain();o.type='sawtooth';o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(f*1.35,t+.13);o.frequency.exponentialRampToValueAtTime(f*.65,t+d);
 gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(.085,t+.07);gain.gain.exponentialRampToValueAtTime(.055,t+d*.55);gain.gain.exponentialRampToValueAtTime(.0001,t+d);gain.connect(audio.destination);
 const filters=[audio.createBiquadFilter(),audio.createBiquadFilter()];filters.forEach((filter,i)=>{filter.type='bandpass';filter.Q.value=i?5:3;filter.frequency.setValueAtTime(i?2600:1150,t);filter.frequency.exponentialRampToValueAtTime(i?1300:520,t+d*.85);o.connect(filter);filter.connect(gain);});
 voices.add(o);o.start(t);o.stop(t+d+.03);o.onended=()=>{voices.delete(o);o.disconnect();filters.forEach(filter=>filter.disconnect());gain.disconnect();};
}
function audioTick(dt){if(bgmMedia||!music||!started||!audio||audio.state!=='running')return;bgmClock-=dt;if(bgmClock<=0){bgmClock=.6;const notes=[261.63,329.63,392,493.88,440,392,329.63,293.66,246.94,293.66,392,440,392,329.63,293.66,0];const section=Math.floor(bgmStep/16)%8,transpose=[1,1.12246,.8909,1,1.2599,1.12246,.8909,1][section];const index=section%2?15-bgmStep%16:bgmStep%16;const f=notes[index]*transpose;if(f)tone(f,.95,'sine',.018);if(bgmStep%4===0){tone(bgmStep%16<8?130.81:146.83,2.1,'sine',.02);tone(bgmStep%16<8?196:220,1.8,'sine',.01,.1);}bgmStep=(bgmStep+1)%128;}}
function screenPoint(e){const r=canvas.getBoundingClientRect(),scale=Math.min(r.width/VIEW_W,r.height/320),left=r.left+(r.width-VIEW_W*scale)/2,top=r.top+(r.height-320*scale)/2;return {x:(e.clientX-left)/scale,y:(e.clientY-top)/scale};}
function toWorld(p){return {x:(p.x-VIEW_CENTER)/zoom+focus.x,y:(p.y-160)/zoom+focus.y};}
function sensitive(c,p){const x=p.x-c.x,y=p.y-c.y;return (x>=15&&x<=24&&y>=-27&&y<=2)||(Math.abs(x)<=5&&y>=-7&&y<=1);}
function hit(c,p){const feet=c.y-(c.z||0)-(c.lift||0);return Math.abs(p.x-c.x)<22&&p.y>feet-44&&p.y<feet+8;}
canvas.addEventListener('pointerdown',e=>{if(!started||drag||pointerId!==null)return;unlock();pointerId=e.pointerId;canvas.setPointerCapture(e.pointerId);const p=screenPoint(e);if(world.wolf){const q=toWorld(p);world.hitWolf(q.x,q.y);return;}if(world.close){const c=world.cats.find(c=>c.id===world.close);if(sensitive(c,toWorld(p)))world.rejectPet('不喜歡尾巴或下腹被碰');stroke={...p,time:e.timeStamp};}else if(zoom<1.1){const target=[...world.cats].sort((a,b)=>b.y-a.y).find(c=>hit(c,toWorld(p)));if(target)world.touchCat(target.id);}});
canvas.addEventListener('pointermove',e=>{if(e.pointerId!==pointerId||!stroke||!world.close)return;const p=screenPoint(e),c=world.cats.find(c=>c.id===world.close),distance=Math.hypot(p.x-stroke.x,p.y-stroke.y),dt=Math.max(.008,(e.timeStamp-stroke.time)/1000);if(sensitive(c,toWorld(p))){world.rejectPet('不喜歡尾巴或下腹被碰');}else if(hit(c,toWorld(p))&&hit(c,toWorld(stroke))){if(world.pet(distance,distance/dt)){particles.push({x:p.x,y:p.y,life:1.4,kind:'heart'});knowledgeTrigger(`${c.id}_pet`,['petting']);}if(c.state==='pet-happy'&&distance>0)haptic('pet',8,.22);}stroke={...p,time:e.timeStamp};});
function stopStroke(e){if(e.pointerId!==pointerId)return;stroke=null;pointerId=null;try{navigator.vibrate?.(0);}catch{}}
for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,stopStroke);
function dragStart(e,type){if(!started||world.interacting||drag||pointerId!==null)return;e.preventDefault();unlock();const source=e.currentTarget;source.setPointerCapture(e.pointerId);drag={type,id:e.pointerId,source,...screenPoint(e),inside:false};notify(type==='scoop'?'把鏟子拖到右下角貓砂盆。':type==='food'?'把小碗拖到房間地板上。':'把羽毛拖到跳台上，也能引牠跳上去。');hud();}
function offsetTool(p,type){return type==='food'?p:{x:p.x-22,y:p.y+18};}
for(const type of ['food','toy','scoop']){const source=$(type);source.addEventListener('pointerdown',e=>dragStart(e,type));source.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;if(world.interacting){drag=null;world.toy=null;return;}e.preventDefault();const pointer=screenPoint(e),shown=offsetTool(pointer,type),p=toWorld(shown);Object.assign(drag,shown,{inside:p.x>=24&&p.x<=216&&p.y>=213&&p.y<=299});if(type==='toy'){world.toy=world.toyAt(p.x,p.y);drag.inside=!!world.toy;if(world.toy&&elapsed-lastBell>.35){lastBell=elapsed;sound('toy');}}else if(type==='scoop'){const over=p.x>=187&&p.x<=235&&p.y>=272&&p.y<=310;drag.inside=over;if(over&&!drag.attempted){drag.attempted=true;drag.session=world.beginLitterCleaning();}if(over&&drag.session){if(drag.lastWorld){drag.distance=(drag.distance||0)+Math.hypot(p.x-drag.lastWorld.x,p.y-drag.lastWorld.y);while(drag.distance>=15&&drag.session.progress<drag.session.required){drag.distance-=15;world.scoopLitter(drag.session);}}drag.lastWorld=p;}else drag.lastWorld=null;}});source.addEventListener('pointerup',e=>{if(!drag||e.pointerId!==drag.id)return;const p=toWorld(screenPoint(e));if(type==='food'){if(world.dropFood(p.x,p.y))sound('toy');else if(world.foods.length>=2)notify('房間最多放兩盤。');else if(world.coins>=5)notify('放在地毯附近的地板上就可以了。');}else if(type==='scoop'&&drag.session&&drag.session.progress<drag.session.required)notify(`再擦 ${drag.session.required-drag.session.progress} 下就乾淨了。`);world.toy=null;drag=null;save();hud();});for(const event of ['pointercancel','lostpointercapture'])source.addEventListener(event,()=>{if(drag?.source===source){drag=null;world.toy=null;hud();}});}
$('start').onclick=()=>{started=true;try{music=localStorage.getItem('lh-muted')!=='true';}catch{music=true;}soundHud();startMediaBgm();unlock().then(ready=>{if(ready){bgmClock=0;sound('meow');}});$('intro').classList.add('leaving');setTimeout(()=>$('intro').hidden=true,750);notify('歡迎回家。點點 Lumi 或 Hoya 打個招呼。');hud();};
$('music').onclick=()=>{music=!music;if(music){startMediaBgm();unlock().then(ready=>{if(ready){bgmClock=0;sound('meow');}});}else stopAudio();soundHud();try{localStorage.setItem('lh-muted',String(!music));}catch{}};
document.addEventListener('pointerdown',()=>{if(music){startMediaBgm();unlock();}},{capture:true});
addEventListener('storage',e=>{if(e.key==='lh-muted'){music=e.newValue!=='true';if(!music)stopAudio();soundHud();}});
addEventListener('blur',stopAudio);
$('call').onclick=()=>{unlock();world.call();};$('back').onclick=()=>{world.leave();stroke=null;save();hud();};
$('knowledge-open').onclick=()=>{knowledgeExpanded=!knowledgeExpanded;renderKnowledge();};
$('knowledge-dismiss').onclick=()=>{knowledge?.dismissToday();knowledgeExpanded=false;renderKnowledge();};
document.querySelectorAll('[data-cat]').forEach(button=>button.onclick=()=>{if(world.close)return;world.selected=button.dataset.cat;unlock();sound('meow',world.selected);notify(world.selected==='lumi'?'Lumi · 慢慢來，最喜歡你陪著。':'Hoya · 今天又有什麼好玩的？');hud();save();});
$('night').onclick=()=>{const wasNight=world.night;world.toggleNight();if(!wasNight&&world.night)knowledgeTrigger('night');save();hud();};
document.addEventListener('visibilitychange',()=>{last=0;if(document.hidden){awaySince=awaySince??Date.now();save();drag=null;world.toy=null;stroke=null;pointerId=null;stopAudio();}else if(awaySince!==null){world.applyOffline(awaySince);awaySince=null;save();hud();}});addEventListener('pagehide',()=>{awaySince=awaySince??Date.now();save();stopAudio();});
const previousSleep=new Map(world.cats.map(c=>[c.id,c.sleeping]));
function frame(t){const dt=last?Math.min(.05,(t-last)/1000):0;last=t;if(!document.hidden){elapsed+=dt;if(started)world.update(dt);else world.outdoorNight=new Date().getHours()>=18||new Date().getHours()<6;audioTick(dt);for(const event of world.events.splice(0)){sound(event.type,event.id);eventKnowledge(event);if(event.text)notify(event.text);if(event.type==='coin')particles.push({x:200,y:40,life:1.4,kind:'coin'});}for(const c of world.cats){if(c.sleeping&&!previousSleep.get(c.id))knowledgeTrigger(`${c.id}_sleep`,['sleep']);previousSleep.set(c.id,c.sleeping);}if(knowledge?.visible.length>1&&!knowledgeExpanded&&elapsed-lastKnowledgeCycle>9){knowledgeIndex=(knowledgeIndex+1)%knowledge.visible.length;lastKnowledgeCycle=elapsed;renderKnowledge();}render(dt);if(elapsed>noteUntil)$('note').classList.remove('visible');if(elapsed-lastHud>.2){hud();lastHud=elapsed;}if(started&&elapsed-lastSave>5){save();lastSave=elapsed;}}requestAnimationFrame(frame);}
hud();requestAnimationFrame(frame);
})();
