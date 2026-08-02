import { spawn, spawnSync } from 'node:child_process';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import net from 'node:net';
import process from 'node:process';

import { hash } from 'bcryptjs';
import pg from 'pg';
import puppeteer from 'puppeteer-core';

const root = process.cwd();
const container = `tandil-phase6d-browser-${process.pid}-${randomBytes(3).toString('hex')}`;
const nextBinary = `${root}/node_modules/next/dist/bin/next`;
function run(command, args, options = {}) { const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', env: options.env ?? process.env, stdio: options.capture ? ['ignore','pipe','pipe'] : 'inherit' }); if (result.status !== 0) throw new Error(`${command} terminó con código ${result.status ?? 'desconocido'}`); return result; }
function docker(args, options = {}) { return run('docker', args, options); }
async function unusedPort() { return new Promise((resolve, reject) => { const server = net.createServer(); server.once('error', reject); server.listen(0, '127.0.0.1', () => { const address = server.address(); if (!address || typeof address === 'string') return reject(new Error('Puerto local inválido')); server.close((error) => error ? reject(error) : resolve(address.port)); }); }); }
function chromeExecutable() { for (const candidate of [process.env.PUPPETEER_EXECUTABLE_PATH,'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/google-chrome-stable',process.env.PROGRAMFILES ? `${process.env.PROGRAMFILES}/Google/Chrome/Application/chrome.exe` : undefined].filter(Boolean)) if (spawnSync(candidate, ['--version'], { encoding: 'utf8' }).status === 0) return candidate; throw new Error('No se encontró Chrome'); }
async function waitForHttp(url, child) { for (let attempt=0; attempt<120; attempt+=1) { if (child.exitCode !== null) throw new Error('Next.js finalizó'); try { if ((await fetch(url,{redirect:'manual'})).status<500) return; } catch {} await new Promise((resolve)=>setTimeout(resolve,500)); } throw new Error('Next.js no quedó disponible'); }
async function terminate(child) { if (!child || child.exitCode !== null) return; child.kill('SIGTERM'); await Promise.race([new Promise((resolve)=>child.once('exit',resolve)),new Promise((resolve)=>setTimeout(resolve,5000))]); if (child.exitCode===null) child.kill('SIGKILL'); }
function decodeBase32(input) { const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; let bits=0; let value=0; const output=[]; for (const character of input.replaceAll(' ','').toUpperCase()) { value=(value<<5)|alphabet.indexOf(character); bits+=5; if(bits>=8){output.push((value >>> (bits-8))&255);bits-=8;} } return Buffer.from(output); }
function totp(secret, stepOffset=0) { const step=BigInt(Math.floor(Date.now()/30000)+stepOffset); const counter=Buffer.alloc(8); counter.writeBigUInt64BE(step); const digest=createHmac('sha1',decodeBase32(secret)).update(counter).digest(); const offset=digest[digest.length-1]&15; const binary=((digest[offset]&127)<<24)|(digest[offset+1]<<16)|(digest[offset+2]<<8)|digest[offset+3]; return String(binary%1_000_000).padStart(6,'0'); }
async function clickText(page, text) { await page.evaluate((label) => { const element=[...document.querySelectorAll('button,a')].find((item)=>item.textContent?.includes(label)); if (!(element instanceof HTMLElement)) throw new Error(`No se encontró ${label}`); element.click(); }, text); }
async function loginPrimary(page, appUrl, email, password) { await page.goto(`${appUrl}/login?callbackUrl=/perfil`,{waitUntil:'networkidle0'}); await page.type('#email',email); await page.type('#password',password); await page.click('button[type="submit"]'); }
async function clearSession(page) { const cookies=await page.cookies(); if(cookies.length) await page.browserContext().deleteCookie(...cookies); }

let started=false; let app; let browser; let database;
try {
  docker(['run','--detach','--name',container,'-e','POSTGRES_HOST_AUTH_METHOD=trust','-p','127.0.0.1::5432','postgres:17-alpine'],{capture:true}); started=true;
  for(let attempt=0;attempt<40;attempt+=1){if(spawnSync('docker',['exec',container,'pg_isready','-U','postgres'],{encoding:'utf8'}).status===0)break;if(attempt===39)throw new Error('PostgreSQL no disponible');await new Promise((resolve)=>setTimeout(resolve,250));}
  const mapping=docker(['port',container,'5432/tcp'],{capture:true}).stdout.trim(); const databasePort=Number(mapping.slice(mapping.lastIndexOf(':')+1)); const databaseUrl=`postgresql://postgres@127.0.0.1:${databasePort}/postgres`;
  const appPort=await unusedPort(); const appUrl=`http://127.0.0.1:${appPort}`;
  const encryptionKey=randomBytes(32).toString('base64');
  const environment={...process.env,DATABASE_URL:databaseUrl,NEXTAUTH_URL:appUrl,NEXTAUTH_SECRET:randomBytes(48).toString('base64url'),APP_URL:appUrl,NEXT_PUBLIC_APP_URL:appUrl,APP_INTERNAL_URL:appUrl,VIEW_TRACKING_SECRET:randomBytes(48).toString('base64url'),AUTH_ENCRYPTION_KEY:encryptionKey,AUTH_TOTP_ISSUER:'Propea Group QA',RATE_LIMIT_BACKEND:'memory'};
  run('npx',['prisma','migrate','deploy'],{env:environment});
  database=new pg.Client({connectionString:databaseUrl}); await database.connect();
  const marker=randomUUID(); const email=`browser-6d-${marker}@example.invalid`; const password=randomBytes(18).toString('base64url'); const userId=`browser-6d-${marker}`;
  await database.query('INSERT INTO "User" (id,rol,nombre,email,"passwordHash","twoFactorEnabled","emailVerifiedAt",activo,"createdAt","updatedAt") VALUES ($1,\'USUARIO_NORMAL\',\'Persona Ficticia 6D\',$2,$3,false,CURRENT_TIMESTAMP,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)',[userId,email,await hash(password,4)]);
  await database.query('INSERT INTO "AuthSessionVersion" (id,"userId",version,"updatedAt") VALUES ($1,$2,0,CURRENT_TIMESTAMP)',[`version-${marker}`,userId]);
  app=spawn(process.execPath,[nextBinary,'dev','--hostname','127.0.0.1','--port',String(appPort)],{cwd:root,env:environment,stdio:['ignore','pipe','pipe']}); await waitForHttp(`${appUrl}/login`,app);
  browser=await puppeteer.launch({executablePath:chromeExecutable(),headless:true,args:['--no-first-run','--disable-background-networking']}); const page=await browser.newPage(); const browserErrors=[]; page.on('pageerror',(error)=>browserErrors.push(error.message));

  await loginPrimary(page,appUrl,email,password); await page.waitForFunction(()=>location.pathname==='/perfil',{timeout:30000});
  await page.waitForSelector('#twoFactorSetupPassword',{timeout:30000}); await page.type('#twoFactorSetupPassword',password); await clickText(page,'Activar'); await page.waitForSelector('#totpSetupCode');
  const qrSource=await page.$eval('img[alt*="Código QR"]',(element)=>element.getAttribute('src')); if(!qrSource?.startsWith('data:image/png;base64,'))throw new Error('QR no fue local');
  const manualKey=await page.$eval('code',(element)=>element.textContent?.replaceAll(' ','')??''); if(!manualKey)throw new Error('Falta clave manual');
  await page.type('#totpSetupCode',totp(manualKey)); await clickText(page,'Activar'); await page.waitForFunction(()=>document.body.textContent?.includes('Guardá tus códigos de recuperación'));
  const codes=(await page.$eval('pre',(element)=>element.textContent??'')).trim().split('\n'); if(codes.length<6)throw new Error('Faltan recovery codes');
  await page.click('input[type="checkbox"]'); await clickText(page,'Finalizar'); await page.waitForFunction(()=>location.pathname==='/login',{timeout:30000});

  await loginPrimary(page,appUrl,email,password); await page.waitForFunction(()=>document.body.textContent?.includes('Verificación en dos pasos'));
  const probe=await browser.newPage(); await probe.goto(`${appUrl}/perfil`,{waitUntil:'networkidle0'}); if(new URL(probe.url()).pathname==='/perfil')throw new Error('Challenge parcial accedió al perfil'); await probe.close();
  await page.type('#secondFactorCode',totp(manualKey,1)); await clickText(page,'Verificar'); await page.waitForFunction(()=>location.pathname==='/perfil',{timeout:30000});

  await clearSession(page); await loginPrimary(page,appUrl,email,password); await page.waitForFunction(()=>document.body.textContent?.includes('Verificación en dos pasos')); await clickText(page,'Usar un código de recuperación'); await page.type('#secondFactorCode',codes[0]); await clickText(page,'Verificar'); await page.waitForFunction(()=>location.pathname==='/perfil',{timeout:30000});
  await clearSession(page); await loginPrimary(page,appUrl,email,password); await page.waitForFunction(()=>document.body.textContent?.includes('Verificación en dos pasos')); await clickText(page,'Usar un código de recuperación'); await page.type('#secondFactorCode',codes[0]); await clickText(page,'Verificar'); await page.waitForFunction(()=>document.body.textContent?.includes('No pudimos validar el código'));
  await loginPrimary(page,appUrl,email,password); await page.waitForFunction(()=>document.body.textContent?.includes('Verificación en dos pasos')); await clickText(page,'Usar un código de recuperación'); await page.type('#secondFactorCode',codes[1]); await clickText(page,'Verificar'); await page.waitForFunction(()=>location.pathname==='/perfil',{timeout:30000});

  await page.waitForFunction(()=>document.body.textContent?.includes('Estado: Activada')); await clickText(page,'Desactivar verificación'); await page.type('#twoFactorManagementPassword',password); await clickText(page,'Usar código de recuperación'); await page.type('#twoFactorManagementCode',codes[2]); await clickText(page,'Confirmar'); await page.waitForFunction(()=>location.pathname==='/login',{timeout:30000});
  await loginPrimary(page,appUrl,email,password); await page.waitForFunction(()=>location.pathname==='/perfil',{timeout:30000});

  await page.setViewport({width:390,height:844,deviceScaleFactor:1}); await page.goto(`${appUrl}/perfil`,{waitUntil:'networkidle0'}); const mobile=await page.evaluate(()=>{const sections=[...document.querySelectorAll('section')];return sections.every((section)=>{const box=section.getBoundingClientRect();return box.left>=0&&box.right<=innerWidth;});}); if(!mobile)throw new Error('Perfil 2FA no es usable en móvil');
  if(browserErrors.length)throw new Error(`Errores de navegador: ${browserErrors.length}`);
  process.stdout.write('phase6d browser: setup/QR/manual key, one-time recovery display, no pre-2FA session, TOTP login, recovery one-time login, disable and password-only login: ok\n');
} finally { if(database)await database.end().catch(()=>undefined); if(browser)await browser.close().catch(()=>undefined); await terminate(app); if(started)spawnSync('docker',['rm','--force',container],{encoding:'utf8'}); }
