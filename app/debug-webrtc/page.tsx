'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';

export default function DebugWebRTC() {
  const [logs, setLogs] = useState<string[]>([]);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [isOfferer, setIsOfferer] = useState(false);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(message);
  };

  const connectWebSocket = () => {
    const websocket = new WebSocket('ws://localhost:8000/ws/signaling/debug-session');
    
    websocket.onopen = () => {
      addLog('WebSocket connected');
      setWs(websocket);
    };

    websocket.onmessage = async (event) => {
      const message = JSON.parse(event.data);
      addLog(`Received: ${message.type} from ${message.from_user}`);
      
      if (message.type === 'offer') {
        addLog(`Peer connection exists: ${!!pcRef.current}`);
        if (pcRef.current) {
        try {
          addLog('Handling offer...');
          addLog(`Offer SDP type: ${typeof message.sdp}, value: ${JSON.stringify(message.sdp).substring(0, 100)}...`);
          
          await pcRef.current.setRemoteDescription(message.sdp);
          addLog('Set remote description successfully');
          
          const answer = await pcRef.current.createAnswer();
          addLog('Created answer successfully');
          
          await pcRef.current.setLocalDescription(answer);
          addLog('Set local description successfully');
          
          websocket.send(JSON.stringify({
            type: 'answer',
            from_user: 'debug-user-2',
            sdp: answer
          }));
          addLog('Sent answer');
        } catch (error) {
          addLog(`Error handling offer: ${error}`);
          console.error('Detailed error:', error);
        }
        } else {
          addLog('No peer connection available to handle offer');
        }
      }
      
      if (message.type === 'answer' && pcRef.current) {
        try {
          addLog('Handling answer...');
          await pcRef.current.setRemoteDescription(message.sdp);
        } catch (error) {
          addLog(`Error handling answer: ${error}`);
        }
      }
      
      if (message.type === 'ice' && pcRef.current) {
        try {
          addLog('Adding ICE candidate...');
          await pcRef.current.addIceCandidate(message.candidate);
        } catch (error) {
          addLog(`Error adding ICE candidate: ${error}`);
        }
      }
    };

    websocket.onclose = () => {
      addLog('WebSocket disconnected');
      setWs(null);
    };
  };

  const initWebRTC = async () => {
    try {
      const peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      peerConnection.onicecandidate = (event) => {
        if (event.candidate && ws) {
          addLog('Sending ICE candidate');
          ws.send(JSON.stringify({
            type: 'ice',
            from_user: isOfferer ? 'debug-user-1' : 'debug-user-2',
            candidate: event.candidate.toJSON()
          }));
        }
      };

      peerConnection.onconnectionstatechange = () => {
        addLog(`Connection state: ${peerConnection.connectionState}`);
      };

      peerConnection.oniceconnectionstatechange = () => {
        addLog(`ICE connection state: ${peerConnection.iceConnectionState}`);
      };

      peerConnection.ontrack = (event) => {
        addLog('Remote track received!');
      };

      // Get microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });
      addLog('Added local audio track');

      pcRef.current = peerConnection;
      addLog('WebRTC initialized');
    } catch (error) {
      addLog(`Error: ${error}`);
    }
  };

  const createOffer = async () => {
    if (!pcRef.current || !ws) return;
    
    setIsOfferer(true);
    const offer = await pcRef.current.createOffer();
    await pcRef.current.setLocalDescription(offer);
    
    ws.send(JSON.stringify({
      type: 'offer',
      from_user: 'debug-user-1',
      sdp: offer
    }));
    addLog('Sent offer');
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">WebRTC Debug</h1>
      
      <div className="space-x-4 mb-4">
        <Button onClick={connectWebSocket} disabled={!!ws}>
          Connect WebSocket
        </Button>
        <Button onClick={initWebRTC} disabled={!!pcRef.current}>
          Init WebRTC
        </Button>
        <Button onClick={createOffer} disabled={!pcRef.current || !ws}>
          Create Offer (Tab 1)
        </Button>
      </div>

      <div className="bg-gray-100 p-4 rounded max-h-96 overflow-y-auto">
        <h3 className="font-semibold mb-2">Debug Logs:</h3>
        {logs.map((log, index) => (
          <div key={index} className="text-sm mb-1 font-mono">
            {log}
          </div>
        ))}
      </div>
      
      <div className="mt-4 text-sm text-gray-600">
        <p><strong>Instructions:</strong></p>
        <p>1. Open this page in two tabs</p>
        <p>2. In both tabs: Connect WebSocket → Init WebRTC</p>
        <p>3. In first tab only: Click "Create Offer"</p>
        <p>4. Watch the logs for the connection process</p>
      </div>
    </div>
  );
}