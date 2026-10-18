'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),c=require('node:crypto');
const {DatabaseSync}=require('node:sqlite');
try{process.loadEnvFile(path.join(__dirname,'.env'))}catch{}
const PORT=+process.env.PORT||3000,PROD=process.env.NODE_ENV==='production',PUB=path.join(__dirname,'public');
const ADMIN=process.env.ADMIN_PASSWORD;
if(!ADMIN){console.error('Не задан ADMIN_PASSWORD (см. .env.example)');process.exit(1)}
const db=new DatabaseSync(process.env.DB_PATH||path.join(__dirname,'data.db'));
db.exec(`PRAGMA journal_mode=WAL;PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS orders(id INTEGER PRIMARY KEY,name TEXT NOT NULL,spec TEXT NOT NULL,extra TEXT NOT NULL DEFAULT '',deadline TEXT NOT NULL,budget INTEGER NOT NULL,status TEXT NOT NULL DEFAULT 'new',note TEXT NOT NULL DEFAULT '',token_hash TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')));
CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY,order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,author TEXT NOT NULL CHECK(author IN('client','admin')),body TEXT NOT NULL,is_read INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')));
CREATE INDEX IF NOT EXISTS ix_msg ON messages(order_id);`);
const STATUSES=['new','discussion','awaiting','active','done','cancelled'];
const sha=s=>c.createHash('sha256').update(s).digest(),hex=s=>sha(s).toString('hex');
const same=(a,b)=>c.timingSafeEqual(sha(a),sha(b));
const E=(code,msg,fields)=>Object.assign(new Error(msg),{code,fields});
const send=(res,code,o)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(o))};
const readBody=req=>new Promise((ok,no)=>{let b='',n=0;req.on('data',d=>{n+=d.length;if(n>65536){no(E(413,'Слишком большой запрос'));req.destroy()}else b+=d});req.on('end',()=>{try{ok(b?JSON.parse(b):{})}catch{no(E(400,'Некорректный JSON'))}})});
const sess=new Map(),tries=new Map();
const cookies=req=>Object.fromEntries((req.headers.cookie||'').split(/;\s*/).filter(Boolean).map(s=>{const i=s.indexOf('=');return[s.slice(0,i),s.slice(i+1)]}));
const isAdmin=req=>{const s=cookies(req).sid,e=s&&sess.get(hex(s));return!!e&&e>Date.now()};
const ipOf=req=>process.env.TRUST_PROXY?String(req.headers['x-forwarded-for']||'').split(',')[0].trim():req.socket.remoteAddress;
async function tg(t){const k=process.env.TELEGRAM_BOT_TOKEN,i=process.env.TELEGRAM_CHAT_ID;if(!k||!i)return;
 try{const r=await fetch(`https://api.telegram.org/bot${k}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:i,text:t}),signal:AbortSignal.timeout(5000)});if(!r.ok)console.warn('Telegram: HTTP',r.status)}catch(e){console.warn('Telegram недоступен:',e.message)}}
const str=(v,max)=>typeof v==='string'?v.trim().slice(0,max):'';
const pub=o=>({id:o.id,name:o.name,spec:o.spec,extra:o.extra,deadline:o.deadline,budget:o.budget,status:o.status,created_at:o.created_at});
const msgs=id=>db.prepare('SELECT id,author,body,created_at FROM messages WHERE order_id=? ORDER BY id').all(id);
const addMsg=(id,author,body)=>{body=str(body,2000);if(!body)throw E(400,'Пустое сообщение');db.prepare('INSERT INTO messages(order_id,author,body) VALUES(?,?,?)').run(id,author,body)};
const SORT={date_desc:'o.created_at DESC',date_asc:'o.created_at ASC',budget_desc:'o.budget DESC',budget_asc:'o.budget ASC'};

async function api(req,res,u){
 const m=req.method,p=u.pathname;
 if(m!=='GET'&&req.headers['x-requested-with']!=='kubik')throw E(403,'Запрос отклонён');
 const b=m==='GET'?{}:await readBody(req);let r;
 if(m==='POST'&&p==='/api/orders'){
  const o={name:str(b.name,80),spec:str(b.spec,5000),extra:str(b.extra,3000),deadline:str(b.deadline,10),budget:b.budget},f={};
  if(!o.name)f.name='Укажите имя';
  if(o.spec.length<10)f.spec='Опишите задачу подробнее (минимум 10 символов)';
  if(!Number.isInteger(o.budget)||o.budget<1||o.budget>1e9)f.budget='Укажите бюджет: целое число рублей';
  if(!/^\d{4}-\d\d-\d\d$/.test(o.deadline)||isNaN(Date.parse(o.deadline))||o.deadline<new Date().toISOString().slice(0,10))f.deadline='Выберите корректную дату не раньше сегодняшней';
  if(Object.keys(f).length)throw E(400,'Проверьте поля формы',f);
  const token=c.randomBytes(32).toString('base64url');
  const id=Number(db.prepare('INSERT INTO orders(name,spec,extra,deadline,budget,token_hash) VALUES(?,?,?,?,?,?)').run(o.name,o.spec,o.extra,o.deadline,o.budget,hex(token)).lastInsertRowid);
  tg(`Новая заявка №${id}\n${o.name}, ${o.budget} ₽, срок ${o.deadline}\n${o.spec.slice(0,300)}`);
  return send(res,201,{id,token});
 }
 if(r=p.match(/^\/api\/my\/(\d+)(\/messages)?$/)){
  const o=db.prepare('SELECT * FROM orders WHERE id=?').get(+r[1]),t=String(req.headers['x-token']||'');
  if(!o||!t||!c.timingSafeEqual(Buffer.from(hex(t)),Buffer.from(o.token_hash)))throw E(404,'Заявка не найдена или ссылка недействительна');
  if(r[2]&&m==='POST'){addMsg(o.id,'client',b.body);tg(`Сообщение в заявке №${o.id} (${o.name}):\n${str(b.body,300)}`);return send(res,201,{ok:1})}
  if(r[2])throw E(405,'Метод не поддерживается');
  db.prepare("UPDATE messages SET is_read=1 WHERE order_id=? AND author='admin'").run(o.id);
  return send(res,200,{order:pub(o),messages:msgs(o.id)});
 }
 if(m==='POST'&&p==='/api/admin/login'){
  const ip=ipOf(req),now=Date.now(),a=(tries.get(ip)||[]).filter(t=>t>now-9e5);
  if(a.length>=5)throw E(429,'Слишком много попыток. Повторите через 15 минут.');
  if(typeof b.password!=='string'||!same(b.password,ADMIN)){a.push(now);tries.set(ip,a);throw E(401,'Неверный пароль')}
  tries.delete(ip);const sid=c.randomBytes(32).toString('base64url');sess.set(hex(sid),now+12*36e5);
  res.setHeader('Set-Cookie',`sid=${sid}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200${PROD?'; Secure':''}`);
  return send(res,200,{ok:1});
 }
 if(p.startsWith('/api/admin/')){
  if(!isAdmin(req))throw E(401,'Требуется вход администратора');
  if(m==='POST'&&p==='/api/admin/logout'){sess.delete(hex(cookies(req).sid));res.setHeader('Set-Cookie','sid=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return send(res,200,{ok:1})}
  if(p==='/api/admin/me')return send(res,200,{ok:1});
  if(p==='/api/admin/stats'){const s=db.prepare("SELECT COUNT(*) total,SUM(status='new') new,SUM(status='active') active,SUM(status='done') done FROM orders").get();
   s.unread=db.prepare("SELECT COUNT(*) n FROM messages WHERE author='client' AND is_read=0").get().n;
   return send(res,200,Object.fromEntries(Object.entries(s).map(([k,v])=>[k,v||0])))}
  if(p==='/api/admin/orders'&&m==='GET'){
   const q=u.searchParams,w=[],a=[];
   if(STATUSES.includes(q.get('status'))){w.push('o.status=?');a.push(q.get('status'))}
   if(/^\d{4}-\d\d-\d\d$/.test(q.get('from')||'')){w.push('date(o.created_at)>=?');a.push(q.get('from'))}
   if(/^\d{4}-\d\d-\d\d$/.test(q.get('to')||'')){w.push('date(o.created_at)<=?');a.push(q.get('to'))}
   if(q.get('q')){w.push("o.name LIKE ? ESCAPE '\\'");a.push('%'+q.get('q').slice(0,80).replace(/[\\%_]/g,'\\$&')+'%')}
   const rows=db.prepare(`SELECT o.*,(SELECT COUNT(*) FROM messages m WHERE m.order_id=o.id AND m.author='client' AND m.is_read=0) unread FROM orders o ${w.length?'WHERE '+w.join(' AND '):''} ORDER BY ${SORT[q.get('sort')]||SORT.date_desc}`).all(...a);
   return send(res,200,rows.map(o=>({...pub(o),note:o.note,unread:o.unread})));
  }
  if(r=p.match(/^\/api\/admin\/orders\/(\d+)(\/messages)?$/)){
   const o=db.prepare('SELECT * FROM orders WHERE id=?').get(+r[1]);if(!o)throw E(404,'Заявка не найдена');
   if(r[2]&&m==='POST'){addMsg(o.id,'admin',b.body);return send(res,201,{ok:1})}
   if(!r[2]&&m==='PATCH'){
    if(b.status!==undefined){if(!STATUSES.includes(b.status))throw E(400,'Неизвестный статус');db.prepare('UPDATE orders SET status=? WHERE id=?').run(b.status,o.id)}
    if(b.note!==undefined)db.prepare('UPDATE orders SET note=? WHERE id=?').run(str(b.note,5000),o.id);
    return send(res,200,{ok:1});
   }
   if(!r[2]&&m==='GET'){db.prepare("UPDATE messages SET is_read=1 WHERE order_id=? AND author='client'").run(o.id);return send(res,200,{order:{...pub(o),note:o.note},messages:msgs(o.id)})}
  }
 }
 throw E(404,'Не найдено');
}
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{
 res.setHeader('Content-Security-Policy',"default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none'");
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
 try{
  const u=new URL(req.url,'http://x');
  if(u.pathname.startsWith('/api/'))return await api(req,res,u);
  const f=path.join(PUB,u.pathname==='/'?'index.html':decodeURIComponent(u.pathname));
  if(!f.startsWith(PUB+path.sep)||!MIME[path.extname(f)]){res.writeHead(404);return res.end('Not found')}
  fs.readFile(f,(e,d)=>{if(e){res.writeHead(404);return res.end('Not found')}res.writeHead(200,{'Content-Type':MIME[path.extname(f)]});res.end(d)});
 }catch(e){
  if(!e.code||typeof e.code!=='number'){console.error(e);e=E(500,'Внутренняя ошибка сервера')}
  if(!res.headersSent)send(res,e.code,{error:e.message,fields:e.fields});
 }
});
server.listen(PORT,()=>console.log(`Kubik Freelance: http://localhost:${PORT}`));
