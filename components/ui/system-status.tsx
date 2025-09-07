import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, AlertCircle, XCircle, Clock } from "lucide-react"

interface SystemStatusProps {
  variant?: "badge" | "card"
  className?: string
}

const systemServices = [
  { name: "API Gateway", status: "operational", uptime: "99.9%" },
  { name: "Database", status: "operational", uptime: "99.8%" },
  { name: "AI Processing", status: "operational", uptime: "99.7%" },
  { name: "Email Service", status: "maintenance", uptime: "98.5%" },
]

function getStatusIcon(status: string) {
  switch (status) {
    case "operational":
      return <CheckCircle size={16} className="text-green-500" />
    case "maintenance":
      return <Clock size={16} className="text-yellow-500" />
    case "degraded":
      return <AlertCircle size={16} className="text-orange-500" />
    case "outage":
      return <XCircle size={16} className="text-red-500" />
    default:
      return <CheckCircle size={16} className="text-green-500" />
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case "operational":
      return "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
    case "maintenance":
      return "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800"
    case "degraded":
      return "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800"
    case "outage":
      return "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
    default:
      return "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
  }
}

export function SystemStatus({ variant = "badge", className }: SystemStatusProps) {
  const overallStatus = systemServices.every(s => s.status === "operational") ? "operational" : "maintenance"
  
  if (variant === "badge") {
    return (
      <Badge variant="outline" className={`${getStatusColor(overallStatus)} ${className}`}>
        <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
        All Systems Operational
      </Badge>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon(overallStatus)}
          System Status
        </CardTitle>
        <CardDescription>
          Current status of all NIA services
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {systemServices.map((service) => (
            <div key={service.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(service.status)}
                <span className="text-sm font-medium">{service.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{service.uptime}</span>
                <Badge variant="outline" className={getStatusColor(service.status)}>
                  {service.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}