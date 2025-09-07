export interface SignalingMessage {
  type: "join" | "offer" | "answer" | "ice" | "leave";
  from_user: string;
  to_user?: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  timestamp?: string;
}

export interface EnhancedSignalingMessage extends Omit<SignalingMessage, 'type'> {
  type: "join" | "offer" | "answer" | "ice" | "leave" | 
        "room_joined" | "participant_joined" | "participant_left" | 
        "voice_activity" | "conversation_message" | "ai_joined" | 
        "ai_message" | "meeting_completed" | "ai_auto_join_scheduled" |
        "ai_voice_message" | "ai_speaking_finished";
  
  // Enhanced fields
  room_id?: string;
  user_id?: string;
  participant_type?: 'human' | 'ai';
  is_active?: boolean;
  message?: string;
  audio_data?: string; // Base64 encoded audio data for AI voice messages
  audio_duration?: number;
  confidence?: number;
  conversation_state?: string;
  current_speaker?: string;
  is_prompt?: boolean;
  analysis?: any;
  
  // Participant data
  participant?: {
    user_id: string;
    participant_type: 'human' | 'ai';
    is_organizer: boolean;
    joined_at: string;
    audio_enabled: boolean;
    voice_activity: boolean;
  };
  
  participants?: Array<{
    user_id: string;
    participant_type: 'human' | 'ai';
    is_organizer: boolean;
    joined_at: string;
    audio_enabled: boolean;
    voice_activity: boolean;
  }>;
}

export interface WebRTCConfig {
  iceServers: RTCIceServer[];
}

export interface MeetingState {
  isConnected: boolean;
  isMuted: boolean;
  isInCall: boolean;
  participants: string[];
  connectionStatus: 'disconnected' | 'connecting' | 'connected';
}

export interface EnhancedMeetingState extends MeetingState {
  roomId: string;
  conversationState: 'waiting' | 'active' | 'ai_speaking' | 'user_speaking' | 'completed';
  currentSpeaker?: string;
  aiParticipant?: {
    user_id: string;
    joined_at: string;
    is_active: boolean;
  };
  voiceActivityDetection: boolean;
  audioLevel: number;
}

export interface VoiceActivityDetector {
  startDetection(stream: MediaStream): void;
  stopDetection(): void;
  onVoiceStart: (callback: () => void) => void;
  onVoiceEnd: (callback: () => void) => void;
  setSensitivity(level: number): void;
  setAIMode(enabled: boolean): void;
}