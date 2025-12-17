// == OpenAI Config ==
const openaiApiKey = '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'; // Bu yerga OpenAI API kalitingizni qo'ying
let messagesBuffer = []; 
let currentMessageIndex = -1;
let hideMessageTimeout = null;

// == Mini window ==
function createMiniWindow() {
  const miniWindowHTML = `
    <div id="mini-window" style="display: none;">
      <div id="mini-window-content">--</div>
    </div>
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

// == Xabarlarni aylantirish ==
function showMessageByIndex(index) {
  if (index < 0 || index >= messagesBuffer.length) return;
  const text = messagesBuffer[index];
  showMessage(text);
}

// Yangi qism
let messagesActive = false; 
let leftPressed = false; 
let rightPressed = false; 
let dualHoldTimer = null;

function toggleMessages() {
  messagesActive = !messagesActive;
  const win = document.getElementById('mini-window');
  if (win) {
    if (messagesActive) {
      win.style.display = 'block';
      showMessageByIndex(currentMessageIndex >= 0 ? currentMessageIndex : messagesBuffer.length - 1);
    } else {
      win.style.display = 'none';
      clearTimeout(hideMessageTimeout);
    }
  }
}

// Sichqoncha roligi
document.addEventListener('wheel', (e) => {
  if (!messagesActive || messagesBuffer.length === 0) return;
  if (e.deltaY < 0) {
    currentMessageIndex = Math.max(currentMessageIndex - 1, 0);
    showMessageByIndex(currentMessageIndex);
  } else if (e.deltaY > 0) {
    currentMessageIndex = Math.min(currentMessageIndex + 1, messagesBuffer.length - 1);
    showMessageByIndex(currentMessageIndex);
  }
});

// Klaviatura ↑↓
document.addEventListener('keydown', (e) => {
  if (!messagesActive || messagesBuffer.length === 0) return;
  if (e.key === 'ArrowUp') {
    currentMessageIndex = Math.max(currentMessageIndex - 1, 0);
    showMessageByIndex(currentMessageIndex);
  } else if (e.key === 'ArrowDown') {
    currentMessageIndex = Math.min(currentMessageIndex + 1, messagesBuffer.length - 1);
    showMessageByIndex(currentMessageIndex);
  }
});

// O‘rta tugma - hammasini ko‘rsatish
document.addEventListener('mousedown', (e) => {
  if (e.button === 1 && messagesActive) {
    const container = document.getElementById('mini-window-content');
    if (container) {
      container.innerHTML = messagesBuffer.map(m => `<p>${m}</p>`).join('');
      document.getElementById('mini-window').style.display = 'block';
    }
  }

  // Yangi: o‘ng tugma - ochish/yopish
  if (e.button === 2) {
    rightPressed = true;
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
    toggleMessages();
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

// 'z' tugmasi - o‘ng tugma bilan bir xil ish
document.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 'z') {
    toggleMessages(); 
  }
});

// == Tugmalar orqali AI ga yuborish ==
let holdTimer = null;
let holdTriggered = false;

function setupHoldToSendToAI(keyOrButton) {
  const startHold = () => {
    holdTriggered = false;
    holdTimer = setTimeout(() => {
      if (!holdTriggered) {
        sendQuestionsToAI();
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

setupHoldToSendToAI('x');
setupHoldToSendToAI(0);

// == Savollarni olish va AI ga yuborish ==
function extractImageLinks(element) {
  const images = element?.querySelectorAll('img') || [];
  return Array.from(images).map(img => img.src).join('\n');
}

async function sendQuestionsToAI() {
  const tests = document.querySelectorAll('.table-test');
  const sortedTests = Array.from(tests).sort((a, b) => {
    const idA = parseInt(a.id.replace(/\D/g, ''), 10);
    const idB = parseInt(b.id.replace(/\D/g, ''), 10);
    return idA - idB;
  });

  let prompt = "Bu savollarga to'g'ri javoblarni bering. Format: 1A 2B 3C ... (har bir savol uchun variant harfi bilan).\n\n";

  for (let i = 0; i < sortedTests.length; i++) {
    const test = sortedTests[i];
    prompt += `Savol ${i + 1}:\n`;
    const question = test.querySelector('.test-question p')?.textContent.trim() || 'Savol topilmadi';
    prompt += `${question}\n\n`;

    const questionImages = extractImageLinks(test.querySelector('.test-question'));
    if (questionImages) {
      prompt += `Savoldagi rasmlar:\n${questionImages}\n\n`;
    }

    const answers = Array.from(test.querySelectorAll('.answers-test li')).map((li, index) => {
      const variant = li.querySelector('.test-variant')?.textContent.trim() || '';
      const answerText = li.querySelector('label p')?.textContent.trim() || '';
      const answerImage = extractImageLinks(li);
      return `${variant}. ${answerText} ${answerImage ? `(Rasm: ${answerImage})` : ''}`;
    });

    prompt += 'Javob variantlari:\n';
    prompt += answers.join('\n') + '\n\n';
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiApiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini', // Yoki sizga kerakli model (masalan, gpt-4o)
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!response.ok) {
    console.error('AI ga yuborishda xato:', await response.text());
    return;
  }

  const data = await response.json();
  const aiResponse = data.choices[0].message.content.trim();

  // Javoblarni parse: "1A 2B 3C" ni ajratib, massivga
  messagesBuffer = aiResponse.split(/\s+/).filter(Boolean); // Bo'shliq yoki yangi qator bo'yicha ajratish
  currentMessageIndex = messagesBuffer.length - 1;

  // Agar oyna ochiq bo'lsa, oxirgi javobni ko'rsat
  if (messagesActive) {
    showMessageByIndex(currentMessageIndex);
  }
}

// == Zapusk ==
createMiniWindow();
