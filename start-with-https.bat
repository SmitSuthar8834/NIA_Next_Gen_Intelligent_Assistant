@echo off
echo 🚀 Starting WebRTC with HTTPS support
echo.

echo 📡 Step 1: Starting ngrok for backend (port 8000)...
start "Backend Ngrok" cmd /k "ngrok http 8000"

echo ⏳ Waiting 5 seconds for backend ngrok to start...
timeout /t 5

echo 📱 Step 2: Starting ngrok for frontend (port 3000)...
start "Frontend Ngrok" cmd /k "ngrok http 3000"

echo.
echo ✅ Both ngrok tunnels started!
echo.
echo 📋 Next steps:
echo 1. Check both ngrok windows for HTTPS URLs
echo 2. Update .env.local with backend ngrok URL
echo 3. Share the frontend ngrok URL for remote testing
echo 4. Both URLs will have HTTPS for microphone access
echo.
pause