"use client"

import { useEffect, useState } from "react"
import { useUser } from "./useUser"

export interface Meeting {
  id: string
  user_id: string
  lead_id?: string
  subject: string
  meeting_time?: string
  meeting_link?: string
  duration?: number
  event_id?: string
  transcript?: string
  summary?: string
  created_at: string
  updated_at: string
}

export interface SyncResult {
  status: string
  synced_meetings: number
  total_meetings: number
  errors: string[]
  message: string
}

export function useMeetings() {
  const { user, access_token } = useUser()
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMeetings = async () => {
    if (!access_token) return

    try {
      setLoading(true)
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

  const syncTeamsMeetings = async (): Promise<SyncResult | null> => {
    if (!access_token) return null

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/meetings/sync`, {
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      })

      if (response.ok) {
        const result = await response.json()
        // Refresh meetings after sync
        await fetchMeetings()
        return result
      } else {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to sync meetings')
      }
    } catch (err) {
      throw err
    }
  }

  const getMeetingTranscript = async (meetingId: string) => {
    if (!access_token) return null

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/meetings/transcript/${meetingId}`, {
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      })

      if (response.ok) {
        return await response.json()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to get transcript')
      }
    } catch (err) {
      throw err
    }
  }

  const summarizeMeeting = async (meetingId: string) => {
    if (!access_token) return null

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/meetings/summarize/${meetingId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      })

      if (response.ok) {
        return await response.json()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to summarize meeting')
      }
    } catch (err) {
      throw err
    }
  }

  useEffect(() => {
    if (access_token) {
      fetchMeetings()
    }
  }, [access_token])

  // Helper functions for filtering meetings
  const upcomingMeetings = meetings.filter(m => {
    if (!m.meeting_time) return false
    return new Date(m.meeting_time) > new Date()
  })

  const pastMeetings = meetings.filter(m => {
    if (!m.meeting_time) return true // Meetings without time are considered past
    return new Date(m.meeting_time) <= new Date()
  })

  return {
    meetings,
    upcomingMeetings,
    pastMeetings,
    loading,
    error,
    refetch: fetchMeetings,
    syncTeamsMeetings,
    getMeetingTranscript,
    summarizeMeeting
  }
}