# 🌐 Running WebRTC Meetings with Ngrok

This guide will help you set up ngrok to test your WebRTC meetings from different devices and networks.

## 📋 Prerequisites

- ✅ Ngrok installed (you already have v3.24.0)
- ✅ Backend running on port 8000
- ✅ Frontend running on port 3000

## 🚀 Quick Setup

### Step 1: Start Your Backend
```bash
# Make sure your FastAPI backend is running
python start-backend.py
```

### Step 2: Start Ngrok
Choose one of these methods:

**Option A: Using the batch script (Windows)**
```bash
scripts\start-ngrok.bat
```

**Option B: Manual ngrok command**
```bash
ngrok http 8000
```

### Step 3: Update Environment Variables
After ngrok starts, you'll see a URL like: `https://abc123.ngrok-free.app`

Update your `.env.local` file:
```env
NEXT_PUBLIC_WS_URL=wss://abc123.ngrok-free.app
NEXT_PUBLIC_API_URL=https://abc123.ngrok-free.app
```

### Step 4: Restart Next.js
```bash
# Stop your Next.js dev server (Ctrl+C) and restart
npm run dev
```

## 🧪 Testing

### Local Testing
- Frontend: `http://localhost:3000/meetings`
- Backend API: `https://abc123.ngrok-free.app` (through ngrok)

### Remote Testing
Share these URLs with others:
- Meeting page: `http://localhost:3000/meeting/test-room`
- Or use the ngrok URL: `https://abc123.ngrok-free.app` (but they'll need to access your frontend)

### Best Practice for Remote Testing
1. **Host shares**: The meeting URL from their local frontend
2. **Participants join**: Using the same meeting room ID
3. **Backend communication**: Goes through ngrok tunnel

## 🔧 Configuration Details

### Environment Variables
```env
# Local development (default)
NEXT_PUBLIC_WS_URL=ws://localhost:8000
NEXT_PUBLIC_API_URL=http://localhost:8000

# With ngrok
NEXT_PUBLIC_WS_URL=wss://your-ngrok-url.ngrok-free.app
NEXT_PUBLIC_API_URL=https://your-ngrok-url.ngrok-free.app
```

### Architecture with Ngrok
```
[Remote Device] → [Your Frontend:3000] → [Ngrok Tunnel] → [Your Backend:8000]
     ↓                    ↓                    ↓                ↓
[WebRTC Client] ←→ [Signaling Client] ←→ [WebSocket] ←→ [FastAPI Server]
```

## 🌍 Real-World Testing Scenarios

### Scenario 1: Same Network, Different Devices
- Host: Laptop running the app
- Participant: Phone/tablet on same WiFi
- Share: `http://[your-local-ip]:3000/meeting/room-name`

### Scenario 2: Different Networks
- Host: Your development machine
- Participant: Friend's computer/phone anywhere
- Requirements: Ngrok tunnel for backend
- Share: Meeting room ID or URL

### Scenario 3: Multiple Remote Participants
- All participants need access to a frontend
- Backend runs through ngrok tunnel
- Each participant joins the same room ID

## 🐛 Troubleshooting

### Common Issues

**1. WebSocket Connection Failed**
- ✅ Check ngrok URL is correct in `.env.local`
- ✅ Ensure backend is running on port 8000
- ✅ Restart Next.js after changing environment variables

**2. Ngrok "Visit Site" Warning**
- Click "Visit Site" button on the ngrok warning page
- Or add `--domain` flag if you have a paid ngrok account

**3. CORS Issues**
- Backend already configured for `localhost:3000`
- Ngrok requests should work through the tunnel

**4. Audio Not Working**
- ✅ Check microphone permissions in browser
- ✅ Test on HTTPS (ngrok provides HTTPS)
- ✅ Some browsers require HTTPS for WebRTC

### Debug Commands
```bash
# Check if backend is running
curl http://localhost:8000/health

# Check ngrok tunnel
curl https://your-ngrok-url.ngrok-free.app/health

# Test WebSocket (in browser console)
new WebSocket('wss://your-ngrok-url.ngrok-free.app/ws/signaling/test')
```

## 📱 Mobile Testing

### iOS Safari
- Requires HTTPS (ngrok provides this)
- May need to enable microphone in Settings

### Android Chrome
- Works well with WebRTC
- Allow microphone permissions

### Testing Tips
- Use different room IDs for different tests
- Check browser console for WebRTC logs
- Test with 2-3 participants for best results

## 🔒 Security Notes

- Ngrok URLs are public but hard to guess
- Don't share ngrok URLs publicly
- Use room IDs as a basic access control
- For production, implement proper authentication

## 📞 Example Usage

1. **Start everything**:
   ```bash
   # Terminal 1: Backend
   python start-backend.py
   
   # Terminal 2: Ngrok
   ngrok http 8000
   
   # Terminal 3: Frontend (after updating .env.local)
   npm run dev
   ```

2. **Create a meeting**:
   - Go to `http://localhost:3000/meetings`
   - Click "Create Live Meeting"
   - Use room ID: `team-standup`

3. **Invite others**:
   - Share room ID: `team-standup`
   - Or share URL: `http://localhost:3000/meeting/team-standup`

4. **Join from different devices**:
   - Each person goes to the meeting URL
   - Clicks "Join Call"
   - Allows microphone access
   - Should hear each other!

## 🎯 Success Indicators

✅ Ngrok tunnel shows your backend URL  
✅ Frontend connects to WebSocket through ngrok  
✅ Multiple participants can join the same room  
✅ Audio flows between participants  
✅ Connection status shows "Connected"  
✅ Participant list updates in real-time  

Happy testing! 🎉