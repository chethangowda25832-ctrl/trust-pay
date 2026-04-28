
/* ═══════════════════════════════════════════════════════════
   BEHAVIORAL ANALYTICS DASHBOARD (replaces old buildDashboard)
═══════════════════════════════════════════════════════════ */
async function buildDashboard() {
  const pg = document.getElementById('page-dashboard');
  pg.innerHTML = `
    <div class="page-header">
      <button class="back-btn" onclick="navTo('home')">←</button>
      <h2>🛡️ Behavioral Analytics</h2>
    </div>
    <div class="dashboard-body">

      <!-- Behavior Score Card -->
      <div id="behavior-score-card" style="background:linear-gradient(135deg,#1e1b4b,#312e81);border:1px solid rgba(139,92,246,.3);border-radius:20px;padding:1.5rem;margin-bottom:1.2rem;display:flex;align-items:center;gap:1.5rem">
        <div id="bscore-ring" style="width:80px;height:80px;flex-shrink:0;position:relative;display:flex;align-items:center;justify-content:center">
          <svg width="80" height="80" style="position:absolute;top:0;left:0;transform:rotate(-90deg)">
            <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="8"/>
            <circle id="bscore-arc" cx="40" cy="40" r="34" fill="none" stroke="#10b981" stroke-width="8"
              stroke-dasharray="213.6" stroke-dashoffset="213.6" stroke-linecap="round"
              style="transition:stroke-dashoffset 1s ease"/>
          </svg>
          <span id="bscore-val" style="font-size:1.3rem;font-weight:900;color:#fff;position:relative">—</span>
        </div>
        <div>
          <div style="font-size:.8rem;color:rgba(255,255,255,.6);margin-bottom:.3rem">Behavior Trust Score</div>
          <div id="bscore-label" style="font-size:1.1rem;font-weight:700;color:#fff">Loading...</div>
          <div id="bscore-sub" style="font-size:.75rem;color:rgba(255,255,255,.5);margin-top:.2rem"></div>
        </div>
      </div>

      <!-- Stat Cards -->
      <div class="stat-grid" id="dash-stats" style="grid-template-columns:repeat(3,1fr)">
        <div class="loader-spin" style="grid-column:1/-1">Loading…</div>
      </div>

      <!-- Fingerprint Card -->
      <div class="chart-card" id="fingerprint-card" style="margin-bottom:1rem">
        <h3>🧬 Behavioral Fingerprint</h3>
        <div id="fingerprint-body" style="color:var(--text3);font-size:.85rem">Loading...</div>
      </div>

      <!-- Charts row 1 -->
      <div class="chart-card" style="margin-bottom:1rem">
        <h3>📈 Amount vs Risk Trend</h3>
        <canvas id="amountRiskChart" height="120"></canvas>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem">
        <div class="chart-card">
          <h3>🎯 Risk Distribution</h3>
          <canvas id="riskDistChart"></canvas>
        </div>
        <div class="chart-card">
          <h3>💰 Amount Buckets</h3>
          <canvas id="amtBucketChart"></canvas>
        </div>
      </div>

      <div class="chart-card" style="margin-bottom:1rem">
        <h3>🕐 Hourly Activity Pattern</h3>
        <canvas id="hourlyChart" height="100"></canvas>
      </div>

      <div class="chart-card" style="margin-bottom:1rem">
        <h3>📅 Weekly Spend Trend</h3>
        <canvas id="weeklyChart" height="100"></canvas>
      </div>

      <div class="chart-card" style="margin-bottom:1rem">
        <h3>👥 Top Recipients</h3>
        <canvas id="topRecvChart" height="120"></canvas>
      </div>

      <!-- Anomaly Log -->
      <div class="chart-card">
        <h3>🚨 High-Risk Transaction Log</h3>
        <div id="anomaly-log">Loading...</div>
      </div>

    </div>`;

  try {
    const [analyticsRes, histRes] = await Promise.all([
      fetch(API + '/analytics?user_id=' + currentUser.id),
      fetch(API + '/history?user_id=' + currentUser.id)
    ]);
    const data = await analyticsRes.json();
    const hist = await histRes.json();

    renderBehaviorScore(data.stats);
    renderDashStats(data.stats);
    renderFingerprint(data.fingerprint);
    renderAmountRiskChart(data.amount_trend);
    renderRiskDistChart(data.risk_distribution);
    renderAmtBucketChart(data.fingerprint.amount_buckets);
    renderHourlyChart(data.hourly_activity);
    renderWeeklyChart(data.weekly_spend);
    renderTopRecvChart(data.top_receivers);
    renderAnomalyLog(hist.history || []);
  } catch(e) {
    document.getElementById('dash-stats').innerHTML =
      '<div style="color:var(--text3);padding:1rem;grid-column:1/-1">Could not load analytics. Is Flask running?</div>';
  }
}

function renderBehaviorScore(stats) {
  const score = stats.behavior_score || 0;
  document.getElementById('bscore-val').textContent = score;
  const arc = document.getElementById('bscore-arc');
  const circumference = 213.6;
  const offset = circumference - (score / 100) * circumference;
  setTimeout(() => { arc.style.strokeDashoffset = offset; }, 100);
  arc.style.stroke = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';
  document.getElementById('bscore-label').textContent =
    score >= 70 ? 'Trustworthy Behavior' : score >= 40 ? 'Some Anomalies Detected' : 'High Risk Profile';
  document.getElementById('bscore-sub').textContent =
    `Based on ${stats.total_txns} transactions`;
}

function renderDashStats(s) {
  document.getElementById('dash-stats').innerHTML = `
    <div class="stat-card"><div class="stat-icon">📋</div><div class="stat-val">${s.total_txns}</div><div class="stat-label">Total Txns</div></div>
    <div class="stat-card safe"><div class="stat-icon">✅</div><div class="stat-val">${s.total_txns - s.high_risk_count - (s.cancelled_count||0)}</div><div class="stat-label">Safe</div></div>
    <div class="stat-card high"><div class="stat-icon">🚨</div><div class="stat-val">${s.high_risk_count}</div><div class="stat-label">High Risk</div></div>
    <div class="stat-card medium"><div class="stat-icon">❌</div><div class="stat-val">${s.cancelled_count}</div><div class="stat-label">Cancelled</div></div>
    <div class="stat-card" style="grid-column:span 2"><div class="stat-icon">💸</div><div class="stat-val" style="font-size:1.3rem">₹${Number(s.total_spent||0).toLocaleString('en-IN')}</div><div class="stat-label">Total Spent</div></div>`;
}

function renderFingerprint(fp) {
  if(!fp) return;
  document.getElementById('fingerprint-body').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:.8rem">
      <div style="background:var(--bg3);border-radius:12px;padding:.8rem">
        <div style="font-size:.7rem;color:var(--text3);margin-bottom:.3rem">AVG TRANSACTION</div>
        <div style="font-size:1.2rem;font-weight:700;color:var(--accent2)">₹${fp.avg_amount}</div>
      </div>
      <div style="background:var(--bg3);border-radius:12px;padding:.8rem">
        <div style="font-size:.7rem;color:var(--text3);margin-bottom:.3rem">MEDIAN AMOUNT</div>
        <div style="font-size:1.2rem;font-weight:700;color:var(--blue)">₹${fp.median_amount}</div>
      </div>
      <div style="background:var(--bg3);border-radius:12px;padding:.8rem">
        <div style="font-size:.7rem;color:var(--text3);margin-bottom:.3rem">STD DEVIATION</div>
        <div style="font-size:1.2rem;font-weight:700;color:var(--orange)">₹${fp.std_amount}</div>
      </div>
      <div style="background:var(--bg3);border-radius:12px;padding:.8rem">
        <div style="font-size:.7rem;color:var(--text3);margin-bottom:.3rem">KNOWN RECEIVERS</div>
        <div style="font-size:1.2rem;font-weight:700;color:var(--safe)">${fp.known_receivers_count || 0}</div>
      </div>
    </div>
    <div style="margin-top:.8rem;padding:.8rem;background:var(--bg3);border-radius:12px;font-size:.8rem;color:var(--text2)">
      ${fp.is_new_user ? '⚠️ New user — limited behavioral history. Fraud detection will improve with more transactions.' : '✅ Sufficient behavioral history for accurate anomaly detection.'}
    </div>`;
}

let chartInstances = {};
function destroyChart(id) { if(chartInstances[id]) { chartInstances[id].destroy(); delete chartInstances[id]; } }

const TC = '#9ca3af', GC = 'rgba(255,255,255,.06)';

function renderAmountRiskChart(trend) {
  destroyChart('amountRiskChart');
  if(!trend || !trend.length) return;
  const labels  = trend.map(t => t.label);
  const amounts = trend.map(t => t.amount);
  const risks   = trend.map(t => t.risk);
  chartInstances['amountRiskChart'] = new Chart(document.getElementById('amountRiskChart'), {
    type: 'line',
    data: { labels,
      datasets: [
        { label: 'Amount (₹)', data: amounts, borderColor: '#8b5cf6', backgroundColor: 'rgba(139,92,246,.1)',
          fill: true, tension: .4, yAxisID: 'y', pointRadius: 4,
          pointBackgroundColor: risks.map(r => r>=70?'#ef4444':r>=40?'#f59e0b':'#10b981') },
        { label: 'Risk Score', data: risks, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,.05)',
          fill: false, tension: .4, yAxisID: 'y1', borderDash: [4,4], pointRadius: 3 }
      ]},
    options: { responsive: true,
      plugins: { legend: { labels: { color: TC } } },
      scales: {
        x:  { ticks: { color: TC }, grid: { color: GC } },
        y:  { ticks: { color: TC }, grid: { color: GC }, position: 'left' },
        y1: { ticks: { color: '#ef4444' }, grid: { display: false }, position: 'right', min: 0, max: 100 }
      }}
  });
}

function renderRiskDistChart(dist) {
  destroyChart('riskDistChart');
  if(!dist) return;
  chartInstances['riskDistChart'] = new Chart(document.getElementById('riskDistChart'), {
    type: 'doughnut',
    data: { labels: ['Safe','Medium','High'],
      datasets: [{ data: [dist.SAFE, dist.MEDIUM, dist.HIGH],
        backgroundColor: ['rgba(16,185,129,.8)','rgba(245,158,11,.8)','rgba(239,68,68,.8)'],
        borderColor: ['#10b981','#f59e0b','#ef4444'], borderWidth: 2 }]},
    options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { color: TC, font: { size: 11 } } } } }
  });
}

function renderAmtBucketChart(buckets) {
  destroyChart('amtBucketChart');
  if(!buckets) return;
  chartInstances['amtBucketChart'] = new Chart(document.getElementById('amtBucketChart'), {
    type: 'bar',
    data: { labels: Object.keys(buckets),
      datasets: [{ label: 'Transactions', data: Object.values(buckets),
        backgroundColor: ['rgba(16,185,129,.7)','rgba(59,130,246,.7)','rgba(245,158,11,.7)','rgba(239,68,68,.7)'],
        borderRadius: 6 }]},
    options: { responsive: true,
      plugins: { legend: { display: false } },
      scales: { x: { ticks: { color: TC }, grid: { color: GC } }, y: { ticks: { color: TC }, grid: { color: GC } } } }
  });
}

function renderHourlyChart(hourly) {
  destroyChart('hourlyChart');
  if(!hourly) return;
  chartInstances['hourlyChart'] = new Chart(document.getElementById('hourlyChart'), {
    type: 'bar',
    data: { labels: hourly.map(h => h.hour + ':00'),
      datasets: [{ label: 'Transactions', data: hourly.map(h => h.count),
        backgroundColor: hourly.map(h =>
          (h.hour < 6 || h.hour >= 23) ? 'rgba(239,68,68,.7)' : 'rgba(139,92,246,.6)'),
        borderRadius: 4 }]},
    options: { responsive: true,
      plugins: { legend: { display: false },
        tooltip: { callbacks: { label: ctx => {
          const h = ctx.dataIndex;
          const risk = (h < 6 || h >= 23) ? ' ⚠️ High-risk hour' : '';
          return ctx.parsed.y + ' txns' + risk;
        }}}},
      scales: { x: { ticks: { color: TC, maxRotation: 45 }, grid: { color: GC } },
                y: { ticks: { color: TC }, grid: { color: GC } } } }
  });
}

function renderWeeklyChart(weekly) {
  destroyChart('weeklyChart');
  if(!weekly || !weekly.length) return;
  chartInstances['weeklyChart'] = new Chart(document.getElementById('weeklyChart'), {
    type: 'line',
    data: { labels: weekly.map(w => w.week),
      datasets: [{ label: 'Weekly Spend (₹)', data: weekly.map(w => w.amount),
        borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,.15)',
        fill: true, tension: .4, pointRadius: 5, pointBackgroundColor: '#3b82f6' }]},
    options: { responsive: true,
      plugins: { legend: { labels: { color: TC } } },
      scales: { x: { ticks: { color: TC }, grid: { color: GC } },
                y: { ticks: { color: TC }, grid: { color: GC } } } }
  });
}

function renderTopRecvChart(receivers) {
  destroyChart('topRecvChart');
  if(!receivers || !receivers.length) return;
  chartInstances['topRecvChart'] = new Chart(document.getElementById('topRecvChart'), {
    type: 'bar',
    data: { labels: receivers.map(r => r.name.split(' ')[0]),
      datasets: [{ label: 'Total Sent (₹)', data: receivers.map(r => r.amount),
        backgroundColor: ['#7c3aed','#2563eb','#059669','#d97706','#dc2626','#0891b2'].map(c => c + 'cc'),
        borderRadius: 8 }]},
    options: { indexAxis: 'y', responsive: true,
      plugins: { legend: { display: false } },
      scales: { x: { ticks: { color: TC }, grid: { color: GC } },
                y: { ticks: { color: TC }, grid: { color: GC } } } }
  });
}

function renderAnomalyLog(history) {
  const el = document.getElementById('anomaly-log');
  if(!el) return;
  const highRisk = history.filter(t => t.risk_score >= 70).slice(0, 8);
  if(!highRisk.length) {
    el.innerHTML = '<div style="color:var(--safe);font-size:.85rem;padding:.5rem">✅ No high-risk transactions found</div>';
    return;
  }
  el.innerHTML = highRisk.map(t => {
    const col = avatarColor(t.receiver_name || t.receiver_upi);
    const time = new Date(t.timestamp).toLocaleString('en-IN', {dateStyle:'medium', timeStyle:'short'});
    return `<div style="display:flex;align-items:center;gap:.8rem;padding:.8rem 0;border-bottom:1px solid var(--border)">
      <div style="width:40px;height:40px;border-radius:50%;background:${col};display:flex;align-items:center;justify-content:center;font-size:.9rem;font-weight:700;color:#fff;flex-shrink:0">${initials(t.receiver_name||t.receiver_upi)}</div>
      <div style="flex:1">
        <div style="font-size:.88rem;font-weight:600">${t.receiver_name||t.receiver_upi}</div>
        <div style="font-size:.72rem;color:var(--text3)">${time}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:.9rem;font-weight:700;color:var(--high)">₹${Number(t.amount).toLocaleString('en-IN')}</div>
        <div style="font-size:.7rem;background:rgba(239,68,68,.15);color:var(--high);padding:.1rem .4rem;border-radius:99px;margin-top:.2rem">${Math.round(t.risk_score)}% risk</div>
      </div>
    </div>`;
  }).join('');
}
