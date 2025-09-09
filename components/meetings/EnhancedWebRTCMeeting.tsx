"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Phone,
  PhoneOff,
  Users,
  Bot,
  User,
  Loader2,
  Activity,
  Settings,
  MessageSquare,
  AlertCircle
} from "lucide-react"
import { useUser } from "@/hooks/useUser"
import { config } from "@/lib/config"

interface Participant {
  id: string
  name: string
  type: 'human' | 'ai'
  isConnected: boolean
  isMuted: boolean
  isSpeaking: boolean
  audioLevel: number
  joinedAt: string
}

interface MeetingMessage {
  id: string
  speaker_id: string
  speaker_type: 'ai' | 'human'
  message: string
  timestamp: string
  confidence?: number
}

interface EnhancedWebRTCMeetingProps {
  meetingId: string
  roomId: string
  onMeetingEnd?: (analysis: any) => void
  onClose?: () => void
}

export default function EnhancedWebRTCMeeting({ 
  meetingId, 
  roomId, 
  onMeetingEnd, 
  onClose 
}: EnhancedWebRTCMeetingProps) {
  const { user, access_token } = useUser()
  
  // Meeting state
  const [participants, setParticipants] = useState<Participant[]>([])
  const [messages, setMessages] = useState<MeetingMessage[]>([])
  const [meetingStatus, setMeetingStatus] = useState<'connecting' | 'active' | 'ended'>('connecting')
  
  // Audio/Video state
  const [isConnected, setIsConnected] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [voiceActivityDetected, setVoiceActivityDetected] = useState(false)
  const [audioPermissionNeeded, setAudioPermissionNeeded] = useState(false)
  const audioPlaybackQueueRef = useRef<string[]>([])
  const isPlayingRef = useRef(false)
  const audioElementRef = useRef<HTMLAudioElement | null>(null)
  
  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showParticipants, setShowParticipants] = useState(true)
  const [showTranscript, setShowTranscript] = useState(true)
  
  // Refs
  const localStreamRef = useRef<MediaStream | null>(null)
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const hasJoinedRef = useRef(false);
const animationFrameRef = useRef<number | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Initialize WebRTC and join meeting
  useEffect(() => {
    initializeMeeting() 
    return () => cleanup()
  }, [meetingId, roomId])

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const initializeMeeting = async () => {
    try {
      setLoading(true)
      
      // Initialize WebRTC
      await initializeWebRTC()
      
      // Connect to signaling server
      await connectToSignaling()
      
      // Join the meeting room
      await joinMeetingRoom()
      
      } catch (err: any) {
    try {
      console.error('Failed to initialize meeting:', err, {
        message: err?.message,
        stack: err?.stack,
        asString: JSON.stringify(err)
      })
    } catch (logErr) {
      console.error('Failed to initialize meeting (and failed to log error):', err, logErr)
    }
    setError('Failed to join meeting. Please check your connection and microphone permissions.')
  } finally {
    setLoading(false)
  }

  }

  const initializeWebRTC = async () => {
    try {
      // Get user media with enhanced audio settings
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 1
        },
        video: false
      })
      
      localStreamRef.current = stream
      
      // Setup audio analysis
      setupAudioAnalysis(stream)
      
      // Initialize speech recognition
      initializeSpeechRecognition()
      
      setIsConnected(true)
      
    } catch (error) {
      console.error('Failed to initialize WebRTC:', error)
      throw new Error('Failed to access microphone')
    }
  }

  const setupAudioAnalysis = (stream: MediaStream) => {
    try {
      const audioContext = new AudioContext()
      const analyser = audioContext.createAnalyser()
      const source = audioContext.createMediaStreamSource(stream)
      
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.8
      source.connect(analyser)
      
      audioContextRef.current = audioContext
      analyserRef.current = analyser
      
      // Start monitoring
      monitorAudioLevel()
      
    } catch (error) {
      console.error('Failed to setup audio analysis:', error)
    }
  }

  const monitorAudioLevel = () => {
    if (!analyserRef.current) return
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
    
    const updateLevel = () => {
      if (analyserRef.current && !isMuted) {
        analyserRef.current.getByteFrequencyData(dataArray)
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length
        const normalizedLevel = average / 255
        
        setAudioLevel(normalizedLevel)
        
        // Voice activity detection threshold
        const isActive = normalizedLevel > 0.1
        setVoiceActivityDetected(isActive)
        
        // Update speaking status for current user
        setIsSpeaking(isActive)
        
      } else {
        setAudioLevel(0)
        setVoiceActivityDetected(false)
        setIsSpeaking(false)
      }
      
      animationFrameRef.current = requestAnimationFrame(updateLevel)
    }
    
    updateLevel()
  }

  const initializeSpeechRecognition = () => {
    if (typeof window === 'undefined') return
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return
    
    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    
    recognition.onresult = (event) => {
      let finalTranscript = ''
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript
        }
      }
      
      if (finalTranscript.trim()) {
        sendMessage(finalTranscript.trim())
      }
    }
    
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error)
    }
    
    recognitionRef.current = recognition
  }

  const connectToSignaling = async () => {
  return new Promise<void>((resolve, reject) => {
    try {
      // Prefer env var, but fall back to shared config.wsUrl
      let base = process?.env?.NEXT_PUBLIC_WS_URL || config.wsUrl
      if (!base) {
        const err = new Error('Missing WebSocket base URL (NEXT_PUBLIC_WS_URL and config.wsUrl are not set)')
        console.error(err)
        return reject(err)
      }
      if (!access_token) {
        const err = new Error('Missing access_token; cannot connect to signaling server without token')
        console.error(err)
        return reject(err)
      }

      // Normalize protocol to ws/wss
      if (base.startsWith('https://')) {
        base = base.replace(/^https:\/\//, 'wss://')
      } else if (base.startsWith('http://')) {
        base = base.replace(/^http:\/\//, 'ws://')
      }

      const participantType = 'human'
      const uid = user?.id
      const urlBase = base.replace(/\/$/, '')
      const qs = new URLSearchParams({
        token: access_token,
        ...(uid ? { user_id: uid } : {}),
        participant_type: participantType,
      }).toString()
      const wsUrl = `${urlBase}/ws/signaling/${roomId}?${qs}`
      const ws = new WebSocket(wsUrl)

      // set ref early so cleanup or other callers see it
      wsRef.current = ws

      ws.onopen = () => {
  console.log('Connected to signaling server:', wsUrl)
  setIsConnected(true) // if you maintain this state
  resolve()
  // If initialization already tried to join and was waiting, attempt safe join:
  // (no await here — joinMeetingRoom will await waitForWsOpen itself)
  if (!hasJoinedRef.current) {
    // fire-and-forget join (errors handled by initializeMeeting)
    joinMeetingRoom().catch(err => console.warn('joinMeetingRoom (onopen) failed:', err))
  }
}

      ws.onmessage = (event) => {
        try {
          if (!event.data) return
          const parsed = typeof event.data === 'string' ? JSON.parse(event.data) : event.data
          handleSignalingMessage(parsed)
        } catch (parseErr) {
          console.error('Failed to parse signaling message:', parseErr, 'raw:', event.data)
        }
      }

      ws.onerror = (errorEvent) => {
        // errorEvent is often an Event object with little details, so surface readyState and url
        try {
          console.error('WebSocket error:', errorEvent, {
            readyState: ws.readyState,
            url: (ws as any).url || wsUrl
          })
        } catch (logErr) {
          console.error('WebSocket error and failed to log details:', errorEvent, logErr)
        }
        // reject with a helpful message
        reject(new Error('WebSocket connection error'))
      }

     ws.onclose = (ev) => {
  console.warn('WebSocket closed:', { code: ev.code, reason: ev.reason, wasClean: ev.wasClean })
  setIsConnected(false)
  hasJoinedRef.current = false
  // existing rejection condition stays
  if (ev.code !== 1000 && ws.readyState !== WebSocket.OPEN) {
    reject(new Error(`WebSocket closed prematurely: ${ev.code} ${ev.reason}`))
  }
}


    } catch (err) {
      console.error('connectToSignaling unexpected error:', err)
      reject(err)
    }
  })
}


  // ---- add this helper directly ABOVE joinMeetingRoom ----
const waitForWsOpen = (ws: WebSocket | null, timeout = 12000) =>
  new Promise<void>((resolve, reject) => {
    if (!ws) return reject(new Error('No WebSocket instance'));
    if (ws.readyState === WebSocket.OPEN) return resolve();

    const onOpen = () => {
      cleanup();
      resolve();
    };
    const onClose = (ev?: CloseEvent) => {
      cleanup();
      reject(new Error(`WebSocket closed while connecting: code=${ev?.code} reason=${ev?.reason}`));
    };
    const onError = () => {
      cleanup();
      reject(new Error('WebSocket error while connecting'));
    };

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('WebSocket open timeout'));
    }, timeout);

    function cleanup() {
      clearTimeout(timer);
      try {
        ws.removeEventListener('open', onOpen);
        ws.removeEventListener('close', onClose);
        ws.removeEventListener('error', onError);
      } catch (e) {
        // ignore removal errors
      }
    }

    ws.addEventListener('open', onOpen);
    ws.addEventListener('close', onClose);
    ws.addEventListener('error', onError);
  });

// ---- replace entire joinMeetingRoom function with this ----
const joinMeetingRoom = async () => {
  if (!user) {
    console.error('joinMeetingRoom: missing user')
    throw new Error('Missing user info')
  }
  if (!wsRef.current) {
    console.error('joinMeetingRoom: wsRef not available (signaling not connected)')
    throw new Error('Signaling WebSocket not connected')
  }

  if (hasJoinedRef.current) {
    console.debug('joinMeetingRoom: already joined, skipping')
    return
  }

  const joinMessage = {
    type: 'join_meeting',
    meeting_id: meetingId,
    participant: {
      id: user.id,
      name: user.email?.split('@')[0] || 'User',
      type: 'human'
    }
  }

  try {
    await waitForWsOpen(wsRef.current, 12000)
    if (wsRef.current.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not open after waiting')
    }

    wsRef.current.send(JSON.stringify(joinMessage))
    hasJoinedRef.current = true
    setMeetingStatus('active')

    // Notify backend to mark meeting active and trigger AI auto-join
    if (access_token) {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? `${window.location.origin.replace(/^http/,'http')}` : '')
      // fire-and-forget
      fetch(`${apiBase}/scheduled-meetings/${meetingId}/start`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${access_token}` },
      }).catch(() => {})
      fetch(`${apiBase}/scheduled-meetings/${meetingId}/ai-join`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${access_token}` },
      }).catch(() => {})
    }
  } catch (err) {
    console.error('Failed to send join message:', err)
    throw err
  }
}



  const handleSignalingMessage = async (message: any) => {
    switch (message.type) {
      case 'participant_joined':
        handleParticipantJoined(message.participant)
        break
      case 'participant_left':
        handleParticipantLeft(message.participant_id)
        break
      case 'participant_updated':
        handleParticipantUpdated(message.participant)
        break
      case 'message':
        handleNewMessage(message.message)
        break
      case 'meeting_ended':
        handleMeetingEnded(message.analysis)
        break
      case 'offer':
        await handleOffer(message)
        break
      case 'answer':
        await handleAnswer(message)
        break
      case 'ice': // backend uses 'ice'
      case 'ice_candidate': // accept legacy/client form
        await handleIceCandidate(message)
        break
      case 'ai_joined':
        // show AI presence in participants list
        handleParticipantJoined({
          id: 'ai-assistant',
          name: 'AI Assistant',
          type: 'ai',
          isConnected: true,
          isMuted: false,
          isSpeaking: false,
          audioLevel: 0,
          joinedAt: new Date().toISOString(),
        } as any)
        break
      case 'ai_message':
        handleNewMessage({
          id: crypto.randomUUID(),
          speaker_id: 'ai-assistant',
          speaker_type: 'ai',
          message: message.message,
          timestamp: new Date().toISOString(),
        })
        break
      case 'ai_voice_message':
        // queue and play audio; also append text to transcript
        if (typeof message.audio_data === 'string' && message.audio_data.length > 0) {
          enqueueAiAudio(message.audio_data, message.audio_format || 'mp3')
        }
        handleNewMessage({
          id: crypto.randomUUID(),
          speaker_id: 'ai-assistant',
          speaker_type: 'ai',
          message: message.message,
          timestamp: new Date().toISOString(),
        })
        break
    }
  }

  const handleParticipantJoined = (participant: Participant) => {
    setParticipants(prev => {
      const exists = prev.find(p => p.id === participant.id)
      if (exists) return prev
      return [...prev, { ...participant, audioLevel: 0 }]
    })
    
    // Create peer connection for new participant
    if (participant.type === 'human' && participant.id !== user?.id) {
      createPeerConnection(participant.id)
    }
  }

  const handleParticipantLeft = (participantId: string) => {
    setParticipants(prev => prev.filter(p => p.id !== participantId))
    
    // Clean up peer connection
    const peerConnection = peerConnectionsRef.current.get(participantId)
    if (peerConnection) {
      peerConnection.close()
      peerConnectionsRef.current.delete(participantId)
    }
  }

  const handleParticipantUpdated = (participant: Participant) => {
    setParticipants(prev => 
      prev.map(p => p.id === participant.id ? { ...p, ...participant } : p)
    )
  }

  const handleNewMessage = (message: MeetingMessage) => {
    setMessages(prev => [...prev, message])
  }

  const handleMeetingEnded = (analysis: any) => {
    setMeetingStatus('ended')
    if (onMeetingEnd) {
      onMeetingEnd(analysis)
    }
  }

  const createPeerConnection = async (participantId: string) => {
    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    })
    
    // Add local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStreamRef.current!)
      })
    }
    
    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && wsRef.current) {
        wsRef.current.send(JSON.stringify({
          type: 'ice', // align with backend
          candidate: event.candidate,
          target_participant: participantId
        }))
      }
    }
    
    // Handle remote stream
    peerConnection.ontrack = (event) => {
      console.log('Received remote stream from:', participantId)
      // Handle remote audio stream
    }
    
    peerConnectionsRef.current.set(participantId, peerConnection)
    return peerConnection
  }

  const handleOffer = async (message: any) => {
    const peerConnection = await createPeerConnection(message.from)
    // accept either message.offer or message.sdp
    const remoteDesc = message.offer || message.sdp
    await peerConnection.setRemoteDescription(remoteDesc)
    const answer = await peerConnection.createAnswer()
    await peerConnection.setLocalDescription(answer)
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({
        type: 'answer',
        answer: answer,
        target_participant: message.from
      }))
    }
  }

  const handleAnswer = async (message: any) => {
    const peerConnection = peerConnectionsRef.current.get(message.from)
    if (peerConnection) {
      await peerConnection.setRemoteDescription(message.answer)
    }
  }

  const handleIceCandidate = async (message: any) => {
    const peerConnection = peerConnectionsRef.current.get(message.from)
    if (peerConnection) {
      const candidate = message.candidate || message.ice || message
      await peerConnection.addIceCandidate(candidate)
    }
  }

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsMuted(!audioTrack.enabled)
        
        // Notify other participants
        if (wsRef.current) {
          wsRef.current.send(JSON.stringify({
            type: 'participant_update',
            updates: { isMuted: !audioTrack.enabled }
          }))
        }
      }
    }
  }

  const toggleListening = () => {
    if (!recognitionRef.current) return
    
    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      recognitionRef.current.start()
      setIsListening(true)
    }
  }

  const sendMessage = (message: string) => {
    if (!wsRef.current || !user) return
    
    const messageData = {
      type: 'send_message',
      message: {
        speaker_id: user.id,
        speaker_type: 'human',
        message: message,
        timestamp: new Date().toISOString()
      }
    }
    
    wsRef.current.send(JSON.stringify(messageData))
  }

  const leaveMeeting = () => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({
        type: 'leave_meeting'
      }))
    }
    cleanup()
    if (onClose) {
      onClose()
    }
  }

  const cleanup = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop())
    }
    
    peerConnectionsRef.current.forEach(pc => pc.close())
    peerConnectionsRef.current.clear()
    
    if (audioContextRef.current) {
      try {
        if ((audioContextRef.current as any).state !== 'closed') {
          audioContextRef.current.close()
        }
      } catch {}
    }
    
    if (wsRef.current) {
      try {
        if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
          wsRef.current.close()
        }
      } catch {}
    }
    
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch {}
    }
  }

  // Simple FIFO queue to ensure AI audio plays sequentially
  const enqueueAiAudio = (base64Audio: string, format: string = 'mp3') => {
    audioPlaybackQueueRef.current.push(`data:audio/${format};base64,${base64Audio}`)
    if (!isPlayingRef.current) {
      void playNextAiAudio()
    }
  }

  const playNextAiAudio = async () => {
    if (isPlayingRef.current) return
    const next = audioPlaybackQueueRef.current.shift()
    if (!next) return

    isPlayingRef.current = true
    try {
      if (!audioElementRef.current) {
        audioElementRef.current = new Audio()
      }
      const el = audioElementRef.current
      el.src = next
      el.onended = () => {
        isPlayingRef.current = false
        void playNextAiAudio()
      }
      el.onerror = () => {
        isPlayingRef.current = false
        void playNextAiAudio()
      }
      // Attempt to play; may be blocked until user gesture
      await el.play()
    } catch (e) {
      // Likely NotAllowedError due to autoplay policy
      setAudioPermissionNeeded(true)
      isPlayingRef.current = false
    }
  }

  const enableAudioPlayback = async () => {
    try {
      if (!audioElementRef.current) {
        audioElementRef.current = new Audio()
      }
      // Try playing a short silent buffer to satisfy gesture requirements
      const element = audioElementRef.current
      element.muted = true
      element.src = 'data:audio/mp3;base64,//uQZAAAAAAAAAAAAAAAAAAAA' // tiny/silent
      await element.play().catch(() => {})
      element.pause()
      element.muted = false
      setAudioPermissionNeeded(false)
      // resume any queued audio
      if (!isPlayingRef.current) void playNextAiAudio()
    } catch (e) {
      // keep the button visible
      setAudioPermissionNeeded(true)
    }
  }

  if (loading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin mr-2" />
          <span>Connecting to meeting...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4">
      {/* Meeting Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                AI Meeting Room
                <Badge variant={meetingStatus === 'active' ? 'default' : 'secondary'}>
                  {meetingStatus}
                </Badge>
                {isConnected && (
                  <Badge variant="outline" className="text-green-600">
                    <Activity className="w-3 h-3 mr-1" />
                    Connected
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Room ID: {roomId} • {participants.length} participants
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowParticipants(!showParticipants)}
              >
                <Users className="w-4 h-4 mr-1" />
                Participants
              </Button>
              <Button variant="destructive" onClick={leaveMeeting}>
                <PhoneOff className="w-4 h-4 mr-1" />
                Leave
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Meeting Area */}
        <div className="lg:col-span-2 space-y-4">
          {/* Audio Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Voice Controls</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <Button
                  onClick={toggleMute}
                  variant={isMuted ? "destructive" : "default"}
                  size="lg"
                >
                  {isMuted ? (
                    <>
                      <MicOff className="w-5 h-5 mr-2" />
                      Unmute
                    </>
                  ) : (
                    <>
                      <Mic className="w-5 h-5 mr-2" />
                      Mute
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={toggleListening}
                  variant={isListening ? "destructive" : "outline"}
                  size="lg"
                  disabled={isMuted}
                >
                  {isListening ? (
                    <>
                      <MicOff className="w-5 h-5 mr-2" />
                      Stop Listening
                    </>
                  ) : (
                    <>
                      <Mic className="w-5 h-5 mr-2" />
                      Start Speaking
                    </>
                  )}
                </Button>
                {audioPermissionNeeded && (
                  <Button
                    onClick={enableAudioPlayback}
                    variant="outline"
                    size="lg"
                  >
                    Enable Audio
                  </Button>
                )}
              </div>
              
              {/* Audio Level Indicator */}
              {isConnected && !isMuted && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Audio Level:</span>
                    <Progress value={audioLevel * 100} className="flex-1 max-w-xs" />
                    {voiceActivityDetected && (
                      <Badge variant="outline" className="text-green-600">
                        Speaking
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Conversation Transcript */}
          {showTranscript && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Live Transcript
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTranscript(!showTranscript)}
                  >
                    Hide
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {messages.map((message) => {
                    const participant = participants.find(p => p.id === message.speaker_id)
                    const isAI = message.speaker_type === 'ai'
                    
                    return (
                      <div key={message.id} className={`flex gap-3 ${isAI ? 'justify-start' : 'justify-end'}`}>
                        <div className={`flex gap-3 max-w-[80%] ${isAI ? 'flex-row' : 'flex-row-reverse'}`}>
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className={isAI ? 'bg-blue-100 text-blue-600' : 'bg-gray-100'}>
                              {isAI ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                            </AvatarFallback>
                          </Avatar>
                          <div className={`rounded-lg p-3 ${
                            isAI 
                              ? 'bg-blue-50 border border-blue-200' 
                              : 'bg-gray-50 border border-gray-200'
                          }`}>
                            <div className="text-xs text-muted-foreground mb-1">
                              {participant?.name || (isAI ? 'AI Assistant' : 'User')}
                            </div>
                            <p className="text-sm">{message.message}</p>
                            <div className="text-xs text-muted-foreground mt-1">
                              {new Date(message.timestamp).toLocaleTimeString()}
                              {message.confidence && (
                                <span className="ml-2">• {Math.round(message.confidence * 100)}% confidence</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Participants Panel */}
        {showParticipants && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Participants ({participants.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* --- Participants list (AI first, safe keys) --- */}
{(() => {
  // create a sorted copy so AI participants appear first
  const sortedParticipants = Array.isArray(participants)
    ? [...participants].sort((a, b) => {
        if (a?.type === "ai" && b?.type !== "ai") return -1;
        if (b?.type === "ai" && a?.type !== "ai") return 1;
        return 0;
      })
    : [];

  return (
    <div className="space-y-3">
      {sortedParticipants.map((participant, index) => {
        // robust key: prefer id, otherwise fallback to a stable combination
        const key =
          (participant && participant.id) ||
          `${(participant?.name ?? "participant").replace(/\s+/g, "-")}-${index}`;

        const displayName = participant?.name ?? (participant?.type === "ai" ? "AI" : "Participant");
        const audioLevel = typeof participant?.audioLevel === "number" ? participant.audioLevel : 0;

        return (
          <div key={key} className="flex items-center gap-3 p-2 rounded-md border">
            <Avatar className="w-8 h-8">
              <AvatarFallback
                className={
                  participant?.type === "ai" ? "bg-blue-100 text-blue-600" : "bg-gray-100"
                }
              >
                {participant?.type === "ai" ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">{displayName}</span>
                <Badge variant="outline" className="text-xs px-2 py-0.5">
                  {participant?.type ?? "unknown"}
                </Badge>
              </div>

              <div className="flex items-center gap-2 mt-1">
                {participant?.isConnected ? (
                  <Badge variant="outline" className="text-green-600 text-xs">
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-gray-500 text-xs">
                    Disconnected
                  </Badge>
                )}

                {participant?.isMuted && <MicOff className="w-3 h-3 text-red-500" />}

                {participant?.isSpeaking && (
                  <div className="flex items-center gap-1">
                    <Volume2 className="w-3 h-3 text-green-500" />
                    <Progress value={Math.max(0, Math.min(100, audioLevel * 100))} className="w-8 h-1" />
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
                })()}

              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}