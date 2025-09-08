"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Phone,
  PhoneOff,
  Settings,
  CheckCircle,
  AlertCircle,
  Bot,
  User,
  Loader2,
  Calendar,
  ExternalLink
} from "lucide-react"
import { useUser } from "@/hooks/useUser"
import EnhancedWebRTCMeeting from "./meetings/EnhancedWebRTCMeeting"

interface Lead {
  id: string
  name: string
  company: string
  email: string
  phone: string
  status: string
}

interface ConversationMessage {
  speaker: 'ai' | 'user'
  message: string
  timestamp: string
  audio_duration?: number
}

interface AIMeetingData {
  ai_meeting_id: string
  meeting_id: string
  lead: Lead
  questions: string[]
  status: string
  conversation_history?: ConversationMessage[]
  analysis?: any
}

interface WebRTCAIMeetingProps {
  leadId: string
  onComplete?: (analysis: any) => void
  onClose?: () => void
  meetingId?: string
  roomId?: string
  useEnhanced?: boolean
}

export default function WebRTCAIMeeting({
  leadId,
  onComplete,
  onClose,
  meetingId,
  roomId,
  useEnhanced = false
}: WebRTCAIMeetingProps) {
  const { user, access_token } = useUser()

  // Use enhanced version if requested and we have meeting details
  if (useEnhanced && meetingId && roomId) {
    return (
      <EnhancedWebRTCMeeting
        meetingId={meetingId}
        roomId={roomId}
        onMeetingEnd={onComplete}
        onClose={onClose}
      />
    )
  }

  const [aiMeeting, setAIMeeting] = useState<AIMeetingData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([])
  const [meetingStatus, setMeetingStatus] = useState<'pending' | 'active' | 'completed'>('pending')

  // WebRTC and Audio states
  const [isConnected, setIsConnected] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)

  // Refs for WebRTC and audio
  const localStreamRef = useRef<MediaStream | null>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null)
  const animationFrameRef = useRef<number | undefined>(undefined)

  // WebSocket for signaling
  const wsRef = useRef<WebSocket | null>(null)

  const [speechSupported, setSpeechSupported] = useState(false)
  const [webRTCSupported, setWebRTCSupported] = useState(false)

  // Initialize WebRTC and Speech APIs
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check WebRTC support
      setWebRTCSupported(!!(window.RTCPeerConnection && navigator.mediaDevices))

      // Check Speech API support
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      setSpeechSupported(!!(SpeechRecognition && window.speechSynthesis))

      if (SpeechRecognition) {
        initializeSpeechRecognition()
      }
    }

    return () => {
      cleanup()
    }
  }, [])

  const initializeSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
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
        handleUserResponse(finalTranscript.trim())
        setIsListening(false)
      }
    }

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error)
      setIsListening(false)
      setError('Speech recognition error. Please try again.')
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition
  }

  // Initialize WebRTC
  const initializeWebRTC = async () => {
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      })

      localStreamRef.current = stream

      // Setup audio analysis for visual feedback
      setupAudioAnalysis(stream)

      // Create peer connection
      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      })

      // Add local stream to peer connection
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream)
      })

      peerConnectionRef.current = peerConnection
      setIsConnected(true)

    } catch (error) {
      console.error('Failed to initialize WebRTC:', error)
      setError('Failed to access microphone. Please check permissions.')
    }
  }

  // Setup audio analysis for visual feedback
  const setupAudioAnalysis = (stream: MediaStream) => {
    try {
      const audioContext = new AudioContext()
      const analyser = audioContext.createAnalyser()
      const source = audioContext.createMediaStreamSource(stream)

      analyser.fftSize = 256
      source.connect(analyser)

      audioContextRef.current = audioContext
      analyserRef.current = analyser

      // Start audio level monitoring
      monitorAudioLevel()

    } catch (error) {
      console.error('Failed to setup audio analysis:', error)
    }
  }

  // Monitor audio level for visual feedback
  const monitorAudioLevel = () => {
    if (!analyserRef.current) return

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)

    const updateLevel = () => {
      if (analyserRef.current && !isMuted) {
        analyserRef.current.getByteFrequencyData(dataArray)
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length
        setAudioLevel(average / 255) // Normalize to 0-1
      } else {
        setAudioLevel(0)
      }

      animationFrameRef.current = requestAnimationFrame(updateLevel)
    }

    updateLevel()
  }

  // Cleanup function
  const cleanup = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop())
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
    }

    if (audioContextRef.current) {
      audioContextRef.current.close()
    }

    if (wsRef.current) {
      wsRef.current.close()
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }

    if (window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
  }

  // Toggle microphone mute
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsMuted(!audioTrack.enabled)
      }
    }
  }

  // Start/stop voice recording
  const toggleVoiceRecording = () => {
    if (!speechSupported || !recognitionRef.current) {
      setError('Speech recognition not supported')
      return
    }

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      recognitionRef.current.start()
      setIsListening(true)
    }
  }

  // Text-to-speech with better voice
  const speakMessage = (message: string) => {
    if (!speechSupported || !window.speechSynthesis) return

    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(message)

    // Try to use a better voice
    const voices = window.speechSynthesis.getVoices()
    const preferredVoice = voices.find(voice =>
      voice.name.includes('Google') ||
      voice.name.includes('Microsoft') ||
      voice.lang.startsWith('en')
    )

    if (preferredVoice) {
      utterance.voice = preferredVoice
    }

    utterance.rate = 0.9
    utterance.pitch = 1
    utterance.volume = 1

    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)

    synthesisRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }

  // Create AI meeting
  const createAIMeeting = async () => {
    if (!access_token) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ai-meetings/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${access_token}`
        },
        body: JSON.stringify({ lead_id: leadId })
      })

      if (response.ok) {
        const data = await response.json()
        setAIMeeting(data)
        setMeetingStatus('pending')
      } else {
        const errorData = await response.json()
        setError(errorData.detail || 'Failed to create AI meeting')
      }
    } catch (err) {
      setError('Failed to create AI meeting')
    } finally {
      setLoading(false)
    }
  }

  // Start AI meeting with WebRTC
  const startAIMeeting = async () => {
    if (!aiMeeting || !access_token) return

    setLoading(true)

    try {
      // Initialize WebRTC first
      if (webRTCSupported) {
        await initializeWebRTC()
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ai-meetings/${aiMeeting.ai_meeting_id}/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setMeetingStatus('active')

        const firstMessage: ConversationMessage = {
          speaker: 'ai',
          message: data.first_question,
          timestamp: new Date().toISOString()
        }
        setConversationHistory([firstMessage])

        // Speak the first question
        speakMessage(data.first_question)
      } else {
        const errorData = await response.json()
        setError(errorData.detail || 'Failed to start AI meeting')
      }
    } catch (err) {
      setError('Failed to start AI meeting')
    } finally {
      setLoading(false)
    }
  }

  // Handle user response
  const handleUserResponse = async (message: string) => {
    if (!aiMeeting || !access_token || meetingStatus !== 'active') return

    setLoading(true)

    try {
      const userMessage: ConversationMessage = {
        speaker: 'user',
        message: message,
        timestamp: new Date().toISOString()
      }
      setConversationHistory(prev => [...prev, userMessage])

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ai-meetings/${aiMeeting.ai_meeting_id}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${access_token}`
        },
        body: JSON.stringify({
          message: message,
          speaker: 'user'
        })
      })

      if (response.ok) {
        const data = await response.json()

        const aiMessage: ConversationMessage = {
          speaker: 'ai',
          message: data.ai_response,
          timestamp: new Date().toISOString()
        }
        setConversationHistory(prev => [...prev, aiMessage])

        // Speak AI response
        speakMessage(data.ai_response)

        if (data.conversation_complete) {
          setMeetingStatus('completed')
          if (onComplete && data.analysis) {
            onComplete(data.analysis)
          }
        }
      } else {
        const errorData = await response.json()
        setError(errorData.detail || 'Failed to process response')
      }
    } catch (err) {
      setError('Failed to process response')
    } finally {
      setLoading(false)
    }
  }

  // Initialize meeting on component mount
  useEffect(() => {
    createAIMeeting()
  }, [leadId])

  if (loading && !aiMeeting) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin mr-2" />
          <span>Setting up AI meeting...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Meeting Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-6 h-6 text-blue-600" />
                AI Discovery Meeting
                <Badge variant={meetingStatus === 'completed' ? 'default' : 'secondary'}>
                  {meetingStatus}
                </Badge>
                {isConnected && (
                  <Badge variant="outline" className="text-green-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse" />
                    Connected
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Lead: {aiMeeting?.lead.name} from {aiMeeting?.lead.company}
              </CardDescription>
            </div>
            {onClose && (
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* WebRTC Audio Controls */}
      {meetingStatus === 'active' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Voice Controls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              {/* Microphone Toggle */}
              <Button
                onClick={toggleMute}
                variant={isMuted ? "destructive" : "default"}
                size="lg"
                disabled={!isConnected}
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

              {/* Voice Recording Toggle */}
              <Button
                onClick={toggleVoiceRecording}
                variant={isListening ? "destructive" : "outline"}
                size="lg"
                disabled={!speechSupported || isMuted}
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

              {/* Stop AI Speaking */}
              {isSpeaking && (
                <Button
                  onClick={() => window.speechSynthesis?.cancel()}
                  variant="outline"
                >
                  <VolumeX className="w-5 h-5 mr-2" />
                  Stop AI
                </Button>
              )}
            </div>

            {/* Audio Level Indicator */}
            {isConnected && !isMuted && (
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm text-muted-foreground">Audio Level:</span>
                <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-xs">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all duration-100"
                    style={{ width: `${audioLevel * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Status Indicators */}
            <div className="flex items-center gap-4 text-sm">
              {isListening && (
                <div className="flex items-center gap-1 text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  Listening...
                </div>
              )}
              {isSpeaking && (
                <div className="flex items-center gap-1 text-blue-600">
                  <Volume2 className="w-4 h-4" />
                  AI Speaking...
                </div>
              )}
              {isMuted && (
                <div className="flex items-center gap-1 text-red-600">
                  <MicOff className="w-4 h-4" />
                  Microphone Muted
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Meeting Status */}
      {meetingStatus === 'pending' && aiMeeting && (
        <Card>
          <CardContent className="py-8 text-center">
            <Bot className="w-16 h-16 mx-auto text-blue-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Ready to Start AI Meeting</h3>
            <p className="text-muted-foreground mb-4">
              The AI will ask {aiMeeting.questions.length} questions about {aiMeeting.lead.name} to better understand their needs.
            </p>
            {webRTCSupported && (
              <p className="text-sm text-muted-foreground mb-4">
                🎤 WebRTC voice communication will be enabled for real-time conversation.
              </p>
            )}
            <Button onClick={startAIMeeting} size="lg" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2" />
                  Start Meeting
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Conversation History */}
      {conversationHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Conversation</CardTitle>
            <CardDescription>
              {meetingStatus === 'active'
                ? `${conversationHistory.filter(m => m.speaker === 'ai').length} of ${aiMeeting?.questions.length || 0} questions asked`
                : 'Meeting completed'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {conversationHistory.map((message, index) => (
                <div key={index} className={`flex gap-3 ${message.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex gap-3 max-w-[80%] ${message.speaker === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${message.speaker === 'ai' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                      }`}>
                      {message.speaker === 'ai' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    </div>
                    <div className={`rounded-lg p-3 ${message.speaker === 'ai'
                        ? 'bg-blue-50 border border-blue-200'
                        : 'bg-gray-50 border border-gray-200'
                      }`}>
                      <p className="text-sm">{message.message}</p>
                      <span className="text-xs text-muted-foreground">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Meeting Completed */}
      {meetingStatus === 'completed' && (
        <Card>
          <CardContent className="py-8 text-center">
            <CheckCircle className="w-16 h-16 mx-auto text-green-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Meeting Completed!</h3>
            <p className="text-muted-foreground mb-4">
              The AI has analyzed the conversation and updated the lead information.
            </p>
            {onComplete && (
              <Button onClick={() => onComplete(null)}>
                View Analysis
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Browser Support Warnings */}
      {!webRTCSupported && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            WebRTC is not supported in this browser. Voice features may be limited.
          </AlertDescription>
        </Alert>
      )}

      {!speechSupported && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Speech recognition is not supported in this browser. Please use a modern browser for voice features.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}