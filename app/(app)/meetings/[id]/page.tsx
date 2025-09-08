"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Building, 
  Mail, 
  Phone,
  Video,
  Copy,
  Check,
  ArrowLeft,
  ExternalLink,
  Users
} from "lucide-react"
import { format } from "date-fns"
import { useUser } from "@/hooks/useUser"
import { ScheduledMeeting } from "@/types/meetings"

export default function MeetingDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { user, access_token } = useUser()
  const meetingId = params.id as string

  const [meeting, setMeeting] = useState<ScheduledMeeting | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [leadLoading, setLeadLoading] = useState(false)

  useEffect(() => {
    if (access_token && meetingId) {
      fetchMeeting()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access_token, meetingId])

  // If the meeting has no embedded lead but has lead_id, fetch lead and merge
  useEffect(() => {
    if (!meeting) return
    if ((!meeting as any).lead && (meeting as any).lead_id && access_token) {
      fetchLeadAndMerge((meeting as any).lead_id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meeting, access_token])

  const fetchMeeting = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URLL}/scheduled-meetings/${meetingId}`,
        {
          headers: {
            'Authorization': `Bearer ${access_token}`
          }
        }
      )

      if (response.ok) {
        const data = await response.json()
        setMeeting(data)
      } else if (response.status === 404) {
        setError('Meeting not found')
      } else {
        const txt = await response.text().catch(() => '')
        setError(`Failed to load meeting details (${response.status}) ${txt}`)
      }
    } catch (err) {
      console.error(err)
      setError('Failed to load meeting details')
    } finally {
      setLoading(false)
    }
  }

  const fetchLeadAndMerge = async (leadId: string) => {
    try {
      setLeadLoading(true)
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/leads/${leadId}`, {
        headers: { 'Authorization': `Bearer ${access_token}` }
      })
      if (!res.ok) {
        return
      }
      const lead = await res.json()
      // merge into meeting
      setMeeting(prev => prev ? ({ ...prev, lead }) : prev)
    } catch (err) {
      console.warn('Failed to fetch lead:', err)
    } finally {
      setLeadLoading(false)
    }
  }

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(type)
      setTimeout(() => setCopied(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const getMeetingUrl = () => {
    if (!meeting) return ''
    // prefer a join_link if provided by API, otherwise construct one
    if ((meeting as any).join_link) {
      // if join_link is relative, turn into absolute
      const jl = (meeting as any).join_link as string
      try {
        const url = new URL(jl, window.location.origin)
        return url.toString()
      } catch {
        return jl
      }
    }
    return `${window.location.origin}/meeting/${meeting.meeting_room_id}`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'default'
      case 'active': return 'default'
      case 'completed': return 'secondary'
      case 'cancelled': return 'destructive'
      default: return 'secondary'
    }
  }

  const handleJoinMeeting = () => {
    if (!meeting) return
    const url = getMeetingUrl()
    if (!url) return
    window.open(url, '_blank')
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  if (error || !meeting) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertDescription>{error || 'Meeting not found'}</AlertDescription>
        </Alert>
      </div>
    )
  }

  // Safely resolve lead fields (may be undefined)
  const leadName = (meeting as any).lead?.name ?? (meeting as any).lead_name ?? 'Unknown Lead'
  const leadCompany = (meeting as any).lead?.company ?? (meeting as any).lead_company ?? ''
  const leadEmail = (meeting as any).lead?.email ?? (meeting as any).lead_email ?? ''

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Meeting Details</h1>
          <p className="text-muted-foreground">
            {meeting.scheduled_time ? format(new Date(meeting.scheduled_time), 'PPP p') : '—'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Meeting Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5" />
                Meeting Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Status</div>
                  <Badge variant={getStatusColor(meeting.status)}>
                    {meeting.status ?? '—'}
                  </Badge>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Duration</div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {meeting.duration_minutes ?? '—'} minutes
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Room ID</div>
                  <div className="font-mono text-sm">{meeting.meeting_room_id ?? '—'}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Participants</div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    {meeting.participants_joined ?? 0}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lead Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Lead Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span className="font-medium">{leadName}</span>
                {leadLoading && <span className="text-xs text-muted-foreground ml-2">(loading lead...)</span>}
              </div>
              {leadCompany && (
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  <span>{leadCompany}</span>
                </div>
              )}
              {leadEmail && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <span>{leadEmail}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Question Set */}
          {meeting.question_set && (
            <Card>
              <CardHeader>
                <CardTitle>Question Set</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-3 border rounded-md">
                  <div className="font-medium">{meeting.question_set.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {meeting.question_set.description}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Actions Sidebar */}
        <div className="space-y-6">
          {/* Join Meeting */}
          <Card>
            <CardHeader>
              <CardTitle>Join Meeting</CardTitle>
              <CardDescription>
                Click to join the meeting room
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                onClick={handleJoinMeeting}
                className="w-full"
                disabled={meeting.status === 'cancelled' || meeting.status === 'completed'}
              >
                <Video className="w-4 h-4 mr-2" />
                Join Meeting
              </Button>
              
              {(meeting.status === 'cancelled' || meeting.status === 'completed') && (
                <p className="text-sm text-muted-foreground text-center">
                  This meeting is {meeting.status}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Share Meeting */}
          <Card>
            <CardHeader>
              <CardTitle>Share Meeting</CardTitle>
              <CardDescription>
                Copy the meeting URL to share with others
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="text-sm font-medium">Meeting URL</div>
                <div className="flex gap-2">
                  <div className="flex-1 p-2 bg-muted rounded text-sm font-mono break-all">
                    {getMeetingUrl() || '—'}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(getMeetingUrl(), 'url')}
                    disabled={!getMeetingUrl()}
                  >
                    {copied === 'url' ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Room ID</div>
                <div className="flex gap-2">
                  <div className="flex-1 p-2 bg-muted rounded text-sm font-mono">
                    {meeting.meeting_room_id ?? '—'}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(meeting.meeting_room_id ?? '', 'room')}
                    disabled={!meeting.meeting_room_id}
                  >
                    {copied === 'room' ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Meeting Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Meeting Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-3 border rounded">
                  <div className="text-2xl font-bold">{meeting.participants_joined ?? 0}</div>
                  <div className="text-sm text-muted-foreground">Participants</div>
                </div>
                <div className="p-3 border rounded">
                  <div className="text-2xl font-bold">
                    {meeting.ai_joined_at ? '✓' : '—'}
                  </div>
                  <div className="text-sm text-muted-foreground">AI Joined</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
