/* ═══════════════════════════════════════════════════════════
   TRUSTPAY CHATBOT — Help & Support
   ═══════════════════════════════════════════════════════════ */

const BOT_RESPONSES = {
  greet: ['hi','hello','hey','hii','helo'],
  balance: ['balance','money','wallet','funds','amount'],
  send: ['send','pay','transfer','payment'],
  scan: ['scan','qr','camera','qr code'],
  pin: ['pin','password','change pin','forgot pin'],
  recharge: ['recharge','mobile','topup','top up','operator'],
  history: ['history','transactions','past','previous'],
  fraud: ['fraud','scam','risk','suspicious','block','lock'],
  limit: ['limit','daily limit','spending'],
  split: ['split','divide','share bill'],
  schedule: ['schedule','recurring','auto pay'],
  contact: ['contact','support','help','agent','human'],
  demo: ['demo','test','try','sample'],
  login: ['login','sign in','account','register'],
};

const ANSWERS = {
  greet: () => {
    const name = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.name.split(' ')[0] : 'there';
    return `👋 Hi ${name}! I'm TrustBot 🤖\n\nHow can I help you today?\n\n• 💰 Check balance\n• 💸 Send money\n• 📷 Scan QR\n• 🔒 Change PIN\n• 📊 View history`;
  },

  balance: () => {
    const bal = (typeof currentUser !== 'undefined' && currentUser) ? '₹' + Number(currentUser.balance).toLocaleString('en-IN') : 'N/A';
    return `💰 Your current balance is <strong>${bal}</strong>\n\nYou can see it on the Home screen. Tap the 👁 icon to show/hide it.`;
  },

  send: () => `💸 To send money:\n1. Tap <strong>Send Money</strong> on Home\n2. Enter UPI ID (e.g. friend@upi)\n3. Enter amount\n4. TrustGuard will check for fraud\n5. Enter your PIN to confirm\n\n⚡ Tip: Tap a contact from the People section for quick pay!`,

  scan: () => `📷 To scan a QR code:\n1. Tap the <strong>⊞ Scan</strong> button in the bottom nav\n2. Tap <strong>Start Camera</strong>\n\n⚠️ Camera needs HTTPS. If camera doesn't open:\n• Use <strong>🖼 Upload QR</strong> to scan from gallery\n• Or tap any <strong>Demo QR</strong> to test\n• Or enter UPI ID manually`,

  pin: () => `🔒 To change your UPI PIN:\n1. Go to <strong>Profile</strong> (👤 tab)\n2. Tap <strong>Security → Change UPI PIN</strong>\n3. Enter current PIN → new PIN → confirm\n\nIf you forgot your PIN, contact your bank.`,

  recharge: () => `📱 To recharge your mobile:\n1. Tap <strong>Recharge</strong> on Home\n2. Enter mobile number\n3. Select operator (Airtel, Jio, Vi...)\n4. Pick a plan or enter custom amount\n5. Tap Recharge Now`,

  history: () => `📋 To view transactions:\n1. Tap <strong>History</strong> (📋 tab)\n2. Filter by: All / Sent / Received / Recharge / High Risk\n\nEach transaction shows risk score and status.`,

  fraud: () => `🛡️ TrustGuard protects you by:\n• Analyzing your behavior patterns\n• Detecting unusual amounts (Z-score)\n• Identifying scam keywords\n• Checking receiver reputation\n\nIf you see a HIGH RISK warning — always tap ❌ Cancel!\n\nTo freeze your account: Profile → Emergency Lock`,

  limit: () => `📊 Spending limits:\n• Daily limit: ₹10,000 (default)\n• Weekly limit: ₹50,000 (default)\n\nTo change: Profile → Settings → Spending Limits\n\nYou can also check today's usage in the Insights dashboard.`,

  split: () => `🧾 To split a bill:\n1. Tap <strong>Send Money</strong>\n2. Scroll down to find Split Bill option\n\nOr use the API: enter multiple contacts and amounts to split equally.`,

  schedule: () => `⏰ Scheduled payments:\n• Netflix subscription is already scheduled\n• To add: Profile → Scheduled Payments → Add New\n• Set receiver, amount, frequency (weekly/monthly)`,

  contact: () => `🤝 Need more help?\n\n📧 Email: support@trustpay.in\n📞 Helpline: 1800-XXX-XXXX\n🕐 Available: 9AM – 9PM\n\nFor urgent issues like fraud or account lock, call immediately.\n\nI'm TrustBot and I'm here 24/7 for quick help!`,

  demo: () => `🎯 Demo credentials:\n• Phone: <strong>9876543210</strong>\n• PIN: <strong>1234</strong>\n• Balance: ₹75,000\n\nDemo test cases:\n✅ Safe: priya@trustpay ₹500\n⚠️ Medium: unknown@ybl ₹5,000\n🚨 Scam: taxrefund@upi ₹50,000 "urgent KYC"`,

  login: () => `🔐 Login info:\n• Use your registered mobile number\n• Enter your 4-6 digit UPI PIN\n\nNew user? Tap <strong>Create Account</strong> on the login screen.\n\nDemo: 9876543210 / PIN: 1234`,

  default: () => `🤔 I'm not sure about that. Here's what I can help with:\n\n💰 Balance | 💸 Send money | 📷 Scan QR\n🔒 Change PIN | 📱 Recharge | 📋 History\n🛡️ Fraud protection | 📊 Limits\n🤝 Contact support\n\nJust type any of these topics!`,
};

let chatOpen = false;

function initChatbot() {
  // Don't add twice
  if (document.getElementById('chat-btn')) return;

  const chatHTML = `
    <button id="chat-btn" onclick="toggleChat()" title="Help & Support" style="display:none">
      <span id="chat-btn-icon">💬</span>
      <span class="chat-badge hidden" id="chat-badge">1</span>
    </button>
    <div id="chat-window" class="chat-window hidden">
      <div class="chat-header">
        <div class="chat-header-left">
          <div class="chat-avatar">🤖</div>
          <div>
            <div class="chat-name">TrustBot</div>
            <div class="chat-status">● Online</div>
          </div>
        </div>
        <button class="chat-close" onclick="toggleChat()">✕</button>
      </div>
      <div class="chat-messages" id="chat-messages">
        <div class="chat-msg bot">
          <div class="chat-bubble">
            👋 Hi! I'm <strong>TrustBot</strong>, your TrustPay assistant.<br><br>
            How can I help you today?
          </div>
          <div class="chat-time">Just now</div>
        </div>
        <div class="chat-quick-btns" id="chat-quick">
          <button onclick="sendQuick('balance')">💰 Balance</button>
          <button onclick="sendQuick('send money')">💸 Send</button>
          <button onclick="sendQuick('scan qr')">📷 Scan</button>
          <button onclick="sendQuick('fraud')">🛡️ Fraud</button>
          <button onclick="sendQuick('contact support')">🤝 Support</button>
        </div>
      </div>
      <div class="chat-input-wrap">
        <input type="text" id="chat-input" placeholder="Type a message..."
          onkeydown="if(event.key==='Enter') sendChat()"/>
        <button onclick="sendChat()" class="chat-send-btn">➤</button>
      </div>
    </div>`;

  const div = document.createElement('div');
  div.id = 'chatbot-root';
  div.innerHTML = chatHTML;
  document.body.appendChild(div);
}

// Called from launchApp() after login
function showChatBtn() {
  const btn = document.getElementById('chat-btn');
  if (btn) btn.style.display = 'flex';
}

function toggleChat() {
  chatOpen = !chatOpen;
  const win  = document.getElementById('chat-window');
  const icon = document.getElementById('chat-btn-icon');
  const badge = document.getElementById('chat-badge');
  win.classList.toggle('hidden', !chatOpen);
  icon.textContent = chatOpen ? '✕' : '💬';
  if (chatOpen && badge) badge.classList.add('hidden');
  if (chatOpen) {
    setTimeout(() => {
      const input = document.getElementById('chat-input');
      if (input) input.focus();
      scrollChat();
    }, 100);
  }
}

function sendQuick(text) {
  const input = document.getElementById('chat-input');
  if (input) input.value = text;
  sendChat();
}

function sendChat() {
  const input = document.getElementById('chat-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  input.value = '';

  // Add user message
  addMessage(text, 'user');

  // Remove quick buttons after first message
  const quick = document.getElementById('chat-quick');
  if (quick) quick.remove();

  // Typing indicator
  const typingId = addTyping();

  setTimeout(() => {
    removeTyping(typingId);
    const response = getBotResponse(text.toLowerCase());
    addMessage(response, 'bot', true);
  }, 600 + Math.random() * 400);
}

function getBotResponse(text) {
  for (const [key, keywords] of Object.entries(BOT_RESPONSES)) {
    if (keywords.some(kw => text.includes(kw))) {
      return ANSWERS[key]();
    }
  }
  return ANSWERS.default();
}

function addMessage(text, type, isHTML = false) {
  const msgs = document.getElementById('chat-messages');
  if (!msgs) return;
  const now = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const div = document.createElement('div');
  div.className = `chat-msg ${type}`;
  div.innerHTML = `
    <div class="chat-bubble">${isHTML ? text.replace(/\n/g, '<br>') : escapeHTML(text)}</div>
    <div class="chat-time">${now}</div>`;
  msgs.appendChild(div);
  scrollChat();
}

function addTyping() {
  const msgs = document.getElementById('chat-messages');
  if (!msgs) return null;
  const id = 'typing-' + Date.now();
  const div = document.createElement('div');
  div.className = 'chat-msg bot';
  div.id = id;
  div.innerHTML = `<div class="chat-bubble chat-typing"><span></span><span></span><span></span></div>`;
  msgs.appendChild(div);
  scrollChat();
  return id;
}

function removeTyping(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function scrollChat() {
  const msgs = document.getElementById('chat-messages');
  if (msgs) msgs.scrollTop = msgs.scrollHeight;
}

function escapeHTML(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// Init chatbot DOM on page load (button hidden until login)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initChatbot);
} else {
  initChatbot();
}
