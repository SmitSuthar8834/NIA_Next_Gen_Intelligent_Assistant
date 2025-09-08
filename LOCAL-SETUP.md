# Local Development with Reverse Proxy

This guide helps you run the project locally with a reverse proxy for multi-device access and HTTPS support.

## 🎯 What This Gives You

- **Single URL**: Access both frontend and backend through one port
- **HTTPS Support**: Self-signed certificates for local HTTPS
- **Multi-device Access**: Use your app from phone, tablet, other computers
- **No Domain Required**: Works completely offline/locally
- **WebRTC Ready**: Proper setup for camera/microphone features

## 🚀 Quick Start (Windows)

### Manual Steps
```cmd
# 1. Install dependencies
npm install
cd backend && pip install -r requirements.txt && cd ..

# 2. Start frontend
npm run dev

# 3. Start backend (in separate terminal)
cd backend
uvicorn app.main:app --reload
```

## 🚀 Quick Start (Mac/Linux)

```bash
# 1. Install dependencies
npm install
cd backend && pip install -r requirements.txt && cd ..

# 2. Start frontend
npm run dev

# 3. Start backend (in separate terminal)
cd backend
uvicorn app.main:app --reload
```

## 📋 Prerequisites

1. **Node.js 18+** - [Download here](https://nodejs.org/)
2. **Python 3.8+** - [Download here](https://python.org/)
3. **Docker Desktop** (optional but recommended) - [Download here](https://docker.com/)

## 🌐 Access URLs

Once running, you can access your app at:

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | Next.js dev server |
| Backend | http://localhost:8000 | FastAPI server |
| API Docs | http://localhost:8000/docs | Swagger documentation |

## 📱 Multi-Device Access

### Find Your Local IP Address

**Windows:**
```cmd
ipconfig
```
Look for "IPv4 Address" (usually 192.168.x.x or 10.x.x.x)

**Mac/Linux:**
```bash
ifconfig
# or
ip addr show
```

### Access from Other Devices

1. **Find your computer's local IP** (e.g., 192.168.1.100)
2. **On other devices, visit:**
   - `http://192.168.1.100` (HTTP)
   - `https://192.168.1.100` (HTTPS - accept security warning)

### For Mobile Access
1. Visit `http://YOUR_LOCAL_IP:3000` on your phone
2. Your app should load normally
3. Note: Camera/microphone features may require HTTPS in production

## 🔧 How It Works

### Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Your Device   │    │  Nginx Proxy    │    │   Your Apps     │
│                 │    │                 │    │                 │
│ Browser/Mobile  │───▶│ Port 80/443     │───▶│ Frontend :3000  │
│                 │    │                 │    │ Backend  :8000  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### URL Routing
- `/` → Frontend (Next.js)
- `/api/*` → Backend (FastAPI)
- `/ws` → WebSocket connections

### SSL Certificates
- **Self-signed certificates** generated automatically
- **Valid for localhost** and your local IP
- **Browser warnings are normal** for self-signed certs

## 🐛 Troubleshooting

### Common Issues

**1. "Docker not found"**
```
Solution: Install Docker Desktop or run without proxy:
node start-dev.js
```

**2. "Port already in use"**
```
Solution: Stop other services using ports 80, 443, 3000, 8000
netstat -ano | findstr :80
```

**3. "Can't access from phone"**
```
Solutions:
- Check firewall allows connections
- Ensure devices are on same WiFi network
- Try http:// instead of https://
- Use your computer's actual IP, not localhost
```

**4. "SSL certificate error"**
```
Solution: This is normal for self-signed certificates
- Click "Advanced" → "Proceed to site"
- Or use HTTP version instead
```

**5. "Backend not responding"**
```
Solutions:
- Check backend is running on port 8000
- Verify backend/.env file exists
- Try: cd backend && python -m uvicorn app.main:app --reload
```

### Debug Mode

**Check what's running:**
```cmd
# Windows
netstat -ano | findstr :3000
netstat -ano | findstr :8000
netstat -ano | findstr :80

# Mac/Linux
lsof -i :3000
lsof -i :8000
lsof -i :80
```

**View logs:**
```cmd
# Docker logs
docker-compose -f docker-compose.local.yml logs nginx

# Manual nginx test
docker run --rm -v %cd%/nginx.conf:/etc/nginx/nginx.conf nginx nginx -t
```

## 🔒 Security Notes

- **Self-signed certificates** will show browser warnings
- **Only use on trusted local networks**
- **Don't expose ports to internet** without proper security
- **CORS is open** for local development convenience

## 📁 Development Files

The project includes these development files:
- `.env.local` - Frontend environment variables
- `backend/.env` - Backend environment variables
- `package.json` - Frontend dependencies and scripts
- `backend/requirements.txt` - Python dependencies

## 🎉 Success!

If everything works, you should see:
- ✅ Frontend loads at http://localhost:3000
- ✅ API responds at http://localhost:8000
- ✅ API docs available at http://localhost:8000/docs
- ✅ Mobile devices can access via your local IP:3000

Your sales assistant app is now ready for development! 🚀