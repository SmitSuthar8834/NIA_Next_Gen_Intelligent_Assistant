"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Clock, Mail, Phone, Calendar } from "lucide-react"

interface ActivityItem {
  id: string
  type: "email" | "call" | "meeting" | "update"
  title: string
  description: string
  time: string
  user: {
    name: string
    avatar?: string
    initials: string
  }
  status?: "completed" | "pending" | "scheduled"
}

const recentActivities: ActivityItem[] = [
  {
    id: "1",
    type: "email",
    title: "Email sent to Ava Johnson",
    description: "Follow-up on NimbusSoft pilot proposal",
    time: "2 hours ago",
    user: { name: "Sarah Chen", initials: "SC" },
    status: "completed"
  },
  {
    id: "2", 
    type: "call",
    title: "Discovery call with Marco Chen",
    description: "Discussed automation requirements for GreenGrid",
    time: "4 hours ago",
    user: { name: "Mike Rodriguez", initials: "MR" },
    status: "completed"
  },
  {
    id: "3",
    type: "meeting",
    title: "Demo scheduled",
    description: "Product demo for Priya Patel at NorthStar AI",
    time: "Tomorrow 2:00 PM",
    user: { name: "Alex Kim", initials: "AK" },
    status: "scheduled"
  },
  {
    id: "4",
    type: "update",
    title: "Lead status updated",
    description: "Diego Ramirez moved to Closed Won",
    time: "1 day ago", 
    user: { name: "Sarah Chen", initials: "SC" },
    status: "completed"
  }
]

function getActivityIcon(type: ActivityItem["type"]) {
  switch (type) {
    case "email":
      return <Mail size={16} />
    case "call":
      return <Phone size={16} />
    case "meeting":
      return <Calendar size={16} />
    case "update":
      return <Clock size={16} />
  }
}

function getStatusColor(status?: ActivityItem["status"]) {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
    case "pending":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
    case "scheduled":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
  }
}

export function RecentActivity() {
  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>
          Latest updates and interactions with leads
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentActivities.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                  {getActivityIcon(activity.type)}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">
                    {activity.title}
                  </p>
                  {activity.status && (
                    <Badge variant="secondary" className={getStatusColor(activity.status)}>
                      {activity.status}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {activity.description}
                </p>
                <div className="flex items-center mt-2 space-x-2">
                  <Avatar className="w-5 h-5">
                    <AvatarImage src={activity.user.avatar} />
                    <AvatarFallback className="text-xs">
                      {activity.user.initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground">
                    {activity.user.name}
                  </span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">
                    {activity.time}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}