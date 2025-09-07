import { Logo } from "@/components/ui/logo"
import { Button } from "@/components/ui/button"
import { SystemStatus } from "@/components/ui/system-status"
import { ProfileDropdown } from "@/components/ui/profile-dropdown"
import { Bell, Settings, Sparkles } from "lucide-react"

interface DashboardHeaderProps {
  title?: string
  subtitle?: string
  showActions?: boolean
}

export function DashboardHeader({
  title = "NIA Sales Dashboard",
  subtitle = "Welcome back, Smit. Here's what's happening with your sales pipeline today.",
  showActions = true
}: DashboardHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Logo size="lg" showText={false} />
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          </div>
          <p className="text-muted-foreground">
            {subtitle}
          </p>
        </div>
        {showActions && (
          <div className="flex items-center space-x-3">
            <SystemStatus variant="badge" />
            <Button variant="outline" size="sm">
              <Bell size={16} className="mr-2" />
              Notifications
            </Button>
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              <Sparkles size={16} className="mr-2" />
              AI Insights
            </Button>
            <ProfileDropdown />
          </div>
        )}
      </div>
    </div>
  )
}