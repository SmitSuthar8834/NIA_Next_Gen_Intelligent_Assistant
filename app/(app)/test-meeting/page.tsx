"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useUser } from "@/hooks/useUser"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Copy, Video, Users, ArrowRight } from "lucide-react"

export default function TestMeetingPage() {
  const { user } = useUser()
  const router = useRouter()
  const [roomId, setRoomId] = useState("")
  const [generatedRoomId, setGeneratedRoomId] = useState("")
  const [copied, setCopied] = useState(false)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      router.push('/login?redirect=' + encodeURIComponent('/test-meeting'))
    }
  }, [user, router])

  if (!user) {
    return (
      <div className="container mx-auto py-8 text-center">
        <p>Redirecting to login...</p>
      </div>
    )
  }

  const generateRoomId = () => {
    const id = Math.random().toString(36).substr(2, 8).toUpperCase()
    setGeneratedRoomId(id)
    setRoomId(id)
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const joinMeeting = () => {
    if (roomId) {
      window.open(`/meeting/${roomId}`, '_blank')
    }
  }

  const getMeetingUrl = () => {
    return `${window.location.origin}/meeting/${roomId}`
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Meeting Test Page</h1>
        <p className="text-muted-foreground">
          Generate test meeting rooms for multi-user testing
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {/* Generate Meeting */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="w-5 h-5" />
              Create Test Meeting
            </CardTitle>
            <CardDescription>
              Generate a new meeting room for testing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={generateRoomId} className="w-full">
              Generate New Room ID
            </Button>
            
            {generatedRoomId && (
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm font-medium mb-2">Generated Room ID:</div>
                <div className="font-mono text-lg">{generatedRoomId}</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Join Meeting */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Join Meeting Room
            </CardTitle>
            <CardDescription>
              Enter a room ID to join an existing meeting
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="roomId">Room ID</Label>
              <Input
                id="roomId"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                placeholder="Enter room ID (e.g., ABC12345)"
                className="font-mono"
              />
            </div>
            
            <Button 
              onClick={joinMeeting} 
              disabled={!roomId}
              className="w-full"
            >
              <ArrowRight className="w-4 h-4 mr-2" />
              Join Meeting
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Meeting URL Sharing */}
      {roomId && (
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>Share Meeting</CardTitle>
            <CardDescription>
              Copy this URL to share with other participants
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={getMeetingUrl()}
                readOnly
                className="font-mono"
              />
              <Button
                variant="outline"
                onClick={() => copyToClipboard(getMeetingUrl())}
              >
                {copied ? "Copied!" : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            
            <div className="text-sm text-muted-foreground">
              Open this URL in different browsers or devices to test multi-user functionality
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Testing Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">Multi-User Testing:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Generate a new room ID above</li>
              <li>Copy the meeting URL</li>
              <li>Open the URL in Browser 1 (logged in as User 1)</li>
              <li>Open the same URL in Browser 2 (logged in as User 2)</li>
              <li>Both users should see each other in the participants list</li>
              <li>Test audio/video functionality</li>
            </ol>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">Expected Behavior:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>WebSocket connection should establish successfully</li>
              <li>Both users appear in participants list</li>
              <li>Real-time signaling works between browsers</li>
              <li>Audio/video streams are exchanged (with permissions)</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Troubleshooting:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Ensure both users are logged in with different accounts</li>
              <li>Check browser console for WebSocket connection errors</li>
              <li>Verify microphone permissions are granted</li>
              <li>Make sure backend server is running on port 8000</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}