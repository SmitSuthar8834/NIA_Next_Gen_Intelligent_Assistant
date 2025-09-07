'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function TestWebSocket() {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);

  const connect = () => {
    const websocket = new WebSocket('ws://localhost:8000/ws/signaling/test-session');
    
    websocket.onopen = () => {
      console.log('WebSocket connected');
      setConnected(true);
      setMessages(prev => [...prev, 'Connected to WebSocket']);
    };

    websocket.onmessage = (event) => {
      console.log('Received:', event.data);
      setMessages(prev => [...prev, `Received: ${event.data}`]);
    };

    websocket.onclose = () => {
      console.log('WebSocket disconnected');
      setConnected(false);
      setMessages(prev => [...prev, 'Disconnected from WebSocket']);
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setMessages(prev => [...prev, `Error: ${error}`]);
    };

    setWs(websocket);
  };

  const sendMessage = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      const message = {
        type: 'join',
        from_user: 'test-user-' + Date.now()
      };
      ws.send(JSON.stringify(message));
      setMessages(prev => [...prev, `Sent: ${JSON.stringify(message)}`]);
    }
  };

  const disconnect = () => {
    if (ws) {
      ws.close();
      setWs(null);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">WebSocket Test</h1>
      
      <div className="space-x-4 mb-4">
        <Button onClick={connect} disabled={connected}>
          Connect
        </Button>
        <Button onClick={sendMessage} disabled={!connected}>
          Send Test Message
        </Button>
        <Button onClick={disconnect} disabled={!connected}>
          Disconnect
        </Button>
      </div>

      <div className="mb-4">
        Status: <span className={connected ? 'text-green-600' : 'text-red-600'}>
          {connected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      <div className="bg-gray-100 p-4 rounded max-h-96 overflow-y-auto">
        <h3 className="font-semibold mb-2">Messages:</h3>
        {messages.map((msg, index) => (
          <div key={index} className="text-sm mb-1 font-mono">
            {msg}
          </div>
        ))}
      </div>
    </div>
  );
}