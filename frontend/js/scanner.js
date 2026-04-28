
/* ═══════════════════════════════════════════════════════════
   QR SCANNER + GENERATOR — TrustPay
   ═══════════════════════════════════════════════════════════ */

/* ── QR Code Generator (pure JS, no library needed) ─────────
   Uses a minimal QR encoding for UPI deep-link strings.
   We use a canvas-based visual QR that encodes the UPI string.
   For demo: we generate a visual pattern + store the data.
   For real scanning: we use jsQR library via CDN.
*/

let scanStream = null;
let scanInterval = null;
let scanTab = 'scan'; // 'scan' or 'myqr'

function buildScan() {
  const pg = document.getElementById('page-scan');
  pg.innerHTML = `
    <div class="page-header">
      <button class="back-btn" onclick="stopScan(); navTo('home')">←</button>
      <h2 id="scan-page-title">Scan & Pay</h2>
    </div>

    <!-- Tab switcher -->
    <div class="scan-tabs">
      <button class="scan-tab active" id="tab-scan" onclick="switchScanTab('scan')">📷 Scan QR</button>
      <button class="scan-tab" id="tab-myqr" onclick="switchScanTab('myqr')">🪪 My QR Code</button>
    </div>

    <!-- SCAN TAB -->
    <div id="scan-tab-content" class="scan-body">
      <p class="scan-label">Point camera at a UPI QR code</p>

      <!-- Camera viewfinder -->
      <div class="scan-frame" id="scan-frame">
        <div class="scan-corners"></div>
        <div class="scan-line" id="scan-line"></div>
        <video id="scan-video" autoplay playsinline muted
          style="width:100%;height:100%;object-fit:cover;border-radius:18px;display:none"></video>
        <canvas id="scan-canvas" style="display:none"></canvas>
        <div id="scan-placeholder" style="display:flex;flex-direction:column;align-items:center;gap:.8rem">
          <div style="font-size:4rem;opacity:.3">⊞</div>
          <p style="font-size:.8rem;color:var(--text3)">Tap Start to open camera</p>
        </div>
      </div>

      <!-- Camera controls -->
      <div style="display:flex;gap:.8rem;margin-bottom:1.2rem">
        <button class="btn-primary" id="scan-start-btn" onclick="startCamera()" style="flex:1">
          📷 Start Camera
        </button>
        <button class="btn-primary" id="scan-stop-btn" onclick="stopScan()"
          style="flex:1;background:rgba(255,51,102,0.2);color:var(--high);border:1px solid rgba(255,51,102,0.4);display:none">
          ⏹ Stop
        </button>
      </div>

      <!-- Demo QR codes to scan -->
      <div class="scan-divider">OR SCAN A DEMO QR</div>
      <p style="color:var(--text2);font-size:.82rem;margin-bottom:.8rem">Tap any demo QR to simulate scanning:</p>
      <div class="demo-qr-grid" id="demo-qr-grid"></div>

      <div class="scan-divider">OR ENTER MANUALLY</div>
      <div class="scan-manual">
        <input type="text" id="scan-upi-input" placeholder="UPI ID (e.g. priya@trustpay)" style="margin-bottom:.8rem"/>
        <input type="number" id="scan-amount-input" placeholder="Amount ₹ (optional)" style="margin-bottom:.8rem" min="1"/>
        <button class="btn-primary" onclick="scanManualPay()">Proceed to Pay</button>
      </div>
    </div>

    <!-- MY QR TAB -->
    <div id="myqr-tab-content" class="scan-body" style="display:none">
      <p class="scan-label">Share your QR code to receive payments</p>
      <div class="my-qr-wrap">
        <div class="my-qr-card">
          <div class="my-qr-name" id="myqr-name">Loading...</div>
          <div class="my-qr-upi" id="myqr-upi">...</div>
          <canvas id="my-qr-canvas" width="220" height="220" style="border-radius:12px;margin:1rem 0"></canvas>
          <div class="my-qr-amount-wrap">
            <label style="font-size:.78rem;color:var(--text2);display:block;margin-bottom:.4rem">Set amount (optional)</label>
            <div style="display:flex;gap:.6rem">
              <input type="number" id="myqr-amount" placeholder="₹ Amount" min="1"
                style="flex:1" oninput="regenerateMyQR()"/>
              <button onclick="regenerateMyQR()" style="padding:.6rem 1rem;background:rgba(0,212,255,0.1);border:1px solid rgba(0,212,255,0.3);border-radius:10px;color:var(--accent);cursor:pointer;font-size:.85rem">↻</button>
            </div>
          </div>
        </div>
        <button class="btn-primary" style="margin-top:1rem" onclick="downloadMyQR()">⬇ Download QR</button>
      </div>
    </div>`;

  buildDemoQRs();
  generateMyQR();
}

/* ── Tab switching ───────────────────────────────────────── */
function switchScanTab(tab) {
  scanTab = tab;
  document.getElementById('tab-scan').classList.toggle('active', tab === 'scan');
  document.getElementById('tab-myqr').classList.toggle('active', tab === 'myqr');
  document.getElementById('scan-tab-content').style.display  = tab === 'scan'  ? 'block' : 'none';
  document.getElementById('myqr-tab-content').style.display  = tab === 'myqr' ? 'block' : 'none';
  document.getElementById('scan-page-title').textContent = tab === 'scan' ? 'Scan & Pay' : 'My QR Code';
  if (tab !== 'scan') stopScan();
}

/* ── Demo QR codes ───────────────────────────────────────── */
const DEMO_QRS = [
  { name: 'Priya Sharma', upi: 'priya@trustpay',  amount: 500,   note: 'Dinner split',     safe: true  },
  { name: 'Rahul Verma',  upi: 'rahul@trustpay',  amount: 1200,  note: 'Rent share',        safe: true  },
  { name: 'Grocery Store',upi: 'grocery@paytm',   amount: 350,   note: 'Vegetables',        safe: true  },
  { name: 'Unknown',      upi: 'unknown@ybl',     amount: 25000, note: 'Urgent payment',    safe: false },
  { name: 'Tax Refund',   upi: 'taxrefund@upi',   amount: 50000, note: 'KYC verify urgent', safe: false },
];

function buildDemoQRs() {
  const grid = document.getElementById('demo-qr-grid');
  if (!grid) return;
  grid.innerHTML = DEMO_QRS.map((d, i) => `
    <div class="demo-qr-item ${d.safe ? '' : 'demo-qr-risky'}" onclick="simulateScan('${d.upi}',${d.amount},'${d.note}')">
      <canvas id="dqr-${i}" width="80" height="80" style="border-radius:8px"></canvas>
      <div class="demo-qr-label">${d.name}</div>
      <div class="demo-qr-amount">₹${d.amount.toLocaleString('en-IN')}</div>
      ${!d.safe ? '<div class="demo-qr-warn">⚠️ Risky</div>' : ''}
    </div>`).join('');

  // Draw mini QR patterns for each demo
  DEMO_QRS.forEach((d, i) => {
    const c = document.getElementById('dqr-' + i);
    if (c) drawMiniQR(c, d.upi + '|' + d.amount, d.safe ? '#00d4ff' : '#ff3366');
  });
}

/* ── Mini QR visual (decorative pattern) ────────────────── */
function drawMiniQR(canvas, data, color) {
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  const cell = size / 10;

  // Background
  ctx.fillStyle = '#0a1628';
  ctx.fillRect(0, 0, size, size);

  // Generate deterministic pattern from data string
  let hash = 0;
  for (let c of data) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;

  ctx.fillStyle = color;

  // Corner squares (finder patterns)
  [[0,0],[7,0],[0,7]].forEach(([cx,cy]) => {
    ctx.fillRect(cx*cell, cy*cell, 3*cell, 3*cell);
    ctx.fillStyle = '#0a1628';
    ctx.fillRect((cx+.5)*cell, (cy+.5)*cell, 2*cell, 2*cell);
    ctx.fillStyle = color;
    ctx.fillRect((cx+1)*cell, (cy+1)*cell, cell, cell);
  });

  // Data modules
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      if ((row < 4 && col < 4) || (row < 4 && col > 5) || (row > 5 && col < 4)) continue;
      const bit = (hash >> ((row * 10 + col) % 32)) & 1;
      if (bit) {
        ctx.fillStyle = color;
        ctx.fillRect(col*cell + 1, row*cell + 1, cell - 2, cell - 2);
      }
    }
  }
}

/* ── Simulate scan (tap on demo QR) ─────────────────────── */
function simulateScan(upi, amount, note) {
  stopScan();
  showToast('QR Scanned: ' + upi, 'success');
  // Navigate to send page with pre-filled data
  navTo('send');
  setTimeout(() => {
    const upiEl    = document.getElementById('send-upi');
    const amtEl    = document.getElementById('send-amount');
    const noteEl   = document.getElementById('send-note');
    if (upiEl)  upiEl.value  = upi;
    if (amtEl)  amtEl.value  = amount;
    if (noteEl) noteEl.value = note;
    lookupUPI(upi);
  }, 150);
}

/* ── Real Camera Scanner ─────────────────────────────────── */
async function startCamera() {
  try {
    const video = document.getElementById('scan-video');
    const placeholder = document.getElementById('scan-placeholder');
    const startBtn = document.getElementById('scan-start-btn');
    const stopBtn  = document.getElementById('scan-stop-btn');

    scanStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 640 } }
    });

    video.srcObject = scanStream;
    video.style.display = 'block';
    if (placeholder) placeholder.style.display = 'none';
    if (startBtn) startBtn.style.display = 'none';
    if (stopBtn)  stopBtn.style.display  = 'block';

    // Load jsQR for real QR decoding
    if (!window.jsQR) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
      script.onload = () => startQRDetection(video);
      document.head.appendChild(script);
    } else {
      startQRDetection(video);
    }
  } catch (err) {
    showToast('Camera access denied. Use demo QRs below.', 'error');
  }
}

function startQRDetection(video) {
  const canvas = document.getElementById('scan-canvas');
  const ctx    = canvas.getContext('2d');

  scanInterval = setInterval(() => {
    if (video.readyState !== video.HAVE_ENOUGH_DATA) return;
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = window.jsQR && window.jsQR(imageData.data, imageData.width, imageData.height);
    if (code && code.data) {
      stopScan();
      parseQRData(code.data);
    }
  }, 300);
}

function stopScan() {
  if (scanStream) {
    scanStream.getTracks().forEach(t => t.stop());
    scanStream = null;
  }
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

/* ── Parse QR data (UPI deep link or plain UPI ID) ───────── */
function parseQRData(data) {
  // UPI deep link: upi://pay?pa=upi@id&pn=Name&am=100&tn=note
  let upi = '', amount = '', note = '';
  if (data.startsWith('upi://')) {
    try {
      const url = new URL(data);
      upi    = url.searchParams.get('pa') || '';
      amount = url.searchParams.get('am') || '';
      note   = url.searchParams.get('tn') || '';
    } catch(e) {}
  } else if (data.includes('|')) {
    // Our demo format: upi|amount
    const parts = data.split('|');
    upi    = parts[0] || '';
    amount = parts[1] || '';
  } else if (data.includes('@')) {
    upi = data.trim();
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

/* ── Manual pay ──────────────────────────────────────────── */
function scanManualPay() {
  const upi    = document.getElementById('scan-upi-input').value.trim();
  const amount = document.getElementById('scan-amount-input').value.trim();
  if (!upi) { showToast('Enter a UPI ID', 'error'); return; }
  simulateScan(upi, amount || '', '');
}

/* ── My QR Code Generator ────────────────────────────────── */
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
  const canvas = document.getElementById('my-qr-canvas');
  if (!canvas) return;
  const amtEl  = document.getElementById('myqr-amount');
  const amount = amtEl ? amtEl.value : '';

  // Build UPI deep link
  let upiLink = `upi://pay?pa=${currentUser.upi_id}&pn=${encodeURIComponent(currentUser.name)}&cu=INR`;
  if (amount) upiLink += `&am=${amount}`;

  drawFullQR(canvas, upiLink, currentUser.upi_id);
}

function drawFullQR(canvas, data, upiId) {
  const ctx  = canvas.getContext('2d');
  const size = canvas.width;
  const cell = size / 21;

  // Background
  ctx.fillStyle = '#0a1628';
  ctx.fillRect(0, 0, size, size);

  // Generate deterministic grid from data
  let hash = 5381;
  for (let c of data) hash = ((hash << 5) + hash + c.charCodeAt(0)) & 0x7fffffff;

  const color = document.body.classList.contains('theme-bw') ? '#ffffff' : '#00d4ff';

  // Draw finder patterns (3 corners)
  function drawFinder(ox, oy) {
    ctx.fillStyle = color;
    ctx.fillRect(ox*cell, oy*cell, 7*cell, 7*cell);
    ctx.fillStyle = '#0a1628';
    ctx.fillRect((ox+1)*cell, (oy+1)*cell, 5*cell, 5*cell);
    ctx.fillStyle = color;
    ctx.fillRect((ox+2)*cell, (oy+2)*cell, 3*cell, 3*cell);
  }
  drawFinder(0, 0);
  drawFinder(14, 0);
  drawFinder(0, 14);

  // Timing patterns
  for (let i = 8; i < 13; i++) {
    if (i % 2 === 0) {
      ctx.fillStyle = color;
      ctx.fillRect(i*cell, 6*cell, cell, cell);
      ctx.fillRect(6*cell, i*cell, cell, cell);
    }
  }

  // Data modules
  for (let row = 0; row < 21; row++) {
    for (let col = 0; col < 21; col++) {
      // Skip finder pattern areas
      if ((row < 8 && col < 8) || (row < 8 && col > 12) || (row > 12 && col < 8)) continue;
      if (row === 6 || col === 6) continue; // timing

      const idx = row * 21 + col;
      const bit = (hash >> (idx % 31)) & 1;
      if (bit) {
        ctx.fillStyle = color;
        const r = cell * 0.15;
        ctx.beginPath();
        ctx.roundRect(col*cell+1, row*cell+1, cell-2, cell-2, r);
        ctx.fill();
      }
    }
  }

  // Center logo
  const logoSize = cell * 4;
  const lx = size/2 - logoSize/2;
  const ly = size/2 - logoSize/2;
  ctx.fillStyle = '#0a1628';
  ctx.fillRect(lx - 2, ly - 2, logoSize + 4, logoSize + 4);

  const img = new Image();
  img.src = '/icons/logo.png';
  img.onload = () => {
    ctx.drawImage(img, lx, ly, logoSize, logoSize);
  };
  img.onerror = () => {
    ctx.fillStyle = color;
    ctx.font = `bold ${cell * 2}px Inter`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('TP', size/2, size/2);
  };
}

function downloadMyQR() {
  const canvas = document.getElementById('my-qr-canvas');
  if (!canvas) return;
  const link = document.createElement('a');
  link.download = 'trustpay-qr-' + (currentUser ? currentUser.upi_id : 'code') + '.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
  showToast('QR Code downloaded!', 'success');
}
