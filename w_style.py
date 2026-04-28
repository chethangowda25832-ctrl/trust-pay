css = """
/* ═══════════════════════════════════════════════════════════════
   TrustPay UPI — Black & White Glassmorphism Theme
   ═══════════════════════════════════════════════════════════════ */

*, *::before, *::after {
  box-sizing: border-box; margin: 0; padding: 0;
  -webkit-tap-highlight-color: transparent;
}

:root {
  --bg:      #000000;
  --bg2:     #0d0d0d;
  --bg3:     #1a1a1a;
  --bg4:     #2a2a2a;
  --border:  rgba(255,255,255,0.08);
  --border2: rgba(255,255,255,0.12);
  --text:    #ffffff;
  --text2:   #aaaaaa;
  --text3:   #555555;
  --accent:  #ffffff;
  --accent2: #dddddd;
  --accent3: #bbbbbb;
  --safe:    #cccccc;
  --medium:  #888888;
  --high:    #ffffff;
  --glass-bg:     rgba(255,255,255,0.06);
  --glass-border: rgba(255,255,255,0.12);
  --glass-blur:   blur(20px);
  --glass-shadow: 0 8px 32px rgba(0,0,0,0.6);
  --radius:    20px;
  --radius-sm: 12px;
  --nav-h:     65px;
  --ease-spring: cubic-bezier(0.34,1.56,0.64,1);
  --ease-smooth: cubic-bezier(0.4,0,0.2,1);
}

html { height: 100%; height: -webkit-fill-available; }
body {
  font-family: Inter, -apple-system, sans-serif;
  background: var(--bg);
  color: var(--text);
  height: 100%; height: -webkit-fill-available;
  overflow: hidden;
  -webkit-font-smoothing: antialiased;
}
.hidden { display: none !important; }

/* ── Background ─────────────────────────────────────────────── */
body {
  background-image:
    radial-gradient(ellipse at 20% 20%, rgba(255,255,255,0.03) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 80%, rgba(255,255,255,0.02) 0%, transparent 50%);
}

/* ── Login / Register ────────────────────────────────────────── */
.screen {
  display: none; width: 100%; height: 100%;
  min-height: 100vh; min-height: -webkit-fill-available;
  overflow-y: auto; -webkit-overflow-scrolling: touch;
  background: var(--bg);
}
.screen.active { display: flex; flex-direction: column; justify-content: center; align-items: center; }

.login-wrap { width: 100%; max-width: 420px; padding: 2rem 1.5rem; margin: auto; }

.login-logo { text-align: center; margin-bottom: 2rem; }
.logo-icon { width: 80px; height: 80px; margin: 0 auto 1rem; display: flex; align-items: center; justify-content: center; }
.logo-icon img { width: 80px; height: 80px; border-radius: 22px; display: block; box-shadow: 0 10px 40px rgba(255,255,255,0.1); }
.login-logo h1 {
  font-size: 2rem; font-weight: 900; color: #fff;
  letter-spacing: 2px; margin-bottom: .3rem;
}
.login-logo p { font-size: .88rem; color: var(--text2); letter-spacing: 1px; }

/* Glass login card */
.login-card {
  background: rgba(255,255,255,0.05);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: var(--radius);
  padding: 1.8rem;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08);
  position: relative; overflow: hidden;
}
.login-card::before {
  content: '';
  position: absolute; top: 0; left: 0; right: 0; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
}
.login-card::after {
  content: '';
  position: absolute; bottom: 0; right: 0;
  width: 60px; height: 60px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  border-right: 1px solid rgba(255,255,255,0.1);
  border-radius: 0 0 var(--radius) 0;
  pointer-events: none;
}
.login-card h2 { font-size: 1.4rem; font-weight: 700; text-align: center; margin-bottom: 1.5rem; color: #fff; }

.form-group { margin-bottom: 1.1rem; }
.form-group label { display: block; font-size: .82rem; font-weight: 600; color: var(--text2); margin-bottom: .45rem; }

.input-row {
  display: flex; align-items: center;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: var(--radius-sm); overflow: hidden;
  transition: border-color .2s, box-shadow .2s;
}
.input-row:focus-within {
  border-color: rgba(255,255,255,0.4);
  box-shadow: 0 0 0 3px rgba(255,255,255,0.06);
}
.prefix {
  padding: 0 .9rem; font-size: .9rem; color: var(--text2);
  border-right: 1px solid rgba(255,255,255,0.08);
  height: 50px; display: flex; align-items: center; flex-shrink: 0;
}

input[type="text"], input[type="tel"],
input[type="password"], input[type="number"] {
  width: 100%; padding: .85rem 1rem;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: var(--radius-sm);
  color: #fff; font-size: 1rem; font-family: inherit;
  transition: border-color .2s, box-shadow .2s;
  -webkit-appearance: none; caret-color: #fff;
}
.input-row input { border: none; background: transparent; height: 50px; }
input:focus { outline: none; border-color: rgba(255,255,255,0.4); box-shadow: 0 0 0 3px rgba(255,255,255,0.06); }
input::placeholder { color: var(--text3); }

.btn-primary {
  width: 100%; padding: 1rem;
  background: #fff; color: #000;
  border: none; border-radius: var(--radius-sm);
  font-size: 1rem; font-weight: 700; cursor: pointer;
  transition: opacity .2s, transform .2s var(--ease-spring);
  margin-top: .5rem; min-height: 52px;
  box-shadow: 0 4px 20px rgba(255,255,255,0.15);
  position: relative; overflow: hidden;
}
.btn-primary::after {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.15), transparent);
  pointer-events: none;
}
.btn-primary:active { opacity: .85; transform: scale(0.98); }

.switch-link { text-align: center; margin-top: 1.2rem; font-size: .85rem; color: var(--text2); }
.switch-link a { color: #fff; cursor: pointer; font-weight: 600; }
.demo-hint {
  text-align: center; margin-top: 1rem;
  font-size: .75rem; color: var(--text3);
  padding: .5rem;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 8px;
}

/* ── App Shell ───────────────────────────────────────────────── */
#app-shell {
  width: 100%; height: 100%; height: -webkit-fill-available;
  background: var(--bg);
  display: flex; flex-direction: column;
  position: fixed; inset: 0; overflow: hidden;
}

.status-bar {
  height: 44px; padding: 0 1.2rem;
  display: flex; align-items: center; justify-content: space-between;
  background: rgba(0,0,0,0.8);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255,255,255,0.06);
  font-size: .75rem; color: var(--text2); flex-shrink: 0;
  padding-top: env(safe-area-inset-top);
}
.status-icons { display: flex; gap: .8rem; }

.app-page {
  display: none; flex: 1;
  overflow-y: auto; overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  padding-bottom: calc(var(--nav-h) + env(safe-area-inset-bottom) + 8px);
  scrollbar-width: none;
}
.app-page::-webkit-scrollbar { display: none; }
.app-page.active { display: block; animation: pageFadeIn .2s var(--ease-smooth); }
@keyframes pageFadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Bottom Nav ──────────────────────────────────────────────── */
.bottom-nav {
  position: fixed; bottom: 0; left: 0; right: 0;
  height: calc(var(--nav-h) + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  background: rgba(0,0,0,0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid rgba(255,255,255,0.08);
  box-shadow: 0 -4px 30px rgba(0,0,0,0.4);
  display: flex; align-items: center; justify-content: space-around;
  z-index: 100; flex-shrink: 0;
}
.bnav-btn {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: .25rem; padding: .4rem .2rem;
  background: transparent; border: none;
  color: var(--text3); cursor: pointer;
  font-size: .65rem; font-weight: 500;
  transition: color .2s; min-height: 44px; user-select: none;
}
.bnav-btn.active { color: #fff; }
.bnav-btn.active .bnav-icon { filter: drop-shadow(0 0 4px rgba(255,255,255,0.5)); }
.bnav-icon { font-size: 1.25rem; line-height: 1; }
.bnav-scan { position: relative; top: -8px; }
.bnav-scan .scan-icon {
  width: 52px; height: 52px; border-radius: 50%;
  background: #fff; color: #000;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.6rem;
  box-shadow: 0 0 20px rgba(255,255,255,0.25), 0 0 0 0 rgba(255,255,255,0.15);
  animation: scanBtnPulse 3s ease-in-out infinite;
}
@keyframes scanBtnPulse {
  0%,100% { box-shadow: 0 0 20px rgba(255,255,255,0.25), 0 0 0 0 rgba(255,255,255,0.15); }
  50%      { box-shadow: 0 0 30px rgba(255,255,255,0.35), 0 0 0 8px rgba(255,255,255,0); }
}

/* ── Modals (bottom sheet) ───────────────────────────────────── */
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.85);
  display: flex; align-items: flex-end;
  z-index: 999; animation: fadeIn .2s;
}
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.modal-card {
  background: rgba(15,15,15,0.95);
  backdrop-filter: blur(28px);
  -webkit-backdrop-filter: blur(28px);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 24px 24px 0 0;
  padding: 1.5rem 1.5rem calc(1.5rem + env(safe-area-inset-bottom));
  width: 100%; max-height: 92vh;
  overflow-y: auto; -webkit-overflow-scrolling: touch;
  box-shadow: 0 -4px 60px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.08);
  animation: sheetUp .32s var(--ease-spring);
}
@keyframes sheetUp {
  from { transform: translateY(100%); opacity: 0.5; }
  to   { transform: translateY(0); opacity: 1; }
}
.modal-card::before {
  content: ''; display: block;
  width: 40px; height: 4px;
  background: rgba(255,255,255,0.2);
  border-radius: 99px; margin: 0 auto 1.2rem;
}

.modal-header { text-align: center; padding: 1.2rem; border-radius: var(--radius-sm); margin-bottom: 1.2rem; }
.modal-header.high   { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); }
.modal-header.medium { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); }
.modal-header.safe   { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); }
.modal-emoji  { font-size: 2.5rem; margin-bottom: .4rem; }
.modal-title  { font-size: 1.2rem; font-weight: 700; color: #fff; margin-bottom: .3rem; }
.modal-sub    { font-size: .82rem; color: var(--text2); }

.risk-bar-wrap { margin-bottom: 1.2rem; }
.risk-bar-top  { display: flex; justify-content: space-between; font-size: .85rem; margin-bottom: .4rem; }
.risk-val      { font-weight: 700; font-size: 1rem; color: #fff; }
.risk-bar-bg   { height: 12px; background: rgba(255,255,255,0.08); border-radius: 99px; overflow: hidden; }
.risk-bar-fill { height: 100%; border-radius: 99px; background: linear-gradient(90deg, #555, #aaa, #fff); transition: width .8s var(--ease-smooth); width: 0; box-shadow: 0 0 8px rgba(255,255,255,0.3); }
.risk-bar-labels { display: flex; justify-content: space-between; font-size: .68rem; color: var(--text3); margin-top: .3rem; }

.modal-reasons { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: var(--radius-sm); padding: .9rem; margin-bottom: .9rem; font-size: .83rem; color: var(--text2); line-height: 1.6; }
.scam-alert { display: flex; align-items: flex-start; gap: .7rem; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); border-radius: var(--radius-sm); padding: .9rem; margin-bottom: .9rem; animation: alertPulse 2s infinite; }
@keyframes alertPulse { 0%,100%{box-shadow:0 0 0 0 rgba(255,255,255,0.1);}50%{box-shadow:0 0 0 6px rgba(255,255,255,0);} }
.scam-alert span:first-child { font-size: 1.4rem; }
.scam-alert strong { display: block; margin-bottom: .2rem; font-size: .88rem; color: #fff; }
.scam-alert p { font-size: .78rem; color: var(--text2); }

.smart-q { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: var(--radius-sm); padding: .9rem; margin-bottom: .9rem; }
.smart-q p { font-size: .88rem; font-weight: 600; margin-bottom: .7rem; color: #fff; }
.sq-row { display: flex; gap: .5rem; }
.sq-yes, .sq-no { flex: 1; padding: .6rem .4rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15); font-size: .78rem; cursor: pointer; font-family: inherit; transition: all .2s; }
.sq-yes { background: rgba(255,255,255,0.08); color: #fff; }
.sq-no  { background: rgba(255,255,255,0.04); color: var(--text2); }
.sq-yes:active { background: rgba(255,255,255,0.15); }

.modal-actions, .modal-safe-actions { display: flex; gap: .7rem; margin-bottom: .7rem; }
.btn-cancel-txn, .btn-proceed-txn, .btn-confirm-txn {
  flex: 1; padding: .85rem; border-radius: var(--radius-sm);
  border: 1px solid rgba(255,255,255,0.15);
  font-size: .9rem; font-weight: 600; cursor: pointer;
  font-family: inherit; transition: all .2s; min-height: 50px;
}
.btn-cancel-txn  { background: rgba(255,255,255,0.06); color: #fff; }
.btn-proceed-txn { background: rgba(255,255,255,0.03); color: var(--text2); }
.btn-confirm-txn { background: #fff; color: #000; border-color: #fff; }
.btn-cancel-txn:active  { background: rgba(255,255,255,0.12); }
.btn-confirm-txn:active { opacity: .85; }

/* ── PIN Modal ───────────────────────────────────────────────── */
.pin-card { max-width: 100%; }
.pin-header { text-align: center; margin-bottom: 1.5rem; }
.pin-to { font-size: .85rem; color: var(--text2); margin-bottom: .3rem; }
.pin-amount-display { font-size: 2.2rem; font-weight: 800; color: #fff; }
.pin-label { text-align: center; font-size: .85rem; color: var(--text2); margin-bottom: .8rem; }
.pin-dots { display: flex; justify-content: center; gap: 1rem; margin-bottom: 1.5rem; }
.pin-dots span { width: 16px; height: 16px; border-radius: 50%; background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.2); transition: all .2s; }
.pin-dots span.filled { background: #fff; border-color: #fff; transform: scale(1.1); box-shadow: 0 0 8px rgba(255,255,255,0.4); }
.pin-pad { display: grid; grid-template-columns: repeat(3,1fr); gap: .7rem; margin-bottom: .8rem; }
.pin-pad button {
  aspect-ratio: 1;
  background: rgba(255,255,255,0.06);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: var(--radius-sm);
  color: #fff; font-size: 1.4rem; font-weight: 600;
  cursor: pointer; transition: all .15s; min-height: 60px;
}
.pin-pad button:active { background: rgba(255,255,255,0.15); transform: scale(0.92); box-shadow: 0 0 12px rgba(255,255,255,0.15); }
.pin-cancel-btn { width: 100%; padding: .85rem; background: transparent; border: 1px solid rgba(255,255,255,0.1); border-radius: var(--radius-sm); color: var(--text2); font-size: .9rem; cursor: pointer; transition: all .2s; }
.pin-cancel-btn:active { background: rgba(255,255,255,0.05); }

/* ── Toast ───────────────────────────────────────────────────── */
.toast {
  position: fixed;
  bottom: calc(var(--nav-h) + env(safe-area-inset-bottom) + 1rem);
  left: 50%; transform: translateX(-50%);
  background: rgba(15,15,15,0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: var(--radius-sm);
  padding: .85rem 1.4rem;
  font-size: .88rem; font-weight: 500; color: #fff;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  z-index: 1000; animation: toastIn .3s;
  max-width: calc(100% - 2rem); text-align: center;
}
@keyframes toastIn {
  from { opacity: 0; transform: translateX(-50%) translateY(10px); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0); }
}

/* ── Install Banner ──────────────────────────────────────────── */
.install-banner {
  position: fixed;
  bottom: calc(var(--nav-h) + env(safe-area-inset-bottom) + .8rem);
  left: 50%; transform: translateX(-50%);
  width: calc(100% - 2rem); max-width: 460px;
  background: rgba(15,15,15,0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 16px; padding: 1rem;
  display: flex; align-items: center; justify-content: space-between; gap: 1rem;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5); z-index: 500;
  animation: slideUpBanner .4s var(--ease-spring);
}
@keyframes slideUpBanner {
  from { opacity: 0; transform: translateX(-50%) translateY(20px); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0); }
}
.install-banner-left  { display: flex; align-items: center; gap: .8rem; flex: 1; }
.install-banner-right { display: flex; align-items: center; gap: .5rem; flex-shrink: 0; }
.install-btn { background: #fff; color: #000; border: none; border-radius: 8px; padding: .5rem 1rem; font-size: .85rem; font-weight: 700; cursor: pointer; }
.install-dismiss { background: transparent; border: none; color: var(--text3); font-size: 1rem; cursor: pointer; padding: .3rem; }

/* ── Utility ─────────────────────────────────────────────────── */
* { -webkit-tap-highlight-color: transparent; }
.app-page { -webkit-overflow-scrolling: touch; }
.bnav-btn, .btn-primary, .pin-pad button { user-select: none; }

/* ── Canvas z-index ──────────────────────────────────────────── */
.screen, #app-shell, .modal-overlay, .toast, .install-banner { position: relative; z-index: 1; }
#hex-canvas { z-index: 0 !important; }

/* ── Safe area ───────────────────────────────────────────────── */
@media (display-mode: standalone) {
  .status-bar { padding-top: env(safe-area-inset-top); height: calc(44px + env(safe-area-inset-top)); }
}
@media (max-width: 374px) {
  .login-wrap { padding: 1.5rem 1rem; }
  .login-card { padding: 1.4rem; }
  .pin-pad button { font-size: 1.2rem; min-height: 52px; }
}
@media (max-height: 500px) and (orientation: landscape) {
  .login-logo { margin-bottom: .8rem; }
  .logo-icon { display: none; }
  .login-card { padding: 1rem; }
  .form-group { margin-bottom: .7rem; }
}
"""
with open("frontend/css/style.css", "w", encoding="utf-8") as f:
    f.write(css)
print("style.css OK")
