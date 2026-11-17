import { createECDH, randomBytes } from 'node:crypto';
import { readFileSync, appendFileSync } from 'node:fs';
const file=new URL('../.env',import.meta.url);let text='';try{text=readFileSync(file,'utf8')}catch{}
const key=createECDH('prime256v1');key.generateKeys();
const values={VAPID_PUBLIC_KEY:key.getPublicKey().toString('base64url'),VAPID_PRIVATE_KEY:key.getPrivateKey().toString('base64url'),VAPID_SUBJECT:'https://ielts-thuong-inky.vercel.app',CRON_SECRET:randomBytes(32).toString('hex')};
let added=0;for(const [name,value] of Object.entries(values)){if(!new RegExp('^'+name+'=','m').test(text)){appendFileSync(file,'\n'+name+'='+value+'\n');added++}}
console.log('Push settings saved in .env. Added '+added+' variables. Keep them private; copy to Vercel Environment Variables.');
