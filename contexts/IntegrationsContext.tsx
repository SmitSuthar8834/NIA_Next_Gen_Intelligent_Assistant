'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

interface CreatioConfig {
  id?: string
  base_url: string
  base_identity_url: string
  client_id: string
  client_secret: string
  collection_name: string
}

interface IntegrationsContextType {
  creatioConfig: CreatioConfig | null
  loading: boolean
  error: string
  loadCreatioConfig: () => Promise<void>
  saveCreatioConfig: (config: CreatioConfig) => Promise<boolean>
  syncLeads: () => Promise<{ success: boolean; message: string; synced_leads?: number }>
}

const IntegrationsContext = createContext<IntegrationsContextType | undefined>(undefined)

export function IntegrationsProvider({ children }: { children: React.ReactNode }) {
  const [creatioConfig, setCreatioConfig] = useState<CreatioConfig | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadCreatioConfig = async () => {
    setLoading(true)
    setError('')
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('No active session')
        return
      }

      const response = await fetch('http://localhost:8000/integrations/creatio/config', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setCreatioConfig({
          id: data.id,
          base_url: data.base_url,
          base_identity_url: data.base_identity_url,
          client_id: data.client_id,
          client_secret: '••••••••', // Mask the secret
          collection_name: data.collection_name
        })
      } else if (response.status === 404) {
        // No config found, that's okay
        setCreatioConfig(null)
      } else {
        setError('Failed to load configuration')
      }
    } catch (err) {
      console.error('Error loading config:', err)
      setError('Error loading configuration')
    } finally {
      setLoading(false)
    }
  }

  const saveCreatioConfig = async (config: CreatioConfig): Promise<boolean> => {
    setLoading(true)
    setError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('No active session')
        return false
      }

      const response = await fetch('http://localhost:8000/integrations/creatio/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(config)
      })

      if (response.ok) {
        await loadCreatioConfig() // Reload to get the masked secret
        return true
      } else {
        const errorData = await response.json()
        setError(errorData.detail || 'Failed to save configuration')
        return false
      }
    } catch (err) {
      console.error('Error saving config:', err)
      setError('Error saving configuration')
      return false
    } finally {
      setLoading(false)
    }
  }

  const syncLeads = async (): Promise<{ success: boolean; message: string; synced_leads?: number }> => {
    setLoading(true)
    setError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('No active session')
        return { success: false, message: 'No active session found. Please log in again.' }
      }

      console.log('Starting sync with session:', session.user?.email)

      const response = await fetch('http://localhost:8000/integrations/creatio/sync-leads', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('Response status:', response.status)
      const responseText = await response.text()
      console.log('Response body:', responseText)

      if (response.ok) {
        const data = JSON.parse(responseText)
        return {
          success: true,
          message: data.message,
          synced_leads: data.synced_leads
        }
      } else {
        try {
          const errorData = JSON.parse(responseText)
          const errorMessage = `Sync failed: ${errorData.detail || errorData.message || 'Unknown error'}`
          setError(errorMessage)
          return { success: false, message: errorMessage }
        } catch {
          const errorMessage = `Sync failed with status ${response.status}: ${responseText}`
          setError(errorMessage)
          return { success: false, message: errorMessage }
        }
      }
    } catch (err: any) {
      console.error('Sync error:', err)
      const errorMessage = `Network error: ${err.message || 'Failed to connect to backend'}`
      setError(errorMessage)
      return { success: false, message: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  // Load config on mount
  useEffect(() => {
    loadCreatioConfig()
  }, [])

  const value: IntegrationsContextType = {
    creatioConfig,
    loading,
    error,
    loadCreatioConfig,
    saveCreatioConfig,
    syncLeads
  }

  return (
    <IntegrationsContext.Provider value={value}>
      {children}
    </IntegrationsContext.Provider>
  )
}

export function useIntegrations() {
  const context = useContext(IntegrationsContext)
  if (context === undefined) {
    throw new Error('useIntegrations must be used within an IntegrationsProvider')
  }
  return context
}