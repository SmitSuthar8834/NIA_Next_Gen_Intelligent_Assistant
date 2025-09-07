"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

export interface Lead {
  id: number
  creatio_id?: string | null
  user_id?: string | null
  name: string
  company: string
  email: string
  phone?: string
  status: string
  source?: string
  created_at: string
  // Extended fields that might come from Creatio or other sources
  lead_name?: string
  contact_name?: string
  job_title?: string
  business_phone?: string
  website?: string
  address?: string
  score?: number
  budget?: number
  creatio_created_on?: string
}

export interface Meeting {
  id: number
  user_id: string | null
  title: string
  description: string | null
  start_time: string
  end_time: string
  meeting_url: string | null
  status: string
  created_at: string
}

export interface Summary {
  id: number
  user_id: string | null
  meeting_id: number | null
  title: string
  content: string
  key_points: string[] | null
  action_items: string[] | null
  created_at: string
}

export function useRealtimeLeads() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          setError("No authenticated user")
          setLoading(false)
          return
        }

        const { data, error } = await supabase
          .from("leads")
          .select("*")
          .eq("user_id", user.id) // Filter by current user
          .order("created_at", { ascending: false })

        if (error) throw error
        setLeads(data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setLoading(false)
      }
    }

    fetchLeads()

    // Set up real-time subscription
    const subscription = supabase
      .channel("leads_changes")
      .on("postgres_changes", 
        { event: "*", schema: "public", table: "leads" },
        (payload) => {
          // Get current user to filter real-time updates
          supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) return
            
            // Only process changes for current user's leads
            const leadData = payload.new as Lead
            if (leadData.user_id !== user.id) return
            
            if (payload.eventType === "INSERT") {
              setLeads(prev => [payload.new as Lead, ...prev])
            } else if (payload.eventType === "UPDATE") {
              setLeads(prev => prev.map(lead => 
                lead.id === payload.new.id ? payload.new as Lead : lead
              ))
            } else if (payload.eventType === "DELETE") {
              setLeads(prev => prev.filter(lead => lead.id !== payload.old.id))
            }
          })
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return { leads, loading, error, refetch: () => window.location.reload() }
}

export function useRealtimeMeetings() {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchMeetings = async () => {
      try {
        const { data, error } = await supabase
          .from("meetings")
          .select("*")
          .order("start_time", { ascending: false })

        if (error) throw error
        setMeetings(data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setLoading(false)
      }
    }

    fetchMeetings()

    // Set up real-time subscription
    const subscription = supabase
      .channel("meetings_changes")
      .on("postgres_changes", 
        { event: "*", schema: "public", table: "meetings" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setMeetings(prev => [payload.new as Meeting, ...prev])
          } else if (payload.eventType === "UPDATE") {
            setMeetings(prev => prev.map(meeting => 
              meeting.id === payload.new.id ? payload.new as Meeting : meeting
            ))
          } else if (payload.eventType === "DELETE") {
            setMeetings(prev => prev.filter(meeting => meeting.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return { meetings, loading, error, refetch: () => window.location.reload() }
}

export function useRealtimeSummaries() {
  const [summaries, setSummaries] = useState<Summary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSummaries = async () => {
      try {
        const { data, error } = await supabase
          .from("summaries")
          .select("*")
          .order("created_at", { ascending: false })

        if (error) throw error
        setSummaries(data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setLoading(false)
      }
    }

    fetchSummaries()

    // Set up real-time subscription
    const subscription = supabase
      .channel("summaries_changes")
      .on("postgres_changes", 
        { event: "*", schema: "public", table: "summaries" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setSummaries(prev => [payload.new as Summary, ...prev])
          } else if (payload.eventType === "UPDATE") {
            setSummaries(prev => prev.map(summary => 
              summary.id === payload.new.id ? payload.new as Summary : summary
            ))
          } else if (payload.eventType === "DELETE") {
            setSummaries(prev => prev.filter(summary => summary.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return { summaries, loading, error, refetch: () => window.location.reload() }
}

export function useAuth() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return { user, loading, signOut }
}