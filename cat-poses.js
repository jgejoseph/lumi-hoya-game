/* Approved native pixel draft: render-only poses. */
(function(root){'use strict';let g;
const palette={lumi:{fur:'#f0e5cc',light:'#fff4df',shade:'#cbbda6',dark:'#726057',ear:'#a98c86',eye:'#78bad3',nose:'#604c49'},hoya:{fur:'#dab279',light:'#fff0cd',shade:'#ba8a50',dark:'#ae7c49',ear:'#e4afa0',eye:'#8b9e79',nose:'#d5908c'}};
function rect(x,y,w,h,c){g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
function poly(points,c){g.fillStyle=c;g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(Math.round(x),Math.round(y)):g.moveTo(Math.round(x),Math.round(y)));g.closePath();g.fill();}
function oval(x,y,rx,ry,c){for(let yy=-ry;yy<=ry;yy++){const width=Math.sqrt(Math.max(0,1-yy*yy/(ry*ry)))*rx;rect(x-width,y+yy,width*2,1,c);}}
function line(x,y,x2,y2,c,width=1){g.strokeStyle=c;g.lineWidth=width;g.beginPath();g.moveTo(Math.round(x)+.5,Math.round(y)+.5);g.lineTo(Math.round(x2)+.5,Math.round(y2)+.5);g.stroke();}
function happyHead(c,openSmile=false){const p=palette[c.id],earTwitch=0;
 poly([[-12,-5],[-12,-15+earTwitch],[-5,-11],[5,-11],[11,-15],[12,-4]],p.shade);
 poly([[-11,-6],[-10,-13+earTwitch],[-4,-9]],p.dark);poly([[5,-9],[10,-13],[11,-5]],p.dark);
 poly([[-10,-8],[-10,-11+earTwitch],[-7,-9]],p.ear);poly([[7,-9],[9,-11],[10,-7]],p.ear);
 oval(0,-2,c.id==='hoya'?14:13,c.id==='hoya'?11:10,p.fur);rect(-13,-5,2,7,p.shade);rect(11,-4,2,6,p.shade);
 if(c.id==='lumi'){oval(0,-1,10,8,p.dark);rect(-12,2,3,3,p.fur);rect(10,2,3,3,p.fur);rect(-9,8,18,2,p.light);rect(-7,10,14,2,p.light);rect(-4,12,8,2,p.fur);}else{oval(0,4,11,5,p.light);rect(-7,-10,14,2,'#e9c38b');rect(-4,-9,2,3,p.shade);rect(2,-9,2,3,p.shade);}
 for(const x of [-7,4]){if(c.id==='lumi'){const ink='#234e70';rect(x-3,-3,2,3,ink);rect(x-2,-5,2,2,ink);rect(x,-6,3,2,ink);rect(x+3,-5,2,2,ink);rect(x+4,-3,2,3,ink);}else{line(x-3,-2,x+1,-6,p.dark,2);line(x+1,-6,x+5,-2,p.dark,2);}}
 rect(-1,2,3,2,c.id==='lumi'?'#302b29':p.nose);
 if(openSmile){poly([[-4,5],[4,5],[3,9],[0,11],[-3,9]],'#604c49');rect(-2,8,4,2,'#d5908c');}else{rect(0,4,1,2,p.nose);line(-4,5,-2,7,p.nose);line(-2,7,2,7,p.nose);line(2,7,4,5,p.nose);}
 line(-9,4,-16,3,'#f8e9cc');line(9,4,16,3,'#f8e9cc');}
// Root stays attached. Successive tail joints bend with a delayed, independent rhythm.
function rollTail(p,l,t){
 const side=l?1:-1,phase=t*(l?1.7:1.45)+(l?0:2.1);
 let x=side*19,y=-7;
 const angles=[-.12,-.65+Math.sin(phase)*.30,-1.25+Math.sin(phase-.65)*.55,-1.6+Math.sin(phase-1.15)*.65];
 for(let j=0;j<angles.length;j++){
  const nx=x+side*Math.cos(angles[j])*4.2,ny=y+Math.sin(angles[j])*4.2;
  for(let k=0;k<=5;k++){const a=k/5,px=x+(nx-x)*a,py=y+(ny-y)*a,r=l?3.1:2.7;oval(px,py,r,r,j===3?(l?p.dark:p.shade):p.fur);}
  x=nx;y=ny;
 }
}
function roll(c,t){const p=palette[c.id],l=c.id==='lumi',phase=t*(l?2.5:2.2)+(l?0:1.7),wave=Math.sin(phase),openSmile=Math.sin(t*2+(l?0:1.2))>.15;
 g.save();g.translate(c.x,c.y);oval(0,1,30,3,'#79694d25');
 // Torso and floor contact remain fixed; only articulated parts move.
// Independent limb layouts; head stays attached to the shoulder on each side.
if(l){
 poly([[-15,-17],[-6,-21],[14,-20],[23,-14],[25,-5],[18,0],[-12,0],[-20,-6]],p.shade);oval(3,-10,22,10,p.fur);oval(4,-11,14,8,p.light);
rollTail(p,true,t);
 g.save();g.translate(12,-17);g.rotate(Math.sin(phase+1)*.08);g.translate(-12,17); poly([[8,-17],[10,-25],[15,-27],[18,-23],[15,-17]],p.shade);oval(14,-25,4,3,p.light);rect(12,-27,2,2,p.ear);g.restore();
 poly([[17,-8],[23,-15],[28,-14],[27,-9],[22,-4]],p.fur);oval(26,-13,4,3,p.light);
 g.save();g.translate(-8,-13);g.rotate(Math.sin(phase-1)*.08);g.translate(8,13); poly([[-11,-13],[-8,-21],[-3,-22],[0,-18],[-4,-13]],p.fur);oval(-3,-21,4,3,p.light);g.restore();
 poly([[-9,-6],[-1,-8],[3,-4],[0,0],[-8,0]],p.shade);oval(0,-3,4,3,p.light);
 g.save();g.translate(-20,-13);g.rotate((-50+wave*2.5)*Math.PI/180);happyHead(c,openSmile);g.restore();
}else{
 poly([[-24,-8],[-21,-16],[-9,-20],[10,-18],[21,-10],[20,-3],[9,1],[-15,0]],p.shade);oval(-2,-9,22,10,p.fur);oval(-5,-9,14,8,p.light);
rollTail(p,false,t);
 g.save();g.translate(-14,-16);g.rotate(Math.sin(phase-1)*.08);g.translate(14,16); poly([[-16,-16],[-21,-21],[-20,-26],[-14,-26],[-10,-17]],p.fur);oval(-17,-26,4,3,p.light);g.restore();
 poly([[-14,-7],[-23,-5],[-25,-1],[-20,2],[-11,-1]],p.shade);oval(-23,-1,4,3,p.light);
 g.save();g.translate(10,-14);g.rotate(Math.sin(phase+1)*.08);g.translate(-10,14); poly([[8,-14],[7,-22],[11,-24],[15,-21],[14,-14]],p.fur);oval(11,-23,4,3,p.light);g.restore();
 poly([[11,-8],[3,-10],[-1,-7],[1,-3],[10,-3]],p.fur);oval(1,-6,4,3,p.light);
 g.save();g.translate(21,-13);g.rotate((50+wave*2.5)*Math.PI/180);happyHead(c,openSmile);g.restore();}
const heartPhase=(t+(l?0:1.6))%3.6;if(heartPhase<2.4){g.save();g.globalAlpha=Math.sin(heartPhase/2.4*Math.PI)*.75;g.translate(l?-8:8,-34-heartPhase*5);poly([[0,4],[-4,0],[-4,-3],[-2,-4],[0,-2],[2,-4],[4,-3],[4,0]],'#d5908c');rect(-2,-3,1,1,'#fff4df');g.restore();}
g.restore();}
function backHead(p,l,y){
 poly([[-12,y-5],[-12,y-15],[-5,y-11],[5,y-11],[11,y-15],[12,y-4]],p.shade);
 poly([[-11,y-6],[-10,y-13],[-4,y-9]],p.dark);poly([[5,y-9],[10,y-13],[11,y-5]],p.dark);
 oval(0,y-2,l?13:14,l?10:11,p.fur);rect(-13,y-5,2,7,p.shade);rect(11,y-4,2,6,p.shade);
 if(l){rect(-10,y+5,20,3,p.light);rect(-12,y+2,3,3,p.light);rect(9,y+2,3,3,p.light);}else{rect(-6,y-10,12,2,p.shade);rect(-3,y-8,6,4,p.shade);rect(-2,y-7,3,2,p.dark);}
}
function back(c,t,standing=false,target=null){const p=palette[c.id],l=c.id==='lumi';g.save();g.translate(c.x,c.y);oval(0,2,17,3,'#79694d25');
if(standing){
 rect(-9,-14,6,15,p.shade);rect(3,-14,6,15,p.fur);rect(-11,-1,9,4,p.light);rect(2,-1,9,4,p.light);
 poly([[-8,-40],[-11,-31],[-10,-20],[-13,-12],[-10,-6],[9,-6],[12,-12],[9,-22],[10,-33],[7,-40]],p.shade);
 poly([[-6,-40],[-9,-31],[-7,-21],[-10,-12],[9,-11],[7,-25],[8,-35],[5,-40]],p.fur);
}else{
 poly([[-8,-27],[-11,-20],[-15,-11],[-16,-4],[-11,1],[11,1],[16,-4],[14,-12],[10,-23],[7,-27]],p.shade);
 oval(0,-12,l?14:13,13,p.fur);oval(-10,-5,6,7,p.fur);oval(10,-5,6,7,p.fur);rect(-14,-1,9,4,p.light);rect(5,-1,9,4,p.light);
}
const top=standing?-37:-25;
if(l){oval(-7,top+12,3,5,p.shade);oval(8,top+15,3,4,p.shade);oval(0,top+13,7,standing?12:10,p.fur);}else{
 oval(0,top+11,7,standing?13:10,p.shade);oval(0,top+8,3,6,p.dark);oval(-6,top+14,3,7,p.fur);oval(6,top+15,3,7,p.fur);
}
poly([[8,-7],[17,-5],[23,-7],[24,-12],[21,-15],[18,-13],[19,-10],[14,-10]],p.fur);rect(21,-14,4,5,l?p.dark:p.shade);
backHead(p,l,standing?-43:-28);
if(standing){const open=Math.sin(t*6)>0; // shoulder on visitor's side reaches; opposite paw supports glass.
 const px=target?Math.max(-22,Math.min(22,82-c.x)):-15,py=target?Math.max(-75,Math.min(-54,(target.perchY??80)-c.y)):-62;
 const side=px<0?-1:1;
 poly([[side*9,-34],[side*13,-38],[px+3,py+3],[px-3,py+2],[side*7,-41],[side*5,-38]],p.fur);
 oval(px,py,open?4:3,3,p.light);if(open){rect(px-4,py-3,2,3,p.light);rect(px-1,py-5,2,4,p.light);rect(px+2,py-4,2,3,p.light);}else rect(px-2,py-2,4,1,p.shade);
 poly([[8,-34],[13,-35],[20,-43],[17,-47],[11,-41],[6,-40]],p.shade);oval(19,-45,4,3,p.light);
}g.restore();}

function scratch(c){const p=palette[c.id],l=c.id==='lumi',t=c.age+(l?0:1.3),stretch=(1-Math.cos(t*2))*1.6;
 g.save();g.translate(c.x,c.y);oval(3,2,18,3,'#79694d25');
 // Thick curved tail, planted hind feet, and a rounded rump carry the stretch.
 for(let i=0;i<12;i++){const u=i/11;oval(11+17*u,-8-8*u+Math.sin(u*Math.PI)*3+Math.sin(t*1.8-u)*u*1.5,l?3.5:3,l?3.5:3,i>8?p.dark:p.fur);}
 oval(8,-13,l?12:11,12,p.shade);oval(6,-15,l?11:10,12,p.fur);
 rect(9,-10,6,11,p.shade);rect(7,-2,10,4,p.light);rect(-2,-10,6,11,p.fur);rect(-4,-2,10,4,p.light);
 poly([[-4,-12],[-10,-28-stretch],[-9,-37-stretch],[-2,-41-stretch],[7,-32],[14,-15],[9,-7]],p.shade);
 poly([[-5,-14],[-8,-29-stretch],[-6,-37-stretch],[0,-38-stretch],[5,-29],[11,-16],[6,-10]],p.fur);
 poly([[-7,-17],[-11,-29-stretch],[-9,-36-stretch],[-4,-35-stretch],[-2,-19]],p.light);
 if(!l){rect(4,-26,3,8,p.shade);rect(7,-21,3,6,p.shade);}
 // Alternating slow claw strokes, palms stay on the rope surface.
 const stroke=a=>{const f=((t*.9+a)%1);return f<.65?f/.65:(1-f)/.35;};
 const farY=-53+stroke(.5)*7,nearY=-55+stroke(0)*8;
 line(-2,-33-stretch,-14,farY+4,p.shade,5);oval(-16,farY,4,3,p.light);
 // Retain original large head, small nose and pointed ears: no protruding rodent muzzle.
 g.save();g.translate(-7,-37-stretch);
 poly([[-12,-5],[-12,-15],[-5,-11],[5,-11],[11,-15],[12,-4]],p.shade);
 poly([[-11,-6],[-10,-13],[-4,-9]],p.dark);poly([[5,-9],[10,-13],[11,-5]],p.dark);
 poly([[-10,-8],[-10,-11],[-7,-9]],p.ear);poly([[7,-9],[9,-11],[10,-7]],p.ear);
 oval(0,-2,l?13:14,l?10:11,p.fur);rect(11,-4,2,6,p.shade);
 if(l){oval(-2,-1,9,8,p.dark);rect(-9,8,17,2,p.light);rect(-6,10,12,2,p.light);}else{oval(-2,4,10,5,p.light);rect(-7,-10,14,2,'#e9c38b');rect(-4,-9,2,3,p.shade);rect(2,-9,2,3,p.shade);}
 for(const x of [-8,2]){rect(x,-4,4,5,p.eye);rect(x,-3,2,4,'#364445');rect(x,-4,1,1,p.light);}
 rect(-5,2,3,2,l?'#403735':p.nose);rect(-4,4,1,2,p.dark);rect(-6,6,2,1,p.dark);rect(-3,6,2,1,p.dark);
 line(-10,4,-16,3,p.light);line(-10,6,-16,7,p.light);line(5,4,12,3,p.light);g.restore();
 line(-6,-30-stretch,-13,nearY+5,p.fur,6);line(-13,nearY+5,-16,nearY,p.fur,5);oval(-17,nearY,4,3,p.light);
 for(const x of [-19,-17,-15])rect(x,nearY-2,1,2,p.shade);
 // Tiny contact marks move with the paw, not detached speed lines.
 if(stroke(0)>.15&&stroke(0)<.8){line(-20,nearY,-20,nearY+4,p.light);line(-18,nearY+2,-18,nearY+5,p.light);}
 g.restore();}

root.CatPoses={
 scratch(ctx,c,feet){g=ctx;scratch({...c,y:feet});},
 roll(ctx,c,feet){g=ctx;roll({...c,y:feet},c.age);},
 back(ctx,c,feet,t){g=ctx;back({...c,y:feet},t);},
 standing(ctx,c,feet,bird){g=ctx;back({...c,y:feet},c.age,c.level===4&&c.x>=84&&bird?.phase==='perch',bird);}
};
if(typeof module!=='undefined')module.exports=root.CatPoses;
})(typeof window!=='undefined'?window:globalThis);
