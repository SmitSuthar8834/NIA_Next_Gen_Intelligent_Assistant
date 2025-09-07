"use client"

import { useState } from "react"
import { meetings as initialMeetings, type Meeting } from "@/lib/mock-data"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Calendar, Clock, Video, Plus, ExternalLink } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface EnhancedMeeting extends Meeting {
  attendees: string[]
  status: "upcoming" | "completed" | "cancelled"
  type: "discovery" | "demo" | "follow-up" | "closing"
}

const enhancedMeetings: EnhancedMeeting[] = [
  {
    id: "m_1",
    subject: "Discovery Call - NimbusSoft",
    dateTime: "2025-01-15T15:00:00Z",
    link: "https://meet.example.com/nimbussoft-discovery",
    attendees: ["Ava Johnson", "Sarah Chen"],
    status: "upcoming",
    type: "discovery"
  },
  {
    id: "m_2", 
    subject: "Demo - GreenGrid Ops Team",
    dateTime: "2025-01-17T17:30:00Z",
    link: "https://meet.example.com/greengrid-demo",
    attendees: ["Marco Chen", "Lisa Wang", "Mike Rodriguez"],
    status: "upcoming",
    type: "demo"
  },
  {
    id: "m_3",
    subject: "Follow-up - NorthStar AI",
    dateTime: "2025-01-12T14:00:00Z", 
    link: "https://meet.example.com/northstar-followup",
    attendees: ["Priya Patel", "Alex Kim"],
    status: "completed",
    type: "follow-up"
  },
  {
    id: "m_4",
    subject: "Closing Call - Flux Analytics",
    dateTime: "2025-01-10T16:00:00Z",
    link: "https://meet.example.com/flux-closing",
    attendees: ["Diego Ramirez", "Sarah Chen"],
    status: "completed", 
    type: "closing"
  }
]

function getStatusColor(status: EnhancedMeeting["status"]) {
  switch (status) {
    case "upcoming":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
    case "completed":
      return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
    case "cancelled":
      return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
  }
}

function getTypeColor(type: EnhancedMeeting["type"]) {
  switch (type) {
    case "discovery":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400"
    case "demo":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400"
    case "follow-up":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
    case "closing":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400"
  }
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase()
}

function MeetingCard({ meeting }: { meeting: EnhancedMeeting }) {
  const meetingDate = new Date(meeting.dateTime)
  const isUpcoming = meeting.status === "upcoming"
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{meeting.subject}</CardTitle>
            <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Calendar size={14} />
                <span>{meetingDate.toLocaleDateString()}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock size={14} />
                <span>{meetingDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col space-y-2">
            <Badge variant="secondary" className={getStatusColor(meeting.status)}>
              {meeting.status}
            </Badge>
            <Badge variant="outline" className={getTypeColor(meeting.type)}>
              {meeting.type}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium mb-2">Attendees</p>
            <div className="flex items-center space-x-2">
              {meeting.attendees.slice(0, 3).map((attendee, index) => (
                <Avatar key={index} className="w-6 h-6">
                  <AvatarImage src={`https://i.pravatar.cc/150?u=${attendee}`} />
                  <AvatarFallback className="text-xs">
                    {getInitials(attendee)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {meeting.attendees.length > 3 && (
                <span className="text-xs text-muted-foreground">
                  +{meeting.attendees.length - 3} more
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" asChild>
              <a href={meeting.link} target="_blank" rel="noopener noreferrer">
                <Video size={14} className="mr-2" />
                Join Meeting
                <ExternalLink size={14} className="ml-2" />
              </a>
            </Button>
            {isUpcoming && (
              <Button variant="ghost" size="sm">
                Reschedule
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function EnhancedMeetingsList() {
  const [meetings] = useState<EnhancedMeeting[]>(enhancedMeetings)
  
  const upcomingMeetings = meetings.filter(m => m.status === "upcoming")
  const completedMeetings = meetings.filter(m => m.status === "completed")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Meetings</h1>
          <p className="text-muted-foreground">
            Manage your scheduled meetings and calls
          </p>
        </div>
        <Button>
          <Plus size={16} className="mr-2" />
          Schedule Meeting
        </Button>
      </div>

      <Tabs defaultValue="upcoming" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upcoming">
            Upcoming ({upcomingMeetings.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedMeetings.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="upcoming" className="space-y-4">
          {upcomingMeetings.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {upcomingMeetings.map((meeting) => (
                <MeetingCard key={meeting.id} meeting={meeting} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <Calendar size={48} className="mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No upcoming meetings</p>
                  <Button className="mt-4">
                    <Plus size={16} className="mr-2" />
                    Schedule Your First Meeting
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="completed" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {completedMeetings.map((meeting) => (
              <MeetingCard key={meeting.id} meeting={meeting} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}