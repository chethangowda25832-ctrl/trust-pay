import os, ipaddress, datetime
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.backends import default_backend
import socket

key = rsa.generate_private_key(public_exponent=65537, key_size=2048, backend=default_backend())
local_ip = socket.gethostbyname(socket.gethostname())
print("IP:", local_ip)

subject = issuer = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, u"trustpay")])
now = datetime.datetime.now(datetime.timezone.utc)
cert = (x509.CertificateBuilder()
    .subject_name(subject).issuer_name(issuer)
    .public_key(key.public_key())
    .serial_number(x509.random_serial_number())
    .not_valid_before(now)
    .not_valid_after(now + datetime.timedelta(days=365))
    .add_extension(x509.SubjectAlternativeName([
        x509.DNSName(u"localhost"),
        x509.IPAddress(ipaddress.IPv4Address(u"127.0.0.1")),
        x509.IPAddress(ipaddress.IPv4Address(local_ip)),
    ]), critical=False)
    .sign(key, hashes.SHA256(), default_backend()))

with open("backend/cert.pem", "wb") as f:
    f.write(cert.public_bytes(serialization.Encoding.PEM))
with open("backend/key.pem", "wb") as f:
    f.write(key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.TraditionalOpenSSL, serialization.NoEncryption()))
print("SSL cert generated for", local_ip)
