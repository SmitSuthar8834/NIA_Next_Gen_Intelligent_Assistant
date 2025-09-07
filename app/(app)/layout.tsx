import type React from "react"
import { GlobalAppLayout } from "@/components/layout/global-app-layout"
import { IntegrationsProvider } from "@/contexts/IntegrationsContext"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <IntegrationsProvider>
      <GlobalAppLayout>
        {children}
      </GlobalAppLayout>
    </IntegrationsProvider>
  )
}