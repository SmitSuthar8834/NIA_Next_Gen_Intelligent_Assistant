@echo off
echo 🚀 Starting ngrok for WebRTC meetings...
echo.
echo 📡 Starting ngrok tunnel for backend (port 8000)...
echo 💡 Make sure your backend is running on port 8000
echo.

ngrok http 8000

pause