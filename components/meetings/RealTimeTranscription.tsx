"use client"

import React, { useState, useEffect, useRef } from 'react'
import { transcriptionService, TranscriptionChunk } from '@/lib/services/transcription'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Mic, MicOff, Download, Search, Volume2, VolumeX } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface TranscriptEntry {
  id: string
  timestamp: string
  speaker: string
  text: string
  confidence?: number
  isFinal: boolean
}

interface RealTimeTranscriptionProps {
  meetingId: string
  isActive: boolean
  onTranscriptUpdate?: (entries: TranscriptEntry[]) => void
  showControls?: boolean
  autoStart?: boolean
}

export default function RealTimeTranscription({
  meetingId,
  isActive,
  onTranscriptUpdate,
  showControls = true,
  autoStart = false
}: RealTimeTranscriptionProps) {
  const [transcriptEntries, setTranscriptEntries] = useState<TranscriptEntry[]>([])
  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string>('idle')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPartialText, setCurrentPartialText] = useState('')
  const [confidence, setConfidence] = useState(0)
  const [isMuted, setIsMuted] = useState(false)

  const transcriptRef = useRef<HTMLDivElement>(null)
  const partialTextRef = useRef<string>('')

  useEffect(() => {
    // Check if transcription is supported
    setIsSupported(transcriptionService.isSupported())

    // Set up event listeners
    transcriptionService.onTranscript(handleTranscriptChunk)
    transcriptionService.onError(handleError)
    transcriptionService.onStatusChange(handleStatusChange)

    // Auto-start if requested and meeting is active
    if (autoStart && isActive && transcriptionService.isSupported()) {
      startTranscription()
    }

    return () => {
      // Cleanup
      if (transcriptionService.getSession()) {
        transcriptionService.endSession()
      }
    }
  }, [meetingId, isActive, autoStart])

  useEffect(() => {
    // Auto-scroll to bottom when new entries are added
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight
    }
  }, [transcriptEntries, currentPartialText])

  useEffect(() => {
    // Notify parent of transcript updates
    onTranscriptUpdate?.(transcriptEntries)
  }, [transcriptEntries, onTranscriptUpdate])

  const handleTranscriptChunk = async (chunk: TranscriptionChunk) => {
    if (isMuted) return

    if (chunk.isFinal) {
      // Final transcription - add to entries
      const newEntry: TranscriptEntry = {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: new Date().toISOString(),
        speaker: 'You',
        text: chunk.text.trim(),
        confidence: chunk.confidence,
        isFinal: true
      }

      if (newEntry.text.length > 0) {
        setTranscriptEntries(prev => [...prev, newEntry])
        
        // Process the chunk through the API
        await transcriptionService.processTranscriptChunk(chunk)
      }

      // Clear partial text
      setCurrentPartialText('')
      partialTextRef.current = ''
    } else {
      // Interim result - update partial text
      setCurrentPartialText(chunk.text)
      setConfidence(chunk.confidence)
      partialTextRef.current = chunk.text
    }
  }

  const handleError = (error: string) => {
    setError(error)
    setIsListening(false)
    setStatus('error')
  }

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus)
    setIsListening(newStatus === 'listening')
  }

  const startTranscription = async () => {
    if (!isSupported) {
      setError('Speech recognition is not supported in this browser')
      return
    }

    try {
      setError(null)
      const session = await transcriptionService.startSession(meetingId)
      
      if (session) {
        const started = await transcriptionService.startListening()
        if (started) {
          setIsListening(true)
          setStatus('listening')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start transcription')
    }
  }

  const stopTranscription = async () => {
    transcriptionService.stopListening()
    await transcriptionService.endSession()
    setIsListening(false)
    setStatus('stopped')
    setCurrentPartialText('')
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  const exportTranscript = () => {
    const transcript = transcriptEntries
      .map(entry => `[${new Date(entry.timestamp).toLocaleTimeString()}] ${entry.speaker}: ${entry.text}`)
      .join('\n')

    const blob = new Blob([transcript], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `meeting-transcript-${meetingId}-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const filteredEntries = transcriptEntries.filter(entry =>
    searchQuery === '' || entry.text.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusColor = () => {
    switch (status) {
      case 'listening': return 'bg-green-500'
      case 'error': return 'bg-red-500'
      case 'stopped': return 'bg-gray-500'
      default: return 'bg-yellow-500'
    }
  }

  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.8) return 'text-green-600'
    if (conf >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (!isSupported) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">
            Speech recognition is not supported in this browser.
            Please use Chrome, Edge, or Safari for real-time transcription.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            Real-Time Transcription
            <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
            <Badge variant="outline" className="text-xs">
              {status}
            </Badge>
          </CardTitle>
          
          {showControls && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleMute}
                className="p-2"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={exportTranscript}
                disabled={transcriptEntries.length === 0}
                className="p-2"
              >
                <Download className="w-4 h-4" />
              </Button>
              
              <Button
                variant={isListening ? "destructive" : "default"}
                size="sm"
                onClick={isListening ? stopTranscription : startTranscription}
                disabled={!isActive}
              >
                {isListening ? (
                  <>
                    <MicOff className="w-4 h-4 mr-2" />
                    Stop
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4 mr-2" />
                    Start
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 mt-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search transcript..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Badge variant="secondary" className="text-xs">
            {filteredEntries.length} / {transcriptEntries.length}
          </Badge>
        </div>

        {error && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0">
        <div
          ref={transcriptRef}
          className="h-full overflow-y-auto p-4 space-y-3"
        >
          {filteredEntries.length === 0 && searchQuery === '' && (
            <div className="text-center text-gray-500 py-8">
              {isListening ? 'Listening for speech...' : 'No transcript available yet'}
            </div>
          )}

          {filteredEntries.length === 0 && searchQuery !== '' && (
            <div className="text-center text-gray-500 py-8">
              No results found for "{searchQuery}"
            </div>
          )}

          {filteredEntries.map((entry) => (
            <div
              key={entry.id}
              className="flex flex-col gap-1 p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span className="font-medium">{entry.speaker}</span>
                <div className="flex items-center gap-2">
                  <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                  {entry.confidence !== undefined && (
                    <span className={`font-medium ${getConfidenceColor(entry.confidence)}`}>
                      {Math.round(entry.confidence * 100)}%
                    </span>
                  )}
                </div>
              </div>
              <p className="text-sm leading-relaxed">{entry.text}</p>
            </div>
          ))}

          {/* Partial/interim text */}
          {currentPartialText && !isMuted && (
            <div className="flex flex-col gap-1 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between text-xs text-blue-600">
                <span className="font-medium">You (speaking...)</span>
                <div className="flex items-center gap-2">
                  <span>{new Date().toLocaleTimeString()}</span>
                  <span className={`font-medium ${getConfidenceColor(confidence)}`}>
                    {Math.round(confidence * 100)}%
                  </span>
                </div>
              </div>
              <p className="text-sm leading-relaxed italic text-blue-800">
                {currentPartialText}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}