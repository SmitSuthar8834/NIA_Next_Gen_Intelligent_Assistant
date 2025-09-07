"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle } from "lucide-react"
import { useUser } from "@/hooks/useUser"

export default function SimpleMeetingsPage() {
    const { user, access_token } = useUser()
    const [meetings, setMeetings] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchMeetings = async () => {
            if (!access_token) {
                setError("Not authenticated")
                setLoading(false)
                return
            }

            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/meetings/`, {
                    headers: {
                        'Authorization': `Bearer ${access_token}`
                    }
                })

                if (response.ok) {
                    const data = await response.json()
                    setMeetings(data)
                    setError(null)
                } else {
                    const errorData = await response.json()
                    setError(errorData.detail || 'Failed to fetch meetings')
                }
            } catch (err) {
                setError('Failed to fetch meetings')
            } finally {
                setLoading(false)
            }
        }

        fetchMeetings()
    }, [access_token])

    if (loading) {
        return (
            <div className="container mx-auto p-6">
                <Card>
                    <CardContent className="flex items-center justify-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin mr-2" />
                        <span>Loading meetings...</span>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Simple Meetings Test</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <p><strong>User authenticated:</strong> {access_token ? 'Yes' : 'No'}</p>
                        <p><strong>User email:</strong> {user?.email || 'Not available'}</p>
                        <p><strong>API URL:</strong> {process.env.NEXT_PUBLIC_API_URL}</p>
                        <p><strong>Meetings count:</strong> {meetings.length}</p>
                    </div>

                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {meetings.length > 0 ? (
                        <div className="space-y-2">
                            <h3 className="font-semibold">Meetings:</h3>
                            {meetings.map((meeting: any, index) => (
                                <Card key={index} className="p-4">
                                    <p><strong>Subject:</strong> {meeting.subject || 'No subject'}</p>
                                    <p><strong>ID:</strong> {meeting.id}</p>
                                    <p><strong>Created:</strong> {new Date(meeting.created_at).toLocaleString()}</p>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <p>No meetings found.</p>
                    )}

                    <Button onClick={() => window.location.href = '/meetings'}>
                        Try Full Meetings Page
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}