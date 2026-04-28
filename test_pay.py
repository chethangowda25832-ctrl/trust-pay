import urllib.request, json

def post(url, body):
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers={"Content-Type":"application/json"}, method="POST")
    try:
        return json.loads(urllib.request.urlopen(req, timeout=5).read())
    except urllib.error.HTTPError as e:
        return {"error": e.code, "msg": e.read().decode()}

def get(url):
    return json.loads(urllib.request.urlopen(url, timeout=5).read())

# 1. Login
r = post("http://127.0.0.1:5000/api/login", {"phone":"9876543210","pin":"1234"})
print("Login:", r.get("status"), "balance:", r.get("user",{}).get("balance"))
uid = r.get("user",{}).get("id",1)

# 2. Analyze safe
r = post("http://127.0.0.1:5000/api/analyze", {"user_id":uid,"upi_id":"priya@trustpay","amount":500,"note":"test"})
print("Analyze:", r.get("risk_level"), "score:", r.get("risk_score"))

# 3. Send money
r = post("http://127.0.0.1:5000/api/send", {"sender_id":uid,"upi_id":"priya@trustpay","amount":100,"note":"test","risk_score":0})
print("Send:", r.get("status"), r.get("message",""), r.get("error",""))
