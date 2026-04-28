
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import sqlite3, os
from datetime import datetime, timedelta
from risk_engine import analyze_transaction, get_user_history, get_behavior_analytics

app = Flask(__name__, static_folder='../frontend', static_url_path='')
CORS(app)
DB_PATH = os.path.join(os.path.dirname(__file__), 'trustguard.db')

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/')
def index():
    return send_from_directory('../frontend', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('../frontend', path)

# ── Auth ──────────────────────────────────────────────────────────────────────
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    phone, pin = data.get('phone','').strip(), data.get('pin','').strip()
    db = get_db()
    user = db.execute('SELECT * FROM users WHERE phone=?', (phone,)).fetchone()
    if not user:
        db.close()
        return jsonify({'status':'error','message':'User not found'}), 401
    # PIN lockout check
    if user['pin_locked_until']:
        locked_until = datetime.fromisoformat(user['pin_locked_until'])
        if datetime.now() < locked_until:
            secs = int((locked_until - datetime.now()).total_seconds())
            db.close()
            return jsonify({'status':'error','message':f'PIN locked. Try after {secs}s'}), 403
    if user['pin'] != pin:
        attempts = user['pin_attempts'] + 1
        lock_until = None
        if attempts >= 5:
            lock_until = (datetime.now() + timedelta(minutes=5)).isoformat()
            attempts = 0
        db.execute('UPDATE users SET pin_attempts=?, pin_locked_until=? WHERE id=?',
                   (attempts, lock_until, user['id']))
        db.commit()
        db.close()
        return jsonify({'status':'error','message':f'Wrong PIN. {5-attempts} attempts left'}), 401
    db.execute('UPDATE users SET pin_attempts=0, pin_locked_until=NULL WHERE id=?', (user['id'],))
    db.commit()
    db.close()
    return jsonify({'status':'ok','user':dict(user)})

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    name  = data.get('name','').strip()
    phone = data.get('phone','').strip()
    upi   = data.get('upi_id', phone+'@trustpay').strip()
    pin   = data.get('pin','').strip()
    db = get_db()
    try:
        db.execute('INSERT INTO users (name,phone,upi_id,pin,balance) VALUES (?,?,?,?,?)',
                   (name, phone, upi, pin, 10000.0))
        db.commit()
        user = db.execute('SELECT * FROM users WHERE phone=?', (phone,)).fetchone()
        db.close()
        return jsonify({'status':'ok','user':dict(user)})
    except sqlite3.IntegrityError:
        db.close()
        return jsonify({'status':'error','message':'Phone already registered'}), 409

# ── User ──────────────────────────────────────────────────────────────────────
@app.route('/api/user/<user_id>', methods=['GET'])
def get_user(user_id):
    db = get_db()
    user = db.execute('SELECT * FROM users WHERE id=?', (user_id,)).fetchone()
    db.close()
    return jsonify(dict(user)) if user else (jsonify({'error':'Not found'}), 404)

# ── Contacts ──────────────────────────────────────────────────────────────────
@app.route('/api/contacts/<user_id>', methods=['GET'])
def get_contacts(user_id):
    db = get_db()
    rows = db.execute('SELECT * FROM contacts WHERE user_id=? ORDER BY trusted DESC, name', (user_id,)).fetchall()
    db.close()
    return jsonify([dict(r) for r in rows])

@app.route('/api/contacts/trust', methods=['POST'])
def toggle_trust():
    data = request.get_json()
    db = get_db()
    db.execute('UPDATE contacts SET trusted=? WHERE id=? AND user_id=?',
               (1 if data.get('trusted') else 0, data.get('contact_id'), data.get('user_id')))
    db.commit()
    db.close()
    return jsonify({'status':'ok'})

# ── Lookup ────────────────────────────────────────────────────────────────────
@app.route('/api/lookup', methods=['GET'])
def lookup():
    upi = request.args.get('upi','').strip()
    db  = get_db()
    user = db.execute('SELECT id,name,upi_id,phone FROM users WHERE upi_id=?', (upi,)).fetchone()
    rep  = db.execute('SELECT * FROM receiver_reputation WHERE upi_id=?', (upi,)).fetchone()
    db.close()
    reputation = None
    if rep:
        total = rep['total_received'] + rep['total_cancelled']
        cancel_rate = round(rep['total_cancelled']/total*100, 1) if total > 0 else 0
        reputation = {'total_received': rep['total_received'],
                      'cancel_rate': cancel_rate,
                      'flagged_count': rep['flagged_count'],
                      'is_suspicious': rep['flagged_count'] >= 3 or cancel_rate >= 40}
    if user:
        return jsonify({'found':True,'user':dict(user),'reputation':reputation})
    return jsonify({'found':False,'reputation':reputation})

# ── Analyze ───────────────────────────────────────────────────────────────────
@app.route('/api/analyze', methods=['POST'])
def analyze():
    data = request.get_json()
    user_id = data.get('user_id','1')
    upi_id  = data.get('upi_id','')
    amount  = float(data.get('amount',0))
    note    = data.get('note','')
    # Check trusted contact — skip fraud check
    db = get_db()
    trusted = db.execute('SELECT trusted FROM contacts WHERE user_id=? AND upi_id=? AND trusted=1',
                         (user_id, upi_id)).fetchone()
    db.close()
    if trusted:
        return jsonify({'risk_score':0,'risk_level':'SAFE','fraud_probability':0,
                        'confidence':'HIGH','color':'#10b981','emoji':'✅',
                        'reasons':[],'anomalies':[],'social_engineering':False,
                        'smart_question':None,'trusted_contact':True,
                        'alert':{'primary_message':'Trusted contact — transaction is safe.',
                                 'recommendation':'SAFE','smart_question':None,
                                 'has_social_engineering':False},
                        'upi_id':upi_id,'amount':amount,'timestamp':datetime.now().isoformat()})
    result = analyze_transaction(user_id, upi_id, amount, note)
    return jsonify(result)

# ── Send Money ────────────────────────────────────────────────────────────────
@app.route('/api/send', methods=['POST'])
def send_money():
    data      = request.get_json()
    sender_id = int(data.get('sender_id'))
    upi_id    = data.get('upi_id','').strip()
    amount    = float(data.get('amount',0))
    note      = data.get('note', '')
    risk      = float(data.get('risk_score',0))
    db = get_db()
    sender   = db.execute('SELECT * FROM users WHERE id=?', (sender_id,)).fetchone()
    receiver = db.execute('SELECT * FROM users WHERE upi_id=?', (upi_id,)).fetchone()
    if not sender:
        db.close(); return jsonify({'status':'error','message':'Sender not found'}), 404
    if sender['balance'] < amount:
        db.close(); return jsonify({'status':'error','message':'Insufficient balance'}), 400
    # Daily limit check
    today_start = datetime.now().replace(hour=0,minute=0,second=0).isoformat()
    today_spent = db.execute(
        'SELECT COALESCE(SUM(amount),0) as s FROM transactions WHERE user_id=? AND type="debit" AND action="confirm" AND timestamp>=?',
        (sender_id, today_start)).fetchone()['s']
    limit_row = db.execute('SELECT limit_amt FROM spending_limits WHERE user_id=? AND period="daily"', (sender_id,)).fetchone()
    if limit_row and (today_spent + amount) > limit_row['limit_amt']:
        db.close()
        return jsonify({'status':'error','message':f'Daily limit of Rs.{limit_row["limit_amt"]:.0f} exceeded'}), 400
    ts     = datetime.now().isoformat()
    txn_id = f'TG{int(datetime.now().timestamp())}'
    db.execute('UPDATE users SET balance=balance-? WHERE id=?', (amount, sender_id))
    if receiver:
        db.execute('UPDATE users SET balance=balance+? WHERE id=?', (amount, receiver['id']))
    db.execute('INSERT INTO transactions (user_id,receiver_upi,receiver_name,amount,note,risk_score,action,type,timestamp,txn_id) VALUES (?,?,?,?,?,?,?,?,?,?)',
               (sender_id, upi_id, receiver['name'] if receiver else upi_id, amount, note, risk, 'confirm', 'debit', ts, txn_id))
    if receiver:
        db.execute('INSERT INTO transactions (user_id,receiver_upi,receiver_name,amount,note,risk_score,action,type,timestamp,txn_id) VALUES (?,?,?,?,?,?,?,?,?,?)',
                   (receiver['id'], sender['upi_id'], sender['name'], amount, note, 0, 'confirm', 'credit', ts, txn_id))
    # Update receiver reputation
    db.execute('INSERT INTO receiver_reputation (upi_id,total_received,total_cancelled,flagged_count,last_updated) VALUES (?,1,0,0,?) ON CONFLICT(upi_id) DO UPDATE SET total_received=total_received+1, last_updated=?',
               (upi_id, ts, ts))
    db.commit()
    db.close()
    return jsonify({'status':'ok','txn_id':txn_id,'message':f'Rs.{amount:.0f} sent successfully'})

# ── Cancel / Fraud prevented ──────────────────────────────────────────────────
@app.route('/api/cancel', methods=['POST'])
def cancel_txn():
    data    = request.get_json()
    user_id = int(data.get('user_id'))
    upi_id  = data.get('upi_id','')
    amount  = float(data.get('amount',0))
    risk    = float(data.get('risk_score',0))
    ts      = datetime.now().isoformat()
    db = get_db()
    db.execute('INSERT INTO transactions (user_id,receiver_upi,receiver_name,amount,note,risk_score,action,type,timestamp,txn_id) VALUES (?,?,?,?,?,?,?,?,?,?)',
               (user_id, upi_id, upi_id, amount, 'Cancelled', risk, 'cancel', 'debit', ts, f'TGC{int(datetime.now().timestamp())}'))
    if risk >= 40:
        db.execute('INSERT INTO fraud_prevented (user_id,amount,risk_score,timestamp) VALUES (?,?,?,?)',
                   (user_id, amount, risk, ts))
        db.execute('INSERT INTO receiver_reputation (upi_id,total_received,total_cancelled,flagged_count,last_updated) VALUES (?,0,1,0,?) ON CONFLICT(upi_id) DO UPDATE SET total_cancelled=total_cancelled+1, flagged_count=flagged_count+1, last_updated=?',
                   (upi_id, ts, ts))
    db.commit()
    db.close()
    return jsonify({'status':'ok'})

# ── Dispute transaction ───────────────────────────────────────────────────────
@app.route('/api/dispute', methods=['POST'])
def dispute():
    data   = request.get_json()
    txn_id = data.get('txn_id','')
    db = get_db()
    db.execute('UPDATE transactions SET disputed=1 WHERE txn_id=?', (txn_id,))
    db.commit()
    db.close()
    return jsonify({'status':'ok','message':'Dispute raised. Our team will review within 24 hours.'})

# ── Request Money ─────────────────────────────────────────────────────────────
@app.route('/api/request', methods=['POST'])
def request_money():
    data = request.get_json()
    ts   = datetime.now().isoformat()
    db   = get_db()
    db.execute('INSERT INTO transactions (user_id,receiver_upi,receiver_name,amount,note,risk_score,action,type,timestamp,txn_id) VALUES (?,?,?,?,?,?,?,?,?,?)',
               (int(data.get('user_id')), data.get('upi_id',''), data.get('upi_id',''),
                float(data.get('amount',0)), data.get('note',''), 0, 'request', 'request', ts,
                f'TGR{int(datetime.now().timestamp())}'))
    db.commit()
    db.close()
    return jsonify({'status':'ok','message':f'Request of Rs.{float(data.get("amount",0)):.0f} sent'})

# ── Recharge ──────────────────────────────────────────────────────────────────
@app.route('/api/recharge', methods=['POST'])
def recharge():
    data     = request.get_json()
    user_id  = int(data.get('user_id'))
    mobile   = data.get('mobile','')
    amount   = float(data.get('amount',0))
    operator = data.get('operator','Airtel')
    ts       = datetime.now().isoformat()
    db = get_db()
    user = db.execute('SELECT * FROM users WHERE id=?', (user_id,)).fetchone()
    if not user or user['balance'] < amount:
        db.close(); return jsonify({'status':'error','message':'Insufficient balance'}), 400
    db.execute('UPDATE users SET balance=balance-? WHERE id=?', (amount, user_id))
    db.execute('INSERT INTO transactions (user_id,receiver_upi,receiver_name,amount,note,risk_score,action,type,timestamp,txn_id) VALUES (?,?,?,?,?,?,?,?,?,?)',
               (user_id, mobile, f'{operator} Recharge', amount, f'Recharge {mobile}', 0, 'confirm', 'recharge', ts, f'TGP{int(datetime.now().timestamp())}'))
    db.commit()
    db.close()
    return jsonify({'status':'ok','message':f'Rs.{amount:.0f} recharge successful for {mobile}'})

# ── History ───────────────────────────────────────────────────────────────────
@app.route('/api/history', methods=['GET'])
def history():
    user_id = request.args.get('user_id','1')
    db = get_db()
    rows = db.execute('SELECT * FROM transactions WHERE user_id=? ORDER BY timestamp DESC LIMIT 50', (user_id,)).fetchall()
    db.close()
    return jsonify({'history':[dict(r) for r in rows]})

# ── Analytics ─────────────────────────────────────────────────────────────────
@app.route('/api/analytics', methods=['GET'])
def analytics():
    return jsonify(get_behavior_analytics(request.args.get('user_id','1')))

# ── Dashboard ─────────────────────────────────────────────────────────────────
@app.route('/api/dashboard', methods=['GET'])
def dashboard():
    user_id = request.args.get('user_id','1')
    db = get_db()
    rows = db.execute('SELECT * FROM transactions WHERE user_id=? ORDER BY timestamp DESC LIMIT 50', (user_id,)).fetchall()
    history = [dict(r) for r in rows]
    db.close()
    total = len(history)
    return jsonify({'history':history,'stats':{'total':total,
        'high_risk':sum(1 for r in history if r['risk_score']>=70),
        'med_risk':sum(1 for r in history if 40<=r['risk_score']<70),
        'safe':sum(1 for r in history if r['risk_score']<40),
        'cancelled':sum(1 for r in history if r['action']=='cancel')},
        'chart':history[:10][::-1]})

# ── Fraud Prevented (Savings Counter) ────────────────────────────────────────
@app.route('/api/fraud-prevented', methods=['GET'])
def fraud_prevented():
    user_id = request.args.get('user_id','1')
    db = get_db()
    rows = db.execute('SELECT * FROM fraud_prevented WHERE user_id=? ORDER BY timestamp DESC', (user_id,)).fetchall()
    total_saved = sum(r['amount'] for r in rows)
    db.close()
    return jsonify({'records':[dict(r) for r in rows],'total_saved':total_saved,'count':len(rows)})

# ── Spending Limits ───────────────────────────────────────────────────────────
@app.route('/api/limits', methods=['GET'])
def get_limits():
    user_id = request.args.get('user_id','1')
    db = get_db()
    limits = db.execute('SELECT * FROM spending_limits WHERE user_id=?', (user_id,)).fetchall()
    today_start = datetime.now().replace(hour=0,minute=0,second=0).isoformat()
    week_start  = (datetime.now() - timedelta(days=datetime.now().weekday())).replace(hour=0,minute=0,second=0).isoformat()
    today_spent = db.execute('SELECT COALESCE(SUM(amount),0) as s FROM transactions WHERE user_id=? AND type="debit" AND action="confirm" AND timestamp>=?', (user_id, today_start)).fetchone()['s']
    week_spent  = db.execute('SELECT COALESCE(SUM(amount),0) as s FROM transactions WHERE user_id=? AND type="debit" AND action="confirm" AND timestamp>=?', (user_id, week_start)).fetchone()['s']
    db.close()
    result = {}
    for l in limits:
        spent = today_spent if l['period']=='daily' else week_spent
        result[l['period']] = {'limit':l['limit_amt'],'spent':round(spent,2),'remaining':round(max(0,l['limit_amt']-spent),2)}
    return jsonify(result)

@app.route('/api/limits', methods=['POST'])
def set_limits():
    data    = request.get_json()
    user_id = int(data.get('user_id'))
    period  = data.get('period','daily')
    limit   = float(data.get('limit',10000))
    db = get_db()
    db.execute('INSERT INTO spending_limits (user_id,period,limit_amt) VALUES (?,?,?) ON CONFLICT(user_id,period) DO UPDATE SET limit_amt=?',
               (user_id, period, limit, limit))
    db.commit()
    db.close()
    return jsonify({'status':'ok','message':f'{period.capitalize()} limit set to Rs.{limit:.0f}'})

# ── Scheduled Payments ────────────────────────────────────────────────────────
@app.route('/api/scheduled', methods=['GET'])
def get_scheduled():
    user_id = request.args.get('user_id','1')
    db = get_db()
    rows = db.execute('SELECT * FROM scheduled_payments WHERE user_id=? AND active=1 ORDER BY next_date', (user_id,)).fetchall()
    db.close()
    return jsonify([dict(r) for r in rows])

@app.route('/api/scheduled', methods=['POST'])
def add_scheduled():
    data = request.get_json()
    db   = get_db()
    db.execute('INSERT INTO scheduled_payments (user_id,receiver_upi,receiver_name,amount,note,frequency,next_date,active) VALUES (?,?,?,?,?,?,?,1)',
               (int(data.get('user_id')), data.get('receiver_upi',''), data.get('receiver_name',''),
                float(data.get('amount',0)), data.get('note',''), data.get('frequency','monthly'), data.get('next_date','')))
    db.commit()
    db.close()
    return jsonify({'status':'ok','message':'Scheduled payment added'})

@app.route('/api/scheduled/<int:sid>', methods=['DELETE'])
def delete_scheduled(sid):
    db = get_db()
    db.execute('UPDATE scheduled_payments SET active=0 WHERE id=?', (sid,))
    db.commit()
    db.close()
    return jsonify({'status':'ok'})

# ── Split Bill ────────────────────────────────────────────────────────────────
@app.route('/api/split', methods=['POST'])
def create_split():
    data    = request.get_json()
    user_id = int(data.get('user_id'))
    title   = data.get('title','Split Bill')
    members = data.get('members',[])
    total   = sum(m.get('amount',0) for m in members)
    ts      = datetime.now().isoformat()
    db = get_db()
    cur = db.execute('INSERT INTO split_bills (user_id,title,total_amount,created_at) VALUES (?,?,?,?)',
                     (user_id, title, total, ts))
    split_id = cur.lastrowid
    for m in members:
        db.execute('INSERT INTO split_members (split_id,upi_id,name,amount,paid) VALUES (?,?,?,?,0)',
                   (split_id, m.get('upi_id',''), m.get('name',''), float(m.get('amount',0))))
    db.commit()
    db.close()
    return jsonify({'status':'ok','split_id':split_id,'message':f'Split bill created for Rs.{total:.0f}'})

@app.route('/api/split', methods=['GET'])
def get_splits():
    user_id = request.args.get('user_id','1')
    db = get_db()
    bills = db.execute('SELECT * FROM split_bills WHERE user_id=? ORDER BY created_at DESC LIMIT 10', (user_id,)).fetchall()
    result = []
    for b in bills:
        members = db.execute('SELECT * FROM split_members WHERE split_id=?', (b['id'],)).fetchall()
        result.append({**dict(b), 'members':[dict(m) for m in members]})
    db.close()
    return jsonify(result)

# ── Receiver Reputation ───────────────────────────────────────────────────────
@app.route('/api/reputation', methods=['GET'])
def reputation():
    upi = request.args.get('upi','')
    db  = get_db()
    rep = db.execute('SELECT * FROM receiver_reputation WHERE upi_id=?', (upi,)).fetchone()
    db.close()
    if not rep:
        return jsonify({'found':False})
    total = rep['total_received'] + rep['total_cancelled']
    cancel_rate = round(rep['total_cancelled']/total*100,1) if total > 0 else 0
    return jsonify({'found':True,'upi_id':upi,'total_received':rep['total_received'],
                    'total_cancelled':rep['total_cancelled'],'flagged_count':rep['flagged_count'],
                    'cancel_rate':cancel_rate,'is_suspicious':rep['flagged_count']>=3 or cancel_rate>=40})

# ── Emergency Lock ────────────────────────────────────────────────────────────
@app.route('/api/lock', methods=['POST'])
def emergency_lock():
    data    = request.get_json()
    user_id = int(data.get('user_id'))
    lock    = data.get('lock', True)
    db = get_db()
    locked_until = (datetime.now() + timedelta(hours=24)).isoformat() if lock else None
    db.execute('UPDATE users SET pin_locked_until=? WHERE id=?', (locked_until, user_id))
    db.commit()
    db.close()
    msg = 'Account locked for 24 hours. Contact support to unlock.' if lock else 'Account unlocked.'
    return jsonify({'status':'ok','message':msg})

# ── Change UPI PIN ────────────────────────────────────────────────────────────
@app.route('/api/change-pin', methods=['POST'])
def change_pin():
    data    = request.get_json()
    user_id = int(data.get('user_id'))
    old_pin = data.get('old_pin','').strip()
    new_pin = data.get('new_pin','').strip()
    if len(new_pin) < 4 or len(new_pin) > 6:
        return jsonify({'status':'error','message':'PIN must be 4-6 digits'}), 400
    db = get_db()
    user = db.execute('SELECT * FROM users WHERE id=?', (user_id,)).fetchone()
    if not user:
        db.close(); return jsonify({'status':'error','message':'User not found'}), 404
    if user['pin'] != old_pin:
        db.close(); return jsonify({'status':'error','message':'Current PIN is incorrect'}), 401
    db.execute('UPDATE users SET pin=?, pin_attempts=0, pin_locked_until=NULL WHERE id=?', (new_pin, user_id))
    db.commit(); db.close()
    return jsonify({'status':'ok','message':'PIN changed successfully'})

if __name__ == '__main__':
    import os, ssl
    cert = os.path.join(os.path.dirname(__file__), 'cert.pem')
    key  = os.path.join(os.path.dirname(__file__), 'key.pem')
    # Generate self-signed cert if not present
    if not os.path.exists(cert):
        try:
            import subprocess
            subprocess.run([
                'openssl', 'req', '-x509', '-newkey', 'rsa:2048',
                '-keyout', key, '-out', cert,
                '-days', '365', '-nodes',
                '-subj', '/CN=trustpay'
            ], check=True, capture_output=True)
            print('✅ SSL cert generated')
        except Exception as e:
            print(f'⚠️  Could not generate SSL cert: {e}')
            print('   Running on HTTP (camera will not work on phone)')
            app.run(host='0.0.0.0', debug=True, port=5000)
            exit()
    print('🔒 Running HTTPS on https://0.0.0.0:5000')
    print('   Open on phone: https://<your-ip>:5000')
    print('   Accept the self-signed cert warning in browser')
    app.run(host='0.0.0.0', debug=True, port=5000,
            ssl_context=(cert, key))
