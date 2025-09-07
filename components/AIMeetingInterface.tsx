"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  RotateCcw, 
  CheckCircle, 
  AlertCircle,
  Bot,
  User,
  Loader2
} from "lucide-react"
import { useUser } from "@/hooks/useUser"

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

interface AIMeetingInterfaceProps {
  leadId: string
  onComplete?: (analysis: any) => void
  onClose?: () => void
}

export default function AIMeetingInterface({ leadId, onComplete, onClose }: AIMeetingInterfaceProps) {
  const { user, access_token } = useUser()
  const [aiMeeting, setAIMeeting] = useState<AIMeetingData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [currentTranscript, setCurrentTranscript] = useState("")
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([])
  const [meetingStatus, setMeetingStatus] = useState<'pending' | 'active' | 'completed'>('pending')
  
  // Speech recognition and synthesis refs
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null)
  const [speechSupported, setSpeechSupported] = useState(false)

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (SpeechRecognition && window.speechSynthesis) {
        setSpeechSupported(true)
        
        const recognition = new SpeechRecognition()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = 'en-US'
        
        recognition.onresult = (event) => {
          let finalTranscript = ''
          let interimTranscript = ''
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript
            if (event.results[i].isFinal) {
              finalTranscript += transcript
            } else {
              interimTranscript += transcript
            }
          }
          
          if (finalTranscript) {
            setCurrentTranscript(finalTranscript)
            handleUserResponse(finalTranscript)
            setIsListening(false)
          } else {
            setCurrentTranscript(interimTranscript)
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
    }
  }, [])

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

  // Start AI meeting
  const startAIMeeting = async () => {
    if (!aiMeeting || !access_token) return
    
    setLoading(true)
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ai-meetings/${aiMeeting.ai_meeting_id}/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setMeetingStatus('active')
        
        // Add first question to conversation
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
      // Add user message to conversation
      const userMessage: ConversationMessage = {
        speaker: 'user',
        message: message,
        timestamp: new Date().toISOString()
      }
      setConversationHistory(prev => [...prev, userMessage])
      
      // Send to backend
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
        
        // Add AI response to conversation
        const aiMessage: ConversationMessage = {
          speaker: 'ai',
          message: data.ai_response,
          timestamp: new Date().toISOString()
        }
        setConversationHistory(prev => [...prev, aiMessage])
        
        // Speak AI response
        speakMessage(data.ai_response)
        
        // Check if meeting is completed
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
      setCurrentTranscript("")
    }
  }

  // Text-to-speech function
  const speakMessage = (message: string) => {
    if (!speechSupported || !window.speechSynthesis) return
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel()
    
    const utterance = new SpeechSynthesisUtterance(message)
    utterance.rate = 0.9
    utterance.pitch = 1
    utterance.volume = 1
    
    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)
    
    synthesisRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }

  // Start/stop listening
  const toggleListening = () => {
    if (!speechSupported || !recognitionRef.current) {
      setError('Speech recognition not supported in this browser')
      return
    }
    
    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      setCurrentTranscript("")
      recognitionRef.current.start()
      setIsListening(true)
    }
  }

  // Stop speaking
  const stopSpeaking = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
    }
  }

  // Manual text input
  const handleManualSubmit = () => {
    if (currentTranscript.trim()) {
      handleUserResponse(currentTranscript.trim())
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

  if (error && !aiMeeting) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={createAIMeeting} className="mt-4">
            Try Again
          </Button>
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

      {/* Speech Controls */}
      {speechSupported && meetingStatus === 'active' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Voice Controls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Button
                onClick={toggleListening}
                variant={isListening ? "destructive" : "default"}
                size="lg"
                disabled={loading}
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
              
              {isSpeaking && (
                <Button onClick={stopSpeaking} variant="outline">
                  <VolumeX className="w-5 h-5 mr-2" />
                  Stop AI Voice
                </Button>
              )}
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {isListening && <span className="text-green-600">🎤 Listening...</span>}
                {isSpeaking && <span className="text-blue-600">🔊 AI Speaking...</span>}
              </div>
            </div>
            
            {/* Current transcript */}
            {currentTranscript && (
              <div className="mt-4">
                <label className="text-sm font-medium">Your response:</label>
                <Textarea
                  value={currentTranscript}
                  onChange={(e) => setCurrentTranscript(e.target.value)}
                  placeholder="Your response will appear here..."
                  className="mt-2"
                />
                <Button 
                  onClick={handleManualSubmit} 
                  className="mt-2"
                  disabled={!currentTranscript.trim() || loading}
                >
                  Send Response
                </Button>
              </div>
            )}
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
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      message.speaker === 'ai' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {message.speaker === 'ai' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    </div>
                    <div className={`rounded-lg p-3 ${
                      message.speaker === 'ai' 
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

      {/* Browser Support Warning */}
      {!speechSupported && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Voice features require a modern browser with speech recognition support. 
            You can still participate using text input.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}