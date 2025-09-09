"use client"

import { useState } from "react"
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
  Bot
} from "lucide-react"

import MeetingScheduler from "./MeetingScheduler"
import MeetingCalendarView from "./MeetingCalendarView"
import QuestionSetManager from "./QuestionSetManager"
import EmailNotificationSettings from "./EmailNotificationSettings"
import EnhancedWebRTCMeeting from "./EnhancedWebRTCMeeting"
import { ScheduledMeeting } from "@/types/meetings"

export default function MeetingsDashboard() {
  // UI state
  const [activeTab, setActiveTab] = useState("calendar")
  const [showScheduler, setShowScheduler] = useState(false)
  const [showMeeting, setShowMeeting] = useState(false)
  const [selectedMeeting, setSelectedMeeting] = useState<ScheduledMeeting | null>(null)
  const [editingMeeting, setEditingMeeting] = useState<ScheduledMeeting | null>(null)
  const [quickScheduleType, setQuickScheduleType] = useState<'today' | 'normal' | null>(null)

  const handleMeetingScheduled = () => {
    setShowScheduler(false)
    // Refresh calendar view
    setActiveTab("calendar")
  }

  const handleMeetingSelect = (meeting: ScheduledMeeting) => {
    setSelectedMeeting(meeting)
    if (meeting.status === 'active' || meeting.status === 'scheduled') {
      setShowMeeting(true)
    }
  }

  const handleEditMeeting = (meeting: ScheduledMeeting) => {
    setEditingMeeting(meeting)
    setShowScheduler(true)
  }

  const handleDeleteMeeting = async (meetingId: string) => {
    // Implementation would call API to delete meeting
    console.log('Delete meeting:', meetingId)
  }

  const handleQuickMeeting = (type: 'today' | 'now') => {
    if (type === 'today') {
      // Open scheduler with today's date pre-selected
      setQuickScheduleType('today')
      setShowScheduler(true)
    } else if (type === 'now') {
      // Create an instant meeting
      handleStartInstantMeeting()
    }
  }

  const handleStartInstantMeeting = async () => {
    // Create a meeting that starts immediately
    try {
      // This would create a meeting with current time
      const instantMeeting: ScheduledMeeting = {
        id: `instant-${Date.now()}`,
        meeting_room_id: `room-${Math.random().toString(36).substring(2, 10)}`,
        scheduled_time: new Date().toISOString(),
        duration_minutes: 60,
        status: 'active',
        lead: {
          id: 'instant-lead',
          user_id: 'current-user',
          name: 'Instant Meeting',
          status: 'new',
          source: 'instant',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        join_link: `/meetings/join/room-${Math.random().toString(36).substring(2, 10)}`,
        participants_joined: 0,
        created_at: new Date().toISOString()
      }

      setSelectedMeeting(instantMeeting)
      setShowMeeting(true)
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
            {/* Meeting Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Meeting Settings</CardTitle>
                <CardDescription>
                  Configure default settings for AI meetings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="default-duration" className="text-sm font-medium">Default Duration</label>
                      <select id="default-duration" aria-label="Default Duration" className="w-full mt-1 p-2 border rounded-md">
                        <option value="30">30 minutes</option>
                        <option value="45">45 minutes</option>
                        <option value="60">60 minutes</option>
                        <option value="90">90 minutes</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="max-participants" className="text-sm font-medium">Max Participants</label>
                      <select id="max-participants" aria-label="Max Participants" className="w-full mt-1 p-2 border rounded-md">
                        <option value="5">5 participants</option>
                        <option value="10">10 participants</option>
                        <option value="15">15 participants</option>
                        <option value="20">20 participants</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked />
                      <span className="text-sm">Enable automatic recording</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked />
                      <span className="text-sm">Generate transcripts</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked />
                      <span className="text-sm">Send meeting summaries</span>
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Settings */}
            <Card>
                            <CardHeader>
                <CardTitle>AI Assistant Settings</CardTitle>
                <CardDescription>
                  Configure AI behavior and capabilities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="ai-voice-speed" className="text-sm font-medium">AI Voice Speed</label>
                    <select id="ai-voice-speed" aria-label="AI Voice Speed" className="w-full mt-1 p-2 border rounded-md">
                      <option value="0.8">Slow</option>
                      <option value="0.9">Normal</option>
                      <option value="1.0">Fast</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="conversation-style" className="text-sm font-medium">Conversation Style</label>
                    <select id="conversation-style" aria-label="Conversation Style" className="w-full mt-1 p-2 border rounded-md">
                      <option value="professional">Professional</option>
                      <option value="friendly">Friendly</option>
                      <option value="casual">Casual</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked />
                      <span className="text-sm">Allow AI to ask follow-up questions</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked />
                      <span className="text-sm">Enable real-time analysis</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" />
                      <span className="text-sm">Auto-end meetings after completion</span>
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Integration Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Integration Settings</CardTitle>
                <CardDescription>
                  Configure integrations with external systems
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked />
                      <span className="text-sm">Sync with Creatio CRM</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" />
                      <span className="text-sm">Export to Google Calendar</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" />
                      <span className="text-sm">Send to Slack notifications</span>
                    </label>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Webhook URL (Optional)</label>
                    <input
                      type="url"
                      className="w-full mt-1 p-2 border rounded-md"
                      placeholder="https://your-webhook-url.com/meetings"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Receive meeting events and analysis data
                    </p>
                  </div>
                </div>
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
            preselectedLeadId={editingMeeting?.lead?.id ? String(editingMeeting.lead.id) : undefined}
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
                <>Meeting with {selectedMeeting.lead_id} • Room: {selectedMeeting.meeting_room_id}</>
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