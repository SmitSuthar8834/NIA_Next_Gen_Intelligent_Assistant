"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Mail, 
  Send, 
  Eye, 
  Settings, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Clock,
  User,
  Calendar,
  TestTube,
  RefreshCw
} from "lucide-react"
import { useUser } from "@/hooks/useUser"

interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
  type: 'invitation' | 'reminder' | 'ai_joined' | 'summary'
  variables: string[]
}

interface EmailSettings {
  notifications_enabled: boolean
  send_invitations: boolean
  send_reminders: boolean
  send_ai_notifications: boolean
  send_summaries: boolean
  reminder_minutes_before: number
  from_name: string
  from_email: string
  reply_to_email: string
}

interface EmailDeliveryStatus {
  id: string
  recipient_email: string
  template_type: string
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced'
  sent_at: string
  delivered_at?: string
  error_message?: string
  meeting_id: string
}

export default function EmailNotificationSettings() {
  const { user, access_token } = useUser()
  
  // Settings state
  const [settings, setSettings] = useState<EmailSettings>({
    notifications_enabled: true,
    send_invitations: true,
    send_reminders: true,
    send_ai_notifications: true,
    send_summaries: true,
    reminder_minutes_before: 15,
    from_name: "",
    from_email: "",
    reply_to_email: ""
  })
  
  // Templates state
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)
  const [editingTemplate, setEditingTemplate] = useState<Partial<EmailTemplate> | null>(null)
  
  // Delivery status state
  const [deliveryStatuses, setDeliveryStatuses] = useState<EmailDeliveryStatus[]>([])
  
  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [testEmail, setTestEmail] = useState("")
  const [testingEmail, setTestingEmail] = useState(false)

  useEffect(() => {
    fetchSettings()
    fetchTemplates()
    fetchDeliveryStatuses()
  }, [])

  const fetchSettings = async () => {
    if (!access_token) return

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/email-settings/`, {
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      }
    } catch (err) {
      console.error('Failed to fetch email settings:', err)
    }
  }

  const fetchTemplates = async () => {
    if (!access_token) return

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/email-templates/`, {
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setTemplates(data)
        if (data.length > 0) {
          setSelectedTemplate(data[0])
        }
      }
    } catch (err) {
      console.error('Failed to fetch email templates:', err)
    }
  }

  const fetchDeliveryStatuses = async () => {
    if (!access_token) return

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/email-delivery-status/`, {
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setDeliveryStatuses(data)
      }
    } catch (err) {
      console.error('Failed to fetch delivery statuses:', err)
    }
  }

  const updateSettings = async () => {
    if (!access_token) return

    try {
      setLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/email-settings/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${access_token}`
        },
        body: JSON.stringify(settings)
      })

      if (response.ok) {
        setSuccess('Email settings updated successfully!')
      } else {
        setError('Failed to update email settings')
      }
    } catch (err) {
      setError('Failed to update email settings')
    } finally {
      setLoading(false)
    }
  }

  const updateTemplate = async () => {
    if (!selectedTemplate || !editingTemplate || !access_token) return

    try {
      setLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/email-templates/${selectedTemplate.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${access_token}`
        },
        body: JSON.stringify(editingTemplate)
      })

      if (response.ok) {
        const updatedTemplate = await response.json()
        setTemplates(prev => 
          prev.map(t => t.id === selectedTemplate.id ? updatedTemplate : t)
        )
        setSelectedTemplate(updatedTemplate)
        setEditingTemplate(null)
        setSuccess('Email template updated successfully!')
      } else {
        setError('Failed to update email template')
      }
    } catch (err) {
      setError('Failed to update email template')
    } finally {
      setLoading(false)
    }
  }

  const sendTestEmail = async () => {
    if (!selectedTemplate || !testEmail || !access_token) return

    try {
      setTestingEmail(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/email-templates/${selectedTemplate.id}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${access_token}`
        },
        body: JSON.stringify({
          recipient_email: testEmail,
          test_data: {
            lead_name: "John Doe",
            company_name: "Acme Corp",
            meeting_date: "December 15, 2024",
            meeting_time: "2:00 PM EST",
            join_link: "https://example.com/meeting/test-room"
          }
        })
      })

      if (response.ok) {
        setSuccess(`Test email sent to ${testEmail}`)
        setTestEmail("")
      } else {
        setError('Failed to send test email')
      }
    } catch (err) {
      setError('Failed to send test email')
    } finally {
      setTestingEmail(false)
    }
  }

  const getStatusBadgeVariant = (status: EmailDeliveryStatus['status']) => {
    switch (status) {
      case 'delivered': return 'default'
      case 'sent': return 'secondary'
      case 'pending': return 'outline'
      case 'failed': case 'bounced': return 'destructive'
      default: return 'outline'
    }
  }

  const getStatusIcon = (status: EmailDeliveryStatus['status']) => {
    switch (status) {
      case 'delivered': return <CheckCircle className="w-3 h-3" />
      case 'sent': return <Send className="w-3 h-3" />
      case 'pending': return <Clock className="w-3 h-3" />
      case 'failed': case 'bounced': return <AlertCircle className="w-3 h-3" />
      default: return <Clock className="w-3 h-3" />
    }
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email Notification Settings
          </CardTitle>
          <CardDescription>
            Configure email notifications for AI meetings
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="settings" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="delivery">Delivery Status</TabsTrigger>
          <TabsTrigger value="testing">Testing</TabsTrigger>
        </TabsList>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Notification Preferences</CardTitle>
              <CardDescription>
                Configure which email notifications to send
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Master Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="notifications-enabled" className="text-base font-medium">
                    Enable Email Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Master switch for all email notifications
                  </p>
                </div>
                <Switch
                  id="notifications-enabled"
                  checked={settings.notifications_enabled}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, notifications_enabled: checked }))
                  }
                />
              </div>

              {settings.notifications_enabled && (
                <>
                  {/* Individual Notification Types */}
                  <div className="space-y-4 pl-4 border-l-2 border-muted">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="send-invitations">Meeting Invitations</Label>
                        <p className="text-sm text-muted-foreground">
                          Send invitation emails when meetings are scheduled
                        </p>
                      </div>
                      <Switch
                        id="send-invitations"
                        checked={settings.send_invitations}
                        onCheckedChange={(checked) => 
                          setSettings(prev => ({ ...prev, send_invitations: checked }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="send-reminders">Meeting Reminders</Label>
                        <p className="text-sm text-muted-foreground">
                          Send reminder emails before meetings start
                        </p>
                      </div>
                      <Switch
                        id="send-reminders"
                        checked={settings.send_reminders}
                        onCheckedChange={(checked) => 
                          setSettings(prev => ({ ...prev, send_reminders: checked }))
                        }
                      />
                    </div>

                    {settings.send_reminders && (
                      <div className="ml-4">
                        <Label htmlFor="reminder-minutes">Reminder Time</Label>
                        <Select 
                          value={settings.reminder_minutes_before.toString()} 
                          onValueChange={(value) => 
                            setSettings(prev => ({ ...prev, reminder_minutes_before: Number(value) }))
                          }
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5">5 minutes before</SelectItem>
                            <SelectItem value="15">15 minutes before</SelectItem>
                            <SelectItem value="30">30 minutes before</SelectItem>
                            <SelectItem value="60">1 hour before</SelectItem>
                            <SelectItem value="1440">1 day before</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="send-ai-notifications">AI Join Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Notify when AI assistant joins the meeting
                        </p>
                      </div>
                      <Switch
                        id="send-ai-notifications"
                        checked={settings.send_ai_notifications}
                        onCheckedChange={(checked) => 
                          setSettings(prev => ({ ...prev, send_ai_notifications: checked }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="send-summaries">Meeting Summaries</Label>
                        <p className="text-sm text-muted-foreground">
                          Send analysis and summary after meetings end
                        </p>
                      </div>
                      <Switch
                        id="send-summaries"
                        checked={settings.send_summaries}
                        onCheckedChange={(checked) => 
                          setSettings(prev => ({ ...prev, send_summaries: checked }))
                        }
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Sender Information */}
              <div className="space-y-4">
                <h4 className="font-medium">Sender Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="from-name">From Name</Label>
                    <Input
                      id="from-name"
                      value={settings.from_name}
                      onChange={(e) => setSettings(prev => ({ ...prev, from_name: e.target.value }))}
                      placeholder="Your Company Name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="from-email">From Email</Label>
                    <Input
                      id="from-email"
                      type="email"
                      value={settings.from_email}
                      onChange={(e) => setSettings(prev => ({ ...prev, from_email: e.target.value }))}
                      placeholder="noreply@yourcompany.com"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="reply-to-email">Reply-To Email</Label>
                  <Input
                    id="reply-to-email"
                    type="email"
                    value={settings.reply_to_email}
                    onChange={(e) => setSettings(prev => ({ ...prev, reply_to_email: e.target.value }))}
                    placeholder="support@yourcompany.com"
                  />
                </div>
              </div>

              <Button onClick={updateSettings} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Settings className="w-4 h-4 mr-2" />
                    Save Settings
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Template List */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Email Templates</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {templates.map((template) => (
                      <div
                        key={template.id}
                        className={`p-3 border rounded-md cursor-pointer transition-colors ${
                          selectedTemplate?.id === template.id
                            ? 'border-primary bg-primary/5'
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => setSelectedTemplate(template)}
                      >
                        <div className="font-medium">{template.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {template.type.replace('_', ' ')}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Template Editor */}
            <div className="lg:col-span-2">
              {selectedTemplate ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{selectedTemplate.name}</CardTitle>
                        <CardDescription>
                          Edit the {selectedTemplate.type.replace('_', ' ')} email template
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowPreview(!showPreview)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Preview
                        </Button>
                        {editingTemplate && (
                          <>
                            <Button size="sm" onClick={updateTemplate} disabled={loading}>
                              <Settings className="w-4 h-4 mr-1" />
                              Save
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingTemplate(null)}
                            >
                              Cancel
                            </Button>
                          </>
                        )}
                        {!editingTemplate && (
                          <Button
                            size="sm"
                            onClick={() => setEditingTemplate(selectedTemplate)}
                          >
                            Edit
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {editingTemplate ? (
                      <>
                        <div>
                          <Label htmlFor="subject">Subject Line</Label>
                          <Input
                            id="subject"
                            value={editingTemplate.subject || ""}
                            onChange={(e) => setEditingTemplate(prev => ({
                              ...prev,
                              subject: e.target.value
                            }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="body">Email Body</Label>
                          <Textarea
                            id="body"
                            rows={12}
                            value={editingTemplate.body || ""}
                            onChange={(e) => setEditingTemplate(prev => ({
                              ...prev,
                              body: e.target.value
                            }))}
                          />
                        </div>
                        <div>
                          <Label>Available Variables</Label>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {selectedTemplate.variables.map((variable) => (
                              <Badge key={variable} variant="outline">
                                {`{{${variable}}}`}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <Label>Subject Line</Label>
                          <div className="p-2 border rounded-md bg-muted/30">
                            {selectedTemplate.subject}
                          </div>
                        </div>
                        <div>
                          <Label>Email Body</Label>
                          <div className="p-3 border rounded-md bg-muted/30 whitespace-pre-wrap text-sm">
                            {selectedTemplate.body}
                          </div>
                        </div>
                        <div>
                          <Label>Available Variables</Label>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {selectedTemplate.variables.map((variable) => (
                              <Badge key={variable} variant="outline">
                                {`{{${variable}}}`}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Mail className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Template Selected</h3>
                    <p className="text-muted-foreground">
                      Select a template from the list to view and edit it
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Delivery Status Tab */}
        <TabsContent value="delivery" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Email Delivery Status</CardTitle>
                  <CardDescription>
                    Monitor the delivery status of sent emails
                  </CardDescription>
                </div>
                <Button variant="outline" onClick={fetchDeliveryStatuses}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {deliveryStatuses.map((status) => (
                  <div key={status.id} className="flex items-center justify-between p-3 border rounded-md">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(status.status)}
                        <Badge variant={getStatusBadgeVariant(status.status)}>
                          {status.status}
                        </Badge>
                      </div>
                      <div>
                        <div className="font-medium">{status.recipient_email}</div>
                        <div className="text-sm text-muted-foreground">
                          {status.template_type.replace('_', ' ')} • {new Date(status.sent_at).toLocaleString()}
                        </div>
                        {status.error_message && (
                          <div className="text-sm text-red-600 mt-1">
                            {status.error_message}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {status.delivered_at && (
                        <div>Delivered: {new Date(status.delivered_at).toLocaleString()}</div>
                      )}
                    </div>
                  </div>
                ))}
                
                {deliveryStatuses.length === 0 && (
                  <div className="text-center py-8">
                    <Mail className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Email History</h3>
                    <p className="text-muted-foreground">
                      Email delivery status will appear here once you start sending notifications
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Testing Tab */}
        <TabsContent value="testing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TestTube className="w-5 h-5" />
                Email Testing
              </CardTitle>
              <CardDescription>
                Test email templates and troubleshoot delivery issues
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Test Email Sending */}
              <div className="space-y-4">
                <h4 className="font-medium">Send Test Email</h4>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Label htmlFor="template-select">Template</Label>
                    <Select 
                      value={selectedTemplate?.id || ""} 
                      onValueChange={(value) => {
                        const template = templates.find(t => t.id === value)
                        setSelectedTemplate(template || null)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select template to test" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="test-email">Test Email Address</Label>
                    <Input
                      id="test-email"
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="test@example.com"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button 
                      onClick={sendTestEmail} 
                      disabled={!selectedTemplate || !testEmail || testingEmail}
                    >
                      {testingEmail ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Send Test
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* SMTP Configuration Test */}
              <div className="space-y-4">
                <h4 className="font-medium">SMTP Configuration</h4>
                <div className="p-4 border rounded-md bg-muted/30">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">SMTP Host:</span> {process.env.NEXT_PUBLIC_SMTP_HOST || 'Not configured'}
                    </div>
                    <div>
                      <span className="font-medium">SMTP Port:</span> {process.env.NEXT_PUBLIC_SMTP_PORT || 'Not configured'}
                    </div>
                    <div>
                      <span className="font-medium">From Email:</span> {settings.from_email || 'Not configured'}
                    </div>
                    <div>
                      <span className="font-medium">Reply-To:</span> {settings.reply_to_email || 'Not configured'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Troubleshooting Tips */}
              <div className="space-y-4">
                <h4 className="font-medium">Troubleshooting Tips</h4>
                <div className="space-y-2 text-sm">
                  <div className="p-3 border rounded-md">
                    <div className="font-medium mb-1">Emails not being sent?</div>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>Check SMTP configuration in environment variables</li>
                      <li>Verify from_email and reply_to_email are valid</li>
                      <li>Ensure email notifications are enabled in settings</li>
                      <li>Check server logs for detailed error messages</li>
                    </ul>
                  </div>
                  <div className="p-3 border rounded-md">
                    <div className="font-medium mb-1">Emails going to spam?</div>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>Set up SPF, DKIM, and DMARC records for your domain</li>
                      <li>Use a reputable SMTP service (SendGrid, Mailgun, etc.)</li>
                      <li>Avoid spam trigger words in subject lines and content</li>
                      <li>Include unsubscribe links in email templates</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Error/Success Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}