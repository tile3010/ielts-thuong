import { createHash } from 'node:crypto';
import { pushDatabase } from './database.js';
import { multiUser } from './accounts.js';
let schema;
async function database(){const db=await pushDatabase();if(!schema)schema=db.query(`create table if not exists public.ielts_push (id text primary key, subscription jsonb not null, last_day text, created_at timestamptz not null default now()); alter table public.ielts_push enable row level security; revoke all on public.ielts_push from anon, authenticated;`).catch(e=>{schema=null;throw e});await schema;return db}
export const pushReady=()=>Boolean(process.env.VAPID_PUBLIC_KEY&&process.env.VAPID_PRIVATE_KEY&&process.env.PGHOST);
const idFor=endpoint=>createHash('sha256').update(endpoint).digest('hex');
export function validateSubscription(value){
  if(!value||typeof value.endpoint!=='string'||value.endpoint.length>2048)throw new Error('Đăng ký thông báo không hợp lệ.');
  const url=new URL(value.endpoint),hosts=['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com'];
  if(url.protocol!=='https:'||url.username||url.password||url.port||(!hosts.includes(url.hostname)&&!url.hostname.endsWith('.notify.windows.com')))throw new Error('Dịch vụ thông báo chưa được hỗ trợ.');
  if(!/^[A-Za-z0-9_-]{80,100}$/.test(value.keys?.p256dh||'')||!/^[A-Za-z0-9_-]{20,30}$/.test(value.keys?.auth||''))throw new Error('Khóa đăng ký thông báo không hợp lệ.');
  return {endpoint:value.endpoint,keys:{p256dh:value.keys.p256dh,auth:value.keys.auth}};
}
export async function subscribePush(value,userId=null){const subscription=validateSubscription(value),db=await database();if(multiUser())await db.query('insert into public.ielts_push(id,subscription,user_id) values($1,$2::jsonb,$3) on conflict(id) do update set subscription=excluded.subscription,user_id=excluded.user_id',[idFor(subscription.endpoint),JSON.stringify(subscription),userId]);else await db.query('insert into public.ielts_push(id,subscription) values($1,$2::jsonb) on conflict(id) do update set subscription=excluded.subscription',[idFor(subscription.endpoint),JSON.stringify(subscription)])}
export async function unsubscribePush(value,userId=null){const subscription=validateSubscription(value),db=await database();await db.query('delete from public.ielts_push where id=$1'+(multiUser()?' and user_id=$2':''),multiUser()?[idFor(subscription.endpoint),userId]:[idFor(subscription.endpoint)])}
export function reminderText(name){const display=String(name||'Thương').trim().slice(0,60)||'bạn';return 'Đi học tiếng Anh đi, mày muốn dốt tiếng Anh hoài vậy '+display+'!'}
async function send(subscription,test=false,learnerName=null){const webpush=await import('web-push');return webpush.sendNotification(subscription,JSON.stringify({title:test?'Thương IELTS · Gửi thử':'Thương IELTS',body:reminderText(learnerName),url:'/',tag:test?'ielts-test':'ielts-evening'}),{TTL:3600,timeout:10000,vapidDetails:{subject:process.env.VAPID_SUBJECT||'https://ielts-thuong-inky.vercel.app',publicKey:process.env.VAPID_PUBLIC_KEY,privateKey:process.env.VAPID_PRIVATE_KEY}})}
export async function testPush(value,userId=null){const subscription=validateSubscription(value);let name=null;if(multiUser()){const result=await(await database()).query('select m.display_name from public.ielts_push p join public.ielts_members m on m.user_id=p.user_id where p.id=$1 and p.user_id=$2 and m.active',[idFor(subscription.endpoint),userId]);if(!result.rowCount)throw Error('Subscription not owned');name=result.rows[0].display_name}return send(subscription,true,name)}
export async function sendDailyPush(){
  const db=await database(),day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const rows=(await db.query(multiUser()?'select p.id,p.subscription,m.display_name from public.ielts_push p join public.ielts_members m on m.user_id=p.user_id where m.active and p.last_day is distinct from $1 limit 20':'select id,subscription from public.ielts_push where last_day is distinct from $1 limit 20',[day])).rows;
  let sent=0,failed=0;
  for(const row of rows){const claimed=await db.query('update public.ielts_push set last_day=$1 where id=$2 and last_day is distinct from $1 returning id',[day,row.id]);if(!claimed.rowCount)continue;
    try{await send(validateSubscription(row.subscription),false,row.display_name);sent++}catch(e){failed++;if([404,410].includes(e.statusCode))await db.query('delete from public.ielts_push where id=$1',[row.id]);else await db.query('update public.ielts_push set last_day=null where id=$1 and last_day=$2',[row.id,day]);}
  }return {sent,failed};
}
