"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowRight } from "lucide-react"
import Link from "next/link"

interface TopLead {
  id: string
  name: string
  company: string
  email: string
  status: "Hot" | "Warm" | "Cold"
  score: number
  avatar?: string
  initials: string
  lastActivity: string
}

const topLeads: TopLead[] = [
  {
    id: "1",
    name: "Ava Johnson",
    company: "NimbusSoft",
    email: "ava.j@nimbussoft.com",
    status: "Hot",
    score: 95,
    initials: "AJ",
    lastActivity: "Requested pilot proposal"
  },
  {
    id: "2",
    name: "Marco Chen", 
    company: "GreenGrid",
    email: "mchen@greengrid.io",
    status: "Hot",
    score: 88,
    initials: "MC",
    lastActivity: "Attended product demo"
  },
  {
    id: "3",
    name: "Priya Patel",
    company: "NorthStar AI",
    email: "priya@northstar.ai", 
    status: "Warm",
    score: 72,
    initials: "PP",
    lastActivity: "Downloaded whitepaper"
  },
  {
    id: "4",
    name: "James Wilson",
    company: "TechFlow Inc",
    email: "j.wilson@techflow.com",
    status: "Warm", 
    score: 68,
    initials: "JW",
    lastActivity: "Opened email campaign"
  }
]

function getStatusColor(status: TopLead["status"]) {
  switch (status) {
    case "Hot":
      return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
    case "Warm":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400"
    case "Cold":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
  }
}

function getScoreColor(score: number) {
  if (score >= 80) return "text-green-600 dark:text-green-400"
  if (score >= 60) return "text-orange-600 dark:text-orange-400"
  return "text-red-600 dark:text-red-400"
}

export function TopLeads() {
  return (
    <Card className="col-span-3">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Top Leads</CardTitle>
          <CardDescription>
            Highest priority prospects based on AI scoring
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/leads">
            View All
            <ArrowRight size={16} className="ml-2" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {topLeads.map((lead) => (
            <div key={lead.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
              <div className="flex items-center space-x-4">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={lead.avatar} />
                  <AvatarFallback>{lead.initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-foreground">
                      {lead.name}
                    </p>
                    <Badge variant="secondary" className={getStatusColor(lead.status)}>
                      {lead.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {lead.company}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {lead.lastActivity}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-sm font-medium ${getScoreColor(lead.score)}`}>
                  {lead.score}%
                </div>
                <div className="text-xs text-muted-foreground">
                  Score
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}