import { createServer } from 'node:http';
import { readFile, readFileSync } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)));

function loadEnv() {
  try {
    const text = readFileSync(join(root, '.env'), 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    }
  } catch {}
}
loadEnv();

const port = Number(process.env.PORT || 3000);
const model = process.env.OPENAI_MODEL || 'gpt-6-luna';

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(type.startsWith('application/json') ? JSON.stringify(body) : body);
}

async function readJson(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (Buffer.byteLength(raw) > 100_000) throw Object.assign(new Error('Request is too large.'), { status: 413 });
  }
  try { return JSON.parse(raw || '{}'); }
  catch { throw Object.assign(new Error('Invalid JSON request.'), { status: 400 }); }
}

const text = (value, max = 4000) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const list = (value, max = 30) => Array.isArray(value) ? value.slice(-max) : [];

async function requestModel(instructions, payload, maxOutputTokens = 1400) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === 'your_api_key_here') {
    throw Object.assign(new Error('Chưa cấu hình API key. Hãy sao chép .env.example thành .env và thêm OPENAI_API_KEY.'), { status: 503 });
  }
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      instructions,
      input: JSON.stringify(payload),
      max_output_tokens: maxOutputTokens
    })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = result.error?.message || `OpenAI API trả về lỗi ${response.status}.`;
    throw Object.assign(new Error(message), { status: response.status >= 500 ? 502 : response.status });
  }
  const output = (result.output || []).flatMap(item => item.content || [])
    .filter(item => item.type === 'output_text').map(item => item.text).join('\n').trim();
  if (!output) throw Object.assign(new Error('Model không trả về nội dung.'), { status: 502 });
  try { return JSON.parse(output); }
  catch { return { text: output }; }
}

const sessionPrompt = `Bạn là gia sư IELTS cá nhân, giải thích bằng tiếng Việt cho người học đang khoảng band 3.5, mục tiêu 5.5. Đánh giá đúng phần thể hiện trong dữ liệu, không suy diễn thành band chính thức. Xem xét câu trả lời, đáp án, điểm tự chấm, thời lượng và lỗi gần đây. Nêu hiệu quả buổi học, điểm làm tốt, tối đa ba điểm cần sửa, bài tập cụ thể cho lần tới và mức ưu tiên bốn kỹ năng. Tăng tần suất và tạo thêm bài cho kỹ năng yếu; không bỏ hẳn kỹ năng nào. Trả JSON hợp lệ, không markdown, theo cấu trúc: {"summary":"...","strengths":["..."],"improvements":["..."],"next_steps":["..."],"skill_focus":{"listening":1,"reading":1,"writing":1,"speaking":1},"extra_exercise":{"skill":"...","task":"...","minutes":15}}. skill_focus là số nguyên 1–5, số càng cao nghĩa là cần ưu tiên nhiều hơn.`;

const monthlyTestPrompt = `Tạo bài kiểm tra tổng thể IELTS phù hợp người học tiếng Việt ở khoảng band 3.5, mục tiêu 5.5. Bài gồm 4 kỹ năng, tổng thời lượng 60 phút, hướng dẫn bằng tiếng Việt và đề bằng tiếng Anh dễ tiếp cận. Listening cần audio_script ngắn, 4 câu hỏi; Reading có passage 120–180 từ và 4 câu hỏi; Writing có một đề viết đoạn 80–120 từ; Speaking có cue card nói 1–2 phút. Bao gồm answer_key cho Listening/Reading và rubric tự chấm Writing/Speaking, nhưng không hiển thị đáp án trước khi nộp. Trả JSON hợp lệ, không markdown: {"title":"...","duration_minutes":60,"listening":{"instructions":"...","audio_script":"...","questions":["..."],"answer_key":["..."]},"reading":{"instructions":"...","passage":"...","questions":["..."],"answer_key":["..."]},"writing":{"instructions":"...","prompt":"...","rubric":["..."],"word_target":"..."},"speaking":{"instructions":"...","cue_card":"...","rubric":["..."]}}.`;

const monthlyReviewPrompt = `Bạn là gia sư IELTS cá nhân. Đánh giá bài kiểm tra tổng thể và dữ liệu luyện tập tháng của người học tiếng Việt, trình độ khoảng band 3.5, mục tiêu 5.5. Chấm Listening/Reading theo answer_key và câu trả lời; Writing/Speaking theo rubric, phản hồi, không tuyên bố band chính thức. So sánh các kỹ năng, nêu tiến bộ, lỗi lặp lại và kế hoạch tháng sau. Kỹ năng yếu cần được học thường xuyên và có bài tập bổ sung. Trả JSON hợp lệ, không markdown: {"overview":"...","scores":{"listening":1,"reading":1,"writing":1,"speaking":1},"strengths":["..."],"priorities":["..."],"next_month_plan":["..."],"recommended_focus":{"listening":1,"reading":1,"writing":1,"speaking":1}}. Điểm 1–5 là thang đánh giá nội bộ, không phải band IELTS.`;

const newsTopics={seo:'SEO Google search',digital:'digital marketing',marketing:'marketing strategy',agents:'AI agents',ai:'artificial intelligence',finance:'personal finance',motivation:'personal development habits'};
const newsCache=new Map();
const loginSessions=new Map(),loginAttempts=new Map();
const passwordDigest=value=>createHash('sha256').update(value).digest();
const loginPage=()=>`<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Đăng nhập · Thương IELTS</title><style>body{margin:0;background:#f2f7f4;font:16px system-ui;color:#173e33;min-height:100vh;display:grid;place-items:center}main{background:white;border:1px solid #dbe6df;border-radius:24px;padding:36px;max-width:360px;width:calc(100% - 100px);box-shadow:0 12px 40px #174d3310}h1{font-size:26px}input,button{box-sizing:border-box;width:100%;font:inherit;padding:13px;border-radius:10px;margin-top:12px}input{border:1px solid #b8ccc1}button{border:0;background:#166b58;color:white;cursor:pointer}p{line-height:1.6}#error{color:#a02a2a}</style><main><p>THƯƠNG IELTS</p><h1>Không gian học của bạn</h1><p>Nhập mật khẩu để tiếp tục học.</p><form id="login"><label for="password">Mật khẩu</label><input id="password" name="password" type="password" autocomplete="current-password" required autofocus maxlength="256"><button>Đăng nhập</button><p id="error" role="alert"></p></form></main><script>document.getElementById('login').onsubmit=async e=>{e.preventDefault();const b=e.target.querySelector('button');b.disabled=true;try{const r=await fetch('/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:document.getElementById('password').value})});const j=await r.json();if(!r.ok)throw Error(j.error);location.replace('/')}catch(e){document.getElementById('error').textContent=e.message}finally{b.disabled=false}}</script></html>`;
const xmlText=value=>String(value||'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Referrer-Policy','same-origin');
  if(req.method==='POST'&&req.headers.origin){try{if(new URL(req.headers.origin).host!==req.headers.host)return send(res,403,{error:'Invalid origin.'})}catch{return send(res,403,{error:'Invalid origin.'})}}
  const password=process.env.APP_PASSWORD;
  const token=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('ielts_session='))?.slice(14);
  const authenticated=Boolean(token&&loginSessions.get(token)>Date.now());
  if(req.method==='POST'&&url.pathname==='/auth/login'){
    const address=req.socket.remoteAddress||'local',attempt=loginAttempts.get(address);
    if(attempt?.until>Date.now()&&attempt.count>=5)return send(res,429,{error:'Nhập sai quá nhiều lần. Vui lòng thử lại sau 15 phút.'});
    if(!password)return send(res,503,{error:'Chủ trang cần đặt APP_PASSWORD trong .env rồi khởi động lại server.'});
    try{const body=await readJson(req);if(typeof body.password!=='string'||!timingSafeEqual(passwordDigest(body.password),passwordDigest(password))){const state=attempt?.until>Date.now()?attempt:{count:0,until:Date.now()+900000};state.count++;loginAttempts.set(address,state);return send(res,401,{error:'Mật khẩu không đúng.'})}
      loginAttempts.delete(address);const session=randomBytes(32).toString('hex');const expiry=Date.now()+86400000;for(const [key,value]of loginSessions)if(value<Date.now())loginSessions.delete(key);loginSessions.set(session,expiry);
      res.setHeader('Set-Cookie','ielts_session='+session+'; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400'+(req.socket.encrypted?'; Secure':''));return send(res,200,{ok:true});
    }catch{return send(res,400,{error:'Không thể đăng nhập. Vui lòng thử lại.'})}
  }
  if(req.method==='POST'&&url.pathname==='/auth/logout'){if(token)loginSessions.delete(token);res.setHeader('Set-Cookie','ielts_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return send(res,200,{ok:true})}
  if(!authenticated){if(url.pathname.startsWith('/api/'))return send(res,401,{error:'Vui lòng đăng nhập để tiếp tục.'});if(req.method==='GET')return send(res,200,loginPage(),'text/html; charset=utf-8');return send(res,401,{error:'Vui lòng đăng nhập.'})}
  if(req.method==='GET'&&url.pathname==='/api/news'){
    const topic=url.searchParams.get('topic')||'seo';if(!newsTopics[topic])return send(res,400,{error:'Unknown topic'});
    const cached=newsCache.get(topic);if(cached&&Date.now()-cached.time<1800000)return send(res,200,cached.result);
    try{const source='https://news.google.com/rss/search?q='+encodeURIComponent(newsTopics[topic]+' when:7d')+'&hl=en-US&gl=US&ceid=US:en';const response=await fetch(source,{signal:AbortSignal.timeout(10000)});if(!response.ok)throw new Error('News source unavailable');const xml=await response.text();const items=[...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0,6).map(match=>{const field=tag=>xmlText(match[1].match(new RegExp('<'+tag+'(?:\\s[^>]*)?>([\\s\\S]*?)</'+tag+'>'))?.[1]);return {title:field('title'),url:field('link'),publishedAt:field('pubDate'),source:field('source')}}).filter(item=>item.title&&item.url.startsWith('https://'));const result={items,updatedAt:new Date().toISOString()};newsCache.set(topic,{time:Date.now(),result});return send(res,200,result)}catch(error){return send(res,503,{error:'Chưa tải được tin mới. Hãy dùng liên kết nguồn hoặc thử lại sau.'})}
  }
  if (req.method === 'POST' && url.pathname === '/api/speaking') {
    try {
      if (!process.env.OPENAI_API_KEY) throw new Error('Chưa cấu hình OPENAI_API_KEY trong .env.');
      const chunks=[];let size=0;
      for await (const chunk of req) { size+=chunk.length;if(size>20_000_000)throw new Error('Bản thu quá lớn. Hãy thu tối đa 3 phút.');chunks.push(chunk); }
      if(size<100)throw new Error('Bản thu trống. Hãy ghi âm lại.');
      const mime=(req.headers['content-type']||'audio/webm').split(';')[0];
      const extension=mime.includes('mp4')?'mp4':mime.includes('ogg')?'ogg':'webm';
      const form=new FormData();form.append('model',process.env.OPENAI_TRANSCRIBE_MODEL||'gpt-transcribe');form.append('language','en');form.append('file',new Blob(chunks,{type:mime}),`speaking.${extension}`);
      const response=await fetch('https://api.openai.com/v1/audio/transcriptions',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`},body:form});
      const transcription=await response.json();
      if(!response.ok)throw new Error(transcription.error?.message||'Không chuyển được bản thu thành chữ.');
      const transcript=transcription.text||'';
      const result=await requestModel(sessionPrompt+' Với Speaking này chỉ có bản chép từ âm thanh. Đánh giá nội dung, từ vựng, ngữ pháp; không suy đoán phát âm hay độ trôi chảy từ transcript.',{skill:'speaking',transcript},1600);
      return send(res,200,{transcript,result,model});
    } catch(error){return send(res,502,{error:error.message});}
  }
  if (req.method === 'GET' && url.pathname === '/api/status') {
    return send(res, 200, { ready: Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_api_key_here'), model });
  }
  if (req.method === 'POST' && ['/api/assessment', '/api/monthly-test', '/api/monthly-assessment'].includes(url.pathname)) {
    try {
      const data = await readJson(req);
      let instructions;
      let payload;
      let maxTokens = 1600;
      if (url.pathname === '/api/assessment') {
        instructions = sessionPrompt + ` Bổ sung JSON lesson_review gồm correct_answers:[{question,answer,explanation}], good_expressions:[{expression,why}], topic: tên chủ đề bài học, vocabulary:[{word,ipa,meaning,example,paraphrases:[{phrase,example}],verbs:[{phrase,example}],synonyms:[{word,usage}]}]. Giải thích bằng tiếng Việt; câu ví dụ bằng tiếng Anh. Dựa đúng vào lessonContext và bài làm. Listening/Reading dùng đáp án được cung cấp và giải thích bằng bằng chứng. Writing/Speaking đưa câu trả lời mẫu và sửa câu của học viên, không coi câu mẫu là đáp án duy nhất. ipa là phiên âm IPA chuẩn Anh–Anh đặt trong dấu / /; nếu không chắc hãy để chuỗi rỗng, không bịa phiên âm. verbs gồm 2–3 động từ hoặc cụm động từ tự nhiên đi cùng từ trọng tâm, kèm ví dụ; không ép ghép từ không tự nhiên. Chọn 4–6 từ trọng tâm, phân biệt cách dùng từ gần nghĩa thay vì khẳng định thay thế được mọi ngữ cảnh. Không suy đoán phát âm từ văn bản.`;
        maxTokens = 4000;
        payload = {
          skill: text(data.skill, 20), currentLevel: text(data.currentLevel, 8), targetBand: text(data.targetBand, 8),
          session: data.session && typeof data.session === 'object' ? data.session : {},
          recentSessions: list(data.recentSessions, 20),
          lessonContext: data.lessonContext || {}
        };
      } else if (url.pathname === '/api/monthly-test') {
        instructions = monthlyTestPrompt;
        maxTokens = 2200;
        payload = { month: text(data.month, 16), currentLevel: text(data.currentLevel, 8), targetBand: text(data.targetBand, 8), skillHistory: list(data.sessions, 100) };
      } else {
        instructions = monthlyReviewPrompt;
        maxTokens = 1800;
        payload = {
          month: text(data.month, 16), currentLevel: text(data.currentLevel, 8), targetBand: text(data.targetBand, 8),
          test: data.test && typeof data.test === 'object' ? data.test : {},
          answers: data.answers && typeof data.answers === 'object' ? data.answers : {},
          sessions: list(data.sessions, 100), previousMonthReport: data.previousMonthReport || null
        };
      }
      const result = await requestModel(instructions, payload, maxTokens);
      return send(res, 200, { model, result });
    } catch (error) {
      return send(res, error.status || 500, { error: error.message || 'Không thể hoàn tất yêu cầu AI.' });
    }
  }
  if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed.' });
  let requested;
  try { requested = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname); }
  catch { return send(res, 400, 'Bad request.', 'text/plain; charset=utf-8'); }
  const file = resolve(root, `.${requested}`);
  if (file !== root && !file.startsWith(root + sep)) return send(res, 403, 'Forbidden.', 'text/plain; charset=utf-8');
  const publicPath = requested.replaceAll('\\', '/');
  if (publicPath !== '/index.html' && !/^\/(css|js)\/[\w./-]+$/.test(publicPath)) return send(res, 404, 'Not found.', 'text/plain; charset=utf-8');
  readFile(file, (error, content) => {
    if (error) return send(res, 404, 'Not found.', 'text/plain; charset=utf-8');
    const type = ({ '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8' })[extname(file)] || 'application/octet-stream';
    return send(res, 200, content, type);
  });
});

server.listen(port, process.env.HOST || '127.0.0.1', () => console.log(`IELTS Study server: http://127.0.0.1:${port}`));
