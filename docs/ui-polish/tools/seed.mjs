const API='http://localhost:3992';
const j=async(method,path,token,body)=>{ const r=await fetch(API+path,{method,headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})}); let d=null; try{d=await r.json();}catch{} return {status:r.status,d}; };
async function user(email,username){
  let r=await j('POST','/auth/login',null,{email,password:'Abcdef1!'});
  if(!r.d?.token) r=await j('POST','/auth/register',null,{email,password:'Abcdef1!',username});
  const meR=await j('GET','/auth/me',r.d.token);
  return { token:r.d.token, uniqueId:meR.d.uniqueId ?? meR.d.user?.uniqueId, username };
}
const me=await user('long.name.tester@example-company.uz','Abdurahmonov Muhammadali Akbar'); // 30 chars
const names=['Nodirbek Xudoyberdiyev Sultono','Gulnora Abdurahmonova','Sardorbek','Dilshod Karimov','Malika','Jasurbek Tursunboyev','Zarina Ismoilova','Bobur','Shahnoza Rahimova','Otabek Yusupov','Kamola','Javohir Ergashev'];
const friends=[];
for (const [i,n] of names.entries()){ const u=await user(`ui.friend${i}@x.com`,n); friends.push(u); await j('POST','/friends/request',me.token,{uniqueId:u.uniqueId}); await j('PATCH','/friends/accept',u.token,{uniqueId:me.uniqueId}); }
// one incoming pending request
const pend=await user('ui.pending@x.com','Pending Requester Longname Abc'); await j('POST','/friends/request',pend.token,{uniqueId:me.uniqueId});
// long group
const g=await j('POST','/groups',me.token,{name:"Toshkent Davlat Universiteti Bitiruvchilari 2026"});
for (const f of friends.slice(0,6)) await j('POST',`/groups/${g.d.id ?? g.d.group?.id}/members`,me.token,{uniqueId:f.uniqueId});
await j('POST','/groups',me.token,{name:'Oila'});
// receipts
async function receipt(name, participants, items){
  const s=await j('POST','/sessions',me.token,{}); const sessionId=s.d.id;
  const r=await j('POST','/sessions/finalize',me.token,{sessionId,sessionName:name,currency:'UZS',participants:participants.map(p=>({uniqueId:p.uniqueId,username:p.username})),items});
  return [r.status, JSON.stringify(r.d).slice(0,200)];
}
const P=[me,friends[0],friends[1]]; console.log(P.map(p=>p.uniqueId));
console.log(await receipt("Rayhon milliy taomlar restorani — tug'ilgan kun", P, [
 {id:'a',name:"Qozonkabob qo'y go'shtidan maxsus ziravorlar bilan (katta porsiya)",kind:'item',quantity:3,unitPrice:4115226,totalPrice:12345678,splitMode:'equal',assignedTo:P.map(p=>p.uniqueId),perPersonCount:{}},
 {id:'b',name:'Choy',kind:'item',quantity:1,unitPrice:15000,totalPrice:15000,splitMode:'equal',assignedTo:[me.uniqueId],perPersonCount:{}},
 {id:'c',name:'Xizmat haqi 15%',kind:'fee',quantity:1,unitPrice:1854101,totalPrice:1854101,splitMode:'equal',assignedTo:[],perPersonCount:{}}]));
// a receipt where I owe someone (created by friend)
{ const f=friends[2]; const s=await j('POST','/sessions',f.token,{}); console.log((await j('POST','/sessions/finalize',f.token,{sessionId:s.d.id,sessionName:'Evos',currency:'UZS',participants:[f,me].map(p=>({uniqueId:p.uniqueId,username:p.username})),items:[{id:'x',name:'Lavash',kind:'item',quantity:2,unitPrice:34000,totalPrice:68000,splitMode:'equal',assignedTo:[f.uniqueId,me.uniqueId],perPersonCount:{}}]})).status); }
console.log('me', me.uniqueId);
