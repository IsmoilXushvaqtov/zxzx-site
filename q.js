avascript:(function(){
  const scriptUrl = 'https://raw.githubusercontent.com/anyfilehost/uztesthelper/main/bookmarklet.js'; /* Bu yerga oʻzingning toʻliq scriptingni joylashtirilgan joyni qoʻyasan */
  
  let r = document.getElementById('uztest-tester-result');
  if(r) r.remove();
  
  const div = document.createElement('div');
  div.id = 'uztest-tester-result';
  div.style = 'position:fixed;top:10px;left:10px;right:10px;z-index:999999;background:#000;color:#0f0;font-family:monospace;padding:15px;border:3px solid #0f0;border-radius:10px;max-height:90vh;overflow:auto;';
  document.body.appendChild(div);
  
  function log(t){ div.innerHTML += t + '<br>'; div.scrollTop = div.scrollHeight; }
  function ok(t){ log('✅ '+t); }
  function no(t){ log('❌ '+t); }
  function warn(t){ log('⚠️ '+t); }

  log('<b>UZTEST BOOKMARKLET TESTER</b><br>');

  /* 1. CSP tekshirish */
  const csp = document.querySelector('meta[http-equiv="Content-Security-Policy" i]')?.content || 
              [...document.querySelectorAll('meta')].find(m=>m.content.includes('content-security-policy'))?.content ||
              'no meta';
  const headers = [...performance.getEntriesByType('navigation')][0]?.responseHeaders || {};
  const serverCsp = Object.keys(headers).find(k=>k.toLowerCase()==='content-security-policy') || 'none';

  const fullCsp = (csp !== 'no meta' ? csp : '') + (serverCsp ? headers[serverCsp] : '');
  const hasUnsafeInline = /script-src[^;]*'unsafe-inline'/i.test(fullCsp) || !/script-src/i.test(fullCsp);
  const hasCdnjs = /cdn\.cloudflare\.com|cdnjs\.cloudflare\.com/i.test(fullCsp) || !/script-src/i.test(fullCsp);
  const hasTelegram = /api\.telegram\.org/i.test(fullCsp) || !/connect-src/i.test(fullCsp);

  if(!hasUnsafeInline) no('CSP: unsafe-inline bloklangan → bookmarklet oʻzi ishlamaydi');
  else ok('CSP: unsafe-inline ruxsat etilgan');

  if(!hasCdnjs) no('CSP: html2canvas (cdnjs) yuklanmaydi');
  else ok('CSP: cdnjs.cloudflare.com ga ruxsat bor');

  if(!hasTelegram) no('CSP: Telegram API ga ulanib boʻlmaydi');
  else ok('CSP: api.telegram.org ga ruxsat bor');

  /* 2. Test elementlari bor-yoʻqligi */
  const tests = document.querySelectorAll('.table-test');
  if(tests.length===0) warn('Test elementlari (.table-test) topilmadi → savollar yuborilmaydi');
  else ok(`.table-test topildi: ${tests.length} ta`);

  if(tests.length>0){
    const q = tests[0].querySelector('.test-question p');
    if(q) ok('.test-question p topildi');
    else warn('.test-question p topilmadi');
    
    const ans = tests[0].querySelectorAll('.answers-test li');
    if(ans.length>0) ok(`.answers-test li topildi: ${ans.length} ta variant`);
    else warn('.answers-test li topilmadi');
  }

  /* 3. html2canvas yuklab koʻrish */
  if(window.html2canvas){
    ok('html2canvas allaqachon yuklangan');
  } else {
    log('html2canvas yuklash sinovi boshlandi...');
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    script.onload = ()=>ok('html2canvas muvaffaqiyatli yuklandi');
    script.onerror = ()=>no('html2canvas yuklanmadi (CSP blokladi)');
    document.head.appendChild(script);
  }

  /* 4. Telegram API ga oddiy soʻrov sinovi */
  log('Telegram API ga test soʻrov yuborilmoqda...');
  fetch('https://api.telegram.org/8580669048:AAHFMWjYebnEw7Urj-UVGaYr_aa-IZu___E/getMe?'+Date.now())
    .then(r=>r.json().then(d=> { if(d.ok) ok('Telegram API ga ulanish ishlaydi'); else no('Telegram API bloklandi'); }))
    .catch(()=>no('Telegram API ga ulanish bloklandi (CORS yoki CSP)'));

  /* 5. Xulosa */
  setTimeout(()=>{
    log('<br><b>XULOSA:</b>');
    const errors = div.innerHTML.match(/❌/g)||[];
    const warns = div.innerHTML.match(/⚠️/g)||[];
    if(errors.length===0 && warns.length===0) log('🟢 TOʻLIQ ISHLAYDI! Hammasi joyida.');
    else if(errors.length===0) log('🟡 Qisman ishlaydi (faqat savollar yuborilmaydi)');
    else log('🔴 UMUMAN ISHLAMAYDI. Yuqoridagi qizil xatolarni tuzatish kerak.');
  }, 4000);
})();
