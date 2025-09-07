@echo off
echo 🚀 Starting WebRTC Meetings with Ngrok
echo.

echo 📋 Step 1: Starting backend...
start "Backend" cmd /k "python start-backend.py"
timeout /t 3

echo 📡 Step 2: Starting ngrok tunnel...
echo ⚠️  After ngrok starts, you'll need to:
echo    1. Copy the ngrok URL (https://xxx.ngrok-free.app)
echo    2. Update .env.local with the ngrok URL
echo    3. Restart your Next.js server
echo.
echo Press any key to start ngrok...
pause

ngrok http 8000