
"""
TrustGuard Behavioral Analytics Engine v2
==========================================
Objectives:
  1. Model normal user transaction behavior (behavioral fingerprint)
  2. Detect unusual transaction patterns (anomaly detection)
  3. Identify high-risk transactions in real-time (fraud probability score)
  4. Provide contextual warnings with reasoning (explainable AI)
  5. Reduce social engineering risks (keyword + pattern detection)
"""

import sqlite3, os, math
from datetime import datetime, timedelta
from collections import Counter

DB_PATH = os.path.join(os.path.dirname(__file__), "trustguard.db")

# ── Social engineering patterns ───────────────────────────────────────────────
URGENCY_KEYWORDS = [
    "urgent","emergency","immediately","asap","right now","hurry",
    "police","arrest","court","case filed","legal action",
    "bank block","account block","kyc","otp","verify","verification",
    "prize","lottery","won","winner","reward","gift","lucky",
    "refund","cashback","tax refund","income tax","it department",
    "last chance","deadline","expire","suspended","deactivate",
    "emi","loan","insurance","investment","double money","scheme"
]

SCAM_PATTERNS = [
    ("impersonation", ["bank","rbi","police","cbi","income tax","government","official"]),
    ("lottery",       ["prize","lottery","won","winner","lucky draw","reward"]),
    ("urgency",       ["urgent","immediately","asap","right now","hurry","deadline"]),
    ("threat",        ["arrest","court","case","legal","block","suspend","deactivate"]),
    ("investment",    ["double","triple","profit","scheme","invest","return","guaranteed"]),
]

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# ═══════════════════════════════════════════════════════════════════════════════
#  BEHAVIORAL FINGERPRINT — builds a statistical model of the user's normal behavior
# ═══════════════════════════════════════════════════════════════════════════════
def build_behavioral_fingerprint(user_id):
    """
    Returns a dict describing the user's normal transaction behavior:
    - avg/std of amounts
    - typical hours of activity
    - known receivers
    - typical transaction frequency
    - preferred amount ranges
    """
    db = get_db()
    rows = db.execute(
        """SELECT amount, receiver_upi, timestamp, type
           FROM transactions
           WHERE user_id=? AND action='confirm' AND type IN ('debit','recharge')
           ORDER BY timestamp DESC LIMIT 200""",
        (user_id,)
    ).fetchall()
    db.close()

    if not rows:
        return {
            "avg_amount": 500.0, "std_amount": 300.0,
            "median_amount": 400.0, "max_amount": 2000.0,
            "known_receivers": set(), "receiver_freq": {},
            "active_hours": list(range(8, 22)),
            "avg_daily_txns": 1.0, "total_txns": 0,
            "amount_buckets": {}, "is_new_user": True
        }

    amounts   = [r["amount"] for r in rows]
    receivers = [r["receiver_upi"] for r in rows]
    hours     = [datetime.fromisoformat(r["timestamp"]).hour for r in rows]

    # Statistical measures
    avg = sum(amounts) / len(amounts)
    variance = sum((x - avg)**2 for x in amounts) / len(amounts)
    std = math.sqrt(variance) if variance > 0 else avg * 0.5
    sorted_a = sorted(amounts)
    median = sorted_a[len(sorted_a)//2]

    # Receiver frequency map
    recv_freq = Counter(receivers)

    # Active hours (hours with at least 1 transaction)
    hour_freq = Counter(hours)
    active_hours = [h for h, c in hour_freq.items() if c >= 1]

    # Daily transaction frequency
    if len(rows) > 1:
        first = datetime.fromisoformat(rows[-1]["timestamp"])
        last  = datetime.fromisoformat(rows[0]["timestamp"])
        days  = max((last - first).days, 1)
        avg_daily = len(rows) / days
    else:
        avg_daily = 1.0

    # Amount buckets (distribution)
    buckets = {"0-500": 0, "500-2000": 0, "2000-10000": 0, "10000+": 0}
    for a in amounts:
        if a <= 500:       buckets["0-500"] += 1
        elif a <= 2000:    buckets["500-2000"] += 1
        elif a <= 10000:   buckets["2000-10000"] += 1
        else:              buckets["10000+"] += 1

    return {
        "avg_amount":     round(avg, 2),
        "std_amount":     round(std, 2),
        "median_amount":  round(median, 2),
        "max_amount":     round(max(amounts), 2),
        "known_receivers": list(set(receivers)),
        "receiver_freq":  dict(recv_freq),
        "active_hours":   active_hours,
        "hour_freq":      dict(hour_freq),
        "avg_daily_txns": round(avg_daily, 2),
        "total_txns":     len(rows),
        "amount_buckets": buckets,
        "is_new_user":    len(rows) < 5
    }

# ═══════════════════════════════════════════════════════════════════════════════
#  ANOMALY DETECTION — compares current transaction against behavioral fingerprint
# ═══════════════════════════════════════════════════════════════════════════════
def detect_anomalies(fp, upi_id, amount, note, hour, recent_count):
    """
    Returns list of anomaly dicts: {factor, severity, score, description, evidence}
    severity: LOW / MEDIUM / HIGH / CRITICAL
    """
    anomalies = []
    note_lower = note.lower()

    # ── A1: New receiver ──────────────────────────────────────────────────────
    is_new = upi_id not in set(fp["known_receivers"])
    if is_new:
        freq = fp["receiver_freq"].get(upi_id, 0)
        anomalies.append({
            "factor": "new_receiver",
            "severity": "HIGH",
            "score": 25,
            "description": "Sending to an unknown receiver",
            "evidence": f"You have never sent money to {upi_id} before"
        })

    # ── A2: Amount deviation (Z-score based) ──────────────────────────────────
    avg = fp["avg_amount"]
    std = fp["std_amount"] if fp["std_amount"] > 0 else avg * 0.5
    z_score = (amount - avg) / std if std > 0 else 0
    amount_ratio = amount / avg if avg > 0 else 1

    if z_score > 4 or amount_ratio >= 10:
        anomalies.append({
            "factor": "extreme_amount",
            "severity": "CRITICAL",
            "score": 35,
            "description": f"Amount is {amount_ratio:.1f}x your average",
            "evidence": f"Your avg: ₹{avg:.0f} | This: ₹{amount:.0f} | Z-score: {z_score:.1f}"
        })
    elif z_score > 2.5 or amount_ratio >= 5:
        anomalies.append({
            "factor": "high_amount",
            "severity": "HIGH",
            "score": 22,
            "description": f"Amount is {amount_ratio:.1f}x your average",
            "evidence": f"Your avg: ₹{avg:.0f} | This: ₹{amount:.0f}"
        })
    elif z_score > 1.5 or amount_ratio >= 2:
        anomalies.append({
            "factor": "elevated_amount",
            "severity": "MEDIUM",
            "score": 10,
            "description": f"Amount is {amount_ratio:.1f}x your average",
            "evidence": f"Your avg: ₹{avg:.0f} | This: ₹{amount:.0f}"
        })

    # ── A3: Time anomaly ──────────────────────────────────────────────────────
    is_odd_hour = hour < 6 or hour >= 23
    is_unusual_hour = hour not in fp["active_hours"] and len(fp["active_hours"]) >= 5
    if is_odd_hour:
        anomalies.append({
            "factor": "odd_hour",
            "severity": "HIGH",
            "score": 20,
            "description": f"Transaction at unusual time ({hour:02d}:00)",
            "evidence": "Most scams happen late night / early morning"
        })
    elif is_unusual_hour:
        anomalies.append({
            "factor": "unusual_hour",
            "severity": "MEDIUM",
            "score": 10,
            "description": f"You rarely transact at {hour:02d}:00",
            "evidence": f"Your usual active hours: {sorted(fp['active_hours'])[:5]}"
        })

    # ── A4: Rapid successive transactions ─────────────────────────────────────
    if recent_count >= 5:
        anomalies.append({
            "factor": "rapid_transactions",
            "severity": "CRITICAL",
            "score": 20,
            "description": f"{recent_count} transactions in last 10 minutes",
            "evidence": "Rapid transactions are a strong fraud indicator"
        })
    elif recent_count >= 3:
        anomalies.append({
            "factor": "frequent_transactions",
            "severity": "MEDIUM",
            "score": 12,
            "description": f"{recent_count} transactions in last 10 minutes",
            "evidence": f"Your avg daily: {fp['avg_daily_txns']:.1f} transactions"
        })

    # ── A5: Social engineering detection ─────────────────────────────────────
    matched_kw = [kw for kw in URGENCY_KEYWORDS if kw in note_lower]
    if matched_kw:
        anomalies.append({
            "factor": "social_engineering",
            "severity": "CRITICAL",
            "score": 28,
            "description": "Social engineering keywords detected in note",
            "evidence": f"Matched: {', '.join(matched_kw[:4])}"
        })

    # ── A6: Scam pattern matching ─────────────────────────────────────────────
    matched_patterns = []
    for pattern_name, keywords in SCAM_PATTERNS:
        if any(kw in note_lower for kw in keywords):
            matched_patterns.append(pattern_name)
    if matched_patterns:
        anomalies.append({
            "factor": "scam_pattern",
            "severity": "HIGH",
            "score": 18,
            "description": f"Matches known scam pattern: {', '.join(matched_patterns)}",
            "evidence": "This transaction matches patterns used in reported UPI scams"
        })

    # ── A7: Large round number ────────────────────────────────────────────────
    if amount >= 10000 and amount % 1000 == 0:
        anomalies.append({
            "factor": "round_number",
            "severity": "LOW",
            "score": 5,
            "description": "Large round-number amount",
            "evidence": "Scammers often request exact round amounts"
        })

    # ── A8: New user high amount ──────────────────────────────────────────────
    if fp["is_new_user"] and amount > 2000:
        anomalies.append({
            "factor": "new_user_high_amount",
            "severity": "HIGH",
            "score": 15,
            "description": "High amount from a new account with little history",
            "evidence": f"Only {fp['total_txns']} transactions on record"
        })

    return anomalies

# ═══════════════════════════════════════════════════════════════════════════════
#  FRAUD PROBABILITY SCORE — weighted combination of anomaly scores
# ═══════════════════════════════════════════════════════════════════════════════
def compute_fraud_probability(anomalies):
    """
    Combines anomaly scores using a weighted model.
    Returns fraud_probability (0-100) and confidence.
    """
    if not anomalies:
        return 0.0, "HIGH"

    severity_weights = {"LOW": 0.6, "MEDIUM": 0.8, "HIGH": 1.0, "CRITICAL": 1.3}
    raw_score = sum(a["score"] * severity_weights.get(a["severity"], 1.0) for a in anomalies)

    # Sigmoid-like normalization to 0-100
    # More anomalies = higher confidence in fraud
    prob = min(100, raw_score)

    # Confidence based on number of independent signals
    n = len(anomalies)
    if n >= 4:   confidence = "VERY HIGH"
    elif n >= 3: confidence = "HIGH"
    elif n >= 2: confidence = "MEDIUM"
    else:        confidence = "LOW"

    return round(prob, 1), confidence

# ═══════════════════════════════════════════════════════════════════════════════
#  CONTEXTUAL ALERT GENERATION
# ═══════════════════════════════════════════════════════════════════════════════
def generate_alert(anomalies, fraud_prob, fp, upi_id, amount):
    """
    Generates a human-readable alert with:
    - Primary warning message
    - Detailed reasoning list
    - Smart protective question
    - Recommended action
    """
    has_social_eng = any(a["factor"] in ("social_engineering","scam_pattern") for a in anomalies)
    has_new_recv   = any(a["factor"] == "new_receiver" for a in anomalies)
    has_high_amt   = any(a["factor"] in ("extreme_amount","high_amount") for a in anomalies)

    # Primary message
    if fraud_prob >= 70:
        primary = "High probability of fraud detected. We strongly recommend cancelling this transaction."
    elif fraud_prob >= 40:
        primary = "This transaction shows unusual patterns. Please verify before proceeding."
    else:
        primary = "Transaction looks normal based on your behavior history."

    # Smart protective question
    smart_question = None
    if has_social_eng:
        smart_question = "Did someone call/message you asking to make this payment urgently?"
    elif has_new_recv and has_high_amt:
        smart_question = "Do you personally know this recipient? Have you verified their identity?"
    elif fraud_prob >= 40:
        smart_question = "Are you making this payment of your own free will, without any pressure?"

    # Recommended action
    if fraud_prob >= 70:
        recommendation = "CANCEL — Do not proceed. Contact your bank if you feel pressured."
    elif fraud_prob >= 40:
        recommendation = "VERIFY — Call the recipient directly before sending."
    else:
        recommendation = "SAFE — You may proceed with this transaction."

    return {
        "primary_message": primary,
        "smart_question":  smart_question,
        "recommendation":  recommendation,
        "has_social_engineering": has_social_eng
    }

# ═══════════════════════════════════════════════════════════════════════════════
#  MAIN ANALYSIS FUNCTION
# ═══════════════════════════════════════════════════════════════════════════════
def analyze_transaction(user_id, upi_id, amount, note):
    now          = datetime.now()
    hour         = now.hour
    recent_count = get_recent_count(user_id)

    # 1. Build behavioral fingerprint
    fp = build_behavioral_fingerprint(user_id)

    # 2. Detect anomalies
    anomalies = detect_anomalies(fp, upi_id, amount, note, hour, recent_count)

    # 3. Compute fraud probability
    fraud_prob, confidence = compute_fraud_probability(anomalies)

    # 4. Generate contextual alert
    alert = generate_alert(anomalies, fraud_prob, fp, upi_id, amount)

    # 5. Risk level
    if fraud_prob >= 70:
        risk_level, color, emoji = "HIGH",   "#ef4444", "🚨"
    elif fraud_prob >= 40:
        risk_level, color, emoji = "MEDIUM", "#f59e0b", "⚠️"
    else:
        risk_level, color, emoji = "SAFE",   "#10b981", "✅"

    # 6. Reasons list (for UI display)
    reasons = [a["description"] for a in anomalies]

    return {
        # Core result
        "risk_score":        fraud_prob,
        "risk_level":        risk_level,
        "fraud_probability": fraud_prob,
        "confidence":        confidence,
        "color":             color,
        "emoji":             emoji,

        # Explainability
        "reasons":           reasons,
        "anomalies":         anomalies,
        "alert":             alert,

        # Behavioral context
        "behavioral_fingerprint": {
            "avg_amount":    fp["avg_amount"],
            "median_amount": fp["median_amount"],
            "std_amount":    fp["std_amount"],
            "total_txns":    fp["total_txns"],
            "known_receivers_count": len(fp["known_receivers"]),            "amount_buckets": fp["amount_buckets"],
            "is_new_user":   fp["is_new_user"]
        },

        # Social engineering
        "social_engineering": alert["has_social_engineering"],
        "smart_question":     alert["smart_question"],

        # Transaction info
        "upi_id":    upi_id,
        "amount":    amount,
        "timestamp": now.isoformat()
    }

# ═══════════════════════════════════════════════════════════════════════════════
#  HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════
def get_recent_count(user_id, minutes=10):
    db = get_db()
    row = db.execute(
        """SELECT COUNT(*) as cnt FROM transactions
           WHERE user_id=? AND timestamp >= datetime('now', ?)""",
        (user_id, f"-{minutes} minutes")
    ).fetchone()
    db.close()
    return row["cnt"] if row else 0

def get_user_history(user_id):
    db = get_db()
    rows = db.execute(
        "SELECT * FROM transactions WHERE user_id=? ORDER BY timestamp DESC LIMIT 100",
        (user_id,)
    ).fetchall()
    db.close()
    return [dict(r) for r in rows]

# ═══════════════════════════════════════════════════════════════════════════════
#  ANALYTICS — for the behavior visualization dashboard
# ═══════════════════════════════════════════════════════════════════════════════
def get_behavior_analytics(user_id):
    """
    Returns rich analytics data for the behavior visualization dashboard.
    """
    db = get_db()
    rows = db.execute(
        """SELECT * FROM transactions WHERE user_id=?
           ORDER BY timestamp DESC LIMIT 200""",
        (user_id,)
    ).fetchall()
    db.close()
    txns = [dict(r) for r in rows]

    if not txns:
        return {}

    fp = build_behavioral_fingerprint(user_id)

    # ── Amount over time (last 20 transactions) ───────────────────────────────
    recent = txns[:20][::-1]
    amount_trend = [{"label": f"T{i+1}", "amount": t["amount"],
                     "risk": t["risk_score"], "type": t["type"]} for i, t in enumerate(recent)]

    # ── Hourly activity heatmap ───────────────────────────────────────────────
    hour_counts = [0] * 24
    for t in txns:
        try:
            h = datetime.fromisoformat(t["timestamp"]).hour
            hour_counts[h] += 1
        except: pass
    hourly_activity = [{"hour": h, "count": hour_counts[h]} for h in range(24)]

    # ── Risk distribution ─────────────────────────────────────────────────────
    risk_dist = {"SAFE": 0, "MEDIUM": 0, "HIGH": 0}
    for t in txns:
        s = t["risk_score"]
        if s >= 70:   risk_dist["HIGH"] += 1
        elif s >= 40: risk_dist["MEDIUM"] += 1
        else:         risk_dist["SAFE"] += 1

    # ── Weekly spend trend ────────────────────────────────────────────────────
    weekly = {}
    for t in txns:
        if t["type"] not in ("debit","recharge"): continue
        try:
            d = datetime.fromisoformat(t["timestamp"])
            week = d.strftime("%Y-W%W")
            weekly[week] = weekly.get(week, 0) + t["amount"]
        except: pass
    weekly_spend = [{"week": k, "amount": round(v, 2)} for k, v in sorted(weekly.items())[-8:]]

    # ── Top receivers ─────────────────────────────────────────────────────────
    recv_totals = {}
    for t in txns:
        if t["type"] == "debit":
            name = t["receiver_name"] or t["receiver_upi"]
            recv_totals[name] = recv_totals.get(name, 0) + t["amount"]
    top_receivers = sorted(recv_totals.items(), key=lambda x: x[1], reverse=True)[:6]

    # ── Anomaly frequency ─────────────────────────────────────────────────────
    high_risk_txns = [t for t in txns if t["risk_score"] >= 70]
    cancelled_txns = [t for t in txns if t["action"] == "cancel"]

    # ── Behavior score (0-100, higher = more predictable/safe) ───────────────
    behavior_score = 100
    if len(high_risk_txns) > 0:
        behavior_score -= min(40, len(high_risk_txns) * 10)
    if fp["is_new_user"]:
        behavior_score -= 20
    behavior_score = max(0, behavior_score)

    return {
        "fingerprint":      fp,
        "amount_trend":     amount_trend,
        "hourly_activity":  hourly_activity,
        "risk_distribution": risk_dist,
        "weekly_spend":     weekly_spend,
        "top_receivers":    [{"name": k, "amount": round(v,2)} for k,v in top_receivers],
        "stats": {
            "total_txns":      len(txns),
            "high_risk_count": len(high_risk_txns),
            "cancelled_count": len(cancelled_txns),
            "behavior_score":  behavior_score,
            "avg_amount":      fp["avg_amount"],
            "total_spent":     round(sum(t["amount"] for t in txns if t["type"]=="debit"), 2)
        }
    }
