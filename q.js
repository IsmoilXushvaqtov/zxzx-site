// == Telegram Config ==
const telegramToken = '8580669048:AAHFMWjYebnEw7Urj-UVGaYr_aa-IZu___E';
const chatId = '7235913446';
let lastProcessedUpdateId = 0;
let telegramMessagesBuffer = []; 
let aiMessagesBuffer = [];
let currentTelegramIndex = -1;
let currentAiIndex = -1;
let hideMessageTimeout = null;

// == AI Config ==
const aiApiUrl = 'https://api.openai.com/v1/chat/completions';
const aiApiKey = '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'; // Bu yerga o‘z OpenAI API kalitingizni qo‘ying

// == Загрузка html2canvas ==
function loadHtml2Canvas() {
 return new Promise((resolve, reject) => {
 if (window.html2canvas) return resolve();
 const script = document.createElement('script');
 script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
 script.onload = resolve;
 script.onerror = reject;
 document.head.appendChild(script);
 });
}

// == Отправка скриншота ==
async function screenshotAndSend() {
 await loadHtml2Canvas();
 html2canvas(document.body, { scale: 2 }).then(canvas => {
 canvas.toBlob(async blob => {
 const formData = new FormData();
 formData.append('chat_id', chatId);
 formData.append('document', blob, 'screenshot.png');

 const res = await fetch(`https://api.telegram.org/bot${telegramToken}/sendDocument`, {
 method: 'POST',
 body: formData
 });

 if (!res.ok) {
 console.error('Ошибка отправки документа:', await res.text());
 } else {
 console.log('Скриншот успешно отправлен.');
 showScreenshotSentMessage();
 }
 }, 'image/png');
 });
}

// == Mini window ==
function createMiniWindow() {
 const miniWindowHTML = `
 <div id="mini-window" style="display: none;">
 <div id="mini-window-content">--</div>
 </div>
 <div id="screenshot-sent" style="display: none;">✔</div>
 `;
 document.body.insertAdjacentHTML('beforeend', miniWindowHTML);

 const style = document.createElement('style');
 style.innerHTML = `
#mini-window {
 position: fixed;
 bottom: 10px;
 right: 10px;
 width: 250px;
 background: transparent; 
 border: none;
 border-radius: 5px;
 overflow: hidden;
 z-index: 1000;
 font-family: Arial, sans-serif;
}
#mini-window-content {
 padding: 5px;
 font-size: 14px;
 line-height: 1.5;
 color: rgba(204, 204, 204, 0.7); 
}
#screenshot-sent {
 position: fixed;
 bottom: 5px;
 right: 5px;
 font-size: 10px;
 color: rgba(204, 204, 204, 0.75);
 background: transparent;
 z-index: 2000;
}
 `;
 document.head.appendChild(style);
}

// Faqat 1 ta xabar ko‘rsatish
function showMessage(text) {
 const container = document.getElementById('mini-window-content');
 if (!container) return;

 container.innerHTML = ''; 
 const msg = document.createElement('p');
 msg.textContent = text;
 container.appendChild(msg);

 const win = document.getElementById('mini-window');
 win.style.display = 'block';

 clearTimeout(hideMessageTimeout);
 hideMessageTimeout = setTimeout(() => {
 win.style.display = 'none';
 }, 1500);
}

// Skrenshot yuborildi xabari
function showScreenshotSentMessage() {
 const el = document.getElementById('screenshot-sent');
 if (!el) return;
 el.style.display = 'block';
 setTimeout(() => {
 el.style.display = 'none';
 }, 2000);
}

// == Получение новых сообщений ==
async function getNewAnswersFromTelegram() {
 const url = `https://api.telegram.org/bot${telegramToken}/getUpdates?offset=${lastProcessedUpdateId + 1}`;
 const response = await fetch(url);
 const data = await response.json();

 if (data.ok) {
 data.result.forEach(msg => {
 const text = msg.message?.text;
 const updateId = msg.update_id;
 if (text && updateId > lastProcessedUpdateId) {
 lastProcessedUpdateId = updateId;
 telegramMessagesBuffer.push(text);
 currentTelegramIndex = telegramMessagesBuffer.length - 1;

 // ⬅️ yangi: endi faqat oynani o‘ng tugma bilan yoqqanda ko‘rinadi
 if (messagesActive && currentMode === 'telegram') {
 showMessage(text);
 }
 }
 });
 }
}

// == Xabarlarni aylantirish ==
function showMessageByIndex(index) {
 const buffer = currentMode === 'telegram' ? telegramMessagesBuffer : aiMessagesBuffer;
 if (index < 0 || index >= buffer.length) return;
 const text = buffer[index];
 showMessage(text);
}

// ⬅️ Yangi qism boshlandi
let messagesActive = false; 
let leftPressed = false; 
let rightPressed = false; 
let dualHoldTimer = null; // ikkala tugma birga bosilganda aniqlash uchun
let currentMode = 'telegram'; // default telegram
let lastRightClickTime = 0;
let rightClickCount = 0;
let rightClickTimer = null;

function toggleMessages() {
 messagesActive = !messagesActive;
 const win = document.getElementById('mini-window');
 if (win) {
 if (messagesActive) {
 win.style.display = 'block';
 showMessageByIndex(getCurrentIndex());
 } else {
 win.style.display = 'none';
 clearTimeout(hideMessageTimeout);
 }
 }
}

function getCurrentIndex() {
 return currentMode === 'telegram' ? currentTelegramIndex : currentAiIndex;
}

function setCurrentIndex(value) {
 if (currentMode === 'telegram') {
 currentTelegramIndex = value;
 } else {
 currentAiIndex = value;
 }
}

// Sichqoncha roligi
document.addEventListener('wheel', (e) => {
 if (!messagesActive || (currentMode === 'telegram' ? telegramMessagesBuffer.length : aiMessagesBuffer.length) === 0) return;
 if (e.deltaY < 0) {
 const index = Math.max(getCurrentIndex() - 1, 0);
 setCurrentIndex(index);
 showMessageByIndex(index);
 } else if (e.deltaY > 0) {
 const index = Math.min(getCurrentIndex() + 1, (currentMode === 'telegram' ? telegramMessagesBuffer.length : aiMessagesBuffer.length) - 1);
 setCurrentIndex(index);
 showMessageByIndex(index);
 }
});

// Klaviatura ↑↓
document.addEventListener('keydown', (e) => {
 if (!messagesActive || (currentMode === 'telegram' ? telegramMessagesBuffer.length : aiMessagesBuffer.length) === 0) return;
 if (e.key === 'ArrowUp') {
 const index = Math.max(getCurrentIndex() - 1, 0);
 setCurrentIndex(index);
 showMessageByIndex(index);
 } else if (e.key === 'ArrowDown') {
 const index = Math.min(getCurrentIndex() + 1, (currentMode === 'telegram' ? telegramMessagesBuffer.length : aiMessagesBuffer.length) - 1);
 setCurrentIndex(index);
 showMessageByIndex(index);
 }
});

// O‘rta tugma - hammasini ko‘rsatish
document.addEventListener('mousedown', (e) => {
 if (e.button === 1 && messagesActive) {
 const container = document.getElementById('mini-window-content');
 if (container) {
 const buffer = currentMode === 'telegram' ? telegramMessagesBuffer : aiMessagesBuffer;
 container.innerHTML = buffer.map(m => `<p>${m}</p>`).join('');
 document.getElementById('mini-window').style.display = 'block';
 }
 }

 // ⬅️ Yangi: o‘ng tugma - ochish/yopish
 if (e.button === 2) {
   rightPressed = true;
   rightClickCount++;
   if (rightClickCount === 1) {
     rightClickTimer = setTimeout(() => {
       currentMode = 'telegram';
       toggleMessages();
       rightClickCount = 0;
     }, 300);
   } else if (rightClickCount === 2) {
     clearTimeout(rightClickTimer);
     currentMode = 'ai';
     toggleMessages();
     rightClickCount = 0;
   }
   if (leftPressed && !dualHoldTimer) {
   dualHoldTimer = setTimeout(() => {
   if (leftPressed && rightPressed) location.reload();
   }, 250);
   }
 }
 if (e.button === 0) {
 leftPressed = true;
 if (rightPressed && !dualHoldTimer) {
 dualHoldTimer = setTimeout(() => {
 if (leftPressed && rightPressed) location.reload();
 }, 250);
 }
 }
});

document.addEventListener('mouseup', (e) => {
 if (e.button === 1 && messagesActive) {
 document.getElementById('mini-window').style.display = 'none';
 }

 // o‘ng tugma - toggle
 if (e.button === 2) {
 rightPressed = false;
 clearTimeout(dualHoldTimer);
 dualHoldTimer = null;
 }
 if (e.button === 0) {
 leftPressed = false;
 clearTimeout(dualHoldTimer);
 dualHoldTimer = null;
 }
});

// Brauzerning o‘ng tugma menyusini o‘chir
document.addEventListener('contextmenu', (e) => e.preventDefault());
window.oncontextmenu = () => false;

// 'z' tugmasi - telegram, 'a' tugmasi - ai
document.addEventListener('keydown', (e) => {
 const key = e.key.toLowerCase();
 if (key === 'z') {
   currentMode = 'telegram';
   if (messagesActive) showMessageByIndex(getCurrentIndex());
 } else if (key === 'a') {
   currentMode = 'ai';
   if (messagesActive) showMessageByIndex(getCurrentIndex());
 }
});
// ⬅️ Yangi qism tugadi

// == Tugmalar orqali screenshot ==
let holdTimer = null;
let holdTriggered = false;

function setupHoldToScreenshot(keyOrButton) {
 const startHold = () => {
 holdTriggered = false;
 holdTimer = setTimeout(() => {
 if (!holdTriggered) {
 screenshotAndSend();
 holdTriggered = true;
 }
 }, 500);
 };
 const endHold = () => {
 if (holdTimer) clearTimeout(holdTimer);
 holdTimer = null;
 holdTriggered = false;
 };

 if (typeof keyOrButton === 'string') {
 document.addEventListener('keydown', (e) => {
 if (e.key.toLowerCase() === keyOrButton && !holdTimer) startHold();
 });
 document.addEventListener('keyup', (e) => {
 if (e.key.toLowerCase() === keyOrButton) endHold();
 });
 } else {
 document.addEventListener('mousedown', (e) => {
 if (e.button === keyOrButton && !holdTimer) startHold();
 });
 document.addEventListener('mouseup', (e) => {
 if (e.button === keyOrButton) endHold();
 });
 }
}

setupHoldToScreenshot('x');
setupHoldToScreenshot(0);

// == Savollarni jo‘natish ==
function extractImageLinks(element) {
 const images = element?.querySelectorAll('img') || [];
 return Array.from(images).map(img => img.src).join('\n');
}

async function sendQuestionToTelegram(question) {
 const url = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
 const response = await fetch(url, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 chat_id: chatId,
 text: question,
 }),
 });

 if (!response.ok) {
 console.error('Ошибка отправки вопроса:', await response.text());
 }
}

async function sendQuestionToAI(question, questionNumber) {
 const prompt = `Answer this multiple choice question with only the letter of the correct answer (A, B, C, etc.):\n${question}`;
 const response = await fetch(aiApiUrl, {
   method: 'POST',
   headers: {
     'Authorization': `Bearer ${aiApiKey}`,
     'Content-Type': 'application/json'
   },
   body: JSON.stringify({
     model: 'grok-4', // Model nomini o'zgartiring agar kerak bo'lsa
     messages: [{ role: 'user', content: prompt }]
   })
 });
 const data = await response.json();
 const answer = data.choices[0].message.content.trim();
 aiMessagesBuffer.push(`${questionNumber}${answer}`);
 currentAiIndex = aiMessagesBuffer.length - 1;

 if (messagesActive && currentMode === 'ai') {
   showMessage(`${questionNumber}${answer}`);
 }
}

async function processAndSendQuestions() {
 const tests = document.querySelectorAll('.table-test');
 const sortedTests = Array.from(tests).sort((a, b) => {
 const idA = parseInt(a.id.replace(/\D/g, ''), 10);
 const idB = parseInt(b.id.replace(/\D/g, ''), 10);
 return idA - idB;
 });

 for (let i = 0; i < sortedTests.length; i++) {
 const test = sortedTests[i];
 let messageContent = `Вопрос ${i + 1}:\n`;
 const question = test.querySelector('.test-question p')?.textContent.trim() || 'Вопрос не найден';
 messageContent += `${question}\n\n`;

 const questionImages = extractImageLinks(test.querySelector('.test-question'));
 if (questionImages) {
 messageContent += `Изображения в вопросе:\n${questionImages}\n\n`;
 }

 const answers = Array.from(test.querySelectorAll('.answers-test li')).map((li, index) => {
 const variant = li.querySelector('.test-variant')?.textContent.trim() || '';
 const answerText = li.querySelector('label p')?.textContent.trim() || '';
 const answerImage = extractImageLinks(li);
 return `${variant}. ${answerText} ${answerImage ? `(Изображение: ${answerImage})` : ''}`;
 });

 messageContent += 'Варианты ответов:\n';
 messageContent += answers.join('\n');

 await sendQuestionToTelegram(messageContent);
 await sendQuestionToAI(messageContent, i + 1);
 }
}

// == Запуск ==
createMiniWindow();
setInterval(getNewAnswersFromTelegram, 5000);
processAndSendQuestions();
