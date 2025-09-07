"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/ui/logo"
import { Calendar, Settings, Table, ListChecks } from "lucide-react"

const navItems = [
  { href: "/leads", label: "Leads", icon: Table },
  { href: "/meetings", label: "Meetings", icon: Calendar },
  { href: "/summaries", label: "Summaries & Insights", icon: ListChecks },
  { href: "/settings", label: "Settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-40 flex items-center justify-between border-b bg-background/80 backdrop-blur px-4 py-2">
        <div className="flex items-center gap-2">
          <Logo size="sm" />
          <span className="text-muted-foreground text-sm">AI Sales Assistant</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open}>
          Menu
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed md:static z-50 inset-y-0 left-0 w-72 shrink-0 border-r bg-card md:translate-x-0 transform transition-transform",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
        aria-label="Main navigation"
      >
        <div className="flex h-14 items-center justify-between border-b px-4">
          <Logo size="sm" />
          <Button
            className="md:hidden"
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            Close
          </Button>
        </div>
        <nav className="p-2">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname?.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300" : "hover:bg-muted",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                <span className="text-pretty">{label}</span>
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Backdrop for mobile */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          role="button"
          aria-label="Close menu backdrop"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  )
}