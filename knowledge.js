/* Local, reviewed knowledge selector. The source text stays in knowledge_library.json. */
(function(root){
'use strict';
const DAY=86400000,KEY='lh-knowledge-v1';
const localDay=(date=new Date())=>{
 const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,'0'),d=String(date.getDate()).padStart(2,'0');
 return `${y}-${m}-${d}`;
};
class KnowledgeTicker{
 constructor(library,storage,random=Math.random,now=()=>Date.now()){
  this.library=library;this.storage=storage;this.random=random;this.now=now;this.items=(library.items||[]).filter(item=>item.enabled&&item.age_level==='低年級');
  this.byId=new Map(this.items.map(item=>[item.id,item]));this.day=localDay(new Date(now()));
  let saved={};try{saved=JSON.parse(storage.getItem(KEY)||'{}')||{};}catch{}
  const cutoff=now()-7*DAY;this.history=Array.isArray(saved.history)?saved.history.filter(entry=>entry&&Number.isFinite(entry.id)&&Number.isFinite(entry.at)&&entry.at>=cutoff):[];
  const seed=[...this.day].reduce((sum,ch)=>sum+ch.charCodeAt(0),0);this.limit=1+seed%3;
  this.daily=saved.day===this.day&&Array.isArray(saved.daily)?saved.daily.filter(entry=>this.byId.has(entry.id)).slice(0,this.limit):[];
  this.persist();
 }
 get visible(){return this.daily.map(entry=>this.byId.get(entry.id)).filter(Boolean);}
 recentIds(){return new Set(this.history.map(entry=>entry.id));}
 weightedPick(pool){
  if(!pool.length)return null;const weights=this.library.categories||{};let total=0;
  const weighted=pool.map(item=>{const weight=Math.max(1,Number(weights[item.category]?.weight)||1);total+=weight;return {item,end:total};});
  const value=this.random()*total;return weighted.find(entry=>value<entry.end)?.item||weighted.at(-1).item;
 }
 add(trigger='random',alternates=[],fallback=false){
  const triggers=[trigger,...alternates].filter(Boolean),recent=this.recentIds(),current=new Set(this.daily.map(entry=>entry.id));
  let pool=[];for(const name of triggers){pool=this.items.filter(item=>item.trigger===name&&!recent.has(item.id)&&!current.has(item.id));if(pool.length)break;}
  if(!pool.length&&fallback)pool=this.items.filter(item=>item.trigger==='random'&&!recent.has(item.id)&&!current.has(item.id));
  if(!pool.length)pool=this.items.filter(item=>!recent.has(item.id)&&!current.has(item.id));
  const item=this.weightedPick(pool);if(!item)return null;
  const entry={id:item.id,source:trigger==='random'?'random':'event'};
  if(this.daily.length<this.limit)this.daily.push(entry);
  else if(entry.source==='event'){
   const index=this.daily.findIndex(value=>value.source==='random');if(index<0)return null;this.daily[index]=entry;
  }else return null;
  this.history.push({id:item.id,at:this.now()});this.persist();return item;
 }
 persist(){try{this.storage.setItem(KEY,JSON.stringify({day:this.day,daily:this.daily,history:this.history}));}catch{}}
}
root.KnowledgeTicker=KnowledgeTicker;
if(typeof module!=='undefined')module.exports={KnowledgeTicker,localDay};
})(typeof window!=='undefined'?window:globalThis);
