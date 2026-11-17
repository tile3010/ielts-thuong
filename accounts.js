import { pushDatabase } from './database.js';
export const multiUser=()=>process.env.AUTH_MODE==='supabase';
const normalized=value=>String(value||'').trim().toLowerCase();
export const isOwner=user=>Boolean(process.env.OWNER_EMAIL&&user.email_confirmed_at&&normalized(user.email)===normalized(process.env.OWNER_EMAIL));
export async function authRequest(path,body,token,admin=false){
 const key=admin?process.env.SUPABASE_SECRET_KEY:process.env.SUPABASE_PUBLISHABLE_KEY;
 if(!key||!process.env.SUPABASE_URL)throw new Error('Thiếu cấu hình Supabase Auth.');
 const headers={apikey:key,'Content-Type':'application/json','User-Agent':'ThuongIELTS-Server/1.0'};
 if(token)headers.Authorization='Bearer '+token;else if(admin&&key.startsWith('eyJ'))headers.Authorization='Bearer '+key;
 const response=await fetch(process.env.SUPABASE_URL.replace(/\/+$/,'')+'/auth/v1/'+path,{method:body?'POST':'GET',headers,...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(12000)});
 const data=await response.json().catch(()=>({}));if(!response.ok)throw Object.assign(new Error(response.status===401?'Supabase Auth từ chối xác thực. Kiểm tra tài khoản hoặc cấu hình API key.':'Không xử lý được yêu cầu Supabase Auth.'),{status:response.status});return data;
}
export function sessionCookies(req,res,session){const secure=process.env.VERCEL||req.socket.encrypted?'; Secure':'';res.setHeader('Set-Cookie',['ielts_access='+session.access_token+'; HttpOnly; SameSite=Strict; Path=/; Max-Age='+Math.max(60,session.expires_in||3600)+secure,'ielts_refresh='+session.refresh_token+'; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000'+secure])}
export async function currentUser(req,res){
 const cookies=Object.fromEntries((req.headers.cookie||'').split(';').map(s=>s.trim().split(/=(.*)/s).slice(0,2)).filter(a=>a.length===2));let user;
 if(cookies.ielts_access){try{user=await authRequest('user',null,cookies.ielts_access)}catch(error){if(error.status!==401&&error.status!==403)throw error}}
 if(!user&&cookies.ielts_refresh){try{const session=await authRequest('token?grant_type=refresh_token',{refresh_token:cookies.ielts_refresh});user=session.user;sessionCookies(req,res,session)}catch(error){if(error.status!==400&&error.status!==401&&error.status!==403)throw error}}
 return admittedUser(user);
}
// Call only with a user returned by the trusted Supabase Auth API.
export async function admittedUser(user){
 if(!user?.id)return null;
 if(!process.env.OWNER_EMAIL)throw new Error('Chưa cấu hình OWNER_EMAIL.');
 const db=await pushDatabase();if(isOwner(user))await db.query('insert into public.ielts_members(user_id,display_name) values($1,$2) on conflict(user_id) do nothing',[user.id,'Thương']);
 const member=(await db.query('select display_name,active,daily_ai_limit from public.ielts_members where user_id=$1',[user.id])).rows[0];if(!member?.active)return null;
 return {...user,member,owner:isOwner(user)};
}
export async function userProgress(userId){return (await (await pushDatabase()).query('select state,revision::integer,updated_at from public.ielts_user_progress where user_id=$1',[userId])).rows[0]||null}
export async function saveUserProgress(userId,state,revision){try{return (await (await pushDatabase()).query(revision?'update public.ielts_user_progress set state=$1::jsonb,revision=revision+1,updated_at=now() where user_id=$2 and revision=$3 returning revision::integer,updated_at':'insert into public.ielts_user_progress(state,user_id,revision) values($1::jsonb,$2,1) returning revision::integer,updated_at',revision?[JSON.stringify(state),userId,revision]:[JSON.stringify(state),userId])).rows[0]||null}catch(error){if(error.code==='23505')return null;throw error}}
export async function reserveAi(user){const limit=user.member.daily_ai_limit;const result=await(await pushDatabase()).query(`insert into public.ielts_ai_usage(user_id,day,calls) select $1,(now() at time zone 'Asia/Ho_Chi_Minh')::date,1 where $2>0 on conflict(user_id,day) do update set calls=ielts_ai_usage.calls+1 where ielts_ai_usage.calls<$2 returning calls`,[user.id,limit]);return result.rowCount>0}
export async function createLearner(body){
 const email=normalized(body.email),name=String(body.name||'Learner').trim().slice(0,60),password=String(body.password||'');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||password.length<12||password.length>128)throw new Error('Email không hợp lệ hoặc mật khẩu chưa đủ 12 ký tự.');
 const result=await authRequest('admin/users',{email,password,email_confirm:true,user_metadata:{name}},null,true);const id=result.id||result.user?.id;if(!id)throw new Error('Không tạo được tài khoản.');
 await(await pushDatabase()).query('insert into public.ielts_members(user_id,display_name) values($1,$2) on conflict(user_id) do update set display_name=excluded.display_name',[id,name]);return {id,email,name};
}
export async function listLearners(){return(await(await pushDatabase()).query('select m.user_id,m.display_name,m.active,m.daily_ai_limit,u.email from public.ielts_members m join auth.users u on u.id=m.user_id order by m.created_at')).rows}
export async function updateLearner(owner,body){if(body.userId===owner.id)throw new Error('Không thể khóa tài khoản chủ trang.');const limit=Number(body.limit);if(!Number.isInteger(limit)||limit<0||limit>100||typeof body.active!=='boolean')throw new Error('Giới hạn không hợp lệ.');await(await pushDatabase()).query('update public.ielts_members set active=$1,daily_ai_limit=$2 where user_id=$3',[body.active,limit,body.userId])}
export async function migrateOwner(user){if(!user.owner)throw new Error('Forbidden');return(await(await pushDatabase()).query(`insert into public.ielts_user_progress(user_id,state,revision) select $1,state,1 from public.ielts_progress where id='thuong' on conflict(user_id) do nothing returning user_id`,[user.id])).rowCount>0}
