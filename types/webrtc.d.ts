// WebRTC and Speech API type declarations

interface Window {
  SpeechRecognition: typeof SpeechRecognition
  webkitSpeechRecognition: typeof SpeechRecognition
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  serviceURI: string
  grammars: SpeechGrammarList
  
  start(): void
  stop(): void
  abort(): void
  
  onaudiostart: ((this: SpeechRecognition, ev: Event) => any) | null
  onaudioend: ((this: SpeechRecognition, ev: Event) => any) | null
  onend: ((this: SpeechRecognition, ev: Event) => any) | null
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null
  onnomatch: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null
  onsoundstart: ((this: SpeechRecognition, ev: Event) => any) | null
  onsoundend: ((this: SpeechRecognition, ev: Event) => any) | null
  onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null
  onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number
  readonly results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string
  readonly message: string
}

interface SpeechRecognitionResultList {
  readonly length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean
  readonly length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  readonly transcript: string
  readonly confidence: number
}

interface SpeechGrammarList {
  readonly length: number
  item(index: number): SpeechGrammar
  [index: number]: SpeechGrammar
  addFromURI(src: string, weight?: number): void
  addFromString(string: string, weight?: number): void
}

interface SpeechGrammar {
  src: string
  weight: number
}

declare var SpeechRecognition: {
  prototype: SpeechRecognition
  new(): SpeechRecognition
}

declare var webkitSpeechRecognition: {
  prototype: SpeechRecognition
  new(): SpeechRecognition
}

// Enhanced WebRTC types
interface RTCPeerConnection {
  createOffer(options?: RTCOfferOptions): Promise<RTCSessionDescriptionInit>
  createAnswer(options?: RTCAnswerOptions): Promise<RTCSessionDescriptionInit>
  setLocalDescription(description?: RTCSessionDescriptionInit): Promise<void>
  setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void>
  addIceCandidate(candidate?: RTCIceCandidateInit): Promise<void>
  addTrack(track: MediaStreamTrack, ...streams: MediaStream[]): RTCRtpSender
  removeTrack(sender: RTCRtpSender): void
  getStats(selector?: MediaStreamTrack): Promise<RTCStatsReport>
  close(): void
  
  onicecandidate: ((this: RTCPeerConnection, ev: RTCPeerConnectionIceEvent) => any) | null
  ontrack: ((this: RTCPeerConnection, ev: RTCTrackEvent) => any) | null
  ondatachannel: ((this: RTCPeerConnection, ev: RTCDataChannelEvent) => any) | null
  onconnectionstatechange: ((this: RTCPeerConnection, ev: Event) => any) | null
  oniceconnectionstatechange: ((this: RTCPeerConnection, ev: Event) => any) | null
}

// Voice Activity Detection types
interface VoiceActivityDetector {
  startDetection(stream: MediaStream): void
  stopDetection(): void
  onVoiceStart: (callback: () => void) => void
  onVoiceEnd: (callback: () => void) => void
  setSensitivity(level: number): void
  setAIMode(enabled: boolean): void
}

// Meeting participant types
interface MeetingParticipant {
  id: string
  name: string
  type: 'human' | 'ai'
  isConnected: boolean
  isMuted: boolean
  isSpeaking: boolean
  audioLevel: number
  joinedAt: string
}

// WebSocket message types for signaling
interface SignalingMessage {
  type: 'join_meeting' | 'leave_meeting' | 'participant_joined' | 'participant_left' | 
        'participant_updated' | 'message' | 'meeting_ended' | 'offer' | 'answer' | 'ice_candidate'
  meeting_id?: string
  participant?: MeetingParticipant
  participant_id?: string
  message?: any
  analysis?: any
  offer?: RTCSessionDescriptionInit
  answer?: RTCSessionDescriptionInit
  candidate?: RTCIceCandidateInit
  from?: string
  target_participant?: string
}