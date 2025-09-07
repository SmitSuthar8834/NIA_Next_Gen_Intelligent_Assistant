'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

interface CreatioConfig {
  id?: string
  base_url: string
  base_identity_url: string
  client_id: string
  client_secret: string
  collection_name: string
}

export default function CreatioConfig() {
  const [config, setConfig] = useState<CreatioConfig>({
    base_url: '',
    base_identity_url: '',
    client_id: '',
    client_secret: '',
    collection_name: 'LeadCollection'
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('http://localhost:8000/integrations/creatio/config', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setConfig({
          id: data.id,
          base_url: data.base_url,
          base_identity_url: data.base_identity_url,
          client_id: data.client_id,
          client_secret: '••••••••', // Mask the secret
          collection_name: data.collection_name
        })
      }
    } catch (err) {
      console.error('Error loading config:', err)
    } finally {
      setLoading(false)
    }
  }

  const saveConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('http://localhost:8000/integrations/creatio/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          base_url: config.base_url,
          base_identity_url: config.base_identity_url,
          client_id: config.client_id,
          client_secret: config.client_secret,
          collection_name: config.collection_name
        })
      })

      if (response.ok) {
        setMessage('Creatio configuration saved successfully!')
        loadConfig() // Reload to get the masked secret
      } else {
        const errorData = await response.json()
        setError(errorData.detail || 'Failed to save configuration')
      }
    } catch (err) {
      setError('Error saving configuration')
      console.error('Error:', err)
    } finally {
      setSaving(false)
    }
  }

  const syncLeads = async () => {
    setSyncing(true)
    setError('')
    setMessage('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('http://localhost:8000/integrations/creatio/sync-leads', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setMessage(`${data.message} (${data.synced_leads} leads synced)`)
      } else {
        const errorData = await response.json()
        setError(errorData.detail || 'Failed to sync leads')
      }
    } catch (err) {
      setError('Error syncing leads')
      console.error('Error:', err)
    } finally {
      setSyncing(false)
    }
  }

  if (loading) {
    return <div className="p-6">Loading configuration...</div>
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Creatio CRM Integration</h2>
      
      <form onSubmit={saveConfig} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Base URL
          </label>
          <input
            type="url"
            value={config.base_url}
            onChange={(e) => setConfig({ ...config, base_url: e.target.value })}
            placeholder="https://mycreatio.com"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
          <p className="text-sm text-gray-500 mt-1">Your Creatio instance URL</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Identity Service URL
          </label>
          <input
            type="url"
            value={config.base_identity_url}
            onChange={(e) => setConfig({ ...config, base_identity_url: e.target.value })}
            placeholder="https://myidentityservice"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
          <p className="text-sm text-gray-500 mt-1">OAuth identity service URL</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Client ID
          </label>
          <input
            type="text"
            value={config.client_id}
            onChange={(e) => setConfig({ ...config, client_id: e.target.value })}
            placeholder="Your OAuth client ID"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Client Secret
          </label>
          <input
            type="password"
            value={config.client_secret}
            onChange={(e) => setConfig({ ...config, client_secret: e.target.value })}
            placeholder="Your OAuth client secret"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Collection Name
          </label>
          <input
            type="text"
            value={config.collection_name}
            onChange={(e) => setConfig({ ...config, collection_name: e.target.value })}
            placeholder="LeadCollection"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
          <p className="text-sm text-gray-500 mt-1">Creatio entity collection name (usually LeadCollection)</p>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>

          <button
            type="button"
            onClick={syncLeads}
            disabled={syncing || !config.base_url}
            className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncing ? 'Syncing...' : 'Sync Leads'}
          </button>
        </div>
      </form>

      {message && (
        <div className="mt-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
          {message}
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">How it works:</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Configure your Creatio OAuth credentials above</li>
          <li>• Click "Sync Leads" to fetch leads where you are the owner</li>
          <li>• Leads are filtered by your email address</li>
          <li>• Existing leads will be updated, new ones will be created</li>
        </ul>
      </div>
    </div>
  )
}