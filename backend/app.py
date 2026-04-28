from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import sqlite3, os, json
from datetime import datetime
from risk_engine import analyze_transaction, get_user_history, get_behavior_analytics

app = Flask(__name__, static_folder='../frontend', static_url_path='')
CORS(app)
DB_PATH = os.path.join(os.path.dirname(__file__), 'trustguard.db')

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# ── Static ───────────────────────────────────────────────────────────────────
@app.route('/')
def index():
    return send_from_directory('../frontend', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('../frontend', path)

# ── Auth ─────────────────────────────────────────────────────────────────────
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    phone = data.get('phone', '').strip()
    pin   = data.get('pin', '').strip()
    db = get_db()
    user = db.execute('SELECT * FROM users WHERE phone=? AND pin=?', (phone, pin)).fetchone()
    db.close()
    if user:
        return jsonify({'status': 'ok', 'user': dict(user)})
    return jsonify({'status': 'error', 'message': 'Invalid credentials'}), 401

@app.route('/api/register', methods=['POST'])
def register():
    data  = request.get_json()
    name  = data.get('name', '').strip()
    phone = data.get('phone', '').strip()
    upi   = data.get('upi_id', phone + '@trustpay').strip()
    pin   = data.get('pin', '').strip()
    db = get_db()
    try:
        db.execute('INSERT INTO users (name,phone,upi_id,pin,balance) VALUES (?,?,?,?,?)',
                   (name, phone, upi, pin, 10000.0))
        db.commit()
        user = db.execute('SELECT * FROM users WHERE phone=?', (phone,)).fetchone()
        db.close()
        return jsonify({'status': 'ok', 'user': dict(user)})
    except sqlite3.IntegrityError:
        db.close()
        return jsonify({'status': 'error', 'message': 'Phone already registered'}), 409

# ── User profile & balance ────────────────────────────────────────────────────
@app.route('/api/user/<user_id>', methods=['GET'])
def get_user(user_id):
    db   = get_db()
    user = db.execute('SELECT * FROM users WHERE id=?', (user_id,)).fetchone()
    db.close()
    if user:
        return jsonify(dict(user))
    return jsonify({'error': 'Not found'}), 404

# ── Contacts ──────────────────────────────────────────────────────────────────
@app.route('/api/contacts/<user_id>', methods=['GET'])
def get_contacts(user_id):
    db   = get_db()
    rows = db.execute(
        '''SELECT c.*, u.name as uname, u.upi_id as uupi
           FROM contacts c LEFT JOIN users u ON c.contact_phone = u.phone
           WHERE c.user_id=? ORDER BY c.name''', (user_id,)).fetchall()
    db.close()
    return jsonify([dict(r) for r in rows])

# ── Lookup UPI ────────────────────────────────────────────────────────────────
@app.route('/api/lookup', methods=['GET'])
def lookup():
    upi = request.args.get('upi', '').strip()
    db  = get_db()
    user = db.execute('SELECT id,name,upi_id,phone FROM users WHERE upi_id=?', (upi,)).fetchone()
    db.close()
    if user:
        return jsonify({'found': True, 'user': dict(user)})
    return jsonify({'found': False})

# ── Analyze (TrustGuard) ──────────────────────────────────────────────────────
@app.route('/api/analyze', methods=['POST'])
def analyze():
    data   = request.get_json()
    result = analyze_transaction(
        data.get('user_id', '1'),
        data.get('upi_id', ''),
        float(data.get('amount', 0)),
        data.get('note', '')
    )
    return jsonify(result)

# ── Send Money ────────────────────────────────────────────────────────────────
@app.route('/api/send', methods=['POST'])
def send_money():
    data      = request.get_json()
    sender_id = int(data.get('sender_id'))
    upi_id    = data.get('upi_id', '').strip()
    amount    = float(data.get('amount', 0))
    note      = data.get('note', '')
    risk      = float(data.get('risk_score', 0))

    db = get_db()
    sender   = db.execute('SELECT * FROM users WHERE id=?', (sender_id,)).fetchone()
    receiver = db.execute('SELECT * FROM users WHERE upi_id=?', (upi_id,)).fetchone()

    if not sender:
        db.close(); return jsonify({'status':'error','message':'Sender not found'}), 404
    if sender['balance'] < amount:
        db.close(); return jsonify({'status':'error','message':'Insufficient balance'}), 400

    ts = datetime.now().isoformat()
    # Debit sender
    db.execute('UPDATE users SET balance=balance-? WHERE id=?', (amount, sender_id))
    # Credit receiver if on platform
    if receiver:
        db.execute('UPDATE users SET balance=balance+? WHERE id=?', (amount, receiver['id']))

    # Log transaction
    db.execute(
        '''INSERT INTO transactions
           (user_id,receiver_upi,receiver_name,amount,note,risk_score,action,type,timestamp)
           VALUES (?,?,?,?,?,?,?,?,?)''',
        (sender_id, upi_id,
         receiver['name'] if receiver else upi_id,
         amount, note, risk, 'confirm', 'debit', ts)
    )
    if receiver:
        db.execute(
            '''INSERT INTO transactions
               (user_id,receiver_upi,receiver_name,amount,note,risk_score,action,type,timestamp)
               VALUES (?,?,?,?,?,?,?,?,?)''',
            (receiver['id'], sender['upi_id'], sender['name'],
             amount, note, 0, 'confirm', 'credit', ts)
        )

    db.commit()
    txn_id = f"TG{int(datetime.now().timestamp())}"
    db.close()
    return jsonify({'status':'ok','txn_id': txn_id,'message':f'₹{amount:.0f} sent successfully'})

# ── Request Money ─────────────────────────────────────────────────────────────
@app.route('/api/request', methods=['POST'])
def request_money():
    data      = request.get_json()
    sender_id = int(data.get('user_id'))
    upi_id    = data.get('upi_id', '').strip()
    amount    = float(data.get('amount', 0))
    note      = data.get('note', '')
    ts        = datetime.now().isoformat()

    db = get_db()
    db.execute(
        '''INSERT INTO transactions
           (user_id,receiver_upi,receiver_name,amount,note,risk_score,action,type,timestamp)
           VALUES (?,?,?,?,?,?,?,?,?)''',
        (sender_id, upi_id, upi_id, amount, note, 0, 'request', 'request', ts)
    )
    db.commit()
    db.close()
    return jsonify({'status':'ok','message':f'Request of ₹{amount:.0f} sent'})

# ── Recharge ──────────────────────────────────────────────────────────────────
@app.route('/api/recharge', methods=['POST'])
def recharge():
    data    = request.get_json()
    user_id = int(data.get('user_id'))
    mobile  = data.get('mobile', '')
    amount  = float(data.get('amount', 0))
    operator= data.get('operator', 'Airtel')
    ts      = datetime.now().isoformat()

    db = get_db()
    user = db.execute('SELECT * FROM users WHERE id=?', (user_id,)).fetchone()
    if not user or user['balance'] < amount:
        db.close(); return jsonify({'status':'error','message':'Insufficient balance'}), 400

    db.execute('UPDATE users SET balance=balance-? WHERE id=?', (amount, user_id))
    db.execute(
        '''INSERT INTO transactions
           (user_id,receiver_upi,receiver_name,amount,note,risk_score,action,type,timestamp)
           VALUES (?,?,?,?,?,?,?,?,?)''',
        (user_id, mobile, f'{operator} Recharge', amount,
         f'Recharge {mobile}', 0, 'confirm', 'recharge', ts)
    )
    db.commit()
    db.close()
    return jsonify({'status':'ok','message':f'₹{amount:.0f} recharge successful for {mobile}'})

# ── Transaction history ───────────────────────────────────────────────────────
@app.route('/api/history', methods=['GET'])
def history():
    user_id = request.args.get('user_id', '1')
    db      = get_db()
    rows    = db.execute(
        'SELECT * FROM transactions WHERE user_id=? ORDER BY timestamp DESC LIMIT 50',
        (user_id,)).fetchall()
    db.close()
    return jsonify({'history': [dict(r) for r in rows]})

# ── Behavior Analytics ───────────────────────────────────────────────────────
@app.route('/api/analytics', methods=['GET'])
def analytics():
    user_id = request.args.get('user_id', '1')
    data = get_behavior_analytics(user_id)
    return jsonify(data)

# ── Dashboard ─────────────────────────────────────────────────────────────────
@app.route('/api/dashboard', methods=['GET'])
def dashboard():
    user_id = request.args.get('user_id', '1')
    db      = get_db()
    rows    = db.execute(
        'SELECT * FROM transactions WHERE user_id=? ORDER BY timestamp DESC LIMIT 50',
        (user_id,)).fetchall()
    history = [dict(r) for r in rows]
    total     = len(history)
    high_risk = sum(1 for r in history if r['risk_score'] >= 70)
    med_risk  = sum(1 for r in history if 40 <= r['risk_score'] < 70)
    safe      = sum(1 for r in history if r['risk_score'] < 40)
    cancelled = sum(1 for r in history if r['action'] == 'cancel')
    chart     = history[:10][::-1]
    db.close()
    return jsonify({'history': history, 'stats': {
        'total': total, 'high_risk': high_risk,
        'med_risk': med_risk, 'safe': safe, 'cancelled': cancelled
    }, 'chart': chart})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
