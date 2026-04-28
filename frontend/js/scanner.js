
/* ═══════════════════════════════════════════════════════════
   QR SCANNER + GENERATOR v2 — TrustPay
   - Real QR generation using qrcode.js
   - Camera via getUserMedia (HTTPS) + file upload fallback
   - jsQR for decoding uploaded QR images
   ═══════════════════════════════════════════════════════════ */

let scanStream = null;
let scanInterval = null;
let scanTab = 'scan';

function buildScan() {
  const pg = document.getElementById('page-scan');
  pg.innerHTML = `
    <div class="page-header">
      <button class="back-btn" onclick="stopScan(); navTo('home')">←</button>
      <h2 id="scan-page-title">Scan & Pay</h2>
    </div>
    <div class="scan-tabs">
      <button class="scan-tab active" id="tab-scan" onclick="switchScanTab('scan')">📷 Scan QR</button>
      <button class="scan-tab" id="tab-myqr" onclick="switchScanTab('myqr')">🪪 My QR Code</button>
    </div>

    <!-- SCAN TAB -->
    <div id="scan-tab-content" class="scan-body">
      <p class="scan-label">Scan any UPI QR code to pay</p>
      <div class="scan-frame" id="scan-frame">
        <div class="scan-corners"></div>
        <div class="scan-line" id="scan-line"></div>
        <video id="scan-video" autoplay playsinline muted
          style="width:100%;height:100%;object-fit:cover;border-radius:18px;display:none;position:absolute;inset:0"></video>
        <canvas id="scan-canvas" style="display:none"></canvas>
        <div id="scan-placeholder">
          <div style="font-size:3.5rem;opacity:.18;filter:drop-shadow(0 0 6px rgba(0,212,255,0.3))">⊞</div>
          <p style="font-size:.82rem;color:rgba(0,212,255,0.5);letter-spacing:1px;font-family:'Courier New',monospace">Tap Start to open camera</p>
        </div>
      </div>

      <!-- Camera + Upload buttons -->
      <div style="display:flex;gap:.7rem;margin-bottom:1rem">
        <button class="btn-primary" id="scan-start-btn" onclick="startCamera()" style="flex:1;font-size:.88rem">
          📷 Start Camera
        </button>
        <button class="btn-primary" id="scan-stop-btn" onclick="stopScan()"
          style="flex:1;font-size:.88rem;background:rgba(255,51,102,0.2);color:var(--high);border:1px solid rgba(255,51,102,0.4);display:none">
          ⏹ Stop
        </button>
        <label class="btn-primary" style="flex:1;font-size:.88rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:.3rem;background:rgba(0,212,255,0.1);color:var(--accent);border:1px solid rgba(0,212,255,0.3)">
          🖼 Upload QR
          <input type="file" accept="image/*" onchange="uploadQR(event)" style="display:none"/>
        </label>
      </div>

      <div id="scan-status" style="text-align:center;font-size:.8rem;color:var(--text3);margin-bottom:.8rem;min-height:1.2rem"></div>

      <!-- Demo QR codes -->
      <div class="scan-divider">DEMO QR CODES — TAP TO SCAN</div>
      <div class="demo-qr-grid" id="demo-qr-grid"></div>

      <div class="scan-divider">ENTER MANUALLY</div>
      <div class="scan-manual">
        <input type="text" id="scan-upi-input" placeholder="UPI ID (e.g. priya@trustpay)" style="margin-bottom:.7rem"/>
        <input type="number" id="scan-amount-input" placeholder="Amount ₹ (optional)" style="margin-bottom:.7rem" min="1"/>
        <button class="btn-primary" onclick="scanManualPay()">Proceed to Pay</button>
      </div>
    </div>

    <!-- MY QR TAB -->
    <div id="myqr-tab-content" class="scan-body" style="display:none">
      <p class="scan-label">Share to receive payments</p>
      <div class="my-qr-wrap">
        <div class="my-qr-card">
          <div class="my-qr-name" id="myqr-name">Loading...</div>
          <div class="my-qr-upi" id="myqr-upi">...</div>
          <div id="my-qr-container" style="margin:1rem auto;width:200px;height:200px;border-radius:12px;overflow:hidden;background:#fff;display:flex;align-items:center;justify-content:center"></div>
          <div class="my-qr-amount-wrap">
            <label style="font-size:.78rem;color:var(--text2);display:block;margin-bottom:.4rem">Set amount (optional)</label>
            <div style="display:flex;gap:.6rem">
              <input type="number" id="myqr-amount" placeholder="₹ Amount" min="1" style="flex:1" oninput="regenerateMyQR()"/>
              <button onclick="regenerateMyQR()" style="padding:.6rem 1rem;background:rgba(0,212,255,0.1);border:1px solid rgba(0,212,255,0.3);border-radius:10px;color:var(--accent);cursor:pointer;font-size:.85rem">↻</button>
            </div>
          </div>
        </div>
        <button class="btn-primary" style="margin-top:1rem;width:100%;max-width:300px" onclick="downloadMyQR()">⬇ Download QR</button>
        <p style="font-size:.72rem;color:var(--text3);margin-top:.6rem;text-align:center">This QR can be scanned by any UPI app</p>
      </div>
    </div>`;

  buildDemoQRs();
  generateMyQR();
}

/* ── Tab switching ─────────────────────────────────────────── */
function switchScanTab(tab) {
  scanTab = tab;
  document.getElementById('tab-scan').classList.toggle('active', tab === 'scan');
  document.getElementById('tab-myqr').classList.toggle('active', tab === 'myqr');
  document.getElementById('scan-tab-content').style.display  = tab === 'scan'  ? 'block' : 'none';
  document.getElementById('myqr-tab-content').style.display  = tab === 'myqr' ? 'block' : 'none';
  document.getElementById('scan-page-title').textContent = tab === 'scan' ? 'Scan & Pay' : 'My QR Code';
  if (tab !== 'scan') stopScan();
}

/* ── Demo QR codes ─────────────────────────────────────────── */
const DEMO_QRS = [
  { name:'Priya',       upi:'priya@trustpay',  amount:500,   note:'Dinner split',     safe:true  },
  { name:'Rahul',       upi:'rahul@trustpay',  amount:1200,  note:'Rent share',       safe:true  },
  { name:'Grocery',     upi:'grocery@paytm',   amount:350,   note:'Vegetables',       safe:true  },
  { name:'Unknown',     upi:'unknown@ybl',     amount:25000, note:'Urgent payment',   safe:false },
  { name:'Tax Refund',  upi:'taxrefund@upi',   amount:50000, note:'KYC verify urgent',safe:false },
];

function buildDemoQRs() {
  const grid = document.getElementById('demo-qr-grid');
  if (!grid) return;
  grid.innerHTML = DEMO_QRS.map((d, i) => `
    <div class="demo-qr-item ${d.safe ? '' : 'demo-qr-risky'}" onclick="simulateScan('${d.upi}',${d.amount},'${d.note}')">
      <div id="dqr-${i}" style="width:72px;height:72px;margin:0 auto;border-radius:6px;overflow:hidden;background:#fff"></div>
      <div class="demo-qr-label">${d.name}</div>
      <div class="demo-qr-amount">₹${d.amount.toLocaleString('en-IN')}</div>
      ${!d.safe ? '<div class="demo-qr-warn">⚠️ Risky</div>' : ''}
    </div>`).join('');

  // Generate real QR codes for each demo using qrcode.js
  loadQRLib(() => {
    DEMO_QRS.forEach((d, i) => {
      const el = document.getElementById('dqr-' + i);
      if (!el || !window.QRCode) return;
      el.innerHTML = '';
      new QRCode(el, {
        text: `upi://pay?pa=${d.upi}&pn=${encodeURIComponent(d.name)}&am=${d.amount}&tn=${encodeURIComponent(d.note)}&cu=INR`,
        width: 72, height: 72,
        colorDark: d.safe ? '#00d4ff' : '#ff3366',
        colorLight: '#0a1628',
        correctLevel: QRCode.CorrectLevel.M
      });
    });
  });
}

/* ── Load QR library ───────────────────────────────────────── */
function loadQRLib(cb) {
  if (window.QRCode) { cb(); return; }
  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js';
  s.onload = cb;
  s.onerror = () => console.warn('QR lib failed to load');
  document.head.appendChild(s);
}

function loadJsQR(cb) {
  if (window.jsQR) { cb(); return; }
  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
  s.onload = cb;
  document.head.appendChild(s);
}

/* ── Simulate scan (tap demo QR) ───────────────────────────── */
function simulateScan(upi, amount, note) {
  stopScan();
  showToast('✅ QR Scanned: ' + upi, 'success');
  navTo('send');
  setTimeout(() => {
    const upiEl  = document.getElementById('send-upi');
    const amtEl  = document.getElementById('send-amount');
    const noteEl = document.getElementById('send-note');
    if (upiEl)  upiEl.value  = upi;
    if (amtEl)  amtEl.value  = amount;
    if (noteEl) noteEl.value = note;
    lookupUPI(upi);
  }, 150);
}

/* ── Camera scanner ────────────────────────────────────────── */
async function startCamera() {
  const status = document.getElementById('scan-status');
  if (status) status.textContent = 'Requesting camera access...';

  // Check if HTTPS or localhost
  const isSecure = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';

  if (!isSecure) {
    if (status) status.innerHTML = '⚠️ Camera needs HTTPS. <strong>Use Upload QR</strong> or tap a demo QR below.';
    showToast('Camera needs HTTPS. Use Upload QR instead.', 'error');
    return;
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    if (status) status.textContent = '❌ Camera not supported on this browser.';
    showToast('Camera not supported. Use Upload QR.', 'error');
    return;
  }

  try {
    const video = document.getElementById('scan-video');
    const placeholder = document.getElementById('scan-placeholder');
    const startBtn = document.getElementById('scan-start-btn');
    const stopBtn  = document.getElementById('scan-stop-btn');

    scanStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 }, height: { ideal: 640 } }
    });

    video.srcObject = scanStream;
    video.style.display = 'block';
    if (placeholder) placeholder.style.display = 'none';
    if (startBtn) startBtn.style.display = 'none';
    if (stopBtn)  stopBtn.style.display  = 'block';
    if (status)   status.textContent = '🔍 Scanning for QR code...';

    loadJsQR(() => startQRDetection(video));
  } catch (err) {
    const msg = err.name === 'NotAllowedError'
      ? '❌ Camera permission denied. Allow camera in browser settings.'
      : '❌ Camera error: ' + err.message;
    if (status) status.textContent = msg;
    showToast('Camera error. Use Upload QR instead.', 'error');
  }
}

function startQRDetection(video) {
  const canvas = document.getElementById('scan-canvas');
  const ctx    = canvas.getContext('2d');
  const status = document.getElementById('scan-status');

  scanInterval = setInterval(() => {
    if (!video || video.readyState < video.HAVE_ENOUGH_DATA) return;
    canvas.width  = video.videoWidth  || 320;
    canvas.height = video.videoHeight || 320;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = window.jsQR && window.jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
    if (code && code.data) {
      stopScan();
      if (status) status.textContent = '✅ QR detected!';
      parseQRData(code.data);
    }
  }, 250);
}

function stopScan() {
  if (scanStream) { scanStream.getTracks().forEach(t => t.stop()); scanStream = null; }
  if (scanInterval) { clearInterval(scanInterval); scanInterval = null; }
  const video = document.getElementById('scan-video');
  const placeholder = document.getElementById('scan-placeholder');
  const startBtn = document.getElementById('scan-start-btn');
  const stopBtn  = document.getElementById('scan-stop-btn');
  if (video)       video.style.display = 'none';
  if (placeholder) placeholder.style.display = 'flex';
  if (startBtn)    startBtn.style.display = 'block';
  if (stopBtn)     stopBtn.style.display  = 'none';
}

/* ── Upload QR image ───────────────────────────────────────── */
function uploadQR(event) {
  const file = event.target.files[0];
  if (!file) return;
  const status = document.getElementById('scan-status');
  if (status) status.textContent = '🔍 Reading QR from image...';

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width  = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      loadJsQR(() => {
        const code = window.jsQR && window.jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' });
        if (code && code.data) {
          if (status) status.textContent = '✅ QR decoded!';
          parseQRData(code.data);
        } else {
          if (status) status.textContent = '❌ No QR code found in image.';
          showToast('No QR code found in image', 'error');
        }
      });
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}

/* ── Parse QR data ─────────────────────────────────────────── */
function parseQRData(data) {
  let upi = '', amount = '', note = '';
  if (data.startsWith('upi://')) {
    try {
      const url = new URL(data);
      upi    = url.searchParams.get('pa') || '';
      amount = url.searchParams.get('am') || '';
      note   = url.searchParams.get('tn') || '';
    } catch(e) { upi = data; }
  } else if (data.includes('@')) {
    upi = data.trim().split('?')[0];
  } else {
    showToast('Unknown QR format', 'error'); return;
  }
  if (!upi) { showToast('Invalid QR code', 'error'); return; }
  showToast('✅ QR Scanned: ' + upi, 'success');
  navTo('send');
  setTimeout(() => {
    const upiEl  = document.getElementById('send-upi');
    const amtEl  = document.getElementById('send-amount');
    const noteEl = document.getElementById('send-note');
    if (upiEl)  upiEl.value  = upi;
    if (amtEl && amount)  amtEl.value  = amount;
    if (noteEl && note)   noteEl.value = note;
    lookupUPI(upi);
  }, 150);
}

/* ── Manual pay ────────────────────────────────────────────── */
function scanManualPay() {
  const upi    = document.getElementById('scan-upi-input').value.trim();
  const amount = document.getElementById('scan-amount-input').value.trim();
  if (!upi) { showToast('Enter a UPI ID', 'error'); return; }
  simulateScan(upi, amount || 0, '');
}

/* ── My QR Code (real, scannable) ──────────────────────────── */
function generateMyQR() {
  if (!currentUser) return;
  const nameEl = document.getElementById('myqr-name');
  const upiEl  = document.getElementById('myqr-upi');
  if (nameEl) nameEl.textContent = currentUser.name;
  if (upiEl)  upiEl.textContent  = currentUser.upi_id;
  regenerateMyQR();
}

function regenerateMyQR() {
  if (!currentUser) return;
  const container = document.getElementById('my-qr-container');
  if (!container) return;
  const amtEl  = document.getElementById('myqr-amount');
  const amount = amtEl ? amtEl.value.trim() : '';

  let upiLink = `upi://pay?pa=${currentUser.upi_id}&pn=${encodeURIComponent(currentUser.name)}&cu=INR`;
  if (amount) upiLink += `&am=${amount}`;

  loadQRLib(() => {
    if (!window.QRCode) return;
    container.innerHTML = '';
    new QRCode(container, {
      text: upiLink,
      width: 200, height: 200,
      colorDark: '#000000',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.H
    });
  });
}

function downloadMyQR() {
  const container = document.getElementById('my-qr-container');
  if (!container) return;
  const img = container.querySelector('img') || container.querySelector('canvas');
  if (!img) { showToast('QR not ready yet', 'error'); return; }
  const link = document.createElement('a');
  link.download = 'trustpay-' + (currentUser ? currentUser.upi_id : 'qr') + '.png';
  if (img.tagName === 'CANVAS') {
    link.href = img.toDataURL('image/png');
  } else {
    link.href = img.src;
  }
  link.click();
  showToast('✅ QR downloaded!', 'success');
}
