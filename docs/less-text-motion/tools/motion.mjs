// records the motion: frames of home loading, a sheet opening, the split -> summary success check; with/without reduced motion
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const rm = process.argv[2] || 'no-preference'; const OUT = `/tmp/claude-0/ltm/motion-${rm}`; fs.mkdirSync(OUT,{recursive:true});
const API='http://localhost:3992';
const j=async(m,p,tok,b)=>{const r=await fetch(API+p,{method:m,headers:{'content-type':'application/json',...(tok?{authorization:'Bearer '+tok}:{})},...(b?{body:JSON.stringify(b)}:{})});return r.json();};
const {token} = await j('POST','/auth/login',null,{email:'long.name.tester@example-company.uz',password:'Abcdef1!'});
const me = await j('GET','/auth/me',token); const friends = await j('GET','/friends',token); const session = await j('POST','/sessions',token,{});
const F=friends.slice(0,2);
const draft={state:{active:true,step:'split',sessionId:session.id,sessionName:'Motion test',currency:'UZS',source:'manual',imageUri:null,receiptGrandTotal:null,feeMode:'proportional',
 participants:[{uniqueId:me.uniqueId,username:me.username,avatarUrl:null},...F.map(f=>({uniqueId:f.uniqueId,username:f.username,avatarUrl:null}))],
 items:[{id:'i1',name:'Plov',kind:'item',quantity:1,unitPrice:90000,totalPrice:90000,splitMode:'equal',assignedTo:[],perPersonCount:{}},{id:'i2',name:'Choy',kind:'item',quantity:1,unitPrice:15000,totalPrice:15000,splitMode:'equal',assignedTo:[],perPersonCount:{}}]},version:2};
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox'] });
const ctx = await b.newContext({ viewport:{width:375,height:667}, reducedMotion: rm });
await ctx.addInitScript(([token,draft])=>{ localStorage.setItem('app-store', JSON.stringify({ state:{ themeMode:'system', fontFamily:'inter', textScale:'default', language:'en' }, version:2 })); localStorage.setItem('auth_token', token); if(!localStorage.getItem('__d')){localStorage.setItem('receipt-draft', JSON.stringify(draft)); localStorage.setItem('__d','1');} }, [token,draft]);
const page = await ctx.newPage(); const errs=[]; page.on('pageerror',e=>errs.push(e.message));
const burst=async(name,n,gap)=>{ for(let i=0;i<n;i++){ await page.screenshot({path:`${OUT}/${name}-${String(i).padStart(2,'0')}.png`}); await page.waitForTimeout(gap);} };
// home: wait for app shell then catch the stagger
await page.goto('http://localhost:8096/friends'); await page.waitForTimeout(2500);
await page.getByText('Groups').last().click(); await burst('tab-groups', 6, 40);
// action sheet (long press a friend row) on web
await page.goto('http://localhost:8096/friends'); await page.waitForTimeout(2500);
const row = page.getByText('Javohir Ergashev').first(); await row.hover(); await page.mouse.down(); await page.waitForTimeout(700); await page.mouse.up();
await burst('sheet-open', 6, 40); await page.waitForTimeout(400); await page.screenshot({path:`${OUT}/sheet-open-final.png`});
await page.getByText('Cancel').last().click(); await burst('sheet-close', 5, 40);
// split -> finish -> summary
await page.goto('http://localhost:8096/receipt/split'); await page.waitForTimeout(2500);
await page.getByText('Split equally').click(); await burst('split-totals', 6, 50);
await page.getByText('Finish').click(); await page.waitForTimeout(600); await burst('summary', 8, 50); await page.waitForTimeout(800);
await page.screenshot({path:`${OUT}/summary-final.png`});
// paid toggle -> check draws
const tog = page.getByRole('switch').first(); await tog.click(); await burst('paid', 5, 50);
console.log('errors', errs.slice(0,5)); await b.close();
