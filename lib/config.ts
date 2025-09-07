// Configuration for different environments
export const config = {
  // WebSocket URL for signaling server
  wsUrl: process.env.NEXT_PUBLIC_WS_URL || 'ws://192.168.1.32:8000',
  
  // API base URL
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://192.168.1.32:8000',
  
  // Environment
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
};

// Helper function to get WebSocket URL for signaling
export function getSignalingUrl(sessionId: string): string {
  const baseUrl = config.wsUrl.replace('http://', 'ws://').replace('https://', 'wss://');
  return `${baseUrl}/ws/signaling/${sessionId}`;
}