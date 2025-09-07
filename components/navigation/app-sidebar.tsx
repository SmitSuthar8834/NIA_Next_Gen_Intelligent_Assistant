"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Logo } from "@/components/ui/logo"
import { 
  BarChart3, 
  Users, 
  Calendar, 
  FileText, 
  Settings, 
  Bell,
  Search,
  Menu,
  X,
  Home,
  MessageSquare
} from "lucide-react"

const navigation = [
  { name: "Dashboard", href: "/", icon: Home, current: true },
  { name: "Analytics", href: "/analytics", icon: BarChart3, current: false },
  { name: "Leads", href: "/leads", icon: Users, current: false, badge: "12" },
  { name: "Meetings", href: "/meetings", icon: Calendar, current: false },
  /*{ name: "Insights", href: "/insights", icon: FileText, current: false },*/
  /*{ name: "Messages", href: "/messages", icon: MessageSquare, current: false, badge: "3" },*/
]

const secondaryNavigation = [
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "Help & Support", href: "/support", icon: Bell },
]

interface AppSidebarProps {
  className?: string
}

export function AppSidebar({ className }: AppSidebarProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  return (
    <>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile header */}
      <div className="sticky top-0 z-30 flex h-16 items-center gap-x-4 border-b bg-background px-4 shadow-sm lg:hidden">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu size={20} />
        </Button>
        <div className="flex items-center gap-2 flex-1">
          <Logo size="sm" showText={false} />
          <span className="text-sm font-semibold leading-6">NIA Sales Dashboard</span>
        </div>
        <Button variant="ghost" size="sm">
          <Bell size={20} />
        </Button>
      </div>

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 z-50 flex w-72 flex-col lg:z-auto lg:inset-auto",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        className
      )}>
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r bg-card px-6 pb-4">
          {/* Header */}
          <div className="flex h-16 shrink-0 items-center justify-between">
            <Logo textClassName="text-sm font-semibold leading-6" />
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X size={20} />
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            />
          </div>

          {/* Navigation */}
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {navigation.map((item) => {
                    const isActive = pathname === item.href
                    return (
                      <li key={item.name}>
                        <Link
                          href={item.href}
                          className={cn(
                            "group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-colors",
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted"
                          )}
                        >
                          <item.icon
                            size={20}
                            className="shrink-0"
                          />
                          <span className="flex-1">{item.name}</span>
                          {item.badge && (
                            <Badge 
                              variant="secondary" 
                              className="ml-auto h-5 px-2 text-xs"
                            >
                              {item.badge}
                            </Badge>
                          )}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </li>

              {/* Secondary navigation */}
              <li className="mt-auto">
                <div className="text-xs font-semibold leading-6 text-muted-foreground mb-2">
                  Support
                </div>
                <ul role="list" className="-mx-2 space-y-1">
                  {secondaryNavigation.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className="group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <item.icon size={20} className="shrink-0" />
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>

              {/* User profile */}
              <li className="-mx-2 mt-2">
                <div className="flex items-center gap-x-3 rounded-md p-2 text-sm leading-6 hover:bg-muted transition-colors">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="https://i.pravatar.cc/150?u=admin" />
                    <AvatarFallback>SC</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">Sarah Chen</p>
                    <p className="text-xs text-muted-foreground">Sales Manager</p>
                  </div>
                </div>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </>
  )
}