import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rootCertificates } from 'node:tls';
let pool;
export async function pushDatabase(){return db()}
async function db(){if(!pool){const {default:pg}=await import('pg');pool=new pg.Pool({host:process.env.PGHOST,port:Number(process.env.PGPORT||5432),database:process.env.PGDATABASE||'postgres',user:process.env.PGUSER,password:process.env.PGPASSWORD,ssl:{rejectUnauthorized:true,...(process.env.PGSSLROOTCERT?{ca:[...rootCertificates,readFileSync(resolve(fileURLToPath(new URL('.',import.meta.url)),process.env.PGSSLROOTCERT),'utf8')]}:{})},max:3,connectionTimeoutMillis:12000,statement_timeout:15000});pool.on('error',()=>console.error('Database connection interrupted'));}return pool}
export async function readProgress(){return (await (await db()).query('select state,revision::integer,updated_at from public.ielts_progress where id=$1',['thuong'])).rows[0]||null}
export async function writeProgress(state,revision){try{return (await (await db()).query(revision?'update public.ielts_progress set state=$1::jsonb,revision=revision+1,updated_at=now() where id=$2 and revision=$3 returning revision::integer,updated_at':'insert into public.ielts_progress(state,id,revision,updated_at) values($1::jsonb,$2,1,now()) returning revision::integer,updated_at',revision?[JSON.stringify(state),'thuong',revision]:[JSON.stringify(state),'thuong'])).rows[0]||null}catch(e){if(e.code==='23505')return null;throw e}}
