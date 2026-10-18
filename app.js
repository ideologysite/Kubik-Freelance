'use strict';
const $=(s,r=document)=>r.querySelector(s),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ST={new:'Новая заявка',discussion:'Обсуждение',awaiting:'Ожидает подтверждения',active:'В работе',done:'Завершён',cancelled:'Отменён'};
const money=n=>new Intl.NumberFormat('ru-RU').format(n)+' ₽',dt=i=>new Date(i).toLocaleString('ru-RU',{dateStyle:'short',timeStyle:'short'}),dd=i=>new Date(i+'T00:00').toLocaleDateString('ru-RU');
const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
async function api(p,{method='GET',data,token}={}){
 const h={'X-Requested-With':'kubik'};if(data)h['Content-Type']='application/json';if(token)h['X-Token']=token;
 let r;try{r=await fetch('/api'+p,{method,headers:h,body:data?JSON.stringify(data):undefined,credentials:'same-origin'})}catch{throw new Error('Нет связи с сервером')}
 const j=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(new Error(j.error||'Ошибка сервера'),{status:r.status,fields:j.fields});return j}
let toastT;const toast=t=>{const e=$('#toast');e.textContent=t;e.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>e.classList.remove('show'),4000)};

(function intro(){
 const sec=$('#intro'),logo=$('#logo'),start=$('#start');
 const finish=()=>{logo.classList.add('on');start.hidden=false};
 const skip=()=>{sessionStorage.setItem('kubik-intro','1');sec.hidden=true;scrollTo(0,0)};
 $('#skip').onclick=skip;start.addEventListener('click',()=>sessionStorage.setItem('kubik-intro','1'));
 if(sessionStorage.getItem('kubik-intro')){sec.hidden=true;return}
 if(reduce){finish();return}
 const cv=$('#fx'),x=cv.getContext('2d'),car=$('#car'),P=[],F=[];let W,H,t0=performance.now(),lit=false;
 const size=()=>{const d=Math.min(devicePixelRatio||1,2);W=cv.clientWidth;H=cv.clientHeight;cv.width=W*d;cv.height=H*d;x.setTransform(d,0,0,d,0,0)};size();addEventListener('resize',size);
 setTimeout(()=>{finish();lit=true;for(let i=0;i<26;i++)F.push({a:Math.random()*6.28,r:60+Math.random()*Math.min(W,600)*.45,s:.3+Math.random()*.6,p:Math.random()*9,z:1+Math.random()*2})},5200);
 (function loop(now){
  if(sec.hidden)return;requestAnimationFrame(loop);if(document.hidden||sec.getBoundingClientRect().bottom<0)return;
  const t=(now-t0)/1000;x.clearRect(0,0,W,H);
  if(t>.5&&t<2.8){x.fillStyle='rgba(255,157,66,.28)';for(let i=0;i<3;i++)x.fillRect(Math.random()*W,Math.round(Math.random()*H/4)*4,40+Math.random()*140,4)}
  if(t>.6&&t<2.6){const b=car.getBoundingClientRect();if(b.right>0&&b.left<W)for(let i=0;i<5&&P.length<420;i++){
   const smoke=Math.random()<.7;P.push({x:b.left+b.width*.04,y:b.top+b.height*(.55+Math.random()*.35),vx:-(40+Math.random()*90),vy:-10-Math.random()*30,r:smoke?10+Math.random()*14:1.5+Math.random()*2,g:smoke?30+Math.random()*30:0,l:0,m:smoke?3.2+Math.random()*1.5:.8+Math.random()*.6,smoke})}}
  for(let i=P.length-1;i>=0;i--){const p=P[i];p.l+=.016;if(p.l>p.m){P.splice(i,1);continue}p.x+=p.vx*.016;p.y+=p.vy*.016;p.vx*=.985;p.r+=p.g*.016;const k=1-p.l/p.m;
   x.fillStyle=p.smoke?`rgba(150,140,135,${.22*k})`:`rgba(255,${130+Math.random()*60|0},40,${k})`;const q=Math.max(4,Math.round(p.r/4)*4);x.fillRect(Math.round(p.x/4)*4,Math.round(p.y/4)*4,q,q)}
  if(lit){const cx=W/2,cy=logo.getBoundingClientRect().top-sec.getBoundingClientRect().top+logo.offsetHeight/2;x.save();x.shadowBlur=14;x.shadowColor='#FF9D42';x.fillStyle='#FFD39B';
   for(const f of F){const a=f.a+t*f.s*.4,px=cx+Math.cos(a)*f.r*1.6+Math.sin(t*f.s+f.p)*18,py=cy+Math.sin(a*1.3)*f.r*.45+Math.cos(t*f.s*1.7+f.p)*14;x.globalAlpha=.4+.6*Math.abs(Math.sin(t*f.s*2+f.p));x.fillRect(Math.round(px/4)*4,Math.round(py/4)*4,4,4)}x.restore()}
 })(t0);
})();

$('#burger').onclick=e=>{const o=$('#nav').classList.toggle('open');e.currentTarget.setAttribute('aria-expanded',o)};
$('#nav').onclick=()=>{$('#nav').classList.remove('open');$('#burger').setAttribute('aria-expanded',false)};
{const io=new IntersectionObserver((es,o)=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');o.unobserve(e.target)}}),{threshold:.15});document.querySelectorAll('.rv').forEach(el=>io.observe(el))}
$('#logoBtn').onclick=async()=>{try{await api('/admin/me');location.hash='#/admin'}catch{$('#loginErr').textContent='';$('#login').showModal();$('#pw').focus()}};
$('#loginX').onclick=()=>$('#login').close();
$('#eye').onclick=()=>{const p=$('#pw'),s=p.type==='password';p.type=s?'text':'password';$('#eye').setAttribute('aria-label',s?'Скрыть пароль':'Показать пароль')};
$('#loginForm').onsubmit=async e=>{e.preventDefault();const b=$('#loginBtn');if(b.disabled)return;b.disabled=true;b.textContent='Проверка…';$('#loginErr').textContent='';
 try{await api('/admin/login',{method:'POST',data:{password:$('#pw').value}});$('#pw').value='';$('#login').close();location.hash==='#/admin'?route():location.hash='#/admin'}
 catch(x){$('#loginErr').textContent=x.status===401?'Неверный пароль':x.message}finally{b.disabled=false;b.textContent='Войти'}};

(function(){const f=$('#orderForm'),today=new Date(Date.now()-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10);f.deadline.min=today;let busy=false;
 const errs=o=>{f.querySelectorAll('.e').forEach(e=>e.textContent=o[e.dataset.for]||'');$('#formErr').textContent=o._||''};
 f.onsubmit=async e=>{e.preventDefault();if(busy)return;const d=Object.fromEntries(new FormData(f)),er={};
  if(!d.name.trim())er.name='Укажите имя';if(d.spec.trim().length<10)er.spec='Опишите задачу подробнее (минимум 10 символов)';
  const b=Number(d.budget);if(d.budget===''||!Number.isInteger(b)||b<1)er.budget='Укажите бюджет: целое число рублей';if(!d.deadline||d.deadline<today)er.deadline='Выберите дату не раньше сегодняшней';
  errs(er);if(Object.keys(er).length){(f[Object.keys(er)[0]]||f.name).focus();return}
  busy=true;const btn=$('#sendBtn');btn.disabled=true;btn.textContent='Отправка…';
  try{const r=await api('/orders',{method:'POST',data:{name:d.name,spec:d.spec,extra:d.extra,deadline:d.deadline,budget:b}});
   const url=`${location.origin}/#/o/${r.id}.${r.token}`;$('#link').value=url;$('#open').href=url;f.reset();f.hidden=true;$('#done').hidden=false;$('#done').scrollIntoView({block:'center'})}
  catch(x){errs({...(x.fields||{}),_:x.fields?'':'Не удалось отправить: '+x.message+'. Данные сохранены в форме. Попробуйте ещё раз.'})}
  finally{busy=false;btn.disabled=false;btn.textContent='Отправить заявку'}};
 $('#copy').onclick=async()=>{try{await navigator.clipboard.writeText($('#link').value);toast('Ссылка скопирована')}catch{$('#link').select();toast('Выделите ссылку и скопируйте')}};
})();

function chat(el,{load,send,me}){
 el.innerHTML='<div class="msgs" role="log" aria-live="polite"><p class="empty">Загрузка…</p></div><form class="send"><label>Сообщение<textarea rows="3" maxlength="2000" required></textarea></label><p class="e" role="alert"></p><button class="btn">Отправить</button></form>';
 const box=$('.msgs',el),ta=$('textarea',el),btn=$('button',el),er=$('.e',el);let busy=false,last='';
 async function refresh(){try{const ms=await load(),k=ms.map(m=>m.id).join();if(k!==last){last=k;box.innerHTML=ms.length?ms.map(m=>`<div class="msg ${m.author===me?'me':''}"><p>${esc(m.body)}</p><time>${m.author==='admin'?'Администратор':'Заказчик'} · ${dt(m.created_at)}</time></div>`).join(''):'<p class="empty">Сообщений пока нет.</p>';box.scrollTop=box.scrollHeight}er.textContent=''}catch(x){er.textContent='Не удалось обновить: '+x.message}}
 $('form',el).onsubmit=async e=>{e.preventDefault();const v=ta.value.trim();if(busy||!v)return;busy=true;btn.disabled=true;btn.textContent='Отправка…';
  try{await send(v);ta.value='';er.textContent='';await refresh()}catch(x){er.textContent='Не отправлено: '+x.message}finally{busy=false;btn.disabled=false;btn.textContent='Отправить'}};
 refresh();return refresh}

async function client(raw){const v=$('#clientView'),i=raw.indexOf('.'),id=raw.slice(0,i),token=raw.slice(i+1);
 v.innerHTML='<div class="bar"><b>Ваша заявка</b><a class="btn ghost" href="#/">На сайт</a></div><div class="panel" id="co"><p class="empty">Загрузка…</p></div>';
 try{const r=await api('/my/'+encodeURIComponent(id),{token}),o=r.order;
  $('#co').innerHTML=`<h3>Заявка №${o.id} <span class="badge" id="cst">${ST[o.status]}</span></h3><dl class="kv"><dt>Задание</dt><dd>${esc(o.spec)}</dd>${o.extra?`<dt>Дополнительно</dt><dd>${esc(o.extra)}</dd>`:''}<dt>Deadline</dt><dd>${dd(o.deadline)}</dd><dt>Бюджет</dt><dd>${money(o.budget)}</dd></dl><h3>Переписка</h3><div id="cc"></div>`;
  const rf=chat($('#cc'),{me:'client',load:async()=>{const r=await api('/my/'+id,{token});$('#cst').textContent=ST[r.order.status];return r.messages},send:b=>api(`/my/${id}/messages`,{method:'POST',token,data:{body:b}})});poll=setInterval(rf,8000)}
 catch(x){$('#co').innerHTML=`<p class="e">${esc(x.message)}</p>`}}

async function admin(){const v=$('#adminView');
 try{await api('/admin/me')}catch{location.hash='#/';$('#login').showModal();return}
 v.innerHTML=`<div class="bar"><b>Панель администратора</b><a class="btn ghost" href="#/">На сайт</a><button class="btn ghost" id="out">Выйти</button></div><div class="stats" id="stats"></div>
 <form class="filters" id="flt" aria-label="Фильтры"><select name="sort" aria-label="Сортировка"><option value="date_desc">Сначала новые</option><option value="date_asc">Сначала старые</option><option value="budget_desc">Бюджет: по убыванию</option><option value="budget_asc">Бюджет: по возрастанию</option></select>
 <select name="status" aria-label="Статус"><option value="">Все статусы</option>${Object.entries(ST).map(([k,t])=>`<option value="${k}">${t}</option>`).join('')}</select>
 <input type="date" name="from" aria-label="Создана с"><input type="date" name="to" aria-label="Создана по"><input type="search" name="q" placeholder="Поиск по имени" aria-label="Поиск по имени"><button type="button" class="btn ghost" id="rst">Сбросить</button></form>
 <div class="split"><ul id="list"></ul><section id="detail"><p class="empty">Выберите заявку из списка</p></section></div>`;
 let sel=null,rfChat=null,prev=null,dtm;const flt=$('#flt');
 $('#out').onclick=async()=>{await api('/admin/logout',{method:'POST'}).catch(()=>{});location.hash='#/'};
 async function stats(){const s=await api('/admin/stats');
  if(prev&&s.total>prev.total)toast('Новая заявка!');else if(prev&&s.unread>prev.unread)toast('Новое сообщение от заказчика');prev=s;
  $('#stats').innerHTML=[['Всего заявок',s.total],['Новые',s.new],['В работе',s.active],['Завершённые',s.done],['Непрочитанные',s.unread]].map(([k,n])=>`<div class="stat"><b>${n}</b><span>${k}</span></div>`).join('')}
 async function list(){const qs=new URLSearchParams([...new FormData(flt)].filter(([,v])=>v));
  try{const rows=await api('/admin/orders?'+qs);$('#list').innerHTML=rows.length?rows.map(o=>`<li><button data-id="${o.id}" class="${o.id===sel?'sel':''}"><b>${esc(o.name)}</b> <span class="badge">${ST[o.status]}</span>${o.unread?`<span class="badge unread" title="Непрочитанные">${o.unread}</span>`:''}<small>${money(o.budget)} · срок ${dd(o.deadline)} · ${dt(o.created_at)}</small><small>${esc(o.spec.slice(0,90))}</small></button></li>`).join(''):'<li class="empty">Заявок по этим условиям нет</li>'}
  catch(x){$('#list').innerHTML=`<li class="e">${esc(x.message)}</li>`}}
 async function open(id){sel=id;const r=await api('/admin/orders/'+id),o=r.order;
  $('#detail').innerHTML=`<h3>Заявка №${o.id}: ${esc(o.name)}</h3><dl class="kv"><dt>Техническое задание</dt><dd>${esc(o.spec)}</dd><dt>Дополнительно</dt><dd>${esc(o.extra||'нет')}</dd><dt>Создана</dt><dd>${dt(o.created_at)}</dd><dt>Deadline</dt><dd>${dd(o.deadline)}</dd><dt>Бюджет</dt><dd>${money(o.budget)}</dd></dl>
  <label>Статус<select id="stSel">${Object.entries(ST).map(([k,t])=>`<option value="${k}"${k===o.status?' selected':''}>${t}</option>`).join('')}</select></label>
  <h3>Переписка с заказчиком</h3><div id="ac"></div><div class="note"><label>Внутренняя заметка <em>(заказчик её не видит)</em><textarea id="nt" rows="3" maxlength="5000">${esc(o.note)}</textarea></label><button class="btn ghost" id="ntb">Сохранить заметку</button></div>`;
  $('#stSel').onchange=async e=>{try{await api('/admin/orders/'+id,{method:'PATCH',data:{status:e.target.value}});toast('Статус обновлён');list();stats()}catch(x){toast(x.message)}};
  $('#ntb').onclick=async()=>{try{await api('/admin/orders/'+id,{method:'PATCH',data:{note:$('#nt').value}});toast('Заметка сохранена')}catch(x){toast(x.message)}};
  rfChat=chat($('#ac'),{me:'admin',load:async()=>(await api('/admin/orders/'+id)).messages,send:b=>api(`/admin/orders/${id}/messages`,{method:'POST',data:{body:b}})});list();stats()}
 $('#list').onclick=e=>{const b=e.target.closest('button[data-id]');if(b)open(+b.dataset.id).catch(x=>toast(x.message))};
 flt.oninput=()=>{clearTimeout(dtm);dtm=setTimeout(list,250)};$('#rst').onclick=()=>{flt.reset();list()};
 await Promise.all([stats().catch(x=>toast(x.message)),list()]);
 poll=setInterval(()=>{stats().catch(()=>{});list();rfChat&&rfChat()},8000)}

let poll;function route(){clearInterval(poll);const h=location.hash,a=h==='#/admin',c=h.startsWith('#/o/');
 $('#adminView').hidden=!a;$('#clientView').hidden=!c;document.body.classList.toggle('lock',a||c);
 if(a)admin();else if(c)client(h.slice(4))}
addEventListener('hashchange',route);route();
