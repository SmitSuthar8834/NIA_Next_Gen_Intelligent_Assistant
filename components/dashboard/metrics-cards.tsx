"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartNoAxesCombined, Users, TrendingUp, Percent } from "lucide-react"

interface MetricCardProps {
  title: string
  value: string
  change: string
  changeType: "positive" | "negative" | "neutral"
  icon: React.ReactNode
}

function MetricCard({ title, value, change, changeType, icon }: MetricCardProps) {
  const changeColor = {
    positive: "text-green-600 dark:text-green-400",
    negative: "text-red-600 dark:text-red-400", 
    neutral: "text-muted-foreground"
  }[changeType]

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

export function MetricsCards() {
  const metrics = [
    {
      title: "Total Leads",
      value: "2,847",
      change: "+12.5%",
      changeType: "positive" as const,
      icon: <Users size={16} />
    },
    {
      title: "Conversion Rate", 
      value: "24.8%",
      change: "+3.2%",
      changeType: "positive" as const,
      icon: <Percent size={16} />
    },
    {
      title: "Revenue",
      value: "$89,420",
      change: "+18.7%", 
      changeType: "positive" as const,
      icon: <TrendingUp size={16} />
    },
    {
      title: "Active Deals",
      value: "156",
      change: "-2.1%",
      changeType: "negative" as const,
      icon: <ChartNoAxesCombined size={16} />
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