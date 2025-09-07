'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function TeamsCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // The backend handles the OAuth callback and redirects back to integrations
    // This page is just a fallback in case the redirect doesn't work properly
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    const state = searchParams.get('state')

    if (error) {
      router.push(`/integrations?teams_error=${encodeURIComponent(error)}`)
    } else if (code && state) {
      // Redirect to backend callback endpoint with correct redirect_uri
      window.location.href = `http://localhost:8000/auth/teams/callback?code=${code}&state=${state}&redirect_uri=${encodeURIComponent("http://localhost:3000/integrations/teams/callback")}`
    } else {
      // No valid parameters, redirect to integrations
      router.push('/integrations')
    }
  }, [router, searchParams])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Connecting your Microsoft Teams account...</p>
      </div>
    </div>
  )
}