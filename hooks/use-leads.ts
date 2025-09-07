"use client"

import { useEffect, useState } from "react"
import { useUser } from "./useUser"
import { Lead, MeetingHistoryItem } from "@/types/meetings"

export function useLeads() {
  const { user, access_token } = useUser()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLeads = async (includeMeetingHistory = false) => {
    if (!access_token) return

    try {
      setLoading(true)
      const url = `${process.env.NEXT_PUBLIC_API_URL}/leads/${includeMeetingHistory ? '?include_meeting_history=true' : ''}`
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setLeads(data)
        setError(null)
      } else {
        const errorData = await response.json()
        setError(errorData.detail || 'Failed to fetch leads')
      }
    } catch (err) {
      setError('Failed to fetch leads')
    } finally {
      setLoading(false)
    }
  }

  const createLead = async (leadData: Partial<Lead>): Promise<Lead | null> => {
    if (!access_token) return null

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/leads/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${access_token}`
        },
        body: JSON.stringify(leadData)
      })

      if (response.ok) {
        const newLead = await response.json()
        setLeads(prev => [newLead, ...prev])
        return newLead
      } else {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to create lead')
      }
    } catch (err) {
      throw err
    }
  }

  const updateLead = async (leadId: string, leadData: Partial<Lead>): Promise<Lead | null> => {
    if (!access_token) return null

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/leads/${leadId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${access_token}`
        },
        body: JSON.stringify(leadData)
      })

      if (response.ok) {
        const updatedLead = await response.json()
        setLeads(prev => prev.map(lead => lead.id === leadId ? updatedLead : lead))
        return updatedLead
      } else {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to update lead')
      }
    } catch (err) {
      throw err
    }
  }

  const deleteLead = async (leadId: string): Promise<boolean> => {
    if (!access_token) return false

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/leads/${leadId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      })

      if (response.ok) {
        setLeads(prev => prev.filter(lead => lead.id !== leadId))
        return true
      } else {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to delete lead')
      }
    } catch (err) {
      throw err
    }
  }

  useEffect(() => {
    if (access_token) {
      fetchLeads()
    }
  }, [access_token])

  const getLeadMeetingHistory = async (leadId: string): Promise<MeetingHistoryItem[]> => {
    if (!access_token) return []

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/leads/${leadId}/meeting-history`, {
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        return data.meeting_history || []
      }

      return []
    } catch (err) {
      console.error('Failed to fetch meeting history:', err)
      return []
    }
  }

  const searchLeadTranscripts = async (leadId: string, query: string) => {
    if (!access_token) return { results: [], total: 0 }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/real-time-analysis/search-conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${access_token}`
        },
        body: JSON.stringify({
          query: query,
          lead_id: leadId
        })
      })

      if (response.ok) {
        return await response.json()
      }

      return { results: [], total: 0 }
    } catch (err) {
      console.error('Failed to search transcripts:', err)
      return { results: [], total: 0 }
    }
  }

  return {
    leads,
    loading,
    error,
    refetch: fetchLeads,
    createLead,
    updateLead,
    deleteLead,
    getLeadMeetingHistory,
    searchLeadTranscripts
  }
}