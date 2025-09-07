"use client"

import { useRealtimeLeads, useRealtimeMeetings, useRealtimeSummaries } from "@/hooks/use-realtime-data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ChartNoAxesCombined, Users, TrendingUp, Calendar } from "lucide-react"

interface MetricCardProps {
  title: string
  value: string
  change: string
  changeType: "positive" | "negative" | "neutral"
  icon: React.ReactNode
  loading?: boolean
}

function MetricCard({ title, value, change, changeType, icon, loading }: MetricCardProps) {
  const changeColor = {
    positive: "text-green-600 dark:text-green-400",
    negative: "text-red-600 dark:text-red-400", 
    neutral: "text-muted-foreground"
  }[changeType]

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-16 mb-2" />
          <Skeleton className="h-3 w-20" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="text-muted-foreground">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className={`text-xs ${changeColor}`}>
          {change} from last month
        </p>
      </CardContent>
    </Card>
  )
}

export function RealtimeMetricsCards() {
  const { leads, loading: leadsLoading } = useRealtimeLeads()
  const { meetings, loading: meetingsLoading } = useRealtimeMeetings()
  const { summaries, loading: summariesLoading } = useRealtimeSummaries()

  // Calculate metrics from real data
  const totalLeads = leads.length
  const qualifiedLeads = leads.filter(lead => 
    lead.status.toLowerCase() === 'qualified' || lead.status.toLowerCase() === 'closed won'
  ).length
  const conversionRate = totalLeads > 0 ? ((qualifiedLeads / totalLeads) * 100).toFixed(1) : "0"
  
  const upcomingMeetings = meetings.filter(meeting => 
    new Date(meeting.start_time) > new Date()
  ).length

  const metrics = [
    {
      title: "Total Leads",
      value: totalLeads.toString(),
      change: "+12.5%",
      changeType: "positive" as const,
      icon: <Users size={16} />,
      loading: leadsLoading
    },
    {
      title: "Conversion Rate", 
      value: `${conversionRate}%`,
      change: "+3.2%",
      changeType: "positive" as const,
      icon: <TrendingUp size={16} />,
      loading: leadsLoading
    },
    {
      title: "Upcoming Meetings",
      value: upcomingMeetings.toString(),
      change: "+18.7%", 
      changeType: "positive" as const,
      icon: <Calendar size={16} />,
      loading: meetingsLoading
    },
    {
      title: "AI Summaries",
      value: summaries.length.toString(),
      change: "-2.1%",
      changeType: "negative" as const,
      icon: <ChartNoAxesCombined size={16} />,
      loading: summariesLoading
    }
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => (
        <MetricCard key={metric.title} {...metric} />
      ))}
    </div>
  )
}