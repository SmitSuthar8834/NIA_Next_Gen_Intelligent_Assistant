"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useUser } from "@/hooks/useUser"

export default function DebugInfo() {
  const { user, access_token } = useUser()
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const [apiUrl, setApiUrl] = useState('')

  useEffect(() => {
    setApiUrl(process.env.NEXT_PUBLIC_API_URL || 'Not set')
    
    // Check API status
    const checkAPI = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/health`)
        if (response.ok) {
          setApiStatus('online')
        } else {
          setApiStatus('offline')
        }
      } catch (error) {
        setApiStatus('offline')
      }
    }
    
    checkAPI()
  }, [])

  return (
    <Card className="mb-4 border-yellow-200 bg-yellow-50">
      <CardHeader>
        <CardTitle className="text-sm">Debug Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <span>API URL:</span>
          <Badge variant="outline">{apiUrl}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <span>API Status:</span>
          <Badge variant={apiStatus === 'online' ? 'default' : 'destructive'}>
            {apiStatus}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <span>User Auth:</span>
          <Badge variant={access_token ? 'default' : 'destructive'}>
            {access_token ? 'Authenticated' : 'Not authenticated'}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <span>Current URL:</span>
          <Badge variant="outline">{typeof window !== 'undefined' ? window.location.href : 'SSR'}</Badge>
        </div>
      </CardContent>
    </Card>
  )
}