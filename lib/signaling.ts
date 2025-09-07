import { SignalingMessage, EnhancedSignalingMessage } from './types/webrtc';
import { config } from './config';

export interface ParticipantInfo {
  user_id: string;
  participant_type: 'human' | 'ai';
  is_organizer: boolean;
  joined_at: string;
  audio_enabled: boolean;
  voice_activity: boolean;
}

export class EnhancedSignalingClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private userId: string;
  private participantType: 'human' | 'ai';
  private participants: Map<string, ParticipantInfo> = new Map();

  constructor(
    private roomId: string,
    private onMessage: (message: EnhancedSignalingMessage) => void,
    private onConnectionChange: (connected: boolean) => void,
    private onParticipantsChange: (participants: ParticipantInfo[]) => void,
    private onVoiceActivity: (userId: string, isActive: boolean) => void,
    userId?: string,
    participantType: 'human' | 'ai' = 'human'
  ) {
    this.userId = userId || 'user-' + Math.random().toString(36).substr(2, 9);
    this.participantType = participantType;
  }

  connect(token?: string) {
    const baseWsUrl = config.wsUrl.replace('http://', 'ws://').replace('https://', 'wss://');
    let wsUrl = `${baseWsUrl}/ws/signaling/${this.roomId}?user_id=${this.userId}&participant_type=${this.participantType}`;
    
    if (token) {
      wsUrl += `&token=${encodeURIComponent(token)}`;
      console.log('Token provided for WebSocket connection');
    } else {
      console.warn('No token provided for WebSocket connection - this will likely fail');
    }

    console.log('Connecting to enhanced WebSocket:', wsUrl);
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('Enhanced WebSocket connected');
      this.reconnectAttempts = 0;
      this.onConnectionChange(true);
    };

    this.ws.onmessage = (event) => {
      try {
        const message: EnhancedSignalingMessage = JSON.parse(event.data);
        console.log('Received enhanced signaling message:', message.type);

        // Handle enhanced message types
        this.handleEnhancedMessage(message);

        // Call original message handler
        this.onMessage(message);
      } catch (error) {
        console.error('Failed to parse signaling message:', error);
      }
    };

    this.ws.onclose = (event) => {
      console.log('Enhanced WebSocket disconnected:', event.code, event.reason);
      this.onConnectionChange(false);
      this.attemptReconnect(token);
    };

    this.ws.onerror = (error) => {
      console.error('Enhanced WebSocket error:', error);
    };
  }

  private handleEnhancedMessage(message: EnhancedSignalingMessage) {
    switch (message.type) {
      case 'room_joined':
        if (message.participants) {
          this.updateParticipants(message.participants);
        }
        break;

      case 'participant_joined':
        if (message.participant) {
          this.participants.set(message.participant.user_id, message.participant);
          this.onParticipantsChange(Array.from(this.participants.values()));
        }
        break;

      case 'participant_left':
        if (message.participant?.user_id) {
          this.participants.delete(message.participant.user_id);
          this.onParticipantsChange(Array.from(this.participants.values()));
        }
        break;

      case 'voice_activity':
        if (message.user_id !== undefined && message.is_active !== undefined) {
          this.onVoiceActivity(message.user_id, message.is_active);

          // Update participant voice activity
          const participant = this.participants.get(message.user_id);
          if (participant) {
            participant.voice_activity = message.is_active;
            this.participants.set(message.user_id, participant);
          }
        }
        break;

      case 'ai_joined':
      case 'ai_message':
      case 'meeting_completed':
        // These are handled by the main message handler
        break;
    }
  }

  private updateParticipants(participants: ParticipantInfo[]) {
    this.participants.clear();
    participants.forEach(p => this.participants.set(p.user_id, p));
    this.onParticipantsChange(participants);
  }

  private attemptReconnect(token?: string) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = 1000 * this.reconnectAttempts;

      console.log(`Reconnecting... attempt ${this.reconnectAttempts} in ${delay}ms`);

      this.reconnectTimeout = setTimeout(() => {
        this.connect(token);
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  send(message: Omit<EnhancedSignalingMessage, 'timestamp'>) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const messageStr = JSON.stringify(message);
      console.log('Sending enhanced signaling message:', message.type);
      this.ws.send(messageStr);
    } else {
      console.warn('WebSocket not open, cannot send message:', message.type);
    }
  }

  sendVoiceActivity(isActive: boolean) {
    this.send({
      type: 'voice_activity',
      from_user: this.userId,
      user_id: this.userId,
      is_active: isActive
    });
  }

  sendConversationMessage(message: string, audioData?: ArrayBuffer) {
    this.send({
      type: 'conversation_message',
      from_user: this.userId,
      message: message,
      participant_type: this.participantType,
      audio_duration: audioData ? audioData.byteLength : undefined
    });
  }

  getUserId(): string {
    return this.userId;
  }

  getParticipants(): ParticipantInfo[] {
    return Array.from(this.participants.values());
  }

  getParticipant(userId: string): ParticipantInfo | undefined {
    return this.participants.get(userId);
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Legacy SignalingClient for backward compatibility
export class SignalingClient extends EnhancedSignalingClient {
  constructor(
    sessionId: string,
    onMessage: (message: SignalingMessage) => void,
    onConnectionChange: (connected: boolean) => void,
    userId?: string
  ) {
    super(
      sessionId,
      onMessage as (message: EnhancedSignalingMessage) => void,
      onConnectionChange,
      () => { }, // onParticipantsChange
      () => { }, // onVoiceActivity
      userId
    );
  }
}