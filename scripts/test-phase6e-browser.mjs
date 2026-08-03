import { spawn, spawnSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import net from 'node:net';
import process from 'node:process';
import { hash } from 'bcryptjs';
import pg from 'pg';
import puppeteer from 'puppeteer-core';

const root=process.cwd();const container=`tandil-phase6e-browser-${process.pid}-${randomBytes(3).toString('hex')}`;const nextBinary=`${root}/node_modules/next/dist/bin/next`;
function run(command,args,options={}){const result=spawnSync(command,args,{cwd:root,encoding:'utf8',env:options.env??process.env,stdio:options.capture?['ignore','pipe','pipe']:'inherit'});if(result.status!==0)throw new Error(`${command} terminó con código ${result.status??'desconocido'}`);return result;}
function docker(args,options={}){return run('docker',args,options);}
async function unusedPort(){return new Promise((resolve,reject)=>{const server=net.createServer();server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const address=server.address();if(!address||typeof address==='string')return reject(new Error('Puerto inválido'));server.close((error)=>error?reject(error):resolve(address.port));});});}
function chromeExecutable(){for(const candidate of [process.env.PUPPETEER_EXECUTABLE_PATH,'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/google-chrome-stable',process.env.PROGRAMFILES?`${process.env.PROGRAMFILES}/Google/Chrome/Application/chrome.exe`:undefined].filter(Boolean))if(spawnSync(candidate,['--version'],{encoding:'utf8'}).status===0)return candidate;throw new Error('No se encontró Chrome');}
async function waitForHttp(url,child){for(let attempt=0;attempt<120;attempt+=1){if(child.exitCode!==null)throw new Error('Next.js finalizó');try{if((await fetch(url,{redirect:'manual'})).status<500)return;}catch{}await new Promise((resolve)=>setTimeout(resolve,500));}throw new Error('Next.js no quedó disponible');}
async function terminate(child){if(!child||child.exitCode!==null)return;child.kill('SIGTERM');await Promise.race([new Promise((resolve)=>child.once('exit',resolve)),new Promise((resolve)=>setTimeout(resolve,5000))]);if(child.exitCode===null)child.kill('SIGKILL');}
async function login(page,appUrl,email,password){await page.goto(`${appUrl}/login?callbackUrl=/perfil`,{waitUntil:'networkidle0'});await page.type('#email',email);await page.type('#password',password);await page.click('button[type="submit"]');await page.waitForFunction(()=>location.pathname==='/perfil',{timeout:30000});await page.waitForFunction(()=>document.body.textContent?.includes('Sesiones activas'),{timeout:30000});}
async function expectRejected(page,appUrl){await page.goto(`${appUrl}/perfil`,{waitUntil:'networkidle0'});if(new URL(page.url()).pathname==='/perfil')throw new Error('Una sesión revocada conservó acceso');}
async function clickText(page,text){await page.evaluate((label)=>{const element=[...document.querySelectorAll('button,a')].find((item)=>item.textContent?.includes(label));if(!(element instanceof HTMLElement))throw new Error(`No se encontró ${label}`);element.click();},text);}

let started=false;let app;let browser;let database;
try{
  docker(['run','--detach','--name',container,'-e','POSTGRES_HOST_AUTH_METHOD=trust','-p','127.0.0.1::5432','postgres:17-alpine'],{capture:true});started=true;
  for(let attempt=0;attempt<40;attempt+=1){if(spawnSync('docker',['exec',container,'pg_isready','-U','postgres'],{encoding:'utf8'}).status===0)break;if(attempt===39)throw new Error('PostgreSQL no disponible');await new Promise((resolve)=>setTimeout(resolve,250));}
  const mapping=docker(['port',container,'5432/tcp'],{capture:true}).stdout.trim();const databasePort=Number(mapping.slice(mapping.lastIndexOf(':')+1));const databaseUrl=`postgresql://postgres@127.0.0.1:${databasePort}/postgres`;const appPort=await unusedPort();const appUrl=`http://127.0.0.1:${appPort}`;
  const environment={...process.env,DATABASE_URL:databaseUrl,NEXTAUTH_URL:appUrl,NEXTAUTH_SECRET:randomBytes(48).toString('base64url'),APP_URL:appUrl,NEXT_PUBLIC_APP_URL:appUrl,APP_INTERNAL_URL:appUrl,VIEW_TRACKING_SECRET:randomBytes(48).toString('base64url'),AUTH_ENCRYPTION_KEY:randomBytes(32).toString('base64'),RATE_LIMIT_BACKEND:'memory'};
  run('npx',['prisma','migrate','deploy'],{env:environment});database=new pg.Client({connectionString:databaseUrl});await database.connect();
  const marker=randomUUID();const userId=`browser-6e-${marker}`;const email=`browser-6e-${marker}@example.invalid`;const password=randomBytes(18).toString('base64url');
  await database.query('INSERT INTO "User" (id,rol,nombre,email,"passwordHash","twoFactorEnabled","emailVerifiedAt",activo,"createdAt","updatedAt") VALUES ($1,\'USUARIO_NORMAL\',\'Persona Ficticia 6E\',$2,$3,false,CURRENT_TIMESTAMP,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)',[userId,email,await hash(password,4)]);
  await database.query('INSERT INTO "AuthSessionVersion" (id,"userId",version,"updatedAt") VALUES ($1,$2,0,CURRENT_TIMESTAMP)',[`version-${marker}`,userId]);
  app=spawn(process.execPath,[nextBinary,'dev','--hostname','127.0.0.1','--port',String(appPort)],{cwd:root,env:environment,stdio:['ignore','pipe','pipe']});await waitForHttp(`${appUrl}/login`,app);
  browser=await puppeteer.launch({executablePath:chromeExecutable(),headless:true,args:['--no-first-run','--disable-background-networking']});
  const contexts=await Promise.all([browser.createBrowserContext(),browser.createBrowserContext(),browser.createBrowserContext()]);const pages=await Promise.all(contexts.map((context)=>context.newPage()));const [pageA,pageB,pageC]=pages;const browserErrors=[];for(const page of pages)page.on('pageerror',(error)=>browserErrors.push(error.message));
  await pageA.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X) Chrome/140.0.0.0 Safari/537.36');
  await pageB.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Version/18.0 Mobile Safari/604.1');
  await pageC.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0');
  await login(pageA,appUrl,email,password);await login(pageB,appUrl,email,password);await login(pageC,appUrl,email,password);
  if(Number((await database.query('SELECT count(*)::int AS count FROM "AuthSession" WHERE "userId"=$1 AND "revokedAt" IS NULL',[userId])).rows[0].count)!==3)throw new Error('No se crearon tres sesiones independientes');

  await pageA.reload({waitUntil:'networkidle0'});await pageA.waitForFunction(()=>document.body.textContent?.includes('Safari en iOS'));
  await pageA.evaluate(()=>{const row=[...document.querySelectorAll('li')].find((item)=>item.textContent?.includes('Safari en iOS'));const button=row?.querySelector('button');if(!(button instanceof HTMLButtonElement))throw new Error('No se encontró sesión B');button.click();});
  await clickText(pageA,'Confirmar cierre');await pageA.waitForFunction(()=>document.body.textContent?.includes('sesión seleccionada fue cerrada'));
  await expectRejected(pageB,appUrl);await pageC.goto(`${appUrl}/perfil`,{waitUntil:'networkidle0'});if(new URL(pageC.url()).pathname!=='/perfil')throw new Error('La sesión C fue afectada por revocación individual');

  await login(pageB,appUrl,email,password);await pageA.goto(`${appUrl}/perfil`,{waitUntil:'networkidle0'});await pageA.waitForFunction(()=>document.body.textContent?.includes('Cerrar todas las demás sesiones'));await clickText(pageA,'Cerrar todas las demás sesiones');await pageA.type('#sessionManagementPassword',password);await clickText(pageA,'Confirmar');await pageA.waitForFunction(()=>document.body.textContent?.includes('Esta sesión continúa activa'));
  await expectRejected(pageB,appUrl);await expectRejected(pageC,appUrl);await pageA.goto(`${appUrl}/perfil`,{waitUntil:'networkidle0'});if(new URL(pageA.url()).pathname!=='/perfil')throw new Error('Cerrar otras invalidó A');

  await login(pageB,appUrl,email,password);await pageA.goto(`${appUrl}/perfil`,{waitUntil:'networkidle0'});await clickText(pageA,'Cerrar todas las sesiones');await pageA.type('#sessionManagementPassword',password);await clickText(pageA,'Confirmar');await pageA.waitForFunction(()=>location.pathname==='/login',{timeout:30000});await expectRejected(pageB,appUrl);
  const active=Number((await database.query('SELECT count(*)::int AS count FROM "AuthSession" WHERE "userId"=$1 AND "revokedAt" IS NULL',[userId])).rows[0].count);if(active!==0)throw new Error('Cerrar todas dejó registros activos');

  const contextD=await browser.createBrowserContext();const pageD=await contextD.newPage();await login(pageD,appUrl,email,password);const sessionId=(await database.query('SELECT id FROM "AuthSession" WHERE "userId"=$1 AND "revokedAt" IS NULL ORDER BY "issuedAt" DESC LIMIT 1',[userId])).rows[0]?.id;await pageD.goto(`${appUrl}/api/auth/signout`,{waitUntil:'networkidle0'});const csrf=await pageD.$eval('input[name="csrfToken"]',(element)=>element.value);await pageD.evaluate(async(token)=>{await fetch('/api/auth/signout',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({csrfToken:token,callbackUrl:'/'})});},csrf);for(let attempt=0;attempt<30;attempt+=1){const row=await database.query('SELECT "revokedAt" FROM "AuthSession" WHERE id=$1',[sessionId]);if(row.rows[0]?.revokedAt)break;if(attempt===29)throw new Error('Logout no revocó sesión server-side');await new Promise((resolve)=>setTimeout(resolve,100));}

  await pageA.setViewport({width:390,height:844,deviceScaleFactor:1});await login(pageA,appUrl,email,password);const mobile=await pageA.evaluate(()=>[...document.querySelectorAll('section')].every((section)=>{const box=section.getBoundingClientRect();return box.left>=0&&box.right<=innerWidth;}));if(!mobile)throw new Error('Sesiones no son usables en móvil');if(browserErrors.length)throw new Error(`Errores browser: ${browserErrors.length}`);
  process.stdout.write('phase6e browser: three sessions, current marker, individual/cross-session revoke, close others, close all, logout registry and mobile: ok\n');
}finally{if(database)await database.end().catch(()=>undefined);if(browser)await browser.close().catch(()=>undefined);await terminate(app);if(started)spawnSync('docker',['rm','--force',container],{encoding:'utf8'});}
