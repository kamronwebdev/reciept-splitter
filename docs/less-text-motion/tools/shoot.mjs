// usage: node shoot.mjs <outDir> [configFilter]
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const OUT = process.argv[2] || '/tmp/claude-0/ltm/before';
const ONLY = process.argv[3] || '';
const base='http://localhost:8096', API='http://localhost:3992';
const EMAIL='long.name.tester@example-company.uz', PASS='Abcdef1!';
const CONFIGS = [
  { id:'en-light-375', lang:'en', scheme:'light', w:375, h:667, scale:'default' },
  { id:'en-light-430', lang:'en', scheme:'light', w:430, h:932, scale:'default' },
  { id:'uz-light-375-L', lang:'uz', scheme:'light', w:375, h:667, scale:'large' },
  { id:'uz-dark-430-L', lang:'uz', scheme:'dark', w:430, h:932, scale:'large' },
  { id:'ja-dark-375', lang:'ja', scheme:'dark', w:375, h:667, scale:'default' },
].filter(c => !ONLY || c.id.includes(ONLY));
const api=async(method,path,token,body)=>{ const r=await fetch(API+path,{method,headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})}); return r.json(); };
const login = await api('POST','/auth/login',null,{email:EMAIL,password:PASS});
const token = login.token;
const me = await api('GET','/auth/me',token);
const friends = await api('GET','/friends',token);
const groups = await api('GET','/groups',token);
const gLong = groups.find(g=>g.name.startsWith('Toshkent'));
const session = await api('POST','/sessions',token,{});
const hist = await api('GET','/sessions/history?limit=5',token);
const bigReceipt = hist.entries.find(e=>e.sessionName?.startsWith('Rayhon'));
const F = friends.slice(0,3);
const draft = { state: {
  active:true, step:'split', sessionId: session.id, sessionName:"Rayhon milliy taomlar restorani — tug'ilgan kun", currency:'UZS', source:'manual', imageUri:null, receiptGrandTotal: 12500000, feeMode:'proportional', finalized: undefined,
  participants:[{uniqueId:me.uniqueId,username:me.username,avatarUrl:null}, ...F.map(f=>({uniqueId:f.uniqueId,username:f.username,avatarUrl:f.avatarUrl??null}))],
  items:[
   {id:'i1',name:"Qozonkabob qo'y go'shtidan maxsus ziravorlar bilan (katta porsiya, 3 kishilik)",kind:'item',quantity:3,unitPrice:4115226,totalPrice:12345678,splitMode:'equal',assignedTo:[me.uniqueId,F[0].uniqueId],perPersonCount:{}},
   {id:'i2',name:'Choy',kind:'item',quantity:2,unitPrice:15000,totalPrice:30000,splitMode:'count',assignedTo:[],perPersonCount:{[me.uniqueId]:1}},
   {id:'i3',name:'Somsa',kind:'item',quantity:1,unitPrice:18000,totalPrice:18000,splitMode:'equal',assignedTo:[],perPersonCount:{}},
   {id:'f1',name:'Xizmat haqi 15%',kind:'fee',quantity:1,unitPrice:1859052,totalPrice:1859052,splitMode:'equal',assignedTo:[],perPersonCount:{}},
  ]}, version: 2 };

const SCREENS = [
  ['home','/home'], ['notifications','/home/notifications'], ['balances','/home/balances'], ['history','/home/history'],
  ['receipt-detail', `/home/history/${bigReceipt?.sessionId}`],
  ['groups','/groups'], ['group-detail', `/groups/${gLong?.id}`], ['group-create','/groups/create'], ['group-invite', `/groups/invite?groupId=${gLong?.id}`],
  ['friends','/friends'], ['friend-requests','/friends/requests'], ['friend-search','/friends/search'],
  ['profile','/profile'], ['settings','/profile/settings'], ['my-qr','/my-qr'], ['scan-qr','/scan-invite'],
  ['receipt-scan','/receipt/scan'], ['receipt-review','/receipt/review'], ['receipt-people','/receipt/people'], ['receipt-split','/receipt/split'],
];
const PUBLIC = [['welcome','/'], ['login','/login'], ['register','/register'], ['forgot','/forgot-password']];

const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox'] });
for (const c of CONFIGS) {
  const ctx = await b.newContext({ viewport:{width:c.w,height:c.h}, colorScheme:c.scheme, deviceScaleFactor:1 });
  await ctx.addInitScript(([lang,scale,draft])=>{
    localStorage.setItem('app-store', JSON.stringify({ state:{ themeMode:'system', fontFamily:'inter', textScale:scale, language:lang }, version:2 }));
    if (!localStorage.getItem('__draft_set')) { localStorage.setItem('receipt-draft', JSON.stringify(draft)); localStorage.setItem('__draft_set','1'); }
    // camera denied everywhere (permission screens are part of the pass)
    navigator.mediaDevices && (navigator.mediaDevices.getUserMedia=()=>Promise.reject(new DOMException('denied','NotAllowedError')));
    const q=navigator.permissions.query.bind(navigator.permissions); navigator.permissions.query=(o)=>o&&o.name==='camera'?Promise.resolve({state:'denied',onchange:null,addEventListener(){},removeEventListener(){}}):q(o);
  }, [c.lang, c.scale, draft]);
  const page = await ctx.newPage(); const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  for (const [name,url] of PUBLIC) {
    await page.goto(base+url); await page.waitForTimeout(1800);
    fs.mkdirSync(`${OUT}/${name}`,{recursive:true}); await page.screenshot({path:`${OUT}/${name}/${c.id}.png`});
  }
  await page.goto(base+'/login'); await page.waitForTimeout(1500);
  const ins=page.locator('input'); await ins.nth(0).fill(EMAIL); await ins.nth(1).fill(PASS);
  await page.keyboard.press('Enter'); await page.waitForTimeout(3500);
  for (const [name,url] of SCREENS) {
    await page.goto(base+url); await page.waitForTimeout(2600);
    fs.mkdirSync(`${OUT}/${name}`,{recursive:true}); await page.screenshot({path:`${OUT}/${name}/${c.id}.png`});
  }
  // a full-page view of long screens
  for (const [name,url] of [['home-full','/home'],['profile-full','/profile'],['group-detail-full',`/groups/${gLong?.id}`],['friends-full','/friends']]) {
    await page.goto(base+url); await page.waitForTimeout(2600);
    fs.mkdirSync(`${OUT}/${name}`,{recursive:true});
    // the scroll container is inside the app: screenshot after scrolling to the bottom
    await page.mouse.move(c.w/2, c.h/2); await page.mouse.wheel(0, 5000); await page.waitForTimeout(700);
    await page.screenshot({path:`${OUT}/${name}/${c.id}.png`});
  }
  console.log(c.id, 'done', errors.slice(0,3));
  await ctx.close();
}
await b.close();
