
import sqlite3, os, random
from datetime import datetime, timedelta

DB_PATH = os.path.join(os.path.dirname(__file__), 'trustguard.db')

def init():
    # Remove old DB so we start fresh
    import time
    for _ in range(5):
        try:
            if os.path.exists(DB_PATH):
                os.remove(DB_PATH)
            break
        except PermissionError:
            time.sleep(1)

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Drop all tables if they exist (fallback when file can't be deleted)
    for tbl in ['split_members','split_bills','scheduled_payments','fraud_prevented',
                'receiver_reputation','spending_limits','transactions','contacts','users']:
        c.execute(f'DROP TABLE IF EXISTS {tbl}')

    c.execute('''CREATE TABLE users (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        name          TEXT NOT NULL,
        phone         TEXT UNIQUE NOT NULL,
        upi_id        TEXT UNIQUE NOT NULL,
        pin           TEXT NOT NULL,
        balance       REAL DEFAULT 10000.0,
        avatar        TEXT DEFAULT '',
        daily_limit   REAL DEFAULT 50000.0,
        pin_attempts  INTEGER DEFAULT 0,
        pin_locked_until TEXT DEFAULT NULL
    )''')

    c.execute('''CREATE TABLE contacts (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id       INTEGER NOT NULL,
        name          TEXT NOT NULL,
        contact_phone TEXT NOT NULL,
        upi_id        TEXT,
        trusted       INTEGER DEFAULT 0
    )''')

    c.execute('''CREATE TABLE transactions (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id       INTEGER NOT NULL,
        receiver_upi  TEXT NOT NULL,
        receiver_name TEXT,
        amount        REAL NOT NULL,
        note          TEXT DEFAULT '',
        risk_score    REAL DEFAULT 0,
        action        TEXT DEFAULT 'confirm',
        type          TEXT DEFAULT 'debit',
        timestamp     TEXT NOT NULL,
        txn_id        TEXT DEFAULT '',
        disputed      INTEGER DEFAULT 0
    )''')

    c.execute('''CREATE TABLE spending_limits (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id    INTEGER NOT NULL,
        period     TEXT NOT NULL,
        limit_amt  REAL NOT NULL,
        UNIQUE(user_id, period)
    )''')

    c.execute('''CREATE TABLE receiver_reputation (
        upi_id         TEXT PRIMARY KEY,
        total_received INTEGER DEFAULT 0,
        total_cancelled INTEGER DEFAULT 0,
        flagged_count  INTEGER DEFAULT 0,
        last_updated   TEXT
    )''')

    c.execute('''CREATE TABLE fraud_prevented (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id    INTEGER NOT NULL,
        amount     REAL NOT NULL,
        risk_score REAL NOT NULL,
        timestamp  TEXT NOT NULL
    )''')

    c.execute('''CREATE TABLE scheduled_payments (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id      INTEGER NOT NULL,
        receiver_upi TEXT NOT NULL,
        receiver_name TEXT,
        amount       REAL NOT NULL,
        note         TEXT DEFAULT '',
        frequency    TEXT NOT NULL,
        next_date    TEXT NOT NULL,
        active       INTEGER DEFAULT 1
    )''')

    c.execute('''CREATE TABLE split_bills (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id      INTEGER NOT NULL,
        title        TEXT NOT NULL,
        total_amount REAL NOT NULL,
        created_at   TEXT NOT NULL
    )''')

    c.execute('''CREATE TABLE split_members (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        split_id  INTEGER NOT NULL,
        upi_id    TEXT NOT NULL,
        name      TEXT NOT NULL,
        amount    REAL NOT NULL,
        paid      INTEGER DEFAULT 0
    )''')

    users = [
        (1, 'Chethan G',    '9876543210', 'chethan@trustpay', '1234', 75000.0, 100000.0),
        (2, 'Priya Sharma', '9123456780', 'priya@trustpay',   '5678', 15000.0, 50000.0),
        (3, 'Rahul Verma',  '9988776655', 'rahul@trustpay',   '4321', 8000.0,  50000.0),
        (4, 'Ananya Singh', '9871234560', 'ananya@trustpay',  '9999', 32000.0, 50000.0),
        (5, 'Vikram Nair',  '9765432100', 'vikram@trustpay',  '1111', 5000.0,  50000.0),
    ]
    c.executemany('INSERT INTO users (id,name,phone,upi_id,pin,balance,daily_limit) VALUES (?,?,?,?,?,?,?)', users)

    contacts = [
        (1, 'Priya Sharma', '9123456780', 'priya@trustpay',  1),
        (1, 'Rahul Verma',  '9988776655', 'rahul@trustpay',  1),
        (1, 'Ananya Singh', '9871234560', 'ananya@trustpay', 0),
        (1, 'Vikram Nair',  '9765432100', 'vikram@trustpay', 0),
        (1, 'Mom',          '9000000001', 'mom@okaxis',      1),
        (1, 'Grocery Store','9000000002', 'grocery@paytm',   0),
        (1, 'Netflix',      '9000000003', 'netflix@icici',   1),
    ]
    c.executemany('INSERT INTO contacts (user_id,name,contact_phone,upi_id,trusted) VALUES (?,?,?,?,?)', contacts)

    now = datetime.now()
    txns = [
        (1,'priya@trustpay','Priya Sharma',500,'Dinner split',5,'confirm','debit',(now-timedelta(hours=2)).isoformat(),'TG001',0),
        (1,'rahul@trustpay','Rahul Verma',1200,'Rent share',5,'confirm','debit',(now-timedelta(days=1)).isoformat(),'TG002',0),
        (1,'grocery@paytm','Grocery Store',350,'Vegetables',5,'confirm','debit',(now-timedelta(days=2)).isoformat(),'TG003',0),
        (1,'netflix@icici','Netflix',499,'Subscription',5,'confirm','debit',(now-timedelta(days=3)).isoformat(),'TG004',0),
        (1,'priya@trustpay','Priya Sharma',2000,'Movie tickets',5,'confirm','credit',(now-timedelta(days=4)).isoformat(),'TG005',0),
        (1,'mom@okaxis','Mom',5000,'Monthly transfer',5,'confirm','debit',(now-timedelta(days=5)).isoformat(),'TG006',0),
        (1,'ananya@trustpay','Ananya Singh',800,'Lunch',5,'confirm','debit',(now-timedelta(days=6)).isoformat(),'TG007',0),
        (1,'9876543210','Airtel Recharge',299,'Recharge',0,'confirm','recharge',(now-timedelta(days=7)).isoformat(),'TG008',0),
        (1,'vikram@trustpay','Vikram Nair',150,'Coffee',5,'confirm','debit',(now-timedelta(days=8)).isoformat(),'TG009',0),
        (1,'unknown@ybl','Unknown',15000,'Payment',75,'cancel','debit',(now-timedelta(days=9)).isoformat(),'TG010',0),
        (1,'priya@trustpay','Priya Sharma',300,'Snacks',5,'confirm','debit',(now-timedelta(days=10)).isoformat(),'TG011',0),
        (1,'rahul@trustpay','Rahul Verma',600,'Petrol',5,'confirm','debit',(now-timedelta(days=12)).isoformat(),'TG012',0),
        (1,'mom@okaxis','Mom',3000,'Groceries',5,'confirm','debit',(now-timedelta(days=15)).isoformat(),'TG013',0),
        (1,'grocery@paytm','Grocery Store',420,'Weekly groceries',5,'confirm','debit',(now-timedelta(days=16)).isoformat(),'TG014',0),
        (1,'ananya@trustpay','Ananya Singh',1500,'Birthday gift',5,'confirm','debit',(now-timedelta(days=20)).isoformat(),'TG015',0),
    ]
    c.executemany('INSERT INTO transactions (user_id,receiver_upi,receiver_name,amount,note,risk_score,action,type,timestamp,txn_id,disputed) VALUES (?,?,?,?,?,?,?,?,?,?,?)', txns)

    # Receiver reputation seed
    reputations = [
        ('priya@trustpay',   45, 0, 0, now.isoformat()),
        ('rahul@trustpay',   30, 1, 0, now.isoformat()),
        ('unknown@ybl',       3, 8, 5, now.isoformat()),
        ('grocery@paytm',    80, 0, 0, now.isoformat()),
        ('netflix@icici',   200, 0, 0, now.isoformat()),
        ('mom@okaxis',       60, 0, 0, now.isoformat()),
    ]
    c.executemany('INSERT INTO receiver_reputation VALUES (?,?,?,?,?)', reputations)

    # Fraud prevented seed
    c.execute('INSERT INTO fraud_prevented (user_id,amount,risk_score,timestamp) VALUES (?,?,?,?)',
              (1, 15000, 75, (now-timedelta(days=9)).isoformat()))

    # Scheduled payments seed
    c.execute('''INSERT INTO scheduled_payments (user_id,receiver_upi,receiver_name,amount,note,frequency,next_date,active)
                 VALUES (?,?,?,?,?,?,?,?)''',
              (1,'netflix@icici','Netflix',499,'Monthly subscription','monthly',
               (now+timedelta(days=27)).strftime('%Y-%m-%d'),1))

    # Spending limits seed
    c.execute('INSERT INTO spending_limits (user_id,period,limit_amt) VALUES (?,?,?)', (1,'daily',10000))
    c.execute('INSERT INTO spending_limits (user_id,period,limit_amt) VALUES (?,?,?)', (1,'weekly',50000))

    conn.commit()
    conn.close()
    print('DB initialized with all new tables')

if __name__ == '__main__':
    init()
