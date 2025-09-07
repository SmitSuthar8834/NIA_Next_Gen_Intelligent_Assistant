"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Logo } from "@/components/ui/logo"
import { 
  BarChart3, 
  Users, 
  Calendar, 
  FileText, 
  Settings, 
  ChevronLeft,
  ChevronRight,
  Home,
  MessageSquare,
  Zap,
  User
} from "lucide-react"

const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  /*{ name: "Analytics", href: "/analytics", icon: BarChart3 },*/
  { name: "Leads", href: "/leads", icon: Users  },
  { name: "Meetings", href: "/meetings", icon: Calendar },
  { name: "Summaries", href: "/summaries", icon: FileText },
  { name: "Integrations", href: "/integrations", icon: Zap },
  /*{ name: "Messages", href: "/messages", icon: MessageSquare },*/
]

const secondaryNavigation = [
  { name: "Profile", href: "/profile", icon: User },
  { name: "Settings", href: "/settings", icon: Settings },
]

interface CollapsibleSidebarProps {
  className?: string
}

export function CollapsibleSidebar({ className }: CollapsibleSidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  return (
    <div className={cn(
      "flex flex-col border-r bg-card transition-all duration-300",
      collapsed ? "w-16" : "w-72",
      className
    )}>
      {/* Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b">
        {!collapsed && <Logo textClassName="text-sm font-semibold" />}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2">
        <div className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "group flex items-center gap-x-3 rounded-md p-2 text-sm font-semibold transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                  collapsed && "justify-center"
                )}
                title={collapsed ? item.name : undefined}
              >
                <item.icon size={20} className="shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1">{item.name}</span>
                    { (
                      <Badge 
                        variant="secondary" 
                        className="ml-auto h-5 px-2 text-xs"
                      >
                        {/* {item.badge} */}
                      </Badge>
                    )}
                  </>
                )}
              </Link>
            )
          })}
        </div>

        {/* Secondary navigation */}
        <div className="mt-8">
          {!collapsed && (
            <div className="text-xs font-semibold text-muted-foreground mb-2 px-2">
              Support
            </div>
          )}
          <div className="space-y-1">
            {secondaryNavigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "group flex items-center gap-x-3 rounded-md p-2 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors",
                  collapsed && "justify-center"
                )}
                title={collapsed ? item.name : undefined}
              >
                <item.icon size={20} className="shrink-0" />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            ))}
          </div>
        </div>
      </nav>
    </div>
  )
}