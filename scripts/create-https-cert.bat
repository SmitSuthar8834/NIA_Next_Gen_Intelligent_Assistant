@echo off
echo 🔐 Creating self-signed certificate for HTTPS
echo.

echo 📁 Creating certs directory...
if not exist "certs" mkdir certs

echo 🔑 Generating private key...
openssl genrsa -out certs/key.pem 2048

echo 📜 Generating certificate...
openssl req -new -x509 -key certs/key.pem -out certs/cert.pem -days 365 -subj "/C=US/ST=State/L=City/O=Organization/CN=192.168.1.32"

echo ✅ Certificate created!
echo.
echo 📋 Next steps:
echo 1. Update your Next.js to use HTTPS
echo 2. Accept the certificate warning in browsers
echo 3. Microphone access will work over HTTPS
echo.
pause