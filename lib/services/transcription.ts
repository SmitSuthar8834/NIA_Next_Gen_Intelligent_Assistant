"use client"

export interface TranscriptionConfig {
  sampleRate: number
  language: string
  interimResults: boolean
  maxAlternatives: number
}

export interface TranscriptionChunk {
  text: string
  isFinal: boolean
  confidence: number
  timestamp: number
}

export interface TranscriptionSession {
  sessionId: string
  meetingId: string
  status: 'active' | 'ended' | 'error'
  config: TranscriptionConfig
}

export class BrowserTranscriptionService {
  private recognition: SpeechRecognition | null = null
  private session: TranscriptionSession | null = null
  private isListening = false
  private onTranscriptCallback?: (chunk: TranscriptionChunk) => void
  private onErrorCallback?: (error: string) => void
  private onStatusCallback?: (status: string) => void

  constructor() {
    // Check for browser support
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition()
        this.setupRecognition()
      }
    }
  }

  private setupRecognition() {
    if (!this.recognition) return

    this.recognition.continuous = true
    this.recognition.interimResults = true
    this.recognition.lang = 'en-US'
    this.recognition.maxAlternatives = 1

    this.recognition.onstart = () => {
      this.isListening = true
      this.onStatusCallback?.('listening')
    }

    this.recognition.onend = () => {
      this.isListening = false
      this.onStatusCallback?.('stopped')

      // Auto-restart if session is still active
      if (this.session?.status === 'active') {
        setTimeout(() => {
          this.startListening()
        }, 100)
      }
    }

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error)
      this.onErrorCallback?.(event.error)

      // Handle specific errors
      if (event.error === 'not-allowed') {
        this.onErrorCallback?.('Microphone permission denied')
      } else if (event.error === 'no-speech') {
        // This is normal, just restart
        if (this.session?.status === 'active') {
          this.startListening()
        }
      }
    }

    this.recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const transcript = result[0].transcript
        const confidence = result[0].confidence || 0

        const chunk: TranscriptionChunk = {
          text: transcript,
          isFinal: result.isFinal,
          confidence: confidence,
          timestamp: Date.now()
        }

        this.onTranscriptCallback?.(chunk)
      }
    }
  }

  async startSession(
    meetingId: string,
    config?: Partial<TranscriptionConfig>
  ): Promise<TranscriptionSession | null> {
    try {
      // Request API session
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/real-time-analysis/transcription/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({ meeting_id: meetingId })
      })

      if (!response.ok) {
        throw new Error('Failed to start transcription session')
      }

      const sessionData = await response.json()

      this.session = {
        sessionId: sessionData.session_id,
        meetingId: meetingId,
        status: 'active',
        config: {
          sampleRate: 16000,
          language: 'en-US',
          interimResults: true,
          maxAlternatives: 1,
          ...config
        }
      }

      // Configure recognition with session config
      if (this.recognition) {
        this.recognition.lang = this.session.config.language
        this.recognition.interimResults = this.session.config.interimResults
        this.recognition.maxAlternatives = this.session.config.maxAlternatives
      }

      return this.session

    } catch (error) {
      console.error('Error starting transcription session:', error)
      this.onErrorCallback?.(error instanceof Error ? error.message : 'Unknown error')
      return null
    }
  }

  async startListening(): Promise<boolean> {
    if (!this.recognition || !this.session || this.isListening) {
      return false
    }

    try {
      this.recognition.start()
      return true
    } catch (error) {
      console.error('Error starting speech recognition:', error)
      this.onErrorCallback?.(error instanceof Error ? error.message : 'Failed to start listening')
      return false
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop()
    }
  }

  async endSession(): Promise<boolean> {
    if (!this.session) return false

    try {
      this.stopListening()

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/real-time-analysis/transcription/end/${this.session.sessionId}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        }
      )

      if (response.ok) {
        this.session.status = 'ended'
        this.session = null
        return true
      }

      return false

    } catch (error) {
      console.error('Error ending transcription session:', error)
      return false
    }
  }

  async processTranscriptChunk(chunk: TranscriptionChunk): Promise<boolean> {
    if (!this.session) return false

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/real-time-analysis/transcription/process-chunk`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          },
          body: JSON.stringify({
            session_id: this.session.sessionId,
            transcript_text: chunk.text,
            is_final: chunk.isFinal,
            confidence: chunk.confidence,
            audio_duration_ms: null // Browser API doesn't provide this
          })
        }
      )

      return response.ok

    } catch (error) {
      console.error('Error processing transcript chunk:', error)
      return false
    }
  }

  onTranscript(callback: (chunk: TranscriptionChunk) => void) {
    this.onTranscriptCallback = callback
  }

  onError(callback: (error: string) => void) {
    this.onErrorCallback = callback
  }

  onStatusChange(callback: (status: string) => void) {
    this.onStatusCallback = callback
  }

  isSupported(): boolean {
    return !!this.recognition
  }

  getSession(): TranscriptionSession | null {
    return this.session
  }

  isActive(): boolean {
    return this.session?.status === 'active' && this.isListening
  }
}

// Global instance
export const transcriptionService = new BrowserTranscriptionService()

// Type declarations for browser APIs

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  start(): void
  stop(): void
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null
  onend: ((this: SpeechRecognition, ev: Event) => any) | null
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message: string
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  isFinal: boolean
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

declare var SpeechRecognition: {
  prototype: SpeechRecognition
  new(): SpeechRecognition
}