'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle, AlertCircle, Calendar, Users, ExternalLink } from 'lucide-react'
import { useUser } from '@/hooks/useUser'

interface TeamsStatus {
  connected: boolean
  token_expired?: boolean
  expires_at?: string
  message: string
}

interface SyncResult {
  status: string
  synced_meetings: number
  total_meetings: number
  errors: string[]
  message: string
}

export default function TeamsConfig() {
  const { user, access_token } = useUser()
  const [status, setStatus] = useState<TeamsStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // Check connection status on component mount
  useEffect(() => {
    checkTeamsStatus()
  }, [])

  // Check for OAuth callback parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const teamsConnected = urlParams.get('teams_connected')
    const teamsError = urlParams.get('teams_error')

    if (teamsConnected === 'true') {
      setMessage('Microsoft Teams connected successfully!')
      checkTeamsStatus()
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname)
    } else if (teamsError) {
      setError(`Teams connection failed: ${teamsError}`)
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  const checkTeamsStatus = async () => {
    try {
      const response = await fetch('http://localhost:8000/auth/teams/status', {
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setStatus(data)
      } else {
        setError('Failed to check Teams connection status')
      }
    } catch (err) {
      setError('Failed to check Teams connection status')
    } finally {
      setLoading(false)
    }
  }

  const connectTeams = async () => {
    setConnecting(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch('http://localhost:8000/auth/teams/login', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        // Redirect to Microsoft OAuth
        window.location.href = data.redirect_url
      } else {
        const errorData = await response.json()
        setError(errorData.detail || 'Failed to initiate Teams connection')
      }
    } catch (err) {
      setError('Failed to connect to Teams')
    } finally {
      setConnecting(false)
    }
  }

  const disconnectTeams = async () => {
    setError('')
    setMessage('')

    try {
      const response = await fetch('http://localhost:8000/auth/teams/disconnect', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      })

      if (response.ok) {
        setMessage('Microsoft Teams disconnected successfully')
        setStatus({ connected: false, message: 'Not connected' })
      } else {
        setError('Failed to disconnect Teams')
      }
    } catch (err) {
      setError('Failed to disconnect Teams')
    }
  }

  const syncMeetings = async () => {
    setSyncing(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch('http://localhost:8000/meetings/sync', {
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      })

      if (response.ok) {
        const data: SyncResult = await response.json()
        setMessage(`${data.message}. Synced ${data.synced_meetings} out of ${data.total_meetings} meetings.`)
        
        if (data.errors.length > 0) {
          setError(`Some meetings failed to sync: ${data.errors.join(', ')}`)
        }
      } else {
        const errorData = await response.json()
        setError(errorData.detail || 'Failed to sync meetings')
      }
    } catch (err) {
      setError('Failed to sync meetings')
    } finally {
      setSyncing(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            💬
          </div>
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              Calendar Integration
              {status?.connected && (
                <Badge variant={status.token_expired ? "destructive" : "default"}>
                  {status.token_expired ? "Token Expired" : "Connected"}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>Sync meetings from your Microsoft calendar</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {!status?.connected ? (
          <div className="space-y-4">
            <div className="text-center py-4">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                Connect your Microsoft Teams account to automatically sync your meetings
              </p>
              <Button onClick={connectTeams} disabled={connecting} className="w-full">
                {connecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <ExternalLink className="mr-2 h-4 w-4" />
                Connect Microsoft Teams
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-green-800 font-medium">Teams Connected</span>
              </div>
              <Button variant="outline" size="sm" onClick={disconnectTeams}>
                Disconnect
              </Button>
            </div>

            {status.token_expired && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Your Teams token has expired. Please reconnect your account.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-4">
              <Button 
                onClick={syncMeetings} 
                disabled={syncing || status.token_expired}
                className="flex-1"
              >
                {syncing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Calendar className="mr-2 h-4 w-4" />
                Sync Meetings
              </Button>
            </div>

            {status.expires_at && (
              <div className="text-sm text-muted-foreground">
                Token expires: {new Date(status.expires_at).toLocaleString()}
              </div>
            )}
          </div>
        )}

        {message && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold mb-2">How it works:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Connect your Microsoft account using OAuth</li>
            <li>• Sync upcoming meetings from your calendar</li>
            <li>• Access meetings with or without Teams</li>
            <li>• Get meeting links and details automatically</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}