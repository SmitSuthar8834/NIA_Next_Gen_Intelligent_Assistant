# Reverse Proxy & SSL Setup

This setup solves HTTPS issues and allows access from multiple devices without browser security blocks.

## 🎯 What This Solves

- **HTTPS everywhere**: SSL certificates via Certbot
- **Single domain**: Both frontend and backend under one URL
- **Cross-device access**: No more browser security blocks
- **WebRTC compatibility**: Proper SSL for camera/microphone access
- **Production ready**: Docker-based deployment

## 🚀 Quick Start

### Development (Local Testing)

```bash
# Install Docker and Docker Compose first
# Then run:
node start-with-proxy.js
```

Access your app at:
- `http://localhost` (proxied - test this for cross-device)
- `http://localhost:3000` (direct frontend)
- `http://localhost:8000` (direct backend)

### Production Deployment

1. **Get a domain** and point it to your server's IP

2. **Setup for your domain**:
```bash
chmod +x setup-production.sh
./setup-production.sh yourdomain.com your-email@example.com
```

3. **Generate SSL certificates**:
```bash
./setup-ssl.sh
```

4. **Update backend environment**:
Edit `backend/.env` and uncomment/update the production URLs:
```env
FRONTEND_URL=https://yourdomain.com
BACKEND_URL=https://yourdomain.com/api
ALLOW_ORIGINS=https://yourdomain.com
```

5. **Start production**:
```bash
docker-compose up -d
```

## 📁 File Structure

```
├── nginx.conf              # Nginx reverse proxy config
├── docker-compose.yml      # Docker services
├── Dockerfile.frontend     # Frontend container
├── backend/Dockerfile      # Backend container
├── setup-ssl.sh           # SSL certificate setup
├── setup-production.sh    # Production configuration
└── start-with-proxy.js    # Development with proxy
```

## 🔧 How It Works

### URL Routing
- `https://yourdomain.com/` → Frontend (Next.js)
- `https://yourdomain.com/api/` → Backend (FastAPI)
- `https://yourdomain.com/ws` → WebSocket signaling

### SSL Certificates
- Automatic generation via Let's Encrypt
- Auto-renewal every 12 hours
- Secure headers and modern TLS

### Development vs Production

| Feature | Development | Production |
|---------|-------------|------------|
| SSL | Optional | Required |
| Domain | localhost | Your domain |
| Containers | Optional | Required |
| Certificates | Self-signed | Let's Encrypt |

## 🐛 Troubleshooting

### Certificate Issues
```bash
# Check certificate status
docker-compose logs certbot

# Regenerate certificates
docker-compose run --rm certbot certbot renew --force-renewal
```

### Nginx Issues
```bash
# Check nginx logs
docker-compose logs nginx

# Test nginx config
docker-compose exec nginx nginx -t
```

### Cross-Device Access Issues
1. Ensure your domain points to the correct IP
2. Check firewall allows ports 80 and 443
3. Verify SSL certificate is valid
4. Test with `https://` (not `http://`)

## 🔒 Security Features

- HTTPS redirect (all HTTP → HTTPS)
- Security headers (HSTS, XSS protection, etc.)
- CORS properly configured
- Modern TLS protocols only
- Automatic certificate renewal

## 📱 Testing Multi-Device Access

1. Deploy with your domain
2. Access `https://yourdomain.com` from:
   - Desktop browser
   - Mobile browser
   - Different networks
3. Test WebRTC features (camera/microphone)
4. Verify no security warnings

Your app will now work seamlessly across all devices with proper HTTPS! 🎉