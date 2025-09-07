"use client"

import { CollapsibleSidebar } from "@/components/navigation/collapsible-sidebar"
import { AppHeader } from "@/components/layout/app-header"

interface GlobalAppLayoutProps {
  children: React.ReactNode
  headerTitle?: string
  headerSubtitle?: string
  showHeaderActions?: boolean
  headerContent?: React.ReactNode
}

export function GlobalAppLayout({ 
  children,
  headerTitle,
  headerSubtitle,
  showHeaderActions = true,
  headerContent
}: GlobalAppLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex">
        <CollapsibleSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <AppHeader 
            title={headerTitle}
            subtitle={headerSubtitle}
            showActions={showHeaderActions}
          >
            {headerContent}
          </AppHeader>
          <main className="flex-1 overflow-auto">
            <div className="p-4 md:p-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}