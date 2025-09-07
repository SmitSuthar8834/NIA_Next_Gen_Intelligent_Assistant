@echo off
echo 🚀 Starting Local Development with Reverse Proxy
echo ================================================

echo.
echo 📋 Prerequisites Check:
echo - Node.js installed? 
node --version
if %errorlevel% neq 0 (
    echo ❌ Node.js not found. Please install Node.js 18+
    pause
    exit /b 1
)

echo - Python installed?
python --version
if %errorlevel% neq 0 (
    echo ❌ Python not found. Please install Python 3.8+
    pause
    exit /b 1
)

echo - Docker installed?
docker --version
if %errorlevel% neq 0 (
    echo ⚠️  Docker not found. Will run without reverse proxy.
    echo    Install Docker Desktop to enable multi-device access.
    echo.
)

echo.
echo 📦 Installing dependencies...
echo Installing frontend dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install frontend dependencies
    pause
    exit /b 1
)

echo Installing backend dependencies...
cd backend
call pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo ❌ Failed to install backend dependencies
    pause
    exit /b 1
)
cd ..

echo.
echo 🚀 Starting servers...
node start-with-proxy.js

pause