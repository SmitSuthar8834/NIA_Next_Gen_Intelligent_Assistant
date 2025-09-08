"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Building, 
  Mail, 
  Phone,
  CheckCircle,
  AlertCircle,
  Loader2
} from "lucide-react"
import { format, addDays, setHours, setMinutes } from "date-fns"
import { useUser } from "@/hooks/useUser"
import { useLeads } from "@/hooks/use-leads"
import { ScheduledMeeting, QuestionSet, Lead } from "@/types/meetings"

interface MeetingSchedulerProps {
  onMeetingScheduled?: (meeting: ScheduledMeeting) => void
  onClose?: () => void
  preselectedLeadId?: string
  preselectedDate?: Date
  allowNewLead?: boolean
}

export default function MeetingScheduler({ 
  onMeetingScheduled, 
  onClose, 
  preselectedLeadId,
  preselectedDate,
  allowNewLead = false
}: MeetingSchedulerProps) {
  const { user, access_token } = useUser()
  const { leads, loading: leadsLoading } = useLeads()
  
  // Form state
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [selectedTime, setSelectedTime] = useState<string>("")
  const [duration, setDuration] = useState<number>(60)
  const [selectedQuestionSet, setSelectedQuestionSet] = useState<string>("")
  const [timezone, setTimezone] = useState<string>("")
  
  // New lead form state
  const [showNewLeadForm, setShowNewLeadForm] = useState(false)
  const [newLeadData, setNewLeadData] = useState({
    name: "",
    email: "",
    company: "",
    phone: "",
    status: "new"
  })
  
  // Data state
  const [questionSets, setQuestionSets] = useState<QuestionSet[]>([])
  const [availableTimezones] = useState<string[]>([
    "America/New_York",
    "America/Chicago", 
    "America/Denver",
    "America/Los_Angeles",
    "Europe/London",
    "Europe/Paris",
    "Asia/Tokyo",
    "Australia/Sydney"
  ])
  
  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showCalendar, setShowCalendar] = useState(false)
  
  // Time slots for selection
  const getAllTimeSlots = () => {
    return Array.from({ length: 24 }, (_, i) => {
      const hour = i.toString().padStart(2, '0')
      return [
        `${hour}:00`,
        `${hour}:30`
      ]
    }).flat()
  }

  const [timeSlots, setTimeSlots] = useState<string[]>([])

  // Filter time slots based on selected date
  const updateTimeSlots = useCallback(() => {
    const allSlots = getAllTimeSlots()
    
    if (!selectedDate) {
      setTimeSlots(allSlots)
      return
    }
    
    const now = new Date()
    const isToday = selectedDate.toDateString() === now.toDateString()
    
    if (!isToday) {
      setTimeSlots(allSlots)
      return
    }
    
    // For today, filter out past times
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    
    const availableSlots = allSlots.filter(slot => {
      const [hours, minutes] = slot.split(':').map(Number)
      const slotTime = hours * 60 + minutes
      const currentTime = currentHour * 60 + currentMinute + 5 // Add 5 minutes buffer
      
      return slotTime > currentTime
    })
    
    setTimeSlots(availableSlots)
    
    // Clear selected time if it's no longer available
    if (selectedTime && !availableSlots.includes(selectedTime)) {
      setSelectedTime("")
    }
  }, [selectedDate, selectedTime])

  // Update time slots when selected date changes
  useEffect(() => {
    updateTimeSlots()
  }, [updateTimeSlots])

  // Initialize timezone, preselected lead, and date
  useEffect(() => {
    try {
      // Set user's timezone
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
      setTimezone(userTimezone)
      
      // Set preselected date if provided
      if (preselectedDate && preselectedDate instanceof Date) {
        setSelectedDate(preselectedDate)
      }
      
      // Set preselected lead if provided
      if (preselectedLeadId && leads.length > 0) {
        const lead = leads.find(l => String(l.id) === String(preselectedLeadId))
        if (lead) {
          setSelectedLead(lead)
        }
      }
    } catch (err) {
      console.error('Error initializing meeting scheduler:', err)
      setError('Failed to initialize meeting scheduler')
    }
  }, [preselectedLeadId, preselectedDate, leads])

  // Initialize time slots and fetch question sets
  useEffect(() => {
    updateTimeSlots()
    fetchQuestionSets()
  }, [])

  const fetchQuestionSets = async () => {
    if (!access_token) return

    try {
      const response = await fetch(`${process.env.BACKEND_URL}/question-sets/`, {
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (Array.isArray(data)) {
          setQuestionSets(data)
          
          // Auto-select default question set
          const defaultSet = data.find((qs: QuestionSet) => qs.is_default)
          if (defaultSet && defaultSet.id) {
            setSelectedQuestionSet(String(defaultSet.id))
          }
        }
      } else {
        console.error('Failed to fetch question sets:', response.status)
      }
    } catch (err) {
      console.error('Failed to fetch question sets:', err)
      // Don't set error state here as it's not critical for the form to work
    }
  }

  const createNewLead = async () => {
    if (!newLeadData.name || !newLeadData.email || !access_token) {
      setError('Please fill in lead name and email')
      return null
    }

    try {
      const response = await fetch(`${process.env.BACKEND_URL}/leads/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${access_token}`
        },
        body: JSON.stringify(newLeadData)
      })

      if (response.ok) {
        const newLead = await response.json()
        return newLead
      } else {
        const errorData = await response.json()
        setError(errorData.detail || 'Failed to create lead')
        return null
      }
    } catch (err) {
      setError('Failed to create lead')
      return null
    }
  }

  const handleScheduleMeeting = async () => {
    if (!selectedDate || !selectedTime || !access_token) {
      setError('Please fill in all required fields')
      return
    }

    // Check if we need to create a new lead
    let leadToUse = selectedLead
    if (showNewLeadForm && !selectedLead) {
      leadToUse = await createNewLead()
      if (!leadToUse) {
        return // Error already set in createNewLead
      }
    }

    if (!leadToUse) {
      setError('Please select a lead or create a new one')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Combine date and time
      const [hours, minutes] = selectedTime.split(':').map(Number)
      let scheduledDateTime = setMinutes(setHours(selectedDate, hours), minutes)
      
      // Ensure the scheduled time is in the future
      const now = new Date()
      const minFutureTime = new Date(now.getTime() + 5 * 60 * 1000) // At least 5 minutes in the future
      
      if (scheduledDateTime <= minFutureTime) {
        setError('Please select a time at least 5 minutes in the future')
        return
      }

      const meetingData = {
        lead_id: String(leadToUse.id),
        scheduled_time: scheduledDateTime.toISOString(),
        duration_minutes: duration,
        question_set_id: selectedQuestionSet || undefined,
        timezone: timezone
      }

      const response = await fetch(`${process.env.BACKEND_URL}/scheduled-meetings/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${access_token}`
        },
        body: JSON.stringify(meetingData)
      })

      if (response.ok) {
        const scheduledMeeting = await response.json()
        setSuccess('Meeting scheduled successfully!')
        
        if (onMeetingScheduled) {
          onMeetingScheduled(scheduledMeeting)
        }
        
        // Reset form
        setTimeout(() => {
          resetForm()
        }, 2000)
      } else {
        const errorData = await response.json()
        const errorMessage = typeof errorData.detail === 'string' 
          ? errorData.detail 
          : JSON.stringify(errorData.detail) || 'Failed to schedule meeting'
        setError(errorMessage)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to schedule meeting'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    if (!preselectedLeadId) {
      setSelectedLead(null)
    }
    setSelectedDate(undefined)
    setSelectedTime("")
    setDuration(60)
    setError(null)
    setSuccess(null)
    setShowNewLeadForm(false)
    setNewLeadData({
      name: "",
      email: "",
      company: "",
      phone: "",
      status: "new"
    })
  }

  const isFormValid = (selectedLead || (showNewLeadForm && newLeadData.name && newLeadData.email)) && selectedDate && selectedTime && timezone

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              Schedule AI Meeting
            </CardTitle>
            <CardDescription>
              Schedule a discovery call with AI assistant for lead qualification
            </CardDescription>
          </div>
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Lead Selection */}
        <div className="space-y-2">
          <Label htmlFor="lead-select">Select Lead *</Label>
          {preselectedLeadId && selectedLead ? (
            <div className="p-3 border rounded-md bg-muted">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span className="font-medium">{selectedLead.name}</span>
                <Badge variant="outline">{selectedLead.status}</Badge>
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {selectedLead.company && (
                  <div className="flex items-center gap-1">
                    <Building className="w-3 h-3" />
                    {selectedLead.company}
                  </div>
                )}
                {selectedLead.email && (
                  <div className="flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {selectedLead.email}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <Select 
              value={selectedLead?.id ? String(selectedLead.id) : ""} 
              onValueChange={(value) => {
                const lead = leads.find(l => String(l.id) === value)
                setSelectedLead(lead || null)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  leadsLoading 
                    ? "Loading leads..." 
                    : leads.length === 0 
                      ? "No leads available" 
                      : "Choose a lead for the meeting"
                } />
              </SelectTrigger>
              <SelectContent>
                {leadsLoading ? (
                  <SelectItem value="loading" disabled>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                      Loading leads...
                    </div>
                  </SelectItem>
                ) : leads.length === 0 ? (
                  <SelectItem value="no-leads" disabled>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      No leads found - Please add leads first
                    </div>
                  </SelectItem>
                ) : (
                  leads.map((lead) => (
                    <SelectItem key={lead.id} value={String(lead.id)}>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <div>
                          <div className="font-medium">{lead.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {lead.company} • {lead.status}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          )}
          
          {/* New Lead Option */}
          {allowNewLead && !preselectedLeadId && (
            <div className="mt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowNewLeadForm(!showNewLeadForm)
                  if (showNewLeadForm) {
                    setSelectedLead(null)
                  }
                }}
                className="w-full"
              >
                {showNewLeadForm ? 'Select Existing Lead' : 'Create New Lead'}
              </Button>
            </div>
          )}

          {/* New Lead Form */}
          {showNewLeadForm && allowNewLead && (
            <div className="mt-4 p-4 border rounded-md bg-muted/30">
              <h4 className="font-medium mb-3">Create New Lead</h4>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="new-lead-name">Name *</Label>
                    <Input
                      id="new-lead-name"
                      value={newLeadData.name}
                      onChange={(e) => setNewLeadData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Lead name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-lead-email">Email *</Label>
                    <Input
                      id="new-lead-email"
                      type="email"
                      value={newLeadData.email}
                      onChange={(e) => setNewLeadData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="lead@company.com"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="new-lead-company">Company</Label>
                    <Input
                      id="new-lead-company"
                      value={newLeadData.company}
                      onChange={(e) => setNewLeadData(prev => ({ ...prev, company: e.target.value }))}
                      placeholder="Company name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-lead-phone">Phone</Label>
                    <Input
                      id="new-lead-phone"
                      value={newLeadData.phone}
                      onChange={(e) => setNewLeadData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="Phone number"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* No leads message */}
          {!leadsLoading && leads.length === 0 && !allowNewLead && (
            <div className="p-3 border rounded-md bg-muted/50">
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4" />
                <span>No leads available. You need to add leads before scheduling meetings.</span>
              </div>
              <div className="mt-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open('/leads', '_blank')}
                >
                  Go to Leads Page
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Date Selection */}
        <div className="space-y-2">
          <Label>Meeting Date *</Label>
          <Popover open={showCalendar} onOpenChange={setShowCalendar}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  setSelectedDate(date)
                  setShowCalendar(false)
                }}
                disabled={(date) => date < new Date() || date < addDays(new Date(), -1)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Time and Duration */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="time-select">Meeting Time *</Label>
            <Select value={selectedTime} onValueChange={setSelectedTime}>
              <SelectTrigger>
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent>
                {timeSlots.map((time) => (
                  <SelectItem key={time} value={time}>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {time}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Duration (minutes)</Label>
            <Select value={duration.toString()} onValueChange={(value) => setDuration(Number(value))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="45">45 minutes</SelectItem>
                <SelectItem value="60">60 minutes</SelectItem>
                <SelectItem value="90">90 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Timezone Selection */}
        <div className="space-y-2">
          <Label htmlFor="timezone">Timezone *</Label>
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger>
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent>
              {availableTimezones.map((tz) => (
                <SelectItem key={tz} value={tz}>
                  {tz.replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Question Set Selection */}
        <div className="space-y-2">
          <Label htmlFor="question-set">Question Set (Optional)</Label>
          <Select value={selectedQuestionSet} onValueChange={setSelectedQuestionSet}>
            <SelectTrigger>
              <SelectValue placeholder="Use default questions" />
            </SelectTrigger>
            <SelectContent>
              {questionSets.map((qs) => (
                <SelectItem key={qs.id} value={qs.id}>
                  <div>
                    <div className="font-medium">{qs.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {qs.question_count} questions
                      {qs.is_default && " • Default"}
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{typeof error === 'string' ? error : 'An error occurred'}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{typeof success === 'string' ? success : 'Operation completed'}</AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button 
            onClick={handleScheduleMeeting}
            disabled={!isFormValid || loading}
            className="flex-1"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Scheduling...
              </>
            ) : (
              <>
                <CalendarIcon className="w-4 h-4 mr-2" />
                Schedule Meeting
              </>
            )}
          </Button>
          
          <Button variant="outline" onClick={resetForm} disabled={loading}>
            Reset
          </Button>
        </div>

        {/* Meeting Preview */}
        {isFormValid && (
          <div className="p-4 border rounded-md bg-muted/50">
            <h4 className="font-medium mb-2">Meeting Preview</h4>
            <div className="space-y-1 text-sm">
              <div><strong>Lead:</strong> {
                selectedLead 
                  ? `${selectedLead.name} (${selectedLead.company})` 
                  : `${newLeadData.name} (${newLeadData.company || 'New Lead'})`
              }</div>
              <div><strong>Date:</strong> {selectedDate && format(selectedDate, "PPP")}</div>
              <div><strong>Time:</strong> {selectedTime} ({timezone.replace('_', ' ')})</div>
              <div><strong>Duration:</strong> {duration} minutes</div>
              {selectedQuestionSet && (
                <div><strong>Questions:</strong> {questionSets.find(qs => qs.id === selectedQuestionSet)?.name}</div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}