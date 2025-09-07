# WebRTC Audio Call MVP - Testing Guide

## Local Development Setup

### 1. Start Backend
```bash
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Start Frontend (new terminal)
```bash
npm run dev
```

## Demo Steps

### Basic Connection Test
1. Open browser tab 1: `http://localhost:3000/meeting/test-room-123`
2. Open browser tab 2: `http://localhost:3000/meeting/test-room-123`
3. Click "Join Call" in both tabs
4. Allow microphone access when prompted
5. Speak in tab 1, confirm audio heard in tab 2
6. Test mute/unmute functionality
7. Test "Leave Call" and reconnection

### Network Testing
- Close/reopen browser tab to test WebSocket reconnection
- Disable/enable network to test connection recovery
- Check browser console for WebRTC connection logs

## Troubleshooting

### Common Issues
1. **Microphone Permission Denied**: Refresh page and allow microphone access
2. **WebSocket Connection Failed**: Ensure backend is running on port 8000
3. **No Audio**: Check browser audio settings and microphone permissions
4. **Connection Stuck on "Connecting"**: Check browser console for errors

### Browser Console Logs
Look for these key messages:
- "WebSocket connected"
- "Local audio stream initialized"
- "Remote stream received"
- "Created and set local offer/answer"
- "Added ICE candidate"

## Architecture Overview

### Backend Components
- `backend/app/signaling.py` - WebSocket signaling server
- `backend/app/routers/signaling.py` - WebSocket router
- `backend/app/models/signaling.py` - Message schemas

### Frontend Components
- `app/(meet)/meeting/[id]/page.tsx` - Meeting room UI
- `lib/webrtc/client.ts` - WebRTC peer connection management
- `lib/signaling.ts` - WebSocket signaling client
- `stores/meeting.ts` - Zustand state management

### Message Flow
1. User joins meeting → WebSocket connects → sends "join" message
2. Second user joins → first user creates offer → sends "offer" message
3. Second user receives offer → creates answer → sends "answer" message
4. ICE candidates exchanged via "ice" messages
5. Audio streams flow directly between peers (P2P)

## Next Steps for Production
- Add proper JWT authentication
- Implement TURN servers for NAT traversal
- Add error handling and reconnection logic
- Add call recording capabilities
- Integrate with existing NIA system