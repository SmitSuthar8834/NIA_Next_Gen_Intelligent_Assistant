"use client"

import { Button } from "@/components/ui/button"
import { SystemStatus } from "@/components/ui/system-status"
import { ProfileDropdown } from "@/components/ui/profile-dropdown"
import { QuickJoinMeeting } from "@/components/meetings/QuickJoinMeeting"
import { Bell, Sparkles } from "lucide-react"

interface AppHeaderProps {
  title?: string
  subtitle?: string
  showActions?: boolean
  children?: React.ReactNode
}

export function AppHeader({ 
  title,
  subtitle,
  showActions = true,
  children
}: AppHeaderProps) {
  return (
    <div className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex-1">
          {title && (
            <div>
              <h1 className="text-xl font-semibold">{title}</h1>
              {subtitle && (
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              )}
            </div>
          )}
          {children}
        </div>
        
        {showActions && (
          <div className="flex items-center space-x-3">
            <SystemStatus variant="badge" />
            <QuickJoinMeeting />
            {/* <Button variant="outline" size="sm">
              <Bell size={16} className="mr-2" />
              Notifications
            </Button> */}
            {/* <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              <Sparkles size={16} className="mr-2" />
              AI Insights
            </Button> */}
            <ProfileDropdown />
          </div>
        )}
      </div>
    </div>
  )
}