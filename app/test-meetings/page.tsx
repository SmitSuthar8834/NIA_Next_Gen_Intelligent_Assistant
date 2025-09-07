"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export default function TestMeetingsPage() {
  const router = useRouter()

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Test Meetings Page</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>If you can see this page, routing is working correctly.</p>
          
          <div className="space-y-2">
            <p><strong>Current URL:</strong> {typeof window !== 'undefined' ? window.location.href : 'Loading...'}</p>
            <p><strong>API URL:</strong> {process.env.NEXT_PUBLIC_API_URL}</p>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={() => router.push('/meetings')}>
              Go to Real Meetings Page
            </Button>
            <Button onClick={() => router.push('/')} variant="outline">
              Go to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}