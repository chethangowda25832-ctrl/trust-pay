
const API = 'http://127.0.0.1:5000/api';
let currentUser = null;
let pendingTxn = null;
let pinBuffer = '';
let balanceHidden = false;
let riskChart = null, distChart = null;

/* ═══════════════════════════════════════════════════════════
   UTILS
═══════════════════════════════════════════════════════════ */
const fmt = n => '₹' + Number(n).toLocaleString('en-IN');
const initials = name => name ? name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2) : '?';
const avatarColor = name => {
  const colors = ['#7c3aed','#2563eb','#059669','#d97706','#dc2626','#7c3aed','#0891b2','#9333ea'];
  let h = 0; for(let c of (name||'')) h = (h*31 + c.charCodeAt(0)) & 0xffff;
  return colors[h % colors.length];
};
const timeAgo = ts => {
  const d = new Date(ts), now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if(diff < 60) return 'Just now';
  if(diff < 3600) return Math.floor(diff/60) + 'm ago';
  if(diff < 86400) return Math.floor(diff/3600) + 'h ago';
  return d.toLocaleDateString('en-IN', {day:'numeric', month:'short'});
};
const riskLevel = score => score >= 70 ? 'HIGH' : score >= 40 ? 'MEDIUM' : 'SAFE';

function showToast(msg, type='info') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.borderColor = type==='success' ? 'var(--safe)' : type==='error' ? 'var(--high)' : 'var(--border)';
  t.classList.remove('hidden');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.add('hidden'), 3500);
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

/* ═══════════════════════════════════════════════════════════
   AUTH
═══════════════════════════════════════════════════════════ */
async function doLogin() {
  const phone = document.getElementById('login-phone').value.trim();
  const pin   = document.getElementById('login-pin').value.trim();
  if(!phone || !pin) { showToast('Enter phone and PIN','error'); return; }
  try {
    const r = await fetch(API+'/login', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({phone, pin})});
    const d = await r.json();
    if(d.status === 'ok') { currentUser = d.user; launchApp(); }
    else showToast(d.message || 'Login failed','error');
  } catch(e) { showToast('Cannot connect to server','error'); }
}

async function doRegister() {
  const name  = document.getElementById('reg-name').value.trim();
  const phone = document.getElementById('reg-phone').value.trim();
  const upi   = document.getElementById('reg-upi').value.trim();
  const pin   = document.getElementById('reg-pin').value.trim();
  if(!name||!phone||!pin) { showToast('Fill all required fields','error'); return; }
  try {
    const r = await fetch(API+'/register', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({name, phone, upi_id: upi||phone+'@trustpay', pin})});
    const d = await r.json();
    if(d.status === 'ok') { currentUser = d.user; launchApp(); }
    else showToast(d.message || 'Registration failed','error');
  } catch(e) { showToast('Cannot connect to server','error'); }
}

function launchApp() {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  document.getElementById('app-shell').classList.remove('hidden');
  document.getElementById('app-shell').style.display = 'flex';
  startClock();
  navTo('home');
}

function logout() {
  currentUser = null;
  document.getElementById('app-shell').classList.add('hidden');
  document.getElementById('app-shell').style.display = 'none';
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('hidden'));
  showScreen('screen-login');
}

/* ═══════════════════════════════════════════════════════════
   CLOCK
═══════════════════════════════════════════════════════════ */
function startClock() {
  const tick = () => {
    const now = new Date();
    document.getElementById('status-time').textContent =
      now.toLocaleTimeString('en-IN', {hour:'2-digit', minute:'2-digit', hour12:true});
  };
  tick(); setInterval(tick, 10000);
}

/* ═══════════════════════════════════════════════════════════
   NAVIGATION
═══════════════════════════════════════════════════════════ */
function navTo(page) {
  document.querySelectorAll('.app-page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.bnav-btn').forEach(b => b.classList.remove('active'));
  const pg = document.getElementById('page-'+page);
  if(pg) pg.classList.add('active');
  const nb = document.getElementById('bnav-'+page);
  if(nb) nb.classList.add('active');
  const builders = {home: buildHome, send: buildSend, history: buildHistory,
                    profile: buildProfile, scan: buildScan, dashboard: buildDashboard,
                    recharge: buildRecharge, request: buildRequest};
  if(builders[page]) builders[page]();
}

/* ═══════════════════════════════════════════════════════════
   HOME PAGE
═══════════════════════════════════════════════════════════ */
async function buildHome() {
  const pg = document.getElementById('page-home');
  const u = currentUser;
  const bal = balanceHidden ? '••••••' : fmt(u.balance);
  pg.innerHTML = `
    <div class="home-header">
      <div class="home-top">
        <div>
          <div class="home-greeting">Good ${getGreeting()},</div>
          <div class="home-name">${u.name}</div>
        </div>
        <div class="home-avatar" onclick="navTo('profile')">${initials(u.name)}</div>
      </div>
      <div class="balance-card">
        <div class="balance-label">Total Balance</div>
        <div class="balance-amount" id="bal-display">${bal}
          <button class="balance-eye" onclick="toggleBalance()">👁</button>
        </div>
        <div class="balance-upi">${u.upi_id}</div>
      </div>
    </div>
    <div class="quick-actions">
      <div class="section-title">Quick Actions</div>
      <div class="qa-grid">
        <button class="qa-btn" onclick="navTo('send')">
          <div class="qa-icon purple">💸</div><span class="qa-label">Send Money</span>
        </button>
        <button class="qa-btn" onclick="navTo('request')">
          <div class="qa-icon green">📥</div><span class="qa-label">Request</span>
        </button>
        <button class="qa-btn" onclick="navTo('scan')">
          <div class="qa-icon blue">⊞</div><span class="qa-label">Scan QR</span>
        </button>
        <button class="qa-btn" onclick="navTo('recharge')">
          <div class="qa-icon orange">📱</div><span class="qa-label">Recharge</span>
        </button>
        <button class="qa-btn" onclick="showToast('Coming soon!')">
          <div class="qa-icon pink">🏦</div><span class="qa-label">Bank</span>
        </button>
        <button class="qa-btn" onclick="showToast('Coming soon!')">
          <div class="qa-icon teal">💡</div><span class="qa-label">Electricity</span>
        </button>
        <button class="qa-btn" onclick="showToast('Coming soon!')">
          <div class="qa-icon yellow">🛒</div><span class="qa-label">Shopping</span>
        </button>
        <button class="qa-btn" onclick="navTo('dashboard')">
          <div class="qa-icon red">📊</div><span class="qa-label">Insights</span>
        </button>
      </div>
    </div>
    <div class="people-section" id="people-section">
      <div class="section-title">People</div>
      <div class="people-scroll" id="people-scroll">
        <div style="color:var(--text3);font-size:.8rem;padding:.5rem">Loading...</div>
      </div>
    </div>
    <div class="offers-section">
      <div class="section-title">Offers for You</div>
      <div class="offer-card" onclick="showToast('Offer applied!')">
        <div class="offer-icon">🎁</div>
        <div><div class="offer-title">Get ₹50 cashback</div><div class="offer-sub">On your first 3 transactions today</div></div>
      </div>
      <div class="offer-card" onclick="showToast('Offer applied!')">
        <div class="offer-icon">⚡</div>
        <div><div class="offer-title">Instant recharge bonus</div><div class="offer-sub">Extra 1GB data on ₹299+ recharge</div></div>
      </div>
    </div>
    <div class="recent-section" id="recent-section">
      <div class="section-title">Recent Transactions</div>
      <div id="recent-list"><div style="color:var(--text3);font-size:.85rem;padding:1rem 0">Loading...</div></div>
    </div>`;
  loadPeople();
  loadRecent();
}

function getGreeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening';
}

function toggleBalance() {
  balanceHidden = !balanceHidden;
  const u = currentUser;
  const el = document.getElementById('bal-display');
  if(el) el.innerHTML = (balanceHidden ? '••••••' : fmt(u.balance)) +
    '<button class="balance-eye" onclick="toggleBalance()">👁</button>';
}

async function loadPeople() {
  try {
    const r = await fetch(API+'/contacts/'+currentUser.id);
    const contacts = await r.json();
    const scroll = document.getElementById('people-scroll');
    if(!scroll) return;
    scroll.innerHTML = contacts.slice(0,8).map(c => {
      const col = avatarColor(c.name);
      return `<div class="person-btn" onclick="openSendTo('${c.upi_id||''}','${c.name}')">
        <div class="person-avatar" style="background:${col}">${initials(c.name)}</div>
        <div class="person-name">${c.name.split(' ')[0]}</div>
      </div>`;
    }).join('') + `<div class="person-btn" onclick="navTo('send')">
      <div class="person-avatar" style="background:var(--bg3);border:2px dashed var(--border2);color:var(--text3)">+</div>
      <div class="person-name">Add New</div>
    </div>`;
  } catch(e) {}
}

async function loadRecent() {
  try {
    const r = await fetch(API+'/history?user_id='+currentUser.id);
    const d = await r.json();
    const list = document.getElementById('recent-list');
    if(!list) return;
    const items = (d.history||[]).slice(0,5);
    if(!items.length) { list.innerHTML = '<div style="color:var(--text3);font-size:.85rem;padding:1rem 0">No transactions yet</div>'; return; }
    list.innerHTML = items.map(t => {
      const col = avatarColor(t.receiver_name||t.receiver_upi);
      const isDebit = t.type === 'debit' || t.type === 'recharge';
      const sign = isDebit ? '-' : '+';
      const cls  = isDebit ? 'debit' : 'credit';
      return `<div class="txn-item">
        <div class="txn-avatar" style="background:${col}">${initials(t.receiver_name||t.receiver_upi)}</div>
        <div class="txn-info">
          <div class="txn-name">${t.receiver_name||t.receiver_upi}</div>
          <div class="txn-note">${t.note||t.type}</div>
        </div>
        <div class="txn-right">
          <div class="txn-amount ${cls}">${sign}${fmt(t.amount)}</div>
          <div class="txn-time">${timeAgo(t.timestamp)}</div>
        </div>
      </div>`;
    }).join('');
  } catch(e) {}
}

/* ═══════════════════════════════════════════════════════════
   SEND PAGE
═══════════════════════════════════════════════════════════ */
function buildSend(prefillUpi='', prefillName='') {
  const pg = document.getElementById('page-send');
  pg.innerHTML = `
    <div class="page-header">
      <button class="back-btn" onclick="navTo('home')">←</button>
      <h2>Send Money</h2>
    </div>
    <div class="send-body">
      <div class="upi-search-wrap">
        <span class="search-icon">🔍</span>
        <input type="text" id="send-upi" placeholder="Enter UPI ID (e.g. name@upi)" value="${prefillUpi}" oninput="lookupUPI(this.value)"/>
        <span class="verified-badge hidden" id="verified-badge">✓ Verified</span>
      </div>
      <div id="receiver-info"></div>
      <div class="amount-display">
        <span class="amount-prefix">₹</span>
        <input type="number" class="amount-input" id="send-amount" placeholder="0" min="1"/>
      </div>
      <div class="amount-underline"></div>
      <br/>
      <div class="quick-amounts">
        <span class="quick-amt" onclick="setAmt(100)">₹100</span>
        <span class="quick-amt" onclick="setAmt(200)">₹200</span>
        <span class="quick-amt" onclick="setAmt(500)">₹500</span>
        <span class="quick-amt" onclick="setAmt(1000)">₹1,000</span>
        <span class="quick-amt" onclick="setAmt(2000)">₹2,000</span>
        <span class="quick-amt" onclick="setAmt(5000)">₹5,000</span>
      </div>
      <input type="text" class="note-input" id="send-note" placeholder="Add a note (optional)"/>
      <button class="pay-now-btn" onclick="initiatePay()">
        <span>🔒</span> Pay Securely
      </button>
      <div class="contacts-list">
        <div class="section-title" style="margin-top:1rem">Your Contacts</div>
        <div id="contacts-list-inner"><div style="color:var(--text3);font-size:.85rem">Loading...</div></div>
      </div>
    </div>`;
  if(prefillUpi) lookupUPI(prefillUpi);
  loadContactsList();
}

function openSendTo(upi, name) {
  navTo('send');
  setTimeout(() => {
    document.getElementById('send-upi').value = upi;
    lookupUPI(upi);
  }, 100);
}

function setAmt(n) {
  const el = document.getElementById('send-amount');
  if(el) el.value = n;
}

let lookupTimer = null;
async function lookupUPI(val) {
  clearTimeout(lookupTimer);
  const badge = document.getElementById('verified-badge');
  const info  = document.getElementById('receiver-info');
  if(!val || val.length < 5) { if(badge) badge.classList.add('hidden'); if(info) info.innerHTML=''; return; }
  lookupTimer = setTimeout(async () => {
    try {
      const r = await fetch(API+'/lookup?upi='+encodeURIComponent(val));
      const d = await r.json();
      if(d.found) {
        badge.classList.remove('hidden');
        const col = avatarColor(d.user.name);
        info.innerHTML = `<div class="receiver-card">
          <div class="receiver-avatar" style="background:${col}">${initials(d.user.name)}</div>
          <div><div class="receiver-name">${d.user.name}</div><div class="receiver-upi">${d.user.upi_id}</div></div>
        </div>`;
      } else {
        badge.classList.add('hidden');
        info.innerHTML = `<div class="receiver-card" style="border-color:var(--border2)">
          <div class="receiver-avatar" style="background:var(--bg4)">?</div>
          <div><div class="receiver-name" style="color:var(--text2)">Unknown User</div><div class="receiver-upi">${val}</div></div>
        </div>`;
      }
    } catch(e) {}
  }, 500);
}

async function loadContactsList() {
  try {
    const r = await fetch(API+'/contacts/'+currentUser.id);
    const contacts = await r.json();
    const el = document.getElementById('contacts-list-inner');
    if(!el) return;
    el.innerHTML = contacts.map(c => {
      const col = avatarColor(c.name);
      return `<div class="contact-item" onclick="openSendTo('${c.upi_id||''}','${c.name}')">
        <div class="contact-avatar" style="background:${col}">${initials(c.name)}</div>
        <div><div class="contact-name">${c.name}</div><div class="contact-upi">${c.upi_id||c.contact_phone}</div></div>
      </div>`;
    }).join('');
  } catch(e) {}
}

async function initiatePay() {
  const upi    = document.getElementById('send-upi').value.trim();
  const amount = parseFloat(document.getElementById('send-amount').value);
  const note   = document.getElementById('send-note').value.trim();
  if(!upi)    { showToast('Enter a UPI ID','error'); return; }
  if(!amount || amount <= 0) { showToast('Enter a valid amount','error'); return; }
  if(amount > currentUser.balance) { showToast('Insufficient balance','error'); return; }
  const btn = document.querySelector('.pay-now-btn');
  if(btn) { btn.disabled = true; btn.textContent = 'Analyzing...'; }
  try {
    const r = await fetch(API+'/analyze', {method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({user_id: currentUser.id, upi_id: upi, amount, note})});
    const risk = await r.json();
    pendingTxn = {upi, amount, note, risk};
    showFraudModal(risk);
  } catch(e) {
    showToast('Server error','error');
  } finally {
    if(btn) { btn.disabled = false; btn.innerHTML = '<span>🔒</span> Pay Securely'; }
  }
}

/* ═══════════════════════════════════════════════════════════
   FRAUD MODAL
═══════════════════════════════════════════════════════════ */
function showFraudModal(risk) {
  const lvl = risk.risk_level;
  const hdr = document.getElementById('modal-header');
  hdr.className = 'modal-header ' + lvl.toLowerCase();
  document.getElementById('modal-emoji').textContent = risk.emoji;
  document.getElementById('modal-title').textContent =
    lvl==='HIGH' ? '🚨 High Risk Detected' : lvl==='MEDIUM' ? '⚠️ Medium Risk' : '✅ Safe Transaction';
  document.getElementById('modal-sub').textContent =
    `${fmt(risk.amount)} → ${risk.upi_id}`;
  document.getElementById('modal-score').textContent = risk.risk_score + '%';
  document.getElementById('modal-score').style.color = risk.color;
  setTimeout(() => {
    document.getElementById('modal-bar').style.width = risk.risk_score + '%';
  }, 100);
  const reasons = document.getElementById('modal-reasons');
  if(risk.reasons && risk.reasons.length) {
    reasons.innerHTML = '<strong style="display:block;margin-bottom:.5rem">Why flagged:</strong>' +
      risk.reasons.map(r => `<div style="padding:.2rem 0;border-bottom:1px solid var(--border)">• ${r}</div>`).join('');
  } else {
    reasons.innerHTML = '<div style="color:var(--safe)">✓ No anomalies detected</div>';
  }
  const scam = document.getElementById('modal-scam');
  risk.social_engineering ? scam.classList.remove('hidden') : scam.classList.add('hidden');
  const sq = document.getElementById('modal-smartq');
  if(risk.smart_question && lvl !== 'SAFE') {
    sq.classList.remove('hidden');
    document.getElementById('modal-sq-text').textContent = risk.smart_question;
  } else { sq.classList.add('hidden'); }
  if(lvl === 'SAFE') {
    document.getElementById('modal-actions').classList.add('hidden');
    document.getElementById('modal-safe-actions').classList.remove('hidden');
  } else {
    document.getElementById('modal-actions').classList.remove('hidden');
    document.getElementById('modal-safe-actions').classList.add('hidden');
  }
  document.getElementById('fraud-modal').classList.remove('hidden');
}

function sqAnswer(ans) {
  const sq = document.getElementById('modal-smartq');
  if(ans === 'yes') {
    sq.innerHTML = '<div style="color:var(--high);font-weight:700;font-size:.9rem">🚨 STOP! No bank, police or government will ever ask you to transfer money urgently. This is a scam.</div>';
  } else {
    sq.innerHTML = '<div style="color:var(--text2);font-size:.85rem">✓ Okay. Review the risk factors carefully before proceeding.</div>';
  }
}

function modalAction(action) {
  document.getElementById('fraud-modal').classList.add('hidden');
  document.getElementById('modal-bar').style.width = '0';
  if(action === 'cancel') {
    showToast('Transaction cancelled', 'info');
    pendingTxn = null;
    return;
  }
  if(action === 'proceed' && pendingTxn) {
    openPinModal(pendingTxn.upi, pendingTxn.amount);
  }
}

/* ═══════════════════════════════════════════════════════════
   PIN MODAL
═══════════════════════════════════════════════════════════ */
function openPinModal(upi, amount) {
  pinBuffer = '';
  updatePinDots();
  document.getElementById('pin-to-name').textContent = 'Paying ' + upi;
  document.getElementById('pin-amount-display').textContent = fmt(amount);
  document.getElementById('pin-modal').classList.remove('hidden');
}

function closePinModal() {
  document.getElementById('pin-modal').classList.add('hidden');
  pinBuffer = '';
  updatePinDots();
  pendingTxn = null;
}

function pinKey(k) {
  if(k === 'back') { pinBuffer = pinBuffer.slice(0,-1); updatePinDots(); return; }
  if(k === 'ok') { verifyAndSend(); return; }
  if(pinBuffer.length >= 6) return;
  pinBuffer += k;
  updatePinDots();
  if(pinBuffer.length === 4) setTimeout(verifyAndSend, 200);
}

function updatePinDots() {
  const dots = document.querySelectorAll('#pin-dots span');
  dots.forEach((d,i) => {
    d.className = i < pinBuffer.length ? 'filled' : '';
  });
}

async function verifyAndSend() {
  if(pinBuffer.length < 4) { showToast('Enter 4-digit PIN','error'); return; }
  if(pinBuffer !== String(currentUser.pin)) {
    showToast('Wrong PIN. Try again.','error');
    pinBuffer = ''; updatePinDots(); return;
  }
  document.getElementById('pin-modal').classList.add('hidden');
  const txn = pendingTxn;
  pendingTxn = null; pinBuffer = '';
  try {
    const r = await fetch(API+'/send', {method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({sender_id: currentUser.id, upi_id: txn.upi, amount: txn.amount, note: txn.note, risk_score: txn.risk.risk_score})});
    const d = await r.json();
    if(d.status === 'ok') {
      currentUser.balance -= txn.amount;
      showToast('✅ ' + d.message, 'success');
      showSuccessScreen(txn);
    } else { showToast(d.message || 'Payment failed','error'); }
  } catch(e) { showToast('Payment failed','error'); }
}

function showSuccessScreen(txn) {
  const pg = document.getElementById('page-send');
  pg.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:80vh;padding:2rem;text-align:center">
      <div style="font-size:5rem;margin-bottom:1rem;animation:bounceIn .5s">✅</div>
      <h2 style="font-size:1.8rem;font-weight:900;color:var(--safe);margin-bottom:.5rem">Payment Sent!</h2>
      <p style="color:var(--text2);margin-bottom:.5rem">${fmt(txn.amount)} sent to</p>
      <p style="font-size:1.1rem;font-weight:700;margin-bottom:2rem">${txn.upi}</p>
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:1.2rem;width:100%;margin-bottom:2rem">
        <div style="display:flex;justify-content:space-between;margin-bottom:.5rem"><span style="color:var(--text2)">Amount</span><span style="font-weight:700">${fmt(txn.amount)}</span></div>
        <div style="display:flex;justify-content:space-between;margin-bottom:.5rem"><span style="color:var(--text2)">To</span><span>${txn.upi}</span></div>
        <div style="display:flex;justify-content:space-between"><span style="color:var(--text2)">Note</span><span>${txn.note||'—'}</span></div>
      </div>
      <button class="btn-primary" onclick="navTo('home')">Back to Home</button>
    </div>`;
}

/* ═══════════════════════════════════════════════════════════
   HISTORY PAGE
═══════════════════════════════════════════════════════════ */
async function buildHistory() {
  const pg = document.getElementById('page-history');
  pg.innerHTML = `
    <div class="page-header">
      <button class="back-btn" onclick="navTo('home')">←</button>
      <h2>Transaction History</h2>
    </div>
    <div class="history-filters">
      <button class="filter-btn active" onclick="filterHistory('all',this)">All</button>
      <button class="filter-btn" onclick="filterHistory('debit',this)">Sent</button>
      <button class="filter-btn" onclick="filterHistory('credit',this)">Received</button>
      <button class="filter-btn" onclick="filterHistory('recharge',this)">Recharge</button>
      <button class="filter-btn" onclick="filterHistory('high',this)">High Risk</button>
    </div>
    <div class="history-list" id="history-list"><div class="loader-spin">Loading…</div></div>`;
  loadHistoryData('all');
}

let allHistory = [];
async function loadHistoryData(filter) {
  try {
    const r = await fetch(API+'/history?user_id='+currentUser.id);
    const d = await r.json();
    allHistory = d.history || [];
    renderHistory(filter);
  } catch(e) {
    document.getElementById('history-list').innerHTML = '<div class="loader-spin">⚠️ Could not load</div>';
  }
}

function filterHistory(filter, btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  renderHistory(filter);
}

function renderHistory(filter) {
  const el = document.getElementById('history-list');
  if(!el) return;
  let items = allHistory;
  if(filter === 'debit')   items = items.filter(t => t.type === 'debit');
  if(filter === 'credit')  items = items.filter(t => t.type === 'credit');
  if(filter === 'recharge')items = items.filter(t => t.type === 'recharge');
  if(filter === 'high')    items = items.filter(t => t.risk_score >= 70);
  if(!items.length) { el.innerHTML = '<div class="loader-spin" style="color:var(--text3)">No transactions found</div>'; return; }
  el.innerHTML = items.map(t => {
    const col  = avatarColor(t.receiver_name||t.receiver_upi);
    const lvl  = riskLevel(t.risk_score);
    const isDebit = t.type==='debit'||t.type==='recharge';
    const sign = isDebit ? '-' : '+';
    const cls  = isDebit ? 'debit' : 'credit';
    const icon = t.type==='recharge' ? '📱' : t.type==='request' ? '📥' : isDebit ? '↑' : '↓';
    return `<div class="history-item">
      <div class="hi-avatar" style="background:${col}">${initials(t.receiver_name||t.receiver_upi)}</div>
      <div class="hi-info">
        <div class="hi-name">${t.receiver_name||t.receiver_upi}</div>
        <div class="hi-meta">
          <span class="risk-dot ${lvl.toLowerCase()}"></span>
          ${t.note||t.type} · ${timeAgo(t.timestamp)}
        </div>
      </div>
      <div class="hi-right">
        <div class="hi-amount ${cls}">${sign}${fmt(t.amount)}</div>
        <div class="hi-time">${t.action==='cancel'?'Cancelled':lvl+' '+Math.round(t.risk_score)+'%'}</div>
      </div>
    </div>`;
  }).join('');
}

/* ═══════════════════════════════════════════════════════════
   SCAN PAGE
═══════════════════════════════════════════════════════════ */
function buildScan() {
  const pg = document.getElementById('page-scan');
  pg.innerHTML = `
    <div class="page-header">
      <button class="back-btn" onclick="navTo('home')">←</button>
      <h2>Scan & Pay</h2>
    </div>
    <div class="scan-body">
      <p class="scan-label">Point camera at a QR code to pay</p>
      <div class="scan-frame">
        <div class="scan-corners"></div>
        <div class="scan-line"></div>
        <div class="scan-qr-icon">⊞</div>
      </div>
      <p style="color:var(--text3);font-size:.8rem;margin-bottom:1.5rem">Camera access required for QR scanning</p>
      <div class="scan-divider">OR</div>
      <p style="color:var(--text2);font-size:.85rem;margin-bottom:.8rem;text-align:left">Enter UPI ID manually</p>
      <div class="scan-manual">
        <input type="text" id="scan-upi-input" placeholder="Enter UPI ID (e.g. name@upi)" style="margin-bottom:1rem"/>
        <button class="btn-primary" onclick="scanManualPay()">Proceed to Pay</button>
      </div>
    </div>`;
}

function scanManualPay() {
  const upi = document.getElementById('scan-upi-input').value.trim();
  if(!upi) { showToast('Enter a UPI ID','error'); return; }
  openSendTo(upi, '');
}

/* ═══════════════════════════════════════════════════════════
   REQUEST PAGE
═══════════════════════════════════════════════════════════ */
function buildRequest() {
  const pg = document.getElementById('page-request');
  pg.innerHTML = `
    <div class="page-header">
      <button class="back-btn" onclick="navTo('home')">←</button>
      <h2>Request Money</h2>
    </div>
    <div class="send-body">
      <div class="upi-search-wrap">
        <span class="search-icon">🔍</span>
        <input type="text" id="req-upi" placeholder="Enter UPI ID to request from"/>
      </div>
      <div class="amount-display">
        <span class="amount-prefix">₹</span>
        <input type="number" class="amount-input" id="req-amount" placeholder="0" min="1"/>
      </div>
      <div class="amount-underline"></div><br/>
      <div class="quick-amounts">
        <span class="quick-amt" onclick="document.getElementById('req-amount').value=100">₹100</span>
        <span class="quick-amt" onclick="document.getElementById('req-amount').value=200">₹200</span>
        <span class="quick-amt" onclick="document.getElementById('req-amount').value=500">₹500</span>
        <span class="quick-amt" onclick="document.getElementById('req-amount').value=1000">₹1,000</span>
      </div>
      <input type="text" class="note-input" id="req-note" placeholder="Reason for request"/>
      <button class="pay-now-btn" style="background:linear-gradient(135deg,var(--safe),#059669)" onclick="sendRequest()">
        📥 Send Request
      </button>
    </div>`;
}

async function sendRequest() {
  const upi    = document.getElementById('req-upi').value.trim();
  const amount = parseFloat(document.getElementById('req-amount').value);
  const note   = document.getElementById('req-note').value.trim();
  if(!upi||!amount) { showToast('Fill UPI ID and amount','error'); return; }
  try {
    const r = await fetch(API+'/request', {method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({user_id: currentUser.id, upi_id: upi, amount, note})});
    const d = await r.json();
    showToast(d.message || 'Request sent!', 'success');
    navTo('home');
  } catch(e) { showToast('Failed to send request','error'); }
}

/* ═══════════════════════════════════════════════════════════
   RECHARGE PAGE
═══════════════════════════════════════════════════════════ */
function buildRecharge() {
  const pg = document.getElementById('page-recharge');
  const plans = [
    {price:149,validity:'28 days',data:'1GB/day'},
    {price:199,validity:'28 days',data:'1.5GB/day'},
    {price:299,validity:'28 days',data:'2GB/day'},
    {price:399,validity:'56 days',data:'2GB/day'},
    {price:599,validity:'84 days',data:'2GB/day'},
    {price:999,validity:'365 days',data:'2GB/day'},
  ];
  pg.innerHTML = `
    <div class="page-header">
      <button class="back-btn" onclick="navTo('home')">←</button>
      <h2>Mobile Recharge</h2>
    </div>
    <div class="recharge-body">
      <div class="form-group">
        <label>Mobile Number</label>
        <input type="tel" id="rch-mobile" placeholder="Enter 10-digit number" maxlength="10" value="${currentUser.phone}"/>
      </div>
      <div class="form-group">
        <label>Select Operator</label>
        <div class="operator-grid">
          ${['Airtel','Jio','Vi','BSNL','MTNL','Others'].map(op =>
            `<div class="operator-btn ${op==='Airtel'?'selected':''}" onclick="selectOp(this,'${op}')">${op}</div>`
          ).join('')}
        </div>
      </div>
      <div class="form-group">
        <label>Popular Plans</label>
        <div class="plan-grid">
          ${plans.map(p =>
            `<div class="plan-card" onclick="selectPlan(this,${p.price})">
              <div class="plan-price">₹${p.price}</div>
              <div class="plan-validity">${p.validity}</div>
              <div class="plan-data">${p.data}</div>
            </div>`
          ).join('')}
        </div>
      </div>
      <div class="form-group">
        <label>Amount</label>
        <input type="number" id="rch-amount" placeholder="Or enter custom amount" min="10"/>
      </div>
      <button class="pay-now-btn" onclick="doRecharge()">📱 Recharge Now</button>
    </div>`;
}

function selectOp(el, op) {
  document.querySelectorAll('.operator-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  el.dataset.op = op;
}

function selectPlan(el, price) {
  document.querySelectorAll('.plan-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('rch-amount').value = price;
}

async function doRecharge() {
  const mobile   = document.getElementById('rch-mobile').value.trim();
  const amount   = parseFloat(document.getElementById('rch-amount').value);
  const opEl     = document.querySelector('.operator-btn.selected');
  const operator = opEl ? opEl.textContent : 'Airtel';
  if(!mobile||mobile.length!==10) { showToast('Enter valid 10-digit number','error'); return; }
  if(!amount||amount<10) { showToast('Enter valid amount','error'); return; }
  if(amount > currentUser.balance) { showToast('Insufficient balance','error'); return; }
  try {
    const r = await fetch(API+'/recharge', {method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({user_id: currentUser.id, mobile, amount, operator})});
    const d = await r.json();
    if(d.status==='ok') {
      currentUser.balance -= amount;
      showToast('✅ ' + d.message, 'success');
      navTo('home');
    } else showToast(d.message||'Recharge failed','error');
  } catch(e) { showToast('Recharge failed','error'); }
}

/* ═══════════════════════════════════════════════════════════
   PROFILE PAGE
═══════════════════════════════════════════════════════════ */
function buildProfile() {
  const u = currentUser;
  const pg = document.getElementById('page-profile');
  pg.innerHTML = `
    <div class="profile-header">
      <div class="profile-avatar-lg">${initials(u.name)}</div>
      <div class="profile-name">${u.name}</div>
      <div class="profile-upi">${u.upi_id}</div>
    </div>
    <div class="profile-body">
      <div class="profile-section">
        <div class="profile-section-title">Account</div>
        <div class="profile-item">
          <div class="profile-item-icon" style="background:rgba(124,58,237,.15)">📱</div>
          <div class="profile-item-text">
            <div class="profile-item-label">Mobile Number</div>
            <div class="profile-item-sub">+91 ${u.phone}</div>
          </div>
          <span class="profile-item-arrow">›</span>
        </div>
        <div class="profile-item">
          <div class="profile-item-icon" style="background:rgba(16,185,129,.15)">💳</div>
          <div class="profile-item-text">
            <div class="profile-item-label">UPI ID</div>
            <div class="profile-item-sub">${u.upi_id}</div>
          </div>
          <span class="profile-item-arrow">›</span>
        </div>
        <div class="profile-item">
          <div class="profile-item-icon" style="background:rgba(245,158,11,.15)">💰</div>
          <div class="profile-item-text">
            <div class="profile-item-label">Balance</div>
            <div class="profile-item-sub">${fmt(u.balance)}</div>
          </div>
          <span class="profile-item-arrow">›</span>
        </div>
      </div>
      <div class="profile-section">
        <div class="profile-section-title">Security</div>
        <div class="profile-item" onclick="showToast('PIN change coming soon')">
          <div class="profile-item-icon" style="background:rgba(239,68,68,.15)">🔒</div>
          <div class="profile-item-text">
            <div class="profile-item-label">Change UPI PIN</div>
            <div class="profile-item-sub">Last changed 30 days ago</div>
          </div>
          <span class="profile-item-arrow">›</span>
        </div>
        <div class="profile-item" onclick="navTo('dashboard')">
          <div class="profile-item-icon" style="background:rgba(99,102,241,.15)">🛡️</div>
          <div class="profile-item-text">
            <div class="profile-item-label">TrustGuard Insights</div>
            <div class="profile-item-sub">View fraud protection stats</div>
          </div>
          <span class="profile-item-arrow">›</span>
        </div>
      </div>
      <div class="profile-section">
        <div class="profile-section-title">Support</div>
        <div class="profile-item" onclick="showToast('Help center coming soon')">
          <div class="profile-item-icon" style="background:rgba(59,130,246,.15)">❓</div>
          <div class="profile-item-text"><div class="profile-item-label">Help & Support</div></div>
          <span class="profile-item-arrow">›</span>
        </div>
        <div class="profile-item" onclick="showToast('About TrustPay v1.0')">
          <div class="profile-item-icon" style="background:rgba(20,184,166,.15)">ℹ️</div>
          <div class="profile-item-text"><div class="profile-item-label">About TrustPay</div><div class="profile-item-sub">Version 1.0.0</div></div>
          <span class="profile-item-arrow">›</span>
        </div>
      </div>
      <button class="logout-btn" onclick="logout()">🚪 Logout</button>
    </div>`;
}

// buildDashboard is defined in dashboard.js (behavioral analytics)

/* ═══════════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('app-shell').style.display = 'none';
  document.getElementById('login-pin').addEventListener('keydown', e => { if(e.key==='Enter') doLogin(); });
});
