// usage: node quick.mjs out.png path [w h scheme lang scale wait reducedMotion]
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const [out, url, w='375', h='667', scheme='light', lang='en', scale='default', wait='2500', rm='no-preference'] = process.argv.slice(2);
const API='http://localhost:3992';
const r = await fetch(API+'/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'long.name.tester@example-company.uz',password:'Abcdef1!'})}); const {token} = await r.json();
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox'] });
const ctx = await b.newContext({ viewport:{width:+w,height:+h}, colorScheme:scheme, reducedMotion: rm });
await ctx.addInitScript(([lang,scale,token])=>{ localStorage.setItem('app-store', JSON.stringify({ state:{ themeMode:'system', fontFamily:'inter', textScale:scale, language:lang }, version:2 })); localStorage.setItem('auth_token', token); }, [lang, scale, token]);
const page = await ctx.newPage(); const errs=[]; page.on('pageerror',e=>errs.push(e.message)); page.on('console',m=>{ if(m.type()==='error') errs.push(m.text().slice(0,200)); });
await page.goto('http://localhost:8096'+url); await page.waitForTimeout(+wait);
await page.screenshot({path:out}); console.log('errors:', errs.slice(0,5)); await b.close();
