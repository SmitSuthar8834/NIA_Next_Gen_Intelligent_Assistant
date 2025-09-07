"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { 
  Calendar, 
  Plus, 
  Settings, 
  HelpCircle, 
  Mail,
  Video,
  Users,
  Bot
} from "lucide-react"

import MeetingScheduler from "./MeetingScheduler"
import MeetingCalendarView from "./MeetingCalendarView"
import QuestionSetManager from "./QuestionSetManager"
import EmailNotificationSettings from "./EmailNotificationSettings"
import EnhancedWebRTCMeeting from "./EnhancedWebRTCMeeting"
import { ScheduledMeeting } from "@/types/meetings"
import { useUser } from "@/hooks/useUser"

export default function MeetingsDashboard() {
  // auth / token for API calls
  const { user, access_token } = useUser()

  // UI state
  const [activeTab, setActiveTab] = useState("calendar")
  const [showScheduler, setShowScheduler] = useState(false)
  const [showMeeting, setShowMeeting] = useState(false)
  const [selectedMeeting, setSelectedMeeting] = useState<ScheduledMeeting | null>(null)
  const [editingMeeting, setEditingMeeting] = useState<ScheduledMeeting | null>(null)
  const [quickScheduleType, setQuickScheduleType] = useState<'today' | 'normal' | null>(null)

  // === New: meetings state (single source of truth) ===
  const [meetings, setMeetings] = useState<ScheduledMeeting[]>([])
  const [loadingMeetings, setLoadingMeetings] = useState(false)

  // Initial load of meetings (you can refine with start/end date if desired)
  useEffect(() => {
    let mounted = true
    const load = async () => {
      if (!access_token) return
      setLoadingMeetings(true)
      try {
        // Fetch all or you can restrict by date range
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/scheduled-meetings/`, {
          headers: {
            'Authorization': `Bearer ${access_token}`
          }
        })
        if (!mounted) return
       if (res.ok) {
  const data = await res.json()
  // API might return { meetings: [...] } or an array directly
  const list: ScheduledMeeting[] = Array.isArray(data) ? data : (data.meetings || [])

  // Normalize each meeting to ensure lead exists (fallback values)
  const normalized = list.map(m => ({
    ...m,
    lead: m.lead ?? {
      id: `unknown-${m.id}`,
      user_id: 'unknown',
      name: 'Unknown Lead',
      status: 'unknown',
      source: 'unknown',
      created_at: m.created_at ?? new Date().toISOString(),
      updated_at: m.updated_at ?? new Date().toISOString()
    }
  }))

  setMeetings(normalized)

        } else {
          console.warn('Failed to load meetings', res.status)
        }
      } catch (err) {
        console.error('Failed to load meetings:', err)
      } finally {
        if (mounted) setLoadingMeetings(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [access_token])

  // Handler: Scheduler created a meeting — add to state and show calendar
  const handleMeetingScheduled = (meeting: ScheduledMeeting) => {
    console.log('dashboard received scheduled meeting', meeting)
    setShowScheduler(false)
    setActiveTab("calendar")

    // Merge into meetings state (avoid duplicates)
    setMeetings(prev => {
      if (prev.some(m => m.id === meeting.id)) return prev
      return [...prev, meeting]
    })
  }

  // Handler: user selects meeting in calendar
  const handleMeetingSelect = (meeting: ScheduledMeeting) => {
    setSelectedMeeting(meeting)
    if ((meeting.status === 'active' || meeting.status === 'scheduled') /* && meeting.lead */) {
  setShowMeeting(true)
}

  }

  const handleEditMeeting = (meeting: ScheduledMeeting) => {
    setEditingMeeting(meeting)
    setShowScheduler(true)
  }

  const handleDeleteMeeting = async (meetingId: string) => {
    // Optimistic UI: remove locally immediately
    setMeetings(prev => prev.filter(m => m.id !== meetingId))

    // TODO: call API to delete meeting. Example:
    try {
      if (!access_token) return
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/scheduled-meetings/${meetingId}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      })
      if (!res.ok) {
        console.warn('Failed to delete meeting on server, status:', res.status)
        // optionally refetch or re-add removed meeting on failure
      }
    } catch (err) {
      console.error('Failed to delete meeting:', err)
    }
  }

  const handleJoinMeeting = (meeting: ScheduledMeeting) => {
    setSelectedMeeting(meeting)
    setShowMeeting(true)
  }

  const handleQuickMeeting = (type: 'today' | 'now') => {
    if (type === 'today') {
      setQuickScheduleType('today')
      setShowScheduler(true)
    } else if (type === 'now') {
      handleStartInstantMeeting()
    }
  }

  const handleStartInstantMeeting = async () => {
    try {
      // generate one stable roomId and reuse it
      const roomId = `room-${Math.random().toString(36).substr(2, 8)}`
      const instantMeeting: ScheduledMeeting = {
        id: `instant-${Date.now()}`,
        meeting_room_id: roomId,
        scheduled_time: new Date().toISOString(),
        duration_minutes: 60,
        status: 'active',
        lead: {
          id: 'instant-lead',
          user_id: user?.id || 'current-user',
          name: 'Instant Meeting',
          status: 'new',
          source: 'instant',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        join_link: `/meetings/join/${roomId}`,
        participants_joined: 0,
        created_at: new Date().toISOString()
      }

      // Add to meetings state immediately so calendar shows it
      setMeetings(prev => [instantMeeting, ...prev])

      // open meeting UI
      setSelectedMeeting(instantMeeting)
      setShowMeeting(true)

      // Optionally persist instant meeting to backend here
    } catch (error) {
      console.error('Failed to start instant meeting:', error)
    }
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-6 h-6 text-blue-600" />
                AI Meetings Dashboard
              </CardTitle>
              <CardDescription>
                Schedule, manage, and conduct AI-powered discovery meetings
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => handleQuickMeeting('today')}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Schedule for Today
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleQuickMeeting('now')}
              >
                <Video className="w-4 h-4 mr-2" />
                Start Now
              </Button>
              <Button onClick={() => {
                setQuickScheduleType('normal')
                setShowScheduler(true)
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Schedule Meeting
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="questions" className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4" />
            Questions
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Calendar View */}
        <TabsContent value="calendar">
          <MeetingCalendarView
            meetings={meetings}                 // <<-- pass meetings down
            loading={loadingMeetings}
            onMeetingSelect={handleMeetingSelect}
            onEditMeeting={handleEditMeeting}
            onDeleteMeeting={handleDeleteMeeting}
          />
        </TabsContent>

        {/* Question Management */}
        <TabsContent value="questions">
          <QuestionSetManager />
        </TabsContent>

        {/* Email Notifications */}
        <TabsContent value="notifications">
          <EmailNotificationSettings />
        </TabsContent>

        {/* Settings */}
        <TabsContent value="settings">
          <div className="grid gap-6">
            {/* Settings cards omitted for brevity — keep your existing markup */}
            {/* You can paste your original settings markup here if required */}
            <Card>
              <CardHeader>
                <CardTitle>Meeting Settings</CardTitle>
                <CardDescription>
                  Configure default settings for AI meetings
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* ... */}
                <div className="text-sm text-muted-foreground">Settings UI</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Meeting Scheduler Dialog */}
      <Dialog open={showScheduler} onOpenChange={setShowScheduler}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingMeeting ? 'Edit Meeting' : 'Schedule New Meeting'}
            </DialogTitle>
            <DialogDescription>
              {editingMeeting 
                ? 'Update the meeting details below'
                : 'Schedule a new AI-powered discovery meeting with a lead'
              }
            </DialogDescription>
          </DialogHeader>
          <MeetingScheduler
            onMeetingScheduled={handleMeetingScheduled}
            onClose={() => {
              setShowScheduler(false)
              setEditingMeeting(null)
              setQuickScheduleType(null)
            }}
           preselectedLeadId={editingMeeting?.lead?.id ?? undefined}
            preselectedDate={quickScheduleType === 'today' ? new Date() : undefined}
          />
        </DialogContent>
      </Dialog>

      {/* Active Meeting Dialog */}
      <Dialog open={showMeeting} onOpenChange={setShowMeeting}>
        <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="w-5 h-5" />
              AI Meeting Room
            </DialogTitle>
            <DialogDescription>
  {selectedMeeting && (
    <>
      Meeting with {selectedMeeting.lead?.name ?? 'Unknown Lead'} • Room: {selectedMeeting.meeting_room_id}
    </>
  )}
</DialogDescription>

          </DialogHeader>
          {selectedMeeting && (
            <div className="flex-1 overflow-hidden">
              <EnhancedWebRTCMeeting
                meetingId={selectedMeeting.id}
                roomId={selectedMeeting.meeting_room_id}
                onMeetingEnd={(analysis) => {
                  setShowMeeting(false)
                  setSelectedMeeting(null)
                  // Handle meeting analysis
                  console.log('Meeting ended with analysis:', analysis)
                }}
                onClose={() => {
                  setShowMeeting(false)
                  setSelectedMeeting(null)
                }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
