'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Settings, Zap, CheckCircle, AlertCircle } from 'lucide-react'
import { useIntegrations } from '@/contexts/IntegrationsContext'
import RequireAuth from '@/components/RequireAuth'
import TeamsConfig from '@/components/TeamsConfig'

function CreatioIntegration() {
  const { 
    creatioConfig, 
    loading, 
    error, 
    saveCreatioConfig, 
    syncLeads 
  } = useIntegrations()

  const [config, setConfig] = useState({
    base_url: '',
    base_identity_url: '',
    client_id: '',
    client_secret: '',
    collection_name: 'Lead'
  })
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState('')
  const [localError, setLocalError] = useState('')

  // Update local config when context config changes
  useEffect(() => {
    if (creatioConfig) {
      setConfig(creatioConfig)
    }
  }, [creatioConfig])

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setLocalError('')
    setMessage('')

    const success = await saveCreatioConfig(config)
    if (success) {
      setMessage('Creatio configuration saved successfully!')
    } else {
      setLocalError('Failed to save configuration')
    }
    setSaving(false)
  }

  const handleSyncLeads = async () => {
    setSyncing(true)
    setLocalError('')
    setMessage('')

    const result = await syncLeads()
    if (result.success) {
      setMessage(`${result.message} (${result.synced_leads} leads synced)`)
    } else {
      setLocalError(result.message)
    }
    setSyncing(false)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            🏢
          </div>
          <div>
            <CardTitle>Creatio CRM</CardTitle>
            <CardDescription>Sync leads from your Creatio CRM system</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSaveConfig} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="base_url">Base URL</Label>
              <Input
                id="base_url"
                type="url"
                value={config.base_url}
                onChange={(e) => setConfig({ ...config, base_url: e.target.value })}
                placeholder="https://mycreatio.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="base_identity_url">Identity Service URL</Label>
              <Input
                id="base_identity_url"
                type="url"
                value={config.base_identity_url}
                onChange={(e) => setConfig({ ...config, base_identity_url: e.target.value })}
                placeholder="https://myidentityservice"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client_id">Client ID</Label>
              <Input
                id="client_id"
                value={config.client_id}
                onChange={(e) => setConfig({ ...config, client_id: e.target.value })}
                placeholder="Your OAuth client ID"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client_secret">Client Secret</Label>
              <Input
                id="client_secret"
                type="password"
                value={config.client_secret}
                onChange={(e) => setConfig({ ...config, client_secret: e.target.value })}
                placeholder="Your OAuth client secret"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="collection_name">Collection Name</Label>
            <Input
              id="collection_name"
              value={config.collection_name}
              onChange={(e) => setConfig({ ...config, collection_name: e.target.value })}
              placeholder="LeadCollection"
              required
            />
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={saving} className="flex-1">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Configuration
            </Button>
            <Button 
              type="button" 
              onClick={handleSyncLeads} 
              disabled={syncing || !config.base_url}
              variant="outline"
              className="flex-1"
            >
              {syncing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sync Leads
            </Button>
          </div>
        </form>

        {message && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        {(localError || error) && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{localError || error}</AlertDescription>
          </Alert>
        )}

        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold mb-2">How it works:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Configure your Creatio OAuth credentials above</li>
            <li>• Click "Sync Leads" to fetch leads where you are the owner</li>
            <li>• Leads are filtered by your email address</li>
            <li>• Existing leads will be updated, new ones will be created</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

export default function IntegrationsPage() {
  return (
    <RequireAuth>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Integrations</h1>
          <p className="text-muted-foreground mt-2">Connect your external services and tools</p>
        </div>

        <Tabs defaultValue="creatio" className="space-y-6">
          <TabsList>
            <TabsTrigger value="creatio" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Creatio CRM
            </TabsTrigger>
            <TabsTrigger value="teams" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Microsoft Teams
            </TabsTrigger>
            <TabsTrigger value="ai" disabled className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              AI Processing
              <Badge variant="secondary" className="ml-2">Coming Soon</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="creatio">
            <CreatioIntegration />
          </TabsContent>

          <TabsContent value="teams">
            <TeamsConfig />
          </TabsContent>

          <TabsContent value="ai">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    🤖
                  </div>
                  <div>
                    <CardTitle>AI Processing</CardTitle>
                    <CardDescription>Automatically summarize transcripts and extract insights</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Coming soon...</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </RequireAuth>
  )
}