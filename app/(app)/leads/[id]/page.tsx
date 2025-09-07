'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Save, ArrowLeft, Edit, CheckCircle, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import RequireAuth from '@/components/RequireAuth'

interface Lead {
  id: string
  name: string
  email?: string
  phone?: string
  company?: string
  status: string
  source: string
  lead_name?: string
  contact_name?: string
  business_phone?: string
  website?: string
  address?: string
  job_title?: string
  budget?: number
  score?: number
  commentary?: string
  creatio_created_on?: string
  creatio_modified_on?: string
  status_id?: string
  qualify_status_id?: string
  created_at: string
  updated_at: string
}

export default function LeadDetailPage() {
  const params = useParams()
  const router = useRouter()
  const leadId = params.id as string

  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadLead()
  }, [leadId])

  const loadLead = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`http://localhost:8000/leads/${leadId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setLead(data)
      } else {
        setError('Failed to load lead details')
      }
    } catch (err) {
      setError('Error loading lead')
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const saveLead = async () => {
    if (!lead) return
    
    setSaving(true)
    setError('')
    setMessage('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`http://localhost:8000/leads/${leadId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(lead)
      })

      if (response.ok) {
        setMessage('Lead updated successfully!')
        setEditing(false)
        loadLead() // Reload to get updated data
      } else {
        const errorData = await response.json()
        setError(errorData.detail || 'Failed to update lead')
      }
    } catch (err) {
      setError('Error updating lead')
      console.error('Error:', err)
    } finally {
      setSaving(false)
    }
  }

  const updateField = (field: keyof Lead, value: any) => {
    if (!lead) return
    setLead({ ...lead, [field]: value })
  }

  if (loading) {
    return (
      <RequireAuth>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </RequireAuth>
    )
  }

  if (!lead) {
    return (
      <RequireAuth>
        <div className="text-center py-8">
          <h2 className="text-2xl font-bold">Lead not found</h2>
          <Button onClick={() => router.back()} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>
      </RequireAuth>
    )
  }

  return (
    <RequireAuth>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Leads
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{lead.lead_name || lead.name}</h1>
              <p className="text-muted-foreground">{lead.company}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={lead.source === 'creatio' ? 'default' : 'secondary'}>
              {lead.source === 'creatio' ? '🏢 Creatio' : '✏️ Manual'}
            </Badge>
            {editing ? (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
                <Button onClick={saveLead} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            ) : (
              <Button onClick={() => setEditing(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Lead
              </Button>
            )}
          </div>
        </div>

        {message && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Lead Name</Label>
                  {editing ? (
                    <Input
                      value={lead.lead_name || ''}
                      onChange={(e) => updateField('lead_name', e.target.value)}
                    />
                  ) : (
                    <p className="text-sm mt-1">{lead.lead_name || '-'}</p>
                  )}
                </div>
                <div>
                  <Label>Contact Name</Label>
                  {editing ? (
                    <Input
                      value={lead.contact_name || ''}
                      onChange={(e) => updateField('contact_name', e.target.value)}
                    />
                  ) : (
                    <p className="text-sm mt-1">{lead.contact_name || '-'}</p>
                  )}
                </div>
              </div>

              <div>
                <Label>Company</Label>
                {editing ? (
                  <Input
                    value={lead.company || ''}
                    onChange={(e) => updateField('company', e.target.value)}
                  />
                ) : (
                  <p className="text-sm mt-1">{lead.company || '-'}</p>
                )}
              </div>

              <div>
                <Label>Job Title</Label>
                {editing ? (
                  <Input
                    value={lead.job_title || ''}
                    onChange={(e) => updateField('job_title', e.target.value)}
                  />
                ) : (
                  <p className="text-sm mt-1">{lead.job_title || '-'}</p>
                )}
              </div>

              <div>
                <Label>Status</Label>
                {editing ? (
                  <Select value={lead.status} onValueChange={(value) => updateField('status', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="qualified">Qualified</SelectItem>
                      <SelectItem value="closed won">Closed Won</SelectItem>
                      <SelectItem value="closed lost">Closed Lost</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge className="mt-1">{lead.status}</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Email</Label>
                {editing ? (
                  <Input
                    type="email"
                    value={lead.email || ''}
                    onChange={(e) => updateField('email', e.target.value)}
                  />
                ) : (
                  <p className="text-sm mt-1">{lead.email || '-'}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Mobile Phone</Label>
                  {editing ? (
                    <Input
                      value={lead.phone || ''}
                      onChange={(e) => updateField('phone', e.target.value)}
                    />
                  ) : (
                    <p className="text-sm mt-1">{lead.phone || '-'}</p>
                  )}
                </div>
                <div>
                  <Label>Business Phone</Label>
                  {editing ? (
                    <Input
                      value={lead.business_phone || ''}
                      onChange={(e) => updateField('business_phone', e.target.value)}
                    />
                  ) : (
                    <p className="text-sm mt-1">{lead.business_phone || '-'}</p>
                  )}
                </div>
              </div>

              <div>
                <Label>Website</Label>
                {editing ? (
                  <Input
                    value={lead.website || ''}
                    onChange={(e) => updateField('website', e.target.value)}
                  />
                ) : (
                  <p className="text-sm mt-1">
                    {lead.website ? (
                      <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {lead.website}
                      </a>
                    ) : '-'}
                  </p>
                )}
              </div>

              <div>
                <Label>Address</Label>
                {editing ? (
                  <Textarea
                    value={lead.address || ''}
                    onChange={(e) => updateField('address', e.target.value)}
                    rows={3}
                  />
                ) : (
                  <p className="text-sm mt-1">{lead.address || '-'}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Sales Information */}
          <Card>
            <CardHeader>
              <CardTitle>Sales Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Budget</Label>
                  {editing ? (
                    <Input
                      type="number"
                      step="0.01"
                      value={lead.budget || 0}
                      onChange={(e) => updateField('budget', parseFloat(e.target.value) || 0)}
                    />
                  ) : (
                    <p className="text-sm mt-1">${lead.budget || 0}</p>
                  )}
                </div>
                <div>
                  <Label>Score</Label>
                  {editing ? (
                    <Input
                      type="number"
                      step="0.1"
                      value={lead.score || 0}
                      onChange={(e) => updateField('score', parseFloat(e.target.value) || 0)}
                    />
                  ) : (
                    <p className="text-sm mt-1">{lead.score || 0}</p>
                  )}
                </div>
              </div>

              <div>
                <Label>Commentary</Label>
                {editing ? (
                  <Textarea
                    value={lead.commentary || ''}
                    onChange={(e) => updateField('commentary', e.target.value)}
                    rows={4}
                  />
                ) : (
                  <p className="text-sm mt-1">{lead.commentary || '-'}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* System Information */}
          <Card>
            <CardHeader>
              <CardTitle>System Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Created</Label>
                  <p className="text-sm mt-1">{new Date(lead.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <Label>Updated</Label>
                  <p className="text-sm mt-1">{new Date(lead.updated_at).toLocaleString()}</p>
                </div>
              </div>

              {lead.creatio_created_on && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Creatio Created</Label>
                    <p className="text-sm mt-1">{new Date(lead.creatio_created_on).toLocaleString()}</p>
                  </div>
                  {lead.creatio_modified_on && (
                    <div>
                      <Label>Creatio Modified</Label>
                      <p className="text-sm mt-1">{new Date(lead.creatio_modified_on).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              )}

              <div>
                <Label>Source</Label>
                <p className="text-sm mt-1">{lead.source}</p>
              </div>

              {lead.status_id && (
                <div>
                  <Label>Status ID</Label>
                  <p className="text-sm mt-1 font-mono text-xs">{lead.status_id}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </RequireAuth>
  )
}