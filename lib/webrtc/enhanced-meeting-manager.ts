/**
 * Enhanced WebRTC Meeting Manager
 * Handles multi-user meetings with AI participants, voice activity detection,
 * and conversation flow management
 */

import { EnhancedSignalingClient, ParticipantInfo } from '../signaling';
import { VoiceActivityDetector } from './voice-activity-detector';
import { EnhancedSignalingMessage, EnhancedMeetingState } from '../types/webrtc';

export interface MeetingConfig {
  roomId: string;
  userId?: string;
  participantType?: 'human' | 'ai';
  autoJoin?: boolean;
  voiceActivityDetection?: boolean;
  audioConstraints?: MediaStreamConstraints['audio'];
}

export interface ConversationMessage {
  speaker: 'ai' | 'human';
  message: string;
  timestamp: string;
  userId?: string;
}

export class EnhancedMeetingManager {
  private signalingClient: EnhancedSignalingClient;
  private voiceDetector: VoiceActivityDetector | null = null;
  private localStream: MediaStream | null = null;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private remoteStreams: Map<string, MediaStream> = new Map();
  
  private meetingState: EnhancedMeetingState = {
    isConnected: false,
    isMuted: false,
    isInCall: false,
    participants: [],
    connectionStatus: 'disconnected',
    roomId: '',
    conversationState: 'waiting',
    voiceActivityDetection: false,
    audioLevel: 0
  };
  
  private participants: Map<string, ParticipantInfo> = new Map();
  private conversationHistory: ConversationMessage[] = [];
  
  // Event callbacks
  private onStateChangeCallback?: (state: EnhancedMeetingState) => void;
  private onParticipantUpdateCallback?: (participants: ParticipantInfo[]) => void;
  private onConversationMessageCallback?: (message: ConversationMessage) => void;
  private onAIMessageCallback?: (message: string, isPrompt?: boolean) => void;
  private onMeetingCompleteCallback?: (analysis: any) => void;
  private onErrorCallback?: (error: string) => void;

  constructor(private config: MeetingConfig) {
    this.meetingState.roomId = config.roomId;
    
    // Initialize signaling client
    this.signalingClient = new EnhancedSignalingClient(
      config.roomId,
      this.handleSignalingMessage.bind(this),
      this.handleConnectionChange.bind(this),
      this.handleParticipantsChange.bind(this),
      this.handleVoiceActivity.bind(this),
      config.userId,
      config.participantType || 'human'
    );
  }

  async joinMeeting(): Promise<void> {
    try {
      this.updateState({ connectionStatus: 'connecting' });
      
      // Get user media if human participant
      if (this.config.participantType !== 'ai') {
        await this.initializeLocalMedia();
      }
      
      // Connect to signaling server
      this.signalingClient.connect();
      
      console.log(`Joining meeting room: ${this.config.roomId}`);
    } catch (error) {
      console.error('Failed to join meeting:', error);
      this.handleError(`Failed to join meeting: ${error}`);
      throw error;
    }
  }

  async leaveMeeting(): Promise<void> {
    try {
      // Stop voice detection
      if (this.voiceDetector) {
        this.voiceDetector.stopDetection();
        this.voiceDetector = null;
      }
      
      // Close peer connections
      this.peerConnections.forEach(pc => pc.close());
      this.peerConnections.clear();
      
      // Stop local stream
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
        this.localStream = null;
      }
      
      // Disconnect signaling
      this.signalingClient.disconnect();
      
      this.updateState({ 
        isConnected: false, 
        isInCall: false, 
        connectionStatus: 'disconnected' 
      });
      
      console.log('Left meeting room');
    } catch (error) {
      console.error('Error leaving meeting:', error);
    }
  }

  private async initializeLocalMedia(): Promise<void> {
    try {
      const constraints: MediaStreamConstraints = {
        audio: this.config.audioConstraints || {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        },
        video: false
      };
      
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Initialize voice activity detection if enabled
      if (this.config.voiceActivityDetection !== false) {
        await this.initializeVoiceDetection();
      }
      
      console.log('Local media initialized');
    } catch (error) {
      console.error('Failed to initialize local media:', error);
      throw error;
    }
  }

  private async initializeVoiceDetection(): Promise<void> {
    if (!this.localStream) return;
    
    try {
      this.voiceDetector = new VoiceActivityDetector({
        sensitivity: 0.3,
        minSpeechDuration: 300,
        silenceDuration: 1000,
        aiMode: false
      });
      
      this.voiceDetector.onVoiceStart(() => {
        this.signalingClient.sendVoiceActivity(true);
        console.log('Voice activity started');
      });
      
      this.voiceDetector.onVoiceEnd(() => {
        this.signalingClient.sendVoiceActivity(false);
        console.log('Voice activity ended');
      });
      
      this.voiceDetector.onAudioLevel((level) => {
        this.updateState({ audioLevel: level });
      });
      
      await this.voiceDetector.startDetection(this.localStream);
      this.updateState({ voiceActivityDetection: true });
      
      console.log('Voice activity detection initialized');
    } catch (error) {
      console.error('Failed to initialize voice detection:', error);
    }
  }

  private handleSignalingMessage(message: EnhancedSignalingMessage): void {
    console.log('Handling signaling message:', message.type);
    
    switch (message.type) {
      case 'room_joined':
        this.handleRoomJoined(message);
        break;
        
      case 'ai_joined':
        this.handleAIJoined(message);
        break;
        
      case 'ai_message':
        this.handleAIMessage(message);
        break;
        
      case 'conversation_message':
        this.handleConversationMessage(message);
        break;
        
      case 'meeting_completed':
        this.handleMeetingCompleted(message);
        break;
        
      case 'offer':
      case 'answer':
      case 'ice':
        this.handleWebRTCSignaling(message);
        break;
        
      default:
        console.log('Unhandled message type:', message.type);
    }
  }

  private handleRoomJoined(message: EnhancedSignalingMessage): void {
    this.updateState({ 
      isConnected: true, 
      isInCall: true, 
      connectionStatus: 'connected',
      conversationState: 'waiting'
    });
    
    console.log(`Joined room ${message.room_id} as ${message.user_id}`);
  }

  private handleAIJoined(message: EnhancedSignalingMessage): void {
    this.updateState({ 
      conversationState: 'active',
      aiParticipant: {
        user_id: 'ai-assistant',
        joined_at: new Date().toISOString(),
        is_active: true
      }
    });
    
    // Adjust voice detection for AI presence
    if (this.voiceDetector) {
      this.voiceDetector.setAIMode(true);
    }
    
    console.log('AI assistant joined the meeting');
  }

  private handleAIMessage(message: EnhancedSignalingMessage): void {
    if (message.message) {
      const conversationMessage: ConversationMessage = {
        speaker: 'ai',
        message: message.message,
        timestamp: new Date().toISOString()
      };
      
      this.conversationHistory.push(conversationMessage);
      
      if (this.onConversationMessageCallback) {
        this.onConversationMessageCallback(conversationMessage);
      }
      
      if (this.onAIMessageCallback) {
        this.onAIMessageCallback(message.message, message.is_prompt);
      }
      
      // Update conversation state
      if (message.conversation_state) {
        this.updateState({ conversationState: message.conversation_state as any });
      }
    }
  }

  private handleConversationMessage(message: EnhancedSignalingMessage): void {
    if (message.message && message.from_user) {
      const conversationMessage: ConversationMessage = {
        speaker: message.participant_type === 'ai' ? 'ai' : 'human',
        message: message.message,
        timestamp: new Date().toISOString(),
        userId: message.from_user
      };
      
      this.conversationHistory.push(conversationMessage);
      
      if (this.onConversationMessageCallback) {
        this.onConversationMessageCallback(conversationMessage);
      }
    }
  }

  private handleMeetingCompleted(message: EnhancedSignalingMessage): void {
    this.updateState({ conversationState: 'completed' });
    
    if (this.onMeetingCompleteCallback && message.analysis) {
      this.onMeetingCompleteCallback(message.analysis);
    }
    
    console.log('Meeting completed');
  }

  private handleWebRTCSignaling(message: EnhancedSignalingMessage): void {
    // Handle WebRTC signaling for peer-to-peer connections
    // This would be implemented for direct audio connections between participants
    // For now, we'll focus on the signaling server coordination
    console.log('WebRTC signaling message received:', message.type);
  }

  private handleConnectionChange(connected: boolean): void {
    this.updateState({ 
      isConnected: connected,
      connectionStatus: connected ? 'connected' : 'disconnected'
    });
  }

  private handleParticipantsChange(participants: ParticipantInfo[]): void {
    this.participants.clear();
    participants.forEach(p => this.participants.set(p.user_id, p));
    
    this.updateState({ 
      participants: participants.map(p => p.user_id)
    });
    
    if (this.onParticipantUpdateCallback) {
      this.onParticipantUpdateCallback(participants);
    }
  }

  private handleVoiceActivity(userId: string, isActive: boolean): void {
    const participant = this.participants.get(userId);
    if (participant) {
      participant.voice_activity = isActive;
      
      // Update conversation state based on voice activity
      if (isActive) {
        this.updateState({ 
          currentSpeaker: userId,
          conversationState: participant.participant_type === 'ai' ? 'ai_speaking' : 'user_speaking'
        });
      } else {
        // Check if anyone else is speaking
        const activeSpeakers = Array.from(this.participants.values())
          .filter(p => p.voice_activity);
          
        if (activeSpeakers.length === 0) {
          this.updateState({ 
            currentSpeaker: undefined,
            conversationState: 'active'
          });
        }
      }
    }
  }

  private handleError(error: string): void {
    console.error('Meeting error:', error);
    if (this.onErrorCallback) {
      this.onErrorCallback(error);
    }
  }

  private updateState(updates: Partial<EnhancedMeetingState>): void {
    this.meetingState = { ...this.meetingState, ...updates };
    
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(this.meetingState);
    }
  }

  // Public methods
  sendMessage(message: string): void {
    this.signalingClient.sendConversationMessage(message);
    
    // Add to local conversation history
    const conversationMessage: ConversationMessage = {
      speaker: 'human',
      message: message,
      timestamp: new Date().toISOString(),
      userId: this.signalingClient.getUserId()
    };
    
    this.conversationHistory.push(conversationMessage);
    
    if (this.onConversationMessageCallback) {
      this.onConversationMessageCallback(conversationMessage);
    }
  }

  toggleMute(): void {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        this.updateState({ isMuted: !audioTrack.enabled });
      }
    }
  }

  adjustVoiceSensitivity(level: number): void {
    if (this.voiceDetector) {
      this.voiceDetector.setSensitivity(level);
    }
  }

  // Event handlers
  onStateChange(callback: (state: EnhancedMeetingState) => void): void {
    this.onStateChangeCallback = callback;
  }

  onParticipantUpdate(callback: (participants: ParticipantInfo[]) => void): void {
    this.onParticipantUpdateCallback = callback;
  }

  onConversationMessage(callback: (message: ConversationMessage) => void): void {
    this.onConversationMessageCallback = callback;
  }

  onAIMessage(callback: (message: string, isPrompt?: boolean) => void): void {
    this.onAIMessageCallback = callback;
  }

  onMeetingComplete(callback: (analysis: any) => void): void {
    this.onMeetingCompleteCallback = callback;
  }

  onError(callback: (error: string) => void): void {
    this.onErrorCallback = callback;
  }

  // Getters
  get state(): EnhancedMeetingState {
    return { ...this.meetingState };
  }

  get participantsList(): ParticipantInfo[] {
    return Array.from(this.participants.values());
  }

  get conversation(): ConversationMessage[] {
    return [...this.conversationHistory];
  }

  get isAIPresent(): boolean {
    return Array.from(this.participants.values())
      .some(p => p.participant_type === 'ai');
  }
}