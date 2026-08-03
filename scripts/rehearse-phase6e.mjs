import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import process from 'node:process';

const root = process.cwd();
const migrationRoot = `${root}/database/migrations`;
const phase6e = '20260804120000_phase6e_session_management';
const integrationOnly = process.argv.includes('--integration-only');
const container = `tandil-phase6e-${process.pid}-${randomBytes(3).toString('hex')}`;
for (const argument of process.argv.slice(2)) if (argument !== '--integration-only') throw new Error(`Argumento no reconocido: ${argument}`);

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', env: options.env ?? process.env, input: options.input, stdio: options.capture ? ['pipe','pipe','pipe'] : ['pipe','inherit','inherit'] });
  if (!options.allowFailure && result.status !== 0) throw new Error(`${command} terminó con código ${result.status ?? 'desconocido'}${result.stderr ? `: ${result.stderr.trim()}` : ''}`);
  return result;
}
function docker(args, options = {}) { return run('docker', args, options); }
function sql(database, input, options = {}) { return docker(['exec','-i',container,'psql','-X','-q','-At','-v','ON_ERROR_STOP=1','-U','postgres','-d',database], { input, capture: true, allowFailure: options.allowFailure }); }
function url(database, port) { return `postgresql://postgres@127.0.0.1:${port}/${database}`; }
function createDatabase(name) { for (let attempt=0;attempt<30;attempt+=1) { if (docker(['exec',container,'createdb','-U','postgres',name],{allowFailure:true,capture:true}).status===0)return; Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,250); } throw new Error(`No se creó ${name}`); }
function prisma(args, databaseUrl, options={}) { return run('npx',['prisma',...args],{...options,env:{...process.env,DATABASE_URL:databaseUrl}}); }
function applyBefore6e(database) { for (const name of readdirSync(migrationRoot,{withFileTypes:true}).filter((entry)=>entry.isDirectory()&&entry.name<phase6e).map((entry)=>entry.name).sort()) sql(database,readFileSync(`${migrationRoot}/${name}/migration.sql`,'utf8')); }
function integration(database, port) { const databaseUrl=url(database,port); run('npx',['tsx','--test','tests/integration/auth-phase6e-postgres.test.ts'],{env:{...process.env,NODE_ENV:'test',DATABASE_URL:databaseUrl,PHASE6E_DATABASE_URL:databaseUrl,NEXTAUTH_URL:'http://localhost:3000',NEXTAUTH_SECRET:randomBytes(48).toString('base64url'),APP_URL:'http://localhost:3000',AUTH_ENCRYPTION_KEY:randomBytes(32).toString('base64')}}); }

function empty(port) {
  createDatabase('phase6e_empty'); const databaseUrl=url('phase6e_empty',port); prisma(['migrate','deploy'],databaseUrl);
  const drift=prisma(['migrate','diff','--exit-code','--from-config-datasource','--to-schema','database/schema.prisma'],databaseUrl,{capture:true,allowFailure:true});
  if(drift.status!==0)throw new Error(`Drift 6E: ${drift.stdout}${drift.stderr}`);
  const structure=sql('phase6e_empty',`SELECT count(*) FROM information_schema.tables WHERE table_name='AuthSession';
SELECT count(*) FROM pg_constraint WHERE conname IN ('AuthSession_session_version_check','AuthSession_expiry_check','AuthSession_seen_check','AuthSession_revocation_check','AuthSession_userId_fkey');
SELECT count(*) FROM pg_indexes WHERE indexname IN ('AuthSession_sessionHash_key','AuthSession_userId_revokedAt_expiresAt_lastSeenAt_idx','AuthSession_expiresAt_idx');
SELECT count(*) FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid WHERE t.typname='SecurityEventType' AND e.enumlabel IN ('SESSION_CREATED','SESSION_REVOKED','OTHER_SESSIONS_REVOKED','ALL_SESSIONS_REVOKED','SESSION_EXPIRED');`).stdout.trim();
  if(structure!=='1\n5\n3\n5')throw new Error(`Estructura 6E inesperada: ${structure}`);
  integration('phase6e_empty',port);
  process.stdout.write('phase6e empty: 22 migrations, constraints, concurrency and zero drift: ok\n');
}

const fixture=`INSERT INTO "User" (id,rol,nombre,email,"passwordHash","twoFactorEnabled","twoFactorSecret","emailVerifiedAt",activo,"createdAt","updatedAt") VALUES
('phase6e-owner','INMOBILIARIA','Titular 6E','owner-6e@example.invalid','$2b$12$aaaaaaaaaaaaaaaaaaaaaaBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',false,NULL,CURRENT_TIMESTAMP,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('phase6e-user','USUARIO_NORMAL','Persona 6E','user-6e@example.invalid','$2b$12$ccccccccccccccccccccccDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD',false,NULL,CURRENT_TIMESTAMP,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
INSERT INTO "AuthSessionVersion" (id,"userId",version,"updatedAt") VALUES ('phase6e-v1','phase6e-owner',2,CURRENT_TIMESTAMP),('phase6e-v2','phase6e-user',0,CURRENT_TIMESTAMP);
INSERT INTO "Inmobiliaria" (id,"userId","nombreAgencia",cuit,direccion,"createdAt","updatedAt") VALUES ('phase6e-tenant','phase6e-owner','Agencia 6E','30-69000000-1','Calle Ficticia 690',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
INSERT INTO "Propiedad" (id,"inmobiliariaId",titulo,descripcion,estado,tipo,operacion,precio,moneda,direccion,latitud,longitud,"m2Total","m2Cubiertos",ambientes,dormitorios,banos,cocheras,caracteristicas,imagenes,"createdAt","updatedAt") VALUES ('phase6e-property','phase6e-tenant','Casa 6E','Descripción ficticia suficientemente extensa.','DISPONIBLE','Casa','VENTA',12345.67,'USD','Calle Ficticia 691',-37.32,-59.13,100,80,3,2,1,1,ARRAY['patio'],'[]'::jsonb,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);`;
const snapshot=`SELECT count(*)||':'||min(id)||':'||max("passwordHash")||':'||max(rol::text) FROM "User";
SELECT count(*)||':'||min(id) FROM "Inmobiliaria";
SELECT count(*)||':'||min(id)||':'||max(precio::text)||':'||max(moneda::text) FROM "Propiedad";
SELECT count(*)||':'||min(version)::text FROM "AuthSessionVersion";`;
function upgrade(){createDatabase('phase6e_upgrade');applyBefore6e('phase6e_upgrade');sql('phase6e_upgrade',fixture);const before=sql('phase6e_upgrade',snapshot).stdout;sql('phase6e_upgrade',readFileSync(`${migrationRoot}/${phase6e}/preflight.sql`,'utf8'));sql('phase6e_upgrade',readFileSync(`${migrationRoot}/${phase6e}/migration.sql`,'utf8'));if(sql('phase6e_upgrade',snapshot).stdout!==before)throw new Error('Upgrade 6E modificó datos');if(sql('phase6e_upgrade','SELECT count(*) FROM "AuthSession";').stdout.trim()!=='0')throw new Error('Upgrade creó sesiones falsas');process.stdout.write('phase6e upgrade: users, bcrypt, roles, tenant, business and versions preserved: ok\n');}
function invalid(){createDatabase('phase6e_invalid');applyBefore6e('phase6e_invalid');sql('phase6e_invalid',fixture.replace('false,NULL,CURRENT_TIMESTAMP,true','false,\'legacy-sensitive-fixture\',CURRENT_TIMESTAMP,true'));const result=sql('phase6e_invalid',readFileSync(`${migrationRoot}/${phase6e}/preflight.sql`,'utf8'),{allowFailure:true});const output=`${result.stdout}${result.stderr}`;if(result.status===0||!output.includes('legacy two-factor secrets: 1 row(s)'))throw new Error('Preflight 6E no abortó');if(output.includes('legacy-sensitive-fixture'))throw new Error('Preflight 6E expuso secreto');if(sql('phase6e_invalid',`SELECT count(*) FROM information_schema.tables WHERE table_name='AuthSession';`).stdout.trim()!=='0')throw new Error('DDL 6E ejecutado tras preflight');process.stdout.write('phase6e invalid legacy fixture: safe abort without DDL or disclosure: ok\n');}
function rollback(port){createDatabase('phase6e_rollback');prisma(['migrate','deploy'],url('phase6e_rollback',port));sql('phase6e_rollback',readFileSync(`${migrationRoot}/${phase6e}/rollback.sql`,'utf8'));const state=sql('phase6e_rollback',`SELECT count(*) FROM information_schema.tables WHERE table_name='AuthSession'; SELECT count(*) FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid WHERE t.typname='SecurityEventType' AND e.enumlabel='SESSION_CREATED';`).stdout.trim();if(state!=='0\n0')throw new Error(`Rollback 6E incompleto: ${state}`);process.stdout.write('phase6e rollback: structural rollback verified; backup required after use: ok\n');}

let started=false;
try{docker(['run','--detach','--name',container,'-e','POSTGRES_HOST_AUTH_METHOD=trust','-p','127.0.0.1::5432','postgres:17-alpine'],{capture:true});started=true;for(let attempt=0;attempt<40;attempt+=1){if(docker(['exec',container,'pg_isready','-U','postgres'],{allowFailure:true,capture:true}).status===0)break;Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,250);}const mapping=docker(['port',container,'5432/tcp'],{capture:true}).stdout.trim();const port=Number(mapping.slice(mapping.lastIndexOf(':')+1));if(integrationOnly){createDatabase('phase6e_integration');prisma(['migrate','deploy'],url('phase6e_integration',port));integration('phase6e_integration',port);process.stdout.write('phase6e PostgreSQL integration: ok\n');}else{empty(port);upgrade();invalid();rollback(port);}}finally{if(started)docker(['rm','--force',container],{allowFailure:true,capture:true});}
