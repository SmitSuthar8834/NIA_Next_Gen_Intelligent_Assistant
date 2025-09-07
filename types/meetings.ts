export interface MeetingHistoryItem {
  id: string
  meeting_id: string
  scheduled_time: string
  status: string
  duration_minutes?: number
  ai_analysis?: {
    lead_score: number
    qualification_status: string
    key_insights: string[]
    pain_points: string[]
    buying_signals: string[]
    engagement_level: string
    opportunity_fit: number
    next_steps: string[]
  }
  transcript_available: boolean
  recording_available: boolean
}

export interface Lead {
  id: string
  user_id: string
  name: string
  email?: string
  phone?: string
  company?: string
  status: string
  notes?: string
  ai_insights?: {
    meeting_insights?: string[]
    last_analysis?: string
    conversation_quality?: {
      engagement_score: number
      response_quality: string
      information_depth: string
      cooperation_level: string
    }
    opportunity_assessment?: {
      fit_score: number
      urgency_level: string
      budget_signals: string[]
      competition_mentioned: string[]
      success_probability: string
    }
    last_meeting_analysis?: {
      timestamp: string
      key_insights: string[]
      pain_points: string[]
      buying_signals: string[]
      lead_score: number
      qualification_status: string
      engagement_level: string
      opportunity_fit: number
      next_steps: string[]
    }
  }
  lead_score?: number
  external_id?: string
  source: string
  created_at: string
  updated_at: string
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
  // Meeting history
  meeting_history?: MeetingHistoryItem[]
}

export interface QuestionSet {
  id: string
  name: string
  description: string
  question_count: number
  is_default: boolean
}

export interface ScheduledMeeting {
  id: string
  meeting_room_id: string
  scheduled_time: string
  duration_minutes: number
  status: 'scheduled' | 'active' | 'completed' | 'cancelled'
  lead: Lead
  question_set?: QuestionSet
  join_link: string
  ai_joined_at?: string
  participants_joined: number
  created_at: string
  updated_at?: string
  user_id?: string
  lead_id?: string
  question_set_id?: string
}

export interface MeetingParticipant {
  id: string
  meeting_id: string
  user_id?: string
  name: string
  email?: string
  joined_at: string
  left_at?: string
  is_ai: boolean
}

export interface MeetingWithParticipants extends ScheduledMeeting {
  participants: MeetingParticipant[]
}

export type MeetingStatus = 'scheduled' | 'active' | 'completed' | 'cancelled'