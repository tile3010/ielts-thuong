import { readFileSync } from 'node:fs';

const settings={};
for(const line of readFileSync(new URL('.env',import.meta.url),'utf8').split(/\r?\n/)){
  const match=line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
  if(match)settings[match[1]]=match[2].replace(/^['"]|['"]$/g,'');
}
const base=settings.SUPABASE_URL?.replace(/\/+$/,''),key=settings.SUPABASE_SECRET_KEY;
if(!base||!key){console.log('Missing SUPABASE_URL or SUPABASE_SECRET_KEY in .env.');process.exit(1)}
console.log('Key type:',key.startsWith('sb_secret_')?'secret':key.startsWith('eyJ')?'legacy JWT':'unknown');
console.log('Key contains repeated prefix:',(key.match(/sb_secret_/g)||[]).length>1);
console.log('Key contains masking characters:',/[•●…*]/.test(key));
console.log('Environment overrides .env:',Boolean((process.env.SUPABASE_URL&&process.env.SUPABASE_URL!==settings.SUPABASE_URL)||(process.env.SUPABASE_SECRET_KEY&&process.env.SUPABASE_SECRET_KEY!==key)));
const headers={apikey:key,'User-Agent':'ThuongIELTS-Diagnostic/1.0'};
if(key.startsWith('eyJ'))headers.Authorization='Bearer '+key;
try{
  const response=await fetch(base+'/rest/v1/ielts_progress?select=id&limit=1',{headers,signal:AbortSignal.timeout(15000)});
  const body=await response.json().catch(()=>({}));
  console.log('HTTP:',response.status);
  if(response.ok)console.log('SUCCESS: Supabase key and table access are working.');
  else for(const field of ['code','message','hint','error'])if(typeof body[field]==='string')console.log(field+':',body[field].replaceAll(key,'[REDACTED]').replace(/sb_secret_[A-Za-z0-9_-]+/g,'[REDACTED]').slice(0,500));
}catch(error){console.log('Connection error:',error.cause?.code||error.name)}
